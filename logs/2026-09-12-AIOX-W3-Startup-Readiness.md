---
topic: AIOX-W3-Startup-Readiness
description: 시작·재시작의 준비 및 성공 공개와 현재 daemon 조회 경계 개선
status: decided
---

## Work Items
- [x] W1 시작·재시작·조회 경계 구현과 실패 주입 회귀 검증
- [x] W2 현재 동작의 owner 반영과 package 기록·링크 검증

## Required Context

### Return Target

- Log: `logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md`
- Work Item: W3
- Consume when: root가 코드·실패 회귀·owner와 두 task 결과를 직접 대조해 수용한 뒤 Stage2-3 W3를 완료한다.
- Context snapshot: W1 a039525와 W2 839c890 커밋 완료. W3 실행만 승인했으며 후속 commit/push·W4 이후 실행은 제외한다.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 1; History pointer: `2026-09-12 · W3 실행 계약과 위임`.
- Primary boundary: restart 사전 준비와 prepared child 시작, 필수 자원 readiness·cleanup 및 현재 실행 발견
- Allowed write-set: apps/cli/src/bootstrap.ts 및 colocated tests; apps/daemon/src/{bootstrap,daemon,main}.ts 및 colocated tests; docs/specs/aiox-configuration-web.md·aiox-runtime.md, docs/architecture/aiox-storage-terminal.md·aiox-system.md; package/task records와 부모 Stage2-3 로그.
- packages/config/src 공개 준비 기능·tests 또는 protocol 변경이 필요하면 실제 write-set 확장 전 root와 계약을 갱신한다.
- Excluded: W4 이후 구현, 자동 이전 daemon 복원, 자동 재연결, 불가능한 사전 실행 보장, commit/push, architecture.excalidraw, 다른 작업 untracked, 사용자 daemon/vendor 조작.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution: Compact delegated W1 code/tests, W2 owner/records. root가 contract와 source·diff·실행 원문을 직접 리뷰한다. 한 artifact는 한 담당자만 수정한다.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate: CLI public 동작과 다중 owner 변경이다. 구현 담당과 독립된 root가 직접 contract/result review를 수행한다. 별도 reviewer는 실제 미해결 위험이 생길 때 판단한다.

## Task Index

- Stable package key: aiox-w3-startup-readiness

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W2 | Compact | delegated | `logs/packages/aiox-w3-startup-readiness/tasks/W2.md` |
| W1 | Compact | delegated | `logs/packages/aiox-w3-startup-readiness/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - 사용자 W3 실행 승인과 부모의 restart 새 config·사전 검증·override 변경 안내 정책을 입력으로 삼는다.
  - Git HEAD 839c890413837ce8d6bc3a9c8c0672d4a1442af1 직접 확인. W1/W2 완료·커밋 기반은 재작업하지 않는다.
  - root built probe 직접 실행 exit 0: stdin EOF snapshot·명시 home·Web/state readiness·부모 프로세스 종료 후 daemon 생존, 본인 daemon stop 뒤 state/process 정리, 실제 state write EISDIR child exit 1·두 포트 종료. 근거·환경은 최신 root built 검증 entry.
  - root 전체 수용: W1/W2 Brief1/Attempt1, source/diff/RED/GREEN·pnpm check exit 0/502 tests 원문과 후속 doctor focused 1·built 직접 실행을 대조했다.
- Evidence gaps:
  - 범위 내 미해결 gap 없음. 신규 vendor·다른 OS/CI는 실행하지 않았다.

## Cross-Artifact Effects

- CLI/daemon 준비 순서·성공 공개·현재 실행 발견은 configuration/runtime spec 및 system/storage architecture의 관련 claim과 대조한다. 4개 owner 반영과 최종 source/test range 대조를 root가 수용했고 candidate 의존 재검증을 마쳤다.

## Decision Candidates

- N/A.
- Reason: 기존 시작/조회/종료 경계를 구현·검증한 변경이며 새 선택 근거를 별도 decision으로 소유할 필요가 없다.
- Activate when: decision-worthy rationale or competing options appear.

## Verification Contract

- Revision: 1; History pointer: `2026-09-12 · W3 실행 계약과 위임`.
- Required:
  - production TDD: 잘못된 새 config·실행 준비/빌드 실패가 stop 전에 거절됨, prepared 결과 소비, override 변경 안내 순서.
  - Web 준비 지연·상태 파일 실패 주입에서 조기 성공 금지와 소유 자원 정리. 현재 daemon 조회가 잘못된 다음 config와 분리되고 doctor가 기록 포트를 사용함.
  - DB close catch의 실제 영향·완료 의미를 확인하고 수정/보존 근거를 기록한다. W1 외부 생존·OS별 일반 stop 정책을 보존한다.
  - focused tests + pnpm check + git diff --check; owner 링크·registry·onramp 정합과 root source/diff/출력 직접 대조.
  - 임시 home/포트 및 본인이 만든 프로세스만 사용한다.
- Recommended:
  - N/A.
- Unavailable/waived:
  - 필수 waiver 없음. 신규 vendor·다른 OS/CI는 수행하지 않았다.

## Closeout Contract

- Revision: 1; History pointer: `2026-09-12 · W3 실행 계약과 위임`.
- Criteria:
  - restart 준비·readiness·발견 책임의 회귀와 owner 반영, DB close 후보 disposition을 root가 직접 확인한다.
  - W1/W2 exact Brief revision/Attempt Result를 root가 수용하고 문서의 candidate 의존을 재검증한다.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.
- Readiness: root가 두 Result 전체 수용, owner·registry·의존 재검증 완료. 부모 W3 소비 및 W4 next 정합으로 마감한다.

## 2026-09-12 · W3 실행 계약과 위임

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-09-12 23:18 · bootstrap·root contract review

사용자 W3 실행 승인과 root의 package activation을 소비해 부모 W3에서 controlling package를 detach하고 Compact delegated W1(code/tests)·W2(owner/records)를 등록했다. root가 디스크의 Scope·write-set·Verification/Closeout 및 두 Brief revision 1을 직접 읽고 범위 정합·검증 실행 가능성·마감 판정 가능성을 확인해 contract gate를 통과했다. W1 구현과 W2 owner 조사를 시작하며 결과 수용은 아직 하지 않았다.

준비 config/home의 child 전달은 내장 IPC 또는 stdin 중 구현 담당이 최소 방법을 선택한다. boot snapshot 소비와 새 shell의 최신 config 경로를 구분한다. config/protocol 공개 변경은 현재 필요 없으며 필요해지면 root와 write-set을 갱신한다. Before는 root 현재 source 대조 근거이고 신규 실패 재현·After 구현 근거와 구분한다.

package-log detach/task와 log item/context 도구를 사용했다. package 계약·Compact Brief 본문은 도구 미지원 표면이어서 수동 작성했다. 부모 current context의 W2 미커밋 문구는 Git HEAD 839c890 확인으로 정정했고 과거 History는 보존했다.

### 2026-09-12 23:39 · 종료 상태 기록과 restart 경계 추가 확인

root source 리뷰에서 이전 boot의 closed 후 상태 파일 삭제와 restart의 이전 listener 비응답 확인→새 상태 파일 기록 사이를 추가 확인 대상으로 지정했다. DB close가 지연되면 이전 cleanup이 새 상태 파일을 삭제할 수 있다는 코드상 가능성이며, 이 entry 시점에 실제 재현 결과는 아직 없다.

root는 기존 W3 startup/restart cleanup 검증의 구체화로, 상태 삭제를 이전 listener 해제 전에 완료하고 DB close는 그 뒤에 두는 최소안을 허용했다. 실패 진단과 stale-state·listener 종료 의미를 구분한다. 별도 scope나 공개 protocol 확장이 아니며 W1이 실제 회귀로 검증하고 W2가 최종 source 대조 후 owner 순서를 반영한다. 결과 수용은 계속 대기다.

### 2026-09-12 23:45 · root built daemon 실패·준비 검증

root가 code agent 작성 /private/tmp/aiox-w3-startup-built.mjs 원문을 직접 읽고 실행해 exit 0을 확인했다. stdin EOF 설정 snapshot·명시적 home·Web/state 준비와 시작시킨 프로세스 종료 후 daemon 생존을 확인했다. 본인이 시작한 daemon stop 뒤 상태 파일 삭제·프로세스 exit를 확인했고, 실제 상태 파일 경로 EISDIR 실패에서는 child exit 1 및 두 포트 종료를 확인했다.

환경은 darwin Node24.14.0, root 임시 home /private/tmp/aiox-w3-startup-built-mssZyS, 실행 5.157초다. 임시 자원 cleanup 완료를 root가 보고했다. 이는 root 직접 실행 근거이며 문서 agent의 직접 실행으로 표현하지 않는다. 사용자 daemon/vendor와 실제 Claude/Codex·다른 OS/CI 검증을 뜻하지 않는다. 전체 pnpm check와 W1/W2 exact 결과 수용은 아직 대기다.

### 2026-09-12 23:50 · root 결과 전체 수용과 부모 반환

root가 W1/W2 Brief revision 1 Attempt 1을 전체 수용했다. production/tests·owner diff와 두 Result, 주요 RED/GREEN 원문, /private/tmp/aiox-w3-startup-check.txt 전체 원문(502 tests), check 뒤 test-only doctor assertion focused 1 원문을 직접 대조했다. root built probe 이후 production은 바뀌지 않았다. 변경은 유지하며 corrective/revert가 없고, W2의 W1 candidate 의존은 최종 source/claim·추가 assertion에 따른 evidence range 재검증으로 해소됐다.

재시작 선행 준비·새 설정 snapshot 전달, 다른 daemon 목표 API 포트 응답 시 종료 거절, Web/state 이전 성공 공개 금지·실패 자원 정리, 현재 조회와 다음 config 진단 분리를 수용했다. DB close 무진단은 stderr 진단 추가로 처리하고 listener 종료 의미를 보존했다. 이전 상태 파일 삭제는 listener 해제 전으로 옮겼으며 DB close 지연 동안 새 파일 보존은 실제 임시 파일·제어 gate 회귀다. CLI 두 프로세스 경합의 과거 실측으로 확대하지 않는다.

실제 built 준비/실패 검증은 앞선 root 직접 실행 entry를 따른다. 초기 readiness RED는 callback 미호출, 초기 state-order RED는 owner 문자열 기대 실패이며 최종 HTTP/upgrade 503·실제 파일 보존 GREEN과 구분한다. 잘못된 test filter·clock/타입·fixture와 spawn 오류 보완의 세부 경위는 W1 Task History에 보존했다. 전체 check exit 0, lint/format/build/typecheck와 총 502 tests(daemon189/CLI57)를 확인했고 후속 doctor assertion도 focused 1·CLI typecheck 통과다. 신규 실제 vendor·Windows/Linux/WSL 실OS·CI는 수행하지 않았다.

두 Compact record와 W-id/Identity/Task Index의 양방향 registry, owner 링크·inline-code·diff·onramp를 검증했다. Runtime/configuration spec·system/storage architecture 4파일에 owner를 반영했고 새 decision은 필요하지 않았다. Package 두 Result를 소비해 마감하고 부모 Stage2-3 W3를 완료한다. W4는 다음 재개 포인터일 뿐 실행 승인이나 착수가 아니다. W3 변경은 미커밋이며 commit/push를 하지 않았다.
