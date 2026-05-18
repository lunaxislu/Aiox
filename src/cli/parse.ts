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
};

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
  const program = createProgram((command) => {
    parsed = command;
  });

  try {
    program.parse(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      throw new CliParseError(error.message, {
        code: error.code,
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

function createProgram(setParsed: (command: ParsedCommand) => void): Command {
  const program = new Command();

  program
    .name("aiox")
    .exitOverride()
    .configureOutput({
      writeOut: () => {},
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
