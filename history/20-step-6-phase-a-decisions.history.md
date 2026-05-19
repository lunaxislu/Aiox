# Step 6 Phase A — Pre-implementation Decisions

> 작성일: 2026-05-19
> 작성자: Claude (Opus 4.7) — 사용자와 1:1 walkthrough 후 codex 위임 confirm 라운드 진입 전
> 관련 기록:
> - `history/18-step-4-cli-parsing.history.md` 결정 #13 (commander origin `exitCode` 보류)
> - `history/19-step-5-route-fanout-tests.history.md` Open Concern O2 (`sourceRoutes` empty 동작)
> - `plan/mvp-implementation-checklist.md` Step 6 (line 511–533) 진입 전 spec 결정 1~3
> - `prd/mvp/aiox-mvp-spec.md` (line 36–158 MVP 13개 명령 surface)

---

## 배경

Step 5 (route/connect fan-out tests at daemon level) 마감 후 Step 6 — "invocation
layer + CLI bin entrypoint" — 에 진입하기 직전, `plan/mvp-implementation-checklist.md`
가 Step 6 헤더에 명시한 3개 spec 결정 사항을 먼저 닫는 phase A 라운드를 진행함.

본 phase에서는 코드 변경 없이 **결정만** 내린다. 코드 변경(invocation layer 구현,
exit code 전파, send CLI 노출 여부에 따른 parser/help 수정 등)은 phase B의 codex
위임 라운드에서 진행한다.

본 문서는 다음 세션의 agent가 한 화면에서 결정 근거와 deferred 항목을 잡을 수
있도록 phase A 단독 history로 분리해 기록한다. Phase B 진행 결과는 같은 step의
별도 history 파일 또는 본 파일의 확장으로 흡수 예정.

---

## 진행 방식

`plan/mvp-implementation-checklist.md` Step 6 헤더가 명시한 3개 spec 결정 항목을
사용자 → Claude 1:1 walkthrough로 한 번에 다루고, 사용자 결정 묶음을 codex confirm
라운드로 보내는 흐름.

Walkthrough 진행:

1. **결정 1** (exit code 정책) — Claude가 옵션 A/B/C 비유 + 코드 스니펫으로 설명,
   사용자가 옵션 A로 confirm.
2. **결정 2** (send CLI surface) — Claude가 옵션 (i)/(ii)/(iii) 비교 + PRD 13개
   명령 surface 영향 설명, 사용자가 옵션 (ii)로 confirm + open concern 보존 요청.
3. **결정 3** (empty `sourceRoutes` 동작) — 결정 2가 (ii)이면 코덱스 원안은
   deferred지만, 사용자가 daemon API contract 시멘틱 일관성 관점에서 옵션 (β)를
   **지금 박는** 선택지를 제안 → Claude가 (a) deferred / (b) 지금 β 정착의
   trade-off 정리 → 사용자가 (b)로 confirm.

각 결정 후 사용자가 "이해되었는가"를 직접 확인한 후 다음 결정으로 진행. 학습
과정의 Q&A는 `docs/aiox/step-6-cli-decisions-walkthrough.md`에 별도 learning
record로 분리 기록.

---

## 결정 사항

### 1. commander origin `exitCode` 정책 — 옵션 A (값 그대로 통과)

**결정**: `bin/aiox.ts`의 catch에서 `process.exit(err.exitCode ?? 1)`. commander
가 박은 `exitCode`가 있으면 그 값 그대로, 없으면 기본 1.

**근거**:

- `history/18-step-4-cli-parsing.history.md` 결정 #13이 이미 "commander origin은
  `error.exitCode`를 그대로 통과, 자체 throw만 `parseErrorExitCode = 1`로 통일"
  로 마감했다. Step 6의 범위는 parser 결과를 daemon API/bin으로 연결하는 것이지
  Step 4 결정을 뒤집는 것이 아니다.
- `--version` / `--help`는 Step 4에서 이미 `{ kind: "version", value }` /
  `{ kind: "help", text }` `ParsedCommand` variant로 capture되어 error path가
  아니라 stdout 출력 path로 흐른다. 따라서 옵션 A에서 catch 경로까지 도달해서
  `exitCode: 0`이 사용자에게 노출되는 사례는 현 parser contract 상 거의 발생하지
  않음. 사용자 walkthrough에서도 이 점이 confirm 결정의 결정적 근거로 작용함.
- 옵션 B (무조건 1)는 일관성은 높지만 commander가 의도한 origin semantic을
  invocation layer에서 지워버린다. 옵션 C (prefix 기반 분기)는 표현력이 가장
  높지만 Step 4가 이미 commander code도 `aiox.*` namespace로 wrap하기로 한 결정
  과 맞물려 새 origin/semantic 판별 로직을 invocation에 도입해야 한다 — MVP
  Step 6 Round 1 범위 밖.

**Reversibility**: bin의 exit-code mapping 함수 한 곳만 바꾸면 됨. 단 baseline
테스트와 history 결정 #13을 함께 갱신해야 함.

### 2. `sendMessage` CLI surface — 옵션 (ii) (CLI 미노출, daemon API only)

**결정**: `aiox send` 류 새 명령을 MVP Step 6에서 추가하지 **않는다**. Step 5에서
추가된 `DaemonApi.sendMessage`는 daemon 내부 API / 내부 호출자(테스트, adapter)
용으로만 유지하고 CLI surface로 노출하지 않는다.

**근거**:

- `prd/mvp/aiox-mvp-spec.md` line 36–158이 MVP 명령 surface를 daemon 5 + attach
  2 + routing 2 + pair 1 + global 3 = **13개로 못박았고**, send 계열이 없다.
  Step 4 parser도 이 13개 기준으로 마감됐다.
- 옵션 (i) (CLI 명령 신설)는 PRD + history + parser + help text + invocation +
  tests를 모두 확장하는 product-surface 변경이라 Step 6 본 목표("13개
  `ParsedCommand` dispatch + bin entrypoint")의 범위를 깨뜨린다.
- 옵션 (iii) (전체 deferral)는 Step 5에서 이미 daemon API가 추가된 상태인데
  "쓸지 말지" 자체를 보류하는 모양이라 open concern을 다시 뒤로 미루는 효과만
  큰 데 비해 phase A에서 결정 비용이 작다.
- (ii)는 **daemon API 함수 자체는 보존**하고 사용자-facing surface만 닫는다.
  나중에 send CLI가 필요해지면 parser/help/invocation을 확장하면 되고, core/store
  변경 비용은 없다.

**Open concern으로 보존**: 사용자가 명시적으로 "필요해지면 나중에 추가, 그동안은
open으로 남긴다"고 요청. 본 history 하단 Open Concerns 절에 deferred 항목으로
명시 기록.

**Reversibility**: 중간. CLI 추가 시 PRD/history/plan, parser union, help/version
tests, invocation tests, bin tests 확장 필요. core/store는 무변경.

### 3. `sourceRoutes` empty 시 `sendMessage` 동작 — 옵션 β-1 (atomic reject, event 0개)

**결정**: source agent의 active directed route가 0개인 상태로 `sendMessage`가
호출되면 daemon API는 `{ ok: false, reason: "no_active_routes" }` 를 반환하며
**message / deliveries / events 어떤 row도 추가하지 않는다** (β-1: 완전 atomic).
Step 5의 현재 α 동작 (`ok: true` + `deliveries: []` + `message_created` event
1개 append)은 Step 6 phase B에서 β-1로 수정한다.

**근거**:

- 코덱스 원안은 결정 2가 (ii)이면 "deferrable" (Step 8 또는 send CLI 도입 시점에
  재결정). 사용자가 한 칸 더 나간 선택을 제안 — daemon API 자체가 내부 호출자
  (테스트, adapter)에게 일관된 contract를 제공해야 하므로 "보낸 곳 0개인데
  ok: true"는 시멘틱이 어색하다는 직관.
- 사용자 직관은 코덱스가 결정 2 = (i)에서 β를 추천한 것과 같은 결론. 차이는
  "사용자-facing이 아니어도 API contract 레벨에서 미리 박을지" 여부.
- (b) 지금 β 정착이 합리적인 추가 이유:
  - 내부 호출자도 `deliveries.length === 0` 체크를 깜빡할 경우 silent bug를 만들
    여지가 있다. 명시 reject는 caller 측 분기를 강제한다.
  - 어차피 send CLI 도입 시점에 β로 갈 가능성이 가장 높다 (코덱스도 그 시점
    추천을 β로 명시함). 지금 박아두면 future churn (Step 6 → Step 8에서 동작
    변경 + 테스트 재작성) 회피.
- (a) deferred가 합리적인 이유: Step 5 구현 무변경, YAGNI. 거부 시 Open
  Concern을 다음 step으로 미루는 것이 진행 비용이 가장 작다. 사용자가 (b)를
  선택했으므로 본 history는 (b) 근거를 정리하고, (a)는 비교 대안으로만 기록한다.

**β-1 vs β-2 sub-decision (당초 OA2로 deferred 예정이었으나 walkthrough 중 closed)**:

reject 응답에서 event audit을 어떻게 처리할지 두 분기:

- (β-1) 완전 atomic — message / deliveries / events 모두 추가 X. caller 시점에서
  "이 메시지는 시스템에 존재한 적 없음".
- (β-2) `message_created` event 1개만 append, message / deliveries / delivery_queued는 X.
  "보내려는 시도는 있었다"의 audit trail만 보존.

사용자가 직관적으로 β-2 audit 가치에 기울었으나, walkthrough에서 aiox의 운영
컨텍스트(개인 local single-user, 외부 규제/감사 없음, 사용자 = 운영자)를
재확인한 결과 audit trail의 일반적 가치가 본 프로젝트에서는 거의 0임이
명확해졌다:

- 회계/규제 가치 = 없음 (개인 사용)
- 보안 추적 가치 = 없음 (사용자 본인뿐)
- 디버깅 가치 = 낮음 (caller가 실패 응답을 즉시 받아 인지)
- 본인 메트릭 가치 = 낮음 (필요해지면 그때 추가)

따라서 **β-1 (atomic)** 으로 확정. 미래에 adapter integration(Step 8~10)에서
multi-agent 디버깅 가치가 명확해지는 신호가 나오면 그 시점에 `sendMessage`에
event append 한 줄 추가로 β-2로 trivial 이동 가능 (YAGNI 원칙).

ATM 비유 등 일반 production 멘탈 모델은 본 프로젝트의 single-user local 컨텍
스트와 맞지 않으므로 적용 X.

**Reversibility**: 낮음. daemon `sendMessage` 구현 + `tests/unit/daemon/
message-fanout-store.test.ts` (Step 5 commit `50e4f1d`)의 empty-routes 경로 테스트
가 갱신 대상. β-1 확정으로 phase B 작업 범위는 "rejection path 추가 + event
append 제거 + 기존 α expectation 테스트 갱신"으로 명확해짐.

---

## Open Concerns / Deferred

본 phase A에서 결정이 닫히지 않고 phase B 또는 후속 step으로 명시적으로 미루는
항목.

### OA1. `sendMessage` CLI 노출 정책 — post-MVP 또는 send CLI 필요 시점

결정 2-(ii)의 명시 deferral. daemon API `sendMessage`는 살아 있지만 사용자-facing
surface 없음. 후속 조건:

- post-MVP에서 send 명령이 product 요구로 들어오는 시점, 또는
- MVP 중이라도 fake adapter integration(Step 8) 또는 그 이후 단계에서 "내부
  호출만으로는 검증이 불충분하다"는 신호가 명확해지는 시점.

재진입 시점에 결정 3 옵션 (γ explicit flag) 도입 여부도 함께 재검토 (현 시점
phase A에서는 β로 충분).

### OA2. ~~β 채택 시 event audit 정책 (β-1 vs β-2)~~ — Closed in walkthrough

당초 phase B의 codex confirm 라운드 첫 질의 항목으로 deferred 예정이었으나,
사용자 walkthrough 중 aiox의 single-user local 운영 컨텍스트가 명확해지면서
β-1로 closed. 결정과 근거는 본 history 결정 #3의 β-1 sub-section에 흡수.

closed 시점: 2026-05-19 사용자 walkthrough.

---

## 다음 단계 (Phase B 진입 조건)

1. **Codex confirm 라운드 완료** (2026-05-19): 본 history의 3개 결정 + OA2
   closed를 작업지시서 형태로 코덱스에게 송부 → 수용 + Round 1 옵션 추천 6건
   회신. (아래 "Phase B Round 1 옵션 합의" 절 참조.)
2. **Phase B 구현**: parse → daemon API dispatch mapping, `package.json#bin` +
   `src/bin/aiox.ts` 활용, exit code propagation, help/version stdout 처리,
   β-1 동작 적용을 위한 `sendMessage` 수정 + `tests/unit/daemon/
   message-fanout-store.test.ts` 갱신. 코덱스 cross-validation 라운드 진입.
3. **plan checklist 업데이트**: Step 6 sub-item `sendMessage CLI 노출 (조건부)`
   를 drop하고 "deferred (OA1)" 라벨로 표시. 본 history 링크 추가.

본 phase A 자체로는 commit 없음 (결정 문서 + learning record 작성만). Phase B
진입 후 코드/테스트 변경이 commit 단위로 분리됨. Phase B 마감 시 별도 history
(예상: `history/21-step-6-phase-b-invocation-bin.history.md`)에 결정 6건의 구현
근거 + 코드 변경 + 테스트 갱신 기록 흡수 예정.

---

## Phase B Round 1 옵션 합의 (코덱스 추천 6건 수용)

작업지시서에서 코덱스가 옵션 제시한 5개 항목 + 코덱스가 발견한 선행 결정 1건
(bin source 위치)에 대해 모든 추천안을 그대로 수용 (사용자 confirm 2026-05-19).

| # | 항목 | 채택 옵션 | 핵심 근거 |
|---|---|---|---|
| 1 | invocation layer 코드 위치 | **A** (`src/cli/invocation.ts` 단일 파일) | 13개 명령에 단일 파일로 충분, 명령 증가 시 분리 (post-MVP 진화 경로) |
| 2 | ParsedCommand dispatch 패턴 | **A** (exhaustive `switch` + `assertNever`) | discriminated union 정석, 누락을 컴파일 타임에 catch |
| 3 | shortcut 정규화 위치 | **B** (invocation 단계) | Step 4 결정 #8 (parser는 surface intent만 유지)과 일관 |
| 4 | invocation/runtime error 코드 체계 | **A** (`aiox.invocation.*` namespace 신설) | parse error와 분리되어 추적 용이, bin exit 정책 테스트에 도움 |
| 5 | β-1 sendMessage 변경 패턴 | **A** (sourceRoutes 조회 직후 early return) | 현재 코드에 가장 작은 변경, message/event insert 전에 분기 |
| 6 | bin source 위치 (코덱스 발견 신규) | **A** (`src/bin/aiox.ts` 유지) | 현재 `package.json#bin` + `dev` script가 이미 가리킴, 변경 비용 0. `src/cli/`는 parser/invocation 모듈 전용 |

**판단 근거 공통점**: 6개 모두 "최소 변경 + 기존 결정 일관 + MVP 범위 보존"
방향. reversibility는 1·2·3·5·6 낮음, 4 중간. deferrability는 1·2·3·5·6 불가
(코드 진입점 정해야 테스트 작성), 4 낮음 (bin exit 테스트에 필요).

**Evolution path 노트 (1번 관련)**: 단일 invocation 파일은 명령 수 13개 기준
으로 합리. post-MVP에서 (a) 명령이 30개 넘어가거나, (b) 한 명령의 dispatch
로직이 단순 daemon call을 넘어 별도 orchestration이 필요해지면, variant별 파일
분리(옵션 B)로의 진화가 자연스러운 시점. 본 결정은 그 진화 경로를 인지하고
채택.

본 합의로 Phase B Round 1 옵션 합의 단계는 마감. 다음은 코드 변경 commit
라운드 진입.
