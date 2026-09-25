import type { Readable } from "node:stream";

import { Effect } from "effect";

const FAILURE = "AIOX hook report failed.";
const TIMEOUT_MS = 30_000;
const MAX_INPUT_BYTES = 1024 * 1024;

/** Exec-form hooks bypass platform shell parsing entirely. */
export function claudeHookCommand(executablePath: string, scriptPath: string) {
    return {
        type: "command" as const,
        command: executablePath,
        args: [scriptPath],
    };
}

/** Reports observations without returning vendor decisions or watch registrations. */
export async function reportClaudeHook(
    input: Readable = process.stdin,
    env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
    return Effect.runPromise(
        Effect.tryPromise({
            try: async (signal) => {
                const abort = () => {
                    if (!input.readableEnded) input.destroy(new Error(FAILURE));
                };
                signal.addEventListener("abort", abort, { once: true });
                try {
                    const url = new URL(env.AIOX_HOOK_URL ?? "");
                    if (
                        url.protocol !== "http:" ||
                        url.hostname !== "127.0.0.1" ||
                        url.username ||
                        url.password ||
                        !env.AIOX_HOOK_TOKEN
                    )
                        throw new Error(FAILURE);
                    const chunks: Buffer[] = [];
                    let size = 0;
                    for await (const chunk of input) {
                        const buffer = Buffer.isBuffer(chunk)
                            ? chunk
                            : Buffer.from(chunk);
                        size += buffer.length;
                        if (size > MAX_INPUT_BYTES) throw new Error(FAILURE);
                        chunks.push(buffer);
                    }
                    const event: unknown = JSON.parse(
                        Buffer.concat(chunks).toString("utf8"),
                    );
                    if (
                        !event ||
                        typeof event !== "object" ||
                        Array.isArray(event)
                    ) {
                        throw new Error(FAILURE);
                    }
                    const response = await fetch(url, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${env.AIOX_HOOK_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            event,
                            ppid: process.ppid,
                            inboxPath: env.CLAUDE_CODE_MESSAGING_SOCKET,
                            inboxToken: env.CLAUDE_CODE_MESSAGING_TOKEN,
                        }),
                        redirect: "error",
                        signal,
                    }).catch((error: unknown) => {
                        if (
                            env.AIOX_EXECUTION_OWNERSHIP === "external" &&
                            error instanceof TypeError &&
                            typeof error.cause === "object" &&
                            error.cause !== null &&
                            "code" in error.cause &&
                            error.cause.code === "ECONNREFUSED"
                        )
                            return null;
                        throw error;
                    });
                    if (response === null) return;
                    if (!response.ok) {
                        await response.body?.cancel();
                        throw new Error(FAILURE);
                    }
                    await response.body?.cancel();
                } finally {
                    signal.removeEventListener("abort", abort);
                }
            },
            catch: () => new Error(FAILURE),
        }).pipe(
            Effect.timeoutOrElse({
                duration: TIMEOUT_MS,
                orElse: () => Effect.fail(new Error(FAILURE)),
            }),
        ),
    );
}
