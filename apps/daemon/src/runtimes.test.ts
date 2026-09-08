import { mcpStatus } from "@aiox/domain";
import { expect, test } from "vitest";

import { RuntimeRegistry } from "@/runtimes";
import type { RuntimeControls } from "@/runtimes";

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
