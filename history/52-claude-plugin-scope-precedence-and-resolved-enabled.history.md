# Claude plugin scope precedence(Finding 2) 실측 + `list --json` `enabled` = cwd-resolved 발견

## Status

- Date: 2026-05-30
- Type: spike 실측 (history/51 §여전히 미확정 "Finding 2 precedence override" 회수 + `${CLAUDE_PLUGIN_ROOT}` 스코프별 경로 의문 해소)
- Continues: `history/51-claude-plugin-list-schema-and-preflight-correction.history.md`, `history/50-...` (R3 strategy D)
- Tracker: `plan/qa-tracker.md` R3
- One line: 우리 채널 plugin을 **user(enabled) + project(disabled)** 충돌 상태로 실제 설치하고 측정 → (1) `installPath`는 스코프 무관 중앙 캐시 확정, (2) **Finding 2 precedence override = 진짜**(project disabled가 user enabled를 cwd에서 덮음), (3) **결정적 발견: `claude plugin list --json`의 `enabled` 필드는 raw per-scope 값이 아니라 "list를 돌린 cwd 기준 resolved effective" 값**. → preflight의 `isEffective` 멘탈 모델이 틀렸으나 false-pass는 아니고, 불필요한 `projectRoot` 의존성으로 false-FAIL 리스크만 짊어진 상태 → 단순화 권장.

## 동기 (왜 측정했나)

두 갈래 의문이 합류:
1. **사용자 질문**: 플러그인 `.mcp.json`의 `${CLAUDE_PLUGIN_ROOT}/channel-server.js` 경로가 설치 스코프(user/project/local)에 따라 어디를 가리키나? (Gemini가 "user=중앙캐시 / project=프로젝트폴더 / local=소스디렉터리 자체"라고 설명 → 검증 요청)
2. **history/51 §여전히 미확정 (Finding 2)**: project/local scope의 *disabled* 엔트리가 user-scope *enabled* fallback을 죽이는지 미측정. preflight 현 로직("effective 엔트리 하나라도 있으면 pass")이 false-pass 날 수 있어 **invocation.ts 배선은 이 확정 후**로 박혀 있었음 (`preflight.ts:124-128` ASSUMPTION 주석).

## 무엇을 했나 (재현 절차)

레포 루트(`/Users/lunaxislu/Documents/ai-orchestration`)에서:

```bash
# 1. 마켓플레이스 등록 + user 스코프 설치
claude plugin marketplace add ./spike/aiox-channel-marketplace      # → user settings에 등록
claude plugin install aiox-channel-ingress@aiox --scope user        # → user: enabled

# 2. project 스코프 설치 후 project 스코프만 disable → 충돌 상태 구성
claude plugin install aiox-channel-ingress@aiox --scope project     # → project: enabled
claude plugin disable aiox-channel-ingress@aiox --scope project     # → project: disabled

# 3. 관찰: list를 서로 다른 cwd에서 / raw settings 직접 확인 / project 재활성 토글
claude plugin list --json        # 레포 루트(=projectPath)에서, 그리고 /tmp에서
#   + ~/.claude/settings.json, ./.claude/settings.json raw 확인
claude plugin enable aiox-channel-ingress@aiox --scope project      # 재활성 → 결과 뒤집힘 확인
```

`claude plugin {install,enable,disable}` 모두 `--scope user|project|local` 지원(기본 install=user, enable/disable=auto-detect). project 스코프 install/disable은 cwd의 `./.claude/settings.json`에 기록.

## 무엇을 확인했나 (증거)

### (A) `installPath` = 스코프 무관 중앙 캐시 — 사용자 질문 해소

user와 project 두 엔트리의 `installPath`가 **바이트 단위로 동일**:

```
scope=user     installPath=~/.claude/plugins/cache/aiox/aiox-channel-ingress/0.1.0   projectPath=(없음)
scope=project  installPath=~/.claude/plugins/cache/aiox/aiox-channel-ingress/0.1.0   projectPath=/Users/.../ai-orchestration
```

보조 증거(기존 설치 플러그인): `fakechat`(scope=local), `frontend-design`/`ui-ux-pro-max`(scope=project) **전부** `installPath`가 `~/.claude/plugins/cache/...` 중앙 캐시. 즉:

- **scope = 활성화 범위(어느 settings 파일이 켰나)**, `projectPath` = 귀속 프로젝트 **메타데이터**, `installPath` = **물리 위치(항상 중앙 캐시)** — 셋이 완전 분리.
- `claude plugin install`은 source→cache **복사**(history/51 / build-plugin.sh 주석)라서, 스코프와 무관하게 본체는 캐시에 산다.
- → **Gemini의 "project면 my-project/.claude/plugins/, local이면 소스 디렉터리 자체" = 틀림.** `${CLAUDE_PLUGIN_ROOT}`는 스코프 무관하게 항상 캐시 경로. preflight가 `entry.installPath + "/channel-server.js"`를 스코프 분기 없이 한 줄로 쓰는 게 옳다는 것도 같이 입증.
- (Gemini가 맞춘 부분: "`${CLAUDE_PLUGIN_ROOT}`는 상대적이 아니라 절대적, 런타임 주입, 길 안 잃음" = 정확. 큰 줄기는 맞고 스코프별 경로 디테일만 틀림.)

### (B) Finding 2 precedence override = 진짜

raw settings 직접 확인:

```
USER    ~/.claude/settings.json  enabledPlugins: { "aiox-channel-ingress@aiox": true }   ← enabled
PROJECT ./.claude/settings.json  enabledPlugins: { "aiox-channel-ingress@aiox": false }  ← disabled
```

→ raw 상태는 정확히 user:true + project:false. 이 cwd에서 plugin은 **실효적으로 OFF**(아래 C 참조). **project-scope disabled가 user-scope enabled를 해당 프로젝트 cwd에서 덮는다** = history/50/51이 우려한 precedence override 확정.

### (C) (핵심) `list --json`의 `enabled` = raw가 아니라 cwd-resolved effective

같은 충돌 상태에서 `list`를 **서로 다른 cwd에서** 돌린 결과:

| `claude plugin list --json` 실행 위치 | user 엔트리 `enabled` | project 엔트리 `enabled` |
|---|---|---|
| `…/ai-orchestration` (cwd = projectPath) | **false** | **false** |
| `/tmp` (cwd 밖) | **true** | **true** |
| project 재-enable 후 `…/ai-orchestration` | **true** | **true** |

해석(ai-orchestration 행이 disambiguator): user **raw=true**인데 project cwd에서 list가 user 엔트리를 **false**로 내놓음 → `enabled`가 raw per-scope였다면 true여야 함 → 따라서 **`enabled`는 "list를 돌린 cwd에서 이 plugin이 실효적으로 켜졌나"라는 단일 resolved 값이고, 같은 id의 모든 엔트리에 동일하게 스탬프**된다. project cwd에선 project override(false)가 이기고, /tmp에선 user fallback(true)만 적용. project 토글만으로 user 불변인 채 결과가 false↔true 뒤집힘 = project가 in-cwd 결정권자라는 닫힌 증명.

부수 모순 신호: `claude plugin enable … --scope user`가 *"이미 user 스코프에서 enabled"* 로 거부하는데 같은 순간 `list --json`은 user 엔트리를 `enabled:false`로 보고 → enable/disable은 **raw 설정**을 보고, list는 **resolved**를 보고한다는 같은 결론.

## 그래서 어떻게 생각하나 (reasoning → preflight 함의)

현재 `src/adapters/claude/preflight.ts`의 `isEffective`(L177)는 **`entry.enabled`를 raw per-scope 플래그로 가정**하고 그 위에 `scope + projectPath===projectRoot`로 cwd-effectiveness를 **직접 재계산**한다. 실측은 이 전제가 틀렸음을 보인다 — `enabled`는 **이미** cwd-resolved이다. 귀결:

- ✅ **false-pass 없음**: list를 사용자 cwd에서 돌리면 resolved-false 엔트리는 `!entry.enabled` 게이트에서 걸러진다. → history/51 ASSUMPTION 주석의 false-pass 우려 **해소**.
- ⚠️ **불필요한 false-FAIL 리스크**: project-scope-only로 정당하게 effective한 케이스에서 preflight가 `projectRoot`를 잘못 탐지/undefined면 `isEffective`가 false를 반환해 멀쩡한 plugin을 막는다. 즉 현 코드는 **안 해도 될 projectRoot 탐지 의존성**을 새 버그면으로 짊어졌다.

**권장(단순화) — 다음 패스에서 적용 제안:**
1. 전제 계약: preflight는 `claude plugin list --json`을 **사용자 cwd(=invocation `options.cwd`)에서 spawn**한다. 이게 유일한 load-bearing 조건(그래야 Claude의 resolution이 실제 `aiox claude` 실행 위치와 일치).
2. effective 판정 = `matching.some(e => e.enabled)` 한 줄. installPath는 아무 matching 엔트리에서(모두 동일).
3. `isEffective` / `projectRoot` 입력 / `projectPath` 비교 로직 **제거**. `plugin_not_enabled` 메시지는 유지하되 project-vs-user 분기 문구는 단순화.
4. `ClaudePluginListEntry`의 `enabled` 주석을 "raw per-scope"가 아니라 **"list 실행 cwd 기준 resolved effective"** 로 정정. `projectPath`는 진단 메시지용 메타데이터로 격하(effective 판정엔 미사용).

이 변경은 **순수 단순화 + 정확성 개선**이며 false-pass를 막던 안전성은 `enabled`(이제 Claude 자신의 resolution을 상속)가 그대로 보장한다.

## 후속 측정 (같은 세션): `claude mcp list` behavioral probe + 런타임 경로 wrinkle

사용자 요청("`/mcp` TUI 말고 비대화식으로 특정 plugin MCP 서버 뜬 걸 볼 명령 있나")으로 `claude mcp list`를 probe로 사용.

### (D) behavioral ground truth — precedence 1mm 닫힘

`claude mcp list`는 cwd-resolved로 plugin MCP 서버를 노출(health-check 포함):

```
# project ENABLED (resolved=true), cwd=ai-orchestration:
plugin:aiox-channel-ingress:aiox-claude-ingress: node .../channel-server.js - ✗ Failed to connect
#  ("Failed to connect" = daemon/env 없어 당연. 존재 여부가 signal)

# project DISABLED (resolved=false), 같은 cwd:
#  → 라인 자체가 사라짐 (서버 미로드)
```

→ **resolved-false면 plugin MCP 서버가 실제로 로드되지 않는다**가 비대화식으로 입증. (C)의 list `enabled` resolution이 런타임 로딩과 일치함을 behavioral로 확인 = Finding 2 최종 확정. **probe 레시피: `claude mcp list | grep "plugin:<pluginName>:"` 존재 = 이 cwd에서 effective.**

### (E) 런타임 `${CLAUDE_PLUGIN_ROOT}` = 캐시가 아니라 **소스 디렉터리** (directory-source marketplace)

`mcp list`가 보여준 실행 경로가 `installPath`(캐시)가 **아니라** 마켓플레이스 **소스** 경로였음:

- `plugin list --json` `installPath` = `~/.claude/plugins/cache/aiox/aiox-channel-ingress/0.1.0` (실제 복사본; `channel-server.js` 924K + `.mcp.json` + `.claude-plugin` 존재 확인)
- `mcp list` 런타임 경로 = `…/spike/aiox-channel-marketplace/plugins/aiox-channel-ingress/channel-server.js` (**소스**)
- 캐시 `0.1.0`은 symlink **아님**(실제 dir). marketplace source type = `directory`(로컬 dev 마켓플레이스).

해석: **directory-source(로컬 dev) 마켓플레이스의 경우 Claude는 install로 캐시 복사를 만들면서도 런타임 `${CLAUDE_PLUGIN_ROOT}`는 살아있는 소스 디렉터리로 resolve**한다(dev 편집 즉시 반영 목적 추정). 즉 `installPath`(메타데이터) ≠ 런타임 실행 루트. → history/51 entry-guard symlink "비발현"의 진짜 이유도 이것: symlink가 아니라 애초에 소스에서 직접 실행돼서 가드가 어긋날 일이 없었음.

이로써 사용자 원질문에 **부분 단서**가 추가됨: Gemini의 "local/dev이면 소스 디렉터리 자체" 직관은 **scope 때문이 아니라 marketplace source type(directory) 때문**에 부분적으로 맞다. 단 우리가 측정한 user/project 두 엔트리 모두 같은 directory-source라 런타임=소스였던 것이고, **copied/git source 마켓플레이스(=npm 배포 형태)에서는 캐시 실행이 될 수 있어 별도 측정 필요**.

**preflight 함의 보강(중요):** preflight의 channel-server 존재 검증이 `entry.installPath + "/channel-server.js"`(캐시)인데, 런타임은 소스에서 돌 수 있어 **검증 대상과 실행 대상이 다를 수 있다**. 우리 케이스는 캐시·소스 둘 다 파일 존재라 통과하지만 잠재 갭. 두 방향:
- (가) installPath fileExists는 best-effort로 남기고, 진짜 "실효적으로 로드되나"는 `claude mcp list | grep plugin:<name>:` 한 줄로 검증(= effectiveness + 실제 경로 + health를 Claude가 직접 답). 단 health-check가 서버를 spawn(부작용·느림)하고 텍스트 파싱(--json 옵션 없음)이라 brittle.
- (나) 정식 배포는 directory-source가 아닐 수 있으니, 배포 형태에서 런타임 경로(캐시 vs 소스)를 한 번 더 측정해 (E)의 일반성을 확정한 뒤 결정.

## (F) MCP-레벨 probe 명령 조사 + preflight 검증 방식 결정 → ① installPath fileExists

사용자 질문("`mcp get` / `mcp list --json <plugin>`로 특정 MCP plugin 설치 여부 판단 가능한가, 불안정한가")으로 실측:

- `claude mcp list --json` → `error: unknown option '--json'`. **mcp list엔 --json 없음.**
- `claude mcp list <name>` (positional) → 무시, 전체 목록 출력. **plugin명 필터 인자 없음.**
- 특정 서버 조회 = `claude mcp get "plugin:<plugin>:<server>"` 가 **유일** — 단 텍스트 출력(key:value), `--json` 미지원(`error: unknown option`). 이름은 풀네임 `plugin:Notion:notion` 형태.
- **결정타**: `mcp get`은 found / not-found / bogus **전부 exit 0**. not-found는 `No MCP server found with name: "..." Configured servers: ...`를 출력하지만 exit는 0 → `$?`로 present/absent 판단 **불가**, **미문서 텍스트 파싱 강제**.

→ MCP 레벨엔 구조화 JSON이 없다(JSON은 `plugin list --json` 한 곳뿐). `mcp get` boolean 판정의 불안정 요인: (1) exit-0 일관 → 미문서 메시지 파싱, (2) `Status: ✗`는 health-check가 우리 `AIOX_*` env 주입 전 시점에 돌아 **present-여부와 working-여부를 혼동**(설치됐어도 ✗ 가능), (3) health-check가 서버를 spawn하는 side-effect+지연, (4) `plugin:<n>:<s>` 미문서 이름 조립 결합.

**결정(사용자): preflight의 channel-server 검증 = ① `installPath` fileExists(`plugin list --json` 기반) 유지.** 근거: 유일한 구조화 JSON(`enabled`가 cwd-resolved임을 이번 세션 측정) 위에서 health-check side-effect 없이 동작. (E)의 installPath(캐시)≠런타임(소스) 갭은 **best-effort로 수용**, 일반성은 배포 패키징 단계에서 재측정. ②(mcp grep 교체)·③(hybrid)는 위 (1)~(4) brittleness로 기각.

## 미측정/잔여 (정직하게)

- **managed 스코프 미측정**: user/project 직접 측정 + local은 기존 `fakechat` 엔트리로 installPath=캐시만 확인. managed 미접촉.
- **(E) 일반성**: directory-source 마켓플레이스에서만 "런타임=소스" 측정. copied/git-source(=npm 배포 형태)에서 캐시 실행인지 미측정 — 배포 패키징 때 확정 필요.
- **silent-drop (history/51 (e))**: plugin 미설치/scope-miss 시 exit/notice 양상 별개 미측정.
- **silent-drop (history/51 (e))**: plugin 미설치/scope-miss 시 exit/notice 양상은 여전히 별개 미측정 항목.

## 현재 환경 상태 — 원복 완료

측정 직후 전부 원복(`claude plugin uninstall … --scope user/project` + `claude plugin marketplace remove aiox`):
- `~/.claude/settings.json`: aiox marketplace/plugin 키 제거 확인(타 plugin 무손상).
- `./.claude/settings.json`: project install이 새로 만든 파일(`{"enabledPlugins":{}}`)이라 삭제. **기존** `./.claude/settings.local.json`(5월 28 permissions 파일)은 보존.
- 캐시 `~/.claude/plugins/cache/aiox/…` 제거. `git status .claude/` 클린.

## 코드리뷰 요청 (Codex — 세션 만료로 지연, 복귀 시 리뷰 바람)

이번 세션에 **Next 1 (preflight 단순화)를 실제 적용**했다(Codex 세션 만료로 cross-validation 미수행 → 아래는 리뷰 대상 요약). 작업트리 변경(미커밋):

- `src/adapters/claude/preflight.ts` — `projectRoot` 입력 + `isEffective()` 헬퍼 제거. effective 판정을 `matching.filter(p => p.enabled)`로 교체. `ClaudePluginListEntry.enabled` 주석을 "raw per-scope"→"cwd-resolved effective"로 정정, `projectPath`를 진단용으로 격하. 헤더에 EFFECTIVENESS 계약(list를 사용자 cwd에서 spawn) 명시.
- `tests/unit/adapters/claude-preflight.test.ts` — fixture를 cwd-resolved 의미로 갱신(`projectRoot` 제거, `userEntry(enabled)` 파라미터화). "다른 프로젝트" 케이스를 `enabled:false`로 현실화. **history/52 precedence-override 회귀 테스트 추가**(user:false+project:false → plugin_not_enabled, false-pass 금지 가드).

검증: preflight 14 tests PASS / 전체 **415 tests PASS** / `pnpm typecheck` green / preflight 외부 참조 없음(아직 invocation.ts 미배선이라 인터페이스 breaking이어도 영향 0).

핵심 변경(effectiveness block) before→after:
```
- const effective = matching.filter((p) => isEffective(p, input.projectRoot)); // scope+projectPath 재계산
+ const effective = matching.filter((p) => p.enabled);                          // Claude가 이미 resolve한 enabled 신뢰
```

**리뷰 시 집중 검토 요청(스크루티니 포인트):**
1. **근거의 견고성**: 단순화 전체가 "(C) `list --json` `enabled`=cwd-resolved" MEASURED 사실에 의존. 증거(§(C) 표: project cwd→false·false / /tmp→true·true / 토글)가 이 결론을 충분히 지지하는지, raw per-scope 해석으로 되돌릴 반례가 없는지.
2. **load-bearing 계약이 현재 주석뿐**: "list를 `options.cwd`에서 spawn"이 깨지면 resolution이 어긋나 false-pass/fail 가능. invocation.ts 배선 시 어댑터가 `cwd: options.cwd`로 spawn하도록 강제할 지점 — 코드 계약(타입/런타임 가드)으로 끌어올릴지 의견.
3. **`effective[0].installPath` 가정**: 같은 id의 모든 엔트리가 installPath 동일(측정)이라 [0] 사용. version skew 등으로 스코프별 installPath가 갈리는 케이스가 실재하면 [0]이 틀릴 수 있음 — 방어 필요 여부.
4. **(E) channel_server_missing의 best-effort 성격**: directory-source 마켓플레이스는 런타임 `${CLAUDE_PLUGIN_ROOT}`=소스(≠installPath 캐시)라 캐시 파일 검증이 실제 실행 파일과 어긋날 수 있음. 이 검증을 (a)유지(현행) (b)배포형태 재측정까지 약화/보류 중 택. Codex 판단 요청.
5. **회귀 안전성**: projectRoot/projectPath 기반 판정을 제거해도 "정당하게 effective한 plugin이 막히는" false-FAIL 신규 케이스가 없는지(논거: enabled가 이미 cwd-effectiveness를 인코딩).

리뷰 후 Next 2(invocation.ts 배선)로 진행 예정.

## Codex 리뷰 결과 (2026-05-31) + 반영

**평결: GO (조건부)** — "core simplification 자체는 sound. list-from-cwd 어댑터→preflight→D런처 closeout 진행 OK. 조건: (a) 어댑터에서 cwd를 강제 + 테스트, (b) preflight를 release 신뢰성 코드로 취급하기 전 installPath-skew 가드 추가."

발견 2건 → **둘 다 즉시 반영(이 세션):**
- **Medium/behavioral — `effective[0].installPath` skew**: history/52는 "현재 installPath 동일"만 입증했지 같은 id가 scope/version skew로 다른 installPath를 보고하지 않는다는 보장은 아님. stale user-scope + newer project-scope 공존 시 [0]이 엉뚱한 물리 아티팩트를 검증할 수 있음. → **반영: effective 엔트리들의 installPath가 불일치하면 `ambiguous_install_path`(신규 실패코드)로 명확히 실패**(Codex 권장안 a: invariant 체크). 회귀 테스트 추가. (권장안 b "precedence로 선택"은 ordering 미측정이라 보류.)
- **Low/structural — 주석**: `installPath`가 "런타임 `${CLAUDE_PLUGIN_ROOT}` resolves here"는 (E)와 충돌(directory-source는 소스로 resolve). → **반영: "plugin list가 보고하는 캐시 경로(런타임≠일 수 있음, best-effort)"로 약화.**

**2차 패스(2026-05-31)**: Codex가 1차 반영 후 잔여 모순 1건 추가 지적 — 상단 SCHEMA 주석(preflight.ts:12)이 아직 "installPath = cache dir where `${CLAUDE_PLUGIN_ROOT}` resolves"로 line 44/90 정정과 충돌. → "installed cache dir reported by `plugin list` (런타임 `${CLAUDE_PLUGIN_ROOT}`≠일 수 있음)"로 일치시킴. Codex: "그 외 OK. `ambiguous_install_path`는 union/분기/메시지/회귀 테스트까지 연결, effective[0] blind-pick 리스크는 닫혔다고 봐도 된다." 잔여 `resolves here` 표현 0 확인.

5-포인트 판정: ①근거 견고성 OK(§C가 충분; user raw=true인데 project cwd에서 false가 raw 해석으로 설명 불가) ②load-bearing 계약 **수정요망=배선 단계**(주석만으론 부족, 어댑터가 명시적 cwd 요구 + spawn이 `cwd:options.cwd` 받는 단위테스트) ③installPath skew **수정요망=완료** ④channel_server best-effort **유지 OK**(mcp get/list 파싱으로 대체 금지, 배포형태서 재측정) ⑤false-FAIL 회귀 OK(단 ②조건부 — 잘못된 cwd서 list 돌리면 깨짐).

반영 후: preflight 15 tests + 전체 **416 PASS** / typecheck green.

**배선 단계로 이월된 hard 조건(Next 2 착수 시 필수):**
- 어댑터(`claude plugin list --json` 실행)는 **명시적 cwd 인자 요구**, `invocation.ts`가 `options.cwd` 주입. 어댑터 내부 암묵적 `process.cwd()` 금지(invocation이 고르는 단일 default만 허용). **spawn이 `cwd: options.cwd`를 받는다는 단위테스트 추가.**

## Next

1. ✅ **적용 완료 (+ Codex 리뷰 2건 반영)** — preflight 단순화 — `enabled`(cwd-resolved) 신뢰: effective = `matching.some(e=>e.enabled)`. `isEffective`/`projectRoot` 입력 제거, `projectPath`는 진단 메시지용으로만 유지. channel-server 검증 = **① installPath fileExists 유지**(F절). 전제 계약: `claude plugin list --json`을 `options.cwd`에서 spawn. `ClaudePluginListEntry.enabled` 주석을 "raw per-scope"→"list 실행 cwd 기준 resolved effective"로 정정. 테스트 갱신.
2. invocation.ts 배선(Finding 2 확정으로 unblock): `claude plugin list --json` 어댑터(cwd=options.cwd로 spawn) → preflight → 통과 시 `launchClaudePluginChannel`, 실패 시 non-zero + 안내.
3. silent-drop(e) 측정 / (E) 배포형태 런타임경로 재측정은 배선과 독립적으로 병행 가능.
