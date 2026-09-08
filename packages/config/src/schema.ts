export type Ports = { daemon: number; web: number };
export type PortOverrides = Partial<Ports>;
export type AioxConfig = {
    ports: Ports;
    terminal?: {
        fontFamily?: string;
        fontSize?: number;
        theme?: Record<string, string>;
    };
    keyboard?: Record<string, string>;
};

export class ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConfigError";
    }
}

function object(value: unknown, label: string): Record<string, unknown> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new ConfigError(`${label} must be an object`);
    }
    return value as Record<string, unknown>;
}

function keys(
    value: Record<string, unknown>,
    allowed: string[],
    label: string,
): void {
    for (const key of Object.keys(value)) {
        if (!allowed.includes(key))
            throw new ConfigError(`Unknown ${label} setting: ${key}`);
    }
}

function string(value: unknown, label: string): string {
    if (typeof value !== "string" || !value.trim())
        throw new ConfigError(`${label} must be a non-empty string`);
    return value;
}

function stringMap(value: unknown, label: string): Record<string, string> {
    return Object.fromEntries(
        Object.entries(object(value, label)).map(([key, entry]) => {
            string(key, `${label} key`);
            return [key, string(entry, `${label}.${key}`)];
        }),
    );
}

function port(value: unknown, label: string): number {
    if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 1 ||
        value > 65535
    ) {
        throw new ConfigError(`${label} must be an integer from 1 to 65535`);
    }
    return value;
}

export function parseConfig(
    value: unknown,
    overrides: PortOverrides = {},
): AioxConfig {
    const input = object(value, "config");
    keys(input, ["ports", "terminal", "keyboard"], "config");
    const ports = input.ports === undefined ? {} : object(input.ports, "ports");
    keys(ports, ["daemon", "web"], "ports");
    const cli = object(overrides, "port overrides");
    keys(cli, ["daemon", "web"], "port overrides");
    // Validate the file even when a CLI argument overrides its value.
    const filePorts = {
        daemon: port(
            ports.daemon === undefined ? 4500 : ports.daemon,
            "ports.daemon",
        ),
        web: port(ports.web === undefined ? 4501 : ports.web, "ports.web"),
    };
    const config: AioxConfig = {
        ports: {
            daemon: port(
                cli.daemon === undefined ? filePorts.daemon : cli.daemon,
                "ports.daemon",
            ),
            web: port(
                cli.web === undefined ? filePorts.web : cli.web,
                "ports.web",
            ),
        },
    };
    if (config.ports.daemon === config.ports.web)
        throw new ConfigError("daemon and web ports must differ");
    if (input.terminal !== undefined) {
        const terminal = object(input.terminal, "terminal");
        keys(terminal, ["fontFamily", "fontSize", "theme"], "terminal");
        config.terminal = {};
        if (terminal.fontFamily !== undefined)
            config.terminal.fontFamily = string(
                terminal.fontFamily,
                "terminal.fontFamily",
            );
        if (terminal.fontSize !== undefined) {
            if (
                typeof terminal.fontSize !== "number" ||
                !Number.isFinite(terminal.fontSize) ||
                terminal.fontSize <= 0
            ) {
                throw new ConfigError(
                    "terminal.fontSize must be a positive finite number",
                );
            }
            config.terminal.fontSize = terminal.fontSize;
        }
        if (terminal.theme !== undefined)
            config.terminal.theme = stringMap(terminal.theme, "terminal.theme");
    }
    if (input.keyboard !== undefined)
        config.keyboard = stringMap(input.keyboard, "keyboard");
    return config;
}
