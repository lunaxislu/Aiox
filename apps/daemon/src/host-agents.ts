import { createHash, randomUUID } from "node:crypto";
import { access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
    loadConfig,
    prepareHostInput,
    resolveTerminalLaunch,
} from "@aiox/config";
import { logger } from "@aiox/diagnostics";
import { RouteOperationError } from "@aiox/domain";
import {
    hostAgentStartRequestSchema,
    hostAgentStopRequestSchema,
    routeOperationSchema,
    panelLayoutReferences,
    type HostView,
    type PanelView,
    type PanelLayout,
    type Operation,
    type OperationError,
} from "@aiox/protocol";
import type { Context } from "hono";
import { z } from "zod";

import { launcher, launchCommand, waitForAgent } from "./host-run";
import type { HttpEnv } from "./http";
import { HttpError, parse, readJson } from "./http";
import { restartCommand } from "./managed-agents";
import type { DaemonServices } from "./services";
import { projectHostState } from "./web-state";

// Agent semantics follow config/YAML validation, just like run's layout semantics.
const startInput = hostAgentStartRequestSchema.extend({ agents: z.unknown() });
const keysInput = hostAgentStopRequestSchema.shape.agents;

/** Mutates only the chosen tab/pane; existing selection and pane order survive. */
export function placeAgent(
    panel: PanelView,
    key: string,
    index: number,
    callerTerminalId?: string,
): PanelView["tabs"][number] {
    const positions: {
        pane: Extract<PanelLayout, { type: "pane" }>;
        top: number;
        left: number;
    }[] = [];
    const walk = (
        node: PanelLayout,
        left: number,
        top: number,
        width: number,
        height: number,
    ): void => {
        if (node.type === "pane") {
            positions.push({ pane: node, top, left });
            return;
        }
        let offset = 0;
        node.children.forEach((child, index) => {
            const weight = node.weights[index]!;
            if (node.axis === "x")
                walk(child, left + width * offset, top, width * weight, height);
            else
                walk(
                    child,
                    left,
                    top + height * offset,
                    width,
                    height * weight,
                );
            offset += weight;
        });
    };
    walk(panel.layout, 0, 0, 1, 1);
    const panes = positions
        .sort((a, b) => a.top - b.top || a.left - b.left)
        .map((position) => position.pane);
    const caller = panel.tabs.find((t) => t.terminalId === callerTerminalId);
    const reusable = panel.tabs.find(
        (t) =>
            t.agentKey === key &&
            t.runtimeId === null &&
            t.presentation !== "shell" &&
            t.presentation !== "tui",
    );
    let tab = index === 0 && caller ? caller : !caller ? reusable : undefined;
    if (!tab) {
        tab = {
            id: randomUUID(),
            terminalId: null,
            agentKey: key,
            runtimeId: null,
            label: key,
            presentation: "preparing",
            notice: null,
        };
        panel.tabs.push(tab);
        const start = caller
            ? panes.findIndex((p) => p.tabIds.includes(caller.id))
            : 0;
        const pane = panes[(Math.max(0, start) + index) % panes.length]!;
        pane.tabIds.push(tab.id);
        pane.selectedTabId ??= tab.id;
    }
    Object.assign(tab, {
        agentKey: key,
        runtimeId: null,
        label: key,
        presentation: "preparing",
        notice: null,
    });
    return tab;
}

export async function handleHostAgents(
    c: Context<HttpEnv>,
    services: DaemonServices,
    action: "start" | "restart" | "stop",
): Promise<Response> {
    const start = action !== "stop";
    if (!start) await loadConfig(services.configLocation);
    const body = await readJson(c.req.raw);
    const input = start
        ? parse(startInput, body)
        : parse(hostAgentStopRequestSchema, body);
    const hash = createHash("sha256")
        .update(JSON.stringify([c.req.path, input]))
        .digest("hex");
    const previous = await services.db.hostState.getOperation(
        input.requestId,
        hash,
    );
    if (previous) {
        logger.info(
            {
                operationId: previous.id,
                operationRequestId: previous.requestId,
                requestId: c.get("requestId"),
                hostId: previous.hostId,
            },
            "Host operation accepted",
        );
        return c.json(previous, 202);
    }
    if (!services.lifecycle.acceptingInput())
        throw new HttpError(503, "shutting_down", "Daemon is stopping.");
    const prepared =
        "source" in input
            ? await prepareHostInput(input, services.configLocation)
            : undefined;
    const parsedKeys = keysInput.safeParse(input.agents);
    if (!parsedKeys.success)
        throw new HttpError(400, "invalid_request", parsedKeys.error.message, {
            stage: "cli",
        });
    const keys = parsedKeys.data;
    const state = projectHostState(
        await services.db.hostState.snapshot(),
        services,
    );
    const host = state.hosts.find((h) =>
        prepared
            ? h.name === prepared.manifest!.host.name
            : h.id === c.req.param("hostId"),
    );
    if (!host)
        throw new HttpError(
            404,
            "unknown_host",
            "No registered Host. Use 'aiox host run' first.",
            { stage: "cli" },
        );
    const network = state.networks.find((n) => n.id === host.networkId)!;
    if (
        prepared &&
        (network.name !== prepared.manifest!.network.name ||
            network.default !== prepared.manifest!.network.default)
    )
        throw new HttpError(
            409,
            "network_changed",
            "Network name/default changed. Use 'aiox host restart'.",
            { stage: "cli" },
        );
    for (const key of keys) {
        if (
            prepared
                ? !Object.hasOwn(prepared.manifest!.agents, key)
                : !host.agents.some((a) => a.key === key)
        )
            throw new HttpError(
                400,
                "unknown_agent",
                `Unknown Agent '${key}'.`,
                { stage: "cli" },
            );
        if (
            action === "restart" &&
            !services.runtimes
                .list()
                .some((r) => r.hostId === host.id && r.name === key)
        )
            throw new HttpError(
                409,
                "agent_not_running",
                `Agent '${key}' is not running. Use 'aiox host agent start'.`,
                { stage: "cli" },
            );
    }
    if (prepared) {
        const members = new Set(
            network.members.map((member) => member.agentKey),
        );
        for (const key of keys) {
            if (
                action === "start" &&
                services.runtimes
                    .list()
                    .some((r) => r.hostId === host.id && r.name === key)
            )
                continue;
            const missing = prepared.manifest!.network.routes.find(
                (route) =>
                    (route.from === key && !members.has(route.to)) ||
                    (route.to === key && !members.has(route.from)),
            );
            if (missing)
                throw new HttpError(
                    400,
                    "invalid_yaml",
                    `Cannot apply edge ${missing.from} -> ${missing.to}: the other endpoint is not an applied Host Network member. Use 'aiox host restart' to apply the entire YAML.`,
                    { stage: "yaml" },
                );
        }
    }
    let callerTerminalId: string | undefined;
    if ("terminalContext" in input && input.terminalContext) {
        try {
            callerTerminalId = services.terminals.authenticateContext(
                input.terminalContext,
            ).id;
        } catch {
            throw new HttpError(
                400,
                "invalid_terminal_context",
                "Invalid or expired terminal context.",
                { stage: "cli" },
            );
        }
    }
    const needsLaunch =
        !!prepared &&
        keys.some(
            (key) =>
                action === "restart" ||
                !services.runtimes
                    .list()
                    .some((r) => r.hostId === host.id && r.name === key),
        );
    const terminalLaunch =
        prepared && needsLaunch
            ? await resolveTerminalLaunch(prepared.config.terminal, {
                  cwd: host.directory,
              }).catch((error) => {
                  throw new HttpError(
                      400,
                      "invalid_environment",
                      error instanceof Error ? error.message : String(error),
                      { stage: "environment" },
                  );
              })
            : undefined;
    if (needsLaunch)
        await access(fileURLToPath(launcher)).catch((error) => {
            throw new HttpError(
                400,
                "invalid_environment",
                `Host CLI launcher is unavailable: ${String(error)}`,
                { stage: "environment" },
            );
        });
    const panel = state.panels.find((p) => p.id === host.panelId)!;
    if (!panel.tabs.some((t) => t.terminalId === callerTerminalId))
        callerTerminalId = undefined;
    if (
        needsLaunch &&
        callerTerminalId &&
        services.runtimes.list().some((r) => r.terminalId === callerTerminalId)
    )
        throw new HttpError(
            409,
            "terminal_busy",
            "The calling terminal already runs an Agent.",
            { stage: "cli" },
        );
    const operation: Operation = {
        id: randomUUID(),
        requestId: input.requestId,
        kind: `host.agent.${action}` as Operation["kind"],
        hostId: host.id,
        panelId: host.panelId,
        state: "running",
        targets: keys.map((agentKey) => ({
            agentKey,
            terminalId: null,
            state: "pending",
            error: null,
        })),
        error: null,
        cleanupErrors: [],
        createdAt: Date.now(),
        finishedAt: null,
    };
    const admitted = await services.db.hostState.saveOperation(operation, hash);
    if (admitted.id !== operation.id) {
        logger.info(
            {
                operationId: admitted.id,
                operationRequestId: admitted.requestId,
                requestId: c.get("requestId"),
                hostId: admitted.hostId,
            },
            "Host operation accepted",
        );
        return c.json(admitted, 202);
    }
    services.webEvents.notify();
    c.res = c.json(operation, 202);
    logger.info(
        {
            operationId: operation.id,
            operationRequestId: operation.requestId,
            requestId: c.get("requestId"),
            hostId: operation.hostId,
        },
        "Host operation accepted",
    );
    const task = new Promise<void>((resolve) => setImmediate(resolve)).then(
        execute,
    );
    services.operationTasks.add(task);
    void task.finally(() => services.operationTasks.delete(task));
    return c.res;

    async function execute() {
        const persist = async () => {
            await services.db.hostState.saveOperation(operation, hash);
            if (operation.finishedAt !== null)
                logger[operation.state === "failed" ? "error" : "info"](
                    {
                        operationId: operation.id,
                        operationRequestId: operation.requestId,
                        requestId: c.get("requestId"),
                        hostId: operation.hostId,
                        state: operation.state,
                    },
                    "Host operation finished",
                );
            services.webEvents.notify();
        };
        let placement = 0;
        try {
            for (const target of operation.targets) {
                const key = target.agentKey!;
                let stage: OperationError["stage"] = "execution";
                let launchFile: string | undefined;
                let createdTerminal: string | undefined;
                let savedTerminal = false;
                let failureTabId: string | undefined;
                try {
                    const runtime = services.runtimes
                        .list()
                        .find((r) => r.hostId === host!.id && r.name === key);
                    if (action === "start" && runtime) {
                        target.terminalId = runtime.terminalId;
                        target.state = "unchanged";
                        await persist();
                        continue;
                    }
                    if (runtime) {
                        target.terminalId = runtime.terminalId;
                        target.state = "stopping";
                        await persist();
                        await services.lifecycle.stopRuntime(runtime.id);
                    }
                    if (action === "stop") {
                        target.state = "stopped";
                        await persist();
                        continue;
                    }
                    const manifest = prepared!.manifest!;
                    const definition = manifest.agents[key]!;
                    stage = "storage";
                    const agent: HostView["agents"][number] = {
                        key,
                        ...definition,
                        role: definition.role ?? null,
                        description: definition.description ?? null,
                        member: manifest.network.agents.includes(key),
                        runtime: null,
                        lastExit: null,
                        lastTerminalId: null,
                    };
                    await services.db.hostState.applyAgent(
                        host!.id,
                        agent,
                        manifest.network.routes.map((r) => ({
                            from: r.from,
                            to: r.to,
                            policy: r.allowed ? "allow" : "deny",
                        })),
                    );
                    const current = projectHostState(
                        await services.db.hostState.snapshot(),
                        services,
                    ).panels.find((p) => p.id === host!.panelId)!;
                    const tab = placeAgent(
                        current,
                        key,
                        placement++,
                        callerTerminalId,
                    );
                    target.terminalId = tab.terminalId;
                    if (
                        tab.terminalId &&
                        services.runtimes
                            .list()
                            .some((r) => r.terminalId === tab.terminalId)
                    )
                        throw new HttpError(
                            409,
                            "terminal_busy",
                            "Selected terminal is in use.",
                        );
                    await services.db.hostState.updatePanel(
                        { ...current, revision: current.revision + 1 },
                        current.revision,
                    );
                    current.revision++;
                    failureTabId = tab.id;
                    stage = "execution";
                    if (
                        !tab.terminalId ||
                        !services.terminals.get(tab.terminalId)?.alive
                    ) {
                        const terminal = await services.lifecycle.createShell(
                            { cwd: host!.directory },
                            terminalLaunch,
                        );
                        createdTerminal = terminal.id;
                        tab.terminalId = terminal.id;
                        if (!terminal.alive)
                            throw new Error(
                                "Host shell exited during creation.",
                            );
                    }
                    target.terminalId = tab.terminalId;
                    stage = "storage";
                    await services.db.hostState.updatePanel(
                        { ...current, revision: current.revision + 1 },
                        current.revision,
                    );
                    savedTerminal = true;
                    target.state = "preparing";
                    stage = "execution";
                    const inCaller = target.terminalId === callerTerminalId;
                    const marker = inCaller
                        ? `AIOX_CALLER_${operation.id}_`
                        : `AIOX_LAUNCH_${randomUUID()}_`;
                    let command: string | undefined;
                    if (!inCaller) {
                        launchFile = join(
                            tmpdir(),
                            `aiox-launch-${randomUUID()}.cjs`,
                        );
                        command = await launchCommand(
                            host!,
                            key,
                            agent.adapter,
                            services.configLocation.home,
                            marker,
                            launchFile,
                        );
                    }
                    const waiting = waitForAgent(
                        services,
                        host!,
                        key,
                        target.terminalId!,
                        marker,
                    );
                    try {
                        await persist();
                        if (command)
                            services.terminals
                                .get(target.terminalId!)!
                                .write(command + "\r");
                    } catch (error) {
                        waiting.cancel();
                        await waiting.ready.catch(() => {});
                        throw error;
                    }
                    await waiting.ready;
                    target.state = "ready";
                    // Only obsolete notices are disposable; /exit and Copy shells remain user-owned.
                    const latest = (
                        await services.db.hostState.snapshot()
                    ).panels.find((p) => p.id === host!.panelId)!;
                    for (const old of latest.tabs.filter(
                        (t) =>
                            t.agentKey === key &&
                            t.id !== tab.id &&
                            t.notice !== null &&
                            t.presentation !== "shell",
                    )) {
                        try {
                            if (old.terminalId) {
                                if (
                                    services.runtimes
                                        .list()
                                        .some(
                                            (r) =>
                                                r.terminalId === old.terminalId,
                                        )
                                )
                                    continue;
                                await services.lifecycle.stopTerminal(
                                    old.terminalId,
                                );
                            } else {
                                const current = (
                                    await services.db.hostState.snapshot()
                                ).panels.find((p) => p.id === host!.panelId)!;
                                current.tabs = current.tabs.filter(
                                    (t) => t.id !== old.id,
                                );
                                for (const pane of panelLayoutReferences(
                                    current.layout,
                                ).panes) {
                                    pane.tabIds = pane.tabIds.filter(
                                        (id) => id !== old.id,
                                    );
                                    if (pane.selectedTabId === old.id)
                                        pane.selectedTabId =
                                            pane.tabIds[0] ?? null;
                                }
                                await services.db.hostState.updatePanel(
                                    {
                                        ...current,
                                        revision: current.revision + 1,
                                    },
                                    current.revision,
                                );
                            }
                        } catch (error) {
                            operation.cleanupErrors.push({
                                code: "cleanup_failed",
                                stage: "cleanup",
                                message: String(error),
                                agentKey: key,
                            });
                        }
                    }
                } catch (error) {
                    const failure: OperationError = {
                        code:
                            error instanceof HttpError
                                ? error.code
                                : stage === "storage"
                                  ? "storage_error"
                                  : "execution_failed",
                        stage,
                        message:
                            error instanceof Error
                                ? error.message
                                : String(error),
                        agentKey: key,
                    };
                    target.state = "failed";
                    target.error = failure;
                    operation.error ??= failure;
                    if (createdTerminal && !savedTerminal)
                        try {
                            await services.lifecycle.stopTerminal(
                                createdTerminal,
                            );
                        } catch (error) {
                            operation.cleanupErrors.push({
                                code: "cleanup_failed",
                                stage: "cleanup",
                                message: String(error),
                                agentKey: key,
                            });
                        }
                    if (
                        failureTabId &&
                        !services.runtimes
                            .list()
                            .some(
                                (r) => r.hostId === host!.id && r.name === key,
                            )
                    )
                        await services.db.hostState.failStart(
                            host!.id,
                            key,
                            failure.message,
                            restartCommand(host!, key),
                            failureTabId,
                        );
                } finally {
                    if (launchFile)
                        try {
                            await rm(launchFile, { force: true });
                        } catch (error) {
                            operation.cleanupErrors.push({
                                code: "cleanup_failed",
                                stage: "cleanup",
                                message: String(error),
                                agentKey: key,
                            });
                        }
                }
                await persist();
            }
            operation.state =
                operation.error || operation.cleanupErrors.length
                    ? "failed"
                    : "succeeded";
            operation.finishedAt = Date.now();
            await persist();
        } catch (error) {
            operation.state = "failed";
            operation.error = {
                code: "storage_error",
                stage: "storage",
                message: String(error),
            };
            operation.finishedAt = Date.now();
            operation.targets = operation.targets.map((t) =>
                ["pending", "preparing", "stopping"].includes(t.state)
                    ? { ...t, state: "failed", error: operation.error }
                    : t,
            );
            try {
                await persist();
            } catch (storage) {
                logger.error(
                    {
                        err: storage,
                        operationId: operation.id,
                        operationRequestId: operation.requestId,
                        requestId: c.get("requestId"),
                        hostId: operation.hostId,
                    },
                    "Host operation storage failed",
                );
                services.webEvents.fault("storage_error", String(storage));
            }
        }
    }
}

export async function routeHostNetwork(
    c: Context<HttpEnv>,
    services: DaemonServices,
): Promise<Response> {
    await loadConfig(services.configLocation);
    const hostId = c.req.param("hostId")!,
        networkId = c.req.param("networkId")!;
    const input = parse(
        z.strictObject({ operation: routeOperationSchema }),
        await readJson(c.req.raw),
    );
    const state = await services.db.hostState.snapshot();
    if (!state.hosts.some((h) => h.id === hostId))
        throw new HttpError(404, "unknown_host", "No such Host.");
    try {
        await services.db.hostState.routeNetwork(
            hostId,
            networkId,
            input.operation,
        );
    } catch (error) {
        if (error instanceof RouteOperationError)
            throw new HttpError(400, "invalid_route", error.message, {
                stage: "cli",
            });
        throw error;
    }
    services.webEvents.notify();
    return c.json(
        projectHostState(
            await services.db.hostState.snapshot(),
            services,
        ).networks.find((n) => n.id === networkId),
        200,
    );
}
