import assert from "node:assert/strict";

import { test } from "vitest";

import {
    apiPath,
    agentRunSchema,
    agentViewSchema,
    externalAgentRunSchema,
    externalAgentClientFrameSchema,
    errorBodySchema,
    routeOperationSchema,
    createShellSchema,
    terminalContextFromEnv,
} from "./index";

test("external registration cannot borrow a terminal or carry terminal control frames", () => {
    const launch = {
        adapter: "claude",
        cwd: "/workspace",
        env: {},
        args: [],
        connection: { endpoint: "local" },
    };
    assert.deepEqual(externalAgentRunSchema.parse(launch), launch);
    for (const extra of [
        { terminalContext: { terminalId: "t", token: "secret" } },
        { cols: 80 },
        { executionOwnership: "daemon" },
        { connection: undefined },
    ])
        assert.equal(
            externalAgentRunSchema.safeParse({ ...launch, ...extra }).success,
            false,
        );
    assert.equal(
        externalAgentClientFrameSchema.safeParse({
            type: "resize",
            cols: 80,
            rows: 24,
        }).success,
        false,
    );
    assert.deepEqual(
        externalAgentClientFrameSchema.parse({
            type: "exit",
            exitCode: 0,
            signal: null,
        }),
        { type: "exit", exitCode: 0, signal: null },
    );
});

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

test("foreground launch validates context without re-parsing vendor arguments", () => {
    const input = {
        adapter: "claude",
        cwd: "/workspace",
        env: { PATH: "/bin" },
        args: ["--model", "sonnet", "a prompt with spaces"],
        cols: 80,
        rows: 24,
    };
    assert.deepEqual(agentRunSchema.parse(input), input);
    for (const bad of [
        { ...input, adapter: "bad/vendor" },
        { ...input, cwd: "a\0b" },
        { ...input, cols: 0 },
        { ...input, args: [4] },
        { ...input, terminalContext: { terminalId: "t" } },
        { ...input, runtimeId: "borrowed-identity" },
    ])
        assert.equal(agentRunSchema.safeParse(bad).success, false);
});

test("agent status reasons are required and absent reasons are null", () => {
    const schema = agentViewSchema.pick({ status_reason: true });
    assert.throws(() => schema.parse({}));
    assert.deepEqual(schema.parse({ status_reason: null }), {
        status_reason: null,
    });
    assert.deepEqual(schema.parse({ status_reason: "rate_limit" }), {
        status_reason: "rate_limit",
    });
});

test("agent status accepts the common vocabulary and excludes stopped", () => {
    const schema = agentViewSchema.shape.status;
    for (const status of [
        "aiox-preparing",
        "idle",
        "working",
        "awaiting-user",
        "failed",
    ])
        assert.equal(schema.parse(status), status);
    for (const status of ["starting", "reasoning", "tool", "stopped"])
        assert.throws(() => schema.parse(status));
});
