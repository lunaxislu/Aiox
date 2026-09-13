import { appendFile, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, it, vi } from "vitest";

import { ClaudeTranscript } from "@/claude-transcript";

it("reads complete UTF-8 rows, retries delivery, follows replacement and closes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-transcript-"));
    const path = join(directory, "session.jsonl");
    const consume = vi.fn().mockResolvedValue(undefined);
    const transcript = new ClaudeTranscript(path, consume, vi.fn());
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
