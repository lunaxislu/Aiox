---
topic: AIOX-Web-Terminal-Attach-Investigation
description: Web terminal 재부착의 화면 상태 소실·입력 오염과 종료 잔상 원인 조사
status: open
---

## Work Items

- [x] W1 A~D 재부착 상태 복원 조사 — raw tail·geometry·mouse mode·snapshot/live 경계를 추적하고 격리 재현으로 원인과 한계를 구분한다.
- [x] W2 F 입력 오염 조사 — Claude 없는 OSC11·DA1 재생에서 자동 응답이 live PTY 입력으로 돌아가는지 재현하고 parse 완료 경계와 차단 조건을 검토한다.
- [x] W3 E 종료 잔상 조사 — 재부착 없는 alternate→normal 종료를 격리 재현하고 직접 shell과 foreground 중계 경로를 비교한다.
- [x] W4 조사 결과 직접 검토·해결 접근 정리 — 재현 근거와 미확인을 대조하고 최소 수정 후보·검증 기준·남은 사용자 재현 조건을 보고한다.
- [ ] W5 미확인 실제 증상 검증 — A 드래그 복원·D wheel/thumb 고착의 browser logical state/paint/event 비교와 E 실제 종료 출력 관측으로 원인 범위를 좁힌다. 격리 재현 성공을 실제 증상 전체 원인 확정으로 확대하지 않는다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- AGENTS.md, docs/guides/workflow.md, docs/specs/aiox-runtime.md, docs/architecture/aiox-storage-terminal.md, docs/architecture/aiox-vendor-bindings.md를 기준으로 attachment와 PTY 수명을 구분한다. 배경은 logs/2026-09-09-AIOX-TUI-Stage3-Claude.md 및 logs/artifact/AIOX-TUI-Product-Context-Prompt.md §15다. 기존 단계 상태를 이 조사로 완료 처리하지 않는다.
- 사용자는 새 조사 로그와 기존 subagent 조사를 허용했다. 2026-09-10에는 수동 DevTools 검사를 대신하는 코드 진단 추가를 명시적으로 요청했다. Web attachment에 최소 opt-in 진단을 추가·빌드하는 범위는 허용된다. 제품 복원 정책·의존성·보안 guard·기존 Stage3 로그·plan 변경과 사용자 세션 입력·종료는 이번 범위가 아니다. 진단은 원문이나 credential 없이 모드·geometry·수신량·DOM 불일치 행 번호만 기록한다. 사실·사용자 관찰·추론을 구분한다.
- 2026-09-10 사용자 지시로 공통 headless·serialization 복원 작업을 logs/2026-09-10-AIOX-TUI-Stage2-1-Terminal-Snapshot.md로 선행 배치했다. 이 로그의 기존 활성 항목은 완료 처리하지 않고 open으로 두며 현재 활성 단계는 plan의 Stage2-1이다. 이번 전환은 구현 완료를 뜻하지 않는다.

## 2026-09-09 · 증상과 원인 조사 접근

사용자는 2026-09-09 대화에서 문제와 해결 접근을 새 로그에 기록한 뒤 subagent에게 원인 조사를 맡기도록 요청했다. 기존 Stage3 구현 상태 기록을 대신하지 않는 독립 조사다. 현재는 수정 구현이 아닌 원인 검증이며, 서로 독립된 재현을 하나의 Base 로그에서 종합한다.

### 사용자 관찰

실제 표시는 Ghostty 앱이 아닌 AIOX Web의 xterm.js다. 터미널 선택 버튼으로 Alice/Bob을 전환했다. Bob fullscreen 실행 중 아래 증상이 관찰됐다.

| ID | 증상과 발생 조건 | 우선 조사 대상 |
| --- | --- | --- |
| A | 헤더·본문·하단 일부가 비었다가 텍스트 드래그 선택 시 나타남 | logical buffer와 실제 paint 차이, 복원 상태 |
| B | prompt와 입력 문자가 멀리 떨어지거나 하단 위치가 어긋남 | cursor/wrap·geometry·resize 순서 |
| C | 여러 번 전환 후 wheel 및 Jump to bottom 클릭 무반응, 새로고침도 회복 못함 | mouse mode와 입력 전달 |
| D | hover/focus 시 scrollbar가 보이지만 wheel·thumb 조작으로 움직이지 않음 | active buffer·scrollback·viewport 크기; scrollbar 존재 자체는 결함 증거가 아님 |
| E | /exit 직후부터 생성 문장 일부가 Resume this session with 위에 잔류 | 재부착 이전 종료 화면 전환; 정상 resume 안내와 잔류 문장을 구분 |
| F | Web 일반 shell에서 직접 claude 실행·종료 후 다른 shell로 갔다 돌아오면 11;rgb:1010/1212/1414 및 1;2c 조각이 입력줄에 반복 누적 | 과거 query 재생으로 발생한 terminal 응답이 현재 shell stdin으로 유입 |

FULL_REPAINT=1 조건에서 Bob 화면을 계속 볼 때 정상, 여러 차례 전환 후 스크롤/클릭 문제가 발생했다는 사용자 보고가 있다. 옵션 적용이 모든 증상을 해결했다는 근거는 없다. Shift+Enter는 일반 macOS Terminal의 직접 Claude에서도 안 됐다는 관찰이 있어 이번 결함 범위에서 분리한다. Alice→Bob→Alice 메시지 왕복 관찰은 화면 정합성이나 Stage3 전체 완료의 증거로 확대하지 않는다.

### 이전 조사에서 확인한 코드 경로와 이번 재확인 대상

- apps/web/src/main.ts: 선택 변경 시 기존 attachment.close 후 새 attach 생성.
- apps/web/src/attach.ts: 새 xterm/WS 생성, 수신 bytes를 write, onData를 WS 입력으로 전달, close 시 dispose. replay/live 구분 없음.
- apps/daemon/src/terminals.ts: snapshot 전송 후 같은 동기 구간에서 subscribe; binary 입력은 session.write로 전달.
- packages/terminal/src/index.ts: snapshot은 마지막 64 KiB raw suffix이며 화면 상태 snapshot이 아님. byte 경계 절단 가능.
- apps/cli/src/foreground.ts 및 apps/daemon/src/claude-controller.ts: Agent foreground 경로의 추가 PTY/WS 중계. F는 일반 claude에서도 관찰돼 이 경로만의 문제로 볼 수 없음.
- 설치된 xterm 6.0.0의 OSC11 배경색 응답과 DA1 응답은 onData로 노출된다. Web 배경 #101214와 사용자 관찰 rgb 값이 일치한다.

F의 가설은 historical query→새 xterm 응답→onData→live shell stdin이다. A~D는 raw suffix가 cell/cursor/alternate/mouse/geometry를 보장하지 못하는 구조와 부합하지만 실제 각 증상의 원인은 미확정이다. E는 재부착 없이 발생했으므로 별도 검증한다. TERM_PROGRAM=ghostty 상속과 이중 ONLCR은 추가 조사 항목이며 직접 원인으로 확정하지 않는다.

### 해결 접근과 검증 기준 — 아직 구현 결정 아님

1. Claude 없이 OSC11·DA1과 alternate/mouse 모드를 출력하는 작은 재현을 사용한다. 설치된 라이브러리와 표준 기능을 우선하고 자체 VT parser나 새 의존성을 만들지 않는다.
2. F는 replay/live 구분과 restore parse callback까지 입력 억제하는 후보를 검토한다. live query 응답과 사용자 입력이 함께 유실되지 않는 순서가 필요하다. write 직후 boolean을 해제하는 방식은 비동기 parse 경계를 보장하지 않는다.
3. 같은 페이지 전환은 기존 xterm 유지 후보를 검토하되 hidden fit/resize와 자원 수명도 확인한다. 새로고침 복원과 별개다.
4. reload는 state+geometry의 일관된 snapshot 및 이후 live 경계가 필요하다. server headless+serializer는 후보이며 지원 버전·복원 범위·query 응답 소유권을 확인한다. revision/ACK는 가능한 수단이지 현 단계의 확정 요구가 아니다.
5. A는 선택 전후 logical cell과 출력 변화 여부를 확인해야 paint 문제와 상태 소실을 구분할 수 있다. E는 alternate 진입·복귀와 종료 bytes를 별도 캡처한다.
6. raw tail 확대·강제 repaint·TERM 이름 변경만으로 해결됐다고 선언하지 않는다. 현재 macOS 조사와 다른 OS 미검증을 구분한다.

사용자 전달 외부 보고는 xterm SerializeAddon/Paseo의 snapshot·input suppression·parse barrier를 제안했다. 이 기록은 해당 보고의 모든 HEAD 기능을 설치 버전에서 재검증한 것이 아니다. 참고 URL: https://github.com/xtermjs/xterm.js 및 https://github.com/getpaseo/paseo . Claude fullscreen 문서 https://code.claude.com/docs/en/fullscreen 의 repaint workaround는 AIOX 재부착 원인 확정 근거가 아니다.

### 작업 분담

- 주 agent W1: common terminal producer/consumer/tests 및 owner를 추적하고 A~D 복원 상태를 조사한다. subagent의 재현 파일과 결과를 직접 검토한다.
- subagent W2: F에 한정. /private/tmp/aiox-terminal-f-*만 작성 가능. 입력/출력 hex, 재현 명령, 예상/실제 결과, live query와 replay query 차이, 한계를 반환한다.
- subagent W3: E에 한정. /private/tmp/aiox-terminal-e-*만 작성 가능. alternate teardown 재현, 직접/중계 경로 차이, bytes 근거, 실제 Claude 미검증 범위를 반환한다.
- 로그 기록은 주 agent만 수행한다. subagent는 사용자 정책을 임의 확정하거나 제품 코드를 수정하지 않는다.

### 2026-09-09 21:00 · 조사 위임과 현재 구현 재확인

W2는 hooks_research, W3는 lifecycle_review에게 필수 문맥·허용 임시 파일·재현/보고 기준을 전달해 착수시켰다. 주 agent는 W1의 main.ts/attach.ts/terminal wrapper 전체와 관련 tests/owner 참조를 다시 확인했다.

현재 코드의 raw 64 KiB suffix 및 선택 시 dispose 경로는 그대로다. 중요한 범위 구분: docs/architecture/aiox-storage-terminal.md의 PTY와 Web 복귀 절은 정확한 화면 snapshot을 이미 운영 Web 목표로 남기고 있으며, 현재 raw-tail 한계를 As-built로 명시한다. 따라서 이번 증상은 완성된 상태 복원 기능의 회귀로 단정하지 않는다. 다만 historical query의 live stdin 유입은 화면 복원 미구현과 별도로 검증할 결함 후보다. 기존 tests는 byte 전달·재생 순서·용량·resize·PTY 생존을 검사하며 해당 검색 범위에서 emulator mode 복원 검증은 확인되지 않았다.

다음은 각 격리 재현 결과를 받은 뒤 실제 script와 출력 근거를 직접 검토하는 것이다. 아직 재현 성공이나 원인 확정·수정 완료를 선언하지 않는다.

### 2026-09-09 21:07 · W2・W3候補結果の直接再実行と検証限界

主 agent가 두 임시 script 전체를 읽고 각각 직접 재실행했다. node /private/tmp/aiox-terminal-f-replay.mjs 및 node /private/tmp/aiox-terminal-e-probe.mjs 모두 exit 0이었다.

W2/F: 설치 xterm parser→onData→WebSocket→built daemon attachTerminal→실제 PTY stdin 기록 경로에서 historical OSC11/DA1 응답 유입을 확인했다. 억제 없음과 write 직후 억제 해제는 모두 오염, write callback까지 억제하면 historical 입력은 빈 값이었다. callback 후 별도 query를 term.write로 주입했을 때 forwarding이 재개됐다. 단 후자의 query는 PTY_OUT부터 발생시킨 검증이 아니며, fixture는 첫 binary가 replay라는 알려진 조건을 사용한다. 따라서 제품 프로토콜 수정 전체를 검증한 것은 아니다. DOM 없이 ThemeService 배경만 대역이며 실제 zsh 표시/paint는 미검증이다. F의 자동 응답 유입 메커니즘 재현은 수용한다.

W3/E: 정상 alternate enter/draw/leave 출력은 direct PTY와 foreground.ts+WS 중계 PTY 모두 alternate 문장이 사라지고 normal 화면 및 cursor(0,4)가 같았다. normal buffer에 사전 출력한 문장은 양쪽 모두 종료 후 남았다. 추가 CR 변환은 있지만 이 사례에서는 논리 화면 차이가 없다. 중계 서버는 최소 대역이므로 실제 controller cleanup 전체 및 Claude 종료를 검증하지 않았다. 이는 특정 정상 종료 경로의 반례와 잔류 조건 확인으로 수용하며 E 실제 원인 확정은 보류한다. 결과 bytes는 /private/tmp/aiox-terminal-e-results.json에 있다.

W1 A~D 격리 재현과 W4 통합 판정은 남아 있다. W2/W3의 subagent 수행 완료를 제품 수정 완료나 모든 사용자 증상 원인 확인으로 승격하지 않는다. 제품 코드와 기존 로그/plan은 변경하지 않았다.

### 2026-09-09 21:11 · W1 A~D 격리 재현 및 W4 종합 판정

주 agent가 /private/tmp/aiox-terminal-ad-probe.mjs를 작성·실행해 exit 0을 확인했다. 실제 built @aiox/terminal의 node-pty 출력 전체와 session.snapshot()을 설치 xterm 6.0.0에 각각 write(callback)로 파싱했다. Claude·DOM·사용자 세션은 사용하지 않았다. 재현 명령은 node /private/tmp/aiox-terminal-ad-probe.mjs, 상세 상태는 /private/tmp/aiox-terminal-ad-results.json이다. 임시 파일은 영구 보존이 보장되지 않으므로 아래 재현 조건도 남긴다.

- A/C: alternate 진입, mouse 1000/1006, bracketed paste 2004, 1행 HEADER·24행 FOOTER 설정 후 12행 BODY 위치 지정 출력 6500회. 전체 PTY 출력 71561 bytes, snapshot 65536 bytes. 전체 파싱은 alternate/vt200/paste=true와 header/footer 유지. suffix 파싱은 normal/none/paste=false, header/footer 소실 및 절단된 12;1HBODY 조각 노출. 이는 화면 cell과 mode 소실의 직접 재현이다. 드래그로 pixels가 복원되는 원인까지 재현한 것은 아니다.
- B: 18행43열 cursor 설정 뒤 cursor를 움직이지 않는 SGR reset 18000회 및 PROMPT 출력. 전체 cursor는 zero-based (48,17), suffix는 (8,0). ANSI 중간 절단 영향도 포함한다. 별도로 같은 100개 X 전체 bytes를 cols80/120에 쓰면 cursor (20,1)/(100,0)으로 달랐다. 이는 geometry 차이 가능성 검증이며 사용자 세션 resize 경합 포착은 아니다.
- D: alternate 진입 후 ROW CRLF 14000회. 전체는 alternate/baseY=0, suffix는 normal/baseY=5000으로 잘못된 normal scrollback을 생성했다. 그러나 scrollToTop/Bottom API는 viewport 0→5000으로 정상 이동했다. 따라서 잘못된 scrollback은 재현됐으나 사용자 thumb/wheel 고착 자체는 재현되지 않았다.
- C 연결 근거: 설치 CoreBrowserTerminal.ts의 mouse 이벤트 등록과 mousedown 처리(약 740~790행)는 CoreMouseService 활성 상태에 의존한다. mode 소실은 앱에 전달되는 mouse 동작 변경을 설명하지만 실제 Jump to bottom 클릭은 DOM 재현하지 않았다.

종합: F의 output→input 오염과 A~D에 관련된 raw suffix 상태 소실을 재현했다. xterm 라이브러리 자체 결함으로 확정하지 않는다. E의 정상 teardown 대역은 직접/중계 모두 정상이고 실제 Claude 원인은 미확정이다. 현재 실행한 독립 조사는 완료했지만 사용자 증상 전체의 원인 확정·제품 수정은 미완료다.

최소 수정 후보 순서: (1) historical/live 식별 및 parse 완료까지 historical 자동응답 전달 차단; 정상 live 응답·사용자 입력 처리 포함. (2) 동일 페이지 retained xterm 및 hidden resize 수명 검토. (3) 새 브라우저 복원을 위한 state+geometry와 일관된 live 경계, query 응답 단일 책임 검토. headless/serializer·revision/ACK는 평가 후보이며 아직 도입 확정 아님. repaint나 tail 확대만으로 완료 처리하지 않는다.

남은 브라우저 검증: 통제된 작은 출력 fixture에서 터미널 선택 반복 전후 active buffer/mouse/cursor/baseY/viewportY 및 logical row를 기록하고 screenshot과 비교한다. A는 선택 전후 logical cells와 PTY_OUT 변화도 비교해야 한다. D는 DOM scroll geometry와 실제 wheel/thumb handler를 관측한다. E는 사용자 동의하에 실제 Claude 종료 전후 최소 출력 캡처가 필요하며 secret/사용자 원문 수집 범위를 먼저 제한한다. 보안 guard 우회는 하지 않는다. 이번 검증은 macOS Node parser/PTY 범위이며 Linux/Windows 실제 OS와 브라우저 paint 검증을 의미하지 않는다.

W1~W4 조사·결과 검토 항목은 이 한계를 명시한 결과로 완료하고, 미확인 사용자 증상 검증을 W5에 남긴다. 로그는 open을 유지한다. 제품 수정과 owner 계약 변경은 하지 않았다.

### 2026-09-10 00:28 · W5 수동 관측 정정 및 Web 자동 진단 추가

사용자는 fullscreen Claude 화면에서 xterm scrollbar로 이전 출력이 보였다고 보고하고, 수동 중단점 대신 코드 진단 추가를 요청했다. DOM breakpoint 정지 중 0행 DOM에는 불필요한 문자열이 있고 buffer는 비어 있었지만 재개 후 둘 다 같은 문자열이었다. 처리 중 관측을 지속적 DOM 잔상 증거로 해석했던 설명은 정정한다. 실제 세션의 fullscreen/normal 불일치는 아직 검증 가설이다.

apps/web/src/attach.ts에 URL query terminalDebug opt-in 진단을 추가했다. attachment ID와 attach/detach, receive, parsed, render, buffer-change, selection, scroll, send-resize 시점을 JSON Console info로 기록한다. 기록 항목은 buffer type/mouse/geometry/baseY/viewportY/cursor/누적 수신량이다. render에서 viewport buffer와 DOM을 후행 공백 정규화 후 비교하고 불일치 행 번호만 남긴다. 원문·키 입력은 기록하지 않는다. 공개 xterm API를 사용하고 화면/입력/모드를 변경하지 않는다. wire에 marker가 없으므로 첫 frame을 replay로 단정하지 않는다. render 비교도 순간 관측이지 영구 결함 자동 판정은 아니다. query 없이는 진단 이벤트를 구독하지 않는다. 진단 오버헤드의 타이밍 영향은 남는다.

main.ts 선택→dispose/new, daemon snapshot→subscribe, terminal 64KiB raw suffix 및 storage-terminal As-built 한계를 재확인했다. Web typecheck/build, 대상 oxlint/oxfmt, 기존 Web test 1개 통과. 사용자 daemon/Claude는 재시작하거나 입력하지 않았다. 브라우저 실제 재현은 미확인이다. 다음은 http://localhost:4501/?terminalDebug=1 에서 전환 재현 후 [aiox-terminal] Console 기록으로 모드 소실과 DOM 불일치 시점을 확인한다. W5 진행 중 유지.

### 2026-09-10 02:20 · subagent 웹 조사 — A 증상은 AIOX 구조가 아니라 Claude Code 렌더러 자체 버그일 가능성 (가설 축 하나 추가)

사용자 요청으로 subagent가 "Claude Code TUI 웹 터미널 버그"를 웹에서 조사했다. 아래는 subagent가 출처(URL)와 함께 보고한 것을 이 로그의 조사자가 재검토한 결과다 — subagent 결론을 그대로 수용하지 않고, 우리가 이미 확인한 사실과 대조했다.

**subagent가 출처를 들어 확인했다고 보고한 것 (URL 포함, 이 로그 조사자가 원문을 직접 재열람하지는 않았다):**

- [code.claude.com/docs/en/fullscreen](https://code.claude.com/docs/en/fullscreen) Troubleshooting 절: fullscreen 렌더러는 프레임마다 **바뀐 셀만** 보내는 incremental diff 방식이며, 일부 터미널 호스트가 이 위치 지정 쓰기를 잘못 병합해 이전 출력 조각이 화면에 남는다고 명시돼 있고, `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT=1`(매 프레임 전체 셀 재출력)이 공식 해결책으로 문서화돼 있다. 문서는 이 현상을 ConPTY(Windows Terminal) 계열로 한정해 서술한다고 함.
- [anthropics/claude-code#68711](https://github.com/anthropics/claude-code/issues/68711): **iTerm2/Warp(macOS 네이티브 터미널, 웹도 아니고 재연결도 없음)에서도 같은 현상**(텍스트 깨짐 → resize로 고쳐짐)이 보고됨. root cause 설명 없이 closed.
- [xtermjs/xterm.js#2975](https://github.com/xtermjs/xterm.js/issues/2975): WebSocket 재연결 시 mouse tracking mode가 풀리는 이슈가 등록돼 있음 (해결 안 됨, "needs more info"로 closed).
- [addon-serialize.d.ts](https://github.com/xtermjs/xterm.js/blob/master/addons/addon-serialize/typings/addon-serialize.d.ts): xterm.js 공식 `SerializeAddon`의 `ISerializeOptions`에 `excludeModes`/`excludeAltBuffer` 필드가 있고 기본값 false(=기본 포함) — 즉 이 addon은 모드+alt buffer를 포함한 진짜 스냅샷 직렬화용으로 설계됨.
- `CLAUDE_CODE_DISABLE_MOUSE=1`/`CLAUDE_CODE_DISABLE_MOUSE_CLICKS=1`, `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` 등 관련 env var가 다른 이슈들([#74320](https://github.com/anthropics/claude-code/issues/74320) 등)에서 workaround로 언급됨.

**이 로그 조사자의 재해석(위 사실을 근거로 한 추론, 확정 아님):**

1. **A 증상(resize로 고쳐지는 텍스트 손상)의 원인 축이 하나 더 늘었다.** 지금까지 이 로그는 A를 주로 AIOX의 raw-tail 재연결 구조 문제로 다뤄왔다. 그런데 #68711은 **재연결도, 웹 터미널도 아닌 네이티브 iTerm2/Warp에서도 같은 패턴**이 보고된 사례다 — 이는 A의 상당 부분이 AIOX 고유 문제가 아니라 **Claude Code fullscreen 렌더러 자체의 incremental-diff 처리 버그**일 가능성을 시사한다. 대화 초반의 "FULL_REPAINT=1일 때는 정상이었다"는 사용자 관찰과도 정합적이다. resize가 고치는 이유도 "SIGWINCH로 앱이 다시 그린다"는 이전 추론보다, "geometry 변경이 강제로 full repaint를 유발한다"는 이 설명이 더 구체적이고 출처가 있다.
2. **재연결 직후 mouse mode 소실은 별개 메커니즘으로 유지된다.** xterm.js#2975는 정확히 AIOX 세션(01:58 기록)에서 직접 관측한 것과 같은 증상이지만, 이건 웹소켓 재연결에 특정된 것이고 위 incremental-diff 버그와는 다른 축이다. 둘 다 실재하되 서로 다른 원인일 가능성이 높다.
3. **raw-tail → headless+SerializeAddon 방향은 xterm.js 공식 설계와도 맞는다.** 다만 이건 mouse-mode-소실류(2번 축)의 해법이지, incremental-diff 버그(1번 축)의 해법은 아니다 — 1번은 Claude Code 쪽 버그이므로 AIOX가 프로토콜을 완벽히 중계해도 안 없어질 수 있다.

**분명히 해야 할 것:** `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT=1`, `CLAUDE_CODE_DISABLE_MOUSE=1`, `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1`은 전부 Claude Code 쪽 기능을 꺼서 증상 클래스를 회피하는 workaround이지, AIOX가 상태를 올바르게 복원하는 근본 수정이 아니다. 이번 조사로 A 증상을 "해결"했다고 선언하지 않는다 — 원인 축이 하나 더 특정됐을 뿐이며, AIOX 쪽에서 검증 가능한 것(raw-tail·mouse mode)과 Claude Code 쪽 버그로 보이는 것(incremental diff)을 섞지 않는다.

### 2026-09-10 15:40 · A 원인 측정으로 특정 — replay가 raw byte tail이라 alt screen 진입과 기준 화면이 잘린다

`?terminalDebug=1` 진단으로 실제 증상을 잡고, 읽기 전용 WebSocket 뷰어로 daemon이 내보내는 replay 65536 바이트를 직접 받아 분석했다. 사용자 세션에 입력하거나 재시작하지 않았다.

**측정으로 확인:** 모든 render의 `mismatchedRows`가 빈 배열이라 xterm 렌더링은 원인이 아니다 — 없어진 내용은 버퍼에도 없었다. replay 바이트에 `?1049`가 아예 없고 `?2004`도 없다. `?2026`은 set 22 / reset 23으로 꼬리가 프레임 중간에서 시작했고 첫 바이트는 UTF-8 조각이다. Claude는 `ESC[H` 앵커에 바뀐 칸만 쓰는 증분 렌더링을 하며 프레임 평균 2672바이트, 64KB에 22프레임이 들어간다. 전체 재그리기 `ESC[2J`는 한 번뿐이고 위치가 사용자 리사이즈 시점과 일치한다. 리사이즈는 마우스 모드를 되살리지만(`none→vt200→drag→any`) `buffer`는 전체 재그리기 후에도 끝까지 `normal`이다.

**추론(확정 아님):** A는 AIOX replay 설계가 원인이다. 완전한 화면은 리사이즈 때만 스트림에 실리므로 재부착한 뷰어는 기준 화면 없이 차분만 겹쳐 칠한다. C·D·E는 `?1049` 소실의 파생이다. Claude 자체는 정상 동작이다.

**철회:** 2026-09-10 02:20 항목의 "A는 Claude Code 렌더러 자체 버그" 축은 이번 측정이 상당 부분 대체한다. 다만 네이티브 iTerm2/Warp 보고(#68711)는 이 진단으로 설명되지 않으며 미해결로 남는다. 조사 중 세웠다가 반증된 가설 다섯 개(`?2026` 고착, DOM 렌더러 한계, E의 alt screen 누출, 48줄 = Claude 자기 뷰포트 포함)는 인계 프롬프트 6절에 정리했다.

**추가한 것:** `packages/terminal/src/replay-fidelity.test.ts`가 실측치로 세션을 재현해 raw tail 재생과 스냅샷 복원을 비교한다. raw tail은 `normal`/`mouse none`/83행 중 3행, 스냅샷은 `alternate`/`mouse any`/83행 전부 일치. `SerializeAddon`이 `?1006`을 빠뜨리는 것도 고정했다 — 이게 없으면 223열 넘는 마우스 이벤트가 버려진다. `@xterm/headless`·`@xterm/addon-serialize`를 packages/terminal devDependency로 추가했다. 패키지 테스트 18개, oxfmt/oxlint/typecheck 통과.

**미해결:** 재부착 없는 세션에서도 A가 나는지 미확인. 이 조사의 캡처는 전부 재부착 이후다.

**제안(미승인):** `snapshot()`을 headless 터미널 + `SerializeAddon` 기반으로 바꾸고 `?1006`을 보정해 덧붙인다. `DEFAULT_REPLAY_BYTES` 주석이 Stage 6으로 예고한 작업이다. 사용자 승인 전이며 이번 조사로 A를 해결했다고 선언하지 않는다.

**인계:** 진단 과정·근거·반증된 가설·수정 제안 전체는 logs/artifact/AIOX-Web-Terminal-Replay-Fidelity-Prompt.md가 소유한다. 재검증은 `cd packages/terminal && pnpm test`.

### 2026-09-10 17:10 · 제안 검증 — Stage 6가 이미 소유한 작업이고, 순진한 구현은 마우스를 죽인다

외부 조사(subagent)와 cmux 실제 코드 대조, 그리고 다른 agent(Codex)의 이의 제기를 거쳐 앞 항목의 제안을 검증했다. 구현은 시작하지 않았다.

**측정으로 확인:** `SerializeAddon`은 `?1006`/`?1016`을 0.14.0·`0.15.0-beta.301`·master 어디서도 내보내지 않으며 커밋 히스토리상 도입된 적이 없다. xterm이 protocol과 encoding을 분리해 들고 있는데 2021년 `IModes` 공개 API가 protocol만 노출한 것이 원인이다. 인코딩이 DEFAULT면 마우스 보고가 `onData`가 아니라 `onBinary`로 나가는데 `apps/web/src/`에 `onBinary` 배선이 0건이다. headless `write()`는 파싱이 비동기라 직후의 `serialize()`가 이전 상태를 돌려준다 — alt screen 진입조차 안 보인다. 219x83 세션 100개 부하는 파싱 100 MB/s, 세션당 RSS 약 1.1 MB(scrollback 0이면 145 KB), `serialize()` 0.70 ms·16 KB였다.

**철회:** "cmux는 마우스 인코딩을 서버가 소유해 이 문제를 구조적으로 회피한다"는 이 조사자의 단정을 철회한다. `ghostty-vt`에 `MouseEncoder`가 있다는 것만 보고 호출 지점을 찾지 않은 추정이었다. cmux 웹은 byte 경로도 클라이언트 xterm이 인코딩하고, 셀 렌더링 경로는 휠을 앱에 보내지 않는다. 서버 인코딩은 Rust 네이티브 클라이언트 얘기다. "`snapshot()`과 `subscribe()`를 같은 tick에"라는 기존 계약도 미러에서는 무효다.

**재확인:** `?1006` 누락은 관측된 증상 C의 원인이 아니다. 실제 캡처 65536바이트에 `?1006`이 1회 있다. 이건 제안한 수정을 보정 없이 넣을 때 **새로 생기는** 함정이다. C의 원인은 리사이즈 전 mouse tracking이 `none`이었던 것으로, D와 뿌리가 같다.

**연결:** 이 수정 방향은 이 조사가 만든 것이 아니라 `logs/2026-09-09-AIOX-TUI-Stage6-Web.md:25`가 이미 요구하는 항목이다("64KiB raw tail 재생은 정확한 화면 복원이 아니므로 이를 완성한다"). `packages/terminal/src/index.ts:59-62` 주석도 같은 곳을 가리킨다. 이 조사가 더한 것은 원인 측정과 함정 목록뿐이며, 착수 여부와 순서는 Stage 6가 결정한다.

**추가한 것:** `packages/terminal/replay-eye-check.mjs` — 재구성이 아니라 실제 PTY 바이트로 두 재생 방식을 비교해 눈으로 확인하는 도구. 별도 PTY를 띄우므로 live 세션을 건드리지 않는다.

**제안(여전히 미승인):** 인계 프롬프트 8절이 소유한다. `?1006` 보정은 미러에 `registerCsiHandler`로 set/reset/RIS를 추적해 활성일 때만 덧붙이는 방식이고, 접속 계약은 파싱 배리어 + 이어붙이기로 바뀌며, 재생 전에 geometry를 먼저 맞춰야 한다. `apps/web/src/attach.ts`의 `onBinary` 배선은 이 제안과 무관한 독립 버그다.
