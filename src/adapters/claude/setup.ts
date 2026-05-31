import { existsSync } from "node:fs";

import {
  addClaudeMarketplace,
  installClaudePlugin,
  loadClaudePluginInventory,
  type ClaudePluginInventory,
} from "./plugin-cli.js";
import {
  preflightClaudePlugin,
  type PreflightFailureCode,
} from "./preflight.js";

// ---------------------------------------------------------------------------
// R3 step 3a: `aiox claude-plugin setup` orchestration.
//
// Idempotently provisions the channel plugin so the strategy-D activation path
// resolves, then validates with the SAME preflight the attach path uses (minus
// the attach-only env gate). Pure orchestration: every side effect (inventory
// read, marketplace add, plugin install, fs existence) is injected so the
// command flow is unit-testable without a live `claude`.
//
// Provisioning policy (history/52):
//   - marketplace add only if the marketplace isn't registered yet (idempotent).
//   - `claude plugin install --scope <scope>` writes raw enabledPlugins:{ref:true}
//     at that scope, so install also (re-)enables; no separate enable step.
//   - the ONE case install can't fix is a higher-precedence scope explicitly
//     DISABLING the plugin in this cwd (e.g. a project disable overriding a
//     user install). That surfaces honestly as the final preflight's
//     `plugin_not_enabled` verdict rather than a silent "setup succeeded".
// ---------------------------------------------------------------------------

export interface SetupClaudePluginInput {
  /** target plugin name, e.g. "aiox-channel-ingress" */
  pluginName: string;
  /** local marketplace name, e.g. "aiox" */
  marketplaceName: string;
  /** local marketplace dir to register if absent */
  marketplacePath: string;
  /** install scope (only user|project are accepted upstream in parse) */
  scope: "user" | "project";
  /** user's cwd — threaded into every `claude` call (scope resolves per-cwd) */
  cwd: string;
  /** org channels master switch; setup leaves it undefined (not probed here) */
  channelsEnabled?: boolean;

  // Injected I/O (default to the real adapters / fs).
  loadInventory?: (options: { cwd: string }) => Promise<ClaudePluginInventory>;
  addMarketplace?: (options: {
    marketplacePath: string;
    scope: "user" | "project";
    cwd: string;
  }) => Promise<void>;
  installPlugin?: (options: {
    pluginRef: string;
    scope: "user" | "project";
    cwd: string;
  }) => Promise<void>;
  fileExists?: (path: string) => boolean;
}

export interface SetupActions {
  /** whether `claude plugin marketplace add` was run this invocation */
  marketplaceAdded: boolean;
  /** whether `claude plugin install` was run this invocation */
  pluginInstalled: boolean;
}

export type SetupClaudePluginResult =
  | { ok: true; actions: SetupActions }
  | {
      ok: false;
      code: PreflightFailureCode;
      message: string;
      actions: SetupActions;
    };

export async function setupClaudePlugin(
  input: SetupClaudePluginInput,
): Promise<SetupClaudePluginResult> {
  const loadInventory = input.loadInventory ?? loadClaudePluginInventory;
  const addMarketplace = input.addMarketplace ?? addClaudeMarketplace;
  const installPlugin = input.installPlugin ?? installClaudePlugin;
  const fileExists = input.fileExists ?? existsSync;
  const ref = `${input.pluginName}@${input.marketplaceName}`;
  const actions: SetupActions = {
    marketplaceAdded: false,
    pluginInstalled: false,
  };

  // 1. current state, resolved for this cwd (ClaudePluginCliError propagates).
  const before = await loadInventory({ cwd: input.cwd });

  // 2. register the marketplace (in the SAME scope as the install) if it isn't
  // known yet. NOTE (Codex review, Step 3a scope): we do NOT verify the scope
  // PROVENANCE of an already-visible marketplace — `marketplace list --json`'s
  // scope semantics aren't a firm contract yet, so a user-scope registration
  // visible in a project cwd still counts as "registered" here and add is
  // skipped. Full project self-contained-marketplace guarantee is out of Step 3a.
  if (!before.marketplaces.includes(input.marketplaceName)) {
    await addMarketplace({
      marketplacePath: input.marketplacePath,
      scope: input.scope,
      cwd: input.cwd,
    });
    actions.marketplaceAdded = true;
  }

  // 3. install (also raw-enables at scope) unless the plugin is already
  // effective in THIS cwd. `enabled` from `list --json` is the cwd-resolved
  // value, so this matches what the attach-time preflight will check.
  const effective = before.plugins.some((p) => p.id === ref && p.enabled);
  if (!effective) {
    await installPlugin({ pluginRef: ref, scope: input.scope, cwd: input.cwd });
    actions.pluginInstalled = true;
  }

  // 4. validate with the attach-path preflight (env gate skipped — no token at
  // setup time). Reload only if we changed anything; a pure no-op reuses `before`.
  const after =
    actions.marketplaceAdded || actions.pluginInstalled
      ? await loadInventory({ cwd: input.cwd })
      : before;
  const result = preflightClaudePlugin({
    pluginName: input.pluginName,
    marketplaceName: input.marketplaceName,
    marketplaces: after.marketplaces,
    plugins: after.plugins,
    fileExists,
    env: {},
    requireEnv: false,
    ...(input.channelsEnabled === undefined
      ? {}
      : { channelsEnabled: input.channelsEnabled }),
  });

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message, actions };
  }
  return { ok: true, actions };
}
