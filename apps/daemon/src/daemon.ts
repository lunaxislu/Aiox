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
    WebCommandCommit,
} from "@aiox/protocol";
import { createShellSchema, terminalContextSchema } from "@aiox/protocol";
import type { VendorAdapter } from "@aiox/vendor";
import { NodeHttpServer } from "@effect/platform-node";
import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Cause, Deferred, Effect, Exit, Fiber, Scope } from "effect";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import { WebSocketServer } from "ws";
import { createActor, createMachine } from "xstate";

import { AgentController } from "@/agent-controller";
import { AppState } from "@/app-state";
import { CleanupRegistry } from "@/cleanups";
import { HostCommands } from "@/host-command";
import { createApi, apiError, HttpError, readJson } from "@/http";
import { bearerToken, handleMcpRequest } from "@/mcp";
import { MessageService } from "@/messaging";
import { NetworkService } from "@/networks";
import { requestGuard } from "@/request-guard";
import type { RetentionSchedule } from "@/retention";
import { scheduleRetention } from "@/retention";
import type { RegisterRuntime } from "@/runtimes";
import { RuntimeRegistry } from "@/runtimes";
import { Sequencer } from "@/sequencer";
import type { DaemonServices, StopOutcome } from "@/services";
import { createStaticHandler } from "@/static";
import { DaemonTasks } from "@/tasks";
import type { TerminalOptions } from "@/terminals";
import { attachTerminal, TerminalService } from "@/terminals";

import { applicationSocket } from "./application-rpc";
import { addEndpoint, contextFromRequest } from "./http-endpoint";
import { restartCommand } from "./managed-agents";

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
    /** How long a missing Web command sequence may be recovered; default 10 s. */
    sequenceGapTimeout?: number;
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
    return Effect.runPromise(
        Effect.callback<number, Error>((resume) => {
            const onError = (error: Error) => resume(Effect.fail(error));
            server.once("error", onError);
            server.listen(port, host, () => {
                server.removeListener("error", onError);
                const address = server.address();
                resume(
                    Effect.succeed(
                        typeof address === "object" && address
                            ? address.port
                            : port,
                    ),
                );
            });
            return Effect.sync(() => {
                server.removeListener("error", onError);
            });
        }),
    );
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
    const tasks = new DaemonTasks();
    const cleanupTasks = new DaemonTasks();
    const runtimes: RuntimeRegistry = new RuntimeRegistry(
        (id) => void appState.update({ runtime: id }),
        (record) => networks.removeRuntimeRoutes(record),
    );
    const networks = new NetworkService(
        options.db,
        runtimes,
        (id) => void appState.update({ network: id }),
    );
    const messages = new MessageService(
        options.db,
        runtimes,
        networks,
        now,
        (notification) => void appState.update({ notification }),
    );
    const terminals = new TerminalService(
        (id) => void appState.update({ terminal: id }),
        (id) => {
            if (!admitting()) return;
            // A shell that exited leaves its tab; the layout closes around it.
            void tasks.run(
                Effect.tryPromise(() =>
                    options.db.hostState.removeTerminal(id),
                ).pipe(
                    Effect.flatMap((panelId) =>
                        Effect.promise(() =>
                            panelId
                                ? appState
                                      .update({ panel: panelId })
                                      .then(() => undefined)
                                : Promise.resolve(),
                        ),
                    ),
                    Effect.catch((error) =>
                        Effect.sync(() =>
                            logger.error(
                                { err: error, terminalId: id },
                                "Exited shell could not leave its tab",
                            ),
                        ),
                    ),
                ),
            );
        },
    );
    const cleanups = new CleanupRegistry(
        async (id) => {
            await stopTerminal(id);
        },
        (id) => void appState.update({ cleanup: id }),
        cleanupTasks,
        now,
    );
    const appState: AppState = new AppState({
        db: options.db,
        runtimes,
        terminals,
        cleanups,
    });
    const sequencer = new Sequencer<WebCommandCommit>({
        gapTimeout: options.sequenceGapTimeout ?? 10_000,
        onGap: (failure) => appState.sequenceFailure(failure),
    });
    runtimes.onSettle((runtimeId, deliveryId, outcome, error) =>
        messages.settle(runtimeId, deliveryId, outcome, error),
    );

    /** Closed while stopping, so no new execution slips past the check. */
    const lifecycleActor = createActor(
        createMachine({
            initial: "starting",
            states: {
                starting: { on: { READY: "running", STOP: "stopping" } },
                running: { on: { STOP: "stopping" } },
                stopping: {
                    on: { FAILED: "cleanupFailed", SUCCEEDED: "stopped" },
                },
                cleanupFailed: { on: { STOP: "stopping" } },
                stopped: { on: { CLOSED: "closed" } },
                closed: { type: "final" },
            },
        }),
    ).start();
    const admitting = () =>
        ["starting", "running", "cleanupFailed"].includes(
            String(lifecycleActor.getSnapshot().value),
        );
    const ready = () => !lifecycleActor.getSnapshot().matches("starting");
    let stopping: Fiber.Fiber<StopOutcome, unknown> | undefined;
    const registrations = new Set<Fiber.Fiber<unknown, unknown>>();
    const runtimeStops = new Map<string, Fiber.Fiber<void, unknown>>();
    const attempt = <A>(run: () => PromiseLike<A> | A) =>
        Effect.tryPromise({
            try: () => Promise.resolve(run()),
            catch: (error) => error,
        });
    const terminalObservers = new Map<string, () => void>();
    /** Replaced with the ports actually bound; requesting 0 picks a free one. */
    let ports = options.ports;

    const services: DaemonServices = {
        tasks,
        cleanups,
        appState,
        sequencer,
        hostCommands: new HostCommands({ tasks }),
        configDocument: createConfigDocument(
            options.home === undefined ? {} : { home: options.home },
            () => ports,
        ),
        configLocation:
            options.home === undefined ? {} : { home: options.home },
        db: options.db,
        runtimes,
        networks,
        messages,
        terminals,
        lifecycle: {
            acceptingInput: () => admitting(),
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

    const httpScope = Effect.runSync(Scope.make());
    const rpcSocket = await Effect.runPromise(
        applicationSocket(services).pipe(
            Effect.provideService(Scope.Scope, httpScope),
        ),
    );
    const sockets = new WebSocketServer({ noServer: true });
    async function listener(component: "daemon" | "web") {
        const app = createApi(services);
        if (component === "daemon") {
            addEndpoint(app, "*", "/api/agent-hooks", (c) => {
                if (!agents)
                    throw new HttpError(
                        404,
                        "not_found",
                        `No such endpoint: ${c.req.method} ${c.req.path}`,
                    );
                return agents.hook(c);
            });
            addEndpoint(app, "*", "/mcp/:networkId", async (c) => {
                if (!admitting())
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

        // Application RPC owns this upgrade. Terminal byte streams keep their own WS endpoint.
        Effect.runSync(app.add("GET", "/api/rpc", rpcSocket));
        addEndpoint(app, "*", "/*", async (c) => {
            const missing = () =>
                Promise.resolve(
                    component === "web"
                        ? c.text(
                              options.webRoot === undefined
                                  ? "The operational Web is not built. Run: pnpm --filter @aiox/web build"
                                  : "Not found.",
                              404,
                          )
                        : c.json(
                              { code: "not_found", message: "Not found." },
                              404,
                          ),
                );
            return component === "web"
                ? createStaticHandler(options.webRoot)(c, missing)
                : missing();
        });
        const dispatch = app.asHttpEffect();
        const httpApp = Effect.gen(function* () {
            const request = yield* HttpServerRequest.HttpServerRequest;
            const c = yield* contextFromRequest(request);
            const requestId = randomUUID();
            c.set("requestId", requestId);
            const incoming = c.env.incoming;
            incoming.headers["x-request-id"] = requestId;
            logger.info(
                { requestId, component, method: c.req.method },
                "HTTP request received",
            );
            const reply = (response: Response) => {
                response.headers.set("x-request-id", requestId);
                return HttpServerResponse.fromWeb(response);
            };
            if (!ready())
                return reply(
                    c.json(
                        {
                            code: "starting",
                            message: "The daemon is starting.",
                        },
                        503,
                    ),
                );
            const denied = requestGuard(
                incoming,
                ports[component],
                ports.web,
                host,
            );
            if (denied)
                return reply(
                    c.json(
                        { code: "request_rejected", message: denied.message },
                        denied.status,
                    ),
                );
            if (c.req.method === "HEAD" && c.req.path.startsWith("/api/"))
                return reply(
                    c.json(
                        {
                            code: "not_found",
                            message: `No such endpoint: HEAD ${c.req.path}`,
                        },
                        404,
                    ),
                );
            const response = yield* dispatch.pipe(
                Effect.catchCause((cause) => {
                    if (Cause.hasInterruptsOnly(cause))
                        return Effect.failCause(cause);
                    const error = Cause.squash(cause);
                    return Effect.promise(async () =>
                        reply(
                            c.req.path.startsWith("/api/") &&
                                c.req.path !== "/api/agent-hooks"
                                ? await apiError(error, c, services)
                                : c.body(
                                      String(error),
                                      error instanceof HttpError
                                          ? error.status
                                          : 500,
                                  ),
                        ),
                    );
                }),
            );
            return HttpServerResponse.setHeader(
                response,
                "x-request-id",
                requestId,
            );
        }).pipe(Effect.orDie);
        const handler = await Effect.runPromise(
            NodeHttpServer.makeHandler(httpApp, { scope: httpScope }),
        );
        const upgrade = await Effect.runPromise(
            NodeHttpServer.makeUpgradeHandler(
                Effect.succeed(sockets),
                httpApp,
                { scope: httpScope },
            ),
        );
        return { server: createServer(handler), upgrade };
    }
    const { server: daemonServer, upgrade: daemonUpgrade } =
        await listener("daemon");
    const { server: webServer, upgrade: webUpgrade } = await listener("web");

    daemonServer.on("upgrade", (request, socket, head) => {
        if (request.url?.split("?")[0] === "/api/rpc")
            return daemonUpgrade(request, socket, head);
        const denied = requestGuard(request, ports.daemon, ports.web, host);
        if (
            !ready() ||
            denied ||
            !admitting() ||
            !agents ||
            !["/api/agent-run", "/api/agent-run/external"].includes(
                request.url ?? "",
            )
        ) {
            socket.end(
                `HTTP/1.1 ${!ready() ? 503 : (denied?.status ?? 404)} Rejected\r\nConnection: close\r\n\r\n`,
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
                if (!ready()) {
                    socket.end(
                        "HTTP/1.1 503 Starting\r\nConnection: close\r\n\r\n",
                    );
                    return;
                }
                if (request.url?.split("?")[0] === "/api/rpc")
                    return webUpgrade(request, socket, head);
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
                      terminalId
                        ? record.binding.relayDisconnected
                            ? record.binding.terminal
                            : terminals.get(terminalId)
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
                    attachTerminal(ws, session, () => admitting());
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
                if (report.notifications > 0)
                    void appState.update({ notifications: "reload" });
            },
        },
    );

    const closedSignal = Effect.runSync(Deferred.make<void>());
    const closed = Effect.runPromise(Deferred.await(closedSignal));

    function stopRuntime(runtimeId: string): Promise<void> {
        const pending = runtimeStops.get(runtimeId);
        if (pending) return Effect.runPromise(Fiber.join(pending));
        const stoppingRecord = runtimes.get(runtimeId);
        if (stoppingRecord) stoppingRecord.phase = "stopping";
        runtimes.revoke(runtimeId);
        const fiber = Effect.runFork(
            Effect.gen(function* () {
                yield* Effect.forEach([...registrations], Fiber.await, {
                    concurrency: "unbounded",
                    discard: true,
                });
                const record = runtimes.get(runtimeId);
                if (!record) return;
                if (record.executionOwnership === "daemon")
                    yield* attempt(() => record.binding.stop());
                yield* attempt(() => record.binding.cleanup?.());
                if (record.terminalId && record.terminalOwnership === "owned")
                    yield* attempt(() => terminals.kill(record.terminalId!));
                yield* attempt(() => networks.removeRuntimeRoutes(record));
                yield* attempt(() => messages.forget(runtimeId));
                if (record.hostId !== null) {
                    const host = yield* attempt(() =>
                        options.db.hostState.getHost(record.hostId!),
                    );
                    yield* attempt(() =>
                        options.db.hostState.finishExecution(
                            record.id,
                            record.binding.exit ?? {
                                kind: "stopped",
                                message: "Agent stopped.",
                                at: now(),
                            },
                            host ? restartCommand(host, record.name) : "",
                        ),
                    );
                    yield* attempt(() =>
                        appState.update(
                            { host: record.hostId! },
                            ...(host ? [{ panel: host.panelId }] : []),
                        ),
                    );
                }
                // Registration, credential and membership go together.
                runtimes.unregister(runtimeId);
                terminalObservers.get(runtimeId)?.();
                terminalObservers.delete(runtimeId);
            }),
        );
        runtimeStops.set(runtimeId, fiber);
        fiber.addObserver(() => {
            if (runtimeStops.get(runtimeId) === fiber)
                runtimeStops.delete(runtimeId);
        });
        return Effect.runPromise(Fiber.join(fiber));
    }

    function createShell(
        input: CreateShell = {},
        prepared?: TerminalLaunch,
    ): Promise<TerminalView> {
        return Effect.runPromise(
            Effect.gen(function* () {
                if (!admitting())
                    throw new HttpError(
                        503,
                        "stopping",
                        "The daemon is stopping.",
                    );
                const parsed = createShellSchema.safeParse(input);
                if (!parsed.success)
                    throw new HttpError(
                        400,
                        "invalid_request",
                        "Invalid shell options.",
                    );
                const settings = prepared
                    ? undefined
                    : yield* attempt(() => options.terminal?.());
                const launch =
                    prepared ??
                    (yield* attempt(() =>
                        resolveTerminalLaunch(
                            settings,
                            parsed.data.cwd === undefined
                                ? {}
                                : { cwd: parsed.data.cwd },
                        ).catch((error: unknown) => {
                            if (
                                error instanceof ConfigError &&
                                error.field === "terminal.cwd" &&
                                parsed.data.cwd !== undefined
                            ) {
                                throw new HttpError(
                                    400,
                                    "invalid_request",
                                    error.message,
                                );
                            }
                            throw error;
                        }),
                    ));
                if (!admitting())
                    throw new HttpError(
                        503,
                        "stopping",
                        "The daemon is stopping.",
                    );
                const session = terminals.createShell({
                    ...parsed.data,
                    ...launch,
                });
                return terminals.view(session.id)!;
            }),
        );
    }

    /** Confirms the process is gone before its tab leaves storage; rejects otherwise. */
    function stopTerminal(id: string): Promise<boolean> {
        return Effect.runPromise(
            Effect.gen(function* () {
                const session = terminals.get(id);
                if (session) {
                    for (const record of runtimes.list()) {
                        if (record.terminalId === id)
                            yield* attempt(() => stopRuntime(record.id));
                    }
                    if (terminals.get(id))
                        yield* attempt(() => terminals.kill(id));
                }
                const panelId = yield* attempt(() =>
                    options.db.hostState.removeTerminal(id),
                );
                if (panelId)
                    yield* attempt(() => appState.update({ panel: panelId }));
                return session !== undefined;
            }),
        );
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
        runtimes.changed(runtimeId);
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
    function teardown(force: boolean): Promise<StopOutcome> {
        if (stopping) return Effect.runPromise(Fiber.join(stopping));
        lifecycleActor.send({ type: "STOP" });
        const fiber = Effect.runFork(
            Effect.gen(function* () {
                const live = runtimes
                    .list()
                    .filter((record) => record.executionOwnership === "daemon");
                const terminate = force || process.platform === "win32";
                if (!terminate) {
                    const busy = yield* attempt(() => terminals.busy());
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
                yield* sequencer.quiesce;
                const targets = runtimes.list();
                for (const record of targets) runtimes.revoke(record.id);
                yield* attempt(() => messages.pause());
                // A binding already being prepared must finish before we can stop
                // its real resources, rather than its temporary registration.
                yield* Effect.forEach([...registrations], Fiber.await, {
                    concurrency: "unbounded",
                    discard: true,
                });
                yield* attempt(() => tasks.idle());
                const warnings: string[] = [
                    ...(yield* attempt(() => cleanups.stopAll())),
                ];
                for (const record of targets) {
                    {
                        const outcome1 = yield* Effect.exit(
                            Effect.gen(function* () {
                                yield* attempt(() => stopRuntime(record.id));
                            }),
                        );
                        if (Exit.isFailure(outcome1)) {
                            const error = Cause.squash(outcome1.cause);
                            warnings.push(
                                `runtime ${record.name}: ${error instanceof Error ? error.message : String(error)}`,
                            );
                        }
                    }
                }
                // A failed binding still owns its TUI: keep it available for the
                // user to exit manually. Only unowned terminals remain to clean.
                const owned = new Set(
                    runtimes.list().map((record) => record.terminalId),
                );
                for (const session of terminals.list()) {
                    if (owned.has(session.id)) continue;
                    {
                        const outcome2 = yield* Effect.exit(
                            Effect.gen(function* () {
                                if (terminate)
                                    yield* attempt(() =>
                                        terminals.kill(session.id),
                                    );
                                else if (
                                    !(yield* attempt(() =>
                                        terminals.closeIdle(session.id),
                                    ))
                                )
                                    throw new Error(
                                        "Could not confirm shell shutdown. Please check the shell.",
                                    );
                            }),
                        );
                        if (Exit.isFailure(outcome2)) {
                            const error = Cause.squash(outcome2.cause);
                            warnings.push(
                                `shell ${terminals.view(session.id)?.cwd ?? "(working directory unavailable)"} [${session.id}]: ${String(error)}`,
                            );
                        }
                    }
                }
                {
                    const outcome3 = yield* Effect.exit(
                        Effect.gen(function* () {
                            yield* attempt(() => messages.drain());
                        }),
                    );
                    if (Exit.isFailure(outcome3)) {
                        const error = Cause.squash(outcome3.cause);
                        warnings.push(
                            error instanceof Error
                                ? error.message
                                : String(error),
                        );
                    }
                }
                if (warnings.length > 0) {
                    messages.resume();
                    sequencer.resumeWork();
                    return {
                        stopped: false,
                        blocking: runtimes.list().map((record) => record.name),
                        warnings,
                    };
                }
                retention?.stop();
                retention = undefined;
                return { stopped: true, blocking: [], warnings };
            }).pipe(
                Effect.onExit((exit) =>
                    Effect.sync(() => {
                        if (Exit.isSuccess(exit) && exit.value.stopped)
                            lifecycleActor.send({ type: "SUCCEEDED" });
                        else {
                            lifecycleActor.send({ type: "FAILED" });
                            messages.resume();
                            sequencer.resumeWork();
                        }
                    }),
                ),
            ),
        );
        stopping = fiber;
        fiber.addObserver((exit) => {
            if (
                (Exit.isFailure(exit) || !exit.value.stopped) &&
                stopping === fiber
            )
                stopping = undefined;
        });
        return Effect.runPromise(Fiber.join(fiber));
    }

    let closing: Fiber.Fiber<void, unknown> | undefined;

    async function closeServers(): Promise<void> {
        appState.close();
        await sequencer.close();
        await tasks.close();
        await cleanupTasks.close();
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
        await Effect.runPromise(Scope.close(httpScope, Exit.void));
    }

    function closeListeners(): Promise<void> {
        closing ??= Effect.runFork(
            Effect.gen(function* () {
                yield* attempt(() =>
                    options.onClosing?.().catch((error: unknown) => {
                        logger.error(
                            { err: error },
                            "Daemon state cleanup failed before listeners closed",
                        );
                    }),
                );
                yield* attempt(() => closeServers());
                yield* attempt(() =>
                    options.db.close().catch((error: unknown) => {
                        logger.error(
                            { err: error },
                            "Daemon database close failed after listeners closed",
                        );
                    }),
                );
                logger.info("Daemon stopped");
                logger.flush();
                lifecycleActor.send({ type: "CLOSED" });
                yield* Deferred.succeed(closedSignal, undefined);
            }),
        );
        return Effect.runPromise(Fiber.join(closing));
    }

    async function stop(force: boolean): Promise<StopOutcome> {
        const outcome = await teardown(force);
        if (outcome.stopped) await closeListeners();
        return outcome;
    }

    await appState.rebuild();
    const daemon: Daemon = {
        ports,
        services,
        get acceptingInput() {
            return admitting();
        },
        createShell,
        registerRuntime: (input) =>
            Effect.runPromise(
                Effect.gen(function* () {
                    if (!admitting())
                        throw new Error(
                            "The daemon is stopping; no new executions.",
                        );
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
                        terminalId = terminals.authenticateContext(
                            context.data,
                        ).id;
                    }
                    if (terminalId !== undefined) {
                        if (!terminals.get(terminalId)?.alive)
                            throw new Error("Terminal is not running.");
                        if (
                            !borrowing &&
                            terminals.view(terminalId)?.kind === "shell"
                        )
                            throw new Error(
                                "A shell requires authenticated terminal context.",
                            );
                        if (
                            runtimes
                                .list()
                                .some(
                                    (record) =>
                                        record.terminalId === terminalId,
                                )
                        )
                            throw new Error("Terminal already has an Agent.");
                    }
                    if (
                        input.hostId !== undefined &&
                        runtimes
                            .list()
                            .some(
                                (r) =>
                                    r.hostId === input.hostId &&
                                    r.name === input.name,
                            )
                    )
                        throw new Error(
                            "Managed Agent already has an execution awaiting cleanup.",
                        );
                    const registration = Effect.runFork(
                        runtimes.registerEffect({
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
                                            await options.db.hostState.getNetwork(
                                                input.networkId,
                                            )
                                        )?.members.some(
                                            (m) =>
                                                m.agentKey === input.name &&
                                                input.hostId !== undefined,
                                        ) ||
                                        (await options.db.hostState.getNetwork(
                                            input.networkId,
                                        ))!.hostId !== input.hostId
                                    )
                                        throw new Error(
                                            "Managed Agent does not belong to this Host Network.",
                                        );
                                }
                                if (
                                    !runtimes.get(controls.runtimeId)
                                        ?.collaborationActive
                                )
                                    throw new Error(
                                        "Registration cancelled during preparation.",
                                    );
                                return input.createBinding(controls);
                            },
                        }),
                    );
                    registrations.add(registration);
                    let runtimeId: string | undefined;
                    {
                        const outcome4 = yield* Effect.exit(
                            Effect.gen(function* () {
                                const { record, token } =
                                    yield* Fiber.join(registration);
                                runtimeId = record.id;
                                if (record.hostId !== null) {
                                    if (!record.terminalId || !borrowing)
                                        throw new Error(
                                            "Managed Agent requires its authenticated shell.",
                                        );
                                    yield* attempt(() =>
                                        options.db.hostState.startExecution({
                                            runtimeId: record.id,
                                            hostId: record.hostId!,
                                            agentKey: record.name,
                                            terminalId: record.terminalId!,
                                            startedAt: now(),
                                        }),
                                    );
                                    const host = yield* attempt(() =>
                                        options.db.hostState.getHost(
                                            record.hostId!,
                                        ),
                                    );
                                    yield* attempt(() =>
                                        appState.update(
                                            { host: record.hostId! },
                                            ...(host
                                                ? [{ panel: host.panelId }]
                                                : []),
                                        ),
                                    );
                                }
                                if (record.terminalId)
                                    attachTerminalTo(
                                        record.id,
                                        record.terminalId,
                                    );
                                if (
                                    record.terminalId &&
                                    !terminals.get(record.terminalId)?.alive
                                )
                                    throw new Error(
                                        "Terminal exited during registration.",
                                    );
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
                            }).pipe(
                                Effect.ensuring(
                                    Effect.sync(() => {
                                        registrations.delete(registration);
                                    }),
                                ),
                            ),
                        );
                        if (Exit.isFailure(outcome4)) {
                            const error = Cause.squash(outcome4.cause);
                            {
                                const outcome5 = yield* Effect.exit(
                                    Effect.gen(function* () {
                                        if (runtimeId)
                                            yield* attempt(() =>
                                                stopRuntime(runtimeId!),
                                            );
                                        else if (terminalId && !borrowing)
                                            yield* attempt(() =>
                                                terminals.kill(terminalId!),
                                            );
                                    }),
                                );
                                if (Exit.isFailure(outcome5)) {
                                    const cleanupError = Cause.squash(
                                        outcome5.cause,
                                    );
                                    throw new AggregateError(
                                        [error, cleanupError],
                                        "Registration failed and cleanup is unconfirmed.",
                                    );
                                }
                            }
                            throw error;
                        } else return outcome4.value;
                    }
                }),
            ),
        createTerminal: (terminalOptions) => {
            if (!admitting())
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
    lifecycleActor.send({ type: "READY" });
    logger.info(
        { daemonPort: ports.daemon, webPort: ports.web },
        "Daemon listening",
    );
    return daemon;
}
