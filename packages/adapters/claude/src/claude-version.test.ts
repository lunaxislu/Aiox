import { execFile } from "node:child_process";

import { afterEach, describe, expect, it, vi } from "vitest";

import { checkClaudeVersion, probeClaude } from "@/claude-version";

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));
afterEach(() => vi.resetAllMocks());

describe("Claude version compatibility", () => {
    it("accepts the installed CLI version suffix", () => {
        expect(checkClaudeVersion("2.1.266 (Claude Code)\n", "darwin")).toBe(
            "2.1.266",
        );
    });

    it("enforces each OS minimum and rejects unknown output or OS", () => {
        for (const platform of ["darwin", "linux", "win32"] as const) {
            const patch = platform === "win32" ? 234 : 224;
            expect(checkClaudeVersion(`2.1.${patch}`, platform)).toBe(
                `2.1.${patch}`,
            );
            expect(() =>
                checkClaudeVersion(`2.1.${patch - 1}`, platform),
            ).toThrow("requires");
            expect(checkClaudeVersion("2.2.0", platform)).toBe("2.2.0");
            expect(checkClaudeVersion("3.0.0", platform)).toBe("3.0.0");
        }
        expect(() => checkClaudeVersion("2.1.266", "freebsd")).toThrow(
            "platform",
        );
        for (const output of [
            "",
            "v2.1.266",
            "2.1.266 secret",
            "2.1.266-beta",
            "1.99.999",
        ])
            expect(() => checkClaudeVersion(output, "darwin")).toThrow();
    });
});

it("probes only --version with the caller environment and bounded execution", async () => {
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        (args[3] as Function)(null, "2.1.266 (Claude Code)\n", "");
        return {} as ReturnType<typeof execFile>;
    });
    const env = { PATH: "/caller/bin", AIOX_MCP_TOKEN: "secret" };
    await expect(
        probeClaude("/caller/bin/claude", env, "/caller/project"),
    ).resolves.toBe("2.1.266");
    expect(execFile).toHaveBeenCalledWith(
        "/caller/bin/claude",
        ["--version"],
        expect.objectContaining({
            env,
            cwd: "/caller/project",
            timeout: 5000,
            maxBuffer: 4096,
            windowsHide: true,
        }),
        expect.any(Function),
    );
});

it("reports installation, timeout and execution failures without child output or secrets", async () => {
    for (const [properties, message] of [
        [{ code: "ENOENT" }, "Claude executable was not found"],
        [{ code: "EACCES" }, "Claude executable permission denied"],
        [{ killed: true }, "Claude version probe timed out"],
        [{ code: 1 }, "Claude version probe failed"],
    ] as const) {
        vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
            (args[3] as Function)(
                Object.assign(new Error("secret argv env"), properties),
                "secret",
                "secret",
            );
            return {} as ReturnType<typeof execFile>;
        });
        await expect(probeClaude()).rejects.toThrow(message);
        await expect(probeClaude()).rejects.not.toThrow("secret");
    }
    vi.mocked(execFile).mockImplementation(() => {
        throw new Error("secret sync failure");
    });
    await expect(probeClaude()).rejects.toThrow("Claude version probe failed");
});
