// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { startDaemon } from "@aiox/daemon";
import { openDatabase } from "@aiox/persistence";
import type {
    ApplicationEvent,
    ApplicationDelta,
    PanelView,
    WebCommandRequest,
    WebCommandResult,
} from "@aiox/protocol";
import { createLiveQueryCollection } from "@tanstack/db";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationConnection } from "./application-connection";
import { ApplicationStore } from "./application-store";

const panel = (id = "p", name = "Before"): PanelView => ({
    id,
    name,
    kind: "workspace",
    section: "workspaces",
    hostId: null,
    networkId: null,
    revision: 1,
    layout: { type: "pane", id: `${id}-pane`, tabIds: [] },
    tabs: [],
});
const snapshot = (
    panels: PanelView[] = [],
    version = 0,
    epoch = "one",
): ApplicationEvent => ({
    type: "snapshot",
    version,
    snapshot: {
        epoch,
        hosts: [],
        networks: [],
        panels,
        terminals: [],
        agents: [],
        cleanups: [],
        notifications: [],
    },
});
const delta = (version: number, panels: PanelView[]): ApplicationDelta => ({
    type: "delta",
    epoch: "one",
    version,
    changes: panels.map((value) => ({
        resource: "panel",
        action: "upsert",
        id: value.id,
        value,
    })),
});
type Answer = {
    result: WebCommandResult;
    state: ApplicationDelta | null;
    checkpoint: number;
};
const stores: ApplicationStore[] = [];
afterEach(async () => {
    await Promise.all(stores.splice(0).map((store) => store.dispose()));
    vi.restoreAllMocks();
});
function setup(panels = [panel()]) {
    const store = new ApplicationStore();
    stores.push(store);
    store.onEvent(snapshot(panels));
    const connection = new ApplicationConnection("ws://unused");
    const requests: {
        request: WebCommandRequest;
        success: (state: ApplicationDelta | null) => void;
        fail: (error: unknown) => void;
    }[] = [];
    const session = crypto.randomUUID();
    vi.spyOn(connection, "panelCommand").mockImplementation(
        (input, onRequest) => {
            const request = {
                ...input,
                requestId: crypto.randomUUID(),
                clientSessionId: session,
                sequence: requests.length + 1,
            };
            let allocated = false;
            const execute = Effect.callback<Answer, unknown>((resume) => {
                allocated = true;
                onRequest?.(request);
                requests.push({
                    request,
                    success: (state) =>
                        resume(
                            Effect.succeed({
                                result: {
                                    requestId: request.requestId,
                                    sequence: request.sequence,
                                    panel:
                                        (state?.changes.find(
                                            (change) =>
                                                change.resource === "panel" &&
                                                change.action === "upsert",
                                        )?.value as PanelView) ?? null,
                                },
                                state,
                                checkpoint: request.sequence,
                            }),
                        ),
                    fail: (error) => resume(Effect.fail(error)),
                });
            });
            return {
                get request() {
                    return allocated ? request : undefined;
                },
                execute,
            } as ReturnType<ApplicationConnection["panelCommand"]>;
        },
    );
    const rename = (name: string, panelId = "p") =>
        store.panelCommand(connection, {
            panelId,
            changes: [{ type: "panel.rename", name }],
        });
    return { store, connection, requests, rename };
}

describe("application store", () => {
    it("replaces snapshots and publishes related changes together", async () => {
        const store = new ApplicationStore();
        store.onEvent({
            type: "snapshot",
            version: 0,
            snapshot: {
                epoch: "one",
                hosts: [],
                networks: [],
                panels: [],
                terminals: [],
                agents: [],
                cleanups: [],
                notifications: [],
            },
        });
        expect(store.getView().epoch).toBe("one");
        await store.dispose();
    });
});

it("uses one publication for a multi-resource delta, including live queries; snapshot removes absent rows", async () => {
    const { store } = setup();
    const query = createLiveQueryCollection({
        query: (q) => q.from({ row: store.collection }),
        startSync: true,
    });
    await query.preload();
    const observed: string[][] = [];
    const subscription = query.subscribeChanges(() =>
        observed.push(query.toArray.map((row) => row.key).sort()),
    );
    const notifications = [
        {
            id: "n",
            originRuntimeId: "runtime",
            terminalId: null,
            body: "notice",
            createdAt: 1,
            readAt: null,
        },
    ];
    // Resource shape validation belongs to RPC; this test exercises atomic delivery independent of resource internals.
    store.onEvent({
        ...delta(1, [panel("other")]),
        changes: [
            ...delta(1, [panel("other")]).changes,
            {
                resource: "cleanup",
                action: "upsert",
                id: "c",
                value: {
                    id: "c",
                    panelId: "p",
                    tabId: null,
                    terminalId: "t",
                    reason: "panel-deleted",
                    state: "stopping",
                    error: null,
                    attempts: 0,
                    updatedAt: 1,
                },
            },
            {
                resource: "notification",
                action: "upsert",
                id: "n",
                value: notifications[0]!,
            },
        ],
    });
    expect(observed).toHaveLength(1);
    expect(observed[0]).toEqual([
        "cleanup:c",
        "cursor",
        "notification:n",
        "panel:other",
        "panel:p",
    ]);
    expect(store.getView().cleanups).toHaveLength(1);
    store.onEvent(snapshot([panel("other")], 1));
    expect(store.getView().panels.map((item) => item.id)).toEqual(["other"]);
    expect(store.getView().notifications).toEqual([]);
    expect(store.getView().cleanups).toEqual([]);
    subscription.unsubscribe();
    await query.cleanup();
});

it.each(["response-first", "broadcast-first"])(
    "confirms without a rollback flash: %s, duplicate delivery",
    async (order) => {
        const { store, requests, rename } = setup();
        const values: string[] = [];
        const sub = store.collection.subscribeChanges(() =>
            values.push(store.getView().panels[0]!.name),
        );
        const operation = rename("After");
        const update = delta(1, [panel("p", "After")]);
        expect(store.getView().panels[0]!.name).toBe("After");
        if (order === "broadcast-first") store.onEvent(update);
        requests[0]!.success(update);
        expect((await operation.result).status).toBe("confirmed");
        if (order === "response-first") {
            expect(store.getView().pending).toHaveLength(1);
            store.onEvent(update);
        }
        store.onEvent(update);
        expect(store.getView().pending).toHaveLength(0);
        expect(new Set(values)).toEqual(new Set(["After"]));
        sub.unsubscribe();
    },
);

it("a high response version cannot skip a previous delta for another resource", async () => {
    const { store, requests, rename } = setup();
    const operation = rename("After");
    requests[0]!.success(delta(2, [panel("p", "After")]));
    await operation.result;
    expect(store.getView().version).toBe(0);
    store.onEvent(delta(1, [panel("other", "Other window")]));
    expect(
        store
            .getView()
            .panels.map((item) => item.name)
            .sort(),
    ).toEqual(["After", "Other window"]);
    store.onEvent(delta(2, [panel("p", "After")]));
    expect(store.getView().pending).toHaveLength(0);
    expect(store.getView().panels).toHaveLength(2);
});

it.each(["response-first", "broadcast-first"])(
    "later confirmed state covers an earlier intent without inventing its outcome: %s",
    async (order) => {
        const { store, requests, rename } = setup();
        const earlier = rename("Earlier");
        const later = rename("Later");
        const values: string[] = [];
        const sub = store.collection.subscribeChanges(() =>
            values.push(store.getView().panels[0]!.name),
        );
        if (order === "broadcast-first") {
            store.onEvent(delta(1, [panel("p", "Earlier")]));
            store.onEvent(delta(2, [panel("p", "Later")]));
        }
        requests[1]!.success(delta(2, [panel("p", "Later")]));
        await later.result;
        if (order === "response-first") {
            store.onEvent(delta(1, [panel("p", "Earlier")]));
            store.onEvent(delta(2, [panel("p", "Later")]));
        }
        expect(store.getView().pending).toHaveLength(1);
        expect(store.getView().pending[0]).toMatchObject({
            status: "pending",
            visible: false,
        });
        expect(new Set(values)).toEqual(new Set(["Later"]));
        requests[0]!.fail({ code: "result_expired" });
        expect((await earlier.result).status).toBe("unknown");
        expect(store.getView().panels[0]!.name).toBe("Later");
        sub.unsubscribe();
    },
);

it("rebases failure on current server state and blocks only creation dependents", async () => {
    const { store, requests, connection, rename } = setup();
    const parent = store.panelCommand(connection, {
        panelId: "new",
        changes: [
            { type: "panel.create", name: "New", paneId: "pane", tabId: "tab" },
        ],
    });
    const child = rename("Dependent", "new");
    const other = rename("Success");
    store.onEvent(delta(1, [panel("p", "Success"), panel("remote", "Remote")]));
    requests[2]!.success(delta(1, [panel("p", "Success")]));
    await other.result;
    requests[0]!.fail({ code: "id_conflict" });
    expect((await parent.result).status).toBe("rejected");
    expect(store.getView().panels.map((item) => item.name)).toEqual([
        "Success",
        "Remote",
    ]);
    expect(store.getView().pending[0]).toMatchObject({
        visible: false,
        status: "blocked",
    });
    expect(connection.panelCommand).toHaveBeenCalledTimes(3);
    requests[1]!.fail({ code: "unknown_panel" });
    await child.result;
    expect(store.getView().pending).toHaveLength(0);
});

it.each([
    [{ code: "invalid_request" }, "rejected"],
    [new Error("socket lost"), "unknown"],
    [{ code: "result_expired" }, "unknown"],
    [{ code: "session_expired" }, "unknown"],
    [{ code: "request_finalized" }, "unknown"],
    [{ code: "execution_failed" }, "unknown"],
    [{ code: "sequence_gap" }, "unexecuted"],
] as const)("distinguishes request outcome %j", async (error, status) => {
    const { store, requests, rename, connection } = setup();
    const operation = rename("Optimistic");
    requests[0]!.fail(error);
    expect((await operation.result).status).toBe(status);
    expect(store.getView().panels[0]!.name).toBe("Before");
    store.onEvent(snapshot([panel("p", "Optimistic")], 3));
    expect(store.getView().panels[0]!.name).toBe("Optimistic");
    expect(connection.panelCommand).toHaveBeenCalledTimes(1);
    if (status === "unknown") {
        expect(store.getView().pending[0]!.status).toBe("unknown");
        store.onEvent(snapshot([], 0, "new-epoch"));
        expect(store.getView().pending[0]!.reconciliation).toBe(
            "epoch-changed",
        );
        expect(store.getView().pending[0]!.issue).toEqual(error);
        store.dismissUnknown(operation.id);
    }
    expect(store.getView().pending).toHaveLength(0);
});

it.each(["one", "new-epoch"])(
    "snapshot preserves a sequence-failure learned after a lost response: %s",
    async (epoch) => {
        const { store, requests, rename, connection } = setup();
        const operation = rename("Never run");
        requests[0]!.fail(new Error("response lost"));
        expect((await operation.result).status).toBe("unknown");
        const failure = {
            clientSessionId: requests[0]!.request.clientSessionId,
            code: "sequence_gap" as const,
            missing: [],
            unexecuted: [requests[0]!.request],
        };
        store.onEvent({ type: "sequence-failure", failure });
        expect(store.getView().pending[0]).toMatchObject({
            status: "blocked",
            visible: false,
            issue: failure,
        });

        store.onEvent(
            snapshot([panel("remote", "Current server state")], 0, epoch),
        );
        expect(store.getView().panels.map((item) => item.id)).toEqual([
            "remote",
        ]);
        expect(store.getView().pending[0]).toMatchObject({
            status: "blocked",
            visible: false,
            issue: failure,
            reconciliation: epoch === "one" ? "same-epoch" : "epoch-changed",
        });
        expect(connection.panelCommand).toHaveBeenCalledTimes(1);
        expect(requests).toHaveLength(1);
    },
);

it("sequence-failure identifies unexecuted requests without inferring from snapshot", async () => {
    const { store, requests, rename } = setup();
    const operation = rename("Never run");
    store.onEvent({
        type: "sequence-failure",
        failure: {
            clientSessionId: requests[0]!.request.clientSessionId,
            code: "sequence_gap",
            missing: [],
            unexecuted: [requests[0]!.request],
        },
    });
    expect(store.getView().pending[0]).toMatchObject({
        status: "blocked",
        visible: false,
    });
    requests[0]!.fail(new Error("socket closed after sequence-failure"));
    expect((await operation.result).status).toBe("unexecuted");
});

it("a successful response without delta waits for snapshot, then releases its intent", async () => {
    const { store, requests, rename } = setup();
    const operation = rename("After");
    requests[0]!.success(null);
    await operation.result;
    expect(store.getView().pending[0]!.status).toBe("acknowledged");
    store.onEvent(snapshot([panel("p", "After")], 2));
    expect(store.getView().pending).toHaveLength(0);
});

it("a resync snapshot may precede the successful null-state response", async () => {
    const { store, requests, rename } = setup();
    const operation = rename("After");
    store.onEvent(snapshot([panel("p", "After")], 2));
    requests[0]!.success(null);
    expect((await operation.result).status).toBe("confirmed");
    expect(store.getView().pending).toEqual([]);
});

it("retries only explicitly with the original request; completed results are not replayed", async () => {
    const { store, requests, rename } = setup();
    const operation = rename("After");
    requests[0]!.fail(new Error("disconnect"));
    await operation.result;
    store.onEvent(snapshot());
    expect(requests).toHaveLength(1);
    const retry = operation.retry();
    expect(requests[1]!.request).toEqual(requests[0]!.request);
    requests[1]!.success(delta(1, [panel("p", "After")]));
    await retry;
    await operation.retry();
    expect(requests).toHaveLength(2);
});

it("a remote deletion suppresses an unacknowledged creation without claiming it failed", async () => {
    const { store, connection, requests } = setup([]);
    const operation = store.panelCommand(connection, {
        panelId: "new",
        changes: [
            { type: "panel.create", name: "New", paneId: "pane", tabId: "tab" },
        ],
    });
    const created = store.getView().panels[0]!;
    store.onEvent(delta(1, [created]));
    store.onEvent({
        type: "delta",
        epoch: "one",
        version: 2,
        changes: [{ resource: "panel", action: "remove", id: "new" }],
    });
    expect(store.getView().panels).toEqual([]);
    requests[0]!.success(delta(1, [created]));
    expect((await operation.result).status).toBe("confirmed");
    expect(store.getView().panels).toEqual([]);
});

it("pane IDs are panel-scoped, so an unrelated panel failure cannot hide a valid pending change", async () => {
    const { store, connection, requests } = setup([
        {
            ...panel("existing"),
            layout: { type: "pane", id: "shared-pane", tabIds: [] },
        },
    ]);
    const parent = store.panelCommand(connection, {
        panelId: "new",
        changes: [
            {
                type: "panel.create",
                name: "New",
                paneId: "shared-pane",
                tabId: "new-tab",
            },
        ],
    });
    const independent = store.panelCommand(connection, {
        panelId: "existing",
        changes: [
            {
                type: "tab.create",
                tabId: "independent-tab",
                target: { toPaneId: "shared-pane" },
            },
        ],
    });
    requests[0]!.fail({ code: "id_conflict" });
    await parent.result;
    expect(
        store.getView().panels.find((item) => item.id === "existing")!.tabs[0]!
            .id,
    ).toBe("independent-tab");
    expect(store.getView().pending[0]!.dependsOn).toEqual([]);
    requests[1]!.fail({ code: "invalid_environment" });
    await independent.result;
});

it("snapshot uses agentId and preserves real resource discriminators", () => {
    const { store } = setup();
    const initial = snapshot();
    if (initial.type !== "snapshot") throw new Error("fixture");
    initial.snapshot.agents.push({
        agentId: "runtime",
        executionOwnership: "daemon",
        name: "Agent",
        role: null,
        description: null,
        status: "idle",
        networkId: null,
        networkName: null,
        hostId: null,
        terminalId: null,
        status_reason: null,
        observation_error: null,
    });
    store.onEvent(initial);
    expect(store.collection.get("agent:runtime")).toMatchObject({
        resource: "agent",
        value: { agentId: "runtime" },
    });
    store.onEvent({
        type: "delta",
        epoch: "one",
        version: 1,
        changes: [{ resource: "agent", action: "remove", id: "runtime" }],
    });
    expect(store.getView().agents).toEqual([]);
});

it("real RPC and isolated SQLite: preparing move, late shell after close, remote windows, reconnect replacement", async (t) => {
    const home = await mkdtemp(join(tmpdir(), "aiox-web-store-"));
    const db = await openDatabase(join(home, ".aiox", "aiox.db"));
    const daemon = await startDaemon({
        home,
        db,
        ports: { daemon: 0, web: 0 },
        retentionDays: () => 30,
        terminal: async () => ({ shell: "/bin/sh", args: [], cwd: home }),
        sequenceGapTimeout: 30,
    });
    const gates: (() => void)[] = [];
    const originalSpawn = daemon.services.lifecycle.createShell.bind(
        daemon.services.lifecycle,
    );
    const spawn = vi
        .spyOn(daemon.services.lifecycle, "createShell")
        .mockImplementation(async (...args) => {
            await new Promise<void>((resolve) => gates.push(resolve));
            return originalSpawn(...args);
        });
    const store = new ApplicationStore();
    const remote = new ApplicationStore();
    const observedRequestIds = new Set<string>();
    const identitySubscription = store.collection.subscribeChanges(() => {
        for (const pending of store.getView().pending)
            if (pending.request)
                observedRequestIds.add(pending.request.requestId);
    });
    const url = `ws://127.0.0.1:${daemon.ports.web}/api/rpc`;
    const connection = new ApplicationConnection(url, 10);
    const other = new ApplicationConnection(url, 10);
    let stop = connection.start(store.onEvent);
    const stopOther = other.start(remote.onEvent);
    t.onTestFinished(async () => {
        spawn.mockRestore();
        for (const release of gates) release();
        await stop();
        await stopOther();
        identitySubscription.unsubscribe();
        await store.dispose();
        await remote.dispose();
        await daemon.stop(true);
        await rm(home, { recursive: true, force: true });
    });
    await vi.waitFor(() => {
        expect(connection.getSnapshot().phase).toBe("ready");
        expect(other.getSnapshot().phase).toBe("ready");
    });
    const create = store.panelCommand(connection, {
        panelId: "p",
        changes: [
            { type: "panel.create", name: "Real", paneId: "pane", tabId: "t1" },
            { type: "tab.create", tabId: "t2", target: { toPaneId: "pane" } },
        ],
    });
    expect(
        store.getView().panels[0]!.tabs.map((tab) => tab.presentation),
    ).toEqual(["preparing", "preparing"]);
    await vi.waitFor(() => {
        expect(create.request).toBeDefined();
        expect(observedRequestIds.has(create.request!.requestId)).toBe(true);
    });
    expect((await create.result).status).toBe("confirmed");
    await vi.waitFor(() => expect(gates).toHaveLength(2));
    const move = store.panelCommand(connection, {
        panelId: "p",
        changes: [
            {
                type: "tab.move",
                tabId: "t1",
                target: {
                    split: {
                        targetPaneId: "pane",
                        side: "right",
                        paneId: "right",
                        splitId: "split",
                    },
                },
            },
        ],
    });
    expect((await move.result).status).toBe("confirmed");
    const close = remote.panelCommand(other, {
        panelId: "p",
        changes: [
            {
                type: "tab.close",
                tabId: "t2",
                expectedRuntimeId: null,
                confirm: false,
            },
        ],
    });
    expect((await close.result).status).toBe("confirmed");
    for (const release of gates) release();
    await vi.waitFor(() => {
        const current = store.getView().panels[0]!;
        expect(current.tabs.map((tab) => [tab.id, tab.presentation])).toEqual([
            ["t1", "shell"],
        ]);
        expect(current.layout).toEqual({
            type: "pane",
            id: "right",
            tabIds: ["t1"],
        });
    });
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(
        store
            .getView()
            .terminals.some(
                (terminal) =>
                    terminal.id ===
                    store.getView().panels[0]!.tabs[0]!.terminalId,
            ),
    ).toBe(true);
    await vi.waitFor(() => expect(store.getView().pending).toEqual([]));
    // Confirmed state is actually in SQLite, not just in the Web collection.
    expect(
        (await db.hostState.getPanel("p"))!.tabs.map((tab) => tab.id),
    ).toEqual(["t1"]);
    const session = connection.getSnapshot().session!.clientSessionId;
    await stop();
    const remove = remote.panelCommand(other, {
        panelId: "p",
        changes: [{ type: "panel.delete", confirm: true }],
    });
    expect((await remove.result).status).toBe("confirmed");
    expect(store.getView().panels).toHaveLength(1);
    stop = connection.start(store.onEvent);
    await vi.waitFor(() => {
        expect(connection.getSnapshot().phase).toBe("ready");
        expect(store.getView().panels).toEqual([]);
    });
    expect(connection.getSnapshot().session!.clientSessionId).toBe(session);
    expect(store.getView().pending).toEqual([]);
}, 20_000);
