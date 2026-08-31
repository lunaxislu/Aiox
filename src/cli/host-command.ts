import type { Command } from "commander";

import type { AgentKind } from "../core/agent-kind.js";
import {
  parseAioxConfig,
  type AioxConfig,
  type AioxAgentType,
  type AioxDirectedEntry,
  type AioxRouteConfig,
} from "../config/aiox-config.js";
import { validateAioxConfigSemantics } from "../config/aiox-config-validator.js";
import { CliParseError, CLI_PARSE_ERROR_EXIT_CODE, requireNonEmptyName, requireNonEmptyText } from "./cli-errors.js";
import type { ParsedCommand } from "./parse.js";

/**
 * `aiox host`'s CLI-only grammar (Task Brief revision 8, §5-6): host name/agent/route
 * blocks repeat and interleave in ways commander's declarative `.option()` model cannot
 * express (the same flag name, e.g. `--name`, means something different inside each
 * repeated `--agent`/`--route` block). `registerHostCommand` below hands the whole
 * `host` subcommand's raw argv to `parseHostArgs`, which tokenizes it by hand instead of
 * forcing this shape onto commander's subcommand tree.
 */

export interface HostAgentBlock {
  agentKind: AgentKind;
  name: string;
  role?: string;
  description?: string;
  instructions?: string;
}

export type HostRouteOp =
  | { op: "add"; name: string; members: string[] }
  | { op: "direct"; name: string; from: string; to: string[] }
  | { op: "remove"; name: string };

type HostNewCommand = Extract<ParsedCommand, { kind: "host-new" }>;
type HostAddCommand = Extract<ParsedCommand, { kind: "host-add" }>;
type HostRemoveCommand = Extract<ParsedCommand, { kind: "host-remove" }>;
type HostRouteCommand = Extract<ParsedCommand, { kind: "host-route" }>;

const HOST_RESERVED_NAMES: ReadonlySet<string> = new Set(["new", "add", "remove", "route", "list"]);
const AGENT_BLOCK_FLAGS: ReadonlySet<string> = new Set([
  "--name",
  "--role",
  "--description",
  "--instructions",
]);

// ---------------------------------------------------------------------------
// Commander wiring
// ---------------------------------------------------------------------------

export function registerHostCommand(
  program: Command,
  setParsed: (command: ParsedCommand) => void,
): void {
  program
    .command("host")
    .description(
      "Run aiox.yaml agents (cwd-fixed, or --path) in native terminal surfaces, or manage a " +
        "CLI-only host: --list, new, <name> add, <name> remove, <name> route",
    )
    .allowUnknownOption()
    .argument("[args...]")
    .action((args: string[]) => {
      setParsed(parseHostArgs(args));
    });
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function parseHostArgs(tokens: readonly string[]): ParsedCommand {
  const list = [...tokens];

  if (list.length === 0) {
    return { kind: "host" };
  }

  const first = list[0]!;

  if (first === "--list") {
    if (list.length > 1) {
      throw unknownOption(list[1]!);
    }
    return { kind: "host-list" };
  }

  if (first === "new") {
    return parseHostNew(list.slice(1));
  }

  if (first === "--path") {
    const { value, nextIndex } = consumeFlagValue(list, 0, "--path");
    if (nextIndex < list.length) {
      throw unknownOption(list[nextIndex]!);
    }
    return { kind: "host", path: value };
  }

  if (first.startsWith("--")) {
    throw unknownOption(first);
  }

  const name = requireNonReservedHostName(requireNonEmptyName(first));
  return parseHostNamedTail(name, list.slice(1));
}

function parseHostNamedTail(name: string, rest: string[]): ParsedCommand {
  let path: string | undefined;
  let idx = 0;

  if (rest[0] === "--path") {
    const consumed = consumeFlagValue(rest, 0, "--path");
    path = consumed.value;
    idx = consumed.nextIndex;
  }

  if (idx >= rest.length) {
    if (path === undefined) {
      throw missingRequiredOption("--path");
    }
    return { kind: "host", name, path };
  }

  const action = rest[idx]!;
  const remaining = rest.slice(idx + 1);

  switch (action) {
    case "add":
      return parseHostAdd(name, path, remaining);
    case "remove":
      return parseHostRemove(name, path, remaining);
    case "route":
      return parseHostRoute(name, path, remaining);
    default:
      throw unknownOption(action);
  }
}

function parseHostNew(rest: string[]): ParsedCommand {
  if (rest[0] !== "--name") {
    throw missingRequiredOption("--name");
  }
  const { value, nextIndex } = consumeFlagValue(rest, 0, "--name");
  const name = requireNonReservedHostName(requireNonEmptyName(value));

  const { agents, routes } = parseAgentAndRouteBlocks(rest.slice(nextIndex), {
    disallowRouteRemove: true,
  });

  if (agents.length === 0) {
    throw missingAgentBlocks();
  }

  return {
    kind: "host-new",
    name,
    agents,
    ...(routes.length > 0 ? { routes } : {}),
  };
}

function parseHostAdd(name: string, path: string | undefined, tokens: string[]): ParsedCommand {
  const { agents, routes } = parseAgentAndRouteBlocks(tokens, { disallowRouteRemove: true });

  if (agents.length === 0) {
    throw missingAgentBlocks();
  }

  return {
    kind: "host-add",
    name,
    ...(path === undefined ? {} : { path }),
    agents,
    ...(routes.length > 0 ? { routes } : {}),
  };
}

function parseHostRemove(name: string, path: string | undefined, tokens: string[]): ParsedCommand {
  const agentNames: string[] = [];
  let i = 0;

  while (i < tokens.length && tokens[i] === "--agent") {
    const { value, nextIndex } = consumeFlagValue(tokens, i, "--agent");
    agentNames.push(requireNonEmptyName(value));
    i = nextIndex;
  }

  if (i < tokens.length) {
    throw unknownOption(tokens[i]!);
  }

  if (agentNames.length === 0) {
    throw missingAgentBlocks();
  }

  return {
    kind: "host-remove",
    name,
    ...(path === undefined ? {} : { path }),
    agentNames,
  };
}

function parseHostRoute(name: string, path: string | undefined, tokens: string[]): ParsedCommand {
  const routes: HostRouteOp[] = [];
  let i = 0;

  while (i < tokens.length && tokens[i] === "--route") {
    const { route, nextIndex } = parseRouteBlock(tokens, i, false);
    routes.push(route);
    i = nextIndex;
  }

  if (i < tokens.length) {
    throw unknownOption(tokens[i]!);
  }

  if (routes.length === 0) {
    throw missingRouteBlocks();
  }

  return {
    kind: "host-route",
    name,
    ...(path === undefined ? {} : { path }),
    routes,
  };
}

function parseAgentAndRouteBlocks(
  tokens: string[],
  opts: { disallowRouteRemove: boolean },
): { agents: HostAgentBlock[]; routes: HostRouteOp[] } {
  const agents: HostAgentBlock[] = [];
  const routes: HostRouteOp[] = [];
  let i = 0;

  while (i < tokens.length && tokens[i] === "--agent") {
    const { agent, nextIndex } = parseAgentBlock(tokens, i);
    agents.push(agent);
    i = nextIndex;
  }

  while (i < tokens.length && tokens[i] === "--route") {
    const { route, nextIndex } = parseRouteBlock(tokens, i, opts.disallowRouteRemove);
    routes.push(route);
    i = nextIndex;
  }

  if (i < tokens.length) {
    throw unknownOption(tokens[i]!);
  }

  return { agents, routes };
}

function parseAgentBlock(
  tokens: string[],
  index: number,
): { agent: HostAgentBlock; nextIndex: number } {
  const kindResult = consumeFlagValue(tokens, index, "--agent");
  const agentKind = requireAgentKind(kindResult.value);
  let idx = kindResult.nextIndex;

  const seen = new Set<string>();
  let name: string | undefined;
  let role: string | undefined;
  let description: string | undefined;
  let instructions: string | undefined;

  while (idx < tokens.length && AGENT_BLOCK_FLAGS.has(tokens[idx]!)) {
    const flag = tokens[idx]!;
    if (seen.has(flag)) {
      throw duplicateOption(flag);
    }
    seen.add(flag);
    const result = consumeFlagValue(tokens, idx, flag);
    idx = result.nextIndex;

    if (flag === "--name") {
      name = requireNonEmptyName(result.value);
    } else if (flag === "--role") {
      role = requireNonEmptyText(result.value, "--role");
    } else if (flag === "--description") {
      description = requireNonEmptyText(result.value, "--description");
    } else {
      instructions = requireNonEmptyText(result.value, "--instructions");
    }
  }

  if (name === undefined) {
    throw missingRequiredOption("--name");
  }

  return {
    agent: {
      agentKind,
      name,
      ...(role === undefined ? {} : { role }),
      ...(description === undefined ? {} : { description }),
      ...(instructions === undefined ? {} : { instructions }),
    },
    nextIndex: idx,
  };
}

function parseRouteBlock(
  tokens: string[],
  index: number,
  disallowRemove: boolean,
): { route: HostRouteOp; nextIndex: number } {
  const opValue = consumeFlagValue(tokens, index, "--route");
  const op = requireRouteOperation(opValue.value);

  if (op === "remove" && disallowRemove) {
    throw new CliParseError("route remove is not allowed while creating a host", {
      code: "aiox.routeRemoveDuringCreate",
      exitCode: CLI_PARSE_ERROR_EXIT_CODE,
    });
  }

  let idx = opValue.nextIndex;
  const seen = new Set<string>();
  let name: string | undefined;
  let members: string[] | undefined;
  let from: string | undefined;
  let to: string[] | undefined;

  const allowedFlags: ReadonlySet<string> =
    op === "add"
      ? new Set(["--name", "--members"])
      : op === "direct"
        ? new Set(["--name", "--from", "--to"])
        : new Set(["--name"]);

  while (idx < tokens.length && allowedFlags.has(tokens[idx]!)) {
    const flag = tokens[idx]!;
    if (seen.has(flag)) {
      throw duplicateOption(flag);
    }
    seen.add(flag);
    const result = consumeFlagValue(tokens, idx, flag);
    idx = result.nextIndex;

    if (flag === "--name") {
      name = requireNonEmptyName(result.value);
    } else if (flag === "--members") {
      members = splitCommaList(result.value);
    } else if (flag === "--from") {
      from = requireNonEmptyName(result.value);
    } else {
      to = splitCommaList(result.value);
    }
  }

  if (name === undefined) {
    throw missingRequiredOption("--name");
  }

  if (op === "add") {
    if (members === undefined) {
      throw missingRequiredOption("--members");
    }
    return { route: { op: "add", name, members }, nextIndex: idx };
  }

  if (op === "direct") {
    if (from === undefined) {
      throw missingRequiredOption("--from");
    }
    if (to === undefined) {
      throw missingRequiredOption("--to");
    }
    return { route: { op: "direct", name, from, to }, nextIndex: idx };
  }

  return { route: { op: "remove", name }, nextIndex: idx };
}

function splitCommaList(value: string): string[] {
  return value.split(",").map((part) => requireNonEmptyName(part));
}

function consumeFlagValue(
  tokens: readonly string[],
  index: number,
  flagLabel: string,
): { value: string; nextIndex: number } {
  const value = tokens[index + 1];
  if (value === undefined) {
    throw missingRequiredOption(flagLabel);
  }
  return { value, nextIndex: index + 2 };
}

function requireNonReservedHostName(name: string): string {
  if (HOST_RESERVED_NAMES.has(name)) {
    throw new CliParseError(
      `"${name}" is a reserved host CLI keyword and cannot be used as a host name`,
      { code: "aiox.invalidHostName", exitCode: CLI_PARSE_ERROR_EXIT_CODE },
    );
  }
  return name;
}

function requireAgentKind(value: string): AgentKind {
  if (value === "codex" || value === "claude") {
    return value;
  }
  throw new CliParseError(`invalid agent kind "${value}"; expected "codex" or "claude"`, {
    code: "aiox.invalidAgentKind",
    exitCode: CLI_PARSE_ERROR_EXIT_CODE,
  });
}

function requireRouteOperation(value: string): "add" | "direct" | "remove" {
  if (value === "add" || value === "direct" || value === "remove") {
    return value;
  }
  throw new CliParseError(
    `invalid route operation "${value}"; expected "add", "direct", or "remove"`,
    { code: "aiox.invalidRouteOperation", exitCode: CLI_PARSE_ERROR_EXIT_CODE },
  );
}

function unknownOption(token: string): CliParseError {
  return new CliParseError(`unknown option '${token}'`, {
    code: "aiox.unknownOption",
    exitCode: CLI_PARSE_ERROR_EXIT_CODE,
  });
}

function missingRequiredOption(label: string): CliParseError {
  return new CliParseError(`required option '${label}' not specified`, {
    code: "aiox.missingRequiredOption",
    exitCode: CLI_PARSE_ERROR_EXIT_CODE,
  });
}

function duplicateOption(flag: string): CliParseError {
  return new CliParseError(`option '${flag}' specified more than once`, {
    code: "aiox.duplicateOption",
    exitCode: CLI_PARSE_ERROR_EXIT_CODE,
  });
}

function missingAgentBlocks(): CliParseError {
  return new CliParseError("at least one --agent block is required", {
    code: "aiox.missingAgentBlocks",
    exitCode: CLI_PARSE_ERROR_EXIT_CODE,
  });
}

function missingRouteBlocks(): CliParseError {
  return new CliParseError("at least one --route block is required", {
    code: "aiox.missingRouteBlocks",
    exitCode: CLI_PARSE_ERROR_EXIT_CODE,
  });
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------
//
// ParsedCommand -> normalize -> Host declaration | Host mutation (Task Brief §7).
//
// CLI-only `host-new` reuses the existing aiox.yaml structural/semantic
// validators as-is (`parseAioxConfig` + `validateAioxConfigSemantics`) instead
// of re-implementing namespace-uniqueness/dangling-reference/self-loop checks:
// the CLI-declared agents/routes are reshaped into the same `AioxConfig` shape
// YAML produces, so both sources can feed the same runtime pipeline in later
// stages (§7, §5 grammar intro).
//
// Running-host mutations (`host-add`/`host-remove`/`host-route`) are NOT
// force-converted into `AioxConfig` (§7): the checks that require knowing a
// running host's actual current agents/routes (unknown-agent reference,
// already-exists, overlapping route reconciliation) are explicitly left to a
// later stage that has that snapshot. Only the mutation's own self-contained
// structure is validated here: duplicate agent names within the same batch,
// and — for routes — a self-loop or a duplicate directed pair within the same
// batch, or a route name that both is and is not being removed in the same
// call. None of these require external state.

export function normalizeHostDeclaration(command: HostNewCommand): AioxConfig {
  const candidate: unknown = {
    project: command.name,
    agents: command.agents.map((agent) => ({
      name: agent.name,
      type: toAioxAgentType(agent.agentKind),
      ...(agent.role === undefined ? {} : { role: agent.role }),
      ...(agent.description === undefined ? {} : { description: agent.description }),
      ...(agent.instructions === undefined ? {} : { instructions: agent.instructions }),
    })),
    ...(command.routes && command.routes.length > 0
      ? { routes: buildDeclaredRouteConfigs(command.routes) }
      : {}),
  };

  const config = parseAioxConfig(candidate);
  validateAioxConfigSemantics(config);
  return config;
}

function toAioxAgentType(agentKind: AgentKind): AioxAgentType {
  switch (agentKind) {
    case "codex":
      return "codex";
    case "claude":
      return "claude-code";
    default: {
      const exhaustive: never = agentKind;
      throw new Error(`unsupported agent kind: ${exhaustive as string}`);
    }
  }
}

function buildDeclaredRouteConfigs(ops: readonly HostRouteOp[]): AioxRouteConfig[] {
  const order: string[] = [];
  const membersByName = new Map<string, Set<string>>();
  const directedByName = new Map<string, AioxDirectedEntry[]>();

  for (const op of ops) {
    if (!membersByName.has(op.name)) {
      order.push(op.name);
      membersByName.set(op.name, new Set());
      directedByName.set(op.name, []);
    }

    if (op.op === "add") {
      const members = membersByName.get(op.name)!;
      for (const member of op.members) {
        members.add(member);
      }
    } else if (op.op === "direct") {
      directedByName.get(op.name)!.push({ from: op.from, to: op.to });
    } else {
      // op.op === "remove": the parser rejects route remove for create-context
      // callers (`aiox.routeRemoveDuringCreate`), so this is unreachable for
      // real parsed input, not a case the `HostRouteOp` type itself rules out.
      throw new Error(`unexpected route remove op while declaring a host: ${JSON.stringify(op)}`);
    }
  }

  return order.map((name) => {
    const directed = directedByName.get(name)!;
    return {
      name,
      members: [...membersByName.get(name)!],
      ...(directed.length > 0 ? { directed } : {}),
    };
  });
}

export type NormalizedHostMutation = HostAddCommand | HostRemoveCommand | HostRouteCommand;

export function normalizeHostMutation(command: NormalizedHostMutation): NormalizedHostMutation {
  switch (command.kind) {
    case "host-add":
      requireNoDuplicateNames(
        command.agents.map((agent) => agent.name),
        "agent",
      );
      if (command.routes && command.routes.length > 0) {
        validateRouteMutationBatch(command.routes);
      }
      return command;
    case "host-remove":
      requireNoDuplicateNames(command.agentNames, "agent");
      return command;
    case "host-route":
      validateRouteMutationBatch(command.routes);
      return command;
    default: {
      const exhaustive: never = command;
      throw new Error(`unsupported host mutation: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function requireNoDuplicateNames(names: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      throw new CliParseError(`Duplicate ${label} "${name}" in host mutation`, {
        code: "aiox.duplicateAgentInMutation",
        exitCode: CLI_PARSE_ERROR_EXIT_CODE,
      });
    }
    seen.add(name);
  }
}

function validateRouteMutationBatch(routes: readonly HostRouteOp[]): void {
  const groups = new Map<string, { hasAdd: boolean; hasDirect: boolean; hasRemove: boolean }>();
  const seenPairsByName = new Map<string, Set<string>>();

  for (const op of routes) {
    const group = groups.get(op.name) ?? { hasAdd: false, hasDirect: false, hasRemove: false };

    if (op.op === "add") {
      // Repeated `route add` blocks for the same name are not a confirmed
      // conflict in the accepted Stage 2 contract (Task Brief §7): running
      // snapshot / final route reconciliation is Stage 3+. Preserve every
      // block as-is instead of rejecting.
      group.hasAdd = true;
    } else if (op.op === "remove") {
      group.hasRemove = true;
    } else {
      group.hasDirect = true;
      const pairs = seenPairsByName.get(op.name) ?? new Set<string>();
      for (const to of op.to) {
        if (to === op.from) {
          throw new CliParseError(
            `routes[].direct must not declare a self-loop ("${op.from}" -> "${to}") for route "${op.name}"`,
            { code: "aiox.invalidRouteMutation", exitCode: CLI_PARSE_ERROR_EXIT_CODE },
          );
        }
        // Agent names have no restriction against "->", so a delimited string
        // template (`${from}->${to}`) can collide across distinct pairs
        // (e.g. from="a->b",to="c" vs from="a",to="b->c"). JSON-encode the
        // tuple instead, which cannot collide across distinct [from, to].
        const pairKey = JSON.stringify([op.from, to]);
        if (pairs.has(pairKey)) {
          throw new CliParseError(
            `Duplicate directed pair ("${op.from}" -> "${to}") for route "${op.name}"`,
            { code: "aiox.invalidRouteMutation", exitCode: CLI_PARSE_ERROR_EXIT_CODE },
          );
        }
        pairs.add(pairKey);
      }
      seenPairsByName.set(op.name, pairs);
    }

    groups.set(op.name, group);
  }

  for (const [name, group] of groups) {
    if (group.hasRemove && (group.hasAdd || group.hasDirect)) {
      throw conflictingRouteMutation(name);
    }
  }
}

function conflictingRouteMutation(name: string): CliParseError {
  return new CliParseError(`route "${name}" has conflicting operations within the same mutation`, {
    code: "aiox.conflictingRouteMutation",
    exitCode: CLI_PARSE_ERROR_EXIT_CODE,
  });
}
