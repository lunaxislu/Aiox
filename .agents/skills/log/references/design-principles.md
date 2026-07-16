# 로그 설계 원리

이 문서는 log skill의 현재 구조가 어떤 문제를 풀기 위해 생겼는지와 어떤 개념에서 원리를
빌렸는지만 설명한다.

## 로그의 목적

로그는 대화 덤프가 아니라 세션 간 판단 복원 장치다. 따라서 질문과 답변을 모두 옮기는 것이
목표가 아니다. 다음 세션의 agent가 무엇이 결정됐고, 왜 그렇게 판단했으며, 현재 유효한 상태와
남은 작업이 무엇인지 복원할 수 있을 만큼만 증류한다.

로그가 보존해야 하는 것은 raw conversation이 아니라 판단에 영향을 준 사실, 근거, 제약, 결정,
검증 결과와 남은 행동이다. 단순 진행 발언, 반복 설명, 판단에 쓰지 않은 검색 과정, 이미 다른
owner 문서가 소유하는 결과물은 로그 본문에 누적하지 않는다.

## 착안한 개념

현재 로그 모델은 몇 가지 작업 모델에서 원리를 빌렸다. 이 이름들은 설계 근거를 설명하기 위한
것이며, 실제 로그 section·marker·command 이름은 log skill의 operational terms를 쓴다.

- React lifecycle/effect cleanup: 기록이 끝났다고 작업이 끝난 것이 아니다. 기록한 내용이 재개
  상태, standing context, 복귀 관계 같은 dependency를 바꾸면 cleanup처럼 같은 동작에서 맞춘다.
- Git history, refs and commit workflow: History surface는 commit history처럼 경위와 이유를
  append-only로 보존하고, Work state와 Required Context는 현재 refs처럼 갱신된다. 변경분을 확인한
  뒤 관련된 변경만 한 commit으로 묶듯이, 로그도 같은 unit의 entry·state·context 변경을 함께 묶고
  무관한 변경은 별도 unit이나 별도 로그로 분리한다.
- Coordinated movement: 젓가락을 쓸 때 근육 하나만 움직이지 않듯이, 의미 있는 상태 변화는 Record,
  Reconcile, Cross-Log transition, Closeout 중 필요한 표면들을 함께 움직이게 한다. 모든 표면을
  매번 갱신하는 ceremony가 아니라, 변경된 dependency에 연결된 표면을 같은 동작에서 맞춘다.
