import { describe, expect, it } from "vitest";

import { setupClaudeMcp } from "../../../src/adapters/claude/mcp-setup.js";
import { ClaudeMcpCliError } from "../../../src/adapters/claude/mcp-cli.js";

// ---------------------------------------------------------------------------
// `aiox claude setup` orchestration: registers the Local-scope static Claude
// MCP definition. No auto-diff on collision (see mcp-cli.ts contract note) —
// user decision 2026-08-03: any name collision always fails with a clear,
// actionable message; it never silently overwrites and never guesses sameness.
// ---------------------------------------------------------------------------

const NAME = "aiox-claude-ingress";
const CWD = "/Users/me/Documents/ai-orchestration";
const JSON_DEF = JSON.stringify({ command: "/usr/bin/node", args: ["/repo/dist/bin/aiox.js", "mcp-claude"] });

describe("setupClaudeMcp", () => {
  it("registers when nothing is registered under that name", async () => {
    const calls: unknown[] = [];
    const result = await setupClaudeMcp({
      name: NAME,
      json: JSON_DEF,
      cwd: CWD,
      scope: "local",
      addClaudeMcpJson: async (input) => {
        calls.push(input);
      },
    });

    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([{ name: NAME, json: JSON_DEF, cwd: CWD, scope: "local" }]);
  });

  it.each(["local", "user", "project"] as const)(
    "passes the %s scope through to addClaudeMcpJson",
    async (scope) => {
      const calls: unknown[] = [];
      const result = await setupClaudeMcp({
        name: NAME,
        json: JSON_DEF,
        cwd: CWD,
        scope,
        addClaudeMcpJson: async (input) => {
          calls.push(input);
        },
      });

      expect(result).toEqual({ ok: true });
      expect(calls).toEqual([{ name: NAME, json: JSON_DEF, cwd: CWD, scope }]);
    },
  );

  // Policy (2026-08-03, recorded in
  // logs/G1/2026-07-29-G1-B-canonical-presentation-corrective.md): setupClaudeMcp
  // does NOT classify a collision separately from any other CLI failure and
  // does NOT author its own remediation text — it passes the ClaudeMcpCliError
  // message through as-is (addClaudeMcpJson already states the name/scope it
  // attempted). A collision and an unrelated CLI failure land on the same
  // coded, non-overwriting result shape.
  it("passes a collision failure through verbatim, without a custom message or a separate code", async () => {
    const result = await setupClaudeMcp({
      name: NAME,
      json: JSON_DEF,
      cwd: CWD,
      scope: "user",
      addClaudeMcpJson: async () => {
        throw new ClaudeMcpCliError(
          `claude mcp add-json ${NAME} -s user failed: MCP server ${NAME} already exists in user config`,
          "claude_mcp_cli_failed",
        );
      },
    });

    expect(result).toEqual({
      ok: false,
      code: "claude_mcp_cli_failed",
      message: `claude mcp add-json ${NAME} -s user failed: MCP server ${NAME} already exists in user config`,
    });
  });

  it("surfaces any other CLI failure the same way, verbatim", async () => {
    const result = await setupClaudeMcp({
      name: NAME,
      json: JSON_DEF,
      cwd: CWD,
      scope: "local",
      addClaudeMcpJson: async () => {
        throw new ClaudeMcpCliError("spawn claude ENOENT", "claude_mcp_cli_failed");
      },
    });

    expect(result).toEqual({
      ok: false,
      code: "claude_mcp_cli_failed",
      message: "spawn claude ENOENT",
    });
  });

  it("propagates an unexpected (non-ClaudeMcpCliError) throw instead of masking it", async () => {
    await expect(
      setupClaudeMcp({
        name: NAME,
        json: JSON_DEF,
        cwd: CWD,
        scope: "local",
        addClaudeMcpJson: async () => {
          throw new Error("unexpected");
        },
      }),
    ).rejects.toThrow("unexpected");
  });
});
