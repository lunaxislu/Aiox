import { z } from "zod";

export const transcriptRowSchema = z.object({
    sessionId: z.string().min(1),
    uuid: z.string().min(1),
    parentUuid: z.string().nullable(),
    isSidechain: z.literal(false),
    type: z.string(),
    promptId: z.string().min(1).optional(),
    subtype: z.string().optional(),
    origin: z.unknown().optional(),
    promptSource: z.unknown().optional(),
    isApiErrorMessage: z.boolean().optional(),
    isAbortedMidStream: z.boolean().optional(),
    interruptedMessageId: z.string().optional(),
    interruptedByShutdown: z.boolean().optional(),
    durationMs: z.number().nonnegative().optional(),
    message: z
        .object({
            role: z.string(),
            id: z.string().optional(),
            stop_reason: z.string().nullable().optional(),
            content: z.union([
                z.string(),
                z.array(
                    z.object({
                        type: z.string(),
                        text: z.string().optional(),
                    }),
                ),
            ]),
        })
        .optional(),
});

type Chain = {
    key: string;
    endTurn: boolean;
    error: boolean;
    messageId: string | undefined;
    aborted: boolean;
};

/** Only causal metadata for observed requests; never retains transcript bodies. */
export class ClaudeTranscriptChain {
    readonly #nodes = new Map<string, Chain>();
    readonly #heads = new Map<string, string>();
    readonly #resumed = new Set<string>();
    readonly #unlinked = new Map<string, z.infer<typeof transcriptRowSchema>>();
    readonly #ignored = new Set<string>();

    clear(): void {
        this.#nodes.clear();
        this.#heads.clear();
        this.#resumed.clear();
        this.#unlinked.clear();
        this.#ignored.clear();
    }

    constructor(readonly accepts: (key: string) => boolean = () => true) {}

    observe(
        value: unknown,
    ):
        | { key: string; outcome: "completed" | "interrupted"; reason?: string }
        | undefined {
        const parsed = transcriptRowSchema.safeParse(value);
        if (!parsed.success) return;
        const row = parsed.data;
        // Retain marker semantics, never transcript text, while awaiting a parent.
        if (row.message) {
            if (typeof row.message.content === "string")
                row.message.content = "";
            else
                for (const block of row.message.content)
                    if (
                        block.text !== "[Request interrupted by user]" &&
                        block.text !==
                            "[Request interrupted by user for tool use]"
                    )
                        delete block.text;
        }
        const nodeId = JSON.stringify([row.sessionId, row.uuid]);
        if (this.#nodes.has(nodeId)) return;
        const parentId = JSON.stringify([row.sessionId, row.parentUuid]);
        const parent = this.#nodes.get(parentId);
        const explicitKey = row.promptId
            ? JSON.stringify([row.sessionId, row.promptId])
            : undefined;
        const input =
            row.type === "user" &&
            row.message?.role === "user" &&
            (row.origin !== undefined || row.promptSource !== undefined);
        const key = input ? explicitKey : parent?.key;
        if (
            (!input && this.#ignored.has(parentId)) ||
            (explicitKey !== undefined && !this.accepts(explicitKey)) ||
            ((input || parent !== undefined || row.parentUuid === null) &&
                (!key || !this.accepts(key)))
        ) {
            this.#ignore(nodeId);
            for (const [id, child] of this.#unlinked) {
                if (
                    child.sessionId !== row.sessionId ||
                    child.parentUuid !== row.uuid
                )
                    continue;
                this.#unlinked.delete(id);
                this.observe(child);
            }
            return;
        }
        if (!input && !parent && row.parentUuid !== null) {
            // ponytail: retain unresolved metadata until session release; a hard cap
            // blocks the reader before it can reach the missing parent. Spill to disk
            // if measured session memory requires a bound; never evict terminal evidence.
            this.#unlinked.set(nodeId, row);
            return;
        }
        // TypeScript cannot narrow key through the parent-resolution branches above.
        if (!key || (!input && explicitKey && explicitKey !== key)) return;
        const message = row.message;
        const blocks = Array.isArray(message?.content) ? message.content : [];
        const interrupted =
            !input &&
            row.type === "user" &&
            message?.role === "user" &&
            blocks.length === 1 &&
            blocks[0]?.type === "text" &&
            (blocks[0].text === "[Request interrupted by user]" ||
                blocks[0].text ===
                    "[Request interrupted by user for tool use]");
        if (
            ((row.type === "system" && row.subtype === "turn_duration") ||
                interrupted) &&
            this.#heads.get(key) !== row.parentUuid
        )
            return;
        // An optional vendor reference must agree, but is not required to declare interruption.
        if (
            interrupted &&
            row.interruptedMessageId !== undefined &&
            row.interruptedMessageId !== parent?.messageId
        )
            return;
        // Conversation messages select the branch. Auxiliary records only extend it;
        // late metadata still enters #nodes so delayed children can find their parent.
        if (
            input ||
            (row.type === "assistant" && row.message?.role === "assistant") ||
            (row.type === "user" && row.message?.role === "user") ||
            this.#heads.get(key) === row.parentUuid
        )
            this.#heads.set(key, row.uuid);
        const chain: Chain = input
            ? {
                  key,
                  endTurn: false,
                  error: false,
                  messageId: undefined,
                  aborted: false,
              }
            : { ...parent! };
        if (row.type === "assistant" && message?.role === "assistant") {
            chain.endTurn = message.stop_reason === "end_turn";
            if (this.#resumed.has(key) && !row.isApiErrorMessage)
                chain.error = false;
            chain.error ||= row.isApiErrorMessage === true;
            chain.messageId = message.id;
            chain.aborted ||= row.isAbortedMidStream === true;
        }
        if (interrupted) {
            this.#nodes.set(nodeId, { ...chain, aborted: true });
            return {
                key,
                outcome: "interrupted",
                ...(row.interruptedByShutdown ? { reason: "Interrupted" } : {}),
            };
        }
        this.#nodes.set(nodeId, chain);
        let result:
            | { key: string; outcome: "completed" | "interrupted" }
            | undefined;
        if (
            row.type === "system" &&
            row.subtype === "turn_duration" &&
            row.durationMs !== undefined &&
            chain.endTurn &&
            !chain.error &&
            !chain.aborted
        )
            result = { key, outcome: "completed" };
        for (const [id, child] of this.#unlinked) {
            if (
                child.sessionId !== row.sessionId ||
                child.parentUuid !== row.uuid
            )
                continue;
            this.#unlinked.delete(id);
            const linked = this.observe(child);
            result ??= linked;
        }
        return result;
    }

    #ignore(id: string): void {
        this.#ignored.add(id);
        // ponytail: retain IDs until session release; evicting a parent retains
        // every late descendant as an unresolved row instead.
    }

    releaseSession(session: string): void {
        for (const id of this.#ignored)
            if (JSON.parse(id)[0] === session) this.#ignored.delete(id);
        for (const [id, row] of this.#unlinked)
            if (row.sessionId === session) this.#unlinked.delete(id);
    }

    resume(key: string): void {
        this.#resumed.add(key);
    }

    forget(key: string): void {
        this.#resumed.delete(key);
        this.#heads.delete(key);
        for (const [id, chain] of this.#nodes)
            if (chain.key === key) {
                this.#nodes.delete(id);
                this.#ignore(id);
            }
    }
}
