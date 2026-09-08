import type { AioxDatabase } from "@aiox/persistence";
import { afterEach, expect, it, vi } from "vitest";

import { scheduleRetention } from "@/retention";

afterEach(() => vi.useRealTimers());

it("purges on startup and daily without a reporting callback, then stops", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T00:00:00Z"));
    const purgeBefore = vi.fn().mockResolvedValue({
        messages: 1,
        deliveries: 1,
        notifications: 0,
    });
    const db = { messages: { purgeBefore } } as unknown as AioxDatabase;
    const day = 86_400_000;
    const startedAt = Date.now();
    const schedule = scheduleRetention(db, () => 30);
    try {
        expect(purgeBefore).toHaveBeenCalledWith(startedAt - 30 * day);
        await vi.advanceTimersByTimeAsync(day);
        expect(purgeBefore).toHaveBeenCalledTimes(2);
        expect(purgeBefore).toHaveBeenLastCalledWith(startedAt - 29 * day);
        schedule.stop();
        await vi.advanceTimersByTimeAsync(day);
        expect(purgeBefore).toHaveBeenCalledTimes(2);
    } finally {
        schedule.stop();
    }
});
