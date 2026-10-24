import { chmod, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Owned by the launcher, independently of the daemon's collaboration registration. */
export async function createClaudeInbox(): Promise<{
    path: string;
    dispose(): Promise<void>;
}> {
    const directory = await mkdtemp(join(await realpath(tmpdir()), "ax-"));
    const dispose = () => rm(directory, { recursive: true, force: true });
    try {
        await chmod(directory, 0o700);
        const path = join(directory, "inbox.sock");
        if (Buffer.byteLength(path) > 103)
            throw new Error(
                "Cannot start Claude: temporary inbox path exceeds 103 bytes. Set a shorter TMPDIR and try again.",
            );
        return { path, dispose };
    } catch (error) {
        await dispose();
        throw error;
    }
}
