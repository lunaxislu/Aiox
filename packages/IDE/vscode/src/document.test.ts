import { describe, expect, it } from "vitest";

import { analyze, complete, definition, hover, isHostFile } from "@/document";

const source = `host:
  name: team
agents:
  reviewer:
    adapter: claude
  implementer:
    adapter: codex
  outsider:
    adapter: claude
networks:
  team:
    agents: [reviewer, implementer]
    routing:
      allow:
        - from: reviewer
          to: [implementer]
`;

describe("AIOX document features", () => {
    it("rejects multiple documents, custom tags and non-string keys", () => {
        expect(analyze(source + "---\n").issues[0]?.message).toContain(
            "single YAML document",
        );
        expect(
            analyze(source.replace("name: team", "name: !custom team"))
                .issues[0]?.message,
        ).toContain("Custom YAML tags");
        expect(
            analyze(source.replace("  reviewer:", "  12:")).issues[0]?.message,
        ).toContain("keys must be strings");
    });
    it("recognizes both file patterns, including Windows paths", () => {
        for (const path of [
            "aiox.yaml",
            "/work/aiox.dev.yaml",
            "C:\\work\\aiox.test.yaml",
        ])
            expect(isHostFile(path)).toBe(true);
        for (const path of ["custom.yaml", "aiox.yml", "not-aiox.yaml"])
            expect(isHostFile(path)).toBe(false);
    });

    it("accepts omitted routing.default and host instruction", () => {
        expect(analyze(source).issues).toEqual([]);
        expect(hover(source, source.indexOf("routing:"))).toContain("allow");
        expect(hover(source, 1)).toContain("not set");
    });

    it("reports undefined membership at the exact reference", () => {
        const input = source.replace(
            "[reviewer, implementer]",
            "[reviewer, missing]",
        );
        const issue = analyze(input).issues.find((value) =>
            value.message.includes("missing"),
        );
        expect(issue).toBeDefined();
        expect(input.slice(issue!.start, issue!.end)).toBe("missing");
    });

    it("limits route completion to members and resolves references", () => {
        const offset = source.lastIndexOf("implementer") + 3;
        expect(complete(source, offset).map((value) => value.name)).toEqual([
            "implementer",
        ]);
        const target = definition(source, offset);
        expect(source.slice(target!.start, target!.end)).toBe("implementer");
        expect(target!.start).toBe(source.indexOf("implementer:"));
    });

    it("does not complete inside instructions", () => {
        const input = source.replace(
            "adapter: claude",
            "adapter: claude\n    instruction: |\n      agents: [rev]",
        );
        expect(complete(input, input.indexOf("[rev]") + 4)).toEqual([]);
    });

    it("detects expanded duplicate and conflicting directed edges", () => {
        const duplicate =
            source + "        - between: [reviewer, implementer]\n";
        expect(
            analyze(duplicate).issues.some((value) =>
                value.message.includes("Duplicate"),
            ),
        ).toBe(true);
        const conflict =
            source +
            "      deny:\n        - from: reviewer\n          to: [implementer]\n";
        expect(
            analyze(conflict).issues.some((value) =>
                value.message.includes("Conflicting"),
            ),
        ).toBe(true);
    });

    it("rejects non-member routes and self edges", () => {
        expect(
            analyze(
                source.replace("to: [implementer]", "to: [outsider]"),
            ).issues.some((v) => v.message.includes("not a member")),
        ).toBe(true);
        expect(
            analyze(
                source.replace("to: [implementer]", "to: [reviewer]"),
            ).issues.some((v) => v.message.includes("itself")),
        ).toBe(true);
    });

    it("keeps completion working in an unfinished flow sequence", () => {
        const input =
            source.slice(0, source.lastIndexOf("implementer")) + "imp";
        expect(
            complete(input, input.length).map((value) => value.name),
        ).toContain("implementer");
        expect(analyze(input).issues).toEqual([]);
    });

    it("replaces quoted names as one scalar without corrupting escaping", () => {
        const input = source.replaceAll("implementer", '"dev: \\\"one\\\""');
        const offset = input.lastIndexOf("dev:") + 4;
        const suggestion = complete(input, offset).find(
            (item) => item.name === 'dev: "one"',
        )!;
        expect(suggestion.insertText).toBe('"dev: \\\"one\\\""');
        expect(
            input.slice(suggestion.replace!.start, suggestion.replace!.end),
        ).toBe(suggestion.insertText);
    });

    it("offers declarations in empty block and flow membership lists", () => {
        for (const fragment of ["agents: []", "agents:\n      - "]) {
            const input =
                source.slice(0, source.indexOf("    agents:")) +
                "    " +
                fragment;
            const offset = fragment.endsWith("[]")
                ? input.length - 1
                : input.length;
            expect(complete(input, offset).map((item) => item.name)).toContain(
                "reviewer",
            );
        }
    });

    it("resolves YAML aliases for membership without expanding recursive data", () => {
        const input = source
            .replace(
                "agents: [reviewer, implementer]",
                "agents: &members [reviewer, implementer]",
            )
            .replace("to: [implementer]", "between: *members")
            .replace(
                "        - from: reviewer\n          between:",
                "        - between:",
            );
        expect(analyze(input).issues).toEqual([]);
        const invalid = source
            .replace(
                "adapter: claude",
                "adapter: claude\n    args: &targets [outsider]",
            )
            .replace("to: [implementer]", "to: *targets");
        expect(
            analyze(invalid).issues.some((issue) =>
                issue.message.includes("not a member"),
            ),
        ).toBe(true);
        expect(complete(invalid, invalid.indexOf("[outsider]") + 4)).toEqual(
            [],
        );
        expect(() => analyze(source + "broken: &loop [*loop]\n")).not.toThrow();
    });

    it("does not diagnose quoted strings that only resemble route fields", () => {
        expect(
            analyze(
                'host: {name: team}\nagents: {a: {adapter: claude, instruction: "from: missing"}}\nnetworks: {n: {agents: []}}',
            ).issues,
        ).toEqual([]);
    });
});
