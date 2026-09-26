import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

import {
    parseConfig,
    parseHostLayout,
    type AioxConfig,
    type HostLayout,
} from "./configuration";
import {
    agentViewSchema,
    agentStatusSchema,
    agentRunSchema,
    networkViewSchema,
    terminalViewSchema,
    webNotificationViewSchema,
    terminalContextSchema,
    policySchema,
    portsSchema,
} from "./core";
import {
    compatible,
    fromUnknown,
    strictStruct,
    mutableArray,
    type CompatibleSchema,
} from "./schema-compat";

const id = Schema.String.check(
    Schema.makeFilter((v) => v.length > 0 || "Expected non-empty string"),
);
const text = Schema.String.check(
    Schema.makeFilter(
        (v) => !v.includes("\0") || "String must not contain NUL",
    ),
);
const nonblank = text.check(
    Schema.makeFilter(
        (v) => v.trim().length > 0 || "Expected non-blank string",
    ),
);
const name = nonblank.check(
    Schema.makeFilter((v) => !v.includes("/") || "Name must not contain /"),
);
const positive = Schema.Int.check(Schema.isGreaterThan(0));
const timestamp = Schema.Natural;
const requestId = Schema.String.check(Schema.isUUID());

// The same pure parsers serve file loading and the public wire schemas.
export type LayoutInput = {
    preset?: HostLayout["preset"];
    columns?: number;
    rows?: number;
};
export const layoutInputSchema = compatible(
    fromUnknown((value) => {
        parseHostLayout(value);
        return value as LayoutInput;
    }),
);
export const hostLayoutSchema = compatible(
    fromUnknown((value) => parseHostLayout(value)),
);
export type StoredConfig = Omit<
    Partial<AioxConfig>,
    "ports" | "messages" | "host" | "appearance"
> & {
    ports?: Partial<AioxConfig["ports"]>;
    messages?: Partial<AioxConfig["messages"]>;
    host?: { layout?: LayoutInput };
    appearance?: Partial<NonNullable<AioxConfig["appearance"]>>;
};
export const keybindingsSchema = compatible(
    fromUnknown((value) => parseConfig({ keybindings: value }).keybindings!),
);
export const storedConfigSchema = compatible(
    fromUnknown((value) => {
        parseConfig(value);
        return value as StoredConfig;
    }),
);
export const effectiveConfigSchema = compatible(
    fromUnknown((value) => parseConfig(value)),
);
export const configViewSchema = compatible(
    strictStruct({
        revision: id,
        stored: storedConfigSchema,
        effective: effectiveConfigSchema,
        runningPorts: portsSchema,
        restartRequired: Schema.Boolean,
    }),
);
export const putConfigRequestSchema = compatible(
    strictStruct({
        revision: id,
        stored: storedConfigSchema,
    }),
);
export const hostSourceSchema = compatible(
    strictStruct({
        directory: nonblank.check(
            Schema.makeFilter((v) =>
                v.startsWith("/") ||
                /^[A-Za-z]:[\\/]/.test(v) ||
                /^\\\\[^\\]+\\[^\\]+/.test(v)
                    ? undefined
                    : "Expected an absolute directory",
            ),
        ),
        file: Schema.optional(nonblank),
    }),
);
const invocationFields = {
    env: Schema.optional(agentRunSchema.fields.env),
    terminalContext: Schema.optional(terminalContextSchema),
};
export const invocationSchema = compatible(strictStruct(invocationFields));
const hostRestartFields = {
    requestId,
    source: hostSourceSchema,
    ...invocationFields,
};
export const hostControlRequestSchema = compatible(strictStruct({ requestId }));
export const hostRestartRequestSchema = compatible(
    strictStruct(hostRestartFields),
);
export const hostRunRequestSchema = compatible(
    strictStruct({
        ...hostRestartFields,
        layout: Schema.optional(layoutInputSchema),
    }),
);
export const hostResolveRequestSchema = compatible(
    strictStruct({
        source: hostSourceSchema,
    }),
);
export const hostResolveResultSchema = compatible(strictStruct({ hostId: id }));
const agentKeys = mutableArray(name)
    .check(Schema.isMinLength(1))
    .pipe(
        Schema.decodeTo(mutableArray(name), {
            decode: SchemaGetter.transform((keys) => [...new Set(keys)]),
            encode: SchemaGetter.transform((keys) => keys),
        }),
    );
export const hostAgentStartRequestSchema = compatible(
    strictStruct({
        ...hostRestartFields,
        agents: agentKeys,
    }),
);
export const hostAgentRestartRequestSchema = hostAgentStartRequestSchema;
export const hostAgentStopRequestSchema = compatible(
    strictStruct({
        agents: agentKeys,
        requestId,
    }),
);
export const lastExitSchema = compatible(
    strictStruct({
        kind: Schema.Literals([
            "stopped",
            "exited",
            "crashed",
            "start-failed",
            "daemon-ended",
        ]),
        message: Schema.NullOr(Schema.String),
        at: timestamp,
    }),
);
export const managedRuntimeSchema = compatible(
    strictStruct({
        id,
        terminalId: id,
        phase: Schema.Literals(["preparing", "running", "stopping"]),
        status: agentStatusSchema,
        status_reason: Schema.NullOr(Schema.String),
        observation_error: Schema.NullOr(Schema.String),
        collaborationActive: Schema.Boolean,
        collaborationError: Schema.NullOr(Schema.String),
    }),
);
export const managedAgentViewSchema = compatible(
    strictStruct({
        key: name,
        adapter: Schema.Literals(["claude", "codex"]),
        role: Schema.NullOr(nonblank),
        description: Schema.NullOr(text),
        instruction: text,
        args: mutableArray(text),
        member: Schema.Boolean,
        runtime: Schema.NullOr(managedRuntimeSchema),
        lastTerminalId: Schema.NullOr(id),
        lastExit: Schema.NullOr(lastExitSchema),
    }),
);
export const hostViewSchema = compatible(
    strictStruct({
        id,
        name,
        directory: nonblank,
        sourceFile: nonblank,
        instruction: text,
        panelId: id,
        networkId: id,
        revision: positive,
        agents: mutableArray(managedAgentViewSchema)
            .check(Schema.isMinLength(1))
            .check(
                Schema.makeFilter((agents) =>
                    new Set(agents.map((a) => a.key)).size === agents.length
                        ? undefined
                        : "Duplicate managed Agent key",
                ),
            ),
    }),
);
export const hostNetworkViewSchema = compatible(
    strictStruct({
        id,
        hostId: id,
        name,
        scope: Schema.Literal("host"),
        default: policySchema,
        members: mutableArray(
            strictStruct({
                agentKey: name,
                runtimeId: Schema.NullOr(id),
            }),
        ),
        edges: mutableArray(
            strictStruct({
                from: name,
                to: name,
                fromRuntimeId: Schema.NullOr(id),
                toRuntimeId: Schema.NullOr(id),
                policy: policySchema,
                source: Schema.Literals([
                    "runtime-override",
                    "manifest-edge",
                    "manifest-default",
                ]),
            }),
        ),
    }).check(
        Schema.makeFilter((network) => {
            const members = new Set(network.members.map((m) => m.agentKey));
            const edges = network.edges.map((e) =>
                JSON.stringify([e.from, e.to]),
            );
            return members.size === network.members.length &&
                new Set(edges).size === edges.length &&
                edges.length === members.size * (members.size - 1) &&
                !network.edges.some(
                    (e) =>
                        e.from === e.to ||
                        !members.has(e.from) ||
                        !members.has(e.to),
                )
                ? undefined
                : "Host Network edges must cover each distinct member pair once";
        }),
    ),
);
const commandErrorFields = {
    code: id,
    message: Schema.String,
    stage: Schema.Literals([
        "config",
        "yaml",
        "cli",
        "environment",
        "execution",
        "cleanup",
        "storage",
    ]),
    field: Schema.optional(Schema.String),
    agentKey: Schema.optional(Schema.String),
};
export const commandErrorSchema = compatible(strictStruct(commandErrorFields));
export const hostErrorSchema = compatible(
    strictStruct({
        ...commandErrorFields,
        candidates: Schema.optional(mutableArray(Schema.String)),
    }),
);
export const hostCommandSchema = compatible(
    Schema.Literals([
        "host.run",
        "host.restart",
        "host.stop",
        "host.delete",
        "host.agent.start",
        "host.agent.restart",
        "host.agent.stop",
    ]),
);
/** The actual outcome of one Host target; a failed sibling does not undo it. */
export const hostTargetResultSchema = compatible(
    strictStruct({
        agentKey: Schema.NullOr(name),
        terminalId: Schema.NullOr(id),
        state: Schema.Literals(["ready", "stopped", "unchanged", "failed"]),
        error: Schema.NullOr(commandErrorSchema),
    }),
);
/** The HTTP result of a finished Host command; it is neither stored nor listed. */
export const hostCommandResultSchema = compatible(
    strictStruct({
        requestId,
        command: hostCommandSchema,
        hostId: Schema.NullOr(id),
        state: Schema.Literals(["succeeded", "failed"]),
        targets: mutableArray(hostTargetResultSchema),
        error: Schema.NullOr(commandErrorSchema),
        cleanupErrors: mutableArray(commandErrorSchema),
    }),
);
/** Final per-target Host command result; execution belongs to the daemon. */
export const hostCommandEventSchema = compatible(
    strictStruct({
        type: Schema.Literal("result"),
        result: hostCommandResultSchema,
    }),
);

export const paneSchema = compatible(
    strictStruct({
        type: Schema.Literal("pane"),
        id,
        tabIds: mutableArray(id),
    }),
);
type Pane = { type: "pane"; id: string; tabIds: string[] };
export type PanelLayout =
    | Pane
    | {
          type: "split";
          id: string;
          axis: "x" | "y";
          weights: number[];
          children: PanelLayout[];
      };
let panelLayoutSchema!: CompatibleSchema<Schema.ConstraintDecoder<PanelLayout>>;
const finitePositive = Schema.Finite.check(Schema.isGreaterThan(0));
const splitLayoutSchema: Schema.ConstraintDecoder<PanelLayout> = strictStruct({
    type: Schema.Literal("split"),
    id,
    axis: Schema.Literals(["x", "y"]),
    weights: mutableArray(finitePositive),
    children: mutableArray(
        Schema.suspend(
            (): Schema.ConstraintDecoder<PanelLayout> => panelLayoutSchema,
        ),
    ).check(
        Schema.makeFilter((children) =>
            children.length >= 2 ? undefined : "Expected at least two children",
        ),
    ),
}).check(
    Schema.makeFilter((v) =>
        v.weights.length === v.children.length &&
        Math.abs(v.weights.reduce((a, b) => a + b, 0) - 1) < 1e-9
            ? undefined
            : "Split weights must match children and sum to one",
    ),
) as unknown as Schema.ConstraintDecoder<PanelLayout>;
panelLayoutSchema = compatible(
    Schema.suspend(
        (): Schema.ConstraintDecoder<PanelLayout> =>
            Schema.Union([
                paneSchema,
                splitLayoutSchema,
            ]) as Schema.ConstraintDecoder<PanelLayout>,
    ),
);
export { panelLayoutSchema };
export const tabNoticeSchema = compatible(
    strictStruct({
        message: Schema.String,
        reason: Schema.NullOr(Schema.String),
        restartCommand: Schema.String,
    }),
);
export const tabViewSchema = compatible(
    strictStruct({
        id,
        terminalId: Schema.NullOr(id),
        label: Schema.String,
        agentKey: Schema.NullOr(name),
        runtimeId: Schema.NullOr(id),
        presentation: Schema.Literals([
            "shell",
            "preparing",
            "tui",
            "stopped",
            "start-failed",
            "crashed",
            "unavailable",
        ]),
        notice: Schema.NullOr(tabNoticeSchema),
    }),
);

/** Remove tabs and prune empty panes as one layout change. */
export function removePanelTabs(
    panel: Pick<PanelView, "layout">,
    ids: ReadonlySet<string>,
): Pick<PanelView, "layout"> {
    const before = panelLayoutReferences(panel.layout).panes;
    // A repeated cleanup must not remove unrelated empty panes.
    if (!before.some((pane) => pane.tabIds.some((id) => ids.has(id))))
        return { layout: panel.layout };
    const prune = (node: PanelLayout): PanelLayout | null => {
        if (node.type === "pane") {
            if (!node.tabIds.some((id) => ids.has(id))) return node;
            const tabIds = node.tabIds.filter((id) => !ids.has(id));
            if (!tabIds.length) return null;
            return { ...node, tabIds };
        }
        const children: PanelLayout[] = [];
        const weights: number[] = [];
        node.children.forEach((child, index) => {
            const remaining = prune(child);
            if (remaining) {
                children.push(remaining);
                weights.push(node.weights[index]!);
            }
        });
        if (!children.length) return null;
        if (children.length === 1) return children[0]!;
        const total = weights.reduce((a, b) => a + b, 0);
        return { ...node, children, weights: weights.map((w) => w / total) };
    };
    const pruned = prune(panel.layout);
    const layout: PanelLayout =
        pruned && panelLayoutReferences(pruned).tabIds.length
            ? pruned
            : {
                  type: "pane",
                  id: before[0]!.id,
                  tabIds: [],
              };
    return { layout };
}
export function panelLayoutReferences(layout: PanelLayout) {
    const panes: Pane[] = [];
    const splits: Extract<PanelLayout, { type: "split" }>[] = [];
    const walk = (node: PanelLayout): void => {
        if (node.type === "pane") panes.push(node);
        else {
            splits.push(node);
            node.children.forEach(walk);
        }
    };
    walk(layout);
    return { panes, splits, tabIds: panes.flatMap((pane) => pane.tabIds) };
}
/** A rejected panel layout command; `unknown_*` codes mean a missing target. */
export class PanelLayoutError extends Error {
    constructor(
        readonly code:
            | "unknown_pane"
            | "unknown_tab"
            | "unknown_split"
            | "layout_changed"
            | "id_conflict",
        message: string = code,
    ) {
        super(message);
    }
}
export type PanelTabTarget =
    | { toPaneId: string; beforeTabId?: string | undefined }
    | {
          split: {
              targetPaneId: string;
              side: "left" | "right" | "top" | "bottom";
              paneId: string;
              splitId: string;
          };
      };
type PanelPlacement = Pick<PanelView, "layout">;
function replaceNode(
    layout: PanelLayout,
    id: string,
    change: (node: PanelLayout) => PanelLayout,
): PanelLayout {
    if (layout.id === id) return change(layout);
    return layout.type === "pane"
        ? layout
        : {
              ...layout,
              children: layout.children.map((child) =>
                  replaceNode(child, id, change),
              ),
          };
}
/** Place a tab that is not in the layout yet at a pane or a new split beside it. */
export function insertPanelTab(
    panel: PanelPlacement,
    tabId: string,
    target: PanelTabTarget,
): PanelPlacement {
    const { panes, splits } = panelLayoutReferences(panel.layout);
    const paneId =
        "split" in target ? target.split.targetPaneId : target.toPaneId;
    if (!panes.some((p) => p.id === paneId))
        throw new PanelLayoutError("unknown_pane", "No such pane.");
    if (!("split" in target)) {
        const layout = replaceNode(panel.layout, paneId, (node) => {
            if (node.type !== "pane") return node;
            const tabIds = [...node.tabIds];
            const index = tabIds.indexOf(target.beforeTabId ?? "");
            tabIds.splice(index < 0 ? tabIds.length : index, 0, tabId);
            return { ...node, tabIds } as PanelLayout;
        });
        return { layout };
    }
    const { side, paneId: newPaneId, splitId } = target.split;
    const taken = new Set([...panes, ...splits].map((n) => n.id));
    if (taken.has(newPaneId) || taken.has(splitId) || newPaneId === splitId)
        throw new PanelLayoutError("id_conflict", "Layout ID is already used.");
    const added: PanelLayout = {
        type: "pane",
        id: newPaneId,
        tabIds: [tabId],
    };
    const layout = replaceNode(panel.layout, paneId, (node) => ({
        type: "split",
        id: splitId,
        axis: side === "left" || side === "right" ? "x" : "y",
        weights: [0.5, 0.5],
        children:
            side === "left" || side === "top" ? [added, node] : [node, added],
    }));
    return { layout };
}
/** Move an existing tab; an emptied source pane merges into its neighbours. */
export function movePanelTab(
    panel: PanelPlacement,
    tabId: string,
    target: PanelTabTarget,
): PanelPlacement {
    const { panes } = panelLayoutReferences(panel.layout);
    const source = panes.find((p) => p.tabIds.includes(tabId));
    if (!source) throw new PanelLayoutError("unknown_tab", "No such tab.");
    const paneId =
        "split" in target ? target.split.targetPaneId : target.toPaneId;
    if (!panes.some((p) => p.id === paneId))
        throw new PanelLayoutError("unknown_pane", "No such pane.");
    // The only tab of a pane cannot leave it for the same pane.
    if (source.id === paneId && source.tabIds.length === 1)
        return { layout: panel.layout };
    return insertPanelTab(
        removePanelTabs(panel, new Set([tabId])),
        tabId,
        target,
    );
}
export function resizePanelSplit(
    layout: PanelLayout,
    splitId: string,
    children: readonly string[],
    weights: readonly number[],
): PanelLayout {
    const split = panelLayoutReferences(layout).splits.find(
        (s) => s.id === splitId,
    );
    if (!split) throw new PanelLayoutError("unknown_split", "No such split.");
    if (
        split.children.length !== children.length ||
        split.children.some((child, index) => child.id !== children[index])
    )
        throw new PanelLayoutError(
            "layout_changed",
            "The split children changed; resize the current layout.",
        );
    return replaceNode(layout, splitId, (node) => ({
        ...(node as Extract<PanelLayout, { type: "split" }>),
        weights: [...weights],
    }));
}
export const panelViewSchema = compatible(
    strictStruct({
        id,
        kind: Schema.Literals(["host", "workspace", "network"]),
        section: Schema.Literals(["hosts", "workspaces", "networks"]),
        name: Schema.String,
        hostId: Schema.NullOr(id),
        networkId: Schema.NullOr(id),
        revision: positive,
        layout: panelLayoutSchema,
        tabs: mutableArray(tabViewSchema),
    }).check(
        Schema.makeFilter((panel) => {
            const issues: Schema.FilterIssue[] = [];
            if (
                (panel.kind === "workspace" &&
                    (panel.hostId !== null || panel.networkId !== null)) ||
                (panel.kind === "host" &&
                    (panel.hostId === null ||
                        panel.networkId === null ||
                        panel.section !== "hosts")) ||
                (panel.kind === "network" &&
                    (panel.hostId !== null ||
                        panel.networkId === null ||
                        panel.section !== "networks"))
            )
                issues.push("Invalid panel ownership or section");
            const { panes, splits, tabIds } = panelLayoutReferences(
                panel.layout,
            );
            const paneIds = panes.map((pane) => pane.id);
            const nodeIds = [...paneIds, ...splits.map((split) => split.id)];
            const tabIdsInPanel = panel.tabs.map((tab) => tab.id);
            const terminalIds = panel.tabs.flatMap((tab) =>
                tab.terminalId === null ? [] : [tab.terminalId],
            );
            if (
                new Set(nodeIds).size !== nodeIds.length ||
                new Set(tabIds).size !== tabIds.length ||
                new Set(tabIdsInPanel).size !== tabIdsInPanel.length ||
                tabIdsInPanel.length !== tabIds.length ||
                tabIdsInPanel.some((tabId) => !tabIds.includes(tabId)) ||
                new Set(terminalIds).size !== terminalIds.length
            )
                issues.push("Invalid panel pane/tab/terminal references");
            return issues;
        }),
    ),
);
const panelName = Schema.String.pipe(
    Schema.decodeTo(Schema.String, {
        decode: SchemaGetter.transform((value) => value.trim()),
        encode: SchemaGetter.transform((value) => value),
    }),
)
    .check(Schema.isMinLength(1))
    .check(Schema.isMaxLength(128))
    .check(
        Schema.makeFilter((value) =>
            [...value].every(
                (char) => char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127,
            )
                ? undefined
                : "Panel name contains a control character",
        ),
    );
const size = {
    cols: Schema.optional(positive),
    rows: Schema.optional(positive),
};
/** One destination shape for new and moved tabs: a pane or a new split beside one. */
export const panelTabTargetSchema = compatible(
    Schema.Union([
        strictStruct({ toPaneId: id, beforeTabId: Schema.optional(id) }),
        strictStruct({
            split: strictStruct({
                targetPaneId: id,
                side: Schema.Literals(["left", "right", "top", "bottom"]),
                paneId: id,
                splitId: id,
            }),
        }),
    ]),
);
const weights = mutableArray(finitePositive);
/** One registration or placement change; process effects start only after commit. */
export const panelChangeSchema = compatible(
    Schema.Union([
        strictStruct({
            type: Schema.Literal("panel.create"),
            name: panelName,
            section: Schema.optional(
                Schema.Literals(["workspaces", "networks", "hosts"]),
            ),
            paneId: id,
            tabId: id,
            source: Schema.optional(
                strictStruct({ panelId: id, terminalId: id }),
            ),
            ...size,
        }),
        strictStruct({ type: Schema.Literal("panel.rename"), name: panelName }),
        strictStruct({
            type: Schema.Literal("panel.delete"),
            confirm: Schema.Literal(true),
        }),
        strictStruct({
            type: Schema.Literal("tab.create"),
            tabId: id,
            target: panelTabTargetSchema,
            source: Schema.optional(
                strictStruct({ panelId: id, terminalId: id }),
            ),
            ...size,
        }),
        strictStruct({
            type: Schema.Literal("tab.move"),
            tabId: id,
            target: panelTabTargetSchema,
        }),
        strictStruct({
            type: Schema.Literal("tab.close"),
            tabId: id,
            expectedRuntimeId: Schema.NullOr(id),
            confirm: Schema.Boolean,
        }),
        strictStruct({ type: Schema.Literal("tab.dismiss"), tabId: id }),
        strictStruct({
            type: Schema.Literal("split.resize"),
            splitId: id,
            children: mutableArray(id).check(Schema.isMinLength(2)),
            weights,
        }),
    ]),
);
/** A panel's ordered changes committed in one transaction. */
export const webCommandRequestSchema = compatible(
    strictStruct({
        clientSessionId: requestId,
        sequence: positive,
        requestId,
        panelId: id,
        changes: mutableArray(panelChangeSchema).check(Schema.isMinLength(1)),
    }).check(
        Schema.makeFilter((command) => {
            const issues: Schema.FilterIssue[] = [];
            const last = command.changes.length - 1;
            command.changes.forEach((change, index) => {
                if (
                    (change.type === "panel.create" && index !== 0) ||
                    (change.type === "panel.delete" && index !== last)
                )
                    issues.push({
                        path: ["changes", index],
                        issue: "panel.create must come first and panel.delete last",
                    });
                if (
                    change.type === "split.resize" &&
                    (change.weights.length !== change.children.length ||
                        Math.abs(
                            change.weights.reduce((a, b) => a + b, 0) - 1,
                        ) >= 1e-9)
                )
                    issues.push({
                        path: ["changes", index],
                        issue: "Split weights must match children and sum to one",
                    });
            });
            return issues;
        }),
    ),
);
export const webCommandResultSchema = compatible(
    strictStruct({
        requestId,
        sequence: positive,
        /** The committed panel; null after panel.delete. */
        panel: Schema.NullOr(panelViewSchema),
    }),
);
/** A process the daemon still has to stop after its tab or panel was removed. */
export const cleanupViewSchema = compatible(
    strictStruct({
        id,
        terminalId: id,
        panelId: Schema.NullOr(id),
        tabId: Schema.NullOr(id),
        reason: Schema.Literals([
            "tab-closed",
            "panel-deleted",
            "shell-cancelled",
            "shell-unjoined",
        ]),
        state: Schema.Literals(["stopping", "failed"]),
        error: Schema.NullOr(Schema.String),
        attempts: Schema.Natural,
        updatedAt: timestamp,
    }),
);
/** Requests skipped because an earlier sequence did not arrive before its deadline. */
export const webSequenceFailureSchema = compatible(
    strictStruct({
        clientSessionId: requestId,
        code: Schema.Literal("sequence_gap"),
        missing: mutableArray(positive),
        unexecuted: mutableArray(
            strictStruct({ sequence: positive, requestId }),
        ),
    }),
);
const webNetworkSchema = compatible(
    Schema.Union([hostNetworkViewSchema, networkViewSchema]),
);
export const webSnapshotSchema = compatible(
    strictStruct({
        /** Changes when the daemon restarts; client sessions of an older epoch are gone. */
        epoch: id,
        hosts: mutableArray(hostViewSchema),
        networks: mutableArray(webNetworkSchema),
        panels: mutableArray(panelViewSchema),
        terminals: mutableArray(terminalViewSchema),
        agents: mutableArray(agentViewSchema),
        cleanups: mutableArray(cleanupViewSchema),
        notifications: mutableArray(webNotificationViewSchema),
    }),
);
function change<
    const R extends string,
    S extends Schema.ConstraintDecoder<unknown>,
>(resource: R, schema: S) {
    return strictStruct({
        resource: Schema.Literal(resource),
        action: Schema.Literal("upsert"),
        id,
        value: schema,
    });
}
export const webResources = [
    "host",
    "network",
    "panel",
    "terminal",
    "agent",
    "cleanup",
    "notification",
] as const;
export const webChangeSchema = compatible(
    Schema.Union([
        change("host", hostViewSchema),
        change("network", webNetworkSchema),
        change("panel", panelViewSchema),
        change("terminal", terminalViewSchema),
        change("agent", agentViewSchema),
        change("cleanup", cleanupViewSchema),
        change("notification", webNotificationViewSchema),
        strictStruct({
            resource: Schema.Literals(webResources),
            action: Schema.Literal("remove"),
            id,
        }),
    ]).check(
        Schema.makeFilter((value) =>
            value.action === "remove" ||
            value.id ===
                (value.resource === "agent"
                    ? value.value.agentId
                    : value.value.id)
                ? undefined
                : "Change id must match resource",
        ),
    ),
);
export const webStateSchema = compatible(
    strictStruct({
        changes: mutableArray(webChangeSchema),
    }),
);
export const webFaultSchema = compatible(
    strictStruct({
        code: id,
        message: Schema.String,
    }),
);

export type HostSource = Schema.Schema.Type<typeof hostSourceSchema>;
export type Invocation = Schema.Schema.Type<typeof invocationSchema>;
export type HostView = Schema.Schema.Type<typeof hostViewSchema>;
export type ManagedAgentView = Schema.Schema.Type<
    typeof managedAgentViewSchema
>;
export type HostNetworkView = Schema.Schema.Type<typeof hostNetworkViewSchema>;
export type HostCommand = Schema.Schema.Type<typeof hostCommandSchema>;
export type HostTargetResult = Schema.Schema.Type<
    typeof hostTargetResultSchema
>;
export type HostCommandResult = Schema.Schema.Type<
    typeof hostCommandResultSchema
>;
export type HostCommandEvent = Schema.Schema.Type<
    typeof hostCommandEventSchema
>;
export type CommandError = Schema.Schema.Type<typeof commandErrorSchema>;
export type PanelView = Schema.Schema.Type<typeof panelViewSchema>;
export type TabView = Schema.Schema.Type<typeof tabViewSchema>;
export type ConfigView = Schema.Schema.Type<typeof configViewSchema>;
export type WebSnapshot = Schema.Schema.Type<typeof webSnapshotSchema>;
export type WebChange = Schema.Schema.Type<typeof webChangeSchema>;
export type WebState = Schema.Schema.Type<typeof webStateSchema>;
export type WebFault = Schema.Schema.Type<typeof webFaultSchema>;
export type HostRunRequest = Schema.Schema.Type<typeof hostRunRequestSchema>;
export type HostRestartRequest = Schema.Schema.Type<
    typeof hostRestartRequestSchema
>;
export type HostResolveRequest = Schema.Schema.Type<
    typeof hostResolveRequestSchema
>;
export type HostControlRequest = Schema.Schema.Type<
    typeof hostControlRequestSchema
>;
export type HostAgentStartRequest = Schema.Schema.Type<
    typeof hostAgentStartRequestSchema
>;
export type HostAgentStopRequest = Schema.Schema.Type<
    typeof hostAgentStopRequestSchema
>;
export type PanelChange = Schema.Schema.Type<typeof panelChangeSchema>;
export type WebCommandRequest = Schema.Schema.Type<
    typeof webCommandRequestSchema
>;
export type WebCommandResult = Schema.Schema.Type<
    typeof webCommandResultSchema
>;
export type CleanupView = Schema.Schema.Type<typeof cleanupViewSchema>;
export type WebSequenceFailure = Schema.Schema.Type<
    typeof webSequenceFailureSchema
>;
export type PutConfigRequest = Schema.Schema.Type<
    typeof putConfigRequestSchema
>;
export type LastExit = Schema.Schema.Type<typeof lastExitSchema>;
export type ManagedRuntime = Schema.Schema.Type<typeof managedRuntimeSchema>;
export type HostError = Schema.Schema.Type<typeof hostErrorSchema>;
export type TabNotice = Schema.Schema.Type<typeof tabNoticeSchema>;
export type HostResolveResult = Schema.Schema.Type<
    typeof hostResolveResultSchema
>;
export type HostAgentRestartRequest = Schema.Schema.Type<
    typeof hostAgentRestartRequestSchema
>;
export type Keybindings = Schema.Schema.Type<typeof keybindingsSchema>;
