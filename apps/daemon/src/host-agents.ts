import { createHash, randomUUID } from "node:crypto";

import {
    loadConfig,
    prepareHostInput,
    resolveTerminalLaunch,
    type TerminalLaunch,
} from "@aiox/config";
import { RouteOperationError } from "@aiox/domain";
import {
    hostAgentStartRequestSchema,
    hostAgentStopRequestSchema,
    routeOperationSchema,
    removePanelTabs,
    type HostNetworkView,
    type HostView,
    type PanelView,
    type PanelLayout,
    type CommandError,
    type HostTargetResult,
} from "@aiox/protocol";
import * as Schema from "effect/Schema";

import {
    allTargets,
    commandError,
    startAgent,
    type AdmittedHostCommand,
    type HostOutcome,
} from "./host-command";
import { HttpError, parse, readJson } from "./http";
import type { Context } from "./http-endpoint";
import type { DaemonServices } from "./services";
import { projectPanel } from "./web-state";

// Agent semantics follow config/YAML validation, just like run's layout semantics.
function strictInput<const F extends Schema.Struct.Fields>(
    fields: F,
): Schema.Codec<Schema.Struct.Type<F>, Schema.Struct.Encoded<F>> {
    const known = Schema.Struct(fields);
    return Schema.StructWithRest(known, [
        Schema.Record(Schema.String, Schema.Unknown),
    ]).check(
        Schema.makeFilter((value) => {
            const extra = Object.keys(value).find(
                (key) => !Object.hasOwn(fields, key),
            );
            return extra === undefined
                ? undefined
                : { path: [extra], issue: "Unexpected key" };
        }),
    ) as unknown as Schema.Codec<
        Schema.Struct.Type<F>,
        Schema.Struct.Encoded<F>
    >;
}

const startInputFields = {
    ...hostAgentStartRequestSchema.fields,
    agents: Schema.Unknown,
};
const startInput = strictInput(startInputFields);
const decodeStartInput = Schema.decodeUnknownSync(startInput);
const decodeAgentKeys = Schema.decodeUnknownSync(
    hostAgentStartRequestSchema.fields.agents,
);

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
    c: Context,
    services: DaemonServices,
    action: "start" | "restart" | "stop",
): Promise<Response> {
    const start = action !== "stop";
    if (!start) await loadConfig(services.configLocation);
    const body = await readJson(c.req.raw);
    const input = start
        ? parse({ parse: decodeStartInput }, body)
        : parse(hostAgentStopRequestSchema, body);
    const hash = createHash("sha256")
        .update(JSON.stringify([c.req.path, input]))
        .digest("hex");
    return services.hostCommands.respond(
        c,
        {
            requestId: input.requestId,
            hash,
            command: `host.agent.${action}`,
        },
        () => admitHostAgents(services, input, action, c.req.param("hostId")),
    );
}
export async function admitHostAgents(
    services: DaemonServices,
    input:
        | Schema.Schema.Type<typeof startInput>
        | Schema.Schema.Type<typeof hostAgentStopRequestSchema>,
    action: "start" | "restart" | "stop",
    hostId?: string,
): Promise<AdmittedHostCommand> {
    const start = action !== "stop";
    if (!start) await loadConfig(services.configLocation);
    return admit();
    async function admit(): Promise<AdmittedHostCommand> {
        if (!services.lifecycle.acceptingInput())
            throw new HttpError(503, "shutting_down", "Daemon is stopping.");
        const prepared =
            "source" in input
                ? await prepareHostInput(input, services.configLocation)
                : undefined;
        let keys: string[];
        try {
            keys = decodeAgentKeys(input.agents);
        } catch (error) {
            throw new HttpError(
                400,
                "invalid_request",
                error instanceof Error ? error.message : "Invalid Agent keys.",
                {
                    stage: "cli",
                },
            );
        }
        const state = await services.appState.current();
        const host = state.hosts.find((h) =>
            prepared
                ? h.name === prepared.manifest!.host.name
                : h.id === hostId,
        );
        if (!host)
            throw new HttpError(
                404,
                "unknown_host",
                "No registered Host. Use 'aiox host run' first.",
                { stage: "cli" },
            );
        const network = state.networks.find(
            (n): n is HostNetworkView =>
                n.id === host.networkId && n.scope === "host",
        )!;
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
                          error instanceof Error
                              ? error.message
                              : String(error),
                          { stage: "environment" },
                      );
                  })
                : undefined;
        const panel = (await services.db.hostState.getPanel(host.panelId))!;
        if (!panel.tabs.some((t) => t.terminalId === callerTerminalId))
            callerTerminalId = undefined;
        if (
            needsLaunch &&
            callerTerminalId &&
            services.runtimes
                .list()
                .some((r) => r.terminalId === callerTerminalId)
        )
            throw new HttpError(
                409,
                "terminal_busy",
                "The calling terminal already runs an Agent.",
                { stage: "cli" },
            );
        const target = host;
        return {
            hostId: target.id,
            agents: keys,
            execute: () =>
                execute(
                    target,
                    keys,
                    prepared,
                    terminalLaunch,
                    callerTerminalId,
                ),
        };
    }

    async function execute(
        host: HostView,
        keys: readonly string[],
        prepared: Awaited<ReturnType<typeof prepareHostInput>> | undefined,
        terminalLaunch: TerminalLaunch | undefined,
        callerTerminalId: string | undefined,
    ): Promise<HostOutcome> {
        const results = new Map<string, HostTargetResult>();
        const cleanupErrors: CommandError[] = [];
        const runtimeOf = (key: string) =>
            services.runtimes
                .list()
                .find((r) => r.hostId === host.id && r.name === key);
        // Stop what this command replaces; independent Agents stop together.
        await allTargets(keys, async (key) => {
            const runtime = runtimeOf(key);
            const base = {
                agentKey: key,
                terminalId: runtime?.terminalId ?? null,
            };
            if (action === "start" && runtime)
                return {
                    target: { ...base, state: "unchanged", error: null },
                    cleanupErrors: [],
                };
            try {
                if (runtime) await services.lifecycle.stopRuntime(runtime.id);
                return {
                    target: { ...base, state: "stopped", error: null },
                    cleanupErrors: [],
                };
            } catch (error) {
                return {
                    target: {
                        ...base,
                        state: "failed",
                        error: commandError(error, "cleanup", key),
                    },
                    cleanupErrors: [],
                };
            }
        }).then((stopped) => {
            for (const target of stopped.targets)
                results.set(target.agentKey!, target);
        });
        if (action === "stop")
            return {
                hostId: host.id,
                targets: keys.map((k) => results.get(k)!),
            };
        const launching = keys.filter(
            (key) => results.get(key)!.state === "stopped",
        );
        const manifest = prepared!.manifest!;
        const tabs = new Map<string, string>();
        for (const key of launching) {
            const definition = manifest.agents[key]!;
            try {
                await services.db.hostState.applyAgent(
                    host.id,
                    {
                        key,
                        ...definition,
                        role: definition.role ?? null,
                        description: definition.description ?? null,
                        member: manifest.network.agents.includes(key),
                        runtime: null,
                        lastExit: null,
                        lastTerminalId: null,
                    },
                    manifest.network.routes.map((r) => ({
                        from: r.from,
                        to: r.to,
                        policy: r.allowed ? "allow" : "deny",
                    })),
                );
            } catch (error) {
                results.set(key, {
                    agentKey: key,
                    terminalId: null,
                    state: "failed",
                    error: commandError(error, "storage", key),
                });
            }
        }
        const placing = launching.filter(
            (key) => results.get(key)!.state === "stopped",
        );
        try {
            await services.db.hostState.mutatePanel(host.panelId, (stored) => {
                // Placement reads live runtimes; only the placed tabs and layout are stored.
                const view = projectPanel(stored, services.runtimes);
                const placed = placing.map((key, index) => {
                    const tab = placeAgent(view, key, index, callerTerminalId);
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
                            { stage: "execution" },
                        );
                    tabs.set(key, tab.id);
                    return tab;
                });
                const ids = new Set(placed.map((t) => t.id));
                return {
                    ...stored,
                    layout: view.layout,
                    tabs: [
                        ...stored.tabs.filter((t) => !ids.has(t.id)),
                        ...placed.map((t) => ({ ...t, runtimeId: null })),
                    ],
                };
            });
        } catch (error) {
            for (const key of placing)
                results.set(key, {
                    agentKey: key,
                    terminalId: null,
                    state: "failed",
                    error: commandError(error, "storage", key),
                });
            tabs.clear();
        }
        await services.appState.update(
            { host: host.id },
            { panel: host.panelId },
        );
        const firstTab = tabs.values().next().value;
        if (callerTerminalId && firstTab)
            await services.appState.reveal(
                callerTerminalId,
                host.panelId,
                firstTab,
            );
        const started = await allTargets([...tabs], async ([key, tabId]) => {
            const outcome = await startAgent(services, {
                env: "env" in input ? input.env : undefined,
                host,
                key,
                adapter: manifest.agents[key]!.adapter,
                tabId,
                terminalLaunch,
            });
            if (outcome.target.state === "ready")
                outcome.cleanupErrors.push(
                    ...(await removeObsoleteTabs(host, key, tabId)),
                );
            return outcome;
        });
        for (const target of started.targets)
            results.set(target.agentKey!, target);
        cleanupErrors.push(...started.cleanupErrors);
        return {
            hostId: host.id,
            targets: keys.map((k) => results.get(k)!),
            cleanupErrors,
        };
    }

    /** Only obsolete notices are disposable; /exit and Copy shells remain user-owned. */
    async function removeObsoleteTabs(
        host: HostView,
        key: string,
        tabId: string,
    ): Promise<CommandError[]> {
        const errors: CommandError[] = [];
        const latest = (await services.db.hostState.getPanel(host.panelId))!;
        for (const old of latest.tabs.filter(
            (t) =>
                t.agentKey === key &&
                t.id !== tabId &&
                t.notice !== null &&
                t.presentation !== "shell",
        )) {
            try {
                if (old.terminalId) {
                    if (
                        services.runtimes
                            .list()
                            .some((r) => r.terminalId === old.terminalId)
                    )
                        continue;
                    await services.lifecycle.stopTerminal(old.terminalId);
                } else
                    await services.db.hostState.mutatePanel(
                        host.panelId,
                        (p) => ({
                            ...p,
                            ...removePanelTabs(p, new Set([old.id])),
                            tabs: p.tabs.filter((t) => t.id !== old.id),
                        }),
                    );
                await services.appState.update({ panel: host.panelId });
            } catch (error) {
                errors.push(commandError(error, "cleanup", key));
            }
        }
        return errors;
    }
}

export async function routeHostNetwork(
    c: Context,
    services: DaemonServices,
): Promise<Response> {
    await loadConfig(services.configLocation);
    const hostId = c.req.param("hostId")!,
        networkId = c.req.param("networkId")!;
    const input = parse(
        {
            parse: Schema.decodeUnknownSync(
                strictInput({ operation: routeOperationSchema }),
            ),
        },
        await readJson(c.req.raw),
    );
    return c.json(
        await updateHostRoutes(services, hostId, networkId, input.operation),
        200,
    );
}

export async function updateHostRoutes(
    services: DaemonServices,
    hostId: string,
    networkId: string,
    operation: Schema.Schema.Type<typeof routeOperationSchema>,
) {
    await loadConfig(services.configLocation);
    if (!(await services.db.hostState.getHost(hostId)))
        throw new HttpError(404, "unknown_host", "No such Host.");
    if (services.hostCommands.busy(hostId))
        throw new HttpError(
            409,
            "host_busy",
            "Another Host command is running for this Host.",
        );
    try {
        await services.db.hostState.routeNetwork(hostId, networkId, operation);
    } catch (error) {
        if (error instanceof RouteOperationError)
            throw new HttpError(400, "invalid_route", error.message, {
                stage: "cli",
            });
        throw error;
    }
    await services.appState.update({ host: hostId });
    const network = services.appState.view("network", networkId);
    if (!network || !("hostId" in network))
        throw new HttpError(404, "unknown_network", "No such Host Network.");
    return network;
}
