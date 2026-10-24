import assert from "node:assert/strict";

import { test } from "vitest";

import { createCli } from "./cli";
import type { CliRequest } from "./requests";

test("agent run separates AIOX instruction from exact vendor arguments", async () => {
    const calls: CliRequest[] = [];
    await createCli({
        execute: async (request) => {
            calls.push(request);
        },
    }).parseAsync(
        [
            "agent",
            "run",
            "claude",
            "--network",
            "review",
            "--instruction",
            "Review code",
            "--",
            "--model",
            "sonnet",
        ],
        { from: "user" },
    );
    assert.deepEqual(calls, [
        {
            command: "agent.run",
            args: ["claude"],
            options: { network: "review", instruction: "Review code" },
            adapterArgs: ["--model", "sonnet"],
        },
    ]);
});

const parse = async (args: string[]) => {
    const calls: CliRequest[] = [];
    const cli = createCli({
        execute: async (request) => {
            if (request.cliErrors?.length || request.selectionErrors?.length)
                throw new Error(
                    [
                        ...(request.cliErrors ?? []),
                        ...(request.selectionErrors ?? []),
                    ].join("; "),
                );
            calls.push(request);
        },
    });
    cli.configureOutput({ writeErr() {} });
    await cli.parseAsync(args, { from: "user" });
    return calls;
};

test("rejects duplicate network and removed plural instruction and join", async () => {
    for (const args of [
        ["agent", "run", "claude", "--network", "a", "--network", "b"],
        ["agent", "run", "claude", "--instructions", "x"],
        ["network", "join", "a", "reviewer"],
        ["agent", "run", "claude", "unseparated"],
        ["agent", "run", "claude", "unseparated", "--", "--model", "x"],
        ["daemon", "restart", "--force"],
    ])
        await assert.rejects(parse(args));
});

test("host agents take YAML-scoped names and support restart", async () => {
    for (const verb of ["start", "stop", "restart"]) {
        await assert.rejects(parse(["host", "agent", verb]));
        assert.deepEqual(
            (
                await parse([
                    "host",
                    "agent",
                    verb,
                    "one",
                    "two",
                    "--file",
                    "aiox.dev.yaml",
                ])
            )[0],
            {
                command: `host.agent.${verb}`,
                args: [["one", "two"]],
                options: { file: "aiox.dev.yaml" },
            },
        );
    }
});

test("daemon start takes integer port overrides", async () => {
    assert.deepEqual(
        (
            await parse([
                "daemon",
                "start",
                "--port",
                "5000",
                "--web-port",
                "5001",
            ])
        )[0]?.options,
        { port: 5000, webPort: 5001 },
    );
    for (const args of [
        ["--port", "abc"],
        ["--port", "45.5"],
        ["--port", "-1"],
        ["--web-port", ""],
    ])
        await assert.rejects(parse(["daemon", "start", ...args]));
});

test("routing verbs validate targets before dispatch", async () => {
    for (const prefix of [["network"], ["host", "network"]]) {
        const operands = prefix.length === 1 ? ["work"] : ["feature", "work"];
        for (const verb of ["block", "unblock", "reset"]) {
            for (const flags of [
                [],
                ["--from", "a"],
                ["--to", "b"],
                ["--between", "a"],
                ["--between", "a", "a"],
                ["--between", "a", "b", "--from", "a", "--to", "b"],
                ["--from", "a", "--to", "a"],
            ]) {
                await assert.rejects(
                    parse([...prefix, verb, ...operands, ...flags]),
                );
            }
            assert.deepEqual(
                (
                    await parse([
                        ...prefix,
                        verb,
                        ...operands,
                        "--from",
                        "a",
                        "--to",
                        "b",
                        "c",
                    ])
                )[0],
                {
                    command: `${prefix.join(".")}.${verb}`,
                    args: operands,
                    options: { from: "a", to: ["b", "c"] },
                },
            );
            for (const agents of [
                ["a", "b"],
                ["b", "a"],
            ]) {
                assert.deepEqual(
                    (
                        await parse([
                            ...prefix,
                            verb,
                            ...operands,
                            "--between",
                            ...agents,
                        ])
                    )[0]?.options,
                    { between: agents },
                );
            }
        }
        await assert.rejects(
            parse([
                ...prefix,
                "route",
                ...operands,
                "--allow-between",
                "a",
                "b",
            ]),
        );
        await assert.rejects(
            parse([...prefix, "block", ...operands, "--default", "deny"]),
        );
        await assert.rejects(
            parse([...prefix, "reset", ...operands, "--reset-default"]),
        );
    }
    assert.deepEqual(
        (await parse(["network", "create", "work"]))[0]?.options,
        {},
    );
    await assert.rejects(
        parse(["network", "create", "work", "--default", "allow"]),
    );
});

test("Host source/layout replace removed worktree/name options", async () => {
    for (const flag of ["--worktree", "--name", "--host"])
        await assert.rejects(parse(["host", "run", flag, "review"]));
    assert.deepEqual(
        (
            await parse([
                "host",
                "--path",
                "project",
                "--file",
                "aiox.dev.yaml",
                "--columns",
                "2",
            ])
        )[0],
        {
            command: "host.run",
            args: [],
            options: { path: "project", file: "aiox.dev.yaml", columns: "2" },
        },
    );
    for (const verb of ["status", "stop", "delete"])
        assert.deepEqual((await parse(["host", verb, "named"]))[0]?.args, [
            "named",
        ]);
    assert.equal(
        (await parse(["daemon", "stop", "--force"]))[0]?.options.force,
        true,
    );
});

test("help returns without invoking execution port", async () => {
    let executed = false;
    const cli = createCli({
        async execute() {
            executed = true;
        },
    });
    let text = "";
    cli.configureOutput({
        writeOut(value) {
            text += value;
        },
    });
    await assert.rejects(cli.parseAsync(["--help"], { from: "user" }), {
        code: "commander.helpDisplayed",
    });
    assert.match(text, /daemon/);
    assert.equal(executed, false);
});

test("shutdown help distinguishes daemon-owned work from surviving external vendors", () => {
    const cli = createCli({ execute: async () => {} });
    const daemon = cli.commands.find((command) => command.name() === "daemon")!;
    for (const name of ["stop", "restart"]) {
        const help = daemon.commands
            .find((command) => command.name() === name)!
            .helpInformation();
        assert.match(help, /Refuses while daemon-owned\s+work remains/);
        assert.match(help, /External CLI\s+vendors keep\s+running/);
    }
    const stop = daemon.commands.find((command) => command.name() === "stop")!;
    assert.match(
        stop.options.find((option) => option.long === "--force")!.description,
        /Terminate daemon-owned executions/,
    );
});

test("required option values containing -- are not adapter delimiters", async () => {
    const [request] = await parse([
        "agent",
        "run",
        "claude",
        "--instruction",
        "--",
        "--",
        "--model",
        "x",
    ]);
    assert.equal(request?.options.instruction, "--");
    assert.deepEqual(request?.adapterArgs, ["--model", "x"]);
    const [literal] = await parse([
        "agent",
        "run",
        "claude",
        "--",
        "--",
        "--model",
        "x",
    ]);
    assert.deepEqual(literal?.adapterArgs, ["--", "--model", "x"]);
    const [equals] = await parse([
        "agent",
        "run",
        "claude",
        "--instruction=--",
        "--",
        "--model",
        "x",
    ]);
    assert.equal(equals?.options.instruction, "--");
    assert.deepEqual(equals?.adapterArgs, ["--model", "x"]);
});
