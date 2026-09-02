import type { HostAdapter } from "./host-adapter.js";
import {
  createCmuxHostAdapter,
  type CreateCmuxHostAdapterOptions,
} from "./cmux-host-adapter.js";

export interface AdapterSelectionContext {
  cwd: string;
  /** Bypasses `detect()`-based selection and picks this exact registered adapter id. */
  explicitAdapterId?: string;
}

export type AdapterSelectionResult =
  | { ok: true; adapter: HostAdapter }
  | { ok: false; reason: "no_matching_adapter" }
  | { ok: false; reason: "unknown_explicit_adapter"; adapterId: string };

/**
 * Holds the registered `HostAdapter` candidates and picks the one for the
 * current environment. Selection never performs cross-category fallback: a
 * failed selection is reported as-is, and the caller (`HostController`)
 * decides what that means.
 *
 * Priority for nested/overlapping environments (e.g. a VS Code integrated
 * terminal that is also a cmux pane) is registration order — the first
 * registered adapter whose `detect()` matches wins. This keeps the registry
 * itself free of any product name or category ranking; the caller that wires
 * up adapters expresses priority by the order it registers them in.
 */
export interface AdapterRegistry {
  register(adapter: HostAdapter): void;
  select(context: AdapterSelectionContext): AdapterSelectionResult;
  list(): readonly HostAdapter[];
}

export function createAdapterRegistry(): AdapterRegistry {
  const adapters: HostAdapter[] = [];

  return {
    register(adapter) {
      if (adapters.some((existing) => existing.id === adapter.id)) {
        throw new Error(`adapter "${adapter.id}" is already registered`);
      }
      adapters.push(adapter);
    },

    select(context) {
      if (context.explicitAdapterId !== undefined) {
        const found = adapters.find((adapter) => adapter.id === context.explicitAdapterId);
        if (!found) {
          return {
            ok: false,
            reason: "unknown_explicit_adapter",
            adapterId: context.explicitAdapterId,
          };
        }
        return { ok: true, adapter: found };
      }

      for (const adapter of adapters) {
        if (adapter.detect({ cwd: context.cwd })) {
          return { ok: true, adapter };
        }
      }

      return { ok: false, reason: "no_matching_adapter" };
    },

    list() {
      return [...adapters];
    },
  };
}

/** Production composition. Generic/test registries remain empty until explicitly registered. */
export function createProductionAdapterRegistry(
  cmuxOptions: CreateCmuxHostAdapterOptions = {},
): AdapterRegistry {
  const registry = createAdapterRegistry();
  registry.register(createCmuxHostAdapter(cmuxOptions));
  return registry;
}
