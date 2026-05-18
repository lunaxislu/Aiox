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

  it("parses help output as a successful command result", () => {
    const parsed = parseCli(["--help"]);

    expect(parsed).toMatchObject({
      kind: "help",
    });
    expect(parsed.kind === "help" ? parsed.text : "").toContain("Usage: aiox");
    expect(parsed.kind === "help" ? parsed.text : "").toMatch(/\n$/);
  });

  it("parses version output as a successful command result", () => {
    expect(parseCli(["--version"])).toEqual({
      kind: "version",
      value: "1.0.0",
    });
  });

  it("parses injected version output", () => {
    expect(parseCli(["--version"], { version: "9.9.9" })).toEqual({
      kind: "version",
      value: "9.9.9",
    });
  });

  it("trims the single-line version output", () => {
    const parsed = parseCli(["--version"]);

    expect(parsed.kind === "version" ? parsed.value : "").not.toMatch(/\n$/);
  });

  it("parses codex attach with a name", () => {
    expect(parseCli(["codex", "--name", "impl"])).toEqual({
      kind: "agent-attach",
      agentKind: "codex",
      name: "impl",
    });
  });

  it("parses codex attach with a pair name", () => {
    expect(parseCli(["codex", "--name", "impl", "--pair", "feature-x"])).toEqual({
      kind: "agent-attach",
      agentKind: "codex",
      name: "impl",
      pairName: "feature-x",
    });
  });

  it("parses claude attach with a name", () => {
    expect(parseCli(["claude", "--name", "review"])).toEqual({
      kind: "agent-attach",
      agentKind: "claude",
      name: "review",
    });
  });

  it("parses claude attach with a pair name", () => {
    expect(parseCli(["claude", "--name", "review", "--pair", "feature-y"])).toEqual({
      kind: "agent-attach",
      agentKind: "claude",
      name: "review",
      pairName: "feature-y",
    });
  });

  it("rejects codex attach without a name option", () => {
    expect(() => parseCli(["codex"])).toThrow(CliParseError);
  });

  it("rejects codex attach without a name value", () => {
    expect(() => parseCli(["codex", "--name"])).toThrow(CliParseError);
  });

  it("rejects claude attach without a pair value", () => {
    expect(() => parseCli(["claude", "--name", "impl", "--pair"])).toThrow(CliParseError);
  });

  it("rejects an empty agent attach name", () => {
    expectCliParseError(["codex", "--name", ""], "aiox.invalidName");
  });

  it("parses connect with multiple targets", () => {
    expect(parseCli(["connect", "a", "b", "c"])).toEqual({
      kind: "connect",
      sourceName: "a",
      targetNames: ["b", "c"],
    });
  });

  it("parses connect with one target", () => {
    expect(parseCli(["connect", "a", "b"])).toEqual({
      kind: "connect",
      sourceName: "a",
      targetNames: ["b"],
    });
  });

  it("parses disconnect with multiple targets", () => {
    expect(parseCli(["disconnect", "a", "b", "c"])).toEqual({
      kind: "disconnect",
      sourceName: "a",
      targetNames: ["b", "c"],
    });
  });

  it("rejects connect without positionals", () => {
    expect(() => parseCli(["connect"])).toThrow(CliParseError);
  });

  it("rejects connect without targets", () => {
    expectCliParseError(["connect", "a"], "aiox.missingTargets");
  });

  it("rejects disconnect without targets", () => {
    expectCliParseError(["disconnect", "a"], "aiox.missingTargets");
  });

  it("rejects an empty routing source name", () => {
    expectCliParseError(["connect", "", "b"], "aiox.invalidName");
  });

  it("rejects an empty routing target name", () => {
    expectCliParseError(["connect", "a", ""], "aiox.invalidName");
  });

  it("parses pair create with a name", () => {
    expect(parseCli(["pair", "--name", "feature-x"])).toEqual({
      kind: "pair-create",
      name: "feature-x",
    });
  });

  it("rejects pair create without a name option", () => {
    expect(() => parseCli(["pair"])).toThrow(CliParseError);
  });

  it("rejects pair create without a name value", () => {
    expect(() => parseCli(["pair", "--name"])).toThrow(CliParseError);
  });

  it("rejects pair create with an empty name", () => {
    expectCliParseError(["pair", "--name", ""], "aiox.invalidName");
  });

  it("parses global status", () => {
    expect(parseCli(["status"])).toEqual({
      kind: "status",
    });
  });

  it("parses global stop", () => {
    expect(parseCli(["stop"])).toEqual({
      kind: "global-stop",
    });
  });

  it("parses doctor", () => {
    expect(parseCli(["doctor"])).toEqual({
      kind: "doctor",
    });
  });

  it("rejects an unknown global status flag", () => {
    expectCliParseError(["status", "--bogus"], "aiox.unknownOption");
  });

  it("rejects global stop with an extra positional", () => {
    expect(() => parseCli(["stop", "extra"])).toThrow(CliParseError);
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
