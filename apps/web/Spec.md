# Stage6 구현 에이전트 전달용 — 현재 서버 API 계약 및 연동 요구사항

Stage6 Web을 아래 **현재 구현된 서버 계약**에 연결하라. 기존 Stage6 작업을 보존하고, 공통 schema·타입을 재정의하지 말고 `@aiox/protocol`을 사용하라.

이 문서는 W3 당시 인계 내용을 W4~W10 및 후속 리뷰 수정까지 반영한 것이다. **아래에 나열한 HTTP API는 구현되어 있다.** Host 실행을 mock으로만 처리해야 하는 상태가 아니다.

서버 구현 완료와 실제 vendor·React 화면 통합 검증 완료는 구분한다. 실제 화면과 서버의 연결·실패·복귀 검증은 W11의 대상이다.

---

## 1. 기준과 작업 범위

서버 확인 기준:

- worktree: `/Users/lunaxislu/Documents/ai-orchestration`
- HEAD: `fa97647`
- W3: `72e6447`
- W4: `9220560`
- W5·W6: `01b619e`
- W7: `fd7a317`
- W8: `2a5446a`
- W9: `080aadd`
- W10 및 리뷰 보완: `bfcf729`
- 라우팅 조회·탭 제거 공통화: `fa97647`

현재 Stage6 worktree는 `/Users/lunaxislu/Documents/aiox-stage6`이다. 마지막 확인 시 HEAD는 `f67c0d9`였고, 다수의 작업 중 변경이 있었다. **착수 시 현재 상태를 다시 확인하고 기존 변경을 덮어쓰지 마라.**

공통 계약의 원본:

| 파일                                     | 책임                                                 |
| ---------------------------------------- | ---------------------------------------------------- |
| `packages/protocol/src/index.ts`         | 공개 export                                          |
| `packages/protocol/src/core.ts`          | 기존 Agent·Terminal·Network·Notification 등 공통 DTO |
| `packages/protocol/src/host.ts`          | Host·Panel·Operation·Config·SSE schema·타입          |
| `packages/protocol/src/configuration.ts` | 설정·layout 공통 검증                                |

서버 구현의 주요 확인 위치:

- `apps/daemon/src/state-api.ts`
- `apps/daemon/src/http.ts`
- `apps/daemon/src/host-run.ts`
- `apps/daemon/src/host-agents.ts`
- `apps/daemon/src/host-control.ts`
- `apps/daemon/src/panel-operations.ts`
- `apps/daemon/src/web-state.ts`
- `apps/daemon/src/web-events.ts`
- `apps/web/src/attach.ts`

현재 owner 문서는 다음과 같다.

- `docs/specs/aiox-host.md`
- `docs/specs/aiox-configuration-web.md`
- `docs/specs/aiox-web-ui.md`
- `docs/architecture/aiox-system.md`
- `docs/architecture/aiox-storage-terminal.md`

이 인계문과 현재 코드·owner 문서가 충돌하면 차이를 근거와 함께 보고하라. 서버 계약을 임의로 바꾸거나 Web에서 별도 계약을 만들지 마라.

---

## 2. 통신 및 상태 소유권

```text
최초 접속·재접속
  GET /api/web/events
    ← snapshot: 현재 전체 상태
    ← state: 변경된 전체 DTO 또는 제거 ID
    ← state: 이후 변경

사용자 조작
  HTTP 요청
    ← 즉시 완료 결과 또는 202 Operation
    ← SSE로 실제 상태 변경

터미널 입출력
  WS /ws/terminal/:terminalId
    ↔ 화면 복원·출력·입력·resize·ACK

설정 조회·저장
  GET /api/config
  PUT /api/config
    ← ConfigView
```

적용 원칙:

1. `snapshot`은 기존 서버 상태 전체를 교체한다.
2. `state`는 resource와 ID 기준으로 반영한다.
3. `upsert.value`는 부분 patch가 아니라 해당 자원의 전체 DTO다.
4. 일반적인 상태 변경마다 GET을 다시 호출하지 않는다.
5. HTTP 응답과 SSE의 도착 순서를 가정하지 않는다.
6. 늦게 도착한 HTTP 응답으로 더 최신의 SSE 상태를 덮어쓰지 않는다.
7. `/api/web/state`, `ready` 이벤트, 공개 epoch/sequence, 별도 snapshot 조회 헤더는 없다.
8. HTTP의 `x-request-id`는 요청 진단용이다. SSE 순서나 Operation 멱등성 키로 사용하지 않는다.
9. 터미널 바이트는 SSE가 아니라 기존 WebSocket을 사용한다.
10. **Config는 SSE resource에 포함되지 않는다.** Config는 별도 API의 응답으로 관리한다.

선택·dialog·입력 draft 등 UI 상태와 서버 DTO 상태를 구분하라. 서버가 소유하는 실행 상태를 Web에서 추정하여 확정하지 마라.

---

## 3. 구현 완료 HTTP API

아래 Host·Panel·Operation 경로의 매개변수는 **ID**다. 이름을 ID 대신 넣지 않는다.

### Host 실행·조회·제어

| Method / Path                  | 요청                 | 성공 응답               |
| ------------------------------ | -------------------- | ----------------------- |
| `GET /api/hosts`               | 선택 query `name`    | `200 HostView[]`        |
| `GET /api/hosts/:hostId`       | 없음                 | `200 HostView`          |
| `POST /api/hosts/resolve`      | `HostResolveRequest` | `200 HostResolveResult` |
| `POST /api/hosts/run`          | `HostRunRequest`     | `202 Operation`         |
| `POST /api/hosts/restart`      | `HostRestartRequest` | `202 Operation`         |
| `POST /api/hosts/:hostId/stop` | `HostControlRequest` | `202 Operation`         |
| `DELETE /api/hosts/:hostId`    | `HostControlRequest` | `202 Operation`         |

### Host Agent·Network

| Method / Path                                       | 요청                      | 성공 응답               |
| --------------------------------------------------- | ------------------------- | ----------------------- |
| `POST /api/hosts/agents/start`                      | `HostAgentStartRequest`   | `202 Operation`         |
| `POST /api/hosts/agents/restart`                    | `HostAgentRestartRequest` | `202 Operation`         |
| `POST /api/hosts/:hostId/agents/stop`               | `HostAgentStopRequest`    | `202 Operation`         |
| `GET /api/hosts/:hostId/networks`                   | 선택 query `name`         | `200 HostNetworkView[]` |
| `GET /api/hosts/:hostId/networks/:networkId`        | 없음                      | `200 HostNetworkView`   |
| `POST /api/hosts/:hostId/networks/:networkId/route` | `RouteRequest`            | `200 HostNetworkView`   |

### Panel·Operation

| Method / Path                                   | 요청                      | 성공 응답         |
| ----------------------------------------------- | ------------------------- | ----------------- |
| `GET /api/panels`                               | 없음                      | `200 PanelView[]` |
| `GET /api/panels/:panelId`                      | 없음                      | `200 PanelView`   |
| `POST /api/panels`                              | `CreatePanelRequest`      | `201 PanelView`   |
| `PUT /api/panels/:panelId/name`                 | `RenamePanelRequest`      | `200 PanelView`   |
| `PUT /api/panels/:panelId/layout`               | `PutPanelLayoutRequest`   | `200 PanelView`   |
| `POST /api/panels/:panelId/shells`              | `CreatePanelShellRequest` | `202 Operation`   |
| `DELETE /api/panels/:panelId/tabs/:tabId`       | `ClosePanelTabRequest`    | `202 Operation`   |
| `POST /api/panels/:panelId/tabs/:tabId/dismiss` | `DismissPanelTabRequest`  | `200 PanelView`   |
| `DELETE /api/panels/:panelId`                   | `DeletePanelRequest`      | `202 Operation`   |
| `GET /api/operations`                           | 선택 query `requestId`    | `200 Operation[]` |
| `GET /api/operations/:operationId`              | 없음                      | `200 Operation`   |

### Config·Web 상태·기존 조회

| Method / Path                      | 요청                     | 성공 응답                   |
| ---------------------------------- | ------------------------ | --------------------------- |
| `GET /api/config`                  | 없음                     | `200 ConfigView`            |
| `PUT /api/config`                  | `PutConfigRequest`       | `200 ConfigView`            |
| `GET /api/web/events`              | 없음                     | SSE                         |
| `GET /api/web/agents`              | 없음                     | `200 AgentView[]`           |
| `GET /api/terminals`               | 없음                     | `200 TerminalView[]`        |
| `GET /api/terminals/:terminalId`   | 없음                     | `200 TerminalView`          |
| `GET /api/web/notifications`       | 없음                     | `200 WebNotificationView[]` |
| `POST /api/web/notifications/read` | `{ ids?: string[] }`     | `200 { read: number }`      |
| `WS /ws/terminal/:terminalId`      | 기존 attachment protocol | terminal stream             |

Host 이름・Host Network 이름의 query는 정확한 이름 일치다.

`resolve`는 config·YAML을 읽어 등록된 Host를 찾으며, Host를 생성하거나 변경하지 않는다. YAML 기반 run/restart/Agent start/restart는 `source`로 대상을 해석한다.

이름으로 찾은 뒤에는 반환된 ID를 사용한다. 조회한 대상이 삭제되었다면 같은 이름의 새 대상을 자동으로 대신 조작하지 않는다.

---

## 4. 요청 schema

아래 TypeScript는 wire 구조 설명용이다. 실제 구현에서는 공개 타입과 대응하는 `…Schema`를 import하라.

```ts
type HostSource = {
    directory: string; // 절대 경로
    file?: string;
};

type Invocation = {
    terminalContext?: {
        terminalId: string;
        token: string;
    };
};

type LayoutInput = {
    preset?: "auto" | "grid" | "left-main" | "top-main";
    columns?: number;
    rows?: number;
};

type HostControlRequest = {
    requestId: string; // UUID
};

type HostRestartRequest = HostControlRequest &
    Invocation & {
        source: HostSource;
    };

type HostRunRequest = HostRestartRequest & {
    layout?: LayoutInput;
};

type HostAgentStartRequest = HostRestartRequest & {
    agents: string[];
};

type HostAgentRestartRequest = HostAgentStartRequest;

type HostAgentStopRequest = HostControlRequest & {
    agents: string[];
};

type HostResolveRequest = {
    source: HostSource;
};

type HostResolveResult = {
    hostId: string;
};
```

Host 입력 규칙:

- `agents`는 Agent key 배열이며 1개 이상이어야 한다.
- **중복 Agent key는 서버가 제거한다. 중복 자체를 오류로 거절하지 않는다.**
- `grid`에는 `columns`·`rows` 중 하나 이상이 필요하다.
- layout 치수는 양의 정수다.
- `terminalContext`는 유효한 terminal 실행 문맥이 있는 호출을 위한 것이다. 일반 Web 조작에서 token을 임의로 만들거나 추정하지 않는다.
- config·YAML·CLI 입력·실행 환경 검증 실패를 해당 stage와 함께 표시한다.

```ts
type CreatePanelRequest = {
    name: string;
    section?: "workspaces" | "networks" | "hosts";
};

type RenamePanelRequest = {
    revision: number;
    name: string;
};

type PutPanelLayoutRequest = {
    revision: number;
    layout: PanelLayout;
    activePaneId: string;
};

type CreatePanelShellRequest = {
    requestId: string; // UUID
    revision: number;
    paneId: string;
    split?: "right" | "down";
    cols?: number;
    rows?: number;
};

type ClosePanelTabRequest = {
    requestId: string; // UUID
    revision: number;
    expectedRuntimeId: string | null;
    confirm: boolean;
};

type DismissPanelTabRequest = {
    revision: number;
};

type DeletePanelRequest = {
    requestId: string; // UUID
    revision: number;
    confirm: true;
};

type PutConfigRequest = {
    revision: string;
    stored: StoredConfig;
};
```

Panel 적용 규칙:

- 생성 결과는 `kind: "workspace"`다. Hosts 섹션에 생성해도 Host 실행이 아니다.
- 이름 변경과 panel 삭제 API는 workspace panel을 대상으로 한다.
- 이름은 trim 후 1~128자이며 제어문자를 허용하지 않는다.
- panel `revision`은 양의 정수다. 오래된 revision은 거절된다.
- layout PUT은 기존 tab 집합을 보존한다. 프로세스 생성·삭제를 표현하지 않는다.
- 새 shell은 shells API로 생성한다.
- tab 닫기는 `expectedRuntimeId`로 확인 당시 실행과 현재 실행을 대조한다.
- 확인이 필요한 실행 종료는 사용자 확인을 거친다.
- `dismiss`는 **stopped/start-failed/crashed** 안내가 있고 기존 terminal이 살아 있을 때 허용된다.
- `dismiss`는 기존 shell을 다시 표시한다. 새 shell 생성이나 명령 자동 실행이 아니다.
- 마지막 tab을 제거해도 빈 pane이 유지된다. Web이 임의로 pane을 삭제하거나 split을 합치지 않는다.
- `cols`·`rows`는 terminal 크기이고, layout의 `columns`·`rows`와 다르다.

### Route 요청

```ts
type RouteRequest = {
    operation:
        | {
              kind: "between";
              action: "block" | "unblock" | "reset";
              agents: string[];
          }
        | {
              kind: "directed";
              action: "block" | "unblock" | "reset";
              from: string;
              to: string[];
          };
};
```

Host Network에서는:

- endpoint에 현재 Runtime ID가 아니라 **Agent key**를 사용한다.
- `between`은 서로 다른 Agent가 최소 2개 필요하다.
- `directed.to`는 최소 1개 필요하다.
- `block`은 runtime override `deny`를 적용한다.
- `unblock`은 runtime override `allow`를 적용한다.
- `reset`은 override를 제거하고 YAML의 manifest edge 또는 Network 기본 정책으로 돌아간다.
- 따라서 Host Network의 `unblock`과 `reset`을 같은 기능으로 처리하지 않는다.

---

## 5. 조회 DTO

### Host·관리 Agent·Network

```ts
type RuntimeStatus =
    "aiox-preparing" | "idle" | "working" | "awaiting-user" | "failed";

type LastExit = {
    kind: "stopped" | "exited" | "crashed" | "start-failed" | "daemon-ended";
    message: string | null;
    at: number;
};

type ManagedRuntime = {
    id: string;
    terminalId: string;
    phase: "preparing" | "running" | "stopping";
    status: RuntimeStatus;
    status_reason: string | null;
    observation_error: string | null;
    collaborationActive: boolean;
    collaborationError: string | null;
};

type ManagedAgentView = {
    key: string;
    adapter: "claude" | "codex";
    role: string | null;
    description: string | null;
    instruction: string;
    args: string[];
    member: boolean;
    runtime: ManagedRuntime | null;
    lastTerminalId: string | null;
    lastExit: LastExit | null;
};

type HostView = {
    id: string;
    name: string;
    directory: string;
    sourceFile: string;
    instruction: string;
    panelId: string;
    networkId: string;
    revision: number;
    agents: ManagedAgentView[];
    activeOperationId: string | null;
};

type HostNetworkView = {
    id: string;
    hostId: string;
    name: string;
    scope: "host";
    default: "allow" | "deny";
    members: {
        agentKey: string;
        runtimeId: string | null;
    }[];
    edges: {
        from: string;
        to: string;
        fromRuntimeId: string | null;
        toRuntimeId: string | null;
        policy: "allow" | "deny";
        source: "runtime-override" | "manifest-edge" | "manifest-default";
    }[];
};
```

解釈:

- `ManagedAgentView`は保存された管理項目であり、現在実行がなくても残る。
- `runtime: null`を「管理項目なし」と扱わない。
- `lastTerminalId`・`lastExit`だけから現在の実行生存を判断しない。
- `phase`・`status`・`collaborationActive`は別の状態である。
- Host Networkの`edges`は、異なるmember間の全方向ペアの適用政策を表す。
- Host Networkと一般Networkは、同名でも別資源である。

### Panel·Tab

```ts
type PanelLayout =
    | {
          type: "pane";
          id: string;
          tabIds: string[];
          selectedTabId: string | null;
      }
    | {
          type: "split";
          axis: "x" | "y";
          weights: number[];
          children: PanelLayout[];
      };

type TabNotice = {
    message: string;
    reason: string | null;
    restartCommand: string;
};

type TabView = {
    id: string;
    terminalId: string | null;
    label: string;
    agentKey: string | null;
    runtimeId: string | null;
    presentation:
        | "shell"
        | "preparing"
        | "tui"
        | "stopped"
        | "start-failed"
        | "crashed"
        | "unavailable";
    notice: TabNotice | null;
};

type PanelView = {
    id: string;
    kind: "host" | "workspace" | "network";
    section: "hosts" | "workspaces" | "networks";
    name: string;
    hostId: string | null;
    networkId: string | null;
    revision: number;
    layout: PanelLayout;
    activePaneId: string;
    tabs: TabView[];
};
```

layout 제약:

- split의 children은 2개 이상이다.
- weights는 child마다 대응하는 양수이며 합은 1이다.
- 각 tab은 정확히 한 pane에 한 번 배치된다.
- pane ID와 tab ID는 panel 내에서 중복되지 않는다.
- 선택 tab은 해당 pane에 속해야 한다.
- 비어 있지 않은 pane에는 선택 tab이 있어야 한다.
- 빈 pane의 `selectedTabId`는 `null`이다.
- `activePaneId`는 존재하는 pane을 가리킨다.
- `section`을 표시 분류로 사용한다. `kind`에서 section을 추정하지 않는다.

### 기존 공통 DTO

```ts
type AgentView = {
    agentId: string;
    executionOwnership: "daemon" | "external";
    name: string;
    role: string | null;
    description: string | null;
    status: RuntimeStatus;
    networkId: string | null;
    networkName: string | null;
    hostId: string | null;
    terminalId: string | null;
    status_reason: string | null;
    observation_error: string | null;
};

type TerminalView = {
    id: string;
    cwd: string;
    kind: "shell" | "agent";
    alive: boolean;
    vendor?: {
        runtimeId: string;
        alive: boolean;
        relayDisconnected: boolean;
        collaborationActive: boolean;
        collaborationError?: string;
    };
};

type NetworkView = {
    id: string;
    name: string;
    scope: "persistent" | "host";
    routes: {
        from: string;
        to: string;
        fromName: string;
        toName: string;
    }[];
};

type WebNotificationView = {
    id: string;
    originRuntimeId: string;
    body: string;
    createdAt: number;
    readAt: number | null;
    terminalId: string | null;
};
```

`executionOwnership: "external"`인 실행은 목록에 표시할 수 있지만 Web terminal·실행 제어 대상으로 취급하지 않는다.

---

## 6. Operation·멱등성·오류 처리

**`202`는 접수이며 성공 완료가 아니다.**

```ts
type OperationError = {
    code: string;
    message: string;
    stage:
        | "config"
        | "yaml"
        | "cli"
        | "environment"
        | "execution"
        | "cleanup"
        | "storage";
    field?: string;
    agentKey?: string;
};

type HostError = OperationError & {
    candidates?: string[];
    operationId?: string;
};

type OperationTarget = {
    agentKey: string | null;
    terminalId: string | null;
    state:
        | "pending"
        | "preparing"
        | "ready"
        | "stopping"
        | "stopped"
        | "unchanged"
        | "failed";
    error: OperationError | null;
};

type Operation = {
    id: string;
    requestId: string;
    kind:
        | "host.run"
        | "host.restart"
        | "host.stop"
        | "host.delete"
        | "host.agent.start"
        | "host.agent.restart"
        | "host.agent.stop"
        | "panel.shell.create"
        | "panel.tab.close"
        | "panel.delete";
    hostId: string | null;
    panelId: string | null;
    state: "running" | "succeeded" | "failed";
    targets: OperationTarget[];
    error: OperationError | null;
    cleanupErrors: OperationError[];
    createdAt: number;
    finishedAt: number | null;
};
```

처리 흐름:

```text
사용자 조작
  → requestId 생성 및 요청 내용 보관
  → HTTP 요청
      ├─ 접수 전 오류 → 오류 표시·입력 또는 상태 재확인
      ├─ 응답 유실 → 같은 requestId·같은 요청으로 재확인/재전송
      └─ 202 → Operation 추적
                 ├─ running → 대상별 진행 상태 표시
                 ├─ succeeded → 완료 표시
                 └─ failed → 실행 오류·정리 오류 표시
```

규칙:

- `running`이면 `finishedAt: null`이다.
- 완료 상태이면 `finishedAt`이 있다.
- 동일 `requestId`·동일 요청 재전송은 기존 Operation을 반환한다.
- 동일 `requestId`에 다른 요청을 보내면 충돌한다.
- HTTP 진단용 `x-request-id`와 body의 `requestId`를 구분한다.
- 실행 실패와 정리 실패는 `error`와 `cleanupErrors`로 구분한다.
- 접수 후 실패는 Operation과 SSE로 전달된다.
- 응답 유실 복구에는 기존 `requestId`를 유지한다.
- 실패한 작업을 새로 실행하는 사용자 재시도에는 새로운 `requestId`를 사용한다.
- revision 충돌 후 요청 내용을 바꿔 다시 제출한다면 새로운 작업으로 취급한다.
- 정상 상태 동기화는 SSE를 사용한다. Operation GET은 응답 유실·명시적 조회 등 필요한 복구 경로에서 사용한다.

주요 오류:

| 상황                                | 응답 예                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| schema/입력 오류                    | `400 invalid_request`                                                                      |
| 잘못된 JSON                         | `400 invalid_json`                                                                         |
| YAML 입력 오류                      | `400 invalid_yaml`, `stage: "yaml"`                                                        |
| 대상 없음                           | `404 unknown_host / unknown_panel / unknown_tab / unknown_network / unknown_operation / …` |
| 오래된 revision                     | `409 revision_conflict`                                                                    |
| tab 실행 변경                       | `409 runtime_conflict`                                                                     |
| 종료 확인 필요                      | `409 confirmation_required`                                                                |
| requestId 재사용 충돌               | `409 request_conflict`                                                                     |
| 작업 충돌                           | `409 panel_busy`                                                                           |
| dismiss 불가능                      | `409 tab_state_conflict`                                                                   |
| 설정 저장 충돌                      | `409 config_conflict`와 최신 `current`                                                     |
| 요청 body 제한 초과                 | `413 body_too_large`                                                                       |
| 설정 파일 읽기·파싱 실패            | `500 invalid_config`, `stage: "config"`                                                    |
| Host/Panel/Operation 저장 경로 실패 | `500 storage_error`                                                                        |
| daemon 종료 중 접수 거절            | `503 shutting_down`                                                                        |

이 표는 모든 오류 code를 열거한 것이 아니다. 알 수 없는 오류도 HTTP status·code·message를 보존하여 표시한다. 모든 endpoint의 오류가 동일한 `HostError` 구조라고 가정하지 않는다.

---

## 7. Config 계약

```ts
type ConfigView = {
    revision: string;
    stored: StoredConfig;
    effective: AioxConfig;
    runningPorts: {
        daemon: number;
        web: number;
    };
    restartRequired: boolean;
};
```

- `stored`: 파일에 저장된 설정이다. 생략된 항목은 생략된 채 유지된다.
- `effective`: 기본값 적용·검증을 마친 설정이다.
- `revision`: 파일 내용 기반 값이며 파일이 없으면 `"absent"`다.
- `runningPorts`: 현재 daemon이 실제 사용하는 포트다.
- `restartRequired`: 현재 실행 포트와 effective 포트의 차이를 나타낸다.

설정 대상:

```ts
type AioxConfig = {
    ports: {
        daemon: number;
        web: number;
    };
    messages: {
        retentionDays: number;
    };
    terminal?: {
        shell?: string;
        args?: string[];
        cwd?: string;
        fontFamily?: string;
        fontSize?: number;
        theme?: Record<string, string>;
    };
    keyboard?: Record<string, string>;
    keybindings?: Partial<
        Record<"mac" | "windows" | "linux", Record<string, string>>
    >;
    web?: {
        sidebar?: {
            width?: number;
            open?: boolean;
        };
    };
    appearance?: {
        theme: "system" | "light" | "dark";
    };
    host?: {
        layout?: HostLayout;
    };
};
```

`StoredConfig`는 공통 타입을 그대로 사용한다. effective 설정 전체를 stored에 복사하여 생략 정보를 없애지 않는다.

`PUT /api/config`는 `{ revision, stored }` 전체를 검증하고 저장한다.

충돌 시:

1. 응답의 최신 `current`를 받는다.
2. 사용자가 편집한 필드와 최신 설정을 대조한다.
3. 최신 revision을 기준으로 변경을 다시 적용한다.
4. 오래된 전체 설정으로 자동 덮어쓰지 않는다.

Config는 SSE snapshot/state의 일부가 아니다. 설정 화면은 Config API 응답을 별도로 반영한다.

사용할 공개 schema:

```ts
configViewSchema;
putConfigRequestSchema;
storedConfigSchema;
effectiveConfigSchema;
keybindingsSchema;
layoutInputSchema;
hostLayoutSchema;
```

---

## 8. SSE 계약과 적용 방법

```ts
type WebSnapshot = {
    hosts: HostView[];
    networks: (HostNetworkView | NetworkView)[];
    panels: PanelView[];
    terminals: TerminalView[];
    agents: AgentView[];
    operations: Operation[];
    notifications: WebNotificationView[];
};

type WebState = {
    changes: WebChange[];
};

type WebFault = {
    code: string;
    message: string;
};
```

`WebChange`는 resource별 DTO가 연결된 union이다.

```ts
// 추가 또는 전체 DTO 교체
{
    resource: "panel",
    action: "upsert",
    id: "panel-id",
    value: PanelView
}

// 제거
{
    resource: "panel",
    action: "remove",
    id: "panel-id"
}
```

resource:

```text
host / network / panel / terminal / agent / operation / notification
```

적용 규칙:

- Agent의 ID는 `AgentView.agentId`다.
- 나머지 resource의 ID는 `id`다.
- `upsert.value`는 전체 DTO다.
- snapshot에 없는 이전 자원은 새 snapshot 적용 시 제거한다.
- state의 change 목록을 순서대로 적용한다.
- notifications에는 미확인 Web 알림만 포함된다.
- 읽음 처리는 notification `remove`로 전달된다.
- `POST /api/web/notifications/read`의 `ids`를 생략하면 서버가 처리 시점의 대상 미확인 알림을 선택한다.
- `fault`는 정상 snapshot/state가 아니다. 연결 오류로 표시하고 정상 snapshot을 통한 복구를 기다린다.
- 재접속 시 새 snapshot으로 상태를 복원한다.
- 연결 단절을 모든 실행 자원의 종료로 해석하지 않는다.
- 서버는 느린 연결에서 전송 완료를 기다리고 최신 상태 차이를 반영한다. 모든 중간 상태 이벤트가 반드시 하나씩 전달된다고 가정하지 않는다.
- `write(false)`는 서버의 backpressure 처리이며 Web에서 별도 제어 메시지로 구현하지 않는다.

사용할 공개 schema:

```ts
webSnapshotSchema;
webChangeSchema;
webStateSchema;
webFaultSchema;
```

기본 연결 방식:

```ts
import {
    webSnapshotSchema,
    webStateSchema,
    webFaultSchema,
} from "@aiox/protocol";

const events = new EventSource("/api/web/events");

events.addEventListener("snapshot", (event) => {
    const snapshot = webSnapshotSchema.parse(JSON.parse(event.data));
    // 서버 상태 전체 교체
});

events.addEventListener("state", (event) => {
    const state = webStateSchema.parse(JSON.parse(event.data));
    // resource + id 기준 반영
});

events.addEventListener("fault", (event) => {
    const fault = webFaultSchema.parse(JSON.parse(event.data));
    // 연결 오류 표시
});
```

실제 구현에는 JSON/schema 검증 실패와 EventSource 연결 오류 처리를 포함하라. 검증 실패를 정상 빈 상태로 바꾸거나 조용히 무시하지 마라.

---

## 9. Terminal 연결

기존 `apps/web/src/attach.ts`와 terminal 복원 구현을 재사용하라.

```text
server → client
  binary: PTY 출력 바이트
  text: snapshot/state/output/resize/restored/exit/error 제어 메시지

client → server
  binary: 사용자 입력 바이트
  text: resize·자동 응답·parsed-byte ACK
```

규칙:

- 화면 복원 완료 전후의 출력 순서와 ACK 처리를 유지한다.
- 단순 문자열 누적 출력으로 기존 terminal 복원을 대체하지 않는다.
- terminal attachment 해제는 WebSocket 연결 해제다. PTY 종료가 아니다.
- tab 전환·컴포넌트 unmount·재접속 때문에 terminal이나 Agent를 재생성하지 않는다.
- 실제 종료는 대응하는 서버 제어 API를 사용한다.
- Agent attachment에는 기존 구현의 runtime 식별자 확인을 유지한다.
- SSE의 `presentation`·`runtime` 상태와 WS 화면 출력은 서로 다른 경로다.
- shell 생성 성공이나 socket 연결 성공만으로 Agent 준비 완료를 표시하지 않는다.
- `notice.message`, `reason`, `restartCommand`를 사용자 안내에 사용한다. 명령을 자동 실행하지 않는다.
- external 실행을 Web terminal에 연결하지 않는다.

---

## 10. 공통 protocol 반영

마지막 확인 시 Stage6의 `packages/protocol/src`에는 `index.ts`, `index.test.ts`만 있었고 최신 `core.ts`, `host.ts`, `configuration.ts`는 없었다. 착수 시 다시 확인하라.

최신 서버 기준으로 다음을 반영한다.

- `packages/protocol/src/index.ts`
- `packages/protocol/src/core.ts`
- `packages/protocol/src/host.ts`
- `packages/protocol/src/configuration.ts`
- 관련 protocol 테스트

공개 schema·타입은 다음처럼 사용한다.

```ts
import {
    hostViewSchema,
    panelViewSchema,
    operationSchema,
    webSnapshotSchema,
    webStateSchema,
    configViewSchema,
    type HostView,
    type PanelView,
    type Operation,
} from "@aiox/protocol";
```

주의:

- 다른 package의 내부 source 경로로 import하지 않는다.
- `@/`는 각 package 내부 source 별칭이다.
- protocol package의 공개 entry는 `dist`를 가리키므로 빌드·타입·실행에서 실제로 해석되는지 확인한다.
- 현재 protocol에는 `panelLayoutReferences`, `removePanelTabs`도 공개되어 있다. 해당 변환이 필요하면 기존 함수를 재사용한다.
- W3만의 오래된 schema를 가져와 이후 W5·W6 변경을 누락하지 않는다.
- 기존 Stage6 변경을 덮어쓰는 전체 디렉터리 교체나 무조건적인 reset을 하지 않는다.
- 서버의 구현 부족을 가정하고 별도 API·DTO·서버 상태를 추가하지 않는다.
