import type { ParseOptions } from "commander";
import { Command, InvalidArgumentError, Option } from "commander";

import type { CliOptions, CliPort, CommandName } from "@/requests";

class AioxCommand extends Command {
    suppliedArgs: readonly string[] = [];
    override async parseAsync(
        argv: readonly string[] = process.argv,
        options?: ParseOptions,
    ): Promise<this> {
        this.suppliedArgs = argv;
        return super.parseAsync(argv, options);
    }
}

/** Required option operands may themselves be "--"; only an unconsumed token ends AIOX parsing. */
function adapterBoundary(argv: readonly string[], command: Command): number {
    const options: Option[] = [];
    for (
        let current: Command | null = command;
        current;
        current = current.parent
    ) {
        options.push(...current.options);
    }
    for (let index = 0; index < argv.length; index++) {
        const token = argv[index];
        if (token === "--") return index;
        if (
            options.some(
                (option) =>
                    option.required &&
                    (option.long === token || option.short === token),
            )
        ) {
            index++;
        }
    }
    return -1;
}

function portNumber(value: string): number {
    if (!/^\d+$/.test(value))
        throw new InvalidArgumentError("Port must be an integer");
    return Number(value);
}

function singleNetwork(value: string, previous: string | undefined): string {
    if (previous !== undefined)
        throw new InvalidArgumentError("--network may only be supplied once");
    return value;
}

function metadata(command: Command): Command {
    return command
        .option("--name <name>", "Agent name")
        .addOption(
            new Option("--network <network>", "Single network").argParser(
                singleNetwork,
            ),
        )
        .option("--role <role>", "Agent role")
        .option("--description <description>", "Agent description")
        .option("--instruction <instruction>", "Runtime instruction");
}

function routing(command: Command): Command {
    return command
        .option(
            "--between <agents...>",
            "Apply to all directed pairs between agents",
        )
        .option("--from <agent>", "Directed route source")
        .option("--to <agents...>", "Directed route targets");
}

function validateRoute(options: CliOptions): void {
    if ((options.between !== undefined) === (options.from !== undefined))
        throw new Error("Specify either --between or --from with --to");
    if (options.from !== undefined && !options.to?.length)
        throw new Error("--to is required with --from");
    if (options.from === undefined && options.to !== undefined)
        throw new Error("--to requires --from");
    if (options.between && new Set(options.between).size < 2)
        throw new Error(
            "A between operation requires at least two distinct agents",
        );
    if (options.from !== undefined && options.to?.includes(options.from))
        throw new Error("A route cannot target its source");
}

export function createCli(
    port: CliPort,
    output: (value: unknown) => void = () => {},
): Command {
    const cli = new AioxCommand()
        .name("aiox")
        .description("Run and connect vendor TUIs through AIOX")
        .version("0.0.0")
        .exitOverride();
    const bind = (
        command: Command,
        name: CommandName,
        adapterArguments = false,
    ): Command => {
        command.action(async (...values: unknown[]) => {
            const active = values.at(-1) as Command;
            const options = active.opts<CliOptions>();
            const args = values
                .slice(0, -2)
                .filter((value) => value !== undefined) as (
                | string
                | string[]
            )[];
            let adapterArgs: string[] | undefined;
            if (adapterArguments) {
                adapterArgs = (args.pop() as string[] | undefined) ?? [];
                const raw = cli.suppliedArgs;
                const boundary = adapterBoundary(raw, active);
                const forwarded =
                    boundary === -1 ? [] : raw.slice(boundary + 1);
                if (
                    adapterArgs.length !== forwarded.length ||
                    adapterArgs.some(
                        (value, index) => value !== forwarded[index],
                    )
                ) {
                    throw new Error("Adapter arguments must follow --");
                }
            }
            if (
                ["block", "unblock", "reset"].some((verb) =>
                    name.endsWith(`.${verb}`),
                )
            )
                validateRoute(options);
            const result = await port.execute({
                command: name,
                args,
                options,
                ...(adapterArgs === undefined ? {} : { adapterArgs }),
            });
            if (result !== undefined) output(result);
        });
        return command;
    };
    const daemon = cli.command("daemon").description("Manage daemon lifecycle");
    bind(
        daemon
            .command("start")
            .addOption(
                new Option("--port <port>", "Daemon port").argParser(
                    portNumber,
                ),
            )
            .addOption(
                new Option("--web-port <port>", "Web port").argParser(
                    portNumber,
                ),
            ),
        "daemon.start",
    );
    bind(
        daemon
            .command("stop")
            .description(
                "Stop daemon. On native Windows, interrupts daemon-owned work. Elsewhere, refuses while daemon-owned work remains. External CLI vendors keep running.",
            )
            .option(
                "--force",
                "Terminate daemon-owned executions on all platforms. External CLI vendors keep running",
            ),
        "daemon.stop",
    );
    bind(
        daemon
            .command("restart")
            .description(
                "Stop then start daemon. On native Windows, interrupts daemon-owned work. Elsewhere, refuses while daemon-owned work remains. External CLI vendors keep running.",
            ),
        "daemon.restart",
    );
    bind(daemon.command("status").option("--json"), "daemon.status");

    const adapter = cli.command("adapter").description("Manage adapters");
    bind(adapter.command("install <package>"), "adapter.install");
    bind(adapter.command("uninstall <adapter>"), "adapter.uninstall");
    bind(adapter.command("list"), "adapter.list");
    bind(adapter.command("show <adapter>"), "adapter.show");
    bind(
        adapter.command("setup <adapter> [adapterArgs...]"),
        "adapter.setup",
        true,
    );
    bind(adapter.command("doctor [adapter]"), "adapter.doctor");

    const agent = cli.command("agent").description("Run and inspect agents");
    bind(
        metadata(agent.command("run <adapter> [adapterArgs...]")),
        "agent.run",
        true,
    );
    bind(
        agent
            .command("list")
            .addOption(
                new Option("--network <network>").argParser(singleNetwork),
            )
            .option("--host <host>")
            .option("--all")
            .option("--json"),
        "agent.list",
    );
    bind(agent.command("show <agent>").option("--json"), "agent.show");

    const network = cli
        .command("network")
        .description("Manage persistent networks and routes");
    bind(network.command("create <name>"), "network.create");
    bind(network.command("delete <network>"), "network.delete");
    bind(
        network.command("list").option("--all").option("--json"),
        "network.list",
    );
    bind(network.command("show <network>").option("--json"), "network.show");
    for (const verb of ["block", "unblock", "reset"] as const)
        bind(routing(network.command(`${verb} <network>`)), `network.${verb}`);

    const host = cli.command("host").description("Manage manifest-based hosts");
    bind(
        host
            .command("run")
            .option("--path <aiox.yaml>")
            .option("--name <host>")
            .option("--worktree <branch>"),
        "host.run",
    );
    bind(host.command("list").option("--json"), "host.list");
    bind(host.command("status <host>").option("--json"), "host.status");
    bind(host.command("stop <host>"), "host.stop");
    const hostAgent = host.command("agent");
    bind(hostAgent.command("start <host> <agents...>"), "host.agent.start");
    bind(hostAgent.command("stop <host> <agents...>"), "host.agent.stop");
    const hostNetwork = host.command("network");
    bind(
        hostNetwork.command("list <host>").option("--json"),
        "host.network.list",
    );
    bind(
        hostNetwork.command("show <host> <network>").option("--json"),
        "host.network.show",
    );
    for (const verb of ["block", "unblock", "reset"] as const)
        bind(
            routing(hostNetwork.command(`${verb} <host> <network>`)).option(
                "--json",
            ),
            `host.network.${verb}`,
        );
    bind(cli.command("status").option("--json"), "status");
    bind(cli.command("doctor").option("--json"), "doctor");
    return cli;
}
