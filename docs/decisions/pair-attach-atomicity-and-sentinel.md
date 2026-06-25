# Pair Attach Atomicity and Rollback Sentinel

## Context
During the orchestration setup, if an agent attaches to a pair and a failure occurs (such as slot occupancy, kind mismatch, or route creation failure), the SQLite database state must not remain in a partially updated "half-attached" state. SQLite transaction callbacks in Node.js wrapper libraries (`withTransaction` / `db.transaction`) often commit changes implicitly if the callback simply returns a failure result (`{ok: false}`), rather than throwing an actual error.

## Decision
We decided to enforce a strict layer boundary for pair ownership (removing `pairId` parameter from `agents.attach` signature) and wrap daemon-level attach orchestration in a single `withTransaction` block that throws a custom local Symbol-based rollback sentinel when pair attach validation fails after earlier writes in that transaction.

## Alternatives
- **X-soft signature boundary**: Keep `pairId` inside the `agents.attach` parameters. Rejected because this leaves dead-weight parameters in the agent repository and causes redundant double-updates at both the agent and pair repository layers.
- **Callback return checking without throwing**: Rejected because returning `{ok: false}` from transaction callbacks does not trigger automatic rollback in the SQLite wrapper, risking silent database contamination.

## Rationale
- Removing `pairId` from `agents.attach` enforces that `pairs.attachAgent` is the single source of truth for pair-agent association.
- The pair repository itself validates before mutating and returns typed failures; the rollback sentinel belongs to the daemon's outer attach transaction, where `agents.attach`, `pairs.attachAgent`, and route creation are composed.
- Throwing a local Symbol-based sentinel from that outer `withTransaction` block guarantees a clean database rollback when a typed pair attach failure occurs after an earlier write in the same transaction. The sentinel is caught outside the transaction context and safely translated into a typed API response union (e.g., `pair_slot_occupied`, `agent_kind_mismatch`), while other unexpected runtime errors are rethrown.

## Trade-offs
- Throwing sentinel errors for expected validation failures is a flow-control pattern that requires custom error catching logic in the API dispatch layer.

## Re-evaluation
- This decision can be re-evaluated if the underlying database driver supports programmatic transaction rollback without throwing exceptions.

## Sources
- [[local-runtime-store-and-repositories]] §3 and [[local-runtime-routing-and-delivery]] §8.6 —
  current owner for repository pre-validation, daemon attach orchestration, and
  rollback sentinel placement.
- `src/daemon/state.ts` — current `attachRollbackSentinel` and daemon
  `attachAgent` outer transaction implementation.
- `src/store/repositories/pairs.ts` — current `pairs.attachAgent` pre-validation
  and typed failure return implementation.
- `tests/unit/daemon/pair-store.test.ts` — daemon-level pair attach rollback and
  row-invariance coverage.
