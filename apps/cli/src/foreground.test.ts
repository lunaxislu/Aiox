import { EventEmitter } from "node:events";
import { once } from "node:events";

import { expect, test, vi } from "vitest";
import { WebSocket, WebSocketServer } from "ws";

import { runForeground } from "./foreground";

function streams(raw = false) {
    const input = Object.assign(new EventEmitter(), {
        isTTY: true,
        isRaw: raw,
        setRawMode: vi.fn(),
        resume: vi.fn(),
        pause: vi.fn(),
    });
    const output = Object.assign(new EventEmitter(), {
        columns: 100,
        rows: 30,
        write: vi.fn(() => true),
    });
    const socket = Object.assign(new EventEmitter(), {
        OPEN: 1,
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(function () {
            socket.emit("close");
        }),
    });
    return { input, output, socket };
}

test("relays raw bytes and resize, then restores the terminal on confirmed exit", async () => {
    const { input, output, socket } = streams();
    const result = runForeground(socket as unknown as WebSocket, input, output);
    expect(input.setRawMode).toHaveBeenCalledWith(true);
    expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "resize", cols: 100, rows: 30 }),
    );
    const ctrlC = Buffer.from([3]);
    input.emit("data", ctrlC);
    expect(socket.send).toHaveBeenLastCalledWith(ctrlC, { binary: true });
    const bytes = Buffer.from([0x1b, 0x5b, 0x32, 0x4a, 0xff]);
    socket.emit("message", bytes, true);
    expect(output.write).toHaveBeenCalledWith(bytes);
    output.columns = 80;
    output.emit("resize");
    expect(socket.send).toHaveBeenLastCalledWith(
        JSON.stringify({ type: "resize", cols: 80, rows: 30 }),
    );
    socket.emit(
        "message",
        Buffer.from('{"type":"exit","exitCode":7,"signal":null}'),
        false,
    );
    await expect(result).resolves.toEqual({ exitCode: 7, signal: null });
    expect(input.setRawMode).toHaveBeenLastCalledWith(false);
    expect(input.pause).toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalledOnce();
    expect(input.listenerCount("data")).toBe(0);
    expect(output.listenerCount("resize")).toBe(0);
});

test.each(["close", "error", "end", "malformed"])(
    "reports %s without inventing an exit and preserves an already raw terminal",
    async (event) => {
        const { input, output, socket } = streams(true);
        const result = runForeground(
            socket as unknown as WebSocket,
            input,
            output,
        );
        const rejected = expect(result).rejects.toThrow();
        if (event === "end") input.emit("end");
        else if (event === "malformed")
            socket.emit(
                "message",
                Buffer.from('{"type":"exit","exitCode":"0","signal":null}'),
                false,
            );
        else socket.emit(event, new Error("connection failed"));
        await rejected;
        expect(input.setRawMode).toHaveBeenLastCalledWith(true);
        expect(input.eventNames()).toEqual([]);
        expect(output.eventNames()).toEqual([]);
        expect(socket.eventNames()).toEqual([]);
    },
);

test("does not enter raw mode when the connection is not open", async () => {
    const { input, output, socket } = streams();
    socket.readyState = 3;
    await expect(
        runForeground(socket as unknown as WebSocket, input, output),
    ).rejects.toThrow("not open");
    expect(input.setRawMode).not.toHaveBeenCalled();
    expect(socket.eventNames()).toEqual([]);
});

test("reports a daemon startup or cleanup failure without hiding its message", async () => {
    const { input, output, socket } = streams();
    const result = runForeground(socket as unknown as WebSocket, input, output);
    socket.emit(
        "message",
        Buffer.from(
            '{"type":"error","message":"Vendor cleanup remains unconfirmed."}',
        ),
        false,
    );
    await expect(result).rejects.toThrow("Vendor cleanup remains unconfirmed.");
    expect(input.setRawMode).toHaveBeenLastCalledWith(false);
});

test("absorbs closing-handshake errors until close completes", async () => {
    const { input, output, socket } = streams();
    socket.close.mockImplementation(() => {});
    const result = runForeground(socket as unknown as WebSocket, input, output);
    socket.emit(
        "message",
        Buffer.from('{"type":"exit","exitCode":0,"signal":null}'),
        false,
    );
    await expect(result).resolves.toEqual({ exitCode: 0, signal: null });
    expect(() =>
        socket.emit("error", new Error("late connection reset")),
    ).not.toThrow();
    socket.emit("close");
    expect(socket.eventNames()).toEqual([]);
});

test.each(["restore", "close"])(
    "rejects a %s error without leaving the foreground promise pending",
    async (operation) => {
        const { input, output, socket } = streams();
        const result = runForeground(
            socket as unknown as WebSocket,
            input,
            output,
        );
        if (operation === "restore")
            input.setRawMode.mockImplementation(() => {
                throw new Error("restore failed");
            });
        else
            socket.close.mockImplementation(() => {
                throw new Error("close failed");
            });
        socket.emit(
            "message",
            Buffer.from('{"type":"exit","exitCode":0,"signal":null}'),
            false,
        );
        await expect(result).rejects.toThrow(`${operation} failed`);
        socket.emit("close");
    },
);

test("uses real WebSocket binary and resize frames and waits for confirmed exit", async () => {
    const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await once(server, "listening");
    const address = server.address();
    if (typeof address === "string" || !address)
        throw new Error("No listener address");
    const connected = once(server, "connection");
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}`);
    await once(socket, "open");
    const [peer] = (await connected) as [WebSocket];
    const { input, output } = streams();
    try {
        const resized = once(peer, "message");
        const result = runForeground(socket, input, output);
        const [size, binary] = await resized;
        expect(binary).toBe(false);
        expect(JSON.parse(size.toString())).toEqual({
            type: "resize",
            cols: 100,
            rows: 30,
        });
        const received = once(peer, "message");
        input.emit("data", Buffer.from([3]));
        const [data, isBinary] = await received;
        expect(isBinary).toBe(true);
        expect(data).toEqual(Buffer.from([3]));
        peer.send(Buffer.from("screen"));
        peer.send(JSON.stringify({ type: "exit", exitCode: 0, signal: null }));
        await expect(result).resolves.toEqual({ exitCode: 0, signal: null });
        expect(output.write).toHaveBeenCalledWith(Buffer.from("screen"));
        expect(input.setRawMode).toHaveBeenLastCalledWith(false);
    } finally {
        socket.terminate();
        peer.terminate();
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
});
