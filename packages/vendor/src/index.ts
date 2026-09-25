import type { Readable } from "node:stream";

import type { DeliveryOutcome, RuntimeStatus } from "@aiox/domain";
import type { Effect } from "effect";

import type { ExecutionOwner } from "@/execution";

export { ExecutionOwner, spawnNative } from "@/execution";

/** Invalid vendor report shape, distinct from a report that cannot be applied. */
export class InvalidVendorReport extends Error {}

export type ExecutionExit = { exitCode: number; signal: number | null };
export type Command = {
    file: string;
    args: string[];
    cwd: string;
    env: Record<string, string>;
};
export type ExecutionProcess = {
    readonly exited: Effect.Effect<ExecutionExit>;
    stop(): Effect.Effect<void, unknown>;
    write(data: Uint8Array | string): void;
    resize(cols: number, rows: number): void;
    readonly stdout?: Readable;
    readonly stderr?: Readable;
};
export type InboundMessage = {
    readonly deliveryId: string | null;
    readonly from: {
        readonly name: string;
        readonly role: string | null;
        readonly description: string | null;
    };
    readonly createdAt: number;
    readonly content: string;
};
export type RuntimeControls = {
    readonly runtimeId: string;
    setStatus(status: RuntimeStatus, statusReason?: string): void;
    /** Observation health is separate from the selected session status. */
    setObservationError(error: string | null): void;
    /** Resolves when the daemon owns the first outcome and any storage retries. */
    settle(
        deliveryId: string,
        outcome: DeliveryOutcome,
        error?: string,
    ): Promise<void>;
};
export type VendorLaunchInput = {
    executionOwnership: "daemon" | "external";
    args: string[];
    cwd: string;
    env: Record<string, string>;
    mcpUrl: string | null;
    mcpToken: string;
    reportUrl: string;
    reportToken: string;
    instruction: string;
};
export type VendorBinding = {
    /** Validate vendor-specific connection and launch data at the adapter boundary. */
    prepare(input: VendorLaunchInput): Promise<unknown>;
    readonly wasReady: boolean;
    onReady: (() => void) | undefined;
    onReleased: (() => void) | undefined;
    executionStarted(): void;
    processExited(exitCode: number, signal: number | null): Promise<void>;
    mcpConnected(): void;
    /** Optional vendor response is transported as JSON to its authenticated reporter. */
    observe(report: unknown): Promise<unknown>;
    deliver(message: InboundMessage): Promise<void>;
    connectionLost(): Promise<void>;
    cleanup(
        reason:
            | "external_connection_lost"
            | "collaboration_lost"
            | "execution_stopped",
    ): Promise<void>;
};
export type VendorExecution = {
    /** JSON metadata; no vendor field is required by the common transport. */
    readonly connection: unknown;
    /** May await helpers before foreground; asynchronous startup must honor owner.signal. */
    start(
        launch: unknown,
        owner: ExecutionContext,
    ): Effect.Effect<ExecutionProcess, unknown>;
};
export type ExecutionContext = Pick<
    ExecutionOwner,
    "own" | "foreground" | "background" | "signal"
>;

export type VendorAdapter = {
    readonly id: string;
    createExecution(
        owner: Pick<ExecutionOwner, "own" | "signal">,
    ): Effect.Effect<VendorExecution, unknown>;
    createBinding(
        controls: RuntimeControls,
        connection: unknown,
    ): VendorBinding;
};

export function selectVendor(
    adapters: readonly VendorAdapter[],
    id: string,
): VendorAdapter {
    const matches = adapters.filter((adapter) => adapter.id === id);
    if (matches.length !== 1)
        throw new Error(
            matches.length
                ? `Duplicate vendor adapter: ${id}`
                : `Unsupported vendor: ${id}`,
        );
    return matches[0]!;
}
