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

- `af97b20` — Add codex app-server runtime foundation.

Changed files:

- `src/adapters/codex/app-server.ts`
- `src/adapters/codex/launcher.ts`
- `src/adapters/codex/runtime.ts`
- `tests/unit/adapters/codex-app-server.test.ts`

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
