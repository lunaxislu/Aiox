import { expect, test, vi } from "vitest";

import { boot } from "@/bootstrap";

vi.mock("@/bootstrap", () => ({ boot: vi.fn() }));

test("honors configured cwd and advertises the isolated daemon stop endpoint", async () => {
    const createShell = vi.fn().mockResolvedValue({ id: "shell" });
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const on = vi.spyOn(process, "on").mockReturnValue(process);
    vi.mocked(boot).mockResolvedValue({
        daemon: {
            createShell,
            ports: { daemon: 12345, web: 12346 },
            closed: Promise.resolve(),
        },
    } as unknown as Awaited<ReturnType<typeof boot>>);
    try {
        await import("@/dev-harness");
        expect(createShell).toHaveBeenCalledWith();
        const output = write.mock.calls.map(([text]) => String(text)).join("");
        expect(output).toContain("http://127.0.0.1:12345/api/daemon/stop");
        expect(output).not.toContain("aiox daemon stop");
        expect(output).not.toContain("refused, an execution is live");
        expect(output).toContain("Windows");
        expect(output).toContain("POSIX");
        expect(output).toContain("POSIX shells: stty size");
    } finally {
        on.mockRestore();
        write.mockRestore();
    }
});
