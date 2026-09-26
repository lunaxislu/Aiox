import type { PersistentNetwork } from "@aiox/persistence";
import type {
    AgentView,
    HostNetworkView,
    HostView,
    NetworkView,
    PanelView,
} from "@aiox/protocol";

import { restartCommand } from "./managed-agents";
import type { RuntimeRecord } from "./runtimes";
import type { DaemonServices } from "./services";

type Runtimes = Pick<DaemonServices["runtimes"], "get" | "list">;

export function networkView(
    network: PersistentNetwork,
    runtimes: Pick<Runtimes, "get">,
): NetworkView {
    return {
        id: network.id,
        name: network.name,
        scope: "persistent",
        routes: network.routes.map(({ from, to }) => ({
            from,
            to,
            fromName: runtimes.get(from)?.name ?? from,
            toName: runtimes.get(to)?.name ?? to,
        })),
    };
}
export function agentView(
    record: RuntimeRecord,
    names: ReadonlyMap<string, string>,
): AgentView {
    return {
        agentId: record.id,
        executionOwnership: record.executionOwnership,
        name: record.name,
        role: record.role,
        description: record.description,
        status: record.status,
        networkId: record.networkId,
        networkName:
            record.networkId === null
                ? null
                : (names.get(record.networkId) ?? null),
        hostId: record.hostId,
        terminalId: record.terminalId,
        status_reason: record.status_reason,
        observation_error: record.observation_error,
    };
}
export function terminalView(
    services: {
        terminals: Pick<DaemonServices["terminals"], "view">;
        runtimes: Pick<Runtimes, "list">;
    },
    id: string,
) {
    const view = services.terminals.view(id);
    if (!view) return undefined;
    const record = services.runtimes
        .list()
        .find(
            (r) =>
                r.executionOwnership === "daemon" &&
                r.terminalId === id &&
                r.binding.terminal,
        );
    return record
        ? {
              ...view,
              vendor: {
                  runtimeId: record.id,
                  alive: record.binding.terminal!.alive,
                  relayDisconnected: record.binding.relayDisconnected === true,
                  collaborationActive: record.collaborationActive,
                  ...(record.binding.collaborationError
                      ? {
                            collaborationError:
                                record.binding.collaborationError,
                        }
                      : {}),
              },
          }
        : view;
}

/** Stored panel facts plus live runtime evidence; stored history is never live evidence. */
export function projectPanel(
    panel: PanelView,
    runtimes: Runtimes,
    host?: HostView,
): PanelView {
    const live = runtimes.list();
    return {
        ...panel,
        tabs: panel.tabs.map((tab) => {
            const runtime =
                tab.terminalId === null
                    ? undefined
                    : live.find((r) => r.terminalId === tab.terminalId);
            if (runtime)
                return {
                    ...tab,
                    label: runtime.name,
                    runtimeId: runtime.id,
                    presentation:
                        runtime.phase === "preparing" ? "preparing" : "tui",
                    notice: null,
                };
            return {
                ...tab,
                label:
                    tab.presentation === "preparing"
                        ? (tab.agentKey ?? tab.label)
                        : tab.label,
                runtimeId: null,
                ...(host &&
                tab.agentKey &&
                tab.notice &&
                !tab.notice.restartCommand
                    ? {
                          notice: {
                              ...tab.notice,
                              restartCommand: restartCommand(
                                  host,
                                  tab.agentKey,
                              ),
                          },
                      }
                    : {}),
            };
        }),
    };
}

export function projectHost(host: HostView, runtimes: Runtimes): HostView {
    const live = runtimes.list();
    return {
        ...host,
        agents: host.agents.map((agent) => {
            const runtime = live.find(
                (r) => r.hostId === host.id && r.name === agent.key,
            );
            return {
                ...agent,
                runtime: runtime?.terminalId
                    ? {
                          id: runtime.id,
                          terminalId: runtime.terminalId,
                          phase: runtime.phase,
                          status: runtime.status,
                          status_reason: runtime.status_reason,
                          observation_error: runtime.observation_error,
                          collaborationActive: runtime.collaborationActive,
                          collaborationError:
                              runtime.binding.collaborationError ?? null,
                      }
                    : null,
            };
        }),
    };
}

export function projectHostNetwork(
    network: HostNetworkView,
    runtimes: Runtimes,
): HostNetworkView {
    const active = new Map<string, string>();
    for (const runtime of runtimes.list()) {
        if (
            runtime.hostId === network.hostId &&
            runtime.networkId === network.id &&
            runtime.collaborationActive &&
            !active.has(runtime.name)
        )
            active.set(runtime.name, runtime.id);
    }
    const runtimeId = (key: string) => active.get(key) ?? null;
    return {
        ...network,
        members: network.members.map((member) => ({
            ...member,
            runtimeId: runtimeId(member.agentKey),
        })),
        edges: network.edges.map((edge) => ({
            ...edge,
            fromRuntimeId: runtimeId(edge.from),
            toRuntimeId: runtimeId(edge.to),
        })),
    };
}
