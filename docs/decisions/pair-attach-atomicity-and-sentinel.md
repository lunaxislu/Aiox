# Pair Attach Atomicity and Rollback Sentinel

## Context
During the orchestration setup, if an agent attaches to a pair and a failure occurs (such as slot occupancy, kind mismatch, or route creation failure), the SQLite database state must not remain in a partially updated "half-attached" state. SQLite transaction callbacks in Node.js wrapper libraries (`withTransaction` / `db.transaction`) often commit changes implicitly if the callback simply returns a failure result (`{ok: false}`), rather than throwing an actual error.

## Decision
We decided to enforce a strict layer boundary for pair ownership (removing `pairId` parameter from `agents.attach` signature) and wrap daemon-level attach orchestration in a single `withTransaction` block that throws a custom local Symbol-based rollback sentinel when pair attach validation fails after earlier writes in that transaction.

## Alternatives
- **X-soft signature boundary**: Keep `pairId` inside the `agents.attach` parameters. Rejected because this leaves dead-weight parameters in the agent repository and causes redundant double-updates at both the agent and pair repository layers.
- **Callback return checking without throwing**: Rejected because returning `{ok: false}` from transaction callbacks does not trigger automatic rollback in the SQLite wrapper, risking silent database contamination.

## Rationale
- Removing `pairId` from `agents.attach` enforces that `pairs.attachAgent` is the single source of truth for pair-agent association. Current pair attach ownership is described in [[docs/architecture/local-runtime-routing-and-delivery]] §8.6.
- The pair repository itself validates before mutating and returns typed failures; the rollback sentinel belongs to the daemon's outer attach transaction, where `agents.attach`, `pairs.attachAgent`, and route creation are composed. Current repository and sentinel boundaries are described in [[docs/architecture/local-runtime-store-and-repositories]] §3.
- Throwing a local Symbol-based sentinel from that outer `withTransaction` block guarantees a clean database rollback when a typed pair attach failure occurs after an earlier write in the same transaction. The sentinel is caught outside the transaction context and safely translated into a typed API response union (e.g., `pair_slot_occupied`, `agent_kind_mismatch`), while other unexpected runtime errors are rethrown.

## Trade-offs
- Throwing sentinel errors for expected validation failures is a flow-control pattern that requires custom error catching logic in the API dispatch layer.

## Re-evaluation
- This decision can be re-evaluated if the underlying database driver supports programmatic transaction rollback without throwing exceptions.

## Sources
- `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §2.1 — Step 7 TDD provenance for the X-strict attach boundary, rollback sentinel pattern, and historical reason-name lineage.
- `logs/workspace-reset/packages/2026-06-19-workspace-reset-W5-history-migration.md:448-545` — decision creation from history/22 context and subsequent stale reason-name correction.
- `logs/workspace-reset/plan-stages/2026-06-23-workspace-reset-stage6-physical-deletion-gate.md:651-657` — later drift recheck confirming daemon-level sentinel placement.
