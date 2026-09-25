# Web terminal 통신·배치·프로세스 수명 조사

2026-09-25 후속 판정: 이 문서는 외부 제품의 통신·수명 조사 근거로 보존한다. AIOX는 이후
앱 명령·상태·알림을 Effect RPC의 앱용 WS로 통합했고 터미널 WS와 CLI/MCP HTTP는 분리해 유지했다.
현재 계약은 [Application RPC](../../docs/specs/aiox-application-rpc.md), 실행 소유권은
[vendor bindings](../../docs/architecture/aiox-vendor-bindings.md)가 소유한다. 아래 외부 제품의
HTTP/WS 사례를 현재 AIOX endpoint 목록으로 사용하지 않는다.

2026-09-24. 사용자 요청으로 세 subagent가 공식 문서와 소스를 조사했다. 아래는 조사 자료이며 제품의 확정 계약이 아니다. 실제 앱 실행·성능 측정·경합 재현은 하지 않았다. 제품 코드·명세는 변경하지 않았다.

## 종합 판단

- VS Code browser remote terminal은 WS 기반 remote IPC를 사용한다. UI instance/group 배치와 실제 process 준비는 분리한다.
- Wave Terminal은 Electron 제품이다. UI block 생성·삭제는 HTTP service, 별도 RPC/변경 이벤트는 WS가 공존한다. layout 계산은 frontend에 상당 부분 남아 있다.
- JupyterLab은 terminal 생성·종료 REST와 입출력 WS를 분리한다. 같은 workspace를 여러 browser tab에서 동시에 열어 공유 편집하는 모델은 공식 안내와 다르다.
- ttyd/GoTTY는 연결별 PTY 스트리머다. pane/tab 배치 동기화 설계의 직접 선례가 아니다.
- 따라서 WS가 실시간 터미널의 유일한 정답이라는 결론은 나오지 않는다. 참고할 핵심은 UI 배치와 PTY 준비 수명 분리, 명시적인 준비/종료 조건, 대상별 변경 전달이다.
- AIOX의 여러 창 실시간 공유 배치, 미실행 명령 병합, 등록/실행 순서 계약은 이 사례를 그대로 복제해 해결됐다고 주장할 수 없다.

## 부모 agent 직접 대조

Wave clone의 ObjectService.CreateBlock/DeleteBlock 및 wos.ts의 /wave/service POST fetch를 확인했다. Jupyter 공식 문서의 HTTP lifecycle API, 탭 닫기와 process 종료의 분리, workspace 단일 browser-tab 사용 안내를 직접 확인했다. 아래 나머지 상세 경로는 subagent의 소스 조사 결과이며 전체 실행을 재현하지 않았다.

- [Jupyter REST API](https://jupyter-server.readthedocs.io/en/latest/developers/rest-api.html)
- [Jupyter terminal UI close](https://jupyterlab.readthedocs.io/en/stable/user/terminal.html)
- [Jupyter workspace multi-tab constraint](https://jupyterlab.readthedocs.io/en/stable/user/urls.html#managing-workspaces-url)

# VS Code remote/browser terminal 조사

- 대상: microsoft/vscode 공식 소스 commit `ab52f2c82c4677a5983435d7f706380eaac43c09` (GitHub main API에서 고정 후 raw 소스 확인). VS Code 한 사례로 범위를 제한. Theia/code-server는 조사하지 않았다.
- 방법: 공식 GitHub raw 파일의 직접 읽기, 공식 terminal advanced 문서. 실행/네트워크 캡처 및 race 재현 테스트는 하지 않았다.

## 확인한 사실: UI와 process 생성은 분리

`TerminalService._createTerminal`은 editor라면 local TerminalInstance를 만든 후 editor를 열고, panel이라면 local group을 만든다. 이 함수는 동기적으로 instance를 반환한다. [TerminalService._createTerminal](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/terminalService.ts#L1223)

TerminalInstance 생성자는 `_createXterm()` promise의 후속 작업에서 container-ready barrier를 기다리고 `_createProcess()`를 실행한다. 그 안에서 TerminalProcessManager.createProcess가 backend.createProcess를 await한다. 즉 모든 `createTerminal()`의 앞선 trust/profile await가 없다는 뜻은 아니지만, local terminal instance 배치가 remote process 생성 완료 뒤에만 가능한 구조는 아니다. [TerminalInstance constructor](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/terminalInstance.ts#L544), [_createProcess](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/terminalInstance.ts#L1611), [TerminalProcessManager.createProcess](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/terminalProcessManager.ts#L317)

`moveToTerminalView`는 client의 editor detach, target 변경, group.addInstance/moveInstance를 수행한다. 이 함수에는 process-create RPC 완료 await가 없다. 따라서 코드 수준에서 client 배치와 remote process 준비를 별개로 취급한다. 단 pending-create drag의 실제 UX를 브라우저에서 재현한 결과는 아니다. [moveToTerminalView](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/terminalService.ts#L817)

```
local instance/group/editor 생성 ──→ client 이동/배치
        └→ xterm/container 준비 → remote create RPC → persistent ID → start
```

## 확인한 사실: control과 PTY 데이터는 의미상 구분, 공유 IPC channel 사용

RemoteTerminalBackend는 remote agent connection의 terminal channel을 RemoteTerminalChannelClient로 감싼다. createProcess RPC 결과의 persistentTerminalId로 RemotePty를 만든다. [backend contribution](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/remoteTerminalBackend.ts#L38), [backend createProcess](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/remoteTerminalBackend.ts#L154)

RemoteTerminalChannelClient는 createProcess, shutdown, resize, input 등을 `_channel.call`로 보내며, PTY 출력은 `_channel.listen(OnProcessDataEvent)`로 받는다. 즉 create/close/resize와 키 입력은 각각 의미가 다른 명명된 요청이고, 출력은 이벤트다. 모두 terminal IPC channel 추상화 위에 있다. '명령'이라는 말로 shell 입력과 터미널 제어를 혼동하면 안 된다. [channel events](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/common/remote/remoteTerminalChannel.ts#L79), [channel requests](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/common/remote/remoteTerminalChannel.ts#L191)

server RemoteTerminalChannel.call은 CreateProcess를 `_createProcess`에, Input/Shutdown/Resize를 ptyHostService에 전달한다. [server dispatch](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/server/node/remoteTerminalChannel.ts#L114)

브라우저 기본 BrowserSocketFactory는 WebSocket을 생성하고 remote connection은 PersistentProtocol과 management connection을 제공한다. 이는 VS Code가 기존 remote-agent IPC 기반 위에서 terminal control/data를 운반하는 사례다. 다른 custom socket/remote-authority 구현까지 항상 동일 물리 WS라고 일반화하지 않는다. [BrowserSocketFactory](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/platform/remote/browser/browserSocketFactory.ts#L270), [remote management](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/platform/remote/common/remoteAgentConnection.ts#L343)

## 확인한 사실: 순서는 transport 외의 코드로 관리

ChannelServer.onRawMessage는 각 promise 요청을 onPromise로 전달하고, onPromise는 `channel.call(...)`의 각 promise에 `.then`을 붙여 request ID별 응답을 보낸다. 다음 메시지가 이전 promise의 완료를 기다리도록 하는 전역 queue는 이 dispatch에 없다. 따라서 WS 수신 순서가 같아도 서로 다른 async 작업의 완료 순서까지 직렬화된다고 결론 내릴 수 없다. [IPC dispatch](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/base/parts/ipc/common/ipc.ts#L394)

RemotePty.input/resize/shutdown은 `_startBarrier.wait()` 뒤 요청을 전송한다. start 성공 시 barrier를 연다. TerminalProcessManager.setDimensions 또한 ptyProcessReady를 기다린다. [RemotePty start/barriers](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/remotePty.ts#L27), [setDimensions](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/terminalProcessManager.ts#L610)

createProcess await 후 `_isDisposed`이면 `newProcess.shutdown(false)`하고 반환하는 명시적 분기가 있다. 다만 RemotePty.shutdown이 start barrier를 기다리는 점 때문에 이 코드 존재만으로 remote pending-create-close race의 실제 서버 정리가 성공한다고 단정하지 않는다. 해당 race는 미실행/미검증이다. [disposed during creation](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/terminalProcessManager.ts#L358)

## 확인한 사실: layout은 local 편집 + server 복구 snapshot

TerminalService._saveState는 500ms debounce로 local groups의 layout을 수집하여 backend.setTerminalLayoutInfo를 호출한다. TerminalGroup.getLayoutInfo는 persistentProcessId가 숫자이고 shouldPersist인 instance만 포함한다. 서버 PtyService.setTerminalLayoutInfo는 workspaceId별 Map에 snapshot을 저장하며 getTerminalLayoutInfo가 이를 복구한다. 따라서 'layout은 전적으로 서버 소유'도 '서버에는 layout이 없다'도 부정확하다. [_saveState](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/terminalService.ts#L723), [getLayoutInfo](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/terminalGroup.ts#L341), [server layout snapshot](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/platform/terminal/node/ptyService.ts#L571)

## 확인한 사실 및 미확인: reconnect/multiple windows

서버 persistent process는 출력 serialization을 유지하며 attach 시 disconnect timer를 취소한다. detach는 shouldPersist와 interaction/forcePersist 조건에 따라 grace timer를 예약하거나 shutdown한다. 즉 connection lifetime과 process lifetime이 같지 않으며 조건부 persistence이다. [PersistentTerminalProcess attach/detach](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/platform/terminal/node/ptyService.ts#L816)

공식 문서는 window reload 시 기존 process 재연결과 앱 restart 시 process revive를 구분하고, 창 사이 terminal drag 또는 Detach Session / Attach Session을 설명한다. [공식 Terminal Advanced](https://code.visualstudio.com/docs/terminal/advanced)

클라이언트의 onDidRequestDetach 처리도 원래 창의 instance를 editor/group에서 제거하고 detachProcessAndDispose한 후 persistentProcessId를 응답한다. 이는 창 간 process 인계의 근거이며, 동일 terminal을 여러 창에서 동시 편집하고 모든 창의 배치를 broadcast하는 협업 모델의 근거가 아니다. [detach handler](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/browser/terminalService.ts#L290), [detach RPC](https://github.com/microsoft/vscode/blob/ab52f2c82c4677a5983435d7f706380eaac43c09/src/vs/workbench/contrib/terminal/common/remote/remoteTerminalChannel.ts#L194)

**미확인:** 동일 workspace의 여러 독립 browser window가 layout을 동시에 갱신할 때 충돌 의미/실시간 동기화 계약, pending-create drag/close 실제 UX, 모든 restart/disconnection 조건의 end-to-end 동작. 이번 파일 범위로는 동시 창 shared authoritative layout 지원을 주장할 수 없다.

## 우리 설계에 대한 추론 (사실과 분리)

1. 이 사례는 control WS 사용의 존재 근거다. 그러나 이미 remote-agent multiplexed IPC가 있다는 맥락이라 우리 HTTP+SSE보다 WS가 반드시 단순하다는 근거는 아니다.
2. 생성 완료 전에 배치를 자연스럽게 바꾸려면 핵심은 local UI identity/placement와 server process identity/lifecycle의 분리다. transport 교체만으로 얻는 특성이 아니다.
3. create→resize/close의 의미상 순서에는 readiness, lifecycle 검증, 취소/정리 정책이 필요하다. WS의 ordered frame delivery를 async command completion 보장으로 대체하면 안 된다.
4. 다중 창이 하나의 authoritative layout을 공유해야 한다면 이는 VS Code의 창 간 process 인계보다 강한 요구다. layout version/event replay/conflict 의미를 별도로 정해야 하며, HTTP+SSE와 WS 양쪽 모두에 해당한다.


---

# 웹 터미널 / daemon layout 비교 조사

2026-09-24 공식 GitHub 현재 HEAD shallow clone으로 직접 정적 확인. 실행 테스트 없음. 핵심 대상으로 Wave Terminal과 JupyterLab terminals 선택. Tabby Web README는 웹 앱/설정 동기화 및 별도 TCP gateway를 설명하므로, daemon이 로컬 PTY와 pane layout을 함께 관리하는 질문에는 앞의 두 사례가 더 직접적이라고 판단(선정 의견). Wave는 Electron 데스크톱 앱이며 순수 브라우저 서비스 사례가 아니다. [Wave README](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/README.md), [Tabby Web](https://github.com/Eugeny/tabby-web).

## Wave: UI control HTTP와 routed RPC/WS가 공존

확인 사실:
- UI `createBlock` / split 함수: `await ObjectService.CreateBlock(...)` 다음 클라이언트 `layoutModel.treeReducer(insert/split)` 실행. create 요청 중에는 해당 함수에서 새 layout node를 넣지 않는다. 서버 성공 후 target node를 찾는 split 경로도 있어 create와 layout insertion 전체가 하나의 원자적 서버 작업은 아니다. [global.ts L361-445](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/store/global.ts#L361)
- `ObjectService.CreateBlock/DeleteBlock`은 `callBackendService`; 이 구현은 HTTP POST `/wave/service?service=...&method=...`. 응답 `updates`를 로컬 object cache에 적용한 후 `data`를 반환한다. [services.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/store/services.ts#L81), [wos.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/store/wos.ts#L101), [ObjectService](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/pkg/service/objectservice/objectservice.go#L79)
- 서버 `createBlockObj`는 DB transaction 안에서 Block insert + Tab.BlockIds append/update. 하지만 layout tree는 프런트가 reducer로 편집하고 `persistToBackend` 100ms debounce 뒤 `ObjectService.UpdateObject` HTTP로 저장한다. 이동(`LayoutTreeActionType.Move`)도 이 reducer. 즉 block membership 원자성과 전체 layout/UI 작업 원자성은 다르다. [block.go](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/pkg/wcore/block.go#L133), [layoutModel.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/layout/lib/layoutModel.ts#L576), [wos.setObjectValue](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/store/wos.ts#L302)
- 다른 caller용 `WshServer.CreateBlockCommand`는 `ContextWithUpdates` → CreateBlock → QueueLayoutActionForTab → SendUpdateEvents. DeleteBlockCommand도 delete 뒤 layout remove를 queue하고 업데이트 발행. `ContextWithUpdates`라는 이름을 DB transaction과 혼동하면 안 됨: 읽은 command 본문은 create와 queue 전체를 WithTx로 묶지 않는다. QueueLayoutAction은 LayoutState.PendingBackendActions에 actionid 포함 append 후 DBUpdate한다. [wshserver.go](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/pkg/wshrpc/wshserver/wshserver.go#L225), [DeleteBlockCommand](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/pkg/wshrpc/wshserver/wshserver.go#L474), [layout.go](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/pkg/wcore/layout.go#L82)
- Wsh frontend transport: `UpstreamWshRpcProxy.recvRpcMessage`는 `{wscommand:"rpc", message}`를 globalWS에 넣는다. RPC response reqid/resid와 timeout 관리가 별도로 있다. [wshrpcutil.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/store/wshrpcutil.ts#L13), [wshrpcutil-base.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/store/wshrpcutil-base.ts#L16)
- `SendUpdateEvents`는 각 object update를 `waveobj:update` + object scope로 publish. 프런트 WOS는 해당 event를 구독해 `updateWaveObject` 실행한다. HTTP create/delete가 모두 이 broadcast를 수행한다고 확인한 것은 아님; HTTP response updates 경로와 Wsh command의 명시적 publish 경로를 구분해야 한다. [wps.go](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/pkg/wps/wps.go#L241), [WOS subscription](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/store/wos.ts#L91)

```text
UI create: HTTP CreateBlock → DB block + tab membership → response updates
         → client layout insert/split → 100ms debounce → HTTP UpdateObject(layout)
Wsh create: RPC → DB block → durable PendingBackendActions append → update event
           → client consumes actions → layout persist
```

layout ownership / pending:
- backend가 LayoutState 및 pending actions를 저장하지만 실제 tree reducer와 drag/move 계산은 frontend. `processPendingBackendActions`는 배열 순서로 await 처리하고 메모리 `processedActionIds` Set으로 중복 skip 후 persist. 이는 server-issued layout intent queue가 있다는 증거이고, 사용자 create request exactly-once나 durable request ledger라는 증거는 아니다. [layoutModel.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/layout/lib/layoutModel.ts#L356)
- UI 등록 시 CleanupOrphanedBlocks 호출 → 서버가 cleanuporphaned action queue → client가 처리하는 보정 경로도 있다. [registerTileLayout](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/layout/lib/layoutModel.ts#L599), [BlockService](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/pkg/service/blockservice/blockservice.go#L77)
- 생성 요청 응답 유실 시 idempotency key / 자동 rollback / pending create 복구 계약은 확인하지 못했다. CLI와 프런트 동시 편집의 선형화, revision conflict, stale write 방지도 본 조사 범위에서 검증하지 않았다.

terminal I/O / cleanup:
- input/resize는 `ControllerInputCommand` RPC. 최초 fit에서 `ControllerResyncCommand(tabid, blockid, rtOpts)` 호출. 서버 ResyncController는 per-block mutex 아래 DB block 조회 후 controller 상태를 맞춘다. block 생성 성공과 PTY controller 실행 성공을 별도 흐름으로 다룬다. [termwrap.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/view/term/termwrap.ts#L555), [term-model.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/view/term/term-model.ts#L511), [ResyncController](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/pkg/blockcontroller/blockcontroller.go#L152)
- output은 getFileSubject 구독 + initial terminal data/file load. 화면 dispose는 xterm/disposables/file subject release이고 해당 함수는 controller 종료 명령을 하지 않는다. 명시적 block close event는 `DestroyBlockController` → `controller.Stop(true, Status_Done, true)`를 호출한다. [termwrap.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/view/term/termwrap.ts#L412), [dispose](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/view/term/termwrap.ts#L444), [blockcontroller.go](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/pkg/blockcontroller/blockcontroller.go#L140), [Destroy](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/pkg/blockcontroller/blockcontroller.go#L294)
- WS 재연결은 backoff, route reannounce, event resubscribe. 이것만으로 끊긴 동안 모든 object event를 replay하거나 layout 최신 snapshot을 자동 재검증한다고 입증할 수 없다. [ws.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/store/ws.ts#L110), [wshrpcutil.ts](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/store/wshrpcutil.ts#L25), [wpsReconnectHandler](https://github.com/wavetermdev/waveterm/blob/a4447c1563b2df285ab89e76c82f91e1a1a49c1e/frontend/app/store/wps.ts#L40)

## JupyterLab: HTTP terminal lifecycle + WS I/O + frontend workspace

확인 사실:
- 서비스 startNew는 POST `/api/terminals`; backend TerminalRootHandler.post는 terminal_manager.create 후 model 반환. DELETE는 terminal_manager.terminate(force=True) await. [restapi.ts](https://github.com/jupyterlab/jupyterlab/blob/b524d0acddd7c8320c476d05f7c5e0199c512916/packages/services/src/terminal/restapi.ts#L40), [api_handlers.py](https://github.com/jupyter-server/jupyter_server_terminals/blob/46563c0797a2d21526d0cc95c70dafc4e0e0440a/jupyter_server_terminals/api_handlers.py)
- UI command는 startNew/connectTo를 await하고 Terminal widget을 만든 뒤 `app.shell.add(main,'main')`. Terminal process creation과 UI pane insertion은 분리된다. [terminal extension](https://github.com/jupyterlab/jupyterlab/blob/b524d0acddd7c8320c476d05f7c5e0199c512916/packages/terminal-extension/src/index.ts#L477)
- terminal default connection은 terminal WS socket, setup 후 connected 상태. dispose는 socket/신호 해제이며 shutdown은 HTTP shutdown await 후 dispose. abnormal WS close에서 reconnect를 실행한다. [default.ts](https://github.com/jupyterlab/jupyterlab/blob/b524d0acddd7c8320c476d05f7c5e0199c512916/packages/services/src/terminal/default.ts#L76), [shutdown](https://github.com/jupyterlab/jupyterlab/blob/b524d0acddd7c8320c476d05f7c5e0199c512916/packages/services/src/terminal/default.ts#L233), [WS lifecycle](https://github.com/jupyterlab/jupyterlab/blob/b524d0acddd7c8320c476d05f7c5e0199c512916/packages/services/src/terminal/default.ts#L262)
- terminal 서버 WS handler는 Terminado TermSocket을 상속하고 터미널 존재를 검사한다. pane/tab layout 작업을 해당 terminal API가 처리하지 않는다. [handlers.py](https://github.com/jupyter-server/jupyter_server_terminals/blob/46563c0797a2d21526d0cc95c70dafc4e0e0440a/jupyter_server_terminals/handlers.py)
- 공식 docs는 terminal tab을 닫아도 process가 지속됨을 명시. workspace는 동시에 한 browser tab만 열도록 안내. 따라서 여러 브라우저가 동일 layout을 동시 공동 편집하는 요구의 직접 선례는 아니다. [Terminals](https://jupyterlab.readthedocs.io/en/stable/user/terminal.html), [Workspaces](https://jupyterlab.readthedocs.io/en/stable/user/urls.html#managing-workspaces-ui)
- pane reorder 및 workspace 저장의 전체 원자성/충돌 규약, lost create response idempotency는 이번 정적 확인에서 추적하지 않았음. Terminado 내부 process cleanup 세부도 미확인.

## 관찰에서 도출되는 의견 (사실과 분리)

1. 두 사례 모두 'WS를 쓰므로 create/move/delete가 원자적'이라는 근거가 아니다. Wave는 HTTP UI command + WS event/RPC가 공존하며 layout을 frontend가 소유하는 부분도 크다.
2. Wave에서 참고할 만한 이득은 object-scoped 변경 push, request/response RPC 상관관계, 별도 caller가 만든 layout intent 전달이다. 이 이득의 일부는 HTTP command + WS event로도 얻고 있다.
3. 현재 프로젝트의 control WS 전환 판단은 여러 caller 명령/이벤트 통합 필요, reconnect snapshot/revision 계약, pending request 복구 필요를 따로 확인해야 한다. 이 조사에는 성능 측정이 없으므로 latency/throughput 개선을 주장할 수 없다.


---

# ttyd / GoTTY implementation research

확인일: 2026-09-24. 공식 GitHub와 raw source를 웹으로 열고 공식 저장소를 `/tmp`에 shallow clone하여 확인했다. 실행 테스트는 하지 않았다. 아래는 소스에서 확인한 사실이며 마지막 적용 판단은 추론이다. 제품 코드·로그는 수정하지 않았다.

고정 revision: ttyd `2922cb89f518bae4d0fcf4d757a7419638fc71fc`, GoTTY(yudai 원본) `a080c85cbc59226c94c6941ad8c395232d72d517`. 원본 GoTTY와 파생 fork를 혼동하지 않는다.

## ttyd: 연결별 terminal streamer

- HTTP는 index HTML과 token 응답을 제공한다. 확인한 HTTP handler에는 pane/tab 생성·이동·삭제 API가 없다. [http.c](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/src/http.c#L116-L155)
- WS는 terminal INPUT/OUTPUT, RESIZE, PAUSE/RESUME, title/preferences를 전달한다. 여기서 resize는 PTY columns/rows 변경이지 layout panel 이동이 아니다. [client command enum](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/html/src/components/terminal/xterm/index.ts#L26-L37), [server dispatch](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/src/protocol.c#L309-L355)
- PTY는 HTTP 페이지 요청 때 생성되지 않는다. WS open 후 클라이언트가 AuthToken/columns/rows 초기 JSON을 전송하고, 서버가 초기 JSON을 처리하여 `spawn_process` → `pty_spawn`한다. process는 연결별 `pss->process`에 저장한다. [client open](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/html/src/components/terminal/xterm/index.ts#L248-L278), [spawn](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/src/protocol.c#L154-L172)
- `LWS_CALLBACK_CLOSED`에서 실행 중인 process를 pause하고 설정된 signal로 `pty_kill`한다. 별도 영속 pane delete command를 처리하는 구조가 아니다. 브라우저 beforeunload 문구도 창 닫기가 command를 종료한다고 명시한다. [cleanup](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/src/protocol.c#L366-L396), [beforeunload](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/html/src/components/terminal/xterm/index.ts#L144-L151)
- 클라이언트는 조건에 따라 reconnect하며 terminal을 reset한다. 이 서버 경로는 기존 PTY ID attach가 아닌 새 연결의 초기 JSON→새 spawn이다. 따라서 reconnect 지원을 기존 shell/session 복원 지원으로 해석하면 안 된다. 외부 tmux persistence는 별개다. [reconnect](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/html/src/components/terminal/xterm/index.ts#L258-L305)

## GoTTY: 연결별 command backend

- HTTP는 index, JS/CSS, auth_token.js, config.js; `/ws`가 terminal 연결이다. [routes](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/server/server.go#L183-L212)
- Upgrade 후 `processWSConn`이 첫 WS JSON을 읽고 인증/arguments를 처리한 다음 `factory.New`를 호출한다. localcommand factory는 `New`→`pty.Start(cmd)`로 명령을 시작한다. [handler](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/server/handlers.go#L90-L123), [factory](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/backend/localcommand/factory.go#L40-L47), [PTY start](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/backend/localcommand/local_command.go#L31-L68)
- Input/output, resize, ping/pong, preferences/title/reconnect設定을 WS로 교환한다. resize는 `slave.ResizeTerminal` 호출이며 local backend는 TIOCSWINSZ ioctl을 사용한다. [dispatch](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/webtty/webtty.go#L157-L213), [resize backend](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/backend/localcommand/local_command.go#L101-L123)
- `WebTTY.Run`은 master/slave read 오류나 context 종료로 반환한다. caller는 `defer slave.Close()`와 `defer conn.Close()`로 정리한다. local backend Close는 설정 signal을 보내고 종료를 기다리며, timeout 설정에 따라 SIGKILL한다. 명령 Wait 후 PTY 파일도 닫는다. [Run](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/webtty/webtty.go#L55-L108), [handler cleanup](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/server/handlers.go#L68-L83), [process close](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/backend/localcommand/local_command.go#L57-L91)
- Reconnect는 서버 옵션이 전달한 초 수 후 client connectionFactory.create, terminal.reset, setup을 다시 수행한다. 영속 session 식별자 재attach는 이 경로에 없다. [client](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/js/src/webtty.ts#L118-L145)
- 공식 README가 기본적으로 새 client마다 새 process이며 동일 terminal을 공유하려면 tmux 같은 multiplexer를 사용한다고 명시한다. Web UI layout의 공유가 아니다. [Sharing with Multiple Clients](https://github.com/yudai/gotty/blob/a080c85cbc59226c94c6941ad8c395232d72d517/README.md#sharing-with-multiple-clients)

## 이 질문에 대한 적용 판단 (추론)

두 프로젝트는 PTY data plane을 WS로 운반하는 근거다. 조사한 protocol과 HTTP routes에 영속 pane/tab CRUD, 이동, layout revision, multi-client layout broadcast가 없으므로, Web panel/tab 생성·이동·삭제 및 상태동기화를 HTTP+SSE에서 control WS로 옮겨야 한다는 직접 선례는 아니다. 특히 두 프로젝트의 연결 종료→명령 정리를 영속 terminal lifecycle에 그대로 적용하면 요구가 달라질 수 있다. 이 결론은 transport 우열 주장이 아니라 비교 대상 범위의 제한이다.
