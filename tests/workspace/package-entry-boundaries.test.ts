import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

type Manifest = {
  exports?: Record<string, { types: string; import: string }>;
  scripts?: Record<string, string>;
};

const sharedPackages = [
  "protocol",
  "domain",
  "config",
  "database",
  "adapter-sdk",
] as const;
const builtInAdapters = ["claude-cli", "codex-cli"] as const;

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

describe("Stage 1 package and adapter entry boundaries", () => {
  it("declares a single public build entry for every package", async () => {
    const directories = [
      ...sharedPackages.map((name) => `packages/${name}`),
      ...builtInAdapters.map((name) => `adapters/${name}`),
    ];

    for (const directory of directories) {
      const manifest = (await readJson(`${directory}/package.json`)) as Manifest;

      expect(manifest.exports, directory).toEqual({
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
        },
      });
      expect(manifest.scripts, directory).toMatchObject({
        build: "tsc -p tsconfig.json",
        typecheck: "tsc -p tsconfig.json --noEmit",
      });
      expect(await readFile(`${directory}/src/index.ts`, "utf8"), directory).toBe(
        "export {};\n",
      );
    }
  });

  it("keeps shared skeletons platform-neutral and adapters Node-scoped", async () => {
    for (const name of sharedPackages) {
      const config = await readJson(`packages/${name}/tsconfig.json`);
      const compilerOptions = config.compilerOptions as Record<string, unknown>;

      expect(config.extends, name).toBe("../../tsconfig.base.json");
      expect(compilerOptions.types, name).toEqual([]);
      expect(compilerOptions.lib, name).toEqual(["ES2024"]);
    }

    for (const name of builtInAdapters) {
      const config = await readJson(`adapters/${name}/tsconfig.json`);
      const compilerOptions = config.compilerOptions as Record<string, unknown>;

      expect(config.extends, name).toBe("../../tsconfig.base.json");
      expect(compilerOptions.types, name).toEqual(["node"]);
    }
  });

  it("does not leak implementation dependencies into domain", async () => {
    const domainSource = await readFile("packages/domain/src/index.ts", "utf8");
    const domainConfig = await readFile("packages/domain/tsconfig.json", "utf8");

    expect(`${domainSource}\n${domainConfig}`).not.toMatch(
      /react|node:|\bprocess\b|better-sqlite3|sqlite|websocket|\bws\b|apps\/|adapters\//i,
    );
  });
});
