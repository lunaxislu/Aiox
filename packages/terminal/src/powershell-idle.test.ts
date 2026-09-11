import { stripVTControlCharacters } from "node:util";

import { spawn } from "node-pty";
import { expect, it } from "vitest";

import { preparePowerShell } from "./powershell-idle";

it("leaves unsupported PowerShell launch arguments conservative", async () => {
    const launch = {
        file: "pwsh.exe",
        args: ["-Command", "Start-Sleep 30"],
        env: {},
    };
    const shell = preparePowerShell(launch);
    expect(shell.args).toEqual(launch.args);
    expect(await shell.busy(1)).toBe(true);
    expect(await shell.close(1)).toBe(false);
    await shell.dispose();
});

it.skipIf(process.platform !== "win32")(
    "closes PowerShell with unsubmitted text through its own command loop",
    async () => {
        const shell = preparePowerShell({
            file: "pwsh.exe",
            args: [],
            env: process.env as Record<string, string>,
        });
        const pty = spawn(shell.file, shell.args, {
            env: shell.env,
            cols: 100,
            rows: 30,
        });
        let exited = false;
        let output = "";
        pty.onData((data) => {
            output += data;
        });
        pty.onExit(() => {
            exited = true;
        });
        try {
            await expect
                .poll(() => shell.busy(pty.pid), { timeout: 15_000 })
                .toBe(false);
            pty.write("not a submitted command");
            await expect.poll(() => shell.busy(pty.pid)).toBe(false);
            expect(await shell.close(pty.pid)).toBe(true);
            await expect.poll(() => exited).toBe(true);
        } catch (error) {
            throw new Error(`PowerShell output: ${JSON.stringify(output)}`, {
                cause: error,
            });
        } finally {
            if (!exited) pty.kill();
            await expect.poll(() => exited).toBe(true);
            await shell.dispose();
        }
    },
    25_000,
);

it
    .skipIf(process.platform !== "win32")
    .each([
        "Start-Sleep -Seconds 30",
        "while ($true) {}",
        "Read-Host 'waiting'",
        "Start-ThreadJob { Start-Sleep -Seconds 30 } | Out-Null",
        "Start-Job { Start-Sleep -Seconds 30 } | Out-Null",
    ])(
    "preserves PowerShell work: %s",
    async (command) => {
        const shell = preparePowerShell({
            file: "pwsh.exe",
            args: [],
            env: process.env as Record<string, string>,
        });
        const pty = spawn(shell.file, shell.args, {
            env: shell.env,
            cols: 100,
            rows: 30,
        });
        let output = "";
        let exited = false;
        pty.onData((data) => {
            output += data;
        });
        pty.onExit(() => {
            exited = true;
        });
        try {
            await expect
                .poll(() => shell.busy(pty.pid), { timeout: 15_000 })
                .toBe(false);
            pty.write(`Write-Output 'WORK_STARTED'; ${command}\r`);
            await expect
                .poll(() =>
                    /\nWORK_STARTED\r?\n/.test(
                        stripVTControlCharacters(output),
                    ),
                )
                .toBe(true);
            expect(await shell.busy(pty.pid)).toBe(true);
            expect(await shell.close(pty.pid)).toBe(false);
            expect(exited).toBe(false);
        } catch (error) {
            throw new Error(`PowerShell output: ${JSON.stringify(output)}`, {
                cause: error,
            });
        } finally {
            if (!exited) pty.kill();
            await expect.poll(() => exited).toBe(true);
            await shell.dispose();
        }
    },
    25_000,
);

it.skipIf(process.platform !== "win32")(
    "does not act on an expired close after a foreground command returns",
    async () => {
        const shell = preparePowerShell({
            file: "pwsh.exe",
            args: [],
            env: process.env as Record<string, string>,
        });
        const pty = spawn(shell.file, shell.args, {
            env: shell.env,
            cols: 100,
            rows: 30,
        });
        let output = "";
        let exited = false;
        pty.onData((data) => {
            output += data;
        });
        pty.onExit(() => {
            exited = true;
        });
        try {
            await expect
                .poll(() => shell.busy(pty.pid), { timeout: 15_000 })
                .toBe(false);
            pty.write(
                "Write-Output 'WORK_STARTED'; Start-Sleep -Seconds 4; Write-Output 'WORK_FINISHED'\r",
            );
            await expect
                .poll(() =>
                    /\nWORK_STARTED\r?\n/.test(
                        stripVTControlCharacters(output),
                    ),
                )
                .toBe(true);
            expect(await shell.close(pty.pid)).toBe(false);
            await expect
                .poll(
                    () =>
                        /\nWORK_FINISHED\r?\n/.test(
                            stripVTControlCharacters(output),
                        ),
                    { timeout: 6_000 },
                )
                .toBe(true);
            await expect.poll(() => shell.busy(pty.pid)).toBe(false);
            expect(exited).toBe(false);
        } catch (error) {
            throw new Error(`PowerShell output: ${JSON.stringify(output)}`, {
                cause: error,
            });
        } finally {
            if (!exited) pty.kill();
            await expect.poll(() => exited).toBe(true);
            await shell.dispose();
        }
    },
    25_000,
);
