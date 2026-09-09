import { randomBytes, randomUUID } from "node:crypto";

import type { DeliveryOutcome, RuntimeActivity } from "@aiox/domain";

/**
 * What a vendor binding receives. `deliveryId` is the correlation handle the
 * binding must echo back through `settle` when the connected request finishes.
 * It is null for a daemon notification, so a notification structurally cannot
 * settle anything and cannot produce another notification.
 */
export type InboundMessage = {
    readonly deliveryId: string | null;
    readonly from: {
        readonly name: string;
        readonly role: string | null;
        readonly description: string | null;
    };
    readonly createdAt: number;
    readonly content: string;
};

/**
 * How one vendor is driven. Stage 3 (Claude) and Stage 4 (Codex) supply real
 * implementations; Stage 2 exercises the seam with test doubles.
 */
export type AgentBinding = {
    /** Resolves when the input was accepted, never when the work is done. */
    deliver(message: InboundMessage): Promise<void>;
    stop(force: boolean): Promise<void>;
};

/** The daemon side a binding may call as it observes its runtime. */
export type RuntimeControls = {
    readonly runtimeId: string;
    setActivity(activity: RuntimeActivity): void;
    /**
     * Report the result of one previously delivered AIOX input. A turn that is
     * not connected to a delivery has nothing to settle, which is why finishing
     * a user's own request cannot notify anyone.
     */
    settle(
        deliveryId: string,
        outcome: DeliveryOutcome,
        error?: string,
    ): Promise<void>;
};

export type RuntimeRecord = {
    readonly id: string;
    readonly name: string;
    readonly role: string | null;
    readonly description: string | null;
    readonly networkId: string | null;
    readonly hostId: string | null;
    terminalId: string | null;
    terminalOwnership: "owned" | "borrowed" | null;
    activity: RuntimeActivity;
    binding: AgentBinding;
};

/** Placeholder between registration and the binding being built. */
const unbound: AgentBinding = {
    deliver: () =>
        Promise.reject(new Error("This runtime has no input path yet.")),
    stop: () => Promise.resolve(),
};

export type RegisterRuntime = {
    name?: string | undefined;
    role?: string | undefined;
    description?: string | undefined;
    networkId: string | null;
    hostId?: string | undefined;
    terminalId?: string | undefined;
    terminalOwnership?: "owned" | "borrowed";
    createBinding(
        controls: RuntimeControls,
    ): AgentBinding | Promise<AgentBinding>;
};

export type SettleHandler = (
    runtimeId: string,
    deliveryId: string,
    outcome: DeliveryOutcome,
    error?: string,
) => Promise<void>;

export class AmbiguousRuntimeError extends Error {
    constructor(readonly candidates: readonly string[]) {
        super(
            `Several running agents match that name: ${candidates.join(", ")}`,
        );
        this.name = "AmbiguousRuntimeError";
    }
}

/**
 * Live executions and their credentials. Tokens live here only; they are never
 * written to the database, an argv, a URL or a log line.
 */
export class RuntimeRegistry {
    readonly #runtimes = new Map<string, RuntimeRecord>();
    readonly #tokens = new Map<string, string>();
    #onSettle: SettleHandler = () => Promise.resolve();

    onSettle(handler: SettleHandler): void {
        this.#onSettle = handler;
    }

    async register(
        input: RegisterRuntime,
    ): Promise<{ record: RuntimeRecord; token: string }> {
        const id = randomUUID();
        let reportedActivity: RuntimeActivity = "starting";
        const controls: RuntimeControls = {
            runtimeId: id,
            setActivity: (activity) => {
                reportedActivity = activity;
                const record = this.#runtimes.get(id);
                if (record && record.binding !== unbound)
                    record.activity = activity;
            },
            settle: (deliveryId, outcome, error) =>
                this.#onSettle(id, deliveryId, outcome, error),
        };
        const record: RuntimeRecord = {
            id,
            name: input.name ?? id,
            role: input.role ?? null,
            description: input.description ?? null,
            networkId: input.networkId,
            hostId: input.hostId ?? null,
            terminalId: input.terminalId ?? null,
            terminalOwnership: input.terminalId
                ? (input.terminalOwnership ?? "owned")
                : null,
            // Not yet a send target: process spawn is not binding readiness.
            activity: "starting",
            binding: unbound,
        };
        // Registered before the binding is built so the binding can report its
        // own readiness. Nothing can reach it yet: no credential exists, and
        // `starting` keeps it out of discovery and out of send.
        this.#runtimes.set(id, record);
        try {
            record.binding = await input.createBinding(controls);
            record.activity = reportedActivity;
        } catch (error) {
            // Only what this attempt created is removed.
            this.unregister(id);
            throw error;
        }
        const token = randomBytes(32).toString("base64url");
        this.#tokens.set(token, id);
        return { record, token };
    }

    /** Resolves the authenticated source. A revoked token never resolves. */
    authenticate(token: string | undefined): RuntimeRecord | undefined {
        if (!token) return undefined;
        const id = this.#tokens.get(token);
        return id === undefined ? undefined : this.#runtimes.get(id);
    }

    get(id: string): RuntimeRecord | undefined {
        return this.#runtimes.get(id);
    }

    /** By id first, then by unique name; `/` is the qualified-name separator. */
    find(reference: string): RuntimeRecord | undefined {
        const byId = this.#runtimes.get(reference);
        if (byId) return byId;
        const [host, name] = reference.includes("/")
            ? (reference.split("/", 2) as [string, string])
            : [undefined, reference];
        const matches = this.list().filter(
            (record) =>
                record.name === name &&
                (host === undefined || record.hostId === host),
        );
        if (matches.length > 1)
            throw new AmbiguousRuntimeError(matches.map((r) => r.id));
        return matches[0];
    }

    list(): RuntimeRecord[] {
        return [...this.#runtimes.values()];
    }

    inNetwork(networkId: string): RuntimeRecord[] {
        return this.list().filter((record) => record.networkId === networkId);
    }

    /** Drops the execution's registration, credential and membership. */
    unregister(id: string): boolean {
        for (const [token, runtimeId] of this.#tokens) {
            if (runtimeId === id) this.#tokens.delete(token);
        }
        return this.#runtimes.delete(id);
    }
}
