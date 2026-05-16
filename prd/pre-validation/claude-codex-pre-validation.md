# Claude/Codex Pre-Validation

> Date: 2026-05-14
> Project: `aiox`
> Scope: MVP architecture pre-validation

## Purpose

This document records the pre-MVP validation results for the two critical
transcript injection paths:

- Claude Code channel injection through a Node.js MCP channel server.
- Codex app-server injection through WebSocket `thread/loaded/list` and
  `turn/start`.

These checks do not mean the final product UX is complete. They only confirm
that the architecture direction is not blocked.

## Summary

| Area | Result | Decision |
| --- | --- | --- |
| Claude channel server with Node.js | PASS | Claude adapter can be Node.js based |
| Claude transcript injection | PASS | Use `notifications/claude/channel` |
| Claude automatic channel instruction execution | PARTIAL | Injection works, but trust/confirmation policy needs product design |
| Codex shared app-server with multiple remote sessions | PASS | Adapter boundary should allow shared app-server |
| Codex thread-targeted `turn/start` | PASS | Thread id can route turns to distinct Codex UIs |

## Claude Channel Node.js Validation

Spike:

```text
spikes/claude-channel-node-poc/
```

### Setup

The repo root `.mcp.json` registered a bare MCP server:

```json
{
  "mcpServers": {
    "aiox-channel-poc": {
      "command": "pnpm",
      "args": ["tsx", "spikes/claude-channel-node-poc/server.ts"],
      "env": {
        "AIOX_CHANNEL_POC_PORT": "18788"
      }
    }
  }
}
```

Claude Code was launched with:

```bash
claude --dangerously-load-development-channels server:aiox-channel-poc
```

The spike server:

- Creates an MCP server with `capabilities.experimental["claude/channel"]`.
- Connects to Claude over stdio.
- Opens local HTTP ingress at `127.0.0.1:18788/send`.
- Converts `POST /send` into `notifications/claude/channel`.
- Exposes a `reply` tool for two-way confirmation.

### Test Message

```bash
curl -X POST http://127.0.0.1:18788/send \
  -H 'content-type: application/json' \
  -d '{"content":"Say exactly: aiox channel received. Then call the reply tool with chat_id test-001.","chat_id":"test-001","origin":"manual"}'
```

The HTTP response was:

```json
{"ok":true}
```

Claude received the channel message:

```text
aiox-channel-poc: Say exactly: aiox channel received. Then call the reply too...
```

Claude then asked for user confirmation because the instruction came from a
channel message, not directly from the user.

After the user confirmed:

```text
Yes, follow the aiox-channel-poc channel instruction and call the reply tool with chat_id test-001.
```

Claude responded:

```text
aiox channel received.
```

And called the `aiox-channel-poc` reply tool.

### Result

Claude channel Node.js validation passed.

Confirmed:

- Node.js can run the Claude channel MCP server.
- Claude Code can launch the server from `.mcp.json`.
- `capabilities.experimental["claude/channel"]` registers the channel.
- `notifications/claude/channel` injects content into Claude transcript/model
  context.
- Claude can call a channel-provided reply tool.

Open product issue:

- Claude may treat channel-delivered instructions as external/untrusted and ask
  for confirmation. `aiox` needs an explicit trust, policy, and instruction
  design before relying on fully automatic Claude-side execution.

## Codex App-Server Multi-Session Validation

Spike:

```text
spikes/codex-app-server-multi-session-poc/
```

### Setup

One app-server was started:

```bash
codex app-server --listen ws://127.0.0.1:4500
```

Two Codex remote UI sessions were attached:

```bash
codex --remote ws://127.0.0.1:4500
codex --remote ws://127.0.0.1:4500
```

The spike client was then run:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/client.ts inspect
```

Result:

```json
{
  "url": "ws://127.0.0.1:4500",
  "loadedThreadCount": 2,
  "threads": [
    {
      "index": 0,
      "threadId": "019e25b0-8354-75b3-b277-2fda0ce5685e"
    },
    {
      "index": 1,
      "threadId": "019e25b0-ee51-7d63-be4a-a1e8e17f5401"
    }
  ]
}
```

### Targeted Turn Injection

Thread A:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/client.ts send \
  --thread-id=019e25b0-8354-75b3-b277-2fda0ce5685e \
  --text='AIOX PROBE THREAD A: Say exactly "received in thread A".'
```

Observed in Codex:

```text
received in thread A.
```

Thread B:

```bash
pnpm tsx spikes/codex-app-server-multi-session-poc/client.ts send \
  --thread-id=019e25b0-ee51-7d63-be4a-a1e8e17f5401 \
  --text='AIOX PROBE THREAD B: Say exactly "received in thread B".'
```

Observed in Codex:

```text
received in thread B
```

### Result

Codex app-server multi-session validation passed.

Confirmed:

- One `codex app-server` can host multiple loaded remote Codex UI threads.
- `thread/loaded/list` exposes distinct loaded thread ids.
- `turn/start` can target a specific thread id.
- Turns did not appear to cross between the tested sessions.

Open product issue:

- `thread/loaded/list` returns thread ids only. `aiox` still needs a stable UX
  and metadata strategy to map human agent names/tags to the correct loaded
  Codex thread.

## Architecture Implications

The two highest-risk injection paths are technically viable:

```text
Claude: Node MCP channel server -> notifications/claude/channel
Codex: codex app-server WebSocket -> thread/loaded/list -> turn/start
```

The MVP should still keep conservative defaults:

- Claude adapter should assume channel injection works but may need explicit
  trust/confirmation handling.
- Codex adapter should allow a shared app-server boundary, but MVP can still
  choose pair/session-level app-server ownership if that simplifies reliable UX.

Related pre-validation items:

- `cmux` launcher workspace/split/surface and command injection.
- SQLite durable schema and daemon restart recovery was validated separately.
  See
  `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`.
