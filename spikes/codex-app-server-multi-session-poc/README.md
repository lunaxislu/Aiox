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

## MCP Presentation Spike

This is an isolated test of one narrower hypothesis: an external
`mcpServer/tool/call` with an inbound delivery envelope might create a native
`Called …` activity in the target Codex TUI, make that result model-visible,
and begin a grounded response. It does **not** claim those effects; observe
and record each one separately.

Start a fresh App Server with the controlled, successful fixture MCP tool:

```bash
codex app-server --listen ws://127.0.0.1:4501 \
  -c 'mcp_servers.aiox_inbound = { command = "pnpm", args = ["tsx", "spikes/codex-app-server-multi-session-poc/inbound-fixture.ts"] }'
```

Attach one TUI and start or resume a thread, then obtain its id with:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/client.ts \
  inspect --url=ws://127.0.0.1:4501
```

In a second terminal, record notifications before making the call:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/event-recorder.ts \
  --url=ws://127.0.0.1:4501 \
  --out=/private/tmp/aiox-mcp-presentation-events.jsonl \
  --duration-ms=120000
```

Call the fixture with an otherwise undisclosed marker:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/client.ts mcp-call \
  --url=ws://127.0.0.1:4501 \
  --thread-id=<thread-id> \
  --server=aiox_inbound \
  --tool=deliver_message \
  --arguments='{"deliveryId":"delivery-1","marker":"AIOX_MCP_PRESENTATION_MARKER"}'
```

Record four independent observations:

1. The tool RPC returned a successful fixture result.
2. The target TUI showed `Called aiox_inbound.deliver_message(...)`; expand it
   and record which argument/result fields are visible.
3. `thread/read` and the JSONL trace contain a persisted tool item and marker.
4. Without a user-authored `turn/start`, Codex begins a new turn and gives an
   answer grounded in `AIOX_MCP_PRESENTATION_MARKER`.

Failure at any one observation is not evidence for the others. Stop the
temporary App Server and remove the JSONL file after recording the distilled
result in the controlling work log.

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
as JSONL. Summarize the relevant event sequence in
`logs/workspace-reset/retained-provenance/2026-06-23-workspace-reset-codex-proxy-attribution-archive.md`; do not
commit large raw runtime logs.

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
