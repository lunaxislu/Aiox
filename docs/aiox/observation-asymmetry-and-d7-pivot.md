# Architectural Pivot: Observation Asymmetry & D7 Violation

이 문서는 Step 10 Phase B 구현 중 발견된 **D7 원칙 위반(First Blocker)**과 이를 해결하기 위한 아키텍처 전환(Pivot)에 대해 설명한다.

> **UPDATE (2026-05-26)**: 이 문서의 "Post-MVP revival path"였던
> transparent proxy가 internal `/resume` wrong-thread delivery 때문에 MVP
> production 방향으로 승격됐다. 최신 권위는
> `history/41-codex-loaded-thread-binding-analysis.history.md`와
> `prd/mvp/aiox-mvp-spec.md`를 따른다.

## 1. 현상: 관측의 비대칭 (Observation Asymmetry)

Codex App Server 아키텍처에서 두 개의 독립적인 클라이언트(TUI와 Daemon)가 연결될 때, 다음과 같은 관측 불일치가 발생한다.

### 시나리오
1. **TUI 클라이언트**가 `thread/start` 요청을 보냄.
2. **App Server**는 요청한 TUI 클라이언트에게만 성공 응답(`thread_id` 포함)을 보냄.
3. **Daemon 클라이언트**는 이 응답을 볼 수 없으며, 대신 브로드캐스트된 `thread/started` 알림(Notification)만 수신함.

### 문제점 (D7 위반)
*   **D7 원칙:** 모든 상태 변경(Replacement)은 명확한 인과관계와 소유권(Attribution)을 가져야 한다.
*   **위반 실체:** Daemon이 수신하는 `thread/started` 알림은 "결과"일 뿐, 누가 어떤 의도로 요청했는지에 대한 "근거(Request-Response pair)"가 결여되어 있다. 따라서 알림만으로 세션을 교체하는 것은 D7 위반이며 시스템의 결정론적(Deterministic) 상태 관리를 저해한다.

## 2. 기존 가설: Passive Observation (수동적 관측)

기존에는 App Server를 독립적인 컨테이너로 취급하고, Daemon은 브로드캐스트 알림만으로 상태를 완벽하게 추적할 수 있다고 가정했다.

```text
[ TUI ] --(Req/Res)--> [ App Server ]
                          |
                          +--(Notification)--> [ Daemon ] (상태 추측)
```

이 모델은 "자율적인 개별 컴포넌트"를 지향했으나, **인과관계의 유실**로 인해 분산 시스템의 상태 일관성을 보장하지 못함이 확인되었다.

## 3. 대안 조사: Callback / Hook 기능의 부재

D7 위반을 해결하기 위한 가장 이상적인 방법은 App Server가 "TUI의 요청으로 작업이 성공했다"는 사실을 Daemon에게 명시적으로 콜백(Callback)해 주는 것입니다. 이를 확인하기 위해 `codex-cli 0.132.0`의 프로토콜 및 기능을 조사했습니다.

**조사 결과: 현재의 Codex App Server는 해당 기능을 지원하지 않음**

*   **API 한계:** JSON-RPC 응답(Response)은 오직 요청을 보낸 클라이언트(TUI)에게만 반환되며, 다른 연결(Daemon)로 응답을 포워딩(Response Forwarding)하거나 구독(Subscription)하는 API가 없습니다.
*   **알림의 한계:** 공식 문서상 `thread/started` 같은 메시지는 순수한 알림(Notification)이며, 요청 ID(`id`)가 누락되어 있어 특정 요청과의 매핑이 불가능합니다.
*   **설정 및 스키마:** `--help` 및 생성된 JSON 스키마를 분석한 결과, Webhook, Callback, 또는 응답 라우팅과 관련된 어떠한 설정(Config flag)도 존재하지 않았습니다.

결론적으로, App Server 자체적인 기능 확장을 통해 Daemon에게 권위 있는(Authoritative) 응답을 전달하는 것은 현재 불가능하므로, 아키텍처 수준의 구조 변경이 불가피합니다.

## 4. 해결 전략: Option D - Scope Reduction (aiox-originated ops 한정)

현재 Codex App Server가 요청 응답을 다른 클라이언트에게 전달하는 Hook이나 Subscription API를 제공하지 않으므로, Phase B Round 4 D7 replacement scope를 다음과 같이 축소한다.

### 핵심 설계
TUI는 그대로 둔다. Codex CLI는 aiox 통제 밖이며, slash-command를 hijack하거나 우회하지 않는다.

대신 daemon이 직접 요청을 보내고 같은 operation의 success response를 받을 수 있는 **aiox-originated authoritative operations**에 대해서만 binding replacement를 수행한다.

```text
[ Daemon ] --(programmatic thread/start, turn/start, ...)--> [ App Server ]
    |                                                            |
    +<---------------- same-client success response -------------+

(명시적 request/response 근거 확보 - D7 충족)
```

### 변경 사항
1.  **TUI-originated slash-command는 binding을 변경하지 않음:** `/clear`, `/new`, `/fork`는 사용자가 계속 실행할 수 있지만, daemon이 같은 client의 returned id를 볼 수 없으므로 MVP에서는 active binding을 갱신하지 않는다.
2.  **aiox-owned operation만 replacement 허용:** programmatic `thread/start`와 이후 `sendMessage` / `turn/start`처럼 daemon이 request와 response를 모두 소유하는 작업만 replacement 근거로 사용한다.
3.  **Daemon RPC 명칭 정합:** Phase A에 박힌 RPC는 `rollbackAgentAttach`, `detachAgent`, `notifyTuiExited`다. `rebindAgent`는 결정된 명칭이 아니므로 사용하지 않는다.
4.  **2026-05-26 follow-up:** TUI-originated replacement가 실제로 필요해졌고,
    `history/41`에서 per-agent transparent proxy를 production 방향으로
    재도입했다. future Codex authoritative callback/read API가 생기면 proxy를
    대체할 수 있다.

## 5. 기대 효과
*   **daemon-owned authoritative ops에 대해 D7 준수:** daemon이 같은 operation의 성공 응답을 직접 받은 경우에만 binding을 교체한다.
*   **상태 일관성 보장:** notification-only 추측으로 active binding을 바꾸지 않아 관측 비대칭으로 인한 불일치를 피한다.
*   **시스템 신뢰도 향상:** MVP는 direct topology를 유지하고, TUI-originated rebind는 별도 Open Product Issue로 분리한다.

---
*참조: `history/34-step-10-phase-b-codex-runtime.history.md`*
