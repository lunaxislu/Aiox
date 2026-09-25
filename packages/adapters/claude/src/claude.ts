import { readFile, readdir, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";

import { logger } from "@aiox/diagnostics";
import { InvalidVendorReport } from "@aiox/vendor";
import type {
    InboundMessage,
    RuntimeControls,
    VendorBinding,
    VendorLaunchInput,
} from "@aiox/vendor";
import chokidar, { type FSWatcher } from "chokidar";
import {
    Cause,
    Duration,
    Effect,
    Exit,
    Fiber,
    Option,
    Schema,
    Semaphore,
} from "effect";

import { writeClaudeInbox } from "@/claude-inbox";
import { prepareClaudeLaunch } from "@/claude-launch";
import { ClaudeObservations } from "@/claude-observations";
import { ClaudeTranscript } from "@/claude-transcript";
import { launchHooks } from "@/launch-hooks";

const reportSchema = Schema.Struct({
    ppid: Schema.Int.check(Schema.isGreaterThan(0)),
    event: Schema.StructWithRest(
        Schema.Struct({
            hook_event_name: Schema.String.check(Schema.isMinLength(1)),
            session_id: Schema.String.check(Schema.isMinLength(1)),
            agent_id: Schema.optional(Schema.String),
            transcript_path: Schema.optional(Schema.String),
            source: Schema.optional(Schema.Unknown),
            notification_type: Schema.optional(Schema.String),
        }),
        [Schema.Record(Schema.String, Schema.Unknown)],
    ),
    inboxPath: Schema.optional(Schema.String),
    inboxToken: Schema.optional(Schema.String),
}).check(
    Schema.makeFilter((value) => {
        const extra = Object.keys(value).find(
            (key) =>
                !Object.hasOwn(
                    {
                        ppid: true,
                        event: true,
                        inboxPath: true,
                        inboxToken: true,
                    },
                    key,
                ),
        );
        return extra === undefined
            ? undefined
            : { path: [extra], issue: "Unexpected key" };
    }),
);

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
    readonly #retirements = new Set<Fiber.Fiber<void, unknown>>();
    #settlementFailure = false;
    readonly #watchers = new Map<ClaudeTranscript, FSWatcher>();
    readonly #watcherClosures = new Map<
        FSWatcher,
        Fiber.Fiber<void, unknown>
    >();
    readonly #queuedReads = new Set<ClaudeTranscript>();
    readonly #lostWatches = new Set<ClaudeTranscript>();
    #selectedSession: string | undefined;
    #registryPath: string | undefined;
    #observedRegistrySession: string | undefined;
    #registryWatch: { path: string; watcher: FSWatcher } | undefined;
    #registryQueued = false;
    #registryFailure = false;
    #initializationFailure: string | undefined;
    readonly #reports = Effect.runSync(Semaphore.make(1));
    readonly #registrations = Effect.runSync(Semaphore.make(1));
    readonly #reportFibers = new Set<Fiber.Fiber<void, unknown>>();
    readonly #readFailures = new Map<ClaudeTranscript, string>();
    #retryFiber: Fiber.Fiber<void, unknown> | undefined;
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
        const parsed = Schema.decodeUnknownOption(reportSchema, {
            onExcessProperty: "error",
        })(value);
        if (Option.isNone(parsed))
            throw new InvalidVendorReport("Invalid Claude hook report.");
        const report = parsed.value;
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
        await Effect.runPromise(
            Semaphore.withPermit(this.#registrations)(
                Effect.tryPromise({
                    try: async () => {
                        try {
                            await this.#registerWatch(
                                report.event,
                                report.ppid,
                            );
                            if (report.event.hook_event_name === "SessionStart")
                                this.#initializationFailure = undefined;
                            this.#reportObservationError();
                        } catch (error) {
                            this.#initializationFailure = `Claude initialization failed: ${error instanceof Error ? error.message : String(error)}`;
                            this.#reportObservationError();
                            throw error;
                        }
                    },
                    catch: (error) => error,
                }),
            ),
        );
        const reader = this.#transcripts.get(report.event.session_id);
        const observation = Effect.runPromise(
            Semaphore.withPermit(this.#reports)(
                Effect.tryPromise({
                    try: () => this.#observe(report.event, reader),
                    catch: (error) => error,
                }),
            ),
        );
        const reportFailure = (error: unknown) => {
            logger.error(
                { err: error, runtimeId: this.controls.runtimeId },
                "Deferred Claude observation failed",
            );
        };
        if (report.event.hook_event_name !== "SessionStart") {
            try {
                await observation;
            } catch (error) {
                reportFailure(error);
                throw error;
            }
        } else {
            void observation.catch(reportFailure);
        }
        // Capture the initial offset independently of queued settlement work.
        return undefined;
    }

    async #registerWatch(
        event: Schema.Schema.Type<typeof reportSchema>["event"],
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
                this.#closeWatcher(this.#watchers.get(reader));
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
        this.#closeWatcher(this.#watchers.get(reader));
        this.#watchers.delete(reader);
        this.#queuedReads.delete(reader);
        this.#lostWatches.delete(reader);
        this.#readFailures.delete(reader);
        const state = this.#sessions.get(reader)!;
        const binding = this;
        const retiring = Effect.runFork(
            Effect.gen(function* () {
                yield* Effect.tryPromise({
                    try: () => reader.retire(),
                    catch: (error) => error,
                });
                yield* Effect.tryPromise({
                    try: () =>
                        binding.observations.retireSession(session, state),
                    catch: (error) => error,
                });
            }).pipe(
                Effect.catch(() =>
                    Effect.sync(() => {
                        binding.#settlementFailure = true;
                    }),
                ),
                Effect.andThen(() =>
                    Effect.sync(() => {
                        binding.#reportObservationError();
                        binding.#scheduleReadRetry();
                    }),
                ),
            ),
        );
        this.#retirements.add(retiring);
        retiring.addObserver(() => this.#retirements.delete(retiring));
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
        Schema.decodeUnknownSync(Schema.Struct({ sessionId: Schema.String }))(
            JSON.parse(body),
        );
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
        this.#closeWatcher(this.#watchers.get(reader));
        this.#watchers.delete(reader);
        reader.relocate(path);
        this.#armTranscript(reader);
        return true;
    }

    async #observe(
        event: Schema.Schema.Type<typeof reportSchema>["event"],
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

    #queueRegistry(changeDelay = 0): void {
        if (this.#observationClosed || this.#registryQueued) return;
        this.#registryQueued = true;
        const binding = this;
        let queued!: Fiber.Fiber<void, unknown>;
        queued = Effect.runFork(
            Semaphore.withPermit(this.#reports)(
                Effect.gen(function* () {
                    if (changeDelay > 0)
                        yield* Effect.clockWith((clock) =>
                            clock.sleep(Duration.millis(changeDelay)),
                        );
                    binding.#registryQueued = false;
                    if (binding.#observationClosed) return;
                    yield* Effect.tryPromise({
                        try: () => binding.#readRegistry(),
                        catch: (error) => error,
                    });
                }).pipe(Effect.catch(() => Effect.void)),
            ),
        );
        this.#reportFibers.add(queued);
        queued.addObserver(() => this.#reportFibers.delete(queued));
    }

    #armRegistry(): void {
        const path = this.#registryPath;
        if (
            !path ||
            this.#observationClosed ||
            this.#registryWatch?.path === path
        )
            return;
        this.#closeWatcher(this.#registryWatch?.watcher);
        const watcher = chokidar.watch([dirname(path), path], {
            persistent: false,
            ignoreInitial: true,
            depth: 0,
            atomic: false,
        });
        watcher.on("all", (event, changedPath) => {
            if (
                basename(changedPath) === basename(path) &&
                (event === "add" || event === "change" || event === "unlink")
            ) {
                // This watcher owns the directory rather than the file inode;
                // keep it alive across atomic registry replacement.
                this.#queueRegistry(event === "change" ? 60 : 0);
            }
        });
        this.#registryWatch = { path, watcher };
        watcher.once("ready", () => this.#queueRegistry());
        watcher.on("error", () => {
            this.#closeWatcher(watcher);
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
            const body = Schema.decodeUnknownSync(
                Schema.Struct({
                    sessionId: Schema.String,
                    status: Schema.optional(
                        Schema.Literals(["idle", "busy", "waiting", "shell"]),
                    ),
                    waitingFor: Schema.optional(Schema.String),
                }),
            )(JSON.parse(await readFile(path, "utf8")));
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

    #queueRead(reader: ClaudeTranscript, changeDelay = 0): void {
        if (!this.#ownsReader(reader)) return;
        if (this.#observationClosed || this.#queuedReads.has(reader)) return;
        this.#queuedReads.add(reader);
        const binding = this;
        let queued!: Fiber.Fiber<void, unknown>;
        queued = Effect.runFork(
            Semaphore.withPermit(this.#reports)(
                Effect.gen(function* () {
                    if (changeDelay > 0)
                        yield* Effect.clockWith((clock) =>
                            clock.sleep(Duration.millis(changeDelay)),
                        );
                    binding.#queuedReads.delete(reader);
                    if (!binding.#observationClosed)
                        yield* Effect.tryPromise({
                            try: () => binding.#read(reader),
                            catch: (error) => error,
                        });
                }).pipe(Effect.catch(() => Effect.void)),
            ),
        );
        this.#reportFibers.add(queued);
        queued.addObserver(() => this.#reportFibers.delete(queued));
    }

    #armTranscript(reader: ClaudeTranscript): void {
        if (!this.#ownsReader(reader)) return;
        if (this.#observationClosed || this.#watchers.has(reader)) return;
        let watcher: FSWatcher;
        try {
            watcher = chokidar.watch(reader.path, {
                persistent: false,
                ignoreInitial: true,
                depth: 0,
            });
            watcher.on("all", (event) => {
                if (!this.#ownsReader(reader)) return;
                if (event === "unlink") {
                    this.#lostWatches.add(reader);
                    this.#closeWatcher(watcher);
                    if (this.#watchers.get(reader) === watcher)
                        this.#watchers.delete(reader);
                }
                if (event === "add" || event === "change" || event === "unlink")
                    this.#queueRead(reader, event === "change" ? 60 : 0);
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
            this.#closeWatcher(watcher);
            if (this.#watchers.get(reader) === watcher)
                this.#watchers.delete(reader);
            if (this.#observationClosed || !this.#ownsReader(reader)) return;
            this.#lostWatches.add(reader);
            this.#readFailures.set(
                reader,
                error instanceof Error ? error.message : String(error),
            );
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
                logger.error(
                    { err: error, runtimeId: this.controls.runtimeId },
                    "Claude transcript read failed",
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
        if (this.#observationClosed) return;
        if (
            !this.#readFailures.size &&
            !this.#registryFailure &&
            !this.#settlementFailure
        ) {
            this.#retryDelay = 1000;
            return;
        }
        if (this.#retryFiber) return;

        const binding = this;
        let retrying!: Fiber.Fiber<void, unknown>;
        const effect = Effect.gen(function* () {
            yield* Effect.clockWith((clock) =>
                clock.sleep(Duration.millis(binding.#retryDelay)),
            );
            if (
                binding.#observationClosed ||
                (!binding.#readFailures.size &&
                    !binding.#registryFailure &&
                    !binding.#settlementFailure)
            )
                return;

            yield* Semaphore.withPermit(binding.#reports)(
                Effect.tryPromise({
                    try: async () => {
                        if (binding.#observationClosed) return;
                        if (binding.#settlementFailure) {
                            try {
                                await binding.observations.retryOutcomes();
                                binding.#settlementFailure = false;
                                binding.#reportObservationError();
                            } catch {
                                // Keep immutable outcome for the next retry.
                            }
                        }
                        if (binding.#registryFailure)
                            await binding.#readRegistry();
                        for (const reader of binding.#readFailures.keys()) {
                            if (!binding.#readFailures.has(reader)) continue;
                            await binding.#read(reader).catch(() => {});
                        }
                    },
                    catch: (error) => error,
                }),
            );
            binding.#retryDelay = Math.min(binding.#retryDelay * 2, 30_000);
        }).pipe(
            Effect.ensuring(
                Effect.sync(() => {
                    if (binding.#retryFiber === retrying)
                        binding.#retryFiber = undefined;
                    binding.#scheduleReadRetry();
                }),
            ),
        );
        retrying = Effect.runFork(effect);
        this.#retryFiber = retrying;
    }

    #closeWatcher(watcher: FSWatcher | undefined): void {
        if (!watcher) return;
        if (this.#watcherClosures.has(watcher)) return;
        const closing = Effect.runFork(
            Effect.tryPromise({
                try: () => Promise.resolve(watcher.close()),
                catch: (error) => error,
            }),
        );
        this.#watcherClosures.set(watcher, closing);
        closing.addObserver((exit) => {
            if (Exit.isSuccess(exit)) this.#watcherClosures.delete(watcher);
        });
    }

    async #closeTranscripts(): Promise<void> {
        this.#observationClosed = true;
        this.#closeWatcher(this.#registryWatch?.watcher);
        this.#registryWatch = undefined;
        for (const watcher of this.#watchers.values())
            this.#closeWatcher(watcher);
        this.#watchers.clear();
        const retry = this.#retryFiber;
        this.#retryFiber = undefined;
        if (retry) await Effect.runPromise(Fiber.interrupt(retry));
        await Effect.runPromise(
            Semaphore.withPermit(this.#registrations)(Effect.void),
        );
        await Effect.runPromise(
            Effect.all(
                [...this.#reportFibers].map((fiber) => Fiber.await(fiber)),
                { concurrency: "unbounded" },
            ),
        );
        await Effect.runPromise(
            Effect.all(
                [...this.#retirements].map((fiber) => Fiber.await(fiber)),
                { concurrency: "unbounded" },
            ),
        );
        await Effect.runPromise(
            Semaphore.withPermit(this.#reports)(Effect.void),
        );
        // Drain every file even without a final change event. Exit captures let
        // every reader finish so one corrupt file cannot hide another result.
        const reads = await Effect.runPromise(
            Effect.all(
                [...this.#transcripts.values()].map((reader) =>
                    Effect.exit(
                        Effect.tryPromise({
                            try: () => this.#read(reader),
                            catch: (error) => error,
                        }),
                    ),
                ),
                { concurrency: "unbounded" },
            ),
        );
        const failures = reads
            .filter(Exit.isFailure)
            .map((exit) => Cause.squash(exit.cause));
        if (failures.length)
            throw new AggregateError(failures, failures.map(String).join("; "));
        const closes = await Effect.runPromise(
            Effect.all(
                [...this.#transcripts.values()].map((reader) =>
                    Effect.exit(
                        Effect.tryPromise({
                            try: () => reader.close(),
                            catch: (error) => error,
                        }),
                    ),
                ),
                { concurrency: "unbounded" },
            ),
        );
        const closeFailures = closes
            .filter(Exit.isFailure)
            .map((exit) => Cause.squash(exit.cause));
        if (closeFailures.length)
            throw new AggregateError(
                closeFailures,
                closeFailures.map(String).join("; "),
            );
        const closures = await Effect.runPromise(
            Effect.all(
                [...this.#watcherClosures.values()].map((fiber) =>
                    Fiber.await(fiber),
                ),
                { concurrency: "unbounded" },
            ),
        );
        const closeErrors = closures
            .filter(Exit.isFailure)
            .map((exit) => Cause.squash(exit.cause));
        if (closeErrors.length)
            throw new AggregateError(
                closeErrors,
                closeErrors.map(String).join("; "),
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
