import { execFileSync } from "node:child_process";

import { describe, expect, it, vi } from "vitest";

import {
  buildCmuxSurfaceCommandText,
  createCmuxHostAdapter,
} from "../../../src/host/cmux-host-adapter.js";

describe("CmuxHostAdapter", () => {
  it("detects a cmux workspace without requiring a socket override and ignores embedded Ghostty identity", () => {
    const cmux = createCmuxHostAdapter({
      env: {
        CMUX_WORKSPACE_ID: "workspace-id",
        TERM_PROGRAM: "ghostty",
        TERM_PROGRAM_VERSION: "1.3.0-HEAD+bc9be90",
      },
    });
    const ghosttyOnly = createCmuxHostAdapter({
      env: {
        TERM_PROGRAM: "ghostty",
        TERM_PROGRAM_VERSION: "1.3.0-HEAD+bc9be90",
      },
    });

    expect(cmux.detect({ cwd: "/repo" })).toBe(true);
    expect(ghosttyOnly.detect({ cwd: "/repo" })).toBe(false);
  });

  it("checks the cmux executable during static preflight and returns a concrete failure", async () => {
    const successRunner = vi.fn(async () => ({ stdout: "cmux 0.62.2\n", stderr: "" }));
    const failureRunner = vi.fn(async () => {
      throw new Error("spawn cmux ENOENT");
    });
    const success = createCmuxHostAdapter({ runCommand: successRunner });
    const failure = createCmuxHostAdapter({ runCommand: failureRunner });

    await expect(success.staticPreflight({ cwd: "/repo" })).resolves.toEqual({ ok: true });
    expect(successRunner).toHaveBeenCalledWith("cmux", ["version"]);
    await expect(failure.staticPreflight({ cwd: "/repo" })).resolves.toEqual({
      ok: false,
      reason: "cmux executable is unavailable: spawn cmux ENOENT",
    });
  });

  it("fails static preflight when the installed cmux lacks a required pane/input command", async () => {
    const runner = vi.fn(async (_command: string, args: readonly string[]) => {
      if (args[0] === "send") {
        throw new Error("unknown command send");
      }
      return { stdout: "OK\n", stderr: "" };
    });
    const adapter = createCmuxHostAdapter({ runCommand: runner });

    await expect(adapter.staticPreflight({ cwd: "/repo" })).resolves.toEqual({
      ok: false,
      reason: "cmux required CLI capability is unavailable (send): unknown command send",
    });
    expect(runner.mock.calls).toEqual([
      ["cmux", ["version"]],
      ["cmux", ["new-pane", "--help"]],
      ["cmux", ["send", "--help"]],
    ]);
  });

  it("checks socket reachability and resolves an explicit current workspace during dynamic preflight", async () => {
    const successRunner = vi.fn(async (_command: string, args: readonly string[]) => ({
      stdout: args[0] === "current-workspace" ? "workspace:7\n" : "pong\n",
      stderr: "",
    }));
    const failureRunner = vi.fn(async () => {
      throw new Error("socket refused");
    });
    const success = createCmuxHostAdapter({ runCommand: successRunner });
    const failure = createCmuxHostAdapter({ runCommand: failureRunner });

    await expect(
      success.dynamicPreflight({ hostName: "demo", cwd: "/repo" }),
    ).resolves.toEqual({ ok: true });
    expect(successRunner.mock.calls).toEqual([
      ["cmux", ["ping"]],
      ["cmux", ["current-workspace"]],
    ]);
    await expect(
      failure.dynamicPreflight({ hostName: "demo", cwd: "/repo" }),
    ).resolves.toEqual({
      ok: false,
      reason: "cmux current workspace is unavailable: socket refused",
    });
  });

  it("creates a right terminal pane in the preflighted workspace and parses its surface ref", async () => {
    const runner = vi.fn(async (_command: string, args: readonly string[]) => ({
      stdout:
        args[0] === "current-workspace"
          ? "workspace:7\n"
          : args[0] === "new-pane"
            ? "OK surface:9 pane:4 workspace:7\n"
            : "pong\n",
      stderr: "",
    }));
    const adapter = createCmuxHostAdapter({ runCommand: runner });
    await adapter.dynamicPreflight({ hostName: "demo", cwd: "/repo" });

    await expect(
      adapter.createSurfaceAndStart({
        hostId: "host-1",
        hostName: "demo",
        agentName: "reviewer",
        agentKind: "codex",
        cwd: "/repo",
        command: "aiox",
        args: ["codex", "--name", "reviewer", "--host-id", "host-1"],
        env: {},
      }),
    ).resolves.toBeUndefined();
    expect(runner).toHaveBeenNthCalledWith(3, "cmux", [
      "new-pane",
      "--type",
      "terminal",
      "--direction",
      "right",
      "--workspace",
      "workspace:7",
    ]);
  });

  it("shell-encodes cwd, env, command and args across cmux escape-sensitive text", () => {
    const special = "literal \\n and \\t; $(printf injected)\nline 2 'quoted' 한글🙂";
    const commandText = buildCmuxSurfaceCommandText({
      cwd: process.cwd(),
      env: { SPECIAL: special },
      command: "/bin/zsh",
      args: ["-c", "printf '%s' \"$SPECIAL\""],
    });

    expect(commandText).not.toContain(special);
    expect(commandText).not.toContain("\\n");
    expect(commandText).not.toContain("\\r");
    expect(commandText).not.toContain("\\t");
    expect(execFileSync("/bin/zsh", ["-c", commandText], { encoding: "utf8" })).toBe(special);
  });

  it("clears only a TTY immediately before launch without changing non-TTY output", () => {
    const commandText = buildCmuxSurfaceCommandText({
      cwd: process.cwd(),
      env: {},
      command: "/bin/zsh",
      args: ["-c", "printf visible-output"],
    });
    const ttyClear = "if [ -t 1 ]; then clear || :; fi;";

    expect(commandText).toContain(ttyClear);
    expect(commandText.indexOf(ttyClear)).toBeLessThan(commandText.lastIndexOf("env "));
    expect(execFileSync("/bin/zsh", ["-c", commandText], { encoding: "utf8" })).toBe(
      "visible-output",
    );
  });

  it("sends the command text and Enter to the returned surface in order", async () => {
    const runner = vi.fn(async (_command: string, args: readonly string[]) => ({
      stdout:
        args[0] === "current-workspace"
          ? "workspace:7\n"
          : args[0] === "new-pane"
            ? "OK surface:9 pane:4 workspace:7\n"
            : "OK\n",
      stderr: "",
    }));
    const adapter = createCmuxHostAdapter({ runCommand: runner });
    await adapter.dynamicPreflight({ hostName: "demo", cwd: "/repo" });

    await adapter.createSurfaceAndStart({
      hostId: "host-1",
      hostName: "demo",
      agentName: "reviewer",
      agentKind: "codex",
      cwd: "/repo with spaces",
      command: "aiox",
      args: ["codex", "--name", "reviewer"],
      env: { AIOX_TEST: "value" },
    });

    const commandText = buildCmuxSurfaceCommandText({
      cwd: "/repo with spaces",
      command: "aiox",
      args: ["codex", "--name", "reviewer"],
      env: { AIOX_TEST: "value" },
    });
    expect(runner.mock.calls.slice(3)).toEqual([
      [
        "cmux",
        [
          "send",
          "--workspace",
          "workspace:7",
          "--surface",
          "surface:9",
          commandText,
        ],
      ],
      [
        "cmux",
        ["send-key", "--workspace", "workspace:7", "--surface", "surface:9", "enter"],
      ],
    ]);
  });

  it.each(["new-pane", "send", "send-key"])(
    "propagates %s failure without closing the created surface",
    async (failingCommand) => {
      const runner = vi.fn(async (_command: string, args: readonly string[]) => {
        if (args[0] === failingCommand) {
          throw new Error(`${failingCommand} failed`);
        }
        return {
          stdout:
            args[0] === "current-workspace"
              ? "workspace:7\n"
              : args[0] === "new-pane"
                ? "OK surface:9 pane:4 workspace:7\n"
                : "OK\n",
          stderr: "",
        };
      });
      const adapter = createCmuxHostAdapter({ runCommand: runner });
      await adapter.dynamicPreflight({ hostName: "demo", cwd: "/repo" });

      await expect(
        adapter.createSurfaceAndStart({
          hostId: "host-1",
          hostName: "demo",
          agentName: "reviewer",
          agentKind: "codex",
          cwd: "/repo",
          command: "aiox",
          args: ["codex", "--name", "reviewer"],
          env: {},
        }),
      ).rejects.toThrow(`cmux ${failingCommand} failed: ${failingCommand} failed`);
      expect(runner.mock.calls.some(([, args]) => args[0] === "close-surface")).toBe(false);
    },
  );
});
