import { execFile } from "node:child_process";
import { access, stat, chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { afterEach, expect, test, vi } from "vitest";

import { resolveTerminalLaunch } from "@/terminal";

const directories: string[] = [];
async function directory() {
    const path = await mkdtemp(join(tmpdir(), "aiox-launch-"));
    directories.push(path);
    return path;
}
afterEach(async () => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    await Promise.all(
        directories
            .splice(0)
            .map((path) => rm(path, { recursive: true, force: true })),
    );
});

test("rejects a missing executable before launch", async () => {
    await expect(
        resolveTerminalLaunch({ shell: join(await directory(), "missing") }),
    ).rejects.toThrow(/terminal.shell/);
});

test.skipIf(process.platform === "win32")(
    "resolves defaults, relative cwd and PATH against the actual launch directory",
    async () => {
        const cwd = await directory();
        const shell = join(cwd, "test-shell");
        await writeFile(shell, "#!/bin/sh\n");
        await chmod(shell, 0o700);
        vi.stubEnv("PATH", ".");
        vi.stubEnv("SHELL", "test-shell");
        expect(
            await resolveTerminalLaunch({
                cwd: relative(process.cwd(), cwd),
                args: ["-l"],
            }),
        ).toEqual({ file: shell, args: ["-l"], cwd });
    },
);

test.skipIf(process.platform === "win32")(
    "rejects non-executable files, directories and invalid cwd; override chooses the checked cwd",
    async () => {
        const cwd = await directory();
        const file = join(cwd, "plain");
        await writeFile(file, "not executable", { mode: 0o600 });
        for (const shell of [file, cwd]) {
            await expect(resolveTerminalLaunch({ shell })).rejects.toThrow(
                /terminal.shell/,
            );
        }
        for (const invalid of [file, join(cwd, "missing")]) {
            await expect(
                resolveTerminalLaunch({
                    shell: process.execPath,
                    cwd: invalid,
                }),
            ).rejects.toThrow(/terminal.cwd/);
        }
        expect(
            await resolveTerminalLaunch(
                { shell: process.execPath, cwd: "missing" },
                { cwd },
            ),
        ).toEqual({ file: process.execPath, args: [], cwd });
    },
);

test.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "rejects inaccessible cwd and NUL in direct input and environment defaults",
    async () => {
        const cwd = await directory();
        await chmod(cwd, 0o600);
        try {
            await expect(
                resolveTerminalLaunch({ shell: process.execPath, cwd }),
            ).rejects.toThrow(/terminal.cwd/);
        } finally {
            await chmod(cwd, 0o700);
        }
        await expect(
            resolveTerminalLaunch(
                { shell: process.execPath },
                { cwd: "bad\0cwd" },
            ),
        ).rejects.toThrow(/terminal.cwd/);
        vi.stubEnv("SHELL", "");
        await expect(resolveTerminalLaunch()).rejects.toThrow(
            /terminal.shell.*non-empty/,
        );
    },
);

vi.mock("node:child_process", async (importOriginal) => {
    const child = await importOriginal<typeof import("node:child_process")>();
    return { execFile: vi.fn(child.execFile) };
});

vi.mock("node:fs/promises", async (importOriginal) => {
    const fs = await importOriginal<typeof import("node:fs/promises")>();
    return { ...fs, stat: vi.fn(fs.stat), access: vi.fn(fs.access) };
});

test("Windows resolves extensionless PATH shells to the exact executable passed to launch", async () => {
    vi.stubGlobal("process", {
        ...process,
        platform: "win32",
        cwd: () => "C:\\work",
        execPath: "C:\\node\\node.exe",
        env: { PATH: "C:\\tools", SystemRoot: "C:\\Windows" },
    });
    vi.mocked(stat).mockImplementation(async (path) => {
        if (path !== "C:\\tools\\pwsh.exe" && path !== "C:\\work")
            throw new Error("ENOENT");
        return {
            isDirectory: () => path === "C:\\work",
            isFile: () => path === "C:\\tools\\pwsh.exe",
        } as Awaited<ReturnType<typeof stat>>;
    });
    vi.mocked(access).mockResolvedValue();
    vi.mocked(execFile).mockImplementation((...input: unknown[]) => {
        (input.at(-1) as (error: Error | null) => void)(null);
        return {} as ReturnType<typeof execFile>;
    });
    expect(await resolveTerminalLaunch({ shell: "pwsh" })).toEqual({
        file: "C:\\tools\\pwsh.exe",
        args: [],
        cwd: "C:\\work",
    });
    expect(execFile).toHaveBeenCalledWith(
        "C:\\node\\node.exe",
        ["-e", ""],
        expect.objectContaining({ cwd: "C:\\work", timeout: 5000 }),
        expect.any(Function),
    );
    vi.mocked(execFile).mockImplementationOnce((...input: unknown[]) => {
        (input.at(-1) as (error: Error | null) => void)(new Error("EACCES"));
        return {} as ReturnType<typeof execFile>;
    });
    await expect(resolveTerminalLaunch({ shell: "pwsh" })).rejects.toThrow(
        /terminal.cwd.*EACCES/,
    );
    await expect(
        resolveTerminalLaunch({ shell: "C:\\tools\\start.cmd" }),
    ).rejects.toThrow(/terminal.shell/);
});
