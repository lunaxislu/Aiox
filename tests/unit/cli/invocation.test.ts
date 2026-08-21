import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

  it("launches Codex TUI after daemon attach and notifies daemon once on TUI exit", async () => {
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
      // No explicit --resume, but the daemon now eager-creates a thread on every
      // no-resume attach (W6): the TUI must resume that same thread rather than
      // opening a fresh one, or the daemon's tracked threadId and the TUI's actual
      // thread would diverge.
      [
        "launchCodexTui",
        { endpoint: new URL("ws://127.0.0.1:54321/"), resumeSessionId: "thread-1" },
      ],
      ["notifyTuiExited", { agentName: "impl", exitCode: 7, signal: null }],
    ]);
  });

  it("still resumes the explicitly requested session id when one was given, ignoring the eager-started thread", async () => {
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

  it("detaches (not rolls back) the Codex agent when TUI wait rejects, since W6 eager-start already left the runtime ready", async () => {
    // `rollbackAgentAttach()` no-ops (`rolledBack:false`) once the daemon's W6
    // eager `thread/start` has left the runtime `ready` — the earlier
    // `rollbackAgentAttach` call here was a silent leak. `detachAgent()`
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

  it("starts the daemon then delegates `host` to runHostFn with the daemon api, cwd, socket path, config, and view driver", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls);
    const launchAgentView = async () => ({
      close: async () => {},
      onLost: () => {},
    });
    const fakeConfig = { project: "demo", agents: [] } as unknown as AioxConfig;
    const runHostFn = async (hostOptions: unknown) => {
      calls.push(["runHostFn", hostOptions]);
      return { exitCode: 0 };
    };

    const invoked = invokeParsedCommand(
      { kind: "host" },
      {
        runtime,
        cwd: "/repo",
        runHostFn,
        launchAgentView,
        loadAioxConfig: () => fakeConfig,
        validateAioxConfigSemantics: () => {},
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    expect(calls).toEqual([
      ["startDaemon"],
      [
        "runHostFn",
        expect.objectContaining({
          cwd: "/repo",
          daemonSocketPath: "/tmp/aiox/daemon.sock",
          launchAgentView,
          config: fakeConfig,
        }),
      ],
    ]);
  });

  it("surfaces runHostFn's exit code as its own without wrapping it in an error", async () => {
    const runtime = createRuntime([]);

    const invoked = invokeParsedCommand(
      { kind: "host" },
      {
        runtime,
        cwd: "/repo",
        runHostFn: async () => ({ exitCode: 1 }),
        launchAgentView: async () => ({ close: async () => {}, onLost: () => {} }),
        loadAioxConfig: () => ({ project: "demo", agents: [] }) as unknown as AioxConfig,
        validateAioxConfigSemantics: () => {},
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 1 });
  });

  it("fails fast on `host` when the runtime cannot report a daemon socket path", async () => {
    const runtime = createRuntime([], { daemonSocketPath: undefined });

    const invoked = invokeParsedCommand(
      { kind: "host" },
      {
        runtime,
        cwd: "/repo",
        runHostFn: async () => ({ exitCode: 0 }),
        launchAgentView: async () => ({ close: async () => {}, onLost: () => {} }),
        loadAioxConfig: () => ({ project: "demo", agents: [] }) as unknown as AioxConfig,
        validateAioxConfigSemantics: () => {},
      },
    );

    await expect(invoked).rejects.toMatchObject({
      name: "InvocationError",
      code: "aiox.invocation.missing_daemon_socket_path",
      exitCode: 1,
    });
  });

  it("validates the config before starting the daemon, so an invalid config never starts it", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls);

    const invoked = invokeParsedCommand(
      { kind: "host" },
      {
        runtime,
        cwd: "/repo",
        runHostFn: async () => ({ exitCode: 0 }),
        launchAgentView: async () => ({ close: async () => {}, onLost: () => {} }),
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
    // The prerequisite failed, so no daemon side effect must have happened.
    expect(calls).toEqual([]);
  });

  it("refuses `host` before any daemon side effect when no terminal view driver is available", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls);
    const runHostFn = async () => {
      calls.push(["runHostFn"]);
      return { exitCode: 0 };
    };

    const invoked = invokeParsedCommand(
      { kind: "host" },
      {
        runtime,
        cwd: "/repo",
        runHostFn,
        // Config is valid so this test isolates the view-driver gate — the
        // "invalid config" case is covered separately below and must win
        // over this one when both are absent.
        loadAioxConfig: () => ({ project: "demo", agents: [] }) as unknown as AioxConfig,
        validateAioxConfigSemantics: () => {},
      },
    );

    await expect(invoked).rejects.toMatchObject({
      name: "InvocationError",
      code: "aiox.invocation.no_agent_view_driver",
      exitCode: 1,
    });
    // No daemon was started and runHost was never entered: N interactive TUIs
    // must not fall back to one shared stdio or to headless sessions.
    expect(calls).toEqual([]);
  });

  it("fails on an invalid config before checking for a view driver, even when neither is available", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls);

    const invoked = invokeParsedCommand(
      { kind: "host" },
      {
        runtime,
        cwd: "/repo",
        // No launchAgentView either — if view-driver resolution ran first,
        // this would fail with no_agent_view_driver instead.
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

  it("observes a SIGINT that arrives while startDaemon() is pending, never calls getDaemonApi() afterward, and still unregisters exactly once", async () => {
    const calls: unknown[] = [];
    let resolveStartDaemon: (() => void) | undefined;
    const startDaemonGate = new Promise<void>((resolve) => {
      resolveStartDaemon = resolve;
    });
    const runtime = createRuntime(calls, {
      startDaemon: async () => {
        calls.push(["startDaemon"]);
        await startDaemonGate;
        return { ok: true };
      },
      getDaemonApi: async () => {
        calls.push(["getDaemonApi"]);
        throw new Error("getDaemonApi must not be called after a pending signal");
      },
    });
    let signalHandler: ((signal: NodeJS.Signals) => void) | undefined;
    let unregisterCalls = 0;

    const invoked = invokeParsedCommand(
      { kind: "host" },
      {
        runtime,
        cwd: "/repo",
        loadAioxConfig: () => ({ project: "demo", agents: [] }) as unknown as AioxConfig,
        validateAioxConfigSemantics: () => {},
        launchAgentView: async () => ({ close: async () => {}, onLost: () => {} }),
        runHostFn: async () => {
          calls.push(["runHostFn"]);
          return { exitCode: 0 };
        },
        registerSignalHandlers: (onSignal) => {
          signalHandler = onSignal;
          return () => {
            unregisterCalls += 1;
          };
        },
      },
    );

    // Let startDaemon() actually start (reach its own await) before firing.
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toEqual([["startDaemon"]]);
    expect(unregisterCalls).toBe(0);

    signalHandler?.("SIGINT");
    resolveStartDaemon?.();

    const result = await invoked;

    expect(result.exitCode).toBe(0);
    // getDaemonApi/attach/view-launch/connect never started.
    expect(calls).toEqual([["startDaemon"]]);
    expect(unregisterCalls).toBe(1);
  });

  it("observes a SIGINT that arrives while getDaemonApi() is pending and never enters runHostFn afterward", async () => {
    const calls: unknown[] = [];
    let resolveGetApi: (() => void) | undefined;
    const getApiGate = new Promise<void>((resolve) => {
      resolveGetApi = resolve;
    });
    const runtime = createRuntime(calls, {
      getDaemonApi: async () => {
        calls.push(["getDaemonApi"]);
        await getApiGate;
        return {} as DaemonApi;
      },
    });
    let signalHandler: ((signal: NodeJS.Signals) => void) | undefined;
    let unregisterCalls = 0;
    let runHostFnCalls = 0;

    const invoked = invokeParsedCommand(
      { kind: "host" },
      {
        runtime,
        cwd: "/repo",
        loadAioxConfig: () => ({ project: "demo", agents: [] }) as unknown as AioxConfig,
        validateAioxConfigSemantics: () => {},
        launchAgentView: async () => ({ close: async () => {}, onLost: () => {} }),
        runHostFn: async () => {
          runHostFnCalls += 1;
          return { exitCode: 0 };
        },
        registerSignalHandlers: (onSignal) => {
          signalHandler = onSignal;
          return () => {
            unregisterCalls += 1;
          };
        },
      },
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toEqual([["startDaemon"], ["getDaemonApi"]]);

    signalHandler?.("SIGINT");
    resolveGetApi?.();

    const result = await invoked;

    expect(result.exitCode).toBe(0);
    expect(runHostFnCalls).toBe(0);
    expect(unregisterCalls).toBe(1);
  });

  it("keeps the signal handler registered until runHostFn's own cleanup has actually finished", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls);
    let resolveRunHost: ((value: { exitCode: number }) => void) | undefined;
    const runHostGate = new Promise<{ exitCode: number }>((resolve) => {
      resolveRunHost = resolve;
    });
    let signalHandler: ((signal: NodeJS.Signals) => void) | undefined;
    let unregisterCalls = 0;

    const invoked = invokeParsedCommand(
      { kind: "host" },
      {
        runtime,
        cwd: "/repo",
        loadAioxConfig: () => ({ project: "demo", agents: [] }) as unknown as AioxConfig,
        validateAioxConfigSemantics: () => {},
        launchAgentView: async () => ({ close: async () => {}, onLost: () => {} }),
        runHostFn: async () => runHostGate,
        registerSignalHandlers: (onSignal) => {
          signalHandler = onSignal;
          return () => {
            unregisterCalls += 1;
          };
        },
      },
    );

    await Promise.resolve();
    await Promise.resolve();
    signalHandler?.("SIGINT");
    // Repeated and cross signals while runHostFn's own cleanup is still in
    // flight must not fall through to Node's default exit behavior, and
    // must not unregister or resolve early.
    signalHandler?.("SIGINT");
    signalHandler?.("SIGTERM");

    await Promise.resolve();
    await Promise.resolve();
    expect(unregisterCalls).toBe(0);

    resolveRunHost?.({ exitCode: 1 });
    const result = await invoked;

    expect(result.exitCode).toBe(1);
    // Registered/unregistered exactly once, no matter how many signals
    // arrived in between.
    expect(unregisterCalls).toBe(1);
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

  it("physically removes the agent row and disposes the runtime when the TUI wait fails after W6's eager thread/start left it ready", async () => {
    let nextId = 0;
    let disposeCalls = 0;
    const codexRuntime: ManagedCodexAgentRuntime = {
      state: "ready",
      endpoint: new URL("ws://127.0.0.1:54321/"),
      activeThreadId: null,
      dispose: async () => {
        disposeCalls += 1;
      },
      // Models W6's eager `thread/start` on attach: the runtime is already
      // `ready` with an active thread by the time the TUI spawn/wait fails,
      // which is exactly the state `rollbackAgentAttach()` no-ops on.
      startThread: async () => "thread-1",
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
    // The runtime W6's eager thread/start left `ready` was actually disposed
    // — `rollbackAgentAttach()` would have left this at 0.
    expect(disposeCalls).toBe(1);
  });
});

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

function fakeChild(): ChildProcess {
  return new EventEmitter() as ChildProcess;
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
