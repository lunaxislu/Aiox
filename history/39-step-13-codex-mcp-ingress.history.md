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

Step 13 closeout will record the post-implementation baseline.

## Out of scope

Carried verbatim from `history/37` Step 13 scope:

- Long-running daemon/client reuse (Step 14).
- Project-local daemon / project-root namespace.
- aiox-level control MCP.
- Codex app-server notification scraping as authoritative source path.
- TUI-originated `/clear` `/new` `/fork` rebind via MCP callback (post-MVP).
