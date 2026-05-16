#### Question

claude는 특이하게 mcp client이자 mcp server인거야 ?

#### Answer

아닙니다. 프로토콜 레벨에서 Claude는 여전히 **MCP client 한 쪽 역할**입니다. "server이자 client"는 아닙니다.

PRD spike 구조를 정확히 따라가면:

```text
[aiox-channel-poc]      ←  MCP server (Node.js, 우리가 만든 것)
       ↕  stdio (MCP/JSON-RPC)
[Claude Code]           ←  MCP client
       +
       HTTP 18788 ─────  외부에서 들어오는 ingress
```

- **MCP server** = `aiox-channel-poc` (Node.js spike). `capabilities.experimental["claude/channel"]` 선언, `reply` tool 노출.
- **MCP client** = Claude Code. server에 stdio로 붙어서 tool을 호출하고 notification을 받음.

Claude가 특이해 보이는 이유는 일반 MCP 패턴과 비교했을 때의 두 가지 비대칭입니다:

1. **Server-initiated notification 수신** — 보통 MCP는 client(LLM) → server(tool) 방향이 주류인데, `notifications/claude/channel`은 server가 client(Claude)에게 push하는 방향이고, Claude가 이걸 받아서 transcript context로 주입합니다. 이게 "server처럼도 행동하는 것 같다"는 인상을 줄 수 있지만, 프로토콜상으로는 client가 notification을 수신하는 것뿐입니다 (JSON-RPC가 양방향 notification을 허용).
2. **외부 HTTP ingress가 server 쪽에 있다** — `POST /send`로 들어오는 HTTP 요청은 **MCP server가** 받아서 `notifications/claude/channel`로 변환해 Claude에게 forward합니다. 즉 외부 진입점(HTTP 18788)은 server에 있고, Claude는 그 server의 client일 뿐입니다.

요약하면:
- **Claude = MCP client (only).**
- **aiox-channel-poc = MCP server이자 외부 HTTP ingress의 host.**
- 두 가지 비대칭(server→client notification, server-side HTTP ingress) 때문에 "Claude가 server 같다"는 착각이 생기지만, 실제로는 server가 능동적으로 행동하는 것입니다.

이 구분은 `aiox` injection plane 설계에서 중요해집니다 — adapter가 "Claude를 server로 다룬다"가 아니라 "**채널 MCP server를 우리가 호스트하고, 그 server를 통해 Claude에게 inject한다**"가 정확한 멘탈 모델입니다.

---

#### Question

그러면 claude --dangerously-load-development-channels server:aiox-channel-poc 이걸 자연어로 나한테 설명해줘봐

#### Answer

한 문장으로:
> "Claude Code를 실행하되, `.mcp.json`에 등록된 `aiox-channel-poc`라는 MCP server를 **일반 tool server가 아니라 'channel server'로** 취급해라. 위험할 수 있다는 걸 알면서 그렇게 해라."

세 부분으로 쪼개면:

**`claude`**
- Claude Code CLI를 실행한다.

**`--dangerously-load-development-channels`**
- "experimental한 channel 기능을 켜라"는 토글.
- `dangerously-` prefix가 붙는 이유 = channel server는 일반 MCP server보다 **강한 권한**을 가지기 때문.
  - 일반 MCP server는 Claude가 **물어볼 때만** tool을 호출 (수동적, client-driven).
  - Channel server는 외부에서 들어온 메시지를 **Claude의 transcript에 직접 push**할 수 있음 (능동적, server-initiated). 즉 사용자가 입력하지도 않은 텍스트가 Claude의 입력으로 들어가서 행동을 유도할 수 있음.
  - 이게 곧 **prompt injection 통로**가 될 수 있어서 default off, 명시적으로 켜야 함. Anthropic 입장에서 "이건 develop용이고, production용 안전장치 없으니 알고 쓰라"는 의미.

**`server:aiox-channel-poc`**
- 어떤 MCP server를 채널 server로 쓸지 지정.
- `server:` prefix = "`.mcp.json`에 등록된 server 중에서 골라라"는 뜻.
- `aiox-channel-poc` = `.mcp.json`의 `mcpServers` 키 이름 (우리가 spike 때 등록한 이름).
- 이 server는 그냥 tool도 노출하지만, **추가로** `notifications/claude/channel`을 보낼 자격(= channel role)을 받는다.

비유로 풀면:

> 일반 MCP server는 **"심부름 가게"** — Claude가 필요할 때 전화 걸어 시킨다.
> Channel server는 **"방송국"** — 가게가 Claude의 머릿속 스피커로 직접 방송할 수 있다.
> `--dangerously-load-development-channels server:aiox-channel-poc` = "이 가게(`aiox-channel-poc`)한테 방송권 줘. 위험한 거 알아."

`aiox` 입장에서 이 flag가 중요한 이유는, **자동 relay UX가 결국 이 flag에 의존한다**는 점입니다. Claude를 사용자가 직접 `--dangerously-load-development-channels`로 띄워야만 외부에서 메시지를 inject할 수 있고, 그래서 `aiox claude` 명령이 내부적으로 이 flag를 감춰서 자동으로 붙여주는 게 launcher plane의 핵심 책임 중 하나가 됩니다.

---

#### Question

그러니까 해당 mcp서버를 channel로 열어두는거라는거임?

#### Answer

거의 맞는데, 한 줄 더 정확하게 하면:

> "그 MCP server에 **channel role을 추가로 부여**해서 띄운다."

즉 server가 두 가지 일을 동시에 함:

1. **일반 MCP server 역할** — 평소처럼 tool/resource 노출 (`reply` tool 등)
2. **Channel role (추가)** — Claude에게 `notifications/claude/channel`로 메시지를 push할 수 있는 권한

flag도 그래서 두 가지를 한 번에 함:
- `--dangerously-load-development-channels` = **channel 기능 자체**를 켠다 (전역 토글)
- `server:aiox-channel-poc` = **어느 server에 channel 권한을 줄지** 지정

그래서 `aiox-channel-poc`는 "channel 전용 server"가 아니라 **"평범한 MCP server + channel 권한 부여됨"** 상태입니다.

요약하면 사용자의 표현 "MCP server를 channel로 열어둔다" = **맞음**. 다만 멘탈 모델은 "channel로 변신" 보다는 "MCP server에 채널 권한 stamp 찍어서 켠다"가 정확합니다.

---

#### Question

channel이라는건 비유하자면 websocket과 같이 구독하는건가?

#### Answer

큰 그림에서는 비슷한 직관이 맞습니다 — **"server가 client에게 능동적으로 push할 수 있는 양방향 연결"** 이라는 점에서. 다만 세 가지 차이를 짚어두면 모델이 정확해집니다:

**비슷한 점**
- 연결이 살아 있는 동안 server → client 방향으로 메시지를 push할 수 있음
- client(Claude)는 polling이 아니라 push 받음
- 동시에 client → server tool 호출도 같은 connection에서 가능 (양방향)

**다른 점**
1. **Transport가 stdio**다. WebSocket 아님. spike에서는 `pnpm tsx server.ts`로 띄운 프로세스를 Claude가 stdio로 연결해서 JSON-RPC를 주고받음. 네트워크 socket이 아니라 **부모-자식 프로세스 파이프**.
2. **"구독 토픽"이 없다.** pub/sub는 보통 `subscribe("foo")`로 topic 단위 구독을 하지만, MCP channel은 `--dangerously-load-development-channels server:aiox-channel-poc`로 "이 server는 channel이다"를 선언하는 순간 **암묵적으로 구독 끝**. 별도 subscribe 동작 없음.
3. **Fan-out 없음.** pub/sub는 한 publisher가 N명 subscriber에게 broadcast하지만, MCP channel은 **Claude 인스턴스 1개 ↔ channel server 1개**의 1:1 관계. 같은 server를 여러 Claude가 공유하지 않음 (Claude마다 자기 자식 프로세스로 server를 띄움).

더 정확한 비유는:

> **"stdio로 연결된 mini-WebSocket 같은 거고, server는 그 연결을 통해 Claude에게 '여기 메시지요'라고 던질 수 있는 권한이 있다. 다만 topic도 broadcast도 없고, 한 Claude 전용의 1:1 hotline이다."**

`aiox` 입장에서 fan-out이 필요한 시나리오 (Codex가 보낸 한 메시지를 Claude 두 인스턴스에 동시 전달)는 **channel server가 직접 broadcast하는 게 아니라, aiox daemon 쪽 router가 N개의 channel server에 각각 한 번씩 push하는 구조**가 됩니다. 이게 routing plane이 별도로 존재하는 이유 중 하나입니다.

---

#### Question

그러면 claude 인스턴스마다 channel server가 따로 떠있어야한다라는 점인거고 그러면 컴퓨터 사용하는데 메모리, 용량 점유율이 크려나?

#### Answer

핵심 결론: **메모리/CPU 비용은 무시할 만한 수준**. 진짜 bottleneck은 Claude 본체이지 channel server가 아닙니다.

대략적 비용 (Node.js + MCP SDK + 작은 HTTP server)

| 항목 | 채널 server 1개당 | 비교 |
|---|---|---|
| RSS 메모리 | 40~80MB | Claude Code 본체: 200MB~1GB+ |
| CPU idle | ~0% (event loop wait) | — |
| CPU 메시지 처리 | 짧은 burst | 무시 가능 |
| 디스크 (코드) | 거의 0 (`node_modules` pnpm hardlink로 공유) | — |

N개 Claude 인스턴스 띄울 때 총 비용:

```
N × (Claude 본체 + channel server)
≈ N × (500MB ~ 1GB) + N × (40~80MB)
```

채널 server는 합계의 5~10% 정도. 즉 **사용자가 Claude를 4개 띄워도 채널 server 4개의 메모리는 300MB 안쪽**. 사실상 안 보이는 수준입니다.

다만 메모리보다 **실제로 신경 써야 하는 운영 이슈**가 따로 있습니다:

1. **HTTP ingress port 충돌** — spike는 `18788` 하드코딩이지만, N개 인스턴스가 같은 port를 쓰면 두 번째부터 bind 실패. aiox launcher가 **dynamic port 할당 + 어느 Claude가 어느 port인지 router에 등록**하는 책임을 져야 함. (routing plane의 일.)
2. **프로세스 lifecycle** — Claude가 죽으면 그 channel server도 같이 죽어야 함. 부모-자식 관계로 묶거나, daemon이 pidfile 추적하면서 정리해야 좀비 안 남음.
3. **로그 파일 N개** — 인스턴스마다 따로 쌓이므로 디렉터리/이름 규칙 필요. (예: `~/.aiox/logs/claude-<session>.log`)
4. **MCP server start-up latency** — Node.js 콜드 스타트가 200~500ms. Claude N개를 병렬로 띄울 때 누적되면 사용자 체감 가능. spike에서 `pnpm tsx`는 trans-pile 비용도 있어 더 느림. 프로덕션 빌드에선 `node dist/server.js`로 바뀌어 빨라짐.

요약: **자원 비용 걱정은 안 해도 됨. 대신 port 할당과 cleanup이 더 critical한 설계 포인트**입니다.

---

#### Question

그러면 codex쪽은 어떻게 되는거야?
그리고 claude code 본체라는게 cli로 claude 실행 시 하는 것이 claude code본체를 지칭하는건가?

#### Answer

## Q1. Codex 쪽 구조

핵심 차이: **Claude는 1:1, Codex는 1:N**.

```text
Codex 구조:

┌──────────────────────────────┐
│  codex app-server (1개, Rust) │  ← WebSocket server  ws://127.0.0.1:4500
└──────────┬───────────────────┘
           │ 여러 thread를 같은 프로세스 안에서 다중화
   ┌───────┼───────┬───────┐
   ↓       ↓       ↓       ↓
┌────┐  ┌────┐  ┌────┐
│UI A│  │UI B│  │UI C│   ← codex --remote (각자 별도 프로세스)
└────┘  └────┘  └────┘
   ↑
   aiox는 WS client로 한 번만 붙어서 `thread/loaded/list`로 thread 발견,
   `turn/start --thread-id=...`로 특정 thread에 메시지 inject
```

Claude/Codex 비교

| | Claude | Codex |
|---|---|---|
| Injection 게이트웨이 | 인스턴스마다 channel server (Node.js, **N개**) | app-server 하나 (Rust, **1개**) |
| Transport | stdio (parent-child) | WebSocket (network) |
| 다중화 | 인스턴스별 분리 (강한 격리) | 같은 프로세스의 thread로 다중화 (격리 약함) |
| 누가 띄움 | 각 Claude가 자식 프로세스로 자동 launch | 사용자/aiox가 명시적으로 1번 launch |
| Inject 방향 | server → Claude로 `notifications/claude/channel` push | aiox → app-server로 `turn/start` request |
| 메모리 N개 띄울 때 | N × (Claude 본체 + channel server) | N × Codex UI + **1 × app-server** |

리소스 측면 (대략):
- `codex app-server` 1개: Rust라서 가벼움, idle ~30-50MB
- `codex --remote` UI 1개: 100~300MB (TUI + LLM call buffer 등)
- N개 띄워도 **app-server는 1개로 고정** → Claude보다 비용 효율이 좋음 (이게 PRD에서 "shared app-server" 검증을 한 이유)

Trade-off:
- **Codex**: 메모리 절약 + 다중 thread를 라우팅으로 깔끔하게 풀 수 있음. 단점은 **app-server가 죽으면 모든 thread 영향**. thread 격리도 약함 (PRD의 open issue: thread id → human name 매핑 전략 필요).
- **Claude**: 인스턴스별로 channel server가 따로 있어 **격리는 강함**. 하나 죽어도 다른 인스턴스 영향 없음. 단점은 launch 비용/포트 관리가 인스턴스 수만큼 늘어남.

이 비대칭 때문에 aiox `adapters/` 디렉터리도 비대칭하게 생긴 거예요:
```
src/adapters/codex/
  app-server.ts     ← 단일 app-server 연결 관리
  websocket.ts      ← WS client
  injector.ts       ← turn/start 호출
src/adapters/claude/
  channel-server.ts ← Claude당 1개씩 띄우는 channel server
  injector.ts       ← notifications/claude/channel push
```

---

## Q2. "Claude Code 본체"란?

**네, CLI에서 `claude` 명령으로 실행되는 그 프로세스가 본체 맞습니다.**

구성요소 명확히 하면:

```text
$ claude --dangerously-load-development-channels server:aiox-channel-poc
│
├─ 본체 프로세스 = Claude Code         ← 이게 "본체"
│   ├─ TUI/REPL
│   ├─ Agent loop (사용자 입력 → LLM API 호출 → tool 실행 → 출력)
│   ├─ Transcript 관리
│   ├─ MCP client manager
│   └─ File watcher / git 상태 / 권한 시스템 등
│
└─ 자식 프로세스 = aiox-channel-poc     ← .mcp.json 보고 본체가 fork한 것
    ├─ MCP server (stdio로 본체와 통신)
    └─ HTTP ingress 18788 (외부에서 메시지 받음)
```

즉:
- `claude`가 띄운 메인 프로세스 = **본체** (메모리 200MB~1GB+ 차지하는 그것)
- MCP server들 = **본체의 자식 프로세스**들 (각 40~80MB)
- 본체와 자식은 **stdio JSON-RPC**로 대화

본체가 죽으면 자식도 같이 정리되고, 자식이 죽으면 본체는 그 MCP server만 잃습니다 (다른 MCP server는 영향 없음).
