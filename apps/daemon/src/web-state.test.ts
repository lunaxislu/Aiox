import type { PanelView } from "@aiox/protocol";
import { expect, test } from "vitest";

import type { RuntimeRecord } from "./runtimes";
import { fakeVendor, startTestDaemon } from "./testing";
import { projectHostNetwork, projectPanel } from "./web-state";

test("live shell tabs show runtime names and restore their own labels on exit", () => {
    const panel = {
        id: "p",
        kind: "workspace",
        section: "workspaces",
        name: "Workspace",
        hostId: null,
        networkId: null,
        revision: 1,
        layout: { type: "pane", id: "pane", tabIds: ["user", "host"] },
        tabs: [
            {
                id: "user",
                terminalId: "user-terminal",
                label: "My shell",
                agentKey: null,
                runtimeId: null,
                presentation: "shell",
                notice: null,
            },
            {
                id: "host",
                terminalId: "host-terminal",
                label: "Host agent",
                agentKey: "managed",
                runtimeId: null,
                presentation: "shell",
                notice: null,
            },
        ],
    } as PanelView;
    const runtime = {
        id: "runtime",
        name: "k",
        terminalId: "user-terminal",
        phase: "running",
    } as RuntimeRecord;
    const hostRuntime = {
        id: "host-runtime",
        name: "different",
        terminalId: "host-terminal",
        phase: "running",
    } as RuntimeRecord;
    const runtimes = {
        get: () => undefined,
        list: () => [runtime, hostRuntime],
    };

    expect(projectPanel(panel, runtimes).tabs.map((tab) => tab.label)).toEqual([
        "k",
        "Host agent",
    ]);
    expect(
        projectPanel(panel, { ...runtimes, list: () => [] }).tabs.map(
            (tab) => tab.label,
        ),
    ).toEqual(["My shell", "Host agent"]);
});

test("network projection only uses active collaboration in the matching host and network", () => {
    const records = [
        {
            id: "wrong-host",
            name: "a",
            hostId: "other",
            networkId: "n",
            collaborationActive: true,
        },
        {
            id: "wrong-network",
            name: "a",
            hostId: "h",
            networkId: "other",
            collaborationActive: true,
        },
        {
            id: "inactive",
            name: "a",
            hostId: "h",
            networkId: "n",
            collaborationActive: false,
        },
        {
            id: "active",
            name: "a",
            hostId: "h",
            networkId: "n",
            collaborationActive: true,
        },
    ] as RuntimeRecord[];
    const network = projectHostNetwork(
        {
            id: "n",
            hostId: "h",
            name: "Team",
            scope: "host",
            default: "allow",
            members: [
                { agentKey: "a", runtimeId: null },
                { agentKey: "b", runtimeId: null },
            ],
            edges: [
                {
                    from: "a",
                    to: "b",
                    fromRuntimeId: null,
                    toRuntimeId: null,
                    policy: "allow",
                    source: "manifest-default",
                },
            ],
        },
        { get: () => undefined, list: () => records },
    );
    expect(network.members.map((m) => m.runtimeId)).toEqual(["active", null]);
    expect(network.edges[0]).toMatchObject({
        fromRuntimeId: "active",
        toRuntimeId: null,
    });
});

test("a terminal-less tab never acquires an external Runtime through matching null IDs", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    await h.daemon.services.db.hostState.createPanel({
        id: "p",
        kind: "workspace",
        section: "workspaces",
        name: "Workspace",
        hostId: null,
        networkId: null,
        revision: 1,
        layout: {
            type: "pane",
            id: "pane",
            tabIds: ["tab"],
        },
        tabs: [
            {
                id: "tab",
                terminalId: null,
                label: "Unavailable",
                agentKey: null,
                runtimeId: null,
                presentation: "unavailable",
                notice: null,
            },
        ],
    });
    const external = await h.daemon.registerRuntime({
        executionOwnership: "external",
        networkId: null,
        createBinding: fakeVendor().createBinding,
    });
    await h.daemon.services.appState.update({ panel: "p" });
    const snapshot = await h.daemon.services.appState.current();
    expect(snapshot.agents[0]!.agentId).toBe(external.runtimeId);
    expect(snapshot.panels[0]!.tabs[0]).toMatchObject({
        runtimeId: null,
        presentation: "unavailable",
    });
});
