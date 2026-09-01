/**
 * Central formatter for the host-starting commands' (`aiox host new` and
 * `aiox host`) static/dynamic integration failures (W6 accepted failure
 * contract, Blocker 2 correction): every such failure must carry the real
 * cause, a help pointer, and the literal sentence "No agents were started."
 * No product `HostAdapter` (Category A/B/C, Stage 7-9) is implemented yet,
 * so today's only real static failure is "no adapter registered" -- a
 * build-capability gap, not a per-product integration problem, so a
 * fabricated per-product README/GitHub anchor would be dishonest.
 * `README.md` documents the AIOX workflows that this build actually
 * supports, without claiming it contains host-adapter setup.
 */

export interface HostIntegrationFailure {
  stage: "static_preflight" | "dynamic_preflight";
  reason: string;
}

export function formatHostIntegrationFailureMessage(
  failure: HostIntegrationFailure,
  commandLabel: string,
): string {
  return [
    `${commandLabel} cannot start (${failure.stage}): ${failure.reason}`,
    "See README.md for currently supported AIOX workflows.",
    "No agents were started.",
  ].join("\n");
}
