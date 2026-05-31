# Release Plan (npm 배포)

배포 시점에 처리할 패키징 항목의 **살아있는 체크리스트**. 지금은 MVP/Post-MVP 구현 중이라 실제
배포는 하지 않으며, 아래 항목은 **실제 `npm publish` 직전에** 일괄 점검·적용한다.

> ⚠️ 상기 트리거: "build하고 npm 배포" 이야기가 나오면 이 파일을 먼저 연다. 사용자가 명시 요청 —
> 배포 시점에 다시 상기시킬 것. (2026-05-28, R3 작업 중 발견)

연관: `package.json`, `history/49-claude-mcp-config-injection-feasibility.history.md`, `plan/qa-tracker.md` R3.

---

## 블로커 (이대로 publish하면 설치본이 깨짐)

### B1. `dist/`가 tarball에서 제외됨 — **최우선**

- 현상: `.gitignore`에 `/dist/`가 있고, `package.json`에 `files` 필드도 `.npmignore`도 없음.
  npm 패킹 규칙상 둘 다 없으면 `.gitignore`를 fallback으로 써서 **`dist/` 전체가 빠진다.**
- 영향: `bin` → `./dist/src/bin/aiox.js` 누락 → `aiox` 명령 자체가 동작 안 함.
  channel-server.js도 누락 → R3에서 `import.meta.url`로 절대경로를 올바르게 resolve해도
  **가리킬 파일이 패키지에 없음.** (경로 로직은 정상, 파일이 안 실리는 게 문제.)
- 조치: `package.json`에 allowlist 추가 (allowlist는 `.gitignore`를 덮어씀):
  ```json
  "files": ["dist"]
  ```

### B2. 배포 전 build 보장 없음

- 현상: `prepublishOnly` / `prepare` 스크립트 없음 → dist가 stale하거나 없는 채로 publish될 수 있음.
- 조치: `"prepublishOnly": "pnpm build"` (또는 `prepare`) 추가.

## 정리 항목 (치명적이지 않으나 배포 전 손볼 것)

- `"main": "index.js"` — 존재하지 않는 파일을 가리킴. CLI 패키지라 치명적이진 않지만 부정확.
  제거하거나 실제 entry로 교정.
- `name: "ai-orchestration"` / `version: "1.0.0"` / `description` / `author` / `license` — 배포 식별자
  최종 확정 (스코프 패키지 여부, 초기 버전 정책 등).

## 양호 (배포 시 재확인만)

- `bin` shebang `#!/usr/bin/env node` — src/dist 모두 정상.
- 런타임 의존성(`@modelcontextprotocol/*`, `better-sqlite3`, `commander`, `ws`, `zod`)이
  `dependencies`에 정상 배치. `better-sqlite3`는 native — 설치 환경 빌드 가능성 재확인
  (`pnpm.onlyBuiltDependencies`에 등록돼 있음).
- R3 경로 도출(`import.meta.url` → dist sibling)은 전역/로컬/npx 설치 어디서나 cwd-독립적으로 정확.
  B1만 해결되면 npm 환경에서 그대로 동작.

## 배포 전 점검 순서 (제안)

1. B1·B2 적용 후 `pnpm build`.
2. `npm pack` → 생성된 tarball 내용물 확인 (`tar tzf *.tgz`): `dist/src/bin/aiox.js`,
   `dist/src/adapters/claude/channel-server.js` 포함 여부 검증.
3. 임시 디렉터리에 `npm i -g ./<tarball>` 또는 `npx ./<tarball>`로 설치 → repo 밖에서
   `aiox claude` 실행 → R3 수동 smoke (dev-channel ↔ `--mcp-config` resolve)까지 함께 확인.
4. 통과 후 `npm publish`.
