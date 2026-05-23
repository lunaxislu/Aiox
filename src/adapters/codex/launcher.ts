import { spawn, type ChildProcess } from "node:child_process";

import {
  appendCodexAppServerOutput,
  CodexAppServerStartupError,
  createCodexAppServerOutputBuffer,
  parseCodexAppServerBanner,
  waitForCodexReadyz,
  type CodexAppServerProcess,
} from "./app-server.js";

export interface LaunchCodexAppServerOptions {
  command?: string;
  args?: readonly string[];
  bannerTimeoutMs?: number;
  readyzTimeoutMs?: number;
  totalTimeoutMs?: number;
}

export interface LaunchCodexTuiOptions {
  command?: string;
  endpoint: URL;
  resumeSessionId?: string;
  mcp?: CodexTuiMcpInjection;
}

export interface CodexTuiMcpInjection {
  agentName: string;
  agentToken: string;
  daemonSocketPath: string;
  /** node binary or compatible runtime. Defaults to process.execPath. */
  runtimeBinary?: string;
  /** path to the aiox bin entry that launches `mcp-codex`. Defaults to process.argv[1]. */
  aioxBin?: string;
}

const defaultBannerTimeoutMs = 5_000;
const defaultTotalTimeoutMs = 15_000;

export async function launchCodexAppServer(
  options: LaunchCodexAppServerOptions = {},
): Promise<CodexAppServerProcess> {
  const command =
    options.command ?? process.env.AIOX_CODEX_APP_SERVER_COMMAND ?? "codex";
  const args = options.args ?? ["app-server", "--listen", "ws://127.0.0.1:0"];
  const output = createCodexAppServerOutputBuffer();
  const child = spawn(command, [...args], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    appendCodexAppServerOutput(output, "stdout", chunk);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    appendCodexAppServerOutput(output, "stderr", chunk);
  });

  const endpoint = await waitForBanner(child, output, {
    bannerTimeoutMs: options.bannerTimeoutMs ?? defaultBannerTimeoutMs,
    totalTimeoutMs: options.totalTimeoutMs ?? defaultTotalTimeoutMs,
  });

  await waitForCodexReadyz(endpoint.readyz, {
    child,
    timeoutMs: options.readyzTimeoutMs,
  });

  return {
    child,
    endpoint,
    output,
  };
}

export function launchCodexTui(options: LaunchCodexTuiOptions): ChildProcess {
  const command =
    options.command ?? process.env.AIOX_CODEX_TUI_COMMAND ?? "codex";
  const baseArgs = options.resumeSessionId
    ? ["resume", options.resumeSessionId, "--remote", options.endpoint.toString()]
    : ["--remote", options.endpoint.toString()];

  const mcpArgs = buildCodexTuiMcpArgs(options.mcp);
  const args = [...mcpArgs, ...baseArgs];

  return spawn(command, args, {
    stdio: "inherit",
  });
}

export function buildCodexTuiMcpArgs(
  mcp: CodexTuiMcpInjection | undefined,
): string[] {
  if (!mcp) {
    return [];
  }
  if (process.env.AIOX_CODEX_TUI_MCP_DISABLE === "1") {
    return [];
  }
  const runtimeBinary = mcp.runtimeBinary ?? process.execPath;
  const aioxBin = mcp.aioxBin ?? process.argv[1] ?? "aiox";
  const inline = buildMcpServersAioxInlineToml({
    runtimeBinary,
    aioxBin,
    agentName: mcp.agentName,
    agentToken: mcp.agentToken,
    daemonSocketPath: mcp.daemonSocketPath,
  });
  return ["-c", inline];
}

function buildMcpServersAioxInlineToml(input: {
  runtimeBinary: string;
  aioxBin: string;
  agentName: string;
  agentToken: string;
  daemonSocketPath: string;
}): string {
  const command = tomlString(input.runtimeBinary);
  const args = `[${tomlString(input.aioxBin)}, ${tomlString("mcp-codex")}]`;
  const env =
    `{ AIOX_CODEX_AGENT_NAME = ${tomlString(input.agentName)}, ` +
    `AIOX_CODEX_AGENT_TOKEN = ${tomlString(input.agentToken)}, ` +
    `AIOX_SOCKET_PATH = ${tomlString(input.daemonSocketPath)} }`;
  return `mcp_servers.aiox = { command = ${command}, args = ${args}, env = ${env} }`;
}

function tomlString(value: string): string {
  // TOML basic strings allow double-quoted with backslash escapes for control
  // chars and double quote. This is the minimal subset we need for absolute
  // paths and uuid-shaped tokens, neither of which contains these chars.
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function waitForBanner(
  child: ChildProcess,
  output: ReturnType<typeof createCodexAppServerOutputBuffer>,
  options: {
    bannerTimeoutMs: number;
    totalTimeoutMs: number;
  },
): Promise<ReturnType<typeof parseCodexAppServerBanner>> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    let settled = false;
    let poll: NodeJS.Timeout | null = null;
    let totalTimer: NodeJS.Timeout | null = null;
    let bannerTimer: NodeJS.Timeout | null = null;

    function cleanup(): void {
      if (poll) {
        clearInterval(poll);
      }
      if (totalTimer) {
        clearTimeout(totalTimer);
      }
      if (bannerTimer) {
        clearTimeout(bannerTimer);
      }
      child.off("exit", onExit);
    }

    function finish(endpoint: ReturnType<typeof parseCodexAppServerBanner>): void {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(endpoint);
    }

    function fail(error: Error): void {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    }

    function onExit(code: number | null, signal: NodeJS.Signals | null): void {
      fail(
        new CodexAppServerStartupError(
          "app_server_process_exited_before_ready",
          `Codex app-server exited before ready: code=${code ?? "null"} signal=${signal ?? "null"}`,
        ),
      );
    }

    child.once("exit", onExit);
    poll = setInterval(() => {
      try {
        const parsed = parseCodexAppServerBanner(output);
        finish(parsed);
      } catch (error) {
        if (
          error instanceof CodexAppServerStartupError &&
          error.code === "app_server_banner_parse_timeout"
        ) {
          return;
        }

        fail(error instanceof Error ? error : new Error(String(error)));
      }
    }, 25);
    bannerTimer = setTimeout(() => {
      fail(
        new CodexAppServerStartupError(
          "app_server_banner_parse_timeout",
          "Timed out waiting for Codex app-server banner",
        ),
      );
    }, options.bannerTimeoutMs);
    totalTimer = setTimeout(() => {
      fail(
        new CodexAppServerStartupError(
          "app_server_process_exited_before_ready",
          `Codex app-server did not become ready within ${Date.now() - startedAt}ms`,
        ),
      );
    }, options.totalTimeoutMs);
  });
}
