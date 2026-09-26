import { afterEach, expect, it, vi } from "vitest";

import { attachTerminal } from "@/attach";

const { term, data, binary, callbacks, operations, fit, restoreState } =
    vi.hoisted(() => {
        const data = new Set<(value: string) => void>();
        const binary = new Set<(value: string) => void>();
        const callbacks: (() => void)[] = [];
        const operations: string[] = [];
        const term = {
            _core: {
                _compositionHelper: { keydown: () => true },
                coreService: {
                    triggerDataEvent(value: string, _user = false) {
                        if (!term.options.disableStdin)
                            for (const listener of data) listener(value);
                    },
                },
                _inputHandler: {
                    parse(action: () => void) {
                        action();
                    },
                },
            },
            cols: 80,
            rows: 24,
            options: { disableStdin: false },
            loadAddon: vi.fn(),
            open: vi.fn(),
            dispose: vi.fn(),
            focus: vi.fn(),
            attachCustomKeyEventHandler:
                vi.fn<(handler: (event: KeyboardEvent) => boolean) => void>(),
            input(value: string, user = true) {
                term._core.coreService.triggerDataEvent(value, user);
            },
            resize: vi.fn((cols: number, rows: number) => {
                term.cols = cols;
                term.rows = rows;
                operations.push(`resize:${cols}:${rows}`);
            }),
            write: vi.fn((_value: unknown, callback?: () => void) => {
                operations.push("write");
                if (callback) callbacks.push(callback);
            }),
            onData: (listener: (value: string) => void) => {
                data.add(listener);
                return { dispose: () => data.delete(listener) };
            },
            onBinary: (listener: (value: string) => void) => {
                binary.add(listener);
                return { dispose: () => binary.delete(listener) };
            },
        };
        const fit = vi.fn(() => {
            operations.push("measure");
            return { cols: 170, rows: 40 };
        });
        const restoreState = vi.fn(() => operations.push("state"));
        return { term, data, binary, callbacks, operations, fit, restoreState };
    });

vi.mock("@aiox/terminal/restore", () => ({
    restoreTerminalState: restoreState,
}));

vi.mock("@xterm/xterm", () => ({
    Terminal: class {
        constructor(options: { disableStdin?: boolean }) {
            term.options.disableStdin = options.disableStdin ?? false;
            return term;
        }
    },
}));
vi.mock("@xterm/addon-fit", () => ({
    FitAddon: class {
        proposeDimensions = fit;
    },
}));

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    data.clear();
    binary.clear();
    callbacks.length = 0;
    operations.length = 0;
});

let resizeCallback: () => void;
const disconnect = vi.fn();

function setup(
    protocol = "http:",
    canFocus = () => true,
    keybindings?: Parameters<typeof attachTerminal>[6],
) {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            constructor(callback: () => void) {
                resizeCallback = callback;
            }
            observe = vi.fn();
            disconnect = disconnect;
        },
    );
    const socket = Object.assign(new EventTarget(), {
        url: "",
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(function (this: { readyState: number }) {
            this.readyState = 2;
        }),
    });
    class Socket {
        static OPEN = 1;
        static CLOSING = 2;
        constructor(url: string) {
            socket.url = url;
            return socket;
        }
    }
    vi.stubGlobal("WebSocket", Socket);
    vi.stubGlobal("location", { host: "localhost", protocol });
    // Stands in for the sidebar button that selected this terminal.
    const doc = { activeElement: {} as Element };
    vi.stubGlobal("document", doc);
    vi.stubGlobal(
        "window",
        Object.assign(new EventTarget(), { clearTimeout, setTimeout }),
    );
    const report = vi.fn();
    const host = {
        replaceChildren() {},
        isConnected: true,
        clientWidth: 1000,
        clientHeight: 600,
    };
    const attachment = attachTerminal(
        host as unknown as HTMLElement,
        "terminal-1",
        report,
        undefined,
        canFocus,
        undefined,
        keybindings,
    );
    const message = (value: unknown) =>
        socket.dispatchEvent(
            new MessageEvent("message", {
                data:
                    value instanceof ArrayBuffer
                        ? value
                        : JSON.stringify(value),
            }),
        );
    socket.dispatchEvent(new Event("open"));
    return { socket, attachment, message, report, doc, host };
}

async function flush() {
    for (let i = 0; i < 20; i++) await Promise.resolve();
}

it("sends mapped keys once as user input, honors live overrides, and preserves lifecycle guards", async () => {
    vi.stubGlobal("navigator", { platform: "MacIntel" });
    let overrides: Record<string, string | null> = {};
    const { socket, message, attachment } = setup(
        "http:",
        () => true,
        () => ({ mac: overrides }),
    );
    const handler = term.attachCustomKeyEventHandler.mock.calls[0]![0];
    const left = () => {
        const event = new KeyboardEvent("keydown", {
            key: "ArrowLeft",
            altKey: true,
            cancelable: true,
        });
        // happy-dom equates AltGraph with Alt; browsers distinguish them.
        vi.spyOn(event, "getModifierState").mockReturnValue(false);
        return event;
    };
    expect(handler(left())).toBe(false);
    expect(socket.send).not.toHaveBeenCalled();
    message({ type: "snapshot", cols: 80, rows: 24, state: {} });
    message({ type: "snapshot-end" });
    message({ type: "restored" });
    await flush();
    socket.send.mockClear();
    const event = left();
    expect(handler(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(socket.send).toHaveBeenCalledExactlyOnceWith(
        new TextEncoder().encode("\x1bb"),
    );
    socket.send.mockClear();
    overrides = { "Alt+ArrowLeft": "\x1b[1;5D" };
    expect(handler(left())).toBe(false);
    expect(socket.send).toHaveBeenCalledExactlyOnceWith(
        new TextEncoder().encode("\x1b[1;5D"),
    );
    socket.send.mockClear();
    overrides = { "Alt+ArrowLeft": null };
    expect(handler(left())).toBe(true);
    expect(
        handler(new KeyboardEvent("keydown", { key: "v", metaKey: true })),
    ).toBe(true);
    expect(socket.send).not.toHaveBeenCalled();
    overrides = {};
    attachment.close();
    handler(left());
    expect(socket.send).not.toHaveBeenCalled();
});

it("restores geometry and ordered output before enabling input and requesting pane size", async () => {
    vi.useFakeTimers();
    const { socket, message } = setup();
    expect(socket.send).not.toHaveBeenCalled();
    expect(term.options.disableStdin).toBe(true);
    message({ type: "snapshot", cols: 219, rows: 83, state: { version: 1 } });
    message(new Uint8Array([65]).buffer);
    message({ type: "snapshot-end" });
    message({ type: "resize", cols: 200, rows: 70 });
    message(new Uint8Array([66]).buffer);
    message({ type: "restored" });
    message({ type: "output", respond: false, offset: 1 });
    message(new Uint8Array([67]).buffer);
    await flush();
    expect(operations).toEqual(["resize:219:83", "write"]);
    resizeCallback();
    vi.advanceTimersByTime(120);
    expect(socket.send).not.toHaveBeenCalled();
    callbacks.shift()?.();
    await flush();
    expect(operations).toEqual([
        "resize:219:83",
        "write",
        "state",
        "resize:200:70",
        "write",
    ]);
    expect(term.options.disableStdin).toBe(true);
    callbacks.shift()?.();
    await flush();
    expect(term.options.disableStdin).toBe(false);
    expect(operations).toEqual([
        "resize:219:83",
        "write",
        "state",
        "resize:200:70",
        "write",
        "measure",
        "write",
    ]);
    expect(term.cols).toBe(200);
    expect(term.rows).toBe(70);
    expect(socket.send).toHaveBeenCalledExactlyOnceWith(
        JSON.stringify({ type: "resize", cols: 170, rows: 40 }),
    );
    expect(
        term.write.mock.calls.map(([value]) => [...(value as Uint8Array)]),
    ).toEqual([[65], [66], [67]]);
});

it("preserves binary mouse bytes and UTF-8 input after restore and disposes both listeners", async () => {
    const { socket, message, attachment } = setup();
    message({ type: "snapshot", cols: 80, rows: 24, state: { version: 1 } });
    message({ type: "snapshot-end" });
    message({ type: "restored" });
    await flush();
    socket.send.mockClear();
    for (const listener of binary) listener("\x1b[M \x80\xff");
    expect(socket.send).toHaveBeenLastCalledWith(
        Uint8Array.of(27, 91, 77, 32, 128, 255),
    );
    for (const listener of data) listener("한글");
    expect(socket.send).toHaveBeenLastCalledWith(
        new TextEncoder().encode("한글"),
    );
    socket.readyState = 2;
    for (const listener of data) listener("closed");
    expect(socket.send).toHaveBeenCalledTimes(2);
    attachment.close();
    expect(data.size).toBe(0);
    expect(binary.size).toBe(0);
    expect(term.dispose).toHaveBeenCalledOnce();
});

it("does not apply queued restoration after detach", async () => {
    const { message, attachment, socket } = setup();
    message({ type: "snapshot", cols: 219, rows: 83, state: { version: 1 } });
    message(new ArrayBuffer(1));
    message({ type: "snapshot-end" });
    message({ type: "restored" });
    await flush();
    attachment.close();
    callbacks.shift()?.();
    await flush();
    expect(term.focus).not.toHaveBeenCalled();
    expect(fit).not.toHaveBeenCalled();
    expect(socket.send).not.toHaveBeenCalled();
});

it("shows restoration failure and closes only the attachment", async () => {
    const { message, socket, report } = setup();
    message({ type: "error", message: "복원 일시 제한" });
    await flush();
    expect(report).toHaveBeenLastCalledWith(
        expect.stringContaining("복원 일시 제한"),
        "failed",
    );
    expect(socket.close).toHaveBeenCalledOnce();
});

it("distinguishes an unrestorable mirror from connection failure", async () => {
    const { message, report } = setup();
    message({ type: "error", message: "mirror failed", restorable: false });
    await flush();
    expect(report).toHaveBeenLastCalledWith(
        expect.stringContaining("mirror failed"),
        "unrestorable",
    );
});

it("finishes received output and exit notice even when the socket closes during parsing", async () => {
    const { message, socket, report } = setup();
    message({ type: "snapshot", cols: 80, rows: 24, state: { version: 1 } });
    message(new Uint8Array([65]).buffer);
    message({ type: "exit", exitCode: 0, signal: null });
    await flush();
    socket.readyState = 2;
    socket.dispatchEvent(
        Object.assign(new Event("close"), { code: 1005, wasClean: true }),
    );
    callbacks.shift()?.();
    await flush();
    expect(term.write).toHaveBeenCalledTimes(2);
    expect(term.write.mock.calls[1]?.[0]).toContain(
        "Process exited exitCode=0",
    );
    expect(term.options.disableStdin).toBe(true);
    expect(socket.send).not.toHaveBeenCalled();
    callbacks.shift()?.();
    await flush();
    expect(report).not.toHaveBeenCalledWith(expect.any(String), "disconnected");
    expect(report).toHaveBeenLastCalledWith(
        expect.stringContaining("process exited"),
        "exited",
    );
});

it("reports a clean close without an exit frame as disconnected", async () => {
    const { socket, report } = setup();
    socket.dispatchEvent(
        Object.assign(new Event("close"), { code: 1005, wasClean: true }),
    );
    await flush();
    expect(report).toHaveBeenLastCalledWith(
        expect.stringContaining("disconnected"),
        "disconnected",
    );
});

it("resets display attributes before the exit notice so a dying program cannot hide it", async () => {
    const { message } = setup();
    message({ type: "snapshot", cols: 80, rows: 24, state: {} });
    message({ type: "snapshot-end" });
    message({ type: "exit", exitCode: 1, signal: 9 });
    await flush();
    const notice = term.write.mock.calls.at(-1)?.[0] as string;
    expect(notice).toContain("Process exited exitCode=1 signal=9");
    expect(notice.indexOf("[0m")).toBeLessThan(notice.indexOf("[33m"));
});

it("focuses the restored pane only while focus has not moved since attaching", async () => {
    const kept = setup();
    kept.message({ type: "snapshot", cols: 80, rows: 24, state: {} });
    kept.message({ type: "snapshot-end" });
    kept.message({ type: "restored" });
    await flush();
    expect(term.focus).toHaveBeenCalledOnce();
    kept.attachment.close();
    const moved = setup();
    moved.message({ type: "snapshot", cols: 80, rows: 24, state: {} });
    moved.message({ type: "snapshot-end" });
    moved.doc.activeElement = {} as Element;
    moved.message({ type: "restored" });
    await flush();
    expect(term.focus).toHaveBeenCalledOnce();
    moved.attachment.close();
});

it("reports malformed control frames instead of silently continuing", async () => {
    const { socket, report } = setup();
    socket.dispatchEvent(new MessageEvent("message", { data: "{" }));
    await flush();
    expect(socket.close).toHaveBeenCalledOnce();
    expect(report).toHaveBeenLastCalledWith(
        expect.stringContaining("terminal terminal-1"),
        "failed",
    );
});

it("rejects a snapshot missing its required state instead of using a partial restore", async () => {
    const { message, socket, report } = setup();
    message({ type: "snapshot", cols: 80, rows: 24 });
    message({ type: "snapshot-end" });
    message({ type: "restored" });
    await flush();
    expect(socket.close).toHaveBeenCalledOnce();
    expect(report).toHaveBeenLastCalledWith(
        expect.stringContaining("restoration state"),
        "failed",
    );
    expect(term.focus).not.toHaveBeenCalled();
});

it("requests live pane size without changing geometry until the ordered server resize", async () => {
    vi.useFakeTimers();
    const { message, socket, attachment } = setup();
    message({ type: "snapshot", cols: 80, rows: 24, state: { version: 1 } });
    message({ type: "snapshot-end" });
    message({ type: "restored" });
    await flush();
    term.resize.mockClear();
    socket.send.mockClear();
    message({ type: "output", respond: false, offset: 1 });
    message(new Uint8Array([65]).buffer);
    await flush();
    resizeCallback();
    vi.advanceTimersByTime(120);
    expect(socket.send).toHaveBeenCalledExactlyOnceWith(
        JSON.stringify({ type: "resize", cols: 170, rows: 40 }),
    );
    expect(term.resize).not.toHaveBeenCalled();
    message({ type: "resize", cols: 170, rows: 40 });
    await flush();
    expect(term.resize).not.toHaveBeenCalled();
    callbacks.shift()?.();
    await flush();
    expect(term.resize).toHaveBeenCalledExactlyOnceWith(170, 40);
    resizeCallback();
    attachment.close();
    vi.advanceTimersByTime(120);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(socket.send).toHaveBeenCalledTimes(2);
});

it("answers only designated output while preserving user input and focus notifications", async () => {
    const { socket, message, attachment } = setup();
    message({ type: "snapshot", cols: 80, rows: 24, state: {} });
    message({ type: "snapshot-end" });
    message({ type: "restored" });
    await flush();
    socket.send.mockClear();
    message({ type: "output", respond: false, offset: 0 });
    message(new ArrayBuffer(0));
    await flush();
    term._core._inputHandler.parse(() =>
        term._core.coreService.triggerDataEvent("reply"),
    );
    expect(socket.send).not.toHaveBeenCalled();
    term._core.coreService.triggerDataEvent("typed", true);
    expect(socket.send.mock.calls[0]![0]).toEqual(
        new TextEncoder().encode("typed"),
    );
    term._core.coreService.triggerDataEvent("focus-notification");
    expect(JSON.parse(socket.send.mock.calls[1]![0])).toEqual({
        type: "response",
        data: "focus-notification",
    });
    callbacks.shift()?.();
    await flush();
    socket.send.mockClear();
    message({ type: "output", respond: true, offset: 0 });
    message(new ArrayBuffer(0));
    await flush();
    term._core._inputHandler.parse(() =>
        term._core.coreService.triggerDataEvent("reply"),
    );
    expect(JSON.parse(socket.send.mock.calls[0]![0])).toEqual({
        type: "response",
        data: "reply",
    });
    attachment.close();
});

it("reports an incompatible stream that sends output without a snapshot", async () => {
    const { message, socket, report } = setup();
    message(new Uint8Array([65]).buffer);
    await flush();
    expect(term.write).not.toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalledOnce();
    expect(report).toHaveBeenLastCalledWith(
        expect.stringContaining("snapshot"),
        "failed",
    );
});

it("acknowledges cumulative live bytes only after parsing, never historical replay or after detach", async () => {
    const { socket, message, attachment } = setup();
    message({ type: "snapshot", cols: 80, rows: 24, state: {} });
    message(new ArrayBuffer(3));
    message({ type: "snapshot-end" });
    message(new ArrayBuffer(2));
    message({ type: "restored" });
    await flush();
    callbacks.shift()?.();
    await flush();
    expect(socket.send).not.toHaveBeenCalled();
    callbacks.shift()?.();
    await flush();
    socket.send.mockClear();
    message({ type: "output", respond: false, offset: 3 });
    message(new ArrayBuffer(3));
    message({ type: "output", respond: true, offset: 5 });
    message(new ArrayBuffer(2));
    message({ type: "output", respond: true, offset: 6 });
    message(new ArrayBuffer(1));
    await flush();
    expect(socket.send).not.toHaveBeenCalled();
    callbacks.shift()?.();
    await flush();
    expect(socket.send).toHaveBeenCalledExactlyOnceWith(
        JSON.stringify({ type: "ack", offset: 3 }),
    );
    callbacks.shift()?.();
    await flush();
    expect(socket.send).toHaveBeenLastCalledWith(
        JSON.stringify({ type: "ack", offset: 5 }),
    );
    attachment.close();
    callbacks.shift()?.();
    await flush();
    expect(socket.send).toHaveBeenCalledTimes(2);
});

it.each([undefined, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, 2])(
    "rejects invalid or inconsistent live offset %s before writing bytes",
    async (offset) => {
        const { socket, message } = setup();
        message({ type: "snapshot", cols: 80, rows: 24, state: {} });
        message({ type: "snapshot-end" });
        message({ type: "restored" });
        await flush();
        message({ type: "output", respond: true, offset });
        message(new ArrayBuffer(1));
        await flush();
        expect(socket.close).toHaveBeenCalledOnce();
        expect(term.write).not.toHaveBeenCalled();
    },
);

it("reports a slow-viewer close immediately while the last write is still parsing", async () => {
    const { socket, message, report } = setup();
    message({ type: "snapshot", cols: 80, rows: 24, state: {} });
    message({ type: "snapshot-end" });
    message({ type: "restored" });
    message({ type: "output", respond: false, offset: 1 });
    message(new ArrayBuffer(1));
    await flush();
    socket.readyState = 2;
    const close = new Event("close");
    Object.assign(close, {
        code: 1013,
        wasClean: true,
        reason: "Viewer is too slow; reconnect to restore the screen",
    });
    socket.dispatchEvent(close);
    expect(report).toHaveBeenLastCalledWith(
        expect.stringContaining("Viewer is too slow; reconnect"),
        "disconnected",
    );
    socket.send.mockClear();
    callbacks.shift()?.();
    await flush();
    expect(socket.send).not.toHaveBeenCalled();
});

it.each([
    ["http:", "ws:"],
    ["https:", "wss:"],
])("uses %s origin transport as %s", (protocol, expected) => {
    const { socket, attachment } = setup(protocol);
    expect(socket.url).toBe(`${expected}//localhost/ws/terminal/terminal-1`);
    attachment.close();
});
it("suppresses focus in inactive panes and zero/disconnected measurements, then fits when visible", async () => {
    vi.useFakeTimers();
    let active = false;
    const { host, attachment, message, socket } = setup("http:", () => active);
    host.clientWidth = 0;
    message({ type: "snapshot", cols: 80, rows: 24, state: { version: 1 } });
    message({ type: "snapshot-end" });
    message({ type: "restored" });
    await flush();
    expect(term.focus).not.toHaveBeenCalled();
    expect(fit).not.toHaveBeenCalled();
    host.clientWidth = 1000;
    host.isConnected = false;
    resizeCallback();
    vi.advanceTimersByTime(120);
    expect(fit).not.toHaveBeenCalled();
    host.isConnected = true;
    resizeCallback();
    vi.advanceTimersByTime(120);
    expect(socket.send).toHaveBeenLastCalledWith(
        JSON.stringify({ type: "resize", cols: 170, rows: 40 }),
    );
    attachment.focus();
    expect(term.focus).not.toHaveBeenCalled();
    active = true;
    attachment.focus();
    expect(term.focus).toHaveBeenCalledOnce();
    attachment.close();
    attachment.close();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(term.dispose).toHaveBeenCalledOnce();
    socket.dispatchEvent(new Event("open"));
    attachment.focus();
    expect(term.focus).toHaveBeenCalledOnce();
});
it("reports connection errors separately from screen restoration failures", () => {
    const { socket, report, attachment } = setup();
    socket.dispatchEvent(new Event("error"));
    expect(report).toHaveBeenLastCalledWith(
        expect.stringContaining("Connection failed"),
        "disconnected",
    );
    attachment.close();
});
