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
      id text primary key
    );

    create table if not exists routes (
      id text primary key
    );

    create table if not exists messages (
      id text primary key
    );

    create table if not exists message_deliveries (
      id text primary key
    );

    create table if not exists events (
      id text primary key
    );
  `);
}
