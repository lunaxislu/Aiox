import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { z } from "zod";

import { createPublicMessageId } from "../../core/public-ids.js";
import type {
  ReceiveClaudeChannelMessageResponse,
  ReceiveClaudeChannelReplyResponse,
  RetransmitUnconfirmedDeliveryResponse,
} from "../../daemon/api.js";
import { createDaemonSocketClient } from "../../daemon/socket-transport.js";
import type {
  DispatchSummary,
  AgentAuthoredIntent,
  ReceiveClaudeChannelMessageRequest,
  ReceiveClaudeChannelReplyRequest,
} from "../../daemon/state.js";
import { dispatchSummaryOutputSchema } from "../shared/dispatch-schema.js";

// ---------------------------------------------------------------------------
// V1 Claude Channel notification
// ---------------------------------------------------------------------------

export interface ChannelNotificationInput {
  content: string;
}

export interface ChannelNotification {
  method: "notifications/claude/channel";
  params: {
    content: string;
  };
}

export function buildChannelNotification(
  input: ChannelNotificationInput,
): ChannelNotification {
  return {
    method: "notifications/claude/channel",
    params: {
      content: input.content,
    },
  };
}

// ---------------------------------------------------------------------------
// Endpoint validation (mirrors daemon-side validation)
// ---------------------------------------------------------------------------

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);

export function parseLoopbackHttpEndpoint(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:") return null;
  if (!LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (url.port.length === 0) return null;
  if (!url.pathname.endsWith("/send")) return null;
  return `${url.protocol}//${url.host}${url.pathname}`;
}

// ---------------------------------------------------------------------------
// MCP server factory
// ---------------------------------------------------------------------------

export const CLAUDE_CHANNEL_INSTRUCTIONS = `
You are part of a multi-agent orchestration system named aiox.
These instructions define the aiox tool protocol. Follow them regardless of the natural language used by the human user or another agent.

Claude Code provides the host-owned outer <channel> wrapper for each message.
The outer <channel source="..."> attribute identifies this channel server,
not the message sender. The envelope's own source.address field is the actual
sender; always read sender identity from the JSON body, never from the outer tag.
Its body is a canonical AIOX envelope JSON document; use that envelope's fields
to interpret the message and its reply contract.
An envelope with intent: "notification" is a daemon-authored outcome event, not a reply;
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
- use send(type, intent, replyExpected, content) to start the request
- set intent explicitly
- MUST include a clear goal
- MUST include expected output
- MUST include relevant context and constraints
- do not use greetings or social filler

## Unconfirmed Delivery Operations

Use aiox_retransmit_unconfirmed_delivery only for a delivery that is unconfirmed, and only after an operator has explicitly confirmed the duplicate-delivery risk; confirmDuplicateRisk: true is required. Retransmitting sends a new direct attempt for the same delivery and risks delivering a duplicate message. A delivered result here only means the channel transport accepted the push — it does not mean the Claude session received, read, or completed it.

## Typed Message Intent

When using send or reply, provide intent explicitly as one of:
delegation, discussion, clarification, result, or conclusion.

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

- reply(inReplyToDeliveryId, intent, replyExpected, content): respond to an existing delivery. Reply type is fixed by the daemon.
- send(type, intent, replyExpected, content): start a new aiox thread. type is question or instruction.
- aiox_retransmit_unconfirmed_delivery(deliveryId, confirmDuplicateRisk): manually retransmit one unconfirmed delivery after explicit operator duplicate-risk confirmation.
`;

export const CLAUDE_SEND_DESCRIPTION =
  "Start a new aiox thread for user-requested collaboration, delegation, review, validation, investigation, or discussion. " +
  "Provide type (question or instruction), intent, replyExpected, and content.text. " +
  "Content is text only; do not supply content.mediaType. " +
  "Do not use for greetings, thanks, acknowledgments, or social follow-ups. " +
  "Routes through the daemon.";

export const CLAUDE_REPLY_DESCRIPTION =
  "Reply to an existing aiox thread. " +
  "Provide inReplyToDeliveryId, intent, replyExpected, and content.text; the daemon fixes reply type. " +
  "Content is text only; do not supply content.mediaType. " +
  "Use only for concrete task results, direct answers, clarification questions, or substantive discussion turns. " +
  "Routes through the daemon.";

export const CLAUDE_RETRANSMIT_UNCONFIRMED_DELIVERY_DESCRIPTION =
  "Manually retransmit one unconfirmed delivery only after explicit operator duplicate-risk confirmation. " +
  "Requires confirmDuplicateRisk: true. Retransmitting sends a new direct attempt for the same delivery " +
  "and risks delivering a duplicate message. A delivered result here means only that the channel transport " +
  "accepted the push, not that the Claude session received, read, or completed the delivery.";

export interface ClaudeChannelDaemonClient {
  receiveClaudeChannelMessage(
    request: ReceiveClaudeChannelMessageRequest,
  ): Promise<ReceiveClaudeChannelMessageResponse>;
  receiveClaudeChannelReply(
    request: ReceiveClaudeChannelReplyRequest,
  ): Promise<ReceiveClaudeChannelReplyResponse>;
  retransmitUnconfirmedDelivery(
    request: { deliveryId: string; confirmDuplicateRisk: boolean },
  ): Promise<RetransmitUnconfirmedDeliveryResponse>;
  close(): void;
}

export interface ClaudeChannelMcpServerOptions {
  agentName: string;
  daemonSocketPath: string;
  createDaemonClient?: (options: {
    socketPath: string;
  }) => ClaudeChannelDaemonClient;
}

export interface ClaudeChannelToolResult {
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

export interface TypedClaudeSendInput {
  type: "question" | "instruction";
  intent: AgentAuthoredIntent;
  replyExpected: boolean;
  content: { text: string };
}

export interface TypedClaudeReplyInput {
  inReplyToDeliveryId: string;
  intent: AgentAuthoredIntent;
  replyExpected: boolean;
  content: { text: string };
}

export interface RetransmitUnconfirmedDeliveryInput {
  deliveryId: string;
  confirmDuplicateRisk: true;
}

const agentIntentSchema = z.enum([
  "delegation",
  "discussion",
  "clarification",
  "result",
  "conclusion",
]);

const typedContentSchema = z.object({ text: z.string().min(1) }).strict();

export const typedClaudeSendInputSchema = z
  .object({
    type: z.enum(["question", "instruction"]),
    intent: agentIntentSchema,
    replyExpected: z.boolean(),
    content: typedContentSchema,
  })
  .strict();

export const typedClaudeReplyInputSchema = z
  .object({
    inReplyToDeliveryId: z.string().min(1),
    intent: agentIntentSchema,
    replyExpected: z.boolean(),
    content: typedContentSchema,
  })
  .strict();

export const retransmitUnconfirmedDeliveryInputSchema = z
  .object({
    deliveryId: z.string().min(1),
    confirmDuplicateRisk: z.literal(true),
  })
  .strict();

export function createClaudeChannelMcpServer(
  options: ClaudeChannelMcpServerOptions,
): McpServer {
  const mcp = new McpServer(
    { name: `aiox-claude-${options.agentName}`, version: "0.1.0" },
    {
      capabilities: {
        experimental: { "claude/channel": {} },
        tools: {},
      },
      instructions: CLAUDE_CHANNEL_INSTRUCTIONS,
    },
  );

  mcp.registerTool(
    "send",
    {
      description: CLAUDE_SEND_DESCRIPTION,
      inputSchema: typedClaudeSendInputSchema,
      outputSchema: z.object({
        ok: z.literal(true),
        message_id: z.string(),
        dispatch: dispatchSummaryOutputSchema.optional(),
      }),
    },
    createSendHandler(options) as never,
  );

  mcp.registerTool(
    "reply",
    {
      description: CLAUDE_REPLY_DESCRIPTION,
      inputSchema: typedClaudeReplyInputSchema,
      outputSchema: z.object({
        ok: z.literal(true),
        message_id: z.string(),
        dispatch: dispatchSummaryOutputSchema.optional(),
      }),
    },
    createReplyHandler(options) as never,
  );

  mcp.registerTool(
    "aiox_retransmit_unconfirmed_delivery",
    {
      description: CLAUDE_RETRANSMIT_UNCONFIRMED_DELIVERY_DESCRIPTION,
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
    createRetransmitUnconfirmedDeliveryHandler(options) as never,
  );

  return mcp;
}

export function createSendHandler(
  options: ClaudeChannelMcpServerOptions,
): (input: TypedClaudeSendInput) => Promise<ClaudeChannelToolResult> {
  const createDaemonClient = resolveDaemonClient(options);
  return async ({ type, intent, replyExpected, content }) => {
    const messageId = createPublicMessageId();
    logEvent("send_tool_called", {
      agentName: options.agentName,
      message_id: messageId,
    });
    const client = createDaemonClient({ socketPath: options.daemonSocketPath });
    try {
      const result = await client.receiveClaudeChannelMessage({
        agentName: options.agentName,
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
      logEvent("message_sent_to_daemon", {
        agentName: options.agentName,
        message_id: messageId,
      });
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
      logEvent("send_daemon_callback_failed", {
        agentName: options.agentName,
        message_id: messageId,
        error: message,
      });
      return errorResult("daemon_call_failed", message);
    } finally {
      client.close();
    }
  };
}

export function createReplyHandler(
  options: ClaudeChannelMcpServerOptions,
): (input: TypedClaudeReplyInput) => Promise<ClaudeChannelToolResult> {
  const createDaemonClient = resolveDaemonClient(options);
  return async ({ inReplyToDeliveryId, intent, replyExpected, content }) => {
    const messageId = createPublicMessageId();
    logEvent("reply_tool_called", {
      agentName: options.agentName,
      inReplyToDeliveryId,
    });
    const client = createDaemonClient({ socketPath: options.daemonSocketPath });
    try {
      const result = await client.receiveClaudeChannelReply({
        agentName: options.agentName,
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
      logEvent("reply_sent_to_daemon", {
        agentName: options.agentName,
        inReplyToDeliveryId,
      });
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
      logEvent("reply_daemon_callback_failed", {
        agentName: options.agentName,
        inReplyToDeliveryId,
        error: message,
      });
      return errorResult("daemon_call_failed", message);
    } finally {
      client.close();
    }
  };
}

export function createRetransmitUnconfirmedDeliveryHandler(
  options: ClaudeChannelMcpServerOptions,
): (input: RetransmitUnconfirmedDeliveryInput) => Promise<ClaudeChannelToolResult> {
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
      return errorResult(
        "daemon_call_failed",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      client.close();
    }
  };
}

function resolveDaemonClient(
  options: ClaudeChannelMcpServerOptions,
): (opts: { socketPath: string }) => ClaudeChannelDaemonClient {
  return (
    options.createDaemonClient ??
    ((opts) =>
      createDaemonSocketClient({
        socketPath: opts.socketPath,
      }) as unknown as ClaudeChannelDaemonClient)
  );
}

function errorResult(reason: string, detail: string): ClaudeChannelToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: `${reason}: ${detail}` }],
  };
}

// ---------------------------------------------------------------------------
// HTTP ingress (daemon → channel server)
// ---------------------------------------------------------------------------

export interface ClaudeChannelHttpIngressOptions {
  port?: number;
  reportBootFailure?: (failure: {
    reason: "claude_channel_port_in_use";
  }) => Promise<void>;
}

export interface ClaudeChannelPortInUseError extends Error {
  reason: "claude_channel_port_in_use";
  port: number;
}

export interface ClaudeChannelHttpIngressResult {
  server: Server;
  port: number;
  endpoint: string;
}

export function startClaudeChannelHttpIngress(
  mcp: McpServer,
  options: ClaudeChannelHttpIngressOptions = {},
): Promise<ClaudeChannelHttpIngressResult> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      if (req.method !== "POST" || req.url !== "/send") {
        sendJson(res, 404, { error: "not_found" });
        return;
      }
      try {
        const raw = await readJson(req);
        const parsed = InboundMessage.parse(raw);
        const notification = buildChannelNotification({ content: parsed.content });
        logEvent("ingress_send_received", {});
        await mcp.server.notification(notification);
        logEvent("ingress_send_notified", {});
        sendJson(res, 202, { ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logEvent("ingress_send_failed", { error: message });
        sendJson(res, 400, { error: message });
      }
    });

    const listenPort = options.port ?? 0;
    server.once("error", async (error) => {
      const listenError = toListenError(error, listenPort);
      if (
        options.reportBootFailure &&
        "reason" in listenError &&
        listenError.reason === "claude_channel_port_in_use"
      ) {
        void options
          .reportBootFailure({ reason: listenError.reason })
          .catch(() => undefined);
      }
      reject(listenError);
    });
    server.listen(listenPort, "127.0.0.1", () => {
      const addr = server.address();
      const assignedPort =
        typeof addr === "object" && addr !== null ? addr.port : listenPort;
      const endpoint = `http://127.0.0.1:${assignedPort}/send`;
      logEvent("ingress_listening", { endpoint });
      resolve({ server, port: assignedPort, endpoint });
    });
  });
}

// ---------------------------------------------------------------------------
// Daemon registration
// ---------------------------------------------------------------------------

export interface RegisterWithDaemonOptions {
  daemonSocketPath: string;
  agentName: string;
  token: string;
  endpoint: string;
}

export async function registerWithDaemon(
  options: RegisterWithDaemonOptions,
): Promise<void> {
  logEvent("daemon_register_request", {
    agentName: options.agentName,
    tokenHash: tokenFingerprint(options.token),
    endpoint: options.endpoint,
  });
  const socketClient = createDaemonSocketClient({
    socketPath: options.daemonSocketPath,
  });
  try {
    const result = await socketClient.registerClaudeChannel({
      agentName: options.agentName,
      token: options.token,
      endpoint: options.endpoint,
    });
    if (!result || !(result as { ok: boolean }).ok) {
      logEvent("daemon_register_failed", {
        agentName: options.agentName,
        result,
      });
      process.exit(1);
    }
    logEvent("daemon_register_succeeded", { agentName: options.agentName });
  } catch (error) {
    logEvent("daemon_register_failed", {
      agentName: options.agentName,
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  } finally {
    socketClient.close();
  }
}

// ---------------------------------------------------------------------------
// Env parsing + entry point
// ---------------------------------------------------------------------------

interface ChannelServerEnv {
  agentName: string;
  token: string;
  daemonSocketPath: string;
  port?: number;
}

export function parseChannelServerEnv(
  env: Record<string, string | undefined> = process.env,
): ChannelServerEnv {
  const agentName = requireEnv(env, "AIOX_CLAUDE_CHANNEL_AGENT_NAME");
  const token = requireEnv(env, "AIOX_CLAUDE_CHANNEL_TOKEN");
  const daemonSocketPath = requireEnv(env, "AIOX_SOCKET_PATH");
  const rawPort = env["AIOX_CLAUDE_CHANNEL_PORT"];
  const port = rawPort !== undefined ? parsePortEnv(rawPort) : undefined;
  return { agentName, token, daemonSocketPath, port };
}

// Entry point invoked by the `aiox mcp-claude` hidden CLI subcommand
// dispatch (src/cli/invocation.ts).
export async function runClaudeChannelMcpServer(): Promise<void> {
  const config = parseChannelServerEnv();
  logEvent("channel_server_starting", {
    agentName: config.agentName,
    tokenHash: tokenFingerprint(config.token),
    daemonSocketPath: config.daemonSocketPath,
  });

  const mcp = createClaudeChannelMcpServer({
    agentName: config.agentName,
    daemonSocketPath: config.daemonSocketPath,
  });

  // Connect to Claude CLI's stdio first so initialize handshake is handled
  // before the HTTP ingress and daemon registration work.
  const connectPromise = mcp.connect(new StdioServerTransport());

  const ingress = await startClaudeChannelHttpIngress(mcp, {
    port: config.port,
    reportBootFailure: async ({ reason }) => {
      const socketClient = createDaemonSocketClient({
        socketPath: config.daemonSocketPath,
      });
      try {
        await socketClient.reportClaudeChannelBootFailure({
          agentName: config.agentName,
          token: config.token,
          reason,
        });
      } finally {
        socketClient.close();
      }
    },
  });

  await registerWithDaemon({
    daemonSocketPath: config.daemonSocketPath,
    agentName: config.agentName,
    token: config.token,
    endpoint: ingress.endpoint,
  });

  await connectPromise;
  // Keep the HTTP ingress alive for the process lifetime (Claude CLI owns this
  // process's lifecycle as the stdio parent).
  void ingress.server;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const InboundMessage = z.object({
  content: z.string().min(1),
});

function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

function logEvent(event: string, fields: Record<string, unknown>): void {
  process.stderr.write(JSON.stringify({ event, ...fields }) + "\n");
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.length === 0 ? {} : JSON.parse(raw);
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  if (res.writableEnded) return;
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
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

function parsePortEnv(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    process.stderr.write(
      JSON.stringify({
        event: "fatal",
        error: "invalid_env_AIOX_CLAUDE_CHANNEL_PORT",
        value: raw,
      }) + "\n",
    );
    process.exit(1);
  }
  return n;
}

function toListenError(error: unknown, listenPort: number): Error {
  if (
    listenPort > 0 &&
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "EADDRINUSE"
  ) {
    return createClaudeChannelPortInUseError(listenPort);
  }

  return error instanceof Error ? error : new Error(String(error));
}

function createClaudeChannelPortInUseError(
  port: number,
): ClaudeChannelPortInUseError {
  const error = new Error(
    `Claude channel port ${port} is already in use. Unset AIOX_CLAUDE_CHANNEL_PORT to use auto-port, or free/change the port.`,
  ) as ClaudeChannelPortInUseError;
  error.reason = "claude_channel_port_in_use";
  error.port = port;
  return error;
}
