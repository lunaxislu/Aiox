import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
    root: process.cwd(),
    resolve: {
        alias: { "@": resolve(process.cwd(), "src") },
    },
    test: {
        include: ["src/**/*.test.ts"],
    },
});
