# Effect v4 서버 통합 조사와 테스트 도구 업그레이드

2026-09-25 후속 판정: Effect v4·Effect HTTP/RPC·자체 Effect Schema·Drizzle Effect SQLite는 이후
제품에 반영됐다. Drizzle RC4 실패와 RC5 격리 통과는 서로 다른 버전의 조사 결과이며 삭제하지 않는다.
Workflow·Automerge는 채택하지 않았고, MCP SDK의 Zod 경계는 유지한다. 아래 벤치마크를 제품 전체의
성능 우위로 확대하지 않는다. 현재 [저장 구조](../../docs/architecture/aiox-storage-terminal.md)와
[앱 통신 계약](../../docs/specs/aiox-application-rpc.md)이 구현 기준이다. pane·탭 선택은 서버
snapshot이 아닌 [클라이언트 메모리 상태](../../docs/specs/aiox-configuration-web.md)다.

2026-09-25. 이 문서는 조사 근거와 검증 결과를 소유한다. 서버 전환 완료나 전체 패키지 채택 결정 문서가 아니다. 현재 작업은 [Stage6 Web 로그](../2026-09-09-AIOX-TUI-Stage6-Web.md)의 W10이며, 서버 구현 맥락은 [Stage5 Host 로그](../2026-09-09-AIOX-TUI-Stage5-Host.md)에 있다. 이전 [Effect 서버·adapter 조사](2026-09-25-Effect-Server-Adapter-Research.md)의 v3 중심 패키지 설명을 v4에 그대로 적용하지 않는다.

## 범위와 근거 구분

- 사용자 요청: 가능한 테스트 도구 업그레이드, v4 SQL·Drizzle 통합, restart Workflow, 유용한 Effect 기능·Automerge 조사. MCP SDK 경계의 Zod는 유지하고 자체 Schema 전환은 성능을 비교해 판단한다.
- 주 에이전트 직접 수행: 현재 작업·의존성 확인, npm metadata 조회, 루트 Vitest 업그레이드, 타입 패치, workspace 검사와 테스트.
- 서브에이전트 DB 조사: 공식 RC 배포 소스 확인, 격리 환경 SQLite·Drizzle 실행 검증.
- 서브에이전트 Workflow 조사: 공식 RC 배포 소스와 현재 Host restart 호출 경로를 읽음. Workflow 영속 엔진의 실제 실행·장애 복구는 검증하지 않음.
- 서브에이전트 Automerge·Schema 조사: 공식 문서 확인, 격리 Schema benchmark 수행. Automerge·TanStack DB 실행·성능은 미검증.
- 이번 제품 의존성 변경은 테스트 도구에 한정한다. Effect v4·새 DB 드라이버·Workflow·Schema·Automerge는 프로젝트에 설치하거나 적용하지 않았다. 사용자 DB와 architecture.excalidraw는 변경하지 않았다.

## 1. 테스트 도구: 실제 반영·검증 완료

루트 `vitest`를 4.1.6에서 **5.0.1**로 올렸다. Web은 자체 `vitest`와 `@vitest/browser-playwright` 4.1.6을 그대로 사용한다. `@storybook/addon-vitest@10.6.0`의 공식 peer 범위는 Vitest 3·4여서 Web까지 강제로 5로 올리지 않았다. 서버·공통 패키지는 루트의 Vitest 5를 사용한다.

- 환경: Node 24.14.0, pnpm 10.33.0, TypeScript 5.9.3.
- `@effect/vitest@4.0.0-rc.117`은 Effect RC117과 Vitest >=5 <6을 요구한다. 이번 업그레이드로 테스트 러너 조건은 맞지만 이 어댑터 자체는 아직 설치·실행하지 않았다.
- Vitest 5의 tinybench 6.1.4 타입 선언이 Node 전용 tsconfig에서 `DOMHighResTimeStamp`를 찾지 못했다. `performanceNow` 반환 타입을 동일한 원시 타입 `number`로 바꾸는 한 줄 의존성 패치를 추가했다. runtime 동작은 바꾸지 않았다.
- 패치: `patches/tinybench@6.1.4.patch`, 등록은 루트 `package.json`의 `pnpm.patchedDependencies`. 서버에 DOM lib 추가나 skipLibCheck 적용은 하지 않았다. upstream 타입이 수정된 버전으로 교체하면 패치를 제거하고 Node 전용 typecheck를 다시 확인한다.
- `pnpm check`의 lint·format·build·typecheck 통과. 최초 테스트는 sandbox의 PTY/`ps` EPERM으로 중단됐다.
- 정상 권한으로 `pnpm test` 재실행: **825 passed, 1 skipped**. Web 89, CLI 74, daemon 289 passed/1 skipped를 포함한다. 별도 전체 check 재실행 결과로 표현하지 않는다.
- 검증 로그: `/tmp/aiox-vitest5-check.log`, `/tmp/aiox-vitest5-tests.log`.

근거: [Vitest 5 migration](https://vitest.dev/guide/migration/), [Vitest metadata](https://registry.npmjs.org/vitest/5.0.1), [Storybook addon metadata](https://registry.npmjs.org/@storybook/addon-vitest/10.6.0), [Effect Vitest RC metadata](https://registry.npmjs.org/@effect/vitest/4.0.0-rc.117).

## 2. v4 패키지 경로: 배포 버전을 기준으로 판단

조사 시 Effect stable은 3.22.2, RC는 **4.0.0-rc.117**이다. v4 RC117의 HTTP/RPC/Workflow/SQL/Reactivity/Persistence는 `effect/unstable/*` 아래 본체 기능이다. Node 구현과 SQLite 드라이버 등은 별도 패키지다.

**현재 GitHub main은 이미 일부 경로에서 unstable 구간을 제거했다. RC117에 main 예제를 그대로 복사하지 않는다.** 아래 표는 실제 RC117 배포물 기준이다.

| v3 패키지/역할 | v4 RC117 경로·상태 |
| --- | --- |
| @effect/platform HTTP·socket | effect/unstable/http, httpapi, socket |
| @effect/rpc | effect/unstable/rpc |
| @effect/workflow | effect/unstable/workflow |
| @effect/sql | effect/unstable/sql |
| Node 구현 | @effect/platform-node의 대응 RC |
| SQLite 드라이버 | @effect/sql-sqlite-node@4.0.0-rc.117 |
| @effect/sql-drizzle | latest 0.51.0은 v3용, v4 RC 없음 |

근거: [RC117 배포 metadata](https://registry.npmjs.org/effect/4.0.0-rc.117), [고정 RC 소스](https://github.com/Effect-TS/effect/tree/effect%404.0.0-rc.117/packages/effect/src/unstable), [main migration — RC와 구분](https://github.com/Effect-TS/effect/blob/main/MIGRATION.md).

## 3. SQLite·Drizzle 통합

추가 조사: 아래 RC4 실패는 그대로 유효하다. 이후 별도 `rc5` 태그의 `1.0.0-rc.5-5935859`와 Effect RC117 조합으로 import·쿼리·transaction·재오픈을 통과했다. 현재 선택에는 [추가 라이브러리 조사](2026-09-25-Server-Migration-Library-Research.md)를 함께 사용하며 RC4 결과를 Drizzle 전체 불호환으로 일반화하지 않는다.

현재 프로젝트는 better-sqlite3 12.11.1과 Drizzle 0.45.3을 사용한다. `database.ts`가 연결·schema 초기화·종료를 소유하고, `host-state.ts`의 관계 변경은 Drizzle transaction 안에서 처리한다.

`@effect/sql-sqlite-node@4.0.0-rc.117`은 **node:sqlite DatabaseSync**를 사용한다. better-sqlite3를 Effect로 감싼 드라이버가 아니다. 연결 수명·단일 연결 semaphore·transaction·중첩 savepoint를 제공한다. 동기 SQLite 호출은 Fiber 병렬화로 비동기가 되지 않으며, shell 준비를 SQL transaction 안에 넣어서는 안 된다.

공식 v4 migration은 Drizzle 연동을 `drizzle-orm/effect-sqlite-node`로 안내한다. `drizzle-orm@1.0.0-rc.4`에 실제 구현이 있고, Drizzle query를 Effect SqliteClient로 실행하며 transaction을 `client.withTransaction`에 연결한다. 같은 연결을 공유하는 통합 경로이다.

그러나 **공식 경로 존재와 현재 버전 조합의 실행 호환은 달랐다.** 서브에이전트가 아래 조합을 /tmp에 격리 설치했다.

```text
effect                    4.0.0-rc.117
@effect/sql-sqlite-node    4.0.0-rc.117
drizzle-orm               1.0.0-rc.4
```

| 실행 검증 | 결과 |
| --- | --- |
| Effect SQL 파일 DB create·insert | 통과 |
| transaction 내 실패 주입 → rollback | 통과 |
| 정상 transaction → commit | 통과 |
| Scope 종료 → 새 Scope에서 파일 재오픈 | 통과 |
| Drizzle Effect backend import | 실패: Schema$1.TaggedErrorClass is not a function |

Node 24.14.0과 26.8.2에서 확인했다. 프로젝트 최소 지원 Node 전체, 실제 schema·trigger·JSON/boolean 매핑, commit 실패·동시 transaction·프로세스 crash는 검증하지 않았다. Node24에서는 node:sqlite ExperimentalWarning이 나온다.

재현: `/tmp/aiox-effect4-db-smoke.FNfvLW/smoke.mjs`. 프로젝트 Node 실행 파일로 실행하면 임시 파일 DB를 만들고 종료 시 삭제한다.

**제안:** v4 직접 SQL 경로는 실제 적용 후보이다. Drizzle을 유지하려면 호환 릴리스를 확인하거나, 이행 중에는 기존 Drizzle+better-sqlite3 transaction을 한 소유자로 유지한다. Effect SQL 연결과 기존 Drizzle 연결을 같은 transaction인 것처럼 혼용하지 않는다. 이번 실패만으로 Drizzle 제거를 확정하지 않는다.

근거: [Drizzle migration](https://github.com/Effect-TS/effect/blob/main/migration/annotations/effect__sql-drizzle__Sqlite.yaml), [SQLite RC metadata](https://registry.npmjs.org/@effect/sql-sqlite-node/4.0.0-rc.117), [Drizzle RC metadata](https://registry.npmjs.org/drizzle-orm/1.0.0-rc.4), [v3 sql-drizzle metadata](https://registry.npmjs.org/@effect/sql-drizzle/0.51.0).

## 4. Workflow: Host restart는 실제 적용 후보

서브에이전트가 읽은 현재 Host restart 경로는 기존 runtime 종료 결과 수집, 실패 시 중단, 최신 panel 기반 Host 구성 적용, 새 Agent 병렬 준비, 대상별 결과 수집이다. 이를 다음 Workflow로 표현하는 것은 타당한 후보다.

```text
CLI restart → daemon 소유 Workflow
  기존 실행 identity 확정
  → 대상별 종료 확인
  → 최신 배치에 구성 적용
  → 새 실행 병렬 준비·연결
  → 성공 대상 유지 + 대상별 최종 결과
```

Workflow는 실행 ID, 이름 있는 Activity 결과 재사용, retry, suspend/resume, DurableDeferred, DurableClock, compensation을 제공한다. foreground CLI launch의 준비 확인을 DurableDeferred로 표현할 수도 있다. CLI 연결 종료를 daemon 작업 취소로 자동 연결하지 않는다.

주의할 계약:

- Activity 완료 결과 저장 전에 프로세스가 생성되고 daemon이 죽으면 replay가 중복 spawn할 수 있다. 실행 identity와 실제 프로세스 재확인·정리 규칙이 별도로 필요하다.
- 저장된 terminalId가 있다고 메모리 PTY handle이나 relay가 복구된 것은 아니다.
- 이미 종료한 이전 Agent는 DB rollback이나 compensation으로 원상복구되지 않는다.
- t2 준비 실패 때문에 성공한 t1을 자동 compensation으로 종료해서는 안 된다. 대상별 결과를 수집한다.
- 메모리 engine은 재시작 durability가 없다. 공식 영속 ClusterWorkflowEngine은 Sharding·MessageStorage가 필요하다.
- 확인한 WorkflowEngine 공개 API에는 완료 실행 purge/TTL이 없다. 저장소의 주소별 삭제 기능은 있지만 하위 Activity·Deferred·Clock까지 안전하게 정리하는 정책은 검증해야 한다. `discard:true`는 결과 대기를 생략하는 옵션이며 저장 기록 삭제가 아니다.

Operation 제거는 필요한 실행 복구 기록까지 금지한다는 뜻이 아니다. **사용자에게 공개하는 완료 Operation 이력과 실행 복구에 필요한 기록은 구분**하되, 완료 기록을 무기한 쌓는 구조를 새 이름으로 옮기지 않는다.

현재 snapshot, resize·move, 상시 파일 관측은 Workflow보다 일반 Effect·Scope·Stream이 직접적이다. Workflow의 실제 영속 실행·crash 복구는 후속 검증 대상이다.

근거: [Activity RC117](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.117/packages/effect/src/unstable/workflow/Activity.ts), [Workflow](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.117/packages/effect/src/unstable/workflow/Workflow.ts), [Engine](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.117/packages/effect/src/unstable/workflow/WorkflowEngine.ts), [Cluster engine](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.117/packages/effect/src/unstable/cluster/ClusterWorkflowEngine.ts), [SQL message storage](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.117/packages/effect/src/unstable/cluster/SqlMessageStorage.ts).

## 5. 추가로 유용한 기능

| 기능 | 우리 제품에서의 후보 역할 | 자동 제공하지 않는 것 |
| --- | --- | --- |
| RPC over WS | Schema 기반 typed 요청·결과·오류·상태 stream, codec·상관관계 처리 | 도메인 순번, 결과와 delta의 원자 반영, 재접속 계약 |
| Reactivity | producer가 변경한 키를 알려 관련 DTO query만 재실행 | 현재 snapshot 저장소, 변경 관계의 자동 발견 |
| PersistedQueue | 재시작 후에도 필요한 단일 cleanup job 재처리 | exactly-once side effect, 프로세스 실재 확인 |
| Ref·Queue·PubSub·Stream·Scope | 현재 상태와 연결별 변경 전달·수명 | DB commit과 상태 반영의 일관성·초기 구독 누락 방지 |

RPC server는 연결이 끊기면 해당 client handler Fiber들을 interrupt한다. DB 등록 후 shell·Host 작업은 daemon 소유로 넘겨야 한다. 명령 RPC와 상태 구독 RPC를 나누는 것만으로 React 앱의 두 결과 경로 조정이 사라지는 것도 아니다. 결과+변경을 함께 소비하는 메시지 계약은 별도로 설계한다.

PersistedQueue는 at-least-once이며 성공 후 ack 전에 crash하면 다시 전달할 수 있다. cleanup worker는 멱등적이어야 한다. 별도 cleanup layer가 필요하고, 완료 기본 보존은 30일, 실패 dead-letter는 TTL 미지정 시 계속 남으므로 기본값 그대로 도입하지 않는다. 기존 cleanup registry와 중복 소유자를 만들지 않는다.

근거: [RPC server](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.117/packages/effect/src/unstable/rpc/RpcServer.ts), [Reactivity](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.117/packages/effect/src/unstable/reactivity/Reactivity.ts), [PersistedQueue](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.117/packages/effect/src/unstable/persistence/PersistedQueue.ts).

## 6. Effect Schema와 Zod

**MCP SDK 경계의 Zod는 사용자 지시대로 유지한다.** 자체 프로토콜은 Effect HTTP/RPC·decode/encode·오류 채널 통합을 이유로 Effect Schema를 선택할 수 있다. 성능 우위를 전제하지 않는다.

서브에이전트는 Node24.14.0 arm64에서 Zod4.5.4와 Effect4.0.0-rc.117을 격리 설치해 합성 DTO를 측정했다. schema 생성·compile 비용 제외, warmup 2천회, 1만회×7회 중앙값이다. 정상 출력 deepEqual·extra key 제거·대표 실패를 확인했다. Effect 오류 수집은 all이다.

단위 µs/호출, 낮을수록 빠름:

| 조건 | Zod safeParse | Zod compile+safeParse | Effect decodeUnknownResult |
| --- | ---: | ---: | ---: |
| 정상 panel 형태, 4 pane·32 tab | 1.975 | 0.351 | 11.923 |
| 같은 객체의 두 필드 오류 | 2.873 | 2.917 | 13.312 |
| panel 형태 4개 배열 | 6.405 | 1.280 | 49.151 |
| 정수 문자열 → number | 0.107 | 미측정 | 0.081 |

재현 파일: `/tmp/aiox-schema-bench.b2wR3I/bench.mjs`.

실제 전체 DTO·재귀 split·도메인 refinement·JSON.parse·SQLite·WS·오류 포맷 변환·메모리·동시 부하는 포함하지 않았다. 공식 다른 벤치의 Effect 버전을 특정하지 못해 v4 성능 근거로 사용하지 않았다. boolean 검사는 decode/오류 생성과 다른 작업이므로 같은 표의 성능으로 대체하지 않는다.

**제안:** 자체 Effect RPC/HTTP schema는 통합 이득으로 전환할 수 있지만, 대량 저장 데이터 검증까지 성능 개선이라고 주장하며 전면 교체하지 않는다. 동일 DTO를 두 schema로 중복 정의하거나 연속 검증하지 않는다. 최종 경계별 선택은 실제 schema에서 unknown key·수치·union·재귀·refinement·오류 정책을 맞춰 검증한다. 전체 재조회·중복 검증 제거의 구조적 이득은 라이브러리 미세 성능과 별개다. Zod compile 도입도 이번에 적용하지 않았다.

근거: [Effect Schema migration](https://github.com/Effect-TS/effect/blob/main/migration/schema.md), [Zod compile](https://zod.dev/compile), [Zod4 소개 — Zod3 대비 수치와 구분](https://zod.dev/v4).

## 7. Automerge·TanStack DB

Automerge는 Node 서버용 WS·저장 어댑터가 있고 Effect와 결합 불가능한 도구가 아니다. 다만 CRDT 수렴은 tab 단일 pane 소속, 빈 pane 제거, split 유효성, PTY 종료를 보장하지 않는다. 오프라인 편집 요구가 없는 daemon 권위 구조에서는 이번 도입을 보류하는 것이 조사자의 의견이다.

공식 merge 규칙상 동시 list 삽입은 모두 보존된다. 두 pane 목록에 동일 tab을 넣는 표현이라면 CRDT만으로 단일 소속을 보장하지 못한다는 것은 이 규칙에 근거한 추론이며 실행 재현은 아니다. tab.paneId 하나로 정규화하면 그 중복 표현은 피하지만 다른 관계 불변식은 남는다.

TanStack DB는 React 앱의 낙관적 transaction·파생 query·custom WS sync 후보다. 현재 문서에는 동일 transaction/항목의 병합과 paced mutation 기능도 있다. 그러나 클라이언트 transaction 순서를 서버 실행 순서로 추론해서는 안 된다고 공식 문서가 명시한다. 서버 Effect 현재 상태와 별도의 권위 상태 저장소로 중복 도입하지 않는다. 두 라이브러리 모두 프로젝트 설치·실행 검증은 하지 않았다.

근거: [Automerge Repo](https://automerge.org/docs/reference/repositories/), [저장 어댑터](https://automerge.org/docs/reference/repositories/storage/), [병합 규칙](https://automerge.org/docs/reference/under-the-hood/merge-rules/), [TanStack DB mutations](https://tanstack.com/db/latest/docs/guides/mutations), [custom collections](https://tanstack.com/db/latest/docs/guides/collection-options-creator).

## 8. 후속 적용 판단

1. v4 정확한 배포 버전을 기준으로 HTTP·앱 WS·daemon/adapter 수명을 설계한다. RPC와 자체 메시지 구현을 비교하되 순번·상태 반영 계약은 하나로 둔다.
2. DB는 검증된 Effect SQL 직접 경로와 Drizzle 호환 경로를 비교한다. Drizzle RC import 실패를 해결된 것으로 취급하지 않는다.
3. 조사 당시 제안한 Host restart Workflow 시험은 이후 채택 대상에서 제외됐다. Host restart는 daemon 수명 안의 Effect 작업으로 처리하며 daemon 사망 후 자동 재개를 추가하지 않는다.
4. MCP Zod 유지, 자체 Schema 경계별 판단. 대표 benchmark를 제품 성능 보장으로 사용하지 않는다.
5. Automerge는 현재 보류 의견. 불필요한 전체 조회와 중복 상태를 다른 라이브러리로 옮기지 않는다.
