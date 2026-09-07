# AIOX Collaboration Contract

Status: Committed target

이 문서는 공통 HTTP MCP의 send/reply/agents_list, 신원·routing·메시지 관측과 표시 의미를
소유한다. Network 구성은 [[docs/specs/aiox-host]], 실행 상태는 [[docs/specs/aiox-runtime]],
사용자 알림은 [[docs/specs/aiox-configuration-web]]과 연결된다.

## 공통 MCP와 실행 신원

Claude와 Codex는 공통 HTTP MCP의 `send`, `reply`, `agents_list`를 사용한다. schema·handler·
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
- Runtime 종료·시작 실패 때 token과 peer binding을 정리한다. revoke 뒤 기존 MCP session으로
  호출해도 허용하지 않으며 새 실행은 새 token을 사용한다.
- Claude inbox token과 AIOX MCP token은 별개다. inbox display label도 인증 신원이 아니다.
- 실행 시 선택한 단일 Network의 설정을 주입한다. route 변경은 같은 URL에서 다음 호출에
  적용하며 MCP를 다시 주입하지 않는다. 실행 중 소속 변경·다중 Network entry는 제외한다.

Claude는 실행 시 MCP JSON 문자열을 추가하며 사전 영구 등록이나 `--strict-mcp-config`를
요구하지 않는다. 사용자 hook·MCP·native 지침을 통째로 대체하지 않는다. Codex는 App Server
실행 config와 child env를 사용한다. 정확한 실행 인자와 hidden inbox wire는 architecture의
vendor binding 책임이다.

## Send와 discovery

Daemon은 실제 send 시점의 인증·소속·effective directed route로 대상을 판정한다. 과거
`agents_list` 결과나 프롬프트에 적힌 이름은 현재 전송 권한이 아니다. 같은 Network라도 outbound
허용이 없으면 send를 거절한다. `A→B`가 있다고 `B→A` 또는 전이적 route를 만들지 않는다.

일반 send는 현재 outbound route가 허용하는 대상에 fan-out한다. `A→B`, `A→C`이면
A의 send는 B와 C에 전달한다. 원 요청자에게 보내는 reply는 이 fan-out과 구분한다.

`agents_list`는 인증된 source의 단일 Network에서 **source→target이 허용되는 Agent만**
`status`와 함께 반환한다. Web은 Network 전체 Agent와 route를 표시한다. 일반 CLI 목록과
MCP 목록의 범위를 혼동하지 않는다. status 값과 실제 관측 매핑은 runtime 계약의 미결이다.

send 호출은 정상 접수·전송 시도 결과 또는 거절을 도구 반환으로 알려 준다. 응답을 기다리지
않는 메시지라도 send 오류를 무시하지 않는다. message type/intent의 세부 schema·enum은
아직 확정하지 않는다. 기존 거대한 envelope를 줄인다고 내부 식별자·
권한 검사·상관관계까지 삭제하지 않는다.

## 내부 데이터와 모델 표시

```text
Daemon 내부
  Runtime/source/target, Network/route, message/delivery ID,
  전송 결과, reply 연결, vendor prompt/turn 연결

모델 입력 / TUI
  발신자 표시 + 본문 + 필요한 연결 ID + reply 필요 여부와 방법
```

protocol/version·createdAt·mediaType·전체 주소 등 관리 메타데이터를 매 메시지마다 JSON으로
화면과 모델 입력에 노출하지 않는다. 모델에게 필요한 정보만 projection한다. 회신 불필요
메시지도 hook 상관관계를 위해 연결 ID가 필요할 수 있으므로 false이면 ID를 무조건 제거하는
계약을 만들지 않는다.

Codex 입력 presentation의 최종 방식은 Open/deferred다. IDE delimiter/Cyan, toolOutput,
additionalContext 후보를 조사했지만 하나를 채택했다고 간주하지 않는다. 고정
“Sent by Codex” 문구가 Claude를 올바르게 표시한다고 주장하지 않는다. UI 표시는 모델 입력,
실제 transport 수신, 인증된 발신자를 대신하지 않는다.

## Reply 의미

`replyExpected=false`는 **회신 불필요**다. 발신 Agent는 상대의 응답 종료나 회신을 기다리거나
추가 확인할 필요가 없다. 수신 측에 ACK 도구, Stop 완료 알림, 자동 후속 Agent 대화를 강제하지
않는다. 내부 관측과 발신 Agent에게 새 메시지를 보내는 것은 다른 행동이다.

`replyExpected=true`이면 reply를 원 요청과 연결한다. daemon은 원 메시지·대상과 인증된
회신자의 관계를 검증하고 원 source에 귀속한다. 일반 outbound fan-out과 혼동하지 않는다.
reply 허용 횟수·중복 처리·실행 중 route 변경 뒤 지연 reply 권한의 상세는 Open/deferred다.
false를 기존 one-reply permission의 동의어로 정의하거나 이를 근거로 임의 오류 enum을
확정하지 않는다. `isReplyTrue` 같은 alias를 추가하지 않는다.

## 관측은 단일 필수 순서가 아니다

| 관측 | 뜻 | 뜻하지 않는 것 |
| --- | --- | --- |
| 프로세스 생성·종료 | Runtime 실행 수명 | 특정 메시지 처리 성공 |
| binding 연결 준비 | 입력 경로 준비 | 모델이 본문을 읽음 |
| socket write/입력 수락 | 해당 단계가 입력을 받음 | 산출물·업무 성공 |
| 연결된 prompt/turn 종료 | 응답 종료 | 프로세스 종료 또는 작업 검증 완료 |
| correlated MCP reply | 원 요청에 대한 회신 | 이후 작업도 모두 종료 |

```text
입력 수신 → MCP reply → 추가 작업 → Stop        가능
입력 수신 → 응답 종료 → MCP reply               가능
회신 불필요 입력 → 응답 종료 관측, 후속 회신 대기 없음
```

Codex의 정상 입력 응답은 runtime 입력 수락 근거다. App Server의 진행·완료·오류·사용자
요청을 관측하고 활성 thread는 연결된 TUI의 성공한 start/resume/fork 결과에 맞춰 binding한다.
Claude는 hooks를 daemon으로 전달하며 프로세스/연결 손실은 별도 실행 관측도 사용한다.

Claude `UserPromptSubmit`의 원문·AIOX 연결 ID를 `session_id`/`prompt_id`에 연결하고 같은
`Stop`을 응답 종료로 연결하는 것이 수용한 관측 경로다. `source`는 optional이며 system이
inbox만의 값도 아니다. Stop만으로 origin을 인증하지 않는다. 일반 PreToolUse/PostToolUseFailure를
모두 수집해 협업 오류로 만드는 것은 범위 밖이다.

**근거 한계:** 사용자 전달 실측은 Claude 2.1.263의 **단일 idle inbox 입력 → UserPromptSubmit
→ 같은 prompt_id의 Stop**이다. busy/multi-input 전체, StopFailure 연결, native Windows를
검증한 결과가 아니다. 하나의 Stop으로 여러 입력이 각각 성공했다고 단정하지 않는다.
raw inbox body·표시 태그·hidden 경로 옵션은 vendor 내부 구현 의존이며 안정된 범용 공식 API로
승격하지 않는다. 이미 확보한 수신·응답 종료 근거를 다시 “아무것도 알 수 없음”으로 낮추지도 않는다.

## 실패·대기와 재전송 제외

동일 메시지의 자동 재시도·재주입과 수동 재전송 API/tool/handler를 제공하지 않는다.
`aiox_retransmit_unconfirmed_delivery` 및 그 사용 지침은 제거 대상이다. 공통 협업 지침과
Host/Agent instruction 주입은 유지한다.

최초 한 번도 전송하지 않은 메시지의 queue는 재전송과 다르므로 대기열 자체를 제거하는
결정이 아니다. 그 queue의 용량·기한·최초 전달 조건은 별도 구현 계약이며 과거 retry 간격을
새 기본값으로 가져오지 않는다. 사용자의 새 send는 새 메시지다. DB에 저장했다고 재전송·replay가
허용되는 것은 아니다.

거절·실패·확인 불가를 실제 증거에 맞게 표시하고 늦게 도착한 관측도 원 입력에 연결한다.
확인 불가를 성공으로 숨기거나 모델 ACK·재전송으로 해결하지 않는다. Runtime 리밋이나 사용자
입력 대기는 Web에 알릴 수 있지만 연결 근거 없이 특정 Delivery 실패로 기록하지 않는다.

Sources:

- `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §§5–18 — 공통 MCP, inbox/Relay,
  입력 관측·표시 실험, replyExpected와 재전송 제거 결정의 provenance.
