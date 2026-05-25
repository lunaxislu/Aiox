import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { z } from "zod";

import { createDaemonSocketClient } from "../../daemon/socket-transport.js";

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

const V1_INSTRUCTIONS =
  'Messages arrive as <channel source="aiox" chat_id="..." origin="...">text</channel>. ' +
  "Call reply(chat_id, text) when responding to a message that has a chat_id. " +
  "Call send(text) to start a new routed aiox message when no chat_id applies.";

export interface ClaudeChannelDaemonClient {
  receiveClaudeChannelMessage(request: unknown): Promise<unknown>;
  receiveClaudeChannelReply(request: unknown): Promise<unknown>;
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
  structuredContent?: { ok: true; message_id?: string };
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
      instructions: V1_INSTRUCTIONS,
    },
  );

  mcp.registerTool(
    "send",
    {
      description: "Start a new routed aiox message without a chat_id.",
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
      description: "Send a reply back through the aiox orchestration channel.",
      inputSchema: z.object({
        chat_id: z.string().min(1),
        text: z.string().min(1),
      }),
      outputSchema: z.object({ ok: z.literal(true) }),
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
      const result = (await client.receiveClaudeChannelMessage({
        agentName: options.agentName,
        messageId,
        text,
      })) as { ok: boolean; reason?: string };
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
      await client.receiveClaudeChannelReply({
        agentName: options.agentName,
        chatId: chat_id,
        text,
      });
      logEvent("reply_sent_to_daemon", {
        agentName: options.agentName,
        chat_id,
      });
      return {
        content: [{ type: "text" as const, text: "reply sent" }],
        structuredContent: { ok: true as const },
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

export interface ClaudeChannelHttpIngressResult {
  server: Server;
  port: number;
  endpoint: string;
}

export function startClaudeChannelHttpIngress(
  mcp: McpServer,
  options: ClaudeChannelHttpIngressOptions = {},
): Promise<ClaudeChannelHttpIngressResult> {
  return new Promise((resolve) => {
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
