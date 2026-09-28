/** xterm 6.1 state omitted by addon-serialize 0.14.0. No parser or input queue is copied. */
type KittyKeyboardState = {
    flags: number;
    mainFlags: number;
    altFlags: number;
    mainStack: number[];
    altStack: number[];
};
export type AttributesState = {
    fg: number;
    bg: number;
    extended: number;
    urlId: number;
};
type Charset = Record<string, string> | null;
type NativeCharset = Record<string, string> | undefined;
type LinkData = { uri: string; id?: string };
export type CellState = AttributesState & {
    content: number;
    combinedData: string;
};
export type BufferRestoreState = {
    baseY: number;
    x: number;
    y: number;
    savedX: number;
    savedY: number;
    savedAttributes: AttributesState;
    savedCharset: Charset;
    savedCharsets: Charset[];
    savedGlevel: number;
    scrollTop: number;
    scrollBottom: number;
    tabs: number[];
    hidden: { row: number; cells: CellState[] }[];
    styled: { row: number; col: number; cell: CellState }[];
};
export type TerminalRestoreState = {
    kittyKeyboard: KittyKeyboardState;
    normal: BufferRestoreState;
    alternate: BufferRestoreState;
    links: { id: number; data: LinkData | null }[];
    attributes: AttributesState;
    charset: { active: Charset; level: number; sets: Charset[] };
    mouseEncoding: "DEFAULT" | "SGR" | "SGR_PIXELS";
    cursorHidden: boolean;
    convertEol: boolean;
    cursorBlink: boolean;
};

export type NativeAttributes = {
    fg: number;
    bg: number;
    extended: {
        ext: number;
        _ext: number;
        urlId: number;
        clone(): NativeAttributes["extended"];
    };
};
export type NativeCell = NativeAttributes & {
    content: number;
    combinedData: string;
    hasExtendedAttrs(): number;
    getWidth(): number;
    isProtected(): number;
};
type NativeLine = {
    length: number;
    loadCell(col: number, cell: NativeCell): NativeCell;
    setCell(col: number, cell: NativeCell): void;
    resize(cols: number, cell: NativeCell): boolean;
};
export type NativeBuffer = {
    ybase: number;
    x: number;
    y: number;
    savedX: number;
    savedY: number;
    savedCurAttrData: NativeAttributes;
    savedCharset: NativeCharset;
    savedCharsets: NativeCharset[];
    savedGlevel: number;
    scrollTop: number;
    scrollBottom: number;
    tabs: Record<number, boolean>;
    lines: { length: number; get(row: number): NativeLine };
    getNullCell(): NativeCell;
};
export type TerminalCore = {
    _bufferService: {
        buffers: {
            normal: NativeBuffer;
            alt: NativeBuffer;
            _activeBuffer: NativeBuffer;
        };
    };
    _oscLinkService: {
        _nextId: number;
        getLinkData(id: number): LinkData | undefined;
        registerLink(data: LinkData): number;
        addLineToLink(id: number, row: number): void;
    };
    _inputHandler: { _curAttrData: NativeAttributes };
    _charsetService: {
        charset: NativeCharset;
        glevel: number;
        _charsets: NativeCharset[];
    };
    mouseStateService: { activeEncoding: string };
    coreService: { isCursorHidden: boolean; kittyKeyboard: KittyKeyboardState };
};
export type RestoreTarget = {
    cols: number;
    rows: number;
    options: { convertEol?: boolean; cursorBlink?: boolean };
    buffer: { normal: { getNullCell(): unknown } };
    refresh?(start: number, end: number): void;
};
export function terminalCore(terminal: RestoreTarget): TerminalCore {
    return (terminal as RestoreTarget & { _core: TerminalCore })._core;
}
/**
 * A scratch cell to load/store patches through. The public buffer API returns a
 * fresh cell per call; the internal `NativeBuffer.getNullCell()` returns the one
 * shared instance xterm fills erased cells from and resets attributes but not
 * content, so writing to that one leaks a character into every later erase.
 */
export function scratchCell(terminal: RestoreTarget): NativeCell {
    return terminal.buffer.normal.getNullCell() as NativeCell;
}

function applyAttributes(
    target: NativeAttributes,
    state: AttributesState,
): void {
    target.fg = state.fg;
    target.bg = state.bg;
    target.extended = target.extended.clone();
    target.extended.ext = state.extended;
    target.extended.urlId = state.urlId;
}
function cell(target: NativeCell, state: CellState): NativeCell {
    applyAttributes(target, state);
    target.content = state.content;
    target.combinedData = state.combinedData;
    return target;
}
function applyBuffer(
    target: NativeBuffer,
    state: BufferRestoreState,
    cols: number,
    core: TerminalCore,
    scratch: NativeCell,
): void {
    target.x = state.x;
    target.y = state.y;
    target.savedX = state.savedX;
    target.savedY = state.savedY;
    applyAttributes(target.savedCurAttrData, state.savedAttributes);
    target.savedCharset = state.savedCharset ?? undefined;
    target.savedCharsets = state.savedCharsets.map(
        (value) => value ?? undefined,
    );
    target.savedGlevel = state.savedGlevel;
    target.scrollTop = state.scrollTop;
    target.scrollBottom = state.scrollBottom;
    target.tabs = Object.fromEntries(state.tabs.map((col) => [col, true]));
    for (const patch of state.hidden) {
        const line = target.lines.get(patch.row);
        // Shared null cell on purpose here: resize only reads it as blank fill.
        line.resize(cols + patch.cells.length, target.getNullCell());
        patch.cells.forEach((value, index) => {
            line.setCell(cols + index, cell(scratch, value));
            if (value.urlId)
                core._oscLinkService.addLineToLink(value.urlId, patch.row);
        });
    }
    for (const patch of state.styled) {
        target.lines
            .get(patch.row)
            .setCell(patch.col, cell(scratch, patch.cell));
        if (patch.cell.urlId)
            core._oscLinkService.addLineToLink(patch.cell.urlId, patch.row);
    }
}

/** Apply only after snapshot bytes have finished parsing, before tail/live events. */
export function restoreTerminalState(
    terminal: RestoreTarget,
    input: unknown,
): void {
    const state = validateState(terminal, input);
    const core = terminalCore(terminal);
    const activeBuffer = core._bufferService.buffers._activeBuffer;
    const activeState =
        activeBuffer === core._bufferService.buffers.normal
            ? state.normal
            : state.alternate;
    activeBuffer.x = activeState.x;
    activeBuffer.y = activeState.y;
    const links = new Map(
        state.links.map((link) => [
            link.id,
            link.data
                ? core._oscLinkService.registerLink(link.data)
                : core._oscLinkService._nextId++,
        ]),
    );
    const remap = (value: AttributesState) => {
        if (value.urlId) value.urlId = links.get(value.urlId)!;
    };
    remap(state.attributes);
    const buffers = core._bufferService.buffers,
        active = buffers._activeBuffer,
        scratch = scratchCell(terminal);
    try {
        for (const [target, value] of [
            [buffers.normal, state.normal],
            [buffers.alt, state.alternate],
        ] as const) {
            remap(value.savedAttributes);
            for (const patch of value.hidden)
                for (const cell of patch.cells) remap(cell);
            for (const patch of value.styled) remap(patch.cell);
            buffers._activeBuffer = target;
            applyBuffer(target, value, terminal.cols, core, scratch);
        }
    } finally {
        buffers._activeBuffer = active;
    }
    applyAttributes(core._inputHandler._curAttrData, state.attributes);
    core._charsetService.charset = state.charset.active ?? undefined;
    core._charsetService.glevel = state.charset.level;
    core._charsetService._charsets = state.charset.sets.map(
        (value) => value ?? undefined,
    );
    core.mouseStateService.activeEncoding = state.mouseEncoding;
    core.coreService.isCursorHidden = state.cursorHidden;
    core.coreService.kittyKeyboard = state.kittyKeyboard;
    terminal.options.convertEol = state.convertEol;
    terminal.options.cursorBlink = state.cursorBlink;
    terminal.refresh?.(0, terminal.rows - 1);
}

function validateState(
    terminal: RestoreTarget,
    input: unknown,
): TerminalRestoreState {
    const fail = () => {
        throw new Error("Invalid terminal snapshot state.");
    };
    const object = (value: unknown): value is Record<string, unknown> =>
        value !== null && typeof value === "object" && !Array.isArray(value);
    const integer = (value: unknown) =>
        typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
    const word = (value: unknown) =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= -2147483648 &&
        value <= 4294967295;
    const kitty = (value: unknown): boolean =>
        object(value) &&
        [value.flags, value.mainFlags, value.altFlags].every(word) &&
        [value.mainStack, value.altStack].every(
            (stack) =>
                Array.isArray(stack) && stack.length <= 16 && stack.every(word),
        );
    const attrs = (value: unknown): boolean =>
        object(value) &&
        [value.fg, value.bg, value.extended].every(word) &&
        integer(value.urlId);
    const charset = (value: unknown): boolean =>
        value === null ||
        (object(value) &&
            Object.entries(value).every(
                ([key, v]) => key.length === 1 && typeof v === "string",
            ));
    const cell = (value: unknown): boolean =>
        attrs(value) &&
        object(value) &&
        integer(value.content) &&
        Number(value.content) <= 4294967295 &&
        typeof value.combinedData === "string";
    const core = terminalCore(terminal);
    const buffer = (value: unknown, target: NativeBuffer): boolean =>
        object(value) &&
        // Saved cursor and cell/link patches use absolute buffer row indices.
        // A replay trimmed to different history cannot safely reuse them.
        value.baseY === target.ybase &&
        [
            value.x,
            value.y,
            value.savedX,
            value.savedY,
            value.scrollTop,
            value.scrollBottom,
        ].every(integer) &&
        Number(value.x) <= terminal.cols &&
        Number(value.y) < terminal.rows &&
        Number(value.scrollTop) <= Number(value.scrollBottom) &&
        Number(value.scrollBottom) < terminal.rows &&
        attrs(value.savedAttributes) &&
        charset(value.savedCharset) &&
        Array.isArray(value.savedCharsets) &&
        value.savedCharsets.length <= 4 &&
        value.savedCharsets.every(charset) &&
        integer(value.savedGlevel) &&
        Number(value.savedGlevel) <= 3 &&
        Array.isArray(value.tabs) &&
        value.tabs.every(integer) &&
        Array.isArray(value.hidden) &&
        value.hidden.every(
            (p) =>
                object(p) &&
                integer(p.row) &&
                Number(p.row) < target.lines.length &&
                Array.isArray(p.cells) &&
                p.cells.every(cell),
        ) &&
        Array.isArray(value.styled) &&
        value.styled.every(
            (p) =>
                object(p) &&
                integer(p.row) &&
                Number(p.row) < target.lines.length &&
                integer(p.col) &&
                Number(p.col) < terminal.cols &&
                cell(p.cell),
        );
    if (
        !object(input) ||
        !kitty(input.kittyKeyboard) ||
        !buffer(input.normal, core._bufferService.buffers.normal) ||
        !buffer(input.alternate, core._bufferService.buffers.alt) ||
        !Array.isArray(input.links) ||
        !input.links.every(
            (link) =>
                object(link) &&
                integer(link.id) &&
                (link.data === null ||
                    (object(link.data) &&
                        typeof link.data.uri === "string" &&
                        (link.data.id === undefined ||
                            typeof link.data.id === "string"))),
        ) ||
        !attrs(input.attributes) ||
        !object(input.charset) ||
        !charset(input.charset.active) ||
        !integer(input.charset.level) ||
        Number(input.charset.level) > 3 ||
        !Array.isArray(input.charset.sets) ||
        input.charset.sets.length !== 4 ||
        !input.charset.sets.every(charset) ||
        !["DEFAULT", "SGR", "SGR_PIXELS"].includes(
            String(input.mouseEncoding),
        ) ||
        typeof input.cursorHidden !== "boolean" ||
        typeof input.convertEol !== "boolean" ||
        typeof input.cursorBlink !== "boolean"
    )
        fail();
    const state = input as TerminalRestoreState;
    const ids = new Set(state.links.map((link) => link.id));
    const linked = (value: AttributesState) =>
        value.urlId === 0 || ids.has(value.urlId);
    if (
        ids.size !== state.links.length ||
        !linked(state.attributes) ||
        ![state.normal, state.alternate].every(
            (value) =>
                linked(value.savedAttributes) &&
                value.hidden.every((p) => p.cells.every(linked)) &&
                value.styled.every((p) => linked(p.cell)),
        )
    )
        fail();
    // Copy validated JSON data: callers cannot mutate the applied terminal state afterwards.
    return structuredClone(state);
}
