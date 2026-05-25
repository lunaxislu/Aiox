# Codex Thread Focus와 Loaded List

## 상태

- 날짜: 2026-05-25
- 범위: Step 14 Codex 전달 문제를 이해하기 위한 사용자 학습 기록.
- 권위: 이 문서는 설명용이다. 구현 결정의 권위는
  `history/40-step-14-daemon-client-split.history.md`,
  `history/41-codex-loaded-thread-binding-analysis.history.md`,
  `prd/mvp/aiox-mvp-spec.md`에 둔다.

## 한 줄 요약

Codex의 `threadId`는 메시지 텍스트가 아니라, Codex app-server가 관리하는
대화방 ID다.

Codex TUI는 터미널 화면이고, 그 화면은 어느 시점에 하나의 대화방을 보고 있다.
사용자가 `/clear`, `/new`, `/fork` 같은 명령을 실행하면 같은 TUI 화면이 다른
대화방으로 이동할 수 있다.

```text
Codex TUI
  처음 실행  -> T1
  /clear     -> T2
  /new       -> T3
  /fork      -> T4
```

여기서 `T1`, `T2`, `T3`, `T4`는 Codex가 말한 텍스트가 아니다. 메시지가 담기는
대화방 ID다.

메시지는 thread 안에 들어간다.

```text
Thread T2
  - 사용자 메시지
  - aiox를 통해 들어온 Claude 메시지
  - Codex 답변 메시지
```

그래서 문제는 "Codex가 어떤 텍스트를 말했나?"가 아니다. 문제는
"Claude에서 온 메시지를 어느 Codex 대화방에 넣어야 사용자가 현재 TUI에서 볼 수
있나?"다.

## Loaded Thread와 Focused Thread

Codex app-server 안에는 여러 thread가 동시에 loaded 상태로 남아 있을 수 있다.

```text
Codex app-server
  D1  daemon이 만든 hidden thread
  T1  예전에 TUI가 보던 thread
  T2  /clear 후 현재 TUI가 보고 있는 thread
```

이 ID들은 전부 진짜 Codex thread id다. 가짜 ID가 아니다.

하지만 사용자가 현재 TUI 화면에서 보고 있는 thread는 보통 하나다. 이걸 debugging
중에 "TUI focus"라고 불렀다.

```text
loaded thread  = app-server 메모리에 살아 있는 thread
focused thread = 사용자가 현재 Codex TUI 화면에서 보고 있는 thread
```

중요한 차이는 이거다.

- `thread/loaded/list`는 loaded 상태인 thread id 목록을 알려준다.
- 하지만 그중 어느 thread를 사용자가 현재 보고 있는지는 알려주지 않는다.

그래서 이런 일이 생길 수 있다.

```text
loaded list = [D1, T1, T2]
사용자 화면 = T2
daemon이 Claude 메시지를 D1에 넣음

결과:
  app-server는 turn/start를 성공 처리함
  aiox status는 completed가 됨
  사용자는 현재 TUI에서 아무것도 못 봄
```

이게 "completed인데 Codex TUI에는 안 보임" 현상의 핵심이다.

## 현재 MVP 정책

현재 MVP 정책은 다음과 같다.

```text
Claude -> Codex 전달 직전:
  thread/loaded/list를 호출한다
  마지막 loaded thread id를 고른다
  그 thread에 turn/start를 보낸다
```

코드로는 이 정책이다.

```ts
loadedThreadIds.at(-1)
```

이 정책은 현재 관찰된 사용자 흐름과 잘 맞는다.

```text
T1: 처음 Codex TUI thread
T2: /clear
T3: /new
T4: /fork

loaded list = [T1, T2, T3, T4]
선택        = T4
```

사용자가 새 대화방을 만들면 TUI도 보통 그 새 대화방으로 이동한다. 그래서 MVP
범위에서는 "마지막 loaded thread"가 사용자가 보고 있을 가능성이 가장 높다.

단, 이것은 Codex app-server가 공식적으로 보장한 규칙은 아니다. 현재 app-server
protocol에는 "사용자가 지금 보고 있는 thread가 무엇인지"를 직접 알려주는
`thread/focused` 또는 `thread/active` 같은 RPC가 없다.

## 왜 cache 기반 선택이 깨졌나

이전에는 "cached thread가 아닌 다른 loaded thread를 고르자"는 생각이 있었다.
이 방식은 cold start에서는 맞아 보였다.

```text
cache = D1
loaded list = [D1, T1]
non-cache 선택 = T1
```

하지만 한 번 성공한 뒤에는 cache가 visible thread로 바뀐다.

```text
cache = T2
loaded list = [D1, T1, T2]
non-cache 선택 = D1 또는 T1
```

이제 non-cache는 오히려 과거 hidden/stale thread를 가리킬 수 있다. 그래서 현재
정책은 target thread를 고를 때 cache를 보지 않고, loaded list의 마지막 값을
고른다.

## 기억할 것

- `threadId`는 Codex 대화방 ID다.
- Codex 답변 텍스트는 thread가 아니라 thread 안의 message다.
- 하나의 Codex TUI 화면도 시간에 따라 `T1 -> T2 -> T3`처럼 다른 thread로
  이동할 수 있다.
- `/clear`, `/new`, `/fork`는 새 thread를 만들거나 새 thread로 이동할 수 있다.
- `thread/loaded/list`는 loaded thread 목록만 알려준다.
- app-server가 focused thread를 직접 알려주지 않으므로, 현재 aiox는 Claude ->
  Codex 전달 시 마지막 loaded thread를 선택한다.
