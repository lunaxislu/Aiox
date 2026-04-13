/**
 * claude-adapter: Claude Code custom channel server
 *
 * 역할:
 *   - bridge가 HTTP POST로 메시지를 보내면 Claude Code 세션에 channel 이벤트로 전달
 *   - Claude Code가 reply tool을 호출하면 bridge로 응답 전달
 *
 * 실행:
 *   claude --channels plugin:./claude-adapter/index.ts \
 *          --dangerously-load-development-channels
 *
 * 환경변수:
 *   LISTEN_PORT       - HTTP 서버 포트 (기본값: 8788)
 *   BRIDGE_REPLY_URL  - Claude Code 응답을 전달할 bridge URL (기본값: http://localhost:8789/claude-reply)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const LISTEN_PORT = Number(process.env.LISTEN_PORT ?? 8788);
const BRIDGE_REPLY_URL =
  process.env.BRIDGE_REPLY_URL ?? "http://localhost:8789/claude-reply";
const MAX_RELAY_DEPTH = 3;

type InboundBody = {
  chat_id: string;
  origin?: string;
  relay_depth?: number;
  text: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseInboundBody(value: unknown): InboundBody | { error: string } {
  if (!isRecord(value)) {
    return { error: "Invalid JSON body" };
  }

  const text = value.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return { error: "text field required" };
  }

  const chat_id = value.chat_id;
  if (typeof chat_id !== "string" || chat_id.trim().length === 0) {
    return { error: "chat_id field required" };
  }

  const origin = value.origin;
  if (origin !== undefined && typeof origin !== "string") {
    return { error: "origin must be a string when provided" };
  }

  const relayDepth = value.relay_depth;
  if (
    relayDepth !== undefined &&
    (typeof relayDepth !== "number" ||
      !Number.isInteger(relayDepth) ||
      relayDepth < 0)
  ) {
    return {
      error: "relay_depth must be a non-negative integer when provided",
    };
  }

  return {
    chat_id,
    origin,
    relay_depth: relayDepth,
    text,
  };
}

// ─── MCP 서버 초기화 ──────────────────────────────────────────────────────────

const mcpServer = new McpServer(
  { name: "claude-adapter", version: "0.1.0" },
  {
    capabilities: {
      experimental: {
        // Claude Code가 이 서버를 channel로 인식하기 위한 필수 선언
        "claude/channel": {},
      },
    },
    instructions: `You are connected to the claude-adapter channel.
Messages arrive as: <channel source="claude-adapter" chat_id="..." origin="..." relay_depth="...">text</channel>

Rules:
- Always reply using the "reply" tool with the same chat_id from the channel tag.
- If origin is "claude", do NOT reply — this is a loop prevention check.
- If relay_depth is 3 or more, do NOT reply.`,
  },
);

// ─── reply tool 등록 ──────────────────────────────────────────────────────────

mcpServer.registerTool(
  "reply",
  {
    description:
      "Send a response back to the bridge. Use the chat_id from the channel event.",
    inputSchema: z.object({
      chat_id: z
        .string()
        .describe(
          "Conversation ID — copy from the channel event's chat_id attribute",
        ),
      text: z.string().describe("Response text to send back to the bridge"),
    }),
  },
  async ({ chat_id, text }) => {
    let response: Response;
    let responseText = "";

    try {
      response = await fetch(BRIDGE_REPLY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text, origin: "claude" }),
      });
      responseText = await response.text();
    } catch (error) {
      process.stderr.write(
        `[claude-adapter] bridge 응답 전달 실패: ${BRIDGE_REPLY_URL} (${
          error instanceof Error ? error.message : String(error)
        })\n`,
      );
      throw new Error("Failed to deliver bridge reply");
    }

    if (!response.ok) {
      process.stderr.write(
        `[claude-adapter] bridge 응답 전달 실패: ${BRIDGE_REPLY_URL} status=${response.status} body=${responseText}\n`,
      );
      throw new Error(
        `Bridge reply rejected: HTTP ${response.status} ${responseText}`,
      );
    }

    return { content: [{ type: "text" as const, text: "sent" }] };
  },
);

// ─── HTTP 인바운드 서버 (bridge → Claude Code) ────────────────────────────────

const httpServer = Bun.serve({
  port: LISTEN_PORT,
  hostname: "127.0.0.1", // localhost only — 보안
  async fetch(req) {
    const pathname = new URL(req.url).pathname;

    if (pathname !== "/") {
      return new Response("Not Found", { status: 404 });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let rawBody: unknown;

    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = parseInboundBody(rawBody);
    if ("error" in body) {
      return new Response(JSON.stringify({ error: body.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── loop 방지 ────────────────────────────────────────────────────────────
    if (body.origin === "claude") {
      return new Response(
        JSON.stringify({ status: "ignored", reason: "loop: origin is claude" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const relayDepth = body.relay_depth ?? 0;
    if (relayDepth >= MAX_RELAY_DEPTH) {
      return new Response(
        JSON.stringify({
          status: "ignored",
          reason: `loop: relay_depth ${relayDepth} >= MAX_RELAY_DEPTH ${MAX_RELAY_DEPTH}`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── Claude Code 세션으로 channel 이벤트 전달 ──────────────────────────────
    try {
      await mcpServer.server.notification({
        method: "notifications/claude/channel",
        params: {
          content: body.text,
          meta: {
            chat_id: body.chat_id,
            origin: body.origin ?? "bridge",
            relay_depth: String(relayDepth),
          },
        },
      });
    } catch (err) {
      process.stderr.write(
        `[claude-adapter] channel 이벤트 전달 실패: ${err}\n`,
      );
      return new Response(
        JSON.stringify({ error: "Failed to deliver channel event" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ status: "ok", chat_id: body.chat_id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  },
});

process.stderr.write(
  `[claude-adapter] HTTP 서버 시작: http://127.0.0.1:${httpServer.port}\n`,
);
process.stderr.write(
  `[claude-adapter] bridge reply URL: ${BRIDGE_REPLY_URL}\n`,
);

// ─── stdio transport 연결 (Claude Code가 subprocess로 실행) ──────────────────

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
