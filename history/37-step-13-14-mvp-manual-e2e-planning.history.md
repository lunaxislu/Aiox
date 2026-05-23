# Step 13/14 — MVP manual E2E planning after Step 12

## Status

- Date: 2026-05-23
- Phase: planning / authority document update.
- Trigger: after Step 12 doctor/status completion, user asked whether they can
  directly run `aiox` with real Codex and Claude and make them exchange
  messages.

## Finding

Step 12 made observability usable, but real manual Codex/Claude E2E is still
blocked by two separate gaps.

1. Codex source path is missing.

   The daemon can inject into Codex through the per-agent Codex app-server
   `turn/start` path. Claude can send back into daemon through the Claude
   channel reply callback. However, Codex does not yet have an authoritative
   path to send or reply into daemon.

   Result: `Claude -> daemon -> Codex` can be represented by the implemented
   paths, but `Codex -> daemon -> Claude` is not complete.

2. Most CLI commands do not yet reuse a long-running daemon.

   `aiox daemon status` was corrected in Step 12 to be read-only and can inspect
   an existing socket. Other user-facing commands still go through
   `runtime.getDaemonApi()`, whose current socket runtime starts an in-process
   daemon for that command if needed. With the current `:memory:` DB default,
   separate terminal invocations do not reliably share one durable daemon state.

   Result: even after the Codex source path exists, manual multi-terminal E2E
   still needs daemon/client reuse work.

## Decision

Split the remaining MVP enablement into two steps.

### MVP daemon namespace skeleton

For Step 13, aiox treats the default daemon as a user-local singleton selected
by socket path.

- Same configured socket path means same daemon namespace.
- Agent and pair names remain unique inside the selected daemon namespace.
- Agent `cwd` is recorded for observability/debug output, but it does not create
  a project namespace in MVP.
- Agent-level runtime MCP/channel receives the socket path and daemon-issued
  agent token at launch time, so a launched agent talks only to its selected
  daemon.

Deferred Post-MVP namespace decisions:

- project-local daemon vs user-local singleton;
- project-root namespace inside one daemon;
- current-project filtered status;
- same pair/agent name reuse across projects.

### MCP category split

aiox has two MCP categories:

1. aiox-level control MCP

   Optional user-installed control plane. External tools can use it to operate
   daemon/pairs/routes/status. Project/global setup commands belong here and are
   Post-MVP unless explicitly pulled forward.

2. agent-level runtime MCP/channel

   aiox-managed data plane. `aiox codex` and `aiox claude` attach this to the
   launched agent session so the agent can send/reply through daemon. Users
   should not have to manually install this globally. MVP must not mutate global
   Codex or Claude config by default.

Step 13 implements the Codex side of the agent-level runtime MCP/callback path,
not the optional aiox-level control MCP.

### Step 13: Codex source path + reply ingress

Purpose: close the `Codex -> daemon` direction.

Required outcomes:

- Use explicit aiox-managed agent-level MCP/tool callback as the MVP Codex
  outbound mechanism. App-server notification scraping is not the authoritative
  path.
- Add an adapter-facing API for Codex-originated outbound messages.
- Route Codex-originated messages through the existing daemon/router
  `sendMessage` behavior.
- Support Codex replies with `parent_message_id` where the source event/call
  carries a parent reference.
- Preserve existing daemon -> Codex injection behavior.
- Resolve Codex source identity using launch-injected socket path plus
  daemon-issued agent token or equivalent capability, not user-provided hidden
  ids and not agent name alone.

### Step 14: Long-running daemon/client reuse + manual E2E smoke

Purpose: make independent terminal commands share the same daemon process and
state, then document/run the real smoke path.

Required outcomes:

- Separate daemon creation from normal CLI client connection.
- Keep `aiox daemon status` read-only.
- Make `aiox pair`, `aiox codex`, `aiox claude`, `aiox connect`, and
  `aiox status` operate on the same long-running daemon across terminal
  invocations.
- Add socket client reuse tests without real Codex/Claude.
- Add a manual smoke flow for real Codex + real Claude.

## Trade-off

Combining both gaps into one step would get to manual E2E faster on paper, but
it would mix two different failure domains:

- agent protocol/source-path behavior;
- daemon lifecycle/client-process behavior.

Keeping them separate makes red/green tests smaller and makes regressions easier
to assign to the right layer.

## Reversibility

This split is cheap to revise. If Step 13 implementation proves that daemon
client reuse is a small prerequisite, Step 14 work can be pulled forward without
changing product semantics. If Codex source path needs a different mechanism
than expected, only Step 13 scope changes.

## Deferrability

The decision is not deferrable if the goal is a real MVP manual smoke with
Codex and Claude. Without Step 13, Codex cannot send/reply through aiox. Without
Step 14, separate human-run CLI invocations do not share one reliable daemon
state.

## Documentation updates

- `prd/mvp/aiox-mvp-spec.md`
  - Updated `doctor` to match the corrected runtime-only check list.
  - Added current implementation status under Message Flow.
  - Marked Codex source path as the remaining Codex adapter gap.
  - Added MVP daemon namespace skeleton.
  - Added two-category MCP model: optional aiox-level control MCP vs
    aiox-managed agent-level runtime MCP/channel.
  - Clarified that real manual E2E requires both Codex source path and
    long-running daemon/client reuse.
- `plan/mvp-implementation-checklist.md`
  - Added Step 13 planned scope.
  - Added Step 14 planned scope.
