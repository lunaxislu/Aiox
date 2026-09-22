import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
    PanelView,
    HostView,
    HostNetworkView,
    Operation,
} from "@aiox/protocol";
import { test } from "vitest";

import { openDatabase } from "./database";

test("panel storage preserves layout across reopen, rejects stale writes and duplicate terminal ownership atomically", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-panel-"));
    let db = await openDatabase(join(directory, "aiox.db"));
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const panel = {
        id: "p1",
        kind: "workspace" as const,
        section: "hosts" as const,
        name: "Work",
        hostId: null,
        networkId: null,
        revision: 1,
        layout: {
            type: "pane" as const,
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
                presentation: "shell" as const,
                notice: null,
            },
        ],
    };
    await db.hostState.createPanel(panel);
    await assert.rejects(
        db.hostState.updatePanel({ ...panel, name: "Stale", revision: 3 }, 2),
        /revision_conflict/,
    );
    await assert.rejects(
        db.hostState.createPanel({
            ...panel,
            id: "p2",
            tabs: [{ ...panel.tabs[0]!, id: "tab2" }],
            layout: {
                ...panel.layout,
                tabIds: ["tab2"],
                selectedTabId: "tab2",
            },
        }),
        /UNIQUE/,
    );
    await db.close();
    db = await openDatabase(join(directory, "aiox.db"));
    assert.deepEqual((await db.hostState.snapshot()).panels, [panel]);
    await db.hostState.updatePanel(
        { ...panel, name: "Renamed", revision: 2 },
        1,
    );
    assert.equal((await db.hostState.snapshot()).panels[0]!.name, "Renamed");
});

test("Host creation is atomic and Operation retries, recovery and retention preserve unfinished cleanup", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-host-state-"));
    const db = await openDatabase(join(directory, "aiox.db"));
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const panel: PanelView = {
        id: "p1",
        kind: "host",
        section: "hosts",
        name: "Host",
        hostId: "h1",
        networkId: "n1",
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
                label: "Agent",
                agentKey: "a",
                runtimeId: null,
                presentation: "shell",
                notice: null,
            },
        ],
    };
    const host: HostView = {
        id: "h1",
        name: "Host",
        directory: "/work",
        sourceFile: "/work/aiox.yaml",
        instruction: "",
        revision: 1,
        panelId: "p1",
        networkId: "n1",
        activeOperationId: null,
        agents: [
            {
                key: "a",
                adapter: "claude",
                role: null,
                description: null,
                instruction: "",
                args: [],
                member: true,
                runtime: null,
                lastTerminalId: null,
                lastExit: null,
            },
        ],
    };
    const network: HostNetworkView = {
        id: "n1",
        hostId: "h1",
        name: "Team",
        scope: "host",
        default: "allow",
        members: [{ agentKey: "a", runtimeId: null }],
        edges: [],
    };
    await db.hostState.createHost(host, network, panel, 1);
    assert.deepEqual((await db.hostState.snapshot()).hosts, [host]);
    await assert.rejects(
        db.hostState.createHost(
            { ...host, id: "h2", panelId: "p2", networkId: "n2" },
            { ...network, id: "n2", hostId: "h2" },
            { ...panel, id: "p2", hostId: "h2", networkId: "n2" },
            2,
        ),
    );
    assert.equal((await db.hostState.snapshot()).hosts.length, 1);
    const operation: Operation = {
        id: "o1",
        requestId: "6a8ed620-0000-4000-8000-000000000020",
        kind: "host.run",
        hostId: "h1",
        panelId: "p1",
        state: "running",
        targets: [
            {
                agentKey: "a",
                terminalId: "t1",
                state: "preparing",
                error: null,
            },
        ],
        error: null,
        cleanupErrors: [],
        createdAt: 1,
        finishedAt: null,
    };
    await db.hostState.saveOperation(operation, "hash");
    assert.equal(
        (
            await db.hostState.saveOperation(
                { ...operation, id: "other" },
                "hash",
            )
        ).id,
        "o1",
    );
    await assert.rejects(
        db.hostState.saveOperation(operation, "different"),
        /request_conflict/,
    );
    assert.equal(await db.hostState.purgeBefore(100), 0);
    await db.hostState.recover(10);
    const recovered = await db.hostState.snapshot();
    assert.equal(recovered.operations[0]!.error?.code, "daemon_interrupted");
    assert.equal(recovered.panels[0]!.tabs[0]!.presentation, "unavailable");
    assert.equal(recovered.hosts[0]!.activeOperationId, null);
    assert.equal(
        (await db.hostState.saveOperation(operation, "hash")).state,
        "failed",
    );
    await db.hostState.recover(11);
    assert.equal(
        (await db.hostState.snapshot()).panels[0]!.revision,
        recovered.panels[0]!.revision,
    );
    const cleanup = {
        code: "cleanup_failed",
        message: "Process termination unconfirmed",
        stage: "cleanup" as const,
    };
    await db.hostState.saveOperation(
        {
            ...operation,
            id: "o2",
            requestId: "6a8ed620-0000-4000-8000-000000000021",
            state: "failed",
            error: cleanup,
            cleanupErrors: [cleanup],
            finishedAt: 10,
        },
        "cleanup",
    );
    assert.equal(await db.hostState.purgeBefore(100), 1);
    assert.equal((await db.hostState.snapshot()).operations[0]!.id, "o2");
    assert.equal((await db.hostState.snapshot()).hosts.length, 1);
});
