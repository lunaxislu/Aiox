import { ONE_WAY_NOTICE } from "@aiox/domain";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DaemonHarness, FakeVendor } from "@/testing";
import { fakeVendor, startTestDaemon } from "@/testing";

type Party = {
    id: string;
    name: string;
    token: string;
    vendor: FakeVendor;
};

let harness: DaemonHarness;
let networkId: string;
const clients: Client[] = [];
const targetNotFoundMessage =
    "Target not found in your Network. Call agents_list to check current targets before sending again. Do not resend to targets already accepted.";

async function join(
    name: string,
    extra: { role?: string; description?: string } = {},
    network: string | null = networkId,
): Promise<Party> {
    const vendor = fakeVendor();
    const { runtimeId, token } = await harness.daemon.registerRuntime({
        name,
        networkId: network,
        ...extra,
        createBinding: vendor.createBinding,
    });
    return { id: runtimeId, name, token, vendor };
}

/** An anonymous runtime keeps the daemon's agentId fallback observable. */
async function joinAnonymous(): Promise<Party> {
    const vendor = fakeVendor();
    const { runtimeId, token } = await harness.daemon.registerRuntime({
        networkId,
        createBinding: vendor.createBinding,
    });
    return { id: runtimeId, name: runtimeId, token, vendor };
}

async function connect(token: string, network = networkId): Promise<Client> {
    const client = new Client({ name: "test", version: "0" });
    await client.connect(
        new StreamableHTTPClientTransport(new URL(harness.mcpUrl(network)), {
            requestInit: { headers: { authorization: `Bearer ${token}` } },
        }) as never,
    );
    clients.push(client);
    return client;
}

async function agentsList(client: Client) {
    const result = await client.callTool({ name: "agents_list" });
    return (result.structuredContent as { agents: Record<string, unknown>[] })
        .agents;
}

async function send(client: Client, targets: string[], content: string) {
    const result = await client.callTool({
        name: "send",
        arguments: { targets, content },
    });
    return result.structuredContent as {
        messageId: string;
        results: { name: string; accepted: boolean; error?: string }[];
    };
}

const unread = async () =>
    harness.daemon.services.db.messages.unreadNotifications();

async function route(operation: unknown): Promise<void> {
    const response = await fetch(
        harness.apiUrl(`/api/networks/${networkId}/route`),
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ operation }),
        },
    );
    expect(response.status).toBe(200);
}

beforeEach(async () => {
    harness = await startTestDaemon();
    const created = await harness.daemon.services.networks.create("collab");
    networkId = created.id;
});

afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close()));
    await harness.close();
});

describe("credentials", () => {
    it("refuses a call with no credential", async () => {
        const response = await fetch(harness.mcpUrl(networkId), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "tools/list",
            }),
        });
        expect(response.status).toBe(401);
    });

    it("refuses a credential that was never issued", async () => {
        const response = await fetch(harness.mcpUrl(networkId), {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: "Bearer not-a-real-token",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "tools/list",
            }),
        });
        expect(response.status).toBe(401);
    });

    it("does not let a network URL stand in for permission", async () => {
        const a = await join("a");
        const response = await fetch(harness.mcpUrl("some-other-network"), {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${a.token}`,
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "tools/list",
            }),
        });
        expect(response.status).toBe(403);
    });

    it("stops honouring a credential once its runtime is gone", async () => {
        const a = await join("a");
        const client = await connect(a.token);
        expect(await agentsList(client)).toEqual([]);

        await harness.daemon.stopRuntime(a.id);

        const response = await fetch(harness.mcpUrl(networkId), {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${a.token}`,
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "tools/list",
            }),
        });
        expect(response.status).toBe(401);
    });
});

describe("agents_list", () => {
    it("does not discover general shells or accept them as message targets", async () => {
        const a = await join("a");
        const shell = await harness.daemon.createShell();
        const client = await connect(a.token);
        expect(await agentsList(client)).toEqual([]);
        const result = await send(
            client,
            [shell.id],
            "this must never become a shell command",
        );
        expect(result.results).toMatchObject([
            { name: shell.id, accepted: false },
        ]);
        expect(harness.daemon.services.runtimes.list()).toHaveLength(1);
    });
    it("shows only the agents the caller may send to, and not the reverse", async () => {
        const a = await join("a");
        const b = await join("b");
        await route({
            kind: "directed",
            action: "block",
            from: b.id,
            to: [a.id],
        });

        expect(
            (await agentsList(await connect(a.token))).map((x) => x.name),
        ).toEqual([b.name]);
        expect(await agentsList(await connect(b.token))).toEqual([]);
    });

    it("falls back to the agentId as a name and leaves absent metadata null", async () => {
        const a = await join("a");
        const anonymous = await joinAnonymous();

        expect(await agentsList(await connect(a.token))).toEqual([
            {
                name: anonymous.id,
                role: null,
                description: null,
                status: "idle",
                status_reason: null,
            },
        ]);
    });

    it("summarises every kind of progress as working", async () => {
        const a = await join("a");
        const b = await join("b", { role: "review", description: "reviews" });
        const client = await connect(a.token);

        b.vendor.status("working");
        expect((await agentsList(client))[0]).toMatchObject({
            name: "b",
            role: "review",
            description: "reviews",
            status: "working",
        });
        b.vendor.status("awaiting-user");
        expect((await agentsList(client))[0]).toMatchObject({
            status: "awaiting-user",
        });
        b.vendor.status("failed");
        expect((await agentsList(client))[0]).toMatchObject({
            status: "failed",
        });
    });
});

describe("send", () => {
    it("resolves Network names or IDs and delivers once per runtime", async () => {
        const a = await join("a");
        const b = await join("b");
        const anonymous = await joinAnonymous();
        const otherNetwork =
            await harness.daemon.services.networks.create("other");
        const otherB = await join("b", {}, otherNetwork.id);
        const outsider = await join("outsider", {}, otherNetwork.id);
        const client = await connect(a.token);
        const listed = await agentsList(client);
        expect(listed.map((agent) => agent.name)).toEqual([
            b.name,
            anonymous.name,
        ]);
        expect(listed.every((agent) => !("agentId" in agent))).toBe(true);
        const sent = await send(
            client,
            [b.name, b.id, anonymous.name, "outsider", otherB.id, b.name],
            "hello",
        );
        expect(sent.results).toEqual([
            { name: b.name, accepted: true },
            { name: b.id, accepted: true },
            { name: anonymous.name, accepted: true },
            {
                name: "outsider",
                accepted: false,
                error: targetNotFoundMessage,
            },
            {
                name: otherB.id,
                accepted: false,
                error: targetNotFoundMessage,
            },
        ]);
        expect(b.vendor.received).toHaveLength(1);
        expect(anonymous.vendor.received).toHaveLength(1);
        expect(otherB.vendor.received).toHaveLength(0);
        expect(outsider.vendor.received).toHaveLength(0);
        const stored = await harness.daemon.services.db.messages.deliveriesFor(
            sent.messageId,
        );
        expect(
            stored.map((delivery) => delivery.targetRuntimeId).sort(),
        ).toEqual([b.id, anonymous.id].sort());
        const unknown = await send(client, ["missing"], "no runtime");
        expect(unknown.results).toEqual([
            {
                name: "missing",
                accepted: false,
                error: targetNotFoundMessage,
            },
        ]);
        expect(
            await harness.daemon.services.db.messages.deliveriesFor(
                unknown.messageId,
            ),
        ).toEqual([]);
    });

    it("returns discovery guidance when the resolved target leaves during send", async () => {
        const a = await join("a");
        const b = await join("b");
        const { networks, runtimes } = harness.daemon.services;
        const effective = networks.effective.bind(networks);
        vi.spyOn(networks, "effective").mockImplementationOnce(async (id) => {
            const network = await effective(id);
            runtimes.revoke(b.id);
            return network;
        });
        const sent = await send(await connect(a.token), [b.name], "hello");
        expect(sent.results).toEqual([
            {
                name: b.name,
                accepted: false,
                error: targetNotFoundMessage,
            },
        ]);
        expect(b.vendor.received).toHaveLength(0);
    });

    it("uses the same ID-first resolution for send and route", async () => {
        const a = await join("a");
        const b = await join("b");
        const namedAfterB = await join(b.id);
        await route({
            kind: "directed",
            from: a.name,
            to: [b.id],
            action: "block",
        });
        const client = await connect(a.token);
        expect((await agentsList(client)).map((agent) => agent.name)).toEqual([
            namedAfterB.name,
        ]);
        await route({
            kind: "directed",
            from: a.name,
            to: [b.id],
            action: "unblock",
        });
        const sent = await send(await connect(a.token), [b.id], "only b");
        expect(sent.results).toEqual([{ name: b.id, accepted: true }]);
        expect(b.vendor.received).toHaveLength(1);
        expect(namedAfterB.vendor.received).toHaveLength(0);
    });

    it("resolves a reused name to the current participant and keeps history on the old ID", async () => {
        const a = await join("a");
        const b = await join("b");
        const client = await connect(a.token);
        const [listed] = await agentsList(client);
        const first = await send(client, [listed!.name as string], "first");
        await harness.daemon.stopRuntime(b.id);
        const replacement = await join("b");
        const second = await send(
            client,
            [listed!.name as string, b.id],
            "second",
        );
        expect(second.results).toEqual([
            { name: "b", accepted: true },
            {
                name: b.id,
                accepted: false,
                error: targetNotFoundMessage,
            },
        ]);
        expect(b.vendor.received).toHaveLength(1);
        expect(replacement.vendor.received[0]!.content).toBe("second");
        const { messages } = harness.daemon.services.db;
        expect(
            (await messages.deliveriesFor(first.messageId))[0]!.targetRuntimeId,
        ).toBe(b.id);
        expect(
            (await messages.deliveriesFor(second.messageId))[0]!
                .targetRuntimeId,
        ).toBe(replacement.id);
    });

    it("delivers only to the agents the caller named", async () => {
        const a = await join("a");
        const b = await join("b");
        const c = await join("c");

        const sent = await send(await connect(a.token), [b.name], "just b");
        expect(sent.results).toEqual([{ name: b.name, accepted: true }]);
        expect(b.vendor.received).toHaveLength(1);
        expect(c.vendor.received).toHaveLength(0);
    });

    it("reports each target separately instead of hiding a partial failure", async () => {
        const a = await join("a");
        const b = await join("b");
        const c = await join("c");
        await route({
            kind: "directed",
            action: "block",
            from: a.id,
            to: [c.id],
        });

        const sent = await send(
            await connect(a.token),
            [b.name, c.name, c.id, "no-such-agent"],
            "hello",
        );
        expect(sent.results).toEqual([
            { name: b.name, accepted: true },
            { name: c.name, accepted: false, error: "no_route" },
            { name: c.id, accepted: false, error: "no_route" },
            {
                name: "no-such-agent",
                accepted: false,
                error: targetNotFoundMessage,
            },
        ]);
        expect(c.vendor.received).toHaveLength(0);
    });

    it("appends the one-way notice for a target that cannot reply, and stores the original", async () => {
        const a = await join("a");
        const b = await join("b");
        await route({
            kind: "directed",
            action: "block",
            from: b.id,
            to: [a.id],
        });

        const sent = await send(
            await connect(a.token),
            [b.name],
            "do the thing",
        );
        expect(b.vendor.received[0]!.content).toBe(
            `do the thing\n\n${ONE_WAY_NOTICE}`,
        );
        const deliveries =
            await harness.daemon.services.db.messages.deliveriesFor(
                sent.messageId,
            );
        expect(deliveries[0]!.reverseRouteAtSend).toBe(false);
    });

    it("leaves a two-way target's body untouched", async () => {
        const a = await join("a");
        const b = await join("b");

        await send(await connect(a.token), [b.name], "do the thing");
        expect(b.vendor.received[0]!.content).toBe("do the thing");
    });

    it("names the authenticated sender rather than anything the caller claims", async () => {
        const a = await join("a", { role: "impl", description: "writes code" });
        const b = await join("b");

        await send(await connect(a.token), [b.name], "hi");
        expect(b.vendor.received[0]!.from).toEqual({
            name: "a",
            role: "impl",
            description: "writes code",
        });
    });

    it("re-checks the route at send time, so an older list is not a permission", async () => {
        const a = await join("a");
        const b = await join("b");
        const client = await connect(a.token);
        expect((await agentsList(client)).map((x) => x.name)).toEqual([b.name]);

        await route({
            kind: "directed",
            action: "block",
            from: a.id,
            to: [b.id],
        });

        const sent = await send(client, [b.name], "too late");
        expect(sent.results).toEqual([
            { name: b.name, accepted: false, error: "no_route" },
        ]);
        expect(b.vendor.received).toHaveLength(0);
    });

    it("reports an injection refusal in the response and does not queue a retry", async () => {
        const a = await join("a");
        const b = await join("b");
        b.vendor.refuse("vendor input path closed");

        const sent = await send(await connect(a.token), [b.name], "hi");
        expect(sent.results[0]).toMatchObject({
            accepted: false,
            error: "vendor input path closed",
        });
        expect(await unread()).toHaveLength(0);
        expect(harness.daemon.services.messages.pending()).toBe(0);
    });
});

describe("automatic notification", () => {
    async function pair(twoWay: boolean) {
        const suffix = harness.daemon.services.runtimes.list().length;
        const a = await join(`a-${suffix}`);
        const b = await join(`b-${suffix}`);
        if (!twoWay) {
            await route({
                kind: "directed",
                action: "block",
                from: b.id,
                to: [a.id],
            });
        }
        const sent = await send(
            await connect(a.token),
            [b.name],
            "work item X",
        );
        return { a, b, sent };
    }

    it("tells a one-way sender that its request completed", async () => {
        const { a, b } = await pair(false);
        await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");

        const notifications = await unread();
        expect(notifications).toHaveLength(1);
        expect(notifications[0]!.originRuntimeId).toBe(a.id);
        expect(notifications[0]!.body).toContain("work item X");
    });

    it("stays silent when a two-way target completes", async () => {
        const { b } = await pair(true);
        await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");
        expect(await unread()).toHaveLength(0);
    });

    it("reports a failure in both directions", async () => {
        for (const twoWay of [false, true]) {
            const { b } = await pair(twoWay);
            await b.vendor.settle(
                b.vendor.deliveryIds[0]!,
                "failed",
                "session expired",
            );
            const notifications = await unread();
            expect(notifications.at(-1)!.body).toContain("session expired");
        }
        expect(await unread()).toHaveLength(2);
    });

    it("never notifies an interruption", async () => {
        for (const twoWay of [false, true]) {
            const { b } = await pair(twoWay);
            await b.vendor.settle(b.vendor.deliveryIds[0]!, "interrupted");
        }
        expect(await unread()).toHaveLength(0);
    });

    it("notifies the sender about the one failing target only, not the other recipients", async () => {
        const a = await join("a");
        const b = await join("b");
        const c = await join("c");

        await send(await connect(a.token), [b.name, c.name], "shared work");
        await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");
        await c.vendor.settle(c.vendor.deliveryIds[0]!, "failed", "quota");

        const notifications = await unread();
        expect(notifications).toHaveLength(1);
        expect(notifications[0]!.originRuntimeId).toBe(a.id);
        // The failure reaches the sender, never the sibling recipient.
        expect(
            b.vendor.received.filter((m) => m.deliveryId === null),
        ).toHaveLength(0);
        expect(
            c.vendor.received.filter((m) => m.deliveryId === null),
        ).toHaveLength(0);
    });

    it("delivers the notice to the sender with no correlation handle, so it cannot cascade", async () => {
        const { a, b } = await pair(false);
        await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");

        const notices = a.vendor.received.filter((m) => m.deliveryId === null);
        expect(notices).toHaveLength(1);
        expect(a.vendor.deliveryIds).toHaveLength(0);
        expect(await unread()).toHaveLength(1);
    });

    it("does not notify again when the recipient later finishes the user's own work", async () => {
        const { b } = await pair(false);
        await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");
        expect(await unread()).toHaveLength(1);

        // The user asks B for something directly. It has no delivery id, so
        // there is nothing to settle and nobody to notify.
        b.vendor.status("working");
        b.vendor.status("idle");
        expect(await unread()).toHaveLength(1);
    });

    it("ignores a second outcome for a delivery that already finished", async () => {
        const { b } = await pair(false);
        const deliveryId = b.vendor.deliveryIds[0]!;
        await b.vendor.settle(deliveryId, "completed");
        await b.vendor.settle(deliveryId, "failed", "late");
        expect(await unread()).toHaveLength(1);
    });

    it("keeps the request result and the agent's current state separate", async () => {
        const { b, sent } = await pair(true);
        await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");
        // B moves straight on to other work; X is still completed.
        b.vendor.status("working");

        expect(harness.daemon.services.runtimes.get(b.id)!.status).toBe(
            "working",
        );
        const stored = await harness.daemon.services.db.messages.deliveryFor(
            sent.messageId,
            b.id,
        );
        expect(stored!.outcome).toBe("completed");
    });
});

it("revoked runtimes cannot use MCP or remain discoverable while cleanup is retained", async () => {
    const a = await join("A");
    const b = await join("B");
    const aClient = await connect(a.token);
    const bClient = await connect(b.token);
    harness.daemon.services.runtimes.revoke(b.id);
    expect(harness.daemon.services.runtimes.get(b.id)).toBeDefined();
    expect(await agentsList(aClient)).toEqual([]);
    expect(
        (await send(aClient, [b.name], "no delivery")).results,
    ).toMatchObject([{ accepted: false }]);
    await expect(agentsList(bClient)).rejects.toThrow();
    expect(b.vendor.received).toEqual([]);
});

it("does not disclose discovery results when the caller is revoked during route lookup", async () => {
    const a = await join("A");
    await join("B");
    const { networks, runtimes } = harness.daemon.services;
    const client = await connect(a.token);
    const route = await networks.effective(networkId);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
        release = resolve;
    });
    const effective = vi
        .spyOn(networks, "effective")
        .mockImplementationOnce(async () => {
            await held;
            return route;
        });
    try {
        const discovery = agentsList(client);
        await vi.waitFor(() => expect(effective).toHaveBeenCalledOnce());
        runtimes.revoke(a.id);
        release();
        expect(await discovery).toEqual([]);
    } finally {
        release();
        effective.mockRestore();
    }
});

it("publishes preparing agents but refuses delivery until ready", async () => {
    const a = await join("a");
    const b = await join("b");
    const client = await connect(a.token);
    b.vendor.status("aiox-preparing");
    expect((await agentsList(client))[0]).toMatchObject({
        name: b.name,
        status: "aiox-preparing",
        status_reason: null,
    });
    const web = (await (
        await fetch(harness.webUrl("/api/web/agents"))
    ).json()) as { agentId: string }[];
    expect(web.find((agent) => agent.agentId === b.id)).toMatchObject({
        status: "aiox-preparing",
        status_reason: null,
    });
    expect((await send(client, [b.name], "too early")).results).toEqual([
        {
            name: b.name,
            accepted: false,
            error: "not_available: Agent is preparing/switching session. Please try again in a few moments.",
        },
    ]);
    expect(b.vendor.received).toHaveLength(0);
});
