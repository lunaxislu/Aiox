import type { DeliveryOutcome, MessageKind } from "@aiox/domain";
import { sql } from "drizzle-orm";
import {
    sqliteTable,
    text,
    integer,
    primaryKey,
    unique,
    check,
    index,
} from "drizzle-orm/sqlite-core";

export const NetworkEntity = sqliteTable(
    "persistent_networks",
    {
        id: text("id").notNull().primaryKey(),
        name: text("name").notNull().unique(),
    },
    (t) => [
        check("persistent_networks_check_0", sql`length(${t.id}) > 0`),
        check(
            "persistent_networks_check_1",
            sql`length(trim(${t.name})) > 0 AND instr(${t.name}, '/') = 0`,
        ),
    ],
);

export const RouteEntity = sqliteTable(
    "persistent_routes",
    {
        networkId: text("network_id")
            .notNull()
            .references(() => NetworkEntity.id, { onDelete: "cascade" }),
        sourceId: text("source_id").notNull(),
        targetId: text("target_id").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.networkId, t.sourceId, t.targetId] }),
        check("persistent_routes_check_0", sql`length(${t.sourceId}) > 0`),
        check(
            "persistent_routes_check_1",
            sql`length(${t.targetId}) > 0 AND ${t.sourceId} <> ${t.targetId}`,
        ),
    ],
);

export const MessageEntity = sqliteTable(
    "messages",
    {
        id: text("id").notNull().primaryKey(),
        kind: text("kind").$type<MessageKind>().notNull(),
        sourceRuntimeId: text("source_runtime_id").notNull(),
        sourceName: text("source_name").notNull(),
        sourceRole: text("source_role"),
        sourceDescription: text("source_description"),
        networkId: text("network_id").notNull(),
        content: text("content").notNull(),
        createdAt: integer("created_at").notNull(),
    },
    (t) => [
        check("messages_check_0", sql`length(${t.id}) > 0`),
        check(
            "messages_check_1",
            sql`${t.kind} IN ('agent', 'daemon-notification')`,
        ),
        check("messages_check_2", sql`length(${t.sourceRuntimeId}) > 0`),
        check("messages_check_3", sql`length(${t.networkId}) > 0`),
    ],
);
export type MessageRow = typeof MessageEntity.$inferSelect;

export const DeliveryEntity = sqliteTable(
    "deliveries",
    {
        id: text("id").notNull().primaryKey(),
        messageId: text("message_id")
            .notNull()
            .references(() => MessageEntity.id, { onDelete: "cascade" }),
        targetRuntimeId: text("target_runtime_id").notNull(),
        reverseRouteAtSend: integer("reverse_route_at_send", {
            mode: "boolean",
        }).notNull(),
        accepted: integer("accepted", { mode: "boolean" }).notNull(),
        rejectReason: text("reject_reason"),
        outcome: text("outcome").$type<DeliveryOutcome>(),
        outcomeAt: integer("outcome_at"),
        outcomeError: text("outcome_error"),
    },
    (t) => [
        unique().on(t.messageId, t.targetRuntimeId),
        check("deliveries_check_0", sql`length(${t.id}) > 0`),
        check("deliveries_check_1", sql`length(${t.targetRuntimeId}) > 0`),
        check("deliveries_check_2", sql`${t.reverseRouteAtSend} IN (0, 1)`),
        check("deliveries_check_3", sql`${t.accepted} IN (0, 1)`),
        check(
            "deliveries_check_4",
            sql`${t.outcome} IS NULL OR ${t.outcome} IN ('rejected', 'completed', 'failed', 'interrupted')`,
        ),
    ],
);
export type DeliveryRow = typeof DeliveryEntity.$inferSelect;

export const NotificationEntity = sqliteTable(
    "notifications",
    {
        id: text("id").notNull().primaryKey(),
        deliveryId: text("delivery_id")
            .notNull()
            .references(() => DeliveryEntity.id, { onDelete: "cascade" }),
        originRuntimeId: text("origin_runtime_id").notNull(),
        originExecutionOwnership: text("origin_execution_ownership")
            .$type<"daemon" | "external">()
            .notNull(),
        originTerminalId: text("origin_terminal_id"),
        body: text("body").notNull(),
        createdAt: integer("created_at").notNull(),
        readAt: integer("read_at"),
    },
    (t) => [
        check("notifications_check_0", sql`length(${t.id}) > 0`),
        check("notifications_check_1", sql`length(${t.originRuntimeId}) > 0`),
        check(
            "notifications_check_2",
            sql`${t.originExecutionOwnership} IN ('daemon', 'external')`,
        ),
        index("notifications_delivery").on(t.deliveryId),
    ],
);
export type NotificationRow = typeof NotificationEntity.$inferSelect;
