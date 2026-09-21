import {
    isAlias,
    isMap,
    isScalar,
    isSeq,
    parseAllDocuments,
    visit,
} from "yaml";

export type Span = { start: number; end: number };
export type Issue = Span & { message: string };
type Named = Span & { name: string };
type Slot = {
    node: unknown;
    members: string[] | undefined;
    excluded: string[];
};

export function isHostFile(path: string): boolean {
    return /^aiox(?:\..*)?\.yaml$/.test(path.split(/[\\/]/).at(-1) ?? "");
}

function span(node: unknown): Span | undefined {
    if (!node || typeof node !== "object" || !("range" in node)) return;
    const range = node.range;
    if (
        !Array.isArray(range) ||
        typeof range[0] !== "number" ||
        typeof range[1] !== "number"
    )
        return;
    return { start: range[0], end: range[1] };
}

function value(node: unknown): string | undefined {
    return isScalar(node) && typeof node.value === "string"
        ? node.value
        : undefined;
}

function get(node: unknown, key: string): unknown {
    return isMap(node) ? node.get(key, true) : undefined;
}

function names(node: unknown): Named[] {
    if (!isSeq(node)) return [];
    return node.items.flatMap((item) => {
        const name = value(item);
        const range = span(item);
        return name !== undefined && range ? [{ name, ...range }] : [];
    });
}

function contains(node: unknown, offset: number): boolean {
    const range = span(node);
    return !!range && range.start <= offset && offset <= range.end;
}

function model(text: string) {
    const documents = parseAllDocuments(text, { keepSourceTokens: true });
    const doc = documents[0];
    const resolve = (node: unknown): unknown =>
        isAlias(node) && doc ? node.resolve(doc) : node;
    const field = (node: unknown, key: string): unknown =>
        resolve(get(resolve(node), key));
    const list = (node: unknown): Named[] => {
        const sequence = resolve(node);
        if (!isSeq(sequence)) return [];
        return sequence.items.flatMap((item) => {
            const name = value(resolve(item));
            const range = span(item);
            return name !== undefined && range ? [{ name, ...range }] : [];
        });
    };
    const declarations = new Map<string, Named>();
    const slots: Slot[] = [];
    const issues: Issue[] = [];
    const root = doc?.contents;
    const agents = field(root, "agents");
    if (isMap(agents)) {
        for (const pair of agents.items) {
            const name = value(pair.key);
            const range = span(pair.key);
            if (name !== undefined && range)
                declarations.set(name, { name, ...range });
        }
    }
    const report = (node: unknown, message: string) => {
        const range = span(node);
        if (range) issues.push({ ...range, message });
    };
    if (documents.length > 1) {
        for (const extra of documents.slice(1))
            report(extra, "AIOX accepts a single YAML document.");
        return { declarations, slots, issues, doc };
    }
    if (doc)
        visit(doc, {
            Node(_key, node) {
                if (node.tag && !node.tag.startsWith("tag:yaml.org,2002:"))
                    report(node, "Custom YAML tags are not supported by AIOX.");
            },
            Pair(_key, pair) {
                if (value(pair.key) === undefined)
                    report(pair.key, "AIOX mapping keys must be strings.");
            },
        });

    const networks = field(root, "networks");
    if (isMap(networks))
        for (const network of networks.items) {
            const memberNode = field(network.value, "agents");
            const members = list(memberNode);
            const memberNames = members.map((item) => item.name);
            slots.push({
                node: get(resolve(network.value), "agents"),
                members: undefined,
                excluded: [],
            });
            for (const member of members) {
                if (!declarations.has(member.name))
                    issues.push({
                        ...member,
                        message: `Unknown Agent "${member.name}".`,
                    });
            }
            const routing = field(network.value, "routing");
            const seen = new Map<string, string>();
            for (const policy of ["allow", "deny"]) {
                const edges = field(routing, policy);
                if (!isSeq(edges)) continue;
                for (const edgeItem of edges.items) {
                    const edge = resolve(edgeItem);
                    if (!isMap(edge)) continue;
                    const between = field(edge, "between");
                    const from = field(edge, "from");
                    const to = field(edge, "to");
                    const fromName = value(from);
                    slots.push(
                        {
                            node: get(edge, "between"),
                            members: memberNames,
                            excluded: [],
                        },
                        {
                            node: get(edge, "from"),
                            members: memberNames,
                            excluded: list(to).map((item) => item.name),
                        },
                        {
                            node: get(edge, "to"),
                            members: memberNames,
                            excluded: fromName === undefined ? [] : [fromName],
                        },
                    );
                    // Structural/type errors belong to the YAML schema, not duplicate diagnostics here.
                    const paired =
                        isSeq(between) && !edge.has("from") && !edge.has("to");
                    const directed =
                        !edge.has("between") &&
                        fromName !== undefined &&
                        isSeq(to);
                    if (!paired && !directed) continue;
                    const references = paired
                        ? list(between)
                        : [
                              ...(span(from)
                                  ? [{ name: fromName!, ...span(from)! }]
                                  : []),
                              ...list(to),
                          ];
                    let invalid = false;
                    for (const reference of references) {
                        if (!memberNames.includes(reference.name)) {
                            issues.push({
                                ...reference,
                                message: `Agent "${reference.name}" is not a member of this Network.`,
                            });
                            invalid = true;
                        }
                    }
                    if (
                        invalid ||
                        (new Set(references.map((item) => item.name)).size !==
                            references.length &&
                            paired)
                    )
                        continue;
                    const pairs: [Named, Named][] = paired
                        ? references.flatMap((a) =>
                              references
                                  .filter((b) => a.name !== b.name)
                                  .map((b): [Named, Named] => [a, b]),
                          )
                        : references.slice(1).map((b) => [references[0]!, b]);
                    for (const [a, b] of pairs) {
                        if (a.name === b.name) {
                            issues.push({
                                ...b,
                                message: `Agent "${a.name}" cannot route to itself.`,
                            });
                            continue;
                        }
                        const key = JSON.stringify([a.name, b.name]);
                        const previous = seen.get(key);
                        if (previous !== undefined)
                            issues.push({
                                ...b,
                                message: `${previous === policy ? "Duplicate" : "Conflicting"} route ${a.name} → ${b.name} (${previous}/${policy}).`,
                            });
                        else seen.set(key, policy);
                    }
                }
            }
        }
    // A half-typed document is useful for completion, but not for relationship diagnostics.
    if (doc?.errors.length) issues.length = 0;
    return { declarations, slots, issues, doc };
}

export function analyze(text: string): { issues: Issue[] } {
    return { issues: model(text).issues };
}

export function complete(
    text: string,
    offset: number,
): (Named & { replace?: Span; insertText: string })[] {
    const { declarations, slots } = model(text);
    const slot = slots.find((entry) => contains(entry.node, offset));
    if (!slot) return [];
    const references = isSeq(slot.node) ? names(slot.node) : [];
    const existing = references
        .filter((ref) => offset < ref.start || offset > ref.end)
        .map((ref) => ref.name);
    const current = isSeq(slot.node)
        ? slot.node.items.find((node) => contains(node, offset))
        : slot.node;
    const replace = span(current);
    const singleQuoted = replace && text[replace.start] === "'";
    return [...declarations.values()]
        .filter(
            (entry) =>
                (slot.members === undefined ||
                    slot.members.includes(entry.name)) &&
                !slot.excluded.includes(entry.name) &&
                !existing.includes(entry.name),
        )
        .map((entry) => ({
            ...entry,
            ...(replace ? { replace } : {}),
            insertText: singleQuoted
                ? `'${entry.name.replaceAll("'", "''")}'`
                : JSON.stringify(entry.name),
        }));
}

export function definition(text: string, offset: number): Span | undefined {
    const { declarations, slots } = model(text);
    for (const slot of slots) {
        const nodes = isSeq(slot.node) ? slot.node.items : [slot.node];
        for (const node of nodes) {
            const name = value(node);
            if (name !== undefined && contains(node, offset))
                return declarations.get(name);
        }
    }
}

export function hover(text: string, offset: number): string | undefined {
    const { doc } = model(text);
    const root = doc?.contents;
    if (!isMap(root)) return;
    const hostPair = root.items.find((pair) => value(pair.key) === "host");
    if (
        hostPair &&
        (contains(hostPair.key, offset) || contains(hostPair.value, offset))
    ) {
        const instruction = value(get(hostPair.value, "instruction"));
        return `Host common instruction: ${instruction ? "set" : "not set (empty)"}.\n\nNon-empty Agent instructions follow the Host instruction, separated by a blank line. Vendor collaboration instructions are composed separately.`;
    }
    const networks = get(root, "networks");
    if (isMap(networks))
        for (const pair of networks.items) {
            if (!contains(pair.key, offset) && !contains(pair.value, offset))
                continue;
            const routing = get(pair.value, "routing");
            if (routing !== undefined && !isMap(routing)) return;
            const policy = value(get(routing, "default"));
            if (policy !== undefined && policy !== "allow" && policy !== "deny")
                return;
            if (
                isMap(routing) &&
                routing.has("default") &&
                policy === undefined
            )
                return;
            return `Manifest default: **${policy ?? "allow"}** (${policy === undefined ? "default omitted" : "explicit"}).\n\nExplicit YAML edges override this default. This describes the file, not any running Host's applied policy.`;
        }
}
