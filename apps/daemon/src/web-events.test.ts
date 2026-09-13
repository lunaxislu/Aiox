import { EventEmitter } from "node:events";
import type { ServerResponse } from "node:http";

import { expect, it, vi } from "vitest";

import { WebEvents } from "./web-events";

function response() {
    const socket = Object.assign(new EventEmitter(), {
        writeHead: vi.fn(),
        write: vi.fn(() => true),
        destroy: vi.fn(() => {
            socket.emit("close");
            return socket;
        }),
    });
    return socket;
}

it("removes slow, failed and detached SSE viewers while healthy viewers continue", () => {
    const events = new WebEvents();
    const slow = response();
    const failed = response();
    const healthy = response();
    for (const socket of [slow, failed, healthy])
        events.connect(socket as unknown as ServerResponse);
    slow.write.mockReturnValue(false);
    failed.write.mockImplementation(() => {
        throw new Error("transport failed");
    });
    events.notify();
    expect(slow.destroy).toHaveBeenCalledOnce();
    expect(failed.destroy).toHaveBeenCalledOnce();
    events.notify();
    expect(slow.write).toHaveBeenCalledTimes(2);
    expect(failed.write).toHaveBeenCalledTimes(2);
    expect(healthy.write).toHaveBeenCalledTimes(3);
    healthy.emit("close");
    events.notify();
    expect(healthy.write).toHaveBeenCalledTimes(3);
    const final = response();
    events.connect(final as unknown as ServerResponse);
    events.close();
    expect(final.destroy).toHaveBeenCalledOnce();
    events.notify();
    expect(final.write).toHaveBeenCalledOnce();
});
