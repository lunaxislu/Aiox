import { spawn, type ChildProcess } from "node:child_process";

// ---------------------------------------------------------------------------
// Command builder (pure, testable)
// ---------------------------------------------------------------------------

export function buildLaunchClaudeChannelArgs(channelName: string): string[] {
  return ["--dangerously-load-development-channels", `server:${channelName}`];
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
  const env = {
    ...process.env,
    ...(options.agentName === undefined
      ? {}
      : { AIOX_CLAUDE_CHANNEL_AGENT_NAME: options.agentName }),
    ...(options.agentToken === undefined
      ? {}
      : { AIOX_CLAUDE_CHANNEL_TOKEN: options.agentToken }),
    ...(options.daemonSocketPath === undefined
      ? {}
      : { AIOX_SOCKET_PATH: options.daemonSocketPath }),
  };

  return spawn(command, args, {
    env,
    stdio: "inherit",
  });
}
