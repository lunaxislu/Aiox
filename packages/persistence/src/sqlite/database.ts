import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";

import type { DirectedRoute, RoutePolicy } from "@aiox/domain";
import Database from "better-sqlite3";

export type PersistentNetwork = {
    readonly id: string;
    readonly name: string;
    readonly defaultPolicy: RoutePolicy;
    readonly routes: readonly DirectedRoute[];
};

export interface PersistentNetworks {
    create(input: Omit<PersistentNetwork, "routes">): void;
    get(id: string): PersistentNetwork | undefined;
    list(): PersistentNetwork[];
    replaceRouting(
        id: string,
        routing: Pick<PersistentNetwork, "defaultPolicy" | "routes">,
    ): void;
    delete(id: string): boolean;
}

export interface AioxDatabase {
    readonly networks: PersistentNetworks;
    close(): void;
}

const schema = `
CREATE TABLE persistent_networks (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) > 0),
  name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) > 0 AND instr(name, '/') = 0),
  default_policy TEXT NOT NULL CHECK(default_policy IN ('allow', 'deny'))
) STRICT;
CREATE TABLE persistent_routes (
  network_id TEXT NOT NULL REFERENCES persistent_networks(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL CHECK(length(source_id) > 0),
  target_id TEXT NOT NULL CHECK(length(target_id) > 0 AND source_id <> target_id),
  policy TEXT NOT NULL CHECK(policy IN ('allow', 'deny')),
  PRIMARY KEY(network_id, source_id, target_id)
) STRICT;`;

/** Called by the daemon; the caller supplies its environment's absolute DB path. */
export function openDatabase(path: string): AioxDatabase {
    if (!isAbsolute(path)) throw new Error("Database path must be absolute");
    mkdirSync(dirname(path), { recursive: true });
    const db = new Database(path);
    try {
        db.pragma("foreign_keys = ON");
        db.transaction(() => {
            const version = db.pragma("user_version", { simple: true });
            if (version !== 0 && version !== 1)
                throw new Error(
                    `Unsupported database schema version: ${version}`,
                );
            if (version === 0) {
                db.exec(schema);
                db.pragma("user_version = 1");
            }
        }).immediate();

        const insert = db.prepare(
            "INSERT INTO persistent_networks(id, name, default_policy) VALUES (?, ?, ?)",
        );
        const select = db.prepare<[string], Omit<PersistentNetwork, "routes">>(
            "SELECT id, name, default_policy AS defaultPolicy FROM persistent_networks WHERE id = ?",
        );
        const all = db.prepare<[], { id: string }>(
            "SELECT id FROM persistent_networks ORDER BY name",
        );
        const routes = db.prepare<[string], DirectedRoute>(
            'SELECT source_id AS "from", target_id AS "to", policy FROM persistent_routes WHERE network_id = ? ORDER BY source_id, target_id',
        );
        const update = db.prepare(
            "UPDATE persistent_networks SET default_policy = ? WHERE id = ?",
        );
        const clearRoutes = db.prepare(
            "DELETE FROM persistent_routes WHERE network_id = ?",
        );
        const insertRoute = db.prepare(
            "INSERT INTO persistent_routes(network_id, source_id, target_id, policy) VALUES (?, ?, ?, ?)",
        );
        const remove = db.prepare(
            "DELETE FROM persistent_networks WHERE id = ?",
        );
        const get = (id: string): PersistentNetwork | undefined => {
            const network = select.get(id);
            return network === undefined
                ? undefined
                : { ...network, routes: routes.all(id) };
        };

        return {
            networks: {
                create: ({ id, name, defaultPolicy }) => {
                    insert.run(id, name, defaultPolicy);
                },
                get,
                list: () => all.all().map(({ id }) => get(id)!),
                replaceRouting: db.transaction(
                    (
                        id: string,
                        routing: Pick<
                            PersistentNetwork,
                            "defaultPolicy" | "routes"
                        >,
                    ) => {
                        if (update.run(routing.defaultPolicy, id).changes !== 1)
                            throw new Error(`Network not found: ${id}`);
                        clearRoutes.run(id);
                        for (const route of routing.routes)
                            insertRoute.run(
                                id,
                                route.from,
                                route.to,
                                route.policy,
                            );
                    },
                ),
                delete: (id) => remove.run(id).changes === 1,
            },
            close: () => db.close(),
        };
    } catch (error) {
        db.close();
        throw error;
    }
}
