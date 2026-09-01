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

  it("includes root and command descriptions in help output", () => {
    const parsed = parseCli(["--help"]);
    const text = parsed.kind === "help" ? parsed.text : "";

    expect(text).toContain("aiox - local agent orchestrator");
    expect(text).toContain("daemon start");
    expect(text).toContain("codex --name");
    expect(text).toContain("connect <source> <target...>");
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

  it("parses the internal host-qualified selector without exposing it in help", () => {
    expect(parseCli(["codex", "--name", "impl", "--host-id", "host-1"])).toEqual({
      kind: "agent-attach",
      agentKind: "codex",
      name: "impl",
      hostId: "host-1",
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

  it("parses codex attach with an explicit resume session id", () => {
    expect(parseCli(["codex", "--name", "impl", "--resume", "thread-1"])).toEqual({
      kind: "agent-attach",
      agentKind: "codex",
      name: "impl",
      resumeSessionId: "thread-1",
    });
  });

  it("rejects claude attach with a codex-only resume flag", () => {
    expectCliParseError(
      ["claude", "--name", "review", "--resume", "thread-1"],
      "aiox.unknownOption",
    );
  });

  it("shows the codex resume flag in command help", () => {
    const parsed = parseCli(["codex", "--help"]);
    const text = parsed.kind === "help" ? parsed.text : "";

    expect(text).toContain("--resume <session-id>");
  });

  it("does not expose the internal host selector in agent command help", () => {
    for (const agentKind of ["codex", "claude"] as const) {
      const parsed = parseCli([agentKind, "--help"]);
      const text = parsed.kind === "help" ? parsed.text : "";

      expect(text).not.toContain("--host-id");
    }
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

  it("parses codex attach with role, description, and instructions", () => {
    expect(
      parseCli([
        "codex",
        "--name",
        "impl",
        "--role",
        "backend",
        "--description",
        "implements the API",
        "--instructions",
        "always run tests before replying",
      ]),
    ).toEqual({
      kind: "agent-attach",
      agentKind: "codex",
      name: "impl",
      role: "backend",
      description: "implements the API",
      instructions: "always run tests before replying",
    });
  });

  it("parses claude attach with role, description, and instructions", () => {
    expect(
      parseCli([
        "claude",
        "--name",
        "review",
        "--role",
        "frontend",
        "--description",
        "reviews UI changes",
        "--instructions",
        "flag accessibility issues",
      ]),
    ).toEqual({
      kind: "agent-attach",
      agentKind: "claude",
      name: "review",
      role: "frontend",
      description: "reviews UI changes",
      instructions: "flag accessibility issues",
    });
  });

  it("rejects codex attach without a name option", () => {
    expectCliParseError(["codex"], "aiox.missingMandatoryOptionValue");
  });

  it("rejects codex attach without a name value", () => {
    expectCliParseError(["codex", "--name"], "aiox.optionMissingArgument");
  });

  it("rejects claude attach without a name option", () => {
    expectCliParseError(["claude"], "aiox.missingRequiredOption");
  });

  it("parses claude setup with the default local scope", () => {
    expect(parseCli(["claude", "setup"])).toEqual({
      kind: "claude-mcp-setup",
      scope: "local",
    });
  });

  it("parses claude setup --scope local", () => {
    expect(parseCli(["claude", "setup", "--scope", "local"])).toEqual({
      kind: "claude-mcp-setup",
      scope: "local",
    });
  });

  it("parses claude setup --scope user", () => {
    expect(parseCli(["claude", "setup", "--scope", "user"])).toEqual({
      kind: "claude-mcp-setup",
      scope: "user",
    });
  });

  it("parses claude setup --scope project", () => {
    expect(parseCli(["claude", "setup", "--scope", "project"])).toEqual({
      kind: "claude-mcp-setup",
      scope: "project",
    });
  });

  it("rejects claude setup with an unsupported scope", () => {
    expectCliParseError(["claude", "setup", "--scope", "bogus"], "aiox.invalidScope");
    expectCliParseError(["claude", "setup", "--scope", "all"], "aiox.invalidScope");
  });

  it("rejects claude setup with an unknown option", () => {
    expectCliParseError(["claude", "setup", "--bogus"], "aiox.unknownOption");
  });

  it("rejects claude setup with excess positional arguments", () => {
    expectCliParseError(["claude", "setup", "extra"], "aiox.excessArguments");
  });

  it("rejects claude attach without a pair value", () => {
    expectCliParseError(["claude", "--name", "impl", "--pair"], "aiox.optionMissingArgument");
  });

  it("rejects an empty agent attach name", () => {
    expectCliParseError(["codex", "--name", ""], "aiox.invalidName");
  });

  it("rejects an empty --role value", () => {
    expectCliParseError(
      ["codex", "--name", "impl", "--role", ""],
      "aiox.invalidOptionValue",
    );
  });

  it("rejects an empty --description value", () => {
    expectCliParseError(
      ["codex", "--name", "impl", "--description", ""],
      "aiox.invalidOptionValue",
    );
  });

  it("rejects an empty --instructions value", () => {
    expectCliParseError(
      ["codex", "--name", "impl", "--instructions", ""],
      "aiox.invalidOptionValue",
    );
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

  it("rejects connect without positionals", () => {
    expectCliParseError(["connect"], "aiox.missingArgument");
  });

  it("rejects connect without targets", () => {
    expectCliParseError(["connect", "a"], "aiox.missingTargets");
  });

  it("rejects an empty routing source name", () => {
    expectCliParseError(["connect", "", "b"], "aiox.invalidName");
  });

  it("rejects an empty routing target name", () => {
    expectCliParseError(["connect", "a", ""], "aiox.invalidName");
  });

  it("parses host with no options (cwd-fixed, no --file)", () => {
    expect(parseCli(["host"])).toEqual({
      kind: "host",
    });
  });

  it("rejects host with an unknown option", () => {
    expectCliParseError(["host", "--file", "other.yaml"], "aiox.unknownOption");
  });

  // Accepted Stage 2 grammar for `aiox host` YAML-path forms, `--list`, and
  // CLI-only create/mutation. These cases now exercise the implemented parser
  // and normalized command contract.

  it("parses host with --path", () => {
    expect(parseCli(["host", "--path", "/tmp/project"])).toEqual({
      kind: "host",
      path: "/tmp/project",
    });
  });

  it("parses host with a name and --path", () => {
    expect(parseCli(["host", "demo", "--path", "/tmp/project"])).toEqual({
      kind: "host",
      name: "demo",
      path: "/tmp/project",
    });
  });

  it("rejects a host name positional without --path", () => {
    expectCliParseError(["host", "demo"], "aiox.missingRequiredOption");
  });

  it("parses host --list", () => {
    expect(parseCli(["host", "--list"])).toEqual({ kind: "host-list" });
  });

  it("rejects host --list with a trailing token", () => {
    expectCliParseError(["host", "--list", "junk"], "aiox.unknownOption");
  });

  it("rejects host --list with a trailing unknown flag", () => {
    expectCliParseError(["host", "--list", "--bogus"], "aiox.unknownOption");
  });

  it("parses host new with agents and named routes", () => {
    expect(
      parseCli([
        "host",
        "new",
        "--name",
        "demo",
        "--agent",
        "claude",
        "--name",
        "reviewer",
        "--role",
        "review",
        "--agent",
        "codex",
        "--name",
        "implementer",
        "--role",
        "implementation",
        "--agent",
        "codex",
        "--name",
        "qa",
        "--role",
        "quality-assurance",
        "--route",
        "add",
        "--name",
        "development",
        "--members",
        "reviewer,implementer,qa",
        "--route",
        "direct",
        "--name",
        "development",
        "--from",
        "qa",
        "--to",
        "reviewer",
      ]),
    ).toEqual({
      kind: "host-new",
      name: "demo",
      agents: [
        { agentKind: "claude", name: "reviewer", role: "review" },
        { agentKind: "codex", name: "implementer", role: "implementation" },
        { agentKind: "codex", name: "qa", role: "quality-assurance" },
      ],
      routes: [
        { op: "add", name: "development", members: ["reviewer", "implementer", "qa"] },
        { op: "direct", name: "development", from: "qa", to: ["reviewer"] },
      ],
    });
  });

  it("rejects host new without --name", () => {
    expectCliParseError(
      ["host", "new", "--agent", "codex", "--name", "impl"],
      "aiox.missingRequiredOption",
    );
  });

  it.each(["new", "list"])(
    "rejects a reserved host name %s in host new --name",
    (reserved) => {
      expectCliParseError(
        ["host", "new", "--name", reserved, "--agent", "codex", "--name", "impl"],
        "aiox.invalidHostName",
      );
    },
  );

  it("rejects an unknown agent kind in a host new agent block", () => {
    expectCliParseError(
      ["host", "new", "--name", "demo", "--agent", "rust", "--name", "impl"],
      "aiox.invalidAgentKind",
    );
  });

  it("rejects an unknown route operation in host new", () => {
    expectCliParseError(
      [
        "host",
        "new",
        "--name",
        "demo",
        "--agent",
        "codex",
        "--name",
        "impl",
        "--route",
        "sync",
        "--name",
        "dev",
        "--members",
        "impl",
      ],
      "aiox.invalidRouteOperation",
    );
  });

  it("rejects --route remove inside host new", () => {
    expectCliParseError(
      [
        "host",
        "new",
        "--name",
        "demo",
        "--agent",
        "codex",
        "--name",
        "impl",
        "--route",
        "remove",
        "--name",
        "dev",
      ],
      "aiox.routeRemoveDuringCreate",
    );
  });

  it("rejects an empty agent name inside a host new agent block", () => {
    expectCliParseError(
      ["host", "new", "--name", "demo", "--agent", "codex", "--name", ""],
      "aiox.invalidName",
    );
  });

  it("parses host <name> add with an agent block", () => {
    expect(
      parseCli(["host", "demo", "add", "--agent", "codex", "--name", "qa", "--role", "review"]),
    ).toEqual({
      kind: "host-add",
      name: "demo",
      agents: [{ agentKind: "codex", name: "qa", role: "review" }],
    });
  });

  it("parses host <name> --path add with an agent block", () => {
    expect(
      parseCli([
        "host",
        "demo",
        "--path",
        "/tmp/project",
        "add",
        "--agent",
        "claude",
        "--name",
        "security",
      ]),
    ).toEqual({
      kind: "host-add",
      name: "demo",
      path: "/tmp/project",
      agents: [{ agentKind: "claude", name: "security" }],
    });
  });

  it("parses host add as a mixed batch of repeated agents and routes", () => {
    expect(
      parseCli([
        "host",
        "demo",
        "--path",
        "/tmp/project",
        "add",
        "--agent",
        "claude",
        "--name",
        "reviewer",
        "--role",
        "review",
        "--description",
        "Reviews implementation",
        "--instructions",
        "Check behavior and tests.",
        "--agent",
        "codex",
        "--name",
        "implementer",
        "--role",
        "implementation",
        "--route",
        "add",
        "--name",
        "development",
        "--members",
        "reviewer,implementer",
        "--route",
        "direct",
        "--name",
        "escalation",
        "--from",
        "reviewer",
        "--to",
        "implementer",
      ]),
    ).toEqual({
      kind: "host-add",
      name: "demo",
      path: "/tmp/project",
      agents: [
        {
          agentKind: "claude",
          name: "reviewer",
          role: "review",
          description: "Reviews implementation",
          instructions: "Check behavior and tests.",
        },
        { agentKind: "codex", name: "implementer", role: "implementation" },
      ],
      routes: [
        { op: "add", name: "development", members: ["reviewer", "implementer"] },
        { op: "direct", name: "escalation", from: "reviewer", to: ["implementer"] },
      ],
    });
  });

  it("rejects duplicate flags inside a host agent block", () => {
    expectCliParseError(
      [
        "host",
        "new",
        "--name",
        "demo",
        "--agent",
        "codex",
        "--name",
        "impl",
        "--role",
        "implementation",
        "--role",
        "review",
      ],
      "aiox.duplicateOption",
    );
  });

  it("rejects a missing value inside a host agent block", () => {
    expectCliParseError(
      ["host", "new", "--name", "demo", "--agent", "codex", "--name", "impl", "--instructions"],
      "aiox.missingRequiredOption",
    );
  });

  it("rejects host <name> add with no agent blocks", () => {
    expectCliParseError(["host", "demo", "add"], "aiox.missingAgentBlocks");
  });

  it("parses host <name> remove with repeated --agent", () => {
    expect(
      parseCli(["host", "demo", "remove", "--agent", "security", "--agent", "docs"]),
    ).toEqual({
      kind: "host-remove",
      name: "demo",
      agentNames: ["security", "docs"],
    });
  });

  it("parses path-qualified host remove", () => {
    expect(
      parseCli([
        "host",
        "demo",
        "--path",
        "/tmp/project",
        "remove",
        "--agent",
        "security",
      ]),
    ).toEqual({
      kind: "host-remove",
      name: "demo",
      path: "/tmp/project",
      agentNames: ["security"],
    });
  });

  it("rejects host <name> remove with no agents", () => {
    expectCliParseError(["host", "demo", "remove"], "aiox.missingAgentBlocks");
  });

  it("parses host <name> route with add, direct, and remove blocks", () => {
    expect(
      parseCli([
        "host",
        "demo",
        "route",
        "--route",
        "add",
        "--name",
        "audit",
        "--members",
        "reviewer,security",
        "--route",
        "direct",
        "--name",
        "audit",
        "--from",
        "security",
        "--to",
        "reviewer",
        "--route",
        "remove",
        "--name",
        "release",
      ]),
    ).toEqual({
      kind: "host-route",
      name: "demo",
      routes: [
        { op: "add", name: "audit", members: ["reviewer", "security"] },
        { op: "direct", name: "audit", from: "security", to: ["reviewer"] },
        { op: "remove", name: "release" },
      ],
    });
  });

  it("parses path-qualified host route mutation", () => {
    expect(
      parseCli([
        "host",
        "demo",
        "--path",
        "/tmp/project",
        "route",
        "--route",
        "remove",
        "--name",
        "obsolete",
      ]),
    ).toEqual({
      kind: "host-route",
      name: "demo",
      path: "/tmp/project",
      routes: [{ op: "remove", name: "obsolete" }],
    });
  });

  it("rejects host <name> route with no route blocks", () => {
    expectCliParseError(["host", "demo", "route"], "aiox.missingRouteBlocks");
  });

  it("rejects a reserved action keyword standing in for a missing host name", () => {
    expectCliParseError(
      ["host", "add", "--agent", "codex", "--name", "impl"],
      "aiox.invalidHostName",
    );
  });

  it("parses pair create with a name", () => {
    expect(parseCli(["pair", "--name", "feature-x"])).toEqual({
      kind: "pair-create",
      name: "feature-x",
    });
  });

  it("rejects pair create without a name option", () => {
    expectCliParseError(["pair"], "aiox.missingMandatoryOptionValue");
  });

  it("rejects pair create without a name value", () => {
    expectCliParseError(["pair", "--name"], "aiox.optionMissingArgument");
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

  it("parses the hidden mcp-claude command", () => {
    expect(parseCli(["mcp-claude"])).toEqual({
      kind: "mcp-claude",
    });
  });

  it("rejects an unknown global status flag", () => {
    expectCliParseError(["status", "--bogus"], "aiox.unknownOption");
  });

  it("rejects the removed disconnect command rather than retaining a compatibility alias", () => {
    expectCliParseError(["disconnect", "source", "target"], "aiox.unknownCommand");
  });

  it("rejects global stop with an extra positional", () => {
    expectCliParseError(["stop", "extra"], "aiox.excessArguments");
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

  it("rejects agent name containing newline character", () => {
    expectCliParseError(["codex", "--name", "impl\nmalicious"], "aiox.invalidName");
  });

  it("rejects agent name containing null control character", () => {
    expectCliParseError(["codex", "--name", "impl\x00null"], "aiox.invalidName");
  });

  it("accepts valid names with no control characters", () => {
    expect(parseCli(["codex", "--name", "valid-name_123"])).toMatchObject({
      kind: "agent-attach",
      name: "valid-name_123",
    });
  });

  it.each([
    { argv: [], code: "aiox.missingCommand" },
    { argv: ["daemon"], code: "aiox.missingCommand" },
    { argv: ["daemon", "unknown"], code: "aiox.unknownCommand" },
    { argv: ["status", "--bogus"], code: "aiox.unknownOption" },
    { argv: ["stop", "extra"], code: "aiox.excessArguments" },
    { argv: ["connect"], code: "aiox.missingArgument" },
    { argv: ["connect", "a"], code: "aiox.missingTargets" },
    { argv: ["codex", "--name", ""], code: "aiox.invalidName" },
  ])("assigns exit code 1 to parse error $code for $argv", ({ argv, code }) => {
    expectCliParseError(argv, code, 1);
  });
});

function expectCliParseError(argv: string[], code: string, exitCode?: number): void {
  try {
    parseCli(argv);
  } catch (error) {
    expect(error).toBeInstanceOf(CliParseError);
    expect((error as CliParseError).code).toBe(code);
    if (exitCode !== undefined) {
      expect((error as CliParseError).exitCode).toBe(exitCode);
    }
    return;
  }

  throw new Error(`Expected parseCli(${JSON.stringify(argv)}) to throw`);
}
