import { expect, test } from "vitest";

test("terminal launch settings preserve argv and reject invalid process inputs", () => {
    const terminal = {
        shell: "wsl.exe",
        args: ["-d", "Ubuntu", ""],
        cwd: "/home/me",
    };
    expect(parseConfig({ terminal }).terminal).toEqual(terminal);
    for (const invalid of [
        { shell: "" },
        { shell: "bad\0file" },
        { cwd: "bad\0dir" },
        { args: "-l" },
        { args: [1] },
        { args: ["bad\0arg"] },
    ])
        expect(() => parseConfig({ terminal: invalid })).toThrow(ConfigError);
});

import {
    ConfigError,
    parseConfig,
    parseHostLayout,
    resolveHostLayout,
} from "@/schema";

test("layout priority inherits only matching presets and discards dimensions across preset changes", () => {
    const global = { preset: "grid", columns: 2, rows: 2 };
    expect(resolveHostLayout()).toEqual({ preset: "auto" });
    expect(resolveHostLayout({ global, yaml: { columns: 3 } })).toEqual({
        preset: "grid",
        columns: 3,
        rows: 2,
    });
    expect(
        resolveHostLayout({ global, yaml: { columns: 3 }, cli: { rows: 4 } }),
    ).toEqual({ preset: "grid", columns: 3, rows: 4 });
    expect(resolveHostLayout({ global, yaml: { preset: "auto" } })).toEqual({
        preset: "auto",
    });
    expect(
        resolveHostLayout({
            global,
            yaml: { preset: "auto" },
            cli: { preset: "grid", rows: 1 },
        }),
    ).toEqual({ preset: "grid", rows: 1 });
    expect(resolveHostLayout({ global, yaml: {}, cli: {} })).toEqual(global);
    expect(() =>
        resolveHostLayout({
            global: { preset: "grid", rows: -1 },
            cli: { preset: "auto" },
        }),
    ).toThrow(ConfigError);
});

test("YAML dimensions imply grid while explicit non-grid conflicts are rejected", () => {
    expect(parseHostLayout({ columns: 2, rows: 3 }, "yaml")).toEqual({
        preset: "grid",
        columns: 2,
        rows: 3,
    });
    expect(parseHostLayout({ rows: 3 }, "yaml")).toEqual({
        preset: "grid",
        rows: 3,
    });
    for (const preset of ["auto", "left-main", "top-main"]) {
        expect(() => parseHostLayout({ preset, columns: 2 }, "yaml")).toThrow(
            ConfigError,
        );
    }
    expect(parseHostLayout({ columns: 2 }, "global")).toEqual({
        preset: "grid",
        columns: 2,
    });
});

test("host layout validates presets and grid dimensions without inferring missing dimensions", () => {
    expect(parseConfig({ host: { layout: {} } }).host).toEqual({
        layout: { preset: "auto" },
    });
    for (const preset of ["auto", "left-main", "top-main", "grid"]) {
        expect(
            parseConfig({ host: { layout: { preset } } }).host?.layout,
        ).toEqual({ preset });
    }
    expect(
        parseConfig({ host: { layout: { preset: "grid", columns: 2 } } }).host
            ?.layout,
    ).toEqual({ preset: "grid", columns: 2 });
    for (const layout of [
        null,
        [],
        { preset: "unknown" },
        { preset: "auto", rows: 2 },
        { preset: "grid", columns: 0 },
        { preset: "grid", rows: 1.5 },
        { preset: "grid", rows: "2" },
        { preset: "grid", cells: 2 },
    ]) {
        expect(() => parseConfig({ host: { layout } })).toThrow(ConfigError);
    }
});

test("sidebar width is optional and validates without choosing a UI default", () => {
    expect(parseConfig({}).web).toBeUndefined();
    expect(parseConfig({ web: { sidebar: { width: 280.5 } } }).web).toEqual({
        sidebar: { width: 280.5 },
    });
    for (const width of [0, -1, Infinity, NaN, "240", null]) {
        expect(() => parseConfig({ web: { sidebar: { width } } })).toThrow(
            ConfigError,
        );
    }
    expect(() => parseConfig({ web: { sidebar: { size: 240 } } })).toThrow(
        ConfigError,
    );
});

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
