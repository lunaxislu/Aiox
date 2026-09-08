import { defaultShell } from "@aiox/terminal";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";

import type { DaemonHarness } from "@/testing";
import { startTestDaemon } from "@/testing";

let harness: DaemonHarness;

beforeEach(async () => {
    harness = await startTestDaemon();
});

afterEach(async () => {
    await harness.close();
});

function openShell(): { id: string } {
    const shell = defaultShell();
    return harness.daemon.createTerminal({
        file: shell.file,
        args: shell.args,
        cols: 80,
        rows: 24,
    });
}

/** Collects pty bytes; control frames arrive as text and are kept apart. */
function attach(terminalId: string) {
    const socket = new WebSocket(
        `ws://127.0.0.1:${harness.daemon.ports.web}/ws/terminal/${terminalId}`,
    );
    let output = "";
    const control: unknown[] = [];
    socket.on("message", (data: Buffer, isBinary: boolean) => {
        if (isBinary) output += data.toString("utf8");
        else control.push(JSON.parse(data.toString("utf8")));
    });
    const open = new Promise<void>((resolve, reject) => {
        socket.once("open", () => resolve());
        socket.once("error", reject);
    });
    return {
        socket,
        control,
        open,
        text: () => output,
        type: (line: string) => socket.send(Buffer.from(line, "utf8")),
        resize: (cols: number, rows: number) =>
            socket.send(JSON.stringify({ type: "resize", cols, rows })),
        close: () =>
            new Promise<void>((resolve) => {
                socket.once("close", () => resolve());
                socket.close();
            }),
    };
}

async function waitFor(
    predicate: () => boolean,
    label: string,
    timeout = 8000,
): Promise<void> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`timed out waiting for ${label}`);
}

describe("terminal attachment", () => {
    it("cleans an attempt's PTY when binding preparation fails", async () => {
        const terminal = openShell();
        const session = harness.daemon.services.terminals.get(terminal.id)!;
        await expect(
            harness.daemon.registerRuntime({
                networkId: null,
                terminalId: terminal.id,
                createBinding: async () => {
                    throw new Error("preparation failed");
                },
            }),
        ).rejects.toThrow("preparation failed");
        expect(session.alive).toBe(false);
        expect(
            harness.daemon.services.terminals.get(terminal.id),
        ).toBeUndefined();
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
        expect((await fetch(harness.apiUrl("/api/status"))).status).toBe(200);
    });

    it("rejects a foreign WebSocket origin and allows the actual Web origin", async () => {
        const terminal = openShell();
        const url = `ws://127.0.0.1:${harness.daemon.ports.web}/ws/terminal/${terminal.id}`;
        const foreign = new WebSocket(url, {
            origin: "https://foreign.example",
        });
        try {
            const result = await new Promise<string>((resolve) => {
                foreign.once("open", () => resolve("opened"));
                foreign.once("error", (error) => resolve(error.message));
            });
            expect(result).toContain("403");
        } finally {
            foreign.terminate();
        }
        const local = new WebSocket(url, { origin: harness.webUrl("") });
        try {
            await new Promise<void>((resolve, reject) => {
                local.once("open", resolve);
                local.once("error", reject);
            });
            expect(
                harness.daemon.services.terminals.get(terminal.id)?.alive,
            ).toBe(true);
        } finally {
            local.terminate();
        }
    });

    it("rejects an invalid encoded terminal path without affecting other connections", async () => {
        const terminal = openShell();
        const viewer = attach(terminal.id);
        await viewer.open;
        const invalid = new WebSocket(
            `ws://127.0.0.1:${harness.daemon.ports.web}/ws/terminal/%FF`,
        );
        try {
            const error = await new Promise<Error>((resolve, reject) => {
                const timer = setTimeout(
                    () => reject(new Error("invalid path was not rejected")),
                    500,
                );
                invalid.once("error", (error) => {
                    clearTimeout(timer);
                    resolve(error);
                });
            });
            expect(error.message).toContain("400");
            expect(viewer.socket.readyState).toBe(WebSocket.OPEN);
            expect((await fetch(harness.apiUrl("/api/status"))).status).toBe(
                200,
            );
        } finally {
            invalid.terminate();
            viewer.socket.terminate();
        }
    });

    it("keeps a failed-stop TUI usable, then cleans its exit without stopping the daemon", async () => {
        const terminal = openShell();
        const network = await harness.daemon.services.networks.create(
            "manual-exit",
            "deny",
        );
        let attempts = 0;
        const registered = await harness.daemon.registerRuntime({
            name: "manual-exit",
            networkId: network.id,
            terminalId: terminal.id,
            createBinding: (controls) => {
                controls.setActivity("idle");
                return {
                    deliver: async () => {},
                    stop: async () => {
                        if (++attempts === 1)
                            throw new Error("exit unconfirmed");
                    },
                };
            },
        });
        const preserved = { from: "b", to: "c", policy: "allow" as const };
        await harness.daemon.services.db.networks.replaceRouting(network.id, {
            defaultPolicy: "deny",
            routes: [
                { from: registered.runtimeId, to: "b", policy: "allow" },
                { from: "c", to: registered.runtimeId, policy: "allow" },
                preserved,
            ],
        });
        const viewer = attach(terminal.id);
        await viewer.open;
        try {
            const result = await harness.daemon.stop(true);
            expect(result.stopped).toBe(false);
            expect(
                harness.daemon.services.terminals.get(terminal.id)?.alive,
            ).toBe(true);
            viewer.type("exit\r");
            await waitFor(
                () =>
                    harness.daemon.services.runtimes.get(
                        registered.runtimeId,
                    ) === undefined,
                "runtime cleanup after manual exit",
            );
            expect(
                harness.daemon.services.runtimes.authenticate(registered.token),
            ).toBeUndefined();
            expect(
                harness.daemon.services.terminals.get(terminal.id),
            ).toBeUndefined();
            expect(
                await harness.daemon.services.networks.require(network.id),
            ).toEqual({
                ...network,
                routes: [preserved],
            });
            expect((await fetch(harness.webUrl("/api/status"))).status).toBe(
                200,
            );
            expect((await harness.daemon.stop(false)).stopped).toBe(true);
        } finally {
            viewer.socket.terminate();
        }
    });

    it("carries input to the shell and its output back", async () => {
        const terminal = openShell();
        const viewer = attach(terminal.id);
        await viewer.open;

        viewer.type("echo attach-works\r");
        await waitFor(
            () => viewer.text().includes("attach-works"),
            "shell output",
        );
        await viewer.close();
    });

    it("resizes the pty the shell is running in", async () => {
        const terminal = openShell();
        const viewer = attach(terminal.id);
        await viewer.open;

        viewer.resize(120, 40);
        // Give the resize a moment to land before the shell reads it.
        await new Promise((resolve) => setTimeout(resolve, 150));
        viewer.type("stty size\r");
        await waitFor(() => viewer.text().includes("40 120"), "new pty size");
        await viewer.close();
    });

    it("keeps the shell running when a viewer leaves, and replays for the next one", async () => {
        const terminal = openShell();
        const first = attach(terminal.id);
        await first.open;
        first.type("echo before-detach\r");
        await waitFor(
            () => first.text().includes("before-detach"),
            "first output",
        );

        // Closing a tab is a detach, never a stop.
        await first.close();
        const session = harness.daemon.services.terminals.get(terminal.id)!;
        expect(session.alive).toBe(true);

        const second = attach(terminal.id);
        await second.open;
        await waitFor(
            () => second.text().includes("before-detach"),
            "replayed output",
        );
        second.type("echo after-reattach\r");
        await waitFor(
            () => second.text().includes("after-reattach"),
            "live output after reattach",
        );
        await second.close();
        expect(session.alive).toBe(true);
    });

    it("serves two viewers of the same terminal at once", async () => {
        const terminal = openShell();
        const one = attach(terminal.id);
        const two = attach(terminal.id);
        await Promise.all([one.open, two.open]);

        one.type("echo both-see-this\r");
        await waitFor(
            () =>
                one.text().includes("both-see-this") &&
                two.text().includes("both-see-this"),
            "output on both viewers",
        );
        await one.close();

        two.type("echo still-here\r");
        await waitFor(
            () => two.text().includes("still-here"),
            "output after one viewer left",
        );
        await two.close();
    });

    it("tells an attached viewer when the shell exits", async () => {
        const terminal = openShell();
        const viewer = attach(terminal.id);
        await viewer.open;

        viewer.type("exit\r");
        await waitFor(
            () =>
                viewer.control.some(
                    (message) => (message as { type?: string }).type === "exit",
                ),
            "exit control frame",
        );
    });

    it("refuses to attach to a terminal that does not exist", async () => {
        const socket = new WebSocket(
            `ws://127.0.0.1:${harness.daemon.ports.web}/ws/terminal/nope`,
        );
        const error = await new Promise<Error>((resolve) => {
            socket.once("error", resolve);
        });
        expect(error.message).toContain("404");
    });

    it("ignores a malformed control frame instead of tearing the pty down", async () => {
        const terminal = openShell();
        const viewer = attach(terminal.id);
        await viewer.open;

        viewer.socket.send("not json at all");
        viewer.socket.send(JSON.stringify({ type: "resize", cols: -1 }));
        viewer.type("echo survived\r");
        await waitFor(
            () => viewer.text().includes("survived"),
            "output after bad control frames",
        );
        await viewer.close();
    });

    it("stops every managed terminal on a forced daemon stop", async () => {
        const terminal = openShell();
        const session = harness.daemon.services.terminals.get(terminal.id)!;
        const { pid } = session;

        const result = await harness.daemon.stop(true);
        expect(result.stopped).toBe(true);
        expect(result.warnings).toEqual([]);
        expect(session.alive).toBe(false);
        expect(() => process.kill(pid, 0)).toThrow(/ESRCH/);
    });
});
