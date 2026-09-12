import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { saveConfig } from "@aiox/config";
import { openDatabase } from "@aiox/persistence";
import { expect, it, vi } from "vitest";

import { boot } from "@/bootstrap";
import { startDaemon } from "@/daemon";

vi.mock("@/daemon", () => ({
    startDaemon: vi.fn(async () => ({ closed: new Promise<void>(() => {}) })),
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
