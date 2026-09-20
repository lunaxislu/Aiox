# AIOX Collaboration Contract

Status: Committed target

이 문서는 공통 HTTP MCP의 send/agents_list, 신원·routing·메시지 관측과 표시 의미를
소유한다. Network 구성은 [[docs/specs/aiox-host]], 실행 상태는 [[docs/specs/aiox-runtime]],
사용자 알림은 [[docs/specs/aiox-configuration-web]]과 연결된다.

## 공통 MCP와 실행 신원

Claude와 Codex는 공통 HTTP MCP의 `send`, `agents_list`를 사용한다. schema·handler·
통신 지침의 원본은 공통화하고 vendor 입력 framing은 adapter에 둔다. vendor마다 별도의 AIOX
stdio MCP child나 /send listener를 만들지 않는다.

```text
Authorization: Bearer <runtime-token> → 요청 Runtime 신원
/mcp/<networkId>                      → 통신 공간 선택
현재 membership + effective route     → 전송 권한
```

- 실행마다 별도 MCP credential을 발급해 child env의 `AIOX_MCP_TOKEN`으로 전달한다.
  token을 URL·CLI argument·로그·event·오류에 넣지 않는다.
- daemon은 credential에서 source Runtime을 도출한다. 도구 인자의 source 이름/Host ID/token이
  인증을 대신하거나 다른 source로 바꾸게 하지 않는다.
- 같은 Network의 Agent는 같은 MCP URL과 각자의 token을 사용한다. Network URL은 권한 자체가
  아니며 매 호출마다 token 유효성, 현재 소속과 route를 검사한다.
- Runtime 종료·시작 실패·협업 등록 유효성 상실 때 token과 peer binding을 정리한다. revoke 뒤 기존 MCP session으로
  호출해도 허용하지 않으며 새 실행은 새 token을 사용한다.
- Claude inbox token과 AIOX MCP token은 별개다. inbox display label도 인증 신원이 아니다.
- 실행 시 선택한 단일 Network의 설정을 주입한다. route 변경은 같은 URL에서 다음 호출에
  적용하며 MCP를 다시 주입하지 않는다. 실행 중 소속 변경·다중 Network entry는 제외한다.

Claude는 실행 시 MCP JSON 문자열을 추가하며 사전 영구 등록이나 `--strict-mcp-config`를
요구하지 않는다. 사용자 hook·MCP·native 지침을 통째로 대체하지 않는다. Codex는 App Server
실행 config와 child env를 사용한다. 정확한 실행 인자와 hidden inbox wire는 architecture의
vendor binding 책임이다.

## Send·discovery·수신 표시와 자동 알림

공통 HTTP MCP 도구는 `agents_list`와 `send`로 분리한다. `reply`, `replyExpected`, 재전송 도구를 제공하지 않으며 legacy envelope의 type/intent를 필수 입력으로 가져오지 않는다.

- `agents_list()`는 현재 발신자가 outbound route로 보낼 수 있는 실행만 배열로 반환한다. 각 항목은 `name`, `role`, `description`, `status`, `status_reason`이며 별도 `agentId` 필드를 노출하지 않는다. 이름 미지정 시 Runtime ID 값이 `name`이다. role·description 미지정은 목록에서 null, 수신 표시에서는 생략한다.
- `send({ targets: [nameOrId, ...], content })`는 하나 또는 여러 Agent 이름·Runtime ID와 본문을 받는다. 이름을 지정한 Agent도 이름과 실제 Runtime ID 어느 쪽으로든 지정할 수 있다. 허용된 모든 Agent에게 자동 fan-out하지 않는다.
- daemon은 인증된 실행에서 source와 Network 범위를 결정하고 전송 시점에 각 대상을 해당 Network의 현재 참여 실행에서 ID 우선, 이름 순으로 해석한 뒤 membership·effective route를 검증한다. 오래된 목록은 권한이 아니며 대상별 결과는 `name`, `accepted`, 선택적 `error`로 반환한다. 결과의 `name`은 입력한 이름 또는 ID 문자열이며, 동일 입력 문자열은 한 번만 반환한다. 같은 실행의 이름과 ID를 함께 입력하면 각각에 같은 결과를 반환하되 실제 전달·Delivery 저장은 한 번만 한다. 일부 실패를 전체 성공으로 표시하지 않는다.
- A→B만 허용되면 A의 목록에는 B가 보이고 B의 목록에는 A가 보이지 않는다. 양방향·전이적 route를 추론하지 않는다. 대화상 회신도 `send`를 사용하며 역방향 route가 필요하다.
- 수신 정보는 발신자의 name·role·description, daemon 접수 시각 `createdAt`, 본문 `content`다. daemon이 인증된 발신자 메타데이터를 채운다. deliveryId 등을 모델의 회신 도구 인자로 노출할 필요는 없지만 내부 메시지·대상별 delivery·vendor prompt/turn 상관관계는 유지한다.

공통 MCP 설명과 주입 지침은 `agents_list`의 `name`을 `send.targets`에 그대로 사용하도록
안내하며, 알고 있는 Runtime ID도 허용한다고 명시한다. 목록 조회 뒤 B가 종료하고 새 B가 참여하면 `targets: ["B"]` 전송은 그 시점의 새 B를
대상으로 한다. 종료된 B의 ID를 지정하면 새 B로 바꾸지 않고 대상 부재 안내로 거절한다. 내부 메시지·처리 결과·알림은 해석한 Runtime ID에 귀속하며 이름 재사용으로
이전 요청의 수신자나 알림 대상을 바꾸지 않는다.

현재 Network에서 해석되지 않는 이름·ID는 대상별 `accepted: false`와 `error` 안내 문장으로 거절한다.
안내는 `agents_list`로 현재 대상을 다시 확인하고 이미 수락된 대상에는 재전송하지 않도록 한다.
daemon은 자동 재전송하지 않으며, 해석되지 않는 대상의 Runtime에 귀속되는
Delivery 이력을 만들지 않는다. 모든 대상이 해석되지 않으면 응답의 `messageId`는 호출 결과를
구분하는 값이며 저장된 메시지 존재를 뜻하지 않는다. 해석된 대상의 전달 시도·결과는 Runtime ID로 저장한다.

Web은 Network 전체 Agent·route를 표시한다. 일반 CLI 조회·필터와 MCP discovery의 범위는 구분한다.

단방향 대상에게는 원문 뒤에 줄바꿈 두 번과 아래 영어 안내를 붙인다. 원문 저장값과 daemon이 생성한 안내는 구분한다.

```text
[AIOX Notice] No outbound route to the sender is available. Carry out the request. AIOX will automatically notify the sender when processing completes or fails. Do not attempt to send a reply or acknowledgment.
```

대상별로 **전송 시점의 역방향 route 유무**를 요청에 보존하여 이후 route 변경과 무관하게 자동 알림 정책을 적용한다.

| 전송 시점 관계 | completed | failed | interrupted |
| --- | --- | --- | --- |
| A→B 단방향 | daemon이 A에 통지 | daemon이 A에 통지 | 자동 통지 없음 |
| A↔B 양방향 | 자동 통지 없음 | daemon이 A에 통지 | 자동 통지 없음 |

A가 B·C에게 보낸 뒤 C만 실패하면 A에게만 알린다. full mesh라도 B에게 실패를 전파하지 않는다. B가 별도로 C에게 보낸 요청의 발신자는 B다. daemon 알림은 역방향 Agent route를 부여하지 않으며 vendor의 진짜 system role과 동일하다는 뜻도 아니다. daemon 알림 자체의 처리 종료로 다시 완료 알림을 생성하지 않는다.

A가 B에게 보낸 X를 B가 처리하는 동안 A가 종료돼도 X의 결과 연결을 유지한다. 이후 B의 처리
결과를 저장하되 알림 대상은 원 발신 Runtime ID로 한정한다. 같은 이름·역할로 새로 실행한 A′에게
X의 알림을 넘기지 않는다. 원 발신자의 실행 종료가 수신 요청의 이력 삭제나 재전송 근거가 되지 않는다.

알림은 Web뿐 아니라 발신 Agent의 vendor 입력 경로로 전달한다. Codex는 `toolOutput` 본문과 `additionalContext` 메타데이터, Claude는 native inbox peer message를 사용한다. 정확한 wire·표시·busy 입력 연결은 vendor 통합에서 검증한다.

Codex 조합의 성공은 사용자 전달 실험 근거이며 신규 AIOX 통합 완료와 구분한다. E2E 실패 시 원인을 확인한 뒤 IDE delimiter/Cyan 또는 toolOutput 단독을 검토한다. 사전 fallback으로 구현하지 않는다. 정확한 경계는 [[docs/architecture/aiox-vendor-bindings]]를 따른다.

## 관측은 단일 필수 순서가 아니다

| 관측 | 뜻 | 뜻하지 않는 것 |
| --- | --- | --- |
| 프로세스 생성·종료 | Runtime 실행 수명 | 특정 메시지 처리 성공 |
| binding 연결 준비 | 입력 경로 준비 | 모델이 본문을 읽음 |
| socket write/입력 수락 | 해당 단계가 입력을 받음 | 산출물·업무 성공 |
| 연결된 prompt/turn 종료 | 응답 종료 | 프로세스 종료 또는 작업 검증 완료 |
| Agent의 send 응답 | 대화상 회신 | 원 요청 완료 또는 이후 작업 종료 |

현재 상태와 이유는 [[docs/specs/aiox-runtime]]의 공통 `status/status_reason` 계약을 따른다. `agents_list()`는 현재 Network·outbound route·인증 범위 안의 준비 중 Agent도 표시한다. 목록 포함은 전송 준비 완료를 뜻하지 않으며 준비 중 send는 `not_available: Agent is preparing/switching session. Please try again in a few moments.`로 거절한다. 이미 주입한 대기 메시지를 취소하거나 회수하지 않는다. 종료·등록 해제된 Agent는 제외하고 Host stopped 항목을 Agent로 추가하지 않는다. Web도 같은 상태와 이유를 표시한다.

```text
B가 요청 X 처리 → X completed, B는 실제 활동에 따라 idle 또는 working
B가 요청 Y 처리 → X completed 유지, Y 진행 중, B working
```

completed/failed/interrupted는 개별 AIOX 입력의 처리 결과이고 Agent의 현재 상태와 별개다. completed는 연결된 응답 처리가 끝났다는 뜻이며 산출물의 정확성·업무 성공 보장이 아니다. 한 요청이 실패해도 실행이 살아 다른 입력을 처리한다면 현재 상태는 실제 활동을 따른다.

Claude는 인증된 세 hooks와 직접 감시로 읽은 transcript의 session/prompt 및 parent chain을, Codex는 Runtime·threadId·turnId와 연결된 `turn/completed`의 completed/failed/interrupted 결과를 사용한다. 입력 주입 성공만으로 처리 완료를 선언하지 않는다. busy 입력이 기존 turn에 합쳐질 수 있으므로 메시지 하나가 항상 새 turn 하나라는 가정을 하지 않는다. 임의 Stop 하나로 모든 요청을 완료하지 않는다.

세션 만료·인증/API 오류·연결 손실 등이 실제 요청을 실패시킨 경우 failed에 포함한다. 일시 재시도·일반 도구 오류를 무조건 요청 또는 Runtime 실패로 승격하지 않는다. interrupted는 Web에 기록하되 발신 Agent 자동 통지는 하지 않으며 모든 중단의 원인을 사용자로 단정하지 않는다.

Codex의 정상 입력 응답은 runtime 입력 수락 근거다. App Server의 진행·완료·오류·사용자
요청을 관측하고 활성 thread는 연결된 TUI의 성공한 start/resume/fork 결과에 맞춰 binding한다.
Claude는 hooks를 daemon으로 전달하며 프로세스/연결 손실은 별도 실행 관측도 사용한다.
Claude의 hook이 누락되는 도구 거부·중단은 세션 기록에서 해당 요청과 중단의 연결을 확인한
경우 interrupted로 보완한다. 기록이 없거나 귀속이 불확실하면 종료를 추측하지 않는다.
관측 구성과 검증 한계는 [[docs/architecture/aiox-vendor-bindings]]를 따른다.
외부 제어 연결 손실은 협업 등록을 끝낸다. AIOX 요청의 연결·관측 실패와 vendor 프로세스
종료·업무 결과를 구분한다. 연결 손실 원인은 요청 결과에 남기며 vendor가 계속 수행하는
업무의 성공·실패를 확정하지 않는다. 실행 수명은 runtime 계약을 따른다.

Claude session 전환은 옛 관측 instance의 수명을 끝낸다. 진행 중인 읽기는 이미 확보한 범위의
완성된 행을 처리한 뒤 끝내며, 읽지 않는 instance는 즉시 삭제한다. 이후 기록을 기다리지 않는다.
실제 입력 행으로 옛 session에 연결된 남은 AIOX 요청만 interrupted로 정산하며, 이미 확정한 outcome과 저장 재시도는 보존한다.
아직 입력 행이 관측되지 않은 요청은 전환만으로 정산하지 않고 실제 처리 session의 입력에 연결한다.
resume은 새 관측 instance로 연결하고 기존 대화 기록은 다시 정산하지 않는다. [Status: Current]

Claude는 인증된 session/절대 transcript 경로에서 실제 입력의 session/promptId와
uuid/parentUuid 인과관계를 확인한다. Transcript peer 입력은 발신 frame의 escape된 이름과
전체 본문이 origin.name/body와 정확히 일치할 때 AIOX delivery에 연결하며, UUID 표식 포함만으로
연결하지 않는다. 먼저 온 StopFailure는 해당 입력과 연결할 때까지 보관한다. session 관측·삭제의 구현 책임은 bindings가 소유한다.
정상 종료는 같은 요청의 현재 chain에 있는
정상 assistant end_turn과 완성된 turn_duration을 함께 요구하며 해당 경로에 API 오류·중단
근거가 없어야 한다. 시작 시 Stop 설정이나 summary 존재 여부는 종료 조건이 아니다.
Stop의 후속 작업과 결과 취합 뒤의 최종 기록까지 같은 lifecycle이며 continue:false/stopReason도
이 기준으로 turn 종료를 처리한다. Stop, end_turn, duration, hasOutput 중 하나만으로 완료를
선언하지 않으며 과거 branch의 기록을 사용하지 않는다. 의미적 업무 성공이나 명시적 async
background hook 전체 종료를 보장하지 않는다. AIOX는 Stop hook을 주입하지 않는다.

종료는 작업 종류가 아니라 해당 요청의 명시적 종료 근거로 판정한다. 중단은 attachment를
포함한 현재 parent chain의 vendor 중단 선언으로 interrupted를 확정하며, 도구 거부 결과만으로
요청을 끝내지 않는다. 사용자 중단의 표시 문구는 `Interrupted by user`이며 vendor가 shutdown을
명시한 중단은 `Interrupted`로 표시한다. API 오류 transcript가
먼저 오면 completed를 금지하고 같은 요청의 StopFailure로 failed와 실제 이유를 확정한다.
도착하지 않은 hook을 처리한 것으로 간주하지 않는다.

adapter의 `controls.settle` resolve는 daemon이 최초 outcome과 저장 재시도 책임을 인수했다는
ack다. DB 저장 완료와 다르다. 인수 전 reject는 adapter가 최초 outcome을 보존하고, 인수 후
DB 실패는 daemon이 소유한다. 종료 cleanup은 최초 결과를 바꾸지 않는다.

**근거 한계:** macOS Claude 2.1.274의 격리 TUI·로컬 API 대역으로 production reporter,
사용자 Stop 없음/단순 출력/block/additionalContext, cwd 변경·clear·resume 및 사용자 watchPaths
공존을 검증했다. 별도 TUI에서는 동작 중인 감시를 전제로 /cd의 동일 파일시스템 이동과
FileChanged unlink→새 watchPaths→새 transcript 수신을 확인했다. 변경된 binding의 이동·재시도는
회귀 테스트로 검증했으며 전체 daemon을 포함한 relocation 실측은 아니다. 이를 native Windows/Linux,
copy 이동, 실제 quota 발생이나 모든 busy 입력 순서로 확대하지 않는다. 상세 근거는 Stage3 W3 로그에 남긴다. raw inbox와
transcript 레코드는 vendor 구현 의존이며 안정된 범용 공식 API로 승격하지 않는다.

## 실패·대기와 재전송 제외

동일 메시지를 vendor 입력으로 자동 재시도·재주입하거나 수동 재전송하는 API/tool/handler를 제공하지 않는다.
`aiox_retransmit_unconfirmed_delivery` 및 그 사용 지침은 제거 대상이다. 공통 협업 지침과
Host/Agent instruction 주입은 유지한다.

최초 한 번도 전송하지 않은 메시지의 queue는 재전송과 다르므로 대기열 자체를 제거하는
결정이 아니다. 그 queue의 용량·기한·최초 전달 조건은 별도 구현 계약이며 과거 retry 간격을
새 기본값으로 가져오지 않는다. 사용자의 새 send는 새 메시지다. DB에 저장했다고 재전송·replay가
허용되는 것은 아니다. 관측한 결과와 필수 알림의 DB 저장 실패를 다시 저장하는 것은
입력 재전송과 별개이며 저장·복구 경계는 [[docs/architecture/aiox-storage-terminal]]을 따른다.

거절·실패·확인 불가를 실제 증거에 맞게 표시하고 늦게 도착한 관측도 원 입력에 연결한다.
확인 불가를 성공으로 숨기거나 모델 ACK·재전송으로 해결하지 않는다. Runtime 리밋이나 사용자
입력 대기는 Web에 알릴 수 있지만 연결 근거 없이 특정 Delivery 실패로 기록하지 않는다.

Sources:

- `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §§5–18 — 공통 MCP, inbox/Relay,
  입력 관측·표시 실험과 재전송 제거 결정의 provenance.
- `logs/2026-09-07-AIOX-TUI-Stage2-Daemon-MCP-Terminal.md` — 대상 지정 send·상태·완료/실패 알림과 W2의 원 발신자 종료 후 결과 보존 결정.
