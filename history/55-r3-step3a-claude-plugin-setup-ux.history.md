# R3 closeout 구현 — Step 3a: `aiox claude-plugin setup` 설치 UX

## Status

- Date: 2026-05-31
- Type: 구현 (R3 closeout, Step 3을 3a[설치 UX] / 3b[D default flip]로 분리 — 3a)
- Continues: `history/54-r3-step2-invocation-preflight-wiring.history.md`
- Tracker: `plan/qa-tracker.md` R3
- Plan: `~/.claude/plans/idempotent-cuddling-charm.md`
- One line: D 기본화(Step 3b) 전에, plugin 미설치 사용자가 self-service로 marketplace 등록 + plugin 설치/enable을 멱등하게 할 `aiox claude-plugin setup [--scope user|project]` 명령을 추가. preflight 실패 메시지도 이 명령을 1차 안내하도록 교체. **D default flip은 안 함, A 보존.**

## 왜 Step 3을 3a/3b로 쪼갰나 (walkthrough 결론)

- 사용자 지적: Step 3에서 D를 기본화하면 plugin 미설치 사용자가 preflight hard-error로 막힌다(B fallback은 R3 밖 = `doctor --repair`, post-MVP). 안전망이 없다.
- 사실관계 재확인: `qa-tracker.md:68`에서 설치 UX `aiox setup claude-plugin`는 **이미 R3 closeout 범위 안**. 따라서 질문은 "R3에 넣느냐"가 아니라 "Step 3에 합치느냐 / 별도 step + 순서". 또한 default-flip은 R3 시점엔 marketplace 경로가 dev 아티팩트뿐(번들 동봉=post-MVP)이라 사실상 dev-facing.
- 결정: **별도 Step 3a로 분리**(옵션 3=Step 3 합치기는 거부 — 설치 UX는 자체 설계면이 커서 토글 flip에 끼우면 revert 단위가 흐려짐). 정책: `aiox claude`는 실행 명령이라 preflight 실패 시 **fail-fast + 안내만**, 설치/enable은 명시적 `aiox claude-plugin setup`에서만(사용자 Claude 설정 변경이므로). 명령 이름은 사용자 최종 스펙대로 `aiox claude-plugin setup`(history/50의 `aiox setup claude-plugin`에서 변경).

## 연구로 확정된 미해결 항목 (스펙 item 4·5)

- **marketplace 아티팩트 = `spike/aiox-channel-marketplace`**(유일; name=`aiox`, plugin=`aiox-channel-ingress`). bin은 `dist/src/bin/aiox.js`에서 돌지만 marketplace는 dist 밖 `spike/`. → 경로 해석: `AIOX_CLAUDE_CHANNEL_MARKETPLACE_PATH` env override 우선, 기본은 모듈에서 위로 올라가며 `spike/aiox-channel-marketplace`를 가진 디렉터리 탐색(tsx[src]/built[dist] 둘 다 repo 루트에서 발견). **최종 배포 경로는 post-MVP 패키징에서 확정**.
- **enable 별도 단계 불필요**(history/52): `claude plugin install --scope <scope>`가 그 scope의 raw `enabledPlugins:{ref:true}`를 씀 = install이 곧 enable, disabled-at-target도 install 재실행으로 복구. **유일하게 install로 못 고치는 케이스 = higher-precedence scope의 explicit disable이 그 cwd에서 덮는 경우** → setup 마지막 preflight가 `plugin_not_enabled`로 정직하게 surface(별도 enable 명령 없이 설계로 흡수).

## 발견한 충돌 + 해법 (스펙 item 6 보강)

setup 시점엔 agent/token/socket이 없는데 `preflightClaudePlugin`은 `REQUIRED_ENV`를 검사(step 7) → 그대로 부르면 항상 `missing_env`. env 체크는 attach-time 관심사이므로 **`PreflightClaudePluginInput.requireEnv?: boolean`(default true) 추가**: attach 경로는 default 무변경, setup은 `requireEnv:false`로 step 1~6만 검증(env skip).

## 무엇을 했나

- **`src/adapters/claude/preflight.ts`**: `requireEnv?` 추가(step 7 게이트). 실패 메시지 3종(`marketplace_not_registered`/`plugin_not_installed`/`plugin_not_enabled`) 1차 안내를 `aiox claude-plugin setup --scope user|project`로 교체. (D 토글 경로에서만 노출 → default A 무변경.)
- **`src/adapters/claude/plugin-cli.ts`**: 멱등 write-ops 2개 추가 — `addClaudeMarketplace`(`plugin marketplace add <path> --scope <scope>`), `installClaudePlugin`(`plugin install <ref> --scope <scope>`). 기존 `ClaudeCliRunner`/cwd 계약 재사용, 실패 시 `ClaudePluginCliError`. (marketplace add `--scope`는 아래 Codex delta로 추가.)
- **`src/adapters/claude/setup.ts`** (신규, 순수 오케스트레이션·I/O 주입): `setupClaudePlugin` — inventory#1 → (marketplace 없으면 add) → (cwd-effective 아니면 install) → 변경 있으면 reload → `preflightClaudePlugin({requireEnv:false})`. preflight 실패는 `{ok:false, code}` 반환(override 등 surface), CLI 실패는 `ClaudePluginCliError` propagate.
- **`src/cli/parse.ts`**: `claude-plugin` 부모 + `setup` 서브. `--scope` default `user`, `user|project`만 허용(그 외 `aiox.invalidScope`; `*`는 shell glob 위험으로 비허용). `ParsedCommand`에 `claude-plugin-setup` 추가.
- **`src/cli/invocation.ts`**: `case "claude-plugin-setup"` → marketplace path 해석 + `setupClaudePlugin` 호출. ok→summary stdout(exit 0), preflight 실패→`aiox.invocation.claude_plugin_setup.<code>`, CLI throw→`aiox.invocation.<cliCode>`(또는 `claude_plugin_setup_failed`). **daemon 무관**(provisioning은 daemon 안 켬). 기존 D 토글/launcher/default 경로 무변경.

## 테스트 (TDD)

- preflight +2 (`requireEnv:false` env skip / step1~6 여전히 적용) = 17.
- plugin-cli +4 (add/install: cwd로 호출 / runner reject→`claude_plugin_cli_failed`) = 13.
- setup 신규 9 (no-op, marketplace add/skip, install scope/skip, disabled→install, reload, override→coded fail, install throw propagate).
- parse +3 (default user / `--scope project` / invalid scope reject) = 55.
- invocation +3 (scope·cwd·path passthrough + summary + daemon 미호출 / preflight 코드 에러 / CLI throw 래핑) = 16.

## 결과

- 신규 21 케이스 포함 **452 PASS**(이전 431) / `pnpm typecheck` green / `pnpm build` 무변경 가정.
- 수동 sanity: `pnpm dev --help`에 `claude-plugin` 노출, `claude-plugin setup --scope bogus` → exit 1 `invalidScope`(claude 미호출).
- **미커밋**: 사용자 스펙 item 11에 따라 **Codex 리뷰 통과 후 커밋**.

## Codex 리뷰 요청 (스크루티니 포인트)

1. **requireEnv 분기**: env 게이트를 setup에서만 끄는 게 맞나? attach 경로가 default(true) 그대로인지 회귀 가드 충분한지.
2. **install=enable 가정**: "install이 raw enable까지 한다 + disabled-at-target도 install 재실행으로 복구"가 history/52 근거로 충분한지, 아니면 명시적 `claude plugin enable` 단계가 필요한지(현재는 의도적으로 없음 → override는 preflight로 surface).
3. **idempotency 판정**: install-skip 조건을 cwd-resolved `enabled`로 잡음(preflight와 동일 기준). higher-scope override edge에서 install 실행 후에도 ineffective → coded fail로 노출하는 흐름이 적절한지.
4. **marketplace path 해석**: env override + 모듈 위로 walk-up(spike 디렉터리 탐색)이 tsx/dist 둘 다 안전한지, 8단계 cap·fallback이 합당한지. (배포 경로는 post-MVP라 명시 제외.)
5. **에러 코드 매핑**: `ClaudePluginCliError.code` passthrough vs `claude_plugin_setup_failed` fallback, preflight code → `claude_plugin_setup.<code>` 네이밍 일관성.

## Codex delta fix (2026-05-31, 리뷰 반영 — 미커밋)

Codex 리뷰 finding (Medium/behavioral): `aiox claude-plugin setup --scope project`가 plugin install은 project로 하면서 `claude plugin marketplace add <path>`엔 `--scope`를 안 넘겨 marketplace가 Claude 기본값(user) scope로 등록될 수 있음 → `--scope project` UX 의미와 충돌. Claude CLI help 확인 결과 `plugin marketplace add`도 `--scope user|project|local` 지원.

**정책 확정**: `setup --scope X`는 **marketplace add + plugin install 둘 다 같은 scope X** 사용.
- 수정: `AddClaudeMarketplaceOptions.scope: "user"|"project"` 추가 → args `["plugin","marketplace","add",<path>,"--scope",<scope>]`. `setup.ts`가 `addMarketplace({...,scope:input.scope})` 전달, `SetupClaudePluginInput.addMarketplace` 타입도 scope 받도록 갱신.
- **단 marketplace provenance는 Step 3a에서 검증/repair 안 함** (보수적): `marketplace list --json`의 scope 의미가 firm contract 아니므로, `marketplaces.includes("aiox")`면 기존대로 add skip. 이미 보이는 marketplace가 user인지 project인지까지 판별 안 함 → user-scope 등록이 project cwd에서도 보이면 project add를 skip할 수 있어 **"project self-contained marketplace 보장"은 약함 = post-MVP/별도 follow-up 측정 대상**. setup.ts step 2 주석에 명시.
- 테스트 갱신: plugin-cli `addClaudeMarketplace`가 `--scope` 포함 단언 / setup `scope:"project"`일 때 `addMarketplace` 호출에 `scope:"project"` 전달 단언 / already-registered skip 유지. 22 adapter tests PASS, typecheck green.

**남은 가설(미검증, history에 명시 보존)**: ① `marketplace add --scope project`가 실제 project 설정에만 등록하는지(저장 위치/precedence 미측정) ② `marketplace list --json`이 cwd-resolved인지 scope별 raw인지 ③ `plugin install --scope project`가 user-scope marketplace만 있어도 항상 성공하는지 ④ install 재실행이 disabled-at-target을 항상 re-enable하는지(history/52 측정 근거 있으나 전 scope/version 공식 계약 아님 — 단 마지막 preflight가 실패 포착하므로 운영 위험 제한적). 모두 smoke/post-MVP 측정 후 확정.

## Next

- **Step 3b — D default + A dev-only**: `AIOX_SPIKE_STRATEGY_D` 토글 승격/제거, D 기본화, A는 명시적 dev/debug fallback. 이제 설치 on-ramp(`aiox claude-plugin setup`)이 있으므로 안전하게 flip 가능.
- 별개 추적(불변): npm 패키징 marketplace 번들(release-plan B1) / B fallback(`doctor --repair`) / silent-drop(e) 실측 / (E) 배포형태 런타임경로 재측정.
