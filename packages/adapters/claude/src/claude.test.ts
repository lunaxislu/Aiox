import { InvalidVendorReport } from "@aiox/vendor";
import { expect, test, vi } from "vitest";

import { ClaudeBinding } from "@/claude";
import * as inbox from "@/claude-inbox";

const controls = () => ({
    runtimeId: "runtime",
    setActivity: vi.fn(),
    settle: vi.fn(),
});
const report = {
    inboxPath: "/assigned",
    inboxToken: "secret",
    event: { hook_event_name: "SessionStart", session_id: "session" },
};

test("released bindings cannot become ready or accept hook reports", async () => {
    const binding = new ClaudeBinding(controls(), "/assigned");
    await binding.cleanup("execution_stopped");
    expect(() => binding.executionStarted()).toThrow(/stopped/);
    await expect(binding.observe(report)).rejects.toThrow(/stopped/);
});

test("readiness requires assigned inbox credential, connection and execution start", async () => {
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockResolvedValue();
    const control = controls();
    const binding = new ClaudeBinding(control, "/assigned");
    binding.requireMcp = true;
    const ready = vi.fn();
    binding.onReady = ready;
    try {
        await expect(
            binding.observe({ ...report, inboxPath: "/wrong" }),
        ).rejects.toThrow(/inbox/);
        await binding.observe(report);
        binding.mcpConnected();
        expect(ready).not.toHaveBeenCalled();
        expect(control.setActivity).not.toHaveBeenCalled();
        binding.executionStarted();
        expect(ready).toHaveBeenCalledOnce();
        await expect(
            binding.observe({ ...report, inboxToken: "changed" }),
        ).rejects.toThrow(/credential changed/);
        await binding.cleanup("external_connection_lost");
        expect(() => binding.executionStarted()).toThrow(/stopped/);
    } finally {
        probe.mockRestore();
    }
});

test("revocation during an inbox check cannot publish late readiness", async () => {
    let complete!: () => void;
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockImplementation(
        () =>
            new Promise<void>((resolve) => {
                complete = resolve;
            }),
    );
    const binding = new ClaudeBinding(controls(), "/assigned");
    const ready = vi.fn();
    binding.onReady = ready;
    binding.executionStarted();
    try {
        const pending = binding.observe(report);
        await binding.cleanup("external_connection_lost");
        complete();
        await expect(pending).rejects.toThrow(/exited/);
        expect(ready).not.toHaveBeenCalled();
    } finally {
        probe.mockRestore();
    }
});

test("malformed vendor reports are distinguished from valid reports with invalid inbox credentials", async () => {
    const binding = new ClaudeBinding(controls(), "/assigned");
    await expect(binding.observe({ event: {} })).rejects.toBeInstanceOf(
        InvalidVendorReport,
    );
    await expect(
        binding.observe({ ...report, inboxPath: "/wrong" }),
    ).rejects.not.toBeInstanceOf(InvalidVendorReport);
});
