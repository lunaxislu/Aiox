import { expect, it } from "vitest";

import { sseFrameReader } from "./testing";

it("reads SSE frames across UTF-8 and frame boundaries and retains coalesced frames", async () => {
    const frames = ["event: snapshot\ndata: 한글", "event: state\ndata: {}"];
    const bytes = new TextEncoder().encode(frames.join("\n\n") + "\n\n");
    const reader = new ReadableStream<Uint8Array>({
        start(controller) {
            for (const byte of bytes.slice(0, 25))
                controller.enqueue(Uint8Array.of(byte));
            controller.enqueue(bytes.slice(25));
            controller.close();
        },
    }).getReader();
    const frame = sseFrameReader(reader);
    expect(await frame()).toBe(frames[0]);
    expect(await frame()).toBe(frames[1]);
    await expect(frame()).rejects.toThrow(
        "SSE stream ended before a complete frame",
    );
});
