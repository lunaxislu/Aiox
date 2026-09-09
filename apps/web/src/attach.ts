import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

/**
 * One browser attachment to one server owned PTY.
 *
 * Wire protocol (see the daemon's `/ws/terminal/:id` handler):
 *   server → client  binary = raw pty output bytes
 *   server → client  text   = JSON, currently only the exit event
 *   client → server  binary = raw input bytes
 *   client → server  text   = JSON `{ type: "resize", cols, rows }`
 *
 * Detaching closes the socket and nothing else. The pty keeps running, which is
 * what makes re-selecting the same terminal show replay plus live output.
 */

export type Attachment = {
    readonly terminalId: string;
    readonly closed: boolean;
    close(): void;
};

type ServerMessage = {
    type?: string;
    exitCode?: number;
    signal?: number | null;
};

const encoder = new TextEncoder();
const RESIZE_DEBOUNCE_MS = 120;

export function attachTerminal(
    host: HTMLElement,
    terminalId: string,
    onState: (text: string) => void,
): Attachment {
    host.replaceChildren();

    const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        scrollback: 5_000,
        theme: { background: "#101214" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    fit.fit();

    const socket = new WebSocket(
        `ws://${location.host}/ws/terminal/${terminalId}`,
    );
    socket.binaryType = "arraybuffer";

    // A closed socket fires its close event after the next attachment is
    // already reporting "connected", so a detached attachment goes quiet.
    let detached = false;
    const report = (text: string): void => {
        if (!detached) onState(text);
    };

    const sendResize = (): void => {
        if (socket.readyState !== WebSocket.OPEN) return;
        socket.send(
            JSON.stringify({
                type: "resize",
                cols: term.cols,
                rows: term.rows,
            }),
        );
    };

    let resizeTimer: number | undefined;
    const onWindowResize = (): void => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            fit.fit();
            sendResize();
        }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", onWindowResize);

    socket.addEventListener("open", () => {
        report(`terminal ${terminalId} · 연결됨`);
        fit.fit();
        sendResize();
        term.focus();
    });

    socket.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
            const message = JSON.parse(event.data) as ServerMessage;
            if (message.type !== "exit") return;
            term.write(
                `\r\n\u001b[33m[프로세스 종료 exitCode=${message.exitCode} ` +
                    `signal=${message.signal ?? "none"}]\u001b[0m\r\n`,
            );
            return;
        }
        term.write(new Uint8Array(event.data as ArrayBuffer));
    });

    socket.addEventListener("close", () => {
        report(`terminal ${terminalId} · 연결 끊김`);
    });
    socket.addEventListener("error", () => {
        report(`terminal ${terminalId} · 연결 실패`);
    });

    const input = term.onData((data) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        socket.send(encoder.encode(data));
    });

    return {
        terminalId,
        get closed() {
            return socket.readyState >= WebSocket.CLOSING;
        },
        close() {
            // Detach only. There is deliberately no stop/kill call here, and no
            // unload handler either: the browser closes the socket by itself.
            detached = true;
            window.removeEventListener("resize", onWindowResize);
            window.clearTimeout(resizeTimer);
            input.dispose();
            socket.close();
            term.dispose();
        },
    };
}
