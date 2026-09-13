import { execFile } from "node:child_process";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual, promisify } from "node:util";

export async function prepareClaudeLaunch(input: {
    args: readonly string[];
    cwd: string;
    env: NodeJS.ProcessEnv;
    inboxPath: string;
    mcpUrl: string | null;
    instruction?: string;
    hooks: Record<string, unknown>;
}): Promise<{
    args: string[];
    env: Record<string, string>;
    hasBlockingStopHooks: boolean;
}> {
    const args: string[] = [];
    const tail: string[] = [];
    const mcp: Record<string, unknown> = {};
    const expectedMcp = {
        type: "http",
        url: input.mcpUrl,
        headers: { Authorization: "Bearer ${AIOX_MCP_TOKEN}" },
    };
    const extracted = new Map<string, string>();
    let restricted = false;
    let strictMcp = false;
    let inlinePlugins = false;
    for (let index = 0; index < input.args.length; index++) {
        const argument = input.args[index]!;
        if (argument === "--") {
            tail.push(...input.args.slice(index));
            break;
        }
        const equal = argument.indexOf("=");
        const name = equal < 0 ? argument : argument.slice(0, equal);
        if (name === "--restricted") restricted = true;
        if (name === "--strict-mcp-config") strictMcp = true;
        if (
            ["--plugin-dir", "--plugin-dir-no-mcp", "--plugin-url"].includes(
                name,
            )
        )
            inlinePlugins = true;
        if (["--safe-mode", "--bare"].includes(name))
            invalid(name, "disables hooks required by AIOX");
        if (["--print", "-p"].includes(name))
            invalid(
                name,
                "selects non-interactive execution instead of the required foreground TUI",
            );
        if (["--bg", "--background", "--tmux"].includes(name))
            invalid(
                name,
                "moves execution outside the foreground TUI managed by AIOX",
            );
        if (name === "--mcp-config") {
            args.push(argument);
            const values: string[] = [];
            if (equal >= 0) values.push(argument.slice(equal + 1));
            while (
                index + 1 < input.args.length &&
                !input.args[index + 1]!.startsWith("-")
            ) {
                const value = input.args[++index]!;
                values.push(value);
                args.push(value);
            }
            if (values.length === 0) invalid(name);
            for (const value of values)
                Object.assign(
                    mcp,
                    object(
                        (await settingsValue(value, input.cwd, name))
                            .mcpServers,
                    ),
                );
        } else if (
            [
                "--settings",
                "--append-system-prompt",
                "--append-system-prompt-file",
                "--messaging-socket-path",
                "--setting-sources",
            ].includes(name)
        ) {
            const value =
                equal < 0 ? input.args[++index] : argument.slice(equal + 1);
            if (value === undefined) invalid(name);
            extracted.set(name, value);
            if (name === "--setting-sources") args.push(name, value);
        } else args.push(argument);
    }
    if (
        extracted.has("--messaging-socket-path") &&
        extracted.get("--messaging-socket-path") !== input.inboxPath
    )
        invalid(
            "--messaging-socket-path",
            "replaces the Runtime inbox address managed by AIOX",
        );
    const user = extracted.has("--settings")
        ? await settingsValue(
              extracted.get("--settings")!,
              input.cwd,
              "--settings",
          )
        : {};
    const sources = new Set(
        (extracted.get("--setting-sources") ?? "user,project,local")
            .split(",")
            .filter(Boolean),
    );
    if (restricted) sources.clear();
    const home = input.env.HOME ?? input.env.USERPROFILE ?? homedir();
    const configDir = input.env.CLAUDE_CONFIG_DIR ?? join(home, ".claude");
    const inherited: Record<string, unknown>[] = [];
    if (sources.has("user"))
        inherited.push(
            await optionalSettings(join(configDir, "settings.json")),
        );
    if (sources.has("project"))
        inherited.push(
            await optionalSettings(join(input.cwd, ".claude/settings.json")),
        );
    if (sources.has("local")) {
        inherited.push(
            await optionalSettings(
                join(input.cwd, ".claude/settings.local.json"),
            ),
        );
        const root = await localSettingsRoot(input.cwd, home, input.env);
        if (root !== input.cwd)
            inherited.push(
                await optionalSettings(
                    join(root, ".claude/settings.local.json"),
                ),
            );
    }
    const managedDir =
        process.platform === "darwin"
            ? "/Library/Application Support/ClaudeCode"
            : process.platform === "win32"
              ? "C:\\Program Files\\ClaudeCode"
              : "/etc/claude-code";
    const managed = [
        await optionalSettings(join(managedDir, "managed-settings.json")),
    ];
    let dropins: string[] = [];
    try {
        dropins = (await readdir(join(managedDir, "managed-settings.d")))
            .filter((name) => !name.startsWith(".") && name.endsWith(".json"))
            .sort();
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT")
            invalid("managed-settings.d");
    }
    for (const name of dropins)
        managed.push(
            await optionalSettings(
                join(managedDir, "managed-settings.d", name),
            ),
        );
    const effective = Object.assign(
        {},
        ...inherited,
        user,
        ...managed,
    ) as Record<string, unknown>;
    const enabledPlugins = Object.assign(
        {},
        ...[...inherited, user, ...managed].map((settings) =>
            object(settings.enabledPlugins),
        ),
    ) as Record<string, unknown>;
    if (effective.disableAllHooks === true)
        invalid("disableAllHooks=true", "disables hooks required by AIOX");
    if (managed.some((settings) => settings.allowManagedHooksOnly === true))
        invalid(
            "managed settings allowManagedHooksOnly",
            "excludes the invocation hooks required by AIOX",
        );
    if (
        input.mcpUrl &&
        managed.some(
            (settings) =>
                settings.allowManagedMcpServersOnly === true ||
                settings.disableSideloadFlags === true,
        )
    )
        invalid(
            "managed settings MCP restriction",
            "prevents the required AIOX MCP connection",
        );
    const effectiveEnv = Object.assign(
        {},
        ...inherited.map((settings) => object(settings.env)),
        object(user.env),
        ...managed.map((settings) => object(settings.env)),
    ) as Record<string, unknown>;
    for (const env of [input.env, effectiveEnv]) {
        if (
            Object.entries(env).some(
                ([key, value]) =>
                    (process.platform === "win32" ? key.toUpperCase() : key) ===
                        "CLAUDE_CODE_SAFE_MODE" &&
                    /^(1|true)$/i.test(String(value)),
            )
        )
            invalid("CLAUDE_CODE_SAFE_MODE", "disables hooks required by AIOX");
    }
    for (const name of [
        "AIOX_MCP_TOKEN",
        "AIOX_HOOK_TOKEN",
        "AIOX_HOOK_URL",
        "AIOX_EXECUTION_OWNERSHIP",
    ]) {
        if (
            Object.keys(effectiveEnv).some(
                (key) =>
                    (process.platform === "win32" ? key.toUpperCase() : key) ===
                    name,
            )
        )
            invalid(
                `settings env.${name}`,
                "overrides a connection value assigned separately for each AIOX Runtime",
            );
    }
    const global = await optionalSettings(
        input.env.CLAUDE_CONFIG_DIR
            ? join(configDir, ".claude.json")
            : join(home, ".claude.json"),
    );
    const configuredMcp = {
        ...(!strictMcp && sources.has("user") ? object(global.mcpServers) : {}),
        ...(!strictMcp && sources.has("project")
            ? object(
                  (await optionalSettings(join(input.cwd, ".mcp.json")))
                      .mcpServers,
              )
            : {}),
        ...(!strictMcp && sources.has("local")
            ? object(object(object(global.projects)[input.cwd]).mcpServers)
            : {}),
        ...mcp,
    };
    if (
        input.mcpUrl &&
        configuredMcp.aiox !== undefined &&
        !isDeepStrictEqual(configuredMcp.aiox, expectedMcp)
    )
        invalid(
            "MCP mcpServers.aiox",
            "replaces the MCP connection required by AIOX",
        );
    const userHooks = object(user.hooks);
    if (
        user.hooks !== undefined &&
        (user.hooks === null ||
            typeof user.hooks !== "object" ||
            Array.isArray(user.hooks))
    )
        invalid(
            "--settings hooks",
            "must be an object containing hook event arrays",
        );
    for (const entries of Object.values(userHooks))
        if (!Array.isArray(entries))
            invalid("--settings hooks", "must contain hook event arrays");
    const hooks = { ...userHooks };
    for (const [event, entries] of Object.entries(input.hooks)) {
        const existing = userHooks[event];
        if (!Array.isArray(entries)) invalid("AIOX hooks");
        hooks[event] = [
            ...((existing as unknown[] | undefined) ?? []),
            ...entries,
        ];
    }
    args.push("--settings", JSON.stringify({ ...user, hooks }));
    if (input.mcpUrl)
        args.push(
            "--mcp-config",
            JSON.stringify({
                mcpServers: {
                    aiox: expectedMcp,
                },
            }),
        );
    let append = extracted.get("--append-system-prompt");
    const appendFile = extracted.get("--append-system-prompt-file");
    if (appendFile !== undefined) {
        if (append)
            invalid("--append-system-prompt / --append-system-prompt-file");
        append = await textFile(
            resolve(input.cwd, appendFile),
            "--append-system-prompt-file",
        );
    }
    const instruction = [append, input.instruction]
        .filter((value) => value !== undefined && value !== "")
        .join("\n\n");
    if (instruction) args.push("--append-system-prompt", instruction);
    args.push("--messaging-socket-path", input.inboxPath);
    args.push(...tail);
    return {
        args,
        env: Object.fromEntries(
            Object.entries(input.env).filter(
                (entry): entry is [string, string] => entry[1] !== undefined,
            ),
        ),
        // A plugin's dynamic hooks are not inspected by this launch preflight.
        hasBlockingStopHooks:
            inlinePlugins ||
            Object.values(enabledPlugins).some((enabled) => enabled === true) ||
            [...inherited, user, ...managed].some((settings) => {
                const stop = object(settings.hooks).Stop;
                return Array.isArray(stop) && stop.length > 0;
            }),
    };
}
function invalid(
    name: string,
    reason = "cannot be read or combined with the required AIOX launch configuration",
): never {
    throw new Error(
        `Cannot start Claude: ${name} ${reason}.\nRemove or correct that option or setting and try again.`,
    );
}

function object(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

async function textFile(path: string, name: string): Promise<string> {
    try {
        return await readFile(path, {
            encoding: "utf8",
            signal: AbortSignal.timeout(3000),
        });
    } catch {
        return invalid(name);
    }
}

async function settingsValue(
    value: string,
    cwd: string,
    name: string,
): Promise<Record<string, unknown>> {
    try {
        const source = value.trimStart().startsWith("{")
            ? value
            : await textFile(resolve(cwd, value), name);
        const parsed: unknown = JSON.parse(source);
        if (
            parsed === null ||
            typeof parsed !== "object" ||
            Array.isArray(parsed)
        )
            return invalid(name);
        return parsed as Record<string, unknown>;
    } catch {
        return invalid(name);
    }
}

async function optionalSettings(
    path: string,
): Promise<Record<string, unknown>> {
    try {
        return object(
            JSON.parse(
                await readFile(path, {
                    encoding: "utf8",
                    signal: AbortSignal.timeout(3000),
                }),
            ),
        );
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
        return invalid("Claude settings file");
    }
}

async function localSettingsRoot(
    cwd: string,
    home: string,
    env: NodeJS.ProcessEnv,
): Promise<string> {
    if (process.platform === "win32") return cwd;
    let output: string;
    try {
        ({ stdout: output } = await promisify(execFile)(
            "git",
            ["worktree", "list", "--porcelain", "-z"],
            {
                cwd,
                env,
                timeout: 2000,
                killSignal: "SIGKILL",
                maxBuffer: 16384,
            },
        ));
    } catch (error) {
        if ((error as { killed?: boolean }).killed)
            return invalid("Git local settings resolution");
        return cwd;
    }
    const root = output.split("\0")[0]?.replace(/^worktree /, "");
    if (!root || root === (await realpath(home).catch(() => resolve(home))))
        return cwd;
    for (const path of [root, join(root, ".git"), join(root, ".claude")]) {
        try {
            if ((await lstat(path)).uid !== process.getuid!()) return cwd;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") return cwd;
        }
    }
    return root;
}
