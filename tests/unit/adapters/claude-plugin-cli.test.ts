import { describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

import { execFile } from "node:child_process";

import {
  loadClaudePluginInventory,
  type ClaudeCliRunner,
} from "../../../src/adapters/claude/plugin-cli.js";

// ---------------------------------------------------------------------------
// R3 step 1 adapter: read Claude plugin inventory from the CLI, cwd-required.
// CONTRACT (history/52): both `plugin marketplace list --json` and
// `plugin list --json` MUST run in the user's cwd; the latter's `enabled` is
// already resolved for that directory. Tests pin the cwd plumbing + the
// JSON/schema parse-failure contract.
// ---------------------------------------------------------------------------

const CWD = "/Users/me/Documents/ai-orchestration";
const INSTALL_PATH = "/Users/me/.claude/plugins/cache/aiox/aiox-channel-ingress/0.1.0";

const MARKETPLACES = [
  {
    name: "claude-plugins-official",
    source: "github",
    repo: "anthropics/claude-plugins-official",
    installLocation: "/Users/me/.claude/plugins/marketplaces/claude-plugins-official",
  },
  { name: "aiox", source: "directory", path: "/Users/me/spike/aiox-channel-marketplace" },
];

// Real shape incl. extra fields (installedAt/lastUpdated/mcpServers) we ignore.
const PLUGINS = [
  {
    id: "aiox-channel-ingress@aiox",
    version: "0.1.0",
    scope: "user",
    enabled: true,
    installPath: INSTALL_PATH,
    installedAt: "2026-05-30T06:35:27.848Z",
    lastUpdated: "2026-05-30T06:35:27.848Z",
    mcpServers: {
      "aiox-claude-ingress": {
        command: "node",
        args: ["${CLAUDE_PLUGIN_ROOT}/channel-server.js"],
      },
    },
  },
  {
    id: "aiox-channel-ingress@aiox",
    version: "0.1.0",
    scope: "project",
    enabled: true,
    installPath: INSTALL_PATH,
    projectPath: CWD,
    installedAt: "2026-05-30T06:35:35.070Z",
    lastUpdated: "2026-05-30T06:35:35.070Z",
  },
];

function staticRun(marketplaceStdout: string, pluginStdout: string): ClaudeCliRunner {
  return async (args) => ({
    stdout: args.includes("marketplace") ? marketplaceStdout : pluginStdout,
  });
}

describe("loadClaudePluginInventory", () => {
  it("parses marketplaces + plugins and drops unused/absent fields", async () => {
    const inventory = await loadClaudePluginInventory({
      cwd: CWD,
      run: staticRun(JSON.stringify(MARKETPLACES), JSON.stringify(PLUGINS)),
    });

    expect(inventory.marketplaces).toEqual(["claude-plugins-official", "aiox"]);
    expect(inventory.plugins).toHaveLength(2);
    // user entry: extra fields (installedAt/mcpServers) dropped; no projectPath
    expect(inventory.plugins[0]).toEqual({
      id: "aiox-channel-ingress@aiox",
      enabled: true,
      scope: "user",
      version: "0.1.0",
      installPath: INSTALL_PATH,
    });
    // project entry: projectPath retained
    expect(inventory.plugins[1]).toEqual({
      id: "aiox-channel-ingress@aiox",
      enabled: true,
      scope: "project",
      version: "0.1.0",
      installPath: INSTALL_PATH,
      projectPath: CWD,
    });
  });

  it("runs BOTH commands in the provided cwd (resolution contract)", async () => {
    const calls: { args: string[]; cwd: string }[] = [];
    const run: ClaudeCliRunner = async (args, options) => {
      calls.push({ args, cwd: options.cwd });
      return {
        stdout: args.includes("marketplace")
          ? JSON.stringify(MARKETPLACES)
          : JSON.stringify(PLUGINS),
      };
    };

    await loadClaudePluginInventory({ cwd: CWD, run });

    expect(calls).toEqual([
      { args: ["plugin", "marketplace", "list", "--json"], cwd: CWD },
      { args: ["plugin", "list", "--json"], cwd: CWD },
    ]);
  });

  it("default runner forwards cwd to execFile (no implicit process.cwd())", async () => {
    vi.mocked(execFile).mockImplementation(((
      _bin: string,
      args: string[],
      _opts: unknown,
      cb: (e: unknown, stdout: string, stderr: string) => void,
    ) => {
      const out = args.includes("marketplace")
        ? JSON.stringify(MARKETPLACES)
        : JSON.stringify(PLUGINS);
      cb(null, out, "");
      return {} as never;
    }) as never);

    await loadClaudePluginInventory({ cwd: CWD, command: "claude" });

    expect(execFile).toHaveBeenCalledWith(
      "claude",
      ["plugin", "marketplace", "list", "--json"],
      expect.objectContaining({ cwd: CWD }),
      expect.any(Function),
    );
    expect(execFile).toHaveBeenCalledWith(
      "claude",
      ["plugin", "list", "--json"],
      expect.objectContaining({ cwd: CWD }),
      expect.any(Function),
    );
  });

  it("throws claude_plugin_cli_failed when the runner rejects", async () => {
    const run: ClaudeCliRunner = async () => {
      throw new Error("spawn claude ENOENT");
    };

    await expect(loadClaudePluginInventory({ cwd: CWD, run })).rejects.toMatchObject({
      name: "ClaudePluginCliError",
      code: "claude_plugin_cli_failed",
    });
  });

  it("throws claude_plugin_cli_parse_failed on non-JSON output", async () => {
    const run = staticRun(JSON.stringify(MARKETPLACES), "not json at all");

    await expect(loadClaudePluginInventory({ cwd: CWD, run })).rejects.toMatchObject({
      code: "claude_plugin_cli_parse_failed",
    });
  });

  it("throws parse_failed when a plugin entry is missing `id`", async () => {
    const run = staticRun(
      JSON.stringify(MARKETPLACES),
      JSON.stringify([{ enabled: true, scope: "user" }]),
    );

    await expect(loadClaudePluginInventory({ cwd: CWD, run })).rejects.toMatchObject({
      code: "claude_plugin_cli_parse_failed",
    });
  });

  it("throws parse_failed when `enabled` is not a boolean", async () => {
    const run = staticRun(
      JSON.stringify(MARKETPLACES),
      JSON.stringify([{ id: "x@y", scope: "user", enabled: "yes" }]),
    );

    await expect(loadClaudePluginInventory({ cwd: CWD, run })).rejects.toMatchObject({
      code: "claude_plugin_cli_parse_failed",
    });
  });

  it("throws parse_failed when a marketplace entry is missing `name`", async () => {
    const run = staticRun(
      JSON.stringify([{ source: "github" }]),
      JSON.stringify(PLUGINS),
    );

    await expect(loadClaudePluginInventory({ cwd: CWD, run })).rejects.toMatchObject({
      code: "claude_plugin_cli_parse_failed",
    });
  });

  it("accepts an unknown scope (lenient — scope is diagnostic only)", async () => {
    const run = staticRun(
      JSON.stringify(MARKETPLACES),
      JSON.stringify([
        { id: "x@y", scope: "future-scope", enabled: true, installPath: INSTALL_PATH },
      ]),
    );

    const inventory = await loadClaudePluginInventory({ cwd: CWD, run });
    expect(inventory.plugins[0]).toMatchObject({ scope: "future-scope", enabled: true });
  });
});
