---
topic: workspace reset stage8 W2 architecture retrofit
description: workspace reset stage 8 W2 — docs/architecture/local-agent-runtime.md 인덱스 + slice 9개를 승인된 규칙(Related/Status, repo-path wikilink, Evidence 형식, > 컨텍스트: 대체)으로 one-by-one 검토·retrofit. 기존 §N 헤딩·inbound anchor는 migration 아니면 보존.
status: decided
---

## Work Items

## 2026-06-28 · W2 착수 조건 정정 — modified store slice는 전수 개선 전 샘플링 산출물

Parent pointer: `logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md` W2.
Child log split: 2026-06-29. W2 완료 후 W3·W4는 각각 별도 child log.

@user가 `docs/architecture/local-runtime-store-and-repositories.md`의 기존 modified 상태를 정정했다. 이 변경은 기존
docs 전수 개선 전에 수행한 형식 샘플링 산출물이며, 샘플링 뒤 docs 전수 개선이 진행됐다. 따라서 W2 architecture retrofit은
이 modified slice를 선행 기준으로 삼지 않는다.

**현재 재개 조건:**

- 먼저 `docs/architecture/local-agent-runtime.md` 인덱스의 역할·링크·내용을 검토한다.
- 그 다음 modified 상태인 `local-runtime-store-and-repositories.md`를 확인해, 샘플링 변경을 전수 개선 기준에 맞게
  흡수·수정·보존 또는 되돌릴지 계획을 제안한다.
- 이후 architecture slice 9개를 one-by-one으로 진행한다.

**확인한 현재 상태:**

- 인덱스 `local-agent-runtime.md`는 compatibility index/navigation hub 역할과 §N anchor-stable stub을 유지한다.
- 인덱스와 미수정 slice 다수는 아직 bare wikilink(`[[local-runtime-...]]`, `[[decision-name]]`)와 `> 컨텍스트:`
  형식을 사용한다.
- 샘플 slice diff는 `> 컨텍스트:`를 `Related:`/`Status:`로 바꾸고 일부 decision link를 repo-path wikilink로 바꾼
  방향성 변경이다.

Work Items와 next pointer는 변경하지 않는다. W2는 계속 active다.

## 2026-06-28 · W2 architecture index retrofit 반영

`docs/architecture/local-agent-runtime.md` 인덱스 검토 결과를 @user 승인 범위대로 반영했다. W2 architecture retrofit의 첫 one-by-one 단위이며, W2 전체는 계속 active다.

**반영:**

- `local-agent-runtime.md`의 `Document map`과 §1~§13 anchor-stable stub 링크를 bare wikilink에서 repo-path wikilink로 전환했다.
- §0 Purpose의 pair cardinality decision 참조를 `[[docs/decisions/pair-slot-generalization]]`로 전환했다.
- §14 Authority Links에서 durable docs owner는 wikilink로 전환하고, logs/provenance path와 `docs/decisions/` directory path는 backtick path로 유지했다.
- 검토 결론대로 top-level `Related:`와 document-level `Status:`는 추가하지 않았다.
- 기존 §N/§N.x heading과 inbound anchor 구조는 보존했다.

**검증:**

- `rg -n "\\[\\[(local-runtime|pair-slot-generalization|docs/decisions\\])" docs/architecture/local-agent-runtime.md` → exit 1(매치 없음, bare local-runtime/decision 링크 잔존 없음).
- `scripts/check-markdown-inline-code docs/architecture/local-agent-runtime.md` → exit 0(PASS).
- `git diff --check -- docs/architecture/local-agent-runtime.md` → exit 0(PASS).

**다음 행동:** W2 다음 one-by-one 단위는 `docs/architecture/local-runtime-store-and-repositories.md`다. 이 파일의 기존 modified 상태는 전수 개선 전 샘플링 산출물이므로, 이번 인덱스 기준에 맞춰 흡수·수정·보존 또는 되돌림 여부를 먼저 판정한다.

## 2026-06-28 · W2 slice 검토 #1 store/repositories — 샘플링 변경 판정

`docs/architecture/local-runtime-store-and-repositories.md`를 W2 architecture retrofit의 다음 one-by-one 단위로 검토했다. 목적은 기존 modified 상태가 전수 개선 전 샘플링 산출물이므로, 현재 확정 기준(Related/Status, repo-path wikilink, evidence 형식, `> 컨텍스트:` 대체)에 맞게 흡수·수정·보존 또는 되돌릴지 판정하는 것이다.

**확인한 사실:**

- 현재 diff는 파일 상단 `> 컨텍스트: [[local-agent-runtime]] ...`를 `Related:` 3개 + `Status: Current`로 바꾸고, bare decision link 3개를 repo-path wikilink로 바꾼 변경이다.
- `Related:` target 3개는 모두 실재한다: `docs/architecture/local-agent-runtime.md`, `docs/decisions/pair-slot-generalization.md`, `docs/decisions/pair-attach-atomicity-and-sentinel.md`.
- slice 본문은 schema/repository as-built claim을 포함하며, 핵심 claim은 현재 code와 정합한다:
  - `runDaemonProcess`는 in-memory DB를 열고 `applySchema`를 호출한다: `src/daemon/run.ts:24-26`.
  - `applySchema`는 table 생성 뒤 `applyMigration1`을 호출하고, migration 1은 preflight·backfill·partial unique index·`schema_version` 기록을 transaction 안에서 수행한다: `src/store/schema.ts:14-173`.
  - pair repository의 `attachAgent`는 agent kind consistency check, self-loop guard, first-open-slot 선택, occupied-slot guard, `ready` recompute를 수행한다: `src/store/repositories/pairs.ts:76-272`.
  - delivery repository의 `createQueuedForRoutes`는 batch insert transaction과 UNIQUE collision reclassify를 수행하고, `recoverAfterRestart`는 `delivering`을 `queued`로 되돌린다: `src/store/repositories/deliveries.ts:70-221`.
  - `recoverAfterRestart`는 `src/`에서는 repository interface/implementation 외 runtime caller가 없고, tests에서만 직접 호출된다.
  - rollback sentinels는 `src/daemon/state.ts:36-37`의 module-local `Symbol`이고, attach rollback은 `src/daemon/state.ts:571-578`에서 throw 후 `:719-721`에서 reclassify된다. send-message rollback preflight는 `:1791-1797`, sentinel guards는 `:1941-1985`에 있다.
- `scripts/check-markdown-inline-code docs/architecture/local-runtime-store-and-repositories.md` → exit 0 (PASS).

**판정:**

- Blocking drift 없음. 샘플링 변경의 방향은 현재 확정된 architecture slice 규칙과 맞다.
- `Status: Current`는 문서 전체가 현재 architecture owner로 유효하고, 본문 안에 implementation-only gap을 명시하는 현재 구조와 충돌하지 않는다.
- `Related:` 3개는 decorative graph link가 아니라 문서 전체를 안전하게 수정할 때 필요한 document-level prerequisite로 볼 수 있다. 특히 이 slice의 schema migration/slot invariant와 rollback sentinel WHY가 두 decision에 걸쳐 있어 body link만으로도 읽을 수 있지만, slice 전체 검증 prerequisite로 반복 노출하는 것이 허용 범위다.
- 다만 본문에는 아직 legacy evidence shape가 남아 있다. 코드 파일은 wikilink되어 있지만, 여러 range가 plain backtick path로 흩어져 있고, line range가 현재 code와 어긋난 곳이 있다(예: `applySchema`/`applyMigration1` 설명의 기존 range). 따라서 "샘플링 변경 보존"만으로 W2 이 slice retrofit 완료로 보기는 부족하다.

**다음 행동:**

- 이 파일은 되돌리지 말고 샘플링 변경을 흡수한다.
- 이어서 같은 one-by-one 단위 안에서 evidence/range 형식을 현재 docs/AGENTS 기준으로 정리한다. 범위는 이 slice 안의 code/test evidence mapping과 stale line range 보정으로 제한하고, §2·§3 heading과 inbound anchor는 보존한다.
- Work Items와 next pointer는 변경하지 않는다. W2는 계속 active다.

## 2026-06-28 · W2 slice #1 store/repositories retrofit 반영

직전 검토 결과를 `docs/architecture/local-runtime-store-and-repositories.md`에 반영했다. 이 slice의 전수 개선 전 샘플링 변경은 되돌리지 않고 흡수했고, 같은 단위 안에서 stale range와 legacy evidence mapping을 좁게 보정했다.

**반영:**

- `Status: Current`와 repo-path decision wikilink는 유지했다. `Related:`는 index + `pair-slot-generalization`만 둔다 — @claude W2 검토 정정: `pair-attach-atomicity-and-sentinel`은 line 77 단일 body 위치에 이미 완전 국소화돼 docs/AGENTS "body-explained → Related 반복 금지"로 Related에서 제거(body link 유지), §2 line 51 `Related decision:` 중복 wikilink도 제거.
- SQLite schema table의 routes unique constraint 표기를 현재 schema column명으로 보정했다.
- migration 1 단계 evidence를 `src/store/schema.ts` repo path range로 통일했다.
- repositories 표의 각 repo claim에 code wikilink와 현재 line range를 붙여 claim↔evidence mapping을 보강했다.
- rollback sentinel range를 현재 `src/daemon/state.ts` 위치로 보정하고, attach outer catch 및 send-message preflight/UNIQUE-catch 경로를 명시했다.
- 기존 `§2`·`§3` heading과 inbound anchor 역할은 보존했다.

**검증:**

- `scripts/check-markdown-inline-code docs/architecture/local-runtime-store-and-repositories.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/local-runtime-store-and-repositories.md` → exit 0 (PASS).

**다음 세션 재개:**

- W2는 계속 active다.
- 다음 확인 대상은 남은 architecture slice를 `docs/architecture/local-agent-runtime.md` Document map 순서로 진행한다. `store/repositories`는 이번에 처리했으므로, 다음은 `§1 Process topology` slice `docs/architecture/local-runtime-process-topology.md`를 one-by-one 검토·retrofit한다.

## 2026-06-28 · W2 slice 검토 #2 process topology — retrofit 필요 판정

`docs/architecture/local-runtime-process-topology.md`를 W2 architecture retrofit의 다음 one-by-one 단위로 검토했다. 이번 블록은 검토와 판정만 기록하며 파일 본문은 아직 수정하지 않았다.

**확인한 사실:**

- 현재 slice는 legacy `> 컨텍스트:` 콜아웃과 bare wikilink를 사용한다: `[[local-agent-runtime]]`, `[[claude-channel-plugin-default]]`, `[[codex-per-agent-app-server]]`.
- 상위 `docs/AGENTS.md`는 repo 기준 wikilink를 요구하고, `Related:`는 document-level prerequisite일 때만 쓰도록 한다. `docs/architecture/AGENTS.md`는 slice가 `Related:`/`Status:`/`Evidence:` 배치 조건을 상위 규칙에 따르고, current/as-built 내부 구조 주장은 code/test evidence로 검증 가능해야 한다고 규정한다.
- process topology claim은 현재 코드와 큰 방향에서 정합한다.
  - CLI는 production path에서 `createClientRuntime`을 주입하고 socket client runtime을 사용한다: `src/bin/aiox.ts:52-56`, `:78-90`.
  - daemon state는 `codexRuntimes`, `claudeChannelRuntimes`, `codexChannelRuntimes` map을 유지한다: `src/daemon/state.ts:519-526`.
  - Codex app-server는 daemon attach path에서 시작되고, `codex app-server --listen ws://127.0.0.1:0` 기본 args를 쓴다: `src/daemon/state.ts:631-647`, `src/adapters/codex/launcher.ts:40-49`.
  - Codex proxy는 daemon process 안에서 `127.0.0.1:0` WS server를 만들고 upstream app-server로 relay한다: `src/adapters/codex/proxy.ts:58-74`, `:138-142`.
  - foreground Codex TUI는 CLI-owned child이며 `codex --remote <endpoint>` 또는 `codex resume <id> --remote <endpoint>`로 `stdio: "inherit"`를 쓴다: `src/adapters/codex/launcher.ts:76-85`.
  - app-server MCP injection은 `mcp_servers.aiox`에 `aiox mcp-codex`를 연결한다: `src/adapters/codex/launcher.ts:106-119`; CLI command dispatch는 `mcp-codex`를 stdio MCP server로 실행한다: `src/cli/invocation.ts:295-299`.
  - Claude default channel strategy는 plugin이고 inline strategy는 `AIOX_CLAUDE_CHANNEL_STRATEGY=inline` dev/debug opt-out이다: `src/cli/invocation.ts:87-90`, `:214-219`, `:482-490`.
  - Claude plugin launch는 `plugin:aiox-channel-ingress@aiox`를 활성화하고 env로 token/socket을 넘기며 foreground `stdio: "inherit"`를 쓴다: `src/adapters/claude/launcher.ts:189-208`.
  - Claude channel-server는 stdio MCP transport에 연결하고 HTTP ingress `http://127.0.0.1:<port>/send`를 연 뒤 daemon에 등록한다: `src/adapters/claude/channel-server.ts:465-475`, `:562-580`.
  - Codex runtime disposal은 WS close와 proxy close를 먼저 처리한 뒤 app-server dispose를 호출하고, app-server dispose는 SIGTERM 후 3초 grace 뒤 SIGKILL로 escalates 한다: `src/adapters/codex/runtime.ts:193-208`, `src/adapters/codex/app-server.ts:61`, `:187-214`.
- `scripts/check-markdown-inline-code docs/architecture/local-runtime-process-topology.md`는 아직 실행하지 않았다. 이번 검토는 구조·내용 판정까지이며 수정 반영 후 실행할 검증이다.

**판정:**

- Blocking drift는 발견하지 못했다. 문서의 topology와 process count/invariant는 현재 코드와 대체로 일치한다.
- 그러나 W2 retrofit 기준에는 미달한다. legacy context callout을 `Related:`/필요 시 `Status:`로 바꾸고, bare wikilink를 repo-path wikilink로 전환해야 한다.
- `Related:` 후보는 `[[docs/architecture/local-agent-runtime]]`, `[[docs/decisions/codex-per-agent-app-server]]`, `[[docs/decisions/claude-channel-plugin-default]]`다. 세 문서는 문서 전체 topology를 안전하게 검증하거나 수정할 때 필요한 prerequisite로 볼 수 있어 decorative graph link가 아니다.
- `Status: Current`는 문서 전체가 current/as-built process topology를 설명하고 target/proposed section이 없어 오해 가능성이 낮다.
- 본문에는 현재 code evidence mapping이 거의 없고, 마지막 Authority 문장이 provenance와 current authority를 섞는다. 따라서 단순 링크 치환이 아니라 compact `Evidence:` 또는 claim-adjacent evidence를 추가해 process count와 cleanup invariant의 claim↔evidence mapping을 복원하는 편이 맞다.

**다음 행동:**

- `docs/architecture/local-runtime-process-topology.md`에 위 판정을 좁게 반영한다.
- 범위는 상단 context 형식, repo-path wikilink, `Status: Current`, compact evidence mapping, Authority/Sources 정리로 제한한다.
- `## 1. Process Topology` heading과 inbound anchor 역할은 보존한다.

## 2026-06-28 · W2 slice #2 process topology retrofit 반영

직전 검토 결과를 `docs/architecture/local-runtime-process-topology.md`에 반영했다. Blocking drift는 발견하지 않았고, W2 format/evidence retrofit만 좁게 수행했다.

**반영:**

- legacy `> 컨텍스트:` 콜아웃을 `Related:` + `Status: Current` + 짧은 slice 역할 문장으로 대체했다.
- bare wikilink 3개를 repo-path wikilink로 전환했다: `local-agent-runtime`, `claude-channel-plugin-default`, `codex-per-agent-app-server`.
  - _(정정 2026-06-28 @claude)_ `codex-per-agent-app-server`·`claude-channel-plugin-default`를 `Related:`에서 제거 — 각각 line 72 `(WHY: ...)` · line 69 `(D strategy; ...)` 본문 body link로 관계가 이미 설명돼 있음. `docs/AGENTS` "body-explained → Related: 반복 금지". 인덱스(`local-agent-runtime`)만 문서-level prerequisite로 유지.\*
- process topology, per-agent counts, Claude plugin/inline strategy, Codex cleanup invariant의 current/as-built claim에 compact `Evidence:` block을 추가했다.
- 기존 `Authority:` 문장을 `Sources:`로 정리해 Round 3 closeout provenance와 decision rationale을 분리했다.
- `## 1. Process Topology` heading과 inbound anchor 역할은 보존했다.

**검증:**

- `scripts/check-markdown-inline-code docs/architecture/local-runtime-process-topology.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/local-runtime-process-topology.md` → exit 0 (PASS).
- bare wikilink 재검색(`rg --pcre2 -n "\\[\\[(?!docs/|src/)" docs/architecture/local-runtime-process-topology.md`) → exit 1, 매치 없음 (PASS).
- wikilink target 존재 확인: architecture index, 2 decision docs, 9 source files 모두 존재(PASS).

**다음 세션 재개:**

- W2는 계속 active다.
- 다음 확인 대상은 `docs/architecture/local-agent-runtime.md` Document map 순서상 `§4 Daemon lifecycle · socket transport · §5 Daemon API surface` slice인 `docs/architecture/local-runtime-daemon-transport-api.md`다.

## 2026-06-28 · W2 slice #3 daemon transport/API retrofit 반영

`docs/architecture/local-runtime-daemon-transport-api.md`를 W2 architecture retrofit의 다음 one-by-one 단위로 검토·반영했다.

**확인한 사실:**

- 기존 slice에는 legacy `> 컨텍스트:` callout과 bare wikilink가 남아 있었다: `local-agent-runtime`, `local-runtime-routing-and-delivery`, `uds-transport-and-framing-contract`.
- current/as-built claim의 큰 방향은 code와 맞았다. `_run-daemon` entry, `runDaemonProcess`, socket transport framing/envelope, stale socket retry, auto-start가 agent attach에만 있는 점, `recordCodexRuntimeFailed`가 `DaemonState`에는 있지만 `DaemonApi`/socket API에는 노출되지 않는 점을 code에서 확인했다.
- 단 stale line range가 있었다. `_run-daemon` parser와 dispatch, auto-start evidence, state implementation range가 현재 code 위치와 어긋났다.

**반영:**

- legacy context block을 `Related:` + `Status: Current` + slice 역할 문장으로 대체했다.
- bare wikilink를 repo-path wikilink로 전환했다.
- `_run-daemon`, auto-start, `runDaemonProcess`, socket transport 표, implementation-only behavior, daemon API 표의 code evidence range를 현재 code 기준으로 보정했다.
- API 표는 `[[src/daemon/state.ts]]`를 table header source로 두고 row별 range를 보존해 claim↔evidence mapping을 유지했다.
- `## 4`/`## 5` heading과 §4.3 migration stub은 보존했다.

**검증:**

- `scripts/check-markdown-inline-code docs/architecture/local-runtime-daemon-transport-api.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/local-runtime-daemon-transport-api.md` → exit 0 (PASS).
- bare wikilink 재검색(`rg --pcre2 -n "\\[\\[(?!docs/|src/)" docs/architecture/local-runtime-daemon-transport-api.md`) → exit 1, 매치 없음 (PASS).
- wikilink target 존재 확인: architecture index, routing slice, UDS decision, source files all exist (PASS).

**다음 세션 재개:**

- W2는 계속 active다.
- 다음 확인 대상은 `docs/architecture/local-agent-runtime.md` Document map 순서상 `§6 Claude adapter (§6.1~§6.5)` slice인 `docs/architecture/local-runtime-claude-adapter.md`다.

## 2026-06-28 · W2 slice #4 Claude adapter retrofit 반영

`docs/architecture/local-runtime-claude-adapter.md`를 W2 architecture retrofit의 다음 one-by-one 단위로 검토·반영했다.

**확인한 사실:**

- 기존 slice에는 legacy `> 컨텍스트:` callout과 bare wikilink가 남아 있었다: `local-agent-runtime`, `claude-channel-plugin-default`, `claude-channel-trust-and-registration`, `local-runtime-routing-and-delivery`, `local-runtime-codex-adapter`.
- current/as-built claim의 큰 방향은 현재 code와 맞았다. Claude default channel strategy는 plugin이고 inline은 `AIOX_CLAUDE_CHANNEL_STRATEGY=inline` dev/debug opt-out이며, D preflight failure는 inline으로 자동 fallback하지 않는다.
- Claude channel-server는 Claude CLI가 stdio child로 띄우며, daemon은 `claudeChannelRuntimes`/`claudePendingTokens` in-memory map만 유지한다. 등록은 pending token과 loopback `/send` endpoint 검증 뒤 runtime map에 저장된다.
- Claude `send`/`reply` tool handlers는 per-call daemon socket client를 만들고 닫으며, `reply(chat_id)`는 daemon에서 `parentMessageId`로 전달된다.
- Daemon→Claude injection은 `dispatchToPairPeers`에서 target Claude runtime을 확인한 뒤 `injectClaudeChannel`로 HTTP `/send`에 push하고, channel-server는 MCP notification envelope를 만든다.
- 단 기존 line range가 stale했다. token 생성, D preflight/no-fallback, registration, disconnect, send transaction, Claude injection evidence 위치가 현재 code와 어긋났다.

**반영:**

- legacy context block을 `Related:` + `Status: Current` + slice 역할 문장으로 대체했다.
- bare wikilink를 repo-path wikilink로 전환했다.
- channel strategy/topology에 compact `Evidence:` block을 추가해 invocation/launcher/state claim↔evidence mapping을 보강했다.
- launch flow, registration, disconnect, tool ingress, daemon→Claude injection, trusted framing의 code evidence range를 현재 code 기준으로 보정했다.
- `## 6`/`§6.1~§6.5` heading과 sequence diagram 구조는 보존했다.

**검증:**

- `scripts/check-markdown-inline-code docs/architecture/local-runtime-claude-adapter.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/local-runtime-claude-adapter.md` → exit 0 (PASS).
- bare wikilink 재검색(`rg --pcre2 -n "\\[\\[(?!docs/|src/)" docs/architecture/local-runtime-claude-adapter.md`) → exit 1, 매치 없음 (PASS).
- wikilink target 존재 확인: architecture index, routing slice, Codex adapter slice, 2 decision docs, 6 source files all exist (PASS).

**다음 세션 재개:**

- W2는 계속 active다.
- 다음 확인 대상은 `docs/architecture/local-agent-runtime.md` Document map 순서상 `§7 Codex adapter (§7.1~§7.10)` slice인 `docs/architecture/local-runtime-codex-adapter.md`다.

## 2026-06-28 · W2 slice #5 Codex adapter 검토 — retrofit 필요, proxy 설명 drift 2건

`docs/architecture/local-runtime-codex-adapter.md`를 W2 architecture retrofit의 다음 one-by-one 단위로 검토했다.
이번 블록은 검토와 판정만 기록하며 파일 본문은 아직 수정하지 않았다.

**확인한 사실:**

- 현재 slice는 legacy `> 컨텍스트:` callout과 bare wikilink를 사용한다: `local-agent-runtime`,
  `codex-per-agent-app-server`, `proxy-lazy-observation-cost-model`,
  `local-runtime-routing-and-delivery`, `pair-slot-generalization`.
- 주요 Codex attach/resume/MCP ingress/lifecycle claim은 현재 code와 큰 방향에서 정합한다.
  - CLI parser는 `codex --name`, `--pair`, `--resume`을 등록한다: `src/cli/parse.ts:257-286`.
  - `agent-attach`는 daemon start → `attachAgent` → Codex TUI launch → TUI exit notify 흐름이다:
    `src/cli/invocation.ts:157-198`.
  - Codex app-server launch와 MCP injection args는 `codex app-server --listen ws://127.0.0.1:0` +
    inline `mcp_servers.aiox` TOML이다: `src/adapters/codex/launcher.ts:40-119`.
  - runtime endpoint는 TUI용 proxy URL이고 daemon JSON-RPC client는 app-server endpoint로 직접 연결한다:
    `src/adapters/codex/runtime.ts:136-148`, `:337-343`.
  - fresh attach는 `thread/start` 없이 runtime을 저장하고, resume attach는 `thread/resume` 뒤
    `agent_thread_id_rebound` event를 append한다: `src/daemon/state.ts:624-708`.
  - MCP server는 stdio transport connect 후 `registerCodexChannel`을 호출한다:
    `src/adapters/codex/mcp-server.ts:388-462`; daemon은 pending token을 소비하고 full SHA-256 hash를
    runtime에 저장한다: `src/daemon/state.ts:1044-1066`, `:2091-2097`.
  - runtime failure callback gap은 현재 코드와 맞다. `recordCodexRuntimeFailed`는 존재하지만
    `defaultAttachCodexRuntime`은 `onRuntimeFailed`를 넘기지 않는다:
    `src/daemon/state.ts:884-924`, `:2024-2042`.
- 단 proxy 설명에는 code와 어긋난 문장이 있다.
  - 문서 `:108-110`은 client frame 관찰이 relay branch 뒤라고 쓰지만, 실제 code는
    `observeClientFrame`을 먼저 호출한 뒤 upstream open 여부에 따라 send/queue한다:
    `src/adapters/codex/proxy.ts:83-91`, `:151-166`.
  - 문서 `:100-103`은 "every frame unchanged"와 "text frames normalized only for inspection"을 함께
    말하지만, 실제 code는 text frame을 `normalizeFrame`으로 string 변환한 값을 upstream/client에 relay한다:
    `src/adapters/codex/proxy.ts:83-99`, `:225-239`. Binary frame 보존은 맞지만 text normalization은
    inspection-only가 아니다.
- 기존 line range 다수가 stale하거나 repo-path evidence shape가 아니다. 예: runtime class/range, proxy
  observation, launcher injection, state dispatch/authorization, mcp-server registration, lifecycle observer range.

**판정:**

- Blocking implementation drift는 아직 발견하지 못했다. Codex adapter의 큰 architecture claim은 현재 코드와
  대체로 일치한다.
- W2 retrofit 기준에는 미달한다. legacy context callout을 `Related:`/`Status: Current`/slice 역할 문장으로 바꾸고,
  bare wikilink를 repo-path wikilink로 전환해야 한다.
- `Related:` 후보는 `[[docs/architecture/local-agent-runtime]]`,
  `[[docs/decisions/codex-per-agent-app-server]]`,
  `[[docs/decisions/proxy-lazy-observation-cost-model]]`,
  `[[docs/architecture/local-runtime-routing-and-delivery]]`,
  `[[docs/decisions/pair-slot-generalization]]`다. 모두 slice 전체를 안전하게 검증하거나 수정할 때 필요한
  prerequisite로 볼 수 있어 decorative link가 아니다.
- `Status: Current`는 문서 전체가 current/as-built Codex adapter 구조를 설명하고, current gap은 별도 claim으로
  표시되어 있어 문서-level status와 충돌하지 않는다.
- proxy relay/observation 문장은 단순 line-range 보정이 아니라 내용 보정이 필요하다. "관찰은 relay 전 수행되며,
  relay는 text payload를 string으로 normalize해 전달하고 binary payload는 보존한다"는 식으로 code 사실에 맞춰야 한다.

**다음 행동:**

- `docs/architecture/local-runtime-codex-adapter.md`에 위 판정을 좁게 반영한다.
- 범위는 상단 context 형식, repo-path wikilink, `Status: Current`, stale range 보정, compact evidence mapping,
  proxy relay/observation 설명 보정으로 제한한다.
- `## 7`/`§7.1~§7.10` heading과 sequence diagram 구조는 보존한다.
- Work Items와 next pointer는 변경하지 않는다. W2는 계속 active다.

## 2026-06-28 · W2 slice #5 Codex adapter retrofit 반영

@user가 "수정하는 것이 아니라 검토부터"라고 정정해 먼저 독립 검토를 수행했고, 이후 반영 지시를 받아
`docs/architecture/local-runtime-codex-adapter.md`에 좁게 반영했다.

**반영:**

- legacy `> 컨텍스트:` callout을 `Related:` + `Status: Current` + slice 역할 문장으로 대체했다.
- bare docs wikilink를 repo-path wikilink로 전환했다. 관련 prerequisite는 architecture index, Codex app-server
  decision, proxy lazy observation decision, routing slice, pair-slot decision이다.
- runtime endpoint/process ownership에 compact `Evidence:` block을 추가했다.
- attach flow의 stale line range 일부를 현재 code 기준으로 보정했다: CLI parser, invocation TUI launch/exit,
  daemon attach range.
- proxy relay/observation drift 2건을 code 사실에 맞춰 보정했다.
  - Client frame observation은 relay branch 뒤가 아니라 normalize 직후, send/queue branch 전이다.
  - Text frame은 inspection-only normalize가 아니라 normalize된 string 값이 relay에도 쓰인다. Binary frame 보존은 유지했다.

**검증:**

- `scripts/check-markdown-inline-code docs/architecture/local-runtime-codex-adapter.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/local-runtime-codex-adapter.md` → exit 0 (PASS).
- bare wikilink 재검색(`rg --pcre2 -n "\\[\\[(?!docs/|src/)" docs/architecture/local-runtime-codex-adapter.md`) →
  exit 1, 매치 없음 (PASS).
- Related/source wikilink target 존재 확인: architecture index, 3 decision docs, routing slice, Codex source files all exist (PASS).

**다음 세션 재개:**

- W2는 계속 active다.
- 다음 확인 대상은 `docs/architecture/local-agent-runtime.md` Document map 순서상 `§8 Cross-cutting message routing`
  slice인 `docs/architecture/local-runtime-routing-and-delivery.md`다.

## 2026-06-28 · W2 slice #6 routing/delivery 검토 — retrofit 필요, blocking drift 없음

`docs/architecture/local-runtime-routing-and-delivery.md`를 W2 architecture retrofit의 다음 one-by-one 단위로 검토했다.
이번 블록은 검토와 판정만 기록하며 파일 본문은 아직 수정하지 않았다.

**확인한 사실:**

- 현재 slice는 legacy `> 컨텍스트:` callout과 bare wikilink를 사용한다: `local-agent-runtime`,
  `local-runtime-daemon-transport-api`, `pair-attach-atomicity-and-sentinel`,
  `codex-per-agent-app-server`, `pair-slot-generalization`, `local-runtime-claude-adapter`,
  `local-runtime-codex-adapter`.
- 상위 `docs/AGENTS.md`는 repo 기준 wikilink와 조건부 `Related:`를 요구하고, `docs/architecture/AGENTS.md`는
  architecture slice의 current/as-built 내부 구조 주장이 code/test evidence로 검증 가능해야 한다고 규정한다.
- routing/delivery claim은 현재 code와 큰 방향에서 정합한다.
  - message/delivery/pair domain model은 `src/core/messages.ts`, `src/core/deliveries.ts`,
    `src/core/pairs.ts`와 맞는다.
  - `runSendMessageTransaction`은 단일 `withTransaction` 안에서 source lookup, route fan-out,
    idempotency preflight, message/delivery insert, event append를 수행하고 sentinel rollback을 unwrap한다:
    `src/daemon/state.ts:1761-1864`, `:1951-1985`, `:1988-2012`.
  - CLI parser에는 `connect`/`disconnect`는 있으나 `send` subcommand는 없다: `src/cli/parse.ts:216-217`,
    `:293-315`.
  - daemon-internal ingress 4개는 `receiveClaudeChannelMessage`, `receiveClaudeChannelReply`,
    `receiveCodexMessage`, `receiveCodexReply`이고 모두 `runSendMessageTransaction`을 호출한다:
    `src/daemon/state.ts:974-1041`, `:1096-1159`.
  - `createAdapterRouter`는 `api.sendMessage`, status snapshot, sequential delivery loop, deferred/fail/success 전이를
    수행한다: `src/adapters/router.ts:47-155`. missing adapter deferred가 queued로 남는 test도 있다:
    `tests/unit/adapters/fake-integration.test.ts:437-485`.
  - production dispatch는 `dispatchToPairPeers`이고 per-adapter inject path와 delivery status 전이를 inline으로
    수행한다: `src/daemon/state.ts:1246-1324`, `:1346-1393`, `:1396-1568`.
  - `parentMessageId` persistence와 API DTO surface는 `src/store/repositories/messages.ts:24-32`,
    `:40-75`, `:94-103`, `src/daemon/api.ts:115-116`, `:523`와 맞는다.
  - pair attach와 bidirectional route creation은 현재 repository/state code와 정합한다:
    `src/store/repositories/pairs.ts:76-191`, `src/daemon/state.ts:563-593`, `:2099-2156`.
- `scripts/check-markdown-inline-code docs/architecture/local-runtime-routing-and-delivery.md` → exit 0 (PASS).

**판정:**

- Blocking implementation drift는 발견하지 못했다. 현재 문서의 sendMessage atomicity, idempotency, router/fan-out,
  parent_message_id, pair route ownership claim은 현재 code/test와 대체로 일치한다.
- W2 retrofit 기준에는 미달한다. legacy context callout을 `Related:`/`Status: Current`/slice 역할 문장으로 바꾸고,
  bare wikilink를 repo-path wikilink로 전환해야 한다.
- `Related:` 후보는 `[[docs/architecture/local-agent-runtime]]`,
  `[[docs/architecture/local-runtime-daemon-transport-api]]`,
  `[[docs/decisions/pair-attach-atomicity-and-sentinel]]`,
  `[[docs/decisions/codex-per-agent-app-server]]`,
  `[[docs/decisions/pair-slot-generalization]]`,
  `[[docs/architecture/local-runtime-claude-adapter]]`,
  `[[docs/architecture/local-runtime-codex-adapter]]`다. 모두 slice 전체의 routing/FSM 책임을 안전하게 검증하거나 수정할 때
  필요한 prerequisite로 볼 수 있어 decorative link가 아니다.
- `Status: Current`는 문서 전체가 current/as-built routing and delivery structure를 설명하고, deferred surface나
  deferred router refactor는 본문에서 claim-local로 표시되어 있어 문서-level status와 충돌하지 않는다.
- 상태 전이 diagram의 `queued --> queued` 표현은 code 사실과 맞지만, retrofit 때 더 정밀화하는 편이 좋다.
  `target_binding_unconfirmed`와 일부 `target_runtime_unavailable`은 delivering 전 deferred라 status event 없이 queued에
  머무를 수 있고, registered adapter deferred처럼 `delivering` 후 `queued`로 되돌리는 path도 있다.
- 기존 line range 다수가 stale하거나 짧은 `state.ts` 표기로 남아 있다. 현재 W2 형식에 맞춰 repo-path evidence로 보정해야 한다.

**다음 행동:**

- `docs/architecture/local-runtime-routing-and-delivery.md`에 위 판정을 좁게 반영한다.
- 범위는 상단 context 형식, repo-path wikilink, `Status: Current`, stale range 보정, compact evidence mapping,
  deferred/queued transition 설명 정밀화로 제한한다.
- `## 8`/`§8.1~§8.6` 및 `## 4.3` heading과 inbound anchor 역할은 보존한다.
- Work Items와 next pointer는 변경하지 않는다. W2는 계속 active다.

## 2026-06-28 · W2 slice #6 routing/delivery retrofit 반영

직전 검토 결과를 `docs/architecture/local-runtime-routing-and-delivery.md`에 반영했다. Blocking drift는 발견하지 않았고,
W2 format/evidence retrofit과 deferred transition 설명 정밀화만 좁게 수행했다.

**반영:**

- legacy `> 컨텍스트:` callout을 `Related:` + `Status: Current` + slice 역할 문장으로 대체했다.
- bare docs wikilink를 repo-path wikilink로 전환했다. 관련 prerequisite는 architecture index, daemon transport/API
  slice, pair attach sentinel decision, Codex app-server decision, pair-slot decision, Claude adapter slice, Codex
  adapter slice다.
- sendMessage transaction, CLI surface/daemon-internal ingress, router/test coverage, production `dispatchToPairPeers`,
  deferred queued behavior, `parent_message_id`, pair reservation/route creation에 compact `Evidence:` blocks와 현재
  code/test range를 추가했다.
- delivery state diagram의 queued/deferred 표현을 정밀화했다. 일부 deferred path는 `delivering` 전 queued 유지이고,
  일부 deferred path는 `delivering` 후 queued로 되돌아간다는 점을 본문에 명시했다.
- `## 8`/`§8.1~§8.6` 및 `## 4.3` heading과 inbound anchor 역할은 보존했다.

**검증:**

- `scripts/check-markdown-inline-code docs/architecture/local-runtime-routing-and-delivery.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/local-runtime-routing-and-delivery.md` → exit 0 (PASS).
- bare wikilink 재검색(`rg --pcre2 -n "\\[\\[(?!docs/|src/|tests/)" docs/architecture/local-runtime-routing-and-delivery.md`)
  → exit 1, 매치 없음 (PASS).
- Related/source/test wikilink target 존재 확인: architecture/decision docs, source files, test files all exist (PASS).

**다음 세션 재개:**

- W2는 계속 active다.
- 다음 확인 대상은 `docs/architecture/local-agent-runtime.md` Document map 순서상 §9 CLI / invocation / doctor /
  status slice인 `docs/architecture/local-runtime-cli-and-operator-surfaces.md`다.

## 2026-06-28 · W2 slice #7 CLI/operator surfaces 검토 — retrofit 필요, blocking drift 없음

`docs/architecture/local-runtime-cli-and-operator-surfaces.md`를 W2 architecture retrofit의 다음 one-by-one 단위로 검토했다.
이번 블록은 검토와 판정만 기록하며 파일 본문은 아직 수정하지 않았다.

**확인한 사실:**

- 현재 slice는 legacy `> 컨텍스트:` callout과 bare wikilink를 사용한다: `local-agent-runtime`.
- 상위 `docs/AGENTS.md`는 repo 기준 wikilink와 조건부 `Related:`를 요구하고, `docs/architecture/AGENTS.md`는
  architecture slice의 current/as-built 내부 구조 주장이 code/test evidence로 검증 가능해야 한다고 규정한다.
- CLI/operator surface claim은 현재 code와 큰 방향에서 정합한다.
  - `daemon start/stop/restart/status`, agent attach, route connect/disconnect, pair, global `status`/`stop`,
    `doctor`, `claude-plugin setup`, hidden `mcp-codex`, hidden `_run-daemon` parser registration은
    `src/cli/parse.ts:183-220`, `:225-243`, `:257-360`와 맞는다.
  - invocation switch는 daemon lifecycle, attach, route, pair, status, global stop, doctor, MCP, plugin setup,
    `_run-daemon`을 분기한다: `src/cli/invocation.ts:131-310`.
  - auto-start는 agent attach branch에서만 호출된다: `src/cli/invocation.ts:157-167`.
  - daemon runtime start/stop/restart/status와 daemon fork command는 `src/bin/aiox.ts:95-147`, `:166-194`와 맞는다.
  - `ensureOk`의 failure mapping, TUI exit code propagation, Codex launch rollback은
    `src/cli/invocation.ts:186-198`, `:538-565`, `:616-625`와 맞는다.
  - doctor check 순서와 failure exit code는 `src/cli/doctor.ts:17-43`, `src/cli/invocation.ts:609-614`와 맞는다.
  - status output order와 delivery status list는 `src/cli/format.ts:30-75`,
    `src/core/deliveries.ts:3-9`, `src/daemon/state.ts:1162-1174`와 맞는다.
- 기존 line range 일부는 stale하거나 repo-path evidence shape가 아니다. 예: table cite의 `cli/parse.ts`/`bin/aiox.ts`
  축약 경로, `invokeParsedCommand` 전체 range, parse error helper range, status aggregate source path.
- `scripts/check-markdown-inline-code docs/architecture/local-runtime-cli-and-operator-surfaces.md` → exit 0 (PASS).

**판정:**

- Blocking implementation drift는 발견하지 못했다. 현재 문서의 command table, attach auto-start, invocation failure/exit
  behavior, doctor/status claim은 현재 code와 대체로 일치한다.
- W2 retrofit 기준에는 미달한다. legacy context callout을 `Related:`/`Status: Current`/slice 역할 문장으로 바꾸고,
  bare wikilink를 repo-path wikilink로 전환해야 한다.
- `Related:` 후보는 `[[docs/architecture/local-agent-runtime]]` 하나다. 이 slice는 §9 operator surface 자체를 설명하고,
  다른 architecture slice나 decision을 문서 전체 prerequisite로 요구하지 않는다.
- `Status: Current`는 문서 전체가 current/as-built CLI/operator surface를 설명하고 있어 문서-level status와 충돌하지 않는다.
- `claude-plugin setup`은 현행 command table에 포함되어 있으나, plugin provisioning의 상세 architecture는 이 slice의
  핵심 소유 범위를 넘어선다. retrofit 때는 command/invocation surface evidence만 보강하고 plugin 내부 흐름을 복사하지 않는다.

**다음 행동:**

- `docs/architecture/local-runtime-cli-and-operator-surfaces.md`에 위 판정을 좁게 반영한다.
- 범위는 상단 context 형식, repo-path wikilink, `Status: Current`, stale range 보정, compact evidence mapping으로 제한한다.
- `## 9`/`§9.1~§9.3` heading은 보존한다.
- Work Items와 next pointer는 변경하지 않는다. W2는 계속 active다.

## 2026-06-28 · W2 slice #7 CLI/operator surfaces retrofit 반영

직전 검토 결과를 `docs/architecture/local-runtime-cli-and-operator-surfaces.md`에 반영했다. Blocking drift는 발견하지
않았고, W2 format/evidence retrofit만 좁게 수행했다.

**반영:**

- legacy `> 컨텍스트:` callout을 `Related:` + `Status: Current` + slice 역할 문장으로 대체했다.
- bare docs wikilink를 repo-path wikilink로 전환했다. 문서 전체 prerequisite는 architecture index 하나다.
- command table의 축약 경로 cite를 repo-path wikilink + `file:line` evidence shape로 보정했다.
- attach-only auto-start, invocation switch/failure mapping, parse error shape, child exit/rollback, doctor/status output에
  compact `Evidence:` blocks와 현재 code range를 추가했다.
- `claude-plugin setup`은 command/invocation surface evidence만 남기고 plugin provisioning 내부 흐름은 복사하지 않았다.
- `## 9`/`§9.1~§9.3` heading은 보존했다.

**검증:**

- `scripts/check-markdown-inline-code docs/architecture/local-runtime-cli-and-operator-surfaces.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/local-runtime-cli-and-operator-surfaces.md` → exit 0 (PASS).
- bare wikilink 재검색(`rg --pcre2 -n "\\[\\[(?!docs/|src/|tests/)" docs/architecture/local-runtime-cli-and-operator-surfaces.md`)
  → exit 1, 매치 없음 (PASS).
- Related/source wikilink target 존재 확인: architecture index, CLI/bin/source files all exist (PASS).

**다음 세션 재개:**

- W2는 계속 active다.
- 다음 확인 대상은 `docs/architecture/local-agent-runtime.md` Document map 순서상 `§10 Typed error catalog` ·
  `§11 Events catalog` · `§12 Smoke matrix` slice인 `docs/architecture/local-runtime-errors-events-smoke.md`다.

## 2026-06-28 · W2 slice #8 errors/events/smoke 검토 — retrofit 필요, smoke count drift 있음

`docs/architecture/local-runtime-errors-events-smoke.md`를 W2 architecture retrofit의 다음 one-by-one 단위로 검토했다.
이번 블록은 검토와 판정만 기록하며 파일 본문은 아직 수정하지 않았다.

**확인한 사실:**

- 현재 slice는 legacy `> 컨텍스트:` callout과 bare wikilink를 사용한다: `local-agent-runtime`.
- 상위 `docs/AGENTS.md`는 repo 기준 wikilink와 조건부 `Related:`를 요구하고, `docs/architecture/AGENTS.md`는
  current/as-built 내부 구조 주장이 code/test evidence로 검증 가능해야 한다고 규정한다.
- architecture index의 document map은 §10 Typed error catalog, §11 Events catalog, §12 Smoke matrix를
  `docs/architecture/local-runtime-errors-events-smoke.md` slice가 소유한다고 가리킨다.
- Typed error catalog의 reason 목록은 현재 code와 큰 방향에서 정합한다.
  - Daemon API reason들은 `src/daemon/api.ts`, `src/daemon/state.ts`, `src/core/*`, `src/store/repositories/*`
    검색 결과와 대응한다.
  - `AdapterInjectFailureReason` union은 `src/adapters/contract.ts:19-30`에 있고, `codex_app_server_unavailable`은
    union/state type에는 있으나 emission 검색 결과는 없어 기존 "no emission found" 판정과 일치한다.
  - Router result type에는 `adapter_not_found`가 남아 있으나 실제 router 반환 검색 결과는 `target_adapter_not_registered`만
    확인되어 기존 dead union member 판정과 일치한다.
  - Socket transport envelope reason 4개는 `src/daemon/socket-transport.ts:177`, `:190`, `:213`, `:228`에서 확인된다.
  - CLI parse/invocation code 목록은 현재 `src/cli/parse.ts`와 `src/cli/invocation.ts`에 존재하지만, 기존 line range는
    stale해졌다.
- Events catalog의 declared/emitted 분류는 현재 code와 큰 방향에서 정합한다.
  - `src/core/events.ts:1-27`에 25개 event type이 선언되어 있다.
  - `message_created`부터 `codex_ingress_reply_received`까지 문서의 emitted event 목록은 `src/daemon/state.ts`의
    `events.append` 검색 결과와 대응한다.
  - 문서의 "Declared but not emitted" 9개 event type은 `src/core/events.ts`와 tests 외에는 `src/` emission 검색 결과가
    없었다.
  - `codex_channel_registered` event payload의 `{tokenHash}`는 short hash가 맞다:
    `src/daemon/state.ts:1063-1067`. 단 runtime stored `tokenHash`는 full SHA-256이다:
    `src/daemon/state.ts:1056-1060`, `tests/unit/daemon/codex-ingress.test.ts:1683-1705`.
- Smoke matrix의 legacy baseline 문장은 provenance로는 맞을 수 있으나, 현재 test-file count claim은 stale하다.
  - 문서 현재 문장: "Vitest test suite has grown to 52 test files / 483 tests as of W7 reset".
  - 현재 repo의 `rg --files tests | wc -l` 결과는 49다.
  - W7/W5 로그에는 52 files / 483 tests 실측 기록이 남아 있으므로, 이는 "현재 suite"가 아니라 dated W7 reset
    verification provenance로 남겨야 한다.
- `scripts/check-markdown-inline-code docs/architecture/local-runtime-errors-events-smoke.md` → exit 0 (PASS).

**판정:**

- Blocking implementation drift는 smoke count 문장 외에는 발견하지 못했다. Error/event catalog의 구조적 claim과
  declared/emitted 분류는 현재 code 검색 결과와 대체로 일치한다.
- W2 retrofit 기준에는 미달한다. legacy context callout을 `Related:`/`Status: Current`/slice 역할 문장으로 바꾸고,
  bare wikilink를 repo-path wikilink로 전환해야 한다.
- `Related:` 후보는 `[[docs/architecture/local-agent-runtime]]` 하나다. 이 slice는 cross-cutting appendix지만 문서 전체
  prerequisite로 필요한 durable owner는 architecture index이며, 각 source/test 파일은 evidence 위치에서 링크하는 편이 맞다.
- `Status: Current`는 문서 전체가 current/as-built catalog와 smoke provenance를 설명하고 있어 문서-level status와 충돌하지
  않는다. 단 §12의 historical baseline과 dated W7 verification은 `Sources:`/provenance로 분리해 "현재 test count"로
  오해되지 않게 해야 한다.
- 기존 cite 대부분은 축약 경로(`state.ts`, `router.ts`, `cli/parse.ts`) 또는 stale line range다. repo-path wikilink +
  compact evidence shape로 보정해야 한다.

**다음 행동:**

- `docs/architecture/local-runtime-errors-events-smoke.md`에 위 판정을 좁게 반영한다.
- 범위는 상단 context 형식, repo-path wikilink, `Status: Current`, stale range 보정, compact evidence mapping,
  smoke baseline/current-count 문장 정정으로 제한한다.
- `## 10`/`§10.1~§10.6`, `## 11`, `## 12` heading과 inbound anchor 역할은 보존한다.
- Work Items와 next pointer는 변경하지 않는다. W2는 계속 active다.

## 2026-06-28 · W2 slice #8 errors/events/smoke retrofit 반영

직전 검토 결과를 `docs/architecture/local-runtime-errors-events-smoke.md`에 반영했다. Smoke count 문장 외
blocking drift는 발견하지 않았고, W2 format/evidence retrofit과 smoke provenance 정정만 좁게 수행했다.

**반영:**

- legacy `> 컨텍스트:` callout을 `Related:` + `Status: Current` + slice 역할 문장으로 대체했다.
- bare docs wikilink를 repo-path wikilink로 전환했다. 문서 전체 prerequisite는 architecture index 하나다.
- typed error catalog와 events catalog의 축약 경로 cite를 repo-path wikilink + `file:line` evidence shape로 보정했다.
- `codex_app_server_unavailable`, `adapter_not_found`, declared-but-not-emitted events의 implementation-only 성격은 유지했다.
- `codex_channel_registered` event payload가 short hash이고 runtime stored `tokenHash`는 full SHA-256이라는 검토 판정을
  evidence range에 반영했다.
- §12 smoke matrix의 `52 files / 483 tests` 문장을 현재 suite count처럼 읽히지 않게 `Sources:` provenance로 분리했다.
  MVP closeout baseline과 W7 reset verification은 dated source로 남기고, 2026-06-28 W2 검토의 current file count 49는
  dated observation으로만 적었다.
- `## 10`/`§10.1~§10.6`, `## 11`, `## 12` heading과 inbound anchor 역할은 보존했다.

**검증:**

- `scripts/check-markdown-inline-code docs/architecture/local-runtime-errors-events-smoke.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/local-runtime-errors-events-smoke.md` → exit 0 (PASS).
- bare wikilink 재검색(`rg --pcre2 -n "\\[\\[(?!docs/|src/|tests/)" docs/architecture/local-runtime-errors-events-smoke.md`)
  → exit 1, 매치 없음 (PASS).
- Related/source/test wikilink target 존재 확인: architecture index, source files, test files all exist (PASS).

**다음 세션 재개:**

- W2는 계속 active다.
- 다음 확인 대상은 `docs/architecture/local-agent-runtime.md` Document map 순서상 `§13 Known gaps / Post-MVP` slice인
  `docs/architecture/local-runtime-gaps-and-targets.md`다.

## 2026-06-29 · W2 slice #9 gaps/targets 검토 — retrofit 필요, blocking drift 없음

`docs/architecture/local-runtime-gaps-and-targets.md`를 W2 architecture retrofit의 다음 one-by-one 단위로 검토했다.
이번 블록은 검토와 판정만 기록하며 파일 본문은 아직 수정하지 않았다.

**확인한 사실:**

- 현재 slice는 legacy `> 컨텍스트:` callout과 bare wikilink `[[local-agent-runtime]]`를 사용한다.
- `rg --pcre2 -n "컨텍스트|\[\[(?!docs/|src/|tests/)" docs/architecture/local-runtime-gaps-and-targets.md docs/architecture/local-agent-runtime.md`
  → `docs/architecture/local-runtime-gaps-and-targets.md:3`만 매치했다. index의 §13 링크는 repo-path wikilink다.
- `scripts/check-markdown-inline-code docs/architecture/local-runtime-gaps-and-targets.md` → exit 0 (PASS).
- current gap 항목은 현재 code/search 결과와 큰 방향에서 정합한다.
  - production daemon은 `src/daemon/run.ts:25`에서 `new Database(":memory:")`를 연다.
  - `openSqliteDatabase`는 `src/store/sqlite.ts`에 있고 tests 외 active production caller가 검색되지 않았다. `recoverAfterRestart`도 repository/test 외 active production caller가 검색되지 않았다.
  - `defaultAttachCodexRuntime`은 `attachCodexAgentRuntime` 호출에 `onRuntimeFailed`를 전달하지 않는다: `src/daemon/state.ts:2024-2041`. runtime 쪽 option/callback surface는 존재한다: `src/adapters/codex/runtime.ts:54-61`, `:87-107`, `:355-362`.
  - `stale`는 `src/core/agents.ts:5-10`에 정의되어 있고, daemon/source 검색에서 active transition logic은 확인되지 않았다.
  - Claude channel-server HTTP `/send` ingress는 loopback endpoint/path 검증과 POST handler는 있으나 request auth check가 없다: `src/adapters/claude/channel-server.ts:77-88`, `:437-463`. 관련 spec/decision도 daemon→channel `/send` push auth gap을 current gap으로 기록한다.
  - Codex active-thread sync는 app-server WebSocket client/proxy path를 사용한다: `src/adapters/codex/runtime.ts:25-30`, `:328-343`. upstream unsupported/experimental 성격은 current code fact가 아니라 W7/log 및 Codex adapter slice provenance로 유지해야 한다.
  - Codex MCP server는 `aiox_send_message`와 `aiox_reply`만 등록하고 queued delivery pull/read/ack tool은 없다: `src/adapters/codex/mcp-server.ts:301-334`.
  - `codex_channel_disconnected`는 event type과 daemon emission이 있다: `src/core/events.ts:24`, `src/daemon/state.ts:1076-1090`. `claude_channel_disconnected` event type/emission은 검색되지 않았다.
  - AdapterRouter는 `src/adapters/router.ts:47-123`에 있고 fake integration tests에서만 직접 사용된다; production daemon dispatch는 `dispatchToPairPeers` path다.

**판정:**

- Blocking implementation drift는 발견하지 못했다. Known gaps 목록의 current limitation claim은 현재 code/test/search와 대체로 일치한다.
- W2 retrofit 기준에는 미달한다. legacy context callout을 `Related:`/`Status:`/slice 역할 문장으로 바꾸고, bare wikilink를 repo-path wikilink로 전환해야 한다.
- 이 slice는 current gap과 target/proposed/deferred를 섞는 문서다. document-level `Status: Current`만 두면 target checklist까지 current로 오해될 수 있으므로, `Status: Current`를 쓰더라도 역할 문장에서 mixed-state 문서임을 명시하고 section headings 또는 inline status로 `Current gap` vs `Target`/`Proposed`/`Deferred`를 분리해야 한다.
- `Related:` 후보는 `[[docs/architecture/local-agent-runtime]]` 하나다. slice 전체의 status vocabulary, module overview, authority links를 안전하게 해석하려면 index가 prerequisite다.
- current gap 각 항목에는 repo-path evidence를 붙여야 한다. 단 `Experimental Websocket Transport`의 "unsupported upstream" 부분은 code evidence가 아니라 dated provenance/owner-slice 근거로 표시해야 하며, current code evidence와 섞어 사실처럼 쓰지 않는다.
- target/proposed/deferred checklist는 code가 현재 구현하지 않는다는 점만 evidence로 보강하고, roadmap/spec intent를 여기서 새로 확정하지 않는다.

**다음 행동:**

- `docs/architecture/local-runtime-gaps-and-targets.md`에 위 판정을 좁게 반영한다.
- 범위는 상단 context 형식, repo-path wikilink, mixed-state status/section labeling, current gap evidence mapping, provenance 분리로 제한한다.
- `## 13` heading과 index stub/inbound anchor 역할은 보존한다.
- Work Items와 next pointer는 변경하지 않는다. W2는 계속 active다.

## 2026-06-29 · W2 slice #9 gaps/targets retrofit 반영 + W2 architecture 완료

직전 검토 결과를 `docs/architecture/local-runtime-gaps-and-targets.md`에 반영했다. Blocking implementation drift는
발견하지 않았고, W2 format/evidence retrofit과 provenance 분리만 좁게 수행했다.

**반영:**

- legacy `> 컨텍스트:` callout을 `Related:` + mixed-state slice 역할 문장으로 대체했다.
- bare docs wikilink를 repo-path wikilink로 전환했다. 문서 전체 prerequisite는 architecture index 하나다.
- `Current gap` section과 `Target` checklist section에 section-level status를 명시해 target/proposed/deferred 항목이
  document-level current claim처럼 읽히지 않게 했다.
- current gap 항목별 code/test/doc evidence mapping을 추가했다.
- Codex WebSocket의 upstream unsupported/experimental 성격은 local code fact가 아니라 dated provenance + Codex adapter
  slice 근거로 분리했다.
- `## 13` heading과 index stub/inbound anchor 역할은 보존했다.

**검증:**

- `scripts/check-markdown-inline-code docs/architecture/local-runtime-gaps-and-targets.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/local-runtime-gaps-and-targets.md` → exit 0 (PASS).
- bare wikilink/legacy context 재검색(`rg --pcre2 -n "\\[\\[(?!docs/|src/|tests/)" ...`, `rg -n "컨텍스트" ...`)
  → exit 1, 매치 없음 (PASS).
- W2 architecture split 전체 검증:
  - `scripts/check-markdown-inline-code docs/architecture/local-agent-runtime.md docs/architecture/local-runtime-*.md` → exit 0 (PASS).
  - `git diff --check -- docs/architecture/local-agent-runtime.md docs/architecture/local-runtime-*.md` → exit 0 (PASS).
  - bare wikilink 재검색 → exit 1, 매치 없음 (PASS).
  - legacy `컨텍스트` 재검색 → exit 1, 매치 없음 (PASS).

**Work Items:**

- W2 architecture retrofit을 완료 처리했다. index + 9개 slice가 승인된 규칙으로 검토·retrofit됐고, 기존 §N heading과
  inbound anchor 역할은 보존됐다.
- next pointer는 W3 specs retrofit으로 이동했다.
