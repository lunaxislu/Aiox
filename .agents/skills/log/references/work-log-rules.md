# 작업 로그 규칙

이 문서는 어떤 작업 로그 reference를 읽을지 정하는 얇은 index다. 실제 규칙은 아래
reference가 소유한다.

## 기본 구조

작업 로그 규칙은 두 축으로 나눈다.

- 로그 작성 축: 로그 생성, 날짜별 기록 블록, 기록 품질, 생략 기준, status 전환.
- 작업 기록 축: Work Items, next pointer, 완료, 취소, 이관, 수정, parent/child pointer,
  cross-log 정합화.

작업 기록 축은 로그 작성 축을 재정의하지 않는다. Work Item을 추가·수정·완료·취소·이관할
때도 이유, 근거, 상태, 남은 일을 로그 작성 규칙에 맞게 기록한다.

## 읽을 파일

- `log-writing-rules.md`: 로그를 생성하거나 기록 블록을 작성할 때, Work Item entries가
  없는 판단·조사·토론형 로그를 정리할 때, `open`, `decided`, `superseded` status를
  판단할 때 읽는다.
- `work-items-rules.md`: Work Items를 추가·수정·완료·취소·이관할 때, `[>]` next pointer를
  바꿀 때, parent/child pointer나 cross-log 관계를 처리할 때 읽는다.
- `maintenance.md`: 이 skill, reference, 도구 동작, 프로젝트 integration과 skill의 경계
  문제를 진단하거나 개선할 때만 읽는다.
- `example.md`: 사용자 검토용 예시 문서다. 필수 운영 규칙으로 읽지 않는다.

## 도구 표면

`scripts/log`가 있는 환경에서는 아래 명령으로 로그를 검색·점검하거나 구조 변경을 원자적으로
수행할 수 있다. 도구는 의미 판단을 대신하지 않으므로, 각 명령을 쓰기 전에 위 reference의 판단
기준을 먼저 적용한다.

- `log new "<주제>" [설명]`: 새 open 로그 뼈대를 만든다.
- `log search [검색어] [--status open|decided|superseded]`: frontmatter 기준으로 로그를 찾는다.
- `log check <파일>...`: agent가 로그 상태를 빠르게 파악하기 위한 read-only 점검이다.
  파일별 frontmatter, 최신 날짜 블록의 줄 위치, Work Items 수, next pointer와 closeout
  구조 신호를 출력한다. 복수 next pointer처럼 구조 불변을 깨는 상태는 오류로 보고한다.
  출력의 줄 위치는 필요한 블록을 targeted Read 하기 위한 힌트이며, 도구는 본문 내용을
  요약하거나 종료 여부를 판단하지 않는다.
- `log check --status open|decided|superseded`: `LOG_DIR` 아래 해당 status 로그를 같은
  방식으로 점검한다.
- `log append <파일> "<주제>"`: stdin을 날짜 블록으로 추가한다. 본문에 직접 next pointer를
  쓰지 않고 Work Items 전이는 `items`를 사용한다.
- `log items <파일> add "<행동>" [--status open|active]`: Work Items 쓰기 primitive다. 다음
  W-id Work Item을 추가한다. 현재 재개 지점으로 만들 때는 `--status active`를 사용한다.
- `log items <파일> set --id Wn --status <상태> [--reason <이유>] [--target <대상>]
  [--expect <행동>]`: Work Items 쓰기 primitive다. 기존 Work Item을 전이한다. 상태는 `open`,
  `active`, `completed`, `cancelled`, `transferred` 중 하나다. `cancelled`는 `--reason`,
  `transferred`는 `--target`과 `--reason`이 필요하다.
- `log set-status <파일> open|decided|superseded`: status를 바꾼다. 미완료 Work Items가
  있으면 `decided`와 `superseded` 전환을 거부한다.

## 공통 불변

- 로그는 작업 과정과 판단 경위를 증류해 다음 agent가 repo만으로 현재 상태와 다음 행동을
  복원하게 하는 기록이다.
- 로그는 프로젝트의 권위 있는 결과물, 장기 규칙, 실제 구현 사실을 대신 소유하지 않는다.
- `open` 상태만으로 현재 작업을 추측하지 않는다.
- 완료, 취소, 이관, 종료 여부는 agent가 본문 맥락과 사용자 의도를 보고 판단한다.
