import { expect, test } from "vitest";

import { panelContext, panelSummary, type PanelPreview } from "./model";

const base = { id: "x", name: "x", terminalCount: 0, agents: [] };
const host = {
    ...base,
    kind: "host",
    section: "hosts",
    workPath: "~/projects/app",
} satisfies PanelPreview;
const network = {
    ...base,
    kind: "network",
    section: "networks",
    memberCount: 1,
    routeCount: 0,
} satisfies PanelPreview;
const workspace = {
    ...base,
    kind: "workspace",
    section: "workspaces",
} satisfies PanelPreview;

test("card summary follows the per-section grammar", () => {
    expect(panelSummary(host)).toBe("~/projects/app");
    expect(panelSummary(network)).toBe("1 member · No routes");
    expect(panelSummary({ ...network, memberCount: 2, routeCount: 3 })).toBe(
        "2 members · 3 routes",
    );
    expect(panelSummary(workspace)).toBe("0 terminals");
    expect(panelSummary({ ...workspace, terminalCount: 1 })).toBe("1 terminal");
});

test("header context drops the route summary the card carries", () => {
    expect(panelContext(host)).toBe("~/projects/app");
    expect(panelContext(network)).toBe("1 member");
    expect(panelContext(workspace)).toBe("");
});
