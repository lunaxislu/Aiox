import type Database from "better-sqlite3";
import { isAbsolute, resolve } from "node:path";

import type { AgentKind } from "../core/agents.js";
import type {
  HostControlRequestFailureReason,
  HostControlRequestKind,
} from "../core/hosts.js";
import {
  createHostAgentRepository,
  type StoredHostAgent,
} from "../store/repositories/host-agents.js";
import {
  createHostControlRequestRepository,
  type StoredHostControlRequest,
} from "../store/repositories/host-control-requests.js";
import {
  createRunningHostRepository,
  type StoredRunningHost,
} from "../store/repositories/running-hosts.js";
import { purgeRunningHostRuntime } from "../store/schema.js";
import { withTransaction } from "../store/transaction.js";

/**
 * Running-host runtime: identity, host-scoped agent runtime and the control
 * relay that lets another shell's CLI reach a running host's foreground
 * controller through the existing daemon socket/API.
 *
 * Everything here is runtime-only. A host exists while its foreground
 * controller runs; unregistering deletes the host, its scoped agents and the
 * requests routed to it, and a daemon restart starts from an empty registry.
 */

export interface CreateHostRuntimeOptions {
  db: Database;
  createId: () => string;
  now: () => string;
}

export interface HostAgentDeclaration {
  name: string;
  kind: AgentKind;
  role?: string;
  description?: string;
  instructions?: string;
}

export interface RegisterRunningHostRequest {
  name: string;
  path: string;
  controllerId: string;
  /**
   * Registered together with the host in a single transaction: either the host
   * and every declared agent exist, or nothing does.
   */
  agents?: readonly HostAgentDeclaration[];
}

export type RegisterRunningHostResult =
  | { ok: true; host: StoredRunningHost; agents: StoredHostAgent[] }
  | { ok: false; reason: "host_path_not_absolute"; path: string }
  | { ok: false; reason: "host_already_running"; host: StoredRunningHost }
  | { ok: false; reason: "host_agent_name_already_registered"; agentName: string };

export interface LookupRunningHostRequest {
  name: string;
  path?: string;
}

export type LookupRunningHostResult =
  | { ok: true; host: StoredRunningHost }
  | { ok: false; reason: "host_path_not_absolute"; path: string }
  | { ok: false; reason: "host_not_running"; name: string }
  | { ok: false; reason: "ambiguous_host_name"; name: string; candidatePaths: string[] }
  | {
      ok: false;
      reason: "host_name_path_mismatch";
      name: string;
      canonicalPath: string;
      actualName: string;
    };

export interface UnregisterRunningHostRequest {
  hostId: string;
}

export type UnregisterRunningHostResult =
  | {
      ok: true;
      host: StoredRunningHost;
      removedAgents: StoredHostAgent[];
      cancelledRequestIds: string[];
    }
  | { ok: false; reason: "host_not_running"; hostId: string };

export interface RegisterHostAgentRequest extends HostAgentDeclaration {
  hostId: string;
}

export type RegisterHostAgentResult =
  | { ok: true; agent: StoredHostAgent }
  | { ok: false; reason: "host_not_running"; hostId: string }
  | {
      ok: false;
      reason: "host_agent_name_already_registered";
      existing: StoredHostAgent;
    };

export interface HostAgentSelector {
  hostId: string;
  agentName: string;
}

export type HostAgentTransitionResult =
  | { ok: true; agent: StoredHostAgent }
  | { ok: false; reason: "host_not_running"; hostId: string }
  | {
      ok: false;
      reason: "host_agent_not_found";
      hostId: string;
      agentName: string;
    };

export interface SubmitHostControlRequest {
  name: string;
  path?: string;
  kind: HostControlRequestKind;
  /**
   * The normalized mutation for `kind`. The daemon stores and relays it without
   * interpreting it — applying the mutation is the foreground controller's job.
   */
  payload?: Record<string, unknown>;
}

export type SubmitHostControlRequestResult =
  | { ok: true; requestId: string; hostId: string }
  | Extract<LookupRunningHostResult, { ok: false }>;

export interface ClaimHostControlRequestRequest {
  hostId: string;
  controllerId: string;
}

export type ClaimHostControlRequestResult =
  | { ok: true; request: StoredHostControlRequest | null }
  | { ok: false; reason: "host_not_running"; hostId: string }
  | { ok: false; reason: "host_controller_mismatch"; hostId: string; controllerId: string };

export interface CompleteHostControlRequestRequest {
  requestId: string;
  controllerId: string;
  result: Record<string, unknown>;
}

export type CompleteHostControlRequestResult =
  | { ok: true; request: StoredHostControlRequest }
  | { ok: false; reason: "host_control_request_not_found"; requestId: string }
  | {
      ok: false;
      reason: "host_control_request_not_claimed";
      requestId: string;
      status: StoredHostControlRequest["status"];
    }
  | {
      ok: false;
      reason: "host_controller_mismatch";
      requestId: string;
      controllerId: string;
    };

/**
 * Consumed exactly once: a terminal outcome is returned to the requester and
 * the runtime row is dropped with it.
 */
export type TakeHostControlRequestResultResult =
  | { ok: true; status: "pending" | "claimed" }
  | { ok: true; status: "completed"; result: Record<string, unknown> }
  | { ok: true; status: "failed"; failureReason: HostControlRequestFailureReason }
  | { ok: false; reason: "host_control_request_not_found"; requestId: string };

export interface HostRuntime {
  registerRunningHost(request: RegisterRunningHostRequest): RegisterRunningHostResult;
  lookupRunningHost(request: LookupRunningHostRequest): LookupRunningHostResult;
  listRunningHosts(): StoredRunningHost[];
  unregisterRunningHost(request: UnregisterRunningHostRequest): UnregisterRunningHostResult;
  registerHostAgent(request: RegisterHostAgentRequest): RegisterHostAgentResult;
  markHostAgentReady(request: HostAgentSelector): HostAgentTransitionResult;
  detachHostAgent(request: HostAgentSelector): HostAgentTransitionResult;
  listHostAgents(request: { hostId: string }): StoredHostAgent[];
  submitHostControlRequest(
    request: SubmitHostControlRequest,
  ): SubmitHostControlRequestResult;
  claimHostControlRequest(
    request: ClaimHostControlRequestRequest,
  ): ClaimHostControlRequestResult;
  completeHostControlRequest(
    request: CompleteHostControlRequestRequest,
  ): CompleteHostControlRequestResult;
  takeHostControlRequestResult(request: {
    requestId: string;
  }): TakeHostControlRequestResultResult;
}

export function createHostRuntime(options: CreateHostRuntimeOptions): HostRuntime {
  // A previous daemon's rows are stale by definition: their foreground
  // controllers died with that daemon and nothing can complete their requests.
  purgeRunningHostRuntime(options.db);

  const hosts = createRunningHostRepository(options.db);
  const hostAgents = createHostAgentRepository(options.db);
  const controlRequests = createHostControlRequestRepository(options.db);

  function lookupHost(request: LookupRunningHostRequest): LookupRunningHostResult {
    if (request.path !== undefined) {
      const canonicalPath = canonicalizeHostPath(request.path);

      if (canonicalPath === null) {
        return { ok: false, reason: "host_path_not_absolute", path: request.path };
      }

      const host = hosts.findByCanonicalPath(canonicalPath);

      if (!host) {
        return { ok: false, reason: "host_not_running", name: request.name };
      }

      if (host.name !== request.name) {
        return {
          ok: false,
          reason: "host_name_path_mismatch",
          name: request.name,
          canonicalPath,
          actualName: host.name,
        };
      }

      return { ok: true, host };
    }

    const matches = hosts.findAllByName(request.name);

    if (matches.length === 0) {
      return { ok: false, reason: "host_not_running", name: request.name };
    }

    if (matches.length > 1) {
      return {
        ok: false,
        reason: "ambiguous_host_name",
        name: request.name,
        candidatePaths: matches.map((host) => host.canonicalPath),
      };
    }

    return { ok: true, host: matches[0]! };
  }

  function insertHostAgent(
    hostId: string,
    declaration: HostAgentDeclaration,
  ): StoredHostAgent {
    return hostAgents.insert({
      id: options.createId(),
      hostId,
      name: declaration.name,
      kind: declaration.kind,
      ...(declaration.role === undefined ? {} : { role: declaration.role }),
      ...(declaration.description === undefined
        ? {}
        : { description: declaration.description }),
      ...(declaration.instructions === undefined
        ? {}
        : { instructions: declaration.instructions }),
      now: options.now(),
    });
  }

  return {
    registerRunningHost(request) {
      const canonicalPath = canonicalizeHostPath(request.path);

      if (canonicalPath === null) {
        return { ok: false, reason: "host_path_not_absolute", path: request.path };
      }

      const existing = hosts.findByCanonicalPath(canonicalPath);

      if (existing) {
        return { ok: false, reason: "host_already_running", host: existing };
      }

      try {
        return withTransaction(options.db, () => {
          const host = hosts.insert({
            id: options.createId(),
            name: request.name,
            canonicalPath,
            controllerId: request.controllerId,
            now: options.now(),
          });

          const agents: StoredHostAgent[] = [];
          const declaredNames = new Set<string>();

          for (const declaration of request.agents ?? []) {
            if (declaredNames.has(declaration.name)) {
              // Rolls the host row back together with the agents: a partially
              // registered host would leave a running host nobody asked for.
              throw createHostAgentRollback(declaration.name);
            }
            declaredNames.add(declaration.name);
            agents.push(insertHostAgent(host.id, declaration));
          }

          return { ok: true as const, host, agents };
        });
      } catch (error) {
        if (isHostAgentRollback(error)) {
          return {
            ok: false,
            reason: "host_agent_name_already_registered",
            agentName: error.agentName,
          };
        }

        throw error;
      }
    },

    lookupRunningHost: lookupHost,

    listRunningHosts() {
      return hosts.list();
    },

    unregisterRunningHost(request) {
      return withTransaction(options.db, () => {
        const host = hosts.remove(request.hostId);

        if (!host) {
          return {
            ok: false as const,
            reason: "host_not_running" as const,
            hostId: request.hostId,
          };
        }

        // In-flight requests are terminalized rather than deleted: their
        // requesters are still waiting and must observe a definite outcome
        // instead of a request that never resolves.
        const cancelled = controlRequests.failAllInFlightForHost({
          hostId: host.id,
          failureReason: "host_unregistered",
          now: options.now(),
        });

        return {
          ok: true as const,
          host,
          removedAgents: hostAgents.removeAllForHost(host.id),
          cancelledRequestIds: cancelled.map((request) => request.id),
        };
      });
    },

    registerHostAgent(request) {
      if (!hosts.findById(request.hostId)) {
        return { ok: false, reason: "host_not_running", hostId: request.hostId };
      }

      const existing = hostAgents.find({ hostId: request.hostId, name: request.name });

      if (existing) {
        return { ok: false, reason: "host_agent_name_already_registered", existing };
      }

      return { ok: true, agent: insertHostAgent(request.hostId, request) };
    },

    markHostAgentReady(request) {
      if (!hosts.findById(request.hostId)) {
        return { ok: false, reason: "host_not_running", hostId: request.hostId };
      }

      const agent = hostAgents.updateStatus({
        hostId: request.hostId,
        name: request.agentName,
        status: "ready",
        now: options.now(),
      });

      if (!agent) {
        return {
          ok: false,
          reason: "host_agent_not_found",
          hostId: request.hostId,
          agentName: request.agentName,
        };
      }

      return { ok: true, agent };
    },

    detachHostAgent(request) {
      if (!hosts.findById(request.hostId)) {
        return { ok: false, reason: "host_not_running", hostId: request.hostId };
      }

      const agent = hostAgents.remove({
        hostId: request.hostId,
        name: request.agentName,
      });

      if (!agent) {
        return {
          ok: false,
          reason: "host_agent_not_found",
          hostId: request.hostId,
          agentName: request.agentName,
        };
      }

      return { ok: true, agent };
    },

    listHostAgents(request) {
      return hostAgents.listForHost(request.hostId);
    },

    submitHostControlRequest(request) {
      const lookup = lookupHost({
        name: request.name,
        ...(request.path === undefined ? {} : { path: request.path }),
      });

      if (!lookup.ok) {
        return lookup;
      }

      const stored = controlRequests.insert({
        id: options.createId(),
        hostId: lookup.host.id,
        kind: request.kind,
        ...(request.payload === undefined ? {} : { payload: request.payload }),
        now: options.now(),
      });

      return { ok: true, requestId: stored.id, hostId: lookup.host.id };
    },

    claimHostControlRequest(request) {
      const host = hosts.findById(request.hostId);

      if (!host) {
        return { ok: false, reason: "host_not_running", hostId: request.hostId };
      }

      if (host.controllerId !== request.controllerId) {
        return {
          ok: false,
          reason: "host_controller_mismatch",
          hostId: request.hostId,
          controllerId: request.controllerId,
        };
      }

      const now = options.now();
      // A claim poll is the controller's liveness signal for its host.
      hosts.touch({ hostId: host.id, now });

      const pending = controlRequests.findNextPending(host.id);

      if (!pending) {
        return { ok: true, request: null };
      }

      return {
        ok: true,
        request: controlRequests.claim({
          requestId: pending.id,
          controllerId: request.controllerId,
          now,
        }),
      };
    },

    completeHostControlRequest(request) {
      const existing = controlRequests.findById(request.requestId);

      if (!existing) {
        return {
          ok: false,
          reason: "host_control_request_not_found",
          requestId: request.requestId,
        };
      }

      if (existing.status !== "claimed") {
        return {
          ok: false,
          reason: "host_control_request_not_claimed",
          requestId: request.requestId,
          status: existing.status,
        };
      }

      if (existing.claimedBy !== request.controllerId) {
        return {
          ok: false,
          reason: "host_controller_mismatch",
          requestId: request.requestId,
          controllerId: request.controllerId,
        };
      }

      const completed = controlRequests.complete({
        requestId: request.requestId,
        result: request.result,
        now: options.now(),
      });

      if (!completed) {
        return {
          ok: false,
          reason: "host_control_request_not_claimed",
          requestId: request.requestId,
          status: existing.status,
        };
      }

      return { ok: true, request: completed };
    },

    takeHostControlRequestResult(request) {
      const existing = controlRequests.findById(request.requestId);

      if (!existing) {
        return {
          ok: false,
          reason: "host_control_request_not_found",
          requestId: request.requestId,
        };
      }

      if (existing.status === "pending" || existing.status === "claimed") {
        return { ok: true, status: existing.status };
      }

      // Terminal outcomes are runtime-only and belong to exactly one requester,
      // so handing the result back also retires the row.
      controlRequests.remove(existing.id);

      if (existing.status === "completed") {
        return { ok: true, status: "completed", result: existing.result ?? {} };
      }

      return {
        ok: true,
        status: "failed",
        failureReason: existing.failureReason ?? "host_unregistered",
      };
    },
  };
}

const hostAgentRollbackSentinel = Symbol("aiox.hostRuntime.hostAgentRollback");

interface HostAgentRollback {
  [hostAgentRollbackSentinel]: true;
  agentName: string;
}

function createHostAgentRollback(agentName: string): HostAgentRollback {
  return { [hostAgentRollbackSentinel]: true, agentName };
}

function isHostAgentRollback(error: unknown): error is HostAgentRollback {
  return (
    typeof error === "object" &&
    error !== null &&
    hostAgentRollbackSentinel in error
  );
}

/**
 * Canonical path = `path.resolve` of an already-absolute path. A relative path
 * would silently resolve against the daemon's own cwd rather than the calling
 * shell's, so it is rejected instead of being guessed at.
 */
function canonicalizeHostPath(path: string): string | null {
  if (!isAbsolute(path)) {
    return null;
  }

  return resolve(path);
}
