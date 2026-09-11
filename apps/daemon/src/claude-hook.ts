import type { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const FAILURE = "AIOX hook report failed.";
const TIMEOUT_MS = 5000;
const MAX_INPUT_BYTES = 1024 * 1024;

/** Exec-form hooks bypass platform shell parsing entirely. */
export function claudeHookCommand(executablePath: string, scriptPath: string) {
    return {
        type: "command" as const,
        command: executablePath,
        args: [scriptPath],
    };
}

/** No stdout, retry, vendor decision, or credential-bearing error output. */
export async function reportClaudeHook(
    input: Readable = process.stdin,
    env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
        controller.abort();
        if (!input.readableEnded) input.destroy(new Error(FAILURE));
    }, TIMEOUT_MS);
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
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += buffer.length;
            if (size > MAX_INPUT_BYTES) throw new Error(FAILURE);
            chunks.push(buffer);
        }
        const event: unknown = JSON.parse(
            Buffer.concat(chunks).toString("utf8"),
        );
        if (!event || typeof event !== "object" || Array.isArray(event)) {
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
                inboxPath: env.CLAUDE_CODE_MESSAGING_SOCKET,
                inboxToken: env.CLAUDE_CODE_MESSAGING_TOKEN,
            }),
            redirect: "error",
            signal: controller.signal,
        });
        await response.body?.cancel();
        if (!response.ok) throw new Error(FAILURE);
    } catch {
        throw new Error(FAILURE);
    } finally {
        clearTimeout(timer);
    }
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    reportClaudeHook().catch(() => {
        process.stderr.write(`${FAILURE}\n`);
        process.exitCode = 1;
    });
}
