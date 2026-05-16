# aiox MVP 설계 결정 기록

> 작성일: 2026-05-16
> 관련 기록:
> - `history/13-aiox-rewrite-decision.history.md`
> - `prd/pre-validation/claude-codex-pre-validation.md`
> - `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`

---

## 결정

`aiox` MVP는 1:1 bridge가 아니라 1:N fan-out이 가능한 local agent
orchestrator로 만든다.

MVP에서 검증해야 하는 핵심은 YAML compose나 터미널 split 자동화가
아니다. 핵심은 다음이다.

- daemon이 agent registry, route, message, delivery, event 상태를 가진다.
- agent는 사용자가 원하는 터미널에서 foreground로 attach한다.
- route는 명시적이고 directed다.
- 한 source message는 여러 target delivery로 fan-out될 수 있다.
- durable state는 SQLite에 남고, adapter transport는 재시작 시 새로 붙는다.

## 최종 원칙

Docker의 명령어를 그대로 복제하지는 않지만, lifecycle과 observability의
mental model은 차용한다.

```text
status ~= docker ps
stop   ~= docker stop
future logs/inspect/rm/kill ~= docker logs/inspect/rm/kill
```

단, `network`라는 이름은 사용하지 않는다. Docker network는 연결 가능성에
가깝지만, `aiox route`는 directed message flow라는 더 강한 의미를 가진다.

### daemon은 registry/router/state owner다

daemon은 `aiox`의 durable state owner다.

책임:

- AgentInstance 등록/상태 관리
- pair reservation 관리
- directed route 관리
- message 및 delivery lifecycle 관리
- event 기록
- adapter connection metadata 관리

daemon은 모든 터미널/process를 직접 소유하려 하지 않는다.

### agent command는 foreground attach/run이다

`aiox codex`와 `aiox claude`는 현재 터미널에서 실행되는 foreground
attach 명령이다.

```text
aiox codex --name impl
aiox claude --name reviewer
```

각 명령은 다음을 수행한다.

1. daemon이 없으면 시작한다.
2. agent name을 확인한다.
3. daemon에 AgentInstance를 등록하거나 reconnect한다.
4. 해당 adapter를 현재 터미널에서 실행/attach한다.
5. process 종료 시 daemon에 disconnected/stale 상태를 반영한다.

### launcher default는 script/attach다

이전 결정에서 `cmux-first` launcher를 검토했지만, MVP 최종 기본값은
`script/attach`로 정정한다.

사용자는 cmux, tmux, iTerm2, Kitty, VS Code terminal 등 원하는 방식으로
터미널을 직접 나누고 각 pane에서 `aiox codex` / `aiox claude`를 실행한다.

cmux/tmux/native terminal automation은 core 책임이 아니다. MVP에서는
recipes 또는 문서화된 helper script로 시작하고, 필요하면 Post-MVP
adapter/plugin으로 승격한다.

### connect/disconnect는 explicit directed route control이다

`aiox connect <source> <target...>`는 directed route를 생성한다.

```text
aiox connect impl reviewer researcher
```

의미:

```text
impl -> reviewer
impl -> researcher
```

역방향이 필요하면 명시적으로 connect를 반대로 실행한다.

```text
aiox connect reviewer impl
aiox connect researcher impl
```

자동 pairing은 전역 기본값으로 사용하지 않는다. 1:N에서는 어떤 agent가
어떤 route에 들어가야 하는지 daemon이 추론할 수 없다.

### pair는 durable compose-like reservation이다

`aiox pair --name <pair-name>`는 process launcher가 아니다. pair는
durable reservation이다.

```text
aiox pair --name feature-x
```

의미:

- `feature-x` pair reservation을 SQLite에 기록한다.
- expected sides는 Codex 1개와 Claude 1개다.
- capacity도 Codex 1개와 Claude 1개다.
- pair reservation은 timeout이 없다.
- daemon restart 후에도 복구된다.
- MVP에는 `pair cancel`이 없다.
- `pair --name` 시점에는 AgentInstance를 만들지 않는다. agent name은
  이후 `aiox codex/claude --name ... --pair ...` attach 시점에 결정된다.

agent는 pair에 attach할 수 있다.

```text
aiox codex --name feature-x-codex --pair feature-x
aiox claude --name feature-x-claude --pair feature-x
```

두 expected side가 attach되면 daemon은 bidirectional route를 만든다.

```text
feature-x-codex -> feature-x-claude
feature-x-claude -> feature-x-codex
```

이것은 전역 자동 pairing이 아니라 사용자가 명시한 pair reservation 안에서만
일어나는 자동 connect다.

이미 한 side가 찬 pair에 같은 kind의 agent를 추가 attach하려 하면 MVP에서는
거부한다.

```text
aiox codex --name stranger --pair feature-x
  -> reject if feature-x already has a codex side
```

추가 agent를 route에 붙이고 싶으면 pair가 아니라 explicit connect를 사용한다.

```text
aiox codex --name stranger
aiox connect stranger feature-x-claude
aiox connect feature-x-claude stranger
```

따라서 MVP 구분은 다음이다.

```text
pair: codex 1 + claude 1 shortcut
connect: 1:N directed route control
```

### YAML compose는 Post-MVP다

`aiox compose up/down`은 좋은 방향이지만 MVP에서는 제외한다.

MVP에서 필요한 것은 1:N routing 자체다. YAML parser, schema validation,
compose project lifecycle, down cleanup semantics는 routing core 위의
sugar이므로 Post-MVP로 둔다.

따라서 최종 구분은 다음이다.

```text
MVP:
  1:N routing
  explicit connect/disconnect
  pair reservation

Post-MVP:
  aiox compose up/down
  YAML-driven declarative environment
```

### Compose Decision Timeline

compose 결정은 한 번에 나온 결론이 아니라 MVP scope를 줄이면서 정리된
결과다.

1. 초기 MVP 명령 정의에는 compose가 없었다. 사용자는 `aiox codex`,
   `aiox claude`, `aiox pair`, `aiox connect` 같은 imperative 명령을 먼저
   원했다.
2. Docker/compose 비유가 들어오면서 `aiox compose up/down`을 MVP에 넣는
   방안을 검토했다. 이때 `compose up = desired state 등록`, `attach =
   actual state 채움`, `daemon = reconciler`라는 해석이 나왔다.
3. 1:N declarative 환경을 YAML로 표현하는 장점도 확인했다. `aiox pair`는
   minimal inline compose shortcut으로 이해할 수 있었다.
4. 최종적으로 YAML compose는 Post-MVP로 격하했다. 이유는 YAML parser,
   schema validation, project lifecycle, down cleanup scope가 core routing
   검증과 별도이며 MVP scope를 불필요하게 넓히기 때문이다.

따라서 최종 결정은 다음이다.

```text
1:N routing: MVP
pair reservation: MVP
YAML compose up/down: Post-MVP
```

### stop은 Docker-like lifecycle transition이다

`stop`은 identity removal이 아니다.

Docker의 `stop`과 `rm`이 다르듯, `aiox stop`은 lifecycle transition이고
AgentInstance identity, routes, messages, deliveries, events는 durable state에
남는다.

MVP:

```text
aiox stop
  = aiox daemon stop
```

Post-MVP:

```text
aiox stop <agent>
aiox rm <agent>
aiox kill <agent>
```

### daemon ownership 원칙

daemon은 자신이 spawn/own한 process만 graceful stop할 수 있다.

```text
daemon-owned child:
  SIGTERM -> grace period -> SIGKILL

user-attached foreground process:
  disconnect/unregister signal only
  daemon does not forcibly kill it
```

이 원칙은 `daemon stop`, future `compose down`, future `pair cancel`,
future single-agent stop에 동일하게 적용한다.

`aiox daemon stop --daemon-only`는 Docker `live-restore`와 비슷하다.

```text
aiox daemon stop --daemon-only
  daemon만 종료
  user-attached/externally owned process는 가능한 한 살려둠
  다음 daemon start 시 durable state를 복구하고 agents는 disconnected/reconnect 대상
```

## Agent Status

MVP AgentInstance status는 4-state로 둔다.

```text
pending_attach
connected
disconnected
stale
```

의미:

- `pending_attach`: future compose처럼 이름이 포함된 desired agent state는 있지만 실제 process가 아직 attach되지 않음.
- `connected`: foreground agent가 daemon에 attach되어 메시지 수신 가능.
- `disconnected`: 한 번 attach됐지만 현재 연결이 끊김. 같은 name으로 reconnect 가능.
- `stale`: durable state는 있지만 adapter/session metadata가 오래되었거나 신뢰 불가.

`pending_attach`와 `disconnected`를 구분하는 이유는 UX 때문이다. 아직 attach되지
않은 desired agent를 disconnected로 표시하면 사용자가 장애로 오해할 수 있다.

단, MVP의 `aiox pair --name`은 agent name을 아직 모르므로 `pending_attach`
AgentInstance를 만들지 않는다. `pending_attach`는 future compose처럼 이름까지
포함된 desired agent가 먼저 선언되는 흐름을 위해 유지한다.

## Agent Name 정책

agent name은 connected/running agent 사이에서 unique해야 한다.

정책:

- 같은 name의 agent가 `connected`면 새 attach를 거부한다.
- 같은 name의 agent가 `pending_attach`면 같은 durable identity를 `connected`로 전환한다.
- 같은 name의 agent가 `disconnected` 또는 `stale`이면 reconnect/takeover를 허용한다.
- reconnect는 durable AgentInstance identity를 유지하고 adapter/session metadata만 교체한다.

## Fan-Out Schema 결정

1:N fan-out을 MVP에 넣기 때문에, logical message와 per-target delivery를
분리한다.

```text
messages
  id
  source_agent_id
  parent_message_id
  type
  content
  created_at
  updated_at

message_deliveries
  id
  message_id
  target_agent_id
  status
  idempotency_key
  created_at
  updated_at
```

`messages`는 source intent/content를 나타낸다.
`message_deliveries`는 target별 전달 상태를 나타낸다.

한 source message가 N targets에 fan-out되면 delivery row가 N개 생긴다.

MVP partial failure 정책:

- 실패한 delivery는 `failed`로 표시한다.
- 다른 target delivery는 계속 진행한다.
- quorum/aggregation은 Post-MVP다.

## Message/Delivery Lifecycle

MVP delivery status는 SQLite restart recovery spike에서 검증한 5-state로
시작한다.

```text
queued
delivering
delivered
completed
failed
```

추가 상태인 `started`, `waiting`, `cancelled`, `expired`, `stale`는 실제
adapter 구현 중 필요성이 증명될 때 추가한다. MVP PRD가 검증되지 않은
상태를 먼저 선언하지 않도록 범위를 줄였다.

SQLite restart recovery에서 검증한 기본 restart 정책은 delivery model에도
적용한다.

```text
queued      -> queued
delivering  -> queued
delivered   -> delivered
completed   -> completed
failed      -> failed
```

## Event Link 정책

events는 append-only log로 둔다. Query/debug 편의를 위해 이벤트는 필요한
대상에 nullable foreign key로 연결될 수 있다.

```text
agent_id nullable
message_id nullable
delivery_id nullable
route_id nullable
```

SQLite pre-validation에서는 `agent_id`와 `message_id`를 검증했다. MVP schema는
delivery/route 단위 status와 debug 출력을 위해 `delivery_id`, `route_id`도
열어둔다.

## Open Product Issues

다음은 MVP 구현 중 정책 결정이 필요한 product issue다.

1. Claude channel trust/confirmation policy

   Claude는 channel message를 외부/비신뢰 instruction으로 보고 사용자 확인을
   요구할 수 있다. MVP adapter는 완전 자동 실행을 가정하지 말고, wording과
   trust policy 결정을 별도로 남겨야 한다.

2. Codex thread UUID -> agent name/tag mapping

   `thread/loaded/list`는 사람 친화적 이름이 아니라 thread UUID를 반환한다.
   `aiox`의 AgentInstance name/tag와 Codex thread id를 안정적으로 매핑하는
   UX/metadata 전략이 필요하다.

3. stale agent transition policy

   `disconnected`와 `stale` 상태는 구분하지만, 얼마 후 stale로 전환할지는 아직
   정하지 않았다. `last_seen_at`, adapter kind, pending delivery 유무를 기준으로
   MVP 구현 중 정책을 확정해야 한다.

4. long-running delivery timeout policy

   MVP delivery는 자동 timeout이 없다. agent가 connected이면 `delivering`으로
   무한 머무르고, disconnected이면 `queued`로 무한 대기한다. 다음을 결정해야 한다.

   - delivery에 max age 정책을 둘 것인가 (예: 7일 후 `failed` 자동 전환)
   - source agent가 ask 시점에 per-message timeout을 지정할 수 있게 할 것인가
   - 사용자가 명시적으로 cancel하는 명령을 둘 것인가
   - timeout 발생 시 delivery status는 새 `expired` enum인가, 기존 `failed` 재사용인가

   Post-MVP `resume-safe long-running workflow`에 묶여 있지만, 실사용에서 먼저
   필요해질 가능성이 커서 별도 issue로 추적한다. vault `aiox-message-lifecycle.md`의
   "에이전트 상태와 배달의 상관관계" 섹션이 현재 documented 동작 (timeout 없음).

5. AI agent session expiry handling

   adapter가 다루는 외부 세션은 여러 이유로 만료될 수 있다.

   - Claude development channel/MCP server 연결 idle timeout
   - Codex `app-server` WebSocket idle disconnect
   - Codex thread가 일정 시간 후 unload/소실
   - 사용자 auth token/세션 만료 (Claude, Codex 양쪽)

   결정 필요:

   - adapter가 만료를 어떻게 감지하는가 (heartbeat, WS close, thread/loaded/list
     polling, API error 감지 등)
   - 감지 후 agent를 자동으로 `stale`로 전환할 것인가, `disconnected`로 둘 것인가
   - in-flight delivery는 어떻게 처리하는가 (재시도, 즉시 failed, 사용자 알림 후 대기)
   - reconnect 시도 정책 (자동 backoff, 사용자 수동, 새 attach 명령 필요)
   - source agent에게 만료 사실을 어떻게 surface하는가

   이 정책은 #3 stale 판정과 별개다. #3은 daemon 관점의 시간 기반 판정이고,
   #5는 adapter가 외부 세션 단절을 능동 감지하는 시나리오다.

## MVP Command Set

MVP command set은 다음 13개로 확정한다.

### Daemon lifecycle

```text
aiox daemon start
aiox daemon stop
aiox daemon stop --daemon-only
aiox daemon restart
aiox daemon status
```

### Agent attach

```text
aiox codex --name <name> [--pair <pair-name>]
aiox claude --name <name> [--pair <pair-name>]
```

### Routing

```text
aiox connect <source> <target...>
aiox disconnect <source> <target...>
```

### Pair reservation

```text
aiox pair --name <pair-name>
```

### Global

```text
aiox status
aiox stop
aiox doctor
```

`aiox daemon status`는 daemon pid/socket/db/uptime 중심이다.
`aiox status`는 daemon + agents + pairs + routes + deliveries 요약이다.

## Post-MVP

다음은 MVP에서 제외한다.

- `aiox compose up/down`
- `aiox logs <name>`
- `aiox inspect <name|route>`
- `aiox stop <agent>`
- `aiox rm <agent>`
- `aiox kill <agent>`
- `aiox pair cancel <name>`
- YAML-driven declarative environment
- GUI terminal native split adapter
- shared Codex app-server optimization
- fully resume-safe long-running workflow
- quorum/aggregation routing

## Module Layout 정정 (history/13의 초기 안에서 변경)

`history/13-aiox-rewrite-decision.history.md`에 명시된 초기 모듈 구조는 그 후 합의로
4가지 정정이 일어났다. 현재 권위 구조는 `prd/mvp/aiox-mvp-spec.md`의 "Architecture"
섹션 안 "Module Layout"이다.

정정 4가지:

1. `cli/commands/`에 `connect.ts`, `disconnect.ts` 추가. 13개 MVP 명령 set 확정 시
   합류. 자동 pairing이 아니라 explicit directed route control을 채택한 결과다.
2. `core/`에 `pairs.ts`와 `deliveries.ts` 추가. pair reservation entity와
   `message_deliveries` 분리 결정 반영. 1:N fan-out을 MVP에 넣은 결정의 직접 결과다.
3. `launcher/`의 default를 `cmux.ts`/`tmux.ts`에서 `script.ts`/`attach.ts`로 재정렬.
   `cmux`/`tmux`는 `recipes.ts` 안의 shell helper로 격하한다. launcher default가
   `cmux-first`에서 `script/attach`로 정정된 결과다.
4. `adapters/<kind>/launcher.ts` (adapter binary invoke)와 `src/launcher/` (terminal
   placement) 책임 분리를 명시. 두 launcher가 같은 layer로 보이지 않도록.

각 정정의 근거는 위 섹션들에 분산되어 있다.

## Architecture 다이어그램 정정 (PRD review 반영)

`prd/mvp/aiox-mvp-spec.md`의 Architecture 섹션은 PRD 작성 직후 review에서 3가지 정정을
거쳤다. 권위 다이어그램은 PRD 쪽이고, history는 어떤 오해를 피했는지만 짧게 기록한다.

1. **Codex `app-server`는 daemon process 안에서 host되지 않는다.** 별도 Codex CLI process다.
   daemon은 이를 spawn/supervise하거나 외부에서 띄운 것에 WS client로 connect한다.
   "in-process host"라고 쓰면 구현자가 라이브러리처럼 내장하려고 오해할 수 있어 표현을 정정했다.
2. **Claude channel hub도 daemon이 in-process로 직접 host하지 않는다.** 검증한 PoC는
   Claude CLI가 MCP channel server를 stdio로 자식 process로 load하고, 그 server가
   HTTP ingress를 노출하는 구조였다. PRD topology를 4-layer로 분리해 그 구조를 보존했다.
3. **`turn/start`는 injection 경로다.** source에서 router로 메시지를 꺼내는 경로가 아니다.
   초기 Message Flow 다이어그램에서 방향이 거꾸로 보였던 부분을 Outgoing / Injection / Reply
   3단계로 재구성해 정정했다.

## 다음 구현 순서

MVP implementation은 TDD로 다음 순서가 적합하다.

1. core type/model tests
2. SQLite schema/repository tests with `message_deliveries`
3. daemon API tests with fake in-process transport
4. CLI command parsing tests
5. route/connect fan-out tests
6. pair reservation tests
7. fake adapter integration tests
8. Codex app-server adapter skeleton
9. Claude channel adapter skeleton
10. doctor/status output
