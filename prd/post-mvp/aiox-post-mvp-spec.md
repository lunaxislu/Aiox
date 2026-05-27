# aiox Post-MVP Spec

MVP 종료 이후로 의도적으로 유보한 항목의 누적 인덱스. 각 항목은
motivation / current state / target design / scope 4 절로 기록한다.

각 항목은 채택 시 별도 step으로 분리해 정식 design history를 만든다.
본 문서는 권위 lock이 아니라 **유보된 의도의 보존**이다.

## Authority

- 본 문서가 reject 기준이 되는 경우: 없음. Step 진입 시 별도 design
  history가 권위를 가짐.
- 본 문서가 hint로 쓰이는 경우: post-MVP step planning, scope 협상,
  "왜 MVP에서는 이렇게 하지 않았는가" 추적.

---

## P1 — Adapter dispatch registry refactor

### Motivation

Step 15 D6 lock spec는 `dispatchToPairPeer`가 `adapter[targetAgent.kind].inject(...)`
형태의 registry lookup으로 vendor adapter를 호출하는 것을 권고했다. 본 MVP
구현은 이 acceptance criteria의 본문("vendor-pair hardcode 제거 + target
agent.kind 기반 dispatch")은 만족하지만, 실제 코드는 `if (kind === "codex")
else` 분기로 처리한다 (`src/daemon/state.ts:1276`).

새로운 vendor를 추가할 때 분기 한 줄을 더 늘려야 하므로, registry 패턴이
주는 "vendor 추가 시 dispatch 코드 무수정" 장점을 누리지 못한다.

### Current state (Step 15 종료 시점)

```ts
// src/daemon/state.ts:1276
const injectResult =
  targetAgent.kind === "codex"
    ? await injectMessageIntoCodexTarget(input.message, delivery, targetAgent)
    : await injectMessageIntoClaudeTarget(input, delivery, targetAgent);
```

`injectMessageIntoCodexTarget` / `injectMessageIntoClaudeTarget`은 단순
`adapter.inject` wrapper가 아니다. 각 vendor의 **pre-inject orchestration**
(Codex: `resolveCodexReplyTarget` binding 확인 + thread id 선택 + event
발행; Claude: `claudeChannelRuntimes.has` 사전 체크 + reason normalize)이
들어 있어, 단순 registry lookup으로 갈음할 수 없는 구조다.

### Target design

옵션 a (얕은 refactor):
- 두 wrapper를 `AgentAdapter` interface 메서드로 박는다
  (예: `adapter.dispatchToTarget(input)`).
- daemon은 `adapters[kind].dispatchToTarget(...)` 한 줄.
- vendor별 orchestration은 adapter 내부로 캡슐화. dispatch 호출지점은
  깨끗해지나 분기 자체는 adapter 메서드 안으로 이동.

옵션 b (심층 refactor):
- adapter contract를 확장해 event 발행/binding resolution까지 adapter
  책임으로 이관.
- daemon은 정말 `await adapter.inject(input)` 한 줄.
- 단점: 현재 daemon에서 발행하던 `codex_delivery_target_selected` 등
  event 발행 책임이 adapter로 옮겨가면서 transactional 경계와
  observability 모델이 같이 변형된다. 변경 영향이 크다.

권장 시점에 옵션 a/b를 선택. 둘 다 Step 15 본 scope보다 큰 변형이다.

### Scope

- 본 항목 단독 step으로 진입.
- `src/adapters/contract.ts` `AgentAdapter` interface 확장.
- 각 adapter (`codex/*`, `claude/*`)에 dispatch 책임 일부 이관.
- `src/daemon/state.ts` dispatch 호출지점 단순화.
- 기존 event/observability 시맨틱 보존 검증.

### Out of scope (본 항목)

- 새 vendor 추가 자체 (가령 OpenAI / Gemini adapter). 별개 product 결정.
- Pair topology 변경 (3-way, dynamic slot). 다른 post-MVP 후보.

### Related

- Step 15 design: `history/45-step-15-pair-slot-generalization-design.history.md`
- Step 15 Phase A lock: `history/46-step-15-phase-a-decisions.history.md` §D6
- Step 15 Phase B closeout: `history/47-step-15-phase-b-closeout.history.md`

---

## P2 — Channel server boot failure surface to daemon

### Motivation

Step 15 Defensive 작업으로 `AIOX_CLAUDE_CHANNEL_PORT` 점유 상황을 typed
fail-fast(`claude_channel_port_in_use`)로 만들었지만, **이 실패는
daemon attach response에 직접 surface되지 않는다.** Claude channel server는
`claude` CLI child process 안에서 부팅되고, daemon은 token 발급 단계까지만
관여하기 때문이다.

현 surface 지점:
- Channel server child process가 stderr에 fatal JSON
  (`{event:"fatal", reason:"claude_channel_port_in_use", port, error}`)
  을 찍고 exit한다.
- 사용자는 이 JSON을 직접 파싱해 원인을 알 수 있다.

부족한 부분:
- daemon이 channel server의 부팅 실패를 알지 못한다. attach API는
  성공으로 응답한 뒤, child process가 늦게 죽는다.
- 사용자 입장에서는 "attach 성공인데 메시지가 안 간다"는 헷갈리는
  상태가 잠시 발생한다.

### Current state (Step 15 종료 시점)

- channel server: 명시 port 점유 → typed Error throw → CLI 진입점이
  stderr fatal JSON 출력 후 비정상 종료.
- daemon: child process exit code / fatal JSON을 별도로 관측하지
  않는다. 다음 inject 시점에 `claudeChannelRuntimes.has(targetName) ===
  false` 로 `target_runtime_unavailable` deferred만 surface.

### Target design

- child process가 부팅 실패 시 daemon socket으로 직접 typed 에러를
  보고하는 채널(예: child startup probe RPC). attach RPC는 channel
  server가 healthy하다는 신호를 받기 전에는 ok로 응답하지 않는다.
- 혹은 child process exit를 daemon이 관측하고, exit code + fatal JSON
  파싱 후 사용자에게 propagate.

### Scope

- daemon ↔ Claude channel server child process 간 startup
  acknowledgment 경로 신설.
- attach API response 시맨틱 변경 (성공 응답 = channel server listen
  성공까지 확인됨).
- 기존 `claude_channel_port_in_use` 외에 child process 부팅 단계의
  다른 typed 실패(예: token 검증 실패, daemon socket 미존재) 동일 경로로 surface.

### Out of scope (본 항목)

- channel server 이외의 child process (Codex runtime 등) 동일 처리는
  별개 검토. 동일 패턴 적용 가능하지만 본 항목은 Claude channel만 다룬다.

### Related

- Step 15 Phase B closeout: `history/47-step-15-phase-b-closeout.history.md` §AIOX_CLAUDE_CHANNEL_PORT
- 현재 child process surface 코드: `src/adapters/claude/channel-server.ts`

---

## Conventions

- 새 항목은 P{n} — {short title} 헤더로 누적. 번호는 채택 시점이 아니라
  기록 시점 순서.
- 각 항목 본문 절은 Motivation / Current state / Target design / Scope /
  Out of scope / Related 6 절.
- 항목이 정식 step으로 진입하면 본 문서는 갱신하지 않고 별도 design
  history가 권위를 인수한다. 본 문서의 해당 항목 헤더 끝에 `[picked up
  by history/NN]` 표기만 추가.
