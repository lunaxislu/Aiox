import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
    mkdtempSync,
    existsSync,
    rmSync,
    readFileSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

import { spawn } from "node-pty";
import { it } from "vitest";

const exec = promisify(execFile);
it.skipIf(process.platform !== "win32")(
    "demonstrates a stale cmd prompt while a builtin is still waiting",
    async () => {
        const folder = mkdtempSync(join(tmpdir(), "aiox-cmd-idle-"));
        const results: unknown[] = [];

        async function until(label: string, predicate: () => boolean) {
            const deadline = Date.now() + 10000;
            while (!predicate()) {
                if (Date.now() > deadline)
                    throw new Error(`Timed out: ${label}`);
                await sleep(20);
            }
        }

        async function consoleMode(pid: number) {
            const destination = join(folder, `mode-${pid}-${Date.now()}.json`);
            const script = join(folder, "console-mode.ps1");
            writeFileSync(
                script,
                `param([int]$TargetPid, [string]$Destination)
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class ProbeConsole {
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool FreeConsole();
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AttachConsole(uint pid);
 [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern IntPtr CreateFile(string path,uint access,uint share,IntPtr sec,uint creation,uint flags,IntPtr template);
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool GetConsoleMode(IntPtr handle, out uint mode);
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool CloseHandle(IntPtr handle);
}
'@
[ProbeConsole]::FreeConsole() | Out-Null
$children=@(Get-CimInstance Win32_Process -Filter "ParentProcessId = $TargetPid")
$attached=[ProbeConsole]::AttachConsole($TargetPid)
$errorCode=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
[uint32]$mode=0
$handle=[IntPtr]::Zero
$queried=$false
if ($attached) {
 $handle=[ProbeConsole]::CreateFile('CONIN$',2147483648,3,[IntPtr]::Zero,3,0,[IntPtr]::Zero)
 $queried=[ProbeConsole]::GetConsoleMode($handle,[ref]$mode)
 $errorCode=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
}
@{attached=$attached;queried=$queried;mode=$mode;errorCode=$errorCode;childCount=$children.Count} | ConvertTo-Json -Compress | Set-Content -LiteralPath $Destination
if ($handle -ne [IntPtr]::Zero) { [ProbeConsole]::CloseHandle($handle) | Out-Null }
[ProbeConsole]::FreeConsole() | Out-Null
`,
            );
            await exec(
                "powershell.exe",
                [
                    "-NoLogo",
                    "-NoProfile",
                    "-NonInteractive",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    script,
                    "-TargetPid",
                    String(pid),
                    "-Destination",
                    destination,
                ],
                { timeout: 15000 },
            );
            return JSON.parse(
                readFileSync(destination, "utf8").replace(/^\uFEFF/, ""),
            );
        }

        try {
            for (const [label, builtin, resume] of [
                ["pause", "pause", "x"],
                ["set-p", "set /p AIOX_PROBE_VALUE=READING:", "value\r"],
            ] as const) {
                const marker = `AIOX_CMD_${label}_${Date.now()}>`;
                const ready = join(folder, `${label}-ready`);
                const released = join(folder, `${label}-released`);
                const shell = spawn(
                    process.env.COMSPEC ?? "cmd.exe",
                    ["/D", "/Q"],
                    {
                        env: Object.fromEntries(
                            Object.entries({
                                ...process.env,
                                PROMPT: marker,
                            }).filter(
                                (entry): entry is [string, string] =>
                                    entry[1] !== undefined,
                            ),
                        ),
                        cols: 100,
                        rows: 30,
                    },
                );
                let output = "";
                let markerTail = "";
                let heuristicIdle = false;
                let exited = false;
                shell.onData((data) => {
                    output += data;
                    if ((markerTail + data).includes(marker))
                        heuristicIdle = true;
                    markerTail = (markerTail + data).slice(
                        -(marker.length - 1),
                    );
                });
                shell.onExit(() => {
                    exited = true;
                });
                const send = (data: string) => {
                    heuristicIdle = false;
                    shell.write(data);
                };
                try {
                    await until("initial prompt", () =>
                        output.includes(marker),
                    );
                    const idleMode = await consoleMode(shell.pid);
                    shell.pause();
                    send(`echo READY>"${ready}"\r`);
                    await until("first command executed", () =>
                        existsSync(ready),
                    );
                    await sleep(100);
                    send(`${builtin} & echo RELEASED>"${released}"\r`);
                    await sleep(100);
                    assert.equal(
                        existsSync(released),
                        false,
                        "builtin must still be waiting",
                    );
                    output = "";
                    shell.resume();
                    await until("queued old prompt delivered", () =>
                        output.includes(marker),
                    );
                    await sleep(100);
                    assert.equal(
                        heuristicIdle,
                        true,
                        "the delayed prompt incorrectly clears input dirty",
                    );
                    assert.equal(
                        existsSync(released),
                        false,
                        "command is still running despite idle observation",
                    );
                    const busyMode = await consoleMode(shell.pid);
                    assert.equal(
                        busyMode.childCount,
                        0,
                        "the waiting builtin has no child processes",
                    );
                    results.push({
                        label,
                        stalePromptDeclaresIdle: heuristicIdle,
                        stillWaiting: !existsSync(released),
                        idleMode,
                        busyMode,
                    });
                    send(resume);
                    await until("builtin released by user input", () =>
                        existsSync(released),
                    );
                    send("exit\r");
                    await until("normal exit", () => exited);
                } finally {
                    if (!exited) shell.kill();
                    await until("fixture process exit", () => exited);
                }
            }
            console.log(
                JSON.stringify(
                    {
                        platform: process.platform,
                        node: process.version,
                        results,
                    },
                    null,
                    2,
                ),
            );
        } finally {
            rmSync(folder, { recursive: true, force: true });
        }
    },
    120_000,
);
