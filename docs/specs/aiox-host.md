# AIOX Host and Network Contract

Status: Committed target

이 문서는 Host 실행·작업 공간·manifest, Network 정의의 권위와 directed routing을 소유한다.
CLI 전체 표면은 [[docs/specs/aiox-runtime]], 인증·실제 send 판정은
[[docs/specs/aiox-collaboration]]을 따른다.

## 실행 namespace와 작업 공간

Host는 manifest의 Agent와 전용 Network 하나를 작업 공간에서 실행하는 독립 namespace다.
`host run`은 호출한 터미널 위치와 무관하게 daemon 소유로 실행하고 Web에 표시한다.
실행 소유권·daemon 종료 경계는 [[docs/specs/aiox-runtime]]을 따른다.
같은 YAML을 여러 번 실행해도 Host Runtime ID, Agent Runtime ID, token, Network는 별개다.
실행 중 Host 이름은 daemon 범위에서 유일하다. `--name`은 YAML `host.name`을 덮어쓰며,
서로 다르다는 이유만으로 오류를 내지 않는다.

```text
aiox host run --path ./aiox.yaml --name feature-host
└─ 현재 프로젝트 경로 + Host H1 + Network N1 + Agent runtimes

aiox host run --path ./aiox.yaml --name login --worktree feature/login
└─ Git Worktree 경로 + Host H2 + Network N2 + 별도 Agent runtimes
```

Host 내부 Agent는 하나의 작업 경로를 공유한다. Agent별 Worktree는 추가하지 않는다.
Host namespace는 파일 sandbox가 아니므로 두 Host가 같은 경로를 사용하면 파일을 공유한다.
`--worktree`는 AIOX가 Git 작업 공간 준비를 수행하며 사용자가 먼저 `git worktree add`를
실행해야 하는 흐름이 아니다.

Worktree 생성 위치·기준 commit·기존 branch/checkout 재사용·충돌 처리는 herdr 구현을
참고해 구체화할 Open/deferred 항목이다. `.aiox/worktrees/...`나 형제 경로는 아직 기본값이
아니다. 자동 force·merge·commit·작업 파일 삭제를 추가하지 않는다.

## Network 권위와 소속

| 종류 | 정의 권위 | 실행·종료와 관리 |
| --- | --- | --- |
| Persistent Network | daemon DB | `network create/delete/route`, 명시 delete까지 정의 유지 |
| Host-managed Network | 해당 `aiox.yaml` | Host 실행마다 실체화, `host network route`로 현재 실행 override, Host 종료 때 정리 |

Host당 Network 하나, Agent의 동시 Network 소속도 최대 하나다. daemon 전체에서 여러 독립
Network를 관리하는 것은 가능하다. Host YAML의 persistent Network external 참조는 제외한다.
YAML 정의를 global persistent Network로 동시에 저장해 이중 권위로 만들지 않는다.

- Persistent Network는 global scope, Host Network는 Host runtime scope다. `feature-a`와
  `feature-host/feature-a`는 이름이 비슷하다고 merge/replace하지 않는다.
- `network list`는 persistent만, `--all`은 host-managed도 표시한다. `network show`는
  Host-qualified Network도 조회한다. 일반 delete/route는 persistent에만 적용한다.
- Persistent Network에 참여 실행이 남아 있으면 삭제를 거절하고 먼저 참여 정리를 안내한다.
  준비 중 등록과 정리 실패로 남은 등록도 포함하며, 삭제를 위해 실행을 자동 종료·분리하지 않는다.
  현재 API는 HTTP 400 / `network_in_use`로 응답하고 CLI는 해당 안내를 표시한다. [Status: Current]
  근거: [[apps/daemon/src/networks.ts]] `apps/daemon/src/networks.ts:69-79`,
  [[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:416-541`,
  [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:76-88`.
- `agent run --network`는 한 값만 받는다. 실행 중 join/leave나
  Network 소속 변경 기능은 제공하지 않는다. 실행 소유권과 Network membership은 별개다.
- Manifest의 Agent definition key를 실행 때 새 Runtime ID로 해석해 membership/route를 만든다.
  같은 이름의 다른 Host Agent가 섞이지 않아야 한다.
- Host 종료·등록 유효성 상실 시 membership과 Host Network 실행 자원을 정리한다. 새 lease
  체계를 미리 요구하지 않는다. persistent 정의가 남아도 과거 membership을 살아 있는 실행으로
  복원하지 않는다.

## Routing과 변경

`network create`의 기본 정책은 allow다. 명시 directed edge가 없으면 Network default를
적용한다. between은 자기 자신을 제외한 상호 directed clique, from/to는 단방향이다.
연결을 전이적으로 추론하지 않는다.

한 route 호출은 한 종류의 변경이다. `--allow-from`/`--deny-from`/`--reset-from`에는 `--to`가
필요하고 `--to` 단독도 오류다. 같은 layer의 edge에는 하나의 값만 두며 runtime CLI 변경은
기존 값을 교체한다. Persistent reset은 명시 edge를 제거해 Network default로 돌아간다.

Host의 effective policy는 다음 우선순위로 결정한다.

```text
Runtime edge override
→ 없으면 Manifest edge
→ 없으면 Runtime default override
→ 없으면 Manifest default
```

Host CLI는 YAML을 수정하지 않는다. 재실행하면 runtime override는 없어지고 manifest로
재구성한다. `--reset-between`/`--reset-from`은 runtime edge override를 제거하므로 YAML edge가
있으면 그 값으로 돌아간다. `--reset-default`는 runtime default override만 제거한다.
`--default deny`도 manifest의 명시 allow edge를 없애지 않는다. 조회는 effective policy와
그 출처(runtime edge/manifest edge/runtime default/manifest default)를 함께 표시한다.

## aiox.yaml

Agent별 vendor 실행 인자는 `agents.<name>.args: string[]`다. `execute`/`excute` alias는 두지 않는다. block/inline 배열은 같고 생략은 빈 배열이다. 문자열 이외의 요소는 거절한다. 각 요소를 argv 하나로 전달하며 공백 재분리·shell 실행·자동 `--` 삽입을 하지 않는다. CLI의 `--` 이후 인자와 같은 adapter 계약을 따른다. Codex TUI/App Server 중 적용 대상과 AIOX 관리 설정과의 충돌 처리는 adapter 경계에서 구체화한다.

아래는 목표 구성의 전체 예시다. `instruction` 단수, Agent map, Network map 구조를 사용한다.
`networks`라는 복수형 키는 다중 Network 지원을 뜻하지 않으며 현재 항목 하나만 허용한다.
`version: 1`의 정식 schema 도입 여부와 adapter 등록 ID, 공통 Host instruction의 YAML 위치는
Open/deferred다. 예시의 값만으로 이를 구현 확정으로 취급하지 않는다.

```yaml
version: 1

host:
  name: feature-host

agents:
  reviewer:
    adapter: claude-code
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
    adapter: claude-code
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
위치·edge를 포함한 오류로 거절한다. 동일 값 중복의 거절/병합은 아직 미결이다.

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
어느 계층에도 없는 grid 치수나 auto의 5개 이상 배치 세부는 미정이며 임의 기본값을 추론하지 않는다.

YAML 위치는 `host.layout`, CLI 표면은 `aiox host run --layout <preset> [--columns <n>] [--rows <n>]`다.
초기 설정 변경으로 사용자가 조정한 현재 화면을 자동 재배치하지 않는다. 공통 영역·탭 UI는
configuration-web 계약을 따른다.

## 시작·실패 보상·종료

실행 전에 YAML 전체, Agent 참조, adapter 지원, Host 이름과 Network를 검증한다. 시작 중
실패 보상은 이번 시도가 만든 Runtime·membership·binding·credential에 한정한다. 기존 Host와
사용자 작업 파일을 삭제하지 않으며 정리 실패를 완전 rollback으로 보고하지 않는다.

```text
host stop <host>
→ HostController 종료 전환
→ Adapter가 소유한 TUI에 종료 입력 전달
→ 실제 프로세스 종료 확인
→ 소유한 App Server 등 부속 실행 정리
→ credential·binding·membership·Host Network·등록 정리
→ 작업 공간·작업 결과 보존
```

정확한 종료 키·순서·시간 제한은 미검증이며 입력 전달 성공을 종료 성공으로 간주하지 않는다.
일부 child의 종료 실패·관측 불가는 전체 Host 종료 성공이 아니다. daemon force stop은
[[docs/specs/aiox-runtime]]의 별도 강제 종료 계약을 따른다.

Host의 Agent 구성·Network·route 정의는 YAML이 소유한다. `host agent add/remove`와 Declared/Ephemeral 구분을 도입하지 않는다.

```text
aiox host agent start <host> <agent-names...>
aiox host agent stop <host> <agent-names...>
```

Agent는 해당 Host 안의 이름으로 하나 이상 지정한다. stop은 실행·credential·binding·활성 membership을 정리하고 Host의 항목·메타데이터·실행 설정을 stopped로 유지한다. start는 기존 항목을 새 Runtime ID·credential로 실행하며 이전 vendor 대화를 자동 resume하지 않는다. 이미 실행 중인 항목을 중복 실행하지 않고 이름별 결과를 보고한다. 보존한 Host route 설정은 새 실행 ID에 연결하며 stopped 항목에는 전달하지 않는다.

Standalone 실행 종료 또는 협업 등록 유효성 상실 시 실행 등록·membership·해당 실행 endpoint의 활성 route를 정리한다. Persistent Network 정의 자체는 남긴다. Host 전체 종료 시 Host·전용 Network·membership·runtime route override를 정리한다. YAML·Worktree·작업 파일과 보존 기간 내 메시지 이력은 남긴다. 다음 host run은 YAML로 새로 build하며 과거 실행이나 vendor 대화를 자동 복원하지 않는다. `host network route`는 현재 Host 실행만 변경하고 YAML에 쓰지 않는다.

Sources:

- `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §§7, 18, 24 — Host·Network·CLI·YAML
  결정 및 미결의 provenance.
