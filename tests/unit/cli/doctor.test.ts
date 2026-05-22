import { describe, expect, it } from "vitest";

import { createDoctorResult } from "../../../src/cli/doctor.js";

describe("CLI doctor checks", () => {
  it("runs all checks in the locked order", async () => {
    const calls: string[] = [];
    const result = await createDoctorResult({
      socketPath: "/tmp/aiox/daemon.sock",
      processVersion: "v22.4.0",
      commandExists(command) {
        calls.push(command);
        return true;
      },
      socketExists(path) {
        calls.push(`socket:${path}`);
        return true;
      },
      loadSqliteNative() {
        calls.push("sqlite-native");
      },
    });

    expect(calls).toEqual([
      "codex",
      "claude",
      "sqlite-native",
      "socket:/tmp/aiox/daemon.sock",
    ]);
    expect(result).toEqual({
      checks: [
        { name: "node", status: "ok", detail: "v22.4.0" },
        { name: "codex", status: "ok" },
        { name: "claude", status: "ok" },
        { name: "sqlite-native", status: "ok" },
        { name: "daemon socket", status: "ok", detail: "/tmp/aiox/daemon.sock" },
      ],
    });
  });

  it("continues after required failures", async () => {
    const result = await createDoctorResult({
      socketPath: "/tmp/aiox/missing.sock",
      processVersion: "v22.4.0",
      commandExists(command) {
        return false;
      },
      socketExists() {
        return false;
      },
      loadSqliteNative() {
        throw new Error("native module failed");
      },
    });

    expect(result.checks).toEqual([
      { name: "node", status: "ok", detail: "v22.4.0" },
      { name: "codex", status: "error", detail: "not found" },
      { name: "claude", status: "error", detail: "not found" },
      { name: "sqlite-native", status: "error", detail: "native module failed" },
      { name: "daemon socket", status: "error", detail: "not found" },
    ]);
  });
});
