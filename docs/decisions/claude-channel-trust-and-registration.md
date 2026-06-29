# Claude Channel Trust and Dynamic Registration

## Context
Unlike Codex where the daemon spawns the app-server, Claude Code CLI spawns its own MCP servers as stdio child processes. Since the daemon is not a parent of the Claude process tree, it cannot directly control or access the Claude transport streams. To route messages to Claude Code, the daemon must send HTTP POST requests to an ingress server managed by the Claude channel-server adapter. The channel-server must therefore tell the daemon where its transient endpoint lives, and the daemon must trust that registration. This decision concerns that **channel → daemon registration** direction: who is allowed to claim a registered agent's identity and bind an endpoint. (The reverse **daemon → channel HTTP ingress** push-auth question is a separate, still-open gap; see Trade-offs.)

## Decision
We decided to adopt an inverted process tree topology where the Claude CLI spawns the MCP channel-server, which dynamically registers its transient HTTP endpoint with the daemon using a secure single-use attach token.

## Alternatives
- **Static global registration**: Configure a static local port for the Claude channel-server. Rejected because concurrent Claude CLI sessions would clash on the same port, and dynamic routing would fail to identify which CLI instance is active.
- **Tokenless dynamic registration**: Let the channel-server register itself by name alone. Rejected because any local process could claim the name of a registered agent during registration (registration-side endpoint hijacking), which is a critical security risk.

## Rationale
- **Inverted Process Tree**: The daemon remains decoupled from the terminal process lifecycles of Claude CLI. The channel-server, running as Claude's stdio child, exposes a local HTTP ingress endpoint and notifies the daemon of its presence via RPC.
- **Dynamic Secure Registration**: Binds the identity securely:
  1. The CLI requests an agent attach from the daemon.
  2. The daemon generates a single-use transient attach token.
  3. The CLI passes this token as an environment variable to the launched Claude process.
  4. The spawned channel-server presents this token to the daemon via the `registerClaudeChannel` API, establishing a trusted binding in the daemon's memory registry.
  Without that token boundary, another local process could register an endpoint for the same agent name and receive daemon-sent messages for that agent; the data leakage is a consequence of identity theft.
- **Stateless HTTP Push over WebSocket**: WHY chose loopback HTTP POST for daemon → channel delivery rather than a persistent WebSocket: it keeps the daemon decoupled from Claude's terminal process lifecycle and avoids per-session socket state. The delivery / acknowledgement contract itself (what counts as an ack, retry eligibility) is owned by the A2A spec, not this decision — see [[docs/specs/aiox-message-lifecycle]] §4.3.

## Trade-offs
- A sudden closure of Claude Code CLI can leave a stale daemon registry entry. A delivery timeout or connection failure surfaces the failure but does not remove the entry; cleanup currently requires an explicit disconnect or daemon restart.
- Dynamic registration keys and endpoints are kept in-memory; restarting the daemon invalidates active sessions, requiring a reconnect.
- **Scope of the security guarantee — registration direction only.** The single-use attach token authenticates the **channel → daemon registration** call (`registerClaudeChannel`), so only the process holding the token minted for that agent can bind the endpoint; this is what closes registration-side endpoint hijacking. It does **not** secure the reverse **daemon → channel** loopback HTTP `/send` ingress, which is currently unauthenticated — a known gap recorded in [[docs/specs/aiox-adapter-model]] §5 (Claude row, Tier 3 preview; auth + delivery ack incomplete until Tier 2). The channel is therefore not yet hardened end-to-end against a co-located process that can reach the loopback ingress port.

## Re-evaluation
- This registration protocol can be re-evaluated if Claude Code introduces native client-to-daemon UDS sockets or dynamic runtime tool subscription APIs.

## Sources
- Single-use attach-token registration (pending-token check, `unknown_token` reject, single-use delete): [[src/daemon/state.ts]] — `src/daemon/state.ts:926-953` (`registerClaudeChannel`).
- Delivery/ack contract owner: [[docs/specs/aiox-message-lifecycle]] §4.3.
- Claude channel ingress/push auth gap: [[docs/specs/aiox-adapter-model]] §5 (Claude row, Tier 3 preview).
- Registration flow + loopback HTTP `/send` ingress (architecture authority): [[docs/architecture/local-runtime-claude-adapter]] §6.1–6.4.
