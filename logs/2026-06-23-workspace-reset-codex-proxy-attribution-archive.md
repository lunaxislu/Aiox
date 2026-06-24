---
topic: Codex proxy attribution signal archive
description: workspace reset W5 archive digest for legacy docs/aiox proxy attribution and cost-model records
status: decided
---

## Work Items

## 2026-06-23 · W5 archive digest — Codex proxy attribution signals

This archive is the workspace reset successor for two legacy `docs/aiox/`
learning records:

- `docs/aiox/proxy-attribution-signals.md`
- `docs/aiox/proxy-cost-model.md`

It preserves measured Codex WebSocket proxy attribution signals and the related
lazy-observation cost model at the density needed after those legacy sources are
physically deleted. The preserved measurements came from the Step 10 in-band
proxy spike (`history/27-step-10-codex-clear-new-rebind-spike.history.md`) and
the later loaded-thread binding analysis (`history/41-codex-loaded-thread-binding-analysis.history.md`).

This digest preserves observed facts and implementation-relevant signal shapes.
It is not a new decision. The current decision owner for the cost-model WHY is
`docs/decisions/proxy-lazy-observation-cost-model.md`.

## 1. Preserved Signal Mapping

The proxy observes Codex TUI-originated JSON-RPC traffic on the same WebSocket
connection used by that TUI. Request/response correlation by JSON-RPC `id` is
the binding authority; broadcast notifications are context only.

| TUI action | Request method | Request signal | Response signal | Binding result |
| --- | --- | --- | --- | --- |
| Initial attach | `thread/start` | `sessionStartSource: null` | `result.thread.id`, `forkedFromId: null` | Bind to `result.thread.id` |
| `/clear` | `thread/start` | `sessionStartSource: "clear"` | `result.thread.id`, `forkedFromId: null` | Bind to `result.thread.id` |
| `/new` | `thread/start` | `sessionStartSource: null` | `result.thread.id`, `forkedFromId: null` | Bind to `result.thread.id` |
| `/fork` success | `thread/fork` | `params.threadId` = source thread | `result.thread.id`, `result.thread.forkedFromId` = source thread | Bind to response `result.thread.id`; use `forkedFromId` as the source check |
| `/fork` empty-thread error | `thread/fork` | `params.threadId` = current empty/new thread | JSON-RPC error `-32600` / `no rollout found for thread id ...` | No rebind; keep existing binding |
| `/resume` | `thread/resume` | `params.threadId` = requested resume target | `result.thread.id`, `forkedFromId: null` | Bind to `result.thread.id` |
| `/resume -> /clear` | `thread/resume`, then `thread/start` | later `sessionStartSource: "clear"` | later `result.thread.id` | Later `thread/start` response supersedes the resumed binding |
| `/resume -> /new` | `thread/resume`, then `thread/start` | later `sessionStartSource: null` | later `result.thread.id` | Later `thread/start` response supersedes the resumed binding |
| `/resume -> /fork` | `thread/resume`, then `thread/fork` | later `params.threadId` = resumed source | later `result.thread.id` | Later `thread/fork` response supersedes the resumed binding |

The single-action rows (`Initial attach`, `/clear`, `/new`, `/fork`, `/resume`)
are the frames directly observed in the spike. The three `/resume -> ...` rows
are derived from the binding-supersede rule (a later binding response replaces a
resumed binding), not separately captured frames.

The `/clear` and `/new` distinction is not the method name: both use
`thread/start`. The distinguishing request value is `sessionStartSource`, where
observed `/clear` used `"clear"` and observed `/new` used `null`.

## 2. Response Fields Preserved

The proxy-relevant response fields are:

- JSON-RPC `id`: correlates the response to a pending same-client binding
  request.
- `result.thread.id`: the active Codex thread id to bind when the response is a
  successful binding response.
- `result.thread.forkedFromId`: for `thread/fork`, the source thread reported by
  Codex; this is a safety check against binding a fork from an unexpected source.
- `error`: for binding-method error responses such as empty-thread `/fork`, the
  error frame is forwarded unchanged and produces no new binding.

The proxy must bind `/fork` to the response `result.thread.id`, not to request
`params.threadId`; the request id is the source thread, while the response id is
the visible fork target.

## 3. What The Proxy Knows

| The proxy knows | Source |
| --- | --- |
| Whether the relevant method is `thread/start`, `thread/resume`, or `thread/fork` | Same-client request frame |
| Whether a `thread/start` was `/clear` or `/new` for the observed cases | `params.sessionStartSource` (`"clear"` vs `null`) |
| The new or resumed visible thread id | Matching response `result.thread.id` |
| The source thread for a successful fork | Matching response `result.thread.forkedFromId` |
| Whether a fork failed because the current thread had no rollout/history | Matching error response |
| The previous binding for comparison | Proxy/daemon binding context |

## 4. What The Proxy Does Not Know

| The proxy does not know | Reason |
| --- | --- |
| The user's prompt content | Turn content is outside binding observation and should not be parsed for attribution. |
| The human user's identity | A proxy is bound to one TUI connection; connection identity is the attribution boundary. |
| Whether a broadcast `thread/started` belongs to this TUI | Broadcast notifications can be observed by other connections and are not ownership authority. |
| Codex internal background thread ownership | Non-client-originating traffic is not a same-connection request/response binding signal. |
| Future `sessionStartSource` enum values | Only `"clear"` and `null` were measured for `thread/start`; future values must be passed through without proxy-side policy invention. |

## 5. Lazy Observation Cost Model

The proxy has two separate responsibilities:

- Relay obligation: forward every Codex TUI <-> app-server frame unchanged.
- Attribution observation: read only the small binding windows around
  `thread/start`, `thread/resume`, and `thread/fork` request/response pairs.

The legacy cost-model record identified the mismatch in parsing every frame:
most traffic is relay-only, while binding windows are rare and short. The
preserved lazy-observation rule is:

- Client -> server frames are relayed first, then considered for observation
  only if they contain a binding-method needle such as `"thread/start"`,
  `"thread/resume"`, or `"thread/fork"`.
- Server -> client frames are relayed first, then considered for observation
  only while a binding request is pending.
- Matching successful responses with `result.thread.id` emit binding candidates;
  matching error responses do not mutate binding.

This reduces JSON parsing on large non-binding frames while preserving the
transparent relay contract and same-client binding correctness.

## 6. Future `sessionStartSource` Handling

The measured values are `"clear"` for `/clear` and `null` for `/new`. The proxy
must not assume that this enum is closed. If Codex adds values such as
`"compact"` or another source label, the proxy can surface the raw string as
observation data and leave rebind policy to daemon-side code. Unknown values do
not justify dropping, rewriting, or blocking frames.

## 7. Disposition

The legacy `docs/aiox/proxy-attribution-signals.md` and
`docs/aiox/proxy-cost-model.md` files are delete candidates at the workspace
reset physical deletion gate. Their current WHY is owned by
`docs/decisions/proxy-lazy-observation-cost-model.md`; this digest preserves the
measured signal mapping, response fields, known/unknown boundary, and
lazy-observation trace needed after the legacy records are removed.
