import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
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

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>;
}

describe("Stage 1 package-local source aliases", () => {
  it("maps @/* to the owning workspace src root without baseUrl", async () => {
    for (const directory of workspaceDirectories) {
      const config = await readJson(`${directory}/tsconfig.json`);
      const compilerOptions = config.compilerOptions as Record<string, unknown>;

      expect(compilerOptions.baseUrl, directory).toBeUndefined();
      expect(compilerOptions.paths, directory).toEqual({
        "@/*": ["./src/*"],
      });
    }
  });

  it("resolves @/ inside its owner and does not capture @aiox package names", () => {
    for (const directory of workspaceDirectories) {
      const configPath = path.resolve(directory, "tsconfig.json");
      const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
      expect(loaded.error, directory).toBeUndefined();

      const parsed = ts.parseJsonConfigFileContent(
        loaded.config,
        ts.sys,
        path.dirname(configPath),
        undefined,
        configPath,
      );
      expect(parsed.errors, directory).toEqual([]);

      const local = ts.resolveModuleName(
        "@/index.js",
        path.resolve(directory, "src/alias-consumer.ts"),
        parsed.options,
        ts.sys,
      ).resolvedModule;

      expect(local?.resolvedFileName, directory).toBe(
        path.resolve(directory, "src/index.ts"),
      );
      expect(parsed.options.paths?.["@aiox/*"], directory).toBeUndefined();
    }
  });
});
