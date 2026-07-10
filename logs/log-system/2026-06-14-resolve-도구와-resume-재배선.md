---
topic: 로그 resolve 도구와 Resume 체인 재배선
description: 임의·비-직전 체크박스와 Work Item을 안전하게 정리하는 resolve 도구와, 체인 중간 로그 종료 시 부모 Resume 재배선·작업 수명 종료 시점 계약을 설계·검토한다
status: decided
---

## 2026-06-14 · axis-1 체크리스트 resolve 도구

## 2026-06-14 · 설계 출발점과 결정 질문

@user

- cross-log 로그(logs/workspace-reset/product-a2a/2026-06-13-관련-open-로그-부분-작업-기록.md)의 Resume에 따라 axis-1 체크리스트 resolve 도구 설계를 새 로그로 분리해 시작한다. baseline=logs/log-system/2026-06-12-로그-다음-행동-완료-자동화.md(decided), 사례=logs/log-system/2026-06-09-작업-로그-시스템-구축.md(open).

@claude

- 문제(갭): 현재 `append`의 전이 mode(complete/replace/cancel)는 fenced 밖 "마지막 미완료 Resume 하나"만 처리한다. 임의 위치의 섹션형 체크박스와 번호형 Work Item은 구조적으로 해소할 수 없다. 그래서 후속 블록에 완료·취소를 서술로만 적어도 원래 체크박스가 남아 audit과 decided/superseded close guard가 계속 검출한다. 구조 소비자는 후속 서술을 의미적으로 결합하지 않기 때문이다.
- 사례 실태(2026-06-09, open): audit이 미완료 15개를 보고한다. "남은 큰 작업"(181-185)과 "후속 작업 순서"(1115-1122) 섹션 다수는 이번 워크스트림에서 실제 완료·대체됐는데 원래 위치가 갱신되지 않은 stale 항목이고, 진짜 활성은 1259 Resume일 가능성이 크다(완료·취소·이관은 소비 시 agent 판단). 이 로그가 resolve 도구의 1차 적용 대상이자 검증 fixture다.
- baseline 재사용(2026-06-12, decided): 단일 Resume 전이가 이미 부작용 없는 결과 생성(build_result), content snapshot 동시 수정 감지, 같은 디렉터리 atomic rename, 권한 보존, 빈·공백 거부, literal backslash 보존, frontmatter 검증, 회귀 매트릭스를 갖췄다. resolve는 이 안전 경로를 재사용하고 대상 선택만 "마지막 Resume"에서 "명시된 임의 항목"으로 확장한다.

- 설계 원칙(현재까지의 결정 반영):
- 의미 판정 금지: agent가 audit 결과와 후속 기록을 대조해 항목별 complete·cancel·transfer를 정하고, 도구는 정확히 지정된 항목만 검증·변환한다. 후속 블록을 보고 자동 일괄 정리하지 않는다.
- 안전한 대상 식별: audit 줄 번호와 기대 원문을 함께 전달한다. 줄 불일치·원문 불일치·처리 중 동시 수정이면 원본 무변경으로 거부한다.
- 전이: complete는 체크박스를 완료로 표시한다. cancel·transfer는 체크박스를 일반 기록으로 바꿔 미완료에서 빼고 이유·대상 경로를 남긴다(이력 보존).
- 원자성: 여러 항목 일괄 처리는 전부 검증 통과해야 원자 적용한다. 부분 적용 금지.
- 구조 postcondition: 적용 후 지정 항목은 audit에서 사라지고, 변환된 기록에 원문·mode·이유·대상이 남는다.
- 범위: dash와 번호형(`N.`) 체크박스 모두 대상(Work Items 순차 목록 포함). 방금 find_incomplete가 번호형도 잡도록 고쳤으므로 audit과 정합한다.

- 협의가 필요한 설계 결정:
- D1 명령 위치: 기존 `append`에 mode를 더할지, 별도 `resolve` 서브커맨드로 분리할지. append는 "새 블록+재개 포인터" 자동화라 일반 체크리스트 편집과 책임이 다르므로 분리가 깔끔해 보인다.
- D2 입력 형식: 단일 항목 반복(`--line N --expect "<원문>" --mode ...`)인지 여러 항목 배치 입력인지. 원자성을 위해 배치를 한 호출에서 받는 편이 맞을 수 있다.
- D3 변환 형식: cancel은 기존 `취소:` 형식, transfer는 recording-contract의 `Transferred:` 마커(무엇이 어디로 왜)로 정렬한다.
- D4 Resume 경계: resolve가 Resume도 건드릴지, Resume 단일성 불변은 기존 append 전이 전용으로 둘지. 후자가 책임 분리상 안전해 보인다.
- D5 audit 정합: resolve 후 대상이 audit에서 사라지는지 도구가 자체 확인할지, audit 출력에 안정 식별자(줄 번호+원문)를 보강할지.
- D6 테스트 범위: baseline 매트릭스를 임의 줄 complete·cancel·transfer, 번호형, 배치 원자성, 줄·원문 불일치·동시 수정 거부, 구조 postcondition으로 확장한다.

- Cancelled Resume: 설계 결정 D1~D6을 사용자·Codex와 협의해 CLI·전이 형식·Resume 경계·테스트 범위를 확정한 뒤 구현 범위를 보고·승인받는다 — 재배선·종료 시점 문제를 먼저 검토·논의하기로 해 D1~D6 협의를 Work Item으로 내리고 Resume을 재배선/종료 계약 검토로 전환

## 2026-06-14 · 체인 중간 종료 시 Resume 재배선 사례와 의견

@user

- 체인 중간 로그가 decided로 닫히면서 후속 로그를 분리할 때 부모 Resume을 어떻게 잇는지(A open → B open → B decide → C open ⇒ A→C 갱신?)에 대한 사례와 의견을 이 로그에 상세히 기록하도록 요청했다.
- 주제 경계: 이 내용은 axis-1 resolve 도구 구현과는 다른 주제(로그 lifecycle 체인 재배선 계약)다. 사용자 지시로 이 로그에 남기되, 추후 lifecycle에 반영하거나 별도 로그로 분리할 수 있다.

@claude

- 발생 사례(이번 세션 실제):
- 체인은 taxonomy(06-12) → 06-09(작업 로그 시스템) → cross-log(06-13) → resolve(06-14)였다. 06-09가 cross-log를 Resume으로 가리키고, cross-log는 cross-log 계약·정합화·Codex 리뷰 3건을 모두 끝내 decided로 닫는다. resolve는 cross-log에서 갈라져 새로 open된 로그다.
- 처음에 cross-log의 Resume을 resolve로 이어 "resolve 완료 후 cross-log 작업 마무리를 재개한다"고 적었다. 그러나 cross-log엔 Work Items가 없고 마지막 Resume이 곧 'resolve 시작'이었으므로, resolve를 내보낸 뒤 cross-log엔 복귀해서 할 일이 없다. 부모→자식 패턴을 성립 조건 확인 없이 기계적으로 적용한 오류였다.
- 진짜 부모는 06-09다. cross-log 계약이 끝나면 06-09는 자기 '오래된 미완료 항목 정리'(stale 체크박스)로 돌아갈 차례이고, 그 정리에 resolve 도구가 필요하다. resolve 완료 후 06-09로 복귀해 정리한다 — '자식 완료 후 부모 복귀해 할 일 있음'이 성립한다.

- 문제(계약 공백): lifecycle의 「지연 cross-log 정합화」는 'B가 끝나면 A의 기존 Resume을 완료하고 후속 Resume을 갱신한다'까지만 말한다. B가 끝나며 낳은 새 로그 C가 있을 때 A의 후속 Resume이 C를 가리키도록 잇는 사례가 명시돼 있지 않다. 체인 중간 노드가 닫히면 onramp Resume 체인이 거기서 끊기는데(대상이 open이 아니면 경고·중단), 이를 봉합하는 규칙이 비어 있다.

- 내 의견(조건부 재배선):
- 'A → C로 무조건 갱신'은 위험하다. A→C가 정당한 건 'C 완료 후 A로 복귀해 할 일이 있을 때'뿐이다(부모→자식 성립 조건). 이번 cross-log 오연결이 그 조건을 안 따진 실수였다.
- 따라서 규칙은 갱신이 아니라 분기다. A를 재개한 agent가 B를 열어 B가 decided이고 후속 C를 분리했음을 확인했을 때: 케이스 (1) A의 남은 작업이 C에 연결되면(C가 A의 후속을 잇고 C 후 A 복귀해 할 일 있음) A의 단일 Resume을 C로 재배선한다. 케이스 (2) 연결되지 않으면 A는 자기 다음 행동으로 Resume을 갱신하고 C는 B가 낳은 독립 작업으로 둔다. 순환·복수 포인터 금지는 유지한다.
- 이 판단(어느 로그가 부모인지, C가 A를 잇는지)은 의미 판단이라 도구가 자동으로 못 하고 agent가 한다. onramp이 닫힌 노드를 자동 우회하지 않는 것과 같은 분담이다.
- 반영 위치: 새 섹션이 아니라 「지연 cross-log 정합화」의 B-끝남 분기에 한두 문장 확장으로 메운다. 단 lifecycle은 '한 사례로 skill을 바꾸지 않는다'를 두므로, 먼저 현재 사례(cross-log decided + 06-09→resolve 재배선)를 실제로 처리해 onramp 체인이 이어지는지 검증한 뒤, 검증된 절차를 권위 문서 변경 절차(보고→승인→반영)로 lifecycle에 반영한다.

- 이번 처리 결과: cross-log(06-13)의 잘못된 Resume을 cancel하고 decided로 닫았다. 06-09의 Resume을 cross-log에서 이 resolve 로그로 재배선했다(조건부 재배선의 케이스 (1)). 결과 onramp 체인은 taxonomy → 06-09 → resolve가 된다.

## 2026-06-14 · a/b/c 무관 전환 사례와 종료·재배선 문제 검토

@user

- 이 로그를 resolve 도구와 체인 재배선 두 주제로 rename하고 topic·description을 변경하도록 요청했다.
- 더 구체적 사례를 제시했다: a는 로그인 작업 로그다. 작업 중 UI가 이상해 b 로그를 열고 a→b로 걸었다. b를 마무리하려는데 다른 페이지 작업으로 c 로그를 열었다. a·b·c는 서로 연관 없는 별개 로그이고 시간 순서와 사용자 요구로 전환됐다. a 작업 → b 작업 → b 닫음 → a로 돌아가려는데 c가 이상해 c를 열어 작업한 상황에서 a→c로 이어야 할 것 같다고 했다.
- 추가 지적: 원래라면 작업이 끝난 로그는 decide 처리했어야 하는데 open으로 남겨둔 것도 문제다(cross-log를 open으로 끌고 간 것). 이 상황을 로그로 작성하고 무엇이 문제였는지 검토·개선하도록 요청했다.

@claude

- 핵심 구분(두 모델):
- 의존 분리(부모→자식 Resume 체인): B가 A의 하위·전제 작업이고 B 완료 후 A로 복귀해 할 일이 있을 때만 A가 B를 Resume으로 가리킨다.
- 무관 전환·곁가지: A 작업 중 무관한 B/C로 옮긴 경우다. 시간 순서·우선순위로 바뀐 것이지 의존이 아니다.
- 사용자 a/b/c는 무관 전환·곁가지다(명시적으로 서로 연관 없음). 그러면 a→b를 Resume 체인으로 건 것 자체가 의존 분리 메커니즘의 오용이다. a는 b를 가리키는 대신 open으로 잠시 멈추고 b를 독립 로그로 두는 게 맞다. 같은 이유로 a→c도 "무관"이 전제면 부적절하다. a·c는 각자 독립 open이고 현재 작업은 사용자가 고른다(onramp은 무관한 복수 open을 후보로 제시).
- 그럼에도 a→c 직관이 나오는 이유와 진짜 통찰: 사용자는 "메인 작업 a + 현재 활성 곁가지 추적"을 원한다. 즉 onramp이 작업 흐름의 연속성을 자동으로 이어주길 기대한다. 그러나 Resume 체인은 "의존·복귀 구조"를 표현하는 메커니즘이지 "지금 무엇을 하고 있나(현재 활성 작업)"를 추적하는 메커니즘이 아니다. 이 둘을 같은 체인으로 처리하려다 무관한 로그가 가짜 의존으로 엮인다.

- 문제 둘:
- P1 작업 수명 종료 시점 누락: 한 로그의 자체 작업 수명이 끝나면(결정·검증 완료, 남은 일 없음) 즉시 decide해야 한다. "다음에 할 새 작업"을 그 로그의 Resume으로 남겨 open을 연장하면 안 된다. cross-log가 그 실수였다 — cross-log 작업이 끝났는데 'resolve 시작' Resume을 달아 open으로 끌고 갔다. 새 작업(resolve)은 그 로그가 아니라 독립 로그로 시작했어야 한다.
- P2 분리 vs 전환 혼동: 의존이 없는 단순 전환·곁가지에도 부모→자식 Resume 체인을 걸면, 무관한 로그들이 가짜 의존으로 묶여 현재 작업 판정과 종료가 꼬인다.

- 개선 후보(논의·검증 후 lifecycle 반영):
- 분리 기준 명확화: B를 A의 Resume으로 가리키는 건 'B가 A의 하위·전제이고 B 완료 후 A 복귀해 할 일 있음'일 때만. 무관 전환·곁가지는 체인 없이 각자 독립 open + 사용자가 현재 작업 선택.
- 종료 시점 규칙 강화: 작업 수명이 끝나면 다음 작업을 그 로그에 Resume으로 달지 말고 decide로 닫는다. 다음 작업은 독립 로그로.
- 재배선 적용 경계: 앞 블록의 조건부 재배선(A→C)은 '의존 연결' 케이스에서만. 무관 전환은 재배선이 아니라 독립 + 선택.
- (열린 질문) '현재 활성 작업 추적'이 정말 필요하면 Resume 체인이 아닌 별도 신호(사용자 지정·최근 활동)로 분리해야 하는지. onramp·계약의 큰 변경이라 신중히 논의한다.
- (부수 확인) 파일 rename 시 참조 Resume의 경로를 surgical하게 못 고치고 replace로 취소+재작성해야 하는 한계도 이번에 드러났다 — resolve 도구나 별도 경로 갱신 mode 후보다.

- 반영 범위는 lifecycle의 「별도 로그 분리」·「종료와 대체」·「지연 cross-log 정합화」에 걸친다. 한 사례로 바로 문서를 바꾸지 않고, 개선 방향을 사용자와 확정한 뒤 권위 문서 변경 절차로 반영한다.

## Work Items

1. [x] 체인 재배선·작업 수명 종료 시점 계약(P1·P2)을 검토·확정하고 lifecycle에 반영한다.
2. [x] axis-1 resolve 도구 설계 결정 D1~D6을 확정하고 구현한다.

- [x] Resume: 체인 재배선·작업 수명 종료 시점 계약의 개선 방향(P1·P2)을 사용자와 확정한 뒤 lifecycle 반영 위치·문구를 보고한다

## 2026-06-14 · onramp latest_heading 버그 수정

@claude

- 재배선 작업 중 발견한 onramp latest_heading 버그를 수정했다(onramp만 변경, log 도구·데이터 형식 무변경).
- 증상: 본문에 `## Work Items`(비-날짜 H2)를 넣으면 latest_heading이 파일의 마지막 `##`를 잡아 'latest: Work Items'로 최신 블록을 오인했다. 날짜 블록 제목과 구조 섹션 제목이 같은 H2 레벨이고 Work Items가 보통 파일 끝쪽이라, Work Items를 쓰는 로그마다 재발하는 일반 문제다. 작업 로그 선택(Resume 체인)엔 영향 없고 latest 표시만 틀렸다.
- 수정: latest_heading이 날짜 패턴(`## YYYY-MM-DD`로 시작하는) H2만 최신 블록으로 인식하게 한정했다. 비-날짜 섹션 제목은 건너뛴다.
- 회귀 T11 추가: Work Items 섹션으로 끝나는 로그에서 latest가 최신 날짜 블록을 가리키고 Work Items를 오인하지 않는다. onramp 테스트 11건 통과.
- 검증: onramp·test shell 문법, onramp 11/0, 실제 workspace onramp의 latest가 최신 날짜 블록으로 복구됨, git diff --check 통과.

## 2026-06-14 · Cancelled Resume 실패 오해 차단 문구 보강

@user

- Cancelled Resume(옛 `취소:`)을 '작업 실패'로 오해할 여지를, 별도 줄 추가 대신 recording-contract 기존 문맥에 어울리게 해결하도록 지시했다.

@claude

- baseline(06-12) codex 발언 "`취소:`는 행동 자체가 실패했다는 뜻이 아니라 더는 현재 활성 행동으로 유효하지 않아 대체됐다는 뜻"의 명시적 부정이 현재 skill엔 빠져 있어, `cancel`·`취소` 단어만 보면 실패로 오해할 여지가 있었다.
- recording-contract.md의 `Cancelled Resume:` 설명 한 문장에 "그 행동이 실패했다는 뜻이 아니라 … (완료·결정 변경·범위 변경·보류로 대체되거나 해소됐다는)"를 녹여 명시적 부정을 복원했다. 새 줄을 추가하지 않고 기존 문장에 구절을 삽입해 문맥과 일치시켰다.
- script·데이터 형식·명령은 무변경. 검증: git diff --check 통과.

## 2026-06-14 · Resume 체인의 단일 흐름과 병렬 독립 작업 모델 정리

@user

- Resume 체인이 portable하고 여러 프로젝트에 적용 가능한 log skill의 일부라면, 의존 관계 전용으로 제한하기보다 독립 작업 전환도 `a → b → c`로 이을 수 있어야 한다고 설명했다.
- 동시에 `a → b`와 `c`를 독립 open으로 남겨두는 모델은 여러 AI에게 각각 독립적인 일을 맡길 수 있다는 장점이 있다고 지적했다.

@codex

- 현재 skill의 `Resume Pointer` 정의는 이미 "중단 후 다시 시작할 단일 진입점"이며, 06-13 Work Items/Resume 합의도 Resume을 전체 Work Items가 아니라 지금 시작할 첫 행동 하나로 분리했다. 따라서 핵심 정의는 의존 관계가 아니라 routing/flow pointer에 가깝다.
- 다만 lifecycle의 "부모/자식", "then return to this log", "부모로 돌아와" 표현은 Resume을 의존·복귀 관계처럼 읽히게 하므로 portable 계약과 충돌할 수 있다.
- 개선 방향은 Resume 체인 여부를 의존성 자체가 아니라 운영 선택으로 정의하는 것이다. 다음 세션의 재개 흐름을 하나로 유지하려면 독립 작업 전환도 `a → b → c`로 연결할 수 있다. 반대로 병렬 진행, 별도 owner, 여러 AI에게 분배하거나 나중에 선택할 목적이면 새 로그를 Resume 체인에 넣지 않고 독립 open 로그로 둔다.
- 따라서 `a → b → c`는 "현재 재개 흐름의 leaf는 c"를 뜻할 수 있지만, 자동으로 "c가 b/a의 하위 작업" 또는 "c 완료 후 b/a로 복귀해야 함"을 뜻하지 않는다. 복귀 의무나 의존성은 Resume 자체가 아니라 본문·Work Items에 명시된 경우에만 해석한다.
- lifecycle 반영 후보 문구는 다음 방향이다: "새 로그가 독립 작업이어도 현재 재개 흐름을 하나로 유지하려면 Resume으로 연결할 수 있다. 병렬 진행·별도 owner·나중 선택이 목적이면 Resume 체인에 넣지 않고 독립 open 로그로 둔다. Resume 체인 여부는 의존성 자체가 아니라 다음 재개를 단일화할지 후보로 남길지의 운영 선택이다."

## 2026-06-14 · lifecycle 반영 문구의 길이와 품질 판단 기준

@user

- lifecycle 반영 문구는 무조건 줄이는 것이 아니라, 필요한 내용이면 줄이지 않아도 된다고 정정했다.
- 불필요 여부는 문서 품질을 낮추는지, harness의 기준을 애매하게 만드는지, 문서의 작성 순서가 복잡하거나 어색한지, 해당 log skill이 독립적으로 어느 프로젝트에서나 사용 가능한지 등을 기준으로 판단한다.

@codex

- 반영 기준을 "짧게 쓰기"가 아니라 "필요한 의미를 빠뜨리지 않되, 중복·모호성·portable성 저하를 만들지 않기"로 조정한다.
- lifecycle 수정안은 길이를 먼저 줄이기보다 구조/의미 경계가 명확한지, onramp·script 같은 구조 소비자의 기준을 흐리지 않는지, standalone skill로 읽어도 repo 전용 전제를 요구하지 않는지를 기준으로 검토한다.

## 2026-06-14 · lifecycle 계약 반영 완료

@codex

- 사용자 승인 후 `.agents/skills/log/references/lifecycle.md`에 Resume routing/flow pointer 계약과 P1 종료 규칙을 반영했다. SKILL.md와 recording-contract.md는 이미 `Resume Pointer = 단일 재개 진입점` 정의가 맞으므로 건드리지 않았다.
- `별도 로그 분리`: 부모/자식/return 기본 표현을 제거하고, 별도 수명의 작업을 새 로그로 분리한 뒤 다음 재개를 단일화할 때만 현재 로그의 Resume이 새 로그를 가리키도록 정리했다. Resume 연결만으로 의존성, 소유권 이관, 복귀 의무가 생기지 않으며, 그런 의미는 본문이나 Work Items가 소유한다고 명시했다. 병렬 진행·별도 owner·여러 agent 분배·나중 선택 목적이면 독립 open 로그로 둔다.
- `지연 cross-log 정합화`: A가 Resume으로 B를 가리키는 중립 표현으로 바꾸고, B가 닫혔을 때 A의 Resume을 해소한 뒤 현재 흐름이 C로 이어지면 A→C로 재배선, A의 남은 작업이 C와 무관하면 A 자신의 다음 행동으로 갱신, A 수명도 끝났으면 A를 닫는 분기를 추가했다. 재배선이 단순 흐름 정리인지 의존·복귀 범위 변경인지 본문에 기록하도록 했다.
- `종료와 대체`: 로그 자체 작업 수명이 끝났으면 다음 새 작업을 Resume으로 달아 open을 연장하지 않고, Resume을 해소한 뒤 decided로 닫으며 새 작업은 독립 로그로 시작한다는 P1 규칙을 추가했다.
- 검증: `scripts/onramp`가 taxonomy → 06-09 → 이 resolve/재배선 로그 체인을 그대로 찾는 것을 확인했다. `git diff --check -- .agents/skills/log/references/lifecycle.md`와 `bash -n .agents/skills/log/scripts/log scripts/onramp`가 통과했다.

- Cancelled Resume: axis-1 resolve 도구 설계 결정 D1~D6을 확정하고 구현 범위를 보고한다 — D1~D6 확정 전에 Work Items 섹션과 active Resume 배치 계약의 gap을 먼저 검토해야 함

## 2026-06-14 · M2 중복 축약과 log skill maintenance 분리 결정

@user

- Claude가 M2에 대해 Codex 제안 2에 동의했다. lifecycle의 재개 문장은 "명백해도 recording-contract 전이 규칙으로 원래 항목을 갱신해야 한다"로 바꾸는 것이 중복을 줄이면서 guard를 유지한다고 판단했다.
- 점검 섹션은 read-only audit 절차이지 구조 갱신 원칙 재진술이 아니므로 편집 대상에서 제외하는 정정을 수용했다.
- 전체 재구성 후보는 resolve 설계 후 검토하기로 했다: recording-contract의 기록 형식과 구조 전이 규칙 분리 가능성, lifecycle의 선택·재개·분리·cross-log·종료 재배치, structure-transitions.md 같은 새 reference 가능성, SKILL.md의 핵심 workflow pointer 축약.
- 별도 `log skill maintenance` 로그를 만들어 log skill 자체를 self-refactoring하는 기준을 소유하게 하라고 지시했다. onramp은 현재 repo integration이지 skill에 포함된 script가 아니므로, maintenance 기준은 어느 repo에서든 적용 가능한 portable skill 중심으로 작성해야 한다.

@codex

- M2는 lifecycle 재개 한 문장만 바꾸는 작은 편집으로 처리하는 것이 균형점이다. recording-contract는 구조 전이 원칙의 단일 owner로 유지하고, 점검 섹션과 SKILL.md는 이번 범위에서 건드리지 않는다.
- 전체 문서 재구성은 resolve 도구 설계 후 구조 전이 규칙이 실제로 커지는지 확인한 뒤 판단한다. 지금은 maintenance 기준과 후보를 별도 로그에 남기고, current 작업의 다음 Resume은 axis-1 resolve 도구 설계로 유지한다.

## 2026-06-14 · M2 재개 문장 축약 반영

@codex

- Claude의 M2 검토를 수용해 `.agents/skills/log/references/lifecycle.md`의 `재개` 섹션 한 문장만 바꿨다. "후속 서술만으로 해소 간주 금지"라는 별도 부정 guard를 lifecycle에서 반복하지 않고, "완료가 명백해도 recording-contract.md의 전이 규칙으로 원래 항목을 갱신해야 한다"는 의무형 지시로 접었다.
- recording-contract.md는 구조 전이 원칙의 owner로 유지했고, 점검 섹션과 SKILL.md는 이번 범위에서 건드리지 않았다.
- 별도 `logs/log-system/2026-06-14-log-skill-maintenance.md`를 만들어 log skill self-refactoring 기준, repo integration과 portable skill owner 판정, onramp류 current-work integration의 일반화 제약, resolve 이후 전체 재구성 후보를 기록했다.
- 검증: 두 로그의 `audit --resume`은 각각 Resume 하나만 보고했고, `git diff --check`가 통과했다.

## 2026-06-14 · Work Items와 active Resume 배치 불일치 발견

@user

- 현재 로그의 `## Work Items` 아래에는 완료된 예전 Resume이 남고, 새 active Resume은 최신 블록 끝에 따로 생긴 상태를 지적했다.
- 이 문제는 Work Items와 Resume Pointer를 정리하려고 skill에 반영했던 문제와 같은 계열인데, audit이 미완료 Resume 하나만 통과한다고 해서 사람이 보는 현재 범위·재개 지점이 깔끔해진 것은 아니라고 지적했다.
- 다음 세션에서 이 문제를 진행하도록 로그에 남기라고 요청했다.

@codex

- 진단: 현재 append 계약은 `--complete-resume --resume` 시 기존 Resume을 원래 위치에서 `[x]`로 닫고 새 Resume은 새 날짜 블록 끝에 생성한다. 구조적으로는 미완료 Resume 1개 불변과 onramp leaf 선택을 만족하지만, `Work Items` 섹션이 현재 범위와 재개 지점을 함께 보여준다는 사람 기준의 기대와 충돌한다.
- 따라서 이것은 단순 표시 문제가 아니라 `append` 전이 모델, `Work Items` 섹션의 소유권, active Resume의 위치, 완료된 Resume의 보존 방식 사이의 설계 gap이다.
- 이 gap은 axis-1 resolve 도구 설계와 직접 연결된다. 임의 위치 체크박스/Work Item을 안전하게 갱신하려는 목적이 바로 이런 stale·분산 구조를 정리하기 위한 것이므로, D1~D6 확정 전에 먼저 다음을 판정해야 한다.
  - active Resume을 항상 최신 블록 끝에 두는 현재 append 모델을 유지할지.
  - Work Items 섹션이 있는 로그에서는 active Resume을 Work Items 근처/섹션 안에서 관리해야 하는지.
  - 완료된 Resume을 Work Items 아래에 이력으로 남기는 것이 맞는지, 일반 완료 기록으로 변환해야 하는지.
  - 이 처리를 append가 담당할지, 새 resolve 도구가 담당할지, 아니면 별도 정리 mode가 필요한지.
- 다음 세션은 이 배치/소유권 gap을 먼저 검토한 뒤 D1~D6 설계로 들어간다.

- [x] Resume: Work Items 섹션과 active Resume 배치 불일치가 append 전이 모델 문제인지 resolve 도구 범위인지 먼저 판정한 뒤 D1~D6 설계를 진행한다

## 2026-06-14 · Work Items/Resume 배치 gap 판정과 최소 계약 반영

@user · @codex · @claude

- 판정: Work Items와 active Resume 배치 불일치는 append correctness 버그가 아니다. `audit --resume` 미완료 1개 불변과 onramp leaf 선택이 모두 정상이며(onramp이 이 로그를 현재 작업으로 정확히 찾음), active Resume이 최신 블록 끝에 있어 Work Items와 떨어지는 것은 의도된 시간순 append 모델이다.
- 섹션 중복(multiple `## Work Items`)은 전체 로그에서 실제 발생 0건이라(grep 확인) 도구 guard를 추가할 근거가 없다. maintenance decision criteria(막연한 가능성에 guard 금지)를 적용했다.
- 라인 97의 완료 `[x]` Resume 잔여물은 Work Items에 Resume을 섞어 쓴 새 오용이 아니라, 과거 Work Items 블록에서 만든 Resume이 `--complete-resume`으로 닫힌 잔여물이다. 예방 규칙보다 resolve 도구의 안전한 stale 정리가 실질 해법이다.
- 합의(Claude안 채택): 도구 변경 없이 lifecycle·recording-contract에 도구 독립적 최소 계약만 반영하고, 잔여 Resume cleanup·Work Items 전이 표현·audit warning·SKILL.md 강화는 resolve D1~D6 설계 후로 미룬다.

반영(승인 후 수행):
- lifecycle.md `재개`: active Resume이 Work Items와 떨어진 위치에 있어도 정상이며, 현재 작업 범위는 active Resume 하나가 아니라 Work Items 섹션을 함께 기준으로 판단한다는 문장을 추가했다.
- recording-contract.md `Work Items와 Resume Pointer`: 로그당 canonical `## Work Items` 섹션 하나를 유지하고 범위 변경은 기존 섹션 편집으로 한다는 문장을 추가했다. 도구 guard는 추가하지 않았다.
- 보류(resolve D1~D6 이후): 완료 Resume 잔여물 cleanup 규칙, Work Items complete/cancel/transfer 표현, audit warning, multiple Work Items hard guard, SKILL.md 강화.
- 검증: `git diff --check` 통과, `scripts/onramp` 체인(taxonomy 12 → 09 → 이 로그) 유지 확인.

- [x] Resume: axis-1 resolve 도구 설계 결정을 D1부터 확정한다

## 2026-06-14 · axis-1 resolve 도구 D1~D6 확정과 구현 범위

@user · @codex · @claude

axis-1 resolve 도구 설계 D1~D6을 확정했다(Codex 재검토 포함). resolve는 baseline append의 안전 경로(snapshot 동시 수정 감지, 같은 디렉터리 atomic rename, 권한 보존, frontmatter 검증, 결과 재검증, 빈·공백 거부, literal backslash 보존)를 함수로 재사용하고, 차이는 대상 선택(명시 임의 다중 항목)·변환(complete/cancel/transfer)·본문 추가 없음 셋이다.

확정:
- D1 명령 위치: 별도 resolve 서브커맨드. append(본문+Resume 단일 전이)와 책임 분리, 안전 함수만 공유.
- D2 입력: stdin 멀티라인 레코드 배치(원자 트랜잭션). 빈 줄로 레코드 구분, 허용 key=line/expect/mode/reason/target, line·expect·mode 필수, cancel은 reason 필수·target 금지, transfer는 target·reason 필수, complete는 reason·target 금지, unknown·duplicate key·empty·multi-line expect 거부, line 정수만, expect는 첫 콜론으로 key/value split, 같은 line 중복 지정 거부.
- D3 변환(prefix·leading whitespace 보존): dash는 [x]/Cancelled:/Transferred:, 번호형은 N. [x]/N. Cancelled:/N. Transferred:. cancel·transfer는 체크박스를 제거해 audit에서 빠지되 원문은 이력으로 보존. cancel 마커는 Cancelled:(Resume의 Cancelled Resume:과 평행). 번호형 prefix 매칭으로 emit_original_transformed의 dash-only 로직을 확장한다.
- D4 Resume 경계: 미완료 Resume 줄은 resolve 대상에서 거부. Resume 단일성·전이는 append 전용.
- D5 audit 정합: audit 포맷 변경 없음(줄 번호+원문이 안정 식별자). resolve가 적용 전 결과를 재검증해 대상 줄이 find_incomplete에서 빠졌는지(postcondition) 확인하고 아니면 원본 무변경 거부.
- D6 테스트: 아래 매트릭스. dash·번호형 prefix 보존 회귀 포함.

제외: 완료 [x] Resume 잔여물 cleanup은 첫 구현에서 뺀다. complete/cancel/transfer 어디에도 의미가 안 맞아 별도 mode가 필요하고, audit에 잡히는 미완료가 아니라 가독성 cleanup이며, 실제 잔여물은 agent 의미 보존 일반 편집으로 정리 가능하다. 본체 검증 후 재평가.

구현 범위:
- scripts/log에 cmd_resolve 추가, usage·main 라우팅 등록. 재사용: validate_frontmatter, apply_result(snapshot+atomic), find_incomplete(postcondition 검증), fence 로직. 신규: stdin 레코드 파서(D2 규칙), 대상 검증(line·expect 정확 일치, 미완료 체크박스 여부, 미완료 Resume 거부), 다중 줄 변환(prefix·들여쓰기·dash/번호형), 결과 재검증.
- 변환은 전부 검증 통과 시에만 원자 적용, 부분 적용 금지.

테스트 매트릭스:
- 기능: complete/cancel/transfer × dash·번호형, 배치 다항목 전부 적용, leading whitespace 보존.
- 원자성: 한 항목 실패 시 전체 거부·원본 무변경.
- 거부: line 불일치, expect 불일치, 미완료 Resume 지정, unknown·duplicate key, empty·multi-line expect, 비정수 line, cancel reason 누락·target 동반, transfer target/reason 누락, complete reason/target 동반, 같은 line 중복, 처리 중 동시 수정.
- 보존: literal backslash, 파일 권한, frontmatter 무효 거부, 빈 stdin 거부, expect 콜론 포함 시 첫 콜론 split.
- postcondition: 적용 후 대상이 audit에서 사라짐, cancel·transfer 기록에 원문·mode·이유·대상 보존.

- [x] Resume: resolve 서브커맨드(cmd_resolve)와 테스트를 구현한다

## 2026-06-15 · resolve 구현·검증·dogfooding 완료

@claude

- subagent로 cmd_resolve를 구현했다. 변경: scripts/log(+316줄, resolve 서브커맨드와 5개 함수), 신규 test-log-resolve.sh. 로그·다른 사용자 파일 무변경, 커밋 안 함.
- 설계: 신규 parse_resolve_records(D2 파서)·validate_resolve_targets(대상 검증·D4 Resume 거부)·emit_resolved/build_resolve_result(prefix·들여쓰기 보존 변환)·verify_resolved_postcondition(결과 재검증)·cmd_resolve(오케스트레이션). baseline 안전경로(validate_frontmatter, apply_result의 snapshot byte 비교+같은 디렉터리 atomic rename, cp -p 권한 보존, fence 로직)를 재사용했다.
- baseline 대비 의도적 deviation 2건(검토 후 승인): reason·target·expect를 awk -v/ENVIRON 대신 정규화된 줄 단위 spec 파일로 전달해 콜론·탭·멀티레코드·literal backslash를 robust하게 보존한다. emit_original_transformed를 확장하지 않고 emit_resolved를 분리해 append 시그니처·동작을 건드리지 않았다(회귀 보호).
- 검증: bash -n, resolve 테스트 53/0, append 회귀 72/0, git diff --check, dash(/bin/sh) 호환 모두 통과(메인에서 재현 확인).
- dogfooding: 방금 만든 resolve로 이 로그의 번호형 Work Item(줄 95)을 complete 처리했다. audit에서 빠지고 번호 prefix·원문 보존으로 완료 변환됨을 확인했다.
- 제외 유지: 완료된 Resume 잔여물 cleanup은 별도 mode가 필요해 본체 검증 후 재평가한다.

Work Items 1·2를 모두 완료했다. 미완료 Resume은 이 블록으로 닫는다. 남은 작업 수명이 없어 decided 전환과 커밋 여부를 사용자에게 확인한다.

## 2026-06-15 · resolve 사용 예시 보강

@codex

- 사용자 요청으로 resolve 사용법 문서화를 보강했다. SKILL.md에는 `resolve` 서브커맨드의 책임과 의미 판단 경계만 짧게 추가했고, recording-contract.md에는 Work Items 섹션 아래에 line/expect/mode 입력 예시와 변환 결과 예시를 추가했다.
- script usage는 이미 필수 key와 mode별 필수·금지 필드를 설명하므로 중복 예시는 추가하지 않았다.
- 검증: `git diff --check -- .agents/skills/log/SKILL.md .agents/skills/log/references/recording-contract.md`, `bash .agents/skills/log/scripts/test-log-resolve.sh` 53/0, `.agents/skills/log/scripts/test-log-append.sh` 72/0 통과.
