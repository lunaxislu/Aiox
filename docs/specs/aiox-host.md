# AIOX Host and Network Contract

Status: Committed target

이 문서는 Host 실행·작업 공간·manifest, Network 정의의 권위와 directed routing을 소유한다.
CLI 전체 표면은 [[docs/specs/aiox-runtime]], 인증·실제 send 판정은
[[docs/specs/aiox-collaboration]]을 따른다.

## 실행 namespace와 작업 공간

Host는 YAML의 Agent들과 전용 Network 하나를 같은 작업 공간에서 실행하는 독립 namespace다.
`aiox host run`은 외부 터미널·Web workspace·Network pane 어디에서 호출하든 daemon 소유로
실행하고 Web의 HOSTS에 실행 panel을 만든다. Hosts 목록의 `[+]`로 만든 사용자 workspace는
Host 실행이 아니며 run의 실행 panel로 자동 선택하지 않는다.

Host 내부 Agent는 작업 경로를 공유한다. namespace는 파일 sandbox가 아니므로 같은 작업 경로의
파일은 공유한다. 이번 Host 범위에 Worktree 생성과 `--worktree`는 포함하지 않는다.

### YAML 선택과 중복 실행

`--path <directory>`는 작업·탐색 디렉터리이며 생략하면 호출한 현재 디렉터리다.
`--file <yaml>`은 사용할 파일을 명시한다. 상대 파일은 선택한 디렉터리에서 해석한다.
파일을 명시하지 않으면 해당 디렉터리의 `aiox.yaml`과 `aiox.*.yaml`을 탐색한다.
후보가 없으면 오류, 둘 이상이면 후보와 파일 지정 방법을 CLI에 안내하고 실행하지 않는다.
후보 하나일 때만 자동 선택하며 `aiox.yaml`에 우선권을 주지 않는다.

```bash
aiox host run
aiox host run --file aiox.dev.yaml
aiox host restart --path ../project --file aiox.dev.yaml
```

YAML 하나는 Host 하나의 실행 정의다. 같은 YAML·같은 `host.name`의 Host가 이미 있으면 stopped
상태여도 run으로 중복 생성하지 않는다. 기존 상태와 `host agent start`/`host restart` 사용법을
안내한다. 실행 중 Host 이름은 daemon 범위에서 유일하다. 이름 충돌을 기존 Host의 암묵 교체로
처리하지 않는다. `--host` 선택 옵션이나 `--name` override로 별도 실행을 만드는 표면은 사용하지 않는다.

YAML의 `host.name`을 바꾸고 restart하면 기존 Host의 이름을 바꾸는 대신 별도 Host·panel·Network로
실행한다. 기존 Host는 유지한다. 같은 이름의 Host 전체 restart만 그 Host 구성을 교체한다.

## Network 권위와 소속

Host Network 명령은 등록된 `<host>`를 반드시 지정한다. 생략하거나 등록된 Host를 찾지 못하면
오류이며 현재 경로의 YAML·`--path`·`--file`로 대체 선택하지 않는다.
필수 positional `<host>`는 제외한 `--host` 옵션과 별개다. 전체 문법은 runtime spec을 따른다.

| 종류 | 정의 권위 | 실행·종료와 관리 |
| --- | --- | --- |
| Persistent Network | daemon DB | `network create/delete/block/unblock/reset`, 명시 delete까지 정의 유지 |
| Host-managed Network | 해당 `aiox.yaml` | Host에서 실체화, `stop` 후 정책과 함께 유지, `delete`에서 정리 |

Host당 Network 하나, Agent의 동시 Network 소속도 최대 하나다. daemon 전체에서 여러 독립
Network를 관리하는 것은 가능하다. Host YAML의 persistent Network external 참조는 제외한다.
YAML 정의를 global persistent Network로 동시에 저장해 이중 권위로 만들지 않는다.

- Persistent Network는 global scope, Host Network는 Host runtime scope다. 일반 Network와 Host Network는
  이름이 정확히 같아도 별개다. 서로 다른 Host의 동명 Network도 merge/replace하지 않는다.
- `network list`는 persistent만, `--all`은 host-managed도 표시한다. `network show`는
  Host-qualified Network도 조회한다. 일반 delete/block/unblock/reset은 persistent에만 적용한다.
- Persistent Network에 참여 실행이 남아 있으면 삭제를 거절하고 먼저 참여 정리를 안내한다.
  준비 중 등록과 정리 실패로 남은 등록도 포함하며, 삭제를 위해 실행을 자동 종료·분리하지 않는다.
  현재 API는 HTTP 400 / `network_in_use`로 응답하고 CLI는 해당 안내를 표시한다. [Status: Current]
  근거: [[apps/daemon/src/networks.ts]] `apps/daemon/src/networks.ts:69-79`,
  [[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:416-541`,
  [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:76-88`.
- `agent run --network`는 한 값만 받는다. 실행 중 join/leave나
  Network 소속 변경 기능은 제공하지 않는다.

실행 소유권과 Network membership은 별개다. YAML Agent key를 실행마다 새 Runtime ID로
해석해 membership과 route를 연결하며 서로 다른 Host의 동명 Agent를 섞지 않는다.
Agent 종료 시 credential·binding·활성 membership을 정리하지만 Host Network와 적용 정책은
유지한다. DB에 보존된 정의·이력은 살아 있는 실행이나 credential의 증거가 아니다.

## Routing과 변경

Persistent Network 참여자는 기본적으로 서로 전송할 수 있다. 저장되는 route는 차단된
directed edge뿐이며 차단 행이 없는 방향은 열려 있다. Persistent Network에는 변경 가능한
default 정책을 두지 않는다. 자기 자신과 다른 Network를 대상으로 한 전송은 허용하지 않는다.

일반 Network와 Host 모두 `block`/`unblock`/`reset` 하위 명령을 사용한다. 각 명령은
`--between <agents...>` 또는 `--from <agent> --to <agents...>` 중 정확히 하나를 받는다.
`--from`의 `--to` 누락과 `--to` 단독은 오류다. between은 자기 자신을 제외한 상호 directed
clique이며 나열 순서는 결과에 영향을 주지 않는다. from/to는 단방향이고 self edge는 오류다.
연결을 전이적으로 추론하지 않는다.

Persistent의 `block`은 차단 행을 추가하고 `unblock`과 `reset`은 차단 행을 제거한다.
같은 방향을 반복 차단해도 행은 하나이고, 차단되지 않은 방향의 unblock/reset은 변화가 없다.
`unblock --between A B`는 양방향 차단을 모두 제거하며 명시 allow 행을 만들지 않는다.

Persistent route의 endpoint는 해당 Network에 참여 중인 Agent의 이름 또는 Runtime ID로
지정한다. daemon은 해당 Network 안에서 ID 우선, 이름 순으로 모든 대상을 해석·검증한 뒤 Runtime ID로 저장한다. 같은 실행의 이름·ID를 함께 지정하거나 대상을 반복해도 endpoint는 한 번만 적용한다.
없는 대상이나 다른 Network의 대상은 전체 변경을 저장 전에 거절한다.
Network 또는 대상을 찾지 못한 경우 API는 오류 설명을 반환하고 CLI는 이를 표시한 뒤 해당 명령을 실패로 종료한다. 대상 검증과 저장은
종료 정리와 엇갈려 종료한 실행의 route를 다시 만들지 않아야 한다.

CLI의 Network 목록·조회·변경 결과는 endpoint의 Agent 이름을 표시하고 이름 미지정 시
Runtime ID를 표시한다. Persistent 출력은 `<name> (persistent)` 아래
`Persistent networks always default to allow; Hosts can choose allow or deny in YAML.` 안내와
`Default: allow`, 차단 방향을 표시하고, 차단이 없으면 `Blocks: none`을 표시한다. 역방향도 차단돼 있으면
`A <-> B: blocked`로 합치고, 단방향이면 `B -> A: blocked`로 표시한다. route 개수는 표시하지
않는다. API/JSON의 `from`·`to`는 Runtime ID를 유지하고 표시용 `fromName`·`toName`을 함께 제공한다.

Host의 effective policy는 다음 우선순위로 결정한다.

```text
Runtime edge override
→ 없으면 Manifest edge
→ 없으면 Manifest default
```

Host의 `block`은 runtime edge를 명시 deny로, `unblock`은 명시 allow로 설정한다. YAML이 deny여도
명시 unblock으로 그 방향을 열 수 있다. `reset`은 runtime edge를 제거해 현재 적용된 YAML 정책으로
돌아간다. CLI는 YAML 파일을 수정하지 않고, Network default 변경 명령은 제공하지 않는다.
조회는 적용 정책과 그 출처(runtime edge/manifest edge/manifest default)를 표시한다.

이 계층은 영구적인 CLI 우선순위가 아니다. **같은 적용 범위에서 마지막으로 적용한 변경이 우선**한다.
YAML 실행 → CLI 변경 → YAML restart → CLI 변경 순서대로 앞선 값을 덮어쓴다.
개별 start/restart는 대상 Agent가 출발지 또는 목적지인 route와 membership을 최신 YAML로
적용하고 그 범위의 이전 CLI override를 대체한다. 다른 Agent끼리의 route·override는 보존한다.
전체 restart는 Network 이름·default·Agent 집합·route를 포함한 전체 YAML 구성을 적용한다.
개별 start/restart 전에 YAML의 Network 이름과 default를 현재 적용된 구성과 비교한다.
둘 중 하나라도 변경됐으면 명령을 거절하고 변경 불가 사유와 전체 restart 필요를 CLI에 안내한다.
기존 Agent를 먼저 종료하거나 일부 설정·route를 적용하지 않는다. 전체 restart의 전체 구성 적용은 유지한다.
Host stop 자체는 정책을 초기화하지 않는다. 파일 편집만으로 hot reload하지 않으며 적용 범위 밖의
변경을 적용된 것으로 표시하지 않는다. 새 Agent 추가만으로 YAML이 금지한 route를 자동 허용하지 않는다.

## IDE YAML 작성 지원

VS Code·Cursor용 확장은 `aiox.yaml`과 `aiox.*.yaml`을 자동 인식한다. 필드·값 자동완성,
설명·구조 검사, Agent 참조 자동완성, 참조·라우팅 오류 검사와 정의로 이동을 제공한다.
검사 기준은 이 문서의 Host 입력 계약이다. optional 필드를 강제로 삽입하거나 누락 오류로 취급하지
않으며, 기본값 안내는 편집 중인 파일의 의미이지 실행 중 Host의 적용 구성 조회가 아니다.
저장 전 편집 내용에 반응하고 문법이 깨진 동안 파생 참조 오류를 억제한다.
임의 파일의 수동 연결, Agent 일괄 rename, 시각화와 실행·운영 연동은 현재 범위에서 제외한다.

구현·설치 안내: [AIOX YAML 확장](../../packages/IDE/vscode/README.md).
VS Code 실검증과 Cursor 지원 목표의 검증 상태는 해당 패키지 안내를 따른다.

## aiox.yaml

`routing.default`는 `allow` 또는 `deny`이며, `routing.allow`와 `routing.deny` 목록은
`from/to` 또는 `between`으로 명시 directed edge를 선언한다. 명시 edge가 없는 방향은
YAML default를 적용한다. `default` 생략 시 기본값은 `allow`다.

Agent별 vendor 실행 인자는 `agents.<name>.args: string[]`다. `execute`/`excute` alias는 두지 않는다. block/inline 배열은 같고 생략은 빈 배열이다. 문자열 이외의 요소는 거절한다. 각 요소를 argv 하나로 전달하며 공백 재분리·shell 실행·자동 `--` 삽입을 하지 않는다. CLI의 `--` 이후 인자와 같은 adapter 계약을 따른다. Codex TUI/App Server 중 적용 대상과 AIOX 관리 설정과의 충돌 처리는 adapter 경계에서 구체화한다.

아래는 목표 구성의 전체 예시다. `instruction` 단수, Agent map, Network map 구조를 사용한다.
`networks`라는 복수형 키는 다중 Network 지원을 뜻하지 않으며 현재 항목 하나만 허용한다.
YAML adapter 표기는 `claude`와 `codex`를 사용한다. `claude-code`는 사용하지 않는다.
`version` 필드는 사용하지 않는다. 공통 Host instruction은 `host.instruction`에 선언한다.
공통 instruction과 Agent별 instruction의 vendor 주입은 아래 adapter 경계를 따른다.

```yaml
host:
  name: feature-host
  instruction: |
    이 Host의 Agent들은 역할에 따라 협업한다.

agents:
  reviewer:
    adapter: claude
    role: review
    args:
      - --model
      - sonnet
      - --permission-mode
      - plan
    instruction: |
      구현을 검토하고 발견한 문제를 implementer에게 전달한다.

  implementer:
    adapter: codex
    role: implementation
    instruction: |
      요구사항에 맞게 구현하고 reviewer에게 검토를 요청한다.

  researcher:
    adapter: claude
    role: research
    instruction: |
      조사 결과를 reviewer에게 전달한다.

networks:
  feature-a:
    agents:
      - reviewer
      - implementer
      - researcher
    routing:
      default: deny
      allow:
        - between: [reviewer, implementer]
        - from: researcher
          to: [reviewer]
```

이 예시는 reviewer↔implementer, researcher→reviewer만 허용한다. Network의 `agents`는
Runtime ID가 아닌 위 Agent map key를 참조한다. YAML 전체 reference 검증 → directed edge
확장 → 중복·allow/deny 충돌 검사 → 부수효과 순서로 처리한다. 같은 edge의 상충 선언은
위치·edge를 포함한 오류로 거절한다. 동일 값이라도 같은 directed edge를 중복 선언하면 위치·edge를 포함한 오류로 거절한다. between/from-to를 펼친 결과가 겹치는 경우도 포함한다. 이 규칙은 YAML 선언 검증이며 CLI block/unblock의 반복 실행과는 별개다.

Agent role/description/instruction 메타데이터를 유지한다. AIOX 공통 지침과 실행별 instruction을
합성하되 native AGENTS.md/CLAUDE.md나 사용자 vendor 설정을 자동 덮어쓰지 않는다.
정확한 vendor 주입·우선순위는 adapter 경계에서 검증하며 모든 vendor에 동일한 role hierarchy를
발명하지 않는다. 사용자 전역 terminal/keyboard/port 설정은 manifest와 분리한다.

## 일반 shell과 초기 layout

Host의 shell은 해당 Host 작업 경로를 사용하지만 그 자체는 Agent나 Network 구성원이 아니다.
terminal과 Agent의 독립 수명은 runtime 계약을 따른다.

`host.layout`은 최초 화면 배치 설정이다. `preset`은 `auto`(기본값), `left-main`, `top-main`,
`grid`이며 `columns`·`rows`는 grid용 양의 정수다. 행·열만 지정하면 grid 생략형으로 해석한다.
다른 preset에 행·열을 함께 지정하면 오류다.

우선순위는 CLI → YAML → 전역 `host.layout` → auto다. 같은 preset에서는 명시 필드만
덮어쓰고 누락 필드를 상속하며, preset 변경 시 하위 preset 전용 필드를 버린다.
전역 grid 2×2 + YAML columns=3은 grid 3×2, YAML preset=auto는 행·열 없는 auto다.
중간 계층이 auto로 바꾼 뒤 CLI가 grid로 바꿔도 과거 grid 치수를 되살리지 않는다.
CLI·YAML·전역 config 모두 같은 입력 검증 규칙을 적용한다. 각 입력에서 grid만 지정하고
columns와 rows를 모두 생략하면 오류다. CLI의 `--layout grid` 단독과 YAML/config의
`layout: { preset: grid }` 모두 거절한다. 다른 계층의 치수 상속이나 2×2 기본값으로
이 오류를 보완하지 않으며, 병합 뒤가 아니라 각 입력의 검증 단계에서 거절한다.
columns 또는 rows 중 하나라도 유효한 양의 정수로 지정하면 입력 검증을 통과한다.
유효한 입력끼리 CLI > YAML > 전역 설정 우선순위와 같은 preset의 상속을 먼저 적용한다.
그 뒤에도 columns만 있으면 rows=1, rows만 있으면 columns=1로 최초 배치를 완성한다.
각 입력 파싱 단계에서 1을 먼저 넣어 상속할 값을 덮어쓰지 않는다. 예를 들어 전역 grid 2×2에
YAML columns=3이면 기존대로 3×2이며, 상속할 rows가 없을 때만 3×1이다.

초기 auto는 Agent 1개 전체, 2개 좌우, 3개 왼쪽 하나와 오른쪽 위아래, 4개 이상은 2×2다.
최초 생성 시 5번째부터 생성한 4개 pane에 선언 순서대로 순환 탭 추가한다. A~F는 [A,E] / [B,F] / [C] / [D]이며 최초 선택 A/B/C/D는 유지한다.
Left-main은 왼쪽 하나와 오른쪽 위아래, top-main은 위쪽 하나와 아래쪽 좌우를 사용한다.
영역 수를 넘는 Agent는 YAML 선언 순서대로 pane에 순환 탭 배치하며 최초 선택 탭을 유지한다.
2열×1행의 A~F는 [A,C,E] / [B,D,F]이고 최초 선택은 A/B다. 불필요한 빈 영역을 만들지 않는다.

위 preset별 영역 수는 최초 배치 규칙이며 shell/tab/pane 개수의 상한이 아니다.
이후 사용자는 shell·탭·pane을 추가·삭제·이동·분할할 수 있다. Auto를 포함한 모든 preset에서
새 Agent 탭은 최초 영역 수가 아니라 현재 존재하는 pane의 위→아래·왼쪽→오른쪽 순서로 순환 배치한다.
삭제된 pane은 제외하고 추가·이동한 pane의 현재 위치를 반영한다. 기존 탭의 위치·선택은 유지한다.
같은 Host의 명령 입력 shell 우선과 기존 Agent 탭 재사용은 configuration-web 계약을 따른다.

YAML 위치는 `host.layout`, CLI 표면은 `aiox host run --layout <preset> [--columns <n>] [--rows <n>]`다.
초기 설정 변경으로 사용자가 조정한 현재 화면을 자동 재배치하지 않는다. 공통 영역·탭 UI는
configuration-web 계약을 따른다.

## 시작·재시작·정지·삭제

Host의 Agent 구성·Network·route는 YAML이 소유한다. `host agent add/remove`와
Declared/Ephemeral 구분은 도입하지 않는다. 실행 중인 Agent의 설정은 파일 편집만으로 바뀌지 않는다.

| 명령 | 적용 범위와 결과 |
| --- | --- |
| `host agent start <agent-names...>` | 최신 YAML의 신규 또는 stopped Agent 시작. 실행 중이면 이미 실행 중이라고 안내하고 중복 실행하지 않음 |
| `host agent restart <agent-names...>` | 실행 중인 대상 Agent를 종료하고 최신 정의·관련 route로 다시 실행 |
| `host agent stop <agent-names...>` | 대상 Agent 실행 종료, shell·관리 항목·Network 유지 |
| `host restart` | 최신 YAML 전체 적용. 같은 Host이면 기존 panel과 사용자 shell 보존 |
| `host stop` | YAML Agent 실행들만 종료. shell·panel·Host Network·정책 보존 |
| `host delete` | panel이 소유한 Agent·필수 부속 실행·사용자 추가 shell과 그 작업까지 종료 후 Host·Network·panel 삭제 |

Agent start/restart는 이름을 하나 이상 받는다. 재실행은 새 Runtime ID와 credential을 사용하며
이전 vendor 대화를 자동 resume하지 않는다. stopped는 관리 항목의 실행 수명이며 실시간 Agent
activity status에 새 값을 추가한다는 뜻이 아니다.

### 전체 restart의 구성과 탭

먼저 YAML 전체를 읽고 검증한 뒤 기존 실행을 종료한다. YAML을 읽지 못하거나 사전 검증에 실패하면
CLI에 안내하고 현재 실행·정책·화면을 그대로 유지한다. 저장된 설정으로 새 프로세스를 띄우는 fallback이 아니다.

같은 Host에서 같은 Agent key가 유지되면 남아 있는 Agent 탭·위치를 재사용한다. 추가된 Agent나
탭이 없는 Agent는 다음 순서에 새 탭을 만든다. YAML에서 빠진 Agent는 종료하며 key 변경은
삭제+추가로 처리한다. 이름 변경을 자동 추론하지 않는다.
삭제된 Agent의 실행 shell 또는 stopped 안내 뒤 shell은 종료를 확인하고 탭과 함께 제거한다.
이미 `/exit`이나 Copy로 일반 shell로 돌아온 탭과 사용자가 추가한 shell은 보존한다.
기존 pane 배치를 재정렬하지 않는다. 구체 표시·입력 자리 우선순위는 configuration-web 계약을 따른다.

### stop과 delete의 종료 경계

Stop/status도 선택 positional `[hostname]`을 지원한다. 명시하면 YAML과 무관하게 등록된
Host를 선택하고, 생략하면 --path/--file 또는 현재 디렉터리의 YAML 선택 규칙을 따른다.
등록된 Host를 찾지 못하면 오류이며 다른 Host로 대체하지 않는다.


Delete는 `aiox host delete <hostname>`으로 등록된 Host를 YAML과 무관하게 선택하거나,
`aiox host delete --file <yaml>`로 YAML이 가리키는 Host를 선택한다.
인자 없는 delete는 현재 디렉터리의 YAML 후보를 탐색한다. 후보 하나일 때만 해당 Host를 선택하며,
후보 없음은 오류, 복수 후보는 파일 또는 Host 이름 지정 안내 후 삭제하지 않는다.
Host 이름과 `--file`은 함께 지정하지 않는다. 파일 선택의 다른 디렉터리는 `--path`를 사용한다.


stop은 OS suspend나 `/exit` 입력 주입이 아니라 Agent 실행 프로세스 종료다. 필수 부속 실행과
credential·binding·활성 membership 정리까지 확인하되 Agent를 실행하던 shell은 남긴다.
명시 stop은 stopped 안내를, 사용자의 정상 `/exit`은 기존 shell을 표시한다.

Delete는 busy/idle에 관계없이 해당 Host panel의 모든 소유 프로세스를 종료한다. 일반 shell과
그 안의 사용자 작업도 포함하지만 다른 Host·외부 터미널·무관한 프로세스는 포함하지 않는다.
실제 종료를 확인하기 전에 panel부터 숨기거나 입력/신호 전달 성공을 종료 성공으로 처리하지 않는다.
종료·정리 실패 시 진단과 재시도 가능한 대상을 남긴다. YAML과 프로젝트 파일은 삭제하지 않는다.
Daemon 전체 종료 정책은 runtime 계약의 별도 범위다.

### 시작 실패와 보상

실행 전 YAML 전체·Agent 참조·adapter·이름·Network·routing을 검증한다. YAML 읽기/구문 실패처럼
Agent를 특정하기 전 오류는 CLI에 표시하고 실패 panel이나 탭을 만들지 않는다.
Agent를 특정한 뒤의 시작 실패는 CLI와 해당 탭에 실제 이유를 표시한다.

실패 보상은 이번 시도가 만든 실행·credential·binding·membership·정책 변경에 한정한다.
기존 Host·Network·사용자 shell·파일은 보존하고 정리 실패를 완전 rollback으로 보고하지 않는다.
최초 run 실패로 이번 시도가 만든 Network를 정리하는 것은 정상 수명의 stop/delete 구분과 별개다.
보존된 Network 위의 시작 실패는 기존 Network를 삭제하지 않는다. 일부 Agent 시작 실패를 조용한
부분 성공으로 바꾸지 않으며, 사전 검증 뒤 실제 시작 실패를 옛 프로세스 복원 성공으로 주장하지 않는다.

Standalone 실행 종료·협업 등록 무효화 시 해당 실행의 등록·membership·활성 route는 정리하지만
Persistent Network 정의는 유지한다. 이전 Runtime의 차단 edge를 동명 새 Runtime에 상속하지 않는다.
Daemon 재시작 후 과거 Runtime과 route를 살아 있는 실행으로 복원하지 않는다.

Sources:

- `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §§7, 18, 24 — Host·Network·CLI·YAML
  결정 및 미결의 provenance.

- `logs/2026-09-09-AIOX-TUI-Stage5-Host.md` — 2026-09-21 Host CLI·YAML 선택·restart·stop/delete·shell UI 확정.

## Host 입력 schema와 적용 snapshot

이 절과 아래 HTTP 계약은 Stage5 W1의 구현 대상 계약이다. 현재 Host 구현 완료를 뜻하지 않는다.
YAML은 UTF-8 단일 document의 mapping이며 알 수 없는 키, 중복 mapping key, 사용자 정의 tag와
비문자열 map key를 거절한다. 아래 `?`는 생략 가능이며 명시 `null`은 허용하지 않는다.
이름은 공백만인 값·`/`·NUL을 금지한 문자열이고 대소문자를 구분한다. 이름을 trim하여 다른
이름으로 저장하지 않는다. instruction/description은 빈 문자열을 허용하며 NUL은 금지한다.

| 경로 | 입력·기본값 |
| --- | --- |
| root | `host`, `agents`, `networks`만 필수 |
| `host` | `name: name`, `instruction?: string`(기본 `""`), `layout?: LayoutInput` |
| `agents` | 하나 이상인 순서 있는 map. key가 관리 Agent 이름 |
| `agents.<key>` | `adapter: claude 또는 codex`; `role?: nonblank string`, `description?: string`, `instruction?: string`, `args?: string[]` |
| Agent 생략값 | role/description은 조회에서 null, instruction `""`, args `[]` |
| `networks` | 정확히 한 항목인 map. key가 Host 범위 Network 이름 |
| `networks.<key>` | `agents: name[]`, `routing?: Routing` |
| membership | 중복 없는 Agent key 목록. 빈 목록·선언 Agent의 부분집합도 유효; 비소속 Agent는 협업 membership 없음 |
| `Routing` | `default?: allow 또는 deny`(allow), `allow?: Edge[]`, `deny?: Edge[]`(각 `[]`) |
| `Edge` | `{between: name[]}`(서로 다른 최소 2명) 또는 `{from: name, to: name[]}`(하나 이상); 두 형식 혼합 금지 |
| route 참조 | 모두 해당 Network membership 안의 Agent key. self edge·중복 endpoint·확장 후 중복 directed edge 금지 |
| `LayoutInput` | `{preset?: auto 또는 left-main 또는 top-main 또는 grid, columns?: positive-safe-integer, rows?: positive-safe-integer}` |

LayoutInput의 빈 object는 override 없음이다. 치수 없는 명시 grid는 오류이며 나머지
검증·상속·최종 한쪽 치수 보충은 위 「일반 shell과 초기 layout」을 따른다.
`args`는 NUL 없는 문자열 배열이며 쉘 문자열이 아니다. Host 공통 instruction 다음에 비어 있지
않은 Agent instruction을 빈 줄 하나로 잇고, 공통 협업 지침과의 vendor별 합성은
[[docs/architecture/aiox-vendor-bindings]]가 소유한다. metadata를 vendor role로 임의 승격하지 않는다.

위 전체 YAML 예시에 다음 선택 필드를 넣을 수 있다. 이 외 cwd/env/ports/theme/version/
worktree/execute/외부 Network 참조는 이 schema에 없다.

```yaml
# 위 예시의 host 안
layout: { preset: grid, columns: 2 } # 하위 rows 상속 후 없을 때만 rows=1
# 위 예시의 agents.reviewer 안
description: Reviews implementation changes.
```

서버는 선택 디렉터리·YAML 절대 경로와 읽은 선언을 검증한 뒤 하나의 prepared 입력으로 고정한다.
실행 도중 파일을 다시 읽어 이번 요청의 정의를 바꾸지 않는다. 파일 편집 감시·hot reload는 없다.
`applied`는 이 prepared 입력 중 실제 명령 적용 범위만 저장한 결과다. 개별 start/restart는
선택한 Agent 정의와 그 Agent에 닿는 membership/route만 바꾸며 나머지 적용 구성을 보존한다.
Network 이름/default가 달라지면 사전 거절한다. 파일 전체와 적용 구성이 같다고 표시하지 않는다.
실행 실패해도 이미 적용 transaction이 commit됐다면 적용된 정의와 실패 결과를 조회한다.

## Host HTTP 계약

CLI는 daemon listener, React는 동일 origin의 Web listener에서 같은 handler를 호출한다.
식별자는 opaque 문자열이며 path segment를 percent-encode한다. 자원 path의 `hostId`와
`networkId`는 ID만 받으며 이름 fallback은 없다. Web과 CLI 모두 조회로 얻은 ID를 사용한다.
CLI의 hostname/network 인자는 이름 전용이며 ID처럼 생겨도 정확한 이름으로만 조회한다.
Runtime ID와 YAML Agent key를 교환하지 않는다. 입력 오류/Host 명령 결과 공통 형식은
[[docs/specs/aiox-runtime]]의 「Host 명령 검증과 완료 응답」을 따른다.

`Source = {directory: absolute-directory, file?: string}`. CLI가 `--path` 또는 호출 cwd를
절대 경로로 만들며 file은 선택 directory 기준 상대 경로나 절대 경로다. 서버가 선택·읽기를
수행한다. 디렉터리는 YAML의 부모로 암묵 변경되지 않으며 Host 작업 경로로 저장한다.
`Invocation = {terminalContext?: {terminalId,token}}`는 CLI의 인증된 shell env만 전달한다.
Web·일반 요청의 panelId나 cwd를 실행 위치 인증으로 사용하지 않는다. token은 응답·로그에서 제외한다.

| Method / path | 요청 body / caller | 성공 body |
| --- | --- | --- |
| `POST /api/hosts/run` | CLI: `{requestId,source,layout?:LayoutInput,...Invocation}` | 200 NDJSON Host 명령 결과 |
| `POST /api/hosts/restart` | CLI: `{requestId,source,...Invocation}`. 최신 YAML 이름으로 선택 | 200 NDJSON Host 명령 결과; 이름 변경이면 새 hostId |
| `GET /api/hosts` | CLI list / React Hosts; 선택 query `name`은 정확한 이름 필터 | 200 `HostView[]`; name 지정 시 0 또는 1개 |
| `GET /api/hosts/:hostId` | CLI status / React | 200 HostView |
| `POST /api/hosts/resolve` | YAML로 status/stop/delete 대상을 찾는 CLI: `{source}` | 200 `{hostId}`; config→YAML 검증 뒤 host.name 정확 일치 조회, 생성·재적용 없음 |
| `POST /api/hosts/:hostId/stop` | CLI/Web: `{requestId}` | 200 NDJSON Host 명령 결과 |
| `DELETE /api/hosts/:hostId` | CLI/Web: `{requestId}` | 200 NDJSON Host 명령 결과; 모든 종료 확인 전 Host 유지 |
| `POST /api/hosts/agents/start` | CLI: `{requestId,source,agents:string[],...Invocation}` | 200 NDJSON Host 명령 결과 |
| `POST /api/hosts/agents/restart` | CLI: 같은 body | 200 NDJSON Host 명령 결과 |
| `POST /api/hosts/:hostId/agents/stop` | YAML로 Host를 resolve한 CLI 또는 Web: `{requestId,agents:string[]}` | 200 NDJSON Host 명령 결과 |
| `GET /api/hosts/:hostId/networks` | CLI network list / React; 선택 query `name`은 해당 Host 안의 정확한 이름 필터 | 200 `HostNetworkView[]`(필터 부재 시 한 항목, 지정 시 0 또는 1개) |
| `GET /api/hosts/:hostId/networks/:networkId` | CLI network show / React | 200 HostNetworkView |
| `POST /api/hosts/:hostId/networks/:networkId/route` | CLI: `{operation}`; 기존 between/directed routeOperation 형식, endpoints는 관리 Agent key | 200 HostNetworkView |

`networkId`는 지정한 hostId에 속한 Network ID여야 한다. 존재해도 다른 Host 소속이면
404 `unknown_network`이며 이름이나 다른 scope로 대체하지 않는다. route는 모든 대상을 검증한 뒤
한 transaction으로 변경한다. live Runtime이 없어도 관리 Agent key 정책을 변경할 수 있다.
`host agent start/restart`의 미등록 Host는 404와 `host run` 안내다. 전체 restart는 새 YAML 이름의
미등록 Host를 별도로 실행할 수 있다. 이미 실행 중인 개별 start는 해당 대상만 `unchanged`,
개별 restart의 stopped 대상은 409 `agent_not_running`이며 모든 대상 검증 전에 종료하지 않는다.
중복 agents 인자는 첫 출현 순서로 한 번만 처리한다.

### 이름 조회와 ID 제어의 분리

`name` query는 URL query encoding 후 전달하며 대소문자·공백을 바꾸거나 prefix/부분 일치로
검색하지 않는다. 지정한 이름이 없으면 배열은 비어 있고 CLI는 unknown_host/unknown_network와
exit 1로 종료한다. 이름 문자열을 ID path에 대신 넣어 재시도하지 않는다.

```text
host stop/delete <hostname>
 → GET /api/hosts?name=<정확한 이름> → HostView.id
 → POST /api/hosts/:hostId/stop 또는 DELETE /api/hosts/:hostId
host network block <host> <network> ...
 → GET /api/hosts?name=<host> → hostId
 → GET /api/hosts/:hostId/networks?name=<network> → networkId
 → POST /api/hosts/:hostId/networks/:networkId/route
```

YAML 기반 resolve/run/restart/개별 start/restart도 `host.name`은 정확한 이름으로만 해석한다.
서버는 해석한 ID를 이번 작업 대상으로 고정한다. 조회 뒤 대상이 삭제되면 ID 제어는 404이며,
같은 이름으로 새 Host/Network가 생겨도 재해석하여 조작하지 않는다. 삭제된 ID를 재사용하지 않는다.
이름을 ID 형태라는 이유로 금지하거나 CLI에 ID 선택을 암묵 추가하지 않는다.

예를 들어 Host A의 `{id:"h1",name:"alpha"}`와 Host B의 `{id:"h2",name:"h1"}`가 있을 때
`host stop h1`은 이름 조회로 h2를 얻어 B만 정지한다. B가 없으면 A로 fallback하지 않고 오류다.
`GET /api/hosts/h1`은 ID 전용이므로 A를 반환한다. Host Network에도 같은 규칙을 적용한다.

Persistent Network에도 목표 계약은 동일하다. `GET /api/networks?name=<name>`은 persistent
scope의 정확한 이름 조회로 `NetworkView[]`(0 또는 1개)를 반환한다. 일반 CLI network
show/delete/block/unblock/reset은 여기서 ID를 얻고 `GET/DELETE /api/networks/:networkId`,
`POST /api/networks/:networkId/route`는 persistent ID만 받는다. Host 소속 ID를 일반 제어 경로에
넣으면 거절하고 이름으로 fallback하지 않는다. Host-qualified network show는 Host 이름을 먼저
조회하고 위 Host Network 경로를 사용한다. create 응답으로 이미 얻은 ID는 다시 이름 조회하지 않는다.
Network route의 **Agent endpoint** 이름/Runtime ID 해석과 MCP send 계약은 이 변경 대상이 아니다.

현재 persistent NetworkService.find는 ID 우선·이름 fallback이며 CLI도 입력을 직접 보낸다.
이 부분은 위 목표와 다른 구현 gap이다. 근거: [[apps/daemon/src/networks.ts]]
`apps/daemon/src/networks.ts:58-80`, [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:600-650`,
[[packages/protocol/src/index.ts]] `packages/protocol/src/index.ts:244-247`.
W1은 계약만 변경했으며 실제 persistent API가 이미 ID 전용이라고 보고하지 않는다.

Host·Network 조회 DTO는 [[docs/specs/aiox-configuration-web]]의 SSE state에서도 그대로
사용한다. 관리 Agent의 실제 상태 변경은 최신 HostView로 전달하고 배치만 바뀌면 panel을
전달한다. Host revision은 실행 관측 이벤트의 순번이 아니며 SSE 전달을 위해 별도의 순번으로 전용하지 않는다.

### 조회 DTO와 route 예시

HostView는 `{id,name,directory,sourceFile,instruction,panelId,networkId,revision,agents}`다.
`revision`은 적용 구성·route 변경 시 증가하는 양의 정수다. sourceFile은 provenance이며 읽기 성공을
보증하지 않는다. `agents`는 **적용된 선언 순서**의 ManagedAgentView 배열이다.
관리 Agent 상태는 탭의 표시와 별개다. stop 뒤에도 배열에서 제거하지 않는다.

```json
{
  "id":"h1","name":"feature-host","directory":"/work/project",
  "sourceFile":"/work/project/aiox.dev.yaml","instruction":"Collaborate on changes.","panelId":"p1","networkId":"n1",
  "revision":3,
  "agents":[{
    "key":"reviewer","adapter":"claude","role":"review","description":null,
    "instruction":"Review changes.","args":[],"member":true,
    "runtime":null,"lastTerminalId":"t1",
    "lastExit":{"kind":"stopped","message":null,"at":1789948800000}
  }]
}
```

`runtime`는 null 또는
`{id,terminalId,phase,status,status_reason,observation_error,collaborationActive,collaborationError}`다. phase는 `preparing|running|stopping`이며 status는
runtime owner의 다섯 값이다. phase는 실행 수명이고 status는 관측 활동이라 failed와 running이
함께 가능하다. runtime이 null일 때만 관리 카드가 stopped다. 프로세스 종료는 관측됐지만
정리가 남으면 runtime은 null이어도 그 명령 결과의 대상 오류가 남는다.
`lastExit`는 null 또는 `{kind: stopped|exited|crashed|start-failed|daemon-ended,message:string|null,at:epoch-ms}`.
`lastTerminalId`는 이력용 nullable 참조이며 재사용 가능 자리 판정에 쓰지 않는다.

HostNetworkView는 `{id,hostId,name,scope:"host",default,members,edges}`다.
`members`는 `{agentKey,runtimeId:string|null}[]`, `edges`는 self를 제외한 모든 멤버 간
`{from,to,fromRuntimeId,toRuntimeId,policy,source}` 배열이다. from/to는 Agent key,
Runtime ID들은 nullable이고 source는 `runtime-override|manifest-edge|manifest-default`다.
일반 persistent Network DTO의 Runtime ID endpoint와 혼용하지 않는다.

```json
{
  "operation":{"kind":"directed","action":"unblock","from":"reviewer","to":["implementer"]}
}
```

이 요청의 해당 edge 응답 예시는
`{"from":"reviewer","to":"implementer","fromRuntimeId":null,"toRuntimeId":null,"policy":"allow","source":"runtime-override"}`다.
stop은 이를 보존하며 다음 실행 때 key→새 Runtime ID로 materialize한다. send 시 인증된 Runtime의
현재 membership/route를 다시 검사하는 collaboration 계약은 그대로다.

개별 적용에서 새 route의 다른 endpoint가 아직 적용된 관리 구성에 없으면
400 `invalid_yaml`과 해당 edge·전체 restart 안내를 반환한다. 요청하지 않은 Agent를 자동 추가하지
않는다. run의 같은 이름이 다른 sourceFile에 등록돼 있으면 `host_name_conflict`다. 전체 restart의 명시적 구성 교체와 run의 중복 생성 거절은 구분한다.
