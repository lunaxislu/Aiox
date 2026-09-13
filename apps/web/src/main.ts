import type {
    AgentView,
    WebNotificationView,
    TerminalView,
} from "@aiox/protocol";

import "@xterm/xterm/css/xterm.css";

import { type Attachment, attachTerminal } from "./attach";

/**
 * Stage 2 verification page, not the Stage 6 operational Web. Its only job is
 * to prove that daemon HTTP and the pty WebSocket work from a browser, so it is
 * plain TypeScript with no framework.
 */

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
const createResult = el("create-result");
const readResult = el("read-result");
const recovery = el("recovery");
const recoveryError = el("recovery-error");
const recoveryLimit = el("recovery-limit");
const executionState = el("execution-state");
const reconnectButton = el<HTMLButtonElement>("reconnect");
const terminateButton = el<HTMLButtonElement>("terminate");
const terminationResult = el("termination-result");

let attachment: Attachment | undefined;
let attachedRuntimeId: string | undefined;
let recoveryRuntimeId: string | undefined;
let attachmentConnected = false;
let renderedAgents = "";
let renderedTerminals = "";
let renderedNotifications = "";
let refreshVersion = 0;
let appliedRefreshVersion = 0;
let attachmentVersion = 0;
let terminalViews: TerminalView[] | undefined;
let reading: Promise<void> | undefined;
let terminating = false;
let eventsConnected = false;
let notificationViews: WebNotificationView[] = [];

function result(box: HTMLElement, text: string, isError = false): void {
    box.textContent = text;
    box.dataset["error"] = String(isError);
}

function progressing(box: HTMLElement, text: string): void {
    box.textContent =
        box.dataset["error"] === "true" ? `${box.textContent}\n${text}` : text;
}

async function checkResponse(response: Response): Promise<void> {
    if (response.ok) return;
    let message = `HTTP ${response.status}`;
    try {
        const body: unknown = await response.json();
        if (
            typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof body.message === "string" &&
            body.message.trim()
        )
            message = body.message;
    } catch {
        /* A non-JSON error still has its HTTP status. */
    }
    throw new Error(message);
}

async function getList<T>(path: string): Promise<T[]> {
    const response = await fetch(path, {
        headers: { accept: "application/json" },
    });
    await checkResponse(response);
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error(`${path} → 목록이 아닌 응답`);
    return body as T[];
}

function showExecutionState(terminalId = attachment?.terminalId): void {
    const view = terminalViews?.find((item) => item.id === terminalId);
    if (terminalViews !== undefined)
        recoveryRuntimeId = view?.vendor?.relayDisconnected
            ? view.vendor.runtimeId
            : undefined;
    executionState.textContent =
        terminalViews === undefined
            ? "현재 실행 상태를 확인할 수 없습니다."
            : view === undefined
              ? "마지막 조회에서 이 터미널을 찾지 못했습니다."
              : view.vendor?.alive && !view.vendor.collaborationActive
                ? `${view.vendor.relayDisconnected && !(attachedRuntimeId && attachmentConnected) ? "vendor는 실행 중이며 화면·키보드는 다시 연결해야 합니다. AIOX 협업은 끊긴 상태입니다." : "터미널은 사용 가능하지만 AIOX 협업은 끊긴 상태입니다."} ${view.vendor.collaborationError ?? ""}`
                : view.alive
                  ? "마지막 확인 시 실행 중입니다."
                  : "마지막 확인 시 실행이 종료된 상태입니다.";
    terminateButton.textContent = recoveryRuntimeId
        ? "vendor 정리"
        : "강제 종료";
    if (view?.vendor?.relayDisconnected) {
        recovery.hidden = false;
        if (!attachedRuntimeId && recoveryLimit.textContent) {
            recoveryLimit.textContent = "";
            result(recoveryError, "");
        }
        if (!attachedRuntimeId && recoveryError.dataset["error"] !== "true")
            result(
                recoveryError,
                "vendor 화면·키보드 중계가 끊겼습니다. 같은 실행에 다시 연결하거나 vendor를 정리할 수 있습니다.",
            );
        reconnectButton.disabled =
            terminating ||
            !view.vendor.alive ||
            recoveryLimit.textContent !== "";
    }
}

function select(terminalId: string, reconnect = false): void {
    if (
        !reconnect &&
        attachment?.terminalId === terminalId &&
        !attachment.closed
    )
        return;
    if (attachment?.terminalId !== terminalId) recoveryRuntimeId = undefined;
    const version = ++attachmentVersion;
    attachmentConnected = false;
    attachment?.close();
    terminating = false;
    terminateButton.disabled = false;
    if (reconnect) {
        progressing(recoveryError, "화면 다시 연결 중…");
        reconnectButton.disabled = true;
    } else {
        result(terminationResult, "");
        recovery.hidden = true;
        result(recoveryError, "");
        recoveryLimit.textContent = "";
    }
    const previousRuntimeId = attachedRuntimeId;
    showExecutionState(terminalId);
    attachedRuntimeId = reconnect ? recoveryRuntimeId : undefined;
    if (previousRuntimeId !== attachedRuntimeId) {
        recoveryLimit.textContent = "";
        result(recoveryError, "");
    }
    showExecutionState(terminalId);
    attachBox.textContent = `terminal ${terminalId} · connecting…`;
    const onState: Parameters<typeof attachTerminal>[2] = (text, state) => {
        if (version !== attachmentVersion) return;
        attachBox.textContent = text;
        attachmentConnected = state === "connected";
        if (state === "failed" || state === "unrestorable") {
            recovery.hidden = false;
            result(
                recoveryError,
                `터미널 화면을 복원하지 못했습니다.\n원인: ${text}`,
                true,
            );
            recoveryLimit.textContent =
                state === "unrestorable"
                    ? "서버의 화면 기록 오류로 이 실행의 화면은 다시 연결해도 복원할 수 없습니다. 필요하면 기존 실행을 종료하고 새로 생성하세요."
                    : "";
            reconnectButton.disabled = terminating || state === "unrestorable";
            showExecutionState(terminalId);
        } else if (state === "connected" || state === "exited") {
            recovery.hidden = true;
            result(recoveryError, "");
            recoveryLimit.textContent = "";
            showExecutionState(terminalId);
            if (state === "exited" && attachedRuntimeId) void refresh();
        }
    };
    attachment = attachedRuntimeId
        ? attachTerminal(terminalHost, terminalId, onState, attachedRuntimeId)
        : attachTerminal(terminalHost, terminalId, onState);
    showExecutionState(terminalId);
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
            item.textContent = `${terminal.kind} · ${terminal.cwd} · ${terminal.id}${unreadLabel(terminal.id)}`;
            item.addEventListener("click", () => {
                select(terminal.id);
                void readTerminal(terminal.id);
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
            name.textContent = agent.name + unreadLabel(agent.terminalId);
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
                if (agent.terminalId !== null)
                    void readTerminal(agent.terminalId);
            });
            return item;
        }),
    );
}

function unreadLabel(terminalId: string | null): string {
    const count = notificationViews.filter(
        (item) => item.terminalId === terminalId,
    ).length;
    return count ? ` · 미확인 ${count}` : "";
}

async function readTerminal(terminalId: string): Promise<void> {
    const ids = notificationViews
        .filter((item) => item.terminalId === terminalId)
        .map((item) => item.id);
    if (ids.length) await markRead(ids);
    else await refresh();
}

function renderNotifications(items: WebNotificationView[]): void {
    readAllButton.disabled = reading !== undefined || items.length === 0;
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
    const version = ++refreshVersion;
    try {
        const [terminals, agents, notifications] = await Promise.all([
            getList<TerminalView>("/api/terminals"),
            getList<AgentView>("/api/web/agents"),
            getList<WebNotificationView>("/api/web/notifications?unread=true"),
        ]);
        if (version < appliedRefreshVersion) return;
        appliedRefreshVersion = version;
        const suppressed =
            attachment !== undefined &&
            document.visibilityState === "visible" &&
            document.hasFocus()
                ? notifications
                      .filter(
                          (item) =>
                              item.terminalId !== null &&
                              item.terminalId === attachment?.terminalId,
                      )
                      .map((item) => item.id)
                : [];
        notificationViews = notifications.filter(
            (item) => !suppressed.includes(item.id),
        );
        terminalViews = terminals;
        const selected = terminals.find(
            (item) => item.id === attachment?.terminalId,
        );
        if (
            attachedRuntimeId &&
            selected &&
            (!selected.vendor?.alive ||
                selected.vendor.runtimeId !== attachedRuntimeId)
        )
            select(selected.id, true);
        showExecutionState();
        // Re-rendering identical lists would steal focus from the terminal and
        // flicker on every change, so only redraw what actually changed.
        const terminalsJson = JSON.stringify([terminals, notificationViews]);
        if (terminalsJson !== renderedTerminals) {
            renderedTerminals = terminalsJson;
            renderTerminals(terminals);
        }
        const agentsJson = JSON.stringify([agents, notificationViews]);
        if (agentsJson !== renderedAgents) {
            renderedAgents = agentsJson;
            renderAgents(agents);
        }
        const notificationsJson = JSON.stringify(notificationViews);
        if (notificationsJson !== renderedNotifications) {
            renderedNotifications = notificationsJson;
            renderNotifications(notificationViews);
        }
        if (eventsConnected) result(statusBox, "");
        if (suppressed.length && !reading) void markRead(suppressed, true);
    } catch (error) {
        if (version < appliedRefreshVersion) return;
        appliedRefreshVersion = version;
        terminalViews = undefined;
        showExecutionState();
        renderedAgents = "";
        renderedNotifications = "";
        renderedTerminals = "";
        result(statusBox, `daemon 상태 조회 실패: ${String(error)}`, true);
    }
}

createShellButton.addEventListener("click", () => {
    createShellButton.disabled = true;
    progressing(createResult, "shell 생성 중…");
    void (async () => {
        try {
            const response = await fetch("/api/terminals", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: "{}",
            });
            await checkResponse(response);
            const terminal = (await response.json()) as TerminalView;
            appliedRefreshVersion = ++refreshVersion;
            select(terminal.id);
            result(createResult, "shell을 생성했습니다.");
            await refresh();
        } catch (error) {
            result(createResult, `shell 생성 실패: ${String(error)}`, true);
        } finally {
            createShellButton.disabled = false;
        }
    })();
});

async function markRead(ids?: string[], automatic = false): Promise<void> {
    if (reading) {
        await reading;
        return markRead(ids, automatic);
    }
    readAllButton.disabled = true;
    if (!automatic) progressing(readResult, "읽음 처리 중…");
    reading = (async () => {
        try {
            const response = await fetch("/api/web/notifications/read", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(ids === undefined ? {} : { ids }),
            });
            await checkResponse(response);
            if (!automatic) result(readResult, "알림을 읽음 처리했습니다.");
            appliedRefreshVersion = ++refreshVersion;
            reading = undefined;
            readAllButton.disabled = notificationViews.length === 0;
            renderedNotifications = "";
            void refresh();
        } catch (error) {
            reading = undefined;
            result(readResult, `읽음 처리 실패: ${String(error)}`, true);
            readAllButton.disabled = false;
        }
    })();
    return reading;
}

readAllButton.addEventListener("click", () => void markRead());

reconnectButton.addEventListener("click", () => {
    if (attachment && !reconnectButton.disabled)
        select(attachment.terminalId, true);
});

terminateButton.addEventListener("click", () => {
    if (!attachment || terminating) return;
    const { terminalId } = attachment;
    const runtimeId = recoveryRuntimeId;
    if (
        !confirm(
            runtimeId
                ? "vendor와 부속 자원을 종료하고 등록을 정리하시겠습니까? 기존 shell은 유지됩니다."
                : "진행 중인 작업이 중단됩니다. 이 터미널을 강제 종료하시겠습니까?",
        )
    )
        return;
    const version = attachmentVersion;
    terminating = true;
    terminateButton.disabled = true;
    reconnectButton.disabled = true;
    progressing(terminationResult, "종료 요청 중…");
    void (async () => {
        try {
            const response = await fetch(
                `/api/terminals/${encodeURIComponent(terminalId)}${runtimeId ? `/vendor?runtime=${encodeURIComponent(runtimeId)}` : ""}`,
                { method: "DELETE" },
            );
            await checkResponse(response);
            const body: unknown = await response.json();
            if (
                typeof body !== "object" ||
                body === null ||
                !("deleted" in body) ||
                typeof body.deleted !== "boolean"
            )
                throw new Error("종료 결과를 확인할 수 없습니다.");
            appliedRefreshVersion = ++refreshVersion;
            if (version === attachmentVersion && runtimeId) {
                result(terminationResult, "vendor를 정리했습니다.");
                // Refresh switches the same selected terminal back to its shell.
                attachedRuntimeId = runtimeId;
                terminating = false;
            } else if (version === attachmentVersion) {
                attachment?.close();
                attachment = undefined;
                ++attachmentVersion;
                recovery.hidden = true;
                result(
                    terminationResult,
                    body.deleted
                        ? "터미널을 종료했습니다."
                        : "종료할 터미널이 이미 없습니다.",
                );
                attachBox.textContent = `terminal ${terminalId} · 종료할 실행 없음`;
            }
            await refresh();
        } catch (error) {
            if (version !== attachmentVersion) return;
            result(terminationResult, `종료 요청 실패: ${String(error)}`, true);
            terminating = false;
            terminateButton.disabled = false;
            reconnectButton.disabled = recoveryLimit.textContent !== "";
            await refresh();
        }
    })();
});

const events = new EventSource("/api/web/events");
events.onopen = () => {
    eventsConnected = true;
};
// The server sends change immediately on each connection, including reconnects.
events.addEventListener("change", () => void refresh());
events.onerror = () => {
    eventsConnected = false;
    appliedRefreshVersion = ++refreshVersion;
    terminalViews = undefined;
    showExecutionState();
    result(
        statusBox,
        "daemon 변경 알림 연결이 끊겼습니다. 다시 연결 중…",
        true,
    );
};

window.addEventListener("focus", () => void refresh());
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh();
});
