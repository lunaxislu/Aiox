import type { CodexAppServerProcess } from "./app-server.js";
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
  connectWebSocket?: (endpoint: URL) => Promise<CodexAgentRuntimeWebSocketClient>;
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

  dispose(): void {
    // TODO(round-3-D5-A.5): WS close -> SIGTERM -> 3s grace -> SIGKILL.
    this.webSocket.close();
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
  const appServer = await (options.launchAppServer ?? launchCodexAppServer)();
  const webSocket = await (options.connectWebSocket
    ? options.connectWebSocket(appServer.endpoint.endpoint)
    : connectCodexAppServerWebSocket({ endpoint: appServer.endpoint.endpoint }));

  try {
    await webSocket.initialize();
  } catch (error) {
    webSocket.close();
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
