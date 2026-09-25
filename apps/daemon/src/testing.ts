import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DeliveryOutcome, RuntimeStatus } from "@aiox/domain";
import { openDatabase } from "@aiox/persistence";
import { ApplicationRpc, type ApplicationEvent } from "@aiox/protocol";
import { hostCommandEventSchema, type HostCommandResult } from "@aiox/protocol";
import { NodeSocket } from "@effect/platform-node";
import {
    Effect,
    Exit,
    Fiber,
    Layer,
    ManagedRuntime,
    Queue,
    Scope,
    Stream,
} from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";

import type { Daemon, DaemonOptions } from "@/daemon";
import { startDaemon } from "@/daemon";
import type { AgentBinding, InboundMessage, RuntimeControls } from "@/runtimes";

/**
 * A vendor stand-in for Stage 2. It exercises the same binding seam Claude and
 * Codex will use, so the daemon under test is the real one and only the vendor
 * is simulated. A test-double round trip is never evidence of vendor integration.
 */
export type FakeVendor = {
    readonly received: InboundMessage[];
    /** Deliveries that carried a correlation handle, oldest first. */
    readonly deliveryIds: string[];
    createBinding(controls: RuntimeControls): AgentBinding;
    /** Report the outcome of one AIOX input, the way a real binding would. */
    settle(
        deliveryId: string,
        outcome: DeliveryOutcome,
        error?: string,
    ): Promise<void>;
    /** Simulate work that is not connected to any AIOX input. */
    status(next: RuntimeStatus): void;
    /** Make the next delivery attempt fail at injection time. */
    refuse(reason: string | undefined): void;
    readonly stopped: string[];
};

export function fakeVendor(): FakeVendor {
    const received: InboundMessage[] = [];
    const deliveryIds: string[] = [];
    const stopped: string[] = [];
    let controls: RuntimeControls | undefined;
    let refusal: string | undefined;

    return {
        received,
        deliveryIds,
        stopped,
        createBinding(next) {
            controls = next;
            next.setStatus("idle");
            return {
                deliver: (message) => {
                    if (refusal !== undefined)
                        return Promise.reject(new Error(refusal));
                    received.push(message);
                    if (message.deliveryId !== null) {
                        deliveryIds.push(message.deliveryId);
                        next.setStatus("working");
                    }
                    return Promise.resolve();
                },
                stop: () => {
                    stopped.push("stopped");
                    return Promise.resolve();
                },
            };
        },
        settle: (deliveryId, outcome, error) =>
            controls!.settle(deliveryId, outcome, error),
        status: (next) => controls!.setStatus(next),
        refuse: (reason) => {
            refusal = reason;
        },
    };
}

export type DaemonHarness = {
    daemon: Daemon;
    home: string;
    mcpUrl(networkId: string): string;
    apiUrl(path: string): string;
    webUrl(path: string): string;
    close(): Promise<void>;
};

/** A real daemon on ephemeral ports with its own temporary home and database. */
export async function startTestDaemon(
    options: {
        retentionDays?: number;
        now?: () => number;
        adapters?: DaemonOptions["adapters"];
        terminal?: DaemonOptions["terminal"];
        sequenceGapTimeout?: number;
    } = {},
): Promise<DaemonHarness> {
    const home = await mkdtemp(join(tmpdir(), "aiox-daemon-"));
    const db = await openDatabase(join(home, ".aiox", "aiox.db"));
    const daemon = await startDaemon({
        home,
        ports: { daemon: 0, web: 0 },
        db,
        retentionDays: () => options.retentionDays ?? 30,
        webRoot: undefined,
        ...(options.terminal === undefined
            ? {}
            : { terminal: options.terminal }),
        ...(options.adapters === undefined
            ? {}
            : { adapters: options.adapters }),
        ...(options.now === undefined ? {} : { now: options.now }),
        ...(options.sequenceGapTimeout === undefined
            ? {}
            : { sequenceGapTimeout: options.sequenceGapTimeout }),
    });
    return {
        daemon,
        home,
        mcpUrl: (networkId) =>
            `http://127.0.0.1:${daemon.ports.daemon}/mcp/${encodeURIComponent(networkId)}`,
        apiUrl: (path) => `http://127.0.0.1:${daemon.ports.daemon}${path}`,
        webUrl: (path) => `http://127.0.0.1:${daemon.ports.web}${path}`,
        close: async () => {
            await daemon.stop(true);
            await rm(home, { recursive: true, force: true });
        },
    };
}

/** Reads a Host command's NDJSON answer to its final per-target result. */
export async function hostResult(
    response: Response,
): Promise<HostCommandResult> {
    if (!response.ok)
        throw new Error(`${response.status} ${await response.text()}`);
    const events = (await response.text())
        .trim()
        .split("\n")
        .map((line) => hostCommandEventSchema.parse(JSON.parse(line)));
    const last = events.at(-1);
    if (last?.type !== "result") throw new Error("No Host command result.");
    return last.result;
}

/** Real application RPC client for transport regressions; each call opens a fresh socket scope. */
export async function openTestApplication(harness: DaemonHarness) {
    const protocol = RpcClient.layerProtocolSocket({
        retryTransientErrors: false,
    }).pipe(
        Layer.provide(
            NodeSocket.layerWebSocket(
                harness.webUrl("/api/rpc").replace("http:", "ws:"),
            ),
        ),
        Layer.provide(RpcSerialization.layerJson),
    );
    const runtime = ManagedRuntime.make(protocol);
    const scope = Effect.runSync(Scope.make());
    try {
        const client = await runtime.runPromise(
            RpcClient.make(ApplicationRpc).pipe(
                Effect.provideService(Scope.Scope, scope),
            ),
        );
        const session = await runtime.runPromise(client["session.open"]());
        const events = Effect.runSync(Queue.make<ApplicationEvent, unknown>());
        const observed: ApplicationEvent[] = [];
        let closed = false;
        const subscription = runtime.runFork(
            Stream.runForEach(
                client["state.subscribe"]({
                    clientSessionId: session.clientSessionId,
                }),
                (event) => {
                    observed.push(event);
                    return Queue.offer(events, event);
                },
            ).pipe(
                Effect.catchCause((cause) => Queue.failCause(events, cause)),
            ),
        );
        return {
            client,
            session,
            observed,
            run: <A, E>(work: Effect.Effect<A, E>) => runtime.runPromise(work),
            next: () => runtime.runPromise(Queue.take(events)),
            async close() {
                if (closed) return;
                closed = true;
                await runtime.runPromise(Fiber.interrupt(subscription));
                await Effect.runPromise(Scope.close(scope, Exit.void));
                await runtime.dispose();
            },
        };
    } catch (error) {
        await Effect.runPromise(Scope.close(scope, Exit.void));
        await runtime.dispose();
        throw error;
    }
}
