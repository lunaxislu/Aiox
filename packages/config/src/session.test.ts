import { expect, test } from "vitest";

import { createConfigSession } from "@/session";

test("reload applies terminal settings now and ports only at next startup", () => {
    const session = createConfigSession({});
    const result = session.reload({
        ports: { daemon: 5100 },
        terminal: { fontSize: 16 },
    });
    expect(result.effective).toEqual({
        ports: { daemon: 4500, web: 4501 },
        messages: { retentionDays: 30 },
        terminal: { fontSize: 16 },
    });
    expect(result.pendingPorts).toEqual({ daemon: 5100, web: 4501 });
    expect(result.restartRequired).toBe(true);
    expect(session.reload({}).restartRequired).toBe(false);
});

test("invalid reload preserves last good settings and returned snapshots cannot mutate them", () => {
    const session = createConfigSession({
        terminal: { theme: { background: "#000" } },
    });
    expect(() => session.reload({ terminal: { fontSize: 0 } })).toThrow();
    const snapshot = session.snapshot();
    snapshot.effective.terminal!.theme!.background = "#fff";
    expect(session.snapshot().effective.terminal!.theme!.background).toBe(
        "#000",
    );
});
