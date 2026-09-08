/**
 * A message is one `send` call. A delivery is that message aimed at one target,
 * and it is the unit the daemon observes and notifies on.
 */
export type MessageKind = "agent" | "daemon-notification";

/** `rejected` is a send-time refusal; the other three are request outcomes. */
export type DeliveryOutcome =
    | "rejected"
    | "completed"
    | "failed"
    | "interrupted";

export type Delivery = {
    /** false for a daemon notification, whose completion must not notify again. */
    readonly notifiable: boolean;
    /**
     * Whether the target could send back to the origin **when the message was
     * sent**. Preserved per target so later route edits cannot change the
     * policy that applied to an in-flight request.
     */
    readonly reverseRouteAtSend: boolean;
};

/**
 * | at send time | completed | failed | interrupted |
 * | one-way      | notify    | notify | no          |
 * | two-way      | no        | notify | no          |
 *
 * A rejected target was already reported in the `send` response, so it does not
 * produce a second, asynchronous notice.
 */
export function notifiesOrigin(
    delivery: Delivery,
    outcome: DeliveryOutcome,
): boolean {
    if (!delivery.notifiable) return false;
    if (outcome === "failed") return true;
    if (outcome === "completed") return !delivery.reverseRouteAtSend;
    return false;
}

/** One-way targets are told the sender cannot be replied to. */
export const ONE_WAY_NOTICE =
    "[AIOX Notice] No outbound route to the sender is available. Carry out the request. AIOX will automatically notify the sender when processing completes or fails. Do not attempt to send a reply or acknowledgment.";

/** The stored body stays the original; the notice is generated at delivery. */
export function deliveredContent(
    content: string,
    reverseRouteAtSend: boolean,
): string {
    return reverseRouteAtSend ? content : `${content}\n\n${ONE_WAY_NOTICE}`;
}
