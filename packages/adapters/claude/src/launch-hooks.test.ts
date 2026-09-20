import { expect, test } from "vitest";

import { launchHooks } from "@/launch-hooks";

test("each Claude observation hook invokes the adapter-owned executable entry", () => {
    const hooks = launchHooks();
    expect(Object.keys(hooks)).toEqual([
        "SessionStart",
        "StopFailure",
        "Notification",
    ]);
    for (const entries of Object.values(hooks)) {
        expect(entries).toEqual([
            {
                hooks: [
                    {
                        type: "command",
                        command: process.execPath,
                        args: [expect.stringMatching(/claude-hook-main\.js$/)],
                    },
                ],
            },
        ]);
    }
});
