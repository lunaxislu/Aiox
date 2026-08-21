import type { ChildProcess } from "node:child_process";

import type { ParsedCommand } from "./parse.js";
import {
  runHost,
  defaultRegisterSignalHandlers,
  type LaunchAgentView,
  type RunHostOptions,
  type RunHostResult,
} from "./host.js";
import type { DaemonApi } from "../daemon/api.js";
import type { StopRequest } from "../daemon/state.js";
import { loadAioxConfig, type AioxConfig } from "../config/aiox-config.js";
import { validateAioxConfigSemantics } from "../config/aiox-config-validator.js";
import type { ClaudeMcpScope } from "../core/claude-mcp-scope.js";
import { launchCodexTui } from "../adapters/codex/launcher.js";
import { runCodexIngressMcpServer } from "../adapters/codex/mcp-server.js";
import { runClaudeChannelMcpServer } from "../adapters/claude/channel-server.js";
import {
  launchClaudeStaticMcpChannel,
  buildClaudeStaticMcpConfig,
  type ClaudeStaticMcpConfigInput,
} from "../adapters/claude/launcher.js";
import {
  checkClaudeMcpRegistration,
  type ClaudeMcpRegistrationCheck,
} from "../adapters/claude/mcp-cli.js";
import {
  setupClaudeMcp,
  type SetupClaudeMcpInput,
  type SetupClaudeMcpResult,
} from "../adapters/claude/mcp-setup.js";
import { runDaemonProcess } from "../daemon/run.js";
import { formatDaemonStatus, formatDoctor, formatStatus } from "./format.js";

// Static MCP identity (the sole `aiox claude` runtime path). One name
// shared by `aiox claude setup` (registration), the launch-time registration
// gate, and the launcher that activates `server:<name>` — so provisioning,
// the gate, and activation never drift.
const CLAUDE_CHANNEL_MCP_NAME = "aiox-claude-ingress";

export type DaemonStatusInfo =
  | {
      running: true;
      pid: number;
      socketPath: string;
      dbPath: string;
      startedAt: string;
      version: string;
    }
  | {
      running: false;
      socketPath: string;
      dbPath: string;
      version: string;
    };

export interface DoctorCheck {
  name: string;
  status: "ok" | "error";
  detail?: string;
}

export interface DoctorResult {
  checks: DoctorCheck[];
}

export interface InvocationRuntime {
  getDaemonApi(): DaemonApi | Promise<DaemonApi>;
  dispose?(): void | Promise<void>;
  startDaemon(): unknown | Promise<unknown>;
  stopDaemon(request: StopRequest): unknown | Promise<unknown>;
  restartDaemon(): unknown | Promise<unknown>;
  daemonStatus(): DaemonStatusInfo | Promise<DaemonStatusInfo>;
  doctor(): DoctorResult | Promise<DoctorResult>;
  daemonSocketPath?(): string;
}

export interface InvocationOptions {
  runtime: InvocationRuntime;
  cwd: string;
  launchCodexTui?: (options: {
    endpoint: URL;
    resumeSessionId?: string;
  }) => ChildProcess;
  // Static MCP launcher (the sole `aiox claude` runtime path): activates
  // `server:<name>` using a pre-registered effective MCP definition
  // (`aiox claude setup`). Gated by requireClaudeMcpRegistration below,
  // which runs before any daemon/attach side effect.
  launchClaudeStaticMcpChannel?: (options: {
    channelName: string;
    agentName: string;
    agentToken: string;
    daemonSocketPath: string;
    instructions?: string;
  }) => ChildProcess;
  // Static MCP injection points: the launch-time registration gate
  // (`aiox claude`) and the `aiox claude setup` orchestrator + the JSON
  // definition it registers. All default to the real adapter; tests inject
  // them so neither command flow touches a live `claude` or the real
  // ~/.claude.json.
  checkClaudeMcpRegistration?: (options: {
    name: string;
    cwd: string;
  }) => Promise<ClaudeMcpRegistrationCheck>;
  buildClaudeStaticMcpConfig?: (
    input: ClaudeStaticMcpConfigInput,
  ) => string;
  setupClaudeMcp?: (input: SetupClaudeMcpInput) => Promise<SetupClaudeMcpResult>;
  runCodexMcpServer?: () => Promise<void>;
  runClaudeMcpServer?: () => Promise<void>;
  runDaemonProcessFn?: (socketPath: string) => Promise<void>;
  // `aiox host`: config load + semantic validation gate, run before the daemon
  // is started (W6 revision 5 Execution order step 1 — starting the daemon is
  // itself a lifecycle side effect and must not happen on an invalid config).
  // Default to the real implementations; tests inject fakes so this gate
  // never touches the real filesystem.
  loadAioxConfig?: (cwd: string) => AioxConfig;
  validateAioxConfigSemantics?: (config: AioxConfig) => void;
  // `aiox host`: defaults to the real runHost(). Overridable so tests never
  // spawn a live `claude`/`codex` or poll a real daemon.
  runHostFn?: (options: RunHostOptions) => Promise<RunHostResult>;
  /**
   * The terminal-view driver `aiox host` hands each agent's TUI launch request
   * to. There is no built-in default — see `resolveAgentViewLauncher` below.
   */
  launchAgentView?: LaunchAgentView;
  /**
   * `aiox host`: registers the persistent SIGINT/SIGTERM handler that must
   * already be observing before startDaemon()/getDaemonApi() even begin, so
   * a signal arriving while either is pending is not lost to Node's default
   * immediate-exit behavior. Defaults to the real OS-level
   * `defaultRegisterSignalHandlers` from host.ts; tests inject a fake so
   * they can fire a synthetic signal without touching real `process`
   * listeners.
   */
  registerSignalHandlers?: (onSignal: (signal: NodeJS.Signals) => void) => () => void;
}

export interface InvocationResult {
  exitCode: number;
  stdout?: string;
}

export class InvocationError extends Error {
  readonly code: string;
  readonly exitCode: number;

  constructor(message: string, options: { code: string; exitCode: number }) {
    super(message);
    this.name = "InvocationError";
    this.code = options.code;
    this.exitCode = options.exitCode;
  }
}

export async function invokeParsedCommand(
  command: ParsedCommand,
  options: InvocationOptions,
): Promise<InvocationResult> {
  switch (command.kind) {
    case "daemon-start":
      ensureOk(await options.runtime.startDaemon());
      return {
        exitCode: 0,
        stdout: formatDaemonStatus(await options.runtime.daemonStatus()),
      };
    case "daemon-stop":
      ensureOk(await options.runtime.stopDaemon({ daemonOnly: command.daemonOnly }));
      return success();
    case "daemon-restart":
      ensureOk(await options.runtime.restartDaemon());
      return success();
    case "daemon-status":
      return {
        exitCode: 0,
        stdout: formatDaemonStatus(await options.runtime.daemonStatus()),
      };
    case "help":
      return { exitCode: 0, stdout: command.text };
    case "version":
      return { exitCode: 0, stdout: `${command.value}\n` };
    case "agent-attach": {
      // Static MCP gate: an effective registration is a prerequisite of the
      // spawned `claude`'s own MCP resolution, not of the daemon/agent attach
      // below, so it must fail BEFORE startDaemon/attachAgent/token issuance
      // — never after, and never with a silent fallback.
      if (command.agentKind === "claude") {
        await requireClaudeMcpRegistration(options);
      }
      // PRD: "Auto-start daemon if needed" for agent attach commands.
      await options.runtime.startDaemon();
      const api = await options.runtime.getDaemonApi();
      const response = await api.attachAgent({
        kind: command.agentKind,
        name: command.name,
        cwd: options.cwd,
        ...(command.pairName === undefined ? {} : { pairName: command.pairName }),
        ...(command.resumeSessionId === undefined
          ? {}
          : { resumeSessionId: command.resumeSessionId }),
        ...(command.role === undefined ? {} : { role: command.role }),
        ...(command.description === undefined ? {} : { description: command.description }),
        ...(command.instructions === undefined ? {} : { instructions: command.instructions }),
      });
      ensureOk(response);
      if (command.agentKind === "codex" && response.ok && response.codexRuntime) {
        const child = await launchTuiOrCleanUp({
          api,
          agentName: command.name,
          endpoint: new URL(response.codexRuntime.endpoint),
          // Daemon now eager-creates a thread on every no-resume attach (W6): the
          // TUI must resume that same thread, or the daemon's tracked threadId
          // and the TUI's actual thread diverge.
          resumeSessionId: command.resumeSessionId ?? response.codexRuntime.activeThreadId ?? undefined,
          launch: options.launchCodexTui ?? launchCodexTui,
        });
        let tuiExit: { exitCode: number | null; signal: string | null };
        try {
          tuiExit = await waitForTuiExit(child);
        } catch (error) {
          await cleanUpAfterTuiFailure(api, command.name, error);
          throw error;
        }
        await api.notifyTuiExited({
          agentName: command.name,
          exitCode: tuiExit.exitCode,
          signal: tuiExit.signal,
        });
        return { exitCode: tuiExit.exitCode ?? (tuiExit.signal ? 1 : 0) };
      }
      if (command.agentKind === "claude" && response.ok && response.claudeChannelToken) {
        const socketPath = options.runtime.daemonSocketPath?.();
        const agentToken = response.claudeChannelToken;
        if (!socketPath) {
          throw new InvocationError("Claude channel requires a daemon socket path", {
            code: "aiox.invocation.missing_daemon_socket_path",
            exitCode: 1,
          });
        }
        // dev-channel server:<name> resolves the aiox channel MCP from the
        // pre-registered static definition. Same name shared by
        // `aiox claude setup`, requireClaudeMcpRegistration, and this
        // launcher so registration, the gate, and activation never drift.
        const channelName = CLAUDE_CHANNEL_MCP_NAME;
        const child = await launchChildOrCleanUp({
          api,
          agentName: command.name,
          launch: () =>
            (options.launchClaudeStaticMcpChannel ?? launchClaudeStaticMcpChannel)({
              channelName,
              agentName: command.name,
              agentToken,
              daemonSocketPath: socketPath,
              ...(command.instructions === undefined
                ? {}
                : { instructions: command.instructions }),
            }),
        });
        let tuiExit: { exitCode: number | null; signal: string | null };
        try {
          tuiExit = await waitForTuiExit(child);
        } catch (error) {
          await cleanUpAfterTuiFailure(api, command.name, error);
          throw error;
        }
        await api.disconnectClaudeChannel({ agentName: command.name });
        return { exitCode: tuiExit.exitCode ?? (tuiExit.signal ? 1 : 0) };
      }
      return success();
    }
    case "connect": {
      const api = await options.runtime.getDaemonApi();
      const response = await api.connect({
        sourceName: command.sourceName,
        targetNames: command.targetNames,
      });
      ensureOk(response);
      return success();
    }
    case "pair-create": {
      const api = await options.runtime.getDaemonApi();
      const response = await api.createPair({ name: command.name });
      ensureOk(response);
      return success();
    }
    case "host": {
      // Config load + semantic validation is the first prerequisite check —
      // it must fail before view-driver resolution, before the daemon is
      // started, and before the daemon API is acquired. None of those later
      // steps have run yet, so nothing needs cleaning up on failure here.
      const loadConfig = options.loadAioxConfig ?? loadAioxConfig;
      const validateConfig = options.validateAioxConfigSemantics ?? validateAioxConfigSemantics;
      let config: AioxConfig;
      try {
        config = loadConfig(options.cwd);
        validateConfig(config);
      } catch (error) {
        throw new InvocationError(error instanceof Error ? error.message : String(error), {
          code: "aiox.invocation.host_config_invalid",
          exitCode: 1,
        });
      }
      // View-driver resolution is synchronous and has no side effect of its
      // own, but — same ordering rule as the Claude MCP gate above — a
      // prerequisite the host cannot satisfy must still fail before any
      // daemon/attach side effect, so it runs here, after config validation
      // and before the daemon starts.
      const launchAgentView = resolveAgentViewLauncher(options);

      // Registered before the daemon starts — the daemon start and daemon
      // API acquisition just below are each a real pending await, and a
      // signal arriving during either must still be observed instead of
      // falling through to Node's default immediate-exit behavior, and must
      // stop every later lifecycle side effect (API acquisition, agent
      // attach, view launch, route connect) from starting. Unregistered only
      // in the `finally` below, after runHost()'s own cleanup — which is
      // handed this same controller instead of registering its own separate
      // handler (see `signal` on RunHostOptions) — has actually finished, so
      // there is never a gap between this handler being removed and
      // runHost's own handling taking over, and a second (or cross) signal
      // arriving at any point is still observed exactly once each.
      const registerSignalHandlers = options.registerSignalHandlers ?? defaultRegisterSignalHandlers;
      let shuttingDown = false;
      const shutdownListeners: Array<() => void> = [];
      const unregisterSignals = registerSignalHandlers(() => {
        if (shuttingDown) {
          return;
        }
        shuttingDown = true;
        for (const listener of shutdownListeners.splice(0)) {
          listener();
        }
      });

      try {
        // PRD: "Auto-start daemon if needed", same as agent-attach.
        await options.runtime.startDaemon();
        if (shuttingDown) {
          return { exitCode: 0 };
        }

        const api = await options.runtime.getDaemonApi();
        if (shuttingDown) {
          return { exitCode: 0 };
        }

        const socketPath = options.runtime.daemonSocketPath?.();
        if (!socketPath) {
          throw new InvocationError("aiox host requires a daemon socket path", {
            code: "aiox.invocation.missing_daemon_socket_path",
            exitCode: 1,
          });
        }
        const run = options.runHostFn ?? runHost;
        const result = await run({
          cwd: options.cwd,
          api,
          daemonSocketPath: socketPath,
          launchAgentView,
          config,
          signal: {
            isShuttingDown: () => shuttingDown,
            onShutdown: (listener) => {
              shutdownListeners.push(listener);
            },
          },
        });
        return { exitCode: result.exitCode };
      } finally {
        unregisterSignals();
      }
    }
    case "status": {
      const api = await options.runtime.getDaemonApi();
      return { exitCode: 0, stdout: formatStatus(await api.status()) };
    }
    case "global-stop":
      ensureOk(await options.runtime.stopDaemon({ daemonOnly: false }));
      return success();
    case "doctor":
      return doctorResult(await options.runtime.doctor());
    case "mcp-codex": {
      const run = options.runCodexMcpServer ?? runCodexIngressMcpServer;
      await run();
      return success();
    }
    case "mcp-claude": {
      const run = options.runClaudeMcpServer ?? runClaudeChannelMcpServer;
      await run();
      return success();
    }
    case "claude-mcp-setup":
      return claudeMcpSetupResult(command.scope, options);
    case "_run-daemon": {
      const runFn = options.runDaemonProcessFn ?? runDaemonProcess;
      await runFn(command.socketPath);
      return success();
    }
    default:
      return assertNever(command);
  }
}

// `aiox claude setup`: non-overwriting provisioning of the static Claude MCP
// definition at the requested scope. `aiox claude` accepts any effective
// Local, User, or Project registration. Standalone provisioning (no
// daemon).
async function claudeMcpSetupResult(
  scope: ClaudeMcpScope,
  options: InvocationOptions,
): Promise<InvocationResult> {
  const setup = options.setupClaudeMcp ?? setupClaudeMcp;
  const buildDefinition =
    options.buildClaudeStaticMcpConfig ?? buildClaudeStaticMcpConfig;

  let result: SetupClaudeMcpResult;
  try {
    result = await setup({
      name: CLAUDE_CHANNEL_MCP_NAME,
      json: buildDefinition({}),
      cwd: options.cwd,
      scope,
    });
  } catch (error) {
    throw new InvocationError(error instanceof Error ? error.message : String(error), {
      code: "aiox.invocation.claude_mcp_setup_failed",
      exitCode: 1,
    });
  }

  if (!result.ok) {
    throw new InvocationError(result.message, {
      code: `aiox.invocation.claude_mcp_setup.${result.code}`,
      exitCode: 1,
    });
  }
  return {
    exitCode: 0,
    stdout: `aiox Claude MCP registered (scope: ${scope}, name: ${CLAUDE_CHANNEL_MCP_NAME}).\n`,
  };
}

// Static MCP launch-time gate. Runs BEFORE startDaemon/attachAgent/token
// issuance (R3B product requirement): a missing effective registration must
// never reach a daemon or token side effect.
async function requireClaudeMcpRegistration(
  options: InvocationOptions,
): Promise<void> {
  const check = options.checkClaudeMcpRegistration ?? checkClaudeMcpRegistration;

  let result: ClaudeMcpRegistrationCheck;
  try {
    result = await check({ name: CLAUDE_CHANNEL_MCP_NAME, cwd: options.cwd });
  } catch (error) {
    throw new InvocationError(error instanceof Error ? error.message : String(error), {
      code: "aiox.invocation.claude_mcp_registration_check_failed",
      exitCode: 1,
    });
  }

  if (!result.registered) {
    throw new InvocationError(
      "Claude AIOX MCP is not registered for this directory.\n" +
        "Run `aiox claude setup --scope <local|user|project>` first.",
      { code: "aiox.invocation.claude_mcp_not_registered", exitCode: 1 },
    );
  }
}

/**
 * `aiox host` runs N interactive TUIs at once, so each one needs its own
 * terminal surface/PTY. No installed, structured-argv terminal-view driver is
 * wired in yet (view-driver generalization is a later plan stage), so this
 * refuses the command outright instead of crowding N TUIs onto one inherited
 * stdio or silently degrading to headless sessions. Tests and the future
 * driver inject `launchAgentView`.
 */
function resolveAgentViewLauncher(options: InvocationOptions): LaunchAgentView {
  if (options.launchAgentView) {
    return options.launchAgentView;
  }
  throw new InvocationError(
    "aiox host cannot start: no terminal view driver is available.\n" +
      "Each agent needs its own terminal surface to run its vendor TUI, and this build has no driver wired in.",
    { code: "aiox.invocation.no_agent_view_driver", exitCode: 1 },
  );
}

async function launchChildOrCleanUp(input: {
  api: DaemonApi;
  agentName: string;
  launch: () => ChildProcess;
}): Promise<ChildProcess> {
  try {
    return input.launch();
  } catch (error) {
    return cleanUpAfterTuiFailure(input.api, input.agentName, error);
  }
}

async function launchTuiOrCleanUp(input: {
  api: DaemonApi;
  agentName: string;
  endpoint: URL;
  resumeSessionId?: string;
  launch: (options: {
    endpoint: URL;
    resumeSessionId?: string;
  }) => ChildProcess;
}): Promise<ChildProcess> {
  try {
    return input.launch({
      endpoint: input.endpoint,
      ...(input.resumeSessionId === undefined
        ? {}
        : { resumeSessionId: input.resumeSessionId }),
    });
  } catch (error) {
    return cleanUpAfterTuiFailure(input.api, input.agentName, error);
  }
}

// The daemon eager-creates the Codex runtime as part of attach (no-resume), so
// by the time the TUI spawn or exit-wait fails, that runtime is already
// `ready`. `detachAgent()` disposes the runtime and removes the agent/routes
// unconditionally regardless of runtime state, so it is the primitive this
// failure path needs — for the Claude path too, where a fire-and-forget
// rollback would leave the caller unable to see whether cleanup happened at
// all. Cleanup is always awaited, and a cleanup failure — including a runtime
// that rejected on dispose — is reported alongside the original launch error
// rather than swallowed or masking it.
async function cleanUpAfterTuiFailure(
  api: DaemonApi,
  agentName: string,
  launchError: unknown,
): Promise<never> {
  let cleanupFailure: string | undefined;
  try {
    const response = await api.detachAgent({ agentName });
    if (response.ok && response.runtimeDisposeError !== undefined) {
      cleanupFailure = response.runtimeDisposeError;
    }
  } catch (error) {
    cleanupFailure = error instanceof Error ? error.message : String(error);
  }

  const launchMessage = launchError instanceof Error ? launchError.message : String(launchError);
  const message =
    cleanupFailure === undefined
      ? launchMessage
      : `${launchMessage} (cleanup also failed: ${cleanupFailure})`;

  throw new InvocationError(message, {
    code: "aiox.invocation.tui_launch_failed",
    exitCode: 1,
  });
}

async function waitForTuiExit(
  child: ChildProcess,
): Promise<{ exitCode: number | null; signal: string | null }> {
  return new Promise((resolve, reject) => {
    let settled = false;

    function finish(result: { exitCode: number | null; signal: string | null }): void {
      if (settled) {
        return;
      }
      settled = true;
      child.off("error", onError);
      resolve(result);
    }

    function onError(error: Error): void {
      if (settled) {
        return;
      }
      settled = true;
      child.off("exit", onExit);
      reject(
        new InvocationError(error.message, {
          code: "aiox.invocation.tui_launch_failed",
          exitCode: 1,
        }),
      );
    }

    function onExit(exitCode: number | null, signal: NodeJS.Signals | null): void {
      finish({ exitCode, signal });
    }

    child.once("error", onError);
    child.once("exit", onExit);
  });
}

function success(): InvocationResult {
  return { exitCode: 0 };
}

function doctorResult(result: DoctorResult): InvocationResult {
  return {
    exitCode: result.checks.some((check) => check.status === "error") ? 1 : 0,
    stdout: formatDoctor(result),
  };
}

function ensureOk(response: unknown): void {
  if (!isFailureResponse(response)) {
    return;
  }

  throw new InvocationError(`Invocation failed: ${response.reason}`, {
    code: `aiox.invocation.${response.reason}`,
    exitCode: 1,
  });
}

function isFailureResponse(response: unknown): response is { ok: false; reason: string } {
  return (
    typeof response === "object" &&
    response !== null &&
    "ok" in response &&
    response.ok === false &&
    "reason" in response &&
    typeof response.reason === "string"
  );
}

function assertNever(value: never): never {
  throw new InvocationError(`Unhandled command: ${JSON.stringify(value)}`, {
    code: "aiox.invocation.unhandled_command",
    exitCode: 1,
  });
}
