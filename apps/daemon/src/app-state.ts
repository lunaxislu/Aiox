import { randomUUID } from "node:crypto";

import { logger } from "@aiox/diagnostics";
import type { AioxDatabase, PersistentNetwork } from "@aiox/persistence";
import {
    webChangeSchema,
    type CleanupView,
    type HostNetworkView,
    type HostView,
    type PanelView,
    type WebChange,
    type WebNotificationView,
    type WebSequenceFailure,
    type WebSnapshot,
} from "@aiox/protocol";
import type {
    ApplicationDelta,
    ApplicationEvent,
    ApplicationFault,
} from "@aiox/protocol";
import {
    Cause,
    Effect,
    Fiber,
    Queue,
    Schedule,
    Semaphore,
    Stream,
} from "effect";

import type { RuntimeRecord } from "./runtimes";
import type { TerminalService } from "./terminals";
import {
    agentView,
    networkView,
    projectHost,
    projectHostNetwork,
    projectPanel,
    terminalView,
} from "./web-state";

type Resource = WebChange["resource"];
type Upsert = Extract<WebChange, { action: "upsert" }>;
type ViewOf<R extends Resource> = Extract<Upsert, { resource: R }>["value"];
/** What a producer changed; the store re-reads or re-projects only these and what derives from them. */
export type AppChange =
    | { panel: string }
    | { host: string }
    | { network: string }
    | { runtime: string }
    | { terminal: string }
    | { cleanup: string }
    | { notification: WebNotificationView }
    | { notificationsRead: readonly string[] }
    | { notifications: "reload" };
export type AppSources = {
    db: AioxDatabase;
    runtimes: {
        get(id: string): RuntimeRecord | undefined;
        list(): RuntimeRecord[];
    };
    terminals: Pick<TerminalService, "view" | "views">;
    cleanups: {
        view(id: string): CleanupView | undefined;
        list(): CleanupView[];
    };
};
type Client = Queue.Queue<ApplicationEvent, ApplicationFault>;

/** A slow reader that falls this far behind reconnects and restarts from a snapshot. */
const MAX_QUEUED_EVENTS = 256;
const order: Resource[] = [
    "host",
    "network",
    "panel",
    "terminal",
    "agent",
    "cleanup",
    "notification",
];
const plural = {
    host: "hosts",
    network: "networks",
    panel: "panels",
    terminal: "terminals",
    agent: "agents",
    cleanup: "cleanups",
    notification: "notifications",
} as const;

/**
 * The daemon's current Web application state. Built once from storage and live
 * services at startup, then kept current by producers naming what they changed
 * after their commit; normal changes never re-read or diff the whole state.
 * Terminal screen contents are not part of it; they travel over terminal WS.
 */
export class AppState {
    readonly epoch = randomUUID();
    readonly #hosts = new Map<string, HostView>();
    readonly #hostNetworks = new Map<string, HostNetworkView>();
    readonly #panels = new Map<string, PanelView>();
    readonly #networks = new Map<string, PersistentNetwork>();
    readonly #notifications = new Map<string, WebNotificationView>();
    /** Last terminal/Host of each runtime, so its removal still reaches what showed it. */
    readonly #links = new Map<
        string,
        { terminalId: string | null; hostId: string | null }
    >();
    readonly #published = new Map<string, { value: Upsert; json: string }>();
    readonly #clients = new Set<Client>();
    #mutex = Semaphore.makeUnsafe(1);
    #version = 0;
    #recovery: Fiber.Fiber<void> | undefined;
    #broken: unknown;
    #closed = false;

    constructor(private readonly sources: AppSources) {}

    /** Full build: daemon start and recovery after a failed apply only. */
    rebuild(): Promise<void> {
        return Effect.runPromise(this.#rebuild);
    }

    readonly #rebuild = Effect.gen({ self: this }, function* () {
        const { db } = this.sources;
        const stored = yield* Effect.tryPromise({
            try: () => db.hostState.snapshot(),
            catch: (error) => error,
        });
        const networks = yield* Effect.tryPromise({
            try: () => db.networks.list(),
            catch: (error) => error,
        });
        const notifications = yield* Effect.tryPromise({
            try: () => db.messages.unreadNotifications(),
            catch: (error) => error,
        });
        for (const map of [
            this.#hosts,
            this.#hostNetworks,
            this.#panels,
            this.#networks,
            this.#notifications,
        ])
            map.clear();
        for (const host of stored.hosts) this.#hosts.set(host.id, host);
        for (const n of stored.networks) this.#hostNetworks.set(n.id, n);
        for (const panel of stored.panels) this.#panels.set(panel.id, panel);
        for (const n of networks) this.#networks.set(n.id, n);
        for (const n of notifications)
            if (n.originExecutionOwnership === "daemon")
                this.#notifications.set(n.id, notificationView(n));
        this.#published.clear();
        this.#links.clear();
        const keys = [
            ...[...this.#hosts.keys()].map((id) => `host:${id}`),
            ...[...this.#hostNetworks.keys(), ...this.#networks.keys()].map(
                (id) => `network:${id}`,
            ),
            ...[...this.#panels.keys()].map((id) => `panel:${id}`),
            ...this.sources.terminals.views().map((t) => `terminal:${t.id}`),
            ...this.sources.runtimes.list().map((r) => `agent:${r.id}`),
            ...this.sources.cleanups.list().map((c) => `cleanup:${c.id}`),
            ...[...this.#notifications.keys()].map(
                (id) => `notification:${id}`,
            ),
        ];
        this.#project(keys);
        this.#broken = undefined;
    });

    /** Serialize committed projections; a failed projection disconnects viewers for reconciliation. */
    update(...changes: AppChange[]): Promise<ApplicationDelta | undefined> {
        return Effect.runPromise(this.updateEffect(...changes));
    }

    updateEffect(...changes: AppChange[]) {
        return this.#run(
            this.#apply(changes).pipe(
                Effect.map((changes) => this.#send(changes)),
            ),
        );
    }

    #run<A>(step: Effect.Effect<A, unknown>): Effect.Effect<A | undefined> {
        return this.#mutex.withPermit(
            Effect.gen({ self: this }, function* () {
                if (this.#closed) return;
                if (this.#broken !== undefined) yield* this.#recover;
                return yield* step;
            }).pipe(
                Effect.catch((error) =>
                    Effect.gen({ self: this }, function* () {
                        this.#fail(error);
                        if (!this.#recovery) {
                            const fiber = yield* Effect.forkDetach(
                                this.#mutex
                                    .withPermit(this.#recover)
                                    .pipe(
                                        Effect.catch((error) =>
                                            Effect.sync(() =>
                                                logger.error(
                                                    { err: error },
                                                    "Web state recovery failed",
                                                ),
                                            ),
                                        ),
                                    ),
                            );
                            this.#recovery = fiber;
                            fiber.addObserver(() => {
                                if (this.#recovery === fiber)
                                    this.#recovery = undefined;
                            });
                        }
                        return undefined;
                    }),
                ),
            ),
        );
    }

    /** Current projected DTO of one resource, as the snapshot shows it. */
    view<R extends Resource>(resource: R, id: string): ViewOf<R> | undefined {
        return this.#published.get(`${resource}:${id}`)?.value.value as
            | ViewOf<R>
            | undefined;
    }
    /** Waits for queued changes and recovers a failed state before an explicit read. */
    current(): Promise<WebSnapshot> {
        return Effect.runPromise(this.currentEffect);
    }
    readonly currentEffect = Effect.gen({ self: this }, function* () {
        yield* this.#run(Effect.void);
        if (this.#broken !== undefined) return yield* Effect.fail(this.#broken);
        return this.snapshot();
    });

    snapshot(): WebSnapshot {
        const snapshot = Object.fromEntries(
            order.map((resource) => [plural[resource], [] as unknown[]]),
        ) as Record<string, unknown[]>;
        for (const { value } of this.#published.values())
            snapshot[plural[value.resource]]!.push(value.value);
        return { epoch: this.epoch, ...snapshot } as WebSnapshot;
    }

    /** Snapshot capture and subscription registration share the projection lock. */
    readonly events = Stream.unwrap(
        Effect.gen({ self: this }, function* () {
            const client = yield* Queue.make<
                ApplicationEvent,
                ApplicationFault
            >({ capacity: MAX_QUEUED_EVENTS, strategy: "dropping" });
            yield* Effect.acquireRelease(
                this.#mutex.withPermit(
                    Effect.gen({ self: this }, function* () {
                        if (this.#closed)
                            return yield* Effect.fail({
                                code: "stopping",
                                message: "Daemon is closing.",
                            });
                        if (this.#broken !== undefined)
                            yield* this.#recover.pipe(
                                Effect.mapError((error) => ({
                                    code: "storage_error",
                                    message: String(error),
                                })),
                            );
                        Queue.offerUnsafe(client, {
                            type: "snapshot",
                            version: this.#version,
                            snapshot: this.snapshot(),
                        });
                        this.#clients.add(client);
                        return client;
                    }),
                ),
                (client) =>
                    Effect.sync(() => {
                        this.#clients.delete(client);
                        Queue.shutdownUnsafe(client);
                    }),
            );
            return Stream.fromQueue(client);
        }),
    );

    sequenceFailure(failure: WebSequenceFailure): void {
        this.#enqueue({ type: "sequence-failure", failure });
    }

    close(): void {
        this.#closed = true;
        if (this.#recovery) Effect.runFork(Fiber.interrupt(this.#recovery));
        for (const client of this.#clients) Queue.shutdownUnsafe(client);
        this.#clients.clear();
    }

    #fail(error: unknown): void {
        logger.error({ err: error }, "Web state update failed");
        this.#broken = error;
        const fault = {
            code: "storage_error",
            message: error instanceof Error ? error.message : String(error),
        };
        for (const client of this.#clients)
            Queue.failCauseUnsafe(client, Cause.fail(fault));
        this.#clients.clear();
    }

    readonly #recover = this.#rebuild.pipe(
        Effect.tap(() =>
            Effect.sync(() => {
                this.#version++;
            }),
        ),
        Effect.retry({
            schedule: Schedule.exponential("100 millis"),
            times: 4,
            while: () => !this.#closed,
        }),
    );

    #apply(changes: AppChange[]) {
        return Effect.gen({ self: this }, function* () {
            const { db, runtimes } = this.sources;
            const keys = new Set<string>();
            const panelsShowing = (terminalId: string | null) => {
                if (terminalId === null) return;
                for (const panel of this.#panels.values())
                    if (panel.tabs.some((t) => t.terminalId === terminalId))
                        keys.add(`panel:${panel.id}`);
            };
            for (const change of changes) {
                if ("panel" in change) {
                    const panel = yield* Effect.tryPromise({
                        try: () => db.hostState.getPanel(change.panel),
                        catch: (error) => error,
                    });
                    if (panel) this.#panels.set(panel.id, panel);
                    else this.#panels.delete(change.panel);
                    keys.add(`panel:${change.panel}`);
                } else if ("host" in change) {
                    const host = yield* Effect.tryPromise({
                        try: () => db.hostState.getHost(change.host),
                        catch: (error) => error,
                    });
                    const previous = this.#hosts.get(change.host);
                    for (const n of this.#hostNetworks.values())
                        if (n.hostId === change.host) {
                            this.#hostNetworks.delete(n.id);
                            keys.add(`network:${n.id}`);
                        }
                    if (host) {
                        this.#hosts.set(host.id, host);
                        const network = yield* Effect.tryPromise({
                            try: () => db.hostState.getNetwork(host.networkId),
                            catch: (error) => error,
                        });
                        if (network)
                            this.#hostNetworks.set(network.id, network);
                        keys.add(`network:${host.networkId}`);
                        // Restart commands in the Host panel follow the applied source.
                        keys.add(`panel:${host.panelId}`);
                    } else this.#hosts.delete(change.host);
                    if (previous) keys.add(`panel:${previous.panelId}`);
                    keys.add(`host:${change.host}`);
                } else if ("network" in change) {
                    const network = yield* Effect.tryPromise({
                        try: () => db.networks.get(change.network),
                        catch: (error) => error,
                    });
                    if (network) this.#networks.set(network.id, network);
                    else this.#networks.delete(change.network);
                    keys.add(`network:${change.network}`);
                    for (const r of runtimes.list())
                        if (r.networkId === change.network)
                            keys.add(`agent:${r.id}`);
                } else if ("runtime" in change) {
                    const record = runtimes.get(change.runtime);
                    const previous = this.#links.get(change.runtime);
                    keys.add(`agent:${change.runtime}`);
                    for (const link of [previous, record])
                        if (link) {
                            panelsShowing(link.terminalId);
                            if (link.terminalId)
                                keys.add(`terminal:${link.terminalId}`);
                            const host =
                                link.hostId === null
                                    ? undefined
                                    : this.#hosts.get(link.hostId);
                            if (host) {
                                keys.add(`host:${host.id}`);
                                keys.add(`network:${host.networkId}`);
                            }
                        }
                    for (const n of this.#networks.values())
                        if (
                            n.routes.some(
                                (r) =>
                                    r.from === change.runtime ||
                                    r.to === change.runtime,
                            )
                        )
                            keys.add(`network:${n.id}`);
                } else if ("terminal" in change)
                    keys.add(`terminal:${change.terminal}`);
                else if ("cleanup" in change)
                    keys.add(`cleanup:${change.cleanup}`);
                else if ("notification" in change) {
                    this.#notifications.set(
                        change.notification.id,
                        change.notification,
                    );
                    keys.add(`notification:${change.notification.id}`);
                } else if ("notificationsRead" in change) {
                    for (const id of change.notificationsRead) {
                        this.#notifications.delete(id);
                        keys.add(`notification:${id}`);
                    }
                } else {
                    const before = [...this.#notifications.keys()];
                    this.#notifications.clear();
                    for (const n of yield* Effect.tryPromise({
                        try: () => db.messages.unreadNotifications(),
                        catch: (error) => error,
                    }))
                        if (n.originExecutionOwnership === "daemon")
                            this.#notifications.set(n.id, notificationView(n));
                    for (const id of [...before, ...this.#notifications.keys()])
                        keys.add(`notification:${id}`);
                }
            }
            return this.#project(keys);
        });
    }

    /** Re-projects the named DTOs and returns the ones that actually changed. */
    #project(keys: Iterable<string>): WebChange[] {
        const { runtimes } = this.sources;
        const names = new Map(
            [...this.#networks.values(), ...this.#hostNetworks.values()].map(
                (n) => [n.id, n.name],
            ),
        );
        const result: WebChange[] = [];
        for (const key of keys) {
            const split = key.indexOf(":");
            const resource = key.slice(0, split) as Resource;
            const id = key.slice(split + 1);
            let value: unknown;
            if (resource === "panel") {
                const panel = this.#panels.get(id);
                value =
                    panel &&
                    projectPanel(
                        panel,
                        runtimes,
                        panel.hostId === null
                            ? undefined
                            : this.#hosts.get(panel.hostId),
                    );
            } else if (resource === "host") {
                const host = this.#hosts.get(id);
                value = host && projectHost(host, runtimes);
            } else if (resource === "network") {
                const managed = this.#hostNetworks.get(id);
                const persistent = this.#networks.get(id);
                value = managed
                    ? projectHostNetwork(managed, runtimes)
                    : persistent && networkView(persistent, runtimes);
            } else if (resource === "terminal")
                value = terminalView(this.sources, id);
            else if (resource === "agent") {
                const record = runtimes.get(id);
                if (record)
                    this.#links.set(id, {
                        terminalId: record.terminalId,
                        hostId: record.hostId,
                    });
                else this.#links.delete(id);
                value = record && agentView(record, names);
            } else if (resource === "cleanup")
                value = this.sources.cleanups.view(id);
            else value = this.#notifications.get(id);
            const previous = this.#published.get(key);
            if (value === undefined) {
                if (!previous) continue;
                this.#published.delete(key);
                result.push({ resource, action: "remove", id });
                continue;
            }
            const json = JSON.stringify(value);
            if (previous?.json === json) continue;
            // Validate at the wire boundary, only what changed.
            const change = webChangeSchema.parse({
                resource,
                action: "upsert",
                id,
                value,
            }) as Upsert;
            this.#published.set(key, { value: change, json });
            result.push(change);
        }
        return result;
    }

    #send(changes: readonly WebChange[]): ApplicationDelta | undefined {
        if (!changes.length) return;
        const delta: ApplicationDelta = {
            type: "delta",
            epoch: this.epoch,
            version: ++this.#version,
            changes,
        };
        this.#enqueue(delta);
        return delta;
    }

    #enqueue(item: ApplicationEvent): void {
        for (const client of this.#clients) {
            if (!Queue.offerUnsafe(client, item)) {
                Queue.failCauseUnsafe(
                    client,
                    Cause.fail({
                        code: "slow_consumer",
                        message:
                            "State queue overflowed. Reconnect for a current snapshot.",
                    }),
                );
                this.#clients.delete(client);
            }
        }
    }
}

function notificationView(n: {
    id: string;
    originRuntimeId: string;
    originTerminalId: string | null;
    body: string;
    createdAt: number;
    readAt: number | null;
}): WebNotificationView {
    return {
        id: n.id,
        originRuntimeId: n.originRuntimeId,
        terminalId: n.originTerminalId,
        body: n.body,
        createdAt: n.createdAt,
        readAt: n.readAt,
    };
}
