import { once } from "node:events";
import { PassThrough } from "node:stream";

import { logger } from "@aiox/diagnostics";
import { ExecutionOwner } from "@aiox/vendor";
import type { Command, ExecutionProcess, RuntimeControls } from "@aiox/vendor";
import { Deferred, Effect } from "effect";
import { expect, test, vi } from "vitest";
import { WebSocket, WebSocketServer } from "ws";

import { codexAdapter } from "./index";

const run = Effect.runPromise;

test("keeps draining real App Server stderr after readiness", async () => {
    const foregroundExit = Deferred.makeUnsafe<{
        exitCode: number;
        signal: number | null;
    }>();
    const owner = new ExecutionOwner(() =>
        Effect.succeed({
            exited: Deferred.await(foregroundExit),
            stop: () =>
                Deferred.succeed(foregroundExit, {
                    exitCode: 0,
                    signal: null,
                }).pipe(Effect.asVoid),
            write() {},
            resize() {},
        }),
    );
    const background = owner.background.bind(owner);
    let helper!: ExecutionProcess;
    vi.spyOn(owner, "background").mockImplementation((command) =>
        background({
            ...command,
            file: process.execPath,
            args: [
                "-e",
                `
            process.stderr.write('listening on: ws://127.0.0.1:12345\\n');
            process.stdin.once('data', () => {
                process.stderr.write('diagnostic after readiness\\n'.repeat(10000), (error) => { if (error) throw error; process.exit(0); });
            });
        `,
            ],
        }).pipe(
            Effect.tap((process) =>
                Effect.sync(() => {
                    helper = process;
                }),
            ),
        ),
    );
    try {
        const execution = await run(codexAdapter.createExecution(owner));
        const command = {
            file: "codex",
            args: [],
            cwd: process.cwd(),
            env: { ...process.env },
        };
        await run(
            execution.start(
                { instruction: "", server: command, tui: command },
                owner,
            ),
        );
        helper.write("continue\n");
        expect(await run(helper.exited)).toMatchObject({ exitCode: 0 });
    } finally {
        await run(owner.stop());
    }
});

vi.mock("node:child_process", async (original) => {
    const actual = await original<typeof import("node:child_process")>();
    const { promisify } = await import("node:util");
    return {
        ...actual,
        execFile: Object.assign(vi.fn(), {
            [promisify.custom]: async () => ({
                stdout: "--remote-auth-token-env",
            }),
        }),
    };
});

test("rejects unexpected Codex connection fields", () => {
    const controls = {
        runtimeId: "runtime",
        setStatus: vi.fn(),
        setObservationError: vi.fn(),
        settle: vi.fn(),
    } satisfies RuntimeControls;

    expect(() =>
        codexAdapter.createBinding(controls, {
            url: "ws://127.0.0.1:1234",
            token: "a".repeat(43),
            unexpected: true,
        } as never),
    ).toThrow();
});

test("starts App Server before foreground, gates readiness on thread and MCP, and releases collaboration separately", async () => {
    const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("address");
    let launch: Command | undefined;
    const exit = Deferred.makeUnsafe<{
        exitCode: number;
        signal: number | null;
    }>();
    const foreground: ExecutionProcess = {
        exited: Deferred.await(exit),
        stop: vi.fn(() =>
            Deferred.succeed(exit, { exitCode: 0, signal: null }).pipe(
                Effect.asVoid,
            ),
        ),
        write() {},
        resize() {},
    };
    const owner = new ExecutionOwner((command) => {
        launch = command;
        return Effect.succeed(foreground);
    });
    const stdout = new PassThrough(),
        stderr = new PassThrough();
    const helper = {
        ...foreground,
        stdout,
        stderr,
        stop: vi.fn(() => Effect.void),
    };
    vi.spyOn(owner, "background").mockImplementation(() => {
        setTimeout(
            () =>
                stderr.write(`listening on: ws://127.0.0.1:${address.port}\n`),
            0,
        );
        return Effect.succeed(helper);
    });
    const status = vi.fn();
    const settle = vi.fn(
        async (_id: string, _outcome: string, _error?: string) => {},
    );
    let tui: WebSocket | undefined;
    try {
        const execution = await run(codexAdapter.createExecution(owner));
        const binding = codexAdapter.createBinding(
            {
                runtimeId: "r",
                setStatus: status,
                setObservationError: vi.fn(),
                settle,
            },
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
        await run(execution.start(prepared, owner));
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
        status.mockClear();
        const ready = vi.fn();
        binding.onReady = ready;
        binding.mcpConnected();
        await expect.poll(() => binding.wasReady).toBe(true);
        expect(status.mock.calls).toEqual([["idle", undefined]]);
        expect(ready).toHaveBeenCalledTimes(1);
        const message = {
            deliveryId: "delivery",
            from: { name: "sender", role: null, description: null },
            content: "probe",
            createdAt: 1,
        };
        const deliverTo = async (
            threadId: string,
            deliveryId: string,
            completeFirst = false,
            turnId = "turn-A",
        ) => {
            const received = once(peer, "message");
            const delivered = binding.deliver({ ...message, deliveryId });
            const [raw] = await received;
            const frame = JSON.parse(raw.toString());
            expect(frame.method).toBe("turn/start");
            expect(frame.params.threadId).toBe(threadId);
            if (completeFirst)
                peer.send(
                    JSON.stringify({
                        method: "turn/completed",
                        params: {
                            threadId,
                            turn: {
                                id: turnId,
                                status: "failed",
                                error: {
                                    message: "model failed",
                                    codexErrorInfo: {
                                        httpConnectionFailed: {
                                            httpStatusCode: 429,
                                        },
                                    },
                                },
                            },
                        },
                    }),
                );
            peer.send(
                JSON.stringify({
                    id: frame.id,
                    result: { turn: { id: turnId } },
                }),
            );
            await delivered;
        };
        await deliverTo("thread-A", "delivery-A");
        peer.send(
            JSON.stringify({
                method: "turn/started",
                params: { threadId: "thread-A", turn: { id: "turn-A" } },
            }),
        );
        await expect.poll(() => status.mock.calls.at(-1)?.[0]).toBe("working");
        peer.send(
            JSON.stringify({
                id: 7,
                method: "item/commandExecution/requestApproval",
                params: { threadId: "thread-A", turnId: "turn-A" },
            }),
        );
        await expect
            .poll(() => status.mock.calls.at(-1)?.[0])
            .toBe("awaiting-user");
        peer.send(
            JSON.stringify({
                id: 8,
                method: "item/tool/requestUserInput",
                params: { threadId: "thread-A", turnId: "turn-A" },
            }),
        );
        peer.send(
            JSON.stringify({
                method: "serverRequest/resolved",
                params: { threadId: "thread-A", requestId: 7 },
            }),
        );
        await expect
            .poll(() => status.mock.calls.at(-1)?.[0])
            .toBe("awaiting-user");
        peer.send(
            JSON.stringify({
                method: "serverRequest/resolved",
                params: { threadId: "thread-A", requestId: 8 },
            }),
        );
        await expect.poll(() => status.mock.calls.at(-1)?.[0]).toBe("working");
        await deliverTo("thread-A", "delivery-A2");
        peer.send(
            JSON.stringify({
                method: "turn/completed",
                params: {
                    threadId: "thread-A",
                    turn: { id: "turn-A", status: "completed" },
                },
            }),
        );
        await expect
            .poll(() => settle)
            .toHaveBeenCalledWith("delivery-A", "completed", undefined);
        await expect
            .poll(() => settle)
            .toHaveBeenCalledWith("delivery-A2", "completed", undefined);
        await expect.poll(() => status.mock.calls.at(-1)?.[0]).toBe("idle");
        await deliverTo(
            "thread-A",
            "delivery-interrupted",
            false,
            "turn-interrupted",
        );
        peer.send(
            JSON.stringify({
                method: "turn/completed",
                params: {
                    threadId: "thread-A",
                    turn: { id: "turn-interrupted", status: "interrupted" },
                },
            }),
        );
        await expect
            .poll(() => settle)
            .toHaveBeenCalledWith(
                "delivery-interrupted",
                "interrupted",
                undefined,
            );
        peer.send(
            JSON.stringify({
                method: "item/completed",
                params: {
                    threadId: "thread-A",
                    turnId: "turn-interrupted",
                    item: {
                        id: "late",
                        type: "commandExecution",
                        status: "completed",
                    },
                },
            }),
        );
        expect(
            settle.mock.calls.filter(([id]) => id === "delivery-interrupted"),
        ).toHaveLength(1);
        const switching = once(peer, "message");
        tui.send(
            JSON.stringify({ id: 2, method: "thread/resume", params: {} }),
        );
        await switching;
        await expect
            .poll(() => status.mock.calls.at(-1)?.[0])
            .toBe("aiox-preparing");
        await expect(binding.deliver(message)).rejects.toThrow("no confirmed");
        const resumed = once(tui, "message");
        peer.send(
            JSON.stringify({ id: 2, result: { thread: { id: "thread-B" } } }),
        );
        await resumed;
        await expect.poll(() => status.mock.calls.at(-1)?.[0]).toBe("idle");
        settle.mockRejectedValueOnce(new Error("storage unavailable"));
        await deliverTo("thread-B", "delivery-B", true);
        await expect
            .poll(
                () =>
                    settle.mock.calls.filter(([id]) => id === "delivery-B")
                        .length,
            )
            .toBe(1);
        await expect
            .poll(() => status.mock.calls.at(-1))
            .toEqual([
                "failed",
                'model failed · {"httpConnectionFailed":{"httpStatusCode":429}}',
            ]);
        peer.send(
            JSON.stringify({
                method: "turn/started",
                params: { threadId: "thread-B", turn: { id: "next" } },
            }),
        );
        await expect.poll(() => status.mock.calls.at(-1)?.[0]).toBe("working");
        peer.send(
            JSON.stringify({
                method: "turn/completed",
                params: {
                    threadId: "thread-B",
                    turn: {
                        id: "turn-A",
                        status: "failed",
                        error: { message: "late failure" },
                    },
                },
            }),
        );
        peer.send(
            JSON.stringify({
                method: "item/completed",
                params: {
                    threadId: "thread-B",
                    turnId: "next",
                    item: { id: "barrier", type: "agentMessage" },
                },
            }),
        );
        await expect
            .poll(() => status.mock.calls.at(-1))
            .toEqual(["working", "Processing the turn."]);
        peer.send(
            JSON.stringify({
                method: "turn/completed",
                params: {
                    threadId: "thread-B",
                    turn: { id: "next", status: "failed" },
                },
            }),
        );
        await expect
            .poll(() => status.mock.calls.at(-1))
            .toEqual(["failed", undefined]);
        const observe = async (frame: object, expected: string) => {
            const count = status.mock.calls.length;
            peer.send(JSON.stringify(frame));
            // A selected-thread event is a barrier for events about other threads too.
            peer.send(
                JSON.stringify({
                    method: "item/completed",
                    params: { threadId: "thread-B" },
                }),
            );
            await expect
                .poll(() => status.mock.calls.length)
                .toBeGreaterThan(count);
            expect(status.mock.calls.at(-1)?.[0]).toBe(expected);
        };
        const elicit = (
            id: string | number,
            turnId: string | null,
            threadId = "thread-B",
        ) => ({
            id,
            method: "mcpServer/elicitation/request",
            params: {
                threadId,
                turnId,
                serverName: "test",
                mode: "form",
                message: "Confirm",
                requestedSchema: { type: "object", properties: {} },
            },
        });
        const resolve = (
            requestId: string | number,
            threadId = "thread-B",
        ) => ({
            method: "serverRequest/resolved",
            params: { threadId, requestId },
        });
        const turnEvent = (method: string, id: string, turnStatus: string) => ({
            method,
            params: { threadId: "thread-B", turn: { id, status: turnStatus } },
        });
        // Selection responses change the projection; rejected selections preserve it.
        const select = async (
            threadId: string,
            expected: string,
            rejected = false,
            wasConnected = true,
        ) => {
            const received = once(peer, "message");
            tui!.send(
                JSON.stringify({
                    id: 30,
                    method: "thread/resume",
                    params: { threadId },
                }),
            );
            await received;
            if (wasConnected)
                await expect
                    .poll(() => status.mock.calls.at(-1)?.[0])
                    .toBe("aiox-preparing");
            await expect(binding.deliver(message)).rejects.toThrow(
                "no confirmed",
            );
            peer.send(
                JSON.stringify({
                    id: 30,
                    ...(rejected
                        ? {
                              error: {
                                  code: -32000,
                                  message: "Selection cancelled",
                              },
                          }
                        : { result: { thread: { id: threadId } } }),
                }),
            );
            await expect
                .poll(() => status.mock.calls.at(-1)?.[0])
                .toBe(expected);
        };
        await select("thread-A", "failed", true);
        expect(status.mock.calls.at(-1)).toEqual(["failed", undefined]);
        await select("thread-A", "idle");
        await select("thread-B", "failed");
        await binding.connectionLost();
        const failedAt = status.mock.calls.length;
        peer.send(
            JSON.stringify(
                turnEvent("turn/started", "recovery-turn", "inProgress"),
            ),
        );
        await expect(binding.deliver(message)).rejects.toThrow("no confirmed");
        await select("thread-B", "working", false, false);
        // The state response follows the turn event on the same control socket.
        // A turn alone must not clear a connection failure before readiness returns.
        expect(status.mock.calls.slice(failedAt)).toEqual([
            ["working", "Processing the turn."],
        ]);
        await observe(
            turnEvent("turn/completed", "recovery-turn", "completed"),
            "idle",
        );

        // An async agent message is not an explicit server input request.
        for (const outcome of ["completed", "interrupted"]) {
            await observe(
                turnEvent("turn/started", "async-" + outcome, "inProgress"),
                "working",
            );
            await observe(
                {
                    method: "item/completed",
                    params: {
                        threadId: "thread-B",
                        turnId: "async-" + outcome,
                        item: {
                            id: "question",
                            type: "agentMessage",
                            delivery: "async",
                            text: "Choose a color",
                            phase: null,
                            memoryCitation: null,
                            questions: [
                                {
                                    title: "Choose a color",
                                    options: ["Red", "Blue"],
                                },
                            ],
                        },
                    },
                },
                "working",
            );
            await observe(
                turnEvent("turn/completed", "async-" + outcome, outcome),
                "idle",
            );
            expect(status.mock.calls.at(-1)).toEqual(["idle", undefined]);
            await observe(
                {
                    method: "item/completed",
                    params: {
                        threadId: "thread-B",
                        turnId: "async-" + outcome,
                        item: { id: "late-tool", type: "commandExecution" },
                    },
                },
                "idle",
            );
        }
        await observe(elicit(20, null), "awaiting-user");
        await observe(
            turnEvent("turn/started", "elicitation-turn", "inProgress"),
            "awaiting-user",
        );
        await observe(elicit(21, null), "awaiting-user");
        await observe(elicit(22, "elicitation-turn"), "awaiting-user");
        await observe(
            turnEvent("turn/completed", "elicitation-turn", "interrupted"),
            "awaiting-user",
        );
        await observe(resolve(20), "awaiting-user");

        await select("thread-A", "idle");
        await select("thread-B", "awaiting-user");
        // The same request ID in another conversation must not resolve this one.
        await observe(elicit(21, null, "thread-A"), "awaiting-user");
        await observe(resolve(21, "thread-A"), "awaiting-user");
        await observe(resolve(21), "idle");
        await observe(elicit(23, "elicitation-turn"), "idle");
        await observe(
            {
                id: 24,
                method: "item/commandExecution/requestApproval",
                params: { threadId: "thread-B", turnId: "elicitation-turn" },
            },
            "idle",
        );
        expect(
            settle.mock.calls.filter(([id]) => id === "delivery-interrupted"),
        ).toHaveLength(1);
        settle.mockRejectedValueOnce(new Error("ownership not accepted"));
        await deliverTo("thread-B", "cleanup-pending", true, "cleanup-turn");
        await expect
            .poll(
                () =>
                    settle.mock.calls.filter(([id]) => id === "cleanup-pending")
                        .length,
            )
            .toBe(1);
        settle.mockRejectedValueOnce(new Error("ownership still unavailable"));
        await expect(
            binding.cleanup("external_connection_lost"),
        ).rejects.toThrow("ownership still unavailable");
        await binding.cleanup("external_connection_lost");
        expect(
            settle.mock.calls.filter(([id]) => id === "cleanup-pending"),
        ).toEqual([
            ["cleanup-pending", "failed", "model failed"],
            ["cleanup-pending", "failed", "model failed"],
            ["cleanup-pending", "failed", "model failed"],
        ]);
        expect(
            settle.mock.calls
                .filter(([id]) => id === "delivery-B")
                .every(
                    ([, outcome, error]) =>
                        outcome === "failed" && error === "model failed",
                ),
        ).toBe(true);
        expect(
            settle.mock.calls.filter(([id]) => id === "delivery-B"),
        ).toHaveLength(2);
        expect(tui.readyState).toBe(WebSocket.OPEN);
        expect(foreground.stop).not.toHaveBeenCalled();
        const tuiClosed = once(tui, "close");
        const peerClosed = once(peer, "close");
        await run(owner.stop());
        await Promise.all([tuiClosed, peerClosed]);
        expect(foreground.stop).toHaveBeenCalledOnce();
        const unavailable = new WebSocket(launch!.args[1]!);
        const [error] = await once(unavailable, "error");
        expect(String(error)).toContain("ECONNREFUSED");
    } finally {
        tui?.terminate();
        await run(owner.stop());
        for (const client of server.clients) client.terminate();
        await new Promise<void>((r) => server.close(() => r()));
        vi.restoreAllMocks();
    }
});

test("App Server startup failure reaches the caller without leaking the MCP token or launching a TUI", async () => {
    const launchTui = vi.fn(() =>
        Effect.fail(new Error("unexpected foreground launch")),
    );
    const owner = new ExecutionOwner(launchTui);
    const stderr = new PassThrough();
    const serverExit = Deferred.makeUnsafe<{
        exitCode: number;
        signal: number | null;
    }>();
    const exited = Deferred.await(serverExit);
    const diagnostic = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const structured = vi.spyOn(logger, "error").mockImplementation(() => {});
    vi.spyOn(owner, "background").mockImplementation(() => {
        setTimeout(() => {
            stderr.write(
                "MCP rejected private-mcp-secret arbitrary-vendor-secret\n",
            );
            setTimeout(
                () =>
                    Effect.runSync(
                        Deferred.succeed(serverExit, {
                            exitCode: 1,
                            signal: null,
                        }),
                    ),
                0,
            );
        }, 0);
        return Effect.succeed({
            exited,
            stderr,
            stop: () => Effect.void,
            write() {},
            resize() {},
        });
    });
    let binding: ReturnType<typeof codexAdapter.createBinding> | undefined;
    try {
        const execution = await run(codexAdapter.createExecution(owner));
        binding = codexAdapter.createBinding(
            {
                runtimeId: "r",
                setStatus() {},
                setObservationError() {},
                settle: async () => {},
            },
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
        await expect(run(execution.start(launch, owner))).rejects.toThrow(
            "MCP rejected [redacted]",
        );
        expect(launchTui).not.toHaveBeenCalled();
        expect(structured).toHaveBeenCalledWith(
            { component: "codex", exitCode: 1, signal: null },
            "Codex App Server exited",
        );
        expect(diagnostic).not.toHaveBeenCalled();
        expect(diagnostic.mock.calls.flat().join("")).not.toContain(
            "private-mcp-secret",
        );
    } finally {
        await binding?.cleanup("execution_stopped");
        await run(owner.stop());
        vi.restoreAllMocks();
    }
});
