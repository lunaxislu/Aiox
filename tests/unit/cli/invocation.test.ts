import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  claudePreflightFailureMessage,
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
      { runtime, cwd: "/repo" },
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

  it("launches the legacy inline (A) path with channel env and disconnects on exit when AIOX_CLAUDE_CHANNEL_STRATEGY=inline", async () => {
    await withChannelStrategy("inline", async () => {
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
        // inline path must NOT touch the plugin inventory/preflight at all.
        loadClaudePluginInventory: async (options) => {
          calls.push(["loadClaudePluginInventory", options]);
          return passingInventory();
        },
        launchClaudeWithChannel: (options) => {
          calls.push(["launchClaudeWithChannel", options]);
          setTimeout(() => child.emit("exit", 0, null), 0);
          return child;
        },
      },
    );

    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    // The preflight gate is D-only: the inline path must not load inventory.
    expect(calls.some((c) => Array.isArray(c) && c[0] === "loadClaudePluginInventory")).toBe(
      false,
    );
    expect(calls).toEqual([
      ["startDaemon"],
      ["attachAgent", { kind: "claude", name: "reviewer", cwd: "/repo", pairName: "pair-a" }],
      [
        "launchClaudeWithChannel",
        {
          // dev-channel server:<name> resolves the MCP that the launcher injects
          // one-off via --mcp-config; per-agent identity rides in that config's env.
          channelName: "aiox-claude-ingress",
          agentName: "reviewer",
          agentToken: "claude-token-1",
          daemonSocketPath: "/tmp/aiox/daemon.sock",
        },
      ],
      ["disconnectClaudeChannel", { agentName: "reviewer" }],
    ]);
    });
  });

  it("routes to the plugin launcher (D) by default when AIOX_CLAUDE_CHANNEL_STRATEGY is unset and preflight passes", async () => {
    await withChannelStrategy(undefined, async () => {
      const calls: unknown[] = [];
      const child = fakeChild();
      const runtime = createRuntime(calls, claudeAttachOverride());

      const invoked = invokeParsedCommand(
        { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
        {
          runtime,
          cwd: "/repo",
          loadClaudePluginInventory: async (options) => {
            calls.push(["loadClaudePluginInventory", options]);
            return passingInventory();
          },
          fileExists: () => true,
          launchClaudeWithChannel: () => {
            calls.push(["launchClaudeWithChannel"]);
            return child;
          },
          launchClaudePluginChannel: (options) => {
            calls.push(["launchClaudePluginChannel", options]);
            setTimeout(() => child.emit("exit", 0, null), 0);
            return child;
          },
        },
      );

      await expect(invoked).resolves.toEqual({ exitCode: 0 });
      // cwd contract (history/52): the inventory MUST be loaded from the user's cwd.
      expect(calls).toContainEqual(["loadClaudePluginInventory", { cwd: "/repo" }]);
      expect(calls).toContainEqual([
        "launchClaudePluginChannel",
        {
          pluginName: "aiox-channel-ingress",
          marketplaceName: "aiox",
          agentName: "reviewer",
          agentToken: "claude-token-1",
          daemonSocketPath: "/tmp/aiox/daemon.sock",
          // launcher spawn cwd must equal the cwd preflight read inventory from
          // (Finding 1) — so plugin scope resolves the same at activation.
          cwd: "/repo",
        },
      ]);
      expect(calls).not.toContainEqual(["launchClaudeWithChannel"]);
    });
  });

  it("fails with a coded error and rolls back when the strategy-D preflight rejects the plugin", async () => {
    await withChannelStrategy(undefined, async () => {
      const calls: unknown[] = [];
      const child = fakeChild();
      const runtime = createRuntime(calls, claudeAttachOverride());

      const invoked = invokeParsedCommand(
        { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
        {
          runtime,
          cwd: "/repo",
          // marketplace registered but no plugin installed → plugin_not_installed.
          loadClaudePluginInventory: async () => ({ marketplaces: ["aiox"], plugins: [] }),
          fileExists: () => true,
          launchClaudePluginChannel: (options) => {
            calls.push(["launchClaudePluginChannel", options]);
            return child;
          },
        },
      );

      await expect(invoked).rejects.toMatchObject({
        name: "InvocationError",
        code: "aiox.invocation.claude_preflight.plugin_not_installed",
        exitCode: 1,
      });
      expect(calls).toContainEqual(["rollbackAgentAttach", { agentName: "reviewer" }]);
      expect(calls.some((c) => Array.isArray(c) && c[0] === "launchClaudePluginChannel")).toBe(
        false,
      );
    });
  });

  it("fails with a coded error and rolls back when strategy-D inventory load throws", async () => {
    await withChannelStrategy(undefined, async () => {
      const calls: unknown[] = [];
      const runtime = createRuntime(calls, claudeAttachOverride());

      const invoked = invokeParsedCommand(
        { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
        {
          runtime,
          cwd: "/repo",
          loadClaudePluginInventory: async () => {
            throw new Error("claude plugin list --json did not return valid JSON");
          },
          fileExists: () => true,
          launchClaudePluginChannel: () => {
            calls.push(["launchClaudePluginChannel"]);
            return fakeChild();
          },
        },
      );

      await expect(invoked).rejects.toMatchObject({
        name: "InvocationError",
        code: "aiox.invocation.claude_plugin_inventory_failed",
        exitCode: 1,
      });
      expect(calls).toContainEqual(["rollbackAgentAttach", { agentName: "reviewer" }]);
      expect(calls).not.toContainEqual(["launchClaudePluginChannel"]);
    });
  });

  it("preserves the preflight failure code even when rollback itself throws", async () => {
    await withChannelStrategy(undefined, async () => {
      const calls: unknown[] = [];
      const runtime = createRuntime(calls, {
        ...claudeAttachOverride(),
        rollbackAgentAttach: async () => {
          calls.push(["rollbackAgentAttach"]);
          throw new Error("rollback exploded");
        },
      });

      const invoked = invokeParsedCommand(
        { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
        {
          runtime,
          cwd: "/repo",
          loadClaudePluginInventory: async () => ({ marketplaces: ["aiox"], plugins: [] }),
          fileExists: () => true,
          launchClaudePluginChannel: () => fakeChild(),
        },
      );

      // The coded preflight error survives; the rollback error is swallowed.
      await expect(invoked).rejects.toMatchObject({
        name: "InvocationError",
        code: "aiox.invocation.claude_preflight.plugin_not_installed",
        exitCode: 1,
      });
      expect(calls).toContainEqual(["rollbackAgentAttach"]);
    });
  });

  it("routes to the plugin launcher (D) when AIOX_CLAUDE_CHANNEL_STRATEGY=plugin is set explicitly", async () => {
    await withChannelStrategy("plugin", async () => {
      const calls: unknown[] = [];
      const child = fakeChild();
      const runtime = createRuntime(calls, claudeAttachOverride());

      const invoked = invokeParsedCommand(
        { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
        {
          runtime,
          cwd: "/repo",
          loadClaudePluginInventory: async (options) => {
            calls.push(["loadClaudePluginInventory", options]);
            return passingInventory();
          },
          fileExists: () => true,
          launchClaudeWithChannel: () => {
            calls.push(["launchClaudeWithChannel"]);
            return child;
          },
          launchClaudePluginChannel: (options) => {
            calls.push(["launchClaudePluginChannel", options]);
            setTimeout(() => child.emit("exit", 0, null), 0);
            return child;
          },
        },
      );

      await expect(invoked).resolves.toEqual({ exitCode: 0 });
      expect(calls.some((c) => Array.isArray(c) && c[0] === "launchClaudePluginChannel")).toBe(
        true,
      );
      expect(calls).not.toContainEqual(["launchClaudeWithChannel"]);
    });
  });

  it("fails fast with a coded error for an invalid AIOX_CLAUDE_CHANNEL_STRATEGY and never starts the daemon or attaches", async () => {
    await withChannelStrategy("bogus", async () => {
      const calls: unknown[] = [];
      const child = fakeChild();
      const runtime = createRuntime(calls, claudeAttachOverride());

      const invoked = invokeParsedCommand(
        { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
        {
          runtime,
          cwd: "/repo",
          loadClaudePluginInventory: async () => {
            calls.push(["loadClaudePluginInventory"]);
            return passingInventory();
          },
          launchClaudePluginChannel: () => {
            calls.push(["launchClaudePluginChannel"]);
            return child;
          },
          launchClaudeWithChannel: () => {
            calls.push(["launchClaudeWithChannel"]);
            return child;
          },
        },
      );

      await expect(invoked).rejects.toMatchObject({
        name: "InvocationError",
        code: "aiox.invocation.invalid_claude_channel_strategy",
        exitCode: 1,
        message: 'Invalid AIOX_CLAUDE_CHANNEL_STRATEGY="bogus". Expected "plugin" or "inline".',
      });
      // Strategy is resolved BEFORE any side effect: no daemon/attach/launch.
      expect(calls).toEqual([]);
    });
  });

  it("appends a dev/debug inline hint to a setup-fixable D preflight failure", async () => {
    await withChannelStrategy(undefined, async () => {
      const runtime = createRuntime([], claudeAttachOverride());

      const invoked = invokeParsedCommand(
        { kind: "agent-attach", agentKind: "claude", name: "reviewer", pairName: "pair-a" },
        {
          runtime,
          cwd: "/repo",
          // marketplace registered but plugin absent → plugin_not_installed (setup-fixable).
          loadClaudePluginInventory: async () => ({ marketplaces: ["aiox"], plugins: [] }),
          fileExists: () => true,
          launchClaudePluginChannel: () => fakeChild(),
        },
      );

      await expect(invoked).rejects.toMatchObject({
        name: "InvocationError",
        code: "aiox.invocation.claude_preflight.plugin_not_installed",
        exitCode: 1,
        message: expect.stringContaining(
          "AIOX_CLAUDE_CHANNEL_STRATEGY=inline aiox claude --name <agentName>",
        ),
      });
    });
  });

  it("claude-plugin setup passes scope/cwd/marketplace path through and returns a summary", async () => {
    const calls: unknown[] = [];
    const runtime = createRuntime([]);
    const seen: unknown[] = [];

    const result = await invokeParsedCommand(
      { kind: "claude-plugin-setup", scope: "project" },
      {
        runtime,
        cwd: "/work/proj",
        claudeChannelMarketplacePath: "/repo/spike/aiox-channel-marketplace",
        setupClaudePlugin: async (input) => {
          seen.push(input);
          return { ok: true, actions: { marketplaceAdded: true, pluginInstalled: true } };
        },
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("scope: project");
    expect(seen).toEqual([
      {
        pluginName: "aiox-channel-ingress",
        marketplaceName: "aiox",
        marketplacePath: "/repo/spike/aiox-channel-marketplace",
        scope: "project",
        cwd: "/work/proj",
      },
    ]);
    // provisioning is daemon-independent — must not auto-start the daemon
    expect(calls).toEqual([]);
  });

  it("claude-plugin setup surfaces the preflight verdict as a coded non-zero error", async () => {
    const runtime = createRuntime([]);

    const invoked = invokeParsedCommand(
      { kind: "claude-plugin-setup", scope: "user" },
      {
        runtime,
        cwd: "/repo",
        claudeChannelMarketplacePath: "/repo/spike/aiox-channel-marketplace",
        setupClaudePlugin: async () => ({
          ok: false,
          code: "plugin_not_enabled",
          message: "installed but not effective in this directory",
          actions: { marketplaceAdded: false, pluginInstalled: true },
        }),
      },
    );

    await expect(invoked).rejects.toMatchObject({
      name: "InvocationError",
      code: "aiox.invocation.claude_plugin_setup.plugin_not_enabled",
      exitCode: 1,
    });
  });

  it("claude-plugin setup wraps a thrown CLI failure into a coded error", async () => {
    const runtime = createRuntime([]);

    const invoked = invokeParsedCommand(
      { kind: "claude-plugin-setup", scope: "user" },
      {
        runtime,
        cwd: "/repo",
        claudeChannelMarketplacePath: "/repo/spike/aiox-channel-marketplace",
        setupClaudePlugin: async () => {
          throw new Error("spawn claude ENOENT");
        },
      },
    );

    await expect(invoked).rejects.toMatchObject({
      name: "InvocationError",
      code: "aiox.invocation.claude_plugin_setup_failed",
      exitCode: 1,
    });
  });
});

describe("claudePreflightFailureMessage (R3 step 3b inline hint policy)", () => {
  // Literal placeholder, NOT the real agent name — names may contain spaces/shell
  // metacharacters, so interpolating them would break the copy-paste command.
  const HINT = "AIOX_CLAUDE_CHANNEL_STRATEGY=inline aiox claude --name <agentName>";

  it.each([
    "marketplace_not_registered",
    "plugin_not_installed",
    "plugin_not_enabled",
    "channel_server_missing",
    "ambiguous_install_path",
  ] as const)("appends the dev/debug inline hint for setup-fixable code %s", (code) => {
    const message = claudePreflightFailureMessage(code, "base reason");
    expect(message).toContain("base reason");
    expect(message).toContain("Developer/debug only:");
    expect(message).toContain(HINT);
  });

  it.each(["channels_disabled", "missing_env"] as const)(
    "does NOT hint inline for non-fixable code %s (inline would mislead)",
    (code) => {
      const message = claudePreflightFailureMessage(code, "base reason");
      expect(message).toBe("base reason");
      expect(message).not.toContain("AIOX_CLAUDE_CHANNEL_STRATEGY=inline");
    },
  );
});

async function withChannelStrategy(
  value: string | undefined,
  fn: () => Promise<void>,
): Promise<void> {
  const prev = process.env.AIOX_CLAUDE_CHANNEL_STRATEGY;
  if (value === undefined) delete process.env.AIOX_CLAUDE_CHANNEL_STRATEGY;
  else process.env.AIOX_CLAUDE_CHANNEL_STRATEGY = value;
  try {
    await fn();
  } finally {
    if (prev === undefined) delete process.env.AIOX_CLAUDE_CHANNEL_STRATEGY;
    else process.env.AIOX_CLAUDE_CHANNEL_STRATEGY = prev;
  }
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

function passingInventory() {
  return {
    marketplaces: ["aiox"],
    plugins: [
      {
        id: "aiox-channel-ingress@aiox",
        enabled: true,
        scope: "user",
        installPath: "/plugins/aiox-channel-ingress",
      },
    ],
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
