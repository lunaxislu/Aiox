# aiox

Local multi-agent orchestration for Codex and Claude.

## Development

Run the TypeScript entrypoint directly:

```bash
pnpm dev claude setup   # register the Claude static MCP entry once (Local scope)
pnpm dev daemon stop    # clear any existing dev daemon
pnpm dev daemon start   # start the dev-profile daemon
pnpm dev daemon status  # confirm the daemon is reachable
pnpm dev pair --name smoke-pair  # reserve bidirectional routes
pnpm dev claude --name claude-smoke --pair smoke-pair  # attach Claude in Terminal A
pnpm dev codex --name codex-smoke --pair smoke-pair    # attach Codex in Terminal B
pnpm dev status         # inspect agents, pairs, and routes
pnpm dev stop           # stop the dev daemon
```

## Build Smoke

Build first, then use the package scripts that call the built `dist` entrypoint:

```bash
pnpm build          # compile the dist entrypoint
pnpm claude setup   # register the Claude static MCP entry once (Local scope)
pnpm stop           # clear any existing build daemon
pnpm start          # start the build-profile daemon
pnpm status         # confirm the daemon is reachable
pnpm pair --name smoke-pair  # reserve bidirectional routes
pnpm claude --name claude-smoke --pair smoke-pair  # attach Claude in Terminal A
pnpm codex --name codex-smoke --pair smoke-pair    # attach Codex in Terminal B
pnpm status         # inspect agents, pairs, and routes
pnpm stop           # stop the build daemon
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
(named pipe / TCP) is deferred — see
`docs/decisions/runtime-profile-namespace-isolation.md`.

### External agent config

Socket isolation flows into the spawned agents: the Codex MCP inline config
(`-c`) and the Claude channel's registered Local static MCP both receive the
resolved daemon socket as an explicit `AIOX_SOCKET_PATH` env, so the child
never depends on its own cwd or profile detection.

One external state is **not** auto-split by profile — verify manually before
release smoke:

- Codex inline MCP (`-c`) is per-launch, not persistent, so there is no
  `CODEX_HOME` to isolate today. If persistent Codex config is later introduced,
  isolate `CODEX_HOME` per profile.

## Claude Channel Setup

`aiox claude` activates its channel via a static MCP entry that must be
registered once, before the first attach:

```bash
pnpm dev claude setup                    # scope: local (default)
pnpm dev claude setup --scope user
pnpm dev claude setup --scope project
```

After build:

```bash
pnpm claude setup
```

Registration never overwrites an existing entry under that name — a name
collision in the selected scope fails with Claude's own error message.

`--scope user` and `--scope project` only register the static MCP entry at
that scope; `aiox claude` attach always checks and activates the **Local**
scope entry regardless of which scope you registered. Attaching via a
registered user/project entry is not implemented yet. Then attach normally:

```bash
pnpm dev claude --name claude-smoke
```

If the Local scope is not registered, `aiox claude` fails fast (before
starting the daemon or attaching the agent) with a pointer back to
`aiox claude setup`.

## Manual Routes

Use this path when you want to attach agents first and connect routes manually.

Control terminal:

```bash
pnpm build          # compile the dist entrypoint
pnpm claude setup   # register the Claude static MCP entry once (Local scope)
pnpm stop           # clear any existing build daemon
pnpm start          # start the build-profile daemon
```

Terminal A:

```bash
pnpm codex --name codex-smoke  # attach Codex without a pair
```

Terminal B:

```bash
pnpm claude --name claude-smoke  # attach Claude without a pair
```

Control terminal:

```bash
pnpm connect claude-smoke codex-smoke  # route Claude to Codex
pnpm connect codex-smoke claude-smoke  # route Codex to Claude
pnpm status                            # inspect agents and routes
pnpm stop                              # stop the build daemon
```

## Pair Reservation

Use this path when you want a named pair to create the bidirectional routes once
both agents attach.

Control terminal:

```bash
pnpm build                  # compile the dist entrypoint
pnpm claude setup           # register the Claude static MCP entry once (Local scope)
pnpm stop                   # clear any existing build daemon
pnpm start                  # start the build-profile daemon
pnpm pair --name smoke-pair # reserve bidirectional routes
```

Terminal A:

```bash
pnpm claude --name claude-smoke --pair smoke-pair  # attach Claude
```

Terminal B:

```bash
pnpm codex --name codex-smoke --pair smoke-pair  # attach Codex
```

Control terminal:

```bash
pnpm status  # inspect agents, pairs, and routes
pnpm stop    # stop the build daemon
```
