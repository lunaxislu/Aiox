import assert from "node:assert/strict";

import { expect, test } from "vitest";

import {
    removePanelTabs,
    insertPanelTab,
    movePanelTab,
    resizePanelSplit,
    PanelLayoutError,
    panelLayoutReferences,
    type PanelLayout,
    invocationSchema,
    hostRunRequestSchema,
    hostRestartRequestSchema,
    panelViewSchema,
    webStateSchema,
    layoutInputSchema,
    storedConfigSchema,
    hostNetworkViewSchema,
    webCommandRequestSchema,
} from "./index";

test("Web commands do not accept client-local pane or tab selection", () => {
    assert.equal(
        webCommandRequestSchema.safeParse({
            clientSessionId: "6a8ed620-0000-4000-8000-000000000001",
            requestId: "6a8ed620-0000-4000-8000-000000000002",
            sequence: 1,
            panelId: "p",
            changes: [{ type: "select", paneId: "pane", tabId: "tab" }],
        }).success,
        false,
    );
});

test("Host Network validation rejects duplicate, missing, self and foreign member edges", () => {
    const keys = ["a", "b", "c"];
    const network = {
        id: "n",
        hostId: "h",
        name: "Team",
        scope: "host",
        default: "allow",
        members: keys.map((agentKey) => ({ agentKey, runtimeId: null })),
        edges: keys.flatMap((from) =>
            keys
                .filter((to) => to !== from)
                .map((to) => ({
                    from,
                    to,
                    fromRuntimeId: null,
                    toRuntimeId: null,
                    policy: "allow",
                    source: "manifest-default",
                })),
        ),
    };
    assert.deepEqual(hostNetworkViewSchema.parse(network), network);
    for (const edges of [
        network.edges.slice(1),
        [network.edges[0], ...network.edges.slice(0, -1)],
        [{ ...network.edges[0], to: "a" }, ...network.edges.slice(1)],
        [{ ...network.edges[0], to: "unknown" }, ...network.edges.slice(1)],
    ])
        assert.equal(
            hostNetworkViewSchema.safeParse({ ...network, edges }).success,
            false,
        );
    assert.equal(
        hostNetworkViewSchema.safeParse({
            ...network,
            members: [
                network.members[0],
                network.members[0],
                network.members[2],
            ],
        }).success,
        false,
    );
});

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

test("invocation and host run preserve optional terminal context without CLI launch fields", () => {
    assert.deepEqual(invocationSchema.parse({}), {});
    for (const field of [{ args: [] }, { env: {} }, { cwd: "/work" }]) {
        assert.equal(invocationSchema.safeParse(field).success, false);
    }

    const input = {
        requestId: "6a8ed620-0000-4000-8000-000000000001",
        source: { directory: "/work" },
        terminalContext: {
            terminalId: "6a8ed620-0000-4000-8000-000000000002",
            token: "terminal-secret",
        },
    };
    assert.deepEqual(hostRunRequestSchema.parse(input), input);
    assert.equal(
        hostRunRequestSchema.safeParse({ ...input, args: [] }).success,
        false,
    );
    assert.equal(
        hostRestartRequestSchema.safeParse({ ...input, env: {} }).success,
        false,
    );
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
    },
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
test("panel layout owns every tab once and validates split geometry", () => {
    assert.deepEqual(panelViewSchema.parse(panel), panel);
    for (const change of [
        { tabs: [] },
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
                    { type: "pane", id: "p2", tabIds: [] },
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
    const pane = (id: string, tabIds = [id]): PanelLayout => ({
        type: "pane",
        id,
        tabIds,
    });
    const layout: PanelLayout = {
        type: "split",
        id: "root",
        axis: "x",
        weights: [0.2, 0.3, 0.5],
        children: [
            pane("z"),
            {
                type: "split",
                id: "inner",
                axis: "y",
                weights: [0.4, 0.6],
                children: [pane("b", ["third", "first", "second"]), pane("a")],
            },
            pane("c"),
        ],
    };
    const original = structuredClone(layout);
    const remove = (ids: string[]) => removePanelTabs({ layout }, new Set(ids));
    const collapsed = remove(["third", "first", "second", "z"]);
    assert.deepEqual(collapsed, {
        layout: {
            type: "split",
            id: "root",
            axis: "x",
            weights: [0.3 / 0.8, 0.5 / 0.8],
            children: [pane("a"), pane("c")],
        },
    });
    const empty = remove(["z", "third", "first", "second", "a", "c"]);
    assert.deepEqual(empty, { layout: pane("z", []) });
    assert.deepEqual(
        removePanelTabs(collapsed, new Set(["z", "first"])),
        collapsed,
    );
    assert.deepEqual(removePanelTabs(empty, new Set(["b"])), empty);
    const withEmpty: PanelLayout = {
        type: "split",
        id: "with-empty",
        axis: "x",
        weights: [0.5, 0.5],
        children: [pane("empty", []), pane("tabs", ["one", "two"])],
    };
    const focusedEmpty = removePanelTabs(
        { layout: withEmpty },
        new Set(["one"]),
    );
    assert.deepEqual(
        panelLayoutReferences(focusedEmpty.layout).panes.map((p) => p.id),
        ["empty", "tabs"],
    );
    assert.deepEqual(removePanelTabs(focusedEmpty, new Set(["two"])), {
        layout: pane("empty", []),
    });
    assert.deepEqual(layout, original);
});
test("layout commands apply to the latest layout and reject stale targets", () => {
    const pane = (id: string, tabIds: string[]): PanelLayout => ({
        type: "pane",
        id,
        tabIds,
    });
    const base = {
        layout: {
            type: "split",
            id: "s",
            axis: "x",
            weights: [0.5, 0.5],
            children: [pane("a", ["t1", "t2"]), pane("b", ["t3"])],
        } as PanelLayout,
    };
    const code = (run: () => unknown) => {
        try {
            run();
        } catch (error) {
            assert.ok(error instanceof PanelLayoutError);
            return error.code;
        }
        assert.fail("expected a layout error");
    };
    const panes = (layout: PanelLayout) =>
        panelLayoutReferences(layout).panes.map((p) => [p.id, p.tabIds]);

    // Insert before a missing anchor falls back to the end.
    const added = insertPanelTab(base, "t4", {
        toPaneId: "b",
        beforeTabId: "x",
    });
    assert.deepEqual(panes(added.layout), [
        ["a", ["t1", "t2"]],
        ["b", ["t3", "t4"]],
    ]);
    const split = insertPanelTab(base, "t4", {
        split: { targetPaneId: "b", side: "top", paneId: "c", splitId: "s2" },
    });
    assert.deepEqual(panes(split.layout), [
        ["a", ["t1", "t2"]],
        ["c", ["t4"]],
        ["b", ["t3"]],
    ]);
    assert.equal(
        code(() => insertPanelTab(base, "t4", { toPaneId: "gone" })),
        "unknown_pane",
    );
    assert.equal(
        code(() =>
            insertPanelTab(base, "t4", {
                split: {
                    targetPaneId: "b",
                    side: "left",
                    paneId: "a",
                    splitId: "s3",
                },
            }),
        ),
        "id_conflict",
    );

    // Moving the last tab out merges its pane; moving within a pane reorders.
    const moved = movePanelTab(base, "t3", {
        toPaneId: "a",
        beforeTabId: "t2",
    });
    assert.deepEqual(moved.layout, {
        ...pane("a", ["t1", "t3", "t2"]),
    });
    assert.deepEqual(
        panes(
            movePanelTab(base, "t2", { toPaneId: "a", beforeTabId: "t1" })
                .layout,
        ),
        [
            ["a", ["t2", "t1"]],
            ["b", ["t3"]],
        ],
    );
    assert.deepEqual(
        movePanelTab(base, "t3", { toPaneId: "b" }).layout,
        base.layout,
    );
    assert.equal(
        code(() => movePanelTab(base, "gone", { toPaneId: "a" })),
        "unknown_tab",
    );

    // Resize names the children it measured; a reordered split is stale.
    const resized = resizePanelSplit(base.layout, "s", ["a", "b"], [0.3, 0.7]);
    assert.deepEqual((resized as { weights: number[] }).weights, [0.3, 0.7]);
    assert.equal(
        code(() => resizePanelSplit(base.layout, "s", ["b", "a"], [0.3, 0.7])),
        "layout_changed",
    );
    assert.equal(
        code(() => resizePanelSplit(base.layout, "x", ["a", "b"], [0.3, 0.7])),
        "unknown_split",
    );

    assert.equal(
        panelViewSchema.safeParse({
            id: "p",
            kind: "workspace",
            section: "workspaces",
            name: "W",
            hostId: null,
            networkId: null,
            revision: 1,
            layout: { ...base.layout, id: "a" },
            tabs: ["t1", "t2", "t3"].map((id) => ({
                id,
                terminalId: null,
                label: id,
                agentKey: null,
                runtimeId: null,
                presentation: "shell",
                notice: null,
            })),
        }).success,
        false,
    );
});

test("a Web command orders panel.create first, panel.delete last and uses one target shape", () => {
    const base = {
        clientSessionId: "6a8ed620-0000-4000-8000-000000000001",
        sequence: 1,
        requestId: "6a8ed620-0000-4000-8000-000000000002",
        panelId: "p",
    };
    const create = {
        type: "panel.create",
        name: "  Work ",
        paneId: "pane",
        tabId: "t1",
    };
    const split = {
        split: {
            targetPaneId: "pane",
            side: "left",
            paneId: "pane2",
            splitId: "s",
        },
    };
    const parsed = webCommandRequestSchema.parse({
        ...base,
        changes: [
            create,
            { type: "tab.create", tabId: "t2", target: split },
            { type: "tab.move", tabId: "t1", target: { toPaneId: "pane2" } },
        ],
    });
    expect(parsed.changes[0]).toMatchObject({ name: "Work" });
    for (const changes of [
        [{ type: "panel.rename", name: "x" }, create],
        [
            { type: "panel.delete", confirm: true },
            { type: "panel.rename", name: "After delete" },
        ],
        [
            {
                type: "split.resize",
                splitId: "s",
                children: ["a", "b"],
                weights: [0.4, 0.4],
            },
        ],
        [],
    ])
        expect(
            webCommandRequestSchema.safeParse({ ...base, changes }).success,
        ).toBe(false);
    // Commands carry no panel revision; an unknown field is rejected.
    expect(
        webCommandRequestSchema.safeParse({
            ...base,
            revision: 3,
            changes: [{ type: "panel.rename", name: "x" }],
        }).success,
    ).toBe(false);
});
