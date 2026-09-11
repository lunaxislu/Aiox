import { mcpStatus } from "@aiox/domain";
import { expect, test } from "vitest";

import { RuntimeRegistry } from "@/runtimes";
import type { RuntimeControls } from "@/runtimes";

test("runtime observations retain a reason separately from request outcomes", async () => {
    const registry = new RuntimeRegistry();
    let controls!: RuntimeControls;
    const { record } = await registry.register({
        networkId: null,
        createBinding: (next) => {
            controls = next;
            return { deliver: async () => {}, stop: async () => {} };
        },
    });
    controls.setActivity("failed", {
        event: "StopFailure",
        reason: "rate_limit",
    });
    expect(record.observation).toEqual({
        event: "StopFailure",
        reason: "rate_limit",
    });
    controls.setActivity("reasoning", { event: "UserPromptSubmit" });
    expect(record.observation).toEqual({
        event: "UserPromptSubmit",
        reason: null,
    });
});

test("an early activity report stays starting until the binding is ready", async () => {
    const registry = new RuntimeRegistry();
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    let controls!: RuntimeControls;
    const registration = registry.register({
        networkId: "n",
        createBinding: async (next) => {
            controls = next;
            next.setActivity("idle");
            await ready;
            return { deliver: async () => {}, stop: async () => {} };
        },
    });
    const preparing = registry.get(controls.runtimeId)!;
    expect(preparing.activity).toBe("starting");
    expect(mcpStatus(preparing.activity)).toBeNull();
    controls.setActivity("awaiting-user");
    expect(preparing.activity).toBe("starting");

    release();
    const { record, token } = await registration;
    expect(record.activity).toBe("awaiting-user");
    expect(registry.authenticate(token)).toBe(record);
    controls.setActivity("idle");
    expect(record.activity).toBe("idle");
});

test("a failed preparation removes registration despite an early idle report", async () => {
    const registry = new RuntimeRegistry();
    let controls!: RuntimeControls;
    await expect(
        registry.register({
            networkId: "n",
            createBinding: async (next) => {
                controls = next;
                next.setActivity("idle");
                throw new Error("binding failed");
            },
        }),
    ).rejects.toThrow("binding failed");
    controls.setActivity("idle");
    expect(registry.get(controls.runtimeId)).toBeUndefined();
    expect(registry.list()).toEqual([]);
});

test("revocation preserves cleanup state and cannot issue a late credential", async () => {
    const registry = new RuntimeRegistry();
    let controls!: RuntimeControls;
    let release!: () => void;
    const preparing = new Promise<void>((resolve) => {
        release = resolve;
    });
    const registration = registry.register({
        networkId: "n",
        executionOwnership: "external",
        createBinding: async (next) => {
            controls = next;
            await preparing;
            return { deliver: async () => {}, stop: async () => {} };
        },
    });
    registry.revoke(controls.runtimeId);
    release();
    const { record, token } = await registration;
    expect(record.executionOwnership).toBe("external");
    expect(record.collaborationActive).toBe(false);
    expect(registry.authenticate(token)).toBeUndefined();
    expect(registry.get(record.id)).toBe(record);
});
