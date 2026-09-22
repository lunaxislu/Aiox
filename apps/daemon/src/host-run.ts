import { createHash, randomUUID } from "node:crypto";
import { access, writeFile, rm } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { prepareHostInput } from "@aiox/config";
import {
    hostRunRequestSchema,
    hostRestartRequestSchema,
    panelLayoutReferences,
    type HostLayout,
    type HostNetworkView,
    type HostView,
    type Operation,
    type OperationError,
    type PanelLayout,
    type PanelView,
} from "@aiox/protocol";
import { z } from "zod";

import { placeAgent } from "./host-agents";
import { HttpError, parse, readJson, send } from "./http";
import { restartCommand } from "./managed-agents";
import type { DaemonServices } from "./services";

// Validate the envelope here; layout semantics belong to prepareHostInput's CLI stage.
const runInputSchema = hostRunRequestSchema.extend({
    layout: z.unknown().optional(),
});

export function initialHostPanel(
    hostId: string,
    networkId: string,
    name: string,
    keys: string[],
    preset: HostLayout,
): PanelView {
    const count = Math.min(
        keys.length,
        preset.preset === "grid"
            ? preset.columns! * preset.rows!
            : preset.preset === "auto"
              ? 4
              : 3,
    );
    const panes = Array.from(
        { length: count },
        (): Extract<PanelLayout, { type: "pane" }> => ({
            type: "pane",
            id: randomUUID(),
            tabIds: [],
            selectedTabId: null,
        }),
    );
    const tabs = keys.map((agentKey, index) => {
        const id = randomUUID();
        const pane = panes[index % count]!;
        pane.tabIds.push(id);
        pane.selectedTabId ??= id;
        return {
            id,
            agentKey,
            label: agentKey,
            terminalId: null,
            runtimeId: null,
            presentation: "preparing" as const,
            notice: null,
        };
    });
    const split = (axis: "x" | "y", children: PanelLayout[]): PanelLayout =>
        children.length === 1
            ? children[0]!
            : {
                  type: "split",
                  axis,
                  weights: children.map(() => 1 / children.length),
                  children,
              };
    let layout: PanelLayout;
    if (
        preset.preset === "left-main" ||
        preset.preset === "top-main" ||
        (preset.preset === "auto" && count === 3)
    ) {
        const axis = preset.preset === "top-main" ? "y" : "x";
        layout =
            count === 1
                ? panes[0]!
                : split(axis, [
                      panes[0]!,
                      split(axis === "x" ? "y" : "x", panes.slice(1)),
                  ]);
    } else {
        const columns =
            preset.preset === "grid" ? preset.columns! : count === 1 ? 1 : 2;
        const rows: PanelLayout[] = [];
        for (let i = 0; i < count; i += columns)
            rows.push(split("x", panes.slice(i, i + columns)));
        layout = split("y", rows);
    }
    return {
        id: randomUUID(),
        kind: "host",
        section: "hosts",
        name,
        hostId,
        networkId,
        revision: 1,
        layout,
        activePaneId: panes[0]!.id,
        tabs,
    };
}

export const launcher = new URL("../../cli/dist/index.js", import.meta.url);

/** The daemon launches the same foreground CLI inside a fresh authenticated shell. */
export async function launchCommand(
    host: HostView,
    key: string,
    adapter: string,
    home: string | undefined,
    marker: string,
    file: string,
): Promise<string> {
    // Private OSC reports pre-registration failure without displaying protocol data in the TUI.
    const script = `process.env.AIOX_HOST_ID=${JSON.stringify(host.id)};process.env.AIOX_AGENT_KEY=${JSON.stringify(key)};import(${JSON.stringify(launcher.href)}).then(async ({createFoundationPort})=>{await createFoundationPort(${JSON.stringify({ home })}).execute({command:'agent.run',args:[${JSON.stringify(adapter)}],options:{}});if(process.exitCode)throw new Error('Agent exited with code '+process.exitCode);}).catch(e=>{const message=e instanceof Error?e.message:String(e);console.error(message);process.stdout.write('\\x1b]777;'+${JSON.stringify(marker)}+Buffer.from(message).subarray(0,4096).toString('base64')+'\\x07');process.exitCode=1;});`;
    // Keep the input line short even before the shell switches out of canonical mode.
    await writeFile(file, script, { flag: "wx", mode: 0o600 });
    const quote = (value: string) =>
        `'${value.replaceAll("'", process.platform === "win32" ? "''" : "'\\''")}'`;
    const command = `${process.platform === "win32" ? "& " : ""}${quote(process.execPath)} ${quote(file)}`;
    return process.platform === "win32"
        ? `powershell.exe -NoProfile -EncodedCommand ${Buffer.from(command, "utf16le").toString("base64")}`
        : command;
}

export function waitForAgent(
    services: DaemonServices,
    host: HostView,
    key: string,
    terminalId: string,
    marker: string,
): { ready: Promise<void>; cancel: () => void } {
    const terminal = services.terminals.get(terminalId)!;
    let dispose = () => {};
    let cancel = () => {};
    const ready = new Promise<void>((resolve, reject) => {
        let output = "";
        let registered = false;
        const finish = (error?: Error) => {
            dispose();
            if (error) reject(error);
            else resolve();
        };
        const check = () => {
            const runtime = services.runtimes
                .list()
                .find(
                    (r) =>
                        r.hostId === host.id &&
                        r.name === key &&
                        r.terminalId === terminalId,
                );
            if (runtime) {
                registered = true;
                if (
                    runtime.binding.collaborationError ||
                    runtime.status === "failed" ||
                    !runtime.collaborationActive
                )
                    finish(
                        new Error(
                            runtime.binding.collaborationError ??
                                runtime.status_reason ??
                                "Agent collaboration preparation failed.",
                        ),
                    );
                else if (runtime.phase === "running") finish();
            } else if (registered)
                finish(
                    new Error(
                        "Agent ended before becoming ready. Check the terminal startup diagnostic.",
                    ),
                );
        };
        const unsubscribe = services.runtimes.subscribe(check);
        const terminalUnsubscribe = terminal.subscribe({
            data: (data) => {
                output = (output + Buffer.from(data).toString()).slice(-16384);
                const match = new RegExp(
                    `${marker}([A-Za-z0-9+/=]+)\\x07`,
                ).exec(output);
                if (match)
                    finish(
                        new Error(Buffer.from(match[1]!, "base64").toString()),
                    );
            },
            exit: () =>
                finish(
                    new Error(
                        "Host shell exited before Agent preparation completed.",
                    ),
                ),
        });
        const timer = setTimeout(
            () =>
                finish(
                    new Error(
                        "Agent preparation did not complete within 90 seconds. Check its terminal diagnostic.",
                    ),
                ),
            90000,
        );
        dispose = () => {
            clearTimeout(timer);
            unsubscribe();
            terminalUnsubscribe();
        };
        cancel = () => finish(new Error("Host Agent launch was cancelled."));
        check();
    });
    return { ready, cancel: () => cancel() };
}

export async function handleHostRun(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
    services: DaemonServices,
): Promise<boolean> {
    if (
        !["/api/hosts/run", "/api/hosts/restart"].includes(url.pathname) ||
        request.method !== "POST"
    )
        return false;
    const restarting = url.pathname.endsWith("/restart");
    const input = parse(
        restarting ? hostRestartRequestSchema : runInputSchema,
        await readJson(request),
    );
    const hash = createHash("sha256")
        .update(JSON.stringify([url.pathname, input]))
        .digest("hex");
    const previous = await services.db.hostState.getOperation(
        input.requestId,
        hash,
    );
    if (previous) {
        send(response, 202, previous);
        return true;
    }
    if (!services.lifecycle.acceptingInput())
        throw new HttpError(503, "shutting_down", "Daemon is stopping.");
    const prepared = await prepareHostInput(
        { ...input, launch: true },
        services.configLocation,
    );
    await access(fileURLToPath(launcher)).catch((error) => {
        throw new HttpError(
            400,
            "invalid_environment",
            `Host CLI launcher is unavailable: ${String(error)}`,
            { stage: "environment" },
        );
    });
    // Invocation identifies the caller, never a workspace to commandeer.
    if (input.terminalContext) {
        try {
            services.terminals.authenticateContext(input.terminalContext);
        } catch {
            throw new HttpError(
                400,
                "invalid_terminal_context",
                "Invalid or expired terminal context.",
                { stage: "cli" },
            );
        }
        if (
            restarting &&
            services.runtimes
                .list()
                .some((r) => r.terminalId === input.terminalContext!.terminalId)
        )
            throw new HttpError(
                409,
                "terminal_busy",
                "The calling terminal already runs an Agent.",
                { stage: "cli" },
            );
    }
    const manifest = prepared.manifest!;
    const duplicate = async () =>
        (await services.db.hostState.snapshot()).hosts.find(
            (h) => h.name === manifest.host.name,
        );
    const exists = (host: HostView) => {
        if (host.sourceFile !== prepared.file)
            return new HttpError(
                409,
                "host_name_conflict",
                `Host '${host.name}' is registered from '${host.sourceFile}', but this request selects '${prepared.file}'. Choose a different host.name or use 'aiox host restart' for an explicit configuration replacement.`,
                { stage: "cli" },
            );
        return new HttpError(
            409,
            "host_exists",
            `Host '${host.name}' already exists (${services.runtimes.list().filter((r) => r.hostId === host.id).length} active Agents). Use 'aiox host agent start <agent-names...>' or 'aiox host restart' with its YAML.`,
            { stage: "cli" },
        );
    };
    const existing = await duplicate();
    if (existing && !restarting) throw exists(existing);
    const hostId = existing?.id ?? randomUUID(),
        networkId = existing?.networkId ?? randomUUID();
    let panel = existing
        ? (await services.db.hostState.snapshot()).panels.find(
              (p) => p.id === existing.panelId,
          )!
        : initialHostPanel(
              hostId,
              networkId,
              manifest.host.name,
              manifest.agentOrder,
              prepared.layout,
          );
    const host: HostView = {
        id: hostId,
        name: manifest.host.name,
        directory: prepared.directory!,
        sourceFile: prepared.file!,
        instruction: manifest.host.instruction,
        panelId: panel.id,
        networkId,
        revision: 1,
        activeOperationId: null,
        agents: manifest.agentOrder.map((key) => ({
            key,
            ...manifest.agents[key]!,
            role: manifest.agents[key]!.role ?? null,
            description: manifest.agents[key]!.description ?? null,
            member: manifest.network.agents.includes(key),
            runtime: null,
            lastExit: null,
            lastTerminalId: null,
        })),
    };
    const network: HostNetworkView = {
        id: networkId,
        hostId,
        scope: "host",
        name: manifest.network.name,
        default: manifest.network.default,
        members: manifest.network.agents.map((agentKey) => ({
            agentKey,
            runtimeId: null,
        })),
        edges: manifest.network.agents.flatMap((from) =>
            manifest.network.agents
                .filter((to) => to !== from)
                .map((to) => {
                    const route = manifest.network.routes.find(
                        (r) => r.from === from && r.to === to,
                    );
                    return {
                        from,
                        to,
                        fromRuntimeId: null,
                        toRuntimeId: null,
                        policy: route
                            ? route.allowed
                                ? ("allow" as const)
                                : ("deny" as const)
                            : manifest.network.default,
                        source: route
                            ? ("manifest-edge" as const)
                            : ("manifest-default" as const),
                    };
                }),
        ),
    };
    const operation: Operation = {
        id: randomUUID(),
        requestId: input.requestId,
        kind: restarting ? "host.restart" : "host.run",
        hostId,
        panelId: panel.id,
        state: "running",
        targets: [
            ...host.agents,
            ...(existing?.agents.filter(
                (a) => !manifest.agentOrder.includes(a.key),
            ) ?? []),
        ].map((a) => ({
            agentKey: a.key,
            terminalId: null,
            state: "pending",
            error: null,
        })),
        error: null,
        cleanupErrors: [],
        createdAt: Date.now(),
        finishedAt: null,
    };
    try {
        if (existing) {
            const admitted = await services.db.hostState.saveOperation(
                operation,
                hash,
            );
            if (admitted.id !== operation.id) {
                send(response, 202, admitted);
                return true;
            }
        } else
            await services.db.hostState.createHost(
                host,
                network,
                panel,
                operation.createdAt,
                { value: operation, requestHash: hash },
            );
    } catch (error) {
        const retry = await services.db.hostState.getOperation(
            input.requestId,
            hash,
        );
        if (retry) {
            send(response, 202, retry);
            return true;
        }
        const concurrent = await duplicate();
        if (!existing && concurrent) throw exists(concurrent);
        throw error;
    }
    services.webEvents.notify();
    send(response, 202, operation);
    const task = new Promise<void>((resolve) => setImmediate(resolve)).then(
        execute,
    );
    services.operationTasks.add(task);
    void task.finally(() => services.operationTasks.delete(task));
    return true;

    async function execute() {
        const persist = async () => {
            const previousStage = stage;
            stage = "storage";
            await services.db.hostState.saveOperation(operation, hash);
            stage = previousStage;
            services.webEvents.notify();
        };
        let stage: OperationError["stage"] = "execution";
        try {
            if (existing) {
                for (const runtime of services.runtimes
                    .list()
                    .filter((r) => r.hostId === host.id)) {
                    const target = operation.targets.find(
                        (t) => t.agentKey === runtime.name,
                    )!;
                    target.state = "stopping";
                    target.terminalId = runtime.terminalId;
                    await persist();
                    await services.lifecycle.stopRuntime(runtime.id);
                    target.state = "stopped";
                }
                const stopped = (
                    await services.db.hostState.snapshot()
                ).panels.find((p) => p.id === panel.id)!;
                const removed = stopped.tabs.filter(
                    (t) =>
                        t.agentKey &&
                        !manifest.agentOrder.includes(t.agentKey) &&
                        t.presentation !== "shell",
                );
                for (const tab of removed) {
                    if (tab.terminalId) {
                        await services.lifecycle.stopTerminal(tab.terminalId);
                        if (services.terminals.view(tab.terminalId)?.alive)
                            throw new Error(
                                "Removed Agent shell termination is not confirmed.",
                            );
                    }
                }
                const latest = await services.db.hostState.snapshot();
                panel = latest.panels.find((p) => p.id === panel.id)!;
                const removedIds = new Set(removed.map((t) => t.id));
                panel.tabs = panel.tabs.filter((t) => !removedIds.has(t.id));
                for (const pane of panelLayoutReferences(panel.layout).panes) {
                    pane.tabIds = pane.tabIds.filter(
                        (id) => !removedIds.has(id),
                    );
                    if (!pane.tabIds.includes(pane.selectedTabId!))
                        pane.selectedTabId = pane.tabIds[0] ?? null;
                }
                let placement = 0;
                for (const agent of host.agents) {
                    const tab = placeAgent(panel, agent.key, placement++);
                    const prior = latest.hosts
                        .find((h) => h.id === host.id)!
                        .agents.find((a) => a.key === agent.key);
                    agent.lastExit = prior?.lastExit ?? null;
                    agent.lastTerminalId = tab.terminalId;
                }
                host.revision =
                    latest.hosts.find((h) => h.id === host.id)!.revision + 1;
                stage = "storage";
                await services.db.hostState.replaceHost(
                    host,
                    network,
                    panel,
                    host.revision - 1,
                );
                for (const target of operation.targets)
                    if (!manifest.agentOrder.includes(target.agentKey!))
                        target.state = "stopped";
                await persist();
            }
            for (const target of operation.targets) {
                const agent = host.agents.find(
                    (a) => a.key === target.agentKey,
                );
                if (!agent) continue;
                let savedTerminal = false;
                let createdTerminal = false;
                let failureTabId: string | undefined;
                let launchFile: string | undefined;
                try {
                    stage = "execution";
                    const tab = panel.tabs.find(
                        (t) =>
                            t.agentKey === agent.key &&
                            t.presentation === "preparing",
                    )!;
                    failureTabId = tab.id;
                    const reusable = tab.terminalId
                        ? services.terminals.view(tab.terminalId)
                        : undefined;
                    createdTerminal = !reusable?.alive;
                    const terminal = reusable?.alive
                        ? reusable
                        : await services.lifecycle.createShell(
                              {
                                  cwd: host.directory,
                              },
                              prepared.terminal,
                          );
                    target.terminalId = terminal.id;
                    if (!terminal.alive)
                        throw new Error("Host shell exited during creation.");
                    const current = (
                        await services.db.hostState.snapshot()
                    ).panels.find((p) => p.id === panel.id)!;
                    stage = "storage";
                    await services.db.hostState.updatePanel(
                        {
                            ...current,
                            revision: current.revision + 1,
                            tabs: current.tabs.map((t) =>
                                t.id === tab.id
                                    ? { ...t, terminalId: terminal.id }
                                    : t,
                            ),
                        },
                        current.revision,
                    );
                    savedTerminal = true;
                    target.state = "preparing";
                    await persist();
                    stage = "execution";
                    const inCaller =
                        terminal.id === input.terminalContext?.terminalId;
                    const marker = inCaller
                        ? `AIOX_CALLER_${operation.id}_`
                        : `AIOX_LAUNCH_${randomUUID()}_`;
                    if (!inCaller)
                        launchFile = join(
                            tmpdir(),
                            `aiox-launch-${randomUUID()}.cjs`,
                        );
                    const command = inCaller
                        ? undefined
                        : await launchCommand(
                              host,
                              agent.key,
                              agent.adapter,
                              services.configLocation.home,
                              marker,
                              launchFile!,
                          );
                    const waiting = waitForAgent(
                        services,
                        host,
                        agent.key,
                        terminal.id,
                        marker,
                    );
                    try {
                        if (command)
                            services.terminals
                                .get(terminal.id)!
                                .write(command + "\r");
                    } catch (error) {
                        waiting.cancel();
                        await waiting.ready.catch(() => {});
                        throw error;
                    }
                    await waiting.ready;
                    target.state = "ready";
                } catch (error) {
                    const failure: OperationError = {
                        code:
                            stage === "storage"
                                ? "storage_error"
                                : "execution_failed",
                        stage,
                        message:
                            error instanceof Error
                                ? error.message
                                : String(error),
                        agentKey: agent.key,
                    };
                    target.state = "failed";
                    target.error = failure;
                    operation.error ??= failure;
                    if (
                        target.terminalId &&
                        createdTerminal &&
                        !savedTerminal
                    ) {
                        try {
                            await services.lifecycle.stopTerminal(
                                target.terminalId,
                            );
                        } catch (cleanup) {
                            operation.cleanupErrors.push({
                                code: "cleanup_failed",
                                stage: "cleanup",
                                message: String(cleanup),
                                agentKey: agent.key,
                            });
                        }
                    }
                    // Preserve a live vendor and its diagnostic when only collaboration failed.
                    const runtime = services.runtimes
                        .list()
                        .find(
                            (r) => r.hostId === host.id && r.name === agent.key,
                        );
                    if (!runtime && failureTabId)
                        await services.db.hostState.failStart(
                            host.id,
                            agent.key,
                            failure.message,
                            restartCommand(host, agent.key),
                            failureTabId,
                        );
                } finally {
                    if (launchFile) {
                        try {
                            await rm(launchFile, { force: true });
                        } catch (error) {
                            operation.cleanupErrors.push({
                                code: "cleanup_failed",
                                stage: "cleanup",
                                message: `Could not remove launch file ${launchFile}: ${String(error)}`,
                                agentKey: agent.key,
                            });
                        }
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
                code:
                    stage === "storage" ? "storage_error" : "execution_failed",
                stage,
                message: error instanceof Error ? error.message : String(error),
            };
            operation.finishedAt = Date.now();
            operation.targets = operation.targets.map((t) =>
                ["pending", "preparing", "stopping"].includes(t.state)
                    ? { ...t, state: "failed", error: operation.error }
                    : t,
            );
            try {
                await persist();
            } catch (error) {
                services.webEvents.fault("storage_error", String(error));
            }
        }
    }
}
