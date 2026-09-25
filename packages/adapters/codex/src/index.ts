import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { promisify, stripVTControlCharacters } from "node:util";

import { logger } from "@aiox/diagnostics";
import type {
    ExecutionExit,
    ExecutionContext,
    ExecutionProcess,
    VendorAdapter,
} from "@aiox/vendor";
import {
    Deferred,
    Duration,
    Effect,
    Exit,
    Fiber,
    Schema,
    Stream,
} from "effect";

import { CodexBinding, connectionSchema } from "@/binding";
import { createRelay } from "@/relay";

const strictStruct = <const Fields extends Schema.Struct.Fields>(
    fields: Fields,
) =>
    Schema.Struct(fields).check(
        Schema.makeFilter((value) => {
            const extra = Object.keys(value).find(
                (key) => !Object.hasOwn(fields, key),
            );
            return extra === undefined
                ? undefined
                : { path: [extra], issue: "Unexpected key" };
        }),
    );

const commandSchema = strictStruct({
    file: Schema.Literal("codex"),
    args: Schema.Array(Schema.String),
    cwd: Schema.String.check(Schema.isMinLength(1)),
    env: Schema.Record(Schema.String, Schema.String),
});
const launchSchema = strictStruct({
    instruction: Schema.String,
    server: commandSchema,
    tui: commandSchema,
});

export const codexAdapter: VendorAdapter = {
    id: "codex",
    createExecution(owner) {
        return Effect.gen(function* () {
            yield* Effect.sync(() => owner.signal.throwIfAborted());
            const relay = yield* Effect.tryPromise({
                try: createRelay,
                catch: (error) => error,
            });
            yield* owner.own(() =>
                Effect.tryPromise({
                    try: () => relay.close(),
                    catch: (error) => error,
                }),
            );
            return {
                connection: relay.connection,
                start(value, executionOwner) {
                    return Effect.gen(function* () {
                        yield* Effect.sync(() =>
                            executionOwner.signal.throwIfAborted(),
                        );
                        const launch = yield* Schema.decodeUnknownEffect(
                            launchSchema,
                            {
                                onExcessProperty: "error",
                            },
                        )(value);
                        const preflight = yield* Effect.exit(
                            Effect.tryPromise({
                                try: () =>
                                    promisify(execFile)("codex", ["--help"], {
                                        cwd: launch.tui.cwd,
                                        env: launch.tui.env,
                                        timeout: 10_000,
                                        signal: executionOwner.signal,
                                    }),
                                catch: (error) => error,
                            }),
                        );
                        if (
                            Exit.isFailure(preflight) ||
                            !preflight.value.stdout.includes(
                                "--remote-auth-token-env",
                            )
                        ) {
                            yield* Effect.sync(() =>
                                executionOwner.signal.throwIfAborted(),
                            );
                            return yield* Effect.fail(
                                new Error(
                                    "Codex with --remote and --remote-auth-token-env support is required. Check installation and PATH.",
                                ),
                            );
                        }
                        yield* Effect.sync(() =>
                            executionOwner.signal.throwIfAborted(),
                        );
                        const token = randomBytes(32).toString("base64url");
                        const server = yield* executionOwner.background({
                            ...launch.server,
                            args: [
                                ...launch.server.args,
                                "--listen",
                                "ws://127.0.0.1:0",
                                "--ws-auth",
                                "capability-token",
                                "--ws-token-sha256",
                                createHash("sha256")
                                    .update(token)
                                    .digest("hex"),
                            ],
                        });
                        let diagnostic = "";
                        const secrets = [
                            token,
                            relay.connection.token,
                            relay.tuiToken,
                            launch.server.env.AIOX_MCP_TOKEN,
                        ].filter((value): value is string => Boolean(value));
                        const sanitize = (value: string) =>
                            stripVTControlCharacters(
                                secrets.reduce(
                                    (result, secret) =>
                                        result.split(secret).join("[redacted]"),
                                    value,
                                ),
                            );
                        let serverExit: ExecutionExit | undefined;
                        let foreground: ExecutionProcess | undefined;
                        const monitor = Effect.gen(function* () {
                            const exit = yield* server.exited;
                            serverExit = exit;
                            if (executionOwner.signal.aborted) return;
                            const reason = `Codex App Server exited (${exit.exitCode}). ${sanitize(diagnostic).slice(-2000)}`;
                            relay.fail(reason);
                            logger.error(
                                {
                                    component: "codex",
                                    exitCode: exit.exitCode,
                                    signal: exit.signal,
                                },
                                "Codex App Server exited",
                            );
                            if (foreground) {
                                const stopped = yield* Effect.exit(
                                    foreground.stop(),
                                );
                                if (Exit.isFailure(stopped))
                                    relay.fail(
                                        "Codex TUI termination after App Server failure is unconfirmed.",
                                    );
                            }
                        });
                        const monitorFiber = Effect.runFork(monitor);
                        yield* executionOwner.own(() =>
                            Fiber.interrupt(monitorFiber).pipe(Effect.asVoid),
                        );

                        const url = yield* awaitServerUrl(
                            server,
                            executionOwner,
                            executionOwner.signal,
                            sanitize,
                            (value) => {
                                diagnostic = value;
                            },
                        );
                        if (serverExit)
                            return yield* Effect.fail(
                                new Error(
                                    "Codex App Server exited before TUI launch.",
                                ),
                            );
                        yield* Effect.sync(() =>
                            executionOwner.signal.throwIfAborted(),
                        );
                        relay.setUpstream(url, token, launch.instruction);
                        foreground = yield* executionOwner.foreground({
                            ...launch.tui,
                            args: [
                                "--remote",
                                relay.connection.url,
                                "--remote-auth-token-env",
                                "AIOX_CODEX_RELAY_TOKEN",
                                ...launch.tui.args,
                            ],
                            env: {
                                ...launch.tui.env,
                                AIOX_CODEX_RELAY_TOKEN: relay.tuiToken,
                            },
                        });
                        if (serverExit) yield* foreground.stop();
                        return foreground;
                    });
                },
            };
        });
    },
    createBinding(controls, connection) {
        return new CodexBinding(
            controls,
            Schema.decodeUnknownSync(connectionSchema, {
                onExcessProperty: "error",
            })(connection),
        );
    },
};

function awaitServerUrl(
    server: ExecutionProcess,
    owner: ExecutionContext,
    signal: AbortSignal,
    sanitize: (value: string) => string,
    saveDiagnostic: (value: string) => void,
): Effect.Effect<string, unknown> {
    if (!server.stderr)
        return Effect.fail(
            new Error("Codex App Server stderr is unavailable."),
        );
    const diagnostic = { value: "" };
    const ready = Deferred.makeUnsafe<string, unknown>();
    const drain = Stream.fromReadableStream({
        evaluate: () =>
            Readable.toWeb(server.stderr!) as ReadableStream<Uint8Array>,
        onError: (error) => error,
    }).pipe(
        Stream.runForEach((chunk) => {
            diagnostic.value = (
                diagnostic.value + Buffer.from(chunk).toString()
            ).slice(-16_384);
            saveDiagnostic(diagnostic.value);
            const found = diagnostic.value.match(
                /listening on: (ws:\/\/127\.0\.0\.1:[1-9][0-9]*)[\r\n]/,
            );
            return found ? Deferred.succeed(ready, found[1]!) : Effect.void;
        }),
        Effect.andThen(() =>
            Deferred.fail(
                ready,
                new Error(
                    `Codex App Server failed before readiness. ${sanitize(diagnostic.value).slice(-2000)}`,
                ),
            ),
        ),
        Effect.catch((error) => Deferred.fail(ready, error)),
    );
    server.stdout?.resume();

    const urlResult = Deferred.await(ready).pipe(
        Effect.map((url) => ({ tag: "url" as const, url })),
    );
    const exitResult = server.exited.pipe(
        Effect.map((exit) => ({ tag: "exit" as const, exit })),
    );
    const timeoutResult = Effect.clockWith((clock) =>
        clock
            .sleep(Duration.millis(15_000))
            .pipe(Effect.as({ tag: "timeout" as const })),
    );
    const abortResult = Effect.callback<{ tag: "aborted" }, never>((resume) => {
        const aborted = () =>
            resume(Effect.succeed({ tag: "aborted" as const }));
        signal.addEventListener("abort", aborted, { once: true });
        if (signal.aborted) aborted();
        return Effect.sync(() => signal.removeEventListener("abort", aborted));
    });
    // Readiness completes once; diagnostics drain until the execution is released.
    return Effect.uninterruptible(
        Effect.gen(function* () {
            const reader = yield* Effect.forkDetach(drain);
            yield* owner.own(() => Fiber.interrupt(reader).pipe(Effect.asVoid));
        }),
    ).pipe(
        Effect.andThen(
            Effect.race(
                Effect.race(urlResult, exitResult),
                Effect.race(timeoutResult, abortResult),
            ),
        ),
        Effect.flatMap((result) => {
            switch (result.tag) {
                case "url":
                    return Effect.succeed(result.url);
                case "exit":
                    return Effect.fail(
                        new Error(
                            `Codex App Server failed before TUI launch (${result.exit.exitCode}). ${sanitize(diagnostic.value).slice(-2000)}`,
                        ),
                    );
                case "timeout":
                    return Effect.fail(
                        new Error(
                            `Codex App Server startup timed out. ${sanitize(diagnostic.value).slice(-2000)}`,
                        ),
                    );
                case "aborted":
                    return Effect.fail(new Error("Codex startup cancelled."));
            }
        }),
    );
}
