---
topic: G1-A closeout and downstream handoff
description: 완료된 G1-A 결과를 검증하고, 이후 G1-B·G1-C·G1-D에서 수행할 일을 handoff로 정리하는 closeout 단계.
status: open
---

## Work Items

- [ ] W1 완료된 G1-A stage 결과와 completion condition을 대조해 closeout readiness를 판정한다.
- [ ] W2 G1-B·G1-C·G1-D에 넘길 작업을 handoff register에 등록하고, 각 handoff 내용을 history entry로 기록한다.
- [ ] W2-1 G1-B handoff의 작업·근거·입력·완료 조건을 기록한다.
- [ ] W2-2 G1-C handoff의 작업·근거·입력·완료 조건을 기록한다.
- [ ] W2-3 G1-D에 직접 넘길 작업의 필요 여부를 판정하고, 필요하면 handoff를 기록한다.
- [ ] W3 G1-A plan과 관련 stage 로그의 최종 상태를 reconcile한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 상위 plan은 plans/g1-a-contract-ingress.md다. 이 로그는 Schema/tool/fixture sync 및 Codex structured ingress evidence가 완료된 뒤에만 활성화한다.
- 이 로그는 G1-B·G1-C·G1-D 구현을 수행하지 않는다. 완료된 G1-A 결과를 검증하고, G1-A 범위 밖의 후속 작업을 이 로그의 handoff로 남긴다.
- closeout의 stage 입력은 별도 “완료 로그”가 아니라 `plans/g1-a-contract-ingress.md`의 각 완료 stage pointer가 가리키는 로그다. Contract decision closure, Schema/tool/fixture sync, Codex structured ingress evidence의 pointer 로그에서 최신 완료 기록·실제 변경·검증 결과를 확인한다. 해당 stage의 plan 상태와 pointer 로그의 결과가 모두 완료를 가리키지 않으면 closeout을 활성화하지 않는다.
- handoff의 실제 내용은 history entry의 표로 append-only 기록한다. 기존 handoff 표를 고쳐 쓰지 않는다.
- 추가 handoff나 기존 handoff의 정정·범위 변경이 생기면 W2 handoff register에 항목을 추가하거나 상태를 갱신하고, 새 history entry에 해당 내용을 기록한다.
- 사용자가 handoff 기록 추가를 요청하면, agent는 기록 전 기존 W2 block의 새 entry인지 독립된 새 block인지와 근거를 먼저 보고하고 확인받은 뒤 추가한다.
- W1~W3이 완료되고 G1-A 범위 밖의 알려진 작업이 G1-B·G1-C·G1-D 중 해당 phase에 모두 handoff로 배치됐으면 이 로그를 `decided`로 전환한다.

### {W2}

- W2는 아래 register의 모든 적용 대상 항목이 handoff history에 기록됐거나 비적용으로 판정될 때까지 완료하지 않는다.

| Work Item | 대상 | handoff 필요 여부 | history 기록 위치 | 상태 |
| --- | --- | --- | --- | --- |
| W2-1 | G1-B | 필요 | `2026-07-19 · Pre-registered G1-B handoff`; `2026-07-19 16:01 · G1-B handoff correction: content shape and inbound intent`; `2026-07-19 16:14 · G1-B handoff correction references` | 사전 등록됨 — closeout W1 재검증 대기 |
| W2-2 | G1-C | 필요 | `2026-07-19 · Pre-registered G1-C handoff` | 사전 등록됨 — closeout W1 재검증 대기 |
| W2-3 | G1-D | 필요 | `2026-07-19 · Pre-registered G1-D handoff` | 사전 등록됨 — closeout W1 재검증 대기 |

## 2026-07-18 · closeout 대기 로그 생성

closeout 작업 흐름의 pointer만 준비했다. 아직 활성 단계가 아니므로 결과나 handoff를 기록하지 않는다.

### 2026-07-19 15:13 · Pre-registered G1-B handoff

G1-A schema/tool/fixture stage에서 이미 확정된 G1-B handoff를 사전 등록한다. 이는 closeout을 활성화하거나 W2-1을 완료하는 기록이 아니다. Codex ingress evidence 완료 뒤 W1에서 owner 문서·현재 코드·검증 결과와 다시 대조한다.

| 대상 | 이후에 할 일 | G1-A에서 넘기는 이유 | 참고할 입력 | 완료 조건 |
| --- | --- | --- | --- | --- |
| G1-B | canonical envelope·delivery correlation으로 cutover하고, `parentMessageId`/`chatId` 임시 투영을 대체한다. | typed tool은 `inReplyToDeliveryId`를 받지만 현재 daemon/store는 아직 기존 correlation field에 투영한다. | `docs/specs/aiox-message-lifecycle.md` §4, `docs/architecture/local-runtime-routing-and-delivery.md`, `docs/architecture/local-runtime-store-and-repositories.md`, `logs/2026-07-18-G1-A-schema-typed-tool-fixture.md` | delivery 기반 reply authorization·source-only routing·fan-out acceptance와 migration 경계가 검증된다. |

### 2026-07-19 15:15 · Pre-registered G1-C handoff

G1-A contract/fixture stage에서 확정된 G1-C handoff를 사전 등록한다. 이는 closeout을 활성화하거나 W2-2를 완료하는 기록이 아니다. Codex ingress evidence 완료 뒤 W1에서 capability/degradation 관찰 결과를 함께 대조한다.

| 대상 | 이후에 할 일 | G1-A에서 넘기는 이유 | 참고할 입력 | 완료 조건 |
| --- | --- | --- | --- | --- |
| G1-C | target adapter의 automatic delivery ack와 deliveryId 기반 ack dedupe를 구현하고, adapter-owned invocation idempotency·accepted-result recovery, retry/backoff, queued flush, stale/runtime failure 처리를 검증한다. | G1-A는 automatic ack의 control-plane 방향과 typed acceptance boundary만 확정했다. ack/retry/idempotency의 실제 구현과 Tier 3 ingress의 unconfirmed/degradation 처리는 G1-C 범위다. | `docs/specs/aiox-message-lifecycle.md` §4.3–§4.5, `docs/specs/aiox-open-deferred.md`, `docs/product/roadmap.md` G1-C, `logs/2026-07-18-G1-A-Codex-structured-ingress-evidence.md` | capability별 ack·dedupe·retry·failure 경계가 delivery correlation 기준으로 검증되고, 보장하지 못하는 경로는 degradation 또는 명시적 manual action으로 남는다. |

### 2026-07-19 15:15 · Pre-registered G1-D handoff

G1-A contract/fixture stage에서 확정된 G1-D handoff를 사전 등록한다. 이는 closeout을 활성화하거나 W2-3을 완료하는 기록이 아니다. G1-B canonical cutover와 G1-A Codex ingress evidence 결과를 W1에서 함께 대조한다.

| 대상 | 이후에 할 일 | G1-A에서 넘기는 이유 | 참고할 입력 | 완료 조건 |
| --- | --- | --- | --- | --- |
| G1-D | authenticated source와 route authorization을 runtime guard로 구현하고, forged/wrong correlated reply, `replyExpected:false` reply, consumed-right duplicate reply, route bypass를 negative test로 거절한다. | G1-A는 typed request·narrow reply right·stable error 경계를 확정했지만, 실제 source authentication·route authorization·secret/socket boundary enforcement은 구현하지 않았다. | `docs/specs/aiox-message-lifecycle.md` §4.2·§4.4, `docs/product/roadmap.md` G1-D, `docs/specs/aiox-capability-policy.md`, `docs/decisions/original-delivery-narrow-reply-right.md` | Claude·Codex 경로 모두에서 unauthenticated/forged ingress와 invalid correlation·route bypass가 거절되고, runtime secret·token·socket boundary의 잔여 위험이 검증된다. |

### 2026-07-19 16:01 · G1-B handoff correction: content shape and inbound intent

G1-A corrective follow-up에서 current pre-v1 daemon의 typed ingress compatibility surface를 재검토했다. G1-B handoff에 기존 reply correlation projection 외에 다음 두 항목을 추가한다. 이는 closeout을 활성화하거나 W2-1을 완료하지 않으며, Codex ingress evidence 완료 뒤 W1에서 다시 대조한다.

| 대상 | 이후에 할 일 | G1-A에서 넘기는 이유 | 완료 조건 |
| --- | --- | --- | --- |
| G1-B | daemon request의 `content: string | { text }`, 별도 `text?`, `typedText()` fallback을 제거하고 daemon tests를 `{ text }` 입력으로 이관한다. | typed adapter tool은 이미 `{ text }`만 전송하지만 pre-v1 daemon은 두 content shape를 계속 수용한다. | daemon ingress와 tests가 typed content shape 하나만 사용한다. |
| G1-B | canonical inbound envelope에 `intent`를 노출해 recipient가 `conclusion`을 구조적으로 인식하게 한다. | G1-A에서는 Codex/Claude의 본문 `[[CONCLUDE]]` marker를 제거했다. 현재 inbound envelope는 intent를 노출하지 않는다. | recipient가 canonical envelope의 `intent: conclusion`으로 종료를 인식하며 본문 marker가 필요 없다. |

### 2026-07-19 16:14 · G1-B handoff correction references

Claude review의 low finding을 반영해 G1-B handoff correction의 참고 입력을 보강한다. 이 entry는 기존 handoff 표를 고치지 않는다.

| 대상 | 참고할 입력 |
| --- | --- |
| content dual-shape shim 제거 | `src/daemon/state.ts`의 request interfaces와 `typedText()`, `tests/unit/daemon/codex-ingress.test.ts`, `tests/unit/daemon/claude-channel.test.ts`의 legacy content/text caller |
| inbound envelope intent 노출 | `docs/specs/aiox-message-lifecycle.md` §4.1–§4.2, `src/adapters/codex/mcp-server.ts`의 envelope instruction, `src/adapters/claude/channel-server.ts`의 `buildChannelNotification` |

closeout W1에서 위 source와 G1-B canonical envelope implementation 결과를 다시 대조한다.
