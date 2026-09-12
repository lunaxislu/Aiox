import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, expect, test, vi } from "vitest";

import { resolveWslLaunch } from "@/wsl";

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

beforeEach(() => vi.resetAllMocks());

function probeResult(error: Error | null, stdout = "/home/test\0") {
    vi.mocked(execFile).mockImplementationOnce((...input: unknown[]) => {
        const callback = input.at(-1) as (
            error: Error | null,
            stdout: string,
            stderr: string,
        ) => void;
        callback(error, stdout, "");
        return {} as ReturnType<typeof execFile>;
    });
}

test("checks cwd as the selected WSL user and pins that directory without running the configured command", async () => {
    probeResult(null, "/home/test/my folder\0");
    const args = ["-d", "Ubuntu", "-u", "test", "--exec", "bash", "-l"];
    const launch = await resolveWslLaunch(
        "C:\\Windows\\wsl.exe",
        args,
        "/home/test/my folder",
    );
    const call = vi.mocked(execFile).mock.calls[0]!;
    expect(call[1]).toEqual([
        "-d",
        "Ubuntu",
        "-u",
        "test",
        "--exec",
        "/bin/sh",
        "-c",
        expect.any(String),
        "aiox-cwd",
        "/home/test/my folder",
    ]);
    expect(call[2]).toMatchObject({ cwd: process.cwd(), timeout: 10000 });
    expect(launch).toEqual({
        file: "C:\\Windows\\wsl.exe",
        args: ["--cd", "/home/test/my folder", ...args],
        cwd: process.cwd(),
        displayCwd: "/home/test/my folder",
    });
});

test("rejects a failed WSL directory check instead of falling back to a different directory", async () => {
    probeResult(new Error("Permission denied"));
    await expect(
        resolveWslLaunch("wsl.exe", ["-d", "Ubuntu"], "/private"),
    ).rejects.toThrow("terminal.cwd");
});

test("resolves inherited WSL cwd and removes an overridden args cwd", async () => {
    probeResult(null);
    const launch = await resolveWslLaunch(
        "wsl.exe",
        ["--cd", "/old", "-d", "Ubuntu"],
        "/new",
    );
    expect(vi.mocked(execFile).mock.calls[0]![1]?.at(-1)).toBe("/new");
    expect(launch.args).toEqual(["--cd", "/home/test", "-d", "Ubuntu"]);
    probeResult(null);
    await resolveWslLaunch("wsl.exe", []);
    expect(vi.mocked(execFile).mock.calls[1]![1]?.at(-1)).toBe(".");
});

test("does not execute WSL management arguments or accept an unconfirmed probe", async () => {
    await expect(
        resolveWslLaunch("wsl.exe", ["--unregister", "Ubuntu"]),
    ).rejects.toThrow("terminal.args");
    expect(execFile).not.toHaveBeenCalled();
    probeResult(null, "unexpected output");
    await expect(resolveWslLaunch("wsl.exe", [])).rejects.toThrow(
        "terminal.cwd",
    );
});

test.skipIf(process.platform === "win32")(
    "the WSL directory probe handles literal paths and rejects missing directories in a real shell",
    async () => {
        probeResult(null);
        await resolveWslLaunch("wsl.exe", []);
        const script = vi.mocked(execFile).mock.calls[0]![1]![3]!;
        const { execFileSync } =
            await vi.importActual<typeof import("node:child_process")>(
                "node:child_process",
            );
        const directory = await mkdtemp(join(tmpdir(), "aiox cwd $literal "));
        try {
            const resolved = execFileSync(
                "/bin/sh",
                ["-c", script, "aiox-cwd", directory],
                { encoding: "utf8" },
            );
            expect(resolved).toBe(`${directory}\0`);
            expect(
                execFileSync("/bin/sh", ["-c", script, "aiox-cwd", "~"], {
                    encoding: "utf8",
                    env: { ...process.env, HOME: directory },
                }),
            ).toBe(`${directory}\0`);
            expect(() =>
                execFileSync(
                    "/bin/sh",
                    ["-c", script, "aiox-cwd", join(directory, "missing")],
                    { stdio: "pipe" },
                ),
            ).toThrow();
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    },
);
