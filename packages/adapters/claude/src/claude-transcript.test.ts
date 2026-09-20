import { appendFile, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, it, vi } from "vitest";

import { ClaudeTranscript } from "@/claude-transcript";

it("retires after the active read while discarding queued and future reads", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-transcript-retire-"));
    const path = join(directory, "session.jsonl");
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
        release = resolve;
    });
    const consume = vi
        .fn()
        .mockImplementationOnce(() => held)
        .mockResolvedValue(undefined);
    const reader = new ClaudeTranscript(path, consume);
    try {
        await writeFile(path, '{"one":1}\n{"two":2}\n');
        const reading = reader.read();
        await vi.waitFor(() => expect(consume).toHaveBeenCalledOnce());
        await appendFile(path, '{"late":3}\n');
        const queued = reader.read();
        const retiring = reader.retire();
        release();
        await Promise.all([reading, queued, retiring]);
        await reader.read();
        expect(consume.mock.calls).toEqual([[{ one: 1 }], [{ two: 2 }]]);
    } finally {
        release();
        await reader.close();
        await rm(directory, { recursive: true, force: true });
    }
});

it("retires an idle reader without reading its file", async () => {
    const directory = await mkdtemp(
        join(tmpdir(), "aiox-transcript-retire-idle-"),
    );
    const path = join(directory, "session.jsonl");
    const consume = vi.fn().mockResolvedValue(undefined);
    const reader = new ClaudeTranscript(path, consume);
    try {
        await writeFile(path, '{"unread":true}\n');
        await reader.retire();
        await reader.read();
        expect(consume).not.toHaveBeenCalled();
    } finally {
        await reader.close();
        await rm(directory, { recursive: true, force: true });
    }
});

it("captures the starting EOF before later input, including missing and partial files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-transcript-start-"));
    const readers: ClaudeTranscript[] = [];
    try {
        for (const initial of [undefined, '{"old":true}\n', '{"old":']) {
            const path = join(directory, `${readers.length}.jsonl`);
            if (initial !== undefined) await writeFile(path, initial);
            const consume = vi.fn().mockResolvedValue(undefined);
            const reader = await ClaudeTranscript.fromEnd(path, consume);
            readers.push(reader);
            await appendFile(
                path,
                (initial === '{"old":' ? "true}\n" : "") + '{"new":true}\n',
            );
            await reader.read();
            await reader.read();
            expect(consume.mock.calls).toEqual([[{ new: true }]]);
        }
    } finally {
        await Promise.all(readers.map((reader) => reader.close()));
        await rm(directory, { recursive: true, force: true });
    }
});

it("rejects invalid starting files and reads replacement files from zero", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-transcript-replace-"));
    const path = join(directory, "session.jsonl");
    const consume = vi.fn().mockResolvedValue(undefined);
    let reader: ClaudeTranscript | undefined;
    try {
        await expect(
            ClaudeTranscript.fromEnd(directory, consume),
        ).rejects.toThrow();
        await writeFile(path, '{"unfinished":');
        reader = await ClaudeTranscript.fromEnd(path, consume);
        await rename(path, join(directory, "old.jsonl"));
        await writeFile(path, '{"replacement":true}\n');
        await reader.read();
        expect(consume.mock.calls).toEqual([[{ replacement: true }]]);
    } finally {
        await reader?.close();
        await rm(directory, { recursive: true, force: true });
    }
});

it("reads complete UTF-8 rows, retries delivery, follows replacement and closes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-transcript-"));
    const path = join(directory, "session.jsonl");
    const consume = vi.fn().mockResolvedValue(undefined);
    const transcript = new ClaudeTranscript(path, consume);
    try {
        await transcript.read();
        const row = Buffer.from(JSON.stringify({ text: "한글😀" }) + "\n");
        const split = row.indexOf(Buffer.from("😀")) + 2;
        await writeFile(path, row.subarray(0, split));
        await transcript.read();
        expect(consume).not.toHaveBeenCalled();
        await appendFile(path, row.subarray(split));
        consume.mockRejectedValueOnce(new Error("storage"));
        await expect(transcript.read()).rejects.toThrow("storage");
        await transcript.read();
        expect(consume.mock.calls).toEqual([
            [{ text: "한글😀" }],
            [{ text: "한글😀" }],
        ]);
        await transcript.read();
        expect(consume).toHaveBeenCalledTimes(2);
        await rename(path, join(directory, "old.jsonl"));
        await writeFile(path, '{"new":true}\n');
        await transcript.read();
        expect(consume).toHaveBeenLastCalledWith({ new: true });
        await writeFile(path, "{}\n");
        await transcript.read();
        expect(consume).toHaveBeenLastCalledWith({});
        await transcript.close();
        await appendFile(path, '{"late":true}\n');
        await transcript.read();
        expect(consume).not.toHaveBeenCalledWith({ late: true });
    } finally {
        await transcript.close();
        await rm(directory, { recursive: true, force: true });
    }
});

it("serializes duplicate change reads and preserves the byte cursor on same-file relocation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-transcript-move-"));
    const path = join(directory, "a.jsonl");
    const nextPath = join(directory, "b.jsonl");
    const consume = vi.fn().mockResolvedValue(undefined);
    const reader = new ClaudeTranscript(path, consume);
    try {
        await writeFile(path, '{"first":true}\n');
        await Promise.all([reader.read(), reader.read(), reader.read()]);
        expect(consume).toHaveBeenCalledTimes(1);
        await rename(path, nextPath);
        await reader.relocate(nextPath);
        await appendFile(nextPath, '{"second":true}\n');
        await Promise.all([reader.read(), reader.read()]);
        expect(consume.mock.calls).toEqual([
            [{ first: true }],
            [{ second: true }],
        ]);
    } finally {
        await reader.close();
        await rm(directory, { recursive: true, force: true });
    }
});

it("finishes an open-file read across relocation and resumes without replay", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-reading-move-"));
    const before = join(directory, "before.jsonl");
    const after = join(directory, "after.jsonl");
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
        release = resolve;
    });
    const consume = vi
        .fn()
        .mockImplementationOnce(() => held)
        .mockResolvedValue(undefined);
    const reader = new ClaudeTranscript(before, consume);
    try {
        await writeFile(before, '{"one":1}\n{"two":2}\n');
        const first = reader.read();
        await vi.waitFor(() => expect(consume).toHaveBeenCalledOnce());
        await rename(before, after);
        reader.relocate(after);
        await appendFile(after, '{"three":3}\n');
        const next = reader.read();
        release();
        await Promise.all([first, next]);
        expect(consume.mock.calls).toEqual([
            [{ one: 1 }],
            [{ two: 2 }],
            [{ three: 3 }],
        ]);
    } finally {
        release();
        await reader.close();
        await rm(directory, { recursive: true, force: true });
    }
});
