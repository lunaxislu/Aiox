# AIOX TUI Product Rebuild

## Objective

대화에서 확정한 TUI 제품 설계를 [[docs/aiox-tui-product]]와 새 계약·구조 문서를 기준으로
구현한다. Claude native inbox·hooks와 Codex App Server·TUI를 공통 HTTP MCP 및 Network에
연결하고, CLI·Host·Worktree·SQLite·전역 설정·운영 Web을 완성한 뒤 공개 사이트를 만든다.

## Completion condition

- Claude·Codex 실제 TUI가 실행별 MCP·instruction·credential을 주입받아 전송·회신하고,
  수신·응답 종료·회신·실패를 구분해 관측한다. Channel setup과 같은 메시지 재전송 경로는 없다.
- 단일 Network, route 기반 MCP agents_list, standalone 및 Host·Worktree 실행과 전체 강제
  종료가 동작한다. 종료 성공은 실제 관리 실행 자원과 DB 정리 결과로 판정한다.
- 전역 설정 파일 저장이 검증·자동 반영되고 포트만 다음 시작에 적용된다.
  브라우저를 닫아도 실행이 유지되고 재방문 때 별도 사용자 인증 절차 없이 기존 화면으로 복귀한다.
- DB 저장·Runtime 상태·알림·읽음·배치와 Web 취향 저장이 역할에 맞게 동작한다.
  운영 Web은 다국어·Tailwind·shadcn 및 터미널·단축키 설정을 제공한다.
- npm 배포 산출물의 설치와 native dependency·실제 TUI·정리가 Windows 네이티브·Linux·macOS에서
  검증된다. WSL은 실행 환경과 Windows 브라우저 연결을 구분해 확인한다.
- 이전 목표의 코드·fallback·alias와 current 문서가 남아 새 동작을 우회하지 않는다.
  공개 다국어 사이트는 실제 제품 검증 뒤 마지막으로 완성한다.

## Stages

- [x] Stage 0 — 로그 기반 새 설계 아티팩트 확정과 이전 계획 산출물 정리 -> `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md`
- [x] Stage 1 — domain·패키지 경계·전역 설정·SQLite·CLI 기반과 3 OS 설치 경계 -> `logs/2026-09-07-AIOX-TUI-Stage1-Foundation.md`
- [x] Stage 2 — daemon·공통 HTTP MCP·Network/Route·Gateway·PTY 및 최소 Web 연결 -> `logs/2026-09-07-AIOX-TUI-Stage2-Daemon-MCP-Terminal.md`
- [>] Stage 3 — Claude TUI runtime 주입·inbox·hooks·상태·종료 수직 구현 -> `logs/2026-09-09-AIOX-TUI-Stage3-Claude.md`
- [ ] Stage 4 — Codex App Server·TUI·Binding Relay와 두 vendor 메시지 왕복 -> `logs/2026-09-09-AIOX-TUI-Stage4-Codex.md`
- [ ] Stage 5 — 선언형 Host·Worktree·다중 실행 및 CLI 운영·실패 정리 -> `logs/2026-09-09-AIOX-TUI-Stage5-Host.md`
- [ ] Stage 6 — 운영 Web·브라우저 복귀·배치·다국어·전역 설정 편집·키 바인딩 -> `logs/2026-09-09-AIOX-TUI-Stage6-Web.md`
- [ ] Stage 7 — 상태·알림 목록·읽음·포커스 억제·알림음 -> `logs/2026-09-09-AIOX-TUI-Stage7-Notifications.md`
- [ ] Stage 8 — 통합 시나리오·3 OS/WSL 인증·npm 산출물 검증·잔여 legacy 제거 -> `logs/2026-09-09-AIOX-TUI-Stage8-Integration.md`
- [ ] Stage 9 — 실제 제품에 맞는 다국어 공개 AIOX 사이트 -> `logs/2026-09-09-AIOX-TUI-Stage9-Site.md`

## Notes

- 새 설계 아티팩트는 `docs/aiox-tui-product.md`다. 이전 docs·plan·실험은 근거로만 읽고
  새 구조를 제약하는 계약으로 복원하지 않는다. 기록된 제안과 미결을 사용자 확정값으로 바꾸지 않는다.
- Stage 1에서 전체 미래 domain을 선설계하지 않는다. 공통 신원·소속·routing·상태 의미부터
  구현하고 각 시나리오에서 필요한 모델을 추가한다. 설정 JSON 형식은 확정됐으며 DB 기본 경로 연결 등 후속 통합은 해당 단계에서 정한다.
- Stage 2는 두 vendor가 필요로 하는 Network endpoint·credential·MCP와 plain-shell PTY·
  최소 Web 연결을 먼저 마련한다. 완성된 운영 UI를 기다려 vendor 연동을 시작하지 않는다.
- OS 확인은 마지막 Stage 8에만 몰지 않는다. native DB 설치는 Stage 1, PTY·정리는 Stage 2,
  각 vendor의 Windows/WSL 경계는 Stage 3–4에서 다루며 Stage 8은 통합된 배포 산출물을 재검증한다.
- 이전 src/apps/packages/adapters/tests와 legacy 실행·빌드 설정은 재구축 정리에서 제거했다.
  Stage 1에서 새 기반을 작성했다. 과거 실험은 참고 자료이며 파일·API를 유지해야 하는 제약이 아니다.
  Stage 8은 새 구현에 불필요한 fallback·alias가 생겼는지도 확인하는 잔여 감사다.
- Worktree와 상태 UI는 herdr 구현을 참고한다. 경로·브랜치 재사용 규칙과 native 표시는 구현 시
  필요한 범위에서 정하며 이전 실측 성공 사례를 반복 전수 테스트하지 않는다.
- Stage 2 공통 기반·W1 브라우저·W3 보완과 다중 OS CI 검증을 마쳤으며 다음 재개 지점은 Stage 3 일반 로그다.
  사용자 요청으로 후속 단계 로그의 Required Context를 준비했다. 각 단계의 실제 Work Items는 착수 때 구성하며 package/task scaffold를 선생성하지 않는다.
