import { z } from "zod";

/**
 * The daemon HTTP wire contract. The daemon validates against these schemas,
 * the CLI calls the endpoints and the Web reads the inferred types, so the
 * shapes live here once instead of three times.
 */

export const portsSchema = z.object({ daemon: z.int(), web: z.int() });
export const policySchema = z.enum(["allow", "deny"]);
/** Route operations can also remove a route, which a stored policy cannot be. */
export const routePolicySchema = z.enum(["allow", "deny", "reset"]);

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
    defaultPolicy: policySchema,
    routes: z.array(
        z.object({ from: z.string(), to: z.string(), policy: policySchema }),
    ),
});

export const createNetworkSchema = z.object({
    name: z.string().min(1),
    defaultPolicy: policySchema,
});

export const routeOperationSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("default"), policy: policySchema }),
    z.object({ kind: z.literal("reset-default") }),
    z.object({
        kind: z.literal("between"),
        policy: routePolicySchema,
        agents: z
            .array(z.string())
            .refine(
                (agents) => new Set(agents).size >= 2,
                "A between operation requires at least two distinct agents",
            ),
    }),
    z.object({
        kind: z.literal("directed"),
        policy: routePolicySchema,
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
    activity: z.enum([
        "starting",
        "idle",
        "reasoning",
        "tool",
        "awaiting-user",
        "failed",
        "stopped",
    ]),
    networkId: z.string().nullable(),
    hostId: z.string().nullable(),
    terminalId: z.string().nullable(),
});

export const notificationViewSchema = z.object({
    id: z.string(),
    originRuntimeId: z.string(),
    body: z.string(),
    createdAt: z.int(),
    readAt: z.int().nullable(),
});
export const readNotificationsSchema = z.object({
    ids: z.array(z.string()).optional(),
});

export const deletedResultSchema = z.object({ deleted: z.boolean() });
export const readResultSchema = z.object({ read: z.int() });

/** Every non-2xx body. Codes carry their own extra fields, so unknown keys survive. */
export const errorBodySchema = z.looseObject({
    code: z.string(),
    message: z.string(),
});

export type Ports = z.infer<typeof portsSchema>;
export type Policy = z.infer<typeof policySchema>;
export type RoutePolicy = z.infer<typeof routePolicySchema>;
export type DaemonStatus = z.infer<typeof daemonStatusSchema>;
export type DaemonState = z.infer<typeof daemonStateSchema>;
export type StopRequest = z.infer<typeof stopRequestSchema>;
export type StopResult = z.infer<typeof stopResultSchema>;
export type NetworkView = z.infer<typeof networkViewSchema>;
export type CreateNetwork = z.infer<typeof createNetworkSchema>;
export type RouteOperation = z.infer<typeof routeOperationSchema>;
export type RouteRequest = z.infer<typeof routeRequestSchema>;
export type AgentView = z.infer<typeof agentViewSchema>;
export type AgentActivity = AgentView["activity"];
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
    agent: (idOrName: string) => `/api/agents/${encodeURIComponent(idOrName)}`,
    notifications: "/api/notifications",
    notificationsRead: "/api/notifications/read",
} as const;
