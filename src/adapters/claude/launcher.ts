import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Command builder (pure, testable)
// ---------------------------------------------------------------------------

export function buildLaunchClaudeChannelArgs(channelName: string): string[] {
  return ["--dangerously-load-development-channels", `server:${channelName}`];
}

// R3 strategy D (channel-as-plugin): activate the channel by referencing an
// installed plugin instead of an inline `server:<name>`. The `plugin:` form
// resolves the plugin's own bundled `.mcp.json`, so it does NOT emit the
// `no MCP server configured with that name` warning that `server:` does, and
// it is the prerequisite shape for a future `--channels` allowlist. See
// history/50 §Decision.
export function buildLaunchClaudePluginArgs(
  pluginName: string,
  marketplaceName: string,
): string[] {
  return [
    "--dangerously-load-development-channels",
    `plugin:${pluginName}@${marketplaceName}`,
  ];
}

export interface ClaudeChannelMcpConfigInput {
  channelName: string;
  agentName: string;
  agentToken: string;
  daemonSocketPath: string;
  /** node binary or compatible runtime. Defaults to the layout-resolved command. */
  runtimeBinary?: string;
  /** absolute path to the channel-server entry. Defaults to the layout-resolved path. */
  channelServerPath?: string;
}

/** A runnable inline channel-server entrypoint: `command scriptPath`. */
export interface InlineChannelServerEntry {
  command: string;
  scriptPath: string;
}

export interface ResolveInlineChannelServerDeps {
  /** defaults to this module's URL — used to detect src/TS vs dist/JS layout. */
  moduleUrl?: string;
  fileExists?: (path: string) => boolean;
  /** runtime for the dist/JS layout (defaults to the running node). */
  nodeCommand?: string;
  /** runtime for the src/TS layout (defaults to "tsx", resolved from PATH). */
  tsxCommand?: string;
}

// R3 step 3b delta (history/56): the inline (A) strategy is an EXPLICIT dev/debug
// path, so its bundled channel server must run under whichever layout `aiox` is
// itself running from. Claude spawns this MCP server from the `--mcp-config`
// command/args, so a fixed `node channel-server.js` breaks under `pnpm dev`
// (tsx/src), where only channel-server.ts exists. We detect the layout from this
// module's own URL + the adjacent file, NOT by picking whatever file happens to
// exist:
//   - src/TS layout  (pnpm dev → tsx src/...): `tsx channel-server.ts`
//   - dist/JS layout (pnpm build → node dist/...; ALSO the npm-installed package,
//     which ships the same built JS): `node channel-server.js`
// Neither resolvable → a clear error (no silent fallback). D plugin launcher is
// unaffected (it never builds an inline --mcp-config).
export function resolveInlineChannelServerEntry(
  deps: ResolveInlineChannelServerDeps = {},
): InlineChannelServerEntry {
  const moduleUrl = deps.moduleUrl ?? import.meta.url;
  const fileExists = deps.fileExists ?? existsSync;
  const modulePath = fileURLToPath(moduleUrl);
  const jsPath = fileURLToPath(new URL("./channel-server.js", moduleUrl));
  const tsPath = fileURLToPath(new URL("./channel-server.ts", moduleUrl));

  if (modulePath.endsWith(".js") && fileExists(jsPath)) {
    return { command: deps.nodeCommand ?? process.execPath, scriptPath: jsPath };
  }
  if (modulePath.endsWith(".ts") && fileExists(tsPath)) {
    return { command: deps.tsxCommand ?? "tsx", scriptPath: tsPath };
  }
  throw new Error(
    `Cannot resolve the inline Claude channel server entrypoint from "${modulePath}": ` +
      `expected a sibling channel-server.js (dist/JS layout — also the npm-installed ` +
      `layout) or channel-server.ts (src/TS layout via tsx). Run "pnpm build" first, ` +
      `or launch via "pnpm dev".`,
  );
}

// One-off aiox MCP injection for Claude, mirroring Codex `buildCodexMcpArgs`.
// The dev-channel `server:<channelName>` resolves this inline definition, so no
// permanent `.mcp.json` registration (path-dependent) is needed.
export function buildClaudeChannelMcpConfig(
  input: ClaudeChannelMcpConfigInput,
): string {
  // The script path comes from an explicit override or the execution-mode layout;
  // runtimeBinary independently overrides the command in EITHER case, so passing
  // runtimeBinary alone still takes effect (Codex review).
  const resolved: InlineChannelServerEntry =
    input.channelServerPath !== undefined
      ? { command: process.execPath, scriptPath: input.channelServerPath }
      : resolveInlineChannelServerEntry();
  const command = input.runtimeBinary ?? resolved.command;
  return JSON.stringify({
    mcpServers: {
      [input.channelName]: {
        command,
        args: [resolved.scriptPath],
        env: {
          AIOX_CLAUDE_CHANNEL_AGENT_NAME: input.agentName,
          AIOX_CLAUDE_CHANNEL_TOKEN: input.agentToken,
          AIOX_SOCKET_PATH: input.daemonSocketPath,
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Claude CLI launcher
// ---------------------------------------------------------------------------

export interface LaunchClaudeWithChannelOptions {
  channelName: string;
  agentName?: string;
  agentToken?: string;
  daemonSocketPath?: string;
  command?: string;
}

export function launchClaudeWithChannel(
  options: LaunchClaudeWithChannelOptions,
): ChildProcess {
  const command =
    options.command ?? process.env.AIOX_CLAUDE_COMMAND ?? "claude";
  const args = buildLaunchClaudeChannelArgs(options.channelName);

  // Auto-inject the aiox channel MCP one-off (mirrors Codex `-c`). The dev-channel
  // server:<name> resolves this inline definition, and the channel server reads its
  // identity from the injected MCP `env` rather than inherited process env.
  if (
    options.agentName !== undefined &&
    options.agentToken !== undefined &&
    options.daemonSocketPath !== undefined
  ) {
    args.push(
      "--mcp-config",
      buildClaudeChannelMcpConfig({
        channelName: options.channelName,
        agentName: options.agentName,
        agentToken: options.agentToken,
        daemonSocketPath: options.daemonSocketPath,
      }),
    );
  }

  return spawn(command, args, {
    env: process.env,
    stdio: "inherit",
  });
}

// ---------------------------------------------------------------------------
// Claude CLI launcher — plugin: activation (R3 strategy D spike)
// ---------------------------------------------------------------------------

export interface LaunchClaudePluginChannelOptions {
  pluginName: string;
  marketplaceName: string;
  agentName: string;
  agentToken: string;
  daemonSocketPath: string;
  /**
   * cwd for the spawned `claude`. MUST match the cwd the preflight read its
   * plugin inventory from (history/52): plugin scope is resolved per-cwd, so a
   * mismatch could pass preflight in one dir yet resolve a different (disabled)
   * scope at launch — re-opening the silent-drop the preflight exists to close.
   * Omitted → spawn inherits the parent process cwd.
   */
  cwd?: string;
  command?: string;
}

// Activate the channel plugin and pass identity through the spawned claude's
// environment. The plugin's static `.mcp.json` carries only `${VAR}` +
// `${CLAUDE_PLUGIN_ROOT}` placeholders, which Claude expands from this env
// (history/50 facts 2/4) — no per-launch `--mcp-config` JSON, no warning.
export function launchClaudePluginChannel(
  options: LaunchClaudePluginChannelOptions,
): ChildProcess {
  const command =
    options.command ?? process.env.AIOX_CLAUDE_COMMAND ?? "claude";
  const args = buildLaunchClaudePluginArgs(
    options.pluginName,
    options.marketplaceName,
  );

  return spawn(command, args, {
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    env: {
      ...process.env,
      AIOX_CLAUDE_CHANNEL_AGENT_NAME: options.agentName,
      AIOX_CLAUDE_CHANNEL_TOKEN: options.agentToken,
      AIOX_SOCKET_PATH: options.daemonSocketPath,
    },
    stdio: "inherit",
  });
}
