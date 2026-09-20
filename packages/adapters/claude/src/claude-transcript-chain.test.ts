import { expect, it } from "vitest";

import { ClaudeTranscriptChain } from "@/claude-transcript-chain";

const common = { sessionId: "s", isSidechain: false };
const user = {
    ...common,
    type: "user",
    promptId: "p",
    uuid: "u",
    parentUuid: null,
    origin: { kind: "human" },
    promptSource: "typed",
    message: { role: "user", content: "hello" },
};
const assistant = (uuid: string, parentUuid: string, extra = {}) => ({
    ...common,
    type: "assistant",
    uuid,
    parentUuid,
    message: {
        role: "assistant",
        id: `msg-${uuid}`,
        stop_reason: "end_turn",
        content: [],
    },
    ...extra,
});
const summary = (uuid: string, parentUuid: string, extra = {}) => ({
    ...common,
    type: "system",
    subtype: "stop_hook_summary",
    uuid,
    parentUuid,
    hookErrors: [],
    hookAdditionalContext: [],
    hasOutput: true,
    ...extra,
});
const duration = (parentUuid: string) => ({
    ...common,
    type: "system",
    subtype: "turn_duration",
    uuid: `duration-${parentUuid}`,
    parentUuid,
    durationMs: 1,
});

it("requires a connected end_turn and final duration, including Stop continuation", () => {
    const chain = new ClaudeTranscriptChain();
    expect(chain.observe(duration("missing"))).toBeUndefined();
    expect(chain.observe(user)).toBeUndefined();
    expect(chain.observe(assistant("a", "u"))).toBeUndefined();
    expect(
        chain.observe(
            summary("intermediate", "a", {
                hookAdditionalContext: ["continue"],
            }),
        ),
    ).toBeUndefined();
    expect(chain.observe(assistant("b", "intermediate"))).toBeUndefined();
    expect(chain.observe(summary("final", "b"))).toBeUndefined();
    expect(chain.observe(duration("final"))).toEqual({
        key: '["s","p"]',
        outcome: "completed",
    });
});

it("does not finish an old branch after a newer assistant, or infer completion from a duration alone", () => {
    const chain = new ClaudeTranscriptChain();
    chain.observe(user);
    expect(chain.observe(duration("u"))).toBeUndefined();
    chain.observe(assistant("a", "u"));
    chain.observe(assistant("b", "a"));
    expect(chain.observe(duration("a"))).toBeUndefined();
    expect(chain.observe(duration("b"))).toMatchObject({
        outcome: "completed",
    });
});

it.each([false, true])(
    "keeps the newer response selected after late ancestor metadata (API error: %s)",
    (error) => {
        const chain = new ClaudeTranscriptChain();
        chain.observe(user);
        chain.observe(assistant("a", "u"));
        chain.observe(assistant("b", "a", { isApiErrorMessage: error }));
        expect(chain.observe(summary("old-summary", "a"))).toBeUndefined();
        expect(chain.observe(duration("old-summary"))).toBeUndefined();
        expect(
            chain.observe({
                ...common,
                type: "attachment",
                uuid: "old-attachment",
                parentUuid: "old-summary",
            }),
        ).toBeUndefined();
        expect(chain.observe(duration("old-attachment"))).toBeUndefined();
        expect(chain.observe(summary("current", "b"))).toBeUndefined();
        expect(chain.observe(duration("current"))).toEqual(
            error ? undefined : { key: '["s","p"]', outcome: "completed" },
        );
    },
);

it("retains late metadata as the parent of an already observed continuation", () => {
    const chain = new ClaudeTranscriptChain();
    chain.observe(user);
    chain.observe(assistant("a", "u"));
    chain.observe(summary("other", "a"));
    expect(chain.observe(assistant("b", "late"))).toBeUndefined();
    expect(chain.observe(duration("b"))).toBeUndefined();
    expect(chain.observe(summary("late", "a"))).toEqual({
        key: '["s","p"]',
        outcome: "completed",
    });
    expect(chain.observe(summary("other-late", "a"))).toBeUndefined();
    expect(chain.observe(duration("other-late"))).toBeUndefined();
    expect(chain.observe(duration("b"))).toBeUndefined();
});

it.each([false, true])(
    "allows no-hook and stdout-only final chains (hooks=%s)",
    (hooks) => {
        const chain = new ClaudeTranscriptChain();
        chain.observe(user);
        chain.observe(assistant("a", "u"));
        if (hooks) chain.observe(summary("s", "a", { hasOutput: true }));
        expect(chain.observe(duration(hooks ? "s" : "a"))).toMatchObject({
            outcome: "completed",
        });
    },
);

it("blocks API error completion and requires the same session and prompt chain", () => {
    const chain = new ClaudeTranscriptChain();
    chain.observe(user);
    chain.observe(assistant("a", "u", { isApiErrorMessage: true }));
    expect(chain.observe(duration("a"))).toBeUndefined();
    expect(
        chain.observe({ ...assistant("foreign", "u"), sessionId: "other" }),
    ).toBeUndefined();
    expect(
        chain.observe({ ...duration("foreign"), sessionId: "other" }),
    ).toBeUndefined();
    expect(
        chain.observe({ ...duration("a"), promptId: "other" }),
    ).toBeUndefined();
});

it.each([true, false])(
    "ends continue:false at duration without classifying it as interruption (summary: %s)",
    (withSummary) => {
        const chain = new ClaudeTranscriptChain();
        chain.observe(user);
        chain.observe(assistant("a", "u"));
        expect(
            chain.observe({
                ...common,
                type: "attachment",
                uuid: "prevented",
                parentUuid: "a",
                attachment: {
                    type: "hook_stopped_continuation",
                    hookEvent: "Stop",
                    message: "Stopped by hook",
                },
            }),
        ).toBeUndefined();
        if (withSummary)
            expect(
                chain.observe(
                    summary("s", "prevented", {
                        preventedContinuation: true,
                        stopReason: "Stopped by hook",
                        hasOutput: true,
                    }),
                ),
            ).toBeUndefined();
        expect(
            chain.observe(duration(withSummary ? "s" : "prevented")),
        ).toEqual({ key: '["s","p"]', outcome: "completed" });
    },
);

it("waits for a delayed summary parent and ignores duplicate final records", () => {
    const chain = new ClaudeTranscriptChain();
    chain.observe(user);
    chain.observe(assistant("a", "u"));
    expect(chain.observe(duration("s"))).toBeUndefined();
    expect(chain.observe(duration("s"))).toBeUndefined();
    expect(chain.observe(summary("s", "a"))).toMatchObject({
        outcome: "completed",
    });
    expect(chain.observe(summary("s", "a"))).toBeUndefined();
    expect(chain.observe(duration("s"))).toBeUndefined();
});

it("follows attachments from a rejected tool to the vendor marker without confusing typed text", () => {
    const chain = new ClaudeTranscriptChain();
    chain.observe(user);
    chain.observe(
        assistant("tool", "u", {
            message: {
                role: "assistant",
                stop_reason: "tool_use",
                content: [{ type: "tool_use", id: "bash" }],
            },
        }),
    );
    expect(
        chain.observe({
            ...common,
            type: "user",
            uuid: "denial",
            parentUuid: "tool",
            promptId: "p",
            toolDenialKind: "user-rejected",
            message: {
                role: "user",
                content: [
                    {
                        type: "tool_result",
                        tool_use_id: "bash",
                        is_error: true,
                    },
                ],
            },
        }),
    ).toBeUndefined();
    chain.observe({
        ...common,
        type: "attachment",
        uuid: "snapshot",
        parentUuid: "denial",
        attachment: { type: "prompt_snapshot" },
    });
    const marker = {
        ...common,
        type: "user",
        uuid: "marker",
        parentUuid: "snapshot",
        promptId: "p",
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
    expect(
        chain.observe({
            ...marker,
            uuid: "typed",
            origin: { kind: "human" },
            promptSource: "typed",
            promptId: "new",
        }),
    ).toBeUndefined();
    expect(chain.observe(marker)).toMatchObject({
        key: '["s","p"]',
        outcome: "interrupted",
    });
});

it("checks a supplied interruption message ID without requiring one", () => {
    const chain = new ClaudeTranscriptChain();
    chain.observe(user);
    chain.observe(assistant("a", "u", { isAbortedMidStream: true }));
    const marker = {
        ...common,
        type: "user",
        uuid: "marker",
        parentUuid: "a",
        promptId: "p",
        interruptedMessageId: "msg-a",
        message: {
            role: "user",
            content: [{ type: "text", text: "[Request interrupted by user]" }],
        },
    };
    expect(
        chain.observe({
            ...marker,
            uuid: "wrong",
            interruptedMessageId: "other",
        }),
    ).toBeUndefined();
    expect(chain.observe(marker)).toMatchObject({ outcome: "interrupted" });
    chain.forget('["s","p"]');
    expect(chain.observe(duration("marker"))).toBeUndefined();
});

it.each([
    "[Request interrupted by user]",
    "[Request interrupted by user for tool use]",
])(
    "uses the explicit vendor declaration without requiring prior activity: %s",
    (text) => {
        const chain = new ClaudeTranscriptChain();
        chain.observe(user);
        const marker = {
            ...common,
            type: "user",
            uuid: "marker",
            parentUuid: "u",
            promptId: "p",
            message: { role: "user", content: [{ type: "text", text }] },
        };
        expect(
            chain.observe({
                ...marker,
                uuid: "typed",
                promptId: "typed",
                origin: { kind: "human" },
            }),
        ).toBeUndefined();
        expect(
            chain.observe({ ...marker, sessionId: "other" }),
        ).toBeUndefined();
        expect(chain.observe({ ...marker, promptId: "other" })).toBeUndefined();
        expect(chain.observe({ ...marker, isSidechain: true })).toBeUndefined();
        expect(
            chain.observe({ ...marker, uuid: "orphan", parentUuid: "missing" }),
        ).toBeUndefined();
        expect(chain.observe(marker)).toEqual({
            key: '["s","p"]',
            outcome: "interrupted",
        });
        expect(chain.observe(marker)).toBeUndefined();
        expect(chain.observe(duration("marker"))).toBeUndefined();
    },
);

it("does not let an old interruption branch end the current response", () => {
    const chain = new ClaudeTranscriptChain();
    chain.observe(user);
    chain.observe(assistant("a", "u"));
    chain.observe(assistant("b", "a"));
    expect(
        chain.observe({
            ...common,
            type: "user",
            uuid: "old-marker",
            parentUuid: "a",
            message: {
                role: "user",
                content: [
                    { type: "text", text: "[Request interrupted by user]" },
                ],
            },
        }),
    ).toBeUndefined();
    expect(chain.observe(duration("b"))).toMatchObject({
        outcome: "completed",
    });
});

it("does not infer completion from an aborted assistant without a message ID", () => {
    const chain = new ClaudeTranscriptChain();
    chain.observe(user);
    chain.observe(
        assistant("a", "u", {
            isAbortedMidStream: true,
            message: {
                role: "assistant",
                stop_reason: "end_turn",
                content: [],
            },
        }),
    );
    expect(chain.observe(duration("a"))).toBeUndefined();
});

it("does not attribute an explicit shutdown interruption to the user", () => {
    const chain = new ClaudeTranscriptChain();
    chain.observe(user);
    expect(
        chain.observe({
            ...common,
            type: "user",
            uuid: "shutdown",
            parentUuid: "u",
            interruptedByShutdown: true,
            message: {
                role: "user",
                content: [
                    { type: "text", text: "[Request interrupted by user]" },
                ],
            },
        }),
    ).toEqual({
        key: '["s","p"]',
        outcome: "interrupted",
        reason: "Interrupted",
    });
});

it("replays sanitized actual vendor records without treating intermediate replies as completion", async () => {
    const { readFile } = await import("node:fs/promises");
    const fixtures = JSON.parse(
        await readFile(
            new URL("./claude-transcript-chain.fixtures.json", import.meta.url),
            "utf8",
        ),
    ) as {
        name: string;
        expectedIndex: number;
        expected: string | null;
        expectedIndices?: number[];
        rows: unknown[];
    }[];
    for (const fixture of fixtures) {
        const chain = new ClaudeTranscriptChain();
        const observed = fixture.rows.flatMap((row, index) => {
            const result = chain.observe(row);
            return result ? [{ outcome: result.outcome, index }] : [];
        });
        expect(observed, fixture.name).toEqual(
            fixture.expected
                ? (fixture.expectedIndices ?? [fixture.expectedIndex]).map(
                      (index) => ({ outcome: fixture.expected, index }),
                  )
                : [],
        );
    }
});

it("connects records whose parent is written later, as in the actual streaming retry transcript", () => {
    const chain = new ClaudeTranscriptChain();
    expect(
        chain.observe({
            ...common,
            type: "system",
            subtype: "informational",
            uuid: "retry",
            parentUuid: "snapshot",
        }),
    ).toBeUndefined();
    chain.observe(user);
    chain.observe({
        ...common,
        type: "attachment",
        uuid: "snapshot",
        parentUuid: "u",
    });
    chain.observe(assistant("a", "retry"));
    expect(chain.observe(duration("a"))).toMatchObject({
        outcome: "completed",
    });
});

it("keeps delayed ancestry beyond 4096 records without wedging or dropping the oldest evidence", () => {
    const chain = new ClaudeTranscriptChain();
    for (let i = 0; i < 4097; i++)
        chain.observe(summary(`orphan-${i}`, `parent-${i}`));
    chain.observe(user);
    chain.observe(assistant("parent-0", "u"));
    expect(chain.observe(duration("orphan-0"))).toEqual({
        key: '["s","p"]',
        outcome: "completed",
    });
});

it("propagates ignored ancestry through unowned roots and already queued children", () => {
    const chain = new ClaudeTranscriptChain();
    chain.observe(summary("child", "root"));
    chain.observe({
        ...common,
        type: "attachment",
        uuid: "root",
        parentUuid: null,
    });
    expect(
        chain.observe(
            summary("grandchild", "child", { promptId: "unexpected" }),
        ),
    ).toBeUndefined();
    // An actual input starts its own lifecycle even below an ignored ancestor.
    chain.observe({ ...user, parentUuid: "root" });
    chain.observe(assistant("a", "u"));
    expect(chain.observe(duration("a"))).toMatchObject({
        outcome: "completed",
    });
});
