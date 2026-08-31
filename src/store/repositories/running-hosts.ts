import type Database from "better-sqlite3";

export interface StoredRunningHost {
  id: string;
  name: string;
  canonicalPath: string;
  controllerId: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface InsertRunningHostRequest {
  id: string;
  name: string;
  canonicalPath: string;
  controllerId: string;
  now: string;
}

interface RunningHostRow {
  id: string;
  name: string;
  canonical_path: string;
  controller_id: string;
  created_at: string;
  last_seen_at: string;
}

export interface RunningHostRepository {
  insert(request: InsertRunningHostRequest): StoredRunningHost;
  findById(hostId: string): StoredRunningHost | null;
  findByCanonicalPath(canonicalPath: string): StoredRunningHost | null;
  findAllByName(name: string): StoredRunningHost[];
  list(): StoredRunningHost[];
  touch(request: { hostId: string; now: string }): StoredRunningHost | null;
  remove(hostId: string): StoredRunningHost | null;
}

export function createRunningHostRepository(db: Database): RunningHostRepository {
  return {
    insert(request) {
      const host: StoredRunningHost = {
        id: request.id,
        name: request.name,
        canonicalPath: request.canonicalPath,
        controllerId: request.controllerId,
        createdAt: request.now,
        lastSeenAt: request.now,
      };

      db.prepare(
        `
          insert into running_hosts (
            id,
            name,
            canonical_path,
            controller_id,
            created_at,
            last_seen_at
          ) values (
            @id,
            @name,
            @canonicalPath,
            @controllerId,
            @createdAt,
            @lastSeenAt
          )
        `,
      ).run(host);

      return host;
    },

    findById(hostId) {
      const row = db.prepare("select * from running_hosts where id = ?").get(hostId) as
        | RunningHostRow
        | undefined;

      return row ? mapRunningHostRow(row) : null;
    },

    findByCanonicalPath(canonicalPath) {
      const row = db
        .prepare("select * from running_hosts where canonical_path = ?")
        .get(canonicalPath) as RunningHostRow | undefined;

      return row ? mapRunningHostRow(row) : null;
    },

    findAllByName(name) {
      return db
        .prepare("select * from running_hosts where name = ? order by canonical_path")
        .all(name)
        .map((row) => mapRunningHostRow(row as RunningHostRow));
    },

    list() {
      return db
        .prepare("select * from running_hosts order by canonical_path")
        .all()
        .map((row) => mapRunningHostRow(row as RunningHostRow));
    },

    touch(request) {
      const existing = this.findById(request.hostId);

      if (!existing) {
        return null;
      }

      db.prepare("update running_hosts set last_seen_at = ? where id = ?").run(
        request.now,
        request.hostId,
      );

      return { ...existing, lastSeenAt: request.now };
    },

    remove(hostId) {
      const existing = this.findById(hostId);

      if (!existing) {
        return null;
      }

      db.prepare("delete from running_hosts where id = ?").run(hostId);

      return existing;
    },
  };
}

function mapRunningHostRow(row: RunningHostRow): StoredRunningHost {
  return {
    id: row.id,
    name: row.name,
    canonicalPath: row.canonical_path,
    controllerId: row.controller_id,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}
