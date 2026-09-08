import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
    networkId = (await networks.create("work", "deny")).id;
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

it("saves B's result after A exits without delivering it to a same-name replacement", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    await db.networks.replaceRouting(networkId, {
        defaultPolicy: "deny",
        routes: [{ from: a.record.id, to: b.record.id, policy: "allow" }],
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
        defaultPolicy: "allow",
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

it("pauses admission, drains accepted sends before stopping, and can resume", async () => {
    const a = await joinAgent("A");
    const b = await joinAgent("B");
    await db.networks.replaceRouting(networkId, {
        defaultPolicy: "allow",
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
        defaultPolicy: "deny",
        routes: [{ from: a.record.id, to: b.record.id, policy: "allow" }],
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
    const addNotification = db.messages.addNotification;
    vi.spyOn(db.messages, "addNotification").mockImplementationOnce(
        async (row) => {
            entered();
            await released;
            await addNotification(row);
        },
    );
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
        defaultPolicy: "allow",
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
    ).toMatchObject({ outcome: "interrupted" });
    expect(messages.pending()).toBe(0);
    expect(await db.messages.unreadNotifications()).toEqual([]);
});
