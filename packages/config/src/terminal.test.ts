import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
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

test("resolves defaults, relative cwd and PATH against the actual launch directory", async () => {
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
});

test("rejects non-executable files, directories and invalid cwd; override chooses the checked cwd", async () => {
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
});

test.skipIf(process.getuid?.() === 0)(
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

test.each(["win32", "freebsd"])(
    "rejects unsupported platform %s before resolving a shell",
    async (platform) => {
        vi.stubGlobal("process", { ...process, platform });
        await expect(
            resolveTerminalLaunch({ shell: process.execPath }),
        ).rejects.toThrow(
            `AIOX supports macOS and Linux only; unsupported platform: ${platform}`,
        );
    },
);
