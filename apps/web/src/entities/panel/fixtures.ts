import type { PanelPreview } from "@/entities/panel/model";

export const previewPanels: PanelPreview[] = [
    {
        id: "main",
        kind: "workspace",
        section: "workspaces",
        name: "main",
        terminalCount: 0,
        agents: [],
    },
    {
        id: "scratch",
        kind: "workspace",
        section: "networks",
        name: "scratch",
        terminalCount: 0,
        agents: [],
    },
    {
        id: "dev",
        kind: "network",
        memberCount: 1,
        routeCount: 0,
        section: "networks",
        name: "dev",
        terminalCount: 0,
        command: "aiox network create dev",
        agents: [
            {
                id: "reviewer",
                name: "reviewer",
                status: "idle",
                external: true,
            },
        ],
    },
    {
        id: "development",
        kind: "host",
        workPath: "~/projects/app",
        section: "hosts",
        name: "development",
        terminalCount: 0,
        command: "aiox host run --path ./aiox.yaml",
        agents: [{ id: "builder", name: "builder", status: "failed" }],
    },
];

export const previewHeader = {
    unreadCount: 0,
    connected: true,
};

export const disconnectedHeader = {
    ...previewHeader,
    unreadCount: 3,
    connected: false,
};
