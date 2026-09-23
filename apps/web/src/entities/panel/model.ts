export type Section = (typeof sections)[number];

export const sections = ["workspaces", "networks", "hosts"] as const;
export const sectionLabels: Record<Section, string> = {
    workspaces: "Workspaces",
    networks: "Networks",
    hosts: "Hosts",
};

// W2 display fixtures, not a replacement for the protocol's PanelView DTO.
export type PanelPreview = {
    id: string;
    kind: "workspace" | "network" | "host";
    section: Section;
    name: string;
    terminalCount: number;
    context: string;
    command?: string;
    agents: {
        id: string;
        name: string;
        status:
            | "idle"
            | "working"
            | "awaiting-user"
            | "failed"
            | "aiox-preparing";
        external?: boolean;
        standalone?: boolean;
    }[];
};

export function isSection(value: string | null | undefined): value is Section {
    return sections.some((section) => section === value);
}

export function panelPath(panel: Pick<PanelPreview, "section" | "id">) {
    return `/${panel.section}/${encodeURIComponent(panel.id)}`;
}
