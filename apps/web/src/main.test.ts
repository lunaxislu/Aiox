import { afterEach, expect, it, vi } from "vitest";

const { attach, close } = vi.hoisted(() => ({
    attach: vi.fn(),
    close: vi.fn(),
}));
vi.mock("./attach", () => ({ attachTerminal: attach }));

// Node-only DOM double: exercises HTTP selection and attachment ownership,
// without claiming browser rendering, keyboard or xterm verification.
class Events {
    static current: Events;
    onopen?: () => void;
    onmessage?: () => void;
    onerror?: () => void;
    constructor(readonly url: string) {
        Events.current = this;
        queueMicrotask(() => {
            this.onopen?.();
            this.onmessage?.();
        });
    }
    addEventListener(name: string, fn: () => void) {
        if (name === "change") this.onmessage = fn;
    }
}

class Element {
    textContent = "";
    dataset: Record<string, string> = {};
    children: Element[] = [];
    disabled = false;
    listeners = new Map<string, () => void>();
    replaceChildren(...children: Element[]) {
        this.children = children;
    }
    append(...children: Element[]) {
        this.children.push(...children);
    }
    setAttribute() {}
    addEventListener(name: string, fn: () => void) {
        this.listeners.set(name, fn);
    }
    click() {
        if (this.disabled) return;
        this.listeners.get("click")?.();
    }
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.resetModules();
});

it("keeps terminal selection across Agent changes and handles shell creation failures", async () => {
    const nodes = new Map<string, Element>();
    const node = (id: string) => {
        if (!nodes.has(id)) nodes.set(id, new Element());
        return nodes.get(id)!;
    };
    vi.stubGlobal("document", {
        getElementById: node,
        createElement: () => new Element(),
        hasFocus: () => true,
        visibilityState: "visible",
        addEventListener: vi.fn(),
    });
    vi.stubGlobal("window", { addEventListener: vi.fn() });
    vi.stubGlobal("EventSource", Events);
    const refresh = () => Events.current.onmessage?.();
    const shell = { id: "shell-1", cwd: "/work", kind: "shell", alive: true };
    let agents: unknown[] = [];
    const fetchMock = vi.fn(
        async (
            path: string,
        ): Promise<{ ok: boolean; json: () => Promise<unknown> }> => ({
            ok: true,
            json: async () =>
                path === "/api/terminals"
                    ? [shell]
                    : path === "/api/web/agents"
                      ? agents
                      : [],
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    let closed = false;
    attach.mockImplementation((_host, terminalId) => ({
        terminalId,
        close,
        get closed() {
            return closed;
        },
    }));
    await import("./main");
    await vi.waitFor(() => expect(node("terminals").children.length).toBe(1));
    node("terminals").children[0]!.click();
    expect(attach).toHaveBeenCalledWith(
        node("terminal"),
        "shell-1",
        expect.any(Function),
    );
    agents = [
        {
            agentId: "A",
            name: "Agent A",
            terminalId: "shell-1",
            networkId: null,
            activity: "working",
        },
    ];
    refresh();
    await vi.waitFor(() =>
        expect(node("agents").children[0]?.children[0]?.textContent).toBe(
            "Agent A",
        ),
    );
    node("agents").children[0]!.click();
    agents = [
        { ...(agents[0] as object), agentId: "A-prime", name: "Agent A′" },
    ];
    refresh();
    await vi.waitFor(() =>
        expect(node("agents").children[0]?.children[0]?.textContent).toBe(
            "Agent A′",
        ),
    );
    expect(attach).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
        "/api/terminals",
        expect.any(Object),
    );
    fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "directory missing" }),
    });
    node("create-shell").click();
    await vi.waitFor(() =>
        expect(node("create-result").textContent).toContain(
            "directory missing",
        ),
    );
    refresh();
    await vi.waitFor(() => expect(node("status").textContent).toBe(""));
    expect(node("create-result").textContent).toContain("directory missing");
    expect(node("create-shell").disabled).toBe(false);
    expect(close).not.toHaveBeenCalled();

    const created = { ...shell, id: "shell-2" };
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => created });
    node("create-shell").click();
    await vi.waitFor(() => expect(attach).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledWith("/api/terminals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
    });
    expect(attach).toHaveBeenLastCalledWith(
        node("terminal"),
        "shell-2",
        expect.any(Function),
    );
    expect(close).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(node("create-shell").disabled).toBe(false));
    node("terminals").children[0]!.click();
    expect(attach).toHaveBeenCalledTimes(3);
    closed = true;
    node("terminals").children[0]!.click();
    expect(attach).toHaveBeenCalledTimes(4);
    expect(attach).toHaveBeenLastCalledWith(
        node("terminal"),
        "shell-1",
        expect.any(Function),
    );
    expect(close).toHaveBeenCalledTimes(3);
});

async function page() {
    const nodes = new Map<string, Element>();
    const node = (id: string) => {
        if (!nodes.has(id)) nodes.set(id, new Element());
        return nodes.get(id)!;
    };
    vi.stubGlobal("document", {
        getElementById: node,
        createElement: () => new Element(),
        hasFocus: () => true,
        visibilityState: "visible",
        addEventListener: vi.fn(),
    });
    vi.stubGlobal("window", { addEventListener: vi.fn() });
    vi.stubGlobal("EventSource", Events);
    const refresh = () => Events.current.onmessage?.();
    const shell = { id: "one", cwd: "/work", kind: "shell", alive: true };
    const fetchMock = vi.fn(
        async (
            path: string,
            _init?: RequestInit,
        ): Promise<Pick<Response, "ok" | "status" | "json">> => ({
            ok: true,
            status: 200,
            json: async () =>
                path === "/api/terminals"
                    ? [shell]
                    : path.startsWith("/api/web/notifications?")
                      ? [{ id: "notice", createdAt: 0, body: "notice" }]
                      : [],
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    attach.mockImplementation((_host, terminalId) => ({
        terminalId,
        close,
        closed: false,
    }));
    await import("./main");
    await vi.waitFor(() => expect(node("terminals").children.length).toBe(1));
    return { node, shell, fetchMock, refresh: () => refresh() };
}

it("does not replace the latest terminal choices with an older overlapping response", async () => {
    const { node, shell, fetchMock, refresh } = await page();
    let finish!: (response: Pick<Response, "ok" | "status" | "json">) => void;
    fetchMock.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                finish = resolve;
            }),
    );
    refresh();
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ ...shell, id: "new" }],
    });
    refresh();
    await vi.waitFor(() =>
        expect(node("terminals").children[0]?.textContent).toContain("new"),
    );
    finish({ ok: true, status: 200, json: async () => [shell] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(node("terminals").children[0]?.textContent).toContain("new");
    node("terminals").children[0]!.click();
    expect(attach).toHaveBeenLastCalledWith(
        node("terminal"),
        "new",
        expect.any(Function),
    );
});

it("keeps restoration diagnostics during reconnect and separates confirmed termination from a new selection", async () => {
    const { node, shell, fetchMock } = await page();
    node("terminals").children[0]!.click();
    const report = attach.mock.calls.at(-1)![2] as (
        text: string,
        state?: string,
    ) => void;
    report("mirror unavailable", "unrestorable");
    expect(node("recovery-error").textContent).toContain("mirror unavailable");
    expect(node("reconnect").disabled).toBe(true);
    expect(node("execution-state").textContent).toContain(
        "마지막 확인 시 실행 중",
    );
    report("connection failed", "failed");
    node("reconnect").click();
    expect(attach).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
    expect(node("recovery-error").textContent).toContain("connection failed");
    expect(node("recovery-error").textContent).toContain("다시 연결 중");
    const current = attach.mock.calls.at(-1)![2] as typeof report;
    report("old callback", "failed");
    expect(node("recovery-error").textContent).not.toContain("old callback");
    current("connected", "connected");
    expect(node("recovery-error").textContent).toBe("");
    current("lost connection", "failed");
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    const before = fetchMock.mock.calls.length;
    node("terminate").click();
    expect(confirm).toHaveBeenCalledWith(
        expect.stringContaining("진행 중인 작업이 중단됩니다"),
    );
    expect(fetchMock.mock.calls.length).toBe(before);
    confirm.mockReturnValue(true);
    let finish!: (value: Pick<Response, "ok" | "status" | "json">) => void;
    fetchMock.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                finish = resolve;
            }),
    );
    node("terminate").click();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/terminals/one", {
        method: "DELETE",
    });
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ ...shell, id: "two" }),
    });
    node("create-shell").click();
    await vi.waitFor(() => expect(attach.mock.calls.at(-1)?.[1]).toBe("two"));
    const newerCloseCount = close.mock.calls.length;
    finish({ ok: true, status: 200, json: async () => ({ deleted: true }) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(close.mock.calls.length).toBe(newerCloseCount);
    expect(node("attach").textContent).toContain("two");
    expect(node("termination-result").textContent).not.toContain(
        "종료했습니다",
    );
});

it("applies completed event queries while a newer slow query is pending", async () => {
    const { node, shell, fetchMock, refresh } = await page();
    let first!: (value: Pick<Response, "ok" | "status" | "json">) => void;
    let second!: typeof first;
    fetchMock.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                first = resolve;
            }),
    );
    refresh();
    fetchMock.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                second = resolve;
            }),
    );
    refresh();
    first({
        ok: true,
        status: 200,
        json: async () => [{ ...shell, id: "slow-first" }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(node("terminals").children[0]?.textContent).toContain("slow-first");
    second({
        ok: true,
        status: 200,
        json: async () => [{ ...shell, id: "slow-second" }],
    });
    await vi.waitFor(() =>
        expect(node("terminals").children[0]?.textContent).toContain(
            "slow-second",
        ),
    );
});

it("preserves a failed termination when reconnecting and never claims unknown execution is alive", async () => {
    const { node, fetchMock, refresh } = await page();
    node("terminals").children[0]!.click();
    const report = attach.mock.calls.at(-1)![2] as (
        text: string,
        state: string,
    ) => void;
    report("lost", "failed");
    vi.stubGlobal("confirm", () => true);
    fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: "cleanup failed" }),
    });
    node("terminate").click();
    await vi.waitFor(() =>
        expect(node("termination-result").textContent).toContain(
            "cleanup failed",
        ),
    );
    await vi.waitFor(() => expect(node("terminate").disabled).toBe(false));
    node("reconnect").click();
    expect(node("termination-result").textContent).toContain("cleanup failed");
    const current = attach.mock.calls.at(-1)![2] as typeof report;
    current("connected", "connected");
    expect(node("termination-result").textContent).toContain("cleanup failed");
    fetchMock.mockRejectedValueOnce(new Error("connection unavailable"));
    refresh();
    await vi.waitFor(() =>
        expect(node("execution-state").textContent).toBe(
            "현재 실행 상태를 확인할 수 없습니다.",
        ),
    );
    expect(node("status").textContent).toContain("connection unavailable");
    expect(node("status").textContent).not.toContain("daemon이 실행");
});

it("retains each operation failure through event queries and other successes, and replaces it only with its retry result", async () => {
    const { node, shell, fetchMock, refresh } = await page();
    fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ message: "cwd missing" }),
    });
    node("create-shell").click();
    await vi.waitFor(() =>
        expect(node("create-result").textContent).toContain("cwd missing"),
    );
    let finish!: (value: Pick<Response, "ok" | "status" | "json">) => void;
    fetchMock.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                finish = resolve;
            }),
    );
    node("create-shell").click();
    expect(node("create-result").textContent).toContain("cwd missing");
    expect(node("create-result").textContent).toContain("생성 중");
    refresh();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(node("create-result").textContent).toContain("cwd missing");
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
    });
    node("read-all").click();
    await vi.waitFor(() =>
        expect(node("read-result").textContent).toContain("읽음 처리했습니다"),
    );
    expect(node("create-result").textContent).toContain("cwd missing");
    finish({
        ok: true,
        status: 201,
        json: async () => ({ ...shell, id: "created" }),
    });
    await vi.waitFor(() =>
        expect(node("create-result").textContent).toBe("shell을 생성했습니다."),
    );
    expect(attach.mock.calls.at(-1)?.[1]).toBe("created");
    fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => {
            throw new Error("not json");
        },
    });
    node("read-all").click();
    await vi.waitFor(() =>
        expect(node("read-result").textContent).toContain("HTTP 502"),
    );
    refresh();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(node("read-result").textContent).toContain("HTTP 502");
});

it("invalidates pre-creation lists before its follow-up query completes", async () => {
    const { node, shell, fetchMock, refresh } = await page();
    let old!: (value: Pick<Response, "ok" | "status" | "json">) => void;
    fetchMock.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                old = resolve;
            }),
    );
    refresh();
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ ...shell, id: "created" }),
    });
    let next!: typeof old;
    fetchMock.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                next = resolve;
            }),
    );
    node("create-shell").click();
    await vi.waitFor(() =>
        expect(attach.mock.calls.at(-1)?.[1]).toBe("created"),
    );
    old({
        ok: true,
        status: 200,
        json: async () => [{ ...shell, id: "obsolete" }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(node("terminals").children[0]?.textContent).not.toContain(
        "obsolete",
    );
    expect(node("attach").textContent).toContain("created");
    next({
        ok: true,
        status: 200,
        json: async () => [{ ...shell, id: "created" }],
    });
    await vi.waitFor(() =>
        expect(node("terminals").children[0]?.textContent).toContain("created"),
    );
});

it("reports only acknowledged termination and does not recreate the process", async () => {
    const { node, fetchMock } = await page();
    node("terminals").children[0]!.click();
    const report = attach.mock.calls.at(-1)![2] as (
        text: string,
        state: string,
    ) => void;
    report("lost", "failed");
    vi.stubGlobal("confirm", () => true);
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ deleted: true }),
    });
    node("terminate").click();
    expect(node("termination-result").textContent).toContain("종료 요청 중");
    await vi.waitFor(() =>
        expect(node("termination-result").textContent).toBe(
            "터미널을 종료했습니다.",
        ),
    );
    expect(close).toHaveBeenCalledOnce();
    expect(attach).toHaveBeenCalledOnce();
    expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(0);
});

it("releases read-all after the write without waiting for a successful follow-up query", async () => {
    const { node, fetchMock, refresh } = await page();
    let pending!: (value: Pick<Response, "ok" | "status" | "json">) => void;
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
    });
    fetchMock.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                pending = resolve;
            }),
    );
    node("read-all").click();
    await vi.waitFor(() =>
        expect(node("read-result").textContent).toBe(
            "알림을 읽음 처리했습니다.",
        ),
    );
    expect(node("read-all").disabled).toBe(false);
    fetchMock.mockRejectedValueOnce(new Error("later query failed"));
    refresh();
    await vi.waitFor(() =>
        expect(node("status").textContent).toContain("later query failed"),
    );
    expect(node("read-all").disabled).toBe(false);
    pending({ ok: true, status: 200, json: async () => [] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(node("read-all").disabled).toBe(false);
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
    });
    fetchMock.mockRejectedValueOnce(new Error("follow-up failed"));
    node("read-all").click();
    await vi.waitFor(() =>
        expect(node("status").textContent).toContain("follow-up failed"),
    );
    expect(node("read-all").disabled).toBe(false);
    fetchMock.mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => [],
    }));
    refresh();
    await vi.waitFor(() => expect(node("read-all").disabled).toBe(true));
});

it("refreshes lists after a previously selected terminal is deleted without replacing the new attachment", async () => {
    const { node, shell, fetchMock, refresh } = await page();
    node("terminals").children[0]!.click();
    const report = attach.mock.calls.at(-1)![2] as (
        text: string,
        state: string,
    ) => void;
    report("lost", "failed");
    vi.stubGlobal("confirm", () => true);
    let deleted!: (value: Pick<Response, "ok" | "status" | "json">) => void;
    fetchMock.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                deleted = resolve;
            }),
    );
    node("terminate").click();
    const other = { ...shell, id: "other" };
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [shell, other],
    });
    refresh();
    await vi.waitFor(() => expect(node("terminals").children.length).toBe(2));
    node("terminals").children[1]!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    let old!: typeof deleted;
    fetchMock.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                old = resolve;
            }),
    );
    refresh();
    const callsBeforeDelete = fetchMock.mock.calls.length;
    const closesBeforeDelete = close.mock.calls.length;
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [other],
    });
    deleted({ ok: true, status: 200, json: async () => ({ deleted: true }) });
    await vi.waitFor(() =>
        expect(fetchMock.mock.calls.length).toBe(callsBeforeDelete + 3),
    );
    await vi.waitFor(() =>
        expect(node("terminals").children[0]?.textContent).toContain("other"),
    );
    old({ ok: true, status: 200, json: async () => [shell, other] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(node("terminals").children.length).toBe(1);
    expect(node("terminals").children[0]?.textContent).toContain("other");
    expect(close.mock.calls.length).toBe(closesBeforeDelete);
    expect(node("attach").textContent).toContain("other");
    expect(node("termination-result").textContent).toBe("");
});

it("synchronizes on SSE reconnect and changes without a polling timer", async () => {
    const interval = vi.fn();
    vi.stubGlobal("setInterval", interval);
    const { node, shell, fetchMock, refresh } = await page();
    expect(interval).not.toHaveBeenCalled();
    expect(Events.current.url).toBe("/api/web/events");
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ ...shell, id: "event-shell" }],
    });
    refresh();
    await vi.waitFor(() =>
        expect(node("terminals").children[0]?.textContent).toContain(
            "event-shell",
        ),
    );
    Events.current.onerror?.();
    expect(node("status").textContent).toContain("연결");
    refresh();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(node("status").textContent).toContain("연결");
    fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ ...shell, id: "reconnected-shell" }],
    });
    Events.current.onopen?.();
    refresh();
    await vi.waitFor(() =>
        expect(node("terminals").children[0]?.textContent).toContain(
            "reconnected-shell",
        ),
    );
    expect(node("status").textContent).toBe("");
});

it("limits Web queries and reads selected notifications only while its window and tab are active", async () => {
    const { node, shell, fetchMock, refresh } = await page();
    const other = { ...shell, id: "two" };
    let notices = [
        { id: "n-one", terminalId: "one", createdAt: 0, body: "one notice" },
        { id: "n-two", terminalId: "two", createdAt: 0, body: "two notice" },
    ];
    const doc = document as unknown as {
        hasFocus: () => boolean;
        visibilityState: string;
    };
    doc.hasFocus = () => false;
    fetchMock.mockImplementation(async (path, init) => {
        if (init?.method === "POST") {
            const ids = (JSON.parse(String(init.body)) as { ids?: string[] })
                .ids;
            notices = notices.filter(
                (n) => ids !== undefined && !ids.includes(n.id),
            );
            return { ok: true, status: 200, json: async () => ({ read: 1 }) };
        }
        return {
            ok: true,
            status: 200,
            json: async () =>
                path === "/api/terminals"
                    ? [shell, other]
                    : path === "/api/web/notifications?unread=true"
                      ? notices
                      : [],
        };
    });
    refresh();
    await vi.waitFor(() =>
        expect(node("notifications").children.length).toBe(2),
    );
    expect(node("terminals").children[0]?.textContent).toContain("미확인 1");
    // Explicit selection reads only its target, even before window activation.
    node("terminals").children[1]!.click();
    await vi.waitFor(() => expect(notices.map((n) => n.id)).toEqual(["n-one"]));
    expect(fetchMock).toHaveBeenCalledWith(
        "/api/web/notifications/read",
        expect.objectContaining({ body: '{"ids":["n-two"]}' }),
    );
    notices.push({
        id: "n-two-next",
        terminalId: "two",
        createdAt: 1,
        body: "background notice",
    });
    refresh();
    await vi.waitFor(() =>
        expect(node("notifications").children.length).toBe(2),
    );
    expect(notices).toHaveLength(2);
    doc.hasFocus = () => true;
    doc.visibilityState = "hidden";
    refresh();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(notices).toHaveLength(2);
    doc.visibilityState = "visible";
    const visibilityListener = vi
        .mocked(document.addEventListener)
        .mock.calls.find(
            ([name]) => name === "visibilitychange",
        )?.[1] as () => void;
    visibilityListener();
    await vi.waitFor(() => expect(notices.map((n) => n.id)).toEqual(["n-one"]));
    await vi.waitFor(() =>
        expect(node("notifications").children.length).toBe(1),
    );
    // Input focus inside the active document does not alter terminal selection.
    Object.defineProperty(document, "activeElement", {
        value: node("create-shell"),
        configurable: true,
    });
    notices.push({
        id: "n-two-button",
        terminalId: "two",
        createdAt: 2,
        body: "button focus notice",
    });
    const focusListener = vi
        .mocked(window.addEventListener)
        .mock.calls.find(([name]) => name === "focus")?.[1] as () => void;
    focusListener();
    await vi.waitFor(() => expect(notices.map((n) => n.id)).toEqual(["n-one"]));
    expect(
        fetchMock.mock.calls.some(
            ([path]) =>
                path === "/api/agents" || path.startsWith("/api/notifications"),
        ),
    ).toBe(false);
});

it("preserves a terminal selection read while a different automatic read fails", async () => {
    const { node, shell, fetchMock, refresh } = await page();
    node("terminals").children[0]!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    let notices = [
        { id: "a", terminalId: "one", createdAt: 0, body: "A" },
        { id: "b", terminalId: "two", createdAt: 0, body: "B" },
    ];
    let failA!: (response: Pick<Response, "ok" | "status" | "json">) => void;
    fetchMock.mockImplementation(async (path, init) => {
        if (init?.method === "POST") {
            const { ids } = JSON.parse(String(init.body)) as { ids: string[] };
            if (ids.includes("a"))
                return new Promise((resolve) => {
                    failA = resolve;
                });
            notices = notices.filter((n) => !ids.includes(n.id));
            return { ok: true, status: 200, json: async () => ({ read: 1 }) };
        }
        return {
            ok: true,
            status: 200,
            json: async () =>
                path === "/api/terminals"
                    ? [shell, { ...shell, id: "two" }]
                    : path.includes("notifications?")
                      ? notices
                      : [],
        };
    });
    refresh();
    await vi.waitFor(() => expect(failA).toBeTypeOf("function"));
    node("terminals").children[1]!.click();
    failA({
        ok: false,
        status: 500,
        json: async () => ({ message: "A read failed" }),
    });
    await vi.waitFor(() => expect(notices.map((n) => n.id)).toEqual(["a"]));
    expect(attach.mock.calls.at(-1)?.[1]).toBe("two");
    expect(fetchMock).toHaveBeenCalledWith(
        "/api/web/notifications/read",
        expect.objectContaining({ body: '{"ids":["b"]}' }),
    );
});

it("starts a queued selection read after the write even while its follow-up query is pending", async () => {
    const { node, shell, fetchMock, refresh } = await page();
    node("terminals").children[0]!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    let notices = [
        { id: "a", terminalId: "one", createdAt: 0, body: "A" },
        { id: "b", terminalId: "two", createdAt: 0, body: "B" },
    ];
    let finishA!: (response: Pick<Response, "ok" | "status" | "json">) => void;
    let finishQuery!: typeof finishA;
    let holdQuery = false;
    fetchMock.mockImplementation(async (path, init) => {
        if (init?.method === "POST") {
            const { ids } = JSON.parse(String(init.body)) as { ids: string[] };
            notices = notices.filter((n) => !ids.includes(n.id));
            if (ids.includes("a"))
                return new Promise((resolve) => {
                    finishA = resolve;
                });
            return { ok: true, status: 200, json: async () => ({ read: 1 }) };
        }
        if (path === "/api/terminals" && holdQuery) {
            holdQuery = false;
            return new Promise((resolve) => {
                finishQuery = resolve;
            });
        }
        return {
            ok: true,
            status: 200,
            json: async () =>
                path === "/api/terminals"
                    ? [shell, { ...shell, id: "two" }]
                    : path.includes("notifications?")
                      ? notices
                      : [],
        };
    });
    refresh();
    await vi.waitFor(() => expect(finishA).toBeTypeOf("function"));
    node("terminals").children[1]!.click();
    holdQuery = true;
    finishA({ ok: true, status: 200, json: async () => ({ read: 1 }) });
    try {
        await vi.waitFor(() => expect(finishQuery).toBeTypeOf("function"));
        await vi.waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                "/api/web/notifications/read",
                expect.objectContaining({ body: '{"ids":["b"]}' }),
            ),
        );
    } finally {
        finishQuery?.({ ok: true, status: 200, json: async () => [shell] });
    }
});
