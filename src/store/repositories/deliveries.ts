import type Database from "better-sqlite3";

import {
  messageDeliveryStatuses,
  type MessageDeliveryStatus,
} from "../../core/deliveries.js";

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

export interface UpdateDeliveryStatusInput {
  id: string;
  status: MessageDeliveryStatus;
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
  findById(id: string): StoredDelivery | null;
  findByIdempotencyKey(idempotencyKey: string): StoredDelivery | null;
  recoverAfterRestart(input: RecoverDeliveriesAfterRestartInput): number;
  updateStatus(input: UpdateDeliveryStatusInput): StoredDelivery | null;
  countByStatus(): Record<MessageDeliveryStatus, number>;
  list(): StoredDelivery[];
}

export function createDeliveryRepository(db: Database): DeliveryRepository {
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

  const insertAll = db.transaction((deliveries: StoredDelivery[]) => {
    for (const delivery of deliveries) {
      insertDelivery.run(delivery);
    }
  });

  return {
    createQueuedForRoutes(input) {
      const deliveries: StoredDelivery[] = input.routes.map((route) => ({
        id: input.createDeliveryId(route.targetAgentId),
        messageId: input.messageId,
        targetAgentId: route.targetAgentId,
        routeId: route.id,
        status: "queued",
        idempotencyKey: `${input.messageId}:${route.targetAgentId}`,
        createdAt: input.now,
        updatedAt: input.now,
      }));

      try {
        insertAll(deliveries);
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          const conflicting = deliveries.find(
            (delivery) =>
              findByIdempotencyKey(db, delivery.idempotencyKey) !== null,
          );
          const existing = conflicting
            ? findByIdempotencyKey(db, conflicting.idempotencyKey)
            : null;

          if (existing) {
            return {
              ok: false,
              reason: "delivery_idempotency_key_exists",
              existing,
            };
          }
        }
        throw error;
      }

      return deliveries;
    },

    findByIdempotencyKey(idempotencyKey) {
      return findByIdempotencyKey(db, idempotencyKey);
    },

    findById(id) {
      return findById(db, id);
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

    updateStatus(input) {
      db.prepare(
        `
          update message_deliveries
          set status = @status, updated_at = @now
          where id = @id
        `,
      ).run(input);

      return findById(db, input.id);
    },

    countByStatus() {
      const counts = Object.fromEntries(
        messageDeliveryStatuses.map((status) => [status, 0]),
      ) as Record<MessageDeliveryStatus, number>;
      const rows = db
        .prepare("select status, count(*) as count from message_deliveries group by status")
        .all() as { status: MessageDeliveryStatus; count: number }[];

      for (const row of rows) {
        counts[row.status] = row.count;
      }

      return counts;
    },

    list() {
      return db
        .prepare("select * from message_deliveries order by created_at, id")
        .all()
        .map((row) => mapDeliveryRow(row as DeliveryRow));
    },
  };
}

function findById(db: Database, id: string): StoredDelivery | null {
  const row = db
    .prepare("select * from message_deliveries where id = ?")
    .get(id) as DeliveryRow | undefined;

  return row ? mapDeliveryRow(row) : null;
}

function findByIdempotencyKey(
  db: Database,
  idempotencyKey: string,
): StoredDelivery | null {
  const row = db
    .prepare("select * from message_deliveries where idempotency_key = ?")
    .get(idempotencyKey) as DeliveryRow | undefined;

  return row ? mapDeliveryRow(row) : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
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
