#!/usr/bin/env node

/* global Buffer, URL, WebSocket, clearTimeout, fetch, process, setTimeout */

import http from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const DEFAULT_CLAUDE_URL = "http://127.0.0.1:8788";
const DEFAULT_REPLY_PORT = 8789;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_BIND_HOST = "127.0.0.1";
const DEFAULT_CODEX_APP_SERVER_URL = "ws://127.0.0.1:4500";
const MCP_NAME = "bridge";
const MCP_VERSION = "0.2.0";
const MAX_RELAY_DEPTH = 3;

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

function wrapRelayPrompt(text, chatId) {
  return [
    `[MCP RELAY — chat_id: ${chatId}]`,
    "This message was relayed from Claude via the bridge MCP server.",
    "",
    "INSTRUCTIONS (MUST FOLLOW):",
    "- Do NOT treat this as a task or a work request unless the message body explicitly asks you to implement or fix something.",
    "- Do NOT run git, grep, file reads, or any other investigation tools to 'understand' the message.",
    "- Just read the message and write a direct, concise reply.",
    `- When your reply is ready, call the bridge tool: reply_to_claude(chat_id="${chatId}", text="<your reply>")`,
    "- The chat_id above is the ONLY valid chat_id for this reply. Copy it exactly.",
    "- Nothing else is required from you. Do not ask the user anything.",
    "",
    "Message from Claude:",
    text,
  ].join("\n");
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

function extractToolText(result) {
  if (!isRecord(result)) {
    return null;
  }

  const structuredContent = result.structuredContent;
  if (isRecord(structuredContent)) {
    const structuredText = structuredContent.content;
    if (
      typeof structuredText === "string" &&
      structuredText.trim().length > 0
    ) {
      return structuredText.trim();
    }
  }

  const content = result.content;
  if (Array.isArray(content) && content.length > 0) {
    const firstItem = content[0];
    if (isRecord(firstItem) && typeof firstItem.text === "string") {
      const text = firstItem.text.trim();
      if (text.length > 0) {
        return text;
      }
    }
  }

  return null;
}

function parseRequestBody(value) {
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
  if (origin !== undefined && origin !== "codex" && origin !== "claude") {
    return { error: 'origin must be "codex" or "claude" when provided' };
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

  const direction = value.direction;
  if (
    direction !== undefined &&
    direction !== "forward" &&
    direction !== "reverse"
  ) {
    return { error: 'direction must be "forward" or "reverse" when provided' };
  }

  return {
    chat_id: chatId,
    direction,
    origin,
    relay_depth: relayDepth,
    text,
  };
}

class PendingRequest {
  constructor(collection, chatId, timeoutMs, onTimeout) {
    this.collection = collection;
    this.chatId = chatId;
    this.settled = false;
    this.resolveFn = null;
    this.rejectFn = null;
    this.timer = null;

    this.promise = new Promise((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });

    this.timer = setTimeout(() => {
      if (this.settled) {
        return;
      }

      this.settled = true;
      this.timer = null;
      this.collection.delete(this.chatId);
      const timeoutError = new Error(
        `Timed out waiting after ${timeoutMs}ms (chat_id=${chatId})`,
      );
      this.rejectFn?.(timeoutError);
      onTimeout?.(timeoutError);
    }, timeoutMs);
  }

  resolve(value) {
    if (this.settled) {
      return false;
    }

    this.settled = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.collection.delete(this.chatId);
    this.resolveFn?.(value);
    return true;
  }

  reject(error) {
    if (this.settled) {
      return false;
    }

    this.settled = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.collection.delete(this.chatId);
    this.rejectFn?.(error);
    return true;
  }

  cancel() {
    if (this.settled) {
      return false;
    }

    this.settled = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.collection.delete(this.chatId);
    return true;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function extractUserAgent(result) {
  if (!isRecord(result)) {
    return null;
  }

  if (isNonEmptyString(result.userAgent)) {
    return result.userAgent;
  }

  return null;
}

function extractTurnIdFromTurnResponse(result) {
  if (!isRecord(result)) {
    return null;
  }

  const turn = result.turn;
  if (isRecord(turn) && isNonEmptyString(turn.id)) {
    return turn.id;
  }

  if (isNonEmptyString(result.turnId)) {
    return result.turnId;
  }

  return null;
}

class CodexAppServerClient {
  constructor(options) {
    this.options = options;
    this.url = options.url;
    this.timeoutMs = options.timeoutMs;
    this.ws = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.connectPromise = null;
    this.closed = false;
  }

  async connect() {
    if (this.closed) {
      throw new Error("Codex App Server client is closed");
    }

    if (this.ws && this.ws.readyState === 1) {
      return;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.openAndInitialize().catch((error) => {
        this.connectPromise = null;
        throw error;
      });
    }

    await this.connectPromise;
  }

  openAndInitialize() {
    return new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(this.url);
      } catch (error) {
        reject(
          new Error(
            `Failed to open WebSocket to Codex app-server at ${this.url}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
        return;
      }

      let opened = false;
      let initialized = false;

      ws.addEventListener("open", () => {
        opened = true;
        this.ws = ws;

        this.request("initialize", {
          clientInfo: { name: MCP_NAME, version: MCP_VERSION },
          protocolVersion: "1",
          capabilities: {},
        })
          .then((result) => {
            initialized = true;
            logLine(
              "codex-app-server",
              `connected url=${this.url} userAgent=${
                extractUserAgent(result) ?? "unknown"
              }`,
            );
            resolve();
          })
          .catch((error) => {
            reject(
              error instanceof Error
                ? error
                : new Error(`initialize failed: ${String(error)}`),
            );
          });
      });

      ws.addEventListener("message", (ev) => this.handleMessage(ev));

      ws.addEventListener("error", (ev) => {
        const message =
          (ev && typeof ev.message === "string" && ev.message) || "ws error";
        const error = new Error(
          `Codex app-server WS error at ${this.url}: ${message}`,
        );
        if (!opened || !initialized) {
          reject(error);
        }
        this.failAllPending(error);
      });

      ws.addEventListener("close", (ev) => {
        const code = ev && typeof ev.code === "number" ? ev.code : null;
        const reason = ev && typeof ev.reason === "string" ? ev.reason : "";
        const error = new Error(
          `Codex app-server WS closed code=${code ?? "?"} reason=${reason || "none"}`,
        );
        if (!opened || !initialized) {
          reject(error);
        }
        this.failAllPending(error);
        this.ws = null;
        this.connectPromise = null;
      });
    });
  }

  async discoverThreadId() {
    const result = await this.request("thread/loaded/list", {});
    const data = isRecord(result) ? result.data : null;
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(
        `No loaded Codex thread at ${this.url}. Attach UI with \`codex --remote ${this.url}\` first.`,
      );
    }

    if (data.length > 1) {
      logLine(
        "codex-app-server",
        `multiple loaded threads (${data.length}); picking first`,
      );
    }

    const threadId = data[0];
    if (!isNonEmptyString(threadId)) {
      throw new Error("thread/loaded/list returned non-string threadId");
    }
    return threadId;
  }

  async dispatchPrompt(text, chatId) {
    await this.connect();
    const threadId = await this.discoverThreadId();

    const wrappedText = wrapRelayPrompt(text, chatId);

    const startResult = await this.request("turn/start", {
      threadId,
      input: [{ type: "text", text: wrappedText }],
    });

    const turnId = extractTurnIdFromTurnResponse(startResult);
    logLine(
      "codex-app-server",
      `dispatched chat_id=${chatId} threadId=${threadId} turnId=${turnId ?? "unknown"}`,
    );
    return { threadId, turnId };
  }

  handleMessage(ev) {
    const raw =
      typeof ev.data === "string"
        ? ev.data
        : ev.data && typeof ev.data.toString === "function"
          ? ev.data.toString()
          : "";

    if (!raw) return;

    let message;
    try {
      message = JSON.parse(raw);
    } catch (error) {
      logLine(
        "codex-app-server",
        `failed to parse message: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    if (
      isRecord(message) &&
      "id" in message &&
      ("result" in message || "error" in message)
    ) {
      this.handleResponse(message);
    }
  }

  handleResponse(message) {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.id);

    if ("error" in message && message.error) {
      const errorMessage =
        isRecord(message.error) && typeof message.error.message === "string"
          ? message.error.message
          : `App Server request ${message.id} failed`;
      pending.reject(new Error(errorMessage));
      return;
    }

    pending.resolve(message.result);
  }

  request(method, params) {
    if (!this.ws || this.ws.readyState !== 1) {
      return Promise.reject(
        new Error(
          `Codex app-server WS not connected (readyState=${this.ws?.readyState ?? "null"})`,
        ),
      );
    }

    const id = this.requestId++;
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params: params ?? {},
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(`Timed out waiting for app-server response to ${method}`),
        );
      }, this.timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        this.ws.send(JSON.stringify(payload));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  failAllPending(error) {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  async close() {
    this.closed = true;
    this.failAllPending(new Error("Codex app-server client closed"));

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.connectPromise = null;
  }
}

class Bridge {
  constructor(options) {
    this.options = options;
    this.httpServer = null;
    this.shuttingDown = false;
    this.forwardReplies = new Map();
    this.reverseRequests = new Map();
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
    writeJson(res, 200, {
      count: this.reverseRequests.size,
      chat_ids: Array.from(this.reverseRequests.keys()),
      status: "ok",
    });
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
    );

    this.forwardReplies.set(chatId, pending);
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
    );

    this.reverseRequests.set(chatId, pending);
    logLine("reverse-request", `pending chat_id=${chatId}`);
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
      throw error instanceof Error ? error : new Error(String(error));
    }

    let replyText;
    try {
      replyText = await pending.promise;
    } finally {
      this.forwardReplies.delete(chatId);
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
  node bridge/index.js [options]

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
