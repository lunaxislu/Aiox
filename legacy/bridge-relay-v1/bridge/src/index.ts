#!/usr/bin/env node

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

/* global Buffer, URL, fetch, process */

import http from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { CodexAppServerClient } from "./codex-app-server-client.js";
import { PendingRequest } from "./pending-request.js";
import {
  MAX_RELAY_DEPTH,
  parseRequestBody,
} from "./protocol.js";

const DEFAULT_CLAUDE_URL = "http://127.0.0.1:8788";
const DEFAULT_REPLY_PORT = 8789;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_BIND_HOST = "127.0.0.1";
const DEFAULT_CODEX_APP_SERVER_URL = "ws://127.0.0.1:4500";
const MCP_NAME = "bridge";
const MCP_VERSION = "0.2.0";
const MAX_DEBUG_EVENTS = 100;

function parseArgs(argv) {
  const options = {
    claudeUrl: DEFAULT_CLAUDE_URL,
    replyPort: DEFAULT_REPLY_PORT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    codexAppServerUrl:
      process.env.CODEX_APP_SERVER_URL ?? DEFAULT_CODEX_APP_SERVER_URL,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    switch (arg) {
      case "--claude-url":
        options.claudeUrl = value;
        break;
      case "--reply-port":
        options.replyPort = Number(value);
        if (!Number.isInteger(options.replyPort) || options.replyPort <= 0) {
          throw new Error(`Invalid --reply-port value: ${value}`);
        }
        break;
      case "--timeout-ms":
        options.timeoutMs = Number(value);
        if (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0) {
          throw new Error(`Invalid --timeout-ms value: ${value}`);
        }
        break;
      case "--codex-app-server-url":
        options.codexAppServerUrl = value;
        break;
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }

    index += 1;
  }

  return options;
}

function logLine(prefix, message) {
  process.stderr.write(`[bridge] ${prefix}: ${message}\n`);
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  try {
    const raw = Buffer.concat(chunks).toString("utf8");
    return { value: JSON.parse(raw) };
  } catch {
    return { error: "Invalid JSON" };
  }
}

class Bridge {
  constructor(options) {
    this.options = options;
    this.startedAt = new Date();
    this.httpServer = null;
    this.shuttingDown = false;
    this.forwardReplies = new Map();
    this.reverseRequests = new Map();
    this.debugEvents = [];
    this.codexAppServerClient = null;
    this.codexAppServerReady = null;
    this.mcpServer = new McpServer(
      {
        name: MCP_NAME,
        version: MCP_VERSION,
      },
      {
        instructions: `You are connected to the bridge MCP server.

## Claude -> Codex relay protocol

When Claude sends you a message, bridge injects it into your Codex UI as a normal user prompt. The injected prompt starts with a marker like:

  [MCP RELAY — chat_id: <UUID>]
  This message was relayed from Claude via the bridge MCP server.

  INSTRUCTIONS (MUST FOLLOW):
  - Do NOT treat this as a task ...
  - Call reply_to_claude(chat_id="<UUID>", text="<your reply>")

  Message from Claude:
  <actual message text>

When you see that marker in your own user prompt:
1. Read the "Message from Claude" body.
2. Decide on a direct, concise reply.
3. Call the reply_to_claude tool with:
   - chat_id = the exact UUID from the marker line (copy verbatim)
   - text    = your reply text
4. Do NOT run investigation tools (git, grep, file reads, shell) unless the message body explicitly asks you to implement or debug something.
5. Do NOT ask the user for a chat_id. Do NOT make one up. Use only the chat_id that literally appears in the marker.

That reply_to_claude call is what delivers your answer back to Claude. There is no other mechanism. A normal assistant message in your transcript is NOT forwarded to Claude anymore.

## Tools

- ask_claude(text): use ONLY when you (Codex) want to proactively send a message to Claude. This is the forward path (Codex -> Claude).
- reply_to_claude(chat_id, text): use to respond to any [MCP RELAY] marker you see in your own user prompt. chat_id must be copied exactly from the marker.

## Rule of thumb

- If your user prompt starts with "[MCP RELAY — chat_id: ...]", your job is to call reply_to_claude with the matching chat_id. That is the reply.
- If your user prompt does NOT start with that marker, the message is from your human user and you behave normally.`,
      },
    );

    this.registerTools();
  }

  registerTools() {
    this.mcpServer.registerTool(
      "ask_claude",
      {
        description:
          "Send a prompt to Claude Code and return the reply as tool output.",
        inputSchema: z.object({
          text: z.string().trim().min(1),
        }),
      },
      async ({ text }) => this.askClaude(text),
    );

    this.mcpServer.registerTool(
      "reply_to_claude",
      {
        description:
          "Complete a Claude -> Codex reverse request or manual reply using the chat_id associated with the request.",
        inputSchema: z.object({
          chat_id: z.string().trim().min(1),
          text: z.string().trim().min(1),
        }),
      },
      async ({ chat_id, text }) => this.replyToClaude(chat_id, text),
    );
  }

  async start() {
    this.installSignalHandlers();
    this.recordDebugEvent("startup", {
      pid: process.pid,
      timeout_ms: this.options.timeoutMs,
    });
    logLine(
      "startup",
      `pid=${process.pid} started_at=${this.startedAt.toISOString()} timeout_ms=${this.options.timeoutMs}`,
    );
    void this.startHttpServer().catch((error) => {
      if (this.shuttingDown) {
        return;
      }

      logLine(
        "http-server",
        `startup failed, but MCP will continue without reply server: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
  }

  async startCodexAppServerClient() {
    if (this.codexAppServerClient) {
      return;
    }

    this.codexAppServerClient = new CodexAppServerClient({
      clientName: MCP_NAME,
      clientVersion: MCP_VERSION,
      logLine,
      url: this.options.codexAppServerUrl,
      timeoutMs: this.options.timeoutMs,
    });
    await this.codexAppServerClient.connect();
    logLine(
      "codex-app-server",
      `connected to codex app-server at ${this.options.codexAppServerUrl}`,
    );
  }

  async ensureCodexAppServerClient() {
    if (this.codexAppServerClient) {
      if (this.codexAppServerReady) {
        await this.codexAppServerReady;
      }
      return;
    }

    if (!this.codexAppServerReady) {
      this.codexAppServerReady = this.startCodexAppServerClient().catch(
        (error) => {
          this.codexAppServerClient = null;
          this.codexAppServerReady = null;
          throw error;
        },
      );
    }

    await this.codexAppServerReady;
  }

  installSignalHandlers() {
    const stop = async (signal) => {
      if (this.shuttingDown) {
        return;
      }

      this.shuttingDown = true;
      logLine("signal", `${signal} received, shutting down`);
      await this.close();
      process.exit(0);
    };

    process.on("SIGINT", () => {
      void stop("SIGINT");
    });
    process.on("SIGTERM", () => {
      void stop("SIGTERM");
    });
  }

  startHttpServer() {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        void this.handleHttpRequest(req, res);
      });

      this.httpServer.once("error", (error) => {
        if (this.shuttingDown) {
          resolve();
          return;
        }

        logLine(
          "http-server",
          `failed to listen on ${DEFAULT_BIND_HOST}:${this.options.replyPort}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        reject(error);
      });

      this.httpServer.listen(this.options.replyPort, DEFAULT_BIND_HOST, () => {
        logLine(
          "http-server",
          `listening on http://${DEFAULT_BIND_HOST}:${this.options.replyPort}`,
        );
        resolve();
      });
    });
  }

  async handleHttpRequest(req, res) {
    const url = new URL(req.url ?? "/", `http://${DEFAULT_BIND_HOST}`);

    if (req.method === "GET" && url.pathname === "/debug/reverse-pending") {
      this.handleDebugReversePending(res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/debug/forward-pending") {
      this.handleDebugForwardPending(res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/debug/status") {
      writeJson(res, 200, this.getDebugStatus());
      return;
    }

    if (req.method === "GET" && url.pathname === "/debug/events") {
      writeJson(res, 200, {
        bridge: this.getDebugStatus().bridge,
        events: this.debugEvents,
        status: "ok",
      });
      return;
    }

    if (req.method !== "POST") {
      writeJson(res, 405, { error: "Method Not Allowed" });
      return;
    }

    if (url.pathname === "/claude-reply") {
      await this.handleClaudeReply(req, res);
      return;
    }

    if (url.pathname === "/codex-request") {
      await this.handleCodexRequest(req, res);
      return;
    }

    writeJson(res, 404, { error: "Not Found" });
  }

  handleDebugReversePending(res) {
    const status = this.getDebugStatus();
    writeJson(res, 200, {
      bridge: status.bridge,
      count: status.reverse_pending.count,
      chat_ids: status.reverse_pending.chat_ids,
      status: "ok",
    });
  }

  handleDebugForwardPending(res) {
    const status = this.getDebugStatus();
    writeJson(res, 200, {
      bridge: status.bridge,
      count: status.forward_pending.count,
      chat_ids: status.forward_pending.chat_ids,
      status: "ok",
    });
  }

  getDebugStatus() {
    return {
      bridge: {
        pid: process.pid,
        started_at: this.startedAt.toISOString(),
        uptime_ms: Date.now() - this.startedAt.getTime(),
        timeout_ms: this.options.timeoutMs,
      },
      forward_pending: {
        count: this.forwardReplies.size,
        chat_ids: Array.from(this.forwardReplies.keys()),
      },
      reverse_pending: {
        count: this.reverseRequests.size,
        chat_ids: Array.from(this.reverseRequests.keys()),
      },
      status: "ok",
    };
  }

  recordDebugEvent(type, details = {}) {
    this.debugEvents.push({
      at: new Date().toISOString(),
      details,
      type,
    });

    if (this.debugEvents.length > MAX_DEBUG_EVENTS) {
      this.debugEvents.splice(0, this.debugEvents.length - MAX_DEBUG_EVENTS);
    }
  }

  async handleClaudeReply(req, res) {
    const body = await readJsonBody(req);
    if (body.error) {
      writeJson(res, 400, { error: body.error });
      return;
    }

    const parsed = parseRequestBody(body.value);
    if ("error" in parsed) {
      writeJson(res, 400, { error: parsed.error });
      return;
    }

    if (parsed.origin !== "claude") {
      writeJson(res, 400, {
        error: 'origin must be "claude" for /claude-reply',
      });
      return;
    }

    const pending = this.forwardReplies.get(parsed.chat_id);
    if (!pending) {
      this.recordDebugEvent("claude_reply_missing_pending", {
        chat_id: parsed.chat_id,
        forward_pending_chat_ids: Array.from(this.forwardReplies.keys()),
      });
      writeJson(res, 404, {
        error: "No pending ask_claude request for chat_id",
        chat_id: parsed.chat_id,
        diagnostics: this.getDebugStatus(),
      });
      return;
    }

    const accepted = pending.resolve(parsed.text);
    if (!accepted) {
      writeJson(res, 409, {
        error: "Pending ask_claude request already finished",
      });
      return;
    }

    logLine("claude-reply", `resolved chat_id=${parsed.chat_id}`);
    this.recordDebugEvent("claude_reply_resolved", {
      chat_id: parsed.chat_id,
    });
    writeJson(res, 200, { status: "ok", chat_id: parsed.chat_id });
  }

  async handleCodexRequest(req, res) {
    const body = await readJsonBody(req);
    if (body.error) {
      writeJson(res, 400, { error: body.error });
      return;
    }

    const parsed = parseRequestBody(body.value);
    if ("error" in parsed) {
      writeJson(res, 400, { error: parsed.error });
      return;
    }

    if (parsed.origin !== "claude") {
      writeJson(res, 400, {
        error: 'origin must be "claude" for /codex-request',
      });
      return;
    }

    if (parsed.direction !== "reverse") {
      writeJson(res, 400, {
        error: 'direction must be "reverse" for /codex-request',
      });
      return;
    }

    const relayDepth = parsed.relay_depth ?? 0;
    if (relayDepth >= MAX_RELAY_DEPTH) {
      writeJson(res, 200, {
        status: "ignored",
        reason: `loop: relay_depth ${relayDepth} >= MAX_RELAY_DEPTH ${MAX_RELAY_DEPTH}`,
      });
      return;
    }

    const pending = this.createReversePending(parsed.chat_id);
    logLine(
      "codex-request",
      `received chat_id=${parsed.chat_id} text_chars=${parsed.text.length} preview=${JSON.stringify(parsed.text.slice(0, 120))}`,
    );

    try {
      await this.requestCodexReplyViaAppServer({
        chat_id: parsed.chat_id,
        text: parsed.text,
      });

      const replyText = await pending.promise;
      writeJson(res, 200, {
        status: "ok",
        chat_id: parsed.chat_id,
        text: replyText,
      });
    } catch (error) {
      pending.cancel();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const statusCode = errorMessage.startsWith("Timed out waiting")
        ? 504
        : 500;
      logLine("codex-mcp", `failed chat_id=${parsed.chat_id}: ${errorMessage}`);
      writeJson(res, statusCode, {
        error: errorMessage || "Timed out waiting for Codex reply",
      });
    } finally {
      this.reverseRequests.delete(parsed.chat_id);
    }
  }

  createForwardPending(chatId) {
    const pending = new PendingRequest(
      this.forwardReplies,
      chatId,
      this.options.timeoutMs,
      (error) => {
        logLine("timeout", error.message);
      },
      (event, value) => {
        this.recordDebugEvent(`forward_pending_${event}`, {
          chat_id: chatId,
          detail: value instanceof Error ? value.message : undefined,
          forward_pending_count: this.forwardReplies.size,
        });
      },
    );

    this.forwardReplies.set(chatId, pending);
    this.recordDebugEvent("forward_pending_created", {
      chat_id: chatId,
      forward_pending_count: this.forwardReplies.size,
    });
    return pending;
  }

  createReversePending(chatId) {
    const pending = new PendingRequest(
      this.reverseRequests,
      chatId,
      this.options.timeoutMs,
      (error) => {
        logLine("timeout", error.message);
      },
      (event, value) => {
        this.recordDebugEvent(`reverse_pending_${event}`, {
          chat_id: chatId,
          detail: value instanceof Error ? value.message : undefined,
          reverse_pending_count: this.reverseRequests.size,
        });
      },
    );

    this.reverseRequests.set(chatId, pending);
    logLine("reverse-request", `pending chat_id=${chatId}`);
    this.recordDebugEvent("reverse_pending_created", {
      chat_id: chatId,
      reverse_pending_count: this.reverseRequests.size,
    });
    return pending;
  }

  async askClaude(text) {
    const chatId = randomUUID();
    const pending = this.createForwardPending(chatId);

    logLine(
      "ask_claude",
      `sending chat_id=${chatId} text_chars=${text.length}`,
    );

    try {
      await this.postToClaudeAdapter({
        chat_id: chatId,
        direction: "forward",
        origin: "codex",
        relay_depth: 0,
        text,
      });
    } catch (error) {
      pending.cancel();
      this.forwardReplies.delete(chatId);
      this.recordDebugEvent("forward_send_failed", {
        chat_id: chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof Error ? error : new Error(String(error));
    }

    let replyText;
    try {
      replyText = await pending.promise;
    } finally {
      this.forwardReplies.delete(chatId);
      this.recordDebugEvent("forward_pending_finished", {
        chat_id: chatId,
        forward_pending_count: this.forwardReplies.size,
      });
    }

    logLine(
      "ask_claude",
      `resolved chat_id=${chatId} reply_chars=${replyText.length}`,
    );

    return {
      content: [
        {
          text: replyText,
          type: "text",
        },
      ],
    };
  }

  async replyToClaude(chatId, text) {
    const pending = this.reverseRequests.get(chatId);
    if (!pending) {
      throw new Error(
        `No pending Claude -> Codex request for chat_id=${chatId}`,
      );
    }

    const accepted = pending.resolve(text);
    if (!accepted) {
      throw new Error(
        `Pending Claude -> Codex request already finished for chat_id=${chatId}`,
      );
    }

    this.reverseRequests.delete(chatId);
    logLine("codex-reply", `resolved chat_id=${chatId}`);
    this.recordDebugEvent("codex_reply_resolved", {
      chat_id: chatId,
    });

    return {
      content: [
        {
          text: "sent",
          type: "text",
        },
      ],
    };
  }

  async postToClaudeAdapter(payload) {
    const response = await fetch(this.options.claudeUrl, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `Claude adapter returned ${response.status}: ${responseText}`,
      );
    }

    logLine(
      "relay",
      `sent to Claude for chat_id=${payload.chat_id} depth=${payload.relay_depth}`,
    );
  }

  async requestCodexReplyViaAppServer(payload) {
    logLine(
      "codex-app-server",
      `dispatching relay chat_id=${payload.chat_id} text_chars=${payload.text.length}`,
    );

    await this.ensureCodexAppServerClient();

    await this.codexAppServerClient.dispatchPrompt(
      payload.text,
      payload.chat_id,
    );
  }

  async close() {
    for (const pending of this.forwardReplies.values()) {
      pending.cancel();
    }
    this.forwardReplies.clear();

    for (const pending of this.reverseRequests.values()) {
      pending.cancel();
    }
    this.reverseRequests.clear();

    if (this.httpServer) {
      await new Promise((resolve) => this.httpServer.close(resolve));
      this.httpServer = null;
    }

    if (this.codexAppServerClient) {
      await this.codexAppServerClient.close().catch(() => {});
      this.codexAppServerClient = null;
    }
    this.codexAppServerReady = null;
  }
}

function printUsage() {
  process.stdout.write(`Usage:
  node bridge/dist/index.js [options]

Options:
  --claude-url <url>              claude-adapter URL (default: ${DEFAULT_CLAUDE_URL})
  --reply-port <port>             bridge HTTP port for /claude-reply and /codex-request (default: ${DEFAULT_REPLY_PORT})
  --timeout-ms <ms>               reply timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS})
  --codex-app-server-url <url>    shared Codex app-server WS URL (default: ${DEFAULT_CODEX_APP_SERVER_URL})
  -h, --help                      show this help

Environment:
  CODEX_APP_SERVER_URL            overrides --codex-app-server-url default
`);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    printUsage();
    process.exit(1);
    return;
  }

  if (options.help) {
    printUsage();
    return;
  }

  const bridge = new Bridge(options);
  try {
    await bridge.start();
  } catch (error) {
    process.stderr.write(
      `[bridge] fatal: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}

await main();
