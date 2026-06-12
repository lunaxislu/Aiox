---
topic: A2A 통합 spec 검토와 taxonomy 분리 준비
description: 통합 A2A spec의 구조와 계약을 사용자와 검토하고 product, spec, architecture, roadmap, audit 책임 문서로 분리하기 위한 판단과 준비를 기록한다
status: decided
---

## 2026-06-12 · 통합 spec 정리와 작업 기록 전환

@user

- `prd/post-mvp/aiox-a2a-spec.md`는 product, architecture, protocol spec, release roadmap,
  현재 구현과 audit 정보를 한곳에 모아 검토한 뒤 workspace reset taxonomy에 따라 각 책임
  문서로 증류하기 위한 통합 문서다.
- 현재 계약을 사용자가 모두 미리 이해한 최종 불변 선언으로 취급하지 않는다. 실제 구현과
  release 준비 전에는 agent가 관련 계약, 미결 결정, 선택지, 영향과 권고를 설명하고 사용자와
  토론한 뒤 명시적 승인으로 변경할 수 있어야 한다.
- 다음 세션에서는 이번 세션에서 변경한 내용과 의미를 먼저 설명받은 뒤 후속 검토를 이어간다.

@codex

- spec 서문에 현재 권위와 변경 가능성, agent의 무단 변경 금지, 구현 전 설명·승인 의무를
  반영했다. taxonomy 분리 시 product/spec/architecture/roadmap/dated evidence가 소유할
  내용과 변경 통제 원칙을 보존하도록 명시했다.
- §11 G4는 현재 WSL2 검증을 공개 전 gate로 유지하되, release 준비 또는 관련 구현 착수 시
  사용자와 다시 검토하며 명시적 승인 없이는 생략하지 않도록 했다.
- spec 상단에 읽기 지도, G0~G6 한 줄 범례와 실제 실행 순서
  `G0 -> G1/G3 -> G2 -> G5/G6 -> G4`를 추가했다. 초기 Phase/Tier 전방 참조에는 정의 절
  pointer를 보강했고 삭제된 §14의 목차 흔적을 제거했다.
- `docs/guides/workflow.md` 상단에 책임 문서 변경 통제와 중요한 구현 전 사용자 협의 원칙을
  추가했다. 조사·질의응답 로그가 미래 구현 요구를 책임 문서에 남기고 수명을 마친 경우,
  구현 완료를 주장하지 않고 owner와 수행 시점을 명시한 뒤 닫을 수 있다는 로그 종료 범위도
  명확히 했다.
- `logs/2026-06-11-aiox-제품-방향-질의응답.md`와
  `logs/2026-06-11-A2A-spec-구현-가능성과-제품성-조사.md`의 미완료 행동을 완료·취소·이관으로
  정리하고 `decided`로 닫았다. G0/G1 구현과 active-turn `turn/steer` 검증은 완료된 것이
  아니며 spec §9·§11이 미래 요구사항으로 소유한다.
- 검증: 두 decided 로그의 `scripts/log audit` 미완료 항목 0, `git diff --check` 통과.

- [x] 다음: 이번 세션에서 변경한 spec 읽기 구조, 변경 통제 원칙, G4 재검토 조건과 두 로그
      종료 방식이 각각 무엇을 의미하는지 사용자에게 먼저 설명하고 검토받는다.

## 2026-06-12 · 통합 spec 검토 종료

@user

- `docs/guides/workflow.md`의 중복은 workspace taxonomy 전환 전 의도적으로 둔 것이므로 이번
  검토에서는 수정하지 않는다.
- protocol lifecycle과 Compose precedence에 관한 agent 의견은 현재 계약을 즉시 바꾸는 결정이
  아니라, 실제 구현 착수 시 다시 파악하고 사용자와 논의할 검토 메모로 spec 해당 절에 남긴다.
- G4는 WSL2 공개 전 검증이 현재 필수지만 release 준비 시 사용자와 재검토해 변경할 수 있다는
  의미로 이해했으며, 그 의도와 현재 문구가 일치하므로 유지한다.
- 이번 세션에서 A2A 통합 spec 검토 작업을 마무리한다. 다음 세션에는 별도 open 로그인 작업
  로그 시스템 구축으로 전환하며, 이를 현재 로그의 후속 작업으로 두지 않는다.

@codex

- §4 하단에 새 thread/reply envelope 예시, ID uniqueness scope, Tier 3 unconfirmed retention,
  reply-before-ack 저장 모델을 G1 착수 시 재검토할 implementation review notes로 추가했다.
- §6 하단에 instruction precedence가 책임상 원칙이며 runtime별 기술 계약은 Compose 착수 시
  검증·승인한다는 implementation review note를 추가했다.
- G4 문구와 `docs/guides/workflow.md`는 변경하지 않았다.
