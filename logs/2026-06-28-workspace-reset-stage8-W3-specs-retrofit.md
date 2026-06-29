---
topic: workspace reset stage8 W3 specs retrofit
description: workspace reset stage 8 W3 — docs/specs/aiox-a2a.md 인덱스 + slice 7개를 승인된 규칙(Related/Status, repo-path wikilink, Evidence 형식, > 컨텍스트: 대체)으로 one-by-one 검토·retrofit. 기존 §N 헤딩·inbound anchor는 migration 아니면 보존. docs/specs/AGENTS.md §3/§4 기준 준수.
status: open
---

## Work Items

- [>] W1 인덱스 — `docs/specs/aiox-a2a.md` : 역할·링크·내용 검토 → 필요 시 Related/Status·repo-path wikilink retrofit
- [ ] W2 `docs/specs/aiox-adapter-model.md` — `> 컨텍스트:` 형식·bare wikilink·evidence 형식 검토·retrofit
- [ ] W3 `docs/specs/aiox-capability-policy.md` — 동일
- [ ] W4 `docs/specs/aiox-compose-contract.md` — 동일
- [ ] W5 `docs/specs/aiox-federation-remote.md` — 동일
- [ ] W6 `docs/specs/aiox-message-lifecycle.md` — 동일
- [ ] W7 `docs/specs/aiox-open-deferred.md` — 동일
- [ ] W8 `docs/specs/aiox-runtime-profile-namespace.md` — 동일

## 작업 방식 (one-by-one)

각 파일(S0~S7)을 독립 판정 단위로 다룬다. 순서는 S0 인덱스 → S1~S7 slice 순이지만, 인덱스 검토 결과가 이후 slice 적용 기준을 바꾸면 재확인한다.

### 각 파일 검토 단계

1. **현재 상태 확인**
   - `> 컨텍스트:` callout 잔존 여부
   - bare wikilink(`[[spec-name]]` 형식) vs repo-path wikilink(`[[docs/specs/...]]`) 현황
   - `Evidence:` 블록 존재 여부 / inline backtick evidence 분산 여부
   - `scripts/check-markdown-inline-code <파일>` 실행

2. **current/as-built claim 검증**
   - `src/`, `tests/` 코드와 대조해 claim의 `Current Contract` vs `Target Contract` 분류
   - stale line range 여부 확인
   - spec drift(`Current Contract`인데 code와 어긋남) vs intent drift(`Target`을 code 한계로 낮추는 시도) 구분

3. **판정**
   - blocking drift 여부 보고
   - W3 retrofit 기준 충족 여부(Related/Status, repo-path wikilink, Evidence 형식)
   - `Related:` 후보 — document-level prerequisite(decorative graph link 금지)
   - `Status:` — slice 전체가 Current Contract/Target Contract 중 어느 상태인지

4. **반영**
   - `> 컨텍스트:` → `Related:` + `Status:` + slice 역할 문장으로 대체
   - bare wikilink → repo-path wikilink 전환
   - stale line range 보정 + compact `Evidence:` 또는 claim-adjacent evidence 추가
   - blocking drift가 있으면 반영 전 @user 보고
   - 기존 §N 헤딩·inbound anchor는 inbound ref를 함께 갱신하는 migration이 아니면 보존

5. **검증**
   - `scripts/check-markdown-inline-code <파일>` → exit 0
   - `git diff --check -- <파일>` → exit 0
   - bare wikilink 재검색: `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" <파일>` → exit 1
   - wikilink target 실재 확인

### 판정 기준 (docs/specs/AGENTS.md 기준)

- `Current Contract`: 현재 code/tests가 제공하는 외부 동작 — code와 어긋나면 stale 판정 대상
- `Target Contract` / `Normative`: 목표·규범 계약 — code가 못 한다는 이유로 current/as-built로 낮추지 않음
- `Implementation Gap`: current implementation이 current/target contract와 어긋나는 지점
- `Deferred`: 보류된 contract

### 검토 시 참조 문서

- `docs/specs/AGENTS.md` §3(aiox-a2a index-slice ownership) · §4(Spec Slice Skeleton) · §5(Drift 처리) · §6(Validation)
- `docs/AGENTS.md` Links And Read Paths · Evidence And Sources · Change And Drift Validation
- `docs/architecture/local-agent-runtime.md` 인덱스 (관련 implementation owner)

## 2026-06-29 · child log 생성 — W6에서 분리, W1(인덱스)부터 착수

Parent pointer: `logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md` W3.

W6 child log(`logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md`)에서 specs retrofit 작업을 분리해 이 파일을 생성했다. 작업 방식은 W2 architecture와 동일하게 one-by-one이다.

- 대상: `docs/specs/aiox-a2a.md` 인덱스(W1) + slice 7개(W2~W8)
- 진행 방식: 각 파일을 5단계(현재 상태 확인 → claim 검증 → 판정 → 반영 → 검증) 독립 단위로 처리
- 판정 기준: `docs/specs/AGENTS.md` §3~§6 + `docs/AGENTS.md` 공통 계약
- 제약: 기존 §N 헤딩·inbound anchor는 migration 아니면 보존

다음 행동: W1 — `docs/specs/aiox-a2a.md` 인덱스의 역할·링크·내용 검토·retrofit 착수.
