import { webStateSchema, type WebSnapshot } from "@aiox/protocol";
import { Hono } from "hono";
import { expect, it, vi } from "vitest";

import { WebEvents } from "./web-events";

const empty = (): WebSnapshot => ({
    hosts: [],
    networks: [],
    panels: [],
    terminals: [],
    agents: [],
    operations: [],
    notifications: [],
});
async function viewer(events: WebEvents) {
    const app = new Hono();
    app.get("/events", (c) => events.connect(c));
    app.onError((error) => new Response(error.message, { status: 500 }));
    return app.request("/events");
}
const text = (value: { value?: Uint8Array; done: boolean }) =>
    new TextDecoder().decode(value.value);

it("does not reread unchanged state just because a write finished", async () => {
    const events = new WebEvents();
    const current = empty();
    const read = vi.fn(async () => structuredClone(current));
    events.setSnapshot(read);
    const reader = (await viewer(events)).body!.getReader();
    try {
        expect(text(await reader.read())).toContain("event: snapshot");
        await new Promise((resolve) => setImmediate(resolve));
        expect(read).toHaveBeenCalledTimes(1);
        const release = events.beginUpdate();
        current.terminals.push({
            id: "t",
            cwd: "/tmp",
            kind: "shell",
            alive: true,
        });
        release();
        expect(text(await reader.read())).toContain("event: state");
        await new Promise((resolve) => setImmediate(resolve));
        expect(read).toHaveBeenCalledTimes(2);
    } finally {
        events.close();
        await reader.cancel();
    }
});

it("coalesces a synchronous burst before reading the database", async () => {
    const events = new WebEvents();
    const current = empty();
    const read = vi.fn(async () => structuredClone(current));
    events.setSnapshot(read);
    const reader = (await viewer(events)).body!.getReader();
    try {
        await reader.read();
        await new Promise((resolve) => setImmediate(resolve));
        read.mockClear();
        for (let i = 0; i < 200; i++) {
            current.terminals.push({
                id: `t${i}`,
                cwd: "/tmp",
                kind: "shell",
                alive: true,
            });
            events.notify();
        }
        expect(text(await reader.read())).toContain('"id":"t199"');
        await new Promise((resolve) => setImmediate(resolve));
        expect(read).toHaveBeenCalledTimes(1);
    } finally {
        events.close();
        await reader.cancel();
    }
});

it("shares deltas only for equal baselines and lets blocked clients catch up", async () => {
    const events = new WebEvents();
    let current = empty();
    events.setSnapshot(async () => structuredClone(current));
    const readers = await Promise.all(
        Array.from({ length: 4 }, async () =>
            (await viewer(events)).body!.getReader(),
        ),
    );
    const parse = vi.spyOn(webStateSchema, "parse");
    try {
        await Promise.all(readers.map((reader) => reader.read()));
        await new Promise((resolve) => setImmediate(resolve));
        current.terminals.push({
            id: "t",
            cwd: "/tmp",
            kind: "shell",
            alive: true,
        });
        events.notify();
        await Promise.all(readers.map((reader) => reader.read()));
        await new Promise((resolve) => setImmediate(resolve));
        parse.mockClear();
        current = empty();
        events.notify();
        const frames = await Promise.all(
            readers.map(async (reader) => text(await reader.read())),
        );
        expect(new Set(frames).size).toBe(1);
        expect(frames[0]).toContain('"action":"remove"');
        expect(parse).toHaveBeenCalledTimes(1);
        // A new connection has an independent baseline and must still start with snapshot.
        const late = (await viewer(events)).body!.getReader();
        readers.push(late);
        current.terminals.push({
            id: "new",
            cwd: "/tmp",
            kind: "shell",
            alive: true,
        });
        events.notify();
        await Promise.all(readers.slice(0, 4).map((reader) => reader.read()));
        expect(text(await late.read())).toContain(
            'event: snapshot\ndata: {"hosts":[],"networks":[],"panels":[],"terminals":[]',
        );
        expect(text(await late.read())).toContain('"id":"new"');
    } finally {
        parse.mockRestore();
        events.close();
        await Promise.all(readers.map((reader) => reader.cancel()));
    }
});
it("sends a consistent snapshot before concurrent changes and faults on read failure", async () => {
    const events = new WebEvents();
    let current = empty(),
        release!: () => void;
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
    const connecting = viewer(events);
    current.terminals.push({
        id: "t1",
        cwd: "/tmp",
        kind: "shell",
        alive: true,
    });
    events.notify();
    release();
    const response = await connecting;
    const reader = response.body!.getReader();
    expect(text(await reader.read())).toBe(
        `event: snapshot\ndata: ${JSON.stringify(current)}\n\n`,
    );
    current = empty();
    events.notify();
    expect(text(await reader.read())).toBe(
        'event: state\ndata: {"changes":[{"resource":"terminal","action":"remove","id":"t1"}]}\n\n',
    );
    events.setSnapshot(async () => {
        throw new Error("disk failure");
    });
    events.notify();
    expect(text(await reader.read())).toBe(
        'event: fault\ndata: {"code":"storage_error","message":"disk failure"}\n\n',
    );
    expect((await reader.read()).done).toBe(true);
    const failed = await viewer(events);
    expect(failed.status).toBe(500);
    expect(await failed.text()).toBe("disk failure");
    events.close();
});
it("coalesces a slow reader's state while healthy readers progress and cleans up on cancel", async () => {
    const events = new WebEvents();
    let current = empty();
    const snapshot = vi.fn(async () => structuredClone(current));
    events.setSnapshot(snapshot);
    const healthy = (await viewer(events)).body!.getReader();
    const slow = (await viewer(events)).body!.getReader();
    await healthy.read();
    await slow.read();
    current.terminals.push({ id: "t", cwd: "/", kind: "shell", alive: true });
    events.notify();
    expect(text(await healthy.read())).toContain('"action":"upsert"');
    current = empty();
    events.notify();
    expect(text(await healthy.read())).toContain('"action":"remove"');
    expect(text(await slow.read())).toContain('"action":"upsert"');
    expect(text(await slow.read())).toContain('"action":"remove"');
    await slow.cancel();
    await healthy.cancel();
    const calls = snapshot.mock.calls.length;
    events.notify();
    await new Promise((resolve) => setImmediate(resolve));
    expect(snapshot).toHaveBeenCalledTimes(calls);
    events.close();
});
it("reconnects during initial synchronization and releases pending writers on daemon close", async () => {
    const events = new WebEvents();
    let current = empty();
    events.setSnapshot(async () => structuredClone(current));
    const release = events.beginUpdate();
    let connected = false;
    const connecting = viewer(events).then((response) => {
        connected = true;
        return response;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(connected).toBe(false);
    current.terminals.push({
        id: "initial",
        cwd: "/",
        kind: "shell",
        alive: true,
    });
    release();
    const initial = (await connecting).body!.getReader();
    expect(text(await initial.read())).toContain('"id":"initial"');
    await initial.cancel();
    const reconnect = (await viewer(events)).body!.getReader();
    expect(text(await reconnect.read())).toContain('"id":"initial"');
    const closing = reconnect.read();
    events.close();
    expect((await closing).done).toBe(true);
});
