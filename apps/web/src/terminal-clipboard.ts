import {
    apiPath,
    MAX_TERMINAL_IMAGE_BYTES,
    terminalImageResponseSchema,
} from "@aiox/protocol";
import { SerializeAddon } from "@xterm/addon-serialize";
import type { Terminal } from "@xterm/xterm";

export function bindTerminalClipboard(
    term: Terminal,
    host: HTMLElement,
    images?: {
        terminalId: string;
        canPaste(): boolean;
    },
) {
    const serialize = new SerializeAddon();
    term.loadAddon(serialize);
    const uploads = new AbortController();
    let pending = Promise.resolve();
    const copy = (event: ClipboardEvent) => {
        if (!term.hasSelection() || !event.clipboardData) return;
        event.clipboardData.setData("text/plain", term.getSelection());
        event.clipboardData.setData(
            "text/html",
            serialize.serializeAsHTML({ onlySelection: true }),
        );
        event.preventDefault();
    };
    const paste = (event: ClipboardEvent) => {
        const data = event.clipboardData;
        if (!data) return;
        // Read File references during the event; clipboard access expires after it.
        const files = Array.from(data.files).filter((file) =>
            file.type.startsWith("image/"),
        );
        if (!files.length) {
            // Ordinary HTML copies already include plain text. Preserve Markdown
            // verbatim when an application supplies only its Markdown MIME type.
            if (
                !data.types.includes("text/plain") &&
                data.types.includes("text/markdown")
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
                term.paste(data.getData("text/markdown"));
            }
            return;
        }
        if (!images) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        pending = pending.then(async () => {
            if (uploads.signal.aborted) return;
            try {
                if (!images.canPaste())
                    throw new Error("Terminal is not connected.");
                for (const file of files) {
                    if (file.size > MAX_TERMINAL_IMAGE_BYTES)
                        throw new Error("Images must be 10 MiB or smaller.");
                }
                for (const file of files) {
                    const path = await uploadImage(
                        images.terminalId,
                        file,
                        uploads.signal,
                    );
                    if (uploads.signal.aborted) return;
                    if (!images.canPaste())
                        throw new Error(
                            "Terminal disconnected before the image could be pasted.",
                        );
                    term.paste(path);
                }
            } catch (error) {
                if (!uploads.signal.aborted)
                    console.error("Image paste failed", error);
            }
        });
    };
    host.addEventListener("copy", copy);
    // Capture before xterm's textarea listener reads only text/plain.
    host.addEventListener("paste", paste, true);
    return {
        dispose() {
            uploads.abort();
            host.removeEventListener("copy", copy);
            host.removeEventListener("paste", paste, true);
        },
    };
}

async function uploadImage(
    terminalId: string,
    file: File,
    signal: AbortSignal,
): Promise<string> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    signal.throwIfAborted();
    let binary = "";
    for (let start = 0; start < bytes.length; start += 8192)
        binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
    const response = await fetch(apiPath.terminalImage(terminalId), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaType: file.type, data: btoa(binary) }),
        signal,
    });
    const body: unknown = await response.json();
    if (!response.ok) {
        const message =
            body &&
            typeof body === "object" &&
            "message" in body &&
            typeof body.message === "string"
                ? body.message
                : `Upload failed (${response.status}).`;
        throw new Error(message);
    }
    return terminalImageResponseSchema.parse(body).path;
}

/** Leave OS clipboard shortcuts to the browser before xterm encodes them. */
export function terminalClipboardAction(
    event: KeyboardEvent,
    platform = navigator.platform,
): "copy" | "paste" | undefined {
    if (
        event.altKey ||
        event.shiftKey ||
        event.isComposing ||
        event.keyCode === 229
    )
        return;
    const shortcutModifier = /Mac|iPhone|iPad|iPod/i.test(platform)
        ? event.metaKey && !event.ctrlKey
        : event.ctrlKey && !event.metaKey;
    if (!shortcutModifier) return;
    // Browser virtual keys follow native shortcuts without mapping input text.
    const keyCode =
        event.keyCode ||
        (event.key.length === 1 ? event.key.toUpperCase().charCodeAt(0) : 0);
    if (keyCode === 67) return "copy";
    if (keyCode === 86) return "paste";
}
