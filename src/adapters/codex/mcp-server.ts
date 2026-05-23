import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { z } from "zod";

import { createDaemonSocketClient } from "../../daemon/socket-transport.js";

const INSTRUCTIONS =
  "aiox orchestration tools available to this Codex session. " +
  "Call aiox_send_message(content) to broadcast a routed message to paired aiox agents. " +
  "Call aiox_reply(parent_message_id, content) to reply to a parent message id received earlier.";

export interface CodexIngressDaemonClient {
  receiveCodexMessage(request: unknown): Promise<unknown>;
  receiveCodexReply(request: unknown): Promise<unknown>;
  registerCodexChannel(request: unknown): Promise<unknown>;
  close(): void;
}

export interface CodexIngressMcpServerOptions {
  agentName: string;
  agentToken: string;
  daemonSocketPath: string;
  createMessageId?: () => string;
  createDaemonClient?: (options: { socketPath: string }) => CodexIngressDaemonClient;
}

export interface CodexIngressToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?: { ok: true; message_id: string };
  isError?: boolean;
}

export function createSendMessageHandler(
  options: CodexIngressMcpServerOptions,
): (input: { content: string }) => Promise<CodexIngressToolResult> {
  const createDaemonClient = resolveDaemonClient(options);
  const createMessageId = resolveMessageIdFactory(options);
  return async ({ content }) => {
    logEvent("send_message_tool_called", { agentName: options.agentName });
    const messageId = createMessageId();
    const client = createDaemonClient({ socketPath: options.daemonSocketPath });
    try {
      const result = (await client.receiveCodexMessage({
        agentName: options.agentName,
        token: options.agentToken,
        messageId,
        content,
      })) as { ok: boolean; reason?: string };
      if (!result.ok) {
        return errorResult(result.reason ?? "unknown_error", JSON.stringify(result));
      }
      return {
        content: [{ type: "text" as const, text: `sent ${messageId}` }],
        structuredContent: { ok: true as const, message_id: messageId },
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
): (input: {
  parent_message_id: string;
  content: string;
}) => Promise<CodexIngressToolResult> {
  const createDaemonClient = resolveDaemonClient(options);
  const createMessageId = resolveMessageIdFactory(options);
  return async ({ parent_message_id, content }) => {
    logEvent("reply_tool_called", {
      agentName: options.agentName,
      parent_message_id,
    });
    const messageId = createMessageId();
    const client = createDaemonClient({ socketPath: options.daemonSocketPath });
    try {
      const result = (await client.receiveCodexReply({
        agentName: options.agentName,
        token: options.agentToken,
        messageId,
        parentMessageId: parent_message_id,
        content,
      })) as { ok: boolean; reason?: string };
      if (!result.ok) {
        return errorResult(result.reason ?? "unknown_error", JSON.stringify(result));
      }
      return {
        content: [{ type: "text" as const, text: `reply sent ${messageId}` }],
        structuredContent: { ok: true as const, message_id: messageId },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult("daemon_call_failed", message);
    } finally {
      client.close();
    }
  };
}

function resolveDaemonClient(
  options: CodexIngressMcpServerOptions,
): (opts: { socketPath: string }) => CodexIngressDaemonClient {
  return (
    options.createDaemonClient ??
    ((opts) =>
      createDaemonSocketClient({ socketPath: opts.socketPath }) as unknown as
        CodexIngressDaemonClient)
  );
}

function resolveMessageIdFactory(options: CodexIngressMcpServerOptions): () => string {
  return options.createMessageId ?? (() => `codex-msg-${crypto.randomUUID()}`);
}

export function createCodexIngressMcpServer(
  options: CodexIngressMcpServerOptions,
): McpServer {
  const mcp = new McpServer(
    { name: `aiox-codex-${options.agentName}`, version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions: INSTRUCTIONS,
    },
  );

  const sendHandler = createSendMessageHandler(options);
  const replyHandler = createReplyHandler(options);

  mcp.registerTool(
    "aiox_send_message",
    {
      description:
        "Broadcast a message from this Codex agent to all paired aiox agents via the daemon router.",
      inputSchema: z.object({
        content: z.string().min(1),
      }),
      outputSchema: z.object({
        ok: z.literal(true),
        message_id: z.string(),
      }),
    },
    sendHandler as never,
  );

  mcp.registerTool(
    "aiox_reply",
    {
      description:
        "Reply to a parent message id received earlier from another aiox agent. Routes through the daemon.",
      inputSchema: z.object({
        parent_message_id: z.string().min(1),
        content: z.string().min(1),
      }),
      outputSchema: z.object({
        ok: z.literal(true),
        message_id: z.string(),
      }),
    },
    replyHandler as never,
  );

  return mcp;
}

export interface CodexIngressMcpServerEnv {
  agentName: string;
  agentToken: string;
  daemonSocketPath: string;
}

export function parseCodexIngressEnv(
  env: Record<string, string | undefined> = process.env,
): CodexIngressMcpServerEnv {
  const agentName = requireEnv(env, "AIOX_CODEX_AGENT_NAME");
  const agentToken = requireEnv(env, "AIOX_CODEX_AGENT_TOKEN");
  const daemonSocketPath = requireEnv(env, "AIOX_SOCKET_PATH");
  return { agentName, agentToken, daemonSocketPath };
}

export async function runCodexIngressMcpServer(): Promise<void> {
  const env = parseCodexIngressEnv();
  logEvent("codex_mcp_starting", {
    agentName: env.agentName,
  });

  const client = createDaemonSocketClient({ socketPath: env.daemonSocketPath });
  try {
    const reg = (await client.registerCodexChannel({
      agentName: env.agentName,
      token: env.agentToken,
    })) as { ok: boolean; reason?: string };
    if (!reg.ok) {
      logEvent("codex_mcp_register_failed", { result: reg });
      process.exit(1);
    }
  } finally {
    client.close();
  }

  const mcp = createCodexIngressMcpServer({
    agentName: env.agentName,
    agentToken: env.agentToken,
    daemonSocketPath: env.daemonSocketPath,
  });

  await mcp.connect(new StdioServerTransport());
  logEvent("codex_mcp_connected", { agentName: env.agentName });
}

function errorResult(reason: string, detail: string): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  return {
    content: [
      { type: "text" as const, text: `error:${reason} ${detail}` },
    ],
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
