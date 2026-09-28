import { Terminal } from "@xterm/headless";
import { describe, expect, it } from "vitest";

import { restoreTerminalState, terminalCore } from "@/restore";
import { serializeTerminal, trackTerminalBackground } from "@/serialization";
async function replay(source: Terminal, target: Terminal) {
    const snapshot = serializeTerminal(source);
    await write(target, snapshot.data);
    restoreTerminalState(target, JSON.parse(JSON.stringify(snapshot.state)));
}

const ESC = "\x1b";
const write = (terminal: Terminal, data: string) =>
    new Promise<void>((resolve) => terminal.write(data, resolve));
const create = () =>
    new Terminal({ cols: 20, rows: 6, scrollback: 5, allowProposedApi: true });
function state(terminal: Terminal) {
    const buffer = terminal.buffer.active;
    return {
        type: buffer.type,
        x: buffer.cursorX,
        y: buffer.cursorY,
        base: buffer.baseY,
        wraps: Array.from(
            { length: buffer.length },
            (_, row) => buffer.getLine(row)!.isWrapped,
        ),
        lines: Array.from({ length: buffer.length }, (_, row) => {
            const line = buffer.getLine(row)!;
            return Array.from({ length: line.length }, (_, col) => {
                const cell = line.getCell(col)!;
                return [
                    cell.getChars(),
                    cell.getWidth(),
                    cell.getFgColor(),
                    cell.getBgColor(),
                    cell.isBold(),
                ];
            });
        }),
    };
}

describe("serializeTerminal", () => {
    it("restores Kitty modes and both buffer stacks before subsequent queries and pops", async () => {
        const source = create(),
            restored = create();
        source.options.vtExtensions = { kittyKeyboard: true };
        restored.options.vtExtensions = { kittyKeyboard: true };
        const responses: string[] = [];
        restored.onData((data) => responses.push(data));
        try {
            await write(
                source,
                `${ESC}[>1u${ESC}[>3u${ESC}[?1049h${ESC}[>5u${ESC}[>7u`,
            );
            await replay(source, restored);
            expect(responses).toEqual([]);
            const invalid = serializeTerminal(source).state;
            invalid.kittyKeyboard.altStack = Array(17).fill(0);
            expect(() => restoreTerminalState(restored, invalid)).toThrow(
                "Invalid terminal snapshot state.",
            );
            await write(
                restored,
                `${ESC}[?u${ESC}[<u${ESC}[?u${ESC}[?1049l${ESC}[?u${ESC}[<u${ESC}[?u${ESC}[<u${ESC}[?u`,
            );
            expect(responses).toEqual([
                `${ESC}[?7u`,
                `${ESC}[?5u`,
                `${ESC}[?3u`,
                `${ESC}[?1u`,
                `${ESC}[?0u`,
            ]);
        } finally {
            source.dispose();
            restored.dispose();
        }
    });
    it("restores the last parsed shell background without replaying queries or invalid colors", async () => {
        const source = create(),
            target = create();
        trackTerminalBackground(source);
        trackTerminalBackground(target);
        try {
            await write(
                source,
                `${ESC}]11;rgb:12/34/56\x07${ESC}]11;?\x07${ESC}]11;invalid\x07${ESC}]104\x07`,
            );
            expect(serializeTerminal(source).data).toMatch(
                /^\x1b\]11;#123456\x07/,
            );
            await replay(source, target);
            expect(serializeTerminal(target).data).toMatch(
                /^\x1b\]11;#123456\x07/,
            );
            await write(source, `${ESC}]10;#ffffff;#abcdef\x07`);
            await replay(source, target);
            expect(serializeTerminal(target).data).toMatch(
                /^\x1b\]11;#abcdef\x07/,
            );
            await write(source, `${ESC}]111\x07`);
            await replay(source, target);
            expect(serializeTerminal(target).data).toMatch(/^\x1b\]111\x07/);
        } finally {
            source.dispose();
            target.dispose();
        }
    });
    it.each(["", `${ESC}[?12l`, `${ESC}[?12l${ESC}[?12h`])(
        "preserves cursor blinking after restoration (%j)",
        async (mode) => {
            const source = create(),
                restored = create();
            source.options.cursorBlink = true;
            restored.options.cursorBlink = true;
            try {
                await write(source, mode + "ABC");
                await replay(source, restored);
                expect(restored.options.cursorBlink).toBe(
                    source.options.cursorBlink,
                );
            } finally {
                source.dispose();
                restored.dispose();
            }
        },
    );
    it.each(["", `${ESC}[20h`, `${ESC}[20h${ESC}[20l`])(
        "preserves newline behavior after restoration (%j)",
        async (mode) => {
            const source = create(),
                restored = create();
            try {
                await write(source, mode + "ABC");
                await replay(source, restored);
                await write(source, "\nZ");
                await write(restored, "\nZ");
                expect(state(restored)).toEqual(state(source));
                expect(restored.options.convertEol).toBe(
                    source.options.convertEol,
                );
            } finally {
                source.dispose();
                restored.dispose();
            }
        },
    );
    it("rejects trimmed replay history before applying absolute saved cursor and styled link rows", async () => {
        const source = create();
        const restored = new Terminal({
            cols: 20,
            rows: 6,
            scrollback: 1,
            allowProposedApi: true,
        });
        try {
            await write(source, "line\r\n".repeat(9));
            await write(
                source,
                `${ESC}[1;2H${ESC}7${ESC}[1;1H${ESC}[4:3m${ESC}]8;;https://example.test/history${ESC}\\X${ESC}]8;;${ESC}\\${ESC}[H`,
            );
            const snapshot = serializeTerminal(source);
            await write(restored, snapshot.data);
            expect(source.buffer.normal.baseY).toBe(4);
            expect(restored.buffer.normal.baseY).toBe(1);
            expect(snapshot.state.normal.savedY).toBe(4);
            expect(
                snapshot.state.normal.styled.some(
                    (patch) => patch.row === 4 && patch.cell.urlId > 0,
                ),
            ).toBe(true);
            const before = serializeTerminal(restored).state;
            expect(() =>
                restoreTerminalState(restored, snapshot.state),
            ).toThrow("Invalid terminal snapshot state");
            expect(serializeTerminal(restored).state).toEqual(before);
        } finally {
            source.dispose();
            restored.dispose();
        }
    });
    it("accepts a different scrollback capacity when replay retains the same history", async () => {
        const source = create();
        const restored = new Terminal({
            cols: 20,
            rows: 6,
            scrollback: 20,
            allowProposedApi: true,
        });
        try {
            await write(
                source,
                "line\r\n".repeat(9) + `${ESC}[2;3H${ESC}7${ESC}[Hstatus`,
            );
            await replay(source, restored);
            await write(source, `${ESC}8NEXT`);
            await write(restored, `${ESC}8NEXT`);
            expect(state(restored)).toEqual(state(source));
        } finally {
            source.dispose();
            restored.dispose();
        }
    });
    it("restores the saved cursor separately from the displayed cursor", async () => {
        const source = create();
        const restored = create();
        try {
            await write(source, `${ESC}[3;5H${ESC}7${ESC}[Hstatus`);
            await replay(source, restored);
            await write(source, `${ESC}8NEXT`);
            await write(restored, `${ESC}8NEXT`);
            expect(state(restored)).toEqual(state(source));
        } finally {
            source.dispose();
            restored.dispose();
        }
    });
    it("preserves saved attributes and charset while leaving current drawing state intact", async () => {
        const source = create();
        const restored = create();
        try {
            await write(
                source,
                `${ESC}[3;5H${ESC}[1;38;2;10;20;30;44m${ESC}(0${ESC}7${ESC}[0m${ESC}(B${ESC}[Hstatus`,
            );
            await replay(source, restored);
            await write(source, `NOW${ESC}8q`);
            await write(restored, `NOW${ESC}8q`);
            expect(state(restored)).toEqual(state(source));
        } finally {
            source.dispose();
            restored.dispose();
        }
    });

    it.each([
        [
            "history followed by grow",
            `${ESC}[1;3H${ESC}7` + "\r\nx".repeat(8),
            `${ESC}8X`,
            undefined,
            [20, 12],
        ],
        [
            "alternate saved row removed by resize",
            `${ESC}[?1049h${ESC}[5;15H${ESC}7${ESC}[Hstatus`,
            `${ESC}8X`,
            [10, 4],
            [10, 6],
        ],
        [
            "saved row removed by resize",
            `${ESC}[5;15H${ESC}7${ESC}[Hstatus`,
            `${ESC}8X`,
            [10, 4],
            [10, 6],
        ],
        [
            "trim after save",
            `${ESC}[3;5H${ESC}7` + "\r\nline".repeat(20),
            `${ESC}8X`,
            undefined,
            undefined,
        ],
        [
            "alternate saved cursor",
            `${ESC}[2;2H${ESC}[?1049h${ESC}[4;7H${ESC}7${ESC}[Hstatus`,
            `${ESC}8X`,
            undefined,
            undefined,
        ],
        [
            "normal saved differs from alternate entry",
            `${ESC}[2;2H${ESC}7${ESC}[4;5H${ESC}[?47h${ESC}[Halt`,
            `${ESC}[?47l${ESC}8X`,
            undefined,
            undefined,
        ],
        [
            "saved pending wrap",
            `12345678901234567890${ESC}7${ESC}[Htop`,
            `${ESC}8X`,
            undefined,
            [30, 6],
        ],
    ] as const)(
        "preserves %s",
        async (_name, prefix, after, beforeSize, afterSize) => {
            const source = create(),
                restored = create();
            try {
                await write(source, prefix);
                if (beforeSize) source.resize(beforeSize[0], beforeSize[1]);
                restored.resize(source.cols, source.rows);
                await replay(source, restored);
                if (afterSize) {
                    source.resize(afterSize[0], afterSize[1]);
                    restored.resize(afterSize[0], afterSize[1]);
                }
                await write(source, after);
                await write(restored, after);
                expect(state(restored)).toEqual(state(source));
            } finally {
                source.dispose();
                restored.dispose();
            }
        },
    );
    it("restores margins, tab stops and the current character sets before subsequent output", async () => {
        const source = create(),
            restored = create();
        try {
            await write(
                source,
                `${ESC}[3g${ESC}[4G${ESC}H${ESC}[2;5r${ESC}[4;1H${ESC})K\x0e`,
            );
            await replay(source, restored);
            const after = `\t@\n\nEND`;
            await write(source, after);
            await write(restored, after);
            expect(state(restored)).toEqual(state(source));
        } finally {
            source.dispose();
            restored.dispose();
        }
    });

    it.each(["12345678901234567890", "123456789012345678한"])(
        "preserves pending wrap after %s",
        async (prefix) => {
            const source = create(),
                restored = create();
            try {
                await write(source, prefix);
                await replay(source, restored);
                await write(source, "X");
                await write(restored, "X");
                expect(state(restored)).toEqual(state(source));
            } finally {
                source.dispose();
                restored.dispose();
            }
        },
    );

    it.each([
        `${ESC}[?1003h${ESC}[?1006h${ESC}[?25l`,
        `${ESC}[?1003h${ESC}[?1016h${ESC}[?25l`,
        `${ESC}[?1003h${ESC}[?1006h${ESC}[?1016h${ESC}[?1006l`,
        `${ESC}[?25l${ESC}[!p`,
        `${ESC}[?1006h${ESC}c`,
    ])(
        "preserves active mouse encoding and cursor visibility for %j",
        async (prefix) => {
            const source = create(),
                restored = create();
            const modes = (t: Terminal) => {
                const core = (
                    t as unknown as {
                        _core: {
                            mouseStateService: { activeEncoding: string };
                            coreService: { isCursorHidden: boolean };
                        };
                    }
                )._core;
                return {
                    modes: t.modes,
                    encoding: core.mouseStateService.activeEncoding,
                    hidden: core.coreService.isCursorHidden,
                };
            };
            try {
                await write(source, prefix);
                await replay(source, restored);
                expect(modes(restored)).toEqual(modes(source));
            } finally {
                source.dispose();
                restored.dispose();
            }
        },
    );

    it("preserves the restored active charset independently of its designated G set", async () => {
        const source = create(),
            restored = create();
        try {
            await write(source, `${ESC}(0${ESC}7${ESC}(B${ESC}8`);
            await replay(source, restored);
            await write(source, `q\x0fq`);
            await write(restored, `q\x0fq`);
            expect(state(restored)).toEqual(state(source));
        } finally {
            source.dispose();
            restored.dispose();
        }
    });

    it("preserves tab stops outside a temporarily narrowed viewport", async () => {
        const source = create(),
            restored = create();
        try {
            await write(source, `${ESC}[3g${ESC}[16G${ESC}H${ESC}[H`);
            source.resize(10, 6);
            restored.resize(10, 6);
            await replay(source, restored);
            source.resize(20, 6);
            restored.resize(20, 6);
            await write(source, "\t\tX");
            await write(restored, "\t\tX");
            expect(state(restored)).toEqual(state(source));
        } finally {
            source.dispose();
            restored.dispose();
        }
    });
    it.each(["12345678901234567890", "123456789한끝"])(
        "preserves alternate cells hidden by a temporary width reduction: %s",
        async (text) => {
            const source = create(),
                restored = create();
            try {
                await write(source, `${ESC}[?1049h${text}${ESC}[H`);
                source.resize(10, 6);
                restored.resize(10, 6);
                await replay(source, restored);
                source.resize(20, 6);
                restored.resize(20, 6);
                expect(
                    restored.buffer.active.getLine(0)!.translateToString(true),
                ).toBe(
                    source.buffer.active.getLine(0)!.translateToString(true),
                );
                expect(state(restored)).toEqual(state(source));
            } finally {
                source.dispose();
                restored.dispose();
            }
        },
    );

    it("preserves an inactive alternate saved cursor across the next alternate entry", async () => {
        const source = create(),
            restored = create();
        try {
            await write(
                source,
                `${ESC}[?47h${ESC}[4;7H${ESC}7${ESC}[?47l${ESC}[Hnormal`,
            );
            await replay(source, restored);
            await write(source, `${ESC}[?47h${ESC}8X`);
            await write(restored, `${ESC}[?47h${ESC}8X`);
            expect(state(restored)).toEqual(state(source));
        } finally {
            source.dispose();
            restored.dispose();
        }
    });
    it("restores extended underline, protected cells and hyperlink targets without reusing source ids", async () => {
        const source = create(),
            restored = create();
        const metadata = (t: Terminal) => {
            const core = terminalCore(t),
                b = core._bufferService.buffers.normal,
                scratch = b.getNullCell();
            return Array.from({ length: 6 }, (_, i) => {
                const c = b.lines.get(0).loadCell(i, scratch);
                return {
                    ext: c.hasExtendedAttrs() ? c.extended.ext : 0,
                    protected: c.isProtected(),
                    link: core._oscLinkService.getLinkData(
                        c.hasExtendedAttrs() ? c.extended.urlId : 0,
                    ),
                };
            });
        };
        try {
            await write(
                source,
                `${ESC}[4:3;58:2::12:34:56m${ESC}[1"qA${ESC}[0"q${ESC}[0m${ESC}]8;id=one;https://example.test/one${ESC}\\B${ESC}]8;;${ESC}\\${ESC}]8;id=two;https://example.test/two${ESC}\\C`,
            );
            await replay(source, restored);
            const after = `D${ESC}]8;;${ESC}\\EF`;
            await write(source, after);
            await write(restored, after);
            expect(state(restored)).toEqual(state(source));
            expect(metadata(restored)).toEqual(metadata(source));
        } finally {
            source.dispose();
            restored.dispose();
        }
    });

    it("rejects malformed restoration metadata before changing the parsed terminal", async () => {
        const source = create(),
            restored = create();
        try {
            await write(source, `${ESC}[?1006h${ESC}[3;4Hhello`);
            const sourceBefore = state(source);
            const snapshot = serializeTerminal(source);
            expect(state(source)).toEqual(sourceBefore);
            await write(restored, snapshot.data);
            const before = state(restored);
            const invalid = structuredClone(snapshot.state);
            invalid.normal.hidden = [{ row: 99999, cells: [] }];
            expect(() => restoreTerminalState(restored, invalid)).toThrow(
                "Invalid terminal snapshot state",
            );
            expect(state(restored)).toEqual(before);
            expect(() =>
                restoreTerminalState(restored, {
                    ...snapshot.state,
                    attributes: { fg: NaN },
                }),
            ).toThrow("Invalid terminal snapshot state");
            expect(state(restored)).toEqual(before);
            for (const field of ["convertEol", "cursorBlink"] as const) {
                for (const value of [undefined, "true", 1]) {
                    expect(() =>
                        restoreTerminalState(restored, {
                            ...snapshot.state,
                            [field]: value,
                        }),
                    ).toThrow("Invalid terminal snapshot state");
                    expect(state(restored)).toEqual(before);
                }
            }
            restoreTerminalState(restored, snapshot.state);
            snapshot.state.normal.tabs.push(3);
            snapshot.state.charset.sets[0] = { q: "broken" };
            expect(
                terminalCore(restored)._bufferService.buffers.normal.tabs[3],
            ).not.toBe(true);
            expect(
                terminalCore(restored)._charsetService._charsets[0],
            ).toBeUndefined();
        } finally {
            source.dispose();
            restored.dispose();
        }
    });
    it("keeps a current hyperlink alive at the restored cursor when older history is cleared", async () => {
        const source = create(),
            restored = create();
        const link = (t: Terminal) => {
            const core = terminalCore(t),
                b = core._bufferService.buffers.normal;
            const c = b.lines.get(b.y).loadCell(0, b.getNullCell());
            return core._oscLinkService.getLinkData(c.extended.urlId);
        };
        try {
            await write(
                source,
                `${ESC}[?6h${ESC}[3;1H${ESC}]8;;https://example.test/current${ESC}\\`,
            );
            await replay(source, restored);
            const after = `${ESC}[2S${ESC}[3JX`;
            await write(source, after);
            await write(restored, after);
            expect(link(source)).toEqual({
                uri: "https://example.test/current",
            });
            expect(link(restored)).toEqual(link(source));
        } finally {
            source.dispose();
            restored.dispose();
        }
    });
    it("erases to blank cells on both sides after a snapshot", async () => {
        const source = create(),
            restored = create();
        const screen = (t: Terminal) =>
            Array.from({ length: t.rows }, (_, row) =>
                t.buffer.active
                    .getLine(t.buffer.active.viewportY + row)!
                    .translateToString(true),
            ).join("");
        try {
            // A TUI frame over a filled shell screen: each buffer ends on a row that
            // reaches the right edge, and a hyperlink cell adds a styled patch. Those
            // are the cells capture and restore load into, and every buffer keeps its
            // own null cell.
            const full = "12345678901234567890";
            await write(
                source,
                `${full}\r\n`.repeat(6) +
                    `${ESC}[?1049h${ESC}[6;1H${ESC}]8;;https://example.test/tui${ESC}\\${full}${ESC}]8;;${ESC}\\`,
            );
            await replay(source, restored);
            const erase = `${ESC}[2J${ESC}[H`;
            for (const terminal of [source, restored]) {
                await write(terminal, erase);
                expect(screen(terminal)).toBe("");
                await write(terminal, `${ESC}[?1049l${erase}`);
                expect(screen(terminal)).toBe("");
            }
        } finally {
            source.dispose();
            restored.dispose();
        }
    });
});
