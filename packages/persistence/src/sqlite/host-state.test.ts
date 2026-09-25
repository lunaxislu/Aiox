import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { RouteOperationError } from "@aiox/domain";
import type { PanelView, HostView, HostNetworkView } from "@aiox/protocol";
import * as Effect from "effect/Effect";
import { test } from "vitest";

import { openDatabase } from "./database";
import { HostStateError } from "./host-state";

test("panel changes write only changed rows, create and delete in one transaction and keep deleted IDs", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-panel-"));
    const file = join(directory, "aiox.db");
    let db = await openDatabase(file);
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const tab = (id: string, terminalId: string | null) => ({
        id,
        terminalId,
        label: "Shell",
        agentKey: null,
        runtimeId: null,
        presentation: "shell" as const,
        notice: null,
    });
    const panel: PanelView = {
        id: "p1",
        kind: "workspace",
        section: "hosts",
        name: "Work",
        hostId: null,
        networkId: null,
        revision: 1,
        layout: {
            type: "pane",
            id: "pane1",
            tabIds: ["tab1", "tab2"],
        },
        tabs: [tab("tab1", "t1"), tab("tab2", "t2")],
    };
    await db.hostState.createPanel(panel);
    await assert.rejects(db.hostState.createPanel(panel), /id_conflict/);
    await assert.rejects(
        db.hostState.createPanel({
            ...panel,
            id: "p2",
            tabs: [{ ...tab("tab3", "t1") }],
            layout: {
                type: "pane",
                id: "pane1",
                tabIds: ["tab3"],
            },
        }),
        /UNIQUE/,
    );

    // Record row writes on the tab table to prove rename and move leave tab rows alone.
    const raw = new DatabaseSync(file);
    raw.exec(
        "CREATE TABLE tab_writes(op TEXT, id TEXT);" +
            "CREATE TRIGGER tab_update AFTER UPDATE ON panel_tabs BEGIN INSERT INTO tab_writes VALUES('update', NEW.id); END;" +
            "CREATE TRIGGER tab_delete AFTER DELETE ON panel_tabs BEGIN INSERT INTO tab_writes VALUES('delete', OLD.id); END;" +
            "CREATE TRIGGER tab_insert AFTER INSERT ON panel_tabs BEGIN INSERT INTO tab_writes VALUES('insert', NEW.id); END;",
    );
    const writes = () =>
        raw
            .prepare("SELECT op, id FROM tab_writes ORDER BY rowid")
            .all()
            .map((row) => ({ op: row.op, id: row.id }));
    const renamed = await db.hostState.mutatePanel("p1", (p) => ({
        ...p,
        name: "Renamed",
    }));
    assert.equal(renamed.revision, 2);
    assert.deepEqual(writes(), []);
    // An unchanged result neither writes nor advances the change number.
    assert.equal((await db.hostState.mutatePanel("p1", (p) => p)).revision, 2);
    await assert.rejects(
        db.hostState.mutatePanel("p1", () => {
            throw new Error("rejected command");
        }),
        /rejected command/,
    );
    assert.equal((await db.hostState.getPanel("p1"))!.name, "Renamed");
    await db.hostState.mutatePanel("p1", (p) => ({
        ...p,
        tabs: p.tabs.map((t) =>
            t.id === "tab2" ? { ...t, presentation: "stopped" as const } : t,
        ),
    }));
    assert.deepEqual(writes(), [{ op: "update", id: "tab2" }]);

    // Concurrent commands both apply to the latest panel instead of conflicting.
    await Promise.all([
        db.hostState.mutatePanel("p1", (p) => ({ ...p, name: "First" })),
        db.hostState.mutatePanel("p1", (p) => ({
            ...p,
        })),
    ]);
    assert.equal((await db.hostState.getPanel("p1"))!.name, "First");

    await db.hostState.mutatePanel("p1", (p, context) =>
        Effect.gen(function* () {
            assert.equal(yield* context.tabTaken("tab1"), true);
            assert.equal(yield* context.deleted("tab1"), false);
            return {
                ...p,
                layout: {
                    ...p.layout,
                    tabIds: ["tab2"],
                },
                tabs: p.tabs.filter((t) => t.id !== "tab1"),
            } as PanelView;
        }),
    );
    await db.hostState.mutatePanel("p1", (p, context) =>
        Effect.gen(function* () {
            assert.equal(yield* context.deleted("tab1"), true);
            assert.equal(yield* context.tabTaken("tab1"), false);
            return p;
        }),
    );
    // Creation, its changes and a failure are one transaction: nothing of a rejected create stays.
    const fresh = {
        ...panel,
        id: "p3",
        tabs: [tab("tab5", null)],
        layout: {
            type: "pane" as const,
            id: "pane5",
            tabIds: ["tab5"],
        },
    };
    await assert.rejects(
        db.hostState.applyPanel("p3", (current) => {
            assert.equal(current, undefined);
            return {
                ...fresh,
                tabs: [tab("tab1", null)],
                layout: {
                    ...fresh.layout,
                    tabIds: ["tab1"],
                },
            };
        }),
        /id_deleted/,
    );
    assert.equal(await db.hostState.getPanel("p3"), undefined);
    assert.equal((await db.hostState.applyPanel("p3", () => fresh))!.id, "p3");
    assert.equal(await db.hostState.applyPanel("p3", () => null), null);
    await db.hostState.applyPanel("p3", (current, context) =>
        Effect.gen(function* () {
            assert.equal(current, undefined);
            assert.equal(yield* context.deleted("p3"), true);
            assert.equal(yield* context.deleted("tab5"), true);
            return null;
        }),
    );
    raw.close();
    await db.close();
    db = await openDatabase(file);
    await db.hostState.deletePanel("p1");
    await assert.rejects(
        db.hostState.getPanel("p1").then((p) => {
            if (!p) throw new Error("gone");
        }),
        /gone/,
    );
    const code = (expected: string) => (error: { code?: string }) =>
        error.code === expected;
    await assert.rejects(
        db.hostState.mutatePanel("p1", (p) => p),
        code("id_deleted"),
    );
    await assert.rejects(
        db.hostState.mutatePanel("never", (p) => p),
        code("unknown_panel"),
    );
    await assert.rejects(db.hostState.createPanel(panel), /id_deleted/);
});

test("Host creation is atomic, targeted Host reads match the snapshot and recovery marks lost terminals", async (t) => {
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
        },
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
    assert.deepEqual(
        await db.hostState.getHost("h1"),
        (await db.hostState.snapshot()).hosts[0],
    );
    assert.equal(await db.hostState.getHost("missing"), undefined);
    // Ended executions older than the retention edge are history only.
    assert.equal(await db.hostState.purgeBefore(100), 2);
    await db.hostState.recover(10);
    const recovered = await db.hostState.snapshot();
    assert.equal(recovered.panels[0]!.tabs[0]!.presentation, "unavailable");
    await db.hostState.recover(11);
    assert.equal(
        (await db.hostState.snapshot()).panels[0]!.revision,
        recovered.panels[0]!.revision,
    );
    assert.equal((await db.hostState.snapshot()).hosts.length, 1);
});

test("failed pre-registration start survives reopen", async (t) => {
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
        layout: {
            type: "pane",
            id: "pane",
            tabIds: ["tab"],
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
    await db.hostState.createHost(host, network, panel, 1);
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
        layout: { type: "pane", id: "pane", tabIds: [] },
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
        HostStateError,
    );
    await assert.rejects(
        db.hostState.routeNetwork("h", "n", {
            kind: "directed",
            action: "block",
            from: "a",
            to: ["a"],
        }),
        RouteOperationError,
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
    await db.hostState.mutatePanel(before.id, () => ({
        ...before,
        layout: {
            type: "pane",
            id: "pane",
            tabIds: ["old", "new"],
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
    }));
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
            (latest) => latest,
            replacement.revision,
        ),
        /revision_conflict/,
    );
    assert.deepEqual(await db.hostState.snapshot(), current);
    // A user move after the caller read the panel survives the replacement.
    const moved = await db.hostState.mutatePanel(
        current.panels[0]!.id,
        (p) => ({
            ...p,
            layout: {
                ...p.layout,
                tabIds: ["new", "old"],
            } as PanelView["layout"],
        }),
    );
    const stored = await db.hostState.replaceHost(
        replacement,
        replacedNetwork,
        (latest) => {
            assert.deepEqual(latest, moved);
            return latest;
        },
        current.hosts[0]!.revision,
    );
    assert.equal(stored.revision, moved.revision + 1);
    await db.close();
    db = await openDatabase(path);
    const replaced = await db.hostState.snapshot();
    assert.deepEqual(replaced.hosts, [replacement]);
    assert.deepEqual(replaced.networks, [replacedNetwork]);
    assert.deepEqual(replaced.panels, [stored]);
    await assert.rejects(db.hostState.deleteHost("h"), /still owns terminals/);
    assert.deepEqual(await db.hostState.snapshot(), replaced);
    await db.hostState.removeTerminal("old-terminal");
    await db.hostState.deleteHost("h");
    await db.close();
    db = await openDatabase(path);
    assert.deepEqual(await db.hostState.snapshot(), {
        hosts: [],
        networks: [],
        panels: [],
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
    });
    const panel: PanelView = {
        id: "p",
        kind: "workspace",
        section: "workspaces",
        name: "Test",
        hostId: null,
        networkId: null,
        revision: 1,
        layout: {
            type: "split",
            id: "s",
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
    const raw = new DatabaseSync(path);
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
        layout: pane("b"),
        tabs: [panel.tabs[1]!],
    });
    await db.hostState.removeTerminal("b");
    const empty = (await db.hostState.snapshot()).panels[0]!;
    assert.deepEqual(empty, {
        ...remaining,
        revision: 3,
        tabs: [],
        layout: { ...pane("b"), tabIds: [] },
    });
});

test("restart fails shells that never became ready and marks lost terminals", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-restart-tabs-"));
    const db = await openDatabase(join(directory, "aiox.db"));
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const tab = (id: string, terminalId: string | null) => ({
        id,
        terminalId,
        label: id,
        agentKey: null,
        runtimeId: null,
        presentation: terminalId ? ("shell" as const) : ("preparing" as const),
        notice: null,
    });
    await db.hostState.createPanel({
        id: "p",
        kind: "workspace",
        section: "workspaces",
        name: "P",
        hostId: null,
        networkId: null,
        revision: 1,
        layout: {
            type: "pane",
            id: "pane",
            tabIds: ["shell", "pending"],
        },
        tabs: [tab("shell", "t2"), tab("pending", null)],
    });
    await db.hostState.recover(100);
    const tabs = (await db.hostState.getPanel("p"))!.tabs;
    const pending = tabs.find((t) => t.id === "pending")!;
    assert.equal(pending.presentation, "start-failed");
    assert.equal(pending.notice?.reason, "daemon-ended");
    assert.equal(
        tabs.find((t) => t.id === "shell")!.presentation,
        "unavailable",
    );
});
