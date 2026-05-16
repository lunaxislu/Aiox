declare module "better-sqlite3" {
  export type RunResult = {
    changes: number;
    lastInsertRowid: number | bigint;
  };

  export type Statement = {
    run(parameters?: unknown): RunResult;
    all(parameters?: unknown): unknown[];
  };

  export type DatabaseInstance = {
    close(): void;
    exec(sql: string): void;
    pragma(sql: string, options?: { simple?: boolean }): unknown;
    prepare(sql: string): Statement;
    transaction<T extends (...args: never[]) => unknown>(fn: T): T;
  };

  export default class Database {
    constructor(path: string);
    close(): void;
    exec(sql: string): void;
    pragma(sql: string, options?: { simple?: boolean }): unknown;
    prepare(sql: string): Statement;
    transaction<T extends (...args: never[]) => unknown>(fn: T): T;
  }
}
