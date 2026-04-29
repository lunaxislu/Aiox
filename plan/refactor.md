# Refactor TODO

## 목표

Claude Code <-> Codex 양방향 MCP relay 시스템을 기능 변경 없이 리팩터링한다.

핵심 목표:

- `bridge`를 TypeScript 기반으로 전환한다.
- `bridge`는 빌드된 `dist/index.js`를 Node.js로 실행한다.
- `claude-adapter`는 Bun이 `index.ts`를 직접 실행하는 구조를 유지한다.
- 테스트 가능한 단위로 로직을 분리한다.
- 각 단계 완료 후 리뷰를 받고 다음 단계로 진행한다.

## TODO

### 1. bridge TypeScript 빌드 기반 만들기

- [ ] `bridge/tsconfig.json` 추가
- [ ] `bridge/package.json`에 `build`, `typecheck`, `test`, `prepack` 스크립트 추가
- [ ] 필요한 경우 `@types/node` dev dependency 추가
- [ ] `bridge/index.js`를 `bridge/src/index.ts`로 이동/변환
- [ ] `bridge/dist/index.js`가 생성되는지 확인
- [ ] `.codex/config.toml`은 아직 변경하지 않기
- [ ] 동작 변경 없이 build/typecheck 통과 확인
- [ ] Codex 리뷰 요청

### 2. bridge protocol/pure logic 분리

- [ ] payload validation을 `bridge/src/protocol.ts`로 분리
- [ ] relay constants를 `bridge/src/protocol.ts`로 분리
- [ ] `wrapRelayPrompt`를 `bridge/src/protocol.ts`로 분리
- [ ] `parseRequestBody` 테스트 작성
- [ ] `wrapRelayPrompt` 테스트 작성
- [ ] `node:test`로 unit test 실행
- [ ] Codex 리뷰 요청

### 3. PendingRequest 분리 및 테스트

- [ ] `PendingRequest`를 `bridge/src/pending-request.ts`로 분리
- [ ] resolve 시 map cleanup 테스트
- [ ] cancel 시 map cleanup 테스트
- [ ] timeout 시 reject 및 cleanup 테스트
- [ ] double resolve 거절 테스트
- [ ] Codex 리뷰 요청

### 4. CodexAppServerClient 분리 및 fake WS 테스트

- [ ] `CodexAppServerClient`를 `bridge/src/codex-app-server-client.ts`로 분리
- [ ] fake WebSocket 또는 fake app-server 테스트 구조 작성
- [ ] `initialize` 요청 검증
- [ ] `thread/loaded/list` 요청 검증
- [ ] `turn/start` payload 검증
- [ ] no loaded thread 에러 테스트
- [ ] app-server unavailable 테스트
- [ ] Codex 리뷰 요청

### 5. Bridge HTTP/router 분리 및 integration test

- [ ] HTTP route handling을 테스트 가능한 모듈로 분리
- [ ] `/claude-reply` 정상 resolve 테스트
- [ ] `/claude-reply` invalid origin 테스트
- [ ] `/codex-request` 정상 pending 생성 테스트
- [ ] `/codex-request` loop prevention 테스트
- [ ] unknown path/method 테스트
- [ ] fake Claude adapter HTTP server로 `ask_claude` flow 테스트
- [ ] reverse pending 후 `replyToClaude`로 HTTP response 완료 테스트
- [ ] Codex 리뷰 요청

### 6. claude-adapter 테스트 가능한 구조로 최소 분리

- [ ] `parseInboundBody`를 별도 모듈로 분리
- [ ] request payload 생성 로직 분리
- [ ] response parsing 로직 분리
- [ ] `bun:test`로 validation 테스트 작성
- [ ] `origin: "claude"` loop prevention 테스트
- [ ] `relay_depth >= 3` loop prevention 테스트
- [ ] `reply` payload shape 테스트
- [ ] `ask_codex` response parsing 테스트
- [ ] Codex 리뷰 요청

### 7. 문서 정리

- [ ] `claude-adapter/README.md`의 오래된 `codex exec helper` 설명 제거
- [ ] shared Codex app-server reverse 구조로 설명 갱신
- [ ] `docs/bridge.spec.md`와 현재 코드가 일치하는지 확인
- [ ] `docs/bridge-test.md` 수동 smoke test 절차 최신화
- [ ] 오래된 배경 설명은 필요 시 `docs/legacy/` 또는 `history/`로 이동
- [ ] Codex 리뷰 요청

### 8. 실행 경로 전환 및 smoke test

- [ ] `.codex/config.toml`을 `node bridge/dist/index.js` 실행으로 변경
- [ ] `pnpm --filter bridge build` 실행
- [ ] `pnpm --filter bridge test` 실행
- [ ] `pnpm --filter bridge typecheck` 실행
- [ ] `bun test` 또는 `pnpm --filter claude-adapter test` 실행
- [ ] 3-terminal manual smoke test 실행
- [ ] forward `ask_claude` 왕복 확인
- [ ] reverse `ask_codex` 왕복 확인
- [ ] Codex UI transcript에 `[MCP RELAY]` prompt가 남는지 확인
- [ ] 최종 Codex 리뷰 요청

## 진행 원칙

- 한 번에 한 단계만 진행한다.
- 각 단계는 기능 변경 없이 구조 변경과 테스트 추가에 집중한다.
- `.codex/config.toml` 전환은 마지막 단계에서만 한다.
- stdout은 MCP protocol 전용으로 유지한다.
- 로그는 stderr만 사용한다.
- relay payload shape와 endpoint는 변경하지 않는다.
- 테스트가 실패한 상태로 다음 단계로 넘어가지 않는다.
