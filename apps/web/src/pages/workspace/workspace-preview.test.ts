import { panelLayoutReferences, panelLayoutSchema } from "@aiox/protocol";
import { expect, test } from "vitest";

import { workspacePreview } from "@/entities/panel/workspace-fixtures";

import {
    closePreviewTab,
    selectPreviewTab,
    visibleTerminals,
    movePreviewTab,
    dropZone,
} from "./workspace-preview";

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

test("tab drops reorder or merge without losing tab entities, and prune the empty source", () => {
    const state = {
        tabs: workspacePreview.tabs.slice(0, 3).map((tab, index) => ({
            ...tab,
            id: ["one", "two", "three"][index]!,
        })),
        activePaneId: "a",
        layout: {
            type: "split" as const,
            axis: "x" as const,
            weights: [0.5, 0.5],
            children: [
                {
                    type: "pane" as const,
                    id: "a",
                    tabIds: ["one", "two"],
                    selectedTabId: "one",
                },
                {
                    type: "pane" as const,
                    id: "b",
                    tabIds: ["three"],
                    selectedTabId: "three",
                },
            ],
        },
    };
    const reordered = movePreviewTab(
        state,
        "one",
        { paneId: "a", zone: "tabbar", index: 2 },
        "new",
    );
    expect(panelLayoutReferences(reordered.layout).panes[0]?.tabIds).toEqual([
        "two",
        "one",
    ]);
    const inserted = movePreviewTab(
        reordered,
        "one",
        { paneId: "b", zone: "tabbar", index: 0 },
        "new",
    );
    expect(
        panelLayoutReferences(inserted.layout).panes.map((pane) => [
            pane.tabIds,
            pane.selectedTabId,
        ]),
    ).toEqual([
        [["two"], "two"],
        [["one", "three"], "one"],
    ]);
    const merged = movePreviewTab(
        inserted,
        "two",
        { paneId: "b", zone: "center" },
        "new",
    );
    expect(merged.layout).toEqual({
        type: "pane",
        id: "b",
        tabIds: ["one", "three", "two"],
        selectedTabId: "two",
    });
    expect(merged.activePaneId).toBe("b");
    expect(merged.tabs).toBe(state.tabs);
    expect(
        movePreviewTab(
            state,
            "one",
            { paneId: "missing", zone: "center" },
            "new",
        ),
    ).toBe(state);
});

test.each(["left", "right", "top", "bottom"] as const)(
    "%s drop creates a valid split and preserves terminal references",
    (zone) => {
        const next = movePreviewTab(
            workspacePreview,
            "shell",
            { paneId: "top", zone },
            "new",
        );
        expect(next.tabs).toBe(workspacePreview.tabs);
        expect(next.activePaneId).toBe("new");
        expect(panelLayoutSchema.safeParse(next.layout).success).toBe(true);
        const references = panelLayoutReferences(next.layout);
        expect(new Set(references.tabIds).size).toBe(
            workspacePreview.tabs.length,
        );
        expect([...references.tabIds].sort()).toEqual(
            workspacePreview.tabs.map((tab) => tab.id).sort(),
        );
        const findSplit = (
            layout: typeof next.layout,
        ): Extract<typeof next.layout, { type: "split" }> | undefined => {
            if (layout.type === "pane") return undefined;
            return layout.children.some(
                (child) => child.type === "pane" && child.id === "new",
            )
                ? layout
                : layout.children.map(findSplit).find(Boolean);
        };
        const split = findSplit(next.layout)!;
        expect(split.axis).toBe(
            zone === "left" || zone === "right" ? "x" : "y",
        );
        expect(
            split.children[zone === "left" || zone === "top" ? 0 : 1],
        ).toMatchObject({ id: "new", tabIds: ["shell"] });
        const own = movePreviewTab(
            next,
            "shell",
            { paneId: "new", zone },
            "another",
        );
        expect(own).toBe(next);
        const samePane = movePreviewTab(
            workspacePreview,
            "shell",
            { paneId: "left", zone },
            "new",
        );
        expect(panelLayoutReferences(samePane.layout).tabIds.sort()).toEqual(
            [...references.tabIds].sort(),
        );
    },
);

test("drop zones use the nearest normalized edge within 20 percent, otherwise center", () => {
    expect(dropZone(0.1, 0.5)).toBe("left");
    expect(dropZone(0.9, 0.5)).toBe("right");
    expect(dropZone(0.5, 0.1)).toBe("top");
    expect(dropZone(0.5, 0.9)).toBe("bottom");
    expect(dropZone(0.1, 0.05)).toBe("top");
    expect(dropZone(0.2, 0.2)).toBe("center");
});

test("moving the last terminal to an empty destination retains the destination and unrelated empty panes", () => {
    const state = {
        tabs: [workspacePreview.tabs[0]!],
        activePaneId: "source",
        layout: {
            type: "split" as const,
            axis: "x" as const,
            weights: [0.4, 0.3, 0.3],
            children: [
                {
                    type: "pane" as const,
                    id: "source",
                    tabIds: ["shell"],
                    selectedTabId: "shell",
                },
                {
                    type: "pane" as const,
                    id: "target",
                    tabIds: [],
                    selectedTabId: null,
                },
                {
                    type: "pane" as const,
                    id: "empty",
                    tabIds: [],
                    selectedTabId: null,
                },
            ],
        },
    };
    const moved = movePreviewTab(
        state,
        "shell",
        { paneId: "target", zone: "center" },
        "new",
    );
    expect(panelLayoutReferences(moved.layout).panes).toEqual([
        {
            type: "pane",
            id: "target",
            tabIds: ["shell"],
            selectedTabId: "shell",
        },
        { type: "pane", id: "empty", tabIds: [], selectedTabId: null },
    ]);
    expect(moved.activePaneId).toBe("target");
    expect(moved.tabs).toBe(state.tabs);
});

test("visible terminals follow selection and moves, excluding notices even with a terminal ID", () => {
    const original = visibleTerminals(workspacePreview);
    expect(original.map((item) => item.tab.id)).toEqual(["shell", "reviewer"]);
    const moved = movePreviewTab(
        workspacePreview,
        "shell",
        { paneId: "top", zone: "center" },
        "new",
    );
    const shown = visibleTerminals(moved);
    expect(
        shown.find((item) => item.terminalId === "terminal-shell")?.paneId,
    ).toBe("top");
    expect(shown.some((item) => item.tab.id === "reviewer")).toBe(false);
    const withNotice = {
        ...workspacePreview,
        tabs: workspacePreview.tabs.map((tab) =>
            tab.id === "shell"
                ? {
                      ...tab,
                      notice: {
                          message: "Preparing",
                          reason: null,
                          restartCommand: "restart",
                      },
                  }
                : tab,
        ),
    };
    expect(
        visibleTerminals(withNotice).some((item) => item.tab.id === "shell"),
    ).toBe(false);
    const selected = selectPreviewTab(
        workspacePreview,
        "left",
        "preparing-shell",
    );
    expect(
        visibleTerminals(selected).some((item) => item.tab.id === "shell"),
    ).toBe(false);
});
