import { randomBytes, randomUUID } from "node:crypto";

import type { DeliveryOutcome, RuntimeStatus } from "@aiox/domain";
import type { LastExit } from "@aiox/protocol";
import type { TerminalSession } from "@aiox/terminal";
import type { InboundMessage, RuntimeControls } from "@aiox/vendor";
export type { InboundMessage, RuntimeControls } from "@aiox/vendor";

/**
 * How one vendor is driven. Stage 3 (Claude) and Stage 4 (Codex) supply real
 * implementations; Stage 2 exercises the seam with test doubles.
 */
export type AgentBinding = {
    readonly exit?: LastExit | undefined;
    readonly terminal?: TerminalSession | undefined;
    readonly relayDisconnected?: boolean;
    readonly collaborationError?: string | undefined;
    /** Resolves when the input was accepted, never when the work is done. */
    deliver(message: InboundMessage): Promise<void>;
    /** Confirms daemon-owned execution resources have stopped; never called for external execution. */
    stop(): Promise<void>;
    /** Releases collaboration resources independently of process lifetime. */
    cleanup?(): Promise<void>;
    mcpConnected?(): void;
    /** Revokes collaboration/report exposure before fallible cleanup. */
    revoke?(): void;
};

export type RuntimeRecord = {
    readonly id: string;
    readonly name: string;
    readonly role: string | null;
    readonly description: string | null;
    readonly networkId: string | null;
    readonly hostId: string | null;
    readonly executionOwnership: "daemon" | "external";
    collaborationActive: boolean;
    terminalId: string | null;
    terminalOwnership: "owned" | "borrowed" | null;
    phase: "preparing" | "running" | "stopping";
    status: RuntimeStatus;
    status_reason: string | null;
    observation_error: string | null;
    binding: AgentBinding;
};

/** Placeholder between registration and the binding being built. */
const unbound: AgentBinding = {
    deliver: () =>
        Promise.reject(new Error("This runtime has no input path yet.")),
    stop: () => Promise.resolve(),
};

export type RegisterRuntime = {
    executionOwnership?: "daemon" | "external";
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

export class DuplicateRuntimeNameError extends Error {
    readonly code = "duplicate_agent_name";
    constructor(name: string) {
        super(
            `An agent named '${name}' is already registered in this Network.`,
        );
        this.name = "DuplicateRuntimeNameError";
    }
}

export class AmbiguousRuntimeError extends Error {
    constructor(
        readonly candidates: readonly Pick<
            RuntimeRecord,
            "name" | "networkId"
        >[],
    ) {
        super("Several running agents match that name.");
        this.name = "AmbiguousRuntimeError";
    }
}

/**
 * Live executions and their credentials. Tokens live here only; they are never
 * written to the database, an argv, a URL or a log line.
 */
export class RuntimeRegistry {
    readonly #listeners = new Set<() => void>();
    subscribe(listener: () => void): () => void {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    }
    private changed(): void {
        this.onChange();
        for (const listener of this.#listeners) listener();
    }
    constructor(
        private readonly onChange: () => void = () => {},
        private readonly cleanupPreparation: (
            record: RuntimeRecord,
        ) => Promise<void> = async () => {},
    ) {}
    readonly #runtimes = new Map<string, RuntimeRecord>();
    readonly #tokens = new Map<string, string>();
    #onSettle: SettleHandler = () => Promise.resolve();

    onSettle(handler: SettleHandler): void {
        this.#onSettle = handler;
    }

    async register(
        input: RegisterRuntime,
    ): Promise<{ record: RuntimeRecord; token: string }> {
        if (
            input.executionOwnership === "external" &&
            (input.terminalId != null || input.hostId != null)
        )
            throw new Error(
                "External executions cannot belong to a Host or terminal.",
            );
        const id = randomUUID();
        const name = input.name ?? id;
        // Reserve names before any await, including preparation and pending cleanup.
        if (
            input.networkId !== null &&
            this.inNetwork(input.networkId).some(
                (record) => record.name === name,
            )
        )
            throw new DuplicateRuntimeNameError(name);
        let reportedStatus: RuntimeStatus = "aiox-preparing";
        let reportedReason: string | null = null;
        const controls: RuntimeControls = {
            runtimeId: id,
            setStatus: (status, reason) => {
                reportedStatus = status;
                reportedReason = reason ?? null;
                const record = this.#runtimes.get(id);
                if (record && record.binding !== unbound) {
                    record.status = status;
                    record.status_reason = reportedReason;
                    this.changed();
                }
            },
            setObservationError: (error) => {
                const record = this.#runtimes.get(id);
                if (!record || record.observation_error === error) return;
                record.observation_error = error;
                this.changed();
            },
            settle: (deliveryId, outcome, error) =>
                this.#onSettle(id, deliveryId, outcome, error),
        };
        const record: RuntimeRecord = {
            id,
            name,
            role: input.role ?? null,
            description: input.description ?? null,
            networkId: input.networkId,
            hostId: input.hostId ?? null,
            executionOwnership: input.executionOwnership ?? "daemon",
            collaborationActive: true,
            terminalId: input.terminalId ?? null,
            terminalOwnership: input.terminalId
                ? (input.terminalOwnership ?? "owned")
                : null,
            // Not yet a send target: process spawn is not binding readiness.
            phase: "preparing",
            status: "aiox-preparing",
            status_reason: null,
            observation_error: null,
            binding: unbound,
        };
        // Registered before the binding is built so the binding can report its
        // own readiness. Nothing can reach it yet: no credential exists, and
        // preparation keeps it out of send, but visible in discovery.
        this.#runtimes.set(id, record);
        this.changed();
        try {
            record.binding = await input.createBinding(controls);
            if (!record.collaborationActive) record.binding.revoke?.();
            record.status = reportedStatus;
            record.status_reason = reportedReason;
            this.changed();
        } catch (error) {
            // Revoke before fallible route cleanup. Failed cleanup reserves the
            // name and leaves a record that stopRuntime can retry.
            this.revoke(id);
            record.status = "failed";
            record.status_reason =
                error instanceof Error ? error.message : String(error);
            try {
                await this.cleanupPreparation(record);
            } catch (cleanupError) {
                throw new AggregateError(
                    [error, cleanupError],
                    "Registration failed and route cleanup is unconfirmed.",
                );
            }
            this.unregister(id);
            throw error;
        }
        const token = randomBytes(32).toString("base64url");
        if (record.collaborationActive) this.#tokens.set(token, id);
        return { record, token };
    }

    ready(id: string): void {
        const record = this.#runtimes.get(id);
        if (
            record &&
            record.phase === "preparing" &&
            record.collaborationActive
        ) {
            record.phase = "running";
            this.changed();
        }
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
        if (byId?.collaborationActive) return byId;
        const [host, name] = reference.includes("/")
            ? (reference.split("/", 2) as [string, string])
            : [undefined, reference];
        const matches = this.list().filter(
            (record) =>
                record.collaborationActive &&
                record.name === name &&
                (host === undefined || record.hostId === host),
        );
        if (matches.length > 1)
            throw new AmbiguousRuntimeError(
                matches.map(({ name, networkId }) => ({ name, networkId })),
            );
        return matches[0];
    }

    list(): RuntimeRecord[] {
        return [...this.#runtimes.values()];
    }

    inNetwork(networkId: string): RuntimeRecord[] {
        return this.list().filter((record) => record.networkId === networkId);
    }

    /** Ends collaboration immediately while preserving resources awaiting cleanup. */
    revoke(id: string): void {
        const record = this.#runtimes.get(id);
        const active = record?.collaborationActive;
        if (record) record.collaborationActive = false;
        for (const [token, runtimeId] of this.#tokens) {
            if (runtimeId === id) this.#tokens.delete(token);
        }
        if (active) record.binding.revoke?.();
        if (active) this.changed();
    }

    /** Removes a record after its cleanup has succeeded. */
    unregister(id: string): boolean {
        this.revoke(id);
        const removed = this.#runtimes.delete(id);
        if (removed) this.changed();
        return removed;
    }
}
