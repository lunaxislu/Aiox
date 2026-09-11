---
topic: AIOX-TUI-Stage2-1-Terminal-Snapshot
description: 공통 PTY와 xterm의 headless·serialization 기반 화면 복원 및 입력 정합성
status: decided
---

## Work Items

- [x] W1 공통 xterm 복원을 headless·serialization 기반으로 리팩토링하기 위한 계약과 회귀 검증 구성 — PTY→미러→snapshot→WS→브라우저 및 입력·resize 경로와 owner/tests를 대조하고 snapshot/live 경계와 수명·geometry·모드 복원 조건을 실행 가능한 검증으로 고정한다.
- [x] W2 세션당 headless 미러와 SerializeAddon snapshot 구현 — raw tail을 화면·커서·모드·geometry 상태로 대체하고 비동기 파싱 완료 시점과 이후 출력의 누락·중복 없는 접속 경계를 보장한다. resize·exit·dispose·복수 뷰어 수명과 normal scrollback 정책을 함께 검증한다.
- [x] W3 누락 상태 복원과 입력 전달 구현 — xterm이 유지하는 실제 저장 커서·속성·charset·모드·scroll 영역·tabstop을 직렬화 경계에서 보완하고 정상/alternate·resize·history 이후 동등성을 검증한다. DEFAULT onBinary 바이트 보존, SGR onData 및 historical 자동응답·live query·사용자 입력 경계를 검증한다. 별도 VT 상태 추적 중복을 피하며 private 접근은 고정 vendor 버전과 회귀 검사로 한정한다.
- [x] W4 브라우저 snapshot 복원 순서 연결 — snapshot geometry로 resize 후 화면·모드 파싱 완료를 기다리고 이후 출력을 정확히 한 번 적용한다. 복원 이후 브라우저 크기 요청과 서버 PTY·미러 resize를 일관되게 연결한다.
- [x] W5 공통 터미널 회귀·실제 증상 재확인 및 owner 인계 — 일반 shell·alternate TUI·재부착·상이한 geometry·출력 중 접속·마우스·종료를 검증하고 A~F 잔여 증상을 분리한다. 관련 checks와 OS 검증 한계를 기록하고 Stage3 재개 및 Stage6 소비 문맥을 정합하게 남긴다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자는 공통 xterm 복원 조사와 경계 proof 이후 Stage2-1 제품 작업 재개를 승인했다. Ponytail full/TDD와 subagent 협업을 적용한다. 최신 미완성 입력 한도 정책 승인 entry를 읽는다. 앞선 범위 질문 때문에 구현을 중단하지 않는다. DECSC·margins·tabstop 누락을 지원 제외로 승인한 것은 아니며 실제 복원 보완과 실패 처리를 검증한다. headless는 터미널 VT 상태 엔진이며 LLM headless가 아니다.
- 필수 문맥: AGENTS.md, docs/guides/workflow.md, plans/aiox-tui-product-rebuild.md, docs/architecture/aiox-storage-terminal.md, docs/specs/aiox-runtime.md, docs/specs/aiox-configuration-web.md. 조사 원본은 logs/2026-09-09-AIOX-Web-Terminal-Attach-Investigation.md 및 logs/artifact/AIOX-Web-Terminal-Replay-Fidelity-Prompt.md다. 원본의 미승인 표기·원인 단정·배리어 큐 절차는 본 로그의 정정과 사용자 결정을 함께 읽는다.
- 공통 복원 구현과 W1 최종 코드·계약 감사를 완료했다. 감사에서 발견한 LNM·커서 깜빡임 복원 누락은 수정하고 terminal67/Web20 회귀를 직접 재확인했다. 타입·빌드·Node import 검증과 owner 반영은 최신 종료 기록을 따른다. W5는 사용자 실사용 A~F 해결 보고를 근거로 완료했으며 agent의 전 OS 재검증으로 확대하지 않는다. 최신 daemon 적용은 이 종료 작업에서 수행하지 않았다.
- Stage2-1의 W1~W5는 완료했으며 plan의 다음 재개 지점은 logs/2026-09-09-AIOX-TUI-Stage3-Claude.md W1이다. 별도 조사 로그의 항목은 이번 종료에서 변경하지 않는다. Stage6는 공통 복원 기반을 React 운영 UI·탭·분할·재방문에 통합하고 검증한다. React가 서버 VT 상태 엔진을 대체하지 않는다.
- 사용자 live Claude·shell·daemon에 입력·종료·재시작하지 않는다. architecture.excalidraw와 기존 무관한 변경을 보존한다. raw tail 확대·강제 alternate·강제 repaint를 근본 복원 대신 쓰지 않는다. 사실·사용자 관찰·타 에이전트 보고·가설·제안을 구분하고 캡처 원문·credential 노출을 제한한다.

### {W2,W3,W4}

- 미완성 제어 시퀀스의 보관 한도 초과 시 PTY·기존 viewer는 유지하고 새 snapshot만 명시적으로 거절한다. ground와 UTF8 decoder-empty 경계에서 복원을 재허용한다. 정상 연속 출력 제한이나 timeout 실패로 바꾸지 않는다. 외부 동작 owner는 docs/specs/aiox-configuration-web.md의 살아 있는 서버로 자동 복귀 절이다. 승인 정책과 경계 proof는 최신 구현 착수 블록 entry를 따른다.

## 2026-09-10 · 공통 terminal snapshot 단계 신설과 복원 계약

사용자는 headless + SerializeAddon 기반 복원 방향을 결정하고, Claude 전용 Stage3와 분리된 공통 Stage2-1을 활성화하도록 요청했다. 이번에는 단계·포인터·로그·Work Items만 구성한다. W1의 활성 표시는 다음 재개 지점이며 제품 구현 착수나 완료가 아니다. 조사 원본은 보존하고 다음의 증류된 근거와 정정으로 소비한다.

### 문제와 근거 수준

| ID | 사용자 증상 | 확인된 근거와 남은 원인 판정 |
| --- | --- | --- |
| A | 헤더·본문·하단이 비었다가 드래그 또는 resize 후 나타남; 반대로 불필요한 문자 조각이 남음 | raw tail로 기준 화면·모드·escape 조각이 소실되는 격리 재현은 확인했다. 실제 드래그 구간에는 새 서버 출력도 도착했다. A 전체를 DOM 결함 또는 replay 단일 원인으로 확정하지 않는다. |
| B | prompt·입력·cursor 위치가 어긋남 | 같은 바이트의 geometry 차이 및 cursor 설정이 잘린 suffix에서 위치 차이를 격리 재현했다. 실제 resize 경합은 미확정이다. |
| C | 전환 후 wheel·Jump to bottom이 반응하지 않음 | mouse tracking 소실이 후보이며 DEFAULT 인코딩의 onBinary 미연결은 별도 확인된 입력 경로 갭이다. resize 후 ?1006이 포함된 캡처로 resize 전 상태를 확정하지 않는다. |
| D | scrollbar가 보이거나 wheel/thumb가 움직이지 않음; native scroll로 과거 출력 노출 | fullscreen이라는 사용자 관찰과 Web normal/baseY>0 기록이 어긋난다. raw tail에서 잘못된 normal scrollback을 격리 재현했지만 thumb 고착 자체는 재현하지 못했다. scrollbar 존재만으로 결함을 확정하지 않는다. |
| E | /exit 뒤 생성 문장 잔류 | 재부착 이전에도 보고됐다. 정상 alternate→normal 대역은 direct/중계 모두 정상이었다. cmux에서도 유사한 종료 표시라는 후속 관찰이 있어 정상 종료 출력과 비정상 잔상을 구분해야 한다. ?1049 소실 하나로 확정하지 않는다. |
| F | 재접속 뒤 OSC11·DA1 응답 조각이 shell 입력에 누적 | historical query→새 xterm 자동응답→onData→live PTY stdin 경로를 실제 PTY/WS 격리 재현했다. 화면 복원뿐 아니라 과거 재생과 live 입력/응답의 구분도 검증해야 한다. |

현재 코드에서 snapshot은 최근 64KiB raw suffix다. byte 중간 절단이 가능하고 화면 cell·cursor·alternate·mouse·paste 모드나 원래 geometry를 보존하는 snapshot이 아니다. main.ts는 다른 terminal 선택 시 기존 attachment를 dispose하고 새 xterm을 만든다. daemon은 snapshot을 보낸 뒤 subscribe하며 browser는 binary를 write하고 onData를 입력으로 전송한다. 기존 raw tail의 동기 저장을 전제로 한 같은 tick 계약을 비동기 미러에 그대로 적용하면 안 된다.

사용자 전달 실제 scroll 로그: normal, mouse any, baseY=3, viewportY=2→1→0→3이며 수신량은 그대로였다. 드래그 복원 구간에는 receivedFrames 65→73, receivedBytes 71347→72082, normal/mouse any/baseY=0이었다. render에서 DOM 텍스트 불일치는 없었다. 이는 관측 시점의 텍스트 일치이지 CSS·픽셀·관측 사이의 렌더 정지까지 배제하는 근거가 아니다. 중단점 정지 중 DOM과 buffer가 달랐지만 재개 후 둘이 같은 사례를 지속적 DOM 잔상으로 해석했던 설명은 철회한다.

조사 Prompt의 후속 캡처 보고는 65536 bytes에서 ?1049·?2004 없음, mouse 모드 각 1회, ?2026 set 22/reset 23, UTF-8 조각으로 시작 및 resize 후에도 normal 유지다. 이는 조사자 보고로 보존하며 이번 문서 작성에서 원본 바이트를 재분석하지 않았다. 그 수치로 모든 A~E 원인이나 Claude 자체의 무결함을 확정하지 않는다. 재부착 없이 나타나는 증상은 별도 원인이 있는지 재검증한다.

### 결정한 책임과 해결 방향

```text
서버
├─ PTY: shell·Claude·Codex 등 실행 및 바이트 입출력
└─ 세션당 headless: VT 해석, 화면·cursor·mode·geometry 유지
   └─ SerializeAddon: 접속 시 현재 상태를 복원용 바이트로 직렬화

브라우저
└─ xterm: snapshot/실시간 출력 표시, keyboard·mouse 인코딩
   └─ Stage6 React: 탭·분할·설정·포커스와 terminal 수명 관리
```

raw tail을 headless 상태 snapshot으로 대체하는 방향은 사용자 결정이다. SerializeAddon만 추가하는 변경으로 끝내지 않는다. 모드 보완·입력 경로·출력 경계·resize를 공통 terminal 경계에서 닫는다. Claude 기능을 끄거나 vendor UX를 새로 구현하지 않는다.

### 서버와 브라우저 복원 흐름

```text
서버
PTY 출력 → headless가 화면·모드 유지
         → 특정 출력 시점까지 파싱 완료
         → 크기 + 화면 + 누락 모드 복원 정보 생성
         → 그 시점 이후 출력과 구분

브라우저 재접속
① snapshot에 기록된 cols·rows로 xterm resize
② snapshot과 모드 복원 정보 적용
③ 파싱 완료
④ snapshot 이후 출력을 누락·중복 없이 적용
⑤ 현재 브라우저 영역에 맞는 크기를 서버에 요청
```

복원용 resize와 사용자 화면에 맞추는 resize는 별개다. 서버 snapshot이 219열이고 새 브라우저 영역은 170열이면 먼저 219열로 복원하고, 이후 170열을 요청해 서버 PTY·미러와 live 출력이 같은 변경 순서를 따른다. 처음부터 170열에 219열용 snapshot을 재생하면 wrap과 cursor가 달라질 수 있다. snapshot의 화면·모드·geometry는 같은 경계의 상태여야 하며, 복원 중 resize와 새 출력·exit도 순서가 보존되어야 한다.

headless write는 비동기다. write 직후 serialize가 이전 화면을 돌려주는 보고와 설치 라이브러리의 파싱 모델을 고려한다. 배리어와 임시 큐는 후보 구현 수단이지만 다음 불변을 먼저 검증한다.

```text
출력 A까지 반영된 snapshot + 출력 B부터의 후속 스트림
                          (A 다음이 B)
```

큐의 바이트가 snapshot에도 포함되면 중복이다. 수신 시점, mirror 파싱 경계, serialize 시점, 후속 큐의 시작점을 정확히 맞춘다. write("", cb) 배리어를 Promise로 기다리기만 해서는 serialize 전에 추가 파싱이 진행될 수 있으므로 경계 보장을 입증해야 한다. 배리어 콜백 안의 동기 직렬화 등 최소 방법을 검토하되 revision/ACK를 미리 필수 설계로 확정하지 않는다. 누락·중복·재정렬 없는 회귀 검사가 판단 기준이다.

### 누락 모드와 입력 경로

설치된 SerializeAddon 0.14.0은 mouse tracking을 직렬화하지만 ?1006/1016 인코딩은 내보내지 않는다. 설치 xterm 6.0.0은 DEFAULT mouse 보고를 onBinary, SGR 보고를 onData로 보낸다. AIOX Web은 onData만 연결되어 있다. DEFAULT의 좌표 한계와 onBinary 미연결은 별개다. 인코딩을 복원하지 않은 snapshot은 tracking만 켜진 채 DEFAULT로 남아 기존 입력 갭을 드러낼 수 있다.

- 서버 미러의 공개 parser handler로 CSI ? h/set, ? l/reset, ESC c/RIS 및 인코딩 전환을 실제 xterm 의미와 맞춰 추적한다. 기본 처리를 계속하도록 false를 반환한다.
- 실제 활성 인코딩만 복원한다. ?1006h를 무조건 붙이지 않고 1006/1016 전환·해제·reset을 검증한다. private _core 필드 의존이나 _serializeModes 전체 재구현은 피한다.
- onBinary는 문자열을 UTF-8 재인코딩해 원래 바이트를 바꾸지 않도록 전달한다. DEFAULT 입력 지원과 SGR 모드 보완을 독립 검증한다.
- historical 재생에서 발생한 자동응답이 live PTY에 주입되지 않게 하고, 정상 live query 응답과 사용자 입력이 유실되지 않게 한다. 미러/브라우저 자동응답의 책임과 복수 뷰어 중복응답도 검토한다.
- cursor 표시 등 추가 누락 모드는 실제 채택 버전으로 확인한다. beta/master의 기능이나 타 조사자의 버전 이력을 설치본의 보장으로 승계하지 않는다.

### 외부 참고와 반증의 적용 범위

VS Code ptyService.ts의 XtermSerializer는 서버 headless + serialize 및 cols/rows를 포함한 replay를 사용한다. 이것이 AIOX의 모든 복원·입력 조건을 검증해 주지는 않는다.

manaflow-ai/cmux 로컬 조사 커밋 8ba29eaad8c59a02c3fad483b39b365f89712db2의 Web byte 경로는 useAttachedTerminal.ts에서 reset→replay geometry resize→await writeReplay 순서이며 입력은 browser xterm.onData→client.send다. Web 셀 경로는 React가 셀을 그리지만 서버 Ghostty VT가 상태를 유지한다. 확인한 Web wheel handler는 자체 history를 조작한다. Rust MouseEncoder의 존재를 Web 서버 인코딩 근거로 확대했던 설명은 철회했다. native cmux에서 문제가 없다는 사용자 관찰을 Web 경로의 무결함으로 설명하지 않는다.

React로 운영 UI를 만들더라도 서버가 브라우저 부재 동안 상태를 유지해야 하는 책임은 남는다. Stage6에서 xterm을 React 안에 배치하면 이 단계의 headless/serializer를 그대로 소비한다. 셀 직접 렌더링·Ghostty 교체·전용 입력 프로토콜은 이번 결정 범위가 아니다.

### 검증과 남은 판단

기존 replay-fidelity.test.ts 3개는 합성 바이트에서 raw tail 상태 소실, snapshot 화면 복원, ?1006 누락을 확인하며 이전 검토에서 통과했다. 제품 snapshot/attach가 고쳐졌음을 검증하는 테스트는 아니므로 실제 공통 경로의 회귀 검사를 추가해야 한다. 과거 /private/tmp/aiox-terminal-ad-probe.mjs, aiox-terminal-f-replay.mjs, aiox-terminal-e-probe.mjs의 근거·한계는 조사 로그에 있다. 임시 파일 존속을 전제하지 않는다.

필수 검증은 (1) normal/alternate·cursor·styles·mode 복원 (2) 접속 중 연속 출력과 비동기 파싱의 누락/중복 방지 (3) 서로 다른 geometry와 복원 중 resize (4) DEFAULT/SGR mouse·mode reset·paste (5) historical query 차단과 live 입력 보존 (6) 재부착·복수 뷰어·exit·dispose·브라우저 detach 후 PTY 생존이다. 실제 A~F는 변경 후 다시 관찰하고 남는 문제만 후속 원인 조사로 분리한다. 합성 성공을 실제 Claude 또는 모든 OS 성공으로 확대하지 않는다.

replay-eye-check.mjs는 종료 후 snapshot이므로 실행 중 fullscreen 복원 검증을 대신하지 않는다. snapshot.bin의 ?1006h는 스크립트가 수동 추가했다. 실행 중 동일 경계의 실제 바이트/상태 비교가 필요하다. Prompt의 성능·메모리 수치는 타 조사자의 합성 보고이며 재현 스크립트·환경을 확인하기 전 예산 근거로 확정하지 않는다. scrollback 보존량·메모리·파싱 비용과 동시 뷰어 크기 정책은 일반 shell 시나리오를 포함해 정한다.

### 단계 연결과 이번 완료 범위

Stage2는 완료를 유지한다. Stage2-1이 공통 복원 기반을 선행 구현하고, Stage3는 W1을 open으로 둔 채 대기한다. 조사 로그 W5도 open으로 보존하며 증거 원본으로 소비한다. Stage6의 React UI·배치·설정·브라우저 복귀 통합 책임은 유지하되 snapshot 기반 구현을 중복하지 않는다. Stage2-1 완료 시 owner의 As-built와 tests를 실제 결과에 맞게 갱신하고 Stage3/Stage6에 소비 지점을 남긴다.

이번에는 새 로그 W1~W5와 활성 W1 및 plan 포인터만 준비한다. 제품 코드·의존성·사용자 프로세스 변경과 구현 테스트 실행은 하지 않는다.

### 2026-09-10 17:44 · Claude 조사용 진단 제거

사용자는 Claude가 조사·디버깅용으로 추가한 로직과 파일만 삭제하도록 요청했다. apps/web/src/attach.ts에서 Claude의 diffRows/trackBlankRows, 누적 행 상태·빈 행 경고·focus/visibility 및 추가 타이밍 진단을 제거했다. 기존 Codex 기본 terminalDebug(모드·수신량·DOM 불일치 행 번호)는 요청 범위를 구분해 유지했다. apps/web/src/attach.test.ts, packages/terminal/src/replay-fidelity.test.ts, packages/terminal/replay-eye-check.mjs를 삭제하고 해당 조사 파일만 사용하던 terminal devDependencies의 @xterm/headless/@xterm/addon-serialize 및 lock 항목을 제거했다. CLI ws 등 무관한 변경은 유지했다.

위 History와 Required Context의 삭제된 파일 경로는 이제 과거 조사 근거 locator이며 실행 가능한 현재 검사로 간주하지 않는다. W1에서 제품 경로에 맞는 회귀 검증을 새로 구성하고 W2에서 필요한 의존성을 실제 구현 기준으로 도입한다. 이번 정리는 headless/serialization 구현이 아니다. Web typecheck·기존 test 1개·build, terminal typecheck, 대상 oxlint/oxfmt가 통과했다. lockfile은 offline/ignore-scripts로 갱신했다. 사용자 프로세스와 조사 문서·Stage 포인터는 보존했다.

### 2026-09-10 17:44 · Codex 기본 진단도 제거

사용자가 Codex가 추가한 진단도 제거하도록 범위를 확대했다. apps/web/src/attach.ts의 남은 diff가 기본 terminalDebug 진단뿐임을 확인한 뒤 해당 파일만 HEAD 상태로 복원했다. Web source에서 terminalDebug/diffRows/trackBlankRows/aiox-terminal 검색 결과가 없고 attach.ts의 HEAD 대비 diff가 없다. Web typecheck·기존 test 1개·build가 통과했다. 앞 entry의 기본 진단 유지 설명은 이 요청으로 대체된다. 조사 문서와 Stage2-1 W1 활성 포인터는 유지한다.

## 2026-09-10 · 구현 착수·vendor 복원 경계 검증

사용자는 Stage2-1 구현을 subagent와 Ponytail full/TDD로 진행하도록 승인했다. 앞선 문서 준비·대기 제한은 이번 구현 요청으로 대체한다. 확정 요구 재승인은 하지 않고 내부 구현은 자율 판단하되, vendor 제약으로 복원 요구와 기존 방식을 함께 충족할 수 없으면 먼저 논의한다.

제품 Prompt·plan·storage-terminal/runtime/configuration-web owner와 PTY→snapshot→WS→Web/CLI 소비자를 추적했다. snapshot 소비자는 Web attach 외에 claude-controller.ts의 foreground와 claude.test.ts에도 있다. foreground CLI는 임의 JSON control을 거절하고 외부 터미널 geometry를 Web xterm처럼 직접 resize할 수 없다. lifecycle subscribe는 snapshot 없이 계속 필요하다. 기존 Web scrollback은 5000행, resize는 유효한 마지막 요청이 적용되며 타 viewer geometry broadcast는 없다. 이들을 새로운 확정 정책으로 승격하지 않는다.

위임: snapshot_vendor는 설치 vendor 파싱·직렬화 근거만 조사했고, web_contract는 Web/foreground 경로를 조사한 뒤 독립적인 onBinary 수정만 수행했다. 이번 발견과 부분 수정은 기존 W1/W3 안에서 소비하며 별도 독립 작업 수명을 만들지 않는다.

### 직접 확인한 vendor 경계

캐시의 headless6.0.0 + SerializeAddon0.14.0을 Node 격리 실행했다. production 의존성은 추가하지 않았다. 각 write callback을 기다린 뒤 serialize해도:
- BEFORE + ESC[? 까지 입력하고 snapshot 후 1006hAFTER를 연결: 원본 BEFOREAFTER, 복원 BEFORE1006hAFTER.
- 바이트 41 E2 82까지 입력하고 snapshot 후 AC 42 연결: 원본 A€B, 복원 AB.
Root가 위 두 사례를 직접 재실행했다. 파싱 callback은 chunk 처리 완료이지 제어 sequence/UTF8 완성의 보장이 아니다.
Subagent 추가 재현: ESC7/ESC8 저장 cursor, DECSTBM scroll margins, 사용자 tab stop은 snapshot 뒤 후속 출력 위치가 달랐다. 원본 savedcursor(row2,col4)와 복원(row0,col0), 원본 customtab(col3)과 복원(col8). 실제 Claude의 A~F 원인 전체라는 주장은 하지 않는다.
근거 source는 node_modules/.pnpm/@xterm+addon-serialize@0.14.0/node_modules/@xterm/addon-serialize/src/SerializeAddon.ts 및 @xterm+xterm@6.0.0의 src/common/InputHandler.ts, headless typings의 IParser다. 공개 parser handler는 완료 sequence를 처리하고 pending parser/decoder state export가 없다. 1006l/1016l은 현재 인코딩과 무관하게 DEFAULT로 해제되므로 독립 boolean 추적은 틀리다. 0.14 직렬화에는 인코딩1006/1016 및 cursor visibility25도 빠진다.

### 독립 수정과 검증

apps/web/src/attach.ts에서 onBinary를 Uint8Array.from(charCodeAt)으로 전송하고 detach 때 구독을 해제했다. 기존 onData UTF8 전송은 유지한다. apps/web/src/attach.test.ts 단일 행위 테스트가 고위 바이트80/ff 보존·한글 UTF8·연결 종료 후 미전송·두 구독 해제를 검증한다. Subagent RED(전송 undefined)→GREEN 확인; root diff 검토 및 Web2tests·typecheck·build 통과. Subagent 대상 oxlint/oxfmt 통과. 사용자 live 프로세스에 입력·종료·재시작하지 않았다.

### 미결과 재개

사용자에게 vendor 제약과 책임 PTY→headless→serializer→Web, 출력 중 탭 복귀 후 화면 차이를 설명했다. 선택지는 (추천) 일반 TUI 복원 요구를 유지하며 vendor 보완까지 검증·구현, 또는 기존 계획부터 구현·확인하고 확인된 결함은 후속 조사로 남김이다. 후자는 Stage2-1 전체 완료를 뜻하지 않는다. 답변은 아직 없으며 dependent snapshot/resize 구현은 진행하지 않는다. W1 활성·W2~W5 open 유지; W3는 onBinary 부분만 완료이며 모드/자동응답 검증은 남는다. 라이브 query의 viewer 중복응답과 foreground 응답 책임도 미확정이다.

### 2026-09-11 11:44 · Claude 반론·beta 단독 업그레이드 검증

사용자가 Claude의 반론을 전달했다. 이는 DECSC 제한 수용·beta 채택·scratchpad 삭제의 직접 승인으로 해석하지 않는다. 앞선 root 선택지는 구현 경계 처리와 요구 축소를 한데 묶었다는 지적이 타당하다. 미완성 sequence holdback은 기존 W2 경계 요구 안의 구현 후보이며 자체로 범위 확장은 아니다. 단 DECSC 알려진 한계 수용은 별도 판단이다.

직접 읽은 Claude scratchpad/package/package.json은 addon-serialize0.15.0-beta.301, commit c58ea3637f3968e0e6e79cd92cf9aace7ef89ee2, peer @xterm/xterm ^6.1.0-beta.304를 명시한다. src/SerializeAddon.ts540-552에 DECSTBM, modes.showCursor로 ?25l 생성이 있고 serialize 마지막에 modes→scrollregion을 붙인다. 현재 headless6.0.0에 이 로컬 beta lib를 로딩해 직접 실행했다: 기본 빈 snapshot이 ESC[?25l이며 modes.showCursor는 undefined다. 따라서 현재6.0.0+addon 단독업그레이드는 cursor hidden을 잘못 복원한다. 호환되는 전체 조합은 이번 실행에서 검증하지 않았다.
동일 조합에서 ESC[2;4r ESC[4;1H Z 후 snapshot은 CRLF3회 Z ?25l ESC[2;4r. 원본 cursor(1,3), 복원cursor(0,0); 후속 LF X의 위치도 달랐다. DECSTBM 재설정이 cursor를 이동시키므로 sequence 존재만으로 복원 완료를 판정할 수 없다. 지원 peer 조합의 전체 검증과 별도로 원래 geometry/cursor/modes 및 후속출력 동등성 검증이 필요하다.

Holdback은 상태 있는 경계 처리다. chunk 단위 suffix 검사만으로 충분하다는 30줄 주장은 아직 입증되지 않았다. OSC/DCS/ST/BEL·취소/중단·UTF8경계, held tail과 각 viewer의 정확히 한 번 전달, 큰/끝나지 않은 제어 문자열과 정상 출력 지연을 검증해야 한다. 첫 chunk의 tail을 이미 보낸 기존 viewer와 새 snapshot viewer의 후속전달 경계도 구분한다. DECSC가 attach 경계를 가로질러야 드러난다는 설명은 맞지만 발생확률·Claude사용빈도는 미확인이다. custom tabstop 누락 등도 이전 조사에 있으므로 구멍 하나로 축소하지 않는다. W5 잔여 증상 분리는 유효하지만 알려진 확정 복원 요구 실패를 자동 완료/수용하는 권한은 아니다.
이번에는 의견 검토와 로그 기록만 수행했고 dependency/production/사용자프로세스/clone을 변경하지 않았다. background job 종료 원인과 잃은 작업 없음은 독립 확인하지 않았다. W1 활성 및 기존 미결 유지.

### 2026-09-11 11:49 · 안정 버전 보완 제안과 캡처 판단 범위

Claude의 후속 의견을 검토했다. 안정 headless6.0.0/serialize0.14.0 유지 및 공개 handler로 ?25 보완, 상태 scanner를 기존 W2로 처리하는 방향은 타당한 제안이다. ?25는 set/reset뿐 아니라 RIS와 DECSTR의 표시 초기화를 포함해야 한다. 인용된 의견을 사용자 제한 수용으로 간주하지 않는다.

커서 이동을 scrollTop undefined로 추정한 부분은 직접 근거와 다르다. 이전 실제 snapshot에 ESC[2;4r가 있었고, 설치 xterm6 InputHandler.ts2794-2805는 유효한 scroll region 설정 후 _setCursor(0,0)을 호출한다. 따라서 이번 커서 이동은 유효한 DECSTBM을 cursor 복원 뒤에 붙인 순서로 설명된다. 지원 beta 조합 전체가 검증됐다는 뜻은 아니다.

Claude의 64KiB 기능별 횟수는 전달받은 측정이며 원본/스캐너를 이번에 재검증하지 않았다. 그 창에서 0회는 세션 전체 미사용이나 공통 terminal 지원 불필요의 근거가 아니다. Codex 한 번 스캔도 우선순위 참고는 되지만 일반 shell에서 다른 TUI를 실행하는 확정 시나리오까지 닫지 않는다. W5에서 실제 증상을 재확인하는 것과 이미 재현된 기능별 복원 실패를 한계로 수용하는 것은 별도다. 현재 의견은 기존 W2/W3 구현 방향에 동의하되, DECSC/DECSTBM/tabstop 제외를 확정하지 않는 것이다. 이번에는 코드/의존성 변경 없이 검토를 기록했다.

### 2026-09-11 12:49 · 공통 복원 검증 결과와 미완성 입력 한도 정책 승인

사용자는 fzf를 공통 Web terminal 결함의 실제 사례 중 하나로 명확히 했고, xterm 실제 상태를 활용한 복원·분할 입력 검증 후 Stage2-1 제품 작업을 재개하도록 지시했다. 이번 기록으로 이전 보고-only 범위를 종료한다. Ghostty 교체는 하지 않으며 구조 보존보다 중복 VT 구현을 피하는 단순한 해법을 우선한다.

검증: root가 headless6.0.0/serialize0.14.0 저장 커서 보완 proof를 재실행했다. normal 좌표·일부 SGR/charset·resize·trim·alternate 6건은 일치하지만 history 안에 남은 저장 좌표를 복원 후 높이를 늘리는 사례는 실패했다. snapshot 끝의 suffix만으로 전체 복원을 완료할 수 없다. 실제 임시 fzf0.74.3 실행중 snapshot 후 종료 출력은 원본7행/복원2행으로 달랐고, private savedX/Y만 보충한 대조에서는 종료 결과가 일치했다. 이는 격리 PTY+headless 실험이지 AIOX Web/WS 완료 증거가 아니다. 현재 cursor 열 차이는 별도 미조사다.

경계 proof: xterm 내부 EscapeSequenceParser와 Utf8ToUtf32를 화면 없는 probe로 재사용하여 마지막 ground+decoder-empty까지 미러에 반영하고 미완성 bytes와 resize를 순서대로 보관했다. 접속에는 safe geometry+snapshot+pending event tail을 보내므로 미종결 상태에서도 즉시 복원할 수 있다. 84개 경계 검사, 200 deterministic random chunk의 parser/decoder 동등성, 262150bytes 미종결OSC와 resize4회 뒤 종료·tail해제 검사를 통과했다. 최신 snapshot에 pending tail을 단순히 다시 붙이면 이미 처리한 LF가 중복되는 반례도 재현했다. private 접근은 버전 고정·검증이 필요하며 byte별 probe 비용도 남는다. 단일 로컬 측정은 260KB 일반출력 direct13.67ms/prototype19.21ms, 262150bytes 미종결OSC direct6.13ms/prototype14.58ms였으며 제품 성능 예산이나 다중 세션 수치로 일반화하지 않는다.

승인 정책: 사용자는 미완성 제어 시퀀스의 보관 한도를 넘으면 기존 PTY와 연결된 viewer는 계속 동작하고 새 접속의 화면 복원만 일시적으로 제한하는 동작에 동의했다. 안전한 파싱 경계로 돌아오면 복원을 다시 허용한다. 일반 연속 로그 출력에는 이 제한을 적용하지 않는다. timeout으로 정상 분할 입력을 오류 판정하지 않는다. 보관 bytes와 resize/event 개수를 유한하게 제한하며 구체 값은 자원 사용량을 근거로 구현에서 정한다. 초과 시 미러를 실제 입력까지 따라잡게 하고 보류 복사본을 해제한 뒤 unsafe 상태에서는 snapshot을 명시적으로 거절한다. 데이터나 제어문자를 조용히 잘라 정상 복원으로 보고하지 않는다. vendor10M payload 제한은 handler 문자열 제한이므로 raw tail 제한으로 빌려 쓰지 않는다.

흐름: PTY→실제 vendor parser 경계 판정→완성 경계까지 headless→snapshot geometry/bytes→보류 bytes·resize→live. write/resize/snapshot/exit는 순서대로 처리하고 mirror 반영 때 이미 전송한 live bytes를 다시 보내지 않는다. 한도 초과 동안 PTY 입력·기존 viewer는 유지한다. headless 저장 상태 보완, Web/foreground transport, historical query 책임은 별도 남은 W2~W4 작업이다. 임시 실험은 /private/tmp/aiox-boundary-verification/{stream.cjs,stream.test.cjs,parity.cjs,pending.cjs}, /private/tmp/aiox-savedcursor-proof.cjs, /private/tmp/aiox-fzf-case/check.cjs에 있다. 임시 파일 존속이나 합성 통과를 제품 회귀 검사로 대신하지 않는다.

### 2026-09-11 12:59 · W2 경계 모듈 구현·정책 회귀 검사

승인 정책을 configuration-web spec의 Committed target에 반영하고 W2를 active로 옮겼다. W1은 최종 producer/consumer 계약 검증이 남아 open으로 유지한다. headless6.0.0과 addon-serialize0.14.0을 terminal production 의존성으로 정확히 고정했다. beta는 도입하지 않았다.

Subagent simpler_xterm_design이 packages/terminal/src/boundary.ts와 boundary.test.ts를 구현했고 root가 diff와 실행 결과를 검토했다. MirrorBoundary는 fresh headless를 소유하며 xterm 실제 parser/UTF8 decoder를 화면 없는 probe로 재사용한다. write/resize/snapshot을 FIFO로 처리하고 동기·읽기 전용 capture에서 safe state와 복사된 pending event tail을 반환한다. capture 오류는 다음 작업을 막지 않고 write/resize 실패는 latch하여 이후 snapshot이 정상인 것처럼 반환되지 않게 한다. dispose는 실패 뒤에도 가능하다. index.ts는 빌드된 package entry에서 경계 모듈을 export한다.

기본 보관 한도는 미완성 bytes 1MiB 또는 events 1024개다. 초과하면 mirror를 따라잡게 하고 pending 복사본을 해제하며 snapshot을 명시적으로 거절한다. 종료 문자 등으로 safe 경계에 돌아오면 다시 허용한다. 전체 입력 FIFO/backpressure나 세션 전체 메모리의 상한을 뜻하지 않는다. 빌드된 entry의 격리 smoke에서 16개의 64KiB 미종결 OSC payload 뒤 거절 및 BEL+OK 뒤 복원 재허용을 직접 확인했다. GC 후 ArrayBuffer 증가량은 초과 전983040bytes, 초과 후180224bytes였다. 이는 단일 실행의 ArrayBuffer 관측이며 RSS·성능 예산으로 일반화하지 않는다.

검증: 최종 terminal 28tests(기존15+새13) 통과. UTF8/CSI/OSC/DCS/invalidUTF8의 byte 분할, LF 중복 방지, resize 순서, 한도 초과와 회복, snapshot 시점, 입력/반환값 독립 복사, write/resize 실패와 dispose를 검사한다. terminal typecheck/build, 대상 oxlint/oxfmt, spec inline-code 검사 통과. 이전 중간 실행의 27tests는 최종 write 실패 회귀 검사 추가 전 결과다.

현재 createTerminal은 아직 기존 raw tail을 사용한다. 따라서 경계 모듈은 제품 소스에 구현됐지만 live PTY/daemon/Web에는 연결되지 않았다. 저장 커서·속성·charset·scroll margins/tab stops 직렬화 보완, 공통 attach 경계, Web geometry-first 복원과 foreground 소비자, historical query 처리는 남아 있다. 특히 history 안의 저장 커서를 복원 후 높이를 늘리는 반례 때문에 suffix 보완만으로 전체 복원 완료를 선언하지 않는다. 다음 작업은 직렬화 보완을 재현 검사로 닫고 이 경계를 실제 세션과 소비자에 연결하는 것이다. W2 active, Stage2-1 미완료. 사용자 live 프로세스·무관한 변경은 건드리지 않았고 커밋하지 않았다.

### 2026-09-11 13:04 · 4501 임시 시각 검증 페이지

사용자 요청으로 apps/web/dist/boundary-test.html 및 boundary-test.js를 임시 생성했다. http://localhost:4501/boundary-test.html에서 제공되며 기존 index와 daemon 프로세스는 변경하지 않았다. 생성 원본은 /private/tmp/aiox-boundary-visual/demo.ts와 build.cjs다. Web 재빌드 시 dist의 임시 파일은 제거된다.

실제 MirrorBoundary source와 설치 headless/serialize/xterm을 browser bundle로 실행한다. 서버 PTY/WS 통합을 가장하지 않으며 페이지에 모듈 격리 검증임을 명시했다. 1MiB bytes 또는 1024 events 선택 후 한도 이내 복원→1byte/1event 초과 거절→BEL과 후속 출력→복원 회복을 버튼으로 확인한다. 기존 viewer와 새 snapshot viewer를 나란히 표시한다. HTTP200 제공 확인, 별도 headless Chrome 프로필의 자동 클릭으로 두 시나리오 PASS 확인. 정상 회복 뒤 pending0bytes/0events다. 첫 inline bundle은 HTML 파싱 문제로 실패하여 external JS로 수정 후 재검증했다. Stage2-1 W2 active 유지.

### 2026-09-11 13:20 · 실제 vendor TUI 검증 전 범위로 subagent 작업 배정

사용자는 Ponytail 스킬을 적용한 subagent 작업을 지시하고 이번 범위를 Stage2-1 실제 Claude·Codex TUI 검증 직전까지로 지정했다. W1~W4 구현·통합 및 관련 공통/합성 회귀 검사는 포함하되 실제 vendor 실행을 통한 A~F 최종 판정은 진행하지 않는다. 이 경계에 도달해도 Stage2-1 전체 완료나 W5 전체 완료로 표시하지 않는다.

배정: snapshot_fidelity_impl은 terminal serialization.ts와 인접 tests 범위에서 실제 xterm 상태 및 addon 재사용 기반 직렬화 보완을 담당한다. 저장된 history 커서, attrs/charset, alternate, margins/tabs, encoding/visibility를 검증하며 vendor patch가 필요하면 구체 근거를 먼저 제출한다. attach_contract_review는 서버 TerminalSession 통합 attach와 daemon/foreground 소비자·자동응답 책임을 읽기전용 검토한다. saved_cursor_claude는 이전 fzf 조사를 마쳤고 이번에는 Web attach 복원 순서·테스트 준비를 맡는다. wire 계약 확정 전 dependent Web 변경은 하지 않는다. root는 계약 조정·통합과 검증·로그를 소유한다.

Ponytail full/TDD, 기존 코드/vendor 우선, 사용자 live 프로세스 비변경을 공통 지시했다. 공개되지 않은 상태를 Web sidecar로만 보완하면 foreground 소비자가 복원할 수 없으므로 그 방식을 아직 채택하지 않았다. 작은 vendor 접근/patch와 ANSI 복원 순서의 충분성을 먼저 확인한다. 내부 계약 판단은 자율 진행하되 새로운 사용자 제한이나 확정 요구 충돌을 숨기지 않는다. W2 active 유지.

### 2026-09-11 13:45 · 통합 attach·상태 보완·Web 복원 구현과 공통 검증

root와 subagent가 실제 Claude/Codex TUI 실행 전 범위의 구현을 진행했다. TerminalSession.snapshot()을 제거하고 attach(listener)가 동기 등록/취소와 snapshot→보류 출력·resize·exit→live 순서를 소유하게 했다. snapshot 없는 subscribe는 lifecycle/신규 foreground 관측용으로 유지한다. 세션마다 headless6.0.0과 MirrorBoundary를 생성하며 기존 64KiB raw tail을 제거했다. 미러 scrollback은 기존 Web xterm의 5000행과 맞췄다. 접속 준비 중 취소·출력·resize·exit, 한도 초과 시 기존 출력 유지와 새 복원 거절/회복을 제품 경로 회귀로 검사했다.

직렬화: snapshot_fidelity_impl이 serialization.ts/restore.ts/serialization.test.ts를 구현했다. 처음 ANSI suffix/prelude 방식은 viewport 밖 tabstop·alternate savedY·숨은 셀과 후속 resize를 온전히 보존하지 못했다. foreground 소비자를 신규 프로세스 raw startup으로 분리한 근거로 Web snapshot에 addon 화면 바이트와 제한된 누락 상태를 함께 전송하는 방식으로 바꿨다. 전체 parser/decoder를 복제하지 않는다. 저장 커서·속성·charset·margins/tabs·encoding/visibility, 숨은 셀/잘린 wide cell, 확장 속성·보호 셀·hyperlink registry를 보완한다. addon에는 읽기 전용 visible buffer view를 제공하여 숨은 셀이 다음 행에 출력되는 오염을 막는다. 상태는 JSON 경계를 검증한 뒤 복사하여 적용하고 private 접근은 xterm6.0.0에 결합된다. vendor patch/beta 업그레이드는 없다.

foreground: attach_contract_review가 ClaudeBinding/controller에 initialListener를 연결했다. root가 createTerminal의 첫 PTY callback 이전 등록을 RED→GREEN으로 구현했다. 새 vendor startup의 raw bytes/query/고위 바이트를 정확히 한 번 전달하고 snapshot 재생과 Web metadata를 foreground에 보내지 않는다. 시작 중 종료·disconnect를 검사했다. 해당 agent는 daemon terminals.ts도 통합 attach로 전환했다.

Web: saved_cursor_claude가 attach.ts와 인접 tests를 구현했다. snapshot geometry→binary 파싱→snapshot-end의 상태 보완→pending events→restored→입력 활성 순서다. 과거 재생 동안 disableStdin으로 자동응답도 억제한다. pane은 proposeDimensions로 resize 요청만 보내고 실제 xterm.resize는 서버 이벤트 순서에 따른다. 오류/누락 state/닫힌 attachment의 늦은 callback을 처리한다. browser-safe @aiox/terminal/restore export와 workspace 의존성을 연결했다. node-pty는 browser bundle에 들어가지 않는다.

직접 검증: terminal 최종54tests·typecheck·build, Web9tests·typecheck·build, daemon typecheck/build, foreground11tests 및 대상 lint/format 통과. daemon PTY/WS/controller37tests 통과 후 최종 serializer 변경에 대한 재검사를 진행했다. sandbox의 listen EPERM 실패는 기능 회귀 증거에서 제외하고 승인된 격리 실행으로 확인했다. 실제 PTY→통합attach→WebSocket→headless에서 snapshot/tail 뒤 분할 CSI 완성이 원본 화면/커서/SGR encoding과 일치했다(/private/tmp/aiox-stage21-ws-check.ts). 실제 fzf0.74.3를 제품 node-pty1.2.0-beta.15와 새 serializer로 실행한 검사에서 attach 현재 cursor와 저장 cursor가 일치했고 Esc 종료 후 AFTER_EXIT도 원본7행과 같았다(/private/tmp/aiox-fzf-fixed/check.cjs). 이 fzf 검사는 Web/WS를 통과하지 않은 별도 격리 검사다.

Subagent 실제 Chrome/actual attach/xterm 검사: historical CPR·OSC11 응답0회, live CPR1회; historical tail ESC[6이 restored 뒤 live n으로 완성될 때도1회. transport만 fake이며 결과는 /private/tmp/aiox-web-query-proof에 있다. 실제 Claude/Codex TUI는 실행하지 않았다. 복수 viewer의 live 자동응답 책임은 기존 구조의 잔여 쟁점으로 별도 확인 중이며 해결됐다고 선언하지 않는다.

아키텍처 owner의 raw tail as-built 설명을 현재 구현으로 갱신했다. 사용자 daemon을 재시작하지 않았으므로 실행 중4501이 새 서버 코드를 쓰는 것은 아니다. Web build는 dist를 갱신하므로 새 protocol Web과 기존 실행 daemon을 섞어 실물 검증하지 않는다. 이전 임시 boundary-test 페이지는 예고된 Web 재빌드로 제거됐다. 현재 UI 자산/서버의 함께 적용과 실제 vendor 검증은 사용자 live 작업을 종료하지 않는 시점에 별도로 해야 한다. 무관한 worktree 변경과 architecture.excalidraw는 보존했고 커밋하지 않았다.

### 2026-09-11 13:46 · 최종 공통 검사와 복수 viewer 자동응답 잔여 결정

최종 직렬화 보완은25tests, terminal전체55tests이며 agent가 typecheck/lint/format과 함께 확인하고 파일을 freeze했다. root 직전54tests 및 최종 daemon37tests/foreground11tests/Web9tests는 직접 통과를 확인했다. 마지막1개는 origin cursor를 hyperlink 등록 전에 복원하고 scroll/clearhistory 후 URL을 보존하는 회귀다. W2/W4를 completed로, W3를 active로 변경했다. W1 최종 계약 대조와 W5 실제vendor검증은 남긴다.

실제 Chrome에서 같은 terminal ID의 attachment2개에 live CPR을 각각 전달했을 때 각창이 ESC[1;5R을1회씩 전송하여 총2응답임을 subagent가 확인했다(/private/tmp/aiox-web-query-proof/two-dom.txt). actual attach/xterm이고 transport만 fake이므로 PTY 수신까지의 직접증거는 아니다. 단일viewer의 historical차단/live보존과는 다른 기존 공통 쟁점이다.

사용자에게 논의할 제안: 모든 창의 사용자 입력은 유지하되 자동응답만 한 창이 담당하게 한다. 최근 입력한 창을 담당으로 하고 입력이 없으면 먼저 연결된 창, 담당이 닫히면 남은 창으로 넘기는 정책 후보다. 서버가 모든query에 대신답하는 방법은 브라우저별테마/기능응답과 달라질 수 있어 즉시채택하지 않는다. 기존 모든창응답을 그대로 둘 수는 있지만 중복은남는다. 이는 아직 승인된정책이 아니며 dependent 응답권 구현은 진행하지 않았다. 사용자가이전계속지시로이선택까지승인했다고해석하지않는다.

### 2026-09-11 13:59 · 복수 Web 연결 자동응답 담당 승인·구현과 검증

사용자는 같은 shell을 여러 브라우저에서 사용하는 상황에서 추천한 자동응답 담당 정책을 승인했다. cursor 좌표로 연결을 고르는 것이 아니라 마지막 실제 입력 연결이 담당하며, 최초에는 첫 연결, 담당 종료 시 남은 첫 연결로 이전한다. 모든 연결의 사용자 입력은 유지한다. 외부 계약은 configuration-web spec에 반영했다.

Daemon은 live 출력마다 담당 여부를 함께 보내고 Web은 순서대로 파싱하며 지정된 연결만 질의에 응답한다. terminal attach가 복원 중 출력을 보류하더라도 동일 출력 토큰의 담당을 WeakMap으로 고정하여 viewer별 처리 시점 차이로 중복 응답자가 생기지 않게 했다. 지연된 정당한 응답은 현재 담당이 바뀌었다는 이유로 버리지 않는다. 자동응답과 focus/blur 통지는 사용자 입력과 별도 전송하여 담당을 바꾸지 않는다.

Web의 공개 onData는 입력 여부를 잃으므로 고정 xterm6.0.0의 triggerDataEvent와 InputHandler.parse 두 경계에서 실제 입력 여부와 파싱 중 응답을 구분한다. native 처리를 그대로 호출하고 close에서 원래 메서드를 복구한다. 파싱 밖 focus/blur 통지는 보존한다. 새 의존성·문자열 응답 추측 필터는 추가하지 않았다.

Root terminal55/Web10 tests 및 Web typecheck 통과. daemon agent는 동일 출력의 지연 viewer와 담당 변경 경합을 RED→GREEN으로 확인했다. 별도 agent 실제 Chrome+xterm 검사에서 historical CPR/OSC11 응답0, live CPR 담당 한 연결만 응답, 담당 전환 및 분할 CSI 완성 시 지정 연결만 응답, 양쪽 focus/blur 통지 보존을 확인했다. 이 Chrome 검사는 fake WebSocket이 담당 flag를 지정한 검사이며 실제 daemon/PTy까지 연결한 통합 검사는 아니다. custom async parser handler와 실제 Claude/Codex TUI는 검사하지 않았다. live4501 재시작·사용자 프로세스 입력·커밋은 하지 않았다.

### 2026-09-11 14:00 · W3 회귀 완료·계약 최종 점검으로 복귀

Root가 daemon terminals 전체18 tests를 PTY·소켓 사용 가능한 권한으로 다시 실행해 통과했다. 첫 sandbox 실행은 harness 생성 제한으로 실패했으며 권한 밖 재검사에서 통과했다. terminal55/Web10 및 git diff --check와 합쳐 W3를 completed로 전환한다. W1의 최종 공통 계약 대조로 active pointer를 옮긴다. W5와 Stage2-1 전체 완료 또는 실제 Claude/Codex 증상 해결을 선언하지 않는다.

### 2026-09-11 14:02 · attach 영문 표시·컨테이너 resize와 구형 스트림 오류 처리

사용자가 localhost4501 shell이 계속 복원 중으로 표시되는 화면을 제시하고 attach 영문 문구, boundary-test.html 삭제, ResizeObserver 적용 여부를 요청했다. agent read-only 확인:4501 listener PID92512는 9월10일13:58 시작한 node daemon이며 현재 Web asset은 9월11일13:46 빌드다. HTTP index는 새 asset을 참조한다. 구형 실행 daemon과 새 Web 혼합의 근거이며 사용자 PTY의 실제 WS 프레임은 새로 관측하지 않았다. daemon 재시작은 수행하지 않았다.

attach와 선택 직후 연결 표시는 영어로 변경했다. snapshot 없이 binary가 오면 무한 restoring 대신 버전 호환 확인 오류로 attachment만 닫는다. host ResizeObserver로 창 크기 외 컨테이너 변경도 감지하며 기존120ms debounce와 복원 후 서버 resize 요청 순서는 유지한다. detach 시 observer 해제·pending timer 취소를 검증했다. 두 변경 모두 실패 테스트 후 구현하여 Web11 tests/typecheck 통과했다.

boundary-test.html은 source/dist에 이미 없다. 해당 URL의200응답은 실제 임시 페이지가 아니라 index fallback이었다. 다른 조사 자산을 해당 파일로 간주해 삭제하지 않았다. 실제 Claude/Codex 검증이나 live PTY 입력은 하지 않았다.

### 2026-09-11 14:11 · Stage2-1·Stage3 로직과 설계 검토 결과

사용자는 ResizeObserver 사례처럼 Web API뿐 아니라 로직·설계·vendor 재사용까지 더 나은 방법을 subagent로 검토하도록 요청했다. 3명에게 Web/attach, terminal 엔진·경계, Stage3 실행·상태를 나눠 read-only 위임했다. 큰 리팩토링은 적용하지 않았다. attach 자체 상태·오류·exit와 downstream restore/boundary 오류는 이미 영어다. index.html의 초기 attach 안내만 영어로 추가 수정했고 Web build/diff check 통과했다. 전체 Web 번역은 요청 범위가 아니다.

최우선 직접 재현: Node24.14.0에서 node --input-type=module -e 'import("./packages/terminal/dist/index.js")'가 @xterm/headless의 named Terminal export 부재로 실패했다. agent와 root 모두 확인했다. build/typecheck/Vitest 통과가 built Node 실행 성공을 보장하지 않으며 앞선 완료 보고의 검증 범위를 이 사실로 제한한다. CJS 의존성 import 방식을 수정하고 실제 package entry 로딩 검사를 추가하는 것이 우선이다. 새 vendor 버전이나 번들 계층이 필요하다는 근거는 없다.

Web reviewer와 root 대조: daemon terminals.ts196의 Number.isInteger와 terminal index.ts208의 Number.isSafeInteger가 다르다. cols=9007199254740992는 transport 통과 후 예외가 나며 socket message243~253에 catch가 없다. 같은 유효성 계약과 attachment 단위 예외 처리를 추천한다. 실제 daemon 중단은 유발하지 않았다.

terminal boundary의1MiB/1024 제한은 미완성 suffix만 제한하며 write의 Promise FIFO와 attachment pending/WS 전송 대기량 전체를 제한하지 않는다. agent 격리 측정에서512×256바이트 ASCII burst의 직접 headless enqueue3회는9/1/3ms, MirrorBoundary는586/591/587ms였다. 매 chunk callback 완료 후 다음 write하는 스케줄링과 bytewise 경계 검사 비용이 합쳐진 결과이며 실제 PTY 전체 처리량이나 bytewise 비용 단독 측정은 아니다. 순서·snapshot cut을 보존하는 batch 처리 검증을 우선하고, flow-control/느린 viewer 정책은 별도 관측과 필요 시 사용자 논의를 거친다.

반복 동일 geometry 요청은 줄일 후보지만 단순 client term.cols 비교는 요청B 처리 중 host가A로 돌아오는 경우 최종A 요청을 누락할 수 있다. 따라서 reviewer의 즉시 equality guard 제안을 그대로 적용하지 않고 서버 확정 geometry와 진행 중 순서까지 검증할 대상으로 남긴다. 미완성 복원 거절 문구는 영어이나 PTY 생존·재선택 안내가 있으면 더 명확하다.

Stage3의 기존 wasReady 활용, Notification/식별된 승인 요청 중복 상태 제거, probe/spawn cwd 일치는 Stage3 로그 최신 entry에 남겼다. 관측 상태 합성 재현과 코드 기반 위험을 실제 vendor 실패로 확대하지 않는다. 실제 Claude/Codex 실행, live4501 restart, 사용자 PTY 입력은 하지 않았다. W1 최종 계약 점검에서 이번 결함을 소비하며 Stage2-1 완료로 선언하지 않는다.

### 2026-09-11 14:11 · terminal reviewer 최종 보완·종료 책임

terminal reviewer 최종 확인: daemon dist/main.js도 @aiox/terminal 외부 import를 소비하므로 built package 로딩 결함이 실제 daemon 경로에 연결된다. index.ts296의 pending.shift 반복은 인덱스 순회 후 비우기로 단순화할 후보이며, callback이 추가한 이벤트까지 처리하는 의미를 보존해야 한다. boundary.dispose는 있으나 session 종료/registry 제거와 연결되지 않았다. 명시적 retirement 책임이 필요하지만 늦은 attach와 최종 출력 복원을 고려해야 하며 exit 즉시 dispose는 추천하지 않는다. 참조 제거 후 GC 가능성이 있어 영구 누수로 단정하지 않는다. 저장 커서·숨은 셀 보완은 확인된 반례를 해결하므로 단순히 길다는 이유로 삭제하지 않는다.

### 2026-09-11 14:40 · 검토 결함 수정·느린 viewer 정책 승인과 공통 회귀

사용자는 Claude 검토를 직접 대조해 Stage2-1·Stage3 수정 작업을 subagent와 Ponytail full로 수행하도록 승인했다. 단순 tsup 설정과 ResizeObserver 변경에 형식적인 영구 테스트를 추가하지 말라는 지시를 따랐다. 기존 ResizeObserver는 유지했고 headless만 tsup noExternal로 번들했다. addon-serialize/node-pty까지 불필요하게 번들하지 않았다. 실제 built terminal/index·restore·daemon/index의 Node import를 직접 통과했다.

비동기 경계는 출력 제출 FIFO와 파싱 완료 Promise를 분리했다. snapshot·resize·dispose는 앞선 파싱을 기다리며 뒤 출력을 snapshot보다 먼저 제출하지 않는다. callback을 지연시킨 회귀 검사로 순서를 고정했다. 동일512×256바이트 격리 benchmark는 변경 전586/591/587ms에서 변경 후15/8/8ms였다. 실제 PTY 전체 성능이나 bytewise parser 자체 개선 수치로 해석하지 않는다.

일반 미러 대기량은 native node-pty pause/resume으로 조절한다. 미파싱1MiB에서 읽기를 멈추고512KiB 이하에서 재개하며 성공·실패 모두 정산한다. 이는 미완성 suffix1MiB·1024이벤트 복원 거절 정책과 별개이고, 이미 도착한 chunk 및 OS/vendor buffer를 포함한 총메모리의 엄격한 상한을 뜻하지 않는다. session.dispose는 exit와 대기 중 복원·파싱 후 미러를 정리하며 registry 제거 및 Claude binding 소유자에 연결했다. 출력 delivery는 shift 반복 대신 재진입을 보존하는 인덱스 순회로 바꿨다.

사용자는 느린 브라우저만 명시적으로 끊고 재접속 시 snapshot 복원하는 추천을 승인했다. live 출력 누적offset과 xterm write callback 이후 ACK로 해당 연결의 미파싱 대기량을 추적한다.8MiB를 넘길 다음 live 출력은 전송하지 않고 영어 오류·close1013·즉시detach한다. PTY와 다른 viewer는 유지한다. snapshot/역사 tail은 이 live 한도에 포함하지 않으며 재접속offset은0부터다. counter 두 개를 사용하고 chunk별 ACK 맵이나 새 의존성은 추가하지 않았다. 유효하지 않은 ACK·느린/정상 동시 viewer·큰 snapshot·재접속 회귀를 확인했다.

WebSocket resize 검증을 양수 safe integer로 통일하고 입력 처리 예외를 연결 안에서 처리했다. 저장 커서만 보정하는 대신 복원 source/target의 실제 baseY 일치를 확인해 절대행 기반 저장커서·숨은셀·링크 patch가 다른 history에 적용되지 않게 했다. history가 같은 서로 다른 scrollback 설정은 허용한다. 실패 전에 target을 변경하지 않는 회귀를 포함한다.

검증: pnpm check 전체 성공(lint·format·build·typecheck·343 tests: terminal60, daemon166, Web18, CLI34, 그 외65). 실제 Node built import 성공. 격리 실제 PTY→WebSocket→snapshot/state/tail에서 분할 CSI 이어붙이기 및 SGR 상태가 원본과 일치했다. 임시 smoke의 CJS 해석 경로를 맞춘 뒤 localhost listen sandbox 제한으로 escalation 재실행하여 통과했으며 제품 import 결함과 혼동하지 않는다. agent의 격리 native32MiB 출력은 전부 수신·kill/dispose 성공했으나 watermark가 발동하지 않아 과부하 중 kill 증거는 아니다. native 강제pause→kill은 macOS에서 약203ms 후 종료됐지만 vendor200ms socket destroy fallback이므로 읽지 않은 최종 출력 보존을 증명하지 않는다. Windows는 source 검토만 했다.

Stage3의 wasReady·Notification 상태 책임·probe cwd·binding dispose 수정과 검증은 Stage3 로그가 소유한다. 실제 Claude/Codex TUI, A~F 재판정과 OS 검증은 미완료다. 사용자4501 daemon·PTY는 재시작/입력하지 않았고 커밋하지 않았다. W1 계약 최종 점검과 W5 실제 검증 포인터를 완료로 바꾸지 않는다.

### 2026-09-11 14:41 · 실제 Chrome xterm의 복원 응답·ACK 최종 검증

최신 Web source와 built restore로 격리 headless Chrome 검사를 추가 통과했다. 두 viewer의 historical DSR/OSC11 응답은 없고 live DSR은 지정 owner만 응답했다. 분할 CSI는 prefix 무응답·완료 청크 owner만 응답했으며 focus in/out은 양쪽에서 유지됐다. xterm 파싱 완료 후 ACK는 양쪽 모두4/8/11/12/20으로 마지막 출력offset20과 일치했다. 임시 결과 /private/tmp/aiox-web-query-proof/owner-dom-current.txt의 pass=true를 agent가 확인했고 전용 Chrome도 종료했다. 실제 브라우저와 xterm을 사용했으나 이 검사의 transport는 FakeSocket이다. 실제 PTY/WS 복원 검증 및 서버 느린 연결 단위 회귀와 구분하며 전체 네트워크 backpressure 실측으로 보고하지 않는다.

## 2026-09-11 · 사용자 실사용 검증에 따른 W5 완료

사용자는 W5를 직접 수행했으며 A~F가 해결된 것으로 판단한다고 보고하고 W5 완료 처리를 요청했다. 이 결과는 사용자 실사용 확인이며 agent가 동일 시나리오를 재실행한 결과가 아니다. 기존 OS 검증 한계는 유지하고 전 OS 통과로 확대하지 않는다.

W1 감사에서 추가 발견한 LNM·커서 깜빡임 누락은 수정했고 terminal 67개·Web 20개 회귀를 통과했다. 복원 구조와 구현된 정책은 docs/architecture/aiox-storage-terminal.md 및 docs/specs/aiox-configuration-web.md에 반영했다. 해당 추가 수정의 사용자 실사용 재검증이나 최신 daemon 재시작까지 완료됐다고 해석하지 않는다.

W5를 완료로 표시한다. W1의 최종 정리와 Stage 2-1 로그 종료·Stage3 재개 포인터 전환은 이번 요청에서 변경하지 않는다. Stage6의 운영 Web 통합은 별도 단계로 유지한다.

## 2026-09-11 · W1 최종 감사 완료 및 Stage3 인계

사용자 요청으로 W1과 단계 종료 상태를 정리했다. PTY→미러 FIFO→snapshot/tail→Web 복원·live 및 입력·resize·exit·dispose 경로를 대조했고, 발견한 LNM·커서 깜빡임 누락은 기존 snapshot 상태와 공개 options로 보완했다. 공유 빈 셀 오염 수정·scratchCell·Claude의 UI 수정도 유지했다.

최종 terminal67/Web20 tests를 root가 재확인했다. subagent는 terminal/Web/daemon 타입 검사, terminal/Web 빌드, built Node import와 대상 lint/format을 통과했다. docs/architecture/aiox-storage-terminal.md와 docs/specs/aiox-configuration-web.md에 구조·정책을 반영하고 문서 링크·inline code 검사를 통과했다. W5는 사용자 실사용 확인으로 완료했고 OS 검증 한계는 유지한다. W1~W5에 남은 실행 항목이 없어 이 로그를 decided로 닫는다.

Stage3 W1에 공통 복원 기반과 검증 범위를 인계하고 plan을 Stage3로 옮긴다. Stage6 운영 Web 통합과 Stage8 전 OS/배포 검증은 각 기존 단계가 소유한다. 최신 Web은 추가 snapshot 상태를 요구하므로 향후 실사용 검증 전에 서버와 Web을 같은 빌드로 맞춰야 한다. 이번 정리는 daemon 재시작·사용자 세션 조작을 포함하지 않는다. 독립 로그이므로 별도 Return Target 소비는 없다.
