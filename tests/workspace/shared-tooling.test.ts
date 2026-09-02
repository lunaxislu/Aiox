import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const workspaceDirectories = [
  "apps/cli",
  "apps/server",
  "apps/web",
  "packages/protocol",
  "packages/domain",
  "packages/config",
  "packages/database",
  "packages/adapter-sdk",
  "adapters/claude-cli",
  "adapters/codex-cli",
] as const;

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

describe("Stage 1 shared tooling", () => {
  it("orchestrates legacy root and every workspace without optional scripts", async () => {
    const manifest = await readJson("package.json");
    const scripts = manifest.scripts as Record<string, string>;

    expect(scripts).toMatchObject({
      lint: "node scripts/check-workspace-boundaries.mjs && pnpm --recursive --sort lint",
      typecheck:
        "pnpm run typecheck:legacy && pnpm --recursive --sort typecheck",
      "typecheck:legacy": "tsc --noEmit",
      build: "pnpm run build:legacy && pnpm --recursive --sort build",
      "build:legacy": "tsc",
      test: "pnpm run test:root && pnpm --recursive --sort test",
      "test:root": "vitest run",
      check: "pnpm run lint && pnpm run typecheck && pnpm run build && pnpm run test",
    });
    expect(Object.values(scripts).join("\n")).not.toContain("--if-present");
  });

  it("gives every child the complete shared command surface", async () => {
    for (const directory of workspaceDirectories) {
      const manifest = await readJson(`${directory}/package.json`);
      const scripts = manifest.scripts as Record<string, string>;

      expect(scripts, directory).toMatchObject({
        lint: `node ../../scripts/check-workspace-boundaries.mjs --package ${directory}`,
        typecheck: "tsc -p tsconfig.json --noEmit",
        build:
          directory === "apps/web"
            ? "vite build && tsc -p tsconfig.json"
            : "tsc -p tsconfig.json",
        test: "node --test",
      });
    }
  });

  it("shares compiler defaults without widening the legacy root boundary", async () => {
    const rootConfig = await readJson("tsconfig.json");
    const compilerOptions = rootConfig.compilerOptions as Record<string, unknown>;

    expect(rootConfig.extends).toBe("./tsconfig.base.json");
    expect(compilerOptions).toEqual({
      rootDir: "./",
      outDir: "dist",
      types: ["node"],
    });
    expect(await readFile(".gitignore", "utf8")).toContain("**/dist/");
    await access("scripts/check-workspace-boundaries.mjs");
  });
});
