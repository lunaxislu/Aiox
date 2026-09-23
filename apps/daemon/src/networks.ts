import type { Network, RouteOperation } from "@aiox/domain";
import { applyRouteOperation, outboundTargets } from "@aiox/domain";
import type { AioxDatabase, PersistentNetwork } from "@aiox/persistence";
import { v7 as uuidv7 } from "uuid";

import type { RuntimeRecord } from "@/runtimes";

export class NetworkError extends Error {
    constructor(
        message: string,
        readonly code?: string,
    ) {
        super(message);
        this.name = "NetworkError";
    }
}

/**
 * Persistent network definitions live in the database; membership is whatever
 * is running right now. A stored definition never resurrects a past membership.
 */
export class NetworkService {
    constructor(
        private readonly db: AioxDatabase,
        private readonly runtimes: {
            get(id: string): RuntimeRecord | undefined;
            inNetwork(networkId: string): RuntimeRecord[];
        },
        private readonly onChange: () => void = () => {},
    ) {}

    async create(name: string): Promise<PersistentNetwork> {
        if (!name.trim() || name.includes("/"))
            throw new NetworkError(
                "A network name must be non-empty and must not contain '/'",
                "invalid_name",
            );
        const id = uuidv7();
        try {
            await this.db.networks.create({ id, name });
        } catch (error) {
            if (
                error instanceof Error &&
                "code" in error &&
                error.code === "SQLITE_CONSTRAINT_UNIQUE"
            )
                throw new NetworkError(
                    `A network named '${name}' already exists`,
                    "duplicate_name",
                );
            throw error;
        }
        this.onChange();
        return this.require(id);
    }

    list(): Promise<PersistentNetwork[]> {
        return this.db.networks.list();
    }

    async find(reference: string): Promise<PersistentNetwork | undefined> {
        return (
            (await this.db.networks.get(reference)) ??
            (await this.db.networks.list()).find(
                (network) => network.name === reference,
            )
        );
    }

    async require(reference: string): Promise<PersistentNetwork> {
        const network = await this.find(reference);
        if (!network) throw new NetworkError(`No such network: ${reference}`);
        return network;
    }

    async delete(reference: string): Promise<boolean> {
        const network = await this.require(reference);
        if (this.runtimes.inNetwork(network.id).length)
            throw new NetworkError(
                `Network '${network.name}' has participating executions. Clean up their participation first, then delete the Network.`,
                "network_in_use",
            );
        const deleted = await this.db.networks.delete(network.id);
        if (deleted) this.onChange();
        return deleted;
    }

    async route(
        reference: string,
        operation: RouteOperation,
    ): Promise<PersistentNetwork> {
        const network = await this.require(reference);
        await this.db.networks.replaceRouting(network.id, (current) => {
            // Resolve inside the serialized storage operation. A departing runtime
            // is either already revoked, or its queued cleanup removes these edges.
            const resolve = (reference: string): string => {
                const target = this.resolveAgent(network.id, reference);
                if (!target)
                    throw new NetworkError(
                        `No participating agent '${reference}' in Network '${network.name}'.`,
                    );
                return target.id;
            };
            const resolved: RouteOperation =
                operation.kind === "directed"
                    ? {
                          ...operation,
                          from: resolve(operation.from),
                          to: [...new Set(operation.to.map(resolve))],
                      }
                    : {
                          ...operation,
                          agents: [...new Set(operation.agents.map(resolve))],
                      };
            return applyRouteOperation(current, resolved);
        });
        this.onChange();
        return this.require(network.id);
    }

    /** IDs take precedence over names within the current Network only. */
    resolveAgent(
        networkId: string,
        reference: string,
    ): RuntimeRecord | undefined {
        const members = this.runtimes
            .inNetwork(networkId)
            .filter((record) => record.collaborationActive);
        return (
            members.find((record) => record.id === reference) ??
            members.find((record) => record.name === reference)
        );
    }

    /** Standalone endpoints leave with their execution, not their Network. */
    async removeRuntimeRoutes(
        runtime: Pick<RuntimeRecord, "id" | "networkId" | "hostId">,
    ): Promise<void> {
        if (runtime.hostId !== null || runtime.networkId === null) return;
        const networkId = runtime.networkId;
        try {
            await this.db.networks.replaceRouting(networkId, (current) => ({
                ...current,
                routes: current.routes.filter(
                    ({ from, to }) => from !== runtime.id && to !== runtime.id,
                ),
            }));
            this.onChange();
        } catch (error) {
            // A Network deleted before or during cleanup has no edges left.
            if (await this.db.networks.get(networkId)) throw error;
        }
    }

    /** The routing snapshot a send or discovery call is judged against. */
    async effective(networkId: string): Promise<Network> {
        const managed = await this.db.hostState.getNetwork(networkId);
        if (managed) {
            const members = this.runtimes
                .inNetwork(networkId)
                .filter(
                    (r) => r.collaborationActive && r.hostId === managed.hostId,
                );
            return {
                id: networkId,
                defaultPolicy: managed.default,
                routes: managed.edges.flatMap((edge) => {
                    const from = members.find((r) => r.name === edge.from),
                        to = members.find((r) => r.name === edge.to);
                    return from && to
                        ? [{ from: from.id, to: to.id, policy: edge.policy }]
                        : [];
                }),
            };
        }
        const network = await this.require(networkId);
        return {
            id: network.id,
            defaultPolicy: "allow",
            routes: network.routes.map((edge) => ({ ...edge, policy: "deny" })),
        };
    }

    /** Current route-visible agents, including agents still preparing. */
    async reachable(source: RuntimeRecord): Promise<RuntimeRecord[]> {
        if (!source.collaborationActive || source.networkId === null) return [];
        const network = await this.effective(source.networkId);
        if (!source.collaborationActive) return [];
        const candidates = this.runtimes
            .inNetwork(source.networkId)
            .filter((record) => record.collaborationActive);
        return outboundTargets(network, source, candidates);
    }
}
