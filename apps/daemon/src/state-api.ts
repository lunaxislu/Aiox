import { randomUUID } from "node:crypto";

import { prepareHostInput } from "@aiox/config";
import {
    createPanelRequestSchema,
    renamePanelRequestSchema,
    putPanelLayoutRequestSchema,
    dismissPanelTabRequestSchema,
    panelViewSchema,
    hostResolveRequestSchema,
    type PanelView,
} from "@aiox/protocol";
import type { Hono } from "hono";

import { handleHostAgents, routeHostNetwork } from "./host-agents";
import { handleHostControl } from "./host-control";
import { handleHostRun } from "./host-run";
import type { HttpEnv } from "./http";
import { HttpError, parse, readJson } from "./http";
import { handlePanelOperation } from "./panel-operations";
import type { DaemonServices } from "./services";
import { projectHostState } from "./web-state";

export function registerStateApi(app: Hono<HttpEnv>, services: DaemonServices) {
    app.post("/api/hosts/run", (c) => handleHostRun(c, services, false));
    app.post("/api/hosts/restart", (c) => handleHostRun(c, services, true));
    app.post("/api/hosts/:hostId/stop", (c) =>
        handleHostControl(c, services, false),
    );
    app.delete("/api/hosts/:hostId", (c) =>
        handleHostControl(c, services, true),
    );
    app.post("/api/hosts/agents/start", (c) =>
        handleHostAgents(c, services, "start"),
    );
    app.post("/api/hosts/agents/restart", (c) =>
        handleHostAgents(c, services, "restart"),
    );
    app.post("/api/hosts/:hostId/agents/stop", (c) =>
        handleHostAgents(c, services, "stop"),
    );
    app.post("/api/hosts/:hostId/networks/:networkId/route", (c) =>
        routeHostNetwork(c, services),
    );
    app.post("/api/panels/:panelId/shells", (c) =>
        handlePanelOperation(c, services, true),
    );
    app.delete("/api/panels/:panelId", (c) =>
        handlePanelOperation(c, services, false),
    );
    app.delete("/api/panels/:panelId/tabs/:tabId", (c) =>
        handlePanelOperation(c, services, false),
    );
    app.post("/api/hosts/resolve", async (c) => {
        const input = parse(
            hostResolveRequestSchema,
            await readJson(c.req.raw),
        );
        const prepared = await prepareHostInput(input, services.configLocation);
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
        return c.json({ hostId: host.id }, 200);
    });
    app.get("/api/hosts", async (c) => {
        const state = projectHostState(
            await services.db.hostState.snapshot(),
            services,
        );
        const name = c.req.query("name") ?? null;
        return c.json(
            state.hosts.filter((h) => name === null || h.name === name),
            200,
        );
    });
    app.get("/api/hosts/:hostId", async (c) => {
        const state = projectHostState(
            await services.db.hostState.snapshot(),
            services,
        );
        const host = state.hosts.find((h) => h.id === c.req.param("hostId"));
        if (!host) throw new HttpError(404, "unknown_host", "No such Host.");
        return c.json(host);
    });
    app.get("/api/hosts/:hostId/networks", async (c) => {
        const state = projectHostState(
            await services.db.hostState.snapshot(),
            services,
        );
        const host = state.hosts.find((h) => h.id === c.req.param("hostId"));
        if (!host) throw new HttpError(404, "unknown_host", "No such Host.");
        const name = c.req.query("name");
        return c.json(
            state.networks.filter(
                (n) =>
                    n.hostId === host.id &&
                    (name === undefined || n.name === name),
            ),
        );
    });
    app.get("/api/hosts/:hostId/networks/:networkId", async (c) => {
        const state = projectHostState(
            await services.db.hostState.snapshot(),
            services,
        );
        const host = state.hosts.find((h) => h.id === c.req.param("hostId"));
        if (!host) throw new HttpError(404, "unknown_host", "No such Host.");
        const network = state.networks.find(
            (n) => n.hostId === host.id && n.id === c.req.param("networkId"),
        );
        if (!network)
            throw new HttpError(
                404,
                "unknown_network",
                "No such Host Network.",
            );
        return c.json(network);
    });
    app.get("/api/operations", async (c) => {
        const state = projectHostState(
            await services.db.hostState.snapshot(),
            services,
        );
        const requestId = c.req.query("requestId") ?? null;
        return c.json(
            state.operations.filter(
                (o) => requestId === null || o.requestId === requestId,
            ),
            200,
        );
    });
    app.get("/api/operations/:operationId", async (c) => {
        const state = projectHostState(
            await services.db.hostState.snapshot(),
            services,
        );
        const operation = state.operations.find(
            (o) => o.id === c.req.param("operationId"),
        );
        if (!operation)
            throw new HttpError(404, "unknown_operation", "No such Operation.");
        return c.json(operation, 200);
    });
    app.get("/api/panels", async (c) => {
        const state = projectHostState(
            await services.db.hostState.snapshot(),
            services,
        );
        return c.json(state.panels, 200);
    });
    app.post("/api/panels", async (c) => {
        projectHostState(await services.db.hostState.snapshot(), services);
        const input = parse(
            createPanelRequestSchema,
            await readJson(c.req.raw),
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
        return c.json(panel, 201);
    });
    app.get("/api/panels/:panelId", async (c) => {
        const panel = await getPanel(c.req.param("panelId"));
        return c.json(panel);
    });
    app.put("/api/panels/:panelId/name", async (c) => {
        const panel = await getPanel(c.req.param("panelId"));
        let next: PanelView, revision: number;
        if (panel.kind !== "workspace")
            throw new HttpError(
                400,
                "invalid_request",
                "Only workspace panels can be renamed.",
            );
        const input = parse(
            renamePanelRequestSchema,
            await readJson(c.req.raw),
        );
        revision = input.revision;
        next = { ...panel, name: input.name, revision: revision + 1 };
        return c.json(await updatePanel(panel, next, revision));
    });
    app.put("/api/panels/:panelId/layout", async (c) => {
        const panel = await getPanel(c.req.param("panelId"));
        let next: PanelView, revision: number;
        const input = parse(
            putPanelLayoutRequestSchema,
            await readJson(c.req.raw),
        );
        revision = input.revision;
        next = parse(panelViewSchema, {
            ...panel,
            ...input,
            revision: revision + 1,
        });
        return c.json(await updatePanel(panel, next, revision));
    });
    app.post("/api/panels/:panelId/tabs/:tabId/dismiss", async (c) => {
        const panel = await getPanel(c.req.param("panelId"));
        let next: PanelView, revision: number;
        const input = parse(
            dismissPanelTabRequestSchema,
            await readJson(c.req.raw),
        );
        revision = input.revision;
        const tab = panel.tabs.find((t) => t.id === c.req.param("tabId"));
        if (!tab) throw new HttpError(404, "unknown_tab", "No such tab.");
        if (
            !tab.terminalId ||
            !services.terminals.view(tab.terminalId)?.alive ||
            !tab.notice ||
            !["stopped", "start-failed", "crashed"].includes(tab.presentation)
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
        return c.json(await updatePanel(panel, next, revision));
    });
    async function getPanel(id: string): Promise<PanelView> {
        const state = projectHostState(
            await services.db.hostState.snapshot(),
            services,
        );
        const panel = state.panels.find((p) => p.id === id);
        if (!panel) throw new HttpError(404, "unknown_panel", "No such panel.");
        return panel;
    }
    async function updatePanel(
        panel: PanelView,
        next: PanelView,
        revision: number,
    ): Promise<PanelView> {
        if (panel.revision !== revision)
            throw new HttpError(
                409,
                "revision_conflict",
                "Panel changed; reload its current layout.",
            );
        await services.db.hostState.updatePanel(next, revision);
        services.webEvents.notify();
        return next;
    }
}
