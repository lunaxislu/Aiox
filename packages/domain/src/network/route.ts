import type { AgentRuntime } from "@/agent/runtime";
import type { Network } from "@/network/network";

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
