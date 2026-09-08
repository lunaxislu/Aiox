import type { AioxDatabase } from "@aiox/persistence";
import type { DaemonStatus } from "@aiox/protocol";

import type { MessageService } from "@/messaging";
import type { NetworkService } from "@/networks";
import type { RuntimeRegistry } from "@/runtimes";
import type { TerminalService } from "@/terminals";

export type StopOutcome = {
    /** false when a stop was refused or managed cleanup remains unconfirmed. */
    stopped: boolean;
    /** Names of the executions that still require cleanup. */
    blocking: string[];
    /** Resources whose shutdown could not be confirmed. */
    warnings: string[];
};

export type Lifecycle = {
    status(): Promise<DaemonStatus>;
    requestStop(force: boolean): Promise<StopOutcome>;
};

export type DaemonServices = {
    readonly db: AioxDatabase;
    readonly runtimes: RuntimeRegistry;
    readonly networks: NetworkService;
    readonly messages: MessageService;
    readonly terminals: TerminalService;
    readonly lifecycle: Lifecycle;
};
