import { connect } from "node:net";

import { Effect } from "effect";

/** Completion proves a socket write only; hooks observe model receipt separately. */
export async function writeClaudeInbox(
    path: string,
    token: string,
    content?: string,
): Promise<void> {
    if (!token) throw new Error("Claude inbox credential is missing.");
    const auth = `${JSON.stringify({ type: "auth", token })}\n`;
    const body =
        content === undefined
            ? ""
            : `${JSON.stringify({
                  type: "user",
                  message: { role: "user", content },
              })}\n`;
    await Effect.runPromise(
        Effect.callback<void, Error>((resume) => {
            let socket;
            try {
                socket = connect(path);
            } catch (error) {
                resume(Effect.fail(new Error(failure("connection", error))));
                return;
            }
            let finished = false;
            const finish = (error?: string) => {
                if (finished) return;
                finished = true;
                socket.destroy();
                resume(error ? Effect.fail(new Error(error)) : Effect.void);
            };
            socket.once("error", (error) =>
                finish(failure("connection", error)),
            );
            socket.once("close", () =>
                finish("Claude inbox closed before write completion."),
            );
            socket.once("connect", () => {
                try {
                    socket.write(auth + body, (error) =>
                        finish(error ? failure("write", error) : undefined),
                    );
                } catch (error) {
                    finish(failure("write", error));
                }
            });
            return Effect.sync(() => {
                if (!finished) {
                    finished = true;
                    socket.destroy();
                }
            });
        }).pipe(
            Effect.timeoutOrElse({
                duration: 2000,
                orElse: () =>
                    Effect.fail(
                        new Error("Claude inbox connection timed out."),
                    ),
            }),
        ),
    );
}

function failure(operation: string, error: unknown): string {
    const code =
        error instanceof Error &&
        "code" in error &&
        typeof error.code === "string" &&
        /^E[A-Z0-9]+$/.test(error.code)
            ? ` (${error.code})`
            : "";
    return `Claude inbox ${operation} failed${code}.`;
}
