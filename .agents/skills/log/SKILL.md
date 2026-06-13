---
name: log
description: 작업 로그를 생성·검색·기록·점검하거나 기존 로그에서 작업을 재개할 때 사용한다. 예 "로그 남겨줘", "전에 정한 내용 찾아줘", "이 로그 이어서 작업해줘", "열린 로그 점검해줘".
---

# 작업 로그

작업의 질문, 판단, 결정과 진행을 프로젝트의 log 저장 위치에 주제별로 기록한다.
로그는 한 문제나 작업 주제가 끝날 때까지 이어 쓰는 기록이며 현재 문맥과 세션 간
handoff를 본문에서 제공한다.

로그는 작업 과정과 판단 경위를 기록하며, 프로젝트의 권위 있는 결과물이나 장기 규칙
자체를 대신 소유하지 않는다. 프로젝트가 현재 작업 포인터를 제공하면 로그 선택에
사용하고, 이 skill은 특정 작업 관리 구조를 전제하지 않는다.

## 도구와 참조

로그 저장 위치는 프로젝트 진입 계약을 따른다. 위치가 지정되지 않은 경우
[project-setup.md](references/project-setup.md)를 읽는다.

결정적인 파일 조작은 이 skill의 `scripts/log`를 프로젝트 root에서 실행한다.

- `new`: 로그 생성
- `search`: topic·description·본문 검색
- `audit`: 미완료 체크박스 구조 점검. `--resume`은 Resume Pointer의 0·1 불변 점검
- `set-status`: `open`, `decided`, `superseded` 변경
- `append`: 새 날짜 블록을 끝에 추가하고 Resume Pointer를 생성·완료·대체·취소한다

필요한 참조만 읽는다.

- 로그를 생성하거나 본문을 기록할 때
  [recording-contract.md](references/recording-contract.md)를 읽는다.
- 로그 선택·재개·분리·관련 로그 영향 기록·점검·반영·종료 또는 도구 변경을 다룰 때
  [lifecycle.md](references/lifecycle.md)를 읽는다.

## 핵심 원칙

- 이 내용을 빼면 다음 agent가 의도, 판단, 근거, 제약, 현재 상태 또는 남은 일을
  잘못 이해할 가능성이 있는지 판단한다. 상세 기준은 recording-contract.md를 따른다.
- 질문과 답변마다 즉시 기록하지 않는다. 결정·제약 확정, 의미 있는 조사 결과, 작업·검증
  완료, 주제 전환이나 중단처럼 의미 변화가 확정되는 checkpoint에서 관련 내용을 한
  블록으로 증류한다.
- 의미 변화가 기존 Work Items나 Resume Pointer에 영향을 주면 후속 서술만으로
  해소됐다고 간주하지 않는다. 구조 갱신과 도구 한계는 recording-contract.md와
  lifecycle.md를 따른다.
- `open` 상태만으로 현재 작업을 추측하지 않는다.
- 미완료 Work Items나 Resume이 남은 로그를 자동으로 닫지 않는다.
- 기록·완료·취소·분리와 결과 반영 위치의 의미 판단은 agent가 수행한다.
- 한 사례만으로 형식이나 도구를 변경하지 않는다. 변경 판단과 절차는 lifecycle.md의
  `형식과 도구 변경`을 따른다.

## 기본 흐름

1. 사용자가 지정한 기록 범위와 주제를 우선한다.
2. 프로젝트 포인터가 대상을 정하지 않으면 `search "<주제>" --status open`으로 같은
   수명의 로그를 찾는다.
3. 관련 로그가 하나면 Resume Pointer, 최신 기록과 Work Items부터 읽고,
   의도·근거·제약과 현재 행동을 이해할 만큼 앞선 맥락까지 읽는다. 최신 꼬리만으로
   충분하다고 보지 않는다. 여러 후보 중 하나로 정해지지 않으면 후보와 Resume Pointer를
   보고하고 사용자가 선택하게 한다.
4. 기록할 의미 변화가 있으면 기존 로그에 새 블록을 이어 쓴다. 의미 변화가 없으면
   추가하지 않는다. 같은 작업 수명·주제의 로그가 없으면 `new`로 하나를 만든다. 여러
   로그로 나누는 것은 독립적인 수명과 검색 가치가 있을 때뿐이다.
5. 본문은 recording-contract.md의 기준에 따라 필요한 의미만 증류한다.
6. 새 블록은 `append`로 검증 후 원자적으로 반영한다. 사용자가 직접 편집만 요청했거나
   append가 표현할 수 없는 경우에만 일반 편집 절차를 사용한다.

대상이 명확한 append는 바로 한다. 새 로그 생성·여러 로그 분리·대상 불확실은
범위·주제·근거를 짧게 알린 뒤 시행한다(상세는 lifecycle.md).

변경이 다른 open 로그의 미완료 범위를 실제로 부분 수행했으면 그 로그도 정합화한다.
이것은 lifecycle.md의 `관련 로그 영향 기록` 계약이다. 후보는 그 섹션의 저비용
탐색 순서로 좁히고 모든 open 로그를 일괄 탐색하지 않는다. 매 append마다 탐색하지
않고, 다른 로그의 상태에도 영향을 줄 수 있는 checkpoint(owner 문서·코드·테스트를
실제 변경했을 때, Resume 완료·대체, 작업 전환, 종료 전)에서만 확인한다.

## Append

```sh
<skill-dir>/scripts/log append <파일> "<블록 주제>" [옵션]
```

블록 본문은 stdin으로 제공한다. script는 본문 의미를 판단하지 않는다.

append는 반영 전에 입력(주제·이유·Resume 행동은 공백 아닌 한 줄, 본문은 비어 있지
않음), 대상 구조(유효한 open 로그 frontmatter, 미완료 Resume 최대 1개), 교체 직전
동시 수정(원본 byte 비교)을 검증한 뒤 결과를 원자적으로 교체한다. 어느 검증이든
실패하거나 동시 수정이 감지되면 원본을 그대로 둔다. mode 선택과 본문의 의미적
정확성은 호출 전에 agent가 판단하며, append는 미리보기나 2차 작성 단계를 요구하지
않는다.

Work Items는 0개 이상 둘 수 있지만 fenced code 밖의 미완료
`- [ ] Resume: <행동>`은 로그당 최대 하나다. Resume은 본문에 직접 쓰지 않고
`--resume`으로만 생성한다. 미완료 Resume이 여러 개면 append하지 않고
`audit --resume`으로 보고한다.

- 기존 Resume이 없을 때 mode 없이 `--resume "<행동>"`: 최초 Resume을 만든다.
- `--complete-resume`: 기존 Resume을 `[x]`로 닫는다. 이어갈 행동은 선택적으로
  `--resume`으로 잇는다.
- `--replace-resume "<이유>" --resume "<행동>"`: 기존 Resume을 `Cancelled Resume:`
  기록으로 바꾸고 새 행동을 잇는다. `--resume`은 필수다.
- `--cancel-resume "<이유>"`: 기존 Resume을 `Cancelled Resume:` 기록으로 바꾸고 새
  행동은 두지 않는다.
- mode 없이 append: 기존 Resume이 있으면 유지하고 진행 블록만 추가한다.

mode를 고르기 전에 recording-contract.md의 `Work Items와 Resume Pointer`를 읽는다.
결정 변경을 기록하는 `Revised`와 Resume 전이는 서로 대체하지 않으며, mode 선택과
본문 의미 판단은 agent의 책임이다(핵심 원칙).
