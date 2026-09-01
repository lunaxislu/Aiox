import { describe, expect, it } from "vitest";

import { composeInstructions, mapAgentTypeToKind } from "../../../src/cli/host.js";
import type { AioxAgentConfig } from "../../../src/config/aiox-config.js";

/**
 * `src/cli/host.ts` was reduced to just these two pure helpers when the
 * pre-HostController `runHost()`/view-driver path was deleted (W6 Stage 6).
 * The 1,700-line `tests/unit/cli/host.test.ts` that covered them (among
 * everything else) was deleted along with `runHost()` and is not restored --
 * this small file recovers only the `composeInstructions`/`mapAgentTypeToKind`
 * regression coverage (Stage 6 revision 14 correction, Blocker 2).
 */

describe("composeInstructions", () => {
  it("returns undefined when neither global nor per-agent is given", () => {
    expect(composeInstructions(undefined, undefined)).toBeUndefined();
  });

  it("returns the global text unchanged when only global is given", () => {
    expect(composeInstructions("be helpful", undefined)).toBe("be helpful");
  });

  it("returns the per-agent text unchanged when only per-agent is given", () => {
    expect(composeInstructions(undefined, "focus on tests")).toBe("focus on tests");
  });

  it("joins global then per-agent with a plain double newline when both are given", () => {
    expect(composeInstructions("be helpful", "focus on tests")).toBe(
      "be helpful\n\nfocus on tests",
    );
  });

  it("treats a whitespace-only global as unspecified", () => {
    expect(composeInstructions("   \n  ", "focus on tests")).toBe("focus on tests");
  });

  it("treats a whitespace-only per-agent as unspecified", () => {
    expect(composeInstructions("be helpful", "   ")).toBe("be helpful");
  });

  it("returns undefined when both are whitespace-only", () => {
    expect(composeInstructions("  ", "\n")).toBeUndefined();
  });

  it("preserves multiline text, quotes, and special characters verbatim", () => {
    const global = 'line one\nline "two"\n$pecial `chars`';
    const perAgent = "agent's own\nnotes";
    expect(composeInstructions(global, perAgent)).toBe(`${global}\n\n${perAgent}`);
  });
});

describe("mapAgentTypeToKind", () => {
  it("maps codex to codex", () => {
    expect(mapAgentTypeToKind("codex")).toBe("codex");
  });

  it("maps claude-code to claude", () => {
    expect(mapAgentTypeToKind("claude-code")).toBe("claude");
  });

  it("throws on an unsupported agent type", () => {
    const unsupported = "gemini" as unknown as AioxAgentConfig["type"];
    expect(() => mapAgentTypeToKind(unsupported)).toThrow(/unsupported agent type/);
  });
});
