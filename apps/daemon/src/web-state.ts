import type { PersistentNetwork } from "@aiox/persistence";
import type { AgentView, NetworkView, WebSnapshot } from "@aiox/protocol";
import { webSnapshotSchema } from "@aiox/protocol";

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
    const state = await services.db.hostState.snapshot();
    const networks = await services.networks.list();
    const notifications = await services.db.messages.unreadNotifications();
    state.panels = projectPanels(state.panels, services);
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
        tabs: panel.tabs.map((tab) => ({
            ...tab,
            runtimeId:
                tab.terminalId === null
                    ? null
                    : (runtimes.find((r) => r.terminalId === tab.terminalId)
                          ?.id ?? null),
        })),
    }));
}
