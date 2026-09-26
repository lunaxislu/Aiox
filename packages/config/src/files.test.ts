import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, expect, test } from "vitest";

import { configPath, loadConfig, saveConfig } from "@/files";

const homes: string[] = [];
async function home() {
    const value = await mkdtemp(join(tmpdir(), "aiox-config-"));
    homes.push(value);
    return value;
}
afterEach(async () => {
    await Promise.all(
        homes
            .splice(0)
            .map((value) => rm(value, { recursive: true, force: true })),
    );
});

test("missing global file uses defaults without creating a project file", async () => {
    const directory = await home();
    expect(configPath(directory)).toBe(join(directory, ".aiox", "config.json"));
    expect(await loadConfig({ home: directory })).toEqual({
        ports: { daemon: 4500, web: 4501 },
        messages: { retentionDays: 30 },
    });
    expect(await readdir(directory)).toEqual([]);
});

test("valid saves replace one global file and leave no temporary files", async () => {
    const directory = await home();
    await saveConfig(
        {
            terminal: {
                fontFamily: "monospace",
                fontSize: 14,
                theme: { background: "#000" },
            },
        },
        { home: directory },
    );
    await saveConfig(
        { keyboard: { nextPane: "Ctrl+Tab" } },
        { home: directory },
    );
    expect(await loadConfig({ home: directory })).toEqual({
        ports: { daemon: 4500, web: 4501 },
        messages: { retentionDays: 30 },
        keyboard: { nextPane: "Ctrl+Tab" },
    });
    expect(await readdir(join(directory, ".aiox"))).toEqual(["config.json"]);
});

test("invalid saves preserve the last saved file", async () => {
    const directory = await home();
    await saveConfig({}, { home: directory });
    const before = await readFile(configPath(directory), "utf8");
    await expect(
        saveConfig({ ports: { daemon: -1 } }, { home: directory }),
    ).rejects.toThrow();
    expect(await readFile(configPath(directory), "utf8")).toBe(before);
});

test("sidebar and host layout round-trip with existing settings and invalid replacements preserve disk", async () => {
    const directory = await home();
    const input = {
        ports: { daemon: 5300, web: 5301 },
        messages: { retentionDays: 7 },
        keyboard: { nextPane: "Ctrl+Tab" },
        web: { sidebar: { width: 300 } },
        host: { layout: { preset: "grid", columns: 2, rows: 1 } },
    };
    await saveConfig(input, { home: directory });
    expect(await loadConfig({ home: directory })).toEqual(input);
    expect(
        (await loadConfig({ home: directory, portOverrides: { web: 5401 } }))
            .ports,
    ).toEqual({ daemon: 5300, web: 5401 });
    for (const invalid of [
        { ...input, web: { sidebar: { width: -1 } } },
        { ...input, host: { layout: { preset: "auto", rows: 2 } } },
    ]) {
        await expect(
            saveConfig(invalid, { home: directory }),
        ).rejects.toThrow();
        expect(await loadConfig({ home: directory })).toEqual(input);
    }
});

test("malformed file reports an error instead of silently restoring defaults", async () => {
    const directory = await home();
    await saveConfig({}, { home: directory });
    await writeFile(configPath(directory), "{broken");
    await expect(loadConfig({ home: directory })).rejects.toThrow(
        "Invalid JSON",
    );
});

test("terminal keybindings store only overrides and preserve the file on invalid input", async () => {
    const directory = await home();
    const terminal = { keybindings: { mac: { "Alt+ArrowLeft": null } } };
    await saveConfig({ terminal }, { home: directory });
    const before = await readFile(configPath(directory), "utf8");
    expect(JSON.parse(before).terminal).toEqual(terminal);
    expect((await loadConfig({ home: directory })).terminal).toEqual(terminal);
    for (const keybindings of [
        { wsl: {} },
        { mac: { "Altt+ArrowLeft": "x" } },
        { mac: { "Alt+Alt+ArrowLeft": "x" } },
        { mac: { "Alt+ArrowLeft": 3 } },
        { mac: { "Alt+ArrowLeft": "" } },
        { mac: { "Ctrl+Shift+k": "a", "Shift+Ctrl+K": "b" } },
    ]) {
        await expect(
            saveConfig({ terminal: { keybindings } }, { home: directory }),
        ).rejects.toThrow();
        expect(await readFile(configPath(directory), "utf8")).toBe(before);
    }
    await saveConfig(
        {
            terminal: {
                keybindings: { linux: { "Alt+ArrowLeft": "\u001bb" } },
            },
        },
        { home: directory },
    );
    expect(
        (await loadConfig({ home: directory })).terminal?.keybindings,
    ).toEqual({ linux: { "Alt+ArrowLeft": "\u001bb" } });
});
