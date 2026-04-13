# App Server Notes - Legacy

This document summarizes the Codex app-server behavior that was verified in this project.

## Status

This file is kept as a legacy reference only.

The bridge architecture used in the current scope no longer depends on Codex app-server WebSocket thread sharing.  
It remains here because the investigation that led to the MCP-based bridge was built on top of these findings.

## What Ran Where

- `codex app-server --listen ws://127.0.0.1:4500` started the app-server process.
- `codex --remote ws://127.0.0.1:4500` connected a Codex CLI UI client to that server.
- A bridge client could connect as a separate WebSocket client to the same server.

## Transport

- Default transport was `stdio`.
- WebSocket transport was enabled with `--listen ws://IP:PORT`.
- The server accepted multiple clients on the same listener.

## Verified Flow

The minimal successful flow we observed was:

1. `initialize`
2. `initialized`
3. `thread/start`
4. `turn/start`
5. Optional `turn/steer` while the turn was still active

## Thread and Turn Rules

- `thread/start` created a new thread and returned a `thread.id`.
- `thread/resume` reopened an existing thread by `threadId`.
- `turn/start` started a new turn in the target thread.
- `turn/steer` appended user input to the active in-flight turn.
- `turn/steer` required `expectedTurnId` to match the active turn.
- `turn/steer` failed if there was no active turn.

## Thread Equality Was Mandatory

For any bridge or UI handoff, the `threadId` had to be the same on every client that was meant to participate in the same conversation.

- Same `threadId` across clients meant the clients were addressing the same app-server thread.
- Different `threadId` values meant separate conversations, even if they were connected to the same app-server process.
- `thread/resume` did not merge threads.
- `thread/resume` did not move data from one thread into another thread.
- `thread/resume` only reopened the exact thread identified by the `threadId` you passed in.

This was the main rule that made the old bridge work:

1. The bridge had to resume the same `threadId` the UI was using, or
2. The UI had to resume the same `threadId` the bridge created.

If that condition was not true, the two clients were not sharing the same conversation state.

## Important Identity Rules

- The app-server `thread.id` was the identifier the bridge used.
- The CLI `Session:` value was not the same thing as an app-server `thread.id`.
- Reusing `threadId` across clients meant they were talking about the same app-server thread.
- A CLI session could exist without exposing a usable app-server thread to other clients unless they shared the same `thread.id`.

## Model Behavior

- `thread/resume` did not change the model of an existing thread.
- If a thread was created with `gpt-5.4-mini`, resuming it kept that thread on the existing model state.
- To use a different model, a new thread had to be started with `thread/start` and the desired model settings.

## Debug Helper

The CLI included a debug helper:

```bash
codex debug app-server send-message-v2 "ping"
```

This was useful as a smoke test for the app-server protocol, but it did not resume an arbitrary existing thread.

## JSONL Session Log

- App-server / Codex sessions appended to JSONL files under `~/.codex/sessions/...`.
- The file could be tailed in real time.
- This was a persisted event log, not a live socket stream.

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
