# Web 터미널의 하단 픽셀 여백 처리 조사

- 조사일: 2026-10-14
- 질문: xterm의 행 높이로 나누어 떨어지지 않는 host 높이를 다른 프로젝트는 어떻게 표현하는가?
- 문서 역할: 공식 소스와 upstream 논의를 비교한 연구 기록. 구현 계약이나 현재 작업 완료 판정이 아니다. 기존 `research-idea/AGENTS.md`의 조사 자료 역할과 `.research.md` sibling 형식을 따른다.
- 범위: VS Code, ttyd, JupyterLab, WeTTY의 실제 CSS·fit 구현과 xterm upstream. 각 프로젝트 실행 화면의 재현 실험은 하지 않았다. production 코드는 수정하지 않았다.
- 우리 화면의 비교 기준: 부모 조사자가 전달한 localhost:5174 측정값 host 528px, screen 522px, 29행, cell 18px. 이 문서 작성자가 직접 재측정한 값은 아니다. 대상 앱은 `/Users/lunaxislu/workSpace/aiox/apps/web`이며 이 저장소의 운영 Web과 구분한다.

## 결론과 근거 수준

**확인한 사실:** 조사한 프로젝트는 터미널 행을 픽셀 단위로 늘려서 모든 높이에 정확히 맞추는 방식 대신, 정수 행을 유지하면서 배경·정렬·padding·wrapper 높이로 외곽을 구성한다. 특히 VS Code는 터미널 자체를 아래에 붙여 남는 높이가 위에 오도록 한다. ttyd는 xterm wrapper를 padding을 제외한 전체 높이로 펼친다. JupyterLab은 viewport 배경을 테마와 맞추는 이유를 주석으로 명시한다. WeTTY는 전체 페이지를 기본 터미널과 같은 검정으로 칠한다.

**추론:** 이 설정들은 잔여 픽셀에서 다른 배경색이 드러나거나 하단 경계가 어긋나는 현상을 줄인다. 하지만 VS Code·WeTTY·ttyd에서 해당 코드가 이 특정 bottom-gap 이슈를 해결하려고 도입됐다는 변경 이력은 확인하지 않았다. 코드 존재와 도입 의도는 구분해야 한다.

**권고:** 현재 6px 때문에 부모색 띠가 보이는 문제에는 host 배경과 terminal 테마 배경을 같은 값으로 관리하는 것이 우선이다. 마지막 행을 하단에 붙이는 UX를 원한다면 VS Code처럼 xterm 자체를 bottom-align하는 방식을 추가 검토한다. 정수 행을 늘리거나 canvas만 강제로 100%로 늘리는 것은 같은 해결이 아니다.

## xterm 자체의 책임과 남는 공간

공식 [FitAddon 고정 소스](https://github.com/xtermjs/xterm.js/blob/829e85988b281f6f446272f692c2c80f236e9c04/addons/addon-fit/src/FitAddon.ts#L90-L98)는 parent 높이에서 xterm padding을 빼고 cell 높이로 나눈 뒤 `Math.floor`로 행 수를 계산한다. scrollbar 폭은 가로 available width에서만 빠진다. `fit()`은 계산 후 `terminal.resize()`를 호출하고 `proposeDimensions()`는 계산 결과만 반환한다.

[DOM renderer 소스](https://github.com/xtermjs/xterm.js/blob/829e85988b281f6f446272f692c2c80f236e9c04/src/browser/renderer/dom/DomRenderer.ts#L139-L175)는 device-pixel cell 높이 × 행 수로 renderer 높이를 계산하고 `.xterm-screen`의 CSS 높이를 직접 지정한다. 따라서 host가 528px이고 한 행이 정확히 18px이라면 29행 = 522px이며 6px은 추가 행이 아니다. DPR 반올림 때문에 모든 환경에서 단순 fontSize × lineHeight로 cell 높이를 구할 수 있는 것도 아니다.

[xterm CSS](https://github.com/xtermjs/xterm.js/blob/829e85988b281f6f446272f692c2c80f236e9c04/css/xterm.css#L93-L110)의 viewport는 xterm wrapper 내부를 top/right/bottom/left 0으로 채우지만 screen은 별도 요소다. **host, xterm wrapper, viewport, screen/canvas의 높이는 같은 말이 아니다.** wrapper가 전체 높이라도 renderer의 실제 행 영역은 정수 cell grid다.

```text
host: 528px
├─ xterm wrapper / viewport: CSS 구성에 따라 528px 가능
└─ 실제 screen: 29행 × 18px = 522px
   └─ 6px: 배경·정렬 정책으로 처리할 외곽 공간
```

공식 [Discussion #4853](https://github.com/xtermjs/xterm.js/discussions/4853)의 채택 답변 작성자 jerch는 한 행보다 작은 하단 gap과 scrollbar + 한 cell보다 작은 우측 gap을 의도된 동작으로 설명한다. outer container가 grid에 정확히 맞지 않으면 fit addon 자체가 빈 픽셀을 모두 채울 수 없다고 답한다. ResizeObserver로 fit을 반복하면 된다는 다른 참여자의 제안은 본인이 철회했다.

[Discussion #5299](https://github.com/xtermjs/xterm.js/discussions/5299)에서도 jerch는 fit이 partial row/column 없이 grid를 넣는 동작이라고 설명한다. fontSize나 lineHeight를 맞추는 추가 로직은 현재 fit의 역할 밖이며 가로·세로를 동시에 맞추기 어렵다고 답한다. 질문자가 제시한 대안은 cell 높이를 읽어 **container 높이를 행의 배수로 스냅하는 것**이다. 공식 프로젝트의 채택 패턴이 아니라 사용자의 workaround이고, 당시 private API를 이용했다. 최신 master 소스에는 public `terminal.dimensions`를 사용하므로 버전 차이를 확인해야 한다.

## 프로젝트별 실제 구현

| 프로젝트 | 확인한 처리 | 잔여 공간의 결과·추론 | 이 문제 해결 의도 증거 |
| --- | --- | --- | --- |
| VS Code | 정수 행 계산 + outer 배경 + xterm bottom-align | 행 grid 아래는 붙고 남은 높이는 위에 위치 | bottom-align 목적은 CSS 주석에 명시. 특정 gap 이슈 도입 이력은 미확인 |
| ttyd | host 100%, xterm 5px padding, wrapper `calc(100% - 10px)`, FitAddon | wrapper는 full-height이며 grid 밖 공간은 viewport/외곽으로 남음 | CSS 존재 확인, 특정 gap 해결 목적은 미확인 |
| JupyterLab | 8px padding, FitAddon, viewport 테마 배경 override | 테마가 다른 검정 프레임 방지 | viewport가 padding에 걸치므로 테마색을 맞춘다는 주석 명시 |
| WeTTY | 전체 페이지 검정, host flex 100%, FitAddon, 기본 테마 검정 | 기본 테마에서는 남는 공간도 검정 | 코드 존재 확인, 특정 gap 해결 목적은 미확인 |

### VS Code: 아래 정렬이 실질적인 차이

[terminal.css L22–36](https://github.com/microsoft/vscode/blob/2e086c548bde612fbc4f9ea20683bf968460082d/src/vs/workbench/contrib/terminal/browser/media/terminal.css#L22-L36)는 outer-container에 terminal background와 panel/sidebar fallback을 지정하고 container 계층에 height 100%를 준다. [L65–73](https://github.com/microsoft/vscode/blob/2e086c548bde612fbc4f9ea20683bf968460082d/src/vs/workbench/contrib/terminal/browser/media/terminal.css#L65-L73)은 editor wrapper에도 terminal background 및 height 100%를 준다.

중요한 차이는 [L88–96](https://github.com/microsoft/vscode/blob/2e086c548bde612fbc4f9ea20683bf968460082d/src/vs/workbench/contrib/terminal/browser/media/terminal.css#L88-L96)의 xterm 자체 아래 정렬이다. 주석의 목적은 “Bottom align the terminal within the split pane”이다. position absolute, bottom 0, left 0, right 0이며 top 0은 지정하지 않는다. **우리 host div에 inset-0을 주는 것과는 다르다.** host는 전체 패널을 채워도 그 안의 xterm은 내용 높이를 유지하고 아래에 정렬할 수 있다. inner xterm에 inset-0을 주면 top까지 지정해 stretch하므로 이 패턴과 다르다. [같은 CSS L98–106](https://github.com/microsoft/vscode/blob/2e086c548bde612fbc4f9ea20683bf968460082d/src/vs/workbench/contrib/terminal/browser/media/terminal.css#L98-L106)에는 vertical panel의 top-align override와 fixed-dims의 position static 예외도 있다. 따라서 모든 VS Code 레이아웃에서 bottom-align이라고 일반화하지 않는다.

[자체 크기 계산](https://github.com/microsoft/vscode/blob/2e086c548bde612fbc4f9ea20683bf968460082d/src/vs/workbench/contrib/terminal/browser/xterm/xtermTerminal.ts#L1189-L1209)은 DPR·글자 폭·lineHeight를 고려한 정수 rows/cols를 계산한다. cell을 늘려 남는 높이를 없애는 계산은 아니다.

### ttyd: renderer가 아닌 wrapper를 전체 높이로

[공식 CSS](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/html/src/style/index.scss#L1-L18)에서 html/body와 terminal-container는 전체 높이이고 margin/overflow가 제한된다. 생성되는 `.terminal`은 padding 5px와 height `calc(100% - 10px)`를 함께 사용한다. wrapper의 content 높이와 양쪽 padding 합이 parent 높이를 채운다.

[open 및 resize 코드](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/html/src/components/terminal/xterm/index.ts#L154-L203)는 open 후 fit을 호출하며 terminal의 onResize에서 서버에 rows/columns를 보내고 window resize에서도 fit을 호출한다. 이 흐름이 renderer를 비정수 행 높이로 늘린다는 근거는 없다. [기본 테마](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/html/src/components/app.tsx#L20-L32)는 `#2b2b2b`다. 외곽색을 이 테마로 직접 동기화하는 별도 코드는 조사한 범위에서 발견하지 못했다. 모든 custom theme·renderer에서 fringe가 반드시 없다고 단정할 수 없다.

의존 버전은 [package.json](https://github.com/tsl0922/ttyd/blob/2922cb89f518bae4d0fcf4d757a7419638fc71fc/html/package.json#L55-L62)의 xterm ^5.5.0 / fit ^0.10.0이다. 최신 xterm master CSS와 무조건 같은 viewport 동작이라고 가정하면 안 된다.

### JupyterLab: padding 주변 색도 테마에 맞춤

[base.css](https://github.com/jupyterlab/jupyterlab/blob/7cc43c0627f4d29f36bed788d213773bd76cc1ff/packages/terminal/style/base.css#L11-L55)는 8px padding을 주고 WebGL canvas에 theme색 border를 준다. viewport에도 inherit/light/dark별 배경색을 지정한다. 주석은 xterm viewport의 기본 검정이 padding 위에서 frame으로 보이므로 터미널 테마와 맞춘다고 설명한다. 이는 **외곽 색 불일치를 해소하는 명시적 근거**다. 잔여 6px를 새 행으로 바꾸는 근거는 아니다.

[widget resize](https://github.com/jupyterlab/jupyterlab/blob/7cc43c0627f4d29f36bed788d213773bd76cc1ff/packages/terminal/src/widget.ts#L560-L585)는 autoFit일 때 fit을 호출한 후 rows/cols와 widget pixel size를 서버로 보낸다. renderer의 행 높이를 host 높이에 맞춰 변경하지 않는다. [테마 구성](https://github.com/jupyterlab/jupyterlab/blob/7cc43c0627f4d29f36bed788d213773bd76cc1ff/packages/terminal/src/widget.ts#L762-L809)은 white/black/CSS layout variable을 쓰므로 viewport와 테마색이 대응한다. 의존 버전은 xterm ~6.0.0 / fit ~0.11.0이다.

### WeTTY: 기본 검정 배경 위에서 fit

[styles.scss](https://github.com/butlerx/wetty/blob/20acdcd4fc6a21916644e4dcfd9d2ecc862a4e53/src/assets/scss/styles.scss#L8-L33)는 html/body를 검정, height 100%, margin 0으로 설정하고 viewport scrollbar를 숨긴다. [terminal.scss](https://github.com/butlerx/wetty/blob/20acdcd4fc6a21916644e4dcfd9d2ecc862a4e53/src/assets/scss/terminal.scss#L1-L7)는 terminal host를 flex·relative·100% 높이/폭으로 만든다.

[기본 옵션](https://github.com/butlerx/wetty/blob/20acdcd4fc6a21916644e4dcfd9d2ecc862a4e53/src/assets/xterm_config/xterm_defaults.js#L1-L45)에는 fit 활성과 검정 terminal theme이 있다. [resizeTerm](https://github.com/butlerx/wetty/blob/20acdcd4fc6a21916644e4dcfd9d2ecc862a4e53/src/client/wetty/term.ts#L41-L50)은 fit 후 서버 resize 이벤트를 보낸다. 기본색에서는 grid 밖과 grid 배경이 같은 검정으로 보인다는 것이 코드 기반 추론이다. custom theme 변경 시 body 색까지 따라간다는 보장은 조사 범위에 없다.

## 현재 화면에 적용할 선택과 결과

현재 전달된 측정대로라면 아래와 같은 구성이 가능하다. 이는 코드 수정안이 아닌 동작 설명이다.

```text
A. 배경을 통일
   host 528px: terminal-background
   xterm grid 522px + 아래 6px 동일색
   → 띠는 안 보임. 행 수/글꼴/입력 좌표는 유지.

B. 배경 통일 + xterm 아래 정렬 (VS Code 패턴)
   host 528px: 위 6px 동일색 + grid 522px
   → 마지막 행은 패널 하단에 붙음. 잔여 공간은 위로 이동.

C. host 높이를 grid 배수로 스냅
   host 522px + 패널 외곽 6px
   → 터미널 자체에는 remainder 없음. 패널 전체 높이를 다 쓰지는 않음.

D. cell/lineHeight를 조절하거나 renderer를 stretch
   grid 높이를 528px에 맞추려는 추가 로직
   → metrics/DPR/글꼴/마우스 좌표/선택/IME/이미지와 함께 검증 필요.
```

| 선택 | 장점 | 비용·한계 | 권고 |
| --- | --- | --- | --- |
| host와 xterm theme 같은 배경 | 최소 변경, grid·프로토콜 영향 없음 | 공간 자체는 남음; TUI가 마지막 행에 기본과 다른 색을 쓰면 그 색까지 확장되는 것은 아님 | 부모색 띠 제거의 우선안 |
| xterm bottom-align | 마지막 행 하단 정렬, VS Code 실제 패턴 | 위쪽 잔여 공간, overlay·focus·ResizeObserver 측정 대상 확인 필요 | 하단 배치를 원하면 병행 검토 |
| wrapper height 100% | viewport/스크롤 외곽이 panel 높이에 접근 | screen/canvas는 그대로. 버전·padding·box sizing에 따라 화면/scrollbar/색 검증 필요 | ttyd 패턴 참고; 단독 정답으로 보지 않음 |
| container snap | terminal box가 행 배수 | 레이아웃 크기를 바꾸므로 inset-0 전체 높이 요구와 다름 | 사용자가 패널 크기 스냅을 원하는 경우 |
| fontSize/lineHeight 동적 변경 | 세로를 더 가깝게 맞출 가능성 | 문자 모양/간격 변동, 가로와 세로 동시 맞춤 어려움, DPR 반올림 | 이번 문제에는 비추천 |
| canvas CSS height 100% / scaleY | 겉으로 grid를 늘릴 수 있음 | renderer가 가진 cell/selection/좌표와 표시가 불일치할 가능성. 조사 프로젝트 채택 근거 없음 | 비추천 |
| rows를 ceil로 증가 | 더 많은 행 요청 | 30 × 18 = 540px로 12px 초과, 마지막 행 잘림 가능성 | 비추천 |

하단 6px는 scrollbar width를 제거해서 해결되지 않는다. fit 계산에서 scrollbar는 가로 폭 항목이다. padding은 의도한 외곽 공간이며 나머지를 없애는 일반 해법이 아니다. ResizeObserver·fit 재호출은 host 변경 추적에 필요할 수 있지만 이미 정확히 29행을 계산했다면 같은 나머지 6px를 다시 만들 뿐이다.

[2016년 Issue #389](https://github.com/xtermjs/xterm.js/issues/389)는 이와 같은 18px cell/24px container/6px remainder를 보고했다. 작성자가 제시한 height 100% workaround는 당시 scrollbar 하단까지 완전히 맞추지 못했다고 명시한다. 오래된 버전의 보고이므로 현재 xterm의 고장 증거로 일반화하지 않는다.

## 검증 범위와 후속 조건

- 공식 GitHub 최신 head를 SHA로 고정해 소스를 읽었다. ttyd 기준 commit은 2026-08-12, JupyterLab은 2026-10-13이다. 배포 release 화면을 조사한 것이 아니므로 각 사용자의 설치 버전에는 차이가 있을 수 있다.
- VS Code의 bottom-align과 JupyterLab의 테마 프레임 방지 목적은 주석으로 확인했다. 다른 코드의 bottom-gap 해결 의도는 변경 이력으로 확인하지 않았다.
- 실제 적용 전에는 대상 앱의 host → xterm → viewport → screen → canvas 높이, 배경, padding, box sizing, renderer 종류, DPR을 각각 측정해야 한다. 부모가 보고한 현재 숫자로 원인 후보가 강해지지만 모든 resize·font load 상황을 설명한다고 확정할 수 없다.
- 수정한다면 light/dark 테마 전환, panel resize, 브라우저 zoom/DPR, scrollback scrollbar, 마지막 행이 다른 배경인 TUI, 텍스트 선택·IME·이미지 표시를 화면에서 확인한다.
- 이 조사에서는 운영 Web의 기존 spec/architecture 및 production 코드를 변경하지 않았다. 조사 기록과 현재 작업 로그 연결은 부모 작업자가 소유한다.
