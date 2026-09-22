import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import { loadConfig } from "@aiox/config";
import {
    hostControlRequestSchema,
    type Operation,
    type OperationError,
} from "@aiox/protocol";

import { HttpError, parse, readJson, send } from "./http";
import type { DaemonServices } from "./services";

export async function handleHostControl(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
    services: DaemonServices,
): Promise<boolean> {
    const match = /^\/api\/hosts\/([^/]+)(\/stop)?$/.exec(url.pathname);
    if (
        !match ||
        !(match[2] ? request.method === "POST" : request.method === "DELETE")
    )
        return false;
    await loadConfig(services.configLocation);
    const input = parse(hostControlRequestSchema, await readJson(request));
    const hash = createHash("sha256")
        .update(JSON.stringify([request.method, url.pathname, input]))
        .digest("hex");
    const previous = await services.db.hostState.getOperation(
        input.requestId,
        hash,
    );
    if (previous) {
        send(response, 202, previous);
        return true;
    }
    if (!services.lifecycle.acceptingInput())
        throw new HttpError(503, "shutting_down", "Daemon stopping.");
    const state = await services.db.hostState.snapshot();
    const host = state.hosts.find(
        (h) => h.id === decodeURIComponent(match[1]!),
    );
    if (!host)
        throw new HttpError(404, "unknown_host", "No such Host.", {
            stage: "cli",
        });
    const panel = state.panels.find((p) => p.id === host.panelId)!;
    const remove = !match[2];
    const operation: Operation = {
        id: randomUUID(),
        requestId: input.requestId,
        kind: remove ? "host.delete" : "host.stop",
        hostId: host.id,
        panelId: panel.id,
        state: "running",
        targets: remove
            ? panel.tabs.map((t) => ({
                  agentKey: t.agentKey,
                  terminalId: t.terminalId,
                  state: "pending",
                  error: null,
              }))
            : host.agents.map((a) => ({
                  agentKey: a.key,
                  terminalId: null,
                  state: "pending",
                  error: null,
              })),
        error: null,
        cleanupErrors: [],
        createdAt: Date.now(),
        finishedAt: null,
    };
    const admitted = await services.db.hostState.saveOperation(operation, hash);
    services.webEvents.notify();
    send(response, 202, admitted);
    if (admitted.id !== operation.id) return true;
    const task = new Promise<void>((resolve) => setImmediate(resolve)).then(
        execute,
    );
    services.operationTasks.add(task);
    void task.finally(() => services.operationTasks.delete(task));
    return true;

    async function execute() {
        let stage: OperationError["stage"] = "execution";
        const persist = async () => {
            const previousStage = stage;
            stage = "storage";
            await services.db.hostState.saveOperation(operation, hash);
            stage = previousStage;
            services.webEvents.notify();
        };
        try {
            for (const target of operation.targets) {
                target.state = "stopping";
                await persist();
                if (remove) {
                    if (target.terminalId) {
                        await services.lifecycle.stopTerminal(
                            target.terminalId,
                        );
                        if (services.terminals.view(target.terminalId)?.alive)
                            throw new Error(
                                "Shell termination is not confirmed.",
                            );
                    }
                } else {
                    const runtime = services.runtimes
                        .list()
                        .find(
                            (r) =>
                                r.hostId === host!.id &&
                                r.name === target.agentKey,
                        );
                    target.terminalId = runtime?.terminalId ?? null;
                    if (runtime)
                        await services.lifecycle.stopRuntime(runtime.id);
                }
                target.state = "stopped";
                await persist();
            }
            if (remove) {
                stage = "storage";
                const latest = (
                    await services.db.hostState.snapshot()
                ).panels.find((p) => p.id === panel.id)!;
                // Shell-less failed-start tabs also belong to this deletion.
                const originalIds = new Set(panel.tabs.map((t) => t.id));
                if (latest.tabs.some((t) => !originalIds.has(t.id)))
                    throw new HttpError(
                        409,
                        "revision_conflict",
                        "Host gained tabs during termination.",
                    );
                await services.db.hostState.deleteHost(
                    host!.id,
                    latest.revision,
                );
            }
            operation.state = "succeeded";
        } catch (error) {
            const failure: OperationError = {
                code:
                    error instanceof HttpError
                        ? error.code
                        : stage === "storage"
                          ? "storage_error"
                          : "execution_failed",
                message: error instanceof Error ? error.message : String(error),
                stage,
            };
            operation.error = failure;
            operation.state = "failed";
            if (operation.targets.some((t) => t.state === "stopping"))
                operation.cleanupErrors.push({ ...failure, stage: "cleanup" });
            operation.targets = operation.targets.map((t) =>
                t.state === "stopped"
                    ? t
                    : { ...t, state: "failed", error: failure },
            );
        }
        operation.finishedAt = Date.now();
        try {
            await persist();
        } catch (error) {
            services.webEvents.fault("storage_error", String(error));
        }
    }
}
