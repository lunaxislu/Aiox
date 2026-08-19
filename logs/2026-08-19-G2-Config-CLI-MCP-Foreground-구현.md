---
topic: G2 Config CLI MCP Foreground 구현
description: G2(Terminal/Compose Minimum) plan Stage 2: aiox.yaml v1 schema/parser/validator, CLI attach 인자(role/description/instructions) 확장, agents_list() MCP tool, aiox host/quit foreground 실행을 구현한다. Kickoff 로그(logs/2026-08-17-G2-Kickoff-착수-전제와-설계-결정.md)의 설계 결정을 실행 단계로 옮긴다.
status: open
---

## Work Items
- [>] W1 aiox claude/codex --name에 --role/--description/--instructions 추가, aiox.yaml agents[] 필드와 매칭
- [ ] W2 agents_list() MCP tool 구현(spec §4.2 계약: peers[]에 name/type/role/description, outbound-sendable만 scoped, 대상 없으면 빈 값/안내 반환)
- [ ] W3 TUI 검증(claude·codex 둘 다) — peer 등록 시 목록에 뜨는지 먼저 확인 후 혼자일 때 빈 값 케이스 확인
- [ ] W4 aiox.yaml v1 schema+parser 구현(zod, project/instructions.global/agents[]/routes[])
- [ ] W5 Validator Rules 구현(namespace uniqueness, dangling reference, directed 중복 쌍, 별표 reserved word — 전부 parse-time error)
- [ ] W6 aiox host 구현 — 전체 agent foreground 실행, routes[] mesh+directed override wiring, agent-attach 재사용
- [ ] W7 aiox quit 구현
- [ ] W8 yaml 필드(W4) CLI 인자(W1) 매칭 정합 확인
- [ ] W9 이 stage 범위 문서 stale/gap 정합(owner 문서 반영)

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.
- 파일명 `aiox.yaml`, 명령어 `aiox host`/`aiox quit`(Kickoff W3 기결정,
  `logs/2026-08-17-G2-Kickoff-착수-전제와-설계-결정.md`).
- `agents[].command`/`agents[].config` 필드는 v1에 없다 — Phase 2로 이관됨(Kickoff 2026-08-19
  entry, W6 closeout으로 owner 문서 반영 완료).
- Validator Rules(namespace uniqueness, dangling reference, directed 중복 쌍, `"*"` reserved
  word)와 `agents_list()` MCP tool은 이미 owner spec에 `[Status: Committed target]`로
  명세돼 있다 — 이 package는 새로 설계하지 않고 그 기결정 계약을 그대로 구현한다.
  [[docs/specs/aiox-compose-contract]] §6 Validator Rules, [[docs/specs/aiox-message-lifecycle]]
  §4.2.

## Package Scope

- Revision: 1; History pointer: `2026-08-19 · controlling bootstrap — Work Items 9개와 Task Index 초기화`.
- Primary boundary: aiox.yaml v1 config 파일 지원 표면 전체 — CLI attach 인자 확장, agents_list MCP tool, yaml schema/parser/validator, aiox host/quit foreground 실행 명령어
- Related artifacts in allowed write-set:
- src/cli/parse.ts — agent-attach 인자 확장(W1), aiox host/quit 명령어(W6, W7)
- src/adapters/codex/mcp-server.ts — codex agents_list tool(W2)
- src/adapters/claude/channel-server.ts 또는 mcp-cli.ts — claude agents_list tool(W2, 정확한 위치는 W2 실행 시 확정)
- 신규 aiox.yaml schema/parser 모듈 — 경로 미정, W4 실행 시 확정(zod 기반)
- tests/ — 각 W에 대응하는 vitest 테스트(경로는 실행 시 확정)
- docs/specs/aiox-compose-contract.md §6 Validator Rules — Committed target에서 Current로 status 반영(W9)
- docs/specs/aiox-message-lifecycle.md §4.2 agents_list — Committed target에서 Current로 status 반영(W9)
- plans/g2-terminal-compose-minimum.md — Stage 2 완료 마킹(closeout)
- Excluded:
  - N/A.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: inline(package Agent Topology 기본값). W별 delegated 전환 필요성은 각 W의
  contract review에서 개별 판단하고 Task Brief revision으로 반영한다.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - N/A.
  - Activate when: large claim, public contract/security/data/release, irreversible external effect, multi-owner conflict, large blast radius, or low discovery confidence is present.

## Task Index

- Stable package key: 2026-08-19-G2-Config-CLI-MCP-Foreground-구현

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W1 | Compact | inline | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W1.md` |
| W2 | Compact | inline | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W2.md` |
| W3 | Compact | inline | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W3.md` |
| W4 | Compact | inline | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W4.md` |
| W5 | Compact | inline | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W5.md` |
| W6 | Compact | inline | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W6.md` |
| W7 | Compact | inline | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W7.md` |
| W8 | Compact | inline | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W8.md` |
| W9 | Compact | inline | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W9.md` |

## Evidence

- Current accepted evidence:
  - None yet: discovery pending.
- Evidence gaps:
  - TBD.

## Cross-Artifact Effects

- N/A.
- Reason: no accepted cross-artifact effect recorded yet.
- Activate when: primary changes affect related artifacts or out-of-scope artifacts.

## Decision Candidates

- N/A.
- Reason: no decision candidate recorded yet.
- Activate when: decision-worthy rationale or competing options appear.

## Verification Contract

- Revision: 1; History pointer: `2026-08-19 · controlling bootstrap — Work Items 9개와 Task Index 초기화`.
- Required:
  - 코드 구현 W(W1, W2, W4, W5, W6, W7, W8): `npm run typecheck`(`tsc --noEmit`), `npm test`
    (`vitest run`).
  - W3: 사람이 codex·claude 어댑터 둘 다에서 TUI로 직접 확인. 자동화 도구 없음 — pass/fail은
    사람 관찰이 evidence다.
  - W9: `scripts/check-markdown-inline-code <file>` + 대상 owner 문서(`docs/specs/aiox-compose-contract.md`,
    `docs/specs/aiox-message-lifecycle.md`)의 실제 구현 상태 대조.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 1; History pointer: `2026-08-19 · controlling bootstrap — Work Items 9개와 Task Index 초기화`.
- Criteria:
  - plan Stage 2 completion condition 충족: clean user가 `aiox.yaml`로 선언한 다중 pair
    인스턴스를 `aiox host`로 foreground 실행할 수 있고 `aiox quit`으로 종료할 수 있다.
  - W1-W9 전부 Result Consumption Gate(package-log.md Package Closeout) 통과.
  - `docs/specs/aiox-compose-contract.md` §6 Validator Rules, `docs/specs/aiox-message-lifecycle.md`
    §4.2 agents_list의 spec status가 `Committed target` → `Current`로 W9에서 flip됨.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-08-19 · controlling bootstrap — Work Items 9개와 Task Index 초기화

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-08-19 16:46 · Work Items 9개 상세 근거 — 사용자 지시 원문 보존

Task Index의 각 Objective는 한 줄로 압축했다. 원 지시의 세부 조건은 여기 보존한다(재실행 시 Task
Brief 채울 때 참조).

- **W1**: `aiox.yaml`에 있을 `agents[].role`/`description`/`instructions` 필드와 CLI attach 인자가
  1:1로 매칭돼야 한다는 게 동기다 — yaml로 선언하든 CLI로 즉석 attach하든 같은 필드 집합을 받아야
  W8(정합 확인)이 의미를 가진다.
- **W2**: `docs/specs/aiox-message-lifecycle.md` §4.2(211-227행)에 이미 `[Status: Committed target, G2]`로
  명세된 계약을 그대로 구현한다. `peers` JSON에 `role`/`description`은 있지만
  `instructions`는 없다 — instructions는 peer에게 노출되는 값이 아니라 해당 agent 자신의 프롬프트에
  주입되는 값이라 별도 흐름이다(W1의 CLI 인자로는 셋 다 받지만 MCP 응답에는 role/description만
  싣는다).
- **W3**: 검증 순서가 중요하다 — pair에 peer가 등록된 상태에서 `agents_list()` 호출 시 그 peer가
  목록에 있는지를 먼저 확인하는 게 선행 조건이고, 그 다음에 혼자일 때 빈 값/"보낼 사람 없음"
  케이스를 확인한다. 사람이 TUI로 직접(codex·claude 어댑터 둘 다) 확인한다.
- **W4**: zod가 이미 `package.json` dependency(`^4.4.3`)라 별도 도입 검토 없이 채택한다. zod
  schema가 타입 정의와 parser(`.parse()`/`.safeParse()`)를 겸하므로 "schema 정의"와 "parser
  구현"을 별도 W로 쪼개지 않았다.
- **W5**: `docs/specs/aiox-compose-contract.md` §6 "Validator Rules [Status: Committed target]"에
  이미 결정된 4개 규칙(namespace uniqueness, dangling reference, directed 중복 쌍 — array-flatten
  비교 필요, `"*"` reserved word)을 그대로 구현한다. 전부 parse-time error다.
- **W6**: `aiox host`는 정의된 agent 전부를 foreground로 실행하고 `routes[]`의 mesh-by-default +
  directed override를 wiring한다. 내부적으로 `agent-attach` primitive(`aiox claude/codex --name`,
  `src/cli/parse.ts:220-221,284`)를 재사용한다 — Kickoff W2 결정(pair CLI는 reservation 전용, host가
  attach 경로를 내부 재사용).
- **W8**: yaml 스키마(W4)와 CLI 인자(W1)가 서로 다른 필드셋을 갖지 않는지 검증하는 정합 확인이다
  — 둘 다 구현된 뒤에만 의미가 있어 W4/W1 뒤, host/quit(W6/W7) 뒤에 배치했다.
- **W9**: 이 stage 범위에서 발생하는 문서 stale/gap만 다룬다. `docs/specs/aiox-compose-contract.md`,
  `docs/specs/aiox-message-lifecycle.md`는 Validator Rules·agents_list 둘 다 이미 명세돼 있으므로
  이 bootstrap 시점에는 추가로 건드리지 않았다 — W9 실행 시 실제 구현 상태(Committed target →
  Current)로 flip하는 게 이 W의 몫이다.

정확한 번호 매핑: 사용자가 채팅에서 부른 "W6"(yaml/cli 매칭)·"W7"(문서 정합)은 사용자의 이전
제안(스키마~quit 5개) 라벨을 그대로 참조한 것이었고, 실제 순서대로 매기면 이 로그의 W8·W9에
해당한다는 걸 이전 턴에서 확인·보고했다. 내용과 순서는 어긋난 게 없다.

### 2026-08-19 16:51 · W1 착수 전 handoff 보강 — 코드 위치와 optional 여부 확정

다음 세션이 재조사 없이 W1을 바로 시작할 수 있도록 이번 대화에서 이미 직접 확인한 근거를
남긴다.

- **코드 위치**: `addAgentAttachCommand`(`src/cli/parse.ts:220-284`)가 `aiox claude`/`aiox codex`
  attach 명령을 정의한다. 현재는 `--name`(claude는 optional+수동 검증, codex는
  `requiredOption`), `--pair`, codex 한정 `--resume`만 있다. `--role`/`--description`/
  `--instructions`는 코드에 없다 — 이 함수에 옵션 3개를 추가하고 `setParsed`가 만드는
  `agent-attach` 커맨드 객체에 실어 보내면 된다.
- **optional 여부**: `docs/specs/aiox-compose-contract.md`의 Agent Catalog 표(89-91행)가 `role`/
  `description`/`instructions` 셋 다 `optional`로 이미 결정해뒀다(`role`/`description` 없으면
  discovery 응답에서 `null`, `instructions` 없으면 `instructions.global`만 적용). CLI 플래그도
  이 optionality를 그대로 따라야 yaml 선언과 CLI attach가 W8에서 정합된다 — `--name`처럼 codex만
  `requiredOption`으로 만드는 비대칭을 role/description/instructions에는 적용하지 않는다.
