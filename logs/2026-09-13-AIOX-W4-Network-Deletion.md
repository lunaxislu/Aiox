---
topic: AIOX W4 Network Deletion
description: 참여 중 Network 삭제 거절과 등록 경합 보호
status: decided
---

## Work Items
- [x] W1 Network 삭제 거절·등록 경합 TDD 구현과 owner 반영

## Required Context

### Return Target

- Log: `logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md`
- Work Item: W4
- Consume when: root가 W1 Brief revision 1 결과와 검증을 직접 수용하면 부모 W4 완료
- Context snapshot: W3 3d2cb21 완료; W4만 실행, commit/push 금지

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 1; History pointer: `2026-09-13 · 삭제 경계 계약과 구현`.
- Primary boundary: Network 삭제와 runtime 등록의 공통 참여 경계
- Related artifacts in allowed write-set:
  - apps/daemon/src/{networks,runtimes,daemon,http}.ts와 colocated tests; 필요시 apps/cli/src/bootstrap.test.ts.
  - docs/specs/aiox-host.md·aiox-collaboration.md·aiox-runtime.md, docs/architecture/aiox-system.md, 부모 및 이 package/task 기록.
- Excluded:
  - W5 이후, commit/push, 자동 종료·분리·Network 이동, 다른 execution-flow-map 작업.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution: 단일 delegated Compact W1; root가 contract와 source/diff/원문 result 직접 리뷰.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - N/A.
  - Activate when: large claim, public contract/security/data/release, irreversible external effect, multi-owner conflict, large blast radius, or low discovery confidence is present.

## Task Index

- Stable package key: aiox-w4-network-deletion

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W1 | Compact | delegated | `logs/packages/aiox-w4-network-deletion/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - 삭제는 NetworkService.delete 공통 경계, 등록은 RuntimeRegistry 동기 예약 뒤 binding 준비다. DB read/write는 단일 run queue를 사용한다.
- Evidence gaps:
  - 없음: root RED3·GREEN3·전체 pnpm check exit0/506 tests와 built CLI 거절/정리 후 삭제 성공 직접 검증을 수용했다. 상세는 W1 Result.

## Cross-Artifact Effects

- 삭제 정책 owner는 aiox-host, 예약과 저장 순서의 공통 invariant는 aiox-system이다. 두 owner 변경을 root가 수용했다.
- runtime/collaboration spec은 이미 host owner로 연결해 변경하지 않는다. 기존 Network 선행 삭제 테스트의 storage fault-injection 의미를 system 근거에 정정한다.

## Decision Candidates

- N/A.
- Reason: no decision candidate recorded yet.
- Activate when: decision-worthy rationale or competing options appear.

## Verification Contract

- Revision: 1; History pointer: `2026-09-13 · 삭제 경계 계약과 구현`.
- Required:
  - 최소 RED→GREEN, 삭제 거절/안내·정리 후 성공·등록과 삭제 양 순서·준비/정리 실패 잔존 및 거절 뒤 discovery/send 유지·정리/삭제 뒤 기존 참여자의 discovery/send 거절 검증.
  - pnpm check, 문서 inline 검사, log/package 구조와 registry 검사, root source/diff/실행 근거 직접 리뷰.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 1; History pointer: `2026-09-13 · 삭제 경계 계약과 구현`.
- Criteria:
  - 참여 실행을 자동 종료/분리하지 않고 삭제 거절; 예약/삭제 경합에도 삭제된 Network로 등록 성공 금지. owner 반영 및 root 결과 수용.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.
- Readiness: root Brief1 Attempt1 전체 수용, 필수 검사와 owner 반영 완료. 부모 W4에서 결과 소비 후 W5를 다음 지점으로 둔다.

## 2026-09-13 · 삭제 경계 계약과 구현

- 사용자 W4 실행 승인에 따른 code/tests/owner 공통 완료 경계로 W4만 detach했다. Brief revision 1 contract review를 root에 요청하며 production 편집은 gate 뒤 시작한다.
- 최소안: inNetwork 잔존 record로 삭제 거절, 동기 예약 이후 createBinding 호출 전에 Network 존재 검증. DB 직렬화가 앞선 삭제와 뒤 조회 순서를 보존하므로 별도 lock/Set은 추가하지 않는다. NetworkError의 기존 HTTP 400 매핑과 CLI message 전달을 재사용한다.

### 2026-09-13 00:40 · W1 contract gate 통과

root가 Scope·Brief revision 1 및 실제 삭제/등록 caller와 DB 직렬화를 직접 대조해 실행 gate를 통과시켰다. 단일 Compact W1이 최소 TDD 구현과 host/system owner를 담당하고 root가 source·diff·실행 원문을 결과 수용 전에 직접 확인한다. 자동 종료·분리·Network 이동, W5 이후와 commit/push는 제외한다.

### 2026-09-13 00:43 · W1 결과 전체 수용과 마감

root가 W1 Brief revision 1 Attempt 1을 전체 수용했다. 실제 source/tests/owner diff, 최초 RED3와 focused GREEN3, /private/tmp/aiox-w4-root-check.txt의 pnpm check exit0·506 tests를 직접 대조했다. 최종4개 회귀와 기존 정지 경합 포함 전체 suite를 통과했다. Network 삭제 guard, 등록 예약 뒤 존재/revoke 검증 및 host/system owner를 유지한다.

root는 /private/tmp/aiox-w4-cli-proof.mjs를 읽고 별도 실행해 exit0을 확인했다. built CLI의 참여 중 삭제 exit1·network_in_use·먼저 참여 정리 안내, 자동 stop 없음과 token 유지, 명시 참여 정리 후 삭제 exit0·DB 정의 부재를 확인했다. 임시 home/port 및 dummy binding만 사용했고 정리 완료다. 실제 vendor·다른 OS·CI 신규 검증으로 확대하지 않는다. 필수 검증과 registry/result consumption gate를 통과해 W1 완료 및 package decided로 닫고 부모 W4가 결과를 소비한다. commit/push는 하지 않는다.
