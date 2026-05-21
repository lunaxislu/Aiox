import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

import type { CodexAppServerProcess } from "./app-server.js";
import {
  disposeCodexAppServer,
  disposeCodexAppServerOnAttachFailure,
} from "./app-server.js";
import type { AdapterInjectResult } from "../contract.js";
import { launchCodexAppServer } from "./launcher.js";
import {
  injectTurnStart,
  type InjectTurnStartOptions,
} from "./injector.js";
import {
  connectCodexAppServerWebSocket,
  type CodexInitializeResponse,
  type CodexJsonRpcRequestOptions,
} from "./websocket.js";

export type CodexAgentRuntimeState = "starting" | "ready" | "failed" | "disposed";

export interface CodexAgentRuntimeOptions {
  agentName: string;
  activeThreadId: string | null;
  appServer: CodexAppServerProcess;
  webSocket: CodexAgentRuntimeWebSocketClient;
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
  close(): void;
}

export interface AttachCodexAgentRuntimeOptions {
  agentName: string;
  activeThreadId: string | null;
  launchAppServer?: () => Promise<CodexAppServerProcess>;
  connectWebSocket?: (
    endpoint: URL,
    clientVersion: string,
  ) => Promise<CodexAgentRuntimeWebSocketClient>;
}

export class CodexAgentRuntime {
  readonly agentName: string;
  readonly appServer: CodexAppServerProcess;
  readonly webSocket: CodexAgentRuntimeWebSocketClient;
  state: CodexAgentRuntimeState = "starting";
  #activeThreadId: string | null;

  constructor(options: CodexAgentRuntimeOptions) {
    this.agentName = options.agentName;
    this.#activeThreadId = options.activeThreadId;
    this.appServer = options.appServer;
    this.webSocket = options.webSocket;
  }

  get activeThreadId(): string | null {
    return this.#activeThreadId;
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
}

export async function attachCodexAgentRuntime(
  options: AttachCodexAgentRuntimeOptions,
): Promise<CodexAgentRuntime> {
  const clientVersion = readPackageVersion();
  const appServer = await (options.launchAppServer ?? launchCodexAppServer)();
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
