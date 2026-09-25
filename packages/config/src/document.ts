import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
    storedConfigSchema,
    putConfigRequestSchema,
    type ConfigView,
    type Ports,
    type PutConfigRequest,
} from "@aiox/protocol";
import { Effect, Semaphore } from "effect";

import { configPath, writeConfigFile, type ConfigLocation } from "./files";
import { parseConfig, ConfigError } from "./schema";
export class ConfigConflictError extends Error {
    constructor(readonly current: ConfigView) {
        super("config_conflict: configuration changed; reload before saving.");
    }
}
export function createConfigDocument(
    location: ConfigLocation,
    runningPorts: () => Ports,
) {
    async function read(): Promise<ConfigView> {
        let content: string | undefined;
        try {
            content = await readFile(configPath(location.home), "utf8");
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT")
                throw new ConfigError(
                    `Cannot read config ${configPath(location.home)}: ${error instanceof Error ? error.message : String(error)}`,
                );
        }
        let stored;
        try {
            stored = storedConfigSchema.parse(
                content === undefined ? {} : JSON.parse(content),
            );
        } catch (error) {
            throw new ConfigError(
                `Invalid JSON/config in ${configPath(location.home)}: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
        const effective = parseConfig(stored),
            ports = runningPorts();
        return {
            revision:
                content === undefined
                    ? "absent"
                    : createHash("sha256").update(content).digest("hex"),
            stored,
            effective,
            runningPorts: ports,
            restartRequired:
                effective.ports.daemon !== ports.daemon ||
                effective.ports.web !== ports.web,
        };
    }
    const writes = Semaphore.makeUnsafe(1);
    return {
        read,
        write(input: PutConfigRequest): Promise<ConfigView> {
            return Effect.runPromise(
                writes.withPermit(
                    Effect.gen(function* () {
                        const current = yield* Effect.tryPromise({
                            try: read,
                            catch: (error) => error,
                        });
                        if (current.revision !== input.revision)
                            return yield* Effect.fail(
                                new ConfigConflictError(current),
                            );
                        const { stored } = putConfigRequestSchema.parse(input);
                        yield* Effect.tryPromise({
                            try: () => writeConfigFile(stored, location),
                            catch: (error) => error,
                        });
                        return yield* Effect.tryPromise({
                            try: read,
                            catch: (error) => error,
                        });
                    }),
                ),
            );
        },
    };
}
