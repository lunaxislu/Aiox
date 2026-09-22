import type { IncomingMessage, ServerResponse } from "node:http";

import { ConfigError, ConfigConflictError } from "@aiox/config";
import { RouteOperationError } from "@aiox/domain";
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

import { handleStateApi } from "./state-api";
import { networkView, agentView, terminalView } from "./web-state";

const MAX_BODY = 1_000_000;

export async function readJson(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
        size += (chunk as Buffer).length;
        if (size > MAX_BODY)
            throw new HttpError(413, "body_too_large", "Body too large.");
        chunks.push(chunk as Buffer);
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

export function send(
    response: ServerResponse,
    status: number,
    body: unknown,
): void {
    const text = JSON.stringify(body);
    response.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(text),
    });
    response.end(text);
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

/**
 * The same handler backs both listeners, so the Web reaches the API on its own
 * origin and the CLI reaches it on the daemon port.
 */
export function createApiHandler(services: DaemonServices) {
    return async function handle(
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> {
        const path = url.pathname;
        const stateContract =
            /^\/api\/(hosts|panels|operations|config)(\/|$)/.test(path);
        if (!path.startsWith("/api/")) return false;
        try {
            await route(request, response, url, path, services);
        } catch (error) {
            if (error instanceof HttpError) {
                send(response, error.status, {
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
                });
            } else if (error instanceof ConfigError) {
                send(response, 500, {
                    code: "invalid_config",
                    message: error.message,
                    ...(stateContract ? { stage: "config" } : {}),
                });
            } else if (error instanceof NetworkError) {
                send(response, 400, {
                    code: error.code,
                    message: error.message,
                });
            } else if (error instanceof RouteOperationError) {
                send(response, 400, {
                    code: "invalid_route_operation",
                    message: error.message,
                });
            } else if (error instanceof DuplicateRuntimeNameError) {
                send(response, 409, {
                    code: error.code,
                    message: error.message,
                });
            } else if (error instanceof AmbiguousRuntimeError) {
                const names = new Map(
                    (await services.networks.list()).map(({ id, name }) => [
                        id,
                        name,
                    ]),
                );
                send(response, 409, {
                    code: "ambiguous_agent",
                    message: error.message,
                    candidates: error.candidates.map(({ name, networkId }) => ({
                        name,
                        network:
                            networkId === null
                                ? null
                                : (names.get(networkId) ?? null),
                    })),
                });
            } else {
                send(response, 500, {
                    code: "internal_error",
                    message:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }
        return true;
    };
}

async function route(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
    path: string,
    services: DaemonServices,
): Promise<void> {
    const method = request.method ?? "GET";
    const { runtimes, networks, db, lifecycle } = services;
    if (path === "/api/web/events" && method === "GET") {
        try {
            await services.webEvents.connect(response);
        } catch (error) {
            throw new HttpError(
                500,
                "storage_error",
                error instanceof Error ? error.message : String(error),
                { stage: "storage" },
            );
        }
        return;
    }

    if (await handleStateApi(request, response, url, services)) return;

    if (path === "/api/config") {
        if (method === "GET") {
            send(response, 200, await services.configDocument.read());
            return;
        }
        if (method === "PUT") {
            const input = parse(
                putConfigRequestSchema,
                await readJson(request),
            );
            try {
                send(response, 200, await services.configDocument.write(input));
            } catch (error) {
                if (error instanceof ConfigConflictError)
                    throw new HttpError(409, "config_conflict", error.message, {
                        current: error.current,
                    });
                throw error;
            }
            return;
        }
    }
    const getTerminal = (id: string) => terminalView(services, id);
    const vendorMatch = /^\/api\/terminals\/([^/]+)\/vendor$/.exec(path);
    if (vendorMatch && method === "DELETE") {
        const id = decodeURIComponent(vendorMatch[1]!);
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
        send(response, 200, { deleted: true });
        return;
    }

    if (path === apiPath.terminals) {
        if (method === "GET") {
            send(
                response,
                200,
                services.terminals.views().map((view) => getTerminal(view.id)),
            );
            return;
        }
        if (method === "POST") {
            const body = await readJson(request);
            const input = parse(
                createShellSchema,
                body === undefined ? {} : body,
            );
            send(response, 201, await lifecycle.createShell(input));
            return;
        }
    }
    const terminalMatch = /^\/api\/terminals\/([^/]+)$/.exec(path);
    if (terminalMatch) {
        const id = decodeURIComponent(terminalMatch[1]!);
        if (method === "GET") {
            const view = getTerminal(id);
            if (!view)
                throw new HttpError(
                    404,
                    "unknown_terminal",
                    "No such terminal.",
                );
            send(response, 200, view);
            return;
        }
        if (method === "DELETE") {
            send(response, 200, { deleted: await lifecycle.stopTerminal(id) });
            return;
        }
    }

    if (path === apiPath.status && method === "GET") {
        send(response, 200, await lifecycle.status());
        return;
    }

    if (path === apiPath.daemonStop && method === "POST") {
        const { force } = parse(
            stopRequestSchema,
            (await readJson(request)) ?? {},
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
        send(response, 200, {
            stopped: true,
            forced: force === true,
            ...(result.warnings.length > 0
                ? { warnings: result.warnings }
                : {}),
        });
        return;
    }

    if (path === apiPath.networks) {
        if (method === "GET") {
            send(
                response,
                200,
                (await networks.list()).map((network) =>
                    networkView(network, runtimes),
                ),
            );
            return;
        }
        if (method === "POST") {
            const input = parse(createNetworkSchema, await readJson(request));
            send(
                response,
                201,
                networkView(await networks.create(input.name), runtimes),
            );
            return;
        }
    }

    const routeMatch = /^\/api\/networks\/([^/]+)\/route$/.exec(path);
    if (routeMatch && method === "POST") {
        const { operation } = parse(
            routeRequestSchema,
            await readJson(request),
        );
        send(
            response,
            200,
            networkView(
                await networks.route(
                    decodeURIComponent(routeMatch[1]!),
                    operation,
                ),
                runtimes,
            ),
        );
        return;
    }

    const networkMatch = /^\/api\/networks\/([^/]+)$/.exec(path);
    if (networkMatch) {
        const reference = decodeURIComponent(networkMatch[1]!);
        if (method === "GET") {
            send(
                response,
                200,
                networkView(await networks.require(reference), runtimes),
            );
            return;
        }
        if (method === "DELETE") {
            send(response, 200, { deleted: await networks.delete(reference) });
            return;
        }
    }

    if (
        (path === apiPath.agents || path === "/api/web/agents") &&
        method === "GET"
    ) {
        const network = url.searchParams.get("network");
        const host = url.searchParams.get("host");
        const networkId =
            network === null
                ? null
                : ((await networks.find(network))?.id ?? network);
        const names = new Map(
            (await networks.list()).map(({ id, name }) => [id, name]),
        );
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
        send(response, 200, views);
        return;
    }

    const agentMatch = /^\/api\/agents\/([^/]+)$/.exec(path);
    if (agentMatch && method === "GET") {
        const record = runtimes.find(decodeURIComponent(agentMatch[1]!));
        if (!record?.collaborationActive)
            throw new HttpError(404, "unknown_agent", "No such agent.");
        const names = new Map(
            (await networks.list()).map(({ id, name }) => [id, name]),
        );
        send(response, 200, agentView(record, names));
        return;
    }

    if (
        (path === apiPath.notifications || path === "/api/web/notifications") &&
        method === "GET"
    ) {
        const web = path === "/api/web/notifications";
        const views: NotificationView[] = (
            await db.messages.unreadNotifications()
        )
            .filter((row) => !web || row.originExecutionOwnership === "daemon")
            .map((row) => ({
                id: row.id,
                originRuntimeId: row.originRuntimeId,
                body: row.body,
                createdAt: row.createdAt,
                readAt: row.readAt,
                ...(web ? { terminalId: row.originTerminalId } : {}),
            }));
        send(response, 200, views);
        return;
    }

    if (
        (path === apiPath.notificationsRead ||
            path === "/api/web/notifications/read") &&
        method === "POST"
    ) {
        const { ids } = parse(
            readNotificationsSchema,
            (await readJson(request)) ?? {},
        );
        const unread = (await db.messages.unreadNotifications()).filter(
            (row) =>
                path !== "/api/web/notifications/read" ||
                row.originExecutionOwnership === "daemon",
        );
        // Reading is not resolving: this only clears the unread list.
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
        send(response, 200, { read: targets.length });
        return;
    }

    throw new HttpError(
        404,
        "not_found",
        `No such endpoint: ${method} ${path}`,
    );
}
