import type { VendorAdapter } from "@aiox/vendor";
import { z } from "zod";

import { ClaudeBinding } from "@/claude";
import { createClaudeInbox } from "@/claude-environment";
import { probeClaude } from "@/claude-version";

const connectionSchema = z.strictObject({
    inboxPath: z
        .string()
        .min(1)
        .refine((value) => !value.includes("\0")),
});
const commandSchema = z.strictObject({
    file: z.literal("claude"),
    args: z.array(z.string()),
    cwd: z.string().min(1),
    env: z.record(z.string(), z.string()),
});

export const claudeAdapter: VendorAdapter = {
    id: "claude",
    async createExecution(owner) {
        const inbox = await createClaudeInbox();
        await owner.own(inbox.dispose);
        return {
            connection: { inboxPath: inbox.path },
            async start(launch, executionOwner) {
                executionOwner.signal.throwIfAborted();
                const command = commandSchema.parse(launch);
                await probeClaude(command.file, command.env, command.cwd);
                executionOwner.signal.throwIfAborted();
                return executionOwner.foreground(command);
            },
        };
    },
    createBinding(controls, connection) {
        const { inboxPath } = connectionSchema.parse(connection);
        return new ClaudeBinding(controls, inboxPath);
    },
};
