# Round 4 TUI Smoke Check Learning Record

> 이 문서는 사용자가 나중에 "manual TUI smoke check가 뭐였더라"를 다시 볼 수 있게 만든 학습 기록이다.
> 권위 결정은 `history/33-step-10-phase-a-decisions.history.md`,
> `history/34-step-10-phase-b-codex-runtime.history.md`,
> `prd/mvp/aiox-mvp-spec.md`, `plan/mvp-implementation-checklist.md`에 둔다.

## TL;DR

- Round 4의 220개 자동 테스트는 aiox 코드가 `codex`를 어떤 인자와 순서로 호출하는지 검증한다.
- 하지만 실제 Codex TUI가 foreground terminal에서 뜨는지, alt-screen에 들어가는지, 실제 바이너리의 banner와 JSON-RPC가 현재 코드와 맞는지는 stub 경계 밖이다.
- manual TUI smoke check는 "진짜 `codex` 바이너리 + 진짜 터미널 + 진짜 aiox attach 흐름"을 짧게 한번 태워 보는 확인이다.
- 2026-05-21 기준 S1, S2, S3, S5는 PASS이고, S4는 launcher env override 방식으로 full PASS다.

## Smoke Check란 무엇인가

Smoke test 또는 smoke check는 "시스템에 전원을 넣었을 때 연기가 나는지 먼저 보는" 아주 얕은 검증이다. 옛 하드웨어 검사에서 회로에 전원을 넣자마자 연기가 나면 더 깊은 테스트를 할 필요가 없다는 데서 온 말이다.

소프트웨어에서는 전체 기능을 세밀하게 다 검증하기보다, 가장 중요한 실제 경로가 처음부터 크게 깨져 있지 않은지 빠르게 본다.

비교하면 이렇다.

| 종류 | 보는 것 | 예시 |
|---|---|---|
| Unit test | 작은 함수나 모듈 하나 | `launchCodexTui()`가 `spawn("codex", args, { stdio: "inherit" })`를 호출하는가 |
| Integration test | 여러 모듈 조합 | CLI invocation이 daemon API를 부르고 TUI exit 후 `notifyTuiExited`를 부르는가 |
| E2E test | 사용자에 가까운 전체 흐름 | CLI 실행부터 실제 외부 프로세스까지 자동으로 확인 |
| Smoke check | 실제 경로를 짧게 손으로 확인 | `aiox codex --name alpha`로 진짜 Codex TUI가 뜨는가 |

여기서 "manual"인 이유는 TUI가 현재 터미널 화면을 직접 차지하기 때문이다. Round 4 결정 D3.4는 Codex TUI를 CLI child로 띄우고 `stdio: "inherit"`을 쓴다. 이 방식은 사용자의 키보드 입력과 화면을 자식 프로세스인 `codex`에 그대로 넘긴다. 자동 테스트 안에서 완전히 재현하려면 pseudo-terminal, alt-screen 캡처, 실제 Codex auth/config, timing 제어가 필요해서 별도 E2E harness가 된다. Round 4 closeout에서는 그 큰 harness를 만들지 않고 사람이 짧게 보는 smoke check로 분리했다.

## 용어 풀이

`stub`은 진짜 함수를 작은 가짜 함수로 바꿔 끼우는 것이다. 예를 들어 테스트에서 `spawn`을 stub하면 실제 `codex`는 실행되지 않고, "어떤 command와 args로 spawn을 부르려고 했는지"만 기록한다.

`mock`은 stub보다 기대값 검증까지 강하게 붙은 가짜다. "이 함수가 정확히 한 번 불렸는가", "인자가 이 배열이었는가"를 확인한다.

`fake`는 실제처럼 동작하는 간단한 대체품이다. 예를 들어 `fakeWebSocket`은 진짜 네트워크를 열지 않지만 `initialize()`나 `request("thread/start", {})`에 성공 응답을 돌려준다.

`stdio: "inherit"`은 Node child process 옵션이다. 자식 프로세스의 stdin/stdout/stderr를 부모 CLI의 터미널에 그대로 연결한다. 그래서 Codex TUI가 사용자의 키 입력을 받고 같은 화면에 그려진다.

`alt-screen`은 터미널 앱이 쓰는 별도 화면 버퍼다. vim, less, TUI 앱이 실행 중에는 전체 화면을 차지하고, 종료하면 원래 shell 화면으로 돌아오는 동작이다.

`ChildProcess handle`은 Node가 자식 프로세스를 조작하기 위해 주는 객체다. 여기에 `pid`, `kill()`, `exit` 이벤트, `error` 이벤트가 있다.

`PATH`는 shell이 실행 파일을 찾는 경로 목록이다. `codex`라고 입력했을 때 OS는 PATH 안의 디렉터리들을 순서대로 찾아 실제 바이너리를 실행한다. PATH에서 `codex`를 빼면 spawn 실패, 보통 `ENOENT`를 만들 수 있다.

## 자동 테스트가 보는 것 vs 못 보는 것

Round 4 자동 테스트는 의미가 있다. "진짜로 아무것도 확인하지 않았다"가 아니다. 다만 확인 대상이 aiox 코드의 호출 모양과 상태 전이이지, 실제 Codex TUI 화면 자체는 아니다.

```text
[ unit test ]
  |
  v
[ launchCodexTui() ]
  |
  |  테스트는 여기서 spawn을 stub/mock으로 바꾼다
  v
[ spawn("codex", ["--remote", ...], { stdio: "inherit" }) ]  <- 자동 테스트 경계
  |
  v
  실 바이너리 영역, 자동 테스트가 직접 보지 않음
[ codex CLI process ]
  |
  +-- PATH에서 codex 실행 파일 찾기
  +-- foreground terminal 점유
  +-- alt-screen 진입
  +-- --remote endpoint로 app-server 접속
  +-- 사용자 입력 처리
```

Round 4 테스트별로 보면 다음과 같다.

| 테스트 surface | 자동 테스트가 보는 것 | 자동 테스트가 못 보는 것 |
|---|---|---|
| `tests/unit/adapters/codex-launcher.test.ts` attach/resume args and inherited stdio | `launchCodexTui()`가 `codex --remote <endpoint>` 또는 `codex resume <id> --remote <endpoint>`와 `stdio: "inherit"`로 `spawn`을 부르는지 | 실제 `codex` 바이너리 존재 여부, banner stderr 형식, TUI 화면 렌더링, alt-screen 진입 |
| `tests/unit/adapters/codex-runtime.test.ts` attach flow | `launchAppServer -> connectWebSocket -> initialize` 순서, runtime ready 상태 | 실제 `codex app-server`가 stderr banner를 내는지, `--listen ws://127.0.0.1:0`이 OS assigned port에 listen하는지 |
| `tests/unit/adapters/codex-runtime.test.ts` `thread/start {}` | fake WS가 `thread/start` 요청을 받고 success response를 돌려주면 active id를 갱신하는지 | real Codex CLI 0.132.0이 `{}` params를 실제로 받는지. Round 4 notes에는 missing `params` reject가 red signal로 남아 있음 |
| `tests/unit/cli/bin.test.ts`, `tests/unit/cli/invocation.test.ts` | CLI가 daemon API를 부르고, TUI exit 후 `notifyTuiExited`, spawn error 후 `rollbackAgentAttach`를 부르는지 | real daemon socket transport over UDS, 실제 외부 `codex` 프로세스와 end-to-end attach |

즉 자동 테스트 220개는 "우리가 작성한 aiox 코드의 약속"을 확인한다. smoke check는 그 약속이 실제 Codex 바이너리와 터미널에서도 깨지지 않는지 확인한다.

## Spike vs Production 검증의 차이

history/32의 resume spike, history/34 Round 1의 D7 acquisition spike, Round 2의 turn/start ack frame spike는 모두 중요했다. 하지만 그 spike들은 production code path가 아니었다.

대부분 별도 WS client를 직접 만들어 app-server에 frame을 보냈다. 예를 들면 "이 JSON-RPC frame 자체가 Codex에서 통하는가"를 확인한 것이다.

production path는 더 길다.

```text
[ aiox CLI ]
  |
  v
[ daemon attachAgent ]
  |
  v
[ launch codex app-server ]
  |
  +-- stderr banner parse
  +-- readyz polling
  +-- WS connect retry/handshake
  +-- initialize
  +-- pending request map
  +-- thread/start or thread/resume
  +-- DB adapter_session_id rebind
  |
  v
[ CLI launches real Codex TUI with stdio: inherit ]
  |
  v
[ user sees and exits foreground TUI ]
```

그래서 검증은 세 단계가 다르다.

1. Frame 자체는 통한다: spike.
2. aiox production wiring이 그 frame을 올바른 순서로 만든다: 자동 테스트.
3. 실제 production wiring이 진짜 Codex 바이너리와 묶여도 작동한다: manual TUI smoke check.

banner stderr 형식과 `thread/start {}`가 다시 위험해 보이는 이유도 여기에 있다. spike 시점에는 통했거나 특정 red signal을 봤어도, production path에서는 banner parser, readyz, WS initialize, request map, DB rebind, TUI launch가 한 줄로 이어진다. 한 층만 어긋나도 사용자는 "TUI가 안 뜬다" 또는 "resume이 안 된다"로 경험한다.

## Smoke Check가 닫는 영역

```text
자동 테스트가 주로 닫은 영역
  aiox 함수 호출 / 인자 / 상태 전이 / fake WS 응답

manual smoke check가 추가로 닫는 영역
  실제 PATH -> 실제 codex binary -> 실제 app-server banner
  -> 실제 readyz/listen port -> 실제 foreground TUI
  -> 실제 사용자 입력 -> 실제 exit/rollback cascade
```

## Round 4 Surface별 검증 표

| Surface | 자동 테스트 cover | Smoke 필요 | 가능한 시나리오 |
|---|---|---|---|
| Fresh attach TUI launch | spawn args, `stdio: inherit`, attach order | 실제 TUI가 뜨고 사용자가 turn을 입력할 수 있는지 | S1 |
| Explicit resume | parser/invocation propagation, `thread/resume` returned id 검증 | 실제 `codex resume <id> --remote <endpoint>`가 TUI로 이어지는지 | S2 |
| Resume mismatch | fake WS mismatch 시 `codex_resume_failed` | 실제 fake/bad id에서 Codex가 실패를 어떻게 돌려주는지 | S3 |
| TUI spawn failure rollback | spawn `error` 이벤트에서 rollback API 호출 | real PATH 실패가 daemon app-server dispose와 agent state rollback까지 가는지 | S4 |
| Claude `--resume` reject | parse layer reject | 바이너리 없이도 충분 | S5 |

## 권장 시나리오 S1-S5

아래 명령은 repo root에서 실행한다.

```bash
cd /Users/lunaxislu/Documents/ai-orchestration
```

현재 MVP CLI는 status 출력을 사용자 친화적으로 렌더링하지 않는 구간이 있다. 따라서 판정은 "터미널에서 보이는 TUI 동작", "명령 exit code", 필요하면 `ps`/`lsof`로 남은 `codex app-server`가 없는지 확인하는 쪽이 더 직접적이다.

### S1: fresh attach golden path

검증 의도: 가장 중요한 신규 Codex attach가 실제 app-server launch, banner parse, readyz, WS initialize, daemon-owned `thread/start`, TUI launch까지 이어지는지 본다.

명령:

```bash
pnpm tsx src/bin/aiox.ts codex --name alpha
```

TUI 안에서 짧게 입력:

```text
hello from aiox smoke
/exit
```

성공 기준:

- Codex TUI가 현재 터미널을 차지해서 뜬다.
- 입력이 가능하다.
- `/exit` 후 shell로 돌아온다.
- 명령 exit code가 0이다. 필요하면 직후 `echo $?`가 `0`인지 본다.
- 남은 app-server가 없어야 한다.

```bash
ps -axo pid,command | rg "codex app-server|codex --remote|codex resume" || true
```

실패 기준:

- `app_server_banner_parse_timeout`, `app_server_readyz_timeout`, WS initialize 실패, `thread/start` JSON-RPC error가 보인다.
- TUI가 뜨지 않거나 키 입력을 못 받는다.
- `/exit` 후 shell로 돌아오지 않는다.
- app-server 프로세스가 남는다.

이 시나리오를 빼면 production user가 `aiox codex --name alpha`를 처음 실행했을 때 TUI가 아예 안 뜨는 문제를 Step 11 이후에야 발견할 수 있다.

자동 테스트로 부족한 이유: unit test는 `spawn("codex", ...)` 호출까지만 본다. 실제 `codex` binary 실행, terminal foreground, alt-screen, 실제 app-server와의 `--remote` 연결은 보지 않는다.

### S2: explicit resume

검증 의도: 이미 알고 있는 Codex thread id로 `codex resume <id> --remote <endpoint>`가 실제 TUI까지 이어지는지 본다.

준비: S1에서 실제로 생성된 session/thread id를 확보한다. TUI 화면이나 Codex 기록에서 id를 확인할 수 있어야 한다. 여기서는 `<session-id>`로 표기한다.

명령:

```bash
pnpm tsx src/bin/aiox.ts codex --name alpha --resume <session-id>
```

TUI 안에서:

```text
resume smoke
/exit
```

성공 기준:

- 기존 thread/session으로 TUI가 열린다.
- 입력이 가능하고 `/exit`로 종료된다.
- exit code가 0이다.
- 남은 `codex app-server`가 없다.

실패 기준:

- `codex_resume_failed`가 나온다.
- 새 thread처럼 열리거나, 요청한 id와 다른 id로 붙는 정황이 보인다.
- TUI가 뜨지 않거나 종료 후 프로세스가 남는다.

이 시나리오를 빼면 production user가 저장해 둔 Codex session으로 다시 붙는 흐름이 깨져도 fresh attach만 보고 지나갈 수 있다.

자동 테스트로 부족한 이유: 테스트는 fake WS가 요청한 id를 그대로 돌려주는 경우를 만든다. 실제 Codex CLI의 resume 명령과 remote TUI 조합은 실행하지 않는다.

### S3: resume id mismatch

검증 의도: 없는 id 또는 잘못된 id를 넣었을 때 aiox가 성공으로 착각하지 않고 `codex_resume_failed` 계열 실패로 끊는지 본다.

명령:

```bash
pnpm tsx src/bin/aiox.ts codex --name alpha --resume 00000000-0000-0000-0000-000000000000
echo $?
```

성공 기준:

- TUI가 정상 attach처럼 뜨면 안 된다.
- 에러가 출력되고 exit code가 non-zero다.
- 에러가 resume 실패를 가리킨다. 현재 surface에서는 `codex_resume_failed` 또는 Codex JSON-RPC error message가 핵심 단서다.
- 남은 app-server가 없다.

```bash
ps -axo pid,command | rg "codex app-server|codex --remote|codex resume" || true
```

실패 기준:

- fake id인데도 TUI가 열린다.
- aiox가 다른 id로 조용히 rebind한다.
- 실패 후 app-server가 남는다.

이 시나리오를 빼면 production user가 잘못된 resume id를 넣었을 때 agent binding이 엉뚱한 session으로 바뀌거나, 실패한 runtime이 남을 수 있다.

자동 테스트로 부족한 이유: 테스트의 mismatch는 fake WS가 의도적으로 다른 id를 돌려주는 경우다. 실제 Codex가 "없는 id"를 어떤 error shape로 주는지는 실 바이너리에서 봐야 한다.

### S4: TUI spawn 실패 rollback

검증 의도: app-server와 daemon attach는 성공했는데 마지막 TUI `spawn("codex", ...)`가 PATH 문제로 실패할 때 rollback cascade가 끝까지 가는지 본다.

Round 4-fix 이후 권장 방식은 TUI command만 env로 바꾸는 것이다. app-server는 real `codex`로 정상 launch하고, TUI spawn만 없는 파일로 보내서 D3.6 ENOENT 경로를 직접 만든다.

```bash
AIOX_CODEX_TUI_COMMAND=/tmp/nonexistent-codex pnpm tsx src/bin/aiox.ts codex --name s4-smoke
echo $?
ps -axo pid,command | grep -E 'codex (app-server.*--listen|--remote|resume)' | grep -v grep || echo "no leftover"
```

한 줄로 exit code와 leftover를 같이 재려면 이렇게 실행한다.

```bash
AIOX_CODEX_TUI_COMMAND=/tmp/nonexistent-codex pnpm tsx src/bin/aiox.ts codex --name s4-smoke; rc=$?; echo "exit=$rc"; ps -axo pid,command | grep -E 'codex (app-server.*--listen|--remote|resume)' | grep -v grep || echo "no leftover"
```

성공 기준:

- TUI가 뜨지 않는다.
- `tui_launch_failed`, `ENOENT`, 또는 `spawn /tmp/nonexistent-codex` 계열 에러가 출력된다.
- exit code가 non-zero다.
- rollback grace 이후 남은 app-server가 없다.

실패 기준:

- 실패했는데 app-server가 계속 남는다.
- agent가 connected 상태로 남는다.
- CLI가 성공 exit code를 돌려준다.

이 방식이 full S4인 이유는 app-server command와 TUI command가 분리되어 있기 때문이다. PATH 전체를 망가뜨리면 app-server launch부터 실패해서 TUI spawn 실패 rollback을 볼 수 없다.

wrapper 방식도 참고용으로 남긴다. 이 방식은 TUI child가 즉시 exit하는 경로를 보므로 partial S4다. 핵심은 wrapper가 `codex app-server`만 real Codex로 forwarding하고, TUI command에서는 non-zero로 바로 종료하는 것이다.

```bash
mkdir -p /tmp/aiox-smoke-bin
rm -f /tmp/aiox-smoke-bin/codex

cat > /tmp/aiox-smoke-bin/codex <<'EOF'
#!/bin/sh
REAL_CODEX="/absolute/path/to/real/codex"
if [ "$1" = "app-server" ]; then
  exec "$REAL_CODEX" "$@"
fi
echo "S4 intentional TUI spawn failure" >&2
exit 127
EOF

chmod +x /tmp/aiox-smoke-bin/codex
PATH="/tmp/aiox-smoke-bin:$PATH" pnpm tsx src/bin/aiox.ts codex --name no-codex-2
```

성공 기준:

- TUI가 뜨지 않는다.
- wrapper 메시지가 출력된다.
- exit code가 non-zero다.
- 남은 app-server가 없다.

```bash
ps -axo pid,command | rg "codex app-server|no-codex-2" || true
```

주의: 단순히 PATH에서 `codex`를 빼는 방식은 app-server launch부터 실패할 수 있다. 그 경우는 S4의 목표인 "app-server 성공 후 TUI spawn 실패 rollback"을 보지 못한다.


이 시나리오를 빼면 production user의 PATH가 깨진 환경에서 aiox가 app-server만 남겨 두고 종료하는 문제를 놓칠 수 있다.

자동 테스트로 부족한 이유: 자동 테스트는 launcher가 `rollbackAgentAttach`를 호출한다는 것만 본다. daemon이 실제 app-server child를 죽이고 agent state를 되돌리고 CLI가 typed exit code로 종료하는 end-to-end cascade는 stub 경계 너머다.

S4 방식별로 닫는 경로:

| 방식 | 판정 | 검증하는 path | 한계 |
|---|---|---|---|
| wrapper가 app-server는 real Codex로 forwarding하고 TUI에서 `exit 127` | partial | TUI child가 spawn된 뒤 즉시 non-zero exit할 때 app-server/TUI leftover가 없는지 | D3.6의 `spawn` ENOENT/EACCES 자체 실패는 아님 |
| `AIOX_CODEX_TUI_COMMAND=/tmp/nonexistent-codex` | full | app-server 정상 launch 후 TUI `spawn` ENOENT, `tui_launch_failed`, rollback cleanup | dev/test env override surface가 필요 |

### S5: claude + --resume reject

검증 의도: `--resume`은 Codex 전용이고 Claude attach에는 허용되지 않는다는 parse layer를 확인한다. 이건 바이너리 없이도 충분하다.

명령:

```bash
pnpm tsx src/bin/aiox.ts claude --name reviewer --resume fake
echo $?
```

성공 기준:

- parse error가 난다.
- exit code가 non-zero다.
- daemon이나 Codex 바이너리를 띄우지 않는다.

실패 기준:

- Claude attach가 진행된다.
- `--resume`이 조용히 무시된다.
- Codex 관련 프로세스가 뜬다.

이 시나리오를 빼면 사용자가 Claude에도 resume이 된다고 오해하거나, CLI grammar가 adapter별 옵션을 잘못 받아들이는 회귀를 놓칠 수 있다.

자동 테스트로 부족한 이유: parser unit test로 대부분 충분하지만, 실제 CLI command line에서 commander error가 사용자에게 어떤 식으로 보이는지 한번 확인하는 값이 있다.

## Step 11과의 순서

"회귀가 잡혔을 때 원인 분리 비용"은 이런 뜻이다.

Step 10 Round 4 smoke를 하지 않은 상태로 Step 11 Phase B에 들어가서 `src/adapters/router.ts`나 `src/adapters/contract.ts` 같은 공유 surface를 건드렸다고 하자. 그 뒤 `aiox codex --name alpha`가 깨지면 원인이 두 가지로 갈린다.

1. Round 4 wiring이 처음부터 실 바이너리와 묶이면 깨지는 상태였다.
2. Step 11 변경이 원래 되던 Codex attach를 깨뜨렸다.

이 둘을 구분하려면 commit checkout, 재실행, 로그 비교, 경우에 따라 git bisect가 필요하다. 그 시간이 "원인 분리 비용"이다.

단, Step 11 Phase A가 코드 변경 0줄 walkthrough라면 회귀 위험은 낮다. 위험은 Step 11 Phase B처럼 공유 adapter contract나 router 구현을 건드릴 때 커진다.

## 선택지

| 옵션 | Trade-off | 추천 | Reversibility | Deferrability |
|---|---|---|---|---|
| 1. Step 11 시작 전 S1 + S4만 | 30분 안팎으로 fresh attach와 spawn failure rollback의 가장 큰 구멍을 닫는다. Resume 계열은 나중에 남는다. | 추천. 최소 비용으로 production gap이 큰 두 지점을 먼저 닫는다. | 높음. 나중에 S2-S5를 추가로 돌리면 된다. | 낮음. Step 11 Phase B 전에 하는 게 원인 분리에 가장 좋다. |
| 2. Step 11 시작 전 S1-S5 전부 | 60분 정도 들지만 Round 4 surface를 가장 깔끔하게 닫는다. | 시간이 있으면 최선. | 높음. 실패한 시나리오만 다시 돌리면 된다. | 중간. 일정이 빡빡하면 최소 묶음으로 줄일 수 있다. |
| 3. Step 11 Phase A 후, Phase B 전 smoke | Phase A가 문서 walkthrough라면 코드 회귀 위험은 거의 없다. Step 11 진입은 가능하다. | Phase A만 먼저 해야 하는 사정이 있으면 허용. | 높음. Phase B 시작 전에만 끊으면 된다. | 중간. Phase B 전에는 미루지 않는 게 좋다. |
| 4. Smoke skip 후 바로 Step 11 진입 | 빠르지만 production user가 실제로 깨질 때까지 모른다. 나중에 깨지면 Step 10/11 중 원인 분리가 어려워진다. | 비추천. | 낮음. 나중에 실패하면 되돌아가며 원인을 찾아야 한다. | 가능은 하지만 위험을 명시적으로 안고 가는 선택이다. |

현재 권장은 옵션 1이다. 즉 Step 11 시작 전 S1 fresh attach와 S4 TUI spawn 실패 rollback만 최소로 끊고, 시간이 되면 S2-S5를 이어서 돌린다.

## 2026-05-21 Manual Run Notes

이 섹션은 사용자가 실제 터미널에서 돌린 smoke 결과를 남기는 학습 기록이다. 권위 있는 Step 완료 baseline을 바꾸려면 별도로 `history/` 또는 `plan/`에 반영해야 한다.

### S1 fresh attach golden path

판정: PASS.

실행 흐름:

```bash
pnpm tsx src/bin/aiox.ts codex --name alpha
```

TUI 안에서 사용자가 입력:

```text
hello from aiox smoke
/exit
```

관측:

- 실제 Codex TUI가 열렸다.
- 사용자가 입력한 `hello from aiox smoke`가 처리됐고 Codex가 응답했다.
- `/exit` 후 shell로 돌아왔다.
- `echo $?` 결과가 `0`이었다.
- 아래 leftover 확인에서 aiox가 띄운 `--listen` app-server, `--remote` TUI, `codex resume` 프로세스가 남지 않았다.

```bash
ps -axo pid,ppid,args | grep -E '[c]odex app-server .*--listen|[c]odex .*--remote|[c]odex resume'
```

참고: `ps`에는 VS Code ChatGPT/OpenAI extension이 띄운 것으로 보이는 `codex app-server --analytics-default-enabled` 프로세스가 있었지만, aiox smoke 대상인 `--listen` app-server가 아니므로 S1 실패 증거로 보지 않았다.

S1에서 확보된 resume id:

```text
019e4a3e-ef83-7ee2-a55d-6d7eed96b129
```

### S2 explicit resume

판정: PASS.

실행 흐름:

```bash
pnpm tsx src/bin/aiox.ts codex --name alpha --resume 019e4a3e-ef83-7ee2-a55d-6d7eed96b129
```

TUI 안에서 사용자가 입력:

```text
resume smoke
/exit
```

관측:

- `--resume` id로 실제 Codex TUI가 열렸다.
- 사용자의 `resume smoke` 입력이 처리됐다.
- shell로 돌아왔다.
- `echo $?` 결과가 `0`이었다.
- leftover 확인에서 aiox `--listen` app-server, `--remote` TUI, `codex resume` 프로세스가 남지 않았다.

중간에 Codex TUI가 `Conversation interrupted` 메시지를 출력했지만, aiox attach/resume 자체 실패로 보지는 않았다. TUI가 열렸고 입력이 처리됐고 정상 exit code로 shell에 돌아왔기 때문이다.

### S3 resume id mismatch

판정: PASS.

실행:

```bash
pnpm tsx src/bin/aiox.ts codex --name alpha --resume 00000000-0000-0000-0000-000000000000; echo "exit=$?"
```

관측:

```text
no rollout found for thread id 00000000-0000-0000-0000-000000000000
exit=1
```

- TUI가 정상 attach처럼 열리지 않았다.
- Codex JSON-RPC error가 그대로 사용자에게 보였다.
- 같은 터미널에서 측정한 exit code가 `1`이었다.
- 별도 터미널에서 확인한 system-wide `ps` 기준 leftover가 없었다.
- 사용자의 첫 `echo $?` 측정은 새 터미널 컨텍스트에서 나온 `0`이라 이전 명령의 exit code가 아니었다.

결론:

- 없는 resume id에서 silent rebind가 일어나지 않았다.
- 실패 path가 non-zero exit과 cleanup으로 끝났다.

### S4 TUI failure cleanup

판정: partial PASS.

왜 partial인가:

- 원래 S4 목표는 `spawn("codex", ...)` 자체가 `ENOENT` 또는 `EACCES`로 실패하는 `tui_launch_failed -> rollbackAgentAttach` 경로를 보는 것이다.
- 실제 수동 실행에서는 임시 wrapper를 PATH 앞에 두고, `codex app-server`는 real Codex로 넘기고, TUI 단계는 wrapper가 `exit 127`로 즉시 실패하게 만들었다.
- 따라서 "spawn 자체 실패"는 아니고 "TUI child가 즉시 실패 exit" 경로에 가깝다.

사용한 wrapper:

```bash
mkdir -p /tmp/aiox-smoke-bin
rm -f /tmp/aiox-smoke-bin/codex

echo '#!/bin/sh' > /tmp/aiox-smoke-bin/codex
echo 'REAL_DIR="/Users/lunaxislu/.local/share/mise/installs/node/24.14.0/bin"' >> /tmp/aiox-smoke-bin/codex
echo 'REAL_CODEX="$REAL_DIR/codex"' >> /tmp/aiox-smoke-bin/codex
echo 'if [ "$1" = "app-server" ]; then' >> /tmp/aiox-smoke-bin/codex
echo '  exec "$REAL_CODEX" "$@"' >> /tmp/aiox-smoke-bin/codex
echo 'fi' >> /tmp/aiox-smoke-bin/codex
echo 'echo "S4 intentional TUI spawn failure" >&2' >> /tmp/aiox-smoke-bin/codex
echo 'exit 127' >> /tmp/aiox-smoke-bin/codex
chmod +x /tmp/aiox-smoke-bin/codex
```

실행:

```bash
PATH="/tmp/aiox-smoke-bin:$PATH" pnpm tsx src/bin/aiox.ts codex --name no-codex-2
echo $?
ps -axo pid,ppid,args | grep -E '[c]odex app-server .*--listen|[c]odex .*--remote|[c]odex resume'
```

관측:

- TUI가 뜨지 않았다.
- wrapper가 `S4 intentional TUI spawn failure`를 stderr로 출력했다.
- `echo $?` 결과가 `127`이었다.
- leftover 확인에서 aiox `--listen` app-server, `--remote` TUI, `codex resume` 프로세스가 남지 않았다.

결론:

- 수동 smoke 기준으로 "TUI immediate failure 후 app-server/TUI leftover 없음"은 확인했다.
- 정확한 `spawn ENOENT/EACCES -> rollbackAgentAttach` 경로는 아직 full PASS가 아니다. 이 경로를 닫으려면 별도 harness나 launcher 주입 방식으로 spawn error를 재현하는 검증이 더 정확하다.

### S4-full TUI spawn failure cleanup

판정: PASS.

실행:

```bash
AIOX_CODEX_TUI_COMMAND=/tmp/nonexistent-codex pnpm tsx src/bin/aiox.ts codex --name s4-smoke; rc=$?; echo "exit=$rc"; ps -axo pid,command | grep -E 'codex (app-server.*--listen|--remote|resume)' | grep -v grep || echo "no leftover"
```

관측:

```text
spawn /tmp/nonexistent-codex ENOENT
exit=1
```

- app-server는 real `codex` command로 정상 launch됐다.
- TUI spawn 단계만 `AIOX_CODEX_TUI_COMMAND=/tmp/nonexistent-codex` 영향을 받아 ENOENT로 실패했다.
- 즉시 ps에서는 방금 뜬 app-server가 아직 보였지만, rollback cascade의 3초 grace window 이후 재확인한 결과는 `no leftover`였다.
- typed error 단서와 non-zero exit code가 모두 확인됐다.

결론:

- D3.6의 정확한 `spawn` ENOENT rollback path가 닫혔다.
- Round 4-fix의 launcher env override는 testability surface이며, production default는 계속 `codex`다.

### S5 claude --resume reject

판정: PASS.

실행:

```bash
pnpm tsx src/bin/aiox.ts claude --name reviewer --resume fake
```

관측:

```text
error: unknown option '--resume'
```

결론:

- commander parser가 Claude subcommand의 `--resume`을 unknown option으로 reject했다.
- daemon이나 adapter runtime launch 전 parse layer에서 끊겼다.

## 관련 권위

- `history/33-step-10-phase-a-decisions.history.md`
  - D3 TUI launch
  - D5-A.5 `notifyTuiExited`
  - D6-A explicit resume
  - D7 binding/id replacement
- `history/34-step-10-phase-b-codex-runtime.history.md`
  - Round 4 closeout
  - "Manual TUI smoke check remains separate from automated closeout because it requires launching the real Codex TUI in a foreground terminal."
- `plan/mvp-implementation-checklist.md`
- `prd/mvp/aiox-mvp-spec.md`
