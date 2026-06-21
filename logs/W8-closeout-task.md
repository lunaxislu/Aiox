# Task Brief — W8 A2A spec authority package: W9 Closeout 저작

## 맥락

이 brief는 **child W8 package**(`docs/specs/aiox-a2a.md` primary owner)의 마지막 Work
Item인 **W9 Closeout & parent 반영**을 저작하기 위한 지시서다. W8 batch 작업(W1~W8)은 모두
완료·PASS됐다(§4 lifecycle/envelope/correlation decision 확정, source map canonical 2 row 수용).
남은 것은 package를 닫기 위한 closeout 저작이다.

분업: **너(Codex)가 closeout draft를 저작 → @claude(checker)가 review.** review PASS 전까지
parent W8 소비와 package closeout은 확정하지 않는다(child 로그 최신 블록 명시). 따라서 이
brief의 산출물은 **draft**다. owner 문서를 새로 흡수·수정하지 않는다(closeout은 이미 한 일의
장부화 + handoff/map draft이지 새 assimilation이 아니다).

Controlling log: `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`.

## 0. 먼저 읽어라

`file:line`은 출발점이다. 직접 수정·주장 전에는 최종 source에서 재확인한다.

1. Controlling log `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`
   - Scope (Primary owner / Allowed cross-owner / Cross-Owner Effects only)
   - Work Items (W1~W9, 특히 W9 문구와 그 안의 Legacy/Historical Source Handoff 요구)
   - 최신 블록 2개: "W8 Codex source-map update draft — Claude checker review" PASS,
     "W9 handoff 보강 — legacy/historical source 누락 방지"(이미 prep된 Handoff 표가 여기 있다)
   - 비어 있는 상단 `### Closeout` 섹션(line 58-64)
2. Parent log `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md`
   - W8 Work Item(현재 working tree에서 `[x]`로 표시됨)·W9·W10·W11 Work Items
   - latest 블록들(W8 package 생성 경위)
3. `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` (canonical source map + W8 draft 블록)
4. `logs/2026-06-18-package-workflow-portable-pattern.md`
   - Work Item W1-2(W8 closeout 시행착오 수집, 아직 `[ ]`)
   - 마지막 F-번호를 확인한다(현재 F40 이후, child W8 W11 블록이 F41~F43을 언급). 다음 번호로 이어 기록한다.
5. `logs/AGENTS.md` — Workspace Reset Log Sections, Package Preparation(특히 #8 Work Items 감사,
   #9 retrospective, #10 split map), Closeout Check, Legacy Source Absorption Map / Archive Gate
6. 형식 선례: `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md` 최하단
   `### Closeout`(Updated owner documents / Validation result / Remaining gaps / Workflow
   retrospective / Next owner/log)과 W7→parent 복귀·pointer 전이 방식

## 1. 이 작업의 범위

- 대상: child W8 package log의 **W9 Closeout** 저작(draft).
- 제외: spec/architecture/roadmap/decision **owner 본문 신규 수정 금지**. W8에서 이미 확정된
  decision(`docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`)과 source map 2 row를
  다시 바꾸지 않는다. 실제 split 실행은 W10 소유 — 여기서는 split **map**만 만든다.
- 너가 답해야 할 것: "다른 agent가 이 closeout만 읽고 W8 package를 pass/fail 판정하고, parent가
  다음 단계(W9 roadmap/release, W10 split)로 안전하게 넘어갈 수 있는가?"

## 2. 저작할 산출물 5종 (모두 draft)

### (1) Split map — W10 입력 (`logs/AGENTS.md` Package Prep #10)

W7/W8에서 최신화된 `docs/specs/aiox-a2a.md`(+필요 시 `local-agent-runtime.md`)의 어떤
section/claim이 split 시 어느 slice 문서 또는 owner로 갈지 map. 실제 split은 하지 않는다.
section ID와 inbound 참조 보존 후보를 함께 적는다. controlling log의 Batch A1/B/C Ledger와
Sweep Ledger의 owner 분류를 입력으로 쓴다.

### (2) Workflow retrospective

`logs/2026-06-18-package-workflow-portable-pattern.md`에 다음 F-번호로 이어 기록하고, child
W8 로그 `### Closeout`의 Workflow retrospective 필드에는 요약만 남긴다. W8 고유 시행착오 후보:
- Falsifiability gate(Current Contract = `src:line`+test cite 없으면 강등)가 실제로 "추론의 spec
  흡수"를 막았는가.
- Ledger-먼저-본문-나중 6-phase가 효과가 있었는가(producer Ledger → spot-check → W7 본문 반영).
- Codex producer / Claude checker **cross-model** 의도가 실제로는 "producer 모델 정체 미검증
  subagent"로 약화된 사건(controlling log "W2-W5 완료" 블록)과 그 교훈.
- §13 선별 decision 승격 기준(spec contract 고정 rationale만 W8, 나머지는 W9/W10/architecture handoff).
- batch 분할(A0/A1/B/C/Sweep), task brief 적정성, Scope 밖 owner 필요 빈도.
- repo 전용 판단과 portable 후보를 섞지 말고 분리한다(F39/F40 형식 참고).

### (3) Parent W4.5 W8 소비 반영안 (draft)

parent 로그는 working tree에서 이미 W8 `[x]`·W9 `[>]`로 수정돼 있다. 그런데 child closeout은
아직 PASS 전이다 — 이 선반영이 F27(parent-child 원자적 복귀 계약)·F14(완료는 disk 증명)와
정합적인지 점검하고, 정합 정리안을 draft한다. 포함할 것: parent에 남길 W8 완료 요약(주요
산출물·decision·source map 변화), parent next pointer 전이 확인(W9 roadmap/release가 맞는지),
parent W11(portable 수집)과 portable-pattern W1-2 연결.

### (4) Legacy/Historical Source Handoff 섹션 확정

child 최신 블록 "W9 handoff 보강"에 prep된 표를 closeout 정식 섹션
`### Legacy/Historical Source Handoff To W10 / Physical Delete Gate`로 확정한다. source group별로
`W8 consumed` / `W9 must check` / `W10 must check` / `physical delete gate only after inbound
repoint + self-sufficiency`를 분리한다. 대상: `history/58`(§4 WHY는 decision 승격 완료, 잔여는
W5/W10), `prd/post-mvp/aiox-a2a-spec.md`, `prd/post-mvp/archive/*`, `docs/aiox/*`,
`prd/pre-validation/*`, `plans/post-mvp*`, `history/59`. **삭제 실행 금지** — 행선지만 기록.
`history/`는 W5 history migration owner이므로 source map row를 새로 만들지 않는다.

### (5) Closeout 5필드 (child 상단 `### Closeout` 채우기)

- Updated owner documents: W8에서 실제 바뀐 것만(신규 decision 파일, source map 2 row). W7
  본문 반영분은 W7 소관이므로 혼동 없게 구분.
- Validation result: W7 cite review PASS + W8 checker review PASS 경로를 재현 가능하게.
- Remaining gaps: controlling log Open Questions(W7/W9/W10 대상)와 Handoff를 가리킨다.
- Workflow retrospective: (2)의 요약.
- Next owner/log: parent W9(roadmap/release) 또는 W10(split)로의 복귀 지점.

## 3. 제약

- 전부 **draft**. child 로그 frontmatter `status: open`을 바꾸지 않는다(decided 전이는 Claude
  review PASS 후 별도 단계). parent 로그를 추가로 직접 편집하지 말고 반영**안**을 child 로그
  블록에 적는다(이미 적용된 parent 변경의 정합성 점검은 하되, 추가 편집은 review 후).
- owner 문서(`docs/specs/`·`docs/decisions/`·`docs/architecture/`·roadmap·release) 본문 수정 금지.
- `file:line`을 적을 때 직접 재확인 못 한 것은 `unverified — regrep required`로 낮춘다(F21/F26).
- 보고는 disk 산출물로 증명한다. "했다"가 아니라 어느 블록에 무엇을 적었는지 가리킨다(F14).

## 4. 완료 조건

- 산출물 5종이 child W8 로그(또는 retrospective는 portable-pattern 로그)에 draft로 기록됨.
- child W8 Work Items가 Evidence Ledger·Cross-Owner Effects·최신 블록과 대조 감사됨(Package Prep #8):
  순서 충돌, 누락된 cleanup/escalation, parent로 돌려보낼 항목 점검.
- split map이 W10이 소비 가능한 형태(section/claim → owner/slice + 보존할 anchor/inbound).
- Legacy/Historical Source Handoff가 source group별 행선지로 분리되고 삭제 가드가 명시됨.
- parent 반영안이 F27/F14 관점에서 정합적이며 next pointer 전이 대상이 명확함.
- retrospective가 repo 전용/portable 후보로 분리되고 다음 F-번호로 기록됨.
- review로 넘길 때 "무엇을 PASS 판정해야 하는지"가 명확함.

## 5. 출력 위치

- 산출물 (1)(3)(4)(5): `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`에 새 날짜 블록
  + 상단 `### Closeout` 채우기.
- 산출물 (2): `logs/2026-06-18-package-workflow-portable-pattern.md`에 F-번호 이어서 + child 로그
  Closeout에 요약.
- owner 문서·parent 로그 추가 편집·status 전이·물리 삭제는 하지 않는다(Claude review 후).
