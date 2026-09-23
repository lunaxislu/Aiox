import { execFileSync } from "node:child_process";

import { test } from "vitest";

test("bootstrap DDL matches the current Drizzle schema without PATH commands", () => {
    execFileSync(process.execPath, ["scripts/generate-schema.mjs", "--check"], {
        cwd: new URL("../..", import.meta.url),
        env: Object.fromEntries(
            Object.entries(process.env).map(([key, value]) => [
                key,
                key.toLowerCase() === "path" ? "" : value,
            ]),
        ),
        stdio: "pipe",
    });
});
