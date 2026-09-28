import { resolve } from "node:path";
// The root config is shared by every package, so it stays node-only and .ts.
// This app renders React, so it needs a DOM and .tsx test files.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
const dirname =
    typeof __dirname !== "undefined"
        ? __dirname
        : path.dirname(fileURLToPath(import.meta.url));
const terminalBrowserTests = [
    "src/terminal-keybindings.test.ts",
    "src/terminal-clipboard.test.ts",
    "src/terminal-theme.test.ts",
];

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "src"),
        },
    },
    test: {
        projects: [
            {
                extends: true,
                test: {
                    environment: "happy-dom",
                    include: [
                        "src/**/*.test.ts",
                        "src/**/*.test.tsx",
                        "vite.config.test.ts",
                    ],
                    exclude: terminalBrowserTests,
                },
            },
            {
                extends: true,
                test: {
                    name: "terminal-browser",
                    include: terminalBrowserTests,
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright({}),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
            {
                extends: true,
                plugins: [
                    // The plugin will run tests for the stories defined in your Storybook config
                    // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
                    storybookTest({
                        configDir: path.join(dirname, ".storybook"),
                    }),
                ],
                test: {
                    name: "storybook",
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright({}),
                        instances: [
                            {
                                browser: "chromium",
                            },
                        ],
                    },
                },
            },
        ],
    },
});
