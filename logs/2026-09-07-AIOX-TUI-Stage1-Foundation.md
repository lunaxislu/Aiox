---
topic: AIOX TUI Stage1 Foundation
description: 새 TUI 설계를 domain 패키지 전역 설정 SQLite CLI 기반으로 구현하는 첫 단계
status: open
---

## Work Items

- [>] W1 새 domain 신원·단일 Network·route의 첫 시나리오와 패키지 기반을 작성한다

## Required Context

### Return Target

- None: independent log.

### {Global}

- plans/aiox-tui-product-rebuild.md Stage 1. docs/aiox-tui-product.md와 새 spec·architecture가 Target 권위다. 이전 src/apps/packages/adapters/tests와 실행·빌드 설정은 사용자 승인으로 삭제했다. 새 foundation부터 구현한다. 과거 실험은 참고이며 기존 파일 보존 의무가 없다. Package log/task 기록을 만들지 않는다.


## 2026-09-07 · 구현 진입 인계

Stage 0 설계 문서 재작성과 이전 미착수 계획 정리는 완료됐다. 이 로그는 다음 재개점을 준비한 것이며 Stage 1 코드 구현은 아직 시작하지 않았다.

첫 행동: 새 runtime/host/collaboration spec과 aiox-system architecture의 신원·단일 소속·routing 책임을 읽고 새 workspace/package 기반을 작성한다. domain의 작은 첫 시나리오와 검증을 정한 뒤 구현한다. 전역 설정 형식과 SQLite native 설치·3 OS 경계는 같은 Stage에서 다루며 모든 미래 모델을 선설계하지 않는다.

사용자의 fresh rebuild 확정과 삭제 승인으로 옛 Stage 3 PTY/stream·milestone Web을 포함한 기존 구현은 제거했다. 아래 읽기 리뷰는 삭제 결정 이전의 경위이며 보존 지시가 아니다.

### 2026-09-07 23:31 · 구현 전 legacy 삭제 범위 읽기 리뷰

사용자 요청으로 서브에이전트 3명에게 현재 git 변경의 package/task 기록, server/protocol/test, Web/test 삭제 범위를 나눠 읽기 검토시켰다. 추가 요청인 plans/aiox-web-first-rewrite.md도 확인했다. 이번은 삭제 실행이 아닌 후보 검토이며 제품 코드·테스트·계획·기존 증거 파일은 변경하지 않았다.

검토 제안: G2 controlling+tasks 11개와 Web-first Stage3 controlling+tasks 6개는 옛 운영 지시를 제거할 수 있다. Stage3 미커밋 diff에만 있는 실제 PTY/resize/detach·출력 실측과 jsdom/mock 한계를 최소 요약한 뒤 삭제하는 편이 좋다. 옛 Web-first/G2 plan은 새 계획으로 대체됐고 자체 유일 실측 근거가 없어 함께 삭제 후보다. 연결된 old target snapshot과 inbound도 같은 삭제 단위에서 정리한다. 지금 삭제한 것은 아니다.

Web Open shell 시연 UI, runtime을 종료하지 않는 force 안내, fragment 없으면 aiox open을 요구하는 bootstrap은 새 계약과 충돌한다. PTY raw byte/resize/cleanup, detach와 실행 종료 분리, xterm binary 처리 메커니즘은 새 구조에서도 필요하므로 선택적 재사용 후보다. 현재 caller가 있다는 사실은 유지 의무가 아니라 삭제 시 함께 정리할 범위다.

root 직접 확인: scripts/check-workspace-boundaries.mjs는 이전 apps/server·packages/database·adapters/* 목록을 고정한다. tests/workspace/package-entry-boundaries.test.ts는 domain 등을 export {};로 강제하므로 새 package/domain 구현과 함께 이 scaffold assertion을 제거/교체해야 한다. root package scripts/bin도 src legacy CLI를 실제 실행하므로 git diff의 새 파일만 지우는 것은 legacy 제거가 아니다. 기존 코드의 유지·삭제를 아직 실행하거나 테스트하지 않았다.

### 2026-09-07 23:34 · 사용자 정정 — fresh rebuild 기준의 Git 변경 재검토

사용자가 기존 구현을 점진적으로 보수하는 것이 아니라 새로 만드는 작업임을 다시 명시했다. 앞 리뷰의 저수준 재사용 제안을 현재 파일 보존 의무로 해석하지 않는다. 기존 caller·통과 테스트·구현 비용은 유지의 자동 근거가 아니다. 새 계약을 기준으로 필요한 기능을 새 책임에서 구현하며 과거 코드는 선택적 참고다.

Subagent 3명에게 git tracked diff와 untracked 전체를 다시 분담 검토시켰다. 직접 집계는 122항목(수정38·삭제46·untracked38)이며 이전 production/test/config 변경은 39항목이다. 새 docs/README/새plan/기준선/Stage1 기록과 사용자 research 자료를 이전 구현 산출물과 구분한다. 기존 코드 변경 철회만으로 fresh rebuild가 되지 않는다. HEAD에도 root src CLI와 옛 workspace 구조가 남으므로 실제 구조 제거 범위를 별도로 다뤄야 한다.

이번 요청은 검토이므로 삭제·restore·production/test 변경은 실행하지 않았다. 이 기록은 앞 유지 중심 제안의 정정이며 실제 삭제 처리는 아직 미실행이다.

### 2026-09-07 23:39 · 승인된 기존 구현·계획 정리 완료

사용자의 실행 승인에 따라 미커밋 변경만 HEAD로 되돌리는 대신 기존 production/test/package 골격을 제거했다. src69·apps32·packages23·adapters6·tests89의 tracked219파일과 이전 milestone untracked21파일, 합계240파일을 삭제했다. old tsconfig2·Vitest config·고정 workspace guard4파일과 해당 빌드 산출물도 제거했다. root package의 legacy bin/scripts/dependencies를 제거하고 onramp·test:workflow만 남겼다. workspace glob은 목표 apps/*, packages/*, packages/adapters/*로 바꾸고 lockfile은 pnpm install --lockfile-only --offline --ignore-scripts로 재생성했다. 아직 새 앱/package 구현은 없다.

Subagent가 옛 G2·Web-first Stage0/3 controlling/task, Local Gateway 설계 로그, old plan2개, accepted-target/W6 architecture/source-ledger를 포함한29파일과 빈디렉터리6개를 삭제했다. 이전 Stage1/2 기록과 G2 Kickoff 등의 직접참조5파일은 과거 경위로 정정했다. 새 설계·현재 plan/log·README와 research-idea, architecture.excalidraw, ignored legacy 개인자료 및 독립 spikes 실험은 보존했다. spikes는 제품 빌드/테스트 대상이 아니다.

과거 Codex binding의 두 코드/test 경로는 docs/architecture/aiox-vendor-bindings.md에서 Git commit 8db476bad722717bf82cc598904f3f33af8a90b3의 재현 가능한 git show 참조로 전환했다. README는 실행 가능한 제품이 아직 없음을 명시한다. 신규 package/task 로그나 compatibility fallback은 만들지 않았다.

삭제 전 Stage3 기록에서 선택 보존한 근거(기존 agent 수용 기록이며 이번 재실험 아님): Darwin arm64/Node24.14의 plain-shell PTY/WS 실측이다. 두 Control/Terminal 연결의 observer·writer 전환, resize·detach·Control disconnect 뒤 PTY 생존을 확인했다. 실제111×37 resize/App unmount 뒤 생존은 확인했지만 Fit은 seam으로 실제 브라우저 glyph/layout·FitAddon DOM 검증이 아니다. pressure는 실제 PTY와 deterministic sink의 실험이며 실제 느린 브라우저 성능이나 새 threshold 계약으로 승계하지 않는다.

검증 완료: workflow13개 통과, onramp가 새 plan Stage1/W1 선택, git diff --check 통과, 삭제 roots/legacy entry 부재·새 docs wikilink 실재·Markdown inline-code 검사 통과, lockfile importer는 빈 root만 남음. 제품 구현을 지웠으므로 제품 build/test 성공을 주장하지 않는다. 처음 inline 검증 명령의 괄호 오타는 수정 후 재실행해 통과했다.

다음 행동은 새 domain과 package 기반의 첫 시나리오 구현이다. 이전 파일 복구나 old plan 재개를 선행하지 않는다.

### 2026-09-07 23:40 · 설계 재작성·legacy 제거 커밋 요청

사용자가 정리 결과의 커밋을 요청했다. 새 설계/README/plan/기준선과 현재 로그, 기존 구현·설정·문서 삭제 및 관련 역사 참조 정정을 한 커밋으로 묶는다. 독립 research-idea 미추적4파일과 개인 자산은 포함하지 않는다. 기존에 staged 변경은 없었고 diff whitespace 검사 통과를 확인했다. workflow13개와 문서/진입 정합 검사는 직전 정리 단계에서 통과했으며 제품 구현은 아직 없는 상태다. 커밋 이후 다음 행동은 Stage1 새 기반 구현이다.
