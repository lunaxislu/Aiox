import { execFile } from "node:child_process";

import type { ClaudeMcpScope } from "../../core/claude-mcp-scope.js";

// ---------------------------------------------------------------------------
// Adapter: `claude mcp` CLI wrapper for `aiox claude setup` (Local static MCP).
//
// CONTRACT (confirmed by direct `claude mcp --help` and live probing against an
// isolated HOME, not assumed): `claude mcp add-json <name> <json> -s <scope>`
// is NOT idempotent — re-adding an existing name always exits non-zero, even
// when the JSON is byte-identical. The exact collision wording differs by
// scope (e.g. local/user say `already exists in <scope> config`, project says
// `already exists in .mcp.json`) and aiox does not parse or classify it: on
// any nonzero exit `addClaudeMcpJson` surfaces the CLI's own stderr verbatim,
// prefixed only with the name/scope aiox already knows it attempted (no
// message parsing needed to state that much) — never silently overwriting,
// never silently succeeding, and never guessing "this failure means already
// registered" from wording that can (and did) vary by scope.
//
// Neither `claude mcp get <name>` nor `claude mcp list` expose the stored
// `command`/`args`/`env` in a structured form (`get` prints only
// Scope/Status/Issue; `list` prints a lossy space-joined command+args line
// with no env at all) — there is no official way to diff a registered
// definition against the one aiox would write, so no automatic sameness
// comparison is attempted anywhere in this adapter.
//
// `claude mcp get <name>` DOES reliably report the cwd-resolved *effective*
// scope ("Scope: Local config (private to you in this project)" vs "User
// config" / not found at all), which is sufficient to answer the one question
// `aiox claude`'s launch preflight actually needs: is our MCP registered under
// Local scope for this cwd, yes or no.
// ---------------------------------------------------------------------------

/** Runs a `claude <args>` invocation in a specific cwd and returns its stdout/stderr. */
export type ClaudeMcpCliRunner = (
  args: string[],
  options: { cwd: string },
) => Promise<{ stdout: string; stderr: string }>;

export type ClaudeMcpCliErrorCode = "claude_mcp_cli_failed";

export class ClaudeMcpCliError extends Error {
  readonly code: ClaudeMcpCliErrorCode;

  constructor(message: string, code: ClaudeMcpCliErrorCode) {
    super(message);
    this.name = "ClaudeMcpCliError";
    this.code = code;
  }
}

export function createClaudeMcpCliRunner(command?: string): ClaudeMcpCliRunner {
  const bin = command ?? process.env.AIOX_CLAUDE_COMMAND ?? "claude";
  return (args, { cwd }) =>
    new Promise((resolve, reject) => {
      execFile(
        bin,
        args,
        { cwd, maxBuffer: 16 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject(Object.assign(error, { stdout: stdout?.toString() ?? "", stderr: stderr?.toString() ?? "" }));
            return;
          }
          resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
        },
      );
    });
}

export interface AddClaudeMcpJsonOptions {
  /** MCP server name, e.g. "aiox-claude-ingress" */
  name: string;
  /** JSON string in the `claude mcp add-json` shape: {command,args,env} (no `mcpServers` envelope) */
  json: string;
  /** user's cwd — Local scope resolves per-cwd */
  cwd: string;
  /** registration scope, same contract as `claude mcp add-json -s <scope>`: local | user | project */
  scope: ClaudeMcpScope;
  command?: string;
  run?: ClaudeMcpCliRunner;
}

/**
 * `claude mcp add-json <name> <json> -s <scope>` — never treats an existing
 * name as success. On any nonzero exit, wraps the CLI's own stderr verbatim
 * with the name/scope aiox attempted (no interpretation of *why* it failed —
 * see the module contract note above).
 */
export async function addClaudeMcpJson(options: AddClaudeMcpJsonOptions): Promise<void> {
  const run = options.run ?? createClaudeMcpCliRunner(options.command);
  const args = ["mcp", "add-json", options.name, options.json, "-s", options.scope];
  try {
    await run(args, { cwd: options.cwd });
  } catch (error) {
    const stderr = extractStderr(error).trim();
    const detail = stderr.length > 0 ? stderr : describeError(error);
    throw new ClaudeMcpCliError(
      `claude mcp add-json ${options.name} -s ${options.scope} failed: ${detail}`,
      "claude_mcp_cli_failed",
    );
  }
}

export interface CheckClaudeMcpLocalRegistrationOptions {
  name: string;
  /** user's cwd — `claude mcp get` resolves effective scope per-cwd */
  cwd: string;
  command?: string;
  run?: ClaudeMcpCliRunner;
}

export interface ClaudeMcpLocalRegistrationCheck {
  registeredAtLocalScope: boolean;
}

const NOT_REGISTERED_PATTERN = /No MCP server named/i;
const LOCAL_SCOPE_PATTERN = /Scope:\s*Local config/;

/**
 * `claude mcp get <name>` (no `-s`: `get` resolves scope precedence itself,
 * same as the health check Claude runs on startup). Existence-only check — see
 * module contract note above for why a definition-equality check is not
 * attempted.
 */
export async function checkClaudeMcpLocalRegistration(
  options: CheckClaudeMcpLocalRegistrationOptions,
): Promise<ClaudeMcpLocalRegistrationCheck> {
  const run = options.run ?? createClaudeMcpCliRunner(options.command);
  let stdout: string;
  try {
    ({ stdout } = await run(["mcp", "get", options.name], { cwd: options.cwd }));
  } catch (error) {
    const stderr = extractStderr(error);
    if (NOT_REGISTERED_PATTERN.test(stderr)) {
      return { registeredAtLocalScope: false };
    }
    throw new ClaudeMcpCliError(
      `failed to run \`claude mcp get ${options.name}\`: ${describeError(error)}`,
      "claude_mcp_cli_failed",
    );
  }
  return { registeredAtLocalScope: LOCAL_SCOPE_PATTERN.test(stdout) };
}

function extractStderr(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error) {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === "string") {
      return stderr;
    }
  }
  return "";
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
