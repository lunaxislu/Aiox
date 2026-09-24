import { expect, test } from "vitest";

import type { RuntimeRecord } from "./runtimes";
import type { DaemonServices } from "./services";
import { fakeVendor, startTestDaemon } from "./testing";
import { projectHostState, readWebSnapshot } from "./web-state";

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
    const services = {
        runtimes: { list: () => records },
    } as unknown as DaemonServices;
    const state = projectHostState(
        {
            hosts: [],
            panels: [],
            operations: [],
            networks: [
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
            ],
        },
        services,
    );
    expect(state.networks[0]!.members.map((m) => m.runtimeId)).toEqual([
        "active",
        null,
    ]);
    expect(state.networks[0]!.edges[0]).toMatchObject({
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
            selectedTabId: "tab",
        },
        activePaneId: "pane",
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
    const snapshot = await readWebSnapshot(h.daemon.services);
    expect(snapshot.agents[0]!.agentId).toBe(external.runtimeId);
    expect(snapshot.panels[0]!.tabs[0]).toMatchObject({
        runtimeId: null,
        presentation: "unavailable",
    });
});
