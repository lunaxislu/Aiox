# Gemini Task Brief — W7 Batch 1: Foundation & Data 검증

## 맥락

`docs/architecture/local-agent-runtime.md`는 aiox MVP as-built 아키텍처의 권위 문서다.
현재 workspace reset W7 단계에서 이 문서를 현재 구현과 대조해 drift를 수정한다.
이 brief는 §0~§3(Purpose, Process Topology, SQLite Schema, Repositories) 섹션만 담당한다.

작업 결과는 **`logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`의
Evidence Ledger에 row 추가** 형태로 기록하고, drift가 있으면 문서를 직접 수정한다.

---

## 핵심 규칙 (반드시 준수)

1. **현재 아키텍처 증거 = `src/` 코드**
   - `src/` 하위 파일이 현재 구현 사실의 1차 증거다.
   - `docs/aiox/`, `history/`, `plan/mvp-implementation-checklist.md`는
     "왜 이렇게 됐는가" 결정 맥락 확인용이다.
   - 위 맥락 문서의 내용은 `docs/specs/`, `docs/decisions/`, `docs/architecture`로
     이동할 수 있다는 점을 명심한다.

2. **미래 아키텍처와 혼동 금지**
   - `local-agent-runtime.md` 안에 현재 구현과 미래 아키텍처 내용이 섞여 있을 수 있다.
   - `prd/post-mvp/aiox-a2a-spec.md`, `plans/post-mvp/` 하위 문서들, `plans/post-mvp.plan.md`가
     미래 아키텍처의 출처다.
   - 섹션을 검증할 때 해당 내용이 현재 구현(`src/`에서 확인 가능)인지
     미래 계획(post-mvp 출처)인지 먼저 구분한다.

3. **증거를 specs/decisions/로 보내야 할 경우**
   - 작업 중 확인한 증거가 `docs/specs/` 또는 `docs/decisions/`의 owner 문서로
     가야 한다고 판단되면 해당 문서를 생성하거나 수정한다.
   - 작성 시 반드시 해당 폴더의 `AGENTS.md` 지침서를 먼저 읽고 따른다.

4. **drift 판정 원칙** (`docs/architecture/AGENTS.md` §4 준수)
   - 문서 내용과 `src/` 코드가 다르면 drift로 본다.
   - 코드가 사실 owner다. 문서를 코드에 맞춰 수정한다.
   - spec/product/roadmap 의도를 임의로 바꾸지 않는다.

5. **Evidence Ledger row 형식**
   ```
   | Topic | Source | Lines | Finding | Owner impact | Action |
   ```
   - Finding: Fact / Inference / Opinion 구분 명시
   - Action: `변경 없음` / `문서 수정` / `Decision 신규 생성` / `검증 필요`

6. **문서 수정 시** `docs/architecture/AGENTS.md` §1·§2·§3·§5 준수
   - §2: 미래 아키텍처 내용은 삭제하지 않고 `Target`/`Proposed`/`Deferred`로 표기한다
   - §5: Decision 참조 링크는 코드·문서만으로 WHY 복원이 안 될 때만 추가한다.
         Roadmap 참조는 Target 구조가 공개 전 완료 조건과 연결될 때만 추가한다.
   - Spec contract 텍스트를 architecture 문서에 복사하지 않는다.
   - 모든 as-built 주장에 `file:line` 근거를 달아야 한다.

---

## 이미 확인된 Evidence (재조사 불필요)

| Topic | Source | Lines | Finding | Owner impact | Action |
|-------|--------|-------|---------|--------------|--------|
| Codex 1:1 per-agent app-server 구조 | `src/adapters/codex/runtime.ts` | 304–366 | `attachCodexAgentRuntime()`이 에이전트마다 `launchCodexAppServer()` 독립 호출 — 1:1 확인. `local-agent-runtime.md` §1·§7.1 이미 정확 | 변경 없음 | 변경 없음 |
| 예외 명칭 `pair_slot_occupied`/`pair_full` | `src/core/pairs.ts` | 39, 44 | 코드와 `local-agent-runtime.md` §3·§8.6·§10.1 동일 명칭 사용 | 변경 없음 | 변경 없음 |

---

## 검증 대상과 확인할 파일

### §0 Purpose (line 23–44)

**검증 항목:** Purpose 단락이 현재 구현 범위를 정확히 기술하는가.

출발점 파일 (관련 호출·임포트·타입 경로를 따라 추가 탐색 필요):
- `src/` 디렉토리 구조 전체 (구현 범위 파악)
- 특별히 아래 나열되지 않은 컴포넌트가 §0 커버리지 목록에 포함/누락됐는지

**주의:** §0은 서술형이라 코드와 1:1 대조가 어렵다. "현재 구현에 없는 개념이
§0에 기술됐는가"와 "구현됐으나 §0에 빠진 컴포넌트가 있는가"만 확인한다.

---

### §1 Process Topology (line 46–112)

**검증 항목:**
1. 다이어그램에 `plugin:aiox-channel-ingress@aiox` (D strategy)가 현재 기본값으로 표시됐는가
   — **이미 수정 완료된 것으로 보임(line 84–85 확인 필요)**
2. Claude agent 생성 시 channel-server 주입 방식이 다이어그램과 Per-agent counts 단락에서 일치하는가
3. MVP invariant 텍스트(line 103–107)가 현재 코드와 일치하는가

출발점 파일 (관련 호출·임포트·타입 경로를 따라 추가 탐색 필요):
- `src/cli/invocation.ts` (line 161–163, 219, 239–249) — D/A strategy 분기
- `src/adapters/claude/launcher.ts` — channel-server 주입 방식
- `src/adapters/codex/runtime.ts` (line 304–366) — (이미 확인, 재확인 불필요)

---

### §2 SQLite Schema (line 114–136)

**검증 항목:**
1. `new Database(":memory:")` 호출이 `src/daemon/run.ts:25`에 실제로 있는가
2. `openSqliteDatabase`가 `src/store/sqlite.ts:5-12`에 있고 실제로 caller가 없는가
3. `applySchema`가 `src/store/schema.ts:3-68`에 `CREATE TABLE IF NOT EXISTS` 형태인가
4. 테이블 목록(agents, pairs, routes, messages, message_deliveries, events)과
   key columns가 `src/store/schema.ts`의 실제 DDL과 일치하는가
5. `recoverAfterRestart`가 `src/store/repositories/deliveries.ts:148-158`에 있고
   실제로 caller가 없는가

출발점 파일 (관련 호출·임포트·타입 경로를 따라 추가 탐색 필요):
- `src/daemon/run.ts` (line 25 근처)
- `src/store/sqlite.ts` (line 5-12)
- `src/store/schema.ts` (line 3-68)
- `src/store/repositories/deliveries.ts` (line 148-158)

---

### §3 Repositories (line 138–167)

**검증 항목:**
1. `src/store/repositories/` 하위 파일 목록이 문서의 Repo 테이블과 일치하는가
2. 각 Repository의 key methods 목록이 실제 구현과 일치하는가
   - `agents` repo의 `attach`, `findByName`, `markByNameDisconnected` 등
   - `pairs` repo의 `createReservation`, `attachAgent`
   - `deliveries` repo의 `createQueuedForRoutes`, `findByIdempotencyKey` 등
3. `withTransaction` 래퍼가 `src/store/transaction.ts:3-5`에 있는가
4. Rollback sentinel pattern:
   - `attachRollbackSentinel`·`sendMessageRollbackSentinel` Symbol이
     `src/daemon/state.ts:35-36`에 있는가
   - `isAttachRollback` 함수가 동일 파일에 있는가

출발점 파일 (관련 호출·임포트·타입 경로를 따라 추가 탐색 필요):
- `src/store/repositories/` (전체 파일)
- `src/store/transaction.ts` (line 3-5)
- `src/daemon/state.ts` (line 35-36 근처)

---

## 출력 형식

### 1. Evidence Ledger rows (로그 파일에 추가)

검증 항목마다 row 1개. §0~§3 전체 검증이 끝나면
`logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`의
Evidence Ledger 테이블에 추가한다.

Finding 칸에는 반드시 아래 중 하나를 prefix로 쓴다:
- `[Fact]` — 코드에서 직접 확인
- `[Inference]` — 코드 구조에서 추론
- `[Opinion]` — 판단 포함

### 2. 문서 수정

drift가 있는 항목만 `docs/architecture/local-agent-runtime.md`를 직접 수정한다.
수정 이유는 Evidence Ledger의 해당 row Action 칸에 기록한다.

### 3. Decision Candidate 발견 시

"왜 이렇게 됐는지 코드·문서만으로 복원 불가"한 경우 아래 순서로 처리한다:
1. W7 로그 Decision Candidates 테이블에 row 추가
2. `docs/decisions/` 파일 즉시 생성 — Scope Allowed cross-owner updates에 포함되므로
   사용자 확인 없이 생성 가능. `docs/decisions/AGENTS.md` 지침 먼저 읽고 따른다.
3. W7 로그 Cross-Owner Effects 테이블에 row 추가

### 4. Cross-Owner Effects 기록

`docs/decisions/`, `docs/specs/aiox-a2a.md` 등 Allowed cross-owner updates 목록 안의
문서를 생성하거나 수정했을 때, W7 로그의 Cross-Owner Effects 테이블에 row를 추가한다.
목록 밖 문서를 수정해야 하는 상황이 생기면 수정하지 말고 사용자에게 먼저 확인한다.

### 5. Workflow retrospective 후보

batch 분할, task brief, Evidence Ledger, Scope, agent 의견 수렴에서 생긴 시행착오나
portable 후보가 있으면 W7 assimilation 로그와
`logs/2026-06-18-package-workflow-portable-pattern.md`에 남긴다.

---

## 완료 조건

- §0~§3 모든 검증 항목에 Evidence Ledger row가 있어야 한다
- drift가 있으면 문서 수정 완료, Action에 "문서 수정" 기록
- drift가 없으면 Action에 "변경 없음" 기록
- §3 Repositories 전체 구조 미검증 gap이 해소돼야 한다
- Workflow retrospective 후보가 있으면 W7 assimilation 로그와
  `logs/2026-06-18-package-workflow-portable-pattern.md`에 기록한다
- W7 Work Items에서 W1-1, W1-2 체크박스를 완료로 표시한다
