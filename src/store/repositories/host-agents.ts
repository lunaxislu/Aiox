import type Database from "better-sqlite3";

import type { AgentKind } from "../../core/agents.js";
import type { HostAgentStatus } from "../../core/hosts.js";

/**
 * A host-scoped agent runtime row. Its identity is `(hostId, name)`, which is
 * why the same agent name can run under several hosts and next to a standalone
 * `agents` row without colliding.
 */
export interface StoredHostAgent {
  id: string;
  hostId: string;
  name: string;
  kind: AgentKind;
  status: HostAgentStatus;
  role: string | null;
  description: string | null;
  instructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsertHostAgentRequest {
  id: string;
  hostId: string;
  name: string;
  kind: AgentKind;
  role?: string | null;
  description?: string | null;
  instructions?: string | null;
  now: string;
}

interface HostAgentRow {
  id: string;
  host_id: string;
  name: string;
  kind: AgentKind;
  status: HostAgentStatus;
  role: string | null;
  description: string | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface HostAgentRepository {
  insert(request: InsertHostAgentRequest): StoredHostAgent;
  find(request: { hostId: string; name: string }): StoredHostAgent | null;
  listForHost(hostId: string): StoredHostAgent[];
  updateStatus(request: {
    hostId: string;
    name: string;
    status: HostAgentStatus;
    now: string;
  }): StoredHostAgent | null;
  remove(request: { hostId: string; name: string }): StoredHostAgent | null;
  removeAllForHost(hostId: string): StoredHostAgent[];
}

export function createHostAgentRepository(db: Database): HostAgentRepository {
  return {
    insert(request) {
      const agent: StoredHostAgent = {
        id: request.id,
        hostId: request.hostId,
        name: request.name,
        kind: request.kind,
        status: "starting",
        role: request.role ?? null,
        description: request.description ?? null,
        instructions: request.instructions ?? null,
        createdAt: request.now,
        updatedAt: request.now,
      };

      db.prepare(
        `
          insert into host_agents (
            id,
            host_id,
            name,
            kind,
            status,
            role,
            description,
            instructions,
            created_at,
            updated_at
          ) values (
            @id,
            @hostId,
            @name,
            @kind,
            @status,
            @role,
            @description,
            @instructions,
            @createdAt,
            @updatedAt
          )
        `,
      ).run(agent);

      return agent;
    },

    find(request) {
      const row = db
        .prepare("select * from host_agents where host_id = ? and name = ?")
        .get(request.hostId, request.name) as HostAgentRow | undefined;

      return row ? mapHostAgentRow(row) : null;
    },

    listForHost(hostId) {
      return db
        .prepare("select * from host_agents where host_id = ? order by created_at, id")
        .all(hostId)
        .map((row) => mapHostAgentRow(row as HostAgentRow));
    },

    updateStatus(request) {
      const existing = this.find({ hostId: request.hostId, name: request.name });

      if (!existing) {
        return null;
      }

      db.prepare(
        "update host_agents set status = ?, updated_at = ? where host_id = ? and name = ?",
      ).run(request.status, request.now, request.hostId, request.name);

      return { ...existing, status: request.status, updatedAt: request.now };
    },

    remove(request) {
      const existing = this.find({ hostId: request.hostId, name: request.name });

      if (!existing) {
        return null;
      }

      db.prepare("delete from host_agents where host_id = ? and name = ?").run(
        request.hostId,
        request.name,
      );

      return existing;
    },

    removeAllForHost(hostId) {
      const existing = this.listForHost(hostId);

      db.prepare("delete from host_agents where host_id = ?").run(hostId);

      return existing;
    },
  };
}

function mapHostAgentRow(row: HostAgentRow): StoredHostAgent {
  return {
    id: row.id,
    hostId: row.host_id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    role: row.role,
    description: row.description,
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
