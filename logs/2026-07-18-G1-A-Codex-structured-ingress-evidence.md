---
topic: G1-A Codex structured ingress evidence
description: Codex named app-server surface에서 typed A2A ingress의 관찰 증거를 수집하고 capability와 degradation을 분류하는 대기 단계.
status: open
---

## Work Items

- [ ] W1 named app-server surface에서 typed ingress, canonical correlation, wake-up·active-turn 및 실패 모드 evidence를 수집하고 capability/degradation으로 분류한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 이 stage는 Codex named app-server surface의 관찰 증거를 수집하고 capability/degradation을 분류한다. typed envelope·schema 구현의 완료나 G1-C reliability 구현을 대신 소유하지 않으며, schema/tool/fixture stage의 확정 typed contract를 소비한 뒤 활성화한다.
- G0가 Codex CLI version·검증일·OS·Node·version/capability preflight와 supported fallback 또는 명시적 실패 posture를 구현·검증한다. 이 stage는 그 결과를 실행 환경 evidence로 기록한다. 공식 지원 OS는 macOS·Linux이며 WSL2는 지원 범위 밖이다.
- 현재 Codex adapter는 Tier 3다. daemon-owned per-agent app-server, WebSocket, proxy, fixed MCP projection 및 turn/start compatibility path는 current fact이나 typed lifecycle·canonical ID propagation·runtime automatic receipt를 보장하지 않는다. generic turn/start 성공은 named app-server surface 검증이나 Tier 2 claim을 대체하지 않는다.
- 2026-06-11 version-generated schema에서 thread/inject_items, turn/steer, turn/started|completed, outputSchema, thread/tokenUsage/updated의 존재는 확인됐다. 이 stage는 그 behavior·usage visibility·Tier 2 semantics와 TUI 표시·idle wake-up·active-turn 충돌·canonical deliveryId 보존을 직접 검증한다. clientUserMessageId는 public docs 계약으로 확인되지 않았으므로 deliveryId binding 후보로만 취급한다.
- timeout, app-server process exit, WebSocket drop, unsupported method를 관찰해 evidence와 failure artifact를 남긴다. wake-up·ack·correlation·dedupe를 보장하지 못하면 Tier 2로 과장하지 않고 degradation 또는 G1-C handoff로 분류한다. automatic ack wiring/dedupe, retry/backoff, queued flush, stale/runtime recovery는 G1-C owner다.
- 입력 owner: gate/evidence 형식은 docs/product/roadmap.md G0·G1-A·G1-C, named-surface 제약은 docs/specs/aiox-open-deferred.md §9, tier/degradation은 docs/specs/aiox-adapter-model.md §5, current app-server/WebSocket/proxy/runtime gap은 docs/architecture/local-runtime-codex-adapter.md §7.2–§7.9, typed contract/canonical correlation은 docs/specs/aiox-message-lifecycle.md §4.1–§4.4, topology는 docs/decisions/codex-per-agent-app-server.md, runtime validation policy는 docs/decisions/runtime-support-and-agent-cli-validation-policy.md가 소유한다.
- 계약 결정의 상세 경위·대체된 중간 논의·최종 handoff 추가 근거가 필요할 때는 logs/2026-07-10-G1-A-contractingress-freeze.md를 확인한다. 이 stage의 실행 기준은 이 {Global}과 여기서 가리키는 owner 문서이며, 과거 로그의 superseded된 판단을 현재 계약으로 되살리지 않는다.

## 2026-07-18 · 2026-07-18 · Codex ingress evidence stage prepared

Codex structured ingress evidence stage의 독립 로그를 준비했다. 이 단계는 named app-server surface를 직접 관찰해 evidence와 degradation을 분류하며, generic turn/start 경로나 Tier 2 추정으로 대체하지 않는다.
현재 Tier 3 기준선, 환경 preflight, 관찰·실패 시나리오, G1-C reliability 경계와 owner 입력을 Required Context에 복원했다. plan pointer를 연결했지만 stage는 아직 대기 상태다.

### 2026-07-18 01:48 · 2026-07-18 · Claude review precision corrections applied

Claude 검토의 Nit 3건을 반영했다. G0는 preflight/fallback 구현·검증 owner이고 Codex stage는 그 결과를 evidence로 기록한다고 분리했다.
named app-server method는 존재 확인됨과 behavior·usage visibility·Tier semantics 검증 대상을 구분했으며, current app-server/WebSocket/proxy 근거의 Codex architecture 범위를 §7.2–§7.9로 정정했다.
