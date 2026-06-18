---
topic: workspace reset 폴더별 inventory와 문서 판정
description: workspace reset stage 3 — 현재 repo 문서를 폴더별로 inventory하고 각 파일을 keep/merge/migrate/split/archive/delete로 판정한다
status: open
---

## Work Items

- [x] W1 폴더별 현재 파일 목록을 inventory하고 판정 대상을 추출한다
- [x] W2 판정 결과를 사용자에게 보고하고 이견·보정을 반영한다
- [x] W3 plan/ migration — 실행 plan 이동과 plan-side roadmap 입력 정리 (W3-3은 W5로 이관)
  - [x] W3-1 plan/post-mvp.plan.md + plan/post-mvp/ 구현 sub-plan 4개(envelope-metadata·codex-structured-metadata-spike·adapter-dispatch-registry·channel-boot-surface) + release-plan.md → plans/ 이동 (ops-setup.plan.md 제외 — 2026-06-16 정정). plans/post-mvp.plan.md Execution 자기참조 plan/→plans/ 정리 포함
  - [x] W3-2 plan 계열 roadmap 입력 후보 정리 — docs/product/roadmap.md provisional(W4 통합 입력/draft) 유지 + release-plan=spec §11 G6 packaging gate 실행 plan 연결 본문 한 줄 추가
    - plans/post-mvp.plan.md Sequenced/Candidates
    - plans/release-plan.md의 G6 packaging 실행 plan 성격
    - 살아있는 post-mvp sub-plan 우선순위
  - [x] W3-3 Transferred: plan/mvp-implementation-checklist.md·qa-tracker.md archive → W5 (W5-4) — inbound ~47곳 중 ~38이 W5 대상 history/라, history/ 재판정 배치에서 logs/ 이동+생존 참조 갱신을 함께 처리. 지금 이동하면 docs/aiox/(keep) 4곳 영구 dead link + history/ ~38 임시 dead link 발생. dead link 0 우선이라 연기. plan/는 이 둘 때문에 W5까지 잔존
  - [x] W3-4 plan/workspace-reset/ 전체 + plan/README.md → delete 완료. plan/ 폴더 자체는 W3-3 연기로 잔존(checklist·qa-tracker 2개)
  - [x] W3-5 ops-setup.plan.md 흡수 후 삭제 완료 — inbound 3곳 정리(post-mvp.plan.md Execution 포인터 제거·운영환경셋업 문단/Open 상세 포인터 재지정 + history/59 Related 줄 제거). vault/atlas는 W5에서 history/59 읽고 owner 확정(지금 포인터 안 박음)
- [x] W4 a2a-spec monolith를 owner별 product/spec/architecture/roadmap으로 증류 완료 (2026-06-16). 기존 PRD monolith는 self-contained owner 문서로 분해하고 삭제
  - [x] W4-1 `docs/product/product.md` 생성 — a2a §0·§13.6·§13.7 (제품 목적·primary user·JTBD·non-goal·cross-vendor framing·Google A2A naming 주의·adoption/commercial hypotheses). 로그 없이 읽히는 self-contained
  - [x] W4-2 `docs/specs/aiox-a2a.md` 생성 — a2a §2~§9 (glossary·layer·envelope·routing·delivery·adapter·compose·capability·federation·open/deferred). **원본 §2~§9 section ID 보존**. 서두에 §0→product·§1→architecture 분리 명시. `docs/specs/aiox-mvp.md`는 만들지 않음
  - [x] W4-3 `docs/aiox/mvp-architecture.md` → `docs/architecture/mvp-architecture.md` 승격 (as-built 권위). self-reference·authority links·inbound 갱신. a2a §1/§3 current/as-built 구조·flow·trust boundary·architecture asset은 중복 추출 없이 필요한 note만 대조
  - [x] W4-4 `docs/product/roadmap.md` 최종 통합 — a2a §11 전체 + §12 **gate/phase 요약만** + plan-side draft + release-plan G6 연결. provisional 제거. §12 file:line·심각도·dated audit 상세는 roadmap 제외(W5 후보)
  - [x] W4-5 W5 이관 후보 등록(지금 이동 안 함) — a2a §12 상세 audit·a2a §13 rationale/evidence·`logs/2026-06-11-A2A-spec-…`·`logs/2026-06-11-aiox-제품-방향-…`·`prd/pre-validation/*` 2개·`prd/post-mvp/archive/*` 5개 → W5 evidence/history/decision 판정
  - [x] W4-6 inbound 갱신 후 원본 삭제 — `plans/` live 권위 참조와 `docs/aiox/` 포인터 갱신 → mvp-spec Open Issue #5(session expiry) 누락분을 새 specs §9에 흡수 → 기존 A2A PRD·MVP PRD·`prd/README.md` 삭제
- [x] W4.5 Transferred: owner 문서 정제와 질문 중심 탐색 → `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` — parent log가 길어져 W4.5 범위를 child 로그로 분리
- [x] W7 child W4.5 로그 및 W7 local runtime assimilation 패키지 완료 후 parent 반영 — `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md`와 `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`가 끝나면 결과를 이 로그에 반영하고 W5로 진행
- [>] W5 history/ migration — 핵심 결정 파일 판정 후 docs/decisions/ 이관
  - [ ] W5-1 파일별 판정: ①docs/decisions/ 후보 ②decided 로그 이관 ③제거
  - [ ] W5-2 판정 후보 docs/decisions/ 이동 실행
  - [ ] W5-3 history/README.md → delete
  - [ ] W5-4 (W3-3 이관) plan/mvp-implementation-checklist.md·qa-tracker.md → logs/ archive + 생존 inbound 참조(history/ keep분·docs/aiox/ 4·plans/ 등) 갱신을 history/ 재판정과 같은 배치로 수행. 완료 후 빈 plan/ 폴더 제거
- [ ] W6 나머지 정리 — spike/, docs/claude/ split
  - [ ] W6-1 spike/ → spikes/ 이동
  - [ ] W6-2 docs/claude/mcp-channel-mental-model.md → architecture/spec/decision 섹션 분리

## 2026-06-16 · stage 3 시작

stage 2(taxonomy 책임 문서 확정) 완료. `docs/architecture/documentation-system.md` 확정.

이 단계는 확정된 taxonomy를 기준으로 현재 repo의 실제 파일을 검토해 각 파일의 처우를 판정한다.
판정 기준: `documentation-system.md`의 소유 경계와 scoped authority.
판정 결과(이동·통합·삭제)는 W2 사용자 보정과 최종 실행 방침 확정 뒤 이 로그의 W3~W6에서 실행한다.

## 2026-06-16 · W2 보정 반영

subagent 3종으로 확인한 결과를 반영해 W1 판정을 보정했다.

**보정 내용:**
1. `docs/aiox/` → 사용자 개인 이해용이므로 전체 keep (migrate/archive/delete 취소)
2. `spike/RUNBOOK*.md` → docs/guides/ 아님. spikes/ 내에 유지
3. `legacy/bridge-relay-v1/` → 보존 (delete 취소)
4. `history/` → 2026-06-12 결정 반영: ①책임문서 반영 ②decided 로그 이관 ③Git history로 충분하면 제거. docs/history/ 폴더는 새 taxonomy에 없음
5. `plan/post-mvp.plan.md` + `plan/post-mvp/` 5개 파일 → 아직 유효(WS2~4 미착수). plans/로 migrate
6. `plan/release-plan.md` → 유효한 미래 계획. plans/로 migrate
7. `docs/claude/mcp-channel-mental-model.md` → 주 architecture, 일부 spec/decision 혼재 → split 판정으로 변경

---

## 2026-06-16 · W1 inventory (보정 완료)

판정 기호: **keep** · **migrate** · **split** · **archive** · **delete** · **→판정필요**

---

### 루트

| 파일 | 판정 | 비고 |
|------|------|------|
| `CLAUDE.md` | keep | AGENTS.md pointer — taxonomy 정합 |
| `AGENTS.md` | keep | agent 작업 규칙 소유자 |
| `README.md` | keep | 사람용 진입점. dev quickstart + runtime profile 설명, 내용 적합 |
| `architecture.excalidraw` | keep | 시각 다이어그램 |
| `package.json` 외 코드 파일 | keep | 구현 |

---

### `docs/`

**taxonomy에 없는 폴더가 다수 존재. `docs/aiox/`, `docs/claude/` 는 새 taxonomy에 없음.**

**새 taxonomy에서 아직 없는 폴더**: `docs/product/`, `docs/specs/`, `docs/decisions/`
→ stage 4에서 migrate 실행 시 생성.

#### `docs/architecture/`
| 파일 | 판정 | 비고 |
|------|------|------|
| `documentation-system.md` | keep | taxonomy 권위 문서 |

#### `docs/guides/`
| 파일 | 판정 | 비고 |
|------|------|------|
| `workflow.md` | keep | 반복 실무 흐름 소유자 |

#### `docs/claude/`
| 파일 | 판정 | 비고 |
|------|------|------|
| `mcp-channel-mental-model.md` | split | 주 내용: architecture(내부 구조·data flow·process 경계). 운영 이슈 목록 일부: spec 경계. flag 선택 배경: decision 경계. W5에서 섹션별로 architecture/spec/decision으로 분리해 migrate |

#### `docs/aiox/` (19파일)

사용자 개인 이해용 learning record 모음. **전체 keep** — 정리 대상 아님.

---

### `history/` (60파일 + README)

**2026-06-12 결정**: history 타입은 새 taxonomy에서 제거. `docs/history/` 폴더 없음.
기존 `history/` 파일은 파일별로 판정:
1. **책임 문서 반영** → docs/decisions/ · docs/specs/ · docs/architecture/ 로 올림
2. **decided 로그 이관** → 권위 문서만으로 복원 어려운 경위는 `logs/`로 이관
3. **제거** → Git history로 충분하면 삭제

**README.md** → delete (구 taxonomy 설명)

**유형별 처리 방침** (W4에서 파일별 확정):

| 유형 | 대상 | 방침 |
|------|------|------|
| 핵심 설계 결정 + 유효 rationale | `13`(rewrite 기준), `15`(MVP 설계), `42`(MVP closeout), `58`(post-mvp A2A 결정) | → `docs/decisions/` migrate 후보 |
| Step 완료 기록 | `16`~`41` step 파일들 | 책임문서 반영 분리 후 → decided log 이관 또는 제거 |
| QA/smoke test 기록 | `43`, `44`, `57` | → decided log 이관 또는 제거 |
| 단기 분석·조사 | `27`, `32`, `41`, `49`~`56` | → 제거 후보 (Git history로 충분) |
| post-mvp 설계 논의 | `45`~`48`, `59` | WS2~4 진행 시 docs/decisions/ 이동 검토 |

**→ W4에서 history/ 파일별 판정.**

---

### `legacy/`

`legacy/bridge-relay-v1/` — 구 구현체. **keep** (보존 확정).

---

### `logs/`

| 파일/폴더 | 판정 |
|----------|------|
| 모든 closed 로그 (`2026-06-*.md`) | keep (decided log) |
| 현재 open 로그 | keep |
| `AGENTS.md` | keep (logs 스코프 agent 규칙) |
| `CLAUDE.md` | keep (pointer) |

---

### `plan/` (구 폴더)

새 taxonomy에서 `plans/`로 일원화. `plan/`은 구 폴더.

확인 결과: post-mvp.plan.md WS2~4 미착수·유효, post-mvp/ 5개 deferred·유효, release-plan.md 미완료 블로커 있음·유효.

| 파일/폴더 | 판정 | 비고 |
|----------|------|------|
| `README.md` | delete | 구 taxonomy 설명 |
| `mvp-implementation-checklist.md` | archive → `logs/` | MVP 완료, decided log |
| `qa-tracker.md` | archive → `logs/` | QA 4라운드 완료, decided log |
| `release-plan.md` | migrate → `plans/` | W3-1. Claude가 `plans/release-plan.md`로 선이동했으며 W3 정리 시 검증·기록 |
| `post-mvp.plan.md` | migrate → `plans/` | W3-1 |
| `post-mvp/` (5개 sub-plan) | migrate → `plans/post-mvp/` | W3-1 |
| `workspace-reset/` (전체) | delete | W3-4 |

---

### `plans/` (새 폴더)

| 파일 | 판정 |
|------|------|
| `AGENTS.md` | keep |
| `workspace-reset/workspace-reset.md` | keep (현재 활성 plan) |

---

### `prd/`

구 taxonomy의 "최상위 권위 source". 새 taxonomy에서 `docs/specs/`와 `docs/product/`로 분리.

| 파일 | 판정 | 새 위치 |
|------|------|--------|
| `README.md` | delete | 구 taxonomy 설명 |
| `mvp/aiox-mvp-spec.md` | migrate | `docs/specs/aiox-mvp.md` |
| `post-mvp/aiox-a2a-spec.md` | migrate | `docs/specs/aiox-a2a.md` |
| `post-mvp/archive/*.md` (5개 validation opinion) | archive | decided log — `logs/`에 이동 또는 현위치 유지 |
| `pre-validation/*.md` (2개) | archive | validation 결과, decided log |

**추가 필요 (새 taxonomy에서 누락):**
- `docs/product/product.md` — 제품 목적·범위·원칙. `prd/mvp/aiox-mvp-spec.md`에서 추출
- `docs/product/roadmap.md` — 우선순위·추진 순서. post-mvp plan에서 추출

---

### `spike/` vs `spikes/`

두 폴더가 공존. 새 taxonomy는 `spikes/`만 정의.

| 파일/폴더 | 판정 | 비고 |
|----------|------|------|
| `spikes/` 전체 (4개 PoC) | keep | taxonomy 정합 |
| `spike/aiox-channel-marketplace/` | migrate → `spikes/` | 실험 코드, 같은 성격 |
| `spike/build-plugin.sh` | migrate → `spikes/aiox-channel-marketplace/` | 해당 spike 빌드 스크립트 |
| `spike/RUNBOOK.md` + `RUNBOOK_SIMPLE.md` | migrate → `spikes/aiox-channel-marketplace/` | docs/guides 아님. spike 전용 runbook으로 spike 내 유지 |

---

### `scripts/`

| 파일 | 판정 |
|------|------|
| `scripts/onramp` | keep |
| `scripts/test-onramp.sh` | keep |

---

### `.agents/`, `.codex/`, `.ai/`, `.claude/`

tooling 설정 폴더 — keep (변경 없음)

---

## 2026-06-16 · 최종 실행 방침 확정

**방침**: 새 문서를 먼저 만들지 않는다. 기존 파일을 권위 위치로 이관하면서 필요한 새 문서(product.md, roadmap.md)를 이관 대상 파일에서 추출·생성한다. 이관 순서: plan/ → prd/ → history/.

**이유**: 기존 파일이 권위 내용을 이미 소유하고 있으므로 이동이 먼저다. 새 문서는 이동된 소스에서 추출해야 drift가 없다.

**실행 순서:**

| 단계 | 대상 | 새 위치 / 산출물 |
|------|------|----------------|
| W3 | plan/post-mvp.plan.md + post-mvp/ 5개 + release-plan.md | plans/ 이동 |
| W3 | plan/post-mvp.plan.md Sequenced + WS | docs/product/roadmap.md 추출 생성 |
| W3 | plan/mvp-implementation-checklist, qa-tracker | logs/ archive |
| W3 | plan/workspace-reset/, plan/README | delete |
| W4 | prd/mvp/aiox-mvp-spec.md | docs/specs/aiox-mvp.md 이동 |
| W4 | prd/post-mvp/aiox-a2a-spec.md | docs/specs/aiox-a2a.md 이동 |
| W4 | 두 spec에서 제품 목적·범위·원칙 | docs/product/product.md 추출 생성 |
| W4 | prd/post-mvp/archive/ 5개, prd/pre-validation/ 2개 | logs/ archive |
| W4 | prd/README | delete |
| W5 | history/ 60파일 파일별 판정 | docs/decisions/ / logs/ / delete |
| W5 | history/README | delete |
| W6 | spike/ → spikes/ | 이동 |
| W6 | docs/claude/mcp-channel-mental-model.md | architecture + spec + decision split |

**판정 요약:**

| 판정 | 대상 |
|------|------|
| keep | 루트, docs/architecture/, docs/guides/, docs/aiox/, logs/, plans/, scripts/, legacy/, tooling |
| migrate | plan/ 7개 → plans/, prd/ 2개 → docs/specs/, spike/ 3개 → spikes/ |
| 추출·생성 | docs/product/product.md (prd 소스), docs/product/roadmap.md (plan 소스) |
| split | docs/claude/mcp-channel-mental-model.md → architecture/spec/decision |
| archive → logs/ | plan 2개, prd 7개 |
| delete | plan/README, plan/workspace-reset/, prd/README, history/README |
| W5 파일별 판정 | history/ 60파일 |

## 2026-06-16 · W3 관계 점검과 순서 확인

사용자 요청으로 `plan/workspace-reset/workspace-reset.md`, `plans/workspace-reset/workspace-reset.md`,
root `AGENTS.md`, `plan/post-mvp.plan.md`, `plan/post-mvp/ops-setup.plan.md`의 관계를 점검했다.

- `plans/workspace-reset/workspace-reset.md`: 현재 workspace reset의 top-level stage plan이다. W1/W2가 끝났으므로 활성 단계는 "승인된 이관·통합·삭제"이며, 이 단계의 세부 실행은 이 로그의 W3~W6이 소유한다.
- `plan/workspace-reset/workspace-reset.md`: legacy 진입점과 과거 snapshot이다. root `AGENTS.md`가 hook 전환 전 읽기 진입점으로만 유지한다고 정의하며, 현재 상태 권위는 open 로그와 `plans/workspace-reset/workspace-reset.md`에 있다. W3-4에서 삭제 대상이다.
- root `AGENTS.md`: 현재 workspace reset 동안의 운영 계약이다. 문서 정리가 끝나기 전에는 새 workflow/hook/skill, Vault/Atlas 구현을 시작하지 말라고 막는다. 다만 기존 plan 문서 안의 유효한 결정·상태·후속 작업을 권위 문서로 이전하는 것은 현재 W3 범위다.
- `plan/post-mvp.plan.md`: Post-MVP 구현 index다. workspace reset의 실행 대상이지 현재 실행할 제품 구현 plan이 아니다. W3-1에서 `plans/`로 이관하고, Sequenced/WS 내용은 W3-2에서 `docs/product/roadmap.md`의 입력으로 추출한다.
- `plan/post-mvp/ops-setup.plan.md`: Post-MVP 구현을 여러 세션에서 운영하기 위한 ops/tooling sub-plan이다. `post-mvp` 5개 sub-plan 중 하나로 W3-1에서 함께 이관한다. 이 파일의 내용을 지금 구현하지는 않지만, 이미 repo integration/log skill에 흡수된 내용과 남은 후속 작업을 분리해 W3-2의 roadmap/권위 문서 추출 입력으로 쓴다.
- `plans/release-plan.md`: Claude가 이미 `plan/release-plan.md`에서 선이동했다. W3-1 범위에 포함해 이동 사실과 링크 정합성을 검증한다.

현재 순서 확인: W3에서 `plan/` 문서의 유효 내용을 먼저 권위 위치로 이전·추출하고, 그 다음에 archive/delete를 수행한다. 이후 W4 `prd/` migration과 `product.md` 추출, W5 `history/` 파일별 판정, W6 `spike/`/`docs/claude/` split로 진행한다. `ops-setup.plan.md` 안의 새 구현 작업은 후속이지만, `ops-setup.plan.md` 자체의 상태 정리와 권위 문서 이전은 현재 W3 작업이다.

## 2026-06-16 · 사용자 보정 — ops-setup과 workflow 통합 판단

사용자가 W3 순서를 보정했다.

- 현재 작업은 `plan/` 문서 내용을 각 권위 문서로 이전하는 것이 먼저이고, 삭제는 그 뒤다.
- `ops-setup.plan.md`는 현재 W3에서 다룰 작업 대상이다. 단, hook/skill/Vault/Atlas 구현을 지금 시작한다는 뜻이 아니라 이 plan의 유효 상태, 결정, 후속 작업을 권위 위치로 이전·정리한다는 뜻이다.
- WS3 다세션 stage workflow는 현재 log skill, repo integration, open 로그 Work Items/next pointer와 handoff 규칙으로 사실상 통합된 것으로 본다. 별도 WS3 workflow 구현 또는 문서가 필요한지 여부는 남은 gap이 실제로 확인될 때만 재평가한다.
- legacy `plan/workspace-reset/workspace-reset.md`의 오래된 taxonomy snapshot, `Current Work: TAX-LIFECYCLE`, 기존 WS2 구현 중단 문구는 현재 open 로그와 `plans/workspace-reset/workspace-reset.md`가 이미 대체하므로 유지할 필요가 없다. W3-4에서 삭제 대상으로 처리한다.

## 2026-06-16 · ops-setup 흡수·삭제 판정 확정과 W3-1/W3-2 정정

@user: ops-setup의 이미 흡수된 항목(WS1 메모리정책·AGENTS.md 정리 Phase 1·WS3 다세션 workflow·Cross-WS automation)은 현재 log skill·scripts/onramp·AGENTS.md·open log next pointer로 대체됐음을 확정. settings 위생·/aiox-stage skill은 보존하지 않고 삭제로 판단.

**@claude·@codex 합의 (ops-setup 흡수·삭제 판정):**

- settings 위생(`settings.json`/`settings.local.json` 분리 + stale MCP·permission cleanup·least-privilege)과 `/aiox-stage` skill(stage exit gate = `pnpm test && pnpm typecheck` 강제) → 보존 안 함, 삭제. 근거: workflow/handoff 역할은 log skill·onramp이 이미 흡수했고 남은 값은 미래 tooling 아이디어이며 AGENTS.md가 구현 재개를 차단. owner map상 roadmap이 아니라 agent workflow/tooling 영역.
- WS4 vault/atlas → 내용 owner는 ops-setup이 아니라 `history/59-local-obsidian-vault-atlas-discussion.history.md`. ops-setup 삭제해도 손실 0. W5(history 정리)에서 history/59를 읽고 확정 결정은 `docs/decisions/`, 미확정 논의는 decided log/제거로 파일별 판정. reset plan 포인터는 그때 최종 owner를 가리키게 확정 — 지금 history/59 포인터를 박지 않음(W5 후 dead link 회피). history/59가 decision인지 discussion인지는 W5에서 실제로 읽고 판정(현재 미열람 — AGENTS.md가 vault/atlas 착수 시에만 열람 허용).
- 결론: `ops-setup.plan.md` = 흡수 완료 + 삭제. 단 "지금 즉시"가 아니라 inbound 참조 정리 후 삭제(조건부).

**@codex가 확정한 삭제 전 inbound 참조 3곳:**

1. `plan/post-mvp.plan.md:21` Execution — ops-setup을 "진행/handoff owner"로 가리킴.
2. 같은 파일 Open 블록 + "운영 환경 셋업" 문단 — ops-setup을 상세 owner처럼 참조.
3. `history/59:10` Related — ops-setup을 가리킴. ops-setup 삭제와 **같은 배치**에서 정리해야 W3 직후 dead link 0 유지.

**W3-1/W3-2 정정 (owner map 정합 @codex 확인):**

- W3-1: ops-setup을 plans/ 이동집합에서 제외. 이동 대상 = 구현 sub-plan 4개(envelope-metadata·codex-structured-metadata-spike·adapter-dispatch-registry·channel-boot-surface) + release-plan.md + post-mvp.plan.md.
- W3-2: roadmap.md 추출 입력에서 ops-setup WS 내용 제외. 추출 입력 = post-mvp.plan.md `Sequenced`만. (roadmap owner = 제품 우선순위·추진 순서이지 agent 운영 workflow나 local tooling hygiene 아님)
- W3-5 신설: ops-setup inbound 참조 3곳 정리 후 `ops-setup.plan.md` delete.

**실행 순서 (@claude·@codex 일치):**

1. W3-1/W3-2 정정(이 기록).
2. post-mvp.plan.md의 ops-setup inbound 참조 제거·대체 + history/59:10 Related 같은 배치.
3. ops-setup.plan.md delete.
4. (W5) history/59 읽고 vault/atlas 최종 owner 확정.

## 2026-06-16 · W3/W4 Work Items 재정의 — roadmap을 W4 최종 통합으로, W3-2는 plan-side draft로

@codex(사용자 전달): 직전 W3-2 실행이 `docs/product/roadmap.md`를 "최종 roadmap"처럼 생성했는데, roadmap 최종본은 W4에서 prd A2A spec과 통합해야 확정된다. 현재 Work Items가 그 오해를 유도하므로, 파일을 더 고치기 전에 작업 정의를 먼저 바꾼다.

@user: 이 방향 채택. 순서 = (1) Work Items 정정 → (2) 기존 W3-1/W3-2 결과 재분류 → (3) roadmap provisional 표시 → (4) W3 계속.

**W3 재정의:** 제목을 "실행 plan 이동과 plan-side roadmap 입력 정리"로. W3-2는 "최종 roadmap 생성"이 아니라 "plan 계열 roadmap 입력 후보 정리"이며 산출물 `docs/product/roadmap.md`는 최종본이 아닌 **W4 통합 입력/draft**로 표시한다. W3-5에 ops-setup inbound 정리 + history/59 Related의 W5 배치 처리를 명시.

**W4 재정의:** "기존 spec→docs/specs 이관 + product 추출"에서 "PRD/spec을 owner별(product/specs/architecture)로 분리 + roadmap 최종 통합"으로 확장. 신규 W4-4(roadmap 최종 통합)에서 W3 plan-side draft + `prd/post-mvp/aiox-a2a-spec.md` §11 Release roadmap·§12 defect stage mapping + `release-plan.md` G6 packaging을 합친다. 기존 W4 항목 보존 매핑: 기존 W4-3(product 추출)→새 W4-1, 기존 W4-1·W4-2(spec 이동)→새 W4-2, 기존 W4-4(prd archive)·W4-5(README delete)→새 W4-6, rationale/audit류는 새 W4-5로 W5 판정에 위임.

**현재 W3-1/W3-2 결과 재검토:**
- W3-1(파일 5개 plans/ 이동) = 새 정의와 동일, 유효. 변경 없음.
- W3-2(roadmap.md 생성) = 파일을 삭제·재작성하지 않고 **성격만 재분류** — plan-side draft/input으로 강등. roadmap.md 서두에 provisional note + W4-4 통합 대상(§11/§12, release-plan G6) pending 명시.

## 2026-06-16 · W3 실행 — W3-2 마무리·W3-1·W3-5·W3-4 완료, W3-3 W5 이관

@user 지시 순서대로 실행: W3-2 마무리 → W3-1 cleanup → W3-5 → (W3-3는 W5 이관) → W3-4.

**W3-2 마무리.** `docs/product/roadmap.md` 본문(소유 경계 문단 뒤)에 `plans/release-plan.md`는 roadmap
항목이 아니라 `prd/post-mvp/aiox-a2a-spec.md` §11 G6 npm packaging gate의 실행 plan(배포 시점 패키징
체크리스트)이며 packaging 게이트 owner는 §11 G6과 release-plan이라는 한 줄 연결을 추가. provisional
header는 유지.

**W3-1 cleanup.** `plans/post-mvp.plan.md` Execution 블록 자기참조 `plan/post-mvp.plan.md` → `plans/`.
전수 조사 결과 moved sub-plan 내 `plan/→plans/` 잔여 참조는 없음. envelope-metadata의 `plan/qa-tracker`·
`plan/mvp-implementation-checklist`와 release-plan의 `plan/qa-tracker`는 `→logs/` 이동 대상이라 W5(W5-4)에서 갱신.

**W3-5 완료.** ops-setup inbound 3곳 정리 후 `plan/post-mvp/ops-setup.plan.md` `git rm`:
①Execution 블록 ops-setup 포인터 줄 제거, ②"운영 환경 셋업" 문단 + Open `상세=ops-setup.plan.md`를
log skill·`scripts/onramp`·`AGENTS.md`·open log next pointer가 흡수로 재지정, ③`history/59:10` Related의
ops-setup 줄 제거. 잔여 `plans/post-mvp.plan.md:27`은 과거 commit(1b26d9b)의 historical "Working state"
서술(탐색 포인터 아님)이라 합의 3곳 밖 — 보존. vault/atlas는 history/59를 W5에서 읽고 owner 확정(포인터 미박음).

**W3-4 완료.** `plan/workspace-reset/` 전체(`log.md`·`logs/*` 5개·`workspace-reset.md`·`AGENTS.previous.md`)
+ `plan/README.md` `git rm`. `log.md`/`logs/`만 먼저 지우면 legacy `workspace-reset.md` 내부 참조가 dead link가
되므로 폴더 전체를 한 배치로 삭제(@user). legacy topic logs(log.md + logs/*)의 결론은 이미
`docs/architecture/documentation-system.md`·`plans/AGENTS.md`·`logs/AGENTS.md`·`docs/guides/workflow.md`와
현재 inventory log로 증류됐고 현재 owner가 아님 → superseded.
삭제로 stale해진 live 참조 = active plan `plans/workspace-reset/workspace-reset.md`의 Completion condition·마지막
Stage 한 곳뿐. 실제 상태에 맞게 조정(legacy `plan/workspace-reset/` 자료는 W3-4 삭제 완료, 남은 졸업 대상은
임시 `AGENTS.md` 진입 계약). root `AGENTS.md`에는 legacy 진입점 참조 이미 없음(확인).

**W3-3 W5 이관(연기).** `plan/mvp-implementation-checklist.md`·`plan/qa-tracker.md`의 archive 판정은 유지하되
지금 이동하지 않음. 이유: inbound ~47곳 중 ~38이 W5 대상 `history/`이고, 4곳은 keep 확정 `docs/aiox/`(지금 옮기면
영구 dead link). dead link 0이 우선이라, `history/` 재판정 배치에서 `logs/` 이동 + 생존 참조 갱신을 함께 처리(W5-4 신설).
이 두 파일 때문에 `plan/` 폴더는 W5까지 잔존 — W3에서 `plan/`을 억지로 완전히 비우지 않는다(@user).

**W3 순서 조정(@user 확정):** W3-2 마무리 → W3-5 ops-setup 삭제 → W3-3은 W5 이관 표시 → W3-4는 `plan/workspace-reset/`
+ `plan/README.md`만 삭제(`plan/` 폴더는 checklist/qa 때문에 W5까지 잔존). W3 stage는 이로써 종료, next = W4.

**dead-link 검증 기준(미확정 — W4 link·권위·세션 재개 검증 단계로 넘김):** closed/decided 로그(예
`logs/2026-06-12-…taxonomy-단계.md`, `2026-06-09`, `2026-06-13`)에 남은 "legacy source를 읽었다/삭제 대상이다" 류
서술은 historical record로 보존한다(작업 경위 owner = logs). 최종 dead-link 검증이 "과거 삭제된 source path 언급"까지
잡을지는 기준 확정 필요. 현재 작업 기준 = 검증 범위를 **현재 권위·active 문서의 live 탐색 포인터**로 한정하고 decided
로그의 historical 서술은 제외(W3-5·W3-4에서 이 기준으로 처리). W4 검증 단계에서 사용자 확인.

## 2026-06-16 · W4 실행안 확정과 결정 2건

@user W4 실행 승인. 교차 분석 결론(a2a-spec=임시 수집 monolith·base source, mvp-spec=a2a+mvp-architecture에 흡수된 삭제 후보, mvp-architecture=as-built 권위라 docs/architecture 승격, 두 2026-06-11 로그=§11~§13 rationale owner)을 W4 기준으로 고정. owner 매핑·실행 순서는 보정된 Work Items(W4-1~W4-6)가 소유.

**결정 1 — specs section ID 보존:** `docs/specs/aiox-a2a.md`는 원본 a2a-spec의 **§2~§9 section ID를 그대로 보존**한다. 근거: `plans/post-mvp.plan.md` + sub-plan 5개가 `implements: aiox-a2a-spec.md §4/§5/§9`처럼 section 번호를 live 권위 참조로 가리킨다(총 7곳). 증류로 §0→product, §1→architecture가 빠져도 §2~§9 번호를 재배치하지 않아 plans/ 참조가 깨지지 않게 한다. §0·§1 자리는 비우고 서두 note로 분리 위치만 밝힌다.

**결정 2 — §12 거처:** a2a §12(공개 전 결함 단계 매핑)는 roadmap에 **gate/phase 요약만** 반영하고 file:line·심각도·2026-06-11 dated audit 상세는 넣지 않는다. 근거: §12는 수정되면 낡는 시점성 dated audit이라 "제품 추진 순서" 문서(roadmap)를 오염시킨다. 상세 audit은 W5 evidence/decision/log 판정 후보로 넘긴다.

**self-contained 원칙:** product/spec/architecture/roadmap 각 문서는 로그를 읽어야 이해되는 형태가 되면 안 된다. 필요한 현재 계약은 각 문서 본문이 가져가고, 로그는 provenance/rationale 근거로만 남긴다. cross-vendor framing처럼 자급에 필요한 최소 중복은 허용.

**W5 이관 후보(지금 이동 안 함, W4-5에서 등록만):** a2a §12 상세 audit, a2a §13 rationale/evidence, `logs/2026-06-11-A2A-spec-구현-가능성과-제품성-조사.md`, `logs/2026-06-11-aiox-제품-방향-질의응답.md`, `prd/pre-validation/*` 2개, `prd/post-mvp/archive/*` 5개.

**pre-validation 흡수 지점(확인):** sqlite-restart-recovery PASS 결론(WAL·delivering→queued·idempotency·parent_message_id) → a2a §4.3 + mvp-architecture §2에 흡수. claude-codex PASS 결론(Claude channel injection·Codex thread-targeted turn/start) → a2a §5 + mvp-architecture §6/§7에 흡수. spike 코드는 spikes/에 live(keep). 원문 처리는 W5 evidence 판정.

## 2026-06-16 · W4 실행 완료 — owner 문서 생성·승격·roadmap 통합·원본 PRD 삭제

@user 요청: Claude 세션 한도 도달 후 W4-2 이후를 이어서 실행. Codex가 subagent 3개를 사용해
disjoint write scope로 나눴고, 이후 live 참조 갱신과 원본 삭제를 통합했다.

**W4-1 product owner.** `docs/product/product.md` 생성 완료. A2A monolith의 §0·§13.6·§13.7을
제품 목적, primary user, JTBD, non-goal, cross-vendor local collaboration framing, Google A2A
naming/positioning 주의, adoption/commercial hypotheses로 증류했다. 로그 없이 읽히는
self-contained product 문서로 둔다.

**W4-2 protocol/spec owner.** `docs/specs/aiox-a2a.md` 생성 완료. 원본 §2~§9 section ID를
그대로 보존했고, §0 product context는 `docs/product/product.md`, §1 current/as-built
architecture는 `docs/architecture/mvp-architecture.md`로 분리됐다는 preface를 추가했다.
`docs/specs/aiox-mvp.md`는 만들지 않았다. `prd/mvp/aiox-mvp-spec.md`의 Open Product Issue #5
(AI agent session expiry handling)는 새 specs §9 open/deferred에 흡수했다.

**W4-3 architecture owner.** `docs/aiox/mvp-architecture.md`를
`docs/architecture/mvp-architecture.md`로 승격했다. 헤더와 §14 Authority Links를 as-built
architecture authority 기준으로 바꾸고, legacy MVP PRD·pre-validation은 primary authority가
아니라 흡수/삭제 또는 W5 evidence 후보로 낮췄다. `docs/aiox/README.md`에는 direct old-path
mention이 없어 수정하지 않았다.

**W4-4 roadmap owner.** `docs/product/roadmap.md`의 provisional wording을 제거하고, a2a §11
G0~G6와 Phase 0~3를 backbone으로 최종 통합했다. `plans/release-plan.md`는 G6 packaging gate의
실행 checklist로 연결했다. a2a §12는 file:line, severity, dated audit detail 없이
gate/phase pressure summary만 반영했고, 상세 audit은 W5 evidence/decision/log 후보로 남겼다.

**W4-5 W5 후보.** 지금 이동하지 않을 후보를 유지한다: a2a §12 상세 audit, a2a §13
rationale/evidence, `logs/2026-06-11-A2A-spec-구현-가능성과-제품성-조사.md`,
`logs/2026-06-11-aiox-제품-방향-질의응답.md`, `prd/pre-validation/*` 2개,
`prd/post-mvp/archive/*` 5개. archive 5개 상단의 consolidation pointer는 새
`docs/specs/aiox-a2a.md`로 갱신했지만 원문 내부 historical references는 W5 판정 대상으로 둔다.

**W4-6 inbound와 삭제.** `plans/post-mvp.plan.md`와 post-mvp sub-plan 4개의 live A2A 권위
참조를 `docs/specs/aiox-a2a.md`로 갱신했다. 삭제될 MVP PRD를 가리키던 `docs/aiox/` learning
record 6개는 `docs/architecture/mvp-architecture.md` 또는 `docs/specs/aiox-a2a.md` owner로
갱신했다. 이후 `prd/post-mvp/aiox-a2a-spec.md`, `prd/mvp/aiox-mvp-spec.md`, `prd/README.md`를
삭제했다.

**검증/잔여.** `rg` 기준 current owner docs와 `plans/`에는 삭제된 PRD를 가리키는 live 권위
참조가 남지 않았다. 남은 mention은 이 inventory log의 historical 기록/Work Items 설명,
`prd/post-mvp/archive/codex-opinion.md` 내부의 과거 input 목록처럼 W5 archive/evidence 판정
대상인 historical text다. W4 완료로 next pointer는 W5로 이동한다.

## 2026-06-16 · W4.5 owner 문서 정제 필요 — W4 이관본 제품 문서 topology 정제 판단

@user 리뷰: W4는 정보 손실 0을 우선한 1차 이관으로 완료됐다. W5로 바로 가지 않고 W4.5 owner 문서 정제를 먼저 수행한다. next pointer = W5 → W4.5.

**판단 기록:**

- `docs/product/product.md`의 non-goal 목록은 roadmap/phase와 혼선을 만들 수 있으므로 product 본문에서 제거/최소화 후보.
- spec은 현재 구현 설명 문서나 진행 상태표가 아니라 contract 문서다. 구현 구조와 실제 지원 상태는 `docs/architecture/`, code/tests, roadmap evidence가 소유한다. spec에는 필요할 때만 contract 범위, release gate 관련성, 미결정/open question을 명시한다.
- architecture는 현재 구현 구조와 수정 지점의 as-built map이다.
- roadmap은 현재 구현 baseline에서 release target까지 무엇을 어떤 gate로 닫는지 소유한다.
- plans는 spec owner가 아니라 spec/roadmap/architecture를 구현하기 위한 실행 레이어다.
- logs/AGENTS.md와 겹치지 않게, product/spec 구현 흐름은 `docs/guides/workflow.md`에 두는 후보가 맞다.
- distribution 문서(`docs/product/distribution.md`) 생성 여부를 후보로 남긴다: roadmap=언제/어디까지, distribution=어떤 형태로 배포, plans/release-plan.md=실행 checklist라는 경계 구분.

## 2026-06-16 · W4.5 진행 방식 조정 — 질문 중심 탐색과 FE 관점 이해 보조

@user 피드백: W4.5는 단순 owner 문서 정제만으로는 부족하다. 사용자가 roadmap/spec/architecture의 흐름을 직접 이해해야 Codex/Claude에게 더 정확히 지시하고, 빠진 내용이나 작성 규칙을 판단할 수 있다. 사용자는 프론트엔드 배경이며 agent/backend/protocol 용어와 `gate` 같은 표현이 낯설다. 또한 한 문서를 순서대로 읽기보다 꼬리질문을 통해 spec -> roadmap -> plan -> architecture처럼 문서를 왕복하며 이해하는 패턴이 강하다.

**확인한 현재 상태:**
- 사용자가 `docs/product/product.md`의 non-goals 제거와 architecture rename을 직접 반영했다.
- `docs/architecture/documentation-system.md`의 product/specs/architecture/roadmap/plans owner 경계 자체는 현재 확인 기준으로 바뀌지 않았다. 다만 product owner 설명에 `non-goals`가 남아 있으면 사용자 결정과 맞지 않으므로 후속 정리 후보다.
- spec/architecture 경계의 큰 원칙은 이미 `docs/architecture/documentation-system.md`가 소유한다. W4.5에서 추가로 필요한 것은 owner map 변경보다 하위 작성 규칙이다: dated feasibility/evidence, current implementation matrix, roadmap gate와 plan task 연결, architecture에 둘 current implementation 설명의 수준 등.

**진행 방식 결정:**
- W4.5에서 큰 한국어 reading guide를 먼저 만들지 않는다.
- 문서별 고정 세션(`roadmap -> spec -> architecture`)도 강제하지 않는다.
- 사용자의 질문 하나를 중심으로 관련 owner 문서를 왕복하는 **질문 중심 탐색**으로 진행한다.
- 답변마다 확인한 사실/추론/의견을 구분하고, 해당 내용의 owner를 함께 표시한다.
- 사용자가 다른 주제로 꼬리질문을 하면 정상 흐름으로 다루되, 현재 질문과 별도 수명인 항목은 parking lot으로 남긴다.

**탐색 단위 예:**
- 질문: envelope이 무엇이고 왜 필요한가?
- spec owner: `docs/specs/aiox-a2a.md`의 envelope/reply/delivery contract
- roadmap owner: `docs/product/roadmap.md`의 공개 전 완료 조건(G 항목) 중 어느 범위에 속하는지
- plan owner: `plans/post-mvp/envelope-metadata.plan.md`가 실제 작업 단위로 무엇을 하려는지
- architecture owner: `docs/architecture/local-agent-runtime.md`에서 현재 message flow와 adapter/runtime 구조가 어떻게 되어 있는지
- code/tests owner: 실제 구현이 현재 어디까지 되어 있는지

**용어 처리:**
- 원문 식별자 `G0`, `G1` 등은 유지하되, 사용자-facing 설명에서는 `gate`를 **공개 전 완료 조건**으로 풀어 설명한다.
- spec은 API/props contract에 가까운 외부 동작 계약, architecture는 내부 state/module/data-flow 설명, roadmap은 공개 전 완료 조건과 추진 순서, plans는 실행 checklist/task로 설명한다.

**후속 방향:**
- 질문 중심 탐색에서 반복되는 설명과 합의된 작성 규칙이 쌓이면 그때 `docs/guides/`에 프론트엔드 개발자 관점의 탐색 guide 또는 `docs/guides/workflow.md` 반영 후보로 정리한다.
- `workflow.md` 반영은 spec/architecture/roadmap 작성 규칙과 evidence 위치 규칙이 충분히 합의된 뒤 진행한다.

## 2026-06-16 · W4.5 child 로그 분리

@user: parent inventory 로그가 너무 길어졌으므로 W4.5 후속 로그를 만들자고 요청.

**처리:**
- 새 child 로그 생성: `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md`
- 기존 W4.5 범위(owner 문서 정제, 질문 중심 탐색, 작성 규칙 후보 정리)를 child 로그로 이관.
- parent Work Items에서 W4.5는 `Transferred:`로 해소하고, 유효한 next pointer `W7`을 추가했다.
- W7의 역할은 child 로그 완료 후 결과를 parent에 반영하고 W5 history migration으로 진행하는 것이다.

**이관 이유:**
- parent 로그가 W1~W4 실행 기록과 W4.5 논의까지 포함해 길어져 재개 비용이 커졌다.
- W4.5는 product/spec/architecture/roadmap 정제와 사용자 질문 중심 탐색이라는 독립적인 수명을 갖는다.
- W5/W6는 parent inventory 로그에 남겨 두고, W4.5 완료 후 parent로 돌아와 계속 진행한다.

## 2026-06-19 · W7 완료 및 parent 복귀

W7 child 로그(`logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md`)와 W7 local runtime assimilation 패키지(`logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`)가 모두 성공적으로 완료되어 본 parent 로그로 복귀 및 반영되었습니다.

### 1. W7 완료 요약 및 주요 산출물
- **Primary Document 정합**: `docs/architecture/local-agent-runtime.md` (§0~§14)의 as-built 상태와 소스 코드(Step 15 kind-agnostic slot, UDS profile 경로, plugin D strategy, CLI status/doctor) 간의 모든 drift와 gaps를 최종 대조하고 정합 완료함.
- **Decision 문서 승격**: `history/` 삭제 예정에 앞서 key rationale을 보존하기 위해 `docs/decisions/`에 6개 의사결정 문서(rewrite-go-to-typescript, proxy-lazy-observation-cost-model, agent-level-mcp-process-scoping, pair-slot-generalization, codex-per-agent-app-server, claude-channel-plugin-default)를 신규 생성 및 연계함.
- **동적/로직 2축 검증**: `pnpm typecheck && pnpm test` (52 files, 483 tests) 실측 통과를 확인하였고, simple code symbol 매칭뿐만 아니라 framing 및 트랜잭션 로직 레벨의 pass/fail을 증명함.

### 2. 남은 후속 및 Handoff (W8 / W9 / Link-Hygiene)
- **W8 Specs Handoff**: `docs/specs/aiox-a2a.md` 내 미래 사양에 대한 `(Not implemented)` 인라인 마킹과 stale pair-slot 전제 정정 (W8 specs brief로 이관).
- **W9 Roadmap/Release Handoff**: `plans/release-plan.md`의 B1 `dist/` tarball blocker 명시 및 roadmap/release 통합 (W9 roadmap/release brief로 이관).
- **Link Hygiene**: `docs/aiox` dead link 정리 및 docs/aiox 삭제 판단 (별도 link-hygiene 작업으로 이관).

W7 패키지 작업이 성공적으로 마감(Closed)되었으므로, parent next pointer는 **W5 history/migration**으로 정상 전이되어 복귀하였습니다.

## 2026-06-19 · W5 history/migration package preparation

W5는 단순 파일 이동이 아니라 `history/` 전체를 **decision 승격 / decided log 이관 / 제거**로 판정하고, `plan/mvp-implementation-checklist.md`·`qa-tracker.md`의 잔존 inbound까지 함께 정리해야 하는 작업이다. 따라서 W7과 같은 독립 child package로 진행하되, W7에서 이미 읽고 흡수한 history 근거를 seed inventory로 재사용한다.

**권장 package 구조:**
- Package log 후보: `logs/2026-06-19-workspace-reset-W5-history-migration.md`
- Parent / controlling entry: 이 로그의 W5 next pointer
- Required seed inputs:
  - `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`
  - W7에서 생성한 `docs/decisions/` 6개 문서
  - W7 Evidence Ledger의 history 관련 rows
  - `history/` 전체 목록과 inbound 참조 현황
  - `plan/mvp-implementation-checklist.md`, `qa-tracker.md`

**W7 seed로 재사용할 history 판정 후보:**
- `history/5`, `history/29` → `docs/decisions/codex-per-agent-app-server.md`로 rationale 승격 완료.
- `history/13` → `docs/decisions/rewrite-go-to-typescript.md`로 rationale 승격 완료.
- `history/28` → `docs/decisions/proxy-lazy-observation-cost-model.md`로 rationale 승격 완료.
- `history/38` → `docs/decisions/agent-level-mcp-process-scoping.md`로 rationale 승격 완료.
- `history/45`~`history/48` → `docs/decisions/pair-slot-generalization.md` 및 `local-agent-runtime.md` Step 15 반영 근거로 흡수 완료.
- `history/49`~`history/56` → `docs/decisions/claude-channel-plugin-default.md` 및 Claude channel D strategy 반영 근거로 흡수 완료.
- `history/22`, `history/23`, `history/34`, `history/47` → W7 Evidence Ledger에서 핵심 line range까지 좁혀 검증됨. 현재 판정은 "추가 decision 불필요 / architecture·history rationale로 충분"이나, W5에서 삭제·decided log 이관 전 inbound를 재확인한다.

**권장 W5 batch 분할:**
1. B1 Inventory & Seed Mapping — `history/` 전체 목록, W7 absorbed files, unprocessed files, inbound 참조를 표로 분류.
2. B2 Decision Candidates — W7에서 흡수되지 않은 history 중 새 `docs/decisions/` 승격 후보만 검토.
3. B3 Decided Logs / Archive Migration — 작업 기록 성격의 history를 `logs/` decided/archive로 이관할 후보를 판정.
4. B4 Delete / Inbound Cleanup — owner 문서·decision·logs에 흡수된 history 삭제 후보와 inbound 참조를 정리하고 `history/README.md` 삭제를 처리.
5. B5 W3-3 Carryover — `plan/mvp-implementation-checklist.md`·`qa-tracker.md`를 history 재판정 결과와 함께 logs/archive 또는 owner 문서로 처리하고, 완료 시 빈 `plan/` 폴더 제거 여부를 확인.
6. B6 Closeout — parent W5 완료 반영 후 W6로 next pointer 이동.

**주의:**
- 이미 W7에서 decision/architecture에 흡수된 history를 처음부터 다시 읽지 말고, W7 Evidence Ledger와 생성된 decision 문서를 근거로 `absorbed by W7` 후보로 시작한다.
- 단, 삭제 또는 이동 전에 inbound 참조는 반드시 disk에서 재확인한다.
- `docs/aiox` 삭제/link-hygiene 판단은 별도 작업으로 분리되어 있으므로 W5 history migration에 섞지 않는다. 다만 W5-4의 checklist/qa-tracker inbound 정리에서 `docs/aiox` 참조가 걸리면 "별도 link-hygiene dependency"로 표시한다.
