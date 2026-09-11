import { SerializeAddon } from "@xterm/addon-serialize";
import { Terminal } from "@xterm/headless";
import { afterEach, expect, it, vi } from "vitest";

import { MirrorBoundary } from "./boundary";

const opened: MirrorBoundary[] = [];
const mirrors: Terminal[] = [];
const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const write = (term: Terminal, data: Uint8Array | string): Promise<void> =>
    new Promise((resolve) => term.write(data, resolve));

function terminal(): Terminal {
    const term = new Terminal({ cols: 20, rows: 6, allowProposedApi: true });
    mirrors.push(term);
    return term;
}

function view(term: Terminal): unknown {
    const buffer = term.buffer.active;
    return {
        cols: term.cols,
        rows: term.rows,
        x: buffer.cursorX,
        y: buffer.cursorY,
        lines: Array.from({ length: buffer.length }, (_, i) =>
            buffer.getLine(i)?.translateToString(true),
        ),
    };
}

afterEach(async () => {
    await Promise.all(opened.splice(0).map((boundary) => boundary.dispose()));
    for (const mirror of mirrors.splice(0)) mirror.dispose();
});

it("submits adjacent writes before waiting for vendor parsing, but preserves capture and resize cuts", async () => {
    const mirror = terminal();
    const boundary = new MirrorBoundary(mirror);
    opened.push(boundary);
    const original = mirror.write.bind(mirror);
    const callbacks: Array<() => void> = [];
    const submitted: Uint8Array[] = [];
    vi.spyOn(mirror, "write").mockImplementation((data, callback) => {
        submitted.push(data as Uint8Array);
        callbacks.push(() => original(data, callback));
    });
    let completed = false;
    const first = boundary.write(bytes("A")).then(() => {
        completed = true;
    });
    const second = boundary.write(bytes("B"));
    const cut = boundary.snapshot(view);
    const resized = boundary.resize(10, 4);
    const third = boundary.write(bytes("C"));
    await vi.waitFor(() => expect(submitted).toHaveLength(2));
    expect(completed).toBe(false);
    expect(mirror.cols).toBe(20);
    callbacks.shift()!();
    callbacks.shift()!();
    await Promise.all([first, second, resized]);
    expect((await cut).state).toMatchObject({ cols: 20, x: 2 });
    await vi.waitFor(() => expect(submitted).toHaveLength(3));
    expect(mirror.cols).toBe(10);
    callbacks.shift()!();
    await third;
    expect(mirror.buffer.active.getLine(0)?.translateToString(true)).toBe(
        "ABC",
    );
});

it("restores a partial CSI with an embedded line feed exactly once", async () => {
    const mirror = terminal();
    const boundary = new MirrorBoundary(mirror);
    opened.push(boundary);
    const addon = new SerializeAddon();
    mirror.loadAddon(addon);
    await boundary.write(bytes("A\x1b[3\n"));
    const snapshot = await boundary.snapshot((term) => ({
        cols: term.cols,
        rows: term.rows,
        data: addon.serialize(),
    }));
    expect(mirror.buffer.active.cursorY).toBe(0);
    expect(snapshot.tail).toEqual([{ type: "data", data: bytes("\x1b[3\n") }]);

    const restored = terminal();
    await write(restored, snapshot.state.data);
    for (const event of snapshot.tail) {
        if (event.type === "data") await write(restored, event.data);
    }
    await boundary.write(bytes("\x18B"));
    await write(restored, "\x18B");
    expect(view(restored)).toEqual(view(mirror));
    expect(mirror.buffer.active.cursorY).toBe(1);
});

it("drains queued parsing and capture before disposal closes the mirror", async () => {
    const mirror = terminal();
    const boundary = new MirrorBoundary(mirror);
    opened.push(boundary);
    const dispose = vi.spyOn(mirror, "dispose");
    const first = boundary.write(bytes("A"));
    const second = boundary.write(bytes("B"));
    const capture = boundary.snapshot(view);
    const disposed = boundary.dispose();
    expect(dispose).not.toHaveBeenCalled();
    await expect(boundary.write(bytes("C"))).rejects.toThrow("disposed");
    await Promise.all([first, second, disposed]);
    expect((await capture).state).toMatchObject({
        x: 2,
        lines: ["AB", "", "", "", "", ""],
    });
    expect(dispose).toHaveBeenCalledOnce();
});

it("refuses unsafe snapshots after the byte limit and recovers without losing output", async () => {
    const mirror = terminal();
    const boundary = new MirrorBoundary(mirror, { pendingBytes: 4 });
    opened.push(boundary);
    const direct = terminal();
    const prefix = bytes("A\x1b]0;title");
    await boundary.write(prefix);
    await write(direct, prefix);
    await expect(boundary.snapshot(view)).rejects.toThrow(
        "incomplete output exceeds replay limit",
    );
    await boundary.resize(12, 4);
    direct.resize(12, 4);
    await boundary.write(bytes("more"));
    await write(direct, "more");
    await expect(boundary.snapshot(view)).rejects.toThrow(
        "incomplete output exceeds replay limit",
    );
    await boundary.write(bytes("\x07B"));
    await write(direct, "\x07B");
    const recovered = await boundary.snapshot(view);
    expect(recovered.tail).toEqual([]);
    expect(recovered.state).toEqual(view(direct));
});

it.each(["resize", "write"] as const)(
    "keeps processing after a rejected capture but latches %s failure",
    async (mutation) => {
        const mirror = terminal();
        const boundary = new MirrorBoundary(mirror);
        opened.push(boundary);
        await expect(
            boundary.snapshot(() => {
                throw new Error("capture failed");
            }),
        ).rejects.toThrow("capture failed");
        await boundary.write(bytes("A"));
        expect(
            (await boundary.snapshot((term) => term.buffer.active.cursorX))
                .state,
        ).toBe(1);
        const fail = (): never => {
            throw new Error("mirror failed");
        };
        if (mutation === "resize") {
            vi.spyOn(mirror, "resize").mockImplementationOnce(fail);
            await expect(boundary.resize(10, 4)).rejects.toThrow(
                "mirror failed",
            );
        } else {
            vi.spyOn(mirror, "write").mockImplementationOnce(fail);
            await expect(boundary.write(bytes("B"))).rejects.toThrow(
                "mirror failed",
            );
        }
        await expect(boundary.snapshot(view)).rejects.toThrow("mirror failed");
        const dispose = vi.spyOn(mirror, "dispose");
        await boundary.dispose();
        expect(dispose).toHaveBeenCalledOnce();
        await expect(boundary.write(bytes("B"))).rejects.toThrow("disposed");
    },
);

it("rejects invalid limits and sizes before changing a usable mirror", async () => {
    const mirror = terminal();
    for (const invalid of [
        0,
        -1,
        1.5,
        Infinity,
        NaN,
        Number.MAX_SAFE_INTEGER + 1,
    ]) {
        expect(
            () => new MirrorBoundary(mirror, { pendingBytes: invalid }),
        ).toThrow(RangeError);
        expect(
            () => new MirrorBoundary(mirror, { pendingEvents: invalid }),
        ).toThrow(RangeError);
    }
    const boundary = new MirrorBoundary(mirror);
    opened.push(boundary);
    for (const invalid of [0, -1, 1.5, Infinity, NaN]) {
        await expect(boundary.resize(invalid, 5)).rejects.toThrow(RangeError);
        await expect(boundary.resize(10, invalid)).rejects.toThrow(RangeError);
    }
    await boundary.write(bytes("OK"));
    expect(
        (
            await boundary.snapshot((term) =>
                term.buffer.active.getLine(0)?.translateToString(true),
            )
        ).state,
    ).toBe("OK");
});

it("preserves a split UTF-8 scalar and isolates input and snapshot byte ownership", async () => {
    const mirror = terminal();
    const boundary = new MirrorBoundary(mirror);
    opened.push(boundary);
    const euro = bytes("€");
    const first = euro.slice(0, 1);
    const queued = boundary.write(first);
    first[0] = 65;
    await queued;
    await boundary.write(euro.slice(1, 2));
    const firstView = await boundary.snapshot(view);
    expect(firstView.tail).toEqual([
        { type: "data", data: euro.slice(0, 1) },
        { type: "data", data: euro.slice(1, 2) },
    ]);
    const firstEvent = firstView.tail[0]!;
    if (firstEvent.type === "data") firstEvent.data[0] = 66;
    const secondView = await boundary.snapshot(view);
    expect(secondView.tail[0]).toEqual({
        type: "data",
        data: euro.slice(0, 1),
    });
    await boundary.write(euro.slice(2));
    expect(
        (
            await boundary.snapshot((term) =>
                term.buffer.active.getLine(0)?.translateToString(true),
            )
        ).state,
    ).toBe("€");
});

it("bounds resize events while allowing the exact byte limit and recovers in order", async () => {
    const mirror = terminal();
    const direct = terminal();
    const boundary = new MirrorBoundary(mirror, {
        pendingBytes: 2,
        pendingEvents: 2,
    });
    opened.push(boundary);
    await boundary.write(bytes("A\x1b["));
    await write(direct, "A\x1b[");
    await boundary.resize(10, 5);
    direct.resize(10, 5);
    const before = await boundary.snapshot((term) => [term.cols, term.rows]);
    expect(before.state).toEqual([20, 6]);
    expect(before.tail).toEqual([
        { type: "data", data: bytes("\x1b[") },
        { type: "resize", cols: 10, rows: 5 },
    ]);
    await boundary.resize(8, 4);
    direct.resize(8, 4);
    await expect(boundary.snapshot(view)).rejects.toThrow("replay limit");
    await boundary.write(bytes("2JB"));
    await write(direct, "2JB");
    expect((await boundary.snapshot(view)).state).toEqual(view(direct));
});

it("captures one FIFO boundary and does not reject a large completed sequence", async () => {
    const mirror = terminal();
    const boundary = new MirrorBoundary(mirror, {
        pendingBytes: 2,
        pendingEvents: 2,
    });
    opened.push(boundary);
    const first = boundary.write(bytes("A\x1b]0;" + "x".repeat(200) + "\x07"));
    const resized = boundary.resize(12, 5);
    const snapshot = boundary.snapshot((term) => ({
        cols: term.cols,
        text: term.buffer.active.getLine(0)?.translateToString(true),
    }));
    const later = boundary.write(bytes("B"));
    await Promise.all([first, resized, later]);
    expect(await snapshot).toEqual({
        state: { cols: 12, text: "A" },
        tail: [],
    });
    expect(mirror.buffer.active.getLine(0)?.translateToString(true)).toBe("AB");
});

it.each([
    bytes("A€😀B"),
    bytes("A\x1b[3\n\x18B"),
    bytes("A\x1b]0;title\x1b\\B"),
    bytes("A\x1bP$qm\x1b\\B"),
    Uint8Array.of(65, 0xe2, 0x82, 66, 0xff, 67),
])("replays every byte cut using the vendor parser: %j", async (input) => {
    for (let cut = 0; cut <= input.length; cut++) {
        const mirror = terminal();
        const boundary = new MirrorBoundary(mirror);
        opened.push(boundary);
        const direct = terminal();
        const restored = terminal();
        const addon = new SerializeAddon();
        mirror.loadAddon(addon);
        await boundary.write(input.slice(0, cut));
        await write(direct, input.slice(0, cut));
        await boundary.resize(12, 5);
        direct.resize(12, 5);
        const snapshot = await boundary.snapshot((term) => ({
            cols: term.cols,
            rows: term.rows,
            data: addon.serialize(),
        }));
        restored.resize(snapshot.state.cols, snapshot.state.rows);
        await write(restored, snapshot.state.data);
        for (const event of snapshot.tail) {
            if (event.type === "data") await write(restored, event.data);
            else restored.resize(event.cols, event.rows);
        }
        const remainder = input.slice(cut);
        await boundary.write(remainder);
        await write(direct, remainder);
        await write(restored, remainder);
        expect(view(mirror), `mirror cut ${cut}`).toEqual(view(direct));
        expect(view(restored), `restored cut ${cut}`).toEqual(view(direct));
        await boundary.dispose();
        direct.dispose();
        restored.dispose();
    }
});
