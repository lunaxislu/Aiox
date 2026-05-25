# Step 14: Codex Thread Mismatch Discovery & Analysis

이 문서는 Step 14 스모크 테스트 과정에서 발견된 **aiox 데몬과 Codex TUI 간의 대화방(Thread) 불일치 문제**를 기록합니다.

## 📌 현상 (The Problem)

- **상황**: `aiox claude`에서 `send-message`를 실행하여 메시지를 보냄.
- **aiox 상태**: 데몬은 성공적으로 메시지를 주입했다고 판단하며 `Delivery Completed` 상태가 됨.
- **TUI 상태**: 사용자가 보고 있는 Codex TUI 화면에는 클로드의 메시지가 나타나지 않음.
- **사용자 피드백**: "코덱스야, 너 방금 클로드 메시지 읽었어?"라고 물으면, 코덱스는 "아니, 아무 메시지도 안 왔어"라고 답변함.

---

## 🔍 원인 분석: "이럴 줄 알았는데, 사실은 이랬다"

### 1. 우리가 했던 가정 (Initial Assumption)
- **가정**: "에이전트 하나당 엔진(App-Server) 하나가 뜨니까, 데몬이 그 엔진에 메시지를 던지면 당연히 유저가 보고 있는 화면에 나타날 것이다."
- **생각한 구조**: `에이전트 ID = 고정된 집 주소`. 주소만 알면 배달은 100% 성공한다.

### 2. 실제 발견된 사실 (Actual Observation)
- **사실**: Codex 엔진 내부에는 **여러 개의 방(Thread)**이 동시에 존재할 수 있으며, 데몬과 TUI는 서로 다른 방에 접속되어 있다.
- **불일치 지점**:
    - **데몬**은 에이전트 등록(Attach) 시점에 생성된 **방 A(ID-101)**를 주소로 알고 있음.
    - **TUI**는 실행되는 순간, 데몬의 방을 무시하고 자동으로 **방 B(ID-202)**를 새로 파서 사용자에게 보여줌.
- **결과**: 데몬은 유저가 안 보는 뒷방(방 A)에 계속 편지를 넣고 있었고, 유저는 빈 방(방 B)에서 기다리고 있었던 것.

---

## 💡 감각적 이해: "카카오톡 채팅방" 비유

이 상황은 마치 유저가 카카오톡 앱을 사용하는 상황과 비슷합니다.

1.  **데몬(Daemon)**: 유저가 카카오톡을 켜기 전에, 이미 **[채팅방 A]**를 하나 만들어두고 거기서 클로드의 메시지를 기다리고 있습니다.
2.  **유저(TUI)**: 유저가 카카오톡 앱(TUI)을 실행합니다. 그런데 이 앱이 똑똑하지 못해서, 데몬이 기다리는 [채팅방 A]를 여는 게 아니라 **항상 새로운 [채팅방 B]를 만들어서** 유저에게 보여줍니다.
3.  **엇갈림**:
    - 유저의 눈에는 **"카카오톡 창"**이 하나뿐이라 그게 전부인 줄 알지만, 사실 앱 내부에는 **[채팅방 A]**와 **[채팅방 B]**가 따로 놀고 있습니다.
    - 클로드가 답장을 보내면 데몬은 **[채팅방 A]**에 내용을 적습니다.
    - 유저는 **[채팅방 B]**를 보고 있으니 "아무것도 안 오는데?"라고 느끼게 됩니다.

---

## 📉 텍스트 플로우 (The Mismatch Flow)

```text
[ 1. 에이전트 준비 (Attach) ]
데몬 (Daemon)  ----( thread/start )---->  Codex 엔진
     |                                      |
     |<---- [ 방 ID: 101 ] 발급 --------------|
     |
데몬 상태: "나중에 메시지가 오면 101번 방에 넣어야지."


[ 2. TUI 기동 (aiox codex 실행) ]
사용자 (TUI)  ----( codex --remote )---->  Codex 엔진
                                            |
     (★ TUI는 접속과 동시에 자기 마음대로 새 방을 열어버림)
                                            |
사용자 (TUI)  <---- [ 방 ID: 202 ] 발급 -------|
     |
사용자 화면: [ 202번 방 ]이 눈앞에 떠 있음.


[ 3. 클로드 메시지 주입 (Injection) ]
Claude (답장)  ---->  데몬 (Daemon)
                       |
        "기억해둔 101번 방에 주입하자!" (데몬의 착각)
                       |
데몬 (Daemon)  ----( turn/start into 101 )---->  Codex 엔진
                                                  |
                                         [ 101번 방 ]에 배달 완료! (Completed)


[ 4. 최종 엇갈림 ]
사용자 눈 (TUI) : "내 화면(202번 방)엔 아무것도 안 보여!"
Codex (TUI)     : "내 방(202번 방)엔 편지 안 왔어. 안 읽었어."
```

---

## 👁️ 에이전트(Codex)의 시점: "나는 아무 말도 못 들었다"

이 문제에서 가장 치명적인 점은 **Codex 에이전트(AI 모델) 자체가 이 상황을 전혀 인지하지 못한다**는 것입니다.

1.  **시각적 고립**: Codex 모델은 현재 유저와 함께 **[채팅방 B]**에 들어가 있습니다. 모델의 '의식'은 오직 자신이 속한 방의 대화 기록(Rollout)에만 존재합니다.
2.  **청각적 차단**: 데몬이 **[채팅방 A]**에 아무리 많은 클로드의 메시지를 주입해도, **[채팅방 B]**에 있는 Codex 모델에게는 아무런 알림이나 신호가 가지 않습니다.
3.  **결과**:
    - 사용자가 "클로드 메시지 읽었어?"라고 물으면, Codex는 거짓말을 하는 게 아니라 **진심으로 "아무것도 안 왔다"고 답하게 됩니다.**
    - 에이전트 입장에서는 클로드가 침묵하고 있는 것처럼 보이고, 클로드 입장에서는 코덱스가 씹고 있는 것처럼 보이는 **'상호 불통'** 상태가 완성됩니다.

> **결론**: 우리는 단순히 '데이터 배달'만 성공시키는 게 아니라, **"Codex의 의식이 머물고 있는 바로 그 방"**을 찾아가서 말을 걸어야 합니다. 에이전트가 알아채지 못하는 배달은 배달이 아닙니다.

---

## 🛠 해결 방안 (Proposed Fix)

"옛날 기억(기록된 ID)"을 믿지 말고, **배달 직전에 유저가 보고 있는 "진짜 주소"를 확인**해야 합니다.

1.  **실시간 주소 확인**: 메시지 주입(`TurnStart`) 직전에 Codex 엔진에게 `thread/loaded/list`를 호출하여, **"지금 유저 화면에 로드되어 있는(Loaded) 진짜 방 ID가 뭐야?"**라고 물어봄.
2.  **동적 주소 변경**: 만약 확인된 ID가 데몬이 알던 것과 다르다면, 즉시 **현재 유저가 보고 있는 ID로 타겟을 변경**하여 메시지를 던짐.
3.  **상태 동기화(Rebind)**: 주입 성공 후, 데몬의 DB에도 해당 ID를 업데이트하여 정보를 일치시킴.

이 로직이 적용되면 유저가 방을 조작하거나 TUI가 멋대로 새 방을 열어도, `aiox`는 항상 유저의 눈앞에 메시지를 정확히 배달할 수 있게 됩니다.

---

## Authority / Status

이 문서는 사용자가 나중에 다시 볼 수 있는 learning record다. 권위 결정은
`history/40-step-14-daemon-client-split.history.md`와
`prd/mvp/aiox-mvp-spec.md`의 Message Flow 정책에 둔다.

2026-05-25 결정:

- `agent name + app-server endpoint`가 Codex agent identity boundary다.
- `activeThreadId`는 고정 주소가 아니라 delivery 직전에 확인해야 하는 live binding state다.
- Codex target push는 `thread/loaded/list`로 현재 loaded thread를 확인한 뒤 `turn/start`를 보내는 방향으로 구현한다.
- 현재 loaded thread가 없으면 메시지는 `queued`로 남긴다. 나중에 TUI가 붙거나 Codex MCP pull/read/ack 도구가 들어오면 queued message를 다시 surface한다.

## Queued Fallback Mental Model

```text
Claude -> daemon reply
  -> target Codex runtime alive?
  -> thread/loaded/list has a live thread?
       yes: turn/start into live thread, then completed
       no : keep delivery queued, do not lie with completed

Codex MCP later
  -> list/read queued deliveries
  -> Codex can pull pending messages
  -> ack/completion updates delivery state
```

이렇게 하면 사용자가 `/new`, `/clear`, resume, TUI restart 같은 행동을 해도 agent 연결 자체는 유지되고, delivery는 현재 live thread로 best-effort push되거나 읽을 수 있을 때까지 durable queue에 남는다.
