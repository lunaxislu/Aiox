import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Command builder (pure, testable)
// ---------------------------------------------------------------------------

export function buildLaunchClaudeChannelArgs(channelName: string): string[] {
  return ["--dangerously-load-development-channels", `server:${channelName}`];
}

/**
 * Static MCP definition for the Claude channel MCP.
 *
 * Emits the value accepted by `claude mcp add-json`: {command,args,env}.
 * Keeping Node as `command` and tsx as `args[0]` avoids the tsx executable's
 * `#!/usr/bin/env node` PATH dependency.
 */
export interface ClaudeStaticMcpConfigInput {
  /** Runtime override. Defaults to the running Node binary. */
  runtimeBinary?: string;
  /** Path to the aiox bin entry that launches `mcp-claude`. */
  aioxBin?: string;
  /** Dev-only override for the absolute tsx CLI entry. */
  tsxCliPath?: string;
}

export function buildClaudeStaticMcpConfig(
  input: ClaudeStaticMcpConfigInput,
): string {
  const aioxBin = input.aioxBin ?? process.argv[1] ?? "aiox";
  const isDevTsEntry = aioxBin.endsWith(".ts");
  const args = isDevTsEntry
    ? [input.tsxCliPath ?? resolveTsxCliPath(), aioxBin, "mcp-claude"]
    : [aioxBin, "mcp-claude"];

  return JSON.stringify({
    command: input.runtimeBinary ?? process.execPath,
    args,
    env: {
      AIOX_CLAUDE_CHANNEL_AGENT_NAME: "${AIOX_CLAUDE_CHANNEL_AGENT_NAME}",
      AIOX_CLAUDE_CHANNEL_TOKEN: "${AIOX_CLAUDE_CHANNEL_TOKEN}",
      AIOX_SOCKET_PATH: "${AIOX_SOCKET_PATH}",
    },
  });
}

function resolveTsxCliPath(): string {
  return require.resolve("tsx/cli");
}

// ---------------------------------------------------------------------------
// Claude CLI launcher — static MCP activation (the sole runtime path)
// ---------------------------------------------------------------------------

export interface LaunchClaudeStaticMcpChannelOptions {
  channelName: string;
  agentName: string;
  agentToken: string;
  daemonSocketPath: string;
  command?: string;
}

// Activates the server:<name> dev-channel form, relying on a pre-registered
// effective MCP definition, provisioned via `aiox claude setup` at Local,
// User, or Project scope, whose env uses ${AIOX_*} references. Session
// identity flows only through this spawn's env.
export function launchClaudeStaticMcpChannel(
  options: LaunchClaudeStaticMcpChannelOptions,
): ChildProcess {
  const command =
    options.command ?? process.env.AIOX_CLAUDE_COMMAND ?? "claude";
  const args = buildLaunchClaudeChannelArgs(options.channelName);

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
