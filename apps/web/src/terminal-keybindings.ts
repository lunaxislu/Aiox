import type { AioxConfig } from "@aiox/protocol";
import type { Terminal } from "@xterm/xterm";

import { terminalClipboardAction } from "@/terminal-clipboard";

type Bindings = NonNullable<AioxConfig["terminal"]>["keybindings"];

export function bindTerminalKeys(
    term: Terminal,
    bindings: () => Bindings,
): void {
    const clipboardKeys = new Set<string>();
    term.attachCustomKeyEventHandler((event) => {
        const key = event.code || event.key;
        if (event.type === "keyup" && clipboardKeys.delete(key)) return false;
        if (event.type === "keydown") clipboardKeys.delete(key);
        const clipboard = terminalClipboardAction(event);
        if (
            clipboard === "paste" ||
            // A Cmd chord carries no pty meaning, so it stays browser owned even
            // with nothing selected. Kitty encodes it otherwise and preventDefault
            // then cancels the native copy. Ctrl+C must still reach the pty.
            (clipboard === "copy" && (event.metaKey || term.hasSelection()))
        ) {
            // Match release even if the modifier or selection changed meanwhile.
            if (event.type === "keydown") clipboardKeys.add(key);
            return false;
        }
        const sequence = terminalKeySequence(event, bindings());
        if (sequence === undefined) return true;
        // xterm invokes this handler before its IME keydown path. Use that
        // same path to flush active/pending composition before sending a key.
        const composition = (
            term as unknown as {
                _core: {
                    _compositionHelper: {
                        keydown(event: KeyboardEvent): boolean;
                    };
                };
            }
        )._core._compositionHelper;
        if (!composition.keydown(event)) return false;
        event.preventDefault();
        term.input(sequence, true);
        return false;
    });
}

// Ghostty-style macOS editing. Unlisted keys remain xterm's responsibility.
const macDefaults: Record<string, string> = {
    "Alt+ArrowLeft": "\x1bb",
    "Alt+ArrowRight": "\x1bf",
    "Cmd+ArrowLeft": "\x01",
    "Cmd+ArrowRight": "\x05",
    "Cmd+Backspace": "\x15",
};

/** A null override removes an AIOX binding, restoring xterm's own encoding. */
export function terminalKeySequence(
    event: KeyboardEvent,
    bindings?: Bindings,
    platform = navigator.platform,
): string | undefined {
    if (
        event.type !== "keydown" ||
        event.keyCode === 229 ||
        event.getModifierState("AltGraph")
    )
        return;
    const os = /Mac|iPhone|iPad|iPod/i.test(platform)
        ? "mac"
        : /Win/i.test(platform)
          ? "windows"
          : /Linux/i.test(platform)
            ? "linux"
            : undefined;
    if (!os) return;
    const modifiers = {
        Ctrl: event.ctrlKey,
        Alt: event.altKey,
        Shift: event.shiftKey,
        Cmd: event.metaKey,
    };
    const key = event.key === " " ? "Space" : event.key;
    // Check overrides first so null masks a default; modifier order is immaterial.
    for (const map of [
        bindings?.[os],
        os === "mac" ? macDefaults : undefined,
    ]) {
        for (const [combination, sequence] of Object.entries(map ?? {})) {
            const parts = combination.split("+");
            const candidate = parts.pop()!;
            if (candidate.toLowerCase() !== key.toLowerCase()) continue;
            const boundModifiers = new Set(parts);
            if (
                Object.entries(modifiers).every(
                    ([modifier, pressed]) =>
                        boundModifiers.has(modifier) === pressed,
                )
            )
                return sequence ?? undefined;
        }
    }
}
