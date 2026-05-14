# Session Bridge Notes - Legacy

This document records the investigation into how a bridge could connect Codex CLI, the app-server, and another agent system.

## Status

This file is kept as legacy context only.

As of 2026-04-29, the old JSONL tail + trigger/stream relay architecture is not active.
As of 2026-04-29, the bridge runs as a Codex MCP tool server and talks to `claude-adapter` through HTTP.
The Claude -> Codex reverse path still uses shared Codex app-server WS for prompt injection via `thread/loaded/list` and `turn/start`.

## Original Goal

The original goal was to build a bridge with this shape:

```text
Codex CLI session
  -> JSONL append under ~/.codex/sessions/...
  -> tail -f
  -> bridge detects agentMessage
  -> relay to Claude Code channels
  -> Claude Code responds
  -> bridge injects back into Codex through app-server
  -> Codex CLI UI shows the response
```

## What Was Verified

- A Codex CLI session writes to `~/.codex/sessions/.../rollout-*.jsonl`.
- The JSONL file is appended as the session runs.
- `tail -f` on that file shows the session events in near real time.
- A separate WebSocket client can connect to the same `codex app-server`.
- `thread/start` and `turn/start` work on that server.
- `thread/resume` works when given an existing app-server `threadId`.
- The bridge and the UI can share the same app-server process.
- The bridge and the UI only behave as one conversation when they use the same `threadId`.

## What Was Confusing

### `Session:` vs `thread.id`

- `Session:` is the CLI session identifier.
- `thread.id` is the app-server thread identifier.
- The bridge had to use `thread.id` for `thread/resume` and `turn/start`.

### UI vs Server

- `codex --remote ws://127.0.0.1:4500` is a UI client.
- The UI client connects to the app-server, but it is still only one client.
- Another bridge client can connect to the same server.
- Shared server does not automatically mean shared visible UI state unless both clients are on the same thread.
- The same app-server is necessary, but not sufficient.
- The shared unit that matters is the `threadId`.
- If the UI and bridge do not agree on the same `threadId`, they are isolated conversations even though they hit the same server.

### Resuming a Thread Does Not Change Its Model

- Resuming an existing thread keeps that thread's current model state.
- When we resumed a thread that had already been created by a debug helper, it remained on the model state already associated with that thread.
- That is why `gpt-5.4-mini` appeared even though a later call expected `gpt-5.4`.

## Confirmed Architecture

```text
Terminal 1
  codex app-server --listen ws://127.0.0.1:4500
        |
        | WebSocket server
        v
  app-server process
        |
        +-- thread/start / thread/resume / turn/start / turn/steer
        |
        +-- events: thread/started, turn/started, item/*, turn/completed

Terminal 2
  codex --remote ws://127.0.0.1:4500
        |
        | UI client
        v
  same app-server

Terminal 3
  bridge client
        |
        | WebSocket client
        v
  same app-server
        |
        +-- initialize
        +-- thread/resume <threadId>
        +-- turn/start <same threadId>
```

## Event and Log Flow

```text
Codex CLI
  -> writes event JSONL
  -> ~/.codex/sessions/.../rollout-*.jsonl
  -> tail -f
  -> bridge sees event
  -> relay to Claude Code
  -> bridge sends app-server turn/start
  -> app-server emits thread/turn/item events
  -> Codex UI shows the response if it is attached to the same thread
```

## Commands That Were Useful

### Start the app-server

```bash
codex app-server --listen ws://127.0.0.1:4500
```

### Connect the UI

```bash
codex --remote ws://127.0.0.1:4500
```

### Smoke test the server

```bash
codex debug app-server send-message-v2 "ping"
```

## Pitfalls

- Running JSON directly in `zsh` does not work; the bridge must be a WS client.
- A heredoc must be closed correctly if using `node` or `python`.
- A new `thread/start` creates a fresh thread, but `thread/resume` reopens an existing one.
- `turn/steer` only works while a turn is active.
- The UI does not automatically mirror every external thread unless it is attached to that thread.

## Current Best Understanding

- The app-server was a shared hub for the old architecture.
- Multiple CLI clients could connect to the same server.
- `threadId` was the real shared conversation key.
- The bridge could inject messages into the same thread, but only if it used the correct `threadId`.
- The persisted JSONL log was good for detection and replay, but it was not itself the live UI channel.
- `Session:` was not sufficient for inter-process coordination.
- The bridge architecture only worked when the UI and bridge converged on one exact `threadId`.
