# Task Brief — W7 Batch 2: Daemon Core (§4~§5) 검증

## 맥락

`docs/architecture/local-agent-runtime.md`는 aiox MVP as-built 아키텍처 권위 문서다.
W7에서 이 문서를 현재 구현과 대조해 drift를 수정한다. 이 brief는 **§4(Daemon
Lifecycle and Socket Transport)·§5(Daemon API Surface)** 만 담당한다.

작업 결과는 `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`의
Evidence Ledger·(필요시)Decision Candidates·Cross-Owner Effects에 기록하고, drift가
있으면 문서를 직접 수정한다.

---

## 0. 먼저 읽어라 (규칙은 여기 있다 — 이 brief에 복붙하지 않는다)

1. `logs/AGENTS.md` → **Workspace Reset Log Sections** (규칙 1~4: IS/WHY/WILL 분류,
   line ref 끝까지 추적, current/future·stale 교차확인, "변경 없음" 2축 기준,
   Scope/Evidence Ledger/Decision Candidates/Cross-Owner Effects 템플릿)
2. `docs/architecture/AGENTS.md` (§1~§5: as-built/Target 구분, file:line 근거,
   drift 처리, decision/roadmap 참조 규칙)
3. (decision 생성 필요 시) `docs/decisions/AGENTS.md`

이 3개를 읽지 않으면 작업하지 마라. 아래는 이 배치의 **범위와 출발점**일 뿐이다.

---

## 1. 이 배치 범위

- §4.1 Daemon Lifecycle / §4.2 Socket Transport / §4.3 sendMessage 시퀀스
- §5 Daemon API Surface (RPC 메서드 표)

---

## 2. src 진입 파일 (출발점 — "확인할 답"이 아니라 탐색 시작점)

여기서 시작해 **호출·import·타입 경로를 끝까지 따라간다.** 박힌 줄번호가 시야의
상한이 되지 않게 한다(rule 1).

- `src/daemon/run.ts` — `runDaemonProcess`, shutdown 순서, stop RPC wrap, 시그널
- `src/daemon/socket-transport.ts` — UDS, NDJSON 프레이밍, request/response envelope,
  timeout, stale-path retry, transport 에러 vs daemon API 에러 분리
- `src/daemon/api.ts` — RPC 선언 표면(어떤 메서드가 소켓으로 노출되나)
- `src/daemon/state.ts` — 각 RPC의 실제 구현(Mutates/Emits/Typed errors의 진짜 source)
- `src/config/paths.ts` — 소켓 경로 결정
- `src/cli/invocation.ts`, `src/cli/parse.ts` — `_run-daemon` 진입·auto-start 분기

---

## 3. 반드시 교차 검색 (rule 2 — 현재가 아닐 수 있다)

- `history/`: `17`(step-3 daemon API lifecycle), `24`(step-8), `25`·`26`(socket
  transport — 문서 §4.2가 직접 cite), `40`(step-14 daemon/client split). → WHY 확인.
- 미래 아키텍처 출처(현재로 오인 금지): `prd/post-mvp/aiox-a2a-spec.md`(daemon API,
  socket mode/auth, ack/retry, queued flush, federation), `plans/post-mvp/`,
  `plans/post-mvp.plan.md`. **단 미래 문서의 "현재 스냅샷"도 stale일 수 있다** —
  최종 판정은 `src/` + 날짜·`history/`로.
- deferred dispatch summary(`target_binding_unconfirmed` 등)가 §5 응답 shape에
  나오면 Step 15(`history/45`~`48`, `docs/decisions/pair-slot-generalization.md`)와 연결.

---

## 4. 검증 관점 (두 축 모두 — rule 4)

식별자/메서드 존재 확인만으로 "변경 없음" 쓰지 않는다. 각 섹션을 아래 두 축으로 본다.

- **로직/계약 축**: §5 표의 각 메서드에 대해 method 이름·Mutates·Emits·**Typed errors**가
  `api.ts` 선언 + `state.ts` 구현과 일치하는가. **표에 없는데 api.ts에 있는 메서드,
  state.ts가 반환하는데 표 Typed errors에 빠진 reason**을 적극적으로 찾는다. §4.2
  transport 속성(framing·envelope·timeout·retry·에러 분리)이 `socket-transport.ts`와
  일치하는가. §4.1 lifecycle 순서·시그널·shutdown이 `run.ts`와 일치하는가.
- **현재/미래 축**: §4/§5에 기술된 동작이 현재 구현(`src/`에서 확인 가능)인지, 아니면
  미래 계획(ack/retry, queued auto-flush, socket auth, federation 등 post-mvp)인지
  분류한다. 미래 내용이 현재처럼 적혀 있으면 `Target`/`Proposed`/`Deferred` 표기로 정정.

---

## 5. 알려진 후속 (B1에서 발견, 이 배치에서 반영)

- **§5 `attachAgent` Typed errors에 `agent_already_attached` 누락(문서 line 303 기준).**
  §3 sentinel(문서 line 187-191)은 `agent_already_attached`가 `withTransaction`에서
  throw→`isAttachRollback` reclassify된다고 한다. `state.ts:572-578`와 `api.ts`에서
  이 reason이 attachAgent 클라이언트 응답으로 실제 surface되는지 확인하고, 그렇다면
  §5 표에 추가한다. (§10.1 typed error catalog 동일 누락은 W6 범위 — Evidence Ledger에
  후속으로만 남긴다.)

---

## 6. 출력

1. **Evidence Ledger rows** (검증 항목마다 1행, assimilation 로그에 추가):
   `| Topic | Source | Lines | Finding | Owner impact | Action |`
   - Finding prefix: `[Fact]`(코드 직접확인) / `[Inference]`(구조 추론) / `[Opinion]`(판단)
   - Action: `변경 없음` / `문서 수정` / `Decision 신규 생성` / `후속(Wn)`
2. **문서 수정**: drift 항목만 `docs/architecture/local-agent-runtime.md`를 직접 고친다.
   모든 as-built 주장에 `file:line`. spec contract 텍스트 복사 금지.
3. **Decision 발견 시**: WHY가 코드·문서로 복원 불가하면 Decision Candidates 행 추가 +
   `docs/decisions/` 파일 생성(`docs/decisions/AGENTS.md` 따름) + Cross-Owner Effects 행.
4. **Allowed cross-owner 밖 문서**를 고쳐야 하면 수정하지 말고 사용자에게 먼저 보고.
5. **Workflow retrospective 후보**: batch 분할, task brief, Evidence Ledger, Scope,
   agent 의견 수렴에서 생긴 시행착오나 portable 후보가 있으면 W7 assimilation 로그와
   `logs/2026-06-18-package-workflow-portable-pattern.md`에 남긴다.

---

## 7. 완료 조건

- §4·§5의 모든 검증 항목에 Evidence Ledger 행이 있다.
- drift는 문서 수정 완료(Action="문서 수정"). drift 없음은 **로직 축 + 현재/미래 축을
  둘 다 대조한 뒤에만** "변경 없음".
- `agent_already_attached` surface 여부를 코드로 판정하고 결과를 §5/Evidence Ledger에 반영.
- Workflow retrospective 후보가 있으면 W7 assimilation 로그와
  `logs/2026-06-18-package-workflow-portable-pattern.md`에 기록한다.
- assimilation 로그 Work Items에서 **W2(B2)** 를 완료로 전이하고 next pointer를 W3(B3)로.
