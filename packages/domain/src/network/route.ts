import type { AgentRuntime } from "@/agent/runtime";
import type { DirectedRoute, Network, RoutePolicy } from "@/network/network";

export function canSend(
    network: Network,
    source: AgentRuntime,
    target: AgentRuntime,
): boolean {
    if (
        source.id === target.id ||
        source.networkId !== network.id ||
        target.networkId !== network.id
    ) {
        return false;
    }
    const route = network.routes.find(
        (edge) => edge.from === source.id && edge.to === target.id,
    );
    return (route?.policy ?? network.defaultPolicy) === "allow";
}

/** Shared by discovery and send; callers must use current registry snapshots. */
export function outboundTargets<T extends AgentRuntime>(
    network: Network,
    source: AgentRuntime,
    candidates: readonly T[],
): T[] {
    return candidates.filter((target) => canSend(network, source, target));
}

/** One route call is one kind of change. `reset` drops the explicit edge. */
export type RouteOperation =
    | { readonly kind: "default"; readonly policy: RoutePolicy }
    | { readonly kind: "reset-default" }
    | {
          readonly kind: "between";
          readonly policy: RoutePolicy | "reset";
          readonly agents: readonly string[];
      }
    | {
          readonly kind: "directed";
          readonly policy: RoutePolicy | "reset";
          readonly from: string;
          readonly to: readonly string[];
      };

export class RouteOperationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RouteOperationError";
    }
}

type EdgeOperation = Extract<RouteOperation, { kind: "between" | "directed" }>;

function edgesOf(operation: EdgeOperation): { from: string; to: string }[] {
    if (operation.kind === "directed") {
        if (operation.to.length === 0)
            throw new RouteOperationError(
                "A directed routing operation needs at least one target",
            );
        if (operation.to.includes(operation.from))
            throw new RouteOperationError(
                "A directed routing operation cannot target its own source",
            );
        return operation.to.map((to) => ({ from: operation.from, to }));
    }
    const agents = [...new Set(operation.agents)];
    if (agents.length < 2)
        throw new RouteOperationError(
            "A between operation requires at least two distinct agents",
        );
    // A mutual clique, excluding self edges. Never transitive beyond the list.
    return agents.flatMap((from) =>
        agents.filter((to) => to !== from).map((to) => ({ from, to })),
    );
}

/**
 * Applies one route change to a routing snapshot. The edge layer holds at most
 * one policy per directed edge, so a new value replaces the old one.
 */
export function applyRouteOperation(
    current: Pick<Network, "defaultPolicy" | "routes">,
    operation: RouteOperation,
): { defaultPolicy: RoutePolicy; routes: DirectedRoute[] } {
    const routes = [...current.routes];
    if (operation.kind === "default")
        return { defaultPolicy: operation.policy, routes };
    if (operation.kind === "reset-default")
        throw new RouteOperationError(
            "A persistent network has no runtime default override to reset",
        );
    const edges = edgesOf(operation);
    const remaining = routes.filter(
        (route) =>
            !edges.some(
                (edge) => edge.from === route.from && edge.to === route.to,
            ),
    );
    return {
        defaultPolicy: current.defaultPolicy,
        routes:
            operation.policy === "reset"
                ? remaining
                : [
                      ...remaining,
                      ...edges.map((edge) => ({
                          ...edge,
                          policy: operation.policy as RoutePolicy,
                      })),
                  ],
    };
}
