import { panelLayoutReferences, panelLayoutSchema } from "@aiox/protocol";
import { expect, test } from "vitest";

import { workspacePreview } from "@/entities/panel/workspace-fixtures";

import { closePreviewTab, selectPreviewTab } from "./workspace-preview";

test("selection changes the pane and selected tab together without changing other panes", () => {
    const next = selectPreviewTab(workspacePreview, "top", "stopped");
    expect(next.activePaneId).toBe("top");
    expect(
        panelLayoutReferences(next.layout).panes.map(
            (pane) => pane.selectedTabId,
        ),
    ).toEqual(["shell", "stopped", "crashed"]);
    expect(selectPreviewTab(next, "left", "stopped")).toBe(next);
});

test("closing a selected tab picks its next sibling, then previous, and preserves unrelated focus", () => {
    const next = closePreviewTab(workspacePreview, "shell");
    expect(panelLayoutReferences(next.layout).panes[0]?.selectedTabId).toBe(
        "preparing-shell",
    );
    const selected = selectPreviewTab(workspacePreview, "left", "preparing");
    expect(
        panelLayoutReferences(closePreviewTab(selected, "preparing").layout)
            .panes[0]?.selectedTabId,
    ).toBe("preparing-shell");
    const unrelated = closePreviewTab(workspacePreview, "reviewer");
    expect(unrelated.activePaneId).toBe("left");
    expect(
        panelLayoutReferences(unrelated.layout).panes[0]?.selectedTabId,
    ).toBe("shell");
});

test("last tab removal collapses a nested split and uses the latest tree order", () => {
    let state = selectPreviewTab(workspacePreview, "top", "reviewer");
    for (const id of ["reviewer", "stopped", "start-failed"])
        state = closePreviewTab(state, id);
    expect(state.activePaneId).toBe("bottom");
    expect(state.layout.type).toBe("split");
    if (state.layout.type !== "split") throw new Error("Expected split");
    expect(state.layout.children.map((node) => node.type)).toEqual([
        "pane",
        "pane",
    ]);
    expect(state.layout.weights).toEqual([0.5, 0.5]);
    const reordered = {
        ...state,
        layout: {
            ...state.layout,
            children: [...state.layout.children].reverse(),
        },
    };
    state = closePreviewTab(
        closePreviewTab(reordered, "crashed"),
        "unavailable",
    );
    expect(state.activePaneId).toBe("left");
    expect(state.layout.type).toBe("pane");
    expect(panelLayoutSchema.safeParse(state.layout).success).toBe(true);
});

test("closing all tabs leaves one valid empty pane and no dangling active pane", () => {
    let state = workspacePreview;
    for (const tab of workspacePreview.tabs)
        state = closePreviewTab(state, tab.id);
    expect(state.tabs).toEqual([]);
    expect(state.layout).toEqual({
        type: "pane",
        id: state.activePaneId,
        tabIds: [],
        selectedTabId: null,
    });
    expect(panelLayoutSchema.safeParse(state.layout).success).toBe(true);
});
