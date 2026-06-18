# Claude Channel Activation: Plugin Strategy as Default

## Context

aiox MVP에서 Claude CLI에 channel-server를 연결하는 방법이 필요하다. 초기 구현(A
strategy)은 `aiox claude` 실행 시 `--mcp-config` JSON을 Claude CLI 인수에 인라인으로
주입하는 방식이었다. R3(Round 3) 작업에서 Claude plugin 시스템을 통한 대안(D strategy)
이 검토되었고, `history/49·50`에서 D를 primary로, A를 dev/debug-only fallback으로
방향을 정했다. `history/55`에서 plugin 설치 UX(`aiox claude-plugin setup`)가 완성되고
live smoke로 D 활성화 경로가 검증됐다.

## Decision

**`AIOX_CLAUDE_CHANNEL_STRATEGY` 환경변수로 전략을 선택하되, 기본값은 D(plugin) strategy로 한다.**

- unset / `"plugin"` → D: `plugin:aiox-channel-ingress@aiox` plugin이 channel-server를
  활성화한다.
- `"inline"` → A: `--mcp-config` 인라인 주입 (dev/debug 전용 opt-out).
- 그 외 값 → hard error, exit 1 (`invalid_claude_channel_strategy`).
- D 실패 시 A로 자동 fallback하지 않는다 (no-fallback 계약).

## Alternatives

- **A strategy as default (inline --mcp-config)**: 원래 구현. Claude CLI 인수에
  JSON을 동적 주입하므로 Claude 설정 파일(`.mcp.json`)과 무관하게 동작한다. 그러나
  실행 환경(dev/build/npm installed)에 따라 channel-server 진입점 경로를 동적으로
  resolve해야 하는 복잡성이 있고, Claude plugin marketplace 등록 및 설치 UX가 없다.
- **AIOX_SPIKE_STRATEGY_D 토글 유지**: R3 이전 opt-in 방식. 미릴리스 spike 전용이라
  외부 사용자가 없으며 공식 env와 혼재하는 것이 설계상 나쁘다. 완전 제거.
- **D 실패 시 A로 자동 fallback**: silent-drop 경로를 만들어 운영자가 실제 활성화
  경로를 인지하지 못하게 할 위험이 있다. R3 핵심 목표에 반한다.

## Rationale

1. **Plugin 방식이 Claude 생태계 통합 패턴과 일치한다.** `aiox claude-plugin setup`
   으로 사용자 환경에 한 번 설치하면 이후 `aiox claude` 실행마다 자동 활성화된다.
2. **No-fallback 계약이 운영 신뢰성을 높인다.** D preflight 실패는 명확한 에러로
   끝나고, setup으로 고칠 수 있는 코드에만 `AIOX_CLAUDE_CHANNEL_STRATEGY=inline` 힌트를
   붙인다. `channels_disabled`(org 정책) · `missing_env`(토큰 누락)에는 힌트를 붙이지
   않는다 — inline이 해결할 수 없기 때문이다.
3. **A(inline)는 완전히 제거되지 않는다.** dev/debug opt-out으로 유지되어 환경 재현,
   smoke, 진단에 사용할 수 있다. 이 경로는 회귀 테스트로 보장된다.

## Trade-offs

- Claude plugin marketplace 등록과 plugin 설치가 선행되어야 한다
  (`aiox claude-plugin setup` 또는 수동 설치).
- D preflight 실패 시 자동 복구 없음 — 사용자가 setup을 실행해야 한다.

## Re-evaluation

- Claude CLI plugin 시스템의 동작이 변경되어 `plugin:` 활성화 방식이 지원되지 않을 때.
- 배포 환경에서 plugin 설치 없이 zero-config로 동작해야 하는 요구가 생길 때 (A strategy
  재검토 또는 다른 방식).

## Sources

- `history/49` — `--mcp-config` 주입 방식 feasibility 검토 시작
- `history/50` — D strategy 검증 및 전략 결정 (D primary + A dev-only)
- `history/53`~`history/55` — R3 Step 1·2·3a 구현 (plugin CLI adapter, preflight, 설치 UX)
- `history/56` — R3 Step 3b: D default 승격, `AIOX_SPIKE_STRATEGY_D` 제거, no-fallback
  계약, Codex 리뷰 + live smoke 4항목 PASS
- `src/cli/invocation.ts:161–163, 219, 239–249, 482–` — 구현 근거
