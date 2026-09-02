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

Each new package currently exposes an empty, independently buildable public ESM entry.
The physical boundary does not imply that deferred product APIs or runtime behavior
already exist.

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
    - `tests/workspace/package-entry-boundaries.test.ts:22-74`
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
```

The root `lint`, `typecheck`, `build`, `test`, and `check` commands fail when a required
child command is absent. The dependency checker also validates package identity,
privacy, public exports, exact workspace edges, and source imports.
