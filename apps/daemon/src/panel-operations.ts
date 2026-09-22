import { createHash, randomUUID } from "node:crypto";

import { resolveTerminalLaunch, loadConfig } from "@aiox/config";
import {
    createPanelShellRequestSchema,
    closePanelTabRequestSchema,
    deletePanelRequestSchema,
    panelLayoutReferences,
    type PanelLayout,
    type PanelView,
    type Operation,
    type OperationError,
} from "@aiox/protocol";
import type { Context } from "hono";

import type { HttpEnv } from "./http";
import { HttpError, parse, readJson } from "./http";
import type { DaemonServices } from "./services";

function mapPanes(
    layout: PanelLayout,
    change: (pane: Extract<PanelLayout, { type: "pane" }>) => PanelLayout,
): PanelLayout {
    return layout.type === "pane"
        ? change(layout)
        : {
              ...layout,
              children: layout.children.map((node) => mapPanes(node, change)),
          };
}
export async function handlePanelOperation(
    c: Context<HttpEnv>,
    services: DaemonServices,
    create: boolean,
): Promise<Response> {
    const panelId = c.req.param("panelId")!,
        tabId = c.req.param("tabId");
    const raw = await readJson(c.req.raw);
    const input = create
        ? parse(createPanelShellRequestSchema, raw)
        : tabId === undefined
          ? parse(deletePanelRequestSchema, raw)
          : parse(closePanelTabRequestSchema, raw);
    const hash = createHash("sha256")
        .update(JSON.stringify([c.req.method, c.req.path, input]))
        .digest("hex");
    const previous = await services.db.hostState.getOperation(
        input.requestId,
        hash,
    );
    if (previous) {
        return c.json(previous, 202);
    }
    if (!services.lifecycle.acceptingInput())
        throw new HttpError(503, "stopping", "Daemon is stopping.");
    const state = await services.db.hostState.snapshot();
    const panel = state.panels.find((p) => p.id === panelId);
    if (!panel) throw new HttpError(404, "unknown_panel", "No such panel.");
    if (panel.revision !== input.revision)
        throw new HttpError(
            409,
            "revision_conflict",
            "Panel changed; reload before retrying.",
        );
    if (!create && tabId === undefined && panel.kind !== "workspace")
        throw new HttpError(
            400,
            "invalid_request",
            "Only workspace panels can be deleted here.",
        );
    const tab =
        tabId === undefined
            ? undefined
            : panel.tabs.find((t) => t.id === tabId);
    if (tabId !== undefined && !tab)
        throw new HttpError(404, "unknown_tab", "No such tab.");
    const runtime = tab?.terminalId
        ? services.runtimes.list().find((r) => r.terminalId === tab.terminalId)
        : undefined;
    if (
        "expectedRuntimeId" in input &&
        input.expectedRuntimeId !== (runtime?.id ?? null)
    )
        throw new HttpError(
            409,
            "runtime_conflict",
            "The execution in this tab changed.",
        );
    if (
        "confirm" in input &&
        !input.confirm &&
        (runtime || tab?.presentation === "shell")
    )
        throw new HttpError(
            409,
            "confirmation_required",
            "Confirm termination of this shell and its work.",
        );
    let launch: Awaited<ReturnType<typeof resolveTerminalLaunch>> | undefined;
    if ("paneId" in input) {
        if (
            !panelLayoutReferences(panel.layout).panes.some(
                (p) => p.id === input.paneId,
            )
        )
            throw new HttpError(404, "unknown_pane", "No such pane.");
        const host =
            panel.hostId === null
                ? undefined
                : state.hosts.find((h) => h.id === panel.hostId);
        const config = await loadConfig(services.configLocation);
        launch = await resolveTerminalLaunch(
            config.terminal,
            host === undefined ? {} : { cwd: host.directory },
        ).catch((error) => {
            throw new HttpError(
                400,
                "invalid_environment",
                error instanceof Error ? error.message : String(error),
                { stage: "environment" },
            );
        });
    }
    const initial: Operation = {
        id: randomUUID(),
        requestId: input.requestId,
        kind: create
            ? "panel.shell.create"
            : tab
              ? "panel.tab.close"
              : "panel.delete",
        hostId: panel.hostId,
        panelId,
        state: "running",
        targets: (create ? [null] : tab ? [tab] : panel.tabs).map((t) => ({
            agentKey: t?.agentKey ?? null,
            terminalId: t?.terminalId ?? null,
            state: "pending",
            error: null,
        })),
        error: null,
        cleanupErrors: [],
        createdAt: Date.now(),
        finishedAt: null,
    };
    const accepted = await services.db.hostState.saveOperation(initial, hash);
    services.webEvents.notify();
    c.res = c.json(accepted, 202);
    if (accepted.id !== initial.id) return c.res;
    // Admission is durable before execution; failures remain queryable after the HTTP reply.
    const task = new Promise<void>((resolve) => setImmediate(resolve)).then(
        execute,
    );
    services.operationTasks.add(task);
    void task.finally(() => services.operationTasks.delete(task));
    async function execute() {
        const operation = initial;
        let createdTerminal: string | undefined;
        let stage: OperationError["stage"] = "execution";
        const finishUpdate = create
            ? services.webEvents.beginUpdate()
            : undefined;
        const persist = async () => {
            await services.db.hostState.saveOperation(operation, hash);
            services.webEvents.notify();
        };
        try {
            const current = (
                await services.db.hostState.snapshot()
            ).panels.find((p) => p.id === panelId);
            if (!current || current.revision !== input.revision)
                throw new HttpError(
                    409,
                    "revision_conflict",
                    "Panel changed before execution.",
                );
            if ("paneId" in input) {
                const terminal = await services.lifecycle.createShell({
                    cwd: launch!.cwd,
                    ...(input.cols === undefined ? {} : { cols: input.cols }),
                    ...(input.rows === undefined ? {} : { rows: input.rows }),
                });
                createdTerminal = terminal.id;
                if (!terminal.alive)
                    throw new Error("Shell exited during creation.");
                const newTabId = randomUUID();
                let activePaneId = input.paneId;
                const layout = mapPanes(current.layout, (pane) => {
                    if (pane.id !== input.paneId) return pane;
                    if (!input.split)
                        return {
                            ...pane,
                            tabIds: [...pane.tabIds, newTabId],
                            selectedTabId: newTabId,
                        };
                    activePaneId = randomUUID();
                    return {
                        type: "split",
                        axis: input.split === "right" ? "x" : "y",
                        weights: [0.5, 0.5],
                        children: [
                            pane,
                            {
                                type: "pane",
                                id: activePaneId,
                                tabIds: [newTabId],
                                selectedTabId: newTabId,
                            },
                        ],
                    };
                });
                const next: PanelView = {
                    ...current,
                    revision: current.revision + 1,
                    layout,
                    activePaneId,
                    tabs: [
                        ...current.tabs,
                        {
                            id: newTabId,
                            terminalId: terminal.id,
                            agentKey: null,
                            runtimeId: null,
                            label: "Shell",
                            presentation: "shell",
                            notice: null,
                        },
                    ],
                };
                stage = "storage";
                await services.db.hostState.updatePanel(next, current.revision);
                operation.targets = [
                    {
                        agentKey: null,
                        terminalId: terminal.id,
                        state: "ready",
                        error: null,
                    },
                ];
            } else {
                if ("expectedRuntimeId" in input) {
                    const latestRuntime = services.runtimes
                        .list()
                        .find((r) => r.terminalId === tab?.terminalId);
                    if (input.expectedRuntimeId !== (latestRuntime?.id ?? null))
                        throw new HttpError(
                            409,
                            "runtime_conflict",
                            "The execution in this tab changed.",
                        );
                }
                for (const target of operation.targets) {
                    target.state = "stopping";
                    await persist();
                    if (target.terminalId) {
                        if (
                            "expectedRuntimeId" in input &&
                            input.expectedRuntimeId !==
                                (services.runtimes
                                    .list()
                                    .find(
                                        (r) =>
                                            r.terminalId === target.terminalId,
                                    )?.id ?? null)
                        )
                            throw new HttpError(
                                409,
                                "runtime_conflict",
                                "Execution changed before termination.",
                            );
                        await services.lifecycle.stopTerminal(
                            target.terminalId,
                        );
                        if (services.terminals.view(target.terminalId)?.alive)
                            throw new Error(
                                "Shell termination is not confirmed.",
                            );
                    }
                    target.state = "stopped";
                    await persist();
                }
                stage = "storage";
                const latest = (
                    await services.db.hostState.snapshot()
                ).panels.find((p) => p.id === panelId);
                if (!latest)
                    throw new HttpError(
                        404,
                        "unknown_panel",
                        "Panel disappeared during termination.",
                    );
                if (tab && latest.tabs.some((t) => t.id === tab.id)) {
                    const layout = mapPanes(latest.layout, (pane) => {
                        const tabIds = pane.tabIds.filter(
                            (id) => id !== tab.id,
                        );
                        return {
                            ...pane,
                            tabIds,
                            selectedTabId:
                                pane.selectedTabId === tab.id
                                    ? (tabIds[0] ?? null)
                                    : pane.selectedTabId,
                        };
                    });
                    await services.db.hostState.updatePanel(
                        {
                            ...latest,
                            revision: latest.revision + 1,
                            layout,
                            tabs: latest.tabs.filter((t) => t.id !== tab.id),
                        },
                        latest.revision,
                    );
                } else if (!tab) {
                    if (latest.tabs.length)
                        throw new HttpError(
                            409,
                            "revision_conflict",
                            "Panel gained tabs during termination.",
                        );
                    await services.db.hostState.deletePanel(
                        panelId,
                        latest.revision,
                    );
                }
            }
            operation.state = "succeeded";
            operation.finishedAt = Date.now();
            await persist();
        } catch (error) {
            const failure: OperationError = {
                code:
                    error instanceof HttpError
                        ? error.code
                        : stage === "storage"
                          ? "storage_error"
                          : "execution_failed",
                message: error instanceof Error ? error.message : String(error),
                stage,
            };
            if (createdTerminal && operation.targets[0]?.state !== "ready") {
                try {
                    await services.lifecycle.stopTerminal(createdTerminal);
                } catch (cleanup) {
                    operation.cleanupErrors.push({
                        code: "cleanup_failed",
                        message:
                            cleanup instanceof Error
                                ? cleanup.message
                                : String(cleanup),
                        stage: "cleanup",
                    });
                }
            }
            if (
                !create &&
                operation.targets.some((t) => t.state === "stopping")
            )
                operation.cleanupErrors.push({ ...failure, stage: "cleanup" });
            operation.state = "failed";
            operation.error = failure;
            operation.finishedAt = Date.now();
            operation.targets = operation.targets.map((t) =>
                ["ready", "stopped"].includes(t.state)
                    ? t
                    : { ...t, state: "failed", error: failure },
            );
            try {
                await persist();
            } catch (storage) {
                services.webEvents.fault(
                    "storage_error",
                    storage instanceof Error
                        ? storage.message
                        : String(storage),
                );
            }
        } finally {
            finishUpdate?.();
        }
    }
    return c.res;
}
