# Step 15 — D8 MCP Surface Consistency Mini-Step

## Status

- Date: 2026-05-28
- Scope: Step 15 post-closeout D8 source notification surface consistency.
- Trigger: `history/47-step-15-phase-b-closeout.history.md` §Post-closeout follow-up found repeated D8/vendor-pair surface asymmetry after F4.
- Authority context:
  - D8 source notification lock: `history/46-step-15-phase-a-decisions.history.md`
  - Leftover audit tracker: `history/47-step-15-phase-b-closeout.history.md`
  - MVP spec: `prd/mvp/aiox-mvp-spec.md` §Message Flow / §Pair

## Problem

Daemon API ingress paths were already consistent after F4:

- Claude send: `receiveClaudeChannelMessage` → `SendMessageResponse`
- Claude reply: `receiveClaudeChannelReply` → `SendMessageResponse`
- Codex send: `receiveCodexMessage` → `ReceiveCodexMessageResponse`
- Codex reply: `receiveCodexReply` → `ReceiveCodexMessageResponse`

However MCP tool `structuredContent` exposed `dispatch` on only one of four source surfaces:

| MCP source surface | Pre-step dispatch exposure |
|---|---|
| Claude `reply` | yes |
| Claude `send` | no |
| Codex `aiox_send_message` | no |
| Codex `aiox_reply` | no |

This left source agents with inconsistent visibility into deferred/failed target injection even though D8 defines `dispatch` as the nested source notification surface.

## Decision

Expose `dispatch` on all four MCP source surfaces.

Rationale:

- D8 says `ok:true` means the message was accepted/stored; target delivery results belong in nested `dispatch`.
- The source notification value is identical for send/reply and Claude/Codex surfaces.
- Hiding dispatch on send surfaces would preserve UI simplicity, but it would make deferred/failed target injection invisible to the source agent and keep the D8 surface policy asymmetric.

## Implementation

### Structural

- Added shared MCP output schema: `src/adapters/shared/dispatch-schema.ts`.
- Claude channel MCP imports the shared `dispatchSummaryOutputSchema` instead of owning a local copy.
- Codex MCP daemon client interface now uses daemon API request/response types instead of `unknown` responses.
- Codex MCP handlers no longer cast daemon receive responses with local `{ok:boolean}` assertions.

### Behavioral

- Claude `send` tool output schema includes optional `dispatch`.
- Claude `send` structuredContent includes `result.dispatch`.
- Codex `aiox_send_message` output schema includes optional `dispatch`.
- Codex `aiox_send_message` structuredContent includes `result.dispatch`.
- Codex `aiox_reply` output schema includes optional `dispatch`.
- Codex `aiox_reply` structuredContent includes `result.dispatch`.
- Existing Claude `reply` dispatch exposure remains unchanged.

## Verification

- Red phase: six MCP handler tests failed because dispatch was absent from structuredContent:
  - Claude send delivered/deferred
  - Codex send delivered/deferred
  - Codex reply delivered/deferred
- Green phase:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`

## Closeout

Step 15 vendor-pair/D8 source-surface audit is closed by this mini-step. The known repeated category was daemon/MCP source notification asymmetry; after this step the daemon API and all MCP send/reply source surfaces expose the same nested `dispatch` contract. Further Step 15 leftover auditing should resume only on a new concrete signal, not by continuing the previous open-ended grep loop.

