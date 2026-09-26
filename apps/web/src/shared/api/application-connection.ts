import {
    ApplicationRpc,
    type ApplicationEvent,
    type WebCommandRequest,
} from "@aiox/protocol";
import { Cause, Deferred, Effect, Fiber, Layer, Scope, Stream } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";
import * as Socket from "effect/unstable/socket/Socket";

type Client = Effect.Success<ReturnType<typeof makeClient>>;
const makeClient = () => RpcClient.make(ApplicationRpc);
export type ApplicationSession = Effect.Success<
    ReturnType<Client["session.open"]>
>;
export type ApplicationCommands = Omit<
    Client,
    "session.open" | "session.resume" | "state.subscribe" | "panel.command"
>;
export type ConnectionState = {
    phase:
        | "stopped"
        | "connecting"
        | "synchronizing"
        | "ready"
        | "reconnecting";
    session: ApplicationSession | undefined;
    issue: unknown;
};
export class ConnectionUnavailable extends Error {
    readonly _tag = "ConnectionUnavailable";
}
export class ResynchronizationRequired extends Error {
    readonly _tag = "ResynchronizationRequired";
}

export function applicationRpcUrl(pageUrl: string): string {
    const url = new URL("/api/rpc", pageUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.href;
}

/** One instance per React app execution. No persisted session, event backlog, or server-state copy. */
export class ApplicationConnection {
    #state: ConnectionState = {
        phase: "stopped",
        session: undefined,
        issue: undefined,
    };
    #listeners = new Set<() => void>();
    #sequence = 0;
    #closing: Promise<void> = Promise.resolve();
    #owner: AbortController | undefined;
    #active:
        | {
              client: Client;
              scope: Scope.Scope;
              resync: Deferred.Deferred<never, unknown>;
          }
        | undefined;

    constructor(
        private readonly url: string,
        private readonly retryDelay = 1000,
    ) {}
    readonly getSnapshot = () => this.#state;
    readonly subscribe = (listener: () => void) => {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    };
    #set(patch: Partial<ConnectionState>) {
        this.#state = { ...this.#state, ...patch };
        for (const listener of this.#listeners) listener();
    }
    #checkpoint(checkpoint: number) {
        const session = this.#state.session;
        if (session && checkpoint > session.checkpoint) {
            this.#sequence = Math.max(this.#sequence, checkpoint);
            this.#set({ session: { ...session, checkpoint } });
        }
    }
    #resync(issue: unknown) {
        this.#set({ phase: "reconnecting", issue });
        if (this.#active)
            Effect.runSync(Deferred.fail(this.#active.resync, issue));
    }

    /** Install the state consumer BEFORE starting. Every new scope starts with a snapshot. */
    start(onEvent: (event: ApplicationEvent) => void): () => Promise<void> {
        if (this.#owner)
            throw new Error("Application connection already started.");
        const controller = new AbortController();
        this.#owner = controller;
        const done = this.#closing.then(async () => {
            if (controller.signal.aborted) return;
            this.#set({ phase: "connecting", issue: undefined });
            await Effect.runPromise(this.#run(onEvent, controller.signal), {
                signal: controller.signal,
            }).catch((issue: unknown) => {
                if (!controller.signal.aborted)
                    this.#set({ phase: "stopped", issue });
            });
        });
        this.#closing = done;
        return () => {
            controller.abort();
            if (this.#owner === controller) {
                this.#owner = undefined;
                this.#set({ phase: "stopped" });
            }
            return done;
        };
    }

    #run(onEvent: (event: ApplicationEvent) => void, signal: AbortSignal) {
        return Effect.gen({ self: this }, function* () {
            while (true) {
                const opened = yield* Deferred.make<
                    void,
                    ConnectionUnavailable
                >();
                const protocol = RpcClient.layerProtocolSocket({
                    retryTransientErrors: false,
                }).pipe(
                    Layer.provide(
                        Socket.layerWebSocket(this.url).pipe(
                            Layer.provide(
                                Socket.layerWebSocketConstructorGlobal,
                            ),
                        ),
                    ),
                    Layer.provide(RpcSerialization.layerJson),
                    Layer.provide(
                        Layer.succeed(RpcClient.ConnectionHooks)({
                            onConnect: Deferred.succeed(opened, undefined).pipe(
                                Effect.asVoid,
                            ),
                            onDisconnect: Deferred.fail(
                                opened,
                                new ConnectionUnavailable(
                                    "WebSocket disconnected before session setup.",
                                ),
                            ).pipe(Effect.asVoid),
                        }),
                    ),
                );
                yield* Effect.scoped(
                    Effect.gen({ self: this }, function* () {
                        const client = yield* makeClient();
                        // RC117 interrupt frames wait for an open socket. Do not start RPCs while dialing.
                        yield* Deferred.await(opened);
                        const previous = this.#state.session;
                        let session = previous
                            ? yield* client["session.resume"]({
                                  clientSessionId: previous.clientSessionId,
                              }).pipe(
                                  Effect.catch((error) =>
                                      "code" in error &&
                                      error.code === "session_expired"
                                          ? client["session.open"]()
                                          : Effect.fail(error),
                                  ),
                              )
                            : yield* client["session.open"]();
                        if (
                            previous &&
                            session.epoch !== previous.epoch &&
                            session.clientSessionId === previous.clientSessionId
                        )
                            session = yield* client["session.open"]();
                        this.#sequence =
                            session.clientSessionId ===
                            previous?.clientSessionId
                                ? Math.max(this.#sequence, session.checkpoint)
                                : session.checkpoint;
                        this.#set({ phase: "synchronizing", session });
                        const scope = yield* Effect.scope;
                        const resync = yield* Deferred.make<never, unknown>();
                        this.#active = { client, scope, resync };
                        yield* Effect.addFinalizer(() =>
                            Effect.sync(() => {
                                this.#active = undefined;
                            }),
                        );
                        let version: number | undefined;
                        yield* Stream.runForEach(
                            client["state.subscribe"]({
                                clientSessionId: session.clientSessionId,
                            }),
                            (event) =>
                                Effect.sync(() => {
                                    if (event.type === "snapshot") {
                                        if (
                                            event.snapshot.epoch !==
                                                session.epoch ||
                                            version !== undefined ||
                                            !Number.isSafeInteger(
                                                event.version,
                                            ) ||
                                            event.version < 0
                                        )
                                            throw new ResynchronizationRequired(
                                                "Unexpected snapshot epoch or second snapshot.",
                                            );
                                        version = event.version;
                                        onEvent(event);
                                        this.#set({
                                            phase: "ready",
                                            issue: undefined,
                                        });
                                    } else if (event.type === "delta") {
                                        if (
                                            version === undefined ||
                                            event.epoch !== session.epoch ||
                                            event.version > version + 1
                                        )
                                            throw new ResynchronizationRequired(
                                                "State stream epoch/version gap.",
                                            );
                                        if (event.version <= version) return;
                                        onEvent(event);
                                        version = event.version;
                                    } else {
                                        if (version === undefined)
                                            throw new ResynchronizationRequired(
                                                "Event before snapshot.",
                                            );
                                        if (
                                            event.type === "sequence-failure" &&
                                            event.failure.clientSessionId ===
                                                session.clientSessionId
                                        )
                                            this.#checkpoint(
                                                Math.max(
                                                    session.checkpoint,
                                                    ...event.failure.missing,
                                                    ...event.failure.unexecuted.map(
                                                        (item) => item.sequence,
                                                    ),
                                                ),
                                            );
                                        onEvent(event);
                                    }
                                }),
                        ).pipe(
                            Effect.andThen(
                                Effect.fail(
                                    new ResynchronizationRequired(
                                        "State stream ended.",
                                    ),
                                ),
                            ),
                            Effect.raceFirst(Deferred.await(resync)),
                        );
                    }),
                ).pipe(
                    Effect.provide(protocol),
                    Effect.catchCause((cause) =>
                        signal.aborted
                            ? Effect.failCause(cause)
                            : Effect.sync(() => {
                                  this.#set({
                                      phase: "reconnecting",
                                      issue: Cause.squash(cause),
                                  });
                              }),
                    ),
                );
                yield* Effect.sleep(this.retryDelay);
            }
        });
    }

    /** Use the generated typed client without duplicating its methods. Effects belong to the connection scope. */
    call<A, E>(
        run: (
            client: ApplicationCommands,
            session: ApplicationSession,
        ) => Effect.Effect<A, E>,
    ) {
        return this.#call(run);
    }
    #call<A, E>(
        run: (
            client: Client,
            session: ApplicationSession,
        ) => Effect.Effect<A, E>,
    ): Effect.Effect<A, E | ConnectionUnavailable> {
        return Effect.suspend(
            (): Effect.Effect<A, E | ConnectionUnavailable> => {
                const active = this.#active;
                const session = this.#state.session;
                if (!active || !session || this.#state.phase !== "ready")
                    return Effect.fail(
                        new ConnectionUnavailable(
                            "Application snapshot is not ready.",
                        ),
                    );
                return run(active.client, session).pipe(
                    Effect.forkIn(active.scope),
                    Effect.flatMap(Fiber.join),
                    Effect.tapError((error) =>
                        Effect.sync(() => {
                            if (typeof error !== "object" || error === null)
                                return;
                            if (
                                "checkpoint" in error &&
                                typeof error.checkpoint === "number"
                            )
                                this.#checkpoint(error.checkpoint);
                            if (
                                "code" in error &&
                                (error.code === "session_expired" ||
                                    error.code === "result_expired")
                            )
                                this.#resync(error);
                        }),
                    ),
                );
            },
        );
    }

    /** No auto replay. Running execute again explicitly reuses this exact immutable request. */
    panelCommand(
        input: Pick<WebCommandRequest, "panelId" | "changes">,
        onRequest?: (request: WebCommandRequest) => void,
    ) {
        const body = structuredClone(input);
        let request: WebCommandRequest | undefined;
        type Command = ReturnType<Client["panel.command"]>;
        const execute = this.#call((client, session) =>
            Effect.suspend(
                (): Effect.Effect<
                    Effect.Success<Command>,
                    Effect.Error<Command> | ConnectionUnavailable
                > => {
                    if (
                        request &&
                        request.clientSessionId !== session.clientSessionId
                    )
                        return Effect.fail(
                            new ConnectionUnavailable(
                                "The command belongs to an expired session. Reconcile its outcome.",
                            ),
                        );
                    if (!request) {
                        if (
                            !Number.isSafeInteger(this.#sequence + 1) ||
                            this.#sequence + 1 - session.checkpoint > 1024
                        )
                            return Effect.fail(
                                new ConnectionUnavailable(
                                    "Session sequence window exhausted.",
                                ),
                            );
                        request = {
                            ...body,
                            clientSessionId: session.clientSessionId,
                            sequence: ++this.#sequence,
                            requestId: crypto.randomUUID(),
                        };
                    }
                    onRequest?.(structuredClone(request));
                    return client["panel.command"](request);
                },
            ),
        ).pipe(
            Effect.tap((answer) =>
                Effect.sync(() => {
                    this.#checkpoint(answer.checkpoint);
                    // Response versions never advance the subscription cursor.
                    if (answer.state === null)
                        this.#resync(
                            new ResynchronizationRequired(
                                "Command returned no state delta.",
                            ),
                        );
                }),
            ),
        );
        return {
            get request() {
                return request ? structuredClone(request) : undefined;
            },
            execute,
        };
    }
}
