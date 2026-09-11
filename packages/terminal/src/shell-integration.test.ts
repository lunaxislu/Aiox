import { execFileSync } from "node:child_process";
import {
    existsSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { spawn } from "node-pty";
import { describe, expect, it } from "vitest";

import { prepareShell } from "./shell-integration";

const shells = ["/bin/zsh", "/bin/bash"].filter(existsSync);

describe.skipIf(process.platform === "win32")("POSIX shell integration", () => {
    it.each(shells)(
        "only closes %s at its prompt, preserving user startup configuration",
        async (file) => {
            const home = mkdtempSync(join(tmpdir(), "aiox-shell-test-"));
            const rc = file.endsWith("zsh") ? ".zshrc" : ".bashrc";
            const source =
                "export AIOX_TEST_STARTUP=preserved\nPS1='AIOX_TEST_PROMPT> '\n" +
                (file.endsWith("bash")
                    ? "if (( BASH_VERSINFO[0] >= 4 )); then PROMPT_COMMAND=('export AIOX_TEST_STARTUP=first' 'export AIOX_TEST_STARTUP=preserved'); else PROMPT_COMMAND='export AIOX_TEST_STARTUP=preserved;'; fi\n"
                    : "");
            writeFileSync(join(home, rc), source);
            const shell = prepareShell({
                file,
                args: [],
                env: {
                    ...process.env,
                    HOME: home,
                    TERM: "dumb",
                    ZDOTDIR: home,
                } as Record<string, string>,
            });
            const pty = spawn(shell.file, shell.args, { env: shell.env });
            let output = "";
            pty.onData((data) => {
                output += data;
            });
            let exited = false;
            pty.onExit(() => {
                exited = true;
            });
            try {
                await expect
                    .poll(() => output.includes("AIOX_TEST_PROMPT> "))
                    .toBe(true);
                expect(await shell.busy(pty.pid)).toBe(false);
                pty.write("printf '%s\\n' \"$AIOX_TEST_STARTUP\"\r");
                await expect
                    .poll(() => output.includes("\r\npreserved\r\n"))
                    .toBe(true);
                expect(readFileSync(join(home, rc), "utf8")).toBe(source);
                output = "";
                pty.write("cd /; printf 'CHANGED\\n'\r");
                await expect
                    .poll(() => output.includes("\r\nCHANGED\r\n"))
                    .toBe(true);
                await expect
                    .poll(() => output.includes("AIOX_TEST_PROMPT> "))
                    .toBe(true);
                pty.write("this text has not been submitted");
                expect(await shell.close(pty.pid)).toBe(true);
                await expect.poll(() => exited).toBe(true);
            } finally {
                if (!exited) process.kill(pty.pid, "SIGKILL");
                await expect.poll(() => exited).toBe(true);
                await shell.dispose();
                rmSync(home, { recursive: true, force: true });
            }
        },
        15_000,
    );

    it.each(
        shells.flatMap((file) => [
            [file, "while true; do :; done"],
            [file, "sleep 30"],
            [file, "sleep 30 &"],
            [file, "sleep 30 & kill -STOP $!"],
            [file, "sleep 30 & disown"],
            [file, "read unused"],
            [file, "exec sleep 30"],
        ]),
    )(
        "preserves %s running %s",
        async (file, command) => {
            const home = mkdtempSync(join(tmpdir(), "aiox-shell-test-"));
            writeFileSync(
                join(home, file!.endsWith("zsh") ? ".zshrc" : ".bashrc"),
                "PS1='AIOX_TEST_PROMPT> '\n",
            );
            const shell = prepareShell({
                file: file!,
                args: [],
                env: {
                    ...process.env,
                    HOME: home,
                    ZDOTDIR: home,
                    TERM: "dumb",
                } as Record<string, string>,
            });
            const pty = spawn(shell.file, shell.args, { env: shell.env });
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
                    .poll(() => output.includes("AIOX_TEST_PROMPT> "))
                    .toBe(true);
                pty.write(`printf 'RUNNING\\n'; ${command}\r`);
                await expect
                    .poll(() => output.includes("\r\nRUNNING\r\n"))
                    .toBe(true);
                expect(await shell.busy(pty.pid)).toBe(true);
                expect(await shell.close(pty.pid)).toBe(false);
                expect(exited).toBe(false);
            } finally {
                const rows = execFileSync("/bin/ps", ["-axo", "pid=,ppid="], {
                    encoding: "utf8",
                });
                for (const row of rows.trim().split("\n")) {
                    const [pid, parent] = row.trim().split(/\s+/).map(Number);
                    if (parent === pty.pid) {
                        try {
                            process.kill(pid!, "SIGKILL");
                        } catch {}
                    }
                }
                if (!exited) process.kill(pty.pid, "SIGKILL");
                await expect.poll(() => exited).toBe(true);
                await shell.dispose();
                rmSync(home, { recursive: true, force: true });
            }
        },
        15_000,
    );

    it.each(shells)(
        "preserves an existing WINCH trap in %s and stays unknown",
        async (file) => {
            const home = mkdtempSync(join(tmpdir(), "aiox-shell-test-"));
            writeFileSync(
                join(home, file.endsWith("zsh") ? ".zshrc" : ".bashrc"),
                "trap 'printf USER_WINCH' WINCH\nPS1='AIOX_TEST_PROMPT> '\n",
            );
            const shell = prepareShell({
                file,
                args: [],
                env: {
                    ...process.env,
                    HOME: home,
                    ZDOTDIR: home,
                    TERM: "dumb",
                } as Record<string, string>,
            });
            const pty = spawn(shell.file, shell.args, { env: shell.env });
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
                    .poll(() => output.includes("AIOX_TEST_PROMPT> "))
                    .toBe(true);
                expect(await shell.busy(pty.pid)).toBe(true);
                expect(await shell.close(pty.pid)).toBe(false);
                process.kill(pty.pid, "SIGWINCH");
                await expect
                    .poll(() => output.includes("USER_WINCH"))
                    .toBe(true);
            } finally {
                process.kill(pty.pid, "SIGKILL");
                await expect.poll(() => exited).toBe(true);
                await shell.dispose();
                rmSync(home, { recursive: true, force: true });
            }
        },
    );
});
