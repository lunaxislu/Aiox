import {
    webCommandRequestSchema,
    panelLayoutReferences,
    type ApplicationEvent,
    type ApplicationDelta,
    type WebCommandRequest,
    type WebCommandResult,
} from "@aiox/protocol";
import { createCollection, type SyncConfig } from "@tanstack/db";
import { Cause, Effect, Exit, Schema } from "effect";

import type { ApplicationConnection } from "./application-connection";
import {
    createdIds,
    projectPanel,
    referencedIds,
    type PanelInput,
} from "./panel-projection";

type Snapshot = Extract<ApplicationEvent, { type: "snapshot" }>["snapshot"];
type Change = ApplicationDelta["changes"][number];
type Upsert = Extract<Change, { action: "upsert" }>;
type ResourceRow = Upsert & { key: string; kind: "resource" };
export type PendingCommand = {
    key: string;
    kind: "pending";
    input: PanelInput;
    order: number;
    status: "pending" | "acknowledged" | "unknown" | "blocked";
    visible: boolean;
    dependsOn: string[];
    request?: WebCommandRequest | undefined;
    acknowledgement?: { epoch: string; version: number } | undefined;
    issue?: unknown;
    reconciliation?: "same-epoch" | "epoch-changed";
};
type Cursor = { key: "cursor"; kind: "cursor"; epoch: string; version: number };
export type ApplicationRow = ResourceRow | PendingCommand | Cursor;
type Sync = Parameters<SyncConfig<ApplicationRow, string>["sync"]>[0];
export type CommandOutcome =
    | { status: "confirmed"; result: WebCommandResult }
    | { status: "rejected" | "unknown" | "unexecuted"; issue: unknown };

const resources = {
    host: "hosts",
    network: "networks",
    panel: "panels",
    terminal: "terminals",
    agent: "agents",
    cleanup: "cleanups",
    notification: "notifications",
} as const;
const resourceKey = (resource: Change["resource"], id: string) =>
    `${resource}:${id}`;

function isKnownUnexecuted(row: ApplicationRow | undefined) {
    return (
        row?.kind === "pending" &&
        typeof row.issue === "object" &&
        row.issue !== null &&
        "code" in row.issue &&
        row.issue.code === "sequence_gap"
    );
}

/** One sync transaction covers every resource AND the intent reconciliation. */
export class ApplicationStore {
    #reveals = new Set<
        (event: Extract<ApplicationEvent, { type: "reveal" }>) => void
    >();
    readonly subscribeReveal = (
        listener: (
            event: Extract<ApplicationEvent, { type: "reveal" }>,
        ) => void,
    ) => {
        this.#reveals.add(listener);
        return () => {
            this.#reveals.delete(listener);
        };
    };
    #sync!: Sync;
    #order = 0;
    #disposed = false;
    #running = new Set<AbortController>();
    readonly collection = createCollection<ApplicationRow, string>({
        getKey: (row) => row.key,
        startSync: true,
        gcTime: Infinity,
        sync: {
            rowUpdateMode: "full",
            sync: (sync) => {
                this.#sync = sync;
                sync.markReady();
            },
        },
    });

    readonly getView = () => applicationView(this.collection.toArray);

    #write(row: ApplicationRow) {
        this.#sync.write({
            type: this.collection.has(row.key) ? "update" : "insert",
            value: row,
        });
    }
    #batch(action: () => void) {
        if (this.#disposed) return;
        this.#sync.begin();
        action();
        this.#sync.commit();
    }
    #pending() {
        return this.collection.toArray.filter((row) => row.kind === "pending");
    }
    #blockDependents(key: string) {
        const blocked = new Set([key]);
        for (const pending of this.#pending().sort(
            (a, b) => a.order - b.order,
        )) {
            if (pending.dependsOn.some((id) => blocked.has(id))) {
                blocked.add(pending.key);
                this.#write({ ...pending, visible: false, status: "blocked" });
            }
        }
    }
    #remove(key: string) {
        this.#sync.write({ type: "delete", key });
    }

    readonly onEvent = (event: ApplicationEvent) => {
        if (this.#disposed) return;
        const cursor = this.collection.get("cursor") as Cursor | undefined;
        if (event.type === "reveal") {
            if (cursor?.epoch === event.epoch)
                for (const listener of this.#reveals) listener(event);
            return;
        }
        if (event.type === "sequence-failure") {
            const missing = new Set(event.failure.missing);
            const unexecuted = new Set(
                event.failure.unexecuted.map(
                    (item) => `${item.sequence}:${item.requestId}`,
                ),
            );
            this.#batch(() => {
                for (const pending of this.#pending()) {
                    const request = pending.request;
                    if (
                        request?.clientSessionId ===
                            event.failure.clientSessionId &&
                        (missing.has(request.sequence) ||
                            unexecuted.has(
                                `${request.sequence}:${request.requestId}`,
                            ))
                    ) {
                        this.#blockDependents(pending.key);
                        this.#write({
                            ...pending,
                            status: "blocked",
                            visible: false,
                            issue: event.failure,
                        });
                    }
                }
            });
            return;
        }
        if (
            event.type === "delta" &&
            (!cursor ||
                event.epoch !== cursor.epoch ||
                event.version <= cursor.version)
        )
            return;
        const epoch =
            event.type === "snapshot" ? event.snapshot.epoch : event.epoch;
        const removed = new Map<string, Set<string>>();
        if (event.type === "delta")
            for (const change of event.changes) {
                if (change.resource !== "panel") continue;
                const removedIds = new Set<string>();
                removed.set(change.id, removedIds);
                if (change.action === "remove") removedIds.add(change.id);
                const before = this.collection.get(
                    resourceKey("panel", change.id),
                );
                if (before?.kind !== "resource" || before.resource !== "panel")
                    continue;
                const ids = (panel: typeof before.value) => [
                    ...panel.tabs.map((tab) => tab.id),
                    ...panelLayoutReferences(panel.layout).panes.map(
                        (pane) => pane.id,
                    ),
                    ...panelLayoutReferences(panel.layout).splits.map(
                        (split) => split.id,
                    ),
                ];
                const after = new Set(
                    change.action === "upsert" ? ids(change.value) : [],
                );
                for (const id of ids(before.value))
                    if (!after.has(id)) removedIds.add(id);
            }
        this.#batch(() => {
            if (event.type === "snapshot") {
                const incoming: ResourceRow[] = [];
                for (const resource of Object.keys(
                    resources,
                ) as (keyof typeof resources)[]) {
                    for (const value of event.snapshot[resources[resource]]) {
                        const id =
                            "agentId" in value ? value.agentId : value.id;
                        incoming.push({
                            key: resourceKey(resource, id),
                            kind: "resource",
                            resource,
                            action: "upsert",
                            id,
                            value,
                        } as ResourceRow);
                    }
                }
                const keys = new Set(incoming.map((row) => row.key));
                for (const row of this.collection.toArray)
                    if (row.kind === "resource" && !keys.has(row.key))
                        this.#remove(row.key);
                for (const row of incoming) this.#write(row);
            } else {
                for (const change of event.changes) {
                    const key = resourceKey(change.resource, change.id);
                    if (change.action === "remove") {
                        if (this.collection.has(key)) this.#remove(key);
                    } else this.#write({ ...change, key, kind: "resource" });
                }
            }
            this.#write({
                key: "cursor",
                kind: "cursor",
                epoch,
                version: event.version,
            });
            const covered = new Map<string, number>();
            for (const row of this.#pending()) {
                if (
                    row.request &&
                    row.acknowledgement?.epoch === epoch &&
                    row.acknowledgement.version <= event.version
                )
                    covered.set(
                        row.request.clientSessionId,
                        Math.max(
                            covered.get(row.request.clientSessionId) ?? 0,
                            row.request.sequence,
                        ),
                    );
            }
            for (const pending of this.#pending()) {
                const ack = pending.acknowledgement;
                if (
                    (ack &&
                        ((ack.epoch === epoch &&
                            ack.version <= event.version) ||
                            (event.type === "snapshot" &&
                                ack.epoch !== epoch))) ||
                    (event.type === "snapshot" &&
                        pending.status === "acknowledged" &&
                        !ack)
                )
                    this.#remove(pending.key);
                else if (
                    pending.request &&
                    pending.request.sequence <
                        (covered.get(pending.request.clientSessionId) ?? 0)
                )
                    this.#write({ ...pending, visible: false });
                else if (event.type === "snapshot")
                    this.#write({
                        ...pending,
                        visible: false,
                        status: isKnownUnexecuted(pending)
                            ? "blocked"
                            : ack
                              ? "acknowledged"
                              : "unknown",
                        reconciliation:
                            cursor && cursor.epoch !== epoch
                                ? "epoch-changed"
                                : "same-epoch",
                    });
                else if (
                    [
                        ...referencedIds(pending.input),
                        ...createdIds(pending.input),
                    ].some((id) => removed.get(pending.input.panelId)?.has(id))
                )
                    this.#write({
                        ...pending,
                        visible: false,
                        status: "blocked",
                    });
            }
        });
    };

    /** Starts exactly one existing RPC command. Retry explicitly preserves its identity. */
    panelCommand(connection: ApplicationConnection, input: PanelInput) {
        if (this.#disposed) throw new Error("Application store is disposed.");
        const validated = Schema.decodeUnknownSync(webCommandRequestSchema)({
            ...input,
            clientSessionId: crypto.randomUUID(),
            requestId: crypto.randomUUID(),
            sequence: 1,
        });
        input = { panelId: validated.panelId, changes: validated.changes };
        const key = `pending:${crypto.randomUUID()}`;
        const command = connection.panelCommand(input, (request) => {
            const row = this.collection.get(key);
            if (row?.kind === "pending")
                this.#batch(() => this.#write({ ...row, request }));
        });
        const refs = new Set(referencedIds(input));
        const pending: PendingCommand = {
            key,
            kind: "pending",
            input,
            order: ++this.#order,
            status: "pending",
            visible: true,
            dependsOn: this.#pending()
                .filter(
                    (row) => row.visible && row.input.panelId === input.panelId,
                )
                .filter((row) =>
                    createdIds(row.input).some((id) => refs.has(id)),
                )
                .map((row) => row.key),
        };
        this.#batch(() => this.#write(pending));
        let running: Promise<CommandOutcome> | undefined;
        let settled: CommandOutcome | undefined;
        const execute = (): Promise<CommandOutcome> => {
            if (running) return running;
            if (settled && settled.status !== "unknown")
                return Promise.resolve(settled);
            if (this.#disposed)
                return Promise.resolve({
                    status: "unknown",
                    issue: "disposed",
                });
            const controller = new AbortController();
            this.#running.add(controller);
            const result = Effect.runPromiseExit(command.execute, {
                signal: controller.signal,
            });
            running = result
                .then((exit): CommandOutcome => {
                    if (Exit.isSuccess(exit)) {
                        const answer = exit.value;
                        const row = this.collection.get(key);
                        const cursor = this.collection.get("cursor") as
                            | Cursor
                            | undefined;
                        if (row?.kind === "pending")
                            this.#batch(() => {
                                if (
                                    (answer.state &&
                                        cursor &&
                                        (cursor.epoch !== answer.state.epoch ||
                                            cursor.version >=
                                                answer.state.version)) ||
                                    (answer.state === null &&
                                        row.reconciliation !== undefined)
                                ) {
                                    this.#remove(key);
                                    // Ordered processing covers earlier intents, not their individual outcomes.
                                    const request = command.request;
                                    if (request)
                                        for (const earlier of this.#pending()) {
                                            if (
                                                earlier.request
                                                    ?.clientSessionId ===
                                                    request.clientSessionId &&
                                                earlier.request.sequence <
                                                    request.sequence
                                            )
                                                this.#write({
                                                    ...earlier,
                                                    visible: false,
                                                });
                                        }
                                } else
                                    this.#write({
                                        ...row,
                                        status: "acknowledged",
                                        acknowledgement: answer.state
                                            ? {
                                                  epoch: answer.state.epoch,
                                                  version: answer.state.version,
                                              }
                                            : undefined,
                                    });
                            });
                        return { status: "confirmed", result: answer.result };
                    }
                    const issue = Cause.squash(exit.cause);
                    const code =
                        typeof issue === "object" &&
                        issue !== null &&
                        "code" in issue
                            ? issue.code
                            : undefined;
                    const row = this.collection.get(key);
                    const status =
                        !command.request ||
                        code === "sequence_gap" ||
                        isKnownUnexecuted(row)
                            ? "unexecuted"
                            : typeof code === "string" &&
                                ![
                                    "result_expired",
                                    "session_expired",
                                    "request_finalized",
                                    "execution_failed",
                                ].includes(code)
                              ? "rejected"
                              : "unknown";
                    if (row?.kind === "pending")
                        this.#batch(() => {
                            if (status !== "unknown")
                                this.#blockDependents(key);
                            if (status === "unknown")
                                this.#write({
                                    ...row,
                                    status,
                                    visible: false,
                                    issue,
                                });
                            else this.#remove(key);
                        });
                    return { status, issue };
                })
                .finally(() => {
                    this.#running.delete(controller);
                    running = undefined;
                });
            void running.then((outcome) => {
                settled = outcome;
            });
            return running;
        };
        return {
            id: key,
            get request() {
                return command.request;
            },
            result: execute(),
            retry: execute,
        };
    }

    /** Discard the displayed uncertainty; does not claim success or retry the request. */
    dismissUnknown(id: string) {
        const row = this.collection.get(id);
        if (row?.kind === "pending" && row.status === "unknown")
            this.#batch(() => this.#remove(id));
    }
    async dispose() {
        this.#disposed = true;
        this.#reveals.clear();
        for (const controller of this.#running) controller.abort();
        await this.collection.cleanup();
    }
}

export function applicationView(rows: ApplicationRow[]) {
    const cursor = rows.find((row): row is Cursor => row.kind === "cursor");
    const state: Snapshot = {
        epoch: cursor?.epoch ?? "",
        hosts: [],
        networks: [],
        panels: [],
        terminals: [],
        agents: [],
        cleanups: [],
        notifications: [],
    };
    for (const row of rows)
        if (row.kind === "resource") {
            // The discriminator preserves the wire resource/value pairing; no second state owner.
            (state[resources[row.resource]] as Upsert["value"][]).push(
                row.value,
            );
        }
    const pending = rows
        .filter((row): row is PendingCommand => row.kind === "pending")
        .sort((a, b) => a.order - b.order);
    const blocked = new Set<string>();
    for (const operation of pending) {
        if (!operation.visible) {
            if (operation.status === "blocked") blocked.add(operation.key);
            continue;
        }
        if (operation.dependsOn.some((id) => blocked.has(id))) {
            blocked.add(operation.key);
            continue;
        }
        const index = state.panels.findIndex(
            (panel) => panel.id === operation.input.panelId,
        );
        try {
            const panel = projectPanel(state.panels[index], operation.input);
            if (index >= 0)
                state.panels.splice(index, 1, ...(panel ? [panel] : []));
            else if (panel) state.panels.push(panel);
        } catch {
            // Concurrent deletion invalidated this projection; only the RPC decides its outcome.
            blocked.add(operation.key);
        }
    }
    return { ...state, ready: !!cursor, version: cursor?.version, pending };
}
