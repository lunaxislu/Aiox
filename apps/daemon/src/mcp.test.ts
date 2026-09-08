import { ONE_WAY_NOTICE } from "@aiox/domain";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DaemonHarness, FakeVendor } from "@/testing";
import { fakeVendor, startTestDaemon } from "@/testing";

type Party = {
    id: string;
    token: string;
    vendor: FakeVendor;
};

let harness: DaemonHarness;
let networkId: string;
const clients: Client[] = [];

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
    return { id: runtimeId, token, vendor };
}

/** An anonymous runtime keeps the daemon's agentId fallback observable. */
async function joinAnonymous(): Promise<Party> {
    const vendor = fakeVendor();
    const { runtimeId, token } = await harness.daemon.registerRuntime({
        networkId,
        createBinding: vendor.createBinding,
    });
    return { id: runtimeId, token, vendor };
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
        results: { agentId: string; accepted: boolean; error?: string }[];
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
    const created = await harness.daemon.services.networks.create(
        "collab",
        "deny",
    );
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

        await harness.daemon.stopRuntime(a.id, true);

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
    it("shows only the agents the caller may send to, and not the reverse", async () => {
        const a = await join("a");
        const b = await join("b");
        await route({
            kind: "directed",
            policy: "allow",
            from: a.id,
            to: [b.id],
        });

        expect(
            (await agentsList(await connect(a.token))).map((x) => x.agentId),
        ).toEqual([b.id]);
        expect(await agentsList(await connect(b.token))).toEqual([]);
    });

    it("falls back to the agentId as a name and leaves absent metadata null", async () => {
        const a = await join("a");
        const anonymous = await joinAnonymous();
        await route({
            kind: "directed",
            policy: "allow",
            from: a.id,
            to: [anonymous.id],
        });

        expect(await agentsList(await connect(a.token))).toEqual([
            {
                agentId: anonymous.id,
                name: anonymous.id,
                role: null,
                description: null,
                status: "idle",
            },
        ]);
    });

    it("summarises every kind of progress as working", async () => {
        const a = await join("a");
        const b = await join("b", { role: "review", description: "reviews" });
        await route({
            kind: "between",
            policy: "allow",
            agents: [a.id, b.id],
        });
        const client = await connect(a.token);

        b.vendor.activity("tool");
        expect((await agentsList(client))[0]).toMatchObject({
            name: "b",
            role: "review",
            description: "reviews",
            status: "working",
        });
        b.vendor.activity("awaiting-user");
        expect((await agentsList(client))[0]).toMatchObject({
            status: "working",
        });
        b.vendor.activity("failed");
        expect((await agentsList(client))[0]).toMatchObject({
            status: "failed",
        });
    });

    it("hides an agent that is not a send target at all", async () => {
        const a = await join("a");
        const b = await join("b");
        await route({
            kind: "between",
            policy: "allow",
            agents: [a.id, b.id],
        });
        const client = await connect(a.token);

        b.vendor.activity("starting");
        expect(await agentsList(client)).toEqual([]);
        b.vendor.activity("stopped");
        expect(await agentsList(client)).toEqual([]);
    });
});

describe("send", () => {
    it("delivers only to the agents the caller named", async () => {
        const a = await join("a");
        const b = await join("b");
        const c = await join("c");
        await route({
            kind: "between",
            policy: "allow",
            agents: [a.id, b.id, c.id],
        });

        const sent = await send(await connect(a.token), [b.id], "just b");
        expect(sent.results).toEqual([{ agentId: b.id, accepted: true }]);
        expect(b.vendor.received).toHaveLength(1);
        expect(c.vendor.received).toHaveLength(0);
    });

    it("reports each target separately instead of hiding a partial failure", async () => {
        const a = await join("a");
        const b = await join("b");
        const c = await join("c");
        await route({
            kind: "directed",
            policy: "allow",
            from: a.id,
            to: [b.id],
        });

        const sent = await send(
            await connect(a.token),
            [b.id, c.id, "no-such-agent"],
            "hello",
        );
        expect(sent.results).toEqual([
            { agentId: b.id, accepted: true },
            { agentId: c.id, accepted: false, error: "no_route" },
            {
                agentId: "no-such-agent",
                accepted: false,
                error: "unknown_agent",
            },
        ]);
        expect(c.vendor.received).toHaveLength(0);
    });

    it("appends the one-way notice for a target that cannot reply, and stores the original", async () => {
        const a = await join("a");
        const b = await join("b");
        await route({
            kind: "directed",
            policy: "allow",
            from: a.id,
            to: [b.id],
        });

        const sent = await send(await connect(a.token), [b.id], "do the thing");
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
        await route({
            kind: "between",
            policy: "allow",
            agents: [a.id, b.id],
        });

        await send(await connect(a.token), [b.id], "do the thing");
        expect(b.vendor.received[0]!.content).toBe("do the thing");
    });

    it("names the authenticated sender rather than anything the caller claims", async () => {
        const a = await join("a", { role: "impl", description: "writes code" });
        const b = await join("b");
        await route({
            kind: "directed",
            policy: "allow",
            from: a.id,
            to: [b.id],
        });

        await send(await connect(a.token), [b.id], "hi");
        expect(b.vendor.received[0]!.from).toEqual({
            name: "a",
            role: "impl",
            description: "writes code",
        });
    });

    it("re-checks the route at send time, so an older list is not a permission", async () => {
        const a = await join("a");
        const b = await join("b");
        await route({
            kind: "between",
            policy: "allow",
            agents: [a.id, b.id],
        });
        const client = await connect(a.token);
        expect((await agentsList(client)).map((x) => x.agentId)).toEqual([
            b.id,
        ]);

        await route({
            kind: "directed",
            policy: "deny",
            from: a.id,
            to: [b.id],
        });

        const sent = await send(client, [b.id], "too late");
        expect(sent.results).toEqual([
            { agentId: b.id, accepted: false, error: "no_route" },
        ]);
        expect(b.vendor.received).toHaveLength(0);
    });

    it("reports an injection refusal in the response and does not queue a retry", async () => {
        const a = await join("a");
        const b = await join("b");
        await route({
            kind: "between",
            policy: "allow",
            agents: [a.id, b.id],
        });
        b.vendor.refuse("vendor input path closed");

        const sent = await send(await connect(a.token), [b.id], "hi");
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
        const a = await join("a");
        const b = await join("b");
        await route(
            twoWay
                ? { kind: "between", policy: "allow", agents: [a.id, b.id] }
                : {
                      kind: "directed",
                      policy: "allow",
                      from: a.id,
                      to: [b.id],
                  },
        );
        const sent = await send(await connect(a.token), [b.id], "work item X");
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
        await route({
            kind: "between",
            policy: "allow",
            agents: [a.id, b.id, c.id],
        });

        await send(await connect(a.token), [b.id, c.id], "shared work");
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
        b.vendor.activity("reasoning");
        b.vendor.activity("idle");
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
        b.vendor.activity("tool");

        expect(harness.daemon.services.runtimes.get(b.id)!.activity).toBe(
            "tool",
        );
        const stored = await harness.daemon.services.db.messages.deliveryFor(
            sent.messageId,
            b.id,
        );
        expect(stored!.outcome).toBe("completed");
    });
});
