import {
    panelLayoutReferences,
    type PanelTabTarget,
    type WebCommandRequest,
} from "@aiox/protocol";

import type { PanelLayout } from "@/entities/panel/workspace-layout";

import type { TabDrop } from "./workspace-preview";
export function dropTarget(
    layout: PanelLayout,
    tabId: string,
    drop: TabDrop,
): PanelTabTarget | null {
    const panes = panelLayoutReferences(layout).panes;
    const source = panes.find((pane) => pane.tabIds.includes(tabId));
    const destination = panes.find((pane) => pane.id === drop.paneId);
    if (!source || !destination) return null;
    if (drop.zone !== "center" && drop.zone !== "tabbar") {
        if (source.id === destination.id && source.tabIds.length === 1)
            return null;
        return {
            split: {
                targetPaneId: drop.paneId,
                side: drop.zone,
                paneId: crypto.randomUUID(),
                splitId: crypto.randomUUID(),
            },
        };
    }
    const beforeTabId =
        drop.zone === "tabbar"
            ? destination.tabIds
                  .slice(drop.index ?? destination.tabIds.length)
                  .find((id) => id !== tabId)
            : undefined;
    return { toPaneId: drop.paneId, ...(beforeTabId ? { beforeTabId } : {}) };
}
export function resizeChanges(
    before: PanelLayout,
    after: PanelLayout,
): WebCommandRequest["changes"] {
    const previous = new Map(
        panelLayoutReferences(before).splits.map((split) => [split.id, split]),
    );
    return panelLayoutReferences(after).splits.flatMap((split) => {
        const old = previous.get(split.id);
        return old &&
            split.weights.some(
                (weight, i) => Math.abs(weight - old.weights[i]!) > 1e-6,
            )
            ? [
                  {
                      type: "split.resize" as const,
                      splitId: split.id,
                      children: split.children.map((child) => child.id),
                      weights: split.weights,
                  },
              ]
            : [];
    });
}
