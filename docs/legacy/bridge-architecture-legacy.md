# Bridge Architecture and Investigation Log - Legacy

This document is the high-context record of the Codex CLI / app-server / bridge investigation performed in this project.

It is written so another AI can reconstruct the environment, the verified behavior, the mistakes we hit, and the final design constraints without re-running the entire conversation.

## Status

This file is kept as legacy context only.

The current active architecture uses a Codex MCP bridge plus `claude-adapter`, and no longer depends on Codex app-server WS relay.

## Executive Summary

We verified that:

- `codex app-server --listen ws://127.0.0.1:4500` starts a WebSocket app-server process.
- `codex --remote ws://127.0.0.1:4500` attaches a Codex CLI UI client to that app-server.
- A third process can connect to the same app-server as an independent WebSocket client.
- `thread/start`, `thread/resume`, `turn/start`, and `turn/steer` work against that app-server.
- The app-server thread identity is the key shared identifier.
- The CLI `Session:` value is not the same as the app-server `thread.id`.
- JSONL session files under `~/.codex/sessions/.../rollout-*.jsonl` are append-only logs that can be tailed in real time.

The important architectural conclusion:

- Multiple clients can share one app-server.
- They do not automatically share a visible UI state.
- They only participate in the same conversation if they use the same `threadId`.

## Environment

- Working directory: `/Users/lunaxislu/Documents/ai-orchestration`
- Platform: macOS, local terminal sessions
- CLI binary: `codex`
- CLI version observed in output: `0.118.0`
- WebSocket listener used for testing: `ws://127.0.0.1:4500`

## What We Confirmed From the CLI

The local CLI help shows:

- `codex app-server` is an experimental app-server mode.
- `codex app-server --listen stdio://` is the default transport.
- `codex app-server --listen ws://IP:PORT` is supported.
- `codex --remote ws://host:port` exists and attaches the UI to a remote app-server WebSocket endpoint.
- `codex resume` and `codex fork` accept a `SESSION_ID`.
- `codex debug app-server send-message-v2` exists and is a server-debug helper.

This means:

- The app-server is not hidden inside the TUI only.
- There is a separate app-server mode with its own transport.
- The CLI can connect to remote app-server instances.

## Protocol Model

The app-server uses a JSON-RPC-like request/notification model over the selected transport.

Key request types we used:

- `initialize`
- `initialized`
- `thread/start`
- `thread/resume`
- `turn/start`
- `turn/steer`

Key notifications observed:

- `thread/started`
- `thread/status/changed`
- `turn/started`
- `item/started`
- `item/completed`
- `item/agentMessage/delta`
- `turn/completed`
- `thread/tokenUsage/updated`
- `account/rateLimits/updated`

## Verified Sequence

The successful base sequence was:

1. Connect to the app-server.
2. Send `initialize`.
3. Receive initialize response with `userAgent`, `codexHome`, `platformFamily`, `platformOs`.
4. Send `initialized`.
5. Send `thread/start`.
6. Receive a `thread.id`.
7. Send `turn/start` on that same `thread.id`.
8. Observe the turn enter `inProgress`.
9. Observe output events and `turn/completed`.

We also verified:

- `thread/resume` works for an already-created thread.
- `turn/start` on a resumed thread uses that same thread identity.
- `turn/steer` is constrained to the active turn and needs `expectedTurnId`.

## Thread Identity Rules

This is the main rule set that mattered for the old bridge.

- `thread.id` is the shared conversation key.
- `Session:` is a CLI-level identifier, not the app-server conversation key.
- Same `thread.id` across clients means same app-server thread.
- Different `thread.id` values mean separate conversations.
- `thread/resume` reopens the exact thread passed in.
- `thread/resume` does not merge conversations.
- `thread/resume` does not move history from one thread into another.
- `turn/start` appends a new turn to the addressed thread.
- `turn/steer` appends to the active in-flight turn only.

Implication:

- If a bridge and the UI are not using the same `thread.id`, they are not collaborating on the same conversation.

## Important Distinction: Server Shared, UI Not Shared

The same app-server can be shared by:

- the Codex UI client
- the bridge client
- potentially other clients

But that does not mean all clients visually merge their state.

Each client has:

- its own connection
- its own local notion of what it is displaying
- its own active subscription state

The shared object is the app-server thread, not the terminal window.

## What Happened During Verification

### 1. We created a thread from the server

The app-server returned a thread object that included:

- `id`
- `preview`
- `ephemeral`
- `modelProvider`
- timestamps
- `status`
- `path`
- `cwd`
- `cliVersion`
- `source`
- `gitInfo`
- `turns`

That response confirmed that the app-server persists sessions to JSONL files.

### 2. We started a turn

The `turn/start` response returned a new `turn.id` and `status: inProgress`.

The server also emitted:

- `thread/status/changed`
- `turn/started`
- `item/started` for the user message
- `item/completed` for the user message
- reasoning and agent message events
- `turn/completed`

This showed that the server was not just returning a static RPC result. It was also streaming runtime state changes.

### 3. We tailed the JSONL file

The file under `~/.codex/sessions/.../rollout-*.jsonl` contained appended records such as:

- user message records
- token count events
- reasoning records
- assistant/agent message records
- task completion records

This proved that the session file was a live append-only record of the session activity.

### 4. We connected a bridge client

We used a separate WebSocket client to:

- `initialize`
- `initialized`
- `thread/resume`
- `turn/start`

The bridge successfully resumed the thread and started a turn.

### 5. We noticed the model mismatch

The bridge resumed a thread that had already been created by a debug helper and that thread was already associated with `gpt-5.4-mini`.

That meant:

- `thread/resume` preserved the existing thread state.
- The resumed thread did not automatically switch to `gpt-5.4`.
- If you want a different model, you need a new thread or a thread created with the desired model settings.

## Exact Failure Modes We Hit

### A. JSON pasted into zsh

Failure:

- Directly pasting JSON into the shell produced `command not found` errors.

Cause:

- JSON-RPC payloads are not shell commands.

Fix:

- Use a WS client process or a CLI debug command.

### B. Heredoc not closed correctly

Failure:

- A heredoc left the shell waiting at `heredoc>` prompt.

Cause:

- The closing marker line was not supplied correctly.

Fix:

- Use a single-line command or close the heredoc with the exact terminator.

### C. The wrong client library path

Failure:

- We tried a `ws` package example first, which implied an install step.

Cause:

- That package was not built into Node.

Fix:

- Use the built-in `WebSocket` in Node 24, or use the CLI debug command.

### D. Model confusion from a resumed thread

Failure:

- A resumed thread displayed `gpt-5.4-mini` even though we were expecting `gpt-5.4`.

Cause:

- The resumed thread already existed with its own model state.

Fix:

- Create a new thread with the desired model or set the model at creation time.

## What This Taught Us

These findings were the reason the architecture changed.

The original plan assumed the bridge could coordinate with the Codex UI by sharing app-server threads.
That turned out to be too brittle for the current scope:

- the bridge could create or resume threads, but the UI had to be on the same thread to see the same conversation
- thread identity had to be passed around manually
- the trigger only worked when the bridge was watching the exact conversation that produced the text

Once the MCP tool approach was adopted, the app-server-specific threading requirements were no longer part of the active architecture.

## What Will Not Work

- Starting a new thread in the bridge and expecting the UI to automatically follow that thread without resuming it.
- Resuming a different thread and expecting it to affect the current UI conversation.
- Using only `Session:` as the shared key between the CLI and the bridge.
- Calling `turn/steer` after the turn had already completed.
