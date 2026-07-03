---
topic: log skill package-log and long-log split discussion
description: log skill 개선 토론 — package-log 규칙의 portable/repo 분류, 긴 로그 분할 기준, 그리고 cross-step standing 내용 누락을 막는 전면 개편(재개 표면 완전성·spine+상황 루프 골격)을 토의한다.
status: superseded
---

> 이 로그는 Work Items 없이 토론·논의를 이어가는 **토론형 로그**다. 재개 신호는
> 최신 블록의 열린 질문이며, 토론이 수렴해 구체적 반영 대상이 정해지면 그때 owner를
> 정해 처리한다.

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

## 2026-06-29 · 전면 개편 토론 — spine + 상황 루프 골격 수렴

### 발단 — @user 문제 제기

- 로그 작업에서 "기억해야 할 부분"을 반복적으로 놓침. 예: W1~W6 중 W3 토론에서
  "W1~W6 전부 기준 문서 X 참조" 결론 → 그 세션은 알지만, 새 세션엔 최신 블록이
  "W3 작업기록"으로만 보여 cross-step 기준을 놓치고 W1·W2·W4~W6에 대해 모름.
- package log 지원, 긴 로그 분할 기준(분할 시 line 수 포함)도 필요.
- 전면 개편 의향 있음.

### 진단 — @claude (확인한 사실: SKILL + reference 4개 읽음)

- 로그는 2축뿐: 시간축(날짜 블록=narrative) / 재개축(Work Items+`[>]`). **셋째 종류
  "cross-step standing 제약·required-read"의 집이 없다.** → 날짜 블록(재개 read path 밖,
  onramp가 pointer·최신 블록·next pointer로 좁힘)에 묻힌다.
- (추론) 버그 = "전체 안 읽어서"가 아니라 "미래 세션이 지켜야 할 게 재개 표면으로 승격
  안 됨". 이 토론 로그 2026-06-28 진단(전체 읽기 강제 대신 소비 계약 구조화)과 동형.
- **통합 원리(keystone): 재개 표면 완전성.** 토론에서 떠다니던 Work Item freshness·
  scope-routing·promote-or-lose·Resume Contract는 한 원리의 측면들 — "날짜 블록=narrative;
  재개 표면(Work Items+조건부 standing 섹션)=미래 의무의 완전한 현재 index; 기록할 때마다
  scope가 블록을 넘으면 끌어올리고 표면 stale 점검".

### 합의·전환된 방향들 (모두 미정 토론)

1. **scope = 단순화** : @claude는 전면 churn 불필요(2축·reference 계층 견고) 의견. @user의
   전면 개편 동기는 file churn이 아니라 **현 문서 장황**. 거슬리는 곳 명시: `## 용어`,
   `work-items-rules.md`. ambivalence("내용은 다 필요한데 불필요해 보임") → @claude 해소:
   내용(판단 kernel)은 필요, 거슬림의 정체는 **always-on read path**. on-demand 전환으로
   보존+부담 제거.
2. **두 층 must-know** : @user "로그 전체로 알 것 + Work Item 각각 알 것 작성". @claude 동의
   — 같은 매장 버그의 두 scope(log-wide / per-WI). per-WI Details를 "후속"에서 keystone으로
   격상. 단 강제 skeleton 금지, **조건부**.
3. **onramp vs skill 책임** : @user "onramp=무엇 할지, skill=무엇 읽을지". @claude 수용 —
   onramp 표면화 제안은 over-coupling이라 철회. **읽기 계약은 skill 소유**(log-writing
   "로그 선택" 확장). 표면을 파일 맨 위에 두면 normal read가 잡음. onramp 변경은 scope에서
   빠짐(선택적 hygiene: cue를 skill 계약에 위임).
4. **loop 개념** : @user — 여러 축. 상황별 루프 예: "로그 너무 김 → 분할+pointer/순서/WI흐름
   재배선", "package log 해야 하나?". @claude — spine(매 세션) + on-demand 상황 루프(어려운
   순간) 아키텍처로 종합.
5. **plan 비대 = 같은 문제** : @user — `plans/workspace-reset/workspace-reset.md` stage line이
   길어짐(본인이 지시). (확인) stage 7 `required-read: history/59`·`방향 확정` 결정, stage 6
   disposition 등이 plan에 박힘. root AGENTS.md = "plan은 단계 순서+포인터만". (추론) **로그
   standing surface 결손의 누수** — 안 읽힐까 봐 확실히 읽히는 plan으로 hoist. → Promote
   라우팅에 negative rule "상위 index로 hoist 금지, owner로".

### 현재 수렴 골격 (반응 대기, 미정)

- **surfaces(on-disk)**: frontmatter → `## 적용 기준`(조건부·신규: 전-로그 standing) →
  `## Work Items`(한 줄 index, W숫자, `[>]` 하나) → `## Work Item Details`(조건부·신규:
  Wn별 must-know) → 날짜 블록(narrative).
- **재개 읽기 계약(skill 소유)**: 적용 기준 + Work Items + `[>]Wn의 ### Wn` + 최신 블록.
  본문 전체 재독해 안 함. (#3 source-map/토의 survive가 여기서 해결.)
- **spine(매 세션)**: 들어가기(읽기 계약)→일한다→증류(날짜 블록 1개)→점검(트리거→루프)→
  나가기(`[>]` 하나·표면 stale 아님).
- **상황 루프**: Promote(블록 넘는 결정/발견 → scope 라우팅 적용기준/###Wn/owner, plan hoist
  금지) · Reconcile(WI 전이 decision-table+freshness+옛 why 보존) · Detach(별도 수명/너무 김
  → **길이=점검 트리거 ≠ 분할 결정; 기준=수명**, child/transferred/독립, narrative migration, 재배선; (선택)도구: `log check`가 본문 line 수를 순수 metric으로 출력→사람이 분할 판단(의미 판단은 도구가 안 함)) ·
  Closeout(decided 5조건/superseded+owner 반영) · Package?(큰 multi-owner → 떼어내 package,
  소비 source를 적용기준 required-read로 bind; scaffolding=repo). (경계 미정: 결정-뒤집힘·
  Check = 독립 루프 vs sub.)
- **문서 재구성**: `## 용어` 삭제·인라인 · `work-log-rules.md`(axis 색인) → SKILL 루프 색인이
  대체 · `work-items-rules.md` 5연산 → Reconcile/Detach로, core("한 줄 index·W숫자·`[>]`")는
  SKILL 흡수 · `log-writing-rules.md` 기록 기본 유지·status→Closeout·scope→Promote ·
  `SKILL.md`=always-on core(무엇/왜·구조·spine·읽기계약·루프 색인·핵심 불변·도구) · 유지:
  maintenance/project-setup/example.
- **portable↔repo 경계**: portable=surfaces·읽기계약·spine·Promote 라우팅+hoist금지·
  Reconcile/Detach/Closeout·Package 커널 / repo `logs/AGENTS.md`=source map·Evidence Ledger·
  archive gate·task brief·owner 반영 / repo `plans/AGENTS.md`+onramp=stage line 순서+포인터·
  onramp 라우팅.

### 열린 knob

1. `적용 기준`/`Work Item Details` 이름. 2. 루프 reference 파일 granularity(1개 `loops.md` ↔
   4개 분리). 3. 결정-뒤집힘·Check = 독립 루프 vs sub. 4. "너무 김" line 임계 구체값 + `log check` line-metric 도구 채택 여부.
2. onramp 읽기 계약 위임 vs 유지.

### Next

- 아직 아무 파일도 편집하지 않았다. 골격은 @user 반응 대기 상태.
- knob 확정 → reference 실제 편집 초안. 편집 전 `maintenance.md` 절차(진단 보고·승인, 비용
  큰 변경 재확인) 따른다.
- 재개 신호: 위 "열린 knob" + 골격에 대한 @user 반응.

## 2026-06-30 · 원문 보존 — lifecycle, git, 근육 협응 비유에 대한 Codex/Claude 의견

> @user 요청: "각각의 내 의견에 따른 codex,claude를 하나도 빠짐없이 로그에 작성해 요약하지마"
>
> 이 블록은 일반 증류 기록이 아니라, 위 요청에 따라 해당 토론 원문을 보존하는 블록이다.

### 사용자 의견 1 — React lifecycle과 cleanup 비유

@user:

```text
뭔가 react의 라이프 사이클과 비슷하게 cleanup등 하면 좋지 않을까?
```

@codex:

````text
맞습니다. 그 비유가 꽤 좋습니다. 다만 React lifecycle을 그대로 베끼기보다는, **agent 작업 로그의 lifecycle model**로 번역하는 게 좋아 보입니다.

제가 보기엔 이렇게 잡을 수 있습니다.

```text
mount/resume
→ work/render
→ commit/log
→ effect/promote
→ cleanup/closeout
```

로그 스킬 관점으로 바꾸면:

```text
Enter
→ Act
→ Record
→ Promote/Reconcile
→ Cleanup
```

핵심은 `cleanup`을 “마지막에 정리 잘하자”가 아니라 **필수 lifecycle phase**로 두는 겁니다.

예를 들면 매 세션 또는 의미 있는 작업 단위 끝에서 cleanup이 확인해야 하는 것:

- 날짜 블록에만 남은 standing decision이 있는가?
- 그 decision이 `재개 계약`, `Work Item Details`, Work Item 줄, parent pointer, transfer target, owner 문서 중 하나로 승격됐는가?
- Work Item 줄이 최신 결정과 stale하지 않은가?
- `[>]`가 하나이고 실제 다음 재개 지점을 가리키는가?
- child log / transferred item / parent 복귀가 필요한데 끊긴 것은 없는가?
- 로그가 `decided` 후보인데 open으로 방치되고 있지 않은가?
- 반대로 새 작업으로 open을 억지 연장하고 있지 않은가?

이렇게 보면 지금 논의하던 `Promote`, `Reconcile`, `Detach`, `Closeout`은 전부 cleanup phase 안에서 호출되는 세부 루프처럼 정리할 수 있습니다.

```text
Cleanup
- Promote: 날짜 블록의 미래 의무를 재개 표면/owner로 올림
- Reconcile: Work Items, details, next pointer stale 여부 조정
- Detach: 별도 수명이 생긴 작업을 child/transfer/independent log로 분리
- Closeout: decided/superseded 가능 여부 확인
```

이 구조의 장점은 큽니다. 지금 문서가 장황하게 느껴지는 이유가 “규칙이 많아서”라기보다 “언제 어떤 규칙을 호출해야 하는지”가 흐릿해서인데, lifecycle로 만들면 실행 타이밍이 생깁니다.

제 수정 의견도 조금 바뀝니다.

`spine + 상황 루프`보다 더 직관적인 이름은:

```text
Log Lifecycle
1. Enter
2. Work
3. Record
4. Cleanup
5. Exit
```

그리고 `Cleanup` 아래에 상황 루프를 넣는 방식이 좋겠습니다. React의 cleanup 비유를 쓰면 agent가 이해하기 쉽고, “작업 끝날 때 stale surface를 정리한다”는 압력도 강해집니다.
````

@claude:

```text
좋은 직감입니다. 그리고 이건 막연한 비유가 아니라, 앞서 당신이 겪은 두 버그가 정확히 cleanup 누락이라는 한 class라는 게 핵심입니다 — "Work Item이 stale인데 안 고쳐져서 직접 다시 쓰라고 지시", "child 닫혔는데 parent 소비를 잊음". React에서 deps 바뀌었는데 cleanup이 안 돌아 옛 구독이 남는 것과 같은 모양입니다.

매핑이 실제로 성립하는 지점

┌──────────────────────┬─────────────────────────────────────────────────────────┬──────────────────────────────────────┐
│        React         │                          로그                           │                 의미                 │
├──────────────────────┼─────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ mount / setup        │ 들어가기 = 읽기 계약(적용 기준 + Work Items + [>]Wn의   │ 세션이 standing surface를 "구독"     │
│                      │ ### Wn + 최신 블록)                                     │                                      │
├──────────────────────┼─────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ render               │ 일한다 → 증류(날짜 블록 1개)                            │ 작업을 narrative로 commit            │
├──────────────────────┼─────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ deps 변경 → effect   │ 점검 = reconcile: 이번 블록이 결정·범위·조건을 바꿨나?  │ dependency = 그 표면이 의존하는      │
│ 재실행               │                                                         │ 결정/범위/조건                       │
├──────────────────────┼─────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ cleanup              │ stale해진 Work Item·### Wn·적용 기준·child pointer를    │ 생성 시 teardown 조건을 같이 등록    │
│ 함수(teardown)       │ 전이/소비/제거                                          │                                      │
├──────────────────────┼─────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ unmount              │ Closeout(decided/superseded)                            │ 남은 cleanup 전부 실행 + owner 문서  │
│                      │                                                         │ 반영(자원 해제)                      │
└──────────────────────┴─────────────────────────────────────────────────────────┴──────────────────────────────────────┘

이 프레임이 골격에 더하는 것은 freshness 규칙의 격상입니다. 지금 골격은 "나갈 때 표면 stale 점검"인데, React식으로 보면 **"생성 시 teardown을 co-locate + 의존성이 바뀐 그 순간 reconcile"**로 바뀝니다. 즉 언제 점검하는지가 명확해져요 — "매번 나갈 때"가 아니라 "그 표면이 의존하는 결정/조건을 건드린 블록을 쓰는 순간". 그리고 Closeout이 unmount로 자연스럽게 정의됩니다(이미 logs/AGENTS.md의 Closeout Check가 "닫기 전 owner 반영 누수 점검" = pending cleanup flush 역할을 합니다).

정직하게 — 비유가 깨지는 경계 3가지

이건 동의하되, 그대로 베끼면 안 되는 곳입니다.

1. 로그엔 런타임이 없다. React cleanup은 런타임이 자동 호출하지만, 로그는 agent가 수동 실행합니다. 그래서 cleanup은 자동 메커니즘이 아니라 discipline/checklist입니다. log check가 구조적 stale 신호(복수 [>], 빈 next pointer 등)는 보조할 수 있어도 "이 결정이 저 Work Item을 stale하게 만들었나" 같은 의미 판단은 agent가 합니다 (maintenance.md: 도구는 의미 판단을 대신 안 함).
2. React가 named lifecycle(componentDidMount…)을 버리고 useEffect로 간 이유를 그대로 가져와야 합니다. 강제 named 단계는 경직돼서 폐기됐어요. 우리도 **"모든 로그가 거쳐야 할 5단계 ceremony"가 아니라 "obligation이 있을 때만 cleanup이 붙는 조건부·의존성 구동"**으로 가야 합니다 — 골격의 "조건부 표면"과 정확히 같은 방향입니다.
3. cleanup은 새 동사가 아닙니다. teardown verb는 이미 있습니다 — 완료/취소/이관/수정. cleanup은 그 동사들을 언제 적용해 표면을 fresh하게 유지할지의 규율입니다. 6번째 연산을 추가하는 게 아니라 (그러면 maintenance.md의 "동사 늘리지 마라"에 걸립니다), Reconcile 루프의 트리거 규칙을 명확히 하는 것입니다.

phasing과의 관계

cleanup은 keystone 표면(Work Items·standing·pointer) 위에서 도는 규율이라, Phase 1을 강화하지 파일을 늘리지 않습니다. 구체적으로 spine의 점검 step이 "reconcile: 이번 블록이 무엇의 dependency를 바꿨나 → 그 표면 cleanup"으로 또렷해지고, freshness must-rule이 그 형태로 들어갑니다. "상황 루프 → lifecycle 어휘로 재명명"은 문서 구조 변경이라 여전히 Phase 2입니다.

그래서 이 아이디어는 제 앞선 phasing 제안과 충돌하지 않고, Phase 1의 keystone을 더 좋은 mental model로 만들어 줍니다.

---
한 가지만 토론을 좁히고 싶습니다: lifecycle/cleanup을 "어휘"로 표면에 채택할지, 아니면 "원리"로만 쓰고 표면 이름은 중립적으로 둘지가 갈림길입니다.

- 어휘 채택: spine을 mount/render/reconcile/cle즉시 전달되는 강점. 단 portable log skill이 React 멘탈모델을 전제하게 되고, 비-React 사용자에겐 오히려 진입장벽.
- 원리만 차용: 표면 이름은 들어가기/점검/나가기+cleanup 규칙(생성 시 teardown co-locate, 의존성
변화 시 점검)은 그대로 흡수. portable성 유지.

저는 원리만 차용 쪽을 권합니다 — portable skill이 특정 프레임워크 멘탈모델을 전제하지 않는 게 maintenance.md 원칙("특정 repo/스택 전제 금지")에 맞고, cleanup의 규율이  니기 때문입니다. 어떻게 보시나요?
```

### 사용자 의견 2 — git commit, 분리, 젓가락/근육 협응 비유

@user:

```text
그리고 뭔가 로그에 대한건 git과 같이라고 해야 하나? 뿐만아니라 분리할 때도 git과 같이 커밋할 때 컨셉

인간이 젓가락을 사용 할 때, 근육이 유기적으로 서로 같이 움직이는데 이러한 컨셉도 어떻게 생각하나?
```

@codex:

````text
좋은 방향입니다. 저는 세 비유가 서로 다른 층을 설명한다고 봅니다.

**React lifecycle**
이건 “언제 무엇을 해야 하는가”를 잡는 데 좋습니다.

```text
Enter → Work → Record → Cleanup → Exit
```

특히 `Cleanup`은 강합니다. 세션 끝이나 작업 단위 끝에서 stale Work Item, 승격 안 된 결정, parent/child 끊김, closeout 후보를 확인하는 phase로 둘 수 있습니다.

**Git commit**
이건 “로그 기록 단위가 무엇이어야 하는가”를 잡는 데 좋습니다.

로그 블록은 대화 덤프가 아니라 commit처럼 의미 있는 단위여야 합니다.

```text
working tree = 대화/작업 중 생긴 raw context
staging = 다음 세션이 알아야 할 것만 선별
commit = 날짜 블록으로 증류
index/status = Work Items + 재개 계약 + Work Item Details
branch/split = child log / independent follow-up
merge = parent가 child 결과를 소비
rebase 금지 = 과거 판단을 조용히 덮어쓰지 않음
```

이 비유가 특히 좋은 지점은 “분리”입니다. 로그를 나눌 때도 그냥 파일을 쪼개는 게 아니라, git에서 branch를 따듯이 **별도 수명과 목적이 생겼는가**를 봐야 합니다. 그리고 parent log는 child의 모든 내용을 복사하지 않고, merge point처럼 “무엇을 기다리고, 돌아오면 무엇을 소비할지”만 소유합니다.

**젓가락/근육 비유**
이건 “규칙들이 따로 노는 게 아니라 같이 움직여야 한다”는 걸 설명하는 데 좋습니다.

예를 들어 `Record`만 하면 부족합니다. 날짜 블록을 쓰는 순간 동시에 다음 근육들이 같이 움직여야 합니다.

```text
Record → Promote 검사
Record → Work Item freshness 검사
Record → next pointer 검사
Record → child/transfer 필요성 검사
Record → closeout 가능성 검사
```

젓가락을 쥘 때 손가락 하나만 움직이지 않듯이, 로그 작업도 “append만 함”, “Work Item만 바꿈”, “parent pointer만 남김”처럼 단일 동작으로 끝나면 쉽게 깨집니다. 하나의 의미 변화가 생기면 관련 표면들이 유기적으로 같이 조정돼야 합니다.

그래서 세 비유를 합치면 이렇게 정리할 수 있습니다.

```text
Lifecycle = 언제 실행하는가
Git = 어떤 단위로 기록하고 분리하는가
Muscle coordination = 한 동작이 어떤 표면들을 같이 움직여야 하는가
```

저라면 log skill 개편의 중심 모델을 이렇게 잡겠습니다.

```text
Log Lifecycle
1. Enter
   - current log, read contract, active Work Item 확인

2. Work
   - 실제 조사/수정/토론 수행

3. Stage
   - raw context에서 다음 세션이 필요한 결정·제약·근거만 선별

4. Commit
   - 날짜 블록으로 증류

5. Cleanup
   - Promote / Reconcile / Detach / Closeout 실행

6. Exit
   - next pointer와 재개 표면이 stale하지 않은 상태로 종료
```

여기서 `Stage`와 `Commit`은 git 비유가 직접 들어가고, `Cleanup`은 React 비유가 들어갑니다. 그리고 각 phase 안에서는 젓가락 비유처럼 관련 표면들이 같이 움직이는 원칙을 둡니다.

제 의견으로는 이 모델이 `spine + 상황 루프`보다 더 직관적입니다. `spine`은 내부 설계어처럼 느껴지고, `Lifecycle / Stage / Commit / Cleanup`은 agent가 실행 타이밍과 책임을 더 빨리 복원할 수 있습니다.
````

@claude:

```text
두 비유 다 좋습니다. 그리고 흥미로운 건 — 앞의 React 비유까지 합치면 세 개가 같은 keystone을 서로 다른 각도에서 가리킨다는 점입니다. 하나씩 정직하게 분해해 보겠습니다.

Git — 가장 강한 건 "두 층 구조"

git 비유는 두 갈래로 읽힙니다.

1. 날짜 블록 = commit. 이게 직접적입니다. log-writing-rules의 "매 Q&A 기록 금지, checkpoint에서 한 블록으로 증류, WHY를 담아라, 원문 덤프 금지"는 그대로 좋은 commit hygiene입니다 — atomic·distilled·curated. 생략/증류 = staging(무엇을 넣을지 고름). [>] = HEAD(단일 재개점).
2. 분리 = branch + atomic commit. child log = branch, parent pointer 소비 = merge. 그리고 "분리할 때 커밋처럼"이라는 직감은 Detach를 정확히 강화합니다 — 분할은 한 번의 깨끗한 atomic 작업이어야 하고(parent엔 pointer+이유만, child는 self-contained, 토론 복사 안 함), 이건 2026-06-29 W6→W2/W3/W4 분리가 실제로 그렇게 된 사례입니다.

그런데 git이 가장 잘 명명해 주는 건 따로 있습니다 — 두 층 구조입니다.

┌──────────────────────────────────────────┬───────────────────────────────────────────────────────┬─────────────────────┐
│                   git                    │                         로그                          │        성질         │
├──────────────────────────────────────────┼───────────────────────────────────────────────────────┼─────────────────────┤
│ 불변 history(commits)                    │ 날짜 블록(append, history 안 고침)                    │ narrative           │
├──────────────────────────────────────────┼───────────────────────────────────────────────────────┼─────────────────────┤
│ 가변                                     │ Work Items·[>]·적용 기준·### Wn(제자리 수정해 현재    │ current-state       │
│ refs/working-tree(HEAD·branch·index)     │ 진실 반영)                                            │ surface             │
└──────────────────────────────────────────┴───────────────────────────────────────────────────────┴─────────────────────┘

원래 버그를 git 언어로 하면 정확히 이겁니다: 현재 상태 정보(standing 제약)를 가변 ref(표면)가 아니라 불변 history(옛 날짜 블록)에 넣어서 stale된 것. keystone(standing을 적용 기준 표면으로 승격)은 곧 "current state는 ref에 두고 옛 commit에 묻지 마라"입니다. 그리고 freshness/cleanup = ref를 현실과 동기 유지(dangling ref = stale Work Item)입니다. 이게 골격의 "2축"을 React보다 더 깔끔하게 설명합니다.

젓가락/근육 — co-dependent 업데이트가 한 동작

근육 synergy가 가리키는 건 공의존 업데이트의 동시성입니다. 젓가락은 손가락을 따로따로 명령하지 않고 학습된 운동 프로그램으로 함께 움직입니다. 로그에서 원하는 상태가 바로 이겁니다 — "결정을 기록한다"는 동작이 "Work Item 갱신 + next pointer 점검 + 적용 기준 갱신 + 영향받은 parent pointer 소비"를 하나의 협응 동작으로 같이 발화시키는 것. 지금 버그는 이게 분리된 후속 체크리스트라서 잊히는 것입니다.

이건 이 repo가 이미 채택한 규칙의 로그 내부판입니다 — AGENTS.md의 "국소 파일만 보고 멈추지 않는다, inbound/outbound·호출 경로·producer/consumer를 끝까지 추적해 영향 범위가 닫혔는지 확인"(최근 커밋 0766866 require end-to-end change tracing). 젓가락 synergy = end-to-end change tracing을 로그 표면에 적용한 것입니다.

세 비유가 같은 곳에 착지한다

이게 핵심입니다. 셋은 경쟁이 아니라 같은 keystone의 세 면입니다.

┌───────────────────┬────────────────┬─────────────────────────────────────────────────────────────────┐
│       각도        │      비유      │                            말하는 것                            │
├───────────────────┼────────────────┼─────────────────────────────────────────────────────────────────┤
│ 시간적(process)   │ React cleanup  │ deps 바뀌면 cleanup 실행 — 세션이 시간축으로 무엇을 하나        │
├───────────────────┼────────────────┼─────────────────────────────────────────────────────────────────┤
│ 구조적(data)      │ git 두 층      │ 가변 표   — 로그가 어떻게 구성되나 │
├───────────────────┼────────────────┼────────────────────────────────────┤
│ 동작적(atomicity) │ 젓가락 synergy │ 공의존   이 어떻게 묶이나          │
└───────────────────┴────────────────┴────────────────────────────────────┘

그리고 셋이 같은 gate를 공유합니다: 의존성 구동 선택성(React deps array = git "HEAD에 의존하는 ref만" = "그 동작에 맞는 근육만"). 순수 narrative 블록은 표면 churn을 안 일으킵니다. 또 셋이 같은 한계를 공유합니다: 런타임/자동성이 없다 — agent의 학습된 규율이고, log check는 구조 신호만 보조하지 의미 판단은 대신 안 합니다.
서로 독립인 세 멘탈모델이 한 점에 모인다는 것 자체가, keystone(standing 표면 + 의존성 구동 cleanup)이 옳은 핵이라는 방증입니다.

정직한 경계와 제 권고

- logs ≠ git. git commit은 코드 변경을, 로그는 *판단·경위(WHY)*를 소유합니다. commit message가 가리키기만 하고 다 담지 못하는 그 WHY가 로그의 자리입니다 (logs/AGENTS.md: 로그는 작업 경위 owner, 권위 결과는 owner 문서). 비유는 구조를 밝히지 로그를 git으로 흡수하지 않습니다.
- 어휘는 여전히 중립으로. 섹션을 commit/branch/HEAD/cleanup/synergy로 명명하지 않기를 권합니다. git이 React보다 보편적이고 이 repo가 이미 git 위에 있으니 부담은 더 적지만, portable skill이 특정 멘탈모델을 전제하지 않는 게 maintenance.md 원칙이고 — 규율이 가치이지 이름이 가치가 아니기 때문입니다.
종합하면, 이 세 비유는 새 구조를 더하지 않고 Phase 1 keystone을 검증·예리화합니다. 구체적으로 골격에 반영될 결정 두 가지를 더 또렷하게 해줍니다.

1. "2축"을 git 두 층으로 다시 진술 — 불변 narrat-state 표면(Work Items·[>]·적용 기준·### Wn).이게 standing 표면이 왜 필요한지를 가장 정확히 설명합니다.
2. freshness 규칙을 "협응 동작"으로 — "나갈 때  을 바꾸는 블록을 쓰는 그 동작 안에서, 의존하는표면을 같이 갱신"(생성 시 teardown co-locate). 림.

여기까지는 전부 원리 차용이라 portable성을 안 깹니다. 이대로 keystone에 녹이면 될 것 같은데 — 혹시 어휘 채택(예: 일부러 git 언어를 표면에 쓰는 것)까지 가보고 싶은 갈래가 있으신가요, 아니면 원리 차용으로 합의하고 다음으로 phasing을 매듭지을까요?
```

### 사용자 제공 Claude 의견에 대한 Codex 응답

@user:

```text
클로드는 이렇게 의견을 냈음
```

@codex:

````text
Claude 의견에 대체로 동의합니다. 특히 핵심을 잘 잡은 부분은 이겁니다.

**확인된 핵심**
- React 비유는 `cleanup`의 타이밍을 설명합니다.
- Git 비유는 `history`와 `current-state surface`의 분리를 설명합니다.
- 젓가락/근육 비유는 하나의 의미 변화가 여러 표면을 같이 움직여야 한다는 협응성을 설명합니다.

저도 결론은 **어휘 채택이 아니라 원리 차용** 쪽입니다.

섹션 이름을 `commit`, `branch`, `cleanup`, `mount` 같은 식으로 만들면 처음엔 직관적이지만, portable log skill에는 과합니다. React를 모르는 agent나 사람에게는 오히려 별도 학습 비용이 생깁니다. 대신 문서 내부 설명이나 설계 근거에서만 “React cleanup처럼”, “git ref처럼”을 쓰고, 실제 표면 이름은 중립적으로 두는 게 맞습니다.

제가 보기에 가장 좋은 정식 모델은 이겁니다.

```text
History surface
- 날짜 블록
- append-only narrative
- 무엇이 있었고 왜 그렇게 판단했는지

Current surface
- Work Items
- [>] next pointer
- 재개 계약
- Work Item Details
- parent/child pointer 또는 transfer target
```

그리고 lifecycle은 이렇게 중립화합니다.

```text
Enter
- 읽기 계약에 따라 current surface와 최신 history를 읽는다.

Act
- 실제 작업, 토론, 조사, 수정 수행.

Record
- 의미 있는 checkpoint를 날짜 블록으로 증류한다.

Reconcile
- 이번 기록이 결정, 범위, 조건, required-read, 검증 기준을 바꿨는지 본다.
- 바뀐 dependency가 있으면 관련 current surface를 같이 갱신한다.

Detach
- 별도 수명이 생긴 흐름은 child / transfer / independent log로 분리한다.

Closeout
- decided / superseded 가능 여부와 owner 반영 누수를 확인한다.
```

여기서 `cleanup`은 별도 연산명이 아니라 `Reconcile + Detach + Closeout`을 호출하게 만드는 규율입니다. 이 점이 중요합니다. 새 동사를 늘리면 문서가 다시 장황해지고, 기존 완료/취소/이관/수정 규칙과 중복됩니다.

제가 Claude 의견에서 조금 더 밀고 싶은 부분은 “생성 시 teardown co-locate”입니다. 이건 꽤 강한 규칙이 될 수 있습니다.

예:

```markdown
- [>] W3 Review docs split.

### W3

- Required read: `docs/...`
- Completion condition: split map approved.
- Cleanup / return: if child log is created, parent W3 must be updated with child path and return condition.
```

다만 여기서도 이름을 `Cleanup`으로 박기보다는, 실제 문서 표면에서는 이렇게 쓰는 게 낫습니다.

```markdown
### W3

- Required read:
- Constraints:
- Validation:
- Return / handoff:
```

즉 `cleanup` 원리는 `Return / handoff`, `Validation`, `Reconcile` 규칙 안으로 녹입니다.

제 결론:

1. **원리 차용으로 합의하는 게 맞습니다.**
2. 표면 어휘는 중립적으로 둡니다: `재개 계약`, `Work Items`, `Work Item Details`, `Return / handoff`.
3. 문서 설명에는 세 비유를 짧게 쓸 수 있습니다. 단 section명이나 command명으로 끌어오지는 않습니다.
4. 다음 phasing은 “Phase 1: keystone/freshness 보강”과 “Phase 2: lifecycle/loop 재구성”으로 나누는 게 좋아 보입니다.

다음 토론은 phasing을 매듭짓는 쪽이 맞습니다. 우선 작은 patch로 `Work Item freshness + conditional Work Item Details + 재개 계약`만 반영할지, 아니면 reference 구조까지 `Enter/Record/Reconcile/Detach/Closeout` 식으로 재배치할지를 정하면 됩니다.
````

## 2026-06-30 · 사용자 재제공 Codex 의견 원문 — Claude 의견에 따른 핵심·모델·teardown co-location

> @user 요청: "이걸 마지막 하단에 빠짐없이 로그로 기록 하라"

```text
그리고
클로드의 의견에 따른
확인된 핵심

  - React 비유는 cleanup의 타이밍을 설명합니다.
  - Git 비유는 history와 current-state surface의 분리를 설명합니다.
  - 젓가락/근육 비유는 하나의 의미 변화가 여러 표면을 같이 움직여야 한다는 협응성을 설명합니다.

  저도 결론은 어휘 채택이 아니라 원리 차용 쪽입니다.

  섹션 이름을 commit, branch, cleanup, mount 같은 식으로 만들면 처음엔 직관적이지만, portable log skill에는 과합니
  다. React를 모르는 agent나 사람에게는 오히려 별도 학습 비용이 생깁니다. 대신 문서 내부 설명이나 설계 근거에서만
  “React cleanup처럼”, “git ref처럼”을 쓰고, 실제 표면 이름은 중립적으로 두는 게 맞습니다.

  제가 보기에 가장 좋은 정식 모델은 이겁니다.

  History surface
  - 날짜 블록
  - append-only narrative
  - 무엇이 있었고 왜 그렇게 판단했는지

  Current surface
  - Work Items
  - [>] next pointer
  - 재개 계약
  - Work Item Details
  - parent/child pointer 또는 transfer target

  그리고 lifecycle은 이렇게 중립화합니다.

  Enter
  - 읽기 계약에 따라 current surface와 최신 history를 읽는다.

  Act
  - 실제 작업, 토론, 조사, 수정 수행.

  Record
  - 의미 있는 checkpoint를 날짜 블록으로 증류한다.

  Reconcile
  - 이번 기록이 결정, 범위, 조건, required-read, 검증 기준을 바꿨는지 본다.
  - 바뀐 dependency가 있으면 관련 current surface를 같이 갱신한다.

  Detach
  - 별도 수명이 생긴 흐름은 child / transfer / independent log로 분리한다.

  Closeout
  - decided / superseded 가능 여부와 owner 반영 누수를 확인한다.

  여기서 cleanup은 별도 연산명이 아니라 Reconcile + Detach + Closeout을 호출하게 만드는 규율입니다. 이 점이 중요합니
  다. 새 동사를 늘리면 문서가 다시 장황해지고, 기존 완료/취소/이관/수정 규칙과 중복됩니다.

  제가 Claude 의견에서 조금 더 밀고 싶은 부분은 “생성 시 teardown co-locate”입니다. 이건 꽤 강한 규칙이 될 수 있습니
  다.

  예:

  - [>] W3 Review docs split.

  ### W3

  - Required read: `docs/...`
  - Completion condition: split map approved.
  - Cleanup / return: if child log is created, parent W3 must be updated with child path and return condition.

  다만 여기서도 이름을 Cleanup으로 박기보다는, 실제 문서 표면에서는 이렇게 쓰는 게 낫습니다.

  ### W3

  - Required read:
  - Constraints:
  - Validation:
  - Return / handoff:

  즉 cleanup 원리는 Return / handoff, Validation, Reconcile 규칙 안으로 녹입니다.
```

## 2026-06-30 · 결론 — package log의 문제, 필요성, 차용할 개념

### 확인한 사실

- `logs/AGENTS.md`의 `Package Preparation Before Execution`은 authority assimilation package를
  실행하기 전에 package log를 먼저 만들고, `Primary owner`, `Allowed cross-owner updates`,
  `Evidence inputs`를 명시하라고 한다.
- 같은 지침은 task brief가 지시서이고, package log가 작업 상태, Ledger, next pointer를
  소유한다고 구분한다.
- 같은 지침은 batch agent가 package log의 Scope, Work Items, 최신 기록, active next
  pointer/handoff, 관련 Evidence Ledger row를 먼저 읽은 뒤 작업하라고 한다.
- 같은 지침은 Evidence Ledger, Cross-Owner Effects, Closeout의 `Action`이 cleanup,
  escalation, owner 반영, parent 복귀처럼 나중에 수행·검증해야 하는 행동이면 ledger에만 두지
  말고 package Work Item으로 추가하거나 기존 Work Item이 소유한다고 명시하라고 한다.
- `logs/2026-06-18-package-workflow-portable-pattern.md`는 W7~W10 package workflow 시행착오를
  수집하며, `Ledger-first / artifact-later`, claim provenance, falsifiability gate,
  shared source map consumer binding, parent/context audit, closeout gate 같은 후보를 남겼다.
- `logs/2026-06-28-log-skill-package-log-and-long-log-split-discussion.md`의 앞선 진단은 package
  log read path 문제를 "전체 로그를 읽지 않음"보다, 새 세션이 반드시 소비해야 하는
  결정·source-map row·후속 action이 재개 표면으로 승격되지 않거나 read path에서 복원되지 않는
  문제로 봤다.

### package log가 해결하려던 점

- **미검증 claim의 권위 승격 방지:** legacy/current/planning source에는 사실, 추론, 의견,
  stale snapshot, target 계획, current 구현 주장이 섞인다. package log는 claim을 Evidence
  Ledger에서 먼저 provenance와 근거로 분류하고, 통과한 claim만 owner 문서에 반영하게 하려는
  장치다.
- **agent 보고와 실제 상태의 불일치 방지:** "완료", "변경 없음", "삭제됨", "반영됨" 같은 보고는
  disk, owner 문서, source map, ledger와 대조되기 전까지 확정 사실이 아니다. package log는
  pass/fail을 다음 agent가 재현할 수 있게 source·line·finding·owner impact·action을 남긴다.
- **상태 owner와 실행 지시서의 분리:** task brief는 실행 지시서이고 상태 owner가 아니다.
  package log가 Scope, Work Items, next pointer, Evidence Ledger, Cross-Owner Effects, Closeout을
  소유해야 세션·agent가 바뀌어도 현재 상태와 다음 행동이 유지된다.
- **cross-owner scope 격리:** 큰 package는 primary owner 외 specs, architecture, roadmap,
  release plan, decisions, plans 같은 주변 owner를 건드릴 수 있다. package log의 `Primary owner`
  와 `Allowed cross-owner updates`는 허용된 write-set과 scope 밖 이탈을 구분하기 위한 기준이다.
- **shared source/disposition 추적:** 여러 package가 같은 legacy source나 source map을 소비할
  때 새 표를 각자 만들면 흡수 여부, successor, archive 필요성, self-sufficiency, 삭제 후보가
  흩어진다. 단일 source map과 consumer read binding은 이 흩어짐을 막는다.
- **비가역 action gate:** 삭제, 이동, archive, owner 문서 반영, decision 승격은 되돌리기
  어렵거나 후속 작업을 막을 수 있다. package log는 self-sufficiency, downstream consumer,
  parent/child 복귀, 사용자 확인을 closeout/physical deletion gate에서 확인하게 한다.
- **parent/child와 downstream read path 보존:** child package가 active Work Item, cleanup,
  escalation, closeout 전제를 갖고 있어도 parent가 그 결과를 어떻게 소비할지 모르면 재개가
  끊긴다. package log는 parent 최신 기록이나 Work Item에 소비 조건과 return/handoff를 남기게
  한다.

### 왜 필요한가

- 일반 로그의 주 위험이 stale Work Item과 재개 표면 누락이라면, package log의 주 위험은 더
  무겁다. 검증되지 않은 claim이 owner authority로 승격되거나, 삭제·이동 같은 비가역 처분이
  근거와 successor 없이 진행될 수 있기 때문이다.
- 큰 작업에서는 source가 여러 곳에 있고, owner도 여러 개이며, batch agent와 reviewer가
  분리되고, parent/child/downstream package가 동시에 얽힌다. 이때 단순 날짜 블록만으로는
  "무엇을 믿을 수 있는가", "무엇을 반영해도 되는가", "누가 다음에 무엇을 소비해야 하는가"를
  안정적으로 복원하기 어렵다.
- 따라서 package log는 단순한 긴 로그가 아니라, 큰 작업의 증거·상태·scope·handoff·closeout을
  한 곳에서 감사 가능하게 만드는 상태 owner가 필요해서 생긴 구조다.

### 차용할 개념에 대한 결론

- package log에는 **법정/증거 심리**와 **트랜잭션 gate** 개념을 원리로 차용하는 것이 가장
  적합하다는 결론이다.
- 1차 frame은 **법정/증거 심리**다.
  - Evidence Ledger는 증거와 출처 보존에 해당한다.
  - `[Fact]`, `[Inference]`, `[Opinion]` 구분과 claim provenance는 증거능력 분류에 해당한다.
  - falsifiability gate와 "변경 없음" 검증은 입증책임에 해당한다.
  - owner 문서 반영은 입증된 claim만 권위로 채택하는 판정에 해당한다.
- 2차 frame은 **트랜잭션 gate**다.
  - `Allowed cross-owner updates`는 write-set 선언에 해당한다.
  - `Ledger-first / artifact-later`는 prepare → commit 흐름에 해당한다.
  - package log에 evidence와 action을 먼저 남기는 것은 WAL처럼 반영 전 재현 가능한 기록을
    남기는 원리에 가깝다.
  - source map disposition과 physical deletion gate는 비가역 commit gate에 해당한다.
- 보조 frame으로 **control tower**도 유효하다.
  - package log는 batch 순서, task brief dispatch, reviewer, parent/child return, downstream
    handoff, active next pointer를 조율한다.
  - 다만 control tower는 실행 조율 측면이고, package log의 더 깊은 본질은 증거 심리와 commit
    gate다.

### 어휘 채택 여부

- 위 개념들은 **원리만 차용**하고, section명이나 command명으로 채택하지 않는다.
- `Exhibit`, `Verdict`, `COMMIT`, `WAL`, `control tower` 같은 어휘를 package log 표면에 쓰지
  않는다. portable log skill이 특정 멘탈모델을 전제하면 진입 비용이 늘기 때문이다.
- 실제 표면은 중립 어휘를 유지한다: `Scope`, `Work Items`, `Evidence Ledger`, `Decision
Candidates`, `Cross-Owner Effects`, `Source Map`, `Closeout`, `Task Brief`.

### 현재 토론과의 연결

- 일반 로그의 keystone은 "미래 의무를 current surface로 승격하고, 의존성이 바뀌면 cleanup으로
  stale하지 않게 유지한다"는 것이다.
- package log는 같은 승격 문제의 heavyweight 형태다. 승격 대상이 owner authority이고 때로는
  삭제·이동 같은 비가역 store이므로, 일반 로그의 promote/freshness 원리에 **입증책임**과
  **commit gate**가 추가된다.
- 압축하면: 일반 로그는 `git + lifecycle cleanup + 협응 동작` frame으로 설명되고, package log는
  `git + 법정/증거 심리 + 트랜잭션 gate` frame으로 설명된다. 둘 다 실제 문서 표면에서는 중립
  어휘를 유지한다.

### 다음 논점

- 이 결론을 실제 reference에 반영할 때는 package log 전체 template을 portable skill로 옮기지
  않고, portable 후보를 더 작은 invariant로 분해해야 한다.
- 후보 invariant:
  - 큰 package는 상태 owner(package log)와 실행 지시서(task brief)를 분리한다.
  - owner authority로 승격하기 전 claim provenance와 증거를 먼저 남긴다.
  - cross-owner write-set을 미리 선언하고 scope 밖 변경은 사용자 확인을 받는다.
  - shared source map/ledger는 owner binding, consumer binding, entry binding, action binding을
    함께 가진다.
  - 비가역 action은 self-sufficiency, downstream consumer, parent/child return, 사용자 확인
    gate를 통과해야 한다.

## 2026-06-30 · 사용자 선별 — 기존 skill에서 보존할 기록 kernel

### 사용자 의견

- @user는 현재 log skill에서 가져가야 한다고 보는 핵심 범위를 제시했다.
- 제시 범위는 크게 세 묶음이다:
  - `SKILL.md`의 `# 작업 로그`, `프로젝트와 작업 로그의 관계`, `참조`에 있는 portable
    boundary와 project integration boundary.
  - `log-writing-rules.md`의 `기록 기본`, `기록할 내용`, `기록 품질`.
  - `log-writing-rules.md`의 `로그 블록`, `생략할 내용`, `외부 출처`.

### 확인한 사실

- 위 범위는 이미 현재 skill/reference에 존재한다.
- 해당 범위는 로그가 무엇을 소유하는지, 프로젝트 owner 문서와 어떤 관계인지, 무엇을
  기록·생략해야 하는지, 날짜 블록을 어떻게 증류해야 하는지에 대한 기본 kernel이다.
- 이 범위는 Work Items, next pointer, parent/child, transfer 같은 작업 표면 세부 규칙보다
  앞에 놓이는 기록 철학과 portable boundary를 소유한다.

### Codex 판단

- @user 선별에 동의한다. 이 범위는 Phase 1에서 삭제하거나 크게 재구성할 대상이 아니라,
  새 invariant를 얹을 기준선으로 보존하는 편이 맞다.
- 특히 다음 문장은 새 구조에서도 핵심 anchor로 유지해야 한다:
  - 로그는 작업 과정과 판단 경위를 기록하고, 권위 있는 결과물·장기 규칙·실제 구현 사실을
    대신 소유하지 않는다.
  - 기록은 형식보다 의미 복원을 우선한다.
  - 이 내용을 빼면 다음 agent가 의도, 판단, 근거, 제약, 현재 상태 또는 남은 일을 잘못
    이해할 가능성이 있는지를 기록 여부의 기준으로 삼는다.
  - 질문과 답변마다 즉시 기록하지 않고, 의미 변화가 확정되는 checkpoint에서 한 블록으로
    증류한다.
- 따라서 Phase 1 patch는 위 kernel을 대체하지 않고, "의미 복원"의 하위 규율로 재개 표면
  완전성, 조건부 재개 계약, 조건부 Work Item Details, Work Item freshness, dependency-driven
  Reconcile을 연결하는 방향이 적합하다.

### 경계

- `SKILL.md`는 entry/router로 유지한다는 maintenance 기준이 있으므로, 위 내용을 모두
  `SKILL.md`로 끌어올리기보다 현재처럼 `log-writing-rules.md`가 세부 기록 규칙을 소유하게
  두는 편이 맞다.
- `기록 기본`과 `기록 품질`은 portable core이지만, workspace reset package template,
  Evidence Ledger schema, archive gate 같은 repo-specific 표면은 여기에 섞지 않는다.

## 2026-06-30 · Work Item Requirements 종합 결론 — 다음 세션 handoff

### 결론 상태

- @user, @codex, @claude 검토를 거쳐 `Current Requirements` 모델은 이름과 정체성을 조정해
  `Work Item Requirements` 모델로 수렴했다.
- 이 블록은 다음 세션이 이어받을 종합 결론이다. 실제 `.agents/skills/log/SKILL.md`와
  reference 파일은 아직 수정하지 않았다.
- 이전 블록의 `Current Requirements`, range/span, kind 후보, `Derived Logs` 기본 섹션화
  가능성은 이 블록의 결론으로 대체해서 읽는다.

### 핵심 정체성

- section명은 `## Work Item Requirements`가 현재 결론이다.
- 이 section은 "현재 진실을 주장하는 standing state"가 아니라, **Work Item 수행 시 적용할
  requirement의 대상 범위를 선언하는 표면**이다.
- 전체 작업 context를 대체하지 않는다. 재개 시 spine을 먼저 읽고, 최신 날짜 블록만으로
  부족하면 필요한 과거 날짜 블록을 역추적한다.

### Scope 표기

- heading은 `{...}` set literal만 canonical form으로 쓴다.
  - 예: `### {Global}`, `### {W1,W3,W6}`, `### {W3}`
- `W2-W4` 같은 range shorthand는 쓰지 않는다.
- heading은 적용 대상 Work Item set일 뿐이며, 순서·우선순위·dependency·phase를 뜻하지
  않는다.
- `{Global}`은 단독 heading으로만 쓴다. `{Global,W3}`처럼 W set과 섞지 않는다.
- `{Global}`은 해당 로그 파일 전체의 Work Item 수행에 공통으로 알아둬야 할 requirement다.
- 특정 W 묶음에만 필요한 요구는 `{W1,W2}` 같은 명시 set에 둔다.

### 읽기 규칙

- Wn 재개 시 최소로 읽을 spine:
  - `## Work Items`
  - `## Work Item Requirements`의 `{Global}`
  - `## Work Item Requirements` 중 set에 Wn이 포함된 모든 heading
  - 최신 날짜 블록
- 위 범위는 충분 조건이 아니라 출발점이다. Wn의 현재 질문·판단·남은 작업을 복원하기에 부족하면
  관련 과거 날짜 블록을 더 읽는다.

### Reconcile trigger

- set literal은 range/list ambiguity를 해결하지만, 신규 W 누락을 자동으로 해결하지는 않는다.
- Reconcile trigger는 세 묶음으로 본다.
- A. Work Item 상태 변경:
  - Work Item 추가
  - Work Item 완료
  - Work Item 취소
  - Work Item 이관
  - detach
- B. `Work Item Requirements` 자체 변경:
  - scope heading 추가·수정·삭제
  - requirement bullet 추가·수정·삭제
  - label이 붙은 requirement bullet 수정·삭제
  - `Override [label]` 참조 추가·수정·삭제
- C. child 복귀:
  - child 로그 완료
  - parent의 detached Work Item을 소비하고 완료·취소·이관 등 필요한 전이를 점검
- 새 W가 생기면 기존 requirement 중 새 W에도 적용해야 할 것이 있는지 점검한다.
- `{Global}`이나 detached/transferred W에 걸린 requirement가 바뀌면, 해당 Work Item line
  pointer를 확인해 child/target 로그 점검이 필요한지 판단한다.
- label 대상 bullet이 바뀌거나 삭제되면, 해당 label을 참조하는 `Override [label]`이 dangling
  또는 의미 drift 상태가 아닌지 점검한다.
- 완료·취소·이관된 W는 수행 대상이 아니므로 effective application에서 무시한다.
- 완료된 W가 포함된 set이 남아 있어도 그 자체로 stale은 아니다. 다만 closeout이나 정리 시점에
  inert set을 점검할 수 있다.
- 취소 사유는 Work Item line에 남긴다:
  - 예: `- [-] W4: guides retrofit — cancelled: 사용자 판단으로 범위에서 제외`

### Override와 충돌

- 기본 해결은 `Override`가 아니라 scope 정밀화다.
  - 충돌이 생기면 먼저 requirement를 `{Global}`에서 빼고 실제 적용되는 W set에만 둘 수 있는지
    본다.
- 좁은 scope가 넓은 scope를 자동으로 덮어쓰지 않는다.
- 그래도 예외가 필요할 때만 label 기반 `Override`를 쓴다.
- label은 Override 대상 bullet에만 on-demand로 붙인다. kind 분류가 아니라 참조 핸들이다.

예시:

```markdown
## Work Item Requirements

### {Global}
- [no-skill-edit] 실제 `.agents/skills/log/*` 파일은 사용자 지시 전 수정하지 않는다.

### {W3}
- Override [no-skill-edit]: 사용자 승인 범위에서 `.agents/skills/log/references/work-log-rules.md`를 수정한다.
```

- exact quote 기반 Override는 문구 수정에 취약하므로 현재 결론에서는 label 기반을 선호한다.
- 같은 label을 여러 Override가 상충되게 덮거나, 존재하지 않는 label을 참조하면 Reconcile
  대상이다.
- Override label은 한 로그의 `Work Item Requirements` 안에서 유일해야 한다. 중복 label은
  `Override [label]` 대상이 모호해지므로 Reconcile 대상이다.
- `Draft-only`, `Allowed-by-user`, `Blocked-until-user` 같은 flag는 아직 만들지 않는다. 자연어
  requirement로 충분한지 먼저 본다.

### Transfer / Detach / Child 로그

- transfer는 Work Item을 동등하거나 독립적인 다른 로그로 넘기는 것이다.
- detach는 parent 로그의 하위 child 로그로 상세 작업을 분리하는 것이다.
- marker 체계의 현재 결론 후보:
  - `[ ]`: open
  - `[>]`: active / next pointer. 한 로그에 하나만 둔다.
  - `[x]`: completed
  - `[-]`: cancelled
  - `[→]`: transferred. 다른 로그로 넘겼고 parent/source 복귀 의무는 없다.
  - `[↓]`: detached. child로 위임했고 child 완료 후 parent/source가 복귀를 소비해야 한다.
- 기본 관계 표시는 별도 `## Derived Logs` 섹션이 아니라 Work Item line pointer다.
  - 예: `- [↓] W2: specs assimilation — detached: logs/specs-assimilation.md`
  - 예: `- [→] W3: decisions assimilation — transferred: logs/decisions-assimilation.md`
  - 예: `- [↓] W4: architecture assimilation — detached: logs/architecture-assimilation.md`
- transferred는 completed와 의미가 다르므로 `[x]`로 표시하지 않는다.
- detached는 child가 끝나면 parent/source가 소비해야 하는 pending 상태이므로 transferred와
  구분한다.
- 실제 반영 단계에서는 기존 `work-items-rules.md`와 `scripts/log`가 `[→]`, `[↓]` marker를
  처리할 수 있는지 확인하고 필요하면 함께 갱신한다.
- `## Derived Logs` 같은 별도 section은 파생 로그가 많아 한눈 view가 필요할 때만 조건부로
  고려한다. 기본 표면으로 만들지 않는다.
- parent/source의 requirement가 바뀌면, 해당 scope의 W가 detached/transferred pointer를
  갖는지 Work Items에서 확인하고 파생 로그를 점검한다.
- target/child는 parent/source를 매번 해석하지 않아도 재개 가능해야 한다.
- target/child에는 자체 `Work Item Requirements`, `## Parent` pointer, snapshot 단위
  provenance 한 줄을 둔다.
- snapshot은 effective result로 평탄화해서 넘긴다. source에서 `Override`가 걸려 있었더라도
  child에는 dangling Override가 아니라 결과 requirement만 둔다.

예시:

```markdown
## Parent

- Parent log: `logs/source.md`
- Parent Work Item: W2
- Requirement snapshot: parent `{Global}` + `{W2}` on 2026-06-30.

## Work Item Requirements

### {Global}
- owner map을 먼저 확인한다.
- docs/specs/AGENTS.md를 먼저 읽는다.
```

### Kind와 도구/lint 경계

- `Required-read`, `Constraint`, `Validation`, `Return` 같은 kind 분류는 아직 확정하지 않는다.
- 먼저 자연어 requirement bullet로 두고, 반복 패턴이 충분해지면 도입한다.
- lint/script 후보는 구조 신호까지만 다룬다:
  - 신규 W가 어떤 명시 set에도 없을 때의 약신호
  - inert set
  - duplicate Override label
  - dangling Override label
  - dangling detached/transferred pointer
  - `{Global}`과 W-id 혼용
- lint는 의미 판단·삭제·이관을 대신하지 않는다.

### 다음 작업 후보

- 사용자가 승인하면 이 결론을 기준으로 `log/SKILL.md` 초안을 다시 작성하거나,
  실제 `.agents/skills/log/SKILL.md`와 `references/work-items-rules.md`에 반영할 수정안을
  별도로 제안한다.
- 반영 전에는 실제 skill 설치본과 reference 파일을 수정하지 않는다.

## 2026-06-30 · 3자 수렴 — lifecycle frame과 reference 골격

### 수렴 상태

- @user가 @claude와 @codex 의견을 종합해 다음 항목은 3자 합의로 정리했다.
- 이 블록은 실제 `.agents/skills/log/*` 편집 전 reference 골격 결론을 기록한다.
- 앞선 `spine` 용어는 설계 논의용 내부어로만 보고 portable skill의 표면 명사로 쓰지 않는다.

### 확정한 골격

- `spine` 명사는 폐기한다. 기능은 `Enter`의 읽기 계약 목록으로 풀어 쓴다.
  - `## Work Items`
  - `## Work Item Requirements`의 `{Global}`
  - `## Work Item Requirements` 중 대상 W id가 포함된 heading
  - 최신 날짜 블록
  - 이 목록은 출발점이며, 현재 질문·판단·남은 작업 복원에 부족하면 관련 과거 날짜 블록을
    역추적한다.
- 이름 체계는 `Enter / Act / Record / Reconcile / Detach / Closeout` lifecycle frame으로 둔다.
- `Act`는 별도 reference section으로 키우지 않고 SKILL의 한 줄 흐름으로 둔다. log skill은 실제
  작업 수행법을 소유하지 않는다.
- 새 `loops.md`는 만들지 않는다. loop frame은 `SKILL.md`와 기존 reference 재배치로 흡수한다.
- `work-items-rules.md`에 `Work Item Requirements`, `Reconcile`, `Detach/Transfer`를 모은다.
  비대해지더라도 새 파일 분리보다 내부 section 구조로 관리한다.
- `Closeout`은 section명으로 승격하되, 기존 `open` / `decided` / `superseded` status 의미와 hard
  rule은 유지한다.

### reference별 처분

- `SKILL.md`
  - 정체성: History surface / Current surface 두 표면 모델을 짧게 설명한다.
  - 핵심 불변을 소유한다.
  - 작업 루프 `Enter -> Act -> Record -> Reconcile -> Detach -> Closeout`을 둔다.
  - `Enter`에 읽기 계약 4-bullet을 둔다.
  - `Act`는 한 줄로 두고, 나머지 동작은 owner reference로 보낸다.
  - 도구와 유지보수는 짧은 pointer만 둔다.
- `log-writing-rules.md`
  - 파일명 유지.
  - History surface, Record, frontmatter, 로그 선택·생성, 권위 있는 결과 반영, Closeout과 status를
    소유한다.
- `work-items-rules.md`
  - 파일명 유지.
  - Current surface, Work Items marker 6종, `Work Item Requirements`, Reconcile trigger A/B/C,
    Override, Detach/Transfer/child snapshot을 소유한다.
- `work-log-rules.md`
  - router 역할은 `SKILL.md`의 loop frame이 흡수한다.
  - 공통 불변은 `SKILL.md` 핵심 불변으로 흡수해 중복을 제거한다.
  - 이번 범위에서는 script를 다루지 않으므로, 남는 도구 표면 holder로만 잔존한다.
  - 파일명 변경이나 최종 폐기는 script 작업 단계로 미룬다.
- `project-setup.md` / `maintenance.md`
  - keep. 필요하면 미세 갱신만 한다.
- `example.md`
  - 새 marker와 `Work Item Requirements` 모델에 맞춰 rework한다.

### 직접 확인한 사실

- `logs/AGENTS.md`는 기록 품질·상태·종료 owner를 `references/log-writing-rules.md`로,
  Work Items와 pointer·점검 owner를 `references/work-items-rules.md`로 명시한다.
- 같은 확인에서 `work-log-rules.md`에 대한 inbound owner 언급은 발견하지 못했다.

### 반영 전 주의

- 실제 `.agents/skills/log/*` 편집은 사용자 승인 후에만 한다.
- `scripts/log`, onramp, `docs/guides/workflow.md`는 이번 반영 범위 밖이다.
- `[→]`, `[↓]` marker와 script 지원 여부를 혼동하지 않는다. 문서가 수동 규칙을 먼저 소유하고,
  script 표면 변경은 별도 단계에서 판단한다.

## 2026-06-30 · reference 본문 초안 작성 — work-items / log-writing / example 3종

> @user가 작업 분담을 "claude가 3종 전부"로 확정. 3자 수렴 reference 처분에 따라
> `log/`에 초안 3종을 작성했다(설치본 `.agents/skills/log/*`는 미수정, @user 검토 대기).

### 작성한 초안 (모두 `log/`)

- `log/work-items-rules.md` — Current surface owner. Work Items 6 marker, Work Item
  Requirements(정체성=적용 범위 선언·set literal·읽기 계약·Override), Reconcile trigger
  A/B/C+전이, Detach/Transfer/child snapshot, known graph, 점검, lint 경계.
- `log/log-writing-rules.md` — History surface owner. 기록 kernel(보존), frontmatter,
  로그 선택·생성, 권위 반영, `## Closeout` 승격(status open/decided/superseded hard rule 유지).
- `log/example.md` — 신 모델 rework. Work Item Requirements가 cross-step 기준 누락 버그를
  막는 before/after를 헤드라인 예시로, 6 marker·detach `[↓]`+snapshot·새 anti-pattern 포함.

### 반영한 설계 판단 (provenance 명시 — 검토 포인트)

- (사실) marker 6종 `[ ][>][x][-][→][↓]`와 `— cancelled:/transferred:/detached:` inline
  qualifier를 3종에 일관 적용. 종합 결론 블록이 owner.
- (판단) 구 operation별 "기록 최소" 반복 리스트는 narrative라 log-writing-rules로 위임하고
  work-items-rules는 구조 전이만 소유하게 압축 — @user의 "장황" 지적 대응. 두 표면 분리 원리.
- (판단·이의 여지) Work Item 줄 형식을 기존 파싱 가능 관례인 `Wn <행동>`(콜론 없음)으로
  정규화했다. 종합 결론 예시는 `Wn:`(콜론)였으나 이는 예시용 부수 표기로 보고, 설치본·기존
  로그의 `[ ][>][x]` 관례와 script 정합을 우선했다. @user/@codex 이의 가능.

### deferred / cross-owner effect (이번 scope 밖, surface만)

- (사실) `scripts/log items set`은 `cancelled|transferred`만 지원하고 detached·신 marker
  `[-][→][↓]` 파싱은 미지원. 문서가 수동 규칙을 먼저 소유(3자 수렴 결정), script 정합은 별도 단계.
- (사실) 설치본 `maintenance.md`는 `work-log-rules.md`를 router로 참조(line 9·148). SKILL이
  router를 흡수하면 stale 후보가 되나, work-log-rules 최종 처분이 script 단계 소유라 미수정.

### Next

- @user의 3종 초안 검토. 확정되면 `maintenance.md` 절차로 "무엇을/어디를/검증법" 보고 →
  승인 → 설치본 `.agents/skills/log/*` 반영. (work-log-rules·maintenance work-log-rules 참조
  처분은 그때 함께 판단.)

## 2026-06-30 · draft review 반영 — 복귀 대상 용어와 Work Item line canonical

> @user가 `parent/child` 표면 용어보다 "복귀 대상"이 낫다는 방향을 제시했고, `Wn:` 콜론 표기는
> 사용하지 않는 쪽으로 잠그라고 지시했다. Codex가 `log/` 초안 4종에 반영했다. 설치본
> `.agents/skills/log/*`는 미수정.

### 반영한 결정

- `parent/child pointer` 표면 용어를 `복귀 pointer`로 바꿨다.
- child/parent 표면 설명은 `분리 작업 로그` / `복귀 대상 로그` / `복귀 대상 Work Item` 중심으로
  바꿨다.
- child snapshot의 canonical section을 `## Parent`가 아니라 `## 복귀 대상`으로 고정했다.
  - 형식: `Log`, `Work Item`, `Requirement snapshot`.
- 첫 날짜 블록의 `Parent pointer: ...` 중복 표면은 제거했다. 날짜 블록에는 분리 이유와 snapshot
  provenance만 남기는 방향.
- Work Item line canonical은 `- [marker] Wn <행동>`으로 잠갔다. `Wn:`처럼 id 뒤에 colon을
  붙이지 않는다.
- `[↓]` detached는 "해소"가 아니라 분리 작업 로그 완료 후 복귀 대상이 소비해야 하는 pending
  상태로 정리했다.

### Codex 판단

- @claude의 SKILL 리뷰 A-1(detach가 핵심 불변에서 빠짐)은 타당해 `log/SKILL.md` 핵심 불변에
  분리를 포함했다.
- @claude의 A-2(협응 동작을 불변으로 격상)는 이번 개편의 keystone과 맞아 핵심 불변에 반영했다.
- A-3(Detach 단계명이 transfer까지 덮음)은 3자 수렴 lifecycle frame을 유지하는 쪽이 낫다고 보아
  단계명은 바꾸지 않았다.
- B 항목 중 읽기계약/불변 중복 owner 정리는 설치본 반영 전 추가 검토 대상으로 남겼다. 지금 초안
  patch에서는 stale reference 처분까지 확장하지 않았다.

### 검증

- `rg`로 `log/SKILL.md`, `log/work-items-rules.md`, `log/log-writing-rules.md`, `log/example.md`에서
  `parent`, `child`, `Parent`, `Child`, `## Parent`, `Parent pointer`, `Wn:` 잔여를 확인했다.
  남은 `root` 표현은 `example.md`의 anti-pattern 한 줄("root 로그로 직접 복귀시키지 않는다")뿐이다.
- `git status --short .agents/skills/log log ...` 기준 설치본 `.agents/skills/log/*` 변경은 없고,
  초안 `log/`만 untracked 상태다.

### Deferred

- `scripts/log` marker/parsing 정합은 별도 script 단계에서 처리한다.
- 설치본 `maintenance.md`의 `work-log-rules.md` router 참조와 `work-log-rules.md` 최종 처분은
  설치본 반영 단계에서 함께 판단한다.

## 2026-06-30 · Codex review 1 — `log/SKILL.md` 최종 골격

### 검토 범위

- 대상: `log/SKILL.md` 초안.
- 배경 근거: 이 로그의 3자 수렴 블록, draft review 반영 블록, `log/decision.md`.
- 비교 범위: `log/work-items-rules.md`, `log/log-writing-rules.md`, `log/example.md`의 owner 경계와 용어 사용.
- 설치본 `.agents/skills/log/*`는 수정하지 않았다.

### 확인한 사실

- `log/SKILL.md`는 기존 `## 용어` 섹션을 제거했고, History surface / Current surface 두 표면 모델과
  `Enter -> Act -> Record -> Reconcile -> Detach -> Closeout` 루프를 entry에 둔다.
- 핵심 불변은 6개다: open 추측 금지, 의미 판단은 agent/user 소유, history/current surface 분리,
  dependency가 바뀐 Current surface 동시 갱신, owner 문서 권위 경계, 단일 `[>]`와 W-id 보존.
- `Enter` 읽기 계약은 4-bullet(`## Work Items`, `{Global}`, 대상 W heading, 최신 날짜 블록)이며,
  부족하면 관련 과거 날짜 블록을 역추적한다고 쓴다.
- `parent/child` 표면 용어는 `log/SKILL.md`에서 `복귀 pointer`, `분리 작업 로그`, `복귀 대상`으로 대체됐다.
- `work-items-rules.md`가 marker, Work Item Requirements, Reconcile, Detach/Transfer, snapshot을 소유하고,
  `log-writing-rules.md`가 History surface, Record, Closeout/status를 소유한다고 분리되어 있다.

### 판단

- 핵심 불변 6개는 많지 않다. entry가 소유해야 할 경계와 dependency-driven freshness만 남아 있고,
  marker 6종·Override·Detach 세부 규칙은 reference로 내려가 있다.
- `Enter -> Act -> Record -> Reconcile -> Detach -> Closeout` 흐름은 SKILL entry로 충분히 짧다.
  `Act`가 한 줄이고 나머지가 owner reference로 빠져 있어, 이전 `work-log-rules.md` router보다
  entry 역할이 선명하다.
- `복귀 pointer`, `분리 작업 로그`, `복귀 대상`은 portable 표면 용어로 자연스럽다. 특히 `[↓]`의 의미를
  "child"라는 계층명보다 "복귀 대상이 소비해야 하는 pending"으로 드러내므로 현재 모델과 맞다.

### 제안

- 설치본 반영 전까지 `log/SKILL.md` 골격은 이대로 유지한다.
- 단, 최종 반영 시 `references/maintenance.md`가 아직 `work-log-rules.md`를 router로 설명하는 부분은
  stale 후보로 별도 decision에서 처리한다.

## 2026-06-30 · Codex 반영 — `work-items-rules.md` / `log-writing-rules.md` 리뷰 finding

### 반영 범위

- 대상: `log/SKILL.md`, `log/work-items-rules.md`, `log/log-writing-rules.md`, `log/example.md`.
- 설치본 `.agents/skills/log/*`는 수정하지 않았다.
- 사용자 지시: Claude/Codex review finding을 종합해 반영.

### 반영한 결정

- `[>]`는 local actionable Work Item이 있을 때의 재개 지점으로 정리했다. active W를 `[↓]`로
  detach하면 source 로그의 local active 지점이 아니며, source에 다른 local action이 없으면
  detached pointer가 가리키는 분리 작업 로그의 `[>]`를 따른다.
- Reconcile trigger A를 `Work Item 상태 변경`에서 `Work Item line/pointer 변경`으로 넓혔다.
  `[>]` 이동과 pointer target 변경을 명시했다.
- transferred W는 이관 뒤 source requirement 변경을 기본 전파하지 않는다고 정리했다. 전파가
  필요하면 이관 시점의 날짜 블록에 계약을 명시해야 한다.
- `log-writing-rules.md`의 기록 블록 규칙에 Record→Reconcile cross-pointer를 추가했다. 여러
  Work Item에 standing하는 결정·제약은 날짜 블록에만 남기지 않고 `## Work Item Requirements`에
  함께 올린다.
- `log-writing-rules.md`의 `Superseded` 절은 status gate만 소유하도록 압축하고, marker 전이 예시
  Case 1/2/3은 제거했다. Work Item 전이 구조는 `work-items-rules.md`가 소유한다.

### 검증

- `rg`로 `[>]` 단일성 표현, `detached/transferred`, `source requirement`, `Superseded` 예시 잔여를
  점검했다.
- `log/example.md`의 `[>]` 설명과 복귀 대상 재배선 예시도 새 conditional `[>]` 의미에 맞췄다.
- `git status --short` 기준 `log/` 초안 4종은 untracked 상태이고, 이 토론 로그만 tracked 수정
  상태다.

## 2026-07-01 · 다음 세션 재개 신호 — `log/log-writing-rules.md` 리뷰

### 사용자 지시

- 다음 세션에서 Codex가 `log/log-writing-rules.md`에 대한 검토 및 리뷰를 하도록 하고 싶다고
  지정했다.

### 재개 범위

- 우선 대상: `log/log-writing-rules.md`.
- 비교 범위: `log/SKILL.md`, `log/work-items-rules.md`, `log/example.md`, 이 토론 로그의 최신
  반영 블록.
- 중점 후보: History surface owner 경계, Record→Reconcile cross-pointer, Closeout/status gate,
  Superseded 압축 후 충분성, local actionable `[>]` 표현과 sibling 정합.

### 주의

- 이전 제안상 다음 리뷰 후보는 `log/example.md`였지만, 최신 사용자 지시가
  `log/log-writing-rules.md` 리뷰를 우선한다.
- 파일 수정 없이 리뷰 결과만 보고할지, finding을 바로 반영할지는 다음 세션의 사용자 요청에 따른다.

## 2026-07-01 · Codex 반영 — `log/log-writing-rules.md` 리뷰 finding

### 사용자 지시

- `logs/2026-06-28-log-skill-package-log-and-long-log-split-discussion.md` 마지막 블록의 재개 신호에
  따라 `log/log-writing-rules.md`를 검토·보고했고, 이후 사용자가 finding 반영을 지시했다.

### 반영 범위

- 대상: `log/log-writing-rules.md`.
- 비교 근거: `log/SKILL.md`, `log/work-items-rules.md`, `log/example.md`, 이 로그의 최신 반영 블록.
- 설치본 `.agents/skills/log/*`는 수정하지 않았다.

### 반영한 결정

- Record→Reconcile cross-pointer를 SKILL trigger와 맞췄다. 날짜 블록 범위를 넘어 standing하거나
  Current surface 의존성을 바꾸는 항목을 `결정, 범위, 조건, 읽어야 할 자료, 검증 기준`으로
  넓혔다.
- Closeout checklist에 `Work Item Requirements`의 inert set과 dangling Override 정리 점검을
  호출했다. 구조 규칙 자체는 계속 `work-items-rules.md`가 소유한다.
- `Superseded` status gate에서 unresolved `[↓]` 복귀 소비 대기가 남지 않아야 함을 명시했다.

### 검증

- `rg`로 `결정, 범위, 조건`, `Current surface 의존성`, `inert set`, `dangling Override`,
  `unresolved [↓]`가 `log/log-writing-rules.md`와 sibling owner 표현에 맞게 들어갔는지 확인했다.
- `git status --short` 기준 `log/` 초안은 여전히 untracked이고, 설치본 `.agents/skills/log/*` 변경은
  없다.

## 2026-07-01 · 다음 세션 재개 신호 — `log/` 초안 구조 다이어트

### 사용자 지시

- 다음 세션에서는 현재 작성된 `log/` 하위 초안 중 `example.md`와 `decision.md`를 제외한 내용을
  대상으로 정리 작업을 하겠다고 지정했다.
- 정리 기준은 `log/decision.md`에 있는 개념 착안이다.

### 재개 범위

- 우선 대상: `log/SKILL.md`, `log/work-items-rules.md`, `log/log-writing-rules.md`.
- 제외: `log/example.md`, `log/decision.md` 자체 편집.
- 비교·착안 근거: `log/decision.md`의 History surface / Current surface, lifecycle loop,
  Record→Reconcile, Detach, Closeout, cleanup co-location, owner 경계 개념.

### 작업 방향

- 불필요한 내용, 반복 설명, 예시성 문구, sibling owner가 이미 소유하는 세부 규칙을 덜어낸다.
- 내용이 절차 나열로 흩어져 있으면 `Enter -> Act -> Record -> Reconcile -> Detach -> Closeout`
  loop 형태로 재배치할 수 있는지 검토한다.
- 빠진 핵심 obligation이 있으면 추가하되, 새 section·field·kind를 늘리기보다 기존 loop와 owner
  경계 안에 흡수한다.
- 각 문서가 소유해야 하는 최소 판단만 남긴다: `SKILL.md`는 entry/router와 핵심 불변,
  `work-items-rules.md`는 Current surface와 Reconcile/Detach, `log-writing-rules.md`는 History
  surface와 Record/Closeout/status.

### 주의

- 다음 세션은 먼저 검토·보고 후 반영 여부를 정한다. 사용자가 바로 반영을 지시하면 scoped patch로
  진행한다.
- 설치본 `.agents/skills/log/*`는 사용자 지시 전 수정하지 않는다.

## 2026-07-01 · Codex 반영 — `cross-log 정합화` 용어 다이어트

### 사용자 지시

- `cross-log 정합화`는 React lifecycle의 cleanup 착안으로 해소되는 부분이므로 빼도 되지 않냐고
  문제 제기했다.
- Gemini 의견과 Codex 의견을 비교한 뒤, 독립 개념은 제거하되 Detach/Closeout의 등록·소비 의무와
  알려진 범위 경계는 살리는 방향을 반영하라고 지시했다.
- `Closeout`이 `cleanup`과 같은 개념이면 `cleanup`으로 쓰고 싶다고 했으나, Codex는 둘을 같은
  개념으로 보지 않았다. `cleanup`은 Reconcile/Detach/Closeout을 발화시키는 상위 규율이고,
  `Closeout`은 로그 수명 종료와 status gate로 판단했다.

### 반영 범위

- 대상: `log/SKILL.md`, `log/work-items-rules.md`, `log/log-writing-rules.md`.
- 제외: `log/example.md`, `log/decision.md`.
- 설치본 `.agents/skills/log/*`는 수정하지 않았다.

### 반영한 결정

- `cross-log 정합화` 용어와 독립 절을 제거했다.
- Detach에는 복귀 pointer 등록·재배선 시 알려진 범위만 처리하고 역검색하지 않는 경계를 inline으로
  흡수했다.
- 분리 작업 로그 완료 후 복귀 pointer 소비는 Closeout에서 발화되는 의무로 남겼다.
- `log-writing-rules.md` Closeout/status 조건은 `known graph` 대신 `알려진 범위`와 `알려진 복귀
  pointer` 표현을 사용하도록 정리했다.
- `Closeout` 명칭은 유지했다. cleanup과 동일 개념이 아니라 cleanup 규율 안의 종료/status 단계로
  보았기 때문이다.

### 검증

- 대상 3개 파일에서 `rg`로 `cross-log`, `정합화`, `known graph`, `known 복귀`, `cleanup`,
  `Cleanup` 잔여 표현을 점검했다.
- 남은 `Closeout` 표현은 의도적으로 유지했다.

## 2026-07-01 · Gemini 리뷰 반영 — Closeout 소비 문구

### 리뷰 결과

- Gemini는 `cross-log 정합화` 독립 개념 제거, 알려진 범위 경계 보존, Detach 등록/Closeout 소비
  pair, `Closeout` 명칭 유지, owner 경계가 모두 타당하다고 리뷰했다.
- 단, `log/work-items-rules.md`의 "분리 작업 로그가 끝나면 Closeout에서..." 문구는 Closeout 이전에
  별도 종료가 있는 것처럼 읽힐 수 있다고 지적했다.

### 반영

- `log/work-items-rules.md`에서 해당 문장을 "분리 작업 로그를 Closeout할 때 알려진 복귀 pointer를
  소비한다"로 바꿨다.
- Gemini가 선택 사항으로 언급한 `#### 복귀 소비` 소절 분리는 적용하지 않았다. 등록/소비 pair를
  같은 Detach 절 안에 두는 현재 응집도를 유지했다.

## 2026-07-01 · 다음 세션 재개 신호 — `work-items-rules` / `log-writing-rules` 구조 다이어트 계속

### 사용자 지시

- 다음 세션에서도 `log/work-items-rules.md`와 `log/log-writing-rules.md`를 대상으로, 이번
  `cross-log 정합화` 정리처럼 `log/decision.md`의 개념에 빗대어 구조 다이어트를 이어가고 싶다고
  했다.

### 재개 범위

- 우선 대상: `log/work-items-rules.md`, `log/log-writing-rules.md`.
- 비교·착안 근거: `log/decision.md`의 History surface / Current surface, lifecycle loop,
  Record→Reconcile, Detach, Closeout, cleanup co-location, owner 경계 개념.
- 제외: `log/example.md`, `log/decision.md` 자체 편집. `log/SKILL.md`는 sibling 정합 확인 대상으로만
  보고, 사용자가 별도 지시하지 않으면 직접 편집 범위에 넣지 않는다.

### 작업 방향

- 먼저 두 파일을 읽고 확인한 사실, 추론, 제안으로 나눠 보고한다.
- 불필요한 내용, 반복 설명, 예시성 문구, sibling owner가 이미 소유하는 세부 규칙을 덜어낼 후보로
  분류한다.
- 절차 나열로 흩어진 내용은 `Enter -> Act -> Record -> Reconcile -> Detach -> Closeout` loop 안에
  흡수할 수 있는지 판단한다.
- 새 section·field·kind를 늘리기보다 기존 loop와 owner 경계 안에서 최소 obligation만 남긴다.
- 특히 `work-items-rules.md`는 Current surface와 Reconcile/Detach, `log-writing-rules.md`는 History
  surface와 Record/Closeout/status만 소유하도록 sibling 중복을 점검한다.

### 주의

- 바로 수정하지 말고 먼저 검토·보고한다.
- 설치본 `.agents/skills/log/*`는 사용자 지시 전 수정하지 않는다.

## 2026-07-01 · Codex 리뷰 — Gemini 2차 반영 검토

### 사용자 지시

- 사용자는 Gemini가 수정한 `log/loop-rules.md`와 `log/SKILL.md`의 2차 반영 내용을 검토하라고
  지시했다.
- `log/decision.md`는 착안 원리이며 실제 반영 문서가 아니고, `log/log-writing-rules.md`와
  `log/work-items-rules.md`는 초안 history일 뿐이라고 명시했다.

### 확인한 사실

- `log/loop-rules.md`는 `Loop Map`, `Log File Shape`, `Work Surface`, `Date Blocks`, `Record`,
  `Reconcile`, `Detach / Transfer`, `Closeout / Status`, `Audit`, `Lint Boundary` heading을 가진다.
- `log/SKILL.md`의 phase는 `Enter`, `Act`, `Record`, `Reconcile`, `Detach / Transfer`, `Closeout`이고,
  `Record` 이후 phase는 `loop-rules.md` anchor를 가리킨다.
- `Work Surface` 정의는 Work Items marker/pointer, `[>]` next pointer, Work Item Requirements,
  복귀 pointer를 Current surface 구성요소로 명시한다.
- entries가 없는 판단·조사·토론형 로그도 `## Work Items` 섹션은 두되 비울 수 있다는 문장이
  들어갔다.
- `Decided` 조건의 owner 반영 문구는 "프로젝트 integration/owner 절차가 요구하는 반영·검증이
  처리됐거나 남은 Work Item으로 남았다"로 바뀌었다.

### 판단

- Loop Map은 phase와 detailed section 대응을 대체로 복원하지만, 표 안의 Detailed rule이
  markdown link가 아니라 plain text라 "anchor pair"를 명확히 보여주려면 링크화가 더 낫다.
- Work Surface 구성요소는 이번 finding 범위에서는 빠진 핵심 요소가 없다. 다만 status는 file
  lifecycle frontmatter로 따로 남아 있고 Current surface로 정의하지 않는다는 전제가 필요하다.
- `SKILL.md`는 현재 entry/router로 짧게 유지된다. 세부 규칙은 `loop-rules.md`로 내려가 있다.
- `Decided` 문구는 특정 repo owner 위치를 박지 않는다는 portable 경계는 지키지만, "남은 Work
  Item으로 남았다"가 같은 절의 "미완료 Work Item이 없다" 조건과 충돌해 읽힐 수 있다. 의도는
  local unfinished W를 허용한다는 뜻이 아니라 integration/owner 절차가 추적 가능한 별도 후속으로
  받았다는 뜻이어야 한다.
- `Detach / Transfer`는 이름과 본문 내용이 일치한다. Transfer와 Detach가 모두 같은 절 안에서
  정의되고, 복귀 의무 차이가 분리되어 있다.

### 제안 후보

- `Loop Map`의 Detailed rule 값을 `[#log-file-shape]` 같은 실제 markdown link로 바꾸는 후보.
- `Decided` 조건 2의 "남은 Work Item"을 "이 로그 밖의 owner/integration 후속으로 명시됐다" 또는
  "별도 로그·owner의 추적 항목으로 이관됐다"처럼 local incomplete W 허용으로 오독되지 않게 바꾸는
  후보.
- `log/example.md`는 아직 `log-writing-rules.md`와 `work-items-rules.md`를 owner로 가리키는 문구가
  남아 있어, `loop-rules.md` 중심 초안으로 간다면 별도 정합 patch가 필요하다.

## 2026-07-01 · Codex 리뷰 — Finding 1~3 반영 확인

### 확인한 사실

- `log/loop-rules.md`의 Loop Map은 `Log File Shape`, `Record`, `Reconcile`, `Detach / Transfer`,
  `Closeout / Status`를 markdown anchor link로 가리킨다.
- 같은 파일의 해당 heading은 실제로 존재한다.
- 일반 로그 `Decided` 조건 2와 Work Item entries 없는 판단·조사·토론형 로그 조건 3은
  "처리됐거나, 별도 로그나 owner 추적 항목으로 이관됐다"로 바뀌었다.
- `log/example.md`에서 `log-writing-rules.md`, `work-items-rules.md`, `work-log-rules.md`,
  `references/work-log-rules.md` 문자열은 더 이상 발견되지 않았다.
- `log/example.md`에는 `known graph` 표현이 한 군데 남아 있다.

### 판단

- Decided 조건 2의 새 표현은 의도와 맞다. 현재 로그의 미완료 Work Item을 허용하지 않고, 외부
  추적 항목으로 responsibility가 넘어간 상태를 뜻한다고 읽힌다.
- 조건 4의 "미결 질문과 미완료 Work Item이 없다"와의 직접 논리 충돌은 해소됐다.
- Loop Map anchor link는 실제 섹션명과 대응한다. `Act` 행은 loop-rules 세부 섹션이 없으므로 plain
  text 유지가 적절하다.
- example.md의 old owner 파일명 stale 참조는 해소됐지만, `known graph`는 현재 `loop-rules.md`의
  "알려진 범위" 용어와 맞지 않는 잔여 표현이다.

### 후속 후보

- `log/example.md`의 "현재 known graph에 A가 들어온 경우"를 "현재 알려진 범위에 A가 들어온 경우"
  같은 표현으로 바꾼다.

## 2026-07-01 · Codex 반영 — example.md 잔여 stale 용어 정리

### 사용자 지시

- 직전 리뷰에서 남은 `log/example.md`의 `known graph` 잔여 표현을 반영하고 로그로 남기라고
  지시했다.

### 반영

- `log/example.md`의 "현재 known graph에 A가 들어온 경우"를 "현재 알려진 범위에 A가 들어온 경우"로
  바꿨다.

### 검증

- `rg`로 `log/example.md`, `log/loop-rules.md`, `log/SKILL.md`에서 `log-writing-rules`,
  `work-items-rules`, `work-log-rules`, `references/work-log-rules`, `known graph` 잔여가 없는지
  확인했다. 매칭 없음.

## 2026-07-01 · 다음 세션 재개 신호 — Work Items 없는 토론형 로그의 standing requirement 표면

### 사용자 판단

- 현재 토론에서 "처음 세션에 말한 scope/source 역할 지정은 어디에 작성되는가"를 검토했다.
- Codex는 그런 지시가 단순 과거 발언이 아니라 미래 세션이 따라야 하는 standing scope rule이므로
  날짜 블록에만 묻지 말고 Current surface로 승격해야 한다고 판단했다.
- 사용자는 Work Items 없이 진행되는 토론형 로그에서도 이런 standing rule 표면이 필요하다고
  판단했다.
- 동시에 Work Items가 없는 로그에 `Work Item Requirements`를 만들면 헷갈린다고 보았다.
- 이 문제는 지금 반영하지 않고 다음 세션에서 다룬다.

### 다음 세션 프롬프트

```text
현재 log skill의 전면 개선을 이어간다.

먼저 읽을 것:
- logs/2026-06-28-log-skill-package-log-and-long-log-split-discussion.md 최신 블록
- log/SKILL.md
- log/loop-rules.md
- log/example.md
- log/decision.md는 착안 원리로만 읽고, 실제 반영 문서로 취급하지 않는다.

주의:
- log/log-writing-rules.md와 log/work-items-rules.md는 초안 history일 뿐이다.
- 실질 개선·반영 대상은 log/SKILL.md, log/loop-rules.md, log/example.md다.
- 바로 수정하지 말고 먼저 확인한 사실, 추론, 제안을 나눠 보고한다.

검토 질문:
- Work Items가 없는 판단·조사·토론형 로그에서도 미래 세션이 따라야 하는 standing scope/source/read rule을 어디에 둬야 하는가?
- `Work Item Requirements`를 그대로 쓰면 Work Items 없는 로그에서 헷갈리는데, 이를 어떻게 일반화하거나 이름/구조를 조정해야 하는가?
- 후보를 비교하라: (1) `Work Item Requirements`의 `{Global}`을 Work Items 없는 로그에도 허용, (2) 더 일반적인 Current surface section으로 rename, (3) 토론형 로그 전용 최소 surface 추가, (4) 날짜 블록만 유지.
- 각 후보가 SKILL entry/router, loop-rules의 Log File Shape/Enter/Reconcile/Closeout, example.md에 미치는 영향을 본다.
- 새 field/section을 늘리기보다 기존 loop와 Current surface 개념 안에서 해결할 수 있는지 먼저 판단한다.
```

### 재개 기준

- 이 주제의 핵심은 "Work Item이 없는 로그에도 Current surface가 필요한가"와 "`Work Item
  Requirements`라는 이름이 그 경우에도 맞는가"다.
- 다음 세션은 구조 제안과 반영 범위를 먼저 보고하고, 사용자 승인 후 patch한다.

## 2026-07-01 · 반영 — 긴 로그 split guard를 project-setup에 위임 (SKILL 참조 + 임계값 setup 소유)

> @user 확정: 길이 guard soft 600 / hard 1000. portable 규칙에는 숫자를 넣지 않고 setup이 소유.
> @codex·@claude 독립 의견 수렴 후 반영. 설치본 `.agents/skills/log/*`는 미수정, `log/` 초안만 편집.

### 확정한 결정

- 로그 길이는 **분리 검토 신호일 뿐 분리 결정 기준이 아니다**. 분리 결정 기준은 별도 수명·독립
  재개·독립 closeout·결과 소비자 명확성(`SKILL.md`의 Detach가 소유).
- 길이 임계값은 portable 규칙(`SKILL.md`·`loop-rules.md`)에 박지 않는다. 프로젝트 integration이
  둘지 여부와 값을 정하며, setup helper(`project-setup.md`)가 그 질문을 소유한다.
- 이 repo 확정값: **soft 600 = 분리 검토 신호**, **hard 1000 = 분리 또는 미분리 사유 기록**. 둘 다
  자동 분리 아님. (실측 근거: work log 49개 중 절반이 500줄 미만, 실제 분리된 W6=654(다strand),
  단일 수명 로그는 1000~2000까지 무분리.)

### 반영 (log/ 초안, 설치본 미수정)

- `log/SKILL.md` 2곳:
  - `Detach / Transfer` 단계에 분리 결정 기준 + "길이는 검토 신호일 뿐" + 임계값은
    `references/project-setup.md`가 정한다는 위임 문장 추가.
  - `참조` 섹션 project-setup 항목에 "긴 로그 split guard 임계값" 소유 색인.
- `log/project-setup.md` 신규 초안(설치본 `references/project-setup.md` 복사 +
  `## 긴 로그 split guard (선택)` 섹션 추가): setup 질문(둘지/soft·hard 몇 줄), 규칙 의미
  (soft=검토, hard=분리 or 미분리 사유), 자동 분리 아님, 값은 repo-side(root 지침·`logs/AGENTS.md`·
  `log check` metric)로 둔다.

### 이번 scope에서 의도적으로 남긴 것

- `logs/AGENTS.md`에 repo 확정값 600/1000을 아직 반영하지 않음(@user가 project-setup에만 반영
  지시). → project-setup 참조는 setup 질문을 소유하게 됐지만, 이 repo의 확정값을 owner에 박는
  것은 미결.
- `log/loop-rules.md`의 forward/migration 두 모드 + Closeout 복귀 소비 시 Required Context 갱신·
  transfer 절단, `log/example.md`의 migration-detach 예시는 이번 미반영(Q6 합의, 별도 편집 대기).

### Next

- 재개 신호: (1) `logs/AGENTS.md`에 600/1000 확정값을 repo owner로 반영할지, (2) loop-rules/example의
  migration-detach·복귀 소비 편집을 진행할지. 둘 다 @user 지시 대기.

## 2026-07-01 · 정정 반영 — project-setup 라우팅 문구 축소

### 사용자 지적

- `log/SKILL.md` 참조 섹션의 "프로젝트별로 정할 기준이 필요할 때" 문구가 너무 넓어
  `project-setup.md`를 project-specific 기준 전반의 catch-all처럼 보이게 한다고 지적했다.
- Claude가 `log/project-setup.md`에 긴 로그 split guard setup 질문을 반영했다고 하여, 현재 토의와
  맞는지 검토 후 반영을 지시했다.

### 확인

- `log/project-setup.md`에는 `## 긴 로그 split guard (선택)` 섹션이 있고, soft/hard threshold는
  자동 분리 기준이 아니라 검토/사유 기록 기준이라고 적혀 있다.
- `log/SKILL.md`는 기존에 `references/project-setup.md`를 가리켰지만, 현재 `log/` 초안 구조에는
  `log/project-setup.md`가 존재하고 `log/references/`는 없다.

### 반영

- `log/SKILL.md` Detach 설명의 위임 경로를 `references/project-setup.md`에서 `project-setup.md`로
  맞췄다.
- 참조 섹션 문구를 "새 프로젝트에 로그 저장 위치나 workflow가 없거나, 로그 workflow 도입 시 긴
  로그 split guard 임계값을 설정해야 할 때"로 좁혔다.

### 남은 범위

- `logs/AGENTS.md`에 이 repo의 soft 600 / hard 1000 확정값을 박을지는 아직 별도 지시 대기다.
- `log/loop-rules.md`의 migration-detach와 복귀 소비 Required Context 갱신 규칙, `log/example.md`
  예시는 아직 미반영이다.

## 2026-07-01 · repo owner 반영 — logs/AGENTS.md long log split guard

### 사용자 지시

- `logs/AGENTS.md`에도 긴 로그 split guard의 repo 확정값을 작성하라고 지시했다.

### 반영

- `logs/AGENTS.md`의 `Closeout Check` 뒤, workspace reset 전용 섹션 앞에 `Long Log Split Guard`
  섹션을 추가했다.
- 이 repo 기준을 다음처럼 명시했다.
  - soft 600 lines: 로그 분리 필요성 검토
  - hard 1000 lines: 로그를 분리하거나 단일 수명으로 유지하는 이유 기록
- 두 threshold 모두 자동 분리 기준이 아니며, 분리·미분리 판단은 agent와 사용자가 로그 수명과
  소비 관계를 보고 결정한다고 적었다.

### 검증

- `rg`로 `logs/AGENTS.md`, `log/project-setup.md`, `log/SKILL.md`의 split guard 관련 문구를 확인했다.
- `logs/AGENTS.md`에는 repo 확정값 600/1000이 있고, `log/project-setup.md`에는 setup 기본 권장값이
  있으며, `log/SKILL.md`에는 portable 규칙이 임계값을 직접 소유하지 않는다는 경계가 유지된다.

## 2026-07-01 · 반영 — example.md migration detach와 Work Item 없는 Required Context 예시

### 사용자 지시

- `log/example.md`에 넣을 예시가 있는지 물었고, migration detach와 Work Item 없는 토론형 로그의
  `{Global}` 예시를 반영하라고 지시했다.

### 반영

- `log/example.md`의 Detach 예시 뒤에 `Migration detach — 이미 쌓인 상세 기록을 옮기는 예외`
  섹션을 추가했다.
  - 기본은 source history 보존 + 분리 작업 로그 snapshot 시작임을 명시했다.
  - source의 상세 history가 재개 표면을 묻거나 source 수명을 흐릴 때만 migration할 수 있다고
    예외 조건을 적었다.
  - source에는 조용한 삭제·재작성 대신 이동 범위와 target을 남기는 migration ledger 블록을
    append하는 예시를 넣었다.
- Work Item entries가 없는 판단·조사·토론형 로그 예시에 `## Required Context` / `{Global}`을
  추가했다.
  - actionable Work Item은 없지만, 미래 세션이 따라야 할 standing scope rule은 Current surface에
    둔다는 형태를 보여준다.

### 검증

- `rg`로 `log/example.md`의 migration, `Required Context`, Work Item 없는 토론형 로그 예시 위치를
  확인했다.
- `log/example.md`에는 repo-side threshold 숫자 600/1000을 넣지 않았다.

## 2026-07-01 · 분리 — 새 토론 로그로 재개 표면 이동

### 확인한 사실

- 이 로그는 2026-07-01 기준 1,565 lines로, repo hard threshold 1,000 lines를 넘었다.
- Work Items 없는 토론형 로그로 운영돼 왔고, 미완료 Work Item이나 `[>]` next pointer는 없다.
- 최신 블록은 `log/example.md`에 migration detach와 Work Item 없는 토론형 로그의 `{Global}`
  Required Context 예시를 반영하고 `rg` 검증을 남긴 상태다.

### 결정

- 이 로그의 진행 수명은 `logs/2026-07-01-log-skill-overhaul-discussion.md`가 이어받는다.
- 이 로그는 새 로그가 전체 토론 재개 표면을 대체하므로 `superseded`로 닫는다.
- 긴 토론 원문과 이전 결정의 history는 이 파일이 계속 보존하고, 다음 세션의 현재 재개 계약은
  새 로그의 `## Required Context`와 최신 블록이 소유한다.

### 재개

- 이 파일에서 새 작업을 재개하지 않는다.
- 로그 스킬 전면 개편 토론은 `logs/2026-07-01-log-skill-overhaul-discussion.md`에서 이어간다.

## 2026-07-03 · 사용자 정정 — F1 해석과 F2 역참조 반영 기록

### 2026-07-03 15:39 · F1/F2 후속 처리

> 이 entry는 사용자가 지정한 historical record다. 이 로그의 `superseded` 상태나 재개 표면을 되살리지 않는다.

### 사용자 정정

- F1의 미커밋 근거 리스크는 일반 협업 blocker로 취급하지 않는다. 해당 자료는 사용자 개인 자산이며, package log와 log skill 관련 agent들이 참고할 원리다.

### 반영

- F2에 대해서는 기존 06-22 portableization 로그가 새로 만들어진 package 로그를 참조하도록 처리했다.
- `logs/2026-06-22-log-skill-package-workflow-portableization.md`에 W1 scope의 `Required Context`를 추가해, W1을 직접 진행하기 전에 `logs/2026-07-03-log-skill-package-log-model-discussion.md` W1의 관계·처분 판정을 먼저 확인하도록 했다.
- 같은 로그의 기존 블록에도 2026-07-03 entry를 append해, 이 변경이 Work Item marker/status 전환이 아니라 직접 재개 오독을 막는 비파괴 역참조임을 기록했다.
