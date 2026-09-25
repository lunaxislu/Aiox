import { logger } from "@aiox/diagnostics";
import type { DeliveryOutcome } from "@aiox/domain";
import { canSend, deliveredContent, notifiesOrigin } from "@aiox/domain";
import type { AioxDatabase } from "@aiox/persistence";
import type { WebNotificationView } from "@aiox/protocol";
import {
    Deferred,
    Duration,
    Effect,
    Exit,
    Fiber,
    FiberSet,
    Schedule,
    Scope,
} from "effect";
import { v7 as uuidv7 } from "uuid";

import type { NetworkService } from "@/networks";
import type { RuntimeRecord, RuntimeRegistry } from "@/runtimes";

export const collaborationInstruction =
    "Use AIOX agents_list to discover reachable agents and use the returned name values or runtime IDs as send targets in your Network. An unnamed agent uses its runtime ID as its name. Targets resolve to the current participant at send time, with IDs taking precedence over names. Use send for replies too; it requires an outbound route. AIOX daemon notices are notifications, not requests to acknowledge. A send result reports the delivery attempt, not completion of the requested work.";

export const targetNotFound =
    "Target not found in your Network. Call agents_list to check current targets before sending again. Do not resend to targets already accepted.";

export type SendTargetResult = {
    readonly agentId: string;
    readonly accepted: boolean;
    readonly deliveryId?: string;
    readonly error?: string;
};

export type SendResult = {
    readonly messageId: string;
    readonly results: readonly SendTargetResult[];
};

/**
 * Correlation for a delivery the daemon is still waiting on. It is memory
 * state on purpose: the runtimes themselves do not survive a daemon restart,
 * and stored history is never used to resume or resend anything.
 */
type InFlight = {
    readonly originRuntimeId: string;
    readonly originExecutionOwnership: RuntimeRecord["executionOwnership"];
    readonly originTerminalId: string | null;
    readonly targetRuntimeId: string;
    readonly targetName: string;
    readonly reverseRouteAtSend: boolean;
    readonly content: string;
    storageError?: string;
    result?: {
        outcome: DeliveryOutcome;
        error: string | undefined;
        at: number;
    };
};

const PREVIEW = 120;

function preview(content: string): string {
    const single = content.replace(/\s+/g, " ").trim();
    return single.length <= PREVIEW ? single : `${single.slice(0, PREVIEW)}…`;
}

export function notificationBody(
    targetName: string,
    outcome: DeliveryOutcome,
    content: string,
    error?: string,
): string {
    const what = `your request to ${targetName} ("${preview(content)}")`;
    return outcome === "completed"
        ? `[AIOX] ${targetName} finished processing ${what}. No reply will arrive, because there is no outbound route back to you.`
        : `[AIOX] ${what} failed${error ? `: ${error}` : "."}`;
}

export class MessageService {
    readonly #inFlight = new Map<string, InFlight>();
    readonly #scope = Effect.runSync(Scope.make());
    readonly #sending = Effect.runSync(
        FiberSet.make<unknown, unknown>().pipe(
            Effect.provideService(Scope.Scope, this.#scope),
        ),
    );
    readonly #settlingFibers = Effect.runSync(
        FiberSet.make<unknown, unknown>().pipe(
            Effect.provideService(Scope.Scope, this.#scope),
        ),
    );
    readonly #background = Effect.runSync(
        FiberSet.make<unknown, unknown>().pipe(
            Effect.provideService(Scope.Scope, this.#scope),
        ),
    );
    readonly #settling = new Map<string, Deferred.Deferred<void>>();
    #admitting = true;
    #retryFiber: Fiber.Fiber<void, unknown> | undefined;
    #draining: Deferred.Deferred<Exit.Exit<void, unknown>> | undefined;
    #retryPaused = false;
    readonly #retrySchedule = Schedule.exponential("1 second").pipe(
        Schedule.modifyDelay(({ duration }) =>
            Effect.succeed(Duration.min(duration, Duration.seconds(30))),
        ),
    );

    constructor(
        private readonly db: AioxDatabase,
        private readonly runtimes: RuntimeRegistry,
        private readonly networks: NetworkService,
        private readonly now: () => number = () => Date.now(),
        /** A new daemon-owned Web notification was committed. */
        private readonly onChange: (
            notification: WebNotificationView,
        ) => void = () => {},
    ) {}

    /**
     * Delivers to the named targets only. Membership, availability and the
     * directed route are re-checked here, so an older `agents_list` result
     * never acts as a permission, and one refused target does not fail the rest.
     */
    send(
        source: RuntimeRecord,
        targets: readonly string[],
        content: string,
    ): Promise<SendResult> {
        return Effect.runPromise(this.sendEffect(source, targets, content));
    }

    sendEffect(
        source: RuntimeRecord,
        targets: readonly string[],
        content: string,
    ): Effect.Effect<SendResult, unknown> {
        if (!source.collaborationActive)
            return Effect.fail(
                new Error("This runtime has left collaboration."),
            );
        if (!this.#admitting)
            return Effect.fail(
                new Error("The daemon is stopping; no new messages."),
            );
        return FiberSet.run(
            this.#sending,
            Effect.tryPromise({
                try: () => this.#send(source, targets, content),
                catch: (error) => error,
            }),
            { startImmediately: true },
        ).pipe(Effect.flatMap(Fiber.join));
    }

    /** Stop admission immediately, then finish existing injection attempts. */
    async pause(): Promise<void> {
        this.#admitting = false;
        await Effect.runPromise(FiberSet.awaitEmpty(this.#sending));
    }

    resume(): void {
        Effect.runFork(this.resumeEffect());
    }

    resumeEffect(): Effect.Effect<void, unknown> {
        this.#admitting = true;
        this.#retryPaused = false;
        return this.#scheduleRetry();
    }

    async #send(
        source: RuntimeRecord,
        targets: readonly string[],
        content: string,
    ): Promise<SendResult> {
        const unique = [...new Set(targets)];
        const originTerminalId = source.terminalId;
        if (unique.length === 0)
            throw new Error("send requires at least one target");

        const createdAt = this.now();
        const messageId = uuidv7();
        const checked = unique.map((agentId) => ({
            agentId,
            refusal: this.#refuse(source, agentId),
        }));
        // Both directions use one send-time snapshot. Invalid targets do not
        // require a Network lookup, and membership is checked again after it.
        const network = checked.some(({ refusal }) => refusal === undefined)
            ? await this.networks.effective(source.networkId!)
            : undefined;
        for (const entry of checked) {
            if (entry.refusal !== undefined) continue;
            entry.refusal = this.#refuse(source, entry.agentId);
            if (
                entry.refusal === undefined &&
                !canSend(network!, source, this.runtimes.get(entry.agentId)!)
            )
                entry.refusal = "no_route";
        }
        const accepted = checked
            .filter((entry) => entry.refusal === undefined)
            .map((entry) => {
                const target = this.runtimes.get(entry.agentId)!;
                return {
                    id: uuidv7(),
                    target,
                    reverseRouteAtSend: canSend(network!, target, source),
                };
            });

        await this.db.messages.record(
            {
                id: messageId,
                kind: "agent",
                sourceRuntimeId: source.id,
                sourceName: source.name,
                sourceRole: source.role,
                sourceDescription: source.description,
                networkId: source.networkId ?? "",
                // The stored body stays the original; the one-way notice is
                // generated per target at delivery time.
                content,
                createdAt,
            },
            [
                ...accepted.map((entry) => ({
                    id: entry.id,
                    messageId,
                    targetRuntimeId: entry.target.id,
                    reverseRouteAtSend: entry.reverseRouteAtSend,
                    accepted: true,
                    rejectReason: null,
                    outcome: null,
                    outcomeAt: null,
                    outcomeError: null,
                })),
                ...checked
                    .filter((entry) => entry.refusal !== undefined)
                    .map((entry) => ({
                        id: uuidv7(),
                        messageId,
                        targetRuntimeId: entry.agentId,
                        reverseRouteAtSend: false,
                        accepted: false,
                        rejectReason: entry.refusal!,
                        outcome: "rejected" as const,
                        outcomeAt: createdAt,
                        outcomeError: entry.refusal!,
                    })),
            ],
        );

        const delivered = new Map<string, SendTargetResult>();
        for (const entry of accepted) {
            this.#inFlight.set(entry.id, {
                originRuntimeId: source.id,
                originExecutionOwnership: source.executionOwnership,
                originTerminalId,
                targetRuntimeId: entry.target.id,
                targetName: entry.target.name,
                reverseRouteAtSend: entry.reverseRouteAtSend,
                content,
            });
            try {
                const refusal = this.#refuse(source, entry.target.id);
                if (!source.collaborationActive || refusal !== undefined)
                    throw new Error(
                        refusal ??
                            "Runtime is no longer available for delivery.",
                    );
                await entry.target.binding.deliver({
                    deliveryId: entry.id,
                    from: {
                        name: source.name,
                        role: source.role,
                        description: source.description,
                    },
                    createdAt,
                    content: deliveredContent(
                        content,
                        entry.reverseRouteAtSend,
                    ),
                });
                delivered.set(entry.target.id, {
                    agentId: entry.target.id,
                    accepted: true,
                    deliveryId: entry.id,
                });
            } catch (error) {
                // Refused at injection time. The caller learns about it in this
                // response, so it must not also produce a later notification.
                const reason =
                    error instanceof Error ? error.message : String(error);
                let diagnostic = reason;
                try {
                    await this.settle(
                        entry.target.id,
                        entry.id,
                        "rejected",
                        reason,
                    );
                } catch (storageError) {
                    diagnostic += `; outcome storage failed: ${storageError instanceof Error ? storageError.message : String(storageError)}`;
                }
                delivered.set(entry.target.id, {
                    agentId: entry.target.id,
                    accepted: false,
                    error: diagnostic,
                });
            }
        }

        return {
            messageId,
            results: checked.map(
                ({ agentId, refusal }) =>
                    delivered.get(agentId) ?? {
                        agentId,
                        accepted: false,
                        error: refusal ?? "not_delivered",
                    },
            ),
        };
    }

    /**
     * Records the result of one AIOX input and applies the notification policy.
     * A turn with no delivery id never reaches here, which is why finishing a
     * user's own request cannot notify a previous sender.
     */
    settle(
        runtimeId: string,
        deliveryId: string,
        outcome: DeliveryOutcome,
        error?: string,
    ): Promise<void> {
        return Effect.runPromise(
            this.settleEffect(runtimeId, deliveryId, outcome, error),
        );
    }

    /** Effect seam used by daemon workers and TestClock-based retry tests. */
    settleEffect(
        runtimeId: string,
        deliveryId: string,
        outcome: DeliveryOutcome,
        error?: string,
    ): Effect.Effect<void, unknown> {
        return Effect.gen({ self: this }, function* () {
            const flight = this.#inFlight.get(deliveryId);
            if (!flight) {
                yield* Effect.tryPromise({
                    try: () => this.#ackStoredEffect(runtimeId, deliveryId),
                    catch: (error) => error,
                });
                return;
            }
            if (flight.targetRuntimeId !== runtimeId)
                return yield* Effect.fail(
                    new Error("Runtime does not own this delivery."),
                );
            flight.result ??= { outcome, error, at: this.now() };
            yield* this.#persistEffect(deliveryId, flight);
        });
    }

    async #ackStoredEffect(
        runtimeId: string,
        deliveryId: string,
    ): Promise<void> {
        const stored = await this.db.messages.delivery(deliveryId);
        if (stored?.targetRuntimeId !== runtimeId || stored.outcome === null)
            throw new Error("Runtime does not own this settled delivery.");
    }

    #persistEffect(
        deliveryId: string,
        flight: InFlight,
    ): Effect.Effect<void, unknown> {
        return Effect.gen({ self: this }, function* () {
            const active = this.#settling.get(deliveryId);
            if (active) return yield* Deferred.await(active);

            const firstAttempt = Deferred.makeUnsafe<void>();
            this.#settling.set(deliveryId, firstAttempt);
            const persist = Effect.gen({ self: this }, function* () {
                yield* this.#settleOutcomeEffect(deliveryId, flight);
            }).pipe(
                Effect.catch((error) =>
                    Effect.sync(() => {
                        const reason =
                            error instanceof Error
                                ? error.message
                                : String(error);
                        if (flight.storageError !== reason) {
                            logger.error(
                                {
                                    err: error,
                                    deliveryId,
                                    runtimeId: flight.targetRuntimeId,
                                },
                                "Outcome storage failed",
                            );
                        }
                        flight.storageError = reason;
                    }),
                ),
                Effect.ensuring(
                    Effect.gen({ self: this }, function* () {
                        this.#settling.delete(deliveryId);
                        yield* Deferred.succeed(firstAttempt, undefined);
                        yield* this.#scheduleRetry().pipe(
                            Effect.catch(() => Effect.void),
                        );
                    }),
                ),
            );
            yield* FiberSet.run(this.#settlingFibers, persist, {
                startImmediately: true,
            });
            yield* Deferred.await(firstAttempt);
        });
    }

    #snapshot(): [string, InFlight][] {
        return [...this.#inFlight].filter(
            ([, flight]) => flight.result !== undefined,
        );
    }

    #scheduleRetry(): Effect.Effect<void, unknown> {
        return Effect.gen({ self: this }, function* () {
            if (this.#retryPaused || this.#retryFiber) return;
            if (
                ![...this.#inFlight.values()].some(
                    (flight) => flight.storageError !== undefined,
                )
            )
                return;
            const retrying = Effect.sleep(Duration.seconds(1))
                .pipe(
                    Effect.andThen(
                        Effect.retry(this.#retryAttempt(), this.#retrySchedule),
                    ),
                )
                .pipe(
                    Effect.ensuring(
                        Effect.sync(() => {
                            this.#retryFiber = undefined;
                        }),
                    ),
                );
            this.#retryFiber = yield* FiberSet.run(this.#background, retrying, {
                startImmediately: true,
            });
        });
    }

    #retryAttempt(): Effect.Effect<void, unknown> {
        return Effect.gen({ self: this }, function* () {
            for (const [id, flight] of this.#snapshot()) {
                if (
                    this.#inFlight.get(id) === flight &&
                    flight.storageError !== undefined
                )
                    yield* this.#persistEffect(id, flight);
            }
            if (
                [...this.#inFlight.values()].some(
                    (flight) => flight.storageError !== undefined,
                )
            )
                return yield* Effect.fail(
                    new Error("Message outcome storage retry failed."),
                );
        });
    }

    #persistSnapshot(): Effect.Effect<void, unknown> {
        return Effect.gen({ self: this }, function* () {
            for (const [id, flight] of this.#snapshot())
                if (this.#inFlight.get(id) === flight)
                    yield* this.#persistEffect(id, flight);
        });
    }

    /** Join writes, suspend retries, then make one final storage attempt. */
    drain(): Promise<void> {
        return Effect.runPromise(this.drainEffect());
    }

    /** Effect seam for callers/tests that need to share a virtual Clock. */
    drainEffect(): Effect.Effect<void, unknown> {
        return Effect.suspend(() => {
            const existing = this.#draining;
            if (existing)
                return Effect.flatMap(Deferred.await(existing), (result) =>
                    Exit.isSuccess(result)
                        ? Effect.void
                        : Effect.failCause(result.cause),
                );
            const complete = Deferred.makeUnsafe<Exit.Exit<void, unknown>>();
            this.#draining = complete;
            return Effect.gen({ self: this }, function* () {
                const result = yield* Effect.exit(this.#drainWork());
                yield* Deferred.succeed(complete, result);
                this.#draining = undefined;
                if (Exit.isFailure(result))
                    return yield* Effect.failCause(result.cause);
            });
        });
    }

    #drainWork(): Effect.Effect<void, unknown> {
        return Effect.gen({ self: this }, function* () {
            this.#retryPaused = true;
            if (this.#retryFiber) {
                yield* Fiber.interrupt(this.#retryFiber);
                this.#retryFiber = undefined;
            }
            yield* Effect.forEach(
                [...this.#settling.values()],
                Deferred.await,
                { discard: true },
            );
            yield* this.#persistSnapshot();
            const remaining = this.#snapshot();
            if (remaining.length) {
                const reason = remaining
                    .map(
                        ([id, flight]) =>
                            `${id}: ${flight.storageError ?? "write incomplete"}`,
                    )
                    .join("; ");
                return yield* Effect.fail(
                    new Error(
                        `Unstored outcomes (${remaining.length}): ${reason}`,
                    ),
                );
            }
        });
    }

    #settleOutcomeEffect(
        deliveryId: string,
        flight: InFlight,
    ): Effect.Effect<void, unknown> {
        return Effect.gen({ self: this }, function* () {
            const { outcome, error, at: createdAt } = flight.result!;
            const notification = notifiesOrigin(
                {
                    notifiable: true,
                    reverseRouteAtSend: flight.reverseRouteAtSend,
                },
                outcome,
            )
                ? {
                      id: uuidv7(),
                      originRuntimeId: flight.originRuntimeId,
                      originExecutionOwnership: flight.originExecutionOwnership,
                      originTerminalId: flight.originTerminalId,
                      body: notificationBody(
                          flight.targetName,
                          outcome,
                          flight.content,
                          error,
                      ),
                      createdAt,
                      readAt: null,
                  }
                : undefined;
            const settled = yield* Effect.tryPromise({
                try: () =>
                    this.db.messages.settle(
                        deliveryId,
                        outcome,
                        createdAt,
                        error,
                        notification,
                    ),
                catch: (cause) => cause,
            });
            this.#inFlight.delete(deliveryId);
            if (flight.storageError !== undefined) {
                logger.info(
                    { deliveryId, runtimeId: flight.targetRuntimeId },
                    "Outcome storage recovered",
                );
            }
            if (!settled || !notification) return;
            if (notification.originExecutionOwnership === "daemon") {
                yield* Effect.sync(() =>
                    this.onChange({
                        id: notification.id,
                        originRuntimeId: notification.originRuntimeId,
                        terminalId: notification.originTerminalId,
                        body: notification.body,
                        createdAt: notification.createdAt,
                        readAt: notification.readAt,
                    }),
                );
            }
            const origin = this.runtimes.get(flight.originRuntimeId);
            if (!origin?.collaborationActive) return;
            yield* Effect.tryPromise({
                try: () =>
                    origin.binding.deliver({
                        deliveryId: null,
                        from: { name: "AIOX", role: null, description: null },
                        createdAt,
                        content: notification.body,
                    }),
                catch: () => undefined,
            });
        });
    }

    async forget(runtimeId: string): Promise<void> {
        for (const [id, flight] of this.#inFlight)
            if (flight.targetRuntimeId === runtimeId)
                await this.settle(runtimeId, id, "interrupted");
    }

    pending(): number {
        return this.#inFlight.size;
    }

    #refuse(source: RuntimeRecord, agentId: string): string | undefined {
        const target = this.runtimes.get(agentId);
        if (!target?.collaborationActive) return targetNotFound;
        if (target.id === source.id) return "self_target";
        if (
            source.networkId === null ||
            target.networkId !== source.networkId
        ) {
            return "not_in_network";
        }
        if (target.status === "aiox-preparing")
            return "not_available: Agent is preparing/switching session. Please try again in a few moments.";
        return undefined;
    }
}
