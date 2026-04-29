# Refactor TODO

## 목표

Claude Code <-> Codex 양방향 MCP relay 시스템을 기능 변경 없이 리팩터링한다.

핵심 목표:

- `bridge`를 TypeScript 기반으로 전환한다.
- `bridge`는 빌드된 `dist/index.js`를 Node.js로 실행한다.
- `claude-adapter`는 Bun이 `index.ts`를 직접 실행하는 구조를 유지한다.
- 테스트 가능한 단위로 로직을 분리한다.
- 각 단계 완료 후 리뷰를 받고 다음 단계로 진행한다.

## 작업 원칙

- `.ai/tdd.md`의 TDD/Tidy First 원칙을 따른다.
- Red -> Green -> Refactor 순서로 진행한다.
- 구조적 변경과 행위 변경을 같은 커밋에 섞지 않는다.
- 한 번에 하나의 작은 테스트/작은 변경만 진행한다.
- 리팩터링은 테스트가 통과한 뒤에만 수행한다.
- 각 단계는 검증 후 커밋한다.

## TODO

### 0. baseline 검증

- [x] `git status --short`로 작업트리 확인
- [x] `pnpm lint` 통과 확인
- [x] `node --check bridge/index.js` 통과 확인
- [x] `pnpm exec tsc -p claude-adapter/tsconfig.json --noEmit` 통과 확인
- [x] bridge가 실행 중이면 `curl -sS http://127.0.0.1:8789/debug/status` 동작 확인
- [x] 현재 baseline 결과 기록
- [x] Codex 리뷰 요청

Baseline 기록 (2026-04-29 22:40 KST):

- `git status --short`: clean
- `git log --oneline -4`: `d07dc99`, `b1d1d83`, `bf931f3`, `79a8e4f`
- `pnpm lint`: pass
- `node --check bridge/index.js`: pass
- `pnpm exec tsc -p claude-adapter/tsconfig.json --noEmit`: pass
- `curl -sS http://127.0.0.1:8789/debug/status`: pass
  - bridge pid: `38354`
  - status: `ok`
  - forward pending count: `0`
  - reverse pending count: `0`

### 1A. bridge TypeScript 빌드 설정 추가

- [ ] `bridge/tsconfig.json` 추가
- [ ] `bridge/package.json`에 `build`, `typecheck`, `test`, `prepack` 스크립트 추가
- [ ] 필요한 경우 `@types/node` dev dependency 추가
- [ ] 아직 `bridge/index.js` 실행 경로는 변경하지 않기
- [ ] 아직 `.codex/config.toml`은 변경하지 않기
- [ ] `pnpm --filter bridge typecheck` 실행
- [ ] `pnpm --filter bridge build` 실행
- [ ] Codex 리뷰 요청

### 1B. bridge TS entrypoint 병렬 생성

- [ ] `bridge/src/index.ts` 생성
- [ ] 기존 `bridge/index.js`와 동일한 동작을 유지하도록 TS로 변환
- [ ] `bridge/index.js`는 아직 삭제하지 않기
- [ ] `bridge/dist/index.js` 생성 확인
- [ ] `node --check bridge/dist/index.js` 통과 확인
- [ ] 기존 `node bridge/index.js --help`와 `node bridge/dist/index.js --help` 출력 동등성 확인
- [ ] Codex 리뷰 요청

### 1C. bridge 실행 경로 전환 준비

- [ ] `bridge/package.json`의 `main`과 `bin.codex-claude-bridge`를 `dist/index.js`로 전환
- [ ] `start` script를 `node dist/index.js`로 전환
- [ ] `dev` script는 기존 JS 또는 TS 개발 방식 중 하나로 명확히 지정
- [ ] `.codex/config.toml`은 아직 변경하지 않기
- [ ] build/typecheck/lint 통과 확인
- [ ] Codex 리뷰 요청

### 1D. bridge 실행 경로 전환

- [ ] `.codex/config.toml`을 `node bridge/dist/index.js` 실행으로 변경
- [ ] `pnpm --filter bridge build` 실행
- [ ] Codex remote session 재시작 후 `/debug/status` 확인
- [ ] fresh remote session에서 forward/reverse smoke test 실행
- [ ] 기존 `bridge/index.js` 제거 여부 결정
- [ ] Codex 리뷰 요청

### 2. bridge protocol/pure logic 분리

- [ ] 먼저 `parseRequestBody` 또는 `wrapRelayPrompt` 중 하나에 대한 실패 테스트 작성
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

- [ ] `/debug/status` 테스트 작성
- [ ] `/debug/forward-pending` 테스트 작성
- [ ] `/debug/events` 테스트 작성
- [ ] HTTP route handling을 테스트 가능한 모듈로 분리
- [ ] `/claude-reply` 정상 resolve 테스트
- [ ] `/claude-reply` invalid origin 테스트
- [ ] `/claude-reply` missing pending 404 diagnostics 테스트
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

- [ ] `pnpm --filter bridge build` 실행
- [ ] `pnpm --filter bridge test` 실행
- [ ] `pnpm --filter bridge typecheck` 실행
- [ ] `bun test` 또는 `pnpm --filter claude-adapter test` 실행
- [ ] 3-terminal manual smoke test 실행
- [ ] forward `ask_claude` 왕복 확인
- [ ] reverse `ask_codex` 왕복 확인
- [ ] Codex UI transcript에 `[MCP RELAY]` prompt가 남는지 확인
- [ ] 최종 Codex 리뷰 요청

### 9. durable relay broker 후속 설계

- [ ] `history/12-durable-relay-architecture.history.md`를 기준으로 별도 plan 작성
- [ ] broker process 책임 정의
- [ ] SQLite/file-backed store schema 초안 작성
- [ ] 기존 synchronous tool compatibility 정책 정의
- [ ] late reply 조회/알림 interface 정의
- [ ] stale session/reply 처리 정책 정의
- [ ] 기존 direct relay path에서 broker path로 전환하는 migration plan 작성
- [ ] Codex 리뷰 요청

## 진행 원칙

- 한 번에 한 단계만 진행한다.
- 각 단계는 기능 변경 없이 구조 변경과 테스트 추가에 집중한다.
- `.codex/config.toml` 전환은 마지막 단계에서만 한다.
- stdout은 MCP protocol 전용으로 유지한다.
- 로그는 stderr만 사용한다.
- relay payload shape와 endpoint는 변경하지 않는다.
- 테스트가 실패한 상태로 다음 단계로 넘어가지 않는다.
