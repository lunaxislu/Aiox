import {
    panelLayoutReferences,
    removePanelTabs,
    type PanelLayout,
    type TabView,
} from "@aiox/protocol";

import type { WorkspaceLayout } from "@/entities/panel/workspace-fixtures";

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

/** 배치·초점 재정렬은 daemon과 같은 `removePanelTabs`를 쓰고 탭 목록만 여기서 줄인다. */
export function closePreviewTab(
    state: WorkspaceLayout,
    tabId: string,
): WorkspaceLayout {
    return {
        ...removePanelTabs(state, new Set([tabId])),
        tabs: state.tabs.filter((tab) => tab.id !== tabId),
    };
}

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
