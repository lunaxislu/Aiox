# AIOX Web-first Rewrite

## Objective

AIOX를 기존 CLI·UDS·native terminal 중심 구조에서 React Web UI, 단일 Local Gateway,
server-owned runtime/PTY, Runtime-ID Network routing을 사용하는 Web-first monorepo로 전면
재구축한다. 각 단계는 target contract를 먼저 닫고 vertical slice로 검증한 뒤 다음 단계로
진입하며, 최종 cutover에서는 pre-v1 legacy transport·command·schema compatibility layer를
남기지 않는다.

## Completion condition

- React, CLI와 runtime-scoped MCP bridge가 하나의 Gateway Control WebSocket protocol을 사용하고,
  PTY byte stream은 별도 Terminal Stream WebSocket으로 전달된다.
- Claude와 Codex의 standalone runtime, Host Manifest 기반 N-Agent 실행, Runtime-ID Network
  membership/routing과 MCP bridge가 새 monorepo 경계에서 검증된다.
- Local Server, Controller, Adapter Runtime Binding, PTY Manager, Network와 SQLite의 책임 및
  lifecycle contract가 owner 문서·code·tests에 일치한다.
- 기존 UDS/NDJSON, pair/connect/compose, native terminal/cmux assumptions와 old migration chain이
  제거되고 macOS·Linux·Windows release packaging 검증이 완료된다.
- 각 단계 로그가 완료 증거와 owner handoff를 소유하며 모든 단계가 `[x]` 상태다.

## Stages

- [x] Stage 0 — AgentRuntime·HostRuntime·TerminalSession·Local Server shutdown lifecycle contract와 authority/capability matrix 확정 -> `logs/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts.md`
- [x] Stage 1 — pnpm workspace와 apps/packages/adapters skeleton 및 shared tooling 구축 -> `logs/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation.md`
- [x] Stage 2 — protocol, Local Server bootstrap, React shell과 start/open/status/stop vertical slice -> `logs/2026-09-02-AIOX-Web-first-Stage2-Gateway-Bootstrap.md`
- [>] Stage 3 — TerminalSession, node-pty와 xterm.js plain shell 기술 milestone -> `logs/2026-09-02-AIOX-Web-first-Stage3-Terminal-Milestone.md`
- [ ] Stage 4 — Claude standalone runtime lifecycle, reconnect와 explicit stop product slice
- [ ] Stage 5 — Codex second adapter로 Runtime Binding과 Adapter SDK 수렴
- [ ] Stage 6 — Host Manifest N-Agent materialization, compensating cleanup과 degraded health
- [ ] Stage 7 — Persistent SQLite v1, Runtime-ID Network membership/routing과 MCP bridge
- [ ] Stage 8 — approvals, activity, usage와 operator diagnostics
- [ ] Stage 9 — legacy src/UDS/pair/connect/migrations/tests/docs 제거·교체 및 cross-platform release packaging
