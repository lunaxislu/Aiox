import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { AioxConfig, PortOverrides } from "@/schema";
import { ConfigError, parseConfig } from "@/schema";

export type ConfigLocation = { home?: string };
export function configPath(home: string = homedir()): string {
    return join(home, ".aiox", "config.json");
}
export async function loadConfig(
    options: ConfigLocation & { portOverrides?: PortOverrides } = {},
): Promise<AioxConfig> {
    let text: string;
    try {
        text = await readFile(configPath(options.home), "utf8");
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT")
            return parseConfig({}, options.portOverrides);
        throw error;
    }
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        throw new ConfigError(`Invalid JSON in ${configPath(options.home)}`);
    }
    return parseConfig(value, options.portOverrides);
}

/** Validate before touching the file; rename a sibling temp file into place. */
export async function saveConfig(
    value: unknown,
    options: ConfigLocation = {},
): Promise<AioxConfig> {
    const config = parseConfig(value);
    await writeConfigFile(config, options);
    return config;
}

export async function writeConfigFile(
    value: unknown,
    options: ConfigLocation = {},
): Promise<void> {
    parseConfig(value);
    const file = configPath(options.home);
    await mkdir(dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
            flag: "wx",
            mode: 0o600,
        });
        await rename(temporary, file);
    } finally {
        await rm(temporary, { force: true });
    }
}
