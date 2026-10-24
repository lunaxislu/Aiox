import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { HostView, PanelView } from "@aiox/protocol";
import type {
    VendorAdapter,
    VendorBinding,
    VendorLaunchInput,
} from "@aiox/vendor";
import { Effect } from "effect";
import { expect, test, vi } from "vitest";

import { restartCommand } from "./managed-agents";
import { openTestApplication, startTestDaemon } from "./testing";

test("real shell and built CLI retain terminal identity across managed execution and explicit stop", async (t) => {
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
        }),
    });
    t.onTestFinished(() => h.close());
    await mkdir(join(h.home, ".aiox"), { recursive: true });
    await writeFile(
        join(h.home, ".aiox", "daemon.json"),
        JSON.stringify({
            pid: process.pid,
            ports: h.daemon.ports,
            startedAt: Date.now(),
        }),
    );
    const shell = await h.daemon.createShell({ cwd: h.home });
    const session = h.daemon.services.terminals.get(shell.id)!;
    let output = "";
    session.subscribe({
        data: (data) => {
            output += Buffer.from(data).toString();
        },
        exit() {},
    });
    const panel: PanelView = {
        id: "p",
        kind: "host",
        section: "hosts",
        name: "H",
        hostId: "h",
        networkId: "n",
        revision: 1,
        layout: {
            type: "pane",
            id: "pane",
            tabIds: ["tab"],
        },
        tabs: [
            {
                id: "tab",
                terminalId: shell.id,
                label: "agent",
                agentKey: "agent",
                runtimeId: null,
                presentation: "shell",
                notice: null,
            },
        ],
    };
    const host: HostView = {
        id: "h",
        name: "H",
        directory: h.home,
        sourceFile: join(h.home, "aiox.yaml"),
        instruction: "",
        revision: 1,
        panelId: "p",
        networkId: "n",
        agents: [
            {
                key: "agent",
                adapter: "codex",
                role: null,
                description: null,
                instruction: "",
                args: [],
                member: false,
                runtime: null,
                lastTerminalId: null,
                lastExit: null,
            },
        ],
    };
    await h.daemon.services.db.hostState.createHost(
        host,
        {
            id: "n",
            hostId: "h",
            name: "N",
            scope: "host",
            default: "allow",
            members: [],
            edges: [],
        },
        panel,
        Date.now(),
    );
    // Seeded directly in storage: announce it as a producer would.
    await h.daemon.services.appState.update({ host: "h" }, { panel: panel.id });
    const quote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;
    const command = `env HOME=${quote(h.home)} AIOX_HOST_ID=h AIOX_AGENT_KEY=agent ${quote(process.execPath)} ${quote(resolve("../cli/dist/main.js"))} agent run codex`;
    session.write(`${command}\n`);
    await vi.waitFor(
        async () => {
            expect(output).toContain("VENDOR_READY");
            expect(
                (await h.daemon.services.appState.current()).hosts[0]!
                    .agents[0]!.runtime?.phase,
            ).toBe("running");
        },
        { timeout: 10000 },
    );
    const first = h.daemon.services.runtimes.list()[0]!;
    const application = await openTestApplication(h);
    try {
        const initial = await application.next();
        expect(JSON.stringify(initial)).toContain('"phase":"running"');
        expect(JSON.stringify(initial)).toContain(first.id);
    } finally {
        await application.close();
    }

    session.write("exit\n");
    await vi.waitFor(() =>
        expect(h.daemon.services.runtimes.list()).toHaveLength(0),
    );
    expect(
        (await h.daemon.services.appState.current()).hosts[0]!.agents[0]!
            .lastExit?.kind,
    ).toBe("exited");
    session.write("printf 'SHELL_RETURNED\\n'\n");
    await vi.waitFor(() => expect(output).toContain("\r\nSHELL_RETURNED\r\n"));
    session.write(`${command}\n`);
    await vi.waitFor(
        () =>
            expect(h.daemon.services.runtimes.list()[0]?.phase).toBe("running"),
        { timeout: 10000 },
    );
    const second = h.daemon.services.runtimes.list()[0]!;
    expect(second.id).not.toBe(first.id);
    expect(launches[1]!.mcpToken).not.toBe(launches[0]!.mcpToken);
    expect(second.terminalId).toBe(shell.id);
    await h.daemon.stopRuntime(second.id);
    expect(session.alive).toBe(true);
    const snapshot = await h.daemon.services.appState.current();
    expect(snapshot.hosts[0]!.agents[0]!.lastExit?.kind).toBe("stopped");
    expect(snapshot.panels[0]!.tabs[0]!.presentation).toBe("stopped");
    session.write("printf 'AFTER_STOP\\n'\n");
    await vi.waitFor(() => expect(output).toContain("\r\nAFTER_STOP\r\n"));
}, 20000);

test("restart guidance preserves literal shell arguments", () => {
    const host = {
        directory: "/tmp/Host's $(printf INJECTED)",
        sourceFile: "/tmp/file; name.yaml",
    } as HostView;
    const key = "agent'$(printf INJECTED)";
    const output = execFileSync(
        "/bin/sh",
        ["-c", `aiox() { printf '%s\\n' "$@"; }; ${restartCommand(host, key)}`],
        { encoding: "utf8" },
    );
    expect(output.trimEnd().split("\n")).toEqual([
        "host",
        "agent",
        "start",
        key,
        "--path",
        host.directory,
        "--file",
        host.sourceFile,
    ]);
});
