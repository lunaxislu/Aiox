import { spawn, type ChildProcess } from "node:child_process";
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
  /** node binary or compatible runtime. Defaults to process.execPath. */
  runtimeBinary?: string;
  /** absolute path to the compiled channel-server entry. Defaults to the sibling channel-server.js. */
  channelServerPath?: string;
}

// One-off aiox MCP injection for Claude, mirroring Codex `buildCodexMcpArgs`.
// The dev-channel `server:<channelName>` resolves this inline definition, so no
// permanent `.mcp.json` registration (path-dependent) is needed.
export function buildClaudeChannelMcpConfig(
  input: ClaudeChannelMcpConfigInput,
): string {
  const runtimeBinary = input.runtimeBinary ?? process.execPath;
  // Sibling of this module in the build output (dist). The published bin runs
  // from dist, so this is absolute and cwd-independent. Launching via tsx (src)
  // is not a supported agent path — detached children require the dist build
  // (history/42).
  const channelServerPath =
    input.channelServerPath ??
    fileURLToPath(new URL("./channel-server.js", import.meta.url));
  return JSON.stringify({
    mcpServers: {
      [input.channelName]: {
        command: runtimeBinary,
        args: [channelServerPath],
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
    env: {
      ...process.env,
      AIOX_CLAUDE_CHANNEL_AGENT_NAME: options.agentName,
      AIOX_CLAUDE_CHANNEL_TOKEN: options.agentToken,
      AIOX_SOCKET_PATH: options.daemonSocketPath,
    },
    stdio: "inherit",
  });
}
