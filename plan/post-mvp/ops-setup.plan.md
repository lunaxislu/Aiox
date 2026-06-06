---
type: sub-plan
stage: post-mvp-ops-setup
scope: ops/tooling (spec § 아님)
---

# Ops-Setup (async-petting-hoare) — 운영 환경 셋업

Post-MVP 본 구현(`envelope-metadata` 등)을 **여러 세션(Claude+Codex)에 걸쳐 운영**하기 위한 토대.
메모리·툴링·workflow·Obsidian 4갈래(WS1~4). 이 파일이 **사용자·Claude·Codex 셋이 공유하는 진행 기록 + handoff**다.

> **Freshness contract:** updated `2026-06-07` / baseline commit `3cab3c1` / stage = **WS1 완료 · AGENTS.md 정리 Phase 1(item1~9) 적용 완료(Codex 교차검증 in-flight·사용자 확인 대기) · Phase 2/WS2 구현 대기** /
> worktree **DIRTY** (AGENTS.md, docs/aiox/README.md, prd/README.md, plan/post-mvp.plan.md, plan/qa-tracker.md, plan/post-mvp/ops-setup.plan.md; + prd/post-mvp/aiox-a2a-spec.md = 이전 세션 잔여).
> WS1~4 원본 상세는 `~/.claude/plans/async-petting-hoare.md`(Claude scratch, Codex 접근 불가) → **이 repo 파일이 shared 진행 권위.**

## Scope — WS1~4 + 순서

착수 순서: **WS1+WS2(토대) → WS3(workflow) → WS4(Obsidian).**

- **WS1 메모리 정리** — 두 store(Claude/Codex) thin index화. 공유=repo, 사설=thin pointer.
- **WS2 툴링 감사** — settings 위생 + 갭 메우기. 도구는 repo `.claude/`+`.codex/`(repo-local).
- **WS3 다세션 stage workflow** — stage 생애주기 + N-세션 handoff 명시화 (aiox 채널 Codex 교차검증 후 사용자 확정).
- **WS4 Obsidian repo-as-vault + code-atlas** — `.obsidian/` + `atlas/` 탐색 그래프.

## Locked decisions

### 메모리 정책 (WS1 — AGENTS.md Memory 섹션에 명시됨)
- 공유되는 사실은 **repo가 소유**, agent memory는 **thin 개인 색인**만. 공유 단위 = Current Work Status + authority links + 유효 handoff.
- 정리 = 5-질문 필터 + 위치 매핑 (WS1 적용 완료; 향후 재감사 방법/도구는 drift 발생 시 결정).

### 툴링 (WS2 — 결정 lock, 구현 pending)
- **도구 위치 = repo-local** (`.claude/`+`.codex/`). AGENTS.md tooling-source 개정 완료. 범용 도구만 plugin/vault.
- **Hook A = SessionStart read-only onramp.** 출력 = 현 stage / next / authority links / dirty 경고 / 유효 handoff만. matcher `startup|resume|clear`=full, `compact`=축약. 선행 = plan의 machine-readable Current Work Status(완료).
- **typecheck = 별도 hook 없음** → `/aiox-stage` exit gate가 `pnpm test && pnpm typecheck` 강제.
- **Skill = `/aiox-stage` 1개.** handoff는 그 exit action/template. atlas는 WS3 contract 후 check-only Node script(+옵션 wrapper).
- **Subagent 0** (독립·반복·verbose 검증 3회+ 반복 시 read-only auditor 도입 trigger만 메모).
- **MCP 신규 0** + `settings.local.json` effective MCP/permission stale cleanup·least-privilege를 WS2 acceptance에.
- 안전: hook Node/exec · input validation · timeout · no-write · fixture self-test + `claude --debug` dry-run. handoff freshness contract(commit SHA+created_at+stage+dirty). TDD gate 분리 명시(targeted/full/typecheck/build).

### code-atlas (WS4 전제 — 사용자 합의)
- atlas = **지도**(repo-as-vault 위 탐색 그래프). 권위 문서는 경로 참조 유지, `[[wikilink]]` 그래프는 **atlas 레이어에만**.
- 노드 = **모듈 묶음 단위**(파일 단위 X). 렌더러 = **기본 Graph View**. granularity 수치는 WS4에서 코드 보며 확정.

## Progress log

### WS1 — 메모리 정리 ✅ 완료 (2026-06-06)
- **Claude:** AGENTS.md 메모리 정책 명시 + tooling repo-local 개정 + Vault WS4 전환 노트; `plan/post-mvp.plan.md`에 **Current Work Status 신설**; qa 6단계 workflow → `plan/qa-tracker.md` 이관(dead 링크 정리); Claude 메모리 prune **22→4**(+MEMORY.md). 살린 4 = `collaboration-workflow`/`mvp-validation-distinction`/`deferred-decisions`/`release-packaging`.
- **Codex:** 자기 메모리 prune **9→1**(`aiox-entry-index.md`), `memories_1.sqlite` untouched(색인 아님 직접 확인). 삭제 claim들을 `history/13·20~21·31~40` + MVP checklist에 대조.
- 검증: 두 store 축소·de-dup, MEMORY.md 동기화, 1화면 초과 메모리 0.

### WS2 — 툴링 감사 ⏳ 결정 lock, 구현 pending
- recommender 출력 ↔ plan 갭 대조 완료(새 갭 = typecheck hook 하나뿐, 나머지는 plan이 이미 정확). Codex 교차검증 반영.
- 미착수: `settings.json`(공유) 분리 / `/aiox-stage` skill / SessionStart onramp hook / settings.local.json cleanup.

### WS3 — stage workflow ⬜ 미착수
- aiox 채널 Codex 교차검증 후 사용자 확정. **이 파일이 그 handoff 규약의 첫 사례.**
- **가용성 전환 운영(논의안, 미확정):** Claude/Codex 사용 가능 상태에 따라
  `dual` / `claude-only` / `codex-only` mode를 구분하고, 현재 작업의
  driver/reviewer 배정·한쪽 사용 불가 시 handoff·복구 agent의 재진입 절차를
  stage workflow에 포함할지 논의한다.
  - `dual`: 한 agent가 driver, 다른 agent가 reviewer로 교차검증.
  - single-agent mode: 사용 가능한 agent가 진행하고 repo의 Current Work Status와
    유효 handoff를 갱신.
  - agent 복구: 바로 구현에 합류하지 않고 먼저 HEAD·dirty worktree·변경 diff·검증
    상태를 동기화한 뒤 reviewer로 재진입하는 안.
  - 확정 시 상세 contract는 별도 stage-workflow plan과 `/aiox-stage`에 두고,
    Current Work Status에는 현재 mode/assignment/handoff만 기록한다. 토큰 잔량 자체는
    장기 권위 상태로 기록하지 않는다.

### WS4 — repo-as-vault + code-atlas ⬜ 미착수

## Cross-WS automation scripts (논의안, 미확정)

WS1~4의 반복 작업 중 기계적으로 판정 가능한 부분을 repo-local Node ESM script로
보조할지 논의한다. 목적은 권위 문서를 대체하는 것이 아니라 Claude/Codex가 매 세션
긴 문서를 전부 읽고 같은 상태를 다시 추론하는 비용을 줄이고, 동일한 상태 parser와
검증 결과를 공유하는 것이다.

**원칙 후보:**

- script는 사실 수집·형식 생성·검증을 담당하고, skill은 workflow를 수행하며, hook은
  자동 진입 안내를 담당한다.
- Current Work Status와 handoff 생성은 **`propose → agent/user review → apply`**를
  기본값으로 한다. 초기에는 권위 문서를 자동 덮어쓰지 않는다.
- commit SHA, dirty worktree, 변경 파일, timestamp 같은 기계적 사실은 script가
  채우고, 완료 내용·다음 행동·결정 이유 같은 의미 정보는 agent가 작성한다.
- check-only가 기본이며 memory, atlas, plan을 자동 삭제/rewrite하지 않는다.
- script 출력은 권위가 아니다. 충돌 시 `prd/history > plan > script output`이다.

**구조 후보(여러 단일-purpose 파일보다 subcommand 중심):**

```text
scripts/ops/
  lib/
    git.mjs
    status-schema.mjs
    markdown-block.mjs
  work-status.mjs   # init/show/validate/propose-update/apply
  handoff.mjs       # create/show/validate/close
  stage.mjs         # enter/rejoin/verify-exit
  atlas.mjs         # affected/validate (WS4 contract 이후)
```

**WS별 후보:**

- **WS1:** memory pointer·stale 명칭·과도한 상태 복제·길이 drift를 보고하는
  check-only 기능. agent home이 없으면 fail 대신 skip. Codex
  `memories_1.sqlite`는 접근하지 않는다.
- **WS2:** Current Work Status parser/validator + SessionStart onramp renderer + Claude
  shared/local settings의 stale MCP·permission·개인 경로 검사.
- **WS3:** Current Work Status template 생성/갱신 proposal, handoff 생성·freshness 검사,
  availability mode/driver/reviewer 표시, stage exit의 `pnpm test` +
  `pnpm typecheck` 검증. 토큰 잔량은 자동 감지하지 않고 mode 전환은 명시 입력으로 둔다.
- **WS4:** source file의 atlas node 분류, 미분류 파일·broken wikilink·고아 node·변경
  영향 node·stale edge 후보를 보고하는 check-only atlas 검사. import를 곧바로 atlas
  edge로 자동 변환하지 않는다.

**기대 효율:**

- 새 세션이 `work-status show --format agent` 같은 짧은 출력으로 현재 위치와 필요한
  authority 문서만 선택하게 해 반복 독해·상태 재구성 token을 줄인다.
- Claude hook과 Codex skill이 같은 parser를 사용해 stage/handoff 해석 차이를 줄인다.
- template과 schema로 handoff 필드 누락, stale commit, dirty-state 오표기를 줄인다.

**비판적 검토 / 과잉 자동화 위험:**

- script 자체의 유지비와 schema migration 비용이 절감 token보다 커질 수 있다. 실제로
  두 번 이상 반복되거나 drift가 관찰된 작업부터 구현한다.
- 자연어 Markdown을 억지로 parser contract로 만들면 문서 편집성이 나빠진다. machine
  block은 작고 안정적으로 유지하고 설명 본문과 분리한다.
- 생성된 요약만 읽으면 중요한 PRD/history 맥락을 놓칠 수 있다. 출력은 관련 authority
  path를 제공하는 router이지 결정 요약의 대체물이 아니다.
- `apply` 자동화는 잘못된 stage/assignment를 빠르게 확산할 수 있다. schema와 fixture,
  dry-run, diff preview가 갖춰지기 전에는 expose하지 않는다.
- 4개 script를 한꺼번에 만들지 않는다. 우선순위 후보는
  `work-status show/validate` → onramp renderer → `handoff validate` →
  `stage verify-exit` → WS4 `atlas validate`이며, memory/settings checker는 실제 drift가
  반복될 때 추가한다.

## AGENTS.md 정리 (cross-WS 문서 위생) — Phase 1 적용 완료 / Phase 2 대기

AGENTS.md(Claude·Codex·Gemini 셋 공유 root 규칙)에 WS1 thin-index 원칙을 적용해 중복·stale 제거. 어느 단일 WS에도 안 속하고 WS1(메모리)·WS2(툴링)·WS4(vault)에 걸치므로 cross-WS 위생 트랙으로 분리.

**진행 방식 (사용자 지정):** 사용자가 섹션별 조언/질문 → Claude 답변 → 필요 시 aiox 채널로 Codex/Gemini 교차검증 → **셋 합의 후 실행**. 커밋 타이밍·메시지는 사용자 지시. 전부 git 추적 파일이라 편집은 가역(메모리 prune과 달리).

**진단 (2026-06-06, 5 묶음):**

| 묶음 | 대상 (줄) | 진단 | 처리 후보 |
|---|---|---|---|
| A | `Memory와 권위 문서 패턴`(44–62) ↔ `Post-MVP 메모리 정책`(64–88) | 구 공통원칙 bullet 5개(56·57·58·59·60)가 신 정책에 흡수된 중복 | 신 정책으로 통합. 살릴 것: agent 메모리 위치(48–52, 사실), 62(세션 진입 시 본인 메모리 확인) |
| B | `Vault 활용 패턴`(160–175)+`Vault Tooling Reference`(177–184) | 162가 "WS4에서 교체"라 self-marked stale인데 ~/my-vault 상세 24줄 보유 | 최소 4원칙(repo=권위/vault=색인/불일치 시 repo/자동기록은 승인 후)만. entry-point path 유지 여부 = vault 사용 여부에 의존 |
| C | Authority Priority(16–25) / 59 / 69 | "권위 > 메모리" 원칙 3중 반복 | Authority Priority 한 곳으로, 나머지 제거 |
| D | Step 진행(100–107)·Critical Issue(109–126)·Checklist/Todo(90–98) | 셋 다 종료된 `plan/mvp-implementation-checklist.md` 참조 → 현 Post-MVP stage와 mismatch | path를 `plan/post-mvp.plan.md` 규약으로 일반화 or "MVP 한정" 명시. 워크플로 본문 자체는 일반 가치 유지 |
| E | Checklist/Todo의 vault 부분(95·98) | vault 섹션과 중복 + WS4 영향 | B와 함께 처리 |

**합의 (2026-06-06, 3자: 사용자·Claude·Codex):** 사용자가 AGENTS.md 각 섹션에 `@user` inline 코멘트로 방향 제시 → Codex 교차검증.
- **큰 그림:** AGENTS.md를 **minimal operating contract**로 축소, 상세 절차는 WS2(skill/hook)·WS3(workflow)·WS4(atlas)로 흡수.
- **메모리 = 옵션 B.** 두 메모리 섹션(현 62–125)을 한 줄 contract로 압축: *"공유 상태와 결정은 repo가 소유한다. agent memory는 개인 진입 색인과 agent-specific gotcha만 보관하며 repo 권위를 대체하지 않는다."* 근거: thin-index 원칙이 Claude 시스템프롬프트 + Codex `aiox-entry-index.md`에 이미 내장. 누락된 강제는 WS2 SessionStart hook뿐. WS1의 22개 부풀이 = 강제 없으면 재발 → 한 줄 안전장치 유지.
- **cluster 1 정교화 (Codex):** "절차 전부 삭제"가 아니라 실행 *순서*만 skill/hook으로, **불변식은 1줄씩 AGENTS에 잔존**(todo=`plan/`만 소유 / 완료 gate=test·typecheck / 위임=사용자 승인 / 구현=`.ai/tdd.md`). hook은 enforcement이지 contract의 유일 저장소가 아님(깨질 수 있음).
- **stage block rename:** `Canonical status/stage block` → **`Current Work Status`** (위치 = `plan/post-mvp.plan.md` 유지 = 사용자 확정 A, 내용 동일·라벨만 통일). 현재 4개 문서가 제각각 호칭 → 한 이름으로.
- **Docs Rules + Current Doc Layout → `Repository Map` 통합.** 개별 history 13/15/58 entry list는 AGENTS 아니라 Current Work Status/plan이 가리킴.
- **Vault 2섹션 → 짧은 transition note 1줄** (WS4 atlas 후 `Atlas` 섹션으로 교체).
- **Authority Priority → 단순화.** atlas는 비권위 참고 계층 명시. AGENTS는 순위 operand가 아니라 operating contract라 PRD와 직접 경쟁 안 시킴.
- **Decision Options Workflow = 유지** (4요소 보존, 표현만 축약 가능).
- **sequencing = 옵션 3 (부분 적용).** dead reference 안 나는 것부터 지금, `/aiox-stage` 의존 절차는 WS2와 묶음.

**Codex 제안 최종 뼈대 (6 섹션):** Repository Map / Authority and Shared State / Work Entry and Execution(Current Work Status + TDD; WS2에서 `/aiox-stage` 추가) / Decision and Delegation Boundaries / Change Safety(dirty worktree 안전) / Transitional Atlas-Vault Note(→WS4 `Atlas`).

**편집 순서 (Codex 교차검증 반영 = Phase split 승인 + 4보완):**

*Phase 1 — 지금 (dead reference 0; 존재하는 것만 참조):*
1. **`Current Work Status` rename + 소비자 동기화 (atomic).** `plan/post-mvp.plan.md` heading/라벨 → `Current Work Status`(위치 유지). 즉시 sync: `ops-setup.plan.md`·Claude `MEMORY.md`(+4 메모리 파일) = **Claude 담당**. Codex `aiox-entry-index.md` = **Codex 담당**(git 밖 개인 메모리, Claude 미수정). Gemini = Phase 2. **AGENTS.md의 `stage block` 참조 5곳은 item 1에서 안 건드리고 item 2가 메모리 섹션 재작성 때 흡수.**
2. 메모리 2섹션 → B 한 줄 contract. **+ AGENTS.md `stage block` 5곳 소멸 + inbound 섹션-참조(`Post-MVP 메모리 정책`→`Memory`) 동시 갱신(plan/post-mvp.plan.md·MEMORY.md·ops-setup 27·29) = item 2 acceptance.** _(item 1+2 = 하나의 atomic review batch, 2026-06-07 3자 합의: item 1만 떼면 atomic 정의와 모순이고 AGENTS rename은 item 2가 덮어 throwaway라 묶음.)_
3. Docs Rules + Current Doc Layout → `Repository Map`. (개별 history 13/15/58 entry는 Current Work Status가 가리킴)
4. Authority Priority → 단순화. **atlas는 `(when established)` / "docs/aiox and future atlas are non-authoritative references"로 표기**(아직 `atlas/` 없음 → dead-reference 회피). AGENTS=operating contract라 PRD와 경쟁 안 시킴.
5. Vault 2섹션 → transition note 1줄.
6. **Change Safety 섹션 신설 (Phase 1, skill 의존 없음):** "dirty worktree에서 사용자/다른 agent 기존 변경 임의 되돌림 금지, 충돌 시 보존한 채 함께 작업" + "destructive git/filesystem action은 명시 승인 없이 안 함".
7. Decision Options Workflow → 유지(4요소 보존, 표현만 축약 가능).
8. cluster 1 불변식 1줄씩 잔존. Step진행·Critical Issue·Checklist·Delegated 상세 body는 **삭제하지 않고 transition note 1줄만** 추가(Phase 2에서 `/aiox-stage` landing과 동시 제거 → dead reference 회피).
9. **Phase 1 검증:** `rg`로 stale reference 검사(`Canonical stage block`/`Canonical status block`, old vault paths, 삭제된 section명) + markdown link/path 존재 확인. docs-only라 test/typecheck 미요구하되 `Current Work Status`의 `Last verified`에 미실행 사실 명시 유지.

*Phase 2 — WS2 `/aiox-stage` landing과 동시 (skill 먼저 생성·검증 후):*
- Step진행·Checklist·Delegated 상세 절차 → `/aiox-stage` skill로 이동, AGENTS 본문 제거 + 참조를 실제 skill에 연결(dead reference 해소).
- **단 root invariant 1줄씩 잔존:** Critical Issue("invariant/contract/data-loss/atomicity/adapter-boundary 이슈는 일반 구현에 섞지 말고 authority history 기록 후 별도 해결") + Completion gate("완료는 `pnpm test`·`pnpm typecheck` 통과 후 선언"). 이 둘은 stage 절차가 아니라 안전 contract라 skill로 안 내림.
- Gemini 메모리 thin-index 원칙 확인.

*Phase 3 — WS4:*
- Vault transition note → `Atlas` 섹션 교체.

**Codex 권장 실행 순서:** ① rename+소비자 sync → ② Repository Map+Authority+memory one-line+Vault transition → ③ Change Safety 추가 → ④ 상세 workflow에 transition note만 + 본문 유지 → ⑤ stale-reference/path 검사 → ⑥ (Phase 2) `/aiox-stage` 생성·검증 후 body 제거 + invariant 1줄 축약.

**상태:** Phase split + 4보완 3자 합의 완료. **2026-06-07: item 1+2 batch 편집 완료** (rename + 소비자 sync + 메모리 2섹션→`Memory` 한 줄 contract + inbound 참조 갱신), Codex 교차검증 완료(ops:29 표현 약화 반영).

**2026-06-07: item 3~9 batch 적용 완료** (Codex 교차검증 in-flight · 사용자 확인/커밋 대기). 결과 = AGENTS.md 144줄(자동관리 nextjs 블록 9줄 포함), 11섹션 구조:
- item3 `## Repository Map`(Docs Rules+Current Doc Layout 통합, prd/history/plan/docs-aiox/spikes/legacy/src·tests 역할 설명, 개별 history entry 미나열). _(사용자 후속: legacy 설명을 "초기 모델 보존"으로 일반화 + home 경로 `~/.claude/plans/` scratch bullet 제거.)_
- item4 `## Authority Priority` 단순화 — **heading 유지**(plan/history/prd/docs-aiox README 7곳이 참조 → rename 시 dead ref). atlas는 `(+ 향후 atlas/)` 비권위 참고. AGENTS=operating contract라 순위 항목 제외 명시. _(사용자 후속: agent-scratch tier 제거 → 4계층 `prd/history > plan > docs/aiox(+atlas) > memory/session`. 이로 stale해진 consumer 3곳 Codex 정합: plan/README·docs-aiox/README·history/README.)_
- item5 `## Atlas / Vault (transitional)` 1블록(Vault 2섹션 24줄+ 압축). tooling=repo-local(`.claude/`·`.codex/`·필요시 `.gemini/`)은 "보류 아닌 확정 규칙"으로 보존, vault 색인만 WS4까지 보류.
- item6 `## Change Safety` 신설(dirty worktree 기존 변경 임의 되돌림 금지 + destructive git/fs 명시 승인).
- item7 `## Decision Options Workflow` 4요소 유지(본문 그대로, @user 코멘트만 제거).
- item8 cluster1 불변식 4개(todo=plan/만 / 완료=test+typecheck / 구현=.ai/tdd.md / 위임=사용자 승인)를 `## Work Entry and Execution`로 hoist. Step진행·Critical Issue·Checklist·Delegated 4개 상세 body는 **삭제 안 함**, transition note 1줄씩만 추가(Phase 2 skill 이동 예고).
- 추가: 구 `## 구현 원칙` 섹션 제거 + `.ai/tdd.md` 불변식 Work Entry 흡수(standalone 2줄 섹션이 불변식과 중복).
- inbound sync 2곳: `docs/aiox/README.md`(Docs Rules→Repository Map), `prd/README.md`(이미 깨진 dead ref "Memory와 권위 문서 패턴"→Memory; item2 sync 누락분).
- **item9 검증:** dead ref 0 / Canonical stage·status block 잔재 0 / 유지 11섹션 heading 전부 존재 / @user 코멘트 0. **존재 path:** `plan/`·`docs/aiox/`·`history/16…`·`.ai/tdd.md` 등 실존. **future-declared(미존재, ownership 선언):** `.codex/`·`.gemini/`(WS2 도구 생성 시), repo `.claude/`는 settings.local.json만 존재. **home scratch:** `~/.claude/plans/`(repo 아님). docs-only라 test/typecheck 미요구.

**Codex 교차검증(2026-06-07) 4지적 반영 완료:**
1. **자동관리 블록 복원** — 전체 Write 시 AGENTS.md 최상단 `<!-- BEGIN:nextjs-agent-rules -->`(Next.js docs + OpenAI MCP 규칙) 블록이 누락됐던 것을 git index에서 byte-exact 복원. (정리 범위 밖·미작성·자동관리 블록 → 보존 의무.)
2. **상태 sync** — Current Work Status(plan/post-mvp.plan.md)·ops-setup 상태를 "item3~9 적용·Codex review 반영"으로 갱신.
3. **`~/my-vault` 경로 제거** — Atlas/Vault transition note의 사용자 경로를 path-less "외부 vault"로 교체(stale-sweep 정합).
4. **future path 표기** — `.codex/`·`.gemini/`를 ownership 선언(WS2 생성)으로, `~/.claude/plans/`를 home scratch로 명시. 검증 주장에서 "전부 실존" → future-declared 예외 분리.

**남음:** 사용자 일괄 확인 → 커밋(사용자 지시). 이후 **Phase 2**(WS2 `/aiox-stage` skill 생성·검증 후 4개 상세 body 이동 + Critical/Completion invariant 1줄 잔존 + Gemini 메모리 thin-index 확인), **Phase 3**(WS4 Atlas 교체). 커밋 메시지/타이밍은 사용자 지시.

## Handoff & Open questions (3자 의논)

**다음 세션 진입 경로:** 이 파일 + `plan/post-mvp.plan.md`의 Current Work Status(`Session Re-entry`) 읽기 → **다음 작업 = `AGENTS.md 정리` 섹션 "편집 순서" Phase 1 item 3~9를 일괄 진행**(사용자 결정 2026-06-07; item 1+2 batch 완료): Claude가 Codex 교차검증하며 연속 편집 + Phase 1 검증까지 → 일괄 사용자 확인. 이후 WS2 구현 / WS3 의논. (AGENTS.md 나머지 섹션에 사용자 `@user` inline 코멘트가 남아 있음 — item 3~9 편집 시 함께 해소.)

**의논거리:**
1. **WS1 커밋** — repo 4파일(AGENTS/plan/qa-tracker/ops-setup)을 커밋할지, 메시지/범위(prd 잔여와 분리).
2. **WS2 첫 deliverable 순서** — `settings.json` 분리 먼저 vs `/aiox-stage` skill 먼저?
3. **WS3 stage-workflow 문서 위치** — AGENTS.md 확장 vs 신규 `docs/aiox/stage-workflow.md` (plan 미정 항목).
4. **WS4 atlas granularity** — 6 subsystem 유지 vs brain density 위해 더 잘게.
5. **승인 게이트 (process)** — Codex가 WS1 prune을 매핑 승인 전에 진행함. 다음 위임부터 "매핑 먼저 반환 → 승인 → 실행"을 명시 의무화할지.
6. **WS3 agent 가용성 전환** — `dual`/`claude-only`/`codex-only` mode를 공식
   workflow 개념으로 둘지, driver/reviewer 배정 주체와 handoff 생성 시점, 복구 agent의
   reviewer-first 재진입 및 dual 복귀 조건을 어떻게 정할지.
7. **Cross-WS automation 범위** — Current Work Status/handoff template·validator와
   stage/atlas checker 중 무엇이 실제 반복 비용과 token을 줄이는지, 어떤 기능은
   유지비·오판 위험 때문에 만들지 않을지. 최초 구현은 `work-status show/validate`로
   제한할지, `propose-update`까지 함께 둘지.
