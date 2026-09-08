import { describe, expect, it } from "vitest";

import type { DeliveryOutcome } from "@/messaging/delivery";
import {
    ONE_WAY_NOTICE,
    deliveredContent,
    notifiesOrigin,
} from "@/messaging/delivery";

const oneWay = { notifiable: true, reverseRouteAtSend: false };
const twoWay = { notifiable: true, reverseRouteAtSend: true };

describe("notifiesOrigin", () => {
    it("tells a one-way sender that its request finished, because it cannot be replied to", () => {
        expect(notifiesOrigin(oneWay, "completed")).toBe(true);
    });

    it("stays silent when a two-way target completes, because the target can reply itself", () => {
        expect(notifiesOrigin(twoWay, "completed")).toBe(false);
    });

    it("reports a failure in both directions", () => {
        expect(notifiesOrigin(oneWay, "failed")).toBe(true);
        expect(notifiesOrigin(twoWay, "failed")).toBe(true);
    });

    it("never auto-notifies an interruption", () => {
        expect(notifiesOrigin(oneWay, "interrupted")).toBe(false);
        expect(notifiesOrigin(twoWay, "interrupted")).toBe(false);
    });

    it("does not notify a send-time rejection, which the send response already reported", () => {
        expect(notifiesOrigin(oneWay, "rejected")).toBe(false);
        expect(notifiesOrigin(twoWay, "rejected")).toBe(false);
    });

    it("never lets a daemon notification produce another notification", () => {
        const outcomes: DeliveryOutcome[] = [
            "completed",
            "failed",
            "interrupted",
            "rejected",
        ];
        for (const outcome of outcomes) {
            expect(
                notifiesOrigin(
                    { notifiable: false, reverseRouteAtSend: false },
                    outcome,
                ),
            ).toBe(false);
            expect(
                notifiesOrigin(
                    { notifiable: false, reverseRouteAtSend: true },
                    outcome,
                ),
            ).toBe(false);
        }
    });

    it("decides per target, so one failing target does not implicate the others", () => {
        const perTarget = [
            { delivery: twoWay, outcome: "completed" as const },
            { delivery: twoWay, outcome: "completed" as const },
            { delivery: twoWay, outcome: "failed" as const },
        ];
        expect(
            perTarget.map(({ delivery, outcome }) =>
                notifiesOrigin(delivery, outcome),
            ),
        ).toEqual([false, false, true]);
    });
});

describe("deliveredContent", () => {
    it("appends the notice after two newlines for a one-way target", () => {
        expect(deliveredContent("review this", false)).toBe(
            `review this\n\n${ONE_WAY_NOTICE}`,
        );
    });

    it("leaves a two-way target's body untouched", () => {
        expect(deliveredContent("review this", true)).toBe("review this");
    });

    it("keeps the notice out of the value a caller stores as the original body", () => {
        const original = "review this";
        expect(deliveredContent(original, false)).not.toBe(original);
        expect(original).toBe("review this");
    });
});
