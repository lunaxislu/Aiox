import type { PanelPreview } from "@/entities/panel/model";

export const previewPanels: PanelPreview[] = [
    {
        id: "main",
        kind: "workspace",
        section: "workspaces",
        name: "main",
        terminalCount: 0,
        context: "",
        agents: [],
    },
    {
        id: "scratch",
        kind: "workspace",
        section: "networks",
        name: "scratch",
        terminalCount: 0,
        context: "",
        agents: [],
    },
    // {
    //     id: "dev",
    //     kind: "network",
    //     section: "networks",
    //     name: "dev",
    //     terminalCount: 0,
    //     context: "1 member · No routes",
    //     command: "aiox network create dev",
    //     agents: [
    //         {
    //             id: "reviewer",
    //             name: "reviewer",
    //             status: "idle",
    //             external: true,
    //         },
    //     ],
    // },
    // {
    //     id: "development",
    //     kind: "host",
    //     section: "hosts",
    //     name: "development",
    //     terminalCount: 0,
    //     context: "~/projects/app",
    //     command: "aiox host run --path ./aiox.yaml",
    //     agents: [{ id: "builder", name: "builder", status: "failed" }],
    // },
];
