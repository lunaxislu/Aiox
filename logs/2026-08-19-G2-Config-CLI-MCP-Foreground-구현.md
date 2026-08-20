---
topic: G2 Config CLI MCP Foreground 구현
description: G2(Terminal/Compose Minimum) plan Stage 2: aiox.yaml v1 schema/parser/validator, CLI attach 인자(role/description/instructions) 확장, agents_list() MCP tool, aiox host/quit foreground 실행을 구현한다. Kickoff 로그(logs/2026-08-17-G2-Kickoff-착수-전제와-설계-결정.md)의 설계 결정을 실행 단계로 옮긴다.
status: open
---

## Work Items
- [x] W1 aiox claude/codex --name에 --role/--description/--instructions 추가, aiox.yaml agents[] 필드와 매칭
- [x] W2 agents_list() MCP tool 구현(spec §4.2 계약: peers[]에 name/type/role/description, outbound-sendable만 scoped, 대상 없으면 빈 값/안내 반환) + stale-peer 재설계(agent 이탈 시 row 물리 삭제) — revision 5 Accept, 이 로그 최신 entry와 tasks/W2.md 참고
- [x] W3 TUI 검증(claude·codex 둘 다) — peer 등록 시 목록에 뜨는지 먼저 확인 후 혼자일 때 빈 값 케이스 확인
- [ ] W4 aiox.yaml v1 schema+parser 구현(zod, project/instructions.global/agents[]/routes[])
- [ ] W5 Validator Rules 구현(namespace uniqueness, dangling reference, directed 중복 쌍, 별표 reserved word — 전부 parse-time error)
- [ ] W6 aiox host 구현 — 전체 agent foreground 실행, routes[] mesh+directed override wiring, agent-attach 재사용
- [ ] W7 aiox quit 구현
- [ ] W8 yaml 필드(W4) CLI 인자(W1) 매칭 정합 확인
- [ ] W9 이 stage 범위 문서 stale/gap 정합(owner 문서 반영)
- [x] W10 W1/W2 independent review correction — Codex agent departure, atomic lifecycle cleanup, removed-surface cleanup, and W1/W2 document/test alignment

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

- Revision: 3; History pointer: `2026-08-19 22:54 · W2 Task Brief revision 5 확정` 및
  `2026-08-19 · W2 revision 5 Accept — stale-peer 재설계 result review`.
- Primary boundary: aiox.yaml v1 config 파일 지원 표면 전체 — CLI attach 인자 확장, agents_list MCP tool, yaml schema/parser/validator, aiox host/quit foreground 실행 명령어
- Related artifacts in allowed write-set:
- src/cli/parse.ts — agent-attach 인자 확장(W1), aiox host/quit 명령어(W6, W7), disconnect 커맨드 제거(W2)
- src/cli/invocation.ts — agent-attach 인자를 attachAgent 호출에 실어보내는 wiring(W1), disconnect case 제거(W2)
- src/daemon/state.ts — AttachAgentRequest에 role/description/instructions 필드 추가(W1), agent 이탈 시 row/route 물리 삭제 재설계 + route-level disconnect 제거(W2)
- src/daemon/api.ts — agents_list 응답 매핑(W2), disconnect API 표면 제거(W2)
- src/store/repositories/agents.ts — StoredAgent/AttachStoredAgentRequest에 role/description/instructions 필드 추가(W1), 재연결 분기 제거 + removeByName/removeAllConnected(W2)
- src/store/repositories/routes.ts — removeAllForAgent 신규, route-level disconnect() 제거(W2)
- src/store/schema.ts — role/description/instructions 컬럼(W1), applyMigration7 stale row 정리(W2)
- src/core/agents.ts — AgentInstanceStatus를 "connected" 단일 리터럴로 축소(W2)
- src/adapters/codex/mcp-server.ts — codex agents_list tool(W2)
- src/adapters/claude/channel-server.ts — claude agents_list tool(W2)
- docs/architecture/local-runtime-cli-and-operator-surfaces.md, local-runtime-daemon-transport-api.md, local-runtime-store-and-repositories.md, local-runtime-errors-events-smoke.md, local-runtime-claude-adapter.md, local-runtime-codex-adapter.md, local-runtime-gaps-and-targets.md — route-level disconnect·agent status flip 서술을 물리 삭제 재설계에 맞게 정합(W2)
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
| W10 | Compact | delegated | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W10.md` |
| W1 | Compact | inline | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W1.md` |
| W2 | Compact | delegated | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W2.md` |
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

### 2026-08-19 17:01 · W1 착수 전 discovery — storage wiring 범위 gap 발견과 귀속 결정

W1 착수 전 코드 흐름 추적(handoff가 언급한 `src/cli/parse.ts:220-284`에서 시작해 outbound 경로를 끝까지 따라감) 결과, Package Scope allowed write-set에 gap을 발견했다.

- `addAgentAttachCommand`가 만드는 `agent-attach` ParsedCommand는 `src/cli/invocation.ts:159-167`에서 `api.attachAgent()`로 전달된다.
- `AttachAgentRequest`(`src/daemon/state.ts:266-273`)와 `StoredAgent`/`AttachStoredAgentRequest`(`src/store/repositories/agents.ts:5-26`) 모두 `role`/`description`/`instructions` 필드가 없다.
- W2가 구현할 `agents_list()`는 spec(`docs/specs/aiox-message-lifecycle.md:211-221`)상 `peers[].role`/`description`을 반환해야 하는데, attach 시점에 이 값이 daemon에 저장되지 않으면 W2가 읽을 데이터가 없다.
- 그런데 Package Scope의 allowed write-set(이 로그 42-50행)에는 `src/daemon/state.ts`, `src/store/repositories/agents.ts`, `src/cli/invocation.ts`가 빠져 있었다 — W1을 `src/cli/parse.ts`만으로 완료하면 CLI 옵션이 파싱만 되고 어디에도 저장되지 않는 dead code가 된다.

이 storage wiring을 W1과 W2 중 어디에 귀속시킬지는 로그에 근거가 없어 사용자에게 질의했다.

결정(사용자 선택): W1에 포함한다. W1 Objective("CLI attach 인자 확장, aiox.yaml agents[] 필드와 매칭")가 이미 attach 경로 전체를 함의하므로, parse.ts → invocation.ts → daemon/state.ts(AttachAgentRequest) → store/repositories/agents.ts(StoredAgent)까지 end-to-end로 W1에서 마무리한다. W2(agents_list MCP tool)는 이미 저장된 값을 읽기만 하면 된다.

Package Scope allowed write-set에 `src/daemon/state.ts`, `src/store/repositories/agents.ts`, `src/cli/invocation.ts` 3개를 W1 소속으로 추가하고 Revision을 올린다(다음 entry).

### 2026-08-19 17:06 · W1 구현 완료 — CLI attach 인자 확장과 daemon storage wiring

W1을 W1 착수 전 discovery에서 확정한 end-to-end 범위(parse.ts → invocation.ts → daemon/state.ts → store/repositories/agents.ts)로 구현했다.

- `src/cli/parse.ts`: `ParsedCommand`의 `agent-attach` variant에 optional `role`/`description`/`instructions` 추가. `addAgentAttachCommand`(codex/claude 공통)에 `--role`/`--description`/`--instructions` 옵션 3개 추가 — `--name`/`--pair`/`--resume`처럼 codex/claude 비대칭 없이 둘 다 optional로 동일 처리(spec Agent Catalog 표 근거).
- `src/cli/invocation.ts`: `agent-attach` 케이스의 `api.attachAgent()` 호출에 세 필드를 undefined-omit 패턴(기존 pairName/resumeSessionId와 동일)으로 전달.
- `src/daemon/state.ts`: `AttachAgentRequest`에 optional 세 필드 추가, `attachAgent()` 구현의 `agents.attach()` 호출에 전달.
- `src/store/repositories/agents.ts`: `StoredAgent`/`AttachStoredAgentRequest`/`AgentRow`에 `role`/`description`/`instructions`(`string | null`) 추가. `attach()`의 insert/update 양쪽 모두 `request.field ?? null` 패턴(기존 `adapterSessionId` 처리와 동일)으로 반영 — 재attach 시에도 매번 request 값 기준으로 덮어쓴다.
- `src/store/schema.ts`: `agents` 테이블 CREATE문에 세 컬럼 추가 + 기존 DB용 `applyMigration6`(alter table, columnExists guard) 추가, `applySchema`에서 호출.

검증: `npm run typecheck` PASS. `npm test` 649/649 PASS(수정 전 5개 실패 — 새 컬럼으로 인한 기존 snapshot 불일치, 전부 예상된 결과라 assertion을 갱신). 새 동작에 대한 신규 테스트 추가: `tests/unit/cli/parse.test.ts`(codex/claude 각 1개, role/description/instructions 동시 파싱), `tests/unit/cli/invocation.test.ts`(codex attach에 세 필드가 attachAgent 호출로 그대로 전달되는지).

instructions의 실제 프롬프트 injection 로직(agent 자신에게 주입하는 흐름)은 이번 W1 범위 밖이다 — attach 시점에 daemon에 저장하는 것까지만 W1이고, injection은 로그에 "별도 흐름"으로만 언급돼 있고 어느 W에 귀속되는지 아직 확정되지 않았다. host 구현(W6) 착수 시 재확인이 필요하다.

### 2026-08-19 17:24 · W1 code review(sonnet subagent) 반영 — Finding 1 확정, Finding 2/3/4 수정

W1 구현 완료 뒤 sonnet subagent에게 code-review(high 레벨)를 위임해 4개 finding을 받았고, 사용자가 각각에 대한 처리 방향을 결정했다.

**Finding 1(재attach 시 role/description/instructions 초기화)**: `src/store/repositories/agents.ts:88-101`의 재연결 분기에서 request에 값이 없으면(undefined) 기존 값을 `null`로 덮어쓴다. 사용자 결정: 현재 동작(매번 request 값이 source of truth, 미지정 시 초기화) 유지. 코드 변경 없음 — 의도를 명확히 하는 주석만 추가(`agents.ts:96` 위).

**Finding 2(빈 문자열과 미지정 미구분) 반영**: `src/cli/parse.ts`에 `requireNonEmptyText(value, fieldLabel)` 헬퍼 신규 추가(기존 `requireNonEmptyName`은 이름 전용 에러 메시지+control character 검증이 있어 role/description/instructions 같은 자유 텍스트에 그대로 재사용 부적절 — trim 검증만 하는 별도 함수로 분리). `--role`/`--description`/`--instructions`에 각각 적용, 빈 문자열이면 `aiox.invalidOptionValue` 코드로 CliParseError. 신규 테스트 3개(`tests/unit/cli/parse.test.ts`) 추가.

**Finding 3(undefined 전달 패턴 불일치) 반영**: `src/daemon/state.ts:680` 부근, `agents.attach()` 호출에서 role/description/instructions를 이 파일의 `daemonSocketPath` 패턴과 동일한 undefined-omit spread로 통일.

**Finding 4(help 텍스트 미갱신) 반영**: `src/cli/parse.ts`의 `addAgentAttachCommand` `.description()` 문구에 `--role`/`--description`/`--instructions`를 추가.

검증: `npm run typecheck` PASS. `npm test` 652/652 PASS(신규 3건 포함, 기존 649건 회귀 없음).

### 2026-08-19 17:28 · W2 실행 모드 전환 — inline에서 delegated로(사용자 지시, controlling은 위임+검토 역할)

사용자 지시: W2 실행 시 controlling(coi)이 직접 codex/claude adapter 코드를 작성(Executing)하지 않고, subagent(들)에게 실행을 위임한 뒤 그 결과를 검토(Reviewing/Controlling)하는 역할로 좁힌다.

이는 package Agent Topology(references/package-log.md "Agent Topology and Execution Modes")의 delegated execution mode 전환에 해당한다 — Execution default는 inline(bootstrap 시점 기본값)이지만, "W별 delegated 전환 필요성은 각 W의 contract review에서 개별 판단"하도록 Workflow / Agent Plan에 이미 열려 있던 경로다.

반영:
- `logs/packages/.../tasks/W2.md` Identity의 Execution mode를 inline → delegated로 변경, Task Brief revision 2로 올려 Agent Topology 항목 신설(controlling은 Task Brief 확정+result review만 수행, codex/claude 두 adapter 표면 구현은 subagent에게 위임).
- controlling log Task Index(이 로그 73행 표)의 W2 Mode 컬럼을 inline → delegated로 동기화.

W2 실행 시 subagent에게 위임할 때는 W2.md의 확정된 Task Brief(Scope/allowed write-set/Required reads는 아직 discovery 전이라 비어 있음 — delegate 전에 먼저 채워야 함)를 근거로 지시하고, candidate result가 돌아오면 controlling이 source·산출물·검증 결과를 재검토한 뒤 accept/reject를 이 로그에 기록한다.

### 2026-08-19 17:33 · W2 delegate 전 controlling discovery 완료 — Task Brief revision 3 확정

Delegated 전환(직전 entry) 뒤, subagent에게 위임하기 전 controlling(coi)이 spec과 코드를 직접 추적해 W2 Task Brief의 빈 계약(Scope/Excluded/Allowed write-set/Required reads/Predecessor/Completion 등)을 채웠다.

핵심 발견: outbound-sendable 판정 로직은 이미 `src/daemon/state.ts`의 `runSendMessageTransaction`(routes repository의 `sourceAgentId` 필터, `state.ts:2819-2821`)에 존재하고, `dispatchToPairPeersNow`(`state.ts:1930-1990` 부근)가 `agents.list()`에서 target을 매칭하는 패턴을 이미 쓰고 있어 그대로 재사용 가능하다. `role`/`description`은 W1에서 이미 daemon에 저장돼 있다. 따라서 W2는 새로 라우팅 개념을 설계할 필요 없이, 기존 `routes`/`agents` repository를 읽는 daemon API를 신설하고 두 adapter(`src/adapters/codex/mcp-server.ts`, `src/adapters/claude/channel-server.ts`)에 `agents_list` tool을 등록하는 것으로 범위가 좁혀진다.

`AgentRepository`에 `findById`가 없다는 것도 확인했다 — 기존 코드가 이미 `list()` 필터 패턴을 쓰고 있으므로 신규 메서드를 추가하지 않고 그 관례를 따르기로 했다.

채운 계약의 전문은 `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W2.md` Task Brief revision 3이 소유한다(로그에 재복사하지 않음).

Next: 이 Task Brief를 근거로 subagent에게 W2 실행을 위임한다.

### 2026-08-19 17:53 · W2 candidate result review 완료 — Accept, auth residual risk 기록

subagent(general-purpose)에게 위임한 W2(`agents_list()` MCP tool) candidate result를 controlling이 직접 재검토했다.

검증: `src/daemon/state.ts`(`listReachablePeers`), `src/daemon/api.ts`(`mapPeerType`), 두 adapter(`src/adapters/codex/mcp-server.ts`, `src/adapters/claude/channel-server.ts`) diff와 신규/확장 테스트를 직접 읽고 `docs/specs/aiox-message-lifecycle.md` §4.2 계약과 대조했다. `npm run typecheck`/`npm test`를 직접 재실행해 676/676 PASS를 확인했고 subagent self-report와 일치했다. Allowed write-set 밖(`src/store/repositories/agents.ts`, `src/store/schema.ts`)은 건드리지 않았다.

이의 제기: subagent가 스스로 짚은 4개 judgment call 중 3개(kind→wire type 매핑, spec 문서 미수정은 W9 소관, zod schema 스타일)는 근거가 타당했다. 나머지 하나 — "`listReachablePeers`에 token 인증이 없는 게 `status()`/`retransmitUnconfirmedDelivery`와 동일 수준이라 regression 아니다" — 는 직접 확인한 결과 부정확했다: `status()`는 MCP tool로 노출되지 않는 CLI 전용 API이고, `retransmitUnconfirmedDelivery`는 추측 불가능한 `deliveryId`를 사실상 capability token으로 쓴다. 반면 `agents_list`는 `send`/`reply`와 동일하게 MCP tool로 각 agent 프로세스에 노출되면서도 `authorizeCodexIngress`(token+등록된 runtime 검증)가 빠져 있어, 추측 가능한 `agentName`만으로 다른 agent인 척 그 agent의 outbound peer 목록을 조회할 수 있다.

이 사실을 사용자에게 보고하고 처리 방향(token 인증 추가 / 별도 Work Item 분리 / 현재 상태로 accept)을 질의했다. 사용자 결정: 현재 상태로 accept — 조회 전용(부작용 없음)이고 로컬 daemon 소켓 접근을 이미 전제하는 기존 위협 모델과 일관된다는 판단. 별도 Work Item으로 분리하지 않는다.

판정: **W2 Accept**. codex·claude 두 adapter 모두 spec §4.2 계약(peers 필드, outbound-sendable-only scoping, null 렌더링, 빈 배열 정상 응답, directed route 단방향 제외)대로 `agents_list()`를 제공한다. 상세 근거·diff 요약·residual risk 전문은 `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W2.md` Result / Verification 섹션이 소유한다(로그에 재복사하지 않음).

Next: W3(사람이 codex·claude 어댑터 둘 다에서 TUI로 agents_list 직접 확인 — peer 등록 시 목록에 뜨는지 먼저, 그다음 혼자일 때 빈 값 케이스).

### 2026-08-19 20:27 · W3 사람 TUI 검증 완료(등록/빈값 PASS) — stale-peer 버그 발견, W2 재오픈으로 handoff

사용자가 codex·claude 두 adapter에서 직접 TUI로 W3를 검증했다.

**검증 결과(PASS)**: pair로 attach된 claude(`reviewer`, role/description 있음)·codex(`impl`) 둘 다에서 상대 쪽 `agents_list()` 호출 시 정상적으로 상대가 `peers`에 뜸(예: `{"peers":[{"name":"impl","type":"claude-code","role":"impl","description":"작업자"}]}`). 혼자일 때(peer 없음) 빈 값 케이스도 확인됨. W3 Objective(두 케이스) = **Accept**.

**발견된 오류(원인 미조사, 사용자 지시로 이번 세션에서 코드 조사하지 않음)**: `name`이 `impl`인 agent를 종료시킨 뒤에도, 그 agent와 pair였던 상대 agent의 `agents_list()`가 다시 빈 값을 반환하지 않고 종료된 `impl`이 계속 `peers`에 남아 있다. 사용자가 실제 TUI에서 재현한 사실이다. 코드 레벨 원인은 다음 세션으로 넘긴다.

이 버그는 별개 Work Item이 아니라 W2(`agents_list()` 구현) 자체의 미해결 후속이다 — 사용자 지적에 따라 새 Work Item을 만들지 않고 **W2를 completed에서 다시 `[>]`로 재오픈**했다. 상세 검증 결과는 `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W3.md` Result / Verification 섹션이 소유한다(로그에 재복사하지 않음).

Next: W2(재오픈) — 위 stale-peer 재현 경위를 바탕으로 원인을 코드에서 직접 확인한 뒤 수정한다. W4(yaml schema) 등 나머지 stage 2 Work Items는 W2 재작업 뒤로 미룬다.

### 2026-08-19 22:41 · W2 재오픈 — stale-peer 원인 조사 완료, disconnect 개념 재설계 확정(구현 착수 전 세션 종료 — 다음 세션 handoff)

이번 세션에서 W2 재오픈(stale-peer 버그) 원인을 코드로 확인하고, 사용자와 설계를 여러 차례
반복해 최종안까지 확정했다. **코드 변경은 하지 않았다** — Task Brief revision 5 작성과 구현은
다음 세션 몫이다.

### 2026-08-20 13:48 · 2026-08-20 W1/W2 independent review — W2 Codex channel departure contract mismatch and deferred findings

- User requested an independent review of the current W1/W2 accepted changes, including unnecessary legacy/test code and documentation drift. Three read-only reviewers plus controlling re-check found a W2 contract mismatch: `disconnectCodexChannel` removes only its runtime/token, while Task Brief revision 5 and Result both classify it as an agent-level departure path that must delete the agent row and all related routes. If this API represents Codex agent departure, a peer can remain in `agents_list()`; if it is only transient channel deregistration, the accepted W2 contract/result must be corrected. No code change or Work Item transition made pending user direction.
- Additional candidate findings: non-stop departure cleanup deletes agents and routes in separately committed operations despite no FK cascade; `npm run disconnect` still invokes the removed command; route-level disconnect pure code/test and `core/agents` pure attach code/test remain dead legacy surfaces; W1 metadata/agents_list architecture and spec documentation are stale or deliberately deferred to W9; migration/history and instructions persistence coverage need review. `npm run typecheck` passed. Default `npm test` failed across socket/adapter suites when parallel, while `npx vitest run --maxWorkers=1` passed 671/671 and W2-focused suites passed. The test-runner concurrency failure is recorded as a verification-environment/test-isolation finding, not attributed to W2 without a clean-baseline comparison.
- Next: present findings with evidence and ask the user whether Codex channel disconnect is a true agent departure; that decision determines whether W2 must reopen for correction or its recorded contract must be amended.

## 확인한 사실(root cause)

- `listReachablePeers`(`src/daemon/state.ts:1426-1448`)는 `routes.list()`로 얻은 target agentId를
  `agents.list()`에서 매칭만 하고 `agent.status`를 전혀 안 본다. `agents.list()`
  (`src/store/repositories/agents.ts:199-204`)는 `where` 없이 테이블 전체를 반환한다.
- agent row는 `markByNameDisconnected`/`markAllConnectedDisconnected`로 `status`만 바뀌고
  **row가 삭제되는 경로는 코드 전체에 없다**(`delete from agents` grep 0건). route도 마찬가지로
  자동 삭제 경로가 없었다(기존에 있던 `routes.disconnect()`는 사람이 CLI로 명시 호출할 때만
  동작 — 아래 참조).
- 파생 문제 2건을 추가로 발견:
  - pair slot 점유도 status를 무시한다. `readAttachedSlots`(`src/store/repositories/pairs.ts:265-271`)가
    `pair_slot is not null`만 보고 status를 안 봐서, disconnected agent가 pair slot을 영원히
    점유해 **다른 새 agent가 그 슬롯에 못 들어간다**. 사용자가 처음 제기한 우려("다른 종류의
    새 agent가 못 들어가는 거 아니냐")가 실제로 여기서 발생함을 확인했다.
  - `agents.attach()`의 재연결 분기(`src/store/repositories/agents.ts:88-124`)는 UPDATE문에
    `kind`가 없어 같은 이름 재사용 시 kind가 조용히 안 바뀐다(예: `impl`이 codex로 attach했다
    disconnect 후 같은 이름으로 claude가 attach해도 row의 kind는 `"codex"`로 남음). — 이 항목은
    최종 설계(아래)에서 재연결 분기 자체가 없어지며 자동으로 해소된다.

## 설계 반복 경위(중간안 → 최종안)

1. 1차안(기각): `listReachablePeers`에 `status==='connected'` 필터만 추가. pair slot·kind 문제를
   안 건드려 범위가 너무 좁다고 사용자가 반려.
2. 2차안(기각): row는 유지하고 disconnect 시 `pairId`/`pairSlot`만 null로 clear + route는 별도
   hard-delete 메서드로 정리 + kind 버그 수정. 이 과정에서 기존에 이미 있던 CLI
   `aiox disconnect <source> <target...>`(`src/cli/parse.ts:237,353-375`,
   `src/store/repositories/routes.ts:75-100` `disconnect()` — hard delete, 전용 테스트
   `tests/unit/daemon/disconnect-store.test.ts` 존재)를 발견. 이건 "살아있는 agent끼리 route
   하나만 선택적으로 끊기" 기능으로, agent 생존 여부와 무관한 별개 개념이었다.
3. 최종안(사용자 확정): **"disconnect"라는 별도 개념을 없앤다. agent가 살아있냐(connected)
   아니냐만 있다.** agent가 나가면(프로세스 종료 감지) row를 status flip이 아니라 **물리
   삭제(DELETE)**한다. 재연결(같은 이름이든 다른 이름이든)은 항상 fresh insert다. 파생 결과:
   - `agents.attach()`의 "existing row 재사용" 분기(88-130행)가 통째로 없어진다 — `findByName`이
     뭔가 찾았다는 건 곧 "그 이름이 지금 connected"라는 뜻만 남는다(disconnected row는 존재
     자체가 없음). 매 attach는 항상 새 id INSERT.
   - kind 버그(위 사실 항목)는 재연결 분기가 사라지므로 별도 수정이 불필요해진다.
   - pairId/pairSlot은 항상 null로 시작 — 재연결 시 `--pair` 재지정 필요(이미 사용자 승인,
     같은 이름이든 다른 이름이든 동일하게 적용).
   - route는 agent row 삭제와 별도로, 그 agent가 source/target인 route 전부를 명시적으로
     hard-delete해야 한다(schema에 FK cascade 없음 — `src/store/schema.ts` routes 테이블에
     `references` 없음, 자동 정리 안 됨). 신규 repository 메서드 필요(가칭
     `routes.removeAllForAgent(agentId)`, `where source_agent_id=? or target_agent_id=?`).
   - CLI/daemon의 route-level `disconnect` 기능(위 2번에서 발견한 것) **전체 삭제**: 살아있는
     agent끼리 route만 선택적으로 끊는 방법 자체가 없어진다. 유일한 방법은 agent 자체를
     종료(그러면 그 agent의 다른 route도 전부 같이 사라짐 — 이미 사용자 승인).

## 안전성 검증(사실, fork 위임 결과를 직접 재검증함)

- agent id를 참조하는 모든 소비 지점(`src/daemon/state.ts` 999·1568·2237·2346·2419·2550·2777·3011,
  `src/cli/format.ts:147` 등)이 이미 `?? "unknown"` 또는 명시적 not-found 분기를 갖고 있어, agent
  row가 사라져도 크래시 지점이 없다(전수 grep으로 직접 재확인).
- `routeId`를 저장하는 모든 지점(`deliveries.ts`/`events.ts`/`state.ts`/`api.ts`)은 전부
  write-only pass-through이고 `routes.list().find(...)` 같은 역참조가 0건이라, route를 지워도
  과거 delivery/event 조회가 깨지지 않는다(직접 재확인).
- 즉 메시지/이벤트 이력 손상 위험 없이 agent row와 route를 물리 삭제해도 된다는 게 이번 세션에서
  새로 확보된 근거다(이전 세션 판단은 "row는 절대 삭제하면 안 된다"였는데, 이 근거로 뒤집혔다).

## 구현 시 손대야 할 지점(다음 세션 착수 시 재추적 불필요 — 확정된 목록)

- `src/store/repositories/agents.ts`: `attach()`의 재연결(existing) 분기 제거, 이름이 현재
  connected가 아니면 항상 fresh insert.
- `src/store/repositories/routes.ts`: 기존 `disconnect()`(directed/target-list 방식) 제거,
  `removeAllForAgent(agentId)` 신규 추가.
- `src/daemon/state.ts`: agent 이탈 감지 지점 전부(`markByNameDisconnected`/
  `markAllConnectedDisconnected` 호출부 다수 — 999·1123·1587·1599·1640·3078·3099행 부근)에서
  status flip 대신 row 삭제 + route 정리로 교체. daemon API의 `disconnect`(route-level) 액션 제거.
- `src/daemon/api.ts`: `disconnect()` API 메서드 제거.
- `src/cli/parse.ts`: `disconnect` 커맨드 정의(`addRoutingCommand(program, "disconnect", ...)`,
  237행) 제거.
- `src/cli/invocation.ts`: disconnect case 제거.
- 테스트: `tests/unit/daemon/disconnect-store.test.ts` 전체 삭제.
  `tests/unit/cli/parse.test.ts`(~280-296행)·`invocation.test.ts`(61·103·516행)·
  `daemon/api.test.ts`(920·950·960행 부근)의 disconnect(route-level) 케이스 삭제 — `api.test.ts`
  766행의 `disconnectClaudeChannel`은 무관한 별개 기능이라 손대지 않는다.
  `tests/unit/daemon/message-idempotency-store.test.ts:165`는 disconnect를 route 변경 트리거로
  쓰고 있어 다른 방식(예: 두 번째 `connect`)으로 재작성 필요.
  `tests/unit/store/repositories/agents.test.ts:132-159`("same-name reconnect가 같은 id 유지")는
  새 설계와 정면 모순되므로 삭제/재작성 대상.
- 문서: `docs/architecture/local-runtime-cli-and-operator-surfaces.md:24-25`(connect/disconnect
  오퍼레이터 테이블)와 route-level disconnect를 언급하는 나머지 architecture 문서 4개
  (`local-runtime-daemon-transport-api.md`, `local-runtime-routing-and-delivery.md`,
  `local-runtime-store-and-repositories.md`, `local-runtime-errors-events-smoke.md`) — agent-level
  "disconnected" 언급과 구분해서 route-level 부분만 정리. spec(`aiox-message-lifecycle.md`,
  `aiox-compose-contract.md`)은 애초에 `disconnect`를 언급한 적이 없어 변경 불필요(확인함).
- Package Scope(이 로그 42-56행) allowed write-set이 `src/daemon/api.ts`,
  `src/store/repositories/routes.ts`를 안 포함하고 있어 확장 필요.

## 다음 세션 미결(구현 전 짧게 재확인 필요)

- `AgentInstanceStatus`(`src/core/agents.ts:5-10`)의 `pending_attach`/`stale` 값은 현재 어떤
  프로덕션 코드도 생성하지 않는다(grep 확인, `agents.test.ts`가 수동 SQL insert로만 seed).
  재연결 분기가 없어지는 이 설계에서 `status` 컬럼이 사실상 `"connected"` 하나로 수렴하는데,
  enum을 그대로 둘지 정리할지는 이번 세션에서 결정하지 않았다.
- W2 실행 모드는 Task Brief revision 2에서 이미 delegated(controlling 검토, subagent 실행)로
  정해져 있다 — 다음 세션은 이 policy를 그대로 따를지 재확인.

Next: W2(재오픈, 여전히 `[>]`) — 위 최종 설계를 Task Brief revision 5로 `tasks/W2.md`에 옮겨 쓴
뒤, 확정된 손댈 지점 목록대로 구현한다. 새로 조사할 것은 없고, 이 entry가 필요한 근거를 전부
가지고 있다.

### 2026-08-19 22:54 · W2 Task Brief revision 5 확정 — 미결 2건 재확인 + discovery 중 발견한 파급 1건 추가 결정, subagent에게 delegate

이전 entry가 다음 세션 몫으로 남긴 "다음 세션 미결" 두 항목을 사용자에게 확인하고, 착수 전
코드 재확인 과정에서 새로 드러난 파급 1건을 추가로 확인해 결정했다.

**확인한 사실(착수 전 재검증)**: `agents.ts`의 재연결 분기, `routes.ts`의 route-level
`disconnect()`, `parse.ts`의 `disconnect` CLI 커맨드, `state.ts`의 `markByNameDisconnected`/
`markAllConnectedDisconnected` 7개 호출부가 직전 세션 기록과 정확히 일치함을 grep/Read로
재확인했다. `agentInstanceStatuses`의 `pending_attach`/`stale`이 production 코드에서 생성되지
않는다는 기록도 재확인했다.

**결정 1(실행 모드)**: delegated 유지. controlling(coi)은 Executing을 하지 않고 Task Brief
확정 + candidate result 검토만 수행한다. revision 2에서 정한 정책을 그대로 재확인.

**결정 2(enum 정리 범위)**: 이번 W2에 포함해 같이 정리하기로 함(원래는 별도 판단으로 미룰
수도 있었으나 사용자가 포함을 선택).

**추가 discovery와 결정 3**: 결정 2를 실제로 추적하는 과정에서 `status`가
`AgentDto`(`src/daemon/api.ts:106`)를 거쳐 `aiox status` CLI의 AGENTS 테이블 STATUS
컬럼(`src/cli/format.ts:40-44`)까지 노출된다는 사실을 발견했다. status가 재설계 후 항상
`"connected"`로만 수렴하므로, 필드를 완전히 제거하면 그 컬럼이 통째로 사라지는 사용자
가시적 CLI 출력 변경이 된다 — 이건 사용자가 앞선 "enum 정리" 답변에서 예상했을 파급인지
불확실해 다시 질의했다. 사용자 결정: **필드는 유지, 타입만 `"connected"` 단일 리터럴로
좁힌다.** CLI 출력 모양은 바뀌지 않는다.

이 세 결정과 직전 세션이 확정한 재설계(agent row 물리 삭제, route-level disconnect 개념
전체 삭제)를 종합해 `tasks/W2.md` Task Brief를 revision 5로 갱신했다 — Scope/Excluded/
Allowed write-set/Required reads/Completion 전면 갱신, Task History에 결정 경위 append.
전문은 `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W2.md`가 소유한다
(로그에 재복사하지 않음).

추가로 확인한 사실 2건(Task Brief Excluded/Required reads에 반영):
- `src/core/agents.ts`의 `attachAgent()` pure 함수(38-69행)는 repository의 `attach()`와 별개
  구현이며 production code 어디서도 호출되지 않는 dead code로 보인다(grep 확인 — 자기 테스트만
  참조). 이번 W와 무관해 손대지 않고 발견 사실만 남긴다.
- `src/store/repositories/pairs.ts`의 `readAttachedSlots`(265-271행)는 물리 삭제 설계에서
  별도 수정이 필요 없다 — disconnected agent row 자체가 사라지므로 status 필터 없이도 자동으로
  올바르게 동작한다(직전 세션이 지적한 pair slot 영구 점유 문제가 이 재설계로 구조적으로
  해소됨을 재확인).

Next: subagent(general-purpose)에게 W2 revision 5 Task Brief 전체를 근거로 구현을 위임한다.
candidate result가 돌아오면 controlling이 source·산출물·검증 결과를 재검토해 accept/reject를
이 로그에 기록한다.

### 2026-08-19 23:41 · W2 revision 5 Accept — stale-peer 재설계 result review, 문서 정합 3건 추가 반영

subagent(general-purpose)의 candidate result를 controlling이 직접 재검토했다.

**검증**: `src/store/repositories/agents.ts`(재연결 분기 제거, `removeByName`/
`removeAllConnected`), `src/store/repositories/routes.ts`(`removeAllForAgent` 신규,
`disconnect()` 제거), `src/store/schema.ts`(`applyMigration7`), `src/core/agents.ts`
(status 단일 리터럴), `src/daemon/state.ts`(8개 호출부 전부), `src/daemon/api.ts`(disconnect
API 제거), `src/cli/parse.ts`/`invocation.ts`(disconnect 커맨드 제거) diff를 전부 직접 읽고
Task Brief Scope·Allowed write-set과 대조 — 전부 일치. `npm run typecheck`/`npm test`를
직접 재실행해 671/671 PASS를 확인(subagent의 10회 이상 반복 실행 보고와 일치). `git status`/
`git diff --stat`로 write-set 밖 파일이 이번 Attempt에서 새로 건드려지지 않았음을 확인(claude/codex
adapter 관련 5개 파일은 세션 시작 전 W1/W2 revision 3의 기존 modified 상태이며 이번 Attempt가
추가로 손대지 않음).

**핵심 회귀 테스트 확인**: `tests/unit/daemon/list-reachable-peers-store.test.ts:149-182`가
`detachAgent` → `listReachablePeers`를 실제 production API 경로로 왕복시켜, 사용자가 TUI에서
재현했던 원 버그(peer 종료 후에도 `agents_list()`가 계속 노출)를 정확히 재현·검증함을 확인했다.

**controlling이 result review 중 직접 추가 반영**: subagent가 Task Brief의 5개 doc 목록 밖에서
발견하고 escalation 대상으로 남긴 architecture 문서 3개(`local-runtime-claude-adapter.md`,
`local-runtime-codex-adapter.md`, `local-runtime-gaps-and-targets.md`)의 stale 서술을
controlling이 직접 확인 후 정정했다 — "marks a connected agent disconnected" 류 서술을 row/route
물리 삭제로 갱신(claude-adapter.md 135-138·216행, codex-adapter.md 109-110행), 그리고
`stale` 타입 값이 아예 없어져 성립하지 않게 된 "Stale Agent Transition Policy" Current Gap
항목과 그 Evidence를 삭제(gaps-and-targets.md 18-19·90-91행). 이 세 파일은 나머지 4개 doc과
같은 성격(as-built 서술이 code와 어긋난 기계적 drift)이라 Executing 위임 정책과 별개로
controlling이 result review 범위에서 직접 마감했다. `scripts/check-markdown-inline-code` PASS.
Package Scope를 revision 3으로 올려 이 7개 doc과 `daemon/api.ts`·`store/repositories/routes.ts`·
`store/schema.ts`·`core/agents.ts`를 W2 소속으로 반영했다(위 Package Scope 참고).

**사용자 결정 필요(W2 범위 밖, W2 Accept를 막지 않음)**: `docs/specs/aiox-open-deferred.md:72,82-83`의
"Phase 1 owner — stale/disconnected operation policy" 열린 질문이 이번 재설계로 전제가 바뀌었다.
그 spec 문단은 미래에 agent를 자동으로 `stale`로 전환할지 `disconnected`로 둘지 고르는 문제로
서술돼 있는데, 이번 재설계로 `disconnected`는 존재 자체가 없는 상태(row 물리 삭제)가 됐다 —
그 선택지 구도가 더 이상 성립하지 않는다. `docs/specs/`는 별도 owner 영역이라 controlling이
임의로 고치지 않았다. 사용자에게 보고만 하고 처리 방향(spec 문단 재작성 / decision 기록 /
현행 유지 후 재논의)은 사용자 결정으로 남긴다.

**판정**: **W2 Accept**(revision 5). "disconnected" 상태 개념 자체를 없애고 agent 이탈을
row/route 물리 삭제로 재설계해 stale-peer 버그와 파생 문제 2건(pair slot 영구 점유, 재연결 시
kind 미갱신)을 구조적으로 제거했다. 상세 근거·diff 요약·residual risk 전문은
`logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W2.md` Result / Verification
섹션이 소유한다(로그에 재복사하지 않음). W2를 completed(`[x]`)로 전이한다(Work Items 참고).

Next: W4(aiox.yaml v1 schema+parser 구현) — 남은 stage 2 Work Items 순서대로 진행. 사용자에게
`docs/specs/aiox-open-deferred.md`의 stale/disconnected 열린 질문 처리 방향을 확인받는 것이
그 전에 선행할 수 있다(선택 사항, W4 착수를 막지는 않음).

### 2026-08-20 13:28 · W2 Accept 뒤 사용자 재검증 중 "peers: [] 회귀 의심" 제기 → 조사 → 오검출로 해소, 실사용 재검증 PASS로 재확인

W2 revision 5 Accept 직후 사용자가 실제 TUI로 재검증하다가 `aiox status`에는 `reviewer`/`impl`
둘 다 `claude`/`connected`로 뜨는데 양쪽 `agents_list()`가 전부 `peers: []`를 반환하는 걸
발견하고, 이게 이번 재설계의 회귀인지 조사를 요청했다(고치지 말고 조사·보고만 하라는 명시적
지시).

**조사(고치지 않고 진행)**: 사용자의 실제 daemon과 무관한 격리 sandbox
(`/private/tmp/aiox-w2-repro.sock`, 임시 in-memory daemon 별도 기동)에서 실제 프로덕션
코드 경로(`runDaemonProcess`/`createDaemonSocketClient`/실제 `aiox` CLI 바이너리)로 재현했다.

- claude 2개(`reviewer`/`impl`)를 attach만 하고 `connect`를 실행하지 않은 상태로 `aiox status`를
  찍으니 사용자가 캡처한 것과 동일한 출력(`AGENTS`엔 둘 다 connected, `ROUTES`는 빈 값)이
  나왔다.
- `docs/specs/aiox-message-lifecycle.md` §4.2 원문 확인: `peers`는 `routes[]`/수동 `connect`가
  만든 라우팅 멤버십에만 스코프된다 — attach/pair만으로는 뜨지 않는 게 명세대로의 동작.
  같은 sandbox에서 `connect`를 양방향 실행하니 정상적으로 peer가 떴다 — 재설계 코드 자체는
  end-to-end로 정상 동작 확인.
- 부수적으로 확인한 사실(조치는 안 함, 이미 문서화된 기존 gap과 일치): production daemon이
  `:memory:` SQLite(`src/daemon/run.ts:49`)라 daemon 재시작마다 전체 상태가 사라지고,
  `route_connected` 류 이벤트도 미구현이라 사후에 "connect를 안 했다" vs "connect했는데
  지워졌다"를 완전히 구분할 audit trail이 없다.
- 별도로 제기된 `aiox status`의 "DELIVERY GUARANTEES" 섹션 의심도 조사 — `git blame`/`git log`로
  2026-08-14 커밋 `0d9f266`(G3 Stage 3-5)에서 이미 추가된 기존 기능임을 확인, 이번 세션에서
  `src/cli/format.ts`를 건드린 적 없음(`git diff` 无변경) 확인.

**해소**: 사용자가 직접 `pnpm dev status`로 daemon 상태를 확인한 뒤 "내가 pair에 연결을
안했었네"로 원인을 확인해줬다 — 조사 결과와 일치, 회귀 아님.

**실사용 재검증(사용자 직접 수행, PASS)**: 이후 사용자가 실제로 `connect`까지 마친 뒤 두
조합을 직접 재검증했다.
- claude reviewer ↔ claude impl: 양쪽 `agents_list()`에 서로 role/description과 함께 정상
  노출. impl 종료 후 reviewer 쪽이 빈 배열로 복귀(stale-peer 재설계 목적대로 동작).
- claude reviewer ↔ codex impl: 양쪽 노출 정상, role/description 정상. reviewer 종료 후 codex
  쪽이 빈 배열로 복귀.

두 adapter 조합(claude-claude, claude-codex) 모두에서 stale-peer 재설계의 핵심 동작(이탈
즉시 peers에서 사라짐)이 실사용 환경에서 확인됐다 — W2 revision 5 Accept가 자동화 테스트뿐
아니라 실사용으로도 재확인됐다.

Next: W4(aiox.yaml v1 schema+parser 구현)로 진행. `docs/specs/aiox-open-deferred.md`의
stale/disconnected 열린 질문 처리 방향은 여전히 사용자 결정 대기(선택 사항).

## 2026-08-20 · W1/W2 independent review — unresolved Codex channel departure contract

- Independent review completed. Candidate findings and verification are recorded in the prior review entry; its key decision is unresolved: W2 Task Brief/Result say `disconnectCodexChannel` is agent departure and must delete row/routes, but current implementation only deregisters its channel. No code change, Work Item transition, or acceptance reversal has occurred.
- Current next: obtain the user's semantic decision for `disconnectCodexChannel`. If it is an agent departure, reopen W2 for a correction with a stale-peer regression test; if it is transient channel deregistration, amend W2's recorded scope/result and document that exception.

## 2026-08-20 · 2026-08-20 · W10 corrective execution authorized — Codex channel is agent departure

- User decision: `disconnectCodexChannel()` is Codex agent departure, not temporary registration removal.
- The completed W2 record is preserved; W10 is the active corrective work item because the log tool does not reopen completed Work Items.
- W10 Brief revision 2 binds the correction: atomic agent+route cleanup, stale-peer/history regressions, legacy surface removal, W1/W2 owner-document alignment. Three disjoint subagent write sets were assigned; controlling will perform result review and full verification.

## 2026-08-20 · 2026-08-20 · W10 corrective result review — accepted

- Result review: Accepted. `disconnectCodexChannel()` now implements the user-confirmed agent-departure meaning: it removes the runtime/token, agent row, and all incident routes. Non-stop departure cleanup uses an outer SQLite transaction (routes first, then agent), so a route cleanup failure cannot commit an orphan route.
- Removed stale operator/legacy surfaces: the `npm run disconnect` shortcut, production-caller-free route-level disconnect, unused core attach helper, and declared-only departure event literals. The parser explicitly rejects the removed command.
- W1/W2 owner documents and tests now cover metadata fields/migrations, `agents_list()` current status and private-instructions exclusion, lifecycle history preservation, and event catalog alignment.
- Verification: `npm run typecheck`, focused 219 tests, and full serialized Vitest 57 files/672 tests passed; Markdown, diff, and package/log checks passed. Default parallel `npm test` still fails in existing socket/loopback suites but serially passes; without a clean baseline it is recorded as test-isolation residual risk, not attributed to W10.
- Next: W4 (aiox.yaml v1 schema+parser). W9 remains pending for documents created by subsequent W4-W8 work.

## 2026-08-20 · 2026-08-20 · deferred session-expiry wording aligned with W2 physical-departure model

- User selected option 2 for `docs/specs/aiox-open-deferred.md` §9. The agent-session expiry open question no longer assumes existing `stale`/`disconnected` agent states.
- The deferred policy now asks whether future heartbeat/session-expiry detection should use the current immediate physical-departure path or introduce an explicit soft/grace state. Pair-level or delivery-level uses of `stale` were not changed.
- Validation: `scripts/check-markdown-inline-code docs/specs/aiox-open-deferred.md` and `git diff --check` passed.

## 2026-08-20 · 2026-08-20 · W1/W2/W10 commits created

- User authorized committing the accepted W1/W2/W10 work despite the documented default-parallel Vitest isolation residual risk. The code/test dependency graph required one compiled feature commit rather than retroactively splitting inseparable historical hunks.
- Created commits: `f5bda37 feat(daemon): add agent metadata and physical peer lifecycle`; `ce58191 chore(core): remove obsolete disconnect surfaces`; `a72d302 docs(runtime): align agent lifecycle contracts`; `827088d docs(logs): record G2 lifecycle implementation evidence`.
- Deliberately excluded untracked `logs/2026-08-18-Codex-Claude-구조화-에러-알림-daemon-relay-gap.md`, which is outside the G2 package boundary.
