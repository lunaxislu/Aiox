import { expect, test } from "vitest";

import { codexInput } from "./binding";

test.each([
    { name: "reviewer", role: "review", description: "Reviews changes" },
    { name: "runtime-id", role: null, description: null },
    { name: "AIOX", role: null, description: null },
    { name: "a<&>", role: null, description: null },
])(
    "wraps Codex input for display from $name and preserves metadata",
    (from) => {
        const input = codexInput({
            deliveryId: from.name === "AIOX" ? null : "internal-delivery-id",
            from,
            createdAt: 123,
            content: "Review <input> & &lt;\nnext line",
        });
        expect(input).toEqual({
            input: [],
            toolOutput: {
                namespace: "codex_tui",
                name: "send_message_to_thread",
                output:
                    "<codex_delegation>\n  <source_thread_id>" +
                    (from.name === "a<&>" ? "a&lt;&amp;&gt;" : from.name) +
                    "</source_thread_id>\n  <input>Review &lt;input&gt; &amp; &amp;lt;\nnext line</input>\n</codex_delegation>",
            },
            additionalContext: {
                aiox: {
                    kind: "untrusted",
                    value: JSON.stringify({ from, createdAt: 123 }),
                },
            },
        });
    },
);
