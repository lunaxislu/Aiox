import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { prepareClaudeLaunch } from "@/claude-launch";

vi.mock("node:fs/promises", async (importOriginal) => {
    const original = await importOriginal<typeof fs>();
    return { ...original, readFile: vi.fn(original.readFile) };
});

let cwd: string;
beforeEach(async () => {
    vi.mocked(fs.readFile).mockImplementation(
        (await vi.importActual<typeof fs>("node:fs/promises")).readFile,
    );
    cwd = await mkdtemp(join(tmpdir(), "aiox-launch-"));
});
afterEach(async () => {
    vi.restoreAllMocks();
    await rm(cwd, { recursive: true, force: true });
});

function input(args: string[] = []) {
    return {
        args,
        cwd,
        env: { HOME: cwd, CLAUDE_CONFIG_DIR: join(cwd, "config") },
        inboxPath: join(cwd, "inbox.sock"),
        mcpUrl: "http://localhost:4500/mcp/network",
        instruction: "AIOX communication instructions",
        hooks: {
            SessionStart: [
                { hooks: [{ type: "command", command: "aiox-hook" }] },
            ],
        },
    };
}

function option(args: string[], name: string) {
    return args[args.indexOf(name) + 1]!;
}

it.each(["win32", "linux"])(
    "respects %s environment-key case semantics for managed credentials",
    async (platform) => {
        vi.stubGlobal(
            "process",
            Object.create(process, {
                platform: { value: platform },
            }),
        );
        try {
            for (const key of [
                "aiox_mcp_token",
                "Aiox_Hook_Token",
                "aiox_HOOK_url",
            ]) {
                const launch = prepareClaudeLaunch(
                    input([
                        "--settings",
                        JSON.stringify({ env: { [key]: "user-value" } }),
                    ]),
                );
                if (platform === "win32")
                    await expect(launch).rejects.toThrow(
                        "overrides a connection value",
                    );
                else
                    await expect(launch).resolves.toMatchObject({
                        env: expect.any(Object),
                    });
            }
        } finally {
            vi.unstubAllGlobals();
        }
    },
);

it("retains Stop uncertainty for active plugins without inspecting their code", async () => {
    for (const args of [
        ["--plugin-dir", "./user-plugin"],
        ["--plugin-dir=./user-plugin"],
        ["--settings", '{"enabledPlugins":{"review@example":true}}'],
    ]) {
        expect(
            (await prepareClaudeLaunch(input(args))).hasBlockingStopHooks,
        ).toBe(true);
    }
    await mkdir(join(cwd, "config"));
    await writeFile(
        join(cwd, "config/settings.json"),
        '{"enabledPlugins":{"review@example":true,"other@example":true}}',
    );
    expect(
        (
            await prepareClaudeLaunch(
                input([
                    "--settings",
                    '{"enabledPlugins":{"review@example":false}}',
                ]),
            )
        ).hasBlockingStopHooks,
    ).toBe(true);
    expect(
        (
            await prepareClaudeLaunch(
                input([
                    "--settings",
                    '{"enabledPlugins":{"review@example":false,"other@example":false}}',
                ]),
            )
        ).hasBlockingStopHooks,
    ).toBe(false);
    expect(
        (
            await prepareClaudeLaunch(
                input(["--setting-sources", "project,local"]),
            )
        ).hasBlockingStopHooks,
    ).toBe(false);
});

it("adds invocation-only settings without changing ordinary arguments or exposing a token", async () => {
    const launch = await prepareClaudeLaunch(input(["--model", "sonnet"]));
    expect(launch.args.slice(0, 2)).toEqual(["--model", "sonnet"]);
    expect(JSON.parse(option(launch.args, "--settings"))).toEqual({
        hooks: input().hooks,
    });
    expect(JSON.parse(option(launch.args, "--mcp-config"))).toEqual({
        mcpServers: {
            aiox: {
                type: "http",
                url: input().mcpUrl,
                headers: { Authorization: "Bearer ${AIOX_MCP_TOKEN}" },
            },
        },
    });
    expect(option(launch.args, "--append-system-prompt")).toBe(
        input().instruction,
    );
    expect(option(launch.args, "--messaging-socket-path")).toBe(
        input().inboxPath,
    );
    expect(launch.hasBlockingStopHooks).toBe(false);
});

it("preserves the final user settings and append file while adding hooks", async () => {
    const settings = {
        model: "sonnet",
        hooks: {
            Stop: [{ hooks: [{ type: "command", command: "user-stop" }] }],
            SessionStart: [
                { hooks: [{ type: "command", command: "user-start" }] },
            ],
        },
    };
    await writeFile(join(cwd, "settings.json"), JSON.stringify(settings));
    await writeFile(join(cwd, "instructions.txt"), "User instruction");
    const launch = await prepareClaudeLaunch(
        input([
            "--settings",
            '{"disableAllHooks":true}',
            "--settings=settings.json",
            "--append-system-prompt-file",
            "instructions.txt",
        ]),
    );
    expect(launch.args.filter((value) => value === "--settings")).toHaveLength(
        1,
    );
    expect(JSON.parse(option(launch.args, "--settings"))).toEqual({
        ...settings,
        hooks: {
            ...settings.hooks,
            SessionStart: [
                ...settings.hooks.SessionStart,
                ...input().hooks.SessionStart,
            ],
        },
    });
    expect(option(launch.args, "--append-system-prompt")).toBe(
        "User instruction\n\nAIOX communication instructions",
    );
    expect(launch.hasBlockingStopHooks).toBe(true);
    expect(await readFile(join(cwd, "settings.json"), "utf8")).toBe(
        JSON.stringify(settings),
    );
});

it("rejects actual required connection overrides with redacted actionable errors", async () => {
    for (const args of [
        ["--messaging-socket-path", "secret-path"],
        ["--safe-mode"],
        ["--bare"],
        ["--settings", '{"disableAllHooks":true}'],
        ["--settings", '{"env":{"AIOX_MCP_TOKEN":"secret-token"}}'],
        ["--settings", '{"env":{"AIOX_EXECUTION_OWNERSHIP":"external"}}'],
        [
            "--mcp-config",
            '{"mcpServers":{"aiox":{"type":"http","url":"secret-url"}}}',
        ],
    ]) {
        await expect(prepareClaudeLaunch(input(args))).rejects.toThrow(
            "Remove or correct",
        );
        await expect(prepareClaudeLaunch(input(args))).rejects.not.toThrow(
            "secret",
        );
    }
});

it("rejects safe mode inherited from the caller or settings without changing disabled values", async () => {
    for (const value of ["1", "TRUE", "0", "false", ""]) {
        for (const source of ["caller", "settings"]) {
            const mode = { CLAUDE_CODE_SAFE_MODE: value };
            const options = input(
                source === "settings"
                    ? ["--settings", JSON.stringify({ env: mode })]
                    : [],
            );
            if (source === "caller") Object.assign(options.env, mode);
            const prepared = prepareClaudeLaunch(options);
            if (value === "1" || value === "TRUE")
                await expect(prepared).rejects.toThrow("CLAUDE_CODE_SAFE_MODE");
            else await expect(prepared).resolves.toBeDefined();
        }
    }
});

it("preserves unrelated MCP definitions and accepts an identical aiox definition", async () => {
    const definition = {
        type: "http",
        url: input().mcpUrl,
        headers: { Authorization: "Bearer ${AIOX_MCP_TOKEN}" },
    };
    const mcp = JSON.stringify({
        mcpServers: {
            aiox: definition,
            user: { type: "http", url: "https://example.com/mcp" },
        },
    });
    const launch = await prepareClaudeLaunch(input(["--mcp-config", mcp]));
    expect(launch.args.slice(0, 2)).toEqual(["--mcp-config", mcp]);
    await expect(
        prepareClaudeLaunch(
            input(["--messaging-socket-path", input().inboxPath]),
        ),
    ).resolves.toBeDefined();
});

it("inspects active user/project sources without rejecting harmless files", async () => {
    await mkdir(join(cwd, "config"));
    await mkdir(join(cwd, ".claude"));
    await writeFile(
        join(cwd, "config", "settings.json"),
        JSON.stringify({ disableAllHooks: true }),
    );
    await expect(prepareClaudeLaunch(input())).rejects.toThrow(
        "disableAllHooks",
    );
    const launch = await prepareClaudeLaunch(
        input(["--settings", '{"disableAllHooks":false}']),
    );
    expect(launch).toBeDefined();
    await expect(
        prepareClaudeLaunch(input(["--setting-sources", "project,local"])),
    ).resolves.toBeDefined();
    await writeFile(
        join(cwd, "config", "settings.json"),
        JSON.stringify({
            hooks: {
                Stop: [{ hooks: [{ type: "command", command: "user-stop" }] }],
            },
        }),
    );
    expect((await prepareClaudeLaunch(input())).hasBlockingStopHooks).toBe(
        true,
    );
    await writeFile(
        join(cwd, ".mcp.json"),
        JSON.stringify({
            mcpServers: { aiox: { type: "http", url: "secret" } },
        }),
    );
    await expect(prepareClaudeLaunch(input())).rejects.toThrow(
        "mcpServers.aiox",
    );
    await writeFile(
        join(cwd, ".mcp.json"),
        JSON.stringify({
            mcpServers: {
                other: { type: "http", url: "https://example.com/mcp" },
            },
        }),
    );
    await expect(prepareClaudeLaunch(input())).resolves.toBeDefined();
});

it.skipIf(process.platform === "win32")(
    "checks main repository local settings when launched in a subdirectory",
    async () => {
        await promisify(execFile)("git", ["init", cwd]);
        await mkdir(join(cwd, ".claude"));
        await mkdir(join(cwd, "child"));
        await writeFile(
            join(cwd, ".claude/settings.local.json"),
            '{"disableAllHooks":true}',
        );
        await expect(
            prepareClaudeLaunch({
                ...input(),
                cwd: join(cwd, "child"),
                env: {
                    HOME: join(cwd, "home"),
                    CLAUDE_CONFIG_DIR: join(cwd, "config"),
                },
            }),
        ).rejects.toThrow("disableAllHooks");
    },
);

it("rejects a managed hooks restriction rather than silently dropping AIOX hooks", async () => {
    const original = (await vi.importActual<typeof fs>("node:fs/promises"))
        .readFile;
    vi.mocked(fs.readFile).mockImplementation(async (...args) => {
        if (String(args[0]).endsWith("managed-settings.json"))
            return '{"allowManagedHooksOnly":true}';
        return original(...args);
    });
    await expect(prepareClaudeLaunch(input())).rejects.toThrow(
        "allowManagedHooksOnly",
    );
});

it("keeps the vendor delimiter after injected options and applies last append value", async () => {
    const launch = await prepareClaudeLaunch(
        input([
            "--append-system-prompt",
            "old",
            "--append-system-prompt=new",
            "--",
            "--settings",
        ]),
    );
    expect(option(launch.args, "--append-system-prompt")).toBe(
        "new\n\nAIOX communication instructions",
    );
    expect(launch.args.slice(-2)).toEqual(["--", "--settings"]);
});

it("rejects headless flags and malformed hook input before launching", async () => {
    for (const args of [
        ["-p"],
        ["--print"],
        ["--settings", '{"hooks":"invalid"}'],
        ["--settings", "missing-file"],
        ["--settings"],
    ]) {
        await expect(prepareClaudeLaunch(input(args))).rejects.toThrow(
            "Cannot start Claude",
        );
    }
});

it("honors strict MCP source exclusion and local-over-user MCP precedence", async () => {
    await mkdir(join(cwd, "config"));
    const aiox = {
        type: "http",
        url: input().mcpUrl,
        headers: { Authorization: "Bearer ${AIOX_MCP_TOKEN}" },
    };
    await writeFile(
        join(cwd, "config/.claude.json"),
        JSON.stringify({
            mcpServers: { aiox: { type: "http", url: "secret" } },
            projects: { [cwd]: { mcpServers: { aiox } } },
        }),
    );
    await expect(prepareClaudeLaunch(input())).resolves.toBeDefined();
    await writeFile(
        join(cwd, "config/.claude.json"),
        JSON.stringify({
            mcpServers: { aiox: { type: "http", url: "secret" } },
        }),
    );
    await expect(prepareClaudeLaunch(input())).rejects.toThrow(
        "mcpServers.aiox",
    );
    await expect(
        prepareClaudeLaunch(input(["--strict-mcp-config"])),
    ).resolves.toBeDefined();
});
