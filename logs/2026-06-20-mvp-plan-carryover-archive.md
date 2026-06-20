---
topic: MVP implementation checklist and QA tracker carryover archive
description: workspace reset W5 B5 archive digest for legacy plan/mvp-implementation-checklist.md and plan/qa-tracker.md
status: decided
---

## Work Items

## 2026-06-20 · W5 B5 carryover archive digest

# MVP Checklist & QA Tracker Archive

This archive is the workspace reset successor for the legacy `plan/`
carryover files `mvp-implementation-checklist.md` and `qa-tracker.md`.
It preserves the current facts, provenance, and handoff value that made the
files load-bearing during W7, without making the old `plan/` directory a
current owner.

## 1. MVP Implementation Checklist

Original source: legacy `plan/mvp-implementation-checklist.md`.

### Disposition

- The checklist is not a current execution plan. Its own notes said it should
  remain an execution checklist and not the source of truth for MVP decisions.
- W7 still treated it as load-bearing because several closed sections were the
  easiest compact evidence for as-built architecture verification.
- After owner absorption and live-reference repointing, the legacy source can be
  treated as a delete candidate at the workspace reset physical deletion gate.

### Load-Bearing Evidence Preserved

- The checklist closed MVP implementation with automated smoke and verification
  passed, and pointed to the MVP implementation closeout baseline.
- Step 10 recorded the Codex per-agent app-server runtime, the `codex resume`
  remote launch shape, active-thread binding, and transparent proxy follow-up
  evidence. W7 used this as current/as-built evidence for runtime architecture.
- Step 13 recorded Codex MCP ingress through daemon RPCs
  `registerCodexChannel`, `disconnectCodexChannel`, `receiveCodexMessage`, and
  `receiveCodexReply`, plus `codex_channel_registered`,
  `codex_channel_disconnected`, `codex_ingress_message_received`, and
  `codex_ingress_reply_received` events.
- Step 14 recorded long-running daemon/client reuse, shared stable socket path,
  daemon auto-start behavior, Claude reply to Codex routed delivery drain,
  Codex to Claude queued delivery drain, daemon-owned Codex app-server MCP
  injection, live loaded-thread delivery fallback, and Codex envelope/reply
  dispatch symmetry.
- Step 15 recorded pair-slot generalization and the QA-002 unblock after
  same-vendor pair support landed.
- The final verification baseline recorded `pnpm test`, `pnpm typecheck`, and
  `pnpm build` passing after Step 15 MCP surface consistency work.

### Current Owners After Absorption

- As-built runtime architecture: `docs/architecture/local-agent-runtime.md`.
- Decision-worthy rationale: `docs/decisions/`.
- MVP implementation and QA trace provenance: `logs/2026-06-19-mvp-history-archive.md`
  plus this archive.
- Post-MVP execution: `plans/post-mvp/` and `plans/release-plan.md`.

## 2. QA Tracker

Original source: legacy `plan/qa-tracker.md`.

### Disposition

- The tracker is not a live QA workflow owner after workspace reset. It is a
  stale status board for MVP QA rounds R1 through R4.
- The useful content is the compact index of QA-001 through QA-003, round
  outcomes, and the R3/R4 handoff that produced the runtime namespace isolation
  decision.
- After live references are repointed, the legacy tracker can be treated as a
  delete candidate at the workspace reset physical deletion gate.

### QA Issues Preserved

- QA-001: Claude TUI exit left the agent connected and leaked pending tokens.
  The issue was fixed by DB disconnect synchronization and pending-token cleanup,
  then verified in QA Round 1.
- QA-002: same-vendor pair attachment originally failed with slot occupation
  errors. Step 15 pair-slot generalization resolved the issue; same-vendor pairs
  can become ready under the slot a/b model.
- QA-003: dev, build-smoke, and installed-release runtime namespaces could share
  socket/state/plugin/MCP configuration and cause false smoke results. QA Round 4
  closed this with profile-based namespace separation. The decision owner is
  `docs/decisions/runtime-profile-namespace-isolation.md`.

### QA Round Outcomes

- R1, 2026-05-26: Claude channel disconnect consistency. Closed with one
  verified issue and no open issues.
- R2, 2026-05-27: aiox MCP collaboration protocol Phase 1.5 and same-vendor
  pair finding. Smoke passed and QA-002 was resolved through Step 15.
- R3, 2026-05-28 through 2026-05-31: Claude plugin/channel activation work.
  Closed after D strategy default, inline fallback, setup UX, and smoke namespace
  issue recording. QA-003 was explicitly moved out to R4 rather than treated as
  an R3 blocker.
- R4, 2026-05-31: dev/build/release runtime namespace isolation. Closed with
  QA-003 verified.

## 3. Remaining Hygiene

- `docs/aiox/` references to the legacy checklist or QA tracker are excluded
  from W5 B5 and converge on the workspace reset docs/aiox absorption/deletion
  gate.
- Historical `history/` files may still mention the legacy plan paths as part of
  their original provenance. Those are not live owner references.
