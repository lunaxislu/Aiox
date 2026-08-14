# aiox A2A — Capability와 Sandbox (§7)

[[docs/specs/aiox-a2a]] 인덱스가 상태 어휘·layer model·glossary를 소유한다. 이 slice는 §7과
§7.1(projection feasibility)·§7.2(trust boundary)를 함께 소유한다.

## 7. Capability와 sandbox

**Status: policy model은 Normative target, capability projection과 sandbox enforcement는
미구현이다.** 현재 token/route enforcement와 fixed aiox MCP/channel projection 일부가
존재하지만 release-grade security boundary나 arbitrary capability compiler로 간주하지
않는다.

Capability isolation의 중심 개념은 **Capability Projection Layer**다.

Security와 isolation은 네 축으로 나눠서 본다:

1. **Identity/Auth**: 누가 말하는가. agent token, daemon token, org identity 같은 축이다.
2. **Authorization/Policy**: 무엇을 할 수 있는가. route allow, capability allow/deny,
   project/org policy 같은 축이다.
3. **Capability Isolation**: 어떤 tool/MCP/skill/instruction이 보이는가. launch-scoped
   projection과 per-agent grant가 이 축이다.
4. **Sandbox/Execution Isolation**: 실제 OS, 파일, 네트워크, 프로세스를 어디까지 막는가.
   이 축은 reserved/non-guarantee 상태이며 capability isolation과 같지 않다.

Model:

1. aiox capability registry가 MCP server, tool grant, skill, generated instruction source를
   보관한다.
2. compose/daemon이 agent별 effective grant를 resolve한다.
   - Scope precedence는 `global aiox defaults -> project compose -> agent override` 순서다.
   - Allow/grant는 좁은 scope가 추가하거나 override할 수 있지만, deny/restriction은 보수적으로
     누적한다.
3. session launch 때 per-agent runtime projection을 만든다.
4. adapter가 projection을 Codex/Claude/Gemini native config/plugin/MCP/skill surface로
   compile한다.

Principles:

- native global config/skill folder는 기본 자동 수정하지 않는다. 단,
  operator가 명시적으로 `aiox claude setup --scope user`를 실행하면
  shared Claude static MCP definition을 등록하는 좁은 예외다. 이 정의는
  non-AIOX Claude session에도 보일 수 있으며 그 session에는 AIOX runtime
  identity env가 주입되지 않는다; 이는 per-process isolation 보장이 아닌
  명시적 provisioning trade-off다.
- aiox-launched session에만 runtime projection을 주입한다.
- runtime projection은 OS별 path와 filesystem 제약을 고려한다. host의 session-only
  plugin/config 표면을 우선하고, filesystem materialization이 필요한 경우에만 symlink-first와
  Windows copy fallback을 사용한다.
- MCP server 주입 여부는 강하게 제어할 수 있다.
- aiox-owned route/tool surface는 daemon token/policy로 강제한다. 기본값은
  deny-by-default + explicit allow다.
- routing graph와 capability graph는 schema에서 분리한다. 다만 enforcement 시점에는 route가
  없는 send/reply capability를 daemon policy가 거부해야 한다.
- external MCP/native surface의 내부 tool allow/deny는 host/server 지원에 따라
  degradation을 surface한다. aiox가 항상 강제한다고 약속하지 않는다.
- skill은 tool과 다르다. skill은 instruction/assets 노출에 가깝고, 한 번 읽힌 지식은
  완전히 회수하기 어렵다.
- capability/policy grant와 OS sandbox는 분리한다.

### 7.1 Claude/Codex projection feasibility (2026-06-11)

이 절은 compose 구현 완료를 주장하지 않고, §7의
`registry -> resolve -> projection -> adapter compile` 중 마지막 compile 단계에 사용할 수 있는 현재 표면을 구분한다. 확인
환경은 Claude Code 2.1.170과 Codex CLI 0.137.0이며, 실제 지원 범위는 adapter preflight와
version matrix로 다시 고정한다.

| Projection                                 | Current evidence                                                                                                                                                                                                                                                               | Feasibility judgment                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex per-session MCP                      | 현재 launcher가 `-c mcp_servers.aiox=...`로 aiox send/reply MCP와 agent identity env를 주입한다([[src/adapters/codex/launcher.ts]]). unit test도 inline config 생성을 검증한다.                                                                                                  | **Proven for one fixed aiox server.** compose 선언의 N개 server와 tool grant로 일반화하는 것은 낮은 위험의 compiler 작업이지만 아직 구현되지 않았다.                                                      |
| Claude per-session MCP/instruction         | 단일 경로: `aiox claude setup --scope <local|user|project>`로 등록하고, command cwd에서 effective하게 해석된 static MCP 항목을 `server:<name>` activation으로 세션에 연결해 aiox tool과 MCP server instructions를 제공한다([[src/adapters/claude/launcher.ts]], [[src/adapters/claude/channel-server.ts]]). | **Proven for one fixed aiox MCP entry.** settings precedence와 여러 MCP 충돌을 포함한 일반화는 구현·통합 시험이 필요하다. |
| Claude user-declared skill/MCP/instruction | 공식 CLI는 session-only `--plugin-dir`, `--mcp-config`, `--settings`, `--append-system-prompt(-file)`을 제공하고 plugin은 skill과 MCP server를 함께 묶을 수 있다.                                                                                                              | **Official surface exists.** plugin으로 패키징된 skill은 symlink/copy 없이 per-agent 부여할 수 있다. raw skill directory 조합과 Windows path 처리는 별도 compiler fallback이다.                           |
| Codex user-declared MCP/instruction        | 공식 CLI의 `-c/--config`는 arbitrary key override를 지원하고 `mcp_servers`, `developer_instructions`/`model_instructions_file`, MCP tool allow/deny를 config로 표현한다.                                                                                                       | **Official surface exists.** current one-off aiox injection을 일반화할 수 있으나 quoting, secret 전달과 managed-policy 충돌 test가 필요하다.                                                              |
| Codex per-agent skill/plugin set           | Codex는 repo/user/admin skill discovery, symlinked skill folder와 plugin bundle을 제공하고, 공식 config 문서는 installed plugin의 `enabled` 값을 정의한다. 현재 `codex plugin` CLI는 add/list/remove만 노출하고 session-only `--plugin-dir`에 해당하는 flag는 확인되지 않았다. | **Spike required.** preinstalled plugin의 one-off `-c` toggle, generated `--profile`, agent별 worktree/projection directory 중 어떤 방식이 동일 repo 동시 session에서 실제 격리되는지 검증한 뒤 계약한다. |

따라서 compose는 새 vendor mechanism 발명보다 현재 하드코딩된 aiox projection을 선언형
N개 grant로 일반화하는 작업에 가깝다. 그러나 현재 코드는 registry, dependency resolution,
conflict detection, projection cleanup과 arbitrary user capability compile을 구현하지 않았으므로
"절반 구현"은 adapter compile primitive에만 해당한다.

Current implementation caveats:

- Current Codex projection is a fixed per-session `mcp_servers.aiox` injection
  carrying agent identity, token and socket path; it is not a general
  multi-server grant compiler. Current evidence:
  `src/adapters/codex/launcher.ts:88-119`,
  [[tests/unit/adapters/codex-launcher.test.ts]] — `tests/unit/adapters/codex-launcher.test.ts:133-170`.
- Current Claude projection is a single pre-registered static MCP entry
  resolved as effective Local, User, or Project scope in the command cwd
  (`aiox claude setup --scope <local|user|project>`, activated via
  `server:<name>`), with agent
  identity, token and socket path passed only through the spawned process's
  env. Current evidence:
  `src/adapters/claude/launcher.ts:30-48` (`buildClaudeStaticMcpConfig`),
  `src/adapters/claude/launcher.ts:70-86` (`launchClaudeStaticMcpChannel`),
  [[tests/unit/adapters/claude-channel.test.ts]] —
  `tests/unit/adapters/claude-channel.test.ts:903-988`.
- Registration auth is implemented for Claude and Codex channel registration,
  and Codex MCP ingress validates its token, but Claude daemon-to-channel
  `/send` remains an Implementation Gap: the channel HTTP ingress accepts
  loopback POSTs without a request auth header. Current evidence:
  [[src/daemon/state.ts]] — `src/daemon/state.ts:1129-1156` (Claude
  registration), `src/daemon/state.ts:1250-1280` (Codex registration),
  `src/daemon/state.ts:1302-1348` and `src/daemon/state.ts:2339-2387`
  (Codex MCP ingress authorization),
  `src/adapters/claude/channel-server.ts:462-500`,
  [[docs/decisions/claude-channel-session-reconnect-token]] — current
  session-scoped Claude registration credential lifecycle,
  [[docs/decisions/claude-channel-trust-and-registration]] —
  dynamic-registration rationale and reverse `/send` push-auth gap.

Host가 제공하면 client-visible MCP tool surface도 좁힐 수 있다. 예를 들어 Codex는
server별 enabled/disabled tool을, Claude는 tool allow/deny와 strict MCP config를 제공한다.
다만 이것은 외부 MCP server process 내부의 side effect, 동적 tool 변경이나 이미 skill에서
읽은 지식까지 회수하는 sandbox가 아니다. projection artifact와 secret은 owner-only 임시
경로에 만들고 session 종료 시 정리해야 한다.

Primary references: [Claude CLI reference](https://code.claude.com/docs/en/cli-reference),
[Claude plugins reference](https://code.claude.com/docs/en/plugins-reference),
[Codex advanced config](https://developers.openai.com/codex/config-advanced),
[Codex skills](https://developers.openai.com/codex/skills),
[Codex app-server](https://developers.openai.com/codex/app-server/).

Sandbox vocabulary is reserved but non-guarantee until explicitly implemented.

Reserved profiles:

- `none`
- `cwd-readonly`
- `cwd-write`
- `container`
- `vm`
- `remote-worker`

### 7.2 Trust boundary and data handling

- daemon socket, Claude channel endpoint, adapter credentials와 per-agent token은 trust
  boundary다. Phase 0 release hygiene는 runtime directory/socket을 owner-only로 만들고 raw credential이
  argv·log·event·error·rollback residue에 남지 않게 한다. 모든 ingress/push path의 identity 검증,
  route authorization, credential purpose separation은 Phase 1 trust-boundary hardening의 deferred contract다.
- 예상 가능한 client socket 오류는 request/connection boundary에서 처리한다. 현재 daemon은 accepted
  socket 오류를 해당 connection에서 격리하고, 최상위 `unhandledRejection`/`uncaughtException`에서는
  raw error 대신 origin만 담은 owner-only `latest-fatal.json`을 쓴 뒤 Node 기본 종료를 유지한다.
  이는 retained rolling log나 복구 handler가 아니다. Current evidence:
  [[src/daemon/socket-transport.ts]] — `src/daemon/socket-transport.ts:62-68`,
  [[src/daemon/run.ts]] — `src/daemon/run.ts:27-45`,
  [[tests/unit/daemon/run.test.ts]] — `tests/unit/daemon/run.test.ts:25-101`.
- message/transcript/log는 source code나 credential을 포함할 수 있는 local sensitive data다.
  기본 저장 위치는 profile namespace 아래여야 하고, public telemetry 전송은 opt-in 전에는
  금지한다. token/raw credential은 log/event/error에 남기지 않는다.
- 현재 DB는 process-lifetime이므로 retention/deletion guarantee가 없다. durable store를
  도입할 때 보존 기간, project/profile 삭제, transcript export/redaction, schema migration과
  crash recovery를 함께 정의한다. 이 항목 없이 "durable mailbox"를 release하지 않는다.
  Current evidence: production daemon paths still open `:memory:`
  ([[src/daemon/run.ts]] — `src/daemon/run.ts:24-26`, [[src/bin/aiox.ts]] — `src/bin/aiox.ts:238-245`,
  `src/bin/aiox.ts:361-363`), while file-backed state path resolution is scaffolded
  but not wired ([[src/config/paths.ts]] — `src/config/paths.ts:105-120`).
