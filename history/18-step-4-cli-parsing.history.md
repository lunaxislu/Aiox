# Step 4 CLI Command Parsing

> 작성일: 2026-05-18
> 작성자: Claude (Opus 4.7) — codex와의 위임 cross-validation 라운드 3회
> 관련 기록:
> - `history/17-step-3-daemon-api-lifecycle.history.md` (Step 3 마감 + Step 4 진입 조건)
> - `plan/mvp-implementation-checklist.md` (Step 4 본문)
> - `prd/mvp/aiox-mvp-spec.md` (line 36–158 13개 명령 명세)

---

## 배경

Step 3 (daemon API + lifecycle shell on fake transport) 마감 직후 Step 4 — "CLI
command parsing tests" — 에 진입함. 목표는 **13개 명령 모두를 parser layer
에서 검증하는 것**. 즉 daemon API 호출(invocation)은 다음 step에서 다루고, Step
4는 사용자 입력 → typed `ParsedCommand` 변환과 invalid input 처리에 집중.

본 문서는 **다음 세션의 codex가 한 화면에서 맥락을 잡을 수 있도록** Step 4 진입
부터 minor follow-up까지의 결정 흐름과 보류 항목을 한 곳에 기록한다.

---

## 진행 방식

Step 3와 동일한 패턴 — 사용자 → Claude (대화) → codex (위임) 라운드 3회. 매
라운드 직전에 직전 라운드의 minor 지적을 먼저 처리하는 **"Previous Round Minor
Follow-ups"** 패턴이 Round 2부터 정착됨 (Step 5+에도 그대로 적용 예정).

### Round 1 — parser 골격 + daemon lifecycle 5개

| commit | 내용 |
|---|---|
| `a00eb33` | `behavior: add CLI parser skeleton with daemon start` |
| `4a9e164` | `behavior: add daemon lifecycle parsers and invalid input handling` |

### Round 2 — Round 1 minor + agent attach + routing

| commit | 내용 |
|---|---|
| `e58cbb3` | `refactor: normalize CLI error code namespace` (Round 1 minor) |
| `74c08ab` | `behavior: handle commander help and version output` (Round 1 minor) |
| `a7a7418` | `behavior: add agent attach parsers (codex, claude)` |
| `707abf1` | `behavior: add routing parsers (connect, disconnect)` |

### Round 3 — Round 2 minor + pair + global

| commit | 내용 |
|---|---|
| `4acb720` | `refactor: align CLI AgentKind with core literal` (Round 2 minor) |
| `f24ede4` | `refactor: inject CLI version instead of hardcoding` (Round 2 minor) |
| `e43d5d2` | `refactor: clarify CLI error code normalization and help heuristic` (Round 2 minor) |
| `a26fba0` | `behavior: add pair create parser` |
| `38edb79` | `behavior: add global status, stop, and doctor parsers` |

테스트는 Step 4 진입 시점 ~86에서 최종 122로 증가. typecheck 통과 유지.

---

## 결정 사항

### 1. parser 라이브러리 선택 (Round 1)

**결정**: **commander@14**를 채택. zod는 schema validation이 정말 필요해질 때
까지 보류.

**근거**: 13개 명령 + flag 처리에 commander 자체 기능으로 충분. name/pair-name
은 단순 scalar non-empty check 수준이라 zod의 schema 도입 비용이 크다. 빈 문자
열 거절은 action 내부 헬퍼로 해결.

### 2. `ParsedCommand`는 success-only discriminated union (Round 1)

**결정**: parser 성공 결과는 typed discriminated union, 실패는 `CliParseError`
throw.

**근거**: Result 패턴(`Result<ParsedCommand, CliParseError>`)도 가능했으나
throw가 Node 표준이고 caller가 try/catch 한 군데서 잡으면 끝. union 자체가
"성공한 명령들"만 표현하므로 readability가 높음.

### 3. `CliParseError`에 `code` + `exitCode` 보존 (Round 1)

**결정**: `CliParseError` class에 commander/자체 양쪽 origin error의 code와
exitCode를 보존.

**근거**: forward-thinking. Round 4 (선택) 또는 invocation layer에서 typed
error → process exit code 매핑이 필요할 때 별도 변환 layer 없이 바로 활용.

### 4. error code namespace `aiox.*` wrapping (Round 2, `e58cbb3`)

**결정**: commander origin 코드(`commander.unknownCommand` 등)도 `aiox.*` 로
normalize. wrap 정책 (option b).

**근거**: caller가 한 namespace만 다루면 됨. sub-namespace (`aiox.commander.*`)
는 origin 정보를 보존하지만 호출 측에서 분기 비용이 늘어남. 단순 wrap이 가장
호출자 친화적.

**특수 매핑**: `commander.help` / `commander.helpDisplayed` → `aiox.missingCommand`.
이는 "subcommand 없이 commander가 help를 출력하는 경우 = 사용자가 명령을 누락
한 것"이라는 의미상 매핑. 명시적 `--help` 흐름은 (5) ParsedCommand variant로
먼저 캡처되므로 이 분기에 도달하지 않음.

### 5. `--help` / `--version`을 `ParsedCommand` variant로 capture (Round 2, `74c08ab`)

**결정**: commander의 stdout 출력을 silent로 캡처한 뒤 `{ kind: "help", text }`
또는 `{ kind: "version", value }`로 caller에 전달. `parseCli`는 side-effect free.

**근거**: 세 옵션 중 선택:
- (a) silent + variant capture: parser가 순수 함수 유지, caller가 출력 책임
- (b) commander.helpDisplayed/version만 stdout 통과: parser가 부분적으로 side-effect
- (c) `parseCli({ silent })` 옵션: 테스트와 프로덕션이 같은 코드 다른 모드

option (a)가 가장 깨끗하고 테스트 친화적. 출력 책임이 caller에 있는 게 SoC에
맞음.

### 6. `AgentKind` shared narrow module (Round 3, `4acb720`)

**결정**: `src/core/agent-kind.ts` 3줄 모듈로 literal 추출. parse와 core 모두
이 모듈을 import. `src/core/agents.ts`는 re-export로 backwards compat 유지.

**근거**: Round 2 첫 구현은 parse layer에서 `type AgentKind = "codex" | "claude"`
local literal로 두고 core와 silent하게 일치 약속. drift 위험이 있어 정리. 세
옵션 중:
- (a) shared narrow module: parse가 core 전체를 모르면서 literal만 공유
- (b) parse가 core import 허용: boundary 침범 부담
- (c) 현 상태 + invocation layer에서 exhaustive check: drift는 그대로

(a)가 가장 narrow한 dependency. core 전체 도메인을 parse가 알 필요는 없지만
literal enum 정도는 단일 source가 안전.

### 7. version injection via options (Round 3, `f24ede4`)

**결정**: `parseCli(argv, options?: { version?: string })`로 caller가 version
주입. default fallback `"1.0.0"` 유지로 기존 테스트 비파괴.

**근거**: parse layer가 fs / package.json 의존을 갖는 것은 부담. caller (CLI
bin entrypoint)가 package metadata 로드 책임. 옵션 객체는 향후 silent toggle
등 추가 옵션을 받기에도 확장 가능.

### 8. global `status` / `stop` / `doctor`를 daemon-* variant와 분리 (Round 3, `38edb79`)

**결정**: `aiox stop`은 spec line 150상 `aiox daemon stop`의 shortcut이지만,
parse layer에서는 `{ kind: "global-stop" }`로 별개 variant. shortcut 매핑은
invocation layer 책임.

**근거**: parse는 user intent (surface 명령)을 그대로 표현. parser 차원에서
직접 daemon-* 매핑하면 invocation layer가 parser 결과를 재해석하기 어려워짐
(예: 로깅에서 사용자가 어떤 명령을 입력했는지 손실). `aiox status` 또한 spec
상 `aiox daemon status`와 같은 정보일지 다를지 불확실해서 분리가 안전.

### 9. `requireNonEmptyName` 헬퍼 재사용 (Round 3, `a26fba0`)

**결정**: pair name, agent name, route source/target name 모두 같은 헬퍼로
검증. 헬퍼 rename (`requireNonEmptyValue` 등) 안 함.

**근거**: 셋 모두 "CLI identity name"이라는 의미적 정합성이 있어 `name` 어휘
보존이 자연스러움. 빈 문자열은 trim 후 길이 0으로 판정 — whitespace-only도 거절
(Round 2부터 권장보다 엄격).

### 10. variadic target ≥ 1 enforcement는 action 내부 명시 검증 (Round 2, `707abf1`)

**결정**: commander의 `<target...>` (required variadic) 대신 `[target...]`
(optional variadic) 후 action 안에서 `targets.length === 0` 검사 + typed throw.

**근거**: commander의 required variadic(`<target...>`)도 최소 1개 target을
강제할 수는 있다. 다만 그 경우 commander-origin missing argument error로
처리된다. Step 4 parser는 routing 의미 오류를 `aiox.missingTargets`로 명시하기
위해 `[target...]`로 받은 뒤 action 내부에서 직접 검증한다.

### 11. "Previous Round Minor Follow-ups" 패턴 정착 (Round 2부터)

**결정**: 매 라운드 직전, 직전 라운드의 리뷰 minor 지적을 먼저 처리하고 본
라운드로 진입.

**근거**: minor를 미루면 누적되어 작업량 2배. 새 코드를 옛 규칙으로 추가한 뒤
정리하면 두 번 손대야 함. Round 2의 namespace 정리가 좋은 예시 — 새 typed error
코드를 추가하기 전에 prefix 정책부터 잡아서 새 코드들이 처음부터 정리된 규칙
에 맞춰 들어감.

[[aiox-collaboration-workflow]]의 표준 패턴으로 격상해서 Step 5+에도 적용 예정.

---

## 보류 / 다음 step 후보

### Round 4 (선택, 미진입)
- **exit code 매핑**: typed `CliParseError`의 `code` → process exit code 매핑
  정책. 13개 명령 전체의 typed error 모양이 다 잡힌 뒤 일관성 잡기 쉬움.
- **help text 다듬기**: commander의 default help text가 사용자에게 자연스러운지
  검수. `aiox --help` 출력 형식, sub-command help 출력 등.
- **CLI bin entrypoint**: `package.json#bin` + `src/cli/bin.ts` 등. parser →
  invocation → process.exit 흐름. version은 여기서 package.json 로드.
- **Round 3 minor 4건**:
  - `output.join("").trim()` 비일관 (help는 trim 안 함, version만 trim)
  - `createProgram` positional args → 옵션 객체 리팩토링
  - `aiox stop extra-positional` invalid test는 존재하나 code까지 assert할지 검토
  - Round 4 진입 시 Step 4 헤더 처리 (`✅ 완료` → `🔄` 또는 별도 "Polish" 절)

### 다음 step 후보
- **Step 5 (route/connect fan-out tests at daemon level)**: parse 결과를
  daemon API로 dispatch하는 invocation layer 일부가 자연스럽게 함께 들어옴.
- **invocation layer 독립 step**: parse → daemon API mapping을 별도 step으로
  분리. CLI bin entrypoint와 묶음.
- **real socket transport** (Step 3 보류 항목): daemon process가 socket을 열고
  CLI가 client로 접속하는 흐름. CLI bin과 묶일 가능성.

---

## 산출물 요약

- 13개 surface command를 cover했고, 현재 union은 help/version 포함 13개
  `ParsedCommand` variant (`daemon-start`/`daemon-stop`/`daemon-restart`/
  `daemon-status`/`help`/`version`/`agent-attach`/`connect`/`disconnect`/
  `pair-create`/`status`/`global-stop`/`doctor`)
- `CliParseError` (code + exitCode 보존, `aiox.*` namespace)
- `src/core/agent-kind.ts` shared literal module
- `requireNonEmptyName` 헬퍼 일관 적용
- 122 tests passing, typecheck 통과
- Step 4 헤더 `✅ 완료`
- daemon API/state import 없음 (parse layer 독립성 유지)
