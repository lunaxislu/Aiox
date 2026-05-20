# Aiox Agent Runtime: Container-Like Product Model

이 문서는 사용자의 Docker 비유를 바탕으로 aiox가 agent를 어떤 product 단위로
보면 좋은지 정리한 learning record다. 권위 결정은
`history/31-step-10-per-agent-app-server-runtime.history.md`에 둔다.

## 질문

Docker는 가상머신을 여러 개 띄우는 대신 Docker Engine 위에 컨테이너를 올려서
자원을 효율적으로 관리한다. aiox도 비슷하게 할 수 있을까?

## 답

가능하다. 다만 MVP에서 만들 것은 OS-level container가 아니라
**agent runtime handle**이다.

```text
aiox daemon = local engine

CodexAgentRuntime = container-like unit
  - Codex TUI process
  - per-agent Codex app-server process
  - OS-assigned app-server endpoint (:0)
  - current Codex thread id
  - health/lifecycle/log state
```

사용자는 `aiox codex --name alpha`처럼 named agent를 다루고, 내부 구현은
runtime이 소유한다. 지금은 per-agent app-server가 runtime 내부 구현이고,
나중에 proxy 구조로 바뀌어도 product model은
`agent runtime`으로 유지할 수 있다.

## Docker 비유의 한계

MVP가 제공하는 것은 다음이 아니다.

- 별도 OS
- Linux namespace/cgroup 기반 hard isolation
- container image
- filesystem snapshot
- network namespace

MVP가 제공할 수 있는 것은 다음이다.

- process lifecycle tracking
- app-server endpoint ownership
- health check
- cleanup
- agent name과 runtime resource mapping
- future isolation을 붙일 수 있는 경계

## 왜 이 모델이 중요한가

Step 10의 구현 선택지는 바뀔 수 있다.

| 내부 구현 | 사용자 product model |
|---|---|
| per-agent app-server with OS-assigned port | `CodexAgentRuntime alpha` |
| per-agent proxy port | `CodexAgentRuntime alpha` |
| one proxy listener + per-connection state | `CodexAgentRuntime alpha` |

따라서 PRD와 adapter 설계는 "app-server process" 자체보다
`CodexAgentRuntime`을 중심으로 작성하는 것이 좋다. Per-agent app-server는
현재 MVP의 구현 세부사항이고, runtime은 장기 product 경계다.
