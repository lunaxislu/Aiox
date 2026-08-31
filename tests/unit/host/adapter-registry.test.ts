import { describe, expect, it } from "vitest";

import { createAdapterRegistry } from "../../../src/host/adapter-registry.js";
import type { HostAdapter } from "../../../src/host/host-adapter.js";

function makeAdapter(id: string, detectValue: boolean): HostAdapter {
  return {
    id,
    detect: () => detectValue,
    staticPreflight: async () => ({ ok: true }),
    dynamicPreflight: async () => ({ ok: true }),
    createSurfaceAndStart: async () => {
      throw new Error("not used in registry tests");
    },
  };
}

describe("AdapterRegistry", () => {
  it("registers adapters and selects the one matching the current environment", () => {
    const registry = createAdapterRegistry();
    const matching = makeAdapter("cmux", true);
    registry.register(makeAdapter("terminal-app", false));
    registry.register(matching);

    const result = registry.select({ cwd: "/repo/demo" });

    expect(result).toEqual({ ok: true, adapter: matching });
  });

  it("reports no matching adapter when none detect the current environment", () => {
    const registry = createAdapterRegistry();
    registry.register(makeAdapter("terminal-app", false));
    registry.register(makeAdapter("cmux", false));

    expect(registry.select({ cwd: "/repo/demo" })).toEqual({
      ok: false,
      reason: "no_matching_adapter",
    });
  });

  it("uses registration order as priority for nested/overlapping environments", () => {
    const registry = createAdapterRegistry();
    const higherPriority = makeAdapter("vscode", true);
    const lowerPriority = makeAdapter("cmux", true);
    registry.register(higherPriority);
    registry.register(lowerPriority);

    const result = registry.select({ cwd: "/repo/demo" });

    expect(result).toEqual({ ok: true, adapter: higherPriority });
  });

  it("selects the exact adapter named by an explicit selector, bypassing detect()", () => {
    const registry = createAdapterRegistry();
    const notDetected = makeAdapter("cmux", false);
    registry.register(notDetected);
    registry.register(makeAdapter("terminal-app", true));

    const result = registry.select({ cwd: "/repo/demo", explicitAdapterId: "cmux" });

    expect(result).toEqual({ ok: true, adapter: notDetected });
  });

  it("reports an unknown explicit adapter id instead of falling back to detection", () => {
    const registry = createAdapterRegistry();
    registry.register(makeAdapter("cmux", true));

    const result = registry.select({ cwd: "/repo/demo", explicitAdapterId: "ghostty" });

    expect(result).toEqual({
      ok: false,
      reason: "unknown_explicit_adapter",
      adapterId: "ghostty",
    });
  });

  it("does not perform any automatic cross-category fallback", () => {
    const registry = createAdapterRegistry();
    // Neither adapter detects the environment; selection must fail rather
    // than silently falling back to some other registered candidate.
    registry.register(makeAdapter("terminal-app", false));
    registry.register(makeAdapter("cmux", false));

    expect(registry.select({ cwd: "/anywhere" }).ok).toBe(false);
  });

  it("rejects registering two adapters with the same id", () => {
    const registry = createAdapterRegistry();
    registry.register(makeAdapter("cmux", true));

    expect(() => registry.register(makeAdapter("cmux", false))).toThrow();
  });

  it("lists every registered adapter", () => {
    const registry = createAdapterRegistry();
    const a = makeAdapter("terminal-app", false);
    const b = makeAdapter("cmux", true);
    registry.register(a);
    registry.register(b);

    expect(registry.list()).toEqual([a, b]);
  });
});
