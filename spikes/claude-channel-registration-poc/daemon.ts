import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createHash, randomUUID } from "node:crypto";

const DEFAULT_PUSH_TIMEOUT_MS = 2000;

type PendingAttach = {
  agentName: string;
  token: string;
  createdAt: string;
};

type RegisteredChannel = {
  agentName: string;
  endpoint: string;
  registeredAt: string;
};

export type DaemonState = {
  pending: Map<string, PendingAttach>;
  registry: Map<string, RegisteredChannel>;
};

export function createDaemonState(): DaemonState {
  return { pending: new Map(), registry: new Map() };
}

export function createPendingAttach(
  state: DaemonState,
  agentName: string,
): PendingAttach {
  const token = randomUUID();
  const pending: PendingAttach = {
    agentName,
    token,
    createdAt: new Date().toISOString(),
  };
  state.pending.set(agentName, pending);
  return pending;
}

export type RegisterResult =
  | { ok: true; channel: RegisteredChannel }
  | { ok: false; reason: "registration_unknown_token" };

export function registerChannel(
  state: DaemonState,
  agentName: string,
  token: string,
  endpoint: string,
): RegisterResult {
  const pending = state.pending.get(agentName);
  if (!pending || pending.token !== token) {
    return { ok: false, reason: "registration_unknown_token" };
  }
  state.pending.delete(agentName);
  const channel: RegisteredChannel = {
    agentName,
    endpoint,
    registeredAt: new Date().toISOString(),
  };
  state.registry.set(agentName, channel);
  return { ok: true, channel };
}

export function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

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

function logEvent(event: string, fields: Record<string, unknown>): void {
  process.stderr.write(JSON.stringify({ event, ...fields }) + "\n");
}

type JsonReadResult =
  | { ok: true; body: unknown }
  | { ok: false; reason: "invalid_json" };

async function readJsonOrInvalid(
  req: IncomingMessage,
): Promise<JsonReadResult> {
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.length === 0) return { ok: true, body: {} };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

type PushBody = {
  agentName: string;
  content: string;
  chat_id?: string;
  origin?: string;
  source?: string;
};

function parsePushBody(raw: unknown): PushBody | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.agentName !== "string" || o.agentName.length === 0) return null;
  if (typeof o.content !== "string" || o.content.length === 0) return null;
  const out: PushBody = { agentName: o.agentName, content: o.content };
  if (typeof o.chat_id === "string") out.chat_id = o.chat_id;
  if (typeof o.origin === "string") out.origin = o.origin;
  if (typeof o.source === "string") out.source = o.source;
  return out;
}

type ForwardResult =
  | { ok: true; status: number; body: unknown }
  | {
      ok: false;
      reason: "channel_unavailable" | "timeout" | "upstream_non_2xx";
      detail: string;
      status?: number;
      body?: unknown;
    };

async function forwardToChannel(
  endpoint: string,
  body: PushBody,
  timeoutMs: number,
): Promise<ForwardResult> {
  const { agentName: _agentName, ...send } = body;
  void _agentName;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(send),
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: unknown = null;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (response.status < 200 || response.status >= 300) {
      return {
        ok: false,
        reason: "upstream_non_2xx",
        detail: `upstream status ${response.status}`,
        status: response.status,
        body: parsed,
      };
    }
    return { ok: true, status: response.status, body: parsed };
  } catch (error) {
    const isAbort =
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.message === "The operation was aborted.");
    if (isAbort) {
      return { ok: false, reason: "timeout", detail: "fetch aborted" };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: "channel_unavailable", detail: message };
  } finally {
    clearTimeout(timer);
  }
}

export type DaemonOptions = {
  pushTimeoutMs?: number;
};

export function createDaemonHandler(
  state: DaemonState,
  options: DaemonOptions = {},
) {
  const pushTimeoutMs = options.pushTimeoutMs ?? DEFAULT_PUSH_TIMEOUT_MS;

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method === "POST" && req.url === "/attach") {
      const json = await readJsonOrInvalid(req);
      if (!json.ok) {
        sendJson(res, 400, { error: "invalid_json" });
        return;
      }
      const raw = json.body;
      if (
        typeof raw !== "object" ||
        raw === null ||
        typeof (raw as { agentName?: unknown }).agentName !== "string" ||
        (raw as { agentName: string }).agentName.length === 0
      ) {
        sendJson(res, 400, { error: "agentName_required" });
        return;
      }
      const agentName = (raw as { agentName: string }).agentName;
      const pending = createPendingAttach(state, agentName);
      logEvent("attach_pending_created", {
        agentName,
        tokenHash: tokenFingerprint(pending.token),
        createdAt: pending.createdAt,
      });
      sendJson(res, 200, {
        ok: true,
        agentName,
        token: pending.token,
      });
      return;
    }

    if (req.method === "POST" && req.url === "/register") {
      const json = await readJsonOrInvalid(req);
      if (!json.ok) {
        sendJson(res, 400, { error: "invalid_json" });
        return;
      }
      const raw = json.body;
      if (typeof raw !== "object" || raw === null) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      const o = raw as Record<string, unknown>;
      if (
        typeof o.agentName !== "string" ||
        typeof o.token !== "string" ||
        typeof o.endpoint !== "string"
      ) {
        sendJson(res, 400, { error: "register_fields_required" });
        return;
      }
      const parsedEndpoint = parseLoopbackHttpEndpoint(o.endpoint);
      if (parsedEndpoint === null) {
        logEvent("register_rejected", {
          agentName: o.agentName,
          tokenHash: tokenFingerprint(o.token),
          reason: "invalid_endpoint",
          endpoint: o.endpoint,
        });
        sendJson(res, 400, { error: "invalid_endpoint" });
        return;
      }
      const result = registerChannel(
        state,
        o.agentName,
        o.token,
        parsedEndpoint,
      );
      if (!result.ok) {
        logEvent("register_rejected", {
          agentName: o.agentName,
          tokenHash: tokenFingerprint(o.token),
          reason: result.reason,
        });
        sendJson(res, 401, { error: result.reason });
        return;
      }
      logEvent("register_accepted", {
        agentName: result.channel.agentName,
        endpoint: result.channel.endpoint,
        tokenHash: tokenFingerprint(o.token),
        registeredAt: result.channel.registeredAt,
      });
      sendJson(res, 200, { ok: true, agentName: result.channel.agentName });
      return;
    }

    if (req.method === "POST" && req.url === "/push") {
      const json = await readJsonOrInvalid(req);
      if (!json.ok) {
        sendJson(res, 400, { error: "invalid_json" });
        return;
      }
      const body = parsePushBody(json.body);
      if (!body) {
        sendJson(res, 400, { error: "invalid_push_body" });
        return;
      }
      const channel = state.registry.get(body.agentName);
      if (!channel) {
        logEvent("push_rejected_not_registered", { agentName: body.agentName });
        sendJson(res, 409, { error: "channel_not_registered" });
        return;
      }
      logEvent("push_forward_started", {
        agentName: body.agentName,
        endpoint: channel.endpoint,
        chat_id: body.chat_id,
        origin: body.origin,
        source: body.source,
        timeoutMs: pushTimeoutMs,
      });
      const forward = await forwardToChannel(
        channel.endpoint,
        body,
        pushTimeoutMs,
      );
      if (!forward.ok) {
        if (forward.reason === "channel_unavailable") {
          logEvent("push_forward_failed", {
            agentName: body.agentName,
            endpoint: channel.endpoint,
            reason: "channel_unavailable",
            detail: forward.detail,
          });
          sendJson(res, 502, {
            error: "channel_unavailable",
            detail: forward.detail,
          });
          return;
        }
        const httpStatus = forward.reason === "timeout" ? 504 : 502;
        logEvent("push_forward_failed", {
          agentName: body.agentName,
          endpoint: channel.endpoint,
          reason: "channel_push_failed",
          subReason: forward.reason,
          detail: forward.detail,
          ...(forward.status !== undefined
            ? { upstreamStatus: forward.status }
            : {}),
        });
        sendJson(res, httpStatus, {
          error: "channel_push_failed",
          reason: forward.reason,
          detail: forward.detail,
          ...(forward.status !== undefined
            ? { upstreamStatus: forward.status }
            : {}),
          ...(forward.body !== undefined ? { upstreamBody: forward.body } : {}),
        });
        return;
      }
      logEvent("push_forward_succeeded", {
        agentName: body.agentName,
        endpoint: channel.endpoint,
        upstreamStatus: forward.status,
      });
      sendJson(res, 200, {
        ok: true,
        upstreamStatus: forward.status,
        upstreamBody: forward.body,
      });
      return;
    }

    if (req.method === "GET" && req.url === "/state") {
      sendJson(res, 200, {
        pending: Array.from(state.pending.values()).map((p) => ({
          agentName: p.agentName,
          tokenHash: tokenFingerprint(p.token),
          createdAt: p.createdAt,
        })),
        registry: Array.from(state.registry.values()),
      });
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  };
}

export function startDaemon(
  port: number,
  options: DaemonOptions = {},
): { server: Server; state: DaemonState } {
  const state = createDaemonState();
  const handler = createDaemonHandler(state, options);
  const server = createServer((req, res) => {
    handler(req, res).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      logEvent("handler_error", {
        url: req.url,
        method: req.method,
        error: message,
      });
      try {
        sendJson(res, 500, { error: "handler_error", detail: message });
      } catch {
        /* response already sent */
      }
    });
  });
  server.listen(port, "127.0.0.1", () => {
    logEvent("daemon_listening", {
      url: `http://127.0.0.1:${port}`,
      pushTimeoutMs: options.pushTimeoutMs ?? DEFAULT_PUSH_TIMEOUT_MS,
    });
  });
  return { server, state };
}

function exitWithFatalEnv(name: string, raw: string): never {
  process.stderr.write(
    JSON.stringify({
      event: "fatal",
      error: `invalid_env_${name}`,
      value: raw,
    }) + "\n",
  );
  process.exit(1);
}

function parsePort(raw: string | undefined, defaultValue: number): number {
  if (raw === undefined) return defaultValue;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    exitWithFatalEnv("AIOX_DAEMON_POC_PORT", raw);
  }
  return n;
}

function parsePositiveInt(
  raw: string | undefined,
  name: string,
): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    exitWithFatalEnv(name, raw);
  }
  return n;
}

async function main(): Promise<void> {
  const port = parsePort(process.env.AIOX_DAEMON_POC_PORT, 19000);
  const pushTimeoutMs = parsePositiveInt(
    process.env.AIOX_DAEMON_PUSH_TIMEOUT_MS,
    "AIOX_DAEMON_PUSH_TIMEOUT_MS",
  );
  startDaemon(port, { pushTimeoutMs });
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
