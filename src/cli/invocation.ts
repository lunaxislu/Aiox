import type { ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ParsedCommand } from "./parse.js";
import type { DaemonApi } from "../daemon/api.js";
import type { StopRequest } from "../daemon/state.js";
import { launchCodexTui } from "../adapters/codex/launcher.js";
import { runCodexIngressMcpServer } from "../adapters/codex/mcp-server.js";
import {
  launchClaudeWithChannel,
  launchClaudePluginChannel,
} from "../adapters/claude/launcher.js";
import {
  ClaudePluginCliError,
  loadClaudePluginInventory,
  type ClaudePluginInventory,
} from "../adapters/claude/plugin-cli.js";
import {
  preflightClaudePlugin,
  type PreflightFailureCode,
} from "../adapters/claude/preflight.js";
import {
  setupClaudePlugin,
  type SetupActions,
  type SetupClaudePluginInput,
  type SetupClaudePluginResult,
} from "../adapters/claude/setup.js";
import { runDaemonProcess } from "../daemon/run.js";
import { formatDaemonStatus, formatDoctor, formatStatus } from "./format.js";

// R3 strategy D channel plugin identity. Shared by the preflight gate and the
// plugin launcher so the inventory check and the activation arg never drift.
const CLAUDE_CHANNEL_PLUGIN_NAME = "aiox-channel-ingress";
const CLAUDE_CHANNEL_MARKETPLACE_NAME = "aiox";

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
  launchClaudeWithChannel?: (options: {
    channelName: string;
    agentName: string;
    agentToken: string;
    daemonSocketPath: string;
  }) => ChildProcess;
  // R3 strategy D (now the DEFAULT, step 3b): launches the plugin-activation
  // path. The legacy inline --mcp-config server: path (launchClaudeWithChannel)
  // is used only as the dev/debug opt-out AIOX_CLAUDE_CHANNEL_STRATEGY=inline.
  launchClaudePluginChannel?: (options: {
    pluginName: string;
    marketplaceName: string;
    agentName: string;
    agentToken: string;
    daemonSocketPath: string;
    cwd: string;
  }) => ChildProcess;
  // Strategy-D preflight injection points (default to the real adapter / fs).
  loadClaudePluginInventory?: (options: {
    cwd: string;
  }) => Promise<ClaudePluginInventory>;
  fileExists?: (path: string) => boolean;
  // R3 step 3a (`aiox claude-plugin setup`): the orchestrator + the resolved
  // local marketplace path. Both default to the real adapter / fs-resolved path;
  // tests inject them so the command flow runs without a live `claude`.
  setupClaudePlugin?: (
    input: SetupClaudePluginInput,
  ) => Promise<SetupClaudePluginResult>;
  claudeChannelMarketplacePath?: string;
  runCodexMcpServer?: () => Promise<void>;
  runDaemonProcessFn?: (socketPath: string) => Promise<void>;
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
      // R3 step 3b: resolve the Claude channel strategy BEFORE any daemon/attach
      // side effect, so an invalid AIOX_CLAUDE_CHANNEL_STRATEGY fails fast with a
      // coded error and never starts the daemon or attaches the agent.
      const claudeChannelStrategy =
        command.agentKind === "claude"
          ? resolveClaudeChannelStrategy(process.env.AIOX_CLAUDE_CHANNEL_STRATEGY)
          : undefined;
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
      });
      ensureOk(response);
      if (command.agentKind === "codex" && response.ok && response.codexRuntime) {
        const child = launchTuiOrRollback({
          api,
          agentName: command.name,
          endpoint: new URL(response.codexRuntime.endpoint),
          resumeSessionId: command.resumeSessionId,
          launch: options.launchCodexTui ?? launchCodexTui,
        });
        let tuiExit: { exitCode: number | null; signal: string | null };
        try {
          tuiExit = await waitForTuiExit(child);
        } catch (error) {
          await api.rollbackAgentAttach({ agentName: command.name });
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
        // Legacy inline (A) only: dev-channel server:<name> resolves the aiox
        // channel MCP that the launcher injects one-off via --mcp-config (no
        // permanent .mcp.json). The name must match the injected mcpServers key.
        // See docs/decisions/claude-channel-plugin-default.md.
        const channelName = "aiox-claude-ingress";
        // R3 step 3b: D (channel-as-plugin) is the DEFAULT. The token
        // flows into the spawned claude env, which the plugin .mcp.json expands via
        // ${VAR}. The legacy inline (A) path stays only as the explicit dev/debug
        // opt-out AIOX_CLAUDE_CHANNEL_STRATEGY=inline (resolved before attach). There
        // is NO automatic fallback: a D preflight failure is a hard, coded error.
        const useStrategyDPlugin = claudeChannelStrategy === "plugin";
        if (useStrategyDPlugin) {
          // Pre-spawn gate (R3 step 2): a missing/disabled
          // channel plugin must surface as a clear non-zero CLI error here rather
          // than the documented silent-drop (exit 0 + startup notice + no inbound
          // push). Only on the D path; the legacy A path is untouched.
          await preflightStrategyDPlugin({
            api,
            options,
            cwd: options.cwd,
            agentName: command.name,
            agentToken,
            socketPath,
          });
        }
        const child = launchChildOrRollback({
          api,
          agentName: command.name,
          launch: () =>
            useStrategyDPlugin
              ? (options.launchClaudePluginChannel ?? launchClaudePluginChannel)({
                  pluginName: CLAUDE_CHANNEL_PLUGIN_NAME,
                  marketplaceName: CLAUDE_CHANNEL_MARKETPLACE_NAME,
                  agentName: command.name,
                  agentToken,
                  daemonSocketPath: socketPath,
                  // Pin the spawn cwd to the dir preflight read inventory from,
                  // so plugin scope resolves identically (Finding 1).
                  cwd: options.cwd,
                })
              : (options.launchClaudeWithChannel ?? launchClaudeWithChannel)({
                  channelName,
                  agentName: command.name,
                  agentToken,
                  daemonSocketPath: socketPath,
                }),
        });
        const tuiExit = await waitForTuiExit(child);
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
    case "disconnect": {
      const api = await options.runtime.getDaemonApi();
      const response = await api.disconnect({
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
    case "claude-plugin-setup":
      return claudePluginSetupResult(command.scope, options);
    case "_run-daemon": {
      const runFn = options.runDaemonProcessFn ?? runDaemonProcess;
      await runFn(command.socketPath);
      return success();
    }
    default:
      return assertNever(command);
  }
}

// R3 step 3a: `aiox claude-plugin setup`. Standalone provisioning (no daemon) —
// register the marketplace + install/enable the channel plugin idempotently, then
// validate. ClaudePluginCliError (a failed `claude plugin ...` call) and the
// preflight verdict both map to a coded non-zero InvocationError so the user
// always sees what to fix.
async function claudePluginSetupResult(
  scope: "user" | "project",
  options: InvocationOptions,
): Promise<InvocationResult> {
  const setup = options.setupClaudePlugin ?? setupClaudePlugin;
  const marketplacePath =
    options.claudeChannelMarketplacePath ?? resolveClaudeChannelMarketplacePath();

  let result: SetupClaudePluginResult;
  try {
    result = await setup({
      pluginName: CLAUDE_CHANNEL_PLUGIN_NAME,
      marketplaceName: CLAUDE_CHANNEL_MARKETPLACE_NAME,
      marketplacePath,
      scope,
      cwd: options.cwd,
    });
  } catch (error) {
    const code =
      error instanceof ClaudePluginCliError
        ? error.code
        : "claude_plugin_setup_failed";
    throw new InvocationError(
      error instanceof Error ? error.message : String(error),
      { code: `aiox.invocation.${code}`, exitCode: 1 },
    );
  }

  if (!result.ok) {
    throw new InvocationError(result.message, {
      code: `aiox.invocation.claude_plugin_setup.${result.code}`,
      exitCode: 1,
    });
  }
  return { exitCode: 0, stdout: formatSetupSummary(scope, result.actions) };
}

function formatSetupSummary(
  scope: "user" | "project",
  actions: SetupActions,
): string {
  const marketplace = actions.marketplaceAdded
    ? "registered"
    : "already registered";
  const plugin = actions.pluginInstalled
    ? "installed/enabled"
    : "already effective";
  return (
    `aiox channel plugin ready (scope: ${scope}).\n` +
    `  marketplace: ${marketplace}\n` +
    `  plugin: ${plugin}\n`
  );
}

// Resolve the local marketplace dir to register. Primary: the
// AIOX_CLAUDE_CHANNEL_MARKETPLACE_PATH env override (mirrors AIOX_CLAUDE_COMMAND).
// Default: walk up from this module to the repo dir that holds the spike
// marketplace — works for both tsx (src/) and built (dist/) layouts in R3.
// Post-MVP packaging relocates the bundled marketplace and finalizes this path.
function resolveClaudeChannelMarketplacePath(): string {
  const override = process.env.AIOX_CLAUDE_CHANNEL_MARKETPLACE_PATH;
  if (override !== undefined && override.length > 0) {
    return override;
  }
  const rel = join("spike", "aiox-channel-marketplace");
  let dir = fileURLToPath(new URL(".", import.meta.url));
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, rel);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  // Best-effort fallback (surfaced clearly by `marketplace add` if wrong).
  return join(fileURLToPath(new URL(".", import.meta.url)), rel);
}

// R3 strategy D: load Claude's plugin inventory from the user's cwd and run the
// pre-spawn preflight. On any failure (inventory load OR preflight verdict) the
// already-attached agent is rolled back (mirroring the launch-failure path) and
// a coded non-zero InvocationError is thrown — so the user never enters the
// silent-drop launch path.
async function preflightStrategyDPlugin(input: {
  api: DaemonApi;
  options: InvocationOptions;
  cwd: string;
  agentName: string;
  agentToken: string;
  socketPath: string;
}): Promise<void> {
  const loadInventory =
    input.options.loadClaudePluginInventory ?? loadClaudePluginInventory;
  const fileExists = input.options.fileExists ?? existsSync;

  let inventory: ClaudePluginInventory;
  try {
    inventory = await loadInventory({ cwd: input.cwd });
  } catch (error) {
    return failAfterRollback(
      input.api,
      input.agentName,
      error instanceof Error ? error.message : String(error),
      "aiox.invocation.claude_plugin_inventory_failed",
    );
  }

  // env must mirror what launchClaudePluginChannel injects (launcher.ts), so the
  // missing_env check guards the exact ${VAR} placeholders the plugin expands.
  const result = preflightClaudePlugin({
    pluginName: CLAUDE_CHANNEL_PLUGIN_NAME,
    marketplaceName: CLAUDE_CHANNEL_MARKETPLACE_NAME,
    marketplaces: inventory.marketplaces,
    plugins: inventory.plugins,
    fileExists,
    env: {
      AIOX_CLAUDE_CHANNEL_AGENT_NAME: input.agentName,
      AIOX_CLAUDE_CHANNEL_TOKEN: input.agentToken,
      AIOX_SOCKET_PATH: input.socketPath,
    },
  });
  if (!result.ok) {
    return failAfterRollback(
      input.api,
      input.agentName,
      claudePreflightFailureMessage(result.code, result.message),
      `aiox.invocation.claude_preflight.${result.code}`,
    );
  }
}

// R3 step 3b: only these (provisioning) codes are fixable by `aiox claude-plugin
// setup`, so only they carry the dev/debug inline escape-hatch hint.
const SETUP_FIXABLE_PREFLIGHT_CODES: ReadonlySet<PreflightFailureCode> = new Set([
  "marketplace_not_registered",
  "plugin_not_installed",
  "plugin_not_enabled",
  "channel_server_missing",
  "ambiguous_install_path",
]);

/**
 * R3 step 3b: a D preflight failure NEVER auto-falls back to inline. For the
 * setup-fixable codes we append a dev/debug-only escape hatch so an operator can
 * still launch while diagnosing. channels_disabled / missing_env are deliberately
 * excluded — inline would not fix an org-policy block or a missing token, so
 * hinting it there would mislead. The hint uses a literal
 * `<agentName>` placeholder rather than the actual name: agent names may contain
 * spaces/shell metacharacters (the parser does not forbid them), so interpolating
 * them would yield a broken copy-paste command (Codex review).
 */
export function claudePreflightFailureMessage(
  code: PreflightFailureCode,
  baseMessage: string,
): string {
  if (!SETUP_FIXABLE_PREFLIGHT_CODES.has(code)) return baseMessage;
  return (
    `${baseMessage}\n\nDeveloper/debug only:\n  ` +
    `AIOX_CLAUDE_CHANNEL_STRATEGY=inline aiox claude --name <agentName>`
  );
}

// R3 step 3b: D (channel-as-plugin) is the default Claude channel strategy; the
// legacy inline --mcp-config path (A) is an explicit dev/debug opt-out. Resolved
// before any daemon/attach side effect so an invalid value fails fast.
export type ClaudeChannelStrategy = "plugin" | "inline";

function resolveClaudeChannelStrategy(
  raw: string | undefined,
): ClaudeChannelStrategy {
  if (raw === undefined || raw === "" || raw === "plugin") return "plugin";
  if (raw === "inline") return "inline";
  throw new InvocationError(
    `Invalid AIOX_CLAUDE_CHANNEL_STRATEGY="${raw}". Expected "plugin" or "inline".`,
    {
      code: "aiox.invocation.invalid_claude_channel_strategy",
      exitCode: 1,
    },
  );
}

async function failAfterRollback(
  api: DaemonApi,
  agentName: string,
  message: string,
  code: string,
): Promise<never> {
  // Best-effort cleanup. The coded preflight/inventory failure is the
  // load-bearing UX, so a rollback failure must NOT mask it (Finding 2). We
  // await (unlike the fire-and-forget rollback in launchChildOrRollback) only so
  // call ordering stays deterministic for tests; its error is swallowed.
  try {
    await api.rollbackAgentAttach({ agentName });
  } catch {
    // ignore — surface the original failure below
  }
  throw new InvocationError(message, { code, exitCode: 1 });
}

function launchChildOrRollback(input: {
  api: DaemonApi;
  agentName: string;
  launch: () => ChildProcess;
}): ChildProcess {
  try {
    return input.launch();
  } catch (error) {
    void input.api.rollbackAgentAttach({ agentName: input.agentName });
    throw new InvocationError(
      error instanceof Error ? error.message : String(error),
      {
        code: "aiox.invocation.tui_launch_failed",
        exitCode: 1,
      },
    );
  }
}

function launchTuiOrRollback(input: {
  api: DaemonApi;
  agentName: string;
  endpoint: URL;
  resumeSessionId?: string;
  launch: (options: {
    endpoint: URL;
    resumeSessionId?: string;
  }) => ChildProcess;
}): ChildProcess {
  try {
    return input.launch({
      endpoint: input.endpoint,
      ...(input.resumeSessionId === undefined
        ? {}
        : { resumeSessionId: input.resumeSessionId }),
    });
  } catch (error) {
    void input.api.rollbackAgentAttach({ agentName: input.agentName });
    throw new InvocationError(
      error instanceof Error ? error.message : String(error),
      {
        code: "aiox.invocation.tui_launch_failed",
        exitCode: 1,
      },
    );
  }
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
