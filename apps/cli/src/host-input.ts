import { prepareHostInput } from "@aiox/config";

import type { CliOptions, CliRequest, CommandName } from "@/requests";

/** Only source selection is read before Commander validates the rest of the command. */
export function hostSelection(argv: readonly string[]): {
    options: Pick<CliOptions, "path" | "file">;
    errors: string[];
} {
    const options: Pick<CliOptions, "path" | "file"> = {};
    const errors: string[] = [];
    for (let i = 1; i < argv.length; i++) {
        const token = argv[i]!;
        if (token === "--") break;
        const match = /^--(path|file)(?:=(.*))?$/.exec(token);
        if (!match) continue;
        const key = match[1] as "path" | "file";
        const value = match[2] ?? argv[++i];
        if (options[key] !== undefined)
            errors.push(`--${key} may only be supplied once`);
        if (value === undefined || !value.trim() || value.includes("\0"))
            errors.push(`--${key} requires a nonblank path without NUL`);
        else options[key] = value;
    }
    return { options, errors };
}

/** Retain source and direct-name selection even when Commander rejects the CLI syntax. */
export function failedHostRequest(
    argv: readonly string[],
    error: string,
): CliRequest {
    const selection = hostSelection(argv);
    const positionals: string[] = [];
    const valueOptions = new Set([
        "--path",
        "--file",
        "--layout",
        "--columns",
        "--rows",
        "--from",
        "--name",
        "--host",
        "--worktree",
    ]);
    for (let i = 1; i < argv.length; i++) {
        const token = argv[i]!;
        if (token === "--") {
            positionals.push(...argv.slice(i + 1));
            break;
        }
        if (token.startsWith("-")) {
            if (valueOptions.has(token)) i++;
            continue;
        }
        positionals.push(token);
    }
    const verb = positionals[0];
    const group = verb === "agent" || verb === "network" ? verb : undefined;
    const verbs =
        group === "agent"
            ? ["start", "stop", "restart"]
            : group === "network"
              ? ["list", "show", "block", "unblock", "reset"]
              : ["run", "list", "status", "stop", "restart", "delete"];
    const action = group ? positionals[1] : verb;
    const command = (
        verbs.includes(action ?? "")
            ? `host.${group ? `${group}.` : ""}${action}`
            : "host.run"
    ) as CommandName;
    const name = positionals[group ? 2 : 1];
    const args = name && !name.startsWith("-") ? [name] : [];
    return {
        command,
        args,
        options: selection.options,
        cliErrors: [error],
        selectionErrors: selection.errors,
    };
}

export async function prepareHostRequest(
    request: CliRequest,
    location: { home?: string } = {},
) {
    const { command, args, options } = request;
    const errors = [...(request.cliErrors ?? [])];
    const direct =
        ["host.status", "host.stop", "host.delete"].includes(command) &&
        typeof args[0] === "string";
    const usesYaml =
        command !== "host.list" &&
        !command.startsWith("host.network.") &&
        !direct;
    const allowed = [
        ...(usesYaml || direct ? ["path", "file"] : []),
        ...(command === "host.run" ? ["layout", "columns", "rows"] : []),
        ...(["host.list", "host.status"].includes(command) ||
        command.startsWith("host.network.")
            ? ["json"]
            : []),
        ...(/^host\.network\.(block|unblock|reset)$/.test(command)
            ? ["between", "from", "to"]
            : []),
    ];
    for (const key of Object.keys(options))
        if (!allowed.includes(key))
            errors.push(`Unsupported ${command} option: --${key}`);
    if (direct && options.file !== undefined)
        errors.push("hostname and --file cannot be combined");
    for (const name of args.flat())
        if (!name.trim() || name.includes("/") || name.includes("\0"))
            errors.push(`Invalid Host/Agent/Network name: ${name}`);
    const layout: Record<string, unknown> = {};
    if (options.layout !== undefined) layout.preset = options.layout;
    for (const dimension of ["columns", "rows"] as const) {
        const value = options[dimension];
        if (value !== undefined) {
            if (!/^\d+$/.test(value))
                errors.push(`--${dimension} must be a positive integer`);
            layout[dimension] = Number(value);
        }
    }
    return prepareHostInput(
        {
            ...(usesYaml
                ? {
                      source: {
                          directory: options.path ?? process.cwd(),
                          ...(options.file === undefined
                              ? {}
                              : { file: options.file }),
                      },
                  }
                : {}),
            ...(request.selectionErrors === undefined
                ? {}
                : { selectionErrors: request.selectionErrors }),
            cliErrors: errors,
            ...(Object.keys(layout).length ? { layout } : {}),
            launch: [
                "host.run",
                "host.restart",
                "host.agent.start",
                "host.agent.restart",
            ].includes(command),
        },
        location,
    );
}
