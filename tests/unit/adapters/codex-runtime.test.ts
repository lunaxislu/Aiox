import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  attachCodexAgentRuntime,
  type CodexAgentRuntimeWebSocketClient,
} from "../../../src/adapters/codex/runtime.js";
import type { CodexAgentProxy } from "../../../src/adapters/codex/proxy.js";

describe("Codex agent runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
    startProxy: startFakeProxy});

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
      endpoint: "ws://127.0.0.1:54900/",
      appServerPid: 1234,
    });
  });

  it("passes aiox MCP injection to the app-server launch before WS connect", async () => {
    const events: string[] = [];
    const seenLaunchOptions: unknown[] = [];

    await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: null,
      mcp: {
        agentToken: "tok-123",
        daemonSocketPath: "/tmp/aiox.sock",
      },
      launchAppServer: async (options?: unknown) => {
        events.push("launch");
        seenLaunchOptions.push(options);
        return fakeAppServer(fakeChild());
      },
      connectWebSocket: async () => {
        events.push("connect");
        return fakeWebSocket(events);
      },
    startProxy: startFakeProxy});

    expect(events.slice(0, 2)).toEqual(["launch", "connect"]);
    expect(seenLaunchOptions[0]).toMatchObject({
      mcp: {
        agentName: "codex-one",
        agentToken: "tok-123",
        daemonSocketPath: "/tmp/aiox.sock",
      },
    });
  });

  it("disposes by closing WS, sending SIGTERM, then SIGKILL after the grace period", async () => {
    vi.useFakeTimers();
    const events: string[] = [];
    const child = fakeChild();
    vi.mocked(child.kill).mockImplementation((signal?: NodeJS.Signals | number) => {
      events.push(`kill:${String(signal)}`);
      if (signal === "SIGKILL") {
        Object.assign(child, { exitCode: 1 });
        child.emit("exit", 1, null);
      }
      return true;
    });
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      launchAppServer: async () => fakeAppServer(child),
      connectWebSocket: async () => fakeWebSocket(events),
    startProxy: startFakeProxy});

    const disposed = runtime.dispose();

    expect(events).toEqual(["initialize", "close", "kill:SIGTERM"]);
    await vi.advanceTimersByTimeAsync(2_999);
    expect(events).toEqual(["initialize", "close", "kill:SIGTERM"]);

    await vi.advanceTimersByTimeAsync(1);
    await disposed;

    expect(events).toEqual(["initialize", "close", "kill:SIGTERM", "kill:SIGKILL"]);
    expect(runtime.state).toBe("disposed");
  });

  it("dispose is idempotent and skips process signals after the first cleanup", async () => {
    const events: string[] = [];
    const child = fakeChild();
    vi.mocked(child.kill).mockImplementation((signal?: NodeJS.Signals | number) => {
      events.push(`kill:${String(signal)}`);
      Object.assign(child, { exitCode: 0 });
      child.emit("exit", 0, null);
      return true;
    });
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      launchAppServer: async () => fakeAppServer(child),
      connectWebSocket: async () => fakeWebSocket(events),
    startProxy: startFakeProxy});

    await runtime.dispose();
    await runtime.dispose();

    expect(events).toEqual(["initialize", "close", "kill:SIGTERM"]);
    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it("dispose skips process signals when the app-server already exited", async () => {
    const events: string[] = [];
    const child = fakeChild();
    Object.assign(child, { exitCode: 0 });
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      launchAppServer: async () => fakeAppServer(child),
      connectWebSocket: async () => fakeWebSocket(events),
    startProxy: startFakeProxy});

    await runtime.dispose();

    expect(events).toEqual(["initialize", "close"]);
    expect(child.kill).not.toHaveBeenCalled();
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
    startProxy: startFakeProxy});

    await expect(
      runtime.injectTurnStart({
        threadId: "thread-1",
        input: "hello",
      }),
    ).resolves.toEqual({ kind: "success" });

    expect(events.some((event) => event.startsWith("request:turn/start:"))).toBe(true);
  });

  it("starts a daemon-owned Codex thread and rebinds the active thread id", async () => {
    const events: string[] = [];
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: null,
      launchAppServer: async () => fakeAppServer(fakeChild()),
      connectWebSocket: async () =>
        fakeWebSocket(events, {
          requestResults: {
            "thread/start": {
              thread: {
                id: "thread-new",
              },
            },
          },
        }),
    startProxy: startFakeProxy});

    await expect(runtime.startThread()).resolves.toBe("thread-new");

    expect(runtime.activeThreadId).toBe("thread-new");
    expect(events).toContain("request:thread/start:{}");
  });

  it("passes cwd and developerInstructions to thread/start when given, and omits them when not", async () => {
    const events: string[] = [];
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: null,
      launchAppServer: async () => fakeAppServer(fakeChild()),
      connectWebSocket: async () =>
        fakeWebSocket(events, {
          requestResults: {
            "thread/start": {
              thread: {
                id: "thread-new",
              },
            },
          },
        }),
    startProxy: startFakeProxy});

    await expect(runtime.startThread("/repo", "be terse")).resolves.toBe("thread-new");

    expect(events).toContain(
      'request:thread/start:{"cwd":"/repo","developerInstructions":"be terse"}',
    );
  });

  it("resumes a daemon-owned Codex thread only when Codex returns the requested id", async () => {
    const events: string[] = [];
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: null,
      launchAppServer: async () => fakeAppServer(fakeChild()),
      connectWebSocket: async () =>
        fakeWebSocket(events, {
          requestResults: {
            "thread/resume": {
              thread: {
                id: "thread-resume",
              },
            },
          },
        }),
    startProxy: startFakeProxy});

    await expect(runtime.resumeThread("thread-resume")).resolves.toBe("thread-resume");

    expect(runtime.activeThreadId).toBe("thread-resume");
    expect(events).toContain('request:thread/resume:{"threadId":"thread-resume"}');
  });

  it("passes cwd and developerInstructions to thread/resume when given, and omits them when not", async () => {
    const events: string[] = [];
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: null,
      launchAppServer: async () => fakeAppServer(fakeChild()),
      connectWebSocket: async () =>
        fakeWebSocket(events, {
          requestResults: {
            "thread/resume": {
              thread: {
                id: "thread-resume",
              },
            },
          },
        }),
    startProxy: startFakeProxy});

    await expect(
      runtime.resumeThread("thread-resume", "/repo", "be terse"),
    ).resolves.toBe("thread-resume");

    expect(events).toContain(
      'request:thread/resume:{"threadId":"thread-resume","cwd":"/repo","developerInstructions":"be terse"}',
    );
  });

  it("fails explicit Codex resume when the returned thread id differs", async () => {
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-old",
      launchAppServer: async () => fakeAppServer(fakeChild()),
      connectWebSocket: async () =>
        fakeWebSocket([], {
          requestResults: {
            "thread/resume": {
              thread: {
                id: "thread-other",
              },
            },
          },
        }),
    startProxy: startFakeProxy});

    await expect(runtime.resumeThread("thread-requested")).rejects.toMatchObject({
      code: "codex_resume_failed",
      message: expect.stringContaining("thread-other"),
    });
    expect(runtime.activeThreadId).toBe("thread-old");
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
      startProxy: startFakeProxy}),
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
      startProxy: startFakeProxy}),
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
    startProxy: startFakeProxy});

    expect(seenVersions).toEqual([packageVersion]);
  });

  it("marks runtime failed when the ready app-server process exits", async () => {
    const child = fakeChild();
    const failures: unknown[] = [];
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      launchAppServer: async () => fakeAppServer(child),
      connectWebSocket: async () => fakeWebSocket([]),
      onRuntimeFailed: (failure) => {
        failures.push(failure);
      },
    startProxy: startFakeProxy});

    child.emit("exit", 7, "SIGTERM");

    expect(runtime.state).toBe("failed");
    expect(failures).toEqual([
      {
        agentName: "codex-one",
        reason: {
          type: "app_server_process_exited",
          exitCode: 7,
          signal: "SIGTERM",
        },
      },
    ]);
  });

  it("marks runtime failed on ready WS close with diagnostic notification context", async () => {
    const failures: unknown[] = [];
    const websocket = fakeWebSocket([]);
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      launchAppServer: async () => fakeAppServer(fakeChild()),
      connectWebSocket: async () => websocket,
      onRuntimeFailed: (failure) => {
        failures.push(failure);
      },
    startProxy: startFakeProxy});

    websocket.emitNotification({
      method: "remoteControl/status/changed",
      params: { status: "disconnected" },
    });
    websocket.emitClose(1006, "network dropped");

    expect(runtime.state).toBe("failed");
    expect(failures).toEqual([
      {
        agentName: "codex-one",
        reason: {
          type: "ws_dropped",
          closeCode: 1006,
          closeReason: "network dropped",
        },
        latestDiagnosticNotification: {
          method: "remoteControl/status/changed",
          params: { status: "disconnected" },
        },
      },
    ]);
  });

  function fakeWebSocket(
    events: string[],
    options: { initializeError?: Error; requestResults?: Record<string, unknown> } = {},
  ): CodexAgentRuntimeWebSocketClient & {
    emitClose(code: number, reason: string): void;
    emitNotification(notification: { method: string; params?: unknown }): void;
  } {
    const closeListeners = new Set<(code: number, reason: string) => void>();
    const notificationListeners = new Set<
      (notification: { method: string; params?: unknown }) => void
    >();

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
      request(method, params) {
        events.push(`request:${method}:${JSON.stringify(params)}`);
        return Promise.resolve(options.requestResults?.[method] ?? {
          turn: {
            id: "turn-1",
            status: "inProgress",
          },
        });
      },
      close() {
        events.push("close");
      },
      onClose(listener) {
        closeListeners.add(listener);
        return () => {
          closeListeners.delete(listener);
        };
      },
      onNotification(listener) {
        notificationListeners.add(listener);
        return () => {
          notificationListeners.delete(listener);
        };
      },
      emitClose(code, reason) {
        for (const listener of closeListeners) {
          listener(code, reason);
        }
      },
      emitNotification(notification) {
        for (const listener of notificationListeners) {
          listener(notification);
        }
      },
    };
  }

  it("starts a per-agent proxy with the app-server endpoint as upstream and exposes the proxy URL", async () => {
    const proxyCalls: Array<{ upstreamUrl: string }> = [];
    const closeCalls: string[] = [];
    const child = fakeChild();
    Object.assign(child, { exitCode: 0 });
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: "thread-1",
      launchAppServer: async () => fakeAppServer(child),
      connectWebSocket: async () => fakeWebSocket([]),
      startProxy: async (options) => {
        proxyCalls.push({ upstreamUrl: options.upstreamUrl });
        return {
          url: "ws://127.0.0.1:54999/",
          close: async () => {
            closeCalls.push("proxy");
          },
        };
      },
    });

    expect(proxyCalls).toEqual([{ upstreamUrl: "ws://127.0.0.1:54321/" }]);
    expect(runtime.endpoint.toString()).toBe("ws://127.0.0.1:54999/");
    expect(runtime.appServerEndpoint.toString()).toBe("ws://127.0.0.1:54321/");
    expect(runtime.snapshot().endpoint).toBe("ws://127.0.0.1:54999/");

    await runtime.dispose();
    expect(closeCalls).toEqual(["proxy"]);
  });

  it("fans out proxy binding events to subscribed listeners", async () => {
    let bindingHook: ((event: { method: "thread/start" | "thread/resume" | "thread/fork"; threadId: string; requestId: number | string }) => void) | undefined;
    const runtime = await attachCodexAgentRuntime({
      agentName: "codex-one",
      activeThreadId: null,
      launchAppServer: async () => fakeAppServer(fakeChild()),
      connectWebSocket: async () => fakeWebSocket([]),
      startProxy: async (options) => {
        bindingHook = options.onBinding;
        return fakeProxy();
      },
    });

    const received: unknown[] = [];
    runtime.onProxyBinding((event) => received.push(event));

    bindingHook?.({
      method: "thread/resume",
      threadId: "thread-X",
      requestId: 17,
    });

    expect(received).toEqual([
      { method: "thread/resume", threadId: "thread-X", requestId: 17 },
    ]);
  });

  function fakeProxy(url = "ws://127.0.0.1:54900/"): CodexAgentProxy {
    return {
      url,
      close: async () => undefined,
    };
  }

  async function startFakeProxy(): Promise<CodexAgentProxy> {
    return fakeProxy();
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
