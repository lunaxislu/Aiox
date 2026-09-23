import assert from "node:assert/strict";

import { test } from "vitest";

import {
    removePanelTabs,
    panelLayoutReferences,
    type PanelLayout,
    hostRunRequestSchema,
    panelViewSchema,
    webStateSchema,
    layoutInputSchema,
    storedConfigSchema,
} from "./index";

test("Host wire input rejects identity injection and shares config layout validation", () => {
    const input = {
        requestId: "6a8ed620-0000-4000-8000-000000000001",
        source: { directory: "/work" },
        layout: { columns: 2 },
    };
    assert.deepEqual(hostRunRequestSchema.parse(input), input);
    for (const change of [
        { source: { directory: "relative" } },
        { hostId: "injected" },
        { layout: { preset: "grid" } },
        { layout: { rows: 0 } },
    ])
        assert.equal(
            hostRunRequestSchema.safeParse({ ...input, ...change }).success,
            false,
        );
    for (const layout of [
        { preset: "grid" },
        { preset: "auto", rows: 2 },
        { rows: 0 },
    ]) {
        assert.equal(layoutInputSchema.safeParse(layout).success, false);
        assert.equal(
            storedConfigSchema.safeParse({ host: { layout } }).success,
            false,
        );
    }
    assert.deepEqual(storedConfigSchema.parse({}), {});
});

const panel = {
    id: "p1",
    kind: "workspace",
    section: "workspaces",
    name: "Work",
    hostId: null,
    networkId: null,
    revision: 1,
    layout: {
        type: "pane",
        id: "pane1",
        tabIds: ["tab1"],
        selectedTabId: "tab1",
    },
    activePaneId: "pane1",
    tabs: [
        {
            id: "tab1",
            terminalId: "t1",
            label: "Shell",
            agentKey: null,
            runtimeId: null,
            presentation: "shell",
            notice: null,
        },
    ],
};
test("panel layout owns every tab once and validates selection and split geometry", () => {
    assert.deepEqual(panelViewSchema.parse(panel), panel);
    for (const change of [
        { activePaneId: "missing" },
        { tabs: [] },
        { layout: { ...panel.layout, selectedTabId: null } },
        {
            layout: {
                type: "split",
                axis: "x",
                weights: [0.5, 0.5],
                children: [panel.layout, panel.layout],
            },
        },
        {
            layout: {
                type: "split",
                axis: "x",
                weights: [1],
                children: [
                    panel.layout,
                    { type: "pane", id: "p2", tabIds: [], selectedTabId: null },
                ],
            },
        },
    ])
        assert.equal(
            panelViewSchema.safeParse({ ...panel, ...change }).success,
            false,
        );
});
test("SSE discriminates DTO by resource and remove carries no value", () => {
    const change = {
        resource: "panel",
        action: "upsert",
        id: "p1",
        value: panel,
    };
    assert.equal(webStateSchema.safeParse({ changes: [change] }).success, true);
    for (const invalid of [
        { ...change, resource: "host" },
        { ...change, action: "remove" },
        { ...change, id: "other" },
    ])
        assert.equal(
            webStateSchema.safeParse({ changes: [invalid] }).success,
            false,
        );
    assert.equal(
        webStateSchema.safeParse({
            changes: [{ resource: "panel", action: "remove", id: "p1" }],
        }).success,
        true,
    );
});

test("tab removal follows current tab/tree order and collapses empty panes", () => {
    const pane = (
        id: string,
        tabIds = [id],
        selectedTabId = tabIds[0] ?? null,
    ): PanelLayout => ({ type: "pane", id, tabIds, selectedTabId });
    const layout: PanelLayout = {
        type: "split",
        axis: "x",
        weights: [0.2, 0.3, 0.5],
        children: [
            pane("z"),
            {
                type: "split",
                axis: "y",
                weights: [0.4, 0.6],
                children: [
                    pane("b", ["third", "first", "second"], "first"),
                    pane("a"),
                ],
            },
            pane("c"),
        ],
    };
    const original = structuredClone(layout);
    const remove = (ids: string[], activePaneId = "b") =>
        removePanelTabs({ layout, activePaneId }, new Set(ids));
    expectSelection(remove(["first"]).layout, "b", "second");
    expectSelection(remove(["first", "second"]).layout, "b", "third");
    const collapsed = remove(["third", "first", "second", "z"]);
    assert.deepEqual(collapsed, {
        activePaneId: "a",
        layout: {
            type: "split",
            axis: "x",
            weights: [0.3 / 0.8, 0.5 / 0.8],
            children: [pane("a"), pane("c")],
        },
    });
    assert.equal(remove(["a"], "c").activePaneId, "c");
    assert.equal(remove(["c"], "c").activePaneId, "a");
    expectSelection(remove(["z"], "b").layout, "b", "first");
    const empty = remove(["z", "third", "first", "second", "a", "c"]);
    assert.deepEqual(empty, { layout: pane("b", []), activePaneId: "b" });
    assert.deepEqual(
        removePanelTabs(collapsed, new Set(["z", "first"])),
        collapsed,
    );
    assert.deepEqual(removePanelTabs(empty, new Set(["b"])), empty);
    const withEmpty: PanelLayout = {
        type: "split",
        axis: "x",
        weights: [0.5, 0.5],
        children: [pane("empty", []), pane("tabs", ["one", "two"])],
    };
    const focusedEmpty = removePanelTabs(
        { layout: withEmpty, activePaneId: "empty" },
        new Set(["one"]),
    );
    assert.equal(focusedEmpty.activePaneId, "empty");
    assert.deepEqual(
        panelLayoutReferences(focusedEmpty.layout).panes.map((p) => p.id),
        ["empty", "tabs"],
    );
    assert.deepEqual(removePanelTabs(focusedEmpty, new Set(["two"])), {
        layout: pane("empty", []),
        activePaneId: "empty",
    });
    assert.deepEqual(layout, original);
});
function expectSelection(layout: PanelLayout, id: string, selected: string) {
    const panes = panelLayoutReferences(layout).panes;
    assert.equal(panes.find((p) => p.id === id)?.selectedTabId, selected);
}
