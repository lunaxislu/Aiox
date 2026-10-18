import type { ParseOptions } from "commander";
import {
    Command,
    CommanderError,
    InvalidArgumentError,
    Option,
} from "commander";

import { failedHostRequest, hostSelection } from "@/host-input";
import type { CliOptions, CliPort, CliRequest, CommandName } from "@/requests";

class AioxCommand extends Command {
    suppliedArgs: readonly string[] = [];
    hostFailure?: (request: CliRequest) => Promise<void>;
    userArgs: readonly string[] = [];
    override async parseAsync(
        argv: readonly string[] = process.argv,
        options?: ParseOptions,
    ): Promise<this> {
        this.suppliedArgs = argv;
        this.userArgs =
            options?.from === "user"
                ? argv
                : argv.slice(options?.from === "electron" ? 1 : 2);
        try {
            return await super.parseAsync(argv, options);
        } catch (error) {
            if (
                this.userArgs[0] !== "host" ||
                !(error instanceof CommanderError) ||
                error.exitCode === 0 ||
                !this.hostFailure
            )
                throw error;
            await this.hostFailure(
                failedHostRequest(this.userArgs, error.message),
            );
            return this;
        }
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
    cli.hostFailure = async (request) => {
        const result = await port.execute(request);
        if (result !== undefined) output(result);
    };
    const bind = (
        command: Command,
        name: CommandName,
        adapterArguments = false,
    ): Command => {
        command.action(async (...values: unknown[]) => {
            const active = values.at(-1) as Command;
            const options = active.optsWithGlobals<CliOptions>();
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
            const cliErrors: string[] = [];
            if (
                ["block", "unblock", "reset"].some((verb) =>
                    name.endsWith(`.${verb}`),
                )
            ) {
                try {
                    validateRoute(options);
                } catch (error) {
                    if (!name.startsWith("host.")) throw error;
                    cliErrors.push(
                        error instanceof Error ? error.message : String(error),
                    );
                }
            }
            const selection = name.startsWith("host.")
                ? hostSelection(cli.userArgs)
                : undefined;
            const result = await port.execute({
                command: name,
                args,
                options,
                ...(adapterArgs === undefined ? {} : { adapterArgs }),
                ...(cliErrors.length ? { cliErrors } : {}),
                ...(selection?.errors.length
                    ? { selectionErrors: selection.errors }
                    : {}),
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

    const host = cli
        .command("host")
        .description("Manage manifest-based hosts")
        .configureOutput({ writeErr() {} });
    const source = (command: Command) =>
        command.option("--path <directory>").option("--file <yaml>");
    const layout = (command: Command) =>
        command
            .option("--layout <preset>")
            .option("--columns <columns>")
            .option("--rows <rows>");
    bind(layout(source(host)), "host.run");
    bind(layout(source(host.command("run"))), "host.run");
    bind(host.command("list").option("--json"), "host.list");
    bind(
        source(host.command("status [hostname]")).option("--json"),
        "host.status",
    );
    for (const verb of ["stop", "delete"] as const)
        bind(source(host.command(`${verb} [hostname]`)), `host.${verb}`);
    bind(source(host.command("restart")), "host.restart");
    const hostAgent = host.command("agent");
    for (const verb of ["start", "stop", "restart"] as const)
        bind(
            source(hostAgent.command(`${verb} <agent-names...>`)),
            `host.agent.${verb}`,
        );
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
