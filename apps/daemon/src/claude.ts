import { randomBytes } from "node:crypto";

import {
    createTerminal,
    type TerminalListener,
    type TerminalSession,
} from "@aiox/terminal";

import { createClaudeInbox } from "@/claude-environment";
import { writeClaudeInbox } from "@/claude-inbox";
import { ClaudeObservations } from "@/claude-observations";
import type { AgentBinding, InboundMessage, RuntimeControls } from "@/runtimes";

export type ClaudeHookReport = {
    event: Record<string, unknown>;
    inboxPath?: string | undefined;
    inboxToken?: string | undefined;
};

/** The registered handle exists before any asynchronous preparation or spawn. */
export class ClaudeBinding implements AgentBinding {
    readonly hookToken = randomBytes(32).toString("base64url");
    inboxPath = "";
    session: TerminalSession | undefined;
    #inbox: Awaited<ReturnType<typeof createClaudeInbox>> | undefined;
    #stopped = false;
    #ready = false;
    #wasReady = false;
    #inboxReady = false;
    #mcpReady = false;
    requireMcp = false;
    #inboxToken: string | undefined;
    #preparation: Promise<void> | undefined;
    readonly observationOptions = { hasBlockingStopHooks: false };
    readonly observations: ClaudeObservations;
    #activity: Parameters<RuntimeControls["setActivity"]> | undefined;

    #externalStarted = false;
    onReady: (() => void) | undefined;
    onReleased: (() => void) | undefined;

    constructor(
        readonly controls: RuntimeControls,
        private readonly externalInboxPath?: string,
    ) {
        if (externalInboxPath !== undefined) this.inboxPath = externalInboxPath;
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
        return this.externalInboxPath === undefined
            ? Boolean(this.session?.alive)
            : this.#externalStarted;
    }
    externalStarted(): void {
        if (this.#stopped) throw new Error("Claude runtime was stopped.");
        this.#externalStarted = true;
        this.#updateReady();
    }

    prepare(): Promise<void> {
        this.#preparation ??= this.#prepare();
        return this.#preparation;
    }
    async #prepare(): Promise<void> {
        if (this.#stopped) throw new Error("Claude runtime was stopped.");
        this.#inbox = await createClaudeInbox();
        this.inboxPath = this.#inbox.path;
        if (this.#stopped) {
            throw new Error("Claude runtime was stopped.");
        }
    }

    async start(options: {
        args: string[];
        env: Record<string, string>;
        cwd: string;
        cols: number;
        rows: number;
        initialListener?: TerminalListener;
    }): Promise<void> {
        if (this.#stopped) throw new Error("Claude runtime was stopped.");
        try {
            this.session = createTerminal({
                id: this.controls.runtimeId,
                file: "claude",
                ...options,
            });
        } catch {
            throw new Error(
                "Cannot start Claude: the vendor process could not be created. Check the Claude installation and working directory.",
            );
        }
    }

    async observe(report: ClaudeHookReport): Promise<void> {
        if (this.#stopped) throw new Error("Claude runtime was stopped.");
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
            if (
                this.#stopped ||
                (this.externalInboxPath === undefined && !this.alive)
            )
                throw new Error("Claude exited before inbox readiness.");
            this.#inboxReady = true;
            this.#updateReady();
        }
        await this.observations.observe(report.event);
    }

    get ready(): boolean {
        return this.#ready;
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
        this.#externalStarted = false;
        if (!this.#stopped && signal === null && exitCode !== 0)
            await this.observations.failPending("vendor_process_failed");
        else await this.observations.interruptPending();
    }

    async stop(_force: boolean): Promise<void> {
        this.#stopped = true;
        this.#ready = false;
        await this.#preparation?.catch(() => {});
        try {
            await this.session?.kill();
            await this.session?.dispose();
        } catch {
            this.controls.setActivity("failed", {
                event: "cleanup",
                reason: "unconfirmed",
            });
            throw new Error(
                "Claude resource or input outcome cleanup is unconfirmed.",
            );
        }
        if (this.#inbox) {
            await this.#inbox.dispose();
            this.#inbox = undefined;
        }
    }

    async cleanup(): Promise<void> {
        this.onReleased?.();
        this.#stopped = true;
        this.#ready = false;
        this.#externalStarted = false;
        if (this.externalInboxPath !== undefined)
            await this.observations.failPending("external_connection_lost");
        else await this.observations.interruptPending();
        this.#inboxToken = undefined;
    }
}
