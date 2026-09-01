import type Database from "better-sqlite3";

import type { AgentInstanceStatus, AgentKind } from "../../core/agents.js";

export interface StoredAgent {
  id: string;
  name: string;
  /**
   * Owning running host's id, or `null` for a standalone agent. `agents.name`
   * is unique only within this scope (see `src/store/schema.ts` migration 9)
   * -- a host-scoped and a standalone agent, or two different hosts' agents,
   * may share a display name without colliding.
   */
  hostId: string | null;
  kind: AgentKind;
  status: AgentInstanceStatus;
  cwd: string;
  pairId: string | null;
  pairSlot: "a" | "b" | null;
  adapterSessionId: string | null;
  role: string | null;
  description: string | null;
  instructions: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttachStoredAgentRequest {
  id: string;
  name: string;
  /** Omitted (or undefined) attaches a standalone agent. */
  hostId?: string;
  kind: AgentKind;
  cwd: string;
  adapterSessionId?: string | null;
  role?: string | null;
  description?: string | null;
  instructions?: string | null;
  now: string;
}

export type AttachStoredAgentResult =
  | {
      ok: true;
      agent: StoredAgent;
    }
  | {
      ok: false;
      reason: "agent_name_already_connected";
      existing: StoredAgent;
    };

/**
 * Standalone agents are stored with this non-null sentinel `host_id` rather
 * than `NULL` so the single `unique (host_id, name)` DB index keeps enforcing
 * global uniqueness among standalone agents by itself -- see
 * `src/store/schema.ts` migration 9 for why `NULL` cannot do this in SQLite.
 */
const standaloneHostIdColumnValue = "";

interface AgentRow {
  id: string;
  name: string;
  host_id: string;
  kind: AgentKind;
  status: AgentInstanceStatus;
  cwd: string;
  pair_id: string | null;
  pair_slot: "a" | "b" | null;
  adapter_session_id: string | null;
  role: string | null;
  description: string | null;
  instructions: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRepository {
  attach(request: AttachStoredAgentRequest): AttachStoredAgentResult;
  /** Standalone-scope lookup (`hostId` is the sentinel, never a real host). */
  findByName(name: string): StoredAgent | null;
  findByHostAndName(hostId: string, name: string): StoredAgent | null;
  findById(id: string): StoredAgent | null;
  list(): StoredAgent[];
  removeById(id: string): StoredAgent | null;
  removeAllConnected(): StoredAgent[];
  rebindAdapterSessionId(request: {
    id: string;
    adapterSessionId: string;
    now: string;
  }): StoredAgent | null;
}

export function createAgentRepository(db: Database): AgentRepository {
  function findByHostColumnAndName(
    hostIdColumnValue: string,
    name: string,
  ): StoredAgent | null {
    const row = db
      .prepare("select * from agents where host_id = ? and name = ?")
      .get(hostIdColumnValue, name) as AgentRow | undefined;

    return row ? mapAgentRow(row) : null;
  }

  return {
    attach(request) {
      // A found row is always connected: departure now means the row is
      // physically deleted (see removeById/removeAllConnected below), not
      // status-flipped, so there is no "existing but disconnected" row left
      // to reuse. Every successful attach is therefore a fresh insert.
      const hostIdColumnValue = request.hostId ?? standaloneHostIdColumnValue;
      const existing = findByHostColumnAndName(hostIdColumnValue, request.name);

      if (existing) {
        return {
          ok: false,
          reason: "agent_name_already_connected",
          existing,
        };
      }

      const agent: StoredAgent = {
        id: request.id,
        name: request.name,
        hostId: request.hostId ?? null,
        kind: request.kind,
        status: "connected",
        cwd: request.cwd,
        pairId: null,
        pairSlot: null,
        adapterSessionId: request.adapterSessionId ?? null,
        role: request.role ?? null,
        description: request.description ?? null,
        instructions: request.instructions ?? null,
        lastSeenAt: request.now,
        createdAt: request.now,
        updatedAt: request.now,
      };

      db.prepare(
        `
          insert into agents (
            id,
            name,
            host_id,
            kind,
            status,
            cwd,
            pair_id,
            pair_slot,
            adapter_session_id,
            role,
            description,
            instructions,
            last_seen_at,
            created_at,
            updated_at
          ) values (
            @id,
            @name,
            @hostId,
            @kind,
            @status,
            @cwd,
            @pairId,
            @pairSlot,
            @adapterSessionId,
            @role,
            @description,
            @instructions,
            @lastSeenAt,
            @createdAt,
            @updatedAt
          )
        `,
      ).run({ ...agent, hostId: hostIdColumnValue });

      return {
        ok: true,
        agent,
      };
    },

    findByName(name) {
      return findByHostColumnAndName(standaloneHostIdColumnValue, name);
    },

    findByHostAndName(hostId, name) {
      return findByHostColumnAndName(hostId, name);
    },

    findById(id) {
      const row = db
        .prepare("select * from agents where id = ?")
        .get(id) as AgentRow | undefined;

      return row ? mapAgentRow(row) : null;
    },

    list() {
      return db
        .prepare("select * from agents order by id")
        .all()
        .map((row) => mapAgentRow(row as AgentRow));
    },

    removeById(id) {
      const existing = this.findById(id);

      if (!existing) {
        return null;
      }

      db.prepare("delete from agents where id = ?").run(id);

      return existing;
    },

    removeAllConnected() {
      const connected = db
        .prepare("select * from agents where status = 'connected' order by id")
        .all()
        .map((row) => mapAgentRow(row as AgentRow));

      db.exec("delete from agents where status = 'connected'");

      return connected;
    },

    rebindAdapterSessionId(request) {
      const existing = this.findById(request.id);

      if (!existing) {
        return null;
      }

      db.prepare(
        `
          update agents
          set
            adapter_session_id = @adapterSessionId,
            updated_at = @now
          where id = @id
        `,
      ).run(request);

      return {
        ...existing,
        adapterSessionId: request.adapterSessionId,
        updatedAt: request.now,
      };
    },
  };
}

function mapAgentRow(row: AgentRow): StoredAgent {
  return {
    id: row.id,
    name: row.name,
    hostId: row.host_id === standaloneHostIdColumnValue ? null : row.host_id,
    kind: row.kind,
    status: row.status,
    cwd: row.cwd,
    pairId: row.pair_id,
    pairSlot: row.pair_slot,
    adapterSessionId: row.adapter_session_id,
    role: row.role,
    description: row.description,
    instructions: row.instructions,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
