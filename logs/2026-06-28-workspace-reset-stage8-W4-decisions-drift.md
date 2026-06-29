---
topic: workspace reset stage8 W4 decisions drift 검토
description: workspace reset stage 8 W4 — docs/decisions/ 기존 decision 15개에 대해 일괄 retrofit 금지. stale 링크·owner drift만 검토해 변경 없음 또는 국소 수정만 판정. docs/decisions/AGENTS.md §4 "기존 문서 retrofit 금지" 준수. decision-change harness(§5) 준수.
status: open
---

## 작업 제약 (docs/decisions/AGENTS.md §4)

- 기존 decision 문서에 대한 **일괄 retrofit 금지**. skeleton·형식을 현재 기준으로 재작성하지 않는다.
- 검토 대상: stale 링크(broken wikilink, 이동된 파일 경로), owner drift(참조 문서의 역할이 바뀐 경우)만.
- 판정 결과는 **"변경 없음"** 또는 **"국소 수정"** 중 하나다. 국소 수정은 stale 링크 보정·owner drift 정정 범위만.
- decision content(Context/Decision/Rationale/Trade-offs) 자체는 건드리지 않는다.
- 삭제·대체 후보가 나오면 docs/decisions/AGENTS.md §5 decision-change harness 4단계를 먼저 적용한다.

## Work Items

- [>] W1 `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md` — stale 링크·owner drift 검토
- [ ] W2 `docs/decisions/agent-level-mcp-process-scoping.md` — 동일
- [ ] W3 `docs/decisions/claude-channel-plugin-default.md` — 동일
- [ ] W4 `docs/decisions/claude-channel-trust-and-registration.md` — 동일
- [ ] W5 `docs/decisions/client-orchestrator-runtime-pivot.md` — 동일
- [ ] W6 `docs/decisions/codex-app-server-mcp-injection-and-isolation.md` — 동일
- [ ] W7 `docs/decisions/codex-d7-authoritative-binding-scope.md` — 동일
- [ ] W8 `docs/decisions/codex-per-agent-app-server.md` — 동일
- [ ] W9 `docs/decisions/daemon-autostart-and-channel-identity.md` — 동일
- [ ] W10 `docs/decisions/documentation-system-location.md` — 동일
- [ ] W11 `docs/decisions/pair-attach-atomicity-and-sentinel.md` — 동일
- [ ] W12 `docs/decisions/pair-slot-generalization.md` — 동일
- [ ] W13 `docs/decisions/proxy-lazy-observation-cost-model.md` — 동일
- [ ] W14 `docs/decisions/runtime-profile-namespace-isolation.md` — 동일
- [ ] W15 `docs/decisions/uds-transport-and-framing-contract.md` — 동일

## 작업 방식 (one-by-one)

각 파일(D01~D15)을 독립 판정 단위로 다룬다. 파일 내용(Context/Decision/Alternatives/Rationale/Trade-offs/Sources)을 수정하지 않고, 링크와 참조 정합만 확인한다.

### 각 파일 검토 단계

1. **현재 상태 확인**
   - `Related:` 상단 wikilink target 실재 여부
   - 본문 내 wikilink·backtick path의 참조 대상 실재 여부 (파일 이동·rename 여부)
   - `Sources:` 참조 대상(로그 파일, spec, architecture) 실재 여부
   - `scripts/check-markdown-inline-code <파일>` 실행

2. **owner drift 확인**
   - 참조 문서(spec, architecture, plan)가 현재도 같은 역할을 소유하는지 확인
   - stage 6~8 작업으로 파일 이동·분할·이름 변경이 있었던 경로 대상 집중 확인
     - `docs/architecture/` ↔ `docs/` 루트 이동 (예: `documentation-system.md`)
     - architecture monolith → index+slice 분할 (`local-agent-runtime.md` → slice 9개)
     - spec monolith → index+slice 분할 (`aiox-a2a.md` → slice 7개)

3. **판정**
   - "변경 없음": 모든 링크·참조 대상 실재, owner drift 없음
   - "국소 수정 필요": stale 링크 경로 보정 또는 owner drift 정정만
   - "decision-change harness 적용 필요": decision 내용 자체가 stale하거나 대체 후보가 의심되는 경우 → 먼저 §5 harness 4단계 적용 후 @user 보고

4. **반영 (국소 수정만)**
   - stale 링크 경로 → 현재 경로로 보정
   - owner drift → 현재 owner 문서 경로로 보정
   - decision content 수정 불가
   - `Related:` 형식은 현재 대로 유지(repo-path wikilink 강제 변환 금지 — 기존 문서 retrofit 금지)

5. **검증**
   - `scripts/check-markdown-inline-code <파일>` → exit 0
   - `git diff --check -- <파일>` → exit 0
   - 수정한 링크 target 실재 확인

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
