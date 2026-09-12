import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";

import { claudeAdapter } from "@aiox/adapter-claude";
import type { AioxConfig } from "@aiox/config";
import { ConfigError, resolveTerminalLaunch } from "@aiox/config";
import type { AioxDatabase } from "@aiox/persistence";
import type {
    Ports,
    CreateShell,
    TerminalView,
    TerminalContext,
} from "@aiox/protocol";
import { createShellSchema, terminalContextSchema } from "@aiox/protocol";
import type { VendorAdapter } from "@aiox/vendor";
import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer } from "ws";

import { AgentController } from "@/agent-controller";
import { createApiHandler, HttpError, readJson } from "@/http";
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

export type DaemonOptions = {
    terminal?: () => Promise<AioxConfig["terminal"]>;
    ports: Ports;
    db: AioxDatabase;
    retentionDays: () => number;
    /** Built Web assets; omitted in tests and when the Web is not built. */
    webRoot?: string | undefined;
    host?: string;
    now?: () => number;
    adapters?: readonly VendorAdapter[];
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
    /** Attaches a terminal to a runtime so the Web can find it. */
    attachTerminalTo(runtimeId: string, terminalId: string): void;
    stopRuntime(runtimeId: string, force: boolean): Promise<void>;
    stop(
        force: boolean,
        options?: { terminateExternal: boolean },
    ): Promise<StopOutcome>;
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

    const runtimes = new RuntimeRegistry();
    const networks = new NetworkService(options.db, runtimes);
    const messages = new MessageService(options.db, runtimes, networks, now);
    const terminals = new TerminalService();
    runtimes.onSettle((runtimeId, deliveryId, outcome, error) =>
        messages.settle(runtimeId, deliveryId, outcome, error),
    );

    /** Closed while stopping, so no new execution slips past the check. */
    let admitting = true;
    let stopping: Promise<StopOutcome> | undefined;
    const registrations = new Set<Promise<unknown>>();
    const runtimeStops = new Map<string, Promise<void>>();
    const terminalObservers = new Map<string, () => void>();
    /** Replaced with the ports actually bound; requesting 0 picks a free one. */
    let ports = options.ports;

    const services: DaemonServices = {
        db: options.db,
        runtimes,
        networks,
        messages,
        terminals,
        lifecycle: {
            createShell,
            stopTerminal,
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

    const api = createApiHandler(services);
    const serveStatic = createStaticHandler(options.webRoot);

    function protectedRequest(
        request: IncomingMessage,
        response: ServerResponse,
        port: number,
    ): boolean {
        const denied = requestGuard(request, port, ports.web, host);
        if (!denied) return false;
        response.writeHead(denied.status, {
            "content-type": "application/json",
        });
        response.end(
            JSON.stringify({
                code: "request_rejected",
                message: denied.message,
            }),
        );
        return true;
    }

    const daemonServer = createServer((request, response) => {
        void (async () => {
            if (protectedRequest(request, response, ports.daemon)) return;
            const url = new URL(request.url ?? "/", `http://${host}`);
            if (url.pathname === "/api/agent-hooks" && agents) {
                await agents.hook(request, response);
                return;
            }
            const mcp = /^\/mcp\/([^/]+)$/.exec(url.pathname);
            if (mcp) {
                if (!admitting)
                    throw new HttpError(
                        503,
                        "stopping",
                        "The daemon is stopping.",
                    );
                const body =
                    request.method === "POST"
                        ? await readJson(request)
                        : undefined;
                await handleMcpRequest(
                    decodeURIComponent(mcp[1]!),
                    request,
                    response,
                    body,
                    { runtimes, networks, messages },
                );
                if (
                    response.statusCode === 200 &&
                    InitializeRequestSchema.safeParse(body).success
                ) {
                    const binding = runtimes.authenticate(
                        bearerToken(request),
                    )?.binding;
                    binding?.mcpConnected?.();
                }
                return;
            }
            if (await api(request, response, url)) return;
            response.writeHead(404, { "content-type": "application/json" });
            response.end(
                JSON.stringify({ code: "not_found", message: "Not found." }),
            );
        })().catch((error: unknown) => {
            if (!response.headersSent)
                response.writeHead(
                    error instanceof HttpError ? error.status : 500,
                );
            response.end(String(error));
        });
    });

    const webServer = createServer((request, response) => {
        void (async () => {
            if (protectedRequest(request, response, ports.web)) return;
            const url = new URL(request.url ?? "/", `http://${host}`);
            if (await api(request, response, url)) return;
            if (await serveStatic(response, url.pathname)) return;
            response.writeHead(404, { "content-type": "text/plain" });
            response.end(
                options.webRoot === undefined
                    ? "The operational Web is not built. Run: pnpm --filter @aiox/web build"
                    : "Not found.",
            );
        })().catch((error: unknown) => {
            if (!response.headersSent) response.writeHead(500);
            response.end(String(error));
        });
    });

    const sockets = new WebSocketServer({ noServer: true });
    daemonServer.on("upgrade", (request, socket, head) => {
        const denied = requestGuard(request, ports.daemon, ports.web, host);
        if (
            denied ||
            !admitting ||
            !agents ||
            !["/api/agent-run", "/api/agent-run/external"].includes(
                request.url ?? "",
            )
        ) {
            socket.end(
                `HTTP/1.1 ${denied?.status ?? 404} Rejected\r\nConnection: close\r\n\r\n`,
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
                const session = match
                    ? terminals.get(decodeURIComponent(match[1]!))
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

    const daemonPort = await listen(daemonServer, options.ports.daemon, host);
    try {
        ports = {
            daemon: daemonPort,
            web: await listen(webServer, options.ports.web, host),
        };
    } catch (error) {
        // Half-open listeners are not a running daemon.
        daemonServer.close();
        throw error;
    }

    let retention: RetentionSchedule | undefined = scheduleRetention(
        options.db,
        options.retentionDays,
        { now },
    );

    let resolveClosed: () => void;
    const closed = new Promise<void>((resolve) => {
        resolveClosed = resolve;
    });

    function stopRuntime(
        runtimeId: string,
        force: boolean,
        terminateExternal = false,
    ): Promise<void> {
        const pending = runtimeStops.get(runtimeId);
        if (pending) return pending;
        const initial = runtimes.get(runtimeId);
        // Mark external termination before revocation or any asynchronous cleanup can
        // mistake its disconnect for an ordinary collaboration release.
        const terminatingBinding =
            terminateExternal && initial?.executionOwnership === "external"
                ? initial.binding
                : undefined;
        const termination = terminatingBinding?.stop(force);
        void termination?.catch(() => {});
        runtimes.revoke(runtimeId);
        const attempt = Promise.resolve()
            .then(async () => {
                await Promise.allSettled(registrations);
                await termination;
                const record = runtimes.get(runtimeId);
                if (!record) return;
                if (
                    record.executionOwnership === "daemon" ||
                    (terminateExternal && record.binding !== terminatingBinding)
                )
                    await record.binding.stop(force);
                await record.binding.cleanup?.();
                if (record.terminalId && record.terminalOwnership === "owned")
                    await terminals.kill(record.terminalId);
                await networks.removeRuntimeRoutes(record);
                await messages.forget(runtimeId);
                // Registration, credential and membership go together.
                runtimes.unregister(runtimeId);
                terminalObservers.get(runtimeId)?.();
                terminalObservers.delete(runtimeId);
            })
            .finally(() => runtimeStops.delete(runtimeId));
        runtimeStops.set(runtimeId, attempt);
        return attempt;
    }

    async function createShell(input: CreateShell = {}): Promise<TerminalView> {
        if (!admitting)
            throw new HttpError(503, "stopping", "The daemon is stopping.");
        const parsed = createShellSchema.safeParse(input);
        if (!parsed.success)
            throw new HttpError(
                400,
                "invalid_request",
                "Invalid shell options.",
            );
        const settings = await options.terminal?.();
        const launch = await resolveTerminalLaunch(
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
        });
        if (!admitting)
            throw new HttpError(503, "stopping", "The daemon is stopping.");
        const session = terminals.createShell({ ...parsed.data, ...launch });
        return terminals.view(session.id)!;
    }

    async function stopTerminal(id: string): Promise<boolean> {
        const session = terminals.get(id);
        if (!session) return false;
        for (const record of runtimes.list()) {
            if (record.terminalId === id) await stopRuntime(record.id, true);
        }
        if (terminals.get(id)) await terminals.kill(id);
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
        const onExit = () => {
            // A TUI exiting cleans only its own execution, never the daemon.
            void stopRuntime(runtimeId, false).catch((error: unknown) => {
                process.stderr.write(
                    `Runtime cleanup failed: ${String(error)}\n`,
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
    async function teardown(
        force: boolean,
        terminateExternal = true,
    ): Promise<StopOutcome> {
        if (stopping) return stopping;
        // Block admission first, then look at what is actually still live.
        admitting = false;
        // Publish the attempt before an asynchronous idle check can admit another stop.
        stopping = Promise.resolve().then(async (): Promise<StopOutcome> => {
            const live = runtimes.list();
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
                                .map((id) => `terminal ${id}`),
                        ],
                        warnings: [],
                    };
                }
            }
            const targets = runtimes.list();
            const requestedStops = new Map<string, Promise<void>>();
            for (const record of targets) {
                if (
                    terminateExternal &&
                    record.executionOwnership === "external"
                ) {
                    const pending = stopRuntime(record.id, true, true);
                    requestedStops.set(record.id, pending);
                    void pending.catch(() => {});
                } else runtimes.revoke(record.id);
            }
            await messages.pause();
            // A binding already being prepared must finish before we can stop
            // its real resources, rather than its temporary registration.
            await Promise.allSettled(registrations);
            const warnings: string[] = [];
            for (const record of targets) {
                try {
                    await (requestedStops.get(record.id) ??
                        stopRuntime(record.id, true, terminateExternal));
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
                        throw new Error("Shell is no longer idle.");
                } catch (error) {
                    warnings.push(`terminal ${session.id}: ${String(error)}`);
                }
            }
            await messages.drain();
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

    function closeListeners(): Promise<void> {
        closing ??= (async () => {
            for (const client of sockets.clients) client.terminate();
            sockets.close();
            await Promise.all(
                [daemonServer, webServer].map(async (server) => {
                    const done = new Promise<void>((r) =>
                        server.close(() => r()),
                    );
                    // Idle keep-alive sockets would otherwise hold this open.
                    server.closeAllConnections();
                    await done;
                }),
            );
            await options.db.close().catch(() => {});
            resolveClosed();
        })();
        return closing;
    }

    async function stop(
        force: boolean,
        options = { terminateExternal: true },
    ): Promise<StopOutcome> {
        const outcome = await teardown(force, options.terminateExternal);
        if (outcome.stopped) await closeListeners();
        return outcome;
    }

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
            const registration = runtimes.register({
                ...input,
                terminalId,
                terminalOwnership: borrowing ? "borrowed" : "owned",
            });
            registrations.add(registration);
            let runtimeId: string | undefined;
            try {
                const { record, token } = await registration;
                runtimeId = record.id;
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
                    if (runtimeId) await stopRuntime(runtimeId, true);
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
        attachTerminalTo,
        stopRuntime,
        stop,
        closed,
    };
    agents = new AgentController(daemon, options.adapters ?? [claudeAdapter]);
    return daemon;
}
