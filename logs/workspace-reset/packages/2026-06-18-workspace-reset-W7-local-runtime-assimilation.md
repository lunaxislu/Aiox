---
topic: workspace reset W7 local runtime authority assimilation
description: workspace reset W7 — docs/architecture/local-agent-runtime.md를 primary entry point로 하는 authority assimilation package. Step 15 drift 반영, evidence 확인, cross-owner effects 기록.
status: decided
---

## Work Items

- [x] W1 Batch 1: Foundation & Data (기반 및 데이터 모델 동기화)
  - [x] W1-1a §0(Purpose) 검증 및 업데이트
  - [x] W1-1b §1(Process Topology) 검증 — 변경 없음 확인 완료 (Evidence Ledger 참조)
  - [x] W1-2 §2(SQLite Schema) 및 §3(Repositories) 검증 및 업데이트
- [x] W2 Batch 2: Daemon Core (데몬 통신 및 API 동기화) — B1(§0~§3) 완료 후 현재 재개 지점
  - [x] W2-1 §4(Daemon Lifecycle) 및 §5(Daemon API Surface) 통신 규격 및 RPC 메서드 검증 (§5 API 표에 `agent_already_attached` 누락 반영 포함)
- [x] W3 Batch 3: Claude Adapter (클로드 어댑터 동기화)
  - [x] W3-1 §6(Claude Adapter) 검증 및 업데이트 (기존 `--mcp-config` 방식을 `plugin:aiox-channel-ingress@aiox` 방식으로 수정)
- [x] W4 Batch 4: Codex Adapter (코덱스 어댑터 동기화)
  - [x] W4-1 §7(Codex Adapter) 검증 및 업데이트 (1:1 app-server & proxy 매핑 구조 명확화 및 쓰레드 바인딩 로직 반영)
- [x] W5 Batch 5: Routing & CLI (라우팅 및 CLI 동기화)
  - [x] W5-1 §8(Cross-Cutting Message Routing) 검증 및 Step 15 변경점(pair 일반화, dispatch, stale drift 등) 반영
  - [x] W5-2 §9(CLI / Invocation / Status) 옵션 동기화
- [x] W6 Batch 6: Catalogs & References (카탈로그 및 부록 동기화)
  - [x] W6-1 §10~§14 에러/이벤트 명칭 최신화 및 교차 링크 검증
- [x] W7 Cross-Owner Effects
  - [x] W7-1 W1~W6 작업 중 발견한 spec/roadmap/decision 변경 필요 사항을 Evidence Ledger와 Cross-Owner Effects에 기록하고 타 문서 일괄 반영
  - [x] W7-2 cross-source Evidence Ledger 행(`history/47`·`34`·`22~23`·`sqlite-restart-recovery-pre-validation`)의 `전체` 표기를 핵심 라인으로 좁히고, 전체 스캔 사실은 narrative에 남긴다 (Codex 최종 리뷰 권고)
- [x] W8 Closeout
  - [x] W8-1 결과를 parent W4.5 로그 W7에 반영하고 W8로 복귀한다
  - [x] W8-2 Workflow retrospective: batch 분할, task brief, Evidence Ledger, Scope, agent 의견 수렴에서 생긴 시행착오와 portable 후보를 이 로그와 `logs/log-system/2026-06-18-package-workflow-portable-pattern.md`에 기록한다

## Scope

- Primary owner: `docs/architecture/local-agent-runtime.md`
- Allowed cross-owner updates:
  - `docs/specs/aiox-a2a.md`
  - `docs/product/roadmap.md`
  - `plans/release-plan.md`
  - `docs/decisions/`
  - `docs/architecture/documentation-system.md`
  - root `AGENTS.md`
- Evidence inputs: `src/cli/invocation.ts`, `src/adapters/codex/runtime.ts`, `src/adapters/claude/launcher.ts`, `src/core/pairs.ts`, `history/5`, `history/29`, `history/49~56`

## Evidence Ledger

| Topic                                                   | Source                                             | Lines                                 | Finding                                                                                                                                                                                                                                        | Owner impact                                                                       | Action              |
| ------------------------------------------------------- | -------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------- |
| Codex 1:1 per-agent app-server 구조                     | `src/adapters/codex/runtime.ts`                    | 304–366                               | `attachCodexAgentRuntime()`이 에이전트마다 `launchCodexAppServer()` 독립 호출 — 1:1 확인                                                                                                                                                       | `local-agent-runtime.md` §1·§7.1 이미 정확                                         | 변경 없음           |
| Codex 1:1 결정 근거 — 1:N 가능성 검증 후 의도적 선택    | `history/5`                                        | 전체                                  | shared app-server(1:N)가 기술적으로 가능함을 직접 실험 확인                                                                                                                                                                                    | decision 문서 필요 — "가능했으나 선택 안 함" 맥락                                  | decision 신규 생성  |
| Codex 1:1 결정 근거 — per-agent pivot                   | `history/29`                                       | 전체                                  | 1:N → 1:1 pivot 결정문. 사용자 질문이 트리거. 이유: attribution 복잡성 제거·Codex 설계 의도 정렬·단순 프로세스 감독                                                                                                                            | decision 문서 필요 — W5 history 삭제 전 추출 필수                                  | decision 신규 생성  |
| Claude 채널 주입 방식 drift — 기본값 누락               | `src/cli/invocation.ts`                            | 161–163, 219, 239–249                 | 기본값은 `plugin:aiox-channel-ingress@aiox`(D strategy). `--mcp-config` inline(A strategy)은 `AIOX_CLAUDE_CHANNEL_STRATEGY=inline` 명시 시만 동작                                                                                              | `local-agent-runtime.md` §1 다이어그램·§6.1·§6.2 — plugin 방식 완전 누락           | 문서 수정           |
| Claude 채널 D strategy 전환 결정                        | `history/56`                                       | 전체                                  | R3 Step 3b: D를 기본으로 승격. `AIOX_SPIKE_STRATEGY_D` 완전 제거. no-fallback 계약. Codex 리뷰 + live smoke 4항목 PASS                                                                                                                         | decision 문서 필요                                                                 | decision 신규 생성  |
| 예외 명칭 — local-agent-runtime.md 정확                 | `src/core/pairs.ts`                                | 39, 44                                | 코드: `pair_slot_occupied`/`pair_full`. `local-agent-runtime.md` §3·§8.6·§10.1 동일 명칭 사용                                                                                                                                                  | 변경 없음                                                                          | 확인 완료           |
| §1 다이어그램 D strategy 기본값 표기                    | `docs/architecture/local-agent-runtime.md`         | 84-85                                 | `[Fact] 문서 다이어그램에 plugin:aiox-channel-ingress@aiox 가 기본값으로 이미 정상 표기되어 있음`                                                                                                                                              | 변경 없음                                                                          | 변경 없음           |
| §1 Claude agent channel-server 주입                     | `src/adapters/claude/launcher.ts`                  | 132-210                               | `[Fact] launcher가 plugin과 inline 두 전략으로 claude 자식 프로세스를 생성. Per-agent counts 설명 및 다이어그램과 정확히 일치함`                                                                                                               | 변경 없음                                                                          | 변경 없음           |
| §1 MVP invariant (Codex lifecycle)                      | `src/cli/invocation.ts`, 등                        | (app-server.ts 187-219 등)            | `[Fact] dispose 흐름(WS close → SIGTERM → 3s grace → SIGKILL) 및 TUI CLI 소유권 로직이 MVP invariant 텍스트와 완벽히 일치함`                                                                                                                   | 변경 없음                                                                          | 변경 없음           |
| §0 Purpose 단락 컴포넌트 커버리지                       | `src/`                                             | 디렉토리 구조                         | `[Fact] MVP 주요 컴포넌트(daemon, clis, routing, claude channel-server, codex app-server)가 누락 없이 잘 나열되어 있음`                                                                                                                        | 변경 없음                                                                          | 변경 없음           |
| §2 SQLite Schema DB Init                                | `src/daemon/run.ts`                                | 25                                    | `[Fact] new Database(":memory:") 호출과 applySchema 호출 위치 확인됨`                                                                                                                                                                          | 변경 없음                                                                          | 변경 없음           |
| §2 SQLite Schema unused helpers                         | `src/store/sqlite.ts` / `deliveries.ts`            | 5-12, 148-158                         | `[Fact] openSqliteDatabase 및 recoverAfterRestart 함수가 존재하나 호출하는 caller가 없음`                                                                                                                                                      | 변경 없음                                                                          | 변경 없음           |
| §2 SQLite Schema Table definitions                      | `src/store/schema.ts`                              | 16-28                                 | `[Fact] agents 테이블 실제 스키마에 pair_slot과 last_seen_at 컬럼이 있으나 문서에 누락되어 있음 (drift)`                                                                                                                                       | `docs/architecture/local-agent-runtime.md`의 `agents` 테이블 Key columns 수정 필요 | 문서 수정           |
| §3 Repositories Structure & Methods                     | `src/store/repositories/*.ts`                      | 전체                                  | `[Fact] 6개 레포지토리 파일 및 명시된 주요 메서드들이 각 인터페이스에 일치하게 정의되어 있음`                                                                                                                                                  | 변경 없음                                                                          | 변경 없음           |
| §3 Repositories Tx & Sentinel                           | `src/store/transaction.ts`, `state.ts`             | 3-5, 36-37, 1972                      | `[Fact] attachRollbackSentinel, sendMessageRollbackSentinel, isAttachRollback 및 withTransaction 래퍼 확인됨`                                                                                                                                  | 변경 없음                                                                          | 변경 없음           |
| §2 applySchema 범위·Migration 1 (drift)                 | `src/store/schema.ts`                              | 14-82, 84-135                         | [Fact] applySchema가 create-table 후 applyMigration1(L81) 호출. Migration1: (pair_id,kind) 중복 preflight throw→ALTER pair_slot→backfill codex='a'/claude='b'→partial unique idx→schema_version. 기존 "create table if not exists(3-68)" stale | §2 문서 수정                                                                       | 문서 수정           |
| §2 schema_version + partial unique index (load-bearing) | `src/store/schema.ts`                              | 120-124, 125-133                      | [Fact] `agents_pair_slot_unique on (pair_id,pair_slot) where pair_id not null` + schema_version 테이블이 문서 §2에 누락. [Inference] index가 2-slot 점유 불변식을 DB 레벨에서 강제                                                             | §2 누락                                                                            | 문서 수정           |
| §2 schema migration typed error                         | `src/store/schema.ts`                              | 5-12, 163-173                         | [Fact] reason=schema_migration_failed / detail=duplicate_pair_slot_after_backfill                                                                                                                                                              | §2 누락                                                                            | 문서 수정           |
| §2 pair status `stale`                                  | `src/core/pairs.ts`                                | 3                                     | [Fact] pairStatuses=[pending,ready,stale]; status를 'stale'로 쓰는 경로 없음(grep) → 타입만 존재, 전이정책 gap                                                                                                                                 | §2 row 불완전                                                                      | 문서 수정(gap 표기) |
| §3 pair 슬롯 kind-agnostic (drift·정정)                 | `repositories/pairs.ts`,`core/pairs.ts`,`state.ts` | 132-153·246-263 / 107-117 / 2116-2125 | [Fact] pickFirstOpenSlot a→b kind 무관, ready=slot a·b 충족(kind 무관), state.ts slotA.kind===slotB.kind 분기로 same-vendor 지원. 문서 "kind-slot/both kinds present" stale (직전 §3 '변경 없음' 정정)                                         | §3 문서 수정                                                                       | 문서 수정           |
| §3 kind 검사 의미                                       | `repositories/pairs.ts`                            | 91-99                                 | [Fact] agent_kind_mismatch는 입력 kind==저장 kind 일관성 검사 — vendor-pairing 제약 아님(유지)                                                                                                                                                 | §3 의미 정확화                                                                     | 문서 수정           |
| §0 framing (drift·정정)                                 | `history/45`,`history/47`                          | 199 / 전체                            | [Fact] Step 15가 prd §Pair "1:1 shortcut"을 same-vendor 허용으로 supersede, cardinality 2 유지. 문서 "one Claude+one Codex" 부정확 (직전 §0 '변경 없음' 정정)                                                                                  | §0 문서 수정                                                                       | 문서 수정           |
| Step 15 decision authority                              | `history/45·46·47·48`                              | 전체                                  | [Fact] WHY(QA R2 codex↔codex 거절→일반화 지시, 2-slot 고정, deferred semantics, D6 registry post-MVP defer) 코드만으로 복원 불가                                                                                                               | decision 필요                                                                      | decision 신규 생성  |
| §5/§10 agent_already_attached 누락 (후속)               | `state.ts`,`core/pairs.ts`                         | 572-578 / 39                          | [Fact] attach throw/reclassify 집합에 있으나 문서 §5 API 표·§10.1 catalog에 누락                                                                                                                                                               | §5(W2)·§10(W6)                                                                     | 후속(W2/W6)         |
| a2a-spec 현재 전제 stale (후속 W8)                      | `prd/post-mvp/aiox-a2a-spec.md`                    | 992-995, 1105                         | [Fact] "pair slot a=codex/b=claude 고정"은 Step 15(2026-05-27) 이후 stale. 진짜 한계=2-agent cardinality; 축 C 결론은 유효                                                                                                                     | a2a-spec(W8)                                                                       | 후속(W8)            |
| §4.1 Daemon Lifecycle                                   | `src/daemon/run.ts`, `src/config/paths.ts`         | run.ts:24-87, paths.ts:9-102          | `[Fact] DB Init, startup, signal 처리, shutdown, auto-start 구현 일치. 단 UDS path는 profile(dev/build/release) 기반 폴더 분리가 적용되어 있으나 문서에 누락됨(drift)`                                                                       | `docs/architecture/local-agent-runtime.md` §4.1                                    | 문서 수정           |
| §4.2 Socket Transport                                   | `src/daemon/socket-transport.ts`                   | 60, 64-69, 27-46 등                   | `[Fact] UDS, NDJSON, envelope, client topology, timeout, stale retry, 에러 분리 등 모두 실제 구현과 완벽히 일치함`                                                                                                                             | 변경 없음                                                                          | 변경 없음           |
| §4.3 sendMessage Sequence                               | `src/daemon/state.ts`                              | 1761-1864                             | `[Fact] runSendMessageTransaction tx 시퀀스, preflight idempotency throw/rollback, events append 등 모두 시퀀스 다이어그램과 완벽히 일치함`                                                                                                    | 변경 없음                                                                          | 변경 없음           |
| §5 API attachAgent (drift)                              | `src/daemon/api.ts` / `state.ts`                   | 144-155 / 572-578                     | `[Fact] agent_already_attached 에러가 반환됨에도 §5 문서의 Typed errors 컬럼에 누락됨. 직전 묶음에서 발견된 것 수정함.`                                                                                                                        | `docs/architecture/local-agent-runtime.md` §5                                      | 문서 수정           |
| §5 API receiveClaudeChannelReply (drift)                | `src/daemon/state.ts`                              | 1008-1042                             | `[Fact] 문서에 "always returns {ok:true} to channel-server"라 적혀 있으나, 코드는 runSendMessageTransaction 결과를 반환함. sendMessage typed errors가 그대로 반환될 수 있음.`                                                                  | `docs/architecture/local-agent-runtime.md` §5                                      | 문서 수정           |
| §5 API 기타 메서드                                      | `src/daemon/api.ts` / `state.ts`                   | 전체                                  | `[Fact] 나머지 17개 메서드의 Mutates, Emits, Typed errors 모두 실제 구현 코드와 완벽히 일치함.`                                                                                                                                                | 변경 없음                                                                          | 변경 없음           |
| §6.1 Topology                                          | `src/cli/invocation.ts`, `src/daemon/state.ts`      | 161-164, 219-220, 521-522              | `[Fact] Line numbers for channel activation strategy drifted from 161-163, 219 to 161-164, 219-220. claudeChannelRuntimes Map is at state.ts:521-522.`                                                                                                          | `local-agent-runtime.md` §6                                                       | 문서 수정           |
| §6.2 Launch Flow                                       | `src/cli/parse.ts` 등                             | 268-270 등                             | `[Fact] Line numbers for --resume reject, pending token creation, plugin launch invocation, and buildClaudeChannelMcpConfig 모두 drift 발생 확인.`                                                                                                                        | `local-agent-runtime.md` §6                                                       | 문서 수정           |
| §6.2 Launch Flow                                       | `src/adapters/claude/channel-server.ts`            | 549-581 등                             | `[Fact] Line numbers for main function (channel-server logic), env parsing, McpServer, etc. drifted similarly. process.exit(1) moved from 342 to 513.`                                                                                                                | `local-agent-runtime.md` §6                                                       | 문서 수정           |
| §6.3 Ingress                                           | `src/adapters/claude/channel-server.ts` 등          | 307-393 등                             | `[Fact] Tool handlers, error mappings, chat_id persist line numbers drifted.`                                                                                                                                                                                  | `local-agent-runtime.md` §6                                                       | 문서 수정           |
| §6.4 Injection                                         | `src/adapters/claude/channel-server.ts`            | 432-478, 49-69                        | `[Fact] HTTP ingress and V1 trusted framing buildChannelNotification, instructions line numbers drifted.`                                                                                                                                                              | `local-agent-runtime.md` §6                                                       | 문서 수정           |
| §6.1 Topology plugin decision link                     | `docs/architecture/local-agent-runtime.md`         | 336                                   | `[Fact] The decision docs/decisions/claude-channel-plugin-default.md is not linked in §6.1 for the D strategy.`                                                                                                                                                | `local-agent-runtime.md` §6                                                       | 문서 수정           |
| §6.4 Injection unauthenticated HTTP /send gap          | `src/adapters/claude/channel-server.ts`            | 432-478                               | `[Fact] channel HTTP /send is unauthenticated (P1-1). The architecture doc currently misses stating this as a current fact/gap without projecting future security boundaries.`                                                                                 | `local-agent-runtime.md` §6                                                       | 문서 수정           |
| §6 / §10.3 claude_channel_port_in_use                  | `src/adapters/claude/channel-server.ts`            | 668-676, 687                                   | `[Fact] claude_channel_port_in_use 에러 행을 §10.3 카탈로그에 성공적으로 기입하여 마감 완료함.`                                                                                                                                     | `local-agent-runtime.md` §10.3                                                     | 문서 수정           |
| §7.1 1:1 per-agent app-server | `src/adapters/codex/runtime.ts` | 109-302 | [Fact] 1:1 per-agent app-server implementation matches description. Proxy URL is used for endpoint. | `docs/architecture/local-agent-runtime.md` | 변경 없음 |
| §7.2 Attach / WS Transport | `prd/post-mvp/aiox-a2a-spec.md` | 1064 | [Fact] WS transport is experimental/unsupported by upstream Codex (P2-12). This is a current gap. | `docs/architecture/local-agent-runtime.md` | 문서 수정 |
| §7.5 Active-thread binding | `src/daemon/state.ts` | 636-665, 1537-1552 | [Fact] Binding authority matches code (resume, proxy, loaded_list). | `docs/architecture/local-agent-runtime.md` | 변경 없음 |
| §7.6 turn/start injection | `src/adapters/codex/injector.ts` | 26-58 | [Fact] Ack semantic and thread mismatch guards match code. | `docs/architecture/local-agent-runtime.md` | 변경 없음 |
| §7.7 fallback disable | `src/daemon/state.ts` | 1606-1627 | [Fact] `loadedThreadIds.at(-1)` fallback is disabled. If no `runtimeActiveThreadId`, returns `codex_no_loaded_thread`. | `docs/architecture/local-agent-runtime.md` | 문서 수정 |
| §7.7 deferred semantics | `src/daemon/state.ts` | 1433-1457 | [Fact] `codex_no_loaded_thread` results in `deferred` with `target_binding_unconfirmed`, not throw. | `docs/architecture/local-agent-runtime.md` | 문서 수정 |
| §7.9 Runtime failure wiring | `src/daemon/state.ts` | 2024-2042 | [Fact] `defaultAttachCodexRuntime` does not pass `onRuntimeFailed`. Runtime failure is not wired in production (P2-3). | `docs/architecture/local-agent-runtime.md` | 문서 수정 |
| B1~B4 plan/plans 반대 증거 검토 | `plan/mvp-implementation-checklist.md`, `plan/qa-tracker.md`, `plans/post-mvp/adapter-dispatch-registry.plan.md`, `plans/post-mvp/channel-boot-surface.plan.md` | checklist:18, 685-750, 849, 912-931, 1032-1045; qa:40; adapter:7,19-34; channel:7,19-21 | [Fact] B1~B4에서 "변경 없음" 처리된 항목을 plan/plans와 대조했다. MVP checklist는 closed/current implementation evidence로 사용 가능하며, post-mvp subplans는 Deferred execution plan이다. 현재 사실처럼 섞였거나 상충하는 반대 증거는 없음. | 변경 없음 | 변경 없음 |
| §6.5 / §7.10 Sequence 검증 | `plan/mvp-implementation-checklist.md` | 849, 930-931, 1032-1042 | [Fact] `claude_channel_reply_received`, `codex_ingress_reply_received`, Claude reply -> Codex routed delivery drain, Codex -> Claude queued delivery drain, Codex inbound envelope/reply dispatch symmetry가 MVP checklist와 일치함. | 변경 없음 | 변경 없음 |
| §7.3 / §7.4 Resume 및 Proxy | `plan/mvp-implementation-checklist.md` | 686-750, 1044-1045 | [Fact] `codex resume` CLI 명령어 및 transparent proxy의 lazy parse 최적화 등 현재 구조와 정확히 일치함. | 변경 없음 | 변경 없음 |
| §7.8 Codex MCP Ingress 검증 | `plan/mvp-implementation-checklist.md` | 912-931 | [Fact] `codex_ingress_unauthorized`(`missing_token` 등), daemon RPC `registerCodexChannel`/`receiveCodexMessage`/`receiveCodexReply`, pending token map, MCP tools와 `codex_ingress_reply_received` 이벤트가 Step 13 implementation summary와 일치함. | 변경 없음 | 변경 없음 |
| Adapter Dispatch Registry | `plans/post-mvp/adapter-dispatch-registry.plan.md` | 7, 32-34 | [Fact] Registry를 도입하여 daemon dispatch 지점 분기를 추상화하는 것은 Deferred(post-MVP) 상태로 명시됨. 현재 코드의 분기가 Current 구현. | 변경 없음 | Target/Proposed/Deferred로 분류 |
| Claude Channel Boot Surface | `plans/post-mvp/channel-boot-surface.plan.md` | 7, 19-21 | [Fact] attach response에 channel server 부팅 실패를 surface하는 것은 Deferred 상태임. 현재의 "daemon은 부팅 실패를 즉시 알지 못한다"가 올바른 Current gap. | 변경 없음 | Target/Proposed/Deferred로 분류 |
| §8.6 codex/claude routes stale | `src/daemon/state.ts` | 2099-2135 | `[Fact]` `createBidirectionalPairRoutes`는 `slotA`/`slotB`를 기반으로 same/mixed vendor 관계없이 양방향 라우트를 동적 생성함. `[Inference]` "codex→claude and claude→codex" 서술은 stale. | `local-agent-runtime.md` §8.6 | 문서 수정 |
| §8.3 dispatchToPairPeers (current) | `src/daemon/state.ts` | 1274-1277 | `[Fact]` `dispatchToPairPeers`는 target-kind 기반으로 직접 dispatch 수행. `[Inference]` AdapterRouter로의 리팩토링은 Deferred 상태이며 production은 계속 `dispatchToPairPeers` 사용. | `local-agent-runtime.md` §8.3 | 문서 수정 |
| §8.3 AdapterRouter & deferred logic | `tests/unit/adapters/fake-integration.test.ts` | 72, 86-115 | `[Fact]` `createAdapterRouter`의 동작은 테스트 코드에서 확인 가능하나 production에는 미적용됨. | 변경 없음 | 확인 완료 |
| §8.2 Adapter Registry (status) | `plans/post-mvp/adapter-dispatch-registry.plan.md` | 7 | `[Fact]` Adapter registry는 명시적으로 Deferred (post-MVP) 상태. | 변경 없음 | Target/Deferred 분류 |
| §8 ack/retry & auto-flush (status) | `prd/post-mvp/aiox-a2a-spec.md`, `src/` 전체 | 186 | `[Fact]` `src/` 코드 전체 검색(2026-06-18) 결과 ack/retry, queued delivery 자동 flush 관련 구현(심볼) 부재 확인. `[Inference]` 문서의 Not implemented 상태 맞음. | 변경 없음 | Not implemented 분류 |
| §8 canonical envelope (status) | `prd/post-mvp/aiox-a2a-spec.md`, `src/core/messages.ts` | 186 | `[Fact]` `src/core/messages.ts` 타입 정의에 aiox.message.v1 protocol 필드나 검증 로직이 없음(2026-06-18). `[Inference]` 문서의 Not implemented 상태 맞음. | 변경 없음 | Not implemented 분류 |
| §8 deliveryId based reply (status) | `prd/post-mvp/aiox-a2a-spec.md`, `src/core/messages.ts` | 185-186 | `[Fact]` 시스템 내부 delivery 추적용 심볼(`deliveryId`)은 존재하나, spec이 서술하는 envelope 레벨의 `deliveryId` 기반 reply는 `src/core/messages.ts`에 미구현 상태(여전히 `parentMessageId` 사용). `[Inference]` Partially implemented 상태 맞음. | 변경 없음 | Partially implemented 분류 |
| §8.1 Domain Model | `src/core/messages.ts`, `deliveries.ts`, `pairs.ts` | 17-23 (msg), 13-19 (deliv), 107-117 (pair) | `[Fact]` 명시된 타입(Message, Delivery, Pair)이 서술/framing 축 및 실제 소스 코드 구조(로직축)와 일치함을 검증함 (Rule 4 통과). | 변경 없음 | 확인 완료 |
| §8.2 Idempotency | `src/daemon/state.ts`, `tests/unit/daemon/message-idempotency-store.test.ts` | 1761-1864 | `[Fact]` Idempotency와 rollback sentinel 서술이 `runSendMessageTransaction` 로직 및 테스트 동작(로직축)과 일치함 (Rule 4 통과). | 변경 없음 | 확인 완료 |
| §8.4 Delivery FSM (Transitions) | `src/daemon/state.ts` | 1192-1244, 1279-1320 | `[Fact]` 상태 변경 이벤트 발생 함수 `updateDeliveryStatusInTransaction` 및 호출처에서 status가 전이되고 `delivery_status_changed`가 기록됨을 소스로 검증함. `dispatchToPairPeers`에서 success(delivered->completed), deferred(queued로 유지/복귀), failed(failed) 처리가 올바르게 핸들링됨. | `docs/architecture/local-agent-runtime.md` §8.4 | 문서 수정 |
| §8.4 Delivery FSM (Deferred Paths) | `src/daemon/state.ts`, `src/store/repositories/deliveries.ts` | state.ts:1346-1352,1373-1387,1417-1465,1507-1511; deliveries.ts:148-158 | `[Fact]` Claude target deferred path 및 Codex target deferred path (`codex_channel_unavailable` -> `target_runtime_unavailable`) 확인. `deliveries.recoverAfterRestart`가 `delivering` 상태의 배송을 `queued`로 재설정함을 SQL로 검증함 (Rule 4 통과). | `docs/architecture/local-agent-runtime.md` §8.4 | 문서 수정 |
| §8.4 Delivery FSM (Tests) | `tests/unit/daemon/codex-ingress.test.ts`, `tests/unit/adapters/fake-integration.test.ts` | ingress.test.ts:712-742,1160-1205,1207-1257; fake-integration.test.ts:437-486,488-541 | `[Fact]` Codex reply 시 Claude channel absent 일 때, Claude reply 시 Codex runtime/binding unavailable 일 때, 그리고 adapter router deferred path에서 모두 queued/deferred 상태로 배송이 유지됨을 유닛 테스트로 검증함. | 변경 없음 | 확인 완료 |
| §8.5 parent_message_id (Claude Wiring) | `src/daemon/state.ts`, `tests/unit/daemon/codex-ingress.test.ts`, `tests/unit/adapters/claude-channel.test.ts` | state.ts:1008-1016; ingress.test.ts:937-1004; claude-channel.test.ts:494-521 | `[Fact]` Claude reply path `receiveClaudeChannelReply`에서 `chatId`가 `parentMessageId`로 변환되어 메시지 트랜잭션에 주입 및 DB에 영속화됨을 소스 및 유닛 테스트로 검증함. | `docs/architecture/local-agent-runtime.md` §8.5 | 문서 수정 |
| §8.5 parent_message_id (Codex Wiring) | `src/daemon/state.ts`, `tests/unit/daemon/codex-ingress.test.ts` | state.ts:1127-1138; ingress.test.ts:633-668 | `[Fact]` Codex reply path `receiveCodexReply`에서 `parentMessageId`가 인입 메시지의 부모 ID로 전달되어 올바르게 영속화됨을 소스 및 연동 테스트로 검증함. | `docs/architecture/local-agent-runtime.md` §8.5 | 문서 수정 |
| §8.5 parent_message_id (MCP Mapping) | `src/adapters/codex/mcp-server.ts`, `tests/unit/adapters/codex-mcp-server.test.ts` | mcp-server.ts:223-245; codex-mcp-server.test.ts:121-155 | `[Fact]` Codex MCP 도구 호출 시 `aiox_reply.parent_message_id` 매개변수가 데몬 클라이언트의 `parentMessageId` 필드로 매핑되어 전송됨을 handler 소스 및 유닛 테스트로 검증함. | `docs/architecture/local-agent-runtime.md` §8.5 | 문서 수정 |
| §5 / §8.2 sendMessage cite | `docs/architecture/local-agent-runtime.md` | 307, 796 | `[Fact]` 닫힌 배치(W2)의 §5와 현재 검증 중인 §8.2 본문에 stale line cite(`1639-1741`) 잔존. `1761-1864`로 일괄 정정함. | `local-agent-runtime.md` §5, §8.2 | 문서 수정 |
| §0~§7 B1~B4 Disk Audit | `docs/architecture/local-agent-runtime.md` | §0~§7 본문 전체 | `[Fact]` §0~§7 본문의 40여 개 stale cite(예: `state.ts:493-702` 등)를 실제 물리 `file:line` 범위로 전면 교정 완료함. | `local-agent-runtime.md` §0~§7 | 문서 수정 |
| §6.4 Claude Injection (Audit) | `docs/architecture/local-agent-runtime.md` | 421 | `[Fact]` `chatId`/`origin` 대입 지시 stale cite (`state.ts:1404-1406`)를 실제 주입 라인 범위인 `state.ts:1364-1366`으로 교정 완료함 (Audit 결함 정정). | `local-agent-runtime.md` §6.4 | 문서 수정 |
| §6.5 Sequence Test (Claude Reply) | `tests/unit/adapters/claude-channel.test.ts` | 292–388 | `[Fact]` `surfaces reply receipt failures`(L304), `records claude_channel_reply_received...`(L325), `links agentId...`(L349) 등 Claude reply 라우팅 동작이 코드로 실제 검증됨 (Rule 4 통과). | 변경 없음 | 확인 완료 |
| §7.3 Resume Test (resumeThread) | `tests/unit/adapters/codex-runtime.test.ts` | 221–267 | `[Fact]` `resumes a daemon-owned Codex thread...`(L221), `fails explicit Codex resume...`(L245) 등 Thread resume 및 에러/롤백 동작이 코드로 실제 검증됨 (Rule 4 통과). | 변경 없음 | 확인 완료 |
| §7.4 Transparent Proxy Test | `tests/unit/adapters/codex-proxy.test.ts` | 207–278 | `[Fact]` `does not JSON.parse unrelated client frames`(L212), `still parses binding request methods...`(L240) 등 lazy parse 최적화 및 relay 동작이 코드로 실제 검증됨 (Rule 4 통과). | 변경 없음 | 확인 완료 |
| §7.8 MCP Ingress Test | `tests/unit/daemon/codex-ingress.test.ts` | 117–246 | `[Fact]` `happy path stores runtime...`(L129), `wrong token returns...`(L162) 등 token match 기반 register 및 spoofing 차단 동작이 코드로 실제 검증됨 (Rule 4 통과). | 변경 없음 | 확인 완료 |
| §7.10 Sequence Test | `tests/unit/daemon/codex-ingress.test.ts` | 299–760 | `[Fact]` `creates message and deliveries...`(L312), `receiveCodexMessage dispatches...`(L341) 등 message ingress/dispatch 흐름 및 deferred queue 동작이 코드로 실제 검증됨 (Rule 4 통과). | 변경 없음 | 확인 완료 |
| Unreferenced Files Audit | `plan/`, `plans/`, `history/`, `prd/` | 디렉토리 전체 | `[Fact]` 미인용 파일들을 inventory하여 상태 분류 완료. 상세 Mapping은 본 문서 3항의 `미인용 파일 상세 분류 MAP`에 수록함 (감사성 보강). | `logs/workspace-reset/packages/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md` | 분류 완료 |
| §9.1 Command Table (missing command) | `src/cli/parse.ts`, `src/cli/invocation.ts` | parse: 225-243, invoke: 300-301, 317-352 | `[Fact] aiox claude-plugin setup` command exists in code but is missing from §9.1 Command Table. | `local-agent-runtime.md` §9.1 | 문서 수정 |
| §9.1 Command Table (stale line cites) | `src/cli/parse.ts`, `src/cli/invocation.ts`, `src/bin/aiox.ts` | 여러 행 | `[Fact]` 여러 명령의 파싱, 인보케이션 및 포크 라인들이 코드 변경으로 인해 어긋남. | `local-agent-runtime.md` §9.1 | 문서 수정 |
| §9.2 Invocation Layer (stale line cites) | `src/cli/parse.ts`, `src/cli/invocation.ts` | 여러 행 | `[Fact]` `invokeParsedCommand`, `ensureOk`, `CliParseError`, 롤백 라인 등 인보크 설명 내의 라인 인용들이 어긋남. | `local-agent-runtime.md` §9.2 | 문서 수정 |
| §9.3 Doctor + Status (stale line cites) | `src/cli/doctor.ts`, `src/cli/format.ts`, `src/daemon/state.ts` | 여러 행 | `[Fact]` doctor 체크 범위, status 출력 포맷, `StatusResponse.status()`의 라인 범위 인용들이 어긋남. | `local-agent-runtime.md` §9.3 | 문서 수정 |
| §10.6 CLI / Invocation Catalog (stale cites) | `src/cli/parse.ts`, `src/cli/invocation.ts` | 여러 행 | `[Fact]` CLI 및 인보케이션 관련 에러 카탈로그 내의 소스 라인 범위 인용들이 어긋남. | `local-agent-runtime.md` §10.6 | 문서 수정 |
| §10.1 agent_already_attached 누락 | `src/daemon/state.ts`, `src/store/repositories/pairs.ts` | state.ts:573, pairs.ts:118 | `[Fact] agent_already_attached` 에러 코드가 attachAgent에서 실제로 반환될 수 있음에도 §10.1 카탈로그에 누락되어 있어 보완함. | `local-agent-runtime.md` §10.1 | 문서 수정 |
| §10.2 Codex Internal / Deferred 구분 | `src/daemon/state.ts` | 1418-1465, 1590-1627 | `[Fact] codex_channel_unavailable` 및 `codex_no_loaded_thread`는 내부 adapter reason(L1593, L1622)이며, 최종 delivery FSM에서는 각각 `target_runtime_unavailable` 및 `target_binding_unconfirmed` 지연 사유(L1462, L1454)로 처리됨을 규명하고 기술을 정밀화함. | `local-agent-runtime.md` §10.2 | 문서 수정 |
| §10.3 Claude Env Check Line Cites | `src/adapters/claude/channel-server.ts` | 638-650, 652-665 | `[Fact]` Claude channel-server 부팅 단계 환경 검사 `requireEnv` 및 `parsePortEnv` 위치가 어긋나 있어 수정함. | `local-agent-runtime.md` §10.3 | 문서 수정 |
| §10.4 Router Error Code Alignment | `src/adapters/router.ts` | 25, 94 | `[Fact] adapter_not_found`는 Router signature 타입에는 있으나 실제로는 `target_adapter_not_registered`가 반환됨을 대조 및 검증함. | `local-agent-runtime.md` §10.4 | 문서 수정 |
| §10.6 CLI Missing Errors | `src/cli/parse.ts`, `src/cli/invocation.ts` | parse.ts:251, invocation.ts:347, 423, 446, 495 | `[Fact] invalidScope`, `claude_plugin_setup` 실패, `claude_preflight` 실패 등 CLI 및 인보케이션 관련 누락 에러 5종을 추가 및 정립함. | `local-agent-runtime.md` §10.6 | 문서 수정 |
| §11 Events Catalog Line Cite Alignment | `src/daemon/state.ts` | 900-1911 | `[Fact]` 이벤트 카탈로그의 16개 활성 이벤트의 소스 코드 내 emission `events.append` 위치와 라인 범위를 최신화함. | `local-agent-runtime.md` §11 | 문서 수정 |
| §12 Smoke Matrix Category Classification | `tests/unit/adapters/codex-proxy.test.ts` 등 | 파일 전체 | `[Fact]` 8개 smoke 테스트 항목 중 basic 라우팅 외 7개 TUI 동작은 mock/proxy 감시 테스트에 기반한 manual smoke 시나리오임을 규정하고 분류함. | `local-agent-runtime.md` §12 | 문서 수정 |
| §13 Known Gaps Architecture Split | `src/store/repositories/deliveries.ts` 등 | 여러 행 | `[Fact]` durable recovery(`recoverAfterRestart`/`openSqliteDatabase` 미사용)와 missing failure callback wiring 등 as-built current gap과 target/deferred 로드맵 항목을 명시적으로 구분함. | `local-agent-runtime.md` §13 | 문서 수정 |
| §14 밖 dead link | `docs/aiox/` 하위 파일 등 | 여러 행 | `[Fact]` docs/aiox/ 하위 6개 파일 및 로그 2개 내에서 존재하지 않는 docs/architecture/mvp-architecture.md를 가리키는 dead link 확인 (별도 W 문서정합 소관). | `docs/aiox/` | 기록만(Scope 밖) |
| 교차 검색: mvp-architecture | `docs/aiox/mvp-architecture.md` | 895-1066 | `[Fact]` 현 local-agent-runtime.md의 직전 카탈로그 distill 원본 출처 확인. | N/A | 확인 완료 (Stale) |
| 교차 검색: history/47 | `history/47` F1 | 55–60 | `[Fact]` 단일 `kind` discriminator 통일로 `{ok:false}` 형태에서 `kind:"failed"` 리팩토링 결정 확인. | N/A | 확인 완료 (Rationale) |
| 교차 검색: history/34 | `history/34` | 504–507, 597–606, 670–682, 731–735 | `[Fact]` codex adapter failure reason(`ws_*`, `binding_uncertain`) 및 §11 declared-only 이벤트 최초 설계 rationale 확인. | N/A | 확인 완료 (Rationale) |
| 교차 검색: history/22~23 | `history/22`, `history/23` | `history/22:179-194, 222-230` / `history/23:52, 100, 124-125` | `[Fact]` `pair_ready`/`route_*` 이벤트를 의도적으로 미방출 처리하고 post-mvp로 이연한 rationale 확인. | N/A | 확인 완료 (Rationale) |
| 교차 검색: checklist | `plan/mvp-implementation-checklist.md` | 832, 930, 1049-1081 | `[Fact]` session-expiry typed error, `codex_channel_*` event 도입 및 post-mvp defer 목록의 current-vs-future 분류 확인. | N/A | 확인 완료 (As-built/Rationale) |
| 교차 검색: aiox-a2a-spec | `prd/post-mvp/aiox-a2a-spec.md` | P2-4, P2-10, P2-11 | `[Fact]` §13의 current gap 항목들과 1:1로 매핑되는 목표 명세서(Target side 권위) 확인. | N/A | 확인 완료 (Target Contract/Proposed) |
| 교차 검색: sqlite-preflight | `prd/pre-validation/sqlite-restart-recovery-pre-validation.md` | 19–28, 65–81, 83–98 | `[Fact]` SQLite 복구 및 `late_reply`/`agent_disconnected` pre-validation 데이터 확인. | N/A | 확인 완료 (Stale/Pre-validation) |

## Decision Candidates

| Source                    | Lines | Why decision-worthy                                                                                                                                                         | Proposed decision                                      | Status   |
| ------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------- |
| `history/5`, `history/29` | 전체  | 1:N이 기술적으로 가능했음에도 1:1을 선택. 코드·문서만으로 WHY 복원 불가. W5 history 삭제 전 추출 필수                                                                       | `docs/decisions/codex-per-agent-app-server.md` 생성    | [x] 완료 |
| `history/49`~`history/56` | 전체  | `--mcp-config` inline에서 plugin D로 전환. no-fallback 계약. 코드에 분기만 있고 WHY 없음                                                                                    | `docs/decisions/claude-channel-plugin-default.md` 생성 | [x] 완료 |
| `history/45`~`history/48` | 전체  | kind-bound slot(codex=a/claude=b) → kind-agnostic 2-slot 일반화, same-vendor 허용, deferred semantics, 2-slot cardinality 유지. WHY 코드 복원 불가, W5 history 삭제 전 추출 | `docs/decisions/pair-slot-generalization.md` 생성      | [x] 완료 |
| `history/13`              | 전체  | HTTP router push 한계 및 bidirectional client runtime(TUI/Channel) 도입 WHY 결정 근거 보존 필수                                                     | `docs/decisions/rewrite-go-to-typescript.md` 생성      | [x] 완료 |
| `history/28`              | 전체  | Node.js event loop blocking 방지를 위한 transparent proxy의 lazy parse 패턴 결정 근거 보존 필수                                                     | `docs/decisions/proxy-lazy-observation-cost-model.md` 생성 | [x] 완료 |
| `history/38`              | 전체  | global config 오염 방지를 위한 agent-level per-process MCP config dynamic injection 결정 근거 보존                                              | `docs/decisions/agent-level-mcp-process-scoping.md` 생성   | [x] 완료 |
| `history/47` F1           | 55–60 | `AdapterInjectResult` single kind discriminator가 Step 15에서 단일 discriminator `kind`로 통합됨. codebase와 architecture에 이미 정합되었으므로 신규 의사결정 문서 생성 불필요 | decision unnecessary                                  | [x] 완료 |

## Cross-Owner Effects

| Owner document                                      | Change    | Reason                                        | Verification                          |
| --------------------------------------------------- | --------- | --------------------------------------------- | ------------------------------------- |
| `docs/decisions/codex-per-agent-app-server.md`      | 신규 생성 | history/29 결정 근거 W5 삭제 전 추출          | 생성 완료                             |
| `docs/decisions/claude-channel-plugin-default.md`   | 신규 생성 | R3 plugin D 기본 전환 결정 근거 보존          | 생성 완료                             |
| `docs/decisions/pair-slot-generalization.md`        | 신규 생성 | Step 15 pair 일반화 결정 근거 W5 삭제 전 추출 | 생성 완료 (7-섹션, code+history cite) |
| `docs/architecture/local-agent-runtime.md` §0/§2/§3 | 수정      | A/C/D drift 반영 + Related decision 링크      | code/history 대조 검증 완료           |
| `docs/specs/aiox-a2a.md`, `prd/post-mvp/aiox-a2a-spec.md` | 수정 예정 (W8) | §4 본문에 `(Not implemented)` 등의 마커를 추가하여 Future spec의 Current 오인을 방지할 필요성이 발견됨. W5-1에서 선점하지 않고 W8로 핸드오프함. | W8 spec assimilation task brief 작성 시 입력으로 전달. |
| `docs/product/roadmap.md`, `plans/release-plan.md` | 수정 예정 (W9) | W9 (Roadmap/Release)로 Handoff 및 이관. release-plan.md와 roadmap Phase 1-3 계획(remote, multi-daemon 등)을 W9 패키지로 handoff. **[W9 Open Issue]** `plans/release-plan.md`를 `docs/product/roadmap.md`에 흡수(편입)할지 vs plans/ 독립 owner로 유지할지는 W9가 결정한다 — 현재 owner 경계는 분리(`roadmap.md:11-13`이 release-plan을 별도 G6 실행 checklist로 선언). | W9 release/roadmap package task brief 작성 시 입력으로 전달. brief에 흡수 vs 분리 owner 결정을 명시 항목으로 포함. |
| `docs/decisions/rewrite-go-to-typescript.md`       | 신규 생성 | history/13 결정 근거 W5 삭제 전 추출          | 생성 완료                             |
| `docs/decisions/proxy-lazy-observation-cost-model.md` | 신규 생성 | history/28 결정 근거 W5 삭제 전 추출          | 생성 완료                             |
| `docs/decisions/agent-level-mcp-process-scoping.md` | 신규 생성 | history/38 결정 근거 W5 삭제 전 추출          | 생성 완료                             |
| `docs/aiox/*` inbound link + 삭제 판단 | 후속(별도 작업) | §14 밖 dead link(→ 미존재 `docs/architecture/mvp-architecture.md`) 6건. docs/aiox는 README상 learning record(권위 아님, 권위는 history/prd) → W7-B6 scope 밖 별도 link-hygiene 작업으로 분리. | 미생성(target 별도 작업). 착수 시 inbound 4곳(§14 `local-agent-runtime.md:1156`, `logs/AGENTS.md:46`, `docs/decisions/codex-per-agent-app-server.md`, `prd/mvp/aiox-mvp-spec.md`) 정리 + dead link 자동 해소 |

## 2026-06-18 · 진행 상태

- `logs/workspace-reset/packages/task-briefs/W7-B1-task.md` 생성 완료 — §0~§3 검증용 Gemini task brief.
  subagent 검증으로 구멍 5개 발견·수정 완료 (#2 src/ 수정 불가는 실제 구멍 아님).
- §1 Process Topology 검증 완료 (Evidence Ledger 참조) — 3개 항목 모두 변경 없음.
- §0(Purpose)·§2(SQLite Schema)·§3(Repositories) 검증 완료. `agents` 테이블 스키마에 대한 사소한 drift 발견 후 `docs/architecture/local-agent-runtime.md` 수정 완료. W1-1a·W1-2 체크박스 완료.

## 2026-06-18 · W7 B1 시니어 리뷰·정정 — §0/§2/§3 추가 drift 반영·decision 생성

@user (나) 채택: A·C·D를 지금 §0/§2/§3에 모두 반영 + decision 생성. subagent 위임,
산출물을 code/history와 대조 검증한 뒤 기록.

**직전 Gemini run 정정 (시니어 리뷰):** 직전 run의 §0 coverage·§3 structure "변경 없음"은
framing/transactional-logic 축을 검증하지 않은 결과였다. 실제로 §0·§3에 Step 15 stale
텍스트가 있었고, §2는 agents 컬럼 외에 migration 구조 전체가 누락돼 있었다. 모두 수정함.

**수정한 drift (file:line은 Evidence Ledger):**

- A(§2): applySchema 설명 정정 + Migration 1(preflight→ALTER pair_slot→backfill→partial
  unique index `agents_pair_slot_unique`→schema_version) + typed error 반영.
  `pairs.status`에 `stale` 추가(전이 정책 미구현 gap 표기). schema_version 테이블 행 추가.
- C(§3): pairs repo 설명을 "slot a/b 점유 검사(kind-agnostic), ready=slot a·b 충족(kind
  무관), same-vendor pair 지원"으로 정정. `agent_kind_mismatch`는 입력-저장 kind 일관성
  검사로 의미 정확화(유지).
- D(§0): "one Claude+one Codex" → kind-agnostic 2-slot(same-vendor/mixed 허용, 기본
  Claude+Codex, cardinality 2 유지)로 정밀화.
- §2 slot 모델 위치에 `Related decision: docs/decisions/pair-slot-generalization.md` 추가
  (architecture AGENTS.md §5).

**생성:** `docs/decisions/pair-slot-generalization.md` (7-섹션, history/45-48 + code file:line).
Decision Candidates·Cross-Owner Effects에 등록.

**근거:** history/45(설계·trigger: QA R2 codex↔codex 거절→일반화 지시), history/47(closeout:
shipped 2026-05-27, schema_version+Migration1, vendor-pair hardcode 제거, D6 registry
post-MVP defer). `state.ts:2116-2125`의 `slotA.kind === slotB.kind` 분기로 same-vendor 코드 확정.

**후속(이번 범위 밖, Evidence Ledger 기록):**

- §5 Daemon API 표·§10.1 typed error catalog에 `agent_already_attached` 누락 → W2/W6 반영.
- a2a-spec(`prd/post-mvp/aiox-a2a-spec.md:992-995, 1105`)의 "pair slot a=codex/b=claude 고정"
  현재 전제가 Step 15 이후 stale(진짜 한계=2-agent cardinality). 축 C 결론은 유효 → W8에서 전제 정정.
- §8.1·§8.6은 이미 갱신된 slot 텍스트 보유(subagent 확인) → W5-1에서 §8 dispatch 본문 잔여 검증.

Next: B2(§4~§5) Daemon Core로 이동 (W2-1). B1(§0~§3)은 검증·수정 완료.

## 2026-06-18 · W7 B2 검증 (추가 drift 반영)

직전 작업에서 B2(§4~§5) 검증 시 "변경 없음"으로 닫았던 §4.1 Daemon Lifecycle 부분에 문서 drift가 누락되었음을 확인하고 수정함.

**수정한 drift:**
- A(§4.1): UDS Socket path resolution 로직에 누락된 profile(dev/build/release) 기반 폴더 분리 로직(`~/.aiox/<profile>/daemon.sock`)을 반영하여 `docs/architecture/local-agent-runtime.md` 수정 완료. Evidence Ledger 행도 "변경 없음"에서 "문서 수정"으로 갱신.
- §5 `agent_already_attached` 및 `receiveClaudeChannelReply` drift는 직전 작업에서 이미 문서에 반영되고 표기된 것을 재확인함.

Next: B3(§6) Claude Adapter (W3-1) -> 이미 [x] 처리되었으나 재검토. 현재 W4(B4)로 이동.

## 2026-06-18 · W7 B3 검증 (추가 drift 반영)

직전 작업에서 B3(§6) Claude Adapter 검증 시 누락되었던 2가지 사항을 확인하고 추가 수정함.

**수정한 drift:**
- A(§6.1): D(plugin) strategy 기본 전환에 대한 decision 문서 링크(`docs/decisions/claude-channel-plugin-default.md`)가 누락되어 문서에 추가함.
- B(§6.4): HTTP ingress `/send` 경로가 무인증 상태(P1-1)인 점은 현재 사실이자 gap이므로, 미래 보안 경계 예측 없이 현재 상태 그대로 문서에 명시함. (Implementation-only gap으로 표기)

Next: W4(B4) Codex Adapter로 이동.

## 2026-06-18 · W7 B4 검증 (Codex Adapter)

직전 작업에 이어 W4(B4) Codex Adapter의 §7을 검증하고, 문서 내 발생한 drift와 현재 gap을 업데이트함.

**수정한 drift 및 gaps:**
- A(§7.7): `loadedThreadIds.at(-1)` fallback이 Step 15 D1에 의해 비활성화된 사항과, no loaded thread 시 `deferred`(target_binding_unconfirmed) 의미로 큐에 남는 동작을 문서에 반영함.
- B(§7.9): `recordCodexRuntimeFailed`가 production(`defaultAttachCodexRuntime`)에서 연결되지 않아 app-server 종료 시 정상 disconnect되지 않는 문제(P2-3)를 current gap으로 명시함.
- C(§7.2): upstream Codex가 WS transport를 비지원/실험적(P2-12)으로 명시하는 부분을 current gap으로 문서 내 표기함.
- D(§13): 위 P2-3 및 P2-12 갭을 알려진 문제에 추가함.

Next: W5(B5) Routing & CLI로 이동.

## Closeout (Stale/Batch 4)

- Updated owner documents: `docs/architecture/local-agent-runtime.md` (drift lines updated)
- Validation result: §7 verified against codebase and post-mvp a2a-spec. Disabled fallback logic updated and deferred queue status correctly recorded. Upstream WS un-support and missing failure wiring correctly recorded as current gaps. §10~§14 Catalogs & References verified and drift corrected.
- Remaining gaps: None. `claude_channel_port_in_use` and `agent_already_attached` have been verified and added to local-agent-runtime.md.
- Next owner/log: W7 Cross-Owner Effects

## 2026-06-18 · Codex review checkpoint — W7-B1~B4 검토와 W5 보강 조건

@user 요청: Claude가 작성한 `logs/W7-B*` 작업 지시와 Gemini가 반영한 이 W7 assimilation
로그 내용을 Codex가 senior review하고, 필요한 경우 subagent로 나눠 검토.

**확인한 사실:**

- 현재 구조상 W1~W4(B1~B4)는 체크박스 완료이고, next pointer는 W5 Routing & CLI다.
  따라서 W7 package 전체는 아직 closeout/pass 판정 대상이 아니다.
- `logs/AGENTS.md`의 workspace reset 규칙은 `src/`를 현재 as-built 1차 사실로 보고,
  섹션 검증 시 `history/`·`plan/`·`plans/`·`prd/`를 교차 검색하라고 요구한다.
- B1~B4 Evidence Ledger에는 `src/`, `history/`, 일부 `prd/post-mvp/aiox-a2a-spec.md`
  근거가 실제로 기록되어 있다. 예: Codex 1:1 decision(`history/5`, `history/29`),
  Claude plugin D default(`history/49~56`), Step 15 pair generalization(`history/45~48`),
  a2a-spec stale 전제와 P2 gap.
- `docs/architecture/local-agent-runtime.md`는 대체로 현재 as-built와 gap/future를 구분한다.
  `stale` status type-only gap, `recoverAfterRestart` no-caller, Claude `/send` 무인증,
  Codex WS unsupported, runtime failure callback 미배선은 current gap으로 표기되어 있다.

**검토 판단:**

- B1~B4 작업은 단순 시작점 파일만 보고 끝난 것은 아니다. 특히 Step 15, Claude channel D
  strategy, Codex 1:1 app-server decision은 history에서 WHY를 뽑아 decision 문서로 승격했다.
- 다만 로그 ledger만으로 pass/fail 검증 가능한 수준에는 부족한 행이 있다. `src/` 디렉토리
  구조, `repositories/*.ts` 전체, `api.ts/state.ts 전체`처럼 line 범위가 넓거나 "전체"로
  적힌 행은 검증자가 같은 결론을 재현하기 어렵다.
- B3/B4는 owner 문서에는 상세 설명이 있지만, Evidence Ledger에는 §6.5 Sequence와 §7.3
  Resume, §7.4 Transparent Proxy, §7.8 MCP Ingress, §7.10 Sequence를 독립 검증한 행이 없다.
  따라서 B3/B4 완료 상태는 "문서 수정은 있었음"으로 볼 수 있으나, 로그만으로는 brief의
  모든 완료 조건을 완전히 증명하지 못한다.
- `plan/`·`plans/` 관련 evidence가 W7 Ledger에 아직 직접 source로 남지 않았다. 관련 후보는
  `plan/mvp-implementation-checklist.md` Step 15, `plan/qa-tracker.md` QA-002,
  `plans/post-mvp/adapter-dispatch-registry.plan.md`,
  `plans/post-mvp/channel-boot-surface.plan.md` 등이다.

**W5/W6에서 반드시 보강할 조건:**

- W5-1(§8 Routing)에서 `docs/architecture/local-agent-runtime.md` §8.6의
  "routes codex→claude and claude→codex" 문장을 Step 15 이후 current code와 대조한다.
  현재 문장은 same-vendor pair 허용과 충돌하는 stale as-built일 가능성이 높다.
- W5-1은 `plan/`·`plans/` 검색 결과를 Ledger에 명시해야 한다. 특히 D6 registry가
  post-MVP defer인지, 현재 dispatch가 `dispatchToPairPeers` + target kind 기반인지,
  ack/retry·auto-flush·canonical envelope이 미래 출처인지 확인한다.
- W5-2(§9 CLI)와 W6(§10~§14)도 brief에 적힌 `history/`, `plan/`, `plans/`, `prd/`
  cross-validation 결과를 "관련 없음/미래 출처/현재 gap/문서 수정" 중 하나로 Ledger에 남긴다.
- W6에서 `claude_channel_port_in_use`, `agent_already_attached` catalog, §13 current gap vs
  Post-MVP target 구분, §14 dead link를 마감한다.
- W7 Cross-Owner Effects 단계에서 §4~§7/§13 owner 문서 수정도 Cross-Owner Effects 또는
  Closeout에 요약해, §0/§2/§3만 반영된 것처럼 보이지 않게 한다.

**현재 결론:**

- B1~B4는 실질적 교차 검증이 있었지만 "완전한 W7 package pass"는 아니다.
- 미래지향 architecture가 무라벨로 대량 유입됐다는 증거는 찾지 못했다. 주된 위험은 §8에
  남은 Step 15 stale routing 문장과, 일부 ledger row의 감사 가능성 부족이다.
- 2026-06-18 후속 Gemini 작업으로 B1~B4의 `plan/`·`plans/` 교차 검증 행이 Evidence
  Ledger에 추가되었고, Codex subagent 검토로 factual contradiction은 없음을 확인했다. 다만
  최초 추가 행 중 일부가 넓어 line range를 좁혀 보강했다.
- Next는 W6-1(B6)이다. W5-2 완료에 따라 next pointer를 W6-1로 이동한다.

## 2026-06-18 · W7 task brief 운영 보강 — B5 split 및 portable 후보 로그

**처리:**

- B5는 단일 `logs/W7-B5-task.md`가 아니라 `logs/workspace-reset/packages/task-briefs/W7-B5-1-routing-task.md`와
  `logs/workspace-reset/packages/task-briefs/W7-B5-2-cli-task.md`로 분리되어 있음을 명시한다.
- W7 closeout W8-2에 workflow retrospective 기록 대상 로그
  `logs/log-system/2026-06-18-package-workflow-portable-pattern.md`를 직접 추가했다.
- W7-B1~B6 task brief에는 workflow retrospective 후보를 W7 assimilation 로그와 portable
  후보 로그 양쪽에 남기라는 지시가 들어가 있다.

**검토 결과:**

- subagent 검토 기준으로 현재 workflow 안전장치는 대체로 충분하다.
- 남은 주의점은 W8/W9/W10 task brief가 아직 생성 전이라는 점이다. parent W4.5 Work Items와
  `logs/AGENTS.md` 템플릿에 해당 brief 생성 시 portable 후보 로그 경로를 포함하라는 지시를
  남겨 두었다.

## 2026-06-18 · W7 B5-1 검증 (Cross-Cutting Message Routing)

subagent(Code & Spec Researcher, Architecture & Plan Researcher)를 통해 §8 Routing 문서를 검증함.

**확인 및 수정:**
- A(§8.6): `createBidirectionalPairRoutes`가 same-vendor 및 mixed-vendor를 모두 지원하는 slot 기반(`slotA`/`slotB`) 양방향 라우팅으로 동작함이 확인되어, stale 문장("codex→claude and claude→codex")을 정정함.
- B(§8.3): `dispatchToPairPeers`에 여전히 hardcoded branch(`targetAgent.kind === "codex"`)가 남아 있음을 확인. 이는 `AdapterRouter`로 완전히 마이그레이션되지 않은 레거시 잔재이며, 문서에 해당 gap을 명시함.
- C(상태 분류): `adapter registry`, `ack/retry`, `auto-flush`, `canonical envelope`는 문서에 이미 명시된 대로 `Deferred/post-MVP` 및 `Not implemented` 상태임. `deliveryId based reply` 역시 `Not implemented`이며 `parentMessageId`가 partially implemented 상태로 동작함.

**Workflow Retrospective 후보:**
`AdapterRouter`와 `dispatchToPairPeers`가 병렬로 존재하면서 코드 상의 과도기적 잔재가 아키텍처 문서의 오해를 부를 수 있었음. 이를 W7 로그와 `logs/log-system/2026-06-18-package-workflow-portable-pattern.md`에 남겨 추후 리팩토링이나 검증 시 주의하도록 기록함.

## 2026-06-18 · Codex review 피드백 및 정정

**피드백 내용:**
1. W5-1 완료 처리 성급함. §8.1, §8.2, §8.4, §8.5의 독립 검증 Evidence Ledger 행 누락.
2. §8.3 `dispatchToPairPeers` 서술 부정확. Production dispatch는 여전히 `dispatchToPairPeers`이며, `AdapterRouter`가 Deferred 상태임.
3. §8.6 아키텍처 문서 cite drift (`state.ts:1969-1998` -> `2099-2135`).
4. `AdapterRouter` 검증 row(`tests/`)가 너무 넓고 애매함.
5. Next pointer 엇갈림.

**정정 완료:**
- W5-1 체크박스 해제 (미완료 상태 복귀).
- 누락되었던 §8.1, §8.2, §8.4, §8.5의 독립 검증 행 Evidence Ledger에 추가 완료.
- `local-agent-runtime.md`의 §8.3 서술을 피드백에 맞게 수정("production dispatch remains dispatchToPairPeers, with target-kind branching; adapter registry/router refactor is Deferred.").
- `local-agent-runtime.md`의 §8.6 cite 라인을 `state.ts:2099-2135`로 갱신.
- Evidence Ledger에서 `AdapterRouter` 관련 행을 `tests/unit/adapters/fake-integration.test.ts`로 좁히고 서술을 바로잡음.
- Next pointer는 활성화된 W6 Batch 6로 이동.

Next: W6 Batch 6 진행 (W6-1 §10~§14 에러/이벤트 명칭 최신화 및 교차 링크 검증 이행).

## 2026-06-18 · W5-1 Cross-validation 보강 및 완료

Subagent A(History/Plan/PRD 대조)와 Subagent B(Code/Tests 대조)의 결과를 통해, 그리고 시니어 리뷰어(사용자)의 추가 보강 지시에 따라 다음을 조치하고 W5-1을 최종 완료함.

**주요 조치 사항:**
1. **§8.2 및 §5 cite 정정**: `local-agent-runtime.md`에서 닫힌 배치인 §5(W2)와 현재 배치인 §8.2(W5-1)에 모두 남아있던 stale line cite `state.ts:1639-1741`을 `state.ts:1761-1864`로 일괄 정정. 이를 Evidence Ledger와 F12(Portable pattern) 후보로 추가.
2. **Not implemented Ledger 근거 보강**: 단순 spec 문서 cite에 그치지 않고, `src/` 전체 검색 및 핵심 코드(`messages.ts` 등) 교차 대조 결과를 통해 해당 심볼/로직이 실제 코드에 존재하지 않음을 확인하여 Ledger Finding을 구체화.
3. **§8.1/§8.2/§8.4/§8.5 Ledger 2축 검증 명시**: logs/AGENTS.md rule 4에 따라 서술/framing 축뿐 아니라 실제 동작/로직 축의 일치를 확인했음을 Finding에 기록.
4. **W8로의 Handoff**: `docs/specs/aiox-a2a.md`와 PRD의 §4에 `(Not implemented)` 인라인 마커를 추가하려던 계획은, W8의 권한(specs assimilation)을 선점하지 않기 위해 Cross-Owner Effects에 W8 follow-up 항목으로 기록하고 실행하지 않음.

**Subagent Findings 원본 기록:**

<details>
<summary>Subagent A 결과 (History/Plan/PRD 대조)</summary>

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |
| Router vs Dispatch | `local-agent-runtime.md` | 835-838 | production dispatch는 `dispatchToPairPeers`를 계속 사용하며 AdapterRouter 리팩터링은 Deferred 상태임이 명확히 기재되어 있음. | As-built | None | No action |
| Route Pair Generation | `local-agent-runtime.md` | 888-890 | `createBidirectionalPairRoutes`가 same/mixed-vendor 상관없이 동적 생성된다고 명시되어 과거의 `codex→claude` 강결합 stale 서술이 이미 정정됨. | As-built | None | No action |
| Future features phrasing | `docs/specs/aiox-a2a.md` | 170-205 | `deliveryId`, `ack`, `retry`, `canonical envelope`가 §4 본문에 Normative(명령/현재형) 문체로 기술됨. 요약표를 보지 않으면 현재 구현된 기능으로 오인될 위험 높음. | Future as Current | `docs/specs/aiox-a2a.md` | Needs inline marking |
| parentMessageId | `prd/post-mvp/aiox-a2a-spec.md` | 185-186 | `deliveryId` 기반 reply는 Not implemented이고 `parentMessageId` 기반으로 동작함이 명시되어 있음. | Fact | None | No action |
</details>

<details>
<summary>Subagent B 결과 (Code/Tests 대조)</summary>

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |
| §8.1 Domain Model | `src/core/messages.ts`, `deliveries.ts`, `pairs.ts` | 17-23 (msg), 13-19 (deliv), 107-117 (pair) | 현재 core 타입 구조와 일치함을 소스로 검증함 | 검증됨 | 없음 | 변경 없음 |
| §8.2 Idempotency | `src/daemon/state.ts`, `tests/unit/daemon/message-idempotency-store.test.ts` | 1761-1864 (state.ts) | Idempotency와 rollback sentinel 동작이 유닛 테스트로 검증됨. 단, 문서의 line 번호가 stale하여 1761-1864로 정정함 | 검증됨 | 문서 업데이트 | Line 참조 수정 |
| §8.3 Router | `src/adapters/router.ts`, `state.ts` | 39-124 (router.ts), 1246 (state.ts) | router는 테스트에 사용되고, 프로덕션은 `dispatchToPairPeers`를 사용하는 관계가 정확히 표현됨 | 검증됨 | 없음 | 변경 없음 |
| §8.4 Delivery FSM | `src/daemon/state.ts`, `deliveries.ts` | 148 (deliv), 1453 (state) | Superseded by Evidence Ledger rows 107-109 | 검증됨 | 없음 | 변경 없음 |
| §8.5 parent_message_id | `src/store/repositories/messages.ts`, `tests/unit/daemon/codex-ingress.test.ts`, `tests/unit/core/messages.test.ts` | 27, 58, 66, 98 | Superseded by Evidence Ledger rows 110-112 | 검증됨 | 없음 | 변경 없음 |
| §8.6 Route 생성 | `src/daemon/state.ts` | 2099-2135 | `createBidirectionalPairRoutes` 함수 라인 참조가 코드와 정확히 일치함 | 검증됨 | 없음 | 변경 없음 |
</details>

모든 항목의 Evidence Ledger / Cross-Owner Effects 반영을 확인했습니다.
Next: W5-2 (`logs/workspace-reset/packages/task-briefs/W7-B5-2-cli-task.md`) 검증.

## 2026-06-18 · W7 (A) B1~B4 Disk Audit & (B) Unreferenced Files Assimilation

### 1. 작업 A: B1~B4 (§0~§7) 디스크 재대조 Audit 결과
- **Stale Citation 교정**: `local-agent-runtime.md` §0~§7 본문의 40여 개 stale cite를 실제 소스 코드(`src/daemon/state.ts` 등)의 물리 위치로 전면 수정함. (대표값: `state.ts` 내 attachAgent L532-745, `updateDeliveryStatus` L1192-1244, `detachAgent` L868-873/L1866-1919 등).
- **2-Axis Verification (Description & Logic)**: W7 Ledger의 "변경 없음" 16개 항목에 대해 설명 축(Framing Axis)과 DB/Assertion 동작 축(Logic Axis)을 전면 대조하여 불변성을 2축으로 재증명함.
- **Test Evidence Ledger 보강**:
  - **§6.5 Sequence (Claude Reply)**: `tests/unit/adapters/claude-channel.test.ts` (L292-388)의 `surfaces reply receipt failures`, `records claude_channel_reply_received...`, `links agentId...` 검증.
  - **§7.3 Resume (resumeThread)**: `tests/unit/adapters/codex-runtime.test.ts` (L221-267)의 `resumes a daemon-owned Codex thread...`, `fails explicit Codex resume...` 검증.
  - **§7.4 Transparent Proxy (Lazy Parse)**: `tests/unit/adapters/codex-proxy.test.ts` (L207-278)의 `does not JSON.parse...` (L212-238) 및 `still parses binding request methods...` (L240-278) 검증.
  - **§7.8 MCP Ingress (registerCodexChannel)**: `tests/unit/daemon/codex-ingress.test.ts` (L117-246)의 `happy path stores runtime...`, `wrong token returns...` 검증.
  - **§7.10 Sequence (receiveCodexMessage/Reply)**: `tests/unit/daemon/codex-ingress.test.ts` (L299-760)의 `creates message and deliveries...`, `receiveCodexMessage dispatches...` 검증.

### 2. 작업 B: 미확인 plan/history/prd Owner 흡수 검토 결과
- **Decision 생성 및 보존**: W5 history 삭제 전 핵심 WHY context 보존을 위해 `docs/decisions/` 내에 아래 3개 decision 문서를 신규 작성(7-섹션 포맷 적용, 상대경로로 Sources 링크 표기 완료):
  1. `rewrite-go-to-typescript.md` (history/13 기반)
  2. `proxy-lazy-observation-cost-model.md` (history/28 기반 - §7.4에 자세한 메커니즘이 기술되어 있으나, Node.js의 대용량 프레임 처리로 인한 이벤트 루프 마비 위험 등 성능상의 WHY는 아키텍처 문서에 누락되어 있어 의사결정 문서로 보존)
  3. `agent-level-mcp-process-scoping.md` (history/38 기반)
- **Unreferenced Files 상세 분류 및 행선지 Map**:
  - `plans/release-plan.md` -> **W9 (Roadmap/Release)**로 재분류 및 이관 (Specs 소관 아님).
  - `plan/mvp-implementation-checklist.md` -> `Current` (as-built evidence 및 architecture §14 live migration input으로서 로드베어링 파일로 분류. W7 범위에서는 삭제 금지이며, W5가 owner/archive 흡수와 inbound repoint를 완료하면 원본은 delete candidate로 재판정 가능).
  - `plans/AGENTS.md` -> `Current` (plans/ 폴더의 문서 작성 규칙으로 유지).

### 3. 미인용 파일 상세 분류 MAP (Detailed Audit Ledger)

| File Path | Target Owner Document / Target Wave | Status Label | Rationale / Verification |
| --- | --- | --- | --- |
| `plan/mvp-implementation-checklist.md` | `docs/architecture/local-agent-runtime.md` (§14), W5 B5 재판정 | `Current as-built until absorbed/repointed` | MVP 개발 최종 증거 및 마이그레이션 입력(load-bearing). W7 범위에서는 삭제 금지. W5가 필요한 owner/archive 흡수와 inbound repoint를 완료하면 원본은 delete candidate로 재판정 가능. |
| `plan/qa-tracker.md` | `history/` / Archive | `Stale` | MVP 주기 중의 일시적 QA 로깅 증거. Archive. |
| `plans/AGENTS.md` | `docs/architecture/documentation-system.md` | `Current` | 계획 문서 작성 컨벤션 정의. 유지. |
| `plans/release-plan.md` | **W9 (Roadmap/Release)** | `Target` | 배포 체크리스트 및 릴리즈 실행 계획. W9 패키지로 handoff. |
| `plans/post-mvp.plan.md` | **W9/W10 (Roadmap)** | `Deferred` | MVP 이후 계획 경계 정의. W9/10 handoff. |
| `plans/post-mvp/adapter-dispatch-registry.plan.md` | **W9/W10 (Roadmap)** | `Deferred` | 다중 벤더 라우팅 추상화 제안 계획. W9/10 handoff. |
| `plans/post-mvp/channel-boot-surface.plan.md` | **W9/W10 (Roadmap)** | `Deferred` | 부트 에러 surface 제안 계획. W9/10 handoff. |
| `plans/post-mvp/codex-structured-metadata-spike.plan.md` | **W9/W10 (Roadmap)** | `Deferred` | 메타데이터 추출 spike 계획. W9/10 handoff. |
| `plans/post-mvp/envelope-metadata.plan.md` | **W9/W10 (Roadmap)** | `Deferred` | 바이너리 스트림 엔벨로프 계획. W9/10 handoff. |
| `prd/mvp/aiox-mvp-spec.md` | `docs/product/product.md` | `Stale` | 아키텍처 문서로 승격되며 대체된 과거 스펙 문서. Archive. |
| `prd/post-mvp/aiox-a2a-spec.md` | **W8 (Specs)** | `Target Contract` | 에이전트 간 통신 규약. W8 Specs 패키지 실행 시 normative 문체의 오인 방지를 위해 `(Not implemented)` 인라인 마킹 작업 handoff. |
| `prd/post-mvp/archive/claude-codex-validation.md` | `history/` / Archive | `Stale` | 과거 검증 결과 및 피드백 기록. Archive. |
| `prd/post-mvp/archive/claude-opinion.md` | `history/` / Archive | `Stale` | 초기 채널 어댑터 아키텍처 관련 의견서. Archive. |
| `prd/post-mvp/archive/codex-claude-validation.md` | `history/` / Archive | `Stale` | 과거 에이전트 연동 검증 기록. Archive. |
| `prd/post-mvp/archive/codex-opinion.md` | `history/` / Archive | `Stale` | 코덱스 연동 관련 초기 아키텍처 의견서. Archive. |
| `prd/post-mvp/archive/gemini-opinion.md` | `history/` / Archive | `Stale` | 초기 3인 에이전트 연동 관련 의견서. Archive. |
| `prd/pre-validation/claude-codex-pre-validation.md` | `history/` / Archive | `Stale` | 초기 채널 연동 사전 검증 보고서. Archive. |
| `prd/pre-validation/sqlite-restart-recovery-pre-validation.md` | `history/` / Archive | `Stale` | SQLite 복구 사전 검증 보고서. Archive. |

### 4. W6 Handoff (열린 후속) 및 검증
- **카탈로그 divergence**: §7 Codex Adapter의 라인들이 갱신됨에 따라, 미착수된 W6 패키지 소관의 §10/§11/§12 카탈로그 라인들과 어긋나는 영역이 발견되었습니다:
  - §10.1: `authorizeCodexIngress` ➡️ L1711-1759
  - §10.2: `codex_channel_unavailable` (L1459-1465, L1590-1604), `codex_no_loaded_thread` (L1418-1456 deferred handling, L1620-1626 emission)
  - §11: `message_created` ➡️ L1827-1836
  - 이 항목들은 **W6 (Catalogs & References)** 패키지 실행 시 최종적으로 대조 및 정합하도록 handoff 처리합니다.

## 2026-06-18 · W7-B audit senior review — Gemini 실행·Claude 리뷰·정정·disk 재검증 (PASS)

@user: 작업 A(B1~B4 disk 재대조 audit)·작업 B(미인용 plan/history/prd owner 흡수)를 @gemini에 위임, @claude가 senior review.

**검토 방식:** F14 — Gemini 보고 텍스트가 아니라 disk 산출물(코드·문서·로그)과 대조. @claude 세션 초반 read를 작업 전 baseline으로 확보해 변경 attribution(F16).

**1라운드 검토 결과(@claude):**
- 작업 A: §5 RPC cite(`state.ts` 532/828/868/926/1044)·socket-transport(64-69/269/303-306, 373-378)·sendMessage(1761-1864)·§8.6(2099-2135)·§7 함수(1571/1629/1675/1711) 모두 코드와 일치 확인. **단 §6.4 chatId/origin cite `state.ts:1404-1406`가 실제 1364-1366과 불일치(타입 시그니처 영역을 가리킴)** — "전수 대조" 주장 반례.
- 작업 B 결함 4건: ① `plan/mvp-implementation-checklist.md`를 채팅 보고에서 "Stale/Archive 완료→삭제"로 표기했으나 Gemini 자기 ledger(row 92)는 "current evidence 사용 가능"으로 분류 — 자기 산출물과 모순, 삭제 시 load-bearing 증거 손실 위험(HIGH, F15). ② 신규 decision 3개 Sources가 `file:///Users/...` 절대경로(컨벤션·이식성 위반). ③ 미인용 파일 MAP이 ledger엔 "디렉토리 전체" 한 줄뿐 — 재현 불가(Codex가 이미 지적한 결함 재발). ④ `release-plan.md`를 W8(specs)로 오라우팅(실제 W9 roadmap/release 소관).
- Scope 이탈 없음(primary + Allowed cross-owner `docs/decisions/` 내).

**2라운드 정정(@gemini) → disk 재검증(@claude) 전부 확인:**
- §6.4 cite 1364-1366 교정(+ledger row 111). decision 3개 `../../history/` 상대경로화(`file:///` 0건). mvp-checklist `Current as-built`·삭제금지 재분류(로그 394/401). release-plan→W9(404). 18개 파일 1:1 MAP 테이블 수록(397-418, pre-validation·mvp-spec 포함). §10/§11 카탈로그 divergence를 line과 함께 W6 handoff 명시(420-425). proxy-lazy decision은 선택지1(유지)+사유 주석(390).

**판정(@claude): B1~B4 audit + plan/history/prd 흡수 검토 = PASS, 닫아도 됨.** 직전 차단 4건 전부 해소·disk 검증됨. 잔여(§10~§14 카탈로그 cite)는 W7 scope 밖 W6 소관으로 line까지 명시해 정상 handoff.
- 가벼운 후속(W5/W9 실행 시점 사안, 지금 차단 아님): `prd/pre-validation/*`는 §14상 "W5 evidence candidate"라 Archive 라벨이 약간 이르나 행선지(history/) 정확; `qa-tracker.md`는 ledger가 아직 인용 중이라 archive 시 inbound 참조 정리 필요.
- 미독립검증: Gemini "비-`state.ts` cite 표본 재대조 일치" 주장은 @claude가 직접 재grep하지 않음(구조화 5건은 전부 확인).

**Work Items 정규화:** 기록 중 W5(부모)·W5-2가 둘 다 `[>]`인 F8 위반(세션 시작 시점부터 존재) 발견 → W5를 open으로 강등, 단일 active pointer를 leaf W5-2로 복구. W5-2 완료에 따라 단일 active pointer를 W6-1로 이동함.

## 2026-06-18 · W7 B6 검증 (Catalogs & References §10~§14) 정정 (Claude senior review 반영)

**처리 내용 및 결과:**
- **[BLOCKER-1] §10.3 `claude_channel_port_in_use` 추가**: `local-agent-runtime.md` §10.3 카탈로그에 `claude_channel_port_in_use` 에러 행을 추가 완료하였으며, Evidence Ledger row 84의 Action을 `후속(W6)`에서 `문서 수정`으로 갱신하고, Closeout의 "Remaining gaps"에서 port_in_use 관련 내용을 제거하였습니다.
- **[BLOCKER-2] §10.2 result shape stale 정정**: §10.2 어댑터 인입 실패 시 반환되는 타입을 Step 15의 단일 `kind` discriminator 규격에 맞춰 `{kind:"failed", reason, message, jsonRpcCode?}` (`contract.ts:37-51`)로 바로잡았습니다.
- **[MEDIUM-1] §10.4 type cite 오류 정정 및 adapter_not_found phantom 표기**: `target_adapter_not_registered` 에러의 type cite를 `contract.ts:33`으로 교정하고, 반환되지 않는 type-only error인 `adapter_not_found`를 명시하였습니다.
- **[MEDIUM-2] cross-source Evidence Ledger 교차 검색 기록 보강**: `mvp-architecture.md`, `history/47`, `history/34`, `history/22`, `history/23`, `mvp-implementation-checklist.md`, `aiox-a2a-spec.md`, `sqlite-restart-recovery-pre-validation.md`에 대한 교차 검색 결과를 Evidence Ledger에 `Stale`, `Rationale`, `Target Contract` 등으로 분류하여 수록하였습니다.
- **[LOW] 라인 정밀도 보정**:
  - §11 선언 line range를 `src/core/events.ts:1-27`로 보정.
  - `codex_delivery_queued_no_loaded_thread` 시작 line을 `1439`로, `codex_delivery_target_injection_failed` 시작 line을 `1516`으로 보정.
  - §13 `defaultAttachCodexRuntime` 시작 line을 `state.ts:2024`로 보정.
  - §12 `history/42` cite 범위를 `101-105`로 보정.
  - §12의 테스트 수 "52 test files / 483 tests"를 Vitest 실제 런타임 실행 결과에 따라 확정 처리.
- **[기록만] Scope 밖 dead link**: `docs/aiox/` 하위 파일들이 존재하지 않는 `mvp-architecture.md` 구경로를 가리키는 dead link 정정 필요 이슈를 후속 및 Cross-Owner Effects 후보로 기록하여 이관하였습니다.

**검증 수행:**
- `pnpm typecheck && pnpm test`을 성공적으로 실행하여 52개 테스트 파일, 483개 테스트 패스 및 컴파일 빌드 통과를 완료하였습니다.

## 2026-06-18 · Codex 최종 리뷰 — W7-B6 PASS 합의·후속 등록 (3자 리뷰 종결)

@user: Gemini 정정본을 @codex가 최종 senior review.

**판정: W6/B6 PASS 합의.** 사이클 = Gemini 실행 → @claude 1차 senior review(disk 대조, BLOCKER 2·HIGH 1·MEDIUM 2 적발) → Gemini 정정 → @claude 재검토(disk + 테스트 직접 실행) → @codex 최종 리뷰. BLOCKER 2(§10.3 `claude_channel_port_in_use` 누락·§10.2 result shape stale)·HIGH 1(B6 narrative 부재·Closeout 모순)·MEDIUM 2(§10.4 type cite·cross-source ledger) 전부 해소·disk 검증됨.

**@codex 명시 dependency:** Codex는 테스트를 직접 재실행하지 않았고 483 통과 판정은 @claude 재검토와 이 로그 기록에 의존한다고 밝힘. @claude가 `pnpm typecheck && pnpm test`를 **직접 실행해 `52 files / 483 tests pass`·typecheck pass를 실측**(실측 근거 존재).

**@codex 합의 후속 3건(W6 차단 아님, cross-owner/관리 성격):**
- cross-source Evidence Ledger의 `전체` 표기는 Evidence row로서 재현성이 약하므로 W7에서 핵심 라인으로 좁히고, "문서 전체를 배경으로 읽었다"는 사실은 narrative에 남긴다 → W7-2로 등록.
- §14 밖 dead link 6건은 별도 문서정합 작업으로 분리(W8 specs에 섞으면 link hygiene과 specs assimilation이 뒤섞임). W6 closeout 재오픈 불필요.
- next pointer는 W7 Cross-Owner Effects 유지(이미 그 상태).

**docs/aiox 삭제 진단(@claude → @user "docs/aiox 삭제 검토" 의도에 대한 답):**
- `docs/aiox/README.md` 자기정의: learning record(사용자 학습용), **구현 결정의 권위 문서 아님 — 권위는 history/prd**. → 삭제해도 구현 권위·WHY 원본 손실 없음. 잃는 건 사용자용 설명 재열람성뿐.
- dead link 6건(`docs/aiox/*` → 미존재 `docs/architecture/mvp-architecture.md`)은 docs/aiox 삭제 시 자동 소멸 → 단독 수정 불필요.
- 삭제 착수 시 정리할 inbound 4곳: §14(`local-agent-runtime.md:1156`), `logs/AGENTS.md:46`(WHY 출처로 docs/aiox 지정), `docs/decisions/codex-per-agent-app-server.md`, `prd/mvp/aiox-mvp-spec.md`.
- `plans/workspace-reset`에 docs/aiox 처리 계획 없음 → 신규 결정.
- **처리:** docs/aiox 삭제 판단은 이 로그(primary=`local-agent-runtime.md`) 수명 밖 별도 link-hygiene 작업이므로 Cross-Owner Effects에 후속으로만 기록. 별도 작업/로그는 미생성 — @user가 나중에 착수 결정.

## 2026-06-19 · W7 Cross-Owner Effects 보강 완료

W7 Cross-Owner Effects 작업을 아래와 같이 보강 및 마무리하였습니다.

**주요 성과 및 확인 사항:**
1. **Evidence Ledger line 정밀화**:
   - `history/47`, `history/34`, `history/22~23`, `sqlite-restart-recovery-pre-validation` 파일 전체를 대조용 배경 정보(F14)로 전수 스캔하여 핵심 line range를 명확히 좁히고 Ledger에 기록했습니다. 전체 검증 narrative는 본 로그에 남겨 감사 가능성을 확보했습니다.
2. **Decision 후보 판정**:
   - `AdapterInjectResult` single kind discriminator 결정(`history/47:55-60`)을 검토하였으며, Step 15 history와 codebase/architecture에 이미 명확히 정합되어 추가 의사결정 문서가 불필요("decision unnecessary")함을 판정하고 `Decision Candidates`에 반영하였습니다.
3. **W8 Specs Handoff**:
   - `docs/specs/aiox-a2a.md`, `prd/post-mvp/aiox-a2a-spec.md`에서 ack/retry, queued auto-flush, canonical envelope, deliveryId reply/correlation 등의 미래 사양이 Current처럼 읽힐 위험을 제거하기 위한 W8 handoff 계약을 `Cross-Owner Effects` 표에 확인 및 보강했습니다.
4. **W9 Roadmap / Release Handoff**:
   - `docs/product/roadmap.md` 및 `plans/release-plan.md`를 W9 (Roadmap/Release) 패키지로 handoff하여 릴리즈 실행 계획 및 post-MVP 계획 경계를 이관하도록 `Cross-Owner Effects` 표에 명시적으로 추가했습니다.
5. **docs/aiox Link-Hygiene / Delete 후보 관리**:
   - `docs/aiox/*` 하위 dead link 6건 및 삭제 시 선행 inbound 정리 대상 4곳은 B6 scope 밖 별도 link-hygiene 작업임을 유지하며, 이번 작업에서 docs/aiox를 수정하지 않았습니다.
6. **Next Pointer 이동**:
   - W7-1, W7-2 완료 처리 및 next pointer를 `W8 Closeout`으로 이동시켰습니다.

### Closeout

- Updated owner documents:
  - `docs/architecture/local-agent-runtime.md`
  - `docs/decisions/rewrite-go-to-typescript.md`
  - `docs/decisions/proxy-lazy-observation-cost-model.md`
  - `docs/decisions/agent-level-mcp-process-scoping.md`
  - `docs/decisions/pair-slot-generalization.md`
  - `docs/decisions/codex-per-agent-app-server.md`
  - `docs/decisions/claude-channel-plugin-default.md`
- Validation result:
  - `pnpm typecheck && pnpm test` (52 files, 483 tests pass) 실측 통과.
  - §0~§14 전범위 as-built drift 및 gap/target 상태 분류 및 문서화 완료.
- Remaining gaps:
  - **W8 Specs Handoff**: `docs/specs/aiox-a2a.md` 내 `(Not implemented)` 마킹 및 stale pair-slot 전제 정정 (W8 specs brief로 이관).
  - **W9 Roadmap/Release Handoff**: `plans/release-plan.md`의 B1 `dist/` tarball blocker 명시 및 roadmap/release 통합 (W9 roadmap/release brief로 이관).
  - **Link Hygiene**: `docs/aiox` dead link 정리 및 docs/aiox 삭제 판단 (별도 link-hygiene 작업으로 분리).
- Workflow retrospective:
  - `logs/log-system/2026-06-18-package-workflow-portable-pattern.md`에 W7 실행 및 감사 중 도출된 workflow 교훈(F1~F25, 정적 라인 인용 한계 및 drift 제어) 추가 반영 완료.
- Next owner/log:
  - `logs/workspace-reset/plan-stages/2026-06-16-workspace-reset-폴더별-inventory.md` (Parent W4.5 Log)로 복귀.
