import { expect, test } from "vitest";

import { parseConfig } from "@/schema";

test("partial global settings merge defaults and CLI ports win", () => {
    expect(parseConfig({ ports: { daemon: 5100 } }, { web: 5200 })).toEqual({
        ports: { daemon: 5100, web: 5200 },
    });
});

test("invalid settings including browser theme cannot enter global config", () => {
    for (const value of [
        null,
        [],
        { theme: "dark" },
        { ports: { daemon: 0 } },
        { ports: { daemon: null } },
        { ports: { daemon: 4501 } },
        { terminal: { fontSize: -1 } },
        { keyboard: { next: false } },
    ]) {
        expect(() => parseConfig(value)).toThrow();
    }
});
