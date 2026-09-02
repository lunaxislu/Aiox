import type { CliOperations } from "./operations.js";
import type { ParsedCliCommand } from "./parse.js";

export interface CliOutput {
  stdout(message: string): void;
  stderr(message: string): void;
}

export async function runCliCommand(
  command: ParsedCliCommand,
  operations: CliOperations,
  output: CliOutput,
): Promise<number> {
  try {
    switch (command.kind) {
      case "start": {
        const result = await operations.start(command);
        output.stdout(
          `Local Server ${result.started ? "started" : "already running"} at ${result.endpoint.origin}`,
        );
        return 0;
      }
      case "open": {
        const result = await operations.open();
        output.stdout(`Opened ${result.endpoint.origin}`);
        return 0;
      }
      case "status": {
        const result = await operations.status();
        output.stdout(
          command.json
            ? JSON.stringify(result)
            : result.running
              ? `Local Server ${result.snapshot.server.lifecycle} at ${result.endpoint.origin}`
              : "Local Server not running",
        );
        return result.running ? 0 : 1;
      }
      case "stop": {
        const result = await operations.stop(command);
        output.stdout(JSON.stringify(result));
        return result.accepted ? 0 : 1;
      }
      case "doctor": {
        const result = await operations.doctor();
        output.stdout(
          command.json
            ? JSON.stringify(result)
            : result.checks
                .map((check) =>
                  `${check.component}: ${check.status}${check.message ? ` (${check.message})` : ""}`,
                )
                .join("\n"),
        );
        return result.ok ? 0 : 1;
      }
    }
  } catch (error) {
    output.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
