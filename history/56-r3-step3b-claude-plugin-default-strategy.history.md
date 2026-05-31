# R3 closeout 구현 — Step 3b: D(channel-as-plugin)를 기본 channel strategy로 승격

## Status

- Date: 2026-05-31
- Type: 구현 (R3 closeout, Step 3을 3a[설치 UX] / 3b[D default flip]로 분리 — 3b)
- Continues: `history/55-r3-step3a-claude-plugin-setup-ux.history.md`
- Tracker: `plan/qa-tracker.md` R3
- Plan: `~/.claude/plans/step-3b-noble-tide.md`
- One line: `aiox claude`의 Claude channel 활성화를 `AIOX_CLAUDE_CHANNEL_STRATEGY` env enum으로 공식화. **unset/`plugin` → D(channel-as-plugin) 기본**, `inline` → 기존 A(`--mcp-config` + `server:<name>`) dev/debug-only opt-out. spike 토글 `AIOX_SPIKE_STRATEGY_D`는 **완전 제거**. D preflight 실패 시 **자동 fallback 없음**(hard error), setup-fixable 코드에만 dev/debug inline hint를 붙임. **미커밋 — Codex 리뷰 후 커밋.**

## 결정 (확정)

- **D 기본 승격 근거**: Step 3a에서 ① 설치 안전망(`aiox claude-plugin setup`)이 생겼고 ② live smoke로 D 활성화 경로(`plugin:aiox-channel-ingress@aiox`, `/mcp`의 send/reply, A의 cosmetic `server:<name>` warning 없음)가 PASS(history/55) → 이제 안전하게 flip 가능. 권위 결정은 history/49·50의 "D primary + B fallback + A dev-only".
- **strategy selector = env enum** `AIOX_CLAUDE_CHANNEL_STRATEGY`:
  - unset / `""` / `plugin` → D plugin strategy (기본값)
  - `inline` → A inline strategy (dev/debug only)
  - 그 외 → hard error, exit 1, code `aiox.invocation.invalid_claude_channel_strategy`, message `Invalid AIOX_CLAUDE_CHANNEL_STRATEGY="<value>". Expected "plugin" or "inline".`
  - 빈 문자열(`AIOX_CLAUDE_CHANNEL_STRATEGY=`)은 shell에서 unset과 구분 어려워 unset과 동일하게 D로 취급(보수적, 사용자 혼선 방지).
- **`AIOX_SPIKE_STRATEGY_D` 완전 제거 (deprecation alias 아님)**: 이 토글은 미릴리스 spike 전용 opt-in이었고 default도 아니어서 깨질 외부 사용자가 없음. 사용자 선호도 "새 공식 env만 남기기". → alias를 남길 이유 부재라 제거가 명백히 옳음. (코드 읽고 제안하라는 요청에 대한 결론.)
- **no auto fallback**: D preflight가 실패해도 inline(A)으로 자동 재시도하지 않는다. 실패는 코드별 non-zero `InvocationError`로 끝낸다. A는 *명시적* dev/debug opt-out일 때만 사용. (운영자가 silent-drop 경로로 진입하지 않게 하는 게 R3의 핵심.)
- **inline hint 정책**: setup으로 고칠 수 있는 provisioning 실패 코드 — `marketplace_not_registered`, `plugin_not_installed`, `plugin_not_enabled`, `channel_server_missing`, `ambiguous_install_path` — 에만 기존 preflight message 뒤에 dev/debug 보조 문구를 append:
  ```
  Developer/debug only:
    AIOX_CLAUDE_CHANNEL_STRATEGY=inline aiox claude --name <agentName>
  ```
  `channels_disabled`(org 정책 차단 — inline도 해결 못 함)와 `missing_env`(토큰 누락 — inline 무관), inventory load 실패, daemon/socket/attach 실패, invalid strategy에는 **붙이지 않음**(오도 방지).

## 무엇을 했나

- **`src/cli/invocation.ts`**:
  - `resolveClaudeChannelStrategy(raw)` 추가(모듈 private) → `"plugin"|"inline"` 또는 `invalid_claude_channel_strategy` throw.
  - `case "agent-attach"` 최상단에서 `command.agentKind === "claude"`일 때만 strategy를 resolve — **`startDaemon`/`attachAgent` 전**이라 invalid value는 daemon/attach 부작용 0으로 fail-fast.
  - claude 분기의 `process.env.AIOX_SPIKE_STRATEGY_D === "1"` → `claudeChannelStrategy === "plugin"`로 교체. plugin → 기존 `preflightStrategyDPlugin` + `launchClaudePluginChannel`(D); inline → `launchClaudeWithChannel`(A) 그대로. inline 경로는 inventory/preflight를 일절 호출 안 함(기존 구조 유지).
  - `claudePreflightFailureMessage(code, baseMessage, agentName)` **export**로 hint 선택 로직 추출(no-hint 케이스 단위 테스트 가능하도록) + `SETUP_FIXABLE_PREFLIGHT_CODES` set. `preflightStrategyDPlugin`의 `!result.ok`가 이를 사용. InvocationError code는 기존 `claude_preflight.<code>` 불변(메시지만 변경), rollback 동작 보존.
  - 주석 갱신(spike/`AIOX_SPIKE_STRATEGY_D` 언급 → 공식 strategy 정책).
- **`src/adapters/claude/launcher.ts`**: 변경 없음. `launchClaudeWithChannel`(A)/`buildClaudeChannelMcpConfig`/`launchClaudePluginChannel`(D) 모두 보존. A 삭제 안 함.

## 테스트 (TDD)

`tests/unit/cli/invocation.test.ts`:
- 헬퍼 `withStrategyD`(`AIOX_SPIKE_STRATEGY_D=1`) → `withChannelStrategy(value|undefined, fn)`로 교체(prev 저장/복원).
- default(unset) → D launcher 호출 + A 미호출 + inventory를 cwd에서 로드(cwd 계약).
- 명시 `plugin` → D 경로 동일.
- 명시 `inline` → A full-sequence(startDaemon/attach/launchClaudeWithChannel/disconnect) + inventory/preflight 미호출.
- **invalid strategy(`bogus`)** → `invalid_claude_channel_strategy`, exit 1, **calls 전무**(attach 전 fail 단언).
- **setup-fixable failure(plugin_not_installed)** → error message에 inline hint + agentName 포함.
- D preflight reject/inventory throw/rollback throw 회귀(기존 3종 유지, 기본 strategy로 전환).
- 신규 describe `claudePreflightFailureMessage`: setup-fixable 5코드 → hint 포함 / `channels_disabled`·`missing_env` → hint 없음(`channels_disabled`/`missing_env`는 invocation 경로로는 도달 불가하므로 pure helper 단위 테스트로 정책 고정).

## 결과

- **461 PASS**(이전 452; redundant toggle-off 테스트 1개 제거 + 통합 3 + helper 7 케이스 추가) / `pnpm typecheck` green / `pnpm build` green.
- A 경로는 dev/debug opt-out으로 계속 동작(회귀 테스트로 보장). 기본 실행은 이제 D.
- **미커밋**: 사용자 스펙에 따라 Codex 리뷰 통과 후 커밋.

## Codex 리뷰 요청 (스크루티니 포인트)

1. **resolve 위치**: strategy를 `agent-attach` 최상단(daemon/attach 전)에서 claude-only로 resolve → invalid가 부작용 0으로 fail-fast. codex 분기엔 무영향인지, 위치가 적절한지.
2. **빈 문자열 정책**: `AIOX_CLAUDE_CHANNEL_STRATEGY=""`를 unset과 동일(D)로 취급한 게 맞나, 아니면 invalid로 막아야 하나.
3. **inline hint 코드 분류**: setup-fixable 5코드에만 hint, `channels_disabled`/`missing_env` 제외가 적절한지. (이 둘은 invocation 경로로 도달 불가 — pure helper로만 정책 검증한 점 포함.)
4. **no-fallback 계약**: D 실패가 A로 절대 안 넘어가는 게 코드/테스트로 충분히 닫혔는지(특히 inline hint가 "자동 fallback"으로 오해되지 않는지).
5. **`AIOX_SPIKE_STRATEGY_D` 제거**: alias 없이 완전 제거가 맞는지(미릴리스 spike 토글이라 호환 부담 없음 판단).

## Codex 리뷰 결과 (2026-05-31) + delta fix

**판정: Low UX 1건 수정 후 통과.** 5포인트 전부 OK 확인 — strategy resolve 위치(claude-only, daemon/attach 전 → invalid 부작용 0) / unset·empty·plugin→D, inline→A 정책 코드·history 일치 / `AIOX_SPIKE_STRATEGY_D` alias 없이 제거 타당 / D→A 자동 fallback 없음 코드상 닫힘(inline은 명시 env일 때만) / setup-fixable 5코드만 hint + `channels_disabled`/`missing_env` 제외 분류 적절 / inline 경로 inventory·preflight 미호출 회귀 테스트 적절. Codex 재검증: typecheck/invocation 25/전체 461/build 전부 PASS.

**Low/UX finding (반영):** dev/debug hint가 `--name ${agentName}`로 실제 name을 보간 → parser가 공백 있는 name(`--name "reviewer one"`)을 막지 않으므로 안내 명령이 `--name reviewer one`으로 깨질 수 있음. **수정: 실제 name 대신 리터럴 `<agentName>` placeholder 사용**(Codex 권장안). `claudePreflightFailureMessage`의 `agentName` 파라미터 제거(불필요). 테스트(통합 stringContaining + helper 단위테스트 HINT 상수)도 `<agentName>`로 갱신. typecheck/461 tests/build 재PASS.

## Delta fix 2 — inline channel-server entrypoint를 실행 모드 기준으로 해석 (2026-05-31)

**Live smoke finding (inline)**: `AIOX_CLAUDE_CHANNEL_STRATEGY=inline pnpm dev claude --name smoke-inline`에서 inline strategy 선택·MCP config injection까지는 PASS였으나 **MCP server runtime이 FAIL**. 실측: `/mcp`에 `Status: failed`, command `node`, args `src/adapters/claude/channel-server.js`. 그러나 src 레이아웃엔 `channel-server.ts`만 있고 `.js`는 없음(빌드 산출물은 dist). 원인: `buildClaudeChannelMcpConfig`가 `import.meta.url` sibling `channel-server.js` + `process.execPath`(node)를 **고정**으로 써서 `pnpm dev`(tsx/src) 레이아웃에서 깨짐.

**정책 — inline은 explicit dev/debug strategy이므로 3개 실행 모드로 entrypoint를 구분**:
1. **개발 중 (`pnpm dev` = `tsx src/bin/aiox.ts`)** → src/TS layout → inline channel server = `tsx src/adapters/claude/channel-server.ts`.
2. **build 산출물 테스트 (`pnpm build` 후 `node dist/src/bin/aiox.js …`)** → dist/JS layout → `node|process.execPath dist/src/adapters/claude/channel-server.js`.
3. **npm 배포 후** → 배포 package는 built JS 포함, installed bin도 built JS 실행 = **dist/JS layout과 동일하게 취급**. 단 **npm packaging inclusion 자체는 post-MVP/release-plan(B1) 범위** — 이번 Step 3b는 "dist layout이면 npm installed layout과 동일 동작"까지만 보장.

**구현**: `src/adapters/claude/launcher.ts`에 `resolveInlineChannelServerEntry(deps?)` 분리. 판단 기준 = `import.meta.url`의 현재 모듈 위치(`.js`/`.ts`) + 인접 파일 존재(`fileExists`). `.js`+sibling `channel-server.js` → `{nodeCommand(=process.execPath), .js}`; `.ts`+sibling `channel-server.ts` → `{tsxCommand(="tsx"), .ts}`; 둘 다 실패 → **clear thrown error(자동 fallback 없음)**. `buildClaudeChannelMcpConfig`는 명시 override(`channelServerPath`)가 있으면 그걸 쓰고, 없으면 resolver 사용. **D plugin launcher(`launchClaudePluginChannel`/`buildLaunchClaudePluginArgs`)는 무영향** — inline `--mcp-config`를 만들지 않음. inline은 계속 `AIOX_CLAUDE_CHANNEL_STRATEGY=inline`일 때만 동작.

**테스트**(`tests/unit/adapters/claude-channel.test.ts`): resolver 3종 — src/TS layout→`tsx <…/channel-server.ts>`, dist/JS layout→`node <…/channel-server.js>`(주석으로 "npm installed package도 동일 built-JS layout" 명시), 판별 실패→clear error throw. 기존 `buildClaudeChannelMcpConfig` default 테스트는 vitest/tsx(=src layout)에서 resolver가 `tsx`+`.ts`를 고르도록 갱신. 명시 override 테스트는 유지. **465 tests/typecheck/build green.** (실제 npm pack까지는 이번 범위 밖 — dist layout 테스트에 주석/의미로 표현.)

## Delta fix 3 — `runtimeBinary` 단독 override 복구 (Codex Low/structural, 2026-05-31)

**Finding**: delta fix 2에서 `buildClaudeChannelMcpConfig`가 `channelServerPath`가 있을 때만 `runtimeBinary`를 쓰고, 없으면 `resolveInlineChannelServerEntry()` 결과를 통째로 사용 → `buildClaudeChannelMcpConfig({ runtimeBinary: "..." })`만 넘기면 command override가 **무시됨**. 실제 호출자는 없어 blocker는 아니나 인터페이스 의미(runtimeBinary=command override)가 거짓말하던 상태.

**Fix (Codex option 1)**: script path는 `channelServerPath` override 또는 execution-mode layout resolver가 결정하고, **command는 `input.runtimeBinary ?? resolved.command`로 두 경우 모두 독립 override**. 동작 보존: both override→주어진 node+js / `channelServerPath`만→`process.execPath`+js / `runtimeBinary`만→override command + layout-resolved script / override 없음→전부 resolver.

**Regression test**: `buildClaudeChannelMcpConfig({ runtimeBinary: "/custom/runtime" })` → command `/custom/runtime`, script path는 현재 test src/TS layout 기준 `channel-server.ts`. **465 tests/typecheck/build green.** Codex delta 리뷰 OK(추가 수정 불필요).

## Live smoke (interactive — 사용자 실행 요청 / RUNBOOK)

unit 레벨까지 검증 완료. 실제 TUI 진입은 interactive라 아래를 사용자가 실행해 확인 요청. delta fix 4 이후 daemon도 개발 모드에서 직접 띄울 수 있으므로 `pnpm dev daemon start`를 기본 RUNBOOK으로 둔다.

```bash
pnpm dev daemon start
# (필요 시) pnpm dev pair --name p1

# 1) default → D plugin path 진입 (plugin:aiox-channel-ingress@aiox, /mcp send/reply, server:<name> warning 없음)
pnpm dev claude --name smoke-claude-default

# 2) inline → legacy A path 진입. delta fix 2 이후 기대: /mcp가 connected,
#    tools send/reply 노출 (이전엔 Status: failed). pnpm dev라 inline server는
#    tsx channel-server.ts로 떠야 함.
AIOX_CLAUDE_CHANNEL_STRATEGY=inline pnpm dev claude --name smoke-inline-2

# 3) invalid → exit 1 + invalid_claude_channel_strategy, daemon/attach 미발생
AIOX_CLAUDE_CHANNEL_STRATEGY=bogus pnpm dev claude --name smoke-bogus
```

### inline live re-smoke PASS (2026-05-31, delta fix 2/3 이후)

- 실행: `AIOX_CLAUDE_CHANNEL_STRATEGY=inline pnpm dev claude --name smoke-inline-2`
- `/mcp` 결과:
  - `Aiox-claude-ingress MCP Server`
  - `Status: connected`
  - `Command: tsx`
  - `Args: /Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/channel-server.ts`
  - `Config location: Dynamically configured`
  - `Capabilities: tools`
  - `Tools: 2 tools`
- 판정: inline explicit dev/debug strategy가 `pnpm dev`/src layout에서 정상 동작. 이전 실패 원인(`node` + 존재하지 않는 `src/channel-server.js`)은 delta fix 2로 해소됨.

### Live smoke 종합 판정

| 항목 | 판정 |
|---|---|
| default D plugin path (`plugin:aiox-channel-ingress@aiox`) | **PASS** |
| D preflight hard error / no auto fallback / setup hint | **PASS** |
| inline dev strategy (`AIOX_CLAUDE_CHANNEL_STRATEGY=inline`, src/TS layout) | **PASS** |
| invalid strategy (`bogus` → exit 1, daemon/attach 미발생) | **PASS** |

## Delta fix 4 — `pnpm dev daemon start`를 개발/src layout에서 동작하게 수정 (2026-05-31)

**Finding**: 3개 실행 모드(dev / build-smoke / npm installed)를 정리하면서, 개발 UX의 기본 명령인 `pnpm dev daemon start`도 정상 동작해야 한다는 점을 재확인. 기존 `forkDaemonProcess`는 parent CLI가 `tsx src/bin/aiox.ts`로 실행 중이어도 detached child를 `node src/bin/aiox.ts _run-daemon ...`로 띄움 → plain Node가 `.ts` entrypoint를 실행하지 못해 child가 죽고 socket wait 실패(`daemon socket did not become available`)로 이어짐.

**Fix**: `src/bin/aiox.ts`에 `resolveDaemonForkCommand`를 추가. parent bin path가 `.ts`이면 child도 `tsx <src/bin/aiox.ts> _run-daemon --socket ...`로, `.js`이면 `node|process.execPath <dist/src/bin/aiox.js> _run-daemon --socket ...`로 fork한다. 즉:

- development (`pnpm dev` / src TS layout): `tsx src/bin/aiox.ts _run-daemon ...`
- build smoke (`pnpm build` + dist JS layout): `node dist/src/bin/aiox.js _run-daemon ...`
- npm installed package: built JS layout과 동일

**Tests / smoke**:

- unit: dev TS layout / dist JS layout fork command tests 추가.
- `pnpm test` → **467 PASS**.
- `pnpm typecheck` / `pnpm build` green.
- temp socket live smoke:
  - `AIOX_SOCKET_PATH=/private/tmp/aiox-dev-daemon-smoke.sock pnpm dev daemon start` PASS
  - `pnpm dev daemon status` running 확인
  - `pnpm dev daemon stop` PASS

판정: 개발 / build smoke / npm installed 3모드의 daemon start UX가 같은 CLI 구조로 정렬됨. 기존 `pnpm dev daemon start` socket wait 이슈는 R3 외부 보류가 아니라 이번 delta fix로 해소.

## package scripts / README note (이번 작업에 포함)

3개 실행 모드를 스크립트/문서로 정리(top-level parser에 `start`는 **추가하지 않음** — `pnpm start` npm script가 `daemon start`를 호출하는 형태):

- **development (`pnpm dev` = `tsx src/bin/aiox.ts`)**: `pnpm dev daemon start`, `pnpm dev claude ...`, `pnpm dev claude-plugin setup` 등.
- **build smoke (`pnpm build` 후 dist 실행)**: `package.json`에 dist-runner npm scripts 추가 — `start`(=`node dist/src/bin/aiox.js daemon start`), `stop`, `status`, `claude`, `codex`, `connect`, `disconnect`, `pair`, `doctor`, `claude-plugin`. → `pnpm build` → `pnpm start` / `pnpm claude ...`로 빌드 산출물 스모크.
- **npm 배포 후**: installed bin도 built JS 실행 = build smoke와 동일 layout(packaging inclusion은 release-plan B1).

`README.md`도 Development / Build Smoke / Claude Plugin Setup / Claude Channel Strategy(`unset|plugin`→plugin, `inline`→legacy, invalid=fail-fast·no auto fallback) / Manual Routes / Pair Reservation 섹션으로 갱신(기존 raw `node dist/...` 호출을 pnpm scripts로 치환).

## 남은 가설 / 별개 추적 (불변)

- D 실패 코드 중 `channels_disabled`/`missing_env`는 현 invocation 경로로 도달 불가(channelsEnabled 미배선, env 3종 항상 present) → org-policy 감지(`channelsEnabled`)는 defer.
- 별개 추적: npm 패키징 marketplace 번들(release-plan B1) / B fallback(`doctor --repair`) / silent-drop(e) 실측 / (E) 배포형태 런타임경로 재측정.
- local/managed/all/* scope는 후순위 유지(history/55 Scope policy note).

## Next

- 상태: Step 3b 본체 + delta fix 1(`<agentName>` placeholder) + delta fix 2(inline entrypoint 실행모드 해석) + delta fix 3(`runtimeBinary` 독립 override) + delta fix 4(dev daemon fork 실행모드 해석) 모두 반영. **467 tests / typecheck / build green. Codex 리뷰·delta 리뷰 OK. Live smoke 4항목 + dev daemon start/stop PASS.** 커밋 대기(사용자 승인 시).
- 커밋 → **R3 closeout 완료**(D default + A dev-only + 설치 UX). 이후 R3는 별개 추적 항목만 남음(release-plan B1 npm 패키징 / B fallback / silent-drop 실측 / 배포형태 런타임경로).
