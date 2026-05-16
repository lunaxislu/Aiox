import type Database from "better-sqlite3";

import type { MessageDeliveryStatus } from "../../core/deliveries.js";

export interface StoredDelivery {
  id: string;
  messageId: string;
  targetAgentId: string;
  routeId: string | null;
  status: MessageDeliveryStatus;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRouteInput {
  id: string;
  targetAgentId: string;
}

export interface CreateQueuedDeliveriesInput {
  messageId: string;
  routes: readonly DeliveryRouteInput[];
  createDeliveryId(targetAgentId: string): string;
  now: string;
}

export interface RecoverDeliveriesAfterRestartInput {
  now: string;
}

export type CreateQueuedDeliveriesResult =
  | StoredDelivery[]
  | {
      ok: false;
      reason: "delivery_idempotency_key_exists";
      existing: StoredDelivery;
    };

interface DeliveryRow {
  id: string;
  message_id: string;
  target_agent_id: string;
  route_id: string | null;
  status: MessageDeliveryStatus;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRepository {
  createQueuedForRoutes(input: CreateQueuedDeliveriesInput): CreateQueuedDeliveriesResult;
  recoverAfterRestart(input: RecoverDeliveriesAfterRestartInput): number;
  list(): StoredDelivery[];
}

export function createDeliveryRepository(db: Database): DeliveryRepository {
  return {
    createQueuedForRoutes(input) {
      const deliveries = input.routes.map((route) => ({
        id: input.createDeliveryId(route.targetAgentId),
        messageId: input.messageId,
        targetAgentId: route.targetAgentId,
        routeId: route.id,
        status: "queued" as const,
        idempotencyKey: `${input.messageId}:${route.targetAgentId}`,
        createdAt: input.now,
        updatedAt: input.now,
      }));

      for (const delivery of deliveries) {
        const existing = findByIdempotencyKey(db, delivery.idempotencyKey);

        if (existing) {
          return {
            ok: false,
            reason: "delivery_idempotency_key_exists",
            existing,
          };
        }
      }

      const insertDelivery = db.prepare(
        `
          insert into message_deliveries (
            id,
            message_id,
            target_agent_id,
            route_id,
            status,
            idempotency_key,
            created_at,
            updated_at
          ) values (
            @id,
            @messageId,
            @targetAgentId,
            @routeId,
            @status,
            @idempotencyKey,
            @createdAt,
            @updatedAt
          )
        `,
      );

      for (const delivery of deliveries) {
        insertDelivery.run(delivery);
      }

      return deliveries;
    },

    recoverAfterRestart(input) {
      const result = db.prepare(
        `
          update message_deliveries
          set status = 'queued', updated_at = ?
          where status = 'delivering'
        `,
      ).run(input.now);

      return result.changes;
    },

    list() {
      return db
        .prepare("select * from message_deliveries order by created_at, id")
        .all()
        .map((row) => mapDeliveryRow(row as DeliveryRow));
    },
  };
}

function findByIdempotencyKey(
  db: Database,
  idempotencyKey: string,
): StoredDelivery | null {
  const row = db
    .prepare("select * from message_deliveries where idempotency_key = ?")
    .all(idempotencyKey)[0] as DeliveryRow | undefined;

  return row ? mapDeliveryRow(row) : null;
}

function mapDeliveryRow(row: DeliveryRow): StoredDelivery {
  return {
    id: row.id,
    messageId: row.message_id,
    targetAgentId: row.target_agent_id,
    routeId: row.route_id,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
