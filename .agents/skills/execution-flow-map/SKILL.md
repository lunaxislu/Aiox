---
name: execution-flow-map
description:
  특정 operation, 함수, 또는 페이지/화면의 사용자 interaction을 entry point로 삼아 실제
  코드에서 이어지는 실행 순서, 분기, exit, 그리고 그 과정에서 발생하는 상태 변화(setState,
  store setter, cache invalidate 등)를 함께 추적해 사람이 빠르게 읽을 수 있는 ASCII
  Execution Flow Map으로 시각화한다. 단순 함수 call tree가 아니라 실행 흐름과 상태 변화를
  같이 보여주는 것이 목적이다. return/early return, throw/reject, catch, retry,
  cleanup/finally, 각 경로의 최종 종료 지점도 함께 표시한다. 페이지 요청의 경우
  mount/click/change/unmount 같은 개별 interaction 단위, 그리고 timer/polling/
  WebSocket heartbeat 같은 background/periodic flow까지 나누어 추적한다.
  버그 탐지, 코드 품질 평가, 리팩터링 제안, 해결책 제시는 이 skill의 책임이 아니다 — 그런
  요청에는 사용하지 않는다. "이 함수/오퍼레이션 실행 흐름 보여줘", "control flow 그려줘",
  "execution tree 그려줘", "이 페이지 흐름 보여줘", "이거 어떻게 도는지 추적해줘" 요청 시
  사용한다.
---

# Execution Flow Map

## 목적과 금지 사항

순수 구조화 skill이다. 사용자가 지목한 operation/함수/interaction의 실제 실행 흐름을
코드에서 추적해, 실행 순서·분기·exit와 그 과정에서 발생하는 상태 변화를 함께 ASCII
Execution Flow Map으로 보여주는 것이 유일한 책임이다. 단순 함수 call tree가 아니라,
"이 흐름이 실행되는 동안 어떤 상태가 언제 바뀌는가"까지 같은 트리 안에서 보여준다.

하지 않는 것 (다른 모든 지시보다 우선):

- 버그·설계 결함 판정
- 코드 삭제·리팩터링·해결책 제안
- wrapper/callback/중복 validation 등을 code smell로 단정
- 실제 실행 검증 없이 runtime behavior를 재현했다고 표현
- 요청이 자연어로 되어 있다는 이유로 흐름을 화살표 나열식 자연어 설명으로 바꿔 트리
  문법을 생략하는 것

사용자가 흐름 보고 중/후에 "이거 버그야?", "고쳐줘"를 물어도 이 skill의 책임 밖이다. 구조를
보여준 뒤, 그 요청은 별도로 처리해야 한다고 짧게 안내한다.

## 절차

1. **Entry point 확정.** 사용자가 지목한 operation/함수의 실제 정의를 코드에서 찾는다.
   동명 함수가 여럿이거나 대상이 불명확하면 추측하지 말고 사용자에게 확인한다.

   **페이지/화면 흐름을 요청받은 경우**, entry point는 함수 하나가 아니라 그 페이지의
   개별 interaction/lifecycle/background flow다. 코드를 먼저 훑어 발견한 entry point를
   아래 세 범주로 나눠 짧게 나열하고, 사용자가 범위를 특정하지 않았다면 그중 무엇을
   추적할지 확인한다. 스킬이 임의로 "주요한 것"을 골라 나머지를 생략하지 않는다:
   - **User Interaction**: click, submit, change 등 사용자 조작으로 트리거되는 것
   - **Lifecycle**: mount, unmount 등 컴포넌트/페이지 생명주기로 트리거되는 것
   - **Background / Periodic**: `setInterval`/`setTimeout` 반복, WebSocket
     ping/pong·heartbeat, subscription callback, watcher, queue consumer 등 사용자
     조작 없이 코드 스스로 반복·백그라운드로 도는 것

   예: `이 페이지에서 [User Interaction] 삭제 클릭 / 필터 변경, [Lifecycle] mount /
unmount, [Background] 3초 주기 상태 polling, WebSocket heartbeat 가 보입니다.
어느 걸 볼까요, 아니면 전부 볼까요?`

   Background/Periodic entry point는 **같은 파일/컴포넌트를 훑다가 코드에서 직접
   발견되는 것**이라 8번(Reverse Consumer Lookup)과 달리 별도 전역 검색이 필요 없다 —
   기본 entry point 발견 절차에 포함된다.

2. **Execution Mechanism 파악.** "이 기능은 어떤 실행/통신/동기화 방식으로 성립하는가?"를
   실제 코드 순서로 들어가기 전에 먼저 파악한다. 이건 "그 기능 내부에서 실제 코드가 어떤
   순서·분기로 실행되는가"를 보여주는 Execution Flow(3~6번)와는 다른 질문이다.

   **표시 조건.** 다음 중 하나에 해당하면 표시한다:
   - 요청 범위가 페이지/기능/서브시스템처럼 여러 entry point를 아우르는 경우 — 함수
     하나가 아니라 여러 entry point가 있으면 기본으로 보여준다.
   - entry point가 하나뿐이더라도, 그 실행 방식이 **직접 호출되는 일반 함수 호출이
     아니라** 외부 트리거(메시지/이벤트 도착, 타이머, 다른 프로세스로의 위임 등)로
     성립되는 경우 — mechanism이 하나뿐이어도, 그 자체가 이름만 봐서는 바로 안 드러나는
     중요한 실행 방식 정보이므로 보여준다 (예: `queue.on('message', ...)`로 등록되는
     handler, CLI가 로컬에서 끝나지 않고 IPC로 다른 프로세스에 위임하는 경우).

   반대로 **단일 함수를 직접 호출하는 요청이고, 그 실행 방식이 평범한 top-down 함수
   호출과 동일하다면**(예: 로컬 값을 파싱만 하는 단순 함수) 표시하지 않는다 — 코드
   순서를 그대로 반복하는 것 이상의 정보가 없기 때문이다.

   여러 mechanism이 하나의 인과적 파이프라인으로 이어질 때(예: 로컬 준비 → IPC 위임)는
   그 흐름을 짧은 화살표 체인으로 적을 수 있다. 단, **체인에는 mechanism 자체가 전환되는
   경계만 남긴다** — 같은 mechanism(예: 로컬 직접 호출) 안에서 일어나는 준비 단계(argv
   파싱, 설정 파일 읽기, validation 등)는 모두 생략하고, 실행 방식이 실제로 바뀌는
   지점(예: 로컬 실행 → IPC로 전환되어 다른 프로세스에 위임됨)만 남긴다. 그 안의 준비
   단계나 내부 처리 순서는 Execution Flow의 몫이다. 예를 들어 CLI restart라면:

   ```
   [Execution Mechanism]
   daemon restart → CLI command → IPC → daemon process에 실행 위임
   ```

   여기서 `argv 파싱 → config 로컬 준비 → validation`처럼 전부 "로컬 직접 호출"이라는
   같은 mechanism 안의 단계는 나열하지 않는다 — mechanism이 바뀌지 않으므로 새 정보가
   없다. "실제 실행이 어디서 일어나는가"는 Overview의 "어떤 업무 단계로 진행되는가"와는
   다른 질문이라 형태가 비슷해도(둘 다 화살표 체인) 내용이 겹치지 않는다 — 다만 이
   체인이 세부 함수 호출·분기·상태 변경까지 내려가면 그건 Execution Flow의 몫이다.

   표시할 때 각 항목은 **"기능/행동 → mechanism"** 형식으로 적는다. 왼쪽은 단순
   대상/데이터/컴포넌트 이름이 아니라, 코드에서 관찰 가능한 목적을 가진 기능/행동 단위로
   쓴다 (예: `터미널 목록` X, `터미널 목록 렌더링` O · `Worker` X, `Worker 상태 확인`
   O). 이 라벨은 코드에서 실제로 관찰되는 목적(이 데이터를 누가/무엇이 소비하는지, 이
   호출이 실제로 하는 일)에 근거하며, 코드에 없는 비즈니스 의도를 추측해서 붙이지 않는다.
   오른쪽은 그 기능을 성립시키는 mechanism을 필요한 만큼 이어 적되(`+`로 조합, 또는
   "초기: A / 이후: B", 또는 인과적 체인), `useQuery`, `new WebSocket(...)`,
   `EventSource(...)`, `setInterval`, 메시지 큐 consumer 등록처럼 코드에서 실제로
   확인되는 것만 근거로 삼는다. 함수 호출·분기·상태 변경 같은 상세 실행 단계까지
   내려가지 않는다 — 그건 Execution Flow Map과 Expansion의 책임이다. 예:

   ```
   [Execution Mechanism]
   터미널 목록 렌더링    → TanStack Query + HTTP polling (3초 refetch)
   터미널 화면 스트리밍   → WebSocket
   연결 상태 확인        → WebSocket ping/pong (5초 간격)
   터미널 생성/종료 처리  → HTTP mutation
   ```

   entry point가 하나인 경우 예:

   ```
   [Execution Mechanism]
   작업 결과 처리 → Message Queue subscription (message 도착 시 handler 실행)
   ```

   ```
   [Execution Mechanism]
   daemon restart → CLI command → IPC → daemon process에 실행 위임
   ```

3. **High-level 흐름 구성.** entry point 본문을 읽고 호출 순서를 최상위 노드로 나열한다.
   전체 호출 트리를 처음부터 동일 depth로 펼치지 않는다 — 얕은 수준에서 시작한다.

4. **각 노드 shallow inspect.** 각 노드가 호출하는 함수의 실제 정의를 열어 최소한 다음을
   확인한다: 주요 호출 순서, 조건 분기, return/early return, throw/reject, catch, await,
   retry/loop, cleanup/finally, side effect, **상태 변화(setState, store setter,
   query invalidate/cache 조작, ref 쓰기 등)**. 이건 5번의 expand 판단에 쓰는 내부
   조사이며, 확인했다는 이유만으로 매번 출력하지 않는다. 이 단계에서 시간에 걸쳐 유지되는
   상태(7번 대상)를 발견하면 표시해두되, 트리에 반영할지는 7번 기준으로 별도 판단한다.

5. **Expansion — 재귀 적용.**

   ```
   node inspect
     ↓
   expand 필요?
     ├─ no  → collapse (이름만 남김)
     └─ yes → child 표시
                ↓
           각 child에도 동일 규칙 재귀 적용
   ```

   부모 노드 이름 하나로 실제 exit path를 정확히 표현할 수 있으면 collapsed로 둔다. 다음
   중 하나라도 부모 노드에 가려지면 그 노드만 expand한다:
   - 중요한 실행 순서
   - 서로 구분되는 exit path (실패 지점마다 종료 지점이 다름 등)
   - 실패 전에 이미 발생한 side effect
   - 부모 노드만으로는 보이지 않는 의미 있는 state mutation (예: `handleSuccess()`라는
     이름만으로는 안 보이지만, 내부에서 여러 store/cache/local state를 바꾸는 경우 —
     exit path가 하나뿐이어도 이 스킬의 핵심 목적(상태 변화 추적)상 expand할 이유가
     충분하다)

   expand된 노드의 child에도 같은 판단을 다시 적용한다(재귀). 더 펼쳐도 실행 순서 / exit
   path / side effect 경계가 달라지지 않으면 그 지점에서 멈춘다. inspect(읽기)와
   expand(출력)는 다른 동작이다 — 읽었다는 이유만으로 모든 내부 구현을 펼치지 않는다.

   **사용자의 후속 요청으로 특정 노드를 펼치는 경우**("더 보여줘", "내부 펼쳐줘", "이
   부분 자세히" 등), 그 노드를 새로운 entry point처럼 다시 shallow inspect하고 위
   Expansion 규칙을 그 노드 기준으로 재귀 적용한다. 다른 노드는 다시 펼치지 않고, 전체
   Execution Tree를 처음부터 재출력하지도 않는다 — 요청받은 노드의 확장된 부분만 보여준다.
   이렇게 하면 이 스킬이 한 번 트리를 만들고 끝나는 게 아니라, 트리를 기반으로 코드를
   단계적으로 탐색하는 도구로 쓰인다.

   출력 맨 위에 `[Expanded: restartDaemon > startDaemon]`처럼 원래 트리에서 이 노드까지
   내려온 경로를 한 줄로 남긴다. 여러 번 연속으로 파고들어도 지금 보고 있는 부분이 전체
   흐름의 어디에 해당하는지 잃지 않게 하기 위함이다.

   어느 노드를 가리키는지 요청이 애매하면(이름이 같은 노드가 트리 여러 곳에 있거나,
   "여기"가 무엇을 가리키는지 불명확하면) **1번의 entry point 확정 규칙을 그대로
   재사용한다** — 추측해서 아무 노드나 펼치지 않고, 후보를 사용자에게 확인한다.

6. **ASCII Execution Tree로 렌더링.** 아래 "표기"·"Special Flow" 절을 따른다. 각 leaf가
   최종적으로 어디로 종료되는지(SUCCESS/ERROR/구체적 반환·reject 값)를 명시한다.

7. **Overlapping Flow 탐색.** 단일 tree로 표현할 수 없는 흐름을 별도로 찾는다. 어떤 상태가
   시간에 걸쳐 유지되고, 유지되는 동안 다른 entry point가 코드상 그 상태에 접근 가능하다면
   "Overlapping Flow Candidate"로 별도 표시한다. 대상 상태 예: Promise, 메모리 상태,
   DB record, runtime state, resource reference, process state, membership, **zustand/
   Redux/Context API 같은 global store**, 기타 공유 상태. **문법적 형태(callback,
   wrapper, 지연 실행 등) 자체는 후보 조건이 아니다** — 공유 lifetime과 다른 entry point의
   결합이 코드상 확인될 때만 후보로 표시한다. **다른 entry point가 단순히 그 상태를
   read/subscribe하는 것만으로는 후보가 아니다.** 후보 조건은 항상 세 가지가 함께
   확인돼야 한다: 공유되는 mutable lifetime, 그 상태에 접근 가능한 독립적인 entry
   point, 그리고 그 접근이 **해당 mutable state를 변경하거나(write) 실행 순서에 따라
   결과가 달라질 수 있는(경쟁 가능한) 접근**이라는 것. 접근 가능성만으로 실제 동시 실행이나
   race를 확정하지 않는다 — 확인되지 않았다면 반드시 Candidate로만 표현한다.

   **같은 상태를 공유한다는 사실만으로 Overlap Candidate로 표시하지 않는다.** 한
   interaction의 상태 변경이 다른 흐름을 코드상 명시적·결정론적으로 트리거하는 경우
   (예: 삭제 성공 후 `invalidate` 호출이 해당 쿼리를 다시 fetch하게 만드는 것)는 두
   흐름이 시간적으로 우연히 겹치는 게 아니라 하나가 다른 하나를 직접 발생시키는
   인과관계다 — 이건 Overlap이 아니라 forward propagation이며, 그 상태 변경 leaf
   바로 아래 이어지는 흐름으로 표현하면 된다 (예: `['patients'] → invalidate →
refetch`). 반대로 서로 독립적인 entry point가 각자 별도의 트리거(타이머, 클릭 등)로
   코드상 서로를 부르지 않고 같은 상태 lifetime에 접근할 수 있어서, 어느 쪽이 언제
   실행될지 코드가 보장하지 않을 때만 Overlap Candidate 기준을 적용한다 (예: polling
   interval과 사용자 액션이 같은 표시 상태를 공유하는 경우).

   **global store는 접근 지점 검색 범위를 명시한다.** query 캐시나 컴포넌트 state는
   보통 같은 페이지/컴포넌트 안에서 접근 지점이 자연스럽게 드러나지만, zustand/Redux/
   Context 같은 전역 store는 완전히 다른 페이지·컴포넌트에서도 같은 상태를 건드릴 수
   있다. **기본 forward tracing(1~7번)에서는 이런 전역 참조를 찾기 위해 코드베이스
   전체를 검색하지 않는다** — entry point를 추적하다가 우연히 발견한 접근 지점만
   Overlap Candidate로 보고한다. 그 store의 다른 소비자·쓰기 주체까지 실제로 찾아야
   한다면, 그건 8번(Reverse Consumer Lookup)이 명시적으로 요청됐을 때 수행하는 역방향
   검색의 몫이다.

8. **Reverse Consumer Lookup (선택적, 기본 비활성).** 이 단계는 기본 절차에 포함되지
   않는다. forward tracing(1~7번)은 "entry point가 무엇을 호출하는가"를 정의를 열어보며
   앞으로 따라가는 것이고, consumer lookup은 "이 상태를 누가 읽는가"를 거꾸로 찾는 것이라
   방향이 반대다. 사용자가 "이 상태 변경이 어디까지 영향을 주는지도 보여줘" 같이
   **명시적으로 요청했을 때만** 수행한다. 요청받으면 현재 접근 가능한 repository/검색
   범위 안에서 실제로 역방향 검색을 수행한다 — 다만 이 검색도 완전성을 보장하지 않으므로
   (동적 참조, 다른 저장소, lazy import 등은 놓칠 수 있음), 결과에는 항상 "전수 검색
   보장 아님"을 표시한다.

   수행할 때는 6번에서 표시한 상태 변화 노드 아래에, 현재 조사 범위에서 발견한 consumer를
   나열한다. 각 consumer는 다음을 구분한다:
   - **구독(read)만 하는지, 그 상태를 쓰기(write)도 하는지.** 쓰기도 한다면 표시하되,
     그 사실만으로 곧바로 Overlap Candidate로 확정하지 않는다 — 공유 lifetime + 독립
     entry point + 접근 가능성이라는 7번 기준을 그대로 적용해 별도로 판단하고, 해당되면
     "[Overlap Candidate 참고]"로 교차 참조만 남긴다.
   - **"구독"과 "변경 → 후속 동작(rerender 등)"을 구분한다.** selector/의존성 배열 등
     실제 코드에서 재실행 여부가 확인될 때만 "변경 → rerender [코드상 확인]"이라고 적고,
     확인 안 되면 "구독"까지만 적는다 — rerender를 임의로 단정하지 않는다.
   - 확인 가능하면 파일 경로와 역할(Component/Page/Modal/API/Worker/Scheduler/Service
     등)을 함께 적되, 프로젝트 구조나 코드에서 실제로 확인되는 경우에만 라벨을 붙인다.
     이런 라벨은 프론트엔드 전용 모델이 아니라 "상태 변화의 영향 대상(consumer)"이라는
     일반 개념의 구체 사례일 뿐이다 — 백엔드에서는 scheduler/worker/service 등이 같은
     역할을 한다.
   - 결과는 항상 "현재 검색 범위에서 발견한 것만 — 전수 검색 아님"이라고 명시한다.

   Consumer lookup과 Overlap Candidate는 서로 다른 개념이다: consumer lookup은 정상적인
   데이터 propagation 추적이고, Overlap Candidate는 시간적으로 겹칠 수 있는 독립적인
   쓰기 주체에 대한 경고다. 섞어서 표시하지 않는다.

9. **불확실성 표기.** 코드에서 확인하지 못한 경로는 임의로 채우지 않는다. 필요하면 다음
   표기를 쓴다: `[확인 필요]` (코드를 더 봐야 확정 가능), `[코드상 가능]` (구조상 도달
   가능하나 실행으로 확인 안 됨), `[Overlap Candidate]` (7번 기준에 해당하는 후보),
   `[external]` (프로젝트 소유가 아닌 구현), `[IPC]`/`[process]`/`[module]` (경계를
   넘는 호출).

## 출력 원칙

- 설명보다 tree 자체를 우선한다. tree 앞뒤로 긴 설명(문단 단위 해설)을 붙이지 않는다.
- **요청이 자연어로 되어 있어도("사용자 행동 기준으로 설명해줘", "이 페이지 어떻게
  동작해?" 등) 흐름 자체는 반드시 Execution Flow Map(ASCII 트리) 문법으로 표현한다.**
  자연어 설명은 트리를 대체하지 않으며, 필요하면 트리 앞뒤에 한두 문장짜리 보조 설명으로만
  덧붙인다. "새 shell 클릭 → 생성 버튼 비활성화 → ..."처럼 화살표로만 이어지는 자연어
  순서 설명으로 흐름 전체를 대체하지 않는다 — 이러면 분기·exit·상태 변화가 트리 문법
  없이 뭉개진다.
- 1줄 흐름 요약(caption)은 기본으로 붙이지 않는다. 트리 문법(순서/분기/들여쓰기/화살표/
  retry 기호) 자체가 자기완결적이어야 하며, 사용자가 그 문법에 익숙해지는 것을 전제로 한다.
  다음 중 하나라도 해당하면 상세 Execution Tree 앞에 1줄 High-level Overview를 붙인다
  (기준은 fixture를 더 돌려본 뒤 조정 가능):
  - 최상위 주요 실행 단계가 5개 이상
  - expand된 노드가 2개 이상

  예:

  ```
  [Overview]
  restartDaemon
  → config 검증
  → 기존 daemon 종료
  → 새 daemon 시작
  → state 기록
  → SUCCESS
  ```

  Overview는 상세 Tree를 대체하지 않는다. 세부 분기와 예외를 제거하고 operation의 정상
  진행 방향만 빠르게 보여주는 보조 표현이며, 항상 상세 Tree와 함께 제공한다.

- 확인한 사실과 추론을 구분해서 표시한다 (마킹은 9번 규칙을 따름).
- 여러 operation을 한 번에 요청받아도 tree를 먼저 각각 완성하고, 공통 설명은 최소화한다.
- 후속 요청으로 특정 노드를 확장할 때는 그 노드의 확장된 부분만 출력한다. 이미 보여준
  전체 트리를 처음부터 다시 그리지 않는다. 대신 `[Expanded: A > B]` 형식으로 원래
  트리에서 이 노드까지의 경로를 한 줄 남긴다.

## Special Flow

- **상태 변화는 발생하는 그 분기 안에, 발생 시점 그대로 표시한다.** 별도 요약 표나
  인덱스로 분리하지 않는다. `setState`, store setter(zustand/redux 등), query
  invalidate/cache 조작, ref 쓰기 등은 그 side effect가 실제로 일어나는 leaf에
  "대상 + 결과 + 다음 단계" 형식으로 적는다. 예:
  ```
  TanStack Query ['patients'] → invalidate → 환자 목록 refetch
  Zustand patientStore → selectedPatient = null
  Local State → deleteModalOpen = false
  ```
- **형제 분기 간 상태 변화 차이가 흐름 이해에 의미가 있을 때만 "상태 변경 없음"을
  명시한다.** 모든 분기에 강제로 붙이지 않는다 — 형제가 여럿이고 그중 하나만 상태를
  바꾼다면, 바뀌지 않는 나머지 전부에 "상태 변경 없음"을 반복해서 트리를 시끄럽게
  만들지 않는다. 성공/실패처럼 그 차이 자체가 핵심 정보인 경우(예: 실패 시 cache
  변경 없음, 성공 시 cache invalidate)에는 적극적으로 명시한다.
- **상태 변화 대상이 7번(Overlapping Flow) 기준에 해당하면 그 이름을 그대로 재사용해
  Overlap Candidate에서 참조한다.** 트리 안에서 이미 상태 이름(예: `patientStore`,
  `['patients']`)이 명시돼 있으므로, Overlap Candidate 섹션에서 별도 설명 없이 그
  이름으로 바로 연결한다.
- **Retry/loop는 `↻`로 표현한다.** `↻` 옆에는 항상 반복 조건을 명시한다 — **유한
  반복**(같은 operation 안에서 끝나는 재시도)이면 횟수(예: `↻ attempt (최대 3회)`),
  **무한/조건부 반복**(아래 Background Flow처럼 사용자 조작과 무관하게 도는 것)이면
  종료 조건(예: `↻ polling (연결 종료 시 중단)`)을 명시해 둘을 구분한다.
- **Background / Periodic Flow는 별도 entry point로, 별도 트리로 그린다.** timer,
  interval, WebSocket ping/pong·heartbeat, subscription callback, watcher, queue
  consumer 등 사용자 조작 없이 코드 스스로 반복 실행되는 흐름은 `[Background Flow]`로
  표시하고 독립된 트리로 그린다. 시작 트리거(예: mount, 연결 open) → `↻` 루프 본문 →
  종료 조건 순서로 구성한다. **이런 흐름은 SUCCESS로 끝나지 않을 수 있다** — 루프가
  무한히 돌다가 unmount/연결 종료 같은 외부 조건에서 멈추는 게 정상이므로, 억지로
  SUCCESS/ERROR로 닫지 않고 실제 종료 조건을 그대로 적는다. 다른 흐름과 상태를
  공유한다면 이름을 그대로 재사용해 Overlap Candidate에서 연결한다. 예:
  ```
  [Background Flow] terminal status polling
  페이지 활성
  │
  └─ ↻ polling (페이지 unmount 시 중단, 3초 간격)
     ├─ terminal/agent/알림 목록 조회
     ├─ 응답 최신성 판정
     │  ├─ stale → 버림 → 상태 변경 없음
     │  └─ current → 목록/실행 상태 갱신
     └─ 다음 tick까지 대기 → ↻ polling
  ```
- **외부 라이브러리는 `[external]` 경계에서 중단한다.** 프로젝트가 소유하지 않는 구현
  (표준 라이브러리, 서드파티 패키지, 사내 공유 라이브러리라도 이 저장소 밖에 있으면 동일)은
  내부까지 추적하지 않고, 현재 코드가 그 결과(반환값/예외)를 어떻게 처리하는지만 추적한다.
  **프레임워크/런타임 내부 동작(예: React의 scheduler, reconciliation, effect 재실행
  스케줄링 방식)도 같은 기준으로 `[external]`이다.** 다만 프로젝트 코드가 `useEffect`
  콜백, query invalidation, state 업데이트 등을 통해 실제로 무엇을 실행시키는지는
  계속 추적한다 — 멈추는 건 프레임워크 내부 구현이지, 그것이 트리거하는 프로젝트 코드가
  아니다.
- **IPC/process/module 경계는 표시하되 operation 추적은 계속한다.** 경계를 만났다는
  이유만으로 멈추지 않는다. 경계 너머의 실제 구현을 이 저장소에서 확인할 수 있으면 계속
  펼치고, 확인할 수 없을 때만 그 지점에서 `[확인 필요]`로 멈춘다.
- **callback/event handler/wrapper/지연 바인딩/delayed invocation은 별도 문제 유형으로
  취급하지 않는다.** 등록과 실행이 코드상 분리되어 있다는 사실 자체는 그냥 지연된 control
  flow로 순차 표기한다. 7번 기준(공유 lifetime + 다른 entry point 결합)이 실제로 확인될
  때만 Overlap Candidate로 올린다.

## 표기

```
operationName
│
├─ stepA
│  └─ 실패 → ERROR
│
├─ stepB
│  ├─ 실패 → ERROR
│  └─ 성공 → stepC로 진행
│
├─ stepC
│
├─ stepD
│  ├─ substepD1
│  ├─ substepD2
│  └─ 실패 → cleanup → ERROR
│
└─ SUCCESS
```

- `├─` / `└─`: 형제 노드. 코드상 순차 호출이든 조건 분기든 트리 형태는 같다 — 어느 쪽인지는
  라벨(`실패 →`, `성공`)로 구분한다.
- `→`: 상태 전이·최종 도착 지점. 예: `실패 → ERROR`, `실패 → cleanup → ERROR`.
- `↻`: retry/loop. 예: `↻ attempt (최대 3회)`.
- **operation을 종료하는 terminal leaf**는 `SUCCESS`, `ERROR`, 또는 코드에서 확인한
  구체적 반환/reject 값으로 끝난다. **operation을 종료하지 않는 다른 leaf**(예:
  `conn.write 단계로 진행`처럼 다음 단계로 이어지는 경우)는 그 다음 단계의 실제 이름을
  명시한다 — 모든 leaf가 SUCCESS/ERROR로 끝나야 하는 건 아니다.
- collapsed 노드는 이름만 남긴다. expand된 노드는 내부 분기까지 같은 문법으로 한 단계 더
  들여써서 보여주며, 그 child도 5번 규칙에 따라 재귀적으로 expand/collapse 판단한다.
- **"성공"/"실패" 라벨은 그 줄만 보고도 무엇의 성공/실패인지 알 수 있어야 한다.** 바로
  위 부모 노드가 무엇인지 다시 찾아 올라가야 의미가 파악되면 안 된다. 필요하면 `conn.open()
실패 →` 처럼 주어를 라벨에 포함시킨다.
- **"계속"·"이어짐" 같은 placeholder를 쓰지 않는다.** 서로 다른 분기가 같은 다음 단계로
  합류하는 경우, 그 다음 단계의 실제 이름을 각 분기의 leaf에 그대로 반복해서 적는다. 같은
  이름이 두 번 나오는 것은 허용된다 — 목적은 중복을 줄이는 게 아니라 각 줄이 그 줄만으로
  자기완결적으로 읽히게 하는 것이다.
- **분기/leaf 라벨은 "대상 + 결과 + 다음 단계"를 함께 적는다.** `성공`, `실패`, `계속`
  같은 단독 단어는 쓰지 않는다. 예: `실패 → RetryableError('connection not open') →
retry 처리로 이동` 처럼, 무엇이 어떻게 됐고 그 다음에 어디로 가는지가 그 한 줄 안에서
  끝까지 확인돼야 한다. 같은 종류의 결과(예: 여러 지점에서 발생하는 RetryableError)가
  같은 다음 단계로 간다면, 등장하는 모든 지점에서 그 다음 단계를 동일한 표현으로 반복한다
  — 한 곳에서만 적고 다른 곳에서 생략하면 안 된다.
- **조건 분기는 항상 명시적으로 그린다.** 조건을 자연어 문장으로 접어서 노드 이름 안에
  녹이지 않는다 (예: "conn이 열려있지 않으면 conn.open() 시도" 같은 서술형 노드名은 쓰지
  않는다). `true`/`false`, 또는 실제 조건식을 형제 노드로 분리해서 트리 문법 안에서
  표현한다 — 특정 분기에서만 발생하는 side effect(예: 이미 열려 있어 `open()`을 호출하지
  않는지, 호출하는지)가 문장으로 접히면서 사라지지 않게 한다. 값 하나를 보고 여러 갈래로
  갈라지는 판정(예: status 값 종류)도 조건 분기와 같은 문법으로, 판정 노드 하나 아래
  형제 분기로 그린다 — 어떤 판정은 노드로 그리고 어떤 판정은 평평한 형제 줄로 나열하는
  식으로 트리 문법을 혼용하지 않는다.
- **분기에서 operation이 종료되면 그 분기 안에서 최종 exit을 닫는다.** 여러 분기 중
  일부가 이미 자기 안에서 ERROR/SUCCESS로 끝났다면, 그 분기들 바깥에 공통 exit(예:
  형제 목록의 마지막 줄에 놓인 별도 `SUCCESS`)을 두지 않는다. 분기 밖의 공통 exit은
  "이미 종료된 다른 분기도 여기로 이어지나?"라는 불필요한 모호함을 만든다. 각 분기가
  스스로 종료되는 지점에서 그 분기의 마지막 자식으로 exit을 적는다.

  나쁜 예 (실패 분기가 이미 ERROR로 끝났는데 바깥에 공통 SUCCESS가 있어 관계가 모호함):

  ```
  deletePatient(id)
  ├─ 실패
  │  └─ error 상태 설정 → ERROR
  └─ 성공
     ├─ Query invalidate
     └─ Zustand clear
  └─ SUCCESS
  ```

  좋은 예 (성공 분기 자신이 SUCCESS로 끝남):

  ```
  deletePatient(id)
  ├─ 실패
  │  └─ error 상태 설정 → ERROR
  │
  └─ 성공
     ├─ Query ['patients'] → invalidate → refetch
     ├─ patientStore → selectedPatient = null
     ├─ deleteModalOpen = false
     └─ SUCCESS
  ```

Expand 예 — `terminate` 노드 이름만으로는 in-flight cleanup 존재 여부에 따라 서로 다른
exit path로 가는 사실이 가려지므로 expand한다:

```
terminate
├─ in-flight cleanup 존재 = true
│  └─ 기존 cleanup Promise 반환 → 해당 Promise 결과로 종료
│
└─ in-flight cleanup 존재 = false
   └─ owner terminate
      ├─ owner terminate 성공 → SUCCESS
      └─ owner terminate 실패 → ERROR
```

Retry 예:

```
send
├─ attempt
│  ├─ attempt 성공 → SUCCESS
│  └─ attempt 실패
│      ├─ retry 가능 → ↻ attempt (최대 3회)
│      └─ retry 소진 → ERROR
```

종합 예 — 여러 판정 지점(조건 분기 + 값 판정)이 섞여 있을 때, 모두 같은 문법(판정
노드 → 형제 분기)으로 통일하고, 각 leaf는 대상+결과+다음 단계를 함께 적는다. 같은
종류의 결과(RetryableError)가 서로 다른 지점에서 발생해도 다음 단계 표현은 동일하게
반복한다:

```
sendWithRetry
│
├─ ↻ attempt (최대 3회)
│  │
│  ├─ getConnection(payload.target)
│  │  └─ [확인 필요] globalConnectionPool 정의 확인 불가
│  │
│  ├─ conn.isOpen?
│  │  ├─ true
│  │  │  └─ conn.write 단계로 진행
│  │  │
│  │  └─ false
│  │     └─ conn.open()
│  │        ├─ 성공 → conn.write 단계로 진행
│  │        └─ 실패 → RetryableError('connection not open') → retry 처리로 이동
│  │
│  ├─ conn.write(payload.data)
│  │  └─ ack 반환
│  │
│  └─ ack.status 판정
│     ├─ 'rejected'
│     │  └─ FatalError → 즉시 throw → ERROR
│     │
│     ├─ 'timeout'
│     │  └─ RetryableError('ack timeout') → retry 처리로 이동
│     │
│     └─ 그 외
│        └─ return ack → SUCCESS
│
└─ retry 처리 (RetryableError 발생 시)
   ├─ retry 남음 → sleep(backoff) → ↻ attempt
   └─ retry 소진 → throw Error(...) → ERROR
```

읽는 규칙은 다음 네 가지로 고정된다:

```
위 → 아래     실행 순서
├─ / └─       분기
들여쓰기       어느 동작의 결과인지
→             다음 흐름 / 최종 도착 지점
↻             반복 / retry
```

상태 변화 포함 예 — 성공/실패 분기에 따라 상태 변화의 유무·종류가 다르다는 것 자체가
드러나야 한다:

```
[Event] 환자 삭제 버튼 클릭
│
├─ selectedPatientId 확인
│  ├─ 없음 → 종료
│  └─ 있음 → deletePatient(id) 호출
│
└─ deletePatient(id)
   ├─ 실패
   │  └─ error 상태 설정 → ERROR
   │
   └─ 성공
      ├─ TanStack Query ['patients'] → invalidate → 환자 목록 refetch
      ├─ Zustand patientStore → selectedPatient = null
      ├─ Local State → deleteModalOpen = false
      └─ SUCCESS
```

`patientStore`가 이 흐름과 무관한 다른 독립적인 entry point(예: Header의 로그아웃처럼
delete 흐름이 호출하지 않는 곳)에서도 쓰기 접근된다면, 그 이름을 그대로 재사용해 아래
Overlap Candidate에서 연결한다. (`['patients']`의 invalidate → refetch는 이 흐름이
직접 발생시키는 인과관계이므로 Overlap 대상이 아니다 — 위 규칙 참고.)

Reverse Consumer Lookup 예 — 기본 출력에는 없고, 사용자가 영향 범위를 요청했을 때만
상태 변화 노드 아래에 덧붙인다. read/write 구분과 rerender 확인 여부를 명시한다:

```
Zustand patientStore.selectedPatient = null
│
├─ Consumer: PatientDetail
│  ├─ File: pages/patient/PatientDetailPage.tsx
│  ├─ read: selectedPatient
│  └─ 변경 → rerender [코드상 확인]
│
└─ Consumer: PatientActions
   ├─ File: components/patient/PatientActions.tsx
   ├─ read: selectedPatient
   ├─ write: setSelectedPatient(...)  [Overlap Candidate 참고]
   └─ selectedPatient 구독 (rerender 여부 [확인 필요])

(현재 검색 범위에서 발견한 consumer만 — 전수 검색 아님)
```

IPC 경계 예 — 경계를 표시하되 구현이 저장소에 있으면 계속 추적한다:

```
restart
├─ CLI validation
├─ [IPC] daemon.stop
│   └─ Daemon process
│       └─ stopDaemon()
│           └─ ... (계속 추적)
└─ [IPC] daemon.start [확인 필요]  ← daemon 프로세스 구현이 이 저장소에 없음
```

Overlapping Flow 예 — 단일 tree로 표현 안 되는 경우 이렇게 별도로 그린다:

```
Flow A: cleanup
start
  ↓
Promise 저장
  ↓
await ───────────────→ complete
        ↑
        │
Flow B  │
force terminate
```

[Overlap Candidate]: `Promise`가 유지되는 동안 `force terminate` entry point가 코드상
같은 상태에 접근 가능함. 실제 동시 실행 여부는 [확인 필요].
