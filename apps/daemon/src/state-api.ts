import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import { prepareHostInput, HostInputError, ConfigError } from "@aiox/config";
import { HostStateError } from "@aiox/persistence";
import {
    createPanelRequestSchema,
    renamePanelRequestSchema,
    putPanelLayoutRequestSchema,
    dismissPanelTabRequestSchema,
    panelViewSchema,
    hostResolveRequestSchema,
    type PanelView,
} from "@aiox/protocol";

import { handleHostAgents } from "./host-agents";
import { handleHostControl } from "./host-control";
import { handleHostRun } from "./host-run";
import { HttpError, parse, readJson, send } from "./http";
import { handlePanelOperation } from "./panel-operations";
import type { DaemonServices } from "./services";
import { projectHostState } from "./web-state";

export async function handleStateApi(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
    services: DaemonServices,
): Promise<boolean> {
    const path = url.pathname,
        method = request.method ?? "GET";
    if (!/^\/api\/(panels|hosts|operations)(\/|$)/.test(path)) return false;
    try {
        if (await handleHostRun(request, response, url, services)) return true;
        if (await handleHostControl(request, response, url, services))
            return true;
        if (await handleHostAgents(request, response, url, services))
            return true;
        if (await handlePanelOperation(request, response, url, services))
            return true;
        if (path === "/api/hosts/resolve" && method === "POST") {
            const input = parse(
                hostResolveRequestSchema,
                await readJson(request),
            );
            const prepared = await prepareHostInput(
                input,
                services.configLocation,
            );
            const host = (await services.db.hostState.snapshot()).hosts.find(
                (h) => h.name === prepared.manifest!.host.name,
            );
            if (!host)
                throw new HttpError(
                    404,
                    "unknown_host",
                    "No Host matches the selected YAML.",
                    { stage: "cli" },
                );
            send(response, 200, { hostId: host.id });
            return true;
        }
        const state = projectHostState(
            await services.db.hostState.snapshot(),
            services,
        );
        if (path === "/api/hosts" && method === "GET") {
            const name = url.searchParams.get("name");
            send(
                response,
                200,
                state.hosts.filter((h) => name === null || h.name === name),
            );
            return true;
        }
        const hostMatch =
            /^\/api\/hosts\/([^/]+)(?:\/networks(?:\/([^/]+))?)?$/.exec(path);
        if (hostMatch && method === "GET") {
            const host = state.hosts.find(
                (h) => h.id === decodeURIComponent(hostMatch[1]!),
            );
            if (!host)
                throw new HttpError(404, "unknown_host", "No such Host.");
            if (path.endsWith(`/hosts/${hostMatch[1]}`))
                send(response, 200, host);
            else {
                const networks = state.networks.filter(
                    (n) => n.hostId === host.id,
                );
                if (hostMatch[2]) {
                    const network = networks.find(
                        (n) => n.id === decodeURIComponent(hostMatch[2]!),
                    );
                    if (!network)
                        throw new HttpError(
                            404,
                            "unknown_network",
                            "No such Host Network.",
                        );
                    send(response, 200, network);
                } else {
                    const name = url.searchParams.get("name");
                    send(
                        response,
                        200,
                        networks.filter(
                            (n) => name === null || n.name === name,
                        ),
                    );
                }
            }
            return true;
        }
        if (path === "/api/operations" && method === "GET") {
            const requestId = url.searchParams.get("requestId");
            send(
                response,
                200,
                state.operations.filter(
                    (o) => requestId === null || o.requestId === requestId,
                ),
            );
            return true;
        }
        const operationMatch = /^\/api\/operations\/([^/]+)$/.exec(path);
        if (operationMatch && method === "GET") {
            const operation = state.operations.find(
                (o) => o.id === decodeURIComponent(operationMatch[1]!),
            );
            if (!operation)
                throw new HttpError(
                    404,
                    "unknown_operation",
                    "No such Operation.",
                );
            send(response, 200, operation);
            return true;
        }
        if (path === "/api/panels") {
            if (method === "GET") {
                send(response, 200, state.panels);
                return true;
            }
            if (method === "POST") {
                const input = parse(
                    createPanelRequestSchema,
                    await readJson(request),
                );
                const paneId = randomUUID();
                const panel: PanelView = {
                    id: randomUUID(),
                    kind: "workspace",
                    section: input.section ?? "workspaces",
                    name: input.name,
                    hostId: null,
                    networkId: null,
                    revision: 1,
                    layout: {
                        type: "pane",
                        id: paneId,
                        tabIds: [],
                        selectedTabId: null,
                    },
                    activePaneId: paneId,
                    tabs: [],
                };
                await services.db.hostState.createPanel(panel);
                services.webEvents.notify();
                send(response, 201, panel);
                return true;
            }
        }
        const panelMatch =
            /^\/api\/panels\/([^/]+)(?:\/(name|layout)|\/tabs\/([^/]+)\/dismiss)?$/.exec(
                path,
            );
        if (!panelMatch) return false;
        const panel = state.panels.find(
            (p) => p.id === decodeURIComponent(panelMatch[1]!),
        );
        if (!panel) throw new HttpError(404, "unknown_panel", "No such panel.");
        if (method === "GET" && !panelMatch[2] && !panelMatch[3]) {
            send(response, 200, panel);
            return true;
        }
        let next: PanelView, revision: number;
        if (method === "PUT" && panelMatch[2] === "name") {
            if (panel.kind !== "workspace")
                throw new HttpError(
                    400,
                    "invalid_request",
                    "Only workspace panels can be renamed.",
                );
            const input = parse(
                renamePanelRequestSchema,
                await readJson(request),
            );
            revision = input.revision;
            next = { ...panel, name: input.name, revision: revision + 1 };
        } else if (method === "PUT" && panelMatch[2] === "layout") {
            const input = parse(
                putPanelLayoutRequestSchema,
                await readJson(request),
            );
            revision = input.revision;
            next = parse(panelViewSchema, {
                ...panel,
                ...input,
                revision: revision + 1,
            });
        } else if (method === "POST" && panelMatch[3]) {
            const input = parse(
                dismissPanelTabRequestSchema,
                await readJson(request),
            );
            revision = input.revision;
            const tab = panel.tabs.find(
                (t) => t.id === decodeURIComponent(panelMatch[3]!),
            );
            if (!tab) throw new HttpError(404, "unknown_tab", "No such tab.");
            if (
                !tab.terminalId ||
                !services.terminals.view(tab.terminalId)?.alive ||
                !tab.notice ||
                !["stopped", "start-failed", "crashed"].includes(
                    tab.presentation,
                )
            )
                throw new HttpError(
                    409,
                    "tab_state_conflict",
                    "This tab cannot return to a live shell.",
                );
            next = {
                ...panel,
                revision: revision + 1,
                tabs: panel.tabs.map((t) =>
                    t.id === tab.id
                        ? {
                              ...t,
                              agentKey: null,
                              runtimeId: null,
                              presentation: "shell",
                              notice: null,
                          }
                        : t,
                ),
            };
        } else return false;
        if (panel.revision !== revision)
            throw new HttpError(
                409,
                "revision_conflict",
                "Panel changed; reload its current layout.",
            );
        await services.db.hostState.updatePanel(next, revision);
        services.webEvents.notify();
        send(response, 200, next);
        return true;
    } catch (error) {
        if (error instanceof HttpError) throw error;
        if (error instanceof HostInputError)
            throw new HttpError(
                error.stage === "config" ? 500 : 400,
                error.stage === "yaml"
                    ? "invalid_yaml"
                    : error.stage === "config"
                      ? "invalid_config"
                      : "invalid_request",
                error.message,
                { stage: error.stage },
            );
        if (error instanceof ConfigError)
            throw new HttpError(500, "invalid_config", error.message, {
                stage: "config",
            });
        if (error instanceof HostStateError)
            throw new HttpError(
                error.code.startsWith("unknown_") ? 404 : 409,
                error.code,
                error.message,
                { stage: "storage" },
            );
        throw new HttpError(
            500,
            "storage_error",
            error instanceof Error ? error.message : String(error),
            { stage: "storage" },
        );
    }
}
