# 서버 대규모 마이그레이션을 위한 추가 라이브러리 조사

2026-09-25 후속 판정: Drizzle Effect SQLite·XState 5·chokidar 5·fast-check 4는 이후 서버에 적용됐다.
TanStack DB/React DB는 Web 의존성 추가까지 완료했으며 실제 RPC 동기화 연결은 W10의 후속 작업이다.
OpenTelemetry·Toxiproxy·Execa·Workflow·Automerge는 이번에 채택하지 않았다. 아래 후보 평가는 조사
당시 근거로 보존하며 현재 설치 여부를 나타내지 않는다. 실행 구조는
[vendor bindings](../../docs/architecture/aiox-vendor-bindings.md), 전달 계약은
[Application RPC](../../docs/specs/aiox-application-rpc.md)를 따른다. 클라이언트의 활성 pane·선택 탭을
서버 상태 컬렉션에 되넣지 않는다. 이는 React 앱 메모리 전용이며 새로고침 때 초기화된다.

2026-09-25. [Stage6 Web W10](../2026-09-09-AIOX-TUI-Stage6-Web.md)의 서버 전환 논의를 지원하는 조사 자료이다. [앞선 Effect v4 조사](2026-09-25-Effect-v4-Ecosystem-Research.md)를 보완한다. 채택 확정 명세나 마이그레이션 완료 보고가 아니다.

## 요청과 조사 범위

사용자는 대규모 Effect·WS 마이그레이션 전에 Effect 외 필요한 라이브러리를 서브에이전트에게 조사하도록 요청했고, 서브에이전트에게 ponytail 스킬을 사용하지 말라고 명시했다. 세 조사에는 해당 스킬 사용을 지시하지 않았으며 호출하지 않도록 전달했다. 의존성 수나 최소 diff보다 기존 책임을 실제로 대체하는지, 초기 비용과 장기 구조·검증 이득을 비교하도록 했다.

- 상태·통신 담당: 현재 상태/낙관적 UI/관계 query/DB 통합.
- 프로세스·adapter 담당: 파일 관측/JSONL/프로세스 실행·종료/재부착 경계.
- 검증·관측 담당: 불변식/통신 장애/실제 PTY/trace correlation.
- 주 에이전트 추가 조사: XState 순수 상태 전이, DBOS TypeScript 저장 경계, 기존 의존성 대조.

프로젝트 설치·제품 코드 변경은 하지 않았다. 새 Drizzle RC 조합만 별도 /tmp에 설치해 검증했다. 아래에서 공식 기능 확인, 서브에이전트 실행 검증, 제안을 구분한다. 모든 후보를 설치하자는 결론이 아니다.

## 1. 우선순위 판단

| 대상 | 판단 | 담당시킬 책임 |
| --- | --- | --- |
| Drizzle의 Effect SQLite backend | 우선 검토, 새 RC 조합 실험 통과 | 기존 schema·typed query를 유지하며 실제 연결·transaction을 Effect SQL에 통합 |
| chokidar 5 | 서버 도입 후보 | 파일 교체·삭제·재생성의 관측 이벤트 정규화 |
| fast-check 4 | 마이그레이션 검증에 우선 도입 후보 | 명령·시간·재전송·완료 순서 조합 생성, 실패 재현 축소 |
| 설치된 Playwright | 활용 확대 추천 | 실제 React↔daemon 메시지 유실·재접속·terminal 복원 검증 |
| XState 5 | 복잡한 실행 수명에 조건부 후보 | 허용 상태 전이·guard를 명시하고 실제 작업은 Effect에 위임 |
| OpenTelemetry + 기존 Pino | 관측 설계 병행 추천 | 명령→대기→DB→준비→상태 발행의 시간·인과관계 연결 |
| TanStack DB | React 상태 계층 후보 | 서버 확정 collection, 낙관적 transaction, 파생 query |
| MSW | UI 시나리오 재사용 시 후보 | Storybook·컴포넌트 테스트의 공통 HTTP/WS 실패 시나리오 |
| Toxiproxy | 실제 TCP 장애 검증 시 후보 | bandwidth·reset·half-open·backpressure 검증 |

서버 SQLite·현재 snapshot·실행 자원의 권위는 각각 하나로 유지한다. 라이브러리가 도메인 관계나 프로세스 실제 종료를 자동 보장한다고 설명하지 않는다.

## 2. Drizzle: RC4 실패 이후 새 조합을 찾음

앞선 조사에서 `drizzle-orm@1.0.0-rc.4`는 Effect RC117과 import 단계부터 실패했다. 이번 상태·통신 담당은 별도 `rc5` dist-tag의 **1.0.0-rc.5-5935859**를 발견했다. 배포물에서 이전 `Schema.TaggedErrorClass` 호출이 변경됐고, 직접 호환 실험을 수행했다.

```text
Node                         24.14.0
effect                       4.0.0-rc.117
@effect/sql-sqlite-node       4.0.0-rc.117
drizzle-orm                  1.0.0-rc.5-5935859
```

**서브에이전트 직접 실행:** import, typed sqliteTable insert/select, db.transaction 실패 주입 rollback, 정상 commit, Effect layer 종료 후 파일 재오픈이 모두 통과했다. 임시 파일 DB만 사용했다. 재현 파일: `/tmp/aiox-effect4-drizzle-rc5.0SdzNR/smoke.mjs`.

TypeScript5.9.3의 strict/NodeNext/noEmit으로 insert·select·transaction 및 잘못된 컬럼 타입 거절도 확인했다. 이 격리 타입 검사는 skipLibCheck를 사용했으므로 모든 의존성 선언 파일 검증으로 보고하지 않는다. 재현: 같은 디렉터리의 `typecheck.ts`.

Drizzle의 query는 같은 Effect SqliteClient를 사용하고 transaction은 `client.withTransaction`에 위임한다. 별도 SQLite 연결 두 개를 하나의 transaction인 것처럼 사용하는 구조가 아니다. 따라서 서버 전체 Effect 전환을 위해 Drizzle부터 제거해야 한다는 근거는 없다.

미검증: 현재 제품 schema·trigger·외래키·JSON/boolean 변환·drizzle-kit 출력, 중첩/동시 transaction·commit 실패, 프로세스 crash, 지원 Node 전체. RC 조합을 고정해야 하며 단순 `drizzle-orm@rc`는 조사 당시 RC4를 가리켰다.

근거: [정확 Drizzle 배포 metadata](https://registry.npmjs.org/drizzle-orm/1.0.0-rc.5-5935859), [Effect SQL 드라이버 metadata](https://registry.npmjs.org/@effect/sql-sqlite-node/4.0.0-rc.117), [공식 Effect Drizzle migration](https://github.com/Effect-TS/effect/blob/main/migration/annotations/effect__sql-drizzle__Sqlite.yaml). main의 import 경로와 실제 RC117의 `effect/unstable/*` 차이는 앞선 보고서대로 유지한다.

## 3. chokidar: Claude 파일 관측에 구체적인 이득

프로세스 담당이 현재 `claude.ts`와 transcript reader를 읽어 확인했다. 관측은 fs.watch 재arm·rename/error·실패 재시도, 읽기는 inode/byte offset/partial row/consume 성공 후 offset 확정을 별도로 소유한다.

**chokidar5.0.0**은 Node≥20.19, ESM, MIT이며 파일 add/change/unlink와 atomic write 이벤트를 정규화한다. 이 관측 backend를 위임하면 개별 watcher 처리 일부를 줄일 수 있다. JSONL 완료 판단·세션 선택·읽기 위치·메시지 저장 의미까지 위임하는 것은 아니다. [고정 버전 README](https://github.com/paulmillr/chokidar/blob/5.0.0/README.md), [metadata](https://registry.npmjs.org/chokidar/5.0.0).

RC117 Effect NodeFileSystem은 `FileSystem.WatchBackend` 주입 지점이 있다. 따라서 제안 구조는 다음과 같다.

```text
Effect FileSystem.watch
  → chokidar backend: OS 파일 이벤트 정규화
  → Effect Stream/Scope: 소비·취소·구독 해제
  → Claude reader: inode·offset·완성된 행 판별
  → observations/messaging: 의미 해석·DB settlement
```

이 결합은 소스 기반 제안이며 아직 구현·실행하지 않았다. `awaitWriteFinish`를 켜면 파일 크기 polling과 기본 2초 안정화 대기가 생기므로 실시간 append에는 기본 false를 유지하는 방향이다. Effect watch는 대상 stat 이후 backend로 들어가므로 아직 없는 파일은 부모 디렉터리 관측 등 시작 경로를 설계해야 한다. [RC117 NodeFileSystem](https://unpkg.com/@effect/platform-node-shared@4.0.0-rc.117/src/NodeFileSystem.ts).

필수 비교 검증: atomic replace, truncate, UTF-8 분할 append, watcher 오류 회복, 세션 경로 이동, 실제 OS별 동작. 파일 이벤트는 읽기를 촉발하는 신호이며 누락 없는 사건 로그가 아니다.

대안 `@parcel/watcher2.6.0`은 native backend·batch·snapshot 이후 변경 탐색이 있다. 대량 디렉터리 관측에는 검토 가치가 있지만, 현재 세션별 파일 관측에서 우위는 측정하지 않았다. 이벤트 병합은 JSONL durable cursor를 대신하지 못한다. chokidar와 중복 backend로 넣기보다 규모에 따른 대안이다. [공식 README](https://github.com/parcel-bundler/watcher), [metadata](https://registry.npmjs.org/@parcel/watcher/2.6.0).

## 4. fast-check: 현재 놓친 조합을 검증하는 도구

**fast-check4.10.2**는 Node≥12.17, ESM/CJS이고 Vitest에 종속되지 않는다. 선택적 `@fast-check/vitest0.5.0`은 Vitest ^4.1 또는 ^5를 지원한다. 둘 다 프로젝트 신규 설치·실행은 하지 않았다. [metadata](https://registry.npmjs.org/fast-check/4.10.2), [Vitest adapter](https://registry.npmjs.org/@fast-check/vitest/0.5.0).

명령 목록 생성·실패 시나리오 축소·비동기 모델 실행·Promise 완료 순서 탐색이 주요 이득이다. 이번 마이그레이션은 예제 하나보다 조합의 누락이 위험한 영역이다. [공식 model testing](https://fast-check.dev/docs/advanced/model-based-testing/), [race testing](https://fast-check.dev/docs/advanced/race-conditions/).

```text
생성할 조작:
  요청 / 같은 요청 재전송 / 시간 전진 / 재접속
  tab 생성 / 이동 / pane 제거 / spawn 완료 / stop 실패 / retry 성공

검사할 불변식:
  동일 요청이 부작용을 중복 실행하지 않음
  tab은 정확히 하나의 존재하는 pane에 속함
  삭제된 tab에 terminal을 연결하지 않음
  살아 있는 미배치 process의 cleanup 소유자가 사라지지 않음
  snapshot+delta 적용 결과가 서버 확정 상태와 일치
```

모델은 production Map과 분기를 복사하지 않고 관찰 가능한 관계·처리 identity·종료 확인 여부를 표현해야 한다. 최종 빈 panel의 표현처럼 제품이 허용한 예외도 모델에 반영한다.

현재 순번 처리기의 idle 세션 삭제 후 동일 요청 재실행은 직전 Codex 검토에서 재현됐다. fast-check가 이번에 그 버그를 발견했다고 주장하는 것은 아니다. 이런 시간·재전송 조합을 다음부터 자동 탐색할 도구라는 판단이다.

Effect TestClock은 Effect Clock을 쓰는 대기만 제어한다. 현재 idle sweep의 주입 now/Date.now와 Effect.sleep을 하나의 시간 계약으로 맞춰야 한다. fast-check scheduler도 실제 PTY·OS signal을 통제하지 않으므로 실 PTY·실시간 종료 테스트를 함께 유지한다.

## 5. 실제 통신 검증: Playwright·MSW·Toxiproxy 역할 분리

검증 담당이 lockfile에서 설치된 **Playwright1.63.0**을 확인했다. `routeWebSocket`은 실제 서버 연결의 메시지를 가로채거나 차단할 수 있다. 이를 사용한 시험은 이번에 실행하지 않았다. [공식 API](https://playwright.dev/docs/api/class-websocketroute).

```text
React 앱 명령 → daemon DB commit
  → 응답만 차단 → 연결 종료 → 재접속
  → 동일 요청 재전송 → 부작용은 한 번, 화면은 현재 상태로 복원
```

terminal WS에는 현재 적용할 수 있고 앱 명령 WS에는 해당 전환 후 적용한다. 현재 앱 HTTP/SSE 구현과 목표 WS를 혼동하지 않는다. 메시지 interception과 실제 TCP 장애는 다르며, 같은 TCP 연결에서 메시지 순서를 임의로 뒤섞는 실험은 정상 네트워크 특성의 재현이 아니다.

**MSW2.15.0**은 Storybook·컴포넌트·개발 화면에서 공통 실패 시나리오를 재사용할 때 후보이다. 브라우저가 실패 상태를 표시하는 검증에 유용하지만 실제 daemon의 SQLite/PTY 무결성을 검증하지 않는다. WHATWG WebSocket interception과 Node ws 패키지의 모든 연결 interception을 동일시하지 않는다. [WS 문서](https://mswjs.io/docs/websocket/), [interceptors](https://github.com/mswjs/interceptors).

**Toxiproxy2.12.0**은 개발·CI의 별도 TCP proxy이다. 실제 bandwidth 제한·reset·slow close로 느린 viewer와 빠른 viewer의 격리, 버퍼 상한, half-open 이후 정리를 검사할 때 후보이다. binary/container와 포트·수명 관리 비용이 있고 실제 실행은 미검증이다. 명령 하나의 ack만 차단할 때는 Playwright가 더 직접적이다. [공식 README](https://github.com/Shopify/toxiproxy), [release](https://github.com/Shopify/toxiproxy/releases/tag/v2.12.0).

## 6. XState: 상태 전이 규칙과 Effect 실행 책임의 분리 후보

주 에이전트가 registry에서 **XState5.33.2 stable**, 6.0.0-alpha.59를 구분했다. 현재 웹 문서는 v6 alpha 내용을 포함하므로 stable 고정 소스에서 `transition`과 `initialTransition`을 확인했다. 이 함수는 다음 상태와 action 목록을 반환하며 action을 실행하지 않는다. MIT, ESM/CJS 배포이다. [5.33.2 소스](https://github.com/statelyai/xstate/blob/xstate%405.33.2/packages/core/src/transition.ts), [고정 package metadata](https://github.com/statelyai/xstate/blob/xstate%405.33.2/packages/core/package.json).

제안:

```text
자원 현재 상태 + 이벤트
  → XState 순수 전이: 허용 여부·다음 상태·필요한 작업
  → Effect: 해당 작업의 실행·취소·재시도·정리
  → 결과 이벤트를 상태 전이에 입력
```

준비 중 삭제, 종료 중 재시도, cleanup 실패 같은 수명 규칙이 여러 코드에 흩어지는 것을 줄일 후보이다. 시각화·전이 검증·fast-check 모델과 연결하는 이점도 평가할 수 있다. 그러나 XState actor와 Effect Fiber가 같은 프로세스를 각각 소유하도록 구성하지 않는다. runtime record와 machine context에 같은 권위 상태를 중복 저장하지 않는다.

설치·프로젝트 적용·코드량 비교는 하지 않았다. 따라서 즉시 필수 채택이 아니라 실제 자원 수명 하나에서 전이 규칙의 명확성과 실행 경계 개선을 검증할 후보다. 상태 machine snapshot 저장이 PTY handle·프로세스 재부착이나 Workflow durability를 자동 제공하지 않는다.

## 7. OpenTelemetry와 Pino

현재 diagnostics는 Pino10.3.1과 허용 필드 기반 안전 직렬화를 소유한다. 검증 담당은 sdk-node0.222.0, api1.9.1, instrumentation-pino0.68.0을 확인했다. 해당 계측은 Pino>=5.14 <11을 지원한다. 실제 전체 SDK 통합은 미검증이다. [SDK metadata](https://registry.npmjs.org/@opentelemetry/sdk-node/0.222.0), [Pino 계측 metadata](https://registry.npmjs.org/@opentelemetry/instrumentation-pino/0.68.0).

가치 있는 경계는 command→순번 대기→DB commit→프로세스 준비→상태 발행과 cleanup 시도이다. 각 WS frame이나 PTY 원문을 수집하는 방식은 목적과 맞지 않는다. server publish와 React 적용 완료는 별도 관측이며, 후자는 프로토콜 근거가 있어야 한다.

**서브에이전트 직접 실행:** 기존 Pino의 mixin→formatter 경로에서 trace_id/span_id/trace_flags를 넣으면 현행 allowlist가 모두 제거했다(`traceFieldsKept: []`). 계측 패키지만 설치해도 correlation이 보존된다고 가정할 수 없다. 안전한 식별 필드를 명시적으로 허용해야 한다. [계측 구현](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-pino).

제안은 소수의 명시적 span·기존 Pino 로그 연결·테스트 exporter부터 검증하는 것이다. 자동계측 bundle은 ESM 초기화 순서와 tsup 산출물까지 확인해야 한다. 지속 trace 조회 backend를 채택하면 sampling·보존·flush·운영 비용도 추가된다. console/in-memory exporter에는 별도 수집 서버가 필수는 아니다. [ESM 통합 안내](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/esm-support.md).

## 8. TanStack DB와 기존 Zustand

상태 담당은 현재 Web에 Zustand5.0.15가 선언돼 있지만 production import가 없음을 확인했다. TanStack Query/DB를 이미 사용 중이라고 가정하지 않는다. TanStack DB0.9.2는 서버 확정 collection, 낙관적 transaction, 파생 query를 구성하는 React 계층 후보다. daemon의 SQLite·현재 snapshot까지 두 번째 권위 저장소로 옮기자는 제안은 아니다.

재접속 snapshot 교체 뒤 pending optimistic mutation을 다시 얹는 동작은 편리하지만, 새 epoch에 옛 명령이 유효한지는 이 라이브러리가 결정하지 않는다. 확정 응답과 서버 상태 반영을 연결하는 프로토콜, sequence fencing, 삭제된 자원 처리, SQLite transaction은 그대로 우리 책임이다. [mutations](https://tanstack.com/db/latest/docs/guides/mutations), [custom collection](https://tanstack.com/db/latest/docs/guides/collection-options-creator).

기존 Zustand는 단순한 앱 내부 UI 상태에 사용할 수 있다. TanStack DB와 동시에 같은 서버 DTO를 권위 상태로 저장해서는 안 된다. 어느 쪽이 낙관적 서버 상태를 소유하는지 먼저 정한다. 실제 React 통합·성능 비교는 미검증이다.

TanStack DB0.9.2·React DB0.4.1은 현재 TS5.9.3·React19.3.0이 선언 peer 범위에 들어간다. 단, pending optimistic 변경은 행 전체를 겹치는 방식이므로 panel 하나를 한 행으로 잡을지 pane/tab을 나눌지에 따라 다른 창 변경과의 재조정 경계가 달라진다. `isPersisted.promise`도 handler가 정한 완료를 뜻하며 서버 확정 자체를 자동 증명하지 않는다. [DB metadata](https://registry.npmjs.org/@tanstack/db/0.9.2), [React metadata](https://registry.npmjs.org/@tanstack/react-db/0.4.1), [고정 sync 구현](https://unpkg.com/@tanstack/db@0.9.2/src/collection/sync.ts).

Immer11.1.18은 immutable 편집 표현의 후보이며 patch/inverse patch가 다른 창의 변경까지 의미적으로 재조정하는 것은 아니다. Kysely0.29.6은 query builder의 compile 결과를 Effect SQL로 실행하는 대안이지만, RC5가 통과한 현재 Drizzle 전체를 교체할 추가 이득은 확인하지 못했다. 둘 다 실행 통합은 미검증이다. [Immer patches](https://immerjs.github.io/immer/patches/), [Kysely 작성/실행 분리](https://kysely.dev/docs/recipes/splitting-query-building-and-execution).

## 9. 조사했으나 현재 추가 추천하지 않는 것

- **execa10.0.1:** 프로세스 API가 풍부하지만 Effect RC117 Node spawner도 POSIX process group·Windows taskkill·escalation을 구현한다. 이번 방향에서는 두 실행 관리자의 중복보다 Effect native child 통합이 직접적이다. 어느 도구도 모든 descendant 종료와 소유권을 무조건 보장하지 않는다. 특히 Effect spawner의 scoped release가 종료 실패를 ignore하는 경로가 있어 cleanup 상태를 이것으로 대체하지 않는다. [Effect RC 소스](https://unpkg.com/@effect/platform-node-shared@4.0.0-rc.117/src/NodeChildProcessSpawner.ts), [Execa termination](https://github.com/sindresorhus/execa/blob/v10.0.1/docs/termination.md).
- **split2·tree-kill:** 줄 분리나 signal 전달은 제공하지만 현재 reader의 inode/offset/consume 성공 후 commit이나 ExecutionOwner의 실제 종료 확인을 대체하지 못한다. [split2](https://www.npmjs.com/package/split2?activeTab=readme), [tree-kill](https://github.com/pkrumins/node-tree-kill).
- **Automerge:** 앞선 보고서대로 오프라인 복제본 편집 요구가 없는 현재 구조에서는 보류. CRDT 수렴을 pane/tab 관계나 PTY 수명 보장과 동일시하지 않는다.
- **fast-json-patch3.1.1:** resource 내부 전송량을 줄이는 후보이지만 기준 revision·누락·배열 index 처리 책임이 추가된다. 현재 ID별 upsert/remove를 교체할 실제 payload 병목 근거는 없다. 전송량 개선이 필요할 때 비교하며 명령 순서·관계 검증 도구로 도입하지 않는다. [공식 API](https://github.com/Starcounter-Jack/JSON-Patch).
- **DBOS TypeScript5.0.2:** 별도 durable workflow 후보로 확인했지만 조사한 TypeScript 구성은 Postgres system database를 사용한다. 현재 로컬 SQLite daemon에 바로 붙는 근거를 확인하지 못했다. Effect Workflow와 두 영속 실행 엔진을 동시에 운영할 제안은 하지 않는다. 기능 부족을 이유로 전면 배제한 것은 아니다. [TypeScript configuration](https://docs.dbos.dev/typescript/reference/configuration), [metadata](https://registry.npmjs.org/@dbos-inc/dbos-sdk/5.0.2).

## 10. 라이브러리보다 큰 별도 결정

daemon 종료 후에도 PTY를 소유하고 다시 붙게 하려면 tmux 또는 별도 PTY broker처럼 daemon 밖의 소유자를 두는 구조를 검토해야 한다. node-pty·xterm mirror·Workflow 기록만으로 죽은 daemon의 PTY handle이 자동 복구되지는 않는다. 이는 npm 패키지 선택보다 큰 배포·소유권 결정이며 이번 요구에 자동 추가하지 않는다. [node-pty](https://github.com/microsoft/node-pty), [tmux](https://github.com/tmux/tmux/wiki/Getting-Started).

다음 적용 검토의 우선순위는 (1) 실제 프로젝트 DB schema로 Drizzle Effect backend 검증, (2) fast-check 불변식과 실제 통신 회귀 기준 확보, (3) Claude watcher backend 비교, (4) 필요한 lifecycle에 XState 적용 비교, (5) trace 경계와 React 상태 소유 선택이다. 설치·실행 검증 수준이 다른 후보를 모두 채택 확정으로 취급하지 않는다.
