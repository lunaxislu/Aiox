import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

// The root config is shared by every package, so it stays node-only and .ts.
// This app renders React, so it needs a DOM and .tsx test files.
export default defineConfig({
    resolve: {
        alias: { "@": resolve(import.meta.dirname, "src") },
    },
    test: {
        environment: "happy-dom",
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
});
