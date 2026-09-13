import { InvalidVendorReport } from "@aiox/vendor";
import type {
    InboundMessage,
    RuntimeControls,
    VendorBinding,
    VendorLaunchInput,
} from "@aiox/vendor";
import { z } from "zod";

import { writeClaudeInbox } from "@/claude-inbox";
import { prepareClaudeLaunch } from "@/claude-launch";
import { ClaudeObservations } from "@/claude-observations";
import { launchHooks } from "@/launch-hooks";

const reportSchema = z.strictObject({
    event: z.looseObject({
        hook_event_name: z.string().min(1),
        session_id: z.string().min(1),
    }),
    inboxPath: z.string().optional(),
    inboxToken: z.string().optional(),
});

/** The registered handle exists before any asynchronous preparation or spawn. */
export class ClaudeBinding implements VendorBinding {
    #stopped = false;
    #ready = false;
    #wasReady = false;
    #inboxReady = false;
    #mcpReady = false;
    requireMcp = false;
    #inboxToken: string | undefined;
    readonly observationOptions = { hasBlockingStopHooks: false };
    readonly observations: ClaudeObservations;
    #activity: Parameters<RuntimeControls["setActivity"]> | undefined;

    #started = false;
    onReady: (() => void) | undefined;
    onReleased: (() => void) | undefined;

    constructor(
        readonly controls: RuntimeControls,
        readonly inboxPath: string,
    ) {
        this.observations = new ClaudeObservations(
            {
                ...controls,
                setActivity: (...args) => {
                    this.#activity = args;
                    if (this.#ready) controls.setActivity(...args);
                },
            },
            this.observationOptions,
        );
    }

    get alive(): boolean {
        return this.#started;
    }
    executionStarted(): void {
        if (this.#stopped) throw new Error("Claude runtime was stopped.");
        this.#started = true;
        this.#updateReady();
    }

    async prepare(input: VendorLaunchInput): Promise<unknown> {
        if (this.#stopped) throw new Error("Claude runtime was stopped.");
        this.requireMcp = input.mcpUrl !== null;
        const launch = await prepareClaudeLaunch({
            ...input,
            inboxPath: this.inboxPath,
            hooks: launchHooks(),
        });
        if (this.#stopped) throw new Error("Claude runtime was stopped.");
        this.observationOptions.hasBlockingStopHooks =
            launch.hasBlockingStopHooks;
        return {
            file: "claude",
            args: launch.args,
            cwd: input.cwd,
            env: {
                ...Object.fromEntries(
                    Object.entries(launch.env).filter(
                        ([key]) => !key.toUpperCase().startsWith("AIOX_"),
                    ),
                ),
                AIOX_EXECUTION_OWNERSHIP: input.executionOwnership,
                AIOX_MCP_TOKEN: input.mcpToken,
                AIOX_HOOK_TOKEN: input.reportToken,
                AIOX_HOOK_URL: input.reportUrl,
            },
        };
    }

    async observe(value: unknown): Promise<void> {
        if (this.#stopped) throw new Error("Claude runtime was stopped.");
        const parsed = reportSchema.safeParse(value);
        if (!parsed.success)
            throw new InvalidVendorReport("Invalid Claude hook report.");
        const report = parsed.data;
        if (
            !this.inboxPath ||
            report.inboxPath !== this.inboxPath ||
            !report.inboxToken
        )
            throw new Error(
                "Claude hook did not report the assigned inbox and its credential.",
            );
        if (this.#inboxToken && this.#inboxToken !== report.inboxToken)
            throw new Error(
                "Claude inbox credential changed within one runtime.",
            );
        this.#inboxToken = report.inboxToken;
        if (!this.#inboxReady) {
            await writeClaudeInbox(this.inboxPath, this.#inboxToken);
            if (this.#stopped)
                throw new Error("Claude exited before inbox readiness.");
            this.#inboxReady = true;
            this.#updateReady();
        }
        await this.observations.observe(report.event);
    }

    get wasReady(): boolean {
        return this.#wasReady;
    }
    mcpConnected(): void {
        this.#mcpReady = true;
        this.#updateReady();
    }
    #updateReady(): void {
        if (
            !this.#ready &&
            !this.#stopped &&
            this.alive &&
            this.#inboxReady &&
            (!this.requireMcp || this.#mcpReady)
        ) {
            this.#ready = true;
            this.#wasReady = true;
            if (this.#activity) this.controls.setActivity(...this.#activity);
            else this.controls.setActivity("idle");
            this.onReady?.();
        }
    }

    async deliver(message: InboundMessage): Promise<void> {
        if (!this.#ready || this.#stopped || !this.#inboxToken || !this.alive)
            throw new Error("Claude inbox is not ready.");
        const frame = this.observations.track(message);
        try {
            await writeClaudeInbox(this.inboxPath, this.#inboxToken, frame);
        } catch (error) {
            this.observations.forget(frame);
            this.#ready = false;
            this.#inboxReady = false;
            this.controls.setActivity("failed", {
                event: "inbox",
                reason: "connection_failed",
            });
            throw error;
        }
    }

    async connectionLost(): Promise<void> {
        await this.observations.failPending("foreground_connection_lost");
    }

    async processExited(
        exitCode: number,
        signal: number | null,
    ): Promise<void> {
        this.#started = false;
        if (!this.#stopped && signal === null && exitCode !== 0)
            await this.observations.failPending("vendor_process_failed");
        else await this.observations.interruptPending();
    }

    async cleanup(
        reason:
            | "external_connection_lost"
            | "collaboration_lost"
            | "execution_stopped",
    ): Promise<void> {
        this.onReleased?.();
        this.#stopped = true;
        this.#ready = false;
        this.#started = false;
        if (reason !== "execution_stopped")
            await this.observations.failPending(reason);
        else await this.observations.interruptPending();
        this.#inboxToken = undefined;
    }
}
