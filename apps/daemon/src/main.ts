#!/usr/bin/env node
import { json } from "node:stream/consumers";

import { parseConfig } from "@aiox/config";
import { logger } from "@aiox/diagnostics";

import { boot, InvalidPortError, portOverrides } from "@/bootstrap";

let stage = "arguments";
try {
    let prepared;
    if (process.argv.includes("--config-stdin")) {
        stage = "configuration";
        const input: unknown = await json(process.stdin);
        if (
            input === null ||
            typeof input !== "object" ||
            !("home" in input) ||
            typeof input.home !== "string" ||
            !input.home ||
            !("config" in input)
        )
            throw new Error("Invalid prepared daemon configuration.");
        prepared = { home: input.home, config: parseConfig(input.config) };
    }
    const options = prepared ?? {
        portOverrides: portOverrides(process.argv.slice(2)),
    };
    stage = "boot";
    const { daemon } = await boot(options);

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
} catch (err) {
    logger.fatal(
        {
            err,
            stage,
            field: err instanceof InvalidPortError ? err.field : undefined,
        },
        "Daemon startup failed",
    );
    logger.flush();
    process.exitCode = 1;
}
