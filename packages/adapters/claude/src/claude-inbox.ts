import { connect } from "node:net";

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
    await new Promise<void>((resolve, reject) => {
        let socket;
        try {
            socket = connect(path);
        } catch (error) {
            reject(new Error(failure("connection", error)));
            return;
        }
        let finished = false;
        const finish = (error?: string) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            socket.destroy();
            if (error) reject(new Error(error));
            else resolve();
        };
        const timer = setTimeout(
            () => finish("Claude inbox connection timed out."),
            2000,
        );
        socket.once("error", (error) => finish(failure("connection", error)));
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
    });
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
