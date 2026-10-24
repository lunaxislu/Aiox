import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { connect, createServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, expect, it, vi } from "vitest";

import { writeClaudeInbox } from "@/claude-inbox";

vi.mock("node:net", async (original) => {
    const net = await original<typeof import("node:net")>();
    return { ...net, connect: vi.fn(net.connect) };
});

afterEach(() => {
    vi.mocked(connect).mockClear();
    vi.useRealTimers();
});

it.each([undefined, '안녕하세요\n"body" 😀'])(
    "writes auth first and optional content on the actual platform transport",
    async (content) => {
        const directory = await mkdtemp(join(tmpdir(), "ai-"));
        const path = join(directory, "inbox.sock");
        let resolve!: (body: string) => void;
        const received = new Promise<string>((done) => {
            resolve = done;
        });
        const server = createServer((socket) => {
            let body = "";
            socket.setEncoding("utf8");
            socket.on("data", (chunk) => {
                body += chunk;
            });
            socket.on("end", () => resolve(body));
        });
        await new Promise<void>((done) => server.listen(path, done));
        try {
            await writeClaudeInbox(path, 'secr"et\n雪', content);
            const lines = (await received)
                .trimEnd()
                .split("\n")
                .map((line) => JSON.parse(line));
            expect(lines).toEqual([
                { type: "auth", token: 'secr"et\n雪' },
                ...(content === undefined
                    ? []
                    : [{ type: "user", message: { role: "user", content } }]),
            ]);
        } finally {
            await new Promise<void>((done) => server.close(() => done()));
            await rm(directory, { recursive: true, force: true });
        }
    },
);

it("rejects unavailable transport without echoing its path or token", async () => {
    await expect(
        writeClaudeInbox("secret-invalid-path", "secret-token", "body"),
    ).rejects.toThrow(/^Claude inbox connection failed \(ENOENT\)\.$/);
    expect(connect).toHaveBeenCalledTimes(1);
});

it("rejects an empty credential before connecting", async () => {
    await expect(writeClaudeInbox("path", "")).rejects.toThrow(
        "Claude inbox credential is missing.",
    );
    expect(connect).not.toHaveBeenCalled();
});

function stalledSocket() {
    const socket = Object.assign(new EventEmitter(), {
        write: vi.fn(),
        destroy: vi.fn(),
    });
    vi.mocked(connect).mockReturnValueOnce(socket as unknown as Socket);
    return socket;
}

it("rejects close before write completion and destroys its handle", async () => {
    const socket = stalledSocket();
    const result = expect(
        writeClaudeInbox("path", "secret-token"),
    ).rejects.toThrow("Claude inbox closed before write completion.");
    socket.emit("connect");
    socket.emit("close");
    await result;
    expect(socket.destroy).toHaveBeenCalledTimes(1);
});

it("bounds stalled connections without retrying", async () => {
    vi.useFakeTimers();
    const socket = stalledSocket();
    const result = expect(
        writeClaudeInbox("path", "secret-token"),
    ).rejects.toThrow("Claude inbox connection timed out.");
    await vi.advanceTimersByTimeAsync(2000);
    await result;
    expect(socket.destroy).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1);
});

it("sanitizes a synchronous write failure and cleans up", async () => {
    const socket = stalledSocket();
    socket.write.mockImplementationOnce(() => {
        throw new Error("secret-token");
    });
    const result = expect(
        writeClaudeInbox("path", "secret-token"),
    ).rejects.toThrow("Claude inbox write failed.");
    socket.emit("connect");
    await result;
    expect(socket.destroy).toHaveBeenCalledTimes(1);
});
