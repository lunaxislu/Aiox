---
topic: AIOX W1 External Execution Survival
description: daemon 종료 시 외부 실행 생존과 협업 해제 경계 교정
status: decided
---

## Work Items

- [x] W1 code 교정·회귀 완료 — 외부 vendor 생존과 협업 해제, daemon 소유 종료 분리를 root가 source·전체 검사·직접 실측으로 수용했다.
- [x] W2 owner·decision·로그 교정 완료 — root가 current owner와 새 교정 decision·계보·code/test 정합을 수용했다.

## Required Context

### Return Target

- Log: `logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md`
- Work Item: W1
- Consume when: root가 code/docs 결과와 전체 검증을 수용하고 부모 W1 완료 여부 판정
- Context snapshot: Stage2-3 W1; 외부 vendor 모든 OS stop/force 생존, daemon 소유 대상만 플랫폼 종료정책

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 1; History pointer: `2026-09-12 · controlling bootstrap`.
- Primary boundary: daemon 종료 대상의 실행 소유권 분리와 협업 정리 완료·실패·재시도
- Related artifacts in allowed write-set:
- apps/daemon·apps/cli·packages/protocol 및 관련 tests
- runtime spec·system/storage/vendor architecture·decision·Stage2-3 로그
- Excluded:
  - commit/push, 개인 architecture.excalidraw, W2 이후 메시지/시작/Network/Web 별도 개선.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Controlling: root; code는 /root/w1_shutdown_code, docs는 /root/stage2_3_transition의 기존 위임을 이어간다. 모두 delegated Compact이며 root 직접 result review를 수행한다.
- 기존 사용자 승인·위임 brief를 revision 1로 수록한다. 구현을 신규 조사 gate로 되돌리지 않는다.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Public contract·다중 owner 교정에 해당한다. 구현 담당과 독립된 root가 직접 source/caller·tests·새 decision/current owner를 검토하고 별도 built 실측으로 결과를 확인했다. 추가 reviewer agent는 만들지 않았다.

## Task Index

- Stable package key: aiox-w1-external-survival

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W2 | Compact | delegated | `logs/packages/aiox-w1-external-survival/tasks/W2.md` |
| W1 | Compact | delegated | `logs/packages/aiox-w1-external-survival/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - root 최종 수용: code agent pnpm check exit0 원문 확인(479 passed), root 별도 macOS 실제 owner/vendor 생존 probe exit0. 상세는 최신 결과 수용 entry.
  - 사용자 최신 정책: 외부 agent 모든 OS stop/force 생존, daemon 소유 실행만 플랫폼 정책.
  - Stage2-3 최신 정책 정정·실행 승인 entry와 기존 code audit를 인계받았다. 기존 CI는 새 수정 검증이 아니다.
- Evidence gaps:
  - 실제 Claude/Codex 및 Windows/Linux/WSL 실OS의 이번 수정 실측은 미실행이다. 플랫폼 대역 회귀와 macOS 실제 대역 vendor 경로를 구분한다.

## Cross-Artifact Effects

- 종료 대상 code 교정은 runtime spec, system/storage/vendor architecture 및 decision 참조 교정을 요구한다.
- root가 code/tests와 current owner·decision을 직접 대조해 함께 수용했다. 변경은 유지하며 미해결 후처리 후보는 부모 W2/W3/W6로 인계한다.

## Decision Candidates

- docs/decisions/external-execution-survival.md accepted: Windows idle 판정 비용 절감을 외부 수명까지 확장한 오류를 교정한다. 기존 decision WHY는 보존하고 계보 링크만 추가한다.

## Verification Contract

- Revision: 1; History pointer: `2026-09-12 · controlling bootstrap`.
- Required:
  - code agent의 RED→GREEN 회귀, 관련 package tests 및 code agent의 pnpm check 원문을 root가 직접 확인한다. root는 별도 built 실행 실측을 수행한다. 외부 일반/force 생존·협업 해제·실패 재시도와 daemon 소유 플랫폼 동작 대조.
  - 문서 inbound/outbound·decision 계보·log/package check·onramp·diff check. 실제 OS/vendor 미검증은 구분해 보고.
- Recommended:
  - N/A.
- Unavailable/waived:
  - 실제 Claude/Codex·Windows/Linux/WSL 실OS 신규 검증은 이번 완료 범위에 포함하지 않는다. root가 플랫폼 대역/대역 vendor 한계를 명시해 수용했으며 실제 vendor 통합은 후속 Stage3/4, OS 통합은 관련 단계에서 수행한다.

## Closeout Contract

- Revision: 1; History pointer: `2026-09-12 · controlling bootstrap`.
- Readiness: root가 두 Brief revision 1/Attempt 1 결과를 전체 수용했다. 아래 registry/result-consumption 확인 후 부모 W1 소비·마감한다.
- Criteria:
  - root가 code/docs candidate를 실제 diff·source·검증 결과로 수용하고 정책 및 owner drift를 닫는다.
  - 미완료 OS/실제 vendor 범위와 다른 Stage2-3 W로 넘길 후처리 후보를 명시한다. commit/push 없이도 검증 결과 수용은 가능하다.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-09-12 · controlling bootstrap

사용자 W1 실행 승인과 root의 package activation 판정을 소비했다. 종료정책 code와 owner가 같은 완료 조건을 공유하므로 현재 W1만 분리했다. 이미 실행 중인 code/docs brief를 task record로 연결하며 미래 개선 scaffold는 만들지 않는다. root가 계약 범위·검증·금지·최종 수용을 소유한다. 이 기록은 기존 위임의 계약 문서화이며 실제 검증 완료나 root 결과 수용을 뜻하지 않는다.

### 2026-09-12 22:19 · root 결과 수용·종료와 부모 W1 반환

root가 code W1·docs W2의 Brief revision 1/Attempt 1을 실제 source/callers/tests·current owner·새 decision과 대조해 전체 수용했다. artifact disposition은 모두 유지이며 corrective/revert는 없다. 공개 종료 계약과 여러 owner가 함께 바뀌는 위험은 구현 agent와 독립된 root 직접 리뷰로 검증했고 추가 reviewer agent를 만들지 않았다. 계약의 root pnpm check 표현은 code agent 실행 원문을 root가 확인하고 root가 별도 실제 실행을 검증하는 분담으로 바로잡았다. 전체 check를 중복 실행하지 않았다.

code agent의 최종 pnpm check는 exit0, 479 tests passed다(daemon176 CLI47 config28 domain28 protocol10 terminal87 vendor3 persistence14 web20 adapter66). root는 /private/tmp/aiox-w1-check.txt 원문을 확인했다. 이전 unused RawData lint 및 남은 nested stopRuntime 인자 typecheck 실패는 수정 후 재통과했으며 /private/tmp/aiox-w1-check-typecheck-failure.txt를 실패 경위로 남긴다. production net -159, test/helper 포함 apps/packages net -223은 root numstat 보고 기준이며 문서 변경은 제외다.

root는 node /private/tmp/aiox-w1-survival-probe.mjs를 실제 권한 환경에서 실행해 exit0을 확인했다. 일반 stop owner53959/vendor53960, force owner53961/vendor53962 모두 registrationRemoved, mcpListenerClosed, postStopIO, ownerLocalCleanup이 true였다. built daemon과 현재 source를 임시 bundle한 runExternal, 별도 실제 OS owner와 대역 vendor를 사용했다. daemon 종료 뒤 stdin ECHO와 CLI 연결 손실 진단, vendor 자연 종료와 dispose를 확인했고 ps로 네 PID 잔존 없음도 확인했다. 실제 Claude/Codex·Windows/Linux/WSL 실OS를 이번에 실행한 결과는 아니며 플랫폼 분기는 대역 회귀다. CI·commit·push는 수행하지 않았다.

stopTerminal의 fail-closed는 협업 정리 완료 전 PTY를 종료하지 않는 보호로 보존했다. drain/DB close 오류 흡수는 이번에 수정하지 않았으며 부모 W2 메시지/W3 시작 자원 경계의 미검증 후보로 넘긴다. closeIdle·ps 진단은 W6 검토로 남긴다. 이 후보를 해결했다고 확대하지 않으면서 W1의 외부 수명 교정은 완료한다.

Task Index는 code W1/docs W2 두 Compact record와 일치하며 각 역방향 Identity·경로를 확인하고 package check를 통과했다. 두 결과와 source·검증의 root 수용을 accepted Evidence/effect/decision과 record에 반영해 Result Consumption Gate를 통과했다. 부모 Stage2-3 W1은 결과를 소비해 완료하고 W2를 다음 재개로 표시한다. 이번은 W2 착수가 아니다. 이 package의 남은 실행/검증 blocker는 없고 한계·후속 owner를 명시했으므로 decided로 닫는다.
