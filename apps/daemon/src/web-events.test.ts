import { EventEmitter } from "node:events";
import type { ServerResponse } from "node:http";

import type { WebSnapshot } from "@aiox/protocol";
import { expect, it, vi } from "vitest";

import { WebEvents } from "./web-events";
function viewer() {
    const socket = Object.assign(new EventEmitter(), {
        writeHead: vi.fn(),
        write: vi.fn(() => true),
        end: vi.fn(),
        destroy: vi.fn(() => socket.emit("close")),
    });
    return socket;
}
const empty = (): WebSnapshot => ({
    hosts: [],
    networks: [],
    panels: [],
    terminals: [],
    agents: [],
    operations: [],
    notifications: [],
});
it("sends a consistent snapshot before concurrent changes, typed state after it and faults on read failure", async () => {
    const events = new WebEvents(),
        socket = viewer();
    let current = empty(),
        release: (() => void) | undefined;
    let first = true;
    events.setSnapshot(async () => {
        const result = structuredClone(current);
        if (first) {
            first = false;
            await new Promise<void>((resolve) => {
                release = resolve;
            });
        }
        return result;
    });
    const connecting = events.connect(socket as unknown as ServerResponse);
    current.terminals.push({
        id: "t1",
        cwd: "/tmp",
        kind: "shell",
        alive: true,
    });
    events.notify();
    release!();
    await connecting;
    expect(socket.write.mock.calls[0]).toEqual([
        `event: snapshot\ndata: ${JSON.stringify(current)}\n\n`,
    ]);
    current = empty();
    events.notify();
    await vi.waitFor(() =>
        expect(socket.write).toHaveBeenCalledWith(
            'event: state\ndata: {"changes":[{"resource":"terminal","action":"remove","id":"t1"}]}\n\n',
        ),
    );
    events.setSnapshot(async () => {
        throw new Error("disk failure");
    });
    events.notify();
    await vi.waitFor(() => expect(socket.end).toHaveBeenCalledOnce());
    expect(socket.write).toHaveBeenLastCalledWith(
        'event: fault\ndata: {"code":"storage_error","message":"disk failure"}\n\n',
    );
    const failed = viewer();
    await expect(
        events.connect(failed as unknown as ServerResponse),
    ).rejects.toThrow("disk failure");
    expect(failed.writeHead).not.toHaveBeenCalled();
});
it("waits for drain on slow SSE clients while retaining healthy readers", async () => {
    const events = new WebEvents();
    let current = empty();
    events.setSnapshot(async () => current);
    const healthy = viewer(),
        slow = viewer(),
        failed = viewer();
    for (const socket of [healthy, slow, failed])
        await events.connect(socket as unknown as ServerResponse);
    slow.write.mockReturnValue(false);
    failed.write.mockImplementation(() => {
        throw new Error("socket failed");
    });
    current = {
        ...empty(),
        terminals: [{ id: "t", cwd: "/", kind: "shell", alive: true }],
    };
    events.notify();
    await vi.waitFor(() => expect(slow.write).toHaveBeenCalledTimes(2));
    expect(slow.destroy).not.toHaveBeenCalled();
    expect(failed.destroy).toHaveBeenCalledOnce();
    current = empty();
    events.notify();
    await vi.waitFor(() => expect(healthy.write).toHaveBeenCalledTimes(3));
    expect(slow.write).toHaveBeenCalledTimes(2);
    expect(failed.write).toHaveBeenCalledTimes(2);
    slow.write.mockReturnValue(true);
    slow.emit("drain");
    await vi.waitFor(() => expect(slow.write).toHaveBeenCalledTimes(3));
    expect(slow.write).toHaveBeenLastCalledWith(
        'event: state\ndata: {"changes":[{"resource":"terminal","action":"remove","id":"t"}]}\n\n',
    );
    events.close();
    expect(healthy.destroy).toHaveBeenCalledOnce();
});

it("waits for an initial snapshot to drain and releases a blocked client on close", async () => {
    const events = new WebEvents(),
        socket = viewer();
    let current = empty();
    events.setSnapshot(async () => current);
    socket.write.mockReturnValue(false);
    await events.connect(socket as unknown as ServerResponse);
    expect(socket.destroy).not.toHaveBeenCalled();
    current = {
        ...empty(),
        terminals: [{ id: "t", cwd: "/", kind: "shell", alive: true }],
    };
    events.notify();
    await new Promise((resolve) => setImmediate(resolve));
    expect(socket.write).toHaveBeenCalledTimes(1);
    socket.emit("drain");
    await vi.waitFor(() => expect(socket.write).toHaveBeenCalledTimes(2));
    socket.emit("close");
    socket.emit("drain");
    events.notify();
    await new Promise((resolve) => setImmediate(resolve));
    expect(socket.write).toHaveBeenCalledTimes(2);
    events.close();
});
