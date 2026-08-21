---
topic: G2 Config CLI MCP Foreground 구현
description: G2(Terminal/Compose Minimum) plan Stage 2: aiox.yaml v1 schema/parser/validator, CLI attach 인자(role/description/instructions) 확장, agents_list() MCP tool, aiox host/quit foreground 실행을 구현한다. Kickoff 로그(logs/2026-08-17-G2-Kickoff-착수-전제와-설계-결정.md)의 설계 결정을 실행 단계로 옮긴다.
status: open
---

## Work Items
- [x] W1 aiox claude/codex --name에 --role/--description/--instructions 추가, aiox.yaml agents[] 필드와 매칭
- [x] W2 agents_list() MCP tool 구현(spec §4.2 계약: peers[]에 name/type/role/description, outbound-sendable만 scoped, 대상 없으면 빈 값/안내 반환) + stale-peer 재설계(agent 이탈 시 row 물리 삭제) — revision 5 Accept, 이 로그 최신 entry와 tasks/W2.md 참고
- [x] W3 TUI 검증(claude·codex 둘 다) — peer 등록 시 목록에 뜨는지 먼저 확인 후 혼자일 때 빈 값 케이스 확인
- [x] W4 aiox.yaml v1 schema+parser 구현(zod, project/instructions.global/agents[]/routes[])
- [x] W5 Validator Rules 구현(namespace uniqueness, dangling reference, directed 중복 쌍, 별표 reserved word — 전부 parse-time error)
- [>] W6 aiox host 구현 — 전체 agent foreground 실행, routes[] mesh+directed override wiring, agent-attach 재사용
- [ ] W7 aiox quit 구현
- [ ] W8 yaml 필드(W4) CLI 인자(W1) 매칭 정합 확인
- [ ] W9 이 stage 범위 문서 stale/gap 정합(owner 문서 반영)
- [x] W10 W1/W2 independent review correction — Codex agent departure, atomic lifecycle cleanup, removed-surface cleanup, and W1/W2 document/test alignment
- [x] W11 W6 revision 5 Attempt 3 코드·테스트·삭제 범위 독립 result review(live evidence 제외)
- [x] W12 W6 architecture evidence corrective — TUI-failure call site와 daemon dispose/row/routes state-effect 근거 보강

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
| W12 | Compact | delegated | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W12.md` |
| W11 | Compact | delegated | `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W11.md` |
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
  - W5 corrective Attempt 2 Accept: `directed[].from`/단일·배열 `to`는 global agent 존재와
    route-local membership을 구분해 검증하며, unknown-agent와 non-member issue가 field path와
    message에서 구분된다. route별 set과 aggregate issue 수집도 유지된다.
  - W6 corrective 부분 Accept: Claude 단일 attach instruction argv wiring과 Claude
    stop/detach cleanup 단계 독립성은 source/tests 독립 review를 통과했다. W6 전체는 signal,
    Codex dispose 진단, live Claude registration blocker 때문에 accepted가 아니다.
  - W6 instruction discovery: 현재 W1 `--instructions`는 parse·attach·SQLite 저장에서
    끝나고 Codex/Claude runtime consumer가 없다. Codex 0.148.0 app-server는
    `thread/start`/`thread/resume`의 `cwd`/`developerInstructions`를, Claude Code 2.1.237은
    `--append-system-prompt <text>`를 지원한다. 세부 trace·문법·증거 등급은
    `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W6.md` Brief revision 3/
    Result를 본다.
- Evidence gaps:
  - native/compose 충돌 precedence는 version-bound model behavior이며 protocol guarantee가 아니다.
    미실행 matrix cell, resume, multiline/long text, TUI 노출, cwd·cleanup 경로는 W6
    implementation verification으로 닫아야 한다.

## Cross-Artifact Effects

- `docs/specs/aiox-compose-contract.md`의 `native project docs > compose session instruction`은
  책임 원칙이지만, Claude 공식 계층(`CLAUDE.md`는 user-message context,
  `--append-system-prompt`는 system-prompt level)에서 이 precedence를 기계적으로 보장할 수
  있다는 근거는 없다. W6 구현 전 degradation 계약으로 수용할지 또는 owner
  principle을 변경할지 판정해야 하며, 확정되면 W9 문서 정합 범위가 소비한다.

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

## 2026-08-20 · 2026-08-20 · W4 selected as current implementation pointer

- W1/W2/W10 commits and final serialized verification are complete. User directed the package pointer to W4.
- W4 is now the sole active Work Item: implement the aiox.yaml v1 schema and parser. No W4 code/discovery has started; its Task Brief must be completed before execution.

## 2026-08-20 · 2026-08-20 · W4 완료 — aiox.yaml v1 schema+parser 구현(inline, controlling 직접 실행)

controlling(coi)이 W4(aiox.yaml v1 schema+parser)를 inline으로 직접 구현하고 결과를 검토했다.

**구현**: 신규 `src/config/aiox-config.ts` — zod 기반 `aioxConfigSchema`(project/
instructions.global/agents[]/routes[], 모든 object level `.strict()`) + `parseAioxConfig(raw)`/
`loadAioxConfig(cwd?)` + `AioxConfigError`(code: `not_found`|`invalid_yaml`|`invalid_schema`).
`agents[].command`/`config`, top-level `capabilities`/`policies`/`version` 등 v1 미포함 필드는
`.strict()`로 구조적으로 거부한다. `routes[].policy`는 `z.record(z.string(), z.unknown())`로
object 여부만 구조 검증하고 내부는 강제하지 않는다(spec의 "확장 지점" 문구 그대로). semantic
validator 4개 규칙(namespace uniqueness, dangling reference, directed 중복 쌍, `"*"` reserved
word)은 의도적으로 미구현 — W5 범위.

**신규 dependency**: `yaml: "^2.4.2"`(설치 2.9.0) — zod는 구조 검증/타입만 담당하고 YAML
text→JS object 변환 parser가 프로젝트에 없어 추가했다. `pnpm-lock.yaml`에 이미 vite의 optional
peerDependency로 같은 버전 range가 존재해 그대로 재사용(lockfile 충돌 최소화), zero-dependency
pure JS/TS YAML 1.1/1.2 parser.

**테스트**: 신규 `tests/unit/config/aiox-config.test.ts` 20 케이스 — 유효 최소/full config(spec
Example 그대로), `directed[].to` 배열(broadcast) 형태, 필수 필드 누락 8종, 잘못된 `agents[].type`
값 거부(에러 code+issue path 확인), 알 수 없는 top-level/agents/routes 필드 거부 5종,
`loadAioxConfig`의 cwd 고정 읽기 성공/not_found/invalid_yaml/invalid_schema 4종. semantic
validator 규칙은 테스트하지 않았다(W5 경계 유지).

**검증**: `npm run typecheck` PASS. `npx vitest run tests/unit/config/aiox-config.test.ts`
20/20 PASS. package Verification Contract가 요구하는 직렬 실행
(`npx vitest run --maxWorkers=1`) 58 files/692 tests 전부 PASS — 기존 baseline 672(W10 종료 시점) + 신규 20,
회귀 없음.

**스펙 충돌**: 없음. 구조적 판단 3건(spec 표에 명시되지 않았으나 결정한 것, W5/W8이 참고할
것): (1) 식별자성 required string 필드에 `.min(1)` 적용 — 기존 코드베이스 컨벤션
(`channel-server.ts`의 `deliveryId` 등)을 따름. (2) 모든 object `.strict()`로 알 수 없는 필드
거부 — spec의 "v1에서 제외" 문구를 parse-time 에러로 해석. (3) `agents[]`/`routes[].members`
배열 자체의 최소 길이는 강제하지 않음 — spec 미명시.

**잔여 위험(W5 선행 필요)**: 이 스키마는 아직 dangling reference나 `"*"` 예약어를 거부하지
않는다 — 존재하지 않는 agent를 가리키는 `routes[]` 값도 구조적으로는 valid로 통과한다. W6(host)
착수 전 W5가 선행돼야 한다.

상세 근거·diff 요약·판단 전문은
`logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W4.md` Task Brief/Result
섹션이 소유한다(로그에 재복사하지 않음).

**판정**: W4 **Accept**.

Next: W5(Validator Rules 구현 — namespace uniqueness, dangling reference, directed 중복 쌍,
`"*"` reserved word, 전부 parse-time error). W4가 남긴 잔여 위험(dangling reference 미검증)이
W5의 직접 동기다.

## 2026-08-20 · 2026-08-20 · W5 완료 — semantic validator 구현(inline, controlling 직접 실행), self-loop 규칙은 사용자 확인 후 범위 추가

controlling(coi)이 W5(semantic validator)를 inline으로 직접 구현했다. 착수 전 spec
(`docs/specs/aiox-compose-contract.md` §6 Validator Rules, `aiox-message-lifecycle.md`)과
`src/daemon/state.ts`를 확인한 결과, 사용자 지시에 있던 self-loop 처리에 대한 기결정 계약이
어디에도 없음을 확인했다(사실) — spec은 정확히 5개 규칙만 "Committed target"으로 명세한다.
`directed`가 mesh의 특정 pair를 override하는 것인데 agent는 자기 자신의 mesh peer가 아니므로
self-loop은 override 대상이 없다는 논리로 거부를 제안(추론)해 사용자에게 보고했고, 사용자가
**거부(parse-time error) 추가**로 결정해 범위에 포함시켰다.

**구현**: 신규 `src/config/aiox-config-validator.ts` —
`validateAioxConfigSemantics(config: AioxConfig): void`. W4의 구조 파싱과 분리된 별도 단계로
6개 규칙을 구현: (1) `agents[].name` namespace uniqueness, (2) `routes[].name` namespace
uniqueness(agents와 독립 namespace), (3) `routes[].members`/`directed[].from`/`.to` dangling
reference 거부, (4) `routes[].directed[]` 중복 `{from, to}` pair 거부(route 단위 스코프 — 각
routing group은 독립 통신 도메인이라는 spec 원칙에 따름; `to` 배열은 flatten 후
`JSON.stringify([from, to])` 키로 비교), (5) `agents[].name`의 `"*"` 예약어 거부, (6) 사용자
결정으로 추가된 `directed[].from === to` self-loop 거부(flatten된 `to` 배열 원소 각각에 적용).
모든 위반을 fail-fast 없이 전부 수집해 하나의 `AioxConfigError`(code `invalid_semantics`)로
던진다 — W4의 `invalid_schema`가 zod issues를 한 번에 보고하는 스타일과 통일했고, 각 issue는
`{path, message}`(zod 스타일 dot path, 예: `routes.0.directed.0.to.1`)로 문제 필드를 식별할 수
있다.

**`loadAioxConfig()` 계약 보존**: `src/config/aiox-config.ts`는 `AioxConfigErrorCode`에
`"invalid_semantics"`를 추가하고 `AioxConfigSemanticIssue` 타입과
`AioxConfigError.semanticIssues` optional 필드를 신설하는 순수 확장만 했다 — 기존 `not_found`/`invalid_yaml`/
`invalid_schema` 3개 code의 동작과 `loadAioxConfig()`가 실제로 던지는 값은 바뀌지 않았다.
semantic validator는 `loadAioxConfig()`에 자동으로 연결하지 않았다 — 의도된 분리이며, W6가
`loadAioxConfig()` 뒤에 `validateAioxConfigSemantics()`를 명시적으로 호출해 이어붙여야 한다.

**테스트**: 신규 `tests/unit/config/aiox-config-validator.test.ts` 14 케이스 — 정상 config
통과, agents/routes 이름 중복, unknown reference(members/directed.from/directed.to 단일 및
flatten 배열), 중복 pair(별도 entry/flatten 배열 내부/cross-route 비영향 확인), `"*"` reserved,
self-loop(단일 및 flatten 배열), 복수 규칙 동시 위반 시 전부 수집되는지.

**검증**: `npm run typecheck` PASS(에러 0). `npx vitest run tests/unit/config/` 3 files/53
tests PASS. package Verification Contract가 요구하는 직렬 실행
(`npx vitest run --maxWorkers=1`) 59 files/706 tests 전부 PASS — W4 종료 시점 baseline 692 + 신규 14, 회귀 없음.

**잔여 위험(W6 선행 확인 필요)**: `loadAioxConfig()`는 여전히 semantic 검증을 자동 실행하지
않는다. W6가 `loadAioxConfig()` 호출 뒤 `validateAioxConfigSemantics()` 호출을 빠뜨리면
구조적으로만 valid하고 의미상 invalid한 config가 host 단계까지 흘러갈 수 있다.

상세 근거·diff 요약·판단 전문은
`logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W5.md` Task Brief/Result
섹션이 소유한다(로그에 재복사하지 않음).

**판정**: W5 **Accept**.

Next: W6(`aiox host` 구현 — 전체 agent foreground 실행, `routes[]` mesh+directed override
wiring, agent-attach 재사용). 착수 시 `loadAioxConfig()` → `validateAioxConfigSemantics()`
호출 연결을 빠뜨리지 않아야 한다(W5가 남긴 잔여 위험).

## 2026-08-20 · W6 instruction 주입 선행 조사와 다음 세션 handoff

- 사용자 지시: W6는 곧바로 `aiox host`를 구현하지 않고 Codex/Claude 각각의 compose instruction 주입 surface부터 확인·설계한다.
- `instructions.global`과 `agents[].instructions`는 모두 optional이다. project root에 `AGENTS.md`/`CLAUDE.md`가 있는 경우와 없는 경우를 나눠 native project instruction과 compose instruction이 extension/stack/override 중 어떻게 동작하고 충돌하는지 실제 adapter·launcher 경로와 테스트/재현으로 확인해야 한다.
- 사용자 제안의 현재 가정: 충돌 없이 stack 형태로 지시서가 누적될 수 있다면 YAML `instructions.global`은 pair/host 전체의 공통 CLI instruction에, `agents[].instructions`는 `aiox claude|codex --pair <pair> --instructions <text>` 같은 agent attach 옵션에 대응시킨다. 이는 아직 확인된 계약이 아니며 조사 결과 후 결정한다.
- `--instructions`는 반복 입력하기 길다는 naming 문제도 함께 검토한다. `--prompt`/`--guide`/`--context` 등은 예시 후보일 뿐 확정하지 않았다.
- W6 task record를 Brief revision 2로 갱신해 다음 세션의 첫 범위를 read-only discovery와 후속 implementation Brief 확정으로 제한했다. W6를 active pointer로 전환했으며 production 구현은 시작하지 않았다.

Next: W6 discovery — Codex/Claude × native instruction 파일 있음/없음 × global/per-agent instruction 있음/없음 matrix를 복원하고, 관찰된 precedence·충돌 behavior에 근거해 CLI mapping과 option 이름을 설계한 뒤 사용자에게 보고한다.

### 2026-08-20 16:29 · W6 instruction discovery 수용과 text 주입 설계 결정

- Claude delegated discovery와 controlling 독립 대조 결과를 W6 task record revision 3에 수용했다. production 코드는 아직 수정하지 않았다.
- 사용자 결정: `instructions.global` 다음에 agent별 `agents[].instructions`를 text 하나로 합성해 각 runtime에 주입한다. 파일형 surface는 지원 문법으로만 기록하고 구현 선택안에서는 제외한다. 기존 `--instructions` 이름을 유지한다.
- 선택 surface: Codex는 `thread/start`/`thread/resume`의 `cwd`+`developerInstructions`; Claude는 명시적 project cwd에서 `--append-system-prompt <text>`. Codex `baseInstructions`/`model_instructions_file`, Claude `--system-prompt` 계열과 `--append-system-prompt-file`은 선택하지 않았다.
- 현재 aiox가 instruction을 DB에 저장만 하고 runtime에는 전달하지 않는 dead-end, Codex cwd 누락, 두 CLI의 전체 지원 문법과 실증/공식 문서 대조는 `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W6.md`가 소유한다.
- 증거 보정: native+global+per-agent가 함께 인식된 실증은 수용하지만, 충돌 시 native가 항상 이긴다는 model self-report는 protocol guarantee로 수용하지 않는다. 특히 Claude 공식 문서상 `CLAUDE.md`는 user-message context이고 `--append-system-prompt`는 system-prompt level이라 기존 spec의 native > compose 원칙을 기계적으로 보장하지 못한다.
- Next: W6 production Act 전 전체 host write-set·rollback·foreground cleanup·verification 계약과 이 precedence degradation의 owner 처리 방식을 contract review에서 닫는다.

### 2026-08-20 16:33 · Claude 후속 CLI·file surface 재검증 기록

- 사용자가 전달한 Claude 후속 검증 보고 원문을 W6 task record Task History에 candidate evidence로 보존했다.
- 보강 evidence: Codex `developer_instructions`/`model_instructions_file`, Claude `--append-system-prompt-file`/`--system-prompt-file`는 실제 marker 주입과 native project instruction 동시 인식이 보고됐다.
- 정정: `model_instructions_file`은 현재 실증상 Codex built-in model instruction을 바꾸더라도 `AGENTS.md` auto-discovery를 억제하지 않는다. 기존 기록이 `AGENTS.md`까지 대체한다고 읽히는 부분은 폐기한다.
- 증거 한계: Claude prompt 조립 순서와 native 충돌 승자 규칙은 여전히 model self-report 및 version-bound 관찰이다. protocol guarantee로 승격하지 않는다.
- 선택된 구현 계약은 유지한다: global→per-agent text 합성, Codex `developerInstructions`, Claude `--append-system-prompt <text>`.
- Next: W6 production Act 전 contract review에서 exact host write-set, rollback/cleanup, 테스트 matrix와 native>compose precedence degradation 처리를 닫는다.

### 2026-08-20 16:42 · W6 production Act 전 contract review — 아키텍처 재추적으로 신규 gap 3건 발견, Task Brief revision 3 유지(추가 사용자 결정 대기)

production 코드/테스트 변경 없이 W6 contract review를 계속했다. 지시대로 `aiox host` 책임 전체
(CLI parse → config load/validate → instruction 합성 → agent-attach 재사용 → Codex/Claude launch →
routes wiring → foreground wait → cleanup/rollback)를 코드로 끝까지 추적한 결과, Task Brief
revision 3(instruction 주입 surface)이 다루지 않은 신규 gap 3건을 발견했다. Task Brief는 revision
3에 유지하고, 아래 미결 사용자 결정을 먼저 보고한다(대화 응답 참고, 여기서는 근거만 보존).

**확인한 사실(코드 직접 추적)**

- Codex `thread/start`는 daemon이 발신하지 않는다. `ManagedCodexAgentRuntime.startThread()`
  (`src/adapters/codex/runtime.ts:219-221`, `requestCodex("thread/start", {})`)는 production
  경로 어디서도 호출되지 않는다(`tests/unit/daemon/api.test.ts:347`
  `expect(runtime.startThreadCalls).toBe(0)`로 확정 검증됨). 최초 thread는 `launchCodexTui`가
  `--remote <endpoint>`로 띄운 codex TUI 자식 프로세스가 app-server에 직접 발신하는 자기
  발신 요청이고, aiox `proxy.ts`(`startCodexAgentProxy`)는 그 프레임을 순수 relay+관찰
  (`observeUpstreamFrame`→`onBinding`)만 한다 — payload를 만들거나 고치지 않는다. daemon이 직접
  발신하는 유일한 thread 호출은 `--resume` 플래그가 있을 때의 `resumeThread()`
  (`state.ts:788`, `requestCodex("thread/resume", { threadId })`, `runtime.ts:224-225`)뿐이고
  이마저 현재 `developerInstructions`/`cwd`를 안 보낸다.
- Claude launcher(`src/adapters/claude/launcher.ts:70-86`)의
  `spawn(command, args, { env, stdio: "inherit" })`에 `cwd` 옵션이 없다 — Node 기본값대로 부모
  aiox CLI 프로세스의 cwd를 그대로 물려받는다. `--append-system-prompt` argv 주입 코드도 없다.
- `src/bin/aiox.ts`에 `SIGINT`/`SIGTERM` 핸들러가 없다(grep 0건). daemon 프로세스
  (`src/daemon/run.ts:115-116`)는 자체 핸들러가 있으나 별도 프로세스다. 현재 단일 agent
  `agent-attach` 흐름(`invocation.ts:172-222`)은 자식에 `stdio:"inherit"`만 주고
  `waitForTuiExit`로 기다릴 뿐, 부모 프로세스 자체의 Ctrl-C 처리는 Node 기본 동작(핸들러 없으면
  즉시 종료)에 맡겨져 있다 — 이 경로에서 `rollbackAgentAttach`/`notifyTuiExited`/
  `disconnectClaudeChannel` 같은 비동기 cleanup이 완주한다는 보장이 코드로 확인되지 않는다.
- `plans/g2-terminal-compose-minimum.md`는 "config 파일 v1 스키마와 foreground 실행 구현"
  (현재 Stage, 이 package)과 "view driver 일반화 구현"(Stage 3, `[ ]` 미착수)을 명시적으로
  분리한다. Kickoff W4가 정한 `--ui none` fallback(옵션 A: 전체 background 실행+포커스 전환)은
  "구현 미착수, 조건부 1차 시도"이고 `--ui` flag 자체가 `src/cli/parse.ts`에 없다(grep 확인).
- 재사용 가능 확인: `connect()`(`state.ts:895`, `ConnectRequest{sourceName, targetNames}`)는
  이름 기반 단방향 route 생성 primitive로 routes[] mesh/directed wiring에 재사용 가능하다(mesh는
  각 member가 나머지 member 전원을 targetNames로 보내는 형태, directed override는 그 특정 pair의
  반대 방향 connect만 생략하는 형태로 표현 가능). `rollbackAgentAttach`(`state.ts:1062`)는 이미
  단일 agent 단위로 runtime dispose+`removeDepartedAgent`(row+route 물리 삭제)를 수행해 재사용
  가능하다.
- Package Scope(이 로그) allowed write-set에 `src/adapters/codex/*`,
  `src/adapters/claude/launcher.ts`, `src/bin/aiox.ts`가 없다 — 위 발견 3건 모두 이 파일들을
  건드려야 한다.

**추론**

- Task Brief revision 3의 "Codex는 thread/start에 developerInstructions를 전달"은 daemon이 그
  RPC를 직접 만든다는 전제로 읽히기 쉬우나, 실제 발신 주체는 TUI 자식 프로세스다. 같은 목표를
  이루려면 (a) daemon이 TUI 실행 전에 먼저 `runtime.startThread()`로 developerInstructions가
  담긴 thread를 만들고 TUI를 `codex resume <생성된 threadId> --remote <endpoint>`로 실행(모든
  최초 attach를 "daemon이 만든 thread의 resume"으로 바꾸는 행동 변화), 또는 (b) `proxy.ts`가
  client→upstream `thread/start` 프레임을 relay 전에 in-flight로 rewrite하는 신규 메커니즘(현재
  proxy는 순수 관찰자)이 필요하다 — 서로 다른 코드 범위와 행동 변화라 사용자 선택이 필요하다.
- SIGINT 미처리와 view driver(Stage 3) 미착수로 인해, N-agent `aiox host`의 foreground/신호/
  rollback 계약은 기존 단일 agent `agent-attach` 흐름의 단순 재사용으로 닫히지 않는다 — CLI
  entrypoint 신규 SIGINT 핸들러가 필요하고, view driver 없이 N>1 TUI가 동시에 `stdio:"inherit"`를
  놓고 경쟁할 수 없다는 제약이 그대로 남는다.

**정정한 기존 주장**

- Task Brief revision 3의 "Codex는 app-server thread/start 및 thread/resume 둘 다에 cwd+
  developerInstructions를 전달하는 테스트가 필요하다"는 daemon이 두 호출을 대칭적으로 만든다고
  전제하는데, thread/start는 daemon이 만들지 않는다는 사실이 이번 재추적으로 새로 확인됐다 —
  이 부분은 정정 대상이다.

Next: 위 발견을 근거로 사용자에게 (1) Codex thread/start developerInstructions 주입 방식(pre-create
+resume vs proxy rewrite), (2) W6 범위에서 N-agent foreground의 최소 계약(Stage 3 view driver
전에 무엇을 지원할지), (3) allowed write-set 확장(adapters/codex/*, adapters/claude/launcher.ts,
bin/aiox.ts) 승인을 받는다. 결정 전까지 Task Brief revision 4로 올리지 않는다.

### 2026-08-20 16:48 · Claude contract review controlling 대조와 결정 후보 보정

- Claude가 확인한 Codex no-resume `thread/start` 발신 주체, Claude launcher의 cwd/instruction 누락, CLI signal cleanup 부재는 source/test 대조로 수용했다.
- 다만 Codex 대안은 pre-create+resume/proxy rewrite 두 개로 닫히지 않는다. app-server launch의 `-c developer_instructions=...`도 후보이나 TUI 발신 start에 대한 정확한 조합 probe가 더 필요하다. 기존 `--ui none` headless 실행 계약까지 고려하면 daemon pre-create는 instruction 외 lifecycle 목적도 갖는다.
- “여러 TUI가 같은 inherited TTY를 가질 수 없다”는 물리적 불가능 주장은 정정했다. 상속은 가능하지만 입력·화면 경쟁 때문에 usable interactive UX가 아니다.
- N-agent fallback은 Kickoff W4/spec에서 이미 전체 headless 실행+순차 포커스로 결정됐고 focus/view 구현은 Stage 3 소유다. 첫 agent TTY+나머지 pipe log 안은 이 기결정을 바꾸는 신규안이므로 W6에서 채택하지 않는다.
- adapter/launcher/bin write-set 추가는 기확정 W6 outcome 수행을 위한 package contract Reconcile이며 그 자체는 별도 product decision이 아니다.
- 실제 사용자 결정 후보는 Codex initial attach를 daemon pre-create+TUI resume로 통일할지, native>compose를 version-bound 관찰/설계 의도로 낮추고 protocol guarantee가 아님을 수용할지 두 건으로 축소했다. production 변경과 Brief revision 4 승격은 아직 하지 않았다.

### 2026-08-20 17:01 · W6 Task Brief revision 4 확정 — 사용자 승인 2건 반영, 실제 CLI 재검증으로 contract review 종료

사용자가 지난 entry가 보고한 미결 사용자 결정 2건을 승인했다: (1) Codex initial attach는 daemon
pre-create+resume(`thread/start {cwd, developerInstructions}` 후 TUI는
`codex resume <threadId> --remote <endpoint>`)를 채택하고 proxy in-flight rewrite와 app-server
launch config `-c developer_instructions`는 채택하지 않는다. (2) native>compose precedence는 version-bound
관찰/설계 의도로 문구를 낮추고 별도 강제 메커니즘은 구현하지 않는다. 추가로 Kickoff `--ui none`
계약 재론 금지, "첫 agent만 TTY" 안 폐기, SIGINT 전체 cleanup 계약을 W6에 포함, write-set 확장을
별도 승인 게이트로 만들지 말 것을 지시받았다.

이 승인을 실행 계약으로 옮기기 전에, 이전 candidate 대조가 model self-report 의존으로 남겨뒀던
두 핵심 항목을 이번 세션에서 로컬 설치된 CLI로 직접 재검증했다(production 코드는 여전히 변경
안 함).

**Codex(직접 재검증)**: `codex app-server generate-json-schema --out <dir> --experimental`를
로컬 `codex-cli 0.148.0`에서 실행해 스키마 원문을 재생성했다. `ThreadStartParams`는 `required`가
없어 전 필드 optional이고 `cwd: string|null`, `developerInstructions: string|null`,
`baseInstructions: string|null`을 갖는다. `ThreadResumeParams`는 `threadId`만 required이고
동일하게 `cwd`/`developerInstructions`/`baseInstructions`가 optional이다. `turn/start`의 실제
params(`src/adapters/codex/injector.ts:37-47`)에는 이 필드들이 없어 `developerInstructions`가
thread-scoped이고 매 turn user message가 아님을 코드로 확인했다.

**Claude(직접 재검증)**: 로컬 `Claude Code 2.1.237`에 실제 spawn spike를 실행했다
(`spawn("claude", ["--bg","--name","aiox-w6-spike-test","<prompt>"], {cwd, stdio:"inherit"})`,
스크래치 디렉터리에서 실행). 확인한 사실:
- child pid가 "return immediately" 도움말 문구와 달리 실제로 세션을 계속 들고 살아있는
  프로세스임을 `ps aux`로 재확인했다(4초 후에도 `exited=false`, 실제 `claude --bg ...` 프로세스가
  ps에 존재).
- stdout에 `backgrounded · <id> · <name>`과 `claude stop <id> stop this session` 안내가 실제로
  출력됐다 — `claude stop`은 top-level `--help`에는 나오지 않는 undocumented 명령이지만 실제로
  동작한다.
- `claude stop <id>` 실행 후 그 프로세스가 실제로 종료됨을 `ps -p <pid>`(exit 1)로 재확인했다 —
  이것이 host의 Claude cleanup 1차 메커니즘이다.
- `claude agents --json`은 `kind:"background"` 세션에 `pid` 필드를 노출하지 않는다(직접 확인,
  `kind:"interactive"` 항목에만 `pid`가 있음) — 세션id는 spawn stdout 파싱으로만 얻을 수 있다.
- `--session-id <uuid>`를 `--bg`와 함께 주면 "ignoring --session-id" 경고와 함께 무시된다(직접
  확인) — 세션id 사전 지정은 불가능하고 `--name`으로만 사후 식별 가능하다.
- spike 세션은 `claude stop`으로 정리했다(잔존 프로세스 없음, 재확인함).
- **미검증으로 남긴 것(test matrix 최우선 항목, blocking 아님)**: prompt 없이 `--bg --name X`만
  으로 idle 세션이 생성되는지, `--bg`+`--append-system-prompt`+
  `--dangerously-load-development-channels` 세 플래그 동시 조합, `claude stop`의 idempotency.
  이번 세션에서는 실제 API 호출 비용을 고려해 이 세 조합까지는 추가로 spike하지 않았다 —
  구현 착수 시 첫 focused test로 닫는다.

**이전 candidate 대조 정정 2건(코드 직접 확인)**:
- `src/bin/aiox.ts`는 `invokeParsedCommand()`의 반환 Promise를 이미 await한 뒤에만
  `process.exit()`한다(`src/bin/aiox.ts:55,503,507`, 직접 확인) — `aiox host`의 SIGINT 핸들러는
  `src/cli/invocation.ts`의 `case "host"` 지역 범위에 두면 충분하고 `bin/aiox.ts` 자체는
  write-set에 불필요하다.
- `rollbackAgentAttach`(`src/daemon/state.ts:1062`)는 `runtime.state === "ready"`면 조기
  반환하며 row/route를 건드리지 않는다(TUI 스폰 실패라는 좁은 race 전용 설계, 직접 확인) —
  이미 성공적으로 attach된 agent들의 rollback/정상 cleanup에는 `daemon.detachAgent()`
  (`state.ts:3048` `detachCodexAgent`, 이름과 달리 kind 무관 동작)가 맞는 primitive다.

이 근거로 `tasks/W6.md` Task Brief를 revision 4로 갱신했다 — producer/consumer 전체 경로,
정확한 write-set(신규 `src/cli/host.ts`/`src/adapters/codex/runtime.ts`/
`src/adapters/claude/launcher.ts`만 추가, `bin/aiox.ts`·`proxy.ts`·codex `launcher.ts`는
불필요로 확정), instruction 합성 규칙(4가지 조합·빈 문자열·separator·필드 생략), Claude spawn
argv/cwd 계약, rollback/cleanup 계약, 11항목 focused test matrix, native>compose 문구 확정본을
Task Brief 본문이 소유한다(로그에 재복사하지 않음).

**contract review 종료 — 추가 사용자 결정 없음.** Task Brief revision 4는 production Act 진입
가능한 실행 계약이다. 남은 것은 test matrix 최우선 3항목(위 미검증 3건)뿐이며 구현 중 spike로
닫는다.

Next: production Act — Task Brief revision 4의 write-set·실행 순서대로 구현하고, 위 3개 spike를
가장 먼저 닫은 뒤 나머지 test matrix와 typecheck/직렬 전체 테스트로 검증한다.

### 2026-08-20 17:04 · 새 Claude production executor handoff와 revision 4 보정

- 새 Claude production executor에게 W6 revision 4 구현을 위임하기 전 실제 task record와 API를 대조했고 contract를 production Act 진입 가능으로 수용했다.
- 보정 1: compose spec 본문 편집은 W9 소유다. W6은 확정 문구와 cross-artifact handoff만 남기고 W9 범위를 선점하지 않는다.
- 보정 2: host는 signal만 기다리지 말고 자신이 소유한 Claude background session의 unexpected exit도 감지해 전체 cleanup+비정상 종료로 연결한다.
- 보정 3: 최우선 Claude spike는 process 생존뿐 아니라 session-id 파싱, dev-channel 등록, `--bg`+`--append-system-prompt`+channel 동시 조합, `claude stop` cleanup/idempotency까지 검증한다.
- 사용자는 새로운 Claude 세션에서 즉시 구현하기로 했다. executor는 TDD로 production 변경·focused/full verification·result review·W6 로그 Reconcile까지 계속하며, 이미 닫힌 설계 결정을 다시 열지 않는다.

### 2026-08-20 18:33 · W6 production 구현 완료 — candidate result와 독립 result review, Accept

새 Claude production executor(coi, 이 세션)가 W6 Task Brief revision 4를 TDD로 구현했다. fork
2개(Claude headless launcher+spike, Codex eager thread/start+state.ts 배선)를 격리 없이 병렬
위임하고 controlling이 host.ts 오케스트레이션(신규 `src/cli/host.ts`)과 `parse.ts`/
`invocation.ts` 배선을 직접 구현했다. fork 중 하나(Codex 쪽)가 월간 spend limit로 중단됐고,
controlling이 남은 2개 테스트 파일을 직접 마무리했다. 상세 구현 근거·spike 결과·발견한 버그·
diff 요약 전문은 `tasks/W6.md` Task History Attempt 1 entry와 Result/Verification 섹션이
소유한다(재복사하지 않음).

**candidate result 핵심**: write-set은 Task Brief revision 4와 정확히 일치(`bin/aiox.ts`/
`proxy.ts`/codex `launcher.ts`/`daemon/api.ts` 무변경, git diff stat로 확인). Claude fork의
spike가 revision 4의 "spawn된 child가 세션을 계속 소유한다"는 가정을 기각해, `child.exit`
기반 Claude 세션 예기치 않은 종료 감지 설계를 구현 전에 `claude agents --json` 폴링 기반으로
대체했다(Codex의 `api.status()` 폴링과 대칭). `npm run typecheck` PASS,
직렬(`--maxWorkers=1`) 61 files/767 tests PASS, 기본 병렬 `npm test`도 이번 세션 2회 연속
전부 PASS(과거 기록된 test-isolation residual risk가 이번엔 재현 안 됨 — 해소 단정 아님,
관찰만).

**독립 result review(controlling, 코드 fresh read)**: 전체 diff를 처음부터 다시 읽어
write-set 확장 없음, compatibility/fallback 추가 없음, K번째 agent 실패·route wiring 실패·
SIGINT 중복·부분 cleanup 실패 지속·owned runtime/session 소실의 5개 cleanup 경로 전부가
관찰 가능한 결과(실제 daemon API 호출 payload, exit code, stderr 문구)로 테스트됨을
확인했다. 이 review 중 `watchOwnedCodexAgents`/`watchOwnedClaudeSessions`의 폴링이
`.catch()` 없이 fire-and-forget이라 unhandled promise rejection으로 host 프로세스 자체를
죽일 수 있는 버그를 직접 발견해, 같은 세션에서 즉시 수정하고 `vi.useFakeTimers()` +
`process.on("unhandledRejection")` 기반 회귀 테스트로 닫았다(수정 전 실제 red 확인 →
원복해 최종 green 재확인).

**판정: W6 Accept**(revision 4). Work Items의 W6을 `[x]`로 전이했다(위 참고). 남은
residual risk(cmux wrapper의 `claude stop` argv 오염 가능 환경, 폴링 간격 2000ms 기본값,
aiox.yaml 빈 문자열 role/description/instructions 미검증 — W8 소관, 실제 E2E 미실행)는
`tasks/W6.md` Result/Verification이 소유한다. W9가 소비할 cross-artifact handoff(native>compose
문구 유지, Codex eager thread/start·Claude 3-flag 공존 확정 사실)도 같은 곳에 기록했다 —
`docs/specs/aiox-compose-contract.md` §6 본문은 이 entry에서 편집하지 않는다(W9 범위).

Next: W7(`aiox quit` 구현)로 전환했다(Work Items 참고).

### 2026-08-20 20:45 · W6 independent result review — Accept 철회, corrective Attempt 2 재개

독립 review에서 이전 Accept를 유지할 수 없는 production lifecycle 결함 4건과
evidence gap 1건을 확인했다. 코드 변경은 하지 않았고 W6을 같은 outcome의 corrective
Attempt 2 대상으로 재개했으며 W7은 open으로 되돌렸다.

**확인한 사실**

- Claude 단일 attach의 `--instructions`는 여전히 runtime에 주입되지 않는다.
  `invocation.ts`는 text를 `attachAgent()`/DB에만 보내고, 기존
  `launchClaudeStaticMcpChannel()` 호출과 argv에는 이를 전달하지 않는다. W6 discovery가
  기록한 W1 dead-end가 host 전용 `launchClaudeHeadlessSession()`에서만 닫혔고
  `aiox claude --instructions`에는 남았다. Codex는 generic daemon eager `thread/start`
  변경으로 단일 attach도 닫혔다.
- Codex 단일 attach에서 eager start 뒤 TUI spawn 또는 wait가 실패하면
  `invocation.ts`가 `rollbackAgentAttach()`를 호출하지만, 이 API는 runtime이 `ready`이면
  `rolledBack:false`로 조기 반환한다(`state.ts:1106-1115`). W6가 no-resume attach를
  항상 ready runtime으로 바꾼 뒤 기존 rollback test는 API 호출만 확인해 실제
  agent/runtime leak을 놓쳤다.
- `runHost()`는 모든 attach와 route wiring이 끝난 뒤에야 signal handler를 등록한다
  (`host.ts:265-345`). launch 중 SIGINT/SIGTERM은 Node 기본 종료로 빠져 이미 attach된
  agent cleanup을 보장하지 않는다. 또한 foreground gate가 풀리자 handler를 cleanup 전에
  제거한다(`host.ts:372-377`). cleanup 중 두 번째 signal은 기본 종료로 비동기 cleanup을
  중단할 수 있다. 기존 중복-signal test는 두 signal을 같은 microtask window에서 동기
  발화해 후자 경로를 검증하지 않는다.
- Claude cleanup은 같은 agent 안에서 `stopClaudeSession()` 뒤 `detachAgent()`를 직렬
  실행한다(`host.ts:237-252`). stop 실패가 throw되면 그 agent의 detach가 실행되지
  않는다. `Promise.allSettled`는 agent 사이만 격리하므로 Task Brief의 “개별 cleanup
  실패가 나머지를 막지 않는다” 및 전체 daemon-side detach 계약을 만족하지 않는다.
- production executor handoff는 live spike 성공 기준에 dev-channel registration 확인을
  포함했지만, Result에는 3-flag 조합이 “파싱 충돌 없이 정상 동작”했다고만 기록돼
  있고 실제 aiox daemon channel registration evidence가 없다. 따라서 이 verification claim은
  미완료다.

**독립 검증**

- `npm run typecheck` PASS.
- W6 focused 5 files 147 tests PASS, `git diff --check` PASS.
- 직렬 전체 suite 첫 실행은 `tests/unit/daemon/run.test.ts` 2건 실패, 해당 파일 단독은
  5/5 PASS, 직렬 전체 재실행은 61 files/767 tests PASS였다. 기존 test-isolation
  residual risk가 재현된 관찰이며 위 4개 source-level 결함의 반증은 아니다.

**판정**

- 이전 W6 Accept를 철회하고 artifact disposition을 corrective pending으로 바꾼다. 현재
  변경은 blind revert하지 않고 유지한다.
- Attempt 2는 위 4개 lifecycle/injection 결함을 regression test로 먼저 재현해 수정하고,
  실제 daemon registration을 포함한 Claude 3-flag E2E evidence를 닫은 뒤 focused/typecheck/
  직렬 전체 검증과 새 result review를 통과해야 한다.
- W9 handoff와 version-bound native>compose 판단은 이번 finding으로 변경되지 않는다.

Next: W6 corrective Attempt 2 — tests-first로 위 4개 결함을 수정하고 live Claude
channel registration evidence를 확보한 뒤 Accept를 재판정한다.

### 2026-08-20 20:52 · W6 review owner trace — W5 route-member validation 누락 발견

W6의 `routes[]` producer를 소유한 W5 validator와 Kickoff 사용자 결정으로 역추적한
결과, 선행 accepted baseline에 계약 누락이 있어 W5를 corrective active로 재개했고
W6 Attempt 2는 open dependency로 전환했다.

- 확인한 사실: Kickoff `2026-08-19 · W3 후속` entry는 `directed[].from`/`to`가
  해당 group의 `members` 안에 있어야 한다는 선행 결정을 명시적으로 재확인한다.
- 확인한 사실: `validateDirected()`는 `agentNames`만 받아 전체 `agents[]` 존재 여부만
  검사하고 해당 route `members` membership은 검사하지 않는다
  (`src/config/aiox-config-validator.ts:105-156`). 해당 regression test도 없다.
- 관찰 결과: `agents: [a,b,c]`, `members:[a,b]`, `directed:[{from:a,to:c}]` 형상이
  validator를 통과하고 W6 `buildRouteConnections()`에서 group 밖 `a -> c` route를 실제
  생성할 수 있다. `directed`가 member pair의 mesh를 좁히는 override라는 계약과 다르다.

Next: W5 corrective — route-local member set으로 `directed.from/to` membership을 검증하는
red test와 수정을 먼저 닫고, W6 Attempt 2로 복귀한다.

### 2026-08-20 21:03 · W5→W6 executor / 후속 independent Codex reviewer handoff 준비

- 사용자는 새 Claude가 W5 corrective와 W6 Attempt 2를 순서대로 실행하고, 그 뒤
  새 Codex가 전체 결과와 context/log Reconcile을 독립 검토하는 2-session handoff를
  요청했다.
- Claude executor의 완료 gate는 W5 route-local membership correction 선행, W6 결함 4건의
  red→green, 실제 daemon dev-channel registration live evidence, focused/typecheck/직렬 전체
  검증과 candidate result 기록이다. 자체 Accept/W7 전환은 금지하고 Codex review를
  기다린다.
- Codex reviewer는 Claude 보고를 권위로 취급하지 않고 actual diff·owner call path·test·
  live process/session cleanup·log/package state를 재검증한 뒤 전체/부분 수용 또는 기각을
  판정한다. Accept가 타당할 때만 W5/W6 marker와 next pointer를 W7로 Reconcile한다.

Next: 새 Claude executor에게 corrective implementation prompt를 전달한다.

### 2026-08-20 21:29 · W5 corrective candidate + W6 corrective Attempt 2 candidate 제출 — 후속 Codex independent review 대기

이 세션(Claude executor)이 W5 corrective와 W6 corrective Attempt 2를 순서대로 구현했다.
**두 결과 모두 candidate다 — 이 세션은 스스로 Accept 판정하지 않았고 W5/W6 marker와 next
pointer를 W7로 넘기지 않았다.** 상세 trace·red/green 증거·검증 결과 전문은 각 task record가
소유한다(재복사하지 않음): `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W5.md`
"corrective Attempt 2" entry, `tasks/W6.md` "corrective Attempt 2" entry.

**W5 candidate 요약**: `validateDirected()`가 `directed[].from`/`.to`를 전체 `agents[]`
존재 여부만 검사하고 그 route의 `members` 안에 있는지는 검사하지 않던 결함(Kickoff
`2026-08-17` 로그의 route-local membership 결정 위반)을 route-local `memberNames` set을
추가로 전달하는 최소 수정으로 닫았다. red 회귀 테스트 5개(선언된 agent지만 members 밖인
`from`/단일 `to`/배열 `to` 각각, unknown-agent와 route-member 에러 구분, 다른 route의
membership이 서로 영향받지 않음) → 전부 확인 후 green. `npx vitest run tests/unit/config/`
3 files/58 tests PASS(기존 53+신규 5), `npm run typecheck` PASS.

**W6 candidate 요약(Attempt 2)**: 독립 review가 확인한 4개 결함을 TDD로 수정했다.
(1) Claude 단일 attach `--instructions`가 `launchClaudeStaticMcpChannel()`에 주입되지 않던
문제 — `buildLaunchClaudeChannelArgs`/`launchClaudeStaticMcpChannel`/invocation.ts에
instructions passthrough 추가. (2) Codex TUI 실패 시 `rollbackAgentAttach()`가 W6 eager-start
이후 `ready` runtime에 no-op하던 leak — `detachAgent()`로 교체하고 항상 await, 실패 시 원래
에러와 병합 보고. (3) host signal handler가 attach/route 이후에만 등록되고 cleanup 전에
해제되던 문제 — 최상단 등록 + `finally`에서만 해제 + 매 loop 상단 `shuttingDown` 확인으로
재작성. (4) Claude stop 실패 시 같은 agent의 detach가 skip되던 문제 — `cleanupAgent()`로
stop/detach를 독립적으로 시도하고 둘 다 에러를 보고하도록 수정. 4개 전부 red 회귀
테스트(host.test.ts 신규 10개, invocation.test.ts 신규 6개+갱신 1개, claude-channel.test.ts
신규 5개)로 결함을 먼저 재현한 뒤 최소 수정으로 green 전환했다.

**live Claude dev-channel registration evidence(이번 세션에서 새로 확보, 격리 환경/순정
바이너리)**: 격리된 project/socket/daemon과 cmux wrapper를 우회한 순정 Claude CLI
(`/Users/lunaxislu/.local/bin/claude`)로 실제 daemon registration을 직접 관찰했다. 핵심
발견 — **`aiox host`가 띄우는 idle `--bg` Claude agent는 daemon dev-channel에 실제로
등록되지 않는다.** `receiveClaudeChannelMessage()`(agent MCP tool `send`의 실제 daemon
진입점)로 production dispatch 경로를 직접 실행해 확인한 사실이다(`dispatch.deferred`에
`target_runtime_unavailable` 사유 포함, mock이 아닌 실제 daemon 응답). 대조군으로 같은
flag 조합에 실제 model turn이 있는 `claude -p`를 실행하면 `mcp-claude` 프로세스가 즉시
spawn되고 실제 daemon dispatch가 `delivered:1`로 성공함을 확인했다 — registration 메커니즘
자체는 정상이며, 원인은 idle 세션이 첫 turn을 아직 시작하지 않아 MCP 서버 자체가 아직
spawn되지 않는다는 것이다. marker instruction(`--append-system-prompt`) 전달과 `claude stop`
cleanup(실제 `aiox host` SIGINT로 재현)은 정상 확인됐다. `claude stop` idempotency는 Attempt
1의 "완전히 idempotent" 서술과 달리 시간 경계가 있음을 추가로 확인해 정정했다(즉시
재호출은 idempotent, 수십 초~분 뒤 재호출은 "No job matching"). 사용한 임시 daemon·소켓·
session·process는 전부 정리했고 잔존이 없음을 재확인했다(상세 근거는 `tasks/W6.md`가
소유).

**신규 발견(내 4개 결함 범위 밖, W6 Accept 여부에 직결)**: 위 idle-세션 registration
미도달은 `aiox host`의 핵심 가치(Claude agent를 aiox 메시징으로 도달 가능하게 하는 것)를
무력화하는 구조적 gap이다. 조용히 수정하지 않았다 — 설계 결정(예: attach 직후 합성
instruction을 실제 첫 prompt로도 보낼지, 다른 활성화 메커니즘을 도입할지)이 필요한 사안으로
그대로 보고한다.

**전체 검증(이번 세션에서 직접 실행)**: `npm run typecheck` PASS(에러 0). 전체 직렬
(`npx vitest run --maxWorkers=1`) 61 files/791 tests 전부 PASS. 기본 병렬 `npm test`도
61 files/791 tests 전부 PASS(이번 실행에서는 과거 기록된 test-isolation residual risk
재현 없음 — 해소 단정 아님). `git diff --check` PASS. 변경한 Markdown(`tasks/W5.md`,
`tasks/W6.md`)에 `scripts/check-markdown-inline-code` 실행해 multi-line inline code
위반 5건을 발견·수정 후 재실행 PASS. 이 entry 작성 후 controlling log에 대해서도
동일 스크립트를 실행할 예정(Reconcile 단계).

**남은 불확실성 / residual risk**:
1. 위 idle-세션 registration 미도달 blocker — W6 Accept를 막을 수 있는 발견이며 사용자/후속
   reviewer 판단이 필요하다.
2. 결함 2(Codex TUI 실패 cleanup)의 route 물리 삭제 효과는 이 시나리오 자체가 route를
   아직 가질 수 없어 별도 검증하지 않았다(W2 기존 커버리지로 충분하다고 판단, `tasks/W6.md`
   근거 참고).
3. `claude stop` idempotency의 시간 경계는 정확한 window를 측정하지 않았다(수십 초 내
   idempotent, 1분+ 후 not-found만 확인) — 현재 소비 코드는 이 사실에 의존하지 않으므로
   추가 조치는 하지 않았다.
4. Attempt 1이 남긴 기존 residual risk(native>compose version-bound, cmux wrapper 환경,
   폴링 간격 2000ms, aiox.yaml 빈 문자열 미검증(W8 소관))는 이번 세션에서 변경하지 않았다.

**후속 Codex independent reviewer에게**: Claude 보고를 권위로 취급하지 말고 실제 diff·
owner call path·test·(가능하면) live process/session cleanup·log/package state를 직접
재검증한 뒤 전체/부분 수용 또는 기각을 판정해 달라. 특히 위 idle-세션 registration
미도달 발견이 W6 Accept를 막아야 하는지, 아니면 별도 Work Item으로 분리해도 되는지
판단이 필요하다. Accept가 타당할 때만 W5/W6 marker와 next pointer를 W7로 Reconcile한다.

Next: 후속 Codex independent reviewer의 재검증.

### 2026-08-20 22:39 · W5/W6 corrective 독립 result review — 부분 수용

Disposition: **부분 수용**. W5 corrective Attempt 2는 Accept한다. W6 corrective 중 Claude 단일 attach instruction 주입과 Claude stop/detach 단계 독립성은 Accept하지만, host signal lifecycle과 Codex TUI failure cleanup은 추가 defect로 Reject하며 W6 전체도 live registration blocker 때문에 완료하지 않는다.

확인한 사실:
- W5는 route별 `memberNames`로 `from`/단일·배열 `to`를 검증하고 unknown agent와 known-but-non-member를 같은 field path의 상호 배타적 issue로 구분한다. 복수 route 격리, aggregate 수집과 기존 validator behavior도 유지됐다.
- Claude 단일 attach는 parse → daemon attach/DB → static launcher → spawn argv까지 instruction 원문을 전달한다. undefined omit, multiline/특수문자 보존, development-channel flags 공존을 source와 tests로 확인했다.
- Claude cleanup은 stop 실패 뒤에도 detach를 시도하고 두 실패를 함께 보고하며 다른 agent cleanup을 막지 않는다.

Completion blockers와 corrective 범위:
1. promptless `claude --bg` host session의 daemon channel registration 성공 evidence가 없다. executor 보고는 실제 dispatch가 `target_runtime_unavailable`이었다고 하며, 보존 raw scripts에는 probe code만 있고 dispatch JSON raw output은 없다. marker raw probe도 dev-channel flag와 결합되지 않았다. idle activation/first-turn mechanism을 사용자와 결정하고 production parser+marker+dev-channel+daemon registration을 한 live scenario에서 다시 입증해야 한다.
2. pending Claude attach 중 signal을 보낸 read-only probe에서 attach 완료 뒤 새 headless spawn이 1회 시작됐다(`spawnCalls:1`). `src/cli/host.ts`는 attach 성공 직후 Claude spawn 전에 `shuttingDown`을 재검사해야 하며 deterministic regression test가 필요하다.
3. Codex cleanup은 `api.detachAgent()` transport failure는 병합하지만 production `disposeRuntime()`이 runtime dispose rejection을 삼켜 실제 cleanup failure가 진단/exit code에 반영되지 않는다. 다른 cleanup을 계속하면서 dispose failure를 observable result로 전달하는 contract와 test가 필요하다.
4. real-state TUI failure test는 wait rejection의 row 삭제/dispose 호출만 확인한다. `pairName` attach는 TUI launch 전 incident route를 만들 수 있으므로 sync throw와 incident-route removal을 failure-path real-state tests로 보강한다.

독립 검증: focused 9 files/339 tests PASS, `npm run typecheck` PASS, 직렬 전체 61 files/791 tests PASS. 기본 `npm test` 최초 run은 sandbox TCP/Unix socket `listen EPERM`으로 62 tests 실패했고, sandbox 밖 재실행은 61/791 PASS했다. `git diff --check` PASS. live cleanup audit에서 short socket과 recorded host pid는 없고 current Claude session 목록/프로세스에 probe 이름은 없었다; scratch scripts/logs는 남아 있다.

Context Reconcile: W5는 `[x]`, W6은 corrective active `[>]`, W7은 open 유지한다. Attempt 1 Accept와 candidate entries는 append-only history로 보존하고 current disposition으로 사용하지 않는다. W9 spec body는 변경되지 않았으며 version-bound native>compose handoff도 유지된다.

Next: W6 corrective Attempt 3 — 위 1~4를 닫고 combined live evidence와 전체 검증을 다시 제출한다. W7로 전환하지 않는다.

### 2026-08-20 22:48 · W6 계약 재판정 — headless fallback의 기본 경로 선점 철회

- 사용자 계약 정정: `aiox host`의 Claude 기본 실행은 background session/resume이
  아니라 기존 foreground TUI launcher의
  `claude --dangerously-load-development-channels server:<channel>` 직접 실행이다.
- 확인한 원인: W6 revision 4 Task Brief가 전체 agent headless/TTY 미부착을 목표로
  고정하고 view/TUI를 후속 stage로 미룬다. 구현은 그 전제를 따라 fallback용
  headless 기반을 기본 host 경로로 만들었다.
- Disposition: W6 Reject와 `[>]`를 유지한다. idle `--bg` registration을 보강하는
  기존 Attempt 3 pointer는 폐기하고 W6 Task Brief revision 5 contract review로 되돌린다.
- 삭제 후보: Claude headless argv/parser/stop/list, host의 session-id·background
  spawn/watcher/stop lifecycle, invocation headless wiring과 전용 tests. pre-v1이므로
  compatibility/fallback alias로 존치하지 않는다.
- 유지 후보: host entry, config load+semantic validation, instruction composition, attach/detach,
  route wiring, signal/cleanup 골격, foreground `launchClaudeStaticMcpChannel()` instruction 전달.
  Codex eager thread pre-create+resume는 TUI/instruction binding 관점에서 재검토한다.

Next: W6 revision 5 contract review — foreground Claude/Codex TUI가 실제 observable result가
되도록 control plane과 view launch 책임을 다시 연결하고 정확한 삭제·유지 write-set을
닫는다. W7로 전환하지 않는다.

### 2026-08-20 22:52 · W6 기본 observable contract 확정 — YAML의 모든 agent TUI 실행

- 사용자 확정: `aiox host`를 실행하면 cwd의 `aiox.yaml`에 선언된 각 agent가
  전부 실행되고, Codex agent는 각각 Codex TUI로, Claude agent는 각각 Claude
  TUI로 실행된다.
- 이 결과가 `aiox host`의 기본 contract이며 headless runtime/session 생성은 이를 대체할
  수 없다. 여러 TUI를 보여 주는 view launch는 후속 편의 기능이 아니라 host
  실행 계약의 필수 consumer다.
- Next: 이 contract를 기준으로 W6 revision 5의 process/view composition, 실행 순서,
  실패·signal·cleanup 경계와 삭제·유지 write-set을 확정한다.

### 2026-08-20 22:56 · W6 failure isolation 계약 확정 — agent-local failure, 성공 agent 계속

- 사용자 확정: 일부 TUI 실행 실패는 compose 전체 rollback 조건이 아니다. 실패한
  agent만 daemon의 유효한 등록·route에 남지 않게 정리하고 다른 agent TUI는 계속
  실행한다.
- route는 실제로 TUI/runtime readiness와 daemon 등록을 성공한 agent들 사이에서만
  연결한다. 실패 agent가 포함된 연결은 그 연결만 생성하지 않고 나머지
  연결은 계속한다.
- 현재 revision 4의 fail-fast 전체 `cleanupAll()` 계약은 폐기한다. revision 5는
  agent별 prepare/launch/readiness/commit 경계와 agent-local cleanup을 닫아야 한다.
- Next: Claude token과 Codex runtime/endpoint가 TUI launch 전에 필요한 현 API 결합을
  추적해 provisional registration→commit이 필요한지, 기존 attach→실패 시 즉시 detach로
  외부 observable contract을 충족할 수 있는지 재판정한다.

### 2026-08-20 23:04 · W6 Task Brief revision 5 확정 — Claude executor handoff 준비

- W6 현재 계약을 revision 5로 교체했다. `aiox.yaml` agent별 vendor-native TUI,
  agent-local launch/readiness failure, 성공 agent subset route wiring, agent-local unexpected-loss
  cleanup, signal에서만 active set 전체 cleanup이 권위다.
- revision 4의 Claude headless/background session/parser/stop/list/watcher와 fail-fast
  `cleanupAll()`은 삭제·재작성 대상으로 명시했다. compatibility/fallback으로 존치하지
  않는다.
- 기존 단일 CLI의 `launchClaudeStaticMcpChannel()`/
  `launchCodexTui()`를 direct TUI primitive로 재사용하고, W6은 distinct-terminal view
  consumer 계약을 생산한다. concrete view driver가 없는 현 repo 상태에서 N개 inherited
  stdio나 headless fallback으로 성공을 위장하지 않는다.
- Next: Claude executor가 revision 5의 red tests→최소 production 수정→focused/full
  verification→candidate result까지 수행한다. 자체 Accept, W6 `[x]`, W7 전환,
  W9 spec 본문 편집은 금지한다.

### 2026-08-20 23:07 · W6 live gate 보정 — interactive TUI는 사용자 개입

- executor 자동 범위: isolated config/socket/daemon, production command/argv/env, daemon state/raw
  log, process/socket cleanup, 비용 없는 deterministic 검증.
- 사용자 live gate: 각 Codex/Claude TUI의 실제 표시, 입력·포커스, 한 TUI 종료
  후 나머지 유지, host signal 후 view cleanup을 사용자가 직접 확인한다.
- Claude executor는 live 직전에 command·예상 view·사용자 action·판정 기준·cleanup을
  제시하고 멈춘다. 사용자 확인 없이 live/UX PASS를 선언하지 않는다.

Next: Claude executor implementation→자동 검증→사용자-assisted live gate→candidate
result. 후속 controlling Codex가 독립 review한다.

### 2026-08-20 23:09 · W6 live matrix 확정 — cmux와 VS Code terminal

- user-assisted live gate를 cmux와 VS Code integrated terminal에서 각각 1회 수행한다.
  동일 YAML·production host 경로에서 agent별 Codex/Claude TUI 표시·입력, 한 TUI
  부분 종료 격리, signal 후 view cleanup을 사용자가 확인한다.
- executor는 각 환경의 daemon registration·route delivery·agent-local cleanup·process/socket
  cleanup raw evidence를 수집한다. VS Code에 production distinct-TUI primitive가 없다면
  수동 별도 attach로 대체하지 말고 blocker로 보고한다.

Next: Claude executor가 두 view 환경의 capability·production call path를 discovery에 포함한
뒤 implementation과 자동 검증을 수행하고, 두 live run 직전에 사용자 개입을 요청한다.

### 2026-08-20 23:36 · W6 revision 5 Attempt 3 candidate — 재구현 완료, view driver blocker로 live gate 미수행

Claude executor가 revision 5를 tests-first로 재구현해 candidate를 제출했다. 자체 Accept·
W6 `[x]`·W7 전환은 하지 않았다. 상세 trace와 Result/Verification은 W6 task record의
`2026-08-20 23:45` entry가 소유한다(여기 재복사하지 않음).

**핵심 결과 요약**

- `aiox host`가 agent별 vendor-native TUI launch **request**(structured argv/env/cwd)를
  만들어 주입된 view driver에 넘기는 consumer 계약으로 재작성됐다. agent-local
  attach/launch/readiness 실패, 성공 subset 기준 route filtering, agent-local loss,
  signal 소유와 exactly-once cleanup이 전부 red→green으로 구현됐다.
- headless 표면(`--bg` argv/parser, `claude stop`, background session 목록, host의
  `claudeSessionId`/background watcher, invocation wiring, 전용 test 파일)은 전부
  삭제했고 alias/fallback으로 존치하지 않았다.
- 이전 독립 review의 production defect 2건도 닫았다. (a) signal 이후 새 view spawn 금지를
  attach 직후 gate로 구현, (b) `runtime.dispose()` rejection을 daemon이 더 이상 삼키지
  않고 `DetachAgentResult.runtimeDisposeError`로 노출 — host cleanup exit code와 단일 CLI
  TUI 실패 진단 양쪽에서 관찰된다.
- Codex eager thread pre-create+resume는 **유지**로 판정했다. Codex TUI argv에
  instruction surface가 없어 composed instruction이 daemon의
  `thread/start{developerInstructions}` 외 경로로 도달할 수 없고, eager start가 없으면
  TUI를 daemon 추적 thread에 결정적으로 바인딩할 수 없다(둘 다 call path로 확인).
- 검증: `npm run typecheck` PASS, `npx vitest run --maxWorkers=1` 61 files/786 tests 최초
  실행부터 PASS, 병렬 `npm test` 동일, `git diff --check` PASS.

**Live gate: 두 환경 모두 미수행 — view driver implementation blocker**

설치된 환경에 structured-argv distinct-TTY primitive가 없다는 것을 직접 확인했다.

- cmux `1.3.0-HEAD+bc9be90`: `new-pane`/`new-surface`/`new-split`은 command/argv/cwd 인자를
  아예 받지 않고 기본 shell만 띄운다. command를 받는 표면은 `new-workspace --command`,
  `send`, `respawn-pane --command` 셋뿐이고 셋 다 help 원문이 "shell에 텍스트를 보낸다"로
  명시된 단일 문자열이다. socket capability 목록에도 argv를 싣는 method가 없다.
- VS Code `1.128.1`: `code --help` 전체에 integrated terminal 생성/명령 실행 옵션이 없다.
- `tmux` 미설치, `node-pty` 미설치.

따라서 production `aiox host`가 agent별 TUI를 띄울 수 없고, 사용자가 확인해야 할
TUI 표시·입력/포커스·부분 종료 격리·signal 후 view cleanup을 이번 세션에서 관찰할 수
없다. 수동으로 별도 `aiox claude`/`codex`를 띄워 host PASS로 대체하지 않았다. 대신
production `aiox host`는 daemon side effect 이전에 `aiox.invocation.no_agent_view_driver`로
거절하며(실제 실행으로 확인, `~/.aiox/dev/` 여전히 빈 디렉터리) 조용한 headless 강등이나
한 stdio에 N개 TUI를 얹는 동작은 없다.

**사용자 결정이 필요한 선택지(executor가 임의 채택하지 않음)**

- 옵션 A — cmux spec-file 간접층: host가 agent별 launch spec을 0600 파일로 쓰고, 새
  pane을 만든 뒤 고정 문자열(`aiox` 내부 view-runner 실행)만 shell에 타이핑한다.
  instruction·token은 shell을 거치지 않는다. 단, 타이핑되는 문자열에 경로가 들어가면
  shell quoting이 필요하고 사용자 기본 shell(zsh/fish 등)에 따라 규칙이 갈린다 —
  경로마저 없애려면 daemon 측 claim protocol이 추가로 필요하다. 새 internal command와
  프로토콜을 만드는 설계 결정이다.
- 옵션 B — aiox가 PTY를 직접 소유(`node-pty` 등 신규 dependency + 자체 view 렌더링).
  plan의 view-driver 일반화 stage가 소유하는 범위와 정합적이다.
- 옵션 C — macOS `osascript`/`open -a Terminal`: 다시 shell 문자열이라 채택하지 않았다.

**후속 independent reviewer가 확인할 것**

W6 task record의 Residual risk 6항목, 특히 (1) live evidence 0건이 Accept를 막는지,
(2) Claude readiness를 view handle resolution으로 정의하고 daemon channel registration을
gate로 쓰지 않은 판단, (3) active agent 0일 때 foreground 대기 없이 종료하는 executor
판단, (4) 이번 변경으로 `src/`에서 미사용이 된 `rollbackAgentAttach`의 처리.

Next: view driver 옵션 A/B에 대한 사용자 결정. 결정 후 driver 구현 → cmux live gate →
VS Code live gate 순으로 진행한다. W6은 계속 `[>]`이고 W7로 전환하지 않는다.

### 2026-08-21 12:49 · W11 delegated result review 시작 — live 제외 코드·삭제·테스트 범위

- 사용자 지시에 따라 W6 revision 5 Attempt 3의 live matrix를 별도 논의로 남기고, 코드 삭제·추가 수정·deterministic tests만 독립 검토하는 W11을 등록했다.
- W6은 candidate/open으로 내리고 W11을 active next pointer로 전환했다. W11 reviewer는 read-only이며 Accept, W6 `[x]`, W7 전환 권한이 없다.
- Task record: `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W11.md`.
- Next: delegated reviewer 결과를 controlling이 실제 source·diff·tests와 대조해 소비한다. Live 1/2는 소비하지 않고 사용자와 별도 논의한다.

### 2026-08-21 12:59 · W11 result review 소비 — W6 code candidate 부분 수용, correction 재개

- Disposition: W11 reviewer result를 controlling이 source와 대조해 수용했다. W6 revision 5 Attempt 3의 structured argv, headless production 표면 삭제, 직렬 agent-local failure isolation, successful subset route, 기본 real-state tests는 부분 수용한다. W6 전체 completion은 수용하지 않는다.
- Completion blockers: production `process.once` 반복 signal 결함, loss cleanup과 global shutdown 경합, view listener/watcher setup·stop 예외의 active 누수, production entry의 daemon-before-config/signal 순서, eager Codex attach cleanup 오류 은닉. `rollbackAgentAttach`는 근거 없는 obsolete 표면 후보다.
- Owner decision / live 분리: Claude daemon registration readiness와 timeout/first-turn 정책, active agent 0 종료, concrete view driver 및 Live 1/2는 코드 correction과 분리해 사용자와 논의한다. Live는 이번 review에서 not-run이다.
- Verification: focused 8 files/305 PASS, typecheck PASS, serial 61/787 PASS. 기본 `npm test`는 sandbox에서 socket/HTTP 계열 최초/재실행 실패, 단독 socket 13/13 PASS, sandbox 밖 61/787 PASS. diff/Markdown/log/package checks PASS.
- Context Reconcile: W11은 Result Consumption Gate를 통과해 완료하고, W6을 code correction active로 복귀한다. W7은 open 유지하며 W9 spec 본문은 변경하지 않는다.
- Next: W6 revision 5 code correction — 위 lifecycle blockers를 tests-first로 닫고 독립 result review를 다시 수행한다. Live 1/2와 Claude readiness 정책은 구현 전 사용자 논의가 필요하다.

### 2026-08-21 13:38 · W6 revision 5 correction candidate 제출 — W11 completion blocker 6건 tests-first 수정, `rollbackAgentAttach` 삭제, 자체 Accept 아님

- 새 executor(Claude)가 W11이 확인한 completion blocker(반복 signal `process.once`, loss/global
  shutdown 경합, watcher/onLost 예외의 active 누수, invocation의 daemon-before-config 순서, eager
  Codex attach cleanup 오류 은닉)를 tests-first(red→green, 각 fix mutation check로 재확인)로
  수정했다. Production consumer 0건을 확인한 `rollbackAgentAttach`(API/state/types/tests)도
  삭제했고, 그로 인해 stale해진 architecture 문서 5개의 관련 서술을 정합화했다.
- Claude readiness(view handle resolution = launch 성공, daemon channel registration은 readiness
  gate 아님)와 active agent 0 종료 정책은 이미 Attempt 3가 구현한 대로 변경 없이 재확인만 했다.
  concrete view driver, Live 1(cmux)/Live 2(VS Code)는 이번 범위에서 제외했다 —
  `not-run — user deferred`.
- 검증: `npm run typecheck` PASS, `npx vitest run --maxWorkers=1` 61 files/792 tests PASS(이전
  787 대비 +5 net), 기본 병렬 `npm test` 2회 연속 61/792 PASS, `git diff --check` PASS, 변경
  Markdown 5개 inline-code PASS, `log check`/`package-log check` PASS.
- 상세 finding별 red→green 근거, mutation check 결과, write-set과 residual risk 전문은
  `logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W6.md`의
  `2026-08-21 13:38 · W6 revision 5 correction` entry와 그 Result/Verification 섹션이 소유한다
  (재복사하지 않음).
- **이 executor는 자체 Accept, W6 `[x]`, W7 전환을 선언하지 않는다.** W6은 계속 `[>]`이다.

Next: controlling(사용자 또는 독립 reviewer)의 candidate result 재검증 — 위 W6.md entry가 지목한
residual risk(architecture 문서의 사전 존재 evidence citation drift, Claude readiness 정책
재확인 필요성)를 포함해 실제 diff·tests·docs를 재확인한 뒤 수용 여부를 판정한다.

### 2026-08-21 13:48 · W6 revision 5 correction 독립 result review — Reject, lifecycle blocker 4건 잔존

Disposition: **기각**. W6 revision 5 correction candidate의 일부 수정은 확인했지만 completion blocker가 남아 W6 `[>]`, W7 `[ ]`을 유지한다. Live 1/2는 사용자 지시대로 실행하지 않았다.

확인한 blocker:
- production 호출은 `src/cli/invocation.ts:276-313`에서 config 검증 후 daemon start/API를 수행하고, 그 뒤 `src/cli/host.ts:351-359`에서 signal handler를 등록한다. config→handler→daemon/API 계약이 여전히 닫히지 않았고 daemon pending signal을 놓친다. view driver resolution도 config보다 앞이라 driver 없는 build에서는 invalid YAML보다 `no_agent_view_driver`가 먼저 나온다.
- `view.onLost()` 등록 throw가 per-agent catch가 아닌 outer catch로 가 attach loop를 중단하고 기존 성공 agent까지 cleanup한다. agent-local failure isolation 위반이며 기존 test는 agent 1개라 이를 가린다.
- `cleanUpAll()`의 pending cleanup 1회 snapshot 뒤 signal→loss가 들어오면 loss agent가 active에서도 빠져 host가 detach 완료 전 unregister/return한다. production `runHost` microtask probe로 `unregister` 뒤 `detach-end:b`를 재현했다.
- eager Codex `startThread`/`resumeThread`가 generic error를 던지고 dispose도 실패하면 `runtimeDisposeError`를 계산한 뒤 원 오류만 rethrow하여 cleanup 오류가 사라진다. 신규 test는 coded error만 검증한다.

문서/result evidence finding:
- 이번에 수정한 architecture current/as-built claim 중 3개 문서가 required exact `file:line` range를 제거해 `docs/AGENTS.md` Evidence 계약을 위반했다. 이는 pre-existing unrelated drift가 아니라 이번 write-set 결함이다.
- `rollbackAgentAttach` production/API/type surface 삭제는 확인했지만 `.ts` 전체 grep 0건 주장은 test 주석 4건 때문에 재현되지 않는다.

독립 검증: focused 5 files/216 tests PASS; typecheck PASS; 직렬 전체 61 files/792 tests PASS. 기본 `npm test` 최초 실행은 792 assertion PASS 후 closed SQLite의 unhandled rejection 4건으로 exit 1, 즉시 재실행은 61/792 PASS였다. 최초 실패를 PASS로 축약하지 않는다. diff check, 변경 Markdown inline-code, controlling log check, package-log check는 PASS이며 long-log hard 경고는 유지된다.

상세 exact path/repro/corrective 범위는 `tasks/W6.md`의 `2026-08-21 13:46 · correction candidate 독립 result review` entry가 소유한다.

Next: W6 revision 5 corrective — production config→persistent signal handler→daemon/API 순서, `onLost` agent-local 격리, signal↔loss 양방향 cleanup await, generic Codex 원 오류+dispose 오류 병합, 변경 architecture evidence range를 tests-first로 닫고 다시 독립 review한다. W7로 전환하지 않는다.

### 2026-08-21 · W6 revision 5 corrective round 2 candidate 제출 — 5개 completion blocker(A-E) + F 잔존 검색 정정, 자체 Accept 아님

새 executor(Claude)가 `2026-08-21 13:46` 독립 result review Reject entry가 확인한 5개 blocker를
tests-first로 수정했다: (A) `src/cli/invocation.ts`의 `case "host":`를 config load/validate →
view-driver resolve → persistent signal handler 등록 → `startDaemon()`(pending 중 signal 체크) →
`getDaemonApi()`(pending 중 signal 체크) → `runHostFn`(신규 `RunHostOptions.signal` controller로
전달, unregister는 `runHostFn` 완료 후 finally) 순서로 재작성. (B) `src/cli/host.ts`의
`view.onLost()` 등록을 자체 try/catch로 감싸 `active.set()`보다 먼저 실행 — 등록 실패는 그 agent만
close/detach하고 나머지 YAML agent와 route wiring은 계속됨(agents `[a,b,c]`, b만 실패하는 신규
테스트로 검증). (C) `cleanUpAll()`의 단일 `pendingLossCleanups` snapshot을 `for(;;)` drain
loop로 교체 — signal→loss 역순에서 이전에 놓치던 cleanup을 결정론적 microtask-timing 테스트로
재현·검증. (D) `src/daemon/state.ts`의 eager Codex attach catch에서 generic(untyped)
`startThread()`/`resumeThread()` rejection과 dispose 실패가 함께 발생하면 원 오류를 보존한 채
`(runtime cleanup also failed: ...)`로 병합해 `{cause}`로 원 오류도 유지(기존 typed-error 분기와
dispose-success 케이스는 무변경). (E) 독립 reviewer가 지목한 architecture 문서 3개 + diff 대조로
추가 발견한 4번째 문서(`local-runtime-claude-adapter.md`)의 함수명-only evidence를 정확한
`file:line`으로 복구, `local-runtime-daemon-transport-api.md`는 표 전역의 기존 method-name 관례라
판단해 손대지 않음. (F) `rollbackAgentAttach` 잔존 검색을 재실행해 production/API/type 0건,
`tests/unit/cli/invocation.test.ts` historical rationale 주석 4건, `docs/` 정확한 과거-대비 서술
1건으로 정확히 분해해 보고(이전 candidate의 "0건" 주장은 재현되지 않음을 확인).

**검증**: 신규 red→green 9개 테스트(A 4, B 1, C 1, D 3) + 기존 테스트 1개(A, config mock 보강) 전부 최초 실패 확인 후 green. Focused
10 files/267 tests PASS. `npm run typecheck` PASS. `npx vitest run --maxWorkers=1` 61 files/801
tests PASS. 기본 병렬 `npm test` 4회 연속 61/801 PASS(이번 세션은 최초 실행 포함 실패 0건 —
과거 attempt가 기록한 sandbox socket/HTTP 병렬 test-isolation 문제가 재현되지 않았으나 해소로
단정하지 않는다). `git diff --check` PASS. 변경 Markdown 4개 architecture 문서
`scripts/check-markdown-inline-code` 전부 exit 0.

**Live 1(cmux)/Live 2(VS Code)**: not-run — user deferred(사용자 지시, 이번 corrective 범위 밖).

상세 finding별 red→green 근거, 정확한 write-set, mutation check 결과, residual risk 전문은
`logs/packages/2026-08-19-G2-Config-CLI-MCP-Foreground-구현/tasks/W6.md`의
`### 2026-08-21 · W6 revision 5 corrective(round 2)` entry와
`### Result / Verification (Corrective round 2 — blocker A-F)` 섹션이 소유한다(재복사하지 않음).

**이 executor는 자체 Accept, W6 `[x]`, W7 전환, W9 spec 본문 편집을 하지 않았다.** W6은 계속
`[>]`, W7은 계속 `[ ]`이다.

Next: controlling(사용자 또는 독립 reviewer)의 candidate result 재검증 — 위 W6.md entry가 지목한
residual risk(blocker C 테스트의 정확한 microtask-timing 의존성, daemon-transport-api.md 표
관례 판단, Claude readiness/active-agent-0/concrete view driver/Live 1·2는 여전히 분리)를 포함해
실제 diff·tests·docs를 재확인한 뒤 수용 여부를 판정한다.

### 2026-08-21 14:33 · W6 corrective round 2 독립 result review — 부분 수용, architecture evidence 보강 필요

Disposition: **부분 수용**. W6 corrective round 2의 production/code findings A-D와 rollbackAgentAttach 검색 정정 F는 독립 source/test/probe로 수용한다. Architecture evidence E는 claim↔evidence sufficiency가 닫히지 않아 Reject하며 W6 `[>]`, W7 `[ ]`을 유지한다. Live 1/2는 user deferred로 미실행이다.

수용 근거: production entry는 config→view prerequisite→persistent signal handler→daemon/API→runHost 순서로 바뀌었고 pending signal과 handler lifetime tests가 실제 invocation 경로를 검증한다. `onLost` 등록 실패는 해당 agent만 awaited cleanup하고 후속 agent와 성공 subset routes를 유지한다. cleanup drain loop는 signal→loss 독립 probe에서 detach gate 전 host pending, gate 후 detach 완료→unregister 순서를 보였다. Generic Codex attach error와 dispose error도 원 cause를 보존해 함께 관찰 가능하며 typed/success 경로 회귀가 없다. F의 production/API/type 0, test historical comments 4, docs historical statement 1 분해도 검색과 일치한다.

미수용 finding: `docs/architecture/local-runtime-cli-and-operator-surfaces.md:76-91`과 `local-runtime-codex-adapter.md:85-89`는 detach가 runtime dispose와 row/routes 삭제를 수행한다고 주장하지만 evidence가 CLI helper `src/cli/invocation.ts:533-558`만 가리켜 daemon-side state effect를 증명하지 않는다. TUI failure call sites와 owner 구현 `src/daemon/state.ts:3073-3130` 또는 동등한 state-effect test range를 claim별로 함께 매핑해야 한다. Exact range가 존재한다는 것만으로 Evidence 계약이 충족되지는 않는다.

독립 검증: focused 10 files/267 PASS, typecheck PASS, serial 61/801 PASS, 기본 npm test 61/801 최초 PASS, signal→loss production probe PASS, diff/Markdown/log/package checks PASS. 상세 exact path와 accepted/rejected scope는 W6 task record의 `2026-08-21 14:32 · corrective round 2 독립 result review` entry가 소유한다.

Next: W6 architecture evidence corrective — 위 두 문서만 claim별 call-site+daemon state-effect exact range로 보강하고 재검증한다. Production code/tests는 수정하지 않고 W7로 전환하지 않는다.

### 2026-08-21 14:43 · W12 architecture evidence corrective 위임 시작

- 사용자 지시로 W6 architecture evidence gap만 W12 delegated task로 분리했다. W6 code A-D/F accepted state는 유지하며 production code/tests와 W9 spec 본문은 write-set에서 제외한다.
- W12 revision 2는 `local-runtime-cli-and-operator-surfaces.md`와 `local-runtime-codex-adapter.md`의 TUI-failure claim에 CLI call site와 daemon dispose/row/routes state-effect exact range를 함께 매핑하는 최소 correction만 허용한다.
- Context Reconcile: W6은 open으로 대기시키고 W12를 active `[>]`로 전환했다. Subagent candidate가 돌아오면 controlling이 실제 diff/source/evidence를 검토한 뒤 W12 소비와 W6 복귀를 판정한다.

Next: W12 delegated executor가 두 architecture 문서와 W12 task record만 수정하고 candidate를 반환한다.

### 2026-08-21 14:47 · W12 architecture evidence corrective result review — Accept, W6 복귀

- W12 revision 2 Attempt 1 candidate를 controlling이 실제 source/test와 대조해 **Accept**했다. 두 architecture 문서는 TUI failure call sites, awaited helper, daemon cleanup owner와 runtime dispose/row/incident-route state-effect tests를 claim-local exact range로 복구했다.
- Verification: 관련 2 files/94 tests PASS, 변경 Markdown 및 W12/controlling log inline-code PASS, `git diff --check`, log check, package-log check PASS.
- Context Reconcile: W12를 `[x]`로 완료하고 W6을 `[>]`로 복귀했다. W6 A-D/F와 architecture E까지 code/document corrective evidence는 수용됐지만 production `aiox host`의 concrete view driver와 user-deferred Live 1/2가 남아 W6 overall Accept 및 W7 전환은 하지 않는다.

Next: W6 — concrete distinct-terminal view driver의 owner decision/implementation 범위를 확정한다. Live 1/2는 사용자 지시 전까지 보류하며 W7로 전환하지 않는다.
