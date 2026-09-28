import type { AioxConfig } from "@aiox/protocol";
import { restoreTerminalState } from "@aiox/terminal/restore";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

import { bindTerminalKeys } from "@/terminal-keybindings";
import { followTerminalBackground } from "@/terminal-theme";

/**
 * One browser attachment to one server owned PTY.
 *
 * Wire protocol (see the daemon's `/ws/terminal/:id` handler):
 *   server → client  binary = raw pty output bytes
 *   server → client  text   = JSON snapshot/state/output/resize/restored/exit/error control
 *   client → server  binary = raw input bytes
 *   client → server  text   = JSON resize requests, automatic responses or parsed-byte ACKs
 *
 * Detaching closes the socket and nothing else. The pty keeps running, which is
 * what makes re-selecting the same terminal show replay plus live output.
 */

export type Attachment = {
    readonly terminalId: string;
    readonly closed: boolean;
    focus(): void;
    close(): void;
};

export type AttachmentState =
    | "restoring"
    | "connected"
    | "disconnected"
    | "exited"
    | "failed"
    | "unrestorable";

type ServerMessage = {
    type?: string;
    exitCode?: number;
    signal?: number | null;
    cols?: number;
    rows?: number;
    message?: string;
    state?: unknown;
    respond?: boolean;
    offset?: number;
    restorable?: boolean;
};

const encoder = new TextEncoder();
const RESIZE_DEBOUNCE_MS = 120;

export function attachTerminal(
    host: HTMLElement,
    terminalId: string,
    onState: (text: string, state?: AttachmentState) => void,
    runtimeId?: string,
    canFocus: () => boolean = () => true,
    appearance?: { background?: string; onBackground: (color: string) => void },
    keybindings: () => NonNullable<
        AioxConfig["terminal"]
    >["keybindings"] = () => undefined,
): Attachment {
    host.replaceChildren();

    // Selecting a terminal focuses its sidebar button, so claiming focus once
    // restored is only right while the user has not moved on in the meantime.
    const opener = document.activeElement;

    const term = new Terminal({
        vtExtensions: { kittyKeyboard: true },
        cursorBlink: true,
        disableStdin: true,
        fontSize: 13,
        scrollback: 5_000,
        theme:
            appearance?.background !== undefined
                ? { background: appearance.background }
                : {},
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    let socket: WebSocket;
    let background: { dispose(): void } | undefined;
    try {
        term.open(host);
        if (appearance)
            background = followTerminalBackground(
                term,
                appearance.background !== undefined,
                appearance.onBackground,
            );
        socket = new WebSocket(
            `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/terminal/${encodeURIComponent(terminalId)}${runtimeId ? `?runtime=${encodeURIComponent(runtimeId)}` : ""}`,
        );
    } catch (error) {
        background?.dispose();
        term.dispose();
        throw error;
    }
    socket.binaryType = "arraybuffer";
    const socketEvents = new AbortController();

    // A closed socket fires its close event after the next attachment is
    // already reporting "connected", so a detached attachment goes quiet.
    let detached = false;
    let restored = false;
    let snapshotState: unknown;
    let snapshotFinished = false;
    let failed = false;
    let ended = false;
    let pending = Promise.resolve();
    let respond = false;
    let userInput = true;
    let parsing = false;
    let parsedOffset = 0;
    let outputOffset: number | undefined;
    // xterm 6 loses wasUserInput at public onData. Preserve that distinction
    // and parser context without parsing response strings or replacing VT logic.
    const core = (
        term as unknown as {
            _core: {
                coreService: {
                    triggerDataEvent(data: string, user?: boolean): void;
                };
                _inputHandler: { parse(...args: unknown[]): unknown };
            };
        }
    )._core;
    const trigger = core.coreService.triggerDataEvent;
    const parse = core._inputHandler.parse;
    core.coreService.triggerDataEvent = function (data, user = false) {
        const previous = userInput;
        userInput = user;
        try {
            trigger.call(this, data, user);
        } finally {
            userInput = previous;
        }
    };
    core._inputHandler.parse = function (...args) {
        const previous = parsing;
        parsing = true;
        try {
            return parse.apply(this, args);
        } finally {
            parsing = previous;
        }
    };

    bindTerminalKeys(term, keybindings);
    const report = (text: string, state?: AttachmentState): void => {
        if (!detached) onState(text, state);
    };

    const sendResize = (): void => {
        if (detached || !restored || socket.readyState !== WebSocket.OPEN)
            return;
        if (
            !host.isConnected ||
            host.clientWidth <= 0 ||
            host.clientHeight <= 0
        )
            return;
        const dimensions = fit.proposeDimensions();
        if (!dimensions) return;
        socket.send(JSON.stringify({ type: "resize", ...dimensions }));
    };

    let resizeTimer: number | undefined;
    const resizeObserver = new ResizeObserver(() => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            if (detached || !restored || socket.readyState !== WebSocket.OPEN)
                return;
            sendResize();
        }, RESIZE_DEBOUNCE_MS);
    });
    resizeObserver.observe(host);

    const fail = (
        message: string,
        restorable = true,
        state: AttachmentState = restored ? "disconnected" : "failed",
    ): void => {
        if (detached || failed) return;
        failed = true;
        term.options.disableStdin = true;
        report(
            `terminal ${terminalId} · ${message}`,
            restorable ? state : "unrestorable",
        );
        socket.close();
    };
    const write = (data: string | Uint8Array): Promise<void> =>
        new Promise((resolve) => term.write(data, resolve));

    socket.addEventListener(
        "open",
        () => {
            report(`terminal ${terminalId} · restoring…`, "restoring");
        },
        { signal: socketEvents.signal },
    );

    socket.addEventListener(
        "message",
        (event) => {
            pending = pending
                .then(async () => {
                    if (detached || failed || ended) return;
                    if (typeof event.data !== "string") {
                        if (snapshotState === undefined && !snapshotFinished)
                            throw new Error(
                                "Output received before snapshot; check daemon and Web version compatibility",
                            );
                        const bytes = new Uint8Array(event.data as ArrayBuffer);
                        const offset = outputOffset;
                        if (
                            restored &&
                            (offset === undefined ||
                                offset - parsedOffset !== bytes.byteLength)
                        )
                            throw new Error(
                                "Invalid terminal output byte offset",
                            );
                        await write(bytes);
                        if (restored) {
                            parsedOffset = offset!;
                            outputOffset = undefined;
                            if (
                                !detached &&
                                socket.readyState === WebSocket.OPEN
                            )
                                socket.send(
                                    JSON.stringify({ type: "ack", offset }),
                                );
                        }
                        return;
                    }
                    const message = JSON.parse(event.data) as ServerMessage;
                    switch (message.type) {
                        case "output":
                            if (
                                !restored ||
                                typeof message.respond !== "boolean"
                            )
                                throw new Error(
                                    "Invalid output response permission",
                                );
                            respond = message.respond;
                            if (
                                outputOffset !== undefined ||
                                !Number.isSafeInteger(message.offset) ||
                                message.offset! < parsedOffset
                            )
                                throw new Error(
                                    "Invalid terminal output byte offset",
                                );
                            outputOffset = message.offset;
                            break;
                        case "snapshot":
                            if (
                                snapshotState !== undefined ||
                                snapshotFinished ||
                                message.state == null
                            )
                                throw new Error("Invalid restoration state");
                            snapshotState = message.state;
                        // Snapshot geometry must be applied before its first byte.
                        // fall through
                        case "resize":
                            if (
                                !Number.isInteger(message.cols) ||
                                !Number.isInteger(message.rows) ||
                                message.cols! < 1 ||
                                message.rows! < 1
                            ) {
                                throw new Error("Invalid terminal dimensions");
                            }
                            term.resize(message.cols!, message.rows!);
                            break;
                        case "snapshot-end":
                            if (snapshotState === undefined || snapshotFinished)
                                throw new Error(
                                    "Invalid restoration state boundary",
                                );
                            restoreTerminalState(term, snapshotState);
                            snapshotState = undefined;
                            snapshotFinished = true;
                            break;
                        case "restored":
                            if (!snapshotFinished)
                                throw new Error(
                                    "Restoration completed before state was applied",
                                );
                            if (restored)
                                throw new Error(
                                    "Duplicate restoration completion",
                                );
                            restored = true;
                            if (socket.readyState !== WebSocket.OPEN) break;
                            term.options.disableStdin = false;
                            sendResize();
                            if (canFocus() && document.activeElement === opener)
                                term.focus();
                            report(
                                `terminal ${terminalId} · connected`,
                                "connected",
                            );
                            break;
                        case "exit":
                            ended = true;
                            term.options.disableStdin = true;
                            // Reset first: a program that dies with invisible,
                            // reverse video or a background color still set would
                            // otherwise lend those attributes to the notice.
                            await write(
                                `\u001b[0m\r\n\u001b[33m[Process exited exitCode=${message.exitCode} ` +
                                    `signal=${message.signal ?? "none"}]\u001b[0m\r\n`,
                            );
                            report(
                                `terminal ${terminalId} · process exited`,
                                "exited",
                            );
                            break;
                        case "error":
                            fail(
                                message.message ?? "Screen restoration failed",
                                message.restorable !== false,
                            );
                            break;
                        default:
                            throw new Error("Unknown terminal message");
                    }
                })
                .catch((error: unknown) => {
                    fail(
                        error instanceof Error
                            ? error.message
                            : "Failed to process terminal message",
                    );
                });
        },
        { signal: socketEvents.signal },
    );

    socket.addEventListener(
        "close",
        (event) => {
            if (detached) return;
            term.options.disableStdin = true;
            const reportClose = () => {
                if (!failed && !ended)
                    report(
                        `terminal ${terminalId} · ${event.code === 1013 ? event.reason || "Terminal display fell behind. Reconnect to restore the current screen." : "disconnected"}`,
                        "disconnected",
                    );
            };
            // A clean close may follow an exit frame still queued behind output.
            if (event.wasClean && event.code !== 1013)
                void pending.then(reportClose);
            else reportClose();
        },
        { signal: socketEvents.signal },
    );
    socket.addEventListener(
        "error",
        () => {
            fail("Connection failed", true, "disconnected");
        },
        { signal: socketEvents.signal },
    );

    const input = term.onData((data) => {
        if (
            detached ||
            !restored ||
            ended ||
            failed ||
            socket.readyState !== WebSocket.OPEN
        )
            return;
        if (userInput) socket.send(encoder.encode(data));
        else if (!parsing || respond)
            // Out-of-parser focus/blur notifications retain their old behavior
            // but do not count as user input or take response ownership.
            socket.send(JSON.stringify({ type: "response", data }));
    });
    const binaryInput = term.onBinary((data) => {
        if (
            detached ||
            !restored ||
            ended ||
            failed ||
            socket.readyState !== WebSocket.OPEN
        )
            return;
        socket.send(Uint8Array.from(data, (char) => char.charCodeAt(0)));
    });

    return {
        terminalId,
        get closed() {
            return socket.readyState >= WebSocket.CLOSING;
        },
        focus() {
            if (!detached && restored && !failed && !ended && canFocus())
                term.focus();
        },
        close() {
            if (detached) return;
            // Detach only. There is deliberately no stop/kill call here, and no
            // unload handler either: the browser closes the socket by itself.
            detached = true;
            socketEvents.abort();
            resizeObserver.disconnect();
            window.clearTimeout(resizeTimer);
            core.coreService.triggerDataEvent = trigger;
            core._inputHandler.parse = parse;
            input.dispose();
            binaryInput.dispose();
            socket.close();
            background?.dispose();
            term.dispose();
        },
    };
}
