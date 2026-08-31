import { describe, expect, it } from "vitest";

import { AioxConfigError } from "../../../src/config/aiox-config.js";
import { CliParseError } from "../../../src/cli/cli-errors.js";
import {
  normalizeHostDeclaration,
  normalizeHostMutation,
  parseHostArgs,
  type HostRouteOp,
} from "../../../src/cli/host-command.js";
import type { ParsedCommand } from "../../../src/cli/parse.js";

function parseHostNew(argv: string[]): Extract<ParsedCommand, { kind: "host-new" }> {
  const parsed = parseHostArgs(["new", ...argv]);
  if (parsed.kind !== "host-new") {
    throw new Error(`expected host-new, got ${parsed.kind}`);
  }
  return parsed;
}

function parseHostAdd(name: string, argv: string[]): Extract<ParsedCommand, { kind: "host-add" }> {
  const parsed = parseHostArgs([name, "add", ...argv]);
  if (parsed.kind !== "host-add") {
    throw new Error(`expected host-add, got ${parsed.kind}`);
  }
  return parsed;
}

function parseHostRoute(
  name: string,
  argv: string[],
): Extract<ParsedCommand, { kind: "host-route" }> {
  const parsed = parseHostArgs([name, "route", ...argv]);
  if (parsed.kind !== "host-route") {
    throw new Error(`expected host-route, got ${parsed.kind}`);
  }
  return parsed;
}

describe("normalizeHostDeclaration (CLI-only host-new -> AioxConfig)", () => {
  it("builds a normalized declaration reusing the config agent/route shape", () => {
    const command = parseHostNew([
      "--name",
      "demo",
      "--agent",
      "codex",
      "--name",
      "implementer",
      "--role",
      "implementation",
      "--description",
      "Implements features.",
      "--instructions",
      "Keep changes small.",
      "--agent",
      "claude",
      "--name",
      "reviewer",
      "--role",
      "review",
      "--route",
      "add",
      "--name",
      "development",
      "--members",
      "implementer,reviewer",
      "--route",
      "direct",
      "--name",
      "development",
      "--from",
      "reviewer",
      "--to",
      "implementer",
    ]);

    const config = normalizeHostDeclaration(command);

    expect(config.project).toBe("demo");
    expect(config.agents).toEqual([
      {
        name: "implementer",
        type: "codex",
        role: "implementation",
        description: "Implements features.",
        instructions: "Keep changes small.",
      },
      { name: "reviewer", type: "claude-code", role: "review" },
    ]);
    expect(config.routes).toEqual([
      {
        name: "development",
        members: ["implementer", "reviewer"],
        directed: [{ from: "reviewer", to: ["implementer"] }],
      },
    ]);
  });

  it("preserves agent metadata (role/description/instructions) when present and omits them when absent", () => {
    const command = parseHostNew([
      "--name",
      "demo",
      "--agent",
      "codex",
      "--name",
      "bare",
    ]);

    const config = normalizeHostDeclaration(command);

    expect(config.agents).toEqual([{ name: "bare", type: "codex" }]);
  });

  it("omits routes entirely when host-new declared none", () => {
    const command = parseHostNew(["--name", "demo", "--agent", "codex", "--name", "solo"]);

    const config = normalizeHostDeclaration(command);

    expect(config.routes).toBeUndefined();
  });

  it("rejects an unknown agent reference in a route via the reused semantic validator", () => {
    const command = parseHostNew([
      "--name",
      "demo",
      "--agent",
      "codex",
      "--name",
      "implementer",
      "--route",
      "add",
      "--name",
      "development",
      "--members",
      "implementer,ghost",
    ]);

    try {
      normalizeHostDeclaration(command);
      throw new Error("expected normalizeHostDeclaration to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      expect((error as AioxConfigError).code).toBe("invalid_semantics");
    }
  });

  it("rejects a duplicate agent name via the reused semantic validator", () => {
    const command = parseHostNew([
      "--name",
      "demo",
      "--agent",
      "codex",
      "--name",
      "dup",
      "--agent",
      "claude",
      "--name",
      "dup",
    ]);

    try {
      normalizeHostDeclaration(command);
      throw new Error("expected normalizeHostDeclaration to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      expect((error as AioxConfigError).code).toBe("invalid_semantics");
    }
  });

  it("rejects a self-loop directed route via the reused semantic validator", () => {
    const command = parseHostNew([
      "--name",
      "demo",
      "--agent",
      "codex",
      "--name",
      "solo",
      "--route",
      "add",
      "--name",
      "dev",
      "--members",
      "solo",
      "--route",
      "direct",
      "--name",
      "dev",
      "--from",
      "solo",
      "--to",
      "solo",
    ]);

    try {
      normalizeHostDeclaration(command);
      throw new Error("expected normalizeHostDeclaration to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      expect((error as AioxConfigError).code).toBe("invalid_semantics");
    }
  });
});

describe("normalizeHostMutation (running-host add/remove/route -> structural validation only)", () => {
  it("passes through a well-formed host-add mutation unchanged", () => {
    const command = parseHostAdd("demo", [
      "--agent",
      "codex",
      "--name",
      "qa",
      "--role",
      "quality-assurance",
    ]);

    const normalized = normalizeHostMutation(command);

    expect(normalized).toEqual(command);
  });

  it("rejects a duplicate agent name within the same host-add batch", () => {
    const command = parseHostAdd("demo", [
      "--agent",
      "codex",
      "--name",
      "dup",
      "--agent",
      "claude",
      "--name",
      "dup",
    ]);

    expect(() => normalizeHostMutation(command)).toThrowError(
      expect.objectContaining({ code: "aiox.duplicateAgentInMutation" }),
    );
  });

  it("rejects a duplicate agent name within the same host-remove batch", () => {
    const parsed = parseHostArgs(["demo", "remove", "--agent", "qa", "--agent", "qa"]);
    if (parsed.kind !== "host-remove") {
      throw new Error(`expected host-remove, got ${parsed.kind}`);
    }

    expect(() => normalizeHostMutation(parsed)).toThrowError(
      expect.objectContaining({ code: "aiox.duplicateAgentInMutation" }),
    );
  });

  it("rejects a self-loop directed route within a host-route batch", () => {
    const command = parseHostRoute("demo", [
      "--route",
      "add",
      "--name",
      "audit",
      "--members",
      "security",
      "--route",
      "direct",
      "--name",
      "audit",
      "--from",
      "security",
      "--to",
      "security",
    ]);

    expect(() => normalizeHostMutation(command)).toThrowError(
      expect.objectContaining({ code: "aiox.invalidRouteMutation" }),
    );
  });

  it("rejects a duplicate directed pair within the same host-route batch", () => {
    const command = parseHostRoute("demo", [
      "--route",
      "add",
      "--name",
      "audit",
      "--members",
      "security,reviewer",
      "--route",
      "direct",
      "--name",
      "audit",
      "--from",
      "security",
      "--to",
      "reviewer",
      "--route",
      "direct",
      "--name",
      "audit",
      "--from",
      "security",
      "--to",
      "reviewer",
    ]);

    expect(() => normalizeHostMutation(command)).toThrowError(
      expect.objectContaining({ code: "aiox.invalidRouteMutation" }),
    );
  });

  it("treats two directed pairs whose naive string concatenation would collide as distinct pairs", () => {
    // "a->b" -> "c" and "a" -> "b->c" naively concatenate to the same
    // "a->b->c" string; agent names have no restriction against "->", so the
    // pair encoding must not collide here.
    const routes: HostRouteOp[] = [
      { op: "direct", name: "audit", from: "a->b", to: ["c"] },
      { op: "direct", name: "audit", from: "a", to: ["b->c"] },
    ];
    const command: Extract<ParsedCommand, { kind: "host-route" }> = {
      kind: "host-route",
      name: "demo",
      routes,
    };

    expect(() => normalizeHostMutation(command)).not.toThrow();
  });

  it("rejects a route mutation batch that both adds and removes the same route name", () => {
    const command = parseHostRoute("demo", [
      "--route",
      "add",
      "--name",
      "audit",
      "--members",
      "security",
      "--route",
      "remove",
      "--name",
      "audit",
    ]);

    expect(() => normalizeHostMutation(command)).toThrowError(
      expect.objectContaining({ code: "aiox.conflictingRouteMutation" }),
    );
  });

  it("does not reject repeated `route add` blocks with the same name and preserves their block order (reconciliation deferred to a later stage with a live snapshot)", () => {
    const command = parseHostRoute("demo", [
      "--route",
      "add",
      "--name",
      "audit",
      "--members",
      "security",
      "--route",
      "add",
      "--name",
      "audit",
      "--members",
      "reviewer",
    ]);

    expect(() => normalizeHostMutation(command)).not.toThrow();
    expect(normalizeHostMutation(command)).toEqual(command);
  });

  it("does not reject an unknown agent reference in a route mutation (deferred to a later stage with a live snapshot)", () => {
    // This is the create/mutation validation boundary (Task Brief §7): unlike
    // host-new above (which reuses validateAioxConfigSemantics and rejects an
    // unknown reference immediately), a running-host mutation cannot know the
    // target host's actual current agents without a live snapshot, so Stage 2
    // must not reject this — a later stage checks it against real state.
    const routes: HostRouteOp[] = [
      { op: "direct", name: "audit", from: "ghost-not-declared-anywhere", to: ["also-unknown"] },
    ];
    const command: Extract<ParsedCommand, { kind: "host-route" }> = {
      kind: "host-route",
      name: "demo",
      routes,
    };

    expect(() => normalizeHostMutation(command)).not.toThrow();
  });

  it("passes through a well-formed host-remove mutation unchanged", () => {
    const parsed = parseHostArgs(["demo", "remove", "--agent", "qa", "--agent", "security"]);
    if (parsed.kind !== "host-remove") {
      throw new Error(`expected host-remove, got ${parsed.kind}`);
    }

    expect(normalizeHostMutation(parsed)).toEqual(parsed);
  });
});

describe("CliParseError re-export parity", () => {
  it("throws the same CliParseError class parse.ts exposes", () => {
    expect(() => parseHostArgs(["--bogus"])).toThrowError(CliParseError);
  });
});
