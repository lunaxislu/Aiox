import * as Schema from "effect/Schema";

import {
    compatible,
    strictStruct,
    mutableStruct,
    mutableArray,
} from "./schema-compat";

/** The daemon HTTP wire contract shared by daemon, CLI, and Web. */
export const portsSchema = compatible(
    mutableStruct({ daemon: Schema.Int, web: Schema.Int }),
);
export const policySchema = compatible(Schema.Literals(["allow", "deny"]));
/** Persistent route changes; unblock and reset both remove a blocked edge. */
export const routeActionSchema = compatible(
    Schema.Literals(["block", "unblock", "reset"]),
);

export const daemonStatusSchema = compatible(
    mutableStruct({
        status: Schema.Literal("running"),
        pid: Schema.Int,
        ports: portsSchema,
        startedAt: Schema.Int,
        runtimes: Schema.Int,
        networks: Schema.Int,
    }),
);
/** `<home>/.aiox/daemon.json`, written by the daemon once it is listening. */
export const daemonStateSchema = compatible(
    mutableStruct({
        pid: Schema.Int,
        ports: portsSchema,
        startedAt: Schema.Int,
    }),
);
export const stopRequestSchema = compatible(
    mutableStruct({ force: Schema.optional(Schema.Boolean) }),
);

const nonEmptyString = Schema.String.check(
    Schema.makeFilter((value) =>
        value.length > 0 ? undefined : "Expected a non-empty string",
    ),
);
const nonNulString = Schema.String.check(
    Schema.makeFilter((value) =>
        value.includes("\0") ? "String must not contain NUL" : undefined,
    ),
);
const argument = nonNulString;
const positiveInt = Schema.Int.check(Schema.isGreaterThan(0));

export const createShellSchema = compatible(
    strictStruct({
        cwd: Schema.optional(
            nonEmptyString.check(
                Schema.makeFilter((value) =>
                    value.trim().length > 0 && !value.includes("\0")
                        ? undefined
                        : "Invalid working directory",
                ),
            ),
        ),
        cols: Schema.optional(positiveInt),
        rows: Schema.optional(positiveInt),
    }),
);
export const terminalViewSchema = compatible(
    mutableStruct({
        id: Schema.String,
        cwd: Schema.String,
        kind: Schema.Literals(["shell", "agent"]),
        alive: Schema.Boolean,
        vendor: Schema.optional(
            mutableStruct({
                runtimeId: Schema.String,
                alive: Schema.Boolean,
                relayDisconnected: Schema.Boolean,
                collaborationActive: Schema.Boolean,
                collaborationError: Schema.optional(Schema.String),
            }),
        ),
    }),
);
export const terminalContextSchema = compatible(
    strictStruct({
        terminalId: nonEmptyString,
        token: nonEmptyString,
    }),
);

const name = nonEmptyString.check(
    Schema.makeFilter((value) =>
        !value.includes("/") && !value.includes("\0")
            ? undefined
            : "Invalid name",
    ),
);
const agentRunFields = {
    adapter: Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9-]*$/)),
    cwd: nonNulString.check(
        Schema.makeFilter((value) =>
            value.length > 0 ? undefined : "Expected a non-empty string",
        ),
    ),
    env: Schema.Record(nonEmptyString, argument),
    args: mutableArray(argument),
    cols: positiveInt,
    rows: positiveInt,
    name: Schema.optional(name),
    role: Schema.optional(nonEmptyString),
    description: Schema.optional(argument),
    instruction: Schema.optional(argument),
    network: Schema.optional(argument),
    terminalContext: Schema.optional(terminalContextSchema),
} as const;
export const agentRunSchema = compatible(strictStruct(agentRunFields));
export type AgentRun = Schema.Schema.Type<typeof agentRunSchema>;
export const externalAgentRunSchema = compatible(
    strictStruct({
        adapter: agentRunFields.adapter,
        cwd: agentRunFields.cwd,
        env: agentRunFields.env,
        args: agentRunFields.args,
        name: agentRunFields.name,
        role: agentRunFields.role,
        description: agentRunFields.description,
        instruction: agentRunFields.instruction,
        network: agentRunFields.network,
        connection: Schema.Json,
    }),
);
const externalExitSchema = strictStruct({
    type: Schema.Literal("exit"),
    exitCode: Schema.Natural,
    signal: Schema.NullOr(positiveInt),
});
export const externalAgentClientFrameSchema = compatible(
    Schema.Union([
        strictStruct({ type: Schema.Literal("started") }),
        externalExitSchema,
    ]),
);
export const externalAgentServerFrameSchema = compatible(
    Schema.Union([
        strictStruct({
            type: Schema.Literal("prepared"),
            launch: Schema.Json,
        }),
        strictStruct({ type: Schema.Literal("ready") }),
        strictStruct({
            type: Schema.Literal("startup-failed"),
            message: Schema.String,
        }),
        strictStruct({ type: Schema.Literal("error"), message: Schema.String }),
        externalExitSchema,
    ]),
);

export type ExternalAgentRun = Schema.Schema.Type<
    typeof externalAgentRunSchema
>;
export type ExternalAgentServerFrame = Schema.Schema.Type<
    typeof externalAgentServerFrameSchema
>;
export type CreateShell = Schema.Schema.Type<typeof createShellSchema>;
export type TerminalView = Schema.Schema.Type<typeof terminalViewSchema>;
export type TerminalContext = Schema.Schema.Type<typeof terminalContextSchema>;

/** Internal child environment; absence keeps external standalone execution valid. */
export function terminalContextFromEnv(
    env: Record<string, string | undefined>,
): TerminalContext | undefined {
    const terminalId = env["AIOX_TERMINAL_ID"];
    const token = env["AIOX_TERMINAL_TOKEN"];
    if (terminalId === undefined && token === undefined) return undefined;
    const result = terminalContextSchema.safeParse({ terminalId, token });
    if (!result.success) throw new Error("Invalid terminal context.");
    return result.data;
}

export const stopResultSchema = compatible(
    mutableStruct({
        stopped: Schema.Boolean,
        forced: Schema.Boolean,
        /** Resources not confirmed stopped; warnings make this an incomplete stop. */
        warnings: Schema.optional(mutableArray(Schema.String)),
    }),
);
export const networkViewSchema = compatible(
    mutableStruct({
        id: Schema.String,
        name: Schema.String,
        scope: Schema.Literals(["persistent", "host"]),
        routes: mutableArray(
            mutableStruct({
                from: Schema.String,
                to: Schema.String,
                fromName: Schema.String,
                toName: Schema.String,
            }),
        ),
    }),
);
export const createNetworkSchema = compatible(
    strictStruct({ name: nonEmptyString }),
);

const betweenRouteSchema = strictStruct({
    kind: Schema.Literal("between"),
    action: routeActionSchema,
    agents: mutableArray(Schema.String).check(
        Schema.makeFilter((agents) =>
            new Set(agents).size >= 2
                ? undefined
                : "A route requires at least two distinct agents",
        ),
    ),
});
const directedRouteSchema = strictStruct({
    kind: Schema.Literal("directed"),
    action: routeActionSchema,
    from: Schema.String,
    to: mutableArray(Schema.String).check(Schema.isMinLength(1)),
});
export const routeOperationSchema = compatible(
    Schema.Union([betweenRouteSchema, directedRouteSchema]),
);
export const routeRequestSchema = compatible(
    mutableStruct({ operation: routeOperationSchema }),
);

export const agentStatusSchema = compatible(
    Schema.Literals([
        "aiox-preparing",
        "idle",
        "working",
        "awaiting-user",
        "failed",
    ]),
);
export const agentViewSchema = compatible(
    mutableStruct({
        agentId: Schema.String,
        executionOwnership: Schema.Literals(["daemon", "external"]),
        name: Schema.String,
        role: Schema.NullOr(Schema.String),
        description: Schema.NullOr(Schema.String),
        status: agentStatusSchema,
        networkId: Schema.NullOr(Schema.String),
        networkName: Schema.NullOr(Schema.String),
        hostId: Schema.NullOr(Schema.String),
        terminalId: Schema.NullOr(Schema.String),
        status_reason: Schema.NullOr(Schema.String),
        observation_error: Schema.NullOr(Schema.String),
    }),
);
export const notificationViewSchema = compatible(
    mutableStruct({
        id: Schema.String,
        originRuntimeId: Schema.String,
        body: Schema.String,
        createdAt: Schema.Int,
        readAt: Schema.NullOr(Schema.Int),
    }),
);
export const webNotificationViewSchema = compatible(
    mutableStruct({
        ...notificationViewSchema.fields,
        terminalId: Schema.NullOr(Schema.String),
    }),
);
export type WebNotificationView = Schema.Schema.Type<
    typeof webNotificationViewSchema
>;
export const readNotificationsSchema = compatible(
    mutableStruct({ ids: Schema.optional(mutableArray(Schema.String)) }),
);
export const deletedResultSchema = compatible(
    mutableStruct({ deleted: Schema.Boolean }),
);
export const readResultSchema = compatible(mutableStruct({ read: Schema.Int }));
/** Every non-2xx body. Codes carry their own fields, so unknown keys survive. */
export const errorBodySchema = compatible(
    Schema.StructWithRest(
        mutableStruct({
            code: Schema.optional(Schema.String),
            message: Schema.String,
            candidates: Schema.optional(
                mutableArray(
                    Schema.Union([
                        Schema.String,
                        mutableStruct({
                            name: Schema.String,
                            network: Schema.NullOr(Schema.String),
                        }),
                    ]),
                ),
            ),
        }),
        [Schema.Record(Schema.String, Schema.Unknown)],
    ),
);

export type Ports = Schema.Schema.Type<typeof portsSchema>;
export type Policy = Schema.Schema.Type<typeof policySchema>;
export type RouteAction = Schema.Schema.Type<typeof routeActionSchema>;
export type DaemonStatus = Schema.Schema.Type<typeof daemonStatusSchema>;
export type DaemonState = Schema.Schema.Type<typeof daemonStateSchema>;
export type StopRequest = Schema.Schema.Type<typeof stopRequestSchema>;
export type StopResult = Schema.Schema.Type<typeof stopResultSchema>;
export type NetworkView = Schema.Schema.Type<typeof networkViewSchema>;
export type CreateNetwork = Schema.Schema.Type<typeof createNetworkSchema>;
export type RouteOperation = Schema.Schema.Type<typeof routeOperationSchema>;
export type RouteRequest = Schema.Schema.Type<typeof routeRequestSchema>;
export type AgentView = Schema.Schema.Type<typeof agentViewSchema>;
export type AgentStatus = AgentView["status"];
export type NotificationView = Schema.Schema.Type<
    typeof notificationViewSchema
>;
export type ReadNotifications = Schema.Schema.Type<
    typeof readNotificationsSchema
>;
export type DeletedResult = Schema.Schema.Type<typeof deletedResultSchema>;
export type ReadResult = Schema.Schema.Type<typeof readResultSchema>;
export type ErrorBody = Schema.Schema.Type<typeof errorBodySchema>;

export const apiPath = {
    config: "/api/config",
    webEvents: "/api/web/events",
    hosts: "/api/hosts",
    host: (id: string) => `/api/hosts/${encodeURIComponent(id)}`,
    hostRun: "/api/hosts/run",
    hostRestart: "/api/hosts/restart",
    hostResolve: "/api/hosts/resolve",
    panels: "/api/panels",
    panel: (id: string) => `/api/panels/${encodeURIComponent(id)}`,
    webCommands: "/api/web/commands",

    status: "/api/status",
    daemonStop: "/api/daemon/stop",
    networks: "/api/networks",
    network: (idOrName: string) =>
        `/api/networks/${encodeURIComponent(idOrName)}`,
    networkRoute: (idOrName: string) =>
        `/api/networks/${encodeURIComponent(idOrName)}/route`,
    agents: "/api/agents",
    terminals: "/api/terminals",
    terminal: (id: string) => `/api/terminals/${encodeURIComponent(id)}`,
    agent: (idOrName: string) => `/api/agents/${encodeURIComponent(idOrName)}`,
    notifications: "/api/notifications",
    notificationsRead: "/api/notifications/read",
} as const;
