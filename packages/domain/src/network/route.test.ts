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

const denyAll: Pick<Network, "defaultPolicy" | "routes"> = {
    defaultPolicy: "deny",
    routes: [],
};

const sorted = (routes: { from: string; to: string; policy: string }[]) =>
    [...routes].sort((a, b) =>
        `${a.from}${a.to}`.localeCompare(`${b.from}${b.to}`),
    );

describe("applyRouteOperation", () => {
    it("expands between into a mutual clique without self edges", () => {
        const result = applyRouteOperation(denyAll, {
            kind: "between",
            policy: "allow",
            agents: ["a", "b", "c"],
        });
        expect(sorted(result.routes)).toEqual(
            sorted([
                { from: "a", to: "b", policy: "allow" },
                { from: "a", to: "c", policy: "allow" },
                { from: "b", to: "a", policy: "allow" },
                { from: "b", to: "c", policy: "allow" },
                { from: "c", to: "a", policy: "allow" },
                { from: "c", to: "b", policy: "allow" },
            ]),
        );
    });

    it("keeps a directed operation one-way", () => {
        const result = applyRouteOperation(denyAll, {
            kind: "directed",
            policy: "allow",
            from: "researcher",
            to: ["reviewer"],
        });
        expect(result.routes).toEqual([
            { from: "researcher", to: "reviewer", policy: "allow" },
        ]);
    });

    it("replaces the existing policy on an edge instead of stacking a second one", () => {
        const allowed = applyRouteOperation(denyAll, {
            kind: "directed",
            policy: "allow",
            from: "a",
            to: ["b"],
        });
        const denied = applyRouteOperation(allowed, {
            kind: "directed",
            policy: "deny",
            from: "a",
            to: ["b"],
        });
        expect(denied.routes).toEqual([{ from: "a", to: "b", policy: "deny" }]);
    });

    it("resets an edge back to the network default rather than writing deny", () => {
        const allowed = applyRouteOperation(denyAll, {
            kind: "between",
            policy: "allow",
            agents: ["a", "b"],
        });
        const reset = applyRouteOperation(allowed, {
            kind: "directed",
            policy: "reset",
            from: "a",
            to: ["b"],
        });
        expect(reset.routes).toEqual([{ from: "b", to: "a", policy: "allow" }]);
        expect(reset.defaultPolicy).toBe("deny");
    });

    it("leaves unrelated edges alone", () => {
        const seeded = {
            defaultPolicy: "deny" as const,
            routes: [{ from: "x", to: "y", policy: "allow" as const }],
        };
        const result = applyRouteOperation(seeded, {
            kind: "directed",
            policy: "allow",
            from: "a",
            to: ["b"],
        });
        expect(result.routes).toContainEqual({
            from: "x",
            to: "y",
            policy: "allow",
        });
    });

    it("changing the default does not remove explicit edges", () => {
        const allowed = applyRouteOperation(denyAll, {
            kind: "directed",
            policy: "allow",
            from: "a",
            to: ["b"],
        });
        const result = applyRouteOperation(allowed, {
            kind: "default",
            policy: "deny",
        });
        expect(result.defaultPolicy).toBe("deny");
        expect(result.routes).toEqual([
            { from: "a", to: "b", policy: "allow" },
        ]);
    });

    it("rejects operations that cannot describe a directed edge", () => {
        expect(() =>
            applyRouteOperation(denyAll, {
                kind: "between",
                policy: "allow",
                agents: ["a", "a"],
            }),
        ).toThrow(RouteOperationError);
        expect(() =>
            applyRouteOperation(denyAll, {
                kind: "directed",
                policy: "allow",
                from: "a",
                to: [],
            }),
        ).toThrow(RouteOperationError);
        expect(() =>
            applyRouteOperation(denyAll, {
                kind: "directed",
                policy: "allow",
                from: "a",
                to: ["a"],
            }),
        ).toThrow(RouteOperationError);
    });

    it("refuses reset-default on a persistent network, which has no override layer", () => {
        expect(() =>
            applyRouteOperation(denyAll, { kind: "reset-default" }),
        ).toThrow(RouteOperationError);
    });

    it("does not mutate the snapshot it was given", () => {
        const seeded = {
            defaultPolicy: "deny" as const,
            routes: [{ from: "a", to: "b", policy: "allow" as const }],
        };
        applyRouteOperation(seeded, {
            kind: "directed",
            policy: "reset",
            from: "a",
            to: ["b"],
        });
        expect(seeded.routes).toHaveLength(1);
    });
});
