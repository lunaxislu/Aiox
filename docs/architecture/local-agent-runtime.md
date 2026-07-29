# aiox MVP — As-Built Architecture

> Date: 2026-05-26
> Status: MVP implementation closed (closeout baseline: logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md §1); promoted to as-built
> architecture authority on 2026-06-16.
> Role: this is the `docs/architecture` authority for the current aiox MVP
> internal structure, responsibility boundaries, data flow, and lifecycle
> invariants.
> Product/spec intent lives in `docs/product/` and `docs/specs/`; the former
> MVP PRD is absorbed/deleted during workspace reset and is not primary
> authority. Legacy pre-validation spike material is archived as workspace-reset
> evidence, not current architecture authority. Decision rationale lives in `docs/decisions/`;
> MVP implementation and QA provenance lives in
> `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md`. When this document
> conflicts with code or authority docs, update this document.
>
> Every concrete claim cites current `file:line` evidence or a migrated
> decision/archive provenance note. Where a
> behavior exists in code but has no recorded rationale, it is marked
> **Implementation-only (no recorded rationale)** — the description is factual,
> not inferred.

During workspace reset W5 the as-built body (§1 through §13) was split into
per-module slice files for Obsidian/Atlas navigation. This file remains the
**compatibility index and navigation hub**: it keeps the authority preamble, the
§0 module overview, the §14 authority links, and preserves every §N / §N.x
heading as an anchor-stable stub that links to its slice. Inbound references to
`local-agent-runtime.md#<section>` stay valid here; the full as-built text lives
in the linked slices. status vocabulary (`Current`/`As-built`, `Target`/
`Proposed`, `Deferred`, `Current gap`) and the module overview are owned by this
index.

---

## 0. Purpose

aiox is a local AI agent orchestration tool. The MVP wires two CLI agent
sessions into a pair (slot `a` and slot `b`) so each can send/reply to the
other through a local daemon. Slots are vendor-agnostic: same-vendor
(codex↔codex, claude↔claude) and mixed (claude↔codex) pairs are both
allowed; the default usage connects one Claude and one Codex session. Pair
cardinality is fixed at exactly 2 (Step 15; [[docs/decisions/pair-slot-generalization]]).
This document is the entry point for
debugging, onboarding, and verifying behavior. It covers:

- Process topology
- SQLite schema and repositories
- Daemon API surface and socket transport
- Claude adapter (channel-server / launcher / injector / ingress RPCs)
- Codex adapter (per-agent app-server + per-agent transparent proxy + TUI +
  MCP ingress + injector + `--resume`)
- Cross-cutting message routing (daemon creation idempotency, public
  delivery/reply correlation, Tier 3 delivery state machine, and queued
  fallback)
- CLI surface + invocation layer + doctor/status
- Consolidated catalogs of typed errors and events
- Lifecycle invariant
- Implementation smoke matrix
- Known gaps / Post-MVP

---

## Document map (split slices)

각 module slice는 자기 owner 책임만 소유한다. §0 module overview, §14 authority links,
status 어휘는 이 인덱스가 소유한다.

- §1 Process topology → [[docs/architecture/local-runtime-process-topology]]
- §2 SQLite schema · §3 Repositories → [[docs/architecture/local-runtime-store-and-repositories]]
- §4 Daemon lifecycle · socket transport · §5 Daemon API surface → [[docs/architecture/local-runtime-daemon-transport-api]]
- §6 Claude adapter (§6.1~§6.5) → [[docs/architecture/local-runtime-claude-adapter]]
- §7 Codex adapter (§7.1~§7.10) → [[docs/architecture/local-runtime-codex-adapter]]
- §8 Cross-cutting message routing (§8.1~§8.6) · §4.3 sendMessage sequence → [[docs/architecture/local-runtime-routing-and-delivery]]
- §9 CLI / invocation / doctor / status (§9.1~§9.3) → [[docs/architecture/local-runtime-cli-and-operator-surfaces]]
- §10 Typed error catalog (§10.1~§10.6) · §11 Events catalog · §12 Smoke matrix → [[docs/architecture/local-runtime-errors-events-smoke]]
- §13 Known gaps / Post-MVP → [[docs/architecture/local-runtime-gaps-and-targets]]

---

## 1. Process Topology

이 섹션은 [[docs/architecture/local-runtime-process-topology]]로 분리되었습니다.

---

## 2. SQLite Schema

이 섹션은 [[docs/architecture/local-runtime-store-and-repositories]]로 분리되었습니다.

---

## 3. Repositories

이 섹션은 [[docs/architecture/local-runtime-store-and-repositories]]로 분리되었습니다.

---

## 4. Daemon Lifecycle and Socket Transport

이 섹션은 [[docs/architecture/local-runtime-daemon-transport-api]]로 분리되었습니다. §4.1~§4.2는 같은 slice가
소유하고, §4.3은 [[docs/architecture/local-runtime-routing-and-delivery]]가 소유합니다.

### 4.1 Daemon Lifecycle

[[docs/architecture/local-runtime-daemon-transport-api]] 참조.

### 4.2 Socket Transport

[[docs/architecture/local-runtime-daemon-transport-api]] 참조.

### 4.3 sendMessage end-to-end (sequence)

[[docs/architecture/local-runtime-routing-and-delivery]]로 이동했습니다.

---

## 5. Daemon API Surface

이 섹션은 [[docs/architecture/local-runtime-daemon-transport-api]]로 분리되었습니다.

---

## 6. Claude Adapter

이 섹션은 [[docs/architecture/local-runtime-claude-adapter]]로 분리되었습니다. §6.1~§6.5는 같은 slice가 소유합니다.

### 6.1 Topology

[[docs/architecture/local-runtime-claude-adapter]] 참조.

### 6.2 Launch Flow (`aiox claude --name <n>`)

[[docs/architecture/local-runtime-claude-adapter]] 참조.

### 6.3 Claude → daemon Ingress (tool calls)

[[docs/architecture/local-runtime-claude-adapter]] 참조.

### 6.4 daemon → Claude Injection

[[docs/architecture/local-runtime-claude-adapter]] 참조.

### 6.5 Sequence — Claude reply → daemon → Codex

[[docs/architecture/local-runtime-claude-adapter]] 참조.

---

## 7. Codex Adapter

이 섹션은 [[docs/architecture/local-runtime-codex-adapter]]로 분리되었습니다. §7.1~§7.10은 같은 slice가 소유합니다.

### 7.1 Per-agent Runtime

[[docs/architecture/local-runtime-codex-adapter]] 참조.

### 7.2 Attach Flow (`aiox codex --name <n>`)

[[docs/architecture/local-runtime-codex-adapter]] 참조.

### 7.3 Resume Flow (`--resume <session-id>`)

[[docs/architecture/local-runtime-codex-adapter]] 참조.

### 7.4 Transparent Proxy

[[docs/architecture/local-runtime-codex-adapter]] 참조.

### 7.5 Active-Thread Binding Authority

[[docs/architecture/local-runtime-codex-adapter]] 참조.

### 7.6 Injection (`turn/start`)

[[docs/architecture/local-runtime-codex-adapter]] 참조.

### 7.7 Daemon → Codex Delivery (live loaded-thread + queued fallback)

[[docs/architecture/local-runtime-codex-adapter]] 참조.

### 7.8 Codex MCP Ingress (Codex → daemon)

[[docs/architecture/local-runtime-codex-adapter]] 참조.

### 7.9 Lifecycle and Ownership

[[docs/architecture/local-runtime-codex-adapter]] 참조.

### 7.10 Sequence — Codex MCP → daemon → Claude

[[docs/architecture/local-runtime-codex-adapter]] 참조.

---

## 8. Cross-Cutting Message Routing

이 섹션은 [[docs/architecture/local-runtime-routing-and-delivery]]로 분리되었습니다. §8.1~§8.6은 같은 slice가
소유합니다. 원본에서 §4 아래 있던 §4.3 sendMessage end-to-end sequence도 이 slice가 소유합니다.

### 8.1 Domain Model

[[docs/architecture/local-runtime-routing-and-delivery]] 참조.

### 8.2 sendMessage Atomicity + Idempotency

[[docs/architecture/local-runtime-routing-and-delivery]] 참조.

### 8.3 Router and Fan-out

[[docs/architecture/local-runtime-routing-and-delivery]] 참조.

### 8.4 Delivery State Machine

[[docs/architecture/local-runtime-routing-and-delivery]] 참조.

### 8.5 `parent_message_id`

[[docs/architecture/local-runtime-routing-and-delivery]] 참조.

### 8.6 Pair Reservation + Routes

[[docs/architecture/local-runtime-routing-and-delivery]] 참조.

---

## 9. CLI / Invocation / Doctor / Status

이 섹션은 [[docs/architecture/local-runtime-cli-and-operator-surfaces]]로 분리되었습니다. §9.1~§9.3은 같은 slice가
소유합니다.

### 9.1 Command Table

[[docs/architecture/local-runtime-cli-and-operator-surfaces]] 참조.

### 9.2 Invocation Layer

[[docs/architecture/local-runtime-cli-and-operator-surfaces]] 참조.

### 9.3 Doctor + Status

[[docs/architecture/local-runtime-cli-and-operator-surfaces]] 참조.

---

## 10. Consolidated Typed Error Catalog

이 섹션은 [[docs/architecture/local-runtime-errors-events-smoke]]로 분리되었습니다. §10.1~§10.6은 같은 slice가
소유합니다.

### 10.1 Daemon API

[[docs/architecture/local-runtime-errors-events-smoke]] 참조.

### 10.2 Adapter — Codex (`AdapterInjectFailureReason`)

[[docs/architecture/local-runtime-errors-events-smoke]] 참조.

### 10.3 Adapter — Claude

[[docs/architecture/local-runtime-errors-events-smoke]] 참조.

### 10.4 Router

[[docs/architecture/local-runtime-errors-events-smoke]] 참조.

### 10.5 Socket Transport (envelope)

[[docs/architecture/local-runtime-errors-events-smoke]] 참조.

### 10.6 CLI Parse / Invocation

[[docs/architecture/local-runtime-errors-events-smoke]] 참조.

---

## 11. Consolidated Events Catalog

이 섹션은 [[docs/architecture/local-runtime-errors-events-smoke]]로 분리되었습니다.

---

## 12. Implementation Smoke Matrix

이 섹션은 [[docs/architecture/local-runtime-errors-events-smoke]]로 분리되었습니다.

---

## 13. Known Gaps / Post-MVP

이 섹션은 [[docs/architecture/local-runtime-gaps-and-targets]]로 분리되었습니다.

### Current Gaps (As-built limitations)

[[docs/architecture/local-runtime-gaps-and-targets]] 참조.

### Target / Proposed / Deferred (Post-MVP Checklist)

[[docs/architecture/local-runtime-gaps-and-targets]] 참조.

---

## 14. Authority Links

- **As-built architecture**: [[docs/architecture/local-agent-runtime]] (this document)
- **Product and roadmap authority**: [[docs/product/product]],
  [[docs/product/roadmap]]
- **Specs authority**: [[docs/specs/aiox-a2a]] and sibling spec documents where external contracts are migrated.
- **Legacy MVP PRD**: absorbed into [[docs/product/product]],
  [[docs/specs/aiox-a2a]] and this document during workspace reset; it is not
  primary authority for this document.
- **Legacy execution checklist**:
  `logs/workspace-reset/retained-provenance/2026-06-20-mvp-plan-carryover-archive.md` preserves the useful digest
  from the old MVP checklist; legacy `plan/` paths are not primary authority for
  this document.
- **Migrated step rationale**: decision-worthy rationale lives in
  `docs/decisions/`; MVP implementation and QA trace provenance lives in
  `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md`. Legacy step records are
  workspace-reset migration inputs, not architecture authority.
- **Pre-validation**: legacy pre-validation spike records are archived in
  `logs/workspace-reset/retained-provenance/2026-06-23-workspace-reset-pre-validation-spike-archive.md`; they are
  not current architecture authority.
- **Learning records**: legacy aiox learning records are absorbed into
  decision, architecture or archive owners; they are not current architecture
  authority.
- **Memory index entry points**: `aiox-mvp-spec`, `aiox-history-doc`,
  `aiox-step-progress`, `aiox-codex-attach-ownership`,
  `aiox-authority-map`.

When this document conflicts with code, code wins — update this document.
