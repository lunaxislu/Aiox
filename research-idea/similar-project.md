# 유사 프로젝트

- https://github.com/hampsterx/codex-mcp-bridge
- https://github.com/sethdeckard/atria
- https://github.com/howardpen9/tmux-bridge-mcp
- https://github.com/microsoft/agent-host-protocol
- https://github.com/syedazharmbnr1/claude-chatgpt-mcp
- https://github.com/mvschwarz/openrig (https://openrig.dev/)

상세 조사와 AIOX Adapter 정책 시사점은
[`cli-app-runtime-integration.research.md`](./cli-app-runtime-integration.research.md)가 소유한다.
OpenRig 비교는 아래에 둔다.

## OpenRig 비교 (2026-10-09)

근거: openrig.dev 메인, GitHub README(v0.6.8, Apache-2.0),
[cross-harness 블로그](https://openrig.dev/blog/cross-harness-agents). OpenRig 코드는 읽지 않았고
문서 주장만 옮겼다. AIOX 쪽은 `docs/product/product.md`,
`docs/decisions/tui-product-boundary.md`, `docs/architecture/aiox-vendor-bindings.md` 기준이다.

### 확인 사실

| 축 | OpenRig | AIOX |
|---|---|---|
| 정의 | persistent team of coding agents, "Terraform for Coding Agents" | Claude Code·Codex 실제 TUI 실행·연결·관측 로컬 협업 |
| vendor | Claude Code, Codex, Pi/Oh My Pi(RPC) | Claude Code, Codex |
| 실행 기반 | tmux 필수, agent별 tmux session(seat) | daemon 소유 PTY + 외부 CLI 협업 등록 |
| 메시지 전달 | `rig send`/MCP `rig_send` → tmux `load-buffer`+bracketed `paste-buffer` → 200ms 뒤 `send-keys Enter`(코드 확인, 블로그는 send-keys로 설명) | Claude native inbox socket, Codex App Server + Binding Relay |
| 작업 추적 | 메시지와 queue(owner·status) 분리, 메시지가 묻혀도 handoff 유지 | Network·route·send·회신 도구, 별도 work queue 없음 |
| 팀 정의 | YAML RigSpec(pods·members·edges·continuity), AgentSpec, RigBundle(SHA-256), `CULTURE.md` | YAML Host manifest + 전역 설정 |
| 관측 | Claude hooks → `/api/activity/hooks`, typing guard(운영자가 켜는 좌석별 자동 입력 보류 플래그) | hooks로 입력 전송·vendor 수신·턴 종료·MCP 회신 구분 |
| 주 UI | TUI(topology·graph·feed), React Web은 maintenance | React 운영 Web(pane·탭·xterm·브라우저 복귀) |
| 재시작 | `rig down --snapshot`/`rig up`, seat별 resumed·fresh-primed·failed 등 보고 | 브라우저 복귀만, daemon 재시작 후 자동 복원은 범위 밖 |
| 플랫폼 | macOS·Linux, Windows는 WSL2만 | Windows 네이티브·Linux·macOS 목표, WSL 별도 검증 |
| 기존 세션 | `rig discover`/`rig adopt` | 외부 터미널 실행 협업 등록 |
| 스택 | TS, Node 22/24, Hono daemon, better-sqlite3, Vitest | TS, Node 22+, daemon·HTTP MCP, better-sqlite3, Vitest |

### 추론

- `send-keys`는 vendor 확장이 쉽지만 수신 여부를 관측하기 어렵다. typing guard가 필요한 이유로 보인다.
  AIOX는 vendor별 binding 비용과 비공개 규약 의존을 지는 대신 전송·수신·턴 종료를 구분한다.
- OpenRig는 장기 팀 운영(lead·queue·snapshot·템플릿)이 중심이고, AIOX는 vendor 간 중계 제거와
  운영 화면이 중심이다.
- tmux 의존으로 OpenRig는 Windows 네이티브를 포기했다. AIOX의 차별점 후보지만 Stage 8 검증 전이다.

### 의견

- 지킬 축: 관측 가능한 전달 의미, Windows 네이티브, 운영 Web, vendor UX 비침범.
- 검토 후보: 메시지와 work item 분리(collaboration spec 결정 필요).
- typing guard는 코드 확인 결과 키 입력 감지가 아니라 운영자가 켜는 좌석별 플래그였다. Claude 관측·
  세션 만료 비교는 [`openrig-claude-observation.research.md`](./openrig-claude-observation.research.md)가 소유한다.
- 채택하지 않을 것: `send-keys` 전달. `tui-product-boundary` 결정의 관측 원칙과 충돌한다.
