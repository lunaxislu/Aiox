# Claude `--mcp-config` Injection Feasibility (vs dev-channel)

## Status

- Date: 2026-05-28
- Type: investigation / feasibility (no code change, no decision committed)
- Scope: Whether Claude can take a one-off MCP injection like Codex `-c`, and whether that can coexist with the current dev-channel mechanism.
- Authority context:
  - Claude launcher (current): `src/adapters/claude/launcher.ts`
  - Claude channel server (hybrid surface): `src/adapters/claude/channel-server.ts`
  - Claude inbound injector: `src/adapters/claude/injector.ts`
  - Codex MCP injection (`-c`): `src/adapters/codex/launcher.ts` (`buildCodexMcpArgs`)

## Motivation

UX symmetry. Codex injects MCP one-off via `-c` from any directory without permanent
registration, which is convenient. Question: can Claude do the equivalent so we don't
have to permanently install MCP (global / `.mcp.json`) for every path?

## Findings

### 1. Claude CLI supports one-off MCP injection

`claude --help` on this environment:

- `--mcp-config <configs...>` — "Load MCP servers from JSON files or strings (space-separated)".
  Accepts both a file path and an inline JSON string; multiple space-separated.
- `--strict-mcp-config` — "Only use MCP servers from --mcp-config, ignoring all other MCP configurations".

So Claude has a stable, documented equivalent to Codex `-c` for MCP. Difference: Codex `-c`
is a general config override; Claude `--mcp-config` is MCP-specific (+ `--strict-mcp-config`
for isolation).

### 2. aiox vendor integration is asymmetric (important correction)

The original premise ("aiox injects MCP into Claude") is wrong for Claude:

- **Codex**: `launcher.ts` `buildCodexMcpArgs` emits `-c 'mcp_servers.aiox = { command=..., args=[...,"mcp-codex"], env={...} }'` — aiox is injected as one MCP server.
- **Claude**: `launcher.ts:7` `buildLaunchClaudeChannelArgs` emits `["--dangerously-load-development-channels", "server:<channelName>"]` — **not** MCP. Uses the dev-channel mechanism. No `--mcp-config` / `--strict-mcp-config`.

### 3. Claude dev-channel is a hybrid (MCP tool + inbound HTTP push)

`channel-server.ts` does two things in one process:

- **outbound**: `createClaudeChannelMcpServer` + `registerTool("send"/"reply")` — MCP tools the Claude session calls.
- **inbound**: `startClaudeChannelHttpIngress` `POST /send` — daemon pushes a message *into* the running Claude session. `injector.ts` `fetch(runtime.endpoint, POST)` hits this.

The reason dev-channel is used (not plain MCP) is the **inbound push**. Standard MCP via
`--mcp-config` is a pull model — the server only acts when Claude calls a tool. MCP
server-initiated features (sampling/elicitation/notifications) cannot inject a new user-turn
message into the active session. So **replacing** dev-channel with `--mcp-config` would lose
inbound push.

### 4. The two flags are orthogonal — they can run together

`claude --dangerously-load-development-channels server:<name> --mcp-config '<json>'` keeps
dev-channel inbound push *and* adds arbitrary one-off MCP. They are different planes; neither
disables the other.

- Do **not** add `--strict-mcp-config` in this combo: strict makes Claude use only the
  `--mcp-config` servers and ignore the user's global/project MCP. For the UX goal, use plain
  `--mcp-config`.

So the UX goal is achievable *without* abandoning dev-channel: append `--mcp-config <payload>`
in `buildLaunchClaudeChannelArgs` (`launcher.ts:7`).

### 5. `-p` / non-interactive is not in the project path

No `-p` / `--print` / non-interactive handling anywhere in src or tests. `launcher.ts:42-45`
spawns Claude with `stdio: "inherit"` (interactive only). `tests/unit/adapters/claude-channel.test.ts:648-682`
asserts the spawn args are exactly the two dev-channel args (no `-p`). The `-p` used during this
investigation was test-harness convenience, unrelated to the real path.

### 6. Name-collision (scenario "C") is a non-issue by construction

dev-channel and mcp-config use separate identifier spaces:

- dev-channel: identified by `server:<channelName>`; tools `send`/`reply`.
- mcp-config: identified by `mcpServers` object keys.

They do not contend for the same namespace, so an mcp-config server name cannot "collide" with
the dev-channel name. Tool-name overlap (e.g. another server also exposing `send`) is expected to
be disambiguated by Claude Code's `mcp__<server>__<tool>` per-server prefixing. (Not 100%
confirmed: the exact namespace dev-channel `send`/`reply` are exposed under was not inspected.)
A separate, unrelated concern is launching two instances with the *same* channelName — that is a
dev-channel / daemon registration question, not an mcp-config interaction.

## Verification (and its limits)

Confirmed:

- `claude --mcp-config '{"mcpServers":{}}' -p "..."` → exit 0.
- `claude --dangerously-load-development-channels server:aiox-test --mcp-config '{"mcpServers":{}}' -p "..."` → exit 0. Both flags coexist in one invocation, normal termination, no parse error, no hang.

Not yet verified (would need interactive session + daemon):

- Real (non-empty) MCP server spawned alongside dev-channel — does the session see both the
  injected MCP tools *and* aiox `send`/`reply` in the tool list? (Coexistence proof.)
- inbound push still alive while `--mcp-config` is present (daemon → `injector.ts` POST received).
- Interactive (`stdio: "inherit"`) behavior — only `-p` was exercised.

## Outcome

- Feasibility: **confirmed at the flag level.** Claude can take one-off MCP injection
  (`--mcp-config`) and it coexists with the dev-channel inbound-push mechanism.
- No decision committed: whether to wire `--mcp-config` into `buildLaunchClaudeChannelArgs`
  is open. Implementation cost is small (append the flag + payload).
- Remaining proof (coexistence + inbound-push survival with a real MCP server, interactive
  mode) deferred — needs a manual interactive + daemon session, not automatable here.

## Decision (2026-05-28) — goal locked

User intent, stated directly:

> Inject the aiox MCP into Claude one-off, like Codex. Inject the aiox MCP **by default**.
> Just that, nothing else.

Concretely:

- `aiox claude` must **automatically inject the aiox MCP into Claude on every launch**, one-off
  (no permanent `.mcp.json` registration), mirroring how Codex auto-injects aiox via `-c`
  (`src/adapters/codex/launcher.ts` `buildCodexMcpArgs`).
- Scope is exactly this — **auto-injection of the aiox MCP**. Not a manual user-facing
  `--mcp-config` flag, not arbitrary third-party MCP passthrough, not any other feature.

This supersedes the "no decision committed" stance above: the direction is decided. (A prior
attempt that added a manual `--mcp-config` passthrough flag was reverted as out of scope — it
was the wrong shape: it required the user to supply the config manually, instead of aiox
auto-injecting it.)

## Implementation (2026-05-28) — prepared, manual smoke pending

Landed in working tree (not yet committed at time of writing):

- `src/adapters/claude/launcher.ts`: `buildClaudeChannelMcpConfig(...)` (mirrors Codex
  `buildCodexMcpArgs`) emits an inline `--mcp-config` JSON — `mcpServers["aiox-claude-ingress"]`
  = `{ command: node, args: [<absolute channel-server.js>], env: { AIOX_CLAUDE_CHANNEL_AGENT_NAME,
  AIOX_CLAUDE_CHANNEL_TOKEN, AIOX_SOCKET_PATH } }`. Absolute path resolved from `import.meta.url`
  (dist sibling), removing the cwd/`.mcp.json` coupling. `launchClaudeWithChannel` appends
  `--mcp-config <json>` after the dev-channel args and moves identity from inherited spawn env
  into the injected MCP `env`.
- `.mcp.json` removed (was path-dependent permanent registration).
- `src/cli/invocation.ts` comment updated; `channelName = "aiox-claude-ingress"` constant kept
  (dev-channel `server:<name>` must match the injected `mcpServers` key).
- Tests: `tests/unit/adapters/claude-channel.test.ts` spawn-args assert updated + new
  `buildClaudeChannelMcpConfig` describe; `docs/aiox/mvp-architecture.md` refreshed. 398 unit
  tests / typecheck / build PASS.

**Still pending the hard dependency below (manual interactive session):** whether dev-channel
`server:aiox-claude-ingress` actually resolves the definition supplied by the same invocation's
`--mcp-config`. If it only consults project/global MCP config, startup fails despite green unit
tests — fallback would be runtime-generated absolute-path `.mcp.json` (last resort; race/cleanup/
secret-exposure tradeoffs). Verify from a non-repo-root dir, confirm `send`/`reply` tools appear
and inbound push survives, then commit.

Cross-validated by Codex (2 review rounds): pattern parity with Codex injection, JSON quoting,
env move, and `.mcp.json` removal all clean; tsx (src) agent launch treated as unsupported
(dist-only, per history/42).
