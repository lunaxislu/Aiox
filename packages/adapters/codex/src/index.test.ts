import { once } from "node:events";
import { PassThrough } from "node:stream";

import { ExecutionOwner } from "@aiox/vendor";
import type { Command, ExecutionProcess } from "@aiox/vendor";
import { expect, test, vi } from "vitest";
import { WebSocket, WebSocketServer } from "ws";

import { codexAdapter } from "./index";

test("starts App Server before foreground, gates readiness on thread and MCP, and releases collaboration separately", async () => {
    const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("address");
    let launch: Command | undefined;
    let exit!: (value: { exitCode: number; signal: number | null }) => void;
    const foreground: ExecutionProcess = {
        exited: new Promise((r) => {
            exit = r;
        }),
        stop: vi.fn(async () => {
            exit({ exitCode: 0, signal: null });
        }),
        write() {},
        resize() {},
    };
    const owner = new ExecutionOwner(async (command) => {
        launch = command;
        return foreground;
    });
    const stdout = new PassThrough(),
        stderr = new PassThrough();
    const helper = {
        ...foreground,
        stdout,
        stderr,
        stop: vi.fn(async () => {}),
    };
    vi.spyOn(owner, "background").mockImplementation(async () => {
        setTimeout(
            () =>
                stderr.write(`listening on: ws://127.0.0.1:${address.port}\n`),
            0,
        );
        return helper;
    });
    const activity = vi.fn();
    let tui: WebSocket | undefined;
    try {
        const execution = await codexAdapter.createExecution(owner);
        const binding = codexAdapter.createBinding(
            { runtimeId: "r", setActivity: activity, settle: async () => {} },
            execution.connection,
        );
        const prepared = await binding.prepare({
            executionOwnership: "external",
            args: [],
            cwd: process.cwd(),
            env: { PATH: process.env.PATH! },
            mcpUrl: "http://127.0.0.1:1/mcp/n",
            mcpToken: "secret",
            reportUrl: "",
            reportToken: "",
            instruction: "collaborate",
        });
        await execution.start(prepared, owner);
        binding.executionStarted();
        expect(binding.wasReady).toBe(false);
        expect(launch!.args).toContain("--remote");
        const connected = once(server, "connection");
        tui = new WebSocket(
            launch!.args[launch!.args.indexOf("--remote") + 1]!,
            {
                headers: {
                    Authorization: `Bearer ${launch!.env.AIOX_CODEX_RELAY_TOKEN}`,
                },
            },
        );
        await once(tui, "open");
        const [peer] = await connected;
        const request = once(peer, "message");
        tui.send(JSON.stringify({ id: 1, method: "thread/start", params: {} }));
        await request;
        const response = once(tui, "message");
        peer.send(
            JSON.stringify({ id: 1, result: { thread: { id: "thread-A" } } }),
        );
        await response;
        expect(binding.wasReady).toBe(false);
        binding.mcpConnected();
        await expect.poll(() => binding.wasReady).toBe(true);
        expect(activity).toHaveBeenCalledWith("idle", expect.anything());
        const message = {
            deliveryId: "delivery",
            from: { name: "sender", role: null, description: null },
            content: "probe",
            createdAt: 1,
        };
        const deliverTo = async (threadId: string) => {
            const received = once(peer, "message");
            const delivered = binding.deliver(message);
            const [raw] = await received;
            const frame = JSON.parse(raw.toString());
            expect(frame.method).toBe("turn/start");
            expect(frame.params.threadId).toBe(threadId);
            peer.send(JSON.stringify({ id: frame.id, result: {} }));
            await delivered;
        };
        await deliverTo("thread-A");
        const switching = once(peer, "message");
        tui.send(
            JSON.stringify({ id: 2, method: "thread/resume", params: {} }),
        );
        await switching;
        await expect
            .poll(() => activity.mock.calls.at(-1)?.[0])
            .toBe("starting");
        await expect(binding.deliver(message)).rejects.toThrow("no confirmed");
        const resumed = once(tui, "message");
        peer.send(
            JSON.stringify({ id: 2, result: { thread: { id: "thread-B" } } }),
        );
        await resumed;
        await expect.poll(() => activity.mock.calls.at(-1)?.[0]).toBe("idle");
        await deliverTo("thread-B");
        await binding.cleanup("external_connection_lost");
        expect(tui.readyState).toBe(WebSocket.OPEN);
        expect(foreground.stop).not.toHaveBeenCalled();
        const tuiClosed = once(tui, "close");
        const peerClosed = once(peer, "close");
        await owner.stop();
        await Promise.all([tuiClosed, peerClosed]);
        expect(foreground.stop).toHaveBeenCalledOnce();
        const unavailable = new WebSocket(launch!.args[1]!);
        const [error] = await once(unavailable, "error");
        expect(String(error)).toContain("ECONNREFUSED");
    } finally {
        tui?.terminate();
        await owner.stop();
        for (const client of server.clients) client.terminate();
        await new Promise<void>((r) => server.close(() => r()));
        vi.restoreAllMocks();
    }
});

test("App Server startup failure reaches the caller without leaking the MCP token or launching a TUI", async () => {
    const launchTui = vi.fn();
    const owner = new ExecutionOwner(launchTui);
    const stderr = new PassThrough();
    let fail!: (value: { exitCode: number; signal: number | null }) => void;
    const exited = new Promise<{ exitCode: number; signal: number | null }>(
        (resolve) => {
            fail = resolve;
        },
    );
    const diagnostic = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.spyOn(owner, "background").mockImplementation(async () => {
        setTimeout(() => {
            stderr.write("MCP rejected private-mcp-secret\n");
            fail({ exitCode: 1, signal: null });
        }, 0);
        return {
            exited,
            stderr,
            stop: async () => {},
            write() {},
            resize() {},
        };
    });
    let binding: ReturnType<typeof codexAdapter.createBinding> | undefined;
    try {
        const execution = await codexAdapter.createExecution(owner);
        binding = codexAdapter.createBinding(
            { runtimeId: "r", setActivity() {}, settle: async () => {} },
            execution.connection,
        );
        const launch = await binding.prepare({
            executionOwnership: "external",
            args: [],
            cwd: process.cwd(),
            env: { PATH: process.env.PATH! },
            mcpUrl: "http://127.0.0.1:1/mcp/n",
            mcpToken: "private-mcp-secret",
            reportUrl: "",
            reportToken: "",
            instruction: "test",
        });
        await expect(execution.start(launch, owner)).rejects.toThrow(
            "MCP rejected [redacted]",
        );
        expect(launchTui).not.toHaveBeenCalled();
        expect(diagnostic.mock.calls.flat().join("")).not.toContain(
            "private-mcp-secret",
        );
    } finally {
        await binding?.cleanup("execution_stopped");
        await owner.stop();
        vi.restoreAllMocks();
    }
});
