---
topic: workspace reset stage8 W4 decisions drift 검토
description: workspace reset stage 8 W4 — docs/decisions/ 기존 decision 15개를 one-by-one 검토한다. WHY·skeleton 일괄 재작성은 금지하고, docs 공통 규칙과 decision type 규칙에 따른 보수 업데이트·owner drift만 판정·반영한다.
status: decided
---

## 작업 제약 (`docs/AGENTS.md` + `docs/decisions/AGENTS.md`)

- 기존 decision 문서에 대한 **WHY·skeleton 일괄 retrofit 금지**. 결정 당시 WHY나 섹션 의미를 현재 skeleton에 맞춰 재배치하지 않는다.
- 검토 대상: 상위 `docs/AGENTS.md` 공통 규칙과 `docs/decisions/AGENTS.md` type 규칙에 따른 링크·provenance·표현·형식의 보수 업데이트, stale 링크와 owner drift.
- 판정 결과는 **"변경 없음"**, **"보수 업데이트"**, **"decision-change harness 적용 필요"** 중 하나다. 보수 업데이트는 결정 당시 WHY를 바꾸지 않는 범위만 허용한다.
- decision content(Context/Decision/Rationale/Trade-offs) 자체는 건드리지 않는다.
- 삭제·대체 후보가 나오면 docs/decisions/AGENTS.md §5 decision-change harness 4단계를 먼저 적용한다.

## Work Items

- [x] W1 `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md` — AGENTS 계약 기반 보수 업데이트·owner drift 검토
- [x] W2 `docs/decisions/agent-level-mcp-process-scoping.md` — 동일
- [x] W3 `docs/decisions/claude-channel-plugin-default.md` — 동일
- [x] W4 `docs/decisions/claude-channel-trust-and-registration.md` — 동일
- [x] W5 `docs/decisions/client-orchestrator-runtime-pivot.md` — 동일
- [x] W6 `docs/decisions/codex-app-server-mcp-injection-and-isolation.md` — 동일
- [x] W7 `docs/decisions/codex-d7-authoritative-binding-scope.md` — 동일
- [x] W8 `docs/decisions/codex-per-agent-app-server.md` — 동일
- [x] W9 `docs/decisions/daemon-autostart-and-channel-identity.md` — 동일
- [x] W10 `docs/decisions/documentation-system-location.md` — 동일
- [x] W11 `docs/decisions/pair-attach-atomicity-and-sentinel.md` — 동일
- [x] W12 `docs/decisions/pair-slot-generalization.md` — 동일
- [x] W13 `docs/decisions/proxy-lazy-observation-cost-model.md` — 동일
- [x] W14 `docs/decisions/runtime-profile-namespace-isolation.md` — 동일
- [x] W15 `docs/decisions/uds-transport-and-framing-contract.md` — 동일

## 작업 방식 (one-by-one)

각 파일(D01~D15)을 독립 판정 단위로 다룬다. 결정 당시 WHY와 섹션 의미는 수정하지 않고, 공통·type 규칙에 따른 보수 업데이트와 owner·참조 정합을 확인한다. W12~W15는 링크 target 실재 확인에 그치지 않고, 참조한 section/claim의 본문 내용이 decision의 claim을 실제로 뒷받침하는지까지 확인한다.

### 각 파일 검토 단계

1. **현재 상태 확인**
   - `Related:` 상단 wikilink target 실재 여부
   - 본문 내 wikilink·backtick path의 참조 대상 실재 여부 (파일 이동·rename 여부)
   - decision claim 가까이에 둔 wikilink는 target 문서의 해당 section/본문이 claim의 owner·outcome·근거 역할을 실제로 수행하는지 내용까지 확인
   - `Sources:` 참조 대상(로그 파일, spec, architecture) 실재 여부
   - `scripts/check-markdown-inline-code <파일>` 실행

2. **owner drift 확인**
   - 참조 문서(spec, architecture, plan)가 현재도 같은 역할을 소유하는지 확인
   - claim이 기대하는 역할(WHY provenance, current outcome owner, code/test evidence, roadmap/status owner)과 실제 target 본문 역할이 다르면 owner drift 또는 링크 배치 오류로 판정
   - stage 6~8 작업으로 파일 이동·분할·이름 변경이 있었던 경로 대상 집중 확인
     - `docs/architecture/` ↔ `docs/` 루트 이동 (예: `documentation-system.md`)
     - architecture monolith → index+slice 분할 (`local-agent-runtime.md` → slice 9개)
     - spec monolith → index+slice 분할 (`aiox-a2a.md` → slice 7개)

3. **판정**
   - "변경 없음": 공통·type 규칙 위반, stale 링크와 owner drift 없음
   - "보수 업데이트 필요": WHY를 바꾸지 않는 링크·provenance·표현·형식 보정 또는 owner drift 정정
   - "decision-change harness 적용 필요": decision 내용 자체가 stale하거나 대체 후보가 의심되는 경우 → 먼저 §5 harness 4단계 적용 후 @user 보고

4. **반영 (보수 업데이트만)**
   - stale 링크 경로 → 현재 경로로 보정
   - owner drift → 현재 owner 문서 경로로 보정
   - 결정 당시 WHY와 섹션 의미 수정 불가
   - repo 기준 wikilink·source path 등 상위 공통 규칙은 WHY를 바꾸지 않는 보수 업데이트로 반영

5. **검증**
   - `scripts/check-markdown-inline-code <파일>` → exit 0
   - `git diff --check -- <파일>` → exit 0
   - 수정한 링크 target 실재와 해당 target 본문이 claim을 뒷받침하는지 확인

### decision-change harness (docs/decisions/AGENTS.md §5)

국소 수정 범위를 넘는다고 판단될 때만 적용:

1. **read path / 확인 범위** — 해당 decision을 참조하는 live reference(현재 owner 문서, active plan, README/AGENTS, open log, code 주석)를 확인
2. **변경 유형 분류** — 보수적 업데이트(링크·provenance·표현·형식) vs 새 decision 필요 vs 삭제 후보
3. **삭제 후보 게이트** — WHY 복원 가능 여부 + live reference 정의 점검. live reference = 현재 owner 문서·active plan·README/AGENTS·open log·code 주석 (decided 로그·historical provenance 제외)
4. **불확실 시 비파괴 fallback** — 삭제 대신 `Note:` 보존 또는 @user 보고

### 검토 시 참조 문서

- `docs/decisions/AGENTS.md` §1(작성 원칙) · §2(Lifecycle And Mutability) · §4(Decision Skeleton + 기존 retrofit 금지) · §5(Validation And Cross-Owner Checks + decision-change harness)
- `docs/AGENTS.md` Change And Drift Validation
- stage 6~8 파일 이동 이력: `docs/documentation-system.md` 재배치(architecture→루트), architecture/specs monolith → index+slice 분할

## 2026-06-29 · child log 생성 — W6에서 분리, W1(a2a-message-lifecycle)부터 착수

Parent pointer: `logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md` W4.

W6 child log(`logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md`)에서 decisions drift 검토 작업을 분리해 이 파일을 생성했다.

- 대상: `docs/decisions/` decision 15개(W1~W15). 알파벳 순 나열이며 작업 순서는 W1부터.
- 진행 방식: 각 파일을 5단계(현재 상태 확인 → owner drift 확인 → 판정 → 반영 → 검증) 독립 단위로 처리
- 제약: 일괄 retrofit 금지. stale 링크·owner drift만 검토. 국소 수정 또는 변경 없음 판정만.
- 삭제/대체 후보가 나오면 §5 decision-change harness 4단계 먼저 적용 후 @user 보고.

다음 행동: W1 — `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md` stale 링크·owner drift 검토.

## 2026-06-29 · W1 a2a-message-lifecycle-envelope-and-correlation — 변경 없음

W1을 기존 decision retrofit 금지 제약 아래 stale 링크와 owner drift만 검토했다. Decision 본문과 형식은 수정하지 않았다.

**확인한 사실:**

- 본문의 `[[aiox-message-lifecycle]]` target은 `docs/specs/aiox-message-lifecycle.md` 한 개로 유일하게 실재하고, 해당 문서의 `## 4. A2A protocol과 message lifecycle`이 canonical envelope·routing·delivery correlation outcome을 계속 소유한다.
- `Sources:`의 `aiox-message-lifecycle.md`와 `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`가 모두 실재한다.
- spec slice는 correlated reply authorization을 Open decision으로, public `deliveryId` namespace를 G1 확정 대상으로 유지한다. Decision의 Re-evaluation 두 항목과 의미가 일치한다.
- W8 source log의 checker PASS 블록은 이 decision이 WHY-only 경계를 지키고 위 두 항목을 Open으로 유지한다고 직접 검증한다.
- `scripts/check-markdown-inline-code docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`와 `git diff --check -- <file>`은 모두 exit 0이다. 대상 decision은 검토 전후 working-tree 변경이 없다.

**판정:** 변경 없음. 링크 target, provenance와 outcome owner에 stale/owner drift가 없고, decision 내용 변경 의심도 없어 decision-change harness를 확장 적용할 필요가 없다. Bare wikilink를 repo-path 형식으로 바꾸는 작업은 기존 decision 일괄 retrofit 금지 범위이므로 수행하지 않았다.

다음 행동: W2 — `docs/decisions/agent-level-mcp-process-scoping.md`를 같은 범위로 one-by-one 검토한다.

## 2026-06-29 · W1 판정 정정 — AGENTS 계약에 따른 보수 업데이트 반영

@user가 W4 검토 의도를 정정했다. `docs/AGENTS.md`와 `docs/decisions/AGENTS.md`를 근거로 검토하고 필요한 보수 업데이트를 반영하는 작업이며, 기존 decision retrofit 금지는 WHY·skeleton의 일괄 재작성 금지이지 링크·provenance·표현·형식 보수 금지가 아니다.

**이전 판정 정정:**

- 직전 W1 블록의 "Bare wikilink repo-path 변환은 금지" 해석은 과도했다.
- `docs/decisions/AGENTS.md` §4는 기존 WHY·섹션 의미의 skeleton 재배치를 금지하지만, §2·§5는 WHY를 바꾸지 않는 링크·provenance·표현·형식 수정을 보수 업데이트로 허용한다.
- 상위 `docs/AGENTS.md`는 문서 참조를 repo 기준 경로로 작성하도록 요구한다.

**반영:**

- `[[aiox-message-lifecycle]]` → `[[docs/specs/aiox-message-lifecycle]]`
- Sources의 `aiox-message-lifecycle.md` → `docs/specs/aiox-message-lifecycle.md`
- Decision의 WHY, 섹션 구조와 source log 참조는 변경하지 않았다.
- W4 상단 작업 제약·검토 단계도 같은 해석으로 정정했다. 이후 W2~W15는 공통·type 규칙에 따른 보수 업데이트까지 검토한다.

**최종 판정:** W1 보수 업데이트 완료. 다음 행동은 W2이며 next pointer 변경은 없다.

## 2026-06-29 · W2 agent-level-mcp-process-scoping — 보수 업데이트 완료

W2를 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토했다. 결정 당시 WHY와
섹션 의미는 수정하지 않았다.

**확인한 사실:**

- `docs/architecture/local-runtime-claude-adapter.md` §6은 현재 Claude plugin/inline MCP launch와
  per-process token·socket 환경 주입을 소유한다.
- `docs/architecture/local-runtime-codex-adapter.md` §7, 특히 §7.8은 현재 Codex app-server의
  `mcp_servers.aiox` 주입과 agent-scoped token·socket 경계를 소유한다.
- `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`는 이 decision의 일반 per-process
  scoping을 Codex remote-mode MCP host 선택과 background-host isolation으로 refinement한다.
- 세 target은 모두 실재하며 owner 역할도 유지된다. Decision의 선택이나 rationale이 stale하다는
  근거는 확인되지 않았다.

**판정과 반영:** 보수 업데이트. `Sources`의 bare wikilink 두 개를 repo 기준 architecture slice
경로로 바꾸고, backtick으로 적힌 refinement decision 경로를 repo 기준 wikilink로 바꿨다. 이는
링크 형식만 정합화하는 local-only 변경이며 WHY·section composition·owner 의미는 바꾸지 않는다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/agent-level-mcp-process-scoping.md` → exit 0.
- `git diff --check -- docs/decisions/agent-level-mcp-process-scoping.md` → exit 0.
- 수정한 wikilink target 3개는 disk 실재를 확인했다.

다음 행동: W3 — `docs/decisions/claude-channel-plugin-default.md`를 같은 범위로 one-by-one 검토한다.

## 2026-06-29 · W3 claude-channel-plugin-default — 검토 완료, 보수 업데이트 승인 대기

W3를 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토했다. @user의
요청은 검토이므로 owner 문서는 수정하지 않았다.

**확인한 사실:**

- `docs/architecture/local-runtime-claude-adapter.md` §6.1–6.2가 plugin 기본값, inline dev/debug
  opt-out, no auto-fallback, preflight와 cwd 고정 결과를 계속 소유한다.
- `src/cli/invocation.ts:161-164,219-249,487-499`는 plugin 기본값, D preflight, plugin launch cwd
  고정, inline 명시 opt-out을 현재도 구현한다.
- `src/adapters/claude/preflight.ts:168-207`은 cwd-resolved `enabled`를 신뢰하고
  `ambiguous_install_path`를 차단한다. `src/adapters/claude/plugin-cli.ts:63-103,181-249`는
  같은 cwd로 inventory를 읽고 필수 schema를 parsing한다.
- `logs/2026-06-20-mvp-plan-carryover-archive.md` R3 provenance와 architecture target이 모두 실재한다.
- 관련 테스트 명령은 `pnpm test --` 뒤에 `tests/unit/cli/invocation.test.ts`,
  `tests/unit/adapters/claude-preflight.test.ts`, `tests/unit/adapters/claude-plugin-cli.test.ts`를 붙여
  실행했으며, repo 전체 52 files / 483 tests를 실행했고 전부 PASS했다.
- 대상 문서의 inline-code check와 diff check는 모두 exit 0이며, 검토 전후 owner 문서
  working-tree 변경은 없다.

**판단:** decision의 선택, WHY, trade-off와 re-evaluation은 현행 owner·code·tests와
일치한다. owner drift나 새 decision 필요는 없다. 다만 상위 공통 계약에 따른
local-only 보수 업데이트가 필요하다.

**수정 후보(미반영):**

- `[[local-runtime-claude-adapter]]` → `[[docs/architecture/local-runtime-claude-adapter]]`.
- Current implementation evidence인 `src/cli/invocation.ts`, `src/adapters/claude/preflight.ts`,
  `src/adapters/claude/plugin-cli.ts`를 repo-path wikilink + exact range 형식으로 바꾼다.
- `preflight.ts:11-62`는 schema 주석·type에 대한 근거로는 유효하지만
  cwd-resolved `enabled`와 ambiguity guard 구현 근거는 `:168-207`로 분리해 mapping한다.

W3 Work Item과 next pointer는 유지한다. 다음 행동은 @user가 보수 업데이트를 승인하면
위 3건만 반영·검증하고 W3를 완료한 뒤 W4로 전환하는 것이다.

## 2026-06-29 · W3 claude-channel-plugin-default — 보수 업데이트 반영 완료

@user 승인으로 직전 검토의 local-only 수정 후보를
`docs/decisions/claude-channel-plugin-default.md`에 반영했다.

**반영:**

- architecture outcome link를 `[[docs/architecture/local-runtime-claude-adapter]]`로 보정했다.
- `src/cli/invocation.ts`, `src/adapters/claude/preflight.ts`,
  `src/adapters/claude/plugin-cli.ts` current implementation evidence를 repo-path wikilink와 exact range로
  정합했다.
- preflight schema/type 근거(`:11-62`)와 cwd-resolved enabled·ambiguity guard 구현 근거
  (`:168-207`)를 분리해 claim↔evidence mapping을 복원했다.
- Decision의 선택, WHY, trade-off, re-evaluation과 섹션 구조는 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/claude-channel-plugin-default.md` → exit 0.
- `git diff --check -- docs/decisions/claude-channel-plugin-default.md` → exit 0.
- 수정한 wikilink·source target 5개의 disk 실재 확인 → PASS.
- 반영 전 review에서 관련 테스트 실행 결과 52 files / 483 tests PASS.

**판단:** W3 보수 업데이트와 검증이 완료됐고 남은 작업이 없다. W3를
완료하고 next pointer를 W4 `docs/decisions/claude-channel-trust-and-registration.md`로
전환했다.

## 2026-06-29 · W4 claude-channel-trust-and-registration — 검토 완료, 보수 업데이트 승인 대기

W4를 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토했다. @user의
요청은 검토이므로 owner 문서는 수정하지 않았다.

**확인한 사실:**

- decision의 핵심 선택인 inverted process tree + single-use attach-token registration은 현행
  architecture와 code에 유지된다. `src/daemon/state.ts:610-617`이 Claude attach token을 만들고,
  `:926-953`이 agent별 pending token·loopback endpoint를 검사한 뒤 token을 삭제하고 runtime을
  등록한다.
- `docs/architecture/local-runtime-claude-adapter.md` §6.1–6.4가 현재 registration·loopback
  `/send` ingress owner 역할을 유지한다.
- spec split 뒤 delivery/ack contract의 직접 owner는
  `docs/specs/aiox-message-lifecycle.md` §4.3이고, Claude의 push-auth gap과 Tier 3 preview는
  `docs/specs/aiox-adapter-model.md` §5 Claude row가 소유한다. 기존 `docs/specs/aiox-a2a.md`
  §4.3·§5는 현재 이 slice들로 보내는 compatibility stub이다.
- Trade-offs의 "on-demand connect timeouts to clean up the registration state"는 현행 code와
  일치하지 않는다. `src/adapters/claude/injector.ts:21-77`은 timeout/connection failure를 typed
  failure로 반환할 뿐 registry를 삭제하지 않고, `src/daemon/state.ts:1346-1393`도 delivery
  failed/deferred로 변환할 뿐이다. Registry 삭제는 explicit
  `disconnectClaudeChannel`(`src/daemon/state.ts:956-971`)이나 daemon restart로 일어난다. 정상 CLI
  exit 경로는 `src/cli/invocation.ts:256-258`에서 explicit disconnect를 호출한다.
- 관련 테스트 실행은 `pnpm test --` 뒤에 `tests/unit/adapters/claude-channel.test.ts`,
  `tests/unit/adapters/claude-injector.test.ts`를 붙여 실행했으며, repo 전체 52 files / 483 tests를
  실행했고 전부 PASS했다. 대상 문서 inline-code check와 diff check도 exit 0이며 검토 전후 owner 문서 변경은 없다.

**판단:** decision의 선택·핵심 WHY·재검토 조건을 대체할 근거는 없어 새 decision은 필요하지 않다.
다만 spec owner split, repo-path link 계약과 사실과 다른 cleanup 표현 때문에 local-only 보수
업데이트가 필요하다. Cleanup 문장은 stale-registry라는 기존 trade-off를 유지하면서 현재 동작만
정확히 고치는 표현 보정이므로 decision-change harness의 "보수 업데이트" 범위다.

**수정 후보(미반영):**

- Rationale와 Trade-offs의 `docs/specs/aiox-a2a.md` §4.3·§5 참조를 각각
  `[[docs/specs/aiox-message-lifecycle]]` §4.3과 `[[docs/specs/aiox-adapter-model]]` §5 Claude row로
  보정한다.
- Sources의 같은 spec 참조도 두 slice owner로 보정하고,
  `src/daemon/state.ts:926-953` current implementation evidence를 repo-path wikilink + exact range
  형식으로 바꾼다.
- `[[local-runtime-claude-adapter]]`를
  `[[docs/architecture/local-runtime-claude-adapter]]`로 보정한다.
- cleanup trade-off를 "sudden closure may leave a stale registry entry; timeout/connection failure
  surfaces delivery failure but does not remove the entry, so cleanup currently requires explicit
  disconnect or daemon restart" 의미로 정정한다.

W4 Work Item과 next pointer는 유지한다. 다음 행동은 @user가 보수 업데이트를 승인하면 위
항목만 반영·검증하고 W4를 완료한 뒤 W5로 전환하는 것이다.

## 2026-06-29 · W4 claude-channel-trust-and-registration — 보수 업데이트 반영 완료

@user 승인으로 직전 검토의 local-only 수정 후보를
`docs/decisions/claude-channel-trust-and-registration.md`에 반영했다.

**반영:**

- delivery/ack contract 참조를 `[[docs/specs/aiox-message-lifecycle]]` §4.3으로, Claude
  ingress/push-auth gap 참조를 `[[docs/specs/aiox-adapter-model]]` §5 Claude row로 보정했다.
- architecture authority를 repo-path
  `[[docs/architecture/local-runtime-claude-adapter]]` §6.1–6.4로 보정했다.
- `registerClaudeChannel` current implementation evidence를 `[[src/daemon/state.ts]]` wikilink +
  `src/daemon/state.ts:926-953` exact range 형식으로 정합했다.
- cleanup trade-off를 현행 동작에 맞게 정정했다. Sudden closure는 stale registry entry를 남길 수
  있고 delivery timeout/connection failure는 entry를 삭제하지 않으며, 현재 cleanup은 explicit
  disconnect 또는 daemon restart가 수행한다.
- Decision의 선택, 핵심 WHY, alternatives와 re-evaluation은 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/claude-channel-trust-and-registration.md` → exit 0.
- `git diff --check -- docs/decisions/claude-channel-trust-and-registration.md` → exit 0.
- 수정한 wikilink target 4개 disk 실재 확인 → PASS.
- 반영 전 검토에서 관련 테스트 실행 결과 52 files / 483 tests PASS.

**판단:** W4 보수 업데이트와 검증이 완료됐고 남은 작업이 없다. W4를 완료하고 next pointer를
W5 `docs/decisions/client-orchestrator-runtime-pivot.md`로 전환했다.

## 2026-06-29 · W5 client-orchestrator-runtime-pivot — 검토 완료, 본문 경계 판단 대기

W5를 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토했다. @user의
요청은 검토이므로 대상 decision 본문은 수정하지 않았다.

**확인한 사실:**

- `legacy/bridge-relay-v1/bridge/README.md`, `docs/architecture/local-agent-runtime.md`,
  `src/core/deliveries.ts`는 모두 실재한다. Architecture 파일은 split 후 compatibility
  index/navigation hub로 남아 process topology·adapter·routing slice를 연결하므로 전체 runtime
  outcome의 entry owner 역할을 유지한다.
- `MessageDeliveryStatus`는 현재도 `queued | delivering | delivered | completed | failed`다
  (`src/core/deliveries.ts:3-11`). `expired`는 delivery status code에 없다.
- 현재 `createClientRuntime`은 pre-existing daemon socket에 연결하는 pure socket client이다
  (`src/bin/aiox.ts:69-90`). Codex app-server·proxy는 daemon-owned이고
  (`docs/architecture/local-runtime-process-topology.md:22-48,64-66`,
  `docs/architecture/local-runtime-codex-adapter.md:22-31`), Claude channel-server는 Claude-owned child이며
  daemon은 memory registry만 유지한다
  (`docs/architecture/local-runtime-claude-adapter.md:19-36`).
- 따라서 Decision의 “dedicated client runtime containing custom transcript injection adapters”는
  현재 owner/process 경계를 정확히 표현하지 않는다. 반면 stateless MCP router만으로는
  push/injection 목표를 충족하지 못해 background orchestrator·adapter 구조로 pivot했다는
  핵심 선택과 WHY는 현재 architecture와 충돌하지 않는다.
- `expired` delivery transition은 현재 code에 없고, durable owner 검색에서도 delivery
  status target으로는 확인되지 않았다. `docs/specs/aiox-message-lifecycle.md:211`의
  `expired`는 conversation state 값이어서 별개다.

**판단:** `decision-change harness 적용 필요`. 핵심 pivot WHY를 대체할 새 decision
근거는 없지만, process ownership 불일치와 owner 없는 `expired` target 표현은 Decision/Rationale
본문이라 W4의 local-only 링크 보정으로 자동 수정하지 않는다. 기존 snapshot으로
유지할지, WHY를 바꾸지 않는 표현 보수로 경계만 정정할지 @user 판단이 필요하다.

**승인 후 가능한 최소 보수 후보:**

- Decision의 pivot 선택·WHY는 유지하고, adapter를 client runtime이 소유한다는 표현만
  현재 owner 경계와 충돌하지 않게 축약한다.
- `expired`를 현재 post-MVP commitment로 읽히지 않게 decision-time extension possibility로
  제한하거나, 현 owner가 없는 target 서술이면 제거한다.
- Outcome 참조 `docs/architecture/local-agent-runtime.md`는 본문 첫 meaningful mention의
  `[[docs/architecture/local-agent-runtime]]`로 보정하고, current delivery union은
  `[[src/core/deliveries.ts]]` + exact range로 Rationale claim 가까이 옮긴다. Legacy README는
  provenance이므로 `Sources:`의 backtick path를 유지한다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/client-orchestrator-runtime-pivot.md` → exit 0.
- `git diff --check -- docs/decisions/client-orchestrator-runtime-pivot.md` → exit 0.
- 순수 단위 테스트: deliveries + Codex/Claude injector 3 files, 17 tests PASS.
- daemon/client split integration test는 9개 중 6개가 sandbox의 Unix socket `listen EPERM`으로
  실패했고 3개는 PASS. 실패 6개는 모두 test daemon socket listen 단계에서 같은
  환경 오류로 중단돼 product behavior fail로 판정하지 않았다.

W5 Work Item과 next pointer는 유지한다. 다음 행동은 @user가 snapshot 유지 또는 최소
표현 보수 방향을 결정하면, 승인 범위만 반영·검증하고 W5를 완료한 뒤 W6로
전환하는 것이다.

## 2026-06-29 · W5 follow-up — `expired` delivery status 계보 조사

@user 요청으로 `logs/` 하위의 `expired` delivery status 경위를 조사하고, 로그가
가리키는 삭제 전 `history/13-aiox-rewrite-decision.history.md` 원문을 Git object에서
교차확인했다. 대상 decision 본문은 수정하지 않았다.

**로그에서 확인한 계보:**

- `logs/2026-06-19-workspace-reset-W5-history-migration.md:432`는 `history/13` → 당시
  `rewrite-go-to-typescript.md`의 흡수 누락 항목으로 orchestrator·1:N·message lifecycle을
  명시했다.
- 같은 로그 `:460`에서 additive 보강이 “structured message lifecycles”를 decision에
  추가했고, `:515`의 후속 감사가 기존 “message states”를 현 code의
  `MessageDeliveryStatus` 5종으로 정정하면서 “`expired`는 post-MVP 정확(코드에 없음)”으로
  판정했다. `:542`는 이 문구가 반영됐음을 기록한다.
- 현재 문구는 이 2026-06-19 assimilation에서 추가됐고, commit `ab3746fa`가
  최초 소유한다. 그 이전 decision에는 lifecycle/`expired` 문구가 없었다.

**삭제 전 원문 교차확인:**

- Git object `0ac527b^:history/13-aiox-rewrite-decision.history.md:394-412`는 “timeout 대신
  message lifecycle”을 선택한 이유를 소유한다. Legacy synchronous timeout은 긴 작업에
  부적합하므로 timeout을 실패 판정의 중심에 두지 않고, `queued`, `delivered`,
  `started`, `waiting`, `completed`, `failed`, `cancelled`, `expired`, `stale`를 포함한
  광의의 message lifecycle을 검토한다.
- 원문은 `expired`를 **post-MVP로 명시하지 않는다**. `:427-451`은 MVP에
  in-memory message lifecycle을 포함하고 완전한 resume-safe workflow를 미룬다고 쓰지만,
  어느 status가 MVP/post-MVP인지는 분류하지 않는다.
- 원문의 상태 목록은 message/task progression을 섞은 광의 lifecycle이고, 현재
  `MessageDeliveryStatus` 5종과 같은 단위가 아니다. 따라서 “post-MVP `expired`
  delivery transition”은 원문을 그대로 이관한 사실이 아니라 2026-06-19 assimilation
  과정의 해석이다.

**정정된 판단:**

- 직전 블록의 “owner 없는 target”만으로는 설명이 부족했다. `expired`는 근거 없이
  새로 만든 값이 아니라, 초기 rewrite 기록의 광의 lifecycle 후보에서 유래했다.
- 다만 현 decision은 광의 message lifecycle을 현 delivery status로 좁히고, 원문에 없던
  post-MVP 분류까지 합성했다. Code 부재는 “미구현”만 입증하며 “post-MVP target”을
  입증하지 않는다.
- 따라서 보수 시 보존해야 할 load-bearing WHY는 “긴 작업의 성공/실패를
  synchronous timeout으로만 판정하지 않고 명시적 lifecycle을 둔다”이다. Exact
  `expired` delivery target은 제거해도 원래 WHY가 손실되지 않는다.

W5 Work Item과 next pointer는 계속 유지한다. 다음 행동은 이 계보를 기준으로 process
ownership 표현과 lifecycle rationale의 최소 보수 범위를 @user가 승인하면 반영·검증하는
것이다.

## 2026-06-29 · W5 client-orchestrator-runtime-pivot — 최소 보수 반영 완료

@user 승인으로 직전 검토와 `expired` 계보 조사에서 확정한 최소 보수를
`docs/decisions/client-orchestrator-runtime-pivot.md`에 반영했다.

**반영:**

- Decision의 “client runtime containing adapters” 표현을 background daemon architecture + client
  launch/runtime surfaces + agent-specific transcript injection adapters로 바꿔 현 process ownership과의
  충돌을 제거했다. 현 ownership 상세는 본문에서
  `[[docs/architecture/local-agent-runtime]]`로 위임했다.
- Structured lifecycle rationale은 삭제 전 `history/13`의 load-bearing WHY인 “long-running
  work의 실패 판정을 synchronous timeout에 의존하지 않고 explicit asynchronous
  lifecycle을 둔다”로 복원했다.
- 원문에 없던 post-MVP 분류와 현 delivery-state 단위를 합성한 `expired` target
  문구를 제거했다. 현 delivery-state outcome은
  `[[docs/architecture/local-runtime-routing-and-delivery]]` §8.1·§8.4로 위임했다.
- `Sources:`는 provenance owner인 legacy README만 남겼다. Current architecture·code는
  provenance가 아니므로 body outcome link로 이동하거나, owner에서 복원되는 세부 status
  list는 decision에서 제거했다.
- 핵심 pivot 선택, stateless MCP-only 대안을 배제한 WHY, trade-off와 re-evaluation
  조건은 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/client-orchestrator-runtime-pivot.md` → exit 0.
- `git diff --check -- docs/decisions/client-orchestrator-runtime-pivot.md` → exit 0.
- 추가한 repo-path wikilink target 2개 disk 실재 확인 → PASS.
- 변경은 decision Markdown과 작업 로그에만 한정됐고 code/test는 변경하지 않았다.

**판단:** W5의 검토, 승인된 보수 반영과 검증이 완료됐다. W5를 완료하고
next pointer를 W6 `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`로 전환했다.

## 2026-06-29 · W6 codex-app-server-mcp-injection-and-isolation — 보수 업데이트 완료

W6을 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토하고 보수 업데이트를 반영했다. 결정 당시 WHY와 섹션 의미는 수정하지 않았다.

**확인한 사실:**

- `docs/architecture/local-runtime-codex-adapter.md` §7.2가 app-server에 `-c mcp_servers.aiox=...` 주입, TUI에는 `--remote <proxy-url>`만 전달하는 현재 attach flow를 소유한다.
- §7.8이 "Injected into the daemon-owned app-server, not into the foreground TUI" + token handshake 전체를 소유한다. Decision이 Sources에서 묘사한 outcome과 일치한다.
- `docs/decisions/agent-level-mcp-process-scoping.md` 실재 및 역할(per-process scoping global policy) 유지 확인.
- Decision의 선택·WHY·trade-off·re-evaluation은 현재 architecture와 충돌하지 않는다.

**반영:**

- `[[local-runtime-codex-adapter]]` → `[[docs/architecture/local-runtime-codex-adapter]]` — repo-path 누락 보정.
- `docs/decisions/agent-level-mcp-process-scoping.md` backtick path → `[[docs/decisions/agent-level-mcp-process-scoping]]` wikilink — log/provenance가 아닌 live decision 문서이므로 wikilink 형식으로 보정.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/codex-app-server-mcp-injection-and-isolation.md` → exit 0.
- `git diff --check -- docs/decisions/codex-app-server-mcp-injection-and-isolation.md` → exit 0.
- 수정한 wikilink target 2개 disk 실재 확인 → PASS.

**판단:** W6 보수 업데이트와 검증이 완료됐다. W6를 완료하고 next pointer를 W7 `docs/decisions/codex-d7-authoritative-binding-scope.md`로 전환했다.

## 2026-06-29 · W7 codex-d7-authoritative-binding-scope — 검토 완료, 보수 업데이트 승인 대기

W7을 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토했다. 대상 decision 본문은 수정하지 않았다.

**확인한 사실:**

- 핵심 D7 rule인 "notification-only observation은 binding authority가 아니며, 같은 operation의 request/response attribution이 필요하다"는 현 구현과 일치한다. `src/adapters/codex/proxy.ts:46-50,151-194`는 `thread/start|resume|fork` request id를 per-connection Map에 기록하고 같은 id의 성공 response에서 `result.thread.id`를 얻을 때만 binding event를 낸다. Error나 thread id 없는 response는 무시한다.
- `src/daemon/state.ts:1629-1673`은 위 event의 method/threadId/requestId를 사용해 runtime·agent binding을 갱신하고 `source:"proxy_binding"` event를 남긴다. `src/adapters/codex/runtime.ts:281-285`는 notification을 diagnostic context로만 저장한다.
- 현 architecture owner `docs/architecture/local-runtime-codex-adapter.md` §7.4–§7.7도 같은 attribution rule, proxy binding writer와 injection guard를 소유한다. §7.5의 delivery-time `thread/loaded/list` 경로는 새 mutation의 notification-derived id를 선택하지 않고 이미 authoritative한 `runtime.activeThreadId`를 delivery 후 agent cache에 persist하는 경로라 D7 WHY를 대체하지 않는다 (`src/daemon/state.ts:1606-1617,1541-1566`).
- Sources의 세 target은 모두 실재한다. `logs/2026-06-19-mvp-history-archive.md:45-53`은 Step 10 D7 provenance를 보존한다.
- `scripts/check-markdown-inline-code docs/decisions/codex-d7-authoritative-binding-scope.md`와 `git diff --check -- <file>`은 모두 exit 0이며 대상 decision은 검토 전후 working-tree 변경이 없다.

**판단:** `보수 업데이트`. Decision 선택·핵심 WHY·alternatives·re-evaluation은 현 owner/code와 정합하므로 새 decision 또는 내용 변경은 필요하지 않다. 다만 현재 outcome인 architecture와 live sibling decision이 `Sources:`에 섞여 provenance처럼 배치됐고, 두 참조가 repo-path wikilink 계약에도 맞지 않는다. 이는 WHY를 바꾸지 않는 링크·provenance·형식 보수 범위다.

**수정 후보(미반영):**

- Rationale의 "Later proxy work" 첫 meaningful mention에 `[[docs/architecture/local-runtime-codex-adapter]]` §7.4–§7.7을 연결하고 Sources의 architecture 항목을 제거한다.
- Trade-offs의 proxy maintenance-risk claim에 `[[docs/decisions/proxy-lazy-observation-cost-model]]`을 연결하고 Sources의 backtick live-decision 경로를 제거한다.
- `Sources:`에는 실제 provenance인 `logs/2026-06-19-mvp-history-archive.md:45-53`만 유지한다.

W7 Work Item과 next pointer는 유지한다. 다음 행동은 @user가 위 보수 업데이트를 승인하면 해당 링크 배치만 반영·검증하고 W7을 완료한 뒤 W8로 전환하는 것이다.

## 2026-06-29 · W7 codex-d7-authoritative-binding-scope — 보수 업데이트 반영 완료

@user 승인으로 검토에서 확정한 최소 보수를 `docs/decisions/codex-d7-authoritative-binding-scope.md`에 반영했다.

**반영:**

- Rationale의 later proxy work claim에 current outcome owner `[[docs/architecture/local-runtime-codex-adapter]]` §7.4–§7.7을 연결했다.
- Trade-offs의 transparent proxy maintenance-risk claim에 live rationale owner `[[docs/decisions/proxy-lazy-observation-cost-model]]`을 연결했다.
- 두 live owner 참조를 `Sources:`에서 제거하고, `Sources:`에는 Step 10 D7 provenance인 `logs/2026-06-19-mvp-history-archive.md:45-53`만 유지했다.
- Decision의 선택, 핵심 WHY, alternatives와 re-evaluation은 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/codex-d7-authoritative-binding-scope.md` → exit 0.
- `git diff --check -- docs/decisions/codex-d7-authoritative-binding-scope.md` → exit 0.
- 추가한 repo-path wikilink target 2개 disk 실재 확인 → PASS.
- 문서-only 변경이므로 code/test는 실행하지 않았다.

**판단:** W7의 검토, 승인된 보수 반영과 검증이 완료됐다. W7을 완료하고 next pointer를 W8 `docs/decisions/codex-per-agent-app-server.md`로 전환했다.

## 2026-06-29 · W8 codex-per-agent-app-server — 보수 업데이트 완료

W8을 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토하고 보수 업데이트를 반영했다. 결정 당시 WHY와 섹션 의미는 수정하지 않았다.

**확인한 사실:**

- 모든 참조 architecture slice(`local-runtime-codex-adapter.md`, `local-runtime-process-topology.md`)가 실재하며 owner 역할을 유지한다. Sources의 log provenance 3건도 모두 실재한다.
- Decision의 핵심 선택(1:1 per-agent, OS-assigned port, daemon lifecycle ownership, explicit resume only)과 WHY는 현 architecture owner와 충돌하지 않는다.

**반영:**

- Rationale §2의 `[[local-runtime-codex-adapter]]` → `[[docs/architecture/local-runtime-codex-adapter]]` — repo-path 누락 보정.
- Rationale §5의 `[[local-runtime-process-topology]]` → `[[docs/architecture/local-runtime-process-topology]]` — repo-path 누락 보정.
- Sources에서 live architecture 문서(`local-runtime-codex-adapter.md` §7.2·§7.6·§7.9, `local-runtime-process-topology.md` §1) 제거. 이 두 owner는 이미 Rationale 본문 body link로 연결돼 있으며 `docs/AGENTS.md` Sources 규칙("logs, 이전 owner 문서처럼 provenance가 중요할 때만")에 따라 Sources 대상이 아니다. provenance인 log 3건만 유지했다.
- Decision의 선택, WHY, alternatives, trade-off, re-evaluation은 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/codex-per-agent-app-server.md` → exit 0.
- `git diff --check -- docs/decisions/codex-per-agent-app-server.md` → exit 0.
- 수정한 repo-path wikilink target 2개 disk 실재 확인 → PASS.
- 문서-only 변경이므로 code/test는 실행하지 않았다.

**판단:** W8의 검토, 승인된 보수 반영과 검증이 완료됐다. W8을 완료하고 next pointer를 W9 `docs/decisions/daemon-autostart-and-channel-identity.md`로 전환했다.

## 2026-06-29 · W9 daemon-autostart-and-channel-identity — 보수 업데이트 완료

W9를 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토하고 보수 업데이트를 반영했다. 결정 당시 WHY와 섹션 의미는 수정하지 않았다.

**코드 상황 확인:**

- A(inline/legacy) 경로와 D(plugin/default) 경로가 서로 다른 static name을 사용한다.
  - D 경로: `CLAUDE_CHANNEL_PLUGIN_NAME = "aiox-channel-ingress"` (`invocation.ts:35`) — Claude marketplace plugin 등록명. `plugin:aiox-channel-ingress@aiox`로 활성화. R3 작업에서 plugin 디렉터리 구조(`spikes/aiox-channel-marketplace/plugins/aiox-channel-ingress/`)에서 유래.
  - A 경로: `channelName = "aiox-claude-ingress"` (`invocation.ts:213`) — 일회성 `--mcp-config` 주입 MCP server key. Step 14 smoke test fix에서 확정.
- `docs/architecture/local-runtime-claude-adapter.md` §6.1–6.2가 두 경로와 두 이름을 정확하게 소유한다.
- R3 history(`history/49~56`)는 W7 assimilation에서 전부 삭제됐다. `aiox-channel-ingress` 이름 선택 WHY를 설명하는 생존 로그는 없다. 이름 자체가 plugin 디렉터리 구조에서 유래한 구조적 사실이며 decision-worthy하지 않다.
- Rationale의 `(current as-built)` Scope note가 "`aiox-claude-ingress` is also the plugin name (`CLAUDE_CHANNEL_PLUGIN_NAME`, `invocation.ts:35`)"라고 주장했으나 사실 오류였다.
- 코드 자체는 정상. 두 이름은 서로 다른 기술 계층(marketplace plugin 등록 vs inline MCP key)이며 충돌하지 않는다.
- Codex에 검토를 요청했고 보수 업데이트 방향과 판단이 일치했다.

**반영:**

- Rationale의 `[[local-runtime-daemon-transport-api]]`·`[[local-runtime-cli-and-operator-surfaces]]`를 repo-path wikilink로 보정했다.
- Rationale의 Static Ingress Key WHY 단락에서 `(current as-built)` Scope note 전체를 제거하고, architecture 위임 한 줄로 대체했다: "Current activation names differ by strategy and are owned by `[[docs/architecture/local-runtime-claude-adapter]]` §6.1–§6.2. This decision owns only the WHY for avoiding per-command dynamic MCP keys."
- Sources 2번째 bullet에서 `:35 (CLAUDE_CHANNEL_PLUGIN_NAME)` 묶음을 제거했다 — `invocation.ts:35`는 `aiox-channel-ingress`(D 경로)이므로 A 경로 identity claim인 `aiox-claude-ingress`와 묶으면 사실 오류.
- Sources 3번째 bullet(`local-runtime-daemon-transport-api.md`·`local-runtime-cli-and-operator-surfaces.md` architecture authority 참조) 전체 제거 — live owner 문서로 Rationale body에 이미 있음.
- Decision의 WHY, 선택, alternatives, trade-off, re-evaluation은 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/daemon-autostart-and-channel-identity.md` → exit 0.
- `git diff --check -- docs/decisions/daemon-autostart-and-channel-identity.md` → exit 0.
- 수정한 wikilink target 3개 disk 실재 확인 → PASS.
- 문서-only 변경이므로 code/test는 실행하지 않았다.

**판단:** W9의 검토, 코드 상황 확인, 승인된 보수 반영과 검증이 완료됐다. W9를 완료하고 next pointer를 W10 `docs/decisions/documentation-system-location.md`로 전환했다.

## 2026-06-29 · W9 follow-up — Sources 정정과 추론 재확인

@user 요청으로 Claude가 반영한 W9 변경을 Codex가 재검토했고, 남은 `Sources` 문구 오류 1건을 정정했다.

**확인한 사실:**

- `src/cli/invocation.ts:148-152`는 `daemon-status`가 `runtime.daemonStatus()`를 호출하는 경로다. 기존 Sources 문구처럼 `daemon-status`까지 `getDaemonApi()` 호출로 묶으면 사실 오류다.
- `src/cli/invocation.ts:262-289`의 `connect`·`disconnect`·`pair-create`·`status`는 `getDaemonApi()`를 호출하지만 `startDaemon()`은 호출하지 않는다.
- `docs/architecture/local-runtime-claude-adapter.md`는 "current/as-built Claude adapter topology, launch, channel registration, ingress and injection flow"를 소유한다고 명시하고, §6.1–§6.2에서 D/plugin `aiox-channel-ingress`와 A/inline `aiox-claude-ingress`를 분리해 설명한다.
- repo 검색 결과 `aiox-channel-ingress`의 생존 참조는 architecture/code/log의 구현·구조 사실로 확인된다. 별도 선택 WHY를 소유하는 live decision/owner 문서는 확인되지 않았다.

**반영:**

- `docs/decisions/daemon-autostart-and-channel-identity.md` Sources 첫 bullet을 정정했다: `daemon-status`는 `runtime.daemonStatus()` only로, 다른 control/status 명령은 `getDaemonApi()` without start로 분리했다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/daemon-autostart-and-channel-identity.md` → exit 0.
- `git diff --check -- docs/decisions/daemon-autostart-and-channel-identity.md` → exit 0.

**판단:** W9의 최종 판정은 계속 `보수 업데이트 완료`다. 두 이름 구조 자체의 기술 문제는 확인되지 않았고, `aiox-channel-ingress` 이름 선택 WHY는 현재 근거상 별도 decision-worthy로 보지 않는다. 다음 pointer는 기존대로 W10 `docs/decisions/documentation-system-location.md`다.

## 2026-06-29 · W9 follow-up — src evidence owner 재정리

@user가 `src/` 하위 source 작성 가이드라인을 확인하라고 요청했다. repo에는 `src/AGENTS.md`가 없으므로 적용 규칙은 root `AGENTS.md`, `docs/AGENTS.md`, `docs/decisions/AGENTS.md`, `logs/AGENTS.md`다.

**확인한 사실:**

- `docs/AGENTS.md`는 code/test 파일을 wikilink하고, 정확한 range는 `file:line` 또는 `file:line-line`으로 쓰라고 한다.
- `docs/AGENTS.md`의 `Sources:` 규칙은 logs, 이전 owner 문서처럼 provenance가 현재 판단·재검토·삭제 안전성에 중요할 때 쓰라고 한다. 경로 자체가 근거인 경우에는 backtick path를 유지한다.
- `docs/decisions/AGENTS.md`는 decision이 WHY만 소유하고, outcome owner는 claim 가까이 본문 링크로 참조하며, `Sources:`는 로그나 이전 문서처럼 provenance가 중요할 때만 쓰라고 한다.
- `logs/AGENTS.md`는 `src/` 하위 코드를 current/as-built의 1차 사실로 보되, WHY는 코드가 아니라 surviving archive, source map, owner 문서에 있다고 규정한다.
- `docs/architecture/local-runtime-cli-and-operator-surfaces.md`는 current CLI/operator surface, invocation switch behavior, daemon auto-start boundary를 소유한다.
- `docs/architecture/local-runtime-daemon-transport-api.md` §4.1은 daemon lifecycle과 auto-start wiring을 소유한다.
- `docs/architecture/local-runtime-claude-adapter.md` §6.1–§6.2는 Claude activation strategy와 A/D 이름 차이를 소유한다.
- `logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md` §2는 Step 14 daemon/client split smoke provenance와 Claude `.mcp.json` mismatch의 root cause/solution direction을 보존한다.

**정정 판단:**

- 직전 follow-up에서 `Sources:` 첫 bullet의 code line 문구를 정정했지만, 더 근본적으로는 current implementation code evidence를 decision `Sources:`에 두는 것 자체가 owner 경계상 최선이 아니다.
- Auto-start current behavior는 CLI/daemon architecture slices가 소유하고, Claude activation 이름의 current/as-built는 Claude adapter slice가 소유한다.
- 이 decision의 `Sources:`는 decision WHY provenance인 Step 14 smoke archive만 남기는 것이 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 규칙에 더 맞다.

**반영:**

- `docs/decisions/daemon-autostart-and-channel-identity.md`의 `Sources:`에서 current code line evidence 2개를 제거했다.
- `Sources:`에는 `logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md` §2만 남겼다.
- Current/as-built auto-start와 Claude activation details는 이미 Rationale body의 `[[docs/architecture/local-runtime-daemon-transport-api]]`, `[[docs/architecture/local-runtime-cli-and-operator-surfaces]]`, `[[docs/architecture/local-runtime-claude-adapter]]` 링크로 위임한다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/daemon-autostart-and-channel-identity.md` → exit 0.
- `git diff --check -- docs/decisions/daemon-autostart-and-channel-identity.md` → exit 0.

**판단:** W9 최종 판정은 계속 `보수 업데이트 완료`다. decision에는 WHY와 provenance만 남기고, current implementation source evidence는 architecture owner 문서로 위임했다. 다음 pointer는 기존대로 W10 `docs/decisions/documentation-system-location.md`다.

## 2026-06-29 · W10 documentation-system-location — 보수 업데이트 완료

W10을 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토하고 보수 업데이트를 반영했다. 결정 당시 WHY와 섹션 의미는 수정하지 않았다.

**확인한 사실:**

- `docs/documentation-system.md`는 현재 실재하며, taxonomy owner-map과 conflict model을 계속 소유한다.
- 옛 경로 `docs/architecture/documentation-system.md`는 현재 실재하지 않는다.
- `docs/AGENTS.md`, `docs/guides/workflow.md`, `docs/specs/AGENTS.md`, `plans/AGENTS.md`, `logs/AGENTS.md`는 현재 `docs/documentation-system.md` 또는 `[[docs/documentation-system]]`를 가리킨다.
- `.agents/skills/document-structure-review/SKILL.md`에는 `docs/architecture/documentation-system` 옛 경로가 더 이상 남아 있지 않다.
- decision의 선택과 rationale은 현재 `docs/documentation-system.md` 위치와 `docs/AGENTS.md` 공통 계약과 충돌하지 않는다.

**반영:**

- Context와 Decision의 live owner 참조를 `[[docs/documentation-system]]`, `[[docs/architecture/AGENTS]]`, `[[docs/AGENTS]]` repo-path wikilink로 보정했다.
- Trade-offs의 active inbound reference 목록을 repo-path wikilink로 보정했다.
- Trade-offs의 `.agents/skills/document-structure-review/SKILL.md` 옛 경로 잔존 문구가 현재 검색 결과와 달라 stale하므로, 비권위 예시 cleanup은 별도 대상이었고 현재 live authority inbound가 아니라는 표현으로 보정했다.
- Decision의 선택, 핵심 WHY, alternatives, re-evaluation과 source log provenance는 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/documentation-system-location.md` → exit 0.
- `git diff --check -- docs/decisions/documentation-system-location.md` → exit 0.
- 추가·수정한 wikilink target 7개 disk 실재 확인 → PASS.
- 관련 내용 확인 → PASS:
  - `docs/documentation-system.md`는 taxonomy owner-map, scoped authority와 conflict model을 소유한다.
  - `docs/architecture/AGENTS.md`는 architecture type 전용 계약을 소유하며 `docs/AGENTS.md` 공통 계약을 상속한다.
  - `docs/AGENTS.md`, `docs/guides/workflow.md`, `docs/specs/AGENTS.md`, `plans/AGENTS.md`, `logs/AGENTS.md`는 `docs/documentation-system.md`를 taxonomy/owner/conflict 기준으로 참조한다.

**판단:** W10의 검토, 보수 반영과 검증이 완료됐다. W10을 완료하고 next pointer를 W11 `docs/decisions/pair-attach-atomicity-and-sentinel.md`로 전환했다.

## 2026-06-29 · W11 pair-attach-atomicity-and-sentinel — 보수 업데이트 완료

W11을 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토하고 보수 업데이트를 반영했다. 결정 당시 WHY와 섹션 의미는 수정하지 않았다.

**확인한 사실:**

- `docs/architecture/local-runtime-routing-and-delivery.md` §8.6은 pair attach X-strict boundary, `agents.attach`의 `pairId` 부재, `pairs.attachAgent` 분리, outer `withTransaction`의 `attachRollbackSentinel` throw 경로를 현재 owner로 소유한다.
- `docs/architecture/local-runtime-store-and-repositories.md` §3은 repository transactional boundary, `pairs.attachAgent` pre-validation, rollback sentinel pattern과 current code evidence range를 소유한다.
- `src/daemon/state.ts:549-604`, `:719-721`, `:1956-1977`에서 daemon-level outer transaction, pair attach failure sentinel throw, outer catch 재분류, Symbol type guard가 확인된다.
- `src/store/repositories/pairs.ts:77-192`에서 `pairs.attachAgent` pre-validation, typed failure return, `pair_id`/`pair_slot` write와 pair status update가 확인된다.
- `tests/unit/daemon/pair-store.test.ts:231-266`은 kind mismatch rollback row-invariance를 검증한다. `tests/unit/daemon/pair-store.test.ts:371-395`는 already-attached typed failure를 검증한다.
- 기존 `Sources:`의 architecture/code/test 항목은 current owner/evidence에 해당하며, `docs/AGENTS.md`와 `docs/decisions/AGENTS.md`의 `Sources:` provenance 규칙에는 맞지 않는다.
- provenance 로그는 실재한다: `logs/2026-06-19-mvp-history-archive.md` §2.1, `logs/2026-06-19-workspace-reset-W5-history-migration.md:448-545`, `logs/2026-06-23-workspace-reset-stage6-physical-deletion-gate.md:651-657`.

**판정과 반영:** 보수 업데이트. Rationale의 pair attach ownership claim에 `[[docs/architecture/local-runtime-routing-and-delivery]]` §8.6을 연결하고, repository/sentinel boundary claim에 `[[docs/architecture/local-runtime-store-and-repositories]]` §3을 연결했다. `Sources:`에서는 current architecture/code/test evidence를 제거하고, decision creation·stale reason-name correction·later drift recheck provenance 로그만 남겼다. Decision의 선택, 핵심 WHY, alternatives, trade-off, re-evaluation은 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/pair-attach-atomicity-and-sentinel.md` → exit 0.
- `git diff --check -- docs/decisions/pair-attach-atomicity-and-sentinel.md` → exit 0.
- 추가한 repo-path wikilink target 2개와 `Sources:` 로그 target 3개 disk 실재 확인 → PASS.
- 문서-only 변경이므로 code/test는 실행하지 않았다.

**판단:** W11의 검토, 보수 반영과 검증이 완료됐다. W11을 완료하고 next pointer를 W12 `docs/decisions/pair-slot-generalization.md`로 전환했다.

## 2026-06-29 · W12 pair-slot-generalization — 보수 업데이트 완료

W12를 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토하고 보수 업데이트를 반영했다. 결정 당시 WHY와 섹션 의미는 수정하지 않았다.

**확인한 사실:**

- `docs/architecture/local-agent-runtime.md` §0은 vendor-agnostic slot a/b, same-vendor 허용, pair cardinality 2를 current module overview로 소유한다.
- `docs/architecture/local-runtime-store-and-repositories.md` §2-§3은 Migration 1, partial unique index, first-open-slot, `pair_slot_occupied`, `isPairReady`, same-vendor pair support를 current owner로 소유한다.
- `docs/architecture/local-runtime-routing-and-delivery.md` §8은 `dispatchToPairPeers`, target-kind branching, deferred delivery normalized reasons와 routing/FSM을 소유한다.
- `docs/architecture/local-runtime-codex-adapter.md` §7.7은 previous `loadedThreadIds.at(-1)` fallback disable, `target_binding_unconfirmed` deferred behavior를 소유한다.
- `src/core/pairs.ts`, `src/store/repositories/pairs.ts`, `src/store/schema.ts`, `src/daemon/state.ts`는 decision의 core/store/routing current claims와 일치한다. 관련 tests도 same-vendor pair ready, migration, route creation 사례를 보유한다.
- 기존 `Sources:`의 code/architecture 항목은 current outcome/evidence에 해당하며, decision `Sources:` provenance 규칙에는 맞지 않았다. Step 15 provenance는 surviving logs에 남아 있다.

**반영:**

- Decision 문장의 outcome claim 가까이에 current owner 링크를 연결했다:
  `[[docs/architecture/local-runtime-store-and-repositories]]` §2-§3,
  `[[docs/architecture/local-runtime-routing-and-delivery]]` §8,
  `[[docs/architecture/local-runtime-codex-adapter]]` §7.7.
- `Sources:`에서 current code evidence와 bare architecture wikilink를 제거했다.
- `Sources:`에는 deleted `history/45`-`history/48` successor/source-map rows, MVP history archive, MVP plan carryover archive provenance만 남겼다.
- Decision의 선택, 핵심 WHY, alternatives, trade-off, re-evaluation은 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/pair-slot-generalization.md` → exit 0.
- `git diff --check -- docs/decisions/pair-slot-generalization.md` → exit 0.
- 추가한 repo-path wikilink target 3개와 `Sources:` 로그 target 3개 disk 실재 확인 → PASS.
- 문서-only 변경이므로 code/test는 실행하지 않았다.

**판단:** W12의 검토, 보수 반영과 검증이 완료됐다. W12를 완료하고 next pointer를 W13 `docs/decisions/proxy-lazy-observation-cost-model.md`로 전환했다.

## 2026-06-29 · W13 proxy-lazy-observation-cost-model — 보수 업데이트 완료

W13을 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토하고 보수 업데이트를 반영했다. 결정 당시 WHY와 섹션 의미는 수정하지 않았다.

**확인한 사실:**

- `docs/architecture/local-runtime-codex-adapter.md` §7.4는 현재/as-built Codex transparent proxy relay, observation rule, lazy parse behavior를 소유한다.
- `src/adapters/codex/proxy.ts`는 client-to-server frame에서 `frameMayContainBindingMethod`의 `indexOf` needle filter를 통과한 binding request 후보만 `JSON.parse`한다.
- server-to-client frame은 `pendingBindings.size === 0`이면 early return하여 parse하지 않고, pending binding이 있을 때 matching response를 parse한다.
- text frame은 `normalizeFrame`을 거쳐 string으로 relay/observation되고, binary frame은 preserve된다. 따라서 기존 decision의 `Forwarding frames raw` 표현은 current/as-built claim으로 읽히면 architecture owner 표현보다 부정확했다.
- `tests/unit/adapters/codex-proxy.test.ts`는 unrelated client frame parse 없음, pending 없는 upstream frame parse 없음, binding request/response parse와 trailing upstream frame parse skip을 검증한다.
- provenance `Sources:`의 `logs/2026-06-23-workspace-reset-codex-proxy-attribution-archive.md`는 실재하며, retained proxy attribution signal mapping과 lazy-observation digest 역할을 유지한다.

**판정과 반영:** 보수 업데이트. Decision 본문에 current proxy behavior owner `[[docs/architecture/local-runtime-codex-adapter]]` §7.4를 연결했다. `Decision`과 `Rationale`에서 relay path가 full `JSON.parse`를 요구하지 않는다는 WHY를 유지하되, client-side `indexOf` candidate gate와 server-side pending-binding gate를 분리해 현행 owner/code와 맞췄다. `Sources:`는 provenance 성격이므로 유지했다. Decision의 선택, alternatives, trade-off와 re-evaluation은 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/proxy-lazy-observation-cost-model.md` → exit 0.
- `git diff --check -- docs/decisions/proxy-lazy-observation-cost-model.md` → exit 0.
- 추가한 repo-path wikilink target `docs/architecture/local-runtime-codex-adapter.md` disk 실재 확인 → PASS.
- 문서-only 변경이므로 code/test는 실행하지 않았다.

**판단:** W13의 검토, 보수 반영과 검증이 완료됐다. W13을 완료하고 next pointer를 W14 `docs/decisions/runtime-profile-namespace-isolation.md`로 전환했다.

## 2026-06-29 · W14 runtime-profile-namespace-isolation — 보수 업데이트 완료

W14를 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토하고 보수 업데이트를 반영했다. 결정 당시 WHY와 섹션 의미는 수정하지 않았다.

**확인한 사실:**

- `docs/specs/aiox-runtime-profile-namespace.md`는 현재 §3.1 runtime config/profile namespace contract와 current implementation caveat를 소유한다. profile/socket은 Current, state DB path는 scaffold + Implementation Gap으로 유지된다.
- `docs/architecture/local-runtime-daemon-transport-api.md`는 daemon socket transport architecture와 socket connect/listen transport swap point를 소유한다.
- `README.md:36-81`, `src/config/paths.ts:5-120`, `src/daemon/socket-transport.ts:281-284`, `src/daemon/socket-transport.ts:429-432`는 모두 실재하고 W14 decision claim과 충돌하지 않는다. 다만 current outcome/code evidence라 decision `Sources:` provenance로 두는 것은 W4의 최근 owner 경계 정리와 맞지 않는다.
- `logs/2026-06-20-mvp-plan-carryover-archive.md` §2는 QA-003 verified summary와 R4 runtime namespace isolation round outcome provenance로 실재한다.

**반영:**

- Rationale의 profile namespace bundle claim 가까이에 current outcome owner `[[docs/specs/aiox-runtime-profile-namespace]]`를 연결했다.
- Rationale의 Unix domain socket 유지와 future transport swap claim 가까이에 `[[docs/architecture/local-runtime-daemon-transport-api]]`를 연결했다.
- `Sources:`에서 README/current code evidence를 제거하고, QA-003/R4 provenance 로그만 남겼다.
- Decision의 선택, 핵심 WHY, alternatives, trade-off, re-evaluation은 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/runtime-profile-namespace-isolation.md` → exit 0.
- `git diff --check -- docs/decisions/runtime-profile-namespace-isolation.md` → exit 0.
- 추가한 repo-path wikilink target 2개와 `Sources:` 로그 target 1개 disk 실재 확인 → PASS.
- 문서-only 변경이므로 code/test는 실행하지 않았다.

**판단:** W14의 검토, 보수 반영과 검증이 완료됐다. W14를 완료하고 next pointer를 W15 `docs/decisions/uds-transport-and-framing-contract.md`로 전환했다.

## 2026-06-29 · W15 uds-transport-and-framing-contract — 검토 완료, 보수 업데이트 승인 대기

W15를 상위 `docs/AGENTS.md`와 `docs/decisions/AGENTS.md` 계약에 따라 검토했다. @user의
요청은 검토 후 보고이므로 owner 문서는 수정하지 않았다.

**확인한 사실:**

- `docs/architecture/local-runtime-daemon-transport-api.md` §4.2는 현재 UDS transport, NDJSON framing,
  request envelope, response envelope, persistent socket/request-id multiplex, 30s request timeout,
  stale-path EADDRINUSE probe/unlink/retry와 transport-vs-daemon API error boundary를 소유한다.
- `docs/architecture/local-runtime-routing-and-delivery.md` §8.3은 router fan-out의 per-target partial
  failure isolation과 production `dispatchToPairPeers` 경로를 소유한다.
- W15 decision의 선택(UDS + NDJSON + lazy persistent multiplex + timeout + stale-socket recovery +
  best-effort fan-out WHY)은 현 architecture owner와 충돌하지 않는다.
- 현재 W15에는 bare wikilink 2개가 남아 있다:
  `[[local-runtime-daemon-transport-api]]`, `[[local-runtime-routing-and-delivery]]`.
- `Sources:`는 현재 architecture owner 문서 2개만 담고 있다. W5/W6 기록상 이 decision은 `history/24`~`26`의
  WHY를 self-contained하게 흡수했고, 삭제 예정 legacy path는 평문화 대상이었다. 현재 `Sources:`의 두 architecture
  문서는 provenance라기보다 current outcome owner다.
- `scripts/check-markdown-inline-code docs/decisions/uds-transport-and-framing-contract.md`와
  `git diff --check -- docs/decisions/uds-transport-and-framing-contract.md`는 모두 exit 0이다.

**판단:** decision의 선택이나 WHY를 대체할 근거는 없다. 새 decision이나 삭제 후보가 아니라 보수 업데이트
범위다. 필요한 보수는 repo-path wikilink 정합과 `Sources:` owner/provenance 경계 정리다.

**수정 후보(미반영):**

- `[[local-runtime-daemon-transport-api]]` → `[[docs/architecture/local-runtime-daemon-transport-api]]`.
- `[[local-runtime-routing-and-delivery]]` → `[[docs/architecture/local-runtime-routing-and-delivery]]`.
- Rationale의 backtick owner references인 `local-runtime-daemon-transport-api.md` 3곳을 claim 가까이의
  repo-path wikilink로 정합한다.
- `Sources:` 섹션은 제거하거나, 비워두지 않고 legacy `history/24`~`26` 흡수 provenance를 설명하는 살아남은
  로그로 교체할지 사용자 판단이 필요하다. 현재 규칙과 W11~W14 선례만 보면 current architecture owner 2개를
  `Sources:`에 두는 것보다 body link로 위임하고 `Sources:`를 제거하는 안이 더 일관된다.

W15 Work Item과 next pointer는 유지한다. 다음 행동은 @user가 보수 업데이트 범위를 승인하면 위 후보만 반영·검증하고
W15를 완료한 뒤 W4 child closeout으로 진행하는 것이다.

## 2026-06-29 · W15 uds-transport-and-framing-contract — 보수 업데이트 반영 완료

@user 승인으로 직전 검토의 local-only 수정 후보를
`docs/decisions/uds-transport-and-framing-contract.md`에 반영했다.

**반영:**

- Rationale의 daemon transport owner 참조를 `[[docs/architecture/local-runtime-daemon-transport-api]]` §4.2로
  정합했다.
- Rationale의 fan-out owner 참조를 `[[docs/architecture/local-runtime-routing-and-delivery]]` §8.3으로
  정합했다.
- current architecture owner 문서만 담고 있던 `Sources:` 섹션을 제거했다. 이 decision의 provenance가 아니라
  current outcome owner이므로 claim 가까이의 body link로 위임하는 편이 `docs/AGENTS.md`와
  `docs/decisions/AGENTS.md` 규칙 및 W11~W14 선례와 일치한다.
- Decision의 선택, WHY, alternatives, trade-off와 re-evaluation은 변경하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/uds-transport-and-framing-contract.md` → exit 0.
- `git diff --check -- docs/decisions/uds-transport-and-framing-contract.md` → exit 0.
- bare wikilink 재검색(`rg --pcre2 -n "\\[\\[(?!docs/|src/|tests/)" docs/decisions/uds-transport-and-framing-contract.md`)
  → exit 1, 매치 없음(PASS).
- 추가한 repo-path wikilink target 2개 disk 실재 확인 → PASS.
- 문서-only 변경이므로 code/test는 실행하지 않았다.

**판단:** W15의 검토, 보수 반영과 검증이 완료됐다. W4 decisions drift의 W1~W15가 모두 완료됐으므로
다음 행동은 W4 child closeout을 작성하고, parent W6 log에서 W4 완료를 소비한 뒤 W6 closeout 여부를 판단하는 것이다.

## 2026-06-29 · W4 closeout — decisions drift one-by-one 완료

### Closeout

- Final result: `docs/decisions/` 기존 decision 15개(W1~W15)를 모두 one-by-one으로 검토했다.
- Scope kept: 상위 `docs/AGENTS.md` 공통 규칙과 `docs/decisions/AGENTS.md` type 규칙에 따른
  링크·provenance·표현·형식 보수 업데이트와 owner drift만 다뤘다.
- Scope excluded: 기존 decision의 WHY·skeleton 일괄 재작성은 하지 않았다. Decision content의
  선택, alternatives, trade-off, re-evaluation 의미를 대체하지 않았다.
- Decision-change harness: 삭제 후보나 새 decision 필요 판정은 나오지 않았다.
- Owner handoff: 필요한 current outcome owner 링크는 각 decision 본문 가까이의 repo-path wikilink로 반영했다.
  current architecture/spec/code evidence를 decision `Sources:` provenance로 두는 패턴은 각 파일별로 정리했다.
- Validation: 각 반영 파일별 `scripts/check-markdown-inline-code`와 `git diff --check -- <file>`를 통과했다.
  W12~W15는 링크 target 존재뿐 아니라 target section/claim이 decision claim을 실제로 뒷받침하는지 확인했다.
- Remaining work in this child: 없음. Work Items W1~W15가 모두 완료됐고 next pointer가 없다.
- Parent pointer consumed by: `logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md` W4.

**판단:** 이 child log의 질문과 작업 수명은 종료됐다. W6 parent가 결과를 소비해야 하므로,
parent W6에서 W4를 완료 처리하고 W6 closeout을 판단한다.
