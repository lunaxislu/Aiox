# Step 10 Spike: Per-Agent App-Server Resume/Rebind

Date: 2026-05-20

## Context

Authority predecessor: `history/31-step-10-per-agent-app-server-runtime.history.md`.

Question: with the current Step 10 production topology, one Codex app-server per
Codex agent, how do `/clear`, `/new`, `/fork`, and `codex resume <thread-id>`
change the active Codex thread id?

This spike verifies whether `agents.adapter_session_id = last-known active
Codex thread id` is only durable binding metadata or can also support a future
resume/restart contract.

## Setup

Codex CLI version observed in app-server frames: `0.131.0`.

Started a per-agent app-server with an OS-assigned port:

```bash
codex app-server --listen ws://127.0.0.1:0
```

Observed assigned endpoint:

```text
ws://127.0.0.1:59569
```

Used the existing transparent in-band proxy only as an observation tool:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/inband-proxy.ts \
  --upstream=ws://127.0.0.1:59569 \
  --listen-port=0 \
  --out=/private/tmp/aiox-step10-resume-spike-proxy.jsonl
```

Proxy endpoint:

```text
ws://127.0.0.1:59578
```

The proxy forwards frames unchanged and records client/app-server JSON-RPC
frames. Production Step 10 remains per-agent app-server; this is not reviving
the proxy production design.

## Results

### 1. Initial attach

Command:

```bash
codex --remote ws://127.0.0.1:59578 --no-alt-screen
```

Observed:

```text
client -> server: thread/start id=4
server -> client: thread id 019e444a-d495-7011-a097-e48acbb17539
server -> client: thread/started for same id
```

Decision consequence: initial attach binding authority is the same-client
`thread/start` response. `thread/started` is corroborating context, not the
binding authority.

### 2. `/clear`

Observed:

```text
client -> server: thread/start id=8 sessionStartSource="clear"
server -> client: thread id 019e444b-136d-7141-9f23-74b4793fee58
```

Decision consequence: `/clear` rebinds only when the same-client
`thread/start` response returns a new thread id.

### 3. `/new`

Observed:

```text
client -> server: thread/start id=14 sessionStartSource=null
server -> client: thread id 019e444b-5637-7d81-85d7-01a5502ecfa3
```

Decision consequence: `/new` rebinds only when the same-client `thread/start`
response returns a new thread id.

### 4. `/fork` on an empty thread

Observed:

```text
client -> server: thread/fork threadId=019e444b-5637-7d81-85d7-01a5502ecfa3
server -> client: error -32600 "no rollout found for thread id ..."
```

Decision consequence: empty-thread `/fork` remains an expected no-rebind error.
Keep the existing active thread id. Do not infer a binding from notifications.

### 5. Completed-turn baseline

Sent one minimal prompt:

```text
Reply exactly OK.
```

Observed:

```text
client -> server: turn/start threadId=019e444c-0789-7252-ac6b-7b9e9596b622
server -> client: turn/completed status="completed"
```

This produced a real rollout-backed thread suitable for `/fork` and resume
verification.

### 6. `/fork` after a completed turn

Observed:

```text
client -> server: thread/fork threadId=019e444c-0789-7252-ac6b-7b9e9596b622
server -> client: thread id 019e444c-ad6a-7f91-bd25-d257717e8729
                  forkedFromId 019e444c-0789-7252-ac6b-7b9e9596b622
server -> client: thread/started for same new id
```

Decision consequence: `/fork` rebinds when the same-client `thread/fork`
response returns a new thread id and `forkedFromId` equals the previously active
thread id.

### 7. `codex resume` on an empty thread

Command:

```bash
codex resume 019e444b-5637-7d81-85d7-01a5502ecfa3 \
  --remote ws://127.0.0.1:59578 \
  --no-alt-screen
```

Observed CLI failure:

```text
Error: Failed to resume session from
/Users/lunaxislu/.codex/sessions/2026/05/20/rollout-2026-05-20T16-30-48-019e444b-5637-7d81-85d7-01a5502ecfa3.jsonl
```

Decision consequence: an empty thread id is not proven as a usable resume
contract. Treat resume failure as binding uncertainty and do not create a new
binding silently.

### 8. `codex resume` on the same app-server

Command:

```bash
codex resume 019e444c-ad6a-7f91-bd25-d257717e8729 \
  --remote ws://127.0.0.1:59578 \
  --no-alt-screen
```

Observed:

```text
client -> server: thread/read threadId=019e444c-ad6a-7f91-bd25-d257717e8729
server -> client: thread status idle
client -> server: thread/resume threadId=019e444c-ad6a-7f91-bd25-d257717e8729
server -> client: same thread id with completed turn history
```

Decision consequence: CLI resume uses the app-server `thread/resume` method.
For a rollout-backed thread, the active binding can be confirmed from the
same-client `thread/resume` response.

### 9. `codex resume` on a new app-server process

Started a second app-server with an OS-assigned port:

```text
ws://127.0.0.1:59760
```

Observation proxy:

```text
ws://127.0.0.1:59767
```

Command:

```bash
codex resume 019e444c-ad6a-7f91-bd25-d257717e8729 \
  --remote ws://127.0.0.1:59767 \
  --no-alt-screen
```

Observed:

```text
client -> server: thread/read threadId=019e444c-ad6a-7f91-bd25-d257717e8729
server -> client: same thread id status notLoaded
client -> server: thread/resume threadId=019e444c-ad6a-7f91-bd25-d257717e8729
server -> client: same thread id status idle with completed turn history
```

Decision consequence: a new app-server process can resume a rollout-backed
thread id from disk. The endpoint remains process-lifetime runtime metadata, but
the thread id is durable across app-server process replacement when the rollout
exists.

### 10. `/clear` after a completed turn

Follow-up verification after the earlier usage-limit blocker.

Started a fresh app-server and observation proxy:

```text
app-server: ws://127.0.0.1:59969
proxy:      ws://127.0.0.1:59977
```

Created a completed-turn baseline:

```text
client -> server: thread/start id=4
server -> client: thread id 019e4456-6741-7fa1-835e-96b5aaf67e0b
client -> server: turn/start threadId=019e4456-6741-7fa1-835e-96b5aaf67e0b
server -> client: turn/completed status="completed"
```

Then ran `/clear` in the same TUI client.

Observed:

```text
client -> server: thread/start id=9 sessionStartSource="clear"
server -> client: thread id 019e4457-3ca6-7841-8d05-5565d18c292c
server -> client: thread/started for same id
```

Decision consequence: completed-turn `/clear` follows the same binding rule as
empty-thread `/clear`. Rebind only from the same-client `thread/start` success
response that returns the new thread id.

### 11. `/new` after a completed turn

Created a second completed-turn baseline on the post-`/clear` thread:

```text
client -> server: turn/start threadId=019e4457-3ca6-7841-8d05-5565d18c292c
server -> client: turn/completed status="completed"
```

Then ran `/new` in the same TUI client.

Observed:

```text
client -> server: thread/start id=16 sessionStartSource=null
server -> client: thread id 019e4457-ff8d-7042-9a95-188e17736967
server -> client: thread/started for same id
```

Decision consequence: completed-turn `/new` follows the same binding rule as
empty-thread `/new`. Rebind only from the same-client `thread/start` success
response that returns the new thread id.

### 12. `turn/start` immediately after `thread/resume` on a new app-server process

Started a fresh app-server A and observation proxy to create a rollout-backed
thread:

```text
app-server A: ws://127.0.0.1:60286
proxy A:      ws://127.0.0.1:60295
```

Created a completed-turn baseline:

```text
client -> server: thread/start id=2
server -> client: thread id 019e4460-7c75-7282-8b44-75410c813873
client -> server: turn/start threadId=019e4460-7c75-7282-8b44-75410c813873
server -> client: turn/completed status="completed"
```

Then stopped app-server A, started a fresh app-server B and observation proxy,
and used one WebSocket client to issue `thread/read`, `thread/resume`, and a new
`turn/start`:

```text
app-server B: ws://127.0.0.1:60334
proxy B:      ws://127.0.0.1:60341
```

Observed:

```text
client -> server: thread/read threadId=019e4460-7c75-7282-8b44-75410c813873
server -> client: same thread id status notLoaded

client -> server: thread/resume threadId=019e4460-7c75-7282-8b44-75410c813873
server -> client: same thread id status idle with completed turn history

client -> server: turn/start
                  threadId=019e4460-7c75-7282-8b44-75410c813873
                  input=[{ type: "text", text: "Reply exactly OK2." }]
server -> client: turn id 019e4461-1fd8-70e2-9947-cdfaf9d854e5
                  status="inProgress"
server -> client: turn/completed
                  threadId=019e4460-7c75-7282-8b44-75410c813873
                  turn id 019e4461-1fd8-70e2-9947-cdfaf9d854e5
                  status="completed"
```

No thread-context fields beyond `threadId` and `input` were present in the
`turn/start` request. In particular, the client did not send
`previousResponseId`, `parentTurnId`, or rollout offset metadata.

Decision consequence: after process replacement, `thread/resume` success on a
rollout-backed thread is sufficient protocol validation to immediately proceed
with same-client `turn/start` injection against the same thread id. The active
binding does not rebind during this injection path.

## Decision Update

`agents.adapter_session_id` should store the last-known active Codex thread id
as a single string.

It is now stronger than a pure placeholder: it is durable binding metadata and
validated future resume input for rollout-backed threads. It is still not an
automatic daemon-restart resume contract for MVP.

MVP policy:

- Persist only the active Codex thread id in `adapter_session_id`.
- Keep app-server endpoint, pid/process handles, WebSocket connection, health,
  readyz/heartbeat, and lifecycle state in memory only.
- On normal attach/start, bind from same-client `thread/start` success.
- On `/clear` and `/new`, rebind from same-client `thread/start` success.
- On `/fork`, rebind from same-client `thread/fork` success only when the new
  thread id is returned and `forkedFromId` matches the previously active thread
  id.
- On empty-thread `/fork` error, keep the old binding.
- On resume, bind from same-client `thread/resume` success where the returned
  thread id equals the requested thread id, then proceed with `turn/start` for
  injection against that same thread id.
- On resume failure, keep/discard according to lifecycle policy, but do not
  silently create a replacement binding.

## Open Follow-Up

Automatic daemon-restart resume remains a separate product/lifecycle decision.
This spike proves protocol feasibility for rollout-backed threads, not that MVP
should auto-resume disconnected agents after daemon restart.

Raw logs are in `/private/tmp` and should not be committed:

- `/private/tmp/aiox-step10-resume-spike-proxy.jsonl`
- `/private/tmp/aiox-step10-resume-spike-new-appserver-proxy.jsonl`
- `/private/tmp/aiox-step10-clear-new-completed-turn-proxy.jsonl`
- `/private/tmp/aiox-step10-resume-turn-after-proxy.jsonl`
