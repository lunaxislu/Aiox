# AIOX

Claude Code와 Codex의 실제 TUI를 실행·연결·관측하는 로컬 multi-agent 작업 공간입니다.

현재 TUI 제품을 새로 만드는 Stage 1입니다. domain·전역 설정·SQLite 저장 라이브러리와 CLI
parser/doctor를 구현했습니다. daemon·vendor 실행·운영 Web은 아직 구현하지 않았습니다.

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

`pnpm check`는 oxlint·oxfmt·tsup 빌드·타입 검사·Vitest 순으로 실행합니다.
패키지 공개 entry가 `dist`를 참조하므로 깨끗한 checkout에서는 빌드가 타입 검사보다 먼저 필요합니다.
`pnpm format`은 현재 앱·패키지와 개발 설정을 포맷합니다. 테스트는 production 파일 옆에 둡니다.
빌드 후 `node apps/cli/dist/main.js doctor --json`으로 로컬 환경을 진단할 수 있습니다.
나머지 명령의 daemon 연결은 후속 단계이며 아직 실행 성공으로 보고하지 않습니다.

GitHub Actions의 [Stage 1 CI](.github/workflows/ci.yml)는 push·PR·수동 실행 시
Windows·Linux·macOS 각각에서 Node 20·22·24로 의존성을 설치하고 같은 검사와 CLI 진단을
실행합니다. pnpm 버전은 루트 `packageManager`를 따릅니다. 이 검사는 현재 foundation
범위이며 아직 vendor TUI·PTY·WSL 통합의 지원을 증명하지 않습니다.

`pnpm test:workflow`는 작업 진입 도구만 검사합니다. `spikes/`는 과거 독립 실험이며 제품
빌드나 검증에 포함하지 않습니다.
