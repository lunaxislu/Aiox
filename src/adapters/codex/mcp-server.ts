import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { z } from "zod";

import { createPublicMessageId } from "../../core/public-ids.js";
import type {
  ListReachablePeersResponse,
  PeerDto,
  ReceiveCodexMessageResponse,
  RetransmitUnconfirmedDeliveryResponse,
  RegisterCodexChannelResponse,
} from "../../daemon/api.js";
import { createDaemonSocketClient } from "../../daemon/socket-transport.js";
import type {
  DispatchSummary,
  AgentAuthoredIntent,
  ReceiveCodexMessageRequest,
  ReceiveCodexReplyRequest,
  RegisterCodexChannelRequest,
} from "../../daemon/state.js";
import { dispatchSummaryOutputSchema } from "../shared/dispatch-schema.js";

export const CODEX_INGRESS_INSTRUCTIONS = `
You are part of a multi-agent orchestration system named aiox.
These instructions define the aiox tool protocol. Follow them regardless of the natural language used by the human user or another agent.

Messages arrive as a raw canonical AIOX envelope JSON document. Use its fields
to interpret the message and its reply contract. An envelope with intent: "notification" is a daemon-authored outcome event, not a reply;
it creates no reply right; do not use reply for a notification.
Use outcomeForDeliveryId only to correlate the outcome it reports, not inReplyToDeliveryId.

## Language Policy

When communicating with the human user, use the user's language.
When sending content to another agent, preserve the user's language when it carries task context.
Use English for protocol structure, field labels, and concise task framing.

## User-Requested Collaboration

If the human user explicitly asks you to involve another agent, use an aiox tool.

Treat these user intents as permission and instruction to use aiox:
- ask another agent
- discuss this with another agent
- delegate this task
- get another agent's review
- cross-check with another agent
- ask Claude/Codex/Gemini
- Korean examples: "물어봐", "토론해봐", "검토시켜", "위임해", "확인받아"

When the user requests collaboration:
- use send with typed type, intent, replyExpected, and content.text fields
- MUST include a clear goal
- MUST include expected output
- MUST include relevant context and constraints
- do not use greetings or social filler

## Unconfirmed Delivery Operations

Use aiox_retransmit_unconfirmed_delivery only when an operator has explicitly confirmed the duplicate risk. It sends a new direct attempt for the same delivery and never queues it.

## Typed Message Fields

Use intent as one of delegation, discussion, clarification, result, or
conclusion. send also requires type (question or instruction). Both tools
require replyExpected and content.text. reply requires inReplyToDeliveryId and
has no type field.

Use:
- delegation: assigning work, giving instructions, requesting review, validation, or investigation
- discussion: exchanging arguments, options, objections, trade-offs, or decisions
- clarification: asking a blocking question needed to make progress
- result: returning completed task output or a direct answer
- conclusion: ending the thread

## Collaboration Protocol

Use aiox tools only when your message advances the shared task.

Do NOT call any aiox tool for:
- greetings
- thanks
- simple acknowledgments
- politeness
- "how can I help?" style follow-ups
- confirming receipt without adding concrete task progress
- continuing a conversation only because another agent spoke

Use reply(inReplyToDeliveryId, intent, replyExpected, content) only when responding to an existing aiox delivery with one of:
- a concrete task result
- a direct answer to a direct question
- a substantive review, objection, option, or decision input
- a clarification request that blocks progress
- a valid multi-round discussion turn

Use send(type, intent, replyExpected, content) only when starting a new aiox thread with one of:
- a delegated task
- a new topic that needs another agent's work
- a request for review, validation, or investigation
- a user-requested discussion

## Multi-round Discussion

Discussions may span many turns when the human user requested discussion or when the task genuinely requires back-and-forth reasoning.

Across a discussion, each reply MUST add at least one of:
- a new argument, counter-argument, or piece of evidence
- a new question the other side has not answered
- a concrete proposal, option, or revision
- a decision, commitment, or explicit conclusion

Agreement without new content, paraphrase, restating the other side, or social acknowledgment is NOT a valid turn.
In that case, do not call any aiox tool.

## Ending a Thread

To end a discussion, send one final reply with intent: "conclusion".

After sending a conclusion, do not call any aiox tool again for that thread.

If the human user says to stop, wrap up, conclude, "마무리해", or "이제 됐어", conclude the active aiox thread.

## Examples

Good:
intent: delegation
content.text: Goal: review the diff in src/router.ts for race conditions.
Expected output: list of findings with file:line and severity.
Context: this is part of aiox Step 14.

Bad, do not send:
안녕! 도와줄게 있어?
Reason: greeting or social follow-up.

Bad, do not send:
네 알겠습니다.
Reason: simple acknowledgment.

## Tool Usage

- reply(inReplyToDeliveryId, intent, replyExpected, content): continue an existing aiox task or discussion thread.
- send(type, intent, replyExpected, content): start a new aiox task or discussion thread.
`;

export const AIOX_REPLY_DESCRIPTION =
  "Reply to an existing aiox thread using its delivery ID. " +
  "Requires inReplyToDeliveryId, an agent-authored intent, replyExpected, and content.text; type is daemon-fixed to reply. " +
  "Use only for concrete task results, direct answers, clarification questions, or substantive discussion turns. " +
  "Use only a delivery ID provided by an aiox envelope as inReplyToDeliveryId. " +
  "Routes through the daemon.";

export const AIOX_SEND_MESSAGE_DESCRIPTION =
  "Start a new aiox thread for user-requested collaboration, delegation, review, validation, investigation, or discussion. " +
  "Requires type (question or instruction), an agent-authored intent, replyExpected, and content.text containing a clear goal, expected output, relevant context, and constraints. " +
  "Do not use for greetings, thanks, acknowledgments, or social follow-ups. " +
  "Routes through the daemon.";

export const AIOX_RETRANSMIT_UNCONFIRMED_DELIVERY_DESCRIPTION =
  "Manually retransmit one unconfirmed delivery only after explicit duplicate-risk confirmation. " +
  "The target must have a ready Codex runtime and bound thread; this action never queues and a failed/rejected manual attempt preserves unconfirmed state.";

export const AIOX_AGENTS_LIST_DESCRIPTION =
  "List the peer agents this agent can currently send to (its outbound-sendable targets). " +
  "Takes no input. Returns { peers: [] } when there is no active route to send through, which is not an error. " +
  "Routes through the daemon.";

export interface CodexIngressDaemonClient {
  receiveCodexMessage(
    request: ReceiveCodexMessageRequest,
  ): Promise<ReceiveCodexMessageResponse>;
  receiveCodexReply(
    request: ReceiveCodexReplyRequest,
  ): Promise<ReceiveCodexMessageResponse>;
  retransmitUnconfirmedDelivery(
    request: { deliveryId: string; confirmDuplicateRisk: boolean },
  ): Promise<RetransmitUnconfirmedDeliveryResponse>;
  registerCodexChannel(
    request: RegisterCodexChannelRequest,
  ): Promise<RegisterCodexChannelResponse>;
  listReachablePeers(request: {
    agentName: string;
    hostId?: string;
  }): Promise<ListReachablePeersResponse>;
  close(): void;
}

export interface CodexIngressMcpServerOptions {
  agentName: string;
  /** Host-qualified selector (W6 Stage 5A). Omitted resolves standalone. */
  hostId?: string;
  agentToken: string;
  daemonSocketPath: string;
  createDaemonClient?: (options: {
    socketPath: string;
  }) => CodexIngressDaemonClient;
}

export interface CodexIngressToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?:
    | { ok: true; message_id: string; dispatch?: DispatchSummary }
    | {
        ok: false;
        reason: "manual_retransmit_unconfirmed";
        message_id: string;
      };
  isError?: boolean;
}

export interface TypedSendInput {
  type: "question" | "instruction";
  intent: AgentAuthoredIntent;
  replyExpected: boolean;
  content: { text: string };
}

export interface TypedReplyInput {
  inReplyToDeliveryId: string;
  intent: AgentAuthoredIntent;
  replyExpected: boolean;
  content: { text: string };
}

export interface RetransmitUnconfirmedDeliveryInput {
  deliveryId: string;
  confirmDuplicateRisk: true;
}

export interface AgentsListToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?: { peers: PeerDto[] };
  isError?: boolean;
}

const agentIntentSchema = z.enum([
  "delegation",
  "discussion",
  "clarification",
  "result",
  "conclusion",
]);

const typedContentSchema = z.object({ text: z.string().min(1) }).strict();

export const typedSendInputSchema = z.object({
  type: z.enum(["question", "instruction"]),
  intent: agentIntentSchema,
  replyExpected: z.boolean(),
  content: typedContentSchema,
}).strict();

export const typedReplyInputSchema = z.object({
  inReplyToDeliveryId: z.string().min(1),
  intent: agentIntentSchema,
  replyExpected: z.boolean(),
  content: typedContentSchema,
}).strict();

export const retransmitUnconfirmedDeliveryInputSchema = z.object({
  deliveryId: z.string().min(1),
  confirmDuplicateRisk: z.literal(true),
}).strict();

export const agentsListInputSchema = z.object({}).strict();

const peerOutputSchema = z.object({
  name: z.string(),
  type: z.enum(["codex", "claude-code"]),
  role: z.string().nullable(),
  description: z.string().nullable(),
});

export const agentsListOutputSchema = z.object({
  peers: z.array(peerOutputSchema),
});

export function createSendMessageHandler(
  options: CodexIngressMcpServerOptions,
): (input: TypedSendInput) => Promise<CodexIngressToolResult> {
  const createDaemonClient = resolveDaemonClient(options);
  return async ({ type, intent, replyExpected, content }) => {
    logEvent("send_message_tool_called", { agentName: options.agentName });
    const messageId = createPublicMessageId();
    const client = createDaemonClient({ socketPath: options.daemonSocketPath });
    try {
      const result = await client.receiveCodexMessage({
        agentName: options.agentName,
        ...(options.hostId === undefined ? {} : { hostId: options.hostId }),
        token: options.agentToken,
        messageId,
        type,
        intent,
        replyExpected,
        content,
      });
      if (!result.ok) {
        return errorResult(
          result.reason ?? "unknown_error",
          JSON.stringify(result),
        );
      }
      return {
        content: [{ type: "text" as const, text: `sent ${messageId}` }],
        structuredContent: {
          ok: true as const,
          message_id: messageId,
          dispatch: result.dispatch,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult("daemon_call_failed", message);
    } finally {
      client.close();
    }
  };
}

export function createReplyHandler(
  options: CodexIngressMcpServerOptions,
): (input: TypedReplyInput) => Promise<CodexIngressToolResult> {
  const createDaemonClient = resolveDaemonClient(options);
  return async ({ inReplyToDeliveryId, intent, replyExpected, content }) => {
    logEvent("reply_tool_called", {
      agentName: options.agentName,
      inReplyToDeliveryId,
    });
    const messageId = createPublicMessageId();
    const client = createDaemonClient({ socketPath: options.daemonSocketPath });
    try {
      const result = await client.receiveCodexReply({
        agentName: options.agentName,
        ...(options.hostId === undefined ? {} : { hostId: options.hostId }),
        token: options.agentToken,
        messageId,
        inReplyToDeliveryId,
        intent,
        replyExpected,
        content,
      });
      if (!result.ok) {
        return errorResult(
          result.reason ?? "unknown_error",
          JSON.stringify(result),
        );
      }
      return {
        content: [{ type: "text" as const, text: `reply sent ${messageId}` }],
        structuredContent: {
          ok: true as const,
          message_id: messageId,
          dispatch: result.dispatch,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult("daemon_call_failed", message);
    } finally {
      client.close();
    }
  };
}

export function createRetransmitUnconfirmedDeliveryHandler(
  options: CodexIngressMcpServerOptions,
): (input: RetransmitUnconfirmedDeliveryInput) => Promise<CodexIngressToolResult> {
  const createDaemonClient = resolveDaemonClient(options);
  return async ({ deliveryId, confirmDuplicateRisk }) => {
    const client = createDaemonClient({ socketPath: options.daemonSocketPath });
    try {
      const result = await client.retransmitUnconfirmedDelivery({
        deliveryId,
        confirmDuplicateRisk,
      });
      if (!result.ok) {
        if (result.reason === "manual_retransmit_unconfirmed") {
          return {
            content: [
              {
                type: "text",
                text: `manual retransmit sent for ${deliveryId}; target acceptance unknown (unconfirmed)`,
              },
            ],
            structuredContent: {
              ok: false,
              reason: "manual_retransmit_unconfirmed",
              message_id: result.delivery.messageId,
            },
          };
        }
        return errorResult(result.reason, JSON.stringify(result));
      }
      return {
        content: [{ type: "text", text: `manual retransmit delivered for ${deliveryId}` }],
        structuredContent: { ok: true, message_id: result.delivery.messageId },
      };
    } catch (error) {
      return errorResult("daemon_call_failed", error instanceof Error ? error.message : String(error));
    } finally {
      client.close();
    }
  };
}

export function createAgentsListHandler(
  options: CodexIngressMcpServerOptions,
): (input: Record<string, never>) => Promise<AgentsListToolResult> {
  const createDaemonClient = resolveDaemonClient(options);
  return async () => {
    logEvent("agents_list_tool_called", { agentName: options.agentName });
    const client = createDaemonClient({ socketPath: options.daemonSocketPath });
    try {
      const result = await client.listReachablePeers({
        agentName: options.agentName,
        ...(options.hostId === undefined ? {} : { hostId: options.hostId }),
      });
      if (!result.ok) {
        return errorResult(result.reason, JSON.stringify(result));
      }
      return {
        content: [{ type: "text" as const, text: summarizePeers(result.peers) }],
        structuredContent: { peers: result.peers },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult("daemon_call_failed", message);
    } finally {
      client.close();
    }
  };
}

function summarizePeers(peers: readonly PeerDto[]): string {
  return peers.length === 0
    ? "no reachable peers: no active outbound route from this agent"
    : `peers: ${peers.map((peer) => peer.name).join(", ")}`;
}

function resolveDaemonClient(
  options: CodexIngressMcpServerOptions,
): (opts: { socketPath: string }) => CodexIngressDaemonClient {
  return (
    options.createDaemonClient ??
    ((opts) =>
      createDaemonSocketClient({
        socketPath: opts.socketPath,
      }) as unknown as CodexIngressDaemonClient)
  );
}

export function createCodexIngressMcpServer(
  options: CodexIngressMcpServerOptions,
): McpServer {
  const mcp = new McpServer(
    { name: `aiox-codex-${options.agentName}`, version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions: CODEX_INGRESS_INSTRUCTIONS,
    },
  );

  const sendHandler = createSendMessageHandler(options);
  const replyHandler = createReplyHandler(options);
  const retransmitHandler = createRetransmitUnconfirmedDeliveryHandler(options);
  const agentsListHandler = createAgentsListHandler(options);

  mcp.registerTool(
    "send",
    {
      description: AIOX_SEND_MESSAGE_DESCRIPTION,
      inputSchema: typedSendInputSchema,
      outputSchema: z.object({
        ok: z.literal(true),
        message_id: z.string(),
        dispatch: dispatchSummaryOutputSchema.optional(),
      }),
    },
    sendHandler as never,
  );

  mcp.registerTool(
    "reply",
    {
      description: AIOX_REPLY_DESCRIPTION,
      inputSchema: typedReplyInputSchema,
      outputSchema: z.object({
        ok: z.literal(true),
        message_id: z.string(),
        dispatch: dispatchSummaryOutputSchema.optional(),
      }),
    },
    replyHandler as never,
  );

  mcp.registerTool(
    "aiox_retransmit_unconfirmed_delivery",
    {
      description: AIOX_RETRANSMIT_UNCONFIRMED_DELIVERY_DESCRIPTION,
      inputSchema: retransmitUnconfirmedDeliveryInputSchema,
      outputSchema: z.discriminatedUnion("ok", [
        z.object({ ok: z.literal(true), message_id: z.string() }),
        z.object({
          ok: z.literal(false),
          reason: z.literal("manual_retransmit_unconfirmed"),
          message_id: z.string(),
        }),
      ]),
    },
    retransmitHandler as never,
  );

  mcp.registerTool(
    "agents_list",
    {
      description: AIOX_AGENTS_LIST_DESCRIPTION,
      inputSchema: agentsListInputSchema,
      outputSchema: agentsListOutputSchema,
    },
    agentsListHandler as never,
  );

  return mcp;
}

export interface CodexIngressMcpServerEnv {
  agentName: string;
  /** Host-qualified selector (W6 Stage 5A). Undefined resolves standalone. */
  hostId?: string;
  agentToken: string;
  daemonSocketPath: string;
}

export function parseCodexIngressEnv(
  env: Record<string, string | undefined> = process.env,
): CodexIngressMcpServerEnv {
  const agentName = requireEnv(env, "AIOX_CODEX_AGENT_NAME");
  // Encoded as "" for standalone by buildCodexMcpEnv -- see its comment for
  // why this env var is always set rather than sometimes absent.
  const rawHostId = env["AIOX_CODEX_HOST_ID"];
  const hostId = rawHostId === undefined || rawHostId.length === 0 ? undefined : rawHostId;
  const agentToken = requireEnv(env, "AIOX_CODEX_AGENT_TOKEN");
  const daemonSocketPath = requireEnv(env, "AIOX_SOCKET_PATH");
  return { agentName, ...(hostId === undefined ? {} : { hostId }), agentToken, daemonSocketPath };
}

export interface RunCodexIngressMcpServerDependencies {
  env?: Record<string, string | undefined>;
  createMcpServer?: (options: CodexIngressMcpServerOptions) => {
    connect(transport: unknown): Promise<void>;
  };
  createTransport?: () => unknown;
  createDaemonClient?: (options: {
    socketPath: string;
  }) => CodexIngressDaemonClient;
  log?: (event: string, fields: Record<string, unknown>) => void;
}

export async function runCodexIngressMcpServer(): Promise<void> {
  await runCodexIngressMcpServerWithDependencies();
}

export async function runCodexIngressMcpServerWithDependencies(
  dependencies: RunCodexIngressMcpServerDependencies = {},
): Promise<void> {
  const env = parseCodexIngressEnv(dependencies.env);
  const log = dependencies.log ?? logEvent;
  const createMcpServer =
    dependencies.createMcpServer ?? createCodexIngressMcpServer;
  const createTransport =
    dependencies.createTransport ?? (() => new StdioServerTransport());
  const createDaemonClient =
    dependencies.createDaemonClient ??
    ((options: { socketPath: string }) =>
      createDaemonSocketClient({
        socketPath: options.socketPath,
      }) as unknown as CodexIngressDaemonClient);

  log("codex_mcp_starting", {
    agentName: env.agentName,
  });

  const mcp = createMcpServer({
    agentName: env.agentName,
    ...(env.hostId === undefined ? {} : { hostId: env.hostId }),
    agentToken: env.agentToken,
    daemonSocketPath: env.daemonSocketPath,
    createDaemonClient,
  });
  const createTransportResult = createTransport();

  await mcp.connect(createTransportResult);
  log("codex_mcp_connected", { agentName: env.agentName });

  await registerCodexChannel({
    env,
    createDaemonClient,
    log,
  });

  await waitForTransportClose(createTransportResult);
}

function waitForTransportClose(transport: unknown): Promise<void> {
  if (
    typeof transport !== "object" ||
    transport === null ||
    !("onclose" in transport)
  ) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const target = transport as { onclose?: () => void };
    const previous = target.onclose;
    target.onclose = () => {
      previous?.();
      resolve();
    };
  });
}

async function registerCodexChannel(options: {
  env: CodexIngressMcpServerEnv;
  createDaemonClient: (opts: {
    socketPath: string;
  }) => CodexIngressDaemonClient;
  log: (event: string, fields: Record<string, unknown>) => void;
}): Promise<void> {
  let client: CodexIngressDaemonClient;
  try {
    client = options.createDaemonClient({
      socketPath: options.env.daemonSocketPath,
    });
  } catch (error) {
    options.log("codex_mcp_register_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  try {
    const reg = (await client.registerCodexChannel({
      agentName: options.env.agentName,
      ...(options.env.hostId === undefined ? {} : { hostId: options.env.hostId }),
      token: options.env.agentToken,
    })) as { ok: boolean; reason?: string };
    if (!reg.ok) {
      options.log("codex_mcp_register_failed", { result: reg });
      return;
    }
    options.log("codex_mcp_registered", { agentName: options.env.agentName });
  } catch (error) {
    options.log("codex_mcp_register_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    client.close();
  }
}

function errorResult(
  reason: string,
  detail: string,
): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  return {
    content: [{ type: "text" as const, text: `error:${reason} ${detail}` }],
    isError: true,
  };
}

function logEvent(event: string, fields: Record<string, unknown>): void {
  process.stderr.write(JSON.stringify({ event, ...fields }) + "\n");
}

function requireEnv(
  env: Record<string, string | undefined>,
  name: string,
): string {
  const value = env[name];
  if (typeof value !== "string" || value.length === 0) {
    process.stderr.write(
      JSON.stringify({ event: "fatal", error: `missing_env_${name}` }) + "\n",
    );
    process.exit(1);
  }
  return value;
}
