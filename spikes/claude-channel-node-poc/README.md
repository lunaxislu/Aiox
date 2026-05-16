# Claude Channel Node PoC

Purpose: verify that a bare Node.js MCP server can register as a Claude Code
channel and push `notifications/claude/channel` into the active Claude Code
session.

This is pre-MVP validation only. It should prove the adapter direction before
the real `aiox` daemon/router is implemented.

## What This Tests

- Node.js, not Bun, can run the channel MCP server.
- Claude Code can launch it from `.mcp.json` as `server:aiox-channel-poc`.
- `capabilities.experimental["claude/channel"]` registers the channel.
- `POST /send` becomes a `notifications/claude/channel` event.
- Claude can optionally call the `reply` tool with the same `chat_id`.

## Temporary `.mcp.json`

Create this in the repo root while testing:

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

## Run

From the repo root, start Claude Code with the development channel:

```bash
claude --dangerously-load-development-channels server:aiox-channel-poc
```

Claude should spawn the MCP server. The server logs to stderr. Look for:

```json
{"event":"http_listening","url":"http://127.0.0.1:18788/send"}
```

In another terminal, send an inbound event:

```bash
curl -X POST http://127.0.0.1:18788/send \
  -H 'content-type: application/json' \
  -d '{"content":"Say exactly: aiox channel received. Then call the reply tool with chat_id test-001.","chat_id":"test-001","origin":"manual"}'
```

## Success Criteria

One-way success:

- The curl returns `{"ok":true}`.
- Claude terminal receives the channel message and reacts in the current
  session.

Two-way success:

- Claude calls the `reply` tool.
- The MCP server stderr includes a JSON line like:

```json
{"event":"reply","chat_id":"test-001","text":"..."}
```

## Failure Notes

- If Claude says the channel is blocked by org policy, channels must be enabled
  for the account/org.
- If `curl` cannot connect to port `18788`, Claude did not spawn the server or
  the server failed before starting HTTP ingress.
- If curl succeeds but Claude does not react, the MCP notification reached the
  SDK call path but was not accepted as a Claude channel event.
