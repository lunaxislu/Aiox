import { randomUUID } from "node:crypto";

import type { DeliveryOutcome } from "@aiox/domain";
import { deliveredContent, mcpStatus, notifiesOrigin } from "@aiox/domain";
import type { AioxDatabase } from "@aiox/persistence";

import type { NetworkService } from "@/networks";
import type { RuntimeRecord, RuntimeRegistry } from "@/runtimes";

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
    readonly messageId: string;
    readonly originRuntimeId: string;
    readonly targetRuntimeId: string;
    readonly targetName: string;
    readonly reverseRouteAtSend: boolean;
    readonly notifiable: boolean;
    readonly content: string;
    readonly createdAt: number;
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
    readonly #sending = new Set<Promise<SendResult>>();
    readonly #settling = new Map<string, Promise<void>>();
    #admitting = true;

    constructor(
        private readonly db: AioxDatabase,
        private readonly runtimes: RuntimeRegistry,
        private readonly networks: NetworkService,
        private readonly now: () => number = () => Date.now(),
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
        if (!this.#admitting)
            return Promise.reject(
                new Error("The daemon is stopping; no new messages."),
            );
        const sending = this.#send(source, targets, content).finally(() => {
            this.#sending.delete(sending);
        });
        this.#sending.add(sending);
        return sending;
    }

    /** Stop admission immediately, then finish existing injection attempts. */
    async pause(): Promise<void> {
        this.#admitting = false;
        await Promise.allSettled(this.#sending);
    }

    resume(): void {
        this.#admitting = true;
    }

    async #send(
        source: RuntimeRecord,
        targets: readonly string[],
        content: string,
    ): Promise<SendResult> {
        const unique = [...new Set(targets)];
        if (unique.length === 0)
            throw new Error("send requires at least one target");

        const createdAt = this.now();
        const messageId = randomUUID();
        const checked = await Promise.all(
            unique.map(async (agentId) => ({
                agentId,
                refusal: await this.#refuse(source, agentId),
            })),
        );

        const accepted = await Promise.all(
            checked
                .filter((entry) => entry.refusal === undefined)
                .map(async (entry) => {
                    const target = this.runtimes.get(entry.agentId)!;
                    return {
                        id: randomUUID(),
                        target,
                        // Captured now, so a later route edit cannot change the
                        // notification policy for this in-flight request.
                        reverseRouteAtSend: await this.networks.permits(
                            target,
                            source,
                        ),
                    };
                }),
        );

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
                        id: randomUUID(),
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
                messageId,
                originRuntimeId: source.id,
                targetRuntimeId: entry.target.id,
                targetName: entry.target.name,
                reverseRouteAtSend: entry.reverseRouteAtSend,
                notifiable: true,
                content,
                createdAt,
            });
            try {
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
                this.#inFlight.delete(entry.id);
                await this.db.messages.settle(
                    entry.id,
                    "rejected",
                    this.now(),
                    reason,
                );
                delivered.set(entry.target.id, {
                    agentId: entry.target.id,
                    accepted: false,
                    error: reason,
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
        const flight = this.#inFlight.get(deliveryId);
        // A binding may only settle its own delivery, and only once.
        if (!flight || flight.targetRuntimeId !== runtimeId)
            return Promise.resolve();
        const active = this.#settling.get(deliveryId);
        if (active) return active;
        const settling = this.#settle(
            deliveryId,
            flight,
            outcome,
            error,
        ).finally(() => {
            this.#settling.delete(deliveryId);
        });
        this.#settling.set(deliveryId, settling);
        return settling;
    }

    /** Called after runtimes stop producing outcomes, before closing storage. */
    async drain(): Promise<void> {
        await Promise.allSettled(this.#settling.values());
    }

    async #settle(
        deliveryId: string,
        flight: InFlight,
        outcome: DeliveryOutcome,
        error?: string,
    ): Promise<void> {
        const settled = await this.db.messages.settle(
            deliveryId,
            outcome,
            this.now(),
            error,
        );
        this.#inFlight.delete(deliveryId);
        if (!settled) return;
        if (
            !notifiesOrigin(
                {
                    notifiable: flight.notifiable,
                    reverseRouteAtSend: flight.reverseRouteAtSend,
                },
                outcome,
            )
        ) {
            return;
        }
        const body = notificationBody(
            flight.targetName,
            outcome,
            flight.content,
            error,
        );
        const createdAt = this.now();
        await this.db.messages.addNotification({
            id: randomUUID(),
            deliveryId,
            originRuntimeId: flight.originRuntimeId,
            body,
            createdAt,
            readAt: null,
        });
        const origin = this.runtimes.get(flight.originRuntimeId);
        if (!origin) return;
        try {
            // No delivery id: a daemon notice is not an AIOX request, so its own
            // turn cannot settle anything and cannot cascade another notice.
            await origin.binding.deliver({
                deliveryId: null,
                from: { name: "AIOX", role: null, description: null },
                createdAt,
                content: body,
            });
        } catch {
            // The Web still shows it; a vendor input path that refuses a notice
            // is not a failure of the request that produced it.
        }
    }

    /** Target exit interrupts its requests; origin exit does not erase results. */
    async forget(runtimeId: string): Promise<void> {
        for (const [id, flight] of this.#inFlight) {
            if (flight.targetRuntimeId === runtimeId) {
                await this.settle(runtimeId, id, "interrupted");
            }
        }
    }

    pending(): number {
        return this.#inFlight.size;
    }

    async #refuse(
        source: RuntimeRecord,
        agentId: string,
    ): Promise<string | undefined> {
        const target = this.runtimes.get(agentId);
        if (!target) return "unknown_agent";
        if (target.id === source.id) return "self_target";
        if (
            source.networkId === null ||
            target.networkId !== source.networkId
        ) {
            return "not_in_network";
        }
        if (mcpStatus(target.activity) === null) return "not_available";
        if (!(await this.networks.permits(source, target))) return "no_route";
        return undefined;
    }
}
