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
    expect(() => parseCli(["daemon"])).toThrow(CliParseError);
  });

  it("rejects an unknown daemon subcommand", () => {
    expect(() => parseCli(["daemon", "unknown"])).toThrow(CliParseError);
  });

  it("rejects an unknown daemon stop flag", () => {
    expect(() => parseCli(["daemon", "stop", "--bogus"])).toThrow(CliParseError);
  });
});
