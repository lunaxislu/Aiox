import { expect, test } from "vitest";

import { createFoundationPort } from "./bootstrap";

test("foundation commands cannot report a daemon operation as successful", async () => {
    await expect(
        createFoundationPort().execute({
            command: "daemon.start",
            args: [],
            options: {},
        }),
    ).rejects.toThrow("not available");
});
