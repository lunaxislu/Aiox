export type Ports = { daemon: number; web: number };
export type PortOverrides = Partial<Ports>;
export type HostLayout =
    | { preset: "auto" | "left-main" | "top-main" }
    | { preset: "grid"; columns?: number; rows?: number };
export type AioxConfig = {
    ports: Ports;
    /** How long a finished request's history is kept. */
    messages: { retentionDays: number };
    terminal?: {
        fontFamily?: string;
        fontSize?: number;
        theme?: Record<string, string>;
    };
    keyboard?: Record<string, string>;
    web?: { sidebar?: { width?: number } };
    host?: { layout?: HostLayout };
};

export const DEFAULT_RETENTION_DAYS = 30;

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

function retentionDays(value: unknown): number {
    if (value === undefined) return DEFAULT_RETENTION_DAYS;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
        throw new ConfigError(
            "messages.retentionDays must be an integer of at least 1",
        );
    return value;
}

export function parseConfig(
    value: unknown,
    overrides: PortOverrides = {},
): AioxConfig {
    const input = object(value, "config");
    keys(
        input,
        ["ports", "messages", "terminal", "keyboard", "web", "host"],
        "config",
    );
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
    const messages =
        input.messages === undefined ? {} : object(input.messages, "messages");
    keys(messages, ["retentionDays"], "messages");
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
        messages: {
            retentionDays: retentionDays(messages.retentionDays),
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
    if (input.web !== undefined) {
        const web = object(input.web, "web");
        keys(web, ["sidebar"], "web");
        config.web = {};
        if (web.sidebar !== undefined) {
            const sidebar = object(web.sidebar, "web.sidebar");
            keys(sidebar, ["width"], "web.sidebar");
            config.web.sidebar = {};
            if (sidebar.width !== undefined) {
                if (
                    typeof sidebar.width !== "number" ||
                    !Number.isFinite(sidebar.width) ||
                    sidebar.width <= 0
                )
                    throw new ConfigError(
                        "web.sidebar.width must be a positive finite number",
                    );
                config.web.sidebar.width = sidebar.width;
            }
        }
    }
    if (input.host !== undefined) {
        const host = object(input.host, "host");
        keys(host, ["layout"], "host");
        config.host = {};
        if (host.layout !== undefined)
            config.host.layout = parseHostLayout(host.layout);
    }
    return config;
}

/** Validate layout data; dimensions remain optional until the placement consumer resolves them. */
export function parseHostLayout(
    value: unknown,
    source: "global" | "yaml" | "cli" = "global",
): HostLayout {
    const input = object(value, `${source} host.layout`);
    keys(input, ["preset", "columns", "rows"], "host.layout");
    const hasDimensions =
        input.columns !== undefined || input.rows !== undefined;
    const preset =
        input.preset === undefined
            ? hasDimensions
                ? "grid"
                : "auto"
            : input.preset;
    if (
        preset !== "auto" &&
        preset !== "left-main" &&
        preset !== "top-main" &&
        preset !== "grid"
    )
        throw new ConfigError(
            "host.layout.preset must be auto, left-main, top-main, or grid",
        );
    if (preset !== "grid") {
        if (hasDimensions)
            throw new ConfigError(
                "host.layout columns and rows require grid preset",
            );
        return { preset };
    }
    const result: HostLayout = { preset };
    for (const dimension of ["columns", "rows"] as const) {
        const value = input[dimension];
        if (value === undefined) continue;
        if (
            typeof value !== "number" ||
            !Number.isSafeInteger(value) ||
            value <= 0
        )
            throw new ConfigError(
                `host.layout.${dimension} must be a positive safe integer`,
            );
        result[dimension] = value;
    }
    return result;
}

/** CLI > YAML > global > auto, inheriting dimensions only within the same preset. */
export function resolveHostLayout(
    sources: { cli?: unknown; yaml?: unknown; global?: unknown } = {},
): HostLayout {
    let result: HostLayout = { preset: "auto" };
    for (const source of ["global", "yaml", "cli"] as const) {
        const value = sources[source];
        if (value === undefined) continue;
        const layout = parseHostLayout(value, source);
        const input = value as Record<string, unknown>;
        if (
            input.preset === undefined &&
            input.columns === undefined &&
            input.rows === undefined
        )
            continue;
        result =
            result.preset === layout.preset ? { ...result, ...layout } : layout;
    }
    return result;
}
