# UDS Transport, NDJSON Framing, and Connection Hardening

## Context

Orchestration between client terminals and the background daemon requires local inter-process communication (IPC) that is secure, fast, and does not clash with other ports or processes on the developer's machine. The client-daemon connection also needs a reliable payload framing convention, resilient concurrent connection multiplexing, and robust socket lifecycle recovery.

## Decision

We adopted Unix Domain Sockets (UDS) as the primary IPC transport with Newline-Delimited JSON (NDJSON) framing, lazy persistent connections with request-id multiplexing, a default request timeout, and an EADDRINUSE stale-socket probe-and-unlink startup recovery mechanism.

## Alternatives

- **TCP Loopback**: Rejected because it introduces port collisions, firewall exposure risks, and lacks filesystem-level ownership controls — even though it is easier to make cross-platform.
- **Length-prefixed JSON or MessagePack framing**: Rejected because NDJSON is simpler, human-readable for debugging, and sufficient for JSON-based orchestrator payloads; binary/length-prefixed framing adds encode/decode complexity with no payoff at MVP scale.
- **Per-request Socket Connections**: Rejected because sequential connection-setup latency would slow the orchestrator during multiple quick turns.
- **Global locking files (PID files) for stale socket recovery**: Rejected as over-engineered for the single-user local MVP.

## Rationale

- **UDS over TCP**: UDS maps naturally to POSIX file ownership and permissions, so access is bounded by the filesystem rather than the network. It avoids port allocation/collision entirely and is not reachable off-host, which removes the firewall-exposure surface TCP loopback would add. The cost is Windows portability, which we accept as deferred.
- **NDJSON over length-prefixed/MessagePack**: Orchestrator payloads are already JSON, so a line-delimited envelope keeps the wire format trivially readable during debugging and needs no separate length/binary decode step. JSON escaping preserves embedded newlines, so `\n`-delimited framing is unambiguous for our payloads. The framing contract itself is owned by [[local-runtime-daemon-transport-api]] §4.2.
- **Connection reuse (multiplexing)**: A single lazy-persistent socket with request-id correlation lets concurrent in-flight requests share one connection, avoiding per-request connect latency during rapid turns. The id-multiplex topology is owned by architecture (`local-runtime-daemon-transport-api.md` §4.2).
- **Timeout & close fallback**: Without a bounded request timeout and explicit close handling, a daemon crash or hang would leave the client waiting indefinitely. We therefore time out requests and fail pending requests on sudden socket close. The numeric default is owned by architecture (`local-runtime-daemon-transport-api.md` §4.2).
- **Stale-socket recovery**: A crashed daemon can leave a socket file that blocks the next `listen`. Rather than a separate lock/PID file, we let the daemon itself disambiguate: on `EADDRINUSE` it probes whether anything is actually listening; if alive it refuses to start, if dead it unlinks the stale path and retries once. This keeps recovery self-contained in the listen path. The probe/unlink/retry contract is owned by architecture (`local-runtime-daemon-transport-api.md` §4.2).
- **Best-effort fan-out**: When the daemon fans an inject out to multiple peer targets, one target failing should not abort delivery to the others. So a failed target transitions to `failed` with a typed reason while the remaining targets continue, maximizing throughput at the cost of all-or-nothing atomicity. The fan-out flow is owned by architecture ([[local-runtime-routing-and-delivery]] §8.3).

## Trade-offs

- Windows support (Named Pipes) and TCP loopback fallbacks are deferred to a post-MVP transport round.
- Unlinking UDS socket paths requires careful path validation relative to working directories to prevent path ambiguity.
- Best-effort fan-out gives up cross-target atomicity: a partially delivered message is possible by design.

## Re-evaluation

- This transport contract can be re-evaluated when Windows compatibility is prioritized, or if the daemon switches to a TCP loopback model for containerized execution.

## Sources

- `docs/architecture/local-runtime-daemon-transport-api.md` §4.2 (framing/multiplex/timeout/recovery) +
  `docs/architecture/local-runtime-routing-and-delivery.md` §8.3 (fan-out) —
  transport contract owner (former `local-agent-runtime.md`에서 split).
