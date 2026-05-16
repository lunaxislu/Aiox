export const routeStatuses = ["active"] as const;

export type RouteStatus = (typeof routeStatuses)[number];

export interface Route {
  sourceAgentId: string;
  targetAgentId: string;
  status: RouteStatus;
}

export interface CreateDirectedRoutesRequest {
  sourceAgentId: string;
  targetAgentIds: readonly string[];
}

export function createDirectedRoutes(
  request: CreateDirectedRoutesRequest,
): Route[] {
  return request.targetAgentIds.map((targetAgentId) => ({
    sourceAgentId: request.sourceAgentId,
    targetAgentId,
    status: "active",
  }));
}

export function disconnectDirectedRoutes(
  routes: readonly Route[],
  request: CreateDirectedRoutesRequest,
): Route[] {
  const targetAgentIds = new Set(request.targetAgentIds);

  return routes.filter(
    (route) =>
      route.sourceAgentId !== request.sourceAgentId ||
      !targetAgentIds.has(route.targetAgentId),
  );
}
