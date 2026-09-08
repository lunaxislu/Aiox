#!/usr/bin/env node
import { boot, portOverrides } from "@/bootstrap";

const { daemon } = await boot({
    portOverrides: portOverrides(process.argv.slice(2)),
});

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
