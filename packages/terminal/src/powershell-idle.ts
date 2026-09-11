import { randomBytes } from "node:crypto";
import {
    existsSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";
import { setTimeout } from "node:timers/promises";

import type { ShellIntegration, ShellLaunch } from "./shell-integration";

const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`;

/** A PowerShell-owned request: never send shutdown keystrokes to a foreground program. */
export function preparePowerShell(input: ShellLaunch): ShellIntegration {
    const unsupported = {
        ...input,
        busy: async () => true,
        close: async () => false,
        dispose: async () => {},
    };
    if (
        input.args.length ||
        !/^(pwsh|powershell)(\.exe)?$/i.test(win32.basename(input.file))
    )
        return unsupported;
    const directory = mkdtempSync(join(tmpdir(), "aiox-powershell-"));
    const request = join(directory, "request");
    const response = join(directory, "response");
    const ready = join(directory, "ready");
    const closeScript = join(directory, "close.ps1");
    const init = join(directory, "init.ps1");
    const stateName = `__aiox_${randomBytes(12).toString("hex")}`;
    const state = `$global:${stateName}`;
    const check = `
    $jobs = @(Microsoft.PowerShell.Core\\Get-Job -ErrorAction Stop | Where-Object { $_.Id -ne ${state}.Job.Id -and $_.State -notin @('Completed', 'Failed', 'Stopped') })
    if ($jobs.Count -ne 0) { return $false }
    $children = @(CimCmdlets\\Get-CimInstance Win32_Process -Filter "ParentProcessId = $PID" -ErrorAction Stop)
    if ($children.Count -ne 0) { return $false }
`;
    try {
        writeFileSync(
            closeScript,
            `
param([string]$token)
try {
    $parts = [IO.File]::ReadAllText(${quote(request)}).Trim().Split(' ')
    if ($parts.Length -ne 3 -or $parts[0] -ne 'close' -or $parts[1] -ne $token -or [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() -gt [long]$parts[2]) { return $false }
${check}
    [IO.File]::Move(${quote(request)}, ${quote(join(directory, "claimed-"))} + $token)
    [IO.File]::WriteAllText(${quote(response)}, "$token closing")
    return $true
} catch { return $false }
`,
            { mode: 0o600 },
        );
        writeFileSync(
            init,
            `
try {
    # Older PSReadLine cannot accept a line from an event without another user key.
    Import-Module PSReadLine -MinimumVersion 2.4.3 -Global -ErrorAction Stop
    if (-not (Get-Command PSConsoleHostReadLine -ErrorAction Stop)) { return }
    ${state} = @{ Reading = $false; Pending = ''; Job = $null }
    $savedReadLine = (Get-Item Function:PSConsoleHostReadLine).ScriptBlock
    $readState = ${state}
    $wrappedReadLine = {
        $readState.Reading = $true
        try { & $savedReadLine } finally { $readState.Reading = $false }
    }.GetNewClosure()
    Set-Item Function:global:PSConsoleHostReadLine $wrappedReadLine
    $timer = [Timers.Timer]::new(100)
    ${state}.Job = Register-ObjectEvent -InputObject $timer -EventName Elapsed -Action {
        if (-not ${state}.Reading -or -not [IO.File]::Exists(${quote(request)})) { return }
        try {
            $parts = [IO.File]::ReadAllText(${quote(request)}).Trim().Split(' ')
            if ($parts.Length -ne 3 -or [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() -gt [long]$parts[2]) { return }
            $token = $parts[1]
            if ($token -notmatch '^[a-f0-9]{32}$') { return }
            $safe = & {
${check}
                return $true
            }
            if (-not $safe) { [IO.File]::WriteAllText(${quote(response)}, "$token busy"); return }
            if ($parts[0] -eq 'query') { [IO.File]::WriteAllText(${quote(response)}, "$token idle"); return }
            if ($parts[0] -ne 'close' -or ${state}.Pending -eq $token) { return }
            ${state}.Pending = $token
            # The normal command loop rechecks jobs and the live request before exit.
            # No Environment.Exit: PowerShell retains its normal shutdown lifecycle.
            [Microsoft.PowerShell.PSConsoleReadLine]::RevertLine()
            [Microsoft.PowerShell.PSConsoleReadLine]::Insert(${quote(`if (& ${quote(closeScript)} '`)} + $token + ${quote("') { exit }")})
            [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
        } catch { }
    }
    ${state}.Timer = $timer
    $timer.Start()
    [IO.File]::WriteAllText(${quote(ready)}, "$PID")
} catch { }
`,
            { mode: 0o600 },
        );
    } catch (error) {
        rmSync(directory, { recursive: true, force: true });
        throw error;
    }
    let asking = false;
    const ask = async (
        pid: number,
        action: "query" | "close",
    ): Promise<boolean> => {
        if (asking) return false;
        asking = true;
        const token = randomBytes(16).toString("hex");
        try {
            if (readFileSync(ready, "utf8") !== String(pid)) return false;
            const deadline = Date.now() + 2_000;
            writeFileSync(request, `${action} ${token} ${deadline}`, {
                mode: 0o600,
            });
            do {
                if (
                    action === "close" &&
                    existsSync(join(directory, `claimed-${token}`))
                )
                    return true;
                try {
                    const result = readFileSync(response, "utf8");
                    if (result === `${token} busy`) return false;
                    if (
                        result ===
                        `${token} ${action === "query" ? "idle" : "closing"}`
                    )
                        return true;
                } catch {}
                await setTimeout(20);
            } while (Date.now() < deadline);
            return false;
        } catch {
            return false;
        } finally {
            rmSync(request, { force: true });
            asking = false;
        }
    };
    return {
        ...input,
        args: ["-NoExit", "-Command", `. ${quote(init)}`],
        busy: async (pid) => !(await ask(pid, "query")),
        close: (pid) => ask(pid, "close"),
        dispose: async () => {
            rmSync(directory, { recursive: true, force: true });
        },
    };
}
