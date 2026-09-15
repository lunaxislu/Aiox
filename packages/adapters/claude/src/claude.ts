import { isAbsolute } from "node:path";

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
import { ClaudeTranscript } from "@/claude-transcript";
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
    #status: Parameters<RuntimeControls["setStatus"]> | undefined;

    readonly #transcripts = new Map<string, ClaudeTranscript>();
    readonly #endedSessions = new Set<string>();
    #observationClosed = false;
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
                setStatus: (...args) => {
                    this.#status = args;
                    if (this.#ready) controls.setStatus(...args);
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
        if (
            this.#stopped ||
            this.#observationClosed ||
            report.event.agent_id !== undefined
        )
            return;
        const session = report.event.session_id;
        if (report.event.hook_event_name === "SessionEnd") {
            this.#endedSessions.add(session);
            await this.#transcripts.get(session)?.read();
            await this.#transcripts.get(session)?.close();
            this.#transcripts.delete(session);
            return;
        }
        if (report.event.hook_event_name === "SessionStart")
            this.#endedSessions.delete(session);
        if (this.#endedSessions.has(session)) return;
        const path = report.event.transcript_path;
        if (typeof path !== "string" || !isAbsolute(path)) return;
        const previous = this.#transcripts.get(session);
        if (previous) {
            if (previous.path !== path)
                throw new InvalidVendorReport(
                    "Claude transcript path changed within one session.",
                );
            return;
        }
        const transcript = new ClaudeTranscript(
            path,
            async (row) => {
                if (
                    !row ||
                    typeof row !== "object" ||
                    !("sessionId" in row) ||
                    row.sessionId !== session
                )
                    return;
                await this.observations.observeTranscript(row);
            },
            () => {
                process.stderr.write(
                    "AIOX: Claude transcript observation failed; retrying.\n",
                );
            },
        );
        this.#transcripts.set(session, transcript);
        transcript.start();
    }

    async #closeTranscripts(): Promise<void> {
        this.#observationClosed = true;
        await Promise.all(
            [...this.#transcripts.values()].map((reader) => reader.close()),
        );
        this.#transcripts.clear();
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
            if (this.#status) this.controls.setStatus(...this.#status);
            else this.controls.setStatus("idle");
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
            this.controls.setStatus("failed", "connection_failed");
            throw error;
        }
    }

    async connectionLost(): Promise<void> {
        await this.#closeTranscripts();
        await this.observations.failPending("foreground_connection_lost");
    }

    async processExited(
        exitCode: number,
        signal: number | null,
    ): Promise<void> {
        this.#started = false;
        await this.#closeTranscripts();
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
        await this.#closeTranscripts();
        if (reason !== "execution_stopped")
            await this.observations.failPending(reason);
        else await this.observations.interruptPending();
        this.#inboxToken = undefined;
    }
}
