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
    and,
    or,
    eq,
    isNull,
    isNotNull,
    lt,
    asc,
    count,
    sql,
} from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

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
function insertTabs(manager: BetterSQLite3Database, panel: PanelView) {
    if (panel.tabs.length)
        manager
            .insert(PanelTabEntity)
            .values(
                panel.tabs.map(({ runtimeId: _runtime, notice, ...tab }) => ({
                    ...tab,
                    panelId: panel.id,
                    noticeJson: json(notice),
                })),
            )
            .run();
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
export function hostState(dataSource: BetterSQLite3Database): HostState {
    const manager = dataSource;
    // ponytail: scan local Host collections per snapshot; use indexed joins if measured scale requires it.
    async function snapshot(): Promise<HostStateSnapshot> {
        const hosts = manager
            .select()
            .from(HostEntity)
            .orderBy(asc(HostEntity.createdAt), asc(HostEntity.id))
            .all();
        const agents = manager
            .select()
            .from(HostAgentEntity)
            .orderBy(asc(HostAgentEntity.ordinal))
            .all();
        const networks = manager.select().from(HostNetworkEntity).all();
        const members = manager.select().from(HostMemberEntity).all();
        const edges = manager.select().from(HostEdgeEntity).all();
        const panels = manager
            .select()
            .from(PanelEntity)
            .orderBy(asc(PanelEntity.id))
            .all();
        const tabs = manager
            .select()
            .from(PanelTabEntity)
            .orderBy(asc(PanelTabEntity.id))
            .all();
        const operations = manager
            .select()
            .from(HostOperationEntity)
            .orderBy(
                asc(HostOperationEntity.createdAt),
                asc(HostOperationEntity.id),
            )
            .all()
            .map(operationView);
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
        dataSource.transaction((manager) => {
            if (expectedRevision !== undefined) {
                const previous = manager
                    .select()
                    .from(HostEntity)
                    .where(eq(HostEntity.id, host.id))
                    .get();
                if (!previous) throw new HostStateError("unknown_host");
                if (previous.revision !== expectedRevision)
                    throw new HostStateError("revision_conflict");
                const previousPanel = manager
                    .select()
                    .from(PanelEntity)
                    .where(eq(PanelEntity.hostId, host.id))
                    .get();
                if (
                    !previousPanel ||
                    previousPanel.id !== panel.id ||
                    previousPanel.revision !== panel.revision
                )
                    throw new HostStateError("revision_conflict");
                createdAt = previous.createdAt;
                panel.revision++;
                manager
                    .delete(HostEntity)
                    .where(eq(HostEntity.id, host.id))
                    .run();
            }
            manager
                .insert(HostEntity)
                .values({
                    id: host.id,
                    name: host.name,
                    directory: host.directory,
                    sourceFile: host.sourceFile,
                    instruction: host.instruction,
                    revision: host.revision,
                    createdAt,
                })
                .run();
            if (host.agents.length)
                manager
                    .insert(HostAgentEntity)
                    .values(
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
                    )
                    .run();
            manager
                .insert(HostNetworkEntity)
                .values({
                    id: network.id,
                    hostId: host.id,
                    name: network.name,
                    defaultPolicy: network.default,
                })
                .run();
            if (network.members.length)
                manager
                    .insert(HostMemberEntity)
                    .values(
                        network.members.map((m) => ({
                            networkId: network.id,
                            agentKey: m.agentKey,
                        })),
                    )
                    .run();
            const explicit = network.edges.filter(
                (e) => e.source !== "manifest-default",
            );
            if (explicit.length)
                manager
                    .insert(HostEdgeEntity)
                    .values(
                        explicit.map((e) => ({
                            networkId: network.id,
                            fromKey: e.from,
                            toKey: e.to,
                            manifestPolicy:
                                e.source === "manifest-edge" ? e.policy : null,
                            overridePolicy:
                                e.source === "runtime-override"
                                    ? e.policy
                                    : null,
                        })),
                    )
                    .run();
            manager.insert(PanelEntity).values(panelRow(panel)).run();
            insertTabs(manager, panel);
            if (operation) {
                const { targets, error, cleanupErrors, ...rest } =
                    operationSchema.parse(operation.value);
                manager
                    .insert(HostOperationEntity)
                    .values({
                        ...rest,
                        requestHash: operation.requestHash,
                        targetsJson: JSON.stringify(targets),
                        errorJson: json(error),
                        cleanupErrorsJson: JSON.stringify(cleanupErrors),
                    })
                    .run();
            }
        });
    }

    return {
        snapshot,
        async routeNetwork(hostId, networkId, operation) {
            dataSource.transaction((manager) => {
                if (
                    !manager
                        .select()
                        .from(HostNetworkEntity)
                        .where(
                            and(
                                eq(HostNetworkEntity.id, networkId),
                                eq(HostNetworkEntity.hostId, hostId),
                            ),
                        )
                        .get()
                )
                    throw new HostStateError("unknown_network");
                if (
                    manager
                        .select()
                        .from(HostOperationEntity)
                        .where(
                            and(
                                eq(HostOperationEntity.hostId, hostId),
                                eq(HostOperationEntity.state, "running"),
                            ),
                        )
                        .get()
                )
                    throw new HostStateError("panel_busy");
                const members = manager
                    .select()
                    .from(HostMemberEntity)
                    .where(eq(HostMemberEntity.networkId, networkId))
                    .all();
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
                    const current = manager
                        .select()
                        .from(HostEdgeEntity)
                        .where(
                            and(
                                eq(HostEdgeEntity.networkId, networkId),
                                eq(HostEdgeEntity.fromKey, from),
                                eq(HostEdgeEntity.toKey, to),
                            ),
                        )
                        .get();
                    if (
                        operation.action === "reset" &&
                        current?.manifestPolicy == null
                    ) {
                        manager
                            .delete(HostEdgeEntity)
                            .where(
                                and(
                                    eq(HostEdgeEntity.networkId, networkId),
                                    eq(HostEdgeEntity.fromKey, from),
                                    eq(HostEdgeEntity.toKey, to),
                                ),
                            )
                            .run();
                        continue;
                    }
                    const row = {
                        ...key,
                        manifestPolicy: current?.manifestPolicy ?? null,
                        overridePolicy:
                            operation.action === "reset"
                                ? null
                                : operation.action === "block"
                                  ? "deny"
                                  : "allow",
                    };
                    manager
                        .insert(HostEdgeEntity)
                        .values(row)
                        .onConflictDoUpdate({
                            target: [
                                HostEdgeEntity.networkId,
                                HostEdgeEntity.fromKey,
                                HostEdgeEntity.toKey,
                            ],
                            set: row,
                        })
                        .run();
                }
            });
        },
        async applyAgent(hostId, agent, routes) {
            dataSource.transaction((manager) => {
                const host = manager
                    .select()
                    .from(HostEntity)
                    .where(eq(HostEntity.id, hostId))
                    .get();
                if (!host) throw new HostStateError("unknown_host");
                const network = manager
                    .select()
                    .from(HostNetworkEntity)
                    .where(eq(HostNetworkEntity.hostId, hostId))
                    .get()!;
                const agents = manager
                    .select()
                    .from(HostAgentEntity)
                    .where(eq(HostAgentEntity.hostId, hostId))
                    .all();
                const previous = agents.find((a) => a.agentKey === agent.key);
                const row = {
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
                };
                manager
                    .insert(HostAgentEntity)
                    .values(row)
                    .onConflictDoUpdate({
                        target: [
                            HostAgentEntity.hostId,
                            HostAgentEntity.agentKey,
                        ],
                        set: row,
                    })
                    .run();
                const networkId = network.id;
                manager
                    .delete(HostMemberEntity)
                    .where(
                        and(
                            eq(HostMemberEntity.networkId, networkId),
                            eq(HostMemberEntity.agentKey, agent.key),
                        ),
                    )
                    .run();
                if (agent.member)
                    manager
                        .insert(HostMemberEntity)
                        .values({
                            networkId,
                            agentKey: agent.key,
                        })
                        .run();
                manager
                    .delete(HostEdgeEntity)
                    .where(
                        or(
                            and(
                                eq(HostEdgeEntity.networkId, networkId),
                                eq(HostEdgeEntity.fromKey, agent.key),
                            ),
                            and(
                                eq(HostEdgeEntity.networkId, networkId),
                                eq(HostEdgeEntity.toKey, agent.key),
                            ),
                        ),
                    )
                    .run();
                if (agent.member) {
                    const members = manager
                        .select()
                        .from(HostMemberEntity)
                        .where(eq(HostMemberEntity.networkId, networkId))
                        .all();
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
                        manager
                            .insert(HostEdgeEntity)
                            .values({
                                networkId,
                                fromKey: route.from,
                                toKey: route.to,
                                manifestPolicy: route.policy,
                                overridePolicy: null,
                            })
                            .run();
                    }
                }
                manager
                    .update(HostEntity)
                    .set({ revision: host.revision + 1 })
                    .where(eq(HostEntity.id, hostId))
                    .run();
            });
        },
        async getOperation(requestId, requestHash) {
            const row = manager
                .select()
                .from(HostOperationEntity)
                .where(eq(HostOperationEntity.requestId, requestId))
                .get();
            if (!row) return undefined;
            if (row.requestHash !== requestHash)
                throw new HostStateError("request_conflict");
            return operationView(row);
        },
        async failStart(hostId, agentKey, message, restartCommand, tabId) {
            dataSource.transaction((manager) => {
                if (
                    manager
                        .select()
                        .from(HostExecutionEntity)
                        .where(
                            and(
                                eq(HostExecutionEntity.hostId, hostId),
                                eq(HostExecutionEntity.agentKey, agentKey),
                                isNull(HostExecutionEntity.endedAt),
                            ),
                        )
                        .get()
                )
                    throw new Error(
                        "Cannot mark a live execution as a failed start.",
                    );
                const panel = manager
                    .select()
                    .from(PanelEntity)
                    .where(eq(PanelEntity.hostId, hostId))
                    .get();
                if (!panel) throw new Error("Missing stored panel.");
                const tab = manager
                    .select()
                    .from(PanelTabEntity)
                    .where(
                        and(
                            eq(PanelTabEntity.id, tabId),
                            eq(PanelTabEntity.panelId, panel.id),
                            eq(PanelTabEntity.agentKey, agentKey),
                        ),
                    )
                    .get();
                if (!tab) throw new Error("Missing stored panel tab.");
                manager
                    .update(HostAgentEntity)
                    .set({
                        lastTerminalId: tab.terminalId,
                        lastExitJson: json({
                            kind: "start-failed",
                            message,
                            at: Date.now(),
                        }),
                    })
                    .where(
                        and(
                            eq(HostAgentEntity.hostId, hostId),
                            eq(HostAgentEntity.agentKey, agentKey),
                        ),
                    )
                    .run();
                manager
                    .update(PanelTabEntity)
                    .set({
                        presentation: "start-failed",
                        noticeJson: json({
                            message,
                            reason: "start-failed",
                            restartCommand,
                        }),
                    })
                    .where(eq(PanelTabEntity.id, tab.id))
                    .run();
                manager
                    .update(PanelEntity)
                    .set({ revision: sql`${PanelEntity.revision} + 1` })
                    .where(eq(PanelEntity.id, panel.id))
                    .run();
            });
        },
        async startExecution(input) {
            dataSource.transaction((manager) => {
                const panel = manager
                    .select()
                    .from(PanelEntity)
                    .where(eq(PanelEntity.hostId, input.hostId))
                    .get();
                const agent = manager
                    .select()
                    .from(HostAgentEntity)
                    .where(
                        and(
                            eq(HostAgentEntity.hostId, input.hostId),
                            eq(HostAgentEntity.agentKey, input.agentKey),
                        ),
                    )
                    .get();
                const tab =
                    panel &&
                    manager
                        .select()
                        .from(PanelTabEntity)
                        .where(
                            and(
                                eq(PanelTabEntity.panelId, panel.id),
                                eq(PanelTabEntity.terminalId, input.terminalId),
                                eq(PanelTabEntity.agentKey, input.agentKey),
                            ),
                        )
                        .get();
                if (!agent || !tab)
                    throw new Error(
                        "Managed Agent does not own this panel terminal.",
                    );
                if (
                    manager
                        .select()
                        .from(HostExecutionEntity)
                        .where(
                            and(
                                eq(HostExecutionEntity.hostId, input.hostId),
                                eq(
                                    HostExecutionEntity.agentKey,
                                    input.agentKey,
                                ),
                                isNull(HostExecutionEntity.endedAt),
                            ),
                        )
                        .get()
                )
                    throw new Error(
                        "Managed Agent already has an execution awaiting cleanup.",
                    );
                manager
                    .insert(HostExecutionEntity)
                    .values({
                        ...input,
                        endedAt: null,
                        exitJson: null,
                    })
                    .run();
                manager
                    .update(HostAgentEntity)
                    .set({ lastTerminalId: input.terminalId })
                    .where(
                        and(
                            eq(HostAgentEntity.hostId, input.hostId),
                            eq(HostAgentEntity.agentKey, input.agentKey),
                        ),
                    )
                    .run();
                manager
                    .update(PanelTabEntity)
                    .set({ presentation: "preparing", noticeJson: null })
                    .where(eq(PanelTabEntity.id, tab.id))
                    .run();
                manager
                    .update(PanelEntity)
                    .set({ revision: sql`${PanelEntity.revision} + 1` })
                    .where(eq(PanelEntity.id, panel!.id))
                    .run();
            });
        },
        async finishExecution(runtimeId, input, restartCommand) {
            const exit = lastExitSchema.parse(input);
            dataSource.transaction((manager) => {
                const execution = manager
                    .select()
                    .from(HostExecutionEntity)
                    .where(
                        and(
                            eq(HostExecutionEntity.runtimeId, runtimeId),
                            isNull(HostExecutionEntity.endedAt),
                        ),
                    )
                    .get();
                if (!execution) return;
                manager
                    .update(HostExecutionEntity)
                    .set({ endedAt: exit.at, exitJson: json(exit) })
                    .where(eq(HostExecutionEntity.runtimeId, runtimeId))
                    .run();
                manager
                    .update(HostAgentEntity)
                    .set({ lastExitJson: json(exit) })
                    .where(
                        and(
                            eq(HostAgentEntity.hostId, execution.hostId),
                            eq(HostAgentEntity.agentKey, execution.agentKey),
                        ),
                    )
                    .run();
                const panel = manager
                    .select()
                    .from(PanelEntity)
                    .where(eq(PanelEntity.hostId, execution.hostId))
                    .get();
                const tab =
                    panel &&
                    manager
                        .select()
                        .from(PanelTabEntity)
                        .where(
                            and(
                                eq(PanelTabEntity.panelId, panel.id),
                                eq(
                                    PanelTabEntity.terminalId,
                                    execution.terminalId,
                                ),
                                eq(PanelTabEntity.agentKey, execution.agentKey),
                            ),
                        )
                        .get();
                if (!tab) return;
                manager
                    .update(PanelTabEntity)
                    .set({
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
                    })
                    .where(eq(PanelTabEntity.id, tab.id))
                    .run();
                manager
                    .update(PanelEntity)
                    .set({ revision: sql`${PanelEntity.revision} + 1` })
                    .where(eq(PanelEntity.id, panel!.id))
                    .run();
            });
        },
        async removeTerminal(id) {
            dataSource.transaction((manager) => {
                const tab = manager
                    .select()
                    .from(PanelTabEntity)
                    .where(eq(PanelTabEntity.terminalId, id))
                    .get();
                if (!tab) return;
                const panel = manager
                    .select()
                    .from(PanelEntity)
                    .where(eq(PanelEntity.id, tab.panelId))
                    .get();
                if (!panel) throw new Error("Missing stored panel.");
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
                manager
                    .delete(PanelTabEntity)
                    .where(eq(PanelTabEntity.id, tab.id))
                    .run();
                manager
                    .update(PanelEntity)
                    .set({
                        layoutJson: JSON.stringify(
                            remove(JSON.parse(panel.layoutJson)),
                        ),
                        revision: panel.revision + 1,
                    })
                    .where(eq(PanelEntity.id, panel.id))
                    .run();
            });
        },
        async deleteHost(id, panelRevision) {
            dataSource.transaction((manager) => {
                const host = manager
                    .select()
                    .from(HostEntity)
                    .where(eq(HostEntity.id, id))
                    .get();
                if (!host) throw new HostStateError("unknown_host");
                const panel = manager
                    .select()
                    .from(PanelEntity)
                    .where(eq(PanelEntity.hostId, id))
                    .get();
                if (!panel || panel.revision !== panelRevision)
                    throw new HostStateError("revision_conflict");
                if (
                    manager
                        .select({ count: count() })
                        .from(PanelTabEntity)
                        .where(
                            and(
                                eq(PanelTabEntity.panelId, panel.id),
                                isNotNull(PanelTabEntity.terminalId),
                            ),
                        )
                        .get()!.count
                )
                    throw new HostStateError(
                        "revision_conflict",
                        "Host still owns terminals.",
                    );
                manager.delete(HostEntity).where(eq(HostEntity.id, id)).run();
            });
        },
        async deletePanel(id, expectedRevision) {
            dataSource.transaction((manager) => {
                const panel = manager
                    .select()
                    .from(PanelEntity)
                    .where(eq(PanelEntity.id, id))
                    .get();
                if (!panel) throw new HostStateError("unknown_panel");
                if (panel.revision !== expectedRevision)
                    throw new HostStateError("revision_conflict");
                manager.delete(PanelEntity).where(eq(PanelEntity.id, id)).run();
            });
        },
        async createPanel(input) {
            const panel = panelViewSchema.parse(input);
            dataSource.transaction((manager) => {
                manager.insert(PanelEntity).values(panelRow(panel)).run();
                insertTabs(manager, panel);
            });
        },
        async updatePanel(input, expectedRevision) {
            const panel = panelViewSchema.parse(input);
            if (panel.revision !== expectedRevision + 1)
                throw new HostStateError("revision_conflict");
            dataSource.transaction((manager) => {
                const current = manager
                    .select()
                    .from(PanelEntity)
                    .where(eq(PanelEntity.id, panel.id))
                    .get();
                if (!current) throw new HostStateError("unknown_panel");
                if (current.revision !== expectedRevision)
                    throw new HostStateError("revision_conflict");
                manager
                    .update(PanelEntity)
                    .set(panelRow(panel))
                    .where(
                        and(
                            eq(PanelEntity.id, panel.id),
                            eq(PanelEntity.revision, expectedRevision),
                        ),
                    )
                    .run();
                manager
                    .delete(PanelTabEntity)
                    .where(eq(PanelTabEntity.panelId, panel.id))
                    .run();
                insertTabs(manager, panel);
            });
        },
        createHost: writeHost,
        replaceHost: (host, network, panel, revision) =>
            writeHost(host, network, panel, 0, undefined, revision),
        async saveOperation(input, requestHash) {
            const operation = operationSchema.parse(input);
            return dataSource.transaction((manager) => {
                const existing = manager
                    .select()
                    .from(HostOperationEntity)
                    .where(
                        eq(HostOperationEntity.requestId, operation.requestId),
                    )
                    .get();
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
                    manager
                        .select()
                        .from(HostOperationEntity)
                        .where(
                            and(
                                eq(
                                    HostOperationEntity.panelId,
                                    operation.panelId,
                                ),
                                eq(HostOperationEntity.state, "running"),
                            ),
                        )
                        .get()
                )
                    throw new HostStateError("panel_busy");
                const { targets, error, cleanupErrors, ...rest } = operation;
                const row = {
                    ...rest,
                    requestHash,
                    targetsJson: JSON.stringify(targets),
                    errorJson: json(error),
                    cleanupErrorsJson: JSON.stringify(cleanupErrors),
                };
                manager
                    .insert(HostOperationEntity)
                    .values(row)
                    .onConflictDoUpdate({
                        target: [HostOperationEntity.id],
                        set: row,
                    })
                    .run();
                return operation;
            });
        },
        async purgeBefore(at) {
            return dataSource.transaction((manager) => {
                const rows = manager
                    .select()
                    .from(HostOperationEntity)
                    .where(
                        and(
                            lt(HostOperationEntity.finishedAt, at),
                            eq(HostOperationEntity.cleanupErrorsJson, "[]"),
                        ),
                    )
                    .all();
                for (const row of rows)
                    manager
                        .delete(HostOperationEntity)
                        .where(eq(HostOperationEntity.id, row.id))
                        .run();
                manager
                    .delete(HostExecutionEntity)
                    .where(lt(HostExecutionEntity.endedAt, at))
                    .run();
                return rows.length;
            });
        },
        async recover(at) {
            dataSource.transaction((manager) => {
                for (const row of manager
                    .select()
                    .from(HostOperationEntity)
                    .where(eq(HostOperationEntity.state, "running"))
                    .all()) {
                    const error = {
                        code: "daemon_interrupted",
                        message: "Daemon ended before completion.",
                        stage: "execution",
                    };
                    const operation = operationView(row);
                    manager
                        .update(HostOperationEntity)
                        .set({
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
                        })
                        .where(eq(HostOperationEntity.id, row.id))
                        .run();
                }
                for (const execution of manager
                    .select()
                    .from(HostExecutionEntity)
                    .where(isNull(HostExecutionEntity.endedAt))
                    .all()) {
                    const exit = JSON.stringify({
                        kind: "daemon-ended",
                        message: "Daemon ended before execution cleanup.",
                        at,
                    });
                    manager
                        .update(HostExecutionEntity)
                        .set({ endedAt: at, exitJson: exit })
                        .where(
                            eq(
                                HostExecutionEntity.runtimeId,
                                execution.runtimeId,
                            ),
                        )
                        .run();
                    manager
                        .update(HostAgentEntity)
                        .set({ lastExitJson: exit })
                        .where(
                            and(
                                eq(HostAgentEntity.hostId, execution.hostId),
                                eq(
                                    HostAgentEntity.agentKey,
                                    execution.agentKey,
                                ),
                            ),
                        )
                        .run();
                }
                const changed = new Set<string>();
                for (const tab of manager.select().from(PanelTabEntity).all()) {
                    if (
                        tab.terminalId === null ||
                        tab.presentation === "unavailable"
                    )
                        continue;
                    changed.add(tab.panelId);
                    manager
                        .update(PanelTabEntity)
                        .set({
                            presentation: "unavailable",
                            noticeJson: JSON.stringify({
                                message:
                                    "Terminal is unavailable after daemon restart.",
                                reason: "daemon-ended",
                                restartCommand: "",
                            }),
                        })
                        .where(eq(PanelTabEntity.id, tab.id))
                        .run();
                }
                for (const panel of manager.select().from(PanelEntity).all()) {
                    if (!changed.has(panel.id)) continue;
                    manager
                        .update(PanelEntity)
                        .set({ revision: panel.revision + 1 })
                        .where(eq(PanelEntity.id, panel.id))
                        .run();
                }
            });
        },
    };
}
