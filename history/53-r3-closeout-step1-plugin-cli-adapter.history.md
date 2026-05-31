# R3 closeout 구현 — Step 1: claude plugin CLI 어댑터 (cwd-required inventory)

## Status

- Date: 2026-05-31
- Type: 구현 (R3 closeout, 옵션 A 순차 1→2→3 중 **Step 1**)
- Continues: `history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md` (preflight 단순화 + Codex GO)
- Tracker: `plan/qa-tracker.md` R3
- One line: preflight에 먹일 plugin inventory를 `claude` CLI에서 읽는 어댑터(`plugin-cli.ts`)를 추가. **cwd를 필수 인자로** 받아 `plugin marketplace list --json` + `plugin list --json`을 그 cwd에서 실행·파싱 → Codex 리뷰의 load-bearing 계약("list를 사용자 cwd에서 spawn")을 **코드로** 닫음. 어댑터만(순수 inventory), preflight 호출/invocation 배선은 Step 2.

## 왜 순차(옵션 A) + 왜 Step 1부터

Codex/사용자 합의(옵션 A): 1(adapter) → 2(invocation preflight wiring) → 3(D default + A dev-only). 근거: cwd 계약·preflight 실패 계약·D 기본화 리스크를 독립 검증; 1의 파싱이 흔들려도 2/3 미오염; 되돌림 비용 3이 최대라 마지막. **Step 1이 최우선인 이유**: history/52에서 `enabled`=cwd-resolved 단순화의 load-bearing 계약("list를 사용자 cwd에서 실행")이 아직 코드로 닫히지 않았음 → 여기서 닫는다.

## 무엇을 했나

신규 `src/adapters/claude/plugin-cli.ts`:
- `loadClaudePluginInventory({ cwd, command?, run? }) → { marketplaces: string[]; plugins: ClaudePluginListEntry[] }`.
- **`cwd` 필수**(타입 레벨 required). 두 명령(`plugin marketplace list --json`, `plugin list --json`) 모두 이 cwd에서 실행. 둘 다 `--json` 지원 확인됨(실측) → 텍스트 파싱 없음.
- 기본 runner `createClaudeCliRunner(command?)`: `execFile(bin, args, { cwd, maxBuffer:16MB }, cb)` — **cwd를 자식 프로세스에 전달, 어댑터 내부 암묵적 `process.cwd()` 없음**(Codex 조건). `bin`=command ?? `AIOX_CLAUDE_COMMAND` ?? `claude`(launcher와 동일 규약). promisify 대신 수동 Promise 래핑(child-process 경계 mock 용이).
- 파싱 계약: `plugin list`/`marketplace list` 출력이 JSON 배열이 아니거나 스키마 위반 시 typed `ClaudePluginCliError`(code: `claude_plugin_cli_failed` | `claude_plugin_cli_parse_failed`). preflight가 의존하는 필드(`id`:non-empty string, `enabled`:boolean, `scope`:string)는 strict; `version`/`installPath`/`projectPath`는 present면 string 검증 후 보존, 없으면 prune; **scope 미지값은 lenient**(effectiveness는 `enabled`가 결정하므로 새 scope가 preflight를 깨면 안 됨 — false-FAIL 회피). 실 출력의 잡필드(`installedAt`/`lastUpdated`/`mcpServers`)는 무시.
- env/channelsEnabled/fileExists 조립은 어댑터 범위 밖(Step 2의 invocation이 채움).

신규 `tests/unit/adapters/claude-plugin-cli.test.ts` (9 tests):
- 해피패스: marketplaces 이름 추출 + plugins 파싱(잡필드 drop, projectPath 보존/부재 정확).
- **cwd 계약 2종**: (i) 주입 runner가 두 명령 모두 `cwd: options.cwd`로 호출됨을 단언, (ii) **기본 runner가 `execFile`에 `cwd`를 전달**함을 `node:child_process` mock으로 단언(암묵적 cwd 금지 회귀 가드).
- 실패 계약: runner reject→`claude_plugin_cli_failed`; 비-JSON→`parse_failed`; plugin `id` 누락→parse_failed; `enabled` 비boolean→parse_failed; marketplace `name` 누락→parse_failed.
- lenient scope: 미지 scope 통과(진단용).

## 결과

- plugin-cli 9 tests + 전체 **425 PASS** / `pnpm typecheck` green.
- 기존 코드 무침범(어댑터는 아직 어디서도 호출 안 됨 = dormant, preflight와 동일). 기본 실행 경로 여전히 A.

## Codex 리뷰 (2026-05-31) + 반영

**평결: Go for Step 2.** 5-포인트 전부 OK(① cwd 계약 닫힘 — required + 양쪽 runner 테스트 / ② strict/lenient 경계 적절 / ③ execFile+manual Promise 타당, maxBuffer 충분, stderr 미보존 non-blocking / ④ 2-코드 분류 충분, ENOENT 별도는 과분 / ⑤ `{marketplaces,plugins}` 경계 깨끗). 발견 1건:

- **Low/structural — scope 타입이 거짓말**: 런타임은 unknown scope 허용(lenient)인데 타입은 `o.scope as ClaudePluginScope`(좁은 union)로 캐스팅 → 나중에 exhaustive switch가 "unknown scope 불가능"이라 잘못 믿을 수 있음. **반영**: `ClaudePluginListEntry.scope`를 `ClaudePluginScope | (string & {})`로 string-widen(known 리터럴 자동완성 유지 + 임의 string 허용), plugin-cli의 캐스트·죽은 `KNOWN_SCOPES` 블록 제거하고 `o.scope` 직접 대입. typecheck green / 전체 425 PASS 유지.

다음: 이 fix Codex 재리뷰 → 통과 시 커밋 → **다음 세션 Step 2** 착수.

## Next (남은 closeout)

- **Step 2 — invocation preflight wiring**: claude attach 경로에서 `loadClaudePluginInventory({ cwd: options.cwd })` 호출 → `PreflightClaudePluginInput` 조립(+ env/channelsEnabled/fileExists) → `preflightClaudePlugin` → `ok:false`면 코드별 메시지로 non-zero `InvocationError`, `ok:true`면 `launchClaudePluginChannel`(D). 어댑터 spawn cwd가 `options.cwd`임을 invocation 레벨에서도 보장.
- **Step 3 — D default + A dev-only**: `AIOX_SPIKE_STRATEGY_D` 토글 승격/제거, D 기본화, A는 명시적 dev/debug fallback. (release behavior 변경이라 마지막.)
- 별개 추적(history/52): npm 패키징(release-plan B1) / B fallback / silent-drop(e) / (E) 배포형태 런타임경로 재측정.
