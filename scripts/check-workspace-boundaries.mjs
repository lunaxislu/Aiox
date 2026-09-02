import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const packageContracts = {
  "apps/cli": ["@aiox/cli", ["@aiox/protocol"]],
  "apps/server": [
    "@aiox/server",
    [
      "@aiox/adapter-sdk",
      "@aiox/config",
      "@aiox/database",
      "@aiox/domain",
      "@aiox/protocol",
    ],
  ],
  "apps/web": ["@aiox/web", ["@aiox/protocol"]],
  "packages/protocol": ["@aiox/protocol", []],
  "packages/domain": ["@aiox/domain", []],
  "packages/config": ["@aiox/config", []],
  "packages/database": ["@aiox/database", ["@aiox/domain"]],
  "packages/adapter-sdk": ["@aiox/adapter-sdk", []],
  "adapters/claude-cli": [
    "@aiox/adapter-claude-cli",
    ["@aiox/adapter-sdk"],
  ],
  "adapters/codex-cli": [
    "@aiox/adapter-codex-cli",
    ["@aiox/adapter-sdk"],
  ],
};

const failures = [];
const dependencySections = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];
const domainPlatformDependencies =
  /^(?:@types\/node|@types\/ws|better-sqlite3|react(?:-dom)?|sqlite(?:3)?|ws)$/;
const workspaceRoots = ["apps", "packages", "adapters"];

function report(condition, message) {
  if (!condition) failures.push(message);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
}

async function sourceFiles(directory) {
  const root = path.join(repoRoot, directory, "src");
  const files = [];

  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(absolute);
    }
  }

  await visit(root);
  return files;
}

async function discoverWorkspacePackages() {
  const directories = [];

  for (const workspaceRoot of workspaceRoots) {
    const entries = await readdir(path.join(repoRoot, workspaceRoot), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const directory = `${workspaceRoot}/${entry.name}`;
      try {
        await readFile(path.join(repoRoot, directory, "package.json"), "utf8");
        directories.push(directory);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }

  return directories.sort();
}

function importSpecifiers(source) {
  const specifiers = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

async function checkPackage(directory) {
  const [expectedName, expectedWorkspaceDependencies] =
    packageContracts[directory];
  const packageRoot = path.join(repoRoot, directory);
  const manifest = await readJson(`${directory}/package.json`);
  const workspaceDependencies = Object.entries(manifest.dependencies ?? {})
    .filter(([name]) => name.startsWith("@aiox/"))
    .sort(([left], [right]) => left.localeCompare(right));
  const expectedEntries = expectedWorkspaceDependencies
    .map((name) => [name, "workspace:*"])
    .sort(([left], [right]) => left.localeCompare(right));

  for (const section of dependencySections.slice(1)) {
    for (const name of Object.keys(manifest[section] ?? {})) {
      report(
        !name.startsWith("@aiox/"),
        `${directory}: workspace dependency ${name} must be in dependencies`,
      );
    }
  }

  report(manifest.name === expectedName, `${directory}: unexpected package name`);
  report(manifest.private === true, `${directory}: package must remain private`);
  report(
    JSON.stringify(workspaceDependencies) === JSON.stringify(expectedEntries),
    `${directory}: workspace dependency edge mismatch`,
  );
  report(
    manifest.exports?.["."]?.import === "./dist/index.js" &&
      manifest.exports?.["."]?.types === "./dist/index.d.ts",
    `${directory}: public export boundary mismatch`,
  );
  for (const script of ["lint", "typecheck", "build", "test"]) {
    report(Boolean(manifest.scripts?.[script]), `${directory}: missing ${script} script`);
  }

  if (directory === "packages/domain") {
    for (const section of dependencySections) {
      for (const name of Object.keys(manifest[section] ?? {})) {
        report(
          !domainPlatformDependencies.test(name),
          `${directory}: domain platform dependency ${name}`,
        );
      }
    }
  }

  for (const file of await sourceFiles(directory)) {
    const source = await readFile(file, "utf8");
    for (const specifier of importSpecifiers(source)) {
      if (specifier.startsWith(".")) {
        const resolved = path.resolve(path.dirname(file), specifier);
        report(
          resolved === packageRoot || resolved.startsWith(`${packageRoot}${path.sep}`),
          `${path.relative(repoRoot, file)}: relative import escapes package boundary ${specifier}`,
        );
      }
      if (!specifier.startsWith("@aiox/")) continue;
      report(
        expectedWorkspaceDependencies.includes(specifier),
        `${path.relative(repoRoot, file)}: forbidden workspace import ${specifier}`,
      );
    }

    if (directory === "packages/domain") {
      report(
        !/react|node:|\bprocess\b|better-sqlite3|sqlite|\bWebSocket\b|(?:^|["'])ws(?:["']|$)|apps\/|adapters\//i.test(
          source,
        ),
        `${path.relative(repoRoot, file)}: domain platform dependency detected`,
      );
    }
  }
}

const packageFlag = process.argv.indexOf("--package");
let selected;

if (packageFlag === -1) {
  const expected = Object.keys(packageContracts).sort();
  const discovered = await discoverWorkspacePackages();
  for (const directory of discovered) {
    report(
      expected.includes(directory),
      `unexpected workspace package ${directory}`,
    );
  }
  for (const directory of expected) {
    report(
      discovered.includes(directory),
      `missing workspace package ${directory}`,
    );
  }
  selected = expected.filter((directory) => discovered.includes(directory));
} else {
  selected = [process.argv[packageFlag + 1]];
}

for (const directory of selected) {
  if (!(directory in packageContracts)) {
    failures.push(`unknown workspace package: ${directory}`);
    continue;
  }
  await checkPackage(directory);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`workspace boundaries passed (${selected.length} packages)`);
}
