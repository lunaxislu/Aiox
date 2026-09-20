import type { InboundMessage } from "@aiox/vendor";
import { expect, it, vi } from "vitest";

import { ClaudeObservations } from "@/claude-observations";

function setup() {
    const controls = {
        runtimeId: "runtime",
        setStatus: vi.fn(),
        setObservationError: vi.fn(),
        settle: vi.fn().mockResolvedValue(undefined),
    };
    return { controls, observer: new ClaudeObservations(controls) };
}

it("retires only the old instance and keeps the resumed instance independent", async () => {
    const { observer, controls } = setup();
    const old = observer.selectSession("session", true);
    const frame = observer.track(message("old"));
    await observer.observeTranscript(peerInput(frame), old);
    observer.selectSession("other", true);
    const resumed = observer.selectSession("session", true);
    const next = observer.track(message("new"));
    const retiring = observer.retireSession("session", old);
    expect(old.retired).toBe(true);
    expect(old.prompts.size).toBe(0);
    await retiring;
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "old",
        "interrupted",
    );
    await observer.observeTranscript(peerInput(next), resumed);
    await finishPeer(observer, peerInput(next));
    expect(controls.settle).toHaveBeenLastCalledWith("new", "completed");
});

it("keeps unobserved deliveries across retirement and attributes them to actual input", async () => {
    const { observer, controls } = setup();
    const old = observer.selectSession("old", true);
    const frame = observer.track(message());
    const current = observer.selectSession("session", true);
    await observer.retireSession("old", old);
    expect(controls.settle).not.toHaveBeenCalled();
    const row = peerInput(frame);
    await observer.observeTranscript(row, current);
    await finishPeer(observer, row);
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "delivery",
        "completed",
    );
});

it("retirement releases session state while retaining rejected outcomes for retry", async () => {
    const { observer, controls } = setup();
    const old = observer.selectSession("session", true);
    await observer.observeTranscript(peerInput(observer.track(message())), old);
    controls.settle.mockRejectedValueOnce(new Error("storage"));
    await expect(observer.retireSession("session", old)).rejects.toThrow();
    expect(observer.hasPendingOutcomes).toBe(true);
    await observer.retryOutcomes();
    expect(controls.settle.mock.calls).toEqual([
        ["delivery", "interrupted"],
        ["delivery", "interrupted"],
    ]);
    expect(observer.hasPendingOutcomes).toBe(false);
});

function message(deliveryId: string | null = "delivery"): InboundMessage {
    return {
        deliveryId,
        from: {
            name: 'Alice"<',
            role: "reviewer",
            description: "Reviews changes",
        },
        createdAt: 123,
        content: "First line\nSecond line",
    };
}

function event(
    hook_event_name: string,
    prompt_id = "prompt",
    extra: Record<string, unknown> = {},
) {
    return { hook_event_name, session_id: "session", prompt_id, ...extra };
}

function peerInput(frame: string, prompt = "peer-prompt", session = "session") {
    return {
        type: "user",
        sessionId: session,
        promptId: prompt,
        isSidechain: false,
        uuid: `${prompt}-input`,
        parentUuid: null,
        origin: {
            kind: "peer",
            name: "Alice&quot;&lt;",
            body: frame.slice(frame.indexOf("\n") + 1, frame.lastIndexOf("\n")),
        },
        promptSource: "system",
        message: { role: "user", content: `vendor wrapper\n${frame}` },
    };
}

async function finishPeer(
    observer: ClaudeObservations,
    row: ReturnType<typeof peerInput>,
) {
    await observer.observeTranscript({
        type: "assistant",
        sessionId: row.sessionId,
        isSidechain: false,
        uuid: `${row.uuid}-answer`,
        parentUuid: row.uuid,
        message: { role: "assistant", stop_reason: "end_turn", content: [] },
    });
    await observer.observeTranscript({
        type: "system",
        subtype: "turn_duration",
        durationMs: 1,
        sessionId: row.sessionId,
        isSidechain: false,
        uuid: `${row.uuid}-duration`,
        parentUuid: `${row.uuid}-answer`,
    });
}

it("connects transcript peer input without a submit hook and settles once after a session switch", async () => {
    const { observer, controls } = setup();
    const row = peerInput(observer.track(message()));
    observer.observeRegistry({ sessionId: "next", status: "idle" });
    await observer.observeTranscript(row);
    await finishPeer(observer, row);
    await observer.observeTranscript(row);
    await finishPeer(observer, row);
    expect(controls.settle.mock.calls).toEqual([["delivery", "completed"]]);
});

it.each(["human", "sender", "body", "sidechain", "notice"])(
    "does not turn a %s transcript row into another delivery",
    async (mode) => {
        const { observer, controls } = setup();
        const row = peerInput(
            observer.track(message(mode === "notice" ? null : "delivery")),
        );
        if (mode === "human") row.origin.kind = "human";
        if (mode === "sender") row.origin.name = "other";
        if (mode === "body") row.origin.body += " changed";
        if (mode === "sidechain") row.isSidechain = true;
        await observer.observeTranscript(row);
        await finishPeer(observer, row);
        expect(controls.settle).not.toHaveBeenCalled();
        if (mode !== "notice") {
            row.isSidechain = false;
            row.origin = peerInput(observer.track(message("correct"))).origin;
            row.promptId = "correct-prompt";
            row.uuid = "correct-input";
            await observer.observeTranscript(row);
            await finishPeer(observer, row);
            expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
                "correct",
                "completed",
            );
        }
    },
);

it("retains the first StopFailure until its late input arrives, then preserves it across ack rejection", async () => {
    const { observer, controls } = setup();
    const row = peerInput(observer.track(message()));
    await observer.observe(
        event("StopFailure", row.promptId, { error: "rate_limit" }),
    );
    await observer.observe(
        event("StopFailure", row.promptId, { error: "later_failure" }),
    );
    expect(controls.settle).not.toHaveBeenCalled();
    observer.observeRegistry({ sessionId: "next", status: "idle" });
    controls.setStatus.mockClear();
    controls.settle.mockRejectedValueOnce(new Error("ack"));
    await expect(observer.observeTranscript(row)).rejects.toThrow("ack");
    await observer.observeTranscript(row);
    await finishPeer(observer, row);
    expect(controls.settle.mock.calls).toEqual([
        ["delivery", "failed", "rate_limit"],
        ["delivery", "failed", "rate_limit"],
    ]);
    expect(controls.setStatus).not.toHaveBeenCalled();
});

it("joins terminal rows that were written before the peer input, including explicit prompt ids", async () => {
    const { observer, controls } = setup();
    const row = peerInput(observer.track(message()));
    await observer.observeTranscript({
        type: "system",
        subtype: "turn_duration",
        durationMs: 1,
        sessionId: row.sessionId,
        promptId: row.promptId,
        isSidechain: false,
        uuid: "late-duration",
        parentUuid: "late-answer",
    });
    await observer.observeTranscript({
        type: "assistant",
        sessionId: row.sessionId,
        promptId: row.promptId,
        isSidechain: false,
        uuid: "late-answer",
        parentUuid: row.uuid,
        message: { role: "assistant", stop_reason: "end_turn", content: [] },
    });
    expect(controls.settle).not.toHaveBeenCalled();
    await observer.observeTranscript(row);
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "delivery",
        "completed",
    );
});

it("requires registry state and ignores removed hooks", async () => {
    const { observer, controls } = setup();
    const frame = observer.track(message());
    for (const name of [
        "SessionStart",
        "UserPromptSubmit",
        "PermissionRequest",
        "PreToolUse",
        "PostToolUse",
        "Elicitation",
        "ElicitationResult",
        "SessionEnd",
        "Stop",
    ])
        await observer.observe(
            event(name, "p", { prompt: frame, tool_use_id: "tool" }),
        );
    expect(controls.setStatus).not.toHaveBeenCalled();
    expect(controls.settle).not.toHaveBeenCalled();
    observer.observeRegistry({ sessionId: "session", status: "busy" });
    expect(controls.setStatus).toHaveBeenLastCalledWith("working", undefined);
    observer.observeRegistry({
        sessionId: "session",
        status: "waiting",
        waitingFor: "permission prompt",
    });
    expect(controls.setStatus).toHaveBeenLastCalledWith(
        "awaiting-user",
        "Waiting for approval.",
    );
    observer.observeRegistry({ sessionId: "session", status: "idle" });
    expect(controls.setStatus).toHaveBeenLastCalledWith("idle", undefined);
    expect(controls.settle).not.toHaveBeenCalled();
});

it.each([
    [
        { last_assistant_message: "Limit reached", error_details: "429" },
        "Limit reached · rate_limit",
    ],
    [
        { last_assistant_message: "  ", error_details: "429" },
        "429 · rate_limit",
    ],
    [{ last_assistant_message: {}, error_details: "429" }, "429 · rate_limit"],
    [{ error_details: " " }, "rate_limit"],
] as const)(
    "preserves failure details %j without overriding busy or waiting",
    async (details, reason) => {
        const { observer, controls } = setup();
        observer.observeRegistry({ sessionId: "session", status: "busy" });
        const row = peerInput(observer.track(message()));
        await observer.observeTranscript(row);
        await observer.observe(
            event("StopFailure", row.promptId, {
                error: "rate_limit",
                ...details,
            }),
        );
        expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
            "delivery",
            "failed",
            reason,
        );
        expect(controls.setStatus).toHaveBeenLastCalledWith(
            "working",
            undefined,
        );
        observer.observeRegistry({ sessionId: "session", status: "idle" });
        expect(controls.setStatus).toHaveBeenLastCalledWith("failed", reason);
        observer.observeRegistry({ sessionId: "session", status: "waiting" });
        expect(controls.setStatus).toHaveBeenLastCalledWith(
            "awaiting-user",
            "Waiting for user input.",
        );
        observer.observeRegistry({ sessionId: "session", status: "busy" });
        expect(controls.setStatus).toHaveBeenLastCalledWith(
            "working",
            undefined,
        );
    },
);

it("old session failure and quota reports cannot change selected screen", async () => {
    const { observer, controls } = setup();
    const row = peerInput(observer.track(message()), "old-prompt", "old");
    await observer.observeTranscript(row);
    observer.observeRegistry({ sessionId: "new", status: "busy" });
    controls.setStatus.mockClear();
    await observer.observe(
        event("StopFailure", row.promptId, {
            session_id: "old",
            error: "rate_limit",
        }),
    );
    for (const type of [
        "quota_auto_resume_stale",
        "quota_auto_resume_fired",
        "quota_auto_resume_disabled",
    ])
        await observer.observe(
            event("Notification", row.promptId, {
                session_id: "old",
                notification_type: type,
            }),
        );
    expect(controls.setStatus).not.toHaveBeenCalled();
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "delivery",
        "failed",
        "rate_limit",
    );
    observer.observeRegistry({ sessionId: "old", status: "idle" });
    await observer.observeTranscript(row);
    await finishPeer(observer, row);
    expect(controls.settle).toHaveBeenCalledTimes(1);
});

it("retains independent prompt IDs and early failures across rapid switches and resume", async () => {
    const { observer, controls } = setup();
    const a = peerInput(observer.track(message("a")), "same", "a");
    const b = peerInput(observer.track(message("b")), "same", "b");
    await observer.observe(
        event("StopFailure", "same", { session_id: "a", error: "rate_limit" }),
    );
    observer.observeRegistry({ sessionId: "b", status: "busy" });
    await observer.observeTranscript(b);
    observer.observeRegistry({ sessionId: "c", status: "idle" });
    await observer.observeTranscript(a);
    await finishPeer(observer, b);
    observer.observeRegistry({ sessionId: "a", status: "idle" });
    await observer.observeTranscript(a);
    await finishPeer(observer, a);
    expect(controls.settle.mock.calls).toEqual([
        ["a", "failed", "rate_limit"],
        ["b", "completed"],
    ]);
    expect(controls.setStatus).toHaveBeenLastCalledWith("failed", "rate_limit");
});

it("keeps a finished request immutable through quota continuation", async () => {
    const { observer, controls } = setup();
    observer.observeRegistry({ sessionId: "session", status: "idle" });
    const row = peerInput(observer.track(message()));
    await observer.observeTranscript(row);
    await observer.observe(
        event("StopFailure", row.promptId, { error: "rate_limit" }),
    );
    await observer.observe(
        event("Notification", row.promptId, {
            notification_type: "quota_auto_resume_stale",
        }),
    );
    expect(controls.setStatus).toHaveBeenLastCalledWith(
        "awaiting-user",
        "Press Enter to resume the task automatically.",
    );
    await observer.observe(
        event("Notification", row.promptId, {
            notification_type: "quota_auto_resume_fired",
        }),
    );
    observer.observeRegistry({ sessionId: "session", status: "busy" });
    await finishPeer(observer, row);
    observer.observeRegistry({ sessionId: "session", status: "idle" });
    expect(controls.setStatus).toHaveBeenLastCalledWith("idle", undefined);
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "delivery",
        "failed",
        "rate_limit",
    );
});

it("does not infer prompt ownership from text or uncorrelated failures", async () => {
    const { observer, controls } = setup();
    const row = peerInput(observer.track(message()));
    delete (row as Partial<typeof row>).promptId;
    await observer.observeTranscript(row);
    await observer.observe({
        hook_event_name: "StopFailure",
        session_id: "session",
        error: "api_error",
    });
    await finishPeer(observer, row);
    expect(controls.settle).not.toHaveBeenCalled();
    await observer.failPending("vendor_process_failed");
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "delivery",
        "failed",
        "vendor_process_failed",
    );
});

it("does not assign one pending frame to multiple session prompts", async () => {
    const { observer, controls } = setup();
    const frame = observer.track(message());
    const a = peerInput(frame, "a", "a");
    const b = peerInput(frame, "b", "b");
    await observer.observeTranscript(a);
    await observer.observeTranscript(b);
    await finishPeer(observer, a);
    await finishPeer(observer, b);
    expect(controls.settle).not.toHaveBeenCalled();
    await observer.interruptPending();
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "delivery",
        "interrupted",
    );
});

it("preserves a completed outcome on rejection while attempting every remaining delivery", async () => {
    const { observer, controls } = setup();
    const row = peerInput(observer.track(message()));
    await observer.observeTranscript(row);
    controls.settle.mockRejectedValue(new Error("storage unavailable"));
    await expect(finishPeer(observer, row)).rejects.toThrow(
        "storage unavailable",
    );
    observer.track(message("other"));
    await expect(observer.failPending("connection_lost")).rejects.toThrow(
        "storage failed",
    );
    expect(controls.settle).toHaveBeenCalledWith(
        "other",
        "failed",
        "connection_lost",
    );
    controls.settle.mockResolvedValue(undefined);
    await observer.interruptPending();
    expect(controls.settle.mock.calls.slice(-2)).toEqual([
        ["delivery", "completed"],
        ["other", "failed", "connection_lost"],
    ]);
    await observer.interruptPending();
    expect(controls.settle).toHaveBeenCalledTimes(5);
});

it("ignores subagent failures and notification payloads for main prompt", async () => {
    const { observer, controls } = setup();
    observer.observeRegistry({ sessionId: "session", status: "busy" });
    const row = peerInput(observer.track(message()));
    await observer.observeTranscript(row);
    controls.setStatus.mockClear();
    await observer.observe(
        event("StopFailure", row.promptId, {
            agent_id: "child",
            error: "api_error",
        }),
    );
    await observer.observe(
        event("Notification", row.promptId, {
            agent_id: "child",
            notification_type: "quota_auto_resume_stale",
        }),
    );
    expect(controls.setStatus).not.toHaveBeenCalled();
    expect(controls.settle).not.toHaveBeenCalled();
    await finishPeer(observer, row);
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "delivery",
        "completed",
    );
});

it("retains settled prompt identity beyond the old 1024-entry cutoff", async () => {
    const { observer, controls } = setup();
    observer.observeRegistry({ sessionId: "session", status: "idle" });
    const frame = observer.track(message());
    const first = peerInput(frame, "first");
    await observer.observeTranscript(first);
    await finishPeer(observer, first);
    // Cardinality regression, not a throughput or load measurement.
    for (let index = 0; index < 1024; index++) {
        const row = peerInput(frame, `later-${index}`);
        row.origin.kind = "human";
        await observer.observeTranscript(row);
        await finishPeer(observer, row);
    }
    await observer.observe({
        hook_event_name: "StopFailure",
        session_id: "session",
        error: "current_failure",
    });
    controls.setStatus.mockClear();
    await observer.observeTranscript(first);
    await finishPeer(observer, first);
    expect(controls.setStatus).not.toHaveBeenCalled();
    expect(controls.settle).toHaveBeenCalledTimes(1);
});
