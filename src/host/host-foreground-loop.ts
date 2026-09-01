import type { HostController } from "./host-controller.js";

/**
 * The smallest deterministic `aiox host new` foreground loop (W6 Stage 5D):
 * repeats `reconcile()` + `handleNextControlRequest()` so another shell's
 * `host add/remove/route` (Stage 5C, accepted) and a future `aiox quit`'s
 * `terminate_all` (W7) get claimed and processed through the existing daemon
 * relay -- no new scheduler/event bus, matching the "no general-purpose
 * polling" principle Stage 5B already established for `reconcile()`.
 *
 * `setInterval` + a re-entrancy guard (never a tight loop) is what keeps an
 * idle host from busy-spinning; a slow tick is skipped over rather than
 * stacked, the same shape as `defaultWatchOwnedAgents` in `src/cli/host.ts`.
 * The loop exits when `handleNextControlRequest()` completes a `terminate_all`
 * (the task record's own exit-condition wording: `getIdentity() === null`,
 * set by `HostController`'s internal `resetState()`) by calling `onTerminated`
 * once.
 *
 * A tick that throws is a real daemon/host failure (a dropped socket, a
 * reconcile/sync error), never a transient condition worth retrying forever
 * — the accepted correction requires this to surface, not disappear behind
 * an endless stream of stderr lines while the process just sits there. The
 * loop stops itself and calls `onFatalError` exactly once instead.
 */

export interface HostForegroundLoopInput {
  controller: HostController;
  onTerminated: () => void;
  /**
   * Called at most once, after the loop has already stopped itself, when a
   * tick throws. The caller (production: `aiox host new`) turns this into a
   * real process failure instead of a silent, endlessly-retried hang.
   */
  onFatalError: (error: unknown) => void;
  intervalMs?: number;
  stderr?: { write(chunk: string): unknown };
}

export type StartHostForegroundLoop = (input: HostForegroundLoopInput) => () => void;

const DEFAULT_HOST_FOREGROUND_LOOP_INTERVAL_MS = 2000;

export function defaultStartHostForegroundLoop(input: HostForegroundLoopInput): () => void {
  const stderr = input.stderr ?? process.stderr;
  let ticking = false;
  let stopped = false;

  const timer = setInterval(() => {
    if (ticking || stopped) {
      return;
    }
    ticking = true;
    (async () => {
      await input.controller.reconcile();
      await input.controller.handleNextControlRequest();
      if (input.controller.getIdentity() === null) {
        stop();
        input.onTerminated();
      }
    })()
      .catch((error: unknown) => {
        stderr.write(`host foreground loop tick failed, stopping: ${describeError(error)}\n`);
        stop();
        input.onFatalError(error);
      })
      .finally(() => {
        ticking = false;
      });
  }, input.intervalMs ?? DEFAULT_HOST_FOREGROUND_LOOP_INTERVAL_MS);

  function stop(): void {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
  }

  return stop;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
