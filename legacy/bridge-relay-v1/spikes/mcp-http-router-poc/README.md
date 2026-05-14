# mcp-http-router-poc

Isolated PoC. Verifies whether **stock `codex` and stock `claude`** can be coupled by a single central Node MCP HTTP server, with **no** `codex app-server`, **no** `codex --remote`, and **no** `claude --dangerously-load-development-channels`.

This PoC does **not** touch `bridge/`, `claude-adapter/`, `.codex/config.toml`, or `.mcp.json` in the project root.

---

## What gets built

A single Node process exposes:

| Path | Purpose |
|---|---|
| `POST/GET /mcp/codex` | Streamable HTTP MCP endpoint that stock `codex` registers as an MCP server |
| `POST/GET /mcp/claude` | Streamable HTTP MCP endpoint that stock `claude` registers as an MCP server |
| `GET /debug/status` | session list, pending reply_ids, inbox counts |
| `GET /debug/events` | last 100 lifecycle events + push attempts (sampling / elicitation / notification / inbox) |

Each endpoint, on initialize, builds its own `McpServer` instance and registers three tools:

| Tool | Available to | Behaviour |
|---|---|---|
| `ask_claude(text)` | `codex` agent | Server creates a pending `reply_id`, tries to push the message to the `claude` session via **(1) sampling → (2) elicitation → (3) logging notification → (4) inbox queue**, then awaits the resolve. |
| `ask_codex(text)` | `claude` agent | Mirror of above, towards the `codex` session. |
| `reply_to_router(reply_id, text)` | both | Resolves the pending entry that was waiting on `reply_id`. |
| `poll_inbox()` | both | Drains all queued relays addressed to the current agent (fallback path when push attempts do not surface in the model context). |

`reply_id` is a UUID created the moment `ask_*` is called. It is included verbatim in every push candidate so the other agent can copy it into `reply_to_router`.

---

## Build & run

This package is **outside the pnpm workspace** (the root `pnpm-workspace.yaml` only lists `bridge`, `claude-adapter`). Install and run with plain `npm` so we don't perturb the workspace lockfile.

```bash
cd spikes/mcp-http-router-poc
npm install
npm run build
npm start
# stderr: [router-poc] listening on http://127.0.0.1:9100
```

The server binds **127.0.0.1:9100** by default. Override with `POC_PORT=...`. Reply timeout (`POC_TIMEOUT_MS`) defaults to 60s.

`/debug/status` should respond immediately:

```bash
curl -sS http://127.0.0.1:9100/debug/status | jq
```

---

## Wiring stock `codex` (no `--remote`, no app-server)

The project root `.codex/config.toml` is **production bridge** — do not edit it.

1. Append `config-samples/codex-config.toml.sample` to your **user-level** Codex config at `~/.codex/config.toml`. (Codex merges user-level and project-level config; user-level applies even from a throwaway cwd.)
2. Start codex **outside** this repo so it does not pick up the production project config:
   ```bash
   mkdir -p /tmp/router-poc-codex-cwd && cd /tmp/router-poc-codex-cwd
   codex
   ```
3. Inside the session, confirm the tools:
   ```
   /mcp           # should list router_poc with ask_claude, reply_to_router, poll_inbox
   ```

`codex-cli 0.130.0` recognises an `url = "..."` MCP entry as a streamable HTTP transport. If your build uses a different schema, the sample file has a comment with the alternative `transport = "http"` shape — try both.

---

## Wiring stock `claude` (no development channels)

The project root `.mcp.json` is **production claude-adapter** — do not edit it.

1. Create a throwaway working directory and drop `config-samples/claude-mcp.json.sample` into it as `.mcp.json`:
   ```bash
   mkdir -p /tmp/router-poc-claude-cwd && cd /tmp/router-poc-claude-cwd
   cp /Users/lunaxislu/Documents/ai-orchestration/spikes/mcp-http-router-poc/config-samples/claude-mcp.json.sample ./.mcp.json
   claude
   ```
2. Inside the session, confirm the tools:
   ```
   /mcp           # should list router_poc with ask_codex, reply_to_router, poll_inbox
   ```

Claude Code recognises `type: "http"` as streamable HTTP transport since 2.x.

---

## Verification matrix

For each candidate **server → client push** mechanism, the question is: *does a relay sent via this candidate actually surface in the receiving agent's transcript or model context so that the agent can read the `reply_id` and call `reply_to_router`?*

Run each test from a freshly-started pair of sessions (terminal C1: `codex`, terminal C2: `claude`). Both sessions must show `router_poc` under `/mcp`.

| Test | Driver | Step | Expected pass criterion |
|---|---|---|---|
| **T1. Codex → Claude via push** | codex transcript | Ask codex to call `ask_claude("ping reply-id test")` | claude transcript shows the relay (via any candidate) and replies with `reply_to_router`, codex `ask_claude` returns the reply |
| **T2. Claude → Codex via push** | claude transcript | Ask claude to call `ask_codex("ping reply-id test")` | mirror of T1 |
| **T3. Codex → Claude via poll** | codex+claude | Codex calls `ask_claude("inbox test")`, then claude is asked to run `poll_inbox` and `reply_to_router` | reply round-trips even when no push surfaced |
| **T4. Claude → Codex via poll** | claude+codex | mirror of T3 | |
| **T5. Diagnostic visibility** | curl | `curl /debug/events` after each test | see ordered records of `pending_created`, `push_attempt`, `reply_received`, `ask_resolved`. Each push candidate records `ok`/`error` so you can read which mechanism the receiving CLI actually accepted. |

Record outcomes in the table below as you verify.

---

## Result log (fill in as you run)

| Test | Outcome | Notes (which candidate surfaced, error messages, etc.) |
|---|---|---|
| T1 | ☐ pass / ☐ fail | |
| T2 | ☐ pass / ☐ fail | |
| T3 | ☐ pass / ☐ fail | |
| T4 | ☐ pass / ☐ fail | |
| T5 | ☐ pass / ☐ fail | |

### Per-candidate push observations

| Candidate | codex 0.130.0 | claude 2.1.140 |
|---|---|---|
| `sampling/createMessage` | | |
| `elicitation/elicit` | | |
| `notifications/message` | | |
| `inbox` + `poll_inbox` | | |

Mark each cell: **transcript** (visible in user-facing transcript), **context-only** (model received but not visible), **error** (record the error message), **n/a** (unsupported by CLI).

---

## Honest expectations (before running)

This PoC exists to **falsify or confirm** four hypotheses, in order of decreasing optimism:

1. **Sampling** — server calls `createMessage()` on the target session and gets a reply back without the user noticing. **Risk:** both codex 0.130 and claude 2.x may decline `sampling/createMessage` from an MCP server, returning `method not found`. If declined, the candidate is marked unsupported for that CLI in the per-candidate table.
2. **Elicitation** — server triggers `elicitInput()` which forces the CLI to prompt the user (typed reply) or the model (structured response). **Risk:** unsupported in many CLIs; even where supported, this is user-interactive, not autonomous.
3. **Logging notification** — `notifications/message` with relay text. **Risk:** most CLIs route this to stderr / a hidden debug pane, not into the model context.
4. **Inbox + `poll_inbox`** — guaranteed-correct fallback. Agent must voluntarily poll, so this only works inside a single turn that is explicitly instructed (e.g. user types "check your inbox" or the MCP server instructions are obeyed).

If **only** candidate 4 works in practice, the conclusion is: **MCP transport alone cannot replace the shared codex app-server `turn/start` injection** that the current `bridge/` uses for surfacing reverse traffic in the Codex UI transcript. The router-only design is then **not** a viable simplification for the user-facing reverse path.

If candidate 1 or 2 works at least one direction, the central router design becomes a real candidate to pursue — and a follow-up plan should be written.

---

## Decision — Step 5 vs pivot

After filling in the result log, choose one of:

- **Continue refactor.md Step 5** if the PoC failed candidates 1–3 and only `poll_inbox` worked. In that case the bridge's in-band `[MCP RELAY]` + `turn/start` injection remains the only viable surface for reverse traffic, and the central-router pivot would not actually simplify the system.
- **Pivot** if at least one of sampling / elicitation surfaced in **both** CLIs and a small follow-up confirmed UI transcript visibility. In that case write a new plan to absorb `bridge/` + `claude-adapter/` into a central daemon.

Either decision should be recorded in `history/` as a one-page write-up that references this PoC's commit and the contents of the result log above.

---

## Cleanup

```bash
# stop server
Ctrl-C in the npm start terminal

# discard temp cwd
rm -rf /tmp/router-poc-codex-cwd /tmp/router-poc-claude-cwd

# remove the appended ~/.codex/config.toml entry once you are done
```
