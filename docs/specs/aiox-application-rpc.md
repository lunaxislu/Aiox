# AIOX Application RPC

## 경계 [Status: Current]

이 문서는 앱의 명령·상태 전달과 세션 재접속 계약을 소유한다. panel 배치와 닫기의 의미는
[[docs/specs/aiox-configuration-web]], Host 실행의 의미는 [[docs/specs/aiox-host]],
터미널 바이트 프로토콜은 [[docs/specs/aiox-configuration-web]]을 따른다.
기존 React UI에 RPC client/store/hooks와 낙관적 변경을 연결하는 작업은 아직 구현하지 않았다.

- 앱: `WS /api/rpc`, Effect RPC JSON serialization. daemon/Web listener가 같은 서비스를 제공한다.
- 터미널: `WS /ws/terminal/:terminalId`, 기존 bytes/resize/ack/restore 프로토콜.
- CLI: 기존 HTTP와 Host NDJSON 응답. MCP와 정적 파일도 HTTP에 남는다.
- 기존 조회·명령 HTTP endpoint는 CLI와 미전환 consumer를 위해 남는다. `GET /api/web/events` SSE는 제거했다.
  기존 Web 소스는 이 서버 변경에 맞춰 연결하지 않았으므로 제품 통합 완료 상태가 아니다.

공유 선언의 단일 owner는 [[packages/protocol/src/rpc.ts]]의 `ApplicationRpc`,
`applicationEventSchema`, `applicationDeltaSchema`, `applicationFaultSchema`다.
`@aiox/protocol` 공개 entry에서 RPC group과 `ApplicationEvent`, `ApplicationDelta`,
`ApplicationFault`, `WebCommandRequest`, `WebCommandResult`, `HostCommandEvent`를 import한다.
DTO는 [[packages/protocol/src/host.ts]]의 기존 Effect Schema를 재사용한다.
`.parse/.safeParse`는 같은 Effect decoder의 Web 호환 경계다.

## 세션과 순번 [Status: Current]

연결 후 `session.open()`으로 서버 발급 `clientSessionId`, `checkpoint: 0`, `epoch`를 받는다.
재접속은 저장한 ID로 `session.resume({clientSessionId})`를 호출한 뒤 `state.subscribe`로 현재
snapshot을 다시 받는다. WebSocket 연결 종료는 접수된 daemon 작업의 취소가 아니다.

`panel.command`는 `{clientSessionId,sequence,requestId,panelId,changes}`를 받는다.
sequence는 1부터 증가하는 안전한 정수이며 session 안의 적용 순서다. 클라이언트는 재전송할 때
같은 sequence/requestId/body를 보존한다. pane/split target DTO로 구조 변경을 지정한다. pane·탭 선택은 React 앱의 메모리에만 두며 `select` 명령이나 서버 선택 필드는 없다.

| 조건 | 서버 결과와 소비자 행동 |
| --- | --- |
| 동일한 실행 중·대기 요청 | 같은 Deferred 결과에 합류하며 한 번만 실행한다. |
| 같은 ID/순번에 다른 내용 | `request_conflict` 또는 `sequence_conflict`; 요청을 재해석하지 않는다. |
| 이미 확정된 sequence | `result_expired`와 checkpoint. 과거 성공·실패 payload는 보관·재현하지 않는다. snapshot으로 현재 상태를 확인한다. |
| 확정 requestId를 새 sequence로 사용 | `request_finalized`; 같은 작업을 다시 실행하지 않는다. |
| 앞 순번 누락 | 기본 10초 대기 후 `sequence_gap`. 해당 범위의 missing/unexecuted를 알리고 대기 작업을 실행하지 않는다. |
| checkpoint에서 1024를 넘는 순번 | `sequence_window`; 완료 결과 cache 크기와 무관한 입력 제한이다. |
| 유휴 1시간이 지난 세션·알 수 없는 ID·옛 daemon ID | `session_expired`; 전송으로 세션을 재생성하지 않는다. |

checkpoint는 연속 확정 범위다. 실행 성공뿐 아니라 실패·gap으로 미실행 확정된 범위도 포함하며
최대 수신 번호와 다르다. 종료 정리 중에는 새 접수를 막고 대기 요청을 미실행으로 확정한다.
정리 실패 후 같은 daemon이 다시 접수를 열어도 폐기한 요청이 되살아나지 않는다.

session은 실행/대기 중 만료하지 않는다. sweep 뒤 재전송과 daemon 재시작 뒤 재전송도 거절한다.
`session_expired` 후 새 session과 snapshot을 만들 수 있지만, 결과를 잃은 옛 요청을 새 ID로 자동 재실행하지 않는다.
사용자가 현재 상태를 확인하고 새 의도를 제출해야 한다. 완료 결과 payload cache와 durable 작업 재개는 없다.

## RPC 호출 [Status: Current]

| 메서드 | 입력 | 결과 |
| --- | --- | --- |
| `session.open` | 인자 없음 | session ID, checkpoint, epoch |
| `session.resume` | `{clientSessionId}` | 현재 checkpoint, epoch |
| `state.subscribe` | `{clientSessionId}` | `ApplicationEvent` stream |
| `panel.command` | 기존 `WebCommandRequest` | `{result,state,checkpoint}` |
| `notifications.read` | `{clientSessionId,ids}` | `{read,state}` |
| `config.read` | `{clientSessionId}` | `ConfigView` |
| `config.write` | `{clientSessionId,input:{revision,stored}}` | `ConfigView`; 충돌은 `config_conflict`, `details.current` |
| `host.resolve` | `{clientSessionId,input:{source}}` | `{hostId}` |
| `host.run`, `host.restart` | `{clientSessionId,input}` | 기존 `HostCommandEvent` stream |
| `host.stop`, `host.delete` | `{clientSessionId,hostId,input:{requestId}}` | 기존 `HostCommandEvent` stream |
| `host.agent.start`, `host.agent.restart` | `{clientSessionId,input}` | 기존 `HostCommandEvent` stream |
| `host.agent.stop` | `{clientSessionId,hostId,input}` | 기존 `HostCommandEvent` stream |
| `host.network.route` | `{clientSessionId,hostId,networkId,input}` | `HostNetworkView` |

각 `input`의 정확한 타입은 RPC group이 참조하는 기존 Schema를 따른다. Host 요청은 기존 requestId로
실행 중 재전송을 합류시키며 완료 후에는 `result_expired`다. Host 요청 ID와 panel sequence는 별개다.
Host HTTP와 RPC는 같은 admission·실행 코드를 사용한다. 최종 `result.targets[]`는 대상별 실제 결과이며,
한 대상의 실패를 다른 대상의 성공으로 덮거나 성공한 형제를 되돌리지 않는다.

실패는 `ApplicationFault = {code,message,checkpoint?,stage?,details?}`다.
YAML/config/실행/저장/정리 단계의 진단은 가능한 원래 코드와 stage를 보존한다.
RPC transport/schema 실패와 도메인 실패는 RPC client가 제공하는 실패 경로에서 처리한다.

## snapshot과 delta [Status: Current]

`state.subscribe`의 첫 값은 `{type:"snapshot",version,snapshot}`이다. snapshot에는 epoch와
hosts/networks/panels/terminals/agents/cleanups/notifications가 있다. 새 연결과 재접속 모두
서버 메모리의 현재 전체 상태로 client 상태를 교체한다. 이전 delta replay는 제공하지 않는다.

이후 `{type:"delta",epoch,version,changes}`가 같은 연결에서 상태 반영 순서대로 온다.
snapshot 캡처와 구독 등록은 같은 projection 임계 구간에 있어 그 사이 변경을 잃지 않는다.
producer는 변경한 자원을 지정하고 서버는 관련 DTO만 갱신한다. 정상 변경마다 전체 DB를 읽거나
전체 snapshot을 비교하지 않는다. 같은 반영 단위의 자원 변화는 같은 delta에 들어간다.

epoch는 daemon 실행의 정체성, version은 그 실행의 projection 반영 번호다. sequence는
특정 session 명령 순서이고 panel revision은 panel 저장 충돌/오래된 값 판별 값이다. 서로 대체하지 않는다.
이미 적용한 epoch/version delta는 다시 적용하지 않는다. epoch 변경·버전 누락·stream 실패 시에는
subscription을 다시 열어 snapshot으로 복구한다. session 만료 여부는 별도로 확인한다.

`panel.command`의 `state`는 해당 반영의 broadcast delta와 같은 값이다. 응답과 구독의 도착 순서를
가정하지 않는다. `state:null`은 추가 delta가 없거나 projection 실패로 구독 복구가 필요한 경우다.
commit 이후 projection이 실패해도 명령을 재실행하지 않는다. 서버가 구독을 오류로 종료하고 메모리를
재구축하므로 재접속 snapshot으로 저장된 결과를 확인한다.

클라이언트별 대기 이벤트는 256개로 제한한다. Effect RPC stream ACK와 결합해 소비가 멈춘 구독의
queue가 가득 차면 `slow_consumer`로 실패시킨다. 다른 구독을 막거나 변경을 조용히 버리지 않는다.
설정 파일 watcher·주기적 전체 snapshot 조회는 추가하지 않았다.

의미 값 예시이며 직접 WebSocket frame을 조립하는 형식은 아니다. Effect RPC client가 framing을 담당한다.

```json
{"clientSessionId":"11111111-1111-4111-8111-111111111111","sequence":1,"requestId":"22222222-2222-4222-8222-222222222222","panelId":"panel-1","changes":[{"type":"panel.rename","name":"Work"}]}
```

```json
{"type":"delta","epoch":"daemon-epoch","version":12,"changes":[{"resource":"notification","action":"remove","id":"notice-1"}]}
```

빈 panel 삭제의 성공, 확정 결과 만료, 빈 서버 snapshot과 별도 정리 실패의 의미 값 예시다.

```json
{"result":{"requestId":"33333333-3333-4333-8333-333333333333","sequence":2,"panel":null},"state":{"type":"delta","epoch":"daemon-epoch","version":13,"changes":[{"resource":"panel","action":"remove","id":"panel-1"}]},"checkpoint":2}
```

```json
{"code":"result_expired","message":"This sequence is finalized. Its result is no longer retained.","checkpoint":2}
```

```json
{"type":"snapshot","version":0,"snapshot":{"epoch":"daemon-epoch","hosts":[],"networks":[],"panels":[],"terminals":[],"agents":[],"cleanups":[],"notifications":[]}}
```

```json
{"type":"delta","epoch":"daemon-epoch","version":14,"changes":[{"resource":"cleanup","action":"upsert","id":"terminal-1","value":{"id":"terminal-1","terminalId":"terminal-1","panelId":"panel-1","tabId":"tab-1","reason":"panel-deleted","state":"failed","error":"Termination was not confirmed.","attempts":1,"updatedAt":1790280000000}}]}
```

알림 생성은 notification upsert, 읽음·보존 만료는 remove다. daemon 소유 알림만 공개하며 원본 저장 이력은
읽음 처리 때문에 삭제하지 않는다.
접수한 `notifications.read`는 연결이 끊겨도 DB 읽음 저장과 현재 상태 반영을 끝까지 수행한다.
다른 구독자는 remove delta를 받고, 재접속 snapshot에도 읽은 알림이 남지 않는다.
실제 SQLite 저장 대기 중 WebSocket을 닫는 회귀 검증은 [[apps/daemon/src/application-rpc.test.ts]]가 담당한다.

shell 생성 성공은 preparing tab/pane commit이다. 이후 준비 실패는
panel/terminal delta, 종료 미확인은 cleanup upsert와 실제 원인·재시도 상태로 전달한다.
cleanup 성공은 해당 remove로 확인한다. `tab.close`의 expectedRuntimeId/confirm 보호는 그대로 유지한다.
낙관적 변경은 requestId/sequence로 응답과 연결하고, 성공 시 반환된 panel revision 및 state version을
확인한다. 후속 준비·정리는 panelId/tabId/terminalId로 연결하며 원래 명령의 성공을 실행 준비 완료로
바꾸지 않는다. `result_expired`는 실행 실패를 뜻하지 않으므로 임의 rollback이나 재실행 대신 snapshot을 확인한다.

## 연결 구현의 검증 경계 [Status: Current]

서버 구현은 [[apps/daemon/src/application-rpc.ts]], [[apps/daemon/src/sequencer.ts]],
[[apps/daemon/src/app-state.ts]]를 따른다. 실제 client 사용 예제는
[[apps/daemon/src/application-rpc.test.ts]], 공유 연결 helper는 [[apps/daemon/src/testing.ts]]의
`openTestApplication`이다. 예제는 `RpcClient.layerProtocolSocket` + `RpcSerialization.layerJson`과
scope 안의 `RpcClient.make(ApplicationRpc)`를 사용한다.

브라우저의 최소 연결 형태는 아래와 같다. `onEvent`에서 위 snapshot/delta 규칙을 적용한다.

```ts
import { ApplicationRpc, type ApplicationEvent } from "@aiox/protocol";
import { Effect, Layer, Stream } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";
import * as Socket from "effect/unstable/socket/Socket";

const protocol = RpcClient.layerProtocolSocket({ retryTransientErrors: false }).pipe(
    Layer.provide(Socket.layerWebSocket("ws://127.0.0.1:4501/api/rpc").pipe(
        Layer.provide(Socket.layerWebSocketConstructorGlobal),
    )),
    Layer.provide(RpcSerialization.layerJson),
);
const subscribe = (onEvent: (event: ApplicationEvent) => void) => Effect.scoped(
    Effect.gen(function* () {
        const client = yield* RpcClient.make(ApplicationRpc);
        const session = yield* client["session.open"]();
        yield* Stream.runForEach(client["state.subscribe"]({
            clientSessionId: session.clientSessionId,
        }), (event) => Effect.sync(() => onEvent(event)));
    }),
).pipe(Effect.provide(protocol));
```

브라우저는 NodeSocket 대신 `effect/unstable/socket/Socket`의 `layerWebSocket`에
`layerWebSocketConstructorGlobal`을 제공한다. client와 subscription의 scope를 앱 연결 수명에 묶되
연결 종료를 daemon 명령 취소로 해석하지 않는다. Effect와 @effect 계열은 `4.0.0-rc.117`로 맞춘다.
Web에는 @tanstack/db `0.9.2`, @tanstack/react-db `0.4.1`만 추가했으며 기존 Web Vitest `4.1.6`은 유지한다.

React 낙관적 변경·상관관계 보관·재접속 UI·실제 브라우저/xterm 통합은 후속 Web 작업의 검증 범위다.
서버 RPC 통과를 이 제품 경로의 완료 근거로 사용하지 않는다.
