---
topic: AIOX TUI Stage2-3 Control Flow Boundaries
description: 사전 검증에서 확장한 실행 순서·완료와 복구 경계 개선 및 불필요한 결합 정리
status: open
---

## Work Items

- [x] W1 daemon 종료와 외부 vendor 수명 분리 교정 — 외부 aiox agent run claude/codex는 일반 stop·force 모두 vendor를 유지하고 협업만 정리한다. 외부 참여만으로 daemon stop을 막지 않는다. Windows 작업 검사 없는 종료는 daemon 소유 실행에만 적용한다. 종료 제어 경로의 다른 호출자를 확인한 뒤 불필요 경로를 정리하고 협업 정리의 완료·실패·재시도 및 daemon 소유 실행 종료를 검증한다. — detached: logs/2026-09-12-AIOX-W1-External-Execution-Survival.md — reason: 사용자 W1 실행 승인; code·owner 교정의 공통 완료 검증
- [x] W2 메시지 저장·복구 단위 개선 — 결과와 필수 알림의 저장 완료 단위를 맞추고, 전송 거절 후 DB 실패가 뒤 대상과 미완료 행 추적을 잃게 하는 경로를 수정한다. 실제 저장 실패·재시도 회귀와 retention 경계를 검증하고 불필요한 InFlight 상태·route 반복 판단을 정리한다. — detached: logs/2026-09-12-AIOX-W2-Message-Persistence-Recovery.md — reason: 사용자 W2 구현 승인; messaging·persistence·owner의 공통 완료 검증
- [x] W3 시작·재시작·조회 책임 정리 — 새 config의 가능한 준비·검증과 override 변경 안내 후 기존 daemon을 종료하고 준비 결과로 시작한다. Web·상태 파일 준비까지 성공 공개를 늦추며 실패 자원을 정리한다. daemon status·doctor는 실행 중 대상 발견을 다음 설정 검증과 분리한다. — detached: logs/2026-09-12-AIOX-W3-Startup-Readiness.md — reason: 사용자 W3 subagent 실행 승인; CLI·daemon·owner의 공통 완료 검증
- [x] W4 참여 중 Network 삭제 거절 — 실행 참여가 있으면 삭제를 거절하고 먼저 참여 정리를 요구한다. 자동 종료·분리를 추가하지 않으며 등록/삭제 경합과 이후 discovery·전송을 검증한다. — detached: logs/2026-09-13-AIOX-W4-Network-Deletion.md — reason: 사용자 W4 실행 승인; code·tests·owner 공통 완료 검증
- [>] W5 Web 작업 결과·화면 복원 상태 개선 — 서버 진단을 보존하고 연결 조회 성공이 작업 오류를 덮지 않게 한다. mirror 실패에도 실행을 유지하며 복원 불가와 사용자 종료·재생성을 안내한다. 중첩 조회 응답 역전의 실제 영향도 검증한다.
- [ ] W6 등록 구성·삭제 후보 및 미채택 지적 판정 — 등록 예약·준비·활성화 대안을 현재 구조와 비교하고 필요한 경우에만 단순화한다. 미사용 필드·인자·killAll은 계약/검증 보존 후 제거하며 CLI 복귀·vendor 진단·임시 자원·신호 종료 등 남은 Claude 지적을 근거별로 채택·반증·후속 이관한다.
- [ ] W7 통합 리뷰·owner 반영·단계 마감 — 변경별 회귀와 관련 OS 검증, 제거 코드의 책임 보존, 미해결 후보 disposition을 root가 확인한다. 확정 계약을 owner에 반영하고 잔여 한계와 후속 owner를 명시한 뒤 Stage3 W1로 활성 단계 포인터를 옮긴다. 원격 push는 사용자 지시가 있을 때만 수행한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- plans/aiox-tui-product-rebuild.md의 Stage2-3이다. W1 a039525·W2 839c890·W3 3d2cb21 커밋 완료. W4는 logs/2026-09-13-AIOX-W4-Network-Deletion.md의 Brief1 Attempt1을 root가 직접 리뷰·수용해 완료했다. 사용자가 W4 commit을 승인했으며 실제 결과는 Git 기록을 참조한다. 이번 commit 승인은 W4에 한정한다. 다음 재개 지점 W5 실행과 원격 push는 승인되지 않았다. 이 단계 완료 후 Stage3 W1을 재개한다.
- 사용자는 root를 논의·정책·지시·직접 리뷰 담당으로, subagent를 조사·구현·테스트 담당으로 지정했다. 기존 조사와 확정 정책을 다시 승인받지 않는다. 이번 commit 승인은 완료된 W4 작업에 한정하며 원격 push는 사용자 후속 지시까지 금지한다. architecture.excalidraw는 개인 자산으로 제외한다.
- 아래 조사 계기와 근거 분류·Claude 의견 대조를 먼저 읽고 선택 Work Item의 호출자·producer/consumer·owner·tests를 추적한다. 기존 조사를 전부 반복하지 말고 변경할 경계의 재현을 회귀 테스트로 고정한다. root가 실제 diff와 검증 근거를 확인하기 전 subagent 완료 보고를 최종 완료로 승격하지 않는다.
- 관련 owner는 docs/specs/aiox-runtime.md, aiox-collaboration.md, aiox-configuration-web.md와 docs/architecture/aiox-vendor-bindings.md, aiox-storage-terminal.md, aiox-system.md다. W1 교정은 docs/decisions/external-execution-survival.md로 수용됐고 기존 explicit-execution-shutdown은 결정 계보다. W2 저장·복구와 W3 준비·조회·종료 자원 경계는 owner와 회귀에 반영됐다. 무관한 last-good·자동 적용 요구는 유지한다.


### {W1}

- 최신 사용자 정책: 외부 aiox agent run claude/codex는 daemon 일반 stop·force 모두 vendor 생존, 협업만 종료한다. POSIX에서도 외부 등록 관계만으로 daemon stop을 막지 않는다. Windows 작업 검사 없는 종료는 Web 등 daemon 소유 실행에 한정한다. daemon 소유 실행 종료와 외부 협업 해제의 완료 조건을 구분하며 외부 종료 의도를 새로 보존·강화하지 않는다. terminate 제어 경로는 모든 호출자를 확인하기 전 삭제 확정하지 않는다.
- MCP 서버 연결이 끊기면 호출측에서 협업 불가를 진단하며 vendor 실행은 유지한다. 꺼진 서버가 직접 오류 응답한다고 표현하지 않는다. 서버 종료를 확인할 수 없는 연결 실패는 종료 때문이라고 단정하지 않고 관측한 실패 원인을 전달한다.

### {W2,W3}


### {W6}

- W1은 stopTerminal fail-closed를 협업 정리 전 PTY를 죽이지 않는 보호로 보존했다. closeIdle timeout·ps 실패의 진단은 미검증 후보로 남아 있다. 정상 실패/재시도를 영구 busy·오보로 단정하지 않고 현재 계약과 관측 상태를 대조한다.
- 외부 리뷰 top 10은 이 로그의 “외부 리뷰 판정과 W6 후보 인계” entry를 읽고 각 원주장·root 대조 근거·잔여 검증을 복원한다. quota 상태·activity 실패 reason·MCP 합성을 우선 후보로 보되 10개 모두 확정 버그나 자동수정 대상으로 승격하지 않는다. 스캔 수·verdict·commit 귀속은 사용자 전달 미검증 주장이다. W3 no-state+invalid-config의 status exit1/doctor config.error exit0는 root built 재확인과 사용자 동의로 현재 동작을 유지한다.

### {W7}

- W2 messages.drain의 필수 저장 지속 실패는 500 internal_error 및 DB/listener 재시도 유지다. W3 DB close 실패는 listener 해제 뒤 stderr 진단하고 closed 의미를 유지하는 것으로 판정·회귀 검증했다. 상태 파일 삭제는 listener 해제 전으로 이동해 지연 DB close 뒤 새 상태 기록을 삭제하지 않는다. 삭제 실패는 진단 후 stale 기록 가능성을 남기며 listener 종료와 구분한다. 이 후보를 미판정 결함으로 재개하지 않는다.

## 2026-09-12 · macOS 사전 검증 보고에서 확장한 처리 경계 개선 착수 준비

사용자가 Stage2-2 로그·단계 마감과 별도 Stage2-3 생성·활성 포인터 이동을 명시적으로 요청했다. 기존 조사, Claude 의견과 root의 반론·정정, 확정 정책을 책임별 작업으로 묶는다. 이번에는 문서와 포인터만 변경하며 아래 개선의 구현·실행 검증을 새로 수행하지 않았다. 과거 조사 사실은 Stage2-2의 2026-09-12 16:26 entry 및 root가 사용자에게 보고한 후속 조사에서 인계받았다.

### 조사 계기와 범위 확장

terminal.shell 설정 추가 당시 다음 보고가 나왔다.

> “macOS에서는 없는 실행 파일을 지정해도 PTY 생성 후 오류 문구 없이 종료될 수 있습니다. 별도 사전 검사나 종료 화면 보존 기능은 추가하지 않았고, 이 한계는 검증 기록에 남기겠습니다.”

당시 확인한 흐름:

```text
config 읽기
→ shell 값이 문자열인지 등의 형식 검증
→ daemon·Web 시작
→ 사용자의 터미널 생성 요청
→ PTY 생성
→ 실제 shell 실행 실패
→ 출력 없이 종료
→ 기존 종료 처리에 따라 터미널 제거
```

PTY 생성 성공은 shell 실행 성공을 보장하지 않았다. shell 자체를 실행하지 못했으므로 shell이 오류를 출력할 것이라는 기대도 성립하지 않았다. 미리 확인할 수 있는 없는 실행 파일 조건을 실행 단계까지 넘긴 결과, 요청은 실패했지만 이유가 충분히 전달되지 않았다. 정확한 당시 Web 화면 전체를 실측했다는 주장은 아니다.

사용자는 “설정 계층에서 전체 설정의 유효성을 책임지고, 실행 전에 shell 실행 가능 여부와 cwd 존재·접근 가능 여부를 확인해야 하는 것 아닌가?”라고 문제를 확장했다. shell 국소 예외 처리나 오류 표시만이 아니라, 선행 조건 → 준비 → 실행 → 저장 → 성공 보고 순서와 중간 실패의 복구 책임을 점검하라는 요구다. 특정 함수를 호출하기 위한 상태·콜백·wrapper 결합, 불필요한 상태와 레거시 호환 코드도 검토한다. theme 색상·keyboard 의미 검증은 당시 제외했으며 이 단계가 전체 설정 UI 재설계를 추가하지 않는다.

위 보고는 조사 출발점인 과거 동작이다. Stage2-2는 이미 shell/cwd 사전 검증, 검증된 실행 정보 전달, 오류 분류와 Windows/WSL 진단을 구현했다. 사전 검증 후 환경 변화와 실제 실행 실패 처리는 여전히 필요하다. 다른 경로의 문제는 이 macOS 현상이 원인이 아니라 같은 관점으로 조사하면서 발견한 별개 문제다.

### 인계 기준과 검증 한계

Stage2-2 최종 코드 8c2fbd7, 문서 커밋 c000cab을 로컬 main에 반영한 상태를 출발점으로 삼는다. Stage2-2 최신 entry에 기록된 root pnpm check와 CI34685159507의 Windows/Linux/macOS × Node22/24 success를 소비하며 이번 문서 담당자가 다시 실행한 결과로 표현하지 않는다. Windows desktop/WSL 보고는 사용자 제공 실측이다. Windows cwd 사용 자체의 ACL 거부는 미재현이고 대역 vendor의 수집 PID 트리 종료는 실제 Claude/Codex 통합 또는 임의 자손 전체 종료 보장이 아니다. 원격 main push는 사용자 보류이며 로컬 마감을 원격 배포 완료로 기록하지 않는다.

이 단계는 각 책임의 독립 개선을 모아 순서·정책·재개 문맥을 관리하는 Base log로 시작한다. 여러 파일이나 subagent 사용만으로 하나의 package로 만들지 않는다. 실제 구현 위임 시 특정 변경과 관련 산출물이 공통 correct/done 판단을 요구하면 log skill의 package activation을 적용하고 해당 W에서 필요한 단위만 분리한다. 지금 미래 task record·package scaffold는 선생성하지 않는다.

### 확정 정책

| 대상 | 사용자 결정 | 작업 |
| --- | --- | --- |
| 사용 중 Network 삭제 | 참여 중인 실행이 있으면 삭제 거절. 참여 정리 후 삭제하며 실행을 자동 종료·분리하지 않음 | W4 |
| restart | 새 config 사용. 가능한 사전 검증과 기존 CLI port override 대비 변경 안내 후 기존 daemon 종료 | W3 |
| 화면 복원 실패 | 실행 유지. 복원 불가를 표시하고 종료·재생성은 사용자 선택 | W5 |

이 정책들은 구현 목표다. 현재 코드에 이미 반영됐다는 의미가 아니며 구현 단계에서 owner 계약과 연결한다.

### 확인된 흐름과 작업 연결

아래 “재현”은 이전 root 조사에서 제어된 실패·지연 또는 테스트로 확인한 것을 인계한 표현이다. 운영 환경의 무작위 장애 관측이나 이번 문서 작업의 신규 실측을 뜻하지 않는다.

| 작업 | 기존 흐름과 문제 | 근거 수준·검증할 완료 조건 |
| --- | --- | --- |
| W1 | 협업 해제 시작 → runtimeStops의 기존 Promise → 나중 force도 같은 Promise 반환 → owner 종료 호출 없이 stopped:true 가능 | 정리 지연+force로 공통 경계 재현. 실제 WS 손실 전체 재현과 구분. 협업 해제와 실행 종료의 완료·추가 의도를 분리하며 연결 손실이면 미확인을 성공으로 바꾸지 않음 |
| W2 | 결과 DB 저장 → InFlight 삭제 → 필수 알림 저장 실패 | 실패 주입 재현. 결과가 이미 있으면 settle이 처리됨으로 판단하므로 삭제 위치 이동만으로 부족. 저장 완료 단위와 재시도 정보 보존 검증 |
| W2 | 여러 대상 행 생성 → 한 대상 전송 거절 → 추적 삭제 → 거절 결과 DB 저장 실패 → 뒤 대상 중단·outcome=null 잔존 | 연속 실패 주입 재현. retention이 미완료 행을 제외함. 대상별 처리 및 미완료 행 복구 책임 검증 |
| W3 | 기존 daemon 종료 → 새 config 검증 → 빌드 확인 → 시작 | CLI 대역 재현·코드 대조. 잘못된 config/누락 빌드로 정상 실행부터 잃지 않게 준비 결과를 실제 시작이 사용. 이미 쓰는 포트의 사전 확보 등 불가능한 보장과 구분 |
| W3 | API listener → running 응답/CLI 성공 → Web listener → 상태 파일 | Web 준비 지연 재현. 필수 준비와 기록 완료 전에 성공을 공개하지 않음 |
| W3 | 상태 파일 기록이 시작 자원의 실패 정리 범위 밖 | 코드 경로 확인. 기록 실패 주입 후 자원 정리 검증 필요 |
| W3 | daemon status가 다음 config부터 검증; doctor는 config 포트 조회 | 이전 CLI 재현·현재 코드 대조 인계. 일반 aiox status는 기록 포트 우선 경로가 있으므로 범위를 구분 |
| W4 | Network 삭제 → 실행에 networkId 잔존 → discovery 실패 | 실제 모듈 재현. 참여 중 거절 정책과 비동기 등록/삭제 경합 검증 |
| W5 | 서버 오류 설명 폐기 → HTTP 상태만 표시 → 다음 polling 성공이 실패 표시 덮음 | 이전 DOM 재현·코드 대조 인계. 연결 상태와 작업 결과 구분 |
| W5 | mirror 쓰기 실패 latch → 프로세스 생존 → 재연결 복원 실패 | 코드 경로·관련 테스트 확인, 전체 사용자 흐름 추가 검증 필요. alive 의미를 바꾸지 않고 복원 상태 전달 |

주요 source locator는 apps/cli/src/bootstrap.ts, apps/daemon/src/daemon.ts·bootstrap.ts·messaging.ts·networks.ts, apps/web/src/main.ts, packages/terminal/src/index.ts다. 줄 번호는 변경될 수 있으므로 해당 함수의 호출자와 테스트까지 추적한다. 이전 재현 자료 /private/tmp/aiox-preflight-review/probe.mjs, cli-probe.test.ts, web-probe.test.ts는 임시 파일이며 존재·빌드 적합성을 재개 때 확인한다. repo에 남은 회귀 테스트와 동등하지 않으므로 실제 수정마다 유지할 최소 회귀를 작성한다.

### 결함 확정과 구분할 구조·삭제 후보

| 작업 | 후보 | 판단 조건 |
| --- | --- | --- |
| W1 | stopTerminal의 runtime 순차 정리 실패가 뒤 정리와 PTY kill을 건너뜀 | 전체 daemon stop의 부분 실패 표현과 비교. 의존 자원을 성급하게 죽이지 않으면서 완료·재시도 의미를 검증 |
| W1 | messages.drain의 allSettled와 DB close catch에서 실패 흡수 | 코드 경로만 확인. best-effort 허용인지 필수 저장 실패 은폐인지 실패 주입과 계약으로 판정 |
| W2 | InFlight.messageId·createdAt 미사용, notifiable 항상 true | 내부 불필요 상태 제거 후보. domain의 알림 정책은 보존 |
| W2 | 전송별 route·권한 정보 반복 조회 | 판단 시점·일관성 단순화 후보. 단일 SQLite 연결의 직렬화를 없애거나 Promise.all을 성능 개선으로 단정하지 않음 |
| W5 | 주기 조회와 사용자 동작 조회 중첩·오래된 응답 반영 | 코드상 가능성, 실제 영향 미재현. 작은 순서 처리로 충분한지 검증 |
| W6 | Registry 콜백 캡처·controls·binding wrapper와 여러 준비 상태 | 예약→준비→활성화 대안 비교. wrapper 존재만으로 결함·리팩토링 필요 확정 금지 |
| W1/W6 | AgentBinding.stop(force)의 production 인자 무시 | 상위 종료 정책과 하위 실행 종료의 책임 확인 후 인자 제거 판단; 미사용 자체를 잘못된 종료로 단정하지 않음 |
| W6 | TerminalService.killAll production 호출 없이 테스트만 존재 | 공개 계약과 담당 검증을 실제 종료 경로에 보존할 수 있을 때 통합·삭제 |

불필요한 코드 삭제는 마지막에 무차별 수행하지 않고 각 책임의 수정과 함께 한다. 입력 검증·비동기 권한 재확인·실패 재시도·현재 요구를 레거시로 오판하지 않는다. 로그 길이나 함수 수를 줄이는 것 자체는 완료 조건이 아니다.

### Claude 의견·root 반론과 남은 판단

Claude가 4개 리뷰 총 38개라고 보고했지만 대화에서 전달된 항목만 확보했다. 원문 전체 38개를 검토·검증했다고 주장하지 않는다. 아래는 전달된 주장에 대한 현재 disposition이며 Claude의 CONFIRMED 라벨을 새 검증 사실로 승계하지 않는다.

| 전달된 의견 | root 대조·정정 또는 남은 판정 | 연결 |
| --- | --- | --- |
| 없는 shell도 config 통과, mock throw 테스트가 실제 동작을 대신함 | 조사 계기와 합치. 실제 파일 시스템 선행 거절 및 검증 후 실행 오류 회귀를 Stage2-2에서 보완 | 완료 기반 |
| createConfigSession production 미사용이 결함/삭제 후보 | 미사용 사실만으로 삭제 판단 철회. 기준 요구·현재 spec의 last-good/자동 반영 기반과 테스트 보존. 잘못된 실행 config 거절과 무조건 last-good fallback을 혼동하지 않음 | W6 보존 기준 |
| args·미지원 shell의 영구 busy | 자동 안전 종료를 확인할 수 없으면 거절하는 POSIX 보수 정책. Windows native 일반 stop에 일반화 금지 | W1 진단 범위 |
| ps 실패 한 번이면 영구 busy | 다음 검사에서 다시 조회하므로 영구 latch 아님. 원인 진단 부족은 검토 가치 있음 | W1 |
| fish 한 줄도 실행 안 됨 | 기존 Linux Fish4.0.2 PTY 검사 /private/tmp/aiox-linux-handshake-result.txt와 충돌. 현재 전체 제품/CI 검증으로 확대하지 않음 | 보존 근거 |
| 오류 terminate ACK 뒤 양쪽 영구 hang·이후 force 항상 connection closed | 오류 ACK는 연결 유지·재시도 구현/테스트가 있음. 제어 연결 상실은 별개. agent-controller.test.ts와 external.test.ts의 재시도 근거 인계 | W1/W6 |
| cleanup 중복 호출 자체가 결함 | 실패 후 재시도에 필요할 수 있음. 실제 자원 손상·비멱등 부작용 전에는 결함 아님 | W1 |
| Network 삭제로 MCP 세션 영구 파괴 | 삭제된 ID 참조 실패는 타당하나 요청별 stateless MCP이므로 표현 정정. 참여 중 삭제 거절 정책 확정 | W4 |
| send catch의 DB 실패·미완료 행, stopTerminal 중간 실패, force 인자 유실 | 저장·완료 경계의 채택된 검토. 각각 실제 재현/코드 확인 수준은 위 표를 따름 | W1/W2 |
| restart override 유실·doctor 포트·설정 적용 시점 차이·상대 cwd | restart는 새 config 적용으로 정책 확정. doctor는 조회 책임 개선. terminal과 retention 적용 시점·상대 cwd는 요구/명세 대조 후 필요 개선만 채택 | W3/W6 |
| closeIdle timeout이 종료 실패 오보 | timeout 당시 생존/확인 여부와 후속 상태를 추가 검증해야 함. 종료 확인 실패 자체를 오보로 확정하지 않음 | W1 |
| mirror 실패에도 healthy처럼 보임 | alive의 프로세스 생존 의미는 결함 아님. 복원 불가 전달과 사용자 조치가 판단 대상 | W5 |
| CLI 사망 뒤 vendor hook 401 반복 | 당시 정책은 401 진단 유지이며 세부 사용자 안내/복구 가치는 별도 검토. 반복을 즉시 새 결함으로 승격하지 않음 | W6 |
| startup-failed 뒤 vendor 실행 중이라는 안내, EACCES가 version probe failed로 뭉침 | 전달된 경로 주장. 실제 진단·순서·현재 계약 확인과 필요한 재현 후 수정 여부 판정 | W6 |
| 준비 구간 신호/stop 오류에 inbox 임시 디렉터리 누수 | 전달된 경로 주장. 소유자·finally·재시도 의도 확인과 실패 주입 필요 | W6 |
| SIGINT/SIGTERM에 에스컬레이션 없어 Ctrl-C 영구 무응답 | 전달된 우려. 신호 종료의 외부 실행 생존 정책과 정리 완료/진단을 구분하고 영구 hang·kill -9 유일 탈출로 단정하지 않음 | W1/W6 |

임의 자손 전체 종료는 현재 보장 범위가 아니다. root가 macOS에서 직접 child 종료 후 자손 생존을 재현했지만 현재 계약 위반으로 분류하지 않는다. Windows 대역 트리 성공과도 모순되지 않는다. 기존 비동기 admission/인증 재검사, 실패 자원 재시도, SQLite 작업 직렬화는 필요한 역할을 보존한다. 다른 리뷰에서 반증됐다고 전달된 경로 역시 근거 없이 추가 결함으로 복원하지 않는다.

### 실행·리뷰와 종료 기준

다음 실행은 W1의 force 경합 수정·회귀 검증이다. 이번 로그 준비에서 조사 전체를 다시 수행하거나 production을 수정하지 않았다. W1 → W2 → W3 → W4 → W5 → W6 → W7 순서로, 서로 겹치는 코드 변경은 순차 진행한다. 실제 위임 brief에는 범위·호출 경계·기존 근거·검증·금지 범위를 담고 root가 결과를 직접 리뷰한다. 등록 구조 후보나 미채택 Claude 지적은 검증 후 유지·수정·반증·후속 이관을 명시하며 모두 수정하는 것을 목표로 하지 않는다.

보고는 이미 설명한 문제를 반복하기보다 실제 변경/삭제, 테스트와 실측 근거, 기존 판단과 달라진 점, 새 정책 결정 필요 사항을 중심으로 한다. 외부 동작·공통 invariant가 바뀌면 관련 owner와 tests에 반영하고 구현 상태와 목표를 구분한다. W7에서 각 W 결과·잔여 한계·이관 owner를 닫고 plan의 Stage2-3 완료와 Stage3 W1 재개를 함께 맞춘다. 원격 push는 사용자 후속 지시까지 하지 않는다.

### 2026-09-12 21:56 · 문서 구성·포인터 검증

Stage2-2 W9 completed/status decided, plan Stage2-2 완료·Stage2-3 활성·Stage3 대기, Stage3 Required Context와 후속 entry 인계를 맞췄다. log check는 세 로그의 구조와 재개 지점을 통과했고 scripts/onramp는 Stage2-3 W1을 단일 현재 작업으로 선택했다. git diff --check도 통과했다. root가 새 로그 본문의 근거 분류·정정·정책·Work Item 매핑을 리뷰했고 내용 수정 요청은 없었다.

지원되는 로그 생성·문맥·Work Item·entry·status 변경은 log 도구를 사용했다. 도구가 생성 파일명을 Control-Flow에서 잘라 새 파일명만 요청한 Control-Flow-Boundaries로 수동 조정했고, 도구 범위 밖 plan 단계 표시는 수동 편집했다. 과거 History 내용은 보존했다. 이번 변경은 네 문서의 미커밋 변경이며 production·테스트·commit·push·스킬 제작은 수행하지 않았다.

### 2026-09-12 21:59 · 외부 vendor 생존 정책 정정과 W1 교정 범위

사용자가 외부 실행 수명 정책을 명시적으로 정정했다. 외부 터미널의 aiox agent run claude/codex는 daemon 일반 stop과 force 모두 vendor를 유지하고 협업만 종료한다. Windows의 작업 검사 없는 종료는 Web 등 daemon 소유 실행에만 적용한다. POSIX에서도 외부 등록 관계만으로 daemon stop을 막지 않는다. MCP 서버가 사라진 경우 호출측에서 협업 불가를 진단하며 vendor 수명은 유지한다. 서버가 종료됐는지 확정할 수 없는 연결 실패에서는 원인을 단정하지 않는다.

따라서 초기 W1의 “force가 나중에 오면 추가 외부 종료 의도를 보존하고 owner 종료 확인” 목표를 그대로 강화하면 사용자 요구에 반한다. 기존 구현·owner 문서가 종료 범위를 외부 vendor까지 확장한 상태의 교정을 W1 첫 책임으로 바꾼다. daemon 소유 실행의 종료와 외부 협업 해제의 완료·실패·재시도를 각각 판정한다. terminate 제어 경로는 다른 호출자와 실제 책임을 read-only audit한 뒤 필요성·삭제 범위를 정하며 지금 삭제를 확정하지 않는다.

이 블록의 이전 force 경합 재현과 외부 종료 성공 테스트·CI 기록은 당시 정책 전제 아래 확인한 과거 사실로 보존한다. 그 결과가 이번 사용자 정책의 올바른 구현을 증명하지는 않는다. Stage2-2는 재개하지 않고 잘못 확장된 구현·문서 교정과 필요한 후속 검증을 Stage2-3 W1에서 처리한다. 현재 수행은 정책 기록과 별도 read-only audit이며 production/spec/decision 변경이나 commit/push를 수행하지 않는다. 다른 확정 정책 세 가지와 W2–W7 범위는 유지한다.

### 2026-09-12 22:08 · W1 실행 승인과 코드·owner 동시 교정

사용자가 W1 실행을 승인했다. read-only audit 제한은 해당 범위에서 종료됐으며 code agent가 apps/packages 구현·회귀를, 문서 agent가 관련 current owner·decision·로그를 담당한다. root가 최종 diff·검증을 직접 확인하기 전 완료 처리하지 않는다. commit/push는 금지한다. 외부 Host는 daemon 소유 Web 실행, 외부 agent는 stdio 상속 CLI 소유, Web agent는 daemon 소유다. macOS/Linux/WSL 안의 daemon은 idle-only 일반 stop과 daemon 소유 대상 force, Windows daemon은 wsl.exe를 실행하더라도 daemon 소유 대상의 작업 검사 없는 일반 stop을 적용한다. 외부 agent는 모두 협업만 해제한다.

W1 code·spec·architecture·decision은 같은 종료정책 완료 판정을 공유하므로 root가 package activation을 확인했다. W1만 controlling package로 분리하고 이미 위임된 code/docs 두 Compact record를 만든다. Stage2-3에 미래 W2 이상 scaffold를 만들지 않는다. 부모 W1은 package 결과를 root가 소비할 때까지 미완료다.

### 2026-09-12 22:19 · W1 결과 소비와 W2 재개 지점

root가 logs/2026-09-12-AIOX-W1-External-Execution-Survival.md의 code/docs Brief revision 1/Attempt 1을 전체 수용하고 부모 W1 완료를 지시했다. 외부 agent는 daemon 일반 stop·force 모두 실행을 유지하고 협업만 해제하도록 교정했으며 불필요한 외부 terminate/ACK 제어·상태·force 전달 인자를 제거했다. daemon 소유 플랫폼 정책과 CLI 로컬 종료/실패 보상은 유지했다. package 최신 결과 수용 entry와 두 task record가 실행·검증 상세를 소유한다.

code agent pnpm check exit0/479 passed 원문은 root가 직접 확인했다. root 별도 macOS 실제 owner/대역 vendor probe에서 일반/force 뒤 등록·MCP 종료와 vendor 후속 입출력, 자연 종료 후 자원 정리를 확인했다. 실제 Claude/Codex·Windows/Linux/WSL 실OS 신규 실측과 CI는 수행하지 않았다. current spec/architecture·새 decision 교정 및 과거 결정 계보 보존을 함께 수용했다.

W1 결과를 소비해 완료하고 W2 메시지 저장·복구를 다음 재개 지점으로 옮긴다. stopTerminal fail-closed는 보호 동작으로 보존했다. drain/DB close 후보는 W2/W3, closeIdle/ps 진단은 W6에 남겨 계약과 영향 검증 후 판정한다. Stage2-2를 재개하지 않고 Stage2-3 활성 상태를 유지하며 이번에 W2 실행·commit·push는 하지 않는다.

### 2026-09-12 22:30 · W1 커밋과 W2 실행 위임

사용자가 W1 커밋을 요청해 a039525에 반영됐다. 이후 W2 메시지 저장·복구 구현을 subagent에게 ponytail로 위임하도록 승인했다. W2의 code·persistence·owner 공통 완료 검증을 logs/2026-09-12-AIOX-W2-Message-Persistence-Recovery.md로 분리했다. 현재 W2 재개·결과 수용은 package가 소유하며 부모는 결과 소비 대기다. 후속 commit/push 및 W3 이후 실행은 승인 범위가 아니다.

### 2026-09-12 22:41 · W2 결과 소비와 W3 재개 지점

root가 logs/2026-09-12-AIOX-W2-Message-Persistence-Recovery.md의 W1/W2 Brief revision 1 Attempt 1을 전체 수용했다. 실제 SQLite 두 실패 회귀, 원자 저장·최초 결과 보존·뒤 대상 진행·retention·재주입 없는 저장 retry 및 daemon HTTP 실패→복구를 source·diff·출력으로 직접 대조했다. 전체 pnpm check exit0, 484 tests passed. storage architecture와 collaboration spec 반영을 소비해 부모 W2를 완료한다.

다음은 W3이며 아직 구현하지 않았다. DB close catch의 자원 종료 완료 의미는 W3 후보로 유지한다. 신규 vendor·Windows/Linux/WSL 실OS·CI는 수행하지 않았고 W2 변경은 미커밋이다. commit/push는 하지 않았다. 세부 실패 정정과 결과 근거는 package 및 두 task Result를 따른다.

### 2026-09-12 22:42 · W2 마감 시 동시 외부 변경 구분

root 최종 Git 확인에서 HEAD 2e3bc87로 이동한 W2 밖 baseline/context prompt 로그 2개 커밋과 untracked execution-flow-map skill 디렉터리를 관측했다. 우리 팀의 commit이 아니며 해당 변경은 수정하지 않았다. W2 source와 충돌이 없어 전체 검사 근거와 마감 판단은 유지한다.

### 2026-09-12 23:06 · route snapshot 정책 확인과 W2 commit 승인

사용자는 route CLI가 같은 Network 내부의 통신 허용/차단만 바꾸고 실행 중 Agent의 Network 이동 CLI는 없다는 경계를 확인한 뒤, 전송 시작 시 route snapshot으로 해당 전송을 판단하고 DB 저장 뒤 route 재조회를 추가하지 않는 정책에 동의했다. 최초 route 검증과 실행·소속·수신 가능 여부 재검증은 유지한다. 이 확인으로 코드를 변경하지 않았다.

사용자가 W2 commit과 다음 세션 인계 프롬프트를 요청했다. commit은 root가 수행하며 이 entry는 승인 기록이지 commit 완료 기록이 아니다. W3 실행과 원격 push는 여전히 승인되지 않았다. 닫힌 W2 package와 당시 미커밋 기록은 그대로 보존한다.

### 2026-09-12 23:19 · W3 실행 승인과 package 분리

사용자가 W3 작업을 subagent에게 지시하도록 승인했다. CLI·daemon code/tests와 관련 owner가 같은 시작·재시작·조회 완료 판정을 공유하므로 logs/2026-09-12-AIOX-W3-Startup-Readiness.md로 W3만 분리했다. root가 두 Compact task Brief revision 1의 contract gate를 직접 통과시켰으며 현재 결과 수용은 대기다. 후속 commit/push 및 W4 이후는 승인 범위 밖이다.

Git HEAD 839c890413837ce8d6bc3a9c8c0672d4a1442af1을 직접 확인해 Required Context의 W2 미커밋 문구만 현재 사실로 정정했다. 이전 entry는 당시 경위로 보존한다. package registry·Base log check·onramp와 git diff --check가 통과했고 onramp는 W3 package W1을 선택한다.

### 2026-09-12 23:51 · W3 결과 소비와 W4 재개 지점

root가 logs/2026-09-12-AIOX-W3-Startup-Readiness.md의 code/owner Brief revision 1 Attempt 1을 전체 수용했다. 새 config 사전 준비·override 변경 안내·준비 snapshot 소비, Web/state readiness·실패 cleanup, 현재 daemon 조회와 config 진단 분리 및 상태 파일→listener→DB close 경계를 source·diff·실행 원문으로 확인했다. owner 4파일 반영과 candidate 의존 재검증을 소비해 W3를 완료한다.

pnpm check exit 0/502 tests, check 뒤 doctor assertion focused 1 및 CLI typecheck를 root가 원문 확인했다. root는 별도 built probe를 직접 실행해 snapshot/home·Web/state 준비·launching 프로세스 종료 후 생존·본인 stop 정리, EISDIR child exit 1과 양 포트 해제를 검증했다. DB close 지연 중 새 상태 파일 보존은 실제 임시 파일+제어 gate 회귀이며 CLI 두 프로세스 경합 실측과 구분한다. 상세 RED·테스트 정정·한계는 package와 W1 Result를 따른다.

DB close 무진단 후보는 진단 추가와 listener 종료 의미 보존으로 판정을 마쳤다. 필수 메시지 저장 실패의 W2 재시도 경계를 바꾸지 않았다. 다음은 W4이며 아직 실행 요청을 받지 않았다. W3 변경은 미커밋이고 commit/push를 하지 않았다. 신규 실제 vendor·다른 OS/CI를 실행하지 않았고 다른 작업의 untracked를 보존했다.

### 2026-09-13 00:18 · 외부 리뷰 판정과 W6 후보 인계

사용자가 외부 리뷰의 현재 판정을 부모 W6 문맥에 기록하도록 명시적으로 승인했다. W3는 완료·미커밋 상태로 유지하고 W4 next도 바꾸지 않는다. 새 W6 로그/package나 production 변경을 만들지 않는다.

W3 조회 추가 확인: 상태 기록이 없고 다음 config가 잘못된 경우 daemon status는 CLI main catch에서 오류 한 줄과 exit 1로 처리한다. doctor는 config.error를 포함한 진단과 exit 0을 반환한다. root가 built probe를 직접 재실행해 확인했으며, 현재 W3 계약 위반으로 보지 않는 판정에 사용자가 동의해 동작을 유지한다. 아래 top 10과 별개의 재확인 결과이며 문서 담당자의 직접 실행 근거는 아니다.

외부 리뷰의 “12,800줄 스캔”, “top 10”, 개별 verdict와 commit 귀속은 사용자 전달 주장이다. 원문 전수 확인·스캔 재실행·git blame을 하지 않았으므로 검증된 버그 수나 특정 commit의 책임으로 기록하지 않는다. 아래는 root의 source/계약 대조 판정을 인계한 것이며, 이 기록 작업이 새 source 조사나 실vendor 재현을 수행한 것은 아니다.

| 외부 지적의 주제 | 현재 판정·근거와 W6에서 남은 확인 |
| --- | --- |
| quota fired 뒤 상태 잔존 | active가 없으면 unidentified 상태가 남을 수 있는 코드상 후보다. 실제 vendor 이벤트 순서·복구 관측은 미검증이다. W6 우선 후보로 실제 이벤트와 상태 종료 조건을 확인한다. |
| failPending의 실패 reason | reason은 delivery 결과로 전달된다. 다만 activity 표시가 connection_lost로 고정되는 진단 정확성 후보가 남는다. W6 우선 후보로 delivery 결과와 화면/activity reason 소비를 구분해 채택 여부를 판정한다. |
| MCP 중복 등록 | 지원하는 실제 Claude 버전의 merge semantics를 확인하지 않았다. 중복 구성만으로 충돌·덮어쓰기 결함을 확정하지 않고 W6에서 실제 합성 결과를 확인한다. |
| signal 종료 정보 유실 | signal은 별도로 보존하고 CLI 종료 코드는 128+signal로 처리한다는 root 대조로 유실 주장을 반증했다. W6에서 해당 전달·소비 범위를 확인해 반증을 소비하며 불필요한 수정으로 바꾸지 않는다. |
| WSL cwd 드라이브 경로 변환 | 현재 명세는 Linux cwd 입력과 수동 드라이브 변환 금지다. 자동 Windows 경로 변환 부재를 현 계약 위반으로 보는 주장은 반증된다. 다른 입력 지원은 별도 요구가 확정돼야 한다. |
| stdin EPIPE 처리 | stdin error listener 부재는 확인했으나 production 실행은 외부 inherit 또는 daemon PTY이며 background 경로는 현재 test 소비다. 실제 production EPIPE 도달 경로·영향은 미확인이다. |
| own 동일 callback 재등록 | 동일 callback 재등록이 pending을 덮을 수 있으나 실제 중복 등록 caller는 확인하지 못했다. W6에서 caller와 재등록 요구를 먼저 확인한다. |
| foreground 실패 latch | 실패 뒤 latch가 true로 남지만 동일 owner 재사용·재시도 요구와 실제 caller는 확인하지 못했다. 필요한 재시도가 차단되는 실제 수명/소비 경로가 있는지 확인하기 전 결함으로 채택하지 않는다. |
| .ps1 실행 가능성 | 실행 파일 형식의 사전 성공 보장은 현재 계약에 없고 Windows 실측도 없다. 실제 실행 실패 처리와 추가 사전 검증 요구를 구분해 판정한다. |
| empty append와 file 옵션 | empty append와 file의 truthy 검사 우회 가능성은 있으나 단일 최종 옵션이므로 실제 충돌·유실은 미확인이다. parser 결과·소비 경로와 관찰 가능한 영향을 확인한다. |

W6는 위 10개를 확정 버그로 일괄 수정하지 않는다. 각 항목을 현재 요구·source/caller·실제 관측과 대조해 채택·반증·요구 미확정으로 판정하고 필요한 검증을 남긴다. quota·activity reason·MCP 합성 후보를 우선 보되 자동수정 승인은 아니다. 기존 History와 W3 23:51 결과 소비 기록은 그대로 보존한다. 이번 기록으로 commit/push를 수행하지 않는다.

### 2026-09-13 00:23 · W3 작업 커밋 승인

사용자가 “현재 W3에 대해 작업 커밋하라”라고 명시적으로 승인했다. 완료·수용된 W3 code/tests·owner 문서·작업 기록을 root가 검토하고 커밋한다. 이 entry는 승인 기록이며 완료 hash를 예측하지 않는다. 실제 커밋 결과와 포함 파일은 Git 기록을 참조한다.

부모 로그의 기존 W3 결과 소비와 W6 후보 인계 기록, 닫힌 W3 package의 당시 미커밋 기록은 보존한다. W4 next를 유지하며 W4 실행·후속 작업 commit·원격 push로 승인을 확대하지 않는다. 다른 작업의 untracked execution-flow-map 파일과 사용자 개인 자산은 포함하지 않는다.

### 2026-09-13 00:43 · W4 결과 소비와 W5 재개 지점

root가 logs/2026-09-13-AIOX-W4-Network-Deletion.md의 W1 Brief revision 1 Attempt 1을 전체 수용했다. 공통 Network 삭제는 준비·정리 잔존 실행까지 참여가 있으면 거절하고 참여 정리를 안내한다. 등록은 동기 예약 뒤 존재 검증으로 삭제 경합을 막으며 별도 lock이나 자동 종료·분리를 추가하지 않았다. host spec과 system architecture 반영도 소비했다.

root가 source/diff·RED3/GREEN3·pnpm check exit0/506 tests(최종4회귀 포함)를 직접 대조했다. built CLI를 별도 임시 home/port와 dummy binding으로 직접 실행해 거절 안내·실행 유지, 명시 참여 정리 뒤 삭제 성공을 확인했다. 신규 실제 vendor·다른 OS·CI 검증은 아니며 세부 근거와 정정은 package W1 Result를 따른다.

W4 완료·package decided를 소비하고 W5를 다음 재개 지점으로 둔다. W4 변경은 미커밋이며 commit/push하지 않았다. W3는 3d2cb21 커밋 완료 상태다. W5 실행은 아직 승인되지 않았고 다른 작업의 미추적 execution-flow-map은 보존했다.

### 2026-09-13 00:51 · W4 커밋 승인과 로그 배치 유지

사용자가 현재 W4 커밋과 다음 세션 인계를 요청했다. root가 완료·수용된 W4 변경을 검토해 커밋한다. 이 entry는 승인 기록이며 실제 hash와 완료 여부는 Git 기록을 참조한다. 이번 commit 승인은 W4에 한정하고 W5 실행이나 원격 push로 확대하지 않는다.

로그 구조 논의 결과, 이번 W1~W4 배치는 기존대로 유지한다. 합치기·이동·package 해체를 하지 않으며 향후 새 package 사용을 포괄 승인한 것으로 확대하지 않는다. 과거 기록과 닫힌 package는 보존한다.
