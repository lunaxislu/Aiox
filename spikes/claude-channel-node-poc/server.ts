import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { z } from "zod";

const InboundChannelMessage = z.object({
  content: z.string().min(1),
  chat_id: z.string().min(1).optional(),
  origin: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
});

type InboundChannelMessage = z.infer<typeof InboundChannelMessage>;

export type ClaudeChannelNotification = {
  method: "notifications/claude/channel";
  params: {
    content: string;
    meta?: Record<string, string>;
  };
};

export function toChannelNotification(
  input: InboundChannelMessage,
): ClaudeChannelNotification {
  const meta = Object.fromEntries(
    Object.entries({
      chat_id: input.chat_id,
      origin: input.origin,
      source: input.source,
    }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

  return {
    method: "notifications/claude/channel",
    params: {
      content: input.content,
      ...(Object.keys(meta).length > 0 ? { meta } : {}),
    },
  };
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
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function createClaudeChannelServer(): McpServer {
  const mcp = new McpServer(
    { name: "aiox-channel-poc", version: "0.0.1" },
    {
      capabilities: {
        experimental: {
          "claude/channel": {},
        },
        tools: {},
      },
      instructions:
        'Messages arrive as <channel source="aiox-channel-poc" chat_id="..." origin="...">text</channel>. When a chat_id is present, call the reply tool with the same chat_id and your result.',
    },
  );

  mcp.registerTool(
    "reply",
    {
      description: "Record a reply to an inbound aiox channel message.",
      inputSchema: z.object({
        chat_id: z.string().min(1),
        text: z.string().min(1),
      }),
      outputSchema: z.object({
        ok: z.literal(true),
      }),
    },
    async ({ chat_id, text }) => {
      process.stderr.write(
        JSON.stringify({
          event: "reply",
          chat_id,
          text,
          at: new Date().toISOString(),
        }) + "\n",
      );

      return {
        content: [{ type: "text", text: "reply recorded" }],
        structuredContent: { ok: true },
      };
    },
  );

  return mcp;
}

export function startHttpIngress(mcp: McpServer, port = 8788) {
  const server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/send") {
      sendJson(res, 404, { error: "not_found" });
      return;
    }

    try {
      const parsed = InboundChannelMessage.parse(await readJson(req));
      const notification = toChannelNotification(parsed);
      await mcp.server.notification(notification);
      sendJson(res, 202, { ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        JSON.stringify({ event: "send_failed", error: message }) + "\n",
      );
      sendJson(res, 400, { error: message });
    }
  });

  server.listen(port, "127.0.0.1", () => {
    process.stderr.write(
      JSON.stringify({
        event: "http_listening",
        url: `http://127.0.0.1:${port}/send`,
      }) + "\n",
    );
  });

  return server;
}

async function main(): Promise<void> {
  const mcp = createClaudeChannelServer();

  startHttpIngress(mcp, Number(process.env.AIOX_CHANNEL_POC_PORT ?? 18788));
  await mcp.connect(new StdioServerTransport());
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
