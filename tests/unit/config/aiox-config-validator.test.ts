import { describe, expect, it } from "vitest";

import { parseAioxConfig, AioxConfigError } from "../../../src/config/aiox-config.js";
import { validateAioxConfigSemantics } from "../../../src/config/aiox-config-validator.js";

describe("validateAioxConfigSemantics", () => {
  it("accepts a valid config matching the spec example", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "codex-reviewer", type: "codex" },
        { name: "claude-frontend", type: "claude-code" },
        { name: "qa-bot", type: "codex" },
        { name: "claude-architect", type: "claude-code" },
      ],
      routes: [
        {
          name: "frontend",
          members: ["claude-frontend", "codex-reviewer", "claude-architect"],
        },
        {
          name: "escalation",
          members: ["qa-bot", "claude-architect", "codex-reviewer"],
          directed: [{ from: "qa-bot", to: "claude-architect" }],
        },
      ],
    });

    expect(() => validateAioxConfigSemantics(config)).not.toThrow();
  });

  it("rejects duplicate agents[].name", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "a", type: "claude-code" },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      expect((error as AioxConfigError).code).toBe("invalid_semantics");
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "agents.1.name",
      );
      expect(issue?.message).toContain('Duplicate agents[].name "a"');
    }
  });

  it("rejects duplicate routes[].name", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [{ name: "a", type: "codex" }],
      routes: [
        { name: "g", members: ["a"] },
        { name: "g", members: ["a"] },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.1.name",
      );
      expect(issue?.message).toContain('Duplicate routes[].name "g"');
    }
  });

  it("rejects a routes[].members reference to an unknown agent", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [{ name: "a", type: "codex" }],
      routes: [{ name: "g", members: ["a", "ghost"] }],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.0.members.1",
      );
      expect(issue?.message).toContain('unknown agent "ghost"');
    }
  });

  it("rejects a routes[].directed[].from/.to reference to an unknown agent", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
      ],
      routes: [
        {
          name: "g",
          members: ["a", "b"],
          directed: [{ from: "ghost", to: "b" }],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.0.directed.0.from",
      );
      expect(issue?.message).toContain('unknown agent "ghost"');
    }
  });

  it("rejects an unknown agent inside a flattened directed[].to array", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
      ],
      routes: [
        {
          name: "g",
          members: ["a", "b"],
          directed: [{ from: "a", to: ["b", "ghost"] }],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.0.directed.0.to.1",
      );
      expect(issue?.message).toContain('unknown agent "ghost"');
    }
  });

  it("rejects a duplicate {from, to} pair declared twice as separate directed entries", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
      ],
      routes: [
        {
          name: "g",
          members: ["a", "b"],
          directed: [
            { from: "a", to: "b" },
            { from: "a", to: "b" },
          ],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.0.directed.1.to",
      );
      expect(issue?.message).toContain('Duplicate routes[].directed[] pair ("a" -> "b")');
    }
  });

  it("rejects a duplicate {from, to} pair hidden inside a flattened directed[].to array", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
        { name: "c", type: "codex" },
      ],
      routes: [
        {
          name: "g",
          members: ["a", "b", "c"],
          directed: [
            { from: "a", to: "b" },
            { from: "a", to: ["b", "c"] },
          ],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.0.directed.1.to.0",
      );
      expect(issue?.message).toContain('Duplicate routes[].directed[] pair ("a" -> "b")');
    }
  });

  it("does not flag the same {from, to} pair when declared in two different routes", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
      ],
      routes: [
        { name: "g1", members: ["a", "b"], directed: [{ from: "a", to: "b" }] },
        { name: "g2", members: ["a", "b"], directed: [{ from: "a", to: "b" }] },
      ],
    });

    expect(() => validateAioxConfigSemantics(config)).not.toThrow();
  });

  it("rejects the reserved agent name \"*\"", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [{ name: "*", type: "codex" }],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "agents.0.name",
      );
      expect(issue?.message).toContain("reserved broadcast sentinel");
    }
  });

  it("rejects a self-loop directed[] entry (from === to)", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [{ name: "a", type: "codex" }],
      routes: [
        {
          name: "g",
          members: ["a"],
          directed: [{ from: "a", to: "a" }],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.0.directed.0.to",
      );
      expect(issue?.message).toContain("self-loop");
    }
  });

  it("rejects a self-loop hidden inside a flattened directed[].to array", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
      ],
      routes: [
        {
          name: "g",
          members: ["a", "b"],
          directed: [{ from: "a", to: ["b", "a"] }],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.0.directed.0.to.1",
      );
      expect(issue?.message).toContain("self-loop");
    }
  });

  it("rejects a routes[].directed[].from that is a declared agent but outside this route's members", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
        { name: "c", type: "codex" },
      ],
      routes: [
        {
          name: "g",
          members: ["a", "b"],
          directed: [{ from: "c", to: "a" }],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.0.directed.0.from",
      );
      expect(issue?.message).toContain('"c"');
      expect(issue?.message).toContain("not a member");
      expect(issue?.message).not.toContain("unknown agent");
    }
  });

  it("rejects a single routes[].directed[].to that is a declared agent but outside this route's members", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
        { name: "c", type: "codex" },
      ],
      routes: [
        {
          name: "g",
          members: ["a", "b"],
          directed: [{ from: "a", to: "c" }],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.0.directed.0.to",
      );
      expect(issue?.message).toContain('"c"');
      expect(issue?.message).toContain("not a member");
      expect(issue?.message).not.toContain("unknown agent");
    }
  });

  it("rejects a flattened routes[].directed[].to array element that is a declared agent but outside this route's members", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
        { name: "c", type: "codex" },
      ],
      routes: [
        {
          name: "g",
          members: ["a", "b"],
          directed: [{ from: "a", to: ["b", "c"] }],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issue = (error as AioxConfigError).semanticIssues?.find(
        (candidate) => candidate.path === "routes.0.directed.0.to.1",
      );
      expect(issue?.message).toContain('"c"');
      expect(issue?.message).toContain("not a member");
    }
  });

  it("distinguishes the unknown-agent error from the route-member error for different references in the same directed entry", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
        { name: "c", type: "codex" },
      ],
      routes: [
        {
          name: "g",
          members: ["a", "b"],
          directed: [{ from: "ghost", to: "c" }],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issues = (error as AioxConfigError).semanticIssues ?? [];

      const fromIssue = issues.find((candidate) => candidate.path === "routes.0.directed.0.from");
      expect(fromIssue?.message).toContain('unknown agent "ghost"');
      expect(fromIssue?.message).not.toContain("not a member");

      const toIssue = issues.find((candidate) => candidate.path === "routes.0.directed.0.to");
      expect(toIssue?.message).toContain('"c"');
      expect(toIssue?.message).toContain("not a member");
      expect(toIssue?.message).not.toContain("unknown agent");
    }
  });

  it("does not flag a directed[] reference to an agent outside a different route's members", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
        { name: "c", type: "codex" },
      ],
      routes: [
        {
          name: "g1",
          members: ["a", "b"],
          directed: [{ from: "a", to: "c" }],
        },
        {
          name: "g2",
          members: ["a", "b", "c"],
          directed: [{ from: "a", to: "c" }],
        },
      ],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const issues = (error as AioxConfigError).semanticIssues ?? [];

      expect(issues.some((issue) => issue.path === "routes.0.directed.0.to")).toBe(true);
      expect(issues.some((issue) => issue.path === "routes.1.directed.0.to")).toBe(false);
    }
  });

  it("collects violations across multiple rules in a single error", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "a", type: "codex" },
      ],
      routes: [{ name: "g", members: ["a", "ghost"] }],
    });

    try {
      validateAioxConfigSemantics(config);
      expect.fail("expected validateAioxConfigSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      const paths = (error as AioxConfigError).semanticIssues?.map((issue) => issue.path);
      expect(paths).toContain("agents.1.name");
      expect(paths).toContain("routes.0.members.1");
    }
  });
});
