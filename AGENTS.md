<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Always use the OpenAI developer documentation MCP server if you need to work with the OpenAI API, ChatGPT Apps SDK, Codex,… without me having to explicitly ask.

<!-- END:nextjs-agent-rules -->

## Repository Map

이 repo는 새 `aiox` 프로젝트의 작업 공간이다. 각 영역의 역할:

- `prd/` — 제품/spec 권위. 무엇을 만드는지의 약속. 거의 안 바뀌고, 바뀌면 경위를 `history/`에 남긴다.
- `history/` — 사건 순서와 결정 경위. 왜 그렇게 정했는지의 권위(append-only).
- `plan/` — 다음 변경을 위한 실행 문서(execution checklist, sequencing). 권위가 아니라 그 위의 실행 레이어이며, 권위가 바뀌면 그다음 갱신한다.
- `docs/aiox/` — 사용자가 이해해야 하는 개념·시각화·learning record. 구현 결정의 권위가 아니다(`docs/` 일반 규칙 "구현에 직접 필요한 것만"의 예외). 예: `docs/aiox/pair-attach-kind-mismatch.md`.
- `spikes/` · `spike/` — 구현 전 검증용 POC/실험 코드. 권위 결정은 여기서 내리지 않는다.
- `legacy/bridge-relay-v1/` — 현재 aiox 이전의 초기 모델을 보존한 local-only 참고 영역. git에 올리지 않는다.
- `src/` · `tests/` — 현 `aiox` 구현 코드와 테스트.

현재 stage·다음 deliverable·열려 있는 권위 문서 경로는 `plan/post-mvp.plan.md`의 **Current Work Status**가 가리킨다. 개별 history/prd 문서를 여기 나열하지 않는다.

## Authority Priority

문서/메모리/세션이 어긋나면 아래 순서가 우선한다. AGENTS.md는 이 순위의 항목이 아니라 그 위에서 동작하는 operating contract다.

`prd/ + history/ > plan/ > docs/aiox/ (+ 향후 atlas/) > memory/session`

1. `prd/` + `history/`: 제품/spec·결정·판단 과정의 권위.
2. `plan/`: 현재 실행 상태(`Current Work Status` 포함).
3. `docs/aiox/`(+ WS4에서 생기면 `atlas/`): 학습·설명·탐색용 **비권위 참고**. 권위 결정을 대체하지 않는다.
4. agent memory + 현재 session: 빠른 참조 요약.

## Memory

공유 상태와 결정은 **repo가 소유**한다. agent memory는 개인 진입 색인과 agent-specific gotcha만 보관하며 repo 권위를 대체하지 않는다. 권위가 바뀌면 repo 문서를 먼저 갱신하고 메모리를 그다음 동기화한다.

각 agent는 세션 진입 시 자신의 메모리를 읽고 거기 적힌 권위 경로를 따라 현재 상태를 파악한다. 공유 진입점은 `plan/post-mvp.plan.md`의 **Current Work Status**다.

- Claude: `~/.claude/projects/<project>/memory/`
- Codex: `~/.codex/memories/` (+ 진입/재개 시 `AGENTS.md` 재독)
- Gemini: `~/.gemini/tmp/<project>/memory/MEMORY.md`

## Work Entry and Execution

새 세션은 `plan/post-mvp.plan.md`의 **Current Work Status**에서 현재 stage·다음 작업·권위 경로를 잡고 시작한다. 아래는 stage 절차와 무관하게 항상 지키는 불변식이다.

- **Todo/checklist는 repo `plan/` 아래에만 둔다.** vault·메모리에 별도 todo나 체크박스를 만들지 않는다.
- **완료는 `pnpm test` + `pnpm typecheck` 통과 후 선언한다.**
- **구현은 `.ai/tdd.md`를 따른다.**
- **다른 agent 위임/subagent는 사용자 신호 또는 명시 승인 기반으로만 한다.**

상세 절차(Step 진행 · Critical Issue · Checklist/Todo · Delegated Investigation)는 아래에 남아 있으며, WS2 `/aiox-stage` skill이 생기면 그 skill로 이동하고 본문은 제거된다. 그때 이 불변식만 root contract로 남는다.

## Change Safety

- dirty worktree에서 사용자나 다른 agent의 기존 변경을 임의로 되돌리거나 덮어쓰지 않는다. 충돌하면 변경을 보존한 채 함께 작업하고, 무엇을 왜 바꾸는지 먼저 알린다.
- destructive git/filesystem action(`reset --hard`, force push, 대량 삭제·이동 등)은 사용자의 명시적 승인 없이 하지 않는다.

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

## Checklist / Todo 위치 원칙

> **Transitional:** MVP `plan/mvp-implementation-checklist.md` 기준으로 작성된 절차다. 현재 stage 추적은 `plan/post-mvp.plan.md`의 Current Work Status를 따르며, 본문은 Phase 2에서 `/aiox-stage` skill로 이동한다. root 불변식("todo/checklist는 `plan/`만 소유")은 위 `Work Entry and Execution`에 남아 있다.

execution checklist와 todo는 **repo `plan/` 아래에만** 둔다. vault에는 todo 표기/체크박스를 만들지 않는다.

- **권위는 repo `plan/<project>-implementation-checklist.md`.** Completed/Next 형식으로 commit과 1:1 매핑되는 execution 추적이 여기 산다.
- **vault `work/active/<project>.md`에는 todo 항목을 두지 않는다.** 대신 "Implementation Status" 같은 status 요약과 repo checklist로 가는 link만 둔다.
- **이유:** todo가 양쪽에 있으면 drift가 반복된다. checklist는 코드 작업과 같은 공간(repo)에 두는 게 commit과 동기화하기 쉽고 source of truth가 명확해진다.
- **권위는 여전히 `history/`+`prd/`.** checklist는 그 위의 실행 레이어일 뿐이며, 권위 문서가 바뀌면 checklist도 갱신한다.
- **vault drift check:** 권위 문서나 checklist가 크게 바뀌면 vault의 status 요약이 stale해지지 않는지 확인한다.

## Step 진행 규칙

> **Transitional:** MVP `plan/mvp-implementation-checklist.md` 기준 절차다. 현재 stage 진행은 Current Work Status를 따르며, 본문은 Phase 2에서 `/aiox-stage` skill로 이동한다. root 불변식("완료=test+typecheck 통과 후 선언")은 위 `Work Entry and Execution`에 남아 있다.

- `plan/mvp-implementation-checklist.md`의 Step은 순차적으로 진행한다.
- 다음 Step을 시작하기 전에 현재 Step의 모든 체크박스가 완료됐는지 확인한다.
- 현재 Step에 미완료 항목이 있으면 다음 Step을 `진행 중`으로 바꾸거나 구현을 시작하지 않는다.
- 다음 Step의 세부 sub-task를 미리 분해할 수는 있지만, 상태는 `Planned`로 유지한다.
- 각 Step은 해당 Step의 모든 체크박스 완료 후 `pnpm test`와 `pnpm typecheck`를 통과해야 완료로 본다.
- Step 완료 직후 checklist의 Step 상태, 체크박스, verification baseline을 갱신하고 그 변경까지 포함해 커밋한다.

## Critical Issue Workflow

> **Transitional:** 본문은 Phase 2에서 `/aiox-stage` skill로 이동한다. root 불변식(critical 이슈는 일반 구현에 섞지 말고 authority `history/`에 먼저 기록)은 그때 root contract로 남긴다. 현재 stage 추적은 Current Work Status를 따른다.

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

## Delegated Investigation Workflow

> **Transitional:** 본문은 Phase 2에서 `/aiox-stage` skill로 이동한다. root 불변식("위임/subagent는 사용자 승인 기반")은 위 `Work Entry and Execution`에 남아 있다.

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

## Atlas / Vault (transitional)

> repo-as-vault + `atlas/` 탐색 그래프는 WS4에서 정한다. 그 전까지 외부 vault 기반 색인 규칙은 보류한다. 단, aiox 전용 skill/command/hook의 source는 repo다 — `.claude/`는 존재하고, `.codex/`·필요 시 `.gemini/`는 WS2에서 도구를 만들 때 생성한다(현재 미생성, ownership 선언). 이건 보류가 아니라 확정된 ownership 규칙이며, 범용·cross-project 도구만 vault/plugin이 소유할 수 있다. 이 섹션은 WS4에서 `## Atlas`로 교체된다.
