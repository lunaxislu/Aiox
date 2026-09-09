import { afterEach, expect, it, vi } from "vitest";

const { attach, close } = vi.hoisted(() => ({
    attach: vi.fn(),
    close: vi.fn(),
}));
vi.mock("./attach", () => ({ attachTerminal: attach }));

// Node-only DOM double: exercises HTTP selection and attachment ownership,
// without claiming browser rendering, keyboard or xterm verification.
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
    });
    let refresh: () => void = () => {};
    vi.stubGlobal("setInterval", (fn: () => void) => {
        refresh = fn;
        return 1;
    });
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
                    : path === "/api/agents"
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
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => [] });
    node("create-shell").click();
    await vi.waitFor(() =>
        expect(node("status").textContent).toContain("shell 생성 실패"),
    );
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
