import type { AioxAgentConfig, AioxConfig, AioxRouteConfig } from "../config/aiox-config.js";
import { loadAioxConfig } from "../config/aiox-config.js";
import { validateAioxConfigSemantics } from "../config/aiox-config-validator.js";
import { checkClaudeMcpRegistration } from "../adapters/claude/mcp-cli.js";
import {
  buildClaudeChannelEnv,
  buildLaunchClaudeChannelArgs,
  resolveClaudeCommand,
} from "../adapters/claude/launcher.js";
import {
  buildLaunchCodexTuiArgs,
  resolveCodexTuiCommand,
} from "../adapters/codex/launcher.js";
import type { AgentKind } from "../core/agent-kind.js";
import type { DaemonApi } from "../daemon/api.js";

// Mirrors `CLAUDE_CHANNEL_MCP_NAME` in src/cli/invocation.ts — the sole Claude
// runtime path's static MCP identity (provisioning via `aiox claude setup`, the
// launch-time registration gate, and `--dangerously-load-development-channels
// server:<name>` activation all share this one name so they never drift).
// Duplicated here as a literal, not imported, to avoid a circular module
// dependency between invocation.ts (which calls runHost) and host.ts.
const CLAUDE_CHANNEL_MCP_NAME = "aiox-claude-ingress";

/**
 * `instructions.global` then per-agent `agents[].instructions`, composed into one text
 * (G2 Kickoff / W6 Task Brief revision 5). Trim only decides whether a value counts as
 * "given" — the original (untrimmed) text is what ends up in the composed result.
 */
export function composeInstructions(
  global: string | undefined,
  perAgent: string | undefined,
): string | undefined {
  const hasGlobal = global !== undefined && global.trim().length > 0;
  const hasPerAgent = perAgent !== undefined && perAgent.trim().length > 0;

  if (hasGlobal && hasPerAgent) {
    return `${global}\n\n${perAgent}`;
  }
  if (hasGlobal) {
    return global;
  }
  if (hasPerAgent) {
    return perAgent;
  }
  return undefined;
}

/**
 * `routes[]` mesh-by-default + `directed[]` per-pair override (G2 Kickoff 2026-08-18 17:26
 * entry), reduced to one outbound adjacency map for `daemon.connect({sourceName, targetNames})`
 * wiring. A `directed` entry only narrows the *pair* it names to the direction(s) written; a
 * pair never mentioned by any `directed` entry in that route stays full mesh.
 *
 * This is the declared topology. `runHost` intersects it with the agents whose
 * TUI actually launched before wiring anything.
 */
export function buildRouteConnections(
  routes: readonly AioxRouteConfig[],
): Map<string, Set<string>> {
  const outbound = new Map<string, Set<string>>();

  function addEdge(from: string, to: string): void {
    let targets = outbound.get(from);
    if (!targets) {
      targets = new Set();
      outbound.set(from, targets);
    }
    targets.add(to);
  }

  for (const route of routes) {
    const directed = route.directed ?? [];
    const overriddenPairs = new Set<string>();
    for (const entry of directed) {
      for (const to of flattenTo(entry.to)) {
        overriddenPairs.add(unorderedPairKey(entry.from, to));
      }
    }

    for (let i = 0; i < route.members.length; i += 1) {
      for (let j = i + 1; j < route.members.length; j += 1) {
        const a = route.members[i]!;
        const b = route.members[j]!;
        if (overriddenPairs.has(unorderedPairKey(a, b))) {
          continue;
        }
        addEdge(a, b);
        addEdge(b, a);
      }
    }

    for (const entry of directed) {
      for (const to of flattenTo(entry.to)) {
        addEdge(entry.from, to);
      }
    }
  }

  return outbound;
}

function flattenTo(to: string | string[]): string[] {
  return Array.isArray(to) ? to : [to];
}

function unorderedPairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

// ---------------------------------------------------------------------------
// View launch consumer contract
// ---------------------------------------------------------------------------
//
// `aiox host` runs N interactive, vendor-native TUIs at once. They cannot share
// one inherited stdio — a single TTY cannot give N full-screen TUIs their own
// input focus and drawing surface — so host never spawns them itself. It
// produces one launch *request* per agent, carrying fully structured argv
// (never a shell string), and hands it to a terminal-view driver that owns the
// distinct surface/PTY the process runs in.

export interface AgentViewLaunchRequest {
  agentName: string;
  kind: AgentKind;
  /** Working directory for the vendor process (the directory `aiox.yaml` was loaded from). */
  cwd: string;
  /** Vendor binary — resolved exactly as the single-agent `aiox codex`/`aiox claude` path resolves it. */
  command: string;
  /** Structured argv. Never joined into a shell string by host, and must not be by the driver. */
  args: readonly string[];
  /** Extra env for this agent's identity. Merged over the driver's inherited environment. */
  env: Readonly<Record<string, string>>;
}

export interface AgentViewHandle {
  /** Terminate this agent's view and its vendor process. Awaited by host cleanup. */
  close(): Promise<void>;
  /**
   * Registered once by host, immediately after a successful launch. The driver
   * calls the listener when this view or its vendor process goes away for a
   * reason host did not initiate.
   */
  onLost(listener: (reason: string) => void): void;
}

/**
 * Resolves once the agent's TUI is up in its own view. That resolution *is* the
 * readiness signal for this agent's single launch attempt: a synchronous throw
 * and an asynchronous rejection are both agent-local launch failures.
 */
export type LaunchAgentView = (
  request: AgentViewLaunchRequest,
) => Promise<AgentViewHandle>;

export interface RunHostOptions {
  cwd: string;
  api: DaemonApi;
  daemonSocketPath: string;
  /**
   * Required: there is no default. A host that cannot give each agent its own
   * terminal surface must fail visibly rather than crowd N TUIs onto one stdio
   * or silently degrade to a headless session.
   */
  launchAgentView: LaunchAgentView;
  stderr?: { write(chunk: string): unknown };
  /**
   * Already loaded and semantically validated by the caller (the `aiox host`
   * entry point validates before starting the daemon — starting it is itself
   * a lifecycle side effect that must not happen on an invalid config). When
   * given, `loadConfig`/`validateConfig` below are not called. Direct callers
   * of `runHost()` (this file's own tests) that omit it get the previous
   * self-contained load-then-validate behavior.
   */
  config?: AioxConfig;
  loadConfig?: (cwd: string) => AioxConfig;
  validateConfig?: (config: AioxConfig) => void;
  checkClaudeMcpRegistration?: (input: {
    name: string;
    cwd: string;
  }) => Promise<{ registered: boolean }>;
  /** Default: `process.on("SIGINT"/"SIGTERM", ...)`. Returns an unregister function. */
  registerSignalHandlers?: (onSignal: (signal: NodeJS.Signals) => void) => () => void;
  /**
   * When the caller already owns a persistent signal handler that spans
   * steps happening BEFORE `runHost()` is even called (starting the daemon,
   * acquiring the daemon API) — the production `aiox host` entry point does,
   * so a signal during those two pending awaits is still observed instead of
   * falling through to Node's default immediate-exit behavior — it registers
   * once itself and passes the already-live controller here. `runHost()`
   * then does not register (or later unregister) its own separate OS-level
   * handler via `registerSignalHandlers` above; it only seeds its internal
   * shutdown state from `isShuttingDown()` at the start (so a signal that
   * already arrived before `runHost()` was called skips every remaining
   * agent/route/watcher side effect, same as one that arrives during
   * `runHost()`'s own execution) and subscribes to further signals via
   * `onShutdown()`. The caller is then responsible for unregistering only
   * after the promise `runHost()` returns has settled — i.e., after this
   * function's own cleanup has actually finished — so there is never a gap
   * between the caller's handler being removed and this function's own
   * handling taking over.
   */
  signal?: {
    isShuttingDown(): boolean;
    onShutdown(listener: () => void): void;
  };
  /**
   * A vendor runtime can also die inside the daemon process rather than in the
   * view host owns (a Codex app-server crash leaves the daemon row gone while
   * the surface is still there). There is no push channel over the daemon
   * socket, so noticing that means polling `api.status()` for the owned agent
   * names. Called exactly once, when the launch/route phase is over and host
   * enters its foreground wait. Returns a stop function.
   */
  watchOwnedAgents?: (input: {
    api: DaemonApi;
    ownedAgentNames: () => readonly string[];
    onLoss: (agentName: string) => void;
    stderr?: { write(chunk: string): unknown };
  }) => () => void;
}

export interface RunHostResult {
  exitCode: number;
}

interface ActiveAgent {
  name: string;
  kind: AgentKind;
  /** Null only for an agent attached just as shutdown began — no view was ever launched. */
  view: AgentViewHandle | null;
}

/**
 * `aiox host` — load and validate `aiox.yaml`, run every declared agent in its
 * own vendor-native foreground TUI, wire `routes[]` across the agents that
 * actually came up, then hold the foreground until a signal.
 *
 * Failure granularity is the point: config/validation failures are global and
 * happen before any side effect; everything after that is agent-local — one
 * agent's attach, view launch, readiness, or later loss removes only that
 * agent and never rolls back the agents already running.
 */
export async function runHost(options: RunHostOptions): Promise<RunHostResult> {
  const stderr = options.stderr ?? process.stderr;
  const loadConfig = options.loadConfig ?? loadAioxConfig;
  const validateConfig = options.validateConfig ?? validateAioxConfigSemantics;
  const checkRegistration = options.checkClaudeMcpRegistration ?? checkClaudeMcpRegistration;
  const registerSignalHandlers = options.registerSignalHandlers ?? defaultRegisterSignalHandlers;
  const watchOwnedAgents = options.watchOwnedAgents ?? defaultWatchOwnedAgents;

  const active = new Map<string, ActiveAgent>();
  // Seeded from the caller's already-live controller (if any): a signal
  // that arrived before this function was even called — e.g. while the
  // caller's own startDaemon()/getDaemonApi() were pending — must still
  // skip every attach/view-launch/connect/watch side effect below, exactly
  // like one that arrives during this function's own execution.
  let shuttingDown = options.signal?.isShuttingDown() ?? false;
  /** Any agent-local failure or connect failure. Reflected in the final exit code. */
  let degraded = false;
  let cleanupAllPromise: Promise<boolean> | null = null;
  /**
   * An agent-local loss (`view.onLost` / the liveness watcher's `onLoss`)
   * starts its own cleanup fire-and-forget from the caller's perspective, but
   * it must not actually be untracked: `cleanUpAll()` awaits every promise
   * still in this set before it resolves, so a signal arriving mid-loss never
   * lets the host return (and unregister its signal handlers) before that
   * loss's own detach has actually finished.
   */
  const pendingLossCleanups = new Set<Promise<void>>();
  let resolveForeground: (() => void) | null = null;
  const foregroundGate = new Promise<void>((resolve) => {
    resolveForeground = resolve;
  });

  function report(line: string): void {
    stderr.write(`${line}\n`);
  }

  function beginShutdown(): void {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    resolveForeground?.();
  }

  /**
   * Closes the view (when there is one) and detaches the agent from the daemon.
   * A view-close failure never skips the detach — the two effects are
   * independent — and both, plus a daemon-reported runtime dispose failure, are
   * collected so none of them is lost behind another.
   */
  async function cleanUpAgent(agent: ActiveAgent): Promise<string[]> {
    const errors: string[] = [];

    if (agent.view) {
      try {
        await agent.view.close();
      } catch (error) {
        errors.push(`view close failed for agent "${agent.name}": ${describeError(error)}`);
      }
    }

    try {
      const response = await options.api.detachAgent({ agentName: agent.name });
      if (!response.ok) {
        errors.push(`detach failed for agent "${agent.name}"`);
      } else if (response.runtimeDisposeError !== undefined) {
        errors.push(
          `runtime dispose failed for agent "${agent.name}": ${response.runtimeDisposeError}`,
        );
      }
    } catch (error) {
      errors.push(`detach failed for agent "${agent.name}": ${describeError(error)}`);
    }

    return errors;
  }

  /** One agent's view or runtime disappeared. Only that agent departs. */
  async function handleAgentLoss(agentName: string, reason: string): Promise<void> {
    const agent = active.get(agentName);
    if (!agent) {
      // Already departed, or global cleanup has taken ownership of every agent.
      return;
    }
    active.delete(agentName);
    degraded = true;
    report(`agent "${agentName}" departed: ${reason}`);
    for (const error of await cleanUpAgent(agent)) {
      report(error);
    }
  }

  /**
   * Registers a loss cleanup so `cleanUpAll()` can await it instead of racing
   * it. The caller (an `onLost`/`onLoss` listener) cannot itself be async.
   */
  function trackLossCleanup(cleanup: Promise<void>): void {
    pendingLossCleanups.add(cleanup);
    void cleanup.finally(() => {
      pendingLossCleanups.delete(cleanup);
    });
  }

  /** Runs at most once, however many signals arrive. */
  function cleanUpAll(): Promise<boolean> {
    if (cleanupAllPromise) {
      return cleanupAllPromise;
    }
    cleanupAllPromise = (async () => {
      let allOk = true;

      // Any loss cleanup already in flight — or one that starts *while this
      // function is running* — must finish before this resolves, in either
      // order relative to the signal that triggered global shutdown.
      // Snapshotting `pendingLossCleanups` exactly once is not enough: a
      // loss racing this function can register its own cleanup (deleting
      // its agent from `active` synchronously, before this function ever
      // reaches the `active` snapshot below) in the microtask gap this
      // function's own `await` yields — landing in neither a
      // one-time-snapshotted `pendingLossCleanups` array nor the `active`
      // snapshot taken after it, so it would run untracked and unawaited.
      // Looping — re-checking `pendingLossCleanups` every time this
      // function itself yields — closes that gap without an unbounded wait:
      // the loop only ever drains real, currently in-flight agent cleanups,
      // and terminates once both `pendingLossCleanups` and `active` are
      // empty at the same synchronous check (nothing new can register
      // between those two checks, since they run back to back with no
      // `await` between them).
      for (;;) {
        const pending = [...pendingLossCleanups];
        if (pending.length > 0) {
          await Promise.allSettled(pending);
          continue;
        }

        const departing = [...active.values()];
        active.clear();
        if (departing.length === 0) {
          break;
        }

        const results = await Promise.allSettled(departing.map((agent) => cleanUpAgent(agent)));
        for (const result of results) {
          if (result.status === "rejected") {
            allOk = false;
            report(`cleanup failed: ${describeError(result.reason)}`);
            continue;
          }
          for (const error of result.value) {
            allOk = false;
            report(error);
          }
        }
      }

      return allOk;
    })();
    return cleanupAllPromise;
  }

  // Registered before the very first lifecycle side effect — including the
  // config read — so a signal at any point is observed and cleaned up instead
  // of falling through to Node's default immediate-exit behavior. Unregistered
  // only in the `finally` below, after cleanup has actually finished, so a
  // second signal arriving mid-cleanup is observed too.
  //
  // When the caller already owns a live signal controller (see `signal` on
  // RunHostOptions above), this function does not register its own separate
  // OS-level handler — the caller's already covers the whole lifecycle,
  // including the part before this function was even called. It only
  // subscribes to that controller so a signal arriving during this
  // function's own execution still triggers `beginShutdown()`, and it does
  // not unregister anything itself: the caller owns that.
  let unregisterSignals: () => void;
  if (options.signal) {
    options.signal.onShutdown(() => beginShutdown());
    unregisterSignals = () => {};
  } else {
    unregisterSignals = registerSignalHandlers(() => {
      beginShutdown();
    });
  }

  try {
    let config: AioxConfig;
    if (options.config) {
      config = options.config;
    } else {
      try {
        config = loadConfig(options.cwd);
        validateConfig(config);
      } catch (error) {
        report(describeError(error));
        return { exitCode: 1 };
      }
    }

    if (config.agents.some((agent) => agent.type === "claude-code")) {
      let check: { registered: boolean };
      try {
        check = await checkRegistration({ name: CLAUDE_CHANNEL_MCP_NAME, cwd: options.cwd });
      } catch (error) {
        report(describeError(error));
        return { exitCode: 1 };
      }
      if (!check.registered) {
        report(
          "Claude AIOX MCP is not registered for this directory.\n" +
            "Run `aiox claude setup --scope <local|user|project>` first.",
        );
        return { exitCode: 1 };
      }
    }

    // From here on, an agent row/runtime/view may already exist for some
    // agent by the time anything throws — an exception below must not skip
    // `cleanUpAll()`, or it silently strands whatever already came up (the
    // outer `finally` only unregisters signal handlers, it does not clean up
    // agents). Everything the per-agent/per-route loops do not already
    // handle locally (a `view.onLost` registration throwing, the liveness
    // watcher's setup or its returned stop function throwing) is caught here
    // instead of propagating past cleanup.
    try {
      for (const agentConfig of config.agents) {
        // A signal observed while a previous agent was still attaching or
        // launching stops the loop here: no further agent is attached.
        if (shuttingDown) {
          break;
        }

        const composed = composeInstructions(
          config.instructions?.global,
          agentConfig.instructions,
        );
        const kind = mapAgentTypeToKind(agentConfig.type);

        let attachResponse: Awaited<ReturnType<DaemonApi["attachAgent"]>>;
        try {
          attachResponse = await options.api.attachAgent({
            kind,
            name: agentConfig.name,
            cwd: options.cwd,
            ...(agentConfig.role === undefined ? {} : { role: agentConfig.role }),
            ...(agentConfig.description === undefined
              ? {}
              : { description: agentConfig.description }),
            ...(composed === undefined ? {} : { instructions: composed }),
          });
        } catch (error) {
          degraded = true;
          report(`attach failed for agent "${agentConfig.name}": ${describeError(error)}`);
          continue;
        }

        if (!attachResponse.ok) {
          // Nothing was created for this agent, so there is nothing to clean
          // up: a codex attach failure already disposed its own
          // eager-started runtime and removed its row before responding —
          // report that cleanup outcome too instead of only the reason.
          degraded = true;
          const runtimeDisposeError =
            "runtimeDisposeError" in attachResponse ? attachResponse.runtimeDisposeError : undefined;
          report(
            `attach failed for agent "${agentConfig.name}": ${attachResponse.reason}` +
              (runtimeDisposeError === undefined
                ? ""
                : ` (runtime cleanup also failed: ${runtimeDisposeError})`),
          );
          continue;
        }

        // From here the agent exists in daemon state, so every exit from this
        // iteration must either keep it in `active` (cleaned up globally) or
        // detach it.
        if (shuttingDown) {
          active.set(agentConfig.name, { name: agentConfig.name, kind, view: null });
          break;
        }

        let request: AgentViewLaunchRequest;
        try {
          request = buildAgentViewLaunchRequest({
            agentName: agentConfig.name,
            kind,
            cwd: options.cwd,
            daemonSocketPath: options.daemonSocketPath,
            ...(composed === undefined ? {} : { composedInstructions: composed }),
            attachResponse,
          });
        } catch (error) {
          degraded = true;
          await reportAgentLocalLaunchFailure(agentConfig.name, kind, error);
          continue;
        }

        let view: AgentViewHandle;
        try {
          view = await options.launchAgentView(request);
        } catch (error) {
          degraded = true;
          await reportAgentLocalLaunchFailure(agentConfig.name, kind, error);
          continue;
        }

        // Registering readiness observation IS still part of this agent's
        // single launch attempt (its comment above the view/AgentViewHandle
        // type already says so) — a throw here is agent-local exactly like
        // the launch throw just above, not a reason to abandon agents that
        // already succeeded. `active.set()` only happens after this
        // succeeds, so a throw here never leaves a half-registered agent for
        // global cleanup to double-process.
        try {
          view.onLost((reason) => {
            trackLossCleanup(handleAgentLoss(agentConfig.name, reason));
          });
        } catch (error) {
          degraded = true;
          report(
            `view readiness setup failed for agent "${agentConfig.name}": ${describeError(error)}`,
          );
          for (const cleanupError of await cleanUpAgent({ name: agentConfig.name, kind, view })) {
            report(cleanupError);
          }
          continue;
        }

        active.set(agentConfig.name, { name: agentConfig.name, kind, view });
      }

      if (!shuttingDown) {
        await wireRoutes(config.routes ?? []);
      }

      if (!shuttingDown && active.size > 0) {
        const stopWatcher = watchOwnedAgents({
          api: options.api,
          ownedAgentNames: () => [...active.keys()],
          onLoss: (agentName) => {
            trackLossCleanup(handleAgentLoss(agentName, "runtime disappeared unexpectedly"));
          },
          stderr,
        });
        try {
          await foregroundGate;
        } finally {
          stopWatcher();
        }
      }
    } catch (error) {
      degraded = true;
      report(`aiox host failed: ${describeError(error)}`);
    }

    const cleanupOk = await cleanUpAll();
    return { exitCode: cleanupOk && !degraded ? 0 : 1 };
  } finally {
    unregisterSignals();
  }

  /**
   * A launch attempt failed after the daemon already had a row/runtime/token
   * for this agent. Detach that one agent, awaited, and report the launch
   * failure together with any cleanup failure so neither hides the other.
   */
  async function reportAgentLocalLaunchFailure(
    agentName: string,
    kind: AgentKind,
    launchError: unknown,
  ): Promise<void> {
    report(`TUI launch failed for agent "${agentName}": ${describeError(launchError)}`);
    for (const error of await cleanUpAgent({ name: agentName, kind, view: null })) {
      report(error);
    }
  }

  async function wireRoutes(routes: readonly AioxRouteConfig[]): Promise<void> {
    for (const [sourceName, targetNames] of buildRouteConnections(routes)) {
      if (shuttingDown) {
        break;
      }

      if (!active.has(sourceName)) {
        report(
          `route source "${sourceName}" is not running; skipping its ${targetNames.size} edge(s)`,
        );
        continue;
      }

      const skipped = [...targetNames].filter((name) => !active.has(name));
      if (skipped.length > 0) {
        report(
          `skipping route edges from "${sourceName}" to not-running agent(s): ${skipped.join(", ")}`,
        );
      }

      const reachable = [...targetNames].filter((name) => active.has(name));
      if (reachable.length === 0) {
        continue;
      }

      // A connect failure is diagnostic only: the remaining sources are still
      // wired, and no already-running TUI is torn down because of it.
      try {
        const response = await options.api.connect({ sourceName, targetNames: reachable });
        if (!response.ok) {
          degraded = true;
          report(`route wiring failed for "${sourceName}": ${response.reason}`);
        }
      } catch (error) {
        degraded = true;
        report(`route wiring failed for "${sourceName}": ${describeError(error)}`);
      }
    }
  }
}

/**
 * The per-agent vendor TUI command line. Built from the same pure argv/env
 * builders the single-agent `aiox codex` / `aiox claude` paths use, so the two
 * launch surfaces cannot drift — the only difference is that host hands the
 * result to a view driver instead of spawning it onto its own stdio.
 */
export function buildAgentViewLaunchRequest(input: {
  agentName: string;
  kind: AgentKind;
  cwd: string;
  daemonSocketPath: string;
  composedInstructions?: string;
  attachResponse: {
    codexRuntime?: { endpoint: string; activeThreadId?: string | null } | undefined;
    claudeChannelToken?: string | undefined;
  };
}): AgentViewLaunchRequest {
  if (input.kind === "codex") {
    const runtime = input.attachResponse.codexRuntime;
    if (!runtime) {
      throw new Error("attach returned no Codex runtime endpoint");
    }
    // The daemon eager-creates the thread during attach so it can carry the
    // composed instructions as `thread/start.developerInstructions` — the Codex
    // TUI argv has no instruction surface at all. The TUI must therefore resume
    // that exact thread, or the daemon's tracked thread and the one on screen
    // diverge.
    return {
      agentName: input.agentName,
      kind: input.kind,
      cwd: input.cwd,
      command: resolveCodexTuiCommand(),
      args: buildLaunchCodexTuiArgs({
        endpoint: new URL(runtime.endpoint),
        ...(runtime.activeThreadId ? { resumeSessionId: runtime.activeThreadId } : {}),
      }),
      env: {},
    };
  }

  const agentToken = input.attachResponse.claudeChannelToken;
  if (!agentToken) {
    throw new Error("attach returned no Claude channel token");
  }
  return {
    agentName: input.agentName,
    kind: input.kind,
    cwd: input.cwd,
    command: resolveClaudeCommand(),
    args: buildLaunchClaudeChannelArgs(CLAUDE_CHANNEL_MCP_NAME, input.composedInstructions),
    env: buildClaudeChannelEnv({
      agentName: input.agentName,
      agentToken,
      daemonSocketPath: input.daemonSocketPath,
    }),
  };
}

/**
 * `.on`, not `.once`: a repeated identical signal must keep being observed —
 * e.g. a second SIGINT arriving while cleanup from the first is still in
 * flight must not fall through to Node's default immediate-exit behavior.
 * `beginShutdown()` is itself idempotent, so re-invoking it on every
 * additional signal delivery is safe. Exported for direct unit testing
 * against real `process` signal delivery, the same rationale as
 * `defaultWatchOwnedAgents` below.
 */
export function defaultRegisterSignalHandlers(
  onSignal: (signal: NodeJS.Signals) => void,
): () => void {
  const handler = (signal: NodeJS.Signals): void => onSignal(signal);
  process.on("SIGINT", handler);
  process.on("SIGTERM", handler);
  return () => {
    process.off("SIGINT", handler);
    process.off("SIGTERM", handler);
  };
}

const DEFAULT_AGENT_WATCH_INTERVAL_MS = 2000;

/**
 * Exported for direct unit testing (fake timers) rather than only through
 * `runHost()`'s injection seam. A transient `api.status()` rejection (socket
 * hiccup) must not become an unhandled promise rejection — that would crash the
 * very host process this watcher exists to keep alive — so it is reported
 * through `stderr` (not `onLoss`, which means "confirmed gone") and the next
 * tick still runs (the `finally` always clears `polling`).
 */
export function defaultWatchOwnedAgents(input: {
  api: DaemonApi;
  ownedAgentNames: () => readonly string[];
  onLoss: (agentName: string) => void;
  stderr?: { write(chunk: string): unknown };
}): () => void {
  const stderr = input.stderr ?? process.stderr;
  let polling = false;
  const timer = setInterval(() => {
    const owned = input.ownedAgentNames();
    if (owned.length === 0 || polling) {
      return;
    }
    polling = true;
    (async () => {
      try {
        const status = await input.api.status();
        const present = new Set(status.agents.map((agent) => agent.name));
        for (const name of owned) {
          if (!present.has(name)) {
            input.onLoss(name);
          }
        }
      } finally {
        polling = false;
      }
    })().catch((error: unknown) => {
      stderr.write(`agent liveness poll failed: ${describeError(error)}\n`);
    });
  }, DEFAULT_AGENT_WATCH_INTERVAL_MS);
  return () => clearInterval(timer);
}

function mapAgentTypeToKind(type: AioxAgentConfig["type"]): AgentKind {
  switch (type) {
    case "codex":
      return "codex";
    case "claude-code":
      return "claude";
    default: {
      const exhaustive: never = type;
      throw new Error(`unsupported agent type: ${exhaustive as string}`);
    }
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
