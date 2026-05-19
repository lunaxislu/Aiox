# Step 6 Invocation Layer + CLI Bin Entrypoint

> 작성일: 2026-05-19
> 작성자: Codex
> 관련 기록:
> - `history/20-step-6-phase-a-decisions.history.md` (Phase A 결정 + Phase B Round 1 옵션 합의)
> - `history/18-step-4-cli-parsing.history.md` (parser side-effect free, exit code 결정)
> - `history/19-step-5-route-fanout-tests.history.md` (sendMessage alpha 동작과 O2)
> - `plan/mvp-implementation-checklist.md` Step 6

---

## 배경

Step 5 마감 후 새 Step 6으로 삽입된 invocation layer + CLI bin entrypoint를
구현했다. Phase A에서 닫힌 결정 3건과 Phase B Round 1 구조 결정 6건은
`history/20-step-6-phase-a-decisions.history.md`를 권위로 따른다.

---

## 구현 결과

| commit | 내용 |
|---|---|
| `051264c` | `docs: record step 6 phase b decisions` |
| `1050ca6` | `behavior: add cli invocation dispatch layer` |
| `09fdc4e` | `behavior: add aiox cli bin entrypoint` |
| `8bc75ec` | `behavior: reject orphan daemon messages` |

주요 변경:

- `src/cli/invocation.ts`를 추가해 `ParsedCommand` 13개 variant를 exhaustive
  `switch`로 daemon/runtime action에 dispatch한다.
- `global-stop` shortcut 정규화는 parser가 아니라 invocation layer에서 수행한다.
- invocation 실패는 `InvocationError` + `aiox.invocation.*` namespace로 노출한다.
- `src/bin/aiox.ts`를 추가해 `process.argv` → parse → invocation → exit code 흐름을
  제공한다.
- 현 단계 transport는 fake in-process runtime이다. real socket transport는 후속
  step으로 유지한다.
- `package.json#bin`은 실제 TypeScript 출력 위치인 `dist/src/bin/aiox.js`로
  정합화했다.
- `sendMessage`는 active source route 0개일 때 `{ ok: false, reason:
  "no_active_routes" }`를 반환하고 message / delivery / event row를 추가하지
  않는다 (β-1).
- `dist/` build artifact는 커밋하지 않도록 `.gitignore`에 추가했다.

---

## TDD 기록

- Invocation red: `src/cli/invocation.ts` 부재로 dispatch tests 실패.
- Invocation green: exhaustive switch dispatch + `assertNever` + invocation error
  namespace 추가.
- Bin red: `src/bin/aiox.ts` 부재와 package bin path mismatch.
- Bin green: `runAioxCli` export, fake runtime, help/version stdout, parse/invocation
  exit code propagation, package bin path 정합화.
- sendMessage red: empty route에서 기존 alpha 동작(`ok: true`, message_created
  event)이 테스트에 걸림.
- sendMessage green: source route lookup 직후 early return으로 β-1 atomic reject.

---

## Verification

2026-05-19 Step 6 마감 검증:

- `pnpm test`: passing, 28 files, 147 tests
- `pnpm typecheck`: passing
- `pnpm build`: passing

---

## Deferred

- OA1: `sendMessage` CLI surface는 MVP Step 6에 추가하지 않는다. post-MVP 또는
  send CLI 필요 시점에 `aiox send` 및 `allowOrphanMessage` flag 여부를 재검토한다.
- Real socket transport는 fake in-process runtime 이후 별도 step으로 유지한다.
