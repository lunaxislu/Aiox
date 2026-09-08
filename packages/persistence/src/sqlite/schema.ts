import type { DeliveryOutcome, MessageKind, RoutePolicy } from "@aiox/domain";
import {
    EntitySchema,
    type MigrationInterface,
    type QueryRunner,
} from "typeorm";

export type NetworkRow = {
    id: string;
    name: string;
    defaultPolicy: RoutePolicy;
};

export type RouteRow = {
    networkId: string;
    sourceId: string;
    targetId: string;
    policy: RoutePolicy;
};

/** `content` is the sender's original body; the one-way notice is not stored. */
export type MessageRow = {
    id: string;
    kind: MessageKind;
    sourceRuntimeId: string;
    sourceName: string;
    sourceRole: string | null;
    sourceDescription: string | null;
    networkId: string;
    content: string;
    createdAt: number;
};

/** One message aimed at one target. `outcome === null` means still in flight. */
export type DeliveryRow = {
    id: string;
    messageId: string;
    targetRuntimeId: string;
    reverseRouteAtSend: boolean;
    accepted: boolean;
    rejectReason: string | null;
    outcome: DeliveryOutcome | null;
    outcomeAt: number | null;
    outcomeError: string | null;
};

export type NotificationRow = {
    id: string;
    deliveryId: string;
    originRuntimeId: string;
    body: string;
    createdAt: number;
    readAt: number | null;
};

export const NetworkEntity = new EntitySchema<NetworkRow>({
    name: "persistent_network",
    tableName: "persistent_networks",
    columns: {
        id: { type: "text", primary: true },
        name: { type: "text" },
        defaultPolicy: { type: "text", name: "default_policy" },
    },
});

export const RouteEntity = new EntitySchema<RouteRow>({
    name: "persistent_route",
    tableName: "persistent_routes",
    columns: {
        networkId: { type: "text", name: "network_id", primary: true },
        sourceId: { type: "text", name: "source_id", primary: true },
        targetId: { type: "text", name: "target_id", primary: true },
        policy: { type: "text" },
    },
});

export const MessageEntity = new EntitySchema<MessageRow>({
    name: "message",
    tableName: "messages",
    columns: {
        id: { type: "text", primary: true },
        kind: { type: "text" },
        sourceRuntimeId: { type: "text", name: "source_runtime_id" },
        sourceName: { type: "text", name: "source_name" },
        sourceRole: { type: "text", name: "source_role", nullable: true },
        sourceDescription: {
            type: "text",
            name: "source_description",
            nullable: true,
        },
        networkId: { type: "text", name: "network_id" },
        content: { type: "text" },
        createdAt: { type: "integer", name: "created_at" },
    },
});

export const DeliveryEntity = new EntitySchema<DeliveryRow>({
    name: "delivery",
    tableName: "deliveries",
    columns: {
        id: { type: "text", primary: true },
        messageId: { type: "text", name: "message_id" },
        targetRuntimeId: { type: "text", name: "target_runtime_id" },
        reverseRouteAtSend: {
            type: "boolean",
            name: "reverse_route_at_send",
        },
        accepted: { type: "boolean" },
        rejectReason: { type: "text", name: "reject_reason", nullable: true },
        outcome: { type: "text", nullable: true },
        outcomeAt: { type: "integer", name: "outcome_at", nullable: true },
        outcomeError: { type: "text", name: "outcome_error", nullable: true },
    },
});

export const NotificationEntity = new EntitySchema<NotificationRow>({
    name: "notification",
    tableName: "notifications",
    columns: {
        id: { type: "text", primary: true },
        deliveryId: { type: "text", name: "delivery_id" },
        originRuntimeId: { type: "text", name: "origin_runtime_id" },
        body: { type: "text" },
        createdAt: { type: "integer", name: "created_at" },
        readAt: { type: "integer", name: "read_at", nullable: true },
    },
});

export const ENTITIES = [
    NetworkEntity,
    RouteEntity,
    MessageEntity,
    DeliveryEntity,
    NotificationEntity,
];

/** Named so a bundler renaming the class cannot orphan the recorded row. */
export const INITIAL_MIGRATION = "InitialSchema1758240000000";

const forwardOnly = async (): Promise<never> => {
    throw new Error("AIOX migrations are forward only");
};

/**
 * The Stage 1 schema, byte for byte. Databases created before TypeORM already
 * have these tables and are reconciled by recording this migration as applied.
 */
export class InitialSchema1758240000000 implements MigrationInterface {
    readonly name = INITIAL_MIGRATION;

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE persistent_networks (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) > 0),
  name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) > 0 AND instr(name, '/') = 0),
  default_policy TEXT NOT NULL CHECK(default_policy IN ('allow', 'deny'))
) STRICT`);
        await queryRunner.query(`CREATE TABLE persistent_routes (
  network_id TEXT NOT NULL REFERENCES persistent_networks(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL CHECK(length(source_id) > 0),
  target_id TEXT NOT NULL CHECK(length(target_id) > 0 AND source_id <> target_id),
  policy TEXT NOT NULL CHECK(policy IN ('allow', 'deny')),
  PRIMARY KEY(network_id, source_id, target_id)
) STRICT`);
    }

    down = forwardOnly;
}

export class MessageHistory1758240001000 implements MigrationInterface {
    readonly name = "MessageHistory1758240001000";

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) > 0),
  kind TEXT NOT NULL CHECK(kind IN ('agent', 'daemon-notification')),
  source_runtime_id TEXT NOT NULL CHECK(length(source_runtime_id) > 0),
  source_name TEXT NOT NULL,
  source_role TEXT,
  source_description TEXT,
  network_id TEXT NOT NULL CHECK(length(network_id) > 0),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
) STRICT`);
        await queryRunner.query(`CREATE TABLE deliveries (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) > 0),
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  target_runtime_id TEXT NOT NULL CHECK(length(target_runtime_id) > 0),
  reverse_route_at_send INTEGER NOT NULL CHECK(reverse_route_at_send IN (0, 1)),
  accepted INTEGER NOT NULL CHECK(accepted IN (0, 1)),
  reject_reason TEXT,
  outcome TEXT CHECK(outcome IS NULL OR outcome IN ('rejected', 'completed', 'failed', 'interrupted')),
  outcome_at INTEGER,
  outcome_error TEXT,
  UNIQUE(message_id, target_runtime_id)
) STRICT`);
        await queryRunner.query(`CREATE TABLE notifications (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) > 0),
  delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  origin_runtime_id TEXT NOT NULL CHECK(length(origin_runtime_id) > 0),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER
) STRICT`);
        // Without it every cascade from a purged delivery scans the table.
        await queryRunner.query(
            "CREATE INDEX notifications_delivery ON notifications(delivery_id)",
        );
    }

    down = forwardOnly;
}

export const MIGRATIONS = [
    InitialSchema1758240000000,
    MessageHistory1758240001000,
];
