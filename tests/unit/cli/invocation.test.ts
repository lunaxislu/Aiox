import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  InvocationError,
  invokeParsedCommand,
  type InvocationRuntime,
} from "../../../src/cli/invocation.js";
import type { DaemonApi } from "../../../src/daemon/api.js";
import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState, type ManagedCodexAgentRuntime } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";
import type { AioxConfig } from "../../../src/config/aiox-config.js";
import { createAdapterRegistry } from "../../../src/host/adapter-registry.js";
import { createFakeAgentRuntimeTerminator } from "../../../src/host/fake-agent-runtime-terminator.js";
import { createFakeHostAdapter } from "../../../src/host/fake-host-adapter.js";
import { createProductionAgentRuntimeTerminator } from "../../../src/host/production-agent-runtime-terminator.js";
import { defaultStartHostForegroundLoop } from "../../../src/host/host-foreground-loop.js";

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe("CLI invocation", () => {
  it("dispatches parsed commands to daemon/runtime actions and preserves shortcut normalization in invocation", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls);

    await invokeParsedCommand({ kind: "daemon-start" }, { runtime, cwd: "/repo" });
    await invokeParsedCommand({ kind: "daemon-stop", daemonOnly: true }, { runtime, cwd: "/repo" });
    await invokeParsedCommand({ kind: "daemon-restart" }, { runtime, cwd: "/repo" });
    await invokeParsedCommand({ kind: "daemon-status" }, { runtime, cwd: "/repo" });
    await invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl" },
      { runtime, cwd: "/repo" },
    );
    await invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "hosted-impl", hostId: "host-1" },
      { runtime, cwd: "/repo" },
    );
    await invokeParsedCommand(
      {
        kind: "agent-attach",
        agentKind: "codex",
        name: "resume-impl",
        resumeSessionId: "thread-1",
      },
      { runtime, cwd: "/repo" },
    );
    await invokeParsedCommand(
      {
        kind: "agent-attach",
        agentKind: "codex",
        name: "described-impl",
        role: "backend",
        description: "implements the API",
        instructions: "always run tests before replying",
      },
      { runtime, cwd: "/repo" },
    );
    await invokeParsedCommand(
      { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
      {
        runtime,
        cwd: "/repo",
        // the static MCP gate runs before startDaemon/attachAgent; this
        // smoke test isn't exercising that gate.
        checkClaudeMcpRegistration: async () => ({ registered: true }),
      },
    );
    await invokeParsedCommand(
      { kind: "connect", sourceName: "impl", targetNames: ["reviewer", "researcher"] },
      { runtime, cwd: "/repo" },
    );
    await invokeParsedCommand({ kind: "pair-create", name: "pair-a" }, { runtime, cwd: "/repo" });
    await invokeParsedCommand({ kind: "status" }, { runtime, cwd: "/repo" });
    await invokeParsedCommand({ kind: "global-stop" }, { runtime, cwd: "/repo" });
    await invokeParsedCommand({ kind: "doctor" }, { runtime, cwd: "/repo" });

    expect(calls).toEqual([
      ["startDaemon"],
      ["daemonStatus"],
      ["stopDaemon", { daemonOnly: true }],
      ["restartDaemon"],
      ["daemonStatus"],
      // agent-attach: auto-starts daemon first (PRD: "Auto-start daemon if needed")
      ["startDaemon"],
      ["attachAgent", { kind: "codex", name: "impl", cwd: "/repo" }],
      ["startDaemon"],
      [
        "attachAgent",
        { kind: "codex", name: "hosted-impl", cwd: "/repo", hostId: "host-1" },
      ],
      ["startDaemon"],
      [
        "attachAgent",
        {
          kind: "codex",
          name: "resume-impl",
          cwd: "/repo",
          resumeSessionId: "thread-1",
        },
      ],
      ["startDaemon"],
      [
        "attachAgent",
        {
          kind: "codex",
          name: "described-impl",
          cwd: "/repo",
          role: "backend",
          description: "implements the API",
          instructions: "always run tests before replying",
        },
      ],
      ["startDaemon"],
      ["attachAgent", { kind: "claude", name: "reviewer", cwd: "/repo", pairName: "pair-a" }],
      ["connect", { sourceName: "impl", targetNames: ["reviewer", "researcher"] }],
      ["createPair", { name: "pair-a" }],
      ["status"],
      ["stopDaemon", { daemonOnly: false }],
      ["doctor"],
    ]);
  });

  it("returns captured help and version text as stdout without daemon calls", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls);

    await expect(
      invokeParsedCommand({ kind: "help", text: "Usage: aiox\n" }, { runtime, cwd: "/repo" }),
    ).resolves.toEqual({ exitCode: 0, stdout: "Usage: aiox\n" });
    await expect(
      invokeParsedCommand({ kind: "version", value: "1.0.0" }, { runtime, cwd: "/repo" }),
    ).resolves.toEqual({ exitCode: 0, stdout: "1.0.0\n" });
    expect(calls).toEqual([]);
  });

  it("formats status, daemon status, and doctor results as stdout", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls);

    await expect(
      invokeParsedCommand({ kind: "status" }, { runtime, cwd: "/repo" }),
    ).resolves.toMatchObject({
      exitCode: 0,
      stdout: expect.stringContaining("DELIVERIES\nmessages=0 queued=0"),
    });
    await expect(
      invokeParsedCommand({ kind: "daemon-status" }, { runtime, cwd: "/repo" }),
    ).resolves.toMatchObject({
      exitCode: 0,
      stdout: expect.stringContaining("VERSION    test-version\n"),
    });
    await expect(
      invokeParsedCommand({ kind: "doctor" }, { runtime, cwd: "/repo" }),
    ).resolves.toMatchObject({
      exitCode: 0,
      stdout: expect.stringContaining("node       ok"),
    });
  });

  it("returns exit code 1 when doctor has required errors", async () => {
    const runtime = createRuntime([], {
      doctor: () => ({
        checks: [
          { name: "node", status: "ok", detail: "v22.4.0" },
          { name: "codex", status: "error", detail: "not found" },
        ],
      }),
    });

    await expect(
      invokeParsedCommand({ kind: "doctor" }, { runtime, cwd: "/repo" }),
    ).resolves.toMatchObject({
      exitCode: 1,
      stdout: expect.stringContaining("codex      error (not found)"),
    });
  });

  it("dispatches mcp-claude to the injected runClaudeMcpServer without starting the daemon", async () => {
    const daemonCalls: unknown[] = [];
    const runtime = createRuntime(daemonCalls);
    let ran = 0;

    const result = await invokeParsedCommand(
      { kind: "mcp-claude" },
      {
        runtime,
        cwd: "/repo",
        runClaudeMcpServer: async () => {
          ran += 1;
        },
      },
    );

    expect(result).toEqual({ exitCode: 0 });
    expect(ran).toBe(1);
    // mcp-claude is a stdio server entry point spawned by Claude itself, not a
    // daemon-attach flow — it must not trigger the auto-start-daemon side effect.
    expect(daemonCalls).toEqual([]);
  });

  it("wraps failed daemon responses in an invocation error namespace", async () => {
    const runtime = createRuntime([], {
      connect: () => ({
        ok: false,
        reason: "source_agent_not_found",
        sourceName: "missing",
      }),
    });

    await expect(
      invokeParsedCommand(
        { kind: "connect", sourceName: "missing", targetNames: ["reviewer"] },
        { runtime, cwd: "/repo" },
      ),
    ).rejects.toMatchObject({
      name: "InvocationError",
      code: "aiox.invocation.source_agent_not_found",
      exitCode: 1,
      message: "Invocation failed: source_agent_not_found",
    });
  });

  it("launches a fresh Codex TUI without implicitly resuming a daemon-reported thread", async () => {
    const calls: unknown[] = [];
    const child = fakeChild();
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: fakeAgentDto(),
          codexRuntime: {
            endpoint: "ws://127.0.0.1:54321/",
            activeThreadId: "thread-1",
          },
          codexChannelToken: "tok-123",
        };
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl" },
      {
        runtime,
        cwd: "/repo",
        launchCodexTui: (options) => {
          calls.push(["launchCodexTui", options]);
          setTimeout(() => child.emit("exit", 7, null), 0);
          return child;
        },
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 7 });
    expect(calls).toEqual([
      ["startDaemon"],
      ["attachAgent", { kind: "codex", name: "impl", cwd: "/repo" }],
      ["launchCodexTui", { endpoint: new URL("ws://127.0.0.1:54321/") }],
      ["notifyTuiExited", { agentName: "impl", exitCode: 7, signal: null }],
    ]);
  });

  it("marks a hosted Codex agent ready only after the vendor child emits spawn", async () => {
    const calls: unknown[] = [];
    const child = fakeChild();
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: fakeAgentDto(),
          codexRuntime: {
            endpoint: "ws://127.0.0.1:54321/",
            activeThreadId: "thread-1",
          },
        };
      },
      markHostAgentReady: (request: Parameters<DaemonApi["markHostAgentReady"]>[0]) => {
        calls.push(["markHostAgentReady", request]);
        return { ok: true, agent: fakeHostAgentDto(request.hostId, request.agentName, "codex") };
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl", hostId: "host-a" },
      {
        runtime,
        cwd: "/repo",
        launchCodexTui: () => {
          setTimeout(() => {
            child.emit("spawn");
            child.emit("exit", 0, null);
          }, 0);
          return child;
        },
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    expect(calls).toContainEqual([
      "markHostAgentReady",
      { hostId: "host-a", agentName: "impl" },
    ]);
    expect(calls.findIndex((call) => Array.isArray(call) && call[0] === "markHostAgentReady")).toBeLessThan(
      calls.findIndex((call) => Array.isArray(call) && call[0] === "notifyTuiExited"),
    );
  });

  it("terminates and detaches a hosted Codex child when the ready report is rejected", async () => {
    const calls: unknown[] = [];
    const child = fakeChild();
    child.kill = vi.fn(() => true);
    const runtime = createRuntime(calls, {
      attachAgent: async () => ({
        ok: true,
        agent: fakeAgentDto(),
        codexRuntime: {
          endpoint: "ws://127.0.0.1:54321/",
          activeThreadId: "thread-1",
        },
      }),
      markHostAgentReady: () => ({
        ok: false,
        reason: "host_not_running",
        hostId: "host-a",
      }),
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl", hostId: "host-a" },
      {
        runtime,
        cwd: "/repo",
        launchCodexTui: () => {
          setTimeout(() => child.emit("spawn"), 0);
          return child;
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({
      code: "aiox.invocation.tui_launch_failed",
      message: expect.stringContaining("host_not_running"),
    });
    expect(child.kill).toHaveBeenCalledOnce();
    expect(calls).toContainEqual(["detachAgent", { hostId: "host-a", agentName: "impl" }]);
  });

  it("resumes only the explicitly requested session id when one was given", async () => {
    const calls: unknown[] = [];
    const child = fakeChild();
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: fakeAgentDto(),
          codexRuntime: {
            endpoint: "ws://127.0.0.1:54321/",
            activeThreadId: "thread-explicit",
          },
        };
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl", resumeSessionId: "thread-explicit" },
      {
        runtime,
        cwd: "/repo",
        launchCodexTui: (options) => {
          calls.push(["launchCodexTui", options]);
          setTimeout(() => child.emit("exit", 0, null), 0);
          return child;
        },
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    expect(calls).toContainEqual([
      "launchCodexTui",
      { endpoint: new URL("ws://127.0.0.1:54321/"), resumeSessionId: "thread-explicit" },
    ]);
  });

  it("detaches the Codex agent when TUI wait rejects after its runtime was registered", async () => {
    // `rollbackAgentAttach()` no-ops (`rolledBack:false`) once the initialized
    // runtime is registered as `ready`, even while a fresh thread binding is
    // still null. `detachAgent()`
    // unconditionally disposes the runtime and removes the agent row/routes
    // regardless of runtime state, so it is the correct cleanup primitive for
    // this failure path (see the real-daemon-state regression test below for
    // proof of the actual leak this call-recording assertion cannot show).
    const calls: unknown[] = [];
    const child = fakeChild();
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: fakeAgentDto(),
          codexRuntime: {
            endpoint: "ws://127.0.0.1:54321/",
            activeThreadId: "thread-1",
          },
        };
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl" },
      {
        runtime,
        cwd: "/repo",
        launchCodexTui: () => {
          setTimeout(() => child.emit("error", new Error("spawn codex ENOENT")), 0);
          return child;
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({
      code: "aiox.invocation.tui_launch_failed",
      exitCode: 1,
      message: expect.stringContaining("spawn codex ENOENT"),
    });
    expect(calls).toEqual([
      ["startDaemon"],
      ["attachAgent", { kind: "codex", name: "impl", cwd: "/repo" }],
      ["detachAgent", { agentName: "impl" }],
    ]);
  });

  it("awaits detachAgent (not fire-and-forget) and still surfaces the original spawn error when launchCodexTui throws synchronously", async () => {
    const calls: unknown[] = [];
    let resolveDetach!: () => void;
    const detachStarted = new Promise<void>((resolve) => {
      resolveDetach = resolve;
    });
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: fakeAgentDto(),
          codexRuntime: {
            endpoint: "ws://127.0.0.1:54321/",
            activeThreadId: "thread-1",
          },
        };
      },
      detachAgent: async (request: unknown) => {
        calls.push(["detachAgent", request]);
        // Proves the caller actually awaits this promise rather than firing
        // it and moving on: if the caller didn't await, `invoked` would
        // settle before this ever resolves.
        await new Promise((resolve) => setTimeout(resolve, 5));
        resolveDetach();
        return { ok: true, agentName: "impl", detached: true };
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl" },
      {
        runtime,
        cwd: "/repo",
        launchCodexTui: () => {
          throw new Error("spawn codex ENOENT");
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({
      code: "aiox.invocation.tui_launch_failed",
      exitCode: 1,
      message: expect.stringContaining("spawn codex ENOENT"),
    });
    // If cleanup were fire-and-forget, the rejection above could resolve
    // before detachAgent's internal delay finishes; awaiting it here proves
    // it had already resolved by the time invokeParsedCommand settled.
    await expect(Promise.race([detachStarted, Promise.resolve("not yet")])).resolves.toBeUndefined();
    expect(calls.filter((call) => Array.isArray(call) && call[0] === "detachAgent")).toEqual([
      ["detachAgent", { agentName: "impl" }],
    ]);
  });

  it("awaits detachAgent when the single-agent Claude launcher throws synchronously", async () => {
    const calls: unknown[] = [];
    let detachFinished = false;
    const runtime = createRuntime(calls, {
      ...claudeAttachOverride(),
      detachAgent: async (request: unknown) => {
        calls.push(["detachAgent", request]);
        await new Promise((resolve) => setTimeout(resolve, 5));
        detachFinished = true;
        return { ok: true, agentName: "reviewer", detached: true };
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "claude", name: "reviewer" },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpRegistration: async () => ({ registered: true, scope: "local" as const }),
        launchClaudeStaticMcpChannel: () => {
          throw new Error("spawn claude ENOENT");
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({
      code: "aiox.invocation.tui_launch_failed",
      exitCode: 1,
      message: expect.stringContaining("spawn claude ENOENT"),
    });
    // A fire-and-forget rollback would let the rejection settle before the
    // daemon-side cleanup had actually run.
    expect(detachFinished).toBe(true);
    expect(calls.filter((call) => Array.isArray(call) && call[0] === "detachAgent")).toEqual([
      ["detachAgent", { agentName: "reviewer" }],
    ]);
  });

  it("awaits detachAgent when the single-agent Claude child errors while being waited on", async () => {
    const calls: unknown[] = [];
    const child = fakeChild();
    let detachFinished = false;
    const runtime = createRuntime(calls, {
      ...claudeAttachOverride(),
      detachAgent: async (request: unknown) => {
        calls.push(["detachAgent", request]);
        await new Promise((resolve) => setTimeout(resolve, 5));
        detachFinished = true;
        return { ok: true, agentName: "reviewer", detached: true };
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "claude", name: "reviewer" },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpRegistration: async () => ({ registered: true, scope: "local" as const }),
        launchClaudeStaticMcpChannel: () => {
          setTimeout(() => child.emit("error", new Error("claude died")), 0);
          return child;
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({ message: expect.stringContaining("claude died") });
    expect(detachFinished).toBe(true);
    expect(calls.filter((call) => Array.isArray(call) && call[0] === "detachAgent")).toEqual([
      ["detachAgent", { agentName: "reviewer" }],
    ]);
  });

  it("reports a daemon-side runtime dispose failure alongside the original TUI launch error", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: fakeAgentDto(),
          codexRuntime: { endpoint: "ws://127.0.0.1:54321/", activeThreadId: "thread-1" },
        };
      },
      detachAgent: async (request: unknown) => {
        calls.push(["detachAgent", request]);
        return {
          ok: true,
          agentName: "impl",
          detached: true,
          runtimeDisposeError: "app-server refused to stop",
        };
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl" },
      {
        runtime,
        cwd: "/repo",
        launchCodexTui: () => {
          throw new Error("spawn codex ENOENT");
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({
      code: "aiox.invocation.tui_launch_failed",
      message: expect.stringContaining("app-server refused to stop"),
    });
  });

  it("reports both the original TUI launch error and a detachAgent cleanup failure, without silently swallowing either", async () => {
    const calls: unknown[] = [];
    const child = fakeChild();
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: fakeAgentDto(),
          codexRuntime: {
            endpoint: "ws://127.0.0.1:54321/",
            activeThreadId: "thread-1",
          },
        };
      },
      detachAgent: async (request: unknown) => {
        calls.push(["detachAgent", request]);
        throw new Error("detach transport error");
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl" },
      {
        runtime,
        cwd: "/repo",
        launchCodexTui: () => {
          setTimeout(() => child.emit("error", new Error("spawn codex ENOENT")), 0);
          return child;
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({
      code: "aiox.invocation.tui_launch_failed",
      exitCode: 1,
      message: expect.stringMatching(/spawn codex ENOENT/),
    });
    await expect(invoked).rejects.toMatchObject({
      message: expect.stringMatching(/detach transport error/),
    });
    expect(calls.filter((call) => Array.isArray(call) && call[0] === "detachAgent")).toEqual([
      ["detachAgent", { agentName: "impl" }],
    ]);
  });

  it("routes to the Local static launcher and disconnects on exit when the Local MCP is registered", async () => {
    const calls: unknown[] = [];
    const child = fakeChild();
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: { ...fakeAgentDto(), name: "reviewer", kind: "claude" },
          claudeChannelToken: "claude-token-1",
        };
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpRegistration: async (checkOptions) => {
          calls.push(["checkClaudeMcpRegistration", checkOptions]);
          return { registered: true };
        },
        launchClaudeStaticMcpChannel: (options) => {
          calls.push(["launchClaudeStaticMcpChannel", options]);
          setTimeout(() => child.emit("exit", 0, null), 0);
          return child;
        },
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    // the registration gate runs BEFORE any daemon/attach/token side effect.
    expect(calls).toEqual([
      ["checkClaudeMcpRegistration", { name: "aiox-claude-ingress", cwd: "/repo" }],
      ["startDaemon"],
      ["attachAgent", { kind: "claude", name: "reviewer", cwd: "/repo", pairName: "pair-a" }],
      [
        "launchClaudeStaticMcpChannel",
        {
          channelName: "aiox-claude-ingress",
          agentName: "reviewer",
          agentToken: "claude-token-1",
          daemonSocketPath: "/tmp/aiox/daemon.sock",
        },
      ],
      ["disconnectClaudeChannel", { agentName: "reviewer" }],
    ]);
  });

  it("marks a hosted Claude agent ready only after the vendor child emits spawn", async () => {
    const calls: unknown[] = [];
    const child = fakeChild();
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: { ...fakeAgentDto(), name: "reviewer", kind: "claude" },
          claudeChannelToken: "claude-token-1",
        };
      },
      markHostAgentReady: (request: Parameters<DaemonApi["markHostAgentReady"]>[0]) => {
        calls.push(["markHostAgentReady", request]);
        return { ok: true, agent: fakeHostAgentDto(request.hostId, request.agentName, "claude") };
      },
    });

    const invoked = invokeParsedCommand(
      {
        kind: "agent-attach",
        agentKind: "claude",
        name: "reviewer",
        hostId: "host-a",
      },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpRegistration: async () => ({ registered: true }),
        launchClaudeStaticMcpChannel: () => {
          setTimeout(() => {
            child.emit("spawn");
            child.emit("exit", 0, null);
          }, 0);
          return child;
        },
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    expect(calls).toContainEqual([
      "markHostAgentReady",
      { hostId: "host-a", agentName: "reviewer" },
    ]);
    expect(calls).toContainEqual([
      "disconnectClaudeChannel",
      { hostId: "host-a", agentName: "reviewer" },
    ]);
  });

  it("detaches a hosted Claude agent when channel boot cannot resolve the daemon socket", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls, {
      ...claudeAttachOverride(),
      daemonSocketPath: undefined,
    });

    const invoked = invokeParsedCommand(
      {
        kind: "agent-attach",
        agentKind: "claude",
        name: "reviewer",
        hostId: "host-a",
      },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpRegistration: async () => ({ registered: true }),
      },
    );

    await expect(invoked).rejects.toMatchObject({
      code: "aiox.invocation.missing_daemon_socket_path",
    });
    expect(calls).toContainEqual([
      "detachAgent",
      { hostId: "host-a", agentName: "reviewer" },
    ]);
  });

  it("passes --instructions text through to the static Claude launcher as its own field, preserving multiline/quotes/special chars", async () => {
    const calls: unknown[] = [];
    const child = fakeChild();
    const instructions = 'multi\nline "quoted" $var `backtick`';
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: { ...fakeAgentDto(), name: "reviewer", kind: "claude" },
          claudeChannelToken: "claude-token-1",
        };
      },
    });

    const invoked = invokeParsedCommand(
      {
        kind: "agent-attach",
        agentKind: "claude",
        name: "reviewer",
        instructions,
      },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpRegistration: async () => ({ registered: true }),
        launchClaudeStaticMcpChannel: (options) => {
          calls.push(["launchClaudeStaticMcpChannel", options]);
          setTimeout(() => child.emit("exit", 0, null), 0);
          return child;
        },
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    expect(calls).toContainEqual([
      "launchClaudeStaticMcpChannel",
      {
        channelName: "aiox-claude-ingress",
        agentName: "reviewer",
        agentToken: "claude-token-1",
        daemonSocketPath: "/tmp/aiox/daemon.sock",
        instructions,
      },
    ]);
  });

  it("omits the instructions field on the static Claude launcher call when --instructions was not given", async () => {
    const calls: unknown[] = [];
    const child = fakeChild();
    const runtime = createRuntime(calls, {
      attachAgent: async (request: unknown) => {
        calls.push(["attachAgent", request]);
        return {
          ok: true,
          agent: { ...fakeAgentDto(), name: "reviewer", kind: "claude" },
          claudeChannelToken: "claude-token-1",
        };
      },
    });

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "claude", name: "reviewer" },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpRegistration: async () => ({ registered: true }),
        launchClaudeStaticMcpChannel: (options) => {
          calls.push(["launchClaudeStaticMcpChannel", options]);
          setTimeout(() => child.emit("exit", 0, null), 0);
          return child;
        },
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    const launchCall = calls.find(
      (call) => Array.isArray(call) && call[0] === "launchClaudeStaticMcpChannel",
    ) as [string, Record<string, unknown>] | undefined;
    expect(launchCall).toBeDefined();
    expect(launchCall?.[1]).not.toHaveProperty("instructions");
  });

  it("fails fast with the required error before any daemon/attach/token side effect when the Local MCP is not registered", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls, claudeAttachOverride());

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpRegistration: async () => ({ registered: false }),
      },
    );

    await expect(invoked).rejects.toMatchObject({
      name: "InvocationError",
      code: "aiox.invocation.claude_mcp_not_registered",
      exitCode: 1,
      message:
        "Claude AIOX MCP is not registered for this directory.\nRun `aiox claude setup --scope <local|user|project>` first.",
    });
    expect(calls).toEqual([]);
  });

  it("wraps a thrown effective MCP registration check failure into a coded error before any side effect", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls, claudeAttachOverride());

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpRegistration: async () => {
          throw new Error("spawn claude ENOENT");
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({
      name: "InvocationError",
      code: "aiox.invocation.claude_mcp_registration_check_failed",
      exitCode: 1,
    });
    expect(calls).toEqual([]);
  });

  it("claude setup registers the static MCP at the requested scope and returns a summary", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls);
    const seen: unknown[] = [];

    const result = await invokeParsedCommand(
      { kind: "claude-mcp-setup", scope: "local" },
      {
        runtime,
        cwd: "/work/proj",
        buildClaudeStaticMcpConfig: () => "STATIC_JSON_DEF",
        setupClaudeMcp: async (input) => {
          seen.push(input);
          return { ok: true };
        },
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("aiox-claude-ingress");
    expect(result.stdout).toContain("scope: local");
    expect(seen).toEqual([
      { name: "aiox-claude-ingress", json: "STATIC_JSON_DEF", cwd: "/work/proj", scope: "local" },
    ]);
    // provisioning is daemon-independent — must not auto-start the daemon
    expect(calls).toEqual([]);
  });

  it.each(["local", "user", "project"] as const)(
    "claude setup passes the %s scope through and reflects it in the success summary",
    async (scope) => {
      const runtime = createRuntime([]);
      const seen: unknown[] = [];

      const result = await invokeParsedCommand(
        { kind: "claude-mcp-setup", scope },
        {
          runtime,
          cwd: "/work/proj",
          buildClaudeStaticMcpConfig: () => "STATIC_JSON_DEF",
          setupClaudeMcp: async (input) => {
            seen.push(input);
            return { ok: true };
          },
        },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`scope: ${scope}`);
      expect(seen).toEqual([
        { name: "aiox-claude-ingress", json: "STATIC_JSON_DEF", cwd: "/work/proj", scope },
      ]);
    },
  );

  it("claude setup surfaces a collision as a coded non-zero error without overwriting", async () => {
    const runtime = createRuntime([]);

    const invoked = invokeParsedCommand(
      { kind: "claude-mcp-setup", scope: "local" },
      {
        runtime,
        cwd: "/repo",
        setupClaudeMcp: async () => ({
          ok: false,
          code: "claude_mcp_cli_failed",
          message: "claude mcp add-json aiox-claude-ingress -s local failed: MCP server aiox-claude-ingress already exists in local config",
        }),
      },
    );

    await expect(invoked).rejects.toMatchObject({
      name: "InvocationError",
      code: "aiox.invocation.claude_mcp_setup.claude_mcp_cli_failed",
      exitCode: 1,
      message: expect.stringContaining("already exists in local config"),
    });
  });

  it("claude setup wraps a thrown CLI failure into a coded error", async () => {
    const runtime = createRuntime([]);

    const invoked = invokeParsedCommand(
      { kind: "claude-mcp-setup", scope: "local" },
      {
        runtime,
        cwd: "/repo",
        setupClaudeMcp: async () => {
          throw new Error("spawn claude ENOENT");
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({
      name: "InvocationError",
      code: "aiox.invocation.claude_mcp_setup_failed",
      exitCode: 1,
    });
  });

  describe("aiox host (Stage 6 YAML host connection)", () => {
    function makeControllerRuntime(api: DaemonApi): InvocationRuntime {
      return {
        getDaemonApi: () => api,
        startDaemon: async () => ({ ok: true }),
        stopDaemon: async () => ({ ok: true, stoppedAgents: [] }),
        restartDaemon: async () => ({ ok: true }),
        daemonStatus: () => ({
          running: true,
          pid: 1,
          socketPath: "/tmp/aiox/daemon.sock",
          dbPath: ":memory:",
          startedAt: "2026-08-31T00:00:00.000Z",
          version: "test-version",
        }),
        doctor: () => ({ checks: [] }),
      };
    }

    it("delegates YAML host ownership through the same worker handoff without local startup", async () => {
      const calls: unknown[] = [];
      const startHostWorker = vi.fn(async () => ({ exitCode: 0 as const }));

      await expect(
        invokeParsedCommand(
          { kind: "host", name: "demo", path: "/repo/from-flag" },
          {
            runtime: createRuntime(calls),
            cwd: "/repo/cwd",
            startHostWorker,
          },
        ),
      ).resolves.toEqual({ exitCode: 0 });
      expect(startHostWorker).toHaveBeenCalledWith({
        command: { kind: "host", name: "demo", path: "/repo/from-flag" },
        cwd: "/repo/from-flag",
      });
      expect(calls).toEqual([]);
    });

    it("plain `aiox host` loads aiox.yaml from cwd and drives the same HostController pipeline as host-new", async () => {
      const db = new Database(":memory:");
      applySchema(db);
      let nextId = 0;
      const state = createDaemonState({
        db,
        createId: () => `id-${(nextId += 1)}`,
        now: () => "2026-08-31T00:00:00.000Z",
      });
      const api = createDaemonApi(state);
      const adapter = createFakeHostAdapter();
      const terminator = createFakeAgentRuntimeTerminator();
      const loadCalls: string[] = [];
      const config = {
        project: "demo",
        agents: [
          { name: "reviewer", type: "codex" },
          { name: "implementer", type: "claude-code" },
        ],
      } as unknown as AioxConfig;

      const invoked = invokeParsedCommand(
        { kind: "host" },
        {
          runtime: makeControllerRuntime(api),
          cwd: "/repo/demo",
          loadAioxConfig: (cwd) => {
            loadCalls.push(cwd);
            return config;
          },
          validateAioxConfigSemantics: () => {},
          createAdapterRegistry: () => {
            const registry = createAdapterRegistry();
            registry.register(adapter);
            return registry;
          },
          createAgentRuntimeTerminator: () => terminator,
          hostForegroundLoopIntervalMs: 5,
        },
      );

      const hostId = await vi.waitFor(() => {
        const hosts = api.listRunningHosts().hosts;
        expect(hosts).toHaveLength(1);
        return hosts[0]!.id;
      });

      expect(loadCalls).toEqual(["/repo/demo"]);
      expect(adapter.calls).toHaveLength(2);
      expect(adapter.calls[0]!.request.args).toEqual([
        "codex",
        "--name",
        "reviewer",
        "--host-id",
        hostId,
      ]);

      await api.attachAgent({ hostId, kind: "codex", name: "reviewer", cwd: "/repo/demo" });
      await api.attachAgent({ hostId, kind: "claude", name: "implementer", cwd: "/repo/demo" });
      await api.markHostAgentReady({ hostId, agentName: "reviewer" });
      await api.markHostAgentReady({ hostId, agentName: "implementer" });
      await vi.waitFor(() => expect(api.status().routes).toHaveLength(2));

      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");
      await expect(invoked).resolves.toEqual({ exitCode: 0 });

      db.close();
    });

    it("`aiox host --path <p>` loads aiox.yaml from that path instead of cwd", async () => {
      const db = new Database(":memory:");
      applySchema(db);
      let nextId = 0;
      const state = createDaemonState({
        db,
        createId: () => `id-${(nextId += 1)}`,
        now: () => "2026-08-31T00:00:00.000Z",
      });
      const api = createDaemonApi(state);
      const adapter = createFakeHostAdapter();
      const terminator = createFakeAgentRuntimeTerminator();
      const loadCalls: string[] = [];
      const config = {
        project: "demo",
        agents: [{ name: "reviewer", type: "codex" }],
      } as unknown as AioxConfig;

      const invoked = invokeParsedCommand(
        { kind: "host", path: "/tmp/project-b" },
        {
          runtime: makeControllerRuntime(api),
          cwd: "/repo/somewhere-else",
          loadAioxConfig: (cwd) => {
            loadCalls.push(cwd);
            return config;
          },
          validateAioxConfigSemantics: () => {},
          createAdapterRegistry: () => {
            const registry = createAdapterRegistry();
            registry.register(adapter);
            return registry;
          },
          createAgentRuntimeTerminator: () => terminator,
          hostForegroundLoopIntervalMs: 5,
        },
      );

      const hosts = await vi.waitFor(() => {
        const hosts = api.listRunningHosts().hosts;
        expect(hosts).toHaveLength(1);
        return hosts;
      });

      // `--path`, not `cwd`, is the config-load and controller path used
      // everywhere -- never resolved to an absolute path (no `path.resolve`).
      expect(loadCalls).toEqual(["/tmp/project-b"]);
      expect(hosts[0]!.canonicalPath).toBe("/tmp/project-b");

      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");
      await expect(invoked).resolves.toEqual({ exitCode: 0 });

      db.close();
    });

    it("`aiox host <name> --path <p>` succeeds when name matches aiox.yaml project", async () => {
      const db = new Database(":memory:");
      applySchema(db);
      let nextId = 0;
      const state = createDaemonState({
        db,
        createId: () => `id-${(nextId += 1)}`,
        now: () => "2026-08-31T00:00:00.000Z",
      });
      const api = createDaemonApi(state);
      const adapter = createFakeHostAdapter();
      const terminator = createFakeAgentRuntimeTerminator();
      const config = {
        project: "demo",
        agents: [{ name: "reviewer", type: "codex" }],
      } as unknown as AioxConfig;

      const invoked = invokeParsedCommand(
        { kind: "host", name: "demo", path: "/tmp/project-b" },
        {
          runtime: makeControllerRuntime(api),
          cwd: "/repo",
          loadAioxConfig: () => config,
          validateAioxConfigSemantics: () => {},
          createAdapterRegistry: () => {
            const registry = createAdapterRegistry();
            registry.register(adapter);
            return registry;
          },
          createAgentRuntimeTerminator: () => terminator,
          hostForegroundLoopIntervalMs: 5,
        },
      );

      await vi.waitFor(() => {
        expect(api.listRunningHosts().hosts).toHaveLength(1);
      });

      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");
      await expect(invoked).resolves.toEqual({ exitCode: 0 });

      db.close();
    });

    it("fails before any daemon call when `aiox host <name> --path <p>` name does not match aiox.yaml project", async () => {
      const calls: unknown[] = [];
      const runtime = createRuntime(calls);

      const invoked = invokeParsedCommand(
        { kind: "host", name: "other-name", path: "/repo/demo" },
        {
          runtime,
          cwd: "/repo",
          loadAioxConfig: (cwd) => {
            calls.push(["loadAioxConfig", cwd]);
            return {
              project: "demo",
              agents: [{ name: "reviewer", type: "codex" }],
            } as unknown as AioxConfig;
          },
          validateAioxConfigSemantics: () => {},
        },
      );

      await expect(invoked).rejects.toMatchObject({
        name: "InvocationError",
        code: "aiox.invocation.host_name_mismatch",
        exitCode: 1,
        message: expect.stringContaining('"other-name"'),
      });
      // The prerequisite is a pure local comparison against the config
      // already loaded, so no daemon/adapter side effect must have
      // happened -- only the config load itself.
      expect(calls).toEqual([["loadAioxConfig", "/repo/demo"]]);
    });

    it("composes `instructions.global` + per-agent `instructions` into the HostAgentDeclaration the controller launches", async () => {
      const db = new Database(":memory:");
      applySchema(db);
      let nextId = 0;
      const state = createDaemonState({
        db,
        createId: () => `id-${(nextId += 1)}`,
        now: () => "2026-08-31T00:00:00.000Z",
      });
      const api = createDaemonApi(state);
      const adapter = createFakeHostAdapter();
      const terminator = createFakeAgentRuntimeTerminator();
      const config = {
        project: "demo",
        instructions: { global: "Follow safety rules." },
        agents: [{ name: "reviewer", type: "codex", instructions: "Focus on tests." }],
      } as unknown as AioxConfig;

      const invoked = invokeParsedCommand(
        { kind: "host" },
        {
          runtime: makeControllerRuntime(api),
          cwd: "/repo/demo",
          loadAioxConfig: () => config,
          validateAioxConfigSemantics: () => {},
          createAdapterRegistry: () => {
            const registry = createAdapterRegistry();
            registry.register(adapter);
            return registry;
          },
          createAgentRuntimeTerminator: () => terminator,
          hostForegroundLoopIntervalMs: 5,
        },
      );

      const hostId = await vi.waitFor(() => {
        const hosts = api.listRunningHosts().hosts;
        expect(hosts).toHaveLength(1);
        return hosts[0]!.id;
      });
      expect(adapter.calls).toHaveLength(1);
      expect(adapter.calls[0]!.request.args).toEqual([
        "codex",
        "--name",
        "reviewer",
        "--host-id",
        hostId,
        "--instructions",
        "Follow safety rules.\n\nFocus on tests.",
      ]);

      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");
      await expect(invoked).resolves.toEqual({ exitCode: 0 });

      db.close();
    });

    it("converts aiox.yaml routes[] (mesh + directed, string and array `to`) into HostRouteOperation[] and reconciles effective edges the same way host-new does", async () => {
      const db = new Database(":memory:");
      applySchema(db);
      let nextId = 0;
      const state = createDaemonState({
        db,
        createId: () => `id-${(nextId += 1)}`,
        now: () => "2026-08-31T00:00:00.000Z",
      });
      const api = createDaemonApi(state);
      const adapter = createFakeHostAdapter();
      const terminator = createFakeAgentRuntimeTerminator();
      const config = {
        project: "demo",
        agents: [
          { name: "reviewer", type: "codex" },
          { name: "implementer", type: "claude-code" },
          { name: "watcher", type: "codex" },
        ],
        routes: [
          {
            name: "development",
            members: ["reviewer", "implementer", "watcher"],
            directed: [
              { from: "watcher", to: "reviewer" },
              { from: "reviewer", to: ["implementer", "watcher"] },
            ],
          },
        ],
      } as unknown as AioxConfig;

      const invoked = invokeParsedCommand(
        { kind: "host" },
        {
          runtime: makeControllerRuntime(api),
          cwd: "/repo/demo",
          loadAioxConfig: () => config,
          validateAioxConfigSemantics: () => {},
          createAdapterRegistry: () => {
            const registry = createAdapterRegistry();
            registry.register(adapter);
            return registry;
          },
          createAgentRuntimeTerminator: () => terminator,
          hostForegroundLoopIntervalMs: 5,
        },
      );

      const hostId = await vi.waitFor(() => {
        const hosts = api.listRunningHosts().hosts;
        expect(hosts).toHaveLength(1);
        return hosts[0]!.id;
      });

      // Declared topology exists, but effective edges are the ready-subset
      // only -- none of that until reconcile observes ready agents.
      expect(api.status().routes).toEqual([]);

      await api.attachAgent({ hostId, kind: "codex", name: "reviewer", cwd: "/repo/demo" });
      await api.attachAgent({ hostId, kind: "claude", name: "implementer", cwd: "/repo/demo" });
      await api.attachAgent({ hostId, kind: "codex", name: "watcher", cwd: "/repo/demo" });
      await api.markHostAgentReady({ hostId, agentName: "reviewer" });
      await api.markHostAgentReady({ hostId, agentName: "implementer" });
      await api.markHostAgentReady({ hostId, agentName: "watcher" });

      // aiox-compose-contract.md §"Mesh와 directed override의 관계": `directed`
      // narrows only the pair it names, to exactly the declared direction(s);
      // every pair `directed` never mentions keeps the mesh default.
      // - {reviewer, watcher}: both directions are declared explicitly
      //   (watcher->reviewer, and reviewer->watcher via the array `to`) -- both
      //   survive.
      // - {reviewer, implementer}: only reviewer->implementer is declared --
      //   the pair narrows to that single direction, so implementer->reviewer
      //   is gone.
      // - {implementer, watcher}: not named in `directed` at all -- stays mesh.
      // Total: 2 + 1 + 2 = 5 edges (not the additive-only 6).
      await vi.waitFor(() => {
        expect(api.status().routes).toHaveLength(5);
      });

      const hostAgents = api.listHostAgents({ hostId }).agents;
      const idOf = (name: string) => hostAgents.find((agent) => agent.name === name)!.id;
      const pairs = api.status().routes.map((route) => [route.sourceAgentId, route.targetAgentId]);
      expect(pairs).not.toContainEqual([idOf("implementer"), idOf("reviewer")]);
      expect(pairs).toContainEqual([idOf("reviewer"), idOf("implementer")]);
      expect(pairs).toContainEqual([idOf("reviewer"), idOf("watcher")]);
      expect(pairs).toContainEqual([idOf("watcher"), idOf("reviewer")]);
      expect(pairs).toContainEqual([idOf("implementer"), idOf("watcher")]);
      expect(pairs).toContainEqual([idOf("watcher"), idOf("implementer")]);

      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");
      await expect(invoked).resolves.toEqual({ exitCode: 0 });

      db.close();
    });

    it("fails on invalid aiox.yaml (load or semantic validation) before any daemon call", async () => {
      const calls: unknown[] = [];
      const runtime = createRuntime(calls);

      const invoked = invokeParsedCommand(
        { kind: "host" },
        {
          runtime,
          cwd: "/repo",
          loadAioxConfig: () => {
            throw new Error("aiox.yaml not found at /repo/aiox.yaml");
          },
        },
      );

      await expect(invoked).rejects.toMatchObject({
        name: "InvocationError",
        code: "aiox.invocation.host_config_invalid",
        exitCode: 1,
        message: expect.stringContaining("aiox.yaml not found"),
      });
      expect(calls).toEqual([]);
    });

    it("fails when validateAioxConfigSemantics throws on an otherwise-loadable aiox.yaml, before any daemon call", async () => {
      const calls: unknown[] = [];
      const runtime = createRuntime(calls);

      const invoked = invokeParsedCommand(
        { kind: "host" },
        {
          runtime,
          cwd: "/repo/demo",
          loadAioxConfig: () =>
            ({
              project: "demo",
              agents: [{ name: "reviewer", type: "codex" }],
            }) as unknown as AioxConfig,
          validateAioxConfigSemantics: () => {
            throw new Error("route \"development\" references unknown agent \"ghost\"");
          },
        },
      );

      await expect(invoked).rejects.toMatchObject({
        name: "InvocationError",
        code: "aiox.invocation.host_config_invalid",
        exitCode: 1,
        message: expect.stringContaining("references unknown agent"),
      });
      // Same zero-side-effect boundary as a loader throw: adapter selection,
      // startDaemon, and host registration must not run once the semantic
      // validator itself is what failed.
      expect(calls).toEqual([]);
    });

    it("fails honestly at static preflight for plain `aiox host` when no host adapter is registered, before any daemon side effect", async () => {
      const calls: unknown[] = [];
      const runtime = createRuntime(calls, {
        registerRunningHost(request: unknown) {
          calls.push(["registerRunningHost", request]);
          throw new Error("must not be called before adapter selection succeeds");
        },
      });

      const invoked = invokeParsedCommand(
        { kind: "host" },
        {
          runtime,
          cwd: "/repo/demo",
          loadAioxConfig: () =>
            ({
              project: "demo",
              agents: [{ name: "reviewer", type: "codex" }],
            }) as unknown as AioxConfig,
          validateAioxConfigSemantics: () => {},
          createAdapterRegistry: () => createAdapterRegistry(),
        },
      );

      await expect(invoked).rejects.toMatchObject({
        name: "InvocationError",
        code: "aiox.invocation.host_static_preflight_failed",
        exitCode: 1,
        message: expect.stringContaining("no host adapter matches the current environment"),
      });
      // Same failure contract as host-new (Blocker 2 correction): adapter
      // selection + static preflight resolves fully BEFORE the daemon is
      // even started -- zero daemon/host/agent/surface side effect.
      expect(calls).toEqual([]);
    });
  });

  it("aiox host --list formats the daemon's running-host registry", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls, {
      listRunningHosts() {
        calls.push(["listRunningHosts"]);
        return {
          ok: true,
          hosts: [
            {
              id: "host-1",
              name: "demo",
              canonicalPath: "/repo/demo",
              controllerId: "controller-1",
              createdAt: "2026-08-31T00:00:00.000Z",
              lastSeenAt: "2026-08-31T00:00:00.000Z",
            },
          ],
        };
      },
    });

    const result = await invokeParsedCommand({ kind: "host-list" }, { runtime, cwd: "/repo" });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout ?? "")).toEqual({
      ok: true,
      hosts: [
        {
          id: "host-1",
          name: "demo",
          canonicalPath: "/repo/demo",
          controllerId: "controller-1",
          createdAt: "2026-08-31T00:00:00.000Z",
          lastSeenAt: "2026-08-31T00:00:00.000Z",
        },
      ],
    });
    expect(calls).toEqual([["startDaemon"], ["listRunningHosts"]]);
  });

  describe("aiox host new (W6 Stage 5D)", () => {
    it("returns the detached worker startup result without starting a local controller owner", async () => {
      const calls: unknown[] = [];
      const startHostWorker = vi.fn(async () => ({ exitCode: 0 as const }));

      await expect(
        invokeParsedCommand(
          {
            kind: "host-new",
            name: "demo",
            agents: [{ agentKind: "codex", name: "reviewer" }],
          },
          {
            runtime: createRuntime(calls),
            cwd: "/repo/demo",
            startHostWorker,
          },
        ),
      ).resolves.toEqual({ exitCode: 0 });
      expect(startHostWorker).toHaveBeenCalledWith({
        command: {
          kind: "host-new",
          name: "demo",
          agents: [{ agentKind: "codex", name: "reviewer" }],
        },
        cwd: "/repo/demo",
      });
      expect(calls).toEqual([]);
    });

    it("keeps one controller owner after parent handoff loss until relay termination", async () => {
      const db = new Database(":memory:");
      applySchema(db);
      let nextId = 0;
      const api = createDaemonApi(
        createDaemonState({
          db,
          createId: () => `id-${(nextId += 1)}`,
          now: () => "2026-08-31T00:00:00.000Z",
        }),
      );
      const adapter = createFakeHostAdapter();
      const terminator = createFakeAgentRuntimeTerminator();

      const invoked = invokeParsedCommand(
        {
          kind: "host-new",
          name: "demo",
          agents: [
            { agentKind: "codex", name: "reviewer" },
            { agentKind: "claude", name: "implementer" },
          ],
        },
        {
          runtime: createInvocationRuntimeForApi(api),
          cwd: "/repo/demo",
          createAdapterRegistry: () => {
            const registry = createAdapterRegistry();
            registry.register(adapter);
            return registry;
          },
          createAgentRuntimeTerminator: () => terminator,
          onHostControllerStarted: async () => {
            throw new Error("startup IPC disconnected");
          },
          hostForegroundLoopIntervalMs: 5,
        },
      );

      const hostId = await vi.waitFor(() => {
        const hosts = api.listRunningHosts().hosts;
        expect(hosts).toHaveLength(1);
        return hosts[0]!.id;
      });
      const submitted = api.submitHostControlRequest({
        name: "demo",
        kind: "terminate_all",
      });
      if (!submitted.ok) throw new Error("expected terminate submit to succeed");

      await expect(invoked).resolves.toEqual({ exitCode: 0 });
      expect(api.listRunningHosts().hosts).toEqual([]);
      expect(terminator.calls).toHaveLength(2);
      expect(terminator.calls.every((call) => call.hostId === hostId)).toBe(true);
      db.close();
    });

    it("fails honestly at static_preflight when an explicitly empty test registry is supplied", async () => {
      const calls: unknown[] = [];
      const runtime = createRuntime(calls, {
        registerRunningHost(request: unknown) {
          calls.push(["registerRunningHost", request]);
          throw new Error("must not be called before adapter selection succeeds");
        },
      });

      const invoked = invokeParsedCommand(
        {
          kind: "host-new",
          name: "demo",
          agents: [{ agentKind: "codex", name: "reviewer" }],
        },
        { runtime, cwd: "/repo/demo", createAdapterRegistry: () => createAdapterRegistry() },
      );

      await expect(invoked).rejects.toMatchObject({
        name: "InvocationError",
        code: "aiox.invocation.host_new_static_preflight_failed",
        exitCode: 1,
        message: expect.stringContaining("no host adapter matches the current environment"),
      });
      // Blocker 2 correction: adapter selection + static preflight now
      // resolves fully BEFORE the daemon is even started -- zero
      // daemon/host/agent/surface side effect on a static failure.
      expect(calls).toEqual([]);
    });

    it("uses the production cmux registry by default and keeps executable failure before daemon side effects", async () => {
      const calls: unknown[] = [];
      const runtime = createRuntime(calls);
      const previous = {
        workspace: process.env.CMUX_WORKSPACE_ID,
        socket: process.env.CMUX_SOCKET_PATH,
        path: process.env.PATH,
      };
      process.env.CMUX_WORKSPACE_ID = "workspace-id";
      delete process.env.CMUX_SOCKET_PATH;
      process.env.PATH = "";

      try {
        const invoked = invokeParsedCommand(
          {
            kind: "host-new",
            name: "demo",
            agents: [{ agentKind: "codex", name: "reviewer" }],
          },
          { runtime, cwd: "/repo/demo" },
        );

        await expect(invoked).rejects.toMatchObject({
          code: "aiox.invocation.host_new_static_preflight_failed",
          message: expect.stringContaining("cmux executable is unavailable"),
        });
        expect(calls).toEqual([]);
      } finally {
        restoreEnvironment("CMUX_WORKSPACE_ID", previous.workspace);
        restoreEnvironment("CMUX_SOCKET_PATH", previous.socket);
        restoreEnvironment("PATH", previous.path);
      }
    });

    it("carries the real cause, a help pointer, and the literal 'No agents were started.' sentence on a static preflight failure", async () => {
      const runtime = createRuntime([]);
      const adapter = createFakeHostAdapter({
        staticPreflight: { ok: false, reason: "cmux executable is unavailable" },
      });

      const invoked = invokeParsedCommand(
        {
          kind: "host-new",
          name: "demo",
          agents: [{ agentKind: "codex", name: "reviewer" }],
        },
        {
          runtime,
          cwd: "/repo/demo",
          createAdapterRegistry: () => {
            const registry = createAdapterRegistry();
            registry.register(adapter);
            return registry;
          },
        },
      );

      await expect(invoked).rejects.toMatchObject({
        message: expect.stringContaining("No agents were started."),
      });
      await expect(invoked).rejects.toMatchObject({
        message: expect.stringContaining("README.md"),
      });
      await expect(invoked).rejects.toMatchObject({
        message: expect.stringContaining("README.md#cmux-host-integration"),
      });
      await expect(invoked).rejects.not.toMatchObject({
        message: expect.stringContaining("currently supported AIOX workflows"),
      });
    });

    it("declares an initial route topology from --route blocks and reconciles it into effective edges once agents become ready (Blocker 1)", async () => {
      const db = new Database(":memory:");
      applySchema(db);
      let nextId = 0;
      const state = createDaemonState({
        db,
        createId: () => `id-${(nextId += 1)}`,
        now: () => "2026-08-31T00:00:00.000Z",
      });
      const api = createDaemonApi(state);
      const adapter = createFakeHostAdapter();
      const terminator = createFakeAgentRuntimeTerminator();

      const runtime: InvocationRuntime = {
        getDaemonApi: () => api,
        startDaemon: async () => ({ ok: true }),
        stopDaemon: async () => ({ ok: true, stoppedAgents: [] }),
        restartDaemon: async () => ({ ok: true }),
        daemonStatus: () => ({
          running: true,
          pid: 1,
          socketPath: "/tmp/aiox/daemon.sock",
          dbPath: ":memory:",
          startedAt: "2026-08-31T00:00:00.000Z",
          version: "test-version",
        }),
        doctor: () => ({ checks: [] }),
      };

      const invoked = invokeParsedCommand(
        {
          kind: "host-new",
          name: "demo",
          agents: [
            { agentKind: "codex", name: "reviewer" },
            { agentKind: "claude", name: "implementer" },
          ],
          routes: [{ op: "add", name: "development", members: ["reviewer", "implementer"] }],
        },
        {
          runtime,
          cwd: "/repo/demo",
          createAdapterRegistry: () => {
            const registry = createAdapterRegistry();
            registry.register(adapter);
            return registry;
          },
          createAgentRuntimeTerminator: () => terminator,
          hostForegroundLoopIntervalMs: 5,
        },
      );

      const hostId = await vi.waitFor(() => {
        const hosts = api.listRunningHosts().hosts;
        expect(hosts).toHaveLength(1);
        return hosts[0]!.id;
      });

      // No agent is ready yet: the declared topology exists, but the
      // ready-subset effective edges do not until reconcile observes ready.
      expect(api.status().routes).toEqual([]);

      // The real hosted `aiox claude/codex --host-id` CLI resolves a routable
      // agent ID via `attachAgent()` before it ever reports ready (Stage 5A);
      // simulate that same sequence directly against the daemon API.
      await api.attachAgent({ hostId, kind: "codex", name: "reviewer", cwd: "/repo/demo" });
      await api.attachAgent({ hostId, kind: "claude", name: "implementer", cwd: "/repo/demo" });
      await api.markHostAgentReady({ hostId, agentName: "reviewer" });
      await api.markHostAgentReady({ hostId, agentName: "implementer" });

      await vi.waitFor(() => {
        expect(api.status().routes).toHaveLength(2);
      });

      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");
      await expect(invoked).resolves.toEqual({ exitCode: 0 });

      db.close();
    });

    it("uses the shared default full-mesh HostController contract and then handles terminate_all", async () => {
      const db = new Database(":memory:");
      applySchema(db);
      let nextId = 0;
      const state = createDaemonState({
        db,
        createId: () => `id-${(nextId += 1)}`,
        now: () => "2026-08-31T00:00:00.000Z",
      });
      const api = createDaemonApi(state);
      const adapter = createFakeHostAdapter();
      const terminator = createFakeAgentRuntimeTerminator();
      let loopArmed = false;
      const ownershipReady = vi.fn(() => {
        expect(loopArmed).toBe(true);
      });

      const runtime: InvocationRuntime = {
        getDaemonApi: () => api,
        startDaemon: async () => ({ ok: true }),
        stopDaemon: async () => ({ ok: true, stoppedAgents: [] }),
        restartDaemon: async () => ({ ok: true }),
        daemonStatus: () => ({
          running: true,
          pid: 1,
          socketPath: "/tmp/aiox/daemon.sock",
          dbPath: ":memory:",
          startedAt: "2026-08-31T00:00:00.000Z",
          version: "test-version",
        }),
        doctor: () => ({ checks: [] }),
      };

      const invoked = invokeParsedCommand(
        {
          kind: "host-new",
          name: "demo",
          agents: [
            { agentKind: "codex", name: "reviewer" },
            { agentKind: "claude", name: "implementer" },
          ],
        },
        {
          runtime,
          cwd: "/repo/demo",
          createAdapterRegistry: () => {
            const registry = createAdapterRegistry();
            registry.register(adapter);
            return registry;
          },
          createAgentRuntimeTerminator: () => terminator,
          startHostForegroundLoop: (input) => {
            loopArmed = true;
            return defaultStartHostForegroundLoop(input);
          },
          onHostControllerStarted: ownershipReady,
          hostForegroundLoopIntervalMs: 5,
        },
      );

      // Another shell relaying `terminate_all` through the existing daemon
      // control relay (Stage 5C, accepted) -- the foreground loop must claim
      // and complete this on its own, without any direct method call.
      const hostId = await vi.waitFor(() => {
        const hosts = api.listRunningHosts().hosts;
        expect(hosts).toHaveLength(1);
        return hosts[0]!.id;
      });
      expect(ownershipReady).toHaveBeenCalledOnce();
      await api.attachAgent({ hostId, kind: "codex", name: "reviewer", cwd: "/repo/demo" });
      await api.attachAgent({ hostId, kind: "claude", name: "implementer", cwd: "/repo/demo" });
      await api.markHostAgentReady({ hostId, agentName: "reviewer" });
      await api.markHostAgentReady({ hostId, agentName: "implementer" });
      await vi.waitFor(() => expect(api.status().routes).toHaveLength(2));

      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      await expect(invoked).resolves.toEqual({ exitCode: 0 });
      expect(adapter.calls).toHaveLength(2);
      expect(terminator.calls).toEqual([
        { hostId: submitted.hostId, agentName: "reviewer" },
        { hostId: submitted.hostId, agentName: "implementer" },
      ]);
      expect(api.listRunningHosts().hosts).toHaveLength(0);

      const taken = await api.takeHostControlRequestResult({ requestId: submitted.requestId });
      expect(taken).toEqual({ ok: true, status: "completed", result: { ok: true } });

      db.close();
    });
  });

  it("relays a normalized running-host mutation and returns its structured controller result", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls, {
      submitHostControlRequest(request) {
        calls.push(["submitHostControlRequest", request]);
        return { ok: true, requestId: "request-1", hostId: "host-1" };
      },
      takeHostControlRequestResult(request) {
        calls.push(["takeHostControlRequestResult", request]);
        return {
          ok: true,
          status: "completed",
          result: { ok: true, routes: [{ name: "audit" }], effectiveEdgeCount: 2 },
        };
      },
    });

    const result = await invokeParsedCommand(
      {
        kind: "host-route",
        name: "demo",
        path: "/repo/demo",
        routes: [{ op: "add", name: "audit", members: ["reviewer", "implementer"] }],
      },
      { runtime, cwd: "/repo" },
    );

    expect(result).toEqual({
      exitCode: 0,
      stdout: '{"ok":true,"routes":[{"name":"audit"}],"effectiveEdgeCount":2}\n',
    });
    expect(calls).toEqual([
      [
        "submitHostControlRequest",
        {
          name: "demo",
          path: "/repo/demo",
          kind: "host_route",
          payload: {
            routes: [{ op: "add", name: "audit", members: ["reviewer", "implementer"] }],
          },
        },
      ],
      ["takeHostControlRequestResult", { requestId: "request-1" }],
    ]);
  });

  it("keeps waiting for the existing relay result without imposing a Stage 5C timeout policy", async () => {
    const calls: unknown[] = [];
    let takeCount = 0;
    const runtime = createRuntime(calls, {
      submitHostControlRequest() {
        return { ok: true, requestId: "request-1", hostId: "host-1" };
      },
      takeHostControlRequestResult() {
        takeCount += 1;
        return takeCount < 3
          ? { ok: true as const, status: "pending" as const }
          : { ok: true as const, status: "completed" as const, result: { ok: true } };
      },
    });
    const poll = vi.fn(async () => {
      vi.setSystemTime(new Date("2026-08-31T00:01:00.000Z"));
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));

    try {
      const result = await invokeParsedCommand(
        {
          kind: "host-remove",
          name: "demo",
          agentNames: ["reviewer"],
        },
        { runtime, cwd: "/repo", pollHostControlResult: poll },
      );

      expect(result).toEqual({ exitCode: 0, stdout: '{"ok":true}\n' });
      expect(takeCount).toBe(3);
      expect(poll).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

});

describe("CLI invocation — Codex TUI failure cleanup against real daemon state", () => {
  // The tests above only assert which mock API method got called. A mock
  // recording `detachAgent` proves the call happened, not that it actually
  // removed anything — this test goes through the real `createDaemonState`/
  // `createDaemonApi` production path (same as
  // tests/unit/daemon/list-reachable-peers-store.test.ts) so the assertion is
  // an actual SQLite row and an actual runtime.dispose() call, not a call log.
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("physically removes the agent row and disposes the unbound runtime when the TUI wait fails", async () => {
    let nextId = 0;
    let disposeCalls = 0;
    const codexRuntime: ManagedCodexAgentRuntime = {
      state: "ready",
      endpoint: new URL("ws://127.0.0.1:54321/"),
      activeThreadId: null,
      dispose: async () => {
        disposeCalls += 1;
      },
      // App-server initialization makes the runtime ready before the fresh TUI
      // creates a thread. `rollbackAgentAttach()` still no-ops in this state.
      startThread: async () => null,
      resumeThread: async () => null,
      listLoadedThreadIds: async () => [],
      rebindActiveThread: () => undefined,
    };
    const state = createDaemonState({
      db,
      createId: () => `id-${(nextId += 1)}`,
      now: () => "2026-08-20T00:00:00.000Z",
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => codexRuntime,
    });
    const api = createDaemonApi(state);
    const child = fakeChild();
    const runtime: InvocationRuntime = {
      getDaemonApi: () => api,
      startDaemon: async () => ({ ok: true }),
      stopDaemon: async () => ({ ok: true, stoppedAgents: [] }),
      restartDaemon: async () => ({ ok: true }),
      daemonStatus: () => ({
        running: true,
        pid: 1,
        socketPath: "/tmp/aiox-real-state.sock",
        dbPath: ":memory:",
        startedAt: "2026-08-20T00:00:00.000Z",
        version: "test-version",
      }),
      doctor: () => ({ checks: [] }),
    };

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl" },
      {
        runtime,
        cwd: "/repo",
        launchCodexTui: () => {
          setTimeout(() => child.emit("error", new Error("spawn codex ENOENT")), 0);
          return child;
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({
      code: "aiox.invocation.tui_launch_failed",
    });

    // Physical delete (W2 physical-departure model), not a status flip.
    const agentRow = db.prepare("select id from agents where name = 'impl'").get();
    expect(agentRow).toBeUndefined();
    // The ready-but-unbound runtime was actually disposed —
    // `rollbackAgentAttach()` would have left this at 0.
    expect(disposeCalls).toBe(1);
  });

  it("removes both routable and host-agent state when a hosted Codex vendor spawn fails", async () => {
    let nextId = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${(nextId += 1)}`,
      now: () => "2026-08-31T00:00:00.000Z",
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => ({
        state: "ready",
        endpoint: new URL("ws://127.0.0.1:54321/"),
        activeThreadId: null,
        dispose: async () => {},
        startThread: async () => "thread-1",
        resumeThread: async () => null,
        listLoadedThreadIds: async () => [],
        rebindActiveThread: () => undefined,
      }),
    });
    const api = createDaemonApi(state);
    const registered = await api.registerRunningHost({
      name: "demo",
      path: "/repo/demo",
      controllerId: "controller-1",
      agents: [{ name: "impl", kind: "codex" }],
    });
    if (!registered.ok) throw new Error("expected host registration");
    const child = fakeChild();
    const runtime = createInvocationRuntimeForApi(api);

    const invoked = invokeParsedCommand(
      {
        kind: "agent-attach",
        agentKind: "codex",
        name: "impl",
        hostId: registered.host.id,
      },
      {
        runtime,
        cwd: "/repo/demo",
        launchCodexTui: () => {
          setTimeout(() => child.emit("error", new Error("spawn codex ENOENT")), 0);
          return child;
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({ code: "aiox.invocation.tui_launch_failed" });
    expect(api.listHostAgents({ hostId: registered.host.id }).agents).toEqual([]);
    expect(db.prepare("select id from agents where host_id = ?").all(registered.host.id)).toEqual([]);
    expect(api.listRunningHosts().hosts).toHaveLength(1);
  });

  it("keeps the running host and same-named peers in other scopes when hosted Codex exits naturally", async () => {
    let nextId = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${(nextId += 1)}`,
      now: () => "2026-08-31T00:00:00.000Z",
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => createManagedCodexRuntime(),
    });
    const api = createDaemonApi(state);
    const hostA = await api.registerRunningHost({
      name: "host-a",
      path: "/repo/a",
      controllerId: "controller-a",
      agents: [{ name: "reviewer", kind: "codex" }],
    });
    const hostB = await api.registerRunningHost({
      name: "host-b",
      path: "/repo/b",
      controllerId: "controller-b",
      agents: [{ name: "reviewer", kind: "codex" }],
    });
    if (!hostA.ok || !hostB.ok) throw new Error("expected host registration");
    await api.attachAgent({
      kind: "codex",
      name: "reviewer",
      cwd: "/repo/b",
      hostId: hostB.host.id,
    });
    await api.attachAgent({ kind: "codex", name: "reviewer", cwd: "/repo/standalone" });
    const child = fakeChild();

    const invoked = invokeParsedCommand(
      {
        kind: "agent-attach",
        agentKind: "codex",
        name: "reviewer",
        hostId: hostA.host.id,
      },
      {
        runtime: createInvocationRuntimeForApi(api),
        cwd: "/repo/a",
        launchCodexTui: () => {
          setTimeout(() => {
            child.emit("spawn");
            child.emit("exit", 0, null);
          }, 0);
          return child;
        },
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    expect(api.listHostAgents({ hostId: hostA.host.id }).agents).toEqual([]);
    expect(api.listHostAgents({ hostId: hostB.host.id }).agents).toHaveLength(1);
    expect(api.listRunningHosts().hosts).toHaveLength(2);
    expect(
      db.prepare("select host_id from agents where name = ? order by host_id").all("reviewer"),
    ).toEqual([{ host_id: "" }, { host_id: hostB.host.id }]);
  });

  it("hosted Codex: the termination-intent watch loop signals the live child once a new intent is observed after spawn (Blocker 4)", async () => {
    let nextId = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${(nextId += 1)}`,
      now: () => "2026-08-31T00:00:00.000Z",
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => createManagedCodexRuntime(),
    });
    const api = createDaemonApi(state);
    const registered = await api.registerRunningHost({
      name: "demo",
      path: "/repo/demo",
      controllerId: "controller-1",
      agents: [{ name: "impl", kind: "codex" }],
    });
    if (!registered.ok) throw new Error("expected host registration");

    const child = fakeChild();
    const killCalls: Array<NodeJS.Signals | undefined> = [];
    child.kill = ((signal?: NodeJS.Signals) => {
      killCalls.push(signal);
      // Models the real vendor process actually reacting to the signal --
      // the watch loop's own `child.kill()` never simulates exit itself.
      child.emit("exit", 0, signal ?? null);
      return true;
    }) as ChildProcess["kill"];

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl", hostId: registered.host.id },
      {
        runtime: createInvocationRuntimeForApi(api),
        cwd: "/repo/demo",
        hostedTerminationWatchIntervalMs: 2,
        launchCodexTui: () => {
          setTimeout(() => child.emit("spawn"), 0);
          return child;
        },
      },
    );

    await vi.waitFor(() => {
      expect(
        api.listHostAgents({ hostId: registered.host.id }).agents.find((a) => a.name === "impl")
          ?.status,
      ).toBe("ready");
    });

    // The production `AgentRuntimeTerminator` (Blocker 4) records this same
    // intent through the existing daemon API; this hosted CLI never sees a
    // raw PID at all, only the row it polls.
    await api.requestHostAgentTermination({
      hostId: registered.host.id,
      agentName: "impl",
      signal: "SIGINT",
    });

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    expect(killCalls).toEqual(["SIGINT"]);
    // Detached through the normal natural-exit path once the watch loop's
    // `child.kill()` actually ended the process -- no separate confirmation
    // channel was invented.
    expect(api.listHostAgents({ hostId: registered.host.id }).agents).toEqual([]);
  });

  it("hosted Codex: acknowledges only a truthful child.kill delivery and retries false/throw without consuming the intent", async () => {
    let nextId = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${(nextId += 1)}`,
      now: () => "2026-08-31T00:00:00.000Z",
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => createManagedCodexRuntime(),
    });
    const api = createDaemonApi(state);
    const registered = await api.registerRunningHost({
      name: "demo",
      path: "/repo/demo",
      controllerId: "controller-1",
      agents: [{ name: "impl", kind: "codex" }],
    });
    if (!registered.ok) throw new Error("expected host registration");

    const child = fakeChild();
    const killCalls: NodeJS.Signals[] = [];
    child.kill = ((signal?: NodeJS.Signals) => {
      killCalls.push(signal!);
      if (killCalls.length === 1) return false;
      if (killCalls.length === 2) throw new Error("synthetic child.kill failure");
      queueMicrotask(() => child.emit("exit", 0, signal ?? null));
      return true;
    }) as ChildProcess["kill"];

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl", hostId: registered.host.id },
      {
        runtime: createInvocationRuntimeForApi(api),
        cwd: "/repo/demo",
        hostedTerminationWatchIntervalMs: 1,
        launchCodexTui: () => {
          setTimeout(() => child.emit("spawn"), 0);
          return child;
        },
      },
    );
    await vi.waitFor(() => {
      expect(api.listHostAgents({ hostId: registered.host.id }).agents[0]?.status).toBe("ready");
    });
    const intent = await api.requestHostAgentTermination({
      hostId: registered.host.id,
      agentName: "impl",
      signal: "SIGINT",
    });
    if (!intent.ok) throw new Error("expected termination intent");

    await vi.waitFor(() => expect(killCalls).toHaveLength(3));
    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    expect(killCalls).toEqual(["SIGINT", "SIGINT", "SIGINT"]);
  });

  it.each([
    { kind: "codex" as const, expected: ["SIGINT", "SIGKILL"] as NodeJS.Signals[] },
    {
      kind: "claude" as const,
      expected: ["SIGINT", "SIGINT", "SIGKILL"] as NodeJS.Signals[],
    },
  ])(
    "hosted $kind: terminator timers follow wrapper acknowledgements and preserve actual child delivery order",
    async ({ kind, expected }) => {
      let nextId = 0;
      const state = createDaemonState({
        db,
        createId: () => `id-${(nextId += 1)}`,
        now: () => "2026-08-31T00:00:00.000Z",
        codexRuntimes: new Map(),
        attachCodexRuntime: async () => createManagedCodexRuntime(),
      });
      const api = createDaemonApi(state);
      const registered = await api.registerRunningHost({
        name: "demo",
        path: "/repo/demo",
        controllerId: "controller-1",
        agents: [{ name: "impl", kind }],
      });
      if (!registered.ok) throw new Error("expected host registration");

      const child = fakeChild();
      const killCalls: NodeJS.Signals[] = [];
      child.kill = ((signal?: NodeJS.Signals) => {
        killCalls.push(signal!);
        if (signal === "SIGKILL") {
          queueMicrotask(() => child.emit("exit", 0, signal));
        }
        return true;
      }) as ChildProcess["kill"];

      const invoked = invokeParsedCommand(
        { kind: "agent-attach", agentKind: kind, name: "impl", hostId: registered.host.id },
        {
          runtime: createInvocationRuntimeForApi(api),
          cwd: "/repo/demo",
          hostedTerminationWatchIntervalMs: 1,
          checkClaudeMcpRegistration: async () => ({ registered: true }),
          launchCodexTui: () => {
            setTimeout(() => child.emit("spawn"), 0);
            return child;
          },
          launchClaudeStaticMcpChannel: () => {
            setTimeout(() => child.emit("spawn"), 0);
            return child;
          },
        },
      );
      await vi.waitFor(() => {
        expect(api.listHostAgents({ hostId: registered.host.id }).agents[0]?.status).toBe("ready");
      });

      const terminator = createProductionAgentRuntimeTerminator({
        api,
        pollIntervalMs: 1,
        signalDeliveryConfirmMs: 50,
        doublePressWindowMs: 5,
        hookGraceMs: 5,
        forceKillConfirmMs: 50,
      });
      await expect(
        terminator.terminate({ hostId: registered.host.id, agentName: "impl" }),
      ).resolves.toEqual({ ok: true });
      await expect(invoked).resolves.toEqual({ exitCode: 0 });
      expect(killCalls).toEqual(expected);
    },
  );

  it("hosted Codex: never signals the child before it has actually spawned, even if a termination intent is already pending (Blocker 4)", async () => {
    let nextId = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${(nextId += 1)}`,
      now: () => "2026-08-31T00:00:00.000Z",
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => createManagedCodexRuntime(),
    });
    const api = createDaemonApi(state);
    const registered = await api.registerRunningHost({
      name: "demo",
      path: "/repo/demo",
      controllerId: "controller-1",
      agents: [{ name: "impl", kind: "codex" }],
    });
    if (!registered.ok) throw new Error("expected host registration");

    // Recorded BEFORE the surface/CLI even starts (the row already exists in
    // `starting` from `registerRunningHost`) -- a starting agent has no live
    // handle to signal yet.
    await api.requestHostAgentTermination({
      hostId: registered.host.id,
      agentName: "impl",
      signal: "SIGINT",
    });

    const child = fakeChild();
    const killCalls: Array<NodeJS.Signals | undefined> = [];
    child.kill = ((signal?: NodeJS.Signals) => {
      killCalls.push(signal);
      child.emit("exit", 0, signal ?? null);
      return true;
    }) as ChildProcess["kill"];
    let spawnCalled = false;

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "codex", name: "impl", hostId: registered.host.id },
      {
        runtime: createInvocationRuntimeForApi(api),
        cwd: "/repo/demo",
        hostedTerminationWatchIntervalMs: 2,
        launchCodexTui: () => {
          setTimeout(() => {
            spawnCalled = true;
            child.emit("spawn");
          }, 20);
          return child;
        },
      },
    );

    // A poll tick or two happen before spawn -- the pre-existing pending
    // intent must not be applied to a child that has not spawned yet.
    await new Promise((resolve) => setTimeout(resolve, 8));
    expect(spawnCalled).toBe(false);
    expect(killCalls).toEqual([]);

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    // Applied exactly once, only after spawn.
    expect(killCalls).toEqual(["SIGINT"]);
  });

  it("keeps the running host and same-named peers in other scopes when hosted Claude exits naturally", async () => {
    let nextId = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${(nextId += 1)}`,
      now: () => "2026-08-31T00:00:00.000Z",
    });
    const api = createDaemonApi(state);
    const hostA = await api.registerRunningHost({
      name: "host-a",
      path: "/repo/a",
      controllerId: "controller-a",
      agents: [{ name: "reviewer", kind: "claude" }],
    });
    const hostB = await api.registerRunningHost({
      name: "host-b",
      path: "/repo/b",
      controllerId: "controller-b",
      agents: [{ name: "reviewer", kind: "claude" }],
    });
    if (!hostA.ok || !hostB.ok) throw new Error("expected host registration");
    await api.attachAgent({
      kind: "claude",
      name: "reviewer",
      cwd: "/repo/b",
      hostId: hostB.host.id,
    });
    await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo/standalone" });
    const child = fakeChild();

    const invoked = invokeParsedCommand(
      {
        kind: "agent-attach",
        agentKind: "claude",
        name: "reviewer",
        hostId: hostA.host.id,
      },
      {
        runtime: createInvocationRuntimeForApi(api),
        cwd: "/repo/a",
        checkClaudeMcpRegistration: async () => ({ registered: true }),
        launchClaudeStaticMcpChannel: () => {
          setTimeout(() => {
            child.emit("spawn");
            child.emit("exit", 0, null);
          }, 0);
          return child;
        },
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    expect(api.listHostAgents({ hostId: hostA.host.id }).agents).toEqual([]);
    expect(api.listHostAgents({ hostId: hostB.host.id }).agents).toHaveLength(1);
    expect(api.listRunningHosts().hosts).toHaveLength(2);
    expect(
      db.prepare("select host_id from agents where name = ? order by host_id").all("reviewer"),
    ).toEqual([{ host_id: "" }, { host_id: hostB.host.id }]);
  });
});

function createInvocationRuntimeForApi(api: DaemonApi): InvocationRuntime {
  return {
    getDaemonApi: () => api,
    startDaemon: async () => ({ ok: true }),
    stopDaemon: async () => ({ ok: true, stoppedAgents: [] }),
    restartDaemon: async () => ({ ok: true }),
    daemonStatus: () => ({
      running: true,
      pid: 1,
      socketPath: "/tmp/aiox-real-state.sock",
      dbPath: ":memory:",
      startedAt: "2026-08-31T00:00:00.000Z",
      version: "test-version",
    }),
    daemonSocketPath: () => "/tmp/aiox-real-state.sock",
    doctor: () => ({ checks: [] }),
  };
}

function createManagedCodexRuntime(): ManagedCodexAgentRuntime {
  return {
    state: "ready",
    endpoint: new URL("ws://127.0.0.1:54321/"),
    activeThreadId: null,
    dispose: async () => {},
    startThread: async () => "thread-1",
    resumeThread: async () => null,
    listLoadedThreadIds: async () => [],
    rebindActiveThread: () => undefined,
  };
}

function claudeAttachOverride() {
  return {
    attachAgent: async () => ({
      ok: true as const,
      agent: { ...fakeAgentDto(), name: "reviewer", kind: "claude" as const },
      claudeChannelToken: "claude-token-1",
    }),
  };
}

function createRuntime(
  calls: unknown[],
  overrides: Partial<DaemonApi & InvocationRuntime> = {},
): InvocationRuntime {
  const api = {
    attachAgent(request: unknown) {
      calls.push(["attachAgent", request]);
      return { ok: true, agent: {} };
    },
    createPair(request: unknown) {
      calls.push(["createPair", request]);
      return { ok: true, pair: {} };
    },
    connect(request: unknown) {
      calls.push(["connect", request]);
      return { ok: true, created: [], alreadyExisted: [] };
    },
    sendMessage(request: unknown) {
      calls.push(["sendMessage", request]);
      return { ok: true, message: {}, deliveries: [] };
    },
    status() {
      calls.push(["status"]);
      return {
        daemon: { startedAt: "2026-05-19T00:00:00.000Z" },
        agents: [],
        pairs: [],
        routes: [],
        messageCount: 0,
        deliveryCounts: {
          queued: 0,
          delivering: 0,
          delivered: 0,
          completed: 0,
          failed: 0,
        },
      };
    },
    stop(request: unknown) {
      calls.push(["apiStop", request]);
      return { ok: true, stoppedAgents: [] };
    },
    detachAgent(request: unknown) {
      calls.push(["detachAgent", request]);
      return { ok: true, agentName: "impl", detached: true };
    },
    notifyTuiExited(request: unknown) {
      calls.push(["notifyTuiExited", request]);
      return { ok: true, agentName: "impl", detached: true };
    },
    disconnectClaudeChannel(request: unknown) {
      calls.push(["disconnectClaudeChannel", request]);
      return { ok: true, agentName: "reviewer", disconnected: true };
    },
    ...overrides,
  } as unknown as DaemonApi;

  return {
    getDaemonApi() {
      return api;
    },
    startDaemon() {
      calls.push(["startDaemon"]);
      return { ok: true };
    },
    stopDaemon(request) {
      calls.push(["stopDaemon", request]);
      return { ok: true, stoppedAgents: [] };
    },
    restartDaemon() {
      calls.push(["restartDaemon"]);
      return { ok: true };
    },
    daemonStatus() {
      calls.push(["daemonStatus"]);
      return {
        running: true,
        pid: 1234,
        socketPath: "/tmp/aiox/daemon.sock",
        dbPath: ":memory:",
        startedAt: "2026-05-19T00:00:00.000Z",
        version: "test-version",
      };
    },
    doctor() {
      calls.push(["doctor"]);
      return { checks: [{ name: "node", status: "ok", detail: "v22.4.0" }] };
    },
    daemonSocketPath() {
      return "/tmp/aiox/daemon.sock";
    },
    ...overrides,
  };
}

function fakeChild(pid = 4242): ChildProcess {
  return Object.assign(new EventEmitter(), { pid }) as ChildProcess;
}

function fakeAgentDto() {
  return {
    id: "agent-1",
    name: "impl",
    kind: "codex" as const,
    status: "connected" as const,
    cwd: "/repo",
    pairId: null,
  };
}

function fakeHostAgentDto(hostId: string, name: string, kind: "claude" | "codex") {
  return {
    id: `host-agent-${name}`,
    hostId,
    name,
    kind,
    status: "ready" as const,
    role: null,
    description: null,
    instructions: null,
    pendingSignal: null,
    pendingSignalSeq: 0,
    deliveredSignalSeq: 0,
  };
}
