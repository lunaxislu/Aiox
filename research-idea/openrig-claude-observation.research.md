# OpenRig Claude 관측·세션 만료 비교 조사

조사일: 2026-10-09. 대상: OpenRig `v0.6.8`, commit `aa126c74d5d1568a6091c037450720c552e50e49`.
OpenRig는 읽기만 했고 실행·설치하지 않았다. 아래 OpenRig 경로는 저장소 루트 기준이며
`d/`는 `packages/daemon/src`의 줄임이다. 제품 전체 비교는 [`similar-project.md`](./similar-project.md)가 소유한다.

검증 수준: subagent가 조사하고, 이 중 AIOX hook timeout, AIOX adapter의 로그인 처리 부재,
`docs/specs/aiox-runtime.md:130-152` StopFailure 계약, OpenRig Claude hook 목록에 `StopFailure`가
없다는 점은 직접 재확인했다. 나머지 OpenRig `file:line`은 subagent 보고 그대로다.

## 세션 만료 계약

### 확인 사실 — OpenRig

- 세션·인증 만료 spec/contract 문서는 없다. `docs/reference/agent-state-taxonomy.md:117-118`에
  attention code `login_required`, `codex_auth_refusal` 이름만 있다.
- 실제 동작은 pane 텍스트 매칭이다.
  - Claude: 화면에 `"Not logged in"`과 `"Run /login"`이 함께 보이면 `failed/login_required`
    (`d/domain/native-resume-probe.ts:328-331`, `:127-133`).
  - Codex: `"access token could not be refreshed"` + "sign in again"이면 `attention_required`
    (`:389-395`, `:189-195`).
  - restore·resume probe 경로에서만 동작한다. 실행 중 만료 관측 경로는 찾지 못했다.
- rate-limit
  - Claude는 statusline sidecar의 `rate_limits` 캐시(five_hour/seven_day)를 읽고, 캐시가 없으면
    "unknown"으로 둔다(`d/domain/provider/provider-signals.ts:110-205`).
  - usedPercent ≥ 100이면 큐를 resetsAt까지 park한다(`:258-324`).
  - 한도 오류 reactive tap은 Codex 좌석만 처리한다(`reactive-tap.ts`).
- Claude hook 매니페스트(`packages/daemon/assets/plugins/openrig-core/hooks/claude.json`)는
  SessionStart, UserPromptSubmit, PreCompact, PostCompact, Stop, Notification이다. `StopFailure`는
  없는데 `d/domain/activity-taxonomy.ts:162` 주석은 "Stop/StopFailure hook pair"라고 적는다.

### 확인 사실 — AIOX

- `docs/specs/aiox-runtime.md:137-152`가 StopFailure와 `quota_auto_resume_{fired,stale,disabled}`의
  상태 반영을 정한다. `rate_limit`을 임의 번역하지 않고 `cloud_credential_error`를 보존한다.
- `docs/architecture/aiox-vendor-bindings.md:740`: account_on_hold·billing_error를 별도 오류로 유지.
- 구현: `packages/adapters/claude/src/claude-observations.ts:35-45` `failureReason`, `:486-513` quota 처리.
- 로그인 만료·"Not logged in"을 다루는 계약과 코드는 없다.
- [`claude-stopfailure-rate-limit.research.md`](./claude-stopfailure-rate-limit.research.md)는 payload를
  코드로 추정했고 실제 수신은 실측하지 않았다.

### 추론

- StopFailure `error` 분류에 `authentication_failed`가 있다면 실행 중 인증 실패는 이미 `failed`와
  이유로 표시될 수 있다. 분류 존재와 실제 수신 모두 미확인이다.
- 시작 직후 로그인 화면에 멈추면 hook이 오지 않아 registry status가 없고, `aiox-preparing`에
  계속 머물 수 있다(`aiox-runtime.md:130-132` 기준).

## OpenRig의 Claude 관측

```text
activity-relay.cjs (hook)
  → POST /api/activity/hooks          d/routes/activity.ts:61
  → AgentActivityStore.recordHookEvent
  → SeatActivityService.reportEvidence :282-322
  → SSE /api/activity/events ("변경됨")  → UI가 /api/ps 재조회  :328-334
```

| 항목 | 확인 사실 |
|---|---|
| hook 설치 | 좌석 cwd의 `.claude/settings.local.json`에 병합(`d/adapters/claude-code-adapter.ts:885-965`). 소유 판정은 `node <relay path>` 문자열 일치, 파싱 불가 파일은 건드리지 않음. 전역 `~/.claude/settings.json`은 더 쓰지 않음(`:766-770`). statusline도 같은 파일(`:826-867`, 동시 쓰기 비안전 자인) |
| 명령 형태 | shell 문자열 `node "<path>"`, timeout 5초 |
| payload | `{sessionName,nodeId,runtime,generation,hookEvent,subtype,occurredAt}`만. prompt·도구 인자 제외(`activity-relay.cjs:44-78`). SessionStart면 `session_id`를 `session_identity`로 별도 전송(`:143-169`) |
| 인증 | 설치 단위 고정 토큰 `~/.openrig/activity-hook-token`(0600), daemon 재시작 후 유지(`startup.ts:527-570`). 라우트는 `!==` 비교(`activity.ts:76`) |
| daemon 꺼짐 | 1.5초 abort 후 오류를 삼킴(`activity-relay.cjs:120-141`) |
| 상태 도출 | 근거 순위: r3 `~/.claude/sessions/<pid>.json` → r2 hooks → r4 화면 입력 대기 UI → r1 pane 샘플링. hook 매핑 `agent-activity-store.ts:325-341`. 신선도 초과·generation 불일치면 `unknown`/`stale`(`:199-282`) |
| typing guard | 키 입력 감지가 아니라 운영자가 켜는 좌석별 DB 플래그(`d/domain/seat-delivery-guard.ts:88-135`). 켜지면 자동 입력을 hold하거나 409로 거절 |
| capture/transcript | 주기적 `tmux capture-pane`(`d/domain/transcript-rotation.ts:4`), Claude alternate screen 강제 해제 |
| resume·준비 | pane 텍스트 매칭 + 프로세스 계보 검증(`native-resume-probe.ts:84-173`) |

## AIOX와 비교

| 관점 | AIOX (확인 사실) | OpenRig | 의견 |
|---|---|---|---|
| hook 주입 | 실행별 `--settings`(`launch-hooks.ts:5-15`) | 프로젝트 `settings.local.json` 수정 | AIOX가 사용자 설정 보존·동시 실행에 안전 |
| 명령 형태 | `process.execPath` + args(`claude-hook.ts:10-16`) | shell 문자열 | AIOX가 PATH·shell 차이에 강함 |
| 토큰 | 실행별 `randomBytes(32)`, 종료 시 폐기(`apps/daemon/src/agent-controller.ts:647-652`) | 설치 단위 고정 | AIOX 범위가 좁음. 고정 토큰은 restart 자동 복원 전제 |
| daemon 꺼짐 | 30초 timeout 후 stderr·exit 1, external ownership의 ECONNREFUSED만 조용히 종료(`claude-hook.ts:6`, `:69-79`) | 1.5초 후 무시 | 실패 노출은 유지하되 30초는 길 수 있음(Claude의 hook 대기 방식 미확인) |
| 입력 검증 | 127.0.0.1 http만, 1MB 상한, redirect 거부(`claude-hook.ts:31-53`) | 없음 | AIOX가 엄격 |
| 시작 전 점검 | `disableAllHooks`·`allowManagedHooksOnly`·MCP 제한 거부(`claude-launch.ts:165-181`), 버전 하한(`claude-version.ts:18-30`) | restore-check에서만 | AIOX가 엄격 |
| 실패 hook | StopFailure 수신, 입력 전 실패 보관(`claude-observations.ts:370-390`) | 없음 | AIOX가 실패 이유 전달에 충실 |
| 상태 도출 | registry 감시 + StopFailure/Notification(`claude-observations.ts:515-545`) | 순위형 판정 + 신선도 | OpenRig는 "모름"을 명시 |
| 로그인 필요 | 없음 | resume 화면 매칭만 | 양쪽 모두 실행 중 만료 계약 없음 |
| 코드 품질 | 경계 명확, 같은 디렉터리 테스트 | 경위 주석·legacy env 별칭(`RIGGED_*`) 많음 | OpenRig 읽기 비용이 큼 |

## AIOX 제안

가져올 후보(중요도 순):

1. 시작 시 로그인 화면에 멈춘 상태를 `aiox-preparing`과 구분. 선행: 실행 중 만료가 StopFailure
   `authentication_failed`로 오는지 실측. 화면 문구 매칭 채택은 별도 결정 필요.
2. `docs/specs/aiox-runtime.md`에 세션 만료 계약 명시: 실행 중 실패 = StopFailure `failed`+이유,
   시작 시 미로그인 표시, 회복은 사용자가 TUI `/login`(AIOX 대행 없음). session-expiry는 이전에
   MVP에서 미룬 항목이라 재개 여부는 사용자 결정.
3. 관측 근거가 오래되면 `unknown` 표시. 기존 `registryFailure` 진단으로 충분한지 먼저 확인.
4. hook timeout 30초 단축 검토(`claude-hook.ts:6`).
5. (낮음) statusline `rate_limits`로 한도 사전 표시. 사용자 statusLine 충돌 위험.

채택하지 않을 것:

- typing guard: send-keys식 자동 입력·큐 재전달 전제. AIOX는 native inbox, 강제 ACK·재전송 거부.
- 고정 hook 토큰·`activity-endpoint.json` 탐색: daemon restart 자동 복원 전제.
- 프로젝트 `settings.local.json` 기록: 실행별 `--settings`보다 후퇴.
- `capture-pane` transcript·alternate screen 해제: AIOX는 PTY 소유, transcript JSONL 직접 감시.
- pane 텍스트를 1차 상태 근거로 사용(OpenRig taxonomy `:129-132`도 거부).
- 근거 4단계 순위·trial/promotion: 다중 런타임용 복잡도.

## 미확인

- AIOX가 `authentication_failed` StopFailure를 실제로 받는지.
- OpenRig `SeatActivityService` 내부 판정 세부.
