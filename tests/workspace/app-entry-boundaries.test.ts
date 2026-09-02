import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

type Manifest = {
  bin?: Record<string, string>;
  exports?: Record<string, { types: string; import: string }>;
  scripts?: Record<string, string>;
};

const apps = ["cli", "server", "web"] as const;

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

describe("Stage 1 app entry boundaries", () => {
  it("declares independent public build entries for every app", async () => {
    for (const app of apps) {
      const manifest = (await readJson(`apps/${app}/package.json`)) as Manifest;

      expect(manifest.exports, app).toEqual({
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
        },
      });
      expect(manifest.scripts, app).toMatchObject({
        build:
          app === "web"
            ? "vite build && tsc -p tsconfig.json"
            : "tsc -p tsconfig.json",
        typecheck: "tsc -p tsconfig.json --noEmit",
      });
    }
  });

  it("keeps CLI and server executable while leaving web browser-neutral", async () => {
    const cli = (await readJson("apps/cli/package.json")) as Manifest;
    const server = (await readJson("apps/server/package.json")) as Manifest;
    const web = (await readJson("apps/web/package.json")) as Manifest;
    const cliSource = await readFile("apps/cli/src/index.ts", "utf8");
    const serverSource = await readFile("apps/server/src/index.ts", "utf8");
    const webSource = await readFile("apps/web/src/index.ts", "utf8");

    expect(cli.bin).toEqual({ aiox: "./dist/index.js" });
    expect(server.bin).toEqual({ "aiox-server": "./dist/index.js" });
    expect(web.bin).toBeUndefined();
    expect(cliSource.startsWith("#!/usr/bin/env node\n")).toBe(true);
    expect(serverSource.startsWith("#!/usr/bin/env node\n")).toBe(true);
    expect(webSource).not.toMatch(/\b(?:node:|react|vite|process\b)/);
  });

  it("separates Node and browser compiler environments", async () => {
    for (const app of apps) {
      const config = await readJson(`apps/${app}/tsconfig.json`);
      const compilerOptions = config.compilerOptions as Record<string, unknown>;

      expect(config.extends, app).toBe("../../tsconfig.base.json");
      expect(compilerOptions, app).toMatchObject({
        rootDir: "src",
        outDir: "dist",
        declaration: true,
      });
      if (app === "web") {
        expect(compilerOptions.types).toEqual([]);
        expect(compilerOptions.lib).toEqual(["ES2024", "DOM", "DOM.Iterable"]);
      } else {
        expect(compilerOptions.types).toEqual(["node"]);
      }
    }
  });
});
