import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  InvocationError,
  invokeParsedCommand,
  type InvocationRuntime,
} from "../../../src/cli/invocation.js";
import type { DaemonApi } from "../../../src/daemon/api.js";

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
      { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
      {
        runtime,
        cwd: "/repo",
        // the Local static MCP gate runs before startDaemon/attachAgent; this
        // smoke test isn't exercising that gate.
        checkClaudeMcpLocalRegistration: async () => ({ registeredAtLocalScope: true }),
      },
    );
    await invokeParsedCommand(
      { kind: "connect", sourceName: "impl", targetNames: ["reviewer", "researcher"] },
      { runtime, cwd: "/repo" },
    );
    await invokeParsedCommand(
      { kind: "disconnect", sourceName: "impl", targetNames: ["reviewer"] },
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
      ["attachAgent", { kind: "claude", name: "reviewer", cwd: "/repo", pairName: "pair-a" }],
      ["connect", { sourceName: "impl", targetNames: ["reviewer", "researcher"] }],
      ["disconnect", { sourceName: "impl", targetNames: ["reviewer"] }],
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
      ["launchCodexTui", { endpoint: new URL("ws://127.0.0.1:54321/") }],
      ["notifyTuiExited", { agentName: "impl", exitCode: 7, signal: null }],
    ]);
  });

  it("rolls back Codex attach when TUI spawn emits an error", async () => {
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
    });
    expect(calls).toEqual([
      ["startDaemon"],
      ["attachAgent", { kind: "codex", name: "impl", cwd: "/repo" }],
      ["rollbackAgentAttach", { agentName: "impl" }],
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
        checkClaudeMcpLocalRegistration: async (checkOptions) => {
          calls.push(["checkClaudeMcpLocalRegistration", checkOptions]);
          return { registeredAtLocalScope: true };
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
      ["checkClaudeMcpLocalRegistration", { name: "aiox-claude-ingress", cwd: "/repo" }],
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

  it("fails fast with the required error before any daemon/attach/token side effect when the Local MCP is not registered", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls, claudeAttachOverride());

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpLocalRegistration: async () => ({ registeredAtLocalScope: false }),
      },
    );

    await expect(invoked).rejects.toMatchObject({
      name: "InvocationError",
      code: "aiox.invocation.claude_mcp_not_registered",
      exitCode: 1,
      message:
        "Claude AIOX MCP가 Local scope에 등록되어 있지 않습니다.\n먼저 aiox claude setup 을 실행하세요.",
    });
    expect(calls).toEqual([]);
  });

  it("wraps a thrown Local MCP registration check failure into a coded error before any side effect", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime(calls, claudeAttachOverride());

    const invoked = invokeParsedCommand(
      { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
      {
        runtime,
        cwd: "/repo",
        checkClaudeMcpLocalRegistration: async () => {
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

  it("claude setup registers the Local static MCP and returns a summary", async () => {
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
    disconnect(request: unknown) {
      calls.push(["disconnect", request]);
      return { ok: true, removed: [] };
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
    rollbackAgentAttach(request: unknown) {
      calls.push(["rollbackAgentAttach", request]);
      return { ok: true, agentName: "impl", rolledBack: true };
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
