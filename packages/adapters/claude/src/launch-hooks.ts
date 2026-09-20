import { fileURLToPath } from "node:url";

import { claudeHookCommand } from "@/claude-hook";

export function launchHooks(): Record<string, unknown> {
    const hook = claudeHookCommand(
        process.execPath,
        fileURLToPath(new URL("./claude-hook-main.js", import.meta.url)),
    );
    return Object.fromEntries(
        ["SessionStart", "StopFailure", "Notification"].map((name) => [
            name,
            [{ hooks: [hook] }],
        ]),
    );
}
