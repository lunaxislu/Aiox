#!/usr/bin/env node
import { CommanderError } from "commander";

import { createFoundationPort } from "@/bootstrap";
import { createCli } from "@/cli";

try {
    await createCli(createFoundationPort(), (value) =>
        process.stdout.write(`${JSON.stringify(value, null, 2)}\n`),
    ).parseAsync();
} catch (error) {
    if (error instanceof CommanderError) process.exitCode = error.exitCode;
    else {
        process.stderr.write(
            `error: ${error instanceof Error ? error.message : String(error)}\n`,
        );
        process.exitCode = 1;
    }
}
