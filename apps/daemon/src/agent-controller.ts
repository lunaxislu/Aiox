import { randomBytes } from "node:crypto";

import { logger } from "@aiox/diagnostics";
import {
    type AgentRun,
    agentRunSchema,
    externalAgentClientFrameSchema,
    externalAgentRunSchema,
    type LastExit,
} from "@aiox/protocol";
import {
    createTerminal,
    type TerminalExit,
    type TerminalSession,
} from "@aiox/terminal";
import {
    ExecutionOwner,
    type ExecutionProcess,
    InvalidVendorReport,
    type RuntimeControls,
    selectVendor,
    type VendorAdapter,
    type VendorBinding,
    type VendorExecution,
} from "@aiox/vendor";
import { Deferred, Duration, Effect, Fiber } from "effect";
import * as Schema from "effect/Schema";
import type { WebSocket } from "ws";
import { createActor } from "xstate";

import type { Daemon } from "@/daemon";
import { readJson } from "@/http";
import { bearerToken } from "@/mcp";
import { collaborationInstruction } from "@/messaging";

import { agentLifecycle } from "./agent-lifecycle";
import type { Context } from "./http-endpoint";
import { managedLaunch } from "./managed-agents";
import { launchInNetwork } from "./network-agent";

const resizeFields = {
    type: Schema.Literal("resize"),
    cols: Schema.Int.check(Schema.isGreaterThan(0)),
    rows: Schema.Int.check(Schema.isGreaterThan(0)),
};
const resizeSchema = Schema.StructWithRest(Schema.Struct(resizeFields), [
    Schema.Record(Schema.String, Schema.Unknown),
]).check(
    Schema.makeFilter((value) => {
        const extra = Object.keys(value).find(
            (key) => !Object.hasOwn(resizeFields, key),
        );
        return extra === undefined
            ? undefined
            : { path: [extra], issue: "Unexpected key" };
    }),
);
const decodeResize = Schema.decodeUnknownSync(resizeSchema);

/** Owns AIOX lifecycle and terminal transport, never vendor launch semantics. */
export class AgentController {
    readonly #reports = new Map<
        string,
        { runtimeId: string; binding: VendorBinding }
    >();
    constructor(
        private readonly daemon: Daemon,
        private readonly adapters: readonly VendorAdapter[],
    ) {}

    async hook(c: Context): Promise<Response> {
        const report = this.#reports.get(bearerToken(c.req.raw) ?? "");
        const active = () =>
            report &&
            this.daemon.services.runtimes.get(report.runtimeId)
                ?.collaborationActive;
        if (!active()) return c.body("Invalid agent report credential.", 401);
        if (c.req.method !== "POST") return c.body(null, 405);
        try {
            const body = await readJson(c.req.raw);
            if (!active())
                return c.body("Invalid agent report credential.", 401);
            const output = await report!.binding.observe(body);
            return output === undefined ? c.body(null, 204) : c.json(output);
        } catch (error) {
            return c.body(
                "Agent report could not be applied to this runtime.",
                error instanceof InvalidVendorReport ? 400 : 409,
            );
        }
    }
    attachExternal(socket: WebSocket): void {
        this.#attach(socket, true);
    }
    attach(socket: WebSocket): void {
        this.#attach(socket, false);
    }

    /** Starts daemon-owned execution without a second CLI or a relay socket. */
    start(input: AgentRun): Promise<void> {
        return new Promise((resolve, reject) => {
            this.#attach(undefined, false, { input, resolve, reject });
        });
    }

    #attach(
        socket: WebSocket | undefined,
        external: boolean,
        direct?: {
            input: AgentRun;
            resolve(): void;
            reject(error: Error): void;
        },
    ): void {
        const { daemon, adapters } = this;
        const reports = this.#reports;
        const lifecycle = createActor(agentLifecycle).start();
        const lifecycleSnapshot = () => lifecycle.getSnapshot();
        const isEnded = () =>
            lifecycleSnapshot().matches({ execution: "endedBeforePrepared" }) ||
            lifecycleSnapshot().matches({ execution: "endedAfterPrepared" }) ||
            lifecycleSnapshot().matches({ execution: "endedAfterStarted" });
        const isPrepared = () =>
            lifecycleSnapshot().matches({ execution: "prepared" }) ||
            lifecycleSnapshot().matches({ execution: "started" }) ||
            lifecycleSnapshot().matches({ execution: "endedAfterPrepared" }) ||
            lifecycleSnapshot().matches({ execution: "endedAfterStarted" });
        const isRelayDisconnected = () =>
            lifecycleSnapshot().matches({ relay: "disconnected" });
        const isStopping = () =>
            lifecycleSnapshot().matches({ process: "stopping" });
        let binding: VendorBinding | undefined;
        let controlsForBinding: RuntimeControls | undefined;
        let runtimeId: string | undefined;
        let terminalId: string | undefined;
        let reportToken: string | undefined;
        let collaborationError: string | undefined;
        let finishing: Fiber.Fiber<void, unknown> | undefined;
        let lifecycleFiber: Fiber.Fiber<void, unknown> | undefined;
        let timeoutFiber: Fiber.Fiber<void, unknown> | undefined;
        let foreground: ExecutionProcess | undefined;
        let execution: VendorExecution | undefined;
        let session: TerminalSession | undefined;
        let hostId: string | undefined;
        let exitRecord: LastExit | undefined;
        const send = (frame: object) => {
            if (socket && socket.readyState === socket.OPEN)
                socket.send(JSON.stringify(frame));
        };
        const clear = () => {
            clearTimeoutEffect();
            if (reportToken) reports.delete(reportToken);
        };
        const clearTimeoutEffect = () => {
            const fiber = timeoutFiber;
            timeoutFiber = undefined;
            if (fiber) Effect.runFork(Fiber.interrupt(fiber));
        };
        const timeoutAfter = (
            ms: number,
            task: () => Effect.Effect<void, unknown>,
        ) => {
            clearTimeoutEffect();
            timeoutFiber = Effect.runFork(
                Effect.sleep(Duration.millis(ms)).pipe(
                    Effect.andThen(Effect.suspend(task)),
                    Effect.catch(() => Effect.void),
                ),
            );
        };
        const released = () => {
            direct?.reject(
                new Error("Agent was released before becoming ready."),
            );
            clear();
            if (session?.alive && collaborationError && !isEnded()) return;
            if (isEnded()) return;
            lifecycle.send({ type: "FINISH" });
            socket?.resume();
            socket?.close();
        };
        let dimensions = { cols: 80, rows: 24 };
        const owner = external
            ? undefined
            : new ExecutionOwner((command) =>
                  Effect.sync(() => {
                      const exited = Effect.runSync(
                          Deferred.make<TerminalExit>(),
                      );
                      session = createTerminal({
                          id: runtimeId!,
                          ...command,
                          cols: dimensions.cols,
                          rows: dimensions.rows,
                          initialListener: {
                              data: (data) => {
                                  if (
                                      !isEnded() &&
                                      !isRelayDisconnected() &&
                                      socket !== undefined &&
                                      socket.readyState === socket.OPEN
                                  )
                                      socket.send(data);
                              },
                              exit: (exit) => {
                                  Effect.runFork(
                                      Deferred.succeed(exited, exit),
                                  );
                              },
                          },
                      });
                      const current = session;
                      Effect.runFork(
                          Deferred.await(exited).pipe(
                              Effect.flatMap(processExited),
                              Effect.catch(() => Effect.void),
                          ),
                      );
                      if (runtimeId)
                          daemon.services.runtimes.changed(runtimeId);
                      return {
                          exited: Deferred.await(exited),
                          write: (data) => current.write(data),
                          resize: (cols, rows) => current.resize(cols, rows),
                          stop: () =>
                              Effect.tryPromise({
                                  try: async () => {
                                      await current.kill();
                                      await current.dispose();
                                  },
                                  catch: (error) => error,
                              }),
                      };
                  }),
              );
        const release = Effect.gen(function* () {
            clear();
            if (runtimeId)
                yield* Effect.tryPromise({
                    try: () => daemon.stopRuntime(runtimeId!),
                    catch: (error) => error,
                });
            else if (owner) yield* owner.stop();
        });
        const finish = (
            message?: string,
            exit?: TerminalExit,
            failureCode:
                | "preparation_failed"
                | "preparation_timeout"
                | "invalid_lifecycle"
                | "process_exit"
                | "launch_timeout" = "preparation_failed",
        ): Effect.Effect<void, unknown> =>
            Effect.suspend(() => {
                if (message) direct?.reject(new Error(message));
                if (message && !isEnded() && !collaborationError) {
                    logger.error(
                        { runtimeId, hostId, terminalId, failureCode },
                        "Agent collaboration failed",
                    );
                }
                if (!external && session?.alive && message && !isEnded()) {
                    const task = Effect.gen(function* () {
                        collaborationError = message;
                        if (!foreground) {
                            lifecycle.send({ type: "RELAY_DISCONNECTED" });
                            socket?.close();
                        }
                        daemon.services.runtimes.revoke(runtimeId!);
                        clear();
                        socket?.resume();
                        if (runtimeId)
                            daemon.services.runtimes.changed(runtimeId);
                        if (binding) {
                            yield* Effect.tryPromise({
                                try: () =>
                                    binding!.cleanup("collaboration_lost"),
                                catch: (error) => error,
                            }).pipe(
                                Effect.catch(() =>
                                    Effect.sync(() => {
                                        collaborationError +=
                                            " Agent collaboration cleanup remains unconfirmed.";
                                        if (runtimeId)
                                            daemon.services.runtimes.changed(
                                                runtimeId,
                                            );
                                    }),
                                ),
                            );
                        }
                        return;
                    });
                    return Effect.runFork(task).pipe(Fiber.join);
                }
                if (finishing) return Fiber.join(finishing);
                const task = Effect.gen(function* () {
                    const startupFailed =
                        external &&
                        Boolean(message && isPrepared() && !binding?.wasReady);
                    if (message) collaborationError = message;
                    if (message && hostId) {
                        exitRecord ??= {
                            kind: "start-failed",
                            message,
                            at: Date.now(),
                        };
                    }
                    lifecycle.send({ type: "FINISH" });
                    clear();
                    socket?.resume();
                    if (startupFailed)
                        send({ type: "startup-failed", message });
                    const released = yield* Effect.exit(release);
                    if (released._tag === "Failure") {
                        message =
                            "Agent collaboration cleanup remains unconfirmed.";
                        logger.error({ runtimeId, terminalId }, message);
                        send({ type: "error", message });
                        socket?.close();
                        return;
                    }
                    logger.info(
                        { runtimeId, hostId, terminalId },
                        "Agent execution released",
                    );
                    if (message && !startupFailed)
                        send({ type: "error", message });
                    else if (!message && exit) send({ type: "exit", ...exit });
                    socket?.close();
                });
                const fiber = Effect.runFork(task);
                finishing = fiber;
                return Fiber.join(fiber);
            });
        const processExited = (
            exit: TerminalExit,
        ): Effect.Effect<void, unknown> =>
            Effect.suspend(() => {
                if (isEnded()) return Effect.void;
                lifecycle.send({ type: "EXIT" });
                if (hostId && !isStopping() && !exitRecord) {
                    const ready = binding?.wasReady ?? false;
                    const clean = exit.exitCode === 0 && exit.signal === null;
                    exitRecord = {
                        kind: !ready
                            ? "start-failed"
                            : clean
                              ? "exited"
                              : "crashed",
                        message: !ready
                            ? "Vendor exited before collaboration became ready."
                            : clean
                              ? null
                              : `Vendor exited with code ${exit.exitCode}, signal ${exit.signal}.`,
                        at: Date.now(),
                    };
                }
                daemon.services.runtimes.revoke(runtimeId!);
                const persist = binding
                    ? Effect.tryPromise({
                          try: () =>
                              binding!.processExited(
                                  exit.exitCode,
                                  exit.signal,
                              ),
                          catch: (error) => error,
                      })
                    : Effect.void;
                const message =
                    binding?.wasReady || isStopping()
                        ? undefined
                        : "Vendor exited before collaboration became ready. Check vendor startup output and try again.";
                return persist.pipe(
                    Effect.ensuring(
                        Effect.exit(finish(message, exit, "process_exit")).pipe(
                            Effect.asVoid,
                        ),
                    ),
                );
            });
        const disconnected = (): Effect.Effect<void, unknown> =>
            Effect.suspend(() => {
                if (isEnded()) return Effect.void;
                if (!external && session?.alive) {
                    lifecycle.send({ type: "RELAY_DISCONNECTED" });
                    if (runtimeId) daemon.services.runtimes.changed(runtimeId);
                    socket?.close();
                    return Effect.void;
                }
                lifecycle.send({ type: "FINISH" });
                clear();
                if (runtimeId) daemon.services.runtimes.revoke(runtimeId);
                return Effect.gen(function* () {
                    if (!external && binding)
                        yield* Effect.tryPromise({
                            try: () => binding!.connectionLost(),
                            catch: (error) => error,
                        });
                    yield* release;
                }).pipe(
                    Effect.catch((error) =>
                        Effect.sync(() =>
                            logger.error(
                                { err: error, runtimeId, terminalId },
                                "Agent collaboration cleanup remains unconfirmed after connection loss.",
                            ),
                        ),
                    ),
                );
            });
        socket?.on("close", () => Effect.runFork(disconnected()));
        socket?.on("error", () => Effect.runFork(disconnected()));
        if (!direct)
            timeoutAfter(5000, () =>
                finish(
                    "No agent launch request was received.",
                    undefined,
                    "launch_timeout",
                ),
            );
        const begin = (raw: { toString(): string }, binary: boolean) => {
            clearTimeoutEffect();
            socket?.pause();
            lifecycleFiber = Effect.runFork(
                Effect.gen(function* () {
                    let payload: unknown;
                    try {
                        payload = binary
                            ? undefined
                            : JSON.parse(raw.toString());
                    } catch {}
                    const parsed = (
                        external ? externalAgentRunSchema : agentRunSchema
                    ).safeParse(payload);
                    if (!parsed.success)
                        throw new Error(
                            "Cannot start agent: invalid launch request.",
                        );
                    let input = parsed.data;
                    let webInput = external
                        ? undefined
                        : agentRunSchema.parse(input);
                    if (webInput && !webInput.terminalContext)
                        throw new Error(
                            "Web foreground requires authenticated terminal context.",
                        );
                    if (
                        external &&
                        (input.env.AIOX_HOST_ID !== undefined ||
                            input.env.AIOX_AGENT_KEY !== undefined)
                    )
                        throw new Error(
                            "Managed Agent requires authenticated terminal context.",
                        );
                    if (webInput) {
                        const managed = yield* Effect.tryPromise({
                            try: () =>
                                managedLaunch(daemon.services, webInput!),
                            catch: (error) => error,
                        });
                        webInput = managed.input;
                        input = webInput;
                        hostId = managed.host?.id;
                        dimensions = {
                            cols: webInput.cols,
                            rows: webInput.rows,
                        };
                    }
                    const adapter = selectVendor(adapters, input.adapter);
                    const networkId =
                        input.network === undefined
                            ? null
                            : hostId
                              ? input.network
                              : (yield* Effect.tryPromise({
                                    try: () =>
                                        daemon.services.networks.require(
                                            input.network!,
                                        ),
                                    catch: (error) => error,
                                })).id;
                    if (isEnded()) return;
                    if (!direct && webInput && !hostId && networkId !== null) {
                        const routed = yield* Effect.tryPromise({
                            try: () =>
                                launchInNetwork(
                                    daemon.services,
                                    webInput!,
                                    networkId,
                                ),
                            catch: (error) => error,
                        });
                        if (routed) {
                            yield* release;
                            lifecycle.send({ type: "FINISH" });
                            clear();
                            send({ type: "exit", exitCode: 0, signal: null });
                            socket?.resume();
                            socket?.close();
                            return;
                        }
                    }
                    // The owner scope exists before resource acquisition; failed preparation remains retryable.
                    const registration = yield* Effect.tryPromise({
                        try: () =>
                            daemon.registerRuntime({
                                networkId,
                                ...(hostId === undefined ? {} : { hostId }),
                                executionOwnership: external
                                    ? "external"
                                    : "daemon",
                                ...(input.name === undefined
                                    ? {}
                                    : { name: input.name }),
                                ...(input.role === undefined
                                    ? {}
                                    : { role: input.role }),
                                ...(input.description === undefined
                                    ? {}
                                    : { description: input.description }),
                                ...(webInput?.terminalContext === undefined
                                    ? {}
                                    : {
                                          terminalContext:
                                              webInput.terminalContext,
                                      }),
                                createBinding: (controls) => {
                                    runtimeId = controls.runtimeId;
                                    controlsForBinding = controls;
                                    return {
                                        get exit() {
                                            return exitRecord;
                                        },
                                        get terminal() {
                                            return session;
                                        },
                                        directTerminal: Boolean(direct),
                                        get relayDisconnected() {
                                            return isRelayDisconnected();
                                        },
                                        get collaborationError() {
                                            return collaborationError;
                                        },
                                        deliver: (message) =>
                                            binding
                                                ? binding.deliver(message)
                                                : Promise.reject(
                                                      new Error(
                                                          "Vendor input is not ready.",
                                                      ),
                                                  ),
                                        mcpConnected: () =>
                                            binding?.mcpConnected(),
                                        revoke: clear,
                                        stop: async () => {
                                            direct?.reject(
                                                new Error(
                                                    "Agent execution stopped before becoming ready.",
                                                ),
                                            );
                                            lifecycle.send({
                                                type: "STOP_REQUESTED",
                                            });
                                            if (owner)
                                                await Effect.runPromise(
                                                    owner.stop(),
                                                );
                                            if (lifecycleFiber)
                                                await Effect.runPromise(
                                                    Fiber.interrupt(
                                                        lifecycleFiber,
                                                    ),
                                                );
                                        },
                                        cleanup: async () => {
                                            // For Web, owner.stop has already confirmed termination.
                                            released();
                                            await binding?.cleanup(
                                                external
                                                    ? "external_connection_lost"
                                                    : collaborationError
                                                      ? "collaboration_lost"
                                                      : "execution_stopped",
                                            );
                                        },
                                    };
                                },
                            }),
                        catch: (error) => error,
                    });
                    terminalId =
                        daemon.services.runtimes.get(runtimeId!)?.terminalId ??
                        undefined;
                    if (
                        isEnded() ||
                        !daemon.services.runtimes.get(runtimeId!)
                            ?.collaborationActive
                    ) {
                        yield* release;
                        return;
                    }
                    let connection: unknown;
                    if (external)
                        connection =
                            externalAgentRunSchema.parse(input).connection;
                    else {
                        execution = yield* Effect.uninterruptible(
                            adapter.createExecution({
                                own: (dispose) => owner!.own(dispose),
                                signal: owner!.signal,
                            }),
                        );
                        connection = execution.connection;
                    }
                    if (
                        isEnded() ||
                        !daemon.services.runtimes.get(runtimeId!)
                            ?.collaborationActive
                    ) {
                        yield* release;
                        return;
                    }
                    // Use the registry controls by creating the binding inside a captured controls callback.
                    binding = adapter.createBinding(
                        controlsForBinding!,
                        connection,
                    );
                    binding.onReleased = released;
                    binding.onReady = () => {
                        daemon.services.runtimes.ready(runtimeId!);
                        direct?.resolve();
                        logger.info(
                            { runtimeId, hostId, terminalId },
                            "Agent collaboration ready",
                        );
                        clearTimeoutEffect();
                        if (
                            !isEnded() &&
                            daemon.services.runtimes.get(runtimeId!)
                                ?.collaborationActive
                        ) {
                            if (external) send({ type: "ready" });
                        }
                    };
                    reportToken = randomBytes(32).toString("base64url");
                    reports.set(reportToken, {
                        runtimeId: registration.runtimeId,
                        binding,
                    });
                    logger.info(
                        { runtimeId, hostId, terminalId },
                        "Agent execution preparing",
                    );
                    const launch = yield* Effect.tryPromise({
                        try: () =>
                            binding!.prepare({
                                executionOwnership: external
                                    ? "external"
                                    : "daemon",
                                args: input.args,
                                cwd: input.cwd,
                                env: input.env,
                                mcpUrl:
                                    networkId === null
                                        ? null
                                        : registration.mcpUrl,
                                mcpToken: registration.token,
                                reportUrl: `http://127.0.0.1:${daemon.ports.daemon}/api/agent-hooks`,
                                reportToken: reportToken!,
                                instruction: [
                                    collaborationInstruction,
                                    input.instruction,
                                ]
                                    .filter(Boolean)
                                    .join("\n\n"),
                            }),
                        catch: (error) => error,
                    });
                    if (
                        isEnded() ||
                        !daemon.services.runtimes.get(runtimeId!)
                            ?.collaborationActive
                    )
                        return;
                    lifecycle.send({ type: "PREPARED" });
                    if (external) {
                        socket?.on("message", (data, isBinary) => {
                            if (isEnded()) return;
                            let payload: unknown;
                            try {
                                payload = isBinary
                                    ? undefined
                                    : JSON.parse(data.toString());
                            } catch {}
                            const frame =
                                externalAgentClientFrameSchema.safeParse(
                                    payload,
                                );
                            if (
                                !frame.success ||
                                (frame.data.type === "started" &&
                                    !lifecycleSnapshot().can({
                                        type: "STARTED",
                                    }))
                            ) {
                                Effect.runFork(
                                    finish(
                                        "Invalid external agent lifecycle frame.",
                                        undefined,
                                        "invalid_lifecycle",
                                    ),
                                );
                                return;
                            }
                            if (frame.data.type === "started") {
                                lifecycle.send({ type: "STARTED" });
                                binding!.executionStarted();
                            } else Effect.runFork(processExited(frame.data));
                        });
                        send({ type: "prepared", launch });
                    } else {
                        foreground = yield* execution!.start(launch, owner!);
                        if (isEnded()) {
                            yield* owner!.stop();
                            return;
                        }
                        lifecycle.send({ type: "STARTED" });
                        binding.executionStarted();
                        socket?.on("message", (data, isBinary) => {
                            if (isEnded() || isRelayDisconnected()) return;
                            if (isBinary && daemon.acceptingInput)
                                foreground!.write(
                                    Array.isArray(data)
                                        ? Buffer.concat(data)
                                        : Buffer.isBuffer(data)
                                          ? data
                                          : Buffer.from(data),
                                );
                            else
                                try {
                                    const resize = decodeResize(
                                        JSON.parse(data.toString()),
                                    );
                                    foreground!.resize(
                                        resize.cols,
                                        resize.rows,
                                    );
                                } catch {}
                        });
                    }
                    socket?.resume();
                    timeoutAfter(60_000, () => {
                        if (
                            !daemon.services.runtimes.get(runtimeId!)
                                ?.collaborationActive
                        ) {
                            if (!collaborationError) released();
                            return Effect.void;
                        }
                        return !binding!.wasReady
                            ? finish(
                                  "Vendor collaboration did not become ready within 60 seconds. Check vendor startup and settings.",
                                  undefined,
                                  "preparation_timeout",
                              )
                            : Effect.void;
                    });
                }).pipe(
                    Effect.catch((error) =>
                        Effect.sync(() => {
                            Effect.runFork(
                                finish(
                                    error instanceof Error
                                        ? error.message
                                        : "Cannot start agent.",
                                ),
                            );
                        }),
                    ),
                    Effect.catchDefect((defect) =>
                        Effect.sync(() => {
                            const error =
                                defect instanceof Error
                                    ? defect
                                    : new Error(String(defect));
                            Effect.runFork(finish(error.message));
                        }),
                    ),
                ),
            );
        };
        if (direct) begin(JSON.stringify(direct.input), false);
        else socket!.once("message", begin);
    }
}
