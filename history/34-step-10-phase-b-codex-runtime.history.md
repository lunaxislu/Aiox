# Step 10 Phase B — Codex Runtime Implementation

> Started: 2026-05-21
> Implementer: Codex
> Authority:
> - `history/33-step-10-phase-a-decisions.history.md`
> - `history/31-step-10-per-agent-app-server-runtime.history.md`
> - `history/32-step-10-per-agent-app-server-resume-spike.history.md`
> - `prd/mvp/aiox-mvp-spec.md`
> - `plan/mvp-implementation-checklist.md`

## Round 1 — Foundation + D7 Acquisition Path

Status: in progress.

Commits:

- `af97b20` — Add codex app-server runtime foundation (Round 1 code).
- `d6326c6` — Record step 10 round 1 commit (history scaffold).
- `e1b15a5` — Record codex app-server callback investigation (history).
- `82d6b27` — docs: record codex D7 option D follow-up (history + plan).
- `1f9d7d6` — behavior: detect codex app-server exit during readyz polling (TDD red→green).
- `3fb808e` — docs: mark codex runtime dispose placeholder.
- `c70ea3c` — test: cover codex app-server endpoint validation.

Changed files (Round 1 + follow-up):

- `src/adapters/codex/app-server.ts`
- `src/adapters/codex/launcher.ts`
- `src/adapters/codex/runtime.ts`
- `tests/unit/adapters/codex-app-server.test.ts`
- `plan/mvp-implementation-checklist.md`

### D7 returned-id acquisition first blocker

Question from `history/33`:

> Can the aiox daemon WS client see TUI-originated `thread/start` /
> `thread/fork` / `thread/resume` success responses, or an equivalent
> authoritative returned id, in the production topology?

Observed on 2026-05-21 with Codex CLI frame data showing `cliVersion:
0.132.0`:

- Started a per-agent Codex app-server with
  `codex app-server --listen ws://127.0.0.1:0`.
- Connected two direct WS clients to the same app-server:
  - `actor`: simulates the TUI-owned connection by issuing `thread/start`.
  - `monitor`: simulates the daemon-owned separate WS connection.
- `actor` received the `thread/start` success response with thread id
  `019e48b5-26c1-72a2-80cd-13dfaa867ebc`.
- `monitor` did **not** receive the response for request id `2`.
- `monitor` received broadcast/context notifications:
  `remoteControl/status/changed` and `thread/started`.

Conclusion:

Direct per-agent app-server production topology does **not** give a separate
daemon WS client the same-client authoritative returned id for operations
originated by the TUI connection. Broadcast `thread/started` remains
non-authoritative under D7.

### D7 acquisition Decision Options

Option A — Use separate daemon WS observations only.

- Trade-off: simplest implementation, but only sees broadcast notifications and
  cannot satisfy D7 authority.
- Recommendation: reject for `/clear` / `/new` / `/fork` replacement.
- Reversibility: high, because no protocol path is added.
- Deferrability: yes, but leaves TUI-originated replacement unimplemented.

Option B — Add an aiox-initiated read/poll strategy.

- Trade-off: preserves direct topology, but no authoritative "active TUI
  thread" read API has been verified yet.
- Recommendation: investigate only if proxy fallback is rejected or if Codex
  exposes a precise active-thread API.
- Reversibility: medium; polling semantics could become stale or misleading.
- Deferrability: yes.

Option C — Reintroduce per-agent transparent WS proxy only for binding
observation.

- Trade-off: adds a protocol relay process/path, but previous spikes in
  `history/27` and `history/32` verified same-client request/response
  authority through a transparent proxy.
- Recommendation: best candidate if Phase B must implement TUI-originated
  `/clear` / `/new` / `/fork` D7 replacement now.
- Reversibility: medium; launcher endpoint wiring changes, but authority stays
  D7-compatible.
- Deferrability: yes for post-Round-1 implementation; no for full D7 replacement
  scope.

Option D — Scope Round 4 D7 replacement to aiox-owned authoritative operations.

- Trade-off: keeps MVP direct topology and avoids proxy cost, but TUI
  slash-command replacement is not implemented in Phase B.
- Recommendation: acceptable MVP fallback if user chooses not to revive proxy
  in Phase B.
- Reversibility: high; a proxy or verified read API can be added later.
- Deferrability: yes, with an Open Product Issue for TUI-originated replacement.

Round 1 recommendation: proceed with direct topology foundation and do not infer
binding from notifications. Before Round 4 D7 replacement implementation, choose
between Option C (proxy observation) and Option D (scope reduction).

### D7 Round 4 Scope — Decision (2026-05-21)

User decision: adopt Option D.

Round 4 D7 replacement is limited to aiox-originated authoritative operations:
programmatic `thread/start` and later `sendMessage` / `turn/start` paths where
the aiox daemon owns the request and receives the same-operation JSON-RPC
success response.

TUI-originated `/clear`, `/new`, and `/fork` rebind is explicitly deferred as a
post-MVP Open Product Issue. The direct per-agent app-server topology remains
the MVP production path; Phase B does not reintroduce the transparent proxy.

Decision rationale:

- MVP stability: keep the runtime on the simpler direct topology while the
  Codex adapter foundation lands.
- D7 authority: do not infer bindings from `thread/started` notifications,
  because the daemon cannot observe the TUI connection's same-client response.
- Reversibility: Option C can be revived later by changing launcher endpoint
  wiring so the TUI connects through a per-agent transparent proxy. The
  authority model remains the same-client request/response model validated in
  `history/27` and `history/32`.

### Open Product Issue — TUI-originated rebind

Post-MVP issue: preserve aiox agent binding across TUI-originated `/clear`,
`/new`, and `/fork` in direct or proxy-backed Codex runtime topologies.

Current blocker: with direct per-agent app-server, a separate daemon WS client
does not receive the authoritative returned id for TUI-originated operations.
It only receives broadcast/context notifications such as `thread/started`.

Valid revival paths:

1. Reintroduce a per-agent transparent proxy so aiox observes the TUI
   connection's same-client request/response frames. Use `history/27` and
   `history/32` as the preserved spike evidence.
2. Use a future Codex CLI app-server authoritative callback, hook, or active
   thread read API if Codex exposes one with enough operation/source context to
   satisfy D7.

Until one of those paths is implemented, TUI-originated rebind must not update
`AgentInstance.adapter_session_id` from notification-only signals.

### Codex app-server callback / hook follow-up

User question after Round 1:

> If Codex app-server had a hook/callback to daemon, would that solve D7?
> Does the current app-server expose such a hook/callback?

Conclusion:

Current `codex-cli 0.132.0` app-server / `--remote` protocol does **not**
expose a hook, webhook, callback, subscription, config flag, or response
forwarding API that lets a separate aiox daemon receive authoritative
same-operation success callbacks for TUI-originated `thread/start`,
`thread/fork`, or `thread/resume`.

The authoritative returned id remains the JSON-RPC response on the originating
WebSocket connection. A separate daemon-owned WS connection sees notifications
and context only.

Evidence:

- Official OpenAI Codex app-server documentation describes JSON-RPC messages as
  requests, responses, and notifications. `thread/start` returns `result.thread`
  to the requesting client and separately emits `thread/started`. Notifications
  omit `id`; they are not response forwarding.
  Source: `https://developers.openai.com/codex/app-server`.
- Official docs list `initialize.params.capabilities.optOutNotificationMethods`,
  which can suppress exact notification method names per connection. This is a
  notification filtering control, not a callback/subscription for another
  connection's request/response.
- `codex app-server --help` in this environment exposes transport/auth/schema
  generation options, but no callback/webhook/hook routing option for thread
  operation responses.
- Generated current protocol schema with:

  ```bash
  codex app-server generate-json-schema --experimental \
    --out /private/tmp/aiox-codex-schema-check
  ```

  The schema contains `thread/start`, `thread/resume`, `thread/fork`,
  `thread/read`, `thread/list`, `thread/loaded/list`, `thread/unsubscribe`,
  `thread/started`, and `InitializeCapabilities.optOutNotificationMethods`.
  It does not contain a response-forwarding subscription or operation callback
  API.
- Delegated Codex subagent investigation independently reached the same
  conclusion using local history, installed package/version checks, generated
  protocol, and a live probe against `codex-cli 0.132.0`: the actor connection
  received a `thread/start` id, while the monitor connection saw only
  `remoteControl/status/changed` and `thread/started`, not the actor response.

Decision consequence:

- A hypothetical authoritative app-server callback would satisfy D7 if it
  carried the operation success, returned id, and enough source/session context
  to prove ownership.
- The current Codex app-server does not provide that surface.
- Do not implement D7 replacement from `thread/started` broadcast
  notifications.
- For full TUI-originated `/clear`, `/new`, `/fork`, and CLI resume rebinding,
  use the validated transparent proxy path so aiox observes same-client
  request/response, or explicitly scope Phase B D7 replacement down to
  aiox-originated authoritative operations and leave TUI-originated replacement
  as an Open Product Issue.

### Round 1 Review Disposition

| Review item | Disposition |
|---|---|
| Banner format evidence | Cross-reference strengthened here. `history/31:99` recorded `codex-cli 0.131.x` stderr banner evidence. A fresh `codex-cli 0.132.0` local capture also produced stdout empty and stderr lines `listening on: ws://127.0.0.1:<port>`, `readyz: http://127.0.0.1:<port>/readyz`, and `healthz: http://127.0.0.1:<port>/healthz`. |
| Resume flag evidence | Cross-reference strengthened here. `history/32:106` verified `codex resume <thread-id> --remote <endpoint>` against `0.131.x`. Local `codex-cli 0.132.0` `codex resume --help` still exposes `--remote <ADDR>` with accepted `ws://host:port`, `wss://host:port`, `unix://`, and `unix://PATH` forms, so `launchCodexTui` may keep the current flag shape. |
| `waitForCodexReadyz` child exit detection | Real diagnostic gap. Commit 2 will add a red/green regression so banner-after-parse process exit is classified as `app_server_process_exited_before_ready`, not `app_server_readyz_timeout`. |
| `runtime.dispose()` placeholder | Expected Round 1 skeleton. The runtime placeholder is marked as Round 3 D5-A.5 cleanup work: WS close → SIGTERM → 3s grace → SIGKILL. Until then, production use of `dispose()` can leak the app-server process/WS resources. |
| Protocol/pathname mismatch tests | Commit 4 will add parser coverage for `ws:` endpoint enforcement and `/readyz` / `/healthz` pathname enforcement. |
| ANSI OSC stripping | Deferred. Current `codex-cli 0.132.0` banner capture has no OSC sequences, and CSI stripping covers the practical banner color/control case already tested. Broader ANSI parsing is not needed for MVP unless a real banner sample requires it. |
| D7 Option D | User decision recorded above. Round 4 D7 replacement scope is aiox-originated authoritative operations only; TUI-originated rebind is post-MVP. |

Fresh `codex-cli 0.132.0` banner capture:

```text
stdout: ""
stderr:
codex app-server (WebSockets)
  listening on: ws://127.0.0.1:53194
  readyz: http://127.0.0.1:53194/readyz
  healthz: http://127.0.0.1:53194/healthz
  note: binds localhost only (use SSH port-forwarding for remote access)
```

Fresh `codex-cli 0.132.0` resume flag verification:

```text
codex-cli 0.132.0
codex resume --help
  --remote <ADDR>
      Connect the TUI to a remote app server endpoint.
      Accepted forms: `ws://host:port`, `wss://host:port`, `unix://`, or `unix://PATH`.
```

### D2.5 follow-ups closed

1. Banner parser shape: implement a small line/token parser over accumulated
   stdout/stderr rings instead of locking one full-banner regex.
2. ANSI stripping: enabled before token extraction.
3. Per-stream ring capacity: default `256 * 1024` bytes per stream.
4. Loopback validation: parse with `new URL(...)`, require `ws:` for the
   app-server endpoint, `http:` for readyz/healthz, and allow loopback hosts
   only (`localhost`, `127.0.0.0/8`, `::1`).

Reversibility: all four choices are local to `app-server.ts` and covered by unit
tests.

Deferrability: no; banner parsing and readyz polling are required by D2 launch
sequence before later rounds can build on runtime startup.

### Verification

- Red check: `pnpm test tests/unit/adapters/codex-app-server.test.ts` failed
  before production code with missing module
  `src/adapters/codex/app-server.js`.
- Green check: `pnpm test tests/unit/adapters/codex-app-server.test.ts` passed
  with 6 tests.
- Typecheck: `pnpm typecheck` passed after simplifying the launcher banner wait
  helper.

- Full Round 1 verification:
  - `pnpm test` — 33 files / 172 tests passed.
  - `pnpm typecheck` — passed.
  - `pnpm build` — passed.

## Round 2 — D4 Protocol Surface

Status: in progress.

### D4.4 turn/start ack frame spike

Local Codex CLI 0.132.0 probe on 2026-05-21:

- Started `codex app-server --listen ws://127.0.0.1:0`.
- Connected two initialized WS clients:
  - `actor`: sends `thread/start` and `turn/start`.
  - `monitor`: observes broadcast notifications on a separate connection.
- `actor` received the same-client JSON-RPC `turn/start` response.
- `actor` and `monitor` also observed notifications after the request, including
  `thread/status/changed`; `actor` observed `turn/started`.

Raw frame lock:

```json
actor {"id":4,"result":{"turn":{"id":"019e4934-2329-7d73-aac1-9da171f13084","items":[],"itemsView":"notLoaded","status":"inProgress","error":null,"startedAt":null,"completedAt":null,"durationMs":null}}}
```

Decision: D4.4 Option B remains valid. `inject()` succeeds when the
same-client `turn/start` JSON-RPC response is acknowledged and the requested
thread id equals `runtime.activeThreadId`. It does not wait for
`turn/started`, `turn/completed`, or model output.

### D4.4 turn/start payload shape

Generated current protocol schema with:

```bash
codex app-server generate-json-schema --experimental --out /private/tmp/aiox-codex-schema-round2
```

`v2/TurnStartParams.json` requires only `threadId` and `input`, but `input` is
an array of `UserInput` items, not a string. Text injection therefore uses:

```json
{"threadId":"<thread-id>","input":[{"type":"text","text":"<message>"}]}
```

The first probe using string `input` failed with JSON-RPC `-32600`:
`invalid type: string ..., expected a sequence`.

### D4.7 initialize default

Generated `v1/InitializeParams.json` requires `clientInfo` and supports optional
`capabilities`. It does not advertise `protocolVersion`.

User-confirmed Round 2 default:

```json
{
  "clientInfo": { "name": "aiox", "version": "<package.version>" },
  "capabilities": { "experimentalApi": false }
}
```

Decision rationale:

- Follows the generated Codex CLI 0.132.0 schema.
- Keeps broadcast notifications available for future listener plumbing.
- Avoids relying on ignored extra fields such as `protocolVersion`.
