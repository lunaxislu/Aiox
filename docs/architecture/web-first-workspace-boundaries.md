# AIOX Web-first Workspace Boundaries

Status: Current

This slice owns the Web-first rewrite's physical workspace composition, package
responsibility boundaries, allowed internal dependency directions, and the checks that
keep those directions intact. Runtime lifecycle state, transition ownership, and
side-effect ordering remain owned by
[[docs/architecture/web-first-runtime-lifecycle]]. External runtime-control meanings
remain owned by [[docs/specs/aiox-runtime-control]].

## Physical composition [Status: As-built]

The repository keeps the pre-rewrite root package and its `src/**` implementation while
the Web-first workspace is built beside it. The new workspace contains ten private ESM
packages:

```text
AIOX repository
├─ legacy root package — pre-rewrite implementation and validation surface
└─ Web-first workspace
   ├─ apps
   │  ├─ cli
   │  ├─ server
   │  └─ web
   ├─ packages
   │  ├─ protocol
   │  ├─ domain
   │  ├─ config
   │  ├─ database
   │  └─ adapter-sdk
   └─ adapters
      ├─ claude-cli
      └─ codex-cli
```

Every workspace exposes an independently buildable public ESM entry. The protocol
package now exports the Stage 2 Gateway frame, snapshot, error, endpoint-discovery,
authenticated-subscription, and reconnecting-client boundaries. The server app owns the
loopback listener, Host/Origin-checked authenticated Control session, minimal
GatewayState/shutdown admission coordinator, static-file serving, background process,
and endpoint/session/lock publication/cleanup. The CLI app owns the Node transport,
process/browser adapters and root lifecycle command presentation while consuming protocol
state authoritatively. The web app owns the React/Vite static shell, browser Control
transport, in-memory credential bootstrap and GatewayStore client projection. The
remaining shared packages/adapters are empty entry skeletons until their owning Work
Items implement them. These physical boundaries do not imply that deferred product
domain APIs already exist; the legacy root package also remains physically present until
the later canonical cutover Stage.

The private protocol package resolves its `types` condition to `src/index.ts` so a clean
workspace can typecheck protocol consumers before any generated output exists. Its
runtime `import` condition remains `dist/index.js`, and the build still emits the public
declaration file. Other still-empty workspaces retain generated declaration entries until
their first real cross-workspace consumer requires the same clean-tree split.

Each workspace also owns one package-local source alias:

```text
@/*
└─ <owning workspace>/src/*
```

The alias is declared independently in each workspace `tsconfig.json`; it cannot resolve
outside that workspace's `src` directory. It is distinct from `@aiox/*`, which remains the
public-name boundary for imports between workspace packages. No `baseUrl` is set because
TypeScript resolves `paths` entries relative to the config file that declares them.

This Stage establishes TypeScript source resolution only. TypeScript does not rewrite a
`paths` alias in emitted JavaScript, so an executable consumer must not use `@/*` at runtime
until its owning Stage configures and verifies the corresponding bundler or runtime resolver.

Evidence:

- Workspace discovery and root orchestration
  - [[pnpm-workspace.yaml]]
    - `pnpm-workspace.yaml:1-4`
  - [[package.json]]
    - `package.json:2-19`
- Package identities and public entry boundaries
  - [[scripts/check-workspace-boundaries.mjs]]
    - `scripts/check-workspace-boundaries.mjs:6-32`
    - `scripts/check-workspace-boundaries.mjs:98-132`
  - [[tests/workspace/monorepo-foundation.test.ts]]
    - `tests/workspace/monorepo-foundation.test.ts:11-102`
  - [[tests/workspace/app-entry-boundaries.test.ts]]
    - `tests/workspace/app-entry-boundaries.test.ts:16-68`
  - [[tests/workspace/package-entry-boundaries.test.ts]]
    - `tests/workspace/package-entry-boundaries.test.ts:22-85`
  - [[packages/protocol/src/index.ts]]
    - `packages/protocol/src/index.ts:1-7`
  - [[packages/protocol/package.json]]
    - `packages/protocol/package.json:1-18`
  - [[packages/protocol/src/endpoint-discovery.ts]]
    - `packages/protocol/src/endpoint-discovery.ts:3-12`
  - [[apps/server/src/bootstrap/local-server.ts]]
    - `apps/server/src/bootstrap/local-server.ts:31-147`
  - [[apps/server/src/gateway/control/websocket-server.ts]]
    - `apps/server/src/gateway/control/websocket-server.ts:5-59`
  - [[apps/server/src/gateway/control/authenticated-session.ts]]
    - `apps/server/src/gateway/control/authenticated-session.ts:13-137`
  - [[packages/protocol/src/reconnecting-client.ts]]
    - `packages/protocol/src/reconnecting-client.ts:16-217`
  - [[packages/protocol/src/server-lifecycle.ts]]
    - `packages/protocol/src/server-lifecycle.ts:3-25`
  - [[apps/server/src/gateway/state/shutdown-coordinator.ts]]
    - `apps/server/src/gateway/state/shutdown-coordinator.ts:10-139`
  - [[apps/cli/src/operations.ts]]
    - `apps/cli/src/operations.ts:17-283`
  - [[apps/cli/src/node-platform.ts]]
    - `apps/cli/src/node-platform.ts:15-169`
  - [[apps/web/src/index.ts]]
    - `apps/web/src/index.ts:1-3`
  - [[apps/web/src/gateway-store.ts]]
    - `apps/web/src/gateway-store.ts:12-147`
  - [[apps/web/vite.config.ts]]
    - `apps/web/vite.config.ts:1-10`
  - [[tests/browser/gateway-store.test.tsx]]
    - `tests/browser/gateway-store.test.tsx:91-216`
  - [[tests/workspace/web-build-output.test.ts]]
    - `tests/workspace/web-build-output.test.ts:5-23`
  - [[tests/integration/local-server-bootstrap.test.ts]]
    - `tests/integration/local-server-bootstrap.test.ts:17-274`
  - [[tests/integration/gateway-session.test.ts]]
    - `tests/integration/gateway-session.test.ts:47-179`
  - [[tests/integration/web-first-cli-bin.test.ts]]
    - `tests/integration/web-first-cli-bin.test.ts:44-160`
  - [[tests/contract/gateway-protocol.test.ts]]
    - `tests/contract/gateway-protocol.test.ts:45-451`
  - [[tests/workspace/local-source-alias.test.ts]]
    - `tests/workspace/local-source-alias.test.ts:1-64`

## Responsibility placement [Status: Target]

```text
Gateway clients                      Local Server composition
├─ apps/cli ──────────┐                ┌─ apps/server
└─ apps/web ──────────┴─ protocol ───────┘
                                         ├─ domain
Vendor bindings                          ├─ config
├─ adapters/claude-cli ──┐              ├─ database ──→ domain
└─ adapters/codex-cli ───┴─ adapter-sdk ──┘
```

- `apps/cli` and `apps/web` are Gateway clients and projection surfaces. They do not own
  authoritative runtime state.
- `apps/server` is the Local Server composition root. It assembles protocol, domain,
  configuration, persistence, and adapter-facing capabilities without moving those
  responsibilities into the app entry.
- `packages/protocol` owns transport-facing Gateway message types and framing boundaries;
  it does not own domain transition policy.
- `packages/domain` owns platform-neutral runtime entities, policies, and transition
  rules. It must not acquire React, Node process, SQLite, WebSocket, app, or adapter
  dependencies.
- `packages/config` owns configuration loading and validation boundaries.
- `packages/database` owns persistence mapping and repositories while consuming domain
  concepts rather than defining them.
- `packages/adapter-sdk` owns vendor-neutral Adapter Runtime Binding contracts.
- `adapters/claude-cli` and `adapters/codex-cli` own vendor-specific bindings behind the
  adapter SDK.

The exact exported symbols, Gateway wire names, database schema, adapter fields, React
shell, and vendor launch behavior are deferred to the stages that implement those
contracts. This slice does not select compatibility aliases or dual paths for them.

## Allowed dependency direction [Status: As-built]

The current workspace manifests and fail-closed boundary checker allow only these workspace
edges:

```text
apps/cli ------------------------------> packages/protocol
apps/web ------------------------------> packages/protocol
apps/server ---------------------------> packages/protocol
            ├──────────────────────> packages/domain
            ├──────────────────────> packages/config
            ├──────────────────────> packages/database ──> packages/domain
            └──────────────────────> packages/adapter-sdk
adapters/claude-cli ──────────────> packages/adapter-sdk
adapters/codex-cli ───────────────> packages/adapter-sdk
```

An omitted edge is forbidden until a later stage establishes a real consumer need and
updates this owner, manifests, checker, and tests together. The checker discovers the
workspace package set and rejects both undeclared packages and relative imports that
escape a package root. In particular, domain stays platform-neutral and no shared
package depends back on an app or built-in adapter.

Evidence:

- Exact manifest and source-import audit
  - [[scripts/check-workspace-boundaries.mjs]]
    - `scripts/check-workspace-boundaries.mjs:6-32`
    - `scripts/check-workspace-boundaries.mjs:69-96`
    - `scripts/check-workspace-boundaries.mjs:98-208`
- Positive, negative, and public-name import smoke
  - [[tests/workspace/dependency-direction.test.ts]]
    - `tests/workspace/dependency-direction.test.ts:28-235`

## Verification flow [Status: Current]

```text
frozen workspace install
→ boundary lint and forbidden-edge audit
→ legacy root + recursive typecheck
→ legacy root + recursive build
→ root tests + every package test command
→ built package public-name import smoke
→ built CLI/server/React bundle authenticated bootstrap and cleanup smoke
```

The root `lint`, `typecheck`, `build`, `test`, and `check` commands fail when a required
child command is absent. The dependency checker also validates package identity,
privacy, public exports, exact workspace edges, and source imports.
