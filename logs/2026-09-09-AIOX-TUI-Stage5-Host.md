---
topic: AIOX TUI Stage5 Host
description: Host CLI·YAML·설정·실행 수명과 Stage6 연결 구현
status: open
---

## Work Items

- [>] W1 CLI·YAML·config·저장·API·상태 전달과 Stage6 병렬 작업 계약을 구체화한다
- [ ] W2 CLI 입력·config·YAML 로딩과 검증·layout 해석을 구현한다
- [ ] W3 공통 저장 모델·조회·화면 배치 API와 상태 전달 기반을 구현한다
- [ ] W4 shell 내부 Agent 실행과 준비·실패·종료 관측을 구현한다
- [ ] W5 Host run·전용 Network·초기 배치를 구현하고 Stage6 최초 실제 연결을 확인한다
- [ ] W6 개별 Agent start/stop/restart와 Host Network 명령을 구현한다
- [ ] W7 Host 전체 restart/stop/delete·조회와 구성 변경 처리를 구현한다
- [ ] W8 Stage6와 실제 연결한 Host 전체 흐름을 통합 검증한다

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 이 로그의 논의·정정 누적 기록을 구현 순서 중심으로 직접 재구성하도록 승인했다. 확정 정책의 권위는 아래 owner 문서에 있으며, 각 W scope는 구현에 필요한 적용 기준과 검증 조건을 담는다. 과거 제안이나 목업 더미 데이터를 계약으로 복원하지 않는다.
- Host 구현은 현재 담당 agent가 수행한다. Stage6 React 구현은 사용자가 별도로 맡긴 agent가 병렬 진행한다. 이 로그의 갱신은 구현 완료나 Stage6 담당자의 계약 수신·동의를 뜻하지 않는다. 이번 갱신에서 Stage6 로그·코드와 plan의 활성 단계는 변경하지 않는다.
- Owner: [Host spec](../docs/specs/aiox-host.md), [Runtime/CLI spec](../docs/specs/aiox-runtime.md), [설정·Web UX spec](../docs/specs/aiox-configuration-web.md), [System architecture](../docs/architecture/aiox-system.md), [Storage/terminal architecture](../docs/architecture/aiox-storage-terminal.md). 인증·전송 판정은 [Collaboration spec](../docs/specs/aiox-collaboration.md), vendor 지침 주입은 [Vendor bindings architecture](../docs/architecture/aiox-vendor-bindings.md)를 함께 따른다.
- 병렬 작업 상대의 재개점은 [Stage6 로그](2026-09-09-AIOX-TUI-Stage6-Web.md)다. 전체 단계 연결은 [rebuild plan](../plans/aiox-tui-product-rebuild.md)을 따른다. 각 W 착수 시 최신 code/test와 owner를 대조하고 producer→consumer 및 실패 전달 경로까지 확인한다.
- Worktree 생성·`--worktree`, Host 이름 override `--name`, 대상 선택 `--host`, YAML `version`은 제외한다. adapter 이름은 `claude`와 `codex`다. 새 Runtime을 vendor 대화 자동 resume으로 해석하지 않는다.
- 첫 배포 전 DB는 현재 schema를 직접 수정한다. 과거 개발 DB 전용 migration/backfill/fallback·startup 자동 reset을 추가하지 않는다. 실제 DB 삭제는 별도 사용자 승인과 daemon 종료 확인이 필요하다.
- 각 구현 W에서 관련 테스트·타입 검사·빌드 등 필요한 검증을 수행한다. 자원 생성 또는 종료 신호 전송만으로 성공 처리하지 않는다. 실제 실행·실패·종료가 CLI와 Web consumer에 전달되는지 확인한다. 반복 드래그 이동 stress 검증은 완료 조건에 넣지 않는다.

### {W1}

- 범위: 기존 정책을 재논의하는 대신 CLI/Web이 동일한 backend 정책을 소비할 수 있도록 호출·저장·관측 계약을 구체화한다. 정확한 endpoint·payload·오류 코드·저장 schema는 이 W의 산출물이며 이미 확정된 것으로 간주하지 않는다.
- CLI 계약: Host spec과 Runtime spec의 CLI 표면을 대조해 전체 명령·인자·옵션, 대상 선택, 적용 범위, stdout/stderr·실패 종료 결과를 정리한다. `host run/list/status/stop/restart/delete`, `host agent start/stop/restart <agent-names...>`, 필수 `<host>`를 받는 `host network list/show/block/unblock/reset`을 빠뜨리지 않는다.
- YAML 계약: 한 파일의 한 Host·전용 Network 하나, Agent map, `host.instruction`, adapter·role·description·instruction·args, Network membership·routing, 파일 탐색·참조 검증·전체 예시를 owner에 연결한다. 적용 구성과 파일의 미적용 변경을 구분한다.
- Config·YAML·CLI 검증 순서: config → YAML → CLI 순서로 각 단계의 입력을 검증한다. 어느 단계든 실패하면 CLI로 원인을 알리고 이번 명령을 실패 종료하며 다음 검증 단계와 후속 자원 생성·실행을 진행하지 않는다. restart에도 같은 순서를 적용하며 기존 Host·Agent·shell·정책·화면은 유지한다. 세 단계 통과 후 설정 병합과 최종 shell 실행 환경 검증을 수행하고, 이때 실패해도 실행 전에 종료한다. 검증과 재적용을 구분해 기존 daemon 포트·terminal을 임의 변경하지 않는다.
- 데이터·저장 계약: Host·관리 Agent·Runtime·Network·panel·pane·tab·terminal의 식별과 관계를 정한다. YAML은 실행 선언, 사용자 홈 `.aiox/config.json`은 전역 설정, `.aiox/aiox.db`의 SQLite는 적용 구성·배치·이력, 실제 process/PTY/binding/token은 실행 자원이다. Web theme의 localStorage는 별도다. 각 데이터의 생성·갱신·삭제·복원 시점과 접근 주체를 정하고 DB의 과거 실행 기록을 생존 증거로 쓰지 않는다.
- API 계약: 조회·Host/Agent 실행 제어·Network 제어·shell 생성·탭 닫기/이동/분할·배치 저장·stopped 안내 해제의 실제 caller를 확인하고 필요한 요청/응답/오류 예시를 정한다. 요청 접수와 실제 실행 완료, 시작 실패와 정리 실패를 구분한다. CLI/Web이 공유하는 application 경로를 두며 Web에 모든 CLI 기능의 버튼을 강제하지 않는다.
- 통신 제안의 구체화: 기존 HTTP 명령/조회, SSE 변경 알림 후 재조회, WebSocket terminal 입출력·resize·복원 경로를 우선 재사용한다. shell 이동은 프로세스 이동이 아니라 같은 terminal의 배치 변경이다. terminal 인스턴스·연결 수명을 pane 컴포넌트와 분리하고 이동만으로 프로세스를 재생성하지 않는다. 배치 저장 실패 처리와 재접속 시 복원 계약도 정한다.
- 담당 경계 제안: Host 담당이 공통 protocol·daemon·persistence·config/backend를 맡고 Stage6 담당이 React·화면 조작·terminal 연결을 맡는다. 공통 파일의 수정 책임과 변경 전달 방식을 Stage6 담당과 맞춘 뒤 병렬 구현한다. Web이 저장한 현재 배치를 Host CLI도 소비하도록 단일 저장 경로를 사용한다.
- React 병렬 개발: 계약과 같은 응답·오류·상태 전환을 제공하는 최소 mock을 API 경계에 둔다. 컴포넌트에 고정 더미 데이터를 박거나 별도 완전한 가짜 서버를 만들 필요는 없다. terminal 실제 입출력·resize·shell 생존은 mock으로 검증했다고 보고하지 않는다.
- 완료 조건: owner에 구체 계약을 반영하고 요청→실행/저장→관측→조회/알림→React 표시 흐름을 복원할 수 있어야 한다. Stage6가 소비할 schema·응답/오류 예시·담당 경계와 실제 연결 시점을 인계한다. 미정 endpoint나 공유 파일 소유권을 추측한 채 구현을 양쪽에서 시작하지 않는다.

### {W2}

- 참조: Host spec의 YAML 선택·aiox.yaml·초기 layout, Runtime spec의 CLI 표면, 설정·Web spec의 전역 설정·새 shell 실행 설정. `packages/config/src/{files,schema,terminal,wsl}.ts`와 인접 tests, CLI parser와 bootstrap caller를 추적한다.
- `--path`는 디렉터리이며 생략하면 현재 경로다. `--file`은 명시 파일이며 상대 경로는 선택 디렉터리 기준이다. 자동 탐색은 `aiox.yaml`·`aiox.*.yaml`: 후보 없음은 오류, 하나면 선택, 복수면 후보와 파일 지정법을 안내하고 실행하지 않는다.
- 검증은 config → YAML → CLI 순서로 진행하고 각 단계 실패 즉시 이번 명령을 실패 종료한다. restart도 예외가 아니며 다음 단계·후속 실행을 진행하거나 기존 실행을 종료하지 않는다. YAML 파일 선택에 필요한 CLI 인자를 읽는 것과 CLI 설정의 검증·적용 단계를 구분한다. YAML을 소비하지 않는 등록 Host 직접 조회·제어에 불필요한 YAML 의존성을 추가하지 않는다.
- Config 파일 없음은 기본값, 잘못된 JSON·읽기 실패·지원하지 않는 키·잘못된 값은 오류다. 기존 포트 범위/중복·보존 기간·terminal·keyboard·sidebar 검증을 재사용한다. dev 환경이라는 이유로 파일 부재를 가정하지 않는다. shell·args·cwd의 형식/NUL 검증과 최종 실행 파일·cwd 사용 가능 여부 검증을 연결하고 Windows/WSL은 기존 공통 경로를 소비한다.
- CLI·YAML·전역 config 각각 grid만 있고 columns/rows가 모두 없으면 병합 전 오류다. 하나 이상의 양의 정수 치수면 유효하고 치수만 있으면 grid다. non-grid와 치수 조합은 오류다. 유효 입력을 CLI→YAML→전역→auto 우선순위로 합치고 같은 preset의 누락 필드는 상속한다. preset 변경은 이전 치수를 폐기한다. 상속 완료 후 남은 한쪽만 1로 채운다.
- YAML 전체 참조·adapter·이름·Network·route를 부수효과 전에 검증한다. `routing.default` 생략은 allow다. between/from-to 확장 후 동일 directed edge 중복은 같은 값이어도 오류이고 allow/deny 충돌도 오류다. 위치와 edge를 진단한다.
- 완료 조건: 유효 입력의 해석 결과와 config/파일/참조/route/layout 오류를 검증한다. config부터 오류면 CLI 실패 종료·후속 실행 없음·기존 실행 보존을 확인한다. shell 실행 요청의 명시 cwd 우선순위를 Host 경로에 연결한다. owner와 아직 다른 parser 동작을 완료로 오인하지 않는다.

### {W3}

- 선행: W1 계약 확정. 참조: Storage/terminal architecture의 저장 책임·Host projection, 설정·Web spec의 저장 경계·Host UX. `packages/protocol`, `packages/persistence`, daemon 조회/terminal/Web events와 React consumer를 연결한다.
- 적용된 Agent 관리 구성은 현재 Runtime 및 terminal 연결과 분리해 저장한다. 탭이 없어도 관리 항목을 조회할 수 있고 파일 편집만으로 적용 구성이 바뀌지 않아야 한다. 종료 원인·표시 상태를 기존 다섯 activity status에 무리하게 합치지 않는다.
- 현재 pane 구성·탭 순서·연결을 저장·조회하는 공통 경로를 구현한다. Web 이동·분할과 CLI의 다음 Agent 배치가 같은 상태를 소비한다. 배치 변경은 terminalId나 프로세스를 교체하지 않는다. Copy 후 안내 해제의 재조회/복원도 W1 계약을 따른다.
- 완료 조건: 빈 DB 초기화·저장·조회·재오픈, API 입력 검증·실패, 변경 알림 후 재조회와 재접속 복원을 검증한다. DB 실패를 빈 상태로 숨기지 않는다. 기존 Web/terminal snapshot·stream 기능을 보존한다.

### {W4}

- 선행: W1 계약 및 W2 실행 설정 검증, W3 연결 모델. 참조: Runtime spec의 일반 shell과 Agent 연결·종료, System architecture의 Host 실행 흐름, Storage/terminal projection 및 vendor binding 계약.
- Host Agent는 shell 안에서 실행한다. shell/terminal과 Agent 실행 수명을 분리하고 새 Runtime·credential·binding을 연결한다. 공통 Host instruction과 Agent instruction을 vendor 계약에 따라 합성하며 native 설정 파일을 자동 덮어쓰지 않는다.
- 준비 성공·시작 실패·종료를 실제 실행으로 관측한다. 명시 stop은 Agent와 필수 부속 실행만 종료하고 shell을 보존하며 stopped 표시를 전달한다. 정상 `/exit`은 같은 shell로 돌아간다. Copy는 명령 복사·기존 shell 표시이며 shell 생성이나 자동 실행이 아니다.
- 명령 입력 위치는 실제 panel/terminal identity로 확인하며 cwd만으로 동일 panel이라 판단하지 않는다. 사용자 일반 shell을 idle 추정으로 임의 점유하지 않는다. disconnect·무출력·quota를 종료로 간주하지 않는다.
- 완료 조건: shell 생존과 Agent 종료를 구분하고 준비/실패/종료가 CLI·조회·알림 경로로 전달되는지 검증한다. 기존 standalone 실행·terminal attachment·credential 정리의 회귀를 확인한다.

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
