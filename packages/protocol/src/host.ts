import { z } from "zod";

import {
    parseConfig,
    parseHostLayout,
    type AioxConfig,
    type HostLayout,
} from "./configuration";
import {
    agentViewSchema,
    networkViewSchema,
    terminalViewSchema,
    webNotificationViewSchema,
    terminalContextSchema,
    policySchema,
    portsSchema,
} from "./core";

const id = z.string().min(1);
const text = z.string().refine((v) => !v.includes("\0"));
const nonblank = text.refine((v) => v.trim().length > 0);
const name = nonblank.refine((v) => !v.includes("/"));
const positive = z.int().positive();
const timestamp = z.int().nonnegative();
const requestId = z.uuid();

// The same pure parsers serve file loading and the public wire schemas.
function validate<T>(parser: (value: unknown) => T) {
    return z.unknown().transform((value, ctx) => {
        try {
            return parser(value);
        } catch (error) {
            ctx.addIssue({
                code: "custom",
                message: error instanceof Error ? error.message : String(error),
            });
            return z.NEVER;
        }
    });
}
export type LayoutInput = {
    preset?: HostLayout["preset"];
    columns?: number;
    rows?: number;
};
export const layoutInputSchema = validate((value) => {
    parseHostLayout(value);
    return value as LayoutInput;
});
export const hostLayoutSchema = validate((value) => parseHostLayout(value));
export type StoredConfig = Omit<
    Partial<AioxConfig>,
    "ports" | "messages" | "host" | "appearance"
> & {
    ports?: Partial<AioxConfig["ports"]>;
    messages?: Partial<AioxConfig["messages"]>;
    host?: { layout?: LayoutInput };
    appearance?: Partial<NonNullable<AioxConfig["appearance"]>>;
};
export const keybindingsSchema = validate(
    (value) => parseConfig({ keybindings: value }).keybindings!,
);
export const storedConfigSchema = validate((value) => {
    parseConfig(value);
    return value as StoredConfig;
});
export const effectiveConfigSchema = validate((value) => parseConfig(value));
export const configViewSchema = z.strictObject({
    revision: id,
    stored: storedConfigSchema,
    effective: effectiveConfigSchema,
    runningPorts: portsSchema,
    restartRequired: z.boolean(),
});
export const putConfigRequestSchema = z.strictObject({
    revision: id,
    stored: storedConfigSchema,
});
export const hostSourceSchema = z.strictObject({
    directory: nonblank.refine(
        (v) =>
            v.startsWith("/") ||
            /^[A-Za-z]:[\\/]/.test(v) ||
            /^\\\\[^\\]+\\[^\\]+/.test(v),
        "Expected an absolute directory",
    ),
    file: nonblank.optional(),
});
export const invocationSchema = z.strictObject({
    terminalContext: terminalContextSchema.optional(),
});
export const hostControlRequestSchema = z.strictObject({ requestId });
export const hostRestartRequestSchema = z.strictObject({
    requestId,
    source: hostSourceSchema,
    ...invocationSchema.shape,
});
export const hostRunRequestSchema = hostRestartRequestSchema.extend({
    layout: layoutInputSchema.optional(),
});
export const hostResolveRequestSchema = z.strictObject({
    source: hostSourceSchema,
});
export const hostResolveResultSchema = z.strictObject({ hostId: id });
const agentKeys = z
    .array(name)
    .min(1)
    .refine((v) => new Set(v).size === v.length, "Duplicate Agent key");
export const hostAgentStartRequestSchema = hostRestartRequestSchema.extend({
    agents: agentKeys,
});
export const hostAgentRestartRequestSchema = hostAgentStartRequestSchema;
export const hostAgentStopRequestSchema = hostControlRequestSchema.extend({
    agents: agentKeys,
});
export const lastExitSchema = z.strictObject({
    kind: z.enum([
        "stopped",
        "exited",
        "crashed",
        "start-failed",
        "daemon-ended",
    ]),
    message: z.string().nullable(),
    at: timestamp,
});
export const managedRuntimeSchema = z.strictObject({
    id,
    terminalId: id,
    phase: z.enum(["preparing", "running", "stopping"]),
    status: agentViewSchema.shape.status,
    status_reason: z.string().nullable(),
    observation_error: z.string().nullable(),
    collaborationActive: z.boolean(),
    collaborationError: z.string().nullable(),
});
export const managedAgentViewSchema = z.strictObject({
    key: name,
    adapter: z.enum(["claude", "codex"]),
    role: nonblank.nullable(),
    description: text.nullable(),
    instruction: text,
    args: z.array(text),
    member: z.boolean(),
    runtime: managedRuntimeSchema.nullable(),
    lastTerminalId: id.nullable(),
    lastExit: lastExitSchema.nullable(),
});
export const hostViewSchema = z.strictObject({
    id,
    name,
    directory: nonblank,
    sourceFile: nonblank,
    instruction: text,
    panelId: id,
    networkId: id,
    revision: positive,
    agents: z
        .array(managedAgentViewSchema)
        .min(1)
        .refine(
            (agents) =>
                new Set(agents.map((a) => a.key)).size === agents.length,
            "Duplicate managed Agent key",
        ),
    activeOperationId: id.nullable(),
});
export const hostNetworkViewSchema = z
    .strictObject({
        id,
        hostId: id,
        name,
        scope: z.literal("host"),
        default: policySchema,
        members: z.array(
            z.strictObject({ agentKey: name, runtimeId: id.nullable() }),
        ),
        edges: z.array(
            z.strictObject({
                from: name,
                to: name,
                fromRuntimeId: id.nullable(),
                toRuntimeId: id.nullable(),
                policy: policySchema,
                source: z.enum([
                    "runtime-override",
                    "manifest-edge",
                    "manifest-default",
                ]),
            }),
        ),
    })
    .superRefine((network, ctx) => {
        const members = network.members.map((m) => m.agentKey);
        const edges = network.edges.map((e) => JSON.stringify([e.from, e.to]));
        if (
            new Set(members).size !== members.length ||
            new Set(edges).size !== edges.length ||
            edges.length !== members.length * (members.length - 1) ||
            network.edges.some(
                (e) =>
                    e.from === e.to ||
                    !members.includes(e.from) ||
                    !members.includes(e.to),
            )
        )
            ctx.addIssue({
                code: "custom",
                message:
                    "Host Network edges must cover each distinct member pair once",
            });
    });

export const operationErrorSchema = z.strictObject({
    code: id,
    message: z.string(),
    stage: z.enum([
        "config",
        "yaml",
        "cli",
        "environment",
        "execution",
        "cleanup",
        "storage",
    ]),
    field: z.string().optional(),
    agentKey: z.string().optional(),
});
export const hostErrorSchema = operationErrorSchema.extend({
    candidates: z.array(z.string()).optional(),
    operationId: id.optional(),
});
export const operationTargetSchema = z.strictObject({
    agentKey: name.nullable(),
    terminalId: id.nullable(),
    state: z.enum([
        "pending",
        "preparing",
        "ready",
        "stopping",
        "stopped",
        "unchanged",
        "failed",
    ]),
    error: operationErrorSchema.nullable(),
});
export const operationSchema = z
    .strictObject({
        id,
        requestId,
        kind: z.enum([
            "host.run",
            "host.restart",
            "host.stop",
            "host.delete",
            "host.agent.start",
            "host.agent.restart",
            "host.agent.stop",
            "panel.shell.create",
            "panel.tab.close",
            "panel.delete",
        ]),
        hostId: id.nullable(),
        panelId: id.nullable(),
        state: z.enum(["running", "succeeded", "failed"]),
        targets: z.array(operationTargetSchema),
        error: operationErrorSchema.nullable(),
        cleanupErrors: z.array(operationErrorSchema),
        createdAt: timestamp,
        finishedAt: timestamp.nullable(),
    })
    .refine(
        (v) => (v.state === "running") === (v.finishedAt === null),
        "Operation completion must include finishedAt",
    );

export const paneSchema = z
    .strictObject({
        type: z.literal("pane"),
        id,
        tabIds: z.array(id),
        selectedTabId: id.nullable(),
    })
    .refine(
        (v) =>
            v.tabIds.length === 0
                ? v.selectedTabId === null
                : v.selectedTabId !== null &&
                  v.tabIds.includes(v.selectedTabId),
        "Invalid selected tab",
    );
export type PanelLayout =
    | z.infer<typeof paneSchema>
    | {
          type: "split";
          axis: "x" | "y";
          weights: number[];
          children: PanelLayout[];
      };
export const panelLayoutSchema: z.ZodType<PanelLayout> = z.discriminatedUnion(
    "type",
    [
        paneSchema,
        z
            .strictObject({
                type: z.literal("split"),
                axis: z.enum(["x", "y"]),
                weights: z.array(z.number().positive()),
                get children(): z.ZodArray<z.ZodType<PanelLayout>> {
                    return z.array(panelLayoutSchema).min(2);
                },
            })
            .refine(
                (v) =>
                    v.weights.length === v.children.length &&
                    Math.abs(v.weights.reduce((a, b) => a + b, 0) - 1) < 1e-9,
                "Split weights must match children and sum to one",
            ),
    ],
);
export const tabNoticeSchema = z.strictObject({
    message: z.string(),
    reason: z.string().nullable(),
    restartCommand: z.string(),
});
export const tabViewSchema = z.strictObject({
    id,
    terminalId: id.nullable(),
    label: z.string(),
    agentKey: name.nullable(),
    runtimeId: id.nullable(),
    presentation: z.enum([
        "shell",
        "preparing",
        "tui",
        "stopped",
        "start-failed",
        "crashed",
        "unavailable",
    ]),
    notice: tabNoticeSchema.nullable(),
});
export function panelLayoutReferences(layout: PanelLayout) {
    const panes: z.infer<typeof paneSchema>[] = [];
    const walk = (node: PanelLayout): void => {
        if (node.type === "pane") panes.push(node);
        else node.children.forEach(walk);
    };
    walk(layout);
    return { panes, tabIds: panes.flatMap((pane) => pane.tabIds) };
}
export const panelViewSchema = z
    .strictObject({
        id,
        kind: z.enum(["host", "workspace", "network"]),
        section: z.enum(["hosts", "workspaces", "networks"]),
        name: z.string(),
        hostId: id.nullable(),
        networkId: id.nullable(),
        revision: positive,
        layout: panelLayoutSchema,
        activePaneId: id,
        tabs: z.array(tabViewSchema),
    })
    .superRefine((panel, ctx) => {
        if (
            panel.kind === "workspace"
                ? panel.hostId !== null || panel.networkId !== null
                : panel.kind === "host"
                  ? panel.hostId === null ||
                    panel.networkId === null ||
                    panel.section !== "hosts"
                  : panel.hostId !== null ||
                    panel.networkId === null ||
                    panel.section !== "networks"
        )
            ctx.addIssue({
                code: "custom",
                message: "Invalid panel ownership or section",
            });
        const { panes, tabIds } = panelLayoutReferences(panel.layout);
        const paneIds = panes.map((p) => p.id);
        const ids = panel.tabs.map((t) => t.id);
        const terminals = panel.tabs.flatMap((t) =>
            t.terminalId === null ? [] : [t.terminalId],
        );
        if (
            new Set(paneIds).size !== paneIds.length ||
            !paneIds.includes(panel.activePaneId) ||
            new Set(tabIds).size !== tabIds.length ||
            new Set(ids).size !== ids.length ||
            ids.length !== tabIds.length ||
            ids.some((id) => !tabIds.includes(id)) ||
            new Set(terminals).size !== terminals.length
        )
            ctx.addIssue({
                code: "custom",
                message: "Invalid panel pane/tab/terminal references",
            });
    });
const panelName = z
    .string()
    .transform((v) => v.trim())
    .pipe(
        z
            .string()
            .min(1)
            .max(128)
            .refine((v) =>
                [...v].every(
                    (char) =>
                        char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127,
                ),
            ),
    );
export const createPanelRequestSchema = z.strictObject({
    name: panelName,
    section: z.enum(["workspaces", "networks", "hosts"]).optional(),
});
export const renamePanelRequestSchema = z.strictObject({
    revision: positive,
    name: panelName,
});
export const putPanelLayoutRequestSchema = z.strictObject({
    revision: positive,
    layout: panelLayoutSchema,
    activePaneId: id,
});
export const createPanelShellRequestSchema = z.strictObject({
    requestId,
    revision: positive,
    paneId: id,
    split: z.enum(["right", "down"]).optional(),
    cols: positive.optional(),
    rows: positive.optional(),
});
export const closePanelTabRequestSchema = z.strictObject({
    requestId,
    revision: positive,
    expectedRuntimeId: id.nullable(),
    confirm: z.boolean(),
});
export const dismissPanelTabRequestSchema = z.strictObject({
    revision: positive,
});
export const deletePanelRequestSchema = z.strictObject({
    requestId,
    revision: positive,
    confirm: z.literal(true),
});

const webNetworkSchema = z.union([hostNetworkViewSchema, networkViewSchema]);
export const webSnapshotSchema = z.strictObject({
    hosts: z.array(hostViewSchema),
    networks: z.array(webNetworkSchema),
    panels: z.array(panelViewSchema),
    terminals: z.array(terminalViewSchema),
    agents: z.array(agentViewSchema),
    operations: z.array(operationSchema),
    notifications: z.array(webNotificationViewSchema),
});
function change<S extends z.ZodType, R extends string>(resource: R, schema: S) {
    return z.strictObject({
        resource: z.literal(resource),
        action: z.literal("upsert"),
        id,
        value: schema,
    });
}
export const webChangeSchema = z
    .union([
        change("host", hostViewSchema),
        change("network", webNetworkSchema),
        change("panel", panelViewSchema),
        change("terminal", terminalViewSchema),
        change("agent", agentViewSchema),
        change("operation", operationSchema),
        change("notification", webNotificationViewSchema),
        z.strictObject({
            resource: z.enum([
                "host",
                "network",
                "panel",
                "terminal",
                "agent",
                "operation",
                "notification",
            ]),
            action: z.literal("remove"),
            id,
        }),
    ])
    .refine(
        (v) =>
            v.action === "remove" ||
            v.id === (v.resource === "agent" ? v.value.agentId : v.value.id),
        "Change id must match resource",
    );
export const webStateSchema = z.strictObject({
    changes: z.array(webChangeSchema),
});
export const webFaultSchema = z.strictObject({ code: id, message: z.string() });

export type HostSource = z.infer<typeof hostSourceSchema>;
export type Invocation = z.infer<typeof invocationSchema>;
export type HostView = z.infer<typeof hostViewSchema>;
export type ManagedAgentView = z.infer<typeof managedAgentViewSchema>;
export type HostNetworkView = z.infer<typeof hostNetworkViewSchema>;
export type Operation = z.infer<typeof operationSchema>;
export type OperationTarget = z.infer<typeof operationTargetSchema>;
export type OperationError = z.infer<typeof operationErrorSchema>;
export type PanelView = z.infer<typeof panelViewSchema>;
export type TabView = z.infer<typeof tabViewSchema>;
export type ConfigView = z.infer<typeof configViewSchema>;
export type WebSnapshot = z.infer<typeof webSnapshotSchema>;
export type WebChange = z.infer<typeof webChangeSchema>;
export type WebState = z.infer<typeof webStateSchema>;
export type WebFault = z.infer<typeof webFaultSchema>;
export type HostRunRequest = z.infer<typeof hostRunRequestSchema>;
export type HostRestartRequest = z.infer<typeof hostRestartRequestSchema>;
export type HostResolveRequest = z.infer<typeof hostResolveRequestSchema>;
export type HostControlRequest = z.infer<typeof hostControlRequestSchema>;
export type HostAgentStartRequest = z.infer<typeof hostAgentStartRequestSchema>;
export type HostAgentStopRequest = z.infer<typeof hostAgentStopRequestSchema>;
export type CreatePanelRequest = z.infer<typeof createPanelRequestSchema>;
export type RenamePanelRequest = z.infer<typeof renamePanelRequestSchema>;
export type PutPanelLayoutRequest = z.infer<typeof putPanelLayoutRequestSchema>;
export type CreatePanelShellRequest = z.infer<
    typeof createPanelShellRequestSchema
>;
export type ClosePanelTabRequest = z.infer<typeof closePanelTabRequestSchema>;
export type DismissPanelTabRequest = z.infer<
    typeof dismissPanelTabRequestSchema
>;
export type DeletePanelRequest = z.infer<typeof deletePanelRequestSchema>;
export type PutConfigRequest = z.infer<typeof putConfigRequestSchema>;
export type LastExit = z.infer<typeof lastExitSchema>;
export type ManagedRuntime = z.infer<typeof managedRuntimeSchema>;
export type HostError = z.infer<typeof hostErrorSchema>;
export type TabNotice = z.infer<typeof tabNoticeSchema>;
export type HostResolveResult = z.infer<typeof hostResolveResultSchema>;
export type HostAgentRestartRequest = z.infer<
    typeof hostAgentRestartRequestSchema
>;
export type Keybindings = z.infer<typeof keybindingsSchema>;
