import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";

import {
    createClaudeInbox,
    probeClaude,
} from "@aiox/daemon/claude-environment";
import { expect, test, vi } from "vitest";
import type { WebSocket } from "ws";

import { runExternal } from "./external";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
vi.mock("@aiox/daemon/claude-environment", () => ({
    createClaudeInbox: vi.fn(),
    probeClaude: vi.fn(async () => "2.1.268"),
}));

function launch() {
    const dispose = vi.fn(async () => {});
    vi.mocked(createClaudeInbox).mockResolvedValueOnce({
        path: "/tmp/ax-test/inbox.sock",
        dispose,
    });
    const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(() => true),
        exitCode: null,
        signalCode: null,
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
        adapter: "claude" as const,
        cwd: "/workspace",
        env: { PATH: "/bin" },
        args: [],
    };
    const result = runExternal(socket as unknown as WebSocket, input);
    const frame = (data: unknown) =>
        socket.emit("message", Buffer.from(JSON.stringify(data)), false);
    const prepared = () =>
        frame({
            type: "prepared",
            runtimeId: "r",
            args: ["--model", "sonnet"],
            env: { PATH: "/bin", AIOX_MCP_TOKEN: "private" },
        });
    return { child, socket, input, result, frame, prepared, dispose };
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
            "claude",
            ["--model", "sonnet"],
            expect.objectContaining({
                cwd: "/workspace",
                stdio: "inherit",
                env: expect.objectContaining({ AIOX_MCP_TOKEN: "private" }),
            }),
        );
        expect(probeClaude).toHaveBeenLastCalledWith(
            "claude",
            expect.objectContaining({ PATH: "/bin" }),
            "/workspace",
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
        expect(h.child.kill).toHaveBeenCalledWith("SIGTERM");
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
