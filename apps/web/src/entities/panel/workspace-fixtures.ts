import type { AgentView, TabView, TerminalView } from "@aiox/protocol";

import type { WorkspaceLayout } from "./workspace-layout";
export type { WorkspaceLayout } from "./workspace-layout";

export type TerminalPreview = Pick<TerminalView, "cwd"> & {
    output: string;
    connection:
        | "connected"
        | "reconnecting"
        | "disconnected"
        | "screen-lost"
        | "unrestorable";
    reason?: string;
    status?: AgentView["status"];
    statusReason?: string;
    busy: "idle" | "running" | "unknown";
};

export const emptyWorkspace: WorkspaceLayout = {
    layout: { type: "pane", id: "root", tabIds: [], selectedTabId: null },
    activePaneId: "root",
    tabs: [],
};

const tab = (
    id: string,
    presentation: TabView["presentation"],
    notice: TabView["notice"] = null,
): TabView => ({
    id,
    label: id,
    presentation,
    notice,
    terminalId: notice ? null : `terminal-${id}`,
    agentKey: presentation === "shell" ? null : id,
    runtimeId: presentation === "shell" || notice ? null : `runtime-${id}`,
});
const notice = (message: string, reason: string | null = null) => ({
    message,
    reason,
    restartCommand:
        "aiox host agent start reviewer --path /work/project --file aiox.yaml",
});

export const workspacePreview: WorkspaceLayout = {
    activePaneId: "left",
    layout: {
        type: "split",
        id: "root",
        axis: "x",
        weights: [0.5, 0.5],
        children: [
            {
                type: "pane",
                id: "left",
                tabIds: ["shell", "preparing-shell", "preparing"],
                selectedTabId: "shell",
            },
            {
                type: "split",
                id: "right",
                axis: "y",
                weights: [0.5, 0.5],
                children: [
                    {
                        type: "pane",
                        id: "top",
                        tabIds: ["reviewer", "stopped", "start-failed"],
                        selectedTabId: "reviewer",
                    },
                    {
                        type: "pane",
                        id: "bottom",
                        tabIds: ["crashed", "unavailable"],
                        selectedTabId: "crashed",
                    },
                ],
            },
        ],
    },
    tabs: [
        tab("shell", "shell"),
        tab("preparing-shell", "preparing"),
        tab("preparing", "preparing", notice("Starting reviewer…")),
        tab("reviewer", "tui"),
        tab("stopped", "stopped", notice("Agent has stopped.")),
        tab(
            "start-failed",
            "start-failed",
            notice("Agent failed to start.", "Executable not found in PATH."),
        ),
        tab(
            "crashed",
            "crashed",
            notice(
                "Agent exited unexpectedly.",
                "Process exited with code 137.",
            ),
        ),
        tab(
            "unavailable",
            "unavailable",
            notice(
                "Agent is unavailable.",
                "The configured agent is not available.",
            ),
        ),
    ],
};

export const terminalPreviews: Record<string, TerminalPreview> = {
    "terminal-shell": {
        cwd: "/work/project",
        output: "$ pwd\n/work/project\n$ ",
        connection: "connected",
        busy: "idle",
    },
    "terminal-preparing-shell": {
        cwd: "/work/project",
        output: "$ aiox host agent start reviewer --path /work/project\nStarting reviewer…",
        connection: "connected",
        status: "aiox-preparing",
        busy: "running",
    },
    "terminal-reviewer": {
        cwd: "/work/project",
        output: "Review complete.\nApply the changes?",
        connection: "connected",
        status: "awaiting-user",
        statusReason:
            "Approval required before writing the reviewed changes to the workspace. Review the changes in the terminal before continuing.",
        busy: "running",
    },
};
