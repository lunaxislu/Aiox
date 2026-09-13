import type { Readable } from "node:stream";

import type { DeliveryOutcome, RuntimeActivity } from "@aiox/domain";

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
    readonly exited: Promise<ExecutionExit>;
    stop(): Promise<void>;
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
    setActivity(
        activity: RuntimeActivity,
        observation?: { event: string; reason?: string },
    ): void;
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
    observe(report: unknown): Promise<void>;
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
    start(launch: unknown, owner: ExecutionContext): Promise<ExecutionProcess>;
};
export type ExecutionContext = Pick<
    ExecutionOwner,
    "own" | "foreground" | "background" | "signal"
>;

export type VendorAdapter = {
    readonly id: string;
    createExecution(
        owner: Pick<ExecutionOwner, "own" | "signal">,
    ): Promise<VendorExecution>;
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
