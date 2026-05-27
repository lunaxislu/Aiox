import type Database from "better-sqlite3";

import { withTransaction } from "./transaction.js";

export type SchemaMigrationErrorReason = "schema_migration_failed";
export type SchemaMigrationErrorDetail = "duplicate_pair_slot_after_backfill";

export interface SchemaMigrationError extends Error {
  reason: SchemaMigrationErrorReason;
  detail: SchemaMigrationErrorDetail;
  conflicts: Array<{ pairId: string; kind: string; count: number }>;
}

export function applySchema(db: Database): void {
  db.exec(`
    create table if not exists agents (
      id text primary key,
      name text not null unique,
      kind text not null,
      status text not null,
      cwd text not null,
      pair_id text,
      pair_slot text,
      adapter_session_id text,
      last_seen_at text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists pairs (
      id text primary key,
      name text not null unique,
      status text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists routes (
      id text primary key,
      source_agent_id text not null,
      target_agent_id text not null,
      status text not null,
      created_at text not null,
      updated_at text not null,
      unique (source_agent_id, target_agent_id)
    );

    create table if not exists messages (
      id text primary key,
      source_agent_id text not null,
      parent_message_id text,
      type text not null,
      content text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists message_deliveries (
      id text primary key,
      message_id text not null,
      target_agent_id text not null,
      route_id text,
      status text not null,
      idempotency_key text not null unique,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists events (
      id text primary key,
      agent_id text,
      message_id text,
      delivery_id text,
      route_id text,
      type text not null,
      data_json text not null,
      created_at text not null
    );
  `);

  applyMigration1(db);
}

function applyMigration1(db: Database): void {
  if (isMigrationApplied(db, 1)) {
    return;
  }

  withTransaction(db, () => {
    const hasPairSlot = columnExists(db, "agents", "pair_slot");

    if (!hasPairSlot) {
      const conflicts = db
        .prepare(
          `
            select pair_id as pairId, kind, count(*) as count
            from agents
            where pair_id is not null
            group by pair_id, kind
            having count(*) > 1
          `,
        )
        .all() as Array<{ pairId: string; kind: string; count: number }>;

      if (conflicts.length > 0) {
        throw createSchemaMigrationError(conflicts);
      }

      db.exec("alter table agents add column pair_slot text");
      db.exec(`
        update agents
        set pair_slot = case kind
          when 'codex' then 'a'
          when 'claude' then 'b'
        end
        where pair_id is not null
      `);
    }

    db.exec(`
      create unique index if not exists agents_pair_slot_unique
      on agents(pair_id, pair_slot)
      where pair_id is not null
    `);
    db.exec(`
      create table if not exists schema_version (
        version integer primary key,
        applied_at integer not null
      )
    `);
    db.prepare(
      "insert or ignore into schema_version (version, applied_at) values (?, ?)",
    ).run(1, Date.now());
  });
}

function isMigrationApplied(db: Database, version: number): boolean {
  if (!tableExists(db, "schema_version")) {
    return false;
  }

  const row = db
    .prepare("select version from schema_version where version = ?")
    .get(version) as { version: number } | undefined;

  return row !== undefined;
}

function tableExists(db: Database, tableName: string): boolean {
  const row = db
    .prepare("select name from sqlite_master where type = 'table' and name = ?")
    .get(tableName) as { name: string } | undefined;

  return row !== undefined;
}

function columnExists(db: Database, tableName: string, columnName: string): boolean {
  return db
    .prepare(`select name from pragma_table_info('${tableName}') where name = ?`)
    .get(columnName) !== undefined;
}

function createSchemaMigrationError(
  conflicts: Array<{ pairId: string; kind: string; count: number }>,
): SchemaMigrationError {
  const error = new Error(
    `schema migration failed: duplicate pair slot after backfill ${JSON.stringify(conflicts)}`,
  ) as SchemaMigrationError;
  error.reason = "schema_migration_failed";
  error.detail = "duplicate_pair_slot_after_backfill";
  error.conflicts = conflicts;
  return error;
}
