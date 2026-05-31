import { describe, expect, it } from "vitest";

import { setupClaudePlugin } from "../../../src/adapters/claude/setup.js";
import type { ClaudePluginInventory } from "../../../src/adapters/claude/plugin-cli.js";

// ---------------------------------------------------------------------------
// R3 step 3a: `aiox claude-plugin setup` orchestration.
// All side effects injected: marketplace add / plugin install are recorded, and
// `loadInventory` returns a mutable state so the post-action reload reflects the
// installs. Pins idempotency (skip add/install when already satisfied), the
// install scope, the cwd contract, and the final-preflight verdict passthrough.
// ---------------------------------------------------------------------------

const PLUGIN = "aiox-channel-ingress";
const MARKETPLACE = "aiox";
const REF = `${PLUGIN}@${MARKETPLACE}`;
const MARKETPLACE_PATH = "/repo/spike/aiox-channel-marketplace";
const CWD = "/Users/me/Documents/ai-orchestration";
const INSTALL_PATH = "/Users/me/.claude/plugins/cache/aiox/aiox-channel-ingress/0.1.0";
const SERVER_PATH = `${INSTALL_PATH}/channel-server.js`;

function effectiveInventory(): ClaudePluginInventory {
  return {
    marketplaces: [MARKETPLACE],
    plugins: [
      { id: REF, enabled: true, scope: "user", version: "0.1.0", installPath: INSTALL_PATH },
    ],
  };
}

/**
 * Harness: a mutable inventory + recorded calls. `installPlugin` flips the
 * inventory to an effective state so the post-action reload + preflight pass,
 * mirroring real `claude plugin install` (source→cache + raw enable).
 */
function harness(initial: ClaudePluginInventory) {
  const calls = {
    load: [] as { cwd: string }[],
    addMarketplace: [] as { marketplacePath: string; scope: string; cwd: string }[],
    install: [] as { pluginRef: string; scope: string; cwd: string }[],
  };
  let state = initial;
  return {
    calls,
    setState(next: ClaudePluginInventory) {
      state = next;
    },
    deps: {
      loadInventory: async ({ cwd }: { cwd: string }) => {
        calls.load.push({ cwd });
        return state;
      },
      addMarketplace: async (o: { marketplacePath: string; scope: "user" | "project"; cwd: string }) => {
        calls.addMarketplace.push(o);
        if (!state.marketplaces.includes(MARKETPLACE)) {
          state = { ...state, marketplaces: [...state.marketplaces, MARKETPLACE] };
        }
      },
      installPlugin: async (o: { pluginRef: string; scope: "user" | "project"; cwd: string }) => {
        calls.install.push(o);
        state = effectiveInventory();
      },
      fileExists: (p: string) => p === SERVER_PATH,
    },
  };
}

function run(h: ReturnType<typeof harness>, scope: "user" | "project" = "user") {
  return setupClaudePlugin({
    pluginName: PLUGIN,
    marketplaceName: MARKETPLACE,
    marketplacePath: MARKETPLACE_PATH,
    scope,
    cwd: CWD,
    ...h.deps,
  });
}

describe("setupClaudePlugin", () => {
  it("is a no-op when marketplace registered + plugin already effective", async () => {
    const h = harness(effectiveInventory());
    const result = await run(h);

    expect(result).toEqual({ ok: true, actions: { marketplaceAdded: false, pluginInstalled: false } });
    expect(h.calls.addMarketplace).toEqual([]);
    expect(h.calls.install).toEqual([]);
    // single inventory read; no reload needed when nothing changed
    expect(h.calls.load).toEqual([{ cwd: CWD }]);
  });

  it("adds the marketplace (resolved path + setup scope) when it is not registered", async () => {
    const h = harness({ marketplaces: [], plugins: [] });
    const result = await run(h, "project");

    expect(result.ok).toBe(true);
    // marketplace add must use the SAME scope as the install (Codex review)
    expect(h.calls.addMarketplace).toEqual([
      { marketplacePath: MARKETPLACE_PATH, scope: "project", cwd: CWD },
    ]);
  });

  it("does not add the marketplace when already registered", async () => {
    const h = harness({ marketplaces: [MARKETPLACE], plugins: [] });
    await run(h);
    expect(h.calls.addMarketplace).toEqual([]);
  });

  it("installs at the requested scope when the plugin is missing", async () => {
    const h = harness({ marketplaces: [MARKETPLACE], plugins: [] });
    const result = await run(h, "project");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.actions.pluginInstalled).toBe(true);
    expect(h.calls.install).toEqual([{ pluginRef: REF, scope: "project", cwd: CWD }]);
  });

  it("installs when the plugin is present but disabled in this cwd", async () => {
    const h = harness({
      marketplaces: [MARKETPLACE],
      plugins: [{ id: REF, enabled: false, scope: "user", version: "0.1.0", installPath: INSTALL_PATH }],
    });
    await run(h);
    expect(h.calls.install).toEqual([{ pluginRef: REF, scope: "user", cwd: CWD }]);
  });

  it("does not install when the plugin is already effective", async () => {
    const h = harness(effectiveInventory());
    await run(h);
    expect(h.calls.install).toEqual([]);
  });

  it("reloads inventory after acting and validates with preflight", async () => {
    const h = harness({ marketplaces: [], plugins: [] });
    await run(h);
    // reload after add+install so preflight sees the provisioned state
    expect(h.calls.load).toEqual([{ cwd: CWD }, { cwd: CWD }]);
  });

  it("returns a coded failure when provisioning does not make it effective", async () => {
    // higher-scope override edge: install runs but a project-scope disable keeps
    // it ineffective in this cwd → preflight verdict surfaces, not a false success.
    const h = harness({ marketplaces: [MARKETPLACE], plugins: [] });
    h.deps.installPlugin = async (o: { pluginRef: string; scope: "user" | "project"; cwd: string }) => {
      h.calls.install.push(o);
      h.setState({
        marketplaces: [MARKETPLACE],
        plugins: [
          { id: REF, enabled: false, scope: "project", version: "0.1.0", installPath: INSTALL_PATH, projectPath: CWD },
        ],
      });
    };

    const result = await run(h);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("plugin_not_enabled");
      expect(result.actions.pluginInstalled).toBe(true);
    }
  });

  it("propagates a CLI failure thrown by install", async () => {
    const h = harness({ marketplaces: [MARKETPLACE], plugins: [] });
    h.deps.installPlugin = async () => {
      throw new Error("network error");
    };
    await expect(run(h)).rejects.toThrow("network error");
  });
});
