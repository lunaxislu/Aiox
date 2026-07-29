import { mkdtempSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/core/public-ids.js", () => ({
  createPublicMessageId: vi.fn(() => "opaque run default message"),
  createPublicDeliveryId: vi.fn(() => "opaque run default delivery"),
}));

import { createPublicDeliveryId } from "../../../src/core/public-ids.js";
import { runDaemonProcess } from "../../../src/daemon/run.js";
import { canConnect, createDaemonSocketClient } from "../../../src/daemon/socket-transport.js";

describe("runDaemonProcess", () => {
  it("rejects when the daemon socket server cannot start", async () => {
    const socketPath = join(
      mkdtempSync("/private/tmp/aiox-run-"),
      "missing-parent",
      "daemon.sock",
    );

    const result = await Promise.race([
      runDaemonProcess(socketPath).then(
        () => "resolved",
        (error: unknown) => error,
      ),
      new Promise<"pending">((resolve) => {
        setTimeout(() => resolve("pending"), 100);
      }),
    ]);

    expect(result).toBeInstanceOf(Error);
  });

  it("uses the core public delivery default through the production daemon entrypoint", async () => {
    vi.mocked(createPublicDeliveryId).mockReset();
    vi.mocked(createPublicDeliveryId).mockReturnValue("opaque run default delivery");
    const socketPath = join(mkdtempSync("/private/tmp/aiox-run-"), "daemon.sock");
    const daemon = runDaemonProcess(socketPath);
    await waitForSocket(socketPath);
    const api = createDaemonSocketClient({ socketPath });

    try {
      await api.attachAgent({ kind: "claude", name: "source", cwd: "/repo" });
      await api.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
      await api.connect({ sourceName: "source", targetNames: ["target"] });
      const result = await api.sendMessage({
        sourceName: "source",
        messageId: "source-issued",
        type: "question",
        content: "hello",
      });

      if (!result.ok) throw new Error("expected accepted message");
      expect(createPublicDeliveryId).toHaveBeenCalledOnce();
      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries[0]?.id).toBe("opaque run default delivery");
    } finally {
      await api.stop({});
      api.close();
      await daemon;
    }
  });
});

async function waitForSocket(socketPath: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await canConnect(socketPath)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`daemon did not listen at ${socketPath}`);
}
