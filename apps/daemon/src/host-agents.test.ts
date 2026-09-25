import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { saveConfig } from "@aiox/config";
import {
    hostCommandResultSchema,
    panelLayoutReferences,
    type PanelLayout,
} from "@aiox/protocol";
import type { VendorAdapter, VendorBinding } from "@aiox/vendor";
import { Effect } from "effect";
import { expect, test, vi } from "vitest";

import { placeAgent } from "./host-agents";
import { initialHostPanel, launcher } from "./host-run";
import { hostResult, startTestDaemon } from "./testing";

test.skipIf(process.platform === "win32")(
    "Agent commands validate before stop, preserve shells, apply scoped YAML and expose failures",
    async (t) => {
        const adapter: VendorAdapter = {
            id: "codex",
            createExecution() {
                return Effect.succeed({
                    connection: null,
                    start(command, owner) {
                        return owner.foreground(
                            command as Parameters<typeof owner.foreground>[0],
                        );
                    },
                });
            },
            createBinding(controls) {
                let ready = false;
                const binding: VendorBinding = {
                    get wasReady() {
                        return ready;
                    },
                    onReady: undefined,
                    onReleased: undefined,
                    async prepare(input) {
                        if (input.args.includes("--fail"))
                            throw new Error("W6 preparation failure");
                        return {
                            file: process.execPath,
                            cwd: input.cwd,
                            env: {
                                ...input.env,
                                REPORT: input.reportUrl,
                                TOKEN: input.reportToken,
                            },
                            args: [
                                "--input-type=module",
                                "-e",
                                `await fetch(process.env.REPORT,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+process.env.TOKEN},body:'{}'});setInterval(()=>{},1000);`,
                            ],
                        };
                    },
                    async observe() {
                        ready = true;
                        controls.setStatus("idle");
                        binding.onReady?.();
                    },
                    executionStarted() {},
                    async processExited() {},
                    mcpConnected() {},
                    async connectionLost() {},
                    async cleanup() {},
                    async deliver() {},
                };
                return binding;
            },
        };
        const h = await startTestDaemon({
            adapters: [adapter],
            terminal: async () => ({
                shell: "/bin/bash",
                args: ["--noprofile", "--norc"],
                cwd: h.home,
            }),
        });
        t.onTestFinished(() => h.close(), 30000);
        await saveConfig(
            {
                ports: h.daemon.ports,
                terminal: {
                    shell: "/bin/bash",
                    args: ["--noprofile", "--norc"],
                },
            },
            { home: h.home },
        );
        const yaml = async (extra = "", policy = "deny") =>
            writeFile(
                join(h.home, "aiox.yaml"),
                `host: {name: demo}\nagents:\n  a: {adapter: codex${extra}}\n  b: {adapter: codex}\n  c: {adapter: codex}\nnetworks:\n  team: {agents: [a, b, c], routing: {default: ${policy}}}\n`,
            );
        await yaml();
        const post = async (path: string, body: unknown) => {
            const r = await fetch(h.apiUrl(path), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
            return r.headers.get("content-type")?.includes("ndjson")
                ? { status: r.status, body: await hostResult(r) }
                : { status: r.status, body: await r.json() };
        };
        const request = () => ({
            requestId: randomUUID(),
            source: { directory: h.home },
        });
        const finish = async (result: Awaited<ReturnType<typeof post>>) => {
            expect(result.status).toBe(200);
            return hostCommandResultSchema.parse(result.body);
        };
        expect(
            (await finish(await post("/api/hosts/run", request()))).state,
        ).toBe("succeeded");
        const state = await h.daemon.services.db.hostState.snapshot();
        const host = state.hosts[0]!,
            network = state.networks[0]!;
        const runtime = (key: string) =>
            h.daemon.services.runtimes
                .list()
                .find((r) => r.hostId === host.id && r.name === key);
        const initial = runtime("a")!.id,
            terminal = runtime("a")!.terminalId!;
        const route = `/api/hosts/${host.id}/networks/${network.id}/route`;
        expect(
            (
                await post(route, {
                    operation: {
                        kind: "between",
                        action: "unblock",
                        agents: ["a", "b", "c"],
                    },
                })
            ).status,
        ).toBe(200);
        const busy = await finish(
            await post("/api/hosts/agents/start", {
                ...request(),
                agents: ["a", "a"],
            }),
        );
        expect(busy.targets).toHaveLength(1);
        expect(busy.targets[0]!.state).toBe("unchanged");
        expect(runtime("a")!.id).toBe(initial);
        await yaml("", "allow");
        expect(
            (
                await post("/api/hosts/agents/restart", {
                    ...request(),
                    agents: ["a"],
                })
            ).status,
        ).toBe(409);
        expect(runtime("a")!.id).toBe(initial);
        await yaml();
        expect(
            (
                await post("/api/hosts/agents/restart", {
                    ...request(),
                    agents: ["a", "missing"],
                })
            ).status,
        ).toBe(400);
        expect(runtime("a")!.id).toBe(initial);
        expect(
            (
                await post(route, {
                    operation: {
                        kind: "directed",
                        action: "block",
                        from: "a",
                        to: ["a"],
                    },
                })
            ).status,
        ).toBe(400);
        const beforeInvalid = (await h.daemon.services.db.hostState.snapshot())
            .networks;
        expect(
            (
                await post(route, {
                    operation: {
                        kind: "directed",
                        action: "block",
                        from: "a",
                        to: ["b", "missing"],
                    },
                })
            ).status,
        ).toBe(404);
        expect(
            (await h.daemon.services.db.hostState.snapshot()).networks,
        ).toEqual(beforeInvalid);
        expect(
            (
                await post(`/api/hosts/${host.id}/networks/wrong/route`, {
                    operation: {
                        kind: "between",
                        action: "block",
                        agents: ["a", "b"],
                    },
                })
            ).status,
        ).toBe(404);
        for (const [from, to] of [
            ["a", "d"],
            ["d", "a"],
        ]) {
            const before = await h.daemon.services.db.hostState.snapshot();
            await writeFile(
                join(h.home, "aiox.yaml"),
                `host: {name: demo}\nagents:\n  a: {adapter: codex}\n  b: {adapter: codex}\n  c: {adapter: codex}\n  d: {adapter: codex}\nnetworks:\n  team:\n    agents: [a, b, c, d]\n    routing:\n      default: deny\n      allow: [{from: ${from}, to: [${to}]}]\n`,
            );
            const rejected = await post("/api/hosts/agents/restart", {
                ...request(),
                agents: ["a"],
            });
            expect(rejected).toMatchObject({
                status: 400,
                body: { code: "invalid_yaml", stage: "yaml" },
            });
            expect(rejected).toMatchObject({
                body: { message: expect.stringContaining(`${from} -> ${to}`) },
            });
            expect(rejected).toMatchObject({
                body: { message: expect.stringContaining("aiox host restart") },
            });
            expect(runtime("a")!.id).toBe(initial);
            expect(await h.daemon.services.db.hostState.snapshot()).toEqual(
                before,
            );
        }
        await yaml();
        const stopPath = `/api/hosts/${host.id}/agents/stop`;
        const configFile = join(h.home, ".aiox", "config.json");
        const validConfig = await readFile(configFile, "utf8");
        const beforeInvalidConfig =
            await h.daemon.services.db.hostState.snapshot();
        await writeFile(configFile, "{");
        try {
            for (const action of ["block", "unblock", "reset"]) {
                expect(
                    await post(route, {
                        operation: {
                            kind: "directed",
                            action,
                            from: "a",
                            to: ["b"],
                        },
                    }),
                ).toMatchObject({
                    status: 500,
                    body: { code: "invalid_config", stage: "config" },
                });
            }
            expect(
                await post(stopPath, {
                    requestId: randomUUID(),
                    agents: ["a"],
                }),
            ).toMatchObject({
                status: 500,
                body: { code: "invalid_config", stage: "config" },
            });
            expect(runtime("a")!.id).toBe(initial);
            expect(h.daemon.services.terminals.get(terminal)?.alive).toBe(true);
            expect(await h.daemon.services.db.hostState.snapshot()).toEqual(
                beforeInvalidConfig,
            );
        } finally {
            await writeFile(configFile, validConfig);
        }

        expect(
            (
                await finish(
                    await post(stopPath, {
                        requestId: randomUUID(),
                        agents: ["a"],
                    }),
                )
            ).state,
        ).toBe("succeeded");
        expect(runtime("a")).toBeUndefined();
        expect(h.daemon.services.terminals.get(terminal)?.alive).toBe(true);
        expect(
            (
                await post("/api/hosts/agents/restart", {
                    ...request(),
                    agents: ["b", "a"],
                })
            ).status,
        ).toBe(409);
        expect(runtime("b")).toBeDefined();
        const start = { ...request(), agents: ["a"] };
        const started = await finish(
            await post("/api/hosts/agents/start", start),
        );
        expect(started.state).toBe("succeeded");
        expect(runtime("a")!.id).not.toBe(initial);
        expect(runtime("a")!.terminalId).toBe(terminal);
        const activeRuntimeId = runtime("a")!.id;
        // Finalized commands retain the request key, not the result payload.
        // Replays are rejected without executing the start again.
        const replay = await post("/api/hosts/agents/start", start);
        expect(replay.status).toBe(409);
        expect(replay.body).toMatchObject({
            code: "result_expired",
            stage: "cli",
        });
        expect(runtime("a")!.id).toBe(activeRuntimeId);
        const after = (await h.daemon.services.db.hostState.snapshot())
            .networks[0]!;
        expect(
            after.edges.find((e) => e.from === "a" && e.to === "b"),
        ).toMatchObject({ policy: "deny", source: "manifest-default" });
        expect(
            after.edges.find((e) => e.from === "b" && e.to === "c"),
        ).toMatchObject({ policy: "allow", source: "runtime-override" });
        await yaml(", args: [--fail]");
        const failed = await finish(
            await post("/api/hosts/agents/restart", {
                ...request(),
                agents: ["a"],
            }),
        );
        expect(failed.state).toBe("failed");
        expect(failed.targets[0]!.error?.message).toContain(
            "W6 preparation failure",
        );
        expect(h.daemon.services.terminals.get(terminal)?.alive).toBe(true);
        expect(
            (
                await h.daemon.services.db.hostState.snapshot()
            ).panels[0]!.tabs.find((t) => t.terminalId === terminal)
                ?.presentation,
        ).toBe("start-failed");
        // Execute the Host command itself in the target panel's shell: waiting for
        // the parent shell to consume another injected command would deadlock.
        const caller = await h.daemon.services.lifecycle.createShell({
            cwd: h.home,
        });
        const current = (await h.daemon.services.db.hostState.snapshot())
            .panels[0]!;
        const panes = panelLayoutReferences(current.layout).panes;
        panes[0]!.tabIds.push("caller");
        current.tabs.push({
            id: "caller",
            terminalId: caller.id,
            label: "Shell",
            agentKey: null,
            runtimeId: null,
            presentation: "shell",
            notice: null,
        });
        await h.daemon.services.db.hostState.mutatePanel(
            current.id,
            () => current,
        );
        const script = join(h.home, "caller.cjs");
        await writeFile(
            script,
            `import(${JSON.stringify(launcher.href)}).then(async ({createFoundationPort})=>{try{await createFoundationPort({home:${JSON.stringify(h.home)}}).execute({command:'host.agent.start',args:['a'],options:{path:${JSON.stringify(h.home)}}});console.log('CALLER_DONE');}catch(e){console.error('CALLER_FAILED',e.message);process.exitCode=1;}});`,
        );
        const session = h.daemon.services.terminals.get(caller.id)!;
        let output = "";
        const unsubscribe = session.subscribe({
            data: (data) => {
                output += Buffer.from(data).toString();
            },
            exit: () => {},
        });
        t.onTestFinished(unsubscribe);
        const invoke = () =>
            session.write(
                `${JSON.stringify(process.execPath)} ${JSON.stringify(script)}\r`,
            );
        invoke();
        await vi.waitFor(() => expect(output).toContain("CALLER_FAILED"), {
            timeout: 15000,
        });
        let tabs = (await h.daemon.services.db.hostState.snapshot()).panels[0]!
            .tabs;
        expect(tabs.find((t) => t.terminalId === terminal)?.presentation).toBe(
            "start-failed",
        );
        expect(tabs.find((t) => t.terminalId === caller.id)?.presentation).toBe(
            "start-failed",
        );
        await yaml();
        output = "";
        invoke();
        await vi.waitFor(() => expect(runtime("a")?.phase).toBe("running"), {
            timeout: 15000,
        });
        await vi.waitFor(
            async () =>
                expect(
                    h.daemon.services.hostCommands.busy(
                        (await h.daemon.services.db.hostState.snapshot())
                            .hosts[0]!.id,
                    ),
                ).toBe(false),
            { timeout: 15000 },
        );
        expect(runtime("a")!.terminalId).toBe(caller.id);
        tabs = (await h.daemon.services.db.hostState.snapshot()).panels[0]!
            .tabs;
        expect(tabs.some((t) => t.terminalId === terminal)).toBe(false);
        expect(h.daemon.services.terminals.get(terminal)).toBeUndefined();
        await h.daemon.services.lifecycle.stopRuntime(runtime("a")!.id);
        await vi.waitFor(() => expect(output).toContain("CALLER_DONE"), {
            timeout: 5000,
        });
        const file = join(h.home, "aiox.yaml");
        await writeFile(
            file,
            (await readFile(file, "utf8"))
                .replace("networks:", "  d: {adapter: codex}\nnetworks:")
                .replace("[a, b, c]", "[a, b, c, d]"),
        );
        const create = vi
            .spyOn(h.daemon.services.lifecycle, "createShell")
            .mockRejectedValueOnce(new Error("W6 shell failure"));
        const shellFailure = await finish(
            await post("/api/hosts/agents/start", {
                ...request(),
                agents: ["d"],
            }),
        );
        expect(shellFailure.state).toBe("failed");
        const failedSeat = (
            await h.daemon.services.db.hostState.snapshot()
        ).panels[0]!.tabs.find((t) => t.agentKey === "d")!;
        expect(failedSeat).toMatchObject({
            terminalId: null,
            presentation: "start-failed",
        });
        expect(failedSeat.notice?.message).toContain("W6 shell failure");
        create.mockRestore();
        expect(
            (
                await finish(
                    await post("/api/hosts/agents/start", {
                        ...request(),
                        agents: ["d"],
                    }),
                )
            ).state,
        ).toBe("succeeded");
        expect(runtime("d")).toBeDefined();
        expect(
            (
                await h.daemon.services.db.hostState.snapshot()
            ).networks[0]!.members.some((m) => m.agentKey === "d"),
        ).toBe(true);
        const oldB = runtime("b")!.id,
            oldC = runtime("c")!.id;
        expect(
            (
                await finish(
                    await post("/api/hosts/agents/restart", {
                        ...request(),
                        agents: ["b", "c", "b"],
                    }),
                )
            ).state,
        ).toBe("succeeded");
        expect(runtime("b")!.id).not.toBe(oldB);
        expect(runtime("c")!.id).not.toBe(oldC);
        const preserved = runtime("b")!.id;
        const stopFailure = vi
            .spyOn(h.daemon.services.lifecycle, "stopRuntime")
            .mockRejectedValueOnce(new Error("W6 stop refused"));
        const refused = await finish(
            await post("/api/hosts/agents/restart", {
                ...request(),
                agents: ["b"],
            }),
        );
        expect(refused).toMatchObject({
            state: "failed",
            error: { message: "W6 stop refused" },
        });
        expect(runtime("b")!.id).toBe(preserved);
        stopFailure.mockRestore();
        expect(
            (
                await finish(
                    await post("/api/hosts/agents/restart", {
                        ...request(),
                        agents: ["b"],
                    }),
                )
            ).state,
        ).toBe("succeeded");
        // Reproduce the user's CLI path after independently splitting both columns.
        await writeFile(
            file,
            (await readFile(file, "utf8"))
                .replace("networks:", "  e: {adapter: codex}\nnetworks:")
                .replace("[a, b, c, d]", "[a, b, c, d, e]"),
        );
        const manual = (await h.daemon.services.db.hostState.snapshot())
            .panels[0]!;
        const callerTab = manual.tabs.find((t) => t.terminalId === caller.id)!;
        const bTab = manual.tabs.find(
            (t) => t.terminalId === runtime("b")!.terminalId,
        )!;
        const cTab = manual.tabs.find(
            (t) => t.terminalId === runtime("c")!.terminalId,
        )!;
        const rest = manual.tabs.filter(
            (t) => ![callerTab.id, bTab.id, cTab.id].includes(t.id),
        );
        const pane = (id: string, tabIds: string[]) => ({
            type: "pane" as const,
            id,
            tabIds,
        });
        manual.layout = {
            type: "split",
            id: "split-1",
            axis: "x",
            weights: [0.5, 0.5],
            children: [
                {
                    type: "split",
                    id: "split-2",
                    axis: "y",
                    weights: [0.5, 0.5],
                    children: [
                        pane("top-left", [callerTab.id]),
                        pane("bottom-left", [bTab.id]),
                    ],
                },
                {
                    type: "split",
                    id: "split-3",
                    axis: "y",
                    weights: [0.5, 0.5],
                    children: [
                        pane("top-right", [cTab.id]),
                        pane(
                            "bottom-right",
                            rest.map((t) => t.id),
                        ),
                    ],
                },
            ],
        };
        await h.daemon.services.db.hostState.mutatePanel(
            manual.id,
            () => manual,
        );
        await writeFile(
            script,
            (await readFile(script, "utf8")).replace(
                "args:['a']",
                "args:['a','e']",
            ),
        );
        output = "";
        invoke();
        await vi.waitFor(() => expect(runtime("e")?.phase).toBe("running"), {
            timeout: 15000,
        });
        await vi.waitFor(
            async () =>
                expect(
                    h.daemon.services.hostCommands.busy(
                        (await h.daemon.services.db.hostState.snapshot())
                            .hosts[0]!.id,
                    ),
                ).toBe(false),
            { timeout: 15000 },
        );
        const placed = (await h.daemon.services.db.hostState.snapshot())
            .panels[0]!;
        const second = placed.tabs.find(
            (t) => t.terminalId === runtime("e")!.terminalId,
        )!;
        const right = panelLayoutReferences(placed.layout).panes.find(
            (p) => p.id === "top-right",
        )!;
        expect(right.tabIds).toContain(second.id);
        expect(runtime("a")!.terminalId).toBe(caller.id);
        await h.daemon.services.lifecycle.stopRuntime(runtime("a")!.id);
        await vi.waitFor(() => expect(output).toContain("CALLER_DONE"), {
            timeout: 5000,
        });
    },
    90000,
);

test("placement uses current pane order, caller slot and stopped seats", () => {
    const panel = initialHostPanel("h", "n", "Host", ["a", "b", "c"], {
        preset: "auto",
    });
    const panes = panelLayoutReferences(panel.layout).panes;
    const a = panel.tabs[0]!,
        b = panel.tabs[1]!;
    a.terminalId = "old-a";
    a.presentation = "stopped";
    b.terminalId = "caller";
    b.presentation = "shell";
    b.agentKey = null;
    expect(placeAgent(panel, "a", 0, "caller").id).toBe(b.id);
    const added = placeAgent(panel, "d", 1, "caller");
    expect(panes[2]!.tabIds).toContain(added.id);
    expect(a.presentation).toBe("stopped");
    expect(placeAgent(panel, "a", 0).id).toBe(a.id);
});

test.each([
    { left: [0.5, 0.5], right: [0.5, 0.5], order: [0, 1, 2, 3] },
    { left: [0.75, 0.25], right: [0.25, 0.75], order: [0, 1, 3, 2] },
])(
    "placement follows screen top/left after independent column splits: %j",
    ({ left, right, order }) => {
        const panel = initialHostPanel("h", "n", "Host", ["a", "b", "c", "d"], {
            preset: "grid",
            rows: 2,
            columns: 2,
        });
        const panes = panelLayoutReferences(panel.layout).panes;
        panel.layout = {
            type: "split",
            id: "split-4",
            axis: "x",
            weights: [0.4, 0.6],
            children: [
                {
                    type: "split",
                    id: "split-5",
                    axis: "y",
                    weights: left,
                    children: [panes[0]!, panes[2]!],
                },
                {
                    type: "split",
                    id: "split-6",
                    axis: "y",
                    weights: right,
                    children: [panes[1]!, panes[3]!],
                },
            ],
        };
        panel.tabs[0]!.terminalId = "caller";
        panel.tabs[0]!.presentation = "shell";
        const layoutBefore = structuredClone(panel.layout);
        for (let index = 0; index < 4; index++) {
            const added = placeAgent(panel, `new-${index}`, index, "caller");
            expect(panes[order[index]!]!.tabIds).toContain(added.id);
        }
        // Geometry is only read: keep the user's split tree and weights.
        const shape = (layout: PanelLayout): unknown =>
            layout.type === "pane"
                ? layout.id
                : {
                      axis: layout.axis,
                      weights: layout.weights,
                      children: layout.children.map(shape),
                  };
        expect(shape(panel.layout)).toEqual(shape(layoutBefore));
    },
);

test("Agent HTTP keeps config then YAML then CLI error precedence before any mutation", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    const invoke = async () => {
        const r = await fetch(h.apiUrl("/api/hosts/agents/start"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                requestId: randomUUID(),
                source: { directory: h.home },
                agents: [],
            }),
        });
        return { status: r.status, body: await r.json() };
    };
    await writeFile(join(h.home, "aiox.yaml"), "invalid: [");
    expect(await invoke()).toMatchObject({
        status: 400,
        body: { code: "invalid_yaml", stage: "yaml" },
    });
    await writeFile(join(h.home, ".aiox", "config.json"), "{");
    expect(await invoke()).toMatchObject({
        status: 500,
        body: { code: "invalid_config", stage: "config" },
    });
    await saveConfig({}, { home: h.home });
    await writeFile(
        join(h.home, "aiox.yaml"),
        "host: {name: demo}\nagents:\n  a: {adapter: codex}\nnetworks:\n  team: {agents: [a], routing: {default: deny}}\n",
    );
    await saveConfig(
        { terminal: { shell: "/missing-w6-shell" } },
        { home: h.home },
    );
    expect(await invoke()).toMatchObject({
        status: 400,
        body: { code: "invalid_request", stage: "cli" },
    });
    expect((await h.daemon.services.db.hostState.snapshot()).hosts).toEqual([]);
});
