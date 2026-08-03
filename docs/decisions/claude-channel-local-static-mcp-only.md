# Claude Channel Activation: Local Static MCP As The Sole Path

## Context

aiox의 Claude channel 활성화는 세 경로가 공존했다: D(channel-as-plugin, 원래 기본값 —
[[docs/decisions/claude-channel-plugin-default]]),
legacy A(launcher가 `--mcp-config`로 채널 정의를 매 실행마다 인라인 주입),
Local static MCP(`aiox claude setup --scope <scope>`로 한 번 사전 등록한 뒤
`server:<name>`으로 활성화, W6에서 추가). W6 도중 기본 전략이 D에서 static으로
바뀌었고, D/A는 `AIOX_CLAUDE_CHANNEL_STRATEGY=plugin|inline` dev/debug opt-in으로만
코드에 남아 있었다.

## Decision

Claude channel 활성화는 Local static MCP(`aiox claude setup --scope local|user|project`
사전 등록 + `aiox claude --name <name>`의 `server:<name>` 활성화) 단일 경로만 유지한다.
Plugin(D)·legacy inline(A) 전략, `AIOX_CLAUDE_CHANNEL_STRATEGY` 분기,
`aiox claude-plugin setup` 커맨드, D preflight, spike marketplace
(`spikes/aiox-channel-marketplace/`)를 코드에서 물리적으로 삭제한다.

`--scope user|project`는 지금은 provisioning(등록)까지만 다룬다. `aiox claude` attach의
launch-time gate(`requireClaudeMcpLocalRegistration`)는 등록 scope와 무관하게 항상 Local
scope 항목만 확인·활성화한다. 등록된 user/project 항목을 attach가 선택해 쓰는 기능은 아직
구현되지 않았다.

## Alternatives

- **D를 기본으로 유지**: 기각. marketplace 등록 선행, cwd 고정 계약,
  `claude plugin list --json` 기반 preflight 신뢰 모델 등 운영 복잡도가 static보다 크고,
  이미 static이 기본이 된 뒤로는 D가 사실상 미사용 dev opt-in으로만 남아 유지 비용 대비
  근거가 없다.
- **D/A를 삭제하지 않고 dev/debug opt-in으로 계속 유지**: 기각. pre-v1이고 외부 consumer가
  없는 이 repo에서 불필요한 코드는 유지가 아니라 삭제가 기본이다(root `AGENTS.md` "Legacy
  And Compatibility Code").
- **legacy A만 삭제하고 D는 유지**: 기각. 두 경로 모두 static 도입 이후 실질적으로 미사용이며,
  부분 삭제는 strategy 분기·preflight 신뢰 모델·spike marketplace 유지 비용을 그대로 남긴다.

## Rationale

- **단일 경로가 실패 모드를 줄인다**: D/A/static이 공존하면 `AIOX_CLAUDE_CHANNEL_STRATEGY`
  오설정, D preflight의 cwd 불일치, 실행마다 `--mcp-config`에 실제 토큰이 노출되는 legacy A
  같은 서로 다른 실패 모드를 모두 감당해야 한다. static 단일 경로는 "Local scope에 등록되어
  있는가"라는 한 가지 launch-time 게이트만 검증하면 된다.
- **미사용 코드는 유지가 아니라 삭제가 기본이다**: 이 결정은 root `AGENTS.md`의 legacy/호환
  코드 기본 정책을 Claude channel 활성화 경로에 적용한 것이다.

## Trade-offs

- D가 제공하던 plugin marketplace 격리(`.mcp.json`이 plugin 설치 경로 안에 격리되어 프로젝트
  루트 `.mcp.json`과 충돌하지 않음)를 잃는다. Local static MCP는 scope에 따라
  `~/.claude.json`(local/user) 또는 프로젝트 루트 `.mcp.json`(project)에 직접 등록되므로,
  동일 이름 재등록은 항상 충돌로 실패한다 — overwrite 없음.
- 원 decision의 재검토 조건이었던 "plugin 설치 없이 zero-config로 동작"이라는 목표는 이제
  포기한다: `aiox claude` 실행 전 `aiox claude setup`을 한 번 선행해야 한다.

## Re-evaluation

- Claude CLI가 `claude mcp add-json`의 name 충돌 정책을 바꾸거나(overwrite 허용 등), 이
  static 등록 방식 자체가 deprecated 되는 경우.
- 다중 워크스페이스/다중 scope 동시 운영처럼 이름 하나의 static 등록으로 표현할 수 없는
  요구가 생기는 경우.

## Sources

- `logs/G1/2026-07-29-G1-B-canonical-presentation-corrective.md` W6 — Local static MCP
  scope 구현과 D/legacy A 삭제 경위.
- [[docs/decisions/claude-channel-plugin-default]] — 역사적 기록(현재 architecture
  authority 아님): D를 원래 기본으로 선택했던 이유와 트레이드오프.
- 현재 구현: [[src/cli/invocation.ts]] —
  `src/cli/invocation.ts:148-216` (launch-time 게이트 + 활성화),
  `src/cli/invocation.ts:282-342` (`claudeMcpSetupResult`, `requireClaudeMcpLocalRegistration`);
  [[src/adapters/claude/launcher.ts]] —
  `src/adapters/claude/launcher.ts:58-86` (`launchClaudeStaticMcpChannel`).
