# QA Round 4 — dev / build / release runtime namespace isolation

## Status

- Date: 2026-05-31 ~
- Round: R4 (QA4) — carries **QA-003**
- Type: investigation → **goal locked** → 구현 (no bug; impl pending)
- Tracker: `plan/qa-tracker.md` R4 섹션
- Continues / record source: `history/56` §"QA-003" (발견 기록, R3 closeout 중)
- One line: 실행 프로파일(dev=`tsx src` / build=`node dist` / release=installed `aiox`)이 같은 runtime namespace(socket·state·external config)를 공유해 검증 결과가 섞이는 문제를, **profile별 namespace 분리**로 코드 레벨에서 격리한다.

## Round Goal

`dev` / `build` / `release` 세 프로파일을 **하나의 `resolveProfile()`가 결정**하고, socket·(미래) DB path가 그 profile에서 파생되도록 한다. 한 모드가 띄운 daemon에 다른 모드가 붙어 false PASS/FAIL이 나는 것을 구조적으로 막는다.

## 결정 (확정 — 사용자 + Codex + Claude 3자 합의 2026-05-31)

합의 명칭 = **B안** ("호출부 집중 + Unix socket 유지"). transport union 타입 도입(A안)은 기각.

1. **R4는 transport abstraction round가 아니다.** 목표는 dev/build/release **profile namespace isolation**에 한정한다.
2. **profile = namespace bundle의 단일 결정자.** `resolveProfile()`이 한 번 `dev|build|release`를 정하면 socket·DB·(미래 Codex `CODEX_HOME`)가 전부 거기서 파생된다. path를 따로 관리하지 않는다 → "dev인데 socket은 release를 본다" 같은 어긋남이 구조적으로 불가능.
   - 묶는 축: `resolveProfile()` → 단일 bundle
   - 푸는 축(escape hatch): 개별 `AIOX_*_PATH` env가 path 단위로 **항상 최우선** override
3. **모드 판별 = 하이브리드.** `AIOX_PROFILE` env 우선 → 없으면 `process.argv[1]`(binPath) 자동감지(`*.ts`→dev / `node_modules` 포함→release / `/dist/` 포함→build / 그 외→release). pnpm dev·build script에 profile 주입, 설치본은 자동 release. (자동감지-only는 install 경로 휴리스틱이 fragile해서 기각, env-only는 깜빡 위험.)
4. **socket path.** `AIOX_SOCKET_PATH`(절대경로 명시) 최우선 → profile별 `~/.aiox/{dev,build}/daemon.sock` → **release는 `~/.aiox/daemon.sock` 유지(하위호환)**.
5. **DB = scaffold만.** 현재 production daemon은 `:memory:`(`src/daemon/run.ts`) 유지. `paths.ts`에 profile별 `getStatePath()`만 정의(미호출 dormant). socket 분리 = process 분리 = in-memory state 분리라 현재로선 충분. 파일 DB 전환 시 같은 profile 메커니즘에 얹는다(`AIOX_DB_PATH` 명시 최우선).
6. **지원 transport = Unix domain socket, 즉 macOS/Linux 대상.** Windows support는 **deferred** (별도 round). 단, socket 결정 지점(`src/daemon/socket-transport.ts` listen/connect + `paths.ts` resolver)을 **한 곳으로 집중**해 미래 Windows round에서 named pipe / TCP loopback으로 교체 가능한 자리를 남긴다.
   - **`RuntimeEndpoint` discriminated union 타입은 지금 도입하지 않는다.** 단일 variant union은 speculative generality(미구현 variant의 dead branch + Windows transport 형태 추측). 실제 2번째 케이스를 짤 때 추상화의 올바른 모양이 드러난다. 호출부가 이미 집중돼 있으면 그때 그 한 곳만 union으로 확장하는 reversible cost가 미리 박는 것과 거의 같다.

### 옵션 비교 (합의 근거 보존)

| 안 | 내용 | 장점 | 단점 | 판정 |
| --- | --- | --- | --- | --- |
| A | 지금 `RuntimeEndpoint` union 도입 | 타입상 미래 transport 표현 | 미구현 variant dead branch, Windows 형태 추측, 나중에 타입 모양 변경 가능성 큼 | **기각** (deferrable) |
| **B** | **호출부 집중 + Unix socket 유지** | R4 scope에 딱 맞음, speculative generality 회피하면서 Windows 확장 지점 남김, 공개 계약 거의 안 흔듦 | Windows round 때 union/abstraction을 그 시점에 새로 도입 | **채택** |
| C | manual env(`AIOX_SOCKET_PATH`) 수동 유지 | 코드 변경 최소 | QA-003 재발 방지를 코드가 보장 못함, R4 하는 의미 약화 | 기각 |

## 현재 코드 (2026-05-31 확인)

- socket: `getDefaultSocketPath()` = `AIOX_SOCKET_PATH ?? ~/.aiox/daemon.sock` 단일 (`src/config/paths.ts`). 소비처는 `src/bin/aiox.ts:81` 단일(`options.socketPath ?? getDefaultSocketPath()`).
- 실제 transport 결정 지점 2곳: `src/daemon/socket-transport.ts:281`(`net.createConnection`) / `:429`(`server.listen(socketPath, …)`). 이미 `socketPath`를 인자로 받아 B안 "호출부 집중"이 거의 성립.
- db: production daemon `:memory:` 하드코딩 (`src/daemon/run.ts:25`). 파일 DB 미존재.
- 모드 판별 메커니즘 없음 — `resolveDaemonForkCommand`(`src/bin/aiox.ts:166`)가 binPath `.ts`/`.js`로 tsx/node만 구분.

## Baseline 확인

- [x] `git log --oneline -8` — 직전 commit `2336104` (R3 closeout)
- [x] `pnpm test` — 51 files / **467 tests** PASS
- [x] `pnpm typecheck` — green
- [x] `plan/qa-tracker.md` — QA-003 open(R4로 이관), 나머지 verified/resolved

## Steps (TDD)

- **Step 1 — `paths.ts` profile 코어.** `resolveProfile(env,argv)` / `getSocketPath(profile,env)` / `getStatePath(profile,env)`. 회귀 가드 테스트 먼저: ① `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` 최우선 ② release 경로(`~/.aiox/daemon.sock`) 불변. `getStatePath`는 정의만(`run.ts`는 `:memory:` 유지).
- **Step 2 — 배선 + script env 주입 [behavioral].** `bin/aiox.ts`가 `getSocketPath(profile)` 사용, `package.json` dev/build script에 `AIOX_PROFILE` 주입, `socket-transport.ts` listen/connect에 Windows deferral 주석. 설치본 자동 release 확인.
- **Step 3 — external config 검증 + smoke.** Claude marketplace/plugin runtime path(dev source marketplace를 packaged behavior로 오인 방지: `plugin marketplace list --json` + `plugin list --json`) / Codex MCP command·env(`AIOX_SOCKET_PATH`, aiox binary path, persistent면 `CODEX_HOME`)가 의도한 namespace 가리키는지. README "Smoke Namespace" 수동 가이드를 profile 자동분리로 대체.

## Step 1 — DONE (2026-05-31)

- `src/config/paths.ts`: `AioxProfile` + `resolveProfile(env, binPath)` / `getSocketPath(opts)` / `getStatePath(opts)` 추가. `getDefaultSocketPath`·`run.ts`(`:memory:`)는 미변경 → **behavioral 변화 0 (dormant)**.
- 자동감지 휴리스틱: `.ts`→dev / `node_modules`→release(설치본이 자기 dist 동봉하므로 dist보다 우선) / `/dist/`→build / else→release.
- `getStatePath`는 순수 함수(dir 생성 안 함) — 부작용/path 계산 분리. `getSocketPath`만 profile dir을 mkdir.
- **override absolute 계약 코드로 닫음** (Codex finding #1): `AIOX_SOCKET_PATH`/`AIOX_DB_PATH`가 상대경로면 fail-fast(`requireAbsoluteOverride`). 상대경로는 child process cwd마다 재해석돼 namespace isolation을 다시 흐리므로 설정 오류로 처리.
- 테스트 `tests/unit/config/paths.test.ts` — 16 tests (override 최우선/absolute 거부 + release 불변 + profile bundle 그룹 + 휴리스틱). 전체 483 PASS, typecheck green.

## Open items (다음 세션에 들고 갈 것)

- **Step 2 next (behavioral)**: `bin/aiox.ts`를 `getSocketPath`로 교체 + `package.json` dev/build script에 `AIOX_PROFILE` 주입 + `socket-transport.ts` listen/connect에 Windows deferral 주석.
- Step 3: external config 검증 + smoke.
