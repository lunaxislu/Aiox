import { reportClaudeHook } from "@/claude-hook";

reportClaudeHook().catch(() => {
    process.stderr.write("AIOX hook report failed.\n");
    process.exitCode = 1;
});
