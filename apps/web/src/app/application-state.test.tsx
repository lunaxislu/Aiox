import type { ApplicationEvent, PanelView } from "@aiox/protocol";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import { afterEach, expect, it, vi } from "vitest";

import { ApplicationConnection } from "@/shared/api/application-connection";

import { ApplicationProvider } from "./application-provider";
import {
    useApplicationState,
    useApplicationStore,
    usePanelCommand,
    usePanelSelection,
} from "./application-state";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
const panel: PanelView = {
    id: "p",
    name: "Panel",
    kind: "workspace",
    section: "workspaces",
    revision: 1,
    hostId: null,
    networkId: null,
    layout: {
        type: "split",
        id: "split",
        axis: "x",
        weights: [0.5, 0.5],
        children: [
            { type: "pane", id: "left", tabIds: ["a", "b"] },
            { type: "pane", id: "right", tabIds: ["c"] },
        ],
    },
    tabs: ["a", "b", "c"].map((id) => ({
        id,
        label: id,
        terminalId: null,
        agentKey: null,
        runtimeId: null,
        presentation: "preparing",
        notice: null,
    })),
};
const event = (panels = [panel]): ApplicationEvent => ({
    type: "snapshot",
    version: 0,
    snapshot: {
        epoch: "epoch",
        panels,
        hosts: [],
        networks: [],
        terminals: [],
        agents: [],
        cleanups: [],
        notifications: [],
    },
});

function mount() {
    const connection = new ApplicationConnection("ws://unused");
    let emit!: (event: ApplicationEvent) => void;
    const stopped = vi.fn(async () => {});
    const start = vi.spyOn(connection, "start").mockImplementation((sink) => {
        emit = sink;
        sink(event());
        return stopped;
    });
    let api!: {
        state: ReturnType<typeof useApplicationState>;
        selection: ReturnType<typeof usePanelSelection>;
        store: ReturnType<typeof useApplicationStore>;
        command: ReturnType<typeof usePanelCommand>;
    };
    function Consumer() {
        api = {
            state: useApplicationState(),
            selection: usePanelSelection("p"),
            store: useApplicationStore(),
            command: usePanelCommand(),
        };
        return <output>{api.selection.selection?.selectedTabId.left}</output>;
    }
    const rendered = render(
        <ApplicationProvider connection={connection}>
            <Consumer />
        </ApplicationProvider>,
    );
    return {
        rendered,
        start,
        stopped,
        connection,
        Consumer,
        get api() {
            return api;
        },
        emit: (value: ApplicationEvent) => act(() => emit(value)),
    };
}

it("owns selection per app, preserves it across snapshot, cleans deletions, resets on fresh mount", async () => {
    const first = mount();
    const second = mount();
    await waitFor(() =>
        expect(first.api.selection.selection?.selectedTabId.left).toBe("a"),
    );
    act(() => first.api.selection.select("left", "b"));
    await waitFor(() =>
        expect(first.api.selection.selection?.selectedTabId.left).toBe("b"),
    );
    expect(second.api.selection.selection?.selectedTabId.left).toBe("a");
    first.emit(event());
    expect(first.api.selection.selection?.selectedTabId.left).toBe("b");
    act(() => first.api.selection.select("right", "c"));
    first.emit(
        event([
            {
                ...panel,
                layout: { type: "pane", id: "left", tabIds: ["a"] },
                tabs: [panel.tabs[0]!],
            },
        ]),
    );
    await waitFor(() =>
        expect(first.api.selection.selection).toEqual({
            activePaneId: "left",
            selectedTabId: { left: "a" },
        }),
    );
    first.rendered.unmount();
    await waitFor(() =>
        expect(first.api.store.collection.status).toBe("cleaned-up"),
    );
    const refreshed = mount();
    await waitFor(() =>
        expect(refreshed.api.selection.selection?.selectedTabId.left).toBe("a"),
    );
    expect(second.api.selection.selection?.activePaneId).toBe("left");
});

it("store publication and changing onEvent props keep the same connection; unmount cleans subscriptions", async () => {
    const app = mount();
    await waitFor(() => expect(app.api.state.ready).toBe(true));
    const dispose = vi.spyOn(app.api.store, "dispose");
    const observer = vi.fn();
    app.rendered.rerender(
        <ApplicationProvider connection={app.connection} onEvent={observer}>
            <app.Consumer />
        </ApplicationProvider>,
    );
    app.emit(event([{ ...panel, name: "New" }]));
    await waitFor(() => expect(app.api.state.panels[0]!.name).toBe("New"));
    expect(observer).toHaveBeenCalledTimes(1);
    expect(app.start).toHaveBeenCalledTimes(1);
    expect(app.stopped).not.toHaveBeenCalled();
    expect(app.api.store.collection.subscriberCount).toBeGreaterThan(0);
    app.rendered.unmount();
    await waitFor(() => expect(dispose).toHaveBeenCalledTimes(1));
    expect(app.stopped).toHaveBeenCalledTimes(1);
    expect(app.api.store.collection.subscriberCount).toBe(0);
});

it("selects a newly projected tab in the same user action without a second selection owner", async () => {
    const app = mount();
    vi.spyOn(app.connection, "panelCommand").mockReturnValue({
        execute: Effect.never,
        request: undefined,
    });
    await waitFor(() => expect(app.api.state.ready).toBe(true));
    act(() => {
        app.api.command({
            panelId: "p",
            changes: [
                {
                    type: "tab.create",
                    tabId: "new",
                    target: { toPaneId: "left" },
                },
            ],
        });
        app.api.selection.select("left", "new");
    });
    await waitFor(() =>
        expect(app.api.selection.selection?.selectedTabId.left).toBe("new"),
    );
});
