import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

describe("Codex launcher", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("launches attach TUI as a CLI child with inherited stdio", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { launchCodexTui } = await import("../../../src/adapters/codex/launcher.js");

    expect(
      launchCodexTui({
        endpoint: new URL("ws://127.0.0.1:54321/"),
      }),
    ).toBe(child);
    expect(spawnMock).toHaveBeenCalledWith(
      "codex",
      ["--remote", "ws://127.0.0.1:54321/"],
      {
        stdio: "inherit",
      },
    );
  });

  it("launches resume TUI with codex resume <session-id> --remote <endpoint>", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { launchCodexTui } = await import("../../../src/adapters/codex/launcher.js");

    expect(
      launchCodexTui({
        endpoint: new URL("ws://127.0.0.1:54321/"),
        resumeSessionId: "thread-1",
      }),
    ).toBe(child);
    expect(spawnMock).toHaveBeenCalledWith(
      "codex",
      ["resume", "thread-1", "--remote", "ws://127.0.0.1:54321/"],
      {
        stdio: "inherit",
      },
    );
  });
});

function fakeChild(): ChildProcess {
  return new EventEmitter() as ChildProcess;
}
