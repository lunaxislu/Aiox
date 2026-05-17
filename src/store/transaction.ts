import type Database from "better-sqlite3";

export function withTransaction<T>(db: Database, fn: () => T): T {
  return db.transaction(fn)();
}
