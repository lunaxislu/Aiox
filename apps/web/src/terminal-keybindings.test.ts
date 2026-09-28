import { Terminal } from "@xterm/xterm";
import { expect, it, vi } from "vitest";

import { bindTerminalKeys, terminalKeySequence } from "@/terminal-keybindings";

const key = (key: string, modifiers: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent("keydown", {
        key,
        cancelable: true,
        ...modifiers,
    });
    // happy-dom equates AltGraph with Alt; browsers distinguish them.
    vi.spyOn(event, "getModifierState").mockReturnValue(false);
    return event;
};

it("adds only the five macOS editing bindings and leaves xterm input alone", () => {
    for (const [event, sequence] of [
        [key("ArrowLeft", { altKey: true }), "\x1bb"],
        [key("ArrowRight", { altKey: true }), "\x1bf"],
        [key("ArrowLeft", { metaKey: true }), "\x01"],
        [key("ArrowRight", { metaKey: true }), "\x05"],
        [key("Backspace", { metaKey: true }), "\x15"],
    ] as const) {
        expect(terminalKeySequence(event, undefined, "MacIntel")).toBe(
            sequence,
        );
        for (const platform of ["Linux x86_64", "Win32"])
            expect(
                terminalKeySequence(event, undefined, platform),
            ).toBeUndefined();
    }
    for (const event of [
        key("ArrowLeft"),
        key("Enter"),
        key("Tab"),
        key("Escape"),
        key("Delete"),
        key("Backspace", { altKey: true }),
        ...["a", "c", "d", "z", "u", "ArrowLeft"].map((value) =>
            key(value, { ctrlKey: true }),
        ),
        key("c", { metaKey: true }),
        key("v", { metaKey: true }),
        key("ArrowLeft", { altKey: true, shiftKey: true }),
        key("ArrowLeft", { altKey: true, ctrlKey: true }),
        key("ArrowLeft", { altKey: true, isComposing: true, keyCode: 229 }),
        new KeyboardEvent("keyup", { key: "ArrowLeft", altKey: true }),
    ])
        expect(
            terminalKeySequence(event, undefined, "MacIntel"),
        ).toBeUndefined();
});

it.each(["active", "ending"])(
    "sends the final Korean syllable before a mapped key while composition is %s",
    async (phase) => {
        vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
        const host = document.createElement("div");
        document.body.append(host);
        const terminal = new Terminal();
        try {
            terminal.open(host);
            bindTerminalKeys(terminal, () => undefined);
            const sent: string[] = [];
            terminal.onData((data) => sent.push(data));
            const textarea = terminal.textarea!;
            textarea.dispatchEvent(new CompositionEvent("compositionstart"));
            textarea.value = "한";
            textarea.dispatchEvent(
                new CompositionEvent("compositionupdate", { data: "한" }),
            );
            await new Promise((resolve) => setTimeout(resolve, 5));
            // A key still owned by the IME must not commit or execute a binding.
            textarea.dispatchEvent(
                key("ArrowLeft", {
                    keyCode: 229,
                    metaKey: true,
                    isComposing: true,
                }),
            );
            expect(sent).toEqual([]);
            if (phase === "ending")
                textarea.dispatchEvent(
                    new CompositionEvent("compositionend", { data: "한" }),
                );
            textarea.dispatchEvent(
                key("ArrowLeft", {
                    keyCode: 37,
                    metaKey: true,
                    isComposing: phase === "active",
                }),
            );
            expect(sent).toEqual(["한", "\x01"]);
            expect(
                host
                    .querySelector(".composition-view")!
                    .classList.contains("active"),
            ).toBe(false);
            await new Promise((resolve) => setTimeout(resolve, 5));
            expect(sent).toEqual(["한", "\x01"]);
        } finally {
            terminal.dispose();
            host.remove();
            vi.restoreAllMocks();
        }
    },
);

it("applies only the browser platform's overrides, including unbind and reordered modifiers", () => {
    const bindings = {
        mac: {
            "Alt+ArrowLeft": null,
            "Alt+ArrowRight": "\x1b[1;3C",
            "Shift+Ctrl+k": "custom",
        },
        windows: { "Alt+ArrowLeft": "windows" },
        linux: { "Alt+ArrowLeft": "linux" },
    };
    const left = key("ArrowLeft", { altKey: true });
    expect(terminalKeySequence(left, bindings, "MacIntel")).toBeUndefined();
    expect(terminalKeySequence(left, bindings, "Win32")).toBe("windows");
    expect(terminalKeySequence(left, bindings, "Linux x86_64")).toBe("linux");
    expect(terminalKeySequence(left, bindings, "unknown")).toBeUndefined();
    expect(
        terminalKeySequence(
            key("ArrowRight", { altKey: true }),
            bindings,
            "MacIntel",
        ),
    ).toBe("\x1b[1;3C");
    expect(
        terminalKeySequence(
            key("ArrowLeft", { metaKey: true }),
            bindings,
            "MacIntel",
        ),
    ).toBe("\x01");
    expect(
        terminalKeySequence(
            key("K", { ctrlKey: true, shiftKey: true }),
            bindings,
            "MacIntel",
        ),
    ).toBe("custom");
    const altGraph = key("k", { altKey: true, ctrlKey: true });
    vi.mocked(altGraph.getModifierState).mockReturnValue(true);
    expect(
        terminalKeySequence(
            altGraph,
            { linux: { "Ctrl+Alt+k": "custom" } },
            "Linux x86_64",
        ),
    ).toBeUndefined();
});

it.each(["MacIntel", "Win32", "Linux x86_64"])(
    "%s negotiates Shift+Enter encoding and restores legacy input after Kitty pop",
    async (platform) => {
        vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
        const host = document.createElement("div");
        document.body.append(host);
        const terminal = new Terminal({
            vtExtensions: { kittyKeyboard: true },
        });
        try {
            terminal.open(host);
            bindTerminalKeys(terminal, () => undefined);
            const sent: string[] = [];
            terminal.onData((data) => sent.push(data));
            for (const [mode, expected, flags] of [
                ["", "\r", 0],
                ["\x1b[>1u", "\x1b[13;2u", 1],
                ["\x1b[<u", "\r", 0],
            ] as const) {
                await new Promise<void>((resolve) =>
                    terminal.write(`${mode}\x1b[?u`, resolve),
                );
                expect(sent.splice(0)).toEqual([`\x1b[?${flags}u`]);
                terminal.textarea!.dispatchEvent(
                    key("Enter", {
                        keyCode: 13,
                        code: "Enter",
                        shiftKey: true,
                    }),
                );
                expect(sent.splice(0)).toEqual([expected]);
            }
        } finally {
            terminal.dispose();
            host.remove();
            vi.restoreAllMocks();
        }
    },
);

it.each(["active", "ending"])(
    "commits Korean composition once before Kitty Shift+Enter while composition is %s",
    async (phase) => {
        const host = document.createElement("div");
        document.body.append(host);
        const terminal = new Terminal({
            vtExtensions: { kittyKeyboard: true },
        });
        try {
            terminal.open(host);
            bindTerminalKeys(terminal, () => undefined);
            await new Promise<void>((resolve) =>
                terminal.write("\x1b[>1u", resolve),
            );
            const sent: string[] = [];
            terminal.onData((data) => sent.push(data));
            const textarea = terminal.textarea!;
            textarea.dispatchEvent(new CompositionEvent("compositionstart"));
            textarea.value = "한";
            textarea.dispatchEvent(
                new CompositionEvent("compositionupdate", { data: "한" }),
            );
            await new Promise((resolve) => setTimeout(resolve, 5));
            textarea.dispatchEvent(
                key("Enter", {
                    keyCode: 229,
                    shiftKey: true,
                    isComposing: true,
                }),
            );
            expect(sent).toEqual([]);
            if (phase === "ending")
                textarea.dispatchEvent(
                    new CompositionEvent("compositionend", { data: "한" }),
                );
            textarea.dispatchEvent(
                key("Enter", {
                    keyCode: 13,
                    code: "Enter",
                    shiftKey: true,
                    isComposing: phase === "active",
                }),
            );
            expect(sent).toEqual(["한", "\x1b[13;2u"]);
            await new Promise((resolve) => setTimeout(resolve, 5));
            expect(sent).toEqual(["한", "\x1b[13;2u"]);
        } finally {
            terminal.dispose();
            host.remove();
        }
    },
);

it("keeps Cmd+C native with no selection while Ctrl+C still reaches the pty", async () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    const host = document.createElement("div");
    document.body.append(host);
    const terminal = new Terminal({ vtExtensions: { kittyKeyboard: true } });
    try {
        terminal.open(host);
        bindTerminalKeys(terminal, () => undefined);
        const sent: string[] = [];
        terminal.onData((data) => sent.push(data));
        await new Promise<void>((resolve) =>
            terminal.write("\x1b[>1u\x1b[?u", resolve),
        );
        expect(sent.splice(0)).toEqual(["\x1b[?1u"]);
        expect(terminal.hasSelection()).toBe(false);
        // Kitty can encode Cmd+C, and that path calls preventDefault, which
        // would cancel the browser copy the clipboard binding relies on.
        const copy = key("c", { keyCode: 67, code: "KeyC", metaKey: true });
        terminal.textarea!.dispatchEvent(copy);
        expect(sent.splice(0)).toEqual([]);
        expect(copy.defaultPrevented).toBe(false);
        const interrupt = key("c", {
            keyCode: 67,
            code: "KeyC",
            ctrlKey: true,
        });
        terminal.textarea!.dispatchEvent(interrupt);
        expect(sent.splice(0)).toEqual(["\x1b[99;5u"]);
    } finally {
        terminal.dispose();
        host.remove();
        vi.restoreAllMocks();
    }
});
