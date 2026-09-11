import type { AgentView, NotificationView, TerminalView } from "@aiox/protocol";

import "@xterm/xterm/css/xterm.css";

import { type Attachment, attachTerminal } from "./attach";

/**
 * Stage 2 verification page, not the Stage 6 operational Web. Its only job is
 * to prove that daemon HTTP and the pty WebSocket work from a browser, so it is
 * plain TypeScript with no framework and polls instead of listening for events.
 */

const POLL_MS = 3_000;

function el<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (!node) throw new Error(`missing #${id} in index.html`);
    return node as T;
}

const statusBox = el("status");
const agentBox = el("agents");
const terminalBox = el("terminals");
const createShellButton = el<HTMLButtonElement>("create-shell");
const notificationBox = el<HTMLUListElement>("notifications");
const readAllButton = el<HTMLButtonElement>("read-all");
const attachBox = el("attach");
const terminalHost = el("terminal");

let attachment: Attachment | undefined;
let renderedAgents = "";
let renderedTerminals = "";
let renderedNotifications = "";

function setStatus(text: string, isError: boolean): void {
    statusBox.textContent = text;
    statusBox.dataset["error"] = String(isError);
}

async function getList<T>(path: string): Promise<T[]> {
    const response = await fetch(path, {
        headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`${path} → HTTP ${response.status}`);
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error(`${path} → 목록이 아닌 응답`);
    return body as T[];
}

function select(terminalId: string): void {
    if (attachment?.terminalId === terminalId && !attachment.closed) return;
    attachment?.close();
    attachBox.textContent = `terminal ${terminalId} · connecting…`;
    attachment = attachTerminal(terminalHost, terminalId, (text) => {
        attachBox.textContent = text;
    });
    renderedAgents = "";
    renderedTerminals = "";
}

function renderTerminals(terminals: TerminalView[]): void {
    if (terminals.length === 0) {
        terminalBox.replaceChildren(empty("실행 중인 terminal이 없습니다."));
        return;
    }
    terminalBox.replaceChildren(
        ...terminals.map((terminal) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "agent";
            item.disabled = !terminal.alive;
            item.setAttribute(
                "aria-pressed",
                String(terminal.id === attachment?.terminalId),
            );
            item.textContent = `${terminal.kind} · ${terminal.cwd} · ${terminal.id}`;
            item.addEventListener("click", () => {
                select(terminal.id);
                void refresh();
            });
            return item;
        }),
    );
}

function renderAgents(agents: AgentView[]): void {
    if (agents.length === 0) {
        agentBox.replaceChildren(empty("실행 중인 agent가 없습니다."));
        return;
    }
    agentBox.replaceChildren(
        ...agents.map((agent) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "agent";
            item.disabled = agent.terminalId === null;
            item.setAttribute(
                "aria-pressed",
                String(agent.terminalId === attachment?.terminalId),
            );
            const name = document.createElement("strong");
            name.textContent = agent.name;
            const meta = document.createElement("span");
            meta.className = "meta";
            meta.textContent = [
                agent.activity,
                agent.networkId === null
                    ? "network 없음"
                    : `network ${agent.networkId}`,
                agent.terminalId === null
                    ? "terminal 없음"
                    : "terminal 연결 가능",
            ].join(" · ");
            item.append(name, meta);
            item.addEventListener("click", () => {
                if (agent.terminalId !== null) select(agent.terminalId);
                // Re-render so the pressed state follows the new selection.
                renderedAgents = "";
                void refresh();
            });
            return item;
        }),
    );
}

function renderNotifications(items: NotificationView[]): void {
    readAllButton.disabled = items.length === 0;
    if (items.length === 0) {
        notificationBox.replaceChildren(empty("미확인 알림이 없습니다.", "li"));
        return;
    }
    notificationBox.replaceChildren(
        ...items.map((item) => {
            const row = document.createElement("li");
            const at = new Date(item.createdAt);
            const time = document.createElement("time");
            time.dateTime = at.toISOString();
            time.textContent = at.toLocaleString();
            const body = document.createElement("span");
            body.textContent = item.body;
            row.append(time, body);
            return row;
        }),
    );
}

function empty(text: string, tag: "p" | "li" = "p"): HTMLElement {
    const node = document.createElement(tag);
    node.className = "empty";
    node.textContent = text;
    return node;
}

async function refresh(): Promise<void> {
    try {
        const [terminals, agents, notifications] = await Promise.all([
            getList<TerminalView>("/api/terminals"),
            getList<AgentView>("/api/agents"),
            getList<NotificationView>("/api/notifications?unread=true"),
        ]);
        // Re-rendering identical lists would steal focus from the terminal and
        // flicker every poll, so only redraw what actually changed.
        const terminalsJson = JSON.stringify(terminals);
        if (terminalsJson !== renderedTerminals) {
            renderedTerminals = terminalsJson;
            renderTerminals(terminals);
        }
        const agentsJson = JSON.stringify(agents);
        if (agentsJson !== renderedAgents) {
            renderedAgents = agentsJson;
            renderAgents(agents);
        }
        const notificationsJson = JSON.stringify(notifications);
        if (notificationsJson !== renderedNotifications) {
            renderedNotifications = notificationsJson;
            renderNotifications(notifications);
        }
        setStatus(
            `daemon 연결됨 · terminal ${terminals.length} · agent ${agents.length} · 미확인 알림 ${notifications.length}`,
            false,
        );
    } catch (error) {
        renderedAgents = "";
        renderedNotifications = "";
        renderedTerminals = "";
        setStatus(
            `daemon API에 연결할 수 없습니다 (${String(error)}). daemon이 실행 중인지 확인하세요.`,
            true,
        );
    }
}

createShellButton.addEventListener("click", () => {
    createShellButton.disabled = true;
    void (async () => {
        try {
            const response = await fetch("/api/terminals", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: "{}",
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const terminal = (await response.json()) as TerminalView;
            select(terminal.id);
            await refresh();
        } catch (error) {
            setStatus(`shell 생성 실패: ${String(error)}`, true);
        } finally {
            createShellButton.disabled = false;
        }
    })();
});

readAllButton.addEventListener("click", () => {
    void (async () => {
        try {
            const response = await fetch("/api/notifications/read", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: "{}",
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            renderedNotifications = "";
            await refresh();
        } catch (error) {
            setStatus(`읽음 처리 실패: ${String(error)}`, true);
        }
    })();
});

void refresh();
setInterval(() => void refresh(), POLL_MS);
