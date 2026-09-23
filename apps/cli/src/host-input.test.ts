import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, expect, test, vi } from "vitest";

import { createFoundationPort } from "@/bootstrap";
import { createCli } from "@/cli";
import { failedHostRequest, prepareHostRequest } from "@/host-input";
const homes: string[] = [];

test.each([
    ["--path", "-workspace", "-workspace/aiox.yaml"],
    ["--file", "-custom.yaml", "-custom.yaml"],
])(
    "Host accepts a leading hyphen in %s values",
    async (option, value, file) => {
        const home = await mkdtemp(join(tmpdir(), "aiox-host-hyphen-"));
        homes.push(home);
        await mkdir(join(home, "-workspace"));
        await writeFile(
            join(home, file),
            "host: {name: work}\nagents: {a: {adapter: codex}}\nnetworks: {n: {agents: [a]}}\n",
        );
        const cwd = vi.spyOn(process, "cwd").mockReturnValue(home);
        try {
            for (const args of [[option, value], [`${option}=${value}`]]) {
                await expect(
                    createCli({
                        execute: (request) =>
                            prepareHostRequest(request, { home }),
                    }).parseAsync(["host", "status", ...args], {
                        from: "user",
                    }),
                ).resolves.toBeDefined();
            }
        } finally {
            cwd.mockRestore();
        }
    },
);

test("Host error recovery consumes option-looking required values before locating status", async () => {
    const home = await mkdtemp(join(tmpdir(), "aiox-host-recovery-"));
    homes.push(home);
    const argv = ["host", "--path", "--file", "status", "dev", "--unknown"];
    expect(failedHostRequest(argv, "unknown option")).toMatchObject({
        command: "host.status",
        args: ["dev"],
        options: { path: "--file" },
        selectionErrors: [],
    });
    await expect(
        createCli(createFoundationPort({ home })).parseAsync(argv, {
            from: "user",
        }),
    ).rejects.toThrow(/unknown option/);
});
afterEach(async () => {
    vi.unstubAllGlobals();
    await Promise.all(
        homes
            .splice(0)
            .map((home) => rm(home, { recursive: true, force: true })),
    );
});

test("Host restart validates config, YAML and CLI in order without changing existing state or calling daemon", async () => {
    const home = await mkdtemp(join(tmpdir(), "aiox-host-cli-"));
    homes.push(home);
    await mkdir(join(home, ".aiox"));
    const config = join(home, ".aiox/config.json");
    const state = join(home, ".aiox/daemon.json");
    await writeFile(state, "existing daemon state");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const run = (...args: string[]) =>
        createCli(createFoundationPort({ home })).parseAsync(
            ["host", ...args],
            { from: "user" },
        );
    await writeFile(config, "{broken");
    await expect(run("restart", "--path", home, "--unknown")).rejects.toThrow(
        /Invalid JSON/,
    );
    await writeFile(config, "{}");
    await expect(run("restart", "--path", home, "--unknown")).rejects.toThrow(
        /No.*YAML/,
    );
    await writeFile(
        join(home, "aiox.yaml"),
        "host: {name: work}\nagents: {a: {adapter: codex}}\nnetworks: {n: {agents: [a]}}\n",
    );
    await expect(run("restart", "--path", home, "--unknown")).rejects.toThrow(
        /unknown option/,
    );
    await expect(
        run("run", "--path", home, "--layout", "grid"),
    ).rejects.toThrow(/columns|rows/);
    await expect(
        run("run", "--path", "first", "--path", "second"),
    ).rejects.toThrow(/only.*once/);
    await expect(run("run", "--path")).rejects.toThrow(/--path/);
    await expect(run("run", "--file")).rejects.toThrow(/--file/);
    await expect(run("agent", "start", "--path", home)).rejects.toThrow(
        /missing required argument/,
    );
    await expect(
        prepareHostRequest(
            {
                command: "host.run",
                args: [],
                options: { path: home, columns: "2" },
            },
            { home },
        ),
    ).resolves.toMatchObject({ layout: { preset: "grid", columns: 2 } });
    await expect(run("network", "list")).rejects.toThrow(
        /missing required argument/,
    );
    await expect(
        run("status", "registered", "--file", "missing.yaml"),
    ).rejects.toThrow(/hostname.*--file/);
    expect(fetch).not.toHaveBeenCalled();
    expect(await readFile(state, "utf8")).toBe("existing daemon state");
});

test("named Host and mandatory Host Network commands do not require YAML; help does not read config", async () => {
    const home = await mkdtemp(join(tmpdir(), "aiox-host-query-"));
    homes.push(home);
    const run = (...args: string[]) =>
        createCli(createFoundationPort({ home })).parseAsync(
            ["host", ...args],
            { from: "user" },
        );
    vi.stubGlobal(
        "fetch",
        vi.fn(
            async () =>
                new Response("[]", {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
        ),
    );
    for (const args of [
        ["status", "named"],
        ["stop", "named"],
        ["delete", "named"],
    ])
        await expect(run(...args)).rejects.toThrow(/unknown_host/);
    await expect(run("list")).resolves.toBeDefined();
    vi.stubGlobal(
        "fetch",
        vi.fn(
            async () =>
                new Response("[]", {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
        ),
    );
    await expect(run("network", "show", "named", "net")).rejects.toThrow(
        /unknown_host/,
    );
    await mkdir(join(home, ".aiox"));
    await writeFile(join(home, ".aiox/config.json"), "{bad");
    const cli = createCli(createFoundationPort({ home }));
    cli.commands
        .find((c) => c.name() === "host")!
        .configureOutput({ writeOut() {} });
    await expect(
        cli.parseAsync(["host", "--help"], { from: "user" }),
    ).rejects.toMatchObject({ exitCode: 0 });
});

test("direct Host selection survives parser errors even with source options before the subcommand", async () => {
    const home = await mkdtemp(join(tmpdir(), "aiox-host-direct-"));
    homes.push(home);
    await expect(
        createCli(createFoundationPort({ home })).parseAsync(
            [
                "host",
                "--path",
                join(home, "missing"),
                "status",
                "named",
                "--unknown",
            ],
            { from: "user" },
        ),
    ).rejects.toThrow(/unknown option/);
});
