import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, expect, test } from "vitest";

import { configPath, saveConfig } from "@/files";
import { parseHostManifest, loadHostManifest, prepareHostInput } from "@/host";

const yaml = `host: {name: work}
agents:
  a: {adapter: claude, args: ["--model", "sonnet", ""]}
  b: {adapter: codex}
networks:
  team:
    agents: [a, b]
    routing:
      allow: [{between: [a, b]}]
`;
const homes: string[] = [];
async function directory() {
    const home = await mkdtemp(join(tmpdir(), "aiox-host-"));
    homes.push(home);
    return home;
}
afterEach(async () => {
    await Promise.all(
        homes
            .splice(0)
            .map((home) => rm(home, { recursive: true, force: true })),
    );
});

test("manifest resolves defaults and directed routes while preserving argv and declaration order", () => {
    const result = parseHostManifest(yaml);
    expect(result.host).toEqual({ name: "work", instruction: "" });
    expect(Object.keys(result.agents)).toEqual(["a", "b"]);
    expect(result.agents.a?.args).toEqual(["--model", "sonnet", ""]);
    expect(result.network).toEqual({
        name: "team",
        agents: ["a", "b"],
        default: "allow",
        routes: [
            { from: "a", to: "b", allowed: true },
            { from: "b", to: "a", allowed: true },
        ],
    });
});

test("YAML rejects structural and reference errors including duplicate expanded edges", () => {
    for (const invalid of [
        yaml + "extra: true\n",
        yaml + "---\n{}",
        yaml.replace("name: work", "name: work, name: other"),
        yaml.replace("name: work", "name: !custom work"),
        yaml.replace("name: work", "name: null"),
        yaml.replace("adapter: claude", "adapter: claude-code"),
        yaml.replace("agents: [a, b]", "agents: [a, missing]"),
        yaml.replace("between: [a, b]", "from: a, to: [a]"),
        yaml.replace("between: [a, b]", "between: [a, a]"),
        yaml.replace("name: work", "name: a/b"),
        yaml.replace(
            "host: {name: work}",
            "host: {name: work, layout: {preset: grid}}",
        ),
        yaml.replace("adapter: codex", "adapter: codex, args: [1]"),
        "1: value\n" + yaml,
    ])
        expect(() => parseHostManifest(invalid)).toThrow();
    for (const rule of ["allow", "deny"]) {
        const invalid = yaml.replace(
            "allow: [{between: [a, b]}]",
            `${rule}: [{between: [a, b]}, {from: a, to: [b]}]`,
        );
        expect(() => parseHostManifest(invalid)).toThrow(
            /networks.team.routing.*a.*b/,
        );
    }
    expect(() =>
        parseHostManifest(yaml + "      deny: [{from: a, to: [b]}]\n"),
    ).toThrow(/a.*b/);
});

test("file discovery requires exactly one candidate and resolves explicit file relative to directory", async () => {
    const path = await directory();
    await expect(loadHostManifest({ directory: path })).rejects.toThrow(
        /No.*YAML/,
    );
    await writeFile(join(path, "aiox.yaml"), yaml);
    expect((await loadHostManifest({ directory: path })).file).toBe(
        join(path, "aiox.yaml"),
    );
    await writeFile(join(path, "aiox.dev.yaml"), yaml);
    await expect(loadHostManifest({ directory: path })).rejects.toThrow(
        /--file/,
    );
    expect(
        (await loadHostManifest({ directory: path, file: "aiox.dev.yaml" }))
            .manifest.host.name,
    ).toBe("work");
});

test("preparation validates config then YAML then CLI and explicit Host cwd wins", async () => {
    const home = await directory();
    const path = await directory();
    await mkdir(join(home, ".aiox"));
    await writeFile(configPath(home), "{bad");
    const input = {
        source: { directory: path },
        cliErrors: ["bad CLI option"],
    };
    await expect(prepareHostInput(input, { home })).rejects.toThrow(
        /Invalid JSON/,
    );
    await saveConfig(
        {
            terminal: { shell: process.execPath, cwd: "/missing-global-cwd" },
            host: { layout: { columns: 2, rows: 2 } },
        },
        { home },
    );
    await expect(prepareHostInput(input, { home })).rejects.toThrow(/No.*YAML/);
    await writeFile(join(path, "aiox.yaml"), yaml);
    await expect(prepareHostInput(input, { home })).rejects.toThrow(
        /bad CLI option/,
    );
    const prepared = await prepareHostInput(
        { source: { directory: path }, layout: { columns: 3 }, launch: true },
        { home },
    );
    expect(prepared.layout).toEqual({ preset: "grid", columns: 3, rows: 2 });
    expect(prepared.terminal?.cwd).toBe(path);
    // Named Host queries do not require a YAML file or validate unused executable availability.
    expect((await prepareHostInput({}, { home })).manifest).toBeUndefined();
});

test("manifest preserves numeric-looking declaration order and rejects non-UTF8 files", async () => {
    const numeric = yaml
        .replaceAll("a:", '"20":')
        .replaceAll("b:", '"3":')
        .replaceAll("[a, b]", '["20", "3"]');
    expect(parseHostManifest(numeric).agentOrder).toEqual(["20", "3"]);
    const path = await directory();
    await writeFile(join(path, "aiox.yaml"), Buffer.from([0xff]));
    await expect(loadHostManifest({ directory: path })).rejects.toThrow();
});

test("shared preparation identifies config and YAML failure stages", async () => {
    const home = await directory();
    await expect(
        prepareHostInput({ source: { directory: home } }, { home }),
    ).rejects.toMatchObject({ stage: "yaml" });
    await mkdir(join(home, ".aiox"));
    await writeFile(configPath(home), "{bad");
    await expect(
        prepareHostInput({ source: { directory: home } }, { home }),
    ).rejects.toMatchObject({ stage: "config" });
});
