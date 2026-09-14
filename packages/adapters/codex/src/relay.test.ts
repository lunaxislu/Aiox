import { once } from "node:events";

import { afterEach, expect, test } from "vitest";
import { WebSocket, WebSocketServer } from "ws";

import { createRelay } from "./relay";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
    for (const close of cleanups.splice(0).reverse()) await close();
});

test("tracks only successful TUI thread responses and control loss leaves the TUI connected", async () => {
    const upstream = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await once(upstream, "listening");
    cleanups.push(async () => {
        for (const c of upstream.clients) c.terminate();
        await new Promise<void>((r) => upstream.close(() => r()));
    });
    const address = upstream.address();
    if (typeof address === "string" || !address) throw new Error("no address");
    const relay = await createRelay();
    cleanups.push(() => relay.close());
    relay.setUpstream(`ws://127.0.0.1:${address.port}`, "upstream-token");
    const control = new WebSocket(relay.connection.url + "/control", {
        headers: { Authorization: `Bearer ${relay.connection.token}` },
    });
    await once(control, "open");
    const connected = once(upstream, "connection");
    const tui = new WebSocket(relay.connection.url, {
        headers: { Authorization: `Bearer ${relay.tuiToken}` },
    });
    await once(tui, "open");
    const [server] = await connected;
    const exchange = async (
        method: string,
        result: object,
        params: object = {},
    ) => {
        const request = once(server, "message");
        tui.send(JSON.stringify({ id: 1, method, params }));
        await request;
        const response = once(tui, "message");
        server.send(JSON.stringify({ id: 1, ...result }));
        await response;
    };
    await exchange("thread/start", { result: { thread: { id: "A" } } });
    expect(relay.activeThreadId).toBe("A");
    await exchange(
        "thread/start",
        { result: { thread: { id: "helper" } } },
        { ephemeral: true, threadSource: "system" },
    );
    expect(relay.activeThreadId).toBe("A");
    const observed = new Promise<any>((resolve) =>
        control.on("message", (raw) => {
            const event = JSON.parse(raw.toString());
            if (event.type === "event") resolve(event);
        }),
    );
    server.send(
        JSON.stringify({
            method: "turn/started",
            params: { threadId: "A", turn: { id: "turn" } },
        }),
    );
    expect((await observed).params.turn.id).toBe("turn");
    await exchange(
        "thread/start",
        { result: { thread: { id: "ephemeral-user" } } },
        { ephemeral: true, threadSource: "user" },
    );
    expect(relay.activeThreadId).toBe("ephemeral-user");
    await exchange("thread/resume", { error: { message: "no" } });
    expect(relay.activeThreadId).toBe("ephemeral-user");
    await exchange("thread/fork", { result: { thread: { id: "B" } } });
    expect(relay.activeThreadId).toBe("B");
    const closed = once(control, "close");
    control.close();
    await closed;
    await exchange("thread/start", { result: { thread: { id: "C" } } });
    expect(relay.activeThreadId).toBe("C");
    const ended = once(tui, "close");
    tui.close();
    await ended;
    await expect.poll(() => relay.activeThreadId).toBeNull();
});

test("rejects unauthenticated clients and rejects delivery while a thread switch is pending", async () => {
    const upstream = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await once(upstream, "listening");
    cleanups.push(async () => {
        for (const s of upstream.clients) s.terminate();
        await new Promise<void>((r) => upstream.close(() => r()));
    });
    const address = upstream.address();
    if (!address || typeof address === "string") throw new Error("address");
    const relay = await createRelay();
    cleanups.push(() => relay.close());
    relay.setUpstream(`ws://127.0.0.1:${address.port}`, "token");
    const denied = new WebSocket(relay.connection.url);
    denied.on("error", () => {});
    const [error] = await once(denied, "error");
    expect(String(error)).toContain("401");
    const control = new WebSocket(relay.connection.url + "/control", {
        headers: { Authorization: `Bearer ${relay.connection.token}` },
    });
    await once(control, "open");
    const connected = once(upstream, "connection");
    const tui = new WebSocket(relay.connection.url, {
        headers: { Authorization: `Bearer ${relay.tuiToken}` },
    });
    await once(tui, "open");
    const [peer] = await connected;
    let request = once(peer, "message");
    tui.send(JSON.stringify({ id: 1, method: "thread/start", params: {} }));
    await request;
    const response = once(tui, "message");
    peer.send(JSON.stringify({ id: 1, result: { thread: { id: "A" } } }));
    await response;
    request = once(peer, "message");
    tui.send(
        JSON.stringify({
            id: 2,
            method: "thread/resume",
            params: { threadId: "B" },
        }),
    );
    await request;
    const received = new Promise<any>((resolve) =>
        control.on("message", (data) => {
            const frame = JSON.parse(data.toString());
            if (frame.type === "response") resolve(frame);
        }),
    );
    control.send(
        JSON.stringify({
            type: "deliver",
            id: "delivery",
            params: { input: [] },
        }),
    );
    expect((await received).error).toContain("no confirmed");
    tui.terminate();
    control.terminate();
});

test("preserves AIOX instructions when TUI fork overrides developer instructions", async () => {
    const upstream = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await once(upstream, "listening");
    cleanups.push(async () => {
        for (const s of upstream.clients) s.terminate();
        await new Promise<void>((r) => upstream.close(() => r()));
    });
    const address = upstream.address();
    if (!address || typeof address === "string") throw new Error("address");
    const relay = await createRelay();
    cleanups.push(() => relay.close());
    relay.setUpstream(
        `ws://127.0.0.1:${address.port}`,
        "token",
        "AIOX cooperation",
    );
    const connected = once(upstream, "connection");
    const tui = new WebSocket(relay.connection.url, {
        headers: { Authorization: `Bearer ${relay.tuiToken}` },
    });
    await once(tui, "open");
    const [peer] = await connected;
    const request = once(peer, "message");
    tui.send(
        JSON.stringify({
            id: 1,
            method: "thread/fork",
            params: {
                threadId: "A",
                developerInstructions: "TUI visual instructions",
            },
        }),
    );
    const [raw] = await request;
    const message = JSON.parse(raw.toString());
    expect(message.params.developerInstructions).toBe(
        "TUI visual instructions\n\nAIOX cooperation",
    );
    tui.terminate();
});

test("picker connections isolate request IDs and closing them preserves the active delivery connection", async () => {
    const upstream = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await once(upstream, "listening");
    cleanups.push(async () => {
        for (const client of upstream.clients) client.terminate();
        await new Promise<void>((resolve) => upstream.close(() => resolve()));
    });
    const address = upstream.address();
    if (!address || typeof address === "string") throw new Error("no address");
    const relay = await createRelay();
    cleanups.push(() => relay.close());
    relay.setUpstream(`ws://127.0.0.1:${address.port}`, "token");
    const connect = async () => {
        const connected = once(upstream, "connection");
        const client = new WebSocket(relay.connection.url, {
            headers: { Authorization: `Bearer ${relay.tuiToken}` },
        });
        await once(client, "open");
        const [peer] = await connected;
        return { client, peer: peer as WebSocket };
    };
    const main = await connect();
    const exchange = async (
        pair: typeof main,
        method: string,
        result: object,
    ) => {
        const request = once(pair.peer, "message");
        pair.client.send(JSON.stringify({ id: 1, method, params: {} }));
        await request;
        const response = once(pair.client, "message");
        pair.peer.send(JSON.stringify({ id: 1, result }));
        await response;
    };
    await exchange(main, "thread/start", { thread: { id: "A" } });
    const picker = await connect();
    const request = once(main.peer, "message");
    main.client.send(
        JSON.stringify({
            id: 1,
            method: "thread/resume",
            params: { threadId: "B" },
        }),
    );
    await request;
    await exchange(picker, "thread/list", { thread: { id: "wrong" } });
    expect(relay.activeThreadId).toBe("A");
    const response = once(main.client, "message");
    main.peer.send(JSON.stringify({ id: 1, result: { thread: { id: "B" } } }));
    await response;
    expect(relay.activeThreadId).toBe("B");
    const closed = once(picker.peer, "close");
    picker.client.close();
    await closed;
    expect(relay.activeThreadId).toBe("B");
    const control = new WebSocket(relay.connection.url + "/control", {
        headers: { Authorization: `Bearer ${relay.connection.token}` },
    });
    await once(control, "open");
    const delivered = once(main.peer, "message");
    control.send(
        JSON.stringify({ type: "deliver", id: "probe", params: { input: [] } }),
    );
    const [raw] = await delivered;
    const message = JSON.parse(raw.toString());
    expect(message.params.threadId).toBe("B");
    const accepted = once(control, "message");
    main.peer.send(JSON.stringify({ id: message.id, result: {} }));
    await accepted;
    const replacement = await connect();
    await exchange(replacement, "thread/resume", { thread: { id: "C" } });
    const mainClosed = once(main.peer, "close");
    main.client.close();
    await mainClosed;
    expect(relay.activeThreadId).toBe("C");
    const nextDelivery = once(replacement.peer, "message");
    control.send(
        JSON.stringify({ type: "deliver", id: "next", params: { input: [] } }),
    );
    const [nextRaw] = await nextDelivery;
    expect(JSON.parse(nextRaw.toString()).params.threadId).toBe("C");
    const auxiliary = await connect();
    const replacementClosed = once(replacement.peer, "close");
    replacement.client.close();
    await replacementClosed;
    expect(relay.activeThreadId).toBeNull();
    const auxiliaryClosed = once(auxiliary.client, "close");
    const auxiliaryPeerClosed = once(auxiliary.peer, "close");
    const controlClosed = once(control, "close");
    await cleanups.pop()!();
    await Promise.all([auxiliaryClosed, auxiliaryPeerClosed, controlClosed]);
    const unavailable = new WebSocket(relay.connection.url);
    const [error] = await once(unavailable, "error");
    expect(String(error)).toContain("ECONNREFUSED");
});
