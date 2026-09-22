import {
    applyRouteOperation,
    type RouteOperation,
    type DirectedRoute,
} from "@aiox/domain";
import {
    hostViewSchema,
    hostNetworkViewSchema,
    panelViewSchema,
    operationSchema,
    type HostView,
    type HostNetworkView,
    type PanelView,
    type Operation,
    type PanelLayout,
    lastExitSchema,
    type LastExit,
} from "@aiox/protocol";
import {
    IsNull,
    Not,
    LessThan,
    type DataSource,
    type EntityManager,
} from "typeorm";

import {
    HostEntity,
    HostExecutionEntity,
    HostAgentEntity,
    HostNetworkEntity,
    HostMemberEntity,
    HostEdgeEntity,
    PanelEntity,
    PanelTabEntity,
    HostOperationEntity,
    type PanelRow,
    type HostOperationRow,
} from "./host-schema";

export class HostStateError extends Error {
    constructor(
        readonly code:
            | "revision_conflict"
            | "unknown_panel"
            | "request_conflict"
            | "panel_busy"
            | "unknown_host"
            | "unknown_network"
            | "unknown_agent",
        message: string = code,
    ) {
        super(message);
    }
}
export type HostStateSnapshot = {
    hosts: HostView[];
    networks: HostNetworkView[];
    panels: PanelView[];
    operations: Operation[];
};
export interface HostState {
    routeNetwork(
        hostId: string,
        networkId: string,
        operation: RouteOperation,
    ): Promise<void>;
    applyAgent(
        hostId: string,
        agent: HostView["agents"][number],
        routes: readonly DirectedRoute[],
    ): Promise<void>;
    snapshot(): Promise<HostStateSnapshot>;
    getOperation(
        requestId: string,
        requestHash: string,
    ): Promise<Operation | undefined>;
    startExecution(input: {
        runtimeId: string;
        hostId: string;
        agentKey: string;
        terminalId: string;
        startedAt: number;
    }): Promise<void>;
    finishExecution(
        runtimeId: string,
        exit: LastExit,
        restartCommand: string,
    ): Promise<void>;
    failStart(
        hostId: string,
        agentKey: string,
        message: string,
        restartCommand: string,
        tabId: string,
    ): Promise<void>;
    removeTerminal(id: string): Promise<void>;
    deleteHost(id: string, panelRevision: number): Promise<void>;
    replaceHost(
        host: HostView,
        network: HostNetworkView,
        panel: PanelView,
        expectedRevision: number,
    ): Promise<void>;
    deletePanel(id: string, expectedRevision: number): Promise<void>;
    createPanel(panel: PanelView): Promise<void>;
    updatePanel(panel: PanelView, expectedRevision: number): Promise<void>;
    createHost(
        host: HostView,
        network: HostNetworkView,
        panel: PanelView,
        createdAt: number,
        operation?: { value: Operation; requestHash: string },
    ): Promise<void>;
    saveOperation(
        operation: Operation,
        requestHash: string,
    ): Promise<Operation>;
    recover(at: number): Promise<void>;
    purgeBefore(at: number): Promise<number>;
}
const json = (value: unknown) =>
    value === null ? null : JSON.stringify(value);
function panelRow(panel: PanelView): PanelRow {
    const { tabs: _tabs, layout, ...row } = panel;
    return { ...row, layoutJson: JSON.stringify(layout) };
}
async function insertTabs(manager: EntityManager, panel: PanelView) {
    if (panel.tabs.length)
        await manager.insert(
            PanelTabEntity,
            panel.tabs.map(({ runtimeId: _runtime, notice, ...tab }) => ({
                ...tab,
                panelId: panel.id,
                noticeJson: json(notice),
            })),
        );
}
function operationView(row: HostOperationRow): Operation {
    const {
        requestHash: _hash,
        targetsJson,
        errorJson,
        cleanupErrorsJson,
        ...rest
    } = row;
    return operationSchema.parse({
        ...rest,
        targets: JSON.parse(targetsJson),
        error: errorJson === null ? null : JSON.parse(errorJson),
        cleanupErrors: JSON.parse(cleanupErrorsJson),
    });
}
export function hostState(dataSource: DataSource): HostState {
    const manager = dataSource.manager;
    // ponytail: scan local Host collections per snapshot; use indexed joins if measured scale requires it.
    async function snapshot(): Promise<HostStateSnapshot> {
        const hosts = await manager.find(HostEntity, {
            order: { createdAt: "ASC", id: "ASC" },
        });
        const agents = await manager.find(HostAgentEntity, {
            order: { ordinal: "ASC" },
        });
        const networks = await manager.find(HostNetworkEntity);
        const members = await manager.find(HostMemberEntity);
        const edges = await manager.find(HostEdgeEntity);
        const panels = await manager.find(PanelEntity, {
            order: { id: "ASC" },
        });
        const tabs = await manager.find(PanelTabEntity, {
            order: { id: "ASC" },
        });
        const operations = (
            await manager.find(HostOperationEntity, {
                order: { createdAt: "ASC", id: "ASC" },
            })
        ).map(operationView);
        return {
            hosts: hosts.map(({ createdAt: _at, ...host }) => {
                const network = networks.find((n) => n.hostId === host.id);
                const panel = panels.find((p) => p.hostId === host.id);
                if (!network || !panel)
                    throw new Error(`Incomplete stored Host ${host.id}`);
                return hostViewSchema.parse({
                    ...host,
                    panelId: panel.id,
                    networkId: network.id,
                    activeOperationId:
                        operations.find(
                            (o) =>
                                o.hostId === host.id && o.state === "running",
                        )?.id ?? null,
                    agents: agents
                        .filter((a) => a.hostId === host.id)
                        .map((a) => ({
                            key: a.agentKey,
                            adapter: a.adapter,
                            role: a.role,
                            description: a.description,
                            instruction: a.instruction,
                            args: JSON.parse(a.argsJson),
                            member: members.some(
                                (m) =>
                                    m.networkId === network.id &&
                                    m.agentKey === a.agentKey,
                            ),
                            runtime: null,
                            lastTerminalId: a.lastTerminalId,
                            lastExit:
                                a.lastExitJson === null
                                    ? null
                                    : JSON.parse(a.lastExitJson),
                        })),
                });
            }),
            networks: networks.map((n) => {
                const keys = members
                    .filter((m) => m.networkId === n.id)
                    .map((m) => m.agentKey);
                return hostNetworkViewSchema.parse({
                    id: n.id,
                    hostId: n.hostId,
                    name: n.name,
                    scope: "host",
                    default: n.defaultPolicy,
                    members: keys.map((agentKey) => ({
                        agentKey,
                        runtimeId: null,
                    })),
                    edges: keys.flatMap((from) =>
                        keys
                            .filter((to) => to !== from)
                            .map((to) => {
                                const edge = edges.find(
                                    (e) =>
                                        e.networkId === n.id &&
                                        e.fromKey === from &&
                                        e.toKey === to,
                                );
                                return {
                                    from,
                                    to,
                                    fromRuntimeId: null,
                                    toRuntimeId: null,
                                    policy:
                                        edge?.overridePolicy ??
                                        edge?.manifestPolicy ??
                                        n.defaultPolicy,
                                    source:
                                        edge?.overridePolicy != null
                                            ? "runtime-override"
                                            : edge?.manifestPolicy != null
                                              ? "manifest-edge"
                                              : "manifest-default",
                                };
                            }),
                    ),
                });
            }),
            panels: panels.map(({ layoutJson, ...panel }) =>
                panelViewSchema.parse({
                    ...panel,
                    layout: JSON.parse(layoutJson),
                    tabs: tabs
                        .filter((t) => t.panelId === panel.id)
                        .map(({ panelId: _panel, noticeJson, ...tab }) => ({
                            ...tab,
                            runtimeId: null,
                            notice:
                                noticeJson === null
                                    ? null
                                    : JSON.parse(noticeJson),
                        })),
                }),
            ),
            operations,
        };
    }
    async function writeHost(
        input: HostView,
        networkInput: HostNetworkView,
        panelInput: PanelView,
        createdAt: number,
        operation?: { value: Operation; requestHash: string },
        expectedRevision?: number,
    ) {
        const host = hostViewSchema.parse(input),
            network = hostNetworkViewSchema.parse(networkInput),
            panel = panelViewSchema.parse(panelInput);
        if (
            network.hostId !== host.id ||
            host.networkId !== network.id ||
            host.panelId !== panel.id ||
            panel.hostId !== host.id ||
            panel.networkId !== network.id ||
            panel.kind !== "host" ||
            network.members.some(
                (m) =>
                    !host.agents.some((a) => a.key === m.agentKey && a.member),
            ) ||
            host.agents.some(
                (a) =>
                    a.member !==
                    network.members.some((m) => m.agentKey === a.key),
            )
        )
            throw new Error("Invalid Host references");
        await dataSource.transaction(async (manager) => {
            if (expectedRevision !== undefined) {
                const previous = await manager.findOne(HostEntity, {
                    where: { id: host.id },
                });
                if (!previous) throw new HostStateError("unknown_host");
                if (previous.revision !== expectedRevision)
                    throw new HostStateError("revision_conflict");
                const previousPanel = await manager.findOne(PanelEntity, {
                    where: { hostId: host.id },
                });
                if (
                    !previousPanel ||
                    previousPanel.id !== panel.id ||
                    previousPanel.revision !== panel.revision
                )
                    throw new HostStateError("revision_conflict");
                createdAt = previous.createdAt;
                panel.revision++;
                await manager.delete(HostEntity, { id: host.id });
            }
            await manager.insert(HostEntity, {
                id: host.id,
                name: host.name,
                directory: host.directory,
                sourceFile: host.sourceFile,
                instruction: host.instruction,
                revision: host.revision,
                createdAt,
            });
            if (host.agents.length)
                await manager.insert(
                    HostAgentEntity,
                    host.agents.map((a, ordinal) => ({
                        hostId: host.id,
                        agentKey: a.key,
                        ordinal,
                        adapter: a.adapter,
                        role: a.role,
                        description: a.description,
                        instruction: a.instruction,
                        argsJson: JSON.stringify(a.args),
                        lastTerminalId: a.lastTerminalId,
                        lastExitJson: json(a.lastExit),
                    })),
                );
            await manager.insert(HostNetworkEntity, {
                id: network.id,
                hostId: host.id,
                name: network.name,
                defaultPolicy: network.default,
            });
            if (network.members.length)
                await manager.insert(
                    HostMemberEntity,
                    network.members.map((m) => ({
                        networkId: network.id,
                        agentKey: m.agentKey,
                    })),
                );
            const explicit = network.edges.filter(
                (e) => e.source !== "manifest-default",
            );
            if (explicit.length)
                await manager.insert(
                    HostEdgeEntity,
                    explicit.map((e) => ({
                        networkId: network.id,
                        fromKey: e.from,
                        toKey: e.to,
                        manifestPolicy:
                            e.source === "manifest-edge" ? e.policy : null,
                        overridePolicy:
                            e.source === "runtime-override" ? e.policy : null,
                    })),
                );
            await manager.insert(PanelEntity, panelRow(panel));
            await insertTabs(manager, panel);
            if (operation) {
                const { targets, error, cleanupErrors, ...rest } =
                    operationSchema.parse(operation.value);
                await manager.insert(HostOperationEntity, {
                    ...rest,
                    requestHash: operation.requestHash,
                    targetsJson: JSON.stringify(targets),
                    errorJson: json(error),
                    cleanupErrorsJson: JSON.stringify(cleanupErrors),
                });
            }
        });
    }

    return {
        snapshot,
        async routeNetwork(hostId, networkId, operation) {
            await dataSource.transaction(async (manager) => {
                if (
                    !(await manager.findOne(HostNetworkEntity, {
                        where: { id: networkId, hostId },
                    }))
                )
                    throw new HostStateError("unknown_network");
                if (
                    await manager.findOne(HostOperationEntity, {
                        where: { hostId, state: "running" },
                    })
                )
                    throw new HostStateError("panel_busy");
                const members = await manager.find(HostMemberEntity, {
                    where: { networkId },
                });
                const pairs = applyRouteOperation(
                    { routes: [] },
                    { ...operation, action: "block" },
                ).routes;
                if (
                    pairs.some(
                        (e) =>
                            !members.some((m) => m.agentKey === e.from) ||
                            !members.some((m) => m.agentKey === e.to),
                    )
                )
                    throw new HostStateError("unknown_agent");
                for (const { from, to } of pairs) {
                    const key = { networkId, fromKey: from, toKey: to };
                    const current = await manager.findOne(HostEdgeEntity, {
                        where: key,
                    });
                    await manager.save(HostEdgeEntity, {
                        ...key,
                        manifestPolicy: current?.manifestPolicy ?? null,
                        overridePolicy:
                            operation.action === "reset"
                                ? null
                                : operation.action === "block"
                                  ? "deny"
                                  : "allow",
                    });
                }
            });
        },
        async applyAgent(hostId, agent, routes) {
            await dataSource.transaction(async (manager) => {
                const host = await manager.findOne(HostEntity, {
                    where: { id: hostId },
                });
                if (!host) throw new HostStateError("unknown_host");
                const network = (await manager.findOne(HostNetworkEntity, {
                    where: { hostId },
                }))!;
                const agents = await manager.find(HostAgentEntity, {
                    where: { hostId },
                });
                const previous = agents.find((a) => a.agentKey === agent.key);
                await manager.save(HostAgentEntity, {
                    hostId,
                    agentKey: agent.key,
                    ordinal:
                        previous?.ordinal ??
                        Math.max(-1, ...agents.map((a) => a.ordinal)) + 1,
                    adapter: agent.adapter,
                    role: agent.role,
                    description: agent.description,
                    instruction: agent.instruction,
                    argsJson: JSON.stringify(agent.args),
                    lastTerminalId: previous?.lastTerminalId ?? null,
                    lastExitJson: previous?.lastExitJson ?? null,
                });
                const networkId = network.id;
                await manager.delete(HostMemberEntity, {
                    networkId,
                    agentKey: agent.key,
                });
                if (agent.member)
                    await manager.insert(HostMemberEntity, {
                        networkId,
                        agentKey: agent.key,
                    });
                await manager.delete(HostEdgeEntity, [
                    { networkId, fromKey: agent.key },
                    { networkId, toKey: agent.key },
                ]);
                if (agent.member) {
                    const members = await manager.find(HostMemberEntity, {
                        where: { networkId },
                    });
                    for (const route of routes.filter(
                        (e) => e.from === agent.key || e.to === agent.key,
                    )) {
                        if (
                            !members.some((m) => m.agentKey === route.from) ||
                            !members.some((m) => m.agentKey === route.to)
                        )
                            throw new HostStateError(
                                "unknown_agent",
                                `Cannot apply edge ${route.from} -> ${route.to}: missing Host Network member.`,
                            );
                        await manager.insert(HostEdgeEntity, {
                            networkId,
                            fromKey: route.from,
                            toKey: route.to,
                            manifestPolicy: route.policy,
                            overridePolicy: null,
                        });
                    }
                }
                await manager.update(
                    HostEntity,
                    { id: hostId },
                    { revision: host.revision + 1 },
                );
            });
        },
        async getOperation(requestId, requestHash) {
            const row = await manager.findOneBy(HostOperationEntity, {
                requestId,
            });
            if (!row) return undefined;
            if (row.requestHash !== requestHash)
                throw new HostStateError("request_conflict");
            return operationView(row);
        },
        async failStart(hostId, agentKey, message, restartCommand, tabId) {
            await dataSource.transaction(async (manager) => {
                if (
                    await manager.findOneBy(HostExecutionEntity, {
                        hostId,
                        agentKey,
                        endedAt: IsNull(),
                    })
                )
                    throw new Error(
                        "Cannot mark a live execution as a failed start.",
                    );
                const panel = await manager.findOneByOrFail(PanelEntity, {
                    hostId,
                });
                const tab = await manager.findOneByOrFail(PanelTabEntity, {
                    id: tabId,
                    panelId: panel.id,
                    agentKey,
                });
                await manager.update(
                    HostAgentEntity,
                    { hostId, agentKey },
                    {
                        lastTerminalId: tab.terminalId,
                        lastExitJson: json({
                            kind: "start-failed",
                            message,
                            at: Date.now(),
                        }),
                    },
                );
                await manager.update(
                    PanelTabEntity,
                    { id: tab.id },
                    {
                        presentation: "start-failed",
                        noticeJson: json({
                            message,
                            reason: "start-failed",
                            restartCommand,
                        }),
                    },
                );
                await manager.increment(
                    PanelEntity,
                    { id: panel.id },
                    "revision",
                    1,
                );
            });
        },
        async startExecution(input) {
            await dataSource.transaction(async (manager) => {
                const panel = await manager.findOneBy(PanelEntity, {
                    hostId: input.hostId,
                });
                const agent = await manager.findOneBy(HostAgentEntity, {
                    hostId: input.hostId,
                    agentKey: input.agentKey,
                });
                const tab =
                    panel &&
                    (await manager.findOneBy(PanelTabEntity, {
                        panelId: panel.id,
                        terminalId: input.terminalId,
                        agentKey: input.agentKey,
                    }));
                if (!agent || !tab)
                    throw new Error(
                        "Managed Agent does not own this panel terminal.",
                    );
                if (
                    await manager.findOneBy(HostExecutionEntity, {
                        hostId: input.hostId,
                        agentKey: input.agentKey,
                        endedAt: IsNull(),
                    })
                )
                    throw new Error(
                        "Managed Agent already has an execution awaiting cleanup.",
                    );
                await manager.insert(HostExecutionEntity, {
                    ...input,
                    endedAt: null,
                    exitJson: null,
                });
                await manager.update(
                    HostAgentEntity,
                    { hostId: input.hostId, agentKey: input.agentKey },
                    { lastTerminalId: input.terminalId },
                );
                await manager.update(
                    PanelTabEntity,
                    { id: tab.id },
                    { presentation: "preparing", noticeJson: null },
                );
                await manager.increment(
                    PanelEntity,
                    { id: panel!.id },
                    "revision",
                    1,
                );
            });
        },
        async finishExecution(runtimeId, input, restartCommand) {
            const exit = lastExitSchema.parse(input);
            await dataSource.transaction(async (manager) => {
                const execution = await manager.findOneBy(HostExecutionEntity, {
                    runtimeId,
                    endedAt: IsNull(),
                });
                if (!execution) return;
                await manager.update(
                    HostExecutionEntity,
                    { runtimeId },
                    { endedAt: exit.at, exitJson: json(exit) },
                );
                await manager.update(
                    HostAgentEntity,
                    { hostId: execution.hostId, agentKey: execution.agentKey },
                    { lastExitJson: json(exit) },
                );
                const panel = await manager.findOneBy(PanelEntity, {
                    hostId: execution.hostId,
                });
                const tab =
                    panel &&
                    (await manager.findOneBy(PanelTabEntity, {
                        panelId: panel.id,
                        terminalId: execution.terminalId,
                        agentKey: execution.agentKey,
                    }));
                if (!tab) return;
                await manager.update(
                    PanelTabEntity,
                    { id: tab.id },
                    {
                        presentation:
                            exit.kind === "exited"
                                ? "shell"
                                : exit.kind === "daemon-ended"
                                  ? "unavailable"
                                  : exit.kind,
                        noticeJson:
                            exit.kind === "exited"
                                ? null
                                : json({
                                      message: exit.message ?? "Agent stopped.",
                                      reason: exit.kind,
                                      restartCommand,
                                  }),
                    },
                );
                await manager.increment(
                    PanelEntity,
                    { id: panel!.id },
                    "revision",
                    1,
                );
            });
        },
        async removeTerminal(id) {
            await dataSource.transaction(async (manager) => {
                const tab = await manager.findOne(PanelTabEntity, {
                    where: { terminalId: id },
                });
                if (!tab) return;
                const panel = await manager.findOneByOrFail(PanelEntity, {
                    id: tab.panelId,
                });
                const remove = (node: PanelLayout): PanelLayout => {
                    if (node.type === "split")
                        return { ...node, children: node.children.map(remove) };
                    const tabIds = node.tabIds.filter((id) => id !== tab.id);
                    return {
                        ...node,
                        tabIds,
                        selectedTabId:
                            node.selectedTabId === tab.id
                                ? (tabIds[0] ?? null)
                                : node.selectedTabId,
                    };
                };
                await manager.delete(PanelTabEntity, { id: tab.id });
                await manager.update(
                    PanelEntity,
                    { id: panel.id },
                    {
                        layoutJson: JSON.stringify(
                            remove(JSON.parse(panel.layoutJson)),
                        ),
                        revision: panel.revision + 1,
                    },
                );
            });
        },
        async deleteHost(id, panelRevision) {
            await dataSource.transaction(async (manager) => {
                const host = await manager.findOne(HostEntity, {
                    where: { id },
                });
                if (!host) throw new HostStateError("unknown_host");
                const panel = await manager.findOne(PanelEntity, {
                    where: { hostId: id },
                });
                if (!panel || panel.revision !== panelRevision)
                    throw new HostStateError("revision_conflict");
                if (
                    await manager.count(PanelTabEntity, {
                        where: { panelId: panel.id, terminalId: Not(IsNull()) },
                    })
                )
                    throw new HostStateError(
                        "revision_conflict",
                        "Host still owns terminals.",
                    );
                await manager.delete(HostEntity, { id });
            });
        },
        async deletePanel(id, expectedRevision) {
            await dataSource.transaction(async (manager) => {
                const panel = await manager.findOne(PanelEntity, {
                    where: { id },
                });
                if (!panel) throw new HostStateError("unknown_panel");
                if (panel.revision !== expectedRevision)
                    throw new HostStateError("revision_conflict");
                await manager.delete(PanelEntity, { id });
            });
        },
        async createPanel(input) {
            const panel = panelViewSchema.parse(input);
            await dataSource.transaction(async (manager) => {
                await manager.insert(PanelEntity, panelRow(panel));
                await insertTabs(manager, panel);
            });
        },
        async updatePanel(input, expectedRevision) {
            const panel = panelViewSchema.parse(input);
            if (panel.revision !== expectedRevision + 1)
                throw new HostStateError("revision_conflict");
            await dataSource.transaction(async (manager) => {
                const current = await manager.findOne(PanelEntity, {
                    where: { id: panel.id },
                });
                if (!current) throw new HostStateError("unknown_panel");
                if (current.revision !== expectedRevision)
                    throw new HostStateError("revision_conflict");
                await manager.update(
                    PanelEntity,
                    { id: panel.id, revision: expectedRevision },
                    panelRow(panel),
                );
                await manager.delete(PanelTabEntity, { panelId: panel.id });
                await insertTabs(manager, panel);
            });
        },
        createHost: writeHost,
        replaceHost: (host, network, panel, revision) =>
            writeHost(host, network, panel, 0, undefined, revision),
        async saveOperation(input, requestHash) {
            const operation = operationSchema.parse(input);
            return dataSource.transaction(async (manager) => {
                const existing = await manager.findOne(HostOperationEntity, {
                    where: { requestId: operation.requestId },
                });
                if (existing && existing.requestHash !== requestHash)
                    throw new HostStateError("request_conflict");
                if (
                    existing &&
                    (existing.id !== operation.id ||
                        existing.state !== "running")
                )
                    return operationView(existing);
                if (
                    !existing &&
                    operation.panelId !== null &&
                    (await manager.findOne(HostOperationEntity, {
                        where: { panelId: operation.panelId, state: "running" },
                    }))
                )
                    throw new HostStateError("panel_busy");
                const { targets, error, cleanupErrors, ...rest } = operation;
                await manager.save(HostOperationEntity, {
                    ...rest,
                    requestHash,
                    targetsJson: JSON.stringify(targets),
                    errorJson: json(error),
                    cleanupErrorsJson: JSON.stringify(cleanupErrors),
                });
                return operation;
            });
        },
        async purgeBefore(at) {
            return dataSource.transaction(async (manager) => {
                const rows = await manager.find(HostOperationEntity, {
                    where: {
                        finishedAt: LessThan(at),
                        cleanupErrorsJson: "[]",
                    },
                });
                for (const row of rows)
                    await manager.delete(HostOperationEntity, { id: row.id });
                await manager.delete(HostExecutionEntity, {
                    endedAt: LessThan(at),
                });
                return rows.length;
            });
        },
        async recover(at) {
            await dataSource.transaction(async (manager) => {
                for (const row of await manager.find(HostOperationEntity, {
                    where: { state: "running" },
                })) {
                    const error = {
                        code: "daemon_interrupted",
                        message: "Daemon ended before completion.",
                        stage: "execution",
                    };
                    const operation = operationView(row);
                    await manager.update(
                        HostOperationEntity,
                        { id: row.id },
                        {
                            state: "failed",
                            finishedAt: at,
                            errorJson: JSON.stringify(error),
                            targetsJson: JSON.stringify(
                                operation.targets.map((t) =>
                                    [
                                        "pending",
                                        "preparing",
                                        "stopping",
                                    ].includes(t.state)
                                        ? { ...t, state: "failed", error }
                                        : t,
                                ),
                            ),
                        },
                    );
                }
                for (const execution of await manager.find(
                    HostExecutionEntity,
                    { where: { endedAt: IsNull() } },
                )) {
                    const exit = JSON.stringify({
                        kind: "daemon-ended",
                        message: "Daemon ended before execution cleanup.",
                        at,
                    });
                    await manager.update(
                        HostExecutionEntity,
                        { runtimeId: execution.runtimeId },
                        { endedAt: at, exitJson: exit },
                    );
                    await manager.update(
                        HostAgentEntity,
                        {
                            hostId: execution.hostId,
                            agentKey: execution.agentKey,
                        },
                        { lastExitJson: exit },
                    );
                }
                const changed = new Set<string>();
                for (const tab of await manager.find(PanelTabEntity)) {
                    if (
                        tab.terminalId === null ||
                        tab.presentation === "unavailable"
                    )
                        continue;
                    changed.add(tab.panelId);
                    await manager.update(
                        PanelTabEntity,
                        { id: tab.id },
                        {
                            presentation: "unavailable",
                            noticeJson: JSON.stringify({
                                message:
                                    "Terminal is unavailable after daemon restart.",
                                reason: "daemon-ended",
                                restartCommand: "",
                            }),
                        },
                    );
                }
                for (const panel of await manager.find(PanelEntity)) {
                    if (!changed.has(panel.id)) continue;
                    await manager.update(
                        PanelEntity,
                        { id: panel.id },
                        { revision: panel.revision + 1 },
                    );
                }
            });
        },
    };
}
