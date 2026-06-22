---
topic: package workflow portable pattern 후보
description: W7~W10 authority assimilation package를 실제 적용하며 repo 전용 규칙과 portable package workflow 후보를 분리·수집한다
status: open
---

## Work Items

- [>] W1 W7~W10 각 package closeout에서 workflow 시행착오와 portable 후보를 수집한다
  - [x] W1-1 W7 local runtime assimilation closeout에서 batch/task/ledger/scope 시행착오를 수집한다
  - [ ] W1-2 W8 specs assimilation closeout에서 package 준비·agent 의견 수렴·blocker/release gate 분류 시행착오를 수집한다
  - [ ] W1-3 W9 roadmap/release assimilation closeout에서 roadmap·plan package 운영 시행착오를 수집한다
  - [ ] W1-4 W10 split readiness closeout에서 split map·cleanup map 운영 시행착오를 수집한다
- [ ] W2 repo 전용 taxonomy와 portable pattern을 분리한다
- [ ] W3 portable log skill 후보 초안을 정리하고, log skill maintenance 절차로 옮길지 판단한다
- [ ] W4 parent W4.5 로그 W11에 결과를 반영한다

## 2026-06-18 · portable package workflow 후보 로그 시작

Parent pointer: `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` W11

@user: W7/W8/W9/W10에서 package workflow를 실제로 써보며 시행착오를 보완하고, 그 내용을
별도 로그에 축적한 뒤 portable log skill 후보로 만들자고 제안.

**이 로그의 역할:**

- W7~W10 package closeout에서 발견한 workflow 시행착오를 모은다.
- repo 전용 규칙과 여러 프로젝트에 재사용 가능한 portable pattern을 분리한다.
- log skill로 바로 옮기지 않고, 실제 적용 사례를 충분히 모은 뒤 maintenance 절차로
  승격할지 판단한다.

**기록할 때 구분할 범주:**

- `Repo-specific`: 이 repo의 workspace reset, docs taxonomy, `history/`·`plan/`·`plans/`·
  `prd/` 처리에만 해당하는 내용.
- `Portable candidate`: 다른 프로젝트의 큰 작업에도 적용 가능한 package workflow pattern.
- `Rejected / too heavy`: 일반화하면 과하거나 작은 작업에 부적합한 내용.
- `Open question`: W7~W10 적용만으로 판단하기 어려운 질문.

### Portable Draft v0

아래는 현재 논의에서 나온 portable 초안이다. 아직 log skill 규칙이 아니라, W7~W10 적용
결과로 검증할 후보이다.

1. **Primary artifact를 정한다.**
   - 문서면 primary owner document, 코드면 primary module/subsystem, 테스트면 primary test
     suite, 릴리즈면 primary release artifact처럼 작업의 중심 artifact를 명시한다.
2. **Allowed cross-artifact updates를 선언한다.**
   - primary 외에 수정 가능한 주변 artifact를 미리 적는다.
   - Scope 밖 변경이 필요하면 멈추고 사용자 확인을 받는다.
3. **큰 작업은 package log를 만든다.**
   - package log가 Work Items, next pointer, Evidence Ledger, Cross-Owner Effects,
     closeout을 소유한다.
   - task brief는 지시서이며 상태 owner가 아니다.
4. **실행 전 필요한 agent/reviewer 의견을 수렴한다.**
   - batch 분할, 상태 라벨, scope, 검증 기준이 불명확하면 의견 수렴을 Work Item으로 둔다.
   - 의견 수렴 결과를 package log 또는 parent log에 기록한 뒤 task brief를 확정한다.
5. **Batch task brief를 작성한다.**
   - 각 batch는 범위, 제외 범위, source of truth, cross-validation source, 출력 형식,
     완료 조건을 가진다.
6. **Primary artifact만 보지 않는다.**
   - 해당 작업의 source of truth와 주변 artifact를 cross-validation한다.
   - 관련 없음도 검증 결과로 남겨야 나중에 pass/fail 판정이 가능하다.
7. **Evidence Ledger를 남긴다.**
   - 확인 사실, 추론, 의견/제안을 구분한다.
   - source, line, finding, owner/artifact impact, action을 기록한다.
8. **Closeout 때 workflow retrospective를 남긴다.**
   - batch 분할, task brief, ledger, scope, agent 의견 수렴에서 생긴 시행착오와 portable
     후보를 기록한다.
9. **Closeout map을 만든다.**
   - split, cleanup, follow-up, migration, owner 반영이 남으면 map으로 정리한다.

**초기 판단:**

- 이 workflow는 큰 작업, 여러 artifact에 걸친 migration/assimilation/refactor, multi-agent
  검증, 장기 handoff가 필요한 경우에 적합하다.
- 작은 버그 수정, 단일 파일 변경, 즉답 가능한 질문에는 과하다.

**다음 기록 지점:** W7 closeout 때 실제로 유효했는지 먼저 평가한다.

## 2026-06-18 · W7 중간 retrospective — B1 리뷰·brief 설계 적용 피드백 (사례·질문 기반)

W7 closeout 전이지만, B1 검증·시니어 리뷰·brief(B2~B6) 설계·batch 분할을 실제 적용하며
나온 package 형태 피드백을 **사례**와 **@user 질문**에 근거해 수집한다. W1-1 입력이며
중간 수집이라 W1-1을 완료로 넘기지 않는다. 아래 사례는 확인된 사실, "보강 제안"은 의견이다.

### 수집한 피드백 (사례 → 질문 → 분류 → 조치)

**F1 — task brief가 "답"을 박으면 검증자 시야가 거기서 멈춘다.**
- 사례: B1 brief §2 검증항목이 *"applySchema가 `schema.ts:3-68`에 CREATE TABLE 형태인가"*로
  답을 박음 → 검증자가 "맞다"로 끝내고 `applyMigration1`(schema_version·partial unique
  index·migration·typed error)을 전부 놓침.
- @user 질문: "W7-B1-gemini-task.md 에서 변경해야할 가이드도 있을까?"
- 분류: **Portable candidate** — brief의 src는 "확인할 답"이 아니라 "탐색 출발점", 진입 함수가
  호출하는 것을 끝까지 추적.
- 조치: AGENTS.md rule 1 + 모든 brief "src=출발점" 문구.

**F2 — "변경 없음"이 식별자 존재만으로 남발된다.**
- 사례: 직전 검증이 §0(컴포넌트 나열됨)·§3(메서드 일치)만 보고 "변경 없음" → §0 framing
  ("one Claude+one Codex")·§3 트랜잭션 로직("kind-slot/both kinds") drift를 놓침.
- @user 질문: "리뷰해봐 ... 너는 시니어 리뷰어 담당자다"
- 분류: **Portable candidate** — "변경 없음"은 (a)서술/framing 축 + (b)동작/로직 축을 둘 다
  대조한 뒤에만.
- 조치: AGENTS.md rule 4.

**F3 — current/future 혼동은 양방향이고, 미래 문서의 "현재 스냅샷"도 stale일 수 있다.**
- 사례: 미래 문서 a2a-spec이 현재를 *"pair slot a=codex/b=claude 고정"*으로 서술했으나
  Step 15 이후 코드는 kind-agnostic. 미래 문서가 stale current snapshot을 담고 있었다.
- @user 질문: "prd/post-mvp/aiox-a2a-spec.md 에 있는 내용을 확인해줘봐" + "kind-agnostic ...
  맞는거임 ... history 기록들을 보면 좀더 잘 알 수 있을거라 판단"
- 분류: **Portable candidate** — "Post-MVP/future source"는 출처 힌트지 상태 라벨이 아니다.
  최종 판정은 `src/` + 날짜·`history/` closeout. owner별 상태 라벨이 필요하다.
- 조치: AGENTS.md rule 2 보강 + Owner별 상태 라벨 체계.

**F4 — WHY가 legacy(history)에만 있으면 삭제 전 decision으로 추출해야 한다.**
- 사례: pair-slot-generalization의 WHY가 `history/45~48`에만 존재, W5에서 history 삭제 예정 →
  `docs/decisions/pair-slot-generalization.md` 생성. package의 Decision Candidates +
  Cross-Owner Effects 구조가 같은 로그에서 이를 자연스럽게 처리.
- @user 질문: "(나)로 하자 할 때 subagent한테 시키고 ... 추가들을 다해 줘"
- 분류: **Portable candidate** — primary owner 작업 중 발견한 cross-owner(decision) 변경을
  같은 package log에 기록·실행. decision은 WHY만(contract/structure 본문 복사 금지).

**F5 — Scope 사전 선언이 subagent 자율성과 이탈 탐지를 동시에 준다.**
- 사례: W7 Scope의 Allowed cross-owner에 `docs/decisions/`가 미리 선언돼 있어 subagent가
  재확인 없이 decision 생성. 동시에 검증자는 "왜 이 문서 건드렸지?" 판단 기준 확보.
- @user 질문: (위 위임 실행)
- 분류: **Portable candidate** — Scope 사전 선언 = 자율성 + 검증 가능성. Scope 밖은 멈추고 확인.

**F6 — subagent는 AGENTS.md를 자동 로드하지 않는다 → brief는 복붙 말고 포인터.**
- 사례: B1 brief가 핵심 규칙을 통째 inline 복붙(14~52행). 규칙이 진화하면 stale. B2~B6는
  "먼저 읽어라" 포인터로 전환.
- @user 질문: "이렇게 프롬프트 주면 되려나? 어떻게 줘야 하냐? W7-B1에 업데이트?" + "교체해봐"
- 분류: **Portable candidate** — standing rule(AGENTS.md) + thin brief(pointer) 2층 구조.
  단, subagent엔 "이 파일들 먼저 읽어라"를 명시(자동 로드 안 되므로).

**F7 — monolithic owner는 section coherence로 batch한다. 성격 다른 영역을 묶으면 무겁다.**
- 사례: B5(§8 routing + §9 CLI) 합본이 무거움 → §8/§9 분리. routing(Step 15 핵심)과 CLI는
  다른 관심사라 한 세션 처리가 부담.
- @user 질문: "B2말고 다른 것들도 해줘" + "§8 / §9로 쪼개야 판단함"
- 분류: **Portable candidate** — batch = 한 세션 처리량 + 주제 응집. 단일 primary owner라도 sub-batch.

**F8 — package log는 단일 active pointer(`[>]`)가 필요하다.**
- 사례: W7 로그가 체크박스만 써서 `log check`가 `next: 없음` → W2를 `[>]`로. parent
  (inventory·W4.5)는 `[>]` 컨벤션을 쓰는데 leaf만 빠져 있었다.
- 분류: **Portable candidate** — package log에 machine-discoverable 단일 active pointer.

**F9 — closeout/ledger의 cross-owner 상태 주장은 실제 트리와 대조해야 한다.**
- 사례: W4-6 closeout이 *"A2A PRD·MVP PRD 삭제"*라 적었으나 working tree엔 잔존(@user가
  의도적으로 복원해 reference로 유지). ledger 주장 ≠ 실제 상태.
- @user 질문: "prd/post-mvp/aiox-a2a-spec.md 에 있는 내용을 확인해줘봐" (발견 계기)
- 분류: **Open question** — 의도적 복원(reference 유지)과 "삭제 완료" 기록을 어떻게 화해시킬지
  (ledger 정정 vs working-state note). 삭제·이동 같은 상태 주장은 closeout 시 트리 대조 검증.

**F10 — Evidence Ledger는 pass/fail 재구성을 가능케 하지만 검증 규율에 의존한다.**
- 사례: 시니어 리뷰가 ledger rows + doc 상태만으로 무엇을 했고 놓쳤는지 재구성 가능 → format
  강점. 그러나 "변경 없음" rows가 오히려 오도했다.
- 분류: **Portable candidate** — ledger는 강력하나 Finding 분류(Fact/Inference/Opinion) +
  2축 게이트(F2)가 신뢰의 전제. ledger 존재가 검증을 보장하지는 않는다.

**F11 — 과도기적 레거시(하드코딩 분기)와 새로운 추상화(동적 라우터)가 병존할 때, 문서는 둘을 명확히 구분해야 오해를 막는다.**
- 사례: W5-1 배치에서 §8.3의 `dispatchToPairPeers`를 분석할 때, 과거 branch 코드(`local-agent-runtime.md`)를 단순히 "legacy fallback"이라고 단정하여 삭제하려 했으나, 실제 프로덕션 환경에서는 여전히 활발히 동작하고 있음(새로운 `AdapterRouter` 추상화는 `tests/` 에만 존재하는 Deferred 상태).
- 분류: **Portable candidate** — 문서/코드를 분석할 때, 새로 도입된 개념(예: `AdapterRouter`)이 등장했다고 해서 기존 코드(`dispatchToPairPeers`)가 무조건 legacy로 도태되었다고 가정하면 위험하다.
- 조치: "현재 프로덕션이 어떤 코드를 사용하고 있는가"를 검증의 1원칙으로 삼고, 추상화 도입이 부분적이거나 테스트에만 머물러 있는 Deferred/Migration-in-progress 상태를 인지하도록 AGENTS.md rule 4 (동작/로직 검증 축)에 "공존/점진적 마이그레이션 판별" 주의를 추가한다.

**F12 — 닫힌 배치에서 놓친 stale cite가 다른 배치의 중복 서술 영역에서 발견될 수 있다.**
- 사례: W2(B2)에서 §5 API 표를 검증하고 닫았으나, W5-1(B5)의 §8.2 검증 중 동일한 `sendMessage` 라인 참조 오류(1639-1741)가 발견됨.
- 분류: **Portable candidate** — 한 번 닫힌 배치라도, 아키텍처 문서의 중복 서술 영역에서 뒤늦게 발견된 stale 요소는 해당 배치를 다시 열지 않고 현재 진행 중인 배치에서 교차로 수정 및 Ledger에 남긴다.
- 조치: W5-1 배치 진행 중 §5와 §8.2의 stale cite 동시 수정 및 W7 Ledger에 "닫힌 배치 잔존" 명시.

**F13 — 병렬 독립 다중 리뷰는 단일 리뷰어가 놓치는 상호 비중첩 결함을 잡는다.**
- 사례: W5-1(§8 routing) 산출물을 Codex(senior review)와 Claude가 독립 검증했더니 잡은 결함이 서로 달랐다. Codex = Evidence Ledger 재현성(test 파일명 누락)·next pointer 구조 마커 vs prose 불일치. Claude = "Not implemented" 분류가 `prd/post-mvp/aiox-a2a-spec.md` snapshot 단일 출처에만 의존(logs/AGENTS.md rule 2 위반, `src/` 교차확인 누락). 어느 한쪽도 전체를 잡지 못했고, 합쳐야 완전해졌다.
- 분류: **Portable candidate** — 큰 owner 문서 검증은 단일 리뷰어에 의존하지 말고, 코드/테스트 축 리뷰어와 문서/spec/history 축 리뷰어를 분리해 병렬 독립 검증한 뒤 결과를 합산한다.
- 조치: 검증 task brief에 "독립 다중 리뷰(코드축/문서축 분리) + 결과 합산" 단계를 권장으로 명시.

**F14 — agent의 "완료" 보고는 disk 대조 전까지 신뢰하지 않는다. (F10의 구체 케이스)**
- 사례: W5-1이 완료 조건(§8.1~§8.6 전체 Evidence Ledger row + 2축 검증)을 로그로 증명하지 못한 채 `[x]`로 닫혔다가 리뷰에서 premature로 판정돼 reopen됐다. 이후에도 보고된 "완료/수정함" 주장을 매 라운드 `git status`·`grep`·파일 대조로 재확인해야 실제 반영 여부가 확정됐다(spec 파일 미수정 여부, cite 교체, 마커 이동 등).
- 분류: **Portable candidate** — 완료 전이와 보고는 산출물 disk 상태로 증명돼야 하며, 보고 텍스트만으로 pass 처리하지 않는다.
- 조치: closeout 게이트에 "완료 조건을 로그/코드 disk에서 재현 확인한 뒤에만 `[x]` 전이" 명시. 리뷰어는 보고가 아니라 산출물을 검증한다.

### Portable Draft v0 보강 제안 (의견)

위 사례로 v0에 다음을 추가/정밀화 권고:
- v0에 **"src는 답이 아니라 출발점, 진입 함수 호출을 끝까지 추적"**(F1) 추가.
- v0에 **"'변경 없음' 2축 게이트"**(F2) 추가.
- v0 point 6(cross-validation)에 **"미래 문서의 현재 스냅샷도 stale 가능 → src+date/history로 최종 판정"**(F3) 정밀화.
- v0에 **"standing rule(AGENTS.md) + thin pointer brief 2층, subagent엔 명시적 read 지시"**(F6) 추가.
- v0에 **"batch = 한 세션 처리량 + 주제 응집, 단일 owner라도 sub-batch"**(F7) 추가.
- v0에 **"package log 단일 active pointer"**(F8) 추가.
- v0 point 7(ledger)에 **"ledger 신뢰는 Finding 분류 + 2축 게이트에 의존"**(F10) 명시.
- v0에 **"과도기적 레거시와 새로운 추상화가 병존할 때는 아키텍처 문서가 두 상태를 섞지 않고 분리 명시"**(F11) 추가.
- v0에 **"단일 리뷰어 대신 코드축/문서축을 분리한 병렬 독립 다중 리뷰 권장"**(F13) 추가.
- v0에 **"완료 보고는 텍스트가 아닌 산출물 disk 상태로 증명/재현 확인 후 승인"**(F14) 명시.

### Rejected / too-heavy

- **brief 과상세화**: 검증항목을 잘게 박을수록 좋아 보이지만, F1처럼 *답을 박으면* 역효과.
  brief는 "범위 + 출발점 + 완료 기준"까지만, 항목별 답은 박지 않는다.

### Repo-specific (portable 아님)

- a2a-spec의 구체 stale 전제(`a=codex/b=claude`), prd 복원 상황, Step 15·history 번호,
  docs taxonomy(specs/decisions/architecture/roadmap) 경계는 이 repo 전용. 교훈만 portable.

**다음 기록 지점:** W7 closeout(B2~B6 실행 후)에서 F1~F10이 실제로 재발 방지에 유효했는지
검증하고, Portable Draft v0를 v1로 갱신할지 판단한다.

## 2026-06-18 · W7 Closeout Retrospective — Line Reference Management & Drift Control

W7 B1~B4 Disk Audit를 완료하며 발생한 line reference drift 분석과 관리 규칙을 추가한다.

### 1. Line Reference 관리 시행착오 및 분석 (F15)
- **현상**: Round 3 및 Step 15의 누적 편집으로 인해 `src/daemon/state.ts` 내의 40여 개 함수/메서드 위치가 물리적으로 30~50라인 가량 아래로 밀려났다. 이로 인해 `local-agent-runtime.md` 내의 line reference들이 대거 stale화되어 있었다.
- **교훈 (Portable Candidate)**: 
  - **코드 변경 시 즉시 문서 라인 동기화**: 코드 구조나 헬퍼를 추가/수정하는 PR/태스크는 반드시 관련된 아키텍처/스펙 문서의 `file:line` reference를 패키지로 묶어 수정해야 한다.
  - **시작점 외에 범위는 좁게**: 문서에서 라인 범위를 과도하게 넓게 잡기보다는, 진입점(함수 서명) 혹은 핵심 assertion 지점만 좁게(예: L660 단일 라인 등) 참조하는 것이 drift 노출도를 낮춘다.
  - **정적 라인 인용의 한계**: 코드 주석이나 문서 본문에 정적 라인을 기록할 때, symbol을 함께 병기하여(예: `attachAgent (state.ts:532-745)`) 라인이 밀려나더라도 symbol name으로 검색 및 복원이 가능하도록 안전장치를 둔다.

## 2026-06-18 · W7-B audit review 라운드 — portable 후보 F15~F17 수집

W7-B audit review 라운드(@gemini 실행 + @claude senior review + 정정 + disk 재검증)에서 F1~F14에 없던 portable 후보 3건 수집. W1-1 입력이며 W7 전체 미완이라 W1-1을 완료로 넘기지 않는다.

**F15 — agent의 narrative 요약은 자기 자신이 쓴 ledger와도 모순될 수 있다.**
- 사례: @gemini가 채팅 보고 다이어그램에서 `plan/mvp-implementation-checklist.md`를 "Stale (Archive 완료) → 삭제/이관"으로 표기. 그러나 동일 agent가 작성한 W7 Evidence Ledger(row 92)는 같은 파일을 "closed/current implementation evidence로 사용 가능"으로 분류하고 §6.5/§7.3/§7.8 검증 근거로 인용 중이었다. report(prose)가 그 agent 자신의 structured artifact와 충돌.
- 분류: **Portable candidate** — F14(report vs disk)·F9(closeout 주장 vs 트리)의 날카로운 변형. 리뷰어는 보고를 코드/트리뿐 아니라 **그 agent가 같은 작업에서 만든 ledger/표와도 교차 대조**한다. 자기모순은 삭제·이관 같은 비가역 액션의 근거일 때 특히 위험(데이터 손실).
- 조치: 검토 게이트에 "agent narrative ↔ 그 agent의 자기 ledger 일치 확인" 추가.

**F16 — pre-work baseline snapshot이 변경 attribution을 가능케 한다(over/under-report 동시 탐지).**
- 사례: @claude가 검토 착수 시 읽은 architecture 문서가 마침 @gemini 작업 전 상태(§7 cite 1433/1511/1557/1589)였다. 이 baseline 덕에 "§7 cite가 실제 drift였고 Gemini가 1571/1629/1675/1711로 고쳤다"를 attribution할 수 있었다. Gemini는 §7 교정을 보고에서 **누락(under-report)**했고, 반대로 mvp-checklist는 **과장(over-report)**했다 — baseline 없이는 둘 다 안 보였다.
- 분류: **Portable candidate** — 큰 작업 검토 전 primary artifact의 작업 전 스냅샷(또는 `git diff` 기준점)을 확보하면 agent 보고의 누락·과장을 양방향으로 잡는다.
- 조치: 검토 brief에 "착수 시 baseline 스냅샷/`git diff` 기준점 확보 후 보고와 대조" 권장.

**F17 — 큰 multi-round 작업의 agent topology + 모델 배정.**
- 사례(@user 질문): "큰 작업은 subagent vs team-agent 뭐가 낫나, w7-b*엔 무엇이 적절한가, subagent마다 모델을 섞을 수 있나?"
- 결론: 택일 아님. **2층 구조** — (1) 지속형 peer가 배치 실행 + 패키지 로그(상태 owner) 소유 + 라운드 간 교차 리뷰(이 세션 Gemini 실행 + Claude 리뷰 구도; premature close·§6.4·mvp-checklist 모순을 라운드마다 검출 = F13 재현), (2) 배치 내부 검증은 휘발성 subagent를 **축 분리(코드/테스트 축 vs 문서/spec/history 축)** 해 병렬 fan-out. 한 subagent에 두 축을 맡기면 §0/§3 "변경 없음"형 비대칭 누락(F2/F13).
- 모델 배정(Agent 도구 `model` enum 확인: spawn마다 sonnet/opus/haiku 지정 가능): miss 비용에 매칭 — **opus**=senior review·decision-worthiness·drift/모순 판정, **sonnet**=대량 cite 검증·MAP 분류·초안, **haiku**=기계적 sweep만. **2축 "변경 없음" 게이트·drift 판정엔 haiku 금지**(미묘한 누락 은닉).
- 분류: **Portable candidate**.
- 조치: package 실행 계획에 "peer(실행+리뷰 루프) 위 axis-split ephemeral subagent(검증), 모델은 판정=opus/대량=sonnet/기계=haiku" 권장.

**Portable Draft v0 보강 제안 추가(의견):**
- v0 point 8(retrospective)/검토 게이트에 **F15**(narrative ↔ 자기 ledger 교차대조), **F16**(착수 baseline 스냅샷으로 over/under-report 양방향 탐지) 추가.

## 2026-06-19 · W5 sync gap 회고 — package가 parent 맥락을 잃을 때의 예방 규칙 후보

W5 history migration 준비 중 sync gap과 `history/` 삭제 guard 문제가 동시에 드러났다.
이 블록은 W5 결과 자체가 아니라 package workflow portable 후보를 수집한다.

**F29 — package agent는 자기 package만이 아니라 parent 흐름과 sibling/downstream work를 알아야 한다.**
- 사례: W5는 처음에 `history/` migration/delete 후보로 보였지만, parent inventory와 W4.5/W7
  흐름을 대조하자 W8 specs, W10 split readiness 등 downstream 작업이 `history/` evidence를
  아직 읽어야 한다는 점이 확인됐다. 이 대조가 없었다면 `history/`를 너무 이르게 삭제하거나
  삭제 후보로 확정해 후속 package가 필요한 source를 잃을 수 있었다.
- 분류: **Portable candidate** — 큰 package의 task brief는 controlling log만 읽게 하면 부족할
  수 있다. 최소한 parent log의 active Work Item, latest block, sibling/downstream Work Items,
  known child logs를 읽고 "삭제·이동·scope 변경이 다른 작업을 막는가"를 먼저 점검한다.
- 조치 후보: package preparation 또는 task brief의 "먼저 읽어라"에 `Parent/context audit`을
  추가한다. 출력은 긴 요약이 아니라 "이 package가 건드리면 안 되는 source / 후속 consumer /
  blocked deletion guard" 표로 남긴다.

**F30 — 일반 로그에서 나온 package라도, package log는 origin log의 작업 흐름 맥락을 보존해야 한다.**
- 사례: W5 package log는 parent inventory의 W5 Work Item에서 파생됐다. package log만 보면
  source/index와 migration 범위는 보이지만, W4.5가 parent sync를 해소했고 W8/W10이 W5 source
  map을 소비해야 한다는 흐름은 parent와 W4.5를 읽어야 복원된다.
- 분류: **Portable candidate** — package log 첫 블록과 task brief에는 `Origin/parent context`
  section을 둔다. 여기에는 parent path, parent Work Item id, child가 소비되면 parent에서 해야
  할 전이, 관련 sibling/downstream Work Items, known blockers를 포함한다.
- 조치 후보: task brief template의 `0. 먼저 읽어라`에 parent/context chain을 추가하고,
  package log Scope에 `Context dependencies`를 둔다.

**F31 — Work Item 변경 이유 기록은 log skill에 이미 있으며, package 흐름 변경에도 이 기존 규칙을 적용해야 한다.**
- 사례: W4.5의 W7 pointer 소비, parent W5 next pointer 복귀, W5 B1 scope 보정은 단순 체크박스
  전이가 아니라 "현재 어떤 작업이 왜 먼저인지"를 바꾸는 sync 작업이었다. `log items`와
  Work Items 규칙은 구조 전이를 cover하지만, 다른 agent가 같은 결론을 복원하려면 변경 이유,
  대체된 판단, 남은 guard가 latest block에 남아야 했다.
- 분류: **Already covered by log skill / package application candidate** — Work Item 수정 시
  원래 행동, 바뀐 행동/조건, 변경 이유, next pointer 변경 여부를 남기라는 규칙은
  `.agents/skills/log/references/work-items-rules.md`에 이미 있다. 또한 결정 변경과
  의미 변화 checkpoint 기록은 `log-writing-rules.md`가 이미 소유한다.
- 조치 후보: 새 portable 규칙을 만들기보다, package/task brief 리뷰에서 기존 log skill 규칙이
  parent/child/sibling 흐름 변경에도 적용됐는지 확인한다. 삭제·이동 같은 비가역 작업의
  순서가 바뀌면 기존 규칙에 따라 근거와 guard를 날짜 블록에 남겼는지 점검한다.

**Portable Draft v0 보강 제안 추가(의견):**
- v0 point 3(package log)에 **Origin/parent context**와 **Context dependencies**를 추가한다.
- v0 point 5(task brief)에 **Parent/context audit**을 추가한다. agent는 controlling log뿐 아니라
  parent latest block, active Work Item, sibling/downstream Work Items를 먼저 읽는다.
- v0 point 6(cross-validation)에 **source deletion/move guard**를 추가한다. source를 없애거나
  archive 후보로 낮추기 전에 downstream consumer가 남아 있는지 확인한다.
- v0 point 8(retrospective)에 **Flow sync checkpoint** 후보를 추가한다. Work Item 구조 전이는
  도구가 cover하더라도, 순서 변경과 충돌 해소 이유는 로그 블록으로 남긴다.
- v0에 **F17**(2층 agent topology + miss-비용 기반 모델 배정) 추가.

## 2026-06-19 · W7-B5-1 evidence closeout feedback

W7-B5-1 (§8 routing) review loop에서 owner 문서 본문은 current code와 정합해졌지만, 같은 로그 안에 과거 Evidence Ledger row가 과장 표현으로 남아 pass/fail 재현성을 깨는 상황을 확인했다. 이후 claim 단위 source/test cite row를 추가하고 old row를 `Superseded by ...`로 명시해 해소했다.

**F18 — Owner artifact correctness와 Evidence Ledger correctness는 별도 pass gate다.**
- 사례: §8.3~§8.5 owner 문서는 고쳐졌지만, old ledger row가 "완벽히 일치" 또는 넓은 `tests/` 출처로 남아 W5-1 완료 판정을 막았다. 새 row가 정확해도 old row가 남으면 검증자가 최종 근거를 재현할 수 없다.
- 분류: **Portable candidate**.
- 조치: package closeout은 (1) owner artifact 본문 정합성, (2) Evidence Ledger의 재현 가능한 line/test cite, (3) 대체된 old evidence row의 삭제 또는 `Superseded by ...` 표시를 모두 확인한 뒤 통과시킨다.

**F19 — Claim 단위 ledger row가 섹션 단위 "변경 없음"보다 안전하다.**
- 사례: §8.5는 persistence, Claude reply wiring, Codex reply wiring, Codex MCP `parent_message_id` mapping이 각각 다른 source/test를 요구했다. 하나의 §8.5 row로 닫으면 어느 축이 검증됐는지 복원되지 않았다.
- 분류: **Portable candidate**.
- 조치: 복합 섹션은 검증 가능한 claim 단위로 row를 나누고, "변경 없음"은 row별 source/test cite를 가진 경우에만 사용한다.

**F20 — 병렬 작업 중 리뷰 범위를 명시적으로 고정한다.**
- 사례: B5-2/§9와 W6가 다른 agent 흐름에서 동시에 진행되는 동안 Codex review는 B5-1/§8만 판단했다. 전체 W7 next pointer가 이동해도 B5-1 evidence gate는 별도로 판정해야 했다.
- 분류: **Portable candidate**.
- 조치: concurrent package에서는 리뷰 시작 시 "이번 리뷰가 판정하는 batch/section"과 "건드리지 않을 concurrent work"를 로그와 보고에 명시한다.

## 2026-06-19 · W7-B5-2 handoff line feedback

W7-B5-2(§9 CLI/Invocation/Doctor/Status) review에서 batch 본문과 tests/build는 PASS였지만, W6 handoff로 적은 §10/§11 카탈로그 라인 범위 일부가 stale 또는 소비측 라인을 가리키는 것으로 확인됐다. 이는 W5-2 owner artifact의 correctness와 별개로, 다음 owner에게 넘기는 handoff claim의 신뢰도 문제다.

**F21 — Handoff line range도 검증 가능한 claim으로 취급한다.**
- 사례: W6 handoff에 `codex_channel_unavailable`, `codex_no_loaded_thread`, `message_created` 라인을 "혼선 없이 바로잡도록" 적었지만, 실제 emission 위치와 다르거나 약 120라인 이탈한 cite가 포함됐다. 숫자가 들어간 handoff는 단순 메모가 아니라 다음 agent의 작업 시작점을 좌우하는 evidence claim이다.
- 분류: **Portable candidate**.
- 조치: handoff에 `file:line`을 적을 때는 owner 본문 cite와 같은 기준으로 재grep 검증한다. 직접 검증하지 못했으면 `line range unverified — regrep required`처럼 confidence를 낮춰 기록한다.

**F22 — Batch PASS와 handoff defect는 분리 판정하되 closeout 전에 보정한다.**
- 사례: W5-2의 §9 command table, invocation layer, doctor/status, §10.6 CLI catalog는 독립 리뷰와 typecheck/test/build로 PASS였지만, W6 handoff 라인 3건은 부정확했다. 이 결함은 W5-2 본문 correctness를 깨지는 않지만, 다음 batch의 혼선을 만든다.
- 분류: **Portable candidate**.
- 조치: 리뷰 판정은 `owner artifact PASS / handoff correction required`처럼 둘로 나눈다. next pointer 이동은 허용하더라도, closeout 전에는 handoff 라인을 정정하거나 명시적으로 unverified로 downgrade한다.

## 2026-06-19 · Handoff entry-binding feedback

W7-B5-2에서 W6 handoff를 정밀하게 작성한 뒤, "새 agent가 실제로 이 handoff를 읽는가?"를 점검했다. 낮은 모델 subagent와 Codex 로컬 확인 결과, W7 로그 내부 handoff는 discoverable하지만 repo-level `scripts/onramp`는 parent inventory 로그를 current log로 잡고 있어 W7 handoff가 required read로 보장되지 않았다.

**F23 — Handoff content와 entry binding은 별도 문제다.**
- 사례: W7 assimilation 로그에는 W6-1 active pointer와 W6 Handoff가 있었지만, root `AGENTS.md` → `scripts/onramp` 경로는 parent inventory 로그에 멈췄다. 따라서 "handoff를 잘 썼다"와 "새 agent가 그 handoff를 읽는다"는 같은 보장이 아니었다.
- 분류: **Portable candidate / integration candidate**.
- 조치: handoff closeout은 (1) handoff 내용 정확성, (2) 다음 agent의 entry path가 그 로그를 required read로 만드는지, 두 축을 분리 확인한다.

**F24 — Controlling log identity를 먼저 확정해야 handoff가 작동한다.**
- 사례: 일반 작업은 onramp가 고른 current log가 controlling log지만, package/batch 작업은 task brief만 복사되어 실행될 수 있다. 이때 package log 경로가 brief에 명시되지 않으면 agent가 handoff owner를 놓칠 수 있다.
- 분류: **Portable candidate**.
- 조치: 작업 시작 규칙을 "controlling log 확정 → Work Items/latest block/next pointer 또는 handoff 읽기 → 작업 범위 보고" 순서로 일반화할지 검토한다. package brief에는 `Controlling log: <package-log>`를 명시하는 방식이 가장 얇다.

**F25 — Package brief에는 package log를 required read로 넣되, 일반 작업 read path를 늘리지는 않는다.**
- 사례: `logs/AGENTS.md`의 Task Brief Template에는 package log의 Scope / Work Items / 최신 기록을 읽으라는 항목이 이미 있으나, 실제 `logs/W7-B6-task.md`에는 W7 assimilation log의 최신 기록과 W6 Handoff required-read가 명시되지 않았다. 반면 일반 작업은 onramp-selected log가 handoff owner이므로 별도 task brief 규칙을 강제할 필요가 없다.
- 분류: **Repo integration candidate**.
- 조치: 우선 package workflow 검증 로그에는 이 사례를 남기고, 실제 규칙화 위치는 나중에 결정한다. 후보 위치는 `logs/AGENTS.md`(workspace reset package template 보강), `docs/guides/workflow.md`(repo-level controlling log 설명), 또는 log skill `work-items-rules.md`(portable controlling log identity)다. portable skill 변경은 여러 repo에 적용될 일반 문제인지 추가 검증 후 결정한다.

### 대화 사례 기록 — handoff가 읽히는가?

사용자는 W7-B5-2 handoff line을 보정한 뒤, 다음 질문을 던졌다: "야 근데 handoff를 만들었는데 새로운 agent들이 해당 로그를 읽게끔 되있냐? 현재 repo부터 log skill까지 어떻게 되어있는지 확인을 subagent gpt 모델 낮은 애한테 시켜서 확인해봐." Codex는 낮은 모델 subagent와 로컬 확인을 병행했고, 처음에는 W7 로그 안의 handoff가 존재하므로 읽힐 것으로 기대했지만, 확인 결과 repo-level `scripts/onramp`가 parent inventory log를 current log로 잡아 W7 handoff가 required read로 보장되지 않음을 인정했다.

사용자는 이어서 "현재 workflow에 대해서 log skill과 repo의 integration을 생각했을 때, 해당 세션 로그 파일을 읽게 하라고 시켜야 하나?"라고 물었다. Codex는 package/batch task brief에서는 controlling package log를 required read로 명시하는 것이 맞고, 일반 작업에서는 onramp-selected current log가 controlling log이므로 일반 작업 read path를 늘리면 안 된다고 답했다.

사용자는 다시 "현재 task brief는 package 형태일때만 유효한 지침 아니냐?"고 확인했다. Codex는 맞다고 답했고, repo 공통 진입 규칙(`AGENTS.md`/`scripts/onramp`/workflow guide/log skill)과 package 작업 규칙(`logs/AGENTS.md`의 Workspace Reset Log Sections / Package Preparation / Task Brief Template)을 구분했다.

사용자는 마지막으로 이 논점이 단순 추가 작업이 아니라 workflow 설계 판단임을 짚었다: 로그 파일 자체가 handoff라면 매번 task brief에 "이 로그 읽어라"를 계속 추가하는 방식이 맞는지, package가 아닌 일반 작업에서 handoff를 어떻게 보장할지, repo integration과 log skill 사이에 더 나은 공통 원칙이 있는지. Codex는 이를 `controlling log` identity 문제로 일반화했고, 사용자는 실제 규칙화 위치를 `logs/AGENTS.md`의 workspace reset package template 보강으로 정했다.

**결정:** 이 사례는 portable log skill을 즉시 바꾸기보다, repo integration인 `logs/AGENTS.md`의 workspace reset package template에 먼저 반영한다. package brief는 `Controlling log: <package-log>`를 명시하고, batch agent가 해당 log의 Scope / Work Items / 최신 기록 / active next pointer 또는 handoff / 관련 Evidence Ledger rows를 먼저 읽도록 한다. handoff의 `file:line`은 출발점이며 owner 문서 수정 전 재검증한다.

**적용:** `logs/AGENTS.md` template을 보강하고, 현재 활성 W7-B6 brief도 같은 양식으로 갱신한다. 이 대화 원문 전체를 복사하지 않고, 사용자 질문과 Codex 판단 변화를 handoff 사례로 보존한다.

## 2026-06-19 · W7 Closeout Retrospective 보강 — F26~F27 추가

W7 패키지 최종 마감(W8 Closeout) 작업을 진행하며 도출된 추가적인 workflow 교훈이다.

**F26 — Handoff 라인 검증과 신뢰도 통제**
- **현상**: Handoff/Closeout 항목에 적힌 `file:line` 정보가 소스 코드의 실제 emission/구현 위치와 다르면, 다음 batch/package 담당 agent가 탐색을 엉뚱한 곳에서 시작해 분석을 그르치게 된다.
- **분류**: **Portable candidate**
- **교훈**: Handoff에 적는 모든 라인 번호 역시 일반 Evidence Ledger와 마찬가지로 엄격히 검증되어야 한다. 직접 소스 코드에서 regrep하여 확인하지 않은 라인 인용은 명시적으로 `unverified - regrep required` 마킹을 달아 신뢰도를 낮추고 통제해야 한다.

**F27 — Parent-Child 로그 정합 및 복귀 자동화 계약**
- **현상**: 독립된 하위 패키지(W7)는 종료되었으나 parent 로그(W4.5)와의 동기화 및 active pointer `[>]` 전이가 늦어지면, 상위 orchestration 흐름상 agent가 다음 태스크(W5)로 복귀하여 재개하는 데 지연이나 cyclic point 오판이 발생한다. 또한 repo log skill의 terminal status vocabulary(`decided`/`superseded`)와 사람이 쓰는 "closed" 표현이 어긋나면 구조 검증이 실패한다.
- **분류**: **Portable candidate**
- **교훈**: Child 로그를 terminal 상태로 닫을 때는 repo log skill이 허용하는 status(이번 사례에서는 `decided`)를 사용하고, (1) child 로그의 최종 Closeout 작성, (2) parent 로그로 복귀 및 완료 사실/주요 산출물/남은 후속 마이그레이션 이슈 요약 반영, (3) parent의 active pointer(`[>]`)를 다음 task로 전이하는 일련의 과정을 "원자적 복귀 계약"으로 묶어 처리해야 한다.

## 2026-06-19 · W5 package preparation feedback — F28 추가

W7 closeout 뒤 parent next pointer가 W5 history/migration으로 복귀했을 때, 사용자는 "현재 아키텍처 패키지 하면서 해당 history 작업했던 것을 쓸 수 있지 않느냐"며 W7 산출물을 W5의 seed로 재사용해야 한다고 지적했다. 실제로 W7은 `history/5`, `13`, `28`, `29`, `38`, `45~48`, `49~56`을 decision 문서와 architecture 근거로 이미 흡수했고, `history/22`, `23`, `34`, `47`도 Evidence Ledger에서 핵심 line range까지 좁혀 두었다. 이를 W5에서 다시 전수조사하면 비용이 중복된다.

**F28 — 다음 package는 직전 package 산출물을 seed inventory로 시작한다.**
- **현상**: W5 history/migration은 `history/` 전체를 판정해야 하지만, 직전 W7 architecture assimilation 과정에서 이미 많은 history 파일이 decision/architecture 근거로 흡수되었다. 이 정보를 W5 준비 단계에 고정하지 않으면 새 agent가 같은 history를 다시 읽고 같은 결론을 재생산할 위험이 있다.
- **분류**: **Portable candidate / package planning candidate**
- **교훈**: Package closeout 또는 parent 복귀 직후, 다음 package가 이어받을 수 있는 `seed inventory`를 parent 로그에 남긴다. seed inventory는 (1) 이미 흡수된 source, (2) 생성된 owner artifact, (3) 남은 미판정 source, (4) 재확인해야 할 inbound 참조, (5) 다음 package batch 분할을 포함한다.
- **조치**: `logs/2026-06-16-workspace-reset-폴더별-inventory.md`에 W5 history/migration package preparation 블록을 추가했다. W5는 새 package log를 만들되 W7 Evidence Ledger와 생성된 decision 문서를 required seed로 읽고, 이미 흡수된 history는 `absorbed by W7` 후보로 시작한다. 삭제·이동 전 inbound만 disk에서 재확인한다.

## 2026-06-19 · W5 sync gap feedback index — F29~F31 추가

W5 sync gap과 `history/` delete guard 논의에서 추가된 package workflow 후보를 같은 날짜
앞쪽 블록에 F29~F31로 기록했다.

- **F29**: package agent는 자기 package뿐 아니라 parent 흐름, sibling/downstream Work Items,
  후속 consumer를 확인해야 한다.
- **F30**: 일반 로그에서 나온 package라도 package log와 task brief는 origin parent context를
  보존해야 한다.
- **F31**: Work Item 변경 이유 기록은 log skill에 이미 있다. package에서는 parent/sibling/downstream
  흐름 변경에도 이 기존 규칙이 적용됐는지 확인한다.

이 항목들은 F23~F25의 controlling log identity, F27의 parent-child 복귀 계약, F28의 seed
inventory 규칙을 W5 `history/` 삭제 위험 사례로 확장한다.

## 2026-06-19 · package activation gate feedback — F32~F33 추가

W5 준비 과정에서 package log와 task brief의 필요성을 사후에 보정했다. 이 사례는
package workflow를 언제 시작해야 하는지, 그리고 controlling log만으로 충분한지 task brief가
필요한지에 대한 판단 게이트가 필요함을 보여준다.

**F32 — package log activation gate가 필요하다.**
- 사례: W5는 parent inventory의 일반 Work Item처럼 보였지만, 실제로는 `history/` 전체,
  W7 seed inventory, W8/W10 downstream consumer, W3-3 carryover, delete guard가 얽힌
  multi-step migration이었다. 처음부터 package로 분리하지 않으면 parent 로그가 너무 커지고,
  반대로 package로 분리한 뒤에도 parent 맥락을 잃으면 sync gap이 생긴다.
- 분류: **Portable candidate**.
- 조치 후보: 기존 작업 재개, 신규 작업 시작, 진행 중 작업 확대 시 모두 package 필요 여부를
  판단한다. 판단 기준 후보는 다음과 같다.
  - 여러 artifact/owner/log를 동시에 다룬다.
  - Work Item이 여러 단계로 나뉘고 closeout/ledger가 필요하다.
  - 삭제·이동·migration처럼 되돌리기 어렵거나 downstream consumer를 막을 수 있다.
  - subagent/reviewer/다중 모델을 써야 한다.
  - parent 로그 하나에 계속 쓰면 current state와 evidence가 흐려진다.
  - 작업 도중 위 조건이 새로 발견되면 중간에 package 전환을 검토한다.

**F33 — controlling log only와 controlling log + task brief를 구분하는 gate가 필요하다.**
- 사례: W5 B1은 controlling package log 자체에 Scope, Work Items, source map schema,
  handoff가 있어 단일 agent가 직접 이어받기에는 충분했다. 그러나 Gemini/Claude처럼 외부
  agent에게 작업을 위임하자 "어떤 파일을 먼저 읽고, 무엇을 직접 수정하면 안 되는지"를
  별도 task brief 또는 prompt로 얇게 전달해야 했다.
- 분류: **Portable candidate / task delegation candidate**.
- 조치 후보: package log는 상태 owner이고 task brief는 실행 지시서라는 구분을 유지한다.
  task brief 필요 여부 판단 기준 후보는 다음과 같다.
  - 외부 agent/subagent/reviewer에게 작업을 맡긴다.
  - 작업 범위가 batch/section/source subset으로 제한된다.
  - 같은 package 안에서 병렬 또는 순차 batch가 여러 개다.
  - "직접 수정 금지", "읽을 parent/context", "출력 schema", "pass/fail 기준"을 명시해야 한다.
  - 단일 Codex 세션이 controlling log를 읽고 바로 작업하는 경우에는 task brief 없이도 된다.
  - 진행 중 agent가 scope를 오해하거나 owner 직접 수정 위험이 보이면 task brief 또는
    correction brief를 추가한다.

**Portable Draft v0 보강 제안 추가(의견):**
- v0 앞단에 **Package activation gate**를 추가한다. 기존 작업/신규 작업/진행 중 확대 모두에서
  package 전환 여부를 판단한다.
- v0의 task brief 항목 앞에 **Task brief activation gate**를 추가한다. package log만으로 충분한
  경우와 package log + task brief가 필요한 경우를 구분한다.

## 2026-06-19 · package gate set feedback — F34~F38 추가

F32~F33의 activation gate 논의에 이어, package workflow에는 시작 여부뿐 아니라 분할,
리뷰 깊이, owner 반영, downgrade, closeout을 판단하는 gate도 필요하다는 후보를 추가한다.
아직 확정 규칙이 아니라 W5/W8/W9/W10 적용을 거쳐 검증할 portable 후보이다.

**F34 — Package downgrade gate가 필요하다.**
- 사례: package로 시작했더라도 실제 작업이 단일 판단·단일 파일·단일 Work Item 수준으로
  줄어들면 package workflow가 과해질 수 있다.
- 분류: **Portable candidate**.
- 판단 기준 후보: subagent/reviewer가 불필요함, cross-owner 영향이 없음, 삭제·이동·migration이
  없음, Work Item 1~2개로 끝남, Evidence Ledger나 task brief가 오히려 상태를 흐림.
- 조치 후보: package를 downgrade할 때는 package log를 무시하지 말고, 기존 Work Item을 완료·취소·
  이관 중 하나로 해소하고 controlling log 또는 parent에 복귀 위치를 남긴다.

**F35 — Package split gate가 필요하다.**
- 사례: W5는 `history/` source/index 작성과 실제 decision/log/archive migration, delete guard가
  한 덩어리로 섞이면 너무 크고 위험하다. 그래서 B1 source/index와 이후 migration/delete를
  분리했다.
- 분류: **Portable candidate**.
- 판단 기준 후보: 한 agent가 한 세션에 검토하기 어려움, 서로 다른 owner/artifact가 섞임,
  코드축과 문서/history축 리뷰가 모두 필요함, source map 작성과 실제 변경 실행이 섞임,
  rollback 비용이 다른 작업들이 한 Work Item에 묶임.
- 조치 후보: split 시 각 batch/package의 primary output, 직접 수정 허용 범위, downstream
  consumer, pass/fail 기준을 분리한다.

**F36 — Review depth gate가 필요하다.**
- 사례: W5에서 Claude 리뷰는 Gemini source map의 형식만 보는 리뷰가 아니라 controlling log,
  parent 결론, downstream delete guard와의 정합성까지 보는 리뷰였다. 리뷰 깊이를 명시하지
  않으면 reviewer가 format-only로 끝내거나 반대로 전체 migration 실행까지 판단할 수 있다.
- 분류: **Portable candidate / review planning candidate**.
- 리뷰 깊이 후보: format-only review, schema compliance review, evidence/disk verification
  review, scope/downstream collision review, senior final judgment.
- 조치 후보: task brief 또는 review prompt에 이번 리뷰가 판정할 depth와 판정하지 않을 범위를
  명시한다.

**F37 — Authority update gate가 필요하다.**
- 사례: W5 B1은 `history/` source/index를 만드는 단계인데, Scope의 cross-owner wording이
  owner docs 직접 수정 허용처럼 읽힐 수 있었다. 이후 B1에서는 `docs/specs/`,
  `docs/architecture/`, `docs/product/roadmap.md`, `plans/release-plan.md`를 직접 수정하지
  않고 owner-impact 후보로만 표시하도록 보정했다.
- 분류: **Portable candidate**.
- 판단 단계 후보: source map만 작성, decision candidate만 표시, owner impact만 기록,
  승인 후 `docs/decisions/` 작성, 승인 후 specs/architecture/roadmap/release 수정.
- 조치 후보: package Scope에서 "direct updates"와 "owner-impact only"를 분리해 적는다.

**F38 — Package exit/closeout gate가 필요하다.**
- 사례: W7 closeout에서는 child 로그를 `decided`로 닫고 parent W4.5 및 inventory next pointer를
  소비해야 했다. W5는 closeout 전 source map, downstream handoff, delete guard, parent 반영이
  모두 맞아야 한다.
- 분류: **Portable candidate**.
- 판단 기준 후보: Work Items 완료, parent 반영 완료, downstream handoff 작성, delete/move guard
  해소 또는 명시적 blocked 처리, Evidence Ledger 재현 가능, owner 반영/미반영 이유 기록,
  portable retrospective 기록.
- 조치 후보: closeout 전에는 package log만 보지 않고 parent/known child/downstream handoff를
  함께 점검한다.

**Gate set 우선순위 후보(의견):**
1. Package activation gate.
2. Task brief activation gate.
3. Review depth gate.
4. Authority update gate.
5. Package split, downgrade, closeout gate는 W5/W8/W9/W10 실제 적용 후 정밀화한다.

## 2026-06-21 · legacy 다중 폴더 흡수 source map & 조건부 archive 후보 — F39~F40 추가

W8(A2A spec) 착수를 준비하며, `prd/`·`plan/`·`docs/aiox/`·`plans/post-mvp/`처럼
documentation-system.md taxonomy에 없는 legacy 다중 폴더를 W8~W10에서 흡수하고 최종
삭제까지 끌고 갈 방법을 논의했다. 아직 W8 미착수이므로 W1-2를 완료로 넘기지 않고 W8 준비
입력으로 수집한다. 아래는 history migration(W5) 패턴을 legacy 폴더 집합으로 확장하는 후보다.

**F39 — legacy 다중 폴더 흡수는 단일 source map으로 추적하고, primary package가 생성·후속 package가 append한다.**
- 맥락: `history/`는 W5가 Seed Mapping/Evidence Ledger 단일 표로 disposition(absorbed /
  consumer-needed / archive / delete)을 추적한다. 그러나 `prd/`·`plan/`·`docs/aiox/`·
  `plans/post-mvp/`에는 동등한 추적 표가 없어, W8/W9/W10이 각자 흡수해도 "무엇이 흡수됐고
  무엇이 삭제 후보인지"가 흩어진다. docs/aiox는 W5에서 명시적 제외(dependency-only,
  W5 로그 line 22)였으므로 W5가 owner가 아니다.
- 패턴: legacy 폴더 집합을 위한 단일 source map 표를 하나 만든다. 컬럼 후보:
  `file | 주장 성격 | 흡수 owner(spec/arch/roadmap/release/decision) | 소비 package(W8/W9/W10) |
  archive 필요? | self-suffic 검증 | disposition(absorb→delete / archive→delete / delete-only / keep)`.
- append 규칙: source map은 별도 absorption package(`history/`의 W5 history migration과 형제)가
  소유하고, 흡수 package(W8/W9/W10)는 새 표를 만들지 않고 같은 표에 row를 append/update한다.
  최종 물리삭제 게이트는 이 표 하나만 소비한다.
- 경계 규칙: `history/`는 W5 owner이므로 중복 금지. 한 source가 여러 package에 걸치면
  (`prd/post-mvp/aiox-a2a-spec.md` = W8 spec + W9 roadmap/release) 소비 package를 복수로 적는다.
- 분류: **Portable candidate**(구체 폴더 집합·W 번호는 repo-specific, "단일 source map +
  생성/append owner 분리 + 삭제 게이트 단일 소비"는 portable).

**F40 — archive는 기본이 아니라 조건부 게이트다.**
- 맥락: 원본 삭제 전 archive는 필수가 아니다. owner 흡수만으로 충분하면 archive 없이 삭제
  후보로 보낸다.
- 게이트(둘 다 만족할 때만 `logs/` digest로 통합):
  1. 보존가치: decisions/architecture로 직접 승격하기엔 너무 구체적인 `[Fact]`(TDD 마일스톤,
     수동 에러 검증 트레이스, 스파이크 측정치)이고 역사적 검증 맥락 보존이 필요.
  2. self-sufficiency: 원본이 사라져도 digest + 현행 owner 문서만으로 과거 경위/검증을 이해 가능.
- 불충족 시 disposition: owner 흡수 후 `absorb→delete`(archive 불필요), 아직 필요하면 `keep`.
- specs/release/roadmap 흡수 시에도 문서 특징별로 이 게이트를 개별 적용한다.
- 분류: **Portable candidate**.

**Portable Draft v0 보강 제안 추가(의견):**
- v0 point 6(cross-validation)/source guard에 **F39**(legacy 다중 폴더는 단일 source map +
  생성/append owner 분리, 삭제 게이트 단일 소비)를 추가한다.
- v0 point 9(closeout map)에 **F40**(archive는 보존가치 + self-sufficiency 둘 다 만족할 때만,
  기본은 흡수 후 삭제)을 추가한다.

## 2026-06-21 · W8 불안 요인과 evidence-first assimilation 후보 — F41~F42 추가

@user 우려: W8(A2A spec authority assimilation)은 기억 속 spec 구현, 현재 spec, 버그 수정,
개선 필요 사항, 앞으로 구현할 것, 이미 구현된 것, stale/drift reference가 여러 파일에 흩어져
있다. agent가 이 자료를 읽으며 사실과 추론을 잘못 판별하거나, 높은 컨텍스트 비용 때문에
요약으로 밀어붙이면 잘못된 주장이 `docs/specs/` owner 문서에 monolithic authority처럼 흡수될
수 있다. W7-B* 때도 일부 검증이 "눈가리고 아웅"처럼 느껴졌으므로, package workflow의 핵심은
단순 batch 분할이 아니라 **잘못된 승격을 막는 검증 절차**여야 한다.

작성 전 subagent 검토 결과, 유사 내용은 이미 흩어져 있었다. v0 point 7은 fact/inference/opinion
구분을 말하고, F3는 future/current/stale 혼동, F10은 ledger 신뢰가 검증 규율에 의존함, F37은
authority update gate, F39는 scattered legacy source map을 다룬다. 하지만 "흩어진 source의
미검증 추론이 owner artifact로 승격되는 위험" 자체를 직접 이름 붙인 portable 후보는 없었다.

**F41 — Authority assimilation은 owner 승격 전에 claim provenance를 보존해야 한다.**
- 맥락: legacy/current/planning source에는 확인된 사실, 추론, 의견/제안, 현재 구현, target
  contract/structure, bug fix, improvement, stale/drift reference, 오래된 rationale이 섞일 수
  있다. 이를 agent가 요약해 바로 primary artifact에 반영하면, 추론이나 stale claim이 권위
  내용처럼 승격될 수 있다.
- 분류: **Portable candidate**.
- 패턴: owner artifact를 수정하기 전에 claim 단위로 provenance를 분류한다. 최소 분류 후보는
  `verified fact`, `inference`, `opinion/proposal`, `current implementation`, `target
  contract/structure`, `bug fix`, `improvement`, `stale/drift reference`다. 현재성 주장과
  target 주장은 각각 source of truth와 검증 기준을 별도로 가진다.
- 승격 규칙 후보: 검증된 claim 또는 사용자가 명시 승인한 claim만 owner artifact 본문으로
  승격한다. 미검증 추론은 owner 본문에 쓰지 않고 Evidence Ledger, Decision Candidates,
  owner-impact note, Open Issue로 남기며 필요한 재검증 조건을 적는다.
  단 `current implementation`/`Current Contract`로 분류된 claim은 승격 전 F42
  falsifiability gate(`src/` + 가능한 test cite)를 추가로 통과해야 한다. provenance 분류만으로
  현재성 주장을 승격하지 않는다.
- 조치 후보: v0 point 6/7과 F37 Authority update gate에 **claim provenance gate**를 추가한다.

**F42 — Ledger-first / artifact-later 2단계 흡수 게이트가 필요하다.**
- @claude/@codex 종합 의견: W8의 첫 산출물은 `docs/specs/aiox-a2a.md` patch가 아니라 batch별
  Evidence Ledger여야 한다. 특히 `Current Contract` 같은 current 주장은 `src/` 근거와 가능한
  test 근거로 반증 가능해야 하며, 근거가 없으면 `Target Contract`, `Proposed Contract`,
  `Open Issue`, `Implementation Gap` 등으로 낮춘다.
- 분류: **Portable candidate**.
- 패턴: 큰 assimilation/refactor/migration package에서 batch agent는 기본적으로 investigator다.
  1차 단계에서는 primary artifact를 직접 수정하지 않고 `claim -> evidence -> classification ->
  owner impact -> action` Ledger를 만든다. 2차 단계에서 controlling agent 또는 reviewer가
  cite spot-check와 pass/fail 검토를 수행한 뒤, 통과한 row만 owner artifact에 반영한다.
- 비용 통제 후보: 모든 source를 controlling agent가 재독하지 않는다. batch agent가 비싼 통독과
  cross-validation을 맡고, controlling agent는 Ledger의 핵심 cite와 high-risk row를 표적
  검증한다. 단, "Current/As-built/Current Contract" 승격 row, 삭제·이동·owner 변경 row,
  decision-worthy row는 spot-check 우선순위가 높다.
  spot-check 대상 cite는 handoff에 적힌 line을 그대로 신뢰하지 않고 최종 source에서 재확인한다.
  `logs/AGENTS.md`의 "진입 함수가 무엇을 호출하는지 끝까지 추적" 규칙과 Package Preparation의
  "`file:line`은 출발점" 규칙을 assimilation 승격 게이트에 그대로 적용한다.
- W8 적용 후보: A0/A1/B/C/Sweep batch는 먼저 Ledger-only로 실행한다. §11~§13은 spec 본문 복사
  금지이며, spec contract를 직접 고정하는 rationale만 Decision Candidates로 승격 검토한다.
  architecture/product/roadmap 성격은 Cross-Owner Effects 또는 W9/W10 handoff로 남긴다.

**Portable Draft v0 보강 제안 추가(의견):**
- v0 point 6/7 + F37 Authority update gate에 **F41**(owner artifact로 승격하기 전 claim
  provenance gate: fact/inference/opinion/current/target/bugfix/improvement/stale를 분류하고,
  미검증 추론은 owner 본문이 아니라 Ledger/Decision Candidates/owner-impact에 남김)을 추가한다.
- v0 point 5/7에 **F42**(Ledger-first / artifact-later 2단계 흡수: batch agent는 먼저
  Ledger-only 산출물을 만들고, controlling/reviewer cite spot-check 후 통과 row만 owner artifact에
  반영)를 추가한다.

## 2026-06-21 · W8 task brief 수립안 후보 — F43 추가

@user 질문: portable pattern에는 task brief 작성 방법에 대한 사례가 흩어져 있고,
`logs/AGENTS.md`에는 template이 있지만, W8에서 Claude 제안과 Codex 의견을 종합한 실제
task brief 수립 방식을 기록해야 한다.

**F43 — Evidence-first assimilation brief는 "읽을 것"보다 "승격 금지 조건"을 먼저 고정한다.**
- 맥락: W8은 `docs/specs/aiox-a2a.md`를 primary owner로 삼지만, 입력 source에는 current spec,
  post-MVP target, bug/improvement, roadmap/release gate, architecture rationale, stale snapshot이
  섞여 있다. 따라서 task brief가 단순히 source 목록과 batch 범위만 주면 agent가 좋은 요약을
  owner 문서 patch로 바로 만들 위험이 있다.
- 분류: **Portable candidate**.
- W8 수립안(이번 package 적용분; portable 추출은 아래 v0 보강 제안):
  points 2~4는 각각 F42(Ledger-first), F41(provenance), F42(falsifiability)를 brief 문구로
  구현한 것이다. 규칙 본체가 바뀌면 F41/F42를 source로 본다.
  1. **Controlling log와 Scope를 먼저 고정한다.** task brief 상단에 `Controlling log:
     <W8 package log>`를 명시하고, `Primary owner`, `Allowed direct updates`, `Owner-impact
     only targets`, `Evidence inputs`를 package log와 맞춘다.
  2. **Batch 목적을 patch가 아니라 Ledger로 둔다.** 각 batch 완료 조건의 첫 줄은
     "`docs/specs/aiox-a2a.md`를 직접 수정하지 않고 Evidence Ledger를 작성한다"로 시작한다.
     본문 반영은 별도 approved/apply 단계로 둔다.
  3. **Claim provenance gate를 brief에 박는다.** 각 claim을 `verified fact`, `inference`,
     `opinion/proposal`, `current implementation`, `target contract/structure`, `bug fix`,
     `improvement`, `stale/drift reference` 중 하나 이상으로 분류하게 한다.
  4. **Current 승격은 falsifiability gate를 통과해야 한다.** `Current Contract` 또는 현재 구현
     주장으로 Ledger에 남기려면 `src/` cite와 가능한 test cite를 요구한다. 근거가 없으면
     `Target Contract`, `Proposed Contract`, `Open Issue`, `Implementation Gap`,
     `Pre-implementation Blocker` 등으로 downgrade한다. 라벨은 artifact 종류에 맞춘다
     (예: spec은 contract 라벨, architecture는 Current/Target/gap 라벨).
  5. **Cross-owner 내용을 spec에 복사하지 못하게 한다.** release gate, execution plan,
     architecture debt, product rationale, deletion/archive disposition은 spec 본문 후보가 아니라
     Cross-Owner Effects, Decision Candidates, source map row, W9/W10 handoff로 출력하게 한다.
  6. **출력 schema를 review 가능하게 좁힌다.** batch output은 Evidence Ledger,
     Decision Candidates, Cross-Owner Effects, Source Map updates, Open Questions로 제한한다.
     각 row에는 `Action`과 "owner 본문 반영 가능/불가/추가 검증 필요"를 표시한다.
  7. **Review depth와 spot-check 우선순위를 명시한다.** controlling/reviewer는 모든 source를
     재독하지 않고, `Current` 승격 row, owner 변경 row, deletion/archive row, decision-worthy row,
     "변경 없음" row를 우선 spot-check한다. handoff/legacy `file:line`은 출발점일 뿐이므로
     최종 source에서 cite를 재도출한 뒤에만 Ledger 근거로 쓴다.
  8. **Batch 경계는 source 성격과 검증 단위로 나눈다.** W8 후보는 A0(definition/current
     snapshot/runtime config gap), A1(protocol core/lifecycle), B(adapter/compose),
     C(capability/federation/deferred), Sweep(§10~§13 owner 분류)처럼 나눈다. A0/A1 분리는
     runtime/config contract와 protocol lifecycle 검증 범위가 섞여 context가 폭증하는 것을 막기
     위한 장치다.
- Brief에 넣을 경고문 후보:

```markdown
This batch is Ledger-first. Do not patch the primary owner document unless the
controlling log explicitly says this is the apply phase.

Treat every legacy/planning source as an inspection target, not as current truth.
Current Contract claims require src cite and, where possible, test cite. Without
that evidence, downgrade the claim to Target/Proposed/Open Issue/Implementation
Gap/Pre-implementation Blocker.
```

- 조치 후보: W8 package log와 batch task brief를 만들 때 F43을 직접 적용한다. W8 closeout에서
  이 수립안이 context 비용과 잘못된 승격 위험을 실제로 줄였는지 retrospective로 검증한다.

**Portable Draft v0 보강 제안 추가(의견):**
- v0 point 5(task brief)에 **F43**(Evidence-first assimilation brief: controlling log/scope,
  Ledger-only output, claim provenance gate, falsifiability gate, cross-owner no-copy rule,
  review depth/spot-check priority를 brief에 명시)을 추가한다.

## 2026-06-21 · W8 Sweep 회고 — F44 추가

**F44 — Dated audit source는 current owner 요약과 code drift를 먼저 대조한 뒤 이관한다.**
- 맥락: W8 Sweep에서 `prd/post-mvp/aiox-a2a-spec.md` §12는 2026-06-11 기준 결함 표였고,
  `docs/product/roadmap.md`는 이미 이를 gate pressure로 요약해 소유하고 있었다. 원본 row를
  그대로 roadmap/spec/architecture에 복사하면 이미 수정된 항목(예: Claude channel registration
  token, rollback pending token cleanup)을 현재 결함으로 재승격할 위험이 있었다.
- 분류: **Portable candidate**.
- 패턴: dated audit/checklist/source-map row를 handoff할 때는 (1) current owner가 이미 소유한
  요약을 먼저 확인하고, (2) raw row의 핵심 claim을 code/current owner로 spot-check해
  `remaining gap` / `stale-drift` / `needs full audit`로 나눈다. release/roadmap owner에는
  상세 파일 위치와 과거 severity를 무조건 복사하지 않고 gate pressure나 execution input으로
  낮춘다.
- 조치 후보: F41/F42/F43의 claim provenance gate에 "dated audit drift check"를 하위 규칙으로
  추가한다. 특히 security/reliability audit은 일부 row가 수정됐더라도 같은 gate pressure는
  남을 수 있으므로, "row stale"과 "gate pressure 해소"를 구분한다.

## 2026-06-21 · W8→W9/W10 source-map read-path 회고 — F45 추가

@user 질문: W9/W10 agent가 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`를
종합적으로 읽어야 하는데, 실제 작업 진입 시 최신 로그 블록만 보고 source map을 놓칠 가능성이
있는지 확인 요청. 로컬 확인 결과, `logs/AGENTS.md`에는 legacy 다중 폴더 흡수를 단일 source
map으로 추적하고 W8/W9/W10이 append/update한다는 규칙이 있으며, parent W4.5 Work Items도
W8/W10에 source map 사용을 언급한다. 그러나 W9 Work Item은 W10보다 source map required-read가
덜 직접적이고, onramp는 보통 현재 로그의 Work Items/latest/next pointer 중심으로 재개하므로
"source map이 존재한다"와 "후속 package agent가 반드시 읽는다"는 별도 보장이다.

**F45 — Shared source map은 생성 규칙뿐 아니라 consumer read binding이 필요하다.**
- 맥락: F39는 legacy 다중 폴더 흡수를 단일 source map으로 추적하는 패턴을 세웠다. 하지만
  W8에서 W9/W10 handoff를 남길 때 최신 블록과 parent Work Item에 source map required-read를
  명시하지 않으면, 후속 agent가 roadmap/release primary owner만 읽고 source map append/update
  의무를 놓칠 수 있다.
- 분류: **Portable candidate / repo integration candidate**.
- 패턴: shared ledger/source map/checklist를 여러 package가 소비한다면, package closeout은
  다음 네 가지를 함께 확인한다.
  1. **Owner binding**: shared artifact의 owner log/path와 목적이 명시되어 있다.
  2. **Consumer binding**: 어떤 downstream package가 어떤 row/section을 읽고 append/update해야
     하는지 latest block, Cross-Owner Effects 또는 Closeout에 적혀 있다.
  3. **Entry binding**: parent Work Item 또는 다음 package task brief의 `먼저 읽어라`에 shared
     artifact가 required read로 들어가 있다.
  4. **Action binding**: "읽기"만이 아니라 append/update/disposition/self-sufficiency 검증 같은
     수행 동작이 Work Item 또는 Closeout action으로 잡혀 있다.
- W8 적용 후보: W8 closeout/latest block에 W9 required reads로
  `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`를 명시하고, 특히
  `prd/post-mvp/aiox-a2a-spec.md`, `plans/post-mvp.plan.md`, `plans/post-mvp/*` rows를
  W9 roadmap/release package 입력으로 박는다. W10 required reads에도 같은 source map의
  `docs/aiox/*`, archive/decision candidate rows를 명시한다. `deliveryId` namespace와
  correlated reply authorization 같은 G1 gate handoff는 roadmap에 바로 확정 contract로 쓰지
  않고, W9 G1 gate update candidate로 연결한다.
- 조치 후보: F23~F25(handoff entry binding), F29~F30(parent/downstream context), F38(closeout
  gate), F39(shared source map)를 연결해, package closeout checklist에 **shared artifact
  consumer read binding** 항목을 추가한다. "최신 블록만 읽어도 다음 package가 놓치지 않는가"를
  closeout 질문으로 삼는다.

## 2026-06-21 · W8 closeout draft 회고 — F46~F50 추가

`logs/W8-closeout-task.md`에 따라 W8(A2A spec authority assimilation) closeout draft를 저작하며
확인한 workflow 후보를 기록한다. 이 기록은 draft 수집이다. W8 child closeout이 Claude checker
review PASS되기 전까지 W1-2는 완료 처리하지 않는다.

**F46 — Falsifiability gate는 "current" 흡수 차단 장치로 실제 효과가 있었다.**
- 맥락: W8은 legacy target spec, current spec, implementation gap, bug fix, improvement, stale
  rationale가 섞인 package였다. `Current Contract`를 `src/file:line`(+가능하면 test cite) 없이는
  금지하고, 근거가 없으면 Target/Open/Implementation Gap으로 낮추는 규칙이 §4.5 persistence,
  §7 trust boundary, §8 federation, §9 Codex ingress 부분에서 current overclaim을 막았다.
- 분류: **Portable candidate**.
- 패턴: authority assimilation에서 현재성 라벨을 붙이는 순간을 별도 gate로 취급한다. 현재성
  claim은 "source가 그렇게 말한다"가 아니라 현재 source of truth로 반증 가능해야 한다.
- Repo-specific note: 이 repo의 label 이름은 `Current Contract`/`Implementation Gap` 등이다. 다른
  repo에서는 artifact별 label vocabulary로 치환한다.

**F47 — Ledger-first / artifact-later는 효과적이지만, apply 단계의 저작자와 reviewer 경계까지 기록해야 한다.**
- 맥락: W8 batch는 Evidence Ledger-only로 시작했고, 본문 반영은 W7 cite spot-check 뒤에만
  수용했다. 이 방식은 잘못된 추론이 `docs/specs/aiox-a2a.md`에 바로 박히는 위험을 줄였다.
  다만 실제 흐름에는 Codex 저작 draft, Claude checker review, 일부 parent checkbox 선반영처럼
  단계 사이의 경계가 복잡했다.
- 분류: **Portable candidate**.
- 패턴: 2단계 게이트는 "Ledger 작성"과 "artifact patch"만 분리하면 부족하다. closeout에는
  `producer`, `apply author`, `checker`, `accepted artifact`, `pending draft`를 구분해 남긴다.
- 조치 후보: package closeout template에 "accepted vs draft artifacts" 항목을 추가한다.

**F48 — Cross-model 검증 의도는 producer identity까지 감사해야 한다.**
- 맥락: W8은 producer/checker 독립성을 위해 Codex producer + Claude checker를 의도했다. 그러나
  package 진행 중에는 "controlling agent subagent"와 "Codex producer" 결정이 바뀌었고, 실제 산출물이
  어떤 모델/세션에서 나왔는지 불명확하면 cross-model 검증 가치가 약화된다.
- 분류: **Portable candidate / repo integration candidate**.
- 패턴: multi-agent 검증을 closeout에 쓸 때는 "다른 agent가 봤다"가 아니라, 산출물별 저작자와
  checker, checker가 직접 source를 재확인했는지, 의존한 보고가 무엇인지 기록한다.
- Rejected / too heavy: 작은 단일 파일 변경에 매번 모델 정체를 감사하는 것은 과하다. authority
  update, deletion, decision promotion처럼 irreversible한 gate에서만 적용한다.

**F49 — Parent completion checkbox는 child closeout review와 원자적으로 맞춰야 한다.**
- 맥락: W8 parent Work Item은 child closeout review 전 이미 `[x]`로 표시되어 있었다. 상단 요약만
  보면 W8이 끝난 듯 보이지만, child W9 closeout은 아직 draft였다. 이는 F27(parent-child 원자적 복귀
  계약)과 F14(disk 산출물 증명)의 재발 사례다.
- 분류: **Portable candidate**.
- 패턴: parent가 child package 완료를 표시하려면 child closeout PASS 또는 그에 준하는 accepted
  evidence가 있어야 한다. 불가피하게 선반영했다면 closeout draft가 "conditional parent
  consumption"으로 명시하고, review PASS 후 parent 최신 블록으로 정합화한다.
- 조치 후보: parent/child closeout checklist에 "parent checkbox와 child closeout status가 같은
  accepted evidence를 가리키는가"를 추가한다.

**F50 — Split map과 historical handoff는 closeout 산출물이어야 하며, 실제 split/delete와 분리해야 한다.**
- 맥락: W8이 끝나도 spec split, architecture split, legacy source deletion은 남아 있다. closeout에서
  split map과 Legacy/Historical Source Handoff를 남기지 않으면 W10/physical deletion gate가 같은
  source를 다시 발굴해야 한다. 반대로 closeout에서 split/delete를 실행하면 W8 scope를 넘는다.
- 분류: **Portable candidate**.
- 패턴: 큰 assimilation package closeout은 `what is accepted`, `what moves next`, `what must not be
  deleted yet`를 분리한 handoff map을 남긴다. 실제 split/delete는 downstream owner가 수행한다.
- Repo-specific note: 여기서는 `history/58`, `prd/post-mvp/*`, `docs/aiox/*`, `plans/post-mvp*`,
  `history/59`가 대상이다. portable 추출은 "source group -> consumed / downstream check /
  deletion gate" 형태만 가져간다.

## 2026-06-22 · W9 closeout draft 회고 — F51~F55 추가

`logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md` W7 closeout draft를 저작하며 확인한
workflow 후보를 기록한다. 이 기록은 draft 수집이다. W9 child closeout이 Claude checker review PASS되기
전까지 W11의 최종 정리 항목은 완료 처리하지 않는다.

**F51 — Authority gap과 execution successor gap을 분리해야 한다.**
- 맥락: W9 Batch R은 처음에는 roadmap/release/plans 재편과 단일 plan 작성까지 이어질 수 있었지만,
  @user 결정으로 단일 A2A plan 작성은 Obsidian/Atlas stage 이후로 deferred됐다. 이후 authority 정합
  producer/checker는 `docs/specs/aiox-a2a.md`·`docs/product/roadmap.md`·`plans/release-plan.md`가
  owner authority 수준에서는 충분하다고 PASS했다. 남은 gap은 실행 checklist/detail successor 부재였다.
- 분류: **Portable candidate**.
- 패턴: owner artifact assimilation에서 "권위 문서가 계약/gate/우선순위를 충분히 소유하는가"와
  "실행자가 바로 착수할 checklist가 한 문서에 모였는가"를 별도 질문으로 둔다. 전자는 owner body
  apply 여부를 결정하고, 후자는 plan/successor pending으로 남길 수 있다.
- 조치 후보: package closeout template에 `authority gap` / `execution successor gap` / `deletion gate gap`
  구분을 추가한다.

**F52 — Deferred successor는 삭제 후보가 아니라 keep/pending disposition으로 표현한다.**
- 맥락: `plans/post-mvp*`는 사용자 목표상 언젠가 단일 plan으로 재편 후 삭제 후보지만, 단일 plan 작성이
  Obsidian/Atlas 이후로 미뤄졌다. 이 상태에서 source map을 `absorb→delete after single plan`로 두면
  현재 삭제 readiness처럼 읽힐 수 있다. W9는 `keep / execution successor pending`으로 표기했다.
- 분류: **Portable candidate**.
- 패턴: deletion/disposition map에서 successor가 아직 없으면 aspirational final state를 disposition으로
  쓰지 않는다. 현재 실행 가능한 상태는 `keep`, 이유는 `successor pending`, 재판정 조건은 별도 문장으로
  둔다.
- Repo-specific note: 여기서는 `plans/post-mvp*`와 `prd/post-mvp/aiox-a2a-spec.md` §11이 해당한다.

**F53 — Optional traceability wording은 authority apply와 구분해야 한다.**
- 맥락: W7 Open Issue 4/5(public `deliveryId` namespace, correlated reply authorization)는 roadmap G1
  gates와 spec Open Issue에 이미 표현되어 있었다. 이름을 roadmap에 명시하면 traceability가 좋아질 수
  있지만, checker는 authority gap이 아니라고 PASS했다.
- 분류: **Portable candidate**.
- 패턴: reviewer가 "더 명시하면 좋음"을 발견했을 때 이를 owner body apply로 자동 승격하지 않는다.
  `optional traceability improvement`를 `authority gap`과 구분하고, 적용은 사용자/owner 승인 뒤 별도
  patch로 둔다.

**F54 — PASS된 producer/checker 결과를 source map에 반영하는 작업은 새 분석과 다르게 취급한다.**
- 맥락: W6 source map update는 새 claim 검증이 아니라 W3/W4와 W5의 checker PASS 결과를 canonical
  source map 기존 row에 반영하는 장부 작업이었다. 그래서 subagent 없이 controlling agent가 직접
  수행했고, 새 표를 만들지 않는 것을 핵심 검증으로 삼았다.
- 분류: **Portable candidate / repo integration candidate**.
- 패턴: source map/ledger 업데이트를 할 때 작업 성격을 `new analysis` / `accepted-result bookkeeping`
  / `final disposition`으로 구분한다. accepted-result bookkeeping은 좁은 직접 수정이 가능하지만,
  final disposition이나 deletion readiness는 별도 gate를 요구한다.

**F55 — Partial parent closeout은 "무엇이 소비됐고 무엇이 남았는지"를 Work Item 단위로 말해야 한다.**
- 맥락: W9는 roadmap/release authority assimilation을 완료했지만, 단일 plan 작성과 post-mvp 삭제는
  deferred이고 W10 split/Archive Gate도 남아 있다. parent W4.5에 W9를 단순 `[x]`로 반영하면 남은
  deferred 조건이 사라져 보일 수 있다.
- 분류: **Portable candidate**.
- 패턴: child package가 parent로 복귀할 때 일부 scope가 downstream/deferred라면 parent 반영안은
  `consumed`, `deferred`, `transferred`, `blocked-by`, `must not do yet`를 구분한다. parent checkbox 전이는
  child 전체 수명 종료가 아니라 parent가 소비해야 할 해당 Work Item의 의미가 해소됐는지로 판단한다.
- 조치 후보: parent/child closeout checklist에 partial closeout vocabulary를 추가한다.
