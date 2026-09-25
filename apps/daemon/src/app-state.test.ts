import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openDatabase } from "@aiox/persistence";
import type { PanelView, TerminalView } from "@aiox/protocol";
import type { ApplicationEvent } from "@aiox/protocol";
import { Effect, Stream } from "effect";
import { expect, it, vi } from "vitest";

import { AppState } from "./app-state";
import { RuntimeRegistry } from "./runtimes";

const panel = (id: string, name = id): PanelView => ({
    id,
    kind: "workspace",
    section: "workspaces",
    name,
    hostId: null,
    networkId: null,
    revision: 1,
    layout: { type: "pane", id: `${id}-pane`, tabIds: [] },
    tabs: [],
});

async function setup(t: { onTestFinished(fn: () => unknown): void }) {
    const home = await mkdtemp(join(tmpdir(), "aiox-app-state-"));
    const db = await openDatabase(join(home, "aiox.db"));
    const terminals = new Map<string, TerminalView>();
    const state = new AppState({
        db,
        runtimes: new RuntimeRegistry(),
        terminals: {
            view: (id) => terminals.get(id),
            views: () => [...terminals.values()],
        },
        cleanups: { view: () => undefined, list: () => [] },
    });
    t.onTestFinished(async () => {
        state.close();
        await db.close();
        await rm(home, { recursive: true, force: true });
    });
    await db.hostState.createPanel(panel("p1"));
    await state.rebuild();
    const rename = async (name: string) => {
        await db.hostState.mutatePanel("p1", (p) => ({ ...p, name }));
        return state.update({ panel: "p1" });
    };
    return { state, db, terminals, rename };
}

it("stays current without viewers and never rescans storage for a normal change", async (t) => {
    const { db, state, terminals, rename } = await setup(t);
    const scans = [
        vi.spyOn(db.hostState, "snapshot"),
        vi.spyOn(db.networks, "list"),
        vi.spyOn(db.messages, "unreadNotifications"),
    ];
    await rename("Renamed");
    terminals.set("t1", { id: "t1", cwd: "/", kind: "shell", alive: true });
    await state.update({ terminal: "t1" });
    await state.update({
        notification: {
            id: "n1",
            originRuntimeId: "r1",
            terminalId: null,
            body: "done",
            createdAt: 1,
            readAt: null,
        },
    });
    const snapshot = await state.current();
    expect(snapshot.panels.map((p) => p.name)).toEqual(["Renamed"]);
    expect(snapshot.terminals.map((t) => t.id)).toEqual(["t1"]);
    expect(snapshot.notifications.map((n) => n.id)).toEqual(["n1"]);
    // Neither the change nor a reconnect snapshot reads the whole store.
    for (const scan of scans) expect(scan).not.toHaveBeenCalled();
    await state.update({ notificationsRead: ["n1"] });
    expect(state.snapshot().notifications).toEqual([]);
});

it("delivers a snapshot followed by every later version with the same response/broadcast identity", async (t) => {
    const { state, rename } = await setup(t);
    await Effect.runPromise(
        Effect.scoped(
            Effect.gen(function* () {
                const pull = yield* Stream.toPull(state.events);
                const first = yield* pull;
                expect(first[0]).toMatchObject({
                    type: "snapshot",
                    version: 0,
                    snapshot: { epoch: state.epoch },
                });
                const receipt = yield* Effect.promise(() => rename("After"));
                const later = yield* pull;
                expect(later).toEqual([receipt]);
                expect(receipt).toMatchObject({
                    type: "delta",
                    epoch: state.epoch,
                    version: 1,
                    changes: [
                        {
                            resource: "panel",
                            action: "upsert",
                            value: { name: "After" },
                        },
                    ],
                });
                const reconnect = yield* Stream.toPull(state.events);
                expect((yield* reconnect)[0]).toMatchObject({
                    type: "snapshot",
                    version: 1,
                    snapshot: { panels: [{ name: "After" }] },
                });
            }),
        ),
    );
});

it("disconnects a bounded slow reader without holding back producers or a current reader", async (t) => {
    const { state, rename } = await setup(t);
    await Effect.runPromise(
        Effect.scoped(
            Effect.gen(function* () {
                const slow = yield* Stream.toPull(state.events);
                const fast = yield* Stream.toPull(state.events);
                yield* slow;
                yield* fast;
                for (let i = 0; i < 260; i++) {
                    const receipt = yield* Effect.promise(() =>
                        rename(`name-${i}`),
                    );
                    expect(yield* fast).toEqual([receipt]);
                }
                // Queue failure may follow already-buffered entries; it never silently skips versions.
                const failure = yield* Effect.gen(function* () {
                    while (true) yield* slow;
                }).pipe(Effect.flip);
                expect(failure).toMatchObject({ code: "slow_consumer" });
                const reconnect = yield* Stream.toPull(state.events);
                expect((yield* reconnect)[0]).toMatchObject({
                    type: "snapshot",
                    version: 260,
                    snapshot: { panels: [{ name: "name-259" }] },
                });
            }),
        ),
    );
});

it("reports projection failure, recovers committed storage and resumes targeted updates", async (t) => {
    const { state, db, rename } = await setup(t);
    await Effect.runPromise(
        Effect.scoped(
            Effect.gen(function* () {
                const pull = yield* Stream.toPull(state.events);
                yield* pull;
                vi.spyOn(db.hostState, "getPanel").mockRejectedValueOnce(
                    new Error("SQLITE_IOERR"),
                );
                yield* Effect.promise(() => rename("lost"));
                expect(yield* Effect.flip(pull)).toMatchObject({
                    code: "storage_error",
                    message: "SQLITE_IOERR",
                });
                expect((yield* state.currentEffect).panels[0]!.name).toBe(
                    "lost",
                );
                yield* Effect.promise(() => rename("recovered"));
                const reconnect = yield* Stream.toPull(state.events);
                const event: ApplicationEvent = (yield* reconnect)[0]!;
                expect(event).toMatchObject({
                    type: "snapshot",
                    snapshot: { panels: [{ name: "recovered" }] },
                });
            }),
        ),
    );
});
