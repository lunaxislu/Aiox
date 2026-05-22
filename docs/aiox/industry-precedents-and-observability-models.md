# Industry Precedents & Observability Models

이 문서는 `aiox`의 에이전트 오케스트레이션 모델을 설계함에 있어 참고한 유사 프로젝트들의 동향과, 이를 통해 도출된 핵심 아키텍처 원칙을 정리한다.

## 1. 유사 프로젝트 조사 및 비교 (Industry Benchmarking)

`aiox`와 같이 다중 에이전트 간의 메시지 라이프사이클을 관리하고 Human-in-the-loop(HITL)을 지원하는 대표적인 오픈소스 프로젝트들과의 비교 분석 결과다.

| 프로젝트 | 유사성 및 강점 | `aiox`와의 결정적 차이 | 적용 가능한 설계 |
| :--- | :--- | :--- | :--- |
| **OpenHands** | Action/Observation 분리 모델. 에이전트 상태를 이벤트 스트림으로 관리. | 에이전트의 내부 코드/API를 직접 소유하여 상태를 100% 통제함. | **Event Sourcing:** 모든 상태 변경을 이벤트로 기록하는 구조. |
| **Agent Protocol** | Task(할당)와 Step(실행)의 표준화. 에이전트 간 통신 규격 제안. | 주로 REST API 기반이며, 비동기 장기 실행 작업의 세밀한 관찰력은 낮음. | **Status Mapping:** `running`, `paused` 등 표준 상태 코드 차용. |
| **LangGraph** | 그래프 기반의 결정론적 상태 관리. 복잡한 HITL(승인) 흐름 제어. | 개별 바이너리 통제가 아닌 언어(Python/JS) 런타임 내의 함수 제어. | **Interrupt Pattern:** 승인이 필요할 때 시스템을 안전하게 멈추는 설계. |
| **Cline (MCP)** | MCP 기반 통신 및 도구 실행 전 사용자 승인 로직. | 데몬 오케스트레이터가 아닌 단일 사용자용 VS Code 확장 프로그램. | **MCP Handling:** MCP 에러 응답을 기계가 읽을 수 있는 상태로 변환. |

## 2. 핵심 아키텍처 전환: Opaque Worker 모델

조사 결과, `aiox`처럼 **"독립적인 폐쇄형 TUI/CLI 바이너리(Claude Code 등)"**를 워커로 사용하는 경우, 워커의 내부 상태(사고 중, 한도 도달 등)를 100% 실시간으로 관찰하는 것은 불가능하거나 극히 비효율적임이 확인되었다. 이에 따라 다음과 같은 설계 원칙을 수립한다.

### "배달 확인(Delivery)"과 "처리 완료(Completion)"의 분리
*   **Delivery Ack (Push Succeeded):** 메시지가 채널 서버(로비)에 무사히 도착했음을 의미.
*   **Semantic Completion (Reply Received):** 에이전트가 사고와 추론을 마치고 답장을 보냈음을 의미.
*   **중간 상태 (Unknown Pending):** 배달은 성공했으나 답장이 오기 전까지의 모든 시간. 이 구간 동안 에이전트는 '사고 중', '승인 대기', '한도 초과' 등의 상태일 수 있으나 데몬은 이를 **구조적으로 알 수 없음(Opaque)**을 인정한다.

## 3. 디자인 레슨 (Design Lessons for aiox)

1.  **거시적 상태 관리 (Coarse-grained State):** 
    미세한 상태(`thinking`, `tool_calling`)를 억지로 추측(Scraping)하려 하지 않는다. 대신 `awaiting_agent_reply`라는 통합된 대기 상태를 사용하고, 상세 상태는 어댑터가 명시적인 구조화 신호(Hook 등)를 보낼 때만 업데이트한다.
2.  **인간 중심의 상태 해독 (User-mediated Interpretation):** 
    시스템(Daemon)이 알 수 없는 상세한 오류나 한도 초과 상태는 **TUI 화면을 직접 보고 있는 사용자**가 판단하도록 역할을 분배한다. 데몬은 "답변 지연"까지만 표시하고, 실제 원인 파악은 사용자의 시각적 인지에 맡긴다.
3.  **타임아웃 전략의 이원화:**
    *   **Liveness Timeout:** 채널 서버의 생존 여부 확인 (짧음).
    *   **Semantic Timeout:** 에이전트의 답변 대기 시간 (길거나 무제한). 이 시간은 실패가 아닌 정상적인 '작업 중' 상태로 간주한다.

## 4. 결론 및 향후 방향

`aiox`는 에이전트의 내부를 완벽하게 통제하려는 "완전 통제 모델"에서 벗어나, 업계 표준인 **"상태 기반 비동기 오케스트레이션 모델"**을 지향한다. 이는 시스템의 복잡도를 낮추고, 다양한 외부 에이전트를 유연하게 수용할 수 있는 강력한 토대가 된다.

---
*참조: `history/35` (Claude Session Limit & Observability Investigation)*
