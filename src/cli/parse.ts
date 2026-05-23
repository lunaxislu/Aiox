import { Command, CommanderError } from "commander";

import type { AgentKind } from "../core/agent-kind.js";

export type ParsedCommand = {
  kind: "daemon-start";
} | {
  kind: "daemon-stop";
  daemonOnly: boolean;
} | {
  kind: "daemon-restart";
} | {
  kind: "daemon-status";
} | {
  kind: "help";
  text: string;
} | {
  kind: "version";
  value: string;
} | {
  kind: "agent-attach";
  agentKind: AgentKind;
  name: string;
  pairName?: string;
  resumeSessionId?: string;
} | {
  kind: "connect";
  sourceName: string;
  targetNames: string[];
} | {
  kind: "disconnect";
  sourceName: string;
  targetNames: string[];
} | {
  kind: "pair-create";
  name: string;
} | {
  kind: "status";
} | {
  kind: "global-stop";
} | {
  kind: "doctor";
} | {
  kind: "mcp-codex";
} | {
  // Hidden command: long-running daemon process entry point.
  // Spawned by `aiox daemon start` as a detached child; not shown in help.
  kind: "_run-daemon";
  socketPath: string;
};

const defaultCliVersion = "1.0.0";
const parseErrorExitCode = 1;

export interface ParseCliOptions {
  version?: string;
}

interface CreateProgramOptions {
  version: string;
  output: string[];
  setParsed: (command: ParsedCommand) => void;
}

export class CliParseError extends Error {
  readonly code: string;
  readonly exitCode: number;

  constructor(message: string, options: { code: string; exitCode: number }) {
    super(message);
    this.name = "CliParseError";
    this.code = options.code;
    this.exitCode = options.exitCode;
  }
}

export function parseCli(argv: string[], options: ParseCliOptions = {}): ParsedCommand {
  let parsed: ParsedCommand | undefined;
  const output: string[] = [];
  const program = createProgram({
    version: options.version ?? defaultCliVersion,
    output,
    setParsed: (command) => {
      parsed = command;
    },
  });

  try {
    program.parse(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === "commander.helpDisplayed" && includesHelpFlag(argv)) {
        // Help is multi-line user-facing output, so preserve commander formatting.
        return { kind: "help", text: output.join("") };
      }

      if (error.code === "commander.version" && includesVersionFlag(argv)) {
        // Version is a scalar value for callers, not a formatted output block.
        return { kind: "version", value: output.join("").trim() };
      }

      throw new CliParseError(error.message, {
        code: normalizeCommanderErrorCode(error.code),
        exitCode: error.exitCode,
      });
    }

    throw error;
  }

  if (!parsed) {
    throw new CliParseError("No command parsed", {
      code: "aiox.missingCommand",
      exitCode: parseErrorExitCode,
    });
  }

  return parsed;
}

function normalizeCommanderErrorCode(code: string): string {
  if (code === "commander.help" || code === "commander.helpDisplayed") {
    // A missing nested subcommand can surface as commander help; explicit help is handled earlier.
    return "aiox.missingCommand";
  }

  if (code.startsWith("commander.")) {
    return `aiox.${code.slice("commander.".length)}`;
  }

  return code;
}

function includesHelpFlag(argv: readonly string[]): boolean {
  // Intentional argv-wide check: subcommand help is still a successful help parse result.
  return argv.includes("--help") || argv.includes("-h");
}

function includesVersionFlag(argv: readonly string[]): boolean {
  return argv.includes("--version") || argv.includes("-V");
}

function requireNonEmptyName(value: string): string {
  if (value.trim().length === 0) {
    throw new CliParseError("Name must not be empty", {
      code: "aiox.invalidName",
      exitCode: parseErrorExitCode,
    });
  }

  if (/[\x00-\x1F\x7F]/.test(value)) {
    throw new CliParseError("Name must not contain control characters", {
      code: "aiox.invalidName",
      exitCode: parseErrorExitCode,
    });
  }

  return value;
}

function createProgram({ version, output, setParsed }: CreateProgramOptions): Command {
  const program = new Command();

  program
    .name("aiox")
    .description("aiox - local agent orchestrator")
    .usage("[options] <command>")
    .version(version)
    .exitOverride()
    .configureOutput({
      writeOut: (value) => {
        output.push(value);
      },
      writeErr: () => {},
    });

  const daemon = program.command("daemon").description("Manage daemon lifecycle: daemon start, stop, restart, status");

  daemon
    .command("start")
    .description("Start the daemon if absent")
    .action(() => {
      setParsed({ kind: "daemon-start" });
    });

  daemon
    .command("stop")
    .description("Stop the daemon and daemon-owned child processes")
    .option("--daemon-only")
    .action((options: { daemonOnly?: boolean }) => {
      setParsed({ kind: "daemon-stop", daemonOnly: options.daemonOnly === true });
    });

  daemon
    .command("restart")
    .description("Restart the daemon")
    .action(() => {
      setParsed({ kind: "daemon-restart" });
    });

  daemon
    .command("status")
    .description("Show daemon pid, socket, database, uptime, and version")
    .action(() => {
      setParsed({ kind: "daemon-status" });
    });

  addAgentAttachCommand(program, "codex", setParsed);
  addAgentAttachCommand(program, "claude", setParsed);
  addRoutingCommand(program, "connect", setParsed);
  addRoutingCommand(program, "disconnect", setParsed);
  addPairCommand(program, setParsed);
  addGlobalCommands(program, setParsed);

  return program;
}

function addAgentAttachCommand(
  program: Command,
  agentKind: AgentKind,
  setParsed: (command: ParsedCommand) => void,
): void {
  const command = program
    .command(agentKind)
    .description(`Attach ${agentKind} --name <name> [--pair <pair-name>]`)
    .requiredOption("--name <name>")
    .option("--pair <pair-name>");

  if (agentKind === "codex") {
    command.option("--resume <session-id>");
  }

  command
    .action((options: { name: string; pair?: string; resume?: string }) => {
      const name = requireNonEmptyName(options.name);
      const pairName = options.pair === undefined ? undefined : requireNonEmptyName(options.pair);
      const resumeSessionId =
        options.resume === undefined ? undefined : requireNonEmptyName(options.resume);

      setParsed(
        {
          kind: "agent-attach",
          agentKind,
          name,
          ...(pairName === undefined ? {} : { pairName }),
          ...(resumeSessionId === undefined ? {} : { resumeSessionId }),
        },
      );
    });
}

function addRoutingCommand(
  program: Command,
  kind: "connect" | "disconnect",
  setParsed: (command: ParsedCommand) => void,
): void {
  program
    .command(`${kind} <source> [target...]`)
    .description(`${kind} <source> <target...> directed routes`)
    .action((source: string, targets: string[]) => {
      if (targets.length === 0) {
        throw new CliParseError("At least one target is required", {
          code: "aiox.missingTargets",
          exitCode: parseErrorExitCode,
        });
      }

      setParsed({
        kind,
        sourceName: requireNonEmptyName(source),
        targetNames: targets.map(requireNonEmptyName),
      });
    });
}

function addPairCommand(program: Command, setParsed: (command: ParsedCommand) => void): void {
  program
    .command("pair")
    .description("Create a durable pair reservation with --name <pair-name>")
    .requiredOption("--name <pair-name>")
    .action((options: { name: string }) => {
      setParsed({ kind: "pair-create", name: requireNonEmptyName(options.name) });
    });
}

function addGlobalCommands(program: Command, setParsed: (command: ParsedCommand) => void): void {
  program
    .command("status")
    .description("Show daemon, agents, pairs, routes, messages, and deliveries")
    .action(() => {
      setParsed({ kind: "status" });
    });

  program
    .command("stop")
    .description("Shortcut for daemon stop")
    .action(() => {
      setParsed({ kind: "global-stop" });
    });

  program
    .command("doctor")
    .description("Check local runtime, agent CLIs, SQLite, and daemon paths")
    .action(() => {
      setParsed({ kind: "doctor" });
    });

  program
    .command("mcp-codex", { hidden: true })
    .description("(internal) Run the launch-scoped Codex MCP server over stdio")
    .action(() => {
      setParsed({ kind: "mcp-codex" });
    });

  program
    .command("_run-daemon", { hidden: true })
    .description("(internal) Long-running daemon process entry point; spawned by daemon start")
    .requiredOption("--socket <path>", "daemon socket path")
    .action((options: { socket: string }) => {
      setParsed({ kind: "_run-daemon", socketPath: options.socket });
    });
}
