# aiox A2A — Compose (declarative composition) (§6)

[[docs/specs/aiox-a2a]] is the protocol index; it owns status vocabulary, the layer model and glossary. This slice
owns the §6 compose contract and its current implementation boundary.

## 6. Compose (declarative composition)

Config load/validation과 `aiox host` orchestration은 구현되어 있다. [Status: Current] 다만 production
entry point에는 concrete view launcher가 아직 연결되지 않아, config validation 뒤 daemon/agent side
effect 전에 `aiox.invocation.no_agent_view_driver`로 거부한다. Concrete multi-surface launch와
`aiox quit`의 세부 lifecycle contract는 아직 G2에서 논의 중이다. [Status: Open/deferred]

Evidence:

- Config schema/load and semantic validation
  - [[src/config/aiox-config.ts]]
    - `src/config/aiox-config.ts:20-168`
  - [[src/config/aiox-config-validator.ts]]
    - `src/config/aiox-config-validator.ts:36-170`
- Host production boundary
  - [[src/cli/invocation.ts]]
    - `src/cli/invocation.ts:287-372`
    - `src/cli/invocation.ts:471-488`

Compose는 Docker clone이 아니다. Compose는 collaboration protocol/runtime 위에서 project
collaboration topology와 runtime projection을 선언하는 config layer다.

### Top-level Schema (`aiox.yaml`)

| 필드 | required/optional | 비고 |
|---|---|---|
| `project` | required | compose 파일 전체의 desired-state ownership label. 다른 project의 pair/agent 이름과 충돌하지 않게 하는 namespace이자, 비정상 종료 후 "이 compose가 만든 것만" 정리하는 scope다. |
| `instructions.global` | optional | 전체 agent에 주입. |
| `agents[]` | required (list) | agent catalog. 아래 Agent Catalog 참고. 여기 선언된 agent는 routing group 참여 여부와 무관하게 항상 실행된다. |
| `routes[]` | optional (list) | named routing group. 아래 Routes 참고. |

`version` 필드는 두지 않는다: pre-v1이고 이 yaml의 소비자가 daemon/CLI 자체뿐이라 마이그레이션
대상 과거 버전이 없다. breaking schema 변경이 실제로 필요해지면 그때 추가한다.

top-level `capabilities`/`policies`는 v1에서 제외하고 Phase 2로 이관한다 — policy model은
Normative target이나 capability projection/sandbox enforcement는 미구현이라는
[[docs/specs/aiox-capability-policy]] §7의 기존 원칙과 정합한 결정이다. `routes[].policy`는 그와
별개로 group 단위 확장 지점만 문서화한다(아래 Routes 참고, v1 validator는 검증·강제하지 않는다).

### Example (v1)

```yaml
project: demo

instructions:
  global: |
    # optional, 전체 agent에 주입

agents:
  - name: codex-reviewer
    type: codex
    role: reviewer
    description: API 보안 경계와 구현상의 취약점을 검토한다.
    instructions: |
      # optional, global 위에 additive로 주입

  - name: claude-frontend
    type: claude-code
    role: frontend
    description: 프론트엔드 구현을 담당한다.

  - name: qa-bot
    type: codex

  - name: claude-architect
    type: claude-code
    role: architect
    description: 전체 시스템 설계와 기술적 의사결정을 검토한다.

routes:
  - name: frontend
    members: [claude-frontend, codex-reviewer, claude-architect]
    # directed 없음 → members 전원 양방향 mesh

  - name: escalation
    members: [qa-bot, claude-architect, codex-reviewer]
    directed:
      - { from: qa-bot, to: claude-architect }
    # qa-bot → claude-architect만 단방향. 나머지 pair(qa-bot↔codex-reviewer,
    # claude-architect↔codex-reviewer)는 언급되지 않았으므로 mesh 기본값 유지.
    policy:                      # optional, v1에서는 문서상 확장 지점만
      urls:
        allow:
          - "https://github.com/*"
```

### Agent Catalog (`agents[]`)

| 필드 | required/optional | 비고 |
|---|---|---|
| `name` | required | yaml 내부에서 `routes[]`가 참조하는 사용자 선언 라벨. attach 시점에 daemon이 발급하는 실제 agentId(`sourceAgentId`/`targetAgentId`)와는 별개다. |
| `type` | required | v1 validator 허용값은 `codex`, `claude-code`만이다 — 현재 구현된 두 adapter([[docs/specs/aiox-adapter-model]] 현재 adapter matrix)와 대응한다. `type`은 vendor가 아니라 agent implementation을 선택하는 필드다: `type: codex`는 OpenAI라는 vendor가 아니라 Codex agent implementation을 가리킨다. `gpt-app`/`claude-app` 같은 값은 스키마가 향후 확장 가능함을 보여주는 문서상 예시일 뿐 v1에서 지원하지 않는다. |
| `role` | optional | 없으면 discovery 응답에서 `null`(아래 Runtime MCP Contract 참고). |
| `description` | optional | 없으면 discovery 응답에서 `null`. |
| `instructions` | optional | `instructions.global` 위에 additive로 해당 agent에만 주입. |

### Routes (`routes[]`)

각 `routes[]` 항목은 독립된 named routing group이다. `agents[]`가 카탈로그(무엇이 실행되는가)를
정의하는 것과 분리해, communication topology(누가 누구와 통신 가능한가)는 `routes[]`가 소유한다.

| 필드 | required/optional | 비고 |
|---|---|---|
| `name` | required | routing group 식별자. |
| `members` | required | 참여자 name 목록. |
| `directed` | optional | `{from, to}` pair 단위 override 목록. `to`는 단일 이름 또는 배열(한 source가 여러 target에 broadcast하는 패턴). `from`은 항상 단일 이름. |
| `policy` | optional | v1에서는 문서상 확장 지점만 존재한다 — validator가 검증하거나 강제하지 않는다. |

**Mesh와 directed override의 관계.** `members` 안의 모든 pair는 기본적으로 양방향 mesh다.
`directed`에 나열된 pair만 그 관계가 명시된 단방향으로 좁혀지며, 그 group 안에서 언급되지 않은
나머지 pair는 mesh 기본값을 그대로 유지한다 — `directed`가 group 전체의 mesh를 대체하지 않는다.

routing group끼리 member가 겹쳐도 절대 자동(전이적)으로 병합하지 않는다: `members`가 `[A,B,C]`인
group과 `[C,D]`인 group이 있어도 A↔D, B↔D 관계는 생성되지 않는다. 각 group은 독립된 통신
도메인이다. 하나의 agent는 여러 routing group에 동시에 속할 수 있다.

### Runtime MCP Contract

`routes[]` membership과 `directed` override는 config 자체가 아니라, attach된 agent에게 노출되는
MCP tool 표면의 런타임 효과로 이어진다. tool contract 본문(`send`의 `target` 파라미터,
`agents_list()` 응답 스키마)은 [[docs/specs/aiox-message-lifecycle]] §4.2가 소유한다 — 이 문서는
그 tool 표면이 반영하는 topology 소스로서 `routes[]`를 정의할 뿐, tool 계약을 복제하지 않는다.

Principles:

- Docker식 `services`, `scale`, `replica` 은유는 피한다. agent는 non-fungible participant다.
- `project`는 compose가 만든 desired state의 logical ownership label이다. `host`/`quit`
  같은 lifecycle command는 "이 compose project가 만든 것"만 대상으로 삼아야 하며,
  같은 daemon/profile 안의 unrelated manually attached agent를 소유한다고 약속하지 않는다.
- `AGENTS.md`/`CLAUDE.md` 같은 native project instruction은 read-only base layer로 둔다.
- compose-generated instruction은 aiox-launched session에만 주입되는 launch-scoped
  orchestration layer다.
- Instruction precedence는
  `host policy > native project docs > compose session instruction > user prompt > agent memory`
  순서로 본다. 여기서 native project docs는
  `AGENTS.md`/`CLAUDE.md` 같은 host-native instruction을 뜻한다.
- compose config는 OS-neutral하게 둔다. OS별 command/path/env 차이는 adapter compiler나
  recipe/plugin이 처리한다.
- native docs replacement나 global native config mutation을 기본값으로 두지 않는다.
- terminal/editor auto-layout은 core protocol이 아니다. 어떤 terminal/IDE integration이 agent별
  surface를 만들고 command를 실행할지는 host integration 경계가 소유하며, `aiox.yaml` schema나
  A2A protocol에 특정 terminal 제품을 고정하지 않는다.
- `pair`, `connect`, `pending_attach`는 future compose desired state의 seed로 볼 수 있다.
- **user-level preference와 project-level compose를 분리한다.**
  터미널 종류/view driver/기본 profile 같은 사람 취향은 user config
  (`~/.aiox/config.json`, 첫 실행 onboarding이 env 감지 — `$TERM_PROGRAM`·`$TMUX`·
  `$WT_SESSION` — 로 생성)가 소유하고, topology/capability 같은 프로젝트 계약은
  compose 파일이 소유한다. compose에 사용자 취향을 넣으면 커밋마다 팀원과 충돌한다
  (shadcn `components.json`이 "프로젝트 계약만 담아서" 작동하는 것과 같은 이유).
  설치(postinstall) 시 interactive 질문은 안티패턴(CI·비대화형 설치에서 실패) —
  묻는 시점은 첫 실행이다.
- production launcher가 없는 현재 빌드는 interactive agent surface를 묵시적으로 생략하지 않고
  daemon/agent side effect 전에 명시적으로 실패한다. [Status: Current] 최초 지원 제품, surface
  placement, 종료와 실행 중 reconciliation의 정확한 외부 계약은 아직 열려 있으며, 현재 as-built
  내부 seam은 [[docs/architecture/local-runtime-cli-and-operator-surfaces]] §9.4가 소유한다.

`aiox attach <agent>`라는 리터럴 명령어는 없다 — 실제로는 `aiox claude --name X` /
`aiox codex --name X`이며 `kind: "agent-attach"`로 분류된다(`src/cli/parse.ts:220-221,284`). 이
primitive는 foreground-only 모델에서도 core 표면으로 남는다: `pair` CLI는 reservation
전용이고(위 "future compose desired state의 seed" 원칙), `aiox host`는 다중 agent
orchestration을 전담하며 agent마다 이 `agent-attach` 경로를 내부적으로 재사용한다. compose
프로세스 전체의 reattach 시나리오는 없어졌지만, agent 단위 attach/launch 표면 자체는 사라지지
않는다.

User config도 현재 미구현 target이다. [Status: Committed target, Phase 2] 도입 시 precedence는
`CLI flag > environment > profile-scoped user config > built-in default`로 고정하고,
config에는 schema version, profile scope, validation error, migration 규칙을 둔다. 첫 실행
onboarding은 interactive TTY에서만 제안하며 CI/non-interactive 실행은 질문 없이 default 또는
명시적 오류로 끝난다. compose 파일명(`aiox.yaml`)과 discovery 규칙(cwd 고정, `--file` flag
없음)은 G2 Kickoff에서 결정됐다 — 상위 디렉토리 탐색이나 profile-scoped user config 같은
유연성은 관측된 필요가 생기면 추가한다.

Implementation review note (Compose 착수 시 사용자와 재검토):

- `host policy > native project docs > compose session instruction > user prompt > agent memory`는
  책임과 의도상 우선순위를 표현한 현재 원칙이다. 실제 runtime마다 instruction role, config
  precedence와 강제 가능 범위가 다르므로 이를 모든 adapter의 기술적 precedence로 미리
  가정하지 않는다. Compose 구현 전에 adapter별 주입 surface와 충돌 동작을 검증하고, 원칙을
  보존할 수 없는 경우 degradation 또는 runtime별 계약과 함께 사용자 승인을 받아 갱신한다.

### Validator Rules [Status: Current]

v1 schema field 구조와 아래 validator 규칙은 현재 구현되어 있다.

- `agents[].name`과 `routes[].name`은 각각 독립된 namespace다. 각 namespace 안에서 전역
  유일해야 한다(parse-time 에러) — agent 이름과 route 이름 사이의 충돌은 허용된다.
- `routes[].members`/`routes[].directed[].from`/`to`가 `agents[]`에 없는 이름을 참조하면
  parse-time 에러로 거부한다.
- `routes[].directed[]`에 같은 `{from, to}` pair가 중복 선언되면 parse-time 에러로 거부한다.
  `to`가 배열인 경우 펼쳐서 비교해야 한다(단순 문자열 비교로는 못 잡는 case가 있다).
- `agents[].name`에 예약어 `"*"`를 등록하지 못하게 막는 parse-time 검증(`send`의 broadcast
  sentinel과 충돌 방지).

Evidence:

- Validator rules
  - [[tests/unit/config/aiox-config-validator.test.ts]]
    - `tests/unit/config/aiox-config-validator.test.ts:1-482`
