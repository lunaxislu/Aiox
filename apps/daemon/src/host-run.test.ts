import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { saveConfig } from "@aiox/config";
import { panelLayoutReferences, type HostLayout } from "@aiox/protocol";
import type {
    VendorAdapter,
    VendorBinding,
    VendorLaunchInput,
} from "@aiox/vendor";
import { Effect } from "effect";
import { expect, test, vi } from "vitest";

import { initialHostPanel } from "./host-run";
const launcher = new URL("../../cli/dist/index.js", import.meta.url);
import { hostResult, startTestDaemon } from "./testing";

test.each([
    [{ preset: "auto" }, 1, [["a"]]],
    [{ preset: "auto" }, 2, [["a"], ["b"]]],
    [{ preset: "auto" }, 3, [["a"], ["b"], ["c"]]],
    [{ preset: "auto" }, 6, [["a", "e"], ["b", "f"], ["c"], ["d"]]],
    [{ preset: "left-main" }, 4, [["a", "d"], ["b"], ["c"]]],
    [{ preset: "top-main" }, 2, [["a"], ["b"]]],
    [
        { preset: "grid", columns: 2, rows: 1 },
        6,
        [
            ["a", "c", "e"],
            ["b", "d", "f"],
        ],
    ],
    [{ preset: "grid", columns: 1000000, rows: 1000000 }, 2, [["a"], ["b"]]],
] as [HostLayout, number, string[][]][])(
    "initial layout %j with %i Agents",
    (layout, count, expected) => {
        const panel = initialHostPanel(
            "h",
            "n",
            "Host",
            "abcdef".slice(0, count).split(""),
            layout,
        );
        const { panes } = panelLayoutReferences(panel.layout);
        expect(
            panes.map((p) =>
                p.tabIds.map(
                    (id) => panel.tabs.find((t) => t.id === id)!.agentKey,
                ),
            ),
        ).toEqual(expected);
        if (count === 3 && layout.preset === "auto") {
            expect(panel.layout).toMatchObject({
                type: "split",
                axis: "x",
                children: [{ type: "pane" }, { type: "split", axis: "y" }],
            });
        }
    },
);

test("run rejects invalid YAML before creating a Host", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close(), 30000);
    await writeFile(join(h.home, "aiox.yaml"), "host: []");
    const response = await fetch(h.apiUrl("/api/hosts/run"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            requestId: randomUUID(),
            source: { directory: h.home },
        }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ stage: "yaml" });
    const state = await h.daemon.services.db.hostState.snapshot();
    expect(state.hosts).toEqual([]);
});

test.skipIf(process.platform === "win32")(
    "run uses real shells and CLI, persists ready targets, deduplicates and isolates Networks",
    async (t) => {
        const launches: VendorLaunchInput[] = [];
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
                        launches.push(input);
                        if (input.args.includes("--fail"))
                            throw new Error("intentional preparation failure");
                        return {
                            file: process.execPath,
                            cwd: input.cwd,
                            env: {
                                ...input.env,
                                TEST_REPORT_URL: input.reportUrl,
                                TEST_REPORT_TOKEN: input.reportToken,
                            },
                            args: [
                                "--input-type=module",
                                "-e",
                                `
                        const response = await fetch(process.env.TEST_REPORT_URL, {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + process.env.TEST_REPORT_TOKEN}, body: '{}'});
                        if (!response.ok) throw new Error(await response.text());
                        process.stdout.write('VENDOR_READY\\n');
                        process.stdin.on('data', () => process.exit(0));
                    `,
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
        await writeFile(
            join(h.home, "aiox.yaml"),
            `host: {name: demo}
agents:
  alpha: {adapter: codex}
  beta: {adapter: codex}
networks:
  shared: {agents: [alpha, beta], routing: {default: deny}}
`,
        );
        await h.daemon.services.networks.create("shared");
        const input = {
            requestId: randomUUID(),
            source: { directory: h.home },
            env: {
                ...Object.fromEntries(
                    Object.entries(process.env).filter(
                        ([, value]) => value !== undefined,
                    ),
                ),
                AIOX_DIRECT_ENV_TEST: "not-forwarded",
                HOST_CALLER_PATH_TEST: "caller-environment",
            },
        };
        const post = (body: unknown) =>
            fetch(h.apiUrl("/api/hosts/run"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
        const response = await post(input);
        expect(response.status).toBe(200);
        // The HTTP answer waits for the actual readiness of every target.
        const result = await hostResult(response);
        expect(result).toMatchObject({
            command: "host.run",
            state: "succeeded",
            targets: [{ state: "ready" }, { state: "ready" }],
        });
        const state = await h.daemon.services.db.hostState.snapshot();
        expect(state.hosts).toHaveLength(1);
        const hostPanel = state.panels.find(
            (panel) => panel.hostId === state.hosts[0]!.id,
        )!;
        expect(hostPanel.tabs).toHaveLength(2);
        expect(hostPanel.tabs.every((t) => t.terminalId)).toBe(true);
        expect(
            h.daemon.services.runtimes.list().map((r) => r.networkId),
        ).toEqual([state.networks[0]!.id, state.networks[0]!.id]);
        expect((await h.daemon.services.networks.list())[0]!.id).not.toBe(
            state.networks[0]!.id,
        );
        // A retransmission answers with the finished result instead of running again.
        const expiredReplay = await post(input);
        expect(expiredReplay.status).toBe(409);
        expect(await expiredReplay.json()).toMatchObject({
            code: "result_expired",
            stage: "cli",
        });
        expect(
            (await post({ ...input, layout: { preset: "left-main" } })).status,
        ).toBe(409);
        expect((await post({ ...input, requestId: randomUUID() })).status).toBe(
            409,
        );
        expect(launches).toHaveLength(2);
        expect(
            launches.every(
                (launch) =>
                    launch.env.HOST_CALLER_PATH_TEST === "caller-environment",
            ),
        ).toBe(true);
        expect(
            launches.every(
                (launch) => launch.env.AIOX_DIRECT_ENV_TEST === undefined,
            ),
        ).toBe(true);
        const effective = await h.daemon.services.networks.effective(
            state.networks[0]!.id,
        );
        expect(effective.defaultPolicy).toBe("deny");
        expect(effective.routes).toHaveLength(2);
        expect(
            effective.routes.every(
                (r) =>
                    h.daemon.services.runtimes.get(r.from)?.hostId ===
                        state.hosts[0]!.id &&
                    h.daemon.services.runtimes.get(r.to)?.hostId ===
                        state.hosts[0]!.id,
            ),
        ).toBe(true);
        const restart = () =>
            fetch(h.apiUrl("/api/hosts/restart"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    requestId: randomUUID(),
                    source: input.source,
                }),
            });
        const beforeInvalid = await h.daemon.services.db.hostState.snapshot();
        const runtimeIds = h.daemon.services.runtimes.list().map((r) => r.id);
        await writeFile(join(h.home, "aiox.yaml"), "host: []");
        expect((await restart()).status).toBe(400);
        expect(await h.daemon.services.db.hostState.snapshot()).toEqual(
            beforeInvalid,
        );
        expect(h.daemon.services.runtimes.list().map((r) => r.id)).toEqual(
            runtimeIds,
        );
        const userShell = await h.daemon.createShell();
        const customized = structuredClone(
            beforeInvalid.panels.find((panel) => panel.id === hostPanel.id)!,
        );
        const panes = panelLayoutReferences(customized.layout).panes;
        panes[0]!.tabIds.push("user-tab");
        customized.tabs.push({
            id: "user-tab",
            terminalId: userShell.id,
            agentKey: "beta",
            runtimeId: null,
            label: "User shell",
            presentation: "shell",
            notice: null,
        });
        await h.daemon.services.db.hostState.mutatePanel(
            customized.id,
            () => customized,
        );
        const oldAlpha = customized.tabs.find(
            (tab) => tab.agentKey === "alpha",
        )!;
        const oldBeta = customized.tabs.find((tab) => tab.agentKey === "beta")!;
        await writeFile(
            join(h.home, "aiox.yaml"),
            "host: {name: demo, instruction: latest}\nagents:\n  alpha: {adapter: codex}\n  gamma: {adapter: codex}\nnetworks:\n  replaced: {agents: [alpha, gamma], routing: {default: allow}}\n",
        );
        const terminate = vi
            .spyOn(h.daemon.services.lifecycle, "stopTerminal")
            .mockRejectedValueOnce(new Error("removed shell still alive"));
        expect(await hostResult(await restart())).toMatchObject({
            state: "failed",
            error: {
                stage: "execution",
                message: "removed shell still alive",
            },
        });
        const failed = await h.daemon.services.db.hostState.snapshot();
        expect(failed.hosts[0]!.agents.map((a) => a.key)).toEqual([
            "alpha",
            "beta",
        ]);
        expect(
            h.daemon.services.terminals.view(oldBeta.terminalId!)?.alive,
        ).toBe(true);
        terminate.mockRestore();
        expect((await hostResult(await restart())).state).toBe("succeeded");
        const replaced = await h.daemon.services.db.hostState.snapshot();
        expect(replaced.hosts[0]).toMatchObject({
            id: state.hosts[0]!.id,
            instruction: "latest",
        });
        expect(replaced.hosts[0]!.agents.map((a) => a.key)).toEqual([
            "alpha",
            "gamma",
        ]);
        expect(replaced.networks[0]).toMatchObject({
            id: state.networks[0]!.id,
            name: "replaced",
            default: "allow",
        });
        expect(
            replaced.networks[0]!.edges.every(
                (edge) =>
                    edge.source === "manifest-default" &&
                    edge.policy === "allow",
            ),
        ).toBe(true);
        expect(
            replaced.panels
                .find((panel) => panel.id === hostPanel.id)!
                .tabs.find((tab) => tab.agentKey === "alpha"),
        ).toMatchObject({ id: oldAlpha.id, terminalId: oldAlpha.terminalId });
        expect(
            replaced.panels
                .find((panel) => panel.id === hostPanel.id)!
                .tabs.some((tab) => tab.id === oldBeta.id),
        ).toBe(false);
        expect(
            h.daemon.services.terminals.view(oldBeta.terminalId!)?.alive ??
                false,
        ).toBe(false);
        expect(h.daemon.services.terminals.view(userShell.id)?.alive).toBe(
            true,
        );
        expect(
            panelLayoutReferences(
                replaced.panels.find((panel) => panel.id === hostPanel.id)!
                    .layout,
            ).panes.map((p) => p.id),
        ).toEqual([panes[0]!.id]);
        // An occupied Host keeps its user split even when YAML requests three panes.
        const beforeResize = (await h.daemon.services.db.hostState.getPanel(
            hostPanel.id,
        ))!;
        const alpha = beforeResize.tabs.find(
            (tab) => tab.agentKey === "alpha",
        )!;
        const gamma = beforeResize.tabs.find(
            (tab) => tab.agentKey === "gamma",
        )!;
        const split = {
            type: "split" as const,
            id: "user-split",
            axis: "x" as const,
            weights: [0.7, 0.3],
            children: [
                {
                    type: "pane" as const,
                    id: "user-left",
                    tabIds: [alpha.id, "user-tab"],
                },
                { type: "pane" as const, id: "user-right", tabIds: [gamma.id] },
            ],
        };
        await h.daemon.services.db.hostState.mutatePanel(
            hostPanel.id,
            (current) => ({ ...current, layout: split }),
        );
        await writeFile(
            join(h.home, "aiox.yaml"),
            `host: {name: demo, layout: {preset: auto}}
agents:
  alpha: {adapter: codex}
  gamma: {adapter: codex}
  delta: {adapter: codex}
networks:
  replaced: {agents: [alpha, gamma, delta], routing: {default: allow}}
`,
        );
        expect((await hostResult(await restart())).state).toBe("succeeded");
        const retained = (await h.daemon.services.db.hostState.getPanel(
            hostPanel.id,
        ))!;
        const delta = retained.tabs.find((tab) => tab.agentKey === "delta")!;
        expect(retained.layout).toEqual({
            ...split,
            children: [
                {
                    ...split.children[0]!,
                    tabIds: [alpha.id, "user-tab", delta.id],
                },
                split.children[1]!,
            ],
        });
        expect(
            retained.tabs.find((tab) => tab.id === alpha.id)?.terminalId,
        ).toBe(alpha.terminalId);
        expect(
            retained.tabs.find((tab) => tab.id === gamma.id)?.terminalId,
        ).toBe(gamma.terminalId);
        expect(
            retained.tabs.find((tab) => tab.id === "user-tab")?.terminalId,
        ).toBe(userShell.id);
        expect(h.daemon.services.terminals.view(userShell.id)?.alive).toBe(
            true,
        );
        // Once all tabs are closed, restart restores the latest configured initial layout.
        for (const tab of retained.tabs)
            if (tab.terminalId)
                await h.daemon.services.lifecycle.stopTerminal(tab.terminalId);
        await h.daemon.services.db.hostState.mutatePanel(
            hostPanel.id,
            (current) => ({
                ...current,
                tabs: [],
                layout: { type: "pane", id: "empty", tabIds: [] },
            }),
        );
        expect((await hostResult(await restart())).state).toBe("succeeded");
        const restored = (await h.daemon.services.db.hostState.getPanel(
            hostPanel.id,
        ))!;
        expect(restored.layout).toMatchObject({
            type: "split",
            axis: "x",
            weights: [0.5, 0.5],
        });
        expect(
            panelLayoutReferences(restored.layout).panes.map((pane) =>
                pane.tabIds.map(
                    (id) =>
                        restored.tabs.find((tab) => tab.id === id)!.agentKey,
                ),
            ),
        ).toEqual([["alpha"], ["gamma"], ["delta"]]);

        await writeFile(
            join(h.home, "aiox.yaml"),
            `host: {name: partial}
agents:
  alpha: {adapter: codex}
  broken: {adapter: codex, args: [--fail]}
networks:
  shared: {agents: [alpha, broken], routing: {default: allow}}
`,
        );
        // One failed target does not cancel or undo its ready sibling.
        const partial = await hostResult(await restart());
        expect(partial).toMatchObject({
            state: "failed",
            targets: [{ state: "ready" }, { state: "failed" }],
        });
        await vi.waitFor(
            async () => {
                const state = await h.daemon.services.db.hostState.snapshot();
                expect(
                    state.panels
                        .find((p) => p.hostId === partial.hostId)!
                        .tabs.find((t) => t.agentKey === "broken")!.notice
                        ?.message,
                ).toContain("intentional preparation failure");
                expect(
                    state.hosts
                        .find((h) => h.id === partial.hostId)!
                        .agents.find((a) => a.key === "broken")!.lastExit?.kind,
                ).toBe("start-failed");
            },
            { timeout: 10000 },
        );
        expect(
            h.daemon.services.runtimes.list().filter((r) => r.name === "alpha"),
        ).toHaveLength(2);
        await writeFile(
            join(h.home, "aiox.yaml"),
            `host: {name: cli-entry}
agents:
  alpha: {adapter: codex}
networks:
  shared: {agents: [alpha]}
`,
        );
        const cli = await promisify(execFile)(
            process.execPath,
            [
                resolve("../cli/dist/main.js"),
                "host",
                "restart",
                "--path",
                h.home,
            ],
            { env: { ...process.env, HOME: h.home }, timeout: 15000 },
        );
        expect(cli.stdout).toContain("Host restart succeeded");
        expect(cli.stdout).toContain("alpha: ready");
        expect(cli.stderr).toBe("");
        const cliHost = (
            await h.daemon.services.db.hostState.snapshot()
        ).hosts.find((host) => host.name === "cli-entry")!;
        const cliRuntime = h.daemon.services.runtimes
            .list()
            .find((runtime) => runtime.hostId === cliHost.id)!;
        await rm(join(h.home, "aiox.yaml"));
        const control = (verb: string) =>
            promisify(execFile)(
                process.execPath,
                [resolve("../cli/dist/main.js"), "host", verb, "cli-entry"],
                { env: { ...process.env, HOME: h.home }, timeout: 15000 },
            );
        expect((await control("stop")).stdout).toContain("Host stop succeeded");
        expect(h.daemon.services.runtimes.get(cliRuntime.id)).toBeUndefined();
        expect(
            h.daemon.services.terminals.view(cliRuntime.terminalId!)?.alive,
        ).toBe(true);
        expect((await control("status")).stdout).toContain("alpha: stopped");
        await writeFile(
            join(h.home, "aiox.yaml"),
            "host: {name: cli-entry}\nagents: {alpha: {adapter: codex}}\nnetworks: {shared: {agents: [alpha]}}\n",
        );
        const reveal = vi.spyOn(h.daemon.services.appState, "reveal");
        const callerScript = join(h.home, "restart-caller.cjs");
        await writeFile(
            callerScript,
            `import(${JSON.stringify(launcher.href)}).then(async ({createFoundationPort})=>{try{await createFoundationPort({home:${JSON.stringify(h.home)}}).execute({command:'host.restart',args:[],options:{path:${JSON.stringify(h.home)}}});console.log('RESTART_CALLER_DONE');}catch(e){console.error('RESTART_CALLER_FAILED',e.message);process.exitCode=1;}});`,
        );
        const caller = h.daemon.services.terminals.get(cliRuntime.terminalId!)!;
        let callerOutput = "";
        const unsubscribe = caller.subscribe({
            data: (data) => {
                callerOutput += Buffer.from(data).toString();
            },
            exit: () => {},
        });
        t.onTestFinished(unsubscribe);
        caller.write(
            `${JSON.stringify(process.execPath)} ${JSON.stringify(callerScript)}\r`,
        );
        await vi.waitFor(
            () => {
                const current = h.daemon.services.runtimes
                    .list()
                    .find((runtime) => runtime.hostId === cliHost.id);
                expect(current?.phase).toBe("running");
                expect(current?.id).not.toBe(cliRuntime.id);
                expect(current?.terminalId).toBe(cliRuntime.terminalId);
            },
            { timeout: 15000 },
        );
        expect((await control("stop")).stdout).toContain("Host stop succeeded");
        await vi.waitFor(
            () => expect(callerOutput).toContain("RESTART_CALLER_DONE"),
            { timeout: 10000 },
        );
        expect(callerOutput).not.toContain("RESTART_CALLER_FAILED");
        const revealedPanel = await h.daemon.services.db.hostState.getPanel(
            cliHost.panelId,
        );
        expect(reveal).toHaveBeenCalledWith(
            cliRuntime.terminalId,
            cliHost.panelId,
            revealedPanel!.tabs.find(
                (tab) => tab.terminalId === cliRuntime.terminalId,
            )!.id,
        );
        expect((await control("delete")).stdout).toContain(
            "Host delete succeeded",
        );
        const afterDelete = await h.daemon.services.db.hostState.snapshot();
        expect(afterDelete.hosts.some((host) => host.id === cliHost.id)).toBe(
            false,
        );
        expect(afterDelete.hosts.map((host) => host.name).sort()).toEqual([
            "demo",
            "partial",
        ]);
    },
    60000,
);

test("invalid caller context creates nothing; shell failure is retained on the declared tab", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    await writeFile(
        join(h.home, "aiox.yaml"),
        "host: {name: failure}\nagents: {a: {adapter: codex}}\nnetworks: {n: {agents: [a]}}\n",
    );
    const post = (body: unknown) =>
        fetch(h.apiUrl("/api/hosts/run"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
    const source = { directory: h.home };
    const invalid = await post({
        requestId: randomUUID(),
        source,
        terminalContext: { terminalId: "missing", token: "invalid" },
    });
    expect(invalid.status).toBe(400);
    expect((await h.daemon.services.db.hostState.snapshot()).hosts).toEqual([]);
    vi.spyOn(h.daemon.services.lifecycle, "createShell").mockRejectedValue(
        new Error("shell launch failed"),
    );
    expect(
        await hostResult(await post({ requestId: randomUUID(), source })),
    ).toMatchObject({
        state: "failed",
        targets: [
            { state: "failed", error: { message: "shell launch failed" } },
        ],
    });
    await vi.waitFor(async () => {
        const state = await h.daemon.services.db.hostState.snapshot();
        expect(state.hosts[0]!.agents[0]!.lastExit?.message).toBe(
            "shell launch failed",
        );
        expect(state.panels[0]!.tabs[0]!.notice?.message).toBe(
            "shell launch failed",
        );
    });
    expect(h.daemon.services.terminals.list()).toHaveLength(0);
    expect((await post({ requestId: randomUUID(), source })).status).toBe(409);
});

test.skipIf(process.platform === "win32")(
    "direct execution failure before Runtime registration reaches the result and tab",
    async (t) => {
        const h = await startTestDaemon();
        t.onTestFinished(() => h.close(), 15000);
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
        await writeFile(
            join(h.home, "aiox.yaml"),
            "host: {name: launch-error}\nagents: {a: {adapter: codex}}\nnetworks: {n: {agents: [a]}}\n",
        );
        vi.spyOn(
            h.daemon.services.lifecycle,
            "startAgent",
        ).mockRejectedValueOnce(new Error("Agent registration rejected"));
        const response = await fetch(h.apiUrl("/api/hosts/run"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                requestId: randomUUID(),
                source: { directory: h.home },
            }),
        });
        const result = await hostResult(response);
        expect(result.state).toBe("failed");
        expect(result.targets[0]!.error?.message).toContain(
            "Agent registration rejected",
        );
        await vi.waitFor(
            async () => {
                const state = await h.daemon.services.db.hostState.snapshot();
                expect(state.panels[0]!.tabs[0]!.notice?.message).toContain(
                    "Agent registration rejected",
                );
            },
            { timeout: 5000 },
        );
        expect(h.daemon.services.runtimes.list()).toEqual([]);
        expect(h.daemon.services.terminals.list()[0]!.alive).toBe(true);
    },
    10000,
);

test.each([
    { stage: "config", status: 500, code: "invalid_config" },
    { stage: "yaml", status: 400, code: "invalid_yaml" },
    { stage: "cli", status: 400, code: "invalid_request" },
])(
    "HTTP run reports $stage before later layout validation",
    async ({ stage, status, code }) => {
        const h = await startTestDaemon();
        try {
            if (stage === "config")
                await writeFile(join(h.home, ".aiox", "config.json"), "{bad");
            if (stage === "cli")
                await writeFile(
                    join(h.home, "aiox.yaml"),
                    "host: {name: validation}\nagents: {a: {adapter: codex}}\nnetworks: {n: {agents: [a]}}\n",
                );
            const create = vi.spyOn(h.daemon.services.lifecycle, "createShell");
            const response = await fetch(h.apiUrl("/api/hosts/run"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    requestId: randomUUID(),
                    source: { directory: h.home },
                    layout: { preset: "grid" },
                }),
            });
            expect(response.status).toBe(status);
            expect(await response.json()).toMatchObject({ code, stage });
            expect(
                await h.daemon.services.db.hostState.snapshot(),
            ).toMatchObject({
                hosts: [],
                panels: [],
                networks: [],
            });
            expect(create).not.toHaveBeenCalled();
        } finally {
            await h.close();
        }
    },
);

test("run distinguishes the same YAML from another source with the same Host name", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    const yaml =
        "host: {name: duplicate}\nagents: {a: {adapter: codex}}\nnetworks: {n: {agents: [a]}}\n";
    await writeFile(join(h.home, "aiox.one.yaml"), yaml);
    await writeFile(join(h.home, "aiox.two.yaml"), yaml);
    vi.spyOn(h.daemon.services.lifecycle, "createShell").mockRejectedValue(
        new Error("test shell unavailable"),
    );
    const post = (file: string) =>
        fetch(h.apiUrl("/api/hosts/run"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                requestId: randomUUID(),
                source: { directory: h.home, file },
            }),
        });
    expect((await hostResult(await post("aiox.one.yaml"))).state).toBe(
        "failed",
    );
    const before = await h.daemon.services.db.hostState.snapshot();
    const repeated = await post("./aiox.one.yaml");
    expect(repeated.status).toBe(409);
    expect(await repeated.json()).toMatchObject({
        code: "host_exists",
        stage: "cli",
    });
    const conflict = await post("aiox.two.yaml");
    expect(conflict.status).toBe(409);
    const error = await conflict.json();
    expect(error).toMatchObject({ code: "host_name_conflict", stage: "cli" });
    expect(JSON.stringify(error)).toContain("aiox.one.yaml");
    expect(JSON.stringify(error)).toContain("aiox.two.yaml");
    expect(await h.daemon.services.db.hostState.snapshot()).toEqual(before);
});
