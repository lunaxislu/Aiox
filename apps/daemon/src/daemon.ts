import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";

import { claudeAdapter } from "@aiox/adapter-claude";
import { codexAdapter } from "@aiox/adapter-codex";
import type { AioxConfig, TerminalLaunch } from "@aiox/config";
import {
    ConfigError,
    resolveTerminalLaunch,
    createConfigDocument,
} from "@aiox/config";
import { logger } from "@aiox/diagnostics";
import type { AioxDatabase } from "@aiox/persistence";
import type {
    Ports,
    CreateShell,
    TerminalView,
    TerminalContext,
} from "@aiox/protocol";
import { createShellSchema, terminalContextSchema } from "@aiox/protocol";
import type { VendorAdapter } from "@aiox/vendor";
import { getRequestListener } from "@hono/node-server";
import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { WebSocketServer } from "ws";

import { AgentController } from "@/agent-controller";
import { createApi, apiError, HttpError, readJson } from "@/http";
import { bearerToken, handleMcpRequest } from "@/mcp";
import { MessageService } from "@/messaging";
import { NetworkService } from "@/networks";
import { requestGuard } from "@/request-guard";
import type { RetentionSchedule } from "@/retention";
import { scheduleRetention } from "@/retention";
import type { RegisterRuntime } from "@/runtimes";
import { RuntimeRegistry } from "@/runtimes";
import type { DaemonServices, StopOutcome } from "@/services";
import { createStaticHandler } from "@/static";
import type { TerminalOptions } from "@/terminals";
import { attachTerminal, TerminalService } from "@/terminals";
import { WebEvents } from "@/web-events";

import type { HttpEnv } from "./http";
import { restartCommand } from "./managed-agents";
import { readWebSnapshot } from "./web-state";

export type DaemonOptions = {
    home?: string;
    terminal?: () => Promise<AioxConfig["terminal"]>;
    ports: Ports;
    db: AioxDatabase;
    retentionDays: () => number;
    /** Built Web assets; omitted in tests and when the Web is not built. */
    webRoot?: string | undefined;
    host?: string;
    now?: () => number;
    adapters?: readonly VendorAdapter[];
    /** Complete startup recording before any external request is admitted. */
    onListening?: (ports: Ports) => Promise<void>;
    /** Release startup ownership before a replacement can bind the ports. */
    onClosing?: () => Promise<void>;
};

export type RegisteredRuntime = {
    runtimeId: string;
    /** Passed to the child as AIOX_MCP_TOKEN; never as an argument or in a log. */
    token: string;
    mcpUrl: string;
};

export type Daemon = {
    readonly ports: Ports;
    readonly services: DaemonServices;
    readonly acceptingInput: boolean;
    registerRuntime(
        input: Omit<RegisterRuntime, "terminalOwnership"> & {
            terminalContext?: TerminalContext;
        },
    ): Promise<RegisteredRuntime>;
    createShell(options?: CreateShell): Promise<TerminalView>;
    createTerminal(options?: TerminalOptions): { id: string };
    stopRuntime(runtimeId: string): Promise<void>;
    stop(force: boolean): Promise<StopOutcome>;
    /** Resolves once both listeners are closed. */
    readonly closed: Promise<void>;
};

/** Resolves with the port actually bound, which differs when 0 was requested. */
function listen(server: Server, port: number, host: string): Promise<number> {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
            server.removeListener("error", reject);
            const address = server.address();
            resolve(
                typeof address === "object" && address ? address.port : port,
            );
        });
    });
}

export async function startDaemon(options: DaemonOptions): Promise<Daemon> {
    let agents: AgentController | undefined;
    const host = options.host ?? "127.0.0.1";
    const now = options.now ?? (() => Date.now());
    const startedAt = now();

    // No execution survives a daemon restart. Preserve Network definitions,
    // but discard edges whose endpoints belonged to the past process.
    for (const network of await options.db.networks.list()) {
        if (network.routes.length)
            await options.db.networks.replaceRouting(network.id, (current) => ({
                ...current,
                routes: [],
            }));
    }

    await options.db.hostState.recover(now());
    const webEvents = new WebEvents();
    const runtimes: RuntimeRegistry = new RuntimeRegistry(
        webEvents.notify,
        (record) => networks.removeRuntimeRoutes(record),
    );
    const networks = new NetworkService(options.db, runtimes, webEvents.notify);
    const messages = new MessageService(
        options.db,
        runtimes,
        networks,
        now,
        webEvents.notify,
    );
    const terminals = new TerminalService(webEvents.notify, (id) => {
        if (!admitting) return;
        const finish = webEvents.beginUpdate();
        const task = options.db.hostState
            .removeTerminal(id)
            .catch((error) =>
                webEvents.fault(
                    "storage_error",
                    error instanceof Error ? error.message : String(error),
                ),
            )
            .finally(finish);
        services.operationTasks.add(task);
        void task.then(() => services.operationTasks.delete(task));
    });
    runtimes.onSettle((runtimeId, deliveryId, outcome, error) =>
        messages.settle(runtimeId, deliveryId, outcome, error),
    );

    /** Closed while stopping, so no new execution slips past the check. */
    let admitting = true;
    let ready = false;
    let stopping: Promise<StopOutcome> | undefined;
    const registrations = new Set<Promise<unknown>>();
    const runtimeStops = new Map<string, Promise<void>>();
    const terminalObservers = new Map<string, () => void>();
    /** Replaced with the ports actually bound; requesting 0 picks a free one. */
    let ports = options.ports;

    const services: DaemonServices = {
        operationTasks: new Set(),
        configDocument: createConfigDocument(
            options.home === undefined ? {} : { home: options.home },
            () => ports,
        ),
        configLocation:
            options.home === undefined ? {} : { home: options.home },
        webEvents,
        db: options.db,
        runtimes,
        networks,
        messages,
        terminals,
        lifecycle: {
            acceptingInput: () => admitting,
            createShell,
            stopTerminal,
            stopRuntime,
            status: async () => ({
                status: "running" as const,
                pid: process.pid,
                ports,
                startedAt,
                runtimes: runtimes.list().length,
                networks: (await networks.list()).length,
            }),
            // Managed executions go down before the reply; the listeners go
            // down after it, so the caller actually receives the outcome.
            requestStop: async (force) => {
                const outcome = await teardown(force);
                if (outcome.stopped) setImmediate(() => void closeListeners());
                return outcome;
            },
        },
    };

    const api = createApi(services);
    function listener(component: "daemon" | "web") {
        const app = new Hono<HttpEnv>();
        app.use(async (c, next) => {
            const requestId = randomUUID();
            c.set("requestId", requestId);
            c.header("x-request-id", requestId);
            // @hono/node-server leaves a pending drain callback after a blocked
            // stream closes. This response can no longer drain or accept writes.
            c.env.outgoing.once("close", () =>
                c.env.outgoing.removeAllListeners("drain"),
            );
            logger.info(
                { requestId, component, method: c.req.method },
                "HTTP request received",
            );
            if (!ready)
                return c.json(
                    { code: "starting", message: "The daemon is starting." },
                    503,
                );
            const denied = requestGuard(
                c.env.incoming,
                ports[component],
                ports.web,
                host,
            );
            if (denied)
                return c.json(
                    { code: "request_rejected", message: denied.message },
                    denied.status,
                );
            await next();
        });
        app.onError((error, c) => {
            if (
                c.req.path.startsWith("/api/") &&
                c.req.path !== "/api/agent-hooks"
            )
                return apiError(error, c, services);
            logger.error(
                { err: error, requestId: c.get("requestId"), component },
                "HTTP request failed",
            );
            return c.body(
                String(error),
                error instanceof HttpError
                    ? (error.status as ContentfulStatusCode)
                    : 500,
            );
        });
        if (component === "daemon") {
            app.all("/api/agent-hooks", (c) => {
                if (!agents)
                    throw new HttpError(
                        404,
                        "not_found",
                        `No such endpoint: ${c.req.method} ${c.req.path}`,
                    );
                return agents.hook(c);
            });
            app.all("/mcp/:networkId", async (c) => {
                if (!admitting)
                    throw new HttpError(
                        503,
                        "stopping",
                        "The daemon is stopping.",
                    );
                const body =
                    c.req.method === "POST"
                        ? await readJson(c.req.raw)
                        : undefined;
                const response = await handleMcpRequest(
                    c.req.param("networkId"),
                    c,
                    body,
                    { runtimes, networks, messages },
                );
                if (
                    response.status === 200 &&
                    InitializeRequestSchema.safeParse(body).success
                ) {
                    runtimes
                        .authenticate(bearerToken(c.req.raw))
                        ?.binding.mcpConnected?.();
                }
                return response;
            });
        }
        app.route("/", api);
        if (component === "web") {
            app.use("*", createStaticHandler(options.webRoot));
            app.notFound((c) =>
                c.text(
                    options.webRoot === undefined
                        ? "The operational Web is not built. Run: pnpm --filter @aiox/web build"
                        : "Not found.",
                    404,
                ),
            );
        } else
            app.notFound((c) =>
                c.json({ code: "not_found", message: "Not found." }, 404),
            );
        return createServer(getRequestListener(app.fetch));
    }
    const daemonServer = listener("daemon");
    const webServer = listener("web");

    const sockets = new WebSocketServer({ noServer: true });
    daemonServer.on("upgrade", (request, socket, head) => {
        const denied = requestGuard(request, ports.daemon, ports.web, host);
        if (
            !ready ||
            denied ||
            !admitting ||
            !agents ||
            !["/api/agent-run", "/api/agent-run/external"].includes(
                request.url ?? "",
            )
        ) {
            socket.end(
                `HTTP/1.1 ${!ready ? 503 : (denied?.status ?? 404)} Rejected\r\nConnection: close\r\n\r\n`,
            );
            return;
        }
        sockets.handleUpgrade(request, socket, head, (client) =>
            request.url === "/api/agent-run/external"
                ? agents!.attachExternal(client)
                : agents!.attach(client),
        );
    });
    webServer.on(
        "upgrade",
        (request: IncomingMessage, socket: Duplex, head: Buffer) => {
            try {
                if (!ready) {
                    socket.end(
                        "HTTP/1.1 503 Starting\r\nConnection: close\r\n\r\n",
                    );
                    return;
                }
                const denied = requestGuard(
                    request,
                    ports.web,
                    ports.web,
                    host,
                );
                if (denied) {
                    socket.end(
                        `HTTP/1.1 ${denied.status} Rejected\r\nConnection: close\r\n\r\n`,
                    );
                    return;
                }
                const url = new URL(request.url ?? "/", `http://${host}`);
                const match = /^\/ws\/terminal\/([^/]+)$/.exec(url.pathname);
                const terminalId = match
                    ? decodeURIComponent(match[1]!)
                    : undefined;
                const runtimeId = url.searchParams.get("runtime");
                const record = runtimeId ? runtimes.get(runtimeId) : undefined;
                const session = runtimeId
                    ? record?.executionOwnership === "daemon" &&
                      record.terminalId === terminalId &&
                      record.binding.relayDisconnected
                        ? record.binding.terminal
                        : undefined
                    : terminalId
                      ? terminals.get(terminalId)
                      : undefined;
                if (!session) {
                    socket.end(
                        "HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n",
                    );
                    return;
                }
                sockets.handleUpgrade(request, socket, head, (ws) => {
                    attachTerminal(ws, session, () => admitting);
                });
            } catch {
                socket.end(
                    "HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n",
                );
            }
        },
    );

    try {
        const daemonPort = await listen(
            daemonServer,
            options.ports.daemon,
            host,
        );
        ports = {
            daemon: daemonPort,
            web: await listen(webServer, options.ports.web, host),
        };
    } catch (error) {
        // Half-open listeners are not a running daemon.
        await closeServers();
        throw error;
    }

    let retention: RetentionSchedule | undefined = scheduleRetention(
        options.db,
        options.retentionDays,
        {
            now,
            onError: (err) => logger.error({ err }, "Retention purge failed"),
            onPurge: (report) => {
                if (report.notifications > 0 || (report.operations ?? 0) > 0)
                    webEvents.notify();
            },
        },
    );

    let resolveClosed: () => void;
    const closed = new Promise<void>((resolve) => {
        resolveClosed = resolve;
    });

    function stopRuntime(runtimeId: string): Promise<void> {
        const pending = runtimeStops.get(runtimeId);
        if (pending) return pending;
        const stoppingRecord = runtimes.get(runtimeId);
        if (stoppingRecord) stoppingRecord.phase = "stopping";
        runtimes.revoke(runtimeId);
        const attempt = Promise.resolve()
            .then(async () => {
                await Promise.allSettled(registrations);
                const record = runtimes.get(runtimeId);
                if (!record) return;
                if (record.executionOwnership === "daemon")
                    await record.binding.stop();
                await record.binding.cleanup?.();
                if (record.terminalId && record.terminalOwnership === "owned")
                    await terminals.kill(record.terminalId);
                await networks.removeRuntimeRoutes(record);
                await messages.forget(runtimeId);
                if (record.hostId !== null) {
                    const host = (
                        await options.db.hostState.snapshot()
                    ).hosts.find((h) => h.id === record.hostId);
                    await options.db.hostState.finishExecution(
                        record.id,
                        record.binding.exit ?? {
                            kind: "stopped",
                            message: "Agent stopped.",
                            at: now(),
                        },
                        host ? restartCommand(host, record.name) : "",
                    );
                }
                // Registration, credential and membership go together.
                runtimes.unregister(runtimeId);
                terminalObservers.get(runtimeId)?.();
                terminalObservers.delete(runtimeId);
            })
            .finally(() => runtimeStops.delete(runtimeId));
        runtimeStops.set(runtimeId, attempt);
        return attempt;
    }

    async function createShell(
        input: CreateShell = {},
        prepared?: TerminalLaunch,
    ): Promise<TerminalView> {
        if (!admitting)
            throw new HttpError(503, "stopping", "The daemon is stopping.");
        const parsed = createShellSchema.safeParse(input);
        if (!parsed.success)
            throw new HttpError(
                400,
                "invalid_request",
                "Invalid shell options.",
            );
        const settings = prepared ? undefined : await options.terminal?.();
        const launch =
            prepared ??
            (await resolveTerminalLaunch(
                settings,
                parsed.data.cwd === undefined ? {} : { cwd: parsed.data.cwd },
            ).catch((error: unknown) => {
                if (
                    error instanceof ConfigError &&
                    error.field === "terminal.cwd" &&
                    parsed.data.cwd !== undefined
                ) {
                    throw new HttpError(400, "invalid_request", error.message);
                }
                throw error;
            }));
        if (!admitting)
            throw new HttpError(503, "stopping", "The daemon is stopping.");
        const session = terminals.createShell({ ...parsed.data, ...launch });
        return terminals.view(session.id)!;
    }

    async function stopTerminal(id: string): Promise<boolean> {
        const session = terminals.get(id);
        if (!session) {
            await options.db.hostState.removeTerminal(id);
            return false;
        }
        for (const record of runtimes.list()) {
            if (record.terminalId === id) await stopRuntime(record.id);
        }
        if (terminals.get(id)) await terminals.kill(id);
        await options.db.hostState.removeTerminal(id);
        return true;
    }

    function attachTerminalTo(runtimeId: string, terminalId: string): void {
        const record = runtimes.get(runtimeId);
        const session = terminals.get(terminalId);
        if (!record || !session)
            throw new Error("Runtime or terminal not found.");
        if (record.executionOwnership !== "daemon")
            throw new Error(
                "External executions cannot own or borrow a daemon terminal.",
            );
        if (record.terminalId && record.terminalId !== terminalId)
            throw new Error("Runtime already has a terminal.");
        if (
            runtimes
                .list()
                .some(
                    (other) =>
                        other.id !== runtimeId &&
                        other.terminalId === terminalId,
                )
        )
            throw new Error("Terminal already has an Agent.");
        if (
            terminals.view(terminalId)?.kind === "shell" &&
            record.terminalOwnership !== "borrowed"
        )
            throw new Error("A shell requires authenticated terminal context.");
        terminalObservers.get(runtimeId)?.();
        record.terminalId = terminalId;
        record.terminalOwnership ??= "owned";
        webEvents.notify();
        const onExit = () => {
            // A TUI exiting cleans only its own execution, never the daemon.
            void stopRuntime(runtimeId).catch((error: unknown) => {
                logger.error(
                    { err: error, runtimeId, terminalId },
                    "Runtime cleanup failed",
                );
            });
        };
        terminalObservers.set(
            runtimeId,
            session.subscribe({ data: () => {}, exit: onExit }),
        );
        if (!session.alive) onExit();
    }

    /**
     * Terminates the managed executions and reports what could not be
     * confirmed gone. Deliberately separate from closing the listeners, so a
     * stop requested over HTTP can answer before its own socket goes away.
     */
    async function teardown(force: boolean): Promise<StopOutcome> {
        if (stopping) return stopping;
        // Block admission first, then look at what is actually still live.
        admitting = false;
        // Publish the attempt before an asynchronous idle check can admit another stop.
        stopping = Promise.resolve().then(async (): Promise<StopOutcome> => {
            const live = runtimes
                .list()
                .filter((record) => record.executionOwnership === "daemon");
            const terminate = force || process.platform === "win32";
            if (!terminate) {
                const busy = await terminals.busy();
                if (live.length > 0 || busy.length > 0) {
                    return {
                        stopped: false,
                        blocking: [
                            ...live.map((record) => record.name),
                            ...busy
                                .filter(
                                    (id) =>
                                        !live.some(
                                            (record) =>
                                                record.terminalId === id,
                                        ),
                                )
                                .map(
                                    (id) =>
                                        `shell ${terminals.view(id)?.cwd ?? "(working directory unavailable)"} [${id}]`,
                                ),
                        ],
                        warnings: [],
                    };
                }
            }
            const targets = runtimes.list();
            for (const record of targets) runtimes.revoke(record.id);
            await messages.pause();
            // A binding already being prepared must finish before we can stop
            // its real resources, rather than its temporary registration.
            await Promise.allSettled(registrations);
            await Promise.allSettled(services.operationTasks);
            const warnings: string[] = [];
            for (const record of targets) {
                try {
                    await stopRuntime(record.id);
                } catch (error) {
                    warnings.push(
                        `runtime ${record.name}: ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            }
            // A failed binding still owns its TUI: keep it available for the
            // user to exit manually. Only unowned terminals remain to clean.
            const owned = new Set(
                runtimes.list().map((record) => record.terminalId),
            );
            for (const session of terminals.list()) {
                if (owned.has(session.id)) continue;
                try {
                    if (terminate) await terminals.kill(session.id);
                    else if (!(await terminals.closeIdle(session.id)))
                        throw new Error(
                            "Could not confirm shell shutdown. Please check the shell.",
                        );
                } catch (error) {
                    warnings.push(
                        `shell ${terminals.view(session.id)?.cwd ?? "(working directory unavailable)"} [${session.id}]: ${String(error)}`,
                    );
                }
            }
            try {
                await messages.drain();
            } catch (error) {
                warnings.push(
                    error instanceof Error ? error.message : String(error),
                );
            }
            if (warnings.length > 0) {
                admitting = true;
                messages.resume();
                return {
                    stopped: false,
                    blocking: runtimes.list().map((record) => record.name),
                    warnings,
                };
            }
            retention?.stop();
            retention = undefined;
            return { stopped: true, blocking: [], warnings };
        });
        try {
            const outcome = await stopping;
            if (!outcome.stopped) {
                stopping = undefined;
                admitting = true;
            }
            return outcome;
        } catch (error) {
            stopping = undefined;
            admitting = true;
            messages.resume();
            throw error;
        }
    }

    let closing: Promise<void> | undefined;

    async function closeServers(): Promise<void> {
        webEvents.close();
        for (const client of sockets.clients) client.terminate();
        sockets.close();
        await Promise.all(
            [daemonServer, webServer].map(async (server) => {
                const done = new Promise<void>((resolve) =>
                    server.close(() => resolve()),
                );
                server.closeAllConnections();
                await done;
            }),
        );
    }

    function closeListeners(): Promise<void> {
        closing ??= (async () => {
            await options.onClosing?.().catch((error: unknown) => {
                logger.error(
                    { err: error },
                    "Daemon state cleanup failed before listeners closed",
                );
            });
            await closeServers();
            await options.db.close().catch((error: unknown) => {
                logger.error(
                    { err: error },
                    "Daemon database close failed after listeners closed",
                );
            });
            logger.info("Daemon stopped");
            logger.flush();
            resolveClosed();
        })();
        return closing;
    }

    async function stop(force: boolean): Promise<StopOutcome> {
        const outcome = await teardown(force);
        if (outcome.stopped) await closeListeners();
        return outcome;
    }

    webEvents.setSnapshot(() => readWebSnapshot(services));
    const daemon: Daemon = {
        ports,
        services,
        get acceptingInput() {
            return admitting;
        },
        createShell,
        registerRuntime: async (input) => {
            if (!admitting)
                throw new Error("The daemon is stopping; no new executions.");
            if (
                input.executionOwnership === "external" &&
                (input.terminalId !== undefined ||
                    input.terminalContext !== undefined)
            )
                throw new Error(
                    "External executions cannot own or borrow a daemon terminal.",
                );
            let terminalId = input.terminalId;
            const borrowing = input.terminalContext !== undefined;
            if (borrowing) {
                const context = terminalContextSchema.safeParse(
                    input.terminalContext,
                );
                if (!context.success || terminalId !== undefined)
                    throw new Error("Invalid terminal context.");
                terminalId = terminals.authenticateContext(context.data).id;
            }
            if (terminalId !== undefined) {
                if (!terminals.get(terminalId)?.alive)
                    throw new Error("Terminal is not running.");
                if (!borrowing && terminals.view(terminalId)?.kind === "shell")
                    throw new Error(
                        "A shell requires authenticated terminal context.",
                    );
                if (
                    runtimes
                        .list()
                        .some((record) => record.terminalId === terminalId)
                )
                    throw new Error("Terminal already has an Agent.");
            }
            if (
                input.hostId !== undefined &&
                runtimes
                    .list()
                    .some(
                        (r) =>
                            r.hostId === input.hostId && r.name === input.name,
                    )
            )
                throw new Error(
                    "Managed Agent already has an execution awaiting cleanup.",
                );
            const registration = runtimes.register({
                ...input,
                terminalId,
                terminalOwnership: borrowing ? "borrowed" : "owned",
                createBinding: async (controls) => {
                    // Reserve membership before awaiting storage: deletion either
                    // sees this record or precedes this existence check.
                    if (input.networkId !== null) {
                        if (input.hostId === undefined)
                            await networks.require(input.networkId);
                        else if (
                            !(
                                await options.db.hostState.snapshot()
                            ).networks.some(
                                (n) =>
                                    n.hostId === input.hostId &&
                                    n.id === input.networkId &&
                                    n.members.some(
                                        (m) => m.agentKey === input.name,
                                    ),
                            )
                        )
                            throw new Error(
                                "Managed Agent does not belong to this Host Network.",
                            );
                    }
                    if (!runtimes.get(controls.runtimeId)?.collaborationActive)
                        throw new Error(
                            "Registration cancelled during preparation.",
                        );
                    return input.createBinding(controls);
                },
            });
            registrations.add(registration);
            let runtimeId: string | undefined;
            try {
                const { record, token } = await registration;
                runtimeId = record.id;
                if (record.hostId !== null) {
                    if (!record.terminalId || !borrowing)
                        throw new Error(
                            "Managed Agent requires its authenticated shell.",
                        );
                    await options.db.hostState.startExecution({
                        runtimeId: record.id,
                        hostId: record.hostId,
                        agentKey: record.name,
                        terminalId: record.terminalId,
                        startedAt: now(),
                    });
                    webEvents.notify();
                }
                if (record.terminalId)
                    attachTerminalTo(record.id, record.terminalId);
                if (
                    record.terminalId &&
                    !terminals.get(record.terminalId)?.alive
                )
                    throw new Error("Terminal exited during registration.");
                // Admission closes during the idle check; only committed teardown
                // revokes an execution that was already admitted.
                if (!record.collaborationActive)
                    throw new Error(
                        "The daemon is stopping; registration cancelled.",
                    );
                return {
                    runtimeId: record.id,
                    token,
                    mcpUrl: `http://${host}:${ports.daemon}/mcp/${encodeURIComponent(record.networkId ?? "")}`,
                };
            } catch (error) {
                try {
                    if (runtimeId) await stopRuntime(runtimeId);
                    else if (terminalId && !borrowing)
                        await terminals.kill(terminalId);
                } catch (cleanupError) {
                    throw new AggregateError(
                        [error, cleanupError],
                        "Registration failed and cleanup is unconfirmed.",
                    );
                }
                throw error;
            } finally {
                registrations.delete(registration);
            }
        },
        createTerminal: (terminalOptions) => {
            if (!admitting)
                throw new Error("The daemon is stopping; no new executions.");
            const session = terminals.create(terminalOptions);
            return { id: session.id };
        },
        stopRuntime,
        stop,
        closed,
    };
    agents = new AgentController(
        daemon,
        options.adapters ?? [claudeAdapter, codexAdapter],
    );
    try {
        await options.onListening?.(ports);
    } catch (error) {
        retention?.stop();
        await closeServers();
        throw error;
    }
    ready = true;
    logger.info(
        { daemonPort: ports.daemon, webPort: ports.web },
        "Daemon listening",
    );
    return daemon;
}
