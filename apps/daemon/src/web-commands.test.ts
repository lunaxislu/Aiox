import {
    panelViewSchema,
    webCommandResultSchema,
    type PanelChange,
} from "@aiox/protocol";
import { Effect } from "effect";
import { expect, it, vi } from "vitest";

import {
    openTestApplication,
    startTestDaemon,
    type DaemonHarness,
} from "./testing";

async function harness(t: { onTestFinished(fn: () => unknown): void }) {
    const h = await startTestDaemon({
        terminal: async () => ({
            shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
            args: [],
            cwd: h.home,
        }),
        sequenceGapTimeout: 100,
    });
    const c = client(h);
    t.onTestFinished(async () => {
        // Teardown waits for shell preparation, so no spawn may stay held.
        c.spawn.mockRestore();
        for (const release of c.gates) release();
        await h.close();
    });
    return c;
}

function client(h: DaemonHarness) {
    const services = h.daemon.services;
    const sessionId = Effect.runSync(services.sequencer.open).clientSessionId;
    let requests = 0;
    const sequences = new Map<string, number>();
    const send = async (body: object) => {
        const response = await fetch(h.apiUrl("/api/web/commands"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
        // Asserted field by field below.
        const json: any = await response.json();
        return { status: response.status, body: json };
    };
    /** Builds one command; the same object retransmits the same request. */
    const command = (
        panelId: string,
        changes: PanelChange[],
        session: string = sessionId,
    ) => {
        const sequence = (sequences.get(session) ?? 0) + 1;
        sequences.set(session, sequence);
        return {
            clientSessionId: session,
            sequence,
            requestId: `6a8ed620-0000-4000-8000-${String(++requests).padStart(12, "0")}`,
            panelId,
            changes,
        };
    };
    const run = async (
        panelId: string,
        changes: PanelChange[],
        session?: string,
    ) => send(command(panelId, changes, session));
    const panel = async (id: string) =>
        panelViewSchema.parse(
            await (await fetch(h.apiUrl(`/api/panels/${id}`))).json(),
        );
    // Hold every shell spawn until the test releases it, in any order.
    const gates: (() => void)[] = [];
    const createShell = services.lifecycle.createShell.bind(services.lifecycle);
    const spawn = vi
        .spyOn(services.lifecycle, "createShell")
        .mockImplementation(async (...args) => {
            await new Promise<void>((resolve) => gates.push(resolve));
            return createShell(...args);
        });
    return { h, services, send, command, run, panel, gates, spawn, sessionId };
}

it("answers registration before the shell exists and prepares shells in parallel", async (t) => {
    const { services, run, panel, gates, spawn } = await harness(t);
    const created = await run("w1", [
        {
            type: "panel.create",
            name: "Shells",
            paneId: "pane1",
            tabId: "t1",
        },
        { type: "tab.create", tabId: "t2", target: { toPaneId: "pane1" } },
        {
            type: "tab.create",
            tabId: "t3",
            target: {
                split: {
                    targetPaneId: "pane1",
                    side: "right",
                    paneId: "pane2",
                    splitId: "split1",
                },
            },
        },
    ]);
    expect(created.status).toBe(200);
    const result = webCommandResultSchema.parse(created.body);
    // One pane + tab per new panel, a split with a new pane + tab, nothing prepared yet.
    expect(result.panel!.tabs.map((t) => [t.id, t.presentation])).toEqual([
        ["t1", "preparing"],
        ["t2", "preparing"],
        ["t3", "preparing"],
    ]);
    expect(result.panel!.layout).toMatchObject({
        type: "split",
        id: "split1",
        children: [
            { id: "pane1", tabIds: ["t1", "t2"] },
            { id: "pane2", tabIds: ["t3"] },
        ],
    });
    await vi.waitFor(() => expect(gates).toHaveLength(3));
    // Preparation of all three runs at once; the last released joins first.
    gates[2]!();
    await vi.waitFor(async () =>
        expect(
            (await panel("w1")).tabs.find((t) => t.id === "t3")!.presentation,
        ).toBe("shell"),
    );
    expect(
        (await panel("w1")).tabs.find((t) => t.id === "t1")!.presentation,
    ).toBe("preparing");
    // One failure does not undo the registration or its siblings.
    spawn.mockImplementationOnce(async () => {
        throw new Error("spawn EACCES");
    });
    const failing = await run("w1", [
        { type: "tab.create", tabId: "t4", target: { toPaneId: "pane2" } },
    ]);
    expect(failing.status).toBe(200);
    gates[0]!();
    gates[1]!();
    await vi.waitFor(async () =>
        expect(
            (await panel("w1")).tabs.map((t) => [t.id, t.presentation]),
        ).toEqual([
            ["t1", "shell"],
            ["t2", "shell"],
            ["t3", "shell"],
            ["t4", "start-failed"],
        ]),
    );
    expect(
        (await panel("w1")).tabs.find((t) => t.id === "t4")!.notice?.message,
    ).toBe("spawn EACCES");
    expect(
        new Set((await panel("w1")).tabs.map((t) => t.terminalId)).size,
    ).toBe(4);
    expect(services.cleanups.list()).toEqual([]);
});

it("keeps a preparing tab where the user moved it and stops shells whose tab closed", async (t) => {
    const { services, run, panel, gates } = await harness(t);
    await run("w1", [
        { type: "panel.create", name: "Shells", paneId: "pane1", tabId: "t1" },
        { type: "tab.create", tabId: "t2", target: { toPaneId: "pane1" } },
    ]);
    // Move t1 into a new split and close t2 before either shell exists.
    const moved = await run("w1", [
        {
            type: "tab.move",
            tabId: "t1",
            target: {
                split: {
                    targetPaneId: "pane1",
                    side: "bottom",
                    paneId: "pane2",
                    splitId: "split1",
                },
            },
        },
        {
            type: "tab.close",
            tabId: "t2",
            expectedRuntimeId: null,
            confirm: false,
        },
    ]);
    expect(moved.status).toBe(200);
    // Closing t2 emptied pane1; it merged away and t1's new pane remains.
    expect(moved.body.panel.layout).toEqual({
        type: "pane",
        id: "pane2",
        tabIds: ["t1"],
    });
    await vi.waitFor(() => expect(gates).toHaveLength(2));
    gates[0]!();
    gates[1]!();
    await vi.waitFor(async () => {
        const current = await panel("w1");
        expect(current.tabs.map((t) => [t.id, t.presentation])).toEqual([
            ["t1", "shell"],
        ]);
        expect(current.layout).toMatchObject({ id: "pane2" });
    });
    // The shell prepared for the closed tab never joined and was stopped.
    await vi.waitFor(
        () => {
            expect(services.cleanups.list()).toEqual([]);
            expect(services.terminals.views()).toHaveLength(1);
        },
        { timeout: 5000 },
    );
    // A deleted tab ID never comes back, even from a later create.
    expect(
        (
            await run("w1", [
                {
                    type: "tab.create",
                    tabId: "t2",
                    target: { toPaneId: "pane2" },
                },
            ])
        ).body.code,
    ).toBe("id_deleted");
});

it("reports a shell that cannot join or stop without undoing the removal", async (t) => {
    const { services, run, panel, gates } = await harness(t);
    await run("w1", [
        { type: "panel.create", name: "Shells", paneId: "pane1", tabId: "t1" },
    ]);
    await vi.waitFor(() => expect(gates).toHaveLength(1));
    gates[0]!();
    await vi.waitFor(async () =>
        expect((await panel("w1")).tabs[0]!.presentation).toBe("shell"),
    );
    const terminalId = (await panel("w1")).tabs[0]!.terminalId!;
    const stop = vi
        .spyOn(services.terminals, "kill")
        .mockRejectedValueOnce(new Error("pid 7 not confirmed dead"));
    // Closing a live shell needs confirmation; with it, the removal is the result.
    expect(
        (
            await run("w1", [
                {
                    type: "tab.close",
                    tabId: "t1",
                    expectedRuntimeId: null,
                    confirm: false,
                },
            ])
        ).body.code,
    ).toBe("confirmation_required");
    const closed = await run("w1", [
        {
            type: "tab.close",
            tabId: "t1",
            expectedRuntimeId: null,
            confirm: true,
        },
    ]);
    expect(closed.status).toBe(200);
    // The last tab left; the panel keeps one empty pane.
    expect(closed.body.panel.layout).toEqual({
        type: "pane",
        id: "pane1",
        tabIds: [],
    });
    await vi.waitFor(() =>
        expect(services.cleanups.view(terminalId)).toMatchObject({
            panelId: "w1",
            tabId: "t1",
            reason: "tab-closed",
            state: "failed",
            error: "pid 7 not confirmed dead",
        }),
    );
    expect(services.appState.snapshot().cleanups).toHaveLength(1);
    // The retry confirms termination; the cleanup record then disappears.
    await vi.waitFor(() => expect(services.cleanups.list()).toEqual([]), {
        timeout: 5000,
    });
    expect(stop).toHaveBeenCalled();
    expect(services.terminals.views()).toEqual([]);

    // A shell whose join cannot be stored stays tracked until stopped.
    await run("w1", [
        { type: "tab.create", tabId: "t5", target: { toPaneId: "pane1" } },
    ]);
    await vi.waitFor(() => expect(gates).toHaveLength(2));
    vi.spyOn(services.db.hostState, "mutatePanel").mockImplementationOnce(
        async () => {
            throw new Error("SQLITE_BUSY");
        },
    );
    gates[1]!();
    await vi.waitFor(async () =>
        expect((await panel("w1")).tabs[0]).toMatchObject({
            id: "t5",
            terminalId: null,
            presentation: "start-failed",
            notice: { message: "SQLITE_BUSY" },
        }),
    );
    await vi.waitFor(
        () => {
            expect(services.cleanups.list()).toEqual([]);
            expect(services.terminals.views()).toEqual([]);
        },
        { timeout: 5000 },
    );
});

it("orders a session's commands, rejects finalized retransmissions and fails a missing range unexecuted", async (t) => {
    const { h, services, send, command, run, panel, sessionId } =
        await harness(t);
    const rpc = await openTestApplication(h);
    await rpc.next();
    const create = command("w1", [
        { type: "panel.create", name: "A", paneId: "pane1", tabId: "t1" },
    ]);
    expect((await send(create)).status).toBe(200);
    const rename = command("w1", [{ type: "panel.rename", name: "B" }]);
    const renamed = await send(rename);
    // A finalized request has no cached payload; retransmission must reconcile and never reexecute.
    const retried = await send(rename);
    expect(retried.status).toBe(409);
    expect(retried.body.code).toBe("result_expired");
    expect((await panel("w1")).revision).toBe(renamed.body.panel.revision);
    expect(
        (
            await send({
                ...rename,
                changes: [{ type: "panel.rename", name: "C" }],
            })
        ).body.code,
    ).toBe("result_expired");

    // Sequence 3 never arrives; 4 waits, then both fail unexecuted.
    const lost = command("w1", [{ type: "panel.rename", name: "lost" }]);
    const waiting = command("w1", [{ type: "panel.rename", name: "late" }]);
    const failed = await send(waiting);
    expect(failed.status).toBe(409);
    expect(failed.body.code).toBe("sequence_gap");
    expect((await send(lost)).body.code).toBe("result_expired");
    expect((await panel("w1")).name).toBe("B");
    // Another window is unaffected and the session continues after the range.
    const other = Effect.runSync(services.sequencer.open).clientSessionId;
    expect(
        (await run("w1", [{ type: "panel.rename", name: "D" }], other)).status,
    ).toBe(200);
    expect(
        (await run("w1", [{ type: "panel.rename", name: "E" }])).status,
    ).toBe(200);
    expect((await panel("w1")).name).toBe("E");
    let event = await rpc.next();
    while (event.type !== "sequence-failure") event = await rpc.next();
    expect(event.failure).toEqual({
        clientSessionId: sessionId,
        code: "sequence_gap",
        missing: [3],
        unexecuted: [{ sequence: 4, requestId: waiting.requestId }],
    });
    await rpc.close();
});

it("deletes a workspace panel as one result and stops its shells afterwards", async (t) => {
    const { services, run, gates, h } = await harness(t);
    await run("w1", [
        { type: "panel.create", name: "A", paneId: "pane1", tabId: "t1" },
    ]);
    await vi.waitFor(() => expect(gates).toHaveLength(1));
    gates[0]!();
    await vi.waitFor(() => expect(services.terminals.views()).toHaveLength(1));
    const deleted = await run("w1", [{ type: "panel.delete", confirm: true }]);
    expect(deleted.body).toMatchObject({ panel: null });
    expect((await fetch(h.apiUrl("/api/panels/w1"))).status).toBe(404);
    // An interactive sh ignores SIGTERM; confirmation waits for SIGKILL.
    await vi.waitFor(() => expect(services.terminals.views()).toEqual([]), {
        timeout: 5000,
    });
    // A late create of the deleted panel ID is refused, not resurrected.
    expect(
        (
            await run("w1", [
                {
                    type: "panel.create",
                    name: "A",
                    paneId: "pane1",
                    tabId: "t9",
                },
            ])
        ).body.code,
    ).toBe("id_deleted");
});
