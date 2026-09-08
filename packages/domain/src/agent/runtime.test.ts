import { describe, expect, it } from "vitest";

import type { RuntimeActivity } from "@/agent/runtime";
import { mcpStatus } from "@/agent/runtime";

describe("mcpStatus", () => {
    it("summarises every kind of activity as working", () => {
        const working: RuntimeActivity[] = [
            "reasoning",
            "tool",
            "awaiting-user",
        ];
        for (const activity of working) {
            expect(mcpStatus(activity)).toBe("working");
        }
    });

    it("keeps idle and failed distinct", () => {
        expect(mcpStatus("idle")).toBe("idle");
        expect(mcpStatus("failed")).toBe("failed");
    });

    it("excludes a runtime that is not a send target rather than inventing a status", () => {
        expect(mcpStatus("starting")).toBeNull();
        expect(mcpStatus("stopped")).toBeNull();
    });
});
