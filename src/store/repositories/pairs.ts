import type Database from "better-sqlite3";

import type { AgentKind } from "../../core/agents.js";
import type { PairStatus } from "../../core/pairs.js";

export interface StoredPair {
  id: string;
  name: string;
  status: PairStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePairReservationInput {
  id: string;
  name: string;
  now: string;
}

export interface AttachAgentToPairInput {
  pairId: string;
  agentId: string;
  kind: AgentKind;
  now: string;
}

export type AttachAgentToPairResult =
  | {
      ok: true;
      pair: StoredPair;
    }
  | {
      ok: false;
      reason: "pair_kind_slot_occupied";
      existingAgentId: string;
    };

interface PairRow {
  id: string;
  name: string;
  status: PairStatus;
  created_at: string;
  updated_at: string;
}

export interface PairRepository {
  createReservation(input: CreatePairReservationInput): StoredPair;
  attachAgent(input: AttachAgentToPairInput): AttachAgentToPairResult;
  findByName(name: string): StoredPair | null;
}

export function createPairRepository(db: Database): PairRepository {
  return {
    createReservation(input) {
      const pair: StoredPair = {
        id: input.id,
        name: input.name,
        status: "pending",
        createdAt: input.now,
        updatedAt: input.now,
      };

      db.prepare(
        `
          insert into pairs (
            id,
            name,
            status,
            created_at,
            updated_at
          ) values (
            @id,
            @name,
            @status,
            @createdAt,
            @updatedAt
          )
        `,
      ).run(pair);

      return pair;
    },

    attachAgent(input) {
      const occupied = db
        .prepare(
          `
            select id from agents
            where pair_id = @pairId
              and kind = @kind
              and id <> @agentId
          `,
        )
        .all({
          pairId: input.pairId,
          kind: input.kind,
          agentId: input.agentId,
        })[0] as { id: string } | undefined;

      if (occupied) {
        return {
          ok: false,
          reason: "pair_kind_slot_occupied",
          existingAgentId: occupied.id,
        };
      }

      db.prepare(
        `
          update agents
          set pair_id = ?, updated_at = ?
          where id = ?
        `,
      ).run([input.pairId, input.now, input.agentId]);

      const status = readAttachedKinds(db, input.pairId).size === 2
        ? "ready"
        : "pending";

      db.prepare(
        `
          update pairs
          set status = ?, updated_at = ?
          where id = ?
        `,
      ).run([status, input.now, input.pairId]);

      const row = db
        .prepare("select * from pairs where id = ?")
        .all(input.pairId)[0] as PairRow;

      return {
        ok: true,
        pair: mapPairRow(row),
      };
    },

    findByName(name) {
      const row = db
        .prepare("select * from pairs where name = ?")
        .all(name)[0] as PairRow | undefined;

      return row ? mapPairRow(row) : null;
    },
  };
}

function readAttachedKinds(db: Database, pairId: string): Set<AgentKind> {
  const rows = db
    .prepare("select distinct kind from agents where pair_id = ?")
    .all(pairId) as Array<{ kind: AgentKind }>;

  return new Set(rows.map((row) => row.kind));
}

function mapPairRow(row: PairRow): StoredPair {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
