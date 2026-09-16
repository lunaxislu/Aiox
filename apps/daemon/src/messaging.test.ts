import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { AioxDatabase } from "@aiox/persistence";
import { openDatabase } from "@aiox/persistence";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { MessageService } from "@/messaging";
import { NetworkService } from "@/networks";
import { RuntimeRegistry } from "@/runtimes";
import { fakeVendor } from "@/testing";

let home: string;
let db: AioxDatabase;
let runtimes: RuntimeRegistry;
let messages: MessageService;
let networkId: string;

beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "aiox-messaging-"));
    db = await openDatabase(join(home, "aiox.db"));
    runtimes = new RuntimeRegistry();
    const networks = new NetworkService(db, runtimes);
    messages = new MessageService(db, runtimes, networks);
    runtimes.onSettle((...args) => messages.settle(...args));
    networkId = (await networks.create("work")).id;
});

afterEach(async () => {
    await db.close();
    await rm(home, { recursive: true, force: true });
});

async function joinAgent(name: string) {
    const vendor = fakeVendor();
    const { record } = await runtimes.register({
        name,
        role: "worker",
        networkId,
        createBinding: vendor.createBinding,
    });
    return { record, vendor };
}

it("persists UUID v7 Network, Message, Delivery and Notification IDs across reopening", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    await db.networks.replaceRouting(networkId, {
        routes: [{ from: b.record.id, to: a.record.id }],
    });
    const sent = await messages.send(a.record, [b.record.id, a.record.id], "X");
    await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");
    await db.close();
    db = await openDatabase(join(home, "aiox.db"));
    const deliveries = await db.messages.deliveriesFor(sent.messageId);
    const notices = await db.messages.unreadNotifications();
    expect(deliveries).toHaveLength(2);
    expect(notices).toHaveLength(1);
    expect((await db.networks.get(networkId))?.name).toBe("work");
    const ids = [
        networkId,
        sent.messageId,
        ...deliveries.map((row) => row.id),
        notices[0]!.id,
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids)
        expect(id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
    expect(deliveries.every((row) => row.messageId === sent.messageId)).toBe(
        true,
    );
    expect(notices[0]!.deliveryId).toBe(b.vendor.deliveryIds[0]);
});

it("saves B's result after A exits without delivering it to a same-name replacement", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    await db.networks.replaceRouting(networkId, {
        routes: [{ from: b.record.id, to: a.record.id }],
    });
    const sent = await messages.send(a.record, [b.record.id], "X");
    await messages.forget(a.record.id);
    runtimes.unregister(a.record.id);
    const replacement = await joinAgent("A");

    await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");

    expect(
        await db.messages.deliveryFor(sent.messageId, b.record.id),
    ).toMatchObject({
        outcome: "completed",
        outcomeAt: expect.any(Number),
    });
    expect(messages.pending()).toBe(0);
    expect(replacement.vendor.received).toEqual([]);
    expect(a.vendor.received).toEqual([]);
    expect(await db.messages.unreadNotifications()).toMatchObject([
        { originRuntimeId: a.record.id },
    ]);
    expect(await db.messages.purgeBefore(Date.now() + 1)).toEqual({
        messages: 1,
        deliveries: 1,
        notifications: 1,
    });
});

it("records an exited target's pending request as interrupted without notifying or reopening it", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    await db.networks.replaceRouting(networkId, {
        routes: [],
    });
    const sent = await messages.send(a.record, [b.record.id], "X");
    await messages.forget(b.record.id);
    runtimes.unregister(b.record.id);
    await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");

    expect(
        await db.messages.deliveryFor(sent.messageId, b.record.id),
    ).toMatchObject({
        outcome: "interrupted",
    });
    expect(messages.pending()).toBe(0);
    expect(await db.messages.unreadNotifications()).toEqual([]);
    expect(a.vendor.received).toEqual([]);
});

it("keeps overlapping senders and targets separate when one request fails before the others finish", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    const c = await joinAgent("C");
    const d = await joinAgent("D");
    await db.networks.replaceRouting(networkId, {
        routes: [
            { from: b.record.id, to: a.record.id },
            { from: c.record.id, to: a.record.id },
            { from: c.record.id, to: d.record.id },
        ],
    });
    const first = await messages.send(
        a.record,
        [b.record.id, c.record.id],
        "same work",
    );
    const second = await messages.send(d.record, [c.record.id], "same work");
    const [ab, ac] = first.results;
    const [dc] = second.results;
    expect(first.results).toEqual([
        {
            agentId: b.record.id,
            accepted: true,
            deliveryId: b.vendor.deliveryIds[0],
        },
        {
            agentId: c.record.id,
            accepted: true,
            deliveryId: c.vendor.deliveryIds[0],
        },
    ]);
    expect(dc).toEqual({
        agentId: c.record.id,
        accepted: true,
        deliveryId: c.vendor.deliveryIds[1],
    });

    // B cannot finish C's delivery, even with its correlation handle.
    await b.vendor.settle(ac!.deliveryId!, "completed");
    expect(
        await db.messages.deliveryFor(first.messageId, c.record.id),
    ).toMatchObject({ outcome: null });
    expect(await db.messages.unreadNotifications()).toEqual([]);

    await c.vendor.settle(ac!.deliveryId!, "failed", "quota");
    expect(
        await db.messages.deliveryFor(first.messageId, c.record.id),
    ).toMatchObject({
        id: ac!.deliveryId,
        outcome: "failed",
        outcomeError: "quota",
    });
    expect(
        await db.messages.deliveryFor(first.messageId, b.record.id),
    ).toMatchObject({ outcome: null });
    expect(
        await db.messages.deliveryFor(second.messageId, c.record.id),
    ).toMatchObject({ outcome: null });
    expect(a.vendor.received).toHaveLength(1);
    expect(a.vendor.received[0]!.content).toContain("request to C");
    expect(d.vendor.received).toEqual([]);

    await c.vendor.settle(dc!.deliveryId!, "completed");
    await b.vendor.settle(ab!.deliveryId!, "completed");
    expect(
        await db.messages.deliveryFor(second.messageId, c.record.id),
    ).toMatchObject({ id: dc!.deliveryId, outcome: "completed" });
    expect(
        await db.messages.deliveryFor(first.messageId, b.record.id),
    ).toMatchObject({ id: ab!.deliveryId, outcome: "completed" });
    const notices = await db.messages.unreadNotifications();
    expect(notices).toMatchObject([
        { deliveryId: ac!.deliveryId, originRuntimeId: a.record.id },
        { deliveryId: dc!.deliveryId, originRuntimeId: d.record.id },
        { deliveryId: ab!.deliveryId, originRuntimeId: a.record.id },
    ]);
    expect(a.vendor.received.map(({ content }) => content)).toEqual([
        notices[0]!.body,
        notices[2]!.body,
    ]);
    expect(d.vendor.received.map(({ content }) => content)).toEqual([
        notices[1]!.body,
    ]);
    expect(
        [...a.vendor.received, ...d.vendor.received].every(
            (message) =>
                message.deliveryId === null && message.from.name === "AIOX",
        ),
    ).toBe(true);
    expect(b.vendor.received).toHaveLength(1);
    expect(c.vendor.received).toHaveLength(2);
    expect(messages.pending()).toBe(0);
});

it("pauses admission, drains accepted sends before stopping, and can resume", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    await db.networks.replaceRouting(networkId, {
        routes: [],
    });
    let release!: () => void;
    let entered!: () => void;
    const accepted = new Promise<void>((resolve) => {
        entered = resolve;
    });
    const delivery = new Promise<void>((resolve) => {
        release = resolve;
    });
    const deliver = vi
        .spyOn(b.record.binding, "deliver")
        .mockImplementationOnce(() => {
            entered();
            return delivery;
        });
    const sending = messages.send(a.record, [b.record.id], "X");
    await accepted;
    let paused = false;
    const pausing = messages.pause().then(() => {
        paused = true;
    });
    await expect(
        messages.send(a.record, [b.record.id], "refused"),
    ).rejects.toThrow("stopping");
    expect(paused).toBe(false);
    expect(deliver).toHaveBeenCalledTimes(1);
    release();
    await sending;
    await pausing;
    expect(messages.pending()).toBe(1);
    messages.resume();
    await messages.send(a.record, [b.record.id], "Y");
    expect(deliver).toHaveBeenCalledTimes(2);
});

it("drains an ongoing outcome and its notification before database shutdown", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    await db.networks.replaceRouting(networkId, {
        routes: [{ from: b.record.id, to: a.record.id }],
    });
    await messages.send(a.record, [b.record.id], "X");
    const deliveryId = b.vendor.deliveryIds[0]!;
    let release!: () => void;
    let entered!: () => void;
    const released = new Promise<void>((resolve) => {
        release = resolve;
    });
    const started = new Promise<void>((resolve) => {
        entered = resolve;
    });
    const settle = db.messages.settle;
    vi.spyOn(db.messages, "settle").mockImplementationOnce(async (...args) => {
        entered();
        await released;
        return settle(...args);
    });
    const settling = b.vendor.settle(deliveryId, "completed");
    await started;
    let drained = false;
    const draining = messages.drain().then(() => {
        drained = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(drained).toBe(false);
    release();
    await settling;
    await draining;
    expect(await db.messages.unreadNotifications()).toHaveLength(1);
    expect(a.vendor.received).toHaveLength(1);
});

it("keeps correlation after a storage failure so target cleanup can retry once", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    await db.networks.replaceRouting(networkId, {
        routes: [],
    });
    const sent = await messages.send(a.record, [b.record.id], "X");
    const deliveryId = b.vendor.deliveryIds[0]!;
    let fail!: (error: Error) => void;
    const failure = new Promise<boolean>((_resolve, reject) => {
        fail = reject;
    });
    const settle = vi
        .spyOn(db.messages, "settle")
        .mockImplementationOnce(() => failure);
    const first = b.vendor.settle(deliveryId, "completed");
    const duplicate = b.vendor.settle(deliveryId, "failed");
    const firstFailed = expect(first).rejects.toThrow("storage unavailable");
    const duplicateFailed = expect(duplicate).rejects.toThrow(
        "storage unavailable",
    );
    fail(new Error("storage unavailable"));
    await Promise.all([firstFailed, duplicateFailed]);
    expect(settle).toHaveBeenCalledTimes(1);
    expect(messages.pending()).toBe(1);
    await messages.forget(b.record.id);
    expect(
        await db.messages.deliveryFor(sent.messageId, b.record.id),
    ).toMatchObject({ outcome: "completed" });
    expect(messages.pending()).toBe(0);
    expect(await db.messages.unreadNotifications()).toEqual([]);
});

it("rolls back a result when its required notification fails, then retries the original outcome", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    await db.networks.replaceRouting(networkId, {
        routes: [{ from: b.record.id, to: a.record.id }],
    });
    const sent = await messages.send(a.record, [b.record.id], "X");
    const deliveryId = b.vendor.deliveryIds[0]!;
    const sqlite = new DatabaseSync(join(home, "aiox.db"));
    try {
        sqlite.exec(`CREATE TRIGGER reject_notification BEFORE INSERT ON notifications
            BEGIN SELECT RAISE(ABORT, 'notification unavailable'); END`);
        await expect(b.vendor.settle(deliveryId, "completed")).rejects.toThrow(
            "notification unavailable",
        );
        expect(
            await db.messages.deliveryFor(sent.messageId, b.record.id),
        ).toMatchObject({ outcome: null });
        expect(messages.pending()).toBe(1);
        expect(await db.messages.unreadNotifications()).toEqual([]);
        expect(a.vendor.received).toEqual([]);
        expect(await db.messages.purgeBefore(Date.now() + 1)).toEqual({
            messages: 0,
            deliveries: 0,
            notifications: 0,
        });
        sqlite.exec("DROP TRIGGER reject_notification");
        await messages.forget(b.record.id);
        await b.vendor.settle(deliveryId, "failed", "late failure");
        expect(
            await db.messages.deliveryFor(sent.messageId, b.record.id),
        ).toMatchObject({ outcome: "completed", outcomeError: null });
        expect(messages.pending()).toBe(0);
        expect(await db.messages.unreadNotifications()).toHaveLength(1);
        expect(a.vendor.received).toHaveLength(1);
        expect(await db.messages.purgeBefore(Date.now() + 1)).toEqual({
            messages: 1,
            deliveries: 1,
            notifications: 1,
        });
    } finally {
        sqlite.close();
    }
});

it("keeps a refused target's failed write pending while delivering to later targets, and drain retries only storage", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    const c = await joinAgent("C");
    await db.networks.replaceRouting(networkId, {
        routes: [],
    });
    b.vendor.refuse("inbox unavailable");
    const sqlite = new DatabaseSync(join(home, "aiox.db"));
    try {
        sqlite.exec(`CREATE TRIGGER reject_outcome BEFORE UPDATE OF outcome ON deliveries
            WHEN NEW.outcome = 'rejected'
            BEGIN SELECT RAISE(ABORT, 'outcome unavailable'); END`);
        const sent = await messages.send(
            a.record,
            [b.record.id, c.record.id],
            "X",
        );
        expect(sent.results).toEqual([
            {
                agentId: b.record.id,
                accepted: false,
                error: expect.stringContaining("outcome unavailable"),
            },
            {
                agentId: c.record.id,
                accepted: true,
                deliveryId: c.vendor.deliveryIds[0],
            },
        ]);
        expect(sent.results[0]?.error).toContain("inbox unavailable");
        expect(c.vendor.received).toHaveLength(1);
        expect(messages.pending()).toBe(2);
        expect(
            await db.messages.deliveryFor(sent.messageId, b.record.id),
        ).toMatchObject({ outcome: null });
        await expect(messages.drain()).rejects.toThrow("outcome unavailable");
        expect(messages.pending()).toBe(2);
        sqlite.exec("DROP TRIGGER reject_outcome");
        await messages.drain();
        expect(
            await db.messages.deliveryFor(sent.messageId, b.record.id),
        ).toMatchObject({
            outcome: "rejected",
            outcomeError: "inbox unavailable",
        });
        expect(
            await db.messages.deliveryFor(sent.messageId, c.record.id),
        ).toMatchObject({ outcome: null });
        expect(messages.pending()).toBe(1);
        expect(b.vendor.received).toEqual([]);
        expect(c.vendor.received).toHaveLength(1);
        expect(a.vendor.received).toEqual([]);
        expect(await db.messages.unreadNotifications()).toEqual([]);
        expect(await db.messages.purgeBefore(Date.now() + 1)).toEqual({
            messages: 0,
            deliveries: 0,
            notifications: 0,
        });
        await c.vendor.settle(c.vendor.deliveryIds[0]!, "completed");
        expect(await db.messages.purgeBefore(Date.now() + 1)).toEqual({
            messages: 1,
            deliveries: 2,
            notifications: 0,
        });
    } finally {
        sqlite.close();
    }
});

it.each(["source", "target"] as const)(
    "rechecks %s collaboration after the send-time route lookup",
    async (revoked) => {
        const a = await joinAgent("A");
        const b = await joinAgent("B");
        await db.networks.replaceRouting(networkId, {
            routes: [],
        });
        const get = db.networks.get;
        vi.spyOn(db.networks, "get").mockImplementationOnce(async (id) => {
            const snapshot = await get(id);
            runtimes.revoke(revoked === "source" ? a.record.id : b.record.id);
            return snapshot;
        });
        const sent = await messages.send(a.record, [b.record.id], "X");
        expect(sent.results).toMatchObject([
            { agentId: b.record.id, accepted: false },
        ]);
        expect(b.vendor.received).toEqual([]);
        expect(messages.pending()).toBe(0);
        expect(await db.messages.deliveriesFor(sent.messageId)).toMatchObject([
            { outcome: "rejected" },
        ]);
    },
);
