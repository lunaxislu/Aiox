/**
 * Central formatter for the host-starting commands' (`aiox host new` and
 * `aiox host`) static/dynamic integration failures (W6 accepted failure
 * contract, Blocker 2 correction): every such failure must carry the real
 * cause, a help pointer, and the literal sentence "No agents were started."
 * cmux is the first production `HostAdapter`; its setup and live-check
 * boundary are documented at the stable README anchor below. Other products
 * still report their concrete adapter reason through the same formatter as
 * they are added, without category fallback.
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
    "See README.md#cmux-host-integration for setup and live-check guidance.",
    "No agents were started.",
  ].join("\n");
}
