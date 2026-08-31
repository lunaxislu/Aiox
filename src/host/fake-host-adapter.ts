import type {
  HostAdapter,
  HostAdapterAgentSurfaceRequest,
  HostAdapterPreflightResult,
} from "./host-adapter.js";

/**
 * Test double for `HostAdapter`. Never used as a production fallback — it
 * exists only so `HostController`'s orchestration can be driven and observed
 * without a real terminal/IDE product. Controls success/failure at each
 * `createSurfaceAndStart()` call and records every call in order. It carries
 * no ready/exit/termination simulation: `HostAdapter` no longer owns that
 * lifecycle (W6 Stage 4 correction), so tests simulate the existing AIOX
 * agent CLI's ready/detach reports directly against the daemon API and drive
 * `HostController.reconcile()` instead.
 */

export interface FakeHostAdapterCall {
  request: HostAdapterAgentSurfaceRequest;
}

export type FakeHostAdapterFailureStage = "surface" | "cli-start";

export interface FakeHostAdapterFailure {
  /** 1-based index into `createSurfaceAndStart()` invocations. */
  atCall: number;
  stage: FakeHostAdapterFailureStage;
  reason?: string;
}

export interface FakeHostAdapterOptions {
  id?: string;
  detect?: boolean;
  staticPreflight?: HostAdapterPreflightResult;
  dynamicPreflight?: HostAdapterPreflightResult;
}

export interface FakeHostAdapter extends HostAdapter {
  readonly calls: readonly FakeHostAdapterCall[];
  failAtCalls(failures: readonly FakeHostAdapterFailure[]): void;
  setDetect(value: boolean): void;
  setStaticPreflight(result: HostAdapterPreflightResult): void;
  setDynamicPreflight(result: HostAdapterPreflightResult): void;
}

export function createFakeHostAdapter(options: FakeHostAdapterOptions = {}): FakeHostAdapter {
  let detectValue = options.detect ?? true;
  let staticResult: HostAdapterPreflightResult = options.staticPreflight ?? { ok: true };
  let dynamicResult: HostAdapterPreflightResult = options.dynamicPreflight ?? { ok: true };
  const configuredFailures = new Map<number, FakeHostAdapterFailure>();
  let callCount = 0;
  const calls: FakeHostAdapterCall[] = [];

  return {
    id: options.id ?? "fake",

    get calls() {
      return [...calls];
    },

    setDetect(value) {
      detectValue = value;
    },
    setStaticPreflight(result) {
      staticResult = result;
    },
    setDynamicPreflight(result) {
      dynamicResult = result;
    },
    failAtCalls(failures) {
      for (const failure of failures) {
        configuredFailures.set(failure.atCall, failure);
      }
    },

    detect() {
      return detectValue;
    },
    async staticPreflight() {
      return staticResult;
    },
    async dynamicPreflight() {
      return dynamicResult;
    },

    async createSurfaceAndStart(request): Promise<void> {
      callCount += 1;
      const thisCall = callCount;
      calls.push({ request });

      const failure = configuredFailures.get(thisCall);
      if (failure) {
        throw new Error(
          `fake ${failure.stage} failure for agent "${request.agentName}"` +
            (failure.reason ? `: ${failure.reason}` : ""),
        );
      }
    },
  };
}
