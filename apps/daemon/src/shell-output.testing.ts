import { stripVTControlCharacters } from "node:util";

/** Check completed shell output lines, excluding the echoed command and prompt. */
export function hasShellOutputLine(output: string, expected: string): boolean {
    // Readline toggles bracketed paste around command execution and may emit an
    // extra CR. Normalize only that presentation framing, never a partial line.
    return stripVTControlCharacters(output)
        .split("\n")
        .slice(0, -1)
        .some((line) => line.replace(/^\r+|\r+$/g, "") === expected);
}
