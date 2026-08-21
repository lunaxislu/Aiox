import {
  AIOX_CONFIG_FILE_NAME,
  AioxConfigError,
  type AioxConfig,
  type AioxConfigSemanticIssue,
  type AioxDirectedEntry,
} from "./aiox-config.js";

/**
 * aiox.yaml v1 semantic validator (docs/specs/aiox-compose-contract.md §6 Validator
 * Rules).
 *
 * Runs after W4's structural parse (`parseAioxConfig`/`loadAioxConfig`) as a separate
 * step — it assumes `config` already conforms to `aioxConfigSchema` and only checks
 * cross-field/cross-list semantics the schema cannot express:
 *
 * 1. `agents[].name` namespace uniqueness.
 * 2. `routes[].name` namespace uniqueness (independent from the agents namespace).
 * 3. `routes[].members` / `routes[].directed[].from` / `.to` must reference a declared
 *    `agents[].name`. `directed[].from`/`.to` must additionally be a member of that same
 *    route (an agent that exists globally but was not listed in this route's `members` is
 *    rejected too — `directed` narrows a mesh pair inside the route's own participant set,
 *    it cannot reach outside it).
 * 4. `routes[].directed[]` must not declare the same `{from, to}` pair twice within the
 *    same route (`to` arrays are flattened before comparison).
 * 5. `agents[].name` must not be the reserved broadcast sentinel `"*"`.
 * 6. `routes[].directed[]` must not declare a self-loop (`from === to`, checked after
 *    flattening array `to`) — a `directed` entry overrides one mesh pair, and an agent is
 *    never its own mesh peer, so there is no pair for a self-loop to override.
 *
 * All violations are collected and reported together (one `AioxConfigError`, code
 * `invalid_semantics`) rather than failing on the first one, matching the aggregate-issue
 * style `parseAioxConfig` already uses for schema errors.
 */

export const AIOX_RESERVED_AGENT_NAME = "*";

export function validateAioxConfigSemantics(config: AioxConfig): void {
  const issues: AioxConfigSemanticIssue[] = [];

  validateAgentNames(config, issues);
  const agentNames = new Set(config.agents.map((agent) => agent.name));
  validateRoutes(config, agentNames, issues);

  if (issues.length > 0) {
    const message = issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
    throw new AioxConfigError(`Invalid ${AIOX_CONFIG_FILE_NAME} semantics:\n${message}`, {
      code: "invalid_semantics",
      semanticIssues: issues,
    });
  }
}

function validateAgentNames(config: AioxConfig, issues: AioxConfigSemanticIssue[]): void {
  const firstIndexByName = new Map<string, number>();

  config.agents.forEach((agent, agentIndex) => {
    const path = `agents.${agentIndex}.name`;

    if (agent.name === AIOX_RESERVED_AGENT_NAME) {
      issues.push({
        path,
        message: `agents[].name must not use the reserved broadcast sentinel "${AIOX_RESERVED_AGENT_NAME}"`,
      });
    }

    const firstIndex = firstIndexByName.get(agent.name);
    if (firstIndex !== undefined) {
      issues.push({
        path,
        message: `Duplicate agents[].name "${agent.name}" (already declared at agents.${firstIndex}.name)`,
      });
    } else {
      firstIndexByName.set(agent.name, agentIndex);
    }
  });
}

function validateRoutes(
  config: AioxConfig,
  agentNames: Set<string>,
  issues: AioxConfigSemanticIssue[],
): void {
  const routes = config.routes ?? [];
  const firstIndexByName = new Map<string, number>();

  routes.forEach((route, routeIndex) => {
    const namePath = `routes.${routeIndex}.name`;
    const firstIndex = firstIndexByName.get(route.name);
    if (firstIndex !== undefined) {
      issues.push({
        path: namePath,
        message: `Duplicate routes[].name "${route.name}" (already declared at routes.${firstIndex}.name)`,
      });
    } else {
      firstIndexByName.set(route.name, routeIndex);
    }

    route.members.forEach((member, memberIndex) => {
      if (!agentNames.has(member)) {
        issues.push({
          path: `routes.${routeIndex}.members.${memberIndex}`,
          message: `routes[].members references unknown agent "${member}"`,
        });
      }
    });

    const memberNames = new Set(route.members);
    validateDirected(route.directed ?? [], routeIndex, memberNames, agentNames, issues);
  });
}

function validateDirected(
  directed: AioxDirectedEntry[],
  routeIndex: number,
  memberNames: Set<string>,
  agentNames: Set<string>,
  issues: AioxConfigSemanticIssue[],
): void {
  const seenPairs = new Set<string>();

  const checkReference = (name: string, path: string, field: "from" | "to"): void => {
    if (!agentNames.has(name)) {
      issues.push({
        path,
        message: `routes[].directed[].${field} references unknown agent "${name}"`,
      });
      return;
    }

    if (!memberNames.has(name)) {
      issues.push({
        path,
        message: `routes[].directed[].${field} references agent "${name}" that is not a member of routes.${routeIndex}`,
      });
    }
  };

  directed.forEach((entry, directedIndex) => {
    const fromPath = `routes.${routeIndex}.directed.${directedIndex}.from`;
    checkReference(entry.from, fromPath, "from");

    const toNames = Array.isArray(entry.to) ? entry.to : [entry.to];

    toNames.forEach((to, toIndex) => {
      const toPath = Array.isArray(entry.to)
        ? `routes.${routeIndex}.directed.${directedIndex}.to.${toIndex}`
        : `routes.${routeIndex}.directed.${directedIndex}.to`;

      checkReference(to, toPath, "to");

      if (to === entry.from) {
        issues.push({
          path: toPath,
          message: `routes[].directed[] must not declare a self-loop ("${entry.from}" -> "${to}")`,
        });
      }

      const pairKey = JSON.stringify([entry.from, to]);
      if (seenPairs.has(pairKey)) {
        issues.push({
          path: toPath,
          message: `Duplicate routes[].directed[] pair ("${entry.from}" -> "${to}") within routes.${routeIndex}`,
        });
      } else {
        seenPairs.add(pairKey);
      }
    });
  });
}
