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

const routeOperations = [
    "default",
    "resetDefault",
    "allowBetween",
    "denyBetween",
    "resetBetween",
    "allowFrom",
    "denyFrom",
    "resetFrom",
] as const;

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

function routing(command: Command, host: boolean): Command {
    command.addOption(
        new Option("--default <policy>", "Default routing policy").choices([
            "allow",
            "deny",
        ]),
    );
    if (host)
        command.option("--reset-default", "Remove runtime default override");
    for (const operation of ["allow", "deny", "reset"]) {
        command
            .option(
                `--${operation}-between <agents...>`,
                `${operation} both directions`,
            )
            .option(
                `--${operation}-from <agent>`,
                `${operation} outgoing routes`,
            );
    }
    return command.option("--to <agents...>", "Directed route targets");
}

function validateRoute(options: CliOptions): void {
    const operations = routeOperations.filter(
        (key) => options[key] !== undefined,
    );
    if (operations.length !== 1)
        throw new Error("Specify exactly one routing operation");
    const from = options.allowFrom ?? options.denyFrom ?? options.resetFrom;
    if (from !== undefined && !options.to?.length)
        throw new Error("--to is required with a directed routing operation");
    if (from === undefined && options.to !== undefined)
        throw new Error(
            "--to requires --allow-from, --deny-from, or --reset-from",
        );
    const between =
        options.allowBetween ?? options.denyBetween ?? options.resetBetween;
    if (between && new Set(between).size < 2)
        throw new Error(
            "A between operation requires at least two distinct agents",
        );
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
            if (name.endsWith(".route")) validateRoute(options);
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
    bind(daemon.command("start"), "daemon.start");
    bind(
        daemon
            .command("stop")
            .option(
                "--force",
                "Terminate all AIOX-managed executions, then stop daemon",
            ),
        "daemon.stop",
    );
    bind(daemon.command("restart"), "daemon.restart");
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
    bind(
        network
            .command("create <name>")
            .addOption(
                new Option("--default <policy>")
                    .choices(["allow", "deny"])
                    .default("allow"),
            ),
        "network.create",
    );
    bind(network.command("delete <network>"), "network.delete");
    bind(
        network.command("list").option("--all").option("--json"),
        "network.list",
    );
    bind(network.command("show <network>").option("--json"), "network.show");
    bind(routing(network.command("route <network>"), false), "network.route");

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
    bind(
        metadata(
            hostAgent
                .command("add <host> [adapterArgs...]")
                .requiredOption("--adapter <adapter>"),
        ),
        "host.agent.add",
        true,
    );
    bind(hostAgent.command("stop <host> <agents...>"), "host.agent.stop");
    bind(hostAgent.command("remove <host> <agents...>"), "host.agent.remove");
    const hostNetwork = host.command("network");
    bind(
        hostNetwork.command("list <host>").option("--json"),
        "host.network.list",
    );
    bind(
        hostNetwork.command("show <host> <network>").option("--json"),
        "host.network.show",
    );
    bind(
        routing(hostNetwork.command("route <host> <network>"), true).option(
            "--json",
        ),
        "host.network.route",
    );
    bind(cli.command("status").option("--json"), "status");
    bind(cli.command("doctor").option("--json"), "doctor");
    return cli;
}
