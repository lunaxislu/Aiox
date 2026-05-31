# Claude `plugin list --json` 실측 스키마 + preflight 보정

## Status

- Date: 2026-05-30
- Type: spike 실측 + 코드 보정 (history/50 item 1f "실제 `claude plugin list --json` 스키마 확인" 회수)
- Continues: `history/50-claude-channel-injection-verification-and-strategy.history.md` (R3 strategy D spike)
- One line: 사용자가 로컬에서 채널 plugin을 설치(`scope: user, enabled: true`)하고 실제 `claude plugin list --json`을 캡처 → preflight가 추론으로 짠 스키마와 **실제가 달라** 보정. (f)는 확정, precedence override(Finding 2)는 여전히 부분 미확정.

## 추측(가정 스키마) vs 실제 (`claude plugin list --json`)

preflight(`src/adapters/claude/preflight.ts`)의 `ClaudePluginListEntry`는 history/50 시점에 **문서 미확정 → 추론**으로 작성했다. 실측으로 맞춰보니:

| 항목 | 내 추측 | 실제 출력 | 판정 |
|---|---|---|---|
| plugin 식별 | `name` + `marketplace` **두 필드 분리** | `"id": "aiox-channel-ingress@aiox"` **한 필드**(`name@marketplace`) | ❌ 보정 |
| 활성 여부 | `enabled: boolean` | `enabled: true/false` | ✅ |
| 스코프 | `scope: user/project/local/managed` | `scope: "user"/"project"/"local"` | ✅ |
| 버전 | `version?` | `version: "0.1.0"` | ✅ |
| 설치 경로 | (없음) | `installPath: ".../.claude/plugins/cache/aiox/aiox-channel-ingress/0.1.0"` | ➕ 보너스 |
| 프로젝트 위치 | (없음) | `projectPath: "..."` — **project/local scope 엔트리에만** | ➕ 보너스 |
| 그 외 | — | `installedAt` / `lastUpdated` / `mcpServers`(설치된 `.mcp.json` 그대로) | 무관 |

실측 핵심 사실:
1. **`id` = `<name>@<marketplace>` 한 필드.** 분리 비교(`p.name === ... && p.marketplace === ...`)는 불가 → `id`를 `@`로 합쳐 비교해야 함.
2. **`installPath` 존재** → Codex Finding 3(설치된 cache root에서 channel-server 존재 확인)을 **caller가 경로를 따로 주입할 필요 없이** 엔트리 자체에서 파생 가능. `installPath + "/channel-server.js"`.
3. **list는 cwd로 필터링하지 않고 모든 스코프·모든 프로젝트 엔트리를 평면적으로 다 보고.** 증거: `frontend-design@claude-plugins-official`이 `projectPath`가 다른 두 엔트리로 **중복** 등장. → "지금 이 cwd에서 effective한가"는 list가 답해주지 않으므로 preflight가 `scope` + `projectPath`로 직접 판정해야 함.
4. 우리 채널 plugin은 `scope: user, enabled: true, mcpServers`에 `${CLAUDE_PLUGIN_ROOT}/channel-server.js` + `${VAR}` 그대로 → **설치·등록 성공** 확인.

## preflight 보정 (이 커밋)

- `ClaudePluginListEntry`: `name`+`marketplace` → **`id: string`** (+ `installPath?`, `projectPath?`). 매칭 = `entry.id === \`${pluginName}@${marketplaceName}\``.
- **cwd-effective 판정 도입**: `projectRoot?`(현재 cwd의 프로젝트 루트) 입력 추가. user/managed scope + enabled → 전역 effective; project/local scope + enabled + `projectPath === projectRoot` → effective. effective 엔트리가 하나도 없으면 `plugin_not_enabled`.
- **channel-server 검증을 `installPath` 기반으로**: caller-injected `channelServerPath` 제거 → effective 엔트리의 `installPath + "/" + channelServerFile`(기본 `channel-server.js`)을 `fileExists`로 확인. Finding 3을 source/cache 혼동 없이 해소.
- 테스트(`tests/unit/adapters/claude-preflight.test.ts`) 전면 갱신.

## 여전히 미확정 (다음 측정)

- **(Finding 2) precedence override**: project/local scope의 *disabled* 엔트리가 user-scope *enabled* fallback을 **죽이는지**는 실측 못함 (우리 plugin은 user 1건뿐). 현 로직은 "effective 엔트리가 하나라도 있으면 pass" — user enabled가 있으면 통과. override가 사실이면 false-pass 가능. RUNBOOK §2에 측정 절차 + preflight 코드에 ASSUMPTION 주석 유지. **invocation.ts 배선은 이 확정 후.**
- **entry-guard symlink**: cache 경로가 symlink일 때 channel-server의 `argv[1]===import.meta.url` 가드가 어긋나 `main()` 미진입할 수 있음 (RUNBOOK §0). end-to-end smoke에서 `/mcp` 표시로 측정.
- **silent-drop (e)**: plugin 미설치/scope-miss 시 exit/notice 양상 — 미측정.

## End-to-end smoke 결과 (2026-05-30) — PASS

순수 수동 env 기동은 토큰 발급 경로 문제로 막혀(claudeChannelToken은 attach 시점에만 발급), Gemini+Codex 합의대로 `invocation.ts`에 **측정용 env 토글**(`AIOX_SPIKE_STRATEGY_D=1` → `launchClaudePluginChannel`, 기본 off로 A 보존)을 배선. 두 claude(`alpha`/`beta`, 같은 pair, **repo 밖 `/tmp/aiox-smoke`에서 user-scope plugin**)로 측정:

- **(a) startup warning 부재 — PASS.** A의 `server:aiox-claude-ingress · no MCP server configured` 경고가 plugin 방식에선 안 뜸. (R3의 1차 동기 해소)
- **(f)/(b) `/mcp`에 채널 표시 + `${VAR}` 전달 — PASS.** 채널 서버가 떠서 `/mcp`에 노출 = `${CLAUDE_PLUGIN_ROOT}`/`${VAR}`로 경로+identity가 실제 확장돼 전달됨.
- **(c) 양방향 inbound push — PASS.** alpha↔beta 통신 성공 = channel-server의 daemon 등록(토큰 검증)까지 정상 + inbound push 생존.
- **entry-guard symlink 리스크 — 비발현.** cache 경로 symlink로 `main()` 미진입할까 우려했으나(RUNBOOK §0), 채널이 떴고 push가 됐으므로 `argv[1]===import.meta.url` 가드는 실제 cache 경로에서 정상 통과. channel-server 무수정 유지 가능.

→ **D(channel-as-plugin)가 실제로 동작·경고 없음 확정.** single-file 번들(Codex finding 1) + user-scope 전역 설치로 install-location 독립성도 확인.

## 미측정 (남은 항목)

- **(e) silent-drop**: plugin 미설치/scope-miss 시 exit code/notice 양상 — 아직 안 봄.
- **(Finding 2) precedence override**: project disabled가 user enabled를 죽이는지 — user 1건뿐이라 미측정.

## Next (다음 패스 — 정식화)

spike PASS → 정식 반영 단계. 단 precedence(Finding 2)/silent-drop(e) 확정은 그 후에도 가능:
1. `AIOX_SPIKE_STRATEGY_D` 토글을 정식 경로로 승격(또는 plugin을 기본·A를 dev-only로) + preflight를 `invocation.ts`에 배선(`claude plugin list --json` 어댑터 + projectRoot 탐지).
2. A(`buildClaudeChannelMcpConfig`/`--mcp-config`) retire 또는 dev-only로 격하.
3. `aiox setup claude-plugin --scope user` 설치 UX + npm 패키징(번들 포함, plan/release-plan.md B1).
4. B fallback(`~/.claude.json` user-scope `server:`)은 옵션/`doctor --repair`로 defer.
