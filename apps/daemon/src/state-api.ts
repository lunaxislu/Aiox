import { prepareHostInput } from "@aiox/config";
import { hostResolveRequestSchema, type HostNetworkView } from "@aiox/protocol";
import type * as HttpRouter from "effect/unstable/http/HttpRouter";

import { handleHostAgents, routeHostNetwork } from "./host-agents";
import { handleHostControl } from "./host-control";
import { handleHostRun } from "./host-run";
import { HttpError, parse, readJson } from "./http";
import { addEndpoint } from "./http-endpoint";
import type { DaemonServices } from "./services";
import { handleWebCommand } from "./web-commands";

/** Host and panel reads answer from the daemon's current state, never a storage scan. */
export function registerStateApi(
    app: HttpRouter.HttpRouter,
    services: DaemonServices,
) {
    addEndpoint(app, "POST", "/api/hosts/run", (c) =>
        handleHostRun(c, services, false),
    );
    addEndpoint(app, "POST", "/api/hosts/restart", (c) =>
        handleHostRun(c, services, true),
    );
    addEndpoint(app, "POST", "/api/hosts/:hostId/stop", (c) =>
        handleHostControl(c, services, false),
    );
    addEndpoint(app, "DELETE", "/api/hosts/:hostId", (c) =>
        handleHostControl(c, services, true),
    );
    addEndpoint(app, "POST", "/api/hosts/agents/start", (c) =>
        handleHostAgents(c, services, "start"),
    );
    addEndpoint(app, "POST", "/api/hosts/agents/restart", (c) =>
        handleHostAgents(c, services, "restart"),
    );
    addEndpoint(app, "POST", "/api/hosts/:hostId/agents/stop", (c) =>
        handleHostAgents(c, services, "stop"),
    );
    addEndpoint(
        app,
        "POST",
        "/api/hosts/:hostId/networks/:networkId/route",
        (c) => routeHostNetwork(c, services),
    );
    addEndpoint(app, "POST", "/api/web/commands", (c) =>
        handleWebCommand(c, services),
    );
    addEndpoint(app, "POST", "/api/hosts/resolve", async (c) => {
        const input = parse(
            hostResolveRequestSchema,
            await readJson(c.req.raw),
        );
        return c.json(await resolveHostInput(services, input), 200);
    });
    addEndpoint(app, "GET", "/api/hosts", async (c) => {
        const name = c.req.query("name") ?? null;
        return c.json(
            (await services.appState.current()).hosts.filter(
                (h) => name === null || h.name === name,
            ),
            200,
        );
    });
    addEndpoint(app, "GET", "/api/hosts/:hostId", async (c) => {
        await services.appState.current();
        const host = services.appState.view("host", c.req.param("hostId"));
        if (!host) throw new HttpError(404, "unknown_host", "No such Host.");
        return c.json(host);
    });
    const hostNetworks = async (hostId: string) => {
        await services.appState.current();
        if (!services.appState.view("host", hostId))
            throw new HttpError(404, "unknown_host", "No such Host.");
        return services.appState
            .snapshot()
            .networks.filter(
                (n): n is HostNetworkView =>
                    "hostId" in n && n.hostId === hostId,
            );
    };
    addEndpoint(app, "GET", "/api/hosts/:hostId/networks", async (c) => {
        const name = c.req.query("name");
        return c.json(
            (await hostNetworks(c.req.param("hostId"))).filter(
                (n) => name === undefined || n.name === name,
            ),
        );
    });
    addEndpoint(
        app,
        "GET",
        "/api/hosts/:hostId/networks/:networkId",
        async (c) => {
            const network = (await hostNetworks(c.req.param("hostId"))).find(
                (n) => n.id === c.req.param("networkId"),
            );
            if (!network)
                throw new HttpError(
                    404,
                    "unknown_network",
                    "No such Host Network.",
                );
            return c.json(network);
        },
    );
    addEndpoint(app, "GET", "/api/panels", async (c) =>
        c.json((await services.appState.current()).panels, 200),
    );
    addEndpoint(app, "GET", "/api/panels/:panelId", async (c) => {
        await services.appState.current();
        const panel = services.appState.view("panel", c.req.param("panelId"));
        if (!panel) throw new HttpError(404, "unknown_panel", "No such panel.");
        return c.json(panel);
    });
}

export async function resolveHostInput(
    services: DaemonServices,
    input: import("@aiox/protocol").HostResolveRequest,
) {
    const prepared = await prepareHostInput(input, services.configLocation);
    const host = (await services.appState.current()).hosts.find(
        (h) => h.name === prepared.manifest!.host.name,
    );
    if (!host)
        throw new HttpError(
            404,
            "unknown_host",
            "No Host matches the selected YAML.",
            { stage: "cli" },
        );
    return { hostId: host.id };
}
