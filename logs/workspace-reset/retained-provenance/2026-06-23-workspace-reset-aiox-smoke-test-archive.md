---
topic: aiox manual smoke and E2E test trace archive
description: workspace reset W3 archive digest for legacy docs/aiox manual test records (Round 4 TUI smoke, Step 14 daemon-client E2E)
status: decided
---

## Work Items

## 2026-06-23 · W3 archive digest — docs/aiox manual smoke/E2E traces

This archive is the workspace reset successor for two legacy `docs/aiox/`
manual-test learning records:

- `docs/aiox/round-4-tui-smoke-check.md` (Step 10 Round 4 TUI smoke, run 2026-05-21)
- `docs/aiox/step-14-smoke-test-report.md` (Step 14 daemon-client split E2E)

It preserves the manual smoke/E2E procedures, executed commands, observed
results, and blocker traces that the current architecture/decision owners do not
carry at the same density. Automated tests verify the *call shape and state
transitions* of aiox code; these manual records verify that those promises hold
against the real `codex`/`claude` binaries, the real terminal, and the real
daemon socket. W10 split/checker PASS classified both `archive→delete after
digest` (`logs/workspace-reset/packages/2026-06-22-workspace-reset-W10-split-readiness-map.md`), meeting
the Archive Gate (`logs/AGENTS.md`) preservation-value + self-sufficiency
condition. After this digest the legacy `docs/aiox/` sources can be physically
deleted at the workspace reset deletion gate
(`plans/workspace-reset/workspace-reset.md`).

## 1. Round 4 Manual TUI Smoke Check

Original source: legacy `docs/aiox/round-4-tui-smoke-check.md`.

### Why manual (Preserved Context)

- Round 4's 220 automated tests verify which args/order aiox uses to invoke
  `codex` and the resulting state transitions, with `spawn` stubbed at the
  boundary `spawn("codex", ["--remote", ...], { stdio: "inherit" })`.
- They do not see the real `codex` binary, foreground terminal, alt-screen,
  banner stderr format, real `app-server` `--listen` port, or the real
  `--remote` connection. The manual smoke closes:
  real PATH -> real codex binary -> app-server banner -> readyz/listen ->
  foreground TUI -> user input -> exit/rollback cascade.
- The decision context: Round 4 D3.4 launches the Codex TUI as a CLI child with
  `stdio: "inherit"`, so reproducing it fully in automation would need a pty,
  alt-screen capture, real auth/config, and timing control (a separate E2E
  harness), which Round 4 closeout deliberately did not build.

### Scenarios and 2026-05-21 Manual Results (Preserved Trace)

- **S1 fresh attach golden path — PASS.** `pnpm tsx src/bin/aiox.ts codex --name alpha`.
  Real Codex TUI opened; user input `hello from aiox smoke` was processed and
  answered; `/exit` returned to shell; `echo $?` was `0`; no leftover aiox
  `--listen` app-server / `--remote` TUI / `codex resume` processes. Resume id
  captured: `019e4a3e-ef83-7ee2-a55d-6d7eed96b129`. (An unrelated VS Code
  `codex app-server --analytics-default-enabled` process was present but is not
  the aiox `--listen` app-server, so not a failure signal.)
- **S2 explicit resume — PASS.** `... codex --name alpha --resume 019e4a3e-...`.
  TUI opened on the existing thread/session; `resume smoke` input processed;
  exit `0`; no leftover. A Codex `Conversation interrupted` message was not
  treated as an aiox attach/resume failure because the TUI opened, input was
  processed, and exit was clean.
- **S3 resume id mismatch — PASS.** `... --resume 00000000-0000-0000-0000-000000000000`
  produced `no rollout found for thread id 00000000-...` with `exit=1`; no TUI
  opened, no silent rebind to another id, no leftover. (First `echo $?` of `0`
  was measured in a fresh terminal and was not the failing command's exit code.)
- **S4 TUI spawn failure rollback — partial PASS + S4-full PASS.**
  - Partial (wrapper): a PATH-front wrapper forwarded `codex app-server` to real
    Codex and made the TUI step `exit 127`. TUI did not open; `echo $?` `127`;
    no leftover. This covers "TUI child immediate failure", not the `spawn`
    ENOENT/EACCES itself.
  - Full: `AIOX_CODEX_TUI_COMMAND=/tmp/nonexistent-codex pnpm tsx src/bin/aiox.ts codex --name s4-smoke`
    produced `spawn /tmp/nonexistent-codex ENOENT`, `exit=1`. The app-server
    launched with the real `codex` command, only the TUI `spawn` failed; the
    immediately-visible app-server was gone after the rollback cascade's ~3s
    grace window (`no leftover`). This closes the D3.6 `spawn` ENOENT rollback
    path. The launcher env override is a testability surface; the production
    default remains `codex`.
- **S5 claude `--resume` reject — PASS.** `... claude --name reviewer --resume fake`
  produced commander `error: unknown option '--resume'`, rejecting at the parse
  layer before any daemon or adapter runtime launch (`--resume` is Codex-only).

### Current Owners After Absorption

- TUI launch / explicit resume / binding-id replacement / spawn-failure rollback
  WHY: `docs/decisions/codex-per-agent-app-server.md`,
  `docs/decisions/codex-d7-authoritative-binding-scope.md`.
- As-built launcher/runtime structure: `docs/architecture/local-agent-runtime.md`.
- Original step provenance: legacy Step 10 Phase A decision record and legacy
  Step 10 Phase B Codex runtime record. Surviving provenance is this digest plus
  `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §2.2.

## 2. Step 14 Manual E2E Smoke Test

Original source: legacy `docs/aiox/step-14-smoke-test-report.md`. Goal: verify
communication and lifecycle between the background daemon and separated CLI
clients (Codex, Claude) after Step 14 (daemon-client split). Environment: macOS
terminal, local Unix socket `/tmp/aiox-smoke.sock`.

### Procedure (Preserved)

`pnpm build` + `export AIOX_SOCKET_PATH=/tmp/aiox-smoke.sock`; `daemon status` /
`daemon start` / `daemon status`; `pair --name p1` + `status`; in separate
terminals `codex --name impl --pair p1` and `claude --name reviewer --pair p1`;
`status`; `daemon stop`.

### Blocking Issues Found (Preserved — both later resolved)

- **Blocker 1: daemon immediate exit (exit 0).** The detached daemon process
  exited with code 0 right after start, so the socket was not held.
  Root cause: `src/bin/aiox.ts` `main()` calls `process.exit(await runAioxCli())`,
  while `src/daemon/run.ts` `runDaemonProcess` resolved immediately after starting
  the socket server with no pending promise; the outer `process.exit(0)` killed
  the event loop despite the "socket server keeps the loop alive" comment.
  Solution direction: `runDaemonProcess` returns a `Promise` that only resolves
  on a graceful-shutdown signal (`SIGTERM`/`SIGINT`).
- **Blocker 2: Claude channel server `.mcp.json` mismatch.** `aiox claude --name
  reviewer --pair p1` launched Claude, but Claude could not find the channel
  server, so the channel connection failed.
  Root cause: aiox built a dynamic channel name `aiox-claude-{name}` (e.g.
  `aiox-claude-reviewer`) and passed it as `server:aiox-claude-reviewer`, but
  Claude Code uses the channel name as an exact `.mcp.json` lookup key; the
  static `.mcp.json` had no such hardcoded key.
  Solution direction: fix one static channel name (`aiox-claude-ingress`) in
  `.mcp.json` pointing at the production channel-server script, and pass the
  agent identity via env `AIOX_CLAUDE_CHANNEL_AGENT_NAME` so the channel server
  (grandchild process) inherits it; change `src/cli/invocation.ts` from a
  composed `aiox-claude-${command.name}` to the fixed name. This avoids `.mcp.json`
  race conditions and dynamic file I/O while keeping per-agent identity.

### Verified Items (Preserved)

Daemon state sharing across separate CLI processes over the same Unix socket;
`mcp-codex` MCP stdout not polluted, daemon connection ok; `aiox daemon stop`
graceful shutdown with socket `unlink` cleanup; no EPERM socket
create/bind issues in a normal terminal (the earlier EPERM was sandbox-specific).

### Current Owners After Absorption

- Daemon lifecycle / autostart / channel identity WHY:
  `docs/decisions/daemon-autostart-and-channel-identity.md`.
- UDS transport/framing contract: `docs/decisions/uds-transport-and-framing-contract.md`.
- Codex app-server MCP injection/isolation (Step 14 empirical bug WHY):
  `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`.
- As-built daemon-client structure: `docs/architecture/local-agent-runtime.md`.
- Original step provenance: legacy Step 14 daemon/client split record. Surviving
  provenance is this digest plus `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §2.3.

## 3. Disposition

- Both `docs/aiox/` files are delete candidates at the workspace reset physical
  deletion gate. Their accepted conclusions and WHY live in the decision and
  architecture owners listed above; this digest preserves the manual
  procedures, executed commands, observed measurements, PASS/PARTIAL traces, and
  blocker root-cause/solution traces that those owners do not carry at the same
  density.
- Legacy step records 33/34/40 are superseded by the surviving decision,
  architecture and archive owners listed above; W5 history migration and the
  workspace reset physical deletion gate own their final physical deletion.
