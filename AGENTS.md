<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Always use the OpenAI developer documentation MCP server if you need to work with the OpenAI API, ChatGPT Apps SDK, Codex,… without me having to explicitly ask.

<!-- END:nextjs-agent-rules -->

## Docs Rules

- `docs/`에는 새 `aiox` 구현에 직접 필요한 것만 둔다.
- `docs/aiox/`는 예외적으로 사용자가 이해해야 하는 개념, agent 설명,
  시각화, 학습 기록을 둔다. 구현 결정 자체의 권위 문서가 아니라
  사용자가 나중에 다시 볼 수 있는 learning record다.
- 기존 bridge/claude-adapter 문서와 구현은 `legacy/bridge-relay-v1/`에 보존한다.
- `history/`는 사건 순서와 판단 과정을 기록한다.
- `plan/`은 다음 변경을 위한 실행 문서만 둔다.
- `.claude/plans/`는 Claude가 한 cleanup/feature를 진행하기 위한 단기 실행
  scratch다. 권위 문서가 아니며, 작업이 끝나면 필요한 결정/검증/결과만
  `history/`와 `plan/`으로 흡수한다.

## Authority Priority

문서/메모리/세션 컨텍스트가 어긋나면 아래 순서가 우선한다.

Priority: `prd/history > plan > docs/aiox > memory/session > agent-specific scratch`.

1. `prd/` + `history/`: 제품/spec, 결정, 판단 과정의 권위.
2. `plan/`: 현재 execution checklist와 Step 진행 상태.
3. `docs/aiox/`: 사용자 학습/설명 기록. 권위 결정을 대체하지 않는다.
4. agent memory + 현재 session context: 빠른 참조용 요약.
5. agent-specific scratch (`.claude/plans/`, 임시 조사 노트 등): 작업 중
   보조 자료이며 장기 권위가 아니다.

## Current Doc Layout

1. 루트는 새 `aiox` 프로젝트를 위한 작업 공간이다.
2. `legacy/bridge-relay-v1/`는 이전 구현을 참고하기 위한 local-only 보존 영역이다. git에는 올리지 않는다.
3. `history/13-aiox-rewrite-decision.history.md`를 rewrite 기준 결정 문서로 둔다.
4. `history/15-mvp-design-decisions.history.md` + `prd/mvp/aiox-mvp-spec.md`를 MVP 설계 권위 문서로 둔다.
5. `plan/mvp-implementation-checklist.md`를 MVP 진행 추적 execution checklist로 둔다. 권위는 `history/`+`prd/`, plan/은 실행 레이어.
6. `prd/post-mvp/aiox-a2a-spec.md`를 Post-MVP A2A communication standard와
   local-first reference runtime의 production spec으로 둔다.
7. `history/58-post-mvp-a2a-architecture-decisions.history.md`를 Post-MVP A2A
   product framing과 architecture 결정 경위로 둔다.
8. `plan/post-mvp.plan.md`는 Post-MVP 구현 후보와 향후 sequencing을 위한 실행 문서다.
   현재 항목은 unordered candidates이며, production spec이 아니다.
9. `docs/aiox/`는 사용자가 이해해야 하는 개념 설명과 learning record를 둔다.
   예: `docs/aiox/pair-attach-kind-mismatch.md`.
10. 새 일반 `docs/`는 구현에 직접 필요한 시점에만 다시 만든다.

## Memory와 권위 문서 패턴

여러 agent의 메모리/세션 컨텍스트는 빠른 참조용 요약만 둔다. 결정/spec/검증 결과의 권위 source는 항상 `history/`, `prd/`, `docs/`에 박는다.

Agent별 메모리 위치:

- Claude: `~/.claude/projects/<project>/memory/`
- Codex: `~/.codex/memories/`의 파일 기반 메모리 + 현재 세션 컨텍스트. Codex는 프로젝트 진입/재개 시 `AGENTS.md` 같은 root 지침을 기준 컨텍스트로 다시 읽는다.
- Gemini: `~/.gemini/tmp/<project>/memory/MEMORY.md` (Private Project Memory 파일, 툴을 통해 세션 간 지속 갱신)

공통 원칙:

- **권위 문서가 먼저, 메모리는 그 다음.** 합의/결정/검증이 끝나면 먼저 `history/` 또는 `prd/` 또는 `docs/`에 박고, 그 다음 메모리에 짧은 요약 + 권위 문서 path를 둔다.
- **메모리는 cross-reference 역할.** 디테일/정당화/이력은 권위 문서에서 찾는다. 메모리는 "어디로 가야 하는지"를 알려준다.
- **결정이 바뀌면 권위 문서 먼저 갱신 → 메모리/세션 컨텍스트 동기화.** 역순으로 하면 메모리가 권위와 어긋난다.
- **권위와 메모리가 어긋나면 권위 문서가 정답이다.** 메모리는 항상 갱신 가능한 색인일 뿐이다.
- **메모리에 한 화면 이상 detail이 박혀 있으면 권위 문서로 옮겨야 한다는 신호.** 메모리는 길어지면 무력화된다.
- **권위 문서 작성 워크플로우**: 합의 완료 → agent가 권위 문서 초안 작성 → 리뷰/보완 → 메모리에 요약 + reference 갱신 → 다음 세션에서 메모리를 entry point로 사용.
- **세션 진입 시 본인 메모리 확인.** 각 agent는 새 세션/프로젝트 진입 시 자신의 메모리 위치를 읽고 권위 문서 reference를 따라가 현재 상태를 파악한다. 시스템이 자동 로드하지 않으면 명시적으로 read한다.

## Checklist / Todo 위치 원칙

execution checklist와 todo는 **repo `plan/` 아래에만** 둔다. vault에는 todo 표기/체크박스를 만들지 않는다.

- **권위는 repo `plan/<project>-implementation-checklist.md`.** Completed/Next 형식으로 commit과 1:1 매핑되는 execution 추적이 여기 산다.
- **vault `work/active/<project>.md`에는 todo 항목을 두지 않는다.** 대신 "Implementation Status" 같은 status 요약과 repo checklist로 가는 link만 둔다.
- **이유:** todo가 양쪽에 있으면 drift가 반복된다. checklist는 코드 작업과 같은 공간(repo)에 두는 게 commit과 동기화하기 쉽고 source of truth가 명확해진다.
- **권위는 여전히 `history/`+`prd/`.** checklist는 그 위의 실행 레이어일 뿐이며, 권위 문서가 바뀌면 checklist도 갱신한다.
- **vault drift check:** 권위 문서나 checklist가 크게 바뀌면 vault의 status 요약이 stale해지지 않는지 확인한다.

## Step 진행 규칙

- `plan/mvp-implementation-checklist.md`의 Step은 순차적으로 진행한다.
- 다음 Step을 시작하기 전에 현재 Step의 모든 체크박스가 완료됐는지 확인한다.
- 현재 Step에 미완료 항목이 있으면 다음 Step을 `진행 중`으로 바꾸거나 구현을 시작하지 않는다.
- 다음 Step의 세부 sub-task를 미리 분해할 수는 있지만, 상태는 `Planned`로 유지한다.
- 각 Step은 해당 Step의 모든 체크박스 완료 후 `pnpm test`와 `pnpm typecheck`를 통과해야 완료로 본다.
- Step 완료 직후 checklist의 Step 상태, 체크박스, verification baseline을 갱신하고 그 변경까지 포함해 커밋한다.

## Critical Issue Workflow

Step 진행 중 repository invariant, product contract, data loss, atomicity, adapter
boundary 같은 critical 이슈를 발견하면 현재 구현으로 바로 섞지 말고 다음 순서로
처리한다.

1. **발견 기록**: 해당 Step의 `history/` 문서에 보류 항목을 추가한다. 왜 critical인지,
   재현/위험 시나리오, 해결 후보, 지금 해결할지 보류할지의 판단을 함께 적는다.
2. **해결 기록**: follow-up commit으로 해결한 뒤 같은 `history/` 보류 항목 아래에
   해결 기록을 추가한다. commit, 결정, 변경 파일, verification 결과를 남긴다.
3. **Checklist 동기화**: 실행 상태나 baseline이 바뀌면
   `plan/mvp-implementation-checklist.md`도 같은 commit에 갱신한다.
4. **Learning record**: 사용자가 이해하기 어려워한 개념이면 `docs/aiox/<topic>.md`에
   시각화와 설명을 추가한다. 이 문서는 학습 기록이며, 결정 권위는 `history/`와
   `prd/`에 둔다.

예시는 `history/16-step-2-sqlite-repository-cleanup.history.md`의 4-1 보류 →
해결 기록과 `docs/aiox/pair-attach-kind-mismatch.md`를 따른다.

## Decision Options Workflow

agent가 architecture/product/workflow 결정, critical issue 대응, 되돌리기 어려운
변경, 다음 Step 진입 여부를 사용자에게 물을 때는 MUST 규칙으로 아래 4가지를
함께 제시한다.

1. 각 옵션의 trade-off.
2. agent의 추천 옵션과 근거.
3. reversibility: 나중에 바꿀 수 있는지, 바꾸면 비용이 무엇인지.
4. deferrability: 지금 결정하지 않고 보류할 수 있는지.

목표는 사용자가 전체 코드/리소스를 다 몰라도 "추천대로 가", "다른 옵션", "보류",
"더 알아보고 와" 중 하나로 결정할 수 있게 만드는 것이다.

단순 구현 세부사항, 명백한 bug fix, 이미 checklist에 정의된 작업에는 이 형식을
기계적으로 적용하지 않는다. 이 규칙은 무거운 결정의 품질을 높이기 위한 것이지,
모든 작은 선택을 문서화하기 위한 것이 아니다.

## Delegated Investigation Workflow

사용자가 "잘 모르겠다", "더 알아봐 와", "다른 agent로 검증해줘",
"Codex/Gemini/Claude에게 물어봐", "옵션 trade-off를 더 봐줘"처럼 말하면
현재 세션에서 깊게 파기보다 분리 조사 또는 subagent 위임 후보로 본다.

- subagent 위임은 사용자 신호 또는 명시 승인 기반으로만 진행한다.
- 현재 agent가 직접 깊게 파면 결정 컨텍스트가 오염될 위험이 크다고 판단하면,
  먼저 위임/분리 조사를 제안하고 승인 후 진행한다.
- 위임 결과는 결론, 근거, 권위 문서 반영 후보만 현재 맥락으로 가져온다.
  긴 탐색 로그나 미확정 추론을 권위 문서처럼 섞지 않는다.
- 최종 결정은 항상 `prd/`, `history/`, `plan/`, 필요 시 `docs/aiox/`에
  반영한 뒤 memory/session context를 동기화한다.

## Vault 활용 패턴

`/Users/lunaxislu/my-vault`는 cross-project 장기 기억, 작업 색인, 회고용 vault다. 이 repo의 권위 문서를 대체하지 않는다.

- **repo가 권위, vault는 색인.** `aiox`의 결정/spec/검증 원문은 이 repo의 `history/`, `prd/`, `docs/`에 둔다. vault에는 요약, wikilink, 상태, open issue, related context를 둔다.
- **권위 문서 먼저, vault는 그 다음.** 중요한 결정 변경은 repo 문서 갱신 → agent 메모리 갱신 → vault 요약/색인 갱신 순서로 한다.
- **vault 문서는 Obsidian 규칙을 따른다.** `/Users/lunaxislu/my-vault/AGENTS.md`와 `CLAUDE.md`의 frontmatter, wikilink, index 규칙을 지킨다.
- **vault의 aiox entry point.** 현재 project summary는 `/Users/lunaxislu/my-vault/work/active/aiox.md`, MVP 결정 요약은 `/Users/lunaxislu/my-vault/work/active/aiox-mvp-design.md`, architecture 요약은 `/Users/lunaxislu/my-vault/reference/aiox-architecture.md`를 본다.
- **불일치 시 repo가 정답.** vault와 repo 문서가 어긋나면 repo의 `history/15-mvp-design-decisions.history.md`와 `prd/mvp/aiox-mvp-spec.md`를 기준으로 vault를 고친다.
- **Open Product Issues는 양쪽에 남긴다.** repo PRD/history에 권위 항목을 두고, vault `work/Index.md`와 `work/active/aiox.md`에는 "정책 미확정" 상태로 추적한다.
- **vault는 mirror가 아니라 graph다.** repo 문서를 vault에 복사/동기화하지 않는다. vault는 work note, decision note, reference note, brain note로 topic을 나누고 연결한다.
- **사용자 관점도 topic이다.** 반복되는 우려, 제안, 선호, 판단 기준은 vault topic 후보로 본다. 결정/spec은 repo 권위 문서에 남기고, 결정에 영향을 준 design pressure와 사용자 관점은 vault의 work/decision/brain note에 연결한다.
- **자동화는 drift/context check가 기본값이다.** repo 권위 문서가 바뀌면 stale vault claim과 갱신 후보 note를 제안한다. 자동 rewrite/sync는 사용자가 명시적으로 요청한 경우에만 한다.
- **세션 마무리는 제안 우선이다.** 세션 종료 시 vault에 남길 decision, open issue, user concern, pattern, gotcha 후보를 분류해서 제안한다. vault 자동 기록은 사용자가 명시적으로 승인한 경우에만 한다.

## Vault Tooling Reference

Vault 작업이 필요하면 `/Users/lunaxislu/my-vault`를 별도 작업 공간으로 보고, 이 repo의 규칙을 그대로 복사하지 않는다.

- **먼저 읽을 문서**: `/Users/lunaxislu/my-vault/AGENTS.md`, `/Users/lunaxislu/my-vault/CLAUDE.md`, `/Users/lunaxislu/my-vault/brain/Patterns.md`, `/Users/lunaxislu/my-vault/brain/Gotchas.md`.
- **skills/commands/hooks의 source는 vault다.** `/Users/lunaxislu/my-vault/.claude/`, `.codex/`, `.gemini/`의 도구는 vault가 소유한다. 이 repo로 복사하지 않는다.
- **이 repo에는 참조만 둔다.** vault 작업 원칙, entry point path, drift/context check 규칙만 둔다.
- **repo automation은 check-only가 기본이다.** 이 repo에서 vault 관련 script를 만든다면 stale claim과 갱신 후보를 출력하는 수준으로 시작한다. vault note 수정은 vault 규칙을 읽고 사용자 승인 후 수행한다.

## 구현 원칙

반드시 원칙을 지킬것
.ai/tdd.md를 확인하고 실행할것
