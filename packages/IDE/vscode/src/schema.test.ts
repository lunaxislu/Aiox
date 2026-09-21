import Ajv from "ajv";
import { describe, expect, it } from "vitest";

import schema from "../schemas/aiox.schema.json";

const validate = new Ajv({ strict: false }).compile(schema);
const valid = () => ({
    host: { name: "team" },
    agents: { a: { adapter: "claude" } },
    networks: { team: { agents: [] } },
});

describe("Host input schema", () => {
    it("accepts optional instructions and routing, including empty membership", () => {
        expect(validate(valid())).toBe(true);
    });
    it.each([
        { ...valid(), version: 1 },
        { ...valid(), host: { name: "team", instruction: null } },
        { ...valid(), agents: { a: { adapter: "claude-code" } } },
        { ...valid(), agents: { "a/b": { adapter: "claude" } } },
        { ...valid(), agents: {} },
        { ...valid(), networks: {} },
        { ...valid(), host: { name: "team", layout: { preset: "grid" } } },
        {
            ...valid(),
            host: { name: "team", layout: { preset: "auto", columns: 2 } },
        },
        { ...valid(), networks: { team: { agents: ["a", "a"] } } },
    ])("rejects contract violations: %j", (input) => {
        expect(validate(input)).toBe(false);
    });
    it("accepts partial grid dimensions and rejects unsafe integers", () => {
        expect(
            validate({
                ...valid(),
                host: { name: "team", layout: { columns: 3 } },
            }),
        ).toBe(true);
        expect(
            validate({
                ...valid(),
                host: {
                    name: "team",
                    layout: { rows: Number.MAX_SAFE_INTEGER + 1 },
                },
            }),
        ).toBe(false);
    });
});
