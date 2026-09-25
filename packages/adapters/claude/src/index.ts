import type { VendorAdapter } from "@aiox/vendor";
import { Effect, Schema } from "effect";

import { ClaudeBinding } from "@/claude";
import { createClaudeInbox } from "@/claude-environment";
import { probeClaude } from "@/claude-version";

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

const connectionSchema = strictStruct({
    inboxPath: Schema.String.check(
        Schema.isMinLength(1),
        Schema.makeFilter((value) =>
            value.includes("\0")
                ? { path: [], issue: "NUL is not allowed" }
                : undefined,
        ),
    ),
});
const commandSchema = strictStruct({
    file: Schema.Literal("claude"),
    args: Schema.mutableKey(Schema.Array(Schema.String)),
    cwd: Schema.String.check(Schema.isMinLength(1)),
    env: Schema.Record(Schema.String, Schema.String),
});

export const claudeAdapter: VendorAdapter = {
    id: "claude",
    createExecution(owner) {
        return Effect.gen(function* () {
            const inbox = yield* Effect.tryPromise({
                try: createClaudeInbox,
                catch: (error) => error,
            });
            yield* owner.own(() =>
                Effect.tryPromise({
                    try: inbox.dispose,
                    catch: (error) => error,
                }),
            );
            return {
                connection: { inboxPath: inbox.path },
                start(launch, executionOwner) {
                    return Effect.gen(function* () {
                        yield* Effect.sync(() =>
                            executionOwner.signal.throwIfAborted(),
                        );
                        const command =
                            yield* Schema.decodeUnknownEffect(commandSchema)(
                                launch,
                            );
                        yield* Effect.tryPromise({
                            try: () =>
                                probeClaude(
                                    command.file,
                                    command.env,
                                    command.cwd,
                                    executionOwner.signal,
                                ),
                            catch: (error) => error,
                        });
                        yield* Effect.sync(() =>
                            executionOwner.signal.throwIfAborted(),
                        );
                        return yield* executionOwner.foreground({
                            ...command,
                            args: [...command.args],
                            env: { ...command.env },
                        });
                    });
                },
            };
        });
    },
    createBinding(controls, connection) {
        const { inboxPath } =
            Schema.decodeUnknownSync(connectionSchema)(connection);
        return new ClaudeBinding(controls, inboxPath);
    },
};
