import type { HostStateSnapshot } from "@aiox/persistence";
import type { PersistentNetwork } from "@aiox/persistence";
import type { AgentView, NetworkView, WebSnapshot } from "@aiox/protocol";
import { webSnapshotSchema } from "@aiox/protocol";

import { restartCommand } from "./managed-agents";
import type { RuntimeRecord } from "./runtimes";
import type { DaemonServices } from "./services";

export function networkView(
    network: PersistentNetwork,
    runtimes: DaemonServices["runtimes"],
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
export function terminalView(services: DaemonServices, id: string) {
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
/** WebEvents retries this read if an observed mutation overlaps its asynchronous reads. */
export async function readWebSnapshot(
    services: DaemonServices,
): Promise<WebSnapshot> {
    const state = projectHostState(
        await services.db.hostState.snapshot(),
        services,
    );
    const networks = await services.networks.list();
    const notifications = await services.db.messages.unreadNotifications();
    const names = new Map(
        [...networks, ...state.networks].map((n) => [n.id, n.name]),
    );
    return webSnapshotSchema.parse({
        ...state,
        networks: [
            ...state.networks,
            ...networks.map((n) => networkView(n, services.runtimes)),
        ],
        terminals: services.terminals
            .views()
            .map((t) => terminalView(services, t.id)),
        agents: services.runtimes.list().map((r) => agentView(r, names)),
        notifications: notifications
            .filter((n) => n.originExecutionOwnership === "daemon")
            .map((n) => ({
                id: n.id,
                originRuntimeId: n.originRuntimeId,
                terminalId: n.originTerminalId,
                body: n.body,
                createdAt: n.createdAt,
                readAt: n.readAt,
            })),
    });
}

export function projectPanels(
    panels: WebSnapshot["panels"],
    services: DaemonServices,
) {
    const runtimes = services.runtimes.list();
    return panels.map((panel) => ({
        ...panel,
        tabs: panel.tabs.map((tab) => {
            const runtime =
                tab.terminalId === null
                    ? undefined
                    : runtimes.find((r) => r.terminalId === tab.terminalId);
            return {
                ...tab,
                runtimeId: runtime?.id ?? null,
                ...(runtime
                    ? {
                          presentation:
                              runtime.phase === "preparing"
                                  ? ("preparing" as const)
                                  : ("tui" as const),
                          notice: null,
                      }
                    : {}),
            };
        }),
    }));
}

/** One projection for HTTP reads and SSE snapshot/state; stored history is never live evidence. */
export function projectHostState(
    state: HostStateSnapshot,
    services: DaemonServices,
): HostStateSnapshot {
    const runtimes = services.runtimes.list();
    return {
        ...state,
        hosts: state.hosts.map((host) => ({
            ...host,
            agents: host.agents.map((agent) => {
                const runtime = runtimes.find(
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
        })),
        networks: state.networks.map((network) => {
            const runtimeId = (key: string) =>
                runtimes.find(
                    (r) =>
                        r.hostId === network.hostId &&
                        r.networkId === network.id &&
                        r.name === key &&
                        r.collaborationActive,
                )?.id ?? null;
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
        }),
        panels: projectPanels(state.panels, services).map((panel) => {
            const host = state.hosts.find((h) => h.id === panel.hostId);
            return {
                ...panel,
                tabs: panel.tabs.map((tab) => ({
                    ...tab,
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
                })),
            };
        }),
    };
}
