import { stat } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, test } from "vitest";

import { createClaudeInbox } from "./claude-environment";

test("the launcher owns a private inbox directory and disposes it after execution", async () => {
    const inbox = await createClaudeInbox();
    const directory = dirname(inbox.path);
    try {
        expect(Buffer.byteLength(inbox.path)).toBeLessThanOrEqual(103);
        expect((await stat(directory)).mode & 0o777).toBe(0o700);
    } finally {
        await inbox.dispose();
    }
    await expect(stat(directory)).rejects.toMatchObject({ code: "ENOENT" });
    await inbox.dispose();
});
