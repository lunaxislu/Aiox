# Pair Attach Atomicity and Rollback Sentinel

## Context
During the orchestration setup, if an agent attaches to a pair and a failure occurs (such as slot occupancy, kind mismatch, or route creation failure), the SQLite database state must not remain in a partially updated "half-attached" state. SQLite transaction callbacks in Node.js wrapper libraries (`withTransaction` / `db.transaction`) often commit changes implicitly if the callback simply returns a failure result (`{ok: false}`), rather than throwing an actual error.

## Decision
We decided to enforce a strict layer boundary for pair ownership (removing `pairId` parameter from `agents.attach` signature) and wrap all database modifications in a single `withTransaction` block that throws a custom local Symbol-based rollback sentinel upon validation failure.

## Alternatives
- **X-soft signature boundary**: Keep `pairId` inside the `agents.attach` parameters. Rejected because this leaves dead-weight parameters in the agent repository and causes redundant double-updates at both the agent and pair repository layers.
- **Callback return checking without throwing**: Rejected because returning `{ok: false}` from transaction callbacks does not trigger automatic rollback in the SQLite wrapper, risking silent database contamination.

## Rationale
- Removing `pairId` from `agents.attach` enforces that `pairs.attachAgent` is the single source of truth for pair-agent association.
- Throwing a local Symbol-based sentinel inside the `withTransaction` block guarantees a clean database rollback. The sentinel is caught outside the transaction context and safely translated into a typed API response union (e.g., `pair_slot_occupied`, `agent_kind_mismatch`), while other unexpected runtime errors are rethrown.

## Trade-offs
- Throwing sentinel errors for expected validation failures is a flow-control pattern that requires custom error catching logic in the API dispatch layer.

## Re-evaluation
- This decision can be re-evaluated if the underlying database driver supports programmatic transaction rollback without throwing exceptions.

## Sources
- [22-step-7-phase-a-decisions.history.md](../../history/22-step-7-phase-a-decisions.history.md)
- [23-step-7-phase-b-pair-daemon.history.md](../../history/23-step-7-phase-b-pair-daemon.history.md)
