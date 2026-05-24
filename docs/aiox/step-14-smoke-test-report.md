# Step 14 Manual E2E Smoke Test Report

이 문서는 Step 14 (Daemon-Client 분리) 구현 후 진행한 수동 E2E 스모크 테스트의 결과와 발견된 치명적 결함(Blocking Issues), 그 원인 및 해결 방안을 기록합니다.

권위 기록은 `history/40-step-14-daemon-client-split.history.md`이며, 이 문서는 사용자가 나중에 다시 볼 수 있는 learning record입니다.

## 📌 테스트 개요
- **목적**: 백그라운드 데몬 프로세스와 분리된 CLI 클라이언트(Codex, Claude) 간의 통신 및 생명주기(Lifecycle) 정상 동작 검증
- **테스트 환경**: macOS 표준 터미널, 로컬 Unix Socket (`/tmp/aiox-smoke.sock`)

---

## 🚀 스모크 테스트 실행 과정 (Test Procedure)

본 스모크 테스트는 데몬 실행부터 클라이언트 페어링까지 전체 라이프사이클을 수동으로 E2E 테스트하기 위해 다음 순서로 진행되었습니다.

1. **빌드 및 환경 준비**
   ```bash
   pnpm build
   export AIOX_SOCKET_PATH=/tmp/aiox-smoke.sock
   ```

2. **초기 상태 확인 및 데몬 시작**
   ```bash
   node dist/src/bin/aiox.js daemon status
   node dist/src/bin/aiox.js daemon start
   node dist/src/bin/aiox.js daemon status
   ```

3. **Pair(페어) 생성**
   ```bash
   node dist/src/bin/aiox.js pair --name p1
   node dist/src/bin/aiox.js status
   ```

4. **클라이언트 실행 (각각 별도 터미널에서 백그라운드 실행)**
   ```bash
   # 터미널 1: Codex (impl 역할) 연결
   node dist/src/bin/aiox.js codex --name impl --pair p1

   # 터미널 2: Claude (reviewer 역할) 연결
   node dist/src/bin/aiox.js claude --name reviewer --pair p1
   ```

5. **최종 데몬 상태 확인 및 종료**
   ```bash
   node dist/src/bin/aiox.js status
   node dist/src/bin/aiox.js daemon stop
   ```

---

## 🚨 Blocker 1: 데몬 프로세스 즉시 종료 (Immediate Exit)

### 증상 (Symptom)
`aiox daemon start` 명령어를 실행하면, 백그라운드로 분리(detach)된 데몬 프로세스가 실행 직후 곧바로 종료 코드 0과 함께 자살(종료)합니다. 그 결과 클라이언트가 접속할 소켓이 유지되지 않습니다.

### 원인 (Root Cause)
Node.js의 비동기(Promise) 처리 방식과 명시적인 `process.exit()` 호출 간의 충돌로 발생한 생명주기 버그입니다.

1. `src/bin/aiox.ts`의 `main()` 함수는 비동기 작업이 끝나면 `process.exit(await runAioxCli())`를 호출하여 강제로 프로세스를 종료합니다.
2. `src/daemon/run.ts`의 `runDaemonProcess` 함수는 소켓 서버(`net.Server`)를 띄운 직후, 아무런 대기(pending) 프로미스 없이 즉시 `resolve`되어 함수를 빠져나옵니다.
3. 코드에는 "소켓 서버가 열려있으니 이벤트 루프가 유지될 것이다"라는 주석이 있으나, 상위의 `process.exit(0)` 호출이 이를 무시하고 Node.js 프로세스를 즉시 강제 종료해버립니다.

### 해결 방안 (Solution)
`runDaemonProcess`가 우아한 종료(Graceful Shutdown) 시그널을 받기 전까지는 `Promise`를 반환(resolve)하지 않고 대기하도록 수정해야 합니다.

```typescript
// src/daemon/run.ts 수정 방향
export async function runDaemonProcess(socketPath: string): Promise<void> {
  // ... (초기화) ...
  return new Promise<void>((resolve) => {
    async function shutdown(): Promise<void> {
      // 자원 정리 후 resolve 호출로 무한 대기 해제
      resolve();
    }
    process.once("SIGTERM", () => void shutdown());
    process.once("SIGINT", () => void shutdown());
  });
}
```

---

## 🚨 Blocker 2: Claude 채널 서버 설정 불일치 (.mcp.json Mismatch)

### 증상 (Symptom)
`aiox claude --name reviewer --pair p1`을 실행하면, CLI는 정상적으로 Claude를 띄우지만 Claude 내부에서 해당 채널 서버를 찾지 못해 채널 연결에 실패하고 진행이 막힙니다.

### 원인 (Root Cause)
Claude Code가 채널(MCP 서버)을 로드하는 엄격한 프로토콜 스펙과 aiox의 동적 에이전트 이름 생성 로직 사이의 구조적 충돌입니다.

1. aiox CLI는 에이전트 이름(`reviewer`)을 기반으로 동적인 채널 이름(`aiox-claude-reviewer`)을 만들어 Claude 실행 인자(`server:aiox-claude-reviewer`)로 넘깁니다.
2. Claude Code CLI는 전달받은 채널 이름을 단순한 라벨이 아닌, **`.mcp.json` 파일에서 실행 명령어를 찾기 위한 정확한 룩업 키(Lookup Key)**로 사용합니다.
3. 정적인 `.mcp.json` 파일에는 `aiox-claude-reviewer`라는 키가 미리 하드코딩되어 있지 않기 때문에 Claude가 서버를 띄우지 못합니다.

### 해결 방안 (Solution)
핵심은 **"채널 이름(Key)은 정적으로 하나만 고정해두고, 에이전트의 정체성(Identity)은 환경변수로 넘기는 것"**입니다.

#### 💡 해결 원리: 환경변수 상속 (Environment Variable Inheritance)

운영체제에서 프로세스를 실행할 때, 자식 프로세스는 부모 프로세스의 환경변수를 그대로 물려받습니다.
이 특성을 이용하면 굳이 채널 이름을 매번 다르게 만들 필요가 없습니다.

**흐름:**
1. `aiox claude --name reviewer` 실행
2. aiox가 환경변수에 `AIOX_CLAUDE_CHANNEL_AGENT_NAME="reviewer"`를 세팅함.
3. aiox가 Claude를 띄울 때 채널 이름은 무조건 고정된 이름(예: `aiox-claude-ingress`)을 줌.
4. Claude는 `.mcp.json`에서 `aiox-claude-ingress`를 찾아 자식 프로세스(채널 서버)를 띄움.
5. **[포인트]** 이때 띄워진 채널 서버는 할아버지 프로세스(aiox)가 세팅해둔 `AIOX_CLAUDE_CHANNEL_AGENT_NAME="reviewer"` 환경변수를 그대로 물려받아 읽을 수 있음!

결과적으로 `--name reviewer`든 `--name helper`든 똑같은 룩업 키를 사용하지만, 내부적으로는 자신이 누군지 완벽하게 구별할 수 있게 됩니다.

#### 🛠 구체적인 코드 수정 방법

이 방식을 적용하려면 딱 두 군데만 수정하면 됩니다.

**1. `.mcp.json`에 범용 채널 등록**
기존의 POC 설정을 지우고, 프로덕션용 채널 서버 스크립트를 가리키는 고정된 이름 하나를 등록합니다.

```json
// .mcp.json
{
  "mcpServers": {
    "aiox-claude-ingress": {
      "command": "node",
      "args": ["dist/src/adapters/claude/channel-server.js"]
    }
  }
}
```

**2. `src/cli/invocation.ts` 채널 이름 고정**
에이전트 이름에 따라 채널 이름을 조합하던 코드를 지우고, 1번에서 등록한 고정 이름을 넘겨줍니다.

```typescript
// src/cli/invocation.ts 수정 전
const channelName = `aiox-claude-${command.name}`;

// src/cli/invocation.ts 수정 후
const channelName = "aiox-claude-ingress"; // 고정된 단일 이름 사용
```

#### 이 방식의 장점
- **안전함**: `aiox claude` 명령어를 동시에 10개 띄워도, `.mcp.json` 파일 하나를 두고 싸우는 일(Race condition)이 발생하지 않습니다.
- **깨끗함**: 명령어 실행 시마다 `.mcp.json` 파일을 동적으로 쓰고 지우는(I/O) 지저분한 로직을 짤 필요가 없습니다.

---

## ✅ 기타 검증된 항목 (Verified)
- **데몬 상태 공유**: 별도의 CLI 프로세스들이 동일한 Unix Socket을 통해 상태를 정확히 공유함.
- **Codex 연결**: `mcp-codex` 명령을 통해 표준 MCP 통신(stdout)이 오염되지 않으며, 정상적으로 데몬에 연결됨.
- **데몬 종료 및 정리**: `aiox daemon stop` 시 데몬이 정상 종료되며 소켓 파일(`unlink`)이 깔끔하게 정리됨.
- **EPERM 권한 이슈**: 일반적인 터미널 환경에서는 소켓 생성/바인딩 관련 권한 이슈가 발생하지 않음 (이전 문제는 샌드박스 환경에 국한된 것으로 판단됨).
