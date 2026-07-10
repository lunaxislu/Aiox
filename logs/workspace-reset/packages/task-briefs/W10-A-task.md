# Task Brief — W10 Batch A: architecture split readiness map (`docs/architecture/local-agent-runtime.md`)

## 맥락

`docs/architecture/local-agent-runtime.md`는 현재 aiox MVP 내부 구조의 as-built architecture
authority다. 이 batch는 그 monolith(1181줄)를 **split slice 후보로 매핑**한다. 실제 파일
분리(body split)는 하지 않는다 — @user 결정(2026-06-22) = split map 통합 패키지. owner 본문
수정은 anchor/stale reference 정합 **최소 패치**로만 한정한다(producer는 owner body를 수정하지
않고, 정합 패치 필요분은 Cross-Owner Effects에 후보로만 남긴다).

산출물은 아래 **공통 출력 표**와 **README per-document 결론**, 그리고 **as-built 6모듈 경계 vs
`src/` 대조** 결과다. 결과는 Controlling log의 Evidence Ledger / 공유 Decision Candidates /
Cross-Owner Effects 표에 기록한다.

**분업: 당신(Codex)이 이 map을 draft한다. Claude(Opus)가 checker로 검증한다.** producer는
owner body를 수정하지 않는다. 발견한 decision/disposition 후보는 **flag만** 남기고(아래 §7),
최종 승격·삭제·disposition 판정은 **W10-L이 단일 소유**한다.

Controlling log: `logs/workspace-reset/packages/2026-06-22-workspace-reset-W10-split-readiness-map.md`.

## 0. 먼저 읽어라

1. Controlling log `logs/workspace-reset/packages/2026-06-22-workspace-reset-W10-split-readiness-map.md`
   - Scope (특히 Primary owner, Allowed cross-owner updates, Cross-Owner Effects only)
   - Work Items (W3가 이 batch)
   - 최신 기록 + W1 design 확정 블록(2026-06-22)
   - active next pointer / handoff
   - 이 batch 관련 Evidence Ledger rows
2. `logs/AGENTS.md` — 특히 Workspace Reset Log Sections, 상태 라벨, split map item 10,
   "`src/` 하위 코드 = 현재 구현의 1차 사실" 원칙
3. `docs/architecture/AGENTS.md` — as-built/target 구분, code/test 근거, drift 처리
4. `docs/architecture/documentation-system.md` — architecture owner 경계(내부 구조)
5. `docs/decisions/AGENTS.md` — decision 후보가 나오면(flag만; 승격은 L 소유)

handoff의 `file:line`은 출발점이다. owner 문서 수정 전에는 최종 source에서 재검증한다.

## 1. 이 배치 범위

- 대상: `docs/architecture/local-agent-runtime.md` 전체 section(§0~§14, 서브섹션 포함).
- 제외: body split 실행(파일 분리), legacy must-check / Archive Gate / decision 승격 / source
  map 갱신(= W10-L 소유), spec(= W10-S 소유).
- 이 배치가 답해야 할 질문:
  - 각 section이 어느 split slice로 가야 하는가(as-built module/process 경계 기준).
  - **@user가 이해하는 "6모듈 상호작용" 경계가 실제 `src/` module/process 경계와 맞는가.**
  - section ID anchor(§0~§14)를 split 후에도 보존하려면 어떤 계획이 필요한가.
  - repo 전역에서 이 architecture의 어느 anchor를 누가 inbound 참조하는가.
  - split 후 `local-agent-runtime.md`를 index/overview로 남길 때 README가 별도로 필요한가.

## 2. anchor inventory (W1 확보, 2026-06-22 grep)

split 후 보존해야 할 section ID anchor. `docs/architecture/local-agent-runtime.md`, 총 1181줄.

| Anchor | Heading | Line |
| ------ | ------- | ---- |
| §0 | Purpose | 25 |
| §1 | Process Topology | 52 |
| §2 | SQLite Schema | 121 |
| §3 | Repositories | 171 |
| §4 | Daemon Lifecycle and Socket Transport | 204 |
| §4.1 | Daemon Lifecycle | 206 |
| §4.2 | Socket Transport | 230 |
| §4.3 | sendMessage end-to-end (sequence) | 250 |
| §5 | Daemon API Surface | 298 |
| §6 | Claude Adapter | 328 |
| §6.1~§6.5 | Topology / Launch / Ingress / Injection / Sequence | 330–443 |
| §7 | Codex Adapter | 481 |
| §7.1~§7.10 | Per-agent Runtime … Sequence | 485–750 |
| §8 | Cross-Cutting Message Routing | 788 |
| §8.1~§8.6 | Domain Model … Pair Reservation+Routes | 790–894 |
| §9 | CLI / Invocation / Doctor / Status | 913 |
| §9.1~§9.3 | Command Table / Invocation / Doctor+Status | 915–958 |
| §10 | Consolidated Typed Error Catalog | 976 |
| §10.1~§10.6 | Daemon API … CLI Parse | 978–1046 |
| §11 | Consolidated Events Catalog | 1066 |
| §12 | Implementation Smoke Matrix | 1098 |
| §13 | Known Gaps / Post-MVP | 1132 |
| §14 | Authority Links | 1155 |

(서브섹션 전체 줄 위치는 W1 grep 출력에 있다. inbound 참조가 §-단위로 들어오므로 이 ID 체계
보존이 split readiness의 핵심 제약이다.)

## 3. 상태 분류 규칙 (Notes/flags 라벨)

각 slice/claim의 owner 상태를 **architecture 라벨**로 분류해 공통 표 `Notes / flags`에 적는다.
slice 경계가 status를 따라가게 한다. `Post-MVP`는 상태 라벨이 아니라 출처/시점 힌트다.

- `Current` / `As-built`: 현재 코드에 실제 구현된 내부 구조
- `Target` / `Proposed`: spec/product/roadmap 달성을 위한 목표 내부 구조
- `Deferred`: 보류된 architecture 결정
- `Current gap`: 현재 구현에 존재하는 한계, 미배선, 미구현

§13(Known Gaps / Post-MVP)은 Current Gaps와 Target/Proposed/Deferred로 이미 나뉜다 — slice 시 이
경계를 유지한다.

## 4. 현재 구현 근거 / 교차 검색 (`src/` 1차 사실)

architecture는 as-built이므로 slice 경계가 코드 경계와 맞아야 한다. **"6모듈 경계 vs `src/` 대조"는
이 batch의 핵심 산출이다.**

- `src/` — module/process 경계의 1차 사실. 최소한 다음 디렉터리 경계를 확인해 slice 후보와 대조한다:
  `src/daemon/`, `src/store/`(schema·repositories), `src/core/`, `src/adapters` 또는 Claude/Codex
  adapter 경로, `src/cli` 또는 invocation 경로. 진입 함수가 무엇을 호출하는지 끝까지 추적한다 —
  주어진 line ref에서 멈추지 않는다.
- `tests/` — 동작 경계 보조 확인.
- `history/`, `plan/`, `plans/`, `prd/` — 관련 없음이어도 Ledger에 남긴다. as-built drift나 WHY가
  보이면 표시(WHY 승격 판정은 L).
- 관련 owner 문서: `docs/specs/aiox-a2a.md`(cross-reference anchor), `docs/product/roadmap.md`.

## 5. 산출 1 — 공통 출력 표 (강제)

`§0~§14` 각 section(필요 시 서브섹션)에 대해 아래 표를 채운다.

| Current section | Proposed slice | Anchor preservation | Inbound refs | Split readiness | Notes / flags |
| --------------- | -------------- | ------------------- | ------------ | --------------- | ------------- |

- **Proposed slice**: 어느 as-built slice로 갈지(예: daemon-store, claude-adapter, codex-adapter,
  message-routing, cli-errors-events-smoke). index로 남길 부분 표시. @user "6모듈" 경계와의 정합/차이를
  명시한다.
- **Anchor preservation**: split 시 §ID anchor 보존 방법.
- **Inbound refs**: 전역 grep `file:line`. 없으면 `none`.
- **Split readiness**: `ready` / `blocked(<이유>)` / `index-keep`.
- **Notes / flags**: architecture 상태 라벨 + `src/` 대조 결과(경계 일치/불일치) + 후보 flag.

### inbound reference inventory (전역 grep)

`local-agent-runtime.md`와 각 §ID를 참조하는 repo 전역 위치를 grep으로 수집해 Inbound refs에
반영하고, grep 요약을 Evidence Ledger에 남긴다.

## 6. 산출 2 — README per-document 결론

split 후 `local-agent-runtime.md`를 index/overview로 남길 때 사람용 README가 별도로 필요한가를
per-document로 판단해 표 밖 별도 결론으로 적는다(@user 기존 판단 = README는 split 시점 재판단,
하위 AGENTS만으로 충분했음을 입력으로).

## 7. Decision/disposition 후보 — flag only

split map 작성 중 decision-worthy rationale(as-built drift WHY 포함)이 보이면 Controlling log의
**공유 Decision Candidates / Cross-Owner Effects 표에 flag만** 남긴다. 최종 승격·삭제·disposition
판정은 W10-L이 단일 소유한다. 이 batch에서 decision 파일 생성·source map 수정·원본 삭제 금지.

owner body 정합 패치가 필요해 보이면 Cross-Owner Effects에 후보로만 적고 실제 수정은 하지 않는다.

## 8. Evidence Ledger 출력 (Controlling log에 기록)

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |

Finding은 `[Fact]` / `[Inference]` / `[Opinion]`으로 시작한다.

## 9. 완료 조건

- §0~§14 전 section이 공통 표로 매핑됨(Proposed slice / Anchor preservation / Inbound refs /
  Split readiness / Notes·flags 모두 채움).
- **6모듈 경계 vs `src/` 대조 결과가 각 slice의 Notes에 기록됨**(경계 일치/불일치 명시).
- inbound reference inventory가 전역 grep으로 수집되고 `file:line`으로 반영됨.
- README per-document 결론과 근거가 적힘.
- 각 slice/claim이 architecture 상태 라벨로 분류됨(§13 Current/Target 경계 유지).
- body split 미실행, owner body 미수정 확인.
- decision/disposition 후보는 flag만(공유 표), L로 넘김.
- 결과가 Controlling log Evidence Ledger / Decision Candidates / Cross-Owner Effects에 기록됨.
- **Workflow retrospective**: batch 분할, task brief, Evidence Ledger, Scope, 분업 시행착오와
  portable 후보를 Controlling log에 기록하고, portable 후보는
  `logs/log-system/2026-06-18-package-workflow-portable-pattern.md`에 축적(parent W10-2a, W10-3).
- 다음: W10-L이 이 batch의 flag를 회수한다.
