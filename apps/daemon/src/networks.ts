import { randomUUID } from "node:crypto";

import type { Network, RouteOperation, RoutePolicy } from "@aiox/domain";
import { applyRouteOperation, outboundTargets } from "@aiox/domain";
import type { AioxDatabase, PersistentNetwork } from "@aiox/persistence";

import type { RuntimeRecord } from "@/runtimes";

export class NetworkError extends Error {
    constructor(
        readonly code: string,
        message: string,
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
    ) {}

    async create(
        name: string,
        defaultPolicy: RoutePolicy,
    ): Promise<PersistentNetwork> {
        if (!name.trim() || name.includes("/"))
            throw new NetworkError(
                "invalid_name",
                "A network name must be non-empty and must not contain '/'",
            );
        const id = randomUUID();
        await this.db.networks.create({ id, name, defaultPolicy });
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
        if (!network)
            throw new NetworkError(
                "unknown_network",
                `No such network: ${reference}`,
            );
        return network;
    }

    async delete(reference: string): Promise<boolean> {
        const network = await this.require(reference);
        if (this.runtimes.inNetwork(network.id).length)
            throw new NetworkError(
                "network_in_use",
                `Network '${network.name}' has participating executions. Clean up their participation first, then delete the Network.`,
            );
        return this.db.networks.delete(network.id);
    }

    async route(
        reference: string,
        operation: RouteOperation,
    ): Promise<PersistentNetwork> {
        const network = await this.require(reference);
        await this.db.networks.replaceRouting(network.id, (current) =>
            applyRouteOperation(current, operation),
        );
        return this.require(network.id);
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
        } catch (error) {
            // A Network deleted before or during cleanup has no edges left.
            if (await this.db.networks.get(networkId)) throw error;
        }
    }

    /** The routing snapshot a send or discovery call is judged against. */
    async effective(networkId: string): Promise<Network> {
        const network = await this.require(networkId);
        return {
            id: network.id,
            defaultPolicy: network.defaultPolicy,
            routes: network.routes,
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
