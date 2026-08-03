import type { ClaudeMcpScope } from "../../core/claude-mcp-scope.js";
import { addClaudeMcpJson, ClaudeMcpCliError } from "./mcp-cli.js";

// ---------------------------------------------------------------------------
// `aiox claude setup` orchestration: non-overwriting provisioning of the static
// Claude MCP definition at the selected scope (default: local — the scope
// `aiox claude`'s default Local static MCP strategy relies on; user/project
// are explicit opt-ins, same contract as `claude mcp add-json -s <scope>`).
//
// No auto-diff on collision (user decision 2026-08-03, recorded in
// logs/G1/2026-07-29-G1-B-canonical-presentation-corrective.md): `claude mcp
// get`/`list` never expose the stored command/args/env in a structured form
// (see mcp-cli.ts), so this orchestrator cannot reliably tell an identical
// re-registration from a genuinely different one. Rather than silently
// overwriting a user's own MCP entry under this name, ANY `addClaudeMcpJson`
// failure — a collision or anything else, in whichever scope was selected —
// is reported as a failure.
//
// Message policy (2026-08-03, same log): this orchestrator does not classify
// a collision separately from any other CLI failure and does not author its
// own remediation text. `addClaudeMcpJson` already states the name/scope it
// attempted and passes the CLI's own stderr through verbatim, so this layer
// just forwards that message as-is — a prior scope-specific classifier here
// duplicated a regex-based one in mcp-cli.ts that had already gone stale for
// one scope's wording.
// ---------------------------------------------------------------------------

export interface SetupClaudeMcpInput {
  /** MCP server name, e.g. "aiox-claude-ingress" */
  name: string;
  /** JSON string in the `claude mcp add-json` shape: {command,args,env} */
  json: string;
  /** user's cwd — Local scope resolves per-cwd */
  cwd: string;
  /** registration scope, same contract as `claude mcp add-json -s <scope>`: local | user | project */
  scope: ClaudeMcpScope;

  // Injected I/O (defaults to the real adapter).
  addClaudeMcpJson?: (input: {
    name: string;
    json: string;
    cwd: string;
    scope: ClaudeMcpScope;
  }) => Promise<void>;
}

export type SetupClaudeMcpResult =
  | { ok: true }
  | {
      ok: false;
      code: "claude_mcp_cli_failed";
      message: string;
    };

export async function setupClaudeMcp(
  input: SetupClaudeMcpInput,
): Promise<SetupClaudeMcpResult> {
  const add = input.addClaudeMcpJson ?? addClaudeMcpJson;

  try {
    await add({ name: input.name, json: input.json, cwd: input.cwd, scope: input.scope });
  } catch (error) {
    if (error instanceof ClaudeMcpCliError) {
      return { ok: false, code: "claude_mcp_cli_failed", message: error.message };
    }
    throw error;
  }

  return { ok: true };
}
