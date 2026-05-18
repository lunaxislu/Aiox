import type Database from "better-sqlite3";

import type { AgentInstanceStatus, AgentKind } from "../../core/agents.js";

export interface StoredAgent {
  id: string;
  name: string;
  kind: AgentKind;
  status: AgentInstanceStatus;
  cwd: string;
  pairId: string | null;
  adapterSessionId: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttachStoredAgentRequest {
  id: string;
  name: string;
  kind: AgentKind;
  cwd: string;
  pairId?: string | null;
  adapterSessionId?: string | null;
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
  adapter_session_id: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRepository {
  attach(request: AttachStoredAgentRequest): AttachStoredAgentResult;
  findByName(name: string): StoredAgent | null;
  list(): StoredAgent[];
  markAllConnectedDisconnected(now: string): StoredAgent[];
}

export function createAgentRepository(db: Database): AgentRepository {
  return {
    attach(request) {
      const existing = this.findByName(request.name);

      if (existing?.status === "connected") {
        return {
          ok: false,
          reason: "agent_name_already_connected",
          existing,
        };
      }

      if (existing) {
        const agent: StoredAgent = {
          ...existing,
          status: "connected",
          cwd: request.cwd,
          pairId: request.pairId ?? existing.pairId,
          adapterSessionId: request.adapterSessionId ?? null,
          lastSeenAt: request.now,
          updatedAt: request.now,
        };

        db.prepare(
          `
            update agents
            set
              status = @status,
              cwd = @cwd,
              pair_id = @pairId,
              adapter_session_id = @adapterSessionId,
              last_seen_at = @lastSeenAt,
              updated_at = @updatedAt
            where id = @id
          `,
        ).run(agent);

        return {
          ok: true,
          agent,
        };
      }

      const agent: StoredAgent = {
        id: request.id,
        name: request.name,
        kind: request.kind,
        status: "connected",
        cwd: request.cwd,
        pairId: request.pairId ?? null,
        adapterSessionId: request.adapterSessionId ?? null,
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
            adapter_session_id,
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
            @adapterSessionId,
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

    markAllConnectedDisconnected(now) {
      const connected = db
        .prepare("select * from agents where status = 'connected' order by id")
        .all()
        .map((row) => mapAgentRow(row as AgentRow));

      db.prepare(
        `
          update agents
          set
            status = 'disconnected',
            updated_at = @now
          where status = 'connected'
        `,
      ).run({ now });

      return connected.map((agent) => ({
        ...agent,
        status: "disconnected",
        updatedAt: now,
      }));
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
    adapterSessionId: row.adapter_session_id,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
