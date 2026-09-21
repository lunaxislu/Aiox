# AIOX YAML

Host YAML authoring for VS Code and Cursor. Files named `aiox.yaml` and
`aiox.*.yaml` are recognized automatically, including in nested folders.

- Field/value completion, descriptions and structural validation through Red Hat YAML.
- Agent reference completion and go to definition within the current file.
- Unknown Agent, Network membership, self-route, duplicate and conflicting route diagnostics.
- Hover explanations for optional Host instructions and routing defaults.

The extension reads unsaved editor content. It does not run AIOX, invoke vendors,
modify the YAML, or connect to a daemon. The displayed policy describes the file,
not a running Host's applied configuration. Formatting is provided by Red Hat YAML.

## Install locally

From the repository root:

```sh
pnpm --filter aiox-yaml package
```

In VS Code or Cursor, run **Extensions: Install from VSIX…** and select
`packages/IDE/vscode/dist/aiox-yaml.vsix`. Install/enable **YAML by Red Hat**
(`redhat.vscode-yaml`) when prompted. Then open an `aiox.yaml` or `aiox.dev.yaml`.
No custom file association is necessary.

The manifest targets VS Code API 1.96 or newer. Cursor must provide a compatible
extension API and Red Hat YAML. Local installation is separate from marketplace
publication; the `aiox` publisher name is a local identifier, not a verified or
registered marketplace account.

## Develop and verify

```sh
pnpm --filter aiox-yaml test
pnpm --filter aiox-yaml typecheck
pnpm --filter aiox-yaml build
code --extensionDevelopmentPath="$PWD/packages/IDE/vscode"
```

In the development window, enable Red Hat YAML and try this file:

```yaml
host:
    name: review-team
agents:
    reviewer:
        adapter: claude
    implementer:
        adapter: codex
networks:
    team:
        agents: [reviewer, implementer]
        routing:
            allow:
                - from: reviewer
                  to: [implementer]
```

Check field suggestions, Agent suggestions inside `agents`/`from`/`to`/`between`,
and go to definition on a reference. Change a reference to an unknown name and
duplicate a route; each should receive an error at its source position. Remove
`routing` and hover over the Network to see the default `allow`. Check unsaved
edits and `aiox.dev.yaml`, and verify that `custom.yaml` receives no AIOX features.
Repeat these checks in Cursor before declaring that editor verified.

## Ownership

Verified with VS Code 1.135.0 and Red Hat YAML 1.24.0: both filename patterns,
schema diagnostics, Agent completion, definition navigation, default hover,
unsaved reference errors and stale diagnostic clearing. Cursor is a compatibility
target; it has not yet been tested because it is not installed in the test environment.

The Host input contract in `docs/specs/aiox-host.md` owns YAML semantics.
`schemas/aiox.schema.json` implements structural rules; `src/document.ts` handles
source locations and cross references; `src/extension.ts` adapts these results to
VS Code APIs. No separate AIOX language server is used. The schema tests use Ajv
only to exercise the JSON Schema delivered to Red Hat YAML; Ajv is not bundled
in the installed extension.
