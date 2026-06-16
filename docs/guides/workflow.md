# 작업 Workflow

이 문서는 권위 계약이 아니라, 이 repo에서 사람과 agent가 실제 작업(기능 구현, 버그
수정, spec 구현, 문서 정리 등)을 어떻게 진행하는지 이해하기 위한 비권위 guide다.
실제 권위는 다음이 소유하며, 이 문서는 그것을 다시 정의하지 않고 전체 흐름과 repo
사례를 연결해 설명한다.

- 진입과 재개 순서, plan과 로그의 관계: `AGENTS.md`
- plan 작성 형식, 단계 문법, 유효성과 유지: `plans/AGENTS.md`
- 문서 taxonomy, 영역별 owner와 충돌 해결: `docs/architecture/documentation-system.md`
- 로그 생성·작성, Work Items, pointer, 상태 의미와 종료 조건: log skill
  (`.agents/skills/log/SKILL.md`와 `references/`)
- 구조 검색·append·상태 guard 보조 도구: log skill의 `.agents/skills/log/scripts/log`
- 로그를 닫을 때의 owner 반영과 repo 전용 점검: `logs/AGENTS.md`

세부 규칙이 필요하면 해당 owner 문서를 읽는다. 가설을 조용히 계약으로 승격하거나
구현 편의를 위해 계약을 임의로 바꾸지 않는다.

## 일반 작업 흐름

작업의 종류와 무관하게 흐름은 같다.

1. **진입·재개** — 세션 시작 시 현재 작업을 정한다(아래 "세션 시작과 재개"). 작업
   전 현재 할 일과 읽을 범위를 짧게 보고한다.
2. **작업 수행** — 작은 작업은 로그 하나의 Work Items와 next pointer로, 큰 작업은 plan과 단계
   로그로 진행한다. 진행 중 의도·판단·근거·제약·결정·남은 일을 로그에 증류한다.
3. **owner 문서 반영** — 확정되어 계속 유효할 결론은 책임 owner 문서나 code·tests에
   반영한다. 무엇이 어느 owner인지는 `documentation-system.md`가 정한다. 승인 전
   반영 예정 위치를 로그에 권위처럼 적지 않고, 후보를 보고한 뒤 승인받아 반영한다.
4. **종료** — 일반 종료 조건과 상태 전환은 log skill을 따르고, owner 반영 누락 등 repo
   전용 추가 점검은 `logs/AGENTS.md`를 따른다.

작업 종류별 차이는 결론을 반영할 owner 문서뿐이다.

- **기능 구현** — 현재 동작의 fact owner는 code와 tests다. 여러 module에 걸친
  invariant나 외부에서 관찰되는 동작만 specs·architecture로 승격한다.
- **버그 수정** — 재현·원인·수정은 로그와 code·tests에 둔다. 반복되는 footgun이면
  architecture에 기록한다.
- **spec 구현** — spec은 무엇을 만들지에 대한 권위다. 구현 중 확정·변경된 외부
  계약은 `docs/specs/`에 반영한다. spec의 절 순서와 구현 순서는 같을 필요가 없다.
- **문서 정리(workspace reset)** — 문서의 책임·권위·수명을 정해 owner 문서로
  통합한다. 큰 작업이므로 plan과 단계 로그로 진행한다.

## 세션 시작과 재개

Claude와 Codex의 `SessionStart`는 같은 `scripts/onramp`를 호출한다. onramp는 단일
활성 plan의 단계 로그에서 시작해 next pointer가 가리키는 open 로그를 따라가고,
체인의 마지막 로그 하나를 현재 작업 로그로 보여준다. 포인터 체인, 최신 블록 제목과
next pointer만 요약하며 로그 본문의 의미를 재구성하지 않는다. 활성 plan이 없을 때 open
로그가 하나면 그 로그를 선택한다. open 로그가 여러 개면 next pointer 참조 그래프에서 다른
open 로그가 실제로 가리키고 자신은 더 이상 다른 로그를 가리키지 않는 leaf가 정확히
하나일 때만 그 로그를 선택한다. 복수 후보·복수 leaf·복수 활성 단계·깨진 포인터·
순환은 자동 판단하지 않고 후보나 경고를 출력한다. 이 출력은 현재 작업의 권위가 아니다.

현재 작업을 정하고 재개하는 순서는 `AGENTS.md`가 소유한다. 요약하면 사용자 지정(주제만
지정하면 `description` 검색) → 활성 plan 단계 anchor와 next pointer 체인 → 활성 plan이 없으면
단일 open 로그 또는 next pointer 참조 그래프의 유일한 leaf 순으로 대상 로그를 정하고, 선택한
로그 본문의 최신 기록·Work Items·next pointer에서 현재 단계와 재개 지점을 확인한다.
여러 후보 중 하나로 정해지지 않으면 추측하지 않고 사용자에게 묻는다. 작업 전 현재 할
일과 읽을 범위를 짧게 보고한다.

`description`은 현재 단계나 첫 행동이 아니라, 로그를 열기 전에 관련 로그인지
판별하는 검색 index다.

## 작은 작업

로그 하나의 Work Items와 next pointer로 작업 범위와 재개 지점을 알 수 있으면 plan을
만들지 않는다. W-id Work Items, `[>]` next pointer와 분리 절차는 log skill을 따른다.

## 다른 로그로 작업 전환

현재 작업을 다른 로그의 선행 작업으로 전환할 때는, 새 로그에 행동을 기록하는 것만으로
현재 작업 포인터가 바뀌지 않는다. plan 단계가 작업을 소유하면 plan 단계 pointer를,
parent 로그의 Work Item에서 child 로그가 생겼다면 parent Work Item과 child의 parent
pointer를 함께 맞춰야 다음 세션이 올바른 작업을 재개한다. plan 단계 문법의 권위는
`plans/AGENTS.md`의 Maintenance이고, parent/child pointer 기록 규칙은 log skill이
소유한다.

## 큰 작업과 plan

독립된 큰 단계 여러 개의 순서를 별도로 관리해야 할 때만 얇은 plan을 만든다.

```markdown
# 문서 정리

- [x] 분류 -> `logs/2026-06-09-문서-분류.md`
- [>] 점검 -> `logs/2026-06-10-문서-점검.md`
- [ ] 이동
- [ ] 삭제
```

위 예시는 비권위 요약이다. plan의 template, 단계 문법, 정보 경계와 검증 규칙은
`plans/AGENTS.md`를 따른다.

## 충돌과 예외 흐름

정상 흐름 밖의 상황은 새 권위를 만들지 않고 해당 owner의 규칙을 적용한다.

- **다른 agent의 동시 변경** — 사용자나 다른 agent의 기존 변경을 되돌리거나 덮어쓰지
  않는다(`AGENTS.md`). 충돌하면 보고하고 사용자 판단을 받는다.
- **책임 문서와 code/tests의 drift** — 권위 경쟁이 아니라 intended state와 actual
  state의 차이로 본다. 어느 쪽이 stale한지 확인한 뒤 승인된 intent에 맞게 조정한다
  (`documentation-system.md`의 Conflict Resolution).
- **plan 상태와 실제 검증 결과 불일치** — plan의 완료 표시를 실제 code·tests 결과에
  맞춰 조정한다(`documentation-system.md`).
- **과거 decision과 새 방향 충돌** — 기존 기록을 조용히 덮어쓰지 않는다. 같은 로그의
  결론이 바뀌면 이전 결정, 새 결정과 변경 이유를 남기고, 종료된 결정을 대체하면 이를
  대체하는 decision을 남긴다(log skill의 status와 결정 변경 규칙).
