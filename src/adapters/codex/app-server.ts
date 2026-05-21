import type { ChildProcess } from "node:child_process";
import net from "node:net";

export type CodexAppServerOutputStream = "stdout" | "stderr";

export type CodexAppServerStartupErrorCode =
  | "app_server_banner_parse_timeout"
  | "app_server_readyz_timeout"
  | "app_server_process_exited_before_ready";

export class CodexAppServerStartupError extends Error {
  readonly code: CodexAppServerStartupErrorCode;

  constructor(code: CodexAppServerStartupErrorCode, message: string) {
    super(message);
    this.name = "CodexAppServerStartupError";
    this.code = code;
  }
}

export interface CodexAppServerEndpoint {
  endpoint: URL;
  readyz: URL;
  healthz: URL;
}

export interface CodexAppServerProcess {
  child: ChildProcess;
  endpoint: CodexAppServerEndpoint;
  output: CodexAppServerOutputBuffer;
}

export interface CodexAppServerOutputRing {
  readonly capacityBytes: number;
  text: string;
}

export interface CodexAppServerOutputBuffer {
  stdout: CodexAppServerOutputRing;
  stderr: CodexAppServerOutputRing;
}

export interface CreateCodexAppServerOutputBufferOptions {
  capacityBytes?: number;
}

export interface WaitForCodexReadyzOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  fetchImpl?: typeof fetch;
}

const defaultOutputRingCapacityBytes = 256 * 1024;
const defaultReadyzTimeoutMs = 10_000;
const defaultReadyzPollIntervalMs = 200;

export function createCodexAppServerOutputBuffer(
  options: CreateCodexAppServerOutputBufferOptions = {},
): CodexAppServerOutputBuffer {
  const capacityBytes = options.capacityBytes ?? defaultOutputRingCapacityBytes;

  return {
    stdout: {
      capacityBytes,
      text: "",
    },
    stderr: {
      capacityBytes,
      text: "",
    },
  };
}

export function appendCodexAppServerOutput(
  buffer: CodexAppServerOutputBuffer,
  stream: CodexAppServerOutputStream,
  chunk: string | Buffer,
): void {
  const ring = buffer[stream];
  const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
  ring.text = trimToLastBytes(`${ring.text}${text}`, ring.capacityBytes);
}

export function parseCodexAppServerBanner(
  output: CodexAppServerOutputBuffer,
): CodexAppServerEndpoint {
  const lines = `${output.stderr.text}\n${output.stdout.text}`
    .split(/\r?\n/)
    .map((line) => stripAnsi(line).trim());
  const endpoint = findBannerUrl(lines, "listening on");
  const readyz = findBannerUrl(lines, "readyz");
  const healthz = findBannerUrl(lines, "healthz");

  validateEndpoint(endpoint, {
    protocols: ["ws:"],
    label: "app-server endpoint",
  });
  validateEndpoint(readyz, {
    protocols: ["http:"],
    label: "app-server readyz URL",
    pathname: "/readyz",
  });
  validateEndpoint(healthz, {
    protocols: ["http:"],
    label: "app-server healthz URL",
    pathname: "/healthz",
  });

  return {
    endpoint,
    readyz,
    healthz,
  };
}

export async function waitForCodexReadyz(
  readyz: URL,
  options: WaitForCodexReadyzOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? defaultReadyzTimeoutMs;
  const pollIntervalMs = options.pollIntervalMs ?? defaultReadyzPollIntervalMs;
  const fetchImpl = options.fetchImpl ?? fetch;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchImpl(readyz);

      if (response.status === 200) {
        return;
      }
    } catch {
      // Keep polling until the startup budget is exhausted.
    }

    await sleep(pollIntervalMs);
  }

  throw new CodexAppServerStartupError(
    "app_server_readyz_timeout",
    `Timed out waiting for Codex app-server readyz: ${readyz.toString()}`,
  );
}

function findBannerUrl(lines: readonly string[], token: string): URL {
  const prefix = `${token}:`;
  const line = lines.find((candidate) =>
    candidate.toLocaleLowerCase().startsWith(prefix),
  );

  if (!line) {
    throw new CodexAppServerStartupError(
      "app_server_banner_parse_timeout",
      `Codex app-server banner is missing ${token}`,
    );
  }

  const rawUrl = line.slice(prefix.length).trim().split(/\s+/)[0];

  try {
    return new URL(rawUrl);
  } catch (error) {
    throw new CodexAppServerStartupError(
      "app_server_banner_parse_timeout",
      `Codex app-server banner has invalid ${token} URL: ${String(error)}`,
    );
  }
}

function validateEndpoint(
  url: URL,
  options: {
    protocols: readonly string[];
    label: string;
    pathname?: string;
  },
): void {
  if (!options.protocols.includes(url.protocol)) {
    throw new CodexAppServerStartupError(
      "app_server_banner_parse_timeout",
      `Codex ${options.label} must use ${options.protocols.join(" or ")}`,
    );
  }

  if (!isLoopbackHostname(url.hostname)) {
    throw new CodexAppServerStartupError(
      "app_server_banner_parse_timeout",
      `Codex ${options.label} must bind to a loopback host`,
    );
  }

  if (options.pathname && url.pathname !== options.pathname) {
    throw new CodexAppServerStartupError(
      "app_server_banner_parse_timeout",
      `Codex ${options.label} must use ${options.pathname}`,
    );
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLocaleLowerCase();

  if (normalized === "localhost" || normalized === "[::1]") {
    return true;
  }

  const ipVersion = net.isIP(normalized);

  if (ipVersion === 4) {
    return normalized.startsWith("127.");
  }

  if (ipVersion === 6) {
    return normalized === "::1" || normalized === "[::1]";
  }

  return false;
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function trimToLastBytes(value: string, capacityBytes: number): string {
  let current = value;

  while (Buffer.byteLength(current, "utf8") > capacityBytes) {
    current = current.slice(1);
  }

  return current;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
