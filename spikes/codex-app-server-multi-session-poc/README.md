# Codex App-Server Multi Session PoC

Purpose: verify whether one `codex app-server` can serve multiple Codex UI
sessions/threads well enough for `aiox` to eventually share a daemon-level
Codex app-server.

This is pre-MVP validation only. MVP can still use one app-server per
pair/session even if this succeeds.

## What This Tests

- WebSocket connection to `codex app-server`.
- `initialize` JSON-RPC handshake.
- `thread/loaded/list` discovery.
- `turn/start` injection into a specific loaded thread.
- Whether multiple `codex --remote` sessions appear as distinct loaded thread
  ids on the same app-server.

## Start The App-Server

Terminal A:

```bash
codex app-server --listen ws://127.0.0.1:4500
```

## Attach One Or More Codex UIs

Terminal B:

```bash
codex --remote ws://127.0.0.1:4500
```

Terminal C, for the multi-session check:

```bash
codex --remote ws://127.0.0.1:4500
```

Make sure each UI reaches an interactive Codex session.

## Inspect Loaded Threads

From the repo root:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/client.ts inspect
```

Expected output shape:

```json
{
  "url": "ws://127.0.0.1:4500",
  "loadedThreadCount": 2,
  "threads": [
    { "index": 0, "threadId": "..." },
    { "index": 1, "threadId": "..." }
  ]
}
```

## Send To A Specific Thread

Use a thread id from `inspect`:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/client.ts send \
  --thread-id=<thread-id> \
  --text='AIOX PROBE: reply with the thread/session you received this in.'
```

The addressed Codex UI should receive the turn.

## Decision Matrix

Shared app-server looks viable if:

- Two remote Codex UIs attached to one app-server show two distinct loaded
  thread ids.
- `turn/start` sent to thread A appears only in UI A.
- `turn/start` sent to thread B appears only in UI B.

Use per-session app-server for MVP if:

- `thread/loaded/list` only shows one thread despite multiple UIs.
- Thread ids are distinct but routing a turn is unreliable.
- The API lacks enough metadata to map a human-visible agent name to the right
  loaded thread.

## Commands Used By The Client

- `initialize`
- `thread/loaded/list`
- `turn/start`

The loaded list response schema currently only exposes thread ids, so this PoC
focuses on whether thread ids are stable and addressable.

## Record App-Server Events

Use `event-recorder.ts` when investigating TUI-originated lifecycle changes such
as `/clear`, `/new`, and fork:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/event-recorder.ts \
  --url=ws://127.0.0.1:4500 \
  --out=/private/tmp/aiox-codex-events.jsonl \
  --duration-ms=120000 \
  --poll-ms=1000
```

It records all JSON-RPC notifications and periodic `thread/loaded/list` results
as JSONL. Summarize the relevant event sequence in `history/`; do not commit
large raw runtime logs.

## Run An In-Band Proxy Spike

Use `inband-proxy.ts` to check whether a Codex TUI command is visible as a
same-connection request/response through a per-agent proxy:

```bash
codex app-server --listen ws://127.0.0.1:4515

pnpm tsx spikes/codex-app-server-multi-session-poc/inband-proxy.ts \
  --upstream=ws://127.0.0.1:4515 \
  --listen-port=4520 \
  --out=/private/tmp/aiox-codex-inband-proxy-events.jsonl

codex --remote ws://127.0.0.1:4520 --no-alt-screen
```

The proxy is transparent by default. It records JSON-RPC frames and emits a
`binding_candidate` only when a `thread/start`, `thread/fork`, or
`thread/resume` response on the same connection contains a returned thread id.
Broadcast `thread/started` notifications are not binding authority.
