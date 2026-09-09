---
topic: AIOX TUI Stage9 Site
description: 완성된 제품의 공개 다국어 사이트
status: open
---

## Work Items

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 이 로그는 구현 착수·완료 증거가 아닌 단계 인계다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- 제품 완성 뒤 별도 공개 사이트를 만든다. docs/aiox-tui-product.md와 Stage 8 실제 배포·지원 결과를 읽고 소개·설치·사용법·설계 설명을 다국어로 제공한다. 운영 Web과 별도 앱이며 사이트를 위해 운영 Web을 Next.js로 바꾸지 않는다.
- Next.js/next-intl·정적 export는 후보이고 최종 framework/i18n·콘텐츠는 해당 단계에서 논의한다. 실제로 완성된 공통 탭/분할·Host 최초 layout·일반 shell/standalone·플랫폼 경계를 설명하며 미검증 기능을 지원 완료로 홍보하지 않는다. cmux/Paseo는 참고 제품이지 AIOX가 해당 코드를 그대로 채택했다는 근거가 아니다.


## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.
