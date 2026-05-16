import type Database from "better-sqlite3";

import type { EventType } from "../../core/events.js";

export interface StoredEvent {
  id: string;
  type: EventType;
  data: Record<string, unknown>;
  createdAt: string;
  agentId: string | null;
  messageId: string | null;
  deliveryId: string | null;
  routeId: string | null;
}

interface EventRow {
  id: string;
  agent_id: string | null;
  message_id: string | null;
  delivery_id: string | null;
  route_id: string | null;
  type: EventType;
  data_json: string;
  created_at: string;
}

export interface EventRepository {
  append(event: StoredEvent): StoredEvent;
  list(): StoredEvent[];
}

export function createEventRepository(db: Database): EventRepository {
  return {
    append(event) {
      db.prepare(
        `
          insert into events (
            id,
            agent_id,
            message_id,
            delivery_id,
            route_id,
            type,
            data_json,
            created_at
          ) values (
            @id,
            @agentId,
            @messageId,
            @deliveryId,
            @routeId,
            @type,
            @dataJson,
            @createdAt
          )
        `,
      ).run({
        ...event,
        dataJson: JSON.stringify(event.data),
      });

      return event;
    },

    list() {
      return db
        .prepare("select * from events order by created_at, id")
        .all()
        .map((row) => mapEventRow(row as EventRow));
    },
  };
}

function mapEventRow(row: EventRow): StoredEvent {
  return {
    id: row.id,
    type: row.type,
    data: JSON.parse(row.data_json) as Record<string, unknown>,
    createdAt: row.created_at,
    agentId: row.agent_id,
    messageId: row.message_id,
    deliveryId: row.delivery_id,
    routeId: row.route_id,
  };
}
