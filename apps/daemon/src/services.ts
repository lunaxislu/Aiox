import type {
    ConfigLocation,
    createConfigDocument,
    TerminalLaunch,
} from "@aiox/config";
import type { AioxDatabase } from "@aiox/persistence";
import type {
    DaemonStatus,
    CreateShell,
    TerminalView,
    WebCommandCommit,
} from "@aiox/protocol";

import type { AppState } from "@/app-state";
import type { CleanupRegistry } from "@/cleanups";
import type { HostCommands } from "@/host-command";
import type { MessageService } from "@/messaging";
import type { NetworkService } from "@/networks";
import type { RuntimeRegistry } from "@/runtimes";
import type { Sequencer } from "@/sequencer";
import type { DaemonTasks } from "@/tasks";
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
    acceptingInput(): boolean;
    status(): Promise<DaemonStatus>;
    requestStop(force: boolean): Promise<StopOutcome>;
    createShell(
        options: CreateShell,
        prepared?: TerminalLaunch,
    ): Promise<TerminalView>;
    stopTerminal(id: string): Promise<boolean>;
    stopRuntime(id: string): Promise<void>;
};

export type DaemonServices = {
    /** Daemon-owned preparation work; teardown waits for it. */
    readonly tasks: DaemonTasks;
    readonly cleanups: CleanupRegistry;
    readonly appState: AppState;
    readonly sequencer: Sequencer<WebCommandCommit>;
    readonly hostCommands: HostCommands;
    readonly configLocation: ConfigLocation;
    readonly configDocument: ReturnType<typeof createConfigDocument>;
    readonly db: AioxDatabase;
    readonly runtimes: RuntimeRegistry;
    readonly networks: NetworkService;
    readonly messages: MessageService;
    readonly terminals: TerminalService;
    readonly lifecycle: Lifecycle;
};
