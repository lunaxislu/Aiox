# Pair Attach Kind Mismatch — 학습 기록

> 작성일: 2026-05-17
> 관련 commit: `71ef70c behavior: validate sqlite pair attach agent`
> 관련 history: `history/16-step-2-sqlite-repository-cleanup.history.md` (4-1 섹션)
> 관련 plan: `plan/mvp-implementation-checklist.md`

---

## 1. 이 topic이 나오게 된 배경

Step 2 (SQLite repositories) cleanup을 마치고 5개 commit으로 정리한 직후, **codex가 추가 리뷰**에서 새로운 critical 이슈를 보고했다.

> "`pairs.attachAgent`가 caller-provided `input.kind`를 검증 없이 신뢰한다.
> persisted `agents.kind`와 `input.kind`가 다르면 pair slot invariant가 깨질 수 있다."

cleanup 1차에서 이슈 #1의 "orphan `pair_id` 검증"이 보류로 남아 있었는데, codex가 이 보류 항목을 더 깊이 파보면서 **같은 계열의 더 큰 문제**임을 발견한 흐름이다.

즉, Step 3 (daemon API) 진입 전에 repository boundary가 자기 invariant를 지키도록 닫아야 하는 항목이 추가로 떠오른 것.

---

## 2. 내가 이해 못 했던 부분

처음 Claude가 "kind mismatch bug"라고 설명했을 때 헷갈렸던 지점은 이거였다.

> **"codex와 codex 끼리 pair에 넣을 수 있게 하는 거랑 이게 같은 문제 아닌가?"**

내 머릿속에서는 두 가지가 섞여 있었다.

1. **비즈니스 제약**: "pair에는 codex 1개 + claude 1개여야 한다"는 현재 불변식
2. **Data validation**: agent의 실제 kind와 caller가 말하는 kind가 다를 때 어떻게 되는가

비즈니스 제약을 푸느냐 마느냐(=codex 2개 허용 여부)와, repository가 caller 말을 검증 없이 믿는 것(=data validation 부재)이 **별개의 문제**라는 게 한 번에 안 들어왔다.

---

## 3. Claude의 설명 — 두 문제는 완전히 별개다

```
두 가지 별개의 문제:

1️⃣ 비즈니스 제약 (현재 불변식)
   "pair에는 정확히 codex 1개 + claude 1개여야 한다"
   → 이건 future에 풀 수 있음 (codex 2개, claude 2개 등 허용 가능)

2️⃣ Data consistency 문제 (이번에 발견한 버그)
   "agent의 실제 DB 상태와 daemon이 호출할 때 전달한 kind가 불일치하면
    repository가 검증 없이 받아들여서 DB 상태가 corrupt된다"
   → 이건 kind 제약을 어떻게 풀든 무관하게 항상 문제
```

핵심: kind 제약을 codex 2개 허용으로 풀어도, agent를 attach할 때 **agent의 실제 kind를 검증하지 않으면** daemon이 실수하거나 호출 순서가 뒤바뀔 때 DB가 corrupt된다.

---

## 4. 시각화 — kind mismatch가 어떻게 invariant를 깨는가

### 초기 상태

```
agents table:
┌─────────────┬──────────┬────────┬──────────┐
│ id          │ kind     │ pair_id│ status   │
├─────────────┼──────────┼────────┼──────────┤
│ agent-1     │ codex    │ null   │connected │
│ agent-2     │ codex    │ null   │connected │
└─────────────┴──────────┴────────┴──────────┘

pairs table:
┌─────┬────────┬──────────┐
│ id  │ name   │ status   │
├─────┼────────┼──────────┤
│ p1  │ feat-x │ pending  │
└─────┴────────┴──────────┘
```

### 시나리오 — daemon이 호출한다

```typescript
// 호출 1: agent-1(codex)을 pair p1에 attach (정상)
pairs.attachAgent({
  pairId: "p1",
  agentId: "agent-1",
  kind: "codex",   // ← caller-provided, 실제 DB도 codex (일치)
  now: "2026-05-16T00:00:01.000Z"
})
// occupied check: SELECT id FROM agents WHERE pair_id = p1 AND kind = codex AND id <> agent-1
//   → 결과: 없음
// → agent-1이 p1에 attach, pair status = pending


// 호출 2: agent-2(실제는 codex)를 "claude"로 attach 시도 (잘못된 호출)
pairs.attachAgent({
  pairId: "p1",
  agentId: "agent-2",
  kind: "claude",  // ← caller가 잘못 제공 (실제 agent-2의 DB kind는 codex)
  now: "2026-05-16T00:00:02.000Z"
})
// ✗ BUG:
// occupied check: SELECT id FROM agents WHERE pair_id = p1 AND kind = claude AND id <> agent-2
//   → 결과: 없음 (p1에는 codex 하나뿐, claude는 비어 있음)
// → repository가 "claude slot 비었네" 판단 → attach 허용
// → agents.pair_id가 p1으로 set되지만, agents.kind는 여전히 codex
// → 같은 pair에 codex agent 2개가 붙어서 slot invariant가 깨짐
```

### 결과 상태 (corrupted)

```
agents table:
┌─────────────┬──────────┬────────┬──────────┐
│ id          │ kind     │ pair_id│ status   │
├─────────────┼──────────┼────────┼──────────┤
│ agent-1     │ codex    │ p1     │connected │
│ agent-2     │ codex    │ p1     │connected │ ← 논리상 claude로 attach된 것처럼 보이지만
└─────────────┴──────────┴────────┴──────────┘    실제 DB는 kind=codex
                                                  → invariant 위반

pairs table:
┌─────┬────────┬─────────────────┐
│ id  │ name   │ status          │
├─────┼────────┼─────────────────┤
│ p1  │ feat-x │ pending         │
└─────┴────────┴─────────────────┘
```

이전 구현도 pair status 계산은 `readAttachedKinds(db, pairId)`로 DB의 실제
`agents.kind`를 읽었기 때문에, codex + codex 조합에서는 distinct kind가 하나뿐이라
`ready`가 아니라 `pending`이다. 그래도 이미 같은 kind agent 2개가 같은 pair에 붙은
상태라 pair slot invariant는 깨진다.

### 근본 원인

수정 전 `pairs.ts`의 `attachAgent` (라인 53-114) 트랜잭션에서:

```typescript
const occupied = db
  .prepare(
    `
      select id from agents
      where pair_id = @pairId
        and kind = @kind           // ← @kind는 INPUT 파라미터
        and id <> @agentId
    `,
  )
  .get({ pairId: input.pairId, kind: input.kind, agentId: input.agentId })
```

repository가 `input.kind`를 **그대로 SQL 비교에 사용**. agent의 실제 kind를 DB에서 조회해서 비교하지 않음. → caller가 거짓말하면 repository가 그대로 속는다.

---

## 5. 어느 step에서 해결했나

**Step 2 SQLite Repository Cleanup의 follow-up commit**으로 닫았다.

**왜 Step 2에 닫았나** (Step 3로 미루지 않은 이유):

- pair capacity invariant는 **Step 2 repository의 책임**이다.
- Step 3 (daemon API)가 이 repository 위에 올라가기 전에 boundary contract를 고정해야 한다.
- daemon layer에서만 막으면 repository test가 우회 가능한 상태로 남고, 다른 caller(예: test fixture, 직접 호출)에서 같은 버그가 재발할 수 있다.

즉, "repository가 자기 자신을 보호한다"를 Step 3 진입 전에 확정한 것.

---

## 6. 커밋 내역

```
71ef70c behavior: validate sqlite pair attach agent
```

변경 파일:

```
src/store/repositories/pairs.ts             | 43 +++++++++++++++++-
tests/unit/store/repositories/pairs.test.ts | 67 +++++++++++++++++++++++++++++
```

이 commit이 Step 2 cleanup의 마지막 behavior follow-up이다. 이후 문서 기록 커밋으로
해당 follow-up을 history에 남겼고, Step 3 진입 가능 상태가 되었다.

Verification:
- `pnpm test`: 17 files, 62 tests passing
- `pnpm typecheck`: passing

---

## 7. 어떻게 해결했는가

### 7-1. 새로운 result 분기 두 개 추가

```typescript
export type AttachAgentToPairResult =
  | { ok: true; pair: StoredPair }
  | {
      ok: false;
      reason: "agent_not_found";
      agentId: string;
    }
  | {
      ok: false;
      reason: "agent_kind_mismatch";
      agentId: string;
      expectedKind: AgentKind;
      actualKind: AgentKind;
    }
  | {
      ok: false;
      reason: "pair_kind_slot_occupied";
      existingAgentId: string;
    };
```

- `agent_not_found`: agent row가 DB에 존재하지 않음
- `agent_kind_mismatch`: caller가 말한 kind와 DB의 agent.kind가 다름 (디버깅을 위해 expected/actual 둘 다 반환)

### 7-2. 트랜잭션 진입 시 agent 검증을 가장 먼저

```typescript
const attachAgentTxn = db.transaction(
  (input: AttachAgentToPairInput): AttachAgentToPairResult => {
    // 1. agent 존재 확인
    const agent = db
      .prepare("select id, kind from agents where id = ?")
      .get(input.agentId) as AgentRow | undefined;

    if (!agent) {
      return { ok: false, reason: "agent_not_found", agentId: input.agentId };
    }

    // 2. kind consistency 확인
    if (agent.kind !== input.kind) {
      return {
        ok: false,
        reason: "agent_kind_mismatch",
        agentId: input.agentId,
        expectedKind: input.kind,
        actualKind: agent.kind,
      };
    }

    // 3. occupied check — 이제 input.kind가 아니라 DB가 검증한 agent.kind 사용
    const occupied = db
      .prepare(
        `
          select id from agents
          where pair_id = @pairId
            and kind = @agentKind          // ← agent.kind (DB의 진실)
            and id <> @agentId
        `,
      )
      .get({
        pairId: input.pairId,
        agentKind: agent.kind,             // ← 더 이상 input.kind 신뢰 안 함
        agentId: input.agentId,
      }) as { id: string } | undefined;

    // ... 이하 기존 update 로직 ...
  },
);
```

### 7-3. 핵심 변경의 의미

- **fail-fast 순서**: agent_not_found → agent_kind_mismatch → pair_kind_slot_occupied
- **caller 신뢰 제거**: SQL 비교에서 `input.kind` 대신 `agent.kind`(DB에서 읽은 값) 사용
- **input.kind는 검증 용도로만 남음**: 일치하면 통과, 다르면 명시적 reject

DB가 single source of truth가 되었고, repository는 자기 invariant를 caller와 무관하게 지킨다.

### 7-4. 추가된 회귀 테스트

```typescript
it("rejects attaching an agent that does not exist", () => {
  // → agent_not_found 반환, pair 상태 변경 없음
});

it("rejects attaching an agent when the requested kind does not match the stored kind", () => {
  // codex agent를 "claude"로 attach 시도
  // → agent_kind_mismatch { expectedKind: "claude", actualKind: "codex" }
  // → pair 상태 변경 없음 (side-effect 없음 검증)
});
```

두 fail 케이스 모두 `pairs.findByName("feature-x")`로 pair row가 변하지 않음을 검증해서 **side-effect 부재**까지 확인.

---

## 8. 배운 점 요약

- **repository는 caller를 신뢰하지 않는다**. invariant가 자기 책임이라면 boundary에서 직접 검증해야 한다.
- **"이미 X 제약이 있으니 괜찮다"는 함정**. 비즈니스 제약(slot 규칙)과 data validation(input vs DB 일치)은 분리해서 생각해야 한다. 전자를 풀어도 후자는 여전히 필요.
- **fail-fast 순서 설계**: 더 기본적인 invariant(agent 존재) → 더 세부 invariant(kind 일치) → 비즈니스 제약(slot 점유) 순. 비싼 쿼리는 뒤로.
- **discriminated union result에 풍부한 컨텍스트**. `{ ok: false, reason }`만으로는 부족. `expectedKind`/`actualKind`처럼 caller가 에러 처리에 필요한 정보를 포함하면 디버깅이 즉시 가능.
- **Step boundary를 닫고 다음 step 진입**: pair invariant는 Step 2의 책임이므로 Step 3에서 daemon 레이어로 미루지 않고 Step 2 follow-up으로 닫았다.
