import { once } from "node:events";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";

import { claudeAdapter } from "@aiox/adapter-claude";
import {
    hostViewSchema,
    terminalContextFromEnv,
    type AgentRun,
} from "@aiox/protocol";
import * as terminals from "@aiox/terminal";
import type {
    TerminalExit,
    TerminalListener,
    TerminalOptions,
    TerminalSession,
} from "@aiox/terminal";
import type { VendorBinding, VendorLaunchInput, Command } from "@aiox/vendor";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { WebSocket } from "ws";

import * as http from "@/http";
import { fakeVendor, startTestDaemon, type DaemonHarness } from "@/testing";
import { readWebSnapshot } from "@/web-state";

let harness: DaemonHarness;
const bindings = new Map<string, VendorBinding>();
const prepare =
    vi.fn<
        (
            input: VendorLaunchInput,
            original: VendorBinding["prepare"],
        ) => Promise<unknown>
    >();
const start = vi.fn<(command: unknown) => void>();
let wasReady: boolean | undefined;
let holdStart: Promise<void> | undefined;

const sessions: {
    options: TerminalOptions;
    session: TerminalSession;
    output(data: string): void;
    exit(exitCode?: number): void;
}[] = [];

beforeEach(async () => {
    sessions.length = 0;
    bindings.clear();
    wasReady = undefined;
    holdStart = undefined;
    prepare
        .mockReset()
        .mockImplementation((input, original) => original(input));
    start.mockReset();
    const createBinding = claudeAdapter.createBinding.bind(claudeAdapter);
    vi.spyOn(claudeAdapter, "createBinding").mockImplementation(
        (controls, connection) => {
            const binding = createBinding(controls, connection);
            const original = binding.prepare.bind(binding);
            binding.prepare = (input) => prepare(input, original);
            if (wasReady !== undefined)
                Object.defineProperty(binding, "wasReady", {
                    get: () => wasReady,
                });
            bindings.set(controls.runtimeId, binding);
            return binding;
        },
    );
    const createExecution = claudeAdapter.createExecution.bind(claudeAdapter);
    vi.spyOn(claudeAdapter, "createExecution").mockImplementation(
        async (owner) => {
            const execution = await createExecution(owner);
            return {
                connection: execution.connection,
                start: async (command, executionOwner) => {
                    start(command);
                    const foreground = await executionOwner.foreground(
                        command as Command,
                    );
                    await holdStart;
                    return foreground;
                },
            };
        },
    );
    vi.spyOn(terminals, "createTerminal").mockImplementation((options) => {
        const listeners = new Set<TerminalListener>(
            options.initialListener ? [options.initialListener] : [],
        );
        let alive = true;
        const result: TerminalExit = { exitCode: 0, signal: null };
        const exit = (exitCode = 0) => {
            if (!alive) return;
            result.exitCode = exitCode;
            alive = false;
            for (const listener of listeners) listener.exit(result);
            listeners.clear();
        };
        const session: TerminalSession = {
            busy: async () => true,
            closeIdle: async () => false,
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
        expect(sessions[0]!.options.env!.AIOX_EXECUTION_OWNERSHIP).toBe(
            "daemon",
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

test("malformed authenticated vendor reports retain the bad-request response", async () => {
    const { socket } = await connect(webFrame());
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(1));
        const response = await fetch(harness.apiUrl("/api/agent-hooks"), {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${sessions[0]!.options.env!.AIOX_HOOK_TOKEN}`,
            },
            body: JSON.stringify({ event: {} }),
        });
        expect(response.status).toBe(400);
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

test("a disconnect after PTY creation retains the vendor while start resolves", async () => {
    const webInput = webFrame();
    let release!: () => void;
    holdStart = new Promise<void>((resolve) => {
        release = resolve;
    });
    const { socket } = await connect(webInput);
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(1));
        socket.terminate();
        await vi.waitFor(() =>
            expect(
                harness.daemon.services.runtimes.list()[0]?.binding
                    .relayDisconnected,
            ).toBe(true),
        );
        release();
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(harness.daemon.services.runtimes.list()).toHaveLength(1);
        expect(sessions[0]!.session.kill).not.toHaveBeenCalled();
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
    wasReady = true;
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
    const shell = await harness.daemon.createShell();
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

test("foreground connection loss retains its managed vendor and the borrowed shell", async () => {
    const shell = await harness.daemon.createShell();
    const terminalContext = terminalContextFromEnv(sessions[0]!.options.env!)!;
    const { socket } = await connect({ ...frame(), terminalContext });
    await vi.waitFor(() => expect(sessions).toHaveLength(2));
    const vendor = sessions[1]!;
    const token = vendor.options.env!.AIOX_MCP_TOKEN!;
    socket.terminate();
    await vi.waitFor(() =>
        expect(
            harness.daemon.services.runtimes.list()[0]?.binding
                .relayDisconnected,
        ).toBe(true),
    );
    expect(vendor.session.kill).not.toHaveBeenCalled();
    expect(vendor.session.alive).toBe(true);
    expect(harness.daemon.services.terminals.view(shell.id)?.alive).toBe(true);
    expect(harness.daemon.services.runtimes.authenticate(token)).toBeDefined();
});

test("a browser attachment detaches without stopping either the foreground CLI runtime or shell", async () => {
    const shell = await harness.daemon.createShell();
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
    await harness.daemon.createShell();
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
    const shell = await harness.daemon.createShell();
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
    prepare.mockImplementationOnce(async (input, original) => {
        await waiting;
        return original(input);
    });
    const { socket } = await connect(webInput);
    try {
        await vi.waitFor(() => expect(prepare).toHaveBeenCalled());
        socket.terminate();
        await vi.waitFor(() =>
            expect(harness.daemon.services.runtimes.list()).toEqual([]),
        );
        release();
        await waiting;
        await new Promise<void>((resolve) => setImmediate(resolve));
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
        env: {
            PATH: process.env.PATH ?? "",
            HOME: harness.home,
            CLAUDE_CONFIG_DIR: harness.home,
        },
        args: ["--model", "sonnet"],
        cols: 91,
        rows: 31,
    };
}

// Most controller tests inspect only the vendor; shell ownership is covered separately below.
function webFrame(): AgentRun {
    harness.daemon.services.terminals.createShell({
        file: process.execPath,
        args: [],
        cwd: process.cwd(),
    });
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
    const shell = await harness.daemon.createShell({ cwd: harness.home });
    const shellSession = sessions[0]!;
    const terminalContext = terminalContextFromEnv(shellSession.options.env!)!;
    const network = await harness.daemon.services.networks.create("dev");
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
        expect(vendor.options.cwd).toBe(harness.home);
        expect(harness.daemon.services.terminals.views()).toHaveLength(1);
        const record = harness.daemon.services.runtimes.list()[0]!;
        expect(record.terminalId).toBe(shell.id);
        expect(record.status).toBe("aiox-preparing");
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
        const transcript = join(
            harness.home,
            "projects",
            "project",
            "session-a.jsonl",
        );
        await mkdir(join(harness.home, "projects", "project"), {
            recursive: true,
        });
        await mkdir(join(harness.home, "sessions"), { recursive: true });
        await writeFile(
            join(harness.home, "sessions", `${process.pid}.json`),
            JSON.stringify({ sessionId: "session-a", status: "idle" }),
        );
        const invalidHook = await fetch(harness.apiUrl("/api/agent-hooks"), {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                inboxPath,
                inboxToken: "separate-inbox-token",
                ppid: process.pid,
                event: {
                    hook_event_name: "SessionStart",
                    session_id: "session-a",
                    transcript_path: transcript,
                },
            }),
        });
        expect(invalidHook.status).toBe(401);
        expect(record.status).toBe("aiox-preparing");
        const hook = await fetch(harness.apiUrl("/api/agent-hooks"), {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${vendor.options.env!.AIOX_HOOK_TOKEN}`,
            },
            body: JSON.stringify({
                inboxPath,
                inboxToken: "separate-inbox-token",
                ppid: process.pid,
                event: {
                    hook_event_name: "SessionStart",
                    session_id: "session-a",
                    transcript_path: transcript,
                },
            }),
        });
        expect(hook.ok).toBe(true);
        expect(record.status).toBe("aiox-preparing");
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
        expect(record.status).toBe("aiox-preparing");
        const invalidInitialization = await initialize(token, {});
        expect(invalidInitialization.status).toBe(200);
        expect(await invalidInitialization.json()).toHaveProperty("error");
        expect(record.status).toBe("aiox-preparing");
        const initialized = await initialize(token);
        expect(initialized.ok).toBe(true);
        await initialized.text();
        expect(record.status).toBe("idle");
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
            vi.mocked(prepare).mockRejectedValueOnce(
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
        prepare.mockImplementation((input, original) => original(input));
        const shell = await harness.daemon.createShell({ cwd: harness.home });
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
            expect(start).not.toHaveBeenCalled();
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

test("MCP inbox input settles through direct transcript observation with storage retry and shared registry status", async () => {
    const network = await harness.daemon.services.networks.create("one-way");
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

        const project = join(harness.home, "projects", "project");
        const transcript = join(project, "session.jsonl");
        const registry = join(harness.home, "sessions", `${process.pid}.json`);
        await mkdir(project, { recursive: true });
        await mkdir(join(harness.home, "sessions"), { recursive: true });
        await writeFile(transcript, "");
        const state = async (status: string, waitingFor?: string) => {
            await writeFile(
                registry,
                JSON.stringify({ sessionId: "session", status, waitingFor }),
            );
        };
        await state("idle");
        const args = vendor.options.args!;
        const inboxPath = args[args.indexOf("--messaging-socket-path") + 1]!;
        inbox.listen(inboxPath);
        await once(inbox, "listening");
        const hook = async (
            event: Record<string, unknown>,
            credential = vendor.options.env!.AIOX_HOOK_TOKEN!,
        ) =>
            fetch(harness.apiUrl("/api/agent-hooks"), {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${credential}`,
                },
                body: JSON.stringify({
                    inboxPath,
                    inboxToken: "native-inbox-token",
                    ppid: process.pid,
                    event: {
                        session_id: "session",
                        transcript_path: transcript,
                        ...event,
                    },
                }),
            });
        expect(
            (await hook({ hook_event_name: "SessionStart" }, source.token))
                .status,
        ).toBe(401);
        expect((await hook({ hook_event_name: "SessionStart" })).status).toBe(
            204,
        );
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
            from: target.id,
            to: [source.runtimeId],
            action: "block",
        });
        const send = async (content: string, count: number) => {
            const response = await sender.callTool({
                name: "send",
                arguments: { targets: [target.name], content },
            });
            const data = response.structuredContent as {
                messageId: string;
                results: { accepted: boolean }[];
            };
            expect(data.results[0]!.accepted).toBe(true);
            await vi.waitFor(() =>
                expect(
                    lines.filter((line) => line.type === "user"),
                ).toHaveLength(count),
            );
            const frame = lines.filter((line) => line.type === "user")[
                count - 1
            ]!.message!.content;
            return { id: data.messageId, frame };
        };
        const rows = async (values: Record<string, unknown>[]) =>
            appendFile(
                transcript,
                values
                    .map(
                        (row) =>
                            JSON.stringify({
                                sessionId: "session",
                                isSidechain: false,
                                ...row,
                            }) + "\n",
                    )
                    .join(""),
            );
        const input = async (id: string, frame: string) => {
            await rows([
                {
                    type: "user",
                    uuid: id,
                    parentUuid: null,
                    promptId: id,
                    origin: {
                        kind: "peer",
                        name: "Reviewer",
                        body: frame.slice(
                            frame.indexOf("\n") + 1,
                            frame.lastIndexOf("\n"),
                        ),
                    },
                    message: { role: "user", content: frame },
                },
            ]);
            await state("busy");
            await vi.waitFor(() => expect(target.status).toBe("working"));
        };
        const finish = async (id: string) => {
            await rows([
                {
                    type: "assistant",
                    uuid: `${id}-answer`,
                    parentUuid: id,
                    message: {
                        role: "assistant",
                        stop_reason: "end_turn",
                        content: [],
                    },
                },
                {
                    type: "system",
                    subtype: "turn_duration",
                    uuid: `${id}-end`,
                    parentUuid: `${id}-answer`,
                    durationMs: 1,
                },
            ]);
            await state("idle");
        };
        const delivery = async (id: string) =>
            (await harness.daemon.services.db.messages.deliveriesFor(id))[0]!;
        const sharedStatus = async (status: string) =>
            vi.waitFor(async () => {
                expect(target.status).toBe(status);
                expect(
                    await (
                        await fetch(harness.apiUrl(`/api/agents/${target.id}`))
                    ).json(),
                ).toMatchObject({ status });
                expect(
                    (await sender.callTool({ name: "agents_list" }))
                        .structuredContent,
                ).toMatchObject({ agents: [{ name: target.name, status }] });
            });
        const first = await send("Review line one.\nThen line two.", 1);
        expect(first.frame).toContain('from-name="Reviewer"');
        expect(first.frame).toContain("Role: reviewer");
        expect(first.frame).toContain("Description: Check changes");
        expect(
            lines
                .filter((line) => line.type === "auth")
                .every((line) => line.token === "native-inbox-token"),
        ).toBe(true);
        await input("first", first.frame);
        const save = vi
            .spyOn(harness.daemon.services.db.messages, "settle")
            .mockRejectedValueOnce(new Error("temporary DB failure"));
        await finish("first");
        await vi.waitFor(
            async () =>
                expect(await delivery(first.id)).toMatchObject({
                    outcome: "completed",
                }),
            { timeout: 3000 },
        );
        expect(save.mock.calls.length).toBeGreaterThanOrEqual(2);
        await vi.waitFor(() => expect(sourceVendor.received).toHaveLength(1));
        expect(sourceVendor.received[0]!.deliveryId).toBeNull();
        await finish("first");
        const second = await send("Fail this request", 2);
        // The failure can arrive before its transcript input is observed.
        await hook({
            hook_event_name: "StopFailure",
            prompt_id: "second",
            error: "rate_limit",
            last_assistant_message: "Usage limit reached",
        });
        await input("second", second.frame);
        await state("idle");
        await vi.waitFor(async () =>
            expect(await delivery(second.id)).toMatchObject({
                outcome: "failed",
                outcomeError: "Usage limit reached · rate_limit",
            }),
        );
        await vi.waitFor(() => expect(sourceVendor.received).toHaveLength(2));
        await state("waiting", "permission");
        await sharedStatus("awaiting-user");
        expect((await delivery(second.id)).outcome).toBe("failed");
        const third = await send("Cancel this request", 3);
        await input("third", third.frame);
        await rows([
            {
                type: "user",
                uuid: "third-interrupted",
                parentUuid: "third",
                message: {
                    role: "user",
                    content: [
                        { type: "text", text: "[Request interrupted by user]" },
                    ],
                },
            },
        ]);
        await state("idle");
        await vi.waitFor(async () =>
            expect(await delivery(third.id)).toMatchObject({
                outcome: "interrupted",
            }),
        );
        await sharedStatus("idle");
        expect(sourceVendor.received).toHaveLength(2);
        expect(vendor.session.alive).toBe(true);
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
            connection: { inboxPath: "/tmp/aiox-external/inbox.sock" },
        }),
    );
    const [raw] = await response;
    const prepared = JSON.parse(raw.toString());
    const runtimeId = harness.daemon.services.runtimes.list()[0]!.id;
    expect(prepared.type).toBe("prepared");
    expect(prepared.launch.env.AIOX_HOOK_TOKEN).toBeTruthy();
    expect(prepared.launch.env.AIOX_EXECUTION_OWNERSHIP).toBe("external");
    const record = harness.daemon.services.runtimes.get(runtimeId)!;
    expect(record.executionOwnership).toBe("external");
    expect(record.terminalId).toBeNull();
    expect(sessions).toHaveLength(0);
    expect(start).not.toHaveBeenCalled();
    socket.send(JSON.stringify({ type: "started" }));
    socket.terminate();
    await vi.waitFor(() =>
        expect(harness.daemon.services.runtimes.list()).toEqual([]),
    );
    const result = await fetch(harness.apiUrl("/api/agent-hooks"), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${prepared.launch.env.AIOX_HOOK_TOKEN}`,
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
            connection: { inboxPath: "/tmp/aiox-external/inbox.sock" },
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
    prepare.mockImplementationOnce(async (input, original) => {
        await waiting;
        return original(input);
    });
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
            connection: { inboxPath: "/tmp/aiox-external/inbox.sock" },
        }),
    );
    try {
        await vi.waitFor(() => expect(prepare).toHaveBeenCalled());
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
            connection: { inboxPath: "/tmp/aiox-external/inbox.sock" },
        }),
    );
    await response;
    const runtimeId = harness.daemon.services.runtimes.list()[0]!.id;
    const messages = vi.fn();
    socket.on("message", messages);
    const closed = once(socket, "close");
    await harness.daemon.stopRuntime(runtimeId);
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
            connection: { inboxPath: "/tmp/aiox-external/inbox.sock" },
        }),
    );
    const [raw] = await response;
    const prepared = JSON.parse(raw.toString());
    const runtimeId = harness.daemon.services.runtimes.list()[0]!.id;
    const binding = bindings.get(runtimeId)!;
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
        const report = fetch(harness.apiUrl("/api/agent-hooks"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${prepared.launch.env.AIOX_HOOK_TOKEN}`,
            },
            body: "{}",
        });
        await vi.waitFor(() => expect(read).toHaveBeenCalled());
        await harness.daemon.stopRuntime(runtimeId);
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
            connection: { inboxPath: "/tmp/aiox-external/inbox.sock" },
        }),
    );
    await response;
    const runtimeId = harness.daemon.services.runtimes.list()[0]!.id;
    const binding = bindings.get(runtimeId)!;
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
            harness.daemon.services.runtimes.get(runtimeId)
                ?.collaborationActive,
        ).toBe(false);
        const closed = once(socket, "close");
        release();
        await closed;
        expect(messages[1]).toEqual({
            type: "error",
            message: "Agent collaboration cleanup remains unconfirmed.",
        });
        expect(harness.daemon.services.runtimes.get(runtimeId)).toBeDefined();
    } finally {
        release();
        await vi.waitFor(() => expect(cleanup).toHaveBeenCalled());
        await new Promise<void>((resolve) => setImmediate(resolve));
        cleanup.mockRestore();
        socket.terminate();
        await harness.daemon.stopRuntime(runtimeId);
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
            connection: { inboxPath: "/tmp/aiox-external/inbox.sock" },
        }),
    );
    const [raw] = await response;
    const prepared = JSON.parse(raw.toString());
    const runtimeId = harness.daemon.services.runtimes.list()[0]!.id;
    const binding = bindings.get(runtimeId)!;
    const cleanup = vi
        .spyOn(binding, "cleanup")
        .mockRejectedValueOnce(new Error(prepared.launch.env.AIOX_HOOK_TOKEN));
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
        socket.terminate();
        await vi.waitFor(() =>
            expect(diagnostic).toHaveBeenCalledWith(
                "Agent collaboration cleanup remains unconfirmed after connection loss.",
            ),
        );
        expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(
            prepared.launch.env.AIOX_HOOK_TOKEN,
        );
        expect(
            harness.daemon.services.runtimes.get(runtimeId)
                ?.collaborationActive,
        ).toBe(false);
    } finally {
        cleanup.mockRestore();
        await harness.daemon.stopRuntime(runtimeId);
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
            connection: { inboxPath: "/tmp/aiox-external/inbox.sock" },
        }),
    );
    const [raw] = await response;
    const prepared = JSON.parse(raw.toString());
    const runtimeId = harness.daemon.services.runtimes.list()[0]!.id;
    const registry = harness.daemon.services.runtimes;
    const binding = bindings.get(runtimeId)!;
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
        expect(registry.get(runtimeId)?.collaborationActive).toBe(false);
        expect(
            registry.authenticate(prepared.launch.env.AIOX_MCP_TOKEN),
        ).toBeUndefined();
    } finally {
        release();
        await vi.waitFor(() => expect(registry.get(runtimeId)).toBeUndefined());
        socket.terminate();
    }
});

test("another vendor uses external lifecycle without a Claude inbox or daemon process", async () => {
    await harness.close();
    const cleanup = vi.fn(async () => {});
    let connected = false;
    const binding: VendorBinding = {
        prepare: async () => ({ connectTo: "vendor-owned-service" }),
        get wasReady() {
            return connected;
        },
        onReady: undefined,
        onReleased: undefined,
        executionStarted() {
            connected = true;
            this.onReady?.();
        },
        processExited: async () => {},
        mcpConnected: () => {},
        observe: async () => {},
        deliver: async () => {},
        connectionLost: async () => {},
        cleanup,
    };
    const createExecution = vi.fn(async () => {
        throw new Error("External owner must execute this vendor.");
    });
    const createBinding = vi.fn(
        (_controls: unknown, _connection: unknown) => binding,
    );
    harness = await startTestDaemon({
        adapters: [{ id: "another-vendor", createExecution, createBinding }],
    });
    const socket = new WebSocket(
        harness.apiUrl("/api/agent-run/external").replace("http:", "ws:"),
    );
    await once(socket, "open");
    const response = once(socket, "message");
    socket.send(
        JSON.stringify({
            adapter: "another-vendor",
            cwd: harness.home,
            env: {},
            args: [],
            connection: { relay: "local-control" },
        }),
    );
    const [raw] = await response;
    expect(JSON.parse(raw.toString())).toEqual({
        type: "prepared",
        launch: { connectTo: "vendor-owned-service" },
    });
    expect(createBinding.mock.calls[0]?.[1]).toEqual({
        relay: "local-control",
    });
    expect(createExecution).not.toHaveBeenCalled();
    expect(sessions).toHaveLength(0);
    const ready = once(socket, "message");
    socket.send(JSON.stringify({ type: "started" }));
    expect(JSON.parse((await ready)[0].toString())).toEqual({ type: "ready" });
    const closed = once(socket, "close");
    await harness.daemon.stopRuntime(
        harness.daemon.services.runtimes.list()[0]!.id,
    );
    await closed;
    expect(cleanup).toHaveBeenCalledWith("external_connection_lost");
});

test("another vendor starts a helper before its Web foreground and shares owner cleanup", async () => {
    await harness.close();
    const disposed = vi.fn(async () => {});
    const order: string[] = [];
    const binding: VendorBinding = {
        prepare: async (input) => ({
            file: "other-tui",
            args: [],
            cwd: input.cwd,
            env: input.env,
        }),
        wasReady: true,
        onReady: undefined,
        onReleased: undefined,
        executionStarted() {
            order.push("started");
            this.onReady?.();
        },
        processExited: async () => {},
        mcpConnected: () => {},
        observe: async () => {},
        deliver: async () => {},
        connectionLost: async () => {},
        cleanup: async () => {},
    };
    harness = await startTestDaemon({
        adapters: [
            {
                id: "another-vendor",
                createBinding: () => binding,
                async createExecution(owner) {
                    await owner.own(disposed);
                    return {
                        connection: null,
                        async start(launch, executionOwner) {
                            const command = launch as Command;
                            const helper = await executionOwner.background({
                                ...command,
                                file: process.execPath,
                                args: [
                                    "-e",
                                    "process.stdout.write('ready');setInterval(()=>{},1000)",
                                ],
                            });
                            await once(helper.stdout!, "data");
                            order.push("helper-ready");
                            return executionOwner.foreground(command);
                        },
                    };
                },
            },
        ],
    });
    const { socket } = await connect({
        ...webFrame(),
        adapter: "another-vendor",
    });
    try {
        await vi.waitFor(() =>
            expect(order).toEqual(["helper-ready", "started"]),
        );
        expect(sessions[0]!.options.file).toBe("other-tui");
        const record = harness.daemon.services.runtimes.list()[0]!;
        expect(record.executionOwnership).toBe("daemon");
        expect(record.terminalOwnership).toBe("borrowed");
        await harness.daemon.stopRuntime(record.id);
        expect(sessions[0]!.session.kill).toHaveBeenCalledOnce();
        expect(disposed).toHaveBeenCalledOnce();
        expect(harness.daemon.services.terminals.views()).toHaveLength(1);
    } finally {
        socket.terminate();
    }
});

test("a resource allocated after cancellation is still released by its execution owner", async () => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
        release = resolve;
    });
    const disposed = vi.fn(async () => {});
    vi.mocked(claudeAdapter.createExecution).mockImplementationOnce(
        async (owner) => {
            await waiting;
            await owner.own(disposed);
            return {
                connection: null,
                start: async () => {
                    throw new Error("Must not start.");
                },
            };
        },
    );
    const { socket } = await connect(webFrame());
    try {
        await vi.waitFor(() =>
            expect(claudeAdapter.createExecution).toHaveBeenCalled(),
        );
        socket.terminate();
        await vi.waitFor(() =>
            expect(
                harness.daemon.services.runtimes.list()[0]?.collaborationActive,
            ).toBe(false),
        );
        release();
        await vi.waitFor(() => expect(disposed).toHaveBeenCalledOnce());
        await vi.waitFor(() =>
            expect(harness.daemon.services.runtimes.list()).toEqual([]),
        );
        expect(sessions).toHaveLength(0);
    } finally {
        release();
        socket.terminate();
    }
});

test("failed Web termination revokes collaboration while preserving manual terminal exit", async () => {
    const { socket, messages } = await connect(webFrame());
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(1));
        const vendor = sessions[0]!;
        const record = harness.daemon.services.runtimes.list()[0]!;
        vi.mocked(vendor.session.kill).mockRejectedValueOnce(
            new Error("exit unconfirmed"),
        );
        const result = await harness.daemon.stop(true);
        expect(result.stopped).toBe(false);
        expect(record.collaborationActive).toBe(false);
        const hook = await fetch(harness.apiUrl("/api/agent-hooks"), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${vendor.options.env!.AIOX_HOOK_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: "{}",
        });
        expect(hook.status).toBe(401);
        expect(socket.readyState).toBe(WebSocket.OPEN);
        socket.send(Buffer.from("/exit\r"));
        await vi.waitFor(() =>
            expect(vendor.session.write).toHaveBeenCalledWith(
                Buffer.from("/exit\r"),
            ),
        );
        vendor.output("manual exit remains available");
        await vi.waitFor(() =>
            expect(
                messages.some(
                    (item) =>
                        item.binary &&
                        item.data.toString() ===
                            "manual exit remains available",
                ),
            ).toBe(true),
        );
        const closed = once(socket, "close");
        vendor.exit();
        await closed;
        await vi.waitFor(() =>
            expect(harness.daemon.services.runtimes.list()).toEqual([]),
        );
        expect(vendor.session.dispose).toHaveBeenCalledOnce();
    } finally {
        socket.terminate();
    }
});

test("Web revocation during execution preparation cannot publish a late binding or leave control open", async () => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
        release = resolve;
    });
    vi.mocked(claudeAdapter.createExecution).mockImplementationOnce(
        async () => {
            await waiting;
            return {
                connection: { inboxPath: "/tmp/not-created" },
                start: async () => {
                    throw new Error("Must not start.");
                },
            };
        },
    );
    const { socket } = await connect(webFrame());
    try {
        await vi.waitFor(() =>
            expect(claudeAdapter.createExecution).toHaveBeenCalled(),
        );
        const record = harness.daemon.services.runtimes.list()[0]!;
        const stopped = harness.daemon.stopRuntime(record.id);
        expect(record.collaborationActive).toBe(false);
        const closed = once(socket, "close");
        release();
        await stopped;
        await closed;
        expect(claudeAdapter.createBinding).not.toHaveBeenCalled();
        expect(sessions).toHaveLength(0);
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
    } finally {
        release();
        socket.terminate();
    }
});

test.each([false, true])(
    "daemon stop force=%s closes external collaboration without an execution command",
    async (force) => {
        const socket = new WebSocket(
            harness.apiUrl("/api/agent-run/external").replace("http:", "ws:"),
        );
        await once(socket, "open");
        const prepared = once(socket, "message");
        const { cols: _cols, rows: _rows, ...input } = frame();
        socket.send(
            JSON.stringify({
                ...input,
                connection: { inboxPath: "/tmp/aiox-external/inbox.sock" },
            }),
        );
        await prepared;
        const runtime = harness.daemon.services.runtimes.list()[0]!;
        socket.send(JSON.stringify({ type: "started" }));
        const frames: string[] = [];
        socket.on("message", (raw) => frames.push(raw.toString()));
        const closed = once(socket, "close");
        try {
            expect(await harness.daemon.stop(force)).toMatchObject({
                stopped: true,
            });
            await closed;
            expect(frames).toEqual([]);
            expect(runtime.collaborationActive).toBe(false);
            expect(
                harness.daemon.services.runtimes.get(runtime.id),
            ).toBeUndefined();
        } finally {
            socket.terminate();
        }
    },
);

test("keeps Web execution and registration after relay loss and restores the same vendor through its terminal", async () => {
    const input = webFrame();
    const { socket } = await connect(input);
    await vi.waitFor(() => expect(sessions).toHaveLength(1));
    const vendor = sessions[0]!;
    const record = harness.daemon.services.runtimes.list()[0]!;
    socket.terminate();
    await vi.waitFor(async () => {
        const response = await fetch(
            harness.apiUrl(`/api/terminals/${record.terminalId}`),
        );
        expect(await response.json()).toMatchObject({
            vendor: {
                runtimeId: record.id,
                alive: true,
                relayDisconnected: true,
                collaborationActive: true,
            },
        });
    });
    expect(vendor.session.kill).not.toHaveBeenCalled();
    expect(harness.daemon.services.runtimes.get(record.id)).toBe(record);
    const restored = new WebSocket(
        harness
            .webUrl(`/ws/terminal/${record.terminalId}?runtime=${record.id}`)
            .replace("http:", "ws:"),
    );
    await once(restored, "open");
    restored.send(Buffer.from("same vendor"));
    await vi.waitFor(() =>
        expect(vendor.session.write).toHaveBeenCalledWith(
            new Uint8Array(Buffer.from("same vendor")),
        ),
    );
    const response = await fetch(
        harness.apiUrl(
            `/api/terminals/${record.terminalId}/vendor?runtime=${record.id}`,
        ),
        { method: "DELETE" },
    );
    expect(response.ok).toBe(true);
    await vi.waitFor(() => expect(vendor.session.kill).toHaveBeenCalled());
    expect(
        harness.daemon.services.terminals.get(record.terminalId!)?.alive,
    ).toBe(true);
    expect(harness.daemon.services.runtimes.list()).toEqual([]);
    restored.terminate();
});

test("Web collaboration timeout revokes only collaboration and retains its usable relay until explicit cleanup", async () => {
    const input = webFrame();
    const timers = vi.spyOn(globalThis, "setTimeout");
    const { socket } = await connect(input);
    await vi.waitFor(() =>
        expect(timers.mock.calls.some((call) => call[1] === 60_000)).toBe(true),
    );
    const record = harness.daemon.services.runtimes.list()[0]!;
    const vendor = sessions[0]!;
    const cleanup = vi.spyOn(bindings.get(record.id)!, "cleanup");
    const deadline = timers.mock.calls.find((call) => call[1] === 60_000)![0];
    if (typeof deadline !== "function") throw new Error("Missing deadline");
    deadline();
    await vi.waitFor(async () => {
        const response = await fetch(
            harness.apiUrl(`/api/terminals/${record.terminalId}`),
        );
        expect(await response.json()).toMatchObject({
            vendor: {
                alive: true,
                collaborationActive: false,
                relayDisconnected: false,
                collaborationError: expect.stringContaining("60 seconds"),
            },
        });
    });
    expect(cleanup).toHaveBeenCalledWith("collaboration_lost");
    expect(vendor.session.kill).not.toHaveBeenCalled();
    expect(socket.readyState).toBe(WebSocket.OPEN);
    socket.send(Buffer.from("still usable"));
    await vi.waitFor(() =>
        expect(vendor.session.write).toHaveBeenCalledWith(
            Buffer.from("still usable"),
        ),
    );
    const stopped = (await harness.daemon.stop(false)).stopped;
    expect(stopped).toBe(process.platform === "win32");
    if (!stopped) await harness.daemon.stopRuntime(record.id);
    expect(vendor.session.kill).toHaveBeenCalledOnce();
    expect(harness.daemon.services.runtimes.list()).toEqual([]);
    socket.terminate();
});

test("a failure after Web PTY creation retains the same vendor for recovery and natural-exit cleanup", async () => {
    let fail!: (error: Error) => void;
    holdStart = new Promise<void>((_resolve, reject) => {
        fail = reject;
    });
    const { socket } = await connect(webFrame());
    await vi.waitFor(() => expect(sessions).toHaveLength(1));
    const record = harness.daemon.services.runtimes.list()[0]!;
    const vendor = sessions[0]!;
    fail(new Error("post-spawn preparation failed"));
    await vi.waitFor(() =>
        expect(record.binding.collaborationError).toBe(
            "post-spawn preparation failed",
        ),
    );
    expect(record.binding.relayDisconnected).toBe(true);
    expect(record.collaborationActive).toBe(false);
    expect(vendor.session.kill).not.toHaveBeenCalled();
    const viewer = new WebSocket(
        harness
            .webUrl(`/ws/terminal/${record.terminalId}?runtime=${record.id}`)
            .replace("http:", "ws:"),
    );
    await once(viewer, "open");
    viewer.send(Buffer.from("/exit\r"));
    await vi.waitFor(() =>
        expect(vendor.session.write).toHaveBeenCalledWith(
            new Uint8Array(Buffer.from("/exit\r")),
        ),
    );
    vendor.exit();
    await vi.waitFor(() =>
        expect(harness.daemon.services.runtimes.list()).toEqual([]),
    );
    expect(
        harness.daemon.services.terminals.view(record.terminalId!)?.alive,
    ).toBe(true);
    expect(vendor.session.dispose).toHaveBeenCalled();
    viewer.terminate();
    socket.terminate();
});

test("retained Web vendor cleanup retries failures and rejects stale terminal ownership", async () => {
    const { socket } = await connect(webFrame());
    await vi.waitFor(() => expect(sessions).toHaveLength(1));
    const record = harness.daemon.services.runtimes.list()[0]!;
    const vendor = sessions[0]!;
    socket.terminate();
    await vi.waitFor(() => expect(record.binding.relayDisconnected).toBe(true));
    const remove = (id: string, runtime = record.id) =>
        fetch(
            harness.apiUrl(`/api/terminals/${id}/vendor?runtime=${runtime}`),
            { method: "DELETE" },
        );
    expect((await remove(record.terminalId!, "stale-runtime")).status).toBe(
        404,
    );
    expect((await remove("another-terminal")).status).toBe(404);
    expect(vendor.session.kill).not.toHaveBeenCalled();
    vi.mocked(vendor.session.kill).mockRejectedValueOnce(
        new Error("kill unconfirmed"),
    );
    expect((await remove(record.terminalId!)).status).toBe(500);
    expect(vendor.session.alive).toBe(true);
    expect(harness.daemon.services.runtimes.get(record.id)).toBe(record);
    const viewer = new WebSocket(
        harness
            .webUrl(`/ws/terminal/${record.terminalId}?runtime=${record.id}`)
            .replace("http:", "ws:"),
    );
    await once(viewer, "open");
    viewer.send(Buffer.from("retry input"));
    await vi.waitFor(() =>
        expect(vendor.session.write).toHaveBeenCalledWith(
            new Uint8Array(Buffer.from("retry input")),
        ),
    );
    const detached = once(viewer, "close");
    viewer.close();
    await detached;
    expect(vendor.session.alive).toBe(true);
    expect((await remove(record.terminalId!)).status).toBe(200);
    expect(vendor.session.kill).toHaveBeenCalledTimes(2);
    expect(harness.daemon.services.runtimes.get(record.id)).toBeUndefined();
    expect(
        harness.daemon.services.terminals.view(record.terminalId!)?.alive,
    ).toBe(true);
});

async function managedFrame() {
    const shell = await harness.daemon.createShell({ cwd: harness.home });
    const terminalContext = terminalContextFromEnv(sessions[0]!.options.env!)!;
    const panel = {
        id: "managed-panel",
        kind: "host" as const,
        section: "hosts" as const,
        name: "Managed",
        hostId: "managed-host",
        networkId: "managed-network",
        revision: 1,
        layout: {
            type: "pane" as const,
            id: "pane",
            tabIds: ["tab"],
            selectedTabId: "tab",
        },
        activePaneId: "pane",
        tabs: [
            {
                id: "tab",
                terminalId: shell.id,
                label: "reviewer",
                agentKey: "reviewer",
                runtimeId: null,
                presentation: "shell" as const,
                notice: null,
            },
        ],
    };
    await harness.daemon.services.db.hostState.createHost(
        {
            id: "managed-host",
            name: "Managed",
            directory: harness.home,
            sourceFile: join(harness.home, "aiox.yaml"),
            instruction: "Host instruction",
            revision: 1,
            panelId: panel.id,
            networkId: "managed-network",
            activeOperationId: null,
            agents: [
                {
                    key: "reviewer",
                    adapter: "claude",
                    role: "reviewer",
                    description: null,
                    instruction: "Agent instruction",
                    args: [],
                    member: true,
                    runtime: null,
                    lastTerminalId: null,
                    lastExit: null,
                },
            ],
        },
        {
            id: "managed-network",
            hostId: "managed-host",
            name: "Team",
            scope: "host",
            default: "allow",
            members: [{ agentKey: "reviewer", runtimeId: null }],
            edges: [],
        },
        panel,
        Date.now(),
    );
    const input = {
        ...frame(),
        terminalContext,
        env: {
            ...frame().env,
            AIOX_HOST_ID: "managed-host",
            AIOX_AGENT_KEY: "reviewer",
        },
    };
    return { shell, input };
}

test("managed Agent uses its authenticated Host tab, projects readiness and preserves shell after exit", async () => {
    const { shell, input } = await managedFrame();
    wasReady = true;
    const { socket } = await connect(input);
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(2));
        const record = harness.daemon.services.runtimes.list()[0]!;
        expect(record.hostId).toBe("managed-host");
        expect(record.networkId).toBe("managed-network");
        expect(
            await (
                await fetch(harness.apiUrl(`/api/agents/${record.id}`))
            ).json(),
        ).toMatchObject({ hostId: "managed-host", networkName: "Team" });
        expect(prepare.mock.calls[0]![0].instruction).toContain(
            "Host instruction\n\nAgent instruction",
        );
        const hostView = async () =>
            hostViewSchema.parse(
                await (
                    await fetch(harness.apiUrl("/api/hosts/managed-host"))
                ).json(),
            );
        expect((await hostView()).agents[0]!.runtime!.phase).toBe("preparing");
        bindings.get(record.id)!.onReady?.();
        expect((await hostView()).agents[0]!.runtime!.phase).toBe("running");
        const snapshot = await readWebSnapshot(harness.daemon.services);
        expect(snapshot.hosts[0]!.agents[0]!.runtime?.id).toBe(record.id);
        expect(snapshot.panels[0]!.tabs[0]!.presentation).toBe("tui");
        expect(
            snapshot.networks.find((n) => "members" in n)?.members[0]
                ?.runtimeId,
        ).toBe(record.id);
        sessions[1]!.exit();
        await vi.waitFor(() =>
            expect(harness.daemon.services.runtimes.list()).toHaveLength(0),
        );
        const after = await hostView();
        expect(after.agents[0]!).toMatchObject({
            runtime: null,
            lastTerminalId: shell.id,
            lastExit: { kind: "exited" },
        });
        expect(harness.daemon.services.terminals.get(shell.id)?.alive).toBe(
            true,
        );
        const stored = await harness.daemon.services.db.hostState.snapshot();
        expect(stored.panels[0]!.tabs[0]).toMatchObject({
            presentation: "shell",
            notice: null,
        });
        const second = await connect(input);
        await vi.waitFor(() => expect(sessions).toHaveLength(3));
        const replacement = harness.daemon.services.runtimes.list()[0]!;
        expect(replacement.id).not.toBe(record.id);
        await harness.daemon.stopRuntime(replacement.id);
        expect((await hostView()).agents[0]!.lastExit!.kind).toBe("stopped");
        const tab = (await harness.daemon.services.db.hostState.snapshot())
            .panels[0]!.tabs[0]!;
        expect(tab.presentation).toBe("stopped");
        expect(tab.notice?.restartCommand).toContain("aiox host agent start");
        second.socket.terminate();
    } finally {
        socket.terminate();
    }
});

test("managed collaboration timeout preserves execution and shell while revoking collaboration", async () => {
    const { shell, input } = await managedFrame();
    const timers = vi.spyOn(globalThis, "setTimeout");
    const { socket } = await connect(input);
    try {
        await vi.waitFor(() =>
            expect(timers.mock.calls.some((call) => call[1] === 60_000)).toBe(
                true,
            ),
        );
        const record = harness.daemon.services.runtimes.list()[0]!;
        const vendor = sessions[1]!;
        const token = vendor.options.env!.AIOX_MCP_TOKEN!;
        expect(harness.daemon.services.runtimes.authenticate(token)).toBe(
            record,
        );
        const cleanup = vi.spyOn(bindings.get(record.id)!, "cleanup");
        const deadline = timers.mock.calls.find(
            (call) => call[1] === 60_000,
        )![0];
        if (typeof deadline !== "function") throw new Error("Missing deadline");
        deadline();
        await vi.waitFor(() => {
            expect(cleanup).toHaveBeenCalledWith("collaboration_lost");
            expect(record.collaborationActive).toBe(false);
        });
        expect(
            harness.daemon.services.runtimes.authenticate(token),
        ).toBeUndefined();
        expect(harness.daemon.services.runtimes.get(record.id)).toBe(record);
        expect(vendor.session.kill).not.toHaveBeenCalled();
        expect(vendor.session.alive).toBe(true);
        expect(harness.daemon.services.terminals.get(shell.id)?.alive).toBe(
            true,
        );
        const snapshot = await readWebSnapshot(harness.daemon.services);
        expect(snapshot.hosts[0]!.agents[0]).toMatchObject({
            lastExit: null,
            runtime: {
                id: record.id,
                collaborationActive: false,
                collaborationError: expect.stringContaining("60 seconds"),
            },
        });
        expect(snapshot.panels[0]!.tabs[0]).toMatchObject({
            runtimeId: record.id,
            notice: null,
        });
        expect(socket.readyState).toBe(WebSocket.OPEN);
        socket.send(Buffer.from("still usable"));
        await vi.waitFor(() =>
            expect(vendor.session.write).toHaveBeenCalledWith(
                Buffer.from("still usable"),
            ),
        );
        await harness.daemon.stopRuntime(record.id);
        expect(vendor.session.kill).toHaveBeenCalledOnce();
        expect(harness.daemon.services.runtimes.get(record.id)).toBeUndefined();
        expect(harness.daemon.services.terminals.get(shell.id)?.alive).toBe(
            true,
        );
        const stopped = await readWebSnapshot(harness.daemon.services);
        expect(stopped.hosts[0]!.agents[0]!.lastExit?.kind).toBe("stopped");
    } finally {
        socket.terminate();
    }
});

test("managed startup failure is durable and leaves its shell usable", async () => {
    const { shell, input } = await managedFrame();
    start.mockImplementation(() => {
        throw new Error("vendor executable missing");
    });
    const { socket, messages } = await connect(input);
    try {
        await vi.waitFor(() =>
            expect(
                messages.some(
                    (m) =>
                        !m.binary &&
                        m.data.toString().includes("vendor executable missing"),
                ),
            ).toBe(true),
        );
        expect(harness.daemon.services.runtimes.list()).toHaveLength(0);
        const snapshot = await readWebSnapshot(harness.daemon.services);
        expect(snapshot.hosts[0]!.agents[0]!.lastExit).toMatchObject({
            kind: "start-failed",
            message: "vendor executable missing",
        });
        expect(snapshot.panels[0]!.tabs[0]!.presentation).toBe("start-failed");
        expect(harness.daemon.services.terminals.get(shell.id)?.alive).toBe(
            true,
        );
    } finally {
        socket.terminate();
    }
});

test("managed launch rejects another terminal even with the same cwd before vendor acquisition", async () => {
    const { input } = await managedFrame();
    await harness.daemon.createShell({ cwd: harness.home });
    const { socket, messages } = await connect({
        ...input,
        terminalContext: terminalContextFromEnv(sessions[1]!.options.env!)!,
    });
    try {
        await vi.waitFor(() =>
            expect(
                messages.some(
                    (m) =>
                        !m.binary &&
                        m.data
                            .toString()
                            .includes("does not own this panel terminal"),
                ),
            ).toBe(true),
        );
        expect(start).not.toHaveBeenCalled();
        expect(harness.daemon.services.runtimes.list()).toHaveLength(0);
        expect(
            (await readWebSnapshot(harness.daemon.services)).hosts[0]!
                .agents[0]!.lastExit,
        ).toBeNull();
    } finally {
        socket.terminate();
    }
});

test("managed stop keeps a failed cleanup reserved and persists stopped only after a successful retry", async () => {
    const { shell, input } = await managedFrame();
    wasReady = true;
    const { socket } = await connect(input);
    try {
        await vi.waitFor(() => expect(sessions).toHaveLength(2));
        const record = harness.daemon.services.runtimes.list()[0]!;
        vi.spyOn(sessions[1]!.session, "kill").mockRejectedValueOnce(
            new Error("kill unconfirmed"),
        );
        await expect(harness.daemon.stopRuntime(record.id)).rejects.toThrow(
            "kill unconfirmed",
        );
        const pending = await readWebSnapshot(harness.daemon.services);
        expect(pending.hosts[0]!.agents[0]!.runtime).toMatchObject({
            phase: "stopping",
            collaborationActive: false,
        });
        expect(pending.hosts[0]!.agents[0]!.lastExit).toBeNull();
        await harness.daemon.stopRuntime(record.id);
        expect(
            (await readWebSnapshot(harness.daemon.services)).hosts[0]!
                .agents[0]!.lastExit?.kind,
        ).toBe("stopped");
        expect(harness.daemon.services.terminals.get(shell.id)?.alive).toBe(
            true,
        );
    } finally {
        socket.terminate();
    }
});

test.each([
    [false, "start-failed"],
    [true, "crashed"],
] as const)(
    "managed nonzero exit with ready=%s records %s and keeps shell",
    async (ready, kind) => {
        const { shell, input } = await managedFrame();
        wasReady = ready;
        const { socket } = await connect(input);
        try {
            await vi.waitFor(() => expect(sessions).toHaveLength(2));
            sessions[1]!.exit(9);
            await vi.waitFor(() =>
                expect(harness.daemon.services.runtimes.list()).toHaveLength(0),
            );
            const snapshot = await readWebSnapshot(harness.daemon.services);
            expect(snapshot.hosts[0]!.agents[0]!.lastExit?.kind).toBe(kind);
            expect(snapshot.panels[0]!.tabs[0]!.presentation).toBe(kind);
            expect(harness.daemon.services.terminals.get(shell.id)?.alive).toBe(
                true,
            );
        } finally {
            socket.terminate();
        }
    },
);
