import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

type PackageManifest = {
  name?: string;
  private?: boolean;
  packageManager?: string;
  dependencies?: Record<string, string>;
};

const workspacePackages = {
  "apps/cli": {
    name: "@aiox/cli",
    dependencies: { "@aiox/protocol": "workspace:*" },
  },
  "apps/server": {
    name: "@aiox/server",
    dependencies: {
      "@aiox/adapter-sdk": "workspace:*",
      "@aiox/config": "workspace:*",
      "@aiox/database": "workspace:*",
      "@aiox/domain": "workspace:*",
      "@aiox/protocol": "workspace:*",
    },
  },
  "apps/web": {
    name: "@aiox/web",
    dependencies: { "@aiox/protocol": "workspace:*" },
  },
  "packages/protocol": { name: "@aiox/protocol", dependencies: {} },
  "packages/domain": { name: "@aiox/domain", dependencies: {} },
  "packages/config": { name: "@aiox/config", dependencies: {} },
  "packages/database": {
    name: "@aiox/database",
    dependencies: { "@aiox/domain": "workspace:*" },
  },
  "packages/adapter-sdk": {
    name: "@aiox/adapter-sdk",
    dependencies: {},
  },
  "adapters/claude-cli": {
    name: "@aiox/adapter-claude-cli",
    dependencies: { "@aiox/adapter-sdk": "workspace:*" },
  },
  "adapters/codex-cli": {
    name: "@aiox/adapter-codex-cli",
    dependencies: { "@aiox/adapter-sdk": "workspace:*" },
  },
} as const;

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

describe("Stage 1 workspace foundation", () => {
  it("declares the accepted workspace roots and preserves the legacy root importer", async () => {
    const rootManifest = (await readJson("package.json")) as PackageManifest;
    const workspace = await readFile("pnpm-workspace.yaml", "utf8");

    expect(rootManifest.private).toBe(true);
    expect(rootManifest.packageManager).toBe("pnpm@10.33.0");
    expect(workspace).toBe(
      ["packages:", "  - apps/*", "  - packages/*", "  - adapters/*", ""].join(
        "\n",
      ),
    );
  });

  it("declares private package identities and only the accepted workspace edges", async () => {
    for (const [directory, expected] of Object.entries(workspacePackages)) {
      const manifest = (await readJson(
        `${directory}/package.json`,
      )) as PackageManifest;
      const workspaceDependencies = Object.fromEntries(
        Object.entries(manifest.dependencies ?? {}).filter(([name]) =>
          name.startsWith("@aiox/"),
        ),
      );

      expect(manifest.name, directory).toBe(expected.name);
      expect(manifest.private, directory).toBe(true);
      expect(workspaceDependencies, directory).toEqual(expected.dependencies);
    }
  });

  it("provides a platform-neutral shared compiler baseline", async () => {
    const config = await readJson("tsconfig.base.json");
    const compilerOptions = config.compilerOptions as Record<string, unknown>;

    expect(compilerOptions).toMatchObject({
      target: "ES2024",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    });
    expect(compilerOptions).not.toHaveProperty("rootDir");
    expect(compilerOptions).not.toHaveProperty("outDir");
    expect(compilerOptions).not.toHaveProperty("types");
  });
});
