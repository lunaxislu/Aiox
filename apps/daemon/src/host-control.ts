import { createHash } from "node:crypto";

import { loadConfig } from "@aiox/config";
import { hostControlRequestSchema } from "@aiox/protocol";

import { allTargets, commandError, type HostOutcome } from "./host-command";
import type { HttpEnv } from "./http";
import { HttpError, parse, readJson } from "./http";
import type { Context } from "./http-endpoint";
import type { DaemonServices } from "./services";

/** Host stop/delete succeed only after actual termination and, for delete, its commit. */
export async function handleHostControl(
    c: Context<HttpEnv>,
    services: DaemonServices,
    remove: boolean,
): Promise<Response> {
    await loadConfig(services.configLocation);
    const input = parse(hostControlRequestSchema, await readJson(c.req.raw));
    const hash = createHash("sha256")
        .update(JSON.stringify([c.req.method, c.req.path, input]))
        .digest("hex");
    return services.hostCommands.respond(
        c,
        {
            requestId: input.requestId,
            hash,
            command: remove ? "host.delete" : "host.stop",
        },
        () => admitHostControl(services, input, remove, c.req.param("hostId")),
    );
}

export async function admitHostControl(
    services: DaemonServices,
    input: import("@aiox/protocol").HostControlRequest,
    remove: boolean,
    hostId: string,
): Promise<import("./host-command").AdmittedHostCommand> {
    await loadConfig(services.configLocation);

    if (!services.lifecycle.acceptingInput())
        throw new HttpError(503, "shutting_down", "Daemon stopping.");
    const host = await services.db.hostState.getHost(hostId);
    if (!host)
        throw new HttpError(404, "unknown_host", "No such Host.", {
            stage: "cli",
        });
    return {
        hostId: host.id,
        agents: "all",
        execute: async (): Promise<HostOutcome> => {
            if (!remove) {
                const stopped = await allTargets(host.agents, async (agent) => {
                    const runtime = services.runtimes
                        .list()
                        .find(
                            (r) => r.hostId === host.id && r.name === agent.key,
                        );
                    const base = {
                        agentKey: agent.key,
                        terminalId: runtime?.terminalId ?? null,
                    };
                    try {
                        if (runtime)
                            await services.lifecycle.stopRuntime(runtime.id);
                        return {
                            target: {
                                ...base,
                                state: "stopped",
                                error: null,
                            },
                            cleanupErrors: [],
                        };
                    } catch (error) {
                        return {
                            target: {
                                ...base,
                                state: "failed",
                                error: commandError(
                                    error,
                                    "cleanup",
                                    agent.key,
                                ),
                            },
                            cleanupErrors: [],
                        };
                    }
                });
                return { hostId: host.id, ...stopped };
            }
            // Every terminal of the panel, including shells that joined meanwhile.
            const panel = await services.db.hostState.getPanel(host.panelId);
            const stopped = await allTargets(panel?.tabs ?? [], async (tab) => {
                const base = {
                    agentKey: tab.agentKey,
                    terminalId: tab.terminalId,
                };
                try {
                    if (tab.terminalId) {
                        await services.lifecycle.stopTerminal(tab.terminalId);
                        if (services.terminals.view(tab.terminalId)?.alive)
                            throw new Error(
                                "Shell termination is not confirmed.",
                            );
                    }
                    return {
                        target: {
                            ...base,
                            state: "stopped",
                            error: null,
                        },
                        cleanupErrors: [],
                    };
                } catch (error) {
                    return {
                        target: {
                            ...base,
                            state: "failed",
                            error: commandError(
                                error,
                                "cleanup",
                                tab.agentKey ?? undefined,
                            ),
                        },
                        cleanupErrors: [],
                    };
                }
            });
            // A failed stop keeps the Host and its panel for a retry.
            if (stopped.targets.some((t) => t.state === "failed"))
                return { hostId: host.id, ...stopped };
            try {
                await services.db.hostState.deleteHost(host.id);
            } catch (error) {
                return {
                    hostId: host.id,
                    ...stopped,
                    error: commandError(error, "storage"),
                };
            } finally {
                await services.appState.update(
                    { host: host.id },
                    { panel: host.panelId },
                );
            }
            return { hostId: host.id, ...stopped };
        },
    };
}
