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
  /** Set by `requestTermination()`; the hosted CLI that owns the live process applies it. */
  pendingSignal: NodeJS.Signals | null;
  /** Increments on every `requestTermination()` call so a repeated signal name is still a *new* intent. */
  pendingSignalSeq: number;
  /** Highest intent sequence truthfully accepted by the owning wrapper's live ChildProcess. */
  deliveredSignalSeq: number;
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
  pending_signal: string | null;
  pending_signal_seq: number;
  delivered_signal_seq: number;
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
  /** Records a termination intent (W6 Stage 5D Blocker 4): the hosted CLI that owns the live process observes and applies it. */
  requestTermination(request: {
    hostId: string;
    name: string;
    signal: NodeJS.Signals;
    now: string;
  }):
    | { ok: true; agent: StoredHostAgent }
    | { ok: false; reason: "signal_delivery_pending"; agent: StoredHostAgent }
    | null;
  acknowledgeSignalDelivery(request: {
    hostId: string;
    name: string;
    signalSeq: number;
    now: string;
  }):
    | { ok: true; agent: StoredHostAgent }
    | { ok: false; reason: "signal_sequence_mismatch"; agent: StoredHostAgent }
    | null;
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
        pendingSignal: null,
        pendingSignalSeq: 0,
        deliveredSignalSeq: 0,
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
            pending_signal,
            pending_signal_seq,
            delivered_signal_seq,
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
            @pendingSignal,
            @pendingSignalSeq,
            @deliveredSignalSeq,
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

    requestTermination(request) {
      const existing = this.find({ hostId: request.hostId, name: request.name });

      if (!existing) {
        return null;
      }

      if (existing.pendingSignalSeq > existing.deliveredSignalSeq) {
        return { ok: false, reason: "signal_delivery_pending", agent: existing };
      }

      const pendingSignalSeq = existing.pendingSignalSeq + 1;

      db.prepare(
        `
          update host_agents
          set pending_signal = ?, pending_signal_seq = ?, updated_at = ?
          where host_id = ? and name = ?
        `,
      ).run(request.signal, pendingSignalSeq, request.now, request.hostId, request.name);

      return {
        ok: true,
        agent: {
          ...existing,
          pendingSignal: request.signal,
          pendingSignalSeq,
          updatedAt: request.now,
        },
      };
    },

    acknowledgeSignalDelivery(request) {
      const existing = this.find({ hostId: request.hostId, name: request.name });

      if (!existing) {
        return null;
      }
      if (request.signalSeq !== existing.pendingSignalSeq) {
        return { ok: false, reason: "signal_sequence_mismatch", agent: existing };
      }

      db.prepare(
        `
          update host_agents
          set delivered_signal_seq = ?, updated_at = ?
          where host_id = ? and name = ?
        `,
      ).run(request.signalSeq, request.now, request.hostId, request.name);

      return {
        ok: true,
        agent: {
          ...existing,
          deliveredSignalSeq: request.signalSeq,
          updatedAt: request.now,
        },
      };
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
    pendingSignal: row.pending_signal as NodeJS.Signals | null,
    pendingSignalSeq: row.pending_signal_seq,
    deliveredSignalSeq: row.delivered_signal_seq,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
