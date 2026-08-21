import { describe, expect, it, vi } from "vitest";

import {
  composeInstructions,
  buildRouteConnections,
  defaultRegisterSignalHandlers,
  runHost,
  type AgentViewHandle,
  type AgentViewLaunchRequest,
  type RunHostOptions,
} from "../../../src/cli/host.js";
import type { AioxConfig, AioxRouteConfig } from "../../../src/config/aiox-config.js";
import type { DaemonApi } from "../../../src/daemon/api.js";
import { AioxConfigError } from "../../../src/config/aiox-config.js";

describe("composeInstructions", () => {
  it("returns undefined when neither global nor per-agent is given", () => {
    expect(composeInstructions(undefined, undefined)).toBeUndefined();
  });

  it("returns the global text unchanged when only global is given", () => {
    expect(composeInstructions("be helpful", undefined)).toBe("be helpful");
  });

  it("returns the per-agent text unchanged when only per-agent is given", () => {
    expect(composeInstructions(undefined, "focus on tests")).toBe("focus on tests");
  });

  it("joins global then per-agent with a plain double newline when both are given", () => {
    expect(composeInstructions("be helpful", "focus on tests")).toBe(
      "be helpful\n\nfocus on tests",
    );
  });

  it("treats a whitespace-only global as unspecified", () => {
    expect(composeInstructions("   \n  ", "focus on tests")).toBe("focus on tests");
  });

  it("treats a whitespace-only per-agent as unspecified", () => {
    expect(composeInstructions("be helpful", "   ")).toBe("be helpful");
  });

  it("returns undefined when both are whitespace-only", () => {
    expect(composeInstructions("  ", "\n")).toBeUndefined();
  });

  it("preserves multiline text, quotes, and special characters verbatim", () => {
    const global = 'line one\nline "two"\n$pecial `chars`';
    const perAgent = "agent's own\nnotes";
    expect(composeInstructions(global, perAgent)).toBe(`${global}\n\n${perAgent}`);
  });
});

describe("buildRouteConnections", () => {
  it("returns an empty map for no routes", () => {
    expect(buildRouteConnections([])).toEqual(new Map());
  });

  it("builds full bidirectional mesh for a route with no directed overrides", () => {
    const routes: AioxRouteConfig[] = [{ name: "frontend", members: ["a", "b", "c"] }];

    const outbound = buildRouteConnections(routes);

    expect(outbound.get("a")).toEqual(new Set(["b", "c"]));
    expect(outbound.get("b")).toEqual(new Set(["a", "c"]));
    expect(outbound.get("c")).toEqual(new Set(["a", "b"]));
  });

  it("narrows only the overridden pair to one direction and leaves the rest meshed", () => {
    const routes: AioxRouteConfig[] = [
      {
        name: "escalation",
        members: ["qa-bot", "claude-architect", "codex-reviewer"],
        directed: [{ from: "qa-bot", to: "claude-architect" }],
      },
    ];

    const outbound = buildRouteConnections(routes);

    expect(outbound.get("qa-bot")).toEqual(new Set(["codex-reviewer", "claude-architect"]));
    expect(outbound.get("claude-architect")).toEqual(new Set(["codex-reviewer"]));
    expect(outbound.get("codex-reviewer")).toEqual(new Set(["qa-bot", "claude-architect"]));
  });

  it("expands an array `to` into one connection per target from the same source", () => {
    const routes: AioxRouteConfig[] = [
      {
        name: "fanout",
        members: ["source", "target-a", "target-b"],
        directed: [{ from: "source", to: ["target-a", "target-b"] }],
      },
    ];

    const outbound = buildRouteConnections(routes);

    expect(outbound.get("source")).toEqual(new Set(["target-a", "target-b"]));
    expect(outbound.get("target-a")).toEqual(new Set(["target-b"]));
    expect(outbound.get("target-b")).toEqual(new Set(["target-a"]));
  });

  it("merges outbound edges across independent routes without cross-route auto-merge", () => {
    const routes: AioxRouteConfig[] = [
      { name: "r1", members: ["a", "b"] },
      { name: "r2", members: ["b", "c"] },
    ];

    const outbound = buildRouteConnections(routes);

    expect(outbound.get("a")).toEqual(new Set(["b"]));
    expect(outbound.get("b")).toEqual(new Set(["a", "c"]));
    expect(outbound.get("c")).toEqual(new Set(["b"]));
    expect(outbound.get("a")?.has("c")).toBe(false);
    expect(outbound.get("c")?.has("a")).toBe(false);
  });
});

describe("defaultRegisterSignalHandlers", () => {
  it("keeps observing a repeated identical signal instead of falling through to Node's default exit after the first", () => {
    const received: NodeJS.Signals[] = [];
    const unregister = defaultRegisterSignalHandlers((signal) => received.push(signal));
    try {
      process.emit("SIGINT", "SIGINT");
      process.emit("SIGINT", "SIGINT");
    } finally {
      unregister();
    }
    expect(received).toEqual(["SIGINT", "SIGINT"]);
  });

  it("stops observing once unregistered", () => {
    const received: NodeJS.Signals[] = [];
    const unregister = defaultRegisterSignalHandlers((signal) => received.push(signal));
    unregister();
    process.emit("SIGINT", "SIGINT");
    expect(received).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Config / registration gate — global failures before any lifecycle side effect
// ---------------------------------------------------------------------------

describe("runHost — config and registration gates", () => {
  it("loads then semantically validates the config before any attach, aborting on a load failure", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls);
    const validateConfig = vi.fn();

    const result = await runHost(
      baseOptions({
        api,
        loadConfig: () => {
          throw new AioxConfigError("aiox.yaml not found at /repo/aiox.yaml", {
            code: "not_found",
          });
        },
        validateConfig,
      }),
    );

    expect(result).toEqual({ exitCode: 1 });
    expect(validateConfig).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("aborts before any attach when semantic validation fails", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls);

    const result = await runHost(
      baseOptions({
        api,
        loadConfig: () => config({ agents: [codexAgent("a")] }),
        validateConfig: () => {
          throw new AioxConfigError("dangling route member", { code: "invalid_semantics" });
        },
      }),
    );

    expect(result).toEqual({ exitCode: 1 });
    expect(calls).toEqual([]);
  });

  it("refuses to start when a claude-code agent is declared but the channel MCP is not registered", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls);
    const launchAgentView = vi.fn();

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView,
        loadConfig: () => config({ agents: [claudeAgent("writer")] }),
        checkClaudeMcpRegistration: vi.fn().mockResolvedValue({ registered: false }),
      }),
    );

    expect(result).toEqual({ exitCode: 1 });
    expect(calls).toEqual([]);
    expect(launchAgentView).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Per-agent vendor-native TUI launch requests
// ---------------------------------------------------------------------------

describe("runHost — per-agent TUI launch requests", () => {
  it("issues exactly one vendor-native TUI launch request per declared agent", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls);
    const views = recordingViewLauncher();

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () =>
          config({
            agents: [codexAgent("reviewer"), claudeAgent("writer"), codexAgent("builder")],
          }),
        ...immediateSignal(),
      }),
    );

    expect(result).toEqual({ exitCode: 0 });
    expect(views.requests.map((request) => request.agentName)).toEqual([
      "reviewer",
      "writer",
      "builder",
    ]);
    expect(views.requests.map((request) => request.kind)).toEqual([
      "codex",
      "claude",
      "codex",
    ]);
  });

  it("gives each Codex agent its own `codex resume <threadId> --remote <endpoint>` argv and cwd", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls, {
      attachAgentImpl: (request) => ({
        ok: true,
        agent: {},
        codexRuntime: {
          endpoint: `ws://127.0.0.1:900${request.name === "one" ? 1 : 2}/`,
          activeThreadId: `thread-${request.name}`,
        },
      }),
    });
    const views = recordingViewLauncher();

    await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("one"), codexAgent("two")] }),
        ...immediateSignal(),
      }),
    );

    expect(views.requests[0]).toEqual({
      agentName: "one",
      kind: "codex",
      cwd: "/repo",
      command: "codex",
      args: ["resume", "thread-one", "--remote", "ws://127.0.0.1:9001/"],
      env: {},
    });
    expect(views.requests[1]).toEqual({
      agentName: "two",
      kind: "codex",
      cwd: "/repo",
      command: "codex",
      args: ["resume", "thread-two", "--remote", "ws://127.0.0.1:9002/"],
      env: {},
    });
  });

  it("gives each Claude agent the static dev-channel argv plus its own identity env", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls, { claudeChannelTokenFor: (name) => `tok-${name}` });
    const views = recordingViewLauncher();

    await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [claudeAgent("alpha"), claudeAgent("beta")] }),
        ...immediateSignal(),
      }),
    );

    expect(views.requests[0]).toEqual({
      agentName: "alpha",
      kind: "claude",
      cwd: "/repo",
      command: "claude",
      args: ["--dangerously-load-development-channels", "server:aiox-claude-ingress"],
      env: {
        AIOX_CLAUDE_CHANNEL_AGENT_NAME: "alpha",
        AIOX_CLAUDE_CHANNEL_TOKEN: "tok-alpha",
        AIOX_SOCKET_PATH: "/tmp/aiox-w6/daemon.sock",
      },
    });
    expect(views.requests[1]?.env).toEqual({
      AIOX_CLAUDE_CHANNEL_AGENT_NAME: "beta",
      AIOX_CLAUDE_CHANNEL_TOKEN: "tok-beta",
      AIOX_SOCKET_PATH: "/tmp/aiox-w6/daemon.sock",
    });
  });

  it("never puts --bg, a background session id, or `stop` in a Claude TUI launch request", async () => {
    const views = recordingViewLauncher();

    await runHost(
      baseOptions({
        api: fakeApi([]),
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [claudeAgent("writer")] }),
        ...immediateSignal(),
      }),
    );

    const request = views.requests[0]!;
    expect(request.args).not.toContain("--bg");
    expect(request.args).not.toContain("--background");
    expect(request.args).not.toContain("stop");
    expect(request.args).not.toContain("--name");
  });

  it("passes the composed instructions as one standalone argv element alongside the channel flag", async () => {
    const views = recordingViewLauncher();

    await runHost(
      baseOptions({
        api: fakeApi([]),
        launchAgentView: views.launch,
        loadConfig: () =>
          config({
            instructions: { global: "global rules" },
            agents: [{ ...claudeAgent("writer"), instructions: "writer rules" }],
          }),
        ...immediateSignal(),
      }),
    );

    expect(views.requests[0]?.args).toEqual([
      "--append-system-prompt",
      "global rules\n\nwriter rules",
      "--dangerously-load-development-channels",
      "server:aiox-claude-ingress",
    ]);
  });

  it("omits --append-system-prompt entirely when no instructions are composed", async () => {
    const views = recordingViewLauncher();

    await runHost(
      baseOptions({
        api: fakeApi([]),
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [claudeAgent("writer")] }),
        ...immediateSignal(),
      }),
    );

    expect(views.requests[0]?.args).not.toContain("--append-system-prompt");
  });

  it("preserves multiline, quote, $ and backtick characters inside the single instruction argv", async () => {
    const views = recordingViewLauncher();
    const global = 'say "hi"\n$HOME `whoami`';
    const perAgent = "and don't; rm -rf /";

    await runHost(
      baseOptions({
        api: fakeApi([]),
        launchAgentView: views.launch,
        loadConfig: () =>
          config({
            instructions: { global },
            agents: [{ ...claudeAgent("writer"), instructions: perAgent }],
          }),
        ...immediateSignal(),
      }),
    );

    const args = views.requests[0]!.args;
    expect(args[0]).toBe("--append-system-prompt");
    expect(args[1]).toBe(`${global}\n\n${perAgent}`);
    expect(args).toHaveLength(4);
  });

  it("forwards identity, cwd and composed instructions to each agent's daemon attach", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls);

    await runHost(
      baseOptions({
        api,
        launchAgentView: recordingViewLauncher().launch,
        loadConfig: () =>
          config({
            instructions: { global: "shared" },
            agents: [
              { ...codexAgent("reviewer"), role: "reviewer", description: "reviews" },
              { ...claudeAgent("writer"), instructions: "writer only" },
            ],
          }),
        ...immediateSignal(),
      }),
    );

    expect(callsOf(calls, "attachAgent")).toEqual([
      {
        kind: "codex",
        name: "reviewer",
        cwd: "/repo",
        role: "reviewer",
        description: "reviews",
        instructions: "shared",
      },
      {
        kind: "claude",
        name: "writer",
        cwd: "/repo",
        instructions: "shared\n\nwriter only",
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Agent-local launch failure
// ---------------------------------------------------------------------------

describe("runHost — agent-local launch failure", () => {
  it("detaches only the failing agent when its view launch throws synchronously, and keeps launching the rest", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls);
    const views = recordingViewLauncher({
      onRequest: (request) => {
        if (request.agentName === "b") {
          throw new Error("no terminal surface available");
        }
      },
    });

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () =>
          config({ agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")] }),
        ...immediateSignal(),
      }),
    );

    expect(views.requests.map((request) => request.agentName)).toEqual(["a", "b", "c"]);
    // b is detached immediately (agent-local); a and c only at shutdown.
    expect(callsOf(calls, "detachAgent")).toEqual([
      { agentName: "b" },
      { agentName: "a" },
      { agentName: "c" },
    ]);
    expect(result.exitCode).toBe(1);
  });

  it("detaches only the failing agent when its readiness rejects asynchronously", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls);
    const views = recordingViewLauncher({
      onRequest: async (request) => {
        if (request.agentName === "b") {
          await Promise.resolve();
          throw new Error("TUI exited before becoming ready");
        }
      },
    });

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () =>
          config({ agents: [codexAgent("a"), claudeAgent("b"), codexAgent("c")] }),
        ...immediateSignal(),
      }),
    );

    expect(callsOf(calls, "detachAgent")).toEqual([
      { agentName: "b" },
      { agentName: "a" },
      { agentName: "c" },
    ]);
    expect(result.exitCode).toBe(1);
  });

  it("never closes an already-successful agent's view because a later agent failed", async () => {
    const signals = fakeSignalHandlers();
    const closed: string[] = [];
    const views = recordingViewLauncher({
      onRequest: (request) => {
        if (request.agentName === "b") {
          throw new Error("boom");
        }
      },
      onClose: (name) => closed.push(name),
    });

    await runHost(
      baseOptions({
        api: fakeApi([]),
        launchAgentView: views.launch,
        loadConfig: () =>
          config({ agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        watchOwnedAgents: onForeground(() => {
          expect(closed).toEqual([]);
          signals.fireSignal();
        }),
      }),
    );

    // a and c are only closed by the final shutdown, in order.
    expect(closed).toEqual(["a", "c"]);
  });

  it("reports both the launch error and the cleanup error when the failing agent's detach also fails", async () => {
    const lines: string[] = [];
    const api = fakeApi([], {
      detachAgentImpl: (request) => {
        if (request.agentName === "b") {
          throw new Error("daemon socket closed");
        }
        return { ok: true, agentName: request.agentName, detached: true };
      },
    });
    const views = recordingViewLauncher({
      onRequest: (request) => {
        if (request.agentName === "b") {
          throw new Error("no terminal surface available");
        }
      },
    });

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("a"), codexAgent("b")] }),
        stderr: { write: (chunk: string) => lines.push(chunk) },
        ...immediateSignal(),
      }),
    );

    const joined = lines.join("");
    expect(joined).toContain("no terminal surface available");
    expect(joined).toContain("daemon socket closed");
    expect(result.exitCode).toBe(1);
  });

  it("treats a Claude attach that returns no channel token as an agent-local failure", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls, {
      attachAgentImpl: (request) =>
        request.name === "b"
          ? { ok: true, agent: {} }
          : { ok: true, agent: {}, claudeChannelToken: `tok-${request.name}` },
    });
    const views = recordingViewLauncher();

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () =>
          config({ agents: [claudeAgent("a"), claudeAgent("b"), claudeAgent("c")] }),
        ...immediateSignal(),
      }),
    );

    expect(views.requests.map((request) => request.agentName)).toEqual(["a", "c"]);
    expect(callsOf(calls, "detachAgent")).toEqual([
      { agentName: "b" },
      { agentName: "a" },
      { agentName: "c" },
    ]);
    expect(result.exitCode).toBe(1);
  });

  it("keeps launching later agents after one agent's daemon attach itself fails", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls, {
      attachAgentImpl: (request) =>
        request.name === "b"
          ? { ok: false, reason: "agent_already_attached" }
          : {
              ok: true,
              agent: {},
              codexRuntime: {
                endpoint: "ws://127.0.0.1:9000/",
                activeThreadId: `thread-${request.name}`,
              },
            },
    });
    const views = recordingViewLauncher();

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () =>
          config({ agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")] }),
        ...immediateSignal(),
      }),
    );

    expect(views.requests.map((request) => request.agentName)).toEqual(["a", "c"]);
    // A failed attach created nothing, so there is nothing to detach for b.
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "a" }, { agentName: "c" }]);
    expect(result.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Route wiring over the successful subset
// ---------------------------------------------------------------------------

describe("runHost — route wiring over successfully launched agents", () => {
  it("meshes only the agents whose TUI launched, skipping the failed one", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls);
    const views = recordingViewLauncher({
      onRequest: (request) => {
        if (request.agentName === "b") {
          throw new Error("boom");
        }
      },
    });

    await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () =>
          config({
            agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")],
            routes: [{ name: "team", members: ["a", "b", "c"] }],
          }),
        ...immediateSignal(),
      }),
    );

    expect(callsOf(calls, "connect")).toEqual([
      { sourceName: "a", targetNames: ["c"] },
      { sourceName: "c", targetNames: ["a"] },
    ]);
  });

  it("skips a directed edge whose target failed while keeping the edges between successful agents", async () => {
    const calls: Array<[string, unknown]> = [];
    const api = fakeApi(calls);
    const views = recordingViewLauncher({
      onRequest: (request) => {
        if (request.agentName === "b") {
          throw new Error("boom");
        }
      },
    });

    await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () =>
          config({
            agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")],
            routes: [
              {
                name: "team",
                members: ["a", "b", "c"],
                directed: [
                  { from: "a", to: "b" },
                  { from: "a", to: "c" },
                ],
              },
            ],
          }),
        ...immediateSignal(),
      }),
    );

    // a->b is dropped (b failed); a->c survives; b<->c never wires; c->a is not
    // in the topology because the a/c pair was narrowed by a directed entry.
    expect(callsOf(calls, "connect")).toEqual([{ sourceName: "a", targetNames: ["c"] }]);
  });

  it("continues wiring the remaining sources after one connect fails, and reports it", async () => {
    const calls: Array<[string, unknown]> = [];
    const lines: string[] = [];
    const api = fakeApi(calls, {
      connectImpl: (request) =>
        request.sourceName === "a"
          ? { ok: false, reason: "route_target_not_found" }
          : { ok: true, created: [], alreadyExisted: [] },
    });

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: recordingViewLauncher().launch,
        loadConfig: () =>
          config({
            agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")],
            routes: [{ name: "team", members: ["a", "b", "c"] }],
          }),
        stderr: { write: (chunk: string) => lines.push(chunk) },
        ...immediateSignal(),
      }),
    );

    expect(callsOf(calls, "connect").map((request) => (request as { sourceName: string }).sourceName)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(lines.join("")).toContain("route_target_not_found");
    expect(result.exitCode).toBe(1);
  });

  it("does not close any successfully launched view because a connect failed", async () => {
    const closed: string[] = [];
    const views = recordingViewLauncher({ onClose: (name) => closed.push(name) });
    const api = fakeApi([], {
      connectImpl: () => {
        expect(closed).toEqual([]);
        throw new Error("connect transport failed");
      },
    });

    await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () =>
          config({
            agents: [codexAgent("a"), codexAgent("b")],
            routes: [{ name: "team", members: ["a", "b"] }],
          }),
        ...immediateSignal(),
      }),
    );

    expect(closed).toEqual(["a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// Unexpected loss of one agent's view or runtime
// ---------------------------------------------------------------------------

describe("runHost — agent-local unexpected loss", () => {
  it("closes and detaches only the lost agent, keeping the others attached", async () => {
    const calls: Array<[string, unknown]> = [];
    const closed: string[] = [];
    const api = fakeApi(calls);
    const views = recordingViewLauncher({ onClose: (name) => closed.push(name) });
    const signals = fakeSignalHandlers();

    const run = runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () =>
          config({ agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        watchOwnedAgents: onForeground(() => views.lose("b", "TUI window closed")),
      }),
    );

    await settle();
    expect(closed).toEqual(["b"]);
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "b" }]);

    signals.fireSignal();
    const result = await run;

    expect(callsOf(calls, "detachAgent")).toEqual([
      { agentName: "b" },
      { agentName: "a" },
      { agentName: "c" },
    ]);
    expect(closed).toEqual(["b", "a", "c"]);
    expect(result.exitCode).toBe(1);
  });

  it("treats a watcher-reported runtime disappearance as the same agent-local departure", async () => {
    const calls: Array<[string, unknown]> = [];
    const closed: string[] = [];
    const api = fakeApi(calls);
    const views = recordingViewLauncher({ onClose: (name) => closed.push(name) });
    const signals = fakeSignalHandlers();
    const captured: { reportLoss?: (agentName: string) => void } = {};
    let watcherStopped = 0;

    const run = runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("a"), codexAgent("b")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        watchOwnedAgents: (input) => {
          captured.reportLoss = input.onLoss;
          return () => {
            watcherStopped += 1;
          };
        },
      }),
    );

    await settle();
    captured.reportLoss?.("a");
    await settle();

    expect(closed).toEqual(["a"]);
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "a" }]);

    signals.fireSignal();
    await run;
    expect(watcherStopped).toBe(1);
  });

  it("only reports the owned agents that are still active to the liveness watcher", async () => {
    const views = recordingViewLauncher();
    const signals = fakeSignalHandlers();
    const captured: { ownedAgentNames?: () => readonly string[] } = {};

    const run = runHost(
      baseOptions({
        api: fakeApi([]),
        launchAgentView: views.launch,
        loadConfig: () =>
          config({ agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        watchOwnedAgents: (input) => {
          captured.ownedAgentNames = input.ownedAgentNames;
          return () => {};
        },
      }),
    );

    await settle();
    expect(captured.ownedAgentNames?.()).toEqual(["a", "b", "c"]);

    views.lose("b", "gone");
    await settle();
    expect(captured.ownedAgentNames?.()).toEqual(["a", "c"]);

    signals.fireSignal();
    await run;
  });

  it("waits for an in-flight loss cleanup to finish before global cleanup completes, even when a signal races it", async () => {
    const calls: Array<[string, unknown]> = [];
    const order: string[] = [];
    const signals = fakeSignalHandlers();
    const views = recordingViewLauncher({ onClose: (name) => order.push(`close:${name}`) });
    const api = fakeApi(calls, {
      detachAgentImpl: (request) => {
        if (request.agentName === "b") {
          // A real async gap (a macrotask, not just a microtask) so that a
          // buggy `cleanUpAll()` that does not track this loss's own cleanup
          // can be observed resolving before this ever settles.
          return new Promise((resolve) => {
            setTimeout(() => {
              order.push("detach:b:end");
              resolve({ ok: true, agentName: "b", detached: true });
            }, 0);
          });
        }
        order.push(`detach:${request.agentName}`);
        return { ok: true, agentName: request.agentName, detached: true };
      },
    });

    const run = runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("a"), codexAgent("b")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        watchOwnedAgents: onForeground(() => {
          views.lose("b", "TUI window closed");
          signals.fireSignal();
        }),
      }),
    );

    await run;

    expect(order).toContain("detach:b:end");
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "b" }, { agentName: "a" }]);
  });

  it("awaits a loss cleanup that starts AFTER the signal, in the signal→loss order, before resolving — and detaches each agent exactly once", async () => {
    const calls: Array<[string, unknown]> = [];
    const order: string[] = [];
    const signals = fakeSignalHandlers();
    const views = recordingViewLauncher({ onClose: (name) => order.push(`close:${name}`) });

    let resolveBDetach: (() => void) | undefined;
    const bDetachGate = new Promise<void>((resolve) => {
      resolveBDetach = resolve;
    });
    const api = fakeApi(calls, {
      detachAgentImpl: (request) => {
        if (request.agentName === "b") {
          // A real async gap so a buggy cleanUpAll() that only snapshots
          // pendingLossCleanups once (missing a loss that registers after
          // that snapshot but before the `active` snapshot right after it)
          // can be observed resolving before this ever settles.
          return bDetachGate.then(() => {
            order.push("detach:b:end");
            return { ok: true, agentName: "b", detached: true };
          });
        }
        order.push(`detach:${request.agentName}`);
        return { ok: true, agentName: request.agentName, detached: true };
      },
    });

    const run = runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("a"), codexAgent("b")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        watchOwnedAgents: () => {
          // Signal first...
          signals.fireSignal();
          // ...then b's view is lost, deliberately deferred two microtask
          // hops past the signal. Empirically calibrated (not a guess) to
          // land right after cleanUpAll()'s pre-fix single `[...pendingLossCleanups]`
          // snapshot has already been taken (as an empty array, spread
          // synchronously into the `Promise.allSettled(...)` call before its
          // `await` yields) but before that same pre-fix implementation
          // takes its `active` snapshot — the exact gap where a loss that
          // registers there is captured by neither snapshot. If a future
          // change to runHost()'s await count shifts this, this test would
          // stop exercising the race (though it would still pass, since the
          // fixed implementation drains pendingLossCleanups in a loop
          // regardless of when it registers).
          queueMicrotask(() =>
            queueMicrotask(() => {
              views.lose("b", "TUI window closed");
            }),
          );
          return () => {};
        },
      }),
    );

    let hostSettled = false;
    void run.then(() => {
      hostSettled = true;
    });

    await settle();
    expect(hostSettled).toBe(false);
    expect(order).not.toContain("detach:b:end");

    resolveBDetach?.();
    const result = await run;

    expect(hostSettled).toBe(true);
    expect(order).toContain("detach:b:end");
    const detachedAgents = callsOf(calls, "detachAgent").map(
      (request) => (request as { agentName: string }).agentName,
    );
    // Each of a and b is detached exactly once — no double-cleanup from a
    // loss and a global shutdown both claiming the same agent.
    expect(detachedAgents.sort()).toEqual(["a", "b"]);
    expect(detachedAgents.length).toBe(2);
    // Whether this exact race is won by the loss path or by global cleanup
    // already having taken ownership of b first (both are legitimate,
    // race-dependent outcomes of a fix that closes the missed-cleanup gap;
    // neither leaves b's detach unawaited) is not asserted here — result
    // is present but not pinned to a specific exit code.
    expect(result.exitCode).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Signal ownership and cleanup
// ---------------------------------------------------------------------------

describe("runHost — signal ownership and cleanup", () => {
  it("registers the signal handlers before the very first lifecycle side effect", async () => {
    const order: string[] = [];
    const api = fakeApi([]);

    await runHost(
      baseOptions({
        api,
        launchAgentView: recordingViewLauncher().launch,
        loadConfig: () => {
          order.push("loadConfig");
          return config({ agents: [codexAgent("a")] });
        },
        registerSignalHandlers: (onSignal) => {
          order.push("registerSignalHandlers");
          queueMicrotask(() => onSignal("SIGINT"));
          return () => {
            order.push("unregister");
          };
        },
      }),
    );

    expect(order[0]).toBe("registerSignalHandlers");
    expect(order[1]).toBe("loadConfig");
    expect(order.at(-1)).toBe("unregister");
  });

  it("attaches nothing when a signal arrives during the async Claude registration gate", async () => {
    const calls: Array<[string, unknown]> = [];
    const signals = fakeSignalHandlers();
    const views = recordingViewLauncher();

    const result = await runHost(
      baseOptions({
        api: fakeApi(calls),
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [claudeAgent("a"), claudeAgent("b")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        checkClaudeMcpRegistration: async () => {
          signals.fireSignal();
          await Promise.resolve();
          return { registered: true };
        },
      }),
    );

    expect(calls).toEqual([]);
    expect(views.requests).toEqual([]);
    expect(result).toEqual({ exitCode: 0 });
  });

  it("does not start another agent's attach or view once a signal arrived mid-attach", async () => {
    const calls: Array<[string, unknown]> = [];
    const views = recordingViewLauncher();
    const signals = fakeSignalHandlers();
    const api = fakeApi(calls, {
      attachAgentImpl: (request) => {
        if (request.name === "a") {
          signals.fireSignal();
        }
        return { ok: true, agent: {} };
      },
    });

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () =>
          config({ agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
      }),
    );

    expect(callsOf(calls, "attachAgent").map((request) => (request as { name: string }).name)).toEqual(["a"]);
    expect(views.requests).toEqual([]);
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "a" }]);
    expect(result.exitCode).toBe(0);
  });

  it("does not launch the view for an agent whose attach completed after the signal", async () => {
    const calls: Array<[string, unknown]> = [];
    const views = recordingViewLauncher();
    const signals = fakeSignalHandlers();
    const api = fakeApi(calls, {
      attachAgentImpl: () => {
        signals.fireSignal();
        return { ok: true, agent: {}, claudeChannelToken: "tok" };
      },
    });

    await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [claudeAgent("writer")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
      }),
    );

    expect(views.requests).toEqual([]);
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "writer" }]);
  });

  it("does not start another view launch once a signal arrived while one was pending", async () => {
    const calls: Array<[string, unknown]> = [];
    const signals = fakeSignalHandlers();
    const views = recordingViewLauncher({
      onRequest: async (request) => {
        if (request.agentName === "a") {
          signals.fireSignal();
          await Promise.resolve();
        }
      },
    });

    await runHost(
      baseOptions({
        api: fakeApi(calls),
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("a"), codexAgent("b")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
      }),
    );

    expect(views.requests.map((request) => request.agentName)).toEqual(["a"]);
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "a" }]);
  });

  it("does not start another connect once a signal arrived while one was pending", async () => {
    const calls: Array<[string, unknown]> = [];
    const signals = fakeSignalHandlers();
    const api = fakeApi(calls, {
      connectImpl: (request) => {
        if (request.sourceName === "a") {
          signals.fireSignal();
        }
        return { ok: true, created: [], alreadyExisted: [] };
      },
    });

    await runHost(
      baseOptions({
        api,
        launchAgentView: recordingViewLauncher().launch,
        loadConfig: () =>
          config({
            agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")],
            routes: [{ name: "team", members: ["a", "b", "c"] }],
          }),
        registerSignalHandlers: signals.registerSignalHandlers,
      }),
    );

    expect(callsOf(calls, "connect")).toEqual([{ sourceName: "a", targetNames: ["b", "c"] }]);
  });

  it("keeps observing signals until cleanup has finished and still cleans up exactly once", async () => {
    const calls: Array<[string, unknown]> = [];
    const signals = fakeSignalHandlers();
    const api = fakeApi(calls, {
      detachAgentImpl: (request) => {
        signals.fireSignal();
        return { ok: true, agentName: request.agentName, detached: true };
      },
    });

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: recordingViewLauncher().launch,
        loadConfig: () => config({ agents: [codexAgent("a")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        watchOwnedAgents: onForeground(() => signals.fireSignal()),
      }),
    );

    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "a" }]);
    expect(signals.unregister).toHaveBeenCalledTimes(1);
    expect(result.exitCode).toBe(0);
  });

  it("stops the watcher, closes views, detaches agents, then unregisters — in that order", async () => {
    const order: string[] = [];
    const signals = fakeSignalHandlers();
    const views = recordingViewLauncher({ onClose: (name) => order.push(`close:${name}`) });
    const api = fakeApi([], {
      detachAgentImpl: (request) => {
        order.push(`detach:${request.agentName}`);
        return { ok: true, agentName: request.agentName, detached: true };
      },
    });

    await runHost(
      baseOptions({
        api,
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("a")] }),
        registerSignalHandlers: (onSignal) => {
          const unregister = signals.registerSignalHandlers!(onSignal);
          return () => {
            order.push("unregister");
            unregister();
          };
        },
        watchOwnedAgents: () => {
          queueMicrotask(() => signals.fireSignal());
          return () => order.push("stopWatcher");
        },
      }),
    );

    expect(order).toEqual(["stopWatcher", "close:a", "detach:a", "unregister"]);
  });

  it("unregisters the signal handlers and stops the watcher even when the config fails to load", async () => {
    const order: string[] = [];

    const result = await runHost(
      baseOptions({
        api: fakeApi([]),
        launchAgentView: recordingViewLauncher().launch,
        loadConfig: () => {
          throw new Error("broken yaml");
        },
        registerSignalHandlers: () => () => order.push("unregister"),
      }),
    );

    expect(result).toEqual({ exitCode: 1 });
    expect(order).toEqual(["unregister"]);
  });

  it("keeps cleaning up the remaining agents after one agent's cleanup fails, and exits nonzero", async () => {
    const calls: Array<[string, unknown]> = [];
    const lines: string[] = [];
    const signals = fakeSignalHandlers();
    const api = fakeApi(calls, {
      detachAgentImpl: (request) => {
        if (request.agentName === "b") {
          throw new Error("detach transport failed");
        }
        return { ok: true, agentName: request.agentName, detached: true };
      },
    });

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: recordingViewLauncher().launch,
        loadConfig: () =>
          config({ agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        stderr: { write: (chunk: string) => lines.push(chunk) },
        watchOwnedAgents: onForeground(() => signals.fireSignal()),
      }),
    );

    expect(callsOf(calls, "detachAgent")).toEqual([
      { agentName: "a" },
      { agentName: "b" },
      { agentName: "c" },
    ]);
    expect(lines.join("")).toContain("detach transport failed");
    expect(result.exitCode).toBe(1);
  });

  it("still detaches an agent whose view close failed, reporting both failures", async () => {
    const calls: Array<[string, unknown]> = [];
    const lines: string[] = [];
    const signals = fakeSignalHandlers();
    const views = recordingViewLauncher({
      onClose: (name) => {
        if (name === "a") {
          throw new Error("surface already gone");
        }
      },
    });

    const result = await runHost(
      baseOptions({
        api: fakeApi(calls),
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("a"), codexAgent("b")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        stderr: { write: (chunk: string) => lines.push(chunk) },
        watchOwnedAgents: onForeground(() => signals.fireSignal()),
      }),
    );

    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "a" }, { agentName: "b" }]);
    expect(lines.join("")).toContain("surface already gone");
    expect(result.exitCode).toBe(1);
  });

  it("surfaces a daemon-reported runtime dispose failure as a cleanup failure", async () => {
    const lines: string[] = [];
    const signals = fakeSignalHandlers();
    const api = fakeApi([], {
      detachAgentImpl: (request) => ({
        ok: true,
        agentName: request.agentName,
        detached: true,
        runtimeDisposeError: "codex app-server did not shut down",
      }),
    });

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: recordingViewLauncher().launch,
        loadConfig: () => config({ agents: [codexAgent("a")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        stderr: { write: (chunk: string) => lines.push(chunk) },
        watchOwnedAgents: onForeground(() => signals.fireSignal()),
      }),
    );

    expect(lines.join("")).toContain("codex app-server did not shut down");
    expect(result.exitCode).toBe(1);
  });

  it("exits 0 after a clean signal shutdown with every agent launched and wired", async () => {
    const calls: Array<[string, unknown]> = [];
    const signals = fakeSignalHandlers();

    const result = await runHost(
      baseOptions({
        api: fakeApi(calls),
        launchAgentView: recordingViewLauncher().launch,
        loadConfig: () =>
          config({
            agents: [codexAgent("a"), claudeAgent("b")],
            routes: [{ name: "team", members: ["a", "b"] }],
          }),
        registerSignalHandlers: signals.registerSignalHandlers,
        watchOwnedAgents: onForeground(() => signals.fireSignal()),
      }),
    );

    expect(result).toEqual({ exitCode: 0 });
    expect(callsOf(calls, "connect")).toEqual([
      { sourceName: "a", targetNames: ["b"] },
      { sourceName: "b", targetNames: ["a"] },
    ]);
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "a" }, { agentName: "b" }]);
  });

  it("exits without waiting in the foreground when no agent launched successfully", async () => {
    const views = recordingViewLauncher({
      onRequest: () => {
        throw new Error("no view driver");
      },
    });
    let watcherStarted = 0;

    const result = await runHost(
      baseOptions({
        api: fakeApi([]),
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("a"), codexAgent("b")] }),
        registerSignalHandlers: () => () => {},
        watchOwnedAgents: () => {
          watcherStarted += 1;
          return () => {};
        },
      }),
    );

    expect(result).toEqual({ exitCode: 1 });
    expect(watcherStarted).toBe(0);
  });

  it("still closes and detaches an already-launched agent when starting the liveness watcher throws", async () => {
    const calls: Array<[string, unknown]> = [];
    const closed: string[] = [];
    const views = recordingViewLauncher({ onClose: (name) => closed.push(name) });

    const result = await runHost(
      baseOptions({
        api: fakeApi(calls),
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("a")] }),
        registerSignalHandlers: () => () => {},
        watchOwnedAgents: () => {
          throw new Error("watcher setup failed");
        },
      }),
    );

    expect(closed).toEqual(["a"]);
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "a" }]);
    expect(result.exitCode).toBe(1);
  });

  it("still closes and detaches an already-launched agent when stopping the liveness watcher throws", async () => {
    const calls: Array<[string, unknown]> = [];
    const closed: string[] = [];
    const signals = fakeSignalHandlers();
    const views = recordingViewLauncher({ onClose: (name) => closed.push(name) });

    const result = await runHost(
      baseOptions({
        api: fakeApi(calls),
        launchAgentView: views.launch,
        loadConfig: () => config({ agents: [codexAgent("a")] }),
        registerSignalHandlers: signals.registerSignalHandlers,
        watchOwnedAgents: () => {
          queueMicrotask(() => signals.fireSignal());
          return () => {
            throw new Error("watcher stop failed");
          };
        },
      }),
    );

    expect(closed).toEqual(["a"]);
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "a" }]);
    expect(result.exitCode).toBe(1);
  });

  it("still closes and detaches an already-launched agent when registering its loss listener throws", async () => {
    const calls: Array<[string, unknown]> = [];
    const closed: string[] = [];
    const views = recordingViewLauncher({ onClose: (name) => closed.push(name) });
    const originalLaunch = views.launch;

    const result = await runHost(
      baseOptions({
        api: fakeApi(calls),
        launchAgentView: async (request) => {
          const view = await originalLaunch(request);
          return {
            ...view,
            onLost: () => {
              throw new Error("view driver onLost registration failed");
            },
          } satisfies AgentViewHandle;
        },
        loadConfig: () => config({ agents: [codexAgent("a")] }),
        registerSignalHandlers: () => () => {},
        watchOwnedAgents: () => () => {},
      }),
    );

    expect(closed).toEqual(["a"]);
    expect(callsOf(calls, "detachAgent")).toEqual([{ agentName: "a" }]);
    expect(result.exitCode).toBe(1);
  });

  it("isolates an onLost registration failure to that one agent — keeps prior successes running, continues launching the rest, and wires routes over the surviving subset", async () => {
    const calls: Array<[string, unknown]> = [];
    const closed: string[] = [];
    const detachCounts = new Map<string, number>();
    const api = fakeApi(calls, {
      detachAgentImpl: (request) => {
        detachCounts.set(request.agentName, (detachCounts.get(request.agentName) ?? 0) + 1);
        return { ok: true, agentName: request.agentName, detached: true };
      },
    });
    const views = recordingViewLauncher({ onClose: (name) => closed.push(name) });
    const originalLaunch = views.launch;
    const signals = fakeSignalHandlers();
    const owned: Array<readonly string[]> = [];

    const result = await runHost(
      baseOptions({
        api,
        launchAgentView: async (request) => {
          const view = await originalLaunch(request);
          if (request.agentName === "b") {
            return {
              ...view,
              onLost: () => {
                throw new Error("view driver onLost registration failed");
              },
            } satisfies AgentViewHandle;
          }
          return view;
        },
        loadConfig: () =>
          config({
            agents: [codexAgent("a"), codexAgent("b"), codexAgent("c")],
            routes: [{ name: "team", members: ["a", "b", "c"] }],
          }),
        registerSignalHandlers: signals.registerSignalHandlers,
        watchOwnedAgents: (input) => {
          owned.push(input.ownedAgentNames());
          queueMicrotask(() => signals.fireSignal());
          return () => {};
        },
      }),
    );

    // b's launch actually happened (its view request was made) — only the
    // onLost registration afterward failed — and c's launch was still
    // attempted afterward, proving the loop did not stop at b.
    expect(views.requests.map((request) => request.agentName)).toEqual(["a", "b", "c"]);
    // Only b was cleaned up locally; a and c reached the foreground/watcher
    // stage still running (this is the same seam the other loss/failure
    // tests use as "reached foreground").
    expect(owned).toEqual([["a", "c"]]);
    // Routes wire only across the surviving subset.
    expect(callsOf(calls, "connect")).toEqual([
      { sourceName: "a", targetNames: ["c"] },
      { sourceName: "c", targetNames: ["a"] },
    ]);
    // b is closed/detached once, immediately, as its own agent-local
    // failure; a and c are closed/detached once each, later, by global
    // signal cleanup.
    expect(closed).toEqual(["b", "a", "c"]);
    expect(callsOf(calls, "detachAgent")).toEqual([
      { agentName: "b" },
      { agentName: "a" },
      { agentName: "c" },
    ]);
    expect(detachCounts.get("a")).toBe(1);
    expect(detachCounts.get("b")).toBe(1);
    expect(detachCounts.get("c")).toBe(1);
    expect(result.exitCode).toBe(1);
  });

  it("reports a runtime dispose failure surfaced by a failed codex attach alongside the attach reason", async () => {
    const lines: string[] = [];
    const api = fakeApi([], {
      attachAgentImpl: () => ({
        ok: false,
        reason: "codex_runtime_attach_failed",
        message: "Codex did not return a thread id",
        runtimeDisposeError: "codex app-server did not shut down",
      }),
    });

    const result = await runHost(
      baseOptions({
        api,
        loadConfig: () => config({ agents: [codexAgent("a")] }),
        registerSignalHandlers: () => () => {},
        stderr: { write: (chunk: string) => lines.push(chunk) },
      }),
    );

    expect(lines.join("")).toContain("codex app-server did not shut down");
    expect(result.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function config(overrides: Partial<AioxConfig> & Pick<AioxConfig, "agents">): AioxConfig {
  return { project: "demo", ...overrides };
}

function codexAgent(name: string): AioxConfig["agents"][number] {
  return { name, type: "codex" };
}

function claudeAgent(name: string): AioxConfig["agents"][number] {
  return { name, type: "claude-code" };
}

function callsOf(calls: Array<[string, unknown]>, method: string): unknown[] {
  return calls.filter(([name]) => name === method).map(([, request]) => request);
}

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * A signal that fires as soon as the launch phase is over. Used by the tests
 * that only care about what the launch/route phase produced.
 */
function immediateSignal(): Partial<RunHostOptions> {
  const signals = fakeSignalHandlers();
  return {
    registerSignalHandlers: signals.registerSignalHandlers,
    watchOwnedAgents: onForeground(() => signals.fireSignal()),
  };
}

/**
 * `watchOwnedAgents` is called exactly once, at the moment the launch/route
 * phase is over and the host enters its foreground wait — so it doubles as the
 * "foreground entered" seam these tests need, without a test-only production
 * option.
 */
function onForeground(action: () => void): RunHostOptions["watchOwnedAgents"] {
  return () => {
    queueMicrotask(action);
    return () => {};
  };
}

function recordingViewLauncher(hooks: {
  onRequest?: (request: AgentViewLaunchRequest) => void | Promise<void>;
  onClose?: (agentName: string) => void;
} = {}): {
  launch: RunHostOptions["launchAgentView"];
  requests: AgentViewLaunchRequest[];
  lose: (agentName: string, reason: string) => void;
} {
  const requests: AgentViewLaunchRequest[] = [];
  const listeners = new Map<string, (reason: string) => void>();

  return {
    requests,
    lose: (agentName, reason) => listeners.get(agentName)?.(reason),
    launch: async (request) => {
      requests.push(request);
      await hooks.onRequest?.(request);
      return {
        async close() {
          hooks.onClose?.(request.agentName);
        },
        onLost(listener) {
          listeners.set(request.agentName, listener);
        },
      } satisfies AgentViewHandle;
    },
  };
}

function baseOptions(
  overrides: Partial<RunHostOptions> & { api: DaemonApi },
): RunHostOptions {
  return {
    cwd: "/repo",
    daemonSocketPath: "/tmp/aiox-w6/daemon.sock",
    launchAgentView: recordingViewLauncher().launch,
    checkClaudeMcpRegistration: vi.fn().mockResolvedValue({ registered: true }),
    registerSignalHandlers: () => () => {},
    watchOwnedAgents: () => () => {},
    stderr: { write: () => true },
    ...overrides,
  };
}

function fakeApi(
  calls: Array<[string, unknown]>,
  overrides: {
    attachAgentImpl?: (request: { name: string; kind: string }) => unknown;
    connectImpl?: (request: { sourceName: string; targetNames: string[] }) => unknown;
    detachAgentImpl?: (request: { agentName: string }) => unknown;
    claudeChannelTokenFor?: (agentName: string) => string;
  } = {},
): DaemonApi {
  return {
    async attachAgent(request: unknown) {
      calls.push(["attachAgent", request]);
      const req = request as { name: string; kind: string };
      if (overrides.attachAgentImpl) {
        return overrides.attachAgentImpl(req);
      }
      if (req.kind === "claude") {
        return {
          ok: true,
          agent: {},
          claudeChannelToken: overrides.claudeChannelTokenFor?.(req.name) ?? "tok-default",
        };
      }
      return {
        ok: true,
        agent: {},
        codexRuntime: {
          endpoint: "ws://127.0.0.1:9000/",
          activeThreadId: `thread-${req.name}`,
        },
      };
    },
    connect(request: unknown) {
      calls.push(["connect", request]);
      if (overrides.connectImpl) {
        return overrides.connectImpl(request as { sourceName: string; targetNames: string[] });
      }
      return { ok: true, created: [], alreadyExisted: [] };
    },
    async detachAgent(request: unknown) {
      calls.push(["detachAgent", request]);
      const req = request as { agentName: string };
      if (overrides.detachAgentImpl) {
        return overrides.detachAgentImpl(req);
      }
      return { ok: true, agentName: req.agentName, detached: true };
    },
    async status() {
      calls.push(["status", undefined]);
      return {
        daemon: { pid: 1, startedAt: "2026-05-19T00:00:00.000Z" },
        agents: [],
        pairs: [],
        routes: [],
        messageCount: 0,
        deliveryCounts: { queued: 0, delivering: 0, delivered: 0, completed: 0, failed: 0 },
      };
    },
  } as unknown as DaemonApi;
}

function fakeSignalHandlers(): {
  registerSignalHandlers: RunHostOptions["registerSignalHandlers"];
  fireSignal: () => void;
  unregister: ReturnType<typeof vi.fn>;
} {
  let handler: ((signal: NodeJS.Signals) => void) | null = null;
  const unregister = vi.fn();

  return {
    registerSignalHandlers: (onSignal) => {
      handler = onSignal;
      return () => {
        unregister();
        handler = null;
      };
    },
    fireSignal: () => handler?.("SIGINT"),
    unregister,
  };
}
