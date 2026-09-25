import assert from "node:assert/strict";

import * as Schema from "effect/Schema";
import { test } from "vitest";

import {
    apiPath,
    agentRunSchema,
    agentViewSchema,
    agentStatusSchema,
    externalAgentRunSchema,
    externalAgentClientFrameSchema,
    errorBodySchema,
    routeOperationSchema,
    createShellSchema,
    createNetworkSchema,
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
                action: "unblock",
                agents,
            }).success,
            false,
            `expected ${JSON.stringify(agents)} to be rejected`,
        );
    }
    assert.deepEqual(
        routeOperationSchema.parse({
            kind: "between",
            action: "reset",
            agents: ["a", "b"],
        }),
        { kind: "between", action: "reset", agents: ["a", "b"] },
    );
});

test("a directed operation needs at least one target", () => {
    assert.equal(
        routeOperationSchema.safeParse({
            kind: "directed",
            action: "block",
            from: "a",
            to: [],
        }).success,
        false,
    );
    assert.equal(
        routeOperationSchema.safeParse({
            kind: "directed",
            action: "block",
            from: "a",
            to: ["b"],
        }).success,
        true,
    );
});

test("route operations reject removed default controls", () => {
    assert.equal(
        routeOperationSchema.safeParse({ kind: "toggle", action: "unblock" })
            .success,
        false,
    );
    assert.equal(
        routeOperationSchema.safeParse({ kind: "default", action: "reset" })
            .success,
        false,
    );
    assert.equal(
        routeOperationSchema.safeParse({ kind: "reset-default" }).success,
        false,
    );
    assert.equal(
        createNetworkSchema.safeParse({ name: "work", defaultPolicy: "deny" })
            .success,
        false,
    );
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
        assert.equal(
            agentRunSchema.safeParse(bad).success,
            false,
            JSON.stringify(bad),
        );
});

test("agent status reasons are required and absent reasons are null", () => {
    const schema = Schema.Struct({
        status_reason: agentViewSchema.fields.status_reason,
    });
    assert.throws(() => Schema.decodeUnknownSync(schema)({}));
    assert.deepEqual(
        Schema.decodeUnknownSync(schema)({ status_reason: null }),
        {
            status_reason: null,
        },
    );
    assert.deepEqual(
        Schema.decodeUnknownSync(schema)({ status_reason: "rate_limit" }),
        {
            status_reason: "rate_limit",
        },
    );
});

test("agent status accepts the common vocabulary and excludes stopped", () => {
    const schema = agentStatusSchema;
    for (const status of [
        "aiox-preparing",
        "idle",
        "working",
        "awaiting-user",
        "failed",
    ])
        assert.equal(Schema.decodeUnknownSync(schema)(status), status);
    for (const status of ["starting", "reasoning", "tool", "stopped"])
        assert.throws(() => Schema.decodeUnknownSync(schema)(status));
});
