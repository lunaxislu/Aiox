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
};

const cliVersion = "1.0.0";

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

  return program;
}
