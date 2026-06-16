# Local Obsidian Vault and Project Atlas Discussion

## Status

- Date: 2026-06-07
- Type: user problem framing -> tool research -> direction agreement
- Scope: local Obsidian vault and Atlas only; implementation and workflow design are separate follow-up work
- Related:
  - `history/40-step-14-daemon-client-split.history.md`
  - [Claude Code + Obsidian = AI Second Brain](https://agenticpm.substack.com/p/claude-code-obsidian-ai-second-brain)
  - [code-review-graph](https://github.com/tirth8205/code-review-graph)
  - [Obsidian Graph view](https://help.obsidian.md/plugins/graph)
  - [Obsidian Canvas](https://help.obsidian.md/plugins/canvas)

## One Line

> aiox repo를 로컬 Obsidian vault로 열고, 커밋하지 않는 `atlas/`를 사람과 agent가 함께 읽는 프로젝트 지도로 사용한다. Atlas는 의미와 관계를 설명하고, 상수와 테스트는 실제 계약을 강제하며, 자동 코드 그래프 도구는 별도 spike 후 채택 여부를 정한다.

## User Problem

사용자가 Atlas를 도입하려는 이유는 일반적인 노트 관리가 아니다.

1. SQLite, CLI, command, MCP server, socket 등 처음 접하는 개념이 많아 agent의 구현 속도를 따라가며 전체 시스템을 이해하기 어렵다.
2. 오류가 발생했을 때 데이터 흐름, 의존 관계, 결합 지점과 변경 영향 범위를 빠르게 파악하고 싶다.
3. agent도 여러 위치에 흩어진 계약과 소비자를 놓칠 수 있으므로, 변경 전에 관련 모듈·계약·테스트를 함께 확인할 수 있어야 한다.
4. 전체 문서를 반복해서 읽는 비용을 줄이고, 사용자와 agent가 같은 구조 지도를 통해 필요한 문맥만 선택하고 싶다.

사용자가 제시한 시각적 기대는 Obsidian Graph View와 같은 형태다. 노드와 연결선을 통해 전체 구조를 보고, 노드를 클릭하면 해당 영역의 상세 설명, 코드 위치, 계약, 의존·결합 관계와 테스트를 확인하는 방식이다.

## Verified Regression Example

사용자는 Claude MCP server 이름 변경 후 다른 소비 위치가 함께 갱신되지 않아 channel startup이 실패했던 사례를 Atlas 필요성의 예로 들었다. Git 이력 조사 결과 정확한 사실은 다음과 같다.

### Introduction of the mismatch

- Commit: `c525a1f5c2bbf6b015675b98bdb04a9ec1c752bb`
- Date: 2026-05-23
- Subject: `fix: launch claude channel from attach`
- `src/cli/invocation.ts`가 동적 이름 `aiox-claude-${command.name}`을 생성했다.
- `src/adapters/claude/launcher.ts`는 이를 `server:${channelName}`으로 Claude에 전달했다.
- 테스트는 `aiox-claude-reviewer`를 기대하도록 갱신됐다.
- 그러나 `.mcp.json`에는 여전히 `aiox-channel-poc`만 등록되어 있었다.

Claude는 `server:<name>`을 `mcpServers`의 정확한 key로 조회하므로, launcher가 요청한 이름과 실제 등록된 MCP server key가 일치하지 않았다. 사용자가 기억한 `aiox-ingress-*`라는 정확한 문자열은 이력에서 발견되지 않았으며, 문제의 실제 명칭은 동적 `aiox-claude-${command.name}`과 기존 `aiox-channel-poc`의 불일치였다.

### Fix and verification

- Commit: `de0c6b612024c11d16d15d677816200b916c3b24`
- Date: 2026-05-24
- Subject: `behavior: fix step 14 claude channel smoke blockers`
- `.mcp.json`, launcher 호출부와 테스트를 정적 key `aiox-claude-ingress`로 통일했다.
- agent별 identity는 MCP server key에 넣지 않고 환경 변수로 전달하는 경계로 수정했다.

후속 commit `541af12c6917d46a014e73fcd5e9491fc422e5e8` (`docs: record claude reply follow-up`, 2026-05-25)은 clean restart에서 `server:aiox-claude-ingress` launch와 Codex-to-Claude delivery 성공을 기록했다. 상세 원인은 `history/40-step-14-daemon-client-split.history.md`에 남아 있다.

이 사례에서 Atlas가 제공해야 할 가치는 단순 문자열 검색이 아니다. MCP server identity contract 노드에서 producer, consumer, configuration, related tests를 함께 찾게 하는 것이다. 실제 재발 방지는 공용 상수와 계약 테스트가 담당해야 한다.

## Research: Local AI Workspace

사용자가 제공한 [Claude Code + Obsidian = AI Second Brain](https://agenticpm.substack.com/p/claude-code-obsidian-ai-second-brain) 글은 다음 방식을 제안한다.

- agent가 접근하는 하나의 로컬 workspace 안에 repository와 Obsidian notes를 둔다.
- Obsidian vault는 특별한 database가 아니라 로컬 Markdown 폴더다.
- 사용자와 agent가 같은 파일을 읽고 수정하며, 코드와 product note를 교차 참조한다.
- `AGENTS.md`가 workspace 접근 규칙을 제공한다.

Codex는 이 글의 로컬 Markdown 공동 문맥이라는 원칙은 aiox에 유용하지만, strategy·meeting note·sprint brief를 계속 축적하는 second-brain 구조를 그대로 적용하면 현재의 문서 과잉이 반복될 수 있다고 제안했다. 또한 aiox는 단일 project이므로 별도 상위 `ai-workspace/repos/notes` 구조보다 repo 자체를 vault로 여는 편이 단순하다고 제안했다.

사용자는 repo 전반의 구현과 데이터 흐름을 사용자와 agent가 파악하기 위한 로컬 도구가 목적이며, Vault와 Atlas를 커밋 대상으로 생각하지 않는다고 답했다.

## Research: Obsidian Surfaces

논의에서 Obsidian 기능의 역할을 다음처럼 구분했다.

- **Graph View:** 프로젝트 전체의 노드와 연결 관계를 탐색한다.
- **Local Graph:** 선택한 노드 주변 관계에 집중한다.
- **Canvas:** 핵심 데이터 흐름을 방향과 관계 유형이 드러나게 배치한다.
- **Atlas note:** 노드를 클릭했을 때 모듈의 역할, 코드 위치, 입력·출력, 계약, 의존 관계, 관련 테스트와 결정/spec link를 제공한다.

Obsidian은 Markdown link가 존재한다는 사실은 시각화하지만, 관계가 `depends on`, `produces`, `consumes`, `implements`, `verified by` 중 무엇인지는 자동으로 이해하지 않는다. Atlas note가 관계 유형을 명시해야 한다.

## Research: Automatic Code Graph

사용자가 제공한 [code-review-graph](https://github.com/tirth8205/code-review-graph)는 다음 기능을 설명한다.

- Tree-sitter로 codebase를 parsing한다.
- function, class, import, call, inheritance와 test 관계를 graph로 저장한다.
- SQLite graph와 MCP를 통해 agent에게 필요한 code context를 선택적으로 제공한다.
- 변경 파일의 caller, dependent와 관련 test를 따라 blast radius를 계산한다.
- incremental update와 Obsidian 형식 visualization을 지원한다.

Codex는 이 도구가 자동 코드 관계와 변경 영향 분석이라는 사용자 목적에 가깝다고 평가했다. 다만 `install` 명령이 MCP configuration, hook, skill과 agent rule을 자동 수정하므로 현재 aiox tooling과 충돌할 수 있다. TypeScript 분석 정확도, 위 회귀 사례 탐지 여부, Obsidian export 품질과 실제 token 절감 효과를 격리된 read-only spike로 확인하기 전에는 채택하지 않는다.

## Agreed Direction

1. **Vault boundary.** `ai-orchestration/` repo 자체를 Obsidian에서 vault로 연다. repo 내용을 Obsidian 전용 형식으로 바꾼다는 뜻이 아니라, Obsidian이 repo 폴더의 Markdown과 local Atlas를 읽게 한다는 뜻이다.
2. **Local-only data.** `.obsidian/`과 `atlas/`는 로컬 전용이며 Git commit 대상이 아니다.
3. **Atlas purpose.** Atlas는 일반 agent memory나 todo 저장소가 아니라 사용자와 agent가 함께 사용하는 프로젝트 구현 지도다.
4. **Atlas content.** Atlas는 모듈, 계약, 데이터 흐름, 변경 영향, 코드 위치, 관련 테스트와 관련 decision/spec link를 연결한다.
5. **Visualization roles.** Graph View는 전체 탐색, Canvas는 핵심 흐름과 관계 유형, Atlas note는 클릭 후 상세 설명을 담당한다.
6. **Enforcement boundary.** Atlas는 발견과 이해를 돕는다. 실제 변경 누락 방지는 공용 상수, 구조화된 API와 계약 테스트가 담당한다.
7. **Automatic graph boundary.** `code-review-graph`는 유력 후보지만 아직 채택하지 않는다. 자동 코드 관계 계층은 별도 spike 결과로 결정한다.
8. **Implementation timing.** 실제 Vault·Atlas 생성과 운영 자동화는 관련 hook·skill을 설계·구현하는 단계에서 함께 진행한다. 현재 기록은 방향과 근거를 보존한다.

## Atlas Design Inputs for Follow-up

다음 항목은 Vault 방향의 미결정 문제가 아니라, 후속 Atlas 세부 설계에서 구체화할 입력이다.

- Atlas note를 모듈, 계약, 흐름, map으로 어떻게 나눌지
- 각 note가 묶을 코드 범위와 적절한 granularity
- 관계 유형 표기 형식
- Graph View filter와 색상 기준
- Canvas로 고정할 핵심 data flow
- source 변경과 Atlas 갱신을 연결하는 hook·skill 책임
- `code-review-graph` spike와 수동 Atlas의 결합 방식

예상 local-only skeleton은 설계 입력일 뿐 아직 생성 결정이 아니다.

```text
.obsidian/
atlas/
  modules/
  contracts/
  flows/
  maps/
```

## Verification

- Vault나 Atlas 파일은 생성하지 않았다.
- `.gitignore`, hook, skill과 agent settings를 변경하지 않았다.
- `code-review-graph`를 설치하거나 실행하지 않았다.
- MCP naming incident는 read-only Git history 조사로 commit과 변경 파일을 확인했다.
