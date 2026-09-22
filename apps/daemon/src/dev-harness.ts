#!/usr/bin/env node
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Stage 2 verification harness. NOT a product surface — it is not in `bin`, the
 * CLI never runs it, and it adds no adapter. It boots the real daemon and opens
 * one plain-shell pty through the same TerminalService the vendor adapters will
 * use in Stage 3 and 4, so a person can check the pty <-> browser path by hand.
 *
 *     pnpm build && pnpm harness
 *
 * The plain shell has no Agent registration, credential or network membership.
 * It is never an MCP send target; AIOX messages cannot reach it as shell input.
 * MCP authentication, agents_list, send, routing and the notification policy are
 * covered by the automated tests against vendor doubles instead.
 */
import { logger } from "@aiox/diagnostics";

import { boot } from "@/bootstrap";

const home =
    process.env.AIOX_HARNESS_HOME ?? join(tmpdir(), "aiox-stage2-harness");

const { daemon } = await boot({ home });
const terminal = await daemon.createShell();

process.stdout.write(
    [
        "",
        `AIOX Stage 2 harness — home ${home}`,
        `  Web        http://127.0.0.1:${daemon.ports.web}/`,
        `  daemon API http://127.0.0.1:${daemon.ports.daemon}/api/status`,
        `  terminal   ${terminal.id}`,
        "",
        "Check by hand:",
        "  1. type in the terminal and see the shell answer",
        "  2. resize the window (POSIX shells: stty size; Windows native: check wrapping)",
        "  3. close or reload the tab — the shell keeps running and reattaches",
        "  4. stop this isolated instance via its API (the default CLI uses your user home):",
        `     POST http://127.0.0.1:${daemon.ports.daemon}/api/daemon/stop`,
        '     Content-Type: application/json; body {} for normal stop or {"force":true}',
        "     Windows: normal stop terminates daemon-owned executions.",
        "     External CLI vendors keep running after normal or force stop.",
        "     POSIX: normal stop may refuse daemon-owned registered executions or busy/unknown shells.",
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
                    logger.error(
                        {
                            warningCount: outcome.warnings.length,
                            blockingCount: outcome.blocking.length,
                        },
                        "Daemon shutdown incomplete",
                    );
            })
            .catch((error: unknown) =>
                logger.error({ err: error }, "Daemon shutdown failed"),
            );
    });
}

await daemon.closed;
