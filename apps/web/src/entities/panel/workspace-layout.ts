import {
    panelLayoutReferences as references,
    removePanelTabs as removeTabs,
    type PanelLayout as StoredLayout,
    type TabView,
} from "@aiox/protocol";

/** Selection belongs only to this React app's memory, never to the wire layout. */
export type PanelLayout =
    | (Extract<StoredLayout, { type: "pane" }> & {
          selectedTabId: string | null;
      })
    | (Omit<Extract<StoredLayout, { type: "split" }>, "children"> & {
          children: PanelLayout[];
      });
export type WorkspaceLayout = {
    layout: PanelLayout;
    activePaneId: string;
    tabs: TabView[];
};

export function panelLayoutReferences(layout: PanelLayout) {
    // The shared traversal returns the original nodes, including local selection.
    return references(layout) as {
        panes: Extract<PanelLayout, { type: "pane" }>[];
        splits: Extract<PanelLayout, { type: "split" }>[];
        tabIds: string[];
    };
}

/** Keep local selection valid after shared layout pruning. */
export function removePanelTabs(
    state: Pick<WorkspaceLayout, "layout" | "activePaneId">,
    ids: ReadonlySet<string>,
) {
    const before = panelLayoutReferences(state.layout).panes;
    const stored = removeTabs(state, ids).layout;
    const select = (node: StoredLayout): PanelLayout => {
        if (node.type === "split")
            return { ...node, children: node.children.map(select) };
        const previous = before.find((pane) => pane.id === node.id);
        const oldSelection = previous?.selectedTabId;
        const selectedTabId =
            oldSelection && node.tabIds.includes(oldSelection)
                ? oldSelection
                : (previous?.tabIds
                      .slice(previous.tabIds.indexOf(oldSelection ?? "") + 1)
                      .find((id) => node.tabIds.includes(id)) ??
                  node.tabIds.at(-1) ??
                  null);
        return { ...node, selectedTabId };
    };
    const layout = select(stored);
    const remaining = new Set(
        panelLayoutReferences(layout).panes.map((pane) => pane.id),
    );
    const index = before.findIndex((pane) => pane.id === state.activePaneId);
    const activePaneId = remaining.has(state.activePaneId)
        ? state.activePaneId
        : (before.slice(index + 1).find((pane) => remaining.has(pane.id)) ??
              before
                  .slice(0, index)
                  .reverse()
                  .find((pane) => remaining.has(pane.id)))!.id;
    return { layout, activePaneId };
}

/** Strip local fields when validating or submitting the shared layout shape. */
export function storedLayout(layout: PanelLayout): StoredLayout {
    return layout.type === "pane"
        ? { type: "pane", id: layout.id, tabIds: layout.tabIds }
        : { ...layout, children: layout.children.map(storedLayout) };
}
