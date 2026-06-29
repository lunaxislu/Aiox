---
topic: workspace reset stage8 W3 specs retrofit
description: workspace reset stage 8 W3 — docs/specs/aiox-a2a.md 인덱스 + slice 7개를 승인된 규칙(Related/Status, repo-path wikilink, Evidence 형식, > 컨텍스트: 대체)으로 one-by-one 검토·retrofit. 기존 §N 헤딩·inbound anchor는 migration 아니면 보존. docs/specs/AGENTS.md §3/§4 기준 준수.
status: decided
---

## Work Items

- [x] W1 인덱스 — `docs/specs/aiox-a2a.md` : 역할·링크·내용 검토 → 필요 시 Related/Status·repo-path wikilink retrofit
- [x] W2 `docs/specs/aiox-adapter-model.md` — `> 컨텍스트:` 형식·bare wikilink·evidence 형식 검토·retrofit
- [x] W3 `docs/specs/aiox-capability-policy.md` — 동일
- [x] W4 `docs/specs/aiox-compose-contract.md` — 동일
- [x] W5 `docs/specs/aiox-federation-remote.md` — 동일
- [x] W6 `docs/specs/aiox-message-lifecycle.md` — 동일
- [x] W7 `docs/specs/aiox-open-deferred.md` — 동일
- [x] W8 `docs/specs/aiox-runtime-profile-namespace.md` — 동일

## 작업 방식 (one-by-one)

각 파일(S0~S7)을 독립 판정 단위로 다룬다. 순서는 S0 인덱스 → S1~S7 slice 순이지만, 인덱스 검토 결과가 이후 slice 적용 기준을 바꾸면 재확인한다.

### 각 파일 검토 단계

1. **현재 상태 확인**
   - `> 컨텍스트:` callout 잔존 여부
   - bare wikilink(`[[spec-name]]` 형식) vs repo-path wikilink(`[[docs/specs/...]]`) 현황
   - `Evidence:` 블록 존재 여부 / inline backtick evidence 분산 여부
   - `scripts/check-markdown-inline-code <파일>` 실행

2. **current/as-built claim 검증**
   - `src/`, `tests/` 코드와 대조해 claim의 `Current Contract` vs `Target Contract` 분류
   - stale line range 여부 확인
   - spec drift(`Current Contract`인데 code와 어긋남) vs intent drift(`Target`을 code 한계로 낮추는 시도) 구분

3. **판정**
   - blocking drift 여부 보고
   - W3 retrofit 기준 충족 여부(Related/Status, repo-path wikilink, Evidence 형식)
   - `Related:` 후보 — document-level prerequisite(decorative graph link 금지)
   - `Status:` — slice 전체가 Current Contract/Target Contract 중 어느 상태인지

4. **반영**
   - `> 컨텍스트:` → `Related:` + `Status:` + slice 역할 문장으로 대체
   - bare wikilink → repo-path wikilink 전환
   - stale line range 보정 + compact `Evidence:` 또는 claim-adjacent evidence 추가
   - blocking drift가 있으면 반영 전 @user 보고
   - 기존 §N 헤딩·inbound anchor는 inbound ref를 함께 갱신하는 migration이 아니면 보존

5. **검증**
   - `scripts/check-markdown-inline-code <파일>` → exit 0
   - `git diff --check -- <파일>` → exit 0
   - bare wikilink 재검색: `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" <파일>` → exit 1
   - wikilink target 실재 확인

### 판정 기준 (docs/specs/AGENTS.md 기준)

- `Current Contract`: 현재 code/tests가 제공하는 외부 동작 — code와 어긋나면 stale 판정 대상
- `Target Contract` / `Normative`: 목표·규범 계약 — code가 못 한다는 이유로 current/as-built로 낮추지 않음
- `Implementation Gap`: current implementation이 current/target contract와 어긋나는 지점
- `Deferred`: 보류된 contract

### 검토 시 참조 문서

- `docs/specs/AGENTS.md` §3(aiox-a2a index-slice ownership) · §4(Spec Slice Skeleton) · §5(Drift 처리) · §6(Validation)
- `docs/AGENTS.md` Links And Read Paths · Evidence And Sources · Change And Drift Validation
- `docs/architecture/local-agent-runtime.md` 인덱스 (관련 implementation owner)

## 2026-06-29 · child log 생성 — W6에서 분리, W1(인덱스)부터 착수

Parent pointer: `logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md` W3.

W6 child log(`logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md`)에서 specs retrofit 작업을 분리해 이 파일을 생성했다. 작업 방식은 W2 architecture와 동일하게 one-by-one이다.

- 대상: `docs/specs/aiox-a2a.md` 인덱스(W1) + slice 7개(W2~W8)
- 진행 방식: 각 파일을 5단계(현재 상태 확인 → claim 검증 → 판정 → 반영 → 검증) 독립 단위로 처리
- 판정 기준: `docs/specs/AGENTS.md` §3~§6 + `docs/AGENTS.md` 공통 계약
- 제약: 기존 §N 헤딩·inbound anchor는 migration 아니면 보존

다음 행동: W1 — `docs/specs/aiox-a2a.md` 인덱스의 역할·링크·내용 검토·retrofit 착수.

## 2026-06-29 · W1 인덱스 검증·retrofit 완료

검증 범위: `docs/specs/aiox-a2a.md` 인덱스를 `docs/AGENTS.md` Links/Evidence 규칙과 `docs/specs/AGENTS.md` §3 index ownership 기준으로 검증했다.

- [Fact] inline-code check PASS: `scripts/check-markdown-inline-code docs/specs/aiox-a2a.md` → exit 0.
- [Fact] whitespace check PASS: `git diff --check -- docs/specs/aiox-a2a.md` → exit 0.
- [Fact] bare wikilink check: `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" docs/specs/aiox-a2a.md`가 수정 전 18건을 찾았고, 수정 후 exit 1(0건)이다.
- [Fact] target files exist: `docs/specs/` 하위 slice 7개(`aiox-runtime-profile-namespace`, `aiox-message-lifecycle`, `aiox-adapter-model`, `aiox-compose-contract`, `aiox-capability-policy`, `aiox-federation-remote`, `aiox-open-deferred`)가 존재한다.
- [Fact] current implementation claim evidence를 인접 보강했다: agent DB id/name mapping → `src/store/schema.ts:16-28`, `src/store/repositories/agents.ts:19-26`, `src/store/repositories/agents.ts:112-154`; `messages.type` → `src/core/messages.ts:7-23`, `src/store/schema.ts:48-56`.
- [Judgment] `Related:`/document-level `Status:`는 추가하지 않았다. 인덱스 본문과 Document map이 required read path를 이미 제공하고, 문서 전체는 Normative/Current/Committed target/Open 상태가 섞여 있어 단일 document-level status가 오해를 만든다.
- [Judgment] blocking spec/code drift는 W1 범위에서 확인되지 않았다. `agent://local/<profile>/<agent-name>` canonical address와 URL percent-encoding 비교는 v1 Normative target로 남아 있고, 현재 구현 claim으로 낮추지 않았다.

다음 행동: W2 — `docs/specs/aiox-adapter-model.md` slice를 같은 절차로 검증·retrofit한다.

## 2026-06-29 · W2 adapter-model 검토 보고 — 수정 전 판정

요청: @user "검토 및 보고". 이 블록은 `docs/specs/aiox-adapter-model.md`의 수정 전 검토 결과만 기록한다. 문서 본문은 아직 변경하지 않았다.

**확인한 사실:**

- `scripts/check-markdown-inline-code docs/specs/aiox-adapter-model.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-adapter-model.md` → exit 0 (PASS).
- bare wikilink check에서 `docs/specs/aiox-adapter-model.md:3`의 `[[aiox-a2a]]` 1건이 확인됐다. 상위 `docs/AGENTS.md`의 repo 기준 path 규칙에는 맞지 않는다.
- `> 컨텍스트:` callout이 `docs/specs/aiox-adapter-model.md:3`에 남아 있다. W3 child 작업 방식은 이를 `Related:`/`Status:`/역할 문장으로 대체할지 파일별 판정한다.
- 문서가 인용한 주요 current evidence는 현행 code/test와 대체로 일치한다:
  - `AgentAdapter { kind, inject(input) }`와 `AdapterInjectResult` success/failed/deferred: `src/adapters/contract.ts:37-56`.
  - router dispatch의 adapter lookup, deferred 처리, queued 유지: `src/adapters/router.ts:87-114`, `src/adapters/router.ts:140-178`, `tests/unit/adapters/fake-integration.test.ts:437-541`.
  - production message path의 Codex/Claude 직접 분기: `src/daemon/state.ts:1274-1277`.
  - pair slot generalization: `src/core/pairs.ts:23-45`, `src/core/pairs.ts:76-130`, `tests/unit/core/pairs.test.ts:110-159`.
  - Codex app-server/TUI launch, fixed MCP projection, WebSocket/proxy attach, proxy binding, MCP send/reply descriptions: `src/adapters/codex/launcher.ts:40-119`, `src/adapters/codex/runtime.ts:304-365`, `src/adapters/codex/proxy.ts:58-193`, `src/adapters/codex/mcp-server.ts:140-165`.
  - Claude plugin/channel launch, identity/socket injection, channel tools/register, unauthenticated `/send` boundary: `src/adapters/claude/launcher.ts:9-27`, `src/adapters/claude/launcher.ts:94-118`, `src/adapters/claude/launcher.ts:189-209`, `src/adapters/claude/channel-server.ts:258-304`, `src/adapters/claude/channel-server.ts:432-456`, `src/adapters/claude/channel-server.ts:491-520`, `src/adapters/claude/injector.ts:21-78`.
- Wikilink targets used in the file exist for checked targets: `docs/specs/aiox-a2a.md`, `src/adapters/contract.ts`, `src/adapters/codex/launcher.ts`, `src/adapters/claude/launcher.ts`, `src/core/pairs.ts`.

**판정:**

- [Fact] 형식 retrofit 필요: `> 컨텍스트:`와 bare `[[aiox-a2a]]`는 W3 기준 미충족이다.
- [Judgment] blocking spec/code drift는 현재 검토 범위에서 확인되지 않았다. 문서의 4-slot/tier 본문은 target/normative compatibility model이고, current caveat와 matrix는 현행 구현 한계를 Implementation Gap/preview로 구분하고 있어 code 한계로 target contract를 낮추는 오류는 보이지 않는다.
- [Judgment] document-level `Status:`는 추가하지 않는 편이 맞다. 이 slice는 Normative/Committed target, Current caveat, Implementation Gap, Exploratory fallback이 섞여 있어 단일 status가 오해를 만든다. 필요한 경우 claim/section-local status만 보강한다.
- [Judgment] `Related:`는 `[[docs/specs/aiox-a2a]]` 1개가 후보지만 필수는 아니다. 인덱스가 required read path라는 뜻이 문서 상단에서 사라지면 body 역할 문장으로 보존하거나, 문서 전체 prerequisite로 판단해 `Related:`로 둔다. Broad graph link는 추가하지 않는다.

**다음 행동 후보:** @user 승인 또는 다음 실행 요청 시 W2 본문을 국소 retrofit한다: `> 컨텍스트:` 제거, `[[aiox-a2a]]` → `[[docs/specs/aiox-a2a]]`, section/claim 상태 표현 최소 보강, 필요 시 inline evidence를 현재 docs/AGENTS Evidence 형식에 맞게 좁게 정리한 뒤 W2 검증 명령을 재실행한다.

## 2026-06-29 · W2 adapter-model retrofit 반영 완료

@user 승인으로 직전 검토 보고의 국소 retrofit을 `docs/specs/aiox-adapter-model.md`에 반영했다.

**반영:**

- `> 컨텍스트:` callout 제거.
- bare wikilink `[[aiox-a2a]]`를 repo-path wikilink `[[docs/specs/aiox-a2a]]`로 전환.
- 인덱스가 상태 어휘·layer model·glossary를 소유하고, 이 slice가 adapter model contract와 current implementation caveat를 소유한다는 역할 문장으로 대체.
- 문서가 mixed state(Current caveat / Implementation Gap / target-normative model / exploratory fallback)를 포함하므로 document-level `Status:`는 추가하지 않았다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/specs/aiox-adapter-model.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-adapter-model.md` → exit 0 (PASS).
- `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" docs/specs/aiox-adapter-model.md` → exit 1, 0건 (PASS).
- `docs/specs/aiox-a2a.md` target exists (PASS).

**판정:** W2 완료. 다음 행동은 W3 — `docs/specs/aiox-capability-policy.md`를 같은 절차로 검토·retrofit한다.

## 2026-06-29 · W3 capability-policy 검토 보고 — 수정 전 판정

요청: @user "검토 및 보고 하라". 이 블록은 `docs/specs/aiox-capability-policy.md`의 수정 전 검토 결과만 기록한다. 문서 본문은 아직 변경하지 않았다.

**확인한 사실:**

- `scripts/check-markdown-inline-code docs/specs/aiox-capability-policy.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-capability-policy.md` → exit 0 (PASS).
- bare wikilink check에서 2건 확인:
  - `docs/specs/aiox-capability-policy.md:3` `[[aiox-a2a]]`
  - `docs/specs/aiox-capability-policy.md:97` `[[claude-channel-trust-and-registration]]`
- `> 컨텍스트:` callout이 `docs/specs/aiox-capability-policy.md:3`에 남아 있다. W3 child 작업 방식은 이를 `Related:`/`Status:`/역할 문장으로 대체할지 파일별 판정한다.
- 주요 current implementation caveat는 현행 code/test와 대체로 일치한다:
  - Codex fixed aiox MCP injection: `src/adapters/codex/launcher.ts:88-119`, `tests/unit/adapters/codex-launcher.test.ts:133-170`.
  - Claude inline MCP config와 plugin activation identity env: `src/adapters/claude/launcher.ts:94-117`, `src/adapters/claude/launcher.ts:189-206`, `tests/unit/adapters/claude-channel.test.ts:663-693`, `tests/unit/adapters/claude-channel.test.ts:711-740`.
  - Claude daemon registration token check: `src/adapters/claude/channel-server.ts:491-507`, `src/daemon/state.ts:926-953`.
  - Claude `/send` ingress auth gap: `src/adapters/claude/channel-server.ts:432-456` has no request auth header check.
  - Codex registration/ingress authorization: `src/daemon/state.ts:1044-1073`, `src/daemon/state.ts:1711-1758`.
  - DB in-memory caveat and dormant file-backed path scaffold: `src/daemon/run.ts:24-26`, `src/bin/aiox.ts:238-245`, `src/bin/aiox.ts:361-363`, `src/config/paths.ts:105-120`.
- Checked target files exist: `docs/specs/aiox-a2a.md`, `docs/decisions/claude-channel-trust-and-registration.md`, cited `src/` files.

**판정:**

- [Fact] 형식 retrofit 필요: `> 컨텍스트:`와 bare wikilink 2건은 상위 `docs/AGENTS.md` repo-path wikilink 규칙과 W3 기준 미충족이다.
- [Judgment] blocking spec/code drift는 현재 검토 범위에서 확인되지 않았다. 문서는 policy model을 Normative target으로 두고, projection/sandbox enforcement 미구현 및 fixed aiox projection만 current로 제한하고 있어 code 한계를 target contract로 낮추는 오류도 보이지 않는다.
- [Judgment] document-level `Status:`는 추가하지 않는 편이 맞다. 이 slice는 Normative target, Current caveat, Implementation Gap, reserved/non-guarantee sandbox vocabulary가 섞여 있어 단일 status가 오해를 만든다. 상단 역할 문장과 section/claim-local status 유지가 더 좁다.
- [Judgment] `Related:`는 추가하지 않는 편이 맞다. `docs/specs/aiox-a2a`는 인덱스 read path지만 body 역할 문장으로 충분히 복원 가능하고, decision 링크는 특정 implementation gap claim의 provenance라 body 인접 링크가 더 좁다.

**다음 행동 후보:** @user 승인 또는 다음 실행 요청 시 W3 본문을 국소 retrofit한다: `> 컨텍스트:` 제거, `[[aiox-a2a]]` → `[[docs/specs/aiox-a2a]]`, `[[claude-channel-trust-and-registration]]` → `[[docs/decisions/claude-channel-trust-and-registration]]`, 상단 역할 문장으로 상태 어휘·layer model owner와 이 slice의 §7/§7.1/§7.2 소유 범위를 보존한다. 필요하면 current caveat evidence를 repo-path wikilink 형식으로만 정리하고, 문서 의미는 바꾸지 않는다.

## 2026-06-29 · W3 capability-policy retrofit 반영 완료

@user 지시로 직전 검토 보고의 국소 retrofit을 `docs/specs/aiox-capability-policy.md`에 반영했다. 최초 요청은 "반영만 하고 로그에는 작성 대기"였으므로 owner 문서 반영과 검증을 먼저 수행했고, 이후 @user가 "로그에 반영하라"고 지시해 이 블록을 추가한다.

**반영:**

- `> 컨텍스트:` callout 제거.
- bare wikilink `[[aiox-a2a]]`를 repo-path wikilink `[[docs/specs/aiox-a2a]]`로 전환.
- bare decision wikilink `[[claude-channel-trust-and-registration]]`를 repo-path wikilink `[[docs/decisions/claude-channel-trust-and-registration]]`로 전환.
- 상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고, 이 slice가 §7·§7.1·§7.2를 소유한다는 범위를 보존했다.
- document-level `Status:`와 `Related:`는 추가하지 않았다. mixed-state slice라 단일 status가 오해를 만들 수 있고, 인덱스 read path와 decision provenance는 body-local link로 충분하다는 직전 판정을 유지했다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/specs/aiox-capability-policy.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-capability-policy.md` → exit 0 (PASS).
- `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" docs/specs/aiox-capability-policy.md` → exit 1, 0건 (PASS).
- `docs/specs/aiox-a2a.md`와 `docs/decisions/claude-channel-trust-and-registration.md` target exists (PASS; 직전 검토에서 확인).

**판정:** W3 완료. 다음 행동은 W4 — `docs/specs/aiox-compose-contract.md`를 같은 절차로 검토·retrofit한다.

@claude evidence wikilink 4건 추가 수정 — `tests/unit/adapters/codex-launcher.test.ts`, `src/adapters/claude/channel-server.ts`, `tests/unit/adapters/claude-channel.test.ts`, `src/config/paths.ts` first mention wikilink 누락 보완.

## 2026-06-29 · W2 adapter-model evidence wikilink 보완

기존 W2 검증 ledger가 `docs/AGENTS.md` Evidence 규칙 "Code/test 파일은 wikilink한다"에 대한 점검을 누락했다. 재검증 결과 evidence wikilink 11건 미충족이 확인돼 수정했다.

- [Fact] evidence wikilink 누락 11건 발견: `src/adapters/router.ts`(1st mention), `tests/unit/adapters/fake-integration.test.ts`, `tests/unit/core/pairs.test.ts`, `src/adapters/codex/runtime.ts`, `src/adapters/codex/proxy.ts`, `src/adapters/codex/mcp-server.ts`, `src/adapters/claude/channel-server.ts`(1st mention), `src/adapters/claude/injector.ts`. 동일 파일 반복 참조(`src/adapters/router.ts` 2nd, `src/adapters/claude/channel-server.ts` 2nd·3rd)는 "한 section 반복 → 첫 mention만 wikilink" 규칙 적용해 plain text 유지.
- [Fact] 각 파일 first mention에 `[[src/...]]`/`[[tests/...]]` wikilink 추가 반영.
- [Fact] `scripts/check-markdown-inline-code docs/specs/aiox-adapter-model.md` → exit 0 (PASS).
- [Fact] `git diff --check -- docs/specs/aiox-adapter-model.md` → exit 0 (PASS).
- [Fact] `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" docs/specs/aiox-adapter-model.md` → exit 1, 0건 (PASS).
- [Judgment] blocking spec/code drift 없음. 4-slot/capability tier Normative contract, Current implementation caveat, Implementation Gap 분류가 `docs/specs/AGENTS.md` §5 기준 부합. document-level `Status:`/`Related:` 생략 유지.

## 2026-06-29 · W4 compose-contract 검토 보고 — 수정 전 판정

요청: @user "검토하라". 이 블록은 `docs/specs/aiox-compose-contract.md`의 수정 전 검토 결과만 기록한다. 문서 본문은 아직 변경하지 않았다.

**확인한 사실:**

- `scripts/check-markdown-inline-code docs/specs/aiox-compose-contract.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-compose-contract.md` → exit 0 (PASS).
- bare wikilink check에서 1건 확인: `docs/specs/aiox-compose-contract.md:3` `[[aiox-a2a]]`.
- `> 컨텍스트:` callout이 `docs/specs/aiox-compose-contract.md:3`에 남아 있다. W3 child 작업 방식은 이를 `Related:`/`Status:`/역할 문장으로 대체할지 파일별 판정한다.
- `rg -n "compose|Compose|compose.yaml" src tests package.json README.md` → exit 1, 0건. 문서의 "현재 CLI/config에는 구현되어 있지 않다" 및 "no compose implementation or user-facing command outside this spec" spot-check와 일치한다.
- 현재 CLI parse/invocation에는 `compose`/`attach <agent>` command가 없다. 구현된 사용자 표면은 `codex`, `claude`, `connect`, `disconnect`, `pair`, `status`, daemon/doctor/plugin 계열이다(`src/cli/parse.ts:214-323`, `src/cli/invocation.ts:157-285`).
- product/roadmap은 compose와 config/onboarding split을 Phase 2로 둔다: `docs/product/roadmap.md:63`, `docs/product/roadmap.md:130-142`. G2는 tmux view driver 1개를 포함하지만 compose.yaml을 요구하지 않는다.
- product 문서는 compose contract owner를 `docs/specs/aiox-compose-contract.md`로 둔다(`docs/product/product.md:80-81`).
- `docs/specs/aiox-a2a.md` target exists, and index links §6 to `[[docs/specs/aiox-compose-contract]]`.

**판정:**

- [Fact] 형식 retrofit 필요: `> 컨텍스트:`와 bare `[[aiox-a2a]]`는 상위 `docs/AGENTS.md` repo-path wikilink 규칙과 W3 기준 미충족이다.
- [Judgment] blocking spec/code drift는 현재 검토 범위에서 확인되지 않았다. Compose/user config/view driver 내용은 `Committed target`/Phase 2 target으로 쓰여 있고, current claim은 "미구현"으로 제한되어 현행 CLI와 맞다.
- [Judgment] `aiox attach <agent>`는 현재 구현 command claim이 아니라 compose target 모델의 provisional command naming으로 읽힌다. 다만 주변에 `aiox compose up`과 함께 command 형태로 제시되어 있으므로, retrofit 시 "provisional target command names" 문맥을 상단 역할 문장이나 해당 bullet 안에서 조금 더 선명하게 할 수 있다.
- [Judgment] document-level `Status:`는 추가하지 않는 편이 맞다. 이 slice 전체는 대부분 `Committed target`이지만 current non-implementation caveat, provisional command/schema naming, implementation review note가 섞여 있어 기존 section-local status 문장이 더 정확하다.
- [Judgment] `Related:`는 추가하지 않는 편이 맞다. `docs/specs/aiox-a2a`는 index read path지만 body 역할 문장으로 충분히 복원 가능하다. Broad graph link는 추가하지 않는다.
- [Opinion] current negative evidence(`rg ... finds no compose implementation`)는 특정 code/test 파일 근거가 아니라 repo scan 근거다. 현재 문장으로도 claim↔evidence mapping은 복원되지만, 반영 시 가독성을 위해 상단 status 문장 안에 유지하거나 짧은 inline evidence로 남기는 편이 적절하다. 별도 `Evidence:` block은 단일 negative spot-check라 과하다.

**다음 행동 후보:** @user 승인 또는 다음 실행 요청 시 W4 본문을 국소 retrofit한다: `> 컨텍스트:` 제거, `[[aiox-a2a]]` → `[[docs/specs/aiox-a2a]]`, 상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고 이 slice가 §6 compose target contract와 current non-implementation caveat를 소유한다는 범위를 보존한다. 필요하면 provisional target command naming을 더 명확히 하되, compose/user config를 Current 구현으로 낮추거나 Phase 2 intent를 바꾸지 않는다.

## 2026-06-29 · W4 compose-contract retrofit 반영 완료

@user 지시로 `docs/AGENTS.md`와 `docs/specs/AGENTS.md` 기준에 따라 직전 검토 보고의 국소 retrofit을 `docs/specs/aiox-compose-contract.md`에 반영했다.

**반영:**

- `> 컨텍스트:` callout 제거.
- bare wikilink `[[aiox-a2a]]`를 repo-path wikilink `[[docs/specs/aiox-a2a]]`로 전환.
- 상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고, 이 slice가 §6 compose target contract와 current non-implementation caveat를 소유한다는 범위를 보존했다.
- `command` 표현을 `target command`로 좁혀 `aiox compose up`/`aiox attach <agent>`가 현재 구현 명령이 아니라 v1 compose contract 승인 전 provisional target naming이라는 문맥을 선명하게 했다.
- document-level `Status:`와 `Related:`는 추가하지 않았다. section-local status와 body read path가 더 좁고, `docs/specs/aiox-a2a` index read path는 상단 역할 문장으로 충분히 복원된다는 직전 판정을 유지했다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/specs/aiox-compose-contract.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-compose-contract.md` → exit 0 (PASS).
- `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" docs/specs/aiox-compose-contract.md` → exit 1, 0건 (PASS).
- `docs/specs/aiox-a2a.md` target exists (PASS).

**판정:** W4 완료. 다음 행동은 W5 — `docs/specs/aiox-federation-remote.md`를 같은 절차로 검토·retrofit한다.

## 2026-06-29 · W5 federation-remote 검토 보고 — 수정 전 판정

요청: @user "`docs/AGENTS.md` 와 `docs/specs/AGENTS.md`에 따라 검토하라". 이 블록은
`docs/specs/aiox-federation-remote.md`의 수정 전 검토 결과만 기록한다. 문서 본문은 아직 변경하지 않았다.

**확인한 사실:**

- `scripts/check-markdown-inline-code docs/specs/aiox-federation-remote.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-federation-remote.md` → exit 0 (PASS).
- bare wikilink check에서 1건 확인: `docs/specs/aiox-federation-remote.md:3` `[[aiox-a2a]]`.
- `> 컨텍스트:` callout이 `docs/specs/aiox-federation-remote.md:3`에 남아 있다. W3 child 작업 방식은 이를
  `Related:`/`Status:`/역할 문장으로 대체할지 파일별 판정한다.
- Current negative evidence 확인: `find src -iname '*federation*' -o -iname '*remote*'` → exit 0, 출력 0건.
  따라서 문서의 "No `src/` federation/remote implementation files are present" 주장은 filename 기준으로는 맞다.
- `remote` 문자열은 Codex remote TUI, daemon client 변수명, test method name에도 존재한다. 따라서 위 미구현 주장은
  "remote라는 단어가 code에 없다"가 아니라 "federation/remote implementation file이 없다"로 읽어야 정확하다.
- local control-plane socket claim은 현행 code와 일치한다: `src/daemon/socket-transport.ts:48-85`에
  `net.createServer` 기반 daemon socket server/listen 흐름이 있고, `src/daemon/socket-transport.ts:118-152`에
  persistent daemon socket client가 있다.
- Windows named pipe/TCP loopback 전환 지점 주석은 실제로 존재한다:
  `src/daemon/socket-transport.ts:281-284`, `src/daemon/socket-transport.ts:430-433`.
- `ws` 의존성은 `package.json:36-43`에 존재한다. 현행 사용처는 Codex adapter WebSocket/proxy 쪽이며,
  daemon-to-daemon WebSocket/token/mTLS 구현은 확인되지 않았다.
- product/roadmap 정합: product는 remote/federation 확장 contract owner를 이 spec slice로 둔다
  (`docs/product/product.md:82-83`). Roadmap은 Phase 3을 "L2 mobile remote MCP exposure → L1 internal federation →
  L3 A2A Protocol bridge" 순서로 둔다(`docs/product/roadmap.md:133-147`), 문서의 L2→L1→L3 exploratory sequencing과 일치한다.
- `docs/specs/aiox-a2a.md` target exists, and index maps §8 to `[[docs/specs/aiox-federation-remote]]`.
- Evidence 형식 gap: `docs/specs/aiox-federation-remote.md:54`의 `src/daemon/socket-transport.ts:48-85`는 code path/range지만
  `[[src/daemon/socket-transport.ts]]` wikilink가 아니라 plain inline path다. 상위 `docs/AGENTS.md` Evidence 규칙의
  "Code/test 파일은 wikilink한다"에 맞지 않는다.

**판정:**

- [Fact] 형식 retrofit 필요: `> 컨텍스트:`와 bare `[[aiox-a2a]]`는 상위 `docs/AGENTS.md` repo-path wikilink 규칙과
  W3 기준 미충족이다.
- [Fact] evidence wikilink 보완 필요: current local control-plane implementation caveat의 code evidence first mention을
  `[[src/daemon/socket-transport.ts]]` + 정확 range 형태로 바꿔야 한다.
- [Judgment] blocking spec/code drift는 현재 검토 범위에서 확인되지 않았다. Same-daemon local addressing/local socket
  control-plane은 Current로, multi-daemon/remote/federation은 Deferred/Target으로 분리되어 있고 현행 code·roadmap과 맞다.
- [Judgment] document-level `Status:`는 추가하지 않는 편이 맞다. 이 slice는 Current(local addressing/control-plane),
  Deferred/Target(remote/federation), Committed transport direction, Exploratory sequencing이 섞인 mixed-state 문서라
  section-local status 문장이 더 정확하다.
- [Judgment] `Related:`는 추가하지 않는 편이 맞다. `docs/specs/aiox-a2a`는 인덱스 read path지만 body 역할 문장으로
  충분히 복원 가능하고, roadmap/product는 특정 Phase/owner 정합 확인 근거이지 document-level prerequisite로 반복할
  필요는 없다.
- [Opinion] `find src -iname '*federation*' -o -iname '*remote*'`는 negative evidence로는 재현 가능하지만 filename
  기준이므로 과해석되기 쉽다. 반영 시 "implementation files" 기준임을 유지하거나 "no dedicated implementation files"로
  좁히면 더 안전하다.

**다음 행동 후보:** @user 승인 또는 다음 실행 요청 시 W5 본문을 국소 retrofit한다: `> 컨텍스트:` 제거,
`[[aiox-a2a]]` → `[[docs/specs/aiox-a2a]]`, 상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고
이 slice가 §8 federation/remote target contract와 local-control-plane current caveat를 소유한다는 범위를 보존한다.
`src/daemon/socket-transport.ts:48-85` 근거는 `[[src/daemon/socket-transport.ts]]` wikilink + range로 보정한다.
가능하면 negative evidence 문구를 dedicated implementation files 기준으로 좁히되, remote/federation target을 Current로
낮추거나 Phase 3 intent를 바꾸지 않는다.

## 2026-06-29 · W5 federation-remote retrofit 반영 완료

@user 지시로 직전 검토 보고의 국소 retrofit을 `docs/specs/aiox-federation-remote.md`에 반영했다.

**반영:**

- `> 컨텍스트:` callout 제거.
- bare wikilink `[[aiox-a2a]]`를 repo-path wikilink `[[docs/specs/aiox-a2a]]`로 전환.
- 상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고, 이 slice가 §8 federation/remote target contract와 local control-plane current caveat를 소유한다는 범위를 보존했다.
- current negative evidence를 "No dedicated `src/` federation/remote implementation files"로 좁혀 filename 기준 scan을 과해석하지 않도록 했다.
- local control-plane current caveat의 code evidence를 `[[src/daemon/socket-transport.ts]]:48-85` 형식으로 보정했다.
- document-level `Status:`와 `Related:`는 추가하지 않았다. mixed-state slice라 단일 status가 오해를 만들 수 있고, 인덱스 read path는 상단 역할 문장으로 충분하다는 직전 판정을 유지했다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/specs/aiox-federation-remote.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-federation-remote.md` → exit 0 (PASS).
- `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" docs/specs/aiox-federation-remote.md` → exit 1, 0건 (PASS).
- `docs/specs/aiox-a2a.md`와 `src/daemon/socket-transport.ts` target exists (PASS).

**판정:** W5 완료. 다음 행동은 W6 — `docs/specs/aiox-message-lifecycle.md`를 같은 절차로 검토·retrofit한다.

## 2026-06-29 · W6 message-lifecycle 검토 보고 — 수정 전 판정

요청: @user "검토 하라". 이 블록은 `docs/specs/aiox-message-lifecycle.md`의 수정 전 검토 결과만 기록한다.
문서 본문은 아직 변경하지 않았다.

**확인한 사실:**

- `scripts/check-markdown-inline-code docs/specs/aiox-message-lifecycle.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-message-lifecycle.md` → exit 0 (PASS).
- bare wikilink check에서 1건 확인: `docs/specs/aiox-message-lifecycle.md:3` `[[aiox-a2a]]`.
- `> 컨텍스트:` callout이 `docs/specs/aiox-message-lifecycle.md:3`에 남아 있다. W3 child 작업 방식은 이를
  `Related:`/`Status:`/역할 문장으로 대체할지 파일별 판정한다.
- 주요 current implementation caveat는 현행 code/test와 대체로 일치한다:
  - no-route rejection은 현재 `no_active_routes`를 반환한다: `src/daemon/state.ts:323-338`,
    `src/daemon/state.ts:1761-1783`, `tests/unit/daemon/message-fanout-store.test.ts:198-222`,
    `tests/unit/daemon/codex-ingress.test.ts:589-602`.
  - `message_deliveries.id`와 MVP delivery columns는 존재하지만 public v1 `deliveryId` namespace와 ack/retry/reply
    obligation persistence는 없다: `src/store/schema.ts:58-67`, `tests/unit/store/schema.test.ts:174-195`.
  - current reply ingress는 `parentMessageId`/`parent_message_id` 기반 reply message를 만들고 replying agent의 outbound
    route를 사용한다: `src/daemon/state.ts:315-320`, `src/daemon/state.ts:1800-1821`,
    `tests/unit/daemon/codex-ingress.test.ts:633-710`.
  - current in-memory/domain message shape와 fan-out delivery shape는 v1 canonical envelope보다 작다:
    `src/core/messages.ts:17-23`, `src/core/messages.ts:33-74`, `src/core/deliveries.ts:13-35`,
    `src/store/repositories/deliveries.ts:102-112`.
  - current adapter success handling은 delivery를 `delivered` 뒤 곧바로 `completed`로 전이한다:
    `src/daemon/state.ts:1279-1287`.
- Checked target files exist: `docs/specs/aiox-a2a.md`, cited `src/` files, cited `tests/` files.
- Evidence 형식 gap: current evidence 중 여러 code/test path가 `[[src/...]]`/`[[tests/...]]` wikilink 없이 plain inline
  path로 남아 있다. 특히 `tests/unit/daemon/message-fanout-store.test.ts`, `tests/unit/daemon/codex-ingress.test.ts`,
  `src/core/messages.ts`, `src/core/deliveries.ts`, `src/store/repositories/deliveries.ts`, `src/store/schema.ts` first
  mention 보정이 필요하다.

**판정:**

- [Fact] 형식 retrofit 필요: `> 컨텍스트:`와 bare `[[aiox-a2a]]`는 상위 `docs/AGENTS.md` repo-path wikilink 규칙과
  W3 기준 미충족이다.
- [Fact] evidence wikilink 보완 필요: current/as-built evidence의 code/test file first mention은 상위 `docs/AGENTS.md`
  Evidence 규칙에 맞춰 `[[src/...]]` 또는 `[[tests/...]]`로 보정해야 한다.
- [Judgment] blocking spec/code drift는 현재 검토 범위에서 확인되지 않았다. 문서는 canonical envelope, delivery ack,
  reply correlation, persistence minimum을 Normative/target contract로 두고, current implementation caveat에서 현행
  `no_active_routes`, `parentMessageId`, MVP schema, immediate `completed` transition을 gap으로 분리하고 있다.
- [Judgment] document-level `Status:`는 추가하지 않는 편이 맞다. 이 slice는 Normative v1 contract, Current caveat,
  Implementation Gap/Open Issue, Recommended-not-approved notes가 섞인 mixed-state 문서라 단일 status가 오해를 만든다.
- [Judgment] `Related:`는 추가하지 않는 편이 맞다. `docs/specs/aiox-a2a`는 인덱스 read path지만 상단 역할 문장으로
  충분히 복원 가능하고, broad graph link로 승격할 필요는 없다.
- [Opinion] current evidence가 여러 section에 분산되어 있으므로 대규모 `Evidence:` section을 새로 만들기보다 각 current
  caveat의 first file mention만 wikilink로 보정하는 국소 retrofit이 가장 작다.

**다음 행동 후보:** @user 승인 또는 다음 실행 요청 시 W6 본문을 국소 retrofit한다: `> 컨텍스트:` 제거,
`[[aiox-a2a]]` → `[[docs/specs/aiox-a2a]]`, 상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고
이 slice가 §4/§4.1~§4.5 message lifecycle contract와 current implementation caveat를 소유한다는 범위를 보존한다.
plain code/test evidence first mention을 `[[src/...]]`/`[[tests/...]]` wikilink로 보정하되, target contract를 현재 구현
한계로 낮추지 않는다.

## 2026-06-29 · W6 message-lifecycle retrofit 반영 완료

@user 지시로 직전 검토 보고의 국소 retrofit을 `docs/specs/aiox-message-lifecycle.md`에 반영했다.

**반영:**

- `> 컨텍스트:` callout 제거.
- bare wikilink `[[aiox-a2a]]`를 repo-path wikilink `[[docs/specs/aiox-a2a]]`로 전환.
- 상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고, 이 slice가 §4/§4.1~§4.5
  message lifecycle contract와 current implementation caveat를 소유한다는 범위를 보존했다.
- current/as-built evidence의 code/test first mention을 `[[src/...]]`/`[[tests/...]]` wikilink로 보정했다.
- document-level `Status:`와 `Related:`는 추가하지 않았다. mixed-state slice라 단일 status가 오해를 만들 수 있고,
  인덱스 read path는 상단 역할 문장으로 충분하다는 직전 판정을 유지했다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/specs/aiox-message-lifecycle.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-message-lifecycle.md` → exit 0 (PASS).
- `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" docs/specs/aiox-message-lifecycle.md` → exit 1, 0건 (PASS).
- `rg -n "^> 컨텍스트" docs/specs/aiox-message-lifecycle.md` → exit 1, 0건 (PASS).
- `docs/specs/aiox-a2a.md`와 cited `src/`/`tests/` targets exist (PASS).

**판정:** W6 완료. 다음 행동은 W7 — `docs/specs/aiox-open-deferred.md`를 같은 절차로 검토·retrofit한다.

## 2026-06-29 · W7 open-deferred 검토 보고 — 수정 전 판정

요청: @user "검토 하라". 이 블록은 `docs/specs/aiox-open-deferred.md`의 수정 전 검토 결과만 기록한다.
문서 본문은 아직 변경하지 않았다.

**확인한 사실:**

- `scripts/check-markdown-inline-code docs/specs/aiox-open-deferred.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-open-deferred.md` → exit 0 (PASS).
- bare wikilink check에서 1건 확인: `docs/specs/aiox-open-deferred.md:3` `[[aiox-a2a]]`.
- `> 컨텍스트:` callout이 `docs/specs/aiox-open-deferred.md:3`에 남아 있다. W3 child 작업 방식은 이를
  `Related:`/`Status:`/역할 문장으로 대체할지 파일별 판정한다.
- 주요 current local partial claim은 현행 code/test와 대체로 일치한다:
  - `turn/start` injection: `src/adapters/codex/injector.ts:22-63`.
  - loaded thread list: `src/adapters/codex/runtime.ts:242-245`.
  - selected thread binding through proxy: `src/adapters/codex/proxy.ts:46-58`,
    `src/adapters/codex/proxy.ts:151-194`, `tests/unit/adapters/codex-proxy.test.ts:27-97`.
  - runtime failure detection: `src/adapters/codex/runtime.ts:180-190`, `src/adapters/codex/runtime.ts:267-275`.
  - delivery-time selected thread / queued no-loaded-thread handling:
    `src/daemon/state.ts:1418-1482`, `src/daemon/state.ts:1684-1696`.
- Checked target files exist: `docs/specs/aiox-a2a.md`, cited `src/` files, cited `tests/` files.
- Evidence 형식 gap: `Current local partial` evidence에서 `src/adapters/codex/runtime.ts`,
  `src/adapters/codex/proxy.ts`, `tests/unit/adapters/codex-proxy.test.ts`, `src/daemon/state.ts` first mention이
  `[[src/...]]`/`[[tests/...]]` wikilink 없이 plain inline path로 남아 있다. `src/adapters/codex/injector.ts`만
  wikilink 처리되어 있다.
- External Codex app-server surface dated claim(2026-06-11 official app-server surface)은 이번 local retrofit 검토에서
  최신 official docs로 재검증하지 않았다. 문서 자체가 "adapter 착수 시 재확인"을 요구하므로, 현재 검토에서는
  stale 확정이 아니라 revalidation-required provenance로만 보았다.

**판정:**

- [Fact] 형식 retrofit 필요: `> 컨텍스트:`와 bare `[[aiox-a2a]]`는 상위 `docs/AGENTS.md` repo-path wikilink 규칙과
  W3 기준 미충족이다.
- [Fact] evidence wikilink 보완 필요: current/as-built evidence의 code/test file first mention은 상위 `docs/AGENTS.md`
  Evidence 규칙에 맞춰 `[[src/...]]` 또는 `[[tests/...]]`로 보정해야 한다.
- [Judgment] blocking spec/code drift는 현재 검토 범위에서 확인되지 않았다. 문서는 대부분 `Open/deferred` 질문 목록이고,
  Codex structured ingress는 검증 전 Tier 2 승격 금지 및 current local partial caveat로 제한되어 있어 현행 구현 한계를
  target contract로 낮추는 오류가 보이지 않는다.
- [Judgment] document-level `Status:`는 추가하지 않는 편이 맞다. 이 slice는 open/deferred 목록, current local partial,
  external-surface revalidation note, lifecycle policy open questions가 섞인 mixed-state 문서라 단일 status가 오해를 만든다.
- [Judgment] `Related:`는 추가하지 않는 편이 맞다. `docs/specs/aiox-a2a`는 인덱스 read path지만 상단 역할 문장으로
  충분히 복원 가능하고, broad graph link로 승격할 필요는 없다.
- [Opinion] `Current local partial` evidence는 한 bullet 안에 여러 files/ranges가 집중되어 있어, 별도 `Evidence:` block을
  만들기보다 first file mention만 wikilink로 보정하는 국소 retrofit이 가장 작다.

**다음 행동 후보:** @user 승인 또는 다음 실행 요청 시 W7 본문을 국소 retrofit한다: `> 컨텍스트:` 제거,
`[[aiox-a2a]]` → `[[docs/specs/aiox-a2a]]`, 상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고
이 slice가 §9 open/deferred contract questions와 current local partial caveat를 소유한다는 범위를 보존한다.
plain code/test evidence first mention을 `[[src/...]]`/`[[tests/...]]` wikilink로 보정하되, Codex structured ingress를
검증 전 Tier 2로 올리거나 open/deferred 질문을 current contract로 낮추지 않는다.

## 2026-06-29 · W7 open-deferred retrofit 반영 완료

@user 지시로 직전 검토 보고의 국소 retrofit을 `docs/specs/aiox-open-deferred.md`에 반영했다.

**반영:**

- `> 컨텍스트:` callout 제거.
- bare wikilink `[[aiox-a2a]]`를 repo-path wikilink `[[docs/specs/aiox-a2a]]`로 전환.
- 상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고, 이 slice가 §9 open/deferred contract
  questions와 current local partial caveats를 소유한다는 범위를 보존했다.
- `Current local partial` evidence의 code/test first mention을 `[[src/...]]`/`[[tests/...]]` wikilink로 보정했다.
- document-level `Status:`와 `Related:`는 추가하지 않았다. mixed-state open/deferred slice라 단일 status가 오해를
  만들 수 있고, 인덱스 read path는 상단 역할 문장으로 충분하다는 직전 판정을 유지했다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/specs/aiox-open-deferred.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-open-deferred.md` → exit 0 (PASS).
- `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" docs/specs/aiox-open-deferred.md` → exit 1, 0건 (PASS).
- `rg -n "^> 컨텍스트" docs/specs/aiox-open-deferred.md` → exit 1, 0건 (PASS).
- `docs/specs/aiox-a2a.md`와 cited `src/`/`tests/` targets exist (PASS).

**판정:** W7 완료. 다음 행동은 W8 — `docs/specs/aiox-runtime-profile-namespace.md`를 같은 절차로 검토·retrofit한다.

## 2026-06-29 · W8 runtime-profile-namespace 검토 보고 — 수정 전 판정

요청: @user "검토 후 로그를 작성 후 반영 후 로그 작성으로 끝내고 closeout". 이 블록은
`docs/specs/aiox-runtime-profile-namespace.md`의 수정 전 검토 결과만 기록한다. 문서 본문은 아직 변경하지 않았다.

**확인한 사실:**

- `scripts/check-markdown-inline-code docs/specs/aiox-runtime-profile-namespace.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-runtime-profile-namespace.md` → exit 0 (PASS).
- bare wikilink check에서 1건 확인: `docs/specs/aiox-runtime-profile-namespace.md:3` `[[aiox-a2a]]`.
- `> 컨텍스트:` callout이 `docs/specs/aiox-runtime-profile-namespace.md:3`에 남아 있다.
- 주요 current implementation caveat는 현행 code/test와 대체로 일치한다:
  - profile selection과 invalid profile fail-fast: `src/config/paths.ts:20-37`, `tests/unit/config/paths.test.ts:14-52`.
  - socket override/profile namespace: `src/config/paths.ts:88-102`, `tests/unit/config/paths.test.ts:55-84`.
  - state DB path resolver scaffold: `src/config/paths.ts:105-120`, `tests/unit/config/paths.test.ts:87-123`.
  - production daemon durable-store gap: `src/daemon/run.ts:24-26`.
  - CLI/child adapter socket inheritance: `src/bin/aiox.ts:78-102`, `src/bin/aiox.ts:166-180`, `src/cli/invocation.ts:200-254`,
    `src/adapters/codex/launcher.ts:88-119`, `src/adapters/claude/launcher.ts:94-118`.
- Checked target files exist: `docs/specs/aiox-a2a.md`, cited `src/` files, cited `tests/` files.
- Evidence 형식 gap: 마지막 current evidence 묶음에서 `src/cli/invocation.ts`, `src/adapters/codex/launcher.ts`,
  `src/adapters/claude/launcher.ts` first mention이 `[[src/...]]` wikilink 없이 plain inline path로 남아 있다.

**판정:**

- [Fact] 형식 retrofit 필요: `> 컨텍스트:`와 bare `[[aiox-a2a]]`는 상위 `docs/AGENTS.md` repo-path wikilink 규칙과
  W3 기준 미충족이다.
- [Fact] evidence wikilink 보완 필요: current/as-built evidence의 code/test file first mention은 상위 `docs/AGENTS.md`
  Evidence 규칙에 맞춰 `[[src/...]]` 또는 `[[tests/...]]`로 보정해야 한다.
- [Judgment] blocking spec/code drift는 현재 검토 범위에서 확인되지 않았다. 문서는 profile/socket path resolution을
  Current로, state DB path wiring은 scaffold plus Implementation Gap으로 분리하고 있어 현행 구현 한계를 target/current
  claim으로 잘못 낮추는 오류가 보이지 않는다.
- [Judgment] document-level `Status:`는 추가하지 않는 편이 맞다. 이 slice는 Current(profile/socket), current scaffold,
  Implementation Gap(state DB production wiring)이 섞인 mixed-state 문서라 단일 status가 오해를 만든다.
- [Judgment] `Related:`는 추가하지 않는 편이 맞다. `docs/specs/aiox-a2a`는 인덱스 read path지만 상단 역할 문장으로
  충분히 복원 가능하고, broad graph link로 승격할 필요는 없다.

**다음 행동:** W8 본문을 국소 retrofit한다: `> 컨텍스트:` 제거, `[[aiox-a2a]]` → `[[docs/specs/aiox-a2a]]`,
상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고 이 slice가 §3.1 runtime config/profile
namespace contract와 current implementation caveats를 소유한다는 범위를 보존한다. plain code evidence first mention을
`[[src/...]]` wikilink로 보정하되, state DB production gap을 current guarantee로 바꾸지 않는다.

## 2026-06-29 · W8 runtime-profile-namespace retrofit 반영 완료 + W3 closeout

직전 검토 보고의 국소 retrofit을 `docs/specs/aiox-runtime-profile-namespace.md`에 반영했다.

**반영:**

- `> 컨텍스트:` callout 제거.
- bare wikilink `[[aiox-a2a]]`를 repo-path wikilink `[[docs/specs/aiox-a2a]]`로 전환.
- 상단 역할 문장으로 인덱스가 상태 어휘·layer model·glossary를 소유하고, 이 slice가 §3.1 runtime config/profile
  namespace contract와 current implementation caveats를 소유한다는 범위를 보존했다.
- CLI/adapter socket inheritance current evidence의 code first mention을 `[[src/...]]` wikilink로 보정했다.
- document-level `Status:`와 `Related:`는 추가하지 않았다. Current(profile/socket), current scaffold, Implementation Gap이
  섞인 mixed-state slice라 단일 status가 오해를 만들 수 있고, 인덱스 read path는 상단 역할 문장으로 충분하다는 직전
  판정을 유지했다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/specs/aiox-runtime-profile-namespace.md` → exit 0 (PASS).
- `git diff --check -- docs/specs/aiox-runtime-profile-namespace.md logs/2026-06-28-workspace-reset-stage8-W3-specs-retrofit.md`
  → exit 0 (PASS).
- `rg --pcre2 -n "\[\[(?!docs/|src/|tests/)" docs/specs/aiox-runtime-profile-namespace.md` → exit 1, 0건 (PASS).
- `rg -n "^> 컨텍스트" docs/specs/aiox-runtime-profile-namespace.md` → exit 1, 0건 (PASS).
- `docs/specs/aiox-a2a.md`와 cited `src/`/`tests/` targets exist (PASS).

**W3 closeout:**

- W1 인덱스 + W2~W8 slice 7개 전체 검토·retrofit 완료.
- 모든 대상에서 `> 컨텍스트:` 제거, repo-path wikilink 전환, 필요한 code/test evidence first mention wikilink 보정을 완료했다.
- 각 파일별 판정에서 blocking spec/code drift는 확인되지 않았다. mixed-state 문서의 document-level `Status:`/`Related:` 생략
  판단은 파일별 기록에 보존되어 있다.
- 남은 W3 작업 없음. Parent pointer(`logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md` W3)는 W6 parent에서
  W3 완료 처리 후 W4 decisions drift child로 진행하면 된다.
