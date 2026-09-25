import assert from "node:assert/strict";

import { Schema } from "effect";
import * as SchemaGetter from "effect/SchemaGetter";
import { test } from "vitest";

import {
    agentViewSchema,
    createShellSchema,
    panelChangeSchema,
    panelLayoutSchema,
    panelViewSchema,
    portsSchema,
    webSnapshotSchema,
    storedConfigSchema,
} from "./index";
import { compatible, strictStruct } from "./schema-compat";

function assertNativeDecodedTypesAreMutable(
    panel: Schema.Schema.Type<typeof panelViewSchema>,
    snapshot: Schema.Schema.Type<typeof webSnapshotSchema>,
) {
    panel.revision++;
    panel.tabs.push(panel.tabs[0]!);
    snapshot.panels.push(panel);
}
void assertNativeDecodedTypesAreMutable;

test("protocol exports Effect Schemas with parse compatibility backed by the same decoder", () => {
    const schemas = [
        agentViewSchema,
        createShellSchema,
        panelChangeSchema,
        panelLayoutSchema,
        storedConfigSchema,
    ];
    for (const schema of schemas) assert.equal(Schema.isSchema(schema), true);

    const input = { type: "panel.rename", name: "  Research  " };
    const decoded = Schema.decodeUnknownSync(panelChangeSchema)(input);
    assert.deepEqual(decoded, { type: "panel.rename", name: "Research" });
    assert.deepEqual(panelChangeSchema.parse(input), decoded);
    assert.deepEqual(panelChangeSchema.safeParse(input), {
        success: true,
        data: decoded,
    });
});

test("parse compatibility keeps strict and stripping object policies and config decoding", () => {
    assert.deepEqual(
        agentViewSchema.parse({
            agentId: "agent",
            executionOwnership: "daemon",
            name: "Research",
            role: null,
            description: null,
            status: "idle",
            networkId: null,
            networkName: null,
            hostId: null,
            terminalId: null,
            status_reason: null,
            observation_error: null,
            ignored: true,
        }),
        {
            agentId: "agent",
            executionOwnership: "daemon",
            name: "Research",
            role: null,
            description: null,
            status: "idle",
            networkId: null,
            networkName: null,
            hostId: null,
            terminalId: null,
            status_reason: null,
            observation_error: null,
        },
    );
    const invalidShell = { cwd: "/tmp", unexpected: true };
    assert.equal(createShellSchema.safeParse(invalidShell).success, false);
    assert.throws(() => createShellSchema.parse(invalidShell));
    assert.deepEqual(storedConfigSchema.parse({}), {});
});

test("strict Struct decodes transformed fields once and leaves absent optionals absent", () => {
    let decodes = 0;
    const once = Schema.String.pipe(
        Schema.decodeTo(Schema.String, {
            decode: SchemaGetter.transform((value) => {
                decodes++;
                return `${value}!`;
            }),
            encode: SchemaGetter.transform((value) => value.slice(0, -1)),
        }),
    );
    const schema = compatible(
        strictStruct({
            value: once,
            optional: Schema.optional(Schema.String),
        }),
    );
    assert.deepEqual(schema.parse({ value: "x" }), { value: "x!" });
    assert.equal(decodes, 1);
    assert.equal(
        Object.hasOwn(schema.parse({ value: "y" }), "optional"),
        false,
    );
});

test("integer fields preserve Zod safe-integer and finite-number rejection", () => {
    for (const value of [1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN]) {
        assert.equal(
            portsSchema.safeParse({ daemon: value, web: 3000 }).success,
            false,
        );
    }
});
