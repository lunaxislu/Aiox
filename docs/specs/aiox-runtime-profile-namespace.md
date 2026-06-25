# aiox A2A — Runtime Config / Profile Namespace (§3.1)

> 컨텍스트: [[aiox-a2a]] 인덱스. 상태 어휘·layer model·glossary는 인덱스가 소유한다.

### 3.1 Runtime config / profile namespace

**Status: Current for profile and socket path resolution; current scaffold plus
Implementation Gap for state DB path wiring.** The reference runtime uses one
profile namespace bundle for daemon socket and future state DB paths. Profile
selection is `dev | build | release`; `AIOX_PROFILE` wins over binary-path
detection, and invalid profile names fail fast. Current code evidence:
[[src/config/paths.ts]] — `src/config/paths.ts:15-37`,
[[tests/unit/config/paths.test.ts]] — `tests/unit/config/paths.test.ts:14-52`.

`AIOX_SOCKET_PATH` is the top-priority daemon socket override. It MUST be an
absolute path; a relative override is a configuration error because child
agents can launch from different working directories. Without the override,
`release` uses `~/.aiox/daemon.sock`, while `dev` and `build` use
`~/.aiox/<profile>/daemon.sock`. Current code evidence:
`src/config/paths.ts:88-102`, `tests/unit/config/paths.test.ts:55-84`.

`AIOX_DB_PATH` follows the same absolute override and profile namespace
resolver contract for the future file-backed state DB path. However, this is
not an active durable-store guarantee: the production daemon currently opens
`:memory:` and does not wire `getStatePath()` into daemon startup. Current
resolver evidence: `src/config/paths.ts:105-120`,
`tests/unit/config/paths.test.ts:87-123`. Current production gap evidence:
[[src/daemon/run.ts]] — `src/daemon/run.ts:24-26`.

CLI and adapter-launched child agents inherit the resolved socket namespace.
The CLI starts the daemon with one resolved socket path, and launch adapters
receive that path through `AIOX_SOCKET_PATH`; canonical agent identity remains
the logical `agent://local/<profile>/<agent-name>` address, not a filesystem
socket path. Current evidence: [[src/bin/aiox.ts]] — `src/bin/aiox.ts:78-102`,
`src/bin/aiox.ts:166-180`, `src/cli/invocation.ts:200-254`,
`src/adapters/codex/launcher.ts:88-119`,
`src/adapters/claude/launcher.ts:94-118`.
