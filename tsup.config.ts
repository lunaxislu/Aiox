import { readFileSync } from "node:fs";

import { defineConfig, type Options } from "tsup";

const packages: Record<string, Options> = {
    "@aiox/domain": {},
    "@aiox/vendor": {},
    "@aiox/adapter-codex": {},
    "@aiox/adapter-claude": {
        entry: ["src/index.ts", "src/claude-hook-main.ts"],
    },
    "@aiox/config": {},
    "@aiox/protocol": {},
    "@aiox/persistence": {
        external: ["better-sqlite3", "typeorm", "@aiox/domain"],
    },
    "@aiox/terminal": {
        entry: ["src/index.ts", "src/restore.ts"],
        external: ["node-pty"],
        noExternal: ["@xterm/headless"],
    },
    "@aiox/daemon": {
        // dev-harness is a Stage 2 verification entry, not part of the product surface.
        entry: ["src/index.ts", "src/main.ts", "src/dev-harness.ts"],
    },
    "@aiox/cli": {
        entry: ["src/index.ts", "src/main.ts"],
    },
};

// pnpm runs each build in its package directory, in dependency order.
const { name } = JSON.parse(readFileSync("package.json", "utf8")) as {
    name: string;
};
if (!Object.hasOwn(packages, name)) {
    throw new Error(`No tsup configuration for package: ${name}`);
}

export default defineConfig({
    entry: ["src/index.ts"],
    tsconfig: "tsconfig.json",
    outDir: "dist",
    format: ["esm"],
    dts: true,
    clean: true,
    ...packages[name],
});
