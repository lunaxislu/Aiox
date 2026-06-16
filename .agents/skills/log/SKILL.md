---
name: log
description: 작업 로그를 생성·작성·기록·검색·점검하거나 기존 로그에서 작업을 재개·수정·완료·취소·이관·종료할 때 사용한다. Work Items, next pointer, parent/child pointer, handoff, cross-log 정합화, 로그 작성, 로그 남기기, 로그 점검, 이전 작업 재개, 로그 스킬 개선, 로그 스킬 문제 진단을 요청하면 사용한다.
---

# 작업 로그

작업의 질문, 판단, 결정과 진행을 프로젝트의 log 저장 위치에 주제별로 기록한다.
로그는 한 문제나 작업 주제가 끝날 때까지 이어 쓰는 기록이며, 현재 문맥과 세션 간
handoff를 로그 본문에서 제공한다.

## 용어

- 로그: 하나의 문제, 질문, 조사, 구현 흐름을 끝날 때까지 이어 쓰는 기록 파일.
- 로그 블록: 로그 파일 안에 날짜 heading으로 추가되는 기록 단위. 토론, 질문과 답,
  근거, 결정, 조사 결과, 작업 수행, 피드백, 상태 변화처럼 다음 agent가 이어받아야 할
  checkpoint를 증류해 남긴다.
- 작업: 로그 안에서 수행해야 하는 구체적인 행동이나 판단 단위.
- Work Item: 작업을 스캔하고 재개하기 위해 구조화한 항목.

## 프로젝트와 작업 로그의 관계

로그는 작업 과정과 판단 경위를 기록한다. 프로젝트의 권위 있는 결과물, 장기 규칙,
실제 구현 사실을 대신 소유하지 않는다.

이 skill은 portable한 로그 작성·재개·종료 규칙을 다룬다. 프로젝트별 로그 workflow는
프로젝트 integration에서 이 skill을 확장해 정의한다.

## 참조

프로젝트 진입 계약은 로그 저장 위치, 세션 시작, 현재 로그 선택을 정하는 프로젝트별
integration 지침(root 지침, AGENTS.md, onramp 등)이다. 로그 저장 위치는 프로젝트 진입
계약을 따르고, 위치가 지정되지 않은 경우 `references/project-setup.md`를 읽는다.

- 로그 작성, 기록 블록, status 전환, Work Items, next pointer, parent/child pointer,
  완료, 취소, 이관, 수정, cross-log 정합화 등 어떤 reference를 읽을지 정해야 하면
  `references/work-log-rules.md`를 읽는다. reference 선택은 `work-log-rules.md`가
  소유한다.
- 사용자가 로그 스킬 개선, 로그 스킬 문제, 로그 workflow 문제, 개발을 말하거나 이
  skill, reference, 도구 동작 변경을 검토할 때는 `references/maintenance.md`를 읽는다.

`references/example.md`는 사용자 검토용 예시 문서다.

## 도구

`scripts/log`는 로그 구조 검색, 날짜 블록 append, Work Items 전이, status guard를 돕는
보조 도구다. 도구는 형식과 원자적 변경을 처리하지만 완료, 취소, 이관, 종료 같은 의미
판단은 agent와 사용자가 한다. 확정된 명령 표면은 `references/work-log-rules.md`가
요약한다.

## 핵심 불변

- `open` 상태만으로 현재 작업을 추측하지 않는다.
- 완료, 취소, 이관, 종료 여부는 agent가 본문 맥락과 사용자 의도를 보고 판단한다.

## 기본 흐름

1. 사용자가 지정한 로그, 주제, 작업 요청을 우선 확인한다.
2. 프로젝트 진입 계약이 로그 저장 위치나 현재 로그를 제공하면 그 범위에서 시작한다.
3. 작업 성격에 맞는 reference를 읽는다. 어떤 reference가 필요한지 애매하면
   `references/work-log-rules.md`를 읽는다.
4. 작업을 수행한 뒤 현재 로그의 Work Items, 알려진 pointer 관계, status 전환 후보를 점검한다.

세부 로그 선택, next pointer 판단, cross-log 점검 절차는 references가 소유한다.
