import { Terminal } from "@xterm/xterm";
import { afterEach, expect, it, vi } from "vitest";

import {
    bindTerminalClipboard,
    terminalClipboardAction,
} from "@/terminal-clipboard";
import { bindTerminalKeys } from "@/terminal-keybindings";

afterEach(() => vi.restoreAllMocks());

it.each(
    ["MacIntel", "Win32", "Linux x86_64"].flatMap((platform) =>
        [0, 3, 31].map((kittyFlags) => ({ platform, kittyFlags })),
    ),
)(
    "$platform copies selected alternate-screen text with Kitty flags $kittyFlags without PTY input",
    async ({ platform, kittyFlags }) => {
        vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
        const host = document.createElement("div");
        document.body.append(host);
        const term = new Terminal({
            cols: 40,
            vtExtensions: { kittyKeyboard: true },
        });
        term.open(host);
        const clipboard = bindTerminalClipboard(term, host);
        bindTerminalKeys(term, () => ({
            mac: { "Cmd+c": "COPY_OVERRIDE", "Cmd+v": "PASTE_OVERRIDE" },
            windows: { "Ctrl+c": "COPY_OVERRIDE", "Ctrl+v": "PASTE_OVERRIDE" },
            linux: { "Ctrl+c": "COPY_OVERRIDE", "Ctrl+v": "PASTE_OVERRIDE" },
        }));
        const sent: string[] = [];
        term.onData((data) => sent.push(data));
        try {
            await new Promise<void>((resolve) =>
                term.write(
                    `\x1b[?1049h\x1b[>${kittyFlags}u\x1b[?u\x1b[1;31m한글 <>&\x1b[0m\r\nsecond\r\nPRIVATE`,
                    resolve,
                ),
            );
            expect(sent.splice(0)).toEqual([`\x1b[?${kittyFlags}u`]);
            term.select(0, 0, 46);
            const selected = term.getSelection();
            expect(selected).toBe("한글 <>&\nsecond");
            term.textarea!.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: platform === "MacIntel" ? "Meta" : "Control",
                    code: platform === "MacIntel" ? "MetaLeft" : "ControlLeft",
                    keyCode: platform === "MacIntel" ? 91 : 17,
                    metaKey: platform === "MacIntel",
                    ctrlKey: platform !== "MacIntel",
                    bubbles: true,
                    cancelable: true,
                }),
            );
            expect(sent.splice(0)).toEqual(
                kittyFlags === 31
                    ? [
                          platform === "MacIntel"
                              ? "\x1b[57444;9u"
                              : "\x1b[57442;5u",
                      ]
                    : [],
            );
            expect(term.getSelection()).toBe(selected);
            for (const type of ["keydown", "keyup"]) {
                const event = new KeyboardEvent(type, {
                    key: "c",
                    code: "KeyC",
                    keyCode: 67,
                    metaKey: type === "keydown" && platform === "MacIntel",
                    ctrlKey: type === "keydown" && platform !== "MacIntel",
                    bubbles: true,
                    cancelable: true,
                });
                term.textarea!.dispatchEvent(event);
                expect(event.defaultPrevented).toBe(false);
            }
            expect(sent).toEqual([]);
            expect(term.getSelection()).toBe(selected);
            term.textarea!.dispatchEvent(
                new KeyboardEvent("keyup", {
                    key: platform === "MacIntel" ? "Meta" : "Control",
                    code: platform === "MacIntel" ? "MetaLeft" : "ControlLeft",
                    keyCode: platform === "MacIntel" ? 91 : 17,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            expect(sent.splice(0)).toEqual(
                kittyFlags === 31
                    ? [
                          platform === "MacIntel"
                              ? "\x1b[57444;1:3u"
                              : "\x1b[57442;1:3u",
                      ]
                    : [],
            );
            expect(term.getSelection()).toBe(selected);

            // Chrome only dispatches copy once beforecopy is cancelled,
            // because an xterm selection is not a DOM selection.
            const beforeCopy = new ClipboardEvent("beforecopy", {
                bubbles: true,
                cancelable: true,
            });
            term.textarea!.dispatchEvent(beforeCopy);
            expect(beforeCopy.defaultPrevented).toBe(true);

            const data = new DataTransfer();
            const copy = new ClipboardEvent("copy", {
                clipboardData: data,
                bubbles: true,
                cancelable: true,
            });
            term.textarea!.dispatchEvent(copy);
            expect(copy.defaultPrevented).toBe(true);
            expect(data.getData("text/plain")).toBe(selected);
            const html = data.getData("text/html");
            expect(html).toContain("한글 &lt;>&amp;");
            expect(html).toContain("font-weight: bold");
            expect(html).toContain("color:");
            expect(html).toContain("second");
            expect(html).not.toContain("PRIVATE");

            await new Promise<void>((resolve) =>
                term.write("\x1b[?2004h", resolve),
            );
            const pasteKey = (type: string) => {
                const event = new KeyboardEvent(type, {
                    key: "v",
                    code: "KeyV",
                    keyCode: 86,
                    metaKey: type === "keydown" && platform === "MacIntel",
                    ctrlKey: type === "keydown" && platform !== "MacIntel",
                    bubbles: true,
                    cancelable: true,
                });
                term.textarea!.dispatchEvent(event);
                expect(event.defaultPrevented).toBe(false);
            };
            pasteKey("keydown");
            expect(sent).toEqual([]);
            const pasted = new DataTransfer();
            pasted.setData("text/plain", "first\nsecond");
            term.textarea!.dispatchEvent(
                new ClipboardEvent("paste", {
                    clipboardData: pasted,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            pasteKey("keyup");
            expect(sent.splice(0)).toEqual(["\x1b[200~first\rsecond\x1b[201~"]);

            term.clearSelection();
            bindTerminalKeys(term, () => undefined);
            const emptyBeforeCopy = new ClipboardEvent("beforecopy", {
                bubbles: true,
                cancelable: true,
            });
            term.textarea!.dispatchEvent(emptyBeforeCopy);
            expect(emptyBeforeCopy.defaultPrevented).toBe(false);
            const empty = new ClipboardEvent("copy", {
                clipboardData: new DataTransfer(),
                bubbles: true,
                cancelable: true,
            });
            term.textarea!.dispatchEvent(empty);
            expect(empty.defaultPrevented).toBe(false);
            term.textarea!.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: "c",
                    keyCode: 67,
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            expect(sent).toEqual([kittyFlags ? "\x1b[99;5u" : "\x03"]);
        } finally {
            clipboard.dispose();
            term.dispose();
            host.remove();
        }
    },
);

it("recognizes native clipboard virtual keys while leaving composition and other chords alone", () => {
    for (const [keyCode, action] of [
        [67, "copy"],
        [86, "paste"],
    ] as const) {
        const key = { key: "Unidentified", keyCode, metaKey: true };
        expect(
            terminalClipboardAction(
                new KeyboardEvent("keydown", key),
                "MacIntel",
            ),
        ).toBe(action);
        for (const modifier of [
            { altKey: true },
            { shiftKey: true },
            { ctrlKey: true },
            { isComposing: true },
            { keyCode: 229 },
        ]) {
            expect(
                terminalClipboardAction(
                    new KeyboardEvent("keydown", { ...key, ...modifier }),
                    "MacIntel",
                ),
            ).toBeUndefined();
        }
    }
});

it("uploads clipboard images before pasting each path, preserves Markdown, and reports failures", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const term = new Terminal({ vtExtensions: { kittyKeyboard: true } });
    term.open(host);
    let connected = true;
    const notice = vi.fn<(message: string) => void>();
    const clipboard = bindTerminalClipboard(term, host, {
        terminalId: "image-terminal",
        canPaste: () => connected,
        onFailure: notice,
    });
    const sent: string[] = [];
    term.onData((data) => sent.push(data));
    const request = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async () =>
            Response.json(
                { path: "/tmp/clipboard image.png" },
                { status: 201 },
            ),
        );
    const paste = (data: DataTransfer) => {
        const event = new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
        });
        term.textarea!.dispatchEvent(event);
        return event;
    };
    const image = () => {
        const data = new DataTransfer();
        data.items.add(
            new File([new Uint8Array([137, 80, 78, 71])], "clipboard.png", {
                type: "image/png",
            }),
        );
        return data;
    };
    try {
        await new Promise<void>((resolve) =>
            term.write("\x1b[?1049h\x1b[>31u\x1b[?2004h", resolve),
        );
        const markdown = new DataTransfer();
        markdown.setData("text/plain", "# Title\n**bold** `code`");
        paste(markdown);
        expect(sent.splice(0)).toEqual([
            "\x1b[200~# Title\r**bold** `code`\x1b[201~",
        ]);
        markdown.clearData();
        markdown.setData("text/markdown", "- item\n- item two");
        paste(markdown);
        expect(sent.splice(0)).toEqual([
            "\x1b[200~- item\r- item two\x1b[201~",
        ]);
        expect(request).not.toHaveBeenCalled();

        const files = image();
        files.items.add(
            new File(["second"], "second.png", { type: "image/png" }),
        );
        expect(paste(files).defaultPrevented).toBe(true);
        expect(sent).toEqual([]);
        await vi.waitFor(() => expect(sent).toHaveLength(2));
        expect(sent.splice(0)).toEqual([
            "\x1b[200~/tmp/clipboard image.png\x1b[201~",
            "\x1b[200~/tmp/clipboard image.png\x1b[201~",
        ]);
        expect(request).toHaveBeenCalledWith(
            "/api/terminals/image-terminal/images",
            expect.objectContaining({
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    mediaType: "image/png",
                    data: "iVBORw==",
                }),
            }),
        );
        expect(notice).not.toHaveBeenCalled();

        request.mockResolvedValue(
            Response.json({ message: "Disk full" }, { status: 500 }),
        );
        paste(image());
        await vi.waitFor(() =>
            expect(notice).toHaveBeenLastCalledWith("Disk full"),
        );
        expect(sent).toEqual([]);
        request.mockClear();
        connected = false;
        paste(image());
        await vi.waitFor(() =>
            expect(notice).toHaveBeenLastCalledWith(
                "Terminal is not connected.",
            ),
        );
        expect(request).not.toHaveBeenCalled();
    } finally {
        clipboard.dispose();
        term.dispose();
        host.remove();
    }
});

it("does not inject an uploaded image after detach or connection loss", async () => {
    for (const detach of [false, true]) {
        const host = document.createElement("div");
        document.body.append(host);
        const term = new Terminal();
        term.open(host);
        let connected = true;
        let finish!: (response: Response) => void;
        const request = vi.spyOn(globalThis, "fetch").mockImplementation(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        );
        const notice = vi.fn<(message: string) => void>();
        const clipboard = bindTerminalClipboard(term, host, {
            terminalId: "test",
            canPaste: () => connected,
            onFailure: notice,
        });
        const sent: string[] = [];
        term.onData((data) => sent.push(data));
        try {
            const data = new DataTransfer();
            data.items.add(
                new File(["image"], "test.png", { type: "image/png" }),
            );
            term.textarea!.dispatchEvent(
                new ClipboardEvent("paste", {
                    clipboardData: data,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
            if (detach) clipboard.dispose();
            else connected = false;
            finish(Response.json({ path: "/tmp/test.png" }));
            if (detach) {
                await new Promise((resolve) => setTimeout(resolve, 0));
                expect(
                    (request.mock.calls[0]![1]!.signal as AbortSignal).aborted,
                ).toBe(true);
                expect(notice).not.toHaveBeenCalled();
            } else {
                await vi.waitFor(() =>
                    expect(notice).toHaveBeenLastCalledWith(
                        "Terminal disconnected before the image could be pasted.",
                    ),
                );
            }
            expect(sent).toEqual([]);
        } finally {
            clipboard.dispose();
            term.dispose();
            host.remove();
            request.mockRestore();
        }
    }
});

it("keeps ordinary input enabled while an image uploads", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const term = new Terminal();
    term.open(host);
    const sent: string[] = [];
    term.onData((data) => sent.push(data));
    let finish!: (response: Response) => void;
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(
        () =>
            new Promise((resolve) => {
                finish = resolve;
            }),
    );
    const clipboard = bindTerminalClipboard(term, host, {
        terminalId: "test",
        canPaste: () => true,
        onFailure: vi.fn<(message: string) => void>(),
    });
    try {
        await new Promise<void>((resolve) =>
            term.write("\x1b[?2004h", resolve),
        );
        const data = new DataTransfer();
        data.items.add(new File(["image"], "image.png", { type: "image/png" }));
        term.textarea!.dispatchEvent(
            new ClipboardEvent("paste", { clipboardData: data, bubbles: true }),
        );
        expect(term.options.disableStdin).toBe(false);
        term.textarea!.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                bubbles: true,
            }),
        );
        expect(sent).toEqual(["\r"]);
        await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
        finish(Response.json({ path: "/tmp/image.png" }));
        await vi.waitFor(() => expect(sent).toHaveLength(2));
        expect(term.options.disableStdin).toBe(false);
        expect(sent).toEqual(["\r", "\x1b[200~/tmp/image.png\x1b[201~"]);
    } finally {
        clipboard.dispose();
        term.dispose();
        host.remove();
    }
});

it("reports clipboard files that are not images instead of dropping the paste", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const term = new Terminal({ vtExtensions: { kittyKeyboard: true } });
    term.open(host);
    const notice = vi.fn<(message: string) => void>();
    const clipboard = bindTerminalClipboard(term, host, {
        terminalId: "test",
        canPaste: () => true,
        onFailure: notice,
    });
    try {
        const data = new DataTransfer();
        data.items.add(
            new File(["%PDF"], "doc.pdf", { type: "application/pdf" }),
        );
        expect([...data.types]).toContain("Files");
        host.dispatchEvent(
            new ClipboardEvent("paste", {
                clipboardData: data,
                bubbles: true,
                cancelable: true,
            }),
        );
        expect(notice).toHaveBeenCalledWith("Clipboard files were not images.");
    } finally {
        clipboard.dispose();
        term.dispose();
        host.remove();
    }
});
