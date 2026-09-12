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

test("host agent membership commands are start and stop only", async () => {
    for (const args of [
        ["host", "agent", "add", "review", "--adapter", "codex"],
        ["host", "agent", "remove", "review", "reviewer"],
        ["host", "agent", "start", "review"],
        ["host", "agent", "stop", "review"],
    ])
        await assert.rejects(parse(args));
    for (const verb of ["start", "stop"]) {
        assert.deepEqual(
            (await parse(["host", "agent", verb, "review", "one"]))[0],
            {
                command: `host.agent.${verb}`,
                args: ["review", ["one"]],
                options: {},
            },
        );
        assert.deepEqual(
            (await parse(["host", "agent", verb, "review", "one", "two"]))[0]
                ?.args,
            ["review", ["one", "two"]],
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

test("route validates exclusive operations and directed operands before dispatch", async () => {
    for (const args of [
        [],
        ["--allow-from", "a"],
        ["--to", "a"],
        ["--allow-between", "a"],
        ["--default", "allow", "--deny-between", "a", "b"],
    ]) {
        await assert.rejects(parse(["network", "route", "review", ...args]));
    }
    const [request] = await parse([
        "network",
        "route",
        "review",
        "--allow-from",
        "a",
        "--to",
        "b",
        "c",
    ]);
    assert.deepEqual(request?.options, { allowFrom: "a", to: ["b", "c"] });
});

test("host worktree, single network, instruction and force reach application boundary", async () => {
    assert.deepEqual(
        (
            await parse([
                "host",
                "run",
                "--worktree",
                "feature",
                "--name",
                "review",
            ])
        )[0]?.options,
        { worktree: "feature", name: "review" },
    );
    assert.equal(
        (await parse(["daemon", "stop", "--force"]))[0]?.options.force,
        true,
    );
    assert.equal(
        (
            await parse([
                "host",
                "network",
                "route",
                "review",
                "one",
                "--reset-default",
            ])
        )[0]?.options.resetDefault,
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

test("shutdown help exposes Windows work interruption and external force termination", () => {
    const cli = createCli({ execute: async () => {} });
    const daemon = cli.commands.find((command) => command.name() === "daemon")!;
    for (const name of ["stop", "restart"]) {
        const help = daemon.commands
            .find((command) => command.name() === name)!
            .helpInformation();
        assert.match(help, /Windows/);
        assert.match(help, /interrupts running work/);
        assert.match(help, /external CLI/);
    }
    const stop = daemon.commands.find((command) => command.name() === "stop")!;
    assert.match(
        stop.options.find((option) => option.long === "--force")!.description,
        /external CLI.*all platforms/,
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
