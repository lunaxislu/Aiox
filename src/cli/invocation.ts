import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";

import type { ParsedCommand } from "./parse.js";
import { composeInstructions, mapAgentTypeToKind } from "./host.js";
import type { DaemonApi } from "../daemon/api.js";
import type { StopRequest } from "../daemon/state.js";
import { loadAioxConfig, type AioxConfig, type AioxRouteConfig } from "../config/aiox-config.js";
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
import { normalizeHostDeclaration, normalizeHostMutation } from "./host-command.js";
import type { HostAgentDeclaration } from "../daemon/host-runtime.js";
import type { HostRouteOperation } from "../host/host-route-topology.js";
import {
  createAdapterRegistry,
  type AdapterRegistry,
} from "../host/adapter-registry.js";
import {
  createHostController,
  selectAndStaticPreflightAdapter,
  type HostController,
  type StartHostControllerResult,
} from "../host/host-controller.js";
import type { AgentRuntimeTerminator } from "../host/agent-runtime-terminator.js";
import { createProductionAgentRuntimeTerminator } from "../host/production-agent-runtime-terminator.js";
import { formatHostIntegrationFailureMessage } from "../host/host-integration-diagnostics.js";
import {
  defaultStartHostForegroundLoop,
  type StartHostForegroundLoop,
} from "../host/host-foreground-loop.js";

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
  /** Test seam for advancing one existing relay-result poll without real time. */
  pollHostControlResult?: () => void | Promise<void>;
  // Hosted agent CLI (W6 Stage 5D Blocker 4): the poll interval/sleep for the
  // termination-intent watch loop `waitForHostedTuiExit` runs alongside
  // waiting for the vendor's own exit. Defaults are the real interval/timer;
  // tests inject small/fake values so they never depend on real elapsed time.
  hostedTerminationWatchIntervalMs?: number;
  hostedTerminationWatchSleep?: (ms: number) => Promise<void>;
  // `aiox host new`: production composition seams (W6 Stage 5D). Defaults are
  // the real implementations -- an `AdapterRegistry` with nothing registered
  // (Category A/B/C are Stage 7-9, so real production has no adapter yet, and
  // `start()` must fail honestly at `static_preflight` rather than a
  // placeholder success) and the real intent/ack-based `AgentRuntimeTerminator`.
  // Tests inject a registry pre-loaded with a `FakeHostAdapter` and/or a fake
  // terminator so the foreground loop's own machinery can be exercised
  // without a live vendor process.
  createAdapterRegistry?: () => AdapterRegistry;
  createAgentRuntimeTerminator?: (api: DaemonApi) => AgentRuntimeTerminator;
  createHostControllerId?: () => string;
  /** `aiox host new`'s foreground reconcile/control-request loop driver. */
  startHostForegroundLoop?: StartHostForegroundLoop;
  hostForegroundLoopIntervalMs?: number;
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
        ...(command.hostId === undefined ? {} : { hostId: command.hostId }),
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
          hostId: command.hostId,
          endpoint: new URL(response.codexRuntime.endpoint),
          // Daemon now eager-creates a thread on every no-resume attach (W6): the
          // TUI must resume that same thread, or the daemon's tracked threadId
          // and the TUI's actual thread diverge.
          resumeSessionId: command.resumeSessionId ?? response.codexRuntime.activeThreadId ?? undefined,
          launch: options.launchCodexTui ?? launchCodexTui,
        });
        let tuiExit: { exitCode: number | null; signal: string | null };
        try {
          tuiExit =
            command.hostId === undefined
              ? await waitForTuiExit(child)
              : await waitForHostedTuiExit(
                  child,
                  async () => {
                    ensureOk(
                      await api.markHostAgentReady({
                        hostId: command.hostId!,
                        agentName: command.name,
                      }),
                    );
                  },
                  {
                    api,
                    hostId: command.hostId,
                    agentName: command.name,
                    ...(options.hostedTerminationWatchIntervalMs === undefined
                      ? {}
                      : { pollIntervalMs: options.hostedTerminationWatchIntervalMs }),
                    ...(options.hostedTerminationWatchSleep === undefined
                      ? {}
                      : { sleep: options.hostedTerminationWatchSleep }),
                  },
                );
        } catch (error) {
          if (command.hostId !== undefined) {
            stopHostedTuiAfterLifecycleFailure(child);
          }
          await cleanUpAfterTuiFailure(api, command.name, command.hostId, error);
          throw error;
        }
        await api.notifyTuiExited({
          agentName: command.name,
          ...(command.hostId === undefined ? {} : { hostId: command.hostId }),
          exitCode: tuiExit.exitCode,
          signal: tuiExit.signal,
        });
        return { exitCode: tuiExit.exitCode ?? (tuiExit.signal ? 1 : 0) };
      }
      if (command.agentKind === "claude" && response.ok && response.claudeChannelToken) {
        const socketPath = options.runtime.daemonSocketPath?.();
        const agentToken = response.claudeChannelToken;
        if (!socketPath) {
          const missingSocketError = new InvocationError(
            "Claude channel requires a daemon socket path",
            {
              code: "aiox.invocation.missing_daemon_socket_path",
              exitCode: 1,
            },
          );
          const cleanupFailure = await cleanUpAttachedAgent(
            api,
            command.name,
            command.hostId,
          );
          if (cleanupFailure !== undefined) {
            throw new InvocationError(
              `${missingSocketError.message} (cleanup also failed: ${cleanupFailure})`,
              { code: missingSocketError.code, exitCode: missingSocketError.exitCode },
            );
          }
          throw missingSocketError;
        }
        // dev-channel server:<name> resolves the aiox channel MCP from the
        // pre-registered static definition. Same name shared by
        // `aiox claude setup`, requireClaudeMcpRegistration, and this
        // launcher so registration, the gate, and activation never drift.
        const channelName = CLAUDE_CHANNEL_MCP_NAME;
        const child = await launchChildOrCleanUp({
          api,
          agentName: command.name,
          hostId: command.hostId,
          launch: () =>
            (options.launchClaudeStaticMcpChannel ?? launchClaudeStaticMcpChannel)({
              channelName,
              agentName: command.name,
              agentToken,
              daemonSocketPath: socketPath,
              ...(command.hostId === undefined ? {} : { hostId: command.hostId }),
              ...(command.instructions === undefined
                ? {}
                : { instructions: command.instructions }),
            }),
        });
        let tuiExit: { exitCode: number | null; signal: string | null };
        try {
          tuiExit =
            command.hostId === undefined
              ? await waitForTuiExit(child)
              : await waitForHostedTuiExit(
                  child,
                  async () => {
                    ensureOk(
                      await api.markHostAgentReady({
                        hostId: command.hostId!,
                        agentName: command.name,
                      }),
                    );
                  },
                  {
                    api,
                    hostId: command.hostId,
                    agentName: command.name,
                    ...(options.hostedTerminationWatchIntervalMs === undefined
                      ? {}
                      : { pollIntervalMs: options.hostedTerminationWatchIntervalMs }),
                    ...(options.hostedTerminationWatchSleep === undefined
                      ? {}
                      : { sleep: options.hostedTerminationWatchSleep }),
                  },
                );
        } catch (error) {
          if (command.hostId !== undefined) {
            stopHostedTuiAfterLifecycleFailure(child);
          }
          await cleanUpAfterTuiFailure(api, command.name, command.hostId, error);
          throw error;
        }
        await api.disconnectClaudeChannel({
          agentName: command.name,
          ...(command.hostId === undefined ? {} : { hostId: command.hostId }),
        });
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
      // `--path`, when given, is the config-load/adapter-cwd/controller path
      // used consistently everywhere below -- same as host-add/host-remove/
      // host-route, this is passed through as-is (no relative-path resolve).
      const path = command.path ?? options.cwd;

      // Config load + semantic validation is the first prerequisite check —
      // it must fail before the daemon is started or the adapter is selected.
      // None of those later steps have run yet, so nothing needs cleaning up
      // on failure here.
      const loadConfig = options.loadAioxConfig ?? loadAioxConfig;
      const validateConfig = options.validateAioxConfigSemantics ?? validateAioxConfigSemantics;
      let config: AioxConfig;
      try {
        config = loadConfig(path);
        validateConfig(config);
      } catch (error) {
        throw new InvocationError(error instanceof Error ? error.message : String(error), {
          code: "aiox.invocation.host_config_invalid",
          exitCode: 1,
        });
      }

      // `aiox host <name> --path <p>` names the host it expects to run. This
      // is a pure local comparison against the config already loaded above —
      // no daemon/adapter side effect has happened yet, so a mismatch fails
      // here, before any of that starts.
      if (command.name !== undefined && command.name !== config.project) {
        throw new InvocationError(
          `aiox host "${command.name}" does not match aiox.yaml project "${config.project}" at "${path}"`,
          { code: "aiox.invocation.host_name_mismatch", exitCode: 1 },
        );
      }

      const agents: HostAgentDeclaration[] = config.agents.map((agent) => {
        const instructions = composeInstructions(config.instructions?.global, agent.instructions);
        return {
          name: agent.name,
          kind: mapAgentTypeToKind(agent.type),
          ...(agent.role === undefined ? {} : { role: agent.role }),
          ...(agent.description === undefined ? {} : { description: agent.description }),
          ...(instructions === undefined ? {} : { instructions }),
        };
      });
      const routes: HostRouteOperation[] = buildHostRouteOperationsFromConfig(config.routes ?? []);

      // Same failure contract as `host-new` (Blocker 2 correction): adapter
      // selection + static preflight must run — and fully resolve — BEFORE
      // any daemon side effect (`startDaemon()` can fork a real OS process).
      const registry = (options.createAdapterRegistry ?? createAdapterRegistry)();
      const adapterSelection = await selectAndStaticPreflightAdapter(registry, { cwd: path });
      if (!adapterSelection.ok) {
        throw new InvocationError(
          formatHostIntegrationFailureMessage(
            {
              stage: adapterSelection.stage,
              reason: adapterSelection.reason,
            },
            "aiox host",
          ),
          { code: "aiox.invocation.host_static_preflight_failed", exitCode: 1 },
        );
      }

      await options.runtime.startDaemon();
      const api = await options.runtime.getDaemonApi();

      const terminator = (
        options.createAgentRuntimeTerminator ??
        ((daemonApi: DaemonApi) => createProductionAgentRuntimeTerminator({ api: daemonApi }))
      )(api);
      const createId = options.createHostControllerId ?? (() => randomUUID());
      const controller: HostController = createHostController({ api, terminator, createId });

      const startResult = await controller.start({
        name: config.project,
        path,
        agents,
        ...(routes.length > 0 ? { routes } : {}),
        preparedAdapter: adapterSelection.preparedAdapter,
      });
      if (!startResult.ok) {
        throw new InvocationError(describeHostStartFailure(startResult, "aiox host"), {
          code: "aiox.invocation.host_failed",
          exitCode: 1,
        });
      }

      const startLoop = options.startHostForegroundLoop ?? defaultStartHostForegroundLoop;
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const stop = startLoop({
          controller,
          ...(options.hostForegroundLoopIntervalMs === undefined
            ? {}
            : { intervalMs: options.hostForegroundLoopIntervalMs }),
          onTerminated: () => {
            if (settled) return;
            settled = true;
            stop();
            resolve();
          },
          onFatalError: (error) => {
            if (settled) return;
            settled = true;
            stop();
            reject(
              new InvocationError(
                `aiox host foreground loop failed: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                { code: "aiox.invocation.host_foreground_loop_failed", exitCode: 1 },
              ),
            );
          },
        });
      });

      return { exitCode: 0 };
    }
    // W6 Stage 2 parses and normalizes these (see src/cli/host-command.ts), and
    // Stage 3-4 provide the runtime/controller seams. Stage 5 still needs to
    // connect management invocation end to end, so fail honestly instead of a
    // placeholder success that would imply daemon/DB/surface side effects.
    case "host-add":
    case "host-remove":
    case "host-route": {
      const mutation = normalizeHostMutation(command);
      const api = await options.runtime.getDaemonApi();
      const payload =
        mutation.kind === "host-add"
          ? {
              agents: mutation.agents,
              ...(mutation.routes === undefined ? {} : { routes: mutation.routes }),
            }
          : mutation.kind === "host-remove"
            ? { agentNames: mutation.agentNames }
            : { routes: mutation.routes };
      const submitted = await api.submitHostControlRequest({
        name: mutation.name,
        ...(mutation.path === undefined ? {} : { path: mutation.path }),
        kind:
          mutation.kind === "host-add"
            ? "host_add"
            : mutation.kind === "host-remove"
              ? "host_remove"
              : "host_route",
        payload,
      });
      if (!submitted.ok) {
        return structuredHostResult(submitted);
      }
      const result = await waitForHostControlResult(
        api,
        submitted.requestId,
        options.pollHostControlResult,
      );
      return structuredHostResult(result);
    }
    case "host-list": {
      await options.runtime.startDaemon();
      const api = await options.runtime.getDaemonApi();
      const result = await api.listRunningHosts();
      return structuredHostResult(result as unknown as Record<string, unknown>);
    }
    case "host-new": {
      // Reuses the existing YAML structural/semantic validators as-is (§7 of
      // the accepted grammar contract) -- must fail before any daemon/host
      // side effect, same ordering rule as the plain `host` case's config gate.
      normalizeHostDeclaration(command);

      // Blocker 2 correction: the accepted failure contract requires adapter
      // selection + static preflight to run -- and fully resolve -- BEFORE
      // any daemon side effect (`startDaemon()` can fork a real OS process).
      // `HostController` cannot be constructed without a live `DaemonApi`,
      // so this registry/adapter resolution happens standalone, ahead of
      // `startDaemon()`, and the resolved adapter is handed to `start()` so
      // static preflight is never run a second time.
      const registry = (options.createAdapterRegistry ?? createAdapterRegistry)();
      const adapterSelection = await selectAndStaticPreflightAdapter(registry, {
        cwd: options.cwd,
      });
      if (!adapterSelection.ok) {
        throw new InvocationError(
          formatHostIntegrationFailureMessage(
            {
              stage: adapterSelection.stage,
              reason: adapterSelection.reason,
            },
            "aiox host new",
          ),
          { code: "aiox.invocation.host_new_static_preflight_failed", exitCode: 1 },
        );
      }

      await options.runtime.startDaemon();
      const api = await options.runtime.getDaemonApi();

      const terminator = (
        options.createAgentRuntimeTerminator ??
        ((daemonApi: DaemonApi) => createProductionAgentRuntimeTerminator({ api: daemonApi }))
      )(api);
      const createId = options.createHostControllerId ?? (() => randomUUID());
      const controller: HostController = createHostController({
        api,
        terminator,
        createId,
      });

      const agents: HostAgentDeclaration[] = command.agents.map((agent) => ({
        name: agent.name,
        kind: agent.agentKind,
        ...(agent.role === undefined ? {} : { role: agent.role }),
        ...(agent.description === undefined ? {} : { description: agent.description }),
        ...(agent.instructions === undefined ? {} : { instructions: agent.instructions }),
      }));
      // Blocker 1 correction: `command.routes` is already the exact
      // `HostRouteOperation[]` shape (validated above, as part of the same
      // `AioxConfig` reshape `normalizeHostDeclaration` just validated) --
      // `HostController.start()` now owns applying it as the running host's
      // initial declared topology directly, instead of this Stage rejecting
      // `--route` outright.
      const routes: HostRouteOperation[] = command.routes ?? [];

      const startResult = await controller.start({
        name: command.name,
        path: options.cwd,
        agents,
        ...(routes.length > 0 ? { routes } : {}),
        preparedAdapter: adapterSelection.preparedAdapter,
      });
      if (!startResult.ok) {
        throw new InvocationError(describeHostStartFailure(startResult, "aiox host new"), {
          code: "aiox.invocation.host_new_failed",
          exitCode: 1,
        });
      }

      const startLoop = options.startHostForegroundLoop ?? defaultStartHostForegroundLoop;
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const stop = startLoop({
          controller,
          ...(options.hostForegroundLoopIntervalMs === undefined
            ? {}
            : { intervalMs: options.hostForegroundLoopIntervalMs }),
          onTerminated: () => {
            if (settled) return;
            settled = true;
            stop();
            resolve();
          },
          onFatalError: (error) => {
            if (settled) return;
            settled = true;
            stop();
            reject(
              new InvocationError(
                `aiox host new foreground loop failed: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                { code: "aiox.invocation.host_foreground_loop_failed", exitCode: 1 },
              ),
            );
          },
        });
      });

      return { exitCode: 0 };
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

async function waitForHostControlResult(
  api: DaemonApi,
  requestId: string,
  poll: () => void | Promise<void> = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 25)),
): Promise<Record<string, unknown>> {
  while (true) {
    const taken = await api.takeHostControlRequestResult({ requestId });
    if (!taken.ok) {
      return taken;
    }
    if (taken.status === "completed") {
      return taken.result;
    }
    if (taken.status === "failed") {
      return { ok: false, reason: taken.failureReason };
    }
    await poll();
  }
}

function describeHostStartFailure(
  result: Extract<StartHostControllerResult, { ok: false }>,
  commandLabel: string,
): string {
  switch (result.stage) {
    case "dynamic_preflight":
      return formatHostIntegrationFailureMessage(
        { stage: result.stage, reason: result.reason },
        commandLabel,
      );
    case "invalid_routes":
      return `${commandLabel} cannot start: invalid route declaration (${result.issues
        .map((issue) => issue.message)
        .join("; ")})`;
    case "register":
      return `${commandLabel} cannot start: ${result.reason}`;
    case "all_agents_failed":
      return `${commandLabel} started but every declared agent failed to launch: ${result.agents
        .map((agent) => `${agent.name} (${agent.reason ?? "unknown reason"})`)
        .join(", ")}`;
    default: {
      const exhaustive: never = result;
      return `${commandLabel} failed for an unknown reason: ${JSON.stringify(exhaustive)}`;
    }
  }
}

/**
 * `aiox.yaml` `routes[]` -> `HostRouteOperation[]`: one `"add"` op carrying the
 * route's whole `members` mesh, plus one `"direct"` op per `directed[]` entry
 * (its `to` flattened from `string | string[]` to `string[]`). This is a
 * structural translation only — `HostController`'s route topology engine
 * (`src/host/host-route-topology.ts`, out of scope here) is what resolves
 * `direct` into the pair-local mesh/directed-override semantics
 * (`docs/specs/aiox-compose-contract.md` §"Mesh와 directed override의 관계"),
 * same as CLI-only `host-new`/`host route`.
 */
function buildHostRouteOperationsFromConfig(
  routes: readonly AioxRouteConfig[],
): HostRouteOperation[] {
  const operations: HostRouteOperation[] = [];
  for (const route of routes) {
    operations.push({ op: "add", name: route.name, members: [...route.members] });
    for (const entry of route.directed ?? []) {
      operations.push({
        op: "direct",
        name: route.name,
        from: entry.from,
        to: Array.isArray(entry.to) ? [...entry.to] : [entry.to],
      });
    }
  }
  return operations;
}

function structuredHostResult(result: Record<string, unknown>): InvocationResult {
  return {
    exitCode: result.ok === true ? 0 : 1,
    stdout: `${JSON.stringify(result)}\n`,
  };
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

async function launchChildOrCleanUp(input: {
  api: DaemonApi;
  agentName: string;
  hostId?: string;
  launch: () => ChildProcess;
}): Promise<ChildProcess> {
  try {
    return input.launch();
  } catch (error) {
    return cleanUpAfterTuiFailure(input.api, input.agentName, input.hostId, error);
  }
}

async function launchTuiOrCleanUp(input: {
  api: DaemonApi;
  agentName: string;
  hostId?: string;
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
    return cleanUpAfterTuiFailure(input.api, input.agentName, input.hostId, error);
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
  hostId: string | undefined,
  launchError: unknown,
): Promise<never> {
  const cleanupFailure = await cleanUpAttachedAgent(api, agentName, hostId);

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

async function cleanUpAttachedAgent(
  api: DaemonApi,
  agentName: string,
  hostId: string | undefined,
): Promise<string | undefined> {
  try {
    const response = await api.detachAgent({
      agentName,
      ...(hostId === undefined ? {} : { hostId }),
    });
    if (response.ok && response.runtimeDisposeError !== undefined) {
      return response.runtimeDisposeError;
    }
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return undefined;
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

const DEFAULT_HOSTED_TERMINATION_WATCH_INTERVAL_MS = 250;

export interface HostedTerminationWatch {
  api: DaemonApi;
  hostId: string;
  agentName: string;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * A hosted agent is not ready when its terminal surface or CLI process merely
 * exists. Node's child `spawn` event is the first positive signal that the
 * vendor executable was created successfully; an `error` before that means
 * spawn failed. Keep the exit listener installed while the asynchronous ready
 * report is in flight so a very short-lived vendor cannot exit unnoticed.
 *
 * This hosted CLI process is the sole OS-level owner of `child`'s live
 * process handle (W6 Stage 5D Blocker 4 correction): a same-machine
 * `AgentRuntimeTerminator` cannot safely `process.kill(pid, ...)` a PID it
 * only knows secondhand, because that PID can go stale and the OS can hand
 * it to an unrelated process. Instead the terminator only records a
 * termination intent for `(hostId, agentName)`; the poll loop below races
 * that intent against the vendor's own natural exit and, when it observes a
 * NEW intent (`pendingSignalSeq` advancing) after the child has actually
 * spawned, signals the live handle directly with `child.kill()` -- a safe
 * no-op if the child has already exited (Node never resends to a stale pid).
 */
async function waitForHostedTuiExit(
  child: ChildProcess,
  reportReady: () => Promise<void>,
  terminationWatch: HostedTerminationWatch,
): Promise<{ exitCode: number | null; signal: string | null }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let readyState: "waiting" | "reporting" | "reported" = "waiting";
    let pendingExit: { exitCode: number | null; signal: string | null } | null = null;
    let spawned = false;
    let lastDeliveredSignalSeq = 0;
    let lastAcknowledgedSignalSeq = 0;
    let watchStopped = false;

    function cleanUpListeners(): void {
      child.off("spawn", onSpawn);
      child.off("error", onError);
      child.off("exit", onExit);
    }

    function finish(result: { exitCode: number | null; signal: string | null }): void {
      if (settled) return;
      settled = true;
      watchStopped = true;
      cleanUpListeners();
      resolve(result);
    }

    function fail(error: unknown): void {
      if (settled) return;
      settled = true;
      watchStopped = true;
      cleanUpListeners();
      reject(error);
    }

    function onSpawn(): void {
      spawned = true;
      if (settled || readyState !== "waiting") return;
      readyState = "reporting";
      void reportReady().then(
        () => {
          if (settled) return;
          readyState = "reported";
          if (pendingExit) finish(pendingExit);
        },
        (error) => fail(error),
      );
    }

    function onError(error: Error): void {
      fail(
        new InvocationError(error.message, {
          code: "aiox.invocation.tui_launch_failed",
          exitCode: 1,
        }),
      );
    }

    function onExit(exitCode: number | null, signal: string | null): void {
      const result = { exitCode, signal };
      if (readyState === "reported") {
        finish(result);
        return;
      }
      if (readyState === "reporting") {
        pendingExit = result;
        return;
      }
      fail(
        new InvocationError("vendor TUI exited before reporting a successful spawn", {
          code: "aiox.invocation.tui_launch_failed",
          exitCode: 1,
        }),
      );
    }

    child.once("spawn", onSpawn);
    child.once("error", onError);
    child.once("exit", onExit);

    const pollIntervalMs =
      terminationWatch.pollIntervalMs ?? DEFAULT_HOSTED_TERMINATION_WATCH_INTERVAL_MS;
    const sleep =
      terminationWatch.sleep ??
      ((ms: number) =>
        new Promise<void>((resolveSleep) => {
          // `unref()` so this watch loop's own timer never keeps the hosted
          // CLI process alive a poll tick longer than its real work already
          // would -- once the vendor exits and the process has nothing else
          // to do, it should exit immediately, not linger up to
          // `pollIntervalMs` waiting on this loop to notice.
          setTimeout(resolveSleep, ms).unref();
        }));

    void (async () => {
      while (!watchStopped) {
        await sleep(pollIntervalMs);
        if (watchStopped) continue;

        let listed;
        try {
          listed = await terminationWatch.api.listHostAgents({ hostId: terminationWatch.hostId });
        } catch {
          // A transient daemon read failure here does not own this agent's
          // outcome -- the exit listeners above remain authoritative. Keep
          // watching rather than failing the whole hosted invocation.
          continue;
        }
        if (watchStopped) continue;

        const mine = listed.ok
          ? listed.agents.find((agent) => agent.name === terminationWatch.agentName)
          : undefined;
        if (!mine || mine.pendingSignal === null) {
          continue;
        }
        // Deferred until the child has actually spawned: an intent recorded
        // while still `starting` stays pending (never marked applied) so the
        // very next tick after spawn picks up the same sequence number.
        if (spawned && mine.pendingSignalSeq > lastAcknowledgedSignalSeq) {
          if (mine.pendingSignalSeq > lastDeliveredSignalSeq) {
            let delivered = false;
            try {
              delivered = child.kill(mine.pendingSignal);
            } catch {
              // A failed delivery is not an acknowledgement. Retry the same
              // intent on the next poll unless the authoritative exit event
              // ends this invocation first.
            }
            if (!delivered) continue;
            lastDeliveredSignalSeq = mine.pendingSignalSeq;
          }

          try {
            const acknowledged =
              await terminationWatch.api.acknowledgeHostAgentSignalDelivery({
                hostId: terminationWatch.hostId,
                agentName: terminationWatch.agentName,
                signalSeq: mine.pendingSignalSeq,
              });
            if (acknowledged.ok) {
              lastAcknowledgedSignalSeq = mine.pendingSignalSeq;
            }
          } catch {
            // Delivery already happened, so retry only the acknowledgement;
            // never send the same signal again because an RPC response was
            // lost after the daemon committed it.
          }
        }
      }
    })();
  });
}

function stopHostedTuiAfterLifecycleFailure(child: ChildProcess): void {
  try {
    child.kill();
  } catch {
    // The lifecycle/cleanup error remains authoritative. A process that
    // already exited can reject or report false from kill without changing
    // the daemon state transition that follows.
  }
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
