import { readFileSync } from "node:fs";

import { defineConfig, type Options } from "tsup";

const packages: Record<string, Options> = {
    "@aiox/domain": {},
    "@aiox/config": {},
    "@aiox/persistence": {
        external: ["better-sqlite3", "@aiox/domain"],
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
