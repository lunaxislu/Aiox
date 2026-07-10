# Runtime Profile Namespace Isolation

## Context

QA-003 found that development, build-smoke, and installed-release runs could share
the same daemon runtime namespace. A development command, a dist-runner command,
and an installed `aiox` binary could therefore attach to the same daemon socket and
make smoke results appear to pass or fail for the wrong runtime.

The decision was made during QA Round 4 on 2026-05-31, after R3 recorded the
namespace problem and moved it out of the Claude channel closeout scope.

## Decision

Use a single resolved runtime profile as the namespace bundle decider, keep Unix
domain sockets for this round, and concentrate the future transport swap at the
existing socket connect/listen decision points.

## Alternatives

- **Introduce a `RuntimeEndpoint` discriminated union immediately**: Rejected
  because R4 was not a transport abstraction round. A single implemented variant
  would add dead branches and require guessing the future Windows transport shape.
- **Keep manual `AIOX_SOCKET_PATH` separation as the main mechanism**: Rejected
  because manual setup does not structurally prevent QA-003 from recurring.
- **Auto-detect the profile only from the binary path**: Rejected because install
  path heuristics are fragile.
- **Require `AIOX_PROFILE` only**: Rejected because forgetting the env var would
  silently collapse modes back into the same namespace.

## Rationale

The load-bearing choice was to treat profile as the single bundle-level decision:
once `dev`, `build`, or `release` is selected, all runtime namespace paths derive
from that profile. The current runtime config/profile namespace contract is owned
by [[docs/specs/aiox-runtime-profile-namespace]]. That makes a mixed state such as
"dev command using the release daemon socket" structurally hard to produce.

The hybrid profile resolver balances explicitness and safety. Controlled scripts
can inject `AIOX_PROFILE`, while installed binaries and ad hoc execution still
fall back to path-based detection. Per-path environment overrides remain escape
hatches, but they do not replace the profile bundle.

Keeping Unix domain sockets avoided speculative transport design while preserving
the future Windows path: the daemon socket transport architecture is owned by
[[docs/architecture/local-runtime-daemon-transport-api]], including the narrow
connect/listen points where named pipe or loopback support can be introduced
later.

The release socket path stayed backward compatible so the isolation fix would not
break existing installed-release users. The database path was scaffolded under the
same profile mechanism, but the production daemon stayed in-memory because socket
separation already separated process state for the current implementation.

## Trade-offs

- Windows support remains deferred to a future transport round.
- Runtime path semantics now depend on a profile resolver, so script and binary
  entry points must preserve that resolver contract.
- Explicit path overrides must be treated carefully because relative paths would
  reintroduce namespace ambiguity across child-process working directories.
- File-backed database isolation is only scaffolded until the production daemon
  stops using in-memory state.

## Re-evaluation

Revisit this decision when Windows support is implemented, when a second transport
variant is actually introduced, or when the production daemon switches to a
file-backed database. Also revisit if installed-release compatibility no longer
requires preserving the historical release socket location.

## Sources

- `logs/workspace-reset/retained-provenance/2026-06-20-mvp-plan-carryover-archive.md` §2 - QA-003 verified summary
  and R4 runtime namespace isolation round outcome.
