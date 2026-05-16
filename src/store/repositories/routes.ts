import type Database from "better-sqlite3";

import type { RouteStatus } from "../../core/routes.js";

export interface StoredRoute {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  status: RouteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRouteInput {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  now: string;
}

export interface DisconnectRoutesInput {
  sourceAgentId: string;
  targetAgentIds: readonly string[];
}

export type CreateRouteResult =
  | {
      ok: true;
      route: StoredRoute;
    }
  | {
      ok: false;
      reason: "route_already_exists";
      existing: StoredRoute;
    };

interface RouteRow {
  id: string;
  source_agent_id: string;
  target_agent_id: string;
  status: RouteStatus;
  created_at: string;
  updated_at: string;
}

export interface RouteRepository {
  create(input: CreateRouteInput): CreateRouteResult;
  disconnect(input: DisconnectRoutesInput): StoredRoute[];
  findBySourceAndTarget(
    sourceAgentId: string,
    targetAgentId: string,
  ): StoredRoute | null;
  list(): StoredRoute[];
}

export function createRouteRepository(db: Database): RouteRepository {
  return {
    create(input) {
      const existing = this.findBySourceAndTarget(
        input.sourceAgentId,
        input.targetAgentId,
      );

      if (existing) {
        return {
          ok: false,
          reason: "route_already_exists",
          existing,
        };
      }

      const route: StoredRoute = {
        id: input.id,
        sourceAgentId: input.sourceAgentId,
        targetAgentId: input.targetAgentId,
        status: "active",
        createdAt: input.now,
        updatedAt: input.now,
      };

      db.prepare(
        `
          insert into routes (
            id,
            source_agent_id,
            target_agent_id,
            status,
            created_at,
            updated_at
          ) values (
            @id,
            @sourceAgentId,
            @targetAgentId,
            @status,
            @createdAt,
            @updatedAt
          )
        `,
      ).run(route);

      return {
        ok: true,
        route,
      };
    },

    disconnect(input) {
      const removed = input.targetAgentIds
        .map((targetAgentId) =>
          this.findBySourceAndTarget(input.sourceAgentId, targetAgentId),
        )
        .filter((route): route is StoredRoute => route !== null);

      const removeRoute = db.prepare(
        `
          delete from routes
          where source_agent_id = ? and target_agent_id = ?
        `,
      );

      for (const targetAgentId of input.targetAgentIds) {
        removeRoute.run([input.sourceAgentId, targetAgentId]);
      }

      return removed;
    },

    findBySourceAndTarget(sourceAgentId, targetAgentId) {
      const row = db
        .prepare(
          `
            select *
            from routes
            where source_agent_id = ? and target_agent_id = ?
          `,
        )
        .all([sourceAgentId, targetAgentId])[0] as RouteRow | undefined;

      return row ? mapRouteRow(row) : null;
    },

    list() {
      return db
        .prepare("select * from routes order by id")
        .all()
        .map((row) => mapRouteRow(row as RouteRow));
    },
  };
}

function mapRouteRow(row: RouteRow): StoredRoute {
  return {
    id: row.id,
    sourceAgentId: row.source_agent_id,
    targetAgentId: row.target_agent_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
