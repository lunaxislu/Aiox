export type ParsedCliCommand =
  | { kind: "start"; noOpen: boolean; port?: number }
  | { kind: "open" }
  | { kind: "status"; json: boolean }
  | { kind: "stop"; force: boolean }
  | { kind: "doctor"; json: boolean };

function parsePort(value: string | undefined): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("--port requires an integer from 1 to 65535");
  }
  return port;
}

export function parseCliCommand(args: readonly string[]): ParsedCliCommand {
  const [command, ...flags] = args;
  switch (command) {
    case "start": {
      let noOpen = false;
      let port: number | undefined;
      for (let index = 0; index < flags.length; index += 1) {
        const flag = flags[index];
        if (flag === "--no-open") noOpen = true;
        else if (flag === "--port") port = parsePort(flags[++index]);
        else throw new Error(`Unknown start option: ${flag}`);
      }
      return port === undefined
        ? { kind: "start", noOpen }
        : { kind: "start", noOpen, port };
    }
    case "open":
      if (flags.length > 0) throw new Error(`Unknown open option: ${flags[0]}`);
      return { kind: "open" };
    case "status":
      if (flags.some((flag) => flag !== "--json")) {
        throw new Error(`Unknown status option: ${flags[0]}`);
      }
      return { kind: "status", json: flags.includes("--json") };
    case "stop":
      if (flags.some((flag) => flag !== "--force")) {
        throw new Error(`Unknown stop option: ${flags[0]}`);
      }
      return { kind: "stop", force: flags.includes("--force") };
    case "doctor":
      if (flags.some((flag) => flag !== "--json")) {
        throw new Error(`Unknown doctor option: ${flags[0]}`);
      }
      return { kind: "doctor", json: flags.includes("--json") };
    default:
      throw new Error(
        "Usage: aiox <start|open|status|stop|doctor> [options]",
      );
  }
}
