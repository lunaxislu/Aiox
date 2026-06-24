import { describe, expect, it } from "vitest";

import {
  preflightClaudePlugin,
  type ClaudePluginListEntry,
  type ClaudePluginScope,
  type PreflightClaudePluginInput,
} from "../../../src/adapters/claude/preflight.js";

// ---------------------------------------------------------------------------
// Spike: channel-as-plugin preflight failure contract; surviving WHY lives in
// docs/decisions/claude-channel-plugin-default.md.
// Schema confirmed against real `claude plugin list --json`:
// single `id` = "<name>@<marketplace>", `installPath` (installed cache dir),
// `projectPath` on project/local entries, `list` reports all scopes flat.
//
// EFFECTIVENESS model (legacy R3 measured): each entry's `enabled` is the
// cwd-RESOLVED effective value (relative to where `claude plugin list --json`
// ran), NOT a raw per-scope flag. So these fixtures set `enabled` to what the
// real command would already report for the user's cwd, and preflight trusts
// it directly (no projectRoot / projectPath re-derivation).
//
// The preflight runs BEFORE spawning `claude`, so a missing/misconfigured
// plugin surfaces as a clear non-zero CLI error instead of a silent-drop or
// an opaque dev-channel failure. Pure function, dependency-injected.
// ---------------------------------------------------------------------------

const PLUGIN = "aiox-channel-ingress";
const MARKETPLACE = "aiox";
const ID = `${PLUGIN}@${MARKETPLACE}`;
const PROJECT_ROOT = "/Users/me/Documents/ai-orchestration";
const INSTALL_PATH = "/Users/me/.claude/plugins/cache/aiox/aiox-channel-ingress/0.1.0";
const SERVER_PATH = `${INSTALL_PATH}/channel-server.js`;

function baseInput(
  overrides: Partial<PreflightClaudePluginInput> = {},
): PreflightClaudePluginInput {
  return {
    pluginName: PLUGIN,
    marketplaceName: MARKETPLACE,
    marketplaces: [MARKETPLACE],
    plugins: [userEntry(true)],
    fileExists: (p) => p === SERVER_PATH,
    env: {
      AIOX_CLAUDE_CHANNEL_AGENT_NAME: "alpha",
      AIOX_CLAUDE_CHANNEL_TOKEN: "tok-1",
      AIOX_SOCKET_PATH: "/tmp/aiox.sock",
    },
    channelsEnabled: true,
    ...overrides,
  };
}

function userEntry(enabled: boolean): ClaudePluginListEntry {
  return {
    id: ID,
    enabled,
    scope: "user",
    version: "0.1.0",
    installPath: INSTALL_PATH,
  };
}

function projectEntry(
  enabled: boolean,
  projectPath: string,
  scope: ClaudePluginScope = "project",
): ClaudePluginListEntry {
  return { id: ID, enabled, scope, version: "0.1.0", installPath: INSTALL_PATH, projectPath };
}

describe("preflightClaudePlugin", () => {
  it("passes for a user-scope enabled plugin with the bundle present", () => {
    expect(preflightClaudePlugin(baseInput())).toEqual({ ok: true });
  });

  it("passes for a project-scope entry that resolves enabled in this cwd", () => {
    // `enabled` is already cwd-resolved, so a resolved-true project entry passes
    // without preflight re-checking projectPath.
    const result = preflightClaudePlugin(
      baseInput({ plugins: [projectEntry(true, PROJECT_ROOT)] }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("passes when user + project entries both resolve enabled (real list shape)", () => {
    // `list` reports every scope flat; when effective here, all entries of the
    // id carry enabled=true. Any one supplies the shared installPath.
    const result = preflightClaudePlugin(
      baseInput({ plugins: [userEntry(true), projectEntry(true, PROJECT_ROOT)] }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("fails when the marketplace is not registered", () => {
    const result = preflightClaudePlugin(baseInput({ marketplaces: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("marketplace_not_registered");
      expect(result.message).toContain(MARKETPLACE);
    }
  });

  it("fails when the plugin is not installed", () => {
    const result = preflightClaudePlugin(baseInput({ plugins: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("plugin_not_installed");
      expect(result.message).toContain(ID);
      expect(result.message.toLowerCase()).toContain("install");
    }
  });

  it("fails when the only entry resolves disabled in this cwd", () => {
    // e.g. a project-scope entry for another project: run from here, `list`
    // resolves its `enabled` to false. projectPath is diagnostic.
    const result = preflightClaudePlugin(
      baseInput({
        plugins: [projectEntry(false, "/Users/me/Documents/other-project")],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("plugin_not_enabled");
      expect(result.message.toLowerCase()).toContain("scope");
    }
  });

  it("fails on the measured precedence-override case: project disable overrides user enable", () => {
    // MEASURED regression guard. Raw settings = user:enabled + project:disabled,
    // but `list` run in the project cwd resolves BOTH entries to enabled=false
    // (project scope wins in-cwd). preflight must NOT false-pass off the
    // user entry's raw intent — it trusts the resolved `enabled`.
    const result = preflightClaudePlugin(
      baseInput({
        plugins: [userEntry(false), projectEntry(false, PROJECT_ROOT)],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("plugin_not_enabled");
    }
  });

  it("fails when effective entries disagree on installPath (version/scope skew)", () => {
      // Codex review: two effective copies with divergent installPaths
    // (e.g. stale user-scope + newer project-scope) must not silently validate
    // effective[0]'s artifact — surface the skew explicitly.
    const STALE = "/Users/me/.claude/plugins/cache/aiox/aiox-channel-ingress/0.0.9";
    const result = preflightClaudePlugin(
      baseInput({
        plugins: [
          userEntry(true),
          {
            id: ID,
            enabled: true,
            scope: "project",
            version: "0.0.9",
            installPath: STALE,
            projectPath: PROJECT_ROOT,
          },
        ],
        fileExists: () => true,
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ambiguous_install_path");
      expect(result.message).toContain(STALE);
    }
  });

  it("fails when the bundled channel-server.js is missing from the install cache", () => {
    const result = preflightClaudePlugin(baseInput({ fileExists: () => false }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("channel_server_missing");
      expect(result.message).toContain(SERVER_PATH);
    }
  });

  it("fails when the effective entry has no installPath", () => {
    const result = preflightClaudePlugin(
      baseInput({
        plugins: [{ id: ID, enabled: true, scope: "user", version: "0.1.0" }],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("channel_server_missing");
    }
  });

  it.each([
    "AIOX_CLAUDE_CHANNEL_AGENT_NAME",
    "AIOX_CLAUDE_CHANNEL_TOKEN",
    "AIOX_SOCKET_PATH",
  ])("fails when required env %s is missing", (missing) => {
    const env = {
      AIOX_CLAUDE_CHANNEL_AGENT_NAME: "alpha",
      AIOX_CLAUDE_CHANNEL_TOKEN: "tok-1",
      AIOX_SOCKET_PATH: "/tmp/aiox.sock",
    } as Record<string, string | undefined>;
    delete env[missing];
    const result = preflightClaudePlugin(baseInput({ env }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("missing_env");
      expect(result.message).toContain(missing);
    }
  });

  it("skips the env check when requireEnv:false (setup-time provisioning)", () => {
    // `aiox claude-plugin setup` reuses this preflight to validate
    // marketplace/install/enable/bundle, but no token exists at setup time, so it
    // opts out of the attach-only env gate. Steps 1–6 still apply.
    const result = preflightClaudePlugin(
      baseInput({ env: {}, requireEnv: false }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("still enforces steps 1–6 when requireEnv:false (e.g. plugin missing)", () => {
    const result = preflightClaudePlugin(
      baseInput({ env: {}, requireEnv: false, plugins: [] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("plugin_not_installed");
    }
  });

  it("fails first when channels are disabled by org policy", () => {
    const result = preflightClaudePlugin(baseInput({ channelsEnabled: false }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("channels_disabled");
      expect(result.message.toLowerCase()).toContain("channelsenabled");
    }
  });

  it("ignores plugin entries for a different marketplace (id mismatch)", () => {
    const result = preflightClaudePlugin(
      baseInput({
        plugins: [
          {
            id: `${PLUGIN}@someone-else`,
            enabled: true,
            scope: "user",
            installPath: INSTALL_PATH,
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("plugin_not_installed");
    }
  });
});
