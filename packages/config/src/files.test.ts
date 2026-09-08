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

test("malformed file reports an error instead of silently restoring defaults", async () => {
    const directory = await home();
    await saveConfig({}, { home: directory });
    await writeFile(configPath(directory), "{broken");
    await expect(loadConfig({ home: directory })).rejects.toThrow(
        "Invalid JSON",
    );
});
