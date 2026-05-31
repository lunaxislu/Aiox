# R3 closeout 구현 — Step 2: invocation preflight wiring

## Status

- Date: 2026-05-31
- Type: 구현 (R3 closeout, 옵션 A 순차 1→2→3 중 **Step 2**)
- Continues: `history/53-r3-closeout-step1-plugin-cli-adapter.history.md`
- Tracker: `plan/qa-tracker.md` R3
- One line: Step 1에서 dormant 상태였던 preflight + plugin CLI 어댑터를 claude attach의 D 분기(`AIOX_SPIKE_STRATEGY_D=1`)에 배선. spawn 전에 `loadClaudePluginInventory({ cwd })` → `preflightClaudePlugin` 게이트를 통과해야만 `launchClaudePluginChannel`(D) 진행, 실패 시 attach 롤백 + 코드별 non-zero `InvocationError`. 리뷰 반영으로 **cwd pinning**과 **rollback-error masking 방지**까지 닫음.

## 무엇을 했나

`src/cli/invocation.ts` (claude attach D 분기, A 경로 무영향):
- 모듈 상수 `CLAUDE_CHANNEL_PLUGIN_NAME`/`CLAUDE_CHANNEL_MARKETPLACE_NAME`로 preflight input과 launch arg의 id drift 제거.
- `preflightStrategyDPlugin` 게이트: inventory를 `options.cwd`에서 로드(history/52 cwd 계약) → launcher가 실제로 넣는 env 3종과 byte-identical하게 조립 → `preflightClaudePlugin`. inventory 로드 실패=`aiox.invocation.claude_plugin_inventory_failed`, preflight `ok:false`=`aiox.invocation.claude_preflight.<code>`. 둘 다 attach 롤백 후 non-zero throw.
- `InvocationOptions`에 `loadClaudePluginInventory?`/`fileExists?` 주입점(기본=실어댑터/`existsSync`).

## 리뷰(Codex) 반영 2건

- **Finding 1 (Medium) — preflight cwd ↔ launch cwd 불일치**: preflight는 `options.cwd`로 plugin scope를 resolve하지만 `launchClaudePluginChannel` spawn은 cwd 미지정 → child가 부모 `process.cwd()` 상속. `invokeParsedCommand`에 `options.cwd ≠ process.cwd()`가 들어오면 preflight 통과 후 실제 활성화는 다른 scope에서 resolve → R3가 막으려는 silent-drop 재발 가능. **수정**: `LaunchClaudePluginChannelOptions.cwd?` 추가 + `spawn({ cwd, ... })`, invocation에서 `cwd: options.cwd` 전달. invocation/launcher 양 레벨 테스트로 cwd 전달 단언.
- **Finding 2 (Low) — rollback 실패가 preflight 코드를 가림**: `failAfterRollback`이 rollback을 await throw-through → rollback 실패 시 코드별 preflight 에러(load-bearing UX) 손실. 기존 `launchChildOrRollback`은 `void rollback`이라 무관했음. **수정**: rollback을 try/catch swallow, 원래 `InvocationError` 보존(회귀 테스트 추가).

## 결과

- `pnpm typecheck`/`build` green, 전체 **431 PASS** (Step 1 425 + invocation 4 + launcher 2). invocation.test 13 passed.
- A 기본 경로 무변경(게이트는 D 토글 전용). Codex 최종 판정: **Step 2 Go.**

## Next

- **Step 3 — D default + A dev-only**: `AIOX_SPIKE_STRATEGY_D` 토글 승격/제거, D 기본화, A는 명시적 dev fallback. release behavior 변경이라 마지막.
- 별개 추적: `channelsEnabled` settings 감지(defer), B fallback, silent-drop 재측정, npm 패키징(release-plan B1).
