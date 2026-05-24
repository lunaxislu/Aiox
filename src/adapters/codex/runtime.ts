import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

import type { CodexAppServerProcess } from "./app-server.js";
import {
  disposeCodexAppServer,
  disposeCodexAppServerOnAttachFailure,
} from "./app-server.js";
import type { AdapterInjectResult } from "../contract.js";
import {
  launchCodexAppServer,
  type LaunchCodexAppServerOptions,
} from "./launcher.js";
import {
  injectTurnStart,
  type InjectTurnStartOptions,
} from "./injector.js";
import {
  connectCodexAppServerWebSocket,
  type CodexInitializeResponse,
  type CodexJsonRpcNotification,
  type CodexJsonRpcRequestOptions,
} from "./websocket.js";

type CodexThreadOperation = "thread/start" | "thread/resume";

export type CodexAgentRuntimeState = "starting" | "ready" | "failed" | "disposed";

export type CodexAgentRuntimeFailureReason =
  | {
      type: "app_server_process_exited";
      exitCode: number | null;
      signal: NodeJS.Signals | null;
    }
  | {
      type: "ws_dropped";
      closeCode: number;
      closeReason: string;
    };

export interface CodexAgentRuntimeFailure {
  agentName: string;
  reason: CodexAgentRuntimeFailureReason;
  latestDiagnosticNotification?: CodexJsonRpcNotification;
}

export interface CodexAgentRuntimeOptions {
  agentName: string;
  activeThreadId: string | null;
  appServer: CodexAppServerProcess;
  webSocket: CodexAgentRuntimeWebSocketClient;
  onRuntimeFailed?: (failure: CodexAgentRuntimeFailure) => void;
}

export interface CodexAgentRuntimeSnapshot {
  agentName: string;
  activeThreadId: string | null;
  state: CodexAgentRuntimeState;
  endpoint: string;
  appServerPid: number | null;
}

export interface CodexAgentRuntimeWebSocketClient {
  initialize(): Promise<CodexInitializeResponse>;
  request(
    method: string,
    params?: unknown,
    options?: CodexJsonRpcRequestOptions,
  ): Promise<unknown>;
  onClose?(listener: (code: number, reason: string) => void): () => void;
  onNotification?(
    listener: (notification: CodexJsonRpcNotification) => void,
  ): () => void;
  close(): void;
}

export interface AttachCodexAgentRuntimeOptions {
  agentName: string;
  activeThreadId: string | null;
  mcp?: {
    agentToken: string;
    daemonSocketPath: string;
    runtimeBinary?: string;
    aioxBin?: string;
  };
  launchAppServer?: (
    options?: LaunchCodexAppServerOptions,
  ) => Promise<CodexAppServerProcess>;
  connectWebSocket?: (
    endpoint: URL,
    clientVersion: string,
  ) => Promise<CodexAgentRuntimeWebSocketClient>;
  onRuntimeFailed?: (failure: CodexAgentRuntimeFailure) => void;
}

export class CodexAgentRuntime {
  readonly agentName: string;
  readonly appServer: CodexAppServerProcess;
  readonly webSocket: CodexAgentRuntimeWebSocketClient;
  state: CodexAgentRuntimeState = "starting";
  #activeThreadId: string | null;
  #latestDiagnosticNotification: CodexJsonRpcNotification | undefined;
  #onRuntimeFailed?: (failure: CodexAgentRuntimeFailure) => void;

  constructor(options: CodexAgentRuntimeOptions) {
    this.agentName = options.agentName;
    this.#activeThreadId = options.activeThreadId;
    this.appServer = options.appServer;
    this.webSocket = options.webSocket;
    this.#onRuntimeFailed = options.onRuntimeFailed;
    this.registerLifecycleListeners();
  }

  get activeThreadId(): string | null {
    return this.#activeThreadId;
  }

  get endpoint(): URL {
    return this.appServer.endpoint.endpoint;
  }

  markReady(): void {
    if (this.state !== "starting") {
      return;
    }

    this.state = "ready";
  }

  markFailed(): void {
    if (this.state === "disposed") {
      return;
    }

    this.state = "failed";
  }

  recordRuntimeFailure(reason: CodexAgentRuntimeFailureReason): void {
    if (this.state !== "ready") {
      return;
    }

    this.markFailed();
    this.#onRuntimeFailed?.({
      agentName: this.agentName,
      reason,
      latestDiagnosticNotification: this.#latestDiagnosticNotification,
    });
  }

  async dispose(): Promise<void> {
    if (this.state === "disposed") {
      return;
    }

    try {
      this.webSocket.close();
    } catch {
      // Cleanup must preserve the caller path.
    }

    await disposeAppServer(this.appServer);
    this.state = "disposed";
  }

  requestCodex(
    method: string,
    params?: unknown,
    options?: CodexJsonRpcRequestOptions,
  ): Promise<unknown> {
    return this.webSocket.request(method, params, options);
  }

  async startThread(): Promise<string | null> {
    const result = await this.requestCodex("thread/start", {});
    return this.rebindFromThreadOperation(result, "thread/start");
  }

  async resumeThread(threadId: string): Promise<string | null> {
    const result = await this.requestCodex("thread/resume", { threadId });
    const returnedThreadId = extractThreadId(result);

    if (returnedThreadId !== threadId) {
      throw Object.assign(
        new Error(
          `Codex resume returned mismatched thread id: requested=${threadId} returned=${returnedThreadId ?? "null"}`,
        ),
        {
          code: "codex_resume_failed",
        },
      );
    }

    return this.rebindFromThreadOperation(result, "thread/resume");
  }

  injectTurnStart(options: InjectTurnStartOptions): Promise<AdapterInjectResult> {
    return injectTurnStart(this, options);
  }

  snapshot(): CodexAgentRuntimeSnapshot {
    return {
      agentName: this.agentName,
      activeThreadId: this.#activeThreadId,
      state: this.state,
      endpoint: this.appServer.endpoint.endpoint.toString(),
      appServerPid: this.appServer.child.pid ?? null,
    };
  }

  private registerLifecycleListeners(): void {
    this.appServer.child.once("exit", (exitCode, signal) => {
      this.recordRuntimeFailure({
        type: "app_server_process_exited",
        exitCode,
        signal,
      });
    });

    this.webSocket.onClose?.((closeCode, closeReason) => {
      this.recordRuntimeFailure({
        type: "ws_dropped",
        closeCode,
        closeReason,
      });
    });

    this.webSocket.onNotification?.((notification) => {
      if (notification.method === "remoteControl/status/changed") {
        this.#latestDiagnosticNotification = notification;
      }
    });
  }

  private rebindFromThreadOperation(
    result: unknown,
    operation: CodexThreadOperation,
  ): string | null {
    const nextThreadId = extractThreadId(result);
    if (!nextThreadId) {
      throw Object.assign(new Error(`Codex ${operation} did not return a thread id`), {
        code: operation === "thread/resume" ? "codex_resume_failed" : "codex_binding_uncertain",
      });
    }

    this.#activeThreadId = nextThreadId;
    return nextThreadId;
  }
}

export async function attachCodexAgentRuntime(
  options: AttachCodexAgentRuntimeOptions,
): Promise<CodexAgentRuntime> {
  const clientVersion = readPackageVersion();
  const launchOptions: LaunchCodexAppServerOptions | undefined = options.mcp
    ? {
        mcp: {
          agentName: options.agentName,
          agentToken: options.mcp.agentToken,
          daemonSocketPath: options.mcp.daemonSocketPath,
          ...(options.mcp.runtimeBinary === undefined
            ? {}
            : { runtimeBinary: options.mcp.runtimeBinary }),
          ...(options.mcp.aioxBin === undefined ? {} : { aioxBin: options.mcp.aioxBin }),
        },
      }
    : undefined;
  const appServer = await (options.launchAppServer ?? launchCodexAppServer)(
    launchOptions,
  );
  let webSocket: CodexAgentRuntimeWebSocketClient | null = null;

  try {
    webSocket = await (options.connectWebSocket
      ? options.connectWebSocket(appServer.endpoint.endpoint, clientVersion)
      : connectCodexAppServerWebSocket({
          endpoint: appServer.endpoint.endpoint,
          clientVersion,
        }));
    await webSocket.initialize();
  } catch (error) {
    if (webSocket) {
      closeWebSocketOnAttachFailure(webSocket);
    }
    disposeAppServerOnAttachFailure(appServer);
    throw error;
  }

  const runtime = new CodexAgentRuntime({
    agentName: options.agentName,
    activeThreadId: options.activeThreadId,
    appServer,
    webSocket,
    onRuntimeFailed: options.onRuntimeFailed,
  });
  runtime.markReady();

  return runtime;
}

function closeWebSocketOnAttachFailure(
  webSocket: CodexAgentRuntimeWebSocketClient,
): void {
  try {
    webSocket.close();
  } catch {
    // Preserve the original attach failure.
  }
}

function disposeAppServerOnAttachFailure(appServer: CodexAppServerProcess): void {
  try {
    disposeCodexAppServerOnAttachFailure(appServer);
  } catch {
    // Preserve the original attach failure.
  }
}

async function disposeAppServer(appServer: CodexAppServerProcess): Promise<void> {
  try {
    await disposeCodexAppServer(appServer);
  } catch {
    // Cleanup is best-effort.
  }
}

function readPackageVersion(): string {
  const packageJsonPath = findPackageJson(dirname(fileURLToPath(import.meta.url)));
  const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    version?: unknown;
  };

  if (typeof parsed.version !== "string" || parsed.version.length === 0) {
    throw new Error(`package.json is missing a valid version: ${packageJsonPath}`);
  }

  return parsed.version;
}

function extractThreadId(result: unknown): string | null {
  if (
    typeof result === "object" &&
    result !== null &&
    "thread" in result &&
    typeof result.thread === "object" &&
    result.thread !== null &&
    "id" in result.thread &&
    typeof result.thread.id === "string"
  ) {
    return result.thread.id;
  }

  if (
    typeof result === "object" &&
    result !== null &&
    "threadId" in result &&
    typeof result.threadId === "string"
  ) {
    return result.threadId;
  }

  return null;
}

function findPackageJson(startDirectory: string): string {
  let directory = startDirectory;

  while (true) {
    const candidate = join(directory, "package.json");
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(directory);
    if (parent === directory || directory === parse(directory).root) {
      throw new Error("Unable to locate package.json for Codex initialize client version");
    }

    directory = parent;
  }
}
