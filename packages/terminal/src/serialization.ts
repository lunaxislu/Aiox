import { SerializeAddon } from "@xterm/addon-serialize";
import type { IBuffer, Terminal } from "@xterm/headless";

import {
    scratchCell,
    terminalCore,
    type AttributesState,
    type BufferRestoreState,
    type CellState,
    type NativeAttributes,
    type NativeBuffer,
    type NativeCell,
    type TerminalRestoreState,
} from "@/restore";

const backgrounds = new WeakMap<Terminal, { value?: string }>();

/** Headless xterm parses OSC colors but has no renderer/theme to retain them. */
export function trackTerminalBackground(terminal: Terminal): void {
    if (backgrounds.has(terminal)) return;
    const background: { value?: string } = {};
    backgrounds.set(terminal, background);
    // xterm 6 parsed color events: SET=1, RESTORE=2, BACKGROUND=257.
    const handler = (
        terminal as unknown as {
            _core: {
                _inputHandler: {
                    onColor(
                        callback: (
                            events: {
                                type: number;
                                index?: number;
                                color?: number[];
                            }[],
                        ) => void,
                    ): unknown;
                };
            };
        }
    )._core._inputHandler;
    handler.onColor((events) => {
        for (const event of events) {
            if (event.index !== 257) continue;
            if (event.type === 1 && event.color)
                background.value = `#${event.color.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
            if (event.type === 2) delete background.value;
        }
    });
}

function attributes(value: NativeAttributes): AttributesState {
    return {
        fg: value.fg,
        bg: value.bg,
        extended: value.extended._ext,
        urlId: value.extended.urlId,
    };
}
function cell(value: NativeCell): CellState {
    return {
        ...attributes(value),
        content: value.content,
        combinedData: value.combinedData,
    };
}
function buffer(
    value: NativeBuffer,
    cols: number,
    scratch: NativeCell,
): BufferRestoreState {
    const hidden: BufferRestoreState["hidden"] = [],
        styled: BufferRestoreState["styled"] = [];
    for (let row = 0; row < value.lines.length; row++) {
        const line = value.lines.get(row);
        if (line.length > cols) {
            const cells: CellState[] = [];
            for (let col = cols; col < line.length; col++)
                cells.push(cell(line.loadCell(col, scratch)));
            hidden.push({ row, cells });
        }
        for (let col = 0; col < Math.min(cols, line.length); col++) {
            const data = line.loadCell(col, scratch);
            if (
                data.hasExtendedAttrs() ||
                data.isProtected() ||
                col + data.getWidth() > cols
            )
                styled.push({ row, col, cell: cell(data) });
        }
    }
    return {
        x: value.x,
        y: value.y,
        savedX: value.savedX,
        savedY: value.savedY,
        baseY: value.ybase,
        savedAttributes: attributes(value.savedCurAttrData),
        savedCharset: value.savedCharset ?? null,
        savedCharsets: Array.from(
            value.savedCharsets,
            (value) => value ?? null,
        ),
        savedGlevel: value.savedGlevel,
        scrollTop: value.scrollTop,
        scrollBottom: value.scrollBottom,
        tabs: Object.keys(value.tabs)
            .filter((k) => value.tabs[Number(k)])
            .map(Number),
        hidden,
        styled,
    };
}

function visibleBuffer(buffer: IBuffer, cols: number): IBuffer {
    const view = Object.create(buffer) as IBuffer;
    view.getLine = (row: number) => {
        const line = buffer.getLine(row);
        if (!line) return undefined;
        return Object.create(line, {
            length: { value: Math.min(cols, line.length) },
            getCell: {
                value: (
                    col: number,
                    target?: Parameters<typeof line.getCell>[1],
                ) => {
                    const value = line.getCell(col, target);
                    return value && col + value.getWidth() > cols
                        ? buffer.getNullCell()
                        : value;
                },
            },
        });
    };
    return view;
}

/** Capture at a completed parsing boundary; restore at the same cols/rows. */
export function serializeTerminal(terminal: Terminal): {
    data: string;
    state: TerminalRestoreState;
} {
    const core = terminalCore(terminal),
        addon = new SerializeAddon(),
        scratch = scratchCell(terminal);
    // Hidden cells travel in metadata, never as bytes that wrap into another row.
    const view = Object.create(terminal) as Terminal;
    Object.defineProperty(view, "buffer", {
        value: {
            normal: visibleBuffer(terminal.buffer.normal, terminal.cols),
            alternate: visibleBuffer(terminal.buffer.alternate, terminal.cols),
            active: terminal.buffer.active,
        },
    });
    addon.activate(
        view as unknown as Parameters<SerializeAddon["activate"]>[0],
    );
    const state: TerminalRestoreState = {
        kittyKeyboard: core.coreService.kittyKeyboard,
        normal: buffer(
            core._bufferService.buffers.normal,
            terminal.cols,
            scratch,
        ),
        alternate: buffer(
            core._bufferService.buffers.alt,
            terminal.cols,
            scratch,
        ),
        links: [],
        attributes: attributes(core._inputHandler._curAttrData),
        charset: {
            active: core._charsetService.charset ?? null,
            level: core._charsetService.glevel,
            sets: Array.from(
                { length: 4 },
                (_, i) => core._charsetService._charsets[i] ?? null,
            ),
        },
        mouseEncoding: core.mouseStateService
            .activeEncoding as TerminalRestoreState["mouseEncoding"],
        cursorHidden: core.coreService.isCursorHidden,
        convertEol: terminal.options.convertEol!,
        cursorBlink: terminal.options.cursorBlink!,
    };
    const ids = new Set([
        state.attributes.urlId,
        state.normal.savedAttributes.urlId,
        state.alternate.savedAttributes.urlId,
    ]);
    for (const value of [state.normal, state.alternate]) {
        for (const patch of value.hidden)
            for (const cell of patch.cells) ids.add(cell.urlId);
        for (const patch of value.styled) ids.add(patch.cell.urlId);
    }
    state.links = [...ids]
        .filter((id) => id !== 0)
        .map((id) => ({
            id,
            data: core._oscLinkService.getLinkData(id) ?? null,
        }));
    const background = backgrounds.get(terminal)?.value;
    const color = background ? `\x1b]11;${background}\x07` : "\x1b]111\x07";
    return { data: color + addon.serialize(), state: structuredClone(state) };
}
