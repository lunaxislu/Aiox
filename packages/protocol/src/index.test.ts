import assert from "node:assert/strict";

import { test } from "vitest";

import { apiPath, errorBodySchema, routeOperationSchema } from "./index";

test("a between operation needs at least two distinct agents", () => {
    for (const agents of [[], ["a"], ["a", "a"]]) {
        assert.equal(
            routeOperationSchema.safeParse({
                kind: "between",
                policy: "allow",
                agents,
            }).success,
            false,
            `expected ${JSON.stringify(agents)} to be rejected`,
        );
    }
    assert.deepEqual(
        routeOperationSchema.parse({
            kind: "between",
            policy: "reset",
            agents: ["a", "b"],
        }),
        { kind: "between", policy: "reset", agents: ["a", "b"] },
    );
});

test("a directed operation needs at least one target", () => {
    assert.equal(
        routeOperationSchema.safeParse({
            kind: "directed",
            policy: "deny",
            from: "a",
            to: [],
        }).success,
        false,
    );
    assert.equal(
        routeOperationSchema.safeParse({
            kind: "directed",
            policy: "deny",
            from: "a",
            to: ["b"],
        }).success,
        true,
    );
});

test("route operations are discriminated on kind, and reset is default-only", () => {
    assert.equal(
        routeOperationSchema.safeParse({ kind: "toggle", policy: "allow" })
            .success,
        false,
    );
    // The default policy is a persisted network setting: reset removes an
    // override, so it is not a value the default operation can carry.
    assert.equal(
        routeOperationSchema.safeParse({ kind: "default", policy: "reset" })
            .success,
        false,
    );
    assert.deepEqual(routeOperationSchema.parse({ kind: "reset-default" }), {
        kind: "reset-default",
    });
});

test("an error body keeps the fields a code adds to it", () => {
    const parsed = errorBodySchema.parse({
        code: "active_runtimes",
        message: "Active runtimes block a plain stop",
        runtimes: ["reviewer", "builder"],
    });
    assert.deepEqual(parsed.runtimes, ["reviewer", "builder"]);
});

test("path builders escape the identifier segment", () => {
    assert.equal(apiPath.networkRoute("a/b"), "/api/networks/a%2Fb/route");
    assert.equal(apiPath.agent("x y"), "/api/agents/x%20y");
});
