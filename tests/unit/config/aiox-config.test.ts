import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  AioxConfigError,
  loadAioxConfig,
  parseAioxConfig,
} from "../../../src/config/aiox-config.js";

describe("parseAioxConfig", () => {
  it("parses a valid minimal config", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [{ name: "codex-reviewer", type: "codex" }],
    });

    expect(config).toEqual({
      project: "demo",
      agents: [{ name: "codex-reviewer", type: "codex" }],
    });
  });

  it("parses a valid full config matching the spec example", () => {
    const raw = {
      project: "demo",
      instructions: {
        global: "# optional, injected into every agent",
      },
      agents: [
        {
          name: "codex-reviewer",
          type: "codex",
          role: "reviewer",
          description: "API 보안 경계와 구현상의 취약점을 검토한다.",
          instructions: "# optional, additive on top of global",
        },
        {
          name: "claude-frontend",
          type: "claude-code",
          role: "frontend",
          description: "프론트엔드 구현을 담당한다.",
        },
        { name: "qa-bot", type: "codex" },
        {
          name: "claude-architect",
          type: "claude-code",
          role: "architect",
          description: "전체 시스템 설계와 기술적 의사결정을 검토한다.",
        },
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
          policy: {
            urls: { allow: ["https://github.com/*"] },
          },
        },
      ],
    };

    const config = parseAioxConfig(raw);

    expect(config.project).toBe("demo");
    expect(config.instructions?.global).toContain("injected into every agent");
    expect(config.agents).toHaveLength(4);
    expect(config.routes).toHaveLength(2);
    expect(config.routes?.[1].directed).toEqual([
      { from: "qa-bot", to: "claude-architect" },
    ]);
    expect(config.routes?.[1].policy).toEqual({
      urls: { allow: ["https://github.com/*"] },
    });
  });

  it("parses a directed[].to array (broadcast) alongside a string form", () => {
    const config = parseAioxConfig({
      project: "demo",
      agents: [
        { name: "a", type: "codex" },
        { name: "b", type: "codex" },
        { name: "c", type: "claude-code" },
      ],
      routes: [
        {
          name: "fanout",
          members: ["a", "b", "c"],
          directed: [{ from: "a", to: ["b", "c"] }],
        },
      ],
    });

    expect(config.routes?.[0].directed).toEqual([{ from: "a", to: ["b", "c"] }]);
  });

  it("rejects a missing project", () => {
    expect(() =>
      parseAioxConfig({ agents: [{ name: "a", type: "codex" }] }),
    ).toThrow(AioxConfigError);
  });

  it("rejects an empty project string", () => {
    expect(() =>
      parseAioxConfig({ project: "", agents: [{ name: "a", type: "codex" }] }),
    ).toThrow(AioxConfigError);
  });

  it("rejects a missing agents list", () => {
    expect(() => parseAioxConfig({ project: "demo" })).toThrow(AioxConfigError);
  });

  it("rejects an agent missing name", () => {
    expect(() =>
      parseAioxConfig({ project: "demo", agents: [{ type: "codex" }] }),
    ).toThrow(AioxConfigError);
  });

  it("rejects an agent missing type", () => {
    expect(() =>
      parseAioxConfig({ project: "demo", agents: [{ name: "a" }] }),
    ).toThrow(AioxConfigError);
  });

  it("rejects an invalid agents[].type value", () => {
    try {
      parseAioxConfig({
        project: "demo",
        agents: [{ name: "a", type: "gpt-app" }],
      });
      expect.fail("expected parseAioxConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      expect((error as AioxConfigError).code).toBe("invalid_schema");
      expect(
        (error as AioxConfigError).issues?.some((issue) =>
          issue.path.join(".") === "agents.0.type",
        ),
      ).toBe(true);
    }
  });

  it("rejects a route missing name", () => {
    expect(() =>
      parseAioxConfig({
        project: "demo",
        agents: [{ name: "a", type: "codex" }],
        routes: [{ members: ["a"] }],
      }),
    ).toThrow(AioxConfigError);
  });

  it("rejects a route missing members", () => {
    expect(() =>
      parseAioxConfig({
        project: "demo",
        agents: [{ name: "a", type: "codex" }],
        routes: [{ name: "g" }],
      }),
    ).toThrow(AioxConfigError);
  });

  it("rejects a directed entry missing to", () => {
    expect(() =>
      parseAioxConfig({
        project: "demo",
        agents: [{ name: "a", type: "codex" }],
        routes: [{ name: "g", members: ["a"], directed: [{ from: "a" }] }],
      }),
    ).toThrow(AioxConfigError);
  });

  it("rejects an unknown top-level field (e.g. Phase 2 capabilities)", () => {
    expect(() =>
      parseAioxConfig({
        project: "demo",
        agents: [{ name: "a", type: "codex" }],
        capabilities: {},
      }),
    ).toThrow(AioxConfigError);
  });

  it("rejects a version field (no schema-version field in v1)", () => {
    expect(() =>
      parseAioxConfig({
        version: 1,
        project: "demo",
        agents: [{ name: "a", type: "codex" }],
      }),
    ).toThrow(AioxConfigError);
  });

  it("rejects agents[].command and agents[].config (Phase 2 fields excluded from v1)", () => {
    expect(() =>
      parseAioxConfig({
        project: "demo",
        agents: [{ name: "a", type: "codex", command: "codex exec" }],
      }),
    ).toThrow(AioxConfigError);

    expect(() =>
      parseAioxConfig({
        project: "demo",
        agents: [{ name: "a", type: "codex", config: {} }],
      }),
    ).toThrow(AioxConfigError);
  });

  it("rejects an unknown field inside routes[]", () => {
    expect(() =>
      parseAioxConfig({
        project: "demo",
        agents: [{ name: "a", type: "codex" }],
        routes: [{ name: "g", members: ["a"], scale: 3 }],
      }),
    ).toThrow(AioxConfigError);
  });
});

describe("loadAioxConfig", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "aiox-config-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads and parses aiox.yaml from the given cwd", () => {
    writeFileSync(
      join(dir, "aiox.yaml"),
      [
        "project: demo",
        "agents:",
        "  - name: codex-reviewer",
        "    type: codex",
        "    role: reviewer",
      ].join("\n"),
      "utf8",
    );

    const config = loadAioxConfig(dir);

    expect(config.project).toBe("demo");
    expect(config.agents).toEqual([
      { name: "codex-reviewer", type: "codex", role: "reviewer" },
    ]);
  });

  it("throws not_found when aiox.yaml is absent", () => {
    try {
      loadAioxConfig(dir);
      expect.fail("expected loadAioxConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      expect((error as AioxConfigError).code).toBe("not_found");
    }
  });

  it("wraps non-ENOENT read failures in AioxConfigError", () => {
    mkdirSync(join(dir, "aiox.yaml"));

    try {
      loadAioxConfig(dir);
      expect.fail("expected loadAioxConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      expect((error as AioxConfigError).code).toBe("not_found");
      expect((error as Error).message).toContain("Failed to read aiox.yaml");
    }
  });

  it("throws invalid_yaml on malformed YAML syntax", () => {
    writeFileSync(join(dir, "aiox.yaml"), "project: [demo\n", "utf8");

    try {
      loadAioxConfig(dir);
      expect.fail("expected loadAioxConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      expect((error as AioxConfigError).code).toBe("invalid_yaml");
    }
  });

  it("throws invalid_schema when YAML is well-formed but violates the schema", () => {
    writeFileSync(join(dir, "aiox.yaml"), "project: demo\n", "utf8");

    try {
      loadAioxConfig(dir);
      expect.fail("expected loadAioxConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AioxConfigError);
      expect((error as AioxConfigError).code).toBe("invalid_schema");
    }
  });
});
