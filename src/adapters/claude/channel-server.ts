import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { z } from "zod";

import type {
  ReceiveClaudeChannelMessageResponse,
  ReceiveClaudeChannelReplyResponse,
} from "../../daemon/api.js";
import { createDaemonSocketClient } from "../../daemon/socket-transport.js";
import type {
  DispatchSummary,
  ReceiveClaudeChannelMessageRequest,
  ReceiveClaudeChannelReplyRequest,
} from "../../daemon/state.js";
import { dispatchSummaryOutputSchema } from "../shared/dispatch-schema.js";

// ---------------------------------------------------------------------------
// V1 trusted channel framing (D1)
// ---------------------------------------------------------------------------

export interface ChannelNotificationInput {
  content: string;
  chatId?: string;
  origin?: string;
}

export interface ChannelNotification {
  method: "notifications/claude/channel";
  params: {
    content: string;
    meta?: Record<string, string>;
  };
}

function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function escapeXmlContent(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildChannelNotification(
  input: ChannelNotificationInput,
): ChannelNotification {
  const attrs: string[] = [`source="aiox"`];
  if (input.chatId) attrs.push(`chat_id="${escapeXmlAttr(input.chatId)}"`);
  if (input.origin) attrs.push(`origin="${escapeXmlAttr(input.origin)}"`);

  const framedContent = `<channel ${attrs.join(" ")}>${escapeXmlContent(input.content)}</channel>`;

  const meta: Record<string, string> = {};
  if (input.chatId) meta.chat_id = input.chatId;
  if (input.origin) meta.origin = input.origin;

  return {
    method: "notifications/claude/channel",
    params: {
      content: framedContent,
      ...(Object.keys(meta).length > 0 ? { meta } : {}),
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

Messages arrive as <channel source="aiox" chat_id="..." origin="...">text</channel>.

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
- use send(text) to start the request
- MUST include an Intent label
- MUST include a clear goal
- MUST include expected output
- MUST include relevant context and constraints
- do not use greetings or social filler

## Message Intent

When using send(text) or reply(chat_id, text), begin the text with exactly one intent label:

Intent: delegation
Intent: discussion
Intent: clarification
Intent: result
Intent: conclusion

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

Use reply(chat_id, text) only when responding to an existing aiox thread with one of:
- a concrete task result
- a direct answer to a direct question
- a substantive review, objection, option, or decision input
- a clarification request that blocks progress
- a valid multi-round discussion turn

Use send(text) only when starting a new aiox thread with one of:
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

To end a discussion, send one final reply with:

Intent: conclusion
[[CONCLUDE]]

After sending a conclusion, do not call any aiox tool again for that thread.

If you receive a message containing [[CONCLUDE]], do not reply with any aiox tool.
If the human user says to stop, wrap up, conclude, "마무리해", or "이제 됐어", conclude the active aiox thread.

## Examples

Good:
Intent: delegation
Goal: review the diff in src/router.ts for race conditions.
Expected output: list of findings with file:line and severity.
Context: this is part of aiox Step 14.

Bad, do not send:
안녕! 도와줄게 있어?
Reason: greeting or social follow-up.

Bad, do not send:
네 알겠습니다.
Reason: simple acknowledgment.

## Tool Usage

- reply(chat_id, text): continue an existing aiox task or discussion thread.
- send(text): start a new aiox task or discussion thread.
`;

export const CLAUDE_SEND_DESCRIPTION =
  "Start a new aiox thread for user-requested collaboration, delegation, review, validation, investigation, or discussion. " +
  "CRITICAL: Start text with exactly one Intent: label and include a clear goal, expected output, relevant context, and constraints. " +
  "Do not use for greetings, thanks, acknowledgments, or social follow-ups. " +
  "Routes through the daemon.";

export const CLAUDE_REPLY_DESCRIPTION =
  "Reply to an existing aiox thread. " +
  "CRITICAL: Start text with exactly one Intent: label. " +
  "Do not reply to messages containing [[CONCLUDE]]. " +
  "Use only for concrete task results, direct answers, clarification questions, or substantive discussion turns. " +
  "Routes through the daemon.";

export interface ClaudeChannelDaemonClient {
  receiveClaudeChannelMessage(
    request: ReceiveClaudeChannelMessageRequest,
  ): Promise<ReceiveClaudeChannelMessageResponse>;
  receiveClaudeChannelReply(
    request: ReceiveClaudeChannelReplyRequest,
  ): Promise<ReceiveClaudeChannelReplyResponse>;
  close(): void;
}

export interface ClaudeChannelMcpServerOptions {
  agentName: string;
  daemonSocketPath: string;
  createMessageId?: () => string;
  createDaemonClient?: (options: { socketPath: string }) => ClaudeChannelDaemonClient;
}

export interface ClaudeChannelToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?: {
    ok: true;
    message_id?: string;
    dispatch?: DispatchSummary;
  };
  isError?: boolean;
}

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
      inputSchema: z.object({
        text: z.string().min(1),
      }),
      outputSchema: z.object({ ok: z.literal(true), message_id: z.string() }),
    },
    createSendHandler(options) as never,
  );

  mcp.registerTool(
    "reply",
    {
      description: CLAUDE_REPLY_DESCRIPTION,
      inputSchema: z.object({
        chat_id: z.string().min(1),
        text: z.string().min(1),
      }),
      outputSchema: z.object({
        ok: z.literal(true),
        dispatch: dispatchSummaryOutputSchema.optional(),
      }),
    },
    createReplyHandler(options) as never,
  );

  return mcp;
}

export function createSendHandler(
  options: ClaudeChannelMcpServerOptions,
): (input: { text: string }) => Promise<ClaudeChannelToolResult> {
  const createDaemonClient = resolveDaemonClient(options);
  const createMessageId = options.createMessageId ?? (() => `claude-msg-${randomUUID()}`);
  return async ({ text }) => {
    const messageId = createMessageId();
    logEvent("send_tool_called", {
      agentName: options.agentName,
      message_id: messageId,
    });
    const client = createDaemonClient({ socketPath: options.daemonSocketPath });
    try {
      const result = await client.receiveClaudeChannelMessage({
        agentName: options.agentName,
        messageId,
        text,
      });
      if (!result.ok) {
        return errorResult(result.reason ?? "unknown_error", JSON.stringify(result));
      }
      logEvent("message_sent_to_daemon", {
        agentName: options.agentName,
        message_id: messageId,
      });
      return {
        content: [{ type: "text" as const, text: `sent ${messageId}` }],
        structuredContent: { ok: true as const, message_id: messageId },
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
): (input: { chat_id: string; text: string }) => Promise<ClaudeChannelToolResult> {
  const createDaemonClient = resolveDaemonClient(options);
  return async ({ chat_id, text }) => {
    logEvent("reply_tool_called", {
      agentName: options.agentName,
      chat_id,
    });
    const client = createDaemonClient({ socketPath: options.daemonSocketPath });
    try {
      const result = await client.receiveClaudeChannelReply({
        agentName: options.agentName,
        chatId: chat_id,
        text,
      });
      if (!result.ok) {
        return errorResult(result.reason ?? "unknown_error", JSON.stringify(result));
      }
      logEvent("reply_sent_to_daemon", {
        agentName: options.agentName,
        chat_id,
      });
      return {
        content: [{ type: "text" as const, text: "reply sent" }],
        structuredContent: { ok: true as const, dispatch: result.dispatch },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logEvent("reply_daemon_callback_failed", {
        agentName: options.agentName,
        chat_id,
        error: message,
      });
      return errorResult("daemon_call_failed", message);
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
      createDaemonSocketClient({ socketPath: opts.socketPath }) as unknown as
        ClaudeChannelDaemonClient)
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
        const notification = buildChannelNotification({
          content: parsed.content,
          chatId: parsed.chat_id,
          origin: parsed.origin,
        });
        logEvent("ingress_send_received", {
          chat_id: parsed.chat_id,
          origin: parsed.origin,
        });
        await mcp.server.notification(notification);
        logEvent("ingress_send_notified", { chat_id: parsed.chat_id });
        sendJson(res, 202, { ok: true });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        logEvent("ingress_send_failed", { error: message });
        sendJson(res, 400, { error: message });
      }
    });

    const listenPort = options.port ?? 0;
    server.once("error", (error) => {
      reject(toListenError(error, listenPort));
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

async function main(): Promise<void> {
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

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    process.stderr.write(
      JSON.stringify({
        event: "fatal",
        ...(isClaudeChannelPortInUseError(error)
          ? {
              reason: error.reason,
              port: error.port,
            }
          : {}),
        error: error instanceof Error ? error.message : String(error),
      }) + "\n",
    );
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const InboundMessage = z.object({
  content: z.string().min(1),
  chat_id: z.string().min(1).optional(),
  origin: z.string().min(1).optional(),
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

function isClaudeChannelPortInUseError(
  error: unknown,
): error is ClaudeChannelPortInUseError {
  return (
    error instanceof Error &&
    "reason" in error &&
    (error as { reason: unknown }).reason === "claude_channel_port_in_use"
  );
}
