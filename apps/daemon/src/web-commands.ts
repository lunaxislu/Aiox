import { createHash } from "node:crypto";

import {
    loadConfig,
    resolveTerminalLaunch,
    type TerminalLaunch,
} from "@aiox/config";
import { logger } from "@aiox/diagnostics";
import { HostStateError, type PanelContext } from "@aiox/persistence";
import {
    insertPanelTab,
    movePanelTab,
    removePanelTabs,
    resizePanelSplit,
    webCommandRequestSchema,
    type CleanupView,
    type ApplicationDelta,
    type PanelChange,
    type PanelView,
    type TabView,
    type WebCommandRequest,
    type WebCommandResult,
} from "@aiox/protocol";
import { Effect, Result } from "effect";

import { HttpError, parse, readJson } from "./http";
import type { Context } from "./http-endpoint";
import type { DaemonServices } from "./services";
import { projectPanel } from "./web-state";

type Shell = {
    tabId: string;
    launch: TerminalLaunch;
    cols?: number;
    rows?: number;
};
type Stop = {
    terminalId: string;
    tabId: string;
    reason: CleanupView["reason"];
};

const gone = (error: unknown) =>
    error instanceof HostStateError &&
    (error.code === "unknown_panel" || error.code === "id_deleted");

/** `POST /api/web/commands`: ordered registration and placement changes of one panel. */
export async function handleWebCommand(
    c: Context,
    services: DaemonServices,
): Promise<Response> {
    const input = parse(webCommandRequestSchema, await readJson(c.req.raw));
    if (!services.lifecycle.acceptingInput())
        throw new HttpError(503, "stopping", "Daemon is stopping.");
    const hash = createHash("sha256")
        .update(JSON.stringify(input))
        .digest("hex");
    const settled = await services.sequencer.submit(
        input.clientSessionId,
        { sequence: input.sequence, requestId: input.requestId, hash },
        () => applyWebCommand(services, input),
    );
    if (!settled.ok) throw settled.error;
    const { state: _state, ...result } = settled.value;
    return c.json(result, 200);
}

/**
 * Commits every change of the command in one transaction, then starts the
 * process work it implies. Success means the registration and placement are
 * stored; shell preparation and process termination report through state.
 */
export async function applyWebCommand(
    services: DaemonServices,
    input: WebCommandRequest,
): Promise<WebCommandResult & { state: ApplicationDelta | undefined }> {
    const shells: Shell[] = [];
    const stops: Stop[] = [];
    const launches = new Map<PanelChange, TerminalLaunch>();
    for (const change of input.changes) {
        if (change.type !== "tab.create" && change.type !== "panel.create")
            continue;
        const source = change.source;
        if (source) {
            if (
                change.type === "tab.create" &&
                source.panelId !== input.panelId
            )
                throw new HttpError(
                    409,
                    "source_terminal_conflict",
                    "Source terminal belongs to another panel.",
                );
            const panel = await services.db.hostState.getPanel(source.panelId);
            if (
                !panel?.tabs.some((tab) => tab.terminalId === source.terminalId)
            )
                throw new HttpError(
                    409,
                    "source_terminal_conflict",
                    "Source terminal is no longer in its panel.",
                );
        }
        const cwd = source
            ? await services.terminals.refreshCwd(source.terminalId)
            : undefined;
        if (source && cwd === undefined)
            throw new HttpError(
                409,
                "source_terminal_conflict",
                "Source terminal is no longer available.",
            );
        launches.set(change, await shellLaunch(services, input.panelId, cwd));
    }
    const committed = await services.db.hostState.applyPanel(
        input.panelId,
        (current, context) =>
            Effect.gen(function* () {
                let panel = current ?? null;
                for (const change of input.changes) {
                    panel = yield* applyChange(
                        services,
                        input.panelId,
                        panel,
                        change,
                        {
                            context,
                            shells,
                            stops,
                            launches,
                        },
                    );
                }
                return panel;
            }),
    );
    const state = await services.appState.update({ panel: input.panelId });
    for (const stop of stops)
        void services.cleanups.track({
            terminalId: stop.terminalId,
            panelId: input.panelId,
            tabId: stop.tabId,
            reason: stop.reason,
        });
    for (const shell of shells)
        void services.tasks.run(
            prepareShell(services, input.panelId, shell, shell.launch),
        );
    return {
        requestId: input.requestId,
        sequence: input.sequence,
        state,
        panel:
            committed &&
            projectPanel(
                committed,
                services.runtimes,
                committed.hostId === null
                    ? undefined
                    : services.appState.view("host", committed.hostId),
            ),
    };
}

async function shellLaunch(
    services: DaemonServices,
    panelId: string,
    inheritedCwd?: string,
): Promise<TerminalLaunch> {
    const stored = await services.db.hostState.getPanel(panelId);
    const host =
        stored?.hostId == null
            ? undefined
            : await services.db.hostState.getHost(stored.hostId);
    const config = await loadConfig(services.configLocation);
    return resolveTerminalLaunch(
        config.terminal,
        inheritedCwd === undefined
            ? host === undefined
                ? {}
                : { cwd: host.directory }
            : { cwd: inheritedCwd },
    ).catch((error: unknown) => {
        throw new HttpError(
            400,
            "invalid_environment",
            error instanceof Error ? error.message : String(error),
            { stage: "environment" },
        );
    });
}

function preparingTab(id: string): TabView {
    return {
        id,
        terminalId: null,
        agentKey: null,
        runtimeId: null,
        label: "Shell",
        presentation: "preparing",
        notice: null,
    };
}

function missingPanel(id: string, context: PanelContext) {
    return Effect.gen(function* () {
        const deleted = yield* context.deleted(id);
        return new HttpError(
            deleted ? 409 : 404,
            deleted ? "id_deleted" : "unknown_panel",
            "No such panel.",
        );
    });
}

function findTab(panel: PanelView, tabId: string, context: PanelContext) {
    return Effect.gen(function* () {
        const tab = panel.tabs.find((t) => t.id === tabId);
        if (!tab) {
            const deleted = yield* context.deleted(tabId);
            throw deleted
                ? new HttpError(409, "id_deleted", "The tab was closed.")
                : new HttpError(404, "unknown_tab", "No such tab.");
        }
        return tab;
    });
}

/** One change against the panel as the previous changes of the same command left it. */
function applyChange(
    services: DaemonServices,
    panelId: string,
    panel: PanelView | null,
    change: PanelChange,
    effects: {
        context: PanelContext;
        shells: Shell[];
        stops: Stop[];
        launches: Map<PanelChange, TerminalLaunch>;
    },
): Effect.Effect<PanelView | null, any> {
    return Effect.gen(function* () {
        const { context } = effects;
        const size = (c: {
            cols?: number | undefined;
            rows?: number | undefined;
        }) => ({
            ...(c.cols === undefined ? {} : { cols: c.cols }),
            ...(c.rows === undefined ? {} : { rows: c.rows }),
        });
        const freeTab = (tabId: string) =>
            Effect.gen(function* () {
                if (yield* context.deleted(tabId))
                    throw new HttpError(
                        409,
                        "id_deleted",
                        "The tab was closed.",
                    );
                if (
                    (yield* context.tabTaken(tabId)) ||
                    panel?.tabs.some((t) => t.id === tabId)
                )
                    throw new HttpError(
                        409,
                        "id_conflict",
                        "Tab ID is in use.",
                    );
            });
        if (change.type === "panel.create") {
            if (yield* context.deleted(panelId))
                throw new HttpError(
                    409,
                    "id_deleted",
                    "The panel was deleted.",
                );
            if (panel)
                throw new HttpError(409, "id_conflict", "Panel ID is in use.");
            yield* freeTab(change.tabId);
            effects.shells.push({
                tabId: change.tabId,
                launch: effects.launches.get(change)!,
                ...size(change),
            });
            return {
                id: panelId,
                kind: "workspace",
                section: change.section ?? "workspaces",
                name: change.name,
                hostId: null,
                networkId: null,
                revision: 1,
                layout: {
                    type: "pane",
                    id: change.paneId,
                    tabIds: [change.tabId],
                },
                tabs: [preparingTab(change.tabId)],
            };
        }
        if (!panel) throw yield* missingPanel(panelId, context);
        switch (change.type) {
            case "panel.rename":
                if (panel.kind !== "workspace")
                    throw new HttpError(
                        400,
                        "invalid_request",
                        "Only workspace panels can be renamed.",
                    );
                return { ...panel, name: change.name };
            case "panel.delete":
                if (panel.kind !== "workspace")
                    throw new HttpError(
                        400,
                        "invalid_request",
                        "Only workspace panels can be deleted here.",
                    );
                for (const tab of panel.tabs)
                    if (tab.terminalId)
                        effects.stops.push({
                            terminalId: tab.terminalId,
                            tabId: tab.id,
                            reason: "panel-deleted",
                        });
                return null;
            case "tab.create":
                yield* freeTab(change.tabId);
                if (
                    change.source &&
                    !panel.tabs.some(
                        (tab) => tab.terminalId === change.source!.terminalId,
                    )
                )
                    throw new HttpError(
                        409,
                        "source_terminal_conflict",
                        "Source terminal is no longer in this panel.",
                    );
                effects.shells.push({
                    tabId: change.tabId,
                    launch: effects.launches.get(change)!,
                    ...size(change),
                });
                return {
                    ...panel,
                    ...insertPanelTab(panel, change.tabId, change.target),
                    tabs: [...panel.tabs, preparingTab(change.tabId)],
                };
            case "tab.move":
                yield* findTab(panel, change.tabId, context);
                return {
                    ...panel,
                    ...movePanelTab(panel, change.tabId, change.target),
                };
            case "tab.close": {
                const tab = yield* findTab(panel, change.tabId, context);
                const runtime = tab.terminalId
                    ? services.runtimes
                          .list()
                          .find((r) => r.terminalId === tab.terminalId)
                    : undefined;
                if (change.expectedRuntimeId !== (runtime?.id ?? null))
                    throw new HttpError(
                        409,
                        "runtime_conflict",
                        "The execution in this tab changed.",
                    );
                if (
                    !change.confirm &&
                    (runtime || tab.presentation === "shell")
                )
                    throw new HttpError(
                        409,
                        "confirmation_required",
                        "Confirm termination of this shell and its work.",
                    );
                if (
                    panel.hostId !== null &&
                    tab.agentKey !== null &&
                    services.hostCommands.busy(panel.hostId, tab.agentKey)
                )
                    throw new HttpError(
                        409,
                        "host_busy",
                        "Host work is changing this Agent.",
                    );
                if (tab.terminalId)
                    effects.stops.push({
                        terminalId: tab.terminalId,
                        tabId: tab.id,
                        reason: "tab-closed",
                    });
                return {
                    ...panel,
                    ...removePanelTabs(panel, new Set([tab.id])),
                    tabs: panel.tabs.filter((t) => t.id !== tab.id),
                };
            }
            case "tab.dismiss": {
                const tab = yield* findTab(panel, change.tabId, context);
                if (
                    !tab.terminalId ||
                    !services.terminals.view(tab.terminalId)?.alive ||
                    !tab.notice ||
                    !["stopped", "start-failed", "crashed"].includes(
                        tab.presentation,
                    )
                )
                    throw new HttpError(
                        409,
                        "tab_state_conflict",
                        "This tab cannot return to a live shell.",
                    );
                return {
                    ...panel,
                    tabs: panel.tabs.map((t) =>
                        t.id === tab.id
                            ? {
                                  ...t,
                                  agentKey: null,
                                  runtimeId: null,
                                  presentation: "shell" as const,
                                  notice: null,
                              }
                            : t,
                    ),
                };
            }
            case "split.resize":
                return {
                    ...panel,
                    layout: resizePanelSplit(
                        panel.layout,
                        change.splitId,
                        change.children,
                        change.weights,
                    ),
                };
        }
    });
}

/**
 * Daemon-owned shell preparation for a registered tab. The shell joins the tab
 * only if, in the joining transaction, the tab still waits for it; the tab
 * keeps wherever the user moved it. Otherwise the process is stopped.
 */
export function prepareShell(
    services: DaemonServices,
    panelId: string,
    shell: Shell,
    launch: TerminalLaunch,
): Effect.Effect<void> {
    return Effect.gen(function* () {
        const createdResult = yield* Effect.result(
            Effect.tryPromise({
                try: () =>
                    services.lifecycle.createShell(
                        {
                            ...(shell.cols === undefined
                                ? {}
                                : { cols: shell.cols }),
                            ...(shell.rows === undefined
                                ? {}
                                : { rows: shell.rows }),
                        },
                        launch,
                    ),
                catch: (error) => error,
            }),
        );
        if (Result.isFailure(createdResult) || !createdResult.success.alive) {
            const error = Result.isFailure(createdResult)
                ? createdResult.failure
                : new Error("Shell exited during creation.");
            yield* Effect.promise(() =>
                failTab(services, panelId, shell.tabId, error),
            );
            return;
        }
        const terminalId = createdResult.success.id;
        let joined = false;
        const join = Effect.tryPromise({
            catch: (error) => error,
            try: () =>
                services.db.hostState.mutatePanel(panelId, (p) => {
                    const tab = p.tabs.find((t) => t.id === shell.tabId);
                    if (
                        !tab ||
                        tab.terminalId !== null ||
                        tab.presentation !== "preparing"
                    )
                        return p;
                    joined = true;
                    return {
                        ...p,
                        tabs: p.tabs.map((t) =>
                            t.id === shell.tabId
                                ? {
                                      ...t,
                                      terminalId,
                                      presentation: "shell" as const,
                                  }
                                : t,
                        ),
                    };
                }),
        });
        const joinResult = yield* Effect.result(join);
        if (Result.isFailure(joinResult) && !gone(joinResult.failure)) {
            // The process exists but no tab records it: keep tracking it until it is stopped.
            logger.error(
                {
                    err: joinResult.failure,
                    panelId,
                    tabId: shell.tabId,
                    terminalId,
                },
                "Shell could not join its tab",
            );
            yield* Effect.promise(() =>
                services.cleanups.track({
                    terminalId,
                    panelId,
                    tabId: shell.tabId,
                    reason: "shell-unjoined",
                }),
            );
            yield* Effect.promise(() =>
                failTab(services, panelId, shell.tabId, joinResult.failure),
            );
            return;
        }
        if (joined) {
            yield* Effect.promise(() =>
                services.appState.update({ panel: panelId }),
            );
            return;
        }
        // The tab or panel was closed while the shell was being prepared.
        yield* Effect.promise(() =>
            services.cleanups.track({
                terminalId,
                panelId,
                tabId: shell.tabId,
                reason: "shell-cancelled",
            }),
        );
    });
}

/** The tab stays with the failure and its cause; the registration is not undone. */
async function failTab(
    services: DaemonServices,
    panelId: string,
    tabId: string,
    error: unknown,
): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    try {
        await services.db.hostState.mutatePanel(panelId, (p) => ({
            ...p,
            tabs: p.tabs.map((t) =>
                t.id === tabId &&
                t.terminalId === null &&
                t.presentation === "preparing"
                    ? {
                          ...t,
                          presentation: "start-failed" as const,
                          notice: {
                              message,
                              reason: "start-failed",
                              restartCommand: "",
                          },
                      }
                    : t,
            ),
        }));
        await services.appState.update({ panel: panelId });
    } catch (storage) {
        if (!gone(storage))
            logger.error(
                { err: storage, panelId, tabId, cause: message },
                "Shell failure could not be stored",
            );
    }
}
