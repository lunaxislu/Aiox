# Peer to Peer Agents - Retrospective Index

이 문서는 초기 조사 과정에서 만들어진 제안 묶음을 현재 저장소 상태에 맞게 정리한 인덱스다.

> 2026-04-29 기준 안내: 2026-04-09~14에 검토한 초기 trigger/stream relay 방식의
> Codex app-server WebSocket 구조는 legacy다. 다만 2026-04-15 이후 Claude → Codex
> reverse prompt injection은 shared Codex app-server WS
> (`thread/loaded/list` -> `turn/start`)를 활성 경로로 사용한다.
> 2026-04-29 현재 구현 기준은 `docs/bridge.spec.md`, `docs/bridge-test.md`, `bridge/index.js`다.

이전에는 Codex app-server WebSocket relay 구조와 Claude Code channel 구조를 함께 묶어 생각했지만, 현재는 그 접근을 정리했고 아래 active docs 기준으로 유지한다.

## 현재 active 문서

- [docs/README.md](/Users/lunaxislu/Documents/ai-orchestration/docs/README.md)
  - active / legacy 문서 진입점
- [history/1-bridge.history.md](/Users/lunaxislu/Documents/ai-orchestration/history/1-bridge.history.md)
  - bridge가 왜 Codex app-server relay에서 MCP tool 구조로 바뀌었는지에 대한 전체 히스토리
- [docs/bridge.spec.md](/Users/lunaxislu/Documents/ai-orchestration/docs/bridge.spec.md)
  - bridge MCP server 구현 명세
- [docs/bridge-test.md](/Users/lunaxislu/Documents/ai-orchestration/docs/bridge-test.md)
  - ask/reply 왕복 테스트 절차
- [docs/claude-adapter.spec.md](/Users/lunaxislu/Documents/ai-orchestration/docs/claude-adapter.spec.md)
  - Claude Code custom channel server 명세
- [docs/legacy/app-server-legacy.md](/Users/lunaxislu/Documents/ai-orchestration/docs/legacy/app-server-legacy.md)
  - Codex app-server 조사 결과의 legacy 보관본

## 정리된 결론

- 초기 trigger/stream relay 방식의 Codex app-server WebSocket relay는 active path가 아니다.
- Claude → Codex reverse prompt injection용 shared app-server WS는 active path다.
- bridge는 이제 Codex용 stdio MCP server다.
- Claude 쪽은 `claude-adapter` 채널 서버가 담당한다.
- threadId 동기화는 더 이상 현재 구현의 핵심 제약이 아니다.

## 왜 이 파일이 남아 있나

초기에는 “두 에이전트가 서로에게 말을 걸 수 있는가”를 조사하면서 app-server, thread identity, channel server, MCP 배포 구조를 한 덩어리로 다뤘다.

그 과정에서 다음을 확인했다.

- Claude Code 세션과 Codex thread는 독립적이다.
- app-server thread 공유는 수동 동기화가 필요해서 오작동이 쉽게 생긴다.
- MCP tool 구조로 바꾸면 Codex 대화 안에서 Claude 결과를 직접 반환할 수 있다.

이 파일은 그 조사 과정의 흔적을 보존하는 용도다.

## 현재 읽어야 할 문서

새 작업을 시작할 때는 아래 문서를 우선 읽는다.

1. [docs/README.md](/Users/lunaxislu/Documents/ai-orchestration/docs/README.md)
2. [history/1-bridge.history.md](/Users/lunaxislu/Documents/ai-orchestration/history/1-bridge.history.md)
3. [docs/bridge.spec.md](/Users/lunaxislu/Documents/ai-orchestration/docs/bridge.spec.md)
4. [docs/bridge-test.md](/Users/lunaxislu/Documents/ai-orchestration/docs/bridge-test.md)
5. [docs/claude-adapter.spec.md](/Users/lunaxislu/Documents/ai-orchestration/docs/claude-adapter.spec.md)
6. [docs/legacy/app-server-legacy.md](/Users/lunaxislu/Documents/ai-orchestration/docs/legacy/app-server-legacy.md)

## 주의

- 이 파일의 오래된 제안 코드 블록은 더 이상 구현 지침이 아니다.
- `bridge-core-spec.md`, `mcp-deployment.md`, `decision-history.md` 같은 초안 문서 이름은 실제 저장소 기준으로는 더 이상 사용하지 않는다.
- 구현 기준은 active docs만 따른다.
