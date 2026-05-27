import type Database from "better-sqlite3";

import type { AgentKind } from "../../core/agents.js";
import type { PairSlot, PairStatus } from "../../core/pairs.js";

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
  slot?: PairSlot;
  now: string;
}

export type AttachAgentToPairResult =
  | {
      ok: true;
      pair: StoredPair;
      slot: PairSlot;
    }
  | {
      ok: false;
      reason: "agent_not_found";
      agentId: string;
    }
  | {
      ok: false;
      reason: "agent_kind_mismatch";
      agentId: string;
      expectedKind: AgentKind;
      actualKind: AgentKind;
    }
  | {
      ok: false;
      reason: "agent_already_attached" | "pair_slot_occupied";
      existingAgentId: string;
    }
  | {
      ok: false;
      reason: "pair_full";
    };

interface AgentRow {
  id: string;
  kind: AgentKind;
}

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
  list(): StoredPair[];
}

export function createPairRepository(db: Database): PairRepository {
  const attachAgentTxn = db.transaction(
    (input: AttachAgentToPairInput): AttachAgentToPairResult => {
      const agent = db
        .prepare("select id, kind from agents where id = ?")
        .get(input.agentId) as AgentRow | undefined;

      if (!agent) {
        return {
          ok: false,
          reason: "agent_not_found",
          agentId: input.agentId,
        };
      }

      if (agent.kind !== input.kind) {
        return {
          ok: false,
          reason: "agent_kind_mismatch",
          agentId: input.agentId,
          expectedKind: input.kind,
          actualKind: agent.kind,
        };
      }

      const alreadyAttached = db
        .prepare(
          `
            select id from agents
            where pair_id = @pairId
              and id = @agentId
            limit 1
          `,
        )
        .get({
          pairId: input.pairId,
          agentId: input.agentId,
        }) as { id: string } | undefined;

      if (alreadyAttached) {
        return {
          ok: false,
          reason: "agent_already_attached",
          existingAgentId: alreadyAttached.id,
        };
      }

      const slot = input.slot ?? pickFirstOpenSlot(db, input.pairId);

      if (!slot) {
        return {
          ok: false,
          reason: "pair_full",
        };
      }

      const occupied = db
        .prepare(
          `
            select id from agents
            where pair_id = @pairId
              and pair_slot = @slot
              and id <> @agentId
          `,
        )
        .get({
          pairId: input.pairId,
          slot,
          agentId: input.agentId,
        }) as { id: string } | undefined;

      if (occupied) {
        return {
          ok: false,
          reason: "pair_slot_occupied",
          existingAgentId: occupied.id,
        };
      }

      db.prepare(
        `
          update agents
          set pair_id = @pairId, pair_slot = @slot, updated_at = @now
          where id = @agentId
        `,
      ).run({
        pairId: input.pairId,
        slot,
        now: input.now,
        agentId: input.agentId,
      });

      const status = isPairReady(db, input.pairId) ? "ready" : "pending";

      db.prepare(
        `
          update pairs
          set status = @status, updated_at = @now
          where id = @pairId
        `,
      ).run({
        status,
        now: input.now,
        pairId: input.pairId,
      });

      const row = db
        .prepare("select * from pairs where id = ?")
        .get(input.pairId) as PairRow;

      return {
        ok: true,
        pair: mapPairRow(row),
        slot,
      };
    },
  );

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
      return attachAgentTxn(input);
    },

    findByName(name) {
      const row = db
        .prepare("select * from pairs where name = ?")
        .get(name) as PairRow | undefined;

      return row ? mapPairRow(row) : null;
    },

    list() {
      return db
        .prepare("select * from pairs order by id")
        .all()
        .map((row) => mapPairRow(row as PairRow));
    },
  };
}

function pickFirstOpenSlot(db: Database, pairId: string): PairSlot | null {
  const slots = readAttachedSlots(db, pairId);

  if (!slots.has("a")) {
    return "a";
  }

  if (!slots.has("b")) {
    return "b";
  }

  return null;
}

function isPairReady(db: Database, pairId: string): boolean {
  const slots = readAttachedSlots(db, pairId);
  return slots.size === 2 && slots.has("a") && slots.has("b");
}

function readAttachedSlots(db: Database, pairId: string): Set<PairSlot> {
  const rows = db
    .prepare("select distinct pair_slot from agents where pair_id = ? and pair_slot is not null")
    .all(pairId) as Array<{ pair_slot: PairSlot }>;

  return new Set(rows.map((row) => row.pair_slot));
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
