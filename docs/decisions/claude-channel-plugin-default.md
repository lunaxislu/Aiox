# Claude Channel Activation: Plugin Strategy as Default

## Context
aiox MVP에서 Claude CLI에 channel-server를 연결하는 방법이 필요하다. 초기 구현(A strategy)은 `aiox claude` 실행 시 `--mcp-config` JSON을 Claude CLI 인수에 인라인으로 주입하는 방식이었다. R3(Round 3) 작업에서 Claude plugin 시스템을 통한 대안(D strategy)이 검토되었고, D를 primary로, A를 dev/debug-only fallback으로 방향을 정했다. 이후 plugin 설치 UX(`aiox claude-plugin setup`)가 완성되고 live smoke로 D 활성화 경로가 검증됐다.

## Decision
**`AIOX_CLAUDE_CHANNEL_STRATEGY` 환경변수로 전략을 선택하되, 기본값은 D(plugin) strategy로 한다.**

## Alternatives
- **A strategy as default (inline --mcp-config)**: 원래 구현. Claude CLI 인수에 JSON을 동적 주입하므로 Claude 설정 파일(`.mcp.json`)과 무관하게 동작한다. 그러나 실행 환경(dev/build/npm installed)에 따라 channel-server 진입점 경로를 동적으로 resolve해야 하는 복잡성이 있고, Claude plugin marketplace 등록 및 설치 UX가 없다.
- **AIOX_SPIKE_STRATEGY_D 토글 유지**: R3 이전 opt-in 방식. 미릴리스 spike 전용이라 외부 사용자가 없으며 공식 env와 혼재하는 것이 설계상 나쁘다. 완전 제거.
- **D 실패 시 A로 자동 fallback**: silent-drop 경로를 만들어 운영자가 실제 활성화 경로를 인지하지 못하게 할 위험이 있다. R3 핵심 목표에 반한다.

## Rationale

이 결정의 load-bearing 이유는 기본 활성화 전략과 preflight 신뢰 경계다.
`claude plugin list --json`의 세부 출력 스키마와 preflight 흐름은 구현 및
아키텍처 문서가 소유한다. 이 문서는 그 surface를 복사하지 않고, plugin default와
no-fallback 계약을 선택한 이유만 기록한다.

### 1. preflight를 cwd-resolved `enabled` 신뢰로 단순화한 이유
- **WHY**: Claude CLI는 `plugin list --json`을 실행한 cwd 기준으로 scope precedence를
  이미 해석해 각 entry의 `enabled`에 stamp한다. 따라서 preflight가 scope 플래그를
  raw로 다시 조회하고 `projectRoot` 추출·`isEffective` 교차 논리로 precedence를
  재유도하면, raw per-scope flag를 가정한 잘못된 모델이 되고 불필요한 복잡성을
  더한다. preflight는 cwd-resolved `enabled`만 신뢰하므로 이 재유도 논리를 제거했다.
  외부 CLI가 precedence를 바꾸면 preflight도 자동으로 따라간다.

### 2. cwd 고정 계약이 load-bearing인 이유
- **WHY**: preflight가 inventory를 읽은 cwd와 launch가 spawn하는 cwd가 다르면, 한
  폴더에서 preflight가 통과해도 launch 시 다른(disabled) scope가 해석되어 채널이
  침묵 실패(silent-drop)할 수 있다. preflight가 닫으려는 바로 그 결함이 다시 열린다.
  그래서 plugin launch는 preflight가 inventory를 읽은 cwd에 spawn cwd를 고정한다
  ([[src/cli/invocation.ts]] — `src/cli/invocation.ts:239-249`).

## Trade-offs
- Claude plugin marketplace 등록과 plugin 설치가 선행되어야 한다 (`aiox claude-plugin setup` 또는 수동 설치).
- D preflight 실패 시 자동 복구 없음 — 사용자가 setup을 실행해야 한다.

## Re-evaluation
- Claude CLI plugin 시스템의 동작이 변경되어 `plugin:` 활성화 방식이 지원되지 않을 때.
- 배포 환경에서 plugin 설치 없이 zero-config로 동작해야 하는 요구가 생길 때 (A strategy 재검토 또는 다른 방식).

## Sources
- `logs/workspace-reset/retained-provenance/2026-06-20-mvp-plan-carryover-archive.md` §2 — R3/R4 carryover
  provenance for Claude plugin/channel activation and runtime namespace QA.
- 전략 선택·no-fallback 구현: [[src/cli/invocation.ts]] —
  `src/cli/invocation.ts:161-163` (`resolveClaudeChannelStrategy` 호출),
  `src/cli/invocation.ts:219` (strategy 분기), `src/cli/invocation.ts:239-249`
  (plugin launch + cwd 고정), `src/cli/invocation.ts:487-499`
  (`resolveClaudeChannelStrategy`: 기본값 `"plugin"`)
- `claude plugin list --json` 외부 CLI contract 스키마(id/installPath/projectPath,
  cwd-resolved `enabled`, flat scope, `ambiguous_install_path` 가드) 구현 근거:
  [[src/adapters/claude/preflight.ts]] — `src/adapters/claude/preflight.ts:11-62`,
  `src/adapters/claude/preflight.ts:168-207`; [[src/adapters/claude/plugin-cli.ts]] —
  `src/adapters/claude/plugin-cli.ts:63-103`, `src/adapters/claude/plugin-cli.ts:181-249`
- 채널 활성화 전략·preflight 흐름(아키텍처 권위):
  [[docs/architecture/local-runtime-claude-adapter]] §6.1–6.2
