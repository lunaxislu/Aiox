# Step 13 — Codex MCP Ingress (decision + spike)

## Status

- Date: 2026-05-23
- Phase: Step 13 entry. Pre-implementation verification spike + mechanism
  decision. No production code yet.
- Authority: this file plus `history/38-step-13-mcp-scope-decision.history.md`,
  `plan/mvp-implementation-checklist.md` Step 13, and
  `prd/mvp/aiox-mvp-spec.md` MCP Categories section.

## Why this spike

`history/38` locked the product policy:

- Global `~/.codex/config.toml` mutation is forbidden.
- Agent identity must come from launch-injected socket path + daemon-issued
  agent token, not agent name alone.
- Codex outbound MVP path is an explicit aiox-managed agent-level MCP/tool
  callback. App-server notification scraping is **not** authoritative.

But the actual Codex CLI capability for **launch-scoped MCP injection** was
unverified. `history/38` §Verification Requirements explicitly demands
empirical verification before implementation.

## Spike scope

Tested against installed `codex-cli 0.132.0`
(`/Users/lunaxislu/.local/share/mise/installs/node/24.14.0/bin/codex`).

S1. Does `-c <key=value>` accept an inline TOML table for
    `mcp_servers.<name>`?
S2. Does the override actually register an agent-level MCP server for that
    single invocation without touching `~/.codex/config.toml`?
S3. Does the inline table support nested `env = { KEY = "value" }` so the
    spawned MCP child receives launch-scoped secrets?
S4. Is stdout the MCP protocol channel for stdio MCP servers (so the aiox MCP
    child must keep stdout protocol-only and log to stderr)?
S5. Is a fallback (`CODEX_HOME` + temp config file) needed?

## Spike results

### S1 / S2 — `-c mcp_servers.<name> = {...}` PASS

```
$ codex mcp list -c 'mcp_servers.aiox = { command = "echo", args = ["hi"] }' --json
[
  {
    "name": "aiox",
    "enabled": true,
    "transport": {
      "type": "stdio",
      "command": "echo",
      "args": ["hi"],
      "env": null,
      "env_vars": [],
      "cwd": null
    },
    ...
  },
  { "name": "context7", ... },
  { "name": "notion", ... },
  { "name": "openaiDeveloperDocs", ... }
]
```

Same command without `-c`:

```
$ codex mcp list --json
[ "context7", "notion", "openaiDeveloperDocs" ]    # aiox absent
```

→ `-c 'mcp_servers.aiox = { ... }'` is a per-invocation override layered on top
of the user config. `~/.codex/config.toml` is **not** mutated.

### S3 — Inline `env = { ... }` PASS

```
$ codex mcp list -c 'mcp_servers.aiox = { command = "node", args = ["/tmp/aiox-mcp.js"], env = { AIOX_SOCKET_PATH = "/tmp/sock", AIOX_CODEX_AGENT_TOKEN = "tk" } }' --json
[
  {
    "name": "aiox",
    "transport": {
      "type": "stdio",
      "command": "node",
      "args": ["/tmp/aiox-mcp.js"],
      "env": {
        "AIOX_SOCKET_PATH": "/tmp/sock",
        "AIOX_CODEX_AGENT_TOKEN": "tk"
      },
      ...
    },
    ...
  }
]
```

→ Nested `env` table is preserved through the TOML override and surfaces on the
spawned MCP child. This is the launch-scoped secret-injection channel.

### S4 — stdout is MCP protocol (no console.log)

Known stdio MCP invariant. The Codex TUI consumes the stdio MCP child's stdout
as protocol frames. Any non-JSON line on stdout is a protocol violation.
Implementation must keep all diagnostic output on stderr.

### S5 — No fallback needed for MVP

Because S1/S2/S3 all PASS with a single `-c` flag pair, the
`CODEX_HOME + temp file` fallback is not required for MVP. Recorded for future
reference if a Codex CLI release ever drops `-c mcp_servers.<name>` support.

## Mechanism decision

For Step 13 MVP, `aiox codex` launches Codex TUI with **two extra spawn
arguments** prepended to the existing `codex [resume <id>] --remote <ws>` call:

```
-c
mcp_servers.aiox = { command = "<process.execPath>", args = ["<aioxBin>", "mcp-codex"], env = { AIOX_SOCKET_PATH = "...", AIOX_CODEX_AGENT_NAME = "...", AIOX_CODEX_AGENT_TOKEN = "..." } }
```

Key properties:

- Arguments are passed via `spawn(command, args, ...)` array, not a shell
  string. No quoting/escaping concerns.
- The TUI is the MCP host (not `codex app-server`), so the `-c` override is
  scoped to the `codex --remote` invocation only.
- Each `aiox codex --name <name>` invocation gets a fresh per-agent token from
  the daemon; the token is launch-scoped, never written to disk.

Disable knob (test-only): if `process.env.AIOX_CODEX_TUI_MCP_DISABLE === "1"`,
launcher skips the `-c mcp_servers.aiox=...` injection. Used by unit tests that
do not want to launch a real MCP child.

## Typed error policy

Mirrors the Claude channel pattern but with Codex-specific reasons.

- `codex_channel_registration_failed`
  - `unknown_token` — register call carried a token not present in
    `codexPendingTokens` Map.
- `codex_ingress_unauthorized`
  - Token missing.
  - Token + agentName mismatch (token belongs to a different agent).
  - Agent was not registered via `registerCodexChannel` first.
- Existing `no_active_routes` rejection is preserved verbatim; the ingress RPCs
  pass it through after token validation.

Tool-side mapping (inside `aiox mcp-codex` MCP server): every daemon typed
reject becomes a tool result with `isError: true` and structured text content
naming the reason. The MCP server itself never exits on a typed reject; only
fatal env validation failures (missing socket path or token) exit non-zero.

## Decisions confirmed (per user, 2026-05-23)

| Question | Decision | Rationale |
|---|---|---|
| Daemon ingress RPC shape | New `receiveCodexMessage` / `receiveCodexReply` (Claude mirror) | Token validation responsibility lives in dedicated RPC; `sendMessage` stays trusted-internal. |
| MCP entry point | `aiox mcp-codex` hidden subcommand on the existing `aiox` bin | Single bin; no separate package.json entry; `process.execPath + process.argv[1]` resolves dev (tsx) and prod (dist) uniformly. |
| Injection mechanism | `-c mcp_servers.aiox = { ... }` inline TOML only | Verified PASS for S1/S2/S3; no temp file, no cleanup, atomic per launch. |

## Verification baseline before Step 13 work

```
pnpm test       # 273 tests passing (Step 12 baseline)
pnpm typecheck  # PASS
pnpm build      # PASS
```

## Closeout (2026-05-23)

Implemented and verified.

### Commits

| Commit | Type | Summary |
|---|---|---|
| `72b8bb4` | docs | spike result + mechanism decision (this file's original draft) |
| `292a1d7` | structure | extract `runSendMessageTransaction` helper (no behavior change, 273 tests stable) |
| `a776744` | behavior | daemon ingress RPCs: pending token Map, register/disconnect, receive*, 4 new events, typed `codex_ingress_unauthorized` / `codex_channel_registration_failed` |
| `fe44d7e` | behavior | `aiox mcp-codex` hidden subcommand + `src/adapters/codex/mcp-server.ts` stdio MCP (tools: `aiox_send_message`, `aiox_reply`) |
| `8ce0323` | behavior | Codex TUI launcher injects `-c 'mcp_servers.aiox = {...}'` when token + socket path are supplied; `InvocationRuntime.daemonSocketPath()` exposes it; `AIOX_CODEX_TUI_MCP_DISABLE=1` test escape |
| (closeout) | docs | plan checklist Step 13 ✅, this closeout |

### Test surface added (15 + 7 + 3 = 25 new tests)

- `tests/unit/daemon/codex-ingress.test.ts` (15 tests): token issuance, register/disconnect paths, `receiveCodexMessage` + `receiveCodexReply` happy paths, missing/wrong/cross-agent token rejections, no_active_routes preservation, sendMessage regression.
- `tests/unit/adapters/codex-mcp-server.test.ts` (7 tests): handlers route through receiveCodex* with token, typed rejects map to `isError: true`, daemon socket errors map to `daemon_call_failed`, env parsing, daemon client closed after each tool call.
- `tests/unit/adapters/codex-launcher.test.ts` (3 added): `-c mcp_servers.aiox=...` shape, env override `AIOX_CODEX_TUI_MCP_DISABLE=1` skips injection, mcp option absent falls back to baseline args.

### Final verification

```
pnpm test       # 298 passing (+25)
pnpm typecheck  # PASS
pnpm build      # PASS
```

### Open follow-ups (intentionally deferred to Step 14 / post-MVP)

- Manual end-to-end smoke with real Codex + real Claude in separate terminals: Step 14.
- Long-running daemon/client reuse so separate CLI invocations share state: Step 14.
- TUI-originated `/clear` / `/new` / `/fork` rebind via MCP callback: post-MVP Open Product Issue (Step 10 D7 Option D path).
- aiox-level control MCP setup UX (`aiox setup mcp --scope project|global`): post-MVP per `history/38`.

## Review follow-up (2026-05-23)

Post-implementation review identified and fixed 3 issues. All addressed in a single hardening commit.

### Issue 1 (High): Stale Codex ingress tokens authorized after session end

**Root cause:**
- `detachCodexAgent()` / `notifyTuiExited()` / `detachAgent()` did not clear `codexChannelRuntimes` or `codexPendingTokens`.
- `stop({ daemonOnly: false })` did not clear Codex ingress state for stopped agents.
- `authorizeCodexIngress()` checked token hash only, not agent connection status.

**Fixes applied:**
1. `detachCodexAgent()`: added `codexChannelRuntimes.delete` + `codexPendingTokens.delete` after runtime dispose.
2. `stop()`: iterates `stoppedAgents` and deletes each agent's entries from both maps (daemonOnly branch unchanged).
3. `authorizeCodexIngress()`: added agent connection status check after runtime lookup — disconnected agent → `agent_disconnected` detail.
4. `rollbackAgentAttach()`: added defensive `codexPendingTokens.delete` + `codexChannelRuntimes.delete`.

### Issue 2 (Medium): Codex token authorization used 12-char SHA-256 prefix

**Root cause:** `codexTokenFingerprint()` returned `.slice(0, 12)` and was used for both storage and authorization comparison.

**Fix applied:**
- `codexTokenFingerprint()` now returns full 64-char hex (no slice).
- Added `codexTokenShortHash()` (12-char) used only for event emit display.
- `registerCodexChannel` event uses `codexTokenShortHash` so raw token is never logged.

### Issue 3 (Low): CLI name validation allowed control characters

**Root cause:** `requireNonEmptyName()` only rejected empty/whitespace-only names; names with `\n`, `\x00`, etc. were accepted and could reach TOML inline injection.

**Fix applied:** Added `/[\x00-\x1F\x7F]/` check in `requireNonEmptyName()` → throws `aiox.invalidName`.

### Tests added (8 new, total 306)

- `codex-ingress.test.ts` +5: notifyTuiExited revokes token, detachAgent revokes token, stop(daemonOnly:false) revokes token, stale-entry + disconnected agent rejected, tokenHash is 64-char full hex.
- `parse.test.ts` +3: rejects name with `\n`, rejects name with `\x00`, accepts valid name (regression guard).

### Verification

```
pnpm test       # 306 passing (+8 from 298)
pnpm typecheck  # PASS
pnpm build      # PASS
```

### Additional review gap: runtime failure reattach window

Follow-up review found one remaining stale-token path after commit `051839a`.
`recordCodexRuntimeFailed()` disconnected the agent but did not clear
`codexChannelRuntimes` / `codexPendingTokens`. The disconnected-status check
blocked immediate sends, but a same-name reattach could make the old registered
channel entry valid again before the new MCP server registered.

**Fix applied:** `recordCodexRuntimeFailed()` now deletes both Codex ingress maps
before marking the agent disconnected. Added a regression test that records a
runtime failure, reattaches the same Codex name, and verifies the old token is
rejected.

**Verification:**

```
pnpm test       # 307 passing
pnpm typecheck  # PASS
pnpm build      # PASS
```

## Out of scope

Carried verbatim from `history/37` Step 13 scope:

- Long-running daemon/client reuse (Step 14).
- Project-local daemon / project-root namespace.
- aiox-level control MCP.
- Codex app-server notification scraping as authoritative source path.
- TUI-originated `/clear` `/new` `/fork` rebind via MCP callback (post-MVP).

### Step 14 remote-mode correction (2026-05-24)

Step 13's stdout MCP protocol, daemon RPCs, token hardening, and inline TOML
shape remain valid, but the injection target changed after Step 14 remote-mode
smoke. In `codex --remote` mode, aiox now injects
`-c mcp_servers.aiox = {...}` into the daemon-owned `codex app-server` launch
instead of the foreground TUI launch. Current authority for that correction is
`history/40-step-14-daemon-client-split.history.md`.

Step 14 also fixed the hidden subcommand lifetime: `aiox mcp-codex` now
connects stdio MCP before daemon registration, logs registration failure without
exiting before initialize, and waits for stdio transport close. Token hardening
remains daemon-enforced. Authority: `history/40-step-14-daemon-client-split.history.md`.
