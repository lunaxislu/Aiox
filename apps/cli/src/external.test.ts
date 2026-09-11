import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";

import type { VendorAdapter } from "@aiox/vendor";
import { expect, test, vi } from "vitest";
import type { WebSocket } from "ws";

import { runExternal } from "./external";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

function launch(withHelper = false, waitForHelper = false) {
    vi.mocked(spawn).mockReset();
    const dispose = vi.fn(async () => {});
    const adapter = {
        id: "other-vendor",
        async createExecution(owner) {
            await owner.own(dispose);
            return {
                connection: { endpoint: "local" },
                start: async (launch, executionOwner) => {
                    const command = launch as {
                        file: string;
                        args: string[];
                        cwd: string;
                        env: Record<string, string>;
                    };
                    if (withHelper)
                        await executionOwner.background({
                            ...command,
                            file: "helper",
                        });
                    if (waitForHelper) {
                        executionOwner.signal.throwIfAborted();
                        await new Promise<void>((_resolve, reject) => {
                            executionOwner.signal.addEventListener(
                                "abort",
                                () => reject(executionOwner.signal.reason),
                                { once: true },
                            );
                        });
                    }
                    return executionOwner.foreground(command);
                },
            };
        },
        createBinding() {
            throw new Error("CLI never creates a daemon binding");
        },
    } satisfies VendorAdapter;
    const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(() => true),
        exitCode: null,
        signalCode: null,
    });
    const helper = Object.assign(new EventEmitter(), {
        kill: vi.fn(() => {
            queueMicrotask(() => helper.emit("exit", null, "SIGTERM"));
            return true;
        }),
    });
    if (withHelper)
        vi.mocked(spawn).mockImplementationOnce(() => {
            queueMicrotask(() => helper.emit("spawn"));
            return helper as unknown as ReturnType<typeof spawn>;
        });
    vi.mocked(spawn).mockImplementationOnce(() => {
        queueMicrotask(() => child.emit("spawn"));
        return child as unknown as ReturnType<typeof spawn>;
    });
    const socket = Object.assign(new EventEmitter(), {
        OPEN: 1,
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        terminate: vi.fn(),
    });
    const input = {
        adapter: "other-vendor",
        cwd: "/workspace",
        env: { PATH: "/bin" },
        args: [],
    };
    const result = runExternal(socket as unknown as WebSocket, input, adapter);
    const frame = (data: unknown) =>
        socket.emit("message", Buffer.from(JSON.stringify(data)), false);
    const prepared = () =>
        frame({
            type: "prepared",
            launch: {
                file: "other-vendor",
                cwd: "/workspace",
                args: ["--model", "example"],
                env: { PATH: "/bin", AIOX_MCP_TOKEN: "private" },
            },
        });
    return { child, helper, socket, input, result, frame, prepared, dispose };
}

test("inherits vendor stdio and keeps the child and inbox after daemon connection loss", async () => {
    const h = launch();
    const diagnostic = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
        await vi.waitFor(() => expect(h.socket.send).toHaveBeenCalled());
        h.prepared();
        await vi.waitFor(() =>
            expect(h.socket.send).toHaveBeenCalledWith(
                JSON.stringify({ type: "started" }),
            ),
        );
        expect(spawn).toHaveBeenLastCalledWith(
            "other-vendor",
            ["--model", "example"],
            expect.objectContaining({
                cwd: "/workspace",
                stdio: "inherit",
                env: expect.objectContaining({ AIOX_MCP_TOKEN: "private" }),
            }),
        );
        h.frame({ type: "ready" });
        h.socket.readyState = 3;
        h.socket.emit("close");
        expect(h.child.kill).not.toHaveBeenCalled();
        expect(h.dispose).not.toHaveBeenCalled();
        h.child.emit("exit", 7, null);
        await expect(h.result).resolves.toEqual({ exitCode: 7, signal: null });
        expect(h.dispose).toHaveBeenCalledOnce();
    } finally {
        diagnostic.mockRestore();
    }
});

test("an explicit initial preparation failure terminates the child and reports failure", async () => {
    const h = launch();
    const diagnostic = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
        await vi.waitFor(() => expect(h.socket.send).toHaveBeenCalled());
        h.prepared();
        await vi.waitFor(() =>
            expect(h.socket.send).toHaveBeenCalledWith(
                JSON.stringify({ type: "started" }),
            ),
        );
        const failed = expect(h.result).rejects.toThrow(
            "Inbox preparation timed out.",
        );
        h.frame({
            type: "startup-failed",
            message: "Inbox preparation timed out.",
        });
        await vi.waitFor(() =>
            expect(h.child.kill).toHaveBeenCalledWith("SIGTERM"),
        );
        expect(h.dispose).not.toHaveBeenCalled();
        h.child.emit("exit", null, "SIGTERM");
        h.frame({ type: "exit", exitCode: 0, signal: 15 });
        await failed;
        expect(h.dispose).toHaveBeenCalledOnce();
    } finally {
        diagnostic.mockRestore();
    }
});

test("a late startup failure cannot terminate an already ready vendor", async () => {
    const h = launch();
    const diagnostic = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
        await vi.waitFor(() => expect(h.socket.send).toHaveBeenCalled());
        h.prepared();
        await vi.waitFor(() =>
            expect(h.socket.send).toHaveBeenCalledWith(
                JSON.stringify({ type: "started" }),
            ),
        );
        h.frame({ type: "ready" });
        h.frame({ type: "startup-failed", message: "late failure" });
        expect(h.child.kill).not.toHaveBeenCalled();
        h.child.emit("exit", 0, null);
        await expect(h.result).resolves.toEqual({ exitCode: 0, signal: null });
    } finally {
        diagnostic.mockRestore();
    }
});

test("buffered frames after a lost connection cannot terminate an unready vendor", async () => {
    const h = launch();
    const diagnostic = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
        await vi.waitFor(() => expect(h.socket.send).toHaveBeenCalled());
        h.prepared();
        await vi.waitFor(() =>
            expect(h.socket.send).toHaveBeenCalledWith(
                JSON.stringify({ type: "started" }),
            ),
        );
        h.frame({ type: "resize", cols: 80, rows: 24 });
        h.frame({ type: "startup-failed", message: "buffered failure" });
        expect(h.child.kill).not.toHaveBeenCalled();
        h.child.emit("exit", 0, null);
        await expect(h.result).resolves.toEqual({ exitCode: 0, signal: null });
    } finally {
        diagnostic.mockRestore();
    }
});

test("returns the vendor result even when registration cleanup never acknowledges exit", async () => {
    const h = launch();
    const diagnostic = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
        await vi.waitFor(() => expect(h.socket.send).toHaveBeenCalled());
        h.prepared();
        await vi.waitFor(() =>
            expect(h.socket.send).toHaveBeenCalledWith(
                JSON.stringify({ type: "started" }),
            ),
        );
        h.frame({ type: "ready" });
        vi.useFakeTimers();
        h.child.emit("exit", 7, null);
        await vi.advanceTimersByTimeAsync(1500);
        await expect(h.result).resolves.toEqual({ exitCode: 7, signal: null });
        expect(diagnostic).toHaveBeenCalledWith(
            expect.stringContaining("cleanup was not acknowledged"),
        );
        expect(h.dispose).toHaveBeenCalledOnce();
    } finally {
        vi.useRealTimers();
        diagnostic.mockRestore();
    }
});

test("a second vendor keeps its helper and foreground after connection loss and disposes both on exit", async () => {
    const h = launch(true);
    const diagnostic = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
        await vi.waitFor(() => expect(h.socket.send).toHaveBeenCalled());
        expect(JSON.parse(h.socket.send.mock.calls[0]![0])).toMatchObject({
            connection: { endpoint: "local" },
            adapter: "other-vendor",
        });
        h.prepared();
        await vi.waitFor(() =>
            expect(h.socket.send).toHaveBeenCalledWith(
                JSON.stringify({ type: "started" }),
            ),
        );
        h.frame({ type: "ready" });
        h.socket.readyState = 3;
        h.socket.emit("close");
        expect(h.helper.kill).not.toHaveBeenCalled();
        expect(h.child.kill).not.toHaveBeenCalled();
        expect(h.dispose).not.toHaveBeenCalled();
        h.child.emit("exit", 7, null);
        await expect(h.result).resolves.toEqual({ exitCode: 7, signal: null });
        expect(h.helper.kill).toHaveBeenCalledWith("SIGTERM");
        expect(h.dispose).toHaveBeenCalledOnce();
    } finally {
        diagnostic.mockRestore();
    }
});

test("socket closure before its close event preserves an unready vendor's exit result", async () => {
    const h = launch();
    await vi.waitFor(() => expect(h.socket.send).toHaveBeenCalled());
    h.prepared();
    await vi.waitFor(() =>
        expect(h.socket.send).toHaveBeenCalledWith(
            JSON.stringify({ type: "started" }),
        ),
    );
    h.socket.readyState = 3;
    h.child.emit("exit", 7, null);
    await expect(h.result).resolves.toEqual({ exitCode: 7, signal: null });
});

test("startup failure while a helper is preparing cancels startup and cleans its resources", async () => {
    const h = launch(true, true);
    const diagnostic = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
        await vi.waitFor(() => expect(h.socket.send).toHaveBeenCalled());
        h.prepared();
        await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
        const failed = expect(h.result).rejects.toThrow(
            "helper preparation failed",
        );
        h.frame({
            type: "startup-failed",
            message: "helper preparation failed",
        });
        await failed;
        expect(h.helper.kill).toHaveBeenCalledWith("SIGTERM");
        expect(h.child.kill).not.toHaveBeenCalled();
        expect(spawn).toHaveBeenCalledOnce();
        expect(h.dispose).toHaveBeenCalledOnce();
    } finally {
        diagnostic.mockRestore();
    }
});
