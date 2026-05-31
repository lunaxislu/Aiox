import { execFile } from "node:child_process";

import type { ClaudePluginListEntry } from "./preflight.js";

// ---------------------------------------------------------------------------
// Adapter: read Claude's plugin inventory from the `claude` CLI (R3 step 1).
//
// Feeds the channel-as-plugin preflight (preflight.ts). Two JSON commands:
//   claude plugin marketplace list --json   → registered marketplace names
//   claude plugin list --json               → installed plugin entries
//
// CONTRACT (history/52, Codex review): both commands MUST run in the user's
// cwd, because `plugin list --json` reports each entry's `enabled` already
// RESOLVED for that directory's scope precedence. So `cwd` is a REQUIRED option
// here and the default runner forwards it to the child process — there is no
// implicit `process.cwd()` fallback inside this adapter. The single cwd choice
// is made by the caller (invocation), not here.
//
// Parsing is strict on the fields preflight depends on (`id`, `enabled`, plus a
// string `scope`); malformed output throws a typed ClaudePluginCliError rather
// than silently yielding a partial inventory.
// ---------------------------------------------------------------------------

/** Runs a `claude <args>` invocation in a specific cwd and returns its stdout. */
export type ClaudeCliRunner = (
  args: string[],
  options: { cwd: string },
) => Promise<{ stdout: string }>;

export interface LoadClaudePluginInventoryOptions {
  /**
   * REQUIRED: the user's cwd. `plugin list --json` resolves `enabled` relative
   * to this directory (history/52), so it must be the dir `aiox claude` runs in.
   */
  cwd: string;
  /** claude binary; defaults to AIOX_CLAUDE_COMMAND or "claude". */
  command?: string;
  /** injectable runner (tests); defaults to an execFile-based runner. */
  run?: ClaudeCliRunner;
}

export interface ClaudePluginInventory {
  /** marketplace names from `plugin marketplace list --json` */
  marketplaces: string[];
  /** installed entries from `plugin list --json` (all scopes/projects, flat) */
  plugins: ClaudePluginListEntry[];
}

export type ClaudePluginCliErrorCode =
  | "claude_plugin_cli_failed"
  | "claude_plugin_cli_parse_failed";

export class ClaudePluginCliError extends Error {
  readonly code: ClaudePluginCliErrorCode;

  constructor(message: string, code: ClaudePluginCliErrorCode) {
    super(message);
    this.name = "ClaudePluginCliError";
    this.code = code;
  }
}

export async function loadClaudePluginInventory(
  options: LoadClaudePluginInventoryOptions,
): Promise<ClaudePluginInventory> {
  const run = options.run ?? createClaudeCliRunner(options.command);

  const marketplacesJson = await runJson(
    run,
    ["plugin", "marketplace", "list", "--json"],
    options.cwd,
  );
  const pluginsJson = await runJson(
    run,
    ["plugin", "list", "--json"],
    options.cwd,
  );

  return {
    marketplaces: parseMarketplaceNames(marketplacesJson),
    plugins: parsePluginEntries(pluginsJson),
  };
}

// Default runner: execFile in the given cwd, resolve stdout. Wrapped manually
// (not promisify) so the child-process boundary is straightforward to mock.
export function createClaudeCliRunner(command?: string): ClaudeCliRunner {
  const bin = command ?? process.env.AIOX_CLAUDE_COMMAND ?? "claude";
  return (args, { cwd }) =>
    new Promise((resolve, reject) => {
      execFile(
        bin,
        args,
        { cwd, maxBuffer: 16 * 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }
          resolve({ stdout: stdout.toString() });
        },
      );
    });
}

// ---------------------------------------------------------------------------
// Write ops (R3 step 3a): the mutating `claude plugin` commands `aiox
// claude-plugin setup` issues. Same cwd-required runner contract as the
// inventory reads (scope-affecting commands resolve per-cwd), but no JSON parse
// — they either succeed or throw a typed ClaudePluginCliError.
// ---------------------------------------------------------------------------

export interface AddClaudeMarketplaceOptions {
  /** local marketplace dir to register (contains .claude-plugin/marketplace.json) */
  marketplacePath: string;
  /**
   * registration scope — passed through so `aiox claude-plugin setup --scope X`
   * registers the marketplace in the SAME scope as the plugin install (Codex
   * review): a project-scoped setup must not silently register the marketplace
   * at the default user scope. `marketplace add` supports user|project|local;
   * we only emit user|project (parse rejects the rest).
   */
  scope: "user" | "project";
  /** user's cwd (project-scope settings are written relative to it) */
  cwd: string;
  command?: string;
  run?: ClaudeCliRunner;
}

/** `claude plugin marketplace add <marketplacePath> --scope <scope>` — idempotency is the caller's job. */
export async function addClaudeMarketplace(
  options: AddClaudeMarketplaceOptions,
): Promise<void> {
  const run = options.run ?? createClaudeCliRunner(options.command);
  await runVoid(
    run,
    ["plugin", "marketplace", "add", options.marketplacePath, "--scope", options.scope],
    options.cwd,
  );
}

export interface InstallClaudePluginOptions {
  /** "<name>@<marketplace>", e.g. "aiox-channel-ingress@aiox" */
  pluginRef: string;
  /** install scope; `install` writes raw enabledPlugins:{ref:true} at this scope */
  scope: "user" | "project";
  /** user's cwd (project-scope install writes ./.claude/settings.json relative to it) */
  cwd: string;
  command?: string;
  run?: ClaudeCliRunner;
}

/** `claude plugin install <ref> --scope <scope>` — install also raw-enables at scope (history/52). */
export async function installClaudePlugin(
  options: InstallClaudePluginOptions,
): Promise<void> {
  const run = options.run ?? createClaudeCliRunner(options.command);
  await runVoid(
    run,
    ["plugin", "install", options.pluginRef, "--scope", options.scope],
    options.cwd,
  );
}

async function runVoid(
  run: ClaudeCliRunner,
  args: string[],
  cwd: string,
): Promise<void> {
  const label = `claude ${args.join(" ")}`;
  try {
    await run(args, { cwd });
  } catch (error) {
    throw new ClaudePluginCliError(
      `failed to run \`${label}\`: ${error instanceof Error ? error.message : String(error)}`,
      "claude_plugin_cli_failed",
    );
  }
}

async function runJson(
  run: ClaudeCliRunner,
  args: string[],
  cwd: string,
): Promise<unknown> {
  const label = `claude ${args.join(" ")}`;
  let stdout: string;
  try {
    ({ stdout } = await run(args, { cwd }));
  } catch (error) {
    throw new ClaudePluginCliError(
      `failed to run \`${label}\`: ${error instanceof Error ? error.message : String(error)}`,
      "claude_plugin_cli_failed",
    );
  }
  try {
    return JSON.parse(stdout);
  } catch {
    throw new ClaudePluginCliError(
      `\`${label}\` did not return valid JSON`,
      "claude_plugin_cli_parse_failed",
    );
  }
}

function parseMarketplaceNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw parseFail("`plugin marketplace list --json` was not a JSON array");
  }
  return raw.map((item, i) => {
    const name = asRecord(item, `marketplace[${i}]`).name;
    if (typeof name !== "string" || name.length === 0) {
      throw parseFail(`marketplace[${i}] is missing a string \`name\``);
    }
    return name;
  });
}

function parsePluginEntries(raw: unknown): ClaudePluginListEntry[] {
  if (!Array.isArray(raw)) {
    throw parseFail("`plugin list --json` was not a JSON array");
  }
  return raw.map((item, i) => parsePluginEntry(item, `plugin[${i}]`));
}

function parsePluginEntry(item: unknown, ctx: string): ClaudePluginListEntry {
  const o = asRecord(item, ctx);

  if (typeof o.id !== "string" || o.id.length === 0) {
    throw parseFail(`${ctx} is missing a string \`id\``);
  }
  if (typeof o.enabled !== "boolean") {
    throw parseFail(`${ctx} is missing a boolean \`enabled\``);
  }
  if (typeof o.scope !== "string") {
    throw parseFail(`${ctx} is missing a string \`scope\``);
  }

  const entry: ClaudePluginListEntry = {
    id: o.id,
    enabled: o.enabled,
    // kept as-is: scope is string-widened in the type (Codex review, history/53)
    // because effectiveness comes from `enabled`; an unknown scope must not break.
    scope: o.scope,
  };
  entry.version = optionalString(o.version, `${ctx}.version`);
  entry.installPath = optionalString(o.installPath, `${ctx}.installPath`);
  entry.projectPath = optionalString(o.projectPath, `${ctx}.projectPath`);
  return prune(entry);
}

function optionalString(value: unknown, ctx: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw parseFail(`${ctx} must be a string when present`);
  }
  return value;
}

// Drop keys left undefined so the entry matches the optional-field shape cleanly.
function prune(entry: ClaudePluginListEntry): ClaudePluginListEntry {
  if (entry.version === undefined) delete entry.version;
  if (entry.installPath === undefined) delete entry.installPath;
  if (entry.projectPath === undefined) delete entry.projectPath;
  return entry;
}

function asRecord(item: unknown, ctx: string): Record<string, unknown> {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    throw parseFail(`${ctx} is not an object`);
  }
  return item as Record<string, unknown>;
}

function parseFail(message: string): ClaudePluginCliError {
  return new ClaudePluginCliError(message, "claude_plugin_cli_parse_failed");
}
