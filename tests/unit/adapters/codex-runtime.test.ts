import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  attachCodexAgentRuntime,
  type CodexAgentRuntimeWebSocketClient,
} from "../../../src/adapters/codex/runtime.js";

describe("Codex agent runtime", () => {
  it("attaches in D2 order: app-server launch, WS connect, initialize, ready", async () => {
    const events: string[] = [];
    const appServer = {
      child: fakeChild(),
      endpoint: {
        endpoint: new URL("ws://127.0.0.1:54321"),
        readyz: new URL("http://127.0.0.1:54321/readyz"),
        healthz: new URL("http://127.0.0.1:54321/healthz"),
      },
      output: {
        stdout: { capacityBytes: 10, text: "" },
        stderr: { capacityBytes: 10, text: "" },
      },
    };
    const websocket = fakeWebSocket(events);

    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      launchAppServer: async () => {
        events.push("launch");
        return appServer;
      },
      connectWebSocket: async (endpoint) => {
        events.push(`connect:${endpoint.toString()}`);
        return websocket;
      },
    });

    expect(events).toEqual([
      "launch",
      "connect:ws://127.0.0.1:54321/",
      "initialize",
    ]);
    expect(runtime.state).toBe("ready");
    expect(runtime.activeThreadId).toBe("thread-1");
    expect(runtime.snapshot()).toMatchObject({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      state: "ready",
      endpoint: "ws://127.0.0.1:54321/",
      appServerPid: 1234,
    });
  });

  it("closes the WS client from dispose while leaving process cleanup to Round 3", async () => {
    const events: string[] = [];
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      launchAppServer: async () => ({
        child: fakeChild(),
        endpoint: {
          endpoint: new URL("ws://127.0.0.1:54321"),
          readyz: new URL("http://127.0.0.1:54321/readyz"),
          healthz: new URL("http://127.0.0.1:54321/healthz"),
        },
        output: {
          stdout: { capacityBytes: 10, text: "" },
          stderr: { capacityBytes: 10, text: "" },
        },
      }),
      connectWebSocket: async () => fakeWebSocket(events),
    });

    runtime.dispose();

    expect(events).toContain("close");
    expect(runtime.state).toBe("disposed");
  });

  it("delegates injectTurnStart through the injector backbone", async () => {
    const events: string[] = [];
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      launchAppServer: async () => ({
        child: fakeChild(),
        endpoint: {
          endpoint: new URL("ws://127.0.0.1:54321"),
          readyz: new URL("http://127.0.0.1:54321/readyz"),
          healthz: new URL("http://127.0.0.1:54321/healthz"),
        },
        output: {
          stdout: { capacityBytes: 10, text: "" },
          stderr: { capacityBytes: 10, text: "" },
        },
      }),
      connectWebSocket: async () => fakeWebSocket(events),
    });

    await expect(
      runtime.injectTurnStart({
        threadId: "thread-1",
        input: "hello",
      }),
    ).resolves.toEqual({ ok: true });

    expect(events).toContain("request:turn/start");
  });

  function fakeWebSocket(events: string[]): CodexAgentRuntimeWebSocketClient {
    return {
      initialize() {
        events.push("initialize");
        return Promise.resolve({
          userAgent: "aiox/1.0.0",
          codexHome: "/tmp/codex",
          platformFamily: "unix",
          platformOs: "macos",
        });
      },
      request(method) {
        events.push(`request:${method}`);
        return Promise.resolve({
          turn: {
            id: "turn-1",
            status: "inProgress",
          },
        });
      },
      close() {
        events.push("close");
      },
    };
  }

  function fakeChild(): ChildProcess {
    const child = new EventEmitter() as ChildProcess;
    Object.assign(child, {
      pid: 1234,
      exitCode: null,
      killed: false,
    });
    return child;
  }
});
