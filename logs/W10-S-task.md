# Task Brief — W10 Batch S: spec split readiness map (`docs/specs/aiox-a2a.md`)

## 맥락

`docs/specs/aiox-a2a.md`는 aiox A2A 외부 contract(protocol/interface/state)의 primary
owner다. 이 batch는 그 monolith를 **split slice 후보로 매핑**한다. 실제 파일 분리(body
split)는 하지 않는다 — @user 결정(2026-06-22) = split map 통합 패키지. owner 본문 수정은
anchor/stale reference 정합 **최소 패치**로만 한정한다(이 batch의 producer는 owner body를
수정하지 않는다; 정합 패치 필요분은 Cross-Owner Effects에 후보로만 남긴다).

산출물은 아래 **공통 출력 표**와 **README per-document 결론**이며, 결과는 Controlling log의
Evidence Ledger / 공유 Decision Candidates / Cross-Owner Effects 표에 기록한다.

**분업: 당신(Codex)이 이 map을 draft한다. Claude(Opus)가 checker로 검증한다.** producer는
owner body를 수정하지 않는다. 발견한 decision/disposition 후보는 **flag만** 남기고(아래 §7),
최종 승격·삭제·disposition 판정은 **W10-L이 단일 소유**한다.

Controlling log: `logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`.

## 0. 먼저 읽어라

1. Controlling log `logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`
   - Scope (특히 Primary owner, Allowed cross-owner updates, Cross-Owner Effects only)
   - Work Items (W2가 이 batch)
   - 최신 기록 + W1 design 확정 블록(2026-06-22)
   - active next pointer / handoff
   - 이 batch 관련 Evidence Ledger rows
2. `logs/AGENTS.md` — 특히 Workspace Reset Log Sections, 상태 라벨, split map item 10
3. `docs/specs/AGENTS.md` — spec 작성 규칙, 상태 어휘, section ID 보존, split 규칙
4. `docs/architecture/documentation-system.md` — spec owner 경계(외부 contract)
5. `docs/decisions/AGENTS.md` — decision 후보가 나오면(flag만; 승격은 L 소유)

handoff의 `file:line`은 출발점이다. owner 문서 수정 전에는 최종 source에서 재검증한다.

## 1. 이 배치 범위

- 대상: `docs/specs/aiox-a2a.md` 전체 section(§2~§9, 서브섹션 포함).
- 제외: body split 실행(파일 분리), legacy must-check / Archive Gate / decision 승격 / source
  map 갱신(= W10-L 소유), architecture(= W10-A 소유).
- 이 배치가 답해야 할 질문:
  - 각 section/claim이 어느 split slice로 가야 하는가(owner slice 경계).
  - section ID anchor(§2~§9)를 split 후에도 보존하려면 어떤 계획이 필요한가.
  - repo 전역에서 이 spec의 어느 anchor를 누가 inbound 참조하는가.
  - split 후 `aiox-a2a.md`를 index/overview로 남길 때 README가 별도로 필요한가.

## 2. anchor inventory (W1 확보, 2026-06-22 grep)

split 후 보존해야 할 section ID anchor. `docs/specs/aiox-a2a.md`, 총 870줄.

| Anchor | Heading | Line |
| ------ | ------- | ---- |
| §2 | Glossary | 44 |
| §3 | Layer model | 71 |
| §3.1 | Runtime config / profile namespace | 82 |
| §4 | A2A protocol과 message lifecycle | 115 |
| §4.1 | Canonical envelope v1 | 120 |
| §4.2 | Routing and reply correlation | 188 |
| §4.3 | Delivery, acknowledgement, retry | 228 |
| §4.4 | Baseline error model and defaults | 290 |
| §4.5 | Reference runtime persistence minimum | 309 |
| §5 | Adapter (4-slot + capability tier) | 416 |
| §6 | Compose (declarative composition) | 533 |
| §7 | Capability와 sandbox | 603 |
| §7.1 | Claude/Codex projection feasibility (2026-06-11) | 652 |
| §7.2 | Trust boundary and data handling | 719 |
| §8 | Federation / remote | 738 |
| §9 | Open / deferred | 801 |

(§1은 문서 intro/status 정의 블록이다. inbound 참조가 §-단위로 들어오므로 이 ID 체계를
보존하는 것이 split readiness의 핵심 제약이다.)

## 3. 상태 분류 규칙 (Notes/flags 라벨)

각 slice/claim의 owner 상태를 **spec contract 라벨**로 분류해 공통 표 `Notes / flags`에 적는다.
slice 경계가 status를 따라가게 한다. `Post-MVP`는 상태 라벨이 아니라 출처/시점 힌트다.

- `Current Contract`: 현재 구현·테스트가 제공하는 외부 동작
- `Target Contract` / `Proposed Contract`: 목표/제안된 외부 계약
- `Deferred`: 보류된 contract
- `Open Issue`: 아직 결정되지 않은 contract 질문
- `Implementation Gap`: current implementation이 current/target contract와 어긋나는 지점

## 4. 현재 구현 근거 / 교차 검색

split map은 본문 재검증이 아니라 **경계 매핑**이 목적이므로 W7/W8에서 최신화된 본문을 신뢰
출발점으로 쓰되, slice 경계가 코드·legacy와 어긋나 보이면 교차 확인한다.

- `src/`, `tests/` — slice가 가리키는 contract가 현재 코드와 정합한지 spot-check.
- `history/`, `plan/`, `plans/`, `prd/` — 관련 없음이어도 Ledger에 남긴다. 특히
  `prd/post-mvp/aiox-a2a-spec.md`는 이 spec의 legacy monolith source다(상세 흡수 판정은 L).
- 관련 owner 문서: `docs/architecture/local-agent-runtime.md`(cross-reference anchor),
  `docs/product/roadmap.md`(gate 참조).

## 5. 산출 1 — 공통 출력 표 (강제)

`§2~§9` 각 section(필요 시 서브섹션)에 대해 아래 표를 채운다.

| Current section | Proposed slice | Anchor preservation | Inbound refs | Split readiness | Notes / flags |
| --------------- | -------------- | ------------------- | ------------ | --------------- | ------------- |

- **Current section**: §ID + heading.
- **Proposed slice**: 어느 owner slice 문서로 갈지(예: message-lifecycle/envelope, adapter-capability,
  compose, capability-sandbox, federation-open). index로 남길 부분도 표시.
- **Anchor preservation**: split 시 §ID anchor를 어떻게 보존할지(예: index에 stub anchor + 링크,
  slice 문서에 §ID 유지).
- **Inbound refs**: repo 전역 grep으로 이 section/anchor를 참조하는 곳(`file:line`). 참조 없으면
  `none`.
- **Split readiness**: `ready` / `blocked(<이유>)` / `index-keep`(분리 말고 index 유지).
- **Notes / flags**: spec contract 상태 라벨 + decision/disposition 후보 flag(있으면).

### inbound reference inventory (전역 grep)

`aiox-a2a.md`와 각 §ID를 참조하는 repo 전역 위치를 grep으로 수집해 표의 Inbound refs에 반영하고,
원본 grep 결과 요약을 Evidence Ledger에 남긴다. post-mvp plan들이 §4/§5/§9 등을 참조한다는
기존 관찰(W4.5 로그)을 출발점으로 두되 실제 현재 상태를 grep으로 재확인한다.

## 6. 산출 2 — README per-document 결론

README는 per-section이 아니라 **per-document 판단**이라 표 밖 별도 결론으로 둔다.

- split 후 `aiox-a2a.md`를 index/overview로 남길 때 사람용 README가 별도로 필요한가?
- @user 기존 판단(README는 split 시점에 필요성 재판단; 하위 AGENTS만으로 충분했음)을 입력으로
  두고, split readiness 관점에서 현재 결론과 근거를 적는다.

## 7. Decision/disposition 후보 — flag only

split map 작성 중 decision-worthy rationale이나 legacy disposition 판단이 보이면 Controlling log의
**공유 Decision Candidates / Cross-Owner Effects 표에 flag만** 남긴다. 최종 승격·삭제·disposition
판정은 W10-L이 단일 소유한다. 이 batch에서 decision 파일 생성·source map 수정·원본 삭제 금지.

owner body(`docs/specs/aiox-a2a.md`) 정합 패치가 필요해 보이면 Cross-Owner Effects에 후보로만
적고 실제 수정은 하지 않는다(producer는 body 미수정).

## 8. Evidence Ledger 출력 (Controlling log에 기록)

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |

Finding은 `[Fact]` / `[Inference]` / `[Opinion]`으로 시작한다.

## 9. 완료 조건

- §2~§9 전 section이 공통 표로 매핑됨(Proposed slice / Anchor preservation / Inbound refs /
  Split readiness / Notes·flags 모두 채움).
- inbound reference inventory가 전역 grep으로 수집되고 `file:line`으로 표에 반영됨.
- README per-document 결론과 근거가 적힘.
- 각 slice/claim이 spec contract 상태 라벨로 분류됨.
- body split 미실행, owner body 미수정 확인.
- decision/disposition 후보는 flag만(공유 표), L로 넘김.
- 결과가 Controlling log Evidence Ledger / Decision Candidates / Cross-Owner Effects에 기록됨.
- **Workflow retrospective**: batch 분할, task brief, Evidence Ledger, Scope, 분업에서 생긴
  시행착오와 portable 후보를 Controlling log에 기록하고, portable 후보는
  `logs/2026-06-18-package-workflow-portable-pattern.md`에 축적(parent W10-2a, W10-3).
- 다음: W10-L이 이 batch의 flag를 회수한다.
