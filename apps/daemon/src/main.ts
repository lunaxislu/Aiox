#!/usr/bin/env node
import { json } from "node:stream/consumers";

import { parseConfig } from "@aiox/config";

import { boot, portOverrides } from "@/bootstrap";

let prepared;
if (process.argv.includes("--config-stdin")) {
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
const { daemon } = await boot(
    prepared ?? {
        portOverrides: portOverrides(process.argv.slice(2)),
    },
);

process.stdout.write(
    `aiox daemon listening on ${daemon.ports.daemon}, web on ${daemon.ports.web}\n`,
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
