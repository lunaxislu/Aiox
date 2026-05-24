import { mkdtempSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runDaemonProcess } from "../../../src/daemon/run.js";

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
});
