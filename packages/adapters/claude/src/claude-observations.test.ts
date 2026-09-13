import type { InboundMessage } from "@aiox/vendor";
import { expect, it, vi } from "vitest";

import { ClaudeObservations } from "@/claude-observations";

function setup(options = {}) {
    const controls = {
        runtimeId: "runtime",
        setActivity: vi.fn(),
        settle: vi.fn().mockResolvedValue(undefined),
    };
    return { controls, observer: new ClaudeObservations(controls, options) };
}

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

it("ignores subagent hooks sharing the main prompt identity", async () => {
    const { observer, controls } = setup();
    const frame = observer.track(message());
    await observer.observe(
        event("UserPromptSubmit", "prompt", { prompt: frame }),
    );
    controls.setActivity.mockClear();
    await observer.observe(
        event("StopFailure", "prompt", {
            agent_id: "child",
            error: "rate_limit",
        }),
    );
    await observer.observe(
        event("PreToolUse", "prompt", {
            agent_id: "child",
            tool_name: "AskUserQuestion",
            tool_use_id: "tool",
        }),
    );
    expect(controls.settle).not.toHaveBeenCalled();
    expect(controls.setActivity).not.toHaveBeenCalled();
    await observer.observe(
        event("Stop", "prompt", { agent_type: "custom-main-agent" }),
    );
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "delivery",
        "completed",
    );
});

it("frames the complete sender and body and settles only the exact observed input", async () => {
    const { observer, controls } = setup();
    const frame = observer.track(message());
    expect(frame).toContain('from-name="Alice&quot;&lt;"');
    expect(frame).toContain("reviewer");
    expect(frame).toContain("Reviews changes");
    expect(frame).toContain("123");
    expect(frame).toContain("First line\nSecond line");
    expect(controls.setActivity).not.toHaveBeenCalled();
    await observer.observe(
        event("UserPromptSubmit", "prompt", { prompt: frame }),
    );
    await observer.observe(event("Stop"));
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "delivery",
        "completed",
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("idle");
});

it("does not confuse a quoted marker or later direct input with the original sender", async () => {
    const { observer, controls } = setup();
    const frame = observer.track(message());
    await observer.observe(
        event("UserPromptSubmit", "quote", {
            prompt: `Quoted content: ${frame}`,
        }),
    );
    await observer.observe(event("Stop", "quote"));
    expect(controls.settle).not.toHaveBeenCalled();
    await observer.observe(event("UserPromptSubmit", "aio", { prompt: frame }));
    await observer.observe(event("Stop", "aio"));
    await observer.observe(
        event("UserPromptSubmit", "direct", { prompt: "My own task" }),
    );
    await observer.observe(event("Stop", "direct"));
    expect(controls.settle).toHaveBeenCalledTimes(1);
});

it("keeps other observed work active when one input completes", async () => {
    const { observer, controls } = setup();
    const first = observer.track(message("first"));
    const second = observer.track(message("second"));
    await observer.observe(event("UserPromptSubmit", "one", { prompt: first }));
    await observer.observe(
        event("UserPromptSubmit", "two", { prompt: second }),
    );
    await observer.observe(event("Stop", "one"));
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "first",
        "completed",
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("reasoning");
    await observer.observe(event("Stop", "two"));
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("idle");
});

it("does not settle a reused key or one raw input observed under two keys", async () => {
    const { observer, controls } = setup();
    const first = observer.track(message("first"));
    const second = observer.track(message("second"));
    await observer.observe(
        event("UserPromptSubmit", "same", { prompt: first }),
    );
    await observer.observe(
        event("UserPromptSubmit", "same", { prompt: second }),
    );
    await observer.observe(event("Stop", "same"));
    expect(controls.settle).not.toHaveBeenCalled();
    const third = observer.track(message("third"));
    await observer.observe(event("UserPromptSubmit", "one", { prompt: third }));
    await observer.observe(event("UserPromptSubmit", "two", { prompt: third }));
    await observer.observe(event("Stop", "one"));
    await observer.observe(event("Stop", "two"));
    expect(controls.settle).not.toHaveBeenCalled();
});

it("retains uncertain Stop-hook outcomes and never settles daemon notices", async () => {
    const blocked = setup({ hasBlockingStopHooks: true });
    const frame = blocked.observer.track(message());
    await blocked.observer.observe(
        event("UserPromptSubmit", "prompt", { prompt: frame }),
    );
    await blocked.observer.observe(event("Stop"));
    expect(blocked.controls.settle).not.toHaveBeenCalled();
    expect(blocked.controls.setActivity.mock.lastCall?.[0]).toBe("reasoning");
    const { observer, controls } = setup();
    await observer.observe(
        event("UserPromptSubmit", "notice", {
            prompt: observer.track(message(null)),
        }),
    );
    await observer.observe(event("Stop", "notice"));
    expect(controls.settle).not.toHaveBeenCalled();
});

it("retains a failed storage settlement for retry without notifying twice", async () => {
    const { observer, controls } = setup();
    const frame = observer.track(message());
    await observer.observe(
        event("UserPromptSubmit", "prompt", { prompt: frame }),
    );
    controls.settle.mockRejectedValueOnce(new Error("storage failure"));
    await expect(observer.observe(event("Stop"))).rejects.toThrow(
        "storage failure",
    );
    await observer.observe(event("Stop"));
    await observer.observe(event("Stop"));
    expect(controls.settle).toHaveBeenCalledTimes(2);
});

it("distinguishes an individual API failure from the other active input", async () => {
    const { observer, controls } = setup();
    await observer.observe(
        event("UserPromptSubmit", "one", {
            prompt: observer.track(message("one")),
        }),
    );
    await observer.observe(
        event("UserPromptSubmit", "two", {
            prompt: observer.track(message("two")),
        }),
    );
    await observer.observe(
        event("StopFailure", "one", {
            error: "rate_limit",
            error_details: "secret",
        }),
    );
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "one",
        "failed",
        "rate_limit",
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("reasoning");
    await observer.observe(event("StopFailure", "two", { error: "secret" }));
    expect(controls.settle).toHaveBeenLastCalledWith(
        "two",
        "failed",
        "unknown",
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("failed");
});

it("fails or interrupts outstanding inputs without losing earlier confirmed outcomes on retry", async () => {
    const { observer, controls } = setup();
    const first = observer.track(message("first"));
    observer.track(message("second"));
    const failedWrite = observer.track(message("unsent"));
    observer.forget(failedWrite);
    await observer.observe(event("UserPromptSubmit", "one", { prompt: first }));
    controls.settle.mockRejectedValueOnce(new Error("storage"));
    await expect(observer.observe(event("Stop", "one"))).rejects.toThrow(
        "storage",
    );
    await observer.failPending("connection_lost");
    expect(controls.settle.mock.calls).toEqual([
        ["first", "completed"],
        ["first", "completed"],
        ["second", "failed", "connection_lost"],
    ]);
    const third = observer.track(message("third"));
    await observer.observe(
        event("UserPromptSubmit", "three", { prompt: third }),
    );
    await observer.interruptPending();
    expect(controls.settle).toHaveBeenLastCalledWith("third", "interrupted");
});

it("keeps another approval pending when an elicitation resolves or a prompt ends", async () => {
    const { observer, controls } = setup();
    await observer.observe(
        event("UserPromptSubmit", "one", { prompt: "direct" }),
    );
    await observer.observe(
        event("PreToolUse", "one", {
            tool_use_id: "approval",
            tool_name: "Bash",
        }),
    );
    await observer.observe(
        event("PermissionRequest", "one", {
            tool_name: "Bash",
            tool_input: { command: "printf test" },
        }),
    );
    await observer.observe(
        event("Elicitation", "one", {
            mcp_server_name: "user",
            elicitation_id: "question",
        }),
    );
    await observer.observe(
        event("ElicitationResult", "one", {
            mcp_server_name: "user",
            elicitation_id: "other",
            action: "accept",
        }),
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("awaiting-user");
    await observer.observe(
        event("ElicitationResult", "one", {
            mcp_server_name: "user",
            elicitation_id: "question",
            action: "cancel",
        }),
    );
    await observer.observe(
        event("UserPromptSubmit", "two", { prompt: "another" }),
    );
    await observer.observe(event("Stop", "two"));
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("awaiting-user");
    await observer.observe(
        event("PostToolUse", "one", { tool_use_id: "approval" }),
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("reasoning");
    expect(controls.settle).not.toHaveBeenCalled();
});

it("reports quota notifications without completing or resending requests", async () => {
    const { observer, controls } = setup();
    const frame = observer.track(message());
    await observer.observe(event("UserPromptSubmit", "one", { prompt: frame }));
    await observer.observe(
        event("Notification", "one", {
            notification_type: "quota_auto_resume_stale",
            message: "secret",
        }),
    );
    expect(controls.setActivity.mock.lastCall).toEqual([
        "awaiting-user",
        { event: "quota_auto_resume_stale" },
    ]);
    await observer.observe(
        event("Notification", "one", {
            notification_type: "quota_auto_resume_fired",
        }),
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("reasoning");
    expect(controls.settle).not.toHaveBeenCalled();
});

it("keeps a quota-interrupted session failed until its continuation starts and ends", async () => {
    const { observer, controls } = setup();
    await observer.observe(
        event("UserPromptSubmit", "one", { prompt: observer.track(message()) }),
    );
    await observer.observe(
        event("StopFailure", "one", { error: "rate_limit" }),
    );
    expect(controls.settle).toHaveBeenCalledExactlyOnceWith(
        "delivery",
        "failed",
        "rate_limit",
    );
    await observer.observe(
        event("Notification", "one", {
            notification_type: "quota_auto_resume_fired",
        }),
    );
    // The notice announces a resume; only the continuation's own request proves
    // one started, and only its own end proves the session went idle again.
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("failed");
    await observer.observe(
        event("UserPromptSubmit", "resumed", { prompt: "continue the task" }),
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("reasoning");
    await observer.observe(event("Stop", "resumed"));
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("idle");
    expect(controls.settle).toHaveBeenCalledTimes(1);
});

it("records uncorrelated API failures but never guesses their delivery", async () => {
    const { observer, controls } = setup();
    observer.track(message());
    await observer.observe({
        hook_event_name: "StopFailure",
        session_id: "session",
        error: "authentication_failed",
        error_details: "secret",
    });
    expect(controls.setActivity.mock.lastCall).toEqual([
        "failed",
        { event: "StopFailure", reason: "authentication_failed" },
    ]);
    expect(controls.settle).not.toHaveBeenCalled();
    await observer.observe(
        event("UserPromptSubmit", "direct", { prompt: "direct" }),
    );
    await observer.observe(event("Stop", "direct"));
    expect(controls.settle).not.toHaveBeenCalled();
});

it("serializes concurrent terminal hooks and retains each cleanup failure for retry", async () => {
    const { observer, controls } = setup();
    await observer.observe(
        event("UserPromptSubmit", "one", {
            prompt: observer.track(message("one")),
        }),
    );
    await Promise.all([
        observer.observe(event("Stop", "one")),
        observer.observe(event("Stop", "one")),
    ]);
    expect(controls.settle).toHaveBeenCalledTimes(1);
    observer.track(message("two"));
    observer.track(message("three"));
    controls.settle.mockRejectedValueOnce(new Error("storage"));
    await expect(observer.failPending("connection_lost")).rejects.toThrow(
        "retry cleanup",
    );
    expect(controls.settle).toHaveBeenLastCalledWith(
        "three",
        "failed",
        "connection_lost",
    );
    await observer.failPending("connection_lost");
    expect(controls.settle).toHaveBeenLastCalledWith(
        "two",
        "failed",
        "connection_lost",
    );
});

it("retains missing prompt identity as unconfirmed when another prompt ends", async () => {
    const { observer, controls } = setup();
    await observer.observe({
        hook_event_name: "UserPromptSubmit",
        session_id: "session",
        prompt: "no id",
    });
    await observer.observe(
        event("UserPromptSubmit", "known", { prompt: "known" }),
    );
    await observer.observe(event("Stop", "known"));
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("reasoning");
    expect(controls.settle).not.toHaveBeenCalled();
});

it("reconciles approval notification hints with identified waits without clearing other prompts", async () => {
    const { observer, controls } = setup();
    await observer.observe(event("UserPromptSubmit", "one", { prompt: "one" }));
    await observer.observe(event("UserPromptSubmit", "two", { prompt: "two" }));
    await observer.observe(
        event("Notification", "one", {
            notification_type: "permission_prompt",
        }),
    );
    await observer.observe(
        event("PreToolUse", "one", {
            tool_use_id: "one-tool",
            tool_name: "Bash",
        }),
    );
    await observer.observe(
        event("PermissionRequest", "one", {
            tool_name: "Bash",
            tool_input: { command: "printf test" },
        }),
    );
    await observer.observe(
        event("PreToolUse", "two", {
            tool_use_id: "two-tool",
            tool_name: "Bash",
        }),
    );
    await observer.observe(
        event("PermissionRequest", "two", {
            tool_name: "Bash",
            tool_input: { command: "printf test" },
        }),
    );
    await observer.observe(
        event("PostToolUse", "one", { tool_use_id: "one-tool" }),
    );
    await observer.observe(event("Stop", "one"));
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("awaiting-user");
    await observer.observe(
        event("PostToolUse", "two", { tool_use_id: "two-tool" }),
    );
    await observer.observe(event("Stop", "two"));
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("idle");
});

it.each(["elicitation_dialog", "elicitation_url_dialog"])(
    "clears a late %s notification when its identified request resolves",
    async (notification_type) => {
        const { observer, controls } = setup();
        const identity = { mcp_server_name: "mcp", elicitation_id: "question" };
        await observer.observe(event("Elicitation", "one", identity));
        await observer.observe(
            event("Notification", "one", { notification_type }),
        );
        await observer.observe(
            event("Notification", "two", {
                notification_type: "permission_prompt",
            }),
        );
        await observer.observe(
            event("ElicitationResult", "one", {
                ...identity,
                action: "accept",
            }),
        );
        expect(controls.setActivity.mock.lastCall?.[0]).toBe("awaiting-user");
        await observer.observe(
            event("PreToolUse", "two", {
                tool_use_id: "tool",
                tool_name: "Bash",
            }),
        );
        await observer.observe(
            event("PermissionRequest", "two", {
                tool_name: "Bash",
                tool_input: { command: "printf test" },
            }),
        );
        await observer.observe(
            event("PostToolUseFailure", "two", { tool_use_id: "tool" }),
        );
        expect(controls.setActivity.mock.lastCall?.[0]).toBe("idle");
    },
);

it("replaces an uncorrelated approval notification with identified evidence", async () => {
    const { observer, controls } = setup();
    await observer.observe({
        hook_event_name: "Notification",
        session_id: "session",
        notification_type: "permission_prompt",
    });
    await observer.observe(
        event("PreToolUse", "one", { tool_use_id: "tool", tool_name: "Bash" }),
    );
    await observer.observe(
        event("PermissionRequest", "one", {
            tool_name: "Bash",
            tool_input: { command: "printf test" },
        }),
    );
    await observer.observe(
        event("PostToolUse", "one", { tool_use_id: "tool" }),
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("idle");
});

it("clears only the finished prompt's real permission payload and tools", async () => {
    const { observer, controls } = setup();
    for (const prompt of ["one", "two"]) {
        await observer.observe(event("UserPromptSubmit", prompt, { prompt }));
        await observer.observe(
            event("PreToolUse", prompt, {
                tool_name: "Bash",
                tool_use_id: prompt,
            }),
        );
        await observer.observe(
            event("PermissionRequest", prompt, {
                tool_name: "Bash",
                tool_input: { command: "printf test" },
            }),
        );
    }
    await observer.observe(event("Stop", "one"));
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("awaiting-user");
    await observer.observe(event("PostToolUse", "two", { tool_use_id: "two" }));
    await observer.observe(event("Stop", "two"));
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("idle");
    await observer.observe(
        event("PermissionRequest", "one", { tool_name: "Bash" }),
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("idle");
});

it("correlates transcript interruption with an observed tool and preserves other prompts", async () => {
    const { observer, controls } = setup({ hasBlockingStopHooks: true });
    for (const prompt of ["one", "two"]) {
        await observer.observe(
            event("UserPromptSubmit", prompt, {
                prompt: observer.track(message(prompt)),
            }),
        );
        await observer.observe(
            event("PreToolUse", prompt, { tool_use_id: prompt }),
        );
        await observer.observe(
            event("PermissionRequest", prompt, { tool_name: "Bash" }),
        );
    }
    const result = {
        type: "user",
        isSidechain: false,
        sessionId: "session",
        promptId: "one",
        uuid: "result",
        toolDenialKind: "user-rejected",
        message: {
            role: "user",
            content: [
                { type: "tool_result", tool_use_id: "one", is_error: true },
            ],
        },
    };
    const interrupted = {
        type: "user",
        isSidechain: false,
        sessionId: "session",
        promptId: "one",
        parentUuid: "result",
        uuid: "interrupted",
        message: {
            role: "user",
            content: [
                {
                    type: "text",
                    text: "[Request interrupted by user for tool use]",
                },
            ],
        },
    };
    await observer.observeTranscript(interrupted);
    expect(controls.settle).not.toHaveBeenCalled();
    await observer.observeTranscript({ ...result, sessionId: "other" });
    await observer.observeTranscript(interrupted);
    expect(controls.settle).not.toHaveBeenCalled();
    await observer.observeTranscript(result);
    expect(controls.settle).not.toHaveBeenCalled();
    controls.settle.mockRejectedValueOnce(new Error("storage"));
    await expect(observer.observeTranscript(interrupted)).rejects.toThrow(
        "storage",
    );
    await observer.observeTranscript(interrupted);
    await observer.observeTranscript(result);
    await observer.observeTranscript(interrupted);
    expect(controls.settle.mock.calls).toEqual([
        ["one", "interrupted"],
        ["one", "interrupted"],
    ]);
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("awaiting-user");
    await observer.observe(event("PostToolUse", "one", { tool_use_id: "one" }));
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("awaiting-user");
});

it("retains approval during another tool's Post and releases it when all owned tools resolve", async () => {
    const { observer, controls } = setup();
    await observer.observe(
        event("UserPromptSubmit", "one", { prompt: "direct" }),
    );
    for (const tool of ["read", "bash"])
        await observer.observe(
            event("PreToolUse", "one", { tool_use_id: tool }),
        );
    await observer.observe(
        event("PermissionRequest", "one", { tool_name: "Bash" }),
    );
    await observer.observe(
        event("PostToolUse", "one", { tool_use_id: "read" }),
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("awaiting-user");
    await observer.observe(
        event("PostToolUse", "one", { tool_use_id: "bash" }),
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("reasoning");
    await observer.observe(event("Stop", "one"));
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("idle");
});

it("still consumes session quota notices carrying a finished prompt ID", async () => {
    const { observer, controls } = setup();
    await observer.observe(
        event("UserPromptSubmit", "one", { prompt: "direct" }),
    );
    await observer.observe(
        event("StopFailure", "one", { error: "rate_limit" }),
    );
    await observer.observe(
        event("Notification", "one", {
            notification_type: "quota_auto_resume_stale",
        }),
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("awaiting-user");
    await observer.observe(
        event("Notification", "one", {
            notification_type: "quota_auto_resume_fired",
        }),
    );
    expect(controls.setActivity.mock.lastCall?.[0]).toBe("failed");
});
