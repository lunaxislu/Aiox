import assert from "node:assert/strict";

import { test } from "vitest";

import {
    apiPath,
    errorBodySchema,
    routeOperationSchema,
    createShellSchema,
    terminalContextFromEnv,
} from "./index";

test("shell creation rejects executable and identity injection", () => {
    assert.deepEqual(createShellSchema.parse({ cwd: "/tmp", cols: 80 }), {
        cwd: "/tmp",
        cols: 80,
    });
    for (const input of [
        { cols: 0 },
        { rows: 1.5 },
        { cwd: "" },
        { cwd: "a\0b" },
        { file: "sh" },
        { env: {} },
        { networkId: "n" },
    ]) {
        assert.equal(createShellSchema.safeParse(input).success, false);
    }
});

test("standalone terminal context is optional but must be complete and does not echo secrets", () => {
    assert.equal(terminalContextFromEnv({}), undefined);
    assert.deepEqual(
        terminalContextFromEnv({
            AIOX_TERMINAL_ID: "t",
            AIOX_TERMINAL_TOKEN: "secret",
        }),
        { terminalId: "t", token: "secret" },
    );
    for (const env of [
        { AIOX_TERMINAL_ID: "t" },
        { AIOX_TERMINAL_TOKEN: "secret" },
    ]) {
        assert.throws(
            () => terminalContextFromEnv(env),
            /^Error: Invalid terminal context\.$/,
        );
    }
});

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
