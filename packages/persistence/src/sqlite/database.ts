import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";

import type { DeliveryOutcome, DirectedRoute } from "@aiox/domain";
import * as Sqlite from "@effect/sql-sqlite-node/SqliteClient";
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import * as Drizzle from "drizzle-orm/effect-sqlite-node";
import { Cause, Effect, ManagedRuntime } from "effect";

import {
    HOST_MEMBER_TRIGGER,
    PanelEntity,
    PanelTabEntity,
    DeletedIdEntity,
} from "./host-schema";
import { hostState, HostStateError, type HostState } from "./host-state";
import {
    DeliveryEntity,
    type DeliveryRow,
    MessageEntity,
    type MessageRow,
    NetworkEntity,
    NotificationEntity,
    type NotificationRow,
    RouteEntity,
} from "./schema";
import { SCHEMA_STATEMENTS } from "./schema.generated";

export type { DeliveryRow, MessageRow, NotificationRow };

export type PersistentNetwork = {
    readonly id: string;
    readonly name: string;
    readonly routes: readonly Pick<DirectedRoute, "from" | "to">[];
};

type Routing = Pick<PersistentNetwork, "routes">;

export interface PersistentNetworks {
    create(input: Omit<PersistentNetwork, "routes">): Promise<void>;
    get(id: string): Promise<PersistentNetwork | undefined>;
    list(): Promise<PersistentNetwork[]>;
    replaceRouting(
        id: string,
        routing: Routing | ((current: Routing) => Routing),
    ): Promise<void>;
    delete(id: string): Promise<boolean>;
}

export type PurgeCounts = {
    readonly messages: number;
    readonly deliveries: number;
    readonly notifications: number;
};

export interface MessageHistory {
    record(
        message: MessageRow,
        deliveries: readonly DeliveryRow[],
    ): Promise<void>;
    deliveryFor(
        messageId: string,
        targetRuntimeId: string,
    ): Promise<DeliveryRow | undefined>;
    delivery(id: string): Promise<DeliveryRow | undefined>;
    deliveriesFor(messageId: string): Promise<DeliveryRow[]>;
    settle(
        deliveryId: string,
        outcome: DeliveryOutcome,
        at: number,
        error?: string,
        notification?: Omit<NotificationRow, "deliveryId">,
    ): Promise<boolean>;
    unreadNotifications(): Promise<NotificationRow[]>;
    markRead(ids: readonly string[], at: number): Promise<void>;
    purgeBefore(cutoffMs: number): Promise<PurgeCounts>;
}

export interface AioxDatabase {
    readonly hostState: HostState;
    readonly networks: PersistentNetworks;
    readonly messages: MessageHistory;
    close(): Promise<void>;
}

type DatabaseRuntime = {
    readonly db: ReturnType<
        typeof Drizzle.makeWithDefaults
    > extends Effect.Effect<infer A, any, any>
        ? A
        : never;
    readonly run: <A, E>(
        effect: Effect.Effect<A, E, Sqlite.SqliteClient>,
    ) => Promise<A>;
    readonly close: () => Promise<void>;
};

function causeMessage(cause: unknown): string {
    if (cause instanceof Error) {
        const nested = cause.cause;
        return nested === undefined
            ? cause.message
            : `${cause.message}: ${causeMessage(nested)}`;
    }
    if (typeof cause === "object" && cause !== null) {
        const record = cause as {
            message?: unknown;
            reason?: unknown;
            cause?: unknown;
        };
        const parts = [record.message, record.reason].filter(
            (part): part is string => typeof part === "string",
        );
        if (record.cause !== undefined) parts.push(causeMessage(record.cause));
        return parts.join(": ") || String(cause);
    }
    return String(cause);
}

function sqliteCode(cause: unknown): string | undefined {
    if (typeof cause !== "object" || cause === null) return undefined;
    const record = cause as {
        _tag?: unknown;
        errcode?: unknown;
        code?: unknown;
        reason?: unknown;
        cause?: unknown;
        error?: unknown;
        failures?: readonly unknown[];
        reasons?: readonly unknown[];
    };
    if (
        record._tag === "UniqueViolation" ||
        record.errcode === 2067 ||
        record.errcode === 1555
    ) {
        return "SQLITE_CONSTRAINT_UNIQUE";
    }
    if (record._tag === "ForeignKeyViolation" || record.errcode === 787) {
        return "SQLITE_CONSTRAINT_FOREIGNKEY";
    }
    if (record.errcode === 275) return "SQLITE_CONSTRAINT_CHECK";
    if (record.errcode === 19) return "SQLITE_CONSTRAINT";
    if (typeof record.code === "string" && record.code.startsWith("SQLITE_"))
        return record.code;
    for (const failures of [record.failures, record.reasons]) {
        if (failures === undefined) continue;
        for (const failure of failures) {
            const code = sqliteCode(failure);
            if (code !== undefined) return code;
        }
    }
    return (
        sqliteCode(record.error) ??
        sqliteCode(record.reason) ??
        sqliteCode(record.cause)
    );
}

function hasSqliteFailure(cause: unknown): boolean {
    if (typeof cause !== "object" || cause === null) return false;
    const record = cause as {
        _tag?: unknown;
        code?: unknown;
        errcode?: unknown;
        cause?: unknown;
        error?: unknown;
        reason?: unknown;
        failures?: readonly unknown[];
        reasons?: readonly unknown[];
    };
    if (
        typeof record.errcode === "number" ||
        record.code === "ERR_SQLITE_ERROR" ||
        (typeof record._tag === "string" && record._tag.startsWith("SqlError"))
    )
        return true;
    return [
        ...(record.failures ?? []),
        ...(record.reasons ?? []),
        record.error,
        record.reason,
        record.cause,
    ].some(hasSqliteFailure);
}

function publicDatabaseError(
    cause: unknown,
    originalCause: unknown = cause,
): Error {
    if (!hasSqliteFailure(cause) && cause instanceof Error) return cause;
    const code = sqliteCode(cause);
    const error = new Error(causeMessage(cause), { cause: originalCause });
    if (code !== undefined) Object.assign(error, { code });
    return error;
}

function createRuntime(path: string): DatabaseRuntime {
    const runtime = ManagedRuntime.make(Sqlite.layer({ filename: path }));
    const run = <A, E>(effect: Effect.Effect<A, E, Sqlite.SqliteClient>) =>
        runtime.runPromise(
            effect.pipe(
                Effect.catchCause((cause) =>
                    Effect.fail(
                        publicDatabaseError(Cause.squash(cause), cause),
                    ),
                ),
            ) as Effect.Effect<A, any, never>,
        );
    const db = runtime.runSync(Drizzle.makeWithDefaults());
    return { db, run, close: () => runtime.dispose() };
}

export async function openDatabase(path: string): Promise<AioxDatabase> {
    if (!isAbsolute(path)) throw new Error("Database path must be absolute");
    mkdirSync(dirname(path), { recursive: true });
    const runtime = createRuntime(path);
    try {
        await runtime.run(
            Effect.gen(function* () {
                const client = yield* Sqlite.SqliteClient;
                yield* client.unsafe("PRAGMA foreign_keys = ON");
                yield* client.withTransaction(
                    Effect.forEach(
                        [...SCHEMA_STATEMENTS, HOST_MEMBER_TRIGGER],
                        (statement) => client.unsafe(statement),
                        { discard: true },
                    ),
                );
            }),
        );
    } catch (error) {
        await runtime.close();
        throw error;
    }

    const db = runtime.db;
    const networks: PersistentNetworks = {
        async create(input) {
            await runtime.run(
                db.transaction((tx) =>
                    Effect.gen(function* () {
                        yield* tx.insert(NetworkEntity).values(input).run();
                        yield* tx
                            .insert(PanelEntity)
                            .values({
                                id: input.id,
                                kind: "network",
                                section: "networks",
                                name: input.name,
                                hostId: null,
                                networkId: input.id,
                                revision: 1,
                                layoutJson: JSON.stringify({
                                    type: "pane",
                                    id: randomUUID(),
                                    tabIds: [],
                                }),
                            })
                            .run();
                    }),
                ),
            );
        },
        async get(id) {
            return runtime.run(
                Effect.gen(function* () {
                    const row = yield* db
                        .select()
                        .from(NetworkEntity)
                        .where(eq(NetworkEntity.id, id))
                        .get();
                    if (!row) return undefined;
                    const routes = yield* db
                        .select({
                            from: RouteEntity.sourceId,
                            to: RouteEntity.targetId,
                        })
                        .from(RouteEntity)
                        .where(eq(RouteEntity.networkId, id))
                        .orderBy(
                            asc(RouteEntity.sourceId),
                            asc(RouteEntity.targetId),
                        )
                        .all();
                    return { ...row, routes };
                }),
            );
        },
        async list() {
            return runtime.run(
                Effect.gen(function* () {
                    const rows = yield* db
                        .select()
                        .from(NetworkEntity)
                        .orderBy(asc(NetworkEntity.name))
                        .all();
                    const routes = yield* db
                        .select()
                        .from(RouteEntity)
                        .orderBy(
                            asc(RouteEntity.sourceId),
                            asc(RouteEntity.targetId),
                        )
                        .all();
                    const byNetwork = new Map<
                        string,
                        PersistentNetwork["routes"][number][]
                    >();
                    for (const {
                        networkId,
                        sourceId: from,
                        targetId: to,
                    } of routes) {
                        const edges = byNetwork.get(networkId) ?? [];
                        edges.push({ from, to });
                        byNetwork.set(networkId, edges);
                    }
                    return rows.map((row) => ({
                        ...row,
                        routes: byNetwork.get(row.id) ?? [],
                    }));
                }),
            );
        },
        async replaceRouting(id, update) {
            await runtime.run(
                db.transaction((tx) =>
                    Effect.gen(function* () {
                        const row = yield* tx
                            .select()
                            .from(NetworkEntity)
                            .where(eq(NetworkEntity.id, id))
                            .get();
                        if (!row) throw new Error(`Network not found: ${id}`);
                        const currentRoutes = yield* tx
                            .select({
                                from: RouteEntity.sourceId,
                                to: RouteEntity.targetId,
                            })
                            .from(RouteEntity)
                            .where(eq(RouteEntity.networkId, id))
                            .orderBy(
                                asc(RouteEntity.sourceId),
                                asc(RouteEntity.targetId),
                            )
                            .all();
                        const routing =
                            typeof update === "function"
                                ? update({ routes: currentRoutes })
                                : update;
                        yield* tx
                            .delete(RouteEntity)
                            .where(eq(RouteEntity.networkId, id))
                            .returning();
                        if (routing.routes.length)
                            yield* tx
                                .insert(RouteEntity)
                                .values(
                                    routing.routes.map(({ from, to }) => ({
                                        networkId: id,
                                        sourceId: from,
                                        targetId: to,
                                    })),
                                )
                                .returning();
                    }),
                ),
            );
        },
        async delete(id) {
            const rows = await runtime.run(
                db.transaction((tx) =>
                    Effect.gen(function* () {
                        const tab = yield* tx
                            .select({ id: PanelTabEntity.id })
                            .from(PanelTabEntity)
                            .where(eq(PanelTabEntity.panelId, id))
                            .get();
                        if (tab)
                            throw new HostStateError(
                                "network_in_use",
                                "Network panel is not empty. Close its tabs before deleting the Network.",
                            );
                        const rows = yield* tx
                            .delete(NetworkEntity)
                            .where(eq(NetworkEntity.id, id))
                            .returning({ id: NetworkEntity.id });
                        if (rows.length) {
                            yield* tx
                                .insert(DeletedIdEntity)
                                .values({ id, kind: "panel" })
                                .onConflictDoNothing()
                                .run();
                            yield* tx
                                .delete(PanelEntity)
                                .where(eq(PanelEntity.id, id))
                                .run();
                        }
                        return rows;
                    }),
                ),
            );
            return rows.length === 1;
        },
    };

    const messages: MessageHistory = {
        async record(message, deliveries) {
            await runtime.run(
                db.transaction((tx) =>
                    Effect.gen(function* () {
                        yield* tx
                            .insert(MessageEntity)
                            .values(message)
                            .returning();
                        if (deliveries.length)
                            yield* tx
                                .insert(DeliveryEntity)
                                .values([...deliveries])
                                .returning();
                    }),
                ),
            );
        },
        async deliveryFor(messageId, targetRuntimeId) {
            return runtime.run(
                db
                    .select()
                    .from(DeliveryEntity)
                    .where(
                        and(
                            eq(DeliveryEntity.messageId, messageId),
                            eq(DeliveryEntity.targetRuntimeId, targetRuntimeId),
                        ),
                    )
                    .get(),
            );
        },
        async delivery(id) {
            return runtime.run(
                db
                    .select()
                    .from(DeliveryEntity)
                    .where(eq(DeliveryEntity.id, id))
                    .get(),
            );
        },
        async deliveriesFor(messageId) {
            return runtime.run(
                db
                    .select()
                    .from(DeliveryEntity)
                    .where(eq(DeliveryEntity.messageId, messageId))
                    .orderBy(asc(DeliveryEntity.id))
                    .all(),
            );
        },
        async settle(deliveryId, outcome, at, error, notification) {
            return runtime.run(
                db.transaction((tx) =>
                    Effect.gen(function* () {
                        const changed = yield* tx
                            .update(DeliveryEntity)
                            .set({
                                outcome,
                                outcomeAt: at,
                                outcomeError: error ?? null,
                            })
                            .where(
                                and(
                                    eq(DeliveryEntity.id, deliveryId),
                                    isNull(DeliveryEntity.outcome),
                                ),
                            )
                            .returning({ id: DeliveryEntity.id });
                        if (!changed.length) return false;
                        if (notification)
                            yield* tx
                                .insert(NotificationEntity)
                                .values({ ...notification, deliveryId })
                                .returning();
                        return true;
                    }),
                ),
            );
        },
        async unreadNotifications() {
            return runtime.run(
                db
                    .select()
                    .from(NotificationEntity)
                    .where(isNull(NotificationEntity.readAt))
                    .orderBy(
                        asc(NotificationEntity.createdAt),
                        asc(NotificationEntity.id),
                    )
                    .all(),
            );
        },
        async markRead(ids, at) {
            if (ids.length)
                await runtime.run(
                    db
                        .update(NotificationEntity)
                        .set({ readAt: at })
                        .where(inArray(NotificationEntity.id, [...ids]))
                        .returning({ id: NotificationEntity.id }),
                );
        },
        async purgeBefore(cutoffMs) {
            return runtime.run(
                db.transaction((tx) =>
                    Effect.gen(function* () {
                        const ids = (yield* tx
                            .select({ id: MessageEntity.id })
                            .from(MessageEntity)
                            .innerJoin(
                                DeliveryEntity,
                                eq(DeliveryEntity.messageId, MessageEntity.id),
                            )
                            .groupBy(MessageEntity.id)
                            .having(
                                sql`count(*) = count(${DeliveryEntity.outcome}) AND max(${DeliveryEntity.outcomeAt}) < ${cutoffMs}`,
                            )
                            .all()).map(({ id }) => id);
                        if (!ids.length)
                            return {
                                messages: 0,
                                deliveries: 0,
                                notifications: 0,
                            };
                        const deliveryIds = (yield* tx
                            .select({ id: DeliveryEntity.id })
                            .from(DeliveryEntity)
                            .where(inArray(DeliveryEntity.messageId, ids))
                            .all()).map(({ id }) => id);
                        const notificationCounts = yield* tx
                            .select({ notificationCount: count() })
                            .from(NotificationEntity)
                            .where(
                                inArray(
                                    NotificationEntity.deliveryId,
                                    deliveryIds,
                                ),
                            )
                            .all();
                        yield* tx
                            .delete(MessageEntity)
                            .where(inArray(MessageEntity.id, ids))
                            .returning({ id: MessageEntity.id });
                        return {
                            messages: ids.length,
                            deliveries: deliveryIds.length,
                            notifications:
                                notificationCounts[0]?.notificationCount ?? 0,
                        };
                    }),
                ),
            );
        },
    };
    return {
        hostState: hostState(db, runtime.run),
        networks,
        messages,
        close: runtime.close,
    };
}
