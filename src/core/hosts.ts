/**
 * Running-host runtime vocabularies.
 *
 * A running host exists only while its foreground controller runs. There is no
 * persistent HostDefinition: unregistering a host deletes its runtime rows and
 * leaves nothing that could be relaunched later.
 */

/**
 * A host-scoped agent is `starting` from the moment the host runtime records it
 * and becomes `ready` only when the agent CLI reports a successful vendor spawn.
 * The row's mere existence is never `ready` evidence.
 */
export const hostAgentStatuses = ["starting", "ready"] as const;

export type HostAgentStatus = (typeof hostAgentStatuses)[number];

/**
 * The closed set of host control commands another shell's CLI can relay to a
 * running host's foreground controller. This is deliberately not a generic
 * event/command bus: only W6's accepted host commands are expressible.
 */
export const hostControlRequestKinds = [
  "host_add",
  "host_remove",
  "host_route",
  "terminate_all",
] as const;

export type HostControlRequestKind = (typeof hostControlRequestKinds)[number];

/**
 * `pending` -> `claimed` -> `completed`, or -> `failed` when the target host is
 * unregistered before the controller completes the request. `completed` and
 * `failed` are terminal and are consumed exactly once by the requester.
 */
export const hostControlRequestStatuses = [
  "pending",
  "claimed",
  "completed",
  "failed",
] as const;

export type HostControlRequestStatus = (typeof hostControlRequestStatuses)[number];

/** Why a control request ended without a controller result. */
export const hostControlRequestFailureReasons = ["host_unregistered"] as const;

export type HostControlRequestFailureReason =
  (typeof hostControlRequestFailureReasons)[number];
