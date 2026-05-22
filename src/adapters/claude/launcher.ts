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
  command?: string;
}

export function launchClaudeWithChannel(
  options: LaunchClaudeWithChannelOptions,
): ChildProcess {
  const command =
    options.command ?? process.env.AIOX_CLAUDE_COMMAND ?? "claude";
  const args = buildLaunchClaudeChannelArgs(options.channelName);

  return spawn(command, args, {
    stdio: "inherit",
  });
}
