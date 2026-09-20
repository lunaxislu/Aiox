import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";

import { saveConfig } from "@aiox/config";
import { test, vi } from "vitest";
import { WebSocket } from "ws";

import { runExternal } from "./external";
import { runForeground } from "./foreground";

vi.mock("node:child_process", async (original) => ({
    ...(await original<typeof import("node:child_process")>()),
    spawn: vi.fn(),
}));
vi.mock("node:fs", async (original) => {
    const fs = await original<typeof import("node:fs")>();
    return { ...fs, existsSync: vi.fn(fs.existsSync) };
});

vi.mock("./external", () => ({
    runExternal: vi.fn(async () => ({ exitCode: 0, signal: null })),
}));

vi.mock("./foreground", () => ({
    runForeground: vi.fn(async () => ({ exitCode: 0, signal: null })),
}));
vi.mock("ws", async () => {
    const { EventEmitter } = await import("node:events");
    return {
        WebSocket: vi.fn(function () {
            const socket = Object.assign(new EventEmitter(), {
                send: vi.fn(),
                terminate: vi.fn(),
            });
            queueMicrotask(() => socket.emit("open"));
            return socket;
        }),
    };
});

import { createFoundationPort } from "./bootstrap";
import type { CliOptions, CliPort, CommandName } from "./requests";

type Call = { method: string; url: string; body: string };
type Stub = {
    home: string;
    calls: Call[];
    routes: string[];
    cli: CliPort;
    httpPort: number;
    close: () => Promise<void>;
};

/** A real HTTP server stands in for the daemon; the CLI reaches it through its config file. */
async function daemonStub(
    handler: (call: Call, response: ServerResponse, port: number) => void,
): Promise<Stub> {
    const calls: Call[] = [];
    const server = createServer((request, response) => {
        let body = "";
        request.on("data", (chunk: Buffer) => {
            body += chunk.toString();
        });
        request.on("end", () => {
            const call = {
                method: request.method ?? "",
                url: request.url ?? "",
                body,
            };
            calls.push(call);
            handler(call, response, (server.address() as AddressInfo).port);
            if (!response.writableEnded) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        code: "not_found",
                        message: `No stub route for ${call.method} ${call.url}`,
                    }),
                );
            }
        });
    });
    await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
    });
    const httpPort = (server.address() as AddressInfo).port;
    const home = await mkdtemp(join(tmpdir(), "aiox-cli-"));
    // Ephemeral ports are always above 1024, so the neighbour below is a valid web port.
    await saveConfig(
        { ports: { daemon: httpPort, web: httpPort - 1 } },
        { home },
    );
    return {
        home,
        calls,
        get routes() {
            return calls.map((call) => `${call.method} ${call.url}`);
        },
        cli: createFoundationPort({ home }),
        httpPort,
        close: async () => {
            server.closeAllConnections();
            await new Promise<void>((resolve) => {
                server.close(() => resolve());
            });
        },
    };
}

function send(response: ServerResponse, status: number, body: unknown): void {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
}

const running = (port: number) => ({
    status: "running",
    pid: process.pid,
    ports: { daemon: port, web: port - 1 },
    startedAt: 1_700_000_000_000,
    runtimes: 2,
    networks: 1,
});

const refusal = {
    code: "active_runtimes",
    message: "Active AIOX runtimes block a plain stop",
    runtimes: ["reviewer", "builder"],
};

const run = (
    cli: CliPort,
    command: CommandName,
    options: CliOptions = {},
    args: string[] = [],
) => cli.execute({ command, args, options });

test("daemon status reports an unanswered probe without claiming absence", async () => {
    const stub = await daemonStub(() => {});
    await stub.close();
    const report = (await run(stub.cli, "daemon.status", { json: true })) as {
        state: string;
        detail: string;
    };
    assert.equal(report.state, "no-state-file");
    assert.match(report.detail, /not proof/i);
    assert.match(report.detail, new RegExp(String(stub.httpPort)));
});

test("a refused stop surfaces the blocking runtimes and never retries with force", async () => {
    const stub = await daemonStub((call, response) => {
        if (call.url === "/api/daemon/stop") send(response, 409, refusal);
    });
    try {
        await assert.rejects(run(stub.cli, "daemon.stop"), (error: Error) => {
            assert.match(error.message, /active_runtimes/);
            assert.match(error.message, /reviewer/);
            assert.match(error.message, /builder/);
            return true;
        });
        assert.deepEqual(stub.routes, ["POST /api/daemon/stop"]);
        assert.deepEqual(JSON.parse(stub.calls[0]?.body ?? "null"), {
            force: false,
        });
    } finally {
        await stub.close();
    }
});

test("restart keeps the running daemon when the stop is refused", async () => {
    const stub = await daemonStub((call, response, port) => {
        if (call.url === "/api/status") send(response, 200, running(port));
        if (call.url === "/api/daemon/stop") send(response, 409, refusal);
    });
    try {
        await assert.rejects(
            run(stub.cli, "daemon.restart"),
            (error: Error) => {
                assert.match(error.message, /reviewer/);
                return true;
            },
        );
        // A second daemon would need another probe and a spawn; the sequence stops at the refusal.
        assert.deepEqual(stub.routes, [
            "GET /api/status",
            "POST /api/daemon/stop",
        ]);
    } finally {
        await stub.close();
    }
});

for (const invalid of ["JSON", "shell"] as const) {
    test(`restart validates new ${invalid} before stopping the recorded daemon`, async () => {
        const stub = await daemonStub((call, response, port) => {
            if (call.url === "/api/status") send(response, 200, running(port));
            if (call.url === "/api/daemon/stop") send(response, 409, refusal);
        });
        try {
            await writeFile(
                join(stub.home, ".aiox", "daemon.json"),
                JSON.stringify({
                    pid: process.pid,
                    ports: { daemon: stub.httpPort, web: stub.httpPort - 1 },
                    startedAt: 1,
                }),
            );
            if (invalid === "JSON")
                await writeFile(join(stub.home, ".aiox", "config.json"), "{");
            else
                await saveConfig(
                    {
                        ports: {
                            daemon: stub.httpPort,
                            web: stub.httpPort - 1,
                        },
                        terminal: { shell: join(stub.home, "missing") },
                    },
                    { home: stub.home },
                );
            await assert.rejects(
                run(stub.cli, "daemon.restart"),
                /Invalid JSON|terminal.shell/,
            );
            assert.ok(!stub.routes.includes("POST /api/daemon/stop"));
        } finally {
            await stub.close();
            await rm(stub.home, { recursive: true, force: true });
        }
    });
}

test("restart checks the build before stop and starts from its prepared config after an edit", async () => {
    const home = await mkdtemp(join(tmpdir(), "aiox-w3-startup-"));
    const config = {
        ports: { daemon: 4600, web: 4601 },
        terminal: { shell: process.execPath },
        messages: { retentionDays: 7 },
    };
    await saveConfig(config, { home });
    await writeFile(
        join(home, ".aiox", "daemon.json"),
        JSON.stringify({
            pid: 1,
            ports: { daemon: 4700, web: 4701 },
            startedAt: 1,
        }),
    );
    let stopped = false;
    let spawned = false;
    const notices: string[] = [];
    const stderr = vi
        .spyOn(process.stderr, "write")
        .mockImplementation((chunk) => {
            notices.push(String(chunk));
            return true;
        });
    const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async (url, init) => {
            if (init?.method === "POST") {
                assert.ok(notices.some((line) => /4700.*4600/.test(line)));
                stopped = true;
                await saveConfig(
                    { ...config, messages: { retentionDays: 99 } },
                    { home },
                );
                return new Response(
                    JSON.stringify({ stopped: true, forced: false }),
                );
            }
            if (String(url).includes(":4700") && !stopped)
                return new Response(
                    JSON.stringify({ ...running(4700), pid: 1 }),
                );
            if (spawned)
                return new Response(
                    JSON.stringify({ ...running(4600), pid: 43210 }),
                );
            throw new Error("not listening");
        });
    const stdin = new PassThrough();
    let payload = "";
    stdin.on("data", (chunk) => {
        payload += String(chunk);
    });
    vi.mocked(spawn).mockImplementation(() => {
        spawned = true;
        return Object.assign(new EventEmitter(), {
            stdin,
            pid: 43210,
            exitCode: null,
            signalCode: null,
            unref: vi.fn(),
            kill: vi.fn(),
        }) as unknown as ReturnType<typeof spawn>;
    });
    try {
        vi.mocked(existsSync).mockReturnValueOnce(false);
        await assert.rejects(
            run(createFoundationPort({ home }), "daemon.restart"),
            /build not found/,
        );
        assert.equal(stopped, false);
        const result = await run(
            createFoundationPort({ home }),
            "daemon.restart",
        );
        assert.match(String(result), /daemon started/);
        assert.deepEqual(JSON.parse(payload), { home, config });
        assert.equal(stdin.writableEnded, true);
    } finally {
        fetchMock.mockRestore();
        stderr.mockRestore();
        vi.mocked(spawn).mockReset();
        await rm(home, { recursive: true, force: true });
    }
});

test("restart refuses an occupied next port without stopping either daemon", async () => {
    const current = await daemonStub((call, response, port) => {
        if (call.url === "/api/status")
            send(response, 200, { ...running(port), pid: 1 });
        if (call.url === "/api/daemon/stop") send(response, 409, refusal);
    });
    const other = await daemonStub((call, response, port) => {
        if (call.url === "/api/status")
            send(response, 200, { ...running(port), pid: 2 });
        if (call.url === "/api/daemon/stop") send(response, 409, refusal);
    });
    try {
        await saveConfig(
            { ports: { daemon: other.httpPort, web: other.httpPort - 1 } },
            { home: current.home },
        );
        await writeFile(
            join(current.home, ".aiox", "daemon.json"),
            JSON.stringify({
                pid: 1,
                ports: { daemon: current.httpPort, web: current.httpPort - 1 },
                startedAt: 1,
            }),
        );
        const diagnosis = (await run(current.cli, "doctor", {
            json: true,
        })) as {
            daemon: { pid: number; port: number };
        };
        assert.equal(diagnosis.daemon.pid, 1);
        assert.equal(diagnosis.daemon.port, current.httpPort);
        await assert.rejects(
            run(current.cli, "daemon.restart"),
            /configured.*port.*already/i,
        );
        assert.ok(!current.routes.includes("POST /api/daemon/stop"));
        assert.ok(!other.routes.includes("POST /api/daemon/stop"));
    } finally {
        await current.close();
        await other.close();
        await rm(current.home, { recursive: true, force: true });
        await rm(other.home, { recursive: true, force: true });
    }
});

for (const failure of ["spawn", "pipe", "exit", "timeout"] as const) {
    test(`start reports ${failure} failure and cleans only its own child`, async () => {
        const home = await mkdtemp(join(tmpdir(), "aiox-w3-startup-child-"));
        await saveConfig(
            {
                ports: { daemon: 4600, web: 4601 },
                terminal: { shell: process.execPath },
            },
            { home },
        );
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockRejectedValue(new Error("not listening"));
        const stdin = new PassThrough();
        const child = Object.assign(new EventEmitter(), {
            stdin,
            pid: failure === "spawn" ? undefined : 43210,
            exitCode: failure === "exit" ? 1 : null,
            signalCode: null,
            unref: vi.fn(),
            kill: vi.fn(),
        });
        vi.mocked(spawn).mockImplementation(() => {
            if (failure === "spawn" || failure === "pipe")
                queueMicrotask(() =>
                    (failure === "spawn" ? child : stdin).emit(
                        "error",
                        new Error(`${failure} injected`),
                    ),
                );
            return child as unknown as ReturnType<typeof spawn>;
        });
        const clock =
            failure === "timeout"
                ? vi
                      .spyOn(Date, "now")
                      .mockReturnValueOnce(0)
                      .mockReturnValue(30_000)
                : undefined;
        try {
            await assert.rejects(
                run(createFoundationPort({ home }), "daemon.start"),
                failure === "exit"
                    ? /exit code 1/
                    : failure === "timeout"
                      ? /within 20s/
                      : new RegExp(`${failure} injected`),
            );
            assert.equal(
                child.kill.mock.calls.length,
                failure === "pipe" || failure === "timeout" ? 1 : 0,
            );
            assert.equal(child.unref.mock.calls.length, 0);
        } finally {
            clock?.mockRestore();
            fetchMock.mockRestore();
            vi.mocked(spawn).mockReset();
            stdin.destroy();
            await rm(home, { recursive: true, force: true });
        }
    });
}

test("an incomplete force stop reports remaining resources and allows a user retry", async () => {
    let attempts = 0;
    const stub = await daemonStub((call, response) => {
        if (call.url !== "/api/daemon/stop") return;
        if (++attempts === 1)
            send(response, 409, {
                code: "stop_incomplete",
                message:
                    "Shutdown is incomplete; the daemon remains available for cleanup.",
                runtimes: ["B"],
                warnings: ["runtime B: exit unconfirmed"],
            });
        else send(response, 200, { stopped: true, forced: true });
    });
    try {
        await assert.rejects(
            run(stub.cli, "daemon.stop", { force: true }),
            (error: Error) => {
                assert.match(error.message, /stop_incomplete/);
                assert.match(error.message, /runtime B: exit unconfirmed/);
                return true;
            },
        );
        assert.equal(attempts, 1);
        assert.match(
            String(await run(stub.cli, "daemon.stop", { force: true })),
            /daemon stopped/,
        );
        assert.equal(attempts, 2);
    } finally {
        await stub.close();
        await rm(stub.home, { recursive: true, force: true });
    }
});

test("doctor separates invalid settings without a recorded target from an unreachable daemon", async () => {
    const home = await mkdtemp(join(tmpdir(), "aiox-w3-startup-doctor-"));
    try {
        await mkdir(join(home, ".aiox"));
        await writeFile(join(home, ".aiox", "config.json"), "{");
        const report = (await run(createFoundationPort({ home }), "doctor", {
            json: true,
        })) as {
            config: { error: string };
            daemon: { reachable: boolean; port?: number };
        };
        assert.match(report.config.error, /Invalid JSON/);
        assert.equal(report.daemon.reachable, false);
        assert.equal(report.daemon.port, undefined);
        const text = String(
            await run(createFoundationPort({ home }), "doctor"),
        );
        assert.match(text, /Config: .*Invalid JSON/);
        assert.match(text, /Daemon: unreachable \(no valid port\)/);
        assert.ok(!text.includes('"daemon":'));
    } finally {
        await rm(home, { recursive: true, force: true });
    }
});

test("daemon start refuses to start a second daemon on a live port", async () => {
    const stub = await daemonStub((call, response, port) => {
        if (call.url === "/api/status") send(response, 200, running(port));
    });
    try {
        const message = await run(stub.cli, "daemon.start");
        assert.match(String(message), /already running/);
        assert.deepEqual(stub.routes, ["GET /api/status"]);
    } finally {
        await stub.close();
    }
});

test("CLI errors preserve a message without a code and render candidates once", async () => {
    const stub = await daemonStub((call, response) => {
        if (call.url.startsWith("/api/networks"))
            send(response, 400, { message: "No such network: nope" });
        else
            send(response, 409, {
                code: "ambiguous_agent",
                message: "Several running agents match that name.",
                candidates: [
                    { name: "B", network: "w1" },
                    { name: "B", network: "w2" },
                ],
            });
    });
    try {
        await assert.rejects(run(stub.cli, "network.show", {}, ["nope"]), {
            message: "No such network: nope",
        });
        await assert.rejects(run(stub.cli, "agent.show", {}, ["B"]), {
            message:
                "Several running agents match that name. [ambiguous_agent]\n  B — network=w1\n  B — network=w2",
        });
    } finally {
        await stub.close();
    }
});

test("routing verbs send one operation and show no blocks", async () => {
    const view = { id: "n1", name: "review", scope: "persistent", routes: [] };
    const stub = await daemonStub((call, response) =>
        send(response, 200, view),
    );
    try {
        for (const action of ["block", "unblock", "reset"] as const) {
            for (const [options, operation] of [
                [
                    { between: ["a", "b"] },
                    { kind: "between", action, agents: ["a", "b"] },
                ],
                [
                    { from: "a", to: ["b", "c"] },
                    { kind: "directed", action, from: "a", to: ["b", "c"] },
                ],
            ] as [CliOptions, unknown][]) {
                assert.equal(
                    await run(stub.cli, `network.${action}`, options, [
                        "review",
                    ]),
                    "review (persistent)\n  Persistent networks always default to allow; Hosts can choose allow or deny in YAML.\n  Default: allow\n  Blocks: none",
                );
                assert.deepEqual(
                    JSON.parse(stub.calls.at(-1)?.body ?? "null"),
                    { operation },
                );
                assert.equal(
                    stub.calls.at(-1)?.url,
                    "/api/networks/review/route",
                );
            }
        }
        await run(stub.cli, "network.create", {}, ["review"]);
        assert.deepEqual(JSON.parse(stub.calls.at(-1)?.body ?? "null"), {
            name: "review",
        });
        for (const action of ["block", "unblock", "reset"] as const)
            await assert.rejects(
                run(
                    stub.cli,
                    `host.network.${action}`,
                    { between: ["a", "b"] },
                    ["feature", "review"],
                ),
                /Stage 5/,
            );
        assert.equal(stub.calls.length, 7);
    } finally {
        await stub.close();
    }
});

test("network output names blocked endpoints and folds reverse pairs without counts", async () => {
    const view = {
        id: "n1",
        name: "w1",
        scope: "persistent",
        routes: [
            { from: "id-a", to: "id-b", fromName: "A", toName: "B" },
            { from: "id-b", to: "id-a", fromName: "B", toName: "A" },
            {
                from: "id-a",
                to: "unnamed-id",
                fromName: "A",
                toName: "unnamed-id",
            },
        ],
    };
    const stub = await daemonStub((call, response) =>
        send(response, 200, call.url === "/api/networks" ? [view] : view),
    );
    try {
        const expected =
            "w1 (persistent)\n  Persistent networks always default to allow; Hosts can choose allow or deny in YAML.\n  Default: allow\n  A <-> B: blocked\n  A -> unnamed-id: blocked";
        for (const command of [
            "network.block",
            "network.show",
            "network.list",
        ] as const)
            assert.equal(
                await run(stub.cli, command, { between: ["A", "B"] }, ["w1"]),
                expected,
            );
        assert.deepEqual(
            await run(stub.cli, "network.show", { json: true }, ["w1"]),
            view,
        );
    } finally {
        await stub.close();
    }
});

test("network and agent reads reach their endpoints and summarise without --json", async () => {
    const agent = {
        agentId: "a1",
        name: "reviewer",
        role: "review",
        description: null,
        status: "idle",
        networkId: "n1",
        networkName: "review",
        hostId: null,
        terminalId: null,
        status_reason: null,
        observation_error: null,
    };
    const stub = await daemonStub((call, response) => {
        if (call.url.startsWith("/api/agents")) send(response, 200, [agent]);
    });
    try {
        assert.match(
            String(await run(stub.cli, "agent.list", { all: true })),
            /reviewer/,
        );
        assert.deepEqual(
            await run(stub.cli, "agent.list", { json: true, network: "n1" }),
            [agent],
        );
        assert.deepEqual(stub.routes, [
            "GET /api/agents?all=1",
            "GET /api/agents?network=n1",
        ]);
    } finally {
        await stub.close();
    }
});

test("unsupported adapters and Host commands remain unavailable", async () => {
    const stub = await daemonStub(() => {});
    try {
        await assert.rejects(
            run(stub.cli, "agent.run", {}, ["unknown-vendor"]),
            /Unsupported vendor: unknown-vendor/,
        );
        await assert.rejects(
            run(stub.cli, "host.agent.start", {}, ["review"]),
            /Stage 5/,
        );
        assert.deepEqual(stub.routes, []);
    } finally {
        await stub.close();
    }
});

test("Claude launch forwards the current shell context and exact vendor arguments before foreground relay", async () => {
    const stub = await daemonStub(() => {});
    const previousExitCode = process.exitCode;
    vi.stubEnv("AIOX_TERMINAL_ID", "shell-test");
    vi.stubEnv("AIOX_TERMINAL_TOKEN", "private-terminal-token");
    vi.mocked(runForeground).mockResolvedValueOnce({
        exitCode: 7,
        signal: null,
    });
    try {
        await stub.cli.execute({
            command: "agent.run",
            args: ["claude"],
            options: {
                name: "review",
                network: "dev",
                role: "reviewer",
                description: "Review",
                instruction: "Be concise",
            },
            adapterArgs: ["--model", "sonnet", "argument with spaces"],
        });
        assert.equal(
            vi.mocked(WebSocket).mock.calls.at(-1)?.[0],
            `ws://127.0.0.1:${stub.httpPort}/api/agent-run`,
        );
        const socket = vi.mocked(WebSocket).mock.results.at(-1)!.value;
        const frame = JSON.parse(socket.send.mock.calls[0][0]);
        assert.equal(frame.adapter, "claude");
        assert.equal(frame.cwd, process.cwd());
        assert.equal(frame.env.AIOX_TERMINAL_TOKEN, "private-terminal-token");
        assert.deepEqual(frame.terminalContext, {
            terminalId: "shell-test",
            token: "private-terminal-token",
        });
        assert.deepEqual(frame.args, [
            "--model",
            "sonnet",
            "argument with spaces",
        ]);
        assert.equal(frame.instruction, "Be concise");
        assert.equal(frame.name, "review");
        assert.equal(frame.network, "dev");
        assert.equal(frame.role, "reviewer");
        assert.equal(frame.description, "Review");
        assert.ok(
            socket.send.mock.invocationCallOrder[0] <
                vi.mocked(runForeground).mock.invocationCallOrder.at(-1)!,
        );
        assert.equal(process.exitCode, 7);
    } finally {
        process.exitCode = previousExitCode;
        vi.unstubAllEnvs();
        await stub.close();
    }
});

test("external standalone uses lifecycle control and cleans the socket after launch failure", async () => {
    const stub = await daemonStub(() => {});
    vi.stubEnv("AIOX_TERMINAL_ID", undefined);
    vi.stubEnv("AIOX_TERMINAL_TOKEN", undefined);
    vi.mocked(runExternal).mockRejectedValueOnce(
        new Error("Vendor start failed."),
    );
    try {
        await assert.rejects(
            run(stub.cli, "agent.run", {}, ["claude"]),
            /Vendor start failed/,
        );
        const socket = vi.mocked(WebSocket).mock.results.at(-1)!.value;
        const frame = vi.mocked(runExternal).mock.calls.at(-1)![1];
        assert.ok(
            String(vi.mocked(WebSocket).mock.calls.at(-1)![0]).endsWith(
                "/api/agent-run/external",
            ),
        );
        assert.equal("terminalContext" in frame, false);
        assert.deepEqual(frame.args, []);
        assert.equal(socket.terminate.mock.calls.length, 1);
    } finally {
        vi.unstubAllEnvs();
        await stub.close();
    }
});

test("keeps a socket error guard while the external launcher prepares its inbox", async () => {
    const stub = await daemonStub(() => {});
    vi.stubEnv("AIOX_TERMINAL_ID", undefined);
    vi.stubEnv("AIOX_TERMINAL_TOKEN", undefined);
    vi.mocked(runExternal).mockImplementationOnce(async (socket) => {
        await new Promise<void>((resolve) => setImmediate(resolve));
        assert.doesNotThrow(() =>
            socket.emit(
                "error",
                new Error("connection lost during inbox setup"),
            ),
        );
        return { exitCode: 0, signal: null };
    });
    const previousExitCode = process.exitCode;
    try {
        await run(stub.cli, "agent.run", {}, ["claude"]);
    } finally {
        process.exitCode = previousExitCode;
        vi.unstubAllEnvs();
        await stub.close();
    }
});

test.each(["error", "close"])(
    "a handshake %s gives an actionable, credential-free failure and terminates the connection",
    async (event) => {
        const stub = await daemonStub(() => {});
        const socket = Object.assign(new EventEmitter(), {
            send: vi.fn(),
            terminate: vi.fn(),
        });
        vi.mocked(WebSocket).mockImplementationOnce(function () {
            queueMicrotask(() =>
                socket.emit(event, new Error("secret-from-transport")),
            );
            return socket as unknown as WebSocket;
        });
        try {
            await assert.rejects(
                run(stub.cli, "agent.run", {}, ["claude"]),
                (error: Error) => {
                    assert.match(error.message, /aiox daemon start/);
                    assert.ok(!error.message.includes("secret-from-transport"));
                    return true;
                },
            );
            assert.equal(socket.terminate.mock.calls.length, 1);
            assert.equal(socket.send.mock.calls.length, 0);
        } finally {
            await stub.close();
        }
    },
);

test("invalid launch metadata is rejected before a socket exists without echoing environment secrets", async () => {
    const stub = await daemonStub(() => {});
    const before = vi.mocked(WebSocket).mock.calls.length;
    try {
        await assert.rejects(
            run(stub.cli, "agent.run", { name: "bad/name" }, ["claude"]),
            /Invalid vendor launch/,
        );
        assert.equal(vi.mocked(WebSocket).mock.calls.length, before);
    } finally {
        await stub.close();
    }
});

test("doctor keeps its stage 1 diagnosis and adds daemon reachability", async () => {
    const stub = await daemonStub(() => {});
    await stub.close();
    const report = (await run(stub.cli, "doctor", { json: true })) as Record<
        string,
        unknown
    >;
    assert.equal(report.node, process.version);
    assert.equal(report.platform, process.platform);
    assert.equal(report.arch, process.arch);
    assert.ok(["native", "wsl"].includes(String(report.environment)));
    assert.equal(
        report.vendorIntegration,
        "Claude and Codex foreground launch",
    );
    assert.deepEqual((report.config as { ports: unknown }).ports, {
        daemon: stub.httpPort,
        web: stub.httpPort - 1,
    });
    assert.equal(
        typeof (report.git as { available: boolean }).available,
        "boolean",
    );
    assert.deepEqual(report.daemon, {
        reachable: false,
        port: stub.httpPort,
    });
});

test("daemon status and doctor find the recorded daemon despite invalid next settings", async () => {
    const stub = await daemonStub((call, response, port) => {
        if (call.url === "/api/status") send(response, 200, running(port));
    });
    try {
        await writeFile(
            join(stub.home, ".aiox", "daemon.json"),
            JSON.stringify({
                pid: process.pid,
                ports: { daemon: stub.httpPort, web: stub.httpPort - 1 },
                startedAt: 1,
            }),
        );
        await writeFile(join(stub.home, ".aiox", "config.json"), "{");
        const status = (await run(stub.cli, "daemon.status", {
            json: true,
        })) as { state: string };
        assert.equal(status.state, "running");
        const diagnosis = (await run(stub.cli, "doctor", { json: true })) as {
            config: { error: string };
            daemon: { reachable: boolean; port: number };
        };
        assert.match(diagnosis.config.error, /Invalid JSON/);
        assert.equal(diagnosis.daemon.reachable, true);
        assert.equal(diagnosis.daemon.port, stub.httpPort);
    } finally {
        await stub.close();
    }
});

test("commands follow the port a running daemon recorded, not the configured default", async () => {
    const stub = await daemonStub((call, response, port) => {
        if (call.url === "/api/agents") send(response, 200, []);
        if (call.url === "/api/status") send(response, 200, running(port));
    });
    // A daemon started with --port bound somewhere other than the configured
    // default and recorded it. Without following that record, every later
    // command would talk to a port nothing is listening on.
    const home = await mkdtemp(join(tmpdir(), "aiox-cli-"));
    await saveConfig({ ports: { daemon: 4500, web: 4501 } }, { home });
    await mkdir(join(home, ".aiox"), { recursive: true });
    await writeFile(
        join(home, ".aiox", "daemon.json"),
        JSON.stringify({
            pid: process.pid,
            ports: { daemon: stub.httpPort, web: stub.httpPort - 1 },
            startedAt: 1_700_000_000_000,
        }),
    );

    const cli = createFoundationPort({ home });
    assert.deepEqual(await run(cli, "agent.list", { json: true }), []);
    assert.deepEqual(stub.routes, ["GET /api/agents"]);
    await stub.close();
});
