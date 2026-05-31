# QA Tracker

MVP 구현 완료 후 user-led QA의 **살아있는 인덱스**.
권위는 `history/4X-qa-round-*.history.md`, 이 파일은 한눈에 보는 상태판이다.

- 발견 즉시 한 줄 추가 (status: open)
- Codex 픽스 commit 나오면 `Commit` 칸 채우고 status: fixed
- 재검증 통과하면 status: verified + history 파일에 Re-verify 한 줄

연관: [[aiox-step-progress]] · [[aiox-history-doc]] · `history/42-mvp-implementation-closeout.history.md`

---

## Status legend

- `open` — 재현됨, 미수정
- `triaging` — root cause 조사 중 (codex 위임 포함)
- `fixed` — 패치 commit 있음, 재검증 대기
- `verified` — 재검증 통과
- `wontfix` — Post-MVP로 이월 또는 의도된 동작으로 판정

## Active issues

| ID    | Scenario                    | Status | Found  | Commit  | History ref | Note |
| ----- | --------------------------- | ------ | ------ | ------- | ----------- | ---- |
| QA-001 | Claude TUI 종료 후 agent가 DB에 `connected`로 남고 pending token 누수 | verified | R1 | `fb7d8fc` | `43-qa-round-1` S-1 | `disconnectClaudeChannel`가 in-memory runtime registry만 정리, DB status·`claudePendingTokens` 미동기. fix: DB markDisconnected + pending token 정리. |
| QA-002 | Same-vendor pair (codex↔codex / claude↔claude) attach 거절 (`pair_kind_slot_occupied`) | resolved | R2 | `4d8601f` | `47-step-15-phase-b-closeout` | **Resolved (2026-05-27)** — Step 15 Phase B 머지로 lift. slot a/b 모델로 same-vendor pair `ready`. 거절 reason은 `pair_slot_occupied` (explicit slot 점유) / `pair_full` (auto + 양쪽 점유) / `agent_already_attached` (self-loop)로 분리. 권위: `history/47`. |
| QA-003 | dev / build-smoke / release runtime namespace(socket·state·Claude plugin·Codex MCP config) 공유로 false PASS/FAIL 가능 | triaging | R3(rec) | | `56-step-3b` (record) → `57-qa-round-4` | **R4(QA4) 진행 중 (opened 2026-05-31).** R3 closeout 중 발견·기록만 하고 R4로 이관. 기본 `~/.aiox/daemon.sock`는 사용자당 하나의 daemon 모델로는 정상이나 검증 모드 간엔 격리 필요. **3자 합의 = B안**(호출부 집중 + Unix socket 유지, transport union 기각). Scope: `resolveProfile()`로 socket을 profile별 자동 분리(release 하위호환), DB는 `:memory:` 유지 + `getStatePath()` scaffold, Windows는 deferred. 권위 `history/57`. |
|       |                             |        |        |         |             |      |

> 추가 시: ID는 발견 순으로 `QA-NNN`. Found 칸은 QA round 번호 (`R1`, `R2`…).

## Rounds

| Round | Date       | Scope                     | History file                      | Outcome |
| ----- | ---------- | ------------------------- | --------------------------------- | ------- |
| R1    | 2026-05-26 | Claude channel disconnect 정합성 | `history/43-qa-round-1.history.md` | **closed** (1 verified, 0 open) |
| R2    | 2026-05-27 | aiox MCP collaboration protocol Phase 1.5 + same-vendor pair finding | `history/44-qa-round-2.history.md` | **closed** — smoke 4/4 PASS + QA-002 resolved via Step 15 Phase B (`history/47`) |
| R3    | 2026-05-28 | Claude `--mcp-config` one-off MCP injection feasibility (vs dev-channel) | `history/49-...feasibility.history.md` + `history/50-...strategy.history.md` + `history/56-...step3b...history.md` | **closed 2026-05-31** — R3 ships D default + inline explicit fallback + setup UX + smoke namespace issue 기록. namespace isolation(QA-003)은 R3 blocker가 아니라 **R4(QA4)로 이관**. (history) **DECIDED 2026-05-29 (Codex cross-validation): D primary + B fallback + A dev-only.** Next = minimal D spike + preflight failure contract (TDD) → non-repo-root smoke → retire A. manual smoke DONE (works + cosmetic warning); D doc-verified; QA round still paused until spike. Impl (A) in working tree (`buildClaudeChannelMcpConfig` + `--mcp-config` + `.mcp.json` removed; 398 tests PASS) — but **A dropped** under reliability-over-footprint criterion. Decision narrowed to **D (channel-as-plugin)**: all five plugin assumptions are documented-fact (`${VAR}`/`${VAR:-default}` expansion in plugin `.mcp.json`; expansion source = parent `claude` env; `${CLAUDE_PLUGIN_ROOT}`; child inherits parent env + `.mcp.json` env merges; activation arg `plugin:<name>@<marketplace>` under `--dangerously-load-development-channels`, `--channels` once approved). Dynamic-identity + npm-bundling blockers resolved by docs. Runtime flow (send/reply + inbound push) identical across server:→plugin: and dangerously→`--channels`; channel-server.ts untouched. **Remaining = integration spike (non-repo-root: no warning / `${VAR}` delivers token / inbound push survives), not doc questions.** A impl not committed (to be replaced by D or kept as fallback) |
| R4    | 2026-05-31 | dev/build/release runtime namespace isolation (carries QA-003) | `history/57-qa-round-4-runtime-namespace-isolation.history.md` | **open** — B안 합의(profile namespace 분리, Unix socket 유지, Windows deferred). Step 1(paths profile 코어 TDD) DONE / Step 2(배선) next |

### R2 — aiox MCP collaboration protocol Phase 1.5

- **Scope**: instruction + send/reply tool description hardening for MCP collaboration protocol.
- **Changed files**: `src/adapters/codex/mcp-server.ts`, `src/adapters/claude/channel-server.ts`, `tests/unit/adapters/codex-mcp-server.test.ts`, `tests/unit/adapters/claude-channel.test.ts`.
- **Authority / follow-up plan**: `plan/post-mvp-aiox-mcp-envelope-metadata.md`.

Scenario PASS notes:

- Single delegation: delegate request produced one purposeful result reply, then stopped without acknowledgment reflex.
- Multi-round discussion: discussion continued across substantive turns and did not stop prematurely.
- `"마무리해"` termination trigger: active thread concluded with `Intent: conclusion` + `[[CONCLUDE]]`, and the peer did not continue the thread.
- No-call case: greeting/acknowledgment-style input did not trigger send/reply tool calls.

Observed metrics:

- Intent label compliance: PASS.
- `[[CONCLUDE]]` leak: none observed.
- Reflex loop recurrence: none observed.
- Unintentional calls for greeting/acknowledgment: none observed.

Remaining risk:

- Phase 1.5 is still a soft instruction/description contract. If intent omission, `[[CONCLUDE]]` leak, reflex loop recurrence, or unintentional calls appear, enter Phase 2 via `plan/post-mvp-aiox-mcp-envelope-metadata.md`.

### R3 — Claude `--mcp-config` injection feasibility

- **QA-003 opened (2026-05-31): dev / build-smoke / release namespace isolation — recorded here, moved to R4.** R3 closeout 중 발견했으나 R3 blocker로 처리하지 않고 R4(QA4)에서 설계/검증한다. 이하 내용은 발견 시점 기록. R3 closeout smoke must not rely on the shared default daemon socket (`~/.aiox/daemon.sock`) because `pnpm dev`, dist-runner scripts, and later npm-installed `aiox` can otherwise talk to the same daemon and produce false positives/negatives. Current DB is `:memory:`, so socket separation also separates daemon state today; when file-backed DB is introduced, a matching DB path namespace is required. Claude additionally requires marketplace/plugin/runtime-path inspection so a dev source marketplace is not mistaken for packaged behavior. Codex additionally requires MCP command/env inspection (`AIOX_SOCKET_PATH`, aiox binary path, and `CODEX_HOME` if persistent config is involved). Authority detail: `history/56` §"QA-003".
- **Status (2026-05-31, 2): closeout 옵션 A 순차(1→2→3) 착수 — Step 1(어댑터) 완료.** 신규 `src/adapters/claude/plugin-cli.ts` `loadClaudePluginInventory({cwd,...})`: `plugin marketplace list --json` + `plugin list --json`을 **cwd 필수**로 실행·파싱(둘 다 --json 지원 확인) → `{marketplaces, plugins}`. 기본 runner는 execFile에 cwd 전달(암묵적 process.cwd() 없음), typed `ClaudePluginCliError`(cli_failed/parse_failed) 파싱 계약. cwd 계약 테스트 2종(주입 runner + execFile mock) + 스키마 실패 테스트. plugin-cli 9 + 전체 **425 PASS**/typecheck green. 어댑터는 아직 미호출(dormant). 권위 `history/53`. **Codex 리뷰 Go for Step 2 + 발견 1건(scope 타입 거짓말) 반영**: `ClaudePluginListEntry.scope`를 `ClaudePluginScope | (string & {})`로 string-widen(캐스트/죽은 KNOWN_SCOPES 제거). 425 PASS 유지. **다음: scope-fix 재리뷰 → 커밋 → 다음 세션 Step 2(invocation wiring) → Step 3(D default).**
- **Status (2026-05-31): Codex 리뷰 GO(조건부) + 발견 2건 반영 완료.** Codex 평결: "core simplification sound, closeout(list-from-cwd 어댑터→preflight→D런처) 진행 OK." 반영: (a) **Medium — `effective[0].installPath` skew 가드**: effective 엔트리 installPath 불일치 시 `ambiguous_install_path`(신규 코드)로 실패 + 테스트, (b) **Low — installPath 주석 약화**(런타임≠캐시, best-effort). preflight 15 + 전체 **416 PASS**/typecheck green. **배선(Next 2) 착수 시 hard 조건**: `plugin list --json` 어댑터가 **명시적 cwd 요구**(`options.cwd` 주입, 암묵적 process.cwd() 금지) + spawn이 `cwd:options.cwd` 받는 단위테스트. 5-포인트 판정 전문 = `history/52` §"Codex 리뷰 결과". **다음 행동: Next 2 배선 착수(closeout 범위 = Next 2 + 3 + 설치 UX).**
- **Status (2026-05-30): SPIKE CLOSED — D 동작·무경고 확정 + Finding 2 해소 + preflight 단순화 적용(Codex 리뷰 대기).** end-to-end smoke PASS(`history/51`). Finding 2(scope precedence) 실측·해소(`history/52`): `plugin list --json`의 `enabled`=cwd-resolved라 list를 사용자 cwd에서 돌리면 project-disabled override가 이미 반영 → preflight false-pass 없음. `installPath`=스코프무관 캐시. MCP-레벨엔 `--json` 없고 `mcp get`은 found/not-found 전부 exit-0이라 불안정 → channel-server 검증=**①installPath fileExists 유지** 결정. **preflight.ts 단순화 적용**(`projectRoot`/`isEffective` 제거, `enabled` 신뢰; 14 preflight + 415 total PASS, typecheck green) — **단 아직 invocation.ts 미배선(dormant), 기본 실행은 여전히 A.** **Codex 세션 만료로 리뷰 지연 → 리뷰 브리프 `history/52` §"코드리뷰 요청"에 작성(스크루티니 포인트 5건).** **R3 closeout 범위 결정(사용자): Next 2(invocation.ts 배선: list-from-cwd 어댑터→preflight→D런처/명확한 에러) + Next 3(토글 승격·A를 dev-only 격하) + 설치 UX `aiox setup claude-plugin --scope user`** 까지 = R3 resolved. npm 패키징(번들 동봉, release-plan B1) / B fallback(`doctor --repair`) / silent-drop(e) 실측 / (E) 배포형태 런타임경로 재측정 = **별개 추적(post-MVP/release)**. **다음 행동: Codex 리뷰 → 통과 후 배선 착수.**
- **Status (2026-05-29): DECIDED — D primary + B fallback + A dev-only** (Codex cross-validation; triangulated user + Claude + Codex all → D). Codex's decisive adds: (1) D's complexity is *controllable* (preflight/idempotency) vs 안1-A's risk *uncontrollable* (Claude-internal phase-ordering); (2) **reversibility asymmetric — D→B cheap, B→D expensive → "D first" even if wrong**; (3) tiering: D primary / B = opt-in escape hatch via `aiox doctor --repair` (not default) / A = dev-only smoke. Codex also surfaced an UNVERIFIED claim: notifications can be **silently dropped** if the channel didn't load or org policy blocks — flag for the spike (sets preflight importance). **Implementation order (risk-minimizing): minimal D spike + preflight failure contract via TDD → non-repo-root manual smoke → THEN retire/replace working-tree A.** QA round stays paused until the spike. Detail: `history/50` §"Decision — Codex cross-validation".
- **R3 closed (2026-05-31).** Shipped: D default(`AIOX_CLAUDE_CHANNEL_STRATEGY` unset|plugin→plugin, inline→legacy, invalid=fail-fast) + inline explicit fallback + `aiox claude-plugin setup` install UX + smoke namespace issue 기록(README/`history/56`). **QA-003(dev/build/release runtime namespace isolation)은 R3 closeout 중 발견됐으나 R3 blocker로 끌어오지 않고 R4(QA4)로 이관** — socket/db/Claude-plugin/Codex-MCP 격리를 별도 round에서 설계·검증.

### R4 (QA4) — dev / build / release runtime namespace isolation

- **Opened (2026-05-31). Carries QA-003.** Scope: 실행 프로파일(dev=`tsx src`, build=`node dist`, release=installed `aiox`)이 같은 runtime namespace를 공유해 검증 결과가 섞이는 문제를 코드 레벨에서 격리한다. 현재는 `getDefaultSocketPath()`가 `AIOX_SOCKET_PATH ?? ~/.aiox/daemon.sock` 단일이고, production DB는 `:memory:` 하드코딩(`src/daemon/run.ts`), 모드 판별 메커니즘 없음(`binPath`의 `.ts`/`.js`로 tsx/node만 구분).
- **합의 = B안 (사용자 + Codex + Claude 3자, 2026-05-31)**: "호출부 집중 + Unix socket 유지". transport `RuntimeEndpoint` union 도입(A안)은 speculative generality라 **기각** → Windows round로 deferred. profile = namespace bundle의 단일 결정자(`resolveProfile()`), 개별 `AIOX_*_PATH`는 path 단위 최우선 escape hatch.
- **Design direction 권위 = `history/57`** (모드 판별 하이브리드 / socket profile 분리·release 하위호환 / DB `:memory:` 유지 + `getStatePath()` scaffold / Unix socket = macOS·Linux 대상 / Windows deferred). Step 1~3 TDD 계획도 `history/57`.
- **Authority**: `history/57-qa-round-4-runtime-namespace-isolation.history.md` (round 권위) + `history/56` §"QA-003" (발견 기록).
- **Type**: investigation → **goal locked** → 구현 (no bug; impl pending).

<!-- ─── 아래는 R3(Claude MCP auto-inject feasibility) 이력 — R4와 무관, 권위 history/49·50. 보존용. ─── -->
#### (R3 archive — Claude MCP auto-inject feasibility)
- **Goal (2026-05-28)**: `aiox claude` must auto-inject the aiox MCP into Claude on every launch, one-off (no permanent `.mcp.json`), like Codex `-c` (`buildCodexMcpArgs`). Scope = aiox MCP auto-injection only — not a manual `--mcp-config` user flag. Authority: `history/49` §Decision.
- **Motivation**: UX symmetry with Codex `-c` one-off MCP injection from any path.
- **Key finding**: aiox is asymmetric — Codex injects MCP via `-c`, but Claude uses dev-channel (`--dangerously-load-development-channels`), a hybrid of outbound MCP tools (`send`/`reply`) + inbound HTTP push. Replacing dev-channel with `--mcp-config` would lose inbound push (MCP is pull-only), but **running both flags together** keeps inbound push *and* adds one-off MCP.
- **Verified**: both flags coexist in one invocation, exit 0 (empty mcp config + `-p`).
- **Deferred** (needs interactive + daemon session): coexistence proof with a real MCP server, inbound-push survival, interactive-mode behavior.
- **Note**: `-p` is not used anywhere in the project path (`launcher.ts:42-45` is `stdio: "inherit"` interactive-only). Name-collision (scenario C) is a non-issue — dev-channel (`channelName`) and mcp-config (`mcpServers` keys) use separate identifier spaces.
- **Decision narrowed (2026-05-29)**: criterion = reliability over file-footprint → **A dropped** (only merit was file-free; depends on undocumented phase-ordering). **D (channel-as-plugin) doc-verified feasible** via `claude-code-guide`: `${VAR}`/`${VAR:-default}` expansion in plugin `.mcp.json`, expansion source = parent `claude` env, `${CLAUDE_PLUGIN_ROOT}`, child env inheritance + `.mcp.json` env merge, activation arg `plugin:<name>@<marketplace>` (→ `--channels` once Anthropic-approved). Both former D blockers (dynamic identity into static `.mcp.json`; npm bundling) resolved by docs. `aiox claude` injects identity via the spawned `claude`'s `env`; static plugin `.mcp.json` holds only `${...}` placeholders; `channel-server` unchanged. **Plugin-scope guard required**: global install = fine anywhere; project-scoped install absent in current project → `aiox claude` must detect pre-spawn and emit a clear CLI error (branch/exception), not fail silently. **Next = integration spike from non-repo-root** (no warning / token delivered via `${VAR}` / inbound push alive / project-scope-missing guard). Working-tree A not committed.
- **Plugin install scope guard (2026-05-29, user — detail)**: plugins install global or project scope. Global = available wherever `aiox claude` runs (no guard). Project scope = enabled only in that project → from a dir/project where the channel plugin is absent, `plugin:<name>@<marketplace>` activation can't resolve. **`aiox claude` MUST detect availability (installed + enabled in current scope) pre-spawn and exit non-zero with a clear CLI error (explicit branch/exception) — never silent, never an opaque dev-channel failure.** Spike defines: detection method + error message (ideally pointing the user at global/project install).
- **`--channels` approval path CLOSED & outside our control (2026-05-29, `claude-code-guide`)**: the two flags differ only by the allowlist check. No public submission path to the Anthropic official allowlist (partner-contact only, not self-serve); only self-ish route = a customer's Team/Enterprise admin adding us to their org `allowedChannelPlugins` (+`channelsEnabled: true` first) — they control it, not us. `channelsEnabled` master switch, when off, blocks BOTH `--channels` and `--dangerously-...` (deploy-time failure mode to guard). GitHub feature-request = petition, not an approval lever (can't add via PR; doesn't list us). **Ship on `--dangerously-load-development-channels`; `--channels` is future-only, contingent on partner relationship or customer org allowlist — NOT schedulable by us.** Building D's `plugin:` shape now is still the prerequisite for either future door. Detail: `history/50` dead-end #4.
- **Authority**: `history/49-claude-mcp-config-injection-feasibility.history.md` + `history/50-...strategy.history.md` (§"Strategy D — doc verification" + dead-end #4 allowlist-approval).

---

## Workflow (매 새 세션 진입 시)

세션 시작 직후 Claude/Codex가 따라야 할 순서. 기존 `AGENTS.md` Step 진행 규칙의 QA 변형.

### 1. Resume — 컨텍스트 복원 (≤ 5분)
- [ ] `plan/qa-tracker.md` 읽기 → `open`/`triaging`/`fixed` 카운트
- [ ] 직전 round history 파일의 "Open items" 섹션 확인
- [ ] `git log --oneline -10` 으로 마지막 세션 이후 픽스 확인
- [ ] `pnpm test` + `pnpm typecheck` 깨끗한 baseline 확인 (실패 시 → QA 진입 전에 수습)

### 2. Plan — 이번 세션 scope 결정
- [ ] 새 round 시작이면 tracker `Rounds` 표에 한 줄 추가 + `history/4N-qa-round-N.history.md` 생성
- [ ] 이번 세션 목표를 한 문장으로 round history 상단에 적기 (예: "claude channel reconnect 시나리오 5개 시도")
- [ ] 기존 `fixed` 이슈 재검증을 우선 처리할지, 새 시나리오 탐사할지 선택

### 3. Execute — QA 실행
시나리오 단위로:
- [ ] round history에 `Scenario / Steps / Expected vs Actual` 기록
- [ ] 버그 발견 → tracker에 `QA-NNN` 한 줄 추가 (status: open)
- [ ] 재현 명령은 카피-페이스트 가능한 형태로 (`aiox …`, sqlite query, log path)
- [ ] 의심되는 코드 위치 (`src/...:line`) 함께 기록

### 4. Delegate — Codex 위임
- [ ] tracker status `triaging`으로 변경
- [ ] Codex 위임 시 전달: round history 파일 경로 + QA-ID + 재현 절차
- [ ] Codex가 픽스 commit 만들면 tracker `Commit` 칸 채우고 status `fixed`
- [ ] 픽스에 대한 결정/근거가 길면 round history에 "Fix notes" 섹션 추가

### 5. Re-verify
- [ ] 같은 시나리오 재실행
- [ ] tracker status `verified`
- [ ] round history 해당 항목 아래 "Re-verify (commit, date, result)" 한 줄

### 6. Close session
- [ ] round history에 "Open items" 섹션 갱신 (다음 세션에 들고 갈 것)
- [ ] tracker 상단 카운트 일치 확인
- [ ] commit: `qa: round N <scope> — N open / N fixed / N verified`
- [ ] (선택) Post-MVP로 이월할 항목이 생겼으면 `prd/post-mvp/`에 한 줄 + tracker status `wontfix`

---

## Convention notes

- **한 시나리오 = 한 QA-ID**. "같은 영역의 또 다른 버그"는 새 ID로 분리.
- **재현 안 되면 close 금지** — `wontfix`로 두고 reason 명시.
- **Codex가 픽스 후 자체 verify 했다고 해서 `verified` 처리 X** — user가 재실행하기 전엔 `fixed`.
- **Round 단위 commit** 대신 issue 단위 commit이 자연스러우면 그쪽 우선. tracker만 정합 유지.

## 다른 문서와의 관계

- `prd/mvp/aiox-mvp-spec.md` — spec 자체 결함이 발견되면 prd 갱신 + tracker `Note` 칸에 prd 변경 cite
- `history/42-mvp-implementation-closeout.history.md` — MVP closeout baseline (test 360개, 48 files). QA는 이 baseline 위에서 진행
- `docs/aiox/` — QA에서 학습/개념 정리가 나오면 docs로 분리, tracker에서 cite
