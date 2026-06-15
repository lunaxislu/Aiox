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
- `audit`: 미완료 Work Items 점검. `--next`는 `[>] Wn` next pointer의 0·1 불변 점검
- `set-status`: `open`, `decided`, `superseded` 변경
- `items add|set`: v2 W-id Work Items 추가와 상태 전이
- `append`: 새 날짜 블록 추가

필요한 참조만 읽는다.

- 로그를 생성하거나 본문을 기록할 때
  [recording-contract.md](references/recording-contract.md)를 읽는다.
- 로그 선택·재개·분리·cross-log 정합화·점검·반영·종료 또는 도구 변경을 다룰 때
  [lifecycle.md](references/lifecycle.md)를 읽는다.

## 핵심 원칙

- 이 내용을 빼면 다음 agent가 의도, 판단, 근거, 제약, 현재 상태 또는 남은 일을
  잘못 이해할 가능성이 있는지 판단한다. 상세 기준은 recording-contract.md를 따른다.
- 질문과 답변마다 즉시 기록하지 않는다. 결정·제약 확정, 의미 있는 조사 결과, 작업·검증
  완료, 주제 전환이나 중단처럼 의미 변화가 확정되는 checkpoint에서 관련 내용을 한
  블록으로 증류한다.
- 의미 변화가 기존 Work Items나 next pointer에 영향을 주면 후속 서술만으로
  해소됐다고 간주하지 않는다. 구조 갱신과 도구 한계는 recording-contract.md와
  lifecycle.md를 따른다.
- `open` 상태만으로 현재 작업을 추측하지 않는다.
- 미완료 Work Items나 next pointer가 남은 로그를 자동으로 닫지 않는다.
- 기록·완료·취소·분리와 결과 반영 위치의 의미 판단은 agent가 수행한다.
- 한 사례만으로 형식이나 도구를 변경하지 않는다. 변경 판단과 절차는 lifecycle.md의
  `형식과 도구 변경`을 따른다.

## 기본 흐름

1. 사용자가 지정한 기록 범위와 주제를 우선한다.
2. 프로젝트 포인터가 대상을 정하지 않으면 `search "<주제>" --status open`으로 같은
   수명의 로그를 찾는다.
3. 관련 로그가 하나면 next pointer, Work Items와 최신 기록부터 읽고,
   의도·근거·제약과 현재 행동을 이해할 만큼 앞선 맥락까지 읽는다. 최신 꼬리만으로
   충분하다고 보지 않는다. 여러 후보 중 하나로 정해지지 않으면 후보와 next pointer를
   보고하고 사용자가 선택하게 한다.
4. 기록할 의미 변화가 있으면 기존 로그에 새 블록을 이어 쓴다. 의미 변화가 없으면
   추가하지 않는다. 같은 작업 수명·주제의 로그가 없으면 `new`로 하나를 만든다. 여러
   로그로 나누는 것은 독립적인 수명과 검색 가치가 있을 때뿐이다.
5. 본문은 recording-contract.md의 기준에 따라 필요한 의미만 증류한다.
6. 새 블록은 `append`로 검증 후 원자적으로 반영한다. 사용자가 직접 편집만 요청했거나
   append가 표현할 수 없는 경우에만 일반 편집 절차를 사용한다.

대상이 명확한 append는 바로 한다. 새 로그 생성·여러 로그 분리·대상 불확실은
범위·주제·근거를 짧게 알린 뒤 시행한다(상세는 lifecycle.md).

현재 문맥에서 이미 경로를 아는 로그만 갱신하고 관련 로그를 능동 탐색하지 않는다. 상세는
lifecycle.md의 `지연 cross-log 정합화`를 따른다.

## Items

```sh
<skill-dir>/scripts/log items <파일> add "<행동>" [--status open|active]
<skill-dir>/scripts/log items <파일> set --id Wn --status open|active|completed|cancelled|transferred [옵션]
```

새 로그와 새 구조의 기본 경로는 W-id Work Items다. 항목은 `- [>] W1 ...`,
`- [ ] W2 ...`, `- [x] W3 ...`처럼 쓴다. `[>]`는 재개 시 먼저 볼 단일 next pointer다.
`items set --status active`는 다른 active 항목을 open으로 내린다. `cancelled`는
`--reason`, `transferred`는 `--target`과 `--reason`이 필요하다. `--expect`는 선택적
안전장치이며 의미 판단을 대신하지 않는다.

Work Items의 full why는 날짜별 기록 블록이 소유한다. Work Item 줄은 스캔용 행동 요약과
상태만 담는다. 항목을 완료·취소·이관할 때는 후속 서술만 남기지 말고 `items set`으로
구조를 전이한다.

## Append

```sh
<skill-dir>/scripts/log append <파일> "<블록 주제>" [옵션] <<'EOF'
<본문>
EOF
```

본문은 stdin으로 직접 제공하며 append만을 위한 외부 임시 파일은 만들지 않는다. script는
본문 의미를 판단하지 않는다. append는 날짜 블록을 원자적으로 추가한다.

next pointer와 Work Item 상태는 append 본문에 직접 쓰지 않고 `items` 명령으로 바꾼다.
