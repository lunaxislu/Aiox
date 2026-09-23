import {
    operationSchema,
    webSnapshotSchema,
    webStateSchema,
    webFaultSchema,
    type Operation,
} from "@aiox/protocol";

/** Subscribe after admission: the initial snapshot also covers an already finished operation. */
export async function waitForHostOperation(
    url: string,
    initial: Operation,
    onUpdate?: (operation: Operation) => void,
): Promise<Operation> {
    if (initial.state !== "running") return initial;
    const controller = new AbortController();
    const connectTimeout = setTimeout(
        () => controller.abort(new Error("State stream connection timed out.")),
        15000,
    );
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
        const response = await fetch(`${url}/api/web/events`, {
            signal: controller.signal,
        });
        clearTimeout(connectTimeout);
        if (!response.ok || !response.body)
            throw new Error(`State stream responded ${response.status}`);
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
            const { value, done } = await reader.read();
            if (done) throw new Error("Daemon state stream disconnected.");
            buffer += decoder
                .decode(value, { stream: true })
                .replaceAll("\r", "");
            let end: number;
            while ((end = buffer.indexOf("\n\n")) !== -1) {
                const frame = buffer.slice(0, end);
                buffer = buffer.slice(end + 2);
                const lines = frame.split("\n");
                const event = lines
                    .find((l) => l.startsWith("event:"))
                    ?.slice(6)
                    .trim();
                const data = lines
                    .filter((l) => l.startsWith("data:"))
                    .map((l) => l.slice(5).trimStart())
                    .join("\n");
                if (!data) continue;
                if (event === "fault")
                    throw new Error(
                        webFaultSchema.parse(JSON.parse(data)).message,
                    );
                const candidates =
                    event === "snapshot"
                        ? webSnapshotSchema.parse(JSON.parse(data)).operations
                        : event === "state"
                          ? webStateSchema
                                .parse(JSON.parse(data))
                                .changes.flatMap((c) =>
                                    c.resource === "operation" &&
                                    c.action === "upsert"
                                        ? [c.value]
                                        : [],
                                )
                          : [];
                const operation = candidates.find((o) => o.id === initial.id);
                if (operation) onUpdate?.(operation);
                if (operation && operation.state !== "running")
                    return operationSchema.parse(operation);
            }
        }
    } finally {
        clearTimeout(connectTimeout);
        controller.abort();
        await reader?.cancel().catch(() => {});
    }
}

export function hostOperationResult(operation: Operation): string {
    const targets = operation.targets.map(
        (t) =>
            `${t.agentKey ?? t.terminalId}: ${t.state}${operation.kind === "host.agent.start" && t.state === "unchanged" ? " (already running)" : ""}${t.error ? ` — ${t.error.message} [${t.error.stage}/${t.error.code}]` : ""}`,
    );
    const result = [
        `${operation.kind.replaceAll(".", " ").replace(/^host/, "Host")} ${operation.state} (operationId=${operation.id}, requestId=${operation.requestId})`,
        ...targets,
        ...(operation.error ? [operation.error.message] : []),
        ...operation.cleanupErrors.map((e) => `Cleanup: ${e.message}`),
    ].join("\n");
    if (operation.state !== "succeeded") throw new Error(result);
    return result;
}
