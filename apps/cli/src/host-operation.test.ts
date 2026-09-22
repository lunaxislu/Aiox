import type { Operation } from "@aiox/protocol";
import { expect, test, vi, onTestFinished } from "vitest";

import { hostOperationResult, waitForHostOperation } from "./host-operation";

const initial: Operation = {
    id: "operation",
    requestId: "6a8ed620-0000-4000-8000-000000000001",
    kind: "host.run",
    hostId: "host",
    panelId: "panel",
    state: "running",
    targets: [],
    error: null,
    cleanupErrors: [],
    createdAt: 1,
    finishedAt: null,
};
const done: Operation = { ...initial, state: "succeeded", finishedAt: 2 };

test("CLI waits past running snapshot for the matching completed SSE operation", async (t) => {
    const encoder = new TextEncoder();
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    vi.stubGlobal(
        "fetch",
        vi.fn(
            async () =>
                new Response(
                    new ReadableStream({
                        start(c) {
                            stream = c;
                        },
                    }),
                ),
        ),
    );
    t.onTestFinished(() => {
        vi.unstubAllGlobals();
    });
    let completed = false;
    const waiting = waitForHostOperation("http://localhost", initial).then(
        (o) => {
            completed = true;
            return o;
        },
    );
    const snapshot = {
        hosts: [],
        networks: [],
        panels: [],
        terminals: [],
        agents: [],
        notifications: [],
        operations: [initial],
    };
    stream.enqueue(
        encoder.encode(
            `event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`,
        ),
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(completed).toBe(false);
    const frame = `event: state\ndata: ${JSON.stringify({ changes: [{ resource: "operation", action: "upsert", id: done.id, value: done }] })}\n\n`;
    stream.enqueue(encoder.encode(frame.slice(0, 20)));
    stream.enqueue(encoder.encode(frame.slice(20)));
    expect(await waiting).toEqual(done);
});

test("a completed admission response needs no subscription; failure is not CLI success", async () => {
    expect(await waitForHostOperation("unused", done)).toEqual(done);
    expect(hostOperationResult(done)).toContain("succeeded");
    expect(() =>
        hostOperationResult({
            ...done,
            state: "failed",
            error: {
                stage: "execution",
                code: "execution_failed",
                message: "vendor unavailable",
            },
        }),
    ).toThrow("vendor unavailable");
});

test.each(["fault", "disconnect"])(
    "CLI rejects SSE %s without issuing another command",
    async (mode) => {
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(
                        mode === "fault"
                            ? 'event: fault\ndata: {"code":"storage_error","message":"disk failure"}\n\n'
                            : "",
                    ),
            ),
        );
        onTestFinished(() => {
            vi.unstubAllGlobals();
        });
        await expect(
            waitForHostOperation("http://localhost", initial),
        ).rejects.toThrow(mode === "fault" ? "disk failure" : "disconnected");
        expect(fetch).toHaveBeenCalledTimes(1);
    },
);
