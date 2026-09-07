# AIOX

Claude Code와 Codex의 실제 TUI를 실행·연결·관측하는 로컬 multi-agent 작업 공간입니다.

현재 TUI 제품을 새로 만드는 단계입니다. 이전 production·test·package 골격과 실행 진입점은
제거했습니다. 아직 실행 가능한 AIOX CLI나 운영 Web은 없으며 새 설계의 구현을 시작할 상태입니다.

## 설계와 구현 계획

- [설계 아티팩트](docs/aiox-tui-product.md): 제품·계약·구조를 읽는 시작점.
- [제품 범위](docs/product/product.md): AIOX가 담당하는 사용자 경험과 지원 목표.
- [구현 plan](plans/aiox-tui-product-rebuild.md): 단계 순서와 현재 작업.
- [작업 진입 절차](docs/guides/workflow.md): 현재 단계 확인과 작업 흐름.

새 설계는 실제 vendor TUI, 공통 HTTP MCP, 단일 Network·route, Host·Git Worktree,
전역 설정·SQLite·운영 Web을 사용합니다. 이전 Channel setup·pair·root vendor 명령을
새 사용자 흐름으로 안내하지 않습니다. 정확한 CLI 목표는
[Runtime 계약](docs/specs/aiox-runtime.md)을 참고하세요.

## 개발

현재 작업은 다음 명령으로 확인합니다.

```sh
scripts/onramp
```

`pnpm test:workflow`는 작업 진입 도구만 검사합니다. 제품 build/test 명령과 dependencies는
새 구현을 추가할 때 구성합니다. `spikes/`는 과거 독립 실험이며 제품 빌드나 검증에 포함하지 않습니다.
