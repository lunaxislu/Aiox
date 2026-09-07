# AIOX TUI Product — 설계 아티팩트

Status: Target

대화에서 확정한 제품·계약·구조를 새로 정리한 설계 묶음의 진입점이다.
아래 문서들만으로 구현 방향을 복원할 수 있게 하며, 이전 docs 구조를 수정·확장하는 것을
전제로 하지 않는다. 구현 완료 보고서가 아니다.

## 제품

AIOX는 Claude Code와 Codex의 실제 TUI를 실행·연결·관측하고 하나의 작업 공간에서
협업시키는 로컬 제품이다. Vendor TUI가 모델 선택·슬래시 명령·질문·승인을 담당하고
AIOX는 Host·Network·통신·터미널 배치·설정·알림을 담당한다.

제품 범위는 [[docs/product/product]], 공개 검증 기준은 [[docs/product/roadmap]]이 소유한다.

## 구성

```text
사용자
├─ CLI
└─ React 운영 Web
         │
         ▼
AIOX daemon
├─ Controller / PTY — 실행·종료
├─ Gateway / HTTP MCP — 접속·통신
├─ Network / Message — 신원·route·전달·회신
├─ 설정 / SQLite — 사용자 설정·저장 상태
└─ Vendor bindings
   ├─ Claude TUI — native inbox / hooks
   └─ Codex TUI — App Server / Binding Relay

공개 다국어 사이트 — 실제 제품 완성 이후 별도 제공
```

## 구현자가 읽을 문서

| 문서 | 소유하는 내용 |
| --- | --- |
| [[docs/specs/aiox-runtime]] | 전체 CLI, 실행·종료·조회·Runtime 상태의 외부 의미 |
| [[docs/specs/aiox-collaboration]] | HTTP MCP, 단일 Network·route 기반 통신, replyExpected, 수신·회신 |
| [[docs/specs/aiox-host]] | Host·Worktree, manifest 예시, membership·routing 선언·override |
| [[docs/specs/aiox-configuration-web]] | 전역 설정·포트·저장·자동 브라우저 복귀·알림·운영 UI |
| [[docs/architecture/aiox-system]] | apps/packages·domain 책임, 프로세스 구성과 내부 흐름 |
| [[docs/architecture/aiox-vendor-bindings]] | vendor 실행 주입 코드, inbox·hooks·App Server·Relay와 실측 범위 |
| [[docs/architecture/aiox-storage-terminal]] | SQLite·파일 설정·PTY·화면 연결·플랫폼 구현 경계 |
| [[docs/decisions/tui-product-boundary]] | headless와 이전 Channel/재전송 구조를 채택하지 않은 이유 |

## 기준과 근거

승인된 계약과 제안은 각 문서에서 구분한다. JSON 형식·DB 파일명·기본 포트·정확한 status enum,
메시지 본문 보존 기간처럼 선택되지 않은 세부를 이미 확정된 값으로 사용하지 않는다.

Claude 단일 idle inbox 입력과 Stop 연결, native preview 실험 및 Codex active-thread relay는
기존 실측 근거가 있다. 이 근거를 Windows 전체 연동, 모든 메시지의 정확히 한 번 실행,
도구 작업 성공까지 확인한 것으로 확대하지 않는다.

이전 spec·architecture·decision 본문은 새 target의 권위가 아니다. 이전 실측 로그는 당시
증거를 보존하고, 삭제된 문서 경로가 등장하는 역사적 참조는 Git 이력에서 복원한다.
현재 설계를 이해하기 위해 그 이전 문서들을 다시 읽을 필요는 없다.

## 구현 계획

Stage 순서와 진행 상태는 [TUI 제품 재구축 plan](../plans/aiox-tui-product-rebuild.md)이 소유한다.
새 구조를 기존 코드에 맞추지 않으며, 새 요구에 맞는 PTY·stream 등은 필요한 범위에서 재사용한다.
폐기된 fallback·alias·같은 메시지 재전송은 교체 시 같이 제거한다.

Sources:

- 결정·전달받은 실측·직접 확인 구분: `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md`.
