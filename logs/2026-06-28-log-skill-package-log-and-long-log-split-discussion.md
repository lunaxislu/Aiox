---
topic: log skill package-log and long-log split discussion
description: logs/AGENTS.md의 workspace reset package-log 규칙을 log skill에 통합할지, 별도 repo integration으로 유지할지, 그리고 긴 로그를 child log로 분할하는 기준을 토의한다.
status: open
---

> 이 로그는 Work Items 없이 토론·논의를 이어가는 **토론형 로그**다. 재개 신호는
> 최신 블록의 열린 질문이며, 토론이 수렴해 구체적 반영 대상이 정해지면 그때 owner를
> 정해 처리한다.

## 2026-06-28 · 초기 기록 — package-log 규칙과 긴 로그 분할 토의

### 질문

- `logs/AGENTS.md`에 있는 workspace reset package-log 규칙 중 무엇을 portable log skill로 통합할지, 무엇을 repo-specific integration으로 남길지 검토한다.
- 로그 내용이 길어질 때 parent/control log, child log, transferred item, 독립 follow-up log를 어떻게 구분할지 stage8 W6/W10 사례를 기준으로 정리한다.

### 확인한 사실

- `.agents/skills/log/SKILL.md`는 portable log skill이다. 일반 로그 작성·재개·종료는 skill reference가 소유하고, 프로젝트별 로그 workflow는 project integration이 확장한다고 설명한다.
- `.agents/skills/log/references/work-items-rules.md`는 `[>]` next pointer와 parent/child pointer를 구분한다. child log의 parent는 child 결과를 소비해야 하는 Work Item이며, 출처가 같다는 사실만으로 parent가 정해지지 않는다.
- 같은 reference는 `Transferred:`를 해당 Work Item이 현재 로그의 actionable 항목이 아니고 다른 로그·문서·owner·작업 흐름이 이어받는 경우로 정의한다. parent 로그의 항목을 child 로그가 먼저 처리한 뒤 parent로 돌아와야 하면 이관이 아니라 parent/child pointer라고 한다.
- `logs/AGENTS.md`는 이 repo의 추가 계약이다. owner handoff, workspace reset assimilation, package preparation, Evidence Ledger, Cross-Owner Effects, Closeout, parent/child package read path 같은 repo/workspace-reset 전용 규칙을 소유한다.
- stage8 parent log는 너무 길어져 W6 owner-doc retrofit child log와 W10 docs contract overhaul child log로 분리됐다. parent/control log는 W6/W10 child pointer와 stage-level next pointer만 소유하고, 상세 기록은 child logs가 소유한다.

### 이번 대화에서 생긴 판단 기록

- @user는 stage8 긴 로그의 흐름을 세 갈래로 정리했다: 기존 stage8 control log, W6 retrofit, W10 docs 관련 전면 개선.
- @user는 W6 retrofit이 먼저 git 변경과 로그 기록으로 존재했고, 그 다음 W10 docs 전면 개선이 수행됐다고 정리했다.
- @codex는 그 정리를 수용하되, W6와 W10은 `Transferred:`가 아니라 parent/control log의 Work Item 결과를 소비해야 하는 child pointer로 두는 것이 맞다고 답했다. 이유는 parent W6/W10 항목이 사라진 것이 아니라 child 결과를 소비해 완료 또는 복귀해야 하기 때문이다.
- @codex는 긴 로그의 해법은 사실상 분리라고 판단했다. 단, 분리는 내용이 길다는 이유만으로 무조건 수행하는 것이 아니라 이후 별도로 재개·검증·closeout할 수 있는 수명이 생겼을 때 수행한다.

### 현재 후보 결론

- Portable log skill 후보:
  - 긴 로그 분할 기준: 별도 재개·검증·closeout 수명이 생기면 child 또는 독립 로그로 분리한다.
  - parent/child vs transferred 구분: parent가 결과를 소비하고 복귀해야 하면 child pointer, source가 더 이상 소유하지 않으면 `Transferred:`.
  - parent/control log는 child 상세를 복사하지 않고 child pointer, 소비 조건, 현재 next pointer만 보존한다.
- Repo-specific integration 유지 후보:
  - workspace reset Evidence Ledger, Cross-Owner Effects, Closeout section template.
  - legacy source absorption map, archive gate, package preparation before execution.
  - owner handoff와 docs taxonomy owner map에 따른 반영 규칙.
- 아직 확정하지 않은 질문:
  - 위 portable 후보를 실제 log skill reference에 반영할 만큼 일반화할지, 아니면 `logs/AGENTS.md`에 repo 사례로만 남길지.
  - 긴 package log를 몇 줄 또는 어떤 구조 신호에서 분리 권고할지. 현재 후보는 line count보다 “control log와 execution detail의 수명 분리”를 기준으로 삼는 것이다.

### Next

- 다음 초점은 `logs/AGENTS.md`의 package-log 규칙을 portable 후보와 repo-specific 후보로 분류하는 것이다.
- 이 로그는 W10 child의 child가 아니다. W10 결과를 소비해야 닫히는 작업이 아니라 log skill / repo integration 운영 방식에 대한 독립 follow-up이다.

## 2026-06-28 · 추가 토의 — package log read path와 source-map 누락 문제

### 사용자 문제 제기

- @user는 packages log 방식에 시행착오가 있었다고 설명했다.
- onramp와 로그 스킬 통합으로 agent가 context를 읽지만, 이전 로그 기록의 결정까지 읽지 않아 특정 요청이나 source-map 성격의 입력을 빠뜨린 채 작업하는 경우가 있었다.
- @user는 "로그 파일 전체를 읽게 하자"는 해결은 토큰 소모와 불필요한 컨텍스트 주입 때문에 피해야 한다고 판단했다.
- @user는 현재 로그 작성 pointer와 Work Item 구조를 바꿀 의향이 있고, `logs/AGENTS.md`의 package log 지침을 log skill로 흡수하는 편이 나은지 검토하고 싶다고 했다.

### 확인한 사실

- `docs/guides/workflow.md`는 onramp가 pointer chain, 최신 블록 제목과 next pointer만 요약하며 로그 본문의 의미를 재구성하지 않는다고 설명한다.
- `work-items-rules.md`는 agent가 모든 open 로그를 매번 역검색하거나 자동 동기화하지 않고, 현재 작업에서 명시적으로 알려진 known graph만 처리한다고 규정한다.
- `logs/AGENTS.md`의 package preparation은 batch agent가 controlling package log의 Scope, Work Items, 최신 기록, active next pointer/handoff, 관련 Evidence Ledger row를 먼저 읽는다고 한다.
- 같은 지침은 Evidence Ledger, Cross-Owner Effects, Closeout의 `Action`이 나중에 수행·검증해야 하는 행동이면 ledger에만 두지 말고 package Work Item으로 추가하거나 기존 Work Item이 소유한다고 명시하라고 한다.
- `logs/AGENTS.md`는 parent/child package read path를 맞추며, child package의 active Work Item, cleanup/escalation, closeout 전제 중 parent 재개 판단에 필요한 내용은 parent 최신 기록이나 parent Work Item에도 짧게 반영하라고 한다.

### 진단 후보

- 문제는 "agent가 전체 로그를 읽지 않았다" 자체보다, 새 세션이 반드시 소비해야 하는 결정·source-map row·후속 action이 active Work Item, required-read, handoff, parent/child pointer 중 하나로 승격되지 않았거나, 승격되었더라도 onramp가 좁혀 준 read path 안에서 복원되지 않는 데 가깝다.
- 따라서 해결 방향은 전체 로그 읽기 강제가 아니라, package log의 소비 계약을 구조화하는 쪽이 더 적합하다.

### 적용 방향 후보

- Portable log skill 후보:
  - 긴 로그 또는 package형 로그에서 "전체 본문 재독해"를 요구하지 말고, 다음 세션이 반드시 읽어야 하는 결정·입력·후속 action은 active Work Item, handoff/latest block, parent/child pointer, transferred target 중 하나로 끌어올린다는 일반 규칙.
  - ledger나 decision 후보처럼 보조 구조에 action이 생기면 Work Item 또는 기존 Work Item 소유로 대조해야 한다는 일반 규칙. 단 `Evidence Ledger`라는 이름과 템플릿은 repo-specific으로 남긴다.
  - child/parent 재개 판단에 필요한 내용은 child 상세를 복사하지 않고 parent Work Item 또는 최신 기록에 소비 조건만 남긴다는 일반 규칙.
- Repo-specific integration 유지 후보:
  - workspace reset source-map, archive gate, owner 상태 라벨, Evidence Ledger/Cross-Owner Effects/Closeout template, task brief의 구체 섹션.
  - `src/`, surviving archive, source map, owner 문서를 교차 확인하는 workspace reset 전용 증거 규칙.

### Next

- 분류 단계에서는 `logs/AGENTS.md`의 package preparation 규칙을 portable invariant와 workspace-reset-specific template으로 나눠 본다.
- 실제 반영 전에는 사용자 승인을 받아 `.agents/skills/log/references/work-items-rules.md` 또는 `logs/AGENTS.md` 중 실제 수정 owner를 정한다.

## 2026-06-28 · 추가 토의 — 로그별 pair 파일 아이디어

### 사용자 제안

- @user는 로그 파일 하나당 하나의 pair 파일을 만들어, 소비해야 하거나 결정된 내용을 거기에 작성하고 agent가 그 pair 파일을 읽게 하는 방식을 제안했다.
- 동시에 파일이 계속 많아지는 문제가 생기지 않겠느냐고 우려했다.

### 진단 후보

- pair 파일 방식은 긴 로그 본문 전체를 읽지 않고 durable decision / required-read / consumed action만 얇게 읽게 할 수 있다는 장점이 있다.
- 단점은 로그마다 파일이 하나씩 늘어나는 파일 수 증가, 원 로그와 pair 파일 간 동기화 drift, 어떤 내용이 본문에 있고 어떤 내용이 pair에 있는지에 대한 새 mental model 비용이다.
- 모든 로그에 1:1 pair 파일을 강제하면 일반 작업 read path가 늘고, log skill의 "새 문서가 read path를 늘리는지 먼저 본다"는 유지보수 원칙과 충돌할 수 있다.

### 적용 방향 후보

- 기본값은 pair 파일이 아니라 로그 본문 상단 또는 최신 handoff 안의 얇은 `Resume Contract`/`Decision Digest` 같은 구조를 검토한다.
- 별도 pair 파일은 다음 조건을 만족하는 큰 package/control log에만 예외적으로 쓴다:
  - 로그 본문이 길고 여러 세션/agent가 반복 재개한다.
  - source-map, owner handoff, required-read처럼 본문과 분리된 재개 계약이 실제로 필요하다.
  - pair 파일이 없으면 매번 전체 로그 또는 여러 ledger를 재독해해야 한다.
- pair 파일을 쓴다면 원 로그 frontmatter 또는 Work Item에 pair 파일 경로를 명시하고, pair 파일은 결론·required-read·open action만 소유하며 작업 경위는 원 로그가 소유하도록 경계를 둔다.

### Next

- pair 파일을 portable 기본 구조로 만들지, repo-specific package 예외로 둘지는 분류·반영 단계에서 검토한다.

## 2026-06-28 · 추가 토의 — Work Item stale 문제

### 사용자 문제 제기

- @user는 기존에 작성된 Work Item을 다시 업데이트해야 하는 경우가 있었고, 이를 사용자가 수동으로 다시 재작성하라고 지시한 사례들이 있었다고 설명했다.

### 확인한 사실

- `work-items-rules.md`는 Work Item 수정 기준을 이미 가진다. 같은 행동의 조건이나 순서가 바뀌거나, 표현이 모호하거나, 대상 파일·범위·검증 방식이 더 명확해졌다면 기존 id를 유지한 채 수정한다고 한다.
- 같은 reference는 수정 기록에 원래 행동, 바뀐 행동이나 조건, 변경 이유, next pointer 변경 여부를 남기라고 한다.
- `log-writing-rules.md`의 세션 종료/status 점검은 현재 Work Item 전이와 `[>]` next pointer가 현재 재개 지점을 가리키는지 확인하라고 한다.

### 진단 후보

- 문제는 Work Item 수정 규칙이 전혀 없는 것이 아니라, 본문에서 결정·범위·조건이 바뀌었을 때 agent가 Work Item 줄을 재개 인덱스로 다시 감사해야 한다는 실행 압력이 약한 데 있다.
- Work Item 줄이 stale하면 onramp가 올바른 로그와 next pointer를 찾아도 다음 agent가 낡은 행동을 수행할 수 있다.
- pair 파일을 두더라도 Work Item stale 문제는 사라지지 않는다. pair 파일 자체가 또 다른 stale surface가 될 수 있다.

### 적용 방향 후보

- Portable log skill 후보:
  - 로그에 새 결정, 범위 변경, source/target 변경, 검증 조건 변경, child/transfer 발생을 기록할 때는 해당 내용이 현재 Work Item 줄과 next pointer를 stale하게 만들지 않는지 즉시 점검한다.
  - stale하면 본문 기록만 남기지 말고 Work Item을 수정·분리·취소·이관 중 하나로 전이한다.
  - 사용자가 "다시 작성하라"고 지시해야 하는 상황을 실패 사례로 보고, agent가 append/closeout 전에 자체 점검해야 하는 invariant로 올린다.
- Script 후보:
  - 의미 판단 자동화는 부적합하지만, `log check`가 active Work Item과 최신 블록/handoff의 구조 신호를 보여줘 사람이 stale 여부를 더 쉽게 확인하게 할 수 있는지는 별도 검토한다.

### Next

- 분류 단계에서 Work Item freshness invariant를 portable 후보로 포함한다.
- 실제 반영 시 `work-items-rules.md`의 Work Item 수정/점검 절에 보강할지, `log-writing-rules.md`의 append/세션 종료 점검에 보강할지 owner를 정한다.

## 2026-06-28 · 추가 토의 — Work Item별 상세 계약 필요성

### 사용자 문제 제기

- @user는 각 Work Item마다 상세, 후속 action, 지침 등이 필요할 수 있다고 지적했다.

### 진단 후보

- 로그 단위 `Resume Contract`만 있으면 서로 다른 Work Item의 source, 조건, 검증 방식, 후속 action이 섞일 수 있다.
- Work Item 줄은 한 줄 재개 인덱스여야 하므로, 모든 상세를 Work Item 줄에 직접 넣으면 스캔성이 떨어진다.
- 따라서 Work Item 줄은 짧게 유지하되, 필요할 때만 Work Item별 상세 블록을 두는 구조가 더 적합하다.

### 적용 방향 후보

- 기본 구조:
  - `## Work Items`는 한 줄 action과 상태만 소유한다.
  - 필요할 때 `## Work Item Details` 같은 섹션에 `### Wn` 단위 상세를 둔다.
  - `Wn` 상세는 required-read, decision/constraint, next action, validation, child/transfer target 같은 재개 계약만 소유한다.
  - 작업 경위와 시행착오는 날짜별 기록 블록이 계속 소유한다.
- stale 방지:
  - Work Item 줄이 바뀌면 해당 `### Wn` 상세도 함께 점검한다.
  - 본문에서 결정·조건·source·target·검증 기준이 바뀌면 Work Item 줄과 `### Wn` 상세가 stale하지 않은지 같이 점검한다.
- pair 파일과의 관계:
  - Work Item별 상세 블록으로 충분하면 pair 파일은 만들지 않는다.
  - Work Item별 상세가 너무 커지거나 여러 agent가 별도로 소비해야 하면 그때 child log 또는 예외적 resume/pair 파일을 검토한다.

### Next

- 분류 단계에서 portable 후보에 "optional Work Item Details" 구조를 포함하되, 모든 로그에 강제하지 않는 방향으로 검토한다.

## 2026-06-28 · skill 관점 검토 — 제안 구조 평가

### 확인한 사실

- log skill maintenance 기준은 새 문서가 read path를 늘리는지 먼저 보고, 기존 문서의 재배치나 축약으로 해결할 수 있으면 새 문서를 만들지 말라고 한다.
- 같은 기준은 문제가 여러 프로젝트에서 반복될 수 있고 로그 작성·작업 수명 자체에 관한 규칙이면 portable log skill 변경 후보라고 한다.
- `work-items-rules.md`는 Work Item 줄을 한 줄 행동 요약과 구조 상태로 제한하고, full why와 사용자 결정, 취소·보류·범위 변경 의미는 날짜별 기록 블록이 소유한다고 한다.
- document-structure-review 기준은 default section이 비용이며, skeleton보다 invariant 또는 decision table이 더 작은 해결일 수 있다고 한다.

### Codex 검토 의견

- **Work Item freshness invariant**는 portable log skill 후보로 검토할 만하다는 의견이다. 기존 규칙의 의도를 바꾸지 않고, 결정·범위·조건 변경 시 Work Item과 next pointer가 stale하지 않은지 점검하는 must rule을 강화하는 성격으로 보인다.
- **Work Item relationship decision table**도 portable 후보로 검토할 만하다는 의견이다. same-W update, other-W handoff, new-W, cancel/replace, child log, transfer, reorder, validation update, blocker, no-follow-up처럼 결과가 여러 갈래로 나뉘므로 decision table 형태가 맞아 보인다.
- **optional Work Item Details**는 제한적 후보라는 의견이다. Work Item 줄을 길게 만들지 않고 W별 required-read, prerequisite, validation, handoff target을 보존할 수 있다. 다만 모든 로그의 기본 skeleton으로 강제하면 over-provisioned structure가 될 수 있다.
- **로그 단위 Resume Contract**는 큰 control/package log에만 쓰는 repo 또는 optional pattern 후보로 보인다. 모든 로그에 추가하면 Work Item Details와 역할이 겹치고 read path가 늘 수 있다.
- **1:1 pair file**은 portable 기본 구조로 삼기 어렵다는 의견이다. 파일 수 증가, 원 로그와 pair 파일의 drift, 새 mental model 비용이 크다. 예외적으로 매우 긴 package/control log에서 read path를 실제로 줄이는 경우에만 repo-specific 옵션으로 검토할 수 있다.
- **workspace reset package 규칙 전체의 log skill 흡수**는 피하는 편이 낫다는 의견이다. source-map, Evidence Ledger, archive gate, owner 상태 라벨, task brief template은 이 repo의 workspace reset integration에 가깝다.

### Codex 반영안 후보

- 1차 반영 후보로는 `work-items-rules.md`가 맞아 보인다.
  - Work Item freshness must rule을 `Work Item 수정` 또는 별도 `Work Item freshness` 절로 추가한다.
  - Work Item 관계 decision table을 `Work Item 추가/수정/취소/이관/Pointer` 앞뒤 중 하나에 배치한다.
  - `Work Item Details`는 optional companion section으로만 설명하고, 필수 canonical section으로 만들지 않는다.
- 2차 반영 후보로는 `log-writing-rules.md`가 가능해 보인다.
  - append/세션 종료/status 점검에서 Work Items와 optional details가 stale하지 않은지 확인하는 한 줄 점검을 추가할 수 있다.
- `logs/AGENTS.md`는 workspace reset 전용 package 계약을 계속 소유하는 편이 맞아 보인다.
- pair file은 지금 반영하지 않고, W1/W2 검토 후에도 긴 package에서 실제 필요가 확인될 때만 repo-specific 예외로 다시 논의하는 안이 낫다고 본다.

### Next

- 사용자 승인 전에는 skill/reference 파일을 수정하지 않는다.
- 분류 결론 후보: portable 반영은 Work Item freshness + relationship decision table + optional Work Item Details로 좁히고, pair file과 workspace reset package template은 portable 기본 구조에서 제외한다.

## 2026-06-29 · 실제 사례 — stage8 W6 owner-doc-retrofit child log 분리

### 발단

@user가 `logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md`가
너무 길어졌다며 분리를 제안했다. 당시 W6 안에 남아 있던 작업은 세 갈래였다:

- **architecture retrofit**: Codex가 작업 중이었고 마지막 검토 기록이 W6에 축적되고 있었다.
- **specs retrofit**: 아직 미착수. W6의 Work Item으로만 존재.
- **decisions drift 검토**: 아직 미착수. W6의 Work Item으로만 존재.

### 사용자 결정과 진행 방식

@user는 세 작업 각각에 대해 별도 로그 파일을 만들고, W6에 이미 쌓인 architecture
검토 기록은 새 architecture child log로 마이그레이션하자고 결정했다. W6 parent log에는
각 child를 가리키는 pointer 블록만 남기는 방식이다.

이에 따라 세 파일을 생성했다:

- `logs/2026-06-28-workspace-reset-stage8-W2-architecture-retrofit.md`
  W6에 축적된 architecture slice #1~#9 검토 기록 전체를 이전. Codex가 이미 완료한
  작업이므로 마이그레이션 즉시 `decided` 처리.

- `logs/2026-06-28-workspace-reset-stage8-W3-specs-retrofit.md`
  specs retrofit 전용 child log. 대상 파일 8개(`aiox-a2a.md` 외 7개)를 Work Item으로
  구성하고, 각 파일에 대한 step-by-step 검토·반영 형식으로 작성.

- `logs/2026-06-28-workspace-reset-stage8-W4-decisions-drift.md`
  decisions drift 전용 child log. 대상 decision 파일 15개를 Work Item으로 구성하고,
  동일하게 파일별 stale 링크·owner drift 검토 형식으로 작성.

W6 parent log는 세 child pointer 블록만 소유하고 상세 기록은 child가 소유.

### 진행 중 발생한 문제와 해결

**Work Items ID 형식 제약**
W3 초안에 `S0-S7`, W4 초안에 `D01-D15` 형식으로 Work Item을 작성했더니
`log check`가 `work_items: active=0 open=0 closed=0 incomplete=0`으로 파싱 실패.
→ `W숫자` 형식(`W1-W8`, `W1-W15`)으로 재작성해 해결.
→ 교훈: log 도구 Work Item ID는 `W숫자` 전용. 커스텀 prefix(S, D 등) 사용 불가.

**신규 파일 날짜 블록 누락**
직접 Edit으로 생성한 child log에 날짜 블록이 없어 `WARN latest: 날짜 블록 없음` 발생.
→ 파일 생성 직후 `log append`로 날짜 블록 추가해 해결.
→ 교훈: `log new` 외의 방법으로 만든 파일은 즉시 `log append` 필수.

### 확인된 패턴

- **분리 기준**: "너무 길다"는 관찰이 분리 계기였고, 분리 대상이 된 세 작업이
  각각 독립적으로 재개·closeout할 수 있는 수명을 가졌기 때문에 child log가 적합했다.
- **child pointer vs transferred**: 세 child 모두 parent(W6)가 결과를 소비하고
  decided로 닫혀야 하므로 `Transferred`가 아닌 child pointer로 처리.
- **완료된 작업의 마이그레이션**: Codex가 완료한 architecture 기록은 새 child log로
  이전 후 즉시 decided 처리 — parent log 부담 없이 history를 child가 소유.
- **parent log 소유 범위**: child pointer, 소비 조건, stage-level next pointer만.
  child 실행 상세는 child log가 소유. parent가 child 내용을 복사하지 않음.
