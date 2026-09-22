import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";

import type { DeliveryOutcome, DirectedRoute } from "@aiox/domain";
import Database from "better-sqlite3";
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import {
    drizzle,
    type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";

import { HOST_MEMBER_TRIGGER } from "./host-schema";
import { hostState, type HostState } from "./host-state";
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
import { SCHEMA_SQL } from "./schema.generated";

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
    /** A synchronous update reads the current routing inside the same DB operation. */
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
    readonly operations?: number;
};

export interface MessageHistory {
    /** One message and its per-target deliveries, or neither of them. */
    record(
        message: MessageRow,
        deliveries: readonly DeliveryRow[],
    ): Promise<void>;
    /** How the daemon turns a vendor completion back into a delivery id. */
    deliveryFor(
        messageId: string,
        targetRuntimeId: string,
    ): Promise<DeliveryRow | undefined>;
    delivery(id: string): Promise<DeliveryRow | undefined>;
    deliveriesFor(messageId: string): Promise<DeliveryRow[]>;
    /** Outcome and required notification commit together; false if unknown or already terminal. */
    settle(
        deliveryId: string,
        outcome: DeliveryOutcome,
        at: number,
        error?: string,
        notification?: Omit<NotificationRow, "deliveryId">,
    ): Promise<boolean>;
    unreadNotifications(): Promise<NotificationRow[]>;
    markRead(ids: readonly string[], at: number): Promise<void>;
    /** Retention. The caller owns the retention window; this takes its edge. */
    purgeBefore(cutoffMs: number): Promise<PurgeCounts>;
}

export interface AioxDatabase {
    readonly hostState: HostState;
    readonly networks: PersistentNetworks;
    readonly messages: MessageHistory;
    close(): Promise<void>;
}

function networks(db: BetterSQLite3Database): PersistentNetworks {
    const get = (id: string): PersistentNetwork | undefined => {
        const row = db
            .select()
            .from(NetworkEntity)
            .where(eq(NetworkEntity.id, id))
            .get();
        if (!row) return undefined;
        const routes = db
            .select({ from: RouteEntity.sourceId, to: RouteEntity.targetId })
            .from(RouteEntity)
            .where(eq(RouteEntity.networkId, id))
            .orderBy(asc(RouteEntity.sourceId), asc(RouteEntity.targetId))
            .all();
        return { ...row, routes };
    };
    return {
        async create(input) {
            db.insert(NetworkEntity).values(input).run();
        },
        async get(id) {
            return get(id);
        },
        async list() {
            return db
                .select()
                .from(NetworkEntity)
                .orderBy(asc(NetworkEntity.name))
                .all()
                .map(({ id }) => get(id)!);
        },
        async replaceRouting(id, update) {
            db.transaction((tx) => {
                const current = get(id);
                if (!current) throw new Error(`Network not found: ${id}`);
                const routing =
                    typeof update === "function" ? update(current) : update;
                tx.delete(RouteEntity)
                    .where(eq(RouteEntity.networkId, id))
                    .run();
                if (routing.routes.length)
                    tx.insert(RouteEntity)
                        .values(
                            routing.routes.map(({ from, to }) => ({
                                networkId: id,
                                sourceId: from,
                                targetId: to,
                            })),
                        )
                        .run();
            });
        },
        async delete(id) {
            return (
                db.delete(NetworkEntity).where(eq(NetworkEntity.id, id)).run()
                    .changes === 1
            );
        },
    };
}

function messages(db: BetterSQLite3Database): MessageHistory {
    return {
        async record(message, deliveries) {
            db.transaction((tx) => {
                tx.insert(MessageEntity).values(message).run();
                if (deliveries.length)
                    tx.insert(DeliveryEntity)
                        .values([...deliveries])
                        .run();
            });
        },
        async deliveryFor(messageId, targetRuntimeId) {
            return db
                .select()
                .from(DeliveryEntity)
                .where(
                    and(
                        eq(DeliveryEntity.messageId, messageId),
                        eq(DeliveryEntity.targetRuntimeId, targetRuntimeId),
                    ),
                )
                .get();
        },
        async delivery(id) {
            return db
                .select()
                .from(DeliveryEntity)
                .where(eq(DeliveryEntity.id, id))
                .get();
        },
        async deliveriesFor(messageId) {
            return db
                .select()
                .from(DeliveryEntity)
                .where(eq(DeliveryEntity.messageId, messageId))
                .orderBy(asc(DeliveryEntity.id))
                .all();
        },
        async settle(deliveryId, outcome, at, error, notification) {
            return db.transaction((tx) => {
                const changed = tx
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
                    .run().changes;
                if (!changed) return false;
                if (notification)
                    tx.insert(NotificationEntity)
                        .values({ ...notification, deliveryId })
                        .run();
                return true;
            });
        },
        async unreadNotifications() {
            return db
                .select()
                .from(NotificationEntity)
                .where(isNull(NotificationEntity.readAt))
                .orderBy(
                    asc(NotificationEntity.createdAt),
                    asc(NotificationEntity.id),
                )
                .all();
        },
        async markRead(ids, at) {
            if (ids.length)
                db.update(NotificationEntity)
                    .set({ readAt: at })
                    .where(inArray(NotificationEntity.id, [...ids]))
                    .run();
        },
        async purgeBefore(cutoffMs) {
            return db.transaction((tx) => {
                // Every target must be terminal, and the last completion older than the cutoff.
                const ids = tx
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
                    .all()
                    .map(({ id }) => id);
                if (!ids.length)
                    return { messages: 0, deliveries: 0, notifications: 0 };
                const deliveryIds = tx
                    .select({ id: DeliveryEntity.id })
                    .from(DeliveryEntity)
                    .where(inArray(DeliveryEntity.messageId, ids))
                    .all()
                    .map(({ id }) => id);
                const notifications = tx
                    .select({ count: count() })
                    .from(NotificationEntity)
                    .where(inArray(NotificationEntity.deliveryId, deliveryIds))
                    .get()!.count;
                tx.delete(MessageEntity)
                    .where(inArray(MessageEntity.id, ids))
                    .run();
                return {
                    messages: ids.length,
                    deliveries: deliveryIds.length,
                    notifications,
                };
            });
        },
    };
}

/** Current schema only; opening never upgrades or resets an older database. */
export async function openDatabase(path: string): Promise<AioxDatabase> {
    if (!isAbsolute(path)) throw new Error("Database path must be absolute");
    mkdirSync(dirname(path), { recursive: true });
    const client = new Database(path);
    try {
        client.pragma("foreign_keys = ON");
        client.pragma("journal_mode = WAL");
        client.transaction(() => {
            client.exec(SCHEMA_SQL);
            client.exec(HOST_MEMBER_TRIGGER);
        })();
        const db = drizzle(client);
        // Each public async method completes all synchronous DB work before yielding.
        // Thus reads and close cannot enter another call's unfinished transaction.
        return {
            hostState: hostState(db),
            networks: networks(db),
            messages: messages(db),
            async close() {
                client.close();
            },
        };
    } catch (error) {
        client.close();
        throw error;
    }
}
