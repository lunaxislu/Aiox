export type Section = (typeof sections)[number];

export const sections = ["workspaces", "networks", "hosts"] as const;
export const sectionLabels: Record<Section, string> = {
    workspaces: "Workspaces",
    networks: "Networks",
    hosts: "Hosts",
};

// W2 display fixtures, not a replacement for the protocol's PanelView DTO.
export type PanelPreview = (
    | { kind: "workspace" }
    | { kind: "host"; workPath: string }
    | { kind: "network"; memberCount: number; routeCount: number }
) & {
    id: string;
    section: Section;
    name: string;
    terminalCount: number;
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

function plural(count: number, noun: string) {
    return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** 카드 설명 줄. 섹션마다 문법이 다르다. */
export function panelSummary(panel: PanelPreview) {
    if (panel.kind === "host") return panel.workPath;
    if (panel.kind === "network")
        return `${plural(panel.memberCount, "member")} · ${
            panel.routeCount === 0
                ? "No routes"
                : plural(panel.routeCount, "route")
        }`;
    return plural(panel.terminalCount, "terminal");
}

/** 헤더 맥락. 카드와 달리 network는 멤버 수까지만 보여 준다. */
export function panelContext(panel: PanelPreview) {
    if (panel.kind === "host") return panel.workPath;
    if (panel.kind === "network") return plural(panel.memberCount, "member");
    return "";
}
