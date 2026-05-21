# Step 11 Phase A — Session Plan (Claude scratch)

> AGENTS.md "Claude 단기 실행 scratch. 권위 아님. 끝나면 history/와 plan/으로 흡수."
> 본 문서는 Step 11 Phase A walkthrough를 5개 세션으로 자른 실행 노트다.
> 결정 권위는 `history/35-step-11-phase-a-claude-channel-decisions.history.md`,
> 진행 인덱스는 메모리 [[aiox-step-progress]], execution checklist는 `plan/mvp-implementation-checklist.md` Step 11.
> Phase A 종료 후 이 파일은 흡수하고 삭제 또는 archive.

---

## Cycle pattern

```
Claude+User 작업 → commit → Codex review (cold start) → 다음 세션 entry
```

- 세션 종료 조건: commit 완료 + Codex review prompt를 verbatim copy 가능 상태.
- Codex review는 각 세션마다 cold start (자가완결 prompt). 권위 path / 변경 파일 / 검토 포커스 / out-of-scope / 출력 형식 4가지를 prompt에 박는다.
- Codex review 결과가 minor면 그 자리에서 fix commit (Round 2-fix 패턴), major면 별도 mini-session.
- 사용자 손이 강제 필요한 단계 (Session 3 실제 실행)는 사이클 일시 정지.

---

## Claude entry point (다음 세션 진입 시 읽을 순서)

1. 이 파일 (`.claude/plans/step-11-phase-a-sessions.md`) — 현재 어느 세션에 있는지.
2. 메모리 [[aiox-step-progress]] — Step 10 closed + Step 11 Phase A 진행 상태.
3. `history/35-step-11-phase-a-claude-channel-decisions.history.md` — 현재까지 박힌 Observation + Decision.
4. (Session 2 이후) `spikes/claude-channel-registration-poc/` — spike code 상태.
5. (이전 세션 Codex review 결과가 있으면) 그 회신 paste를 history/35 또는 별도 review note.

세션 시작 첫 발화: "Session N 진입. 현재 status는 ~. 이전 Codex review가 ~. 다음 작업은 ~." 형식으로 stance 박기.

---

## Session 1 — Phase A skeleton + spike spec

### Goal
`history/35` 권위 entry 문서를 만들고 spike R/L/T 시나리오 명세를 동시에 박는다. Decision 섹션은 placeholder.

### Claude entry prompt (verbatim, cold start — 새 Claude 세션 첫 메시지로 paste)

```
당신은 Claude 코드이고 새 세션입니다. 본 prompt만으로 컨텍스트를 자가완결하세요.

# Goal
Step 11 Phase A 진입. Session 1 — `history/35` 권위 entry 문서 작성 + Spike Plan S1~S6 박기. Decision 섹션은 placeholder.

# Authority entry points (이 순서로 읽으세요)
1. `.claude/plans/step-11-phase-a-sessions.md` — 사이클 운영 노트.
2. 메모리 aiox-step-progress — Step 10 closed 상태 + "다음 세션 인계" 4건이 본 Phase A 어젠다 기원.
3. `history/34-step-10-phase-b-codex-runtime.history.md` — Step 11 reservation 섹션.
4. `prd/mvp/aiox-mvp-spec.md` Open Product Issue #1.
5. `prd/pre-validation/claude-codex-pre-validation.md` — Claude channel injection PoC + trust PARTIAL.
6. `AGENTS.md` — Step 진행 규칙, Decision Options Workflow.

# Scope
- `history/35-step-11-phase-a-claude-channel-decisions.history.md` 신규 작성.
- `.claude/plans/step-11-phase-a-sessions.md` 신규 scratch.
- 코드 변경 0.

# Out of scope
- spike 코드 (Session 2).
- 실행 결과 (Session 3).
- Decision wording (Session 4).
- plan/PRD drift sync (Session 5).

# Cycle rules
- 세션 종료 = entry commit + (필요 시) Codex review fix commit.
- Codex review prompt 본문은 scratch §Session 1 Codex review prompt 그대로 사용자에게 전달.
```

### My deliverable
- `history/35-step-11-phase-a-claude-channel-decisions.history.md`
  - §Status (현재 Phase A skeleton)
  - §Observation: 기존 PoC trust 결과 (`prd/pre-validation/claude-codex-pre-validation.md` 인용) + Codex 4건 정정 (trust 살아있음, endpoint memory-only, registration token, --resume 분리) + Step 10 Round 4 Option A 비-mirror 방향
  - §Spike Plan: S1~S5 시나리오 명세 (S1 정상 registration / S2 token mismatch / S3 push + confirm 동작 재확인 / S4 channel server kill / S5 framing variant)
  - §Decisions (placeholder) — 어젠다 4건 (Trust stance + framing / Ownership boundary / Reply round-trip + D6-B cross-cut / Session expiry exposure)
  - §Deferred — Codex Round 4 mirror 강요 reject 이유 박음

### User action
- 작성된 skeleton 읽고 어젠다 framing / spike 시나리오 누락 검토.

### Commit message
```
docs: scaffold step 11 phase a claude channel decisions
```

### Session boundary
commit 완료 + Codex review prompt 본 파일에서 verbatim copy 가능.

### Codex review prompt (verbatim, cold start)

```
당신은 코덱스이고 cold start 세션입니다. 본 prompt만으로 컨텍스트를 자가완결하세요.

# Goal
Step 11 (Claude channel adapter skeleton) Phase A 진입 직전, Claude(클로드 코드)가 작성한 권위 entry 문서를 리뷰합니다. 결정은 아직 박지 않았고, 본 문서는 Observation + Spike Plan + Decision placeholder까지입니다.

# Authority entry points (이 순서로 읽으세요)
1. `AGENTS.md` (repo root) — 운영 규칙, Authority Priority, Decision Options Workflow, Step 진행 규칙.
2. `prd/mvp/aiox-mvp-spec.md` "Open Product Issues" 섹션, 특히 #1 (Claude channel trust/confirmation policy).
3. `prd/pre-validation/claude-codex-pre-validation.md` — Claude channel injection PoC 결과 + trust PARTIAL 관찰.
4. `history/33-step-10-phase-a-decisions.history.md` + `history/34-step-10-phase-b-codex-runtime.history.md` — Step 10 권위 (mirror 강요 잠입 검토용).
5. `history/35-step-11-phase-a-claude-channel-decisions.history.md` — 본 리뷰 대상.
6. `plan/mvp-implementation-checklist.md` Step 11 sub-task.

# Scope
- 변경 파일: `history/35-step-11-phase-a-claude-channel-decisions.history.md` (신규), `.claude/plans/step-11-phase-a-sessions.md` (신규 scratch).
- Commit: `<HASH>` (실제 hash는 prompt 전달 시 채워짐).

# Critical review focus
1. PRD line 657 "MVP must avoid assuming fully automatic Claude-side execution" 가 Observation/Spike Plan/Decision placeholder 모두에 일관되게 반영됐는지.
2. 이전 세션에서 코덱스 본인이 짚은 4건 정정사항이 모두 framing에 반영됐는지:
   (a) trust 자동 정합 아님 — Open Product Issue #1 살아있음 명시
   (b) endpoint는 `agents.adapter_session_id`에 저장 금지, daemon memory registry만
   (c) registration에 attach token 필요 (pending token 발급 → CLI env 전달 → channel-server registerClaudeChannel → daemon 검증)
   (d) Claude `--resume`은 Codex Round 4와 분리, daemon-owned rebind 안 함
3. Codex Step 10 Round 4 Option A (daemon-owned runtime ownership) mirror 강요 패턴이 본 Phase A에 잠입했는지. Step 11에서는 attach가 DB-only + endpoint registration callback인 간결 모델이 권위 stance.
4. S1~S5 spike 시나리오 누락: (1) channel server fail/exit 시 Claude CLI 동작 / (2) token mismatch reject path / (3) push timeout / (4) framing variant별 confirm 동작 차이 / (5) registration race (CLI launch와 daemon attach 순서 등) 4개 이상이 커버되는지.
5. Decision placeholder가 AGENTS.md Decision Options Workflow 4가지 (trade-off / 추천+근거 / reversibility / deferrability) 자리를 모두 비워뒀는지.

# Out of scope (이번 리뷰에서 보지 마세요)
- spike 코드 자체 (Session 2 영역).
- 실제 spike 실행 결과 (Session 3 영역).
- Decision wording (Session 4 영역).
- plan/PRD drift sync (Session 5 영역).

# Output format
한국어로 회신하세요.

## Findings
- (PASS / CONCERN / BLOCKER) 항목별 짧은 사실.

## Recommendations
- 구체적 patch 제안. Section/문장 단위로 위치 명시.

## Open questions for Claude
- Claude 측 답이 필요한 항목.
```

---

## Session 2 — Spike R 코드

### Goal
`spikes/claude-channel-registration-poc/` 디렉토리에 token-based registration handshake spike 작성.

### Claude entry prompt (verbatim, cold start — 새 Claude 세션 첫 메시지로 paste)

```
당신은 Claude 코드이고 새 세션입니다. 본 prompt만으로 컨텍스트를 자가완결하세요.

# Goal
Step 11 Phase A Session 2 진입. Spike R (Claude channel registration handshake POC) 코드 작성. 본 세션은 코드 작성만, 실제 Claude CLI 실행은 Session 3 사용자 손.

# Authority entry points (이 순서로 읽으세요)
1. `.claude/plans/step-11-phase-a-sessions.md` — §Session 2 §My deliverable + §Session 2 내부 진행 방식.
2. `history/35-step-11-phase-a-claude-channel-decisions.history.md` — Spike Plan S1~S6 + Decision D1~D4 placeholder + §Review log.
3. `spikes/claude-channel-node-poc/{server.ts, README.md}` — 재사용 baseline.
4. 메모리 aiox-step-progress — Step 10 closed, Step 11 Phase A Session 1 closed.
5. `AGENTS.md`.

# Scope (사용자 directive 순서, scratch §Session 2 deliverable)
1. `spikes/claude-channel-registration-poc/daemon.ts` — fake daemon (`/register`, pending token, memory registry, `/push` helper).
2. `spikes/claude-channel-registration-poc/server.ts` — channel MCP server + ephemeral ingress + daemon register POST + `/send` → `notifications/claude/channel` 변환.
3. `spikes/claude-channel-registration-poc/README.md` — S1~S6 명령/env/예상 로그/PASS 조건 + same terminal exit + leftover observation 관찰 포인트.
4. (선택) `spikes/claude-channel-registration-poc/daemon.test.ts` — daemon.ts token verify/memory registry unit test. Claude CLI/MCP stdio 모킹 X.
- 파일별 diff 보여주기 → 사용자 confirm → 다음 파일.
- 단일 commit: `spike: claude channel registration handshake poc`.

# Out of scope
- 실제 Claude CLI 실행 (Session 3 사용자 손).
- Decision wording (Session 4).
- plan/PRD drift sync (Session 5).
- production code 변경 (spike는 `spikes/` 디렉토리만).

# Cycle rules
- 매 파일 diff confirm 필수, 본 prompt 받자마자 즉시 4파일 일괄 작성 금지.
- 세션 종료 = commit 완료 + Codex review prompt 본문 사용자에게 전달.
- Codex review prompt는 scratch §Session 2 Codex review prompt 그대로, <HASH>를 실제 commit hash로 치환.
```

### My deliverable — 사용자 directive (2026-05-22)

**작업 순서**: `daemon.ts` → `server.ts` → `README.md` → (선택) 테스트.

1. **`daemon.ts` 먼저**
   - fake daemon의 `/register`, pending token, memory registry, `/push` helper가 spike의 판정 기준.
   - token mismatch, registration race, push timeout/dead endpoint 모두 daemon 측 관찰 로그가 중심.
2. **`server.ts`**
   - 기존 `spikes/claude-channel-node-poc/server.ts` 패턴 재사용.
   - ephemeral ingress open → daemon register POST → `/send`를 `notifications/claude/channel`로 변환.
   - token/env validation은 여기서 명확히.
3. **`README.md`**
   - S1/S2/S2.5/S3/S4/S5/S6 각각 명령/env/예상 로그/PASS 조건.
   - Codex Round 4 smoke (`docs/aiox/round-4-tui-smoke-check.md`)처럼 "same terminal exit 측정"과 "leftover/process observation"에 해당하는 관찰 포인트를 명확히.
4. **(선택) 테스트**
   - 하려면 `daemon.ts`의 token verify / memory registry 정도만 unit test.
   - Claude CLI나 MCP stdio는 테스트에서 모킹하지 않아도 됨.

### Session 2 내부 진행 방식

- 파일 하나씩 완성 후 diff 보여주기.
- 각 파일마다 사용자 confirm 받고 다음 파일 진행.
- Session 2 commit은 spike 코드 + README + (선택) 테스트까지 **한 번에 묶음**. 내부 진행은 잘라가되 commit은 단일.

### User action
- 파일별 diff 검토 + confirm. 실제 실행은 Session 3.

### Commit message
```
spike: claude channel registration handshake poc
```

### Session boundary
commit 완료 + Session 3 진입 시 사용자가 spike를 실행할 수 있는 상태.

### Codex review prompt (verbatim, cold start)

```
당신은 코덱스이고 cold start 세션입니다. 본 prompt만으로 컨텍스트를 자가완결하세요.

# Goal
Step 11 Phase A의 Spike R (Claude channel registration handshake POC) 코드를 리뷰합니다. 실제 Claude CLI 실행은 다음 세션 (Session 3)에서 사용자가 수행하므로 본 리뷰는 코드/시나리오 명세까지만.

# Authority entry points
1. `AGENTS.md` — 운영 규칙.
2. `history/35-step-11-phase-a-claude-channel-decisions.history.md` — Session 1에서 박힌 Observation + Spike Plan. Spike R 시나리오 S1~S5 정의.
3. `spikes/claude-channel-node-poc/{server.ts, README.md}` — 기존 PoC. Spike R은 이를 확장/재사용한 형태가 자연스러움. divergence 적절성 평가 기준.
4. `prd/pre-validation/claude-codex-pre-validation.md` — Claude channel injection PoC 결과 + trust PARTIAL 관찰.

# Scope
- 변경 파일: `spikes/claude-channel-registration-poc/*`.
- Commit: `<HASH>`.

# Critical review focus
1. Token handshake 보안 surface:
   - token이 어떻게 생성/전달/검증되는지 (env 전달 시 leak 가능성, replay 가능성, mismatch reject path).
   - daemon registry가 in-memory only인지 (DB persist 금지 invariant 유지).
   - 등록 후 token이 더 이상 필요한지 (one-shot vs persistent auth).
2. ESM/type 정합성:
   - 기존 `claude-channel-node-poc/server.ts` 패턴 (zod, McpServer, StdioServerTransport) 재사용 적절성.
   - 새 surface가 divergence할 필요가 있는지, 단순히 add-on인지.
3. README 수동 실행 가이드:
   - S1~S5 시나리오 각각에 명령/env/예상 stderr log/판정 조건이 모두 박혀있는지.
   - Codex Round 4-fix manual TUI smoke (`docs/aiox/round-4-tui-smoke-check.md`)의 시나리오 명세 디테일 수준과 비교.
4. 누락 가능성:
   - channel server fail/exit 시 Claude CLI 동작 관찰 시나리오 포함 여부.
   - registration race (CLI launch와 daemon attach 순서) 시나리오.
   - daemon HTTP push가 channel server dead일 때 typed error로 매핑 가능한지 (Session 4 결정 input).
5. MVP invariant 위반 잠입:
   - persistent connection / periodic poll / auto-reconnect / heartbeat 흔적이 코드/README에 잠입했는지 (Step 10 D5-B invariant와 동일하게 Claude 측도 listen-only / on-demand check가 권위 stance).

# Out of scope
- 실제 Claude CLI 실행 결과 (Session 3).
- Decision wording (Session 4).

# Output format
한국어로 회신하세요.

## Findings
- (PASS / CONCERN / BLOCKER) 항목별.

## Recommendations
- 코드 patch 제안. 파일/라인 단위 위치 명시.

## Open questions for Claude
- Claude 측 답이 필요한 항목.
```

---

## Session 3 — 사용자 수동 실행 + Observation 누적

### Goal
사용자가 S1~S6를 직접 실행하고 결과를 paste/공유. Claude(나)는 결과를 `history/35` Observation 섹션에 박는다.

### Claude entry prompt (verbatim, cold start — 새 Claude 세션 첫 메시지로 paste)

```
당신은 Claude 코드이고 새 세션입니다. 본 prompt만으로 컨텍스트를 자가완결하세요.

# Goal
Step 11 Phase A Session 3 진입. Spike R 수동 실행은 사용자 손. 본 Claude 세션 역할 = 사용자가 paste한 결과를 `history/35` Observation 섹션에 박기.

# Authority entry points
1. `.claude/plans/step-11-phase-a-sessions.md` — §Session 3.
2. `history/35-step-11-phase-a-claude-channel-decisions.history.md` — §Observation 누적 위치 + Spike Plan S1~S6.
3. `spikes/claude-channel-registration-poc/README.md` — S1~S6 시나리오와 PASS 조건.
4. `prd/pre-validation/claude-codex-pre-validation.md` — 비교 baseline.
5. 메모리 aiox-step-progress.

# Scope
- 사용자가 S1~S6 실제 실행 결과 (터미널 log / stderr / 판정) paste 받음.
- 결과를 `history/35` §Observation에 박음. 어젠다 4건 결정에 직접 영향을 주는 핵심 사실은 별도 "Decision-input facts" sub-section에 정리.
- 추측/extrapolation 박지 않음. spike에서 직접 관찰된 사실만 박음.

# Out of scope
- Spike 코드 수정 (Session 2 closed).
- Decision wording (Session 4) — Observation 보고 섣불리 Decision 닫지 않음.

# Cycle rules
- 사용자 결과 paste 받기 전까지 다음 단계 자동 진행 안 함.
- 세션 종료 = commit + Codex review prompt 본문 사용자에게 전달.
- Commit: `docs: record spike R observation results`.
```

### My deliverable
- `history/35` Observation 섹션 확장:
  - S1~S5 각각의 실제 명령 / 결과 / stderr log / 판정 (PASS / FAIL / PARTIAL) 박음.
  - 어젠다 4건 결정에 직접 영향을 주는 핵심 사실 별도 sub-section ("Decision-input facts").

### User action
- S1~S5 실행. Codex Round 4-fix manual TUI smoke 패턴과 동일.
- 결과 paste (터미널 log / stderr / 판정).

### Commit message
```
docs: record spike R observation results
```

### Session boundary
commit 완료 + 어젠다 4건 결정 walkthrough 진입 가능 상태 (Decision-input facts 충분).

### Codex review prompt (verbatim, cold start)

```
당신은 코덱스이고 cold start 세션입니다. 본 prompt만으로 컨텍스트를 자가완결하세요.

# Goal
Step 11 Phase A의 Spike R observation 결과가 history/35에 정확히 박혔는지, 어젠다 4건 결정 input으로 충분한지 리뷰합니다.

# Authority entry points
1. `AGENTS.md` — 운영 규칙.
2. `history/35-step-11-phase-a-claude-channel-decisions.history.md` — Observation 섹션 (Session 3 누적분 포함).
3. `spikes/claude-channel-registration-poc/{server.ts, daemon.ts, README.md}` — Spike R 코드와 시나리오.
4. `prd/pre-validation/claude-codex-pre-validation.md` — 기존 PoC trust observation. 비교 baseline.

# Scope
- 변경 파일: `history/35-...` Observation 섹션.
- Commit: `<HASH>`.

# Critical review focus
1. S1~S5 시나리오 결과가 README spec과 일치하는지. 일치 안 하는 항목은 명시적으로 PARTIAL/FAIL로 기록됐는지.
2. 어젠다 4건 각각의 결정 input이 Observation에 충분한지:
   (a) Trust stance + framing — framing variant별 confirm 동작 차이 + 자동 실행 여부.
   (b) Ownership boundary — registration handshake 동작 + endpoint memory-only 동작.
   (c) Reply round-trip + D6-B cross-cut — reply tool 호출이 daemon으로 어떻게 surface되는지.
   (d) Session expiry exposure — channel server fail / Claude CLI exit 동작.
3. Observation에 추측/extrapolation이 섞였는지. spike에서 직접 관찰되지 않은 사실이 fact처럼 박혔는지.
4. 추가 시나리오 필요 여부:
   - 어젠다 4건 중 input이 부족한 항목이 있다면 어떤 시나리오가 추가로 필요한지.

# Out of scope
- Decision wording (Session 4).
- 코드 patch (Spike R 자체는 Session 2에서 closed).

# Output format
한국어로 회신하세요.

## Findings
- (PASS / CONCERN / BLOCKER) Observation별.

## Decision-input gaps
- 어젠다 4건 각각의 input 충분도. 부족하면 어떤 시나리오 추가 필요한지.

## Recommendations
- Observation 보강 patch 제안.
```

---

## Session 4 — 어젠다 4건 Phase A walkthrough → Decision

### Goal
어젠다 4건을 walkthrough하고 `history/35` Decision 섹션을 박는다. 각 결정에 AGENTS.md Decision Options Workflow 4가지 (trade-off / 추천+근거 / reversibility / deferrability).

### Claude entry prompt (verbatim, cold start — 새 Claude 세션 첫 메시지로 paste)

```
당신은 Claude 코드이고 새 세션입니다. 본 prompt만으로 컨텍스트를 자가완결하세요.

# Goal
Step 11 Phase A Session 4 진입. 어젠다 D1~D4 walkthrough → `history/35` Decision 섹션에 권위 박음. AGENTS.md Decision Options Workflow MUST 4가지 (trade-off / 추천+근거 / reversibility / deferrability) 강제.

# Authority entry points
1. `.claude/plans/step-11-phase-a-sessions.md` — §Session 4.
2. `history/35-step-11-phase-a-claude-channel-decisions.history.md` — Observation (Session 3 결과 박힌 후) + Decision placeholder + Options placeholder 4칸.
3. `history/33-step-10-phase-a-decisions.history.md` + `history/34-step-10-phase-b-codex-runtime.history.md` — Step 10 권위. 충돌/mirror 강요/invariant 위반 검토 baseline.
4. `prd/mvp/aiox-mvp-spec.md` Open Product Issue #1·#4·#5.
5. 메모리 aiox-deferred-decisions — session expiry deferral rationale.
6. `AGENTS.md` — Decision Options Workflow.

# Scope (어젠다 4건)
- D1 Trust stance + framing.
- D2 Ownership boundary (attach = DB-only + endpoint registration callback, daemon memory registry, registration token handshake).
- D3 Reply round-trip + D6-B cross-cut.
- D4 Session expiry exposure.
- 각 Decision의 Options 4칸 모두 채움. 추측/default 박지 않음.
- Deferred 보존: Long-running timeout (#4), Session expiry policy (#5), TUI-originated rebind 동치 (자연 소거), Codex Round 4 Option A mirror reject.

# Out of scope
- plan/PRD drift sync (Session 5).
- Phase B 실제 구현.
- 새 spike (Phase A는 input 확보 단계 closed).

# Cycle rules
- 어젠다별 옵션 비교 → 사용자 선택 → wording 박음. 사용자 confirm 없이 자체 결정 금지.
- 세션 종료 = commit + Codex review prompt 본문 사용자에게 전달.
- Commit: `docs: lock step 11 phase a decisions`.
```

### My deliverable
- `history/35` Decision 섹션:
  - D1 Trust stance + framing
  - D2 Ownership boundary (attach = DB-only + endpoint registration callback)
  - D3 Reply round-trip + D6-B cross-cut (Step 10 D6-B와 묶을지 분리할지)
  - D4 Session expiry exposure (Open Product Issue #5와 어떻게 분리/통합)
- Deferred 항목 명시:
  - TUI-originated rebind 동치 개념 (Claude는 thread 개념 없으니 자연 소거)
  - Long-running delivery timeout (Open Product Issue #4)

### User action
- 어젠다 4건 walkthrough 동참. 옵션 비교 후 선택.

### Commit message
```
docs: lock step 11 phase a decisions
```

### Session boundary
commit 완료 + Phase B 진입 surface (channel-server.ts / launcher.ts / injector.ts / daemon API) 명세 가능.

### Codex review prompt (verbatim, cold start)

```
당신은 코덱스이고 cold start 세션입니다. 본 prompt만으로 컨텍스트를 자가완결하세요.

# Goal
Step 11 Phase A 결정 4건 wording이 권위 문서로 박을 만큼 ambiguity 없는지, Step 10 권위와 충돌하지 않는지, MVP invariant와 정합한지 리뷰합니다.

# Authority entry points
1. `AGENTS.md` — Decision Options Workflow MUST 4가지, Authority Priority.
2. `history/33-step-10-phase-a-decisions.history.md` + `history/34-step-10-phase-b-codex-runtime.history.md` — Step 10 권위. Claude Phase A 결정이 충돌/mirror 강요/invariant 위반하는지 검토 baseline.
3. `history/35-step-11-phase-a-claude-channel-decisions.history.md` — 본 리뷰 대상 (Decision 섹션 채워진 후).
4. `prd/mvp/aiox-mvp-spec.md` — Open Product Issue #1·#4·#5와 결정의 정합.
5. 메모리 [[aiox-deferred-decisions]] — session expiry deferral rationale.

# Scope
- 변경 파일: `history/35-...` Decision 섹션 + Deferred 섹션.
- Commit: `<HASH>`.

# Critical review focus
1. Decision wording ambiguity:
   - "passive push", "memory-only registry", "token verify", "endpoint registration callback" 등이 implementation 시점에 다른 해석으로 갈라질 여지가 있는지.
   - Decision은 Phase B 위임 prompt에 그대로 인용 가능한 정밀도로 박혔는지.
2. Step 10 권위 충돌:
   - Codex Round 4 Option A (daemon-owned runtime) mirror 강요가 Decision에 잠입했는지.
   - 반대로 Claude Decision이 Step 10 권위 표(D7 binding authority, D5-A.5 cleanup ordering 등)와 일관성 깨졌는지.
3. MVP invariant 정합:
   - no auto-reconnect / no periodic poll / no heartbeat / no process group kill (Step 10 D5-B) 가 Claude 측에도 동일하게 박혔는지.
   - aiox는 ownership boundary가 다르지만 invariant는 동일 모델인지.
4. Codex 4건 정정사항 반영:
   - Decision 4건 각각에서 (a) trust 살아있음 / (b) endpoint memory-only / (c) registration token / (d) --resume 분리가 명시적으로 박혔는지.
5. AGENTS.md Decision Options Workflow 4가지:
   - 각 Decision에 trade-off / 추천+근거 / reversibility / deferrability 4섹션이 모두 박혔는지.
6. Open Product Issue 상태:
   - #1 trust는 Phase A 결정으로 close되는지, partial close인지, 그대로 open인지 명시됐는지.
   - #4 timeout / #5 expiry는 본 Phase A scope에 명시적으로 deferral 박혔는지.

# Out of scope
- plan/PRD drift sync (Session 5).
- Phase B 실제 구현 (Step 11 Phase B Round 1).

# Output format
한국어로 회신하세요.

## Findings
- (PASS / CONCERN / BLOCKER) Decision별.

## Wording patches
- 모호한 문장 patch 제안 (전후 인용 포함).

## Phase B entry suggestions
- Decision을 그대로 Phase B 위임 prompt에 인용하기 위한 추가 wording 필요 여부.
```

---

## Session 5 — Closeout + Phase B 진입 준비

### Goal
plan checklist / PRD / 메모리 drift를 동기화하고 Phase B 위임 prompt 윤곽을 만든다. 본 scratch 파일 삭제.

### Claude entry prompt (verbatim, cold start — 새 Claude 세션 첫 메시지로 paste)

```
당신은 Claude 코드이고 새 세션입니다. 본 prompt만으로 컨텍스트를 자가완결하세요.

# Goal
Step 11 Phase A Session 5 진입. Phase A closeout + Phase B 진입 준비 + 본 scratch 파일 삭제.

# Authority entry points
1. `.claude/plans/step-11-phase-a-sessions.md` — §Session 5 + §흡수 방향 (삭제 체크리스트 5개).
2. `history/35-step-11-phase-a-claude-channel-decisions.history.md` — Decision 4건 박힌 상태.
3. `plan/mvp-implementation-checklist.md` Step 11 sub-task.
4. `prd/mvp/aiox-mvp-spec.md` Open Product Issue #1 (상태 갱신 대상).
5. 메모리 aiox-step-progress (상태 갱신 대상).
6. `history/34-step-10-phase-b-codex-runtime.history.md` "Step 11 reservation".
7. `AGENTS.md` — Step 진행 규칙.

# Scope
- `plan/mvp-implementation-checklist.md` Step 11 sub-task 갱신 (Phase A 결정 반영, Phase B 진입 가능 상태).
- `prd/mvp/aiox-mvp-spec.md` Open Product Issue #1 상태 갱신 (Phase A로 close/partial-close 명시).
- `history/35` §Verification 섹션 갱신 (test 변경 없으면 baseline 224 유지).
- 메모리 aiox-step-progress Step 11 Phase A closed 한 줄 갱신.
- Phase B 위임 prompt 윤곽 (코덱스/클로드 누가 작성할지 + scope + Round 1 surface).
- **scratch 삭제**: §흡수 방향 체크리스트 5개 모두 done 확인 후 `git rm .claude/plans/step-11-phase-a-sessions.md` Session 5 closeout commit에 포함.

# Out of scope
- Phase B 실제 구현 (별도 step).
- 새 spike 제안 (Phase A closed).

# Cycle rules
- 흡수 체크리스트 5개 모두 done 아니면 삭제 금지. 부족하면 보강 후 진행.
- 세션 종료 = closeout commit (scratch 삭제 포함) + Codex review prompt 본문 사용자에게 전달.
- Commit: `docs: close step 11 phase a + sync plan/PRD`.
```

### My deliverable
- `plan/mvp-implementation-checklist.md` Step 11 sub-task 갱신 (Phase A 결정 반영, Phase B 진입 가능 상태).
- `prd/mvp/aiox-mvp-spec.md` Open Product Issue #1 상태 갱신 (Phase A로 close/partial-close 명시).
- `history/35` closeout 섹션 (verification baseline 갱신 — test 변경 없으면 그대로, 변경 있으면 갱신).
- 메모리 [[aiox-step-progress]] Step 11 Phase A closed 한 줄 갱신.
- Phase B 위임 prompt 윤곽 (코덱스/클로드 누가 작성할지 + scope + Round 1 surface).
- **본 scratch 파일 `.claude/plans/step-11-phase-a-sessions.md` `git rm` 삭제** — Session 5 closeout commit에 포함. 흡수 완료 확인 후 진행 (아래 §흡수 방향 체크리스트 참조).

### User action
- 갱신된 plan/PRD/메모리 confirm.
- Phase B 위임 대상 결정 (코덱스 작성 / 클로드 작성).

### Commit message
```
docs: close step 11 phase a + sync plan/PRD
```

### Session boundary
commit 완료 + 본 scratch 파일 (`.claude/plans/step-11-phase-a-sessions.md`) archive 또는 삭제 + Phase B Round 1 진입 prompt 가용.

### Codex review prompt (verbatim, cold start)

```
당신은 코덱스이고 cold start 세션입니다. 본 prompt만으로 컨텍스트를 자가완결하세요.

# Goal
Step 11 Phase A closeout 후 plan/PRD/메모리 drift가 없는지, Phase B Round 1 진입 prompt 윤곽이 reasonable한지 리뷰합니다.

# Authority entry points
1. `AGENTS.md` — Step 진행 규칙, vault drift check.
2. `history/35-step-11-phase-a-claude-channel-decisions.history.md` — Phase A closed 상태.
3. `plan/mvp-implementation-checklist.md` Step 11 sub-task.
4. `prd/mvp/aiox-mvp-spec.md` Open Product Issue #1 (상태 갱신 반영분).
5. `history/34-step-10-phase-b-codex-runtime.history.md` "Step 11 reservation" 섹션과 비교.

# Scope
- 변경 파일: `plan/mvp-implementation-checklist.md`, `prd/mvp/aiox-mvp-spec.md`, `history/35-...` closeout.
- Commit: `<HASH>`.

# Critical review focus
1. Drift sync:
   - plan checklist의 Step 11 sub-task가 Phase A 결정 4건과 1:1로 매핑되는지.
   - PRD Open Product Issue #1 상태가 명시적으로 close/partial-close/open 중 하나로 갱신됐는지.
   - 메모리 [[aiox-step-progress]] 한 줄 갱신이 권위 문서와 동기화됐는지.
2. Phase B Round 1 scope:
   - Phase A 결정 surface (channel-server.ts / launcher.ts / injector.ts / daemon API + typed errors) 중 Phase B Round 1에 들어갈 minimal scope가 무엇인지.
   - Step 10 Phase B Round 1 (foundation + spike + 결정) 패턴과 비교한 Claude Phase B Round 1 scope 적절성.
   - Phase B 위임 prompt에 필요한 추가 컨텍스트 (Spike R 결과 인용 path, MVP invariant, Codex 4건 정정).
3. 잔여 deferral:
   - Open Product Issue #4 (long-running timeout) / #5 (session expiry) / TUI-originated rebind (Codex post-MVP) 가 Phase A에서 명시적으로 deferral 박혔는지, Phase B 진입에 영향 없는지.

# Out of scope
- Phase B 실제 구현.
- 새 spike 제안 (Phase A 완료된 상태).

# Output format
한국어로 회신하세요.

## Findings
- (PASS / CONCERN / BLOCKER) drift 항목별.

## Closeout checklist
- 추가로 갱신/삭제 필요한 항목.

## Phase B Round 1 scope proposal
- 구체적 surface 제안 + 위임 prompt 윤곽 검토.
```

---

## 흡수 방향 (Phase A 종료 시)

### 삭제 invariant

**Phase A 5 세션 모두 완료 시 본 scratch 파일 (`.claude/plans/step-11-phase-a-sessions.md`)을 `git rm`으로 삭제한다.** AGENTS.md scratch 원칙 — "권위 문서가 아니며, 작업이 끝나면 필요한 결정/검증/결과만 `history/`와 `plan/`으로 흡수한다." 삭제는 Session 5 closeout commit에 포함.

### 흡수 체크리스트 (삭제 전 확인)

- [ ] 본 파일의 결정 wording → `history/35` Decision 섹션으로 흡수 완료.
- [ ] 본 파일의 spike 시나리오 명세 (S1~S6) → `spikes/claude-channel-registration-poc/README.md`로 흡수 완료.
- [ ] 본 파일의 사용자 directive (Session 2 작업 순서 등) → 해당 산출물 (코드/README) 안에 흡수 완료 또는 history/35 review log에 보존.
- [ ] Codex review prompt 5개 → Phase B에서 재사용 가능한 패턴이면 [[aiox-collaboration-workflow]]에 흡수. cold-start prompt 형식 자체를 패턴화할 가치 있음.
- [ ] Session 1~5 운영 노트 (commit hash 등) → `history/35` §Review log + §Verification에 모두 박혀 있는지 확인.

체크리스트 모두 done이면 Session 5 closeout commit에서:
```
git rm .claude/plans/step-11-phase-a-sessions.md
```
포함해 commit.
