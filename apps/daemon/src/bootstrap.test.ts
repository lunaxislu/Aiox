import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { saveConfig } from "@aiox/config";
import { openDatabase } from "@aiox/persistence";
import { expect, it, vi } from "vitest";

import { boot } from "@/bootstrap";
import { startDaemon } from "@/daemon";

vi.mock("@/daemon", () => ({
    startDaemon: vi.fn(async (options) => {
        await options.onListening?.(options.ports);
        return { closed: new Promise<void>(() => {}) };
    }),
}));
vi.mock("@aiox/persistence", () => ({
    openDatabase: vi.fn(async () => ({ close: vi.fn() })),
}));

it("boot supplies a fresh file-backed terminal configuration for each creation", async () => {
    const home = await mkdtemp(join(tmpdir(), "aiox-config-launch-"));
    try {
        await saveConfig({ terminal: { shell: process.execPath } }, { home });
        await boot({ home });
        const settings = vi.mocked(startDaemon).mock.calls.at(-1)![0].terminal!;
        expect(await settings()).toEqual({ shell: process.execPath });
        await saveConfig(
            { terminal: { shell: process.execPath, args: ["-i"], cwd: home } },
            { home },
        );
        expect(await settings()).toEqual({
            shell: process.execPath,
            args: ["-i"],
            cwd: home,
        });
    } finally {
        await rm(home, { recursive: true, force: true });
    }
});

it("boot consumes the prepared config while future shells still read the current file", async () => {
    const home = await mkdtemp(join(tmpdir(), "aiox-w3-startup-config-"));
    try {
        const config = await saveConfig(
            {
                terminal: { shell: process.execPath },
                messages: { retentionDays: 7 },
            },
            { home },
        );
        await saveConfig(
            {
                ...config,
                ports: { daemon: 4600, web: 4601 },
                terminal: { shell: process.execPath, args: ["-i"] },
                messages: { retentionDays: 99 },
            },
            { home },
        );
        await boot({ home, config });
        const options = vi.mocked(startDaemon).mock.calls.at(-1)![0];
        expect(options.ports).toEqual(config.ports);
        expect(options.retentionDays()).toBe(7);
        expect(await options.terminal!()).toEqual({
            shell: process.execPath,
            args: ["-i"],
        });
    } finally {
        await rm(home, { recursive: true, force: true });
    }
});

it("closes the startup database when writing daemon state fails", async () => {
    const home = await mkdtemp(join(tmpdir(), "aiox-w3-startup-state-"));
    try {
        await saveConfig({ terminal: { shell: process.execPath } }, { home });
        await mkdir(join(home, ".aiox", "daemon.json"));
        await expect(boot({ home })).rejects.toThrow();
        const db = await vi.mocked(openDatabase).mock.results.at(-1)!.value;
        expect(db.close).toHaveBeenCalledOnce();
    } finally {
        await rm(home, { recursive: true, force: true });
    }
});

for (const invalid of ["shell", "missing cwd", "file cwd"] as const) {
    it(`rejects ${invalid} before opening the database or starting the daemon`, async () => {
        const home = await mkdtemp(join(tmpdir(), "aiox-config-reject-"));
        try {
            const missing = join(home, "missing");
            const file = join(home, "file");
            await writeFile(file, "not a directory");
            await saveConfig(
                {
                    terminal:
                        invalid === "shell"
                            ? { shell: missing }
                            : {
                                  shell: process.execPath,
                                  cwd: invalid === "file cwd" ? file : missing,
                              },
                },
                { home },
            );
            vi.mocked(openDatabase).mockClear();
            vi.mocked(startDaemon).mockClear();
            await expect(boot({ home })).rejects.toThrow(
                /terminal\.(shell|cwd)/,
            );
            expect(openDatabase).not.toHaveBeenCalled();
            expect(startDaemon).not.toHaveBeenCalled();
        } finally {
            await rm(home, { recursive: true, force: true });
        }
    });
}
