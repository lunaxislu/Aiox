import { randomUUID } from "node:crypto";

import type { DeliveryOutcome } from "@aiox/domain";
import { canSend, deliveredContent, notifiesOrigin } from "@aiox/domain";
import type { AioxDatabase } from "@aiox/persistence";

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
    readonly #sending = new Set<Promise<SendResult>>();
    readonly #settling = new Map<string, Promise<void>>();
    #admitting = true;

    constructor(
        private readonly db: AioxDatabase,
        private readonly runtimes: RuntimeRegistry,
        private readonly networks: NetworkService,
        private readonly now: () => number = () => Date.now(),
        private readonly onChange: () => void = () => {},
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
        if (!source.collaborationActive)
            return Promise.reject(
                new Error("This runtime has left collaboration."),
            );
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
        const originTerminalId = source.terminalId;
        if (unique.length === 0)
            throw new Error("send requires at least one target");

        const createdAt = this.now();
        const messageId = randomUUID();
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
                    id: randomUUID(),
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
                originRuntimeId: source.id,
                originExecutionOwnership: source.executionOwnership,
                originTerminalId,
                targetRuntimeId: entry.target.id,
                targetName: entry.target.name,
                reverseRouteAtSend: entry.reverseRouteAtSend,
                content,
            });
            try {
                if (
                    !source.collaborationActive ||
                    this.#refuse(source, entry.target.id) !== undefined
                )
                    throw new Error(
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
        const flight = this.#inFlight.get(deliveryId);
        // A binding may only settle its own delivery, and only once.
        if (!flight || flight.targetRuntimeId !== runtimeId)
            return Promise.resolve();
        // A later cleanup or duplicate report cannot replace a result whose write failed.
        flight.result ??= { outcome, error, at: this.now() };
        const active = this.#settling.get(deliveryId);
        if (active) return active;
        const settling = this.#settle(deliveryId, flight).finally(() => {
            this.#settling.delete(deliveryId);
        });
        this.#settling.set(deliveryId, settling);
        return settling;
    }

    /** Called after runtimes stop producing outcomes, before closing storage. */
    async drain(): Promise<void> {
        await Promise.allSettled(this.#settling.values());
        const results = await Promise.allSettled(
            [...this.#inFlight]
                .filter(([, flight]) => flight.result)
                .map(([id, flight]) =>
                    this.settle(
                        flight.targetRuntimeId,
                        id,
                        flight.result!.outcome,
                        flight.result!.error,
                    ),
                ),
        );
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
    }

    async #settle(deliveryId: string, flight: InFlight): Promise<void> {
        const { outcome, error, at: createdAt } = flight.result!;
        const notification = notifiesOrigin(
            { notifiable: true, reverseRouteAtSend: flight.reverseRouteAtSend },
            outcome,
        )
            ? {
                  id: randomUUID(),
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
        const settled = await this.db.messages.settle(
            deliveryId,
            outcome,
            createdAt,
            error,
            notification,
        );
        this.#inFlight.delete(deliveryId);
        if (!settled || !notification) return;
        if (notification.originExecutionOwnership === "daemon") this.onChange();
        const body = notification.body;
        const origin = this.runtimes.get(flight.originRuntimeId);
        if (!origin?.collaborationActive) return;
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

    /** Target exit interrupts unobserved requests and retries already observed results. */
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
        if (target.status === "aiox-preparing") return "not_available";
        return undefined;
    }
}
