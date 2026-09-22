import type { AgentRun, HostView } from "@aiox/protocol";

import type { DaemonServices } from "./services";

/** Private per-invocation context; never inferred from cwd or an idle shell. */
export async function managedLaunch(
    services: DaemonServices,
    input: AgentRun,
): Promise<{ input: AgentRun; host?: HostView }> {
    const hostId = input.env.AIOX_HOST_ID;
    const agentKey = input.env.AIOX_AGENT_KEY;
    if (hostId === undefined && agentKey === undefined) return { input };
    if (!hostId || !agentKey || !input.terminalContext)
        throw new Error(
            "Managed Agent requires Host, Agent key and authenticated terminal context.",
        );
    const terminal = services.terminals.authenticateContext(
        input.terminalContext,
    );
    const state = await services.db.hostState.snapshot();
    const host = state.hosts.find((h) => h.id === hostId);
    const agent = host?.agents.find((a) => a.key === agentKey);
    const panel = state.panels.find((p) => p.id === host?.panelId);
    if (
        !host ||
        !agent ||
        !panel?.tabs.some(
            (t) => t.terminalId === terminal.id && t.agentKey === agent.key,
        )
    )
        throw new Error("Managed Agent does not own this panel terminal.");
    if (input.adapter !== agent.adapter)
        throw new Error(
            "Managed Agent adapter differs from applied Host configuration.",
        );
    const { AIOX_HOST_ID: _host, AIOX_AGENT_KEY: _key, ...env } = input.env;
    return {
        host,
        input: {
            adapter: agent.adapter,
            cwd: host.directory,
            env,
            args: agent.args,
            cols: input.cols,
            rows: input.rows,
            terminalContext: input.terminalContext,
            name: agent.key,
            ...(agent.member ? { network: host.networkId } : {}),
            ...(agent.role === null ? {} : { role: agent.role }),
            ...(agent.description === null
                ? {}
                : { description: agent.description }),
            instruction: [host.instruction, agent.instruction]
                .filter(Boolean)
                .join("\n\n"),
        },
    };
}

export function restartCommand(host: HostView, agentKey: string): string {
    // Single quotes work in POSIX shells and PowerShell; no configuration text is executed here.
    const quote = (value: string) =>
        `'${value.replaceAll("'", process.platform === "win32" ? "''" : "'\\''")}'`;
    const command = `aiox host agent start ${quote(agentKey)} --path ${quote(host.directory)} --file ${quote(host.sourceFile)}`;
    // cmd.exe does not support single-quoted arguments. Encoded PowerShell also avoids cmd expansion of paths containing % or &.
    return process.platform === "win32"
        ? `powershell.exe -NoProfile -EncodedCommand ${Buffer.from(command, "utf16le").toString("base64")}`
        : command;
}
