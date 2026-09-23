import type { HttpBindings } from "@hono/node-server";
import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
export type HttpEnv = {
    Bindings: HttpBindings;
    Variables: { requestId: string };
};

import { ConfigError, ConfigConflictError, HostInputError } from "@aiox/config";
import { logger } from "@aiox/diagnostics";
import { RouteOperationError } from "@aiox/domain";
import { HostStateError } from "@aiox/persistence";
import type { NotificationView } from "@aiox/protocol";
import {
    apiPath,
    putConfigRequestSchema,
    createNetworkSchema,
    createShellSchema,
    readNotificationsSchema,
    routeRequestSchema,
    stopRequestSchema,
} from "@aiox/protocol";

import { NetworkError } from "@/networks";
import { AmbiguousRuntimeError, DuplicateRuntimeNameError } from "@/runtimes";
import type { DaemonServices } from "@/services";

import { registerStateApi } from "./state-api";
import { networkView, agentView, terminalView } from "./web-state";

const MAX_BODY = 1_000_000;
async function networkNames(
    services: DaemonServices,
): Promise<Map<string, string>> {
    const persistent = await services.networks.list();
    const { networks: managed } = await services.db.hostState.snapshot();
    return new Map(
        [...persistent, ...managed].map(({ id, name }) => [id, name]),
    );
}

export async function readJson(request: Request): Promise<unknown> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request.body ?? []) {
        size += chunk.byteLength;
        if (size > MAX_BODY)
            throw new HttpError(413, "body_too_large", "Body too large.");
        chunks.push(Buffer.from(chunk));
    }
    if (size === 0) return undefined;
    const text = Buffer.concat(chunks).toString("utf8");
    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new HttpError(400, "invalid_json", "Request body is not JSON.");
    }
}

export class HttpError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
        readonly extra: Record<string, unknown> = {},
    ) {
        super(message);
        this.name = "HttpError";
    }
}

export function parse<T>(
    schema: { parse(value: unknown): T },
    value: unknown,
): T {
    try {
        return schema.parse(value);
    } catch (error) {
        throw new HttpError(
            400,
            "invalid_request",
            error instanceof Error ? error.message : "Invalid request.",
        );
    }
}

export async function apiError(
    error: unknown,
    c: Context<HttpEnv>,
    services: DaemonServices,
): Promise<Response> {
    const path = c.req.path;
    const stateContract = ["hosts", "panels", "operations", "config"].some(
        (resource) =>
            path === "/api/" + resource ||
            path.startsWith("/api/" + resource + "/"),
    );
    logger.warn(
        { err: error, requestId: c.get("requestId") },
        "API request failed",
    );
    if (stateContract && !(error instanceof HttpError)) {
        if (error instanceof HostInputError)
            error = new HttpError(
                error.stage === "config" ? 500 : 400,
                error.stage === "yaml"
                    ? "invalid_yaml"
                    : error.stage === "config"
                      ? "invalid_config"
                      : "invalid_request",
                error.message,
                { stage: error.stage },
            );
        else if (error instanceof HostStateError)
            error = new HttpError(
                error.code.startsWith("unknown_") ? 404 : 409,
                error.code,
                error.message,
                { stage: "storage" },
            );
        else if (!(error instanceof ConfigError) && path !== "/api/config")
            error = new HttpError(
                500,
                "storage_error",
                error instanceof Error ? error.message : String(error),
                { stage: "storage" },
            );
    }
    if (error instanceof HttpError) {
        return c.json(
            {
                code: error.code,
                message: error.message,
                ...(stateContract
                    ? {
                          stage:
                              path === "/api/config"
                                  ? "config"
                                  : error.status >= 500
                                    ? "storage"
                                    : "cli",
                      }
                    : {}),
                ...error.extra,
            },
            error.status as ContentfulStatusCode,
        );
    } else if (error instanceof ConfigError) {
        return c.json(
            {
                code: "invalid_config",
                message: error.message,
                ...(stateContract ? { stage: "config" } : {}),
            },
            500,
        );
    } else if (error instanceof NetworkError) {
        return c.json(
            {
                code: error.code,
                message: error.message,
            },
            400,
        );
    } else if (error instanceof RouteOperationError) {
        return c.json(
            {
                code: "invalid_route_operation",
                message: error.message,
            },
            400,
        );
    } else if (error instanceof DuplicateRuntimeNameError) {
        return c.json(
            {
                code: error.code,
                message: error.message,
            },
            409,
        );
    } else if (error instanceof AmbiguousRuntimeError) {
        const names = await networkNames(services);
        return c.json(
            {
                code: "ambiguous_agent",
                message: error.message,
                candidates: error.candidates.map(({ name, networkId }) => ({
                    name,
                    network:
                        networkId === null
                            ? null
                            : (names.get(networkId) ?? null),
                })),
            },
            409,
        );
    } else {
        return c.json(
            {
                code: "internal_error",
                message: error instanceof Error ? error.message : String(error),
            },
            500,
        );
    }
}
export function createApi(services: DaemonServices) {
    const app = new Hono<HttpEnv>();
    const { runtimes, networks, db, lifecycle } = services;
    const getTerminal = (id: string) => terminalView(services, id);
    // Hono normally treats HEAD as GET; this API has always required explicit methods.
    app.use("/api/*", async (c, next) => {
        if (c.req.method === "HEAD")
            throw new HttpError(
                404,
                "not_found",
                `No such endpoint: HEAD ${c.req.path}`,
            );
        await next();
    });
    registerStateApi(app, services);
    app.get("/api/web/events", async (c) => {
        try {
            return await services.webEvents.connect(c);
        } catch (error) {
            throw new HttpError(
                500,
                "storage_error",
                error instanceof Error ? error.message : String(error),
                { stage: "storage" },
            );
        }
    });
    app.get(apiPath.config, async (c) => {
        return c.json(await services.configDocument.read(), 200);
    });
    app.put(apiPath.config, async (c) => {
        const input = parse(putConfigRequestSchema, await readJson(c.req.raw));
        try {
            c.res = c.json(await services.configDocument.write(input), 200);
        } catch (error) {
            if (error instanceof ConfigConflictError)
                throw new HttpError(409, "config_conflict", error.message, {
                    current: error.current,
                });
            throw error;
        }
        return c.res;
    });
    app.delete("/api/terminals/:terminalId/vendor", async (c) => {
        const url = new URL(c.req.url);
        const id = c.req.param("terminalId");
        const record = runtimes.get(url.searchParams.get("runtime") ?? "");
        if (
            !record ||
            record.executionOwnership !== "daemon" ||
            record.terminalId !== id
        )
            throw new HttpError(
                404,
                "unknown_agent",
                "No such terminal execution.",
            );
        await lifecycle.stopRuntime(record.id);
        return c.json({ deleted: true }, 200);
    });
    app.get(apiPath.terminals, async (c) => {
        return c.json(
            services.terminals.views().map((view) => getTerminal(view.id)),
            200,
        );
    });
    app.post(apiPath.terminals, async (c) => {
        const body = await readJson(c.req.raw);
        const input = parse(createShellSchema, body === undefined ? {} : body);
        return c.json(await lifecycle.createShell(input), 201);
    });
    app.get("/api/terminals/:terminalId", async (c) => {
        const id = c.req.param("terminalId");
        const view = getTerminal(id);
        if (!view)
            throw new HttpError(404, "unknown_terminal", "No such terminal.");
        return c.json(view, 200);
    });
    app.delete("/api/terminals/:terminalId", async (c) => {
        const id = c.req.param("terminalId");
        return c.json({ deleted: await lifecycle.stopTerminal(id) }, 200);
    });
    app.get(apiPath.status, async (c) => {
        return c.json(await lifecycle.status(), 200);
    });
    app.post(apiPath.daemonStop, async (c) => {
        const { force } = parse(
            stopRequestSchema,
            (await readJson(c.req.raw)) ?? {},
        );
        const result = await lifecycle.requestStop(force === true);
        if (!result.stopped) {
            throw new HttpError(
                409,
                result.warnings.length > 0
                    ? "stop_incomplete"
                    : "active_runtimes",
                result.warnings.length > 0
                    ? "Shutdown is incomplete; the daemon remains available for cleanup."
                    : "Active executions are still registered; stop them or use --force.",
                {
                    runtimes: result.blocking,
                    ...(result.warnings.length > 0
                        ? { warnings: result.warnings }
                        : {}),
                },
            );
        }
        return c.json(
            {
                stopped: true,
                forced: force === true,
                ...(result.warnings.length > 0
                    ? { warnings: result.warnings }
                    : {}),
            },
            200,
        );
    });
    app.get(apiPath.networks, async (c) => {
        return c.json(
            (await networks.list()).map((network) =>
                networkView(network, runtimes),
            ),
            200,
        );
    });
    app.post(apiPath.networks, async (c) => {
        const input = parse(createNetworkSchema, await readJson(c.req.raw));
        return c.json(
            networkView(await networks.create(input.name), runtimes),
            201,
        );
    });
    app.post("/api/networks/:networkId/route", async (c) => {
        const { operation } = parse(
            routeRequestSchema,
            await readJson(c.req.raw),
        );
        return c.json(
            networkView(
                await networks.route(c.req.param("networkId"), operation),
                runtimes,
            ),
            200,
        );
    });
    app.get("/api/networks/:networkId", async (c) => {
        const reference = c.req.param("networkId");
        return c.json(
            networkView(await networks.require(reference), runtimes),
            200,
        );
    });
    app.delete("/api/networks/:networkId", async (c) => {
        const reference = c.req.param("networkId");
        return c.json({ deleted: await networks.delete(reference) }, 200);
    });
    app.on("GET", [apiPath.agents, "/api/web/agents"], async (c) => {
        const path = c.req.path;
        const url = new URL(c.req.url);
        const network = url.searchParams.get("network");
        const host = url.searchParams.get("host");
        const networkId =
            network === null
                ? null
                : ((await networks.find(network))?.id ?? network);
        const names = await networkNames(services);
        const views = runtimes
            .list()
            .filter(
                (record) =>
                    (path === "/api/web/agents" ||
                        record.collaborationActive) &&
                    (networkId === null || record.networkId === networkId) &&
                    (host === null || record.hostId === host),
            )
            .map((record) => agentView(record, names));
        return c.json(views, 200);
    });
    app.get("/api/agents/:agentId", async (c) => {
        const record = runtimes.find(c.req.param("agentId"));
        if (!record?.collaborationActive)
            throw new HttpError(404, "unknown_agent", "No such agent.");
        const names = await networkNames(services);
        return c.json(agentView(record, names), 200);
    });
    app.on(
        "GET",
        [apiPath.notifications, "/api/web/notifications"],
        async (c) => {
            const path = c.req.path;
            const web = path === "/api/web/notifications";
            const views: NotificationView[] = (
                await db.messages.unreadNotifications()
            )
                .filter(
                    (row) => !web || row.originExecutionOwnership === "daemon",
                )
                .map((row) => ({
                    id: row.id,
                    originRuntimeId: row.originRuntimeId,
                    body: row.body,
                    createdAt: row.createdAt,
                    readAt: row.readAt,
                    ...(web ? { terminalId: row.originTerminalId } : {}),
                }));
            return c.json(views, 200);
        },
    );
    app.on(
        "POST",
        [apiPath.notificationsRead, "/api/web/notifications/read"],
        async (c) => {
            const path = c.req.path;
            const { ids } = parse(
                readNotificationsSchema,
                (await readJson(c.req.raw)) ?? {},
            );
            const unread = (await db.messages.unreadNotifications()).filter(
                (row) =>
                    path !== "/api/web/notifications/read" ||
                    row.originExecutionOwnership === "daemon",
            );
            const targets =
                ids === undefined
                    ? unread.map((row) => row.id)
                    : unread
                          .filter((row) => ids.includes(row.id))
                          .map((row) => row.id);
            await db.messages.markRead(targets, Date.now());
            if (
                unread.some(
                    (row) =>
                        row.originExecutionOwnership === "daemon" &&
                        targets.includes(row.id),
                )
            )
                services.webEvents.notify();
            return c.json({ read: targets.length }, 200);
        },
    );

    app.all("/api/*", (c) => {
        throw new HttpError(
            404,
            "not_found",
            `No such endpoint: ${c.req.method} ${c.req.path}`,
        );
    });
    return app;
}
