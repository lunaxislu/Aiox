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
        shell?: string;
        args?: string[];
        cwd?: string;
        fontFamily?: string;
        fontSize?: number;
        theme?: Record<string, string>;
    };
    keyboard?: Record<string, string>;
    web?: { sidebar?: { width?: number; open?: boolean } };
    keybindings?: Partial<
        Record<"mac" | "windows" | "linux", Record<string, string>>
    >;
    appearance?: { theme: "system" | "light" | "dark" };
    host?: { layout?: HostLayout };
};

export const DEFAULT_RETENTION_DAYS = 30;

export class ConfigError extends Error {
    constructor(
        message: string,
        readonly field?: "terminal.cwd",
    ) {
        super(message);
        this.name = "ConfigError";
    }
}

export function object(value: unknown, label: string): Record<string, unknown> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new ConfigError(`${label} must be an object`);
    }
    return value as Record<string, unknown>;
}

export function keys(
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
        [
            "ports",
            "messages",
            "terminal",
            "keyboard",
            "keybindings",
            "appearance",
            "web",
            "host",
        ],
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
    if (filePorts.daemon === filePorts.web)
        throw new ConfigError("daemon and web ports must differ");
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
        keys(
            terminal,
            ["fontFamily", "fontSize", "theme", "shell", "args", "cwd"],
            "terminal",
        );
        config.terminal = {};
        for (const key of ["shell", "cwd"] as const) {
            if (terminal[key] === undefined) continue;
            const value = string(terminal[key], `terminal.${key}`);
            if (value.includes("\0"))
                throw new ConfigError(`terminal.${key} must not contain NUL`);
            config.terminal[key] = value;
        }
        if (terminal.args !== undefined) {
            if (
                !Array.isArray(terminal.args) ||
                terminal.args.some(
                    (arg) => typeof arg !== "string" || arg.includes("\0"),
                )
            )
                throw new ConfigError(
                    "terminal.args must be an array of strings without NUL",
                );
            config.terminal.args = [...terminal.args] as string[];
        }
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
    if (input.appearance !== undefined) {
        const appearance = object(input.appearance, "appearance");
        keys(appearance, ["theme"], "appearance");
        const theme =
            appearance.theme === undefined ? "system" : appearance.theme;
        if (theme !== "system" && theme !== "light" && theme !== "dark")
            throw new ConfigError(
                "appearance.theme must be system, light, or dark",
            );
        config.appearance = { theme };
    }
    if (input.keybindings !== undefined) {
        const bindings = object(input.keybindings, "keybindings");
        keys(bindings, ["mac", "windows", "linux"], "keybindings");
        config.keybindings = {};
        for (const os of ["mac", "windows", "linux"] as const) {
            if (bindings[os] === undefined) continue;
            const map = stringMap(bindings[os], `keybindings.${os}`);
            keys(
                map,
                [
                    "newShell",
                    "splitRight",
                    "splitDown",
                    "switchTab",
                    "closeTab",
                    "focusLeft",
                    "focusDown",
                    "focusUp",
                    "focusRight",
                    "zoomPane",
                    "equalizeSizes",
                    "flashPane",
                    "toggleSidebar",
                    "openPalette",
                ],
                `keybindings.${os}`,
            );
            for (const [action, combination] of Object.entries(map)) {
                const parts = combination.split("+");
                const modifiers =
                    action === "switchTab" ? parts : parts.slice(0, -1);
                const key = parts.at(-1)!;
                const namedKey =
                    /^(?:Enter|Tab|Escape|Backspace|Delete|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End|PageUp|PageDown|Space|F(?:[1-9]|1[0-9]|2[0-4]))$/.test(
                        key,
                    );
                const printableKey =
                    key.length === 1 &&
                    key.charCodeAt(0) > 32 &&
                    key.charCodeAt(0) !== 127;
                if (
                    new Set(modifiers).size !== modifiers.length ||
                    modifiers.some(
                        (part) =>
                            !["Cmd", "Ctrl", "Alt", "Shift"].includes(part),
                    ) ||
                    (action === "switchTab"
                        ? !modifiers.length
                        : !(namedKey || printableKey))
                )
                    throw new ConfigError(
                        `Invalid keybindings.${os}.${action}: ${combination}`,
                    );
            }
            config.keybindings[os] = map;
        }
    }
    if (input.web !== undefined) {
        const web = object(input.web, "web");
        keys(web, ["sidebar"], "web");
        config.web = {};
        if (web.sidebar !== undefined) {
            const sidebar = object(web.sidebar, "web.sidebar");
            keys(sidebar, ["width", "open"], "web.sidebar");
            config.web.sidebar = {};
            if (sidebar.open !== undefined) {
                if (typeof sidebar.open !== "boolean")
                    throw new ConfigError("web.sidebar.open must be a boolean");
                config.web.sidebar.open = sidebar.open;
            }
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
    if (!hasDimensions)
        throw new ConfigError("host.layout grid requires columns or rows");
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
    return result.preset === "grid"
        ? { ...result, columns: result.columns ?? 1, rows: result.rows ?? 1 }
        : result;
}
