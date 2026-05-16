import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { openSqliteDatabase } from "../../../src/store/sqlite.js";

describe("SQLite database open", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();

      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("applies schema and enables WAL for a file-backed database", () => {
    const dir = mkdtempSync(join(tmpdir(), "aiox-store-"));
    tempDirs.push(dir);

    const db = openSqliteDatabase(join(dir, "state.db"));

    try {
      const tables = db
        .prepare(
          "select name from sqlite_master where type = 'table' and name = ?",
        )
        .all("agents") as Array<{ name: string }>;

      expect(tables).toEqual([{ name: "agents" }]);
      expect(db.pragma("journal_mode", { simple: true })).toBe("wal");
    } finally {
      db.close();
    }
  });
});
