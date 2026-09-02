export type HostRouteOperation =
  | { op: "add"; name: string; members: string[] }
  | { op: "direct"; name: string; from: string; to: string[] }
  | { op: "remove"; name: string };

export interface HostRouteIssue {
  code: string;
  message: string;
}

export interface HostRouteSnapshot {
  name: string;
  members: string[];
  directed: Array<{ from: string; to: string }>;
}

export interface HostRouteTopology {
  readonly routes: ReadonlyMap<string, HostRouteSnapshot>;
  /** Hidden full-mesh declaration used only until the first explicit route mutation. */
  readonly implicitDefaultMembers: readonly string[] | null;
}

export type ApplyHostRouteOperationsResult =
  | { ok: true; topology: HostRouteTopology }
  | { ok: false; issues: HostRouteIssue[] };

export function emptyHostRouteTopology(): HostRouteTopology {
  return { routes: new Map(), implicitDefaultMembers: null };
}

export function createImplicitDefaultHostRouteTopology(
  declaredAgentNames: readonly string[],
): HostRouteTopology {
  return {
    routes: new Map(),
    implicitDefaultMembers: [...new Set(declaredAgentNames)],
  };
}

export function parseHostRouteOperations(
  payload: Record<string, unknown> | null,
): { ok: true; operations: HostRouteOperation[] } | { ok: false; issues: HostRouteIssue[] } {
  if (!payload || !Array.isArray(payload.routes)) {
    return {
      ok: false,
      issues: [{ code: "invalid_payload", message: "host route payload must contain routes" }],
    };
  }

  const operations: HostRouteOperation[] = [];
  for (const value of payload.routes) {
    if (typeof value !== "object" || value === null) {
      return {
        ok: false,
        issues: [{ code: "invalid_payload", message: "host route entry must be an object" }],
      };
    }
    const route = value as Record<string, unknown>;
    if (typeof route.name !== "string" || route.name.length === 0) {
      return {
        ok: false,
        issues: [{ code: "invalid_payload", message: "host route name must be non-empty" }],
      };
    }
    if (route.op === "add" && isStringArray(route.members)) {
      operations.push({ op: "add", name: route.name, members: [...route.members] });
      continue;
    }
    if (
      route.op === "direct" &&
      typeof route.from === "string" &&
      route.from.length > 0 &&
      isStringArray(route.to)
    ) {
      operations.push({ op: "direct", name: route.name, from: route.from, to: [...route.to] });
      continue;
    }
    if (route.op === "remove") {
      operations.push({ op: "remove", name: route.name });
      continue;
    }
    return {
      ok: false,
      issues: [{ code: "invalid_payload", message: `invalid route operation for "${route.name}"` }],
    };
  }
  return { ok: true, operations };
}

export function applyHostRouteOperations(
  current: HostRouteTopology,
  operations: readonly HostRouteOperation[],
  declaredAgentNames: ReadonlySet<string>,
): ApplyHostRouteOperationsResult {
  const routes = new Map<string, HostRouteSnapshot>();
  for (const [name, route] of current.routes) {
    routes.set(name, {
      name,
      members: [...route.members],
      directed: route.directed.map((edge) => ({ ...edge })),
    });
  }

  const issues: HostRouteIssue[] = [];
  const removed = new Set<string>();
  const changed = new Set<string>();
  for (const operation of operations) {
    if (operation.op === "remove") {
      if (removed.has(operation.name) || changed.has(operation.name)) {
        issues.push({
          code: "conflicting_route_mutation",
          message: `route "${operation.name}" has conflicting operations`,
        });
      } else if (!routes.has(operation.name)) {
        issues.push({ code: "unknown_route", message: `route "${operation.name}" does not exist` });
      }
      removed.add(operation.name);
      continue;
    }
    if (removed.has(operation.name)) {
      issues.push({
        code: "conflicting_route_mutation",
        message: `route "${operation.name}" has conflicting operations`,
      });
    }
    changed.add(operation.name);
    for (const reference of operation.op === "add"
      ? operation.members
      : [operation.from, ...operation.to]) {
      if (!declaredAgentNames.has(reference)) {
        issues.push({
          code: "unknown_agent",
          message: `route "${operation.name}" references unknown agent "${reference}"`,
        });
      }
    }
    if (operation.op === "direct" && operation.to.includes(operation.from)) {
      issues.push({
        code: "self_loop",
        message: `route "${operation.name}" must not declare a self-loop for "${operation.from}"`,
      });
    }
  }
  if (issues.length > 0) {
    return { ok: false, issues: deduplicateIssues(issues) };
  }

  for (const operation of operations) {
    if (operation.op !== "add") continue;
    const route = routes.get(operation.name) ?? {
      name: operation.name,
      members: [],
      directed: [],
    };
    route.members = [...new Set([...route.members, ...operation.members])];
    routes.set(operation.name, route);
  }

  for (const operation of operations) {
    if (operation.op !== "direct") continue;
    const route = routes.get(operation.name);
    if (!route) {
      issues.push({ code: "unknown_route", message: `route "${operation.name}" does not exist` });
      continue;
    }
    const members = new Set(route.members);
    for (const reference of [operation.from, ...operation.to]) {
      if (!members.has(reference)) {
        issues.push({
          code: "non_member",
          message: `route "${operation.name}" directed endpoint "${reference}" is not a member`,
        });
      }
    }
    if (issues.length === 0) {
      const directed = new Map(
        route.directed.map((edge) => [JSON.stringify([edge.from, edge.to]), edge]),
      );
      for (const to of operation.to) {
        directed.set(JSON.stringify([operation.from, to]), { from: operation.from, to });
      }
      route.directed = [...directed.values()];
    }
  }
  if (issues.length > 0) {
    return { ok: false, issues: deduplicateIssues(issues) };
  }

  for (const operation of operations) {
    if (operation.op === "remove") routes.delete(operation.name);
  }
  return {
    ok: true,
    topology: {
      routes,
      implicitDefaultMembers:
        operations.length === 0 && current.implicitDefaultMembers !== null
          ? [...declaredAgentNames]
          : null,
    },
  };
}

export function removeAgentsFromHostRouteTopology(
  current: HostRouteTopology,
  removedAgentNames: ReadonlySet<string>,
): HostRouteTopology {
  const routes = new Map<string, HostRouteSnapshot>();
  for (const [name, route] of current.routes) {
    routes.set(name, {
      name,
      members: route.members.filter((member) => !removedAgentNames.has(member)),
      directed: route.directed.filter(
        (edge) =>
          !removedAgentNames.has(edge.from) && !removedAgentNames.has(edge.to),
      ),
    });
  }
  return {
    routes,
    implicitDefaultMembers:
      current.implicitDefaultMembers?.filter((member) => !removedAgentNames.has(member)) ?? null,
  };
}

export function listHostRouteSnapshots(topology: HostRouteTopology): HostRouteSnapshot[] {
  return [...topology.routes.values()].map((route) => ({
    name: route.name,
    members: [...route.members],
    directed: route.directed.map((edge) => ({ ...edge })),
  }));
}

export function listDeclaredHostRouteEdges(
  topology: HostRouteTopology,
): Array<{ sourceName: string; targetName: string }> {
  // aiox-compose-contract §"Mesh와 directed override의 관계": `directed` narrows
  // only the pair(s) it names, to exactly the declared direction(s); every
  // pair a route's `directed` never mentions keeps the default bidirectional
  // mesh. This is resolved per-route by `routeEffectiveEdges()` below, then
  // unioned across routes here -- one route's narrowing can never delete an
  // edge a different (overlapping) route still requires.
  const edges = new Map<string, { sourceName: string; targetName: string }>();
  if (topology.implicitDefaultMembers !== null) {
    for (const edge of routeEffectiveEdges({
      name: "",
      members: [...topology.implicitDefaultMembers],
      directed: [],
    })) {
      edges.set(JSON.stringify([edge.sourceName, edge.targetName]), edge);
    }
  }
  for (const route of topology.routes.values()) {
    for (const edge of routeEffectiveEdges(route)) {
      edges.set(JSON.stringify([edge.sourceName, edge.targetName]), edge);
    }
  }
  return [...edges.values()];
}

function routeEffectiveEdges(
  route: HostRouteSnapshot,
): Array<{ sourceName: string; targetName: string }> {
  const directedByPair = new Map<string, Array<{ from: string; to: string }>>();
  for (const edge of route.directed) {
    const key = unorderedPairKey(edge.from, edge.to);
    const existing = directedByPair.get(key);
    if (existing) {
      existing.push(edge);
    } else {
      directedByPair.set(key, [edge]);
    }
  }

  const edges: Array<{ sourceName: string; targetName: string }> = [];
  const members = [...new Set(route.members)];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i]!;
      const b = members[j]!;
      const directedForPair = directedByPair.get(unorderedPairKey(a, b));
      if (directedForPair === undefined) {
        // Neither direction of this pair is named in `directed`: mesh default.
        edges.push({ sourceName: a, targetName: b });
        edges.push({ sourceName: b, targetName: a });
      } else {
        // At least one direction is named: the pair narrows to exactly the
        // declared direction(s), whether that's one or both.
        for (const edge of directedForPair) {
          edges.push({ sourceName: edge.from, targetName: edge.to });
        }
      }
    }
  }
  return edges;
}

function unorderedPairKey(a: string, b: string): string {
  return a < b ? JSON.stringify([a, b]) : JSON.stringify([b, a]);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

function deduplicateIssues(issues: readonly HostRouteIssue[]): HostRouteIssue[] {
  return [...new Map(issues.map((issue) => [JSON.stringify(issue), issue])).values()];
}
