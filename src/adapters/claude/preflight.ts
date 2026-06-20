// ---------------------------------------------------------------------------
// Spike: Claude channel-as-plugin preflight (R3 strategy D; rationale in
// docs/decisions/claude-channel-plugin-default.md)
//
// Runs BEFORE spawning `claude` so a missing/misconfigured channel plugin
// surfaces as a clear non-zero CLI error rather than the documented
// silent-drop pattern (exit 0 + startup notice + no inbound push). Pure
// function: all I/O (plugin list, settings, fs, env) is injected so the
// failure contract is testable without a live Claude install.
//
// SCHEMA: confirmed against real `claude plugin list --json`.
// Each entry uses a single `id` = "<name>@<marketplace>" (NOT separate fields),
// carries `installPath` (the installed cache dir reported by `plugin list` — NOT
// always the runtime ${CLAUDE_PLUGIN_ROOT}; see the field comment),
// and `projectPath` on project/local-scope entries.
//
// EFFECTIVENESS (measured — supersedes the earlier projectPath
// re-derivation): `list` reports ALL scopes/projects flat, BUT each entry's
// `enabled` field is NOT a raw per-scope flag — it is the **cwd-resolved
// effective** value, computed relative to the directory where `claude plugin
// list --json` ran, and stamped identically on every entry of that id.
// Evidence: with user=enabled(raw true) + project=disabled(raw false), `list`
// run inside the project reports BOTH entries enabled=false (project-scope
// override wins in-cwd); run from /tmp it reports BOTH true (user fallback).
// → CONTRACT: the caller MUST run `claude plugin list --json` from the user's
// cwd (the dir `aiox claude` is invoked in). Then effectiveness here is simply
// "any matching entry has enabled === true" — Claude already resolved scope
// precedence for us. We do NOT re-derive it from scope/projectPath (doing so
// assumed raw per-scope flags, was the wrong model, and added a needless
// projectRoot-detection dependency that risked false-FAIL).
// ---------------------------------------------------------------------------

export type ClaudePluginScope = "user" | "project" | "local" | "managed";

export interface ClaudePluginListEntry {
  /** "<name>@<marketplace>", e.g. "aiox-channel-ingress@aiox" */
  id: string;
  /**
   * cwd-RESOLVED effective state, NOT the raw per-scope flag.
   * Reflects scope precedence for the directory where `claude plugin list
   * --json` was run; identical across all entries of the same id.
   */
  enabled: boolean;
  /**
   * Known scopes are listed in ClaudePluginScope, but `plugin list --json` could
   * emit a future/unknown scope. Kept honestly string-widened (Codex review) —
   * effectiveness comes from `enabled`, not scope, and scope is
   * only used for diagnostic messages, so an unknown value must not break here.
   */
  scope: ClaudePluginScope | (string & {});
  version?: string;
  /**
   * installed plugin cache dir as reported by `plugin list --json`. NOTE: this
   * is NOT always the runtime ${CLAUDE_PLUGIN_ROOT} — directory-source (dev)
   * marketplaces resolve it to the source dir instead. Used here
   * only as a best-effort location for the bundled channel server.
   */
  installPath?: string;
  /**
   * present on project/local-scope entries: the project this entry belongs to.
   * Diagnostics only — effectiveness comes from `enabled`, not this field.
   */
  projectPath?: string;
}

/** filename of the bundled channel server inside the installed plugin root */
const DEFAULT_CHANNEL_SERVER_FILE = "channel-server.js";

export type PreflightFailureCode =
  | "marketplace_not_registered"
  | "plugin_not_installed"
  | "plugin_not_enabled"
  | "ambiguous_install_path"
  | "channel_server_missing"
  | "missing_env"
  | "channels_disabled";

export interface PreflightClaudePluginInput {
  /** target plugin name, e.g. "aiox-channel-ingress" */
  pluginName: string;
  /** local marketplace name the plugin is sourced from, e.g. "aiox" */
  marketplaceName: string;
  /** marketplace names known to Claude (from settings / `plugin marketplace list`) */
  marketplaces: string[];
  /**
   * parsed `claude plugin list --json` (ALL scopes/projects, flat). CONTRACT:
   * MUST be produced by running the command in the user's cwd, so each entry's
   * `enabled` is resolved for THIS directory.
   */
  plugins: ClaudePluginListEntry[];
  /** bundled channel server filename inside the installed plugin root (default channel-server.js) */
  channelServerFile?: string;
  /**
   * Existence check against the INSTALLED plugin cache. The path is derived from
   * the effective entry's `installPath` (not the marketplace source), resolving
   * Codex review finding 3: `claude plugin install` copies source → cache, so a
   * source-path check could false-pass while the installed copy is stale/missing.
   * NOTE: for directory-source (dev) marketplaces the runtime
   * ${CLAUDE_PLUGIN_ROOT} can resolve to the source dir, not installPath — so
   * this stays a best-effort check; release packaging re-measures generality.
   */
  fileExists: (path: string) => boolean;
  /** identity env that the plugin `.mcp.json` `${VAR}` placeholders expand from */
  env: Record<string, string | undefined>;
  /** org `channelsEnabled` master switch; only `false` blocks (undefined = unknown→pass) */
  channelsEnabled?: boolean;
  /**
   * Whether to enforce the identity-env check (step 7). Default `true` for the
   * attach path, where the spawned `claude` must carry the agent/token/socket the
   * plugin `.mcp.json` expands. `aiox claude-plugin setup` reuses this preflight
   * to validate provisioning (marketplace/install/enable/bundle) but runs with NO
   * token (none is issued at setup time), so it passes `requireEnv: false` to skip
   * the attach-only env gate. Set `false` only blocks step 7; steps 1–6 unchanged.
   */
  requireEnv?: boolean;
}

export type PreflightClaudePluginResult =
  | { ok: true }
  | { ok: false; code: PreflightFailureCode; message: string };

const REQUIRED_ENV = [
  "AIOX_CLAUDE_CHANNEL_AGENT_NAME",
  "AIOX_CLAUDE_CHANNEL_TOKEN",
  "AIOX_SOCKET_PATH",
] as const;

export function preflightClaudePlugin(
  input: PreflightClaudePluginInput,
): PreflightClaudePluginResult {
  const ref = `plugin:${input.pluginName}@${input.marketplaceName}`;

  // 1. org channels master switch — the most fundamental blocker. If channels
  // are off, no marketplace/plugin/env fix helps, so surface it first instead
  // of misleading the user with local repair steps (Codex review finding 4).
  // Only an explicit `false` blocks; undefined = unknown → defer to later checks.
  if (input.channelsEnabled === false) {
    return fail(
      "channels_disabled",
      `Claude channels are disabled by org policy (channelsEnabled=false). ` +
        `Both --channels and --dangerously-load-development-channels are blocked; ` +
        `no inbound push will work until an admin enables it.`,
    );
  }

  // 2. marketplace registered
  if (!input.marketplaces.includes(input.marketplaceName)) {
    return fail(
      "marketplace_not_registered",
      `aiox channel marketplace "${input.marketplaceName}" is not registered. ` +
        `Run: aiox claude-plugin setup --scope user ` +
        `(or --scope project to enable only in this project).`,
    );
  }

  // 3. plugin installed — match by the single `id` field ("<name>@<marketplace>")
  const wantId = `${input.pluginName}@${input.marketplaceName}`;
  const matching = input.plugins.filter((p) => p.id === wantId);
  if (matching.length === 0) {
    return fail(
      "plugin_not_installed",
      `aiox channel plugin "${wantId}" is not installed. ` +
        `Run: aiox claude-plugin setup --scope user ` +
        `(or --scope project to install only in this project).`,
    );
  }

  // 4. effective in THIS cwd. `enabled` is already the cwd-resolved value
  // so we trust it directly instead of re-deriving from
  // scope/projectPath. The caller's CONTRACT (list run in the user's cwd)
  // makes this correct, and because Claude resolves scope precedence before
  // stamping `enabled`, a project/local *disabled* override of a user-scope
  // *enabled* fallback already shows as enabled=false here → no false-pass.
  const effective = matching.filter((p) => p.enabled);
  if (effective.length === 0) {
    const scopes = [...new Set(matching.map((p) => p.scope))].join(", ");
    return fail(
      "plugin_not_enabled",
      `aiox channel plugin "${wantId}" is installed (scope: ${scopes}) but not ` +
        `effective in this directory (claude plugin list reports it disabled here). ` +
        `Run: aiox claude-plugin setup --scope user so it works everywhere, ` +
        `or aiox claude-plugin setup --scope project to enable it in this project, ` +
        `before activating ${ref}.`,
    );
  }

  // 5. resolve the installed bundle path. Normally all effective entries of an
  // id share one installPath, but version/scope skew (e.g.
  // a stale user-scope copy + a newer project-scope copy) could report divergent
  // paths; picking effective[0] blindly would then validate the wrong artifact
  // (Codex review). Guard: if effective entries disagree on
  // installPath, stop with a clear skew error rather than silently choosing one.
  const serverFile = input.channelServerFile ?? DEFAULT_CHANNEL_SERVER_FILE;
  const installPaths = [
    ...new Set(
      effective
        .map((p) => p.installPath)
        .filter((p): p is string => p !== undefined),
    ),
  ];
  if (installPaths.length > 1) {
    return fail(
      "ambiguous_install_path",
      `aiox channel plugin "${wantId}" is effective from multiple install paths ` +
        `(${installPaths.join(", ")}) — likely a version/scope skew. Reinstall so a ` +
        `single copy is effective (uninstall the stale scope) before activating ${ref}.`,
    );
  }

  // 6. bundled channel server present in the INSTALLED cache (installPath-derived).
  const installPath = installPaths[0];
  const serverPath =
    installPath !== undefined
      ? `${installPath.replace(/\/+$/, "")}/${serverFile}`
      : undefined;
  if (serverPath === undefined || !input.fileExists(serverPath)) {
    return fail(
      "channel_server_missing",
      `bundled channel server not found at "${serverPath ?? `<installPath missing for ${wantId}>`}". ` +
        `Rebuild the bundle (spike/build-plugin.sh) and reinstall the plugin.`,
    );
  }

  // 7. required identity env (expanded by the plugin .mcp.json ${VAR} placeholders).
  // Attach-only gate: `aiox claude-plugin setup` validates provisioning before any
  // token exists, so it opts out with requireEnv:false (steps 1–6 still apply).
  if (input.requireEnv !== false) {
    for (const name of REQUIRED_ENV) {
      const value = input.env[name];
      if (typeof value !== "string" || value.length === 0) {
        return fail(
          "missing_env",
          `required environment variable ${name} is missing; the plugin .mcp.json ` +
            `cannot expand its \${${name}} placeholder.`,
        );
      }
    }
  }

  return { ok: true };
}

function fail(
  code: PreflightFailureCode,
  message: string,
): PreflightClaudePluginResult {
  return { ok: false, code, message };
}
