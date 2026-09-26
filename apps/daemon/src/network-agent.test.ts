import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { saveConfig } from "@aiox/config";
import type {
    VendorAdapter,
    VendorBinding,
    VendorLaunchInput,
} from "@aiox/vendor";
import { Effect } from "effect";
import { expect, test, vi, onTestFinished } from "vitest";
import { WebSocket } from "ws";

const launcher = new URL("../../cli/dist/index.js", import.meta.url);
import { startTestDaemon } from "./testing";

test.skipIf(process.platform === "win32").each(
    (["claude", "codex"] as const).flatMap((adapter) =>
        (["ready", "failed", "closed"] as const).map((mode) => ({
            adapter,
            mode,
        })),
    ),
)(
    "a Web shell routes $adapter to its Network panel and stays usable ($mode)",
    async ({ adapter: adapterId, mode }) => {
        const launches: VendorLaunchInput[] = [];
        let releasePreparation!: () => void;
        const preparation = new Promise<void>((resolve) => {
            releasePreparation = resolve;
        });
        onTestFinished(() => releasePreparation());
        const adapter: VendorAdapter = {
            id: adapterId,
            createExecution: () =>
                Effect.succeed({
                    connection: {},
                    start: (value, owner) =>
                        owner.foreground(
                            value as Parameters<typeof owner.foreground>[0],
                        ),
                }),
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
                        if (mode === "ready") await preparation;
                        if (input.args.includes("--fail"))
                            throw new Error("network launch rejected");
                        return {
                            file: process.execPath,
                            cwd: input.cwd,
                            env: input.env,
                            args: [
                                "--input-type=module",
                                "-e",
                                `
                            await fetch(${JSON.stringify(input.reportUrl)}, {method:'POST',headers:{'content-type':'application/json',authorization:${JSON.stringify("Bearer " + input.reportToken)}},body:'{}'});
                            process.stdout.write('VENDOR_READY\\n');
                            process.stdin.on('data',()=>process.exit(0));
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
                    async deliver() {},
                    async cleanup() {},
                };
                return binding;
            },
        };
        const h = await startTestDaemon({
            adapters: [adapter],
            terminal: async () => ({
                shell: "/bin/bash",
                args: ["--noprofile", "--norc"],
            }),
        });
        onTestFinished(() => h.close(), 30000);
        await saveConfig(
            {
                ports: h.daemon.ports,
                terminal: {
                    shell: "/bin/bash",
                    args: ["--noprofile", "--norc"],
                    cwd: h.home,
                },
            },
            { home: h.home },
        );
        const network = await h.daemon.services.networks.create("target");
        const reveal = vi.spyOn(h.daemon.services.appState, "reveal");
        const oldShell =
            mode === "ready"
                ? await h.daemon.createShell({ cwd: h.home })
                : undefined;
        if (oldShell)
            await h.daemon.services.db.hostState.mutatePanel(
                network.id,
                (panel) => ({
                    ...panel,
                    layout: {
                        type: "pane",
                        id: panel.layout.id,
                        tabIds: ["existing"],
                    },
                    tabs: [
                        {
                            id: "existing",
                            label: "existing",
                            agentKey: null,
                            terminalId: oldShell.id,
                            runtimeId: null,
                            presentation: "shell",
                            notice: null,
                        },
                    ],
                }),
            );
        const caller = await h.daemon.createShell({ cwd: h.home });
        let release = () => {};
        if (mode === "closed") {
            const original = h.daemon.services.lifecycle.createShell;
            const gate = new Promise<void>((resolve) => {
                release = resolve;
            });
            vi.spyOn(
                h.daemon.services.lifecycle,
                "createShell",
            ).mockImplementationOnce(async (...args) => {
                await gate;
                return original(...args);
            });
            onTestFinished(release);
        }
        const sourcePanel = randomUUID();
        await h.daemon.services.db.hostState.createPanel({
            id: sourcePanel,
            kind: "workspace",
            section: "workspaces",
            name: "source",
            hostId: null,
            networkId: null,
            revision: 1,
            layout: { type: "pane", id: randomUUID(), tabIds: [caller.id] },
            tabs: [
                {
                    id: caller.id,
                    terminalId: caller.id,
                    agentKey: null,
                    runtimeId: null,
                    label: "shell",
                    presentation: "shell",
                    notice: null,
                },
            ],
        });
        let output = "";
        h.daemon.services.terminals.get(caller.id)!.subscribe({
            data: (data) => {
                output += Buffer.from(data).toString();
            },
            exit: () => {},
        });
        const file = join(h.home, "invoke.cjs");
        await writeFile(
            file,
            `import(${JSON.stringify(launcher.href)}).then(async({createFoundationPort})=>{await createFoundationPort(${JSON.stringify({ home: h.home })}).execute({command:'agent.run',args:[${JSON.stringify(adapterId)}],adapterArgs:${JSON.stringify(mode === "failed" ? ["--fail"] : [])},options:{name:'OBAO',network:'target'}});console.log('CALLER_RETURNED')}).catch(e=>console.error('CALLER_FAILED:'+e.message));`,
        );
        h.daemon.services.terminals
            .get(caller.id)!
            .write(`'${process.execPath}' '${file}'\r`);
        await expect
            .poll(
                async () =>
                    (await h.daemon.services.db.hostState.getPanel(network.id))!
                        .tabs.length,
                { timeout: 2500 },
            )
            .toBe(oldShell ? 2 : 1);
        if (mode === "ready") {
            await expect.poll(() => launches.length).toBe(1);
            const runtime = h.daemon.services.runtimes.list()[0]!;
            const url = h
                .webUrl(
                    `/ws/terminal/${runtime.terminalId}?runtime=${runtime.id}`,
                )
                .replace("http:", "ws:");
            const abandoned = new WebSocket(url);
            abandoned.on("error", () => {});
            abandoned.terminate();
            const pending = new WebSocket(url);
            onTestFinished(() => pending.terminate());
            const connected = once(pending, "open");
            expect(runtime.binding.terminal).toBeUndefined();
            releasePreparation();
            await connected;
            expect(runtime.binding.terminal?.alive).toBe(true);
            pending.close();
        }
        if (mode === "closed") {
            await h.daemon.services.db.hostState.mutatePanel(
                network.id,
                (p) => ({
                    ...p,
                    tabs: [],
                    layout: { type: "pane", id: p.layout.id, tabIds: [] },
                }),
            );
            release();
        }
        await expect
            .poll(
                () =>
                    output.includes(
                        mode === "ready" ? "CALLER_RETURNED" : "CALLER_FAILED:",
                    ),
                { timeout: 10000 },
            )
            .toBe(true);
        const target = (await h.daemon.services.db.hostState.getPanel(
            network.id,
        ))!;
        const launchedTab = target.tabs.find((tab) => tab.label === "OBAO");
        expect(reveal).toHaveBeenCalledWith(
            caller.id,
            network.id,
            expect.any(String),
        );
        if (mode === "ready") {
            expect(
                target.tabs.find((tab) => tab.id === "existing")?.terminalId,
            ).toBe(oldShell!.id);
            expect(reveal).toHaveBeenCalledWith(
                caller.id,
                network.id,
                launchedTab!.id,
            );
            expect(launchedTab!.terminalId).not.toBe(caller.id);
            expect(h.daemon.services.runtimes.list()).toMatchObject([
                {
                    name: "OBAO",
                    networkId: network.id,
                    terminalId: launchedTab!.terminalId,
                    phase: "running",
                },
            ]);
            expect(launches).toHaveLength(1);
            const shellOutput = await new Promise<string>((resolve) => {
                const detach = h.daemon.services.terminals
                    .get(launchedTab!.terminalId!)!
                    .attach({
                        snapshot: (value) =>
                            resolve(Buffer.from(value.data).toString()),
                        data() {},
                        exit() {},
                        resize() {},
                        error: (error) => {
                            throw error;
                        },
                    });
                onTestFinished(detach);
            });
            expect(shellOutput).not.toContain("aiox-launch-");
            expect(
                h.daemon.services.runtimes.list()[0]!.binding.relayDisconnected,
            ).toBe(false);
            await expect
                .poll(async () =>
                    (await h.daemon.services.appState.current()).panels
                        .find((panel) => panel.id === network.id)
                        ?.tabs.find((tab) => tab.id === launchedTab!.id),
                )
                .toMatchObject({
                    terminalId: launchedTab!.terminalId,
                    runtimeId: h.daemon.services.runtimes.list()[0]!.id,
                    presentation: "tui",
                });
            const runtime = h.daemon.services.runtimes.list()[0]!;
            expect(runtime.binding.directTerminal).toBe(true);
            const viewer = new WebSocket(
                h
                    .webUrl(
                        `/ws/terminal/${launchedTab!.terminalId}?runtime=${runtime.id}`,
                    )
                    .replace("http:", "ws:"),
            );
            onTestFinished(() => viewer.terminate());
            let vendorOutput = "";
            viewer.on("message", (data, binary) => {
                if (binary) vendorOutput += data.toString();
            });
            await once(viewer, "open");
            await expect.poll(() => vendorOutput).toContain("VENDOR_READY");
            viewer.send(
                JSON.stringify({ type: "resize", cols: 101, rows: 37 }),
            );
            await expect.poll(() => runtime.binding.terminal!.cols).toBe(101);
            viewer.send(Buffer.from("exit\n"));
            await expect
                .poll(() => h.daemon.services.runtimes.list().length)
                .toBe(0);
            const shell = h.daemon.services.terminals.get(
                launchedTab!.terminalId!,
            )!;
            expect(shell.alive).toBe(true);
            let resumed = "";
            const off = shell.subscribe({
                data: (data) => {
                    resumed += Buffer.from(data).toString();
                },
                exit() {},
            });
            onTestFinished(off);
            shell.write("printf 'SHELL_%s\\n' RETURNED\r");
            await expect.poll(() => resumed).toContain("SHELL_RETURNED");
            await expect
                .poll(
                    async () =>
                        (await h.daemon.services.appState.current()).panels
                            .find((panel) => panel.id === network.id)
                            ?.tabs.find((tab) => tab.id === launchedTab!.id)
                            ?.runtimeId,
                )
                .toBe(null);
        } else {
            await expect
                .poll(() => h.daemon.services.runtimes.list().length)
                .toBe(0);
            if (mode === "failed") {
                expect(output).toContain("network launch rejected");
                expect(target.tabs[0]).toMatchObject({
                    presentation: "start-failed",
                    notice: { message: "network launch rejected" },
                });
            } else {
                expect(target.tabs).toHaveLength(0);
                expect(launches).toHaveLength(0);
                await expect
                    .poll(() =>
                        h.daemon.services.terminals.views().map((t) => t.id),
                    )
                    .toEqual([caller.id]);
            }
        }
        expect(
            (await h.daemon.services.db.hostState.getPanel(sourcePanel))!
                .tabs[0]!.terminalId,
        ).toBe(caller.id);
        expect(h.daemon.services.terminals.get(caller.id)!.alive).toBe(true);
        h.daemon.services.terminals
            .get(caller.id)!
            .write("echo SOURCE_STILL_USABLE\r");
        await expect
            .poll(() => output.includes("\r\nSOURCE_STILL_USABLE\r\n"))
            .toBe(true);
    },
);
