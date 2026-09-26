import {
    insertPanelTab,
    panelLayoutReferences,
    movePanelTab,
    removePanelTabs,
    resizePanelSplit,
    type PanelView,
    type TabView,
    type WebCommandRequest,
} from "@aiox/protocol";

export type PanelInput = Pick<WebCommandRequest, "panelId" | "changes">;
const preparingTab = (id: string): TabView => ({
    id,
    terminalId: null,
    label: "Shell",
    agentKey: null,
    runtimeId: null,
    presentation: "preparing",
    notice: null,
});

/** Rebase intent over today's server state; never restore an old panel snapshot. */
export function projectPanel(
    current: PanelView | undefined,
    input: PanelInput,
) {
    let panel = current;
    for (const change of input.changes) {
        if (change.type === "panel.create") {
            panel ??= {
                id: input.panelId,
                kind: "workspace",
                section: change.section ?? "workspaces",
                name: change.name,
                hostId: null,
                networkId: null,
                revision: 1,
                layout: {
                    type: "pane",
                    id: change.paneId,
                    tabIds: [change.tabId],
                },
                tabs: [preparingTab(change.tabId)],
            };
            continue;
        }
        if (!panel) return undefined;
        switch (change.type) {
            case "panel.rename":
                panel = { ...panel, name: change.name };
                break;
            case "panel.delete":
                if (change.confirm) panel = undefined;
                break;
            case "tab.create":
                if (!panel.tabs.some((tab) => tab.id === change.tabId))
                    panel = {
                        ...panel,
                        ...insertPanelTab(panel, change.tabId, change.target),
                        tabs: [...panel.tabs, preparingTab(change.tabId)],
                    };
                break;
            case "tab.move":
                if (
                    "split" in change.target &&
                    panelLayoutReferences(panel.layout).panes.some(
                        (pane) =>
                            "split" in change.target &&
                            pane.id === change.target.split.paneId &&
                            pane.tabIds.includes(change.tabId),
                    )
                )
                    break;
                panel = {
                    ...panel,
                    ...movePanelTab(panel, change.tabId, change.target),
                };
                break;
            case "tab.close":
                if (!change.confirm) break;
                panel = {
                    ...panel,
                    ...removePanelTabs(panel, new Set([change.tabId])),
                    tabs: panel.tabs.filter((tab) => tab.id !== change.tabId),
                };
                break;
            case "tab.dismiss":
                panel = {
                    ...panel,
                    tabs: panel.tabs.map((tab) =>
                        tab.id === change.tabId
                            ? {
                                  ...tab,
                                  agentKey: null,
                                  runtimeId: null,
                                  presentation: "shell",
                                  notice: null,
                              }
                            : tab,
                    ),
                };
                break;
            case "split.resize":
                panel = {
                    ...panel,
                    layout: resizePanelSplit(
                        panel.layout,
                        change.splitId,
                        change.children,
                        change.weights,
                    ),
                };
                break;
        }
    }
    return panel;
}

export function createdIds(input: PanelInput): string[] {
    return input.changes.flatMap((change) => [
        ...(change.type === "panel.create"
            ? [input.panelId, change.paneId, change.tabId]
            : []),
        ...(change.type === "tab.create" ? [change.tabId] : []),
        ...("target" in change && "split" in change.target
            ? [change.target.split.paneId, change.target.split.splitId]
            : []),
    ]);
}

export function referencedIds(input: PanelInput): string[] {
    return [
        input.panelId,
        ...input.changes.flatMap((change) => [
            ...("tabId" in change &&
            change.type !== "tab.create" &&
            change.type !== "panel.create"
                ? [change.tabId]
                : []),
            ...(change.type === "split.resize"
                ? [change.splitId, ...change.children]
                : []),
            ...("target" in change
                ? "split" in change.target
                    ? [change.target.split.targetPaneId]
                    : [
                          change.target.toPaneId,
                          ...(change.target.beforeTabId
                              ? [change.target.beforeTabId]
                              : []),
                      ]
                : []),
        ]),
    ];
}
