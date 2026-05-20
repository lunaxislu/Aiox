# Step 10 Codex Clear/New Rebind Spike

> **STATUS (2026-05-20)**: 이 문서의 per-agent in-band proxy spike와
> "Decision: Proxy Is Transparent Relay for All Frames" 결정은 validated spike
> record로 보존한다. 현재 Step 10 production 방향은 **Codex agent 1개당
> app-server 1개, port는 OS 자동 할당**이다. 권위:
> `history/31-step-10-per-agent-app-server-runtime.history.md`.
>
> 이 문서의 spike 데이터 (Codex `/clear`·`/new`·`/fork` 동작 관찰, port
> `:0` bind 확인, `thread/started`·`thread/fork` 시그널 매핑 등)는 Codex
> 프로토콜 이해와 fallback proxy 설계 근거로 보존됨.

Date: 2026-05-19

## Context

Step 10 depends on Open Product Issue #2: stable Codex thread UUID to `aiox`
agent name mapping.

Relevant authority:

- `prd/mvp/aiox-mvp-spec.md` Open Product Issue #2: `thread/loaded/list`
  exposes loaded Codex thread UUIDs, but MVP needs a stable mapping strategy.
- `prd/pre-validation/claude-codex-pre-validation.md`: a shared Codex
  app-server can expose multiple loaded threads and `turn/start` can target a
  thread id.
- OpenAI Codex app-server docs: `thread/start` creates a thread and emits
  `thread/started`; `thread/fork` creates a new thread id and returned threads
  include `forkedFromId`; `thread/loaded/list` lists thread ids currently
  loaded in memory; `thread/name/set` emits `thread/name/updated`.

User requirement refined during Phase A:

- Codex TUI-internal `/clear`, "New Chat", and fork flows must keep the same
  `aiox` agent name binding when attribution is safe.
- Treating those flows as unconditional disconnects is not acceptable UX.

## Spike Tooling

Added:

- `spikes/codex-app-server-multi-session-poc/event-recorder.ts`

Purpose:

- Connect a monitor WebSocket to Codex app-server.
- Record every JSON-RPC notification as JSONL.
- Poll `thread/loaded/list` periodically.
- Keep full runtime logs outside repo, then summarize relevant observations in
  this history document.

Command used:

```bash
codex app-server --listen ws://127.0.0.1:4511
pnpm tsx spikes/codex-app-server-multi-session-poc/event-recorder.ts \
  --url=ws://127.0.0.1:4511 \
  --out=/private/tmp/aiox-codex-clear-new-events.jsonl \
  --duration-ms=90000 \
  --poll-ms=1000
codex --remote ws://127.0.0.1:4511 --no-alt-screen
```

TUI actions:

1. Wait for baseline Codex TUI thread.
2. Submit `/clear`.
3. Submit `/new`.

## Observed Events

Baseline TUI attach produced:

```text
thread/started
  id:            019e407f-203f-7262-9791-ce678bdbfc75
  sessionId:     019e407f-203f-7262-9791-ce678bdbfc75
  forkedFromId:  null
  cwd:           /Users/lunaxislu/Documents/ai-orchestration
  source:        vscode
  threadSource:  user
  name:          null

loaded_threads:
  [019e407f-203f-7262-9791-ce678bdbfc75]
```

After TUI `/clear`:

```text
thread/started
  id:            019e407f-9f32-7d80-bee8-2ef889c798b2
  sessionId:     019e407f-9f32-7d80-bee8-2ef889c798b2
  forkedFromId:  null
  cwd:           /Users/lunaxislu/Documents/ai-orchestration
  source:        vscode
  threadSource:  user
  name:          null

loaded_threads:
  [
    019e407f-203f-7262-9791-ce678bdbfc75,
    019e407f-9f32-7d80-bee8-2ef889c798b2
  ]
```

No `thread/closed` notification was observed for the previous thread during the
recorded window.

After TUI `/new`:

```text
thread/started
  id:            019e4080-1297-7990-a48a-259c82414183
  sessionId:     019e4080-1297-7990-a48a-259c82414183
  forkedFromId:  null
  cwd:           /Users/lunaxislu/Documents/ai-orchestration
  source:        vscode
  threadSource:  user
  name:          null

loaded_threads:
  [
    019e407f-203f-7262-9791-ce678bdbfc75,
    019e407f-9f32-7d80-bee8-2ef889c798b2,
    019e4080-1297-7990-a48a-259c82414183
  ]
```

No `thread/closed` notification was observed for older threads during the
recorded window.

Prior mini-spike in the same session also confirmed:

- A separate monitor WebSocket receives `thread/started` emitted by operations
  performed on another WebSocket.
- `thread/fork` emits `thread/started` to the monitor.
- The forked thread included `forkedFromId` equal to the source thread id.

## Interpretation

Confirmed:

- TUI-internal `/clear` and `/new` are visible to a monitor connection as
  `thread/started`.
- The new thread fields available for policy are `id`, `sessionId`,
  `forkedFromId`, `cwd`, `source`, `threadSource`, `name`, and status metadata.
- For `/clear` and `/new`, `forkedFromId` was `null`, and `sessionId` equaled
  the new thread id.
- `thread/loaded/list` is append-like during this test: previous threads stayed
  loaded alongside the new active TUI thread.

Not confirmed yet:

- Whether there is a direct app-server field that identifies the client/TUI
  which created the new thread.
- Whether `sessionStartSource: "clear"` is exposed in any notification or
  persisted metadata for TUI-originated `/clear`.
- Whether `turn/start` sent to the latest thread after `/clear` or `/new`
  always lands in the same TUI.
- Multi-TUI negative case: whether two Codex TUIs on the same shared app-server
  can create ambiguous same-cwd `thread/started` events.

## Policy Impact

`loaded/list` diff alone is not enough. Because old threads remain loaded,
daemon logic cannot infer "old disappeared, one new appeared" for `/clear` or
`/new`.

Additional interpretation after reviewing the local `events.jsonl` follow-up
and the OpenAI Codex app-server docs:

- `thread/loaded/list` must not be treated as an active TUI/session list. It is
  an app-server memory list: the thread ids currently loaded in memory. A
  loaded thread id means "the app-server still has this thread in memory", not
  "there is currently an attached Codex TUI for this thread".
- Codex app-server has a separate unload lifecycle. `thread/unsubscribe`
  unsubscribes the current connection from a loaded thread; if that was the
  last subscriber, the server may unload the thread only after a no-subscriber
  inactivity grace period and then emit `thread/closed`.
- Therefore a Codex TUI exit does not imply immediate removal from
  `thread/loaded/list`. It is expected that an old thread can remain visible
  after `/clear`, `/new`, or even after the UI that used it has gone away.
- The follow-up `events.jsonl` started with three already-loaded thread ids,
  then added new `thread/started` events for attach, `/clear`, and `/new`.
  This should be interpreted as "more threads loaded in app-server memory",
  not as "more active Codex TUIs".
- The inverse is also important: absence from `thread/loaded/list` would mean
  the thread is no longer loaded, not necessarily that the original TUI binding
  was safely replaced by another thread. Loaded-list count changes are cache
  lifecycle signals, not binding signals.
- Aiox binding must therefore be event/metadata-driven, not loaded-list
  lifecycle-driven.

MVP should use event-driven binding:

1. Store `AgentInstance.adapter_session_id` as the current Codex thread id.
2. For a launched Codex TUI, keep a per-agent live binding context in memory:
   current thread id, cwd, app-server endpoint, launched process/session
   metadata, and last observed `thread/started`.
3. Rebind immediately when `thread/started.thread.forkedFromId` equals the
   current thread id.
4. For `/clear` and `/new`, rebind only under a stricter launched-context rule:
   the thread is observed after the known TUI launch, has the same cwd and
   app-server endpoint, and belongs to a binding context with no competing
   same-kind TUI candidate.
5. In a shared app-server with multiple ambiguous candidates, do not guess.
   Mark the agent as requiring explicit rebind or keep the previous binding
   until a stronger attribution signal exists.

## Follow-Up Attribution Candidates

Gemini investigation proposed two shared app-server attribution strategies that
use existing metadata. These are not final policy yet; they require local
verification before Step 10 Phase B.

### Candidate A: Unique CWD Pathing

`thread/started.thread.cwd` is present in observed spike logs. Aiox could launch
each Codex TUI from a unique per-agent symlink path that points at the real
project root. If `/clear` and `/new` preserve that symlink path in subsequent
`thread/started` events, shared app-server attribution can use `(app-server
endpoint, unique cwd)` without needing a direct TUI/client id.

Trade-off:

- Pros: robust if Codex preserves the symlink cwd; no Codex TUI change needed.
- Cons: unsafe if Codex canonicalizes cwd to realpath; may affect project-root,
  AGENTS.md, git, trust, or skill/config discovery behavior.
- Reversibility: high. This is adapter launch policy and can later be replaced
  with a direct metadata strategy.
- Deferrability: should not be deferred past Step 10 Phase B if shared
  app-server remains the target.

### Candidate B: Config-Injected Agent Nickname

Observed `thread/started` thread objects include `agentNickname` and
`agentRole`, currently `null` in local logs. Aiox can spike whether launching
Codex with config such as `-c agent.nickname=<name>` populates
`thread.agentNickname`, and whether that value persists across TUI `/clear` and
`/new`.

Trade-off:

- Pros: cleaner than path manipulation if it works for TUI-originated thread
  replacement.
- Cons: not yet verified; local logs currently show `agentNickname: null`.
- Reversibility: high. It is just launch config and metadata matching.
- Deferrability: easy to test before the CWD symlink spike.

Verification on 2026-05-20 with Codex CLI `v0.130.0`:

- Launched app-server:

```bash
codex app-server --listen ws://127.0.0.1:4512
```

- Recorded events:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/event-recorder.ts \
  --url=ws://127.0.0.1:4512 \
  --out=/private/tmp/aiox-codex-agent-nickname-events.jsonl \
  --duration-ms=70000 \
  --poll-ms=1000
```

- Launched a remote TUI with candidate config keys:

```bash
codex --remote ws://127.0.0.1:4512 --no-alt-screen \
  -c 'agent.nickname="aiox-codex-alpha"' \
  -c 'agentNickname="aiox-codex-alpha"' \
  -c 'agent.role="aiox-codex"'
```

Observed `thread/started` for the TUI attach:

```text
id:             019e40c2-0bc7-7123-9e18-7f79fba61d37
cwd:            /Users/lunaxislu/Documents/ai-orchestration
source:         vscode
threadSource:   user
agentNickname:  null
agentRole:      null
name:           null
```

Also verified direct app-server `thread/start` with `config` containing
`agent.nickname`, `agentNickname`, and nested `agent.nickname`/`agent.role`.
The returned thread was:

```text
id:             019e40c3-9117-7422-ae4e-35e617755bb7
threadSource:   user
agentNickname:  null
agentRole:      null
name:           null
```

Generated app-server TypeScript protocol (`codex app-server generate-ts`) says
`Thread.agentNickname` and `Thread.agentRole` are optional fields assigned to an
`AgentControl`-spawned sub-agent. OpenAI Codex config docs only expose
`agents.<name>.nickname_candidates` for spawned subagent display nicknames, not
a root TUI `agent.nickname` binding key.

Conclusion: config-injected nickname is not a viable root Codex TUI attribution
signal in `v0.130.0`. Do not use `thread.agentNickname` or `thread.agentRole`
for MVP shared app-server rebind policy unless a future Codex version exposes a
documented root-thread metadata key and the spike is repeated.

### Candidate A Verification: Unique CWD Pathing

Verification on 2026-05-20 with Codex CLI `v0.130.0`:

- Created two temporary symlink cwd paths pointing at the same repo root:
  - `/private/tmp/aiox-step10-cwd-spike-20260520/aiox-codex-alpha`
  - `/private/tmp/aiox-step10-cwd-spike-20260520/aiox-codex-beta`
- Launched one shared app-server:

```bash
codex app-server --listen ws://127.0.0.1:4513
```

- Recorded events:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/event-recorder.ts \
  --url=ws://127.0.0.1:4513 \
  --out=/private/tmp/aiox-codex-unique-cwd-events.jsonl \
  --duration-ms=180000 \
  --poll-ms=1000
```

Important negative result:

- Launching from a symlink cwd with shell `cd -L` was not enough. The TUI
  showed `~/Documents/ai-orchestration`, and `thread/started.thread.cwd` was
  the canonical repo path:

```text
id:   019e40c7-7969-71c0-8eec-14555eef4f7c
cwd:  /Users/lunaxislu/Documents/ai-orchestration
```

Positive result:

- Launching with Codex CLI `--cd <symlink>` preserved the symlink cwd in both
  the TUI and app-server `thread/started`:

```bash
codex --remote ws://127.0.0.1:4513 --no-alt-screen \
  --cd /private/tmp/aiox-step10-cwd-spike-20260520/aiox-codex-beta
```

```text
id:   019e40c7-e7cd-7383-adde-0a60a189df79
cwd:  /private/tmp/aiox-step10-cwd-spike-20260520/aiox-codex-beta
```

After TUI `/clear`, the replacement thread preserved the same symlink cwd:

```text
id:            019e40c8-334f-74b2-a51e-07e8d0e40699
forkedFromId:  null
cwd:           /private/tmp/aiox-step10-cwd-spike-20260520/aiox-codex-beta
```

Injection verification after `/clear`:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/client.ts send \
  --url=ws://127.0.0.1:4513 \
  --thread-id=019e40c8-334f-74b2-a51e-07e8d0e40699 \
  --text='AIOX_UNIQUE_CWD_PROBE_BETA_CLEAR: reply with exactly BETA_CLEAR_RECEIVED and do not edit files.'
```

The beta TUI received the turn and responded to the probe.

After TUI `/new`, the replacement thread also preserved the same symlink cwd:

```text
id:            019e40c8-b8dd-7db3-9a69-60819b93c636
forkedFromId:  null
cwd:           /private/tmp/aiox-step10-cwd-spike-20260520/aiox-codex-beta
```

Injection verification after `/new`:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/client.ts send \
  --url=ws://127.0.0.1:4513 \
  --thread-id=019e40c8-b8dd-7db3-9a69-60819b93c636 \
  --text='AIOX_UNIQUE_CWD_PROBE_BETA_NEW: reply with exactly BETA_NEW_RECEIVED and do not edit files.'
```

The beta TUI received the turn and responded to the probe.

Two-symlink shared app-server check:

- Launched a fresh shared app-server at `ws://127.0.0.1:4514`.
- Launched two TUIs with distinct `--cd` symlink paths.
- Both initial `thread/started` events preserved distinct symlink cwd values:

```text
id:   019e40c9-db9c-7e32-ba77-32a41c518641
cwd:  /private/tmp/aiox-step10-cwd-spike-20260520/aiox-codex-alpha

id:   019e40ca-061b-77b0-ba72-47d8a78ee1c9
cwd:  /private/tmp/aiox-step10-cwd-spike-20260520/aiox-codex-beta
```

Conclusion: unique cwd pathing is viable for shared app-server attribution only
if Aiox launches Codex with `--cd <unique-per-agent-symlink>`. Relying on shell
cwd alone is not sufficient. For `/clear` and `/new`, a replacement
`thread/started` with the same `(app-server endpoint, unique symlink cwd)` can
be safely rebound to the owning Aiox agent, provided no other live Codex agent
uses the same symlink cwd.

Remaining verification order:

1. Implement the Step 10 adapter policy using `--cd <unique-per-agent-symlink>`
   for Codex TUI launch.
2. Keep the explicit ambiguity guard: if two live Codex binding contexts have
   the same `(app-server endpoint, cwd)`, do not guess.
3. If future Codex versions stop preserving `--cd` symlink cwd, fall back to
   per-agent app-server until a stronger root-thread/TUI identity signal exists.

## Follow-Up Required Before Step 10 Phase B

1. Add a multi-TUI negative spike:
   - two `codex --remote` UIs on one app-server
   - run `/clear` or `/new` in one UI
   - prove the daemon can or cannot attribute the `thread/started` event to the
     correct launched TUI.
   - 2026-05-20 update: two `--cd` symlink TUIs preserved distinct initial
     cwd values. `/clear` and `/new` were verified on the beta symlink TUI with
     a competing real-cwd TUI loaded on the same app-server.
2. Add injection verification:
   - after `/clear` and `/new`, send `turn/start` to the new thread id
   - confirm the turn lands in the same TUI.
   - 2026-05-20 update: verified for both beta `/clear` and beta `/new`.
3. Decide whether MVP uses shared app-server for multiple Codex agents or
   per-agent app-server until a reliable TUI attribution signal is found.
4. Verify whether unique cwd can make shared app-server attribution safe for
   `/clear` and `/new`. `agentNickname` is ruled out for root TUI attribution
   on Codex CLI `v0.130.0`.
   - 2026-05-20 update: viable when using Codex CLI `--cd` with unique
     per-agent symlink cwd; not viable when relying on shell `cd -L` alone.

## Current Recommendation

Keep D1 as `AgentInstance.adapter_session_id` storing the active Codex thread
UUID.

Revise D4 from "clear/new can disconnect" to:

```text
clear/new/fork are active-thread replacement events.
Rebind to the new thread when attribution is safe.
If attribution is ambiguous, require explicit rebind instead of guessing.
```

This is a Step 10 adapter-boundary critical issue because a wrong mapping can
send routed messages to the wrong Codex TUI/thread.

Step 10 policy recommendation after Candidate A/B verification:

```text
Launch each Codex TUI with --cd <unique-per-agent-symlink>.
Bind thread/started by (app-server endpoint, cwd) when cwd is unique among live
Codex binding contexts.
Rebind /clear and /new replacement threads that preserve the same unique cwd.
Rebind fork replacement threads when forkedFromId matches the current thread id.
If uniqueness is violated or cwd is missing/canonicalized unexpectedly, do not
guess; require explicit rebind or fall back to per-agent app-server.
```

## Follow-Up Decision: Prefer Per-Agent In-Band Proxy Candidate

Date: 2026-05-20

After reviewing the unique cwd recommendation with the user, the main concern
was that symlink cwd works as an attribution token but adds lifecycle cleanup
and path side-effect risk. The user asked whether there is a cleaner way to
know which terminal/TUI produced a replacement thread after `/clear`, `/new`,
or `/fork`.

Additional candidate review:

- `activePermissionProfile` exists in the generated app-server protocol schema
  as permissions provenance metadata for thread start/resume/fork responses.
  It may be usable as a clean side-channel if a per-agent `default_permissions`
  profile is preserved across `/clear` and `/new`, but it is not designed as a
  root TUI identity field and may affect sandbox/approval behavior.
- In-band WebSocket proxy makes the TUI connection itself the attribution
  boundary. Aiox launches each Codex TUI against a per-agent local proxy
  endpoint. The proxy transparently relays to the shared Codex app-server while
  observing same-client JSON-RPC request/response pairs.

Important correction:

- A proxy must not use broadcast `thread/started` notifications alone as the
  binding authority. Prior monitor spikes showed a separate WebSocket can
  observe `thread/started` events from other sessions. Therefore broadcast
  notifications are context, not ownership proof.
- The authoritative proxy signal should be same-client request/response
  correlation:

```text
Codex TUI -> per-agent proxy -> app-server: thread/start or thread/fork request
app-server -> per-agent proxy -> Codex TUI: same request id response with new thread id
```

If `/clear` and `/new` are implemented by the Codex TUI as client-originating
`thread/start` JSON-RPC requests on the same proxy-observed connection, the
proxy can rebind the owning Aiox agent without cwd symlinks or permissions
side-channels. `/fork` can be attributed by same-connection `thread/fork`
request/response and still has the additional `forkedFromId` safety check.

User-facing launch command stays stable:

```bash
aiox codex --name alpha
```

But the internal Codex launch target changes from the shared app-server
endpoint to the per-agent proxy endpoint:

```text
codex --remote ws://127.0.0.1:<proxy-alpha>
```

Process topology candidate:

```text
Codex TUI alpha -> proxy alpha -> shared codex app-server
Codex TUI beta  -> proxy beta  -> shared codex app-server
```

Policy preference after this follow-up:

1. Prefer per-agent in-band proxy for shared app-server attribution, pending a
   small spike that confirms `/clear` and `/new` request/response flow.
2. Keep `activePermissionProfile` as a secondary spike candidate.
3. Keep unique `--cd` cwd as a verified fallback, not the first-choice policy.
4. Keep per-agent app-server as the simplest reliable fallback if proxy
   attribution is unavailable.

Proxy failure and fallback principles:

- The proxy's primary job is transparent relay. It forwards all WebSocket
  frames/messages between Codex TUI and app-server even when Aiox does not
  understand a message.
- Binding observation is secondary. Unknown messages, server-to-client
  requests, approvals, item deltas, and notifications must pass through
  unchanged.
- Rebind only when same-client `thread/start` or `thread/fork` request/response
  correlation is confirmed.
- If parsing or correlation fails, keep relay running, do not guess, and mark
  the binding as uncertain.
- If routing wants to inject into an agent whose Codex binding is uncertain,
  pause or fail that delivery with a clear reason instead of sending to a
  possibly wrong TUI.
- `/exit` and `/quit` are lifecycle events, not rebind events. Treat WebSocket
  close plus Codex child process exit as disconnected; a WebSocket close while
  the child process still lives should be treated as transient or stale after a
  grace window.

Claude note:

- Do not assume the Codex WebSocket proxy design generalizes to Claude. Claude
  uses an MCP channel server over stdio plus HTTP ingress for aiox injection.
  Claude should have a separate adapter identity boundary, likely per-agent MCP
  channel server/lifecycle tracking.

Next verification:

1. Build or run a minimal transparent WebSocket proxy spike.
2. Record client->server and server->client JSON-RPC frames for one Codex TUI.
3. Perform `/clear`, `/new`, and `/fork`.
4. Verify whether `/clear` and `/new` produce same-connection `thread/start`
   requests whose responses include the new thread id.
5. Verify `/fork` same-connection behavior and `forkedFromId` consistency.
6. Only after this spike, update `plan/mvp-implementation-checklist.md` Step 10
   policy from unique cwd first to per-agent proxy first.

## In-Band Proxy Verification

Date: 2026-05-20

Scope correction:

- The first in-band proxy run below was not the full `/clear`/`/new`/`/fork`
  lifecycle acceptance matrix.
- It verified same-client request/response rebind only for initial TUI attach,
  empty-session `/clear`, and empty-session `/new`.
- Empty-session `/fork` sent a same-client `thread/fork` request, but the
  response was an error. No new thread id was returned, so `/fork` rebind was
  not verified by this run.
- Turn-after `/clear`, `/new`, and `/fork` were not covered by this first run.
- Broadcast `thread/started` notifications are context only. They are not
  binding authority for any case in the matrix.

Verification on Codex CLI `v0.131.0`:

- Added a minimal transparent WebSocket proxy spike:
  - `spikes/codex-app-server-multi-session-poc/inband-proxy.ts`
  - `spikes/codex-app-server-multi-session-poc/inband-proxy.test.ts`
- The proxy preserves text WebSocket frames as text. This matters because
  sending text JSON-RPC frames upstream as binary buffers caused Codex
  app-server to ignore `initialize`.
- The proxy forwards unknown messages unchanged and records binding candidates
  only from same-connection `thread/start` or `thread/fork` request/response
  correlation.
- A broadcast `thread/started` notification alone does not create a binding
  candidate in the proxy test.

Commands:

```bash
codex app-server --listen ws://127.0.0.1:4515

pnpm tsx spikes/codex-app-server-multi-session-poc/inband-proxy.ts \
  --upstream=ws://127.0.0.1:4515 \
  --listen-port=4520 \
  --out=/private/tmp/aiox-codex-inband-proxy-events.jsonl

codex --remote ws://127.0.0.1:4520 --no-alt-screen
```

Initial TUI attach produced a same-client `thread/start` request/response:

```text
client -> server:
  id:                  4
  method:              thread/start
  sessionStartSource:  null

server -> client:
  id:                  4
  thread.id:           019e40fc-0746-7573-ac47-119cf16bfc28
  thread.forkedFromId: null
```

Proxy observation:

```text
binding_candidate:
  method:     thread/start
  requestId:  4
  threadId:   019e40fc-0746-7573-ac47-119cf16bfc28
```

TUI `/clear` produced a same-client `thread/start` request/response:

```text
client -> server:
  id:                  8
  method:              thread/start
  sessionStartSource:  clear

server -> client:
  id:                  8
  thread.id:           019e40fc-4fac-7b82-9eda-fa6497fe550d
  thread.forkedFromId: null
```

Proxy observation:

```text
binding_candidate:
  method:     thread/start
  requestId:  8
  threadId:   019e40fc-4fac-7b82-9eda-fa6497fe550d
```

TUI `/new` produced a same-client `thread/start` request/response:

```text
client -> server:
  id:                  14
  method:              thread/start
  sessionStartSource:  null

server -> client:
  id:                  14
  thread.id:           019e40fc-d42f-7c72-8a3e-4100c22cb03b
  thread.forkedFromId: null
```

Proxy observation:

```text
binding_candidate:
  method:     thread/start
  requestId:  14
  threadId:   019e40fc-d42f-7c72-8a3e-4100c22cb03b
```

TUI `/fork` behavior in this empty/new-thread state:

```text
client -> server:
  id:        19
  method:    thread/fork
  threadId:  019e40fc-d42f-7c72-8a3e-4100c22cb03b

server -> client:
  id:     19
  error:  no rollout found for thread id 019e40fc-d42f-7c72-8a3e-4100c22cb03b
```

Interpretation:

- `/fork` is also client-originating on the same proxy-observed connection.
- Codex app-server returned an error for the current empty/new thread because
  there was no rollout/history to fork. Treat this as expected empty-thread
  behavior: request-path verified, no rebind, successful fork binding still
  pending for a thread with an actual completed rollout.

Interim conclusion before full matrix revalidation:

- Per-agent in-band WebSocket proxy is a viable attribution candidate for
  Codex TUI attach, empty-session `/clear`, and empty-session `/new`.
- Verified binding authority is same-client request/response correlation for
  `thread/start` responses that return a new thread id.
- `/fork` is only request-path observed in this run. It is not rebind-verified
  until a same-client `thread/fork` response returns a new thread id.
- Turn-after replacement flows are unverified in this run.
- Broadcast `thread/started` may be recorded as context but must not own
  attribution.
- Unique `--cd <unique-per-agent-symlink>` remains a verified fallback while
  proxy rebind policy is still being completed.

## In-Band Proxy Matrix Revalidation

Date: 2026-05-20

Environment:

- Codex CLI `v0.131.0`.
- Shared validation app-server: `ws://127.0.0.1:4615`.
- One per-case proxy endpoint and one per-case JSONL log under
  `/private/tmp`.
- Binding authority: same-client request/response correlation only. Broadcast
  `thread/started` notifications were ignored for ownership decisions.

Matrix:

| # | Scenario | JSONL log | Same-client request/response result | Rebind decision |
| --- | --- | --- | --- | --- |
| 1 | session start -> `/clear` -> rebind | `/private/tmp/aiox-step10-rebind-case1-clear-empty.jsonl` | PASS. Initial attach returned `thread/start` request id `4` -> `019e4109-8fa6-7901-a7fd-20ccb61f20c5`. `/clear` returned `thread/start` request id `8` -> `019e4109-b8f8-72d2-a9ef-2bd6491d8205` with `sessionStartSource: "clear"`. | Verified. Rebind to the new thread id from the same-client `thread/start` response. |
| 2 | session start -> `/new` -> rebind | `/private/tmp/aiox-step10-rebind-case2-new-empty.jsonl` | PASS. Initial attach returned `thread/start` request id `4` -> `019e410a-330c-7f60-8de8-19e2b16a01cc`. `/new` returned `thread/start` request id `8` -> `019e410a-5c9d-7503-8944-6cc45d193a32` with `sessionStartSource: null`. | Verified. Rebind to the new thread id from the same-client `thread/start` response. |
| 3 | session start -> `/fork` on empty thread | `/private/tmp/aiox-step10-rebind-case3-fork-empty.jsonl` | Expected no-rebind case. Initial attach returned `thread/start` request id `4` -> `019e410a-cdf6-7061-a3f4-8341b818d8c4`. `/fork` sent same-client `thread/fork` request id `6`, but the response was error `-32600`: `no rollout found for thread id 019e410a-cdf6-7061-a3f4-8341b818d8c4`. The TUI also displayed a fork failure. | Verified empty-thread behavior. There is no rollout/history to fork, so keep old binding. Do not infer a new binding from broadcasts. |
| 4 | session start -> turn completed -> `/clear` -> rebind | `/private/tmp/aiox-step10-rebind-case4-clear-after-turn.jsonl` | BLOCKED. The attempted probe turn produced `turn/completed` with `status: "failed"` and `usageLimitExceeded`, telling the user to try again at `4:54 AM`. No successful completed turn existed before the slash command. | Not verified. This failed-turn run is not acceptance evidence for turn-after rebind. |
| 5 | session start -> turn completed -> `/new` -> rebind | Not run after case 4 blocker. | BLOCKED by the same Codex usage limit before a successful completed turn could be produced. | Not verified. |
| 6 | session start -> turn completed -> `/fork` -> rebind | Not run after case 4 blocker. | BLOCKED by the same Codex usage limit before a successful completed turn could be produced. | Not verified. |

Policy confirmed by this matrix:

- Empty-session `/clear` and `/new` can rebind through the per-agent in-band
  proxy when the same-client `thread/start` response returns a new thread id.
- Empty-session `/fork` returned the expected `no rollout found` error because
  there is no rollout/history to fork. This is not evidence that fork is
  unsupported; it is evidence that an empty-thread fork is a no-rebind error
  path.
- Turn-after `/clear`, `/new`, and `/fork` remain unverified. Step 10 must not
  claim support for those cases until a successful completed turn is available
  and the slash command response is captured.
- In all cases, broadcast `thread/started` alone remains non-authoritative.

Follow-up direct probe on 2026-05-20 with Codex CLI `v0.131.0` reconfirmed the
empty-thread interpretation without the TUI:

```text
initialize -> ok
thread/start -> 019e442e-25f7-72b1-97c8-3b06f9a542a5
thread/fork { threadId: 019e442e-25f7-72b1-97c8-3b06f9a542a5 }
  -> error -32600 "no rollout found for thread id 019e442e-25f7-72b1-97c8-3b06f9a542a5"
```

Conclusion: empty-session `/fork` should be documented as "no fork target /
no-rebind expected error", not "fork unsupported".

## Decision: Proxy Is Transparent Relay for All Frames

Date: 2026-05-20

Question that prompted this decision: when `/fork` is requested on an
empty/new Codex thread, app-server replies with JSON-RPC error
`-32600 no rollout found for thread id <id>` (Case 3 above). Should the
in-band proxy intercept, swallow, or rewrite that error?

The right scope for this decision is not just `/fork` errors, and not even
just binding-method errors. The same question applies to **every** frame
the proxy sees: success responses, error responses, server-initiated
requests (approvals, patch confirmations, exec confirmations), notifications
(`thread/started`, `item/*`, `turn/*`), unknown methods introduced by future
Codex versions, and any other JSON-RPC traffic in either direction.

Decision: **the proxy forwards every WebSocket frame between Codex TUI and
app-server unchanged, in both directions, regardless of message type or
content.** The proxy never:

- swallows, drops, or filters frames;
- rewrites payloads, ids, methods, params, results, or errors;
- synthesizes its own frames into either direction;
- delays a frame waiting for an observation decision.

Binding observation (`thread/start` / `thread/fork` request/response
correlation) is a **side-effect-free read** of the same frames after they
have already been forwarded.

Rationale:

- The proxy is positioned **inside** the Codex protocol path. The TUI and
  app-server are the two endpoints that own JSON-RPC semantics; the proxy
  is not a participant. Any modification breaks flow control, request id
  pairing, or future protocol features the proxy has no knowledge of.
- `/fork` error was just the immediate trigger. The Codex TUI already
  renders fork failures natively (Case 3: "The TUI also displayed a fork
  failure."). The same applies to approvals, exec confirmations, item
  deltas, turn lifecycle, and every other Codex-defined UX surface — they
  are TUI/app-server contracts, not aiox surfaces.
- Codex will add methods, error codes, and notification shapes the aiox
  proxy was not written against. A transparent relay survives those
  changes; a parsing-and-rewriting proxy silently breaks on them.
- Hiding errors makes failures undiagnosable. Hiding notifications breaks
  TUI state. Hiding server-initiated requests breaks approvals. None of
  these are recoverable from inside aiox without re-implementing Codex.
- Binding authority is a function of observed traffic, not a function of
  modifying traffic. Observation can be wrong or absent without breaking
  the user's Codex session.

Scope of aiox-controlled traffic (not covered by this decision):

- `aiox`-originated `turn/start` injection sent **into** the proxy from the
  daemon side is aiox traffic and is subject to daemon policy (e.g., refuse
  injection when binding is uncertain). That is a separate concern from
  client/TUI <-> app-server frames passing through the proxy.

Daemon-side behavior for error/uncertain observations:

- For binding-method (`thread/start`, `thread/fork`) error responses:
  - Keep the existing `AgentInstance.adapter_session_id`; the pre-request
    thread is still active.
  - Do not mark the agent's binding as uncertain.
    `binding_uncertain { reason: "error_response" }` is a logging signal,
    not an attribution-change signal. Uncertain status is reserved for
    "we attempted a rebind but cannot confirm which thread is now active",
    which a protocol-level error never produces.
  - Specifically for empty-thread `/fork`, `no rollout found for thread id`
    means there is no rollout/history to fork. This is an expected no-rebind
    path, not a product-level fork incompatibility.
  - Do not surface an aiox-side error notification. The TUI owns
    user-facing presentation.
- For every other frame type (non-binding methods, notifications,
  server-initiated requests, unknown methods): the daemon takes no action.
  These frames are not aiox's concern.

Implementation verification against
`spikes/codex-app-server-multi-session-poc/inband-proxy.ts`:

- `client.on("message")` (line 78–88) forwards every client frame upstream
  unchanged. `observeClientFrame` runs after the relay branch and only
  records pending binding requests; it never blocks, rewrites, or
  short-circuits the send.
- `upstream.on("message")` (line 90–97) forwards every upstream frame to
  the client unchanged. `observeUpstreamFrame` runs purely as an observer.
- `observeUpstreamFrame` (line 178–186) detects `message.error !==
  undefined` for a previously-pending binding request and emits
  `binding_uncertain { reason: "error_response" }` — observation only;
  the error frame itself was already forwarded to the TUI.
- Frames that fail `parseJsonRpcMessage` (non-JSON, malformed) are still
  forwarded by the outer `send` and only skip observation. Binary frames
  are preserved as binary via `normalizeFrame`.

Conclusion: the proxy implementation already satisfies this decision
structurally for every observed frame type — not just `thread/fork`
errors.

Remaining work:

- Add regression tests to `inband-proxy.test.ts` that lock in
  passthrough-regardless-of-content. Suggested cases:
  1. Upstream JSON-RPC **error** response for `thread/fork`: client
     receives the exact error frame; observations include
     `binding_uncertain { reason: "error_response" }`; no
     `binding_candidate` for that request id.
  2. Upstream **server-initiated request** (e.g., a fake `approval/request`
     method with an id): client receives the exact frame; no binding
     observation is emitted because it is not a binding-method response.
  3. Upstream **notification** that is not `thread/started` (e.g., an
     `item/delta` shape): client receives the exact frame; no binding
     observation is emitted.
  4. Upstream **unknown-method** frame: client receives the exact frame;
     proxy does not error out and does not drop the frame.
- Without these tests, future refactors of `observeUpstreamFrame` or
  `parseJsonRpcMessage` could narrow the relay to "frames the proxy
  understands" and silently break Codex traffic outside the binding
  vocabulary.

## Followup: Proxy Cost Model and Lazy Observation

Date: 2026-05-20

The "transparent relay for all frames" decision above fixed *what* the
proxy does to traffic. A follow-up thread examined *how much* the proxy
costs to do that — specifically the question of per-agent proxy mapping
performance under Node.js single-threaded event loop, and whether the
current implementation's unconditional `JSON.parse` on every frame is
appropriate when the proxy's purpose is only `/clear`·`/new`·`/fork`
rebind attribution.

That analysis and the proposed lazy observation implementation are kept
in a separate working note to avoid bloating this document:

- `history/28-step-10-proxy-lazy-observation.history.md` — cost analysis,
  large-frame candidates, lazy observation rule, measurement plan,
  regression test plan, deferred process isolation rationale.
- `docs/aiox/proxy-cost-model.md` — user-facing learning record with full
  visualizations (current vs proposed flow, decision trees, cost tables,
  session timeline).

Relationship to this document:

- The transparent relay decision (above) is unchanged. Lazy observation is
  a cost-model refinement *within* the relay-always rule.
- The four-case regression test list (above) remains valid; history/28
  extends it with five more cases targeted at the lazy observation
  pre-filter.
- No code changes have landed yet for the lazy observation rule. This
  document's "remaining work" section is still the authority for the
  transparent relay regression tests.
