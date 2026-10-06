import { type TabView } from "@aiox/protocol";

import type { WorkspaceLayout } from "@/entities/panel/workspace-fixtures";
import {
    panelLayoutReferences,
    removePanelTabs,
    type PanelLayout,
} from "@/entities/panel/workspace-layout";

type Pane = Extract<PanelLayout, { type: "pane" }>;
export function updatePane(
    layout: PanelLayout,
    paneId: string,
    update: (pane: Pane) => PanelLayout,
): PanelLayout {
    return layout.type === "pane"
        ? layout.id === paneId
            ? update(layout)
            : layout
        : {
              ...layout,
              children: layout.children.map((child) =>
                  updatePane(child, paneId, update),
              ),
          };
}

export function selectPreviewTab(
    state: WorkspaceLayout,
    paneId: string,
    tabId: string,
): WorkspaceLayout {
    const pane = panelLayoutReferences(state.layout).panes.find(
        (item) => item.id === paneId,
    );
    if (!pane?.tabIds.includes(tabId)) return state;
    return {
        ...state,
        activePaneId: paneId,
        layout: updatePane(state.layout, paneId, (item) => ({
            ...item,
            selectedTabId: tabId,
        })),
    };
}

/** Prune the shared layout and reconcile this React app's local selection. */
export function closePreviewTab(
    state: WorkspaceLayout,
    tabId: string,
): WorkspaceLayout {
    return {
        ...removePanelTabs(state, new Set([tabId])),
        tabs: state.tabs.filter((tab) => tab.id !== tabId),
    };
}

/** A new split is named after the pane it introduces, so both IDs travel together. */
export const splitIdFor = (paneId: string) => `split:${paneId}`;

export function addPreviewShell(
    state: WorkspaceLayout,
    paneId: string,
    tab: TabView,
    newPaneId: string,
    axis?: "x" | "y",
): WorkspaceLayout {
    const layout = updatePane(state.layout, paneId, (pane) =>
        axis
            ? {
                  type: "split",
                  id: splitIdFor(newPaneId),
                  axis,
                  weights: [0.5, 0.5],
                  children: [
                      pane,
                      {
                          type: "pane",
                          id: newPaneId,
                          tabIds: [tab.id],
                          selectedTabId: tab.id,
                      },
                  ],
              }
            : {
                  ...pane,
                  tabIds: [...pane.tabIds, tab.id],
                  selectedTabId: tab.id,
              },
    );
    return {
        layout,
        tabs: [...state.tabs, tab],
        activePaneId: axis ? newPaneId : paneId,
    };
}

export type TabDrop = {
    paneId: string;
    zone: "tabbar" | "center" | "left" | "right" | "top" | "bottom";
    index?: number;
};

/** Normalized distance makes corner ties deterministic, matching version9. */
export function dropZone(x: number, y: number): TabDrop["zone"] {
    const edges = [
        ["left", x],
        ["right", 1 - x],
        ["top", y],
        ["bottom", 1 - y],
    ] as const;
    const closest = edges.reduce((best, edge) =>
        edge[1] < best[1] ? edge : best,
    );
    return closest[1] < 0.2 ? closest[0] : "center";
}

export function movePreviewTab(
    state: WorkspaceLayout,
    tabId: string,
    target: TabDrop,
    newPaneId: string,
): WorkspaceLayout {
    const panes = panelLayoutReferences(state.layout).panes;
    const source = panes.find((pane) => pane.tabIds.includes(tabId));
    const destination = panes.find((pane) => pane.id === target.paneId);
    if (!source || !destination) return state;
    const split = target.zone !== "tabbar" && target.zone !== "center";
    if (source.id === destination.id && split && source.tabIds.length === 1)
        return state;
    if (source.id === destination.id && !split) {
        const from = source.tabIds.indexOf(tabId);
        const requested =
            target.zone === "tabbar"
                ? (target.index ?? source.tabIds.length)
                : source.tabIds.length;
        const tabIds = source.tabIds.filter((id) => id !== tabId);
        tabIds.splice(
            Math.max(
                0,
                Math.min(tabIds.length, requested - (requested > from ? 1 : 0)),
            ),
            0,
            tabId,
        );
        return {
            ...state,
            activePaneId: source.id,
            layout: updatePane(state.layout, source.id, (pane) => ({
                ...pane,
                tabIds,
                selectedTabId: tabId,
            })),
        };
    }
    // Keep the destination populated before pruning. Removing the last global tab
    // first would collapse the tree and erase an empty destination pane.
    let sourceReference = `moving:${tabId}`;
    const existing = new Set(panes.flatMap((pane) => pane.tabIds));
    while (existing.has(sourceReference))
        sourceReference = `moving:${sourceReference}`;
    const pending = updatePane(state.layout, source.id, (pane) => ({
        ...pane,
        tabIds: pane.tabIds.map((id) => (id === tabId ? sourceReference : id)),
        selectedTabId:
            pane.selectedTabId === tabId ? sourceReference : pane.selectedTabId,
    }));
    const inserted = updatePane(pending, destination.id, (pane) => {
        if (!split) {
            const tabIds = [...pane.tabIds];
            tabIds.splice(
                target.zone === "tabbar"
                    ? Math.max(
                          0,
                          Math.min(
                              tabIds.length,
                              target.index ?? tabIds.length,
                          ),
                      )
                    : tabIds.length,
                0,
                tabId,
            );
            return { ...pane, tabIds, selectedTabId: tabId };
        }
        const added: Pane = {
            type: "pane",
            id: newPaneId,
            tabIds: [tabId],
            selectedTabId: tabId,
        };
        return {
            type: "split",
            id: splitIdFor(newPaneId),
            axis: target.zone === "left" || target.zone === "right" ? "x" : "y",
            weights: [0.5, 0.5],
            children:
                target.zone === "left" || target.zone === "top"
                    ? [added, pane]
                    : [pane, added],
        };
    });
    const activePaneId = split ? newPaneId : destination.id;
    const { layout } = removePanelTabs(
        { layout: inserted, activePaneId },
        new Set([sourceReference]),
    );
    return { ...state, layout, activePaneId };
}

/**
 * The terminal a new shell inherits its directory from. A tab showing a notice
 * keeps a terminal ID the daemon no longer serves, and sourcing it is refused.
 */
export function shellSource(state: WorkspaceLayout, paneId: string) {
    const pane = panelLayoutReferences(state.layout).panes.find(
        (candidate) => candidate.id === paneId,
    );
    const tab = state.tabs.find(
        (candidate) => candidate.id === pane?.selectedTabId,
    );
    return tab && !tab.notice && tab.terminalId ? tab.terminalId : undefined;
}
/** Only selected terminal bodies need browser resources; notices take precedence. */
export function visibleTerminals(state: WorkspaceLayout) {
    const tabs = new Map(state.tabs.map((tab) => [tab.id, tab]));
    return panelLayoutReferences(state.layout).panes.flatMap((pane) => {
        const tab = pane.selectedTabId
            ? tabs.get(pane.selectedTabId)
            : undefined;
        return tab && !tab.notice && tab.terminalId
            ? [{ paneId: pane.id, tab, terminalId: tab.terminalId }]
            : [];
    });
}
