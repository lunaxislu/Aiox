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
    controls.setStatus("failed", "rate_limit");
    expect(record.status).toBe("failed");
    expect(record.status_reason).toBe("rate_limit");
    controls.setStatus("working");
    expect(record.status).toBe("working");
    expect(record.status_reason).toBeNull();
});

test("an early status report stays aiox-preparing until the binding is ready", async () => {
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
            next.setStatus("idle");
            await ready;
            return { deliver: async () => {}, stop: async () => {} };
        },
    });
    const preparing = registry.get(controls.runtimeId)!;
    expect(preparing.status).toBe("aiox-preparing");
    controls.setStatus("awaiting-user");
    expect(preparing.status).toBe("aiox-preparing");

    release();
    const { record, token } = await registration;
    expect(record.status).toBe("awaiting-user");
    expect(registry.authenticate(token)).toBe(record);
    controls.setStatus("idle");
    expect(record.status).toBe("idle");
});

test("a failed preparation removes registration despite an early idle report", async () => {
    const registry = new RuntimeRegistry();
    let controls!: RuntimeControls;
    await expect(
        registry.register({
            networkId: "n",
            createBinding: async (next) => {
                controls = next;
                next.setStatus("idle");
                throw new Error("binding failed");
            },
        }),
    ).rejects.toThrow("binding failed");
    controls.setStatus("idle");
    expect(registry.get(controls.runtimeId)).toBeUndefined();
    expect(registry.list()).toEqual([]);
});

test("revocation preserves cleanup state and cannot issue a late credential", async () => {
    const registry = new RuntimeRegistry();
    let controls!: RuntimeControls;
    let revoked = 0;
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
            return {
                deliver: async () => {},
                stop: async () => {},
                revoke: () => {
                    revoked++;
                },
            };
        },
    });
    registry.revoke(controls.runtimeId);
    release();
    const { record, token } = await registration;
    registry.revoke(record.id);
    expect(revoked).toBe(1);
    expect(record.executionOwnership).toBe("external");
    expect(record.collaborationActive).toBe(false);
    expect(registry.authenticate(token)).toBeUndefined();
    expect(registry.get(record.id)).toBe(record);
});
