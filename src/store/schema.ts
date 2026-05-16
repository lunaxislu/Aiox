import type Database from "better-sqlite3";

export function applySchema(db: Database): void {
  db.exec(`
    create table if not exists agents (
      id text primary key,
      name text not null unique,
      kind text not null,
      status text not null,
      cwd text not null,
      pair_id text,
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
}
