import type { ChildProcess } from "node:child_process";

import type { ParsedCommand } from "./parse.js";
import type { DaemonApi } from "../daemon/api.js";
import type { StopRequest } from "../daemon/state.js";
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
        // dev-channel server:<name> resolves the aiox channel MCP from the
        // pre-registered static definition. Same name shared by
        // `aiox claude setup`, requireClaudeMcpRegistration, and this
        // launcher so registration, the gate, and activation never drift.
        const channelName = CLAUDE_CHANNEL_MCP_NAME;
        const child = launchChildOrRollback({
          api,
          agentName: command.name,
          launch: () =>
            (options.launchClaudeStaticMcpChannel ?? launchClaudeStaticMcpChannel)({
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
