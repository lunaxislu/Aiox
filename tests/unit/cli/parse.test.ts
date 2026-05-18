import { describe, expect, it } from "vitest";

import { CliParseError, parseCli } from "../../../src/cli/parse.js";

describe("CLI parser", () => {
  it("parses daemon start", () => {
    expect(parseCli(["daemon", "start"])).toEqual({
      kind: "daemon-start",
    });
  });

  it("parses daemon stop", () => {
    expect(parseCli(["daemon", "stop"])).toEqual({
      kind: "daemon-stop",
      daemonOnly: false,
    });
  });

  it("parses daemon stop with daemon-only", () => {
    expect(parseCli(["daemon", "stop", "--daemon-only"])).toEqual({
      kind: "daemon-stop",
      daemonOnly: true,
    });
  });

  it("parses daemon restart", () => {
    expect(parseCli(["daemon", "restart"])).toEqual({
      kind: "daemon-restart",
    });
  });

  it("parses daemon status", () => {
    expect(parseCli(["daemon", "status"])).toEqual({
      kind: "daemon-status",
    });
  });

  it("rejects daemon without a subcommand", () => {
    expectCliParseError(["daemon"], "aiox.missingCommand");
  });

  it("rejects an unknown daemon subcommand", () => {
    expectCliParseError(["daemon", "unknown"], "aiox.unknownCommand");
  });

  it("rejects an unknown daemon stop flag", () => {
    expectCliParseError(["daemon", "stop", "--bogus"], "aiox.unknownOption");
  });
});

function expectCliParseError(argv: string[], code: string): void {
  try {
    parseCli(argv);
  } catch (error) {
    expect(error).toBeInstanceOf(CliParseError);
    expect((error as CliParseError).code).toBe(code);
    return;
  }

  throw new Error(`Expected parseCli(${JSON.stringify(argv)}) to throw`);
}
