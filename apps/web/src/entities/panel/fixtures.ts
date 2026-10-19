import type { PanelPreview } from "@/entities/panel/model";
import {
    emptyWorkspace,
    workspacePreview,
} from "@/entities/panel/workspace-fixtures";

export const previewPanels: PanelPreview[] = [
    {
        ...workspacePreview,
        id: "main",
        kind: "workspace",
        section: "workspaces",
        name: "main",
        terminalCount: workspacePreview.tabs.filter(
            (tab) => tab.terminalId !== null,
        ).length,
        // 탭의 runtimeId가 찬 실행만 여기 있다. 종료된 탭에는 대응하는 실행이 없다.
        agents: [
            {
                id: "runtime-reviewer",
                name: "reviewer",
                status: "awaiting-user",
                executionOwnership: "daemon",
                hostId: null,
                networkId: null,
            },
            {
                id: "runtime-preparing-shell",
                name: "claude",
                status: "aiox-preparing",
                executionOwnership: "daemon",
                hostId: null,
                networkId: null,
            },
        ],
    },
    {
        ...emptyWorkspace,
        id: "scratch",
        kind: "workspace",
        section: "workspaces",
        name: "scratch",
        terminalCount: 0,
        agents: [],
    },
    {
        ...emptyWorkspace,
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
                executionOwnership: "external",
                hostId: null,
                networkId: "dev",
            },
            {
                id: "claude",
                name: "claude",
                status: "working",
                executionOwnership: "daemon",
                hostId: null,
                networkId: null,
            },
        ],
    },
    {
        ...emptyWorkspace,
        id: "development",
        kind: "host",
        workPath: "~/projects/app",
        section: "hosts",
        name: "development",
        terminalCount: 0,
        command: "aiox host run --path ./aiox.yaml",
        agents: [
            {
                id: "builder",
                name: "builder",
                status: "failed",
                executionOwnership: "daemon",
                hostId: "development",
                networkId: null,
            },
        ],
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
