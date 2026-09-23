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
import Database from "better-sqlite3";
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
    const concurrent = await Promise.allSettled([
        db.hostState.updatePanel({ ...panel, name: "Winner", revision: 3 }, 2),
        db.hostState.updatePanel(
            { ...panel, name: "Stale competitor", revision: 3 },
            2,
        ),
    ]);
    assert.equal(concurrent[0]!.status, "fulfilled");
    assert.equal(concurrent[1]!.status, "rejected");
    if (concurrent[1]!.status === "rejected")
        assert.match(String(concurrent[1]!.reason), /revision_conflict/);
    assert.equal((await db.hostState.snapshot()).panels[0]!.name, "Winner");
});

test("Host creation is atomic and Operation retries, recovery and retention preserve unfinished cleanup", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-host-state-"));
    let db = await openDatabase(join(directory, "aiox.db"));
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
    await db.hostState.startExecution({
        runtimeId: "r1",
        hostId: "h1",
        agentKey: "a",
        terminalId: "t1",
        startedAt: 2,
    });
    await assert.rejects(
        db.hostState.startExecution({
            runtimeId: "r2",
            hostId: "h1",
            agentKey: "a",
            terminalId: "t1",
            startedAt: 3,
        }),
    );
    await db.hostState.finishExecution(
        "r1",
        {
            kind: "stopped",
            message: "Agent stopped.",
            at: 4,
        },
        "aiox host agent start a",
    );
    let stored = await db.hostState.snapshot();
    assert.equal(stored.hosts[0]!.agents[0]!.lastTerminalId, "t1");
    assert.equal(stored.hosts[0]!.agents[0]!.lastExit?.kind, "stopped");
    assert.equal(stored.panels[0]!.tabs[0]!.presentation, "stopped");
    assert.equal(
        stored.panels[0]!.tabs[0]!.notice?.restartCommand,
        "aiox host agent start a",
    );
    await db.hostState.startExecution({
        runtimeId: "r2",
        hostId: "h1",
        agentKey: "a",
        terminalId: "t1",
        startedAt: 5,
    });
    await db.hostState.finishExecution(
        "r1",
        { kind: "crashed", message: "late", at: 6 },
        "",
    );
    await db.hostState.finishExecution(
        "r2",
        { kind: "exited", message: null, at: 7 },
        "",
    );
    stored = await db.hostState.snapshot();
    assert.equal(stored.panels[0]!.tabs[0]!.presentation, "shell");
    assert.equal(stored.panels[0]!.tabs[0]!.notice, null);
    await db.hostState.startExecution({
        runtimeId: "r3",
        hostId: "h1",
        agentKey: "a",
        terminalId: "t1",
        startedAt: 8,
    });
    await db.close();
    db = await openDatabase(join(directory, "aiox.db"));
    assert.equal(
        (await db.hostState.snapshot()).hosts[0]!.agents[0]!.lastExit?.kind,
        "exited",
    );

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
    const admitted = await Promise.allSettled([
        db.hostState.saveOperation(operation, "hash"),
        db.hostState.saveOperation({ ...operation, id: "retry" }, "hash"),
        db.hostState.saveOperation({ ...operation, id: "conflict" }, "other"),
    ]);
    assert.equal(admitted[0]!.status, "fulfilled");
    assert.equal(admitted[1]!.status, "fulfilled");
    if (admitted[1]!.status === "fulfilled")
        assert.equal(admitted[1]!.value.id, operation.id);
    assert.equal(admitted[2]!.status, "rejected");
    if (admitted[2]!.status === "rejected")
        assert.match(String(admitted[2]!.reason), /request_conflict/);
    assert.equal(
        (await db.hostState.getOperation(operation.requestId, "hash"))!.id,
        "o1",
    );
    await assert.rejects(
        db.hostState.getOperation(operation.requestId, "other"),
        /request_conflict/,
    );
    assert.equal(await db.hostState.getOperation("missing", "hash"), undefined);
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

test("Host admission atomically stores its Operation and failed pre-registration start survives reopen", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-admission-"));
    const file = join(directory, "aiox.db");
    let db = await openDatabase(file);
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const host: HostView = {
        id: "host",
        name: "Host",
        directory,
        sourceFile: join(directory, "aiox.yaml"),
        instruction: "",
        revision: 1,
        panelId: "panel",
        networkId: "network",
        activeOperationId: null,
        agents: [
            {
                key: "a",
                adapter: "codex",
                role: null,
                description: null,
                instruction: "",
                args: [],
                member: false,
                runtime: null,
                lastTerminalId: null,
                lastExit: null,
            },
        ],
    };
    const network: HostNetworkView = {
        id: "network",
        hostId: "host",
        name: "N",
        scope: "host",
        default: "allow",
        members: [],
        edges: [],
    };
    const panel: PanelView = {
        id: "panel",
        kind: "host",
        section: "hosts",
        name: "Host",
        hostId: "host",
        networkId: "network",
        revision: 1,
        activePaneId: "pane",
        layout: {
            type: "pane",
            id: "pane",
            tabIds: ["tab"],
            selectedTabId: "tab",
        },
        tabs: [
            {
                id: "tab",
                label: "a",
                agentKey: "a",
                terminalId: null,
                runtimeId: null,
                presentation: "preparing",
                notice: null,
            },
        ],
    };
    const operation: Operation = {
        id: "operation",
        requestId: "6a8ed620-0000-4000-8000-000000000090",
        kind: "host.run",
        hostId: "host",
        panelId: "panel",
        state: "running",
        targets: [
            { agentKey: "a", terminalId: null, state: "pending", error: null },
        ],
        error: null,
        cleanupErrors: [],
        createdAt: 1,
        finishedAt: null,
    };
    await db.hostState.saveOperation(
        { ...operation, hostId: null, panelId: null },
        "hash",
    );
    await assert.rejects(
        db.hostState.createHost(host, network, panel, 1, {
            value: operation,
            requestHash: "hash",
        }),
    );
    assert.deepEqual((await db.hostState.snapshot()).hosts, []);
    const admitted = {
        ...operation,
        id: "admitted",
        requestId: "6a8ed620-0000-4000-8000-000000000091",
    };
    await db.hostState.createHost(host, network, panel, 1, {
        value: admitted,
        requestHash: "hash2",
    });
    assert.equal(
        (await db.hostState.snapshot()).hosts[0]!.activeOperationId,
        "admitted",
    );
    await db.hostState.failStart(
        "host",
        "a",
        "shell unavailable",
        "aiox host agent start a",
        panel.tabs[0]!.id,
    );
    await db.close();
    db = await openDatabase(file);
    const state = await db.hostState.snapshot();
    assert.equal(
        state.hosts[0]!.agents[0]!.lastExit?.message,
        "shell unavailable",
    );
    assert.equal(
        state.panels[0]!.tabs[0]!.notice?.message,
        "shell unavailable",
    );
    assert.equal(state.panels[0]!.tabs[0]!.presentation, "start-failed");
    assert.equal(
        state.operations.find((o) => o.id === "admitted")!.state,
        "running",
    );
});

test("Host route overrides reset to applied YAML and agent updates preserve unrelated policies across reopen", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-host-routes-"));
    const path = join(directory, "aiox.db");
    let db = await openDatabase(path);
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const agent = (key: string) => ({
        key,
        adapter: "codex" as const,
        role: null,
        description: null,
        instruction: "",
        args: [],
        member: true,
        runtime: null,
        lastTerminalId: null,
        lastExit: null,
    });
    const host: HostView = {
        id: "h",
        name: "Host",
        directory: "/work",
        sourceFile: "/work/aiox.yaml",
        instruction: "",
        revision: 1,
        panelId: "p",
        networkId: "n",
        activeOperationId: null,
        agents: ["a", "b", "c"].map(agent),
    };
    const panel: PanelView = {
        id: "p",
        name: "Host",
        kind: "host",
        section: "hosts",
        hostId: "h",
        networkId: "n",
        revision: 1,
        layout: { type: "pane", id: "pane", tabIds: [], selectedTabId: null },
        activePaneId: "pane",
        tabs: [],
    };
    await db.hostState.createHost(
        host,
        {
            id: "n",
            hostId: "h",
            name: "Team",
            scope: "host",
            default: "deny",
            members: host.agents.map((a) => ({
                agentKey: a.key,
                runtimeId: null,
            })),
            edges: host.agents.flatMap((a) =>
                host.agents
                    .filter((b) => b.key !== a.key)
                    .map((b) => ({
                        from: a.key,
                        to: b.key,
                        fromRuntimeId: null,
                        toRuntimeId: null,
                        policy:
                            a.key === "a" && b.key === "b"
                                ? ("allow" as const)
                                : ("deny" as const),
                        source:
                            a.key === "a" && b.key === "b"
                                ? ("manifest-edge" as const)
                                : ("manifest-default" as const),
                    })),
            ),
        },
        panel,
        1,
    );
    const edge = async (from: string, to: string) =>
        (await db.hostState.snapshot()).networks[0]!.edges.find(
            (e) => e.from === from && e.to === to,
        )!;
    await db.hostState.routeNetwork("h", "n", {
        kind: "directed",
        action: "block",
        from: "a",
        to: ["b"],
    });
    assert.equal((await edge("a", "b")).policy, "deny");
    await db.hostState.routeNetwork("h", "n", {
        kind: "directed",
        action: "reset",
        from: "a",
        to: ["b"],
    });
    assert.equal((await edge("a", "b")).source, "manifest-edge");
    await db.hostState.routeNetwork("h", "n", {
        kind: "between",
        action: "unblock",
        agents: ["a", "b", "c"],
    });
    await assert.rejects(
        db.hostState.routeNetwork("h", "n", {
            kind: "directed",
            action: "block",
            from: "a",
            to: ["b", "missing"],
        }),
    );
    assert.equal((await edge("a", "b")).policy, "allow");
    await assert.rejects(
        db.hostState.routeNetwork("other", "n", {
            kind: "between",
            action: "block",
            agents: ["a", "b"],
        }),
    );
    await db.hostState.routeNetwork("h", "n", {
        kind: "directed",
        action: "unblock",
        from: "c",
        to: ["a"],
    });
    assert.equal((await edge("c", "a")).source, "runtime-override");
    await db.hostState.routeNetwork("h", "n", {
        kind: "directed",
        action: "reset",
        from: "c",
        to: ["a"],
    });
    assert.equal((await edge("c", "a")).source, "manifest-default");
    assert.equal((await edge("c", "a")).policy, "deny");
    // Resetting an already-default edge is also idempotent.
    await db.hostState.routeNetwork("h", "n", {
        kind: "directed",
        action: "reset",
        from: "c",
        to: ["a"],
    });

    const beforeInvalidApply = await db.hostState.snapshot();
    await assert.rejects(
        db.hostState.applyAgent(
            "h",
            { ...agent("a"), instruction: "must roll back" },
            [{ from: "a", to: "missing", policy: "allow" }],
        ),
        /a -> missing/,
    );
    assert.deepEqual(await db.hostState.snapshot(), beforeInvalidApply);
    await db.hostState.applyAgent(
        "h",
        { ...agent("a"), instruction: "latest" },
        [{ from: "a", to: "b", policy: "allow" }],
    );
    assert.equal((await edge("a", "b")).source, "manifest-edge");
    assert.equal((await edge("a", "c")).policy, "deny");
    assert.equal((await edge("b", "c")).source, "runtime-override");
    await db.hostState.applyAgent("h", agent("d"), [
        { from: "d", to: "c", policy: "allow" },
    ]);
    await db.close();
    db = await openDatabase(path);
    assert.equal((await edge("d", "c")).policy, "allow");
    assert.equal(
        (await db.hostState.snapshot()).hosts[0]!.agents[0]!.instruction,
        "latest",
    );
    const before = (await db.hostState.snapshot()).panels[0]!;
    await db.hostState.updatePanel(
        {
            ...before,
            revision: before.revision + 1,
            layout: {
                type: "pane",
                id: "pane",
                tabIds: ["old", "new"],
                selectedTabId: "old",
            },
            tabs: [
                {
                    id: "old",
                    terminalId: "old-terminal",
                    agentKey: "a",
                    runtimeId: null,
                    label: "a",
                    presentation: "stopped",
                    notice: {
                        message: "old notice",
                        reason: "stopped",
                        restartCommand: "start",
                    },
                },
                {
                    id: "new",
                    terminalId: null,
                    agentKey: "a",
                    runtimeId: null,
                    label: "a",
                    presentation: "preparing",
                    notice: null,
                },
            ],
        },
        before.revision,
    );
    await db.hostState.failStart("h", "a", "new failure", "start", "new");
    const failedTabs = (await db.hostState.snapshot()).panels[0]!.tabs;
    assert.equal(
        failedTabs.find((t) => t.id === "old")!.notice!.message,
        "old notice",
    );
    assert.equal(
        failedTabs.find((t) => t.id === "new")!.notice!.message,
        "new failure",
    );
    await db.hostState.applyAgent("h", { ...agent("a"), member: false }, []);
    assert.equal(
        (await db.hostState.snapshot()).networks[0]!.edges.some(
            (e) => e.from === "a" || e.to === "a",
        ),
        false,
    );
    const current = await db.hostState.snapshot();
    const replacement = {
        ...current.hosts[0]!,
        revision: current.hosts[0]!.revision + 1,
        instruction: "replaced",
        agents: [agent("z")],
    };
    const replacedNetwork = {
        ...current.networks[0]!,
        name: "replacement",
        default: "deny" as const,
        members: [{ agentKey: "z", runtimeId: null }],
        edges: [],
    };
    await assert.rejects(
        db.hostState.replaceHost(
            replacement,
            replacedNetwork,
            current.panels[0]!,
            replacement.revision,
        ),
        /revision_conflict/,
    );
    assert.deepEqual(await db.hostState.snapshot(), current);
    await db.hostState.replaceHost(
        replacement,
        replacedNetwork,
        current.panels[0]!,
        current.hosts[0]!.revision,
    );
    await db.close();
    db = await openDatabase(path);
    const replaced = await db.hostState.snapshot();
    assert.deepEqual(replaced.hosts, [replacement]);
    assert.deepEqual(replaced.networks, [replacedNetwork]);
    assert.deepEqual(
        replaced.panels,
        current.panels.map((p) => ({ ...p, revision: p.revision + 1 })),
    );
    await assert.rejects(
        db.hostState.deleteHost("h", replaced.panels[0]!.revision),
        /still owns terminals/,
    );
    assert.deepEqual(await db.hostState.snapshot(), replaced);
    await db.hostState.removeTerminal("old-terminal");
    const deletable = (await db.hostState.snapshot()).panels[0]!;
    await db.hostState.deleteHost("h", deletable.revision);
    await db.close();
    db = await openDatabase(path);
    assert.deepEqual(await db.hostState.snapshot(), {
        hosts: [],
        networks: [],
        panels: [],
        operations: [],
    });
});

test("terminal removal atomically persists collapsed layout and focus, and repeated cleanup is inert", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-remove-terminal-"));
    const path = join(directory, "aiox.db");
    let db = await openDatabase(path);
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const pane = (id: string) => ({
        type: "pane" as const,
        id,
        tabIds: [id],
        selectedTabId: id,
    });
    const panel: PanelView = {
        id: "p",
        kind: "workspace",
        section: "workspaces",
        name: "Test",
        hostId: null,
        networkId: null,
        revision: 1,
        activePaneId: "a",
        layout: {
            type: "split",
            axis: "x",
            weights: [0.3, 0.7],
            children: [pane("a"), pane("b")],
        },
        tabs: ["a", "b"].map((id) => ({
            id,
            terminalId: id,
            label: id,
            agentKey: null,
            runtimeId: null,
            presentation: "shell",
            notice: null,
        })),
    };
    await db.hostState.createPanel(panel);
    const raw = new Database(path);
    t.onTestFinished(() => {
        raw.close();
    });
    raw.exec(
        "CREATE TRIGGER fail_layout BEFORE UPDATE ON panels BEGIN SELECT RAISE(ABORT, 'layout failure'); END",
    );
    await assert.rejects(db.hostState.removeTerminal("a"), /layout failure/);
    assert.deepEqual((await db.hostState.snapshot()).panels, [panel]);
    raw.exec("DROP TRIGGER fail_layout");
    await db.hostState.removeTerminal("a");
    await db.hostState.removeTerminal("a");
    await db.close();
    db = await openDatabase(path);
    const remaining = (await db.hostState.snapshot()).panels[0]!;
    assert.deepEqual(remaining, {
        ...panel,
        revision: 2,
        activePaneId: "b",
        layout: pane("b"),
        tabs: [panel.tabs[1]!],
    });
    await db.hostState.removeTerminal("b");
    const empty = (await db.hostState.snapshot()).panels[0]!;
    assert.deepEqual(empty, {
        ...remaining,
        revision: 3,
        tabs: [],
        layout: { ...pane("b"), tabIds: [], selectedTabId: null },
    });
});
