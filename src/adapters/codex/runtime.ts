import type { CodexAppServerProcess } from "./app-server.js";

export type CodexAgentRuntimeState = "starting" | "ready" | "failed" | "disposed";

export interface CodexAgentRuntimeOptions {
  agentName: string;
  activeThreadId: string | null;
  appServer: CodexAppServerProcess;
}

export interface CodexAgentRuntimeSnapshot {
  agentName: string;
  activeThreadId: string | null;
  state: CodexAgentRuntimeState;
  endpoint: string;
  appServerPid: number | null;
}

export class CodexAgentRuntime {
  readonly agentName: string;
  readonly appServer: CodexAppServerProcess;
  activeThreadId: string | null;
  state: CodexAgentRuntimeState = "starting";

  constructor(options: CodexAgentRuntimeOptions) {
    this.agentName = options.agentName;
    this.activeThreadId = options.activeThreadId;
    this.appServer = options.appServer;
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
    this.state = "disposed";
  }

  snapshot(): CodexAgentRuntimeSnapshot {
    return {
      agentName: this.agentName,
      activeThreadId: this.activeThreadId,
      state: this.state,
      endpoint: this.appServer.endpoint.endpoint.toString(),
      appServerPid: this.appServer.child.pid ?? null,
    };
  }
}
