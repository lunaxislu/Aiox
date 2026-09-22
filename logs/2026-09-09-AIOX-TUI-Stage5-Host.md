---
topic: AIOX TUI Stage5 Host
description: Host CLI·YAML·설정·실행 수명과 Stage6 연결 구현
status: open
---

## Work Items

- [x] W1 공통 API 계약·owner 반영 및 Stage6 수신·담당 경계·보완 1~4 합의 완료
- [x] W2 CLI 입력·config·YAML 로딩과 검증·layout 해석을 구현한다
- [x] W3 protocol 스키마·타입을 먼저 인계한 뒤 공통 저장 모델·조회·화면 배치 API와 상태 전달 기반을 구현한다
- [>] W4 shell 내부 Agent 실행과 준비·실패·종료 관측을 구현한다
- [ ] W5 Host run·전용 Network·초기 배치를 구현하고 Stage6 최초 실제 연결을 확인한다
- [ ] W6 개별 Agent start/stop/restart와 Host Network 명령을 구현한다
- [ ] W7 Host 전체 restart/stop/delete·조회와 구성 변경 처리를 구현한다
- [ ] W8 Stage6와 실제 연결한 Host 전체 흐름을 통합 검증한다

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 이 로그의 논의·정정 누적 기록을 구현 순서 중심으로 직접 재구성하도록 승인했다. 확정 정책의 권위는 아래 owner 문서에 있으며, 각 W scope는 구현에 필요한 적용 기준과 검증 조건을 담는다. 과거 제안이나 목업 더미 데이터를 계약으로 복원하지 않는다.
- Stage6의 W1 계약 수신·검토 및 담당 경계 수용을 확인했고 API 보완 1~4의 합의를 owner에 반영했다. 이번에는 W1 계약 확정만 수행했으며 기능 구현 완료가 아니다. Stage6 로그·apps/web·plan 활성 단계와 production/test/mock은 수정하지 않는다. 사용자는 확정 API를 바탕으로 Stage6 화면 설계를 논의할 예정이다. Stage5 다음 구현 범위는 W2다.
- Owner: [Host spec](../docs/specs/aiox-host.md), [Runtime/CLI spec](../docs/specs/aiox-runtime.md), [설정·Web UX spec](../docs/specs/aiox-configuration-web.md), [System architecture](../docs/architecture/aiox-system.md), [Storage/terminal architecture](../docs/architecture/aiox-storage-terminal.md). 인증·전송 판정은 [Collaboration spec](../docs/specs/aiox-collaboration.md), vendor 지침 주입은 [Vendor bindings architecture](../docs/architecture/aiox-vendor-bindings.md)를 함께 따른다.
- 병렬 작업 상대의 재개점은 [Stage6 로그](2026-09-09-AIOX-TUI-Stage6-Web.md)다. 전체 단계 연결은 [rebuild plan](../plans/aiox-tui-product-rebuild.md)을 따른다. 각 W 착수 시 최신 code/test와 owner를 대조하고 producer→consumer 및 실패 전달 경로까지 확인한다.
- Worktree 생성·`--worktree`, Host 이름 override `--name`, 대상 선택 `--host`, YAML `version`은 제외한다. adapter 이름은 `claude`와 `codex`다. 새 Runtime을 vendor 대화 자동 resume으로 해석하지 않는다.
- 첫 배포 전 DB는 현재 schema를 직접 수정한다. 과거 개발 DB 전용 migration/backfill/fallback·startup 자동 reset을 추가하지 않는다. 실제 DB 삭제는 별도 사용자 승인과 daemon 종료 확인이 필요하다.
- 각 구현 W에서 관련 테스트·타입 검사·빌드 등 필요한 검증을 수행한다. 자원 생성 또는 종료 신호 전송만으로 성공 처리하지 않는다. 실제 실행·실패·종료가 CLI와 Web consumer에 전달되는지 확인한다. 반복 드래그 이동 stress 검증은 완료 조건에 넣지 않는다.

### {W1}

- 완료: 공통 계약 owner 반영, Stage6 수신·담당 경계와 API 보완 1~4 합의를 확인했다. section·external 소유권·rename·미확인 notification snapshot/state·기존 read API를 확정했다. 읽음 포함 목록/dismissedAt/알림 DELETE 재제안은 최신 사용자 결정으로 폐기했다. W1은 문서 계약 완료이며 protocol·daemon·production·test·mock 구현 완료가 아니다.
- CLI 계약: Host spec과 Runtime spec의 CLI 표면을 대조해 전체 명령·인자·옵션, 대상 선택, 적용 범위, stdout/stderr·실패 종료 결과를 정리한다. `host run/list/status/stop/restart/delete`, `host agent start/stop/restart <agent-names...>`, 필수 `<host>`를 받는 `host network list/show/block/unblock/reset`을 빠뜨리지 않는다.
- YAML 계약: 한 파일의 한 Host·전용 Network 하나, Agent map, `host.instruction`, adapter·role·description·instruction·args, Network membership·routing, 파일 탐색·참조 검증·전체 예시를 owner에 연결한다. 적용 구성과 파일의 미적용 변경을 구분한다.
- Config·YAML·CLI 검증 순서: config → YAML → CLI 순서로 각 단계의 입력을 검증한다. 어느 단계든 실패하면 CLI로 원인을 알리고 이번 명령을 실패 종료하며 다음 검증 단계와 후속 자원 생성·실행을 진행하지 않는다. restart에도 같은 순서를 적용하며 기존 Host·Agent·shell·정책·화면은 유지한다. 세 단계 통과 후 설정 병합과 최종 shell 실행 환경 검증을 수행하고, 이때 실패해도 실행 전에 종료한다. 검증과 재적용을 구분해 기존 daemon 포트·terminal을 임의 변경하지 않는다.
- 데이터·저장 계약은 Storage/terminal의 Host·panel 저장 모델과 각 spec DTO를 따른다. YAML은 실행 선언, 홈 config.json은 전역 설정(사용자 재확인으로 appearance.theme 포함), SQLite는 적용 구성·배치·이력, 실제 process/PTY/binding/token은 실행 자원이다. Web theme은 localStorage에 저장하지 않는다. DB의 과거 기록을 생존 증거로 쓰지 않는다.
- API 계약: 조회·Host/Agent 실행 제어·Network 제어·shell 생성·탭 닫기/이동/분할·배치 저장·stopped 안내 해제의 실제 caller를 확인하고 필요한 요청/응답/오류 예시를 정한다. 요청 접수와 실제 실행 완료, 시작 실패와 정리 실패를 구분한다. CLI/Web이 공유하는 application 경로를 두며 Web에 모든 CLI 기능의 버튼을 강제하지 않는다.
- 통신 확정: HTTP로 명령·배치 변경을 요청하고 서버는 실제 관측·저장 반영 뒤 SSE state로 변경 자원의 조회 DTO를 직접 전달한다. 최초·재접속은 같은 SSE 연결의 전체 snapshot 뒤에 state를 전달한다. 별도 /api/web/state·ready·epoch/sequence·조회 헤더는 만들지 않는다. 개별 GET은 CLI·명시적 조회용이다. panel 배치·Agent 상태·terminal WS 입출력을 구분한다. React 내부 구현은 Stage6 책임이며 임시 HTML·JavaScript Web은 폐기 대상이다. 이동으로 shell·Agent를 재생성하지 않는다.
- 담당 합의: Stage5가 protocol DTO·daemon·persistence·config/backend를, Stage6가 React·화면 조작·terminal 연결을 맡는다. packages/protocol/src/index.ts와 apps/daemon/**는 Stage5 단독 수정, apps/web/**와 docs/specs/aiox-web-ui.md는 Stage6 소유다. 공동 configuration-web은 Stage5 API·DTO 절, Stage6 keybindings·저장 경계 절로 나눈다. 필요한 공유 변경은 먼저 제시한다. protocol 구현 착수는 API 보완안 합의 및 후속 작업 범위 확정과 구분한다.
- React 병렬 개발: 계약과 같은 응답·오류·상태 전환을 제공하는 최소 mock을 API 경계에 둔다. 컴포넌트에 고정 더미 데이터를 박거나 별도 완전한 가짜 서버를 만들 필요는 없다. terminal 실제 입출력·resize·shell 생존은 mock으로 검증했다고 보고하지 않는다.
- 완료 조건: owner에 구체 계약을 반영하고 요청→실행/저장→관측→조회/알림→React 표시 흐름을 복원할 수 있어야 한다. Stage6가 소비할 schema·응답/오류 예시·담당 경계와 실제 연결 시점을 인계한다. 미정 endpoint나 공유 파일 소유권을 추측한 채 구현을 양쪽에서 시작하지 않는다.
- 대상 식별 교정: Host spec의 이름 조회와 ID 제어 분리를 따른다. CLI/YAML 이름은 정확히 조회해 ID를 고정하고 Host·Host Network·persistent Network 자원 API는 ID만 받는다. 현재 persistent ID/이름 fallback은 W3/W6 구현 gap이며 Agent endpoint·MCP 이름/Runtime ID 계약은 별개다.

### {W2}

- 완료: 공통 입력 준비·config/YAML/CLI 검증 순서·layout·route·shell/cwd와 CLI 실패 차단을 구현하고 pnpm check 및 빌드 CLI smoke를 통과했다. 상세 근거는 History의 W2 입력 준비 구현·검증 완료와 docs/architecture/aiox-system.md의 Host 입력 준비 절을 따른다. 실제 Host 저장·실행은 후속 W 범위다.

### {W3}

- 완료: 공개 schema·타입의 선행 인계와 저장/조회/panel/config HTTP·Operation·SSE 기반을 구현·검증했다. 구현 위치·실제 인계 범위·검증·미구현 경계는 최신 W3 완료 기록과 system/storage-terminal architecture를 따른다. 다음 local 재개 지점은 W4다.
- 적용된 Agent 관리 구성은 현재 Runtime 및 terminal 연결과 분리해 저장한다. 탭이 없어도 관리 항목을 조회할 수 있고 파일 편집만으로 적용 구성이 바뀌지 않아야 한다. 종료 원인·표시 상태를 기존 다섯 activity status에 무리하게 합치지 않는다.
- 현재 pane 구성·탭 순서·연결을 저장·조회하는 공통 경로를 구현한다. Web 이동·분할과 CLI의 다음 Agent 배치가 같은 상태를 소비한다. 배치 변경은 terminalId나 프로세스를 교체하지 않는다. Copy 후 안내 해제의 재조회/복원도 W1 계약을 따른다.
- 완료 조건: 빈 DB 초기화·저장·조회·재오픈, API 입력 검증·실패, 변경 알림 후 재조회와 재접속 복원을 검증한다. DB 실패를 빈 상태로 숨기지 않는다. 기존 Web/terminal snapshot·stream 기능을 보존한다.
- 스키마 선행 범위: PanelView/layout 재귀 union/TabView/notice와 panel 요청 7종(생성·layout·shells·tab 삭제·dismiss·panel 삭제·rename), HostView/ManagedAgentView/runtime/lastExit/HostNetworkView/Source/Invocation, Operation/target/오류, config DTO·PUT body·stored 전체, SSE snapshot/state/fault, AgentView.executionOwnership을 포함한다. Host 명령 HTTP body(run/restart/resolve/개별 start·restart·stop/전체 stop·delete)도 공통 계약에서 누락하지 않는다. Network route와 알림 read, TerminalView/WebNotificationView/NetworkView는 기존 공개 스키마 재사용 여부를 확인한다. LayoutInput/Layout과 keybindings 등 참조 스키마·config effective/stored 구분도 함께 닫는다. SSE upsert는 resource별 DTO를 연결하고 remove는 value 없이 검증한다.
- 단일 스키마 권위: W2 config 검증과 W3 공개 zod schema가 별도 정의로 유지되지 않도록 기존 parseConfig/설정 타입·패키지 의존 방향을 대조한다. 이동·재사용이 필요한 부분을 맞추되 Stage6 apps/web에 영구 중복 스키마를 만들지 않는다. Stage6의 임시 정의 한 파일은 비차단 mock 준비용이며 인계 후 공개 package import로 교체한다. 실제 export 이름은 스키마 산출 시 확인해서 보고하고 지금 미구현 export를 사용 가능하다고 안내하지 않는다.
- 공통 순수 config/layout 검증은 packages/protocol/src/configuration.ts로 이동했고 config/schema.ts는 재export한다. packages/config/src/host.ts는 YAML 파일·참조·route 검증과 prepareHostInput을 소유하며 Host resolve가 이를 소비한다. 이후 실행 handler도 이 경로를 재사용한다.

### {W4}

- 선행: W1 계약 및 W2 실행 설정 검증, W3 연결 모델. 참조: Runtime spec의 일반 shell과 Agent 연결·종료, System architecture의 Host 실행 흐름, Storage/terminal projection 및 vendor binding 계약.
- Host Agent는 shell 안에서 실행한다. shell/terminal과 Agent 실행 수명을 분리하고 새 Runtime·credential·binding을 연결한다. 공통 Host instruction과 Agent instruction을 vendor 계약에 따라 합성하며 native 설정 파일을 자동 덮어쓰지 않는다.
- 준비 성공·시작 실패·종료를 실제 실행으로 관측한다. 명시 stop은 Agent와 필수 부속 실행만 종료하고 shell을 보존하며 stopped 표시를 전달한다. 정상 `/exit`은 같은 shell로 돌아간다. Copy는 명령 복사·기존 shell 표시이며 shell 생성이나 자동 실행이 아니다.
- 명령 입력 위치는 실제 panel/terminal identity로 확인하며 cwd만으로 동일 panel이라 판단하지 않는다. 사용자 일반 shell을 idle 추정으로 임의 점유하지 않는다. disconnect·무출력·quota를 종료로 간주하지 않는다.
- 완료 조건: shell 생존과 Agent 종료를 구분하고 준비/실패/종료가 CLI·조회·알림 경로로 전달되는지 검증한다. 기존 standalone 실행·terminal attachment·credential 정리의 회귀를 확인한다.
- W3 공개 schema·저장·HTTP/Operation/SSE 산출물과 검증은 최신 W3 완료 기록을 읽는다. 아직 Host run/Agent 실행 handler와 Host/ManagedAgent의 live Runtime projection은 미연결이다. Web Agent 소유권·공통 panel/terminal 정리·requestId/revision·실패 전달 경로를 재사용하고, 실제 vendor 준비 성공이나 React 연결 완료를 저장 성공으로 대체하지 않는다.

### {W5}

- 선행: W2~W4. 참조: Host spec의 실행 namespace·Network·초기 layout·시작 실패, 설정·Web spec의 Host panel UX.
- 외부 터미널·Web workspace·Network pane 어디에서 run하든 실행 Host의 별도 panel을 생성한다. Hosts의 [+]로 만든 사용자 workspace를 실행 대상으로 자동 선택하지 않는다. 같은 YAML·같은 host.name이 이미 있으면 stopped여도 중복 생성하지 않고 현재 상태와 start/restart 방법을 안내한다. daemon 범위 이름 충돌로 다른 Host를 덮어쓰지 않는다.
- 전용 Network와 membership·route를 올바른 Runtime ID에 연결한다. 일반 Network나 다른 Host의 동명 Network와 섞지 않는다. 초기 배치는 config/YAML/CLI의 유효 layout과 YAML 선언 순서를 소비한다.
- auto는 1개 전체·2개 좌우·3개 왼쪽+오른쪽 위아래·4개 이상 2×2다. left-main/top-main은 owner의 세 영역 배치, grid는 유효 치수다. 초과 Agent는 순환 탭으로 배치하며 불필요한 빈 pane을 만들지 않는다. 최초 선택 탭을 유지한다. 이는 shell/tab/pane 개수 상한이 아니다.
- YAML을 읽지 못해 Agent를 특정할 수 없는 실패는 CLI만 표시한다. 특정 Agent 시작 실패는 실제 원인을 CLI와 해당 탭에 전달한다. 실패 보상은 이번 시도가 만든 자원·변경에 한정하고 기존 Host·Network·사용자 shell을 보존한다. 정리 실패를 완전 rollback으로 보고하지 않는다.
- 최초 실제 사용 합류점: `aiox host run`의 config/YAML 해석→Host/Network→Agent 실행→React Hosts panel→TUI 입출력을 확인한다. Stage6가 mock을 실제 조회·알림·terminal API로 연결해야 화면에서 확인 가능하다. backend 성공만으로 React 연결 완료라 보고하지 않는다.

### {W6}

- 선행: W5. 참조: Host spec의 Routing과 변경·시작/재시작/정지, Runtime CLI, Web UX의 입력 위치·stopped 처리.
- 개별 start는 신규 또는 stopped Agent를 최신 YAML로 시작하며 실행 중이면 안내만 한다. 개별 restart는 실행 중 대상을 최신 정의로 다시 실행한다. 복수 Agent 이름을 지원한다. Network 이름/default가 현재 적용값과 다르면 기존 실행을 멈추기 전에 거절하고 전체 restart를 안내한다.
- 적용 route는 대상 Agent가 출발지 또는 목적지인 범위다. 그 범위는 최신 YAML이 이전 CLI 변경을 대체하고 다른 Agent 간 정책은 보존한다. 뒤이은 CLI 변경은 다시 그 범위를 덮어쓴다. Host Network 명령의 `<host>`는 필수이며 생략/미등록을 YAML 선택으로 대체하지 않는다. block=명시 deny, unblock=명시 allow, reset=현재 적용 YAML 복귀다.
- 같은 Host panel의 shell에서 실행하면 첫 Agent는 입력 자리, 나머지는 현재 pane 순서로 배치한다. 외부/다른 panel은 대상의 재사용 가능한 stopped 자리 또는 순차 새 탭을 사용한다. 사용자 추가·이동·삭제·분할 후 현재 pane의 위→아래·왼쪽→오른쪽 순서를 따르며 기존 위치·선택을 재정렬하지 않는다.
- 다른 shell에서 같은 Agent를 시작하면 새 TUI 연결 성공 후 옛 stopped 탭을 제거한다. 실패하면 새 자리 실패 표시와 옛 stopped 탭을 유지한다. 이미 Copy 또는 /exit으로 일반 shell이 된 탭은 보존한다. Copy 명령은 실행 시점의 YAML을 그대로 선택하며 원래 Host를 강제하지 않는다.
- 완료 조건: 관련 route만 변경, Network 변경 사전 거절, stop 후 shell/Network/정책 보존, 위치 선택과 성공/실패 시 옛 탭 처리의 서버 결과 및 Stage6 표시 연결을 확인한다.

### {W7}

- 선행: W6. 참조: Host spec의 전체 restart 구성과 탭·stop/delete 종료 경계, Runtime CLI와 Web UX.
- 전체 restart는 config/YAML 전체 사전 검증 뒤 실행을 교체한다. 읽기·검증 실패는 CLI 오류이며 기존 실행·정책·화면을 그대로 둔다. 과거 설정으로 새 실행을 만드는 fallback이 아니다. 같은 Host는 최신 전체 구성과 route를 적용한다. host.name 변경은 기존 Host를 남기고 별도 Host/panel/Network를 실행한다.
- 같은 Agent key의 재사용 가능한 자리는 유지한다. 새 key는 추가하고 제거된 key는 종료한다. 이름 변경은 삭제+추가다. 제거된 Agent 전용 shell 또는 stopped 안내 뒤 shell은 종료 확인 후 탭과 함께 제거한다. 이미 일반 shell로 복귀한 탭과 사용자 추가 shell은 보존한다. 현재 pane 배치를 초기 preset으로 되돌리지 않는다.
- Host stop은 관리 YAML Agent 프로세스와 필수 부속 실행을 종료하며 shell·panel·Network·적용 정책을 유지한다. 실행 credential·binding·활성 membership은 정리한다. delete는 busy/idle에 관계없이 panel 소유 프로세스와 사용자 shell의 작업까지 종료 확인 후 Host·panel·Network를 제거한다. 외부 terminal·다른 Host·YAML·프로젝트 파일은 건드리지 않는다.
- stop/status/delete는 `[hostname]` 직접 지정 시 YAML 없이 등록 Host를 선택하고, 생략하면 YAML 선택 규칙을 따른다. delete의 hostname과 `--file` 동시 지정은 거절한다. 옛 Host·파일이 사라진 Host도 이름으로 조회·제어할 수 있어야 한다. list/status가 실제 실행과 적용 구성을 보고하도록 마무리한다.
- 완료 조건: 사전 오류 보존, Host 이름 변경, Agent 증감, 사용자 shell 보존과 delete 정리 범위, 종료 실패 진단·재시도 가능한 대상 유지를 검증한다. 신호 전송만으로 panel을 먼저 없애지 않는다.

### {W8}

- 선행: W5 최초 연결과 W6/W7 backend, Stage6의 해당 React consumer. W1 계약 및 owner UX를 기준으로 mock을 실제 응답으로 교체하고 실제 CLI→daemon→저장/관측→Web 전달을 확인한다.
- 검증: 최초 run·config/YAML 오류, 개별/전체 restart·stop·delete, /exit·Copy·실패 표시, 사용자 변경 배치에서의 새 Agent 추가, 브라우저 재접속, 실제 terminal 입력/출력·resize·shell 생존. 반복 이동 stress 검증은 추가하지 않는다.
- stopped ×는 기반 shell·탭 정리, running Agent ×는 확인과 종료 검증, 마지막 탭은 빈 pane/panel과 [+] 유지라는 UI 계약을 Stage6와 대조한다. UI 구현 자체는 Stage6 담당 범위다.
- OS별 공통 로직과 기존 지원 경계를 확인하고 실제 실행한 플랫폼·미실측 범위를 구분해 보고한다. 검증 결과와 변경된 owner 문서를 맞추고 모든 완료 조건이 충족된 뒤 로그 종료를 판단한다.

## 2026-09-21 · Stage5 구현 작업 구조

사용자 승인으로 기존 논의·제안·정정 누적 본문을 구현 Work Items와 scope로 대체했다.
기존 W1의 Host 구현 수명을 유지하면서 공통 계약부터 진행하도록 구체화하고 후속 W2~W8을 분리했다.
2026-09-21에 확정한 CLI·YAML 선택·restart·stop/delete·Network 수명·shell UI·layout 정책의
본문은 각 owner 문서를 기준으로 소비한다. 과거 11:36의 경로·adapter 논의 등을 언급하는 외부
기록은 당시 경위 참조이며 현재 CLI/YAML 정책은 W1/W2와 owner가 가리키는 최종 계약을 따른다.

현재 재개 지점은 W1이다. 공통 API·저장 schema의 구체 설계와 Stage6 담당 경계 확정은 아직
수행할 작업이며 이번 로그 재구성으로 완료 처리하지 않았다. Host 코드 구현·React 연결·OS 실측은
이번 갱신에서 수행하지 않았다. Stage6 로그와 plan의 단계 상태는 변경하지 않았다.

## 2026-09-21 · W1 공통 계약 작성과 Stage6 인계 대기

### 요청·수행 범위

사용자가 Stage5 W1을 직접 지정했다. 다른 onramp 단계로 전환하지 않았고 기능 코드·테스트·mock·plan·Stage6 로그는 수정하지 않았다. 기존 사용자/타 agent 변경은 유지했다. 이 기록은 계약 작성 결과이며 상대 agent에게 메시지를 보냈거나 수신·동의받았다는 뜻이 아니다.

### 확인한 사실과 설계 결과

- 확인: `apps/cli/src/cli.ts:230-261`은 과거 Host parser 표면이며 `bootstrap.ts:223-231`과 `bootstrap.test.ts:663-679`는 Host unavailable 경로다. 실제 Host 실행·저장은 미구현이다.
- 확인: `packages/config/src/schema.ts`와 인접 테스트는 치수 없는 grid를 허용한다. W2 교정 대상으로 명시했고 현 동작을 확정 정책의 근거로 삼지 않았다.
- 확인: HTTP는 daemon/Web 공통 handler, WebEvents는 invalidation SSE, Web main/attach는 조회와 terminal snapshot/stream을 소비한다. persistence에는 아직 Host/panel/Operation 저장이 없다. 해당 code·test 근거는 아래 architecture에 연결했다. 이번 세션에서 기능 테스트를 실행한 것은 아니다.
- 설계: 기존 transport를 유지하고 Host 실행/종료의 202 Operation·조회와 panel revision 저장을 추가했다. 관리 구성, live Runtime, tab 표시를 분리하여 탭이 없어도 관리 Agent를 조회한다. 협업 준비 실패 뒤 살아 있는 vendor와 실제 종료된 시작 실패의 화면을 구분했다.
- 충돌 해결: Stage5/owner의 localStorage theme과 Stage6의 전역 config 확정 기록이 충돌했다. 사용자에게 차이를 제시했고 사용자가 Stage6 기록대로 전역 config를 선택했다. appearance.theme을 owner와 W1 context에 반영하고 설정 watcher/SSE 대신 이미 확정된 조회·저장 모델 B를 맞췄다. 영어 UI 확정과 충돌하는 같은 owner의 다국어 제안도 정리했다.

### 계약 인계 읽기 순서

1. `docs/specs/aiox-host.md`의 Host 입력 schema·적용 snapshot·Host HTTP: YAML 전체 필드/참조/기본값, 요청·응답, 관리 Agent와 Network DTO.
2. `docs/specs/aiox-runtime.md`의 Host 명령 검증과 완료 응답: 명령별 YAML 소비, config→YAML→CLI, 출력/종료 코드, Operation·오류·부분 실패.
3. `docs/specs/aiox-configuration-web.md`의 W1 config·Panel HTTP·React DTO: 배치 tree/탭, shell 생성/이동/닫기/Copy, SSE/WS, mock 상태 전이·예시.
4. `docs/architecture/aiox-storage-terminal.md`의 Host·panel 저장 모델: 관계/논리 테이블/transaction/브라우저와 daemon 재시작의 차이.
5. `docs/architecture/aiox-system.md`의 Host 명령에서 React까지: 요청→검증→실행·저장→관측→응답/알림/조회→표시와 각 실패 분기.

Collaboration의 MCP 인증·현재 membership/route 재검사와 Vendor bindings의 instruction·execution owner 경계는 확인 후 그대로 소비한다. 해당 owner의 정책을 새 API에서 다시 정의하지 않았다. 기존 product/roadmap·execution ownership decision과 문서 지도는 이 범위·연결을 이미 소유하므로 변경하지 않았다. 디자인 프롬프트는 UI 입력 자료이며 owner/실제 구현 근거로 승격하지 않았다. HTML 목업 실조작 리뷰는 이번 계약 작성 범위에서 수행하지 않았다.

### 병렬 작업 담당 제안 — 상대 수신·동의 미확인

| 파일/책임 | 제안 담당 | 인계·수정 규칙 |
| --- | --- | --- |
| `packages/protocol/src/index.ts`와 인접 tests | Stage5 | DTO/schema/path 단일 작성자. Stage6는 공개 package entry로 소비하고 변경 요구를 전달 |
| `packages/config`, `packages/persistence`, `apps/cli`, `apps/daemon` | Stage5 | W2 입력→W3 저장/조회/배치/Operation→W4 실행/관측. 공통 config HTTP도 이 경계 |
| `packages/terminal` 및 vendor 공통 연결 | Stage5가 필요한 변경 조율 | 기존 Stage3/4 담당 변경 확인 후 최소 변경. Stage6가 Node terminal 구현을 직접 수정하지 않음 |
| `apps/web`의 React, API 경계 mock, xterm attachment·화면 조작 | Stage6 | 동일 DTO/오류/전이를 mock으로 소비. 기존 attach의 snapshot/ack/response 의미 보존 |
| 루트 package/lockfile, 공통 owner 문서 | 필요 변경을 제안한 담당이 범위를 먼저 공유 | 같은 파일 동시 overwrite 금지. package lock 변경은 공통 담당 확인 후 통합 |
| Host·Runtime spec/System·Storage owner | Stage5 중심 | 공통 계약 변경은 Stage6 소비 영향과 함께 전달 |
| Configuration-Web owner | Stage5의 API/config 계약과 Stage6 UX가 공동 소비 | 본 W1 작성 이후 수정 절을 먼저 알리고 최신 파일 위에 국소 반영; Stage6 log는 해당 담당만 수정 |

인계 순서는 (1) 상대가 위 계약·경계를 읽고 수신/충돌 기록, (2) Stage5가 protocol 최소 DTO를 먼저 제공하고 Stage6가 API 경계 mock으로 병렬 착수, (3) W3 실제 조회/배치/오류로 교체, (4) W5 `aiox host run`→실제 React Host panel→Agent TUI 입출력 최초 합류, (5) W6/W7 제어 연결 뒤 W8 전체 흐름 확인이다. 서버 ready만으로 W5 합류를 완료 처리하지 않는다. mock으로 실제 PTY·vendor·resize·shell 생존 검증을 대체하지 않는다.

### 완료 범위·남은 일

W1의 문서 계약 작성은 완료했다. 상대 수신·공유 파일 담당 동의는 미확인이므로 W1 marker는 active로 유지한다. W2~W8은 미착수다. 새 구현을 사용자에게 승인받는 단계로 재해석하지 않으며 이 로그의 W1 후속은 담당 간 소비 확인이다.

남은 제품 정책 결정은 이 Host 계약에서 새로 만들지 않았다. Stage6의 기존 후속인 OS별 keybindings wire/Windows·Linux 기본키, 상세 설정 UI 확장, Network workspace 화면 모델 owner 반영은 Stage6가 소유한다. 이미 확정된 단축키 방향·모델 B·전역 theme을 미결로 되돌리지 않는다. Host 제어 계약과 무관한 UI 정책을 이 W1에서 임의 확정하지 않았다.

다음 Stage5 작업: Stage6 수신·담당 경계 확인을 기록하고 W2 config/YAML/CLI 검증·layout 구현으로 진행한다. 다음 Stage6 작업: owner DTO/오류/상태 전이로 최소 API mock을 연결하고 W3 실제 API 교체 및 W5 TUI 합류를 준비한다. 이번에는 실제 상대 agent에게 전송하지 않았으며 이 문서와 최종 보고가 인계 자료다.

### 2026-09-21 17:25 · 문서 검증과 계약 누락 보완

5개 owner의 fence 짝, JSON 예시 7개의 JSON 파싱, 이번 추가 wikilink 대상 존재를 검사했다. `git diff --check`와 Stage5 `log check`를 통과했다. 시나리오 표를 실제 API/저장/관측/React consumer와 대조하고 shell 자체 생성 실패의 terminalId null·Copy 비생성, 정리 미완료 후 start 거절/stop·delete 재시도, 같은 terminal의 직접 종료 시 tab 정리를 보완했다. 코드·테스트·mock은 수정/실행하지 않았으며 문서 검증을 기능 통합 통과로 보고하지 않는다. Stage6 로그·다른 agent 변경·plan은 쓰기 대상에서 제외했다. commit/push도 하지 않았다.

### 2026-09-21 17:31 · W1 대상 이름·ID 충돌 교정

사용자가 Host API의 ID 우선·이름 fallback이 다른 Host의 ID와 같은 이름을 잘못 선택할 수 있다고 지적했다. 이름에 ID 형식을 금지하지 않는 입력 계약과 실제 조회 규칙을 대조해 타당한 결함으로 판단했다. 현재 persistent NetworkService.find와 CLI 직접 전달에도 같은 해석이 있음을 확인했다. 이는 문서/코드 확인이며 실제 잘못된 삭제를 실행한 실측이 아니다.

Host owner에 정확한 이름 query 조회→얻은 ID로 제어하는 계약을 반영했다. Host·Host Network 및 persistent Network의 자원 path는 ID 전용이고 이름 fallback을 제거하는 목표다. CLI positional은 ID처럼 생겨도 이름이며 YAML host.name도 정확한 이름으로 해석한다. Web은 조회 DTO ID를 사용한다. Host Network ID는 해당 Host 소속까지 검사한다. 조회 후 삭제·동명 재생성이 일어나도 고정한 옛 ID로 실패하며 새 자원으로 자동 재대상화하지 않는다. Runtime spec의 CLI 설명도 같은 계약으로 맞췄다. Agent route endpoint/MCP의 명시적 이름·Runtime ID 계약은 변경하지 않았다.

검증: 문서의 :host/:network 혼합 path가 남지 않았고 남은 ID 우선 문구는 Agent endpoint 계약과 persistent 현재 구현 gap뿐임을 확인했다. Host A(id=h1,name=alpha), B(id=h2,name=h1)에서 CLI h1은 B만 선택하고 B 부재 시 A로 fallback하지 않는 반례를 owner에 남겼다. W3 공통 조회·W6 Host Network 구현에서 persistent 경로도 이 분리와 함께 맞춰야 한다. production 코드·테스트는 수정하지 않았다. Stage6 수신·담당 합의 미확인과 W1 active 상태는 유지한다.

### 2026-09-21 18:03 · W1 API·SSE 재검토 — React 기준 개선 후보

- 사용자 확인: 현재 임시 HTML·JavaScript Web은 React 전환 때 폐기한다. 기존 Web consumer의 전체 재조회 구현은 새 React 계약을 유지하는 근거가 아니다. 이번 요청은 API 검토이며 production·test·mock·Stage6 로그·plan은 수정하지 않았다.
- 확인한 사실: configuration-web:485-490은 payload 없는 change 뒤 Host/panel/terminal/Operation 등을 재조회한다. daemon WebEvents도 data:{}를 보내며 느린 연결은 끊는다(web-events.ts:3-36). HostView.revision은 적용 구성·route 변경만 포함한다(host:437-439). runtime:449-455는 requestId 중복 방지와 Operation 복원을 정하지만 source 파일 변경·대상 삭제 뒤 동일 요청 재전송의 판정 순서는 정하지 않는다.
- 검토 결과/필수 보완 후보: (1) SSE 연결이 유지된 채 GET만 실패하면 후속 변경 없는 상태에서 복구가 보장되지 않는다. 실패한 초기 동기화·재조회에 한정한 retry와 동기화 실패 표시를 명시해야 한다. (2) Host/panel/terminal의 독립 조회는 서로 다른 시점의 결과를 결합할 수 있다. 최초·재접속의 snapshot 경계, 구독 연결 순서, 동기화 중 이벤트 처리와 HTTP/SSE 역전 방지 규칙이 필요하다. 현재 Host revision은 실행 관측 변경의 순서 판정에 사용할 수 없다. (3) accepted requestId 재전송은 원 Operation으로 복원하고 변경된 YAML 재적용·삭제된 대상 재생성을 유발하지 않아야 한다. body 동일성, 보존 만료와 중복 판정 순서를 명시해야 한다. (4) panel 비동기 shell 생성/닫기와 Host 제어의 충돌은 revision 검사 시점만으로 충분하지 않다. 실행 전 대상 예약과 commit 재검사, 충돌 후 생성 shell 보상·실패 전달을 W3/W4 계약으로 닫아야 한다.
- 설계 제안(미확정): 새 React는 HTTP 명령 + SSE의 변경 자원 DTO 직접 전달 + 최초/재접속 snapshot 조회를 우선 검토한다. 임의 field patch 대신 조회와 같은 DTO를 사용하고 삭제 식별·변경 순서·daemon 재시작 경계를 포함한다. 관련 Host/panel/terminal/Operation 변경은 같은 상태 반영 단위로 전달하여 화면을 갱신한다. 영구 이벤트 log/replay나 주기적 전체 polling을 추가할 필요는 현재 확인되지 않았다. config의 확정된 조회·저장 모델과 terminal WS stream은 유지한다. 상세 wire/권한 필터/구독 범위는 owner 수정 시 함께 구체화해야 하며 본 검토로 새 API 합의 완료를 주장하지 않는다.
- 추론과 한계: 다중 GET과 불필요한 목록 재조회는 계약에서 확인되지만 실제 부하·지연 수치는 측정하지 않았다. 현재 구현의 성능 결함으로 단정하지 않는다. SSE 직접 전달은 추가 GET 제거와 React 소비 단순화를 위한 제안이며, version·snapshot 계약 없이 전송 형식만 바꾸는 것은 개선 완료가 아니다.
- 다음: 위 후보를 owner 계약에 반영할 때 configuration-web(전송·React), runtime(Operation·중복 처리), host(조회 DTO), storage-terminal/system(관측·공개 경계)을 함께 정합화한다. 이번에는 검토 결과만 기록하며 W1 active·Stage6 수신/담당 합의 미확인은 유지한다.

### 2026-09-21 18:08 · API 검토의 도달 가능성 재판정

- 사용자 질문에 따라 앞선 위험 설명을 재검토했다. 네 항목을 모두 현 계약의 확인된 결함처럼 묶는 것은 부정확하다. 실행 재현은 하지 않았으며 아래는 계약·코드 대조 판정이다.
- 오래된 HTTP 응답 도착은 가능하지만 configuration-web의 현 계약은 이미 늦은 응답 덮어쓰기 금지와 dirty 재조회를 명시한다. SSE 상태 DTO와 GET 응답의 역전 사례는 새 직접 전달 설계에서 정할 사항이지 현재 빈 change 이벤트의 결함이 아니다.
- 탭 닫기 예시는 shell 준비·배치 저장 후 공개, 실제 종료 뒤 tab 제거, revision/expectedRuntimeId 검사와 Host 제어 직렬화 규칙을 충분히 반영하지 않았다. 생성 중 미공개 탭을 사용자가 닫는 단순 예시는 현 계약의 도달 가능한 반례로 철회한다. 기존 탭 start와 close의 공유 직렬화 범위는 구현 시 확인할 경계이나 고아 프로세스 발생을 입증한 것은 아니다.
- SSE 연결 유지 중 별도 HTTP 조회 실패는 독립 경로이므로 도달 가능하다. 후속 change/재접속/사용자 재조회가 없으면 복구 trigger가 부족하다. 실패한 동기화의 재시도 규칙 보완 후보는 유지한다. 실측 빈도·성능 문제는 주장하지 않는다.
- 접수 뒤 응답 유실 및 동일 요청 재전송은 가능하지만 runtime의 requestId 중복 방지가 이미 중복 실행을 금지한다. 새 중복 방지 기능이 필요하다는 주장은 철회하며 기존 보장 구현·검증 대상이다. YAML 변경/삭제 이후 재전송도 기존 Operation 복원 보장을 따르는지 확인할 사례로 좁힌다.

### 2026-09-21 18:23 · HTTP 명령·SSE 상태 직접 전달 계약 반영

- 사용자 합의: 최종 탭 이동·분할 배치는 HTTP 요청으로 검증·저장하고 변경 상태는 SSE로 전달한다. panel 변경은 배치·탭 정보이며 Agent status 변경과 구별한다. terminal 화면 입출력은 기존 WS를 유지한다. React 구현은 이번 작업 대상이 아니다.
- 반영: configuration-web에 resource별 완전 DTO upsert/remove, ready/state 예시, 실제 관측/commit 뒤 발행, 초기·재접속 state snapshot과 epoch/sequence 경계를 명시했다. Host DTO와 Operation 소비 계약, System 흐름, Storage 공개 경계를 함께 맞췄다. 초기 snapshot endpoint와 순번 wire는 합의한 복원 보장을 구체화한 이번 설계이며 현재 구현 완료를 뜻하지 않는다.
- 범위: 기존 notification 조회/읽음 필터와 config 조회·저장 정책은 유지한다. 영구 이벤트 replay·전체 polling·React 코드·production/test/mock은 추가하지 않았다. 과거 빈 change 방식은 현재 구현 근거로 남기고 새 목표와 구분했다.
- 인계: Stage5는 W3 공통 DTO/공개 경계와 후속 실제 관측을 연결한다. Stage6는 갱신된 owner 계약을 소비하되 상대 agent의 수신·담당 합의는 여전히 미확인이다. W1 active와 plan 활성 단계는 변경하지 않는다.

### 2026-09-21 18:47 · SSE 단일 연결 snapshot·state로 초기 동기화 단순화

- 사용자 확정에 따라 최초·재접속은 SSE 전체 snapshot, 이후는 같은 연결의 state로 전달한다. HTTP 명령/응답·CLI 및 명시적 GET·terminal WS는 유지한다.
- configuration-web/runtime/host/system/storage-terminal의 현재 목표를 수정했다. 이전 기록의 /api/web/state, ready, epoch/sequence와 조회 헤더 설계는 이번 결정으로 대체한다. snapshot 이후 변경 누락 방지와 송신 순서는 서버 책임이며 snapshot 실패를 빈 정상 상태로 위장하지 않는다.
- 코드·테스트·mock·Stage6 로그·plan은 수정하지 않았다. W1 active와 상대 수신/담당 합의 미확인은 유지한다. 다음 Stage5 구현은 갱신된 서버 계약을, Stage6는 동일 snapshot/state DTO를 소비한다.

### 2026-09-21 23:38 · Stage6 수신·담당 합의 확인과 API 보완 4건 제안

- 회신 근거: 사용자가 전달한 Stage6 검토에서 snapshot/state·HTTP·terminal WS·config 예외와 파일별 담당 경계 수용을 확인했다. 이전 수신/담당 합의 미확인은 해소했고 API 보완 합의는 별개로 남긴다. 코드·테스트·mock·Stage6 로그·apps/web·plan은 수정하지 않았다.
- 대조 사실: web-ui의 세 섹션 +는 사용자 panel 생성이며 section만 다르다. 현재 PanelView/POST에는 그 구분이 없다. runtime registry에는 executionOwnership daemon/external이 있으나 AgentView에는 없고 /api/web/agents는 external을 제외한다. Rename 화면 동작에 대응하는 endpoint가 없고 새 state/snapshot에 notification이 없다. 기존 change 유지 문구는 남아 있으나 새 통신에서 알림만 별도 재조회하는 예외보다 통합 DTO 전달로 정리하는 안이 적합하다.
- 제안 1(미합의): PanelView.section = workspaces|networks|hosts를 별도 필드로 둔다. kind는 workspace|network|host의 생성·수명 정책으로 유지한다. POST /api/panels {name,section}은 어느 섹션이든 kind workspace를 만든다. CLI Host/Network panel은 각 hosts/networks로 서버가 지정한다. section은 표시 위치이며 Network/Host 생성·membership을 만들지 않는다. 현 DB schema에 직접 저장하고 최초 SSE snapshot과 panel upsert로 보낸다. section 이동 API는 요구가 없어 추가하지 않는다.
- 제안 2(미합의): 기존 AgentView에 executionOwnership:daemon|external을 노출하고 별도 카드 API는 만들지 않는다. /api/web/agents와 SSE agents/agent는 외부 CLI 실행도 포함한다. 기존 agentId/hostId/networkId로 식별·연결하고 external은 terminalId:null, panel/tab/조작·Web 알림 대상에서 제외한다. 외부 실행의 표시 상태와 AIOX 준비 조건은 기존 runtime owner를 유지한다. 소속 host/network가 없는 external의 카드 배치는 DTO 필드 누락과 별개인 UI 정책이므로 임의 workspace를 생성하지 않는다.
- 제안 3(미합의): PUT /api/panels/:id/name {revision,name} → 200 PanelView, revision 증가와 panel upsert. POST 이름 검증을 재사용한다. stale revision은 409 revision_conflict, 없음은 404, kind host/network는 400 invalid_request. 사용자 panel(kind workspace)은 section과 무관하게 rename 가능하고 CLI Host/Network 이름을 연쇄 변경하지 않는다.
- 제안 4(미합의): snapshot.notifications에 미읽음 WebNotificationView[]를 추가하고 state resource notification을 추가한다. 신규 미읽음은 upsert, 읽음 처리·retention 삭제로 미읽음 집합을 벗어나면 remove. 기존 POST /api/web/notifications/read {ids?}와 {read} 응답을 유지하고 commit 뒤 영향을 받은 ID들을 remove로 전달한다. remove는 DB 알림 삭제/필수 알림 해소가 아니라 Web 미읽음 집합 제거다. originExecutionOwnership=daemon 필터를 조회·snapshot·state·읽음 처리에 동일 적용하며 external 알림은 포함하지 않는다. 임시 Web용 change는 현재 구현 사실로 남기고 새 React 계약에서는 제거한다.
- Stage6 소비 방식: 서버 confirmation_required 뒤 명시 확인 재요청, 4방향 기존 탭 layout PUT, 배치 weights와 terminal resize 분리, terminalId 알림 점프, config watcher 없음은 계약과 부합한다. config_conflict 재시도는 최신 stored에 사용자가 바꾼 필드만 재병합하고 새 revision으로 보내며 오래된 stored 전체를 덮지 않는다. 미접수 confirmation_required 뒤 확인 재전송은 새 명시 요청이며 새 requestId를 쓰는 것으로 정리한다. API 응답 유실 재시도와 구분한다.
- W2는 keybindings와 web.sidebar.open 검증을 명시했다. W1은 API 제안 합의 대기로 active를 유지하고, 합의 전 owner API/protocol/daemon은 수정하지 않는다. 향후 코드 수정 요청은 원래 W1 문서 전용 범위와 구분하여 착수한다.

### 2026-09-21 23:49 · Stage6 3건 수용 반영·알림 읽음 모델 재제안

- 사용자 범위 재확인: 이번에는 W1 계약 확정만 수행한다. 앞 회신의 protocol·daemon 진행을 기능 구현 착수로 해석하지 않는다. production/test/mock·Stage6 로그·apps/web·plan·commit/push는 이번 작업 대상이 아니다.
- 수용 반영: kind와 section을 분리하고 host→hosts/network→networks 불변식, 사용자 POST section 생략 workspaces를 명시했다. section 변경 API는 없다. 사용자 panel name은 ECMAScript trim 후 Unicode code point 1~128자, C0/DEL 제어 문자 금지, 중복 허용으로 정했다. rename은 kind workspace만, revision 충돌 보호·panel upsert를 사용한다. section/name 저장 경계도 storage owner에 연결했다.
- external 사실 대조: 공개 externalAgentRunSchema는 hostId를 받지 않고 agent-controller도 전달하지 않는다. daemon.registerRuntime은 external terminal 귀속을 거절한다. 그러나 RegisterRuntime.hostId가 있고 RuntimeRegistry가 그대로 저장하므로 모든 내부 경로에서 external hostId:null이 이미 강제된 것은 아니다. 목표 계약은 external의 hostId/terminalId null이며 공통 등록 경계에서 잘못된 귀속을 거절한다. AgentView.executionOwnership과 외부 실행을 포함하는 Web/SSE 조회·관측 알림 경로를 owner에 명시했다. networkId 없는 external을 위해 임의 카드·panel을 생성하지 않는다.
- 명확화 반영: confirmation_required 뒤 confirm:true는 새 requestId, Operation 없는 사전 거절과 동일 body 응답 유실 재전송을 구분한다. config 충돌은 최신 stored에 이번 변경 필드만 병합한다. keybindings·web.sidebar.open W2 scope는 유지한다.
- 알림 반려 수용: 이전 미읽음 snapshot/remove 제안은 web-ui의 읽음 포함 목록과 충돌한다. 아래 재제안은 아직 합의 전이며 owner의 알림 목표를 완료로 바꾸지 않았다.
- 알림 재제안: snapshot.notifications와 GET /api/web/notifications는 보존 중이고 사용자가 제거하지 않은 WebNotificationView 전체(읽음 포함)를 반환한다. unread는 readAt===null로 판정한다. 생성·읽음 변경은 notification upsert, 개별 제거·retention 만료는 remove다. 기존 POST /api/web/notifications/read {ids?}와 {read}는 유지하고 이미 읽은 항목의 readAt은 바꾸지 않는다. ids 생략은 현재 표시 가능한 Web 알림 중 미읽음 전체다. 외부 CLI 알림 필터는 조회·snapshot·state·읽음·개별 제거에 동일 적용한다.
- 개별 제거 재제안: DELETE /api/web/notifications/:id → 204, DB 변경 commit 뒤 notification remove. 읽음 여부와 무관하게 제거 가능하며 제거는 읽음/업무 해소가 아니다. 원본 필수 알림·delivery 기록을 지우지 않도록 Notification 저장 행에 dismissedAt nullable을 현재 schema로 직접 추가한다. 목록 조회는 dismissedAt null만 포함하고 readAt은 보존한다. 반복 DELETE는 원본이 남아 있으면 204; 없는 ID/외부 CLI 알림은 404, 저장 실패는 500과 기존 목록 유지다. 일괄 삭제는 추가하지 않는다.
- 보존·조회 재제안: 별도 Web 기간/개수 설정이나 개수 절단은 추가하지 않고 messages.retentionDays(기본 30)를 기존 메시지 이력 보존 기준대로 적용한다. 현재 purge는 메시지 전체 delivery가 terminal이고 마지막 outcomeAt이 cutoff보다 오래된 경우라 진행 중 메시지의 알림은 30일을 넘어 남을 수 있다. 생성 후 정확히 30일인 별도 Web 만료를 만들지 않는다. 이것은 기간 기준 정책이며 하드 개수 상한은 없다. unreadNotifications 외에 보존된 비-dismissed Web 알림 조회·dismiss 저장 경로가 필요하다. UI 제거 상태도 DB에서 복원하므로 재접속 snapshot에 되살아나지 않는다. 영구 이벤트 log나 과거 DB migration은 추가하지 않는다.
- 다음: 알림 재제안 합의 후 configuration-web의 notification resource/HTTP, storage의 조회·dismissedAt·보존 경계, snapshot 예시와 전달 흐름을 함께 반영한다. 새 계약은 snapshot/state만 사용하며 알림용 change 예외를 제거할 예정이다. 이번에는 알림 규격을 확정으로 선반영하지 않았다.

### 2026-09-21 23:54 · API 보완 최종 합의 반영·W1 계약 완료

- 사용자가 전달한 Stage6 최종 회신에서 1~3 및 알림의 미확인 단일 목록 결정을 확인했다. 최신 web-ui 알림 절은 클릭 후 제거·Clear all·개별 × 없음이며 그 owner는 수정하지 않았다. Host branch/worktree 필드는 추가하지 않는다.
- configuration-web에 snapshot.notifications 미확인 목록, 생성 upsert·읽음/보존 만료 remove, 기존 GET/read endpoint, ids 하나와 ids 생략 Clear all, 읽음 실패·반복 확인·external 필터·보존 기준을 확정했다. 별도 change 예외는 제거했다. Storage는 unreadNotifications/markRead 재사용과 원본 보존·remove 공개 경계를 반영했다. dismissedAt·DELETE·보존 목록 조회·개별 제거 저장 경로는 이전 재제안이며 후속 구현 대상에서 제외한다.
- 사실/목표: 지금 구현이 새 snapshot/state를 제공한다는 뜻이 아니다. external hostId 공통 검증도 목표이며 공개 경로와 내부 허용의 차이는 앞 검증 그대로다. 1~3은 최종 수용으로 확정했고 W1의 상대 수신/담당 경계/API 보완 합의가 모두 닫혔다.
- 검증: 변경 owner 문서의 JSON/SSE 예시와 fence, diff whitespace, 로그 형상을 확인한다. 기능 코드·테스트·mock·Stage6 로그·apps/web·plan은 수정하지 않고 commit/push하지 않는다.
- 완료/인계: W1 계약 작성과 상대 수신·합의 완료로 Work Item을 완료한다. 전체 Stage5 로그는 W2~W8 미완료이므로 open을 유지한다. 다음 Stage5 범위는 W2 config/YAML/CLI 검증이며 이번 턴에 착수하지 않는다. Stage6는 확정 API와 자기 UI owner로 사용자와 화면 설계를 논의한다. 실제 서버·React 합류 검증은 W5다.

### 2026-09-22 00:34 · W3 첫 산출물을 protocol 스키마·타입 인계로 조정

- 사용자 요청은 지금 구현이 아니라 W2 완료 후 W3 산출물 순서 조정이다. W3는 protocol zod schema/타입/export를 먼저 제공하고 그 뒤 핸들러·persistence를 진행하도록 scope를 갱신했다. W1 완료·W2/W3 상태와 plan 활성 단계는 바꾸지 않았다.
- 요청 목록 대조: panel 요청은 나열 기준 7종이며 rename을 포함한다. Host DTO/Source/Invocation 외에 Host HTTP 명령 body도 별도 검증 대상이므로 포함한다. 기존 Network route·알림 read·TerminalView·WebNotificationView·NetworkView는 중복 생성하지 않고 재사용 여부를 확인한다. SSE state는 resource별 upsert value를 정확히 연결하고 remove에는 value를 두지 않는다. config의 W2 parser와 W3 스키마도 두 권위로 남기지 않는다.
- 인계 방식: 실제 export 이름과 파일 경로, @aiox/protocol import 예시, 제공 범위와 미구현 서버 경계를 함께 알린다. Stage6는 임시 정의 한 파일로 mock을 먼저 준비할 수 있으며 이 인계는 비차단이다. 아직 스키마 산출물은 만들지 않았다.
- 이번 변경은 Stage5 로그뿐이다. Stage6 로그·apps/web·plan·production/test·commit/push는 변경하지 않았다.

## 2026-09-22 · W2 재개 범위 확인

- 사용자 요청에 따라 onramp와 최신 기록·Work Items·W2 Required Context를 확인했다. W1은 문서 계약 완료이며, W2를 현재 재개 지점으로 지정했다.
- 이번 작업은 할 일 보고까지다. 구현·테스트는 수행하지 않았다. 기존 구현의 충족 여부는 아직 판정하지 않았다.
- 다음: W2가 참조하는 Host/Runtime/설정·Web owner와 config·CLI caller·인접 tests를 대조하고, 파일 선택·config→YAML→CLI 검증·shell/cwd·layout·route 검증을 구현한다. 실패 시 후속 실행 없음과 기존 실행 보존을 검증한다. W3 protocol 스키마·타입 인계는 W2 완료 후다.

## 2026-09-22 · W2 입력 준비 구현·검증 완료

- 사용자 지시에 따라 W2를 구현했다. 기존 config·shell/WSL 검증과 IDE에서 사용 중인 yaml 2.8.3을 재사용했다. Host 실행·저장 API는 이번 범위에 포함하지 않았다.
- 공통 입력 준비: packages/config/src/host.ts에서 파일 탐색/명시 선택, UTF-8 단일 YAML과 키·tag·타입 검증, Host/Agent/Network 참조, directed edge 확장·중복/충돌 검증을 구현했다. 선언 순서는 agentOrder로 보존한다. prepareHostInput은 config→YAML→CLI 오류/layout→최종 shell/cwd 검증을 수행하고 부수효과 없는 준비 결과를 반환한다.
- 설정: schema.ts에 keybindings action/조합·web.sidebar.open·appearance.theme 검증을 추가했다. 각 계층의 치수 없는 grid를 거절하고 같은 preset 상속·preset 변경 시 치수 폐기·최종 누락 치수 1 처리를 구현했다. CLI port override가 파일의 port 충돌을 숨기던 경로도 차단했다. 기존 terminal 형식/NUL 및 실행 파일/cwd 검증을 재사용하며 Host directory를 명시 cwd로 전달한다.
- CLI: --path directory/--file과 layout 입력, Host restart/delete·Agent restart/복수 이름·필수 host network 문법을 반영했다. parser 오류를 보존해 공통 준비 뒤 CLI 단계에서 거절한다. 명시 hostname 조회·제어와 Network 명령은 YAML을 읽지 않는다. 잘못된 옵션이 있을 때 앞쪽 --path 때문에 명시 hostname을 놓치던 회귀도 테스트 후 수정했다.
- 확인한 검증: 추가 테스트의 실패→구현→통과를 확인했다. 최종 pnpm check(lint/format/build/typecheck/전체 테스트) exit 0; config 36개·CLI 64개·daemon 222개를 포함한 전체 회귀 통과. 빌드된 Node CLI smoke에서 config→YAML→CLI 오류 순서, stderr+exit 1, help exit 0, 실행 상태 파일 생성/변경 없음도 확인했다. docs/architecture/aiox-system.md의 입력 준비 책임·현재 한계와 code/test 근거를 반영했고 inline-code 검사와 diff whitespace 검사를 통과했다.
- 완료 범위/다음: W2는 입력 준비와 실패 차단까지 완료다. 유효 입력도 bootstrap에서 기존 Stage5 미구현 오류로 종료하며 실제 Host 실행 성공을 뜻하지 않는다. W3는 packages/protocol의 zod schema/추론 타입/export를 먼저 제공하고 실제 export·import 예시·미구현 범위를 Stage6에 인계한다. 이때 config의 HostManifest/HostSource/HostLayout 및 parser와 별도 정책 권위를 만들지 않도록 공통 계약을 정합화한다. 서버 handler가 공통 prepare 경로를 소비하는 연결과 DB 대상·충돌 검증은 후속 W3~W7에서 수행한다. 실제 서버·React 합류 검증은 W5다.

### 2026-09-22 12:23 · W2 리뷰 수정: 필수 옵션 값 소비를 Commander와 일치

- 확인한 원인: Commander 14.0.3의 필수 옵션은 다음 토큰이 `-`로 시작해도 값으로 소비한다. `hostSelection`과 `failedHostRequest`의 별도 접두사 검사가 이 의미와 달라 값 누락과 `host.status` → `host.run` 오인을 만들었다.
- 수정: `apps/cli/src/host-input.ts`에서 두 검사만 제거하여 필수 값 토큰을 소비한다. `apps/cli/src/host-input.test.ts`에 `--path -workspace`, `--file -custom.yaml` 및 equals 형식, `host --path --file status dev --unknown` 회귀를 추가했다. 값 누락·서로 다른 path 중복 거절, config→YAML→CLI 순서, 명시 hostname 조회·제어의 YAML 생략도 확인했다.
- 검증: 새 회귀 3개가 수정 전 실패·수정 후 통과했다. config 36개 및 CLI 전체 재실행 67개, 양쪽 typecheck·oxlint·oxfmt 검사를 통과했다. 최초 묶음 실행에서는 WebSocket 테스트 실패 후 종료되지 않아 중단했으나 해당 테스트 단독 11개와 CLI 전체 재실행은 통과했다. 최초 실패 원인은 확정하지 않았다.
- 범위: 입력 준비와 기존 CLI 테스트를 검증했다. 실제 Host 저장·실행 보존이나 빌드된 CLI smoke를 이번 수정에서 검증한 것은 아니다. daemon start의 loadConfig·resolveTerminalLaunch 경로, config/layout/terminal 공개 검증, W3 이후 구현, Stage6·apps/web·plan 및 다른 변경은 수정하지 않았다. commit/push 없음. W2 완료와 W3 next pointer를 유지한다.

## 2026-09-22 · W3 공개 스키마 구현과 후속 연결 착수

- 요청: W3 작업 수행. 공통 계약 → 저장·조회·배치·SSE 연결 순서로 진행한다. Stage6·apps/web·plan은 변경하지 않는다.
- 공개 산출물: packages/protocol/src/host.ts, core.ts, configuration.ts를 index.ts에서 export한다. HostView/ManagedAgentView/HostNetworkView, PanelView/PanelLayout/TabView, Operation/OperationError/OperationTarget, ConfigView, HostSource/Invocation과 HTTP 요청 7종 panel·Host 요청, WebSnapshot/WebState/WebChange/WebFault 및 대응 camelCase Schema를 제공한다. 기존 TerminalView/WebNotificationView/NetworkView와 routeRequestSchema를 재사용한다. AgentView.executionOwnership을 추가했다.
- 사용 예: `import { panelViewSchema, webSnapshotSchema, type PanelView } from "@aiox/protocol"; const panel: PanelView = panelViewSchema.parse(payload); webSnapshotSchema.parse({hosts:[],networks:[],panels:[panel],terminals:[],agents:[],operations:[],notifications:[]});`. 저장·조회·SSE 서버 handler와 Host 실행은 아직 연결하지 않았다. Stage6는 공개 타입/스키마를 mock 경계에서 소비할 수 있으며 실제 서버 구현 완료를 뜻하지 않는다. 상대 에이전트 수신·동의는 확인하지 않았다.
- 단일 권위: 기존 config의 순수 검증 함수를 protocol/configuration.ts로 이동하고 config/schema.ts는 재export한다. YAML parser의 Layout 검증, 공개 LayoutInput 및 config wire 검증이 같은 parser를 사용한다. HostSource는 공개 타입을 config가 재사용한다.
- 검증: 신규 계약 테스트 3개가 미구현으로 실패함을 확인한 뒤 구현하여 protocol 14개·config 36개 통과, 두 패키지 build 통과. 전체 typecheck에서 오류 candidates에 새 string 형식을 추가한 영향으로 CLI 소비자 보완 중이다. W3 완료 처리하지 않으며 다음은 공통 저장과 API/SSE 실제 연결이다.

## 2026-09-22 · W3 저장·조회·panel 제어·SSE 구현 및 검증 완료

- 완료 범위: protocol의 스키마·타입 선행 공개 후 TypeORM Host/Agent/전용 Network/membership/edge·panel/tab·Operation/실행 이력 schema와 저장 경로를 연결했다. 빈 DB 직접 초기화, Host+Network+panel 원자 생성, 배치 revision·terminal 유일 소유, Operation requestId/hash 재전송·완료 상태 보존·재시작 정산·보존 기간 정리를 구현했다. 기존 개발 DB 삭제·migration·backfill은 수행하지 않았다.
- HTTP/상태 전달: Host resolve/조회·전용 Network 조회, Operation 조회, panel 요청 7종 및 config GET/PUT을 연결했다. shell 생성·닫기·workspace 삭제는 접수된 Operation에 실제 완료/실패를 기록한다. 자연 shell exit·직접 terminal 삭제도 공통 tab 정리를 사용하며 관리 Agent 구성은 유지한다. 최초/재접속 snapshot, resource별 state, 저장 오류 fault·느린 viewer 격리를 연결했다. 외부 실행은 Agent 조회/상태 전달에 포함하고 Web 알림 대상에서는 제외한다.
- 단일 입력 권위: protocol/configuration.ts의 순수 검증을 config/schema.ts가 재export한다. config Host YAML parser는 공개 HostSource 및 같은 layout parser를 사용한다. prepareHostInput은 실패 stage를 보존하고 Host resolve handler가 소비한다. CLI error candidates의 파일 경로 형식 소비자도 함께 보완했다.
- 인계: 앞선 W3 스키마 인계의 공개 import는 그대로 사용 가능하다. 실제 서버 연결 파일은 apps/daemon/src/state-api.ts, panel-operations.ts, web-state.ts, web-events.ts이며 저장은 packages/persistence/src/sqlite/host-state.ts다. Host run/restart/Agent 제어의 요청 스키마는 공개됐지만 해당 실행 handler와 관리 Runtime projection은 W4~W7에서 연결한다. Stage6의 실제 React 소비/연결, vendor 준비·TUI 검증을 이번 결과로 주장하지 않는다. Stage6 로그·apps/web·plan은 수정하지 않았고 상대 에이전트 수신/동의는 확인하지 않았다.
- 검증: 최종 pnpm check exit 0(lint·format·build·typecheck·56개 test 파일·688개 테스트). 별도 built Node smoke에서 공개 package export·공통 config 검증·SSE schema·SQLite 저장/재오픈을 확인했다. 실제 HTTP·PTY로 panel 생성/rename/layout 충돌/Copy·shell 생성·동일 요청 재전송·확인 없는 종료 거절·종료 후 Operation target 완료·자연 shell exit·panel 삭제·Host resolve/ID 조회·설정 충돌·저장 오류를 검증했다. 실패 테스트부터 구현했으며 중간 실패였던 SSE 초기 이벤트 기대·CLI ownership fixture·retention 비동기 기대도 새 계약에 맞춰 교정 후 통과했다. markdown inline-code와 git diff --check도 통과했다. macOS 로컬 검증이며 다른 OS 실측·React 브라우저 통합·vendor 실행 검증은 수행하지 않았다.
- Owner 반영: docs/architecture/aiox-system.md와 aiox-storage-terminal.md의 현재 조립·입력 검증·저장/API/SSE 구현 및 남은 연결 범위를 갱신했다. 기존 최소 Web의 change→GET consumer는 새 snapshot/state 서버 계약을 소비하지 않으며 React 교체는 Stage6 범위다.
- 다음: W3 완료. W4에서 shell 내부 Agent 실행·준비/실패/종료 관측, 관리 Runtime과 Host/panel projection 및 실제 restart 안내를 연결한다. 현재 Host CLI는 입력 준비 뒤 실행 미구현 오류를 반환한다. commit/push 없음.

### 2026-09-22 13:12 · W3 최종 오류 계약 대조

- 최종 대조에서 새 Host/panel/Operation/config HTTP의 일부 HttpError 응답에 공개 오류 계약의 stage가 빠진 것을 확인했다. 공통 응답 경계에서 기본 stage를 채우고 구체 yaml/environment/storage stage는 보존하도록 수정했다.
- 보완 후 lint·daemon typecheck·실제 state-api 통합 2개 테스트·daemon build를 통과했다. 앞선 전체 check(56개 파일·688개 테스트)와 built smoke 결과는 위 기록을 따른다. W3 완료와 W4 next pointer는 유지한다.

### 2026-09-22 13:46 · W3 회귀 수정: SSE backpressure와 Config 읽기 오류

- 사용자 P1/P2 지적을 코드·명세와 대조하고 회귀 테스트로 확인했다. 수정 전 write(false) 연결 파괴 2개 테스트와 config.json 디렉터리의 500 internal_error/stage 누락 HTTP 테스트가 실패했다.
- web-events.ts는 false 반환 프레임을 정상 접수로 간주하고 해당 연결의 후속 state를 drain까지 보류한다. drain 후 마지막 송신 상태와 최신 snapshot의 차이를 전달하며 다른 연결은 계속 송신한다. socket 오류·종료는 연결을 제거한다. 별도 무제한 전송 큐는 추가하지 않았다.
- config/document.ts는 ENOENT 기본값을 유지하고 나머지 파일 읽기 오류를 ConfigError로 변환한다. 실제 HTTP 회귀에서 500 invalid_config와 stage=config를 확인했다.
- 검증: 대상 회귀 7개, daemon 전체 229개와 config 전체 38개 통과. 88,589바이트 초과 실제 HTTP snapshot 전체 수신 및 같은 연결의 후속 state 수신, 초기/후속 backpressure·drain·연결 종료·다른 viewer 진행을 검증했다. lint, 두 패키지 typecheck/build, 변경 코드 format 및 diff 검사를 통과했다. 추가 HTTP 테스트의 최초 payload 문자열 비교는 JSON key 순서에 의존해 실패하여 구조 비교로 고친 뒤 재검증했다.
- owner architecture에 backpressure 동작을 반영했다. W3 완료와 W4 next pointer를 유지하며 W4 구현은 이번 수정 범위에 포함하지 않았다.

### 2026-09-22 14:07 · W3 커밋 범위 확정

- 사용자 요청에 따라 W3 공통 protocol·저장·조회·panel/config API·Operation·SSE와 관련 문서·테스트를 한 커밋으로 묶는다. 직전 검증한 SSE backpressure 및 Config 읽기 오류 회귀 수정도 포함한다.
- 기존 전체 check 688개 통과와 회귀 수정 후 daemon 229개·config 38개, lint·typecheck·build 검증 결과를 사용한다. 커밋 전 diff whitespace 검사를 다시 통과했다. W4 구현·Stage6·apps/web·plan·사용자 개인 architecture.excalidraw는 포함하지 않으며 W4 next pointer를 유지한다. push는 수행하지 않는다.
