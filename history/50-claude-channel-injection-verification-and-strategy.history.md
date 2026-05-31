# Claude Channel Injection — Manual Verification + Strategy Investigation

## Status

- Date: 2026-05-29
- Type: manual verification + feasibility investigation (no decision committed; decision deferred to next session)
- Continues: `history/49-claude-mcp-config-injection-feasibility.history.md` (R3 goal lock + initial impl)
- Tracker: `plan/qa-tracker.md` R3
- Outcome in one line: the R3 `--mcp-config` implementation **functions**, but emits a structural cosmetic warning that **cannot be removed without persistent registration**; a third strategy (channel-as-plugin) emerged as the most aligned path but is larger scope + partly unverified. **Final design (A/B/D) deferred to next session.**
- **Update 2026-05-29**: under user's reliability-over-footprint criterion, **A is dropped**; **D (channel-as-plugin) verified doc-feasible** — all five plugin assumptions (`${VAR}` expansion, parent-env source, `${CLAUDE_PLUGIN_ROOT}`, child env inheritance, `plugin:<name>@<marketplace>` activation) are documented-fact. The two blockers that made D "unverified" (dynamic identity into static `.mcp.json`; npm bundling/path) are resolved by docs. Remaining work = an integration spike (non-repo-root), not doc questions. See §"Strategy D — doc verification".
- **DECISION 2026-05-29 (Codex cross-validation): D primary + B fallback + A dev-only.** Triangulated (user + Claude + Codex all → D). Codex added two axes: (1) D's complexity is *controllable* (preflight/idempotency) vs 안1-A's risk is *uncontrollable* (Claude-internal phase-ordering); (2) **reversibility is asymmetric — D→B cheap, B→D expensive → "D first" even if wrong**. First commit = minimal plugin spike + preflight failure contract via TDD → non-repo-root smoke → then retire A. See §"Decision — Codex cross-validation".

## What was implemented (working tree, from the prior session — not yet committed)

Per history/49 §Implementation: `buildClaudeChannelMcpConfig` in `src/adapters/claude/launcher.ts` injects an inline `--mcp-config` JSON (`mcpServers["aiox-claude-ingress"]` = `{command: node, args:[<abs channel-server.js from import.meta.url>], env:{identity 3종}}`) alongside the dev-channel flag; `.mcp.json` removed; docs/tests updated. 398 unit tests / typecheck / build PASS. Codex reviewed (2 rounds): pattern parity, JSON quoting, env move, `.mcp.json` removal all clean; tsx-src agent launch treated as unsupported (dist-only, history/42).

## Manual verification (the deferred hard dependency, now exercised)

Setup: built dist, `daemon start`, `pair --name p1`, two Claude agents (`alpha`/`beta`) attached to the same pair (same-vendor pair enabled by Step 15).

Results:
- **Functionally works.** `send`/`reply` tools available; server appears in `/mcp` as **"built in"**; bidirectional claude↔claude conversation succeeded (outbound + inbound push both observed).
- **But a startup warning appears:** `server:aiox-claude-ingress · no MCP server configured with that name`.
- Side note: an early `no_active_routes` error was a **pairing omission** (user had not paired yet), unrelated to R3 — resolved once paired.
- Side note: testing the inline config standalone (`claude --mcp-config '...'` without daemon) shows the MCP server as **fail** — expected, because `channel-server.ts` `registerWithDaemon` `process.exit(1)`s against a dummy socket. Irrelevant to R3 (real flow has a live daemon).

## Why the warning — phase ordering (confirmed)

Gemini's hypothesis: Claude resolves the dev-channel `server:<name>` against **persistent config files (`.mcp.json`/`~/.claude.json`) FIRST**, emits the "not configured" warning when the name isn't found there, **then** loads `--mcp-config` servers via the standard MCP loader (so tools + push still work). The warning is from the early name-resolution phase; functionality comes from the later loader phase.

**Test that confirmed it:** swapping argv order (`--mcp-config` BEFORE the dev-channel flag) **still emits the warning**. → The warning is tied to the internal phase order, NOT command-line position. Most CLIs collect all flags into an options object before processing, so argv order doesn't reorder phases. Hypothesis confirmed; "swap order" is not a fix.

Concrete commands run this session (dummy env/socket — only the startup warning line matters; the channel server itself fail-exits against the dummy socket, which is expected):

```bash
# Test ①  --mcp-config FIRST, then dev-channel flag  → warning STILL appears
claude --mcp-config '{"mcpServers":{"aiox-claude-ingress":{"command":"node","args":["/Users/lunaxislu/Documents/ai-orchestration/dist/src/adapters/claude/channel-server.js"],"env":{"AIOX_CLAUDE_CHANNEL_AGENT_NAME":"t","AIOX_CLAUDE_CHANNEL_TOKEN":"t","AIOX_SOCKET_PATH":"/tmp/x.sock"}}}}' --dangerously-load-development-channels server:aiox-claude-ingress

# Test ②  dev-channel flag FIRST, then --mcp-config  (current launcher order) → warning appears
claude --dangerously-load-development-channels server:aiox-claude-ingress --mcp-config '{...same JSON...}'

# Control  --mcp-config ONLY, no dev-channel flag → NO warning (nothing activates the name lookup);
#          server shows "fail" in /mcp purely due to dummy daemon socket
claude --mcp-config '{...same JSON...}'
```

Both ① and ② print `server:aiox-claude-ingress · no MCP server configured with that name`. The control (no dev-channel flag) prints no such warning — because the warning is emitted by the dev-channel name-lookup phase, which the control never triggers.

Caveat: this is well-supported inference about undocumented `--dangerously-*` internals, not a documented guarantee. The murkiest piece is *how* inbound `notifications/claude/channel` push attaches to the late-loaded `--mcp-config` server despite the early name-lookup miss — empirically it does, but the mechanism is unverified.

## Dead ends ruled out (with grounding)

Verified via `claude-code-guide` subagent against Claude Code docs (channels-reference, channels.md, plugins, plugin-marketplaces) + `claude --help`. Findings labeled documented-fact vs inference in-session.

1. **No inline flag form.** `--dangerously-load-development-channels` accepts only `server:<name>` or `plugin:<name>@<marketplace>` — both **name references**, no inline transport spec. So `server:<name>` (a persistent-config lookup) is structurally required; the warning is inherent to it.
2. **argv reorder — no effect** (tested, above).
3. **`--strict-mcp-config` — rejected by user.** Might make `--mcp-config` the only MCP config (possibly silencing the lookup), but it **disables the user's global/project MCP servers** for that session. User: "절대 안됨."
4. **`--channels` — not available to us.** It's the *approved/production* version of the same activation switch, resolving names from the **same persistent-config phase** (same warning). "Approved" = Anthropic-curated allowlist (research preview); a third-party npm CLI **cannot self-approve at runtime**. Doc fact surfaced: *"Being in `.mcp.json` isn't enough to push messages: a server also has to be named in `--channels`"* → confirms the dev-channel flag itself is load-bearing for push (B/D still pass the dev flag).

   **Allowlist-approval investigation (2026-05-29, follow-up `claude-code-guide`).** "What must we do to use the official `--channels` instead of the dangerously flag?" — answered authoritatively against the docs. All documented-fact unless noted:
   - **Only difference between the two flags = the allowlist check.** `--channels` accepts only entries on the Anthropic-maintained allowlist (or an org allowlist); `--dangerously-load-development-channels` **skips the allowlist only** and prompts for confirmation. Both accept `plugin:<name>@<marketplace>`; the dangerously flag additionally accepts `server:<name>`.
   - **No public submission path to the official allowlist.** Docs say the default allowlist is the Anthropic-curated set and *"If you are working with an Anthropic partner contact, reach out to them to coordinate an official-marketplace listing."* → **relationship/partner-driven, not self-serve.** No registry, form, review criteria, or timeline documented. Zero info on a third-party submission process.
   - **Org allowlist is the one self-ish path — but the customer controls it, not us.** Team/Enterprise admins can set `allowedChannelPlugins` (managed settings), which **replaces** the Anthropic default and may include a custom plugin → then `--channels` works **inside that org only**. We can't set it; the customer's admin does (and must set `channelsEnabled: true` first).
   - **`channelsEnabled` = master switch, separate from the allowlist.** If off, **both** `--channels` and `--dangerously-...` are blocked (no push at all). Default: claude.ai Team/Enterprise = off until enabled; Console orgs = on. So even the dangerously flag can be killed by org policy — a deploy-time failure mode to guard/document.
   - **Research preview.** `--channels` syntax + protocol may change. Only four channels are pre-approved (Telegram, Discord, iMessage, fakechat); no third-party is on the official allowlist.
   - **GitHub "feature request" is NOT an approval path** (clarified for the user): claude-code core CLI is not OSS and the allowlist isn't PR-editable, so we cannot add ourselves via a PR; and a feature-request issue only *petitions Anthropic to open a public submission path* — it does **not** list our plugin and carries no likelihood guarantee. It's a signal, not a lever.
   - **Conclusion: the `--channels` door is currently closed to us and outside our control.** Ship on `--dangerously-load-development-channels` (the documented, intended dev/distribution workflow for exactly this case). `--channels` is a *future* option contingent on (a) an Anthropic partner relationship, or (b) a customer's org allowlist — neither schedulable by us. **Value of building D's plugin shape now still holds: `plugin:` form is the prerequisite for either future door; `server:`-only would forfeit even that.**
5. **Shipping `.mcp.json` inside the npm package — does NOT work.** Claude (not aiox) reads MCP config, and only from scopes local→project(cwd)→user(`~/.claude.json`)→plugin. The aiox **package install dir is not a scope Claude consults.** So a bundled `.mcp.json` is never read.

## The channel-as-plugin route (strategy D — newly surfaced)

User's insight: register via the `plugin:<name>@<marketplace>` form instead of `server:<name>`. Subagent doc findings:

- **Channel plugin = a normal plugin** (`.claude-plugin/plugin.json`) containing a `.mcp.json` that points to a channel server (an MCP server with `claude/channel` capability + `notifications/claude/channel`). **Our existing `channel-server.js` fits as-is.**
- **Marketplaces can be local** (`.claude-plugin/marketplace.json`; `/plugin marketplace add ./dir`).
- **Programmatic registration without manual user steps:** `.claude/settings.json` `extraKnownMarketplaces` + `enabledPlugins`; or scriptable `claude plugin marketplace add` / `plugin install`; or `CLAUDE_CODE_PLUGIN_SEED_DIR`.
- **`plugin:` form avoids the warning** (plugin loads its own `.mcp.json`, name resolves differently) — documented-ish/inference.
- **Inbound push: fully supported + richer** (same notification protocol + reply tool + permission relay v2.1.81+). Existing HTTP-ingress→notification design ports over.
- Still needs `--dangerously-load-development-channels` until/unless Anthropic-approved — same as now.

**Unverified (inference, would need a spike):** bundling a marketplace dir inside an npm package + resolving the installed `node_modules` path; relative-path plugin sources resolving from node_modules. Also D still **writes to `.claude/settings.json`** (user config) — not file-free, but the blessed channel-registration path.

## Decision matrix (open — pick next session)

| | warning | file footprint | npm fit | effort | risk/notes |
|---|---|---|---|---|---|
| **A** `--mcp-config` inline (current impl) | remains | none | △ | minimal (done) | depends on undocumented phase-ordering; could break on version bump |
| **B** `~/.claude.json` idempotent registration (abs path) + dev flag | none | 1 global entry | ○ | small | `server:` model kept; permanent (not true one-off) |
| **D** channel-as-plugin + local marketplace, registered via settings.json | none | settings.json | ◎ | **large** | Claude's intended channel path; richest inbound; some unverified npm-bundling assumptions → needs spike |

Hard conclusion: **Claude's dev-channel cannot do a true file-free one-off like Codex `-c`.** The original R3 framing ("codex처럼 파일 없는 1회성") is **unreachable on the Claude side**; the realistic targets are A (accept warning, no file) or B/D (no warning, persistent registration).

## Why this was investigated multi-AI (for future readers)

- **Codex**: 2 review rounds on the working-tree impl (parity, quoting, env move, `.mcp.json` removal, tsx caveat) — all clean; flagged stale docs + status wording (fixed).
- **Gemini**: proposed the phase-ordering explanation for the warning (confirmed by the argv-swap test).
- **claude-code-guide subagents (3 spawns)**: authoritative doc lookups for (1) dev-channel ↔ `--mcp-config` resolution, (2) `--dangerously-load-development-channels` accepted forms, (3) `--channels` semantics + channel-as-plugin authoring/registration. These grounded the dead-ends and surfaced strategy D.

The cross-validation pattern (Claude impl/analysis → Codex review → Gemini hypothesis → doc-grounded subagent verification → user steers) is the established aiox workflow ([[aiox-collaboration-workflow]]).

## Strategy D — doc verification (2026-05-29, follow-up): the two open blockers are now documented-fact

User steered toward D (channel-as-plugin), narrowing the criterion to **reliability over file-footprint/UX-cleanliness** ("파일 상관없음, 신뢰성 우선"). Under that criterion **A is dropped** — its only merit was file-free, now valueless, and it depends on undocumented phase-ordering (worst reliability). Then user reconstructed D's canonical form independently: install the channel+tool MCP server as a plugin once, and have `aiox claude` *activate* it via the `plugin:<name>@<marketplace>` flag form (instead of building inline `--mcp-config` JSON every launch).

The two things that made D "unverified / larger-scope than B" were **(a) injecting per-launch dynamic identity (agent/token/socket) into a static plugin `.mcp.json`**, and **(b) bundling/path-resolution inside npm**. A `claude-code-guide` subagent verified all of D's assumptions against official Claude Code docs — **all five are documented-fact**:

1. **`${VAR}` / `${VAR:-default}` expansion in plugin `.mcp.json`** — supported in `command`/`args`/`env`/`url`/`headers`, identically to project/user `.mcp.json`. (docs: code.claude.com/docs/en/mcp)
2. **Expansion source = the parent `claude` process environment.** So `aiox claude` setting `env` on the spawned `claude` makes `"${AIOX_CLAUDE_CHANNEL_TOKEN}"` in the plugin `.mcp.json` expand to that value.
3. **`${CLAUDE_PLUGIN_ROOT}`** = absolute plugin root dir; usable in `command`/`args`/`env`. Official example exists. (also `${CLAUDE_PLUGIN_DATA}` for update-surviving state, `${CLAUDE_PROJECT_DIR}` for project root.)
4. **Spawned MCP child inherits the parent `claude` env, and the `.mcp.json` `env` block merges/overrides on top.**
5. **Plugin-channel activation arg form = `plugin:<plugin-name>@<marketplace-name>`**, passed to `--dangerously-load-development-channels` (and, once approved, `--channels`). Channels-reference shows both `plugin:...` and `server:...` examples.

**Blockers resolved by these facts:**
- Dynamic identity (a) → (2)+(4): `aiox claude` puts agent/token/socket into the spawned `claude`'s `env`; the static plugin `.mcp.json` carries only `${...}` placeholders; `channel-server` reads them via the unchanged `parseChannelServerEnv`. No values baked into the file.
- Path/bundling (b) → (3): `${CLAUDE_PLUGIN_ROOT}/.../channel-server.js` — install-location independent, no node_modules path resolution needed (bundle aiox dist into the plugin).
- Approval one-liner → (5): keep the `plugin:<name>@<marketplace>` arg, flip only the flag `--dangerously-...` → `--channels` when/if Anthropic approves. **Runtime message flow (send/reply tools + inbound push) is byte-identical across server:→plugin: and dangerously→`--channels`; only the registration surface + activation switch change. channel-server.ts is untouched.**

Doc bonus: *"This flag skips the allowlist only. The `channelsEnabled` org policy still applies"* — `--dangerously-...` bypasses only the allowlist, not other policy.

**Plugin install scope — required CLI guard (user, 2026-05-29):** plugins install at **global** or **project** scope. *Global is fine* — the channel plugin is available wherever `aiox claude` runs. *Project scope is the risk*: the plugin is enabled only inside that project, so running `aiox claude` from a directory/project where the channel plugin is **not** installed/enabled means activation (`plugin:<name>@<marketplace>`) cannot resolve. **`aiox claude` MUST detect this up front and emit a clear CLI error (explicit branch/exception handling) — not fail silently and not die with an opaque dev-channel error.** Spike must define: (i) how to detect plugin availability (installed *and* enabled in the current scope) before spawning `claude`, and (ii) the exact error message + non-zero exit path (ideally pointing the user at how to install the plugin globally or in this project).

**Reliability re-ranking:** D moves from "unverified, hence less certain than B" to "doc-backed path." The dynamic-identity unknown that previously argued against D is now a documented mechanism. **A out; D now a defensible reliability choice, with B as the simpler fallback.**

Note: still **inference, not yet measured** — the `--dangerously-*` internals are partly undocumented. Doc says it works; an integration spike (below, item 1) must confirm from a non-repo-root dir.

## Decision — Codex cross-validation (2026-05-29): **D primary + B fallback + A dev-only**

After the reliability criterion reduced the choice to **안1 (keep existing dev-channel `server:` mechanism; sub-form A/B/`.mcp.json`)** vs **안2 (Claude-only plugin, D)**, the call was sent to Codex for cross-validation. Codex's verdict: **go D as primary.** Triangulation = user intuition (D) + Claude analysis (D) + Codex (D) all converge. Codex's reasoning, recorded in full because it added axes our own analysis lacked:

**Recommendation: 안2 (D) as primary.** Three grounds:
1. **D matches Claude's product model.** A channel is an MCP server declaring the `claude/channel` capability, opted-in via `--channels` (or `--dangerously-load-development-channels` during research preview); Anthropic docs explicitly describe wrapping a channel as a plugin and distributing via a marketplace. So "package the channel as a plugin and activate via `plugin:<name>@<marketplace>`" is the documented, product-aligned shape. (code.claude.com/docs/en/channels-reference)
2. **The dynamic-identity surface is documented**, not a hack: plugin `.mcp.json` supports `${VAR}` expansion + `${CLAUDE_PLUGIN_ROOT}` + plugin-bundled MCP server → inject agent/token/socket via spawn env, plugin holds only the static definition. (docs.anthropic.com/en/docs/claude-code/mcp)
3. **안1-A's risk is worse than a cosmetic warning.** A works today but leans on the `--mcp-config` late-load vs dev-channel early-lookup **phase-ordering**; the *internal ordering dependence that produces the warning* is itself the operational risk, regardless of the warning being cosmetic.

**Is D's added complexity worth it? Yes — conditioned on building the install/scope guard as real product code.** Codex's framing: **D's complexity is the kind we control; 안1-A's risk is the kind we can't.**
- *Controllable (D):* marketplace/plugin registration idempotency · global/project scope detection · plugin-enabled preflight · dist-bundle-presence check · clear CLI error on failure.
- *Uncontrollable (안1-A):* Claude CLI internal phase-ordering changes · `--mcp-config` vs dev-channel lookup order shifts · the warning hardening into a failure on a future version · users unable to distinguish a real outage from the cosmetic warning.
- **B is better than A** (idempotent `~/.claude.json` user-scope reg → no warning, simple) **but stays `server:`-centric and does not mesh with the future `--channels` plugin/org-allowlist path.** D still ships on `--dangerously-...` but is structured so the only future change is the activation flag.

**More dangerous failure mode = 안1's version-fragility.** D's "plugin missing / wrong scope" failures are catchable by a pre-launch **preflight**: marketplace absent · plugin not installed · project-scoped but disabled in current cwd/project · bundled `channel-server.js` missing · required env missing · channels disabled by org policy → `aiox claude` checks **before spawn** and stops with a clear error ("install globally" / "plugin not enabled in this project"). By contrast 안1-A is "launches anyway, has a warning, looks fine right now" — **and channel docs note a silent-failure pattern** (see §"Plugin scope mechanics" below for the corrected, scoped status of this claim). That class of failure is worse operationally: the user sees a successful launch while inbound push is broken.

**Third path = not a different mechanism but "D primary + B fallback":**
1. **Primary: D plugin** — idempotent install cmd (e.g. `aiox setup claude-plugin --scope user`); `aiox claude` activates via `plugin:aiox-claude-ingress@aiox`; agent/token/socket via spawn env only; plugin `.mcp.json` uses only `${VAR}` + `${CLAUDE_PLUGIN_ROOT}`; project-scope preflight for installed/enabled.
2. **Fallback: B user-scope `server:` registration** — escape hatch for when the plugin system breaks on a given Claude version or marketplace registration is blocked. Explicit opt-in or `aiox doctor --repair` only; **not the default.**
3. **A = dev-only escape hatch** — keep for internal smoke/debug; unfit as release primary.

**Reversibility (Codex's strongest argument for "D first"):** D→B retreat is **cheap** (channel-server itself nearly unchanged; only the registration surface swaps). B→D later is **expensive** (must retrofit install UX, marketplace, plugin bundling, `plugin:` activation). So even if D is wrong, backing out is cheap; if B is chosen and must be upgraded, it's costly. **Deferrability:** the decision can't be deferred long — npm packaging, release smoke, `aiox claude` launcher, doctor/setup UX all hinge on it; but *implementation* risk is reduced by ordering D spike → B fallback only if the spike fails.

**Codex's final shape:** go D, but the **first commit is NOT a full migration** — TDD a minimal plugin spike + preflight failure contract first, pass non-repo-root manual smoke, *then* retire/replace the A working-tree impl.

## Plugin scope mechanics + silent-drop status (2026-05-29, `claude-code-guide` #3)

Verified plugin scope/precedence/detection + the silent-drop claim against docs (settings, plugins-reference, channels, discover-plugins). Drives the user-scope default and the preflight design.

**Scopes + precedence (documented-fact):** four scopes — Managed > Local (`.claude/settings.local.json`) > Project (`.claude/settings.json`) > User (`~/.claude/settings.json`). Plugin enablement keyed by `enabledPlugins`; marketplaces by `extraKnownMarketplaces`. Higher scope overrides lower for the same plugin (marketplaces may merge; docs ambiguous).

**cwd dependence (documented-fact):** project-scope enablement is tied to the discovered project root (the `.git` dir of cwd). Run `claude` inside project A → A's project-scope plugin is active; run elsewhere → it is NOT (only user + managed apply).

**Two user scenarios answered:**
- *Same plugin enabled at BOTH user and project A, run inside A:* project scope wins by precedence — **but it doesn't matter for us**: same plugin/definition means it's active either way. Precedence only matters when the two definitions differ (version / marketplace source).
- *Enabled at user + project A, NOT in project B, run inside B (documented-fact):* **user scope acts as a global fallback → the plugin is active in B with no project-scope entry.** → **This is the decisive reason to default to user-scope install** (`--scope user`): cross-project "just works," and the "project B has nothing" problem disappears. Project scope is only for "use aiox in this project only," and is the case that needs the cwd guard.

**Detection (mostly documented, schema is inference):** `claude plugin list --json` reports installed plugins with name/enabled/scope/version across all scopes (so it sees the user-scope fallback). No dedicated "is plugin X effective in this cwd" command → for cwd-effective resolution, parse settings files (local > project > user). ⚠️ The exact `--json` schema is **inference** (docs don't pin the fields) → confirm with real output in the spike.

**Silent-drop — CORRECTED status (this supersedes the earlier "Codex-surfaced, unverified" note in §Decision):**
- **Documented-fact:** a silent-failure *pattern* exists in the channel mechanism. Docs (channels): passing a plugin NOT on the effective allowlist → *"Claude Code starts normally but the channel doesn't register, and the startup notice tells you why."* I.e. **exit 0 (looks successful) + a startup notice + channel never registers + no inbound push** — NOT a hard error.
- **BUT the cited text is the `--channels` allowlist-miss case.** We use `--dangerously-load-development-channels`, which **bypasses the allowlist**, so that exact sentence is not our scenario. Our real failure cases — **(i) plugin not installed / scope-miss with the dangerously flag, (ii) `channelsEnabled` org policy off** — are **NOT pinned by the docs**; whether they are silent (exit 0 + notice) or a hard error is **inference**.
- **Net:** "the silent pattern is real" = documented; "it applies to *our* exact cases" = unconfirmed. (Correcting an earlier overstatement that called this "verified.")
- **Undetermined detail:** *what* dies. Plugin fully uninstalled → its MCP server never spawns → likely no send/reply *and* no inbound (total no-channel). Plugin installed but channel capability blocked by org policy → send/reply may appear while only inbound push dies (subtler). Docs don't distinguish.
- **Conclusion unchanged:** regardless of silent vs hard, the fix is a **pre-spawn preflight** (`claude plugin list --json` → installed+enabled incl. user-fallback → else exit 1 with install guidance), which avoids entering the failure path at all. Codex's "parse startup output" is a 2nd-line defense that needs the notice text confirmed first.

## Next session entry point

Decision made (D primary + B fallback + A dev-only). Implementation, ordered to minimize risk per Codex:

1. **Minimal D spike + preflight failure contract, TDD-first (NOT a full migration).** Build a minimal channel plugin (`plugin.json` + static `.mcp.json` with `${VAR}` placeholders + `${CLAUDE_PLUGIN_ROOT}` path) + local marketplace → activate via `plugin:<name>@<marketplace>` under `--dangerously-load-development-channels`, with `aiox claude` injecting identity through the spawned `claude`'s `env`. From a **non-repo-root dir** confirm: (a) no startup warning, (b) `${VAR}` actually delivers the token to `channel-server`, (c) inbound push survives, (d) **preflight guard** (TDD a failure contract): marketplace absent · plugin not installed · project-scoped but disabled in current cwd · bundled `channel-server.js` missing · required env missing · channels disabled by org policy → `aiox claude` detects **pre-spawn** and exits non-zero with a clear CLI error (not silent / not opaque dev-channel failure); global-scope install needs no guard. (e) **measure silent-drop for OUR exact cases** (the doc-cited silent pattern is the `--channels` allowlist-miss case, which the dangerously flag bypasses — see §"Plugin scope mechanics"): with `--dangerously-...` + plugin NOT installed/scope-miss → exit code? notice text + where? are send/reply tools present? does push arrive? And `channelsEnabled=off` → hard error or silent? Confirm/refute to set how much the preflight (vs startup-output parsing) must carry. (f) confirm the real `claude plugin list --json` schema (field names) for the preflight parser.
2. Only **after** the spike passes: retire/replace the working-tree A implementation (`buildClaudeChannelMcpConfig` + `--mcp-config`, NOT committed). Keep A as dev-only smoke/debug if useful.
3. **B fallback** (idempotent `~/.claude.json` user-scope `server:` reg) is a later escape hatch — explicit opt-in / `aiox doctor --repair`, not the default. Implement after primary D lands, or defer.
4. **Install/setup UX**: idempotent install cmd (e.g. `aiox setup claude-plugin --scope user`) — design alongside the spike.
5. npm packaging blockers remain open in `plan/release-plan.md` (B1 dist not shipped, etc.) — couple with the D plugin packaging (bundle dist into the plugin dir).
