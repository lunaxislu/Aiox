# aiox Local Runtime — CLI / Invocation / Doctor / Status (§9)

Related: [[docs/architecture/local-agent-runtime]]

Status: Current

This slice owns the current CLI/operator surface, invocation switch behavior,
doctor/status output, and daemon auto-start boundary. The index owns status
vocabulary, module overview, and authority links.

## 9. CLI / Invocation / Doctor / Status

### 9.1 Command Table

| Command | Auto-starts daemon? | Cite |
|---|---|---|
| `aiox daemon start` | n/a (this IS the start) | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:185-190`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:136-141`; fork [[src/bin/aiox.ts]] — `src/bin/aiox.ts:95-102` (fork cmd at `src/bin/aiox.ts:182-194`) |
| `aiox daemon stop [--daemon-only]` | no | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:192-198`; invoke [[src/bin/aiox.ts]] — `src/bin/aiox.ts:104-120` |
| `aiox daemon restart` | yes (after stop) | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:200-205`; invoke [[src/bin/aiox.ts]] — `src/bin/aiox.ts:122-126` |
| `aiox daemon status` | no | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:207-212`; invoke [[src/bin/aiox.ts]] — `src/bin/aiox.ts:128-147` |
| `aiox codex --name <n> [--pair <p>] [--resume <id>] [--role <role>] [--description <description>] [--instructions <instructions>]` | **yes** | parse [[src/cli/parse.ts]] — `addAgentAttachCommand`; invoke [[src/cli/invocation.ts]] — `agent-attach` |
| `aiox claude --name <n> [--pair <p>] [--role <role>] [--description <description>] [--instructions <instructions>]` | **yes** | parse [[src/cli/parse.ts]] — `addAgentAttachCommand`; invoke [[src/cli/invocation.ts]] — `agent-attach` |
| `aiox claude setup [--scope <scope>]` | no | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:288-304`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:266-267,283-313` |
| `aiox connect <source> <target...>` | no | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:216,291-313`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:262-270` |
| `aiox pair --name <pair-name>` | no | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:218,315-323`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:280-285` |
| `aiox status` | no | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:327-331`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:286-289` |
| `aiox stop` | no | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:333-338`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:290-292` |
| `aiox doctor` | no | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:340-345`; checks [[src/cli/doctor.ts]] — `src/cli/doctor.ts:17-43`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:293-294,609-614` |
| `aiox mcp-codex` *(hidden)* | no | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:365-369`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:255-259` |
| `aiox mcp-claude` *(hidden)* | no | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:371-375`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:260-264` |
| `aiox _run-daemon --socket <path>` *(hidden)* | n/a | parse [[src/cli/parse.ts]] — `src/cli/parse.ts:378-384`; invoke [[src/cli/invocation.ts]] — `src/cli/invocation.ts:268-272` |

Auto-start is wired only on `agent-attach`. The legacy PRD auto-start
requirement is absorbed here as current architecture behavior; Step 14
provenance is preserved in `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §2.3.

Evidence:

- Attach-only auto-start
  - [[src/cli/invocation.ts]]
    - `src/cli/invocation.ts:157-167`

### 9.2 Invocation Layer

`invokeParsedCommand` (`src/cli/invocation.ts:131-310`) is a switch on
`ParsedCommand.kind`. Cross-cutting helpers:

- `ensureOk(response)` checks
  `{ok:false, reason}` and throws `InvocationError` with code
  `"aiox.invocation."+reason` and `exitCode: 1`.
- Parse errors use `CliParseError` with codes
  `aiox.<commander-code>`, `aiox.missingCommand`, `aiox.invalidName`,
  `aiox.missingTargets`. Commander's exit code is propagated as-is
  (provenance: logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md §4.1).

For `aiox claude`, the launch preflight runs before daemon auto-start and
agent attach. It asks `claude mcp get` whether the named static MCP resolves
to an effective Local, User, or Project entry for the command cwd; it does
not interpret the connection-status text. A missing entry reports
`aiox.invocation.claude_mcp_not_registered` and directs the operator to
`aiox claude setup --scope <local|user|project>`.
The rationale is [[docs/decisions/claude-channel-effective-registration-scope]].

Evidence:

- Invocation switch and failure mapping
  - [[src/cli/invocation.ts]]
    - `src/cli/invocation.ts:131-310`
    - `src/cli/invocation.ts:616-625`
- Parse error shape and local validation codes
  - [[src/cli/parse.ts]]
    - `src/cli/parse.ts:71-81`
    - `src/cli/parse.ts:118-159`
    - `src/cli/parse.ts:291-313`

`agent-attach` exit code is the TUI child's exit code:
`tuiExit.exitCode ?? (tuiExit.signal ? 1 : 0)`. Codex attach on TUI spawn
error calls `rollbackAgentAttach` first.

Evidence:

- Attach child exit and rollback handling
  - [[src/cli/invocation.ts]]
    - `src/cli/invocation.ts:186-198`
    - `src/cli/invocation.ts:256-258`
    - `src/cli/invocation.ts:538-565`

### 9.3 Doctor + Status

**`aiox doctor`** runs five checks in order: node, codex (`which codex`),
claude (`which claude`), sqlite-native (`require("better-sqlite3")`), daemon
socket (`existsSync(socketPath)`). Exit code 1 if any check is `error`, else 0.

**`aiox status`** renders DAEMON → AGENTS → DELIVERY GUARANTEES → PAIRS →
ROUTES → DELIVERIES in fixed order. The delivery-guarantees table renders the
daemon-owned, status-only per-agent projection; its delivery semantics and
non-generic boundary are owned by
[[docs/architecture/local-runtime-daemon-transport-api]]. DELIVERIES line
always prints all six statuses: `messages=N queued=N delivering=N`,
`delivered=N completed=N failed=N unconfirmed=N`.

`status()` aggregates delivery counts via repository `COUNT(*)`. Tmux check
and pnpm check were intentionally removed at closeout
(`logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §4.2).

Evidence:

- Doctor checks and exit code
  - [[src/cli/doctor.ts]]
    - `src/cli/doctor.ts:17-43`
  - [[src/cli/invocation.ts]]
    - `src/cli/invocation.ts:609-614`
  - [[tests/unit/cli/doctor.test.ts]]
    - `tests/unit/cli/doctor.test.ts:5-63`
- Status output and delivery statuses
  - [[src/cli/format.ts]]
    - `src/cli/format.ts:30-109`
  - [[tests/unit/cli/format.test.ts]]
    - `tests/unit/cli/format.test.ts:106-180`
  - [[src/core/deliveries.ts]]
    - `src/core/deliveries.ts:3-9`
  - [[src/daemon/state.ts]]
    - `status`
