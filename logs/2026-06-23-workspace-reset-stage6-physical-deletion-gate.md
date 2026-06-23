---
topic: workspace reset stage6 물리 삭제 게이트
description: workspace reset plan stage 6 — legacy source map과 history migration map을 소비해 삭제 대상을 확정하고, 삭제 전 owner·decision·archive의 history 출처를 평문 provenance로 전환한 뒤 history/·docs/aiox·prd/·plan/을 물리 삭제하는 실행 게이트
status: open
---

## Work Items

- [>] W1 삭제 대상 확정 — 두 source map을 소비해 stage 6 물리 삭제 대상을 확정한다. legacy source absorption map(`logs/2026-06-21-workspace-reset-legacy-source-absorption.md`)의 stage-6 target rows(`prd/`·`plan/`·`docs/aiox/`)와 history migration map(`logs/2026-06-19-workspace-reset-W5-history-migration.md`, `history/` 60개)을 대조한다. 비대상 분리: `plans/post-mvp*`(plan stage 9 소유), `prd/post-mvp/aiox-a2a-spec.md`(source map disposition = `keep / execution successor pending` — plan stage 6 본문은 삭제 예고하나 source map은 단일 A2A execution plan successor 전까지 보류; 이 충돌을 stage 6에서 판정).
- [ ] W2 provenance 평문화 — W1 확정 대상으로 들어오는 inbound 참조를 평문 provenance로 전환해, 물리 삭제 후에도 WHY·검증 출처가 self-contained하게 한다. 대상(stage 5 W2 flag): decision 다수가 `history/*` 인용(정식경로 31 + 줄임표기 16), decision 3개가 `docs/aiox/*`·`prd/post-mvp/archive/*` 인용, archive digest의 history provenance. 평문화는 owner 문서 본문 수정이므로 보고·@user 승인 후 수행한다.
- [ ] W3 물리 삭제 실행 — W1/W2 완료 + @user 확인 후 `history/`·`docs/aiox`·`prd/`·`plan/`를 물리 삭제한다. 되돌릴 수 없으므로 폴더 단위로 self-contained 검증과 사용자 확인을 받고 삭제한다.
- [ ] W4 closeout & handoff — 삭제 결과를 legacy source map·history map의 최종 disposition에 반영하고, plan stage 6를 `[x]`로 닫는다. 후속 stage 7(Atlas 설계·구현)로 handoff.

### Scope

- Primary owner:
  - workspace reset plan stage 6(물리 삭제 게이트) 실행 결과(이 로그)와 `plans/workspace-reset/workspace-reset.md` stage 6 상태 전이.
- Allowed cross-owner updates:
  - `plans/workspace-reset/workspace-reset.md` — stage 6 상태 전이·closeout.
  - provenance 평문화 대상 owner 문서(`docs/decisions/*`, archive digest, 필요 시 `docs/architecture/`·`docs/specs/` inbound) — `history/*`·`docs/aiox/*`·`prd/*` 참조를 평문 provenance로 전환. 본문 수정은 보고·@user 승인 후.
  - legacy source map·history migration map의 최종 disposition 반영.
- Cross-Owner Effects only (이 단계가 직접 수정하지 않음):
  - `plans/post-mvp*` 삭제·roadmap repoint → plan stage 9 소유.
- Evidence inputs:
  - `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`(stage-6 target rows, disposition).
  - `logs/2026-06-19-workspace-reset-W5-history-migration.md`(`history/` owner map).
  - `logs/2026-06-22-workspace-reset-stage5-link-권위-세션재개.md`(W2 inbound flag, stage 6 진입 전제 판정).
  - `logs/2026-06-23-workspace-reset-pre-validation-spike-archive.md`·`logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md`(archive digest successor).
  - `plans/workspace-reset/workspace-reset.md` stage 6 본문.

### Evidence Ledger

| Topic | Source | Lines | Finding | Owner impact | Action |
| ----- | ------ | ----- | ------- | ------------ | ------ |

### Decision Candidates

| Source | Lines | Why decision-worthy | Proposed decision | Status |
| ------ | ----- | ------------------- | ----------------- | ------ |

### Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |

### Closeout

- Updated owner documents:
- Validation result:
- Remaining gaps:
- Workflow retrospective:
- Next owner/log:

## 2026-06-23 · stage 6 게이트 진입 — 전이로 활성화, 삭제 대상 확정 대기

Parent pointer: `plans/workspace-reset/workspace-reset.md` stage 6(`history/ · docs/aiox · prd/ · plan/ 물리 삭제 게이트`)
소비 map: `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`(legacy) + `logs/2026-06-19-workspace-reset-W5-history-migration.md`(history)

stage 5 검증 게이트(`logs/2026-06-22-workspace-reset-stage5-link-권위-세션재개.md`)가
`decided`로 닫히고 plan stage 6가 `[>]`로 활성화되면서 이 로그가 stage 6를 소유한다.
plan stage 6 pointer는 이 로그로 repoint됐다(이전엔 decided inventory 로그를 가리키던 stale 상태,
stage 5 W4 ④ 이슈 — 이 전이로 해소).

**stage 6 진입 전제 (stage 5에서 충족, 확인한 사실):**

- dead link 0 / 중복 권위·역할 충돌 0 / 잔여 owner 명확화 / stale 0 (stage 5 W2~W4 PASS).
- legacy source map W3 archive digest 완결: pre-validation 2 + docs/aiox manual smoke/E2E 2 →
  digest 2파일(`logs/2026-06-23-...pre-validation-spike-archive.md`,
  `logs/2026-06-23-...aiox-smoke-test-archive.md`). industry-precedents self-sufficiency 확인.
- legacy source map stage-6 target rows disposition 확정(`absorb→delete` /
  `archive→delete` digest done / `delete-only`).

**@user 결정 (2026-06-23):** decision 14파일 `history/` provenance 평문화는 stage 6 전제가
아니라 **stage 6 작업(W2)**으로 이동한다(plan stage 6 본문 `workspace-reset.md:30`이 "삭제 전
평문 provenance 전환 후 삭제"를 명시 소유).

**이 게이트가 소유하는 것:**

1. W1 삭제 대상 확정 — 두 map 소비. legacy map stage-6 rows + history map.
2. W2 provenance 평문화 — inbound `history/*`·`docs/aiox/*`·`prd/*` 참조를 평문 전환(owner 본문 수정, @user 승인 후).
3. W3 물리 삭제 — `history/`·`docs/aiox`·`prd/`·`plan/`(되돌릴 수 없음, @user 확인 후 폴더 단위).
4. W4 closeout — map 최종 disposition 반영, plan stage 6 `[x]`, stage 7(Atlas) handoff.

**경계 / 미해소 flag (W1에서 판정):**

- `plans/post-mvp*`는 이 게이트 대상이 **아니다**(plan stage 9 소유).
- `prd/post-mvp/aiox-a2a-spec.md`는 plan stage 6 본문(line 34)은 "W8 소모 후 삭제"로 적지만,
  legacy source map row disposition은 `keep / execution successor pending`(§11 plan execution
  detail이 단일 A2A execution plan successor 필요)이다. [Inference] 이 두 기록이 충돌하므로
  W1에서 `prd/post-mvp/aiox-a2a-spec.md`의 실제 stage 6 삭제 가부를 source map 기준으로 판정한다
  (현 disposition대로면 stage 6 비대상, stage 9 successor 후 재판정).

**다음:** W1 — 두 source map을 소비해 실제 삭제 대상을 확정하고, 위 충돌(`prd/post-mvp/aiox-a2a-spec.md`)을 판정한다.
