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

## Runtime Profiles & Namespace Isolation

`aiox` separates its daemon socket (and future state DB) by _runtime profile_ so
development, build-smoke, and installed-release runs never talk to each other's
daemon. The profile is resolved once via `resolveProfile()`:

- `AIOX_PROFILE` (`dev` | `build` | `release`) wins when set. The package scripts
  inject it — `pnpm dev` → `dev`, the `dist`-runner scripts → `build`.
- otherwise the bin path is sniffed: `*.ts` → dev, under `node_modules` → release,
  under `dist/` → build, else release. Installed binaries land on `release`.

Socket path per profile:

| profile | socket                                      |
| ------- | ------------------------------------------- |
| dev     | `~/.aiox/dev/daemon.sock`                   |
| build   | `~/.aiox/build/daemon.sock`                 |
| release | `~/.aiox/daemon.sock` (backward compatible) |

So `pnpm dev daemon start` and `pnpm start` run fully independent daemons —
stopping one leaves the other alive. No manual `AIOX_SOCKET_PATH` is needed.

```bash
pnpm dev daemon start    # ~/.aiox/dev/daemon.sock
pnpm start               # ~/.aiox/build/daemon.sock — independent
pnpm dev daemon stop     # build daemon stays up
pnpm stop
```

Escape hatch: `AIOX_SOCKET_PATH` (absolute path) overrides everything for extra
isolation; a relative value fails fast. `AIOX_DB_PATH` is the equivalent override
for the (scaffolded) state DB.

Daemon state is currently `:memory:`, so socket separation already separates
state. When a file-backed DB lands it rides the same profile mechanism
(`~/.aiox/<profile>/state.db`).

Supported transport is a Unix domain socket (macOS / Linux). Windows support
(named pipe / TCP) is deferred — see `history/57`.

### External agent config

Socket isolation flows into the spawned agents: the Codex MCP inline config
(`-c`) and the Claude channel plugin both receive the resolved daemon socket as an
explicit `AIOX_SOCKET_PATH` env, so the child never depends on its own cwd or
profile detection.

Two external states are **not** auto-split by profile — verify manually before
release smoke:

- Claude marketplace/plugin install is global Claude state. Confirm the active
  marketplace points at the intended source (dev source vs packaged) so a dev
  source marketplace is not mistaken for release behavior:

  ```bash
  claude plugin marketplace list --json
  claude plugin list --json
  ```

- Codex inline MCP (`-c`) is per-launch, not persistent, so there is no
  `CODEX_HOME` to isolate today. If persistent Codex config is later introduced,
  isolate `CODEX_HOME` per profile.

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
