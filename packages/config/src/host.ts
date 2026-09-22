import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

import type { HostSource } from "@aiox/protocol";
import { isAlias, isMap, isScalar, parseAllDocuments, visit } from "yaml";

import { loadConfig, type ConfigLocation } from "@/files";
import {
    ConfigError,
    keys,
    object,
    parseHostLayout,
    resolveHostLayout,
    type HostLayout,
} from "@/schema";
import { resolveTerminalLaunch } from "@/terminal";
export type { HostSource } from "@aiox/protocol";
export type HostManifest = {
    host: { name: string; instruction: string; layout?: HostLayout };
    agentOrder: string[];
    agents: Record<
        string,
        {
            adapter: "claude" | "codex";
            args: string[];
            instruction: string;
            role?: string;
            description?: string;
        }
    >;
    network: {
        name: string;
        agents: string[];
        default: "allow" | "deny";
        routes: { from: string; to: string; allowed: boolean }[];
    };
};

function text(value: unknown, field: string, name = false): string {
    if (
        typeof value !== "string" ||
        value.includes("\0") ||
        (name && (!value.trim() || value.includes("/")))
    )
        throw new ConfigError(
            `${field}: expected ${name ? "nonblank name without / or NUL" : "string without NUL"}`,
        );
    return value;
}
function names(value: unknown, field: string, minimum = 0): string[] {
    if (!Array.isArray(value) || value.length < minimum)
        throw new ConfigError(`${field}: expected at least ${minimum} names`);
    const result = value.map((item, i) => text(item, `${field}[${i}]`, true));
    if (new Set(result).size !== result.length)
        throw new ConfigError(`${field}: duplicate Agent reference`);
    return result;
}

export function parseHostManifest(source: string): HostManifest {
    const documents = parseAllDocuments(source);
    if (documents.length !== 1)
        throw new ConfigError("YAML requires a single document");
    const doc = documents[0]!;
    if (doc.errors.length || doc.warnings.length)
        throw new ConfigError(
            [...doc.errors, ...doc.warnings]
                .map((error) => error.message)
                .join("\n"),
        );
    visit(doc, {
        Node(_key, node) {
            if (node.tag && !node.tag.startsWith("tag:yaml.org,2002:"))
                throw new ConfigError("YAML custom tags are not supported");
        },
        Pair(_key, pair) {
            if (!isScalar(pair.key) || typeof pair.key.value !== "string")
                throw new ConfigError("YAML mapping keys must be strings");
        },
    });
    const input = object(doc.toJS({ maxAliasCount: 100 }), "YAML");
    keys(input, ["host", "agents", "networks"], "YAML");
    const host = object(input.host, "host");
    keys(host, ["name", "instruction", "layout"], "host");
    const definitions = object(input.agents, "agents");
    if (!Object.keys(definitions).length)
        throw new ConfigError("agents: at least one Agent required");
    const agents: HostManifest["agents"] = Object.create(null);
    for (const [name, raw] of Object.entries(definitions)) {
        text(name, `agents.${name}`, true);
        const field = `agents.${name}`;
        const agent = object(raw, field);
        keys(
            agent,
            ["adapter", "args", "instruction", "role", "description"],
            field,
        );
        if (agent.adapter !== "claude" && agent.adapter !== "codex")
            throw new ConfigError(`${field}.adapter: expected claude or codex`);
        const args = agent.args === undefined ? [] : agent.args;
        if (!Array.isArray(args))
            throw new ConfigError(`${field}.args: expected string array`);
        agents[name] = {
            adapter: agent.adapter,
            args: args.map((arg, i) => text(arg, `${field}.args[${i}]`)),
            instruction: text(
                agent.instruction === undefined ? "" : agent.instruction,
                `${field}.instruction`,
            ),
        };
        if (agent.role !== undefined) {
            const role = text(agent.role, `${field}.role`);
            if (!role.trim())
                throw new ConfigError(`${field}.role: must not be blank`);
            agents[name]!.role = role;
        }
        if (agent.description !== undefined)
            agents[name]!.description = text(
                agent.description,
                `${field}.description`,
            );
    }
    const networks = object(input.networks, "networks");
    if (Object.keys(networks).length !== 1)
        throw new ConfigError("networks: exactly one Host Network required");
    const [name, raw] = Object.entries(networks)[0]!;
    text(name, `networks.${name}`, true);
    const field = `networks.${name}`;
    const network = object(raw, field);
    keys(network, ["agents", "routing"], field);
    const members = names(network.agents, `${field}.agents`);
    for (const member of members)
        if (!Object.hasOwn(agents, member))
            throw new ConfigError(`${field}.agents: unknown Agent ${member}`);
    const routing =
        network.routing === undefined
            ? {}
            : object(network.routing, `${field}.routing`);
    keys(routing, ["default", "allow", "deny"], `${field}.routing`);
    const policy = routing.default === undefined ? "allow" : routing.default;
    if (policy !== "allow" && policy !== "deny")
        throw new ConfigError(
            `${field}.routing.default: expected allow or deny`,
        );
    const routes: HostManifest["network"]["routes"] = [];
    const seen = new Map<string, string>();
    for (const action of ["allow", "deny"] as const) {
        const rules = routing[action] === undefined ? [] : routing[action];
        if (!Array.isArray(rules))
            throw new ConfigError(`${field}.routing.${action}: expected array`);
        for (const [index, rawRule] of rules.entries()) {
            const location = `${field}.routing.${action}[${index}]`;
            const rule = object(rawRule, location);
            let pairs: [string, string][];
            if (Object.hasOwn(rule, "between")) {
                keys(rule, ["between"], location);
                const between = names(rule.between, `${location}.between`, 2);
                pairs = between.flatMap((from) =>
                    between
                        .filter((to) => to !== from)
                        .map((to) => [from, to] as [string, string]),
                );
            } else {
                keys(rule, ["from", "to"], location);
                const from = text(rule.from, `${location}.from`, true);
                pairs = names(rule.to, `${location}.to`, 1).map((to) => [
                    from,
                    to,
                ]);
            }
            for (const [from, to] of pairs) {
                if (
                    !members.includes(from) ||
                    !members.includes(to) ||
                    from === to
                )
                    throw new ConfigError(
                        `${location}: invalid Network edge ${from} -> ${to}`,
                    );
                const edge = JSON.stringify([from, to]);
                if (seen.has(edge))
                    throw new ConfigError(
                        `${location}: duplicate/conflicting edge ${from} -> ${to}; first declared at ${seen.get(edge)}`,
                    );
                seen.set(edge, location);
                routes.push({ from, to, allowed: action === "allow" });
            }
        }
    }
    const agentNode = doc.get("agents", true);
    const mapping = isAlias(agentNode) ? agentNode.resolve(doc) : agentNode;
    const agentOrder = isMap(mapping)
        ? mapping.items.map((pair) =>
              String((pair.key as { value: unknown }).value),
          )
        : Object.keys(agents);
    return {
        host: {
            name: text(host.name, "host.name", true),
            instruction: text(
                host.instruction === undefined ? "" : host.instruction,
                "host.instruction",
            ),
            ...(host.layout === undefined
                ? {}
                : { layout: parseHostLayout(host.layout, "yaml") }),
        },
        agentOrder,
        agents,
        network: { name, agents: members, default: policy, routes },
    };
}

export async function loadHostManifest(source: HostSource) {
    const path = text(source.directory, "source.directory");
    if (!path.trim())
        throw new ConfigError("source.directory must not be blank");
    const directory = resolve(path);
    if (!(await stat(directory)).isDirectory())
        throw new ConfigError(`Not a directory: ${directory}`);
    let file = source.file;
    if (file === undefined) {
        const candidates = (await readdir(directory, { withFileTypes: true }))
            .filter(
                (entry) =>
                    (entry.isFile() || entry.isSymbolicLink()) &&
                    /^aiox(?:\..*)?\.yaml$/.test(entry.name),
            )
            .map((entry) => entry.name)
            .sort();
        if (candidates.length !== 1)
            throw new ConfigError(
                candidates.length
                    ? `Multiple YAML candidates in ${directory}: ${candidates.join(", ")}. Select with --file <yaml>.`
                    : `No Host YAML in ${directory}; specify --file <yaml>.`,
            );
        file = candidates[0]!;
    }
    if (!text(file, "source.file").trim())
        throw new ConfigError("source.file must not be blank");
    file = resolve(directory, file);
    try {
        return {
            directory,
            file,
            manifest: parseHostManifest(
                new TextDecoder("utf-8", { fatal: true }).decode(
                    await readFile(file),
                ),
            ),
        };
    } catch (error) {
        throw new ConfigError(
            `${file}: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

export class HostInputError extends ConfigError {
    constructor(
        readonly stage: "config" | "yaml" | "cli" | "environment",
        error: unknown,
    ) {
        super(
            error instanceof Error ? error.message : String(error),
            error instanceof ConfigError ? error.field : undefined,
        );
    }
}
async function prepareStage<T>(
    stage: HostInputError["stage"],
    action: () => T | Promise<T>,
): Promise<T> {
    try {
        return await action();
    } catch (error) {
        throw new HostInputError(stage, error);
    }
}

/** Read-only preparation shared by CLI and the future Host HTTP handlers. */
export async function prepareHostInput(
    input: {
        source?: HostSource;
        selectionErrors?: string[];
        cliErrors?: string[];
        layout?: unknown;
        launch?: boolean;
    },
    location: ConfigLocation = {},
) {
    const config = await prepareStage("config", () => loadConfig(location));
    if (input.selectionErrors?.length)
        throw new HostInputError("cli", input.selectionErrors.join("\n"));
    const loaded =
        input.source === undefined
            ? undefined
            : await prepareStage("yaml", () => loadHostManifest(input.source!));
    if (input.cliErrors?.length)
        throw new HostInputError("cli", input.cliErrors.join("\n"));
    const layout = await prepareStage("cli", () =>
        resolveHostLayout({
            ...(config.host?.layout === undefined
                ? {}
                : { global: config.host.layout }),
            ...(loaded?.manifest.host.layout === undefined
                ? {}
                : { yaml: loaded.manifest.host.layout }),
            ...(input.layout === undefined ? {} : { cli: input.layout }),
        }),
    );
    const terminal = input.launch
        ? await prepareStage("environment", () =>
              resolveTerminalLaunch(
                  config.terminal,
                  loaded === undefined ? {} : { cwd: loaded.directory },
              ),
          )
        : undefined;
    return { config, ...loaded, layout, terminal };
}
