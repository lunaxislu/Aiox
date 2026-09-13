import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";

import type { DeliveryOutcome, DirectedRoute, RoutePolicy } from "@aiox/domain";
import { DataSource, type FindOptionsWhere, In, IsNull } from "typeorm";

import {
    DeliveryEntity,
    type DeliveryRow,
    ENTITIES,
    MessageEntity,
    type MessageRow,
    SCHEMA,
    NetworkEntity,
    NotificationEntity,
    type NotificationRow,
    RouteEntity,
} from "@/sqlite/schema";

export type { DeliveryRow, MessageRow, NotificationRow };

export type PersistentNetwork = {
    readonly id: string;
    readonly name: string;
    readonly defaultPolicy: RoutePolicy;
    readonly routes: readonly DirectedRoute[];
};

type Routing = Pick<PersistentNetwork, "defaultPolicy" | "routes">;

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
    readonly networks: PersistentNetworks;
    readonly messages: MessageHistory;
    close(): Promise<void>;
}

/**
 * A message is purgeable only once every one of its targets reached a terminal
 * outcome and the last of them is older than the cutoff. `COUNT(outcome)`
 * skips nulls, so a single in-flight target keeps the whole message.
 */
const PURGEABLE_MESSAGES = `
SELECT m.id AS id
FROM messages m
JOIN deliveries d ON d.message_id = m.id
GROUP BY m.id
HAVING COUNT(*) = COUNT(d.outcome) AND MAX(d.outcome_at) < ?`;

function networks(dataSource: DataSource): PersistentNetworks {
    const manager = dataSource.manager;
    const routesOf = async (id: string): Promise<DirectedRoute[]> => {
        const rows = await manager.find(RouteEntity, {
            where: { networkId: id },
            order: { sourceId: "ASC", targetId: "ASC" },
        });
        return rows.map(({ sourceId, targetId, policy }) => ({
            from: sourceId,
            to: targetId,
            policy,
        }));
    };
    const get = async (id: string): Promise<PersistentNetwork | undefined> => {
        const row = await manager.findOne(NetworkEntity, { where: { id } });
        return row === null
            ? undefined
            : {
                  id: row.id,
                  name: row.name,
                  defaultPolicy: row.defaultPolicy,
                  routes: await routesOf(id),
              };
    };

    return {
        create: async (input) => {
            await manager.insert(NetworkEntity, input);
        },
        get,
        list: async () => {
            const rows = await manager.find(NetworkEntity, {
                order: { name: "ASC" },
            });
            return Promise.all(rows.map(async ({ id }) => (await get(id))!));
        },
        replaceRouting: (id, update) =>
            dataSource.transaction(async (m) => {
                const current = await get(id);
                if (!current) throw new Error(`Network not found: ${id}`);
                const routing =
                    typeof update === "function" ? update(current) : update;
                await m.update(NetworkEntity, id, {
                    defaultPolicy: routing.defaultPolicy,
                });
                await m.delete(RouteEntity, { networkId: id });
                if (routing.routes.length === 0) return;
                await m.insert(
                    RouteEntity,
                    routing.routes.map((route) => ({
                        networkId: id,
                        sourceId: route.from,
                        targetId: route.to,
                        policy: route.policy,
                    })),
                );
            }),
        delete: async (id) =>
            (await manager.delete(NetworkEntity, id)).affected === 1,
    };
}

function messages(dataSource: DataSource): MessageHistory {
    const manager = dataSource.manager;
    const deliveries = async (
        where: FindOptionsWhere<DeliveryRow>,
    ): Promise<DeliveryRow[]> =>
        manager.find(DeliveryEntity, { where, order: { id: "ASC" } });

    return {
        record: (message, rows) =>
            dataSource.transaction(async (m) => {
                await m.insert(MessageEntity, message);
                if (rows.length > 0) await m.insert(DeliveryEntity, [...rows]);
            }),
        deliveryFor: async (messageId, targetRuntimeId) =>
            (await deliveries({ messageId, targetRuntimeId }))[0],
        deliveriesFor: (messageId) => deliveries({ messageId }),
        settle: (deliveryId, outcome, at, error, notification) =>
            dataSource.transaction(async (m) => {
                const current = await m.findOne(DeliveryEntity, {
                    where: { id: deliveryId },
                });
                if (current === null || current.outcome !== null) return false;
                await m.update(DeliveryEntity, deliveryId, {
                    outcome,
                    outcomeAt: at,
                    outcomeError: error ?? null,
                });
                if (notification)
                    await m.insert(NotificationEntity, {
                        ...notification,
                        deliveryId,
                    });
                return true;
            }),
        unreadNotifications: () =>
            manager.find(NotificationEntity, {
                where: { readAt: IsNull() },
                order: { createdAt: "ASC", id: "ASC" },
            }),
        markRead: async (ids, at) => {
            if (ids.length === 0) return;
            await manager.update(NotificationEntity, [...ids], { readAt: at });
        },
        purgeBefore: (cutoffMs) =>
            dataSource.transaction(async (m) => {
                const purgeable = await m.query<{ id: string }[]>(
                    PURGEABLE_MESSAGES,
                    [cutoffMs],
                );
                const ids = purgeable.map(({ id }) => id);
                if (ids.length === 0)
                    return { messages: 0, deliveries: 0, notifications: 0 };
                const deliveryIds = (
                    await m.find(DeliveryEntity, {
                        where: { messageId: In(ids) },
                        select: { id: true },
                    })
                ).map(({ id }) => id);
                const notifications = await m.count(NotificationEntity, {
                    where: { deliveryId: In(deliveryIds) },
                });
                // The two child tables go with it through ON DELETE CASCADE.
                await m.delete(MessageEntity, ids);
                return {
                    messages: ids.length,
                    deliveries: deliveryIds.length,
                    notifications,
                };
            }),
    };
}

/** Called by the daemon; the caller supplies its environment's absolute DB path. */
export async function openDatabase(path: string): Promise<AioxDatabase> {
    if (!isAbsolute(path)) throw new Error("Database path must be absolute");
    mkdirSync(dirname(path), { recursive: true });
    const dataSource = new DataSource({
        type: "better-sqlite3",
        database: path,
        entities: ENTITIES,
        synchronize: false,
    });
    await dataSource.initialize();
    try {
        await dataSource.transaction(async (manager) => {
            for (const sql of SCHEMA) await manager.query(sql);
        });
        // One SQLite connection owns every transaction; even a read or a
        // nontransactional write must wait rather than enter another caller's
        // transaction. A rejected operation does not poison the next one.
        let pending = Promise.resolve();
        const run = <T>(operation: () => Promise<T>): Promise<T> => {
            const result = pending.then(operation);
            pending = result.then(
                () => {},
                () => {},
            );
            return result;
        };
        const networkStore = networks(dataSource);
        const history = messages(dataSource);
        return {
            networks: {
                create: (input) => run(() => networkStore.create(input)),
                get: (id) => run(() => networkStore.get(id)),
                list: () => run(() => networkStore.list()),
                replaceRouting: (id, routing) =>
                    run(() => networkStore.replaceRouting(id, routing)),
                delete: (id) => run(() => networkStore.delete(id)),
            },
            messages: {
                record: (message, rows) =>
                    run(() => history.record(message, rows)),
                deliveryFor: (messageId, targetId) =>
                    run(() => history.deliveryFor(messageId, targetId)),
                deliveriesFor: (messageId) =>
                    run(() => history.deliveriesFor(messageId)),
                settle: (id, outcome, at, error, notification) =>
                    run(() =>
                        history.settle(id, outcome, at, error, notification),
                    ),
                unreadNotifications: () =>
                    run(() => history.unreadNotifications()),
                markRead: (ids, at) => run(() => history.markRead(ids, at)),
                purgeBefore: (cutoff) => run(() => history.purgeBefore(cutoff)),
            },
            close: () => run(() => dataSource.destroy()),
        };
    } catch (error) {
        await dataSource.destroy();
        throw error;
    }
}
