import { Command, CommanderError } from "commander";

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
} | {
  kind: "connect";
  sourceName: string;
  targetNames: string[];
} | {
  kind: "disconnect";
  sourceName: string;
  targetNames: string[];
};

const cliVersion = "1.0.0";

type AgentKind = "codex" | "claude";

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

export function parseCli(argv: string[]): ParsedCommand {
  let parsed: ParsedCommand | undefined;
  const output: string[] = [];
  const program = createProgram(output, (command) => {
    parsed = command;
  });

  try {
    program.parse(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === "commander.helpDisplayed" && includesHelpFlag(argv)) {
        return { kind: "help", text: output.join("") };
      }

      if (error.code === "commander.version" && includesVersionFlag(argv)) {
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
      exitCode: 1,
    });
  }

  return parsed;
}

function normalizeCommanderErrorCode(code: string): string {
  if (code === "commander.help" || code === "commander.helpDisplayed") {
    return "aiox.missingCommand";
  }

  if (code.startsWith("commander.")) {
    return `aiox.${code.slice("commander.".length)}`;
  }

  return code;
}

function includesHelpFlag(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}

function includesVersionFlag(argv: readonly string[]): boolean {
  return argv.includes("--version") || argv.includes("-V");
}

function requireNonEmptyName(value: string): string {
  if (value.trim().length === 0) {
    throw new CliParseError("Name must not be empty", {
      code: "aiox.invalidName",
      exitCode: 1,
    });
  }

  return value;
}

function createProgram(output: string[], setParsed: (command: ParsedCommand) => void): Command {
  const program = new Command();

  program
    .name("aiox")
    .version(cliVersion)
    .exitOverride()
    .configureOutput({
      writeOut: (value) => {
        output.push(value);
      },
      writeErr: () => {},
    });

  const daemon = program.command("daemon");

  daemon.command("start").action(() => {
    setParsed({ kind: "daemon-start" });
  });

  daemon
    .command("stop")
    .option("--daemon-only")
    .action((options: { daemonOnly?: boolean }) => {
      setParsed({ kind: "daemon-stop", daemonOnly: options.daemonOnly === true });
    });

  daemon.command("restart").action(() => {
    setParsed({ kind: "daemon-restart" });
  });

  daemon.command("status").action(() => {
    setParsed({ kind: "daemon-status" });
  });

  addAgentAttachCommand(program, "codex", setParsed);
  addAgentAttachCommand(program, "claude", setParsed);
  addRoutingCommand(program, "connect", setParsed);
  addRoutingCommand(program, "disconnect", setParsed);

  return program;
}

function addAgentAttachCommand(
  program: Command,
  agentKind: AgentKind,
  setParsed: (command: ParsedCommand) => void,
): void {
  program
    .command(agentKind)
    .requiredOption("--name <name>")
    .option("--pair <pair-name>")
    .action((options: { name: string; pair?: string }) => {
      const name = requireNonEmptyName(options.name);
      const pairName = options.pair === undefined ? undefined : requireNonEmptyName(options.pair);

      setParsed(
        pairName === undefined
          ? { kind: "agent-attach", agentKind, name }
          : { kind: "agent-attach", agentKind, name, pairName },
      );
    });
}

function addRoutingCommand(
  program: Command,
  kind: "connect" | "disconnect",
  setParsed: (command: ParsedCommand) => void,
): void {
  program.command(`${kind} <source> [target...]`).action((source: string, targets: string[]) => {
    if (targets.length === 0) {
      throw new CliParseError("At least one target is required", {
        code: "aiox.missingTargets",
        exitCode: 1,
      });
    }

    setParsed({
      kind,
      sourceName: requireNonEmptyName(source),
      targetNames: targets.map(requireNonEmptyName),
    });
  });
}
