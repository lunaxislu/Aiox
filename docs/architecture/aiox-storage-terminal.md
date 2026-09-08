# AIOX Storage, Terminal and Web State

Status: Target

이 문서는 daemon의 지속 데이터, 설정 적용, 터미널 화면·attachment와 Web 알림 projection을
소유한다. 실행 소유권은 [[docs/architecture/aiox-system]], vendor 관측은
[[docs/architecture/aiox-vendor-bindings]], 사용자 동작 계약은
[[docs/specs/aiox-configuration-web]]와 [[docs/specs/aiox-runtime]]가 소유한다.
As-built로 표시한 범위 외에는 목표 구조다. OS별 통합 완료를 뜻하지 않는다.

## 데이터 소유권

| 저장 책임 | 대상 | 경계 |
| --- | --- | --- |
| 실행 환경 사용자 홈의 `.aiox/config.json` | 터미널·keyboard·daemon/운영 Web 포트 | 모든 프로젝트·Host·standalone 공통 |
| SQLite | persistent Network/Route, AIOX send·대상별 결과·daemon 알림 본문, 실행 이력, 알림/읽음, workspace 배치 | 처리 종료 후 기본 30일, 상세는 configuration-web 계약 |
| daemon memory | live process/PTY/binding/credential/activity | DB의 과거 running을 현재 생존으로 간주하지 않음 |
| browser localStorage | Web dark/light theme | terminal 전역 theme과 다름 |
| Host YAML | Host-managed 정의 | DB persistent 정의와 이중 권위 금지 |

언어·소리 on/off/volume의 localStorage 저장, system theme 선택은 제안이다. 실제 Runtime
credential을 영속화된 설정·메시지에 넣지 않는다. vendor transcript/reasoning 전체 복제나 SQLite
저장을 근거로 동일 delivery 재전송·자동 재시작을 추가하지 않는다.

## 이력 보존과 ORM 전환 [Status: As-built]

TypeORM + 기존 better-sqlite3로 전환했다. Stage 1 DB의 최초 schema는 적용된 migration으로 인계하고 이후 migration을 실행한다. 기존 user_version은 호환성 검사에만 읽으며 TypeORM migration 이력을 단일 권위로 사용한다. synchronize는 끈다.

단일 SQLite 연결의 조회·쓰기·close를 직렬화한다. route의 최신 값 읽기와 변경 저장은 같은 transaction에 두어 동시 변경을 잃지 않으며 실패한 작업이 후속 작업을 막지 않는다.

근거: [[packages/persistence/src/sqlite/database.ts]] `packages/persistence/src/sqlite/database.ts:102-132`, `packages/persistence/src/sqlite/database.ts:267-320`; migration·재개방·병렬 작업·rollback 검증은 [[packages/persistence/src/sqlite/database.test.ts]] `packages/persistence/src/sqlite/database.test.ts:96-282`.

메시지·대상별 결과·daemon 알림을 내부 식별자로 연결하고, 전송 당시 역방향 route 관계를 대상별로 보존한다. daemon 시작 시와 하루 한 번 완료된 요청의 보존 기한을 확인해 관련 이력을 함께 정리한다. 진행 중 요청은 제외한다. 보존 기간·범위는 [[docs/specs/aiox-configuration-web]]이 소유한다. Host 실행 종료 정리와 이력 삭제는 다른 경로이며 저장 이력을 실행 복원·재전송에 사용하지 않는다.

근거: [[apps/daemon/src/retention.ts]] `apps/daemon/src/retention.ts:11-43`, [[apps/daemon/src/retention.test.ts]] `apps/daemon/src/retention.test.ts:8-31`; 저장·결과·보존 경계는 [[packages/persistence/src/sqlite/database.test.ts]] `packages/persistence/src/sqlite/database.test.ts:358-502`.

## SQLite와 플랫폼

`packages/persistence`가 schema·migration·repository를 구현하고 daemon이 DB 연결을 소유한다.
domain은 DB를 모르고 application은 port를 통해 작업한다. CLI·Web·vendor binding이 직접 DB 파일을
열어 authoritative 상태를 변경하지 않는다. 필요한 상태 변경은 transaction 경계로 처리한다.

DB 기본 경로는 실행 환경 사용자 홈 아래 `.aiox/aiox.db`다. daemon boot가 설정을 읽고 DB를 연 뒤 listener를 시작한다. [Status: As-built] 근거: [[apps/daemon/src/bootstrap.ts]] `apps/daemon/src/bootstrap.ts:14-16`, `apps/daemon/src/bootstrap.ts:44-67`.
Node homedir/path로 구성하며 `~` 문자열·특정 사용자 경로·npm 설치 경로·프로젝트/Worktree 경로를
하드코딩하지 않는다. 첫 daemon 시작에서 디렉터리/DB/migration을 준비하고 실패하면 정상 기동으로
표시하지 않는다. 기존 파일 삭제나 빈 DB 대체로 오류를 숨기지 않는다.

```text
실행 환경의 사용자 홈 결정
 → 로컬 DB 준비·migration
 → 단일 daemon 연결 소유
 → repositories를 통한 저장·조회
 → 관리 실행 종료 / DB 작업 정리·close
 → 다음 시작에서 저장 데이터 읽기
```

Windows native, Linux, macOS에서 domain/schema/migration은 공유한다. OS별 DB 모델은 만들지
않는다. Windows native와 WSL은 홈·실행 환경이 다르므로 별도 DB를 사용하는 방향이며 Windows
마운트의 같은 DB를 두 daemon이 공유하는 운영은 도입하지 않는다. 파일 지속과 프로세스 재부착은
다르다. 실행 중 포트 설정 변경이 같은 DB를 소유하는 두 번째 daemon을 만들게 하지 않는다.

지원 목표는 Windows/Linux/macOS다. 초기 구성은 daemon·Node/Git·vendor CLI를 같은 실행
환경에 두는 것을 추천한다. [Status: Proposed] Windows daemon + WSL vendor 혼합 제어는
path/socket/token/MCP/종료 경계를 별도로 해결해야 하므로 지원 확정이 아니다. Windows 브라우저가
WSL Web에 접속하는 것은 이 혼합 실행과 다르며 네트워크 접근은 별도로 검증한다.

Stage 1은 better-sqlite3 12.11.1을 사용한다. Node >=22.12.0을 요구하며 Windows/Linux/macOS의
Node22/24 CI에서 DB 설치·저장·재개방 테스트를 통과했다. OS 이름만으로 npm 전역 설치 성공을 약속하지 않고 채택
버전의 Node·CPU·OS에 맞는 prebuilt/native 로딩을 검증한다. PTY native 의존도 함께 확인한다.
npm 배포 artifact와 vendor 실행은 후속 검증 대상이다. PTY의 현재 CI 범위는 아래 Stage 2 근거를 따른다. WAL 채택은 미결이며 채택 시 같은 디렉터리의
`-wal`/`-shm` 접근과 로컬 파일시스템 조건을 지킨다. 살아 있는 sidecar를 삭제하지 않는다.
[better-sqlite3](https://github.com/WiseLibs/better-sqlite3), [SQLite WAL](https://sqlite.org/wal.html).

Stage 2의 `ef624d8`은 [CI 실행 34258443461](https://github.com/lunaxislu/aiox-prototype/actions/runs/34258443461)에서 Windows/Linux/macOS × Node22/24의 locked install·lint·build·typecheck·테스트·built CLI 진단을 통과했다. Linux/macOS는 164 tests, Windows는 153 tests와 기존 POSIX 전용 11 skips다. Windows에서도 daemon의 실제 PTY 입출력·resize·detach·종료 테스트는 실행했다. Linux Node22의 출력 버퍼 테스트 timeout 한 번은 같은 commit의 실패 job 재실행에서 통과했으며 원인은 확정하지 않았다. 실제 브라우저·vendor·WSL·npm 배포 artifact 검증은 이 CI에 포함되지 않는다. [Status: As-built]

검증 경로는 설치→DB 생성/migration→저장→정상/force 종료→재시작 후 데이터 확인이다.
Windows native/Linux/macOS를 구분하고 WSL 실행·Windows 브라우저 연결은 별도 확인한다.
Linux Docker 결과를 native Windows 검증으로 보고하지 않는다.

## 전역 설정 적용

설정 scope는 사용자 전역 하나이며 프로젝트 override는 없다. Host 실행 정의 `aiox.yaml`과도
별개다. 전역 설정은 `.aiox/config.json`을 사용하며 형식·검증 계약과 Stage 1 구현 범위는
[[docs/specs/aiox-configuration-web]]를 따른다. npm 설치 디렉터리에 사용자 설정을 저장하지 않는다.

```text
Web 수정·미리보기 → 저장 요청 → daemon 검증 → 전역 파일 저장 → 유효 설정 배포
파일 직접 편집  → daemon 변경 감지·검증              → 유효 설정 배포
```

같은 검증·적용 경로를 쓰고 파일 변경 이벤트를 짧게 묶는다. 별도 config apply 명령은 없다.
잘못된 설정은 마지막 유효 값을 유지하고 오류를 표시한다. daemon이 꺼져 있으면 다음 시작에서
읽고 검증한다. 동시 편집 충돌 해결 방식·파일 감지 수단과 debounce 수치는 미결이다.

폰트·터미널 색상·AIOX 단축키는 연결된 Web에 즉시 배포한다. font/size 변경 후 fit/resize를
계산한다. daemon/운영 Web 포트는 다음 시작에 적용하고 Web에 저장됨·재시작 후 적용으로 표시한다.
설정 저장이 daemon 자동 재시작이나 Agent 종료를 일으키지 않는다.

Web terminal theme은 외부 cmux/VS Code/일반 터미널의 appearance까지 바꾸는 설정이 아니다.
vendor가 명시적으로 그리는 모든 요소의 색상 변경을 보장하지 않는다. AIOX pane/탭 keybinding과
vendor Ctrl+O 등 입력·브라우저 예약 키를 구분한다.

## PTY와 Web 복귀

Stage 2는 서버 소유 node-pty의 입출력·resize·exit와 WebSocket attachment를 연결한다. 재부착에는 기본 64 KiB의 최근 출력 바이트를 사용한다. 이는 정확한 현재 화면 snapshot이 아니며 잘린 escape sequence나 과거 resize 뒤의 화면을 온전히 복원하지 못할 수 있다. 아래의 정확한 화면·배치 복귀는 운영 Web의 목표로 남는다. [Status: As-built]

PTY 경계는 POSIX raw byte와 Windows 문자열 출력을 공통 바이트로 정규화해 WebSocket binary 출력과 JSON 제어 프레임을 구분한다. Windows 드라이버가 이미 문자열로 디코딩한 원본 바이트까지 복원한다고 보장하지 않는다.

근거: [[packages/terminal/src/index.ts]] `packages/terminal/src/index.ts:18-73`, `packages/terminal/src/index.ts:106-137`, [[apps/web/src/attach.ts]] `apps/web/src/attach.ts:37-127`; 실제 PTY의 I/O·resize·detach 후 생존 검증은 [[apps/daemon/src/terminals.test.ts]] `apps/daemon/src/terminals.test.ts:221-287`.

```text
Vendor TUI ↔ 서버 소유 PTY / 현재 화면
                         ↕ attachment
                     Web xterm renderer

Web close → attachment 해제 → 같은 Runtime/PTY 실행 지속
재방문    → 살아 있는 daemon 자동 연결 → snapshot / 기존 terminal 현재 화면
          → pane 배치·미확인 알림 복원
```

탭 close/unmount/WS disconnect를 agent.stop이나 terminal.stop으로 연결하지 않는다.
작업 중·완료·승인 대기·idle 모두 같은 터미널의 계속 갱신된 현재 화면으로 돌아온다.
재방문 때 로그인·token 수동 입력을 추가하지 않는다. 내부 연결 보호 수단은 이 UX를 충족하도록
정하며 기존 메모리 credential 제약을 사용자 인증 절차 요구로 바꾸지 않는다.

단순 WS reconnect만으로 현재 화면이 복원되지는 않는다. server-side screen 유지·xterm headless/
serialize 또는 output 유지 방식을 구현에서 평가한다. terminal headless renderer는 제외한 LLM
headless와 다르다. 특정 package, 무제한 raw output 저장, 저장 크기를 미리 확정하지 않는다.
화면 snapshot과 후속 stream 연결이 일관되도록 구현하며 pane 이동은 routing을 바꾸지 않는다.
범위는 서버가 살아 있는 동안의 복귀다. daemon 재시작 뒤 외부 프로세스 자동 재attach/실행이나
durable message replay까지 약속하지 않는다.

## 관측에서 알림까지

```text
Binding / hooks / process 관측
 → daemon Runtime projection / 연결 가능한 입력 관측
 → 연결된 요청 결과 + 전송 시점 관계 → 원 발신자에게 daemon 메시지
 → Gateway 사용자 알림 후보
 → 사용자 실제 focus 판정
 → 미확인 목록·읽음 저장 / Web 표시·소리
```

승인·질문·리밋·중단은 Runtime/Web 알림 대상이며 사용자 직접 작업에서도 발생한다. 특정
delivery 실패로 귀속하려면 입력 연결 근거가 있어야 한다. 일반 vendor 도구 오류를 모두 AIOX
오류로 만들지 않는다. 입력 수락·응답 종료·Agent send 응답·작업 성공은 서로 다르다.

알림 클릭은 해당 terminal 이동+읽음 처리다. 전체 확인은 현재 미확인 항목을 읽음 처리한다.
읽음은 승인이나 실제 문제 해결이 아니므로 요청이 살아 있으면 Runtime 대기 표시도 유지한다.

| 실제 사용자 상태 | 처리 |
| --- | --- |
| 활성 창·활성 tab에서 같은 terminal focus | 추가 팝업·소리·미확인 항목 억제, TUI/상태는 표시 |
| 다른 terminal focus | 대상 알림을 미확인 목록에 추가 |
| background tab/window | 선택된 pane만으로 읽음 판정하지 않음 |
| Web 닫힘 | daemon이 미확인 알림 유지, 재방문에 표시 |

짧은 시간의 여러 알림은 항목을 남기고 소리를 묶는 방향이다. 묶음 시간, 같은 요청의 반복
알림 갱신, multi-tab 단일 재생 주체는 구현 제안이며 정확한 수단은 미결이다. Web Audio는
후보이고 autoplay를 위한 사용자 활성화 UX를 고려한다. Web이 닫힌 상태의 native OS 알림음을
추가 요구로 만들지 않는다.

## Web 상태와 라이브러리

Stage 2 최소 Web은 plain TypeScript + Vite + xterm/addon-fit이다. HTTP polling으로 상태·미확인 알림을 조회하고 WebSocket으로 PTY에 붙는다. 공통 transport와 attachment 수명을 확인하는 범위여서 DOM·브라우저 API를 사용했으며 React·공유 상태 계층을 추가하지 않았다. 운영 React Web 방향을 폐기한 선택이 아니다. 아래 운영 UI·설정·다국어·상세 알림 UX는 후속 구현 대상이다. [Status: As-built]

근거: [[apps/web/src/main.ts]] `apps/web/src/main.ts:7-14`, `apps/web/src/main.ts:140-181`, [[apps/web/src/attach.ts]] `apps/web/src/attach.ts:37-127`. 실제 브라우저 UI 검증은 아직 완료하지 않았다.

운영 Web은 Tailwind·shadcn/ui와 다국어를 제공한다. React/Vite는 재사용 후보이며 use-intl,
한국어/영어 시작은 제안이다. 공개 site의 Next.js/next-intl 선택과 운영 Web은 독립적이다.
agent 출력과 vendor 오류 원문을 무조건 번역하지 않는다.

Gateway snapshot/event의 projection을 하나로 유지한다. Zustand는 실제 pane/설정/알림 공유
필요가 있을 때, TanStack Query는 history pagination/search 같은 조회 필요가 있을 때 평가한다.
같은 live authority를 여러 store/cache가 독립적으로 수정하게 하지 않는다. 서버 채택 의존성은 [[docs/architecture/aiox-system]]을 따른다. YAML·오디오 등 후속 의존성은 실제 소비 단계에 선택하며 별도 event bus·HTTP framework를 미리 추가하지 않는다.

Sources: `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §19–§24.
