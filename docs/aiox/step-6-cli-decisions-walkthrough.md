# Step 6 CLI Decisions Walkthrough — 학습 기록

> 작성일: 2026-05-19
> 관련 history: `history/20-step-6-phase-a-decisions.history.md`
> 관련 plan: `plan/mvp-implementation-checklist.md` Step 6 (line 511–533)
> 관련 architecture: `docs/architecture/mvp-architecture.md` §9 (MVP command surface)

---

## 1. 이 topic이 나오게 된 배경

Step 5 (route/connect fan-out tests at daemon level) 마감 후 Step 6 — invocation
layer + CLI bin entrypoint — 진입을 위해 `plan/mvp-implementation-checklist.md`
가 명시한 3개 spec 결정 사항을 사용자가 코덱스로부터 옵션 보고로 받았다.

원본 보고는 commander exit code, send CLI 노출 여부, empty route 처리 세 결정의
A/B/C, (i)/(ii)/(iii), α/β/γ 옵션과 trade-off로 구성되어 있었고, 사용자는
"이렇게 코덱스가 이야기하는데 뭔말들임?" 으로 walkthrough를 요청했다.

이후 Claude가 결정을 하나씩 비유와 예시로 설명하고, 사용자가 각 결정마다 이해를
확인한 뒤 confirm하는 1:1 walkthrough가 진행됐다.

---

## 2. 사용자가 처음 막혔던 지점

세 결정 모두 "코덱스 보고서가 옵션 명칭과 PRD/history 결정 번호를 그대로
나열한 상태라 비전공자 시점에서 무엇을 묻는지 파악하기 어려웠다"는 게 공통.

세부 막힘 포인트:

1. **결정 1**: `exit code`가 쉘 스크립트/CI 분기에 어떻게 쓰이는지, commander가
   왜 0/1 혼재 값을 박는지, catch 블록의 의미가 무엇인지 명시 X.
2. **결정 2**: `sendMessage`라는 새 daemon API가 Step 5에서 도입됐다는 사실과
   "CLI 노출"이 PRD 13개 명령 surface와 어떻게 충돌하는지 명시 X.
3. **결정 3**: 이 결정이 결정 2의 어떤 옵션에서만 의미를 갖는지가 한 번에
   안 보였고, 코덱스 추천이 "β" 였는데 사용자는 한순간 "α (성공)"로 잘못
   해석함.

---

## 3. Claude의 설명 — 결정별 핵심

### 3.1 결정 1: exit code 정책

**핵심 개념**:

- CLI 명령은 종료 시 OS에 정수 하나(`process.exit(code)`)를 전달한다.
- `0` = 성공, `0이 아닌 수` = 실패. 쉘은 이걸로 `&&` / `||` 분기를 결정한다.
- aiox는 commander.js로 파싱하고, catch에서 `process.exit(???)`을 호출해야 함.
- 문제는 `err.exitCode`가 commander origin인 경우 0인 케이스가 있다는 것
  (대표 사례: `--version`, `--help` 처리). 옵션은 그 값을 통과시킬지, 1로
  덮을지, namespace 기반으로 분기할지.

**세 옵션 코드 스니펫 비교**:

| 옵션 | 코드 | 동작 |
|---|---|---|
| A | `process.exit(err.exitCode ?? 1)` | commander 값 통과, 없으면 1 |
| B | `process.exit(1)` | catch 됐으면 무조건 1 |
| C | `if (err.code?.startsWith('aiox.')) 1 else err.exitCode ?? 1` | namespace 분기 |

**사용자 막힘 → Claude 추가 설명**:

사용자가 옵션 A의 케이스 1 ("commander가 exitCode 0 박은 에러")에서 "메시지는
에러인데 exit code는 0이면 어색한 거 아니냐"고 정확히 짚었다. 이게 코덱스가
A의 단점으로 언급한 "parser/usage error 일관성이 약하다"의 핵심.

다만 aiox는 Step 4에서 `--version` / `--help`를 `ParsedCommand` variant로 미리
capture해 error path가 아니라 stdout 출력 path로 빼냈기 때문에, 실제로 catch
까지 도달해서 `exitCode: 0`이 노출되는 사례는 거의 발생하지 않음. 그래서 A를
선택해도 사용자 입장에서 "성공처럼 보이는 에러" UX는 사실상 발생 안 함.

### 3.2 결정 2: `sendMessage` CLI 노출 여부

**핵심 개념**:

Step 5에서 `daemon.sendMessage({source, type, content})` 라는 새 daemon 내부
API가 추가됨. 호출하면 등록된 active route에 fan-out해서 메시지 전달.

문제: 이걸 `aiox send <source> <type> <content>` 같은 사용자-facing CLI 명령
으로 노출할지 여부.

**비유 (식당 주방)**:

`sendMessage`는 주방에 있는 새 조리 도구.

- (i) 손님(사용자)이 직접 주방에 들어와 도구 쓰게 함 → 메뉴판(PRD)에 추가 필요
- (ii) 도구는 살아 있지만 주방에서만 씀, 메뉴판은 그대로
- (iii) 도구를 만들어 놓고 어떻게 쓸지 자체를 미정 보류

**왜 (ii)가 추천인가**:

PRD가 MVP 명령을 daemon 5 + attach 2 + routing 2 + pair 1 + global 3 = 13개로
못박았고 send 계열은 없다. (i)를 고르면 PRD + history + parser + help + tests
가 다 확장됨 — Step 6 본 목표("13개 ParsedCommand dispatch + bin entrypoint")의
범위를 깨뜨림. (ii)는 daemon API 함수는 살려두고 surface만 닫음. 나중에 진짜
필요하면 그때 노출.

**사용자 결정**: (ii) + "필요해지면 나중에 추가, 그동안은 open concern으로
남긴다."

### 3.3 결정 3: empty `sourceRoutes` 동작

**핵심 개념**:

`sendMessage`를 호출했는데 source agent의 active route가 0개면 어떻게
응답할지.

- α: `{ ok: true, deliveries: [] }` + `message_created` event만 append (Step 5
  현재 동작)
- β: `{ ok: false, reason: "no_active_routes" }` (실패 처리)
- γ: caller가 `allowOrphanMessage` 플래그를 줄 때만 α 허용

**사용자 직관**: "보낸 곳이 0개인데 ok: true는 어색하다, 실패가 맞다." → β.

**사용자 혼동 → Claude 정정**:

사용자가 "그런데 왜 코덱스는 성공(α)으로 하자고 하는가" 라고 물었으나, 코덱스
원안은 다음과 같이 갈라짐:

- 결정 2가 (i)이면: **β 추천** (사용자-facing 정책이 필요해서)
- 결정 2가 (ii)이면: **deferred** (사용자-facing이 아니므로 미정으로 두고 send
  CLI 도입 시점에 재결정). Step 5 구현이 우연히 α인 것뿐이고 "α 유지하자"는
  적극 권장이 아님.

**Claude가 정리한 두 갈래**:

- (a) 코덱스 원안의 deferred — Step 5 무변경, YAGNI.
- (b) 사용자가 한 칸 더 나간 선택 — daemon API contract 레벨에서 β를 지금 박음.

**(b)가 합리적인 추가 근거**:

- 내부 호출자(테스트, adapter)도 `deliveries.length` 체크 누락 시 silent bug 가능.
- 어차피 send CLI 시점에 β로 갈 가능성이 가장 높음 → 지금 박으면 future churn
  회피.
- audit trail 필요 시 `message_created` event를 실패 응답과 **별개로** 기록할지
  는 phase B 코덱스 confirm 라운드에서 닫음.

**사용자 결정**: (b) — daemon API contract로 β 정착.

### 3.4 결정 3 sub-decision: β-1 vs β-2 (당초 OA2로 phase B 미룸 → walkthrough 중 closed)

β 채택 후 reject 응답에서 event audit을 어떻게 처리할지:

- **β-1**: 완전 atomic. message / deliveries / events 모두 추가 X.
- **β-2**: `message_created` event 1개만 append (audit trail 보존), delivery는 X.

**사용자 직관 1차**: audit trail이 일반적으로 가치 있다는 production 멘탈 모델
에 따라 β-2로 기울었음. Claude가 ATM 잔액 부족 비유로 audit 가치를 설명.

**사용자가 던진 핵심 질문**:

> "우리 프로젝트는 각 유저 개인이 사용하는 거고 개인의 local에 sqlite db에
> 저장되는 거잖아?"

이 질문이 walkthrough의 결정적 전환점. aiox의 운영 컨텍스트를 재확인하면 audit
trail의 일반적 가치 카테고리가 모두 약화된다:

| 가치 | 일반 production | aiox local single-user |
|---|---|---|
| 회계/규제 (감사 요구) | 있음 | **없음** |
| 보안 추적 (다중 사용자) | 있음 | **없음** |
| 사용자 컴플레인 디버깅 | 있음 | **낮음** (사용자 = 운영자) |
| 메트릭 (본인 분석) | 있음 | **낮음** |

ATM은 다수 사용자 + 금융 규제 + 보안 시나리오가 있어 audit가 필수. aiox는 그
시나리오 0개. Claude가 직전에 ATM 비유로 β-2를 정당화한 것은 멘탈 모델 mismatch.

**사용자 결정**: β-1 (atomic, event 0개).

**미래 호환성**: 후속 step (Step 8~10 adapter integration)에서 multi-agent
디버깅 가치가 명확해지면 `sendMessage`에 event append 한 줄 추가로 β-1 → β-2
trivial 이동 가능. YAGNI 원칙에 따라 지금은 atomic으로 닫는다.

---

## 4. 시각화

### 4.1 결정 1 — 사용자 시점에서 발생할 수 있는 케이스

```
$ aiox <명령>            (success path)
$ echo $?                → 0

$ aiox <bad-input>       (parse error → aiox.* throw)
$ echo $?                → 1   (err.exitCode 없음 → ?? 1)

$ aiox <commander-special>   (commander이 exitCode 박은 에러 — 현실에서는 거의 없음)
$ echo $?                → 0 또는 commander가 박은 값

→ aiox는 --version/--help를 미리 capture해 error path 자체를 우회. 
  옵션 A의 "성공 같은 에러" UX는 사실상 0회.
```

### 4.2 결정 2 — surface 영향 비교

```
(i) CLI 추가
PRD (13 → 14) ── parser union 확장 ── help text 갱신 ── invocation case 추가 ── tests
                              │
                              └─ Step 6 범위 ↑

(ii) CLI 미노출 (선택)
PRD (13 그대로) ─ parser 무변경 ─ daemon API만 살아있음 ─ 내부 호출자만 사용
                              │
                              └─ Step 6 범위 = 본 목표 안

(iii) 전체 보류
PRD (13 그대로) ─ daemon API "쓸지 말지"도 미정 ─ open concern 늘어남
```

### 4.3 결정 3 — α/β/γ 응답 모양

```
α (Step 5 현재):
  { ok: true, deliveries: [] }  +  events: [message_created]
  → "보낸 곳 0개인데 성공" (UX 어색)

β-1 (사용자 최종 선택, atomic):
  { ok: false, reason: "no_active_routes" }  +  events: []  +  messages: []  +  deliveries: []
  → "보낸 곳 0개면 실패, 아무 row도 안 남김"

β-2 (audit 보존, walkthrough 중 비교 대안):
  { ok: false, reason: "no_active_routes" }  +  events: [message_created]  +  messages: []  +  deliveries: []
  → "실패지만 시도는 기록"

γ (가장 표현력 높음):
  caller가 allowOrphanMessage: true → α
  그 외 → β-1
  → API/CLI schema 확장 필요. MVP 과함.
```

---

## 5. 결정 묶음 (사용자가 확정한 phase A 결과)

| 결정 | 선택 | 이유 1줄 |
|---|---|---|
| 1. exit code 정책 | **A** (commander 값 통과) | Step 4 결정 #13 보존, Step 6 범위 좁게 유지 |
| 2. send CLI surface | **(ii)** (CLI 미노출, daemon API only) | PRD 13개 surface 보존, 필요 시 후속 추가 |
| 3. empty routes 동작 | **β-1** (atomic reject, event 0개) | local single-user 컨텍스트에서 audit 가치 거의 0, YAGNI |

당초 β-1 vs β-2는 OA2로 phase B에 미룰 예정이었으나, walkthrough 중 사용자가
운영 컨텍스트(local single-user)를 짚어준 덕에 closed.

---

## 6. 배운 점

1. **코덱스 보고는 옵션 명칭/번호로 압축되어 있어 비전공자가 한 번에 못 잡는다.**
   walkthrough 시 (a) 무엇을 묻는 결정인지 1줄로 풀고, (b) 옵션을 코드 스니펫
   또는 비유로 보여주고, (c) 사용자가 직관적으로 어느 쪽으로 기울지 먼저 듣고
   거기서 trade-off를 설명하는 순서가 효과적이었다.
2. **코덱스 추천은 조건부일 수 있다.** 결정 3은 결정 2의 선택에 따라 추천이
   바뀌었다 (β vs deferred). "코덱스가 X 추천했다"를 인용할 때는 어떤 조건에서
   추천했는지 명시해야 사용자가 잘못 해석하지 않는다.
3. **"deferred"는 "현재 동작 유지"와 다르다.** 결정을 미루는 것은 정책으로
   못박지 않는 것이지 현재 구현을 정당화하는 것이 아니다. 사용자 직관이
   "현재 구현이 어색하다"였을 때, 한 칸 더 나가서 contract 레벨에서 닫는 (b)
   선택지를 적극 제안한 게 결정 3에서 가장 큰 진전을 만들었다.
4. **결정 1의 "이론적 어색함 vs 실제 발생 빈도" 구분이 사용자 confirm을 끌어
   냈다.** "어색하긴 한데 실제로는 안 일어남"이라는 정량적 표현이 옵션 A의
   리스크를 받아들이게 만든 결정적 포인트.
5. **운영 컨텍스트 mismatch에 주의.** β-1/β-2 비교 시 Claude가 ATM 비유로
   audit trail의 가치를 정당화했으나, 사용자가 "우리는 local single-user인데?"
   라고 짚어주면서 비유 자체가 mismatch였음이 드러남. agent는 일반 production
   멘탈 모델을 자동 적용하는 경향이 있는데, aiox는 single-user local 컨텍스트
   라 audit/감사/보안 가치 카테고리 대부분이 약화된다. 옵션 trade-off를 정리
   할 때 항상 "이 trade-off가 우리 운영 컨텍스트에서도 유효한가" 를 1차로
   검증해야 한다.
