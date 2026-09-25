// @vitest-environment node
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { startDaemon } from "@aiox/daemon";
import { openDatabase } from "@aiox/persistence";
import type { ApplicationEvent, PanelView } from "@aiox/protocol";

// Real daemon, isolated database and ephemeral listeners. Only built public package entries cross apps.
async function startTestDaemon() {
    const home = await mkdtemp(join(tmpdir(), "aiox-web-rpc-"));
    const db = await openDatabase(join(home, ".aiox", "aiox.db"));
    const daemon = await startDaemon({
        home,
        db,
        ports: { daemon: 0, web: 0 },
        retentionDays: () => 30,
        sequenceGapTimeout: 30,
    });
    return {
        home,
        daemon,
        webUrl: (path: string) => `http://127.0.0.1:${daemon.ports.web}${path}`,
        close: async () => {
            await daemon.stop(true);
            await rm(home, { recursive: true, force: true });
        },
    };
}
const panel = (): PanelView => ({
    id: randomUUID(),
    kind: "workspace",
    section: "workspaces",
    name: "Before",
    hostId: null,
    networkId: null,
    revision: 1,
    layout: { type: "pane", id: randomUUID(), tabIds: [] },
    tabs: [],
});

import { Cause, Effect, Exit } from "effect";
import { expect, it, vi } from "vitest";

import {
    ApplicationConnection,
    applicationRpcUrl,
} from "./application-connection";

it("derives the RPC URL from the page origin, including TLS and non-default ports", () => {
    expect(applicationRpcUrl("https://example.test/workspaces/one")).toBe(
        "wss://example.test/api/rpc",
    );
    expect(applicationRpcUrl("http://example.test:1234/hosts")).toBe(
        "ws://example.test:1234/api/rpc",
    );
});

it("does not allocate a command identity or report success before a snapshot", async () => {
    const connection = new ApplicationConnection("ws://example.test/api/rpc");
    const command = connection.panelCommand({
        panelId: "panel",
        changes: [{ type: "panel.rename", name: "next" }],
    });
    expect(Exit.isFailure(await Effect.runPromiseExit(command.execute))).toBe(
        true,
    );
    expect(command.request).toBeUndefined();
    expect(connection.getSnapshot().phase).toBe("stopped");
});

// No NodeSocket layer is injected into the Web connection.

async function browserConnection(
    harness: Awaited<ReturnType<typeof startTestDaemon>>,
    t: { onTestFinished: (f: () => void | Promise<void>) => void },
) {
    const NativeSocket = globalThis.WebSocket;
    const sockets: globalThis.WebSocket[] = [];
    class TrackedSocket extends NativeSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
            super(url, protocols);
            sockets.push(this);
        }
    }
    vi.stubGlobal("WebSocket", TrackedSocket);
    const events: ApplicationEvent[] = [];
    const states: string[] = [];
    const connection = new ApplicationConnection(
        harness.webUrl("/api/rpc").replace("http:", "ws:"),
        20,
    );
    const unsubscribe = connection.subscribe(() =>
        states.push(connection.getSnapshot().phase),
    );
    const stop = connection.start((event) => events.push(event));
    t.onTestFinished(async () => {
        await stop();
        unsubscribe();
        vi.unstubAllGlobals();
    });
    await vi.waitFor(() =>
        expect(connection.getSnapshot().phase).toBe("ready"),
    );
    return { connection, events, sockets, states, stop };
}

it("connects the Web client, broadcasts the command delta, resumes and preserves explicit retry identity", async (t) => {
    const harness = await startTestDaemon();
    t.onTestFinished(() => harness.close());
    const stored = panel();
    await harness.daemon.services.db.hostState.createPanel(stored);
    await harness.daemon.services.appState.update({ panel: stored.id });
    const { connection, events, sockets, stop } = await browserConnection(
        harness,
        t,
    );
    const session = connection.getSnapshot().session!;
    expect(events[0]).toMatchObject({
        type: "snapshot",
        snapshot: { epoch: session.epoch },
    });
    const command = connection.panelCommand({
        panelId: stored.id,
        changes: [{ type: "panel.rename", name: "Web" }],
    });
    const answer = await Effect.runPromise(command.execute);
    await vi.waitFor(() => expect(events).toContainEqual(answer.state));
    expect(answer.result.requestId).toBe(command.request!.requestId);
    expect(answer.checkpoint).toBe(1);
    const identity = command.request;
    sockets.at(-1)!.close();
    await vi.waitFor(() =>
        expect(events.filter((e) => e.type === "snapshot")).toHaveLength(2),
    );
    expect(connection.getSnapshot().session).toEqual({
        ...session,
        checkpoint: 1,
    });
    const expired = await Effect.runPromise(Effect.flip(command.execute));
    expect(expired).toMatchObject({ code: "result_expired", checkpoint: 1 });
    expect(command.request).toEqual(identity);
    await vi.waitFor(() =>
        expect(connection.getSnapshot().phase).toBe("ready"),
    );
    const next = connection.panelCommand({
        panelId: stored.id,
        changes: [{ type: "panel.rename", name: "Next" }],
    });
    await Effect.runPromise(next.execute);
    expect(next.request!.sequence).toBe(2);
    const config = await Effect.runPromise(
        connection.call((client, current) =>
            client["config.read"]({ clientSessionId: current.clientSessionId }),
        ),
    );
    expect(config.revision).toBeTruthy();
    await stop();
    await vi.waitFor(() =>
        expect(
            sockets.every((socket) => socket.readyState === WebSocket.CLOSED),
        ).toBe(true),
    );
    const count = sockets.length;
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(sockets).toHaveLength(count);
    expect(connection.getSnapshot().phase).toBe("stopped");
});

it("recovers expired sessions and daemon epochs without replaying old Web commands", async (t) => {
    const harness = await startTestDaemon();
    t.onTestFinished(() => harness.close());
    const { connection, sockets, events } = await browserConnection(harness, t);
    const original = connection.getSnapshot().session!;
    const resume = harness.daemon.services.sequencer.resume.bind(
        harness.daemon.services.sequencer,
    );
    vi.spyOn(harness.daemon.services.sequencer, "resume").mockImplementation(
        (id) =>
            id === original.clientSessionId
                ? Effect.fail({
                      code: "session_expired",
                      message: "test expiration",
                  } as never)
                : resume(id),
    );
    sockets.at(-1)!.close();
    await vi.waitFor(() =>
        expect(
            events.filter((event) => event.type === "snapshot"),
        ).toHaveLength(2),
    );
    expect(connection.getSnapshot().session!.clientSessionId).not.toBe(
        original.clientSessionId,
    );
    // Restart only this temporary daemon, on its allocated ports, with a fresh epoch/session registry.
    const oldEpoch = connection.getSnapshot().session!.epoch;
    const ports = harness.daemon.ports;
    await harness.daemon.stop(true);
    const db = await openDatabase(join(harness.home, ".aiox", "aiox.db"));
    const restarted = await startDaemon({
        home: harness.home,
        ports,
        db,
        retentionDays: () => 30,
        webRoot: undefined,
    });
    t.onTestFinished(async () => {
        await restarted.stop(true);
    });
    await vi.waitFor(() =>
        expect(connection.getSnapshot().session?.epoch).not.toBe(oldEpoch),
    );
    await vi.waitFor(() =>
        expect(connection.getSnapshot().phase).toBe("ready"),
    );
    expect(events.at(-1)).toMatchObject({
        type: "snapshot",
        snapshot: { epoch: connection.getSnapshot().session!.epoch },
    });
});

it("reports an interrupted command and never automatically submits it with a new identity", async (t) => {
    const harness = await startTestDaemon();
    t.onTestFinished(() => harness.close());
    const stored = panel();
    await harness.daemon.services.db.hostState.createPanel(stored);
    await harness.daemon.services.appState.update({ panel: stored.id });
    const { connection, sockets, states, events } = await browserConnection(
        harness,
        t,
    );
    let release!: () => void;
    let entered = false;
    const save = harness.daemon.services.db.hostState.applyPanel.bind(
        harness.daemon.services.db.hostState,
    );
    const mutation = vi
        .spyOn(harness.daemon.services.db.hostState, "applyPanel")
        .mockImplementation(async (...args) => {
            entered = true;
            await new Promise<void>((resolve) => {
                release = resolve;
            });
            return save(...args);
        });
    const command = connection.panelCommand({
        panelId: stored.id,
        changes: [{ type: "panel.rename", name: "Once" }],
    });
    const result = Effect.runPromiseExit(command.execute);
    await vi.waitFor(() => expect(entered).toBe(true));
    sockets.at(-1)!.close();
    const outcome = await result;
    expect(Exit.isFailure(outcome)).toBe(true);
    if (Exit.isFailure(outcome))
        expect(Cause.squash(outcome.cause)).toBeDefined();
    release();
    await vi.waitFor(() =>
        expect(
            events.filter((event) => event.type === "snapshot").length,
        ).toBeGreaterThan(1),
    );
    expect(states).toContain("reconnecting");
    expect(mutation).toHaveBeenCalledTimes(1);
    expect(command.request!.sequence).toBe(1);
});

it.each(["before-snapshot", "gap", "epoch", "stream-failure"])(
    "recovers %s through a fresh snapshot without forwarding invalid deltas",
    async (failure) => {
        const harness = await startTestDaemon();
        const original = harness.daemon.services.appState.events;
        const { Stream } = await import("effect");
        let opens = 0;
        Object.defineProperty(harness.daemon.services.appState, "events", {
            configurable: true,
            get() {
                opens++;
                if (opens !== 1) return original;
                const bad: ApplicationEvent = {
                    type: "delta",
                    epoch: harness.daemon.services.appState.epoch,
                    version: 99,
                    changes: [],
                };
                if (failure === "before-snapshot") return Stream.make(bad);
                return original.pipe(
                    Stream.take(1),
                    Stream.concat(
                        failure === "stream-failure"
                            ? Stream.fail({
                                  code: "slow_consumer",
                                  message: "forced stream failure",
                              })
                            : Stream.make(
                                  failure === "epoch"
                                      ? { ...bad, version: 1, epoch: "wrong" }
                                      : bad,
                              ),
                    ),
                );
            },
        });
        const connection = new ApplicationConnection(
            harness.webUrl("/api/rpc").replace("http:", "ws:"),
            10,
        );
        const events: ApplicationEvent[] = [];
        const stop = connection.start((event) => events.push(event));
        try {
            await vi.waitFor(() => {
                expect(opens).toBe(2);
                expect(connection.getSnapshot().phase).toBe("ready");
            });
            expect(events.every((event) => event.type === "snapshot")).toBe(
                true,
            );
        } finally {
            await stop();
            await harness.close();
        }
    },
);

it("preserves subscription deltas even when newer command responses arrive first, and forwards sequence, notification and cleanup events", async (t) => {
    const harness = await startTestDaemon();
    t.onTestFinished(() => harness.close());
    const stored = panel();
    await harness.daemon.services.db.hostState.createPanel(stored);
    await harness.daemon.services.appState.update({ panel: stored.id });
    const { Deferred, Stream } = await import("effect");
    const gate = Deferred.makeUnsafe<void>();
    const events = harness.daemon.services.appState.events;
    Object.defineProperty(harness.daemon.services.appState, "events", {
        value: events.pipe(
            Stream.mapEffect((event): Effect.Effect<ApplicationEvent> =>
                event.type === "delta"
                    ? Deferred.await(gate).pipe(Effect.as(event))
                    : Effect.succeed(event),
            ),
        ),
    });
    const { connection, events: received } = await browserConnection(
        harness,
        t,
    );
    const one = await Effect.runPromise(
        connection.panelCommand({
            panelId: stored.id,
            changes: [{ type: "panel.rename", name: "one" }],
        }).execute,
    );
    const two = await Effect.runPromise(
        connection.panelCommand({
            panelId: stored.id,
            changes: [{ type: "panel.rename", name: "two" }],
        }).execute,
    );
    expect(received).toHaveLength(1);
    Effect.runSync(Deferred.succeed(gate, undefined));
    await vi.waitFor(() =>
        expect(received.slice(1)).toEqual([one.state, two.state]),
    );
    const cleanup = {
        id: "cleanup",
        terminalId: "cleanup",
        panelId: stored.id,
        tabId: "tab",
        reason: "panel-deleted" as const,
        state: "failed" as const,
        error: "not stopped",
        attempts: 1,
        updatedAt: 1,
    };
    vi.spyOn(harness.daemon.services.cleanups, "view").mockReturnValue(cleanup);
    await harness.daemon.services.appState.update({ cleanup: cleanup.id });
    await vi.waitFor(() =>
        expect(
            received.some(
                (event) =>
                    event.type === "delta" &&
                    event.changes.some(
                        (change) =>
                            change.resource === "cleanup" &&
                            change.action === "upsert" &&
                            change.value.error === "not stopped",
                    ),
            ),
        ).toBe(true),
    );
    const failure = {
        clientSessionId: connection.getSnapshot().session!.clientSessionId,
        code: "sequence_gap" as const,
        missing: [3],
        unexecuted: [{ sequence: 4, requestId: randomUUID() }],
    };
    harness.daemon.services.appState.sequenceFailure(failure);
    await harness.daemon.services.appState.update({
        notification: {
            id: "notice",
            originRuntimeId: "runtime",
            terminalId: null,
            body: "done",
            createdAt: 1,
            readAt: null,
        },
    });
    await vi.waitFor(() => {
        expect(received).toContainEqual({ type: "sequence-failure", failure });
        expect(
            received.some(
                (event) =>
                    event.type === "delta" &&
                    event.changes.some(
                        (change) => change.resource === "notification",
                    ),
            ),
        ).toBe(true);
    });
});

it("a new app execution opens a new session and cannot replay an expired command", async (t) => {
    const harness = await startTestDaemon();
    t.onTestFinished(() => harness.close());
    const stored = panel();
    await harness.daemon.services.db.hostState.createPanel(stored);
    await harness.daemon.services.appState.update({ panel: stored.id });
    const first = await browserConnection(harness, t);
    const command = first.connection.panelCommand({
        panelId: stored.id,
        changes: [{ type: "panel.rename", name: "once" }],
    });
    await Effect.runPromise(command.execute);
    const id = first.connection.getSnapshot().session!.clientSessionId;
    await first.stop();
    const second = await browserConnection(harness, t);
    expect(second.connection.getSnapshot().session!.clientSessionId).not.toBe(
        id,
    );
    expect(second.connection.getSnapshot().session!.checkpoint).toBe(0);
    await second.stop();
    const resume = harness.daemon.services.sequencer.resume.bind(
        harness.daemon.services.sequencer,
    );
    vi.spyOn(harness.daemon.services.sequencer, "resume").mockImplementation(
        (sessionId) =>
            sessionId === id
                ? Effect.fail({
                      code: "session_expired",
                      message: "test expiration",
                  } as never)
                : resume(sessionId),
    );
    const stop = first.connection.start(() => {});
    t.onTestFinished(stop);
    await vi.waitFor(() =>
        expect(first.connection.getSnapshot().phase).toBe("ready"),
    );
    expect(first.connection.getSnapshot().session!.clientSessionId).not.toBe(
        id,
    );
    expect(await Effect.runPromise(Effect.flip(command.execute))).toMatchObject(
        { _tag: "ConnectionUnavailable" },
    );
    expect(command.request!.clientSessionId).toBe(id);
});

it("keeps a lost sequence, surfaces real sequence_gap/checkpoint, and allocates the next contiguous command", async (t) => {
    const harness = await startTestDaemon();
    t.onTestFinished(() => harness.close());
    const stored = panel();
    await harness.daemon.services.db.hostState.createPanel(stored);
    await harness.daemon.services.appState.update({ panel: stored.id });
    const NativeSocket = globalThis.WebSocket;
    let dropped = false;
    class DropFirstCommand extends NativeSocket {
        override send(data: Parameters<WebSocket["send"]>[0]) {
            if (typeof data === "string") {
                const frame = JSON.parse(data);
                if (
                    frame.tag === "panel.command" &&
                    frame.payload.sequence === 1
                ) {
                    dropped = true;
                    return;
                }
            }
            super.send(data);
        }
    }
    vi.stubGlobal("WebSocket", DropFirstCommand);
    const { connection, sockets, events } = await browserConnection(harness, t);
    const one = connection.panelCommand({
        panelId: stored.id,
        changes: [{ type: "panel.rename", name: "lost" }],
    });
    const pending = Effect.runPromiseExit(one.execute);
    await vi.waitFor(() => expect(dropped).toBe(true));
    sockets.at(-1)!.close();
    expect(Exit.isFailure(await pending)).toBe(true);
    await vi.waitFor(() =>
        expect(events.filter((e) => e.type === "snapshot")).toHaveLength(2),
    );
    const two = connection.panelCommand({
        panelId: stored.id,
        changes: [{ type: "panel.rename", name: "unexecuted" }],
    });
    expect(await Effect.runPromise(Effect.flip(two.execute))).toMatchObject({
        code: "sequence_gap",
        checkpoint: 2,
    });
    await vi.waitFor(() =>
        expect(events).toContainEqual(
            expect.objectContaining({ type: "sequence-failure" }),
        ),
    );
    expect(connection.getSnapshot().session!.checkpoint).toBe(2);
    const three = connection.panelCommand({
        panelId: stored.id,
        changes: [{ type: "panel.rename", name: "three" }],
    });
    expect((await Effect.runPromise(three.execute)).result.panel?.name).toBe(
        "three",
    );
    expect(three.request!.sequence).toBe(3);
    expect(one.request!.sequence).toBe(1);
});
