# aiox A2A — Capability와 Sandbox (§7)

> 컨텍스트: [[aiox-a2a]] 인덱스. 상태 어휘·layer model·glossary는 인덱스가 소유한다.
> 이 slice는 §7과 §7.1(projection feasibility)·§7.2(trust boundary)를 함께 소유한다.

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

- native global config/skill folder는 기본 수정하지 않는다.
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
| Claude per-session MCP/instruction         | inline 경로는 `--mcp-config`, 기본 경로는 channel plugin activation으로 aiox tool과 MCP server instructions를 세션에 연결한다([[src/adapters/claude/launcher.ts]], `channel-server.ts`).                                                                                         | **Proven for one fixed aiox plugin/server.** `--strict-mcp-config`, settings precedence와 여러 plugin 충돌을 포함한 일반화는 구현·통합 시험이 필요하다.                                                   |
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
  `tests/unit/adapters/codex-launcher.test.ts:133-170`.
- Current Claude projection is either inline MCP config or plugin channel
  activation for the fixed aiox channel/server, with agent identity, token and
  socket path passed to the launched process. Current evidence:
  `src/adapters/claude/launcher.ts:94-117`,
  `src/adapters/claude/launcher.ts:189-206`,
  `src/adapters/claude/channel-server.ts:491-507`,
  `tests/unit/adapters/claude-channel.test.ts:673-739`.
- Registration/ingress auth is implemented for channel registration and Codex
  MCP egress, but Claude daemon-to-channel `/send` remains an Implementation
  Gap: the channel HTTP ingress accepts loopback POSTs without a request auth
  header. Current evidence:
  [[src/daemon/state.ts]] — `src/daemon/state.ts:926-953`,
  `src/daemon/state.ts:1044-1073`,
  `src/daemon/state.ts:1711-1758`,
  `src/adapters/claude/channel-server.ts:432-456`,
  [[claude-channel-trust-and-registration]] — `docs/decisions/claude-channel-trust-and-registration.md:25-34`.

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
  boundary다. release 전에 runtime directory는 owner-only, socket/token file은 최소 권한으로
  생성하고 모든 ingress/push path에서 identity를 검증한다.
- 예상 가능한 client socket 오류는 request/connection boundary에서 처리한다. 최상위
  `unhandledRejection`/`uncaughtException`은 secret을 제거한 structured fatal log를 남기고
  process를 종료해야 하며, 손상 가능 상태에서 계속 실행하는 복구 수단으로 쓰지 않는다.
- message/transcript/log는 source code나 credential을 포함할 수 있는 local sensitive data다.
  기본 저장 위치는 profile namespace 아래여야 하고, public telemetry 전송은 opt-in 전에는
  금지한다. token/raw credential은 log/event/error에 남기지 않는다.
- 현재 DB는 process-lifetime이므로 retention/deletion guarantee가 없다. durable store를
  도입할 때 보존 기간, project/profile 삭제, transcript export/redaction, schema migration과
  crash recovery를 함께 정의한다. 이 항목 없이 "durable mailbox"를 release하지 않는다.
  Current evidence: production daemon paths still open `:memory:`
  ([[src/daemon/run.ts]] — `src/daemon/run.ts:24-26`, [[src/bin/aiox.ts]] — `src/bin/aiox.ts:238-245`,
  `src/bin/aiox.ts:361-363`), while file-backed state path resolution is scaffolded
  but not wired (`src/config/paths.ts:105-120`).
