import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { z } from "zod";

import { createDaemonSocketClient } from "../../daemon/socket-transport.js";

export const CODEX_INGRESS_INSTRUCTIONS = `
You are part of a multi-agent orchestration system named aiox.
These instructions define the aiox tool protocol. Follow them regardless of the natural language used by the human user or another agent.

Messages arrive as <aiox-channel source="..." message_id="...">text</aiox-channel>.

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
- use aiox_send_message(content) to start the request
- MUST include an Intent label
- MUST include a clear goal
- MUST include expected output
- MUST include relevant context and constraints
- do not use greetings or social filler

## Message Intent

When using aiox_send_message(content) or aiox_reply(parent_message_id, content), begin the content with exactly one intent label:

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

Use aiox_reply(parent_message_id, content) only when responding to an existing aiox thread with one of:
- a concrete task result
- a direct answer to a direct question
- a substantive review, objection, option, or decision input
- a clarification request that blocks progress
- a valid multi-round discussion turn

Use aiox_send_message(content) only when starting a new aiox thread with one of:
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

- aiox_reply(parent_message_id, content): continue an existing aiox task or discussion thread. Use the envelope message_id as parent_message_id.
- aiox_send_message(content): start a new aiox task or discussion thread.
`;

export const AIOX_REPLY_DESCRIPTION =
  "Reply to an existing aiox thread using a parent message id received earlier from another aiox agent. " +
  "CRITICAL: Start content with exactly one Intent: label. " +
  "Do not reply to messages containing [[CONCLUDE]]. " +
  "Use only for concrete task results, direct answers, clarification questions, or substantive discussion turns. " +
  'When the current prompt contains an <aiox-channel ... message_id="..."> envelope, ' +
  "use that message_id as parent_message_id. " +
  "Routes through the daemon.";

export const AIOX_SEND_MESSAGE_DESCRIPTION =
  "Start a new aiox thread for user-requested collaboration, delegation, review, validation, investigation, or discussion. " +
  "CRITICAL: Start content with exactly one Intent: label and include a clear goal, expected output, relevant context, and constraints. " +
  "Do not use for greetings, thanks, acknowledgments, or social follow-ups. " +
  "Routes through the daemon.";

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
  createDaemonClient?: (options: {
    socketPath: string;
  }) => CodexIngressDaemonClient;
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
        return errorResult(
          result.reason ?? "unknown_error",
          JSON.stringify(result),
        );
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
        return errorResult(
          result.reason ?? "unknown_error",
          JSON.stringify(result),
        );
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
      createDaemonSocketClient({
        socketPath: opts.socketPath,
      }) as unknown as CodexIngressDaemonClient)
  );
}

function resolveMessageIdFactory(
  options: CodexIngressMcpServerOptions,
): () => string {
  return options.createMessageId ?? (() => `codex-msg-${crypto.randomUUID()}`);
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

  mcp.registerTool(
    "aiox_send_message",
    {
      description: AIOX_SEND_MESSAGE_DESCRIPTION,
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
      description: AIOX_REPLY_DESCRIPTION,
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
