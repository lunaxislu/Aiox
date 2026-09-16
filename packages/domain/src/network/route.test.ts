import { assert, describe, expect, it, test } from "vitest";

import type { Network } from "@/network/network";
import {
    applyRouteOperation,
    canSend,
    outboundTargets,
    RouteOperationError,
} from "@/network/route";

test("discovery and fan-out select only same-network outbound recipients", () => {
    const source = { id: "a", networkId: "review" };
    const b = { id: "b", networkId: "review" };
    const c = { id: "c", networkId: "review" };
    const outsider = { id: "outside", networkId: "other" };
    const network: Network = {
        id: "review",
        defaultPolicy: "deny",
        routes: [
            { from: "a", to: "b", policy: "allow" },
            { from: "b", to: "c", policy: "allow" },
            { from: "a", to: "outside", policy: "allow" },
        ],
    };

    assert.deepEqual(
        outboundTargets(network, source, [source, b, c, outsider]),
        [b],
    );
});

test("directed permission does not grant reverse permission", () => {
    const a = { id: "a", networkId: "n" };
    const b = { id: "b", networkId: "n" };
    const network: Network = {
        id: "n",
        defaultPolicy: "deny",
        routes: [{ from: "a", to: "b", policy: "allow" }],
    };
    assert.equal(canSend(network, a, b), true);
    assert.equal(canSend(network, b, a), false);
});

test("allow default excludes self, unaffiliated and other-network runtimes", () => {
    const source = { id: "a", networkId: "n" };
    const same = { id: "b", networkId: "n" };
    const none = { id: "c", networkId: null };
    const other = { id: "d", networkId: "other" };
    const network: Network = { id: "n", defaultPolicy: "allow", routes: [] };
    assert.deepEqual(
        outboundTargets(network, source, [source, same, none, other]),
        [same],
    );
    assert.deepEqual(outboundTargets(network, none, [source, same]), []);
    assert.deepEqual(outboundTargets(network, other, [source, same]), []);
});

test("send checks a changed route instead of treating discovery as permission", () => {
    const a = { id: "a", networkId: "n" };
    const b = { id: "b", networkId: "n" };
    const before: Network = { id: "n", defaultPolicy: "allow", routes: [] };
    assert.deepEqual(outboundTargets(before, a, [b]), [b]);
    const after: Network = {
        ...before,
        routes: [{ from: "a", to: "b", policy: "deny" }],
    };
    assert.equal(canSend(after, a, b), false);
    assert.deepEqual(outboundTargets(after, a, [b]), []);
});

test("identity uses runtime IDs even when host agents share a display name", () => {
    const a = { id: "host-1/a", name: "reviewer", networkId: "n1" };
    const b = { id: "host-1/b", name: "implementer", networkId: "n1" };
    const unrelated = { id: "host-2/b", name: "implementer", networkId: "n2" };
    const network: Network = {
        id: "n1",
        defaultPolicy: "deny",
        routes: [{ from: a.id, to: b.id, policy: "allow" }],
    };
    assert.deepEqual(outboundTargets(network, a, [b, unrelated]), [b]);
});

test("fan-out returns all permitted direct recipients and preserves their metadata", () => {
    const a = { id: "a", networkId: "n" };
    const b = { id: "b", networkId: "n", status: "observed-status-b" };
    const c = { id: "c", networkId: "n", status: "observed-status-c" };
    const network: Network = {
        id: "n",
        defaultPolicy: "deny",
        routes: [
            { from: "a", to: "b", policy: "allow" },
            { from: "a", to: "c", policy: "allow" },
        ],
    };
    assert.deepEqual(outboundTargets(network, a, [b, c]), [b, c]);
});

describe("persistent route changes", () => {
    it("blocks a clique once and unblocks it regardless of argument order", () => {
        const operation = {
            kind: "between" as const,
            action: "block" as const,
            agents: ["a", "b"],
        };
        const blocked = applyRouteOperation({ routes: [] }, operation);
        expect(blocked.routes).toEqual([
            { from: "a", to: "b" },
            { from: "b", to: "a" },
        ]);
        expect(applyRouteOperation(blocked, operation)).toEqual(blocked);
        for (const action of ["unblock", "reset"] as const) {
            expect(
                applyRouteOperation(blocked, {
                    ...operation,
                    action,
                    agents: ["b", "a"],
                }),
            ).toEqual({ routes: [] });
        }
    });
    it("changes only the directed edge and preserves the input", () => {
        const current = {
            routes: [
                { from: "b", to: "a" },
                { from: "x", to: "y" },
            ],
        };
        expect(
            applyRouteOperation(current, {
                kind: "directed",
                action: "unblock",
                from: "b",
                to: ["a"],
            }).routes,
        ).toEqual([{ from: "x", to: "y" }]);
        expect(current.routes).toHaveLength(2);
        expect(
            applyRouteOperation(
                { routes: [] },
                {
                    kind: "directed",
                    action: "block",
                    from: "a",
                    to: ["b", "b"],
                },
            ).routes,
        ).toEqual([{ from: "a", to: "b" }]);
    });
    it("rejects invalid endpoint selections", () => {
        for (const operation of [
            {
                kind: "between" as const,
                action: "block" as const,
                agents: ["a", "a"],
            },
            {
                kind: "directed" as const,
                action: "block" as const,
                from: "a",
                to: [],
            },
            {
                kind: "directed" as const,
                action: "block" as const,
                from: "a",
                to: ["a"],
            },
        ])
            expect(() =>
                applyRouteOperation({ routes: [] }, operation),
            ).toThrow(RouteOperationError);
    });
});
