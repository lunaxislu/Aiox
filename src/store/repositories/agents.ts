import type Database from "better-sqlite3";

import type { AgentInstanceStatus, AgentKind } from "../../core/agents.js";

export interface StoredAgent {
  id: string;
  name: string;
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

interface AgentRow {
  id: string;
  name: string;
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
  findByName(name: string): StoredAgent | null;
  list(): StoredAgent[];
  removeByName(name: string): StoredAgent | null;
  removeAllConnected(): StoredAgent[];
  rebindAdapterSessionId(request: {
    name: string;
    adapterSessionId: string;
    now: string;
  }): StoredAgent | null;
}

export function createAgentRepository(db: Database): AgentRepository {
  return {
    attach(request) {
      // A found-by-name row is always connected: departure now means the row
      // is physically deleted (see removeByName/removeAllConnected below),
      // not status-flipped, so there is no "existing but disconnected" row
      // left to reuse. Every successful attach is therefore a fresh insert.
      const existing = this.findByName(request.name);

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
      ).run(agent);

      return {
        ok: true,
        agent,
      };
    },

    findByName(name) {
      const row = db
        .prepare("select * from agents where name = ?")
        .get(name) as AgentRow | undefined;

      return row ? mapAgentRow(row) : null;
    },

    list() {
      return db
        .prepare("select * from agents order by id")
        .all()
        .map((row) => mapAgentRow(row as AgentRow));
    },

    removeByName(name) {
      const existing = this.findByName(name);

      if (!existing) {
        return null;
      }

      db.prepare("delete from agents where name = ?").run(name);

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
      const existing = this.findByName(request.name);

      if (!existing) {
        return null;
      }

      db.prepare(
        `
          update agents
          set
            adapter_session_id = @adapterSessionId,
            updated_at = @now
          where name = @name
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
