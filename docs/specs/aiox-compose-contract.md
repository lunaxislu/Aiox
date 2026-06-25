# aiox A2A — Compose (declarative composition) (§6)

> 컨텍스트: [[aiox-a2a]] 인덱스. 상태 어휘·layer model·glossary는 인덱스가 소유한다.

## 6. Compose (declarative composition)

**Status: Committed target, Phase 2. 현재 CLI/config에는 구현되어 있지 않다.** 아래 command와
schema 이름은 v1 compose contract를 승인할 때까지 provisional이다. Current repository
spot-check: `rg -n "compose|Compose|compose.yaml" src tests package.json README.md` finds no
compose implementation or user-facing command outside this spec.

Compose는 Docker clone이 아니다. Compose는 collaboration protocol/runtime 위에서 project
collaboration topology와 runtime projection을 선언하는 config layer다.

Top-level schema 방향:

- `version`
- `project`
- `agents`
- `routes`
- `capabilities`
- `policies`
- `instructions`

Principles:

- Docker식 `services`, `scale`, `replica` 은유는 피한다. agent는 non-fungible participant다.
- `project`는 compose가 만든 desired state의 logical ownership label이다. `up`/`down`
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
- terminal/editor auto-layout은 core protocol이 아니다. Manual attach를 portable baseline으로
  두고, tmux/VS Code tasks/Windows Terminal 같은 자동 배치는 recipe/plugin layer로 둔다.
- `pair`, `connect`, `pending_attach`는 future compose desired state의 seed로 볼 수 있다.
- **user-level preference와 project-level compose를 분리한다.**
  터미널 종류/view driver/기본 profile 같은 사람 취향은 user config
  (`~/.aiox/config.json`, 첫 실행 onboarding이 env 감지 — `$TERM_PROGRAM`·`$TMUX`·
  `$WT_SESSION` — 로 생성)가 소유하고, topology/capability 같은 프로젝트 계약은
  compose 파일이 소유한다. compose에 사용자 취향을 넣으면 커밋마다 팀원과 충돌한다
  (shadcn `components.json`이 "프로젝트 계약만 담아서" 작동하는 것과 같은 이유).
  설치(postinstall) 시 interactive 질문은 안티패턴(CI·비대화형 설치에서 실패) —
  묻는 시점은 첫 실행이다.
- 위의 "tmux/VS Code tasks/Windows Terminal 같은 자동 배치"
  recipe/plugin layer를 **view driver**(`--ui tmux|wt|iterm2|none`)로 명명한다.
  모델은 docker compose와 동형: `aiox compose up` = daemon 관리 detached 기동,
  `aiox attach <agent>` = 모든 터미널에서 동작하는 보편 표면(여기까지가 core),
  view driver = 제어 표면이 있는 멀티플렉서/터미널에만 제공하는 표시 계층.
  "어떤 터미널이든"이라는 요구는 split 제어가 아니라 attach 보편성으로 충족한다
  (macOS Terminal.app·PowerShell 콘솔·IntelliJ·VSCode 터미널 패널은 외부 split 제어
  표면이 없다). 자체 PTY 호스팅(node-pty + scrollback + resize)은 "미니 tmux" 함정 —
  detach 백엔드는 tmux에 위임한다(G2 최소 driver).

User config도 현재 미구현 target이다. 도입 시 precedence는
`CLI flag > environment > profile-scoped user config > built-in default`로 고정하고,
config에는 schema version, profile scope, validation error, migration 규칙을 둔다. 첫 실행
onboarding은 interactive TTY에서만 제안하며 CI/non-interactive 실행은 질문 없이 default 또는
명시적 오류로 끝난다. compose 파일명과 discovery 규칙은 compose 착수 전에 별도 승인한다.

Implementation review note (Compose 착수 시 사용자와 재검토):

- `host policy > native project docs > compose session instruction > user prompt > agent memory`는
  책임과 의도상 우선순위를 표현한 현재 원칙이다. 실제 runtime마다 instruction role, config
  precedence와 강제 가능 범위가 다르므로 이를 모든 adapter의 기술적 precedence로 미리
  가정하지 않는다. Compose 구현 전에 adapter별 주입 surface와 충돌 동작을 검증하고, 원칙을
  보존할 수 없는 경우 degradation 또는 runtime별 계약과 함께 사용자 승인을 받아 갱신한다.
