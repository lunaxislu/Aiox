---
topic: Codex-Relay-Payload
description: Codex plugin/list 응답 크기로 인한 relay 연결 종료와 daemon 재적용 검증
status: decided
---

## Work Items

- [x] W1 기존 작업 정리 후 daemon 재시작 여부를 확인하고 daemon 소유 Codex 실행에서 재접속·입력 가능 여부를 검증한다

## Required Context

### Return Target

- None: independent log.

### {Global}

- 대상은 /Users/lunaxislu/Documents/ai-orchestration이다. /Users/lunaxislu/workSpace/aiox는 마이그레이션 대상이며 이번 수정 대상이 아니다.
- 구현 근거는 packages/adapters/codex/src/relay.ts 및 relay.test.ts, 실행 소유권 근거는 apps/cli/src/bootstrap.ts, packages/protocol/src/core.ts, apps/daemon/src/agent-controller.ts이다.


## 2026-10-22 · Codex relay 수신 한도 초과와 실행 소유권별 적용 차이

- 기록 범위: 사용자가 이번 Codex relay 문제를 로그로 남기도록 요청했다. 앞선 로그 미작성 지시의 예외로 이 주제만 기록한다. Stage 6 Web의 W10을 이관하거나 완료 처리하지 않으며 기존 plan/next pointer를 변경하지 않는다. 이 로그는 복귀 대상이 없는 독립 Base 로그다.

확인한 증상과 원인

- ai-orchestration에서 `aiox agent run codex --network resume` 실행 후 Codex가 conversation unavailable/read-only, `Disconnected from this task`를 표시했다. 최소 instruction으로도 재현되어 긴 instruction의 큰따옴표를 원인으로 보지 않았다.
- 당시 Codex CLI 0.163.0의 App Server → relay WebSocket 수신에서 `Max payload size exceeded`, close 1006을 관측했다. `plugin/list` 응답은 약 17,511,240 bytes로 기존 16 MiB(16,777,216 bytes)를 초과했다. 별도 stdio 조회에서는 요청 ID 길이 등에 따라 약 17,511,191 bytes였다.
- 해당 조회 결과는 marketplace 6개, 카탈로그 항목 총 7,435개였다. openai-curated-remote 7,416개, openai-bundled 11개, openai-primary-runtime 5개, 나머지 세 marketplace 각 1개였다. 설치된 플러그인 수를 뜻하지 않는다. 설명과 이미지 URL 등 메타데이터가 응답 크기에 기여했다.
- AIOX relay는 Codex TUI와 App Server 사이의 로컬 WebSocket 중계다. plugin/list 전체 응답은 TUI로 전달하며 이를 network 참여 agent들에게 방송하는 경로가 아니다. external 실행도 이 relay를 사용한다.

사용자 요청과 수정

- 사용자가 수신 한도를 100 MiB로 올리도록 지시했다. [relay.ts](../packages/adapters/codex/src/relay.ts)의 upstream WebSocket `maxPayload`만 100 * 1024 * 1024(104,857,600 bytes)로 변경했다.
- TUI/control → relay의 수신 한도와 upstream 연결 전 outgoing queue 한도는 각각 16 MiB를 유지한다. 모든 방향의 제한을 일괄 변경한 작업으로 해석하지 않는다.
- [relay.test.ts](../packages/adapters/codex/src/relay.test.ts)에 실제 mock WebSocket upstream → relay → TUI로 17 MiB plugin/list 응답을 전달하고 같은 연결에서 thread/start까지 성공하는 회귀 테스트를 추가했다. code/test가 구현 사실의 owner이며 이 로그는 문제 경위와 적용 상태를 남긴다.

이 세션에서 이미 수행한 검증

- 수정 전 추가 테스트는 `TUI disconnected before receiving the response`로 실패했고 수정 후 성공했다. Codex adapter 전체 4개 파일 21개 테스트, 타입 검사, oxlint, oxfmt 및 git diff --check를 통과했다. adapter build도 통과했고 생성 dist에서 100 MiB 설정을 확인했다.
- 수정된 build를 사용하는 격리 external 실행은 ai-orchestration과 migration 대상 cwd 각각에서 idle 진입 및 재접속 오류 없는 시작을 확인했다. 진단용 실행은 종료했고 임시 진단 runner/relay 복사본은 제거했다. 성공한 모델 응답이나 agent 간 실제 메시지 전달까지 검증했다고 주장하지 않는다.
- 위 테스트·실행은 앞선 문제 조사 중 수행한 결과다. 이번 로그 작성 요청에서는 production 테스트나 사용자 실행을 다시 시작하지 않았다.

후속 실패와 앞선 안내 정정

- external 실행 성공만을 근거로 앞서 daemon 재시작이 불필요하다고 일반화한 안내를 정정한다. cwd가 실행 소유권을 결정하지 않는다. [CLI bootstrap](../apps/cli/src/bootstrap.ts)은 [terminalContextFromEnv](../packages/protocol/src/core.ts)의 AIOX_TERMINAL_ID/AIOX_TERMINAL_TOKEN 문맥에 따라 external 또는 daemon 소유 foreground 실행을 선택한다.
- 사용자가 마지막으로 제시한 thread `01a16369-fe0e-7c31-a869-268987d01401`은 Codex SQLite 로그의 thread/start 시각과 daemon runtime 기록을 대조했을 때 daemon 소유 runtime `e4550397-2d7d-4b15-a7d8-0f2f8cc75cea`의 시작과 일치했다. 따라서 그 실패를 새 build의 external 검증 결과와 동일한 실행 경로로 취급하지 않는다.
- 당시 daemon PID 42698은 수정 build 이전부터 실행 중이었다. [daemon.ts](../apps/daemon/src/daemon.ts)가 adapter를 정적으로 import하고 [agent-controller.ts](../apps/daemon/src/agent-controller.ts)가 daemon 프로세스에서 execution을 생성한다. build만으로 이미 실행 중인 daemon이 새 adapter를 읽지는 않는다.
- 판단: 기존 daemon 소유 실행은 구 adapter를 사용하므로 재시작 후 재검증이 필요하다. 재시작 후에도 동일 증상이 남는지는 아직 확인하지 않았다. 마지막 실패에서 동일 payload 오류를 직접 다시 측정한 것은 아니므로 재시작으로 해결 완료되었다고 기록하지 않는다.

현재 상태와 W1 재개

- assistant는 사용자 기존 agent/terminal을 종료하거나 daemon을 재시작하지 않았다. 마지막 사용자 질문에는 기존 작업을 정리한 뒤 `aiox daemon restart`, `aiox daemon status`를 실행하도록 안내했다. 사용자가 실제로 재시작했다는 결과는 아직 없다.
- 다음은 기존 작업 정리 및 재시작 여부를 확인하고, 새 daemon으로 같은 `aiox-codex` 명령을 실행해 conversation unavailable/끊김 없이 사용자 입력과 응답이 가능한지 확인하는 것이다. 남은 자원 때문에 정상 restart가 거절되면 진단에 나온 자원을 확인한다. 강제 종료나 개발 DB 삭제는 이번 기록 요청에 포함되지 않는다.
- Codex의 일반적인 “Any running work continues / reconnect” 출력만으로 AIOX 실행 생존을 보장하지 않는다. external CLI 종료 시 ExecutionOwner cleanup이 relay/App Server를 정리하는 경로가 있기 때문이다.
- migration 대상 `/Users/lunaxislu/workSpace/aiox`에는 이번 relay 수정이 이식되지 않았다. 전역 aiox shim이 현재 ai-orchestration의 apps/cli/dist/main.js를 가리킨다는 앞선 확인과 migration 대상 구현을 구분한다.

### 2026-10-23 00:55 · 사용자 실행 검증 완료와 종료

- 사용자 확인: 실행 검증을 직접 수행했고 문제가 해결되었다고 보고하며 관련 변경의 커밋을 요청했다. 이 사용자 보고를 근거로 W1을 완료한다. assistant가 daemon 재시작이나 사용자 실행을 추가 수행한 결과로 기록하지 않는다. 구체적인 재시작 명령·실행 시각은 별도로 확인하지 않았다.
- 이전 기록의 실행 검증 대기는 이번 사용자 확인으로 해소되었다. 수정과 회귀 테스트는 relay.ts/relay.test.ts에 반영되어 있으며 추가 제품 동작·사용법 변경은 없다. 로그는 해결 경위와 안내 정정을 보존하고 decided로 닫는다. Stage 6 Web의 작업 상태와 migration 대상 코드는 변경하지 않는다.
- 기존 자동 검증 결과가 유효하며 이후 production 변경은 없다. 커밋 전 로그 구조와 diff 공백 오류를 확인한다. 대상은 relay.ts, relay.test.ts 및 이 로그 세 파일이다.
