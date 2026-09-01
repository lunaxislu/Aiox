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
  mcp?: CodexMcpInjection;
}

export interface LaunchCodexTuiOptions {
  command?: string;
  endpoint: URL;
  resumeSessionId?: string;
}

export interface CodexMcpInjection {
  agentName: string;
  /** Host-qualified selector (W6 Stage 5A). Omitted resolves standalone. */
  hostId?: string;
  agentToken: string;
  daemonSocketPath: string;
  /** Runtime override. Defaults to tsx for a TypeScript entry, otherwise Node. */
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
  const baseArgs = options.args ?? ["app-server", "--listen", "ws://127.0.0.1:0"];
  const args = [...baseArgs, ...buildCodexMcpArgs(options.mcp)];
  const output = createCodexAppServerOutputBuffer();
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    ...(options.mcp ? { env: buildCodexMcpEnv(options.mcp) } : {}),
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

/**
 * The Codex TUI argv, as a pure function. Extracted so `aiox host`'s
 * per-agent view launch request carries the exact same structured argv the
 * single-agent `aiox codex` path spawns — the two must not drift, and the
 * host path hands argv to a terminal-view driver instead of spawning with an
 * inherited stdio itself.
 */
export function buildLaunchCodexTuiArgs(options: {
  endpoint: URL;
  resumeSessionId?: string;
}): string[] {
  return options.resumeSessionId
    ? ["resume", options.resumeSessionId, "--remote", options.endpoint.toString()]
    : ["--remote", options.endpoint.toString()];
}

export function resolveCodexTuiCommand(command?: string): string {
  return command ?? process.env.AIOX_CODEX_TUI_COMMAND ?? "codex";
}

export function launchCodexTui(options: LaunchCodexTuiOptions): ChildProcess {
  return spawn(
    resolveCodexTuiCommand(options.command),
    buildLaunchCodexTuiArgs(options),
    {
      stdio: "inherit",
    },
  );
}

/**
 * Names of the env vars the spawned `mcp-codex` process needs. Declared once so
 * the inline TOML whitelist (names only) and the app-server spawn env (actual
 * values) cannot drift apart.
 */
const CODEX_MCP_ENV_VAR_NAMES = [
  "AIOX_CODEX_AGENT_NAME",
  "AIOX_CODEX_HOST_ID",
  "AIOX_CODEX_AGENT_TOKEN",
  "AIOX_SOCKET_PATH",
] as const;

export function buildCodexMcpArgs(
  mcp: CodexMcpInjection | undefined,
): string[] {
  if (!mcp) {
    return [];
  }
  const aioxBin = mcp.aioxBin ?? process.argv[1] ?? "aiox";
  const runtimeBinary =
    mcp.runtimeBinary ?? (aioxBin.endsWith(".ts") ? "tsx" : process.execPath);
  const inline = buildMcpServersAioxInlineToml({ runtimeBinary, aioxBin });
  return ["-c", inline];
}

/**
 * Builds the child process environment for the Codex app-server. The inline
 * TOML only whitelists these var *names* via `env_vars`; Codex resolves the
 * values from this process's own environment when it spawns `mcp-codex`, so
 * the raw token never appears in argv or the on-disk/inline TOML.
 */
function buildCodexMcpEnv(mcp: CodexMcpInjection): NodeJS.ProcessEnv {
  return {
    ...process.env,
    AIOX_CODEX_AGENT_NAME: mcp.agentName,
    // Always set (never an absent env var), matching the whitelisted-name
    // TOML mechanism above -- empty string means standalone;
    // `parseCodexIngressEnv` undoes this encoding.
    AIOX_CODEX_HOST_ID: mcp.hostId ?? "",
    AIOX_CODEX_AGENT_TOKEN: mcp.agentToken,
    AIOX_SOCKET_PATH: mcp.daemonSocketPath,
  };
}

function buildMcpServersAioxInlineToml(input: {
  runtimeBinary: string;
  aioxBin: string;
}): string {
  const command = tomlString(input.runtimeBinary);
  const args = `[${tomlString(input.aioxBin)}, ${tomlString("mcp-codex")}]`;
  const envVars = `[${CODEX_MCP_ENV_VAR_NAMES.map(tomlString).join(", ")}]`;
  return `mcp_servers.aiox = { command = ${command}, args = ${args}, env_vars = ${envVars} }`;
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
