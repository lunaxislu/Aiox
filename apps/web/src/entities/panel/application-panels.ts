import type { PanelLayout as StoredLayout, PanelView } from "@aiox/protocol";

import type { applicationView } from "@/shared/api/application-store";

import type { PanelPreview } from "./model";
import type { PanelLayout } from "./workspace-layout";

export function selectedLayout(
    layout: StoredLayout,
    selected: Record<string, string | null> = {},
): PanelLayout {
    return layout.type === "pane"
        ? {
              ...layout,
              selectedTabId: selected[layout.id] ?? layout.tabIds[0] ?? null,
          }
        : {
              ...layout,
              children: layout.children.map((child) =>
                  selectedLayout(child, selected),
              ),
          };
}
function shellQuote(value: string): string {
    return "'" + value.replaceAll("'", "'\"'\"'") + "'";
}

export function applicationPanels(
    state: ReturnType<typeof applicationView>,
): PanelPreview[] {
    return state.panels.map((panel: PanelView) => {
        const terminalIds = new Set(
            panel.tabs.flatMap((tab) =>
                tab.terminalId ? [tab.terminalId] : [],
            ),
        );
        const agents = state.agents
            .filter(
                (agent) =>
                    (panel.hostId !== null && agent.hostId === panel.hostId) ||
                    (panel.kind === "network" &&
                        panel.networkId !== null &&
                        agent.networkId === panel.networkId) ||
                    (agent.terminalId !== null &&
                        terminalIds.has(agent.terminalId)),
            )
            .map((agent) => ({ ...agent, id: agent.agentId }));
        const host = state.hosts.find((host) => host.id === panel.hostId);
        const network = state.networks.find(
            (network) => network.id === panel.networkId,
        );
        const layout = selectedLayout(panel.layout);
        const firstPane = (node: PanelLayout): string =>
            node.type === "pane" ? node.id : firstPane(node.children[0]!);
        const common = {
            ...panel,
            layout,
            activePaneId: firstPane(layout),
            terminalCount: terminalIds.size,
            agents,
        };
        if (panel.kind === "host")
            return {
                ...common,
                kind: "host",
                workPath: host?.directory ?? "",
                ...(host
                    ? {
                          command: `aiox host run --path ${shellQuote(host.directory)} --file ${shellQuote(host.sourceFile)}`,
                      }
                    : {}),
            };
        if (panel.kind === "network")
            return {
                ...common,
                kind: "network",
                memberCount:
                    network && "members" in network
                        ? network.members.length
                        : state.agents.filter(
                              (agent) => agent.networkId === panel.networkId,
                          ).length,
                routeCount: network
                    ? "routes" in network
                        ? network.routes.length
                        : network.edges.filter(
                              (edge) => edge.policy === "allow",
                          ).length
                    : 0,
            };
        return { ...common, kind: "workspace" };
    });
}
