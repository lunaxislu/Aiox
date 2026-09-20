import { once } from "node:events";

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

test.each([false, true])(
    "retains a busy turn result until all in-flight input acceptances acquire it (pending ack: %s)",
    async (pendingAck) => {
        const { WebSocketServer } = await import("ws");
        const { vi } = await import("vitest");
        const { CodexBinding } = await import("./binding");
        const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
        await once(server, "listening");
        const address = server.address();
        if (typeof address === "string" || !address) throw new Error("port");
        const settle = vi.fn().mockResolvedValue(undefined);
        let acknowledge!: () => void;
        const ack = new Promise<void>((resolve) => {
            acknowledge = resolve;
        });
        if (pendingAck) settle.mockImplementationOnce(() => ack);
        const status = vi.fn();
        const binding = new CodexBinding(
            {
                runtimeId: "r",
                setStatus: status,
                setObservationError: vi.fn(),
                settle,
            },
            { url: `ws://127.0.0.1:${address.port}`, token: "x".repeat(43) },
        );
        try {
            const connected = once(server, "connection");
            await binding.prepare({
                executionOwnership: "external",
                args: [],
                cwd: process.cwd(),
                env: {},
                mcpUrl: null,
                mcpToken: "",
                reportUrl: "",
                reportToken: "",
                instruction: "",
            });
            const [peer] = await connected;
            binding.executionStarted();
            peer.send(
                JSON.stringify({
                    type: "state",
                    threadId: "thread",
                    error: null,
                }),
            );
            await expect.poll(() => binding.wasReady).toBe(true);
            const begin = async (id: string) => {
                const received = once(peer, "message");
                const accepted = binding.deliver({
                    deliveryId: id,
                    from: { name: "sender", role: null, description: null },
                    createdAt: 1,
                    content: "work",
                });
                // Cleanup rejects any acceptance still pending after an assertion fails.
                void accepted.catch(() => {});
                const [raw] = await received;
                const frame = JSON.parse(raw.toString());
                return {
                    accepted,
                    respond: () =>
                        peer.send(
                            JSON.stringify({
                                type: "response",
                                id: frame.id,
                                result: {
                                    threadId: "thread",
                                    turn: { id: "turn" },
                                },
                            }),
                        ),
                };
            };
            const first = await begin("first");
            first.respond();
            await first.accepted;
            const second = await begin("busy");
            const third = await begin("busy-next");
            peer.send(
                JSON.stringify({
                    type: "event",
                    method: "turn/completed",
                    params: {
                        threadId: "thread",
                        turn: { id: "turn", status: "completed" },
                    },
                }),
            );
            second.respond();
            await second.accepted;
            if (!pendingAck)
                await expect
                    .poll(() => settle.mock.calls)
                    .toEqual([
                        ["first", "completed", undefined],
                        ["busy", "completed", undefined],
                    ]);
            third.respond();
            await third.accepted;
            if (pendingAck)
                expect(settle.mock.calls).toEqual([
                    ["first", "completed", undefined],
                ]);
            acknowledge();
            await expect
                .poll(() => settle.mock.calls)
                .toEqual([
                    ["first", "completed", undefined],
                    ["busy", "completed", undefined],
                    ["busy-next", "completed", undefined],
                ]);
            peer.send(
                JSON.stringify({
                    type: "event",
                    method: "turn/completed",
                    params: {
                        threadId: "thread",
                        turn: {
                            id: "turn",
                            status: "failed",
                            error: { message: "late duplicate" },
                        },
                    },
                }),
            );
            // A following state frame is an ordered barrier for the preceding event.
            peer.send(
                JSON.stringify({
                    type: "state",
                    threadId: "thread",
                    error: null,
                }),
            );
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(status.mock.lastCall).toEqual(["idle", undefined]);
        } finally {
            acknowledge();
            await binding.cleanup();
            for (const client of server.clients) client.terminate();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    },
);
