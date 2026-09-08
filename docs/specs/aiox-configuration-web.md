# AIOX Configuration and Web Contract

Status: Committed target

이 문서는 사용자 전역 설정, 저장 범주, 운영 Web의 terminal 복귀·알림·설정 UX를 소유한다.
실행 종료는 [[docs/specs/aiox-runtime]], 작업 공간·manifest는 [[docs/specs/aiox-host]],
메시지 관측 의미는 [[docs/specs/aiox-collaboration]]을 따른다.

## 전역 설정과 저장 경계

터미널·keyboard·daemon 및 운영 Web 포트는 **사용자 전역 설정 파일 하나**로 모든 프로젝트,
Host, standalone에 적용한다. 프로젝트별 override는 두지 않는다. 설정 위치는 실행 환경의
사용자 홈 아래 `.aiox/config.<확장명>`이며 npm 설치 경로나 프로젝트에 저장하지 않는다.
Stage 1 구현에서는 Node 기본 JSON 처리로 `.aiox/config.json`을 선택했다. Host YAML은 실행 정의이며
사용자 취향 설정과 별개다.

| 데이터 | 저장 책임 | 확정 범위와 남은 선택 |
| --- | --- | --- |
| terminal font/color/cursor/theme, keyboard, 포트 | 전역 설정 파일 | JSON·기본 schema 구현. 상세 UI schema는 후속 확장 |
| Web dark/light theme | localStorage | terminal palette와 별개. system 선택·언어·소리 설정 저장은 후보 |
| 지속 Network/Route, AIOX 메시지·대상별 결과·알림 본문, 실행 이력 | SQLite | 메시지 처리 종료 후 기본 30일 보존 |
| 알림·읽음, terminal/workspace 배치 | SQLite | 브라우저 복귀에 필요한 지속 데이터 |
| 살아 있는 process/binding/token/activity | 실행 상태 | DB의 과거 running 기록을 생존 증거로 쓰지 않음 |

vendor transcript·reasoning 전체 복제나 무제한 메시지 본문 저장을 요구하지 않는다. 저장한
메시지의 자동 재전송도 허용하지 않는다. Host YAML과 DB의 materialization/history를 이중
정의 권위로 만들지 않는다.

SQLite는 Windows/Linux/macOS에서 공통 domain/schema/migration을 쓰는 방향이다. DB 접근은
daemon의 persistence 책임이며 CLI/Web/adapter가 파일을 직접 수정하지 않는다. 실제 DB 경로
`.aiox/aiox.db` 기본 경로 연결·드라이버와 현재 검증 범위는 [[docs/architecture/aiox-storage-terminal]]을 따른다. WAL은 미결이다. Windows와
WSL 홈·DB를 자동 공유한다고 가정하지 않는다. DB 준비 실패를 정상 기동이나 빈 DB fallback으로
숨기지 않고 기존 파일을 자동 삭제하지 않는다.

## 메시지 보존과 persistence 전환

AIOX send 원문과 daemon 알림 본문을 저장하고 발신자·대상·시각·대상별 처리 결과·내부 상관관계를 연결한다. vendor 전체 대화·reasoning·터미널 출력은 이 메시지 저장 범위에 포함하지 않는다. 살아 있는 PTY의 Web 화면 복귀 책임은 별개다. 저장 데이터를 자동 재전송·실행 복원에 사용하지 않는다.

보존 기본값은 요청 처리 종료 후 30일이다. 진행 중 요청은 삭제하지 않고, 정리 대상 요청의 본문·대상별 결과·연결된 daemon 알림을 함께 정리한다. 여러 대상의 처리가 남은 요청을 일부 완료만으로 삭제하지 않는다. 보존 일수는 전역 설정으로 변경하며 daemon 시작 시와 하루 한 번 정리한다. Host 종료 자체로 이력을 지우지 않는다. 이 정책은 persistent Network·route 정의, YAML·사용자 작업 파일을 삭제하거나 디스크 용량 상한을 보장하는 정책이 아니다.

Persistent Network·route는 DB에 지속한다. Host의 정의 원본은 YAML이며 Host와 전용 Network·runtime override는 실행 수명에 한정한다. DB 이력은 살아 있는 membership이나 Host 복원 근거가 아니다.

TypeORM과 better-sqlite3를 사용하며 기존 DB를 보존하는 명시적 migration과 transaction을 요구한다. 자동 synchronize로 schema를 변경하거나 두 migration 권위를 병행하지 않는다. 전환 구현과 검증 근거는 storage-terminal architecture의 이력 보존과 ORM 전환을 따른다.

## 기반 구현과 검증 범위

`packages/config`는 JSON 검증·load/save·last-good session을 제공한다. 구현 기본 포트는 daemon
4500, Web 4501이며 해석 우선순위는 CLI override → 파일 → 기본값이다. listener 연결과 최소 Web 정적 파일 제공은 Stage 2에 구현됐으며 [[docs/architecture/aiox-system]]의 현재 조립 범위를 따른다. 파일
watch·운영 Web 설정 배포는 후속 대상이다. terminal의 fontFamily/fontSize/theme과 keyboard 문자열 맵을
지원하며 상세 UI와 바인딩 의미는 해당 단계에서 구체화한다.

Stage 1에서는 better-sqlite3 12.11.1로 persistent Network/Route와 최초 migration·
transaction·close/reopen을 검증했다. 당시 Node 요구 조건은 >=22.12.0이며 Windows/Linux/macOS × Node22/24 CI에서
설치·빌드·타입 검사·테스트·CLI 진단을 통과했다. vendor/PTY/WSL과 npm 전역 배포 검증은 후속 단계다.
근거: [Stage 1 CI](https://github.com/lunaxislu/aiox-prototype/actions/runs/34189231508).

## 파일·Web 편집과 자동 적용

Web은 설정 미리보기·저장을 제공하며 직접 파일 편집도 같은 검증과 적용 규칙을 사용한다.
별도 `aiox config apply` 명령을 추가하지 않는다.

```text
Web 수정·미리보기 → 저장 요청 → 검증·파일 저장 → 설정 배포
외부 파일 저장   → 변경 감지 → 검증 → 설정 배포
```

| 상황 | 결과 |
| --- | --- |
| 유효한 terminal font/color 또는 AIOX keyboard 설정 저장 | 연결된 Web에 즉시 적용·여러 탭에 배포 |
| daemon·운영 Web 포트 저장 | 저장됨·다음 daemon 시작에 적용 표시 |
| 잘못된 설정 | 마지막 유효 설정 유지·오류 표시 |
| daemon이 꺼진 동안 편집 | 다음 시작 때 읽고 검증 |

파일 변경은 짧게 묶고 유효한 설정만 적용한다. 감지 수단·대기 시간은 구현 사항이다.
설정 저장 때문에 daemon을 자동 재시작하거나 Agent를 종료하지 않는다. 동시 편집 충돌 처리와
정확한 schema는 Open/deferred다.

Font/size 변경 뒤 terminal geometry를 다시 계산한다. AIOX pane/탭 명령과 vendor에 전달할
키를 구분하고 Ctrl+O 등 vendor 동작 및 브라우저 예약 키 충돌을 처리한다. AIOX 설정으로 외부
cmux/일반 터미널 앱 전체 appearance를 바꾸거나 vendor가 직접 그린 모든 요소를 선택적으로
스타일링한다고 약속하지 않는다.

## 포트와 운영 Web

daemon 포트와 Host·standalone이 공유하는 운영 Web 포트는 각각 기본값 및 전역 설정·CLI 시작
override를 지원해야 한다. config 구현 기본값은 daemon 4500·Web 4501이고 우선순위는
`CLI > config > default`다. 현재 CLI 옵션·listener 연결은 system architecture의 구현 근거를 따른다. Host마다 Web 서버를 만드는
계약은 아니다. 개발 Vite port와 배포 운영 Web port를 혼동하지 않는다.

저장된 포트는 다음 daemon 시작에 적용하며 실행 중 MCP 연결을 즉시 이동시키지 않는다.
브라우저 origin이 바뀔 때 localStorage에 미치는 영향과 실제 실행 endpoint 발견은 구현에서
정한다. 이를 별도 사용자 로그인·token 입력 절차로 해결하지 않는다.

운영 Web은 Tailwind와 shadcn/ui를 사용하고 다국어를 제공한다. React/Vite, use-intl,
한국어·영어 시작, Zustand/TanStack Query는 후보이며 확정된 필수 목록이 아니다. vendor 출력
원문과 제품 UI의 번역을 구분한다. 공개 AIOX 사이트는 별도 앱이며 마지막 제품 단계다.
공개 사이트를 위해 운영 Web을 Next.js로 바꾸는 요구는 없다.

## 살아 있는 서버로 자동 복귀

```text
Web 닫힘 → attachment 해제 → 같은 Agent/PTY 작업 지속
Web 재방문 → 자동 연결 → 현재 상태 snapshot
          → 기존 Host·Agent·배치·terminal 현재 화면·미확인 알림 복원
```

사용자에게 로그인·token 입력 등 별도 인증 절차를 요구하지 않는다. 내부 연결 보호는 이
자동 복귀 UX를 충족하도록 구현한다. Web close/unmount/disconnect를 agent.stop 또는 terminal.stop에
연결하지 않는다. pane 선택이나 attachment가 새 vendor 실행을 뜻하지 않는다.

복원 대상은 작업 중·완료·승인 대기·idle 모두이며 닫기 직전 캡처가 아닌 **계속 진행된 동일
terminal의 현재 화면**이다. 단순 WebSocket 재접속만으로 요구를 충족했다고 간주하지 않는다.
배치 식별·저장과 terminal 화면 유지 수단은 구현에서 정한다. xterm headless/serialize는 후보이며
LLM headless 전환과 다른 개념이다. 무제한 raw 출력 저장도 확정하지 않는다.

범위는 daemon이 살아 있는 동안의 브라우저 복귀다. daemon 재시작 뒤 과거 PTY 재부착,
자동 Agent 실행이나 durable message replay는 별도 기능이며 현재 추가하지 않는다.

## 현재 상태와 요청 결과 표시

Web은 현재 idle·reasoning·도구 실행·사용자 입력/승인 대기·실패 원인·Host stopped를 세분화해 표시한다. MCP 상태 요약은 [[docs/specs/aiox-runtime]]을 따른다. 개별 요청의 completed/failed/interrupted 이력과 현재 Agent 상태를 함께 보여 준다. 요청 하나가 끝나도 다른 작업은 working일 수 있고, 미해결 질문·승인 표시는 실제 해결까지 유지한다.

## 알림·포커스·사용자 요청

승인·질문은 vendor TUI에서 사용자가 처리한다. AIOX Web은 해당 terminal로 이동하게 하고
진행을 막는 상태를 알린다. 알림 읽음은 승인·질문의 실제 해결과 다르다. TUI와 daemon이
같은 vendor 요청에 이중 응답하지 않는다.

- 알림 클릭은 대상 terminal 이동과 읽음 처리이며 미확인 목록에서 해당 항목을 제거한다.
- 전체 알림 확인은 현재 미확인 항목을 모두 읽음 처리한다.
- 세션 리밋·실행 중단·연결 손실을 관측 근거에 맞게 반영한다. vendor 내부 tool 실패를 모두
  사용자 조치가 필요한 AIOX 오류로 만들지 않는다.

| 관측 시 사용자 상태 | 알림 처리 |
| --- | --- |
| 활성 창·활성 탭에서 해당 terminal에 실제 focus | 추가 팝업·소리·미확인 항목 억제, TUI/상태 표시 유지 |
| 다른 terminal focus | 해당 알림을 미확인 목록에 추가 |
| background 탭/창 | 선택된 pane만 보고 읽음으로 간주하지 않음 |
| Web 닫힘 | 서버에 미확인 유지, 재방문 때 표시 |

짧은 시간에 여러 알림이 오면 항목은 남기고 소리는 묶는 방향이다. 정확한 묶음 시간,
반복 요청 병합, 여러 탭 중 단일 소리 재생 주체, on/off·volume·차임 선택은 Open/deferred다.
브라우저 autoplay 허용을 위한 소리 켜기/미리 듣기 UX는 후보이며 Web이 닫혀도 native OS 소리를
내는 기능은 현재 요구가 아니다.

Codex 서버 요청과 resolved 관측은 request ID·thread/turn/item을 구분하고 resolved를 무조건
승인 성공으로 해석하지 않는다. 별도 observer 연결에 모든 요청이 broadcast되는지, Claude의
일반 승인 해소를 어떤 hook으로 포괄할지는 미확인이다. 이 한계를 사용자의 재로그인 요구나
headless 승인 UI의 선행조건으로 바꾸지 않는다.

Sources:

- `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §§14, 19–24 — 저장·설정·운영 Web·
  알림·복귀 결정과 구현 후보의 provenance.
