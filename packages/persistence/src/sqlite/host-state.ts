import {
    applyRouteOperation,
    type RouteOperation,
    type DirectedRoute,
} from "@aiox/domain";
import {
    hostViewSchema,
    hostNetworkViewSchema,
    panelViewSchema,
    type HostView,
    type HostNetworkView,
    type PanelView,
    type TabView,
    removePanelTabs,
    lastExitSchema,
    type LastExit,
} from "@aiox/protocol";
import type { SqliteClient } from "@effect/sql-sqlite-node/SqliteClient";
import { and, or, eq, inArray, isNull, lt, asc, sql } from "drizzle-orm";
import type { EffectSQLiteNodeDatabase } from "drizzle-orm/effect-sqlite-node";
import * as Effect from "effect/Effect";

import {
    HostEntity,
    HostExecutionEntity,
    HostAgentEntity,
    HostNetworkEntity,
    HostMemberEntity,
    HostEdgeEntity,
    PanelEntity,
    PanelTabEntity,
    DeletedIdEntity,
    type PanelRow,
} from "./host-schema";

export class HostStateError extends Error {
    constructor(
        readonly code:
            | "network_in_use"
            | "revision_conflict"
            | "unknown_panel"
            | "unknown_tab"
            | "id_conflict"
            | "id_deleted"
            | "unknown_host"
            | "unknown_network"
            | "unknown_agent",
        message: string = code,
    ) {
        super(message);
    }
}
/** Latest stored facts a panel command checks inside its transaction. */
export type PanelContext = {
    deleted(id: string): Effect.Effect<boolean, any>;
    tabTaken(id: string): Effect.Effect<boolean, any>;
};
export type HostStateSnapshot = {
    hosts: HostView[];
    networks: HostNetworkView[];
    panels: PanelView[];
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
    getHost(id: string): Promise<HostView | undefined>;
    getNetwork(id: string): Promise<HostNetworkView | undefined>;
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
    /** Removes the tab showing this terminal; resolves with its panel, if any. */
    removeTerminal(id: string): Promise<string | undefined>;
    deleteHost(id: string): Promise<void>;
    /** Replace Host configuration and apply its panel change to the latest stored panel. */
    replaceHost(
        host: HostView,
        network: HostNetworkView,
        panel: (latest: PanelView) => PanelView,
        expectedRevision: number,
    ): Promise<PanelView>;
    deletePanel(id: string): Promise<void>;
    createPanel(panel: PanelView): Promise<void>;
    getPanel(id: string): Promise<PanelView | undefined>;
    /**
     * Create, change or delete (null) one panel against its latest stored state in one
     * transaction, writing only changed rows. The change may throw to reject; nothing is
     * written then. Deleted panel and tab IDs are recorded and never reused.
     */
    applyPanel(
        id: string,
        change: (
            panel: PanelView | undefined,
            context: PanelContext,
        ) => PanelView | null | Effect.Effect<PanelView | null, any>,
    ): Promise<PanelView | null>;
    /** applyPanel for an existing panel; a missing one rejects with unknown_panel or id_deleted. */
    mutatePanel(
        id: string,
        change: (
            panel: PanelView,
            context: PanelContext,
        ) => PanelView | Effect.Effect<PanelView, any>,
    ): Promise<PanelView>;
    createHost(
        host: HostView,
        network: HostNetworkView,
        panel: PanelView,
        createdAt: number,
    ): Promise<void>;
    recover(at: number): Promise<void>;
    purgeBefore(at: number): Promise<number>;
}
const json = (value: unknown) =>
    value === null ? null : JSON.stringify(value);
function panelRow(panel: PanelView): PanelRow {
    const { tabs: _tabs, layout, ...row } = panel;
    return { ...row, layoutJson: JSON.stringify(layout) };
}
function insertTabs(manager: EffectSQLiteNodeDatabase, panel: PanelView) {
    if (panel.tabs.length)
        return manager
            .insert(PanelTabEntity)
            .values(
                panel.tabs.map(({ runtimeId: _runtime, notice, ...tab }) => ({
                    ...tab,
                    panelId: panel.id,
                    noticeJson: json(notice),
                })),
            )
            .returning();
    return Effect.succeed([]);
}
type TabRow = typeof PanelTabEntity.$inferSelect;
function panelView(
    { layoutJson, ...panel }: PanelRow,
    tabs: readonly TabRow[],
): PanelView {
    return panelViewSchema.parse({
        ...panel,
        layout: JSON.parse(layoutJson),
        tabs: tabs.map(({ panelId: _panel, noticeJson, ...tab }) => ({
            ...tab,
            runtimeId: null,
            notice: noticeJson === null ? null : JSON.parse(noticeJson),
        })),
    });
}
function readPanel(
    manager: EffectSQLiteNodeDatabase,
    id: string,
): Effect.Effect<PanelView | undefined, any> {
    return Effect.gen(function* () {
        const row = yield* manager
            .select()
            .from(PanelEntity)
            .where(eq(PanelEntity.id, id))
            .get();
        if (!row) return undefined;
        const tabs = yield* manager
            .select()
            .from(PanelTabEntity)
            .where(eq(PanelTabEntity.panelId, id))
            .orderBy(asc(PanelTabEntity.id))
            .all();
        return panelView(row, tabs);
    });
}
function isDeleted(manager: EffectSQLiteNodeDatabase, id: string) {
    return manager
        .select()
        .from(DeletedIdEntity)
        .where(eq(DeletedIdEntity.id, id))
        .get()
        .pipe(Effect.map(Boolean));
}
function forget(
    manager: EffectSQLiteNodeDatabase,
    kind: "panel" | "tab",
    ids: readonly string[],
) {
    if (ids.length)
        return manager
            .insert(DeletedIdEntity)
            .values(ids.map((id) => ({ id, kind })))
            .onConflictDoNothing()
            .returning();
    return Effect.succeed([]);
}
function hostView(
    { createdAt: _at, ...host }: typeof HostEntity.$inferSelect,
    agents: readonly (typeof HostAgentEntity.$inferSelect)[],
    networks: readonly (typeof HostNetworkEntity.$inferSelect)[],
    members: readonly (typeof HostMemberEntity.$inferSelect)[],
    panels: readonly PanelRow[],
): HostView {
    const network = networks.find((n) => n.hostId === host.id);
    const panel = panels.find((p) => p.hostId === host.id);
    if (!network || !panel)
        throw new Error(`Incomplete stored Host ${host.id}`);
    return hostViewSchema.parse({
        ...host,
        panelId: panel.id,
        networkId: network.id,
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
                        m.networkId === network.id && m.agentKey === a.agentKey,
                ),
                runtime: null,
                lastTerminalId: a.lastTerminalId,
                lastExit:
                    a.lastExitJson === null ? null : JSON.parse(a.lastExitJson),
            })),
    });
}
function panelContext(manager: EffectSQLiteNodeDatabase): PanelContext {
    return {
        deleted: (id) => isDeleted(manager, id),
        tabTaken: (id) =>
            manager
                .select()
                .from(PanelTabEntity)
                .where(eq(PanelTabEntity.id, id))
                .get()
                .pipe(Effect.map(Boolean)),
    };
}
function tabRow(
    panelId: string,
    { runtimeId: _runtime, notice, ...tab }: TabView,
) {
    return { ...tab, panelId, noticeJson: json(notice) };
}
/** Write only the panel fields and tab rows that differ; removed tabs are never reused. */
function writePanel(
    manager: EffectSQLiteNodeDatabase,
    current: PanelView,
    next: PanelView,
): Effect.Effect<PanelView, any> {
    return Effect.gen(function* () {
        const before = new Map(
            current.tabs.map((t) => [t.id, tabRow(current.id, t)]),
        );
        const after = new Map(
            next.tabs.map((t) => [t.id, tabRow(current.id, t)]),
        );
        const removed = [...before.keys()].filter((id) => !after.has(id));
        let changed = removed.length > 0;
        for (const id of removed)
            yield* manager
                .delete(PanelTabEntity)
                .where(eq(PanelTabEntity.id, id))
                .returning();
        yield* forget(manager, "tab", removed);
        for (const [id, row] of after) {
            const old = before.get(id);
            if (!old)
                yield* manager.insert(PanelTabEntity).values(row).returning();
            else if (JSON.stringify(old) !== JSON.stringify(row))
                yield* manager
                    .update(PanelTabEntity)
                    .set(row)
                    .where(eq(PanelTabEntity.id, id))
                    .returning();
            else continue;
            changed = true;
        }
        const layoutJson = JSON.stringify(next.layout);
        if (
            !changed &&
            next.name === current.name &&
            layoutJson === JSON.stringify(current.layout)
        )
            return current;
        const revision = current.revision + 1;
        yield* manager
            .update(PanelEntity)
            .set({
                name: next.name,
                layoutJson,
                revision,
            })
            .where(eq(PanelEntity.id, current.id))
            .returning();
        return { ...next, revision };
    });
}
function networkView(
    n: typeof HostNetworkEntity.$inferSelect,
    members: (typeof HostMemberEntity.$inferSelect)[],
    edges: (typeof HostEdgeEntity.$inferSelect)[],
): HostNetworkView {
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
}

export function hostState(
    dataSource: EffectSQLiteNodeDatabase,
    run: <A, E>(effect: Effect.Effect<A, E, SqliteClient>) => Promise<A>,
): HostState {
    const manager = dataSource;
    // ponytail: scan local Host collections per snapshot; use indexed joins if measured scale requires it.
    async function snapshot(): Promise<HostStateSnapshot> {
        return run(
            Effect.gen(function* () {
                const hosts = yield* manager
                    .select()
                    .from(HostEntity)
                    .orderBy(asc(HostEntity.createdAt), asc(HostEntity.id))
                    .all();
                const agents = yield* manager
                    .select()
                    .from(HostAgentEntity)
                    .orderBy(asc(HostAgentEntity.ordinal))
                    .all();
                const networks = yield* manager
                    .select()
                    .from(HostNetworkEntity)
                    .all();
                const members =
                    networks.length === 0
                        ? []
                        : yield* manager
                              .select()
                              .from(HostMemberEntity)
                              .where(
                                  inArray(
                                      HostMemberEntity.networkId,
                                      networks.map((network) => network.id),
                                  ),
                              )
                              .all();
                const edges = yield* manager
                    .select()
                    .from(HostEdgeEntity)
                    .all();
                const panels = yield* manager
                    .select()
                    .from(PanelEntity)
                    .orderBy(asc(PanelEntity.id))
                    .all();
                const tabs = yield* manager
                    .select()
                    .from(PanelTabEntity)
                    .orderBy(asc(PanelTabEntity.id))
                    .all();
                return {
                    hosts: hosts.map((host) =>
                        hostView(host, agents, networks, members, panels),
                    ),
                    networks: networks.map((n) =>
                        networkView(n, members, edges),
                    ),
                    panels: panels.map((panel) =>
                        panelView(
                            panel,
                            tabs.filter((t) => t.panelId === panel.id),
                        ),
                    ),
                };
            }),
        );
    }
    function applyPanel(
        id: string,
        change: (
            panel: PanelView | undefined,
            context: PanelContext,
        ) => PanelView | null | Effect.Effect<PanelView | null, any>,
    ): Promise<PanelView | null> {
        return run(
            dataSource.transaction((manager) =>
                Effect.gen(function* () {
                    const current = yield* readPanel(manager, id);
                    const context = panelContext(manager);
                    const changed = change(
                        current && structuredClone(current),
                        context,
                    );
                    const result = Effect.isEffect(changed)
                        ? yield* changed
                        : changed;
                    if (result === null) {
                        if (!current) return null;
                        yield* forget(manager, "panel", [id]);
                        yield* forget(
                            manager,
                            "tab",
                            current.tabs.map((t) => t.id),
                        );
                        yield* manager
                            .delete(PanelEntity)
                            .where(eq(PanelEntity.id, id))
                            .returning();
                        return null;
                    }
                    const next = panelViewSchema.parse(result);
                    if (!current) {
                        if (next.id !== id || (yield* context.deleted(id)))
                            throw new HostStateError("id_deleted");
                        for (const tab of next.tabs)
                            if (yield* context.deleted(tab.id))
                                throw new HostStateError("id_deleted");
                        for (const tab of next.tabs)
                            if (yield* context.tabTaken(tab.id))
                                throw new HostStateError("id_conflict");
                        yield* manager
                            .insert(PanelEntity)
                            .values(panelRow(next))
                            .returning();
                        yield* insertTabs(manager, next);
                        return next;
                    }
                    if (
                        next.id !== current.id ||
                        next.kind !== current.kind ||
                        next.hostId !== current.hostId
                    )
                        throw new Error(
                            "A panel change cannot replace the panel.",
                        );
                    return yield* writePanel(manager, current, next);
                }),
            ),
        );
    }
    function writeHost(
        input: HostView,
        networkInput: HostNetworkView,
        panelInput: PanelView | ((latest: PanelView) => PanelView),
        createdAt: number,
        expectedRevision?: number,
    ): Effect.Effect<PanelView, any> {
        const host = hostViewSchema.parse(input),
            network = hostNetworkViewSchema.parse(networkInput);
        return dataSource.transaction((manager) =>
            Effect.gen(function* () {
                let panel: PanelView;
                if (expectedRevision !== undefined) {
                    const previous = yield* manager
                        .select()
                        .from(HostEntity)
                        .where(eq(HostEntity.id, host.id))
                        .get();
                    if (!previous) throw new HostStateError("unknown_host");
                    if (previous.revision !== expectedRevision)
                        throw new HostStateError("revision_conflict");
                    const previousPanel = yield* manager
                        .select()
                        .from(PanelEntity)
                        .where(eq(PanelEntity.hostId, host.id))
                        .get();
                    const latest =
                        previousPanel &&
                        (yield* readPanel(manager, previousPanel.id));
                    if (!latest) throw new HostStateError("unknown_panel");
                    // User moves since the caller read the panel stay; only the Host change applies.
                    panel = panelViewSchema.parse(
                        (panelInput as (latest: PanelView) => PanelView)(
                            structuredClone(latest),
                        ),
                    );
                    if (panel.id !== latest.id)
                        throw new Error("Invalid Host references");
                    panel.revision = latest.revision + 1;
                    const kept = new Set(panel.tabs.map((t) => t.id));
                    yield* forget(
                        manager,
                        "tab",
                        latest.tabs
                            .map((t) => t.id)
                            .filter((id) => !kept.has(id)),
                    );
                    createdAt = previous.createdAt;
                    yield* manager
                        .delete(HostEntity)
                        .where(eq(HostEntity.id, host.id))
                        .returning();
                } else panel = panelViewSchema.parse(panelInput as PanelView);
                if (
                    network.hostId !== host.id ||
                    host.networkId !== network.id ||
                    host.panelId !== panel.id ||
                    panel.hostId !== host.id ||
                    panel.networkId !== network.id ||
                    panel.kind !== "host" ||
                    network.members.some(
                        (m) =>
                            !host.agents.some(
                                (a) => a.key === m.agentKey && a.member,
                            ),
                    ) ||
                    host.agents.some(
                        (a) =>
                            a.member !==
                            network.members.some((m) => m.agentKey === a.key),
                    )
                )
                    throw new Error("Invalid Host references");
                yield* manager
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
                    .returning();
                if (host.agents.length)
                    yield* manager
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
                        .returning();
                yield* manager
                    .insert(HostNetworkEntity)
                    .values({
                        id: network.id,
                        hostId: host.id,
                        name: network.name,
                        defaultPolicy: network.default,
                    })
                    .returning();
                if (network.members.length)
                    yield* manager
                        .insert(HostMemberEntity)
                        .values(
                            network.members.map((m) => ({
                                networkId: network.id,
                                agentKey: m.agentKey,
                            })),
                        )
                        .returning();
                const explicit = network.edges.filter(
                    (e) => e.source !== "manifest-default",
                );
                if (explicit.length)
                    yield* manager
                        .insert(HostEdgeEntity)
                        .values(
                            explicit.map((e) => ({
                                networkId: network.id,
                                fromKey: e.from,
                                toKey: e.to,
                                manifestPolicy:
                                    e.source === "manifest-edge"
                                        ? e.policy
                                        : null,
                                overridePolicy:
                                    e.source === "runtime-override"
                                        ? e.policy
                                        : null,
                            })),
                        )
                        .returning();
                yield* manager
                    .insert(PanelEntity)
                    .values(panelRow(panel))
                    .returning();
                yield* insertTabs(manager, panel);
                return panel;
            }),
        );
    }

    return {
        snapshot,
        async getNetwork(id) {
            return run(
                Effect.gen(function* () {
                    const network = yield* manager
                        .select()
                        .from(HostNetworkEntity)
                        .where(eq(HostNetworkEntity.id, id))
                        .get();
                    if (!network) return undefined;
                    const members = yield* manager
                        .select()
                        .from(HostMemberEntity)
                        .where(eq(HostMemberEntity.networkId, id))
                        .all();
                    const edges = yield* manager
                        .select()
                        .from(HostEdgeEntity)
                        .where(eq(HostEdgeEntity.networkId, id))
                        .all();
                    return networkView(network, members, edges);
                }),
            );
        },
        async routeNetwork(hostId, networkId, operation) {
            await run(
                dataSource.transaction((manager) =>
                    Effect.gen(function* () {
                        const network = yield* manager
                            .select()
                            .from(HostNetworkEntity)
                            .where(
                                and(
                                    eq(HostNetworkEntity.id, networkId),
                                    eq(HostNetworkEntity.hostId, hostId),
                                ),
                            )
                            .get();
                        if (!network)
                            throw new HostStateError("unknown_network");
                        const members = yield* manager
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
                                (edge) =>
                                    !members.some(
                                        (member) =>
                                            member.agentKey === edge.from,
                                    ) ||
                                    !members.some(
                                        (member) => member.agentKey === edge.to,
                                    ),
                            )
                        )
                            throw new HostStateError("unknown_agent");
                        for (const { from, to } of pairs) {
                            const key = { networkId, fromKey: from, toKey: to };
                            const current = yield* manager
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
                                yield* manager
                                    .delete(HostEdgeEntity)
                                    .where(
                                        and(
                                            eq(
                                                HostEdgeEntity.networkId,
                                                networkId,
                                            ),
                                            eq(HostEdgeEntity.fromKey, from),
                                            eq(HostEdgeEntity.toKey, to),
                                        ),
                                    )
                                    .returning();
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
                            yield* manager
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
                                .returning();
                        }
                    }),
                ),
            );
        },
        async applyAgent(hostId, agent, routes) {
            await run(
                dataSource.transaction((manager) =>
                    Effect.gen(function* () {
                        const host = yield* manager
                            .select()
                            .from(HostEntity)
                            .where(eq(HostEntity.id, hostId))
                            .get();
                        if (!host) throw new HostStateError("unknown_host");
                        const network = yield* manager
                            .select()
                            .from(HostNetworkEntity)
                            .where(eq(HostNetworkEntity.hostId, hostId))
                            .get();
                        if (!network)
                            throw new HostStateError("unknown_network");
                        const agents = yield* manager
                            .select()
                            .from(HostAgentEntity)
                            .where(eq(HostAgentEntity.hostId, hostId))
                            .all();
                        const previous = agents.find(
                            (a) => a.agentKey === agent.key,
                        );
                        const row = {
                            hostId,
                            agentKey: agent.key,
                            ordinal:
                                previous?.ordinal ??
                                Math.max(-1, ...agents.map((a) => a.ordinal)) +
                                    1,
                            adapter: agent.adapter,
                            role: agent.role,
                            description: agent.description,
                            instruction: agent.instruction,
                            argsJson: JSON.stringify(agent.args),
                            lastTerminalId: previous?.lastTerminalId ?? null,
                            lastExitJson: previous?.lastExitJson ?? null,
                        };
                        const networkId = network.id;
                        yield* manager
                            .insert(HostAgentEntity)
                            .values(row)
                            .onConflictDoUpdate({
                                target: [
                                    HostAgentEntity.hostId,
                                    HostAgentEntity.agentKey,
                                ],
                                set: row,
                            })
                            .returning();
                        yield* manager
                            .delete(HostMemberEntity)
                            .where(
                                and(
                                    eq(HostMemberEntity.networkId, networkId),
                                    eq(HostMemberEntity.agentKey, agent.key),
                                ),
                            )
                            .returning();
                        if (agent.member)
                            yield* manager
                                .insert(HostMemberEntity)
                                .values({ networkId, agentKey: agent.key })
                                .returning();
                        yield* manager
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
                            .returning();
                        if (agent.member) {
                            const members = yield* manager
                                .select()
                                .from(HostMemberEntity)
                                .where(
                                    eq(HostMemberEntity.networkId, networkId),
                                )
                                .all();
                            for (const route of routes.filter(
                                (edge) =>
                                    edge.from === agent.key ||
                                    edge.to === agent.key,
                            )) {
                                if (
                                    !members.some(
                                        (member) =>
                                            member.agentKey === route.from,
                                    ) ||
                                    !members.some(
                                        (member) =>
                                            member.agentKey === route.to,
                                    )
                                ) {
                                    throw new HostStateError(
                                        "unknown_agent",
                                        `Route references unknown agent: ${route.from} -> ${route.to}`,
                                    );
                                }
                                yield* manager
                                    .insert(HostEdgeEntity)
                                    .values({
                                        networkId,
                                        fromKey: route.from,
                                        toKey: route.to,
                                        manifestPolicy: route.policy,
                                        overridePolicy: null,
                                    })
                                    .returning();
                            }
                        }
                        yield* manager
                            .update(HostEntity)
                            .set({ revision: host.revision + 1 })
                            .where(eq(HostEntity.id, hostId))
                            .returning();
                    }),
                ),
            );
        },
        async failStart(hostId, agentKey, message, restartCommand, tabId) {
            await run(
                dataSource.transaction((manager) =>
                    Effect.gen(function* () {
                        const live = yield* manager
                            .select()
                            .from(HostExecutionEntity)
                            .where(
                                and(
                                    eq(HostExecutionEntity.hostId, hostId),
                                    eq(HostExecutionEntity.agentKey, agentKey),
                                    isNull(HostExecutionEntity.endedAt),
                                ),
                            )
                            .get();
                        if (live)
                            throw new Error(
                                "Cannot mark a live execution as failed start.",
                            );
                        const panel = yield* manager
                            .select()
                            .from(PanelEntity)
                            .where(eq(PanelEntity.hostId, hostId))
                            .get();
                        if (!panel) throw new Error("Missing stored panel.");
                        const tab = yield* manager
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
                        yield* manager
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
                            .returning();
                        yield* manager
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
                            .returning();
                        yield* manager
                            .update(PanelEntity)
                            .set({
                                revision: sql`${PanelEntity.revision} + 1`,
                            })
                            .where(eq(PanelEntity.id, panel.id))
                            .returning();
                    }),
                ),
            );
        },
        async startExecution(input) {
            await run(
                dataSource.transaction((manager) =>
                    Effect.gen(function* () {
                        const panel = yield* manager
                            .select()
                            .from(PanelEntity)
                            .where(eq(PanelEntity.hostId, input.hostId))
                            .get();
                        const agent = yield* manager
                            .select()
                            .from(HostAgentEntity)
                            .where(
                                and(
                                    eq(HostAgentEntity.hostId, input.hostId),
                                    eq(
                                        HostAgentEntity.agentKey,
                                        input.agentKey,
                                    ),
                                ),
                            )
                            .get();
                        const tab =
                            panel &&
                            (yield* manager
                                .select()
                                .from(PanelTabEntity)
                                .where(
                                    and(
                                        eq(PanelTabEntity.panelId, panel.id),
                                        eq(
                                            PanelTabEntity.terminalId,
                                            input.terminalId,
                                        ),
                                        eq(
                                            PanelTabEntity.agentKey,
                                            input.agentKey,
                                        ),
                                    ),
                                )
                                .get());
                        if (!agent || !tab)
                            throw new Error(
                                "Managed Agent does not own panel terminal.",
                            );
                        const active = yield* manager
                            .select()
                            .from(HostExecutionEntity)
                            .where(
                                and(
                                    eq(
                                        HostExecutionEntity.hostId,
                                        input.hostId,
                                    ),
                                    eq(
                                        HostExecutionEntity.agentKey,
                                        input.agentKey,
                                    ),
                                    isNull(HostExecutionEntity.endedAt),
                                ),
                            )
                            .get();
                        if (active)
                            throw new Error(
                                "Managed Agent already has execution awaiting cleanup.",
                            );
                        yield* manager
                            .insert(HostExecutionEntity)
                            .values({
                                ...input,
                                endedAt: null,
                                exitJson: null,
                            })
                            .returning();
                        yield* manager
                            .update(HostAgentEntity)
                            .set({ lastTerminalId: input.terminalId })
                            .where(
                                and(
                                    eq(HostAgentEntity.hostId, input.hostId),
                                    eq(
                                        HostAgentEntity.agentKey,
                                        input.agentKey,
                                    ),
                                ),
                            )
                            .returning();
                        yield* manager
                            .update(PanelTabEntity)
                            .set({
                                presentation: "preparing",
                                noticeJson: null,
                            })
                            .where(eq(PanelTabEntity.id, tab.id))
                            .returning();
                        yield* manager
                            .update(PanelEntity)
                            .set({
                                revision: sql`${PanelEntity.revision} + 1`,
                            })
                            .where(eq(PanelEntity.id, panel.id))
                            .returning();
                    }),
                ),
            );
        },
        async finishExecution(runtimeId, input, restartCommand) {
            const exit = lastExitSchema.parse(input);
            await run(
                dataSource.transaction((manager) =>
                    Effect.gen(function* () {
                        const execution = yield* manager
                            .select()
                            .from(HostExecutionEntity)
                            .where(
                                and(
                                    eq(
                                        HostExecutionEntity.runtimeId,
                                        runtimeId,
                                    ),
                                    isNull(HostExecutionEntity.endedAt),
                                ),
                            )
                            .get();
                        if (!execution) return;
                        yield* manager
                            .update(HostExecutionEntity)
                            .set({
                                endedAt: exit.at,
                                exitJson: json(exit),
                            })
                            .where(eq(HostExecutionEntity.runtimeId, runtimeId))
                            .returning();
                        yield* manager
                            .update(HostAgentEntity)
                            .set({
                                lastExitJson: json(exit),
                            })
                            .where(
                                and(
                                    eq(
                                        HostAgentEntity.hostId,
                                        execution.hostId,
                                    ),
                                    eq(
                                        HostAgentEntity.agentKey,
                                        execution.agentKey,
                                    ),
                                ),
                            )
                            .returning();
                        const panel = yield* manager
                            .select()
                            .from(PanelEntity)
                            .where(eq(PanelEntity.hostId, execution.hostId))
                            .get();
                        const tab =
                            panel &&
                            (yield* manager
                                .select()
                                .from(PanelTabEntity)
                                .where(
                                    and(
                                        eq(PanelTabEntity.panelId, panel.id),
                                        eq(
                                            PanelTabEntity.terminalId,
                                            execution.terminalId,
                                        ),
                                        eq(
                                            PanelTabEntity.agentKey,
                                            execution.agentKey,
                                        ),
                                    ),
                                )
                                .get());
                        if (!tab) return;
                        yield* manager
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
                                              message:
                                                  exit.message ??
                                                  "Agent stopped.",
                                              reason: exit.kind,
                                              restartCommand,
                                          }),
                            })
                            .where(eq(PanelTabEntity.id, tab.id))
                            .returning();
                        yield* manager
                            .update(PanelEntity)
                            .set({
                                revision: sql`${PanelEntity.revision} + 1`,
                            })
                            .where(eq(PanelEntity.id, panel!.id))
                            .returning();
                    }),
                ),
            );
        },
        async removeTerminal(id) {
            return run(
                dataSource.transaction((manager) =>
                    Effect.gen(function* () {
                        const tab = yield* manager
                            .select()
                            .from(PanelTabEntity)
                            .where(eq(PanelTabEntity.terminalId, id))
                            .get();
                        if (!tab) return undefined;
                        const panel = yield* manager
                            .select()
                            .from(PanelEntity)
                            .where(eq(PanelEntity.id, tab.panelId))
                            .get();
                        if (!panel) throw new Error("Missing stored panel.");
                        const next = removePanelTabs(
                            {
                                layout: JSON.parse(panel.layoutJson),
                            },
                            new Set([tab.id]),
                        );
                        yield* manager
                            .delete(PanelTabEntity)
                            .where(eq(PanelTabEntity.id, tab.id))
                            .returning();
                        yield* forget(manager, "tab", [tab.id]);
                        yield* manager
                            .update(PanelEntity)
                            .set({
                                layoutJson: JSON.stringify(next.layout),
                                revision: panel.revision + 1,
                            })
                            .where(eq(PanelEntity.id, panel.id))
                            .returning();
                        return panel.id;
                    }),
                ),
            );
        },
        async deleteHost(id) {
            await run(
                dataSource.transaction((manager) =>
                    Effect.gen(function* () {
                        const host = yield* manager
                            .select()
                            .from(HostEntity)
                            .where(eq(HostEntity.id, id))
                            .get();
                        if (!host) throw new HostStateError("unknown_host");
                        const panel = yield* manager
                            .select()
                            .from(PanelEntity)
                            .where(eq(PanelEntity.hostId, id))
                            .get();
                        if (!panel) throw new HostStateError("unknown_panel");
                        const tabs = yield* manager
                            .select()
                            .from(PanelTabEntity)
                            .where(eq(PanelTabEntity.panelId, panel.id))
                            .all();
                        if (tabs.some((tab) => tab.terminalId !== null)) {
                            throw new HostStateError(
                                "revision_conflict",
                                "Host still owns terminals.",
                            );
                        }
                        yield* forget(manager, "panel", [panel.id]);
                        yield* forget(
                            manager,
                            "tab",
                            tabs.map((tab) => tab.id),
                        );
                        yield* manager
                            .delete(HostEntity)
                            .where(eq(HostEntity.id, id))
                            .returning();
                    }),
                ),
            );
        },
        async deletePanel(id) {
            await applyPanel(id, (panel, context) =>
                Effect.gen(function* () {
                    if (!panel)
                        throw new HostStateError(
                            (yield* context.deleted(id))
                                ? "id_deleted"
                                : "unknown_panel",
                            "No such panel.",
                        );
                    return null;
                }),
            );
        },
        async createPanel(input) {
            await applyPanel(input.id, (panel, context) =>
                Effect.gen(function* () {
                    if (yield* context.deleted(input.id))
                        throw new HostStateError("id_deleted");
                    if (panel) throw new HostStateError("id_conflict");
                    return input;
                }),
            );
        },
        async getPanel(id) {
            return run(readPanel(manager, id));
        },
        applyPanel,
        async mutatePanel(id, change) {
            return (await applyPanel(id, (panel, context) =>
                Effect.gen(function* () {
                    if (!panel)
                        throw new HostStateError(
                            (yield* context.deleted(id))
                                ? "id_deleted"
                                : "unknown_panel",
                            "No such panel.",
                        );
                    const result = change(panel, context);
                    return Effect.isEffect(result) ? yield* result : result;
                }),
            ))!;
        },
        async createHost(host, network, panel, createdAt) {
            await run(writeHost(host, network, panel, createdAt));
        },
        async replaceHost(host, network, panel, revision) {
            return run(writeHost(host, network, panel, 0, revision));
        },
        async getHost(id) {
            return run(
                Effect.gen(function* () {
                    const row = yield* manager
                        .select()
                        .from(HostEntity)
                        .where(eq(HostEntity.id, id))
                        .get();
                    if (!row) return undefined;
                    const agents = yield* manager
                        .select()
                        .from(HostAgentEntity)
                        .where(eq(HostAgentEntity.hostId, id))
                        .orderBy(asc(HostAgentEntity.ordinal))
                        .all();
                    const networks = yield* manager
                        .select()
                        .from(HostNetworkEntity)
                        .where(eq(HostNetworkEntity.hostId, id))
                        .all();
                    const members = yield* manager
                        .select()
                        .from(HostMemberEntity)
                        .all();
                    const panels = yield* manager
                        .select()
                        .from(PanelEntity)
                        .where(eq(PanelEntity.hostId, id))
                        .all();
                    return hostView(row, agents, networks, members, panels);
                }),
            );
        },
        async purgeBefore(at) {
            const deleted = await run(
                manager
                    .delete(HostExecutionEntity)
                    .where(lt(HostExecutionEntity.endedAt, at))
                    .returning({ runtimeId: HostExecutionEntity.runtimeId }),
            );
            return deleted.length;
        },
        async recover(at) {
            await run(
                dataSource.transaction((manager) =>
                    Effect.gen(function* () {
                        const executions = yield* manager
                            .select()
                            .from(HostExecutionEntity)
                            .where(isNull(HostExecutionEntity.endedAt))
                            .all();
                        for (const execution of executions) {
                            const exit = JSON.stringify({
                                kind: "daemon-ended",
                                message:
                                    "Daemon ended before execution cleanup.",
                                at,
                            });
                            yield* manager
                                .update(HostExecutionEntity)
                                .set({
                                    endedAt: at,
                                    exitJson: exit,
                                })
                                .where(
                                    eq(
                                        HostExecutionEntity.runtimeId,
                                        execution.runtimeId,
                                    ),
                                )
                                .returning();
                            yield* manager
                                .update(HostAgentEntity)
                                .set({ lastExitJson: exit })
                                .where(
                                    and(
                                        eq(
                                            HostAgentEntity.hostId,
                                            execution.hostId,
                                        ),
                                        eq(
                                            HostAgentEntity.agentKey,
                                            execution.agentKey,
                                        ),
                                    ),
                                )
                                .returning();
                        }
                        const changed = new Set<string>();
                        const tabs = yield* manager
                            .select()
                            .from(PanelTabEntity)
                            .all();
                        for (const tab of tabs) {
                            if (
                                tab.terminalId === null &&
                                tab.agentKey === null &&
                                tab.presentation === "preparing"
                            ) {
                                changed.add(tab.panelId);
                                yield* manager
                                    .update(PanelTabEntity)
                                    .set({
                                        presentation: "start-failed",
                                        noticeJson: JSON.stringify({
                                            message:
                                                "Shell was not ready before daemon restart.",
                                            reason: "daemon-ended",
                                            restartCommand: "",
                                        }),
                                    })
                                    .where(eq(PanelTabEntity.id, tab.id))
                                    .returning();
                                continue;
                            }
                            if (
                                tab.terminalId === null ||
                                tab.presentation === "unavailable"
                            )
                                continue;
                            changed.add(tab.panelId);
                            yield* manager
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
                                .returning();
                        }
                        const panels = yield* manager
                            .select()
                            .from(PanelEntity)
                            .all();
                        for (const panel of panels) {
                            if (!changed.has(panel.id)) continue;
                            yield* manager
                                .update(PanelEntity)
                                .set({
                                    revision: panel.revision + 1,
                                })
                                .where(eq(PanelEntity.id, panel.id))
                                .returning();
                        }
                    }),
                ),
            );
        },
    };
}
