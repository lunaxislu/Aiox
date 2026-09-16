import { z } from "zod";

/**
 * The daemon HTTP wire contract. The daemon validates against these schemas,
 * the CLI calls the endpoints and the Web reads the inferred types, so the
 * shapes live here once instead of three times.
 */

export const portsSchema = z.object({ daemon: z.int(), web: z.int() });
export const policySchema = z.enum(["allow", "deny"]);
/** Persistent route changes; unblock and reset both remove a blocked edge. */
export const routeActionSchema = z.enum(["block", "unblock", "reset"]);

export const daemonStatusSchema = z.object({
    status: z.literal("running"),
    pid: z.int(),
    ports: portsSchema,
    startedAt: z.int(),
    runtimes: z.int(),
    networks: z.int(),
});

/** `<home>/.aiox/daemon.json`, written by the daemon once it is listening. */
export const daemonStateSchema = z.object({
    pid: z.int(),
    ports: portsSchema,
    startedAt: z.int(),
});

export const stopRequestSchema = z.object({ force: z.boolean().optional() });
export const createShellSchema = z.strictObject({
    cwd: z
        .string()
        .min(1)
        .refine((value) => value.trim().length > 0 && !value.includes("\0"))
        .optional(),
    cols: z.int().positive().optional(),
    rows: z.int().positive().optional(),
});
export const terminalViewSchema = z.object({
    id: z.string(),
    cwd: z.string(),
    kind: z.enum(["shell", "agent"]),
    alive: z.boolean(),
    vendor: z
        .object({
            runtimeId: z.string(),
            alive: z.boolean(),
            relayDisconnected: z.boolean(),
            collaborationActive: z.boolean(),
            collaborationError: z.string().optional(),
        })
        .optional(),
});
export const terminalContextSchema = z.strictObject({
    terminalId: z.string().min(1),
    token: z.string().min(1),
});

const argument = z.string().refine((value) => !value.includes("\0"));
const name = z
    .string()
    .min(1)
    .refine((value) => !value.includes("/") && !value.includes("\0"));

/** Private launch frame: environment and terminal credentials are never views. */
export const agentRunSchema = z.strictObject({
    adapter: z.string().regex(/^[a-z][a-z0-9-]*$/),
    cwd: argument.min(1),
    env: z.record(argument.min(1), argument),
    args: z.array(argument),
    cols: z.int().positive(),
    rows: z.int().positive(),
    name: name.optional(),
    network: argument.min(1).optional(),
    role: argument.optional(),
    description: argument.optional(),
    instruction: argument.optional(),
    terminalContext: terminalContextSchema.optional(),
});

export type AgentRun = z.infer<typeof agentRunSchema>;

/** External execution reports lifecycle only; it never borrows a daemon terminal. */
export const externalAgentRunSchema = agentRunSchema
    .omit({ cols: true, rows: true, terminalContext: true })
    .extend({ connection: z.json() });
const externalExitSchema = z.strictObject({
    type: z.literal("exit"),
    exitCode: z.int().nonnegative(),
    signal: z.int().positive().nullable(),
});
export const externalAgentClientFrameSchema = z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("started") }),
    externalExitSchema,
]);
export const externalAgentServerFrameSchema = z.discriminatedUnion("type", [
    z.strictObject({
        type: z.literal("prepared"),
        launch: z.json(),
    }),
    z.strictObject({ type: z.literal("ready") }),
    z.strictObject({ type: z.literal("startup-failed"), message: z.string() }),
    z.strictObject({ type: z.literal("error"), message: z.string() }),
    externalExitSchema,
]);
export type ExternalAgentRun = z.infer<typeof externalAgentRunSchema>;
export type ExternalAgentServerFrame = z.infer<
    typeof externalAgentServerFrameSchema
>;

export type CreateShell = z.infer<typeof createShellSchema>;
export type TerminalView = z.infer<typeof terminalViewSchema>;
export type TerminalContext = z.infer<typeof terminalContextSchema>;

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
export const stopResultSchema = z.object({
    stopped: z.boolean(),
    forced: z.boolean(),
    /** Resources that could not be confirmed stopped; a stop with warnings is not a clean stop. */
    warnings: z.array(z.string()).optional(),
});

export const networkViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    scope: z.enum(["persistent", "host"]),
    routes: z.array(
        z.object({
            from: z.string(),
            to: z.string(),
            fromName: z.string(),
            toName: z.string(),
        }),
    ),
});

export const createNetworkSchema = z.strictObject({
    name: z.string().min(1),
});

export const routeOperationSchema = z.discriminatedUnion("kind", [
    z.strictObject({
        kind: z.literal("between"),
        action: routeActionSchema,
        agents: z
            .array(z.string())
            .refine(
                (agents) => new Set(agents).size >= 2,
                "A between operation requires at least two distinct agents",
            ),
    }),
    z.strictObject({
        kind: z.literal("directed"),
        action: routeActionSchema,
        from: z.string(),
        to: z.array(z.string()).min(1),
    }),
]);
export const routeRequestSchema = z.object({
    operation: routeOperationSchema,
});

export const agentViewSchema = z.object({
    agentId: z.string(),
    name: z.string(),
    role: z.string().nullable(),
    description: z.string().nullable(),
    status: z.enum([
        "aiox-preparing",
        "idle",
        "working",
        "awaiting-user",
        "failed",
    ]),
    networkId: z.string().nullable(),
    networkName: z.string().nullable(),
    hostId: z.string().nullable(),
    terminalId: z.string().nullable(),
    status_reason: z.string().nullable(),
});

export const notificationViewSchema = z.object({
    id: z.string(),
    originRuntimeId: z.string(),
    body: z.string(),
    createdAt: z.int(),
    readAt: z.int().nullable(),
});
export const webNotificationViewSchema = notificationViewSchema.extend({
    terminalId: z.string().nullable(),
});
export type WebNotificationView = z.infer<typeof webNotificationViewSchema>;
export const readNotificationsSchema = z.object({
    ids: z.array(z.string()).optional(),
});

export const deletedResultSchema = z.object({ deleted: z.boolean() });
export const readResultSchema = z.object({ read: z.int() });

/** Every non-2xx body. Codes carry their own extra fields, so unknown keys survive. */
export const errorBodySchema = z.looseObject({
    code: z.string().optional(),
    message: z.string(),
    candidates: z
        .array(z.object({ name: z.string(), network: z.string().nullable() }))
        .optional(),
});

export type Ports = z.infer<typeof portsSchema>;
export type Policy = z.infer<typeof policySchema>;
export type RouteAction = z.infer<typeof routeActionSchema>;
export type DaemonStatus = z.infer<typeof daemonStatusSchema>;
export type DaemonState = z.infer<typeof daemonStateSchema>;
export type StopRequest = z.infer<typeof stopRequestSchema>;
export type StopResult = z.infer<typeof stopResultSchema>;
export type NetworkView = z.infer<typeof networkViewSchema>;
export type CreateNetwork = z.infer<typeof createNetworkSchema>;
export type RouteOperation = z.infer<typeof routeOperationSchema>;
export type RouteRequest = z.infer<typeof routeRequestSchema>;
export type AgentView = z.infer<typeof agentViewSchema>;
export type AgentStatus = AgentView["status"];
export type NotificationView = z.infer<typeof notificationViewSchema>;
export type ReadNotifications = z.infer<typeof readNotificationsSchema>;
export type DeletedResult = z.infer<typeof deletedResultSchema>;
export type ReadResult = z.infer<typeof readResultSchema>;
export type ErrorBody = z.infer<typeof errorBodySchema>;

export const apiPath = {
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
