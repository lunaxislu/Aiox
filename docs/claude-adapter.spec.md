> 이 문서는 Claude Code 에이전트가 읽고 바로 구현에 들어갈 수 있도록 작성된 명세서다.

> 배경 설명 없이 무엇을 만들어야 하는지, 제약조건이 무엇인지만 적혀있다.

> 구현 전에 이 문서 전체를 읽어라.

---

## 네가 만들어야 하는 것

**Claude Code용 custom channel 서버** — bridge가 Claude Code 세션에 메시지를 보내고, Claude Code 응답을 bridge로 받아오는 MCP 서버.

프로젝트 경로: `/Users/lunaxislu/Documents/ai-orchestration`

---

## 검증된 사실 (오늘 직접 확인됨)

- Claude Code v2.1.97에서 Channels 기능 작동 확인됨
- `claude --channels plugin:fakechat@claude-plugins-official`로 fakechat 채널 실행 성공
- 브라우저(외부 소스) → Claude Code 세션: 메시지 주입 성공
- Claude Code 세션 → 브라우저: `plugin:fakechat:fakechat – reply` tool로 응답 전송 성공
- two-way channel 구조 작동 확인
- Channels는 세션 시작 플래그(`--channels`)로만 활성화 가능. 세션 중 설정 불가
- Bun 런타임 필수. Node.js에서는 플러그인 silent fail. (mise로 관리하면 자동 사용됨)
- `--dangerously-load-development-channels` 없이 공식 채널(fakechat)으로 성공함
- custom channel은 `--dangerously-load-development-channels` 필요

---

## 아키텍처 위치

```
Claude Code 세션
    ↑ (channel event)
    ↓ (reply tool)
custom channel 서버  ←→  bridge core
```

custom channel 서버는 bridge와 Claude Code 세션 사이에 위치한다.

bridge가 메시지를 보내면 Claude Code 세션에 전달하고,

Claude Code가 reply tool을 호출하면 bridge로 전달한다.

---

## 구현 명세

### 기술 스택

- **프로토콜**: MCP (Model Context Protocol) — `@modelcontextprotocol/sdk` 사용
- **transport**: stdio (Claude Code가 subprocess로 실행)
- **배포 방식**: npx로 실행 가능한 단일 파일

### 파일 구조

```
ai-orchestration/
  claude-adapter/
    index.ts          # 메인 채널 서버
    package.json
    README.md
```

### 채널 서버가 구현해야 할 것

**1. MCP 서버로 등록**

```tsx
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
```

**2. `channel` capability 선언**

Claude Code가 이 서버를 channel로 인식하게 하려면

server capabilities에 channel 관련 선언이 있어야 한다.

fakechat 공식 플러그인 소스 참고:

https://github.com/anthropics/claude-plugins-official

**3. 인바운드 이벤트 처리**

- bridge가 HTTP POST 또는 WS로 메시지를 보내면
- 그것을 `<channel>` 이벤트로 Claude Code 세션에 전달

**4. `reply` tool 구현**

- Claude Code가 응답할 때 `reply(text: string)` tool을 호출
- 이 tool이 호출되면 bridge로 응답을 전달
- fakechat의 reply tool 시그니처 참고:
  ```
  plugin:fakechat:fakechat – reply(text: "...") (MCP)
  Send a message to the fakechat UI. Pass reply_to for quote-reply, files for attachments.
  ```

**5. bridge와의 통신**

- bridge가 `localhost:8788`로 HTTP POST를 보낼 때 Claude Code 세션으로 전달
- Claude Code reply는 bridge의 callback URL 또는 WebSocket으로 전달

---

## 실행 방법 (완성 후)

```bash
# Claude Code 세션 시작 시
claude --channels plugin:claude-adapter@local \
       --dangerously-load-development-channels

# 또는 개발 중
claude --channels plugin:./claude-adapter/index.ts \
       --dangerously-load-development-channels
```

---

## 제약조건

- Python 사용 금지. Node.js만 사용
- 외부 개발자가 npx 한 줄로 실행 가능해야 함
- 종속성 최소화. `@modelcontextprotocol/sdk` 외 추가 패키지 최대 2개
- bridge와의 통신은 [localhost](http://localhost)만 (보안)
- loop 방지: Claude Code가 보낸 메시지가 다시 Claude Code로 돌아오지 않도록 `origin` 태그 확인

---

## 참고 레포

- fakechat 공식 소스: https://github.com/anthropics/claude-plugins-official
- MCP 서버 패턴: https://github.com/steipete/claude-code-mcp
- Claude Code Channels 공식 문서: https://code.claude.com/docs/en/channels

---

## 완료 기준

- [ ] `claude --channels ... --dangerously-load-development-channels` 로 채널 서버 실행됨
- [ ] bridge에서 HTTP POST 보내면 Claude Code 세션에 메시지 도착
- [ ] Claude Code가 응답하면 bridge가 수신
- [ ] loop 방지 동작 확인
- [ ] README에 실행 방법 작성

---

## 먼저 해야 할 것

1. 로컬 fakechat 소스를 읽고 구조 파악
   - channel capability 선언 방식
   - reply tool 시그니처
2. 그 구조를 기반으로 claude-adapter 구현
