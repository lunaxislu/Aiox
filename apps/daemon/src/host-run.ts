import { createHash, randomUUID } from "node:crypto";

import { prepareHostInput } from "@aiox/config";
import {
    hostRunRequestSchema,
    hostRestartRequestSchema,
    removePanelTabs,
    type HostLayout,
    type HostNetworkView,
    type HostView,
    type PanelLayout,
    type PanelView,
} from "@aiox/protocol";
import * as Schema from "effect/Schema";

import { placeAgent } from "./host-agents";
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

// Validate the envelope here; layout semantics belong to prepareHostInput's CLI stage.
const runInputFields = {
    ...hostRunRequestSchema.fields,
    layout: Schema.optional(Schema.Unknown),
};
function strictInput<const F extends Schema.Struct.Fields>(
    fields: F,
): Schema.Codec<Schema.Struct.Type<F>, Schema.Struct.Encoded<F>> {
    return Schema.StructWithRest(Schema.Struct(fields), [
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

const runInputSchema = strictInput(runInputFields);
const decodeRunInput = Schema.decodeUnknownSync(runInputSchema);

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
        }),
    );
    const tabs = keys.map((agentKey, index) => {
        const id = randomUUID();
        const pane = panes[index % count]!;
        pane.tabIds.push(id);
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
                  id: randomUUID(),
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
        tabs,
    };
}

export async function handleHostRun(
    c: Context,
    services: DaemonServices,
    restarting: boolean,
): Promise<Response> {
    const body = await readJson(c.req.raw);
    const input = restarting
        ? parse(hostRestartRequestSchema, body)
        : parse({ parse: decodeRunInput }, body);
    const hash = createHash("sha256")
        .update(JSON.stringify([c.req.path, input]))
        .digest("hex");
    return services.hostCommands.respond(
        c,
        {
            requestId: input.requestId,
            hash,
            command: restarting ? "host.restart" : "host.run",
        },
        () => admitHostRun(services, input, restarting),
    );
}

export async function admitHostRun(
    services: DaemonServices,
    input:
        | Schema.Schema.Type<typeof hostRestartRequestSchema>
        | Schema.Schema.Type<typeof runInputSchema>,
    restarting: boolean,
): Promise<AdmittedHostCommand> {
    if (!services.lifecycle.acceptingInput())
        throw new HttpError(503, "shutting_down", "Daemon is stopping.");
    const prepared = await prepareHostInput(
        { ...input, launch: true },
        services.configLocation,
    );
    const terminalContext =
        "terminalContext" in input ? input.terminalContext : undefined;
    if (terminalContext) {
        try {
            services.terminals.authenticateContext(terminalContext);
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
                .some((r) => r.terminalId === terminalContext.terminalId)
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
        (await services.appState.current()).hosts.find(
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
        ? (await services.db.hostState.getPanel(existing.panelId))!
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
    if (!existing) {
        // Registration of a new Host is part of admission; its Agents start afterwards.
        try {
            await services.db.hostState.createHost(
                host,
                network,
                panel,
                Date.now(),
            );
        } catch (error) {
            const concurrent = await duplicate();
            if (concurrent) throw exists(concurrent);
            throw error;
        }
        await services.appState.update({ host: hostId }, { panel: panel.id });
    }
    const start = async () => {
        if (terminalContext && host.agents[0]) {
            const first = panel.tabs.find(
                (tab) =>
                    tab.agentKey === host.agents[0]!.key &&
                    tab.presentation === "preparing",
            );
            if (first)
                await services.appState.reveal(
                    terminalContext.terminalId,
                    panel.id,
                    first.id,
                );
        }
        return allTargets(host.agents, (agent) =>
            startAgent(services, {
                env: input.env,
                host,
                key: agent.key,
                adapter: agent.adapter,
                tabId: panel.tabs.find(
                    (t) =>
                        t.agentKey === agent.key &&
                        t.presentation === "preparing",
                )!.id,
                terminalLaunch: prepared.terminal,
            }),
        );
    };
    return {
        hostId,
        agents: "all",
        async execute(): Promise<HostOutcome> {
            if (!existing) return { hostId, ...(await start()) };
            // Restart: every current execution stops before the new configuration applies.
            const stopped = await allTargets(
                services.runtimes.list().filter((r) => r.hostId === hostId),
                async (runtime) => {
                    try {
                        await services.lifecycle.stopRuntime(runtime.id);
                        return {
                            target: {
                                agentKey: runtime.name,
                                terminalId: runtime.terminalId,
                                state: "stopped" as const,
                                error: null,
                            },
                            cleanupErrors: [],
                        };
                    } catch (error) {
                        return {
                            target: {
                                agentKey: runtime.name,
                                terminalId: runtime.terminalId,
                                state: "failed" as const,
                                error: commandError(
                                    error,
                                    "cleanup",
                                    runtime.name,
                                ),
                            },
                            cleanupErrors: [],
                        };
                    }
                },
            );
            if (stopped.targets.some((t) => t.state === "failed"))
                return { hostId, ...stopped };
            const latest = (await services.db.hostState.getPanel(panel.id))!;
            const removed = latest.tabs.filter(
                (t) =>
                    t.agentKey &&
                    !manifest.agentOrder.includes(t.agentKey) &&
                    t.presentation !== "shell",
            );
            for (const tab of removed)
                if (tab.terminalId) {
                    await services.lifecycle.stopTerminal(tab.terminalId);
                    if (services.terminals.view(tab.terminalId)?.alive)
                        throw new Error(
                            "Removed Agent shell termination is not confirmed.",
                        );
                }
            const removedIds = new Set(removed.map((t) => t.id));
            const applyHost = (target: PanelView) => {
                target.tabs = target.tabs.filter((t) => !removedIds.has(t.id));
                if (target.tabs.length === 0) {
                    const initial = initialHostPanel(
                        hostId,
                        networkId,
                        host.name,
                        manifest.agentOrder,
                        prepared.layout,
                    );
                    target.layout = initial.layout;
                    target.tabs = initial.tabs;
                } else {
                    Object.assign(target, removePanelTabs(target, removedIds));
                }
                let placement = 0;
                return host.agents.map((agent) =>
                    placeAgent(target, agent.key, placement++),
                );
            };
            // Agent tabs keep their identity across user moves, so the preview names
            // the same reused terminals the stored application will.
            const preview = applyHost(
                structuredClone(
                    (await services.db.hostState.getPanel(panel.id))!,
                ),
            );
            const prior = (await services.db.hostState.getHost(hostId))!;
            host.agents.forEach((agent, index) => {
                agent.lastExit =
                    prior.agents.find((a) => a.key === agent.key)?.lastExit ??
                    null;
                agent.lastTerminalId = preview[index]!.terminalId;
            });
            host.revision = prior.revision + 1;
            panel = await services.db.hostState.replaceHost(
                host,
                network,
                (current) => {
                    applyHost(current);
                    return current;
                },
                prior.revision,
            );
            await services.appState.update(
                { host: hostId },
                { panel: panel.id },
            );
            const started = await start();
            const previous = new Set(host.agents.map((a) => a.key));
            return {
                hostId,
                targets: [
                    ...started.targets,
                    ...stopped.targets.filter(
                        (t) => !previous.has(t.agentKey!),
                    ),
                ],
                cleanupErrors: [
                    ...stopped.cleanupErrors,
                    ...started.cleanupErrors,
                ],
            };
        },
    };
}
