# Step 7 Phase A — Pre-implementation Decisions

> 작성일: 2026-05-19
> 작성자: Claude (Opus 4.7) — 사용자와 1:1 walkthrough + 코덱스 confirm 라운드 1회 (묶음 1 sentinel gotcha)
> 관련 기록:
> - `history/20-step-6-phase-a-decisions.history.md` (phase A walkthrough 패턴)
> - `history/21-step-6-invocation-bin.history.md` (Step 6 마감)
> - `history/19-step-5-route-fanout-tests.history.md` Open Concern O1 (sendMessage sentinel 분리 근거)
> - `plan/mvp-implementation-checklist.md` Step 7 (line 554–562)
> - `prd/mvp/aiox-mvp-spec.md` (pair semantics)

---

## 배경

Step 6 (invocation layer + CLI bin entrypoint) 마감 후 다음 진입 후보를 (b) Step 7
pair reservation tests / (c) real socket transport 두 갈래로 재검토했다. 기존 합의
순서는 `(a)→(c)→(b)` 였으나 사전 검증 라운드에서 다음 gap이 드러나면서 순서를
`(a)→(b)→(c)` 로 조정했다:

- `src/daemon/state.ts:176-197`의 `attachAgent`는 `pairs.findByName`으로 pair 존재만
  확인 후 `agents.attach({pairId})`만 호출한다. `pairs.attachAgent`는 daemon flow
  에서 한 번도 호출되지 않는다.
- `src/store/repositories/pairs.ts:71-154`의 `pairs.attachAgent`는 repo 레벨에서
  이미 same-kind slot reject + agent kind mismatch + ready 전환을 구현하지만,
  daemon flow가 이를 우회 중이라 pair status 전환 / slot reject / bidirectional
  auto-route 가 모두 daemon-level에서 미동작.
- 이 gap은 pair domain product invariant이므로 socket transport 보다 선행 닫기가
  의미적으로 정합. 코덱스도 "real socket을 먼저 붙이면 아직 덜 닫힌 daemon
  contract 위에 transport를 얹게 된다"고 동일 결론.

본 phase A는 코드 변경 없이 결정만 닫는다. Phase B 에서 코덱스 위임 라운드로
구현한다.

---

## 진행 방식

Step 6 phase A 와 동일한 사용자 ↔ Claude 1:1 walkthrough. 3단 묶음 구성:

1. **묶음 1** — pair attach 실패 atomicity (D1 책임 경계 + D2 transaction 경계)
2. **묶음 2** — auto-route 책임 + 시멘틱 (D3 위치 + D4 시멘틱)
3. **closed/deferred 묶음** — D5/D6/D7/D8/D9

묶음 1에서는 D2 transaction 경계의 구현 디테일에 대해 코덱스가 짚은 sentinel
rollback gotcha 를 회신으로 받아 검토 후 본 결정에 흡수했다. 그 외 묶음은 사용자
직접 confirm.

---

## 결정 사항

### 묶음 1 — Pair Attach 실패 Atomicity

#### 1. D1 pair binding 책임 경계 — X-strict

**결정**: `agents.attach`의 `AttachStoredAgentRequest` 인터페이스에서 `pairId` 인자를
제거한다. `pair_id` 컬럼 update 는 `pairs.attachAgent` 한 곳이 전담. 기존
reconnect path (`pairId: request.pairId ?? existing.pairId`) 와 new agent path
(`pairId: request.pairId ?? null`) 는 각각 `existing.pairId` 보존 / `null` 초기화로
단순화한다.

**근거**:

- 현재 `agents.attach` 의 `pairId` 인자가 daemon caller 하나뿐이고, caller 가 이미
  pair lookup 결과를 가진 상태에서 두 layer 가 같은 update 를 중복 수행하는 비대칭이
  된다.
- Step 7 자체가 pair daemon/store invariant 를 row 레벨로 닫는 step. 마치고도
  책임 경계가 비대칭이면 step 목적과 어긋난다.
- Phase B 에서는 TDD red 를 먼저 세운 뒤, X-strict signature 정리와 daemon
  orchestration 변경을 최소 단위로 분리한다. `agents.attach` 의 `pairId` 제거는
  pair attach happy path 를 유지하려면 daemon 이 `pairs.attachAgent` 를 호출해야
  하므로, 순수 behavior 무변경 Tidy commit 으로 강제하지 않는다.

**대안 X-soft (시그니처 유지, daemon flow 에서만 우회)**: 변경 범위 최소이지만
`agents.attach` 에 dead-ish `pairId?` 인자가 남는다. 후속 step 에서 정리해야 하는
dead-weight 라 결정 미루기에 가까움 → 본 step 목적과 어긋난다고 판단해 채택 안
함.

**Reversibility**: 낮음. 후속 step 에서 `agents.attach` 에 다시 `pairId` 를 넣으려면
책임 경계 재흐림 + repository test 재갱신이 필요.

#### 2. D2 daemon attach transaction 경계 — single `withTransaction` + rollback sentinel

**결정**: daemon `attachAgent` flow 를 하나의 `withTransaction` 으로 묶는다. 같은
transaction 안에서:

1. `agents.attach({...})` (X-strict 후 `pairId` 인자 없음, agent row 생성/reconnect)
2. `pairName` 이 제공된 경우 `pairs.attachAgent({pairId, agentId, kind, now})`
3. `pairs.attachAgent` 가 `ok: true` 이면서 `pair.status === "ready"` 인 경우 양방향
   routes 자동 생성 (D3+D4 참조)

**rollback sentinel 패턴 (코덱스 검토에서 추가)**:

> Codex 검토에서 `withTransaction` callback 이 `{ ok:false }` 를 return 하면
> rollback 되지 않고 commit 될 수 있다는 gotcha 를 지적했다. 따라서 pair attach
> reject 는 transaction 내부에서 rollback sentinel 을 throw 하고, transaction
> 밖에서 catch 해 typed daemon response 로 변환하는 패턴으로 결정했다.

**검증**: `src/store/transaction.ts:3` 은 `db.transaction(fn)()` 표준 wrapper 로
callback throw 시에만 rollback. 객체 return 은 commit. 같은 잠재 bug 가 기존
`sendMessage` flow (`src/daemon/state.ts:332-334`) 에도 존재하지만 본 step 권위
범위 밖 (D9 참조).

**Reversibility**: 낮음. rollback 패턴은 transaction wrapper 사용 일관성의 기반.

#### 3. D2 reason naming — P passthrough

**결정**: `pairs.attachAgent` reject reason 을 daemon `AttachAgentResult` union 에
그대로 노출. 변환 layer 없음.

- `{ ok: false, reason: "pair_kind_slot_occupied", existingAgentId }`
- `{ ok: false, reason: "agent_kind_mismatch", expectedKind, actualKind }` (D5 에서
  typed 노출로 closed)

기존 `{ ok: false, reason: "pair_not_found", pairName }` 와 union 으로 결합.

**근거**:

- 기존 daemon API reason naming 이 daemon-level 의미 (`pair_not_found`,
  `source_agent_not_found`) 와 repository passthrough 가 공존하는 상태. 본 step
  에서 별도 namespace 변환은 over-engineering.
- 후속 step 에서 socket transport 가 추가되어도 이 reason 은 외부 contract 로
  그대로 노출 가능 — `pair_kind_slot_occupied` 는 product-level 시멘틱.

**대안 N (namespace 변환)**: socket transport 에서 repo internal naming 을 외부
contract 에 묶고 싶지 않을 때 합리적. 다만 transport step 에서 alias mapping 을
추가하면 충분하므로 본 step 에서 미리 도입할 가치 없음.

**Reversibility**: 중간. 후속 step 에서 alias layer 추가로 보강 가능.

### 묶음 2 — Auto-route 책임 + 시멘틱

#### 4. D3 auto-route 위치 — B-direct (daemon state 안)

**결정**: 양방향 routes 자동 생성은 `pairs.attachAgent` 가 아니라 daemon state
안에서 처리. `pairs.attachAgent` 응답의 `pair.status === "ready"` 를 분기 신호로
사용한다. routes 생성도 같은 외부 `withTransaction` 안에 묶임.

**근거**:

- `pairs.attachAgent` 에 흡수 (옵션 A) 하면 pair repository 가 route repository 를
  알게 되어 repository 책임이 섞임.
- 별도 helper module 추출 (옵션 C-helper) 은 use case 1 곳뿐인 시점에서
  over-engineering. 반복 발견 시 추출 가능한 진화 경로.
- 코덱스 추천 "daemon state owns orchestration, repositories own single-domain
  persistence" 와 정합.

**Reversibility**: 높음. 후속 step 에서 같은 패턴이 반복되면 helper 로 추출 (옵션 C
로 진화) 가능.

#### 5. D4 auto-route 시멘틱 — bidirectional + R-1 silent idempotent

**결정**:

- 양방향 directed route 2 개 (codex→claude, claude→codex) 를 ready 전환 시점에
  생성.
- existing route 는 `routes.findBySourceAndTarget` lookup 으로 skip (idempotent).
  connect API 의 `created` + `alreadyExisted` 패턴과 동일한 정책이지만 daemon
  `AttachAgentResponse` 에는 routes 정보를 surface 로 노출하지 않음 (silent).

**근거**:

- attach API 의 1 차 의미는 agent attach. route auto-creation 은 pair semantic 의
  implementation detail.
- Step 7 가설은 store row-level invariant 검증 — raw `SELECT` 로 routes table 상태
  어서트 (Step 5 `connect-store.test.ts` 패턴 차용).
- response surface 확장 (R-2) 은 후속 step (socket transport, fake adapter) 모두
  영향 → YAGNI.

**구현 메모**: auto-route 단계는 idempotent skip 으로 reject 경로 없음. 묶음 1
sentinel 은 `pairs.attachAgent` reject path 에만 사용된다. pair 의 두 attached
agent 는 같은 transaction 안에서 방금 attach 가 보장되었으므로 routes.create 의
agent 존재 invariant 도 자연 충족.

**Reversibility**: 중간. 후속 step 에서 R-2 (response 노출) 추가 시 DTO 확장만으로
가능.

#### 6. D4 event audit — route_created / pair_ready 추가 없음

**결정**: auto-route 생성 시 `route_created` event 추가 안 함. pair `ready` 전환
시 `pair_ready` event 추가 안 함.

**근거**:

- grep 결과 현재 daemon 에서 `events.append` 가 호출되는 곳은 `sendMessage` flow
  안 `message_created` / `delivery_queued` 두 곳뿐. lifecycle event (`agent_*`,
  `pair_*`, `route_*`) 정의는 `src/core/events.ts:1-13` 에 있지만 실제 emit 코드
  없음.
- pair 만 먼저 event audit 을 붙이면 connect/disconnect 와 비대칭. event audit
  정책 전반은 별도 step 로 분리 (D7 deferred).

**Reversibility**: 높음. 후속 step 에서 event audit 정책 닫을 때 함께 추가 가능.

### closed 항목

#### D5. agent_kind_mismatch — typed error 로 노출 (closed)

**결정**: daemon attach flow 에서 같은 name 의 reconnect 가능한 기존 row
(`disconnected` / `stale` 등)가 caller intent 와 다른 kind 일 때,
`pair_kind_slot_occupied` 와 동일한 P passthrough + sentinel rollback 패턴으로
`agent_kind_mismatch` typed error 노출. 기존 row 가 이미 `connected` 이면
`agents.attach` 가 먼저 `agent_name_already_connected` 를 반환하므로 이 경로에
도달하지 않는다.

**근거**: `src/store/repositories/agents.ts:72-81` reconnect path 는 `...existing`
spread 로 existing.kind 를 보존하므로 caller intent kind 와 stored agent kind 가
갈릴 수 있다. pair 있는 reconnect 흐름에서만 `pairs.attachAgent` 가 kind check 를
수행하므로 mismatch 시점이 좁지만 user-facing path. silent ignore 보다 typed
error 가 contract 일관성에 정합.

#### D6. partial agent row — D2 로 자연 해결 (closed)

묶음 1 D2 single transaction + rollback sentinel 로 rollback 보장. Phase B 가설로
row-level 어서트 1 개 추가 ("pair reject 시 agents table 에 신규 row 없음 / 기존
row 상태 무변경").

---

## Open Concerns / Deferred

### D7. pair_ready / route lifecycle event audit — deferred

현재 daemon 에서 event emit 이 `sendMessage` 한 곳뿐. lifecycle event 전반
(`agent_*`, `pair_*`, `route_*`) 정책은 별도 step. pair 만 먼저 추가하면 비대칭.

**후속 시점**: fake adapter integration (Step 8) 이후 multi-agent 디버깅 가치가
명확해지면 event audit 정책을 한 번에 정리. 또는 doctor/status 출력 (Step 11)
에서 event timeline 노출이 필요해질 때.

### D8. pair detach / pair delete — deferred

MVP 13 개 명령 surface 밖. `prd/mvp/aiox-mvp-spec.md` 미정의. post-MVP product
결정 필요 시 재진입.

### D9. Step 7 권위 범위 — out of scope 명시

본 step 은 pair daemon/store invariant 만 다룬다. 다음 세 가지는 본 step 에서
다루지 **않는다**:

- **sendMessage sentinel 회귀 정정**: 같은 transaction wrapper gotcha 가
  `src/daemon/state.ts:332-334` 에 존재하지만, `history/19` Open Concern O1
  (idempotency preflight transaction 경계 + race 대응) 과 함께 real socket
  transport step 에서 처리한다. 본 step 에서 부분 정정 시 O1 을 "일부만 해결"
  하는 모양이 되어 step 경계가 흐려진다.
- **idempotency preflight transaction 경계 (O1)**: real socket transport step
  에서 sentinel + preflight 위치 이동 + UNIQUE catch reclassify + typed response
  정리를 한 번에 처리.
- **send CLI surface (OA1)**: `history/20` 결정 2 에 따라 MVP 에는 `aiox send`
  미노출. post-MVP 재검토.

---

## 다음 단계 (Phase B 진입 조건)

1. **Codex confirm 라운드**: 본 history 의 결정 6 건 + closed 2 건 + deferred
   3 건을 작업지시서 형태로 코덱스에게 송부 → 수용 + Phase B Round 1 옵션
   추천 회신.
2. **Phase B 구현 라운드**:
   - TDD red 로 pair daemon/store gap 을 먼저 고정한 뒤 X-strict signature 정리와
     daemon orchestration 변경을 최소 커밋 단위로 분리
   - daemon attach behavior 변경 (single transaction + sentinel + `pairs.attachAgent`
     호출 + auto-route)
   - row-level 가설 테스트 추가 (`plan/mvp-implementation-checklist.md` Step 7
     sub-item 4 개를 daemon/store 결합 레벨에서 검증)
   - 코덱스 cross-validation 라운드 진입.
3. **plan checklist 업데이트**: Step 7 헤더에 Tidy First 라인 + 본 history 링크
   추가. sub-item 명세 보강.

본 phase A 자체로는 commit 없음 (결정 문서 단독 commit `docs: record step 7
phase a decisions` 류). Phase B 마감 시 별도 history (예상:
`history/23-step-7-phase-b-pair-daemon.history.md`) 에 commit 라운드 + 테스트
갱신 기록 흡수 예정.
