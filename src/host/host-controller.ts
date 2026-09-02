import type { DaemonApi, HostAgentDto, RunningHostDto } from "../daemon/api.js";
import type { HostAgentDeclaration } from "../daemon/host-runtime.js";
import type { AgentKind } from "../core/agents.js";
import type { HostControlRequestKind } from "../core/hosts.js";
import type { AdapterRegistry } from "./adapter-registry.js";
import type { HostAdapter, HostAdapterAgentSurfaceRequest } from "./host-adapter.js";
import type { AgentRuntimeTerminator } from "./agent-runtime-terminator.js";
import {
  applyHostRouteOperations,
  createImplicitDefaultHostRouteTopology,
  emptyHostRouteTopology,
  listDeclaredHostRouteEdges,
  listHostRouteSnapshots,
  parseHostRouteOperations,
  removeAgentsFromHostRouteTopology,
  type HostRouteIssue,
  type HostRouteOperation,
  type HostRouteTopology,
} from "./host-route-topology.js";

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
  /**
   * Initial named-group/directed-override declaration. Omitted/empty means
   * the current declared agents form an implicit full mesh; any explicit
   * operation switches to named topology without unioning that default.
   * Effective edges still only ever include the `ready` subset.
   */
  routes?: readonly HostRouteOperation[];
  /** Minted via the injected `createId()` when omitted. */
  controllerId?: string;
  /**
   * Proof that adapter selection and static preflight completed for this
   * exact cwd before a controller with a live daemon API was constructed.
   * This is required: there is no compatibility fallback that performs
   * static preflight after the daemon boundary.
   */
  preparedAdapter: PreparedHostAdapter;
}

export interface HostControllerAgentOutcome {
  name: string;
  kind: AgentKind;
  outcome: "started" | "failed";
  reason?: string;
}

export type StartHostControllerResult =
  | { ok: true; hostId: string; host: RunningHostDto; agents: HostControllerAgentOutcome[] }
  | { ok: false; stage: "invalid_routes"; issues: HostRouteIssue[] }
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
  | { ok: false; reason: "termination_failed"; failures: TerminationFailure[] }
  | { ok: false; reason: "host_unregister_failed"; detail: string };

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

interface ParsedHostAddPayload {
  agents: HostAgentDeclaration[];
  routeOperations: HostRouteOperation[];
}

export type SelectStaticHostAdapterResult =
  | { ok: true; preparedAdapter: PreparedHostAdapter }
  | { ok: false; stage: "static_preflight"; reason: string };

export interface PreparedHostAdapter {
  readonly adapter: HostAdapter;
  readonly cwd: string;
}

/**
 * Adapter selection + static preflight, standalone (Blocker 2 correction).
 * The accepted failure contract requires this to run — and fully resolve —
 * BEFORE the daemon is started, with zero daemon/DB/host/agent/surface side
 * effect on failure. `HostController.start()` needs a live `DaemonApi` to be
 * constructed at all, so production (`aiox host new`) must call this first,
 * start the daemon only once it succeeds, and then pass the resolved
 * the resulting prepared value into `start()` so static preflight is never
 * repeated or deferred until after daemon startup.
 */
export async function selectAndStaticPreflightAdapter(
  registry: AdapterRegistry,
  request: { cwd: string; explicitAdapterId?: string },
): Promise<SelectStaticHostAdapterResult> {
  const selection = registry.select({
    cwd: request.cwd,
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

  const staticResult = await selection.adapter.staticPreflight({ cwd: request.cwd });
  if (!staticResult.ok) {
    return { ok: false, stage: "static_preflight", reason: staticResult.reason };
  }

  return { ok: true, preparedAdapter: { adapter: selection.adapter, cwd: request.cwd } };
}

export function createHostController(options: CreateHostControllerOptions): HostController {
  const { api, terminator, createId } = options;

  let hostId: string | null = null;
  let controllerId: string | null = null;
  let hostName: string | null = null;
  let hostPath: string | null = null;
  let adapter: HostAdapter | null = null;
  const trackedAgents = new Map<string, TrackedAgent>();
  const declaredAgents = new Map<string, HostAgentDeclaration>();
  let routeTopology: HostRouteTopology = emptyHostRouteTopology();

  function buildSurfaceRequest(
    declaration: HostAgentDeclaration,
  ): HostAdapterAgentSurfaceRequest {
    // Hidden `--host-id` (W6 Stage 5A): the routable-identity selector the
    // spawned `aiox <kind> --name` bootstrap resolves against, so this
    // host's agent never collides with a same-named agent on another host
    // or standalone. Not part of the user-facing CLI grammar.
    const args: string[] = [
      declaration.kind,
      "--name",
      declaration.name,
      "--host-id",
      hostId!,
    ];
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
    declaredAgents.clear();
    routeTopology = emptyHostRouteTopology();
  }

  return {
    async start(request) {
      // Blocker 1 correction: an initial route declaration is validated
      // structurally — pure, no side effect — before adapter selection even
      // runs, exactly like the CLI-only declaration's own upstream
      // `normalizeHostDeclaration()` validation gate.
      const declaredAgentNames = new Set(request.agents.map((declaration) => declaration.name));
      const initialOperations = request.routes ?? [];
      const initialRouteResult = applyHostRouteOperations(
        initialOperations.length === 0
          ? createImplicitDefaultHostRouteTopology([...declaredAgentNames])
          : emptyHostRouteTopology(),
        initialOperations,
        declaredAgentNames,
      );
      if (!initialRouteResult.ok) {
        return { ok: false, stage: "invalid_routes", issues: initialRouteResult.issues };
      }

      if (request.preparedAdapter.cwd !== request.path) {
        throw new Error(
          `prepared host adapter cwd mismatch: expected ${request.path}, got ${request.preparedAdapter.cwd}`,
        );
      }
      const selectedAdapter = request.preparedAdapter.adapter;

      const dynamicResult = await selectedAdapter.dynamicPreflight({
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
      adapter = selectedAdapter;
      routeTopology = initialRouteResult.topology;
      for (const declaration of request.agents) {
        declaredAgents.set(declaration.name, declaration);
      }

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
      const syncResult = await api.syncHostEffectiveRoutes({
        hostId,
        edges: listDeclaredHostRouteEdges(routeTopology),
      });
      if (!syncResult.ok) {
        throw new Error(`effective route sync failed: ${syncResult.reason}`);
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

      // Blocker 3 correction: `resetState()` must never run before the
      // daemon confirms the host is actually gone — a rejected call and a
      // structured `{ ok: false }` are both left exactly as-is (host and
      // controller identity preserved) rather than assumed to have
      // succeeded.
      let unregisterResult;
      try {
        unregisterResult = await api.unregisterRunningHost({ hostId: currentHostId });
      } catch (error) {
        return { ok: false, reason: "host_unregister_failed", detail: describeError(error) };
      }
      if (!unregisterResult.ok) {
        return { ok: false, reason: "host_unregister_failed", detail: unregisterResult.reason };
      }

      resetState();
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

        // Blocker 3 correction: completion and unregister must happen as one
        // atomic daemon operation. Completing the request first (the old
        // shape) let the requester observe success before the host was
        // actually gone; unregistering first made the accepted Stage 4
        // ordering bug reappear (`unregisterRunningHost`'s own in-flight
        // cleanup would fail THIS still-claimed request out from under
        // itself). A rejected call or a structured `{ unregistered: false }`
        // both fall back to completing the SAME request with a failure
        // result instead — the requester always observes a definite
        // terminal outcome, and this controller's identity is preserved
        // whenever the host did not actually unregister.
        let atomicResult;
        try {
          atomicResult = await api.completeTerminateAllAndUnregisterHost({
            hostId: currentHostId,
            requestId: request.id,
            controllerId: currentControllerId,
            successResult: { ok: true },
          });
        } catch (error) {
          const failureResult = {
            ok: false,
            reason: "host_unregister_failed",
            detail: describeError(error),
          };
          const completeResult = await api.completeHostControlRequest({
            requestId: request.id,
            controllerId: currentControllerId,
            result: failureResult,
          });
          return {
            claimed: true,
            requestId: request.id,
            kind: request.kind,
            result: completeResult.ok
              ? failureResult
              : { ok: false, reason: completeResult.reason },
          };
        }

        if (!atomicResult.ok) {
          return {
            claimed: true,
            requestId: request.id,
            kind: request.kind,
            result: { ok: false, reason: atomicResult.reason },
          };
        }

        if (!atomicResult.unregistered) {
          // The request itself was already terminalized (with a failure
          // result) by the atomic call above; this controller's identity is
          // preserved since the host never actually unregistered.
          return {
            claimed: true,
            requestId: request.id,
            kind: request.kind,
            result: { ok: false, reason: atomicResult.reason },
          };
        }

        resetState();
        return {
          claimed: true,
          requestId: request.id,
          kind: request.kind,
          result: { ok: true },
        };
      }

      if (request.kind === "host_add") {
        const parsed = parseHostAddPayload(request.payload);
        const issues = parsed.ok ? [] : parsed.issues;
        if (parsed.ok) {
          for (const declaration of parsed.value.agents) {
            if (declaredAgents.has(declaration.name)) {
              issues.push({
                code: "duplicate_agent",
                message: `agent "${declaration.name}" is already declared`,
              });
            }
          }
        }
        const candidateNames = new Set(declaredAgents.keys());
        if (parsed.ok) {
          for (const declaration of parsed.value.agents) candidateNames.add(declaration.name);
        }
        const applied =
          parsed.ok && issues.length === 0
            ? applyHostRouteOperations(routeTopology, parsed.value.routeOperations, candidateNames)
            : null;
        if (!parsed.ok || issues.length > 0 || (applied !== null && !applied.ok)) {
          const invalidResult = {
            ok: false,
            reason: "invalid_mutation",
            issues:
              issues.length > 0
                ? issues
                : applied && !applied.ok
                  ? applied.issues
                  : [],
          };
          const completeResult = await api.completeHostControlRequest({
            requestId: request.id,
            controllerId: currentControllerId,
            result: invalidResult,
          });
          return {
            claimed: true,
            requestId: request.id,
            kind: request.kind,
            result: completeResult.ok
              ? invalidResult
              : { ok: false, reason: completeResult.reason },
          };
        }

        const candidateTopology = applied!.topology;
        const registeredNames: string[] = [];
        for (const declaration of parsed.value.agents) {
          const registered = await api.registerHostAgent({ hostId, ...declaration });
          if (!registered.ok) {
            for (const name of registeredNames) {
              await api.detachHostAgent({ hostId, agentName: name });
            }
            const failureResult = {
              ok: false,
              reason: "agent_registration_failed",
              agentName: declaration.name,
            };
            const completeResult = await api.completeHostControlRequest({
              requestId: request.id,
              controllerId: currentControllerId,
              result: failureResult,
            });
            return {
              claimed: true,
              requestId: request.id,
              kind: request.kind,
              result: completeResult.ok
                ? failureResult
                : { ok: false, reason: completeResult.reason },
            };
          }
          registeredNames.push(declaration.name);
        }

        const syncResult = await api.syncHostEffectiveRoutes({
          hostId,
          edges: listDeclaredHostRouteEdges(candidateTopology),
        });
        if (!syncResult.ok) {
          for (const name of registeredNames) {
            await api.detachHostAgent({ hostId, agentName: name });
          }
          const failureResult = { ok: false, reason: "effective_route_sync_failed" };
          const completeResult = await api.completeHostControlRequest({
            requestId: request.id,
            controllerId: currentControllerId,
            result: failureResult,
          });
          return {
            claimed: true,
            requestId: request.id,
            kind: request.kind,
            result: completeResult.ok
              ? failureResult
              : { ok: false, reason: completeResult.reason },
          };
        }

        routeTopology = candidateTopology;
        for (const declaration of parsed.value.agents) {
          declaredAgents.set(declaration.name, declaration);
        }
        const outcomes: HostControllerAgentOutcome[] = [];
        for (const declaration of parsed.value.agents) {
          outcomes.push(await launchAgent(declaration));
        }
        const successResult = {
          ok: true,
          agents: outcomes,
          routes: listHostRouteSnapshots(routeTopology),
          effectiveEdgeCount: syncResult.routes.length,
        };
        const completeResult = await api.completeHostControlRequest({
          requestId: request.id,
          controllerId: currentControllerId,
          result: successResult,
        });
        return {
          claimed: true,
          requestId: request.id,
          kind: request.kind,
          result: completeResult.ok
            ? successResult
            : { ok: false, reason: completeResult.reason },
        };
      }

      if (request.kind === "host_remove") {
        const parsed = parseHostRemovePayload(request.payload);
        const issues = parsed.ok ? [] : parsed.issues;
        if (parsed.ok) {
          for (const name of parsed.agentNames) {
            if (!declaredAgents.has(name)) {
              issues.push({
                code: "unknown_agent",
                message: `agent "${name}" is not declared`,
              });
            }
          }
        }
        if (!parsed.ok || issues.length > 0) {
          const invalidResult = { ok: false, reason: "invalid_mutation", issues };
          const completeResult = await api.completeHostControlRequest({
            requestId: request.id,
            controllerId: currentControllerId,
            result: invalidResult,
          });
          return {
            claimed: true,
            requestId: request.id,
            kind: request.kind,
            result: completeResult.ok
              ? invalidResult
              : { ok: false, reason: completeResult.reason },
          };
        }

        const removed: string[] = [];
        const failures: TerminationFailure[] = [];
        for (const name of parsed.agentNames) {
          if (trackedAgents.has(name)) {
            try {
              const terminated = await terminator.terminate({ hostId, agentName: name });
              if (!terminated.ok) {
                failures.push({ name, reason: terminated.reason });
                continue;
              }
            } catch (error) {
              failures.push({ name, reason: describeError(error) });
              continue;
            }
            trackedAgents.delete(name);
            await api.detachHostAgent({ hostId, agentName: name });
          }
          removed.push(name);
        }

        const candidateTopology = removeAgentsFromHostRouteTopology(
          routeTopology,
          new Set(removed),
        );
        // Successful termination/detach is irreversible. Commit the
        // declaration-side removal before syncing derived routes so a sync
        // failure never pretends that an exited process was rolled back.
        routeTopology = candidateTopology;
        for (const name of removed) declaredAgents.delete(name);
        const syncResult = await api.syncHostEffectiveRoutes({
          hostId,
          edges: listDeclaredHostRouteEdges(routeTopology),
        });
        if (!syncResult.ok) {
          const failureResult = {
            ok: false,
            reason: "effective_route_sync_failed",
            routeSyncFailure:
              syncResult.reason === "host_agent_not_routable"
                ? { reason: syncResult.reason, agentName: syncResult.agentName }
                : { reason: syncResult.reason },
            removed,
            failures,
            routes: listHostRouteSnapshots(routeTopology),
          };
          const completeResult = await api.completeHostControlRequest({
            requestId: request.id,
            controllerId: currentControllerId,
            result: failureResult,
          });
          return {
            claimed: true,
            requestId: request.id,
            kind: request.kind,
            result: completeResult.ok
              ? failureResult
              : { ok: false, reason: completeResult.reason },
          };
        }

        const mutationResult = {
          ok: failures.length === 0,
          ...(failures.length === 0 ? {} : { reason: "partial_failure", failures }),
          removed,
          routes: listHostRouteSnapshots(routeTopology),
          effectiveEdgeCount: syncResult.routes.length,
        };
        const completeResult = await api.completeHostControlRequest({
          requestId: request.id,
          controllerId: currentControllerId,
          result: mutationResult,
        });
        return {
          claimed: true,
          requestId: request.id,
          kind: request.kind,
          result: completeResult.ok
            ? mutationResult
            : { ok: false, reason: completeResult.reason },
        };
      }

      if (request.kind === "host_route") {
        const parsed = parseHostRouteOperations(request.payload);
        const applied = parsed.ok
          ? applyHostRouteOperations(
              routeTopology,
              parsed.operations,
              new Set(declaredAgents.keys()),
            )
          : parsed;
        if (!applied.ok) {
          const invalidResult = { ok: false, reason: "invalid_mutation", issues: applied.issues };
          const completeResult = await api.completeHostControlRequest({
            requestId: request.id,
            controllerId: currentControllerId,
            result: invalidResult,
          });
          return {
            claimed: true,
            requestId: request.id,
            kind: request.kind,
            result: completeResult.ok
              ? invalidResult
              : { ok: false, reason: completeResult.reason },
          };
        }

        const syncResult = await api.syncHostEffectiveRoutes({
          hostId,
          edges: listDeclaredHostRouteEdges(applied.topology),
        });
        if (!syncResult.ok) {
          const failureResult = { ok: false, reason: "effective_route_sync_failed" };
          const completeResult = await api.completeHostControlRequest({
            requestId: request.id,
            controllerId: currentControllerId,
            result: failureResult,
          });
          return {
            claimed: true,
            requestId: request.id,
            kind: request.kind,
            result: completeResult.ok
              ? failureResult
              : { ok: false, reason: completeResult.reason },
          };
        }

        routeTopology = applied.topology;
        const successResult = {
          ok: true,
          routes: listHostRouteSnapshots(routeTopology),
          effectiveEdgeCount: syncResult.routes.length,
        };
        const completeResult = await api.completeHostControlRequest({
          requestId: request.id,
          controllerId: currentControllerId,
          result: successResult,
        });
        return {
          claimed: true,
          requestId: request.id,
          kind: request.kind,
          result: completeResult.ok
            ? successResult
            : { ok: false, reason: completeResult.reason },
        };
      }

      const exhaustive: never = request.kind;
      throw new Error(`unsupported host control request: ${exhaustive}`);
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

function parseHostAddPayload(
  payload: Record<string, unknown> | null,
):
  | { ok: true; value: ParsedHostAddPayload }
  | { ok: false; issues: Array<{ code: string; message: string }> } {
  if (!payload || !Array.isArray(payload.agents) || payload.agents.length === 0) {
    return {
      ok: false,
      issues: [{ code: "invalid_payload", message: "host add payload must contain agents" }],
    };
  }
  const agents: HostAgentDeclaration[] = [];
  const names = new Set<string>();
  for (const value of payload.agents) {
    if (typeof value !== "object" || value === null) {
      return {
        ok: false,
        issues: [{ code: "invalid_payload", message: "host add agent must be an object" }],
      };
    }
    const agent = value as Record<string, unknown>;
    if (
      (agent.agentKind !== "claude" && agent.agentKind !== "codex") ||
      typeof agent.name !== "string" ||
      agent.name.length === 0
    ) {
      return {
        ok: false,
        issues: [{ code: "invalid_payload", message: "host add agent kind/name is invalid" }],
      };
    }
    if (names.has(agent.name)) {
      return {
        ok: false,
        issues: [{ code: "duplicate_agent", message: `agent "${agent.name}" is duplicated` }],
      };
    }
    names.add(agent.name);
    agents.push({
      name: agent.name,
      kind: agent.agentKind,
      ...(typeof agent.role === "string" ? { role: agent.role } : {}),
      ...(typeof agent.description === "string" ? { description: agent.description } : {}),
      ...(typeof agent.instructions === "string" ? { instructions: agent.instructions } : {}),
    });
  }
  if (payload.routes === undefined) {
    return { ok: true, value: { agents, routeOperations: [] } };
  }
  const routes = parseHostRouteOperations({ routes: payload.routes });
  return routes.ok
    ? { ok: true, value: { agents, routeOperations: routes.operations } }
    : routes;
}

function parseHostRemovePayload(
  payload: Record<string, unknown> | null,
):
  | { ok: true; agentNames: string[] }
  | { ok: false; issues: Array<{ code: string; message: string }> } {
  if (!payload || !Array.isArray(payload.agentNames) || payload.agentNames.length === 0) {
    return {
      ok: false,
      issues: [{ code: "invalid_payload", message: "host remove payload must contain agentNames" }],
    };
  }
  if (!payload.agentNames.every((name) => typeof name === "string" && name.length > 0)) {
    return {
      ok: false,
      issues: [{ code: "invalid_payload", message: "host remove agent names must be non-empty" }],
    };
  }
  const agentNames = payload.agentNames as string[];
  if (new Set(agentNames).size !== agentNames.length) {
    return {
      ok: false,
      issues: [{ code: "duplicate_agent", message: "host remove agent names must be unique" }],
    };
  }
  return { ok: true, agentNames: [...agentNames] };
}
