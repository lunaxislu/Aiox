---
topic: G1-B/G1-C verification ledger review
description: Review the external G1-B/G1-C verification ledger item by item and report verified dispositions.
status: decided
---

## Work Items

- [x] W1 Verify all ledger IDs against code, tests, owner documents, and decided intent logs; report each disposition.

## Required Context

### Return Target

- None: independent log.

### {Global}

- User explicitly requested ledger-led review without running onramp; this log records the review only and does not authorize artifact changes.


## 2026-07-22 · W1 · verification ledger review

- External scratchpad ledger is the review index: `/private/tmp/claude-501/-Users-lunaxislu-Documents-ai-orchestration/eebac7a9-713f-4a2d-b992-6f74b6c207ed/scratchpad/g1bc-verification-report.md`.
- Scope: D1–D7, P1–P4, C1, T1–T5, X1–X2, Q1–Q2 and the §1 source baseline. `spikes/` and `research-idea/` remain outside scope.
- Method: direct repository evidence, owner contracts, and G1-B/G1-C decided logs; three read-only parallel reviews cover documentation, code questions, and tests/cleanup. No artifact changes are authorized by this review.

### 2026-07-22 16:01 · independent review dispositions

- Direct source review confirms the §1 ledger scope contains 16 modified `src/` paths plus one untracked new repository file; the table’s combined `server.ts`/`run.ts` row is why it represents 16 rows while touching 17 physical paths.
- Accepted stale-code/test/document candidates: D1–D7 (D4 expands to the §4.5 caveat cluster), P2–P3, C1 (with its stale MCP-server test), T1–T5. P1 is directionally valid but needs inbound-anchor migration handling; D5/D7 must distinguish deprecated reply correlation from retained Claude notification `chatId` metadata.
- Rejected/reclassified: P4 is not a restore item; restart recovery helpers have no production caller and are already recorded as a store/durability gap. Q1 has no production thread-drift effect because the daemon wrapper passes the selected thread as a fixed active thread; no change is warranted.
- Owner decisions remain: X1 cleanup may remove router/AgentAdapter/AdapterOutgoingMessage only, not all adapter result contracts; X2 cleanup scope must decide whether to remove the adjacent test-only `createMessage` too. Q2 has proven two failure observations for timeout followed by late reject; selected event cardinality/operator semantics are not decided.
- Test reviewer ran the five named files and reproduced exactly 7 relevant failures (19 tests total). Its full-suite run additionally observed socket/proxy/spike failures, so the ledger’s unqualified `pnpm test = ... 7 fail` claim is not accepted for this working tree.
- No implementation or owner-document edits were made; this log is the sole review-record addition.
