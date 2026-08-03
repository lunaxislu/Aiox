import { describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

import { execFile } from "node:child_process";

import {
  addClaudeMcpJson,
  checkClaudeMcpLocalRegistration,
  type ClaudeMcpCliRunner,
} from "../../../src/adapters/claude/mcp-cli.js";

// ---------------------------------------------------------------------------
// `aiox claude setup` CLI adapter: wraps `claude mcp add-json` (write) and
// `claude mcp get` (read, used only to detect Local-scope registration — NOT
// to diff the stored definition; `claude mcp get`/`list` never expose the
// stored command/args/env, confirmed by direct CLI probing, so no automatic
// same/different comparison is attempted anywhere in this adapter).
// ---------------------------------------------------------------------------

const CWD = "/Users/me/Documents/ai-orchestration";
const NAME = "aiox-claude-ingress";
const JSON_DEF = JSON.stringify({ command: "/usr/bin/node", args: ["/repo/dist/bin/aiox.js", "mcp-claude"] });

describe("addClaudeMcpJson", () => {
  it("runs `mcp add-json <name> <json> -s local` in the cwd", async () => {
    const calls: { args: string[]; cwd: string }[] = [];
    const run: ClaudeMcpCliRunner = async (args, options) => {
      calls.push({ args, cwd: options.cwd });
      return { stdout: `Added stdio MCP server ${NAME} to local config\n`, stderr: "" };
    };

    await addClaudeMcpJson({ name: NAME, json: JSON_DEF, cwd: CWD, scope: "local", run });

    expect(calls).toEqual([
      { args: ["mcp", "add-json", NAME, JSON_DEF, "-s", "local"], cwd: CWD },
    ]);
  });

  it.each(["local", "user", "project"] as const)(
    "runs `mcp add-json ... -s %s` for the selected scope",
    async (scope) => {
      const calls: { args: string[]; cwd: string }[] = [];
      const run: ClaudeMcpCliRunner = async (args, options) => {
        calls.push({ args, cwd: options.cwd });
        return { stdout: `Added stdio MCP server ${NAME} to ${scope} config\n`, stderr: "" };
      };

      await addClaudeMcpJson({ name: NAME, json: JSON_DEF, cwd: CWD, scope, run });

      expect(calls).toEqual([
        { args: ["mcp", "add-json", NAME, JSON_DEF, "-s", scope], cwd: CWD },
      ]);
    },
  );

  // Policy (2026-08-03, recorded in
  // logs/G1/2026-07-29-G1-B-canonical-presentation-corrective.md): aiox does
  // NOT classify or pattern-match `claude mcp add-json` failures (including
  // name collisions) — it surfaces the CLI's own stderr verbatim, prefixed
  // only with the name/scope aiox already knows it attempted. This is load-
  // bearing: the exact collision wording differs by scope (local/user say
  // "already exists in <scope> config", project says "already exists in
  // .mcp.json") and a prior regex-based classifier missed the project case.
  it.each([
    ["local", `MCP server ${NAME} already exists in local config`],
    ["user", `MCP server ${NAME} already exists in user config`],
    ["project", `MCP server ${NAME} already exists in .mcp.json`],
  ] as const)(
    "surfaces the raw CLI stderr verbatim for a %s scope collision, without classifying it",
    async (scope, stderrText) => {
      const run: ClaudeMcpCliRunner = async () => {
        const error = new Error(
          `Command failed: claude mcp add-json ${NAME} ... -s ${scope}\n${stderrText}\n`,
        ) as Error & { stderr?: string };
        error.stderr = `${stderrText}\n`;
        throw error;
      };

      await expect(
        addClaudeMcpJson({ name: NAME, json: JSON_DEF, cwd: CWD, scope, run }),
      ).rejects.toMatchObject({
        name: "ClaudeMcpCliError",
        code: "claude_mcp_cli_failed",
        message: expect.stringContaining(stderrText),
      });
      // aiox states the attempted scope itself (it already knows it — no
      // parsing of the CLI's wording), independent of whichever way the CLI
      // itself happened to phrase the collision.
      await expect(
        addClaudeMcpJson({ name: NAME, json: JSON_DEF, cwd: CWD, scope, run }),
      ).rejects.toMatchObject({ message: expect.stringContaining(`-s ${scope}`) });
    },
  );

  it("throws claude_mcp_cli_failed for any other CLI failure (no stderr — falls back to error.message)", async () => {
    const run: ClaudeMcpCliRunner = async () => {
      throw new Error("spawn claude ENOENT");
    };

    await expect(
      addClaudeMcpJson({ name: NAME, json: JSON_DEF, cwd: CWD, scope: "local", run }),
    ).rejects.toMatchObject({
      name: "ClaudeMcpCliError",
      code: "claude_mcp_cli_failed",
      message: expect.stringContaining("spawn claude ENOENT"),
    });
  });

  it("default runner forwards cwd to execFile (no implicit process.cwd())", async () => {
    vi.mocked(execFile).mockImplementation(((
      _bin: string,
      _args: string[],
      _opts: unknown,
      cb: (e: unknown, stdout: string, stderr: string) => void,
    ) => {
      cb(null, `Added stdio MCP server ${NAME} to local config\n`, "");
      return {} as never;
    }) as never);

    await addClaudeMcpJson({ name: NAME, json: JSON_DEF, cwd: CWD, scope: "local", command: "claude" });

    expect(execFile).toHaveBeenCalledWith(
      "claude",
      ["mcp", "add-json", NAME, JSON_DEF, "-s", "local"],
      expect.objectContaining({ cwd: CWD }),
      expect.any(Function),
    );
  });
});

describe("checkClaudeMcpLocalRegistration", () => {
  it("returns registeredAtLocalScope:true when `mcp get` reports Local config scope", async () => {
    const run: ClaudeMcpCliRunner = async () => ({
      stdout:
        `${NAME}:\n  Scope: Local config (private to you in this project)\n  Status: ✓ Connected\n`,
      stderr: "",
    });

    await expect(
      checkClaudeMcpLocalRegistration({ name: NAME, cwd: CWD, run }),
    ).resolves.toEqual({ registeredAtLocalScope: true });
  });

  it("returns registeredAtLocalScope:false when the effective scope is User, not Local", async () => {
    const run: ClaudeMcpCliRunner = async () => ({
      stdout:
        `${NAME}:\n  Scope: User config (available in all your projects)\n  Status: ✓ Connected\n`,
      stderr: "",
    });

    await expect(
      checkClaudeMcpLocalRegistration({ name: NAME, cwd: CWD, run }),
    ).resolves.toEqual({ registeredAtLocalScope: false });
  });

  it("returns registeredAtLocalScope:false when nothing is registered under that name", async () => {
    const run: ClaudeMcpCliRunner = async () => {
      const error = new Error(`No MCP server named "${NAME}". Run \`claude mcp add\` to add one.`) as Error & {
        stderr?: string;
      };
      error.stderr = `No MCP server named "${NAME}". Run \`claude mcp add\` to add one.\n`;
      throw error;
    };

    await expect(
      checkClaudeMcpLocalRegistration({ name: NAME, cwd: CWD, run }),
    ).resolves.toEqual({ registeredAtLocalScope: false });
  });

  it("throws claude_mcp_cli_failed for any other CLI failure", async () => {
    const run: ClaudeMcpCliRunner = async () => {
      throw new Error("spawn claude ENOENT");
    };

    await expect(
      checkClaudeMcpLocalRegistration({ name: NAME, cwd: CWD, run }),
    ).rejects.toMatchObject({
      name: "ClaudeMcpCliError",
      code: "claude_mcp_cli_failed",
    });
  });

  it("runs `mcp get <name>` in the cwd (no -s flag: get does not accept scope)", async () => {
    const calls: { args: string[]; cwd: string }[] = [];
    const run: ClaudeMcpCliRunner = async (args, options) => {
      calls.push({ args, cwd: options.cwd });
      return { stdout: `${NAME}:\n  Scope: Local config (private to you in this project)\n`, stderr: "" };
    };

    await checkClaudeMcpLocalRegistration({ name: NAME, cwd: CWD, run });

    expect(calls).toEqual([{ args: ["mcp", "get", NAME], cwd: CWD }]);
  });
});
