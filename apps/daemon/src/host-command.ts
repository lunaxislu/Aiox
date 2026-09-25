import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TerminalLaunch } from "@aiox/config";
import { logger } from "@aiox/diagnostics";
import type {
    CommandError,
    HostCommand,
    HostCommandEvent,
    HostCommandResult,
    HostTargetResult,
    HostView,
} from "@aiox/protocol";
import {
    Cause,
    Deferred,
    Effect,
    Exit,
    Queue,
    Semaphore,
    Stream,
} from "effect";

import { launchCommand, waitForAgent } from "./host-run";
import type { HttpEnv } from "./http";
import { HttpError } from "./http";
import type { Context } from "./http-endpoint";
import { restartCommand } from "./managed-agents";
import type { DaemonServices } from "./services";

/** Asks the calling CLI to run an Agent in its own terminal. */
export type Launch = (
    hostId: string,
    agentKey: string,
    terminalId: string,
    marker: string,
) => void;
/** What one Host command did; turned into its HTTP result. */
export type HostOutcome = {
    hostId: string | null;
    targets: HostTargetResult[];
    error?: CommandError | null;
    cleanupErrors?: CommandError[];
};
export type AdmittedHostCommand = {
    hostId: string;
    /** Agents whose tabs Web must not close meanwhile; "all" for whole-Host work. */
    agents: readonly string[] | "all";
    execute(launch: Launch): Promise<HostOutcome>;
};
type Running = {
    hash: string;
    hostId: string;
    agents: ReadonlySet<string> | "all";
    done: Deferred.Deferred<HostCommandResult>;
};

export function commandError(
    error: unknown,
    stage: CommandError["stage"],
    agentKey?: string,
): CommandError {
    return {
        code:
            error instanceof HttpError
                ? error.code
                : stage === "storage"
                  ? "storage_error"
                  : stage === "cleanup"
                    ? "cleanup_failed"
                    : "execution_failed",
        message: error instanceof Error ? error.message : String(error),
        stage:
            (error instanceof HttpError &&
                (error.extra.stage as CommandError["stage"] | undefined)) ||
            stage,
        ...(agentKey === undefined ? {} : { agentKey }),
    };
}

/**
 * Host commands answer with their actual per-target outcome. The work belongs to
 * the daemon, not to the HTTP request: a disconnected caller does not cancel it,
 * and a retransmission with the same requestId joins it instead of repeating it.
 */
export class HostCommands {
    readonly #running = new Map<string, Running>();
    readonly #finalized = new Set<string>();
    // ponytail: admission is serialized; per-host locks if admission throughput becomes material.
    readonly #admission = Semaphore.makeUnsafe(1);
    constructor(private readonly services: Pick<DaemonServices, "tasks">) {}

    busy(hostId: string, agentKey?: string): boolean {
        for (const running of this.#running.values())
            if (
                running.hostId === hostId &&
                (running.agents === "all" ||
                    agentKey === undefined ||
                    running.agents.has(agentKey))
            )
                return true;
        return false;
    }

    respond(
        c: Context<HttpEnv>,
        request: { requestId: string; hash: string; command: HostCommand },
        admit: () => Promise<AdmittedHostCommand>,
    ): Promise<Response> {
        return Effect.runPromise(
            this.stream(request, admit, c.get("requestId")).pipe(
                Effect.map((events) => respond(c, events)),
            ),
        );
    }
    stream(
        request: { requestId: string; hash: string; command: HostCommand },
        admit: () => Promise<AdmittedHostCommand>,
        requestId?: unknown,
    ) {
        return this.#admission
            .withPermit(
                Effect.gen({ self: this }, function* () {
                    const joined = this.#running.get(request.requestId);
                    if (joined) {
                        if (joined.hash !== request.hash)
                            return yield* Effect.fail(
                                new HttpError(
                                    409,
                                    "request_conflict",
                                    "This requestId was used with a different request.",
                                    { stage: "cli" },
                                ),
                            );
                        return Stream.fromEffect(
                            Deferred.await(joined.done),
                        ).pipe(
                            Stream.map((result): HostCommandEvent => ({
                                type: "result",
                                result,
                            })),
                        );
                    }
                    if (this.#finalized.has(request.requestId))
                        return yield* Effect.fail(
                            new HttpError(
                                409,
                                "result_expired",
                                "This request is finalized. Its result is unavailable and it will not execute again.",
                                { stage: "cli" },
                            ),
                        );
                    const admitted = yield* Effect.tryPromise({
                        try: admit,
                        catch: (error) => error,
                    });
                    if (this.busy(admitted.hostId))
                        return yield* Effect.fail(
                            new HttpError(
                                409,
                                "host_busy",
                                "Another Host command is running for this Host.",
                                { stage: "cli" },
                            ),
                        );
                    const done = yield* Deferred.make<HostCommandResult>();
                    const events = yield* Queue.make<HostCommandEvent>();
                    this.#running.set(request.requestId, {
                        hash: request.hash,
                        hostId: admitted.hostId,
                        agents:
                            admitted.agents === "all"
                                ? "all"
                                : new Set(admitted.agents),
                        done,
                    });
                    logger.info(
                        {
                            hostCommand: request.command,
                            hostCommandRequestId: request.requestId,
                            requestId,
                            hostId: admitted.hostId,
                        },
                        "Host command accepted",
                    );
                    const launch: Launch = (
                        hostId,
                        agentKey,
                        terminalId,
                        marker,
                    ) => {
                        Queue.offerUnsafe(events, {
                            type: "launch",
                            hostId,
                            agentKey,
                            terminalId,
                            marker,
                        });
                    };
                    yield* this.services.tasks.start(
                        Effect.gen({ self: this }, function* () {
                            const exit = yield* Effect.exit(
                                Effect.tryPromise({
                                    try: () => admitted.execute(launch),
                                    catch: (error) => error,
                                }),
                            );
                            const outcome: HostOutcome = Exit.isSuccess(exit)
                                ? exit.value
                                : {
                                      hostId: admitted.hostId,
                                      targets: [],
                                      error: commandError(
                                          Cause.squash(exit.cause),
                                          "execution",
                                      ),
                                  };
                            const cleanupErrors = outcome.cleanupErrors ?? [];
                            const error =
                                outcome.error ??
                                outcome.targets.find((target) => target.error)
                                    ?.error ??
                                null;
                            const result: HostCommandResult = {
                                requestId: request.requestId,
                                command: request.command,
                                hostId: outcome.hostId,
                                state:
                                    error || cleanupErrors.length
                                        ? "failed"
                                        : "succeeded",
                                targets: outcome.targets,
                                error,
                                cleanupErrors,
                            };
                            this.#running.delete(request.requestId);
                            this.#finalized.add(request.requestId);
                            yield* Deferred.succeed(done, result);
                            yield* Queue.offer(events, {
                                type: "result",
                                result,
                            });
                            logger[
                                result.state === "failed" ? "error" : "info"
                            ](
                                {
                                    hostCommand: request.command,
                                    hostCommandRequestId: request.requestId,
                                    requestId: requestId,
                                    hostId: result.hostId,
                                    state: result.state,
                                },
                                "Host command finished",
                            );
                        }),
                    );
                    return Stream.fromQueue(events).pipe(
                        Stream.takeUntil((event) => event.type === "result"),
                    );
                }),
            )
            .pipe(Effect.uninterruptible);
    }
}

/** NDJSON is the CLI boundary; disconnecting the reader does not stop its command. */
function respond(
    c: Context<HttpEnv>,
    events: Stream.Stream<HostCommandEvent>,
): Response {
    c.header("content-type", "application/x-ndjson; charset=utf-8");
    const encoder = new TextEncoder();
    return c.body(
        Stream.toReadableStream(
            events.pipe(
                Stream.map((event) =>
                    encoder.encode(JSON.stringify(event) + "\n"),
                ),
            ),
        ),
    );
}

/**
 * Starts one managed Agent in its registered tab and waits for its actual
 * readiness. It never throws: the outcome belongs to this target only.
 */
export async function startAgent(
    services: DaemonServices,
    launch: Launch,
    input: {
        host: HostView;
        key: string;
        adapter: string;
        tabId: string;
        callerTerminalId?: string | undefined;
        terminalLaunch?: TerminalLaunch | undefined;
    },
): Promise<{ target: HostTargetResult; cleanupErrors: CommandError[] }> {
    const { host, key } = input;
    const cleanupErrors: CommandError[] = [];
    let stage: CommandError["stage"] = "execution";
    let terminalId: string | null = null;
    let created = false;
    let saved = false;
    let launchFile: string | undefined;
    try {
        const tab = (
            await services.db.hostState.getPanel(host.panelId)
        )?.tabs.find((t) => t.id === input.tabId);
        if (!tab) throw new Error("The Agent tab was closed.");
        const reusable = tab.terminalId
            ? services.terminals.view(tab.terminalId)
            : undefined;
        created = !reusable?.alive;
        const terminal = reusable?.alive
            ? reusable
            : await services.lifecycle.createShell(
                  { cwd: host.directory },
                  input.terminalLaunch,
              );
        terminalId = terminal.id;
        if (!terminal.alive)
            throw new Error("Host shell exited during creation.");
        stage = "storage";
        await services.db.hostState.mutatePanel(host.panelId, (p) => {
            if (!p.tabs.some((t) => t.id === input.tabId))
                throw new HttpError(
                    409,
                    "id_deleted",
                    "The Agent tab was closed.",
                    {
                        stage: "execution",
                    },
                );
            return {
                ...p,
                tabs: p.tabs.map((t) =>
                    t.id === input.tabId
                        ? { ...t, terminalId: terminal.id }
                        : t,
                ),
            };
        });
        saved = true;
        await services.appState.update({ panel: host.panelId });
        stage = "execution";
        const inCaller = terminal.id === input.callerTerminalId;
        const marker = `AIOX_${inCaller ? "CALLER" : "LAUNCH"}_${randomUUID()}_`;
        let command: string | undefined;
        if (!inCaller) {
            launchFile = join(tmpdir(), `aiox-launch-${randomUUID()}.cjs`);
            command = await launchCommand(
                host,
                key,
                input.adapter,
                services.configLocation.home,
                marker,
                launchFile,
            );
        }
        const waiting = waitForAgent(services, host, key, terminal.id, marker);
        try {
            if (command)
                services.terminals.get(terminal.id)!.write(command + "\r");
            else launch(host.id, key, terminal.id, marker);
        } catch (error) {
            waiting.cancel();
            await waiting.ready.catch(() => {});
            throw error;
        }
        await waiting.ready;
        return {
            target: { agentKey: key, terminalId, state: "ready", error: null },
            cleanupErrors,
        };
    } catch (error) {
        const failure = commandError(error, stage, key);
        if (terminalId && created && !saved)
            try {
                await services.lifecycle.stopTerminal(terminalId);
            } catch (cleanup) {
                cleanupErrors.push(commandError(cleanup, "cleanup", key));
            }
        // Preserve a live vendor and its diagnostic when only collaboration failed.
        if (
            !services.runtimes
                .list()
                .some((r) => r.hostId === host.id && r.name === key)
        )
            try {
                await services.db.hostState.failStart(
                    host.id,
                    key,
                    failure.message,
                    restartCommand(host, key),
                    input.tabId,
                );
                await services.appState.update(
                    { panel: host.panelId },
                    { host: host.id },
                );
            } catch (storage) {
                cleanupErrors.push(commandError(storage, "storage", key));
            }
        return {
            target: {
                agentKey: key,
                terminalId,
                state: "failed",
                error: failure,
            },
            cleanupErrors,
        };
    } finally {
        if (launchFile)
            await rm(launchFile, { force: true }).catch((error: unknown) => {
                cleanupErrors.push({
                    code: "cleanup_failed",
                    stage: "cleanup",
                    message: `Could not remove launch file ${launchFile}: ${String(error)}`,
                    agentKey: key,
                });
            });
    }
}

/** Runs independent targets together; one failing does not cancel its siblings. */
export function allTargets<T>(
    items: readonly T[],
    run: (item: T) => Promise<{
        target: HostTargetResult;
        cleanupErrors: CommandError[];
    }>,
): Promise<{ targets: HostTargetResult[]; cleanupErrors: CommandError[] }> {
    return Effect.runPromise(
        Effect.forEach(items, (item) => Effect.promise(() => run(item)), {
            concurrency: "unbounded",
        }),
    ).then((results) => ({
        targets: results.map((r) => r.target),
        cleanupErrors: results.flatMap((r) => r.cleanupErrors),
    }));
}
