import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { join } from "node:path";

import {
    ApplicationRpc,
    type ApplicationEvent,
    type PanelView,
} from "@aiox/protocol";
import { NodeSocket } from "@effect/platform-node";
import { Deferred, Effect, Fiber, Layer, Queue, Stream } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";
import { expect, it, vi } from "vitest";
import { WebSocket } from "ws";

import { initialHostPanel } from "./host-run";
import { openTestApplication, startTestDaemon } from "./testing";

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

it("finishes an accepted notification read after its RPC connection closes", async (t) => {
    const harness = await startTestDaemon();
    t.onTestFinished(() => harness.close());
    const { db, appState, tasks } = harness.daemon.services;
    await db.messages.record(
        {
            id: "message",
            kind: "agent",
            sourceRuntimeId: "source",
            sourceName: "Sender",
            sourceRole: null,
            sourceDescription: null,
            networkId: "network",
            content: "work",
            createdAt: 1,
        },
        [
            {
                id: "delivery",
                messageId: "message",
                targetRuntimeId: "target",
                reverseRouteAtSend: false,
                accepted: true,
                rejectReason: null,
                outcome: null,
                outcomeAt: null,
                outcomeError: null,
            },
        ],
    );
    await db.messages.settle("delivery", "completed", 2, undefined, {
        id: "notice",
        originRuntimeId: "source",
        originExecutionOwnership: "daemon",
        originTerminalId: null,
        body: "finished",
        createdAt: 2,
        readAt: null,
    });
    await appState.rebuild();
    const rpc = await openTestApplication(harness);
    t.onTestFinished(() => rpc.close());
    expect(await rpc.next()).toMatchObject({
        type: "snapshot",
        snapshot: { notifications: [{ id: "notice" }] },
    });
    const entered = Deferred.makeUnsafe<void>();
    const release = Deferred.makeUnsafe<void>();
    const saved = Deferred.makeUnsafe<void>();
    const markRead = db.messages.markRead.bind(db.messages);
    vi.spyOn(db.messages, "markRead").mockImplementation(async (ids, at) => {
        Effect.runSync(Deferred.succeed(entered, undefined));
        await Effect.runPromise(Deferred.await(release));
        await markRead(ids, at);
        Effect.runSync(Deferred.succeed(saved, undefined));
    });
    const socket = new WebSocket(
        harness.webUrl("/api/rpc").replace("http:", "ws:"),
    );
    t.onTestFinished(() => socket.terminate());
    await once(socket, "open");
    socket.send(
        JSON.stringify({
            _tag: "Request",
            id: "read",
            tag: "notifications.read",
            payload: {
                clientSessionId: rpc.session.clientSessionId,
                ids: ["notice"],
            },
            headers: [],
        }),
    );
    try {
        await Effect.runPromise(Deferred.await(entered));
        const closed = once(socket, "close");
        socket.close();
        await closed;
        // Let the server finish processing the close before releasing the in-flight storage call.
        await new Promise((resolve) => setTimeout(resolve, 100));
    } finally {
        Effect.runSync(Deferred.succeed(release, undefined));
    }
    await Effect.runPromise(Deferred.await(saved));
    await tasks.idle();
    expect(await db.messages.unreadNotifications()).toEqual([]);
    expect(await rpc.next()).toMatchObject({
        type: "delta",
        changes: [{ resource: "notification", action: "remove", id: "notice" }],
    });
    const reconnected = await openTestApplication(harness);
    t.onTestFinished(() => reconnected.close());
    expect(await reconnected.next()).toMatchObject({
        type: "snapshot",
        snapshot: { notifications: [] },
    });
    expect(
        await reconnected.run(
            reconnected.client["notifications.read"]({
                clientSessionId: reconnected.session.clientSessionId,
                ids: ["notice"],
            }),
        ),
    ).toEqual({ read: 0, state: null });
});

it("bounds an actual RPC subscriber that stops acknowledging while another subscriber advances", async (t) => {
    const harness = await startTestDaemon();
    t.onTestFinished(() => harness.close());
    const stored = panel();
    const services = harness.daemon.services;
    await services.db.hostState.createPanel(stored);
    await services.appState.update({ panel: stored.id });
    const fast = await openTestApplication(harness);
    t.onTestFinished(() => fast.close());
    await fast.next();
    const slow = new WebSocket(
        harness.webUrl("/api/rpc").replace("http:", "ws:"),
    );
    t.onTestFinished(() => slow.terminate());
    await once(slow, "open");
    const received: unknown[] = [];
    let acknowledging = false;
    slow.on("message", (bytes) => {
        const decoded = JSON.parse(bytes.toString()) as { _tag: string };
        received.push(decoded);
        if (acknowledging && decoded._tag === "Chunk")
            slow.send(JSON.stringify({ _tag: "Ack", requestId: "slow" }));
    });
    // RC117 transport envelope: deliberately withhold ACK after the initial snapshot.
    slow.send(
        JSON.stringify({
            _tag: "Request",
            id: "slow",
            tag: "state.subscribe",
            payload: { clientSessionId: fast.session.clientSessionId },
            headers: [],
        }),
    );
    await vi.waitFor(() => expect(received).toHaveLength(1));
    for (let i = 0; i < 260; i++) {
        await services.db.hostState.mutatePanel(stored.id, (draft) => ({
            ...draft,
            name: `name-${i}`,
        }));
        await services.appState.update({ panel: stored.id });
        expect(JSON.stringify(await fast.next())).toContain(`name-${i}`);
    }
    await vi.waitFor(() =>
        expect(JSON.stringify(fast.observed)).toContain("name-259"),
    );
    acknowledging = true;
    slow.send(JSON.stringify({ _tag: "Ack", requestId: "slow" }));
    await vi.waitFor(() =>
        expect(JSON.stringify(received)).toContain("slow_consumer"),
    );
    expect((await services.appState.current()).panels[0]?.name).toBe(
        "name-259",
    );
});

it("shares config conflicts and Host admission failures through the application RPC", async (t) => {
    const harness = await startTestDaemon();
    t.onTestFinished(() => harness.close());
    const rpc = await openTestApplication(harness);
    t.onTestFinished(() => rpc.close());
    const clientSessionId = rpc.session.clientSessionId;
    const before = await rpc.run(
        rpc.client["config.read"]({ clientSessionId }),
    );
    const saved = await rpc.run(
        rpc.client["config.write"]({
            clientSessionId,
            input: { revision: before.revision, stored: before.stored },
        }),
    );
    expect(saved.revision).not.toBe(before.revision);
    const conflict = await rpc.run(
        Effect.flip(
            rpc.client["config.write"]({
                clientSessionId,
                input: { revision: before.revision, stored: before.stored },
            }),
        ),
    );
    expect(conflict).toMatchObject({
        code: "config_conflict",
        details: { current: saved },
    });
    const missing = await rpc.run(
        Effect.flip(
            Stream.runCollect(
                rpc.client["host.stop"]({
                    clientSessionId,
                    hostId: "missing",
                    input: { requestId: randomUUID() },
                }),
            ),
        ),
    );
    expect(missing).toMatchObject({ code: "unknown_host", stage: "cli" });
    expect(
        await rpc.run(
            Effect.flip(
                rpc.client["host.resolve"]({
                    clientSessionId,
                    input: { source: { directory: harness.home } },
                }),
            ),
        ),
    ).toMatchObject({ code: "invalid_yaml", stage: "yaml" });

    const hostPanel = initialHostPanel("host", "network", "Host", ["a"], {
        preset: "auto",
    });
    await harness.daemon.services.db.hostState.createHost(
        {
            id: "host",
            name: "Host",
            directory: harness.home,
            sourceFile: join(harness.home, "aiox.yaml"),
            instruction: "",
            panelId: hostPanel.id,
            networkId: "network",
            revision: 1,
            agents: [
                {
                    key: "a",
                    adapter: "codex",
                    role: null,
                    description: null,
                    instruction: "",
                    args: [],
                    member: true,
                    runtime: null,
                    lastTerminalId: null,
                    lastExit: null,
                },
            ],
        },
        {
            id: "network",
            hostId: "host",
            name: "Network",
            scope: "host",
            default: "deny",
            members: [{ agentKey: "a", runtimeId: null }],
            edges: [],
        },
        hostPanel,
        Date.now(),
    );
    const stop = {
        clientSessionId,
        hostId: "host",
        input: { requestId: randomUUID() },
    };
    const events = await rpc.run(
        Stream.runCollect(rpc.client["host.stop"](stop)),
    );
    expect(events).toContainEqual(
        expect.objectContaining({
            type: "result",
            result: expect.objectContaining({
                requestId: stop.input.requestId,
                command: "host.stop",
                state: "succeeded",
                targets: [
                    {
                        agentKey: "a",
                        terminalId: null,
                        state: "stopped",
                        error: null,
                    },
                ],
            }),
        }),
    );
    expect(
        await rpc.run(
            Effect.flip(Stream.runCollect(rpc.client["host.stop"](stop))),
        ),
    ).toMatchObject({ code: "result_expired" });
});

it("uses a real Effect RPC WebSocket for sessions, atomic commands, matching deltas and reconnect snapshots", async (t) => {
    const harness = await startTestDaemon();
    t.onTestFinished(() => harness.close());
    const stored = panel();
    await harness.daemon.services.db.hostState.createPanel(stored);
    await harness.daemon.services.appState.update({ panel: stored.id });
    const protocol = RpcClient.layerProtocolSocket({
        retryTransientErrors: false,
    }).pipe(
        Layer.provide(
            NodeSocket.layerWebSocket(
                harness.webUrl("/api/rpc").replace("http:", "ws:"),
            ),
        ),
        Layer.provide(RpcSerialization.layerJson),
    );
    await Effect.runPromise(
        Effect.scoped(
            Effect.gen(function* () {
                const client = yield* RpcClient.make(ApplicationRpc);
                const session = yield* client["session.open"]();
                expect(session.checkpoint).toBe(0);
                const events = yield* Queue.make<ApplicationEvent>();
                const subscription = yield* Effect.forkChild(
                    Stream.runForEach(
                        client["state.subscribe"]({
                            clientSessionId: session.clientSessionId,
                        }),
                        (event) => Queue.offer(events, event),
                    ),
                );
                const initial = yield* Queue.take(events);
                expect(initial).toMatchObject({
                    type: "snapshot",
                    snapshot: {
                        epoch: session.epoch,
                        panels: [{ name: "Before" }],
                    },
                });
                const input = {
                    clientSessionId: session.clientSessionId,
                    requestId: randomUUID(),
                    sequence: 1,
                    panelId: stored.id,
                    changes: [{ type: "panel.rename" as const, name: "After" }],
                };
                const answer = yield* client["panel.command"](input);
                expect(answer).toMatchObject({
                    checkpoint: 1,
                    result: {
                        requestId: input.requestId,
                        panel: { name: "After" },
                    },
                });
                const delta = yield* Queue.take(events);
                expect(answer.state).toEqual(delta);
                expect(delta).toMatchObject({
                    type: "delta",
                    epoch: session.epoch,
                });
                const duplicate = yield* Effect.flip(
                    client["panel.command"](input),
                );
                expect(duplicate).toMatchObject({
                    code: "result_expired",
                    checkpoint: 1,
                });
                yield* Fiber.interrupt(subscription);
                const reconnect = yield* Stream.toPull(
                    client["state.subscribe"]({
                        clientSessionId: session.clientSessionId,
                    }),
                );
                const latest = (yield* reconnect)[0]!;
                expect(latest).toMatchObject({
                    type: "snapshot",
                    snapshot: { panels: [{ name: "After" }] },
                });
                expect(
                    yield* client["session.resume"]({
                        clientSessionId: session.clientSessionId,
                    }),
                ).toMatchObject({ checkpoint: 1 });
                expect(
                    yield* Effect.flip(
                        client["session.resume"]({
                            clientSessionId: randomUUID(),
                        }),
                    ),
                ).toMatchObject({ code: "session_expired" });
            }),
        ).pipe(Effect.provide(protocol)),
    );
});

it("orders transient CLI reveal after target state, without replaying it on reconnect", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    const rpc = await openTestApplication(h);
    t.onTestFinished(() => rpc.close());
    await rpc.next();
    const target = panel();
    target.layout = { type: "pane", id: "pane", tabIds: ["tab"] };
    target.tabs = [
        {
            id: "tab",
            label: "Agent",
            agentKey: null,
            terminalId: null,
            runtimeId: null,
            presentation: "preparing",
            notice: null,
        },
    ];
    await h.daemon.services.db.hostState.createPanel(target);
    await h.daemon.services.appState.update({ panel: target.id });
    await h.daemon.services.appState.reveal("caller", target.id, "tab");
    expect(await rpc.next()).toMatchObject({
        type: "delta",
        changes: [{ resource: "panel", id: target.id }],
    });
    expect(await rpc.next()).toMatchObject({
        type: "reveal",
        sourceTerminalId: "caller",
        panelId: target.id,
        tabId: "tab",
    });
    const reconnect = await openTestApplication(h);
    t.onTestFinished(() => reconnect.close());
    expect(await reconnect.next()).toMatchObject({
        type: "snapshot",
        snapshot: { panels: [{ id: target.id }] },
    });
});
