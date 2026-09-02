import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
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

async function createDomainFixture(source: string): Promise<string> {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "aiox-workspace-boundary-"),
  );
  await mkdir(path.join(fixtureRoot, "scripts"), { recursive: true });
  await mkdir(path.join(fixtureRoot, "packages/domain/src"), {
    recursive: true,
  });
  await cp(
    "scripts/check-workspace-boundaries.mjs",
    path.join(fixtureRoot, "scripts/check-workspace-boundaries.mjs"),
  );
  await cp(
    "packages/domain/package.json",
    path.join(fixtureRoot, "packages/domain/package.json"),
  );
  await writeFile(
    path.join(fixtureRoot, "packages/domain/src/index.ts"),
    source,
  );
  return fixtureRoot;
}

async function createWorkspaceFixture(): Promise<string> {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "aiox-workspace-discovery-"),
  );
  await mkdir(path.join(fixtureRoot, "scripts"), { recursive: true });
  await cp(
    "scripts/check-workspace-boundaries.mjs",
    path.join(fixtureRoot, "scripts/check-workspace-boundaries.mjs"),
  );

  for (const directory of workspaceDirectories) {
    await mkdir(path.join(fixtureRoot, directory), { recursive: true });
    await cp(
      path.join(directory, "package.json"),
      path.join(fixtureRoot, directory, "package.json"),
    );
    await cp(path.join(directory, "src"), path.join(fixtureRoot, directory, "src"), {
      recursive: true,
    });
  }

  return fixtureRoot;
}

describe("Stage 1 dependency and export smoke", () => {
  it("accepts the checked-in dependency directions", () => {
    expect(
      execFileSync(process.execPath, ["scripts/check-workspace-boundaries.mjs"], {
        encoding: "utf8",
      }),
    ).toContain("workspace boundaries passed (10 packages)");
  });

  it("fails closed when an undeclared workspace package is discovered", async () => {
    const fixtureRoot = await createWorkspaceFixture();
    const unexpectedRoot = path.join(fixtureRoot, "packages/unexpected");
    await mkdir(path.join(unexpectedRoot, "src"), { recursive: true });
    await writeFile(
      path.join(unexpectedRoot, "package.json"),
      `${JSON.stringify({ name: "@aiox/unexpected", private: true }, null, 2)}\n`,
    );
    await writeFile(path.join(unexpectedRoot, "src/index.ts"), "export {};\n");

    try {
      const probe = spawnSync(
        process.execPath,
        ["scripts/check-workspace-boundaries.mjs"],
        { cwd: fixtureRoot, encoding: "utf8" },
      );

      expect(probe.status).toBe(1);
      expect(probe.stderr).toContain(
        "unexpected workspace package packages/unexpected",
      );
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when domain imports a platform dependency", async () => {
    const fixtureRoot = await createDomainFixture(
      'import "node:fs";\nexport {};\n',
    );

    try {
      const probe = spawnSync(
        process.execPath,
        [
          "scripts/check-workspace-boundaries.mjs",
          "--package",
          "packages/domain",
        ],
        { cwd: fixtureRoot, encoding: "utf8" },
      );

      expect(probe.status).toBe(1);
      expect(probe.stderr).toContain("domain platform dependency detected");
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("fails closed on a side-effect-only forbidden workspace import", async () => {
    const fixtureRoot = await createDomainFixture(
      'import "@aiox/config";\nexport {};\n',
    );

    try {
      const probe = spawnSync(
        process.execPath,
        [
          "scripts/check-workspace-boundaries.mjs",
          "--package",
          "packages/domain",
        ],
        { cwd: fixtureRoot, encoding: "utf8" },
      );

      expect(probe.status).toBe(1);
      expect(probe.stderr).toContain(
        "forbidden workspace import @aiox/config",
      );
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when a relative import escapes the package boundary", async () => {
    const fixtureRoot = await createDomainFixture(
      'import "../../config/dist/index.js";\nexport {};\n',
    );

    try {
      const probe = spawnSync(
        process.execPath,
        [
          "scripts/check-workspace-boundaries.mjs",
          "--package",
          "packages/domain",
        ],
        { cwd: fixtureRoot, encoding: "utf8" },
      );

      expect(probe.status).toBe(1);
      expect(probe.stderr).toContain(
        "relative import escapes package boundary",
      );
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when domain declares a platform dependency", async () => {
    const fixtureRoot = await createDomainFixture("export {};\n");

    try {
      const manifestPath = path.join(
        fixtureRoot,
        "packages/domain/package.json",
      );
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
        devDependencies?: Record<string, string>;
      };
      manifest.devDependencies = { react: "19.0.0" };
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      const probe = spawnSync(
        process.execPath,
        [
          "scripts/check-workspace-boundaries.mjs",
          "--package",
          "packages/domain",
        ],
        { cwd: fixtureRoot, encoding: "utf8" },
      );

      expect(probe.status).toBe(1);
      expect(probe.stderr).toContain("domain platform dependency react");
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("imports every built package through its public package name", async () => {
    execFileSync("pnpm", ["--recursive", "--sort", "build"], {
      stdio: "pipe",
    });

    for (const directory of workspaceDirectories) {
      const manifest = JSON.parse(
        await readFile(path.join(directory, "package.json"), "utf8"),
      ) as { name: string };
      const imported = spawnSync(
        process.execPath,
        [
          "--input-type=module",
          "--eval",
          `await import(${JSON.stringify(manifest.name)})`,
        ],
        { cwd: directory, encoding: "utf8" },
      );

      expect(imported.status, `${manifest.name}: ${imported.stderr}`).toBe(0);
    }
  });
});
