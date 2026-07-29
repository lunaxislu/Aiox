---
topic: G1 decision provenance and implementation traceability audit
description: G1의 최종 outcome 계보와 현재 owner·구현·검증 증거를 full-history provenance로 대조한다.
status: decided
---

## Work Items

- [x] W1 A~C: authoritative source corpus inventory, full-history read, raw provenance ledger와 lineage catalog를 확정한다.
- [x] W2 W1-C ledger를 소비해 canonical message, envelope, reply-right lineage를 fold → canvas → graph-walk 검증한다.
- [x] W3 W1-C ledger를 소비해 Tier 3 delivery reliability lineage를 fold → canvas → graph-walk 검증한다.
- [x] W4 W1-C ledger를 소비해 public-ID, correlation, persistence-binding lineage를 fold → canvas → graph-walk 검증한다.
- [x] W5 W1-C ledger를 소비해 cross-cutting persistence, consumer test, legacy·compatibility lineage를 fold → canvas → graph-walk 검증한다.
- [x] W6 W1-C ledger를 소비해 adapter and transport producer·consumer lineage를 fold → canvas → graph-walk 검증한다.
- [x] W7 W1-C ledger를 소비해 owner documentation, roadmap, plan, closeout lineage를 fold → canvas → graph-walk 검증한다.
- [x] W8 W1-C ledger 및 reverse scan으로 blind-spot lineage를 fold → canvas → graph-walk 검증한다.
- [x] W9 raw ledger 모든 후보의 node/disposition/primary-W coverage를 재대조하고 G1-A final decided gate의 audit input을 기록한다.
- [x] W10 W10 correct W3 by reconciling historical G1-B/G1-C gate scope with current Tier 3 implementation evidence; obtain user disposition before any implementation or owner-document change

## Required Context

### Return Target

- None: independent log.

### {Global}

- 이 audit의 현재 authority는 claim별 owner 문서(decision/spec/architecture/roadmap)이며, code/test는 구현·검증 evidence, logs는 chronological provenance, canvas는 navigation coverage map이다.

### {W1}

- W1의 필수 source는 freeze, plan, in-scope controlling log와 relevant task record의 full history, 그리고 claim별 current owner 문서와 code/test다. HTML snapshot과 public-ID pilot은 W1 입력·coverage 기준이 아니며, W8에서 새 graph와의 reverse/blind-spot 비교 자료로만 사용한다. 새 master canvas logs/artifacts/g1-outcome-graph.canvas는 W1 ledger에서 독립적으로 build한다.
- W1은 단일 turn에서 source corpus를 읽지 않는다. A에서 working artifact에 corpus inventory를 작성하고 audit log에 locator checkpoint를 남긴다. B에서 source family 하나씩 full-history read를 raw ledger에 적재하고 family checkpoint를 남긴다. C에서 lineage catalog와 provisional primary W를 artifact에 작성하고 W1 completion/reconcile checkpoint를 남긴다. master canvas의 node fold·draw·owner/code/test disposition은 W2-W8이 계보마다 수행한다.
- W1 substeps (순서 고정): (A) corpus inventory — source family와 task-record corpus를 확정한다; (B) source-family full-read — family 하나씩 block/entry 전체를 읽는다; (C) raw provenance ledger + lineage catalog — outcome 후보·change verb·outbound reference와 provisional primary W를 추출한다. W1-C까지 끝난 뒤 W2-W8이 각 lineage를 fold → canvas → graph-walk 검증한다.
- Graph model: raw block/entry는 ledger source이지 기본 node가 아니다. 동일 claim의 initial decision, refine, supersede, withdrawal, implementation, verification record를 many-to-one으로 fold해 하나의 outcome node를 만든다. 순수 논의는 source evidence로만 남기되, scope·non-goal·deferred·dependency를 확정한 논의는 provenance chain에 포함한다.
- Node schema: 각 outcome node에는 stable claim label과 resolution(current/withdrawn/deferred/ambiguous), provenance chain(source log path + block/entry locator + change verb), effective owner(section), code producer/consumer evidence, test evidence, roadmap/deferred owner, audit disposition(unverified/pass/gap/corrective/user-coordination)을 둔다. implementation·accepted는 resolution이 아니라 evidence/disposition이다. current resolution은 owner 문서와 code/test 대조로 확정하며 log의 마지막 entry만으로 확정하지 않는다. withdrawn resolution에는 withdrawn scope, successor 또는 intentional-removal, legacy-removal check disposition, current owner를 추가로 필수 기록한다.
- Edge and visual schema: edge는 refines, supersedes, implements, verified-by, owned-by, consumes, deferred-to만 사용한다. extension은 별도 state나 edge가 아니라 refines로 표현한다. group은 source log family이고, outcome node는 final decisive source family에 배치하며 다른 source log는 provenance chain과 file/link node로만 연결한다. 색은 resolution만 나타낸다: current=cyan, withdrawn=orange, deferred=yellow, ambiguous=red. audit disposition과 implementation/accepted evidence는 node label badge와 text로 표시하며 색으로 섞지 않는다. raw entry마다 node를 만들지 않는다.
- Coverage assignment invariant: W1-C lineage catalog의 모든 outcome candidate에는 W2-W8 중 provisional primary verification Work Item 하나를 둔다. W2-W8은 cross-domain evidence가 확인되면 primary/supporting을 조정할 수 있으나 primary completion을 중복 소유하지 않는다. W8 새 candidate는 W8 primary로 두거나 기존 primary W로 재배정한다. W9가 모든 raw candidate가 exactly one final primary W와 node 또는 명시적 non-node disposition을 가졌는지 검사하며, orphan·primary 중복은 audit failure다.
- W1 working artifact: logs/artifacts/g1-outcome-raw-provenance-ledger.md를 W1-A에서 생성한다. 이 artifact는 (1) corpus inventory, (2) family별 raw block/entry ledger, (3) W1-C lineage catalog를 소유한다. audit log History에는 각 checkpoint의 artifact locator, 완료한 family/row ID range, 새 outbound reference, 다음 substep만 기록하고 raw entry 전문을 복사하지 않는다.
- Raw ledger schema: Corpus inventory는 corpus ID, source family, exact path/task record set, discovery source, read status를 둔다. Raw entry row는 raw ID, source path, block heading/child entry locator와 line span, change verb(decides/refines/supersedes/withdraws/defers/implements/verifies), claim fragment, inbound/outbound reference, candidate lineage ID, note를 둔다. W1-C lineage catalog는 lineage ID, member raw IDs, candidate claim, owner candidate, provisional primary W, unresolved fold를 둔다. raw ledger는 final state나 PASS를 선결하지 않는다.

### {W1,W2,W3,W4,W5,W6,W7,W8,W9}

- Shared graph contract: raw block/entry는 provenance source이고 many-to-one fold된 outcome node만 canvas node가 된다. node는 resolution(current/withdrawn/deferred/ambiguous), audit disposition(unverified/pass/gap/corrective/user-coordination), provenance chain, effective owner, code/test evidence, roadmap/deferred owner를 갖는다; implementation·accepted는 evidence/disposition이다. withdrawn node는 scope, successor 또는 intentional-removal, legacy-removal check, current owner를 필수로 둔다. edge는 refines, supersedes, implements, verified-by, owned-by, consumes, deferred-to만 사용하며, 색은 resolution만 나타낸다. source log는 provenance/file-link로 남기고 source-log edge를 만들지 않는다.

### {W2,W3,W4,W5,W6,W7,W8}

- 명확한 current-owner commitment과 code/test/owner 사이 불일치는 같은 Work Item에서 corrective contract(충돌 claim, actual owner, exact write-set, RED evidence, GREEN verification, owner/roadmap propagation)를 먼저 기록한 뒤 bounded하게 수정할 수 있다. 새 protocol/public contract, compatibility·fallback·alias·dual-write, 다수 package 재개 필요성, 또는 방향 모호성은 사용자 조율로 올린다.
- W2-W8은 W1-C의 working artifact logs/artifacts/g1-outcome-raw-provenance-ledger.md 안의 raw provenance ledger와 lineage catalog를 navigation contract로 소비한다. 각 Work Item은 primary로 배정된 lineage를 fold해 master canvas logs/artifacts/g1-outcome-graph.canvas에 node와 upstream/downstream edge를 추가한 뒤, provenance를 재확인하고 effective owner ↔ code/test ↔ roadmap/deferred를 대조해 disposition을 확정한다. supporting Work Item은 evidence를 제공할 수 있지만 primary node의 completion disposition을 대신 닫지 않는다. HTML/pilot은 기준이 아니며, graph에 없는 발견은 W8에서 새 candidate로 처리한다.

### {W9}

- G1-A 두 closeout 로그의 open→decided 전환은 W9 PASS와 unresolved material finding 부재를 audit input으로 소비한 뒤에만 별도 final gate에서 판단한다. 이 audit은 그 status를 자동 전환하지 않는다.
- W9은 logs/artifacts/g1-outcome-raw-provenance-ledger.md의 모든 raw candidate와 lineage catalog row를 logs/artifacts/g1-outcome-graph.canvas의 node/disposition 및 final primary W assignment에 대조한다. raw row가 node가 되지 않으면 명시적 non-node 이유와 후속 disposition이 있어야 한다.

### {W5,W6,W7,W8}

- Change-Trace Review Gate: candidate lineage의 src/docs/tests/roadmap 변경 또는 corrective는 (1) 변경 전 — relevant current owner·code/test, `git status --short`, tracked path의 `git diff HEAD -- <paths>` 및 untracked 존재·내용 기준, (2) provenance/log — 승인·구현·검증 locator와 intended write-set, (3) 변경 후 — actual diff ↔ planned write-set 및 owner ↔ producer/consumer ↔ focused test ↔ roadmap/deferred 재-graph-walk을 함께 검토한다. `git diff --check`는 formatting gate일 뿐 semantic/provenance closure 증거가 아니며, dirty shared worktree diff는 author·approval·시점을 증명하지 않는다. baseline 이전 변경·untracked artifact·write-set attribution이 불명확하면 limitation으로 남겨 logs/source 재대조 후 user coordination으로 올린다. bounded corrective는 current owner, exact write-set, RED, GREEN, owner/roadmap propagation까지 이 trace를 닫은 뒤에만 수용한다.

### {W5,W6}

- Controller contract: W5 execution is delegated through a user-relayed executor prompt that requires efficient, non-duplicative use of subagents. The controlling agent independently reviews the candidate using focused subagents efficiently, then accepts, corrects, or rejects it and solely records/reconciles this log. After W5 completion, report the proposed W6 handoff to the user; record no W6 handoff or pointer transition without explicit permission. Only after that permission is recorded and the pointer moves to W6, provide Gemini a W5 scope, evidence, findings, and W6-boundary explanation.

## 2026-07-23 · decision-provenance traceability audit registration

사용자 승인에 따라 기존 outcome-implementation-and-owner-integrity audit은 실행 전에 superseded한다. 기존 로그의 모델은 logs를 current authority처럼 두어, owner 문서와 code/test의 관계를 반대로 읽을 위험이 있었다.

새 audit은 다음 순서를 따른다.

1. W1이 모든 in-scope source log와 relevant task record를 block/entry 단위로 끝까지 읽어 raw provenance ledger를 만든다.
2. 여러 source block을 fold해 final outcome node를 만들고, node마다 provenance chain, effective owner, code/test evidence, deferred/roadmap 위치를 기록한다.
3. master canvas는 이 ledger의 navigation output이며, HTML snapshot과 public-ID pilot은 discovery seed일 뿐 authority가 아니다.
4. W2-W8은 node lineage를 순차 검증하고, W9만 final decided gate의 audit input을 남긴다.

이 로그는 독립 audit이다. G1-A final decided gate는 이 로그의 W9 PASS를 별도 입력으로 소비하지만, 이 로그가 G1-A status를 자동 전환하지는 않는다.

### 2026-07-23 18:12 · W1 graph-authority and artifact-role correction

W1 graph contract를 정밀화했다. 최초 registration의 HTML snapshot “discovery seed” 표현은 더 이상 적용하지 않는다.

- W1-A부터 W1-F까지의 source corpus와 coverage 기준은 freeze, plan, controlling log, relevant task record, current owner 문서, code/test다.
- HTML execution-flow snapshot과 public-ID pilot canvas는 새 graph의 input 또는 completeness 기준이 아니다. W8에서 새 graph에 대한 reverse/blind-spot 비교에만 사용한다.
- master canvas는 raw provenance ledger의 fold 결과로만 생성한다. node는 outcome claim이고 raw block/entry는 provenance source다.
- node/edge/colour/group schema는 Required Context W1의 최신 graph contract가 소유한다.

### 2026-07-23 18:14 · W2-W8 graph-walk execution contract

W2-W8의 실행 순서를 명확히 했다. W1-F가 master graph와 coverage matrix를 freeze한 뒤, 이후 Work Item은 독립적인 문서 탐색이 아니라 배정된 outcome node와 upstream/downstream edge를 walk하는 검증으로 시작한다. Graph는 navigation contract이고 authority가 아니므로, node의 provenance와 effective owner 문서를 매번 다시 대조한다.

### 2026-07-23 18:27 · W1 entrypoint verification and execution report

- User requested a read-first work report. Confirmed this independent Base log has active `W1`; no implementation or corpus read was performed.
- `W1` currently specifies fixed substeps `A → B → C`: corpus inventory, source-family full-history reads, then raw ledger and lineage catalog with provisional primary W coverage.
- Reconciliation needed before execution: latest `18:14` entry refers to `W1-F` and a frozen graph/coverage matrix, but Work Items and Required Context define only `W1 A~C` and defer canvas work to `W2-W8`. Treat the explicit Work Items and Required Context as the operative contract unless a later correction resolves this contradiction.
- Next action remains W1-A: create the raw-provenance-ledger artifact and inventory the freeze, plan, in-scope controlling logs, relevant task records, current owner documents, and code/tests. HTML snapshot and public-ID pilot remain W8-only reverse/blind-spot comparators.

### 2026-07-23 18:34 · W1-F reference assessment

- Assessment: the active Work Items and scoped Required Context are the more specific, internally consistent execution contract. They define W1 only as `A → B → C`, assign each candidate a provisional primary W at W1-C, and explicitly allocate node fold/draw, graph-walk, and disposition work to W2-W8.
- The `W1-A부터 W1-F` and `W1-F` freeze wording in the two prior entries has no corresponding Work Item, substep definition, artifact ownership, or completion/reconcile condition. It therefore cannot safely expand W1 or make graph freeze a prerequisite without an explicit contract correction.
- No Work state changed. Execute W1-A under the existing A→B→C contract; if a genuine W1-D~F scope is later intended, add it explicitly with owner, outputs, dependency, and reconciliation conditions before execution.

### 2026-07-23 18:36 · W1-A parallel source discovery launch

- W1-A will use two read-only scouts for independent candidate discovery: governance sources (freeze, plan, current-owner documentation) and chronological sources (controlling logs and relevant task records). The controlling agent retains corpus-boundary judgment and the working artifact.
- This is not a package transition: the scouts have no assigned artifact, Work Item lifecycle, or independent result acceptance; their outputs are candidate locators only. W1-A inventory and later W1-B full-history reads remain owned by this Base log.
- In parallel, W1-A will establish the raw ledger artifact schema and inspect repository references to reconcile the scout findings.

### 2026-07-23 18:38 · W1-A corpus inventory established

- W1-A corpus inventory is now established in `logs/artifacts/g1-outcome-raw-provenance-ledger.md` under GOV-01–06, LOG-01–08, and TASK-05/06/08. It separates plan/current-owner families from chronological controllers and their task-record sets.
- Two read-only scouts supplied independent candidate discovery; the controlling review accepted only paths tied by the active plan, freeze/closeout references, controller Task Indexes, or Return Target/consumer relationships. The HTML snapshot, public-ID pilot canvas, and the superseded earlier audit remain excluded from the substantive corpus.
- Verified the 4 G1-B, 15 G1-C, and 1 public-ID task records exist at the registered paths; `git diff --check` passes. Read status is intentionally `unread`: W1-A inventory is complete, and W1-B next performs the required family-by-family full-history read and raw-row extraction.

### 2026-07-23 18:43 · W1-B durable handoff and delegated-read contract

- **W1-B handoff / entry point.** Start by reopening `logs/artifacts/g1-outcome-raw-provenance-ledger.md`; do not create a new W1-B block or alter the active W1 marker. The ledger inventory is the fixed starting corpus for this pass. Its rows are currently all `unread`; no source family has yet received a full-history read.
- **Read and write boundary.** Every source must be read as its complete History, not only frontmatter, Work Items, latest entry, or task-record summary. Scouts are read-only: they return candidate raw rows with exact source path, block/entry heading, line span, change verb, claim fragment, and links. Only the controlling agent writes the ledger, normalizes locator format, deduplicates candidate rows, assigns raw IDs, and changes an inventory status.
- **Delegated slices.** Use at most three concurrent scouts: (1) `LOG-01` through `LOG-04` for G1-A chronological history; (2) `LOG-05`, `TASK-05`, `LOG-06`, `TASK-06`, `LOG-08`, and `TASK-08` for G1-B/C/public-ID controllers and task records; (3) `GOV-01` through `GOV-06` plus `LOG-07` for plan/current-owner/rationale and the independent verification review. Keep the ledger artifact and audit log write-set exclusively with the controlling agent.
- **Execution order.** Read one assigned source family at a time; after each family, merge the returned candidates into the raw ledger and append one W1-B checkpoint recording corpus IDs read, raw-ID range, new outbound references, exclusions, and the next family. Do not defer all merges to the end: an interrupted session must be able to resume from the ledger alone.
- **Coverage gate before W1-C.** For each inventory corpus ID, mark `read` only after its complete set was read and all candidate records were either entered as raw rows or explicitly noted as no-outcome/no-row. Reconcile new directly referenced G1 source files into the inventory before reading them. Before W1-C, verify: every inventory row has a final read status; every raw row has a locator and change verb; no task record is skipped; excluded HTML/pilot/superseded-audit files remain W8/discovery-only; and no current-resolution, PASS, canvas node, or final primary-W conclusion has been entered prematurely.
- **Boundary.** W1-B extracts chronological provenance only. It does not decide the current owner, resolve conflicting records, modify code/docs/tests, draw the canvas, or fold rows into outcome nodes; those actions belong to W1-C and W2-W8.

### 2026-07-23 18:51 · W1-B full-history corpus read and ledger merge

- W1-B delegated full-history reads completed for GOV-01–06, LOG-01–09, TASK-05/06/08. The ledger now records R001–R056; all corpus rows are `read`.
- LOG-09 was discovered from LOG-04’s replacement pointer and reconciled into the inventory before its complete read. It is superseded/discovery-only: R055–R056 preserve audit-method and final-gate provenance, not a substantive product finding.
- Candidate rows remain chronological provenance only. No current-owner resolution, PASS/disposition, canvas node, lineage fold, or final primary-W assignment was entered.
- Next: validate the W1-B coverage gate against the ledger (inventory status, locator/change-verb completeness, task-record coverage, exclusion boundary), then begin W1-C only if it passes.

### 2026-07-23 21:20 · W1-B raw-ledger merge correction

- 이전 `18:51` checkpoint의 R001–R056은 source-history 완독 결과를 대표 row로 과도하게 압축한 불완전 병합이었다. 그 entry는 W1-B의 complete raw ledger를 뜻하지 않는다.
- `logs/artifacts/g1-outcome-raw-provenance-ledger.md`의 `## Raw Provenance Ledger`를 source-entry 단위 R001–R312로 교체했다: G1-A LOG-01–04 121 rows, GOV-01–06 및 LOG-07 64 rows, LOG-05/06/08 및 TASK-05/06/08 125 rows, superseded earlier audit 2 rows.
- TASK-05 W1, TASK-06 W1의 빈 Result / Verification, TASK-05 W4의 brief-only Task History는 artifact의 `### W1-B no-outcome coverage`에 명시했다. 후보/raw row의 lineage fold, current owner, PASS, canvas node, primary W는 아직 판정하지 않았다.
- W1-B raw full-read와 append-only ledger merge는 여기까지다. 사용자 지시 범위에 따라 coverage gate는 아직 실행하지 않는다.

### 2026-07-23 22:03 · W1-B 독립 재검토, ledger 보정과 coverage gate PASS

- 사용자 지시로 W1-B 결과를 독립 재검토했다. 6개 source-family 슬라이스에 read-only 검증 agent를 배정해 raw row R001–R312 전부를 원본과 대조했고, 확정 결함은 controlling agent가 원본에서 직접 재확인했다.
- 재검토 판정: 날조는 없다. phantom row 0, 존재하지 않는 heading 인용 0, 사실과 모순되는 claim 0이며 locator 정확도와 verb 배정은 대체로 견고했다. 결함은 completeness accounting에 집중됐다. GOV owner-doc 61행의 span은 현재 문서 경계와 일치해 stale copy 가설은 성립하지 않는다.
- 확정 결함과 보정: (1) W8 구간 L711–770을 재타일링한 중복 row `R099`·`R100`·`R101` retire, 구분되는 claim은 `R096`이 흡수. (2) 누락 outcome 복구 — freeze log `R001a`·`R002a`·`R004a`·`R011a`·`R013a`·`R018a`·`R019a`·`R027a`, public-ID task record `R309a`. (3) locator 정정 `R133`·`R290`·`R305`·`R309`(뒤 셋은 EOF 초과 또는 block 시작 오인). (4) claim/verb 정정 `R013`·`R025`·`R038`·`R108`·`R174`. (5) corpus 누락 보정 — `docs/decisions/pair-attach-atomicity-and-sentinel.md`를 GOV-06에 편입하고 `R182a`–`R182c` 추가.
- `R043`의 inspected no-outcome 목록은 `R002`·`R005`·`R007`의 row span을 no-outcome으로 덮는 자기모순이 있었고 누락 outcome 6건을 포함했다. 목록 소유권을 artifact의 `### W1-B no-outcome coverage`로 옮기고 판정 기준과 구간별 사유를 명시했다. G1-C `W1.md` 선언의 교차참조 `R216`(다른 package·다른 log)과 G1-B `W4.md` 선언의 범위·교차참조도 실제 소유자로 정정했다.
- 판정 기준을 명문화했다: block/entry가 결정, 기록된 입장의 정정·철회, scope·non-goal·deferred·dependency 확정, 구현 또는 검증 결과를 확정하면 raw row를 두고, 설명·이해 확인·미승인 제안·질문 개시·기존 row의 재서술은 source evidence로만 남긴다.
- W1-B coverage gate 실행 결과 PASS. inventory 전 corpus `read`, raw row 321건에 ID 중복 0·retired ID 잔존 0, 전 행이 locator와 유효 change verb 보유, task record 20개 전부 row 또는 no-outcome 선언으로 커버, HTML snapshot과 public-ID pilot은 유입 없이 W8 전용으로 유지, raw row에 새로 내린 resolution·disposition·canvas node·primary-W 배정 없음, Lineage Catalog는 비어 있음. `scripts/check-markdown-inline-code`와 `git diff --check` 통과.
- 보정하지 않고 남긴 관례 항목은 artifact의 `### W1-B correction ledger`가 소유한다: 현재 상태 서술 section의 `verifies` 사용, literal heading이 없는 구간의 서술적 locator, locator dash 표기 혼재, `R122`–`R185`에만 선반영된 lineage ID. lineage 확정은 W1-C 작업이므로 여기서 판정하지 않는다.
- Next: W1-C. 보정된 raw ledger를 입력으로 lineage catalog와 provisional primary W를 작성한다. W1-C 이전 gate 조건은 모두 충족됐다.

### 2026-07-24 14:03 · W1-B Codex 재검토 반영, corpus 누락 보정과 gate 재-PASS

- Codex에 22:03 W1-B 보정·gate PASS 독립 검토를 요청하고 그 결과를 무비판 수용하지 않고 원본으로 재판정했다. Codex는 A(추가 12행)·C(임계선)·G(보정 무해성)을 PASS로 confirm했고, PASS 철회 하나만 escalate했다.
- Codex 논거의 오류: 참조 파일명 `docs/decisions/code-and-isolation.md`와 `clautration.md`는 존재하지 않고, `R03890`("R038과 R090 결합") ID도 ledger에 없다(환각). PASS 철회 근거로 든 것은 roadmap L238의 `claude-channel-trust-and-registration` wikilink였다.
- 그러나 원본 추적에서 Codex의 밑바닥 지적이 실재하는 corpus 누락을 가리켰음이 확인됐다. `docs/architecture/local-runtime-claude-adapter.md`가 GOV-04에서 빠져 있었다 — 이미 corpus에 있던 Codex adapter doc(R147–R153)의 sibling이고, in-corpus GOV-04 문서 2개(`local-runtime-gaps-and-targets.md` L59·L147-148, `local-runtime-routing-and-delivery.md` L3·L154)가 직접 참조하며, 18:43 gate의 "directly referenced G1 source reconcile" 대상이자 W6 in-scope다. Codex가 든 roadmap 링크가 아니라 이 architecture WHY-link 경로가 실제 누락 근거다.
- 2nd-pass 보정: (1) GOV-04에 `local-runtime-claude-adapter.md`, GOV-06에 그 WHY-owner decision `claude-channel-trust-and-registration.md` 편입. (2) `R153a`–`R153e`(§6.1 topology, §6.2 registration flow, §6.3 ingress, §6.4 injection, §6.4 unauthenticated `/send` reverse push-auth gap)와 `R153f`–`R153h`(decision Decision/Alternatives·Rationale/Trade-offs·Re-evaluation) 추가 — pair-attach(R182a-c)와 동일한 architecture+decision rowing. Codex가 orbit하던 trust-boundary gap의 실제 소재는 `R153e`다. (3) 나머지 후보 2건 명시적 제외: `codex-app-server-mcp-injection-and-isolation`(roadmap L479 Post-Release Phase 2 owner ref → out-of-scope), `codex-d7-authoritative-binding-scope`(corpus inbound 전무 → directly-referenced 대상 아님). (4) L728 blank-line nit로 retired 설명의 "line 단위 union" 표현 정정. `claude-channel-plugin-default`는 §6.1이 참조하는 또 다른 decision이라 R153a note에 further candidate로 남겼다.
- gate 재실행 PASS: raw row 329건(321+8), ID 중복 0·retired ID 잔존 0, 전 행 locator와 유효 change verb, 표 8열 정합, HTML/pilot 유입 없음, 새 resolution·disposition·canvas node·primary-W 없음, Lineage Catalog 비어 있음. `check-markdown-inline-code`·`git diff --check` PASS.
- 판정: Codex의 "PASS 전면 철회"는 과했으나(미독·날조 아님, 5개 verify 조건은 22:03에도 성립) reconcile 절의 directly-referenced source 처리에서 실제 누락 1건을 정확히 노출했다. 그 누락을 reconcile-in으로 닫은 지금 gate는 clean PASS다.
- Next: W1-C. 보정된 329행 ledger를 입력으로 lineage catalog와 provisional primary W를 작성한다.

### 2026-07-24 14:35 · W1-B closure reconciliation — Codex 2차 completeness 반영, corpus wikilink-closure를 fixpoint까지 종료

- 사용자 지시로 W1-B를 closure reconciliation 단계로 재개했다(W1-C 미착수). Codex 2차 재검토가 2nd-pass의 한계를 지적했다: claude-adapter 하나만 reconcile-in한 것은 "in-corpus 문서가 직접 참조하는 미편입 doc"이라는 일반 class를 닫지 못한 ad-hoc fix였다.
- 이 지적을 무비판 수용하지 않고 독립 systematic wikilink-closure로 확인·확장했다. seed corpus(GOV-01~06)의 outbound doc-wikilink를 추출→inventory 대조→IN/index/catalog/forward-gate 분류→IN 문서 outbound 재스캔을 fixpoint까지 반복했다. backtick path-form 참조도 확인(추가 gap 없음).
- 결과: 실제 gap은 Codex 보고 5건이 아니라 15건이었다. Codex는 specs+architecture만 참조원으로 봐서 undercount했고, roadmap·decisions까지 넣은 closure라야 process-topology·store-and-repositories·다수 spec·uds가 드러난다. fixpoint는 round 1=14 후보 → round 2에서 daemon-transport-api 편입이 `uds-transport-and-framing-contract`를 노출(15) → round 3 신규 0으로 수렴.
- IN 6(full-read+extract): `process-topology`(R161a), `store-and-repositories`(R161b-c), `daemon-transport-api`(R161d-e) → GOV-04; `claude-channel-plugin-default`(R161f-g), `proxy-lazy-observation-cost-model`(R161h), `uds-transport-and-framing-contract`(R161i-j) → GOV-06. 뒤 3개는 in-corpus adapter/transport의 WHY-owner decision(pair-attach·claude-trust와 동일 class).
- Disposition 9(참조원 locator/분류/비편입 사유/재진입 조건을 ledger `### W1-B closure reconciliation (3rd pass)` 표가 소유): index 2(`local-agent-runtime`=stub holder, `aiox-a2a`=spec compatibility hub), catalog 1(`errors-events-smoke`=error/event/smoke reference appendix, 결정 outcome은 lifecycle §4.4=R139·code 소유), forward-gate 6(`codex-app-server-mcp-injection-and-isolation`, `runtime-profile-namespace-isolation`, `aiox-capability-policy`, `aiox-compose-contract`, `aiox-federation-remote`, `aiox-runtime-profile-namespace` — 모두 roadmap 미래-gate Owner ref로만 참조, completed G1-A/B/C provenance와 무관, 각 사유·재진입 조건 명시). `codex-d7-authoritative-binding-scope`는 어떤 corpus doc도 참조 안 해 closure에 안 나타남(no-inbound, 대상 아님).
- gate 재실행 PASS: raw row 339건(329+10), ID 중복 0·retired 잔존 0, 전 행 locator와 유효 change verb, 표 8열(및 disposition 표 5열) 정합, HTML/pilot 유입 없음, 새 resolution·disposition·canvas node·primary-W 없음, Lineage Catalog 비어 있음. 이번엔 "directly referenced G1 source reconcile"를 fixpoint까지 닫아 조건을 mechanical check가 아니라 method로 증명했다. `check-markdown-inline-code`·`git diff --check` PASS.
- 판정: Codex의 completeness 지적과 PASS 재철회는 정당했고 오히려 undercount였다. corpus 선정이 처음부터 closure 기반이 아니라 ad-hoc였던 W1-A 방법 결함을 이 pass가 교정했다. fixpoint 도달로 gate가 실제로 닫혔다.
- Next: W1-C. closure된 corpus(inventory + 15건 disposition)를 입력으로 lineage catalog와 provisional primary W를 작성한다.

### 2026-07-24 14:51 · W1-B 4th-pass — Codex 3차 검토 반영(catalog/index 분류 정정, closure 범위 명시)

- Codex 3차 재검토가 3rd-pass closure의 4개 결함을 지적했고, 무비판 수용하지 않고 원본으로 확인한 뒤 타당분을 교정했다.
- 확인·수용: (1) errors-events-smoke catalog disposition은 threshold 미충족. §10.2/§10.4 dead union member(codex_app_server_unavailable 미발행, adapter_not_found never returned)와 §11 declared-but-not-emitted 9 event는 gaps doc(R160)이 소유하지 않는 확정 as-built gap이고(grep로 부재 확인), §12 smoke 8-PASS는 verification 결과다. appendix 역할이 이 확정 claim의 row화를 면제하지 않는다. → R161k(defers, gap), R161l(verifies, smoke)로 승격, errors-events-smoke를 GOV-04 partial-IN으로. enumeration은 code/lifecycle §4.4(R139) 소유라 no-row 유지.
- 확인·정정: (2) aiox-a2a "고유 outcome 없음"은 과장. index disposition은 유지(docs/specs/AGENTS.md §3이 index가 glossary·layer-model을 framing으로 보유하도록 규정)하되, 사유를 per-claim owner attribution으로 정정. agent-address URI는 실은 message-lifecycle §4.1 L148(R136 span)이 소유하므로 고유 미소유 outcome이 아니다 — Codex의 "고유 claim" 주장은 이 부분에서 원문상 성립하지 않으나, "고유 outcome 없음" 표현이 부정확했던 것은 사실이라 정정했다.
- 확인·정정: (3) R161f locator L6-12는 claim의 A-dev-debug-fallback을 못 덮는다(그 방향은 Context L4 소유). → locator를 L3-12로 확장. no-outcome 노트도 plugin-default Context L4는 rowed 예외로 정정.
- 확인·수용: (4) 3rd-pass "모든 outbound doc-wikilink fixpoint"는 과장. closure는 실제로 owner-class(architecture/decisions/specs) 대상이었고 product/plans/README/retained-provenance log 링크는 미처리였다. → closure를 target-class로 명시하고 비-owner-class doc-link를 별도 disposition(product=scope owner, plans/release-plan=workstream, README=nav, retained-log=discovery-only·in-scope log는 LOG-01~09).
- Codex PASS 수용: C(R161a/c/e ↔ R147/R159/R155 provenance overlap은 raw-row 중복 아니라 W1-C fold 대상), D(claude-trust IN/capability-policy OUT는 직접 WHY-link 유무 차이로 일관), E-부분(local-agent-runtime index 방어됨).
- 갱신된 fixpoint: 15건 = IN 7(process-topology·store·transport·plugin-default·proxy·uds + errors-events-smoke partial), disposition 8(local-agent-runtime·aiox-a2a index + forward-gate 6). target-class closure는 round 3에서 수렴 유지.
- gate 재실행 PASS: raw row 341건(339+2), ID 중복 0·retired 0, 전 행 locator·유효 verb, 표 8열·disposition 표 5열(8 doc row) 정합, premature resolution 없음, Lineage Catalog 비어 있음. check-markdown-inline-code·git diff --check PASS.
- 판정: Codex 3차의 B(catalog)·F(locator)·A(범위)는 정당했고 수용해 교정했다. E는 index 유지가 맞으나 사유 표현을 정정했다. gate는 이 교정 뒤 target-class fixpoint에서 다시 닫혔다.
- Next: W1-C. closure된 corpus(inventory + 8 disposition)를 입력으로 lineage catalog와 provisional primary W를 작성한다.

### 2026-07-24 15:09 · W1-B 5th-pass — Codex 4차 반영·fixpoint 재확인

W1-B 5th-pass — Codex 4차 재검토 독립 검증·보정, closure fixpoint 재확인.

Codex 4차가 지목한 6건을 원본 대조로 전부 실제 결함으로 확정하고 보정했다(무비판 수용 아님, AGENTS.md).

- (핵심 blocker) `aiox-a2a` §2 glossary의 agent-address percent-encoding 비교 규칙은 message-lifecycle §4.1(L147-150, 형식·rebind만 소유)에 없고 R136 claim도 address semantics를 말하지 않는 slice 미소유 normative claim. 3차에서 controlling agent가 format과 comparison rule을 뭉개 "message-lifecycle L148(R136 span) 소유"로 처리한 것이 실제 결함이었음을 확정·수용. index disposition→partial-IN 승격, R136a(`decides`)로 reconcile-in. 승격 후 outbound owner-class wikilink(slice 7종) 재스캔 → 전부 inventory/disposition에 존재, 신규 0, fixpoint 유지.
- R161k: §10.2/§10.4 dead union member는 미래 연기가 아닌 code-owned dead code라 §10 enumeration no-row로 환원, row는 §11 dropped 9-event scope만 소유(verb `defers` 유지).
- R161l: 조합 "6종"→"3종" 실수량 교정(basic 1 + 단일 TUI 4 + `/resume` combo 3 = 8이 §12 표와 일치). external provenance는 retained log §1을 source-of-record→closeout baseline(48/360/build + TUI 재결합 집계) historical support로 낮춤(§1은 3 combo·test-file 매핑 미열거).
- README 제외 사유 "navigation"→dev/build smoke·runtime-profile 운영 안내로 교정(제외 결론 유지). layer model §3은 slice/architecture-owned 구조 framing이라 threshold no-row 유지.

closure 최종: 15건 = IN 8, disposition 7. coverage gate 재실행 PASS(row 342, 중복 ID 0, 모든 raw row verb+locator 채움, 표 컬럼 정합[R009는 escape된 `\|` false positive로 실제 8-col clean], inline-code·whitespace OK). W1은 여전히 `[>]`, W1-C 미착수 — closure reconciliation이 다시 수렴했으므로 다음 라운드(Codex 재검토 또는 W1-C 착수)는 사용자 지시 대기.

### 2026-07-24 15:30 · W1-B 6th-pass — Codex 5차 반영·CLI slice·dead-union 복원

W1-B 6th-pass — Codex 5차 재검토 독립 검증·보정, closure 재수렴.

Codex 5차 3건을 원본 대조: 2건 확정 수용, 1건은 진단 정정 후 readability 보정.

- (핵심 blocker) CLI slice 누락 확정·해소: architecture index `local-agent-runtime` document map(L68-76)이 가리키는 9 slice 중 `cli-and-operator-surfaces`(§9)가 inventory·disposition 어디에도 없었다. index를 3rd-pass에서 disposition할 때 slice 목록을 개별 enumerate하지 않은 방법 결함. full-read 후 operator-surface disposition으로 편입 — §9 load-bearing invariant(auto-start=R161d, rollbackAgentAttach/daemon API=R161e, 6-delivery-status=routing §8.4)가 이미 소유해 새 G1 outcome 없음. WHY-owner decision `daemon-autostart-and-channel-identity`는 inbound wikilink 0 orphan이라 closure 대상 아님. disposition 7→8, 총 16 = IN 8 + disposition 8.
- (D 확정) dead union member 복원: 5th-pass가 §10.2/§10.4 dead union member(`codex_app_server_unavailable`·`adapter_not_found`)를 no-row로 강등한 것은 과소 처리. 문서가 명시적으로 flag한 확정 as-built gap이라 R161m(`implements`)으로 복원, R161d의 recordCodexRuntimeFailed dead-path 기록과 동형. L417 no-outcome coverage의 R161k 귀속 모순(5th-pass가 만든 내부 불일치)도 함께 교정.
- (A 진단 정정) R136a segment 표기: Codex의 "ledger project 오류"는 부정확. 원문 aiox-a2a §2 L77이 URI slot `<profile>`을 generic "authority/project/agent"로 표기한 것으로 ledger는 원문을 인용했다(오기 아님). row를 URI slot 기준으로 명시+원문 표기 병기하고, 원문 project/`<profile>` 불일치는 spec drift 후보로 보고(ledger에서 spec 미수정).

coverage gate 재실행 PASS(row 343, 중복 0, 8-col 정합, verb 어휘 유효, inline-code·whitespace OK). W1 여전히 `[>]`, W1-C 미착수. 이번 라운드는 방법 결함(index slice enumeration 누락)을 교정했으므로 다음 검증은 새 disposition의 scope 판정과 R161m verb 적정성에 집중. 다음 라운드/W1-C 착수는 사용자 지시 대기.

### 2026-07-24 15:38 · W1-B 6th-pass 독립 재검토 PASS · W1-C handoff

- Codex가 6th-pass 보정을 read-only로 독립 재검토했다. CLI/operator slice의 operator-surface disposition은 G1 관련 load-bearing behavior가 기존 R161d/R161e/R148/R157에 이미 보존되고 나머지가 operator tooling이라는 근거로 유지 가능하다. `daemon-autostart-and-channel-identity`는 실제 WHY decision이지만 corpus에서 그 decision으로 향하는 inbound wikilink/path reference가 없는 orphan이므로, 현 direct outbound-reference closure에서는 제외가 일관된다.
- `R161m`은 §10.2/§10.4의 declared-but-not-live dead member를 확정 as-built gap으로 기록하며 `implements` verb가 적절하다. R136a는 URI slot `<profile>`과 원문의 generic `authority/project/agent` 표현을 함께 기록하므로 ledger 오기가 아니다; 불일치는 spec drift 후보로만 남긴다.
- 두 index의 slice map과 seed·IN owner 문서의 wikilink·backtick/bare path-form reference를 재대조했다. architecture index 9개 slice와 aiox-a2a index 7개 slice는 모두 inventory 또는 disposition에 있고, 새 owner-class 후보는 없었다. coverage gate는 PASS를 유지한다.
- Handoff: W1-B closure reconciliation은 완료 상태다. W1-C는 **다음 세션**에서만 시작하며, 이 entry는 lineage catalog·provisional primary W·canvas node·final primary-W 배정을 수행하지 않는다. W1은 계속 `[>]`이고 W1-C 착수는 사용자 지시를 기다린다.

### 2026-07-24 15:52 · W1-C delegation and post-completion handoff protocol

- 사용자 지시로 W1-C는 Claude에게 실행 위임하고, controlling agent는 결과 수용 전 source·schema·coverage를 독립 검토한 뒤에만 ledger와 audit log를 변경한다.
- 실행 순서는 Claude prompt → 사용자 전달 → Claude 작업 보고 수령 → 필요 시 병렬 subagent 검토 → controlling agent의 수용/보정 판단 및 log entry 기록이다.
- W1-C 완료 뒤 W2는 이 세션에서 시작하지 않는다. 다음 세션 handoff 초안은 먼저 사용자에게 보고하고, 명시적 허락을 받은 경우에만 기록한다.
- W1-C 결과가 안정되면 Gemini에게 W1-C의 범위·수행 내용·잔여 경계를 사용자 설명 관점에서 검토받기 위한 별도 prompt를 제공한다.

### 2026-07-24 20:52 · W1-C accepted — lineage catalog and provisional coverage complete

- W1-C candidate result를 수용했다. working artifact `logs/artifacts/g1-outcome-raw-provenance-ledger.md`의 Lineage Catalog는 50개 lineage로 raw row 343개를 정확히 한 번씩 fold하고, 각 lineage에 W2–W8의 provisional primary 하나를 둔다.
- Controlling 검토는 Claude의 최초 catalog에서 `R236`·`R237`이 Tier-3 동작이 아니라 G1-C split-plan 승인·W8–W11 등록이라는 사실을 찾아냈다. 보정 뒤 두 row는 `g1c-work-package-plan`(W7)으로 carve-out했고, `tier3-delivery-contract`(W3)는 동작·계약만 유지한다.
- 독립 검토: 최초 구조 검토에서 raw/member 343개 일치, 중복·orphan·phantom 0, 6열과 valid primary-W를 확인했다. W2–W4 및 W5–W8 의미 검토도 provisional 경계와 unresolved fold가 최종 resolution·PASS·node를 선결하지 않는다고 판정했다. carve-out 뒤 원문 R236/R237과 새 W7 entry를 다시 대조해 W7 배정과 stale-reference 제거를 확인했다. inline-code 및 whitespace 검사는 통과했다.
- W1-A~C는 완료다. W2 이후 lineage fold → canvas → graph-walk은 이 세션에서 시작하지 않는다. 다음 세션 handoff는 사용자에게 초안을 먼저 보고하고 명시적 허락을 받은 경우에만 기록한다.

### 2026-07-24 20:56 · W2 next-session handoff accepted

- **Next-session handoff — W2.** 수용된 `logs/artifacts/g1-outcome-raw-provenance-ledger.md`의 Lineage Catalog에서 W2 primary 5개(`canonical-envelope`, `error-model`, `reply-right`, `envelope-field-correction`, `agent-address-identity`; raw row 55개)를 입력으로 재개한다.
- W2는 각 lineage를 fold해 `logs/artifacts/g1-outcome-graph.canvas`에 outcome node와 허용 edge를 추가하고, provenance를 직접 재확인해 effective owner ↔ code producer/consumer ↔ test evidence ↔ roadmap/deferred를 graph-walk 검증한다. current resolution·audit disposition은 이 대조 뒤에만 확정하며, W1-C의 provisional W2 배정 자체를 결론으로 취급하지 않는다.
- `agent-address-identity`의 spec wording drift와 comparison-rule code 미검증, `canonical-envelope`의 reply/public-ID/test facet 경계는 W2에서 owner·code/test 대조로 처리한다. 새 protocol/public contract, compatibility/fallback/alias/dual-write, 다수 package 재개 또는 방향 모호성은 사용자 조율로 올린다.
- W1-C coverage(343 raw row, 중복·orphan·phantom 0)는 수용 완료 근거다. artifact가 변경됐거나 catalog/raw ledger drift 정황이 있을 때만 재검증한다. W3 이후는 시작하지 않는다.

### 2026-07-25 19:52 · W2 revised candidate review — partial acceptance and corrective contract gate

- Claude의 W2 revised candidate를 controlling read-only review와 독립 subagent 2개로 재대조했다. W2 catalog 5 lineage의 raw row 55개는 exactly-once이며 다른 lineage와 중복되지 않는다. `canonical-envelope`와 `reply-right`은 current/pass 후보를 수용한다. `error-model`은 §4.4 baseline owner가 current인 것과 R026 shared registry outcome이 unbuilt인 것을 분리해 ambiguous·gap·user-coordination 후보로 유지한다. `agent-address-identity`는 percent-encoding comparison consumer/normalizer/test 부재와 `<profile>`/project wording drift 때문에 independent current·gap·user-coordination 후보로 유지한다.
- `envelope-field-correction`의 이전 pass 판정은 철회한다. `formatAioxChannelEnvelope`가 `inReplyToDeliveryId`와 `outcomeForDeliveryId`를 독립 spread하므로 네 layer(core/repository/schema/serializer) 어디에도 일반 상호배타 invariant가 없다. 현재 producer paths와 outcome-path tests는 분리됨을 보일 뿐이다. 따라서 node는 current/corrective로 두며, ledger owner-candidate의 field-definition pointer는 lifecycle §4.1 L80-81로 보정 후보이다.
- Corrective implementation은 아직 승인하지 않았다. repository guard는 production INSERT 경로의 최소 방어선이지만 direct SQLite write까지 보장하지 않고, `MessageRepository.create`에 기존 typed-error/result channel이 없으므로 raw throw와 새 public reason은 서로 다른 계약 영향이 있다. Claude에게 error mapping boundary와 RED/GREEN을 명확히 한 bounded corrective proposal을 다시 요청한다. 새 reserved-intent `status` spec/code drift는 W8의 새 blind-spot candidate 보고로만 남기며 node/primary 재배정은 하지 않는다.
- Audit은 미커밋 working tree를 입력으로 검증했다는 사실을 기록하되, 이를 repo-wide settled authority로 단정하지 않는다. master canvas는 아직 부재이며, 생성 시 resolution-only colour와 허용 edge 계약을 따른다. W2 marker는 corrective proposal과 결과 수용 전까지 [>]를 유지한다.

### 2026-07-25 20:14 · W2 corrective boundary — design review correction

- FACT: supported MCP and daemon ingress do not thread `outcomeForDeliveryId`; no supported external ingress can create both it and `parentMessageId`. The repository invariant remains necessary for programmatic/internal callers and DB bypass/corruption.
- FACT: a plain repository Error is not a typed domain result. In-process API callers receive a rejection; socket transport emits `internal_error`; its client discards that reason and Codex/Claude MCP exposes `daemon_call_failed` with the Error message. Existing coverage does not exercise invariant → socket → MCP end-to-end.
- FACT: `messages.create()` is the sole runtime-DML message insert boundary, excluding schema bootstrap/migrations. A schema CHECK would need a versioned migration/rebuild for existing DBs. The daemon `isUniqueConstraintError` currently classifies any `SQLITE_CONSTRAINT`, so a future CHECK on reply insert would map to `duplicate_reply`.
- DECISION: retain W2 node `envelope-field-correction` as `current` + `corrective`; do not approve implementation until the bounded app-level guard/error-boundary wording and RED/GREEN scope are corrected. Schema CHECK is out of the minimal corrective; it is a separate migration/classifier decision.

### 2026-07-25 20:26 · W2 accepted — envelope/reply provenance fold and corrective closure

- RESULT: W2 primary 5 lineage(raw 55)를 master canvas `logs/artifacts/g1-outcome-graph.canvas`에 fold했다. Canvas validation: 14 nodes, 15 edges, all IDs unique, all edge endpoints resolved, and every label is from the allowed relation set. Resolution colors are current=cyan for canonical-envelope/reply-right/envelope-field-correction/agent-address-identity and ambiguous=red for error-model; dispositions are text badges.
- ACCEPTED: canonical-envelope and reply-right are current/pass. envelope-field-correction is current/corrective: the repository-write guard rejects simultaneous `parentMessageId` and `outcomeForDeliveryId`; targeted repository + ingress regression is 73/73 pass. This is runtime repository-write mutual-exclusion hardening, not schema-wide field-applicability enforcement. Ledger catalog owner candidate is corrected to lifecycle §4.1 L80-81 primary, with §4.2/routing §8.5 supporting.
- OPEN FINDINGS: error-model remains ambiguous/gap/user-coordination (live §4.4 baseline vs unbuilt R026 registry promise); agent-address-identity remains current/gap/user-coordination (normative comparison rule has no consumer/normalizer/test and `<profile>`/project wording drift). `status` intent mismatch remains only a W8 new-candidate report.
- VERIFICATION SCOPE: `pnpm exec vitest run tests/unit/store/repositories/messages-deliveries.test.ts tests/unit/daemon/codex-ingress.test.ts` passed 2 files / 73 tests. Claude-reported full-suite 55/566 pass was not accepted as controlling evidence: this controller’s `pnpm test -- …` invocation ran the whole suite without filtering and showed unrelated socket/readyz failures.
- NEXT: W2 is complete as an audit work item with material findings recorded. Do not create the W3 handoff until the user approves the proposed next-session handoff.

### 2026-07-25 22:00 · W3 next-session handoff — user-start gate required

- **W3 handoff (next session; execution gate).** W3 consumes these primary ledger lineages: `tier3-delivery-contract`, `codex-ingress-evidence`, `automatic-ack-capability`, `correlation-late-success`, `unconfirmed-fsm-observer`, `queue-retry-ttl-backpressure`, `manual-retransmit`, `primary-reject-notification`, `integration-tui-evidence`, and `manual-lifecycle-corrective` (catalog rows beginning at `tier3-delivery-contract`).
- **Precondition:** before beginning W3, report this handoff and the proposed W3 scope to the user. Start any W3 read, canvas edit, corrective, or implementation only after the user explicitly instructs the work to begin. Do not infer approval merely from this handoff.
- **Method when authorized:** consume each assigned lineage exactly once; fold outcome nodes into `logs/artifacts/g1-outcome-graph.canvas`; use only allowed edge labels and resolution-only colours; graph-walk owner ↔ code producer/consumer ↔ tests ↔ roadmap/deferred. Keep W2-owned `outcomeForDeliveryId` mutual-exclusion as supporting evidence only; do not reopen its W2 disposition.
- **Known incoming links:** `primary-reject-notification` consumes the W2-corrected `outcomeForDeliveryId` field contract; its notification mechanism belongs to W3. `canonical-envelope`/`reply-right` canvas nodes are current/pass but are not W3 primary work.
- **Expected review gates:** distinguish acceptance from receipt/completion; preserve unconfirmed/late-success and no-auto-reinject claims; treat automatic ack as deferred unless actual trigger/seam is proven. Escalate any new protocol/public contract, migration, compatibility behavior, or directionally ambiguous finding for user coordination.

### 2026-07-26 13:43 · 2026-07-26 · W3 controlling-agent delegation, review, and handoff protocol

- User assigned the controller three responsibilities: delegate W3 work through user-relayed prompts, independently review executor reports with efficient subagent use, and keep the controlling audit log; executors do not write this log.
- Delegation contract: each executor prompt must state bounded scope, inputs, non-goals, expected report/evidence, stop-and-escalate conditions, and a subagent topology that prevents duplicated reading or loss of scope. The controller will provide the prompt to the user rather than directly treating the executor output as accepted.
- Review contract: after the user relays an executor report, the controller routes focused checks to independent review subagents, compares their evidence with source material, and only then accepts, corrects, or rejects the candidate. The controller records the accepted disposition and reconciliation.
- W4 transition contract: after W3 is complete, the controller must first report the proposed W4 handoff to the user. It may record the W4 handoff only after explicit approval; after recording it, the controller provides a Gemini prompt explaining W3 work, evidence, findings, and W4 boundary. No W3 execution or W4 handoff has started from this instruction.

### 2026-07-26 13:44 · 2026-07-26 · W3 executor prompt prepared for user relay

- User requested the W3 executor prompt. The controller will provide it for user relay; this preparation alone does not start W3, authorize canvas/code/log edits by an executor, or change the W3 Work Item state.

### 2026-07-26 14:22 · 2026-07-26 · W3 accepted — Tier 3 reliability graph-walk complete

- W3 controller acceptance: the 10 assigned lineages fold the ledger’s 94 rows into one W3 outcome node each. Canvas validation passed (40 nodes, 66 edges; duplicate ID, unresolved endpoint, illegal label, and missing file target all 0). The controller independently reran the final targeted suite: 4 files / 109 tests passed.
- Acceptance is conditional only on the evidence actually available: current canvas structure and W3 coverage were verified; a pre-W3 canvas snapshot is unavailable, so no independent claim is made that W2 was byte-for-byte unmodified.
- Corrective review accepted `manual-lifecycle-corrective`: API lifecycle evidence is `tests/unit/daemon/api.test.ts`, with the Codex MCP result-surface test retained only at its accurate locator. The automatic-ack node is `deferred · gap`, not user-coordination: passive acknowledgement and target receipt/work-completion producer absence are already owned current gaps, while target progress/passive-ack is conditional capability rather than a present implementation obligation.
- W3 is complete. W4 has not started and no W4 handoff is recorded; controller must first report its proposed scope to the user and wait for explicit approval before recording that handoff.

### 2026-07-26 14:28 · 2026-07-26 · W4 next-session handoff — user-start gate required

- **W4 handoff (next session; user-start gate).** Consume only the W4-primary ledger lineages: `delivery-pk-and-lifetime`, `opaque-issuance`, `public-id-factory`, and `codex-live-correlation-evidence`.
- **Method when authorized:** fold each lineage exactly once into `logs/artifacts/g1-outcome-graph.canvas`, then graph-walk provenance → effective owner → code producer/consumer → tests → roadmap/deferred owner. Preserve resolution-only colours, allowed edge labels, and the graph coverage contract.
- **Boundary:** verify public `messageId`/`deliveryId` issuance responsibility, opacity, process-lifetime versus restart-spanning scope, and Codex authenticated reply correlation/`duplicate_reply`. Treat W2 reply-right/canonical-envelope and W3 Tier-3 outcomes only as supporting evidence; do not reopen their dispositions. Escalate new public contract, migration, compatibility behavior, or directionally ambiguous finding for user coordination.
- **Precondition:** this handoff records scope only. Do not start W4 reading, canvas editing, or corrective work until the user explicitly gives a W4 start instruction.

### 2026-07-26 20:27 · W3 historical G1-B/G1-C scope reconciliation accepted

- **Accepted audit finding:** the prior W3 graph-walk correctly establishes the current Codex-centred Tier 3 implementation evidence, but did not test whether that current scope faithfully covers the broader historical G1-B/G1-C gate. W3 is therefore reopened for historical scope reconciliation; W4 execution is suspended.
- **Independent review corrections:** G1-B canonical-envelope/public-ID/reply-right core has completion evidence, but its full historical gate remains evidence-insufficient because the rollback-aware migration pre-step lacks a closed transfer/owner trail. G1-C Codex Tier 3 has completion evidence, but the full historical gate is user-coordination: current scope moved automatic ack/completed, stale policy, and related guarantees, while the approval boundary is not reconstructible as a gate-wide decision from repository evidence alone. This does not prove an unauthorized change.
- **Claude boundary:** current evidence does not establish that Claude had the same G1-C implementation obligation as Codex. It does establish that Codex-only `unconfirmed`, late-response, and manual-retransmit evidence cannot be counted as Claude coverage. Shared queue/TTL/backpressure and Claude HTTP unit/success evidence exist; Claude channel failure retry, daemon-level terminal failure, late ambiguity, and capability-surface coverage are not established by the G1-C composition suite.
- **Next decision required:** before implementation or owner-document edits, user must decide the historical gate interpretation and disposition of the unresolved requirements: invocation accepted-result recovery, deleted inbound-reply/MCP-fallback condition, migration rollback pre-step, capability/degradation surface, and the native-activity handoff conflict. The existing W4 handoff remains historical only and must not be started while W3 is active.

### 2026-07-26 20:27 · W10 state reconciliation for historical G1-B/G1-C audit

- **State correction:** completed W3 cannot be reactivated by the log contract; its accepted current-scope graph-walk remains historical evidence only. W10 is the active corrective audit that re-evaluates whether W3’s `tier3-delivery-contract` disposition may stand as a historical G1-C completion claim. This supersedes the preceding entry’s shorthand “W3 reopened.”
- **Pointer:** W4 remains open but is not actionable while W10 is active. No implementation or owner-document write follows from the audit; W10 first requires the user’s disposition of the unresolved historical-gate requirements.

### 2026-07-27 13:05 · W10 historical requirement movement cause trace accepted

- **W10 change-cause trace (read-only):** two independent subagents traced (1–2) and (3); controller rechecked (4–5) against `HEAD`, current roadmap, and G1-A/B/C logs. No code, owner document, plan, canvas, or task record changed.
- **Findings:** (1) ingress re-invocation idempotency left the G1-C verification matrix during the Codex Tier 3 split and was later classified as a separate future decision; no direct item-level transfer decision was found. (2) the retry/failure inbound-reply/MCP-fallback no-loss criterion disappeared after W2 discovery with neither replacement owner nor deletion decision found. (3) rollback-aware migration was written into Phase 2 by the user-authorized W7 roadmap edit, but the original G1-B rollback posture has no item-level rationale/decision linking it to that transfer. (4) runtime capability/diagnostics was not moved by W7: the G3-or-Phase-2 decision path already coexisted with the HEAD adapter-model obligation; no implementation disposition was made. (5) stale/native were excluded from bounded Codex Tier 3 because user-selected policy introduced no time-based stale predicate and current evidence lacked native activity/receipt; W7 then placed them as Phase 1 or later. Production runtime-failure wiring remains an architecture gap without a concrete implementation gate.
- **Evidence limitation:** user-authorized W7 write-set and log entries prove the roadmap edit was authorized/accepted as a batch, not that each historical requirement received an explicit standalone user decision. W10 therefore remains active pending user disposition; this trace neither restores nor defers any requirement.

### 2026-07-27 13:50 · W10 disposition — rollback-aware durable migration

- **USER DISPOSITION / CLOSED ITEM ③:** retain rollback-aware durable migration as a Phase 2 responsibility. The current production daemon uses an in-memory SQLite database; it has no restart-persistent operator data or durable replay contract to migrate in G1-B/G1-C. Phase 2 owns the eventual file-backed durable store, restart recovery, preservation of issued public IDs and consumed reply-right history, and any required safe migration/rollback posture.
- **Reconciliation:** `docs/product/roadmap.md` already assigns persistence/restart migration and durable replay to Phase 2, and `docs/architecture/local-runtime-gaps-and-targets.md` already records the current in-memory limitation and file-backed durable target. No owner-document change is required for item ③. This closes only the missing historical disposition trail; it does not mark Phase 2 durable persistence, restart recovery, or rollback safety implemented or complete.

### 2026-07-27 13:55 · W10 disposition — capability/degradation surface

- **USER DISPOSITION / CLOSED ITEM ④:** split the capability/degradation concern by responsibility. G3 owns a minimal read-only diagnostics surface for the current Codex and Claude adapters: current connection state and truthful, currently known delivery guarantees/limitations (acceptance versus receipt, automatic-ack/`completed` support, automatic retry safety, and available manual-recovery boundary). G3 does not introduce a generic registry, change delivery policy, or create new reliability guarantees.
- **Phase 2 owner:** general capability-model and adapter-boundary refactoring: typed adapter capability declaration, registry/event-boundary integration, and shared daemon/CLI/TUI consumption. This is not a G1-C completion requirement and does not make the Phase 2 model implemented.
- **Reconciliation:** item ④ is closed as a disposition. Its concrete G3 and Phase 2 owner-document/implementation work remains future work; no current owner document or code is changed by this log entry.

### 2026-07-27 15:01 · 2026-07-27 · W10 historical G1-B/G1-C scope reconciliation complete

- **Controller acceptance:** user dispositions and the bounded owner-document corrections were accepted after executor reports, independent read-only reviews, direct locator checks, and `git diff --check`. The accepted write-set is the roadmap, lifecycle/adapter/deferred owner documents, and current-gap architecture pointers; no code, test, schema, migration, canvas, Work Item other than W10, or W4 handoff was changed by this W10 closeout.
- **Historical reconciliation outcome:** G1-B historical core remains accepted while its Claude canonical-presentation corrective remains pending. G1-C is not completed/consumed as a whole: Codex Tier 3 evidence is accepted, while ingress invocation accepted-result recovery, adapter-symmetric FSM outcomes, retry/failure no-loss of inbound reply and MCP/channel source results, and direct Codex/Claude integration evidence remain G1-C implementation work.
- **Disposition closure:** rollback-aware durable migration remains Phase 2; minimal current-adapter diagnostics are G3 with Phase 2 owning generic capability/event-model generalization; stale/disconnected operational policy is Phase 1; observable Codex/Claude runtime-failure or disconnect diagnostic wiring is G3. Claude channel canonical presentation is the G1-B corrective, and Codex native activity remains deferred/Phase 1-or-later. These owner placements do not implement the future work or decide HTTP semantics, stale thresholds, retry/hold/failed policy, delivery-state transitions, or a Claude disconnect event.
- **Verification and next state:** independent review passed the locator, boundary, and non-invention checks; `git diff --check` passed. W10 has no remaining audit disposition. W4 remains an existing, unstarted handoff: it is no longer blocked by W10, but must not execute until the user explicitly starts W4 in the next session.

### 2026-07-27 15:01 · 2026-07-27 · W4 next-session activation

- **Next-session activation:** user authorized W4 as the sole active next-session Work Item. The existing W4 handoff is unchanged: this activation does not start reading, canvas edits, corrective work, or implementation in the current session.
- **Execution gate:** begin W4 only in the next session after the user explicitly instructs its start. Consume only `delivery-pk-and-lifetime`, `opaque-issuance`, `public-id-factory`, and `codex-live-correlation-evidence`; keep the documented escalation boundary.

### 2026-07-27 15:06 · 2026-07-27 · W4 executor prompt prepared for user relay

사용자 요청에 따라 W4 실행 에이전트용 독립 세션 프롬프트를 준비했다. 이 단계는 사용자 relay 전 준비이며 W4의 source read, canvas edit, corrective/implementation 또는 Work Item 상태 전이를 시작하지 않는다.

- W4 입력은 lineage catalog의 `delivery-pk-and-lifetime`(R002a/R004/R004a/R006/R007/R008/R164/R165), `opaque-issuance`(R031/R166/R167), `public-id-factory`(R032/R033/R087/R088/R154/R172–R175/R268–R274/R309/R309a/R310), `codex-live-correlation-evidence`(R065/R075–R077)로 고정한다.
- 실행 에이전트는 raw provenance → decisive source/owner → current code producer·consumer → targeted test → roadmap/deferred를 lineage별로 graph-walk하고, canvas candidate와 evidence-rich report를 제시한다. control log는 controller만 기록·상태전이한다.
- 대규모 미커밋 working tree는 audit input일 수 있으나 settled authority로 단정하지 않는다. unrelated 변경의 revert/format/cleanup은 금지한다. 새 public contract, migration, compatibility/fallback/alias/dual-write, 또는 disposition 방향이 모호하면 실행을 멈추고 evidence와 선택지를 보고한다.
- executor 보고 수령 뒤 controller는 source/schema/coverage 검토를 focused independent subagent로 병렬 분해하고, 직접 locator 재검증 후에만 수용·보정·거절과 audit reconciliation을 기록한다.

### 2026-07-27 15:14 · 2026-07-27 · W4 candidate review — correction required

W4 executor candidate를 controller 직접 점검과 focused read-only reviewer 3명으로 검토했다. Work Item 상태는 바꾸지 않으며, 보고서·canvas 보정 전 W4는 계속 `[>]`이다.

- **재현된 evidence:** 지정 Vitest를 controller가 독립 실행해 4 files / 109 tests PASS를 확인했다. owner·code 검토도 `message_deliveries.id` PK binding, UUID 기반 opaque public issuance, source-adapter/daemon factory responsibility, Codex authenticated one-time reply 및 `duplicate_reply`가 현재 uncommitted working tree에서 서로 일치함을 지지한다.
- **수용 불가한 정량 주장:** W4 catalog allocation은 8 + 3 + 19 + 4 = **34** raw rows인데 candidate는 30개라 했다. canvas actual은 **52 nodes / 93 edges**인데 candidate는 19/60이라 했다. controller 재계산으로 W4 outcome node incident edges는 6 + 4 + 9 + 8 = **27**이며 candidate의 17과 다르다. 한 reviewer의 29라는 secondary count는 edge ID 직접 열거와 맞지 않아 채택하지 않았다. 구조 자체는 node/edge ID unique, endpoint resolved, allowed label only로 PASS다.
- **coverage limitation:** canvas node는 lineage label은 갖지만 raw-row locator를 보관하지 않아 canvas 단독으로 34 raw row의 exactly-once fold를 독립 증명하지 못한다. untracked canvas에는 pre-W4 Git baseline도 없어 W2/W3 비변경을 증명할 수 없다.
- **test-scope limitation:** 109-test command는 Claude channel test를 실행하지 않았고, public-ID unit test는 factory format/zero-input만 검사한다. 따라서 Claude issuer-path 및 전 consumer non-parsing을 그 command의 직접 검증으로 과장하지 않는다.
- **Next:** executor에게 34-row corrected coverage, 52/93 actual canvas count, 27 W4 incident-edge ledger, raw-row-to-lineage fold evidence, and exact test-scope correction을 요구한다. raw row IDs를 node provenance에 직접 표기해야 하는지는 shared graph contract의 provenance-chain 해석을 controller가 보정 보고 후 판정한다.

### 2026-07-27 15:17 · 2026-07-27 · W4 corrected candidate review — provenance and CLI evidence correction required

W4 correction candidate를 controller 재실행과 read-only reviewer 2명으로 재검토했다. W4는 계속 `[>]`; canvas/owner/code 상태 또는 Work Item을 수용 전 전이하지 않는다.

- **수용한 보정:** ledger allocation 34(8/3/19/4), canvas total 52 nodes/93 edges, and W4 unique-union incident edges 27이 확인됐다. per-node counts는 6/5/9/8=28이며 factory→opaque consumes edge 하나가 양측에 공유되므로 unique union은 27이다. 두 test suite도 각각 5 files/65 tests 및 3 files/107 tests로 재현 PASS했다.
- **provenance contract 미충족:** W4 node text의 `R… (L…, verb)`는 ledger raw ID를 거쳐 두 hop으로 source를 찾을 수 있지만, Required Context가 명시한 source path + block/entry locator + change verb를 node 자체에 보관하지 않는다. source path·heading이 없어 self-contained provenance-chain이 아니다.
- **CLI evidence 정정:** candidate의 `src/cli/bin.ts`는 존재하지 않는다. production binary는 `src/bin/aiox.ts`이고 default는 socket client `createClientRuntime`; `tests/unit/cli/bin.test.ts`의 cited seam은 test-only legacy in-process runtime을 직접 호출한다. 따라서 candidate가 주장한 production CLI entrypoint issuer proof는 성립하지 않는다. Claude adapter direct factory test와 daemon-server seam evidence는 확인됐다.
- **non-parsing limitation:** public-ID unit은 prefix/uniqueness/zero-argument factory만 검사하고, fake integration은 opaque fixture를 사용한다. 모든 consumer non-parsing을 보장하는 exhaustive test는 확인되지 않았다; static scan은 보조 evidence일 뿐 PASS proof가 아니다.
- **Next:** executor는 W4 node 4개에 grouped source path + block/entry heading + raw IDs/span/change verbs를 추가하고, CLI claim을 actual `src/bin/aiox.ts` production behavior와 test evidence에 맞게 제한하거나 explicit evidence limitation/gap으로 고쳐야 한다. all-consumer non-parsing도 owner contract current/pass와 test evidence limitation을 분리해 보고해야 한다.

### 2026-07-27 15:18 · 2026-07-27 · W4 R310 locator adjudication

R310 locator 후보를 controller가 source task record와 ledger를 직접 재대조했다. `logs/packages/public-id-factory-b/tasks/W1.md`의 `## Result / Verification` parent section은 L74에 시작하고 R310의 L84–236 span은 그 section 안에서 RED candidate부터 accepted result까지의 composite evidence를 포함한다. 따라서 “L84가 Result heading이 아니므로 ledger locator가 틀렸다”는 reviewer 추론은 채택하지 않는다. 다만 raw-ledger schema의 block/child locator로는 parent section + composite span이라는 넓은 locator이며, W4 node provenance가 source path와 entry heading을 생략한 문제와는 별개다. ledger R310은 이번 W4 correction에서 수정하지 않는다.

### 2026-07-27 15:23 · 2026-07-27 · W4 second correction review — exact heading correction required

W4 second correction을 controller 직접 검사와 final read-only reviewer 2명으로 재검토했다. W4는 node provenance heading 미세 보정 전까지 `[>]`로 유지한다.

- **수용한 사실:** token-safe raw-ID count로 34 allocated rows가 네 W4 node text 전체에 정확히 한 번씩 있고, spans/verbs는 ledger와 일치한다. Canvas structure는 52 nodes/93 edges, IDs unique, endpoint 0 unresolved, invalid labels 0, W4 unique incident-edge union 27이다. CLI/non-parsing evidence limitations도 현재 owner contract와 direct-test scope를 혼동하지 않도록 보정됐다.
- **검증 방법 보정:** executor의 `includes` script는 missing 여부만 보며 R004/R004a 및 R309/R309a prefix overlap에 취약해 exactly-once 증명이 아니다. controller의 token-safe regex count가 exactly-once 근거다.
- **남은 canvas-only locator correction:** source path/span/verb는 있으나 actual headings와 다른 축약·합성이 4건 있다: R087은 `W4 candidate correction — Claude channel presentation boundary` (public-ID triage child entry는 L575), R088은 `W4 resume-preparation comprehensive audit — authoritative digest and next`, R268은 `approved B contract registered; implementation remains unstarted`, R167은 `Trade-offs`와 `Re-evaluation`의 composite임을 별도 heading으로 밝혀야 한다. 이 네 wording만 actual heading에 맞추면 provenance schema를 충족한다.
- **write-set limitation:** untracked canvas라 Git diff로 이번 수정이 W4 node만 바꿨다는 historical fact는 증명 불가다. 현 구조·내용은 검증됐으며 이는 product audit blocker가 아니다.

### 2026-07-27 15:25 · 2026-07-27 · W4 accepted — public-ID, correlation, and persistence-binding graph-walk complete

**Controller acceptance — W4 complete.** Executor final canvas-only correction을 subagent 없이 controller가 직접 재검증했다.

- `logs/artifacts/g1-outcome-graph.canvas`는 52 nodes/93 edges, node·edge ID unique, dangling endpoint 0, invalid label 0이다. W4 four-node unique incident-edge union은 27이다.
- token-boundary regex (`\bR…\b`)로 W4 allocated 34 raw IDs가 네 node text 전체에 각각 정확히 한 번 존재함을 확인했다. executor의 앞선 `includes` 방식은 exactly-once proof가 아니며, 이 controller 검증이 acceptance 근거다.
- 각 W4 provenance는 source path, actual block/entry locator, raw row line span과 change verb를 표시한다. R087은 parent block `W4 candidate correction — Claude channel presentation boundary`와 child public-ID triage L575를 함께 가리키며, R088/R268/R167도 원문 heading과 직접 대조했다.
- Product-audit disposition: delivery PK/process-lifetime boundary, opaque issuance, public-ID factory issuer path, Codex authenticated reply correlation/`duplicate_reply` are current/pass on the current working tree. Production CLI direct factory-call test와 exhaustive consumer non-parsing proof는 없는 evidence limitation으로 canvas에 남겼으며, current contract/implementation PASS를 과장하지 않는다.
- No code, owner document, test, ledger, Work Item other than W4, or audit artifact outside canvas was accepted as changed by this W4 result. Canvas is untracked, so Git diff cannot prove the historical write-set was W4-only; current structure/content verification is the accepted scope.
- **Next state:** W4 is complete. W5 has not started; before W5 reading, canvas edit, corrective, or implementation, controller must report proposed W5 scope/hand-off and obtain explicit user approval.

### 2026-07-27 15:26 · 2026-07-27 · W5 next-session handoff — user-start gate required

**W5 next-session handoff (scope only; user-start gate).** W5 primary input is the accepted lineage catalog rows: `deferred-durability-scope` (R003/R005/R123/R125/R132/R134/R140/R145/R146/R160/R161), `legacy-removal` (R048/R049/R051/R052/R215/R279), `smoke-matrix` (R161l), `stale-test-corrective` (R085), `integration-harness` (R258/R259/R260/R302/R303), and `dev-launcher-repair` (R223/R224/R290).

- **Method when explicitly started:** consume every assigned lineage exactly once; fold only outcome nodes into `logs/artifacts/g1-outcome-graph.canvas`; preserve resolution-only colours, provenance-chain schema, and allowed edge labels. For each lineage graph-walk raw provenance → effective owner → current producer/consumer → focused test evidence → roadmap/deferred owner before assigning disposition.
- **Boundaries:** `deferred-durability-scope` is a deliberately broad bundle. Do not silently treat it as one resolved product claim: assess whether its raw rows must remain as explicit multi-claim disposition or be split with primary reassignment. W3 Tier-2/automatic-ack evidence, W4 ingress-idempotency/public-ID boundaries, and W6/W7 diagnostics/events are supporting only; do not reopen their accepted dispositions. `legacy-removal` verifies absence of compatibility/fallback/alias/dual-write and does not authorize adding any. `smoke-matrix`, stale expectations, integration harness, and dev launcher are evidence/test-tooling lineages, not proof of product reliability beyond their stated scope.
- **Escalate:** any new protocol/public contract, migration or durable-persistence implementation, compatibility/fallback/alias/dual-write, cross-Work-Item primary conflict, or directionally ambiguous owner/disposition goes to user coordination before change.
- **Precondition:** this records handoff only. W5 remains open, not active. Do not begin W5 source reads, canvas edits, corrective work, implementation, or tests until the user explicitly starts W5.

### 2026-07-27 15:33 · 2026-07-27 · W5–W8 change-trace review gate added

사용자 요청에 따라 W5–W8에만 적용되는 Change-Trace Review Gate를 Required Context에 추가했다. 이는 현재 상태만 보는 graph-walk의 restoration gap을 닫는다: candidate 변경이 있으면 변경 전 diff/status 기준, 승인·구현·검증 provenance, 변경 후 actual diff와 owner/code/test/roadmap 재대조를 하나의 evidence cycle로 요구한다.

- 기존 W2–W4 완료 결과를 소급 재심사하지 않는다. 이 gate는 future W5–W8 execution과 새 corrective acceptance에만 적용된다.
- dirty shared worktree와 untracked artifact에서는 `git diff`가 author·approval·시점을 증명하지 않는 한계를 명시했다. attribution이 불명확하면 logs/source 재대조 후 user coordination으로 올린다.
- `git diff --check`는 formatting gate일 뿐 semantic/provenance closure 증거가 아님을 명시했다. W5 handoff의 method/boundary와 충돌하지 않으며, W5 agent prompt가 이 Required Context를 소비한다.

### 2026-07-28 14:48 · 2026-07-28 · W5/W6 controller, review, and Gemini handoff protocol

- User assigned the controller contract for W5/W6. W5 executor work is delivered through a user-relayed prompt and must require efficient, non-duplicative subagent use. The controller remains the sole accepting/reconciling writer and will independently review the executor result with focused subagents used efficiently.
- W5 completion does not authorize a W6 handoff: controller must first report the proposed W6 scope to the user and receive explicit permission before recording the handoff or moving the Work Item pointer. After that permission is recorded and the pointer moves to W6, controller provides Gemini a W5 scope/evidence/findings and W6-boundary explanation.
- This instruction does not start W5 or change any Work Item state.

### 2026-07-28 14:49 · 2026-07-28 · W5 executor prompt prepared for user relay

- User relay용 W5 executor prompt를 준비했다. 이는 prompt preparation만이며, W5 source read, canvas/code/test 변경, Work Item 상태 전이 또는 W6 handoff를 시작하지 않는다.
- Prompt는 six primary lineage의 exactly-once fold, Change-Trace Review Gate, 효율적·비중복 subagent topology, controller-only acceptance/logging, user-escalation boundary를 포함한다.

### 2026-07-28 15:09 · 2026-07-28 · W5 candidate controller review — partial acceptance, correction required

- Candidate receipt: executor reports 6 W5 lineages / 27 raw IDs, read-only execution, no write-set. Controller independently reran the five focused Vitest matrices (120, 85, 18, 4, 9 tests) and `pnpm typecheck`; all passed in this controller environment. Dirty-worktree attribution remains a limitation, not authorship proof.
- Accepted review facts: lineage catalog members are exactly once (11+6+1+1+5+3=27); no Member-cell overlap or W2–W4 primary conflict; current canvas is valid at 52 nodes/93 edges with no duplicate IDs, dangling endpoint, or illegal label. `legacy-removal` evidence supports a bounded public intent/content-shape/conclusion-marker no-compatibility claim, not semantic absence of every legacy concept.
- Correction required before W5 acceptance: (1) `deferred-durability-scope` needs R140 locator correction from L302-368 to at least lifecycle §4.5 L359-377, in addition to reported R132/R134/R146 corrections; node claim must be a current restart-spanning boundary matrix with itemized sub-claim owners, and add lifecycle §4.1 L112-116 as supporting current lifetime owner. (2) Candidate canvas plan cannot claim only six new nodes: smoke, stale, and launcher `verified-by`/`implements` targets lack existing file nodes. Either add explicit file nodes/IDs or retain their locators in node text without edges. (3) do not use `deferred-to` edges to current `tier3-delivery-contract` or `public-id-factory` merely for cross-reference; use actual future owner targets or text-only cross-references.
- W5 remains open; no canvas, ledger, code, owner-doc, Work Item state, or W6 handoff/pointer was accepted or changed. Send a bounded correction request and review its actual canvas/provenance output before deciding W5.

### 2026-07-28 15:24 · 2026-07-28 · W5 corrected candidate review — final bounded correction required

- Corrected candidate was independently inspected at its scratch path. Structural facts are confirmed: 61 nodes, 109 edges, duplicate node/edge IDs 0, dangling endpoints 0, invalid labels 0. The 27 raw IDs and corrected R132/R134/R140/R146 plus lifecycle §4.1 L112-117 provenance are present; the prior cross-reference deferred-to edges to current W3/W4 nodes are absent.
- Three minor corrections still block acceptance: (1) durability node must replace its one-to-one 'distinct deferred owner' wording with named, boundary-specific deferred owner(s), because roadmap/gaps/open-deferred owners are shared across rows; (2) legacy node must treat lifecycle §4.1 no-alias statement as supporting current evidence, not the sole owner of typed Intent, conclusion-marker, and G1-B content-shape removals; retain those provenance slices itemized; (3) remove integration-tui-evidence -> smoke-matrix consumes edge c1c0e00100000066. R161l establishes the historical smoke matrix, but available provenance does not establish W3 integration-TUI as its consumer. After removal expected candidate structure is 61 nodes / 108 edges.
- Stale-test corrective, integration harness (including integration-TUI -> harness consumes), and dev-launcher repair are otherwise acceptable within their stated text-only/edge-limited evidence scopes. No new escalation condition is found. W5 remains open and no artifact, Work Item state, or W6 handoff/pointer is accepted or changed pending the final bounded correction.

### 2026-07-28 15:29 · 2026-07-28 · W5 accepted — persistence, test, and tooling graph-walk complete

- Controller accepted the final W5 candidate after direct and focused independent reviews. Applied the accepted six outcome nodes, three file nodes, and fifteen edges to logs/artifacts/g1-outcome-graph.canvas; no pre-existing canvas node or edge was removed. The smoke consumer edge was intentionally excluded.
- Final canvas verification: 61 nodes, 108 edges, duplicate node IDs 0, duplicate edge IDs 0, dangling endpoints 0, invalid labels 0. W5 catalog assignment remains 27 raw IDs across six primary lineages with no W2-W4 primary collision. Final evidence boundaries retain the dirty/untracked attribution limitation and do not treat test/tooling evidence as general product reliability.
- W5 disposition: all six nodes are accepted as current/pass within their stated scopes; deferred-durability is a current boundary matrix, legacy-removal is limited to its three listed surfaces, and no new escalation condition was found. W6 handoff and Work Item pointer transition are explicitly not recorded here and require a prior user report plus explicit permission.

### 2026-07-28 15:30 · 2026-07-28 · W6 handoff approved — adapter and transport graph-walk

- User approved the W6 handoff and pointer transition after the W5 completion report. W6 is the sole next Work Item.
- W6 primary scope: adapter-tier-model, codex-runtime-topology, codex-thread-binding, typed-ingress-surface, declared-not-emitted-surface, claude-runtime-topology, claude-channel-trust, runtime-process-topology, transport-uds-framing, pair-slot-model, pair-attach-atomicity, and codex-ingress-capability-probe. Consume each assigned lineage exactly once and graph-walk raw provenance -> effective owner -> actual producer/consumer -> focused tests -> roadmap/deferred.
- W5 is supporting only: do not reopen W3/W4/W5 accepted dispositions. Apply the W5-W8 Change-Trace Review Gate to candidate changes/correctives. Escalate new protocol/public contract, migration, compatibility/fallback/alias/dual-write, cross-primary conflict, directionally ambiguous disposition, or unclear change attribution before any change.
- Controller contract continues: executor work is user-relayed and uses efficient non-duplicative subagents; controller independently reviews candidate evidence with focused subagents, accepts/corrects/rejects, and solely records/reconciles this log. After pointer transition, provide Gemini a W5 scope/evidence/findings and W6-boundary explanation.

### 2026-07-28 15:38 · W6 controller/review and W7 handoff gate

- User instruction accepted: the controller does not execute W6 directly. The controller prepares a user-relay executor prompt that requires efficient, non-duplicative subagent use; receives the candidate report; then independently reviews it with focused subagents as warranted, and is the sole agent that accepts/corrects/rejects and records/reconciles this audit log.
- W6 completion does not authorize a W7 handoff. Before recording any W7 handoff or moving the Work Item pointer, the controller must report the proposed W7 scope and evidence boundary to the user and receive explicit permission.
- Only after that approved handoff is recorded and the pointer has moved to W7, the controller prepares a Gemini-facing prompt that explains today’s completed work to the user, including scope, evidence, findings, limitations, and the W7 boundary. This instruction neither starts W6 nor changes any Work Item state.

### 2026-07-28 16:43 · W6 candidate controller review — one bounded correction required

- Controller review was performed with three focused read-only reviewers plus direct checks. The authoritative W6 lineage catalog totals 57 unique raw IDs (5+6+2+7+2+3+3+1+3+7+4+14); the prior executor-prompt total 52 was an arithmetic error. Current canvas independently validates at 108 nodes / 182 edges, with 12 W6 nodes, all 57 assigned IDs token-safely exactly once, no W6-to-other-node raw-ID collision, duplicate IDs, dangling endpoints, or invalid edge labels. The controller reran the exact focused Vitest command: 16 files / 208 tests PASS.
- Controller accepts the broad evidence for the other W6 nodes, including declared-but-non-emitted, Claude topology/trust, UDS dead call path, pair-slot, and attach atomicity. The dirty shared worktree and untracked canvas mean pre-W6 baseline and historical write-set attribution cannot be independently reconstructed; this remains the stated Change-Trace limitation, not evidence of an out-of-scope write.
- Acceptance blocker: `codex-ingress-capability-probe` is labeled `current · pass` while its own node states `owner: none current`, has no `owned-by` relation, and says no current architecture/spec owner reproduces the probe-level claim. It therefore lacks the required effective-owner leg for a current/pass graph-walk. Require a canvas-only bounded correction: retain the established probe facts but mark the disposition as an owner/evidence gap (or supply an evidence-backed effective/deferred owner); do not claim full pass without that closure. A separate non-blocking wording correction should distinguish the pair-attach rollback sentinel from the separate send-message sentinel.
- W6 remains active. No W6 acceptance, Work Item transition, W7 handoff, or pointer change is made by this review.

### 2026-07-28 16:51 · W6 accepted — adapter and transport graph-walk complete

- Controller acceptance: the bounded canvas correction resolves the sole acceptance blocker. `codex-ingress-capability-probe` is now `current · gap`, accurately retaining its probe facts while explicitly recording the absence of a current probe-level owner, non-spike re-verification, and an evidence-backed absorbing deferred owner. Its existing `deferred-to` edge is limited to R190 wake-up, not treated as full ownership. `pair-attach-atomicity` now correctly separates `attachRollbackSentinel`/`isAttachRollback` from the distinct send-message sentinel flow; controller and focused reviewer directly confirmed the separate Symbols, guards, and catch paths.
- Accepted evidence: W6 catalog allocation is 57 unique raw rows (not 52); all are token-safely exactly once across its 12 nodes, with no cross-node collision. Canvas currently has 108 nodes / 182 edges, duplicate IDs 0, dangling endpoints 0, invalid labels 0; W6 uses resolution cyan only. Controller reran the 16-file focused Vitest command: 208/208 PASS. Owner/code/test checks support the other W6 nodes. The untracked canvas and dirty shared worktree leave historical pre-W6 baseline and write-set attribution as an explicit Change-Trace limitation, not an acceptance blocker.
- Reconciliation: W6 is complete. W7 has not started; no W7 handoff, pointer transition, or Gemini prompt is recorded. Per the user-approved gate, the controller must now report the proposed W7 scope and evidence boundary and wait for explicit permission before recording a handoff or making W7 active.

### 2026-07-28 16:52 · W7 handoff approved — owner and closeout graph-walk

- User approved the W7 handoff and pointer transition after the W6 completion report. W7 is the sole active next Work Item.
- W7 primary scope: consume exactly once the 11 ledger lineages / 71 raw rows assigned to W7: `g1-stage-ownership`, `owner-reflection-reconciliation`, `codex-evidence-closeout`, `g1b-slice-handoff`, `downstream-handoff-register`, `g1a-closeout-readiness`, `runtime-support-policy`, `g1bc-review`, `gb-package-closeout`, `gc-package-closeout`, and `g1c-work-package-plan`.
- Method: fold each lineage into the master canvas and graph-walk provenance → effective decision/spec/architecture/roadmap/plan owner → actual closeout/handoff consumption relation → relevant code/test evidence scope → deferred owner and W9 final-gate connection. W2-W6 product dispositions are supporting only and are not reopened. W8-owned G1-D trust boundary and blind-spot candidates remain supporting references only.
- Boundary: do not make a new policy, status transition, owner-document/roadmap/plan change, or ambiguous direction silently. Escalate such findings for user coordination. Apply the W5-W8 Change-Trace Review Gate to any candidate change. Controller execution remains user-relayed with efficient non-duplicative subagents; controller independently reviews candidate evidence and solely accepts/corrects/rejects and records/reconciles the log.
- Post-transition communication: prepare a Gemini-facing prompt explaining today’s W6 scope, evidence, accepted findings, limitations, and the W7 boundary. This is explanatory only and does not delegate W7 execution or alter its acceptance authority.

### 2026-07-28 17:05 · 2026-07-28 · W7 executor prompt prepared for user relay

- 사용자 지시에 따라 W7 실행 에이전트용 relay prompt를 준비했다. 이 준비는 W7 source read, canvas/code/test/owner 변경, Work Item 상태 전이 또는 W8 handoff를 시작하지 않는다.
- Prompt는 11 primary lineage/71 raw row exactly-once fold, provenance→owner→closeout/handoff→evidence→deferred-owner graph-walk, Change-Trace Review Gate, efficient non-duplicative subagent topology, controller-only acceptance/logging, W8 user-approval gate를 포함한다.

### 2026-07-28 17:13 · 2026-07-28 · W7 candidate controller review — bounded correction required

- Controller reviewed the W7 scratch candidate with three independent read-only reviews and direct checks. Candidate structure is valid (108/182 → 128/209; duplicate IDs 0; dangling endpoints 0; invalid labels 0) and all 71 assigned raw IDs are token-safely exactly once with no existing-node collision. The stated five-file Vitest command was independently reproduced: 5 files / 139 tests PASS.
- Acceptance is blocked by traceability contract gaps: nodes `owner-reflection-reconciliation`, `codex-evidence-closeout`, `g1b-slice-handoff`, `downstream-handoff-register`, and `g1a-closeout-readiness` use vague or chronological-log owners where current owner paths/sections and owned-by relations are required; several nodes textually claim code/test evidence without matching implements/verified-by edges. `runtime-support-policy` overstates doctor as policy enforcement; `g1bc-review` conflates historic failure findings with sandbox EPERM; `gc-package-closeout` treats W9 as a deferred owner.
- W7 remains active. No candidate artifact, Work Item, canvas, or W8 handoff is accepted. Request a canvas-only bounded correction; the untracked canonical canvas remains a historical write-set attribution limitation.

### 2026-07-28 17:19 · 2026-07-28 · W7 corrected candidate review — final two-edge correction required

- Controller final re-review: corrected candidate passes JSON structure (124 nodes/235 edges), ID/endpoint/label checks, preserved baseline nodes/edges, and all 71 W7 raw IDs exactly once. Previous owner/provenance and closeout corrections are accepted as candidate evidence.
- Two bounded blockers remain: `runtime-support-policy` text cites `package.json` engines but has no package.json file node/implements edge; `gc-package-closeout` names roadmap Phase 2 as an actual deferred owner but has only an `owned-by` relation, not a `deferred-to` edge. W7 remains active and unaccepted; request only these canvas corrections. No W8 handoff or pointer transition.

### 2026-07-28 17:24 · 2026-07-28 · W7 accepted — owner and closeout graph-walk complete

- Controller accepted the final W7 candidate after direct final-artifact verification and focused independent reviews. The canonical canvas now contains the accepted W7 fold: 125 nodes / 237 edges; node/edge IDs unique, dangling endpoints 0, invalid labels 0, and all 71 W7 raw IDs token-safely exactly once with no prior-node collision. The controller independently reproduced the focused Vitest evidence: 5 files / 139 tests PASS.
- Acceptance scope: exact effective-owner, implementation/test, and deferred-owner relations were corrected; runtime policy keeps doctor as partial diagnostic only, g1bc historical findings remain qualified, and W9 remains an audit gate rather than a product/deferred owner. Canonical canvas differs from the accepted scratch only by terminal newline. The canvas is untracked, so historical write-set attribution remains a limitation.
- Reconciliation: W7 is complete. W8 remains open and has not started. Do not record a W8 handoff or pointer transition until the controller reports its proposed W8 scope/evidence boundary to the user and receives explicit permission.

### 2026-07-28 17:25 · 2026-07-28 · W8 handoff approved and Gemini W7 continuity prompt prepared

- User explicitly approved the W8 handoff and pointer transition after the W7 completion report. W8 is the sole active next Work Item.
- W8 scope remains the ledger/canvas reverse blind-spot scan and fold→graph-walk verification. W8 primary work includes the G1-D trust-boundary lineage and superseded-audit/non-node disposition; W2–W7 accepted nodes are supporting only. New policy, owner-document/roadmap/plan change, status transition, compatibility/migration, or ambiguous disposition remains user-coordination before change.
- User requested a Gemini-facing detailed W7 handoff prompt. This prompt is explanatory continuity material: it records W7 scope, accepted evidence, candidate correction history, validation, limitations, and W8 boundary; controller acceptance/reconciliation authority remains with this audit log.

## 2026-07-28 · W8 controller delegation and W9 approval gate

- 역할: controller는 orchestration main brain으로서 W8을 직접 실행하지 않는다. 사용자 전달용 executor prompt를 작성하고, executor 후보 결과를 받은 뒤 독립 검토·수용·보정 요구·기록/상태 조정만 담당한다.
- Executor prompt와 controller review 모두 필요한 범위에서만 효율적·비중복 subagent 사용을 명시한다. 같은 source/evidence를 중복 탐색하지 않으며, 역할을 provenance/owner·code-test/structure·coverage처럼 분리한다.
- 후보가 owner 문서·code·test·roadmap/plan 변경을 제안하면 executor와 controller 모두 먼저 변경 필요성·대상·근거·정확한 write-set·RED/GREEN 검증을 사용자에게 보고하고, 명시적 결정 전에는 반영하지 않는다.
- W8 수용 뒤 W9을 활성화하거나 W9 handoff/pointer를 기록하기 전, controller는 W8 결과와 제안하는 W9 범위·evidence boundary를 사용자에게 먼저 보고하고 명시적 허락을 기다린다.

### 2026-07-28 20:50 · W8 executor prompt prepared for user relay

- 사용자 전달용 W8 executor prompt를 준비했다. Prompt는 두 W8 primary lineage(`g1d-trust-boundary`: R131/R153e/R153h, `superseded-audit`: R311/R312)의 exactly-once fold, ledger/canvas reverse blind-spot scan, 제한된 비중복 subagent 역할 분리, read-only candidate 보고와 Change-Trace gate를 요구한다.
- Prompt는 executor가 owner 문서·code·tests·roadmap/plan·audit log·canonical canvas를 변경하거나 W8/W9 상태·pointer를 전환하지 못하게 하고, 변경이 필요하면 근거·write-set·RED/GREEN을 controller→user에게 먼저 제시하도록 한다.

### 2026-07-28 21:03 · W8 candidate controller review — user coordination required

- Controller는 후보 보고를 직접 source 대조하고, 비중복 read-only reviewer 둘(provenance/owner/corpus, code/test/canvas)로 검토했다. W8은 아직 수용·완료 처리하지 않는다.
- 확인: R131/R153e/R153h의 G1-D trust-boundary gap과 현재 `/send` 무인증 구현·해당 ingress auth test 부재, R311/R312의 superseded audit provenance 및 non-node 방향은 근거가 있다. canonical canvas의 125 nodes/237 edges·구조 정합과 W8 raw-ID 미fold 상태도 확인했다.
- 보정 필요: R131 locator `L207-241`은 G1-C를 포함하고 G1-D 통과조건을 누락한다. 사용자 승인 후에만 `G1-D — Trust Boundary, L232-266`으로 ledger를 정정할 수 있다. R160은 unauthenticated ingress/secret·permissions/rollback cleanup을 supporting evidence로 뒷받침하지만 forged correlated-reply rejection까지 포괄한다고 말할 수 없으며, W5 primary ownership을 변경하거나 재fold하지 않는다.
- 새 결정 필요: W1-B가 `docs/specs/aiox-capability-policy.md`에 정한 G1-D 재진입 조건은 충족됐다. §7.1은 기존 `/send` gap의 중복 evidence이고 §7.2는 all ingress/push identity verification의 독립 normative owner commitment이다. ledger를 partial-IN으로 재편입해 §7.2의 좁은 raw row를 `g1d-trust-boundary`에 추가할지, raw ledger는 동결하고 W8 node의 supporting-owner citation으로만 남길지는 사용자 결정 전 반영하지 않는다. durable-store §7.2 L134-140은 W8 범위 밖이다.
- W8 candidate의 canvas/ledger 변경, W8 완료 상태, W9 handoff/pointer는 이 사용자 조율과 보정 후보의 승인 전에는 적용하지 않는다.

### 2026-07-28 21:13 · W8 accepted — trust-boundary and non-node disposition complete

- 사용자 승인에 따라 W8 audit artifact만 반영했다. 제품 owner 문서·roadmap·code·tests는 변경하지 않았다.
- Ledger: R131 locator를 `docs/product/roadmap.md` G1-D L232-266으로 정정했고, explicit re-entry condition에 따라 `docs/specs/aiox-capability-policy.md`를 W8 partial-IN으로 편입해 R153i(§7.2 L123-133)를 `g1d-trust-boundary`에 추가했다. §7.1 `/send`은 R153e/h와 중복이고 §7.2 durable-store 문구는 범위 밖으로 유지했다. R160은 W5 primary ownership을 유지한 제한된 supporting evidence로만 기록했다.
- Canvas: `g1d-trust-boundary` current/gap node와 capability-policy file node, owner/support/refinement edge를 추가했다. `superseded-audit`은 non-node/non-product disposition으로 확정했다.
- Verification: raw row 344개, raw ID 중복 0; W8 R131/R153e/R153h/R153i/R311/R312는 각각 1회; canvas 127 nodes/243 edges, ID 중복·dangling edge·invalid label 0; `git diff --check`와 inline-code check 통과.
- W8을 수용·완료한다. W9 handoff/pointer는 사용자에게 W9 scope/evidence boundary를 먼저 보고하고 명시적 허락을 받을 때까지 기록하거나 전환하지 않는다.

### 2026-07-28 21:14 · W9 handoff approved — final coverage and decided-gate input audit

- 사용자 승인에 따라 W9 handoff와 pointer 전환을 기록한다. W9이 유일한 활성 Work Item이다.
- Scope: ledger의 raw provenance row 344개와 lineage catalog를 master canvas의 outcome node 또는 명시적 non-node disposition 및 final primary W assignment에 대조한다. 모든 raw candidate는 exactly one final primary W를 가져야 하며, node가 아닌 row/lineage에는 근거 있는 non-node disposition과 후속 처리 관계가 있어야 한다.
- Evidence boundary: claim별 current owner는 decision/spec/architecture/roadmap이며 code/test는 implementation·verification evidence, logs는 provenance, canvas는 navigation/coverage map이다. W8 R153i partial-IN과 `superseded-audit` non-node disposition을 포함하되, W2-W8 accepted disposition을 재개하지 않는다.
- Verification: raw-ID·primary-W uniqueness, node/non-node coverage, provenance/owner/code-test/deferred relation, canvas JSON·ID·endpoint·allowed-edge-label integrity를 대조한다. unresolved material finding은 PASS로 덮지 않고 audit input으로 기록한다.
- Boundary: G1-A status는 이 audit이 자동 전환하지 않는다. owner 문서·roadmap/plan·code/test 변경, 새 protocol/public contract, compatibility/migration, cross-primary conflict, 방향이 모호한 finding은 변경 전 사용자 조율로 올린다. W9 executor prompt와 candidate execution은 별도 사용자 지시에서만 시작한다.

### 2026-07-28 21:17 · W9 resume intake — active scope confirmed

- 재개 확인: 사용자가 이 로그를 명시적으로 지정했으므로 onramp의 복수 open 후보는 선택 모호성이 아니다. `scripts/log check`는 Work Item active=1, 다음 pointer=W9, long-log=ok(528 lines)를 확인했다.
- 현재 행동: W9 executor prompt나 실행은 아직 별도 사용자 지시 전에는 시작하지 않는다. 이번 checkpoint는 W9의 scope·evidence boundary·남은 검증을 보고하기 위한 read-only 재개 확인이다.

### 2026-07-28 21:18 · W9 controller delegation and review protocol

- 사용자 지시: controller는 W9을 직접 실행하지 않고 user-relayed 작업 agent에 read-only candidate 조사를 위임한다. 작업 agent prompt에는 필요한 범위에서만 efficient, non-duplicative subagent 사용을 요구한다.
- Controller 계약: 후보 보고 뒤 controller는 provenance/coverage, canvas structure, owner·code/test evidence처럼 겹치지 않는 역할로 필요한 subagent만 사용해 독립 검토한다. controller만 수용·보정 요구·거절과 이 로그의 Work Item/상태 reconciliation을 수행한다.
- 경계: 작업 agent와 reviewer 모두 owner 문서·roadmap/plan·code/test·ledger/canvas·audit log를 변경하거나 W9/G1-A 상태를 전환하지 않는다. material finding 또는 변경 제안은 evidence·정확한 write-set·RED/GREEN 검증을 controller→user에게 먼저 보고한다.

### 2026-07-28 21:32 · W9 candidate controller review — bounded provenance-schema gap

- Controller review: candidate의 전수 coverage 결론을 수용한다. 독립 coverage/structure/contract reviewers와 직접 확인에서 raw 344·lineage 50·primary-W 단일 배정·49 node+`superseded-audit` non-node·canvas 127 nodes/243 edges, ID/endpoint/label 정합이 재현됐다. W2/W3 15 lineage/149 raw row의 node는 self-contained provenance chain이 없어 W9은 bounded NOT PASS다.
- 정정: W4–W8 34개가 literal `**provenance:**` header를 모두 갖는다는 보고는 형식상 부정확하다. W6 `codex-ingress-capability-probe`는 `**provenance (all in …):**` 형식이지만 R189–R202 전부를 self-contained하게 보관하므로 material gap으로 합산하지 않는다. W2/W3 15 node 중 member raw ID가 보이는 것은 4개 node의 각 1개뿐이며 11개 node는 0개다.
- 판단: Required Context의 provenance-chain schema와 W4 self-contained locator precedent에 따라 W2/W3 결손은 canvas schema-completeness material finding이다. 다만 owner/code/test/deferred edge 및 W2/W3 product disposition을 반증하지 않으므로 이를 재개하지 않는다.
- 사용자 조율 대기: W9 protocol상 canvas 변경 전 controller는 exact write-set과 RED/GREEN을 먼저 보고해야 한다. 선택지는 (A) 지정 15 text node에 ledger의 source path·exact block/entry locator·span·verb·assigned raw IDs를 정확히 한 번씩 넣는 canvas-only correction을 승인하거나, (B) canvas는 동결하고 W9 NOT PASS를 G1-A final gate audit input으로 남기는 것이다. W9은 active 유지.

### 2026-07-28 21:34 · W9 provenance-gap disposition options requested

- 사용자 조율: A/B는 W2/W3 product disposition이나 구현 방향을 고르는 선택이 아니라 W9에서 발견된 canvas provenance-schema gap의 처리 방식이다. controller는 책임 관계·관찰 가능한 결과·검증 경로를 설명한 뒤 사용자 결정을 기다린다.

### 2026-07-28 21:36 · W9 provenance repair approved — executor prompt preparation

- 사용자 승인: W9 provenance-schema gap은 A 방식으로 처리한다. 지정 W2/W3 15 outcome node의 self-contained provenance를 canvas-only로 보강하는 후보 작업을 user-relayed executor에 위임한다. 기존 resolution/disposition/edge/ledger/owner/code/test 및 W9/G1-A 상태는 변경 대상이 아니다.
- 실행 전 controller gate: executor는 exact candidate와 RED/GREEN 결과를 보고하고, controller는 필요한 비중복 subagent로 locator/coverage와 canvas 구조를 독립 검토한 뒤에만 수용·reconcile한다.

### 2026-07-28 21:59 · W9 provenance repair controller review — ledger-currentness gap

- Controller repair review: 15-node canvas-only repair is ledger-consistent. Three non-overlapping reviews confirm W2=55 and W3=94, total 149 assigned raw IDs are block-internal exactly-once with no missing/extra; all path/span/verb fields match ledger; canvas JSON/127 nodes/243 edges/ID-endpoint-label integrity remain valid. The accepted scope did not change resolution/disposition/edges.
- Correction to executor evidence: `git diff --check` does not validate this untracked canvas, and Git cannot prove historical 15-field-only attribution. Current structural and content checks are accepted evidence; the untracked-baseline limitation remains.
- New finding, not repaired: raw ledger current-source locator drift prevents claiming all copied locators are currently exact. Direct check confirms R133 roadmap Phase 1 heading is now L449 while ledger/canvas says L412-441; R130/R138 ranges still contain their headings but begin at stale offsets, and R151 heading has a current suffix omitted by ledger. This is pre-existing ledger drift, not a 15-node fold defect. The approved canvas-only write-set cannot correct the ledger silently. W9 remains active pending user choice of snapshot retention, locator-refresh scope, or NOT PASS audit disposition.

### 2026-07-28 21:59 · W9 provenance repair accepted — final locator disposition pending

- Controller acceptance: 사용자 승인 범위의 canvas-only provenance repair는 수용한다. 지정 15 node의 provenance block은 ledger catalog member 149개를 각각 정확히 한 번 포함하며, path/span/verb가 ledger와 일치하고 JSON/structure가 보존됐다. W2/W3 disposition 및 다른 artifact는 재개·변경하지 않았다.
- W9 completion/PASS는 수용하지 않는다. 별도 pre-existing ledger-currentness finding(R133의 명백한 out-of-span locator와 R130/R138/R151의 current-heading drift)을 어떻게 처리할지 사용자 결정이 필요하다. Work Item은 [>] 유지.

### 2026-07-28 22:16 · W9 current-source locator refresh approved — executor prompt preparation

- 사용자 승인: W9의 pre-existing current-source locator drift는 좁은 locator-refresh로 처리한다. executor는 W2/W3 15 lineage의 `docs/` source raw rows를 전수적으로 current heading/span과 대조하고, drift가 확인된 raw ledger row와 대응 canvas provenance bullet만 함께 갱신한다.
- 승인 write-set: `logs/artifacts/g1-outcome-raw-provenance-ledger.md`의 확인된 W2/W3 locator fields 및 `logs/artifacts/g1-outcome-graph.canvas`의 대응 15 text node provenance bullets. source log, owner document, roadmap/plan, code/test, node resolution/disposition/edge, Work Item/status는 변경 금지. executor 보고 뒤 controller가 필요한 비중복 subagent로 수용 검토한다.

### 2026-07-28 23:10 · W9 locator refresh controller review — three bounded corrections required

- Controller review: current-source locator refresh candidate는 아직 수용하지 않는다. W2 reviewer가 R136 §4.1의 current section L11-151(ledger/canvas L11-150)과 R137 §4.2의 L153-198(ledger/canvas L152-197)을 발견했다. W3 reviewer가 R151의 current heading suffix `(live loaded-thread + queued fallback)` 누락을 발견했다(span L205-235는 유지).
- 이 3건은 user-approved drift refresh 범위 안이므로 executor에게 ledger locator와 같은 raw ID의 canvas provenance bullet만 동기화하는 bounded correction을 요구한다. R129/R130/R133/R138/R139 및 나머지 검사 대상은 independent review에서 current locator와 일치한다. W9은 active, locator-refresh acceptance는 correction 후 재검토한다.

### 2026-07-29 12:53 · W9 accepted — final coverage and decided-gate audit input PASS

- Controller acceptance: bounded correction R136/R137/R151을 수용한다. 두 independent locator reviewers가 source section·ledger·canvas bullet을 직접 대조해 R136=L11-151, R137=L153-198, R151=current suffix+L205-235를 PASS로 확인했고 raw ID/verb는 불변이다. Canvas JSON은 127 nodes/243 edges, ID duplicate·dangling endpoint 0을 유지한다.
- W9 final audit result: PASS. 344 raw row/50 lineage의 exactly-one primary-W, 49 outcome node+`superseded-audit` non-node disposition, node provenance/owner/code-test/deferred coverage, W2/W3 149 raw-ID self-contained provenance와 current `docs/` locator refresh, canvas integrity를 모두 대조했다. untracked artifact의 historical write-set attribution은 제한으로 남지만 current audit result를 뒤집는 unresolved material finding은 없다.
- Handoff: 이 PASS는 G1-A 두 closeout 로그가 별도 final decided gate에서 소비할 audit input일 뿐, 이 audit이 그 status를 자동 전환하지 않는다. W9을 complete로 reconcile한다.
