import type Database from "better-sqlite3";

import type {
  HostControlRequestFailureReason,
  HostControlRequestKind,
  HostControlRequestStatus,
} from "../../core/hosts.js";

/**
 * One host control command in flight between the CLI that submitted it and the
 * controller worker that owns the target running host. The payload and the
 * result are opaque JSON here: the daemon relays them, and only the controller
 * interprets them.
 */
export interface StoredHostControlRequest {
  id: string;
  hostId: string;
  kind: HostControlRequestKind;
  payload: Record<string, unknown> | null;
  status: HostControlRequestStatus;
  claimedBy: string | null;
  result: Record<string, unknown> | null;
  failureReason: HostControlRequestFailureReason | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsertHostControlRequest {
  id: string;
  hostId: string;
  kind: HostControlRequestKind;
  payload?: Record<string, unknown> | null;
  now: string;
}

interface HostControlRequestRow {
  id: string;
  host_id: string;
  kind: HostControlRequestKind;
  payload_json: string | null;
  status: HostControlRequestStatus;
  claimed_by: string | null;
  result_json: string | null;
  failure_reason: HostControlRequestFailureReason | null;
  created_at: string;
  updated_at: string;
}

export interface HostControlRequestRepository {
  insert(request: InsertHostControlRequest): StoredHostControlRequest;
  findById(requestId: string): StoredHostControlRequest | null;
  findNextPending(hostId: string): StoredHostControlRequest | null;
  claim(request: {
    requestId: string;
    controllerId: string;
    now: string;
  }): StoredHostControlRequest | null;
  complete(request: {
    requestId: string;
    result: Record<string, unknown>;
    now: string;
  }): StoredHostControlRequest | null;
  failAllInFlightForHost(request: {
    hostId: string;
    failureReason: HostControlRequestFailureReason;
    now: string;
  }): StoredHostControlRequest[];
  remove(requestId: string): StoredHostControlRequest | null;
}

export function createHostControlRequestRepository(
  db: Database,
): HostControlRequestRepository {
  return {
    insert(request) {
      const stored: StoredHostControlRequest = {
        id: request.id,
        hostId: request.hostId,
        kind: request.kind,
        payload: request.payload ?? null,
        status: "pending",
        claimedBy: null,
        result: null,
        failureReason: null,
        createdAt: request.now,
        updatedAt: request.now,
      };

      db.prepare(
        `
          insert into host_control_requests (
            id,
            host_id,
            kind,
            payload_json,
            status,
            claimed_by,
            result_json,
            failure_reason,
            created_at,
            updated_at
          ) values (
            @id,
            @hostId,
            @kind,
            @payloadJson,
            @status,
            @claimedBy,
            @resultJson,
            @failureReason,
            @createdAt,
            @updatedAt
          )
        `,
      ).run({
        ...stored,
        payloadJson: stored.payload === null ? null : JSON.stringify(stored.payload),
        resultJson: null,
      });

      return stored;
    },

    findById(requestId) {
      const row = db
        .prepare("select * from host_control_requests where id = ?")
        .get(requestId) as HostControlRequestRow | undefined;

      return row ? mapHostControlRequestRow(row) : null;
    },

    findNextPending(hostId) {
      const row = db
        .prepare(
          `
            select * from host_control_requests
            where host_id = ? and status = 'pending'
            order by created_at, id
            limit 1
          `,
        )
        .get(hostId) as HostControlRequestRow | undefined;

      return row ? mapHostControlRequestRow(row) : null;
    },

    claim(request) {
      // Guarded by `status = 'pending'` so two concurrent claims cannot both
      // take the same request.
      const changes = db
        .prepare(
          `
            update host_control_requests
            set status = 'claimed', claimed_by = ?, updated_at = ?
            where id = ? and status = 'pending'
          `,
        )
        .run(request.controllerId, request.now, request.requestId).changes;

      return changes === 0 ? null : this.findById(request.requestId);
    },

    complete(request) {
      const changes = db
        .prepare(
          `
            update host_control_requests
            set status = 'completed', result_json = ?, updated_at = ?
            where id = ? and status = 'claimed'
          `,
        )
        .run(JSON.stringify(request.result), request.now, request.requestId).changes;

      return changes === 0 ? null : this.findById(request.requestId);
    },

    failAllInFlightForHost(request) {
      const inFlight = db
        .prepare(
          `
            select * from host_control_requests
            where host_id = ? and status in ('pending', 'claimed')
            order by created_at, id
          `,
        )
        .all(request.hostId)
        .map((row) => mapHostControlRequestRow(row as HostControlRequestRow));

      db.prepare(
        `
          update host_control_requests
          set status = 'failed', failure_reason = ?, updated_at = ?
          where host_id = ? and status in ('pending', 'claimed')
        `,
      ).run(request.failureReason, request.now, request.hostId);

      return inFlight.map((stored) => ({
        ...stored,
        status: "failed" as const,
        failureReason: request.failureReason,
        updatedAt: request.now,
      }));
    },

    remove(requestId) {
      const existing = this.findById(requestId);

      if (!existing) {
        return null;
      }

      db.prepare("delete from host_control_requests where id = ?").run(requestId);

      return existing;
    },
  };
}

function mapHostControlRequestRow(
  row: HostControlRequestRow,
): StoredHostControlRequest {
  return {
    id: row.id,
    hostId: row.host_id,
    kind: row.kind,
    payload: parseJsonObject(row.payload_json),
    status: row.status,
    claimedBy: row.claimed_by,
    result: parseJsonObject(row.result_json),
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  return raw === null ? null : (JSON.parse(raw) as Record<string, unknown>);
}
