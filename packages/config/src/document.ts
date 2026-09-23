import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
    storedConfigSchema,
    putConfigRequestSchema,
    type ConfigView,
    type Ports,
    type PutConfigRequest,
} from "@aiox/protocol";

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
    let pending = Promise.resolve();
    return {
        read,
        write(input: PutConfigRequest): Promise<ConfigView> {
            const result = pending.then(async () => {
                const current = await read();
                if (current.revision !== input.revision)
                    throw new ConfigConflictError(current);
                const { stored } = putConfigRequestSchema.parse(input);
                await writeConfigFile(stored, location);
                return read();
            });
            pending = result.then(
                () => {},
                () => {},
            );
            return result;
        },
    };
}
