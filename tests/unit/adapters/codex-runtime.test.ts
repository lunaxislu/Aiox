import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

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

  it("cleans up the launched app-server when WS connect fails", async () => {
    const child = fakeChild();
    const error = Object.assign(new Error("connect failed"), {
      code: "codex_app_server_ws_connect_failed",
    });

    await expect(
      attachCodexAgentRuntime({
        agentName: "codex-one",
        activeThreadId: "thread-1",
        launchAppServer: async () => fakeAppServer(child),
        connectWebSocket: async () => {
          throw error;
        },
      }),
    ).rejects.toBe(error);

    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("closes WS and cleans up the launched app-server when initialize fails", async () => {
    const child = fakeChild();
    const events: string[] = [];
    const error = Object.assign(new Error("initialize failed"), {
      code: "codex_app_server_ws_initialize_failed",
    });
    const websocket = fakeWebSocket(events, { initializeError: error });

    await expect(
      attachCodexAgentRuntime({
        agentName: "codex-one",
        activeThreadId: "thread-1",
        launchAppServer: async () => fakeAppServer(child),
        connectWebSocket: async () => websocket,
      }),
    ).rejects.toBe(error);

    expect(events).toEqual(["initialize", "close"]);
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("passes package.json version to the websocket initialize client", async () => {
    const packageVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
    const seenVersions: string[] = [];

    await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      launchAppServer: async () => fakeAppServer(fakeChild()),
      connectWebSocket: async (_endpoint, clientVersion) => {
        seenVersions.push(clientVersion);
        return fakeWebSocket([]);
      },
    });

    expect(seenVersions).toEqual([packageVersion]);
  });

  function fakeWebSocket(
    events: string[],
    options: { initializeError?: Error } = {},
  ): CodexAgentRuntimeWebSocketClient {
    return {
      initialize() {
        events.push("initialize");
        if (options.initializeError) {
          return Promise.reject(options.initializeError);
        }
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
      kill: vi.fn(() => true),
    });
    return child;
  }

  function fakeAppServer(child: ChildProcess) {
    return {
      child,
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
  }
});
