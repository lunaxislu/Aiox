# aiox Local Runtime — CLI / Invocation / Doctor / Status (§9)

> 컨텍스트: [[local-agent-runtime]] 인덱스. status 어휘·module overview·authority links는 인덱스가 소유한다.

## 9. CLI / Invocation / Doctor / Status

### 9.1 Command Table

| Command | Auto-starts daemon? | Cite |
|---|---|---|
| `aiox daemon start` | n/a (this IS the start) | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:185-190`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:136-141`; fork [[src/bin/aiox.ts]] — `src/bin/aiox.ts:95-102` (fork cmd at `src/bin/aiox.ts:182-194`) |
| `aiox daemon stop [--daemon-only]` | no | `cli/parse.ts:192-198`; `bin/aiox.ts:104-120` |
| `aiox daemon restart` | yes (after stop) | `cli/parse.ts:200-205`; `bin/aiox.ts:122-126` |
| `aiox daemon status` | no | `cli/parse.ts:207-212`; `bin/aiox.ts:128-147` |
| `aiox codex --name <n> [--pair <p>] [--resume <id>]` | **yes** | `cli/parse.ts:214, 257-289`; `cli/invocation.ts:157-199` |
| `aiox claude --name <n> [--pair <p>]` | **yes** | `cli/parse.ts:215, 257-289`; `cli/invocation.ts:157-164, 200-259` |
| `aiox connect <source> <target...>` | no | `cli/parse.ts:216, 291-313`; `cli/invocation.ts:262-270` |
| `aiox disconnect <source> <target...>` | no | `cli/parse.ts:217, 291-313`; `cli/invocation.ts:271-279` |
| `aiox pair --name <pair-name>` | no | `cli/parse.ts:218, 315-323`; `cli/invocation.ts:280-285` |
| `aiox status` | no | `cli/parse.ts:327-331`; `cli/invocation.ts:286-289` |
| `aiox stop` | no | `cli/parse.ts:333-338`; `cli/invocation.ts:290-292` |
| `aiox doctor` | no | `cli/parse.ts:340-345`; `cli/doctor.ts:17-43` |
| `aiox claude-plugin setup [--scope <scope>]` | no | parse `cli/parse.ts:219, 225-243`; invoke `cli/invocation.ts:300-301, 317-352` |
| `aiox mcp-codex` *(hidden)* | no | `cli/parse.ts:347-352`; `cli/invocation.ts:295-299` |
| `aiox _run-daemon --socket <path>` *(hidden)* | n/a | `cli/parse.ts:354-360`; `cli/invocation.ts:302-306` |

Auto-start is wired only on `agent-attach` (`cli/invocation.ts:166`). The
legacy PRD auto-start requirement is absorbed here as current architecture
behavior; Step 14 provenance is preserved in
`logs/2026-06-19-mvp-history-archive.md` §2.3.

### 9.2 Invocation Layer

`invokeParsedCommand` (`src/cli/invocation.ts:131-310`) is a switch on
`ParsedCommand.kind`. Cross-cutting helpers:

- `ensureOk(response)` (`src/cli/invocation.ts:616-625`) checks
  `{ok:false, reason}` and throws `InvocationError` with code
  `"aiox.invocation."+reason` and `exitCode: 1`.
- Parse errors use `CliParseError` (cli/parse.ts:71-81) with codes
  `aiox.<commander-code>`, `aiox.missingCommand`, `aiox.invalidName`,
  `aiox.missingTargets`. Commander's exit code is propagated as-is
  (provenance: logs/2026-06-19-mvp-history-archive.md §4.1).

`agent-attach` exit code is the TUI child's exit code:
`tuiExit.exitCode ?? (tuiExit.signal ? 1 : 0)` (cli/invocation.ts:198,
258). Codex attach on TUI spawn error calls `rollbackAgentAttach` first
(cli/invocation.ts:189-192, 538-565).

### 9.3 Doctor + Status

**`aiox doctor`** runs five checks in order ([[src/cli/doctor.ts]] — `src/cli/doctor.ts:17-43`):
node, codex (`which codex`), claude (`which claude`), sqlite-native
(`require("better-sqlite3")`), daemon socket (`existsSync(socketPath)`).
Exit code 1 if any check is `error`, else 0 (cli/invocation.ts:609-614).

**`aiox status`** renders DAEMON → AGENTS → PAIRS → ROUTES → DELIVERIES
in fixed order ([[src/cli/format.ts]] — `src/cli/format.ts:30-75`; doctor/status output decisions in logs/2026-06-19-mvp-history-archive.md §4.2). DELIVERIES line
always prints all five statuses: `messages=N queued=N delivering=N`,
`delivered=N completed=N failed=N`.

`StatusResponse.status()` (state.ts:1162-1174) aggregates via repository
`COUNT(*)`. Tmux check and pnpm check were intentionally removed at closeout
(logs/2026-06-19-mvp-history-archive.md §4.2).
