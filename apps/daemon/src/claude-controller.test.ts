import { once } from "node:events";
import { createServer } from "node:net";

import { terminalContextFromEnv, type AgentRun } from "@aiox/protocol";
import * as terminals from "@aiox/terminal";
import type {
    TerminalExit,
    TerminalListener,
    TerminalOptions,
    TerminalSession,
} from "@aiox/terminal";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { WebSocket } from "ws";

import { ClaudeBinding } from "@/claude";
import * as launch from "@/claude-launch";
import * as version from "@/claude-version";
import * as http from "@/http";
import { fakeVendor, startTestDaemon, type DaemonHarness } from "@/testing";

let harness: DaemonHarness;
const sessions: {
    options: TerminalOptions;
    session: TerminalSession;
    output(data: string): void;
    exit(): void;
}[] = [];

beforeEach(async () => {
    sessions.length = 0;
    vi.spyOn(version, "probeClaude").mockResolvedValue("2.1.266");
    vi.spyOn(launch, "prepareClaudeLaunch").mockImplementation(
        async (input) => ({
            args: [...input.args, "--messaging-socket-path", input.inboxPath],
            env: input.env as Record<string, string>,
            hasBlockingStopHooks: false,
        }),
    );
    vi.spyOn(terminals, "createTerminal").mockImplementation((options) => {
        const listeners = new Set<TerminalListener>(
            options.initialListener ? [options.initialListener] : [],
        );
        let alive = true;
        const result: TerminalExit = { exitCode: 0, signal: null };
        const exit = () => {
            if (!alive) return;
            alive = false;
            for (const listener of listeners) listener.exit(result);
            listeners.clear();
        };
        const session: TerminalSession = {
            id: options.id,
            pid: 100 + sessions.length,
            get alive() {
                return alive;
            },
            write: vi.fn(),
            resize: vi.fn(),
            attach: (listener) => {
                queueMicrotask(() =>
                    listener.snapshot({
                        cols: options.cols ?? 80,
                        rows: options.rows ?? 24,
                        data: Buffer.alloc(0),
                        state: {} as never,
                        tail: [],
                    }),
                );
                listeners.add(listener);
                return () => {
                    listeners.delete(listener);
                };
            },
            subscribe: (listener) => {
                if (!alive) {
                    queueMicrotask(() => listener.exit(result));
                    return () => {};
                }
                listeners.add(listener);
                return () => {
                    listeners.delete(listener);
                };
            },
            dispose: vi.fn(async () => {}),
            kill: vi.fn(async () => {
                exit();
                return result;
            }),
        };
        sessions.push({
            options,
            session,
            exit,
            output: (data) => {
                for (const listener of listeners)
                    listener.data(Buffer.from(data));
            },
        });
        return session;
    });
    harness = await startTestDaemon();
});

test("forwards startup bytes emitted before start resolves exactly once without replay", async () => {
    const webInput = webFrame();
    const create = vi.mocked(terminals.createTerminal).getMockImplementation()!;
    vi.mocked(terminals.createTerminal).mockImplementationOnce((options) => {
        const session = create(options);
        const startup = Buffer.from([0x1b, 0x5b, 0x36, 0x6e, 0xff]);
        options.initialListener?.data(startup);
        session.attach = () => {
            throw new Error("foreground must not replay");
        };
        return session;
    });
    const { socket, messages } = await connect(webInput);
    try {
        await vi.waitFor(() =>
            expect(messages.filter((item) => item.binary)).toHaveLength(1),
        );
        expect(messages[0]!.data).toEqual(
            Buffer.from([0x1b, 0x5b, 0x36, 0x6e, 0xff]),
        );
        sessions[0]!.output("LIVE");
        await vi.waitFor(() =>
            expect(messages.filter((item) => item.binary)).toHaveLength(2),
        );
        expect(messages[1]!.data.toString()).toBe("LIVE");
        expect(messages.every((item) => item.binary)).toBe(true);
    } finally {
        socket.terminate();
    }
});

test("observes an exit during startup and does not replay or leave a launch pending", async () => {
    const webInput = webFrame();
    const create = vi.mocked(terminals.createTerminal).getMockImplementation()!;
    vi.mocked(terminals.createTerminal).mockImplementationOnce((options) => {
        const session = create(options);
        sessions[0]!.exit();
        return session;
    });
    const { socket, messages } = await connect(webInput);
    try {
        await once(socket, "close");
        expect(
            messages
                .filter((item) => !item.binary)
                .map((item) => JSON.parse(item.data.toString())),
        ).toEqual([
            expect.objectContaining({
                type: "error",
                message: expect.stringContaining("exited before"),
            }),
        ]);
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
    } finally {
        socket.terminate();
    }
});

test("a disconnect while start resolves cleans the initial listener and ignores later startup output", async () => {
    const webInput = webFrame();
    const start = ClaudeBinding.prototype.start;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    vi.spyOn(ClaudeBinding.prototype, "start").mockImplementation(
        async function (this: ClaudeBinding, options) {
            await start.call(this, options);
            await gate;
        },
    );
    const { socket } = await connect(webInput);
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(1));
        socket.terminate();
        await vi.waitFor(() =>
            expect(harness.daemon.services.runtimes.list()).toEqual([]),
        );
        release();
        await vi.waitFor(() =>
            expect(sessions[0]!.session.kill).toHaveBeenCalledOnce(),
        );
        expect(() =>
            sessions[0]!.options.initialListener!.data(Buffer.from("late")),
        ).not.toThrow();
    } finally {
        release();
        socket.terminate();
    }
});

test("does not apply the startup deadline to a runtime that was ready before losing inbox health", async () => {
    const webInput = webFrame();
    const timers = vi.spyOn(globalThis, "setTimeout");
    vi.spyOn(ClaudeBinding.prototype, "wasReady", "get").mockReturnValue(true);
    vi.spyOn(ClaudeBinding.prototype, "ready", "get").mockReturnValue(false);
    const { socket } = await connect(webInput);
    try {
        await vi.waitFor(() =>
            expect(timers.mock.calls.some((call) => call[1] === 60_000)).toBe(
                true,
            ),
        );
        const deadline = timers.mock.calls.find(
            (call) => call[1] === 60_000,
        )![0];
        if (typeof deadline !== "function")
            throw new Error("Missing startup deadline callback");
        deadline();
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(sessions[0]!.session.kill).not.toHaveBeenCalled();
        expect(harness.daemon.services.runtimes.list()).toHaveLength(1);
    } finally {
        socket.terminate();
    }
});

test("spawn failure cleans the registered identity while preserving its borrowed shell", async () => {
    const shell = harness.daemon.createShell();
    const terminalContext = terminalContextFromEnv(sessions[0]!.options.env!)!;
    vi.mocked(terminals.createTerminal).mockImplementationOnce(() => {
        throw new Error("spawn failed");
    });
    const { socket, messages } = await connect({ ...frame(), terminalContext });
    try {
        await vi.waitFor(() =>
            expect(
                messages.some(
                    (message) =>
                        !message.binary &&
                        JSON.parse(message.data.toString()).type === "error",
                ),
            ).toBe(true),
        );
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
        expect(harness.daemon.services.terminals.view(shell.id)?.alive).toBe(
            true,
        );
    } finally {
        socket.terminate();
    }
});

test("foreground connection loss terminates its managed vendor handle and keeps the borrowed shell", async () => {
    const shell = harness.daemon.createShell();
    const terminalContext = terminalContextFromEnv(sessions[0]!.options.env!)!;
    const { socket } = await connect({ ...frame(), terminalContext });
    await vi.waitFor(() => expect(sessions).toHaveLength(2));
    const vendor = sessions[1]!;
    const token = vendor.options.env!.AIOX_MCP_TOKEN!;
    socket.terminate();
    await vi.waitFor(() =>
        expect(harness.daemon.services.runtimes.list()).toEqual([]),
    );
    expect(vendor.session.kill).toHaveBeenCalledOnce();
    expect(vendor.session.alive).toBe(false);
    expect(harness.daemon.services.terminals.view(shell.id)?.alive).toBe(true);
    expect(
        harness.daemon.services.runtimes.authenticate(token),
    ).toBeUndefined();
});

test("a browser attachment detaches without stopping either the foreground CLI runtime or shell", async () => {
    const shell = harness.daemon.createShell();
    const terminalContext = terminalContextFromEnv(sessions[0]!.options.env!)!;
    const { socket } = await connect({ ...frame(), terminalContext });
    const browser = new WebSocket(
        harness.webUrl(`/ws/terminal/${shell.id}`).replace("http:", "ws:"),
    );
    try {
        await once(browser, "open");
        await vi.waitFor(() => expect(sessions).toHaveLength(2));
        const closed = once(browser, "close");
        browser.close();
        await closed;
        expect(harness.daemon.services.runtimes.list()).toHaveLength(1);
        expect(sessions[1]!.session.alive).toBe(true);
        expect(sessions[1]!.session.kill).not.toHaveBeenCalled();
        expect(harness.daemon.services.terminals.view(shell.id)?.alive).toBe(
            true,
        );
    } finally {
        socket.terminate();
        browser.terminate();
    }
});

test("daemon force stop confirms both the internal vendor PTY and daemon-owned ordinary shell are gone", async () => {
    harness.daemon.createShell();
    const terminalContext = terminalContextFromEnv(sessions[0]!.options.env!)!;
    const { socket } = await connect({ ...frame(), terminalContext });
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(2));
        const result = await harness.daemon.stop(true);
        expect(result.stopped).toBe(true);
        for (const { session } of sessions) {
            expect(session.kill).toHaveBeenCalled();
            expect(session.alive).toBe(false);
        }
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
        expect(harness.daemon.services.terminals.list()).toEqual([]);
    } finally {
        socket.terminate();
    }
});

test("an unconfirmed vendor kill retains its Runtime and shell until the next force-stop attempt succeeds", async () => {
    const shell = harness.daemon.createShell();
    const terminalContext = terminalContextFromEnv(sessions[0]!.options.env!)!;
    const { socket } = await connect({ ...frame(), terminalContext });
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(2));
        const vendor = sessions[1]!;
        vi.mocked(vendor.session.kill).mockRejectedValueOnce(
            new Error("exit unconfirmed"),
        );
        const first = await harness.daemon.stop(true);
        expect(first.stopped).toBe(false);
        expect(first.warnings.join(" ")).toContain("unconfirmed");
        expect(vendor.session.alive).toBe(true);
        expect(vendor.session.dispose).not.toHaveBeenCalled();
        expect(harness.daemon.services.runtimes.list()).toHaveLength(1);
        expect(harness.daemon.services.terminals.view(shell.id)?.alive).toBe(
            true,
        );
        expect((await harness.daemon.stop(true)).stopped).toBe(true);
        expect(vendor.session.kill).toHaveBeenCalledTimes(2);
        expect(vendor.session.dispose).toHaveBeenCalledOnce();
        expect(vendor.session.alive).toBe(false);
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
    } finally {
        socket.terminate();
    }
});

test("disconnect during asynchronous launch preparation cleans the registration and prevents a later spawn", async () => {
    const webInput = webFrame();
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
        release = resolve;
    });
    vi.mocked(launch.prepareClaudeLaunch).mockImplementationOnce(
        async (input) => {
            await waiting;
            return {
                args: [],
                env: input.env as Record<string, string>,
                hasBlockingStopHooks: false,
            };
        },
    );
    const { socket } = await connect(webInput);
    try {
        await vi.waitFor(() =>
            expect(launch.prepareClaudeLaunch).toHaveBeenCalled(),
        );
        socket.terminate();
        await vi.waitFor(() =>
            expect(harness.daemon.services.runtimes.list()).toEqual([]),
        );
        release();
        await waiting;
        // The post-preparation version probe provides a deterministic continuation checkpoint.
        await vi.waitFor(() => expect(version.probeClaude).toHaveBeenCalled());
        expect(sessions).toHaveLength(0);
    } finally {
        release();
        socket.terminate();
    }
});

afterEach(async () => {
    await harness.close();
    vi.restoreAllMocks();
});

function frame(): AgentRun {
    return {
        adapter: "claude",
        cwd: harness.home,
        env: { PATH: process.env.PATH ?? "" },
        args: ["--model", "sonnet"],
        cols: 91,
        rows: 31,
    };
}

// Most controller tests inspect only the vendor; shell ownership is covered separately below.
function webFrame(): AgentRun {
    harness.daemon.createShell();
    const shell = sessions.pop()!;
    return {
        ...frame(),
        terminalContext: terminalContextFromEnv(shell.options.env!)!,
    };
}

async function connect(input: unknown) {
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run").replace("http:", "ws:"),
    );
    const messages: { binary: boolean; data: Buffer }[] = [];
    socket.on("message", (data, binary) =>
        messages.push({ binary, data: data as Buffer }),
    );
    await once(socket, "open");
    socket.send(JSON.stringify(input));
    return { socket, messages };
}

test("a daemon-owned vendor PTY relays inside the borrowed shell and cleans its own identity after exit", async () => {
    const shell = harness.daemon.createShell({ cwd: harness.home });
    const shellSession = sessions[0]!;
    const terminalContext = terminalContextFromEnv(shellSession.options.env!)!;
    const network = await harness.daemon.services.networks.create(
        "dev",
        "allow",
    );
    const { socket, messages } = await connect({
        ...frame(),
        network: network.name,
        terminalContext,
    });
    const inbox = createServer((connection) => {
        connection.on("error", () => {});
        connection.resume();
    });
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(2));
        const vendor = sessions[1]!;
        expect(vendor.options.file).toBe("claude");
        expect(
            Object.keys(
                vi.mocked(launch.prepareClaudeLaunch).mock.lastCall![0].hooks,
            ),
        ).toEqual(
            expect.arrayContaining([
                "PreToolUse",
                "PostToolUse",
                "PostToolUseFailure",
            ]),
        );
        expect(vendor.options.cwd).toBe(harness.home);
        expect(harness.daemon.services.terminals.views()).toHaveLength(1);
        const record = harness.daemon.services.runtimes.list()[0]!;
        expect(record.terminalId).toBe(shell.id);
        expect(record.activity).toBe("starting");
        const token = vendor.options.env!.AIOX_MCP_TOKEN!;
        expect(harness.daemon.services.runtimes.authenticate(token)?.id).toBe(
            record.id,
        );
        vendor.output("startup UI before readiness");
        await vi.waitFor(() =>
            expect(
                messages.some(
                    (message) =>
                        message.binary &&
                        message.data.toString() ===
                            "startup UI before readiness",
                ),
            ).toBe(true),
        );
        const args = vendor.options.args!;
        const inboxPath = args[args.indexOf("--messaging-socket-path") + 1]!;
        inbox.listen(inboxPath);
        await once(inbox, "listening");
        const invalidHook = await fetch(harness.apiUrl("/api/claude/hooks"), {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                inboxPath,
                inboxToken: "separate-inbox-token",
                event: {
                    hook_event_name: "SessionStart",
                    session_id: "session-a",
                },
            }),
        });
        expect(invalidHook.status).toBe(401);
        expect(record.activity).toBe("starting");
        const hook = await fetch(harness.apiUrl("/api/claude/hooks"), {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${vendor.options.env!.AIOX_HOOK_TOKEN}`,
            },
            body: JSON.stringify({
                inboxPath,
                inboxToken: "separate-inbox-token",
                event: {
                    hook_event_name: "SessionStart",
                    session_id: "session-a",
                },
            }),
        });
        expect(hook.ok).toBe(true);
        expect(record.activity).toBe("starting");
        const initialize = async (
            credential: string,
            params: unknown = {
                protocolVersion: "2025-03-26",
                capabilities: {},
                clientInfo: { name: "controller-test", version: "1.0.0" },
            },
        ) =>
            fetch(harness.mcpUrl(network.id), {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    accept: "application/json, text/event-stream",
                    authorization: `Bearer ${credential}`,
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "initialize",
                    params,
                }),
            });
        expect(
            (await initialize(vendor.options.env!.AIOX_HOOK_TOKEN!)).status,
        ).toBe(401);
        expect(record.activity).toBe("starting");
        const invalidInitialization = await initialize(token, {});
        expect(invalidInitialization.status).toBe(200);
        expect(await invalidInitialization.json()).toHaveProperty("error");
        expect(record.activity).toBe("starting");
        const initialized = await initialize(token);
        expect(initialized.ok).toBe(true);
        await initialized.text();
        expect(record.activity).toBe("idle");
        const rawInput = Buffer.from([3, 0xff]);
        socket.send(rawInput);
        socket.send(JSON.stringify({ type: "resize", cols: 120, rows: 40 }));
        await vi.waitFor(() =>
            expect(vendor.session.write).toHaveBeenCalledWith(rawInput),
        );
        expect(vendor.session.resize).toHaveBeenCalledWith(120, 40);
        const closed = once(socket, "close");
        vendor.exit();
        await closed;
        expect(
            messages
                .filter((message) => !message.binary)
                .map((message) => JSON.parse(message.data.toString())),
        ).toContainEqual({ type: "exit", exitCode: 0, signal: null });
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
        expect(
            harness.daemon.services.runtimes.authenticate(token),
        ).toBeUndefined();
        expect(shellSession.session.alive).toBe(true);
        expect(harness.daemon.services.terminals.view(shell.id)).toBeDefined();
    } finally {
        socket.terminate();
        await new Promise<void>((resolve) => inbox.close(() => resolve()));
    }
});

test("an exit before native inbox readiness is a startup failure, not a successful launch", async () => {
    const webInput = webFrame();
    const { socket, messages } = await connect(webInput);
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(1));
        const vendor = sessions[0]!;
        const token = vendor.options.env!.AIOX_MCP_TOKEN!;
        const closed = once(socket, "close");
        vendor.exit();
        await closed;
        expect(
            messages
                .filter((message) => !message.binary)
                .map((message) => JSON.parse(message.data.toString())),
        ).toEqual([
            expect.objectContaining({
                type: "error",
                message: expect.stringMatching(/before.*ready/),
            }),
        ]);
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
        expect(
            harness.daemon.services.runtimes.authenticate(token),
        ).toBeUndefined();
    } finally {
        socket.terminate();
    }
});

test.each(["invalid-frame", "unknown-network", "policy-conflict"])(
    "rejects %s before spawning vendor resources",
    async (scenario) => {
        if (scenario === "policy-conflict") {
            vi.mocked(launch.prepareClaudeLaunch).mockRejectedValueOnce(
                new Error(
                    "--bare conflicts with required AIOX launch settings.",
                ),
            );
        }
        const input =
            scenario === "invalid-frame"
                ? { adapter: "claude" }
                : scenario === "unknown-network"
                  ? { ...webFrame(), network: "absent" }
                  : webFrame();
        const { socket, messages } = await connect(input);
        try {
            await vi.waitFor(() =>
                expect(
                    messages.some(
                        (message) =>
                            !message.binary &&
                            JSON.parse(message.data.toString()).type ===
                                "error",
                    ),
                ).toBe(true),
            );
            expect(sessions).toHaveLength(0);
            await vi.waitFor(() =>
                expect(harness.daemon.services.runtimes.list()).toEqual([]),
            );
        } finally {
            socket.terminate();
        }
    },
);

test.each(["--bg", "--background", "--tmux", "--tmux=classic"])(
    "rejects foreground ownership conflict %s through the real launch preflight",
    async (argument) => {
        vi.mocked(launch.prepareClaudeLaunch).mockRestore();
        const shell = harness.daemon.createShell({ cwd: harness.home });
        const terminalContext = terminalContextFromEnv(
            sessions[0]!.options.env!,
        )!;
        const { socket, messages } = await connect({
            ...frame(),
            env: { HOME: harness.home, CLAUDE_CONFIG_DIR: harness.home },
            args: [argument],
            terminalContext,
        });
        try {
            await vi.waitFor(() =>
                expect(messages.some((message) => !message.binary)).toBe(true),
            );
            expect(
                messages
                    .filter((message) => !message.binary)
                    .map((message) => JSON.parse(message.data.toString())),
            ).toEqual([
                expect.objectContaining({
                    type: "error",
                    message: expect.stringContaining("foreground TUI"),
                }),
            ]);
            expect(sessions).toHaveLength(1);
            expect(version.probeClaude).not.toHaveBeenCalled();
            expect(harness.daemon.services.runtimes.list()).toEqual([]);
            expect(
                harness.daemon.services.terminals.view(shell.id),
            ).toBeDefined();
            expect(sessions[0]!.session.alive).toBe(true);
        } finally {
            socket.terminate();
        }
    },
);

test("rejects a foreign browser Origin before creating an Agent", async () => {
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run").replace("http:", "ws:"),
        { origin: "https://foreign.example" },
    );
    await expect(once(socket, "open")).rejects.toThrow(/403/);
    expect(sessions).toHaveLength(0);
    expect(harness.daemon.services.runtimes.list()).toEqual([]);
    socket.terminate();
});

test("common HTTP MCP send reaches native inbox and authenticated hooks settle only the connected request", async () => {
    const network = await harness.daemon.services.networks.create(
        "one-way",
        "deny",
    );
    const sourceVendor = fakeVendor();
    const source = await harness.daemon.registerRuntime({
        name: "Reviewer",
        role: "reviewer",
        description: "Check changes",
        networkId: network.id,
        createBinding: sourceVendor.createBinding,
    });
    const { socket } = await connect({
        ...webFrame(),
        name: "Claude target",
        network: network.name,
    });
    const lines: {
        type: string;
        token?: string;
        message?: { content: string };
    }[] = [];
    const inbox = createServer((connection) => {
        let buffered = "";
        connection.on("error", () => {});
        connection.on("data", (chunk) => {
            buffered += chunk.toString();
            let end: number;
            while ((end = buffered.indexOf("\n")) >= 0) {
                lines.push(JSON.parse(buffered.slice(0, end)));
                buffered = buffered.slice(end + 1);
            }
        });
    });
    const clients: Client[] = [];
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(1));
        const vendor = sessions[0]!;
        const target = harness.daemon.services.runtimes
            .list()
            .find((record) => record.id !== source.runtimeId)!;
        const args = vendor.options.args!;
        const inboxPath = args[args.indexOf("--messaging-socket-path") + 1]!;
        inbox.listen(inboxPath);
        await once(inbox, "listening");
        const hook = async (
            event: Record<string, unknown>,
            credential = vendor.options.env!.AIOX_HOOK_TOKEN!,
        ) =>
            fetch(harness.apiUrl("/api/claude/hooks"), {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${credential}`,
                },
                body: JSON.stringify({
                    inboxPath,
                    inboxToken: "native-inbox-token",
                    event,
                }),
            });
        expect(
            (
                await hook({
                    hook_event_name: "SessionStart",
                    session_id: "session",
                })
            ).ok,
        ).toBe(true);
        const client = async (token: string) => {
            const result = new Client({
                name: "controller-test",
                version: "1",
            });
            clients.push(result);
            await result.connect(
                new StreamableHTTPClientTransport(
                    new URL(harness.mcpUrl(network.id)),
                    {
                        requestInit: {
                            headers: { authorization: `Bearer ${token}` },
                        },
                    },
                ) as never,
            );
            return result;
        };
        await client(vendor.options.env!.AIOX_MCP_TOKEN!);
        const sender = await client(source.token);
        await harness.daemon.services.networks.route(network.id, {
            kind: "directed",
            from: source.runtimeId,
            to: [target.id],
            policy: "allow",
        });
        const sent = await sender.callTool({
            name: "send",
            arguments: {
                targets: [target.id],
                content: "Review line one.\nThen line two.",
            },
        });
        const sentData = sent.structuredContent as {
            messageId: string;
            results: { accepted: boolean }[];
        };
        expect(sentData.results[0]!.accepted).toBe(true);
        await vi.waitFor(() =>
            expect(lines.filter((line) => line.type === "user")).toHaveLength(
                1,
            ),
        );
        const fullInput = lines.find((line) => line.type === "user")!.message!
            .content;
        expect(
            lines
                .filter((line) => line.type === "auth")
                .every((line) => line.token === "native-inbox-token"),
        ).toBe(true);
        expect(fullInput).toContain('from-name="Reviewer"');
        expect(fullInput).toContain("Role: reviewer");
        expect(fullInput).toContain("Description: Check changes");
        expect(fullInput).toContain("Review line one.\nThen line two.");
        const delivery = async () =>
            (
                await harness.daemon.services.db.messages.deliveriesFor(
                    sentData.messageId,
                )
            )[0]!;
        expect((await delivery()).outcome).toBeNull();
        expect(
            (
                await hook(
                    {
                        hook_event_name: "UserPromptSubmit",
                        session_id: "session",
                        prompt_id: "aiox",
                        prompt: fullInput,
                    },
                    source.token,
                )
            ).status,
        ).toBe(401);
        await hook({
            hook_event_name: "UserPromptSubmit",
            session_id: "session",
            prompt_id: "tampered",
            prompt: `${fullInput} changed`,
        });
        await hook({
            hook_event_name: "Stop",
            session_id: "session",
            prompt_id: "tampered",
        });
        expect((await delivery()).outcome).toBeNull();
        await hook({
            hook_event_name: "UserPromptSubmit",
            session_id: "session",
            prompt_id: "aiox",
            prompt: fullInput,
        });
        await hook({
            hook_event_name: "Stop",
            session_id: "other-session",
            prompt_id: "aiox",
        });
        expect((await delivery()).outcome).toBeNull();
        expect(
            (
                await hook({
                    hook_event_name: "Stop",
                    session_id: "session",
                    prompt_id: "aiox",
                })
            ).ok,
        ).toBe(true);
        expect((await delivery()).outcome).toBe("completed");
        expect(sourceVendor.received).toHaveLength(1);
        expect(sourceVendor.received[0]!.from.name).toBe("AIOX");
        expect(sourceVendor.received[0]!.deliveryId).toBeNull();
        await hook({
            hook_event_name: "UserPromptSubmit",
            session_id: "session",
            prompt_id: "direct",
            prompt: "User's direct request",
        });
        await hook({
            hook_event_name: "Stop",
            session_id: "session",
            prompt_id: "direct",
        });
        expect(sourceVendor.received).toHaveLength(1);
        const failed = await sender.callTool({
            name: "send",
            arguments: { targets: [target.id], content: "A second request" },
        });
        await vi.waitFor(() =>
            expect(lines.filter((line) => line.type === "user")).toHaveLength(
                2,
            ),
        );
        const second = lines.filter((line) => line.type === "user")[1]!.message!
            .content;
        await hook({
            hook_event_name: "UserPromptSubmit",
            session_id: "session",
            prompt_id: "second",
            prompt: second,
        });
        await hook({
            hook_event_name: "StopFailure",
            session_id: "session",
            prompt_id: "second",
            error: "rate_limit",
        });
        const failedData = failed.structuredContent as { messageId: string };
        expect(
            (
                await harness.daemon.services.db.messages.deliveriesFor(
                    failedData.messageId,
                )
            )[0],
        ).toMatchObject({ outcome: "failed", outcomeError: "rate_limit" });
        expect(sourceVendor.received).toHaveLength(2);
        expect(target.activity).toBe("failed");
    } finally {
        await Promise.all(clients.map((client) => client.close()));
        socket.terminate();
        await new Promise<void>((resolve) => inbox.close(() => resolve()));
    }
});

test("external control registers before preparation, creates no PTY and releases on disconnect", async () => {
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run/external").replace("http:", "ws:"),
    );
    await once(socket, "open");
    const response = once(socket, "message");
    const { cols: _cols, rows: _rows, ...input } = frame();
    socket.send(
        JSON.stringify({
            ...input,
            inboxPath: "/tmp/aiox-external/inbox.sock",
        }),
    );
    const [raw] = await response;
    const prepared = JSON.parse(raw.toString());
    expect(prepared.type).toBe("prepared");
    expect(prepared.env.AIOX_HOOK_TOKEN).toBeTruthy();
    const record = harness.daemon.services.runtimes.get(prepared.runtimeId)!;
    expect(record.executionOwnership).toBe("external");
    expect(record.terminalId).toBeNull();
    expect(sessions).toHaveLength(0);
    expect(version.probeClaude).not.toHaveBeenCalled();
    socket.send(JSON.stringify({ type: "started" }));
    socket.terminate();
    await vi.waitFor(() =>
        expect(harness.daemon.services.runtimes.list()).toEqual([]),
    );
    const result = await fetch(harness.apiUrl("/api/claude/hooks"), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${prepared.env.AIOX_HOOK_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: "{}",
    });
    expect(result.status).toBe(401);
});

test("external startup timeout explicitly fails and releases collaboration without owning a process", async () => {
    const timers = vi.spyOn(globalThis, "setTimeout");
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run/external").replace("http:", "ws:"),
    );
    await once(socket, "open");
    const response = once(socket, "message");
    const { cols: _cols, rows: _rows, ...input } = frame();
    socket.send(
        JSON.stringify({
            ...input,
            inboxPath: "/tmp/aiox-external/inbox.sock",
        }),
    );
    await response;
    socket.send(JSON.stringify({ type: "started" }));
    const failed = once(socket, "message");
    const deadline = timers.mock.calls.find((call) => call[1] === 60_000)![0];
    if (typeof deadline !== "function")
        throw new Error("Missing startup deadline");
    deadline();
    const [raw] = await failed;
    expect(JSON.parse(raw.toString())).toMatchObject({
        type: "startup-failed",
        message: expect.stringContaining("60 seconds"),
    });
    expect(sessions).toHaveLength(0);
    expect(harness.daemon.services.runtimes.list()).toEqual([]);
    socket.terminate();
});

test("external disconnect during preparation revokes the credential and prevents a prepared response", async () => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
        release = resolve;
    });
    vi.mocked(launch.prepareClaudeLaunch).mockImplementationOnce(
        async (input) => {
            await waiting;
            return {
                args: [],
                env: input.env as Record<string, string>,
                hasBlockingStopHooks: false,
            };
        },
    );
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run/external").replace("http:", "ws:"),
    );
    await once(socket, "open");
    const messages = vi.fn();
    socket.on("message", messages);
    const { cols: _cols, rows: _rows, ...input } = frame();
    socket.send(
        JSON.stringify({
            ...input,
            inboxPath: "/tmp/aiox-external/inbox.sock",
        }),
    );
    try {
        await vi.waitFor(() =>
            expect(launch.prepareClaudeLaunch).toHaveBeenCalled(),
        );
        socket.terminate();
        await vi.waitFor(() =>
            expect(harness.daemon.services.runtimes.list()).toEqual([]),
        );
        release();
        await waiting;
        expect(messages).not.toHaveBeenCalled();
        expect(sessions).toHaveLength(0);
    } finally {
        release();
        socket.terminate();
    }
});

test("foreground launch requires authenticated Web shell context", async () => {
    const { socket, messages } = await connect(frame());
    await once(socket, "close");
    expect(
        messages.map((message) => JSON.parse(message.data.toString())),
    ).toContainEqual(
        expect.objectContaining({
            type: "error",
            message: expect.stringContaining("terminal context"),
        }),
    );
    expect(sessions).toHaveLength(0);
    expect(harness.daemon.services.runtimes.list()).toEqual([]);
});

test("daemon release during external startup closes control without a kill instruction or later deadline", async () => {
    const timers = vi.spyOn(globalThis, "setTimeout");
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run/external").replace("http:", "ws:"),
    );
    await once(socket, "open");
    const response = once(socket, "message");
    const { cols: _cols, rows: _rows, ...input } = frame();
    socket.send(
        JSON.stringify({
            ...input,
            inboxPath: "/tmp/aiox-external/inbox.sock",
        }),
    );
    const [raw] = await response;
    const prepared = JSON.parse(raw.toString());
    const messages = vi.fn();
    socket.on("message", messages);
    const closed = once(socket, "close");
    await harness.daemon.stopRuntime(prepared.runtimeId, true);
    await closed;
    const deadline = timers.mock.calls.find((call) => call[1] === 60_000)![0];
    if (typeof deadline !== "function") throw new Error("Missing deadline");
    deadline();
    expect(messages).not.toHaveBeenCalled();
    expect(sessions).toHaveLength(0);
});

test("a hook body completing after external revocation cannot observe the binding", async () => {
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run/external").replace("http:", "ws:"),
    );
    await once(socket, "open");
    const response = once(socket, "message");
    const { cols: _cols, rows: _rows, ...input } = frame();
    socket.send(
        JSON.stringify({
            ...input,
            inboxPath: "/tmp/aiox-external/inbox.sock",
        }),
    );
    const [raw] = await response;
    const prepared = JSON.parse(raw.toString());
    const binding = harness.daemon.services.runtimes.get(prepared.runtimeId)!
        .binding as ClaudeBinding;
    const observe = vi.spyOn(binding, "observe");
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });
    const read = vi.spyOn(http, "readJson").mockImplementationOnce(async () => {
        await pending;
        return { event: { hook_event_name: "SessionStart", session_id: "s" } };
    });
    try {
        const report = fetch(harness.apiUrl("/api/claude/hooks"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${prepared.env.AIOX_HOOK_TOKEN}`,
            },
            body: "{}",
        });
        await vi.waitFor(() => expect(read).toHaveBeenCalled());
        await harness.daemon.stopRuntime(prepared.runtimeId, true);
        release();
        expect((await report).status).toBe(401);
        expect(observe).not.toHaveBeenCalled();
    } finally {
        release();
        socket.terminate();
    }
});

test("external startup failure is sent before held cleanup and failed cleanup retains a retryable record", async () => {
    const timers = vi.spyOn(globalThis, "setTimeout");
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run/external").replace("http:", "ws:"),
    );
    await once(socket, "open");
    const response = once(socket, "message");
    const { cols: _cols, rows: _rows, ...input } = frame();
    socket.send(
        JSON.stringify({
            ...input,
            inboxPath: "/tmp/aiox-external/inbox.sock",
        }),
    );
    const [raw] = await response;
    const prepared = JSON.parse(raw.toString());
    const binding = harness.daemon.services.runtimes.get(prepared.runtimeId)!
        .binding as ClaudeBinding;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });
    const cleanup = vi
        .spyOn(binding, "cleanup")
        .mockImplementationOnce(async () => {
            await pending;
            throw new Error("private cleanup details must not escape");
        });
    const messages: { type: string; message?: string }[] = [];
    socket.on("message", (data) => messages.push(JSON.parse(data.toString())));
    const deadline = timers.mock.calls.find((call) => call[1] === 60_000)![0];
    if (typeof deadline !== "function") throw new Error("Missing deadline");
    try {
        deadline();
        await vi.waitFor(() =>
            expect(messages[0]?.type).toBe("startup-failed"),
        );
        expect(
            harness.daemon.services.runtimes.get(prepared.runtimeId)
                ?.collaborationActive,
        ).toBe(false);
        const closed = once(socket, "close");
        release();
        await closed;
        expect(messages[1]).toEqual({
            type: "error",
            message: "Claude collaboration cleanup remains unconfirmed.",
        });
        expect(
            harness.daemon.services.runtimes.get(prepared.runtimeId),
        ).toBeDefined();
    } finally {
        release();
        await vi.waitFor(() => expect(cleanup).toHaveBeenCalled());
        await new Promise<void>((resolve) => setImmediate(resolve));
        cleanup.mockRestore();
        socket.terminate();
        await harness.daemon.stopRuntime(prepared.runtimeId, true);
    }
});

test("external disconnect logs cleanup failure without private details and retains retry state", async () => {
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run/external").replace("http:", "ws:"),
    );
    await once(socket, "open");
    const response = once(socket, "message");
    const { cols: _cols, rows: _rows, ...input } = frame();
    socket.send(
        JSON.stringify({
            ...input,
            inboxPath: "/tmp/aiox-external/inbox.sock",
        }),
    );
    const [raw] = await response;
    const prepared = JSON.parse(raw.toString());
    const binding = harness.daemon.services.runtimes.get(prepared.runtimeId)!
        .binding as ClaudeBinding;
    const cleanup = vi
        .spyOn(binding, "cleanup")
        .mockRejectedValueOnce(new Error(prepared.env.AIOX_HOOK_TOKEN));
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
        socket.terminate();
        await vi.waitFor(() =>
            expect(diagnostic).toHaveBeenCalledWith(
                "Claude collaboration cleanup remains unconfirmed after connection loss.",
            ),
        );
        expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(
            prepared.env.AIOX_HOOK_TOKEN,
        );
        expect(
            harness.daemon.services.runtimes.get(prepared.runtimeId)
                ?.collaborationActive,
        ).toBe(false);
    } finally {
        cleanup.mockRestore();
        await harness.daemon.stopRuntime(prepared.runtimeId, true);
    }
});

test("external exit revokes credentials before pending exit outcome persistence completes", async () => {
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run/external").replace("http:", "ws:"),
    );
    await once(socket, "open");
    const response = once(socket, "message");
    const { cols: _cols, rows: _rows, ...input } = frame();
    socket.send(
        JSON.stringify({
            ...input,
            inboxPath: "/tmp/aiox-external/inbox.sock",
        }),
    );
    const [raw] = await response;
    const prepared = JSON.parse(raw.toString());
    const registry = harness.daemon.services.runtimes;
    const binding = registry.get(prepared.runtimeId)!.binding as ClaudeBinding;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });
    const exited = vi
        .spyOn(binding, "processExited")
        .mockImplementationOnce(async () => {
            await pending;
        });
    try {
        socket.send(
            JSON.stringify({ type: "exit", exitCode: 0, signal: null }),
        );
        await vi.waitFor(() => expect(exited).toHaveBeenCalledWith(0, null));
        expect(registry.get(prepared.runtimeId)?.collaborationActive).toBe(
            false,
        );
        expect(
            registry.authenticate(prepared.env.AIOX_MCP_TOKEN),
        ).toBeUndefined();
    } finally {
        release();
        await vi.waitFor(() =>
            expect(registry.get(prepared.runtimeId)).toBeUndefined(),
        );
        socket.terminate();
    }
});
