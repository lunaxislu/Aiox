# Grok Build 기본 TUI와 공유 leader 연동 조사

조사일: 2026-09-09. 공식 `xai-org/grok-build` commit `72a61251fcffb464bcc687aeb5a998e5a98ec0c9`의 문서·소스를 읽었다. 실제 설치, CLI 실행, TUI·모델 호출은 하지 않았다. 아래 vendor 테스트는 **테스트 코드 확인**이며 이번에 통과를 실측한 결과가 아니다.

이 문서는 향후 adapter 연구 자료다. 현재 AIOX의 구현 명세·Stage 2 범위를 변경하지 않는다. 공통 도구 계약은 [협업 명세](../docs/specs/aiox-collaboration.md)의 `send({targets, content})`와 `agents_list`, 기존 통합 구조는 [vendor bindings](../docs/architecture/aiox-vendor-bindings.md)가 소유한다.

## 결론과 이전 판단 정정

**monitor보다 먼저 검토할 경로는 실제 Grok TUI와 같은 leader의 같은 live session에 ACP client를 연결하는 것이다.** 기본 TUI가 공유 leader의 client로 동작하고, 동일 session의 여러 TUI가 양방향 turn stream을 공유하는 공식 소스와 테스트 코드가 있다.

이전 조사에서 backend에 `agent`/`stdio`라는 이름이 있다는 이유로 배제한 것은 범위를 지나치게 좁힌 판단이었다. 제외 대상은 TUI와 무관한 새 headless 대화이며, **vendor backend + 실제 vendor TUI + AIOX 제어 연결**은 기본 TUI 유지 조건과 양립한다.

다만 같은 leader에 연결하는 것만으로 현재 화면의 session을 자동 식별하거나 기존 TUI 설정을 보존하는 것은 아니다. 현재 대화 바인딩과 side client의 load 영향은 여전히 닫아야 한다.

## 우선 구성 후보

```text
AIOX Runtime
├─ 실제 Grok TUI ───────┐
│   승인·질문·slash UX  │ leader IPC / ACP
│                      ▼
├─ 전용 Grok leader ── 같은 canonical live session
│                      ▲
└─ AIOX adapter        │ ACP
    └─ Grok stdio proxy┘
       입력·event 관측

Grok model ── HTTP MCP ── AIOX daemon
```

**제안:** runtime마다 별도 leader socket을 사용한다. 이미 사용 중인 전역 leader에 런타임 토큰이나 설정을 섞는 것을 피하고 종료 소유권을 명확히 하기 위해서다. 이 토폴로지의 3개 프로세스는 AIOX runtime 하나의 관리 대상이다. stdio proxy는 vendor ACP 연결용이며, AIOX MCP를 stdio로 바꾸는 것이 아니다.

## 기본 TUI와 같은 session을 공유하는 근거

[기본 CLI](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-pager/src/app/cli.rs#L421)에는 전역 `--leader-socket`, 기본 TUI의 hidden `--leader`/`--no-leader`, `--resume`가 있다. [TUI leader bridge](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-pager/src/acp/leader_bridge.rs)는 leader IPC와 TUI ACP 채널을 연결한다. 따라서 TUI를 별도로 복제할 필요가 없다. hidden CLI와 내부 IPC는 공식 저장소 구현이라는 의미이며 장기 호환 공개 계약이라고 단정하지 않는다.

[두 TUI 공유 세션 테스트](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-pager/tests/leader_pty_e2e/leader_two_clients_shared_session.rs)는 A가 격리 leader를 시작하고 B가 같은 socket 및 resume으로 같은 session에 붙는 흐름이다. 이후 A의 턴이 B로, B의 턴이 A로 실시간 전달되고 A 종료 후 B와 leader가 살아 있는 것을 assertion한다. 모의 응답을 쓰는 ignored PTY E2E 코드이며 이번에는 실행하지 않았다. 이 근거는 별도 복제 대화가 아니라 live 공유가 구현 의도임을 보여 준다.

아래는 **실행하지 않은 명령 후보**다. session ID 확보 및 load metadata는 adapter 설계 전에 확인해야 한다.

```sh
# 실제 vendor TUI; 전용 socket에서 leader 시작/연결
# 아래 경로는 Unix 예시이며 실제 위치는 runtime이 정한다.
grok --leader --leader-socket /absolute/runtime/leader.sock

# AIOX가 파이프로 제어할 vendor ACP proxy 후보
# TUI와 같은 leader를 사용하며 별도 session/new를 호출하지 않는다.
grok --leader-socket /absolute/runtime/leader.sock agent --leader stdio

# 또 다른 실제 TUI의 같은 session attach 후보
grok --leader --leader-socket /absolute/runtime/leader.sock --resume SESSION_ID
```

`agent serve --bind …`는 secret을 가진 WebSocket server이고 위 leader IPC와 다른 경로다. serve를 띄우기만 하면 기존 TUI가 그 server를 공유한다고 결론 낼 수 없다. 이번 우선안에는 serve를 섞지 않는다.

[ServeArgs / LeaderArgs](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-pager/src/app/cli.rs#L354)와 [leader protocol](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-shell/src/leader/protocol.rs#L116)에서 구분을 확인했다. `ClientMode::Stdio`는 로컬 IPC로 ACP를 송수신하는 모드다. [공식 stdio integration tests](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-shell/tests/test_leader_stdio_integration.rs)도 여러 stdio client의 메시지 송수신·session routing을 다룬다.

## ACP 입력·관측과 correlation

후보 흐름:

```text
TUI가 leader에서 session 생성/선택
→ AIOX가 해당 activeSessionId를 확보
→ 같은 leader에 ACP initialize
→ 같은 session/load로 구독 연결 후보
→ session/prompt(activeSessionId, text, _meta.promptId)
→ 응답 stream 및 turn 완료/오류 관측
```

이것은 전 경로 실측 성공을 뜻하지 않는다. 입력은 monitor stdout을 거치지 않는 ACP session 요청이므로 monitor의 줄·batch 절단 제한이 적용되지 않는다. monitor 역시 composer를 편집하는 방식은 아니다. ACP와 모델 자체 한도까지 무제한이라는 뜻은 아니다.

[leader routing](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-shell/src/leader/server.rs#L1837)은 session ID가 있는 client 메시지에 대해 해당 client를 subscriber로 등록하고, 요청 ID를 client별로 구분해 응답을 돌려준다. session/new·load 응답의 session ID도 구독에 등록한다. 한 client의 JSON-RPC 요청 응답과 모든 subscriber가 받는 session stream을 구분할 수 있다.

[TurnCompleted schema](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-shell/src/extensions/notification.rs#L992)는 `prompt_id`, `stop_reason`, optional `agent_result`, `error_kind`, usage를 갖는 영속·재생 가능한 종료 이벤트다. `prompt_complete`와 동일한 알림으로 취급하지 않는다. [공식 hooks guide](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-pager/docs/user-guide/10-hooks.md#L358)는 client가 `_meta`로 제공한 promptId의 유일성을 책임진다고 명시한다. 따라서 AIOX가 자체 고유 turn ID를 제공하고 종료와 연결하는 설계 근거가 있으며, marker를 모델에게 복창시키는 방식보다 낫다. 정확한 외부 수신 wrapper와 해당 ID 전달은 첫 단일 실측에서 확인한다.

**미확인:** side client가 일반 `session/prompt`로 보낸 입력의 native sender 라벨과 최종 모델 role. 직접 ACP 경로가 있다는 이유로 Claude식 peer message 렌더링까지 있다고 주장하지 않는다. 전달·관측 API와 화면 발신자 표현은 별도다.

## 사용자 승인·질문은 TUI에서 유지할 수 있는가

[interaction 분류](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-shell/src/leader/server.rs#L492)는 `session/request_permission`, `x.ai/ask_user_question`, `x.ai/exit_plan_mode`, `x.ai/mcp/elicit`를 모든 session subscriber에게 공유하고 첫 응답을 채택하도록 설명한다. [실제 분기](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-shell/src/leader/server.rs#L2206)에서도 일반 reverse request와 interaction을 분리한다. 따라서 side client의 입력으로 시작한 작업도 실제 TUI에서 승인·질문을 보여 주고 답할 수 있는 구조적 근거가 있다.

**제안:** AIOX는 이 interaction을 알림용으로만 관측하고 자동 승인·거절 응답을 보내지 않는다. TUI를 먼저 연결해 최초 driver로 유지한다. 다른 reverse request는 단일 driver로 가므로 filesystem·terminal 요청을 지원하지 않는 side client가 driver가 되면 안 된다. TUI가 사라지면 driver가 다른 client로 넘어갈 수 있어, 이때는 제어 가능 상태를 그대로 유지했다고 가정하지 않는다.

## 아직 닫히지 않은 두 연결

### 현재 보이는 session 추적과 load의 영향

같은 leader는 여러 session을 관리할 수 있다. 처음 알게 된 ID를 영구 고정하면 사용자의 `/new`·resume 후 옛 대화에 주입할 수 있다. leader stream에서 아무 session event를 봤다는 것만으로 그 session이 TUI의 현재 화면이라고 판단해서도 안 된다.

[session 요청 context 주입](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-shell/src/leader/server.rs#L657)은 session/new·load·resume에 client identity와 capabilities를 반영한다. [live actor client hooks](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-shell/src/session/acp_session.rs#L1037)에는 load reconnect가 live actor의 client hooks를 교체할 수 있다는 설명도 있다. 따라서 빈 기본 metadata로 side load를 해도 TUI의 terminal/filesystem/hooks 설정에 영향이 없다는 가정은 금물이다. 현재 visible session을 정확히 추적하는 relay 또는 공식 구독 방법과 load 보존 계약은 미확인으로 남긴다.

### runtime MCP 및 instruction

[MCP env expansion](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-pager/docs/user-guide/07-mcp-servers.md#L278)는 HTTP headers의 `${AIOX_MCP_TOKEN}` 확장을 지원한다. 실제 토큰은 argv 대신 backend가 읽는 env에 넣어야 한다. **proxy의 env만 바꿔도 이미 떠 있는 leader의 env가 바뀌지는 않는다.** 전용 leader 시작 시 전달하거나 session config를 통한 안전한 주입이 필요하다.

[plugin CLI scope](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-pager/docs/user-guide/09-plugins.md#L360)는 `--plugin-dir`가 dedicated `agent … stdio`의 process scope이고 leader mode에서는 무시된다고 명시한다. CLI 타입상 AgentArgs에 있어 다른 agent subcommand에서도 파싱될 수 있다는 것과 실제 적용은 다르다. `agent --leader --plugin-dir … stdio`로 기존 leader에 MCP가 주입된다고 주장하면 안 된다. 같은 문서의 `_meta.pluginDirs`는 session/new·load용이고 후보이지만, shared live session의 기존 설정 보존과 실제 적용 순서를 아직 확인하지 않았다.

[TUI rules](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-pager/src/app/cli.rs#L526)는 `--rules` / `--append-system-prompt`를 제공한다. TUI launch에서 instruction을 append하는 후보이며 side load가 이것을 보존하는지도 확인해야 한다. 기존 user/project MCP·rules를 버리거나 permission bypass를 켜는 예제는 권장하지 않는다.

## OS와 프로세스 경계

[leader transport](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-shell/src/leader/transport.rs)는 Unix UDS와 Windows named pipe를 구현한다. Windows에서는 입력 path를 hash한 `\\.\pipe\grok-leader-<hash>`로 변환한다. WSL은 Linux 실행 환경의 IPC로 취급할 후보이며 Windows↔WSL 직접 연결은 검증하지 않았다.

[wire framing](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-shell/src/leader/protocol.rs#L6)은 4-byte big-endian 길이 + JSON, 최대 64MiB frame이다. raw IPC를 직접 구현하면 버전·frame·등록·routing을 AIOX가 떠안는다. 따라서 vendor stdio proxy가 필요한 역할을 수행하는지 먼저 확인하는 편이 낫다. 별도 receiver나 custom raw IPC를 처음부터 만들지 않는다.

## monitor는 후순위 대안

monitor 경로 자체는 유효한 후보지만, 위 ACP 공유 경로의 제약으로 일반화하지 않는다. monitor는 stdout → MonitorEvent → 내부 notification 입력이며 최초 tool 시작, 여러 event의 한 턴 병합, session ownership을 따로 해결해야 한다. busy 중 mid-turn buffer도 있어 항상 idle 후 처리라고 단정할 수 없다.

### monitor 본문 절단 제한

확인한 상수와 구현:

| 지점 | 현재 소스의 제한 |
| --- | --- |
| stdout 한 줄 | 500 byte 경계에서 절단 후 표식 추가 |
| batch | 3,000 byte 경계에서 절단 후 표식 추가 |
| debounce | 200ms |
| raw buffer | 1MiB cap |
| rate limiter | bucket capacity 10, refill interval 2,000ms |
| 지속 rate-limit 위반 | 30,000ms auto-kill threshold |
| 일반 timeout | 기본 및 최대 10시간; persistent는 별도 |

상수 주석은 characters라고 쓰지만 실제 `str.len()`과 byte slice를 사용한다. UTF-8 문자 경계를 보정하므로 **한국어 500글자 보장으로 읽으면 안 된다.** batch는 여러 줄을 한 event로 합친다. 이는 임계값 테스트를 추가하자는 뜻이 아니라, 코드만으로 이미 일반 본문 전달의 손실 가능성이 확인됐다는 뜻이다. [상수](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-tools/src/implementations/grok_build/monitor/types.rs#L1), [실제 절단 함수](https://github.com/xai-org/grok-build/blob/72a61251fcffb464bcc687aeb5a998e5a98ec0c9/crates/codegen/xai-grok-tools/src/implementations/grok_build/monitor/event.rs#L54)


monitor의 절단을 피하려고 본문 fetch MCP를 추가하는 것은 현재 공통 계약을 바꾸는 별도 제안이다. leader ACP로 본문을 직접 보낼 수 있다면 이 확장을 먼저 만들 이유가 없다.

## 최소 다음 확인

1. **shared session 한 건:** 실제 TUI가 만든 session에 side stdio client를 연결하고 고유 promptId 한 건을 전송한다. 동일 TUI 출력과 완료/오류 이벤트를 확인한다.
2. **interaction 한 건:** 같은 입력으로 승인 또는 질문이 필요한 작업을 요청한다. TUI만 응답하고 side client는 관측만 하는 흐름을 확인한다.
3. **binding·설정:** TUI에서 session을 한 번 바꿨을 때 새 active ID 선택과 기존 MCP·rules·terminal 설정 보존을 확인한다. 이 연결이 안 닫히면 구현 후보 상태를 유지한다.

전수 edge-case 실험이나 monitor 임계값 재실측은 현재 필요 없다. 최종 판정은 **기본 TUI 유지가 가능한 공유 backend 경로를 찾았으며, monitor가 필수라는 이전 결론은 철회; AIOX side-client 결합 전체는 아직 실측 전**이다.
