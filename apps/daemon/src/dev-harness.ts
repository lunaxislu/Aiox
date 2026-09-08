#!/usr/bin/env node
/**
 * Stage 2 verification harness. NOT a product surface — it is not in `bin`, the
 * CLI never runs it, and it adds no adapter. It boots the real daemon and opens
 * one plain-shell pty through the same TerminalService the vendor adapters will
 * use in Stage 3 and 4, so a person can check the pty <-> browser path by hand.
 *
 *     pnpm build && pnpm harness
 *
 * The shell runtime deliberately has no network membership, so it can never be
 * an MCP send target and no AIOX message body can reach the shell as input.
 * MCP authentication, agents_list, send, routing and the notification policy are
 * covered by the automated tests against vendor doubles instead.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defaultShell } from "@aiox/terminal";

import { boot } from "@/bootstrap";

const home =
    process.env.AIOX_HARNESS_HOME ?? join(tmpdir(), "aiox-stage2-harness");

const { daemon } = await boot({ home });
const shell = defaultShell();
const terminal = daemon.createTerminal({
    file: shell.file,
    args: shell.args,
    cwd: process.cwd(),
});
const { runtimeId } = await daemon.registerRuntime({
    name: "stage2-shell",
    description: "Plain shell used to verify the pty transport",
    networkId: null,
    terminalId: terminal.id,
    createBinding: (controls) => {
        controls.setActivity("idle");
        return {
            deliver: () =>
                Promise.reject(
                    new Error(
                        "The Stage 2 shell terminal has no AIOX input path.",
                    ),
                ),
            stop: () => Promise.resolve(),
        };
    },
});

process.stdout.write(
    [
        "",
        `AIOX Stage 2 harness — home ${home}`,
        `  Web        http://127.0.0.1:${daemon.ports.web}/`,
        `  daemon API http://127.0.0.1:${daemon.ports.daemon}/api/status`,
        `  runtime    ${runtimeId}`,
        `  terminal   ${terminal.id}`,
        "",
        "Check by hand:",
        "  1. type in the terminal and see the shell answer",
        "  2. resize the window, then run `stty size` in the shell",
        "  3. close or reload the tab — the shell keeps running and reattaches",
        "  4. from another shell: aiox daemon stop   (refused, an execution is live)",
        "     then:                aiox daemon stop --force",
        "",
        "Ctrl+C stops the harness.",
        "",
    ].join("\n"),
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
        void daemon
            .stop(true)
            .then((outcome) => {
                if (!outcome.stopped)
                    process.stderr.write(
                        `Daemon shutdown incomplete: ${outcome.warnings.join("; ")}\n`,
                    );
            })
            .catch((error: unknown) =>
                process.stderr.write(
                    `Daemon shutdown failed: ${String(error)}\n`,
                ),
            );
    });
}

await daemon.closed;
