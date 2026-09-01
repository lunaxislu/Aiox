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
      name text not null,
      host_id text not null default '',
      kind text not null,
      status text not null,
      cwd text not null,
      pair_id text,
      pair_slot text,
      adapter_session_id text,
      role text,
      description text,
      instructions text,
      last_seen_at text,
      created_at text not null,
      updated_at text not null,
      unique (host_id, name)
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
      origin_kind text not null default 'agent',
      parent_message_id text,
      type text not null,
      intent text,
      reply_expected integer,
      outcome_for_delivery_id text,
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

    create table if not exists delivery_outcome_notifications (
      original_delivery_id text not null,
      outcome_type text not null,
      notification_message_id text not null unique,
      notification_delivery_id text not null unique,
      created_at text not null,
      primary key (original_delivery_id, outcome_type)
    );
  `);

  applyMigration1(db);
  applyMigration2(db);
  applyMigration3(db);
  applyMigration4(db);
  applyMigration5(db);
  applyMigration6(db);
  applyMigration7(db);
  applyMigration8(db);
  applyMigration9(db);
  applyMigration10(db);
}

// Host-qualified routable identity (W6 Stage 5A): `agents.name` was globally
// unique, which collides once a host-scoped agent and a standalone agent (or
// two different hosts) may share a display name. This widens the uniqueness
// scope to `(host_id, name)`. Standalone rows use the non-null sentinel `''`
// rather than `NULL` for `host_id` specifically so the single DB-level unique
// index keeps enforcing global uniqueness among standalone agents by itself
// (SQLite's unique index treats NULL as distinct from NULL, which would
// silently stop enforcing that invariant) -- no separate app-level duplicate
// check is layered on top for the standalone case. SQLite cannot ALTER a
// table's unique constraint in place, so this rebuilds the table the same way
// migration 5 rebuilt delivery_outcome_notifications.
function applyMigration9(db: Database): void {
  if (isMigrationApplied(db, 9)) return;

  withTransaction(db, () => {
    db.exec(`
      create table agents_next (
        id text primary key,
        name text not null,
        host_id text not null default '',
        kind text not null,
        status text not null,
        cwd text not null,
        pair_id text,
        pair_slot text,
        adapter_session_id text,
        role text,
        description text,
        instructions text,
        last_seen_at text,
        created_at text not null,
        updated_at text not null,
        unique (host_id, name)
      );

      insert into agents_next (
        id, name, host_id, kind, status, cwd, pair_id, pair_slot,
        adapter_session_id, role, description, instructions,
        last_seen_at, created_at, updated_at
      )
      select
        id, name, '', kind, status, cwd, pair_id, pair_slot,
        adapter_session_id, role, description, instructions,
        last_seen_at, created_at, updated_at
      from agents;

      drop table agents;
      alter table agents_next rename to agents;

      create unique index if not exists agents_pair_slot_unique
      on agents(pair_id, pair_slot)
      where pair_id is not null;
    `);
    db.prepare(
      "insert or ignore into schema_version (version, applied_at) values (?, ?)",
    ).run(9, Date.now());
  });
}

// Running-host runtime tables. These hold runtime-only state: a host row exists
// only while its foreground controller runs, host-scoped agents live inside a
// host's own namespace (so the same agent name may run under several hosts and
// alongside a standalone `agents` row), and control requests are the relay
// buffer between another shell's CLI and the owning foreground controller.
// Nothing here is a persistent HostDefinition; `purgeRunningHostRuntime` below
// drops whatever a previous daemon left behind.
function applyMigration8(db: Database): void {
  if (isMigrationApplied(db, 8)) return;

  withTransaction(db, () => {
    db.exec(`
      create table if not exists running_hosts (
        id text primary key,
        name text not null,
        canonical_path text not null unique,
        controller_id text not null,
        created_at text not null,
        last_seen_at text not null
      );

      create table if not exists host_agents (
        id text primary key,
        host_id text not null,
        name text not null,
        kind text not null,
        status text not null,
        role text,
        description text,
        instructions text,
        created_at text not null,
        updated_at text not null,
        unique (host_id, name)
      );

      create table if not exists host_control_requests (
        id text primary key,
        host_id text not null,
        kind text not null,
        payload_json text,
        status text not null,
        claimed_by text,
        result_json text,
        failure_reason text,
        created_at text not null,
        updated_at text not null
      );
    `);
    db.prepare(
      "insert or ignore into schema_version (version, applied_at) values (?, ?)",
    ).run(8, Date.now());
  });
}

/**
 * Drops every running-host runtime row. Called once per daemon start so a
 * restart never resurrects a previous run's hosts, host-scoped agents, or
 * in-flight control requests.
 */
export function purgeRunningHostRuntime(db: Database): void {
  withTransaction(db, () => {
    db.exec("delete from host_control_requests");
    db.exec("delete from host_agents");
    db.exec("delete from running_hosts");
  });
}

// Data cleanup (DML, not DDL): the physical-delete redesign removed the
// "disconnected" agent state -- an agent row now only ever exists while
// connected, and departure deletes the row (and its routes) instead of
// flipping `status`. Any row already sitting at a non-"connected" status in
// an existing local DB predates that redesign and is now permanently stale
// (nothing will ever reconnect it or clean it up), so this migration removes
// it once, along with any route referencing it -- otherwise those rows would
// keep showing up as stale peers in `agents_list()` even after upgrading.
function applyMigration7(db: Database): void {
  if (isMigrationApplied(db, 7)) return;

  withTransaction(db, () => {
    db.exec(`
      delete from routes
      where source_agent_id in (select id from agents where status <> 'connected')
         or target_agent_id in (select id from agents where status <> 'connected')
    `);
    db.exec("delete from agents where status <> 'connected'");
    db.prepare(
      "insert or ignore into schema_version (version, applied_at) values (?, ?)",
    ).run(7, Date.now());
  });
}

function applyMigration6(db: Database): void {
  if (isMigrationApplied(db, 6)) return;

  withTransaction(db, () => {
    if (!columnExists(db, "agents", "role")) {
      db.exec("alter table agents add column role text");
    }
    if (!columnExists(db, "agents", "description")) {
      db.exec("alter table agents add column description text");
    }
    if (!columnExists(db, "agents", "instructions")) {
      db.exec("alter table agents add column instructions text");
    }
    db.prepare(
      "insert or ignore into schema_version (version, applied_at) values (?, ?)",
    ).run(6, Date.now());
  });
}

function applyMigration5(db: Database): void {
  if (isMigrationApplied(db, 5)) return;

  withTransaction(db, () => {
    if (!columnExists(db, "delivery_outcome_notifications", "outcome_type")) {
      db.exec(`
        create table delivery_outcome_notifications_next (
          original_delivery_id text not null,
          outcome_type text not null,
          notification_message_id text not null unique,
          notification_delivery_id text not null unique,
          created_at text not null,
          primary key (original_delivery_id, outcome_type)
        )
      `);
      db.exec(`
        insert into delivery_outcome_notifications_next (
          original_delivery_id,
          outcome_type,
          notification_message_id,
          notification_delivery_id,
          created_at
        )
        select
          original_delivery_id,
          'delivery_target_rejected',
          notification_message_id,
          notification_delivery_id,
          created_at
        from delivery_outcome_notifications
      `);
      db.exec("drop table delivery_outcome_notifications");
      db.exec(
        "alter table delivery_outcome_notifications_next rename to delivery_outcome_notifications",
      );
    }
    db.prepare(
      "insert or ignore into schema_version (version, applied_at) values (?, ?)",
    ).run(5, Date.now());
  });
}

function applyMigration4(db: Database): void {
  if (isMigrationApplied(db, 4)) return;

  withTransaction(db, () => {
    if (!columnExists(db, "messages", "origin_kind")) {
      db.exec("alter table messages add column origin_kind text not null default 'agent'");
    }
    if (!columnExists(db, "messages", "outcome_for_delivery_id")) {
      db.exec("alter table messages add column outcome_for_delivery_id text");
    }
    db.exec(`
      create table if not exists delivery_outcome_notifications (
        original_delivery_id text primary key,
        notification_message_id text not null unique,
        notification_delivery_id text not null unique,
        created_at text not null
      )
    `);
    db.prepare(
      "insert or ignore into schema_version (version, applied_at) values (?, ?)",
    ).run(4, Date.now());
  });
}

function applyMigration3(db: Database): void {
  if (isMigrationApplied(db, 3)) return;

  withTransaction(db, () => {
    db.exec(`
      create table if not exists reply_rights (
        originating_delivery_id text primary key,
        consumed_reply_message_id text,
        consumed_reply_delivery_id text,
        created_at text not null,
        consumed_at text
      )
    `);
    db.exec(`
      insert or ignore into reply_rights
        (originating_delivery_id, consumed_reply_message_id, consumed_reply_delivery_id, created_at, consumed_at)
      select
        d.id,
        reply.id,
        reply_delivery.id,
        d.created_at,
        reply.created_at
      from message_deliveries d
      join messages m on m.id = d.message_id
      left join messages reply on reply.id = (
        select candidate.id
        from messages candidate
        where candidate.type = 'reply'
          and candidate.parent_message_id = d.id
        order by candidate.created_at, candidate.id
        limit 1
      )
      left join message_deliveries reply_delivery on reply_delivery.id = (
        select candidate.id
        from message_deliveries candidate
        where candidate.message_id = reply.id
        order by candidate.created_at, candidate.id
        limit 1
      )
      where m.reply_expected = 1
    `);
    db.prepare(
      "insert or ignore into schema_version (version, applied_at) values (?, ?)",
    ).run(3, Date.now());
  });
}

function applyMigration2(db: Database): void {
  if (isMigrationApplied(db, 2)) {
    return;
  }

  withTransaction(db, () => {
    if (!columnExists(db, "messages", "intent")) {
      db.exec("alter table messages add column intent text");
    }
    if (!columnExists(db, "messages", "reply_expected")) {
      db.exec("alter table messages add column reply_expected integer");
    }
    db.prepare(
      "insert or ignore into schema_version (version, applied_at) values (?, ?)",
    ).run(2, Date.now());
  });
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

// Production termination (W6 Stage 5D, Blocker 4 correction): the daemon
// never spawns a host-scoped agent's vendor process itself (the surface's
// own `aiox claude/codex --host-id` CLI does, via a `ChildProcess` handle
// only that process owns). A raw recorded PID can go stale -- the vendor
// exiting while the row lags, or an abnormally-terminated wrapper -- and the
// OS can hand a stale PID to an unrelated process, so `AgentRuntimeTerminator`
// never signals a PID directly. Instead it records a termination intent
// here; the hosted CLI polls its own row and signals the live handle it
// actually owns. `pending_signal_seq` identifies each intent and
// `delivered_signal_seq` is advanced only after `child.kill()` truthfully
// accepted that exact intent. The daemon refuses to overwrite an unacknowledged
// intent, so repeated signals cannot collapse into the final value.
function applyMigration10(db: Database): void {
  if (isMigrationApplied(db, 10)) return;

  withTransaction(db, () => {
    if (!columnExists(db, "host_agents", "pending_signal")) {
      db.exec("alter table host_agents add column pending_signal text");
    }
    if (!columnExists(db, "host_agents", "pending_signal_seq")) {
      db.exec("alter table host_agents add column pending_signal_seq integer not null default 0");
    }
    if (!columnExists(db, "host_agents", "delivered_signal_seq")) {
      db.exec("alter table host_agents add column delivered_signal_seq integer not null default 0");
    }
    db.prepare(
      "insert or ignore into schema_version (version, applied_at) values (?, ?)",
    ).run(10, Date.now());
  });
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
