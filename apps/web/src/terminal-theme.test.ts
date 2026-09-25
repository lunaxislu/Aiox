import { Terminal } from "@xterm/xterm";
import { expect, it } from "vitest";

import { followTerminalBackground } from "./terminal-theme";

const write = (terminal: Terminal, data: string) =>
    new Promise<void>((resolve) => terminal.write(data, resolve));

it.each([undefined, "#445566"])(
    "follows parsed shell background with config %s taking precedence",
    async (background) => {
        const host = document.createElement("div");
        document.body.append(host);
        const terminal = new Terminal({
            theme: background === undefined ? {} : { background },
        });
        terminal.open(host);
        const updates: string[] = [];
        const listener = followTerminalBackground(
            terminal,
            background !== undefined,
            (color) => updates.push(color),
        );
        try {
            const initial = updates.at(-1);
            await write(terminal, "\x1b]11;#123456\x07");
            expect(updates.at(-1)).toBe(background ?? "#123456");
            await write(
                terminal,
                "\x1b]11;?\x07\x1b]11;invalid\x07\x1b]104\x07",
            );
            expect(updates.at(-1)).toBe(background ?? "#123456");
            await write(terminal, "\x1b]10;#ffffff;rgb:aa/bb/cc\x1b\\");
            expect(updates.at(-1)).toBe(background ?? "#aabbcc");
            await write(terminal, "\x1b]111\x07");
            expect(updates.at(-1)).toBe(initial);
            listener.dispose();
            const count = updates.length;
            await write(terminal, "\x1b]11;#abcdef\x07");
            expect(updates).toHaveLength(count);
        } finally {
            listener.dispose();
            terminal.dispose();
            host.remove();
        }
    },
);
