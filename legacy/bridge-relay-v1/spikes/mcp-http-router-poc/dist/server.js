import http from "node:http";
import crypto from "node:crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
const PORT = Number(process.env.POC_PORT ?? 9100);
const REPLY_TIMEOUT_MS = Number(process.env.POC_TIMEOUT_MS ?? 60_000);
const PROBE_CANDIDATE_TIMEOUT_MS = Number(process.env.POC_PROBE_CANDIDATE_TIMEOUT_MS ?? 5_000);
const MAX_EVENTS = 200;
const sessions = new Map();
const pending = new Map();
const inbox = { codex: [], claude: [] };
const events = [];
function nowIso() {
    return new Date().toISOString();
}
function recordEvent(type, details) {
    events.push({ at: nowIso(), type, details });
    if (events.length > MAX_EVENTS)
        events.shift();
}
function opposite(role) {
    return role === "codex" ? "claude" : "codex";
}
function findLatestSessionByRole(role) {
    let latest = null;
    for (const s of sessions.values()) {
        if (s.role === role)
            latest = s;
    }
    return latest;
}
function createPending(from, to, text) {
    const reply_id = crypto.randomUUID();
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    const timer = setTimeout(() => {
        const p = pending.get(reply_id);
        if (p && !p.settled) {
            p.settled = true;
            pending.delete(reply_id);
            recordEvent("pending_timeout", { reply_id, to });
            reject(new Error(`Timed out waiting for ${to} reply after ${REPLY_TIMEOUT_MS}ms`));
        }
    }, REPLY_TIMEOUT_MS);
    const p = {
        reply_id,
        from,
        to,
        text,
        created_at: nowIso(),
        promise,
        resolve: (t) => {
            if (p.settled)
                return;
            p.settled = true;
            clearTimeout(p.timer);
            pending.delete(reply_id);
            resolve(t);
        },
        reject: (e) => {
            if (p.settled)
                return;
            p.settled = true;
            clearTimeout(p.timer);
            pending.delete(reply_id);
            reject(e);
        },
        settled: false,
        timer,
    };
    pending.set(reply_id, p);
    recordEvent("pending_created", { reply_id, from, to });
    return p;
}
function enqueueRelay(toRole, item) {
    const target = findLatestSessionByRole(toRole);
    inbox[toRole].push(item);
    recordEvent("relay_enqueued", {
        reply_id: item.reply_id,
        to: toRole,
        target_session_id: target?.sessionId ?? null,
    });
    if (!target) {
        recordEvent("push_no_target_session", { reply_id: item.reply_id, to: toRole });
    }
}
async function probePushToRole(toRole, item) {
    const target = findLatestSessionByRole(toRole);
    recordEvent("probe_started", {
        reply_id: item.reply_id,
        to: toRole,
        target_session_id: target?.sessionId ?? null,
    });
    if (!target) {
        enqueueRelay(toRole, item);
        recordEvent("probe_no_target_session", { reply_id: item.reply_id, to: toRole });
        return;
    }
    try {
        const result = await target.server.server.createMessage({
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `[ROUTER PROBE reply_id=${item.reply_id} from=${item.from}]\n` +
                            `Instruction:\n${item.text}\n\n` +
                            `If this appears in your normal agent context, perform the instruction, then call ` +
                            `reply_to_router(reply_id="${item.reply_id}", text="<completion result>").`,
                    },
                },
            ],
            maxTokens: 512,
            systemPrompt: "This is a router push probe. If tool calls are available, perform the instruction and call reply_to_router with the provided reply_id.",
        }, { timeout: PROBE_CANDIDATE_TIMEOUT_MS });
        recordEvent("probe_sampling_returned", {
            reply_id: item.reply_id,
            to: toRole,
            content_type: result.content?.type ?? null,
        });
    }
    catch (err) {
        recordEvent("probe_sampling_failed", {
            reply_id: item.reply_id,
            to: toRole,
            error: err instanceof Error ? err.message : String(err),
        });
    }
    try {
        const result = await target.server.server.elicitInput({
            message: `Router push probe (reply_id=${item.reply_id}, from=${item.from})\nInstruction:\n${item.text}\n\n` +
                `If this appears to the agent, perform the instruction and report completion with reply_to_router.`,
            requestedSchema: {
                type: "object",
                properties: {
                    reply: { type: "string", title: "Reply text" },
                },
                required: ["reply"],
            },
        }, { timeout: PROBE_CANDIDATE_TIMEOUT_MS });
        recordEvent("probe_elicitation_returned", {
            reply_id: item.reply_id,
            to: toRole,
            action: result.action,
        });
    }
    catch (err) {
        recordEvent("probe_elicitation_failed", {
            reply_id: item.reply_id,
            to: toRole,
            error: err instanceof Error ? err.message : String(err),
        });
    }
    try {
        await target.server.server.notification({
            method: "notifications/message",
            params: {
                level: "info",
                logger: "router-poc",
                data: `[ROUTER PROBE reply_id=${item.reply_id} from=${item.from}] ${item.text} ` +
                    `(call reply_to_router with this reply_id if visible)`,
            },
        });
        recordEvent("probe_notification_sent", { reply_id: item.reply_id, to: toRole });
    }
    catch (err) {
        recordEvent("probe_notification_failed", {
            reply_id: item.reply_id,
            to: toRole,
            error: err instanceof Error ? err.message : String(err),
        });
    }
    enqueueRelay(toRole, item);
    recordEvent("probe_inbox_fallback_ready", { reply_id: item.reply_id, to: toRole });
}
function buildMcpServer(role) {
    const opp = opposite(role);
    const server = new McpServer({ name: `router-poc-${role}`, version: "0.0.0" }, {
        capabilities: {
            tools: {},
        },
        instructions: `You are connected to the central router PoC as the "${role}" agent. ` +
            `Mandatory router rule: at the start of every turn, before answering the user or using any other ` +
            `router tool, call poll_inbox. If poll_inbox returns one or more relay items, treat each item's text ` +
            `as an instruction from the other agent, perform that instruction in your current turn, then call ` +
            `reply_to_router with the exact reply_id from the item and a concise completion result. ` +
            `Only after the inbox is empty should you continue with the user's request. ` +
            `When the user asks you to instruct ${opp}, call the tool "ask_${opp}" with the instruction text.`,
    });
    server.registerTool(`ask_${opp}`, {
        title: `Instruct the ${opp} agent`,
        description: `Send an instruction to the ${opp} agent via the central router. ` +
            `Before using this tool, first call poll_inbox and resolve any returned relays. ` +
            `This tool waits for the ${opp} agent to report completion (timeout ${REPLY_TIMEOUT_MS}ms).`,
        inputSchema: { text: z.string().min(1) },
    }, async ({ text }) => {
        const p = createPending(role, opp, text);
        const item = {
            reply_id: p.reply_id,
            text,
            from: role,
            enqueued_at: nowIso(),
        };
        enqueueRelay(opp, item);
        try {
            const reply = await p.promise;
            recordEvent("ask_resolved", { reply_id: p.reply_id, from: role, to: opp });
            return {
                content: [
                    { type: "text", text: reply },
                ],
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            recordEvent("ask_failed", { reply_id: p.reply_id, error: message });
            return {
                isError: true,
                content: [
                    { type: "text", text: message },
                ],
            };
        }
    });
    server.registerTool(`probe_${opp}_push`, {
        title: `Probe automatic push to the ${opp} agent`,
        description: `Try MCP server-to-client push candidates toward ${opp}. ` +
            `Before using this tool, first call poll_inbox and resolve any returned relays. ` +
            `Success is only counted if ${opp} calls reply_to_router with the generated reply_id.`,
        inputSchema: { text: z.string().min(1) },
    }, async ({ text }) => {
        const p = createPending(role, opp, text);
        const item = {
            reply_id: p.reply_id,
            text,
            from: role,
            enqueued_at: nowIso(),
        };
        void probePushToRole(opp, item).catch((err) => {
            recordEvent("probe_pipeline_error", {
                reply_id: p.reply_id,
                to: opp,
                error: err instanceof Error ? err.message : String(err),
            });
        });
        try {
            const reply = await p.promise;
            recordEvent("probe_resolved", { reply_id: p.reply_id, from: role, to: opp });
            return {
                content: [
                    { type: "text", text: reply },
                ],
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            recordEvent("probe_failed", { reply_id: p.reply_id, error: message });
            return {
                isError: true,
                content: [
                    { type: "text", text: message },
                ],
            };
        }
    });
    server.registerTool("reply_to_router", {
        title: "Reply to a relayed message",
        description: "Resolve a pending router relay after performing its instruction. Pass the exact reply_id and a concise completion result.",
        inputSchema: { reply_id: z.string().min(1), text: z.string().min(1) },
    }, async ({ reply_id, text }) => {
        const p = pending.get(reply_id);
        if (!p) {
            recordEvent("reply_missing_pending", { reply_id, by: role });
            return {
                isError: true,
                content: [
                    { type: "text", text: `no pending reply_id=${reply_id}` },
                ],
            };
        }
        if (p.to !== role) {
            recordEvent("reply_wrong_role", { reply_id, by: role, expected: p.to });
            return {
                isError: true,
                content: [
                    { type: "text", text: `reply_id=${reply_id} is addressed to ${p.to}, not ${role}` },
                ],
            };
        }
        recordEvent("reply_received", { reply_id, by: role });
        p.resolve(text);
        return {
            content: [
                { type: "text", text: "ok" },
            ],
        };
    });
    server.registerTool("poll_inbox", {
        title: "Drain pending relays addressed to me",
        description: "Mandatory first tool to call at the start of every turn. Returns relayed messages waiting for this agent. " +
            "Each item contains reply_id, from, and text. Treat text as an instruction, perform it, then call reply_to_router(reply_id, text) with the completion result.",
        inputSchema: {},
    }, async () => {
        const items = inbox[role].splice(0);
        recordEvent("inbox_drained", { by: role, count: items.length });
        return {
            content: [
                {
                    type: "text",
                    text: items.length === 0 ? "inbox empty" : JSON.stringify(items, null, 2),
                },
            ],
        };
    });
    return server;
}
async function readBody(req) {
    return await new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            if (!raw)
                return resolve(undefined);
            try {
                resolve(JSON.parse(raw));
            }
            catch (err) {
                reject(err);
            }
        });
        req.on("error", reject);
    });
}
function isInitializeRequest(body) {
    if (!body || typeof body !== "object")
        return false;
    const list = Array.isArray(body) ? body : [body];
    return list.some((m) => m && typeof m === "object" && m.method === "initialize");
}
function sendJson(res, status, payload) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}
async function handleMcpRequest(req, res, role) {
    let body = undefined;
    if (req.method === "POST") {
        try {
            body = await readBody(req);
        }
        catch (err) {
            sendJson(res, 400, { error: "invalid json", message: String(err) });
            return;
        }
    }
    const sessionHeader = req.headers["mcp-session-id"];
    const sessionId = typeof sessionHeader === "string" ? sessionHeader : undefined;
    let info = sessionId ? sessions.get(sessionId) : undefined;
    if (!info) {
        if (req.method !== "POST" || !isInitializeRequest(body)) {
            sendJson(res, 400, {
                error: "no session and not an initialize request",
                hint: "POST initialize first, then reuse the mcp-session-id response header",
            });
            return;
        }
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
            onsessioninitialized: (sid) => {
                if (!info)
                    return;
                info.sessionId = sid;
                sessions.set(sid, info);
                recordEvent("session_initialized", { sessionId: sid, role });
            },
        });
        const server = buildMcpServer(role);
        info = {
            sessionId: "",
            role,
            server,
            transport,
            initialized_at: nowIso(),
        };
        await server.connect(transport);
    }
    await info.transport.handleRequest(req, res, body);
}
function handleDebugStatus(res) {
    sendJson(res, 200, {
        status: "ok",
        started_at: STARTED_AT,
        port: PORT,
        timeout_ms: REPLY_TIMEOUT_MS,
        probe_candidate_timeout_ms: PROBE_CANDIDATE_TIMEOUT_MS,
        sessions: Array.from(sessions.values()).map((s) => ({
            sessionId: s.sessionId,
            role: s.role,
            initialized_at: s.initialized_at,
        })),
        pending: {
            count: pending.size,
            reply_ids: Array.from(pending.values()).map((p) => ({
                reply_id: p.reply_id,
                from: p.from,
                to: p.to,
                created_at: p.created_at,
            })),
        },
        inbox: {
            codex_count: inbox.codex.length,
            claude_count: inbox.claude.length,
        },
    });
}
function handleDebugEvents(res) {
    sendJson(res, 200, {
        started_at: STARTED_AT,
        events: events.slice(-100),
    });
}
const STARTED_AT = nowIso();
const httpServer = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        if (url.pathname === "/mcp/codex")
            return await handleMcpRequest(req, res, "codex");
        if (url.pathname === "/mcp/claude")
            return await handleMcpRequest(req, res, "claude");
        if (url.pathname === "/debug/status" && req.method === "GET")
            return handleDebugStatus(res);
        if (url.pathname === "/debug/events" && req.method === "GET")
            return handleDebugEvents(res);
        sendJson(res, 404, { error: "not found", path: url.pathname });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendJson(res, 500, { error: "internal", message });
    }
});
httpServer.listen(PORT, "127.0.0.1", () => {
    process.stderr.write(`[router-poc] listening on http://127.0.0.1:${PORT}\n`);
    process.stderr.write(`[router-poc] /mcp/codex   /mcp/claude   /debug/status   /debug/events\n`);
});
process.on("SIGINT", () => {
    process.stderr.write("[router-poc] shutting down\n");
    httpServer.close(() => process.exit(0));
});
