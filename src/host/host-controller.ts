import type { DaemonApi, HostAgentDto, RunningHostDto } from "../daemon/api.js";
import type { HostAgentDeclaration } from "../daemon/host-runtime.js";
import type { AgentKind } from "../core/agents.js";
import type { HostControlRequestKind } from "../core/hosts.js";
import type { AdapterRegistry } from "./adapter-registry.js";
import type { HostAdapter, HostAdapterAgentSurfaceRequest } from "./host-adapter.js";
import type { AgentRuntimeTerminator } from "./agent-runtime-terminator.js";

/**
 * Owns one running host's foreground lifecycle: adapter selection, static/
 * dynamic preflight, running-host + host-agent registration against the
 * existing Stage 3 daemon API, per-agent surface/CLI launch via the selected
 * `HostAdapter`, starting/ready/detach observation, partial/all-agent failure
 * cleanup, the control-relay claim/dispatch seam, and the host-scoped
 * terminate-all primitive. One `HostController` instance owns exactly one
 * running host.
 *
 * Every `DaemonApi` call this controller makes is awaited: the production
 * dependency is `createDaemonSocketClient()`, whose calls are always
 * `Promise`s at runtime even though several host-runtime methods on
 * `DaemonApi` are typed with synchronous return values (the in-process
 * implementation used by tests really is synchronous). Awaiting a
 * non-`Promise` value is a no-op, so this makes the controller work
 * correctly against both.
 *
 * Ready/detach are not adapter callbacks. The existing AIOX agent CLI
 * (Stage 5+) is the authoritative source: it reports a successful vendor
 * spawn or a natural exit directly to the daemon's host-agent state
 * (`markHostAgentReady` / `detachHostAgent`). `reconcile()` is the seam this
 * controller exposes to resync its local starting/ready cache from that
 * daemon state; when/how often production code calls it is Stage 5's
 * decision, not this one's.
 */

export interface StartHostControllerRequest {
  name: string;
  /** Absolute project path — canonicalized identity and the agents' cwd. */
  path: string;
  agents: readonly HostAgentDeclaration[];
  /** Minted via the injected `createId()` when omitted. */
  controllerId?: string;
  /** Bypasses environment detection and selects this exact registered adapter id. */
  explicitAdapterId?: string;
}

export interface HostControllerAgentOutcome {
  name: string;
  kind: AgentKind;
  outcome: "started" | "failed";
  reason?: string;
}

export type StartHostControllerResult =
  | { ok: true; hostId: string; host: RunningHostDto; agents: HostControllerAgentOutcome[] }
  | { ok: false; stage: "static_preflight"; reason: string }
  | { ok: false; stage: "dynamic_preflight"; reason: string }
  | { ok: false; stage: "register"; reason: string }
  | { ok: false; stage: "all_agents_failed"; hostId: string; agents: HostControllerAgentOutcome[] };

export interface HostControllerAgentState {
  name: string;
  kind: AgentKind;
  status: "starting" | "ready";
}

export interface TerminationFailure {
  name: string;
  reason: string;
}

export type TerminateAllResult =
  | { ok: true; hostId: string }
  | { ok: false; reason: "host_not_running" }
  | { ok: false; reason: "termination_failed"; failures: TerminationFailure[] };

export type HandleControlRequestResult =
  | { claimed: false; reason: "host_not_running" | "no_pending_request" | "host_controller_mismatch" }
  | {
      claimed: true;
      requestId: string;
      kind: HostControlRequestKind;
      result: Record<string, unknown>;
    };

export interface HostControllerIdentity {
  hostId: string;
  controllerId: string;
  name: string;
  path: string;
}

export interface HostController {
  start(request: StartHostControllerRequest): Promise<StartHostControllerResult>;
  listAgents(): HostControllerAgentState[];
  /**
   * Refreshes the local starting/ready tracking from the daemon's
   * authoritative host-agent state (`api.listHostAgents`). A tracked agent
   * absent from that state is treated as detached. This is the only seam
   * that observes ready/exit — there is no adapter callback for it.
   */
  reconcile(): Promise<void>;
  terminateAll(): Promise<TerminateAllResult>;
  handleNextControlRequest(): Promise<HandleControlRequestResult>;
  getIdentity(): HostControllerIdentity | null;
}

export interface CreateHostControllerOptions {
  api: DaemonApi;
  registry: AdapterRegistry;
  terminator: AgentRuntimeTerminator;
  /** Mints `controllerId` when `start()` is not given one, matching the daemon-layer convention. */
  createId: () => string;
}

interface TrackedAgent {
  name: string;
  kind: AgentKind;
  status: "starting" | "ready";
}

interface TerminationOutcome {
  name: string;
  ok: boolean;
  reason?: string;
}

export function createHostController(options: CreateHostControllerOptions): HostController {
  const { api, registry, terminator, createId } = options;

  let hostId: string | null = null;
  let controllerId: string | null = null;
  let hostName: string | null = null;
  let hostPath: string | null = null;
  let adapter: HostAdapter | null = null;
  const trackedAgents = new Map<string, TrackedAgent>();

  function buildSurfaceRequest(
    declaration: HostAgentDeclaration,
  ): HostAdapterAgentSurfaceRequest {
    const args: string[] = [declaration.kind, "--name", declaration.name];
    if (declaration.role !== undefined) {
      args.push("--role", declaration.role);
    }
    if (declaration.description !== undefined) {
      args.push("--description", declaration.description);
    }
    if (declaration.instructions !== undefined) {
      args.push("--instructions", declaration.instructions);
    }

    return {
      hostId: hostId!,
      hostName: hostName!,
      agentName: declaration.name,
      agentKind: declaration.kind,
      cwd: hostPath!,
      command: "aiox",
      args,
      env: {},
    };
  }

  async function launchAgent(declaration: HostAgentDeclaration): Promise<HostControllerAgentOutcome> {
    try {
      await adapter!.createSurfaceAndStart(buildSurfaceRequest(declaration));
    } catch (error) {
      await api.detachHostAgent({ hostId: hostId!, agentName: declaration.name });
      return {
        name: declaration.name,
        kind: declaration.kind,
        outcome: "failed",
        reason: describeError(error),
      };
    }

    trackedAgents.set(declaration.name, {
      name: declaration.name,
      kind: declaration.kind,
      status: "starting",
    });
    return { name: declaration.name, kind: declaration.kind, outcome: "started" };
  }

  /**
   * Runs `terminator.terminate()` for every tracked agent. A confirmed
   * success is detached from the daemon and dropped from local tracking
   * immediately; a confirmed failure is left exactly as-is in both places —
   * it is still actually running. Never reports a false success.
   */
  async function terminateTrackedAgents(): Promise<TerminationOutcome[]> {
    const currentHostId = hostId!;
    const names = [...trackedAgents.keys()];

    return Promise.all(
      names.map(async (name): Promise<TerminationOutcome> => {
        let result;
        try {
          result = await terminator.terminate({ hostId: currentHostId, agentName: name });
        } catch (error) {
          return { name, ok: false, reason: describeError(error) };
        }
        if (!result.ok) {
          return { name, ok: false, reason: result.reason };
        }
        trackedAgents.delete(name);
        await api.detachHostAgent({ hostId: currentHostId, agentName: name });
        return { name, ok: true };
      }),
    );
  }

  function toFailures(outcomes: TerminationOutcome[]): TerminationFailure[] {
    return outcomes
      .filter((outcome): outcome is TerminationOutcome & { reason: string } => !outcome.ok)
      .map((outcome) => ({ name: outcome.name, reason: outcome.reason }));
  }

  function resetState(): void {
    hostId = null;
    controllerId = null;
    hostName = null;
    hostPath = null;
    adapter = null;
    trackedAgents.clear();
  }

  return {
    async start(request) {
      const selection = registry.select({
        cwd: request.path,
        ...(request.explicitAdapterId === undefined
          ? {}
          : { explicitAdapterId: request.explicitAdapterId }),
      });
      if (!selection.ok) {
        const reason =
          selection.reason === "no_matching_adapter"
            ? "no host adapter matches the current environment"
            : `unknown adapter "${selection.adapterId}"`;
        return { ok: false, stage: "static_preflight", reason };
      }

      const staticResult = await selection.adapter.staticPreflight({ cwd: request.path });
      if (!staticResult.ok) {
        return { ok: false, stage: "static_preflight", reason: staticResult.reason };
      }

      const dynamicResult = await selection.adapter.dynamicPreflight({
        hostName: request.name,
        cwd: request.path,
      });
      if (!dynamicResult.ok) {
        return { ok: false, stage: "dynamic_preflight", reason: dynamicResult.reason };
      }

      const resolvedControllerId = request.controllerId ?? createId();
      const registerResult = await api.registerRunningHost({
        name: request.name,
        path: request.path,
        controllerId: resolvedControllerId,
        agents: request.agents,
      });
      if (!registerResult.ok) {
        return { ok: false, stage: "register", reason: describeRegisterFailure(registerResult) };
      }

      hostId = registerResult.host.id;
      controllerId = resolvedControllerId;
      hostName = request.name;
      hostPath = request.path;
      adapter = selection.adapter;

      const outcomes: HostControllerAgentOutcome[] = [];
      for (const declaration of request.agents) {
        outcomes.push(await launchAgent(declaration));
      }

      const startedCount = outcomes.filter((outcome) => outcome.outcome === "started").length;
      if (request.agents.length > 0 && startedCount === 0) {
        const failedHostId = hostId;
        await api.unregisterRunningHost({ hostId: failedHostId });
        resetState();
        return { ok: false, stage: "all_agents_failed", hostId: failedHostId, agents: outcomes };
      }

      return { ok: true, hostId, host: registerResult.host, agents: outcomes };
    },

    listAgents() {
      return [...trackedAgents.values()].map((agent) => ({
        name: agent.name,
        kind: agent.kind,
        status: agent.status,
      }));
    },

    async reconcile() {
      if (hostId === null) {
        return;
      }
      const listed = await api.listHostAgents({ hostId });
      trackedAgents.clear();
      for (const agent of listed.agents as HostAgentDto[]) {
        trackedAgents.set(agent.name, { name: agent.name, kind: agent.kind, status: agent.status });
      }
    },

    async terminateAll() {
      if (hostId === null) {
        return { ok: false, reason: "host_not_running" };
      }
      const currentHostId = hostId;
      const outcomes = await terminateTrackedAgents();
      const failures = toFailures(outcomes);
      if (failures.length > 0) {
        return { ok: false, reason: "termination_failed", failures };
      }

      const result = await api.unregisterRunningHost({ hostId: currentHostId });
      resetState();
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }
      return { ok: true, hostId: currentHostId };
    },

    async handleNextControlRequest() {
      if (hostId === null || controllerId === null) {
        return { claimed: false, reason: "host_not_running" };
      }

      const claimResult = await api.claimHostControlRequest({ hostId, controllerId });
      if (!claimResult.ok) {
        return { claimed: false, reason: claimResult.reason };
      }
      if (!claimResult.request) {
        return { claimed: false, reason: "no_pending_request" };
      }

      const request = claimResult.request;
      const currentControllerId = controllerId;

      if (request.kind === "terminate_all") {
        const currentHostId = hostId;
        const outcomes = await terminateTrackedAgents();
        const failures = toFailures(outcomes);

        if (failures.length > 0) {
          const failureResult = { ok: false, failures };
          const completeResult = await api.completeHostControlRequest({
            requestId: request.id,
            controllerId: currentControllerId,
            result: failureResult,
          });
          return {
            claimed: true,
            requestId: request.id,
            kind: request.kind,
            result: completeResult.ok ? failureResult : { ok: false, reason: completeResult.reason },
          };
        }

        const completeResult = await api.completeHostControlRequest({
          requestId: request.id,
          controllerId: currentControllerId,
          result: { ok: true },
        });
        await api.unregisterRunningHost({ hostId: currentHostId });
        resetState();
        return {
          claimed: true,
          requestId: request.id,
          kind: request.kind,
          result: completeResult.ok ? { ok: true } : { ok: false, reason: completeResult.reason },
        };
      }

      // host_add / host_remove / host_route: applying the mutation is Stage 5.
      // Claimed and explicitly completed with a "not supported yet" result —
      // never left pending, never a placeholder success.
      const unsupportedResult = { ok: false, reason: "not_supported_in_current_stage" };
      const completeResult = await api.completeHostControlRequest({
        requestId: request.id,
        controllerId: currentControllerId,
        result: unsupportedResult,
      });
      return {
        claimed: true,
        requestId: request.id,
        kind: request.kind,
        result: completeResult.ok ? unsupportedResult : { ok: false, reason: completeResult.reason },
      };
    },

    getIdentity() {
      if (hostId === null || controllerId === null || hostName === null || hostPath === null) {
        return null;
      }
      return { hostId, controllerId, name: hostName, path: hostPath };
    },
  };
}

function describeRegisterFailure(
  result: Extract<Awaited<ReturnType<DaemonApi["registerRunningHost"]>>, { ok: false }>,
): string {
  switch (result.reason) {
    case "host_path_not_absolute":
      return `host path is not absolute: ${result.path}`;
    case "host_already_running":
      return `a host is already running at this path (id: ${result.host.id})`;
    case "host_agent_name_already_registered":
      return `agent name already registered for this host: ${result.agentName}`;
    default: {
      const exhaustive: never = result;
      return `unknown registration failure: ${JSON.stringify(exhaustive)}`;
    }
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
