#!/usr/bin/env node

/* global Buffer, URL, clearTimeout, fetch, process, setTimeout */

import http from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DEFAULT_CLAUDE_URL = "http://127.0.0.1:8788";
const DEFAULT_REPLY_PORT = 8789;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_BIND_HOST = "127.0.0.1";
const MCP_NAME = "bridge";
const MCP_VERSION = "0.1.0";

function parseArgs(argv) {
  const options = {
    claudeUrl: DEFAULT_CLAUDE_URL,
    replyPort: DEFAULT_REPLY_PORT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
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

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function parseReplyBody(value) {
  if (!isRecord(value)) {
    return { error: "Invalid JSON body" };
  }

  const chatId = value.chat_id;
  if (typeof chatId !== "string" || chatId.length === 0) {
    return { error: "chat_id field required" };
  }

  const text = value.text;
  if (typeof text !== "string" || text.length === 0) {
    return { error: "text field required" };
  }

  const origin = value.origin;
  if (origin !== "claude") {
    return { error: 'origin must be "claude"' };
  }

  return {
    chat_id: chatId,
    origin,
    text,
  };
}

class Bridge {
  constructor(options) {
    this.options = options;
    this.replyServer = null;
    this.pendingReplies = new Map();
    this.shuttingDown = false;

    this.mcpServer = new McpServer({
      name: MCP_NAME,
      version: MCP_VERSION,
    });

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
  }

  async start() {
    this.installSignalHandlers();
    this.startReplyServer();

    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
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

  startReplyServer() {
    this.replyServer = http.createServer((req, res) => {
      void this.handleReplyRequest(req, res);
    });

    this.replyServer.on("error", (error) => {
      if (this.shuttingDown) {
        return;
      }

      logLine(
        "reply-server",
        `failed to listen on ${DEFAULT_BIND_HOST}:${this.options.replyPort}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      process.exit(1);
    });

    this.replyServer.listen(this.options.replyPort, DEFAULT_BIND_HOST, () => {
      logLine(
        "reply-server",
        `listening on http://${DEFAULT_BIND_HOST}:${this.options.replyPort}/claude-reply`,
      );
    });
  }

  async handleReplyRequest(req, res) {
    const url = new URL(req.url ?? "/", `http://${DEFAULT_BIND_HOST}`);
    if (req.method !== "POST" || url.pathname !== "/claude-reply") {
      writeJson(res, 404, { error: "Not Found" });
      return;
    }

    const body = await readJsonBody(req);
    if (body.error) {
      writeJson(res, 400, { error: body.error });
      return;
    }

    const parsed = parseReplyBody(body.value);
    if ("error" in parsed) {
      writeJson(res, 400, { error: parsed.error });
      return;
    }

    const pending = this.pendingReplies.get(parsed.chat_id);
    if (!pending) {
      writeJson(res, 404, {
        error: "No pending ask_claude request for chat_id",
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
    writeJson(res, 200, { status: "ok", chat_id: parsed.chat_id });
  }

  createPendingReply(chatId) {
    let resolveFn;
    let rejectFn;

    const promise = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    let timer = null;
    const pending = {
      resolve: (text) => {
        if (!this.pendingReplies.has(chatId)) {
          return false;
        }

        this.pendingReplies.delete(chatId);
        if (timer) {
          clearTimeout(timer);
        }
        resolveFn(text);
        return true;
      },
      reject: (error) => {
        if (!this.pendingReplies.has(chatId)) {
          return false;
        }

        this.pendingReplies.delete(chatId);
        if (timer) {
          clearTimeout(timer);
        }
        rejectFn(error);
        return true;
      },
      cancel: () => {
        if (!this.pendingReplies.has(chatId)) {
          return false;
        }

        this.pendingReplies.delete(chatId);
        if (timer) {
          clearTimeout(timer);
        }
        return true;
      },
    };

    timer = setTimeout(() => {
      const timeoutError = new Error(
        `Timed out waiting for Claude reply after ${this.options.timeoutMs}ms (chat_id=${chatId})`,
      );
      if (pending.reject(timeoutError)) {
        logLine("timeout", timeoutError.message);
      }
    }, this.options.timeoutMs);

    this.pendingReplies.set(chatId, pending);

    return {
      cancel: pending.cancel,
      promise,
    };
  }

  async askClaude(text) {
    const chatId = randomUUID();
    const pending = this.createPendingReply(chatId);

    logLine(
      "ask_claude",
      `sending chat_id=${chatId} text_chars=${text.length}`,
    );

    try {
      await this.postToClaudeAdapter({
        chat_id: chatId,
        origin: "codex",
        relay_depth: 0,
        text,
      });
    } catch (error) {
      pending.cancel();
      throw error instanceof Error ? error : new Error(String(error));
    }

    const replyText = await pending.promise;
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

  async close() {
    for (const pending of this.pendingReplies.values()) {
      pending.cancel();
    }
    this.pendingReplies.clear();

    if (this.replyServer) {
      await new Promise((resolve) => this.replyServer.close(resolve));
      this.replyServer = null;
    }
  }
}

function printUsage() {
  process.stdout.write(`Usage:
  node bridge/index.js [options]

Options:
  --claude-url <url>     claude-adapter URL (default: ${DEFAULT_CLAUDE_URL})
  --reply-port <port>    reply server port (default: ${DEFAULT_REPLY_PORT})
  --timeout-ms <ms>      reply timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS})
  -h, --help             show this help
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
  await bridge.start();
}

await main();
