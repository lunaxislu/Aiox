---
topic: AIOX Web-first Stage3 Terminal Milestone
description: Web-first rewrite Stage 3에서 TerminalSession node-pty xterm.js plain shell milestone을 구현한다
status: open
---

## Work Items
- [>] W1 PTY Manager와 TerminalSession registry primitive 및 local shell process ownership을 구현한다
- [ ] W2 Terminal Stream WebSocket 인증 byte transport resize와 output pipeline pressure를 측정하고 필요성이 확인될 때만 최소 backpressure를 구현한다
- [ ] W3 Control WebSocket terminal attach detach와 single writer lease operation을 구현한다
- [ ] W4 React xterm TerminalView FitAddon font theme와 최소 resizable pane을 구현한다
- [ ] W5 plain shell UTF-8 ANSI cursor TUI burst/large-output reconnect observer writer lease explicit stop과 cleanup을 통합 검증한다

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.
- Project integration: `AGENTS.md, plans/AGENTS.md, logs/AGENTS.md, docs/documentation-system.md`.
- Accepted target artifact: `logs/artifacts/aiox-web-first-accepted-target-baseline.md`를 전체 읽고 current fact, accepted target과 open decision을 구분한다.
- Stage 0 contract: `logs/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts.md`가 `decided`일 때 accepted lifecycle·authority 결과와 owner handoff를 읽는다.
- Immediate predecessor: `logs/2026-09-02-AIOX-Web-first-Stage2-Gateway-Bootstrap.md`가 `decided`이고 plan에서 Stage 3이 활성화된 뒤에만 이 package를 활성화한다.
- Current implementation claim은 code와 tests에서 직접 재확인하고 predecessor candidate 변경을 accepted evidence처럼 사용하지 않는다.
- Browser의 xterm.js는 terminal frontend일 뿐 execution host가 아니다. Stage 3의 shell과 fixture process는 Local Server가 `node-pty`를 통해 현재 검증 host의 실제 local OS process로 실행한다.
- Browser disconnect, TerminalSession stop과 향후 AgentRuntime stop을 서로 다른 trigger로 유지한다. exact lifecycle semantics는 decided Stage 0 contract를 소비하고 Stage 3이 새로 결정하지 않는다.

## Package Scope

- Revision: 1; History pointer: `2026-09-02 · Stage 3 package bootstrap`.
- Primary boundary: Server-owned plain-shell Web Terminal milestone
- Related artifacts in allowed write-set:
  - `logs/artifacts/aiox-web-first-accepted-target-baseline.md`
  - `logs/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts.md`
  - `logs/2026-09-02-AIOX-Web-first-Stage2-Gateway-Bootstrap.md`
- Excluded:
  - Claude Codex vendor runtime 실행.
  - disconnect 이전 TUI 화면 완전 복원과 server restart PTY reattach.
  - 최종 workspace pane library와 복합 layout UX.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: inline. 각 executable W는 Compact task record를 사용하고 accepted 결과 승격 전 controlling result review를 거친다.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Public protocol, process lifecycle, security, persistence 또는 release claim은 result promotion 전에 independent review 필요성을 재판정한다.
  - Activate when: large claim, public contract/security/data/release, irreversible external effect, multi-owner conflict, large blast radius, or low discovery confidence is present.

## Task Index

- Stable package key: 2026-09-02-AIOX-Web-first-Stage3-Terminal-Milestone

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W5 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage3-Terminal-Milestone/tasks/W5.md` |
| W4 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage3-Terminal-Milestone/tasks/W4.md` |
| W3 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage3-Terminal-Milestone/tasks/W3.md` |
| W2 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage3-Terminal-Milestone/tasks/W2.md` |
| W1 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage3-Terminal-Milestone/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - Accepted target와 open-decision boundary는 `logs/artifacts/aiox-web-first-accepted-target-baseline.md`가 제공한다.
  - Stage 0 accepted lifecycle·authority 계약과 predecessor의 decided result만 실행 baseline으로 사용한다.
- Evidence gaps:
  - Windows ConPTY support의 Stage 9 이관 경계.
  - writer takeover UX와 screen replay는 구현하지 않는다는 observable boundary.
  - 현재 검증 host에서 측정할 PTY output chunk, WebSocket message, browser/xterm pressure의 baseline과 batching/backpressure 필요성.

## Cross-Artifact Effects

- 이 Stage의 primary 구현은 protocol architecture spec tests와 다음 Stage consumer를 함께 변경하거나 재검증한다.
- allowed write-set 밖의 effect는 조용히 적용하지 않고 새 Work Item 또는 후속 Stage handoff로 기록한다.

## Decision Candidates

- PTY output pipeline 측정 결과 correctness, responsiveness 또는 bounded-memory 요구가 확인될 때 적용할 최소 buffering/batching/backpressure mechanism.
- 측정 전에는 특정 chunk size, flush interval, queue limit 또는 batching architecture를 accepted policy로 두지 않는다.

## Verification Contract

- Revision: 2; History pointer: `2026-09-02 13:49 · Plain-shell execution and measurement contract revision`.
- Required:
  - `node-pty`가 현재 검증 host에서 실제 local shell process를 생성한다는 process identity/exit evidence와 cleanup test.
  - plain shell raw input/output, UTF-8, ANSI color, cursor control, alternate-screen 또는 동등한 deterministic TUI fixture와 Ctrl-C integration test.
  - Terminal WebSocket auth, byte input/output와 integer resize contract test.
  - PTY output chunk rate, WebSocket message frequency, browser message handling, xterm write pressure, frame stall과 memory/buffer growth를 burst/large-output workload에서 측정하고 결과를 기록한다.
  - consumer가 producer를 따라가지 못하는 상황을 재현하고, 관찰된 문제가 없으면 batching/backpressure를 구현하지 않았다는 근거를 남기며 문제가 확인되면 최소 mechanism과 전후 측정을 검증한다.
  - multiple observer single writer lease and input authorization test.
  - browser refresh, pane unmount와 Terminal WebSocket disconnect가 PTY를 암묵적으로 종료하지 않는 test.
  - explicit TerminalSession stop이 PTY/process 종료와 resource cleanup을 수행하는 browser/server integration test.
  - PTY process 생존이나 terminal output을 Agent turn active, model working, tool running 또는 awaiting approval로 해석하지 않는 boundary review.
  - git diff --check와 package registry integrity.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 2; History pointer: `2026-09-02 13:49 · Plain-shell execution and measurement contract revision`.
- Criteria:
  - TerminalSession PTY Manager TerminalView identity와 ownership이 Stage 0 contract와 일치한다.
  - Browser/xterm.js가 execution host가 아니며 실제 shell process가 Local Server의 PTY 아래에서 실행된다는 증거가 있다.
  - FitAddon pane measurement가 integer cols rows와 PTY resize로 연결된다.
  - pane close와 browser disconnect가 Runtime 또는 TerminalSession stop이 아님을 검증한다.
  - UTF-8, ANSI/cursor/TUI, burst/large-output와 explicit cleanup 시나리오가 통과하고 output pipeline 측정 결과 및 선택한 mechanism 또는 no-change 근거가 남아 있다.
  - Stage 3 process observation은 Agent activity 또는 approval projection을 만들지 않는다.
  - 현재 검증 host의 결과를 macOS/Linux/Windows 전체 지원으로 일반화하지 않으며 Windows ConPTY/process-tree와 cross-platform packaging은 Stage 9에 남긴다.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-09-02 · Stage 3 package bootstrap

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.
- Activation guard: Stage 0와 immediate predecessor가 `decided`이고 plan에서 Stage 3이 `[>]`가 되기 전에는 모든 Work Item을 `[ ]`로 유지한다.
- Task contract: Work Item별 Compact task record를 생성했으며 plan은 이 package의 task·검증·closeout 내용을 소유하지 않는다.

### 2026-09-02 13:49 · Plain-shell execution and measurement contract revision

- @user가 전달한 외부 Agent 의견을 accepted artifact와 기존 Stage 3 package/task 계약에 대조한 뒤, 정책과 일치하는 범위만 수용했다.
- Decision/clarification: Browser는 execution host가 아니라 xterm.js 기반 terminal frontend다. 실제 shell/CLI는 사용자의 local machine에서 Local Server가 PTY 아래에 생성한 OS process이며 CPU/RAM도 해당 local machine 자원을 사용한다.
- Technical model:

```text
Browser TerminalView
└─ xterm.js
   ↕ keyboard input / terminal output / resize
Terminal Stream WebSocket
   ↕
Local Server
└─ PTY Manager
   └─ node-pty
      └─ local shell
         └─ local OS process or deterministic TUI fixture
```

- Stage responsibility: Claude/Codex Adapter 없이 plain shell로 `xterm.js ↔ Terminal WS ↔ Local Server ↔ node-pty ↔ shell` 경로의 실행, 입출력, resize, ANSI/TUI, disconnect와 cleanup 가능성을 증명한다.
- Performance investigation: localhost WebSocket latency만을 병목으로 가정하지 않는다. PTY output rate → Local Server processing → WebSocket message frequency → Browser handling → xterm write pressure → rendering 전체를 burst/large-output workload로 측정한다.
- Policy correction: 기존 W2의 `backpressure를 구현한다`는 문구는 측정 전에 mechanism을 확정했다. W2를 measurement-first로 고쳐 실제 stall, unbounded buffer 또는 producer/consumer mismatch가 확인될 때만 최소 buffering/batching/backpressure를 구현한다. keyboard input은 interaction latency를 위해 별도 evidence가 없는 한 즉시 전달한다.
- Lifecycle boundary: Browser connection lifecycle, TerminalSession lifecycle과 향후 AgentRuntime lifecycle은 동일하지 않다. Stage 3은 decided Stage 0 semantics의 기술적 구현 가능성만 검증하며 AgentRuntime product behavior는 만들지 않는다.
- Non-goals: Claude/Codex adapter, vendor executable discovery/authentication, Claude confirmation/snapshot, production AgentRuntime UX와 Adapter capability abstraction은 Stage 4/5에 남긴다. Windows ConPTY/process-tree cleanup과 cross-platform packaging은 Stage 9에 남긴다.

### 2026-09-02 20:55 · Process observation and Agent activity boundary revision

- W1/W5 Brief revision 3에 `PTY process alive ≠ Agent turn active ≠ model working ≠ tool running ≠ awaiting approval` 경계를 추가했다.
- Stage 3은 process/PTY transport evidence만 생산하며 vendor structured activity와 approval normalization은 Stage 4/5 evidence를 거쳐 Stage 8이 소유한다. 새 activity enum이나 Gateway wire field는 확정하지 않았다.

### 2026-09-02 21:27 · Stage 2 accepted handoff and W1 activation

- Stage 2 Gateway Bootstrap이 accepted correction과 검증을 포함해 `decided`로 닫혔으므로 plan의 Stage 3 activation을 소비했다.
- Stage 3 implementation은 아직 시작하지 않았으며 W1 PTY/session primitive와 evidence matrix만 유일한 next로 활성화한다.
