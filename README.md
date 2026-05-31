# aiox

Local multi-agent orchestration for Codex and Claude.

## Development

Run the TypeScript entrypoint directly:

```bash
pnpm dev daemon start
pnpm dev daemon stop
pnpm dev daemon status
pnpm dev claude --name claude-smoke
pnpm dev codex --name codex-smoke
pnpm dev pair --name smoke-pair
```

## Build Smoke

Build first, then use the package scripts that call the built `dist` entrypoint:

```bash
pnpm build
pnpm start
pnpm status
pnpm claude --name claude-smoke
pnpm codex --name codex-smoke
pnpm pair --name smoke-pair
pnpm stop
```

## Claude Plugin Setup

Claude channel-as-plugin is the default Claude channel strategy. Before running
`aiox claude`, provision the local Claude plugin once:

```bash
pnpm dev claude-plugin setup
```

Default scope is `user`. Project-local setup is also supported:

```bash
pnpm dev claude-plugin setup --scope project
```

After build:

```bash
pnpm claude-plugin setup
```

## Claude Channel Strategy

Default:

```bash
pnpm dev claude --name claude-smoke
```

This uses the Claude plugin channel:

```text
plugin:aiox-channel-ingress@aiox
```

For explicit legacy inline debugging only:

```bash
AIOX_CLAUDE_CHANNEL_STRATEGY=inline pnpm dev claude --name claude-inline
```

Allowed values:

```text
unset/plugin -> plugin strategy
inline       -> legacy inline strategy
```

Invalid values fail fast. There is no automatic fallback from plugin to inline.

## Manual Routes

Use this path when you want to attach agents first and connect routes manually.

```bash
pnpm build
pnpm stop
pnpm start
pnpm codex --name codex-smoke
pnpm claude --name claude-smoke
pnpm connect claude-smoke codex-smoke
pnpm connect codex-smoke claude-smoke
pnpm status
```

## Pair Reservation

Use this path when you want a named pair to create the bidirectional routes once
both agents attach.

Terminal A:

```bash
pnpm build
pnpm stop
pnpm start
pnpm pair --name smoke-pair
```

Terminal B:

```bash
pnpm codex --name codex-smoke --pair smoke-pair
```

Terminal C:

```bash
pnpm claude --name claude-smoke --pair smoke-pair
```

Terminal A:

```bash
pnpm status
```
