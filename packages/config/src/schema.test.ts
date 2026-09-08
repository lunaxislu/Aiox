import { expect, test } from "vitest";

import { ConfigError, parseConfig } from "@/schema";

test("partial global settings merge defaults and CLI ports win", () => {
    expect(parseConfig({ ports: { daemon: 5100 } }, { web: 5200 })).toEqual({
        ports: { daemon: 5100, web: 5200 },
        messages: { retentionDays: 30 },
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

test("retention days is a global setting with a 30 day default", () => {
    expect(parseConfig({ messages: { retentionDays: 7 } }).messages).toEqual({
        retentionDays: 7,
    });
    expect(parseConfig({}).messages).toEqual({ retentionDays: 30 });
    for (const retentionDays of [0, -1, 1.5, "30", null]) {
        expect(() => parseConfig({ messages: { retentionDays } })).toThrow(
            ConfigError,
        );
    }
    expect(() => parseConfig({ messages: { keepDays: 30 } })).toThrow(
        ConfigError,
    );
});
