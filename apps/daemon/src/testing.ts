import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DeliveryOutcome, RuntimeStatus } from "@aiox/domain";
import { openDatabase } from "@aiox/persistence";

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
    } = {},
): Promise<DaemonHarness> {
    const home = await mkdtemp(join(tmpdir(), "aiox-daemon-"));
    const db = await openDatabase(join(home, ".aiox", "aiox.db"));
    const daemon = await startDaemon({
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
