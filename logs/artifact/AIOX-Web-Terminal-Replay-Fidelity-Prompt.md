# AIOX Web 터미널 재부착 화면 소실 — 조사 인계 프롬프트

> Stage 2-1의 W1~W5는 완료됐고 [단계 로그](../2026-09-10-AIOX-TUI-Stage2-1-Terminal-Snapshot.md)는 decided다. 현재 재개 지점은 Stage3 W1이며 Stage6는 공통 복원 기반을 운영 Web에 통합한다. 최신 해결 내용은 8절을 먼저 읽는다.

갱신일: 2026-09-11. 2~7절은 2026-09-09~10의 조사 관측과 당시 가설을 보존한다. 당시 raw tail 코드와 누락 상태를 현재 구현으로 오해하지 않는다. 해결 결과와 검증 한계는 8~9절을 따른다.

## 1. 이 문서를 받은 agent의 역할

너는 이 조사를 이어받거나 검토하는 agent다. 이 문서를 받았다는 이유로 구현을 시작하지 않는다. 사용자가 요청할 때 이 문맥을 적용한다.

수용 규칙을 먼저 정한다.

- **여기 적힌 결론을 무조건 수용하지 않는다.** 아래 4절의 조사 관측과 코드 근거를 구분하고, 구현 시 채택한 버전과 실제 제품 경로에서 다시 검증한다.
- 4절(측정으로 확인)과 5절(추론)과 7절(미해결)을 섞지 않는다. 5절은 근거 있는 추정일 뿐이고 반증 가능하다.
- 6절에 이 조사가 세웠다가 **틀린 것으로 판명된 가설**을 남겨 뒀다. 같은 길을 다시 파지 않기 위한 것이기도 하고, 이 조사자의 판단이 여러 번 빗나갔다는 근거이기도 하다. 남은 결론도 같은 정도로 의심해도 된다.
- 사용자 관찰, 이 조사자의 측정, 코드에서 읽은 것, 웹에서 찾은 남의 보고를 구분해서 말한다.

## 2. 증상 (사용자 관찰)

AIOX Web 터미널(xterm.js 6.0.0, DOM 렌더러)에서 Claude Code fullscreen 세션을 볼 때 나타난다.

- A. 화면에 있어야 할 부분이 통째로 비어 있다. TUI 전체가 부분적으로만 그려진다. 리사이즈하면 정상으로 돌아온다.
- B. prompt·입력·커서 위치가 어긋난다.
- C. 마우스 휠 스크롤이 TUI에 전달되지 않는다.
- D. alt screen인데 xterm scrollbar가 보인다.
- E. `/exit` 후 대화 중 생성된 텍스트가 화면에 남는다.
- F. 재접속 시 OSC11/DA1 응답 바이트가 live PTY stdin으로 새어 들어간다. (당시 조사에서는 다루지 않았으며 이후 Stage2-1에서 처리)

## 3. 어떻게 진단했는가

조사 당시 render 시점의 논리 버퍼와 DOM 텍스트, buffer·mouse 모드, geometry·수신량·행 변화를 비교했다. 별도 읽기 전용 WebSocket 뷰어로 데몬의 replay 바이트를 받아 분석했으며 사용자 세션에 입력하지 않았다.

## 4. 조사 관측과 코드 근거

관측 결과는 해당 캡처 시점과 조사 버전에 한정한다. 제품 구현의 검증 기준은 9절을 따른다.

### 4.1 관측된 render에서 버퍼와 DOM 텍스트가 일치했다

조사 캡처의 render 이벤트에서는 버퍼와 DOM 텍스트 불일치가 보고되지 않았다. 이 결과만으로 CSS·픽셀 표시나 관측 사이의 렌더 정지까지 배제할 수는 없다. 내용 소실과 표시 문제를 구분하려면 증상 전후 같은 행의 상태와 새 출력 유무를 함께 비교해야 한다.

### 4.2 replay는 정확히 65536 바이트이고 한 프레임으로 온다

`packages/terminal/src/index.ts`의 `DEFAULT_REPLAY_BYTES`가 `64 * 1024`이고, `snapshot()`이 `Buffer.concat(replay)`로 raw 바이트 꼬리를 돌려준다. 브라우저 `receivedBytes`와 별도 뷰어 캡처가 둘 다 65536, `receivedFrames` 1이었다.

### 4.3 replay 바이트에 `?1049`가 아예 없다

받은 65536 바이트를 직접 분석한 결과다.

| 항목 | 결과 |
| --- | --- |
| `?1049` alt screen 진입 | 0회. 없음 |
| `?2004` bracketed paste | 없음 |
| `?1000` / `?1002` / `?1003` / `?1006` | 각 1회 (리사이즈로 재방출된 것) |
| `?2026` 동기화 출력 | set 22회, reset 23회 |
| 첫 바이트 | UTF-8 연속 바이트 조각 |

`?2026`이 reset만 하나 많은 것은 꼬리가 프레임 중간에서 시작했다는 뜻이다. 반대 방향으로 잘렸다면 xterm이 렌더링을 1초간 보류했을 것이다. 이 위험은 실재하지만 관측된 캡처에서는 그 방향이 아니었다.

### 4.4 Claude는 증분 렌더링을 한다

같은 바이트에서 측정했다. `ESC[H`로 좌상단 앵커를 잡고 커서를 건너뛰며 바뀐 칸만 쓴다. 프레임 하나가 평균 2672 바이트이고 64KB 안에 22개가 들어 있었다. 전체 화면을 지우고 다시 그리는 `ESC[2J`는 딱 한 번, 끝에서 4183 바이트 앞에 있었고 그 위치는 사용자가 리사이즈한 시점과 일치한다.

### 4.5 리사이즈는 마우스를 되살리지만 alt screen은 못 되살린다

브라우저 로그에서 `send-resize` 직후 32바이트가 도착하며 `mouse`가 `none → vt200 → drag → any`로 바뀌었다. 반면 `buffer`는 전체 82행 재그리기 뒤에도 끝까지 `normal`이었다. Claude가 SIGWINCH에 `?1049h`를 다시 보내지 않는다.

### 4.6 `SerializeAddon`은 `?1006`을 빠뜨리고, 그게 마우스를 통째로 죽인다

세 갈래로 확인했다.

**직렬화가 내보내는 모드 전체.** `@xterm/addon-serialize`의 `src/SerializeAddon.ts` `_serializeModes` (설치본에 `src/`가 동봉되어 있다):

`?1h` `?66h` `?2004h` `4h` `?6h` `?45h` `?1004h` `?7l`, 마우스 tracking 중 **정확히 하나**(`?9h`/`?1000h`/`?1002h`/`?1003h`), alt buffer면 `?1049h`. 이게 전부다.

`?1006`(SGR)과 `?1016`(SGR-pixels)은 없다. 0.14.0에도, `0.15.0-beta.301`에도, GitHub master에도 없다. 커밋 히스토리상 **마우스 인코딩 직렬화는 도입된 적이 없다.** 원인은 공개 API 설계다. xterm 내부는 protocol(`activeProtocol`)과 encoding(`activeEncoding`)을 분리해 들고 있는데, 2021년 `IModes`를 만들 때([PR #3418](https://github.com/xtermjs/xterm.js/pull/3418)) protocol만 노출했다. addon은 노출된 것만 직렬화할 수 있다.

당시 조사한 `0.15.0-beta.301`에는 커서 숨김 직렬화가 추가됐지만 대응 xterm beta가 필요했다. 최종 구현은 안정 조합 6.0.0/0.14.0을 유지하고 누락 상태를 보완했다.

**인코딩이 DEFAULT면 마우스는 `onData`가 아니라 `onBinary`로 나간다.** headless 6.0.0 번들에서 직접 확인했다.

```js
this._activeEncoding === "DEFAULT"
  ? this._coreService.triggerBinaryEvent(r)
  : this._coreService.triggerDataEvent(r, true)
```

당시 `apps/web/src/` 전체에 `onBinary`가 **0건**이었다. `apps/web/src/attach.ts`가 `onData`만 배선한다. 따라서 DEFAULT 인코딩에서는 223열 이내 이벤트조차 통째로 버려진다.

**223열 한계도 사실이다.** DEFAULT 인코더는 좌표에 32를 더해 한 바이트에 담고 255를 넘으면 빈 문자열을 돌려준다. 좌표가 틀리는 게 아니라 이벤트가 사라진다. 사용자는 219~286열로 쓴다.

**다만 이건 증상 C의 원인이 아니다.** 캡처한 실제 65536바이트에 `?1006`이 1회 있다(4.3 표). 그 시점 브라우저는 SGR 인코딩이었고 마우스는 `onData`로 갔을 것이다. 이 항목은 **8절의 수정을 순진하게 넣으면 새로 생길 함정**이다. 스냅샷은 `?1003h`를 성실히 복원하는데 `?1006h`를 안 붙인다.

검증: 채택한 addon의 직렬화 결과와 복원된 mouse 인코딩을 비교하고, DEFAULT·SGR 입력이 실제 PTY까지 전달되는지 검사한다. 현재 입력 배선은 `apps/web/src/attach.ts`에서 확인한다.

### 4.7 headless `write()`는 비동기라 직후의 `serialize()`가 이전 상태를 돌려준다

`@xterm/headless` 6.0.0 + `@xterm/addon-serialize` 0.14.0에서 측정했다.

```
write("\x1b[?1049h\x1b[HFIRST") 직후 serialize:  ""
파싱 완료를 기다린 뒤 serialize:                    "\x1b[?1049h\x1b[HFIRST"
```

alt screen 진입조차 직후에는 보이지 않는다. 두 번째 덩어리에서도 같았다.

**당시 raw tail 구현에는 없던 위험이었다.** 링 버퍼는 `push`가 동기라 즉시 반영된다. 미러를 도입하는 순간 생긴다. 8절의 계약 항목을 참고한다.

재현: `terminal.write(data)` 직후의 `serialize()`와, `terminal.write("", cb)` 콜백 뒤의 `serialize()`를 비교한다.

## 5. 위 사실로부터의 추론 (확정 아님)

1. **AIOX의 replay 설계가 A의 유력 원인이라는 가설이었다.** 완전한 화면 한 장은 `ESC[2J` 전체 재그리기 때만 스트림에 실리고, 그건 리사이즈했을 때만 일어난다. 평소 64KB 창에는 부분 프레임만 들어 있으므로, 재부착한 뷰어는 기준 화면 없이 차분만 겹쳐 칠한다. 어느 영역이 비는지는 그때그때 다르다.
2. **C·D·E를 모두 `?1049` 소실로 설명하려 했지만 단일 원인으로 확정하지 못했다.** normal 버퍼에서 TUI를 그리니 scrollback이 쌓여 scrollbar가 생기고(`baseY`가 0보다 커지는 것을 관측했다), 종료 시 복원할 alt screen이 없어 텍스트가 남는다.
3. **Claude Code 자체가 정상이라는 가정은 검증된 결론이 아니다.** 계속 붙어 있는 터미널을 전제한 설계이고 모든 TUI가 그렇게 한다.
4. **C의 원인은 리사이즈 전 mouse tracking이 `none`이었던 것이다.** 꼬리에 마우스 모드가 하나도 없으면 xterm이 휠을 자기 scrollback 스크롤로 소비하고 TUI는 받지 못한다. D(scrollbar)와 같은 뿌리다. 4.6의 `onBinary` 경로는 여기에 관여하지 않았다.

## 6. 이 조사가 세웠다가 반증된 가설

같은 길을 다시 파지 않기 위해 남긴다.

- **"Synchronized Output(`?2026`)에 갇혀 렌더링이 멈춘 것"** — 진단에 `sync` 필드를 넣어 확인한 결과 증상 시점에 전부 `false`였다. 메커니즘 자체는 실재하고(1초 타임아웃 포함) 잘리는 방향에 따라 발생할 수 있지만, 관측된 증상의 원인은 아니었다.
- **"DOM 렌더러가 못 따라가서 addon-webgl/canvas가 필요하다"** — `mismatchedRows`가 비어 있었다는 사실만으로 픽셀·CSS·관측 사이 렌더 정지를 배제할 수 없다. 별도 렌더러 도입의 근거도 확보하지 못했다. 해당 관문은 RenderService 레벨이라 렌더러 종류와 무관하기도 하다.
- **"A는 Claude Code fullscreen 렌더러 자체 버그"** — 이 로그 2026-09-10 02:20 항목이 세운 축이다. 이번 측정이 상당 부분 대체한다. 다만 7절 첫 항목은 남는다.
- **"E는 alt screen 내용이 normal buffer로 샌 것"** — cmux에서 Claude와 Codex 둘 다 같은 동작을 보인다는 사용자 관찰로 철회했다.
- **"cmux는 마우스 인코딩을 서버가 소유해서 이 문제를 구조적으로 회피한다"** — 이 조사자가 `ghostty-vt`에 `MouseEncoder`가 있다는 것만 보고 단정했다가 철회했다. 호출 지점을 찾지 않은 추정이었고, 다른 agent의 이의 제기로 확인했다. 실제로는 cmux 웹 byte 경로도 `terminal.onData` 문자열을 그대로 서버로 보낸다(`cmux-tui/frontends/web/src/hooks/useAttachedTerminal.ts:97-99`). 서버 `MouseEncoder`는 Rust 네이티브 클라이언트(`crates/cmux-tui/src/app.rs`의 `encode_mouse_if_snapshot` 등)가 쓴다. 웹 셀 렌더링 경로는 휠을 cmux 자체 scrollback 뷰에 쓰고 앱에 보내지 않는다(`hooks/useRenderTerminal.ts:462`).
- **"snapshot과 subscribe를 같은 tick에 부르면 틈이 없다는 계약이 미러에서도 유효하다"** — 4.7로 반증됐다. raw tail에서만 성립한다.
- **"48줄만 보인 건 Claude 자기 뷰포트"** — 리사이즈 **후**에 뜬 replay로 리사이즈 **전** 스크린샷을 설명하려 한 오류다. 철회했다. 당시 `baseY`가 0이었으므로 나머지 줄은 버퍼 어디에도 없었다.

## 7. 당시 미해결과 해석 한계

- [anthropics/claude-code#68711](https://github.com/anthropics/claude-code/issues/68711)은 재연결도 웹도 아닌 네이티브 iTerm2/Warp에서 같은 패턴(텍스트 깨짐 → resize로 복구)을 보고한다. **이번 진단은 이 사례를 설명하지 못한다.** 별도 원인이 있을 수 있다. 이 조사자는 원문을 직접 재열람하지 않았고 subagent 보고를 통해 알았다.
- 재부착을 한 번도 하지 않은 세션에서도 A가 나는지 확인되지 않았다. 이 조사의 캡처는 전부 재부착 이후다. 여기서 A가 나면 두 번째 원인이 있는 것이다. 검증 방법은 Claude를 새로 띄우고 탭 전환도 새로고침도 하지 않고 관찰하는 것이다.
- F(입력 오염)는 당시 조사 범위 밖이었다. Stage2-1에서는 historical 자동응답 억제와 live 응답 담당 분리를 구현했다(8절).

## 8. Stage 2-1에서 완료한 해결

### 최종 구조

64KiB raw tail과 공개 `snapshot()` 조합을 제거했다. PTY 세션마다 `@xterm/headless` 6.0.0 하나를 유지하고 `@xterm/addon-serialize` 0.14.0과 상태 보완 데이터로 복원한다. 브라우저 xterm은 6.0.0이다. Ghostty는 구현 원리 참고이며 교체하지 않았다.

```text
PTY 출력 → 미러 제출 FIFO → 해당 cut까지 파싱 완료 → snapshot + 보류 tail
                                                    → 이후 출력·resize·exit
Web 접속 → snapshot 크기 → 화면 파싱 → 보완 상태 적용 → tail
         → live 연결 → 현재 pane 크기 요청
```

`TerminalSession.attach()`가 캡처와 이후 이벤트 전달을 한 경계로 소유한다. `subscribe()`는 snapshot 없는 lifecycle·신규 foreground 관측에 남긴다. Web detach는 PTY를 종료하지 않으며 실제 exit와 대기 중 처리가 끝난 뒤 미러를 dispose한다.

### 파싱 경계와 자원 한도

- 단순 write callback 대기는 미완성 UTF-8·제어 시퀀스를 해결하지 못한다. `MirrorBoundary`는 xterm의 실제 parser/decoder를 재사용해 마지막 안전 경계와 미완성 tail을 구분하고 resize도 순서대로 보관한다.
- tail의 1MiB·1,024 이벤트 한도를 넘으면 새 snapshot만 거절한다. 기존 PTY·viewer의 출력은 계속 전달하며 안전 경계에 돌아오면 다시 복원할 수 있다. 잘린 데이터를 정상 snapshot으로 보내지 않는다.
- 출력 제출과 파싱 완료 대기를 분리해 청크마다 타이머를 기다리지 않는다. snapshot·resize·dispose는 앞선 파싱을 기다린다.
- 미러 미파싱 출력 1MiB에서 PTY 읽기를 pause하고 512KiB 이하에서 resume한다. 느린 viewer는 파싱 후 ACK 기준 live 대기량 8MiB 초과 시 해당 연결만 종료한다. 재접속은 새 snapshot으로 시작한다.

### 상태·입력 복원

- normal/alternate의 저장 커서, 속성·문자 집합, 스크롤 영역, 탭 위치, 숨은 셀·확장 스타일·하이퍼링크를 보완한다. source/target의 실제 baseY가 다르면 절대행 patch를 적용하기 전에 거절한다.
- mouse encoding과 커서 숨김은 실제 xterm 상태를 읽어 복원한다. 초기 제안의 별도 CSI 모드 추적기는 채택하지 않았다. private 접근은 고정 vendor 버전과 회귀 검사로 한정한다.
- W1 최종 감사에서 추가 발견한 LNM(`convertEol`)과 DEC `?12`(`cursorBlink`) 누락도 기존 상태 데이터와 공개 options로 보완했다. 미러/Web의 기본 깜빡임은 true로 맞추고 프로그램의 set/reset을 복원한다.
- `onData`는 UTF-8, `onBinary`는 원래 바이트로 전달한다. historical 자동응답은 차단하고 live 질의는 지정된 viewer 하나만 응답한다. 사용자 입력은 양쪽에서 가능하며 응답 담당은 마지막 실제 입력 연결로 이동한다.
- 브라우저는 ResizeObserver로 pane 크기 변경을 감지하되 서버의 ordered resize를 적용한다. 복원이 끝났다는 이유로 사용자가 옮긴 포커스를 빼앗지 않는다.

### 구현 중 발견한 화면 오염 수정

문자가 화면 전체에 반복되는 추가 결함은 우리 코드가 xterm 내부 공유 `_nullCell`을 작업 셀로 덮어쓴 것이었다. 이후 erase가 공백 대신 마지막 문자를 채웠다. 공개 buffer API로 독립 셀을 만드는 `scratchCell(terminal)`을 직렬화·복원에서 재사용하도록 수정했다. snapshot 생성·적용 뒤 normal/alternate erase가 공백을 남기는 회귀를 포함한다. daemon의 `NO_COLOR` 상속으로 흑백 표시된 문제는 별개였으며 해당 변수를 제외한 시작을 수행했다.

최종 UI는 Claude 수정 상태를 유지한다. 종료 안내는 속성을 초기화한 뒤 터미널 안에 출력한다. 터미널 컨테이너는 가로 스크롤 허용·세로 넘침 숨김이며, Codex가 추가했던 바깥 종료 상태 표시와 양방향 스크롤은 사용자 요청으로 되돌렸다.

### 완료 판정과 적용 주의

- W1 최종 감사·두 모드 수정 후 root가 terminal 67개·Web 20개 tests를 재확인했다. subagent는 terminal/Web/daemon 타입 검사, terminal/Web 빌드, built Node import와 대상 lint/format을 통과했다.
- 기존 전체 `pnpm check` 343 tests와 격리 PTY/WS·Chrome 검증은 그 시점의 근거이며 마지막 수정 이후 전체 suite 재실행으로 표현하지 않는다.
- 사용자가 W5를 직접 수행하고 A~F가 해결된 것으로 판단한다고 보고해 W5를 완료했다. agent가 동일 실사용을 재현한 결과나 모든 증상의 단일 원인 증명으로 확대하지 않는다.
- 구조·정책 owner는 `docs/architecture/aiox-storage-terminal.md`, `docs/specs/aiox-configuration-web.md`에 반영했다. Stage2-1은 종료됐으며 현재 작업 포인터는 Stage3 W1이다.
- 마지막 추가 모드 수정 후 daemon은 재시작하지 않았다. 새 Web은 추가 snapshot 필드를 요구하므로 다음 실사용 전에 서버와 Web을 같은 빌드로 맞춰야 한다. 이것을 사용자 세션 재시작의 상시 승인으로 해석하지 않는다.
- 전 OS·배포 검증은 기존 한계를 유지하며 Stage8이 통합 검증을 소유한다. Stage6의 React·탭·분할·배치 복귀는 별도 통합 대상이다.

### 초기 조사 비용 측정 (최종 구현 성능 아님)

219x83 세션 100개를 띄워 측정했다.

| 항목 | 값 |
| --- | --- |
| 파싱 처리량 | 단일 코어 약 100 MB/s |
| 세션당 RSS (alt screen TUI, scrollback 1000) | 약 1.1 MB |
| 세션당 RSS (alt screen TUI, scrollback 0) | 약 145 KB |
| 세션당 RSS (일반 셸 5000행, scrollback 1000) | 약 3.9 MB |
| `serialize()` (TUI) | 0.70 ms, 출력 16 KB |
| `serialize()` (일반 셸, scrollback 1000) | 5.9 ms, 출력 213 KB |

메모리를 줄이는 가장 큰 손잡이는 미러의 scrollback이다. alt screen TUI는 scrollback을 쓰지 않으므로 낮추면 1.1 MB가 145 KB가 된다. 대가는 일반 셸 세션의 스크롤백 복원 포기다.

**성격이 바뀌는 것은 사실이다.** 링 버퍼는 바이트 복사뿐이라 거의 공짜였다. 미러는 모든 바이트를 파싱한다. 다만 에이전트 프로세스 100개가 이미 떠 있는 상황에서 비율로는 작다.

**주의:** 합성 바이트로 측정했다. 실제 Claude 출력으로는 측정하지 않았다.

## 8.1 외부 구현 참고

같은 문제를 이미 다룬 구현들이다. 어느 쪽도 정답으로 제시하지 않는다.

**VS Code** — `src/vs/platform/terminal/node/ptyService.ts`의 `XtermSerializer`가 이 제안과 **동일한 아키텍처**다. pty host에 `@xterm/headless` 미러를 두고 재접속 때 `serialize()`한다. 다만 **마우스 모드 보정은 하지 않는다.** 통합 터미널 폭이 보통 223열 미만이라 덜 걸릴 것이라는 추정이 있으나 확인되지 않았다.

**서드파티 다수** — GitHub 코드 검색에서 같은 갭을 우회하는 리포지토리가 20개 이상 나온다. 위 2번의 `registerCsiHandler` 방식이 그중 내부 API를 건드리지 않는 유일한 접근이다.

**cmux (manaflow-ai/cmux)** — 서버에 Ghostty VT 엔진(`cmux-tui/crates/ghostty-vt`)을 두고, 현행 경로는 구조화된 셀 데이터를 React가 직접 그린다. 구형 byte 경로도 raw tail이 아니라 attach 첫 이벤트로 VT 상태 재생을 보내며 코드가 이를 "authoritative replay"라 부른다. **다만 웹 프론트엔드의 마우스 인코딩은 서버가 아니라 클라이언트 xterm이 한다**(6절 반증 목록 참고). 서버 인코딩은 Rust 네이티브 클라이언트 얘기다.

**ttyd, wetty** — `SerializeAddon`을 쓰지 않는다. 이 방식의 세션 복원을 하지 않으므로 문제가 없다.

정리하면 **웹에서 서버가 마우스 인코딩을 소유하는 확인된 레퍼런스가 없다.** 클라이언트 보정이 현실적인 선택이다.

## 9. 구현 검증 기준

아래는 Stage2-1의 회귀 검증 기준이다. 완료 근거와 실제 검증 범위는 8절의 완료 판정을 따른다.

1. 시작 화면과 모드 설정 이후 64KiB를 넘는 부분 출력을 만든 뒤 재부착한다. normal/alternate 화면, cursor, 스타일과 모드가 원래 상태와 일치해야 한다.
2. 출력이 계속 들어오는 중에 접속해 snapshot과 후속 스트림 사이의 누락·중복·재정렬이 없는지 확인한다. 비동기 파싱과 resize가 겹치는 경우도 포함한다.
3. snapshot 크기와 브라우저 크기가 다른 조건에서 복원용 resize → snapshot 파싱 완료 → 후속 출력 → 새 크기 요청 순서를 검증한다.
4. DEFAULT·SGR·지원하는 인코딩 전환, 모드 해제·reset, 키보드·paste 및 historical query와 live 응답 경계를 검사한다.
5. 일반 shell·alternate TUI의 실행 중 재부착과 종료 후 복귀를 별도로 확인하고, 복수 뷰어와 attachment 해제가 PTY 수명을 바꾸지 않는지 검사한다.

합성 출력 검사는 상태 소실 메커니즘을 검증하지만 실제 Claude의 모든 증상을 재현하지는 않는다. 실제 화면 비교는 실행 중 동일 시점의 상태와 출력을 대상으로 하며, 종료 후 화면 검증과 구분한다. 사용자 A~F 해결 보고와 합성 검사 결과를 구분하며, 새 증상은 새 근거로 조사한다.

## 10. 범위 밖 / 하지 말 것

- 사용자의 live Claude 세션이나 daemon에 입력하거나 재시작하지 않는다.
- `architecture.excalidraw`는 사용자 개인 자산이다.
- `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT=1`, `CLAUDE_CODE_DISABLE_MOUSE=1`, `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1`은 Claude 쪽 기능을 꺼서 증상을 회피하는 workaround이지 AIOX가 상태를 복원하는 수정이 아니다. 둘을 섞어 말하지 않는다. 사용자는 첫 번째를 실제로 시험했고 E 증상은 그대로였다.
- 이 조사 결과로 `plans/aiox-tui-product-rebuild.md`의 단계 상태를 완료 처리하지 않는다.
- 로그에는 종합된 결론만 남긴다. 사용자가 붙여넣는 콘솔 조각마다 항목을 추가하지 않는다.

## 11. 관련 파일

- `logs/2026-09-09-AIOX-Web-Terminal-Attach-Investigation.md` — 이 조사의 권위 있는 기록
- `logs/2026-09-10-AIOX-TUI-Stage2-1-Terminal-Snapshot.md` — 완료 결과·복원 계약·검증 한계
- `logs/2026-09-09-AIOX-TUI-Stage6-Web.md` — 운영 Web 통합과 브라우저 복귀 요구
- `packages/terminal/src/index.ts` — PTY·미러 수명과 통합 `attach()`
- `packages/terminal/src/boundary.ts` — 파싱 경계·미완성 tail·한도·순서
- `packages/terminal/src/serialization.ts`, `restore.ts`, `serialization.test.ts` — 상태 보완·적용·회귀
- `apps/daemon/src/terminals.ts` — snapshot 전송·live 구독·입력 및 resize 중계
- `apps/web/src/attach.ts` — xterm·WebSocket 입출력과 attachment 수명
- `docs/architecture/aiox-storage-terminal.md` — PTY와 Web 복귀 계약
