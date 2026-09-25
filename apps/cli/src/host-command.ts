import {
    hostCommandEventSchema,
    type HostCommandEvent,
    type HostCommandResult,
} from "@aiox/protocol";

/**
 * Sends a Host command and reads its NDJSON answer: requests to launch an Agent
 * in this CLI's own terminal, then the one final per-target result. A dropped
 * connection does not cancel the daemon's work.
 */
export async function runHostCommand(
    url: string,
    path: string,
    init: RequestInit,
    describe: (status: number, body: unknown, text: string) => string,
    onLaunch?: (event: Extract<HostCommandEvent, { type: "launch" }>) => void,
): Promise<HostCommandResult> {
    const controller = new AbortController();
    const connectTimeout = setTimeout(
        () => controller.abort(new Error("Host command connection timed out.")),
        15000,
    );
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
        let response: Response;
        try {
            response = await fetch(`${url}${path}`, {
                ...init,
                signal: controller.signal,
            });
        } catch (error) {
            throw new Error(
                `Cannot reach the AIOX daemon at ${url} (${error instanceof Error ? error.message : String(error)}). ` +
                    "Start it with 'aiox daemon start'.",
            );
        }
        clearTimeout(connectTimeout);
        if (!response.ok || !response.body) {
            const text = await response.text();
            let body: unknown;
            try {
                body = text === "" ? undefined : JSON.parse(text);
            } catch {
                body = undefined;
            }
            throw new Error(describe(response.status, body, text));
        }
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
            const { value, done } = await reader.read();
            if (done)
                throw new Error(
                    "The daemon connection closed before the Host command finished.",
                );
            buffer += decoder.decode(value, { stream: true });
            let end: number;
            while ((end = buffer.indexOf("\n")) !== -1) {
                const line = buffer.slice(0, end).trim();
                buffer = buffer.slice(end + 1);
                if (!line) continue;
                const event = hostCommandEventSchema.parse(JSON.parse(line));
                if (event.type === "result") return event.result;
                onLaunch?.(event);
            }
        }
    } finally {
        clearTimeout(connectTimeout);
        controller.abort();
        await reader?.cancel().catch(() => {});
    }
}

export function hostCommandOutput(result: HostCommandResult): string {
    const targets = result.targets.map(
        (t) =>
            `${t.agentKey ?? t.terminalId}: ${t.state}${result.command === "host.agent.start" && t.state === "unchanged" ? " (already running)" : ""}${t.error ? ` — ${t.error.message} [${t.error.stage}/${t.error.code}]` : ""}`,
    );
    const output = [
        `${result.command.replaceAll(".", " ").replace(/^host/, "Host")} ${result.state} (requestId=${result.requestId})`,
        ...targets,
        ...(result.error ? [result.error.message] : []),
        ...result.cleanupErrors.map((e) => `Cleanup: ${e.message}`),
    ].join("\n");
    if (result.state !== "succeeded") throw new Error(output);
    return output;
}
