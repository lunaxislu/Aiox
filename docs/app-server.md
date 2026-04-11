# App Server Notes

This document summarizes the Codex app-server behavior that was verified in this project.

## What Runs Where

- `codex app-server --listen ws://127.0.0.1:4500` starts the app-server process.
- `codex --remote ws://127.0.0.1:4500` connects a Codex CLI UI client to that server.
- A bridge can connect as a separate WebSocket client to the same server.

## Transport

- Default transport is `stdio`.
- WebSocket transport is enabled with `--listen ws://IP:PORT`.
- The server accepts multiple clients on the same listener.

## Verified Flow

The minimal successful flow we observed was:

1. `initialize`
2. `initialized`
3. `thread/start`
4. `turn/start`
5. Optional `turn/steer` while the turn is still active

## Thread and Turn Rules

- `thread/start` creates a new thread and returns a `thread.id`.
- `thread/resume` reopens an existing thread by `threadId`.
- `turn/start` starts a new turn in the target thread.
- `turn/steer` appends user input to the active in-flight turn.
- `turn/steer` requires `expectedTurnId` to match the active turn.
- `turn/steer` fails if there is no active turn.

## Thread Equality Is Mandatory

For any bridge or UI handoff, the `threadId` must be the same on every client that is meant to participate in the same conversation.

- Same `threadId` across clients means the clients are addressing the same app-server thread.
- Different `threadId` values mean separate conversations, even if they are connected to the same app-server process.
- `thread/resume` does not merge threads.
- `thread/resume` does not move data from one thread into another thread.
- `thread/resume` only reopens the exact thread identified by the `threadId` you pass in.

This is the main rule that makes the bridge work:

1. The bridge must resume the same `threadId` the UI is using, or
2. The UI must resume the same `threadId` the bridge created.

If that condition is not true, the two clients are not sharing the same conversation state.

## Important Identity Rules

- The app-server `thread.id` is the identifier the bridge must use.
- The CLI `Session:` value is not the same thing as an app-server `thread.id`.
- Reusing `threadId` across clients means they are talking about the same app-server thread.
- A CLI session can exist without exposing a usable app-server thread to other clients unless they share the same `thread.id`.

## Model Behavior

- `thread/resume` does not change the model of an existing thread.
- If a thread was created with `gpt-5.4-mini`, resuming it keeps that thread on the existing model state.
- To use a different model, start a new thread with `thread/start` and the desired model settings.

## Debug Helper

The CLI includes a debug helper:

```bash
codex debug app-server send-message-v2 "ping"
```

This is useful as a smoke test for the app-server protocol, but it does not resume an arbitrary existing thread.

## JSONL Session Log

- App-server / Codex sessions append to JSONL files under `~/.codex/sessions/...`.
- The file can be tailed in real time.
- This is a persisted event log, not a live socket stream.

## Practical Use

For a bridge:

1. Connect to the same WebSocket app-server.
2. Send `initialize`.
3. Send `initialized`.
4. Create or resume the target thread.
5. Send `turn/start`.
6. Use `turn/steer` only while the turn is still active.

## What Will Not Work

- Starting a new thread in the bridge and expecting the UI to automatically follow that thread without resuming it.
- Resuming a different thread and expecting it to affect the current UI conversation.
- Using only `Session:` as the shared key between the CLI and the bridge.
- Calling `turn/steer` after the turn has already completed.
