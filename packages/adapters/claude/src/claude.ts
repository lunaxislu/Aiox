import { watch, type FSWatcher } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";

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
    ppid: z.number().int().positive(),
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
    readonly observations: ClaudeObservations;
    #status: Parameters<RuntimeControls["setStatus"]> | undefined;

    readonly #transcripts = new Map<string, ClaudeTranscript>();
    readonly #sessions = new WeakMap<
        ClaudeTranscript,
        ReturnType<ClaudeObservations["selectSession"]>
    >();
    readonly #retirements = new Set<Promise<void>>();
    #settlementFailure = false;
    readonly #watchers = new Map<ClaudeTranscript, FSWatcher>();
    readonly #queuedReads = new Set<ClaudeTranscript>();
    readonly #lostWatches = new Set<ClaudeTranscript>();
    #selectedSession: string | undefined;
    #registryPath: string | undefined;
    #observedRegistrySession: string | undefined;
    #registryWatch: { path: string; watcher: FSWatcher } | undefined;
    #registryQueued = false;
    #registryFailure = false;
    #initializationFailure: string | undefined;
    #reports = Promise.resolve<unknown>(undefined);
    #registrations = Promise.resolve<unknown>(undefined);
    readonly #readFailures = new Map<ClaudeTranscript, string>();
    #retryTimer: ReturnType<typeof setTimeout> | undefined;
    #retrying = false;
    #retryDelay = 1000;
    #observationClosed = false;
    #started = false;
    onReady: (() => void) | undefined;
    onReleased: (() => void) | undefined;

    constructor(
        readonly controls: RuntimeControls,
        readonly inboxPath: string,
    ) {
        this.observations = new ClaudeObservations({
            ...controls,
            setStatus: (...args) => {
                this.#status = args;
                if (this.#ready) controls.setStatus(...args);
            },
        });
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

    async observe(value: unknown): Promise<unknown> {
        if (this.#stopped) throw new Error("Claude runtime was stopped.");
        const parsed = reportSchema.safeParse(value);
        if (!parsed.success)
            throw new InvalidVendorReport("Invalid Claude hook report.");
        const report = parsed.data;
        // Runtime report authentication is owned by the controller. Inbox env is
        // readiness evidence and can disappear from late SessionEnd hooks.
        if (
            report.inboxPath !== undefined ||
            report.inboxToken !== undefined ||
            !this.#wasReady
        ) {
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
        }
        // Initialization has its own queue: prior transcript settlement must not delay
        // capturing the next session's start position before its hook response.
        const registration = this.#registrations.then(async () => {
            try {
                const output = await this.#registerWatch(
                    report.event,
                    report.ppid,
                );
                if (report.event.hook_event_name === "SessionStart")
                    this.#initializationFailure = undefined;
                this.#reportObservationError();
                return output;
            } catch (error) {
                this.#initializationFailure = `Claude initialization failed: ${error instanceof Error ? error.message : String(error)}`;
                this.#reportObservationError();
                throw error;
            }
        });
        this.#registrations = registration.catch(() => {});
        await registration;
        const reader = this.#transcripts.get(report.event.session_id);
        const next = this.#reports.then(() =>
            this.#observe(report.event, reader),
        );
        this.#reports = next.catch((error: unknown) => {
            console.error("AIOX: deferred Claude observation failed:", error);
        });
        // Capture the initial offset independently of queued settlement work.
        if (report.event.hook_event_name !== "SessionStart") await next;
        return undefined;
    }

    async #registerWatch(
        event: z.infer<typeof reportSchema>["event"],
        ppid: number,
    ): Promise<void> {
        if (
            this.#stopped ||
            this.#observationClosed ||
            event.agent_id !== undefined ||
            event.hook_event_name !== "SessionStart"
        )
            return;
        const session = event.session_id;
        const path = event.transcript_path;
        if (typeof path !== "string" || !isAbsolute(path))
            throw new InvalidVendorReport(
                "Claude transcript path must be absolute.",
            );
        const registry = await this.#findRegistry(path, ppid);
        let reader = this.#transcripts.get(session);
        if (event.source === "resume") reader = undefined;
        if (reader) {
            if (reader.path !== path) {
                this.#watchers.get(reader)?.close();
                this.#watchers.delete(reader);
                reader.relocate(path);
            }
        } else {
            let state: ReturnType<ClaudeObservations["selectSession"]>;
            const consume = async (row: unknown) => {
                if (
                    row &&
                    typeof row === "object" &&
                    "sessionId" in row &&
                    row.sessionId === session
                )
                    await this.observations.observeTranscript(row, state);
            };
            reader =
                event.source === "compact"
                    ? new ClaudeTranscript(path, consume)
                    : await ClaudeTranscript.fromEnd(path, consume);
            if (this.#stopped || this.#observationClosed) {
                await reader.close();
                return;
            }
            for (const [oldSession, oldReader] of this.#transcripts)
                this.#retireTranscript(oldSession, oldReader);
            state = this.observations.selectSession(session, true);
            this.#observedRegistrySession = undefined;
            this.#sessions.set(reader, state);
            this.#transcripts.set(session, reader);
        }
        this.#selectedSession = session;
        this.#registryPath = registry;
        this.#armTranscript(reader);
        this.#armRegistry();
        if (!this.#registryWatch)
            throw new Error("Claude registry watch initialization failed.");
        this.observations.selectSession(session);
        this.#queueRegistry();
        this.#updateReady();
    }

    #retireTranscript(session: string, reader: ClaudeTranscript): void {
        this.#transcripts.delete(session);
        this.#watchers.get(reader)?.close();
        this.#watchers.delete(reader);
        this.#queuedReads.delete(reader);
        this.#lostWatches.delete(reader);
        this.#readFailures.delete(reader);
        const state = this.#sessions.get(reader)!;
        const retiring = reader
            .retire()
            .then(() => this.observations.retireSession(session, state))
            .catch(() => {
                this.#settlementFailure = true;
            })
            .finally(() => {
                this.#retirements.delete(retiring);
                this.#reportObservationError();
                this.#scheduleReadRetry();
            });
        this.#retirements.add(retiring);
    }

    #ownsReader(reader: ClaudeTranscript): boolean {
        return this.#transcripts.get(this.#selectedSession ?? "") === reader;
    }

    async #findRegistry(transcript: string, ppid: number): Promise<string> {
        const path = join(
            dirname(dirname(dirname(transcript))),
            "sessions",
            `${ppid}.json`,
        );
        const body = await readFile(path, "utf8");
        z.object({ sessionId: z.string() }).parse(JSON.parse(body));
        return path;
    }

    async #locateTranscript(reader: ClaudeTranscript): Promise<void> {
        if (!this.#registryPath || this.#watchers.has(reader)) return;
        const exists = await stat(reader.path).catch(
            (error: NodeJS.ErrnoException) => {
                if (error.code === "ENOENT") return undefined;
                throw error;
            },
        );
        if (exists) return;
        const root = join(dirname(dirname(this.#registryPath)), "projects");
        const directories = await readdir(root, { withFileTypes: true }).catch(
            (error: NodeJS.ErrnoException) => {
                if (error.code === "ENOENT") return [];
                throw error;
            },
        );
        // Only a missing known transcript needs discovery; never scan the PID registry.
        const paths: string[] = [];
        for (const directory of directories) {
            if (!directory.isDirectory()) continue;
            const candidate = join(root, directory.name, basename(reader.path));
            const file = await stat(candidate).catch(
                (error: NodeJS.ErrnoException) => {
                    if (error.code === "ENOENT") return undefined;
                    throw error;
                },
            );
            if (file?.isFile()) paths.push(candidate);
        }
        if (paths.length > 1)
            throw new Error("Claude transcript relocation is ambiguous.");
        if (paths[0])
            await this.#moveTranscript(
                reader,
                paths[0],
                basename(reader.path, ".jsonl"),
            );
    }

    async #moveTranscript(
        reader: ClaudeTranscript,
        path: string,
        session: string,
    ): Promise<boolean> {
        // The vendor names a transcript after its session, so a destination bearing
        // another name belongs to another session however the map is currently pruned.
        if (basename(path) !== `${session}.jsonl`) return false;
        const previous = reader.path;
        const inspect = (target: string) =>
            stat(target).catch((error: NodeJS.ErrnoException) => {
                if (error.code === "ENOENT") return undefined;
                throw error;
            });
        const [oldFile, newFile] = await Promise.all([
            inspect(previous),
            inspect(path),
        ]);
        // Compare again after I/O: an overlapping or delayed report cannot undo a move.
        if (reader.path !== previous || oldFile || !newFile?.isFile())
            return false;
        this.#watchers.get(reader)?.close();
        this.#watchers.delete(reader);
        reader.relocate(path);
        this.#armTranscript(reader);
        return true;
    }

    async #observe(
        event: z.infer<typeof reportSchema>["event"],
        reader: ClaudeTranscript | undefined,
    ): Promise<void> {
        if (
            event.agent_id !== undefined ||
            !["SessionStart", "StopFailure", "Notification"].includes(
                String(event.hook_event_name),
            )
        )
            return;
        if (!reader || !this.#ownsReader(reader)) return;
        await this.observations.observe(event, this.#sessions.get(reader));
        this.#reportObservationError();
        await this.#read(reader);
    }

    #queueRegistry(): void {
        if (this.#observationClosed || this.#registryQueued) return;
        this.#registryQueued = true;
        const next = this.#reports.then(async () => {
            this.#registryQueued = false;
            if (!this.#observationClosed) await this.#readRegistry();
        });
        this.#reports = next.catch(() => {});
    }

    #armRegistry(): void {
        const path = this.#registryPath;
        if (
            !path ||
            this.#observationClosed ||
            this.#registryWatch?.path === path
        )
            return;
        this.#registryWatch?.watcher.close();
        const watcher = watch(path, { persistent: false }, (event) => {
            if (event === "rename") {
                watcher.close();
                if (this.#registryWatch?.watcher === watcher)
                    this.#registryWatch = undefined;
            }
            this.#queueRegistry();
        });
        this.#registryWatch = { path, watcher };
        watcher.on("error", () => {
            watcher.close();
            if (this.#registryWatch?.watcher === watcher)
                this.#registryWatch = undefined;
            this.#queueRegistry();
        });
    }

    async #readRegistry(): Promise<void> {
        try {
            this.#armRegistry();
            const path = this.#registryPath;
            if (!path) return;
            const body = z
                .object({
                    sessionId: z.string(),
                    status: z
                        .enum(["idle", "busy", "waiting", "shell"])
                        .optional(),
                    waitingFor: z.string().optional(),
                })
                .parse(JSON.parse(await readFile(path, "utf8")));
            // A registry may move ahead of SessionStart. It cannot select a session.
            if (
                path !== this.#registryPath ||
                body.sessionId !== this.#selectedSession
            )
                return;
            if (body.status !== undefined) {
                this.observations.observeRegistry({
                    ...body,
                    status: body.status,
                });
                this.#observedRegistrySession = body.sessionId;
                this.#updateReady();
            }
            this.#registryFailure = false;
            this.#reportObservationError();
            for (const [session, reader] of this.#transcripts)
                if (
                    session === this.#selectedSession ||
                    !this.#watchers.has(reader)
                )
                    await this.#read(reader).catch(() => {});
        } catch {
            this.#registryFailure = true;
            this.#reportObservationError();
        } finally {
            this.#scheduleReadRetry();
        }
    }

    #queueRead(reader: ClaudeTranscript): void {
        if (!this.#ownsReader(reader)) return;
        if (this.#observationClosed || this.#queuedReads.has(reader)) return;
        this.#queuedReads.add(reader);
        const next = this.#reports.then(async () => {
            this.#queuedReads.delete(reader);
            if (!this.#observationClosed) await this.#read(reader);
        });
        this.#reports = next.catch(() => {});
    }

    #armTranscript(reader: ClaudeTranscript): void {
        if (!this.#ownsReader(reader)) return;
        if (this.#observationClosed || this.#watchers.has(reader)) return;
        let watcher: FSWatcher;
        try {
            watcher = watch(reader.path, { persistent: false }, (event) => {
                if (!this.#ownsReader(reader)) return;
                if (event === "rename") {
                    this.#lostWatches.add(reader);
                    watcher.close();
                    if (this.#watchers.get(reader) === watcher)
                        this.#watchers.delete(reader);
                }
                this.#queueRead(reader);
            });
        } catch (error) {
            // First creation may lag SessionStart. Registry changes retry attachment.
            if (
                (error as NodeJS.ErrnoException).code === "ENOENT" &&
                !this.#lostWatches.has(reader)
            )
                return;
            throw error;
        }
        this.#watchers.set(reader, watcher);
        this.#lostWatches.delete(reader);
        watcher.on("error", (error) => {
            watcher.close();
            if (this.#watchers.get(reader) === watcher)
                this.#watchers.delete(reader);
            if (this.#observationClosed || !this.#ownsReader(reader)) return;
            this.#lostWatches.add(reader);
            this.#readFailures.set(reader, error.message);
            this.#reportObservationError();
            this.#scheduleReadRetry();
        });
    }

    async #read(reader: ClaudeTranscript): Promise<void> {
        if (!this.#ownsReader(reader)) return;
        try {
            await this.#locateTranscript(reader);
            if (!this.#ownsReader(reader)) return;
            this.#armTranscript(reader);
            await reader.read();
            this.#readFailures.delete(reader);
            this.#reportObservationError();
        } catch (error) {
            if (!this.#ownsReader(reader)) return;
            const reason =
                error instanceof SyntaxError
                    ? "Invalid Claude transcript JSONL row."
                    : error instanceof Error
                      ? error.message
                      : String(error);
            if (this.#readFailures.get(reader) !== reason)
                console.error(
                    `AIOX: Claude transcript read failed (${reader.path}): ${reason}`,
                );
            this.#readFailures.set(reader, reason);
            this.#reportObservationError();
            throw error;
        } finally {
            this.#scheduleReadRetry();
        }
    }

    #reportObservationError(): void {
        if (!this.observations.hasPendingOutcomes)
            this.#settlementFailure = false;
        const errors = [
            ...(this.#settlementFailure
                ? ["Claude outcome storage failed."]
                : []),
            ...(this.#initializationFailure
                ? [this.#initializationFailure]
                : []),
            ...(this.#registryFailure
                ? ["Claude registry observation failed."]
                : []),
            ...[...this.#readFailures].map(
                ([reader, reason]) =>
                    `Claude transcript ${basename(reader.path, ".jsonl")}: ${reason}`,
            ),
        ];
        this.controls.setObservationError(
            errors.length ? errors.join("; ") : null,
        );
    }

    #scheduleReadRetry(): void {
        if (this.#observationClosed || this.#retrying) return;
        if (
            !this.#readFailures.size &&
            !this.#registryFailure &&
            !this.#settlementFailure
        ) {
            clearTimeout(this.#retryTimer);
            this.#retryTimer = undefined;
            this.#retryDelay = 1000;
            return;
        }
        if (this.#retryTimer) return;
        // Only failed reads are retried; normal transcript observation remains event-driven.
        this.#retryTimer = setTimeout(() => {
            this.#retryTimer = undefined;
            this.#retrying = true;
            const next = this.#reports
                .then(async () => {
                    if (this.#observationClosed) return;
                    if (this.#settlementFailure) {
                        try {
                            await this.observations.retryOutcomes();
                            this.#settlementFailure = false;
                            this.#reportObservationError();
                        } catch {
                            /* Keep the immutable outcome for the next retry. */
                        }
                    }
                    if (this.#registryFailure) await this.#readRegistry();
                    for (const reader of this.#readFailures.keys()) {
                        if (!this.#readFailures.has(reader)) continue;
                        await this.#read(reader).catch(() => {});
                    }
                })
                .finally(() => {
                    this.#retrying = false;
                    this.#retryDelay = Math.min(this.#retryDelay * 2, 30_000);
                    this.#scheduleReadRetry();
                });
            this.#reports = next.catch(() => {});
        }, this.#retryDelay);
        this.#retryTimer.unref();
    }

    async #closeTranscripts(): Promise<void> {
        this.#observationClosed = true;
        this.#registryWatch?.watcher.close();
        this.#registryWatch = undefined;
        for (const watcher of this.#watchers.values()) watcher.close();
        this.#watchers.clear();
        clearTimeout(this.#retryTimer);
        this.#retryTimer = undefined;
        await this.#registrations;
        await Promise.all(this.#retirements);
        await this.#reports;
        // Drain every file, even without a final change event. Finish all attempts
        // before fallback settlement; one corrupt file must not hide another result.
        const reads = await Promise.allSettled(
            [...this.#transcripts.values()].map((reader) => this.#read(reader)),
        );
        const failure = reads.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
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
            this.#selectedSession !== undefined &&
            this.#observedRegistrySession === this.#selectedSession &&
            this.#registryWatch !== undefined &&
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
        if (this.#status?.[0] === "aiox-preparing")
            throw new Error(
                "not_available: Agent is preparing/switching session. Please try again in a few moments.",
            );
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
        try {
            await this.#closeTranscripts();
        } finally {
            await this.observations.failPending("foreground_connection_lost");
        }
    }

    async processExited(
        exitCode: number,
        signal: number | null,
    ): Promise<void> {
        this.#started = false;
        try {
            await this.#closeTranscripts();
        } finally {
            if (!this.#stopped && signal === null && exitCode !== 0)
                await this.observations.failPending("vendor_process_failed");
            else await this.observations.interruptPending();
        }
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
        this.#inboxToken = undefined;
        try {
            await this.#closeTranscripts();
        } finally {
            if (reason !== "execution_stopped")
                await this.observations.failPending(reason);
            else await this.observations.interruptPending();
        }
    }
}
