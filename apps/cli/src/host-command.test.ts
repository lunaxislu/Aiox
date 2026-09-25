import type { HostCommandResult } from "@aiox/protocol";
import { expect, test, vi } from "vitest";

import { hostCommandOutput, runHostCommand } from "./host-command";

const done: HostCommandResult = {
    requestId: "6a8ed620-0000-4000-8000-000000000001",
    command: "host.agent.start",
    hostId: "host",
    state: "succeeded",
    targets: [
        { agentKey: "a", terminalId: "t1", state: "ready", error: null },
        { agentKey: "b", terminalId: "t2", state: "unchanged", error: null },
    ],
    error: null,
    cleanupErrors: [],
};
const describe = (status: number, _body: unknown, text: string) =>
    `${status}: ${text}`;

test("CLI reads launch requests split across chunks, then waits for the final result", async (t) => {
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
                    { headers: { "content-type": "application/x-ndjson" } },
                ),
        ),
    );
    t.onTestFinished(() => {
        vi.unstubAllGlobals();
    });
    const launches: string[] = [];
    let completed = false;
    const waiting = runHostCommand(
        "http://localhost",
        "/api/hosts/agents/start",
        {},
        describe,
        (launch) => launches.push(`${launch.hostId}/${launch.agentKey}`),
    ).then((result) => {
        completed = true;
        return result;
    });
    const launch = `${JSON.stringify({ type: "launch", hostId: "host", agentKey: "a", terminalId: "t1", marker: "AIOX_CALLER_x_" })}\n`;
    stream.enqueue(encoder.encode(launch.slice(0, 20)));
    stream.enqueue(encoder.encode(launch.slice(20)));
    await vi.waitFor(() => expect(launches).toEqual(["host/a"]));
    expect(completed).toBe(false);
    stream.enqueue(
        encoder.encode(`${JSON.stringify({ type: "result", result: done })}\n`),
    );
    expect(await waiting).toEqual(done);
});

test("a rejected command and a connection lost before the result are errors, not success", async (t) => {
    t.onTestFinished(() => {
        vi.unstubAllGlobals();
    });
    vi.stubGlobal(
        "fetch",
        vi.fn(
            async () =>
                new Response('{"code":"host_busy","message":"busy"}', {
                    status: 409,
                }),
        ),
    );
    await expect(
        runHostCommand("http://localhost", "/p", {}, describe),
    ).rejects.toThrow('409: {"code":"host_busy","message":"busy"}');
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("")),
    );
    await expect(
        runHostCommand("http://localhost", "/p", {}, describe),
    ).rejects.toThrow("closed before the Host command finished");
});

test("per-target output: success lists every target, partial failure is not CLI success", () => {
    expect(hostCommandOutput(done)).toBe(
        [
            "Host agent start succeeded (requestId=6a8ed620-0000-4000-8000-000000000001)",
            "a: ready",
            "b: unchanged (already running)",
        ].join("\n"),
    );
    const error = {
        stage: "execution" as const,
        code: "execution_failed",
        message: "vendor unavailable",
        agentKey: "b",
    };
    expect(() =>
        hostCommandOutput({
            ...done,
            state: "failed",
            targets: [
                done.targets[0]!,
                { agentKey: "b", terminalId: null, state: "failed", error },
            ],
            error,
            cleanupErrors: [
                {
                    stage: "cleanup",
                    code: "cleanup_failed",
                    message: "rm failed",
                },
            ],
        }),
    ).toThrow(
        [
            "Host agent start failed (requestId=6a8ed620-0000-4000-8000-000000000001)",
            "a: ready",
            "b: failed — vendor unavailable [execution/execution_failed]",
            "vendor unavailable",
            "Cleanup: rm failed",
        ].join("\n"),
    );
});
