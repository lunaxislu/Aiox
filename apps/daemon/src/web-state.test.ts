import { expect, test } from "vitest";

import { fakeVendor, startTestDaemon } from "./testing";
import { readWebSnapshot } from "./web-state";

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
