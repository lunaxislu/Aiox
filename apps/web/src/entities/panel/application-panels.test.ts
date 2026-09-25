import { execFileSync } from "node:child_process";

import type { AgentView, PanelView } from "@aiox/protocol";
import { expect, it } from "vitest";

import { applicationView } from "@/shared/api/application-store";

import { applicationPanels } from "./application-panels";
it("maps host/network resources without leaking network-only external agents into Host cards", () => {
    const state = applicationView([]);
    const panel: PanelView = {
        id: "p",
        kind: "host",
        section: "hosts",
        name: "Host",
        hostId: "h",
        networkId: "n",
        revision: 1,
        layout: { type: "pane", id: "pane", tabIds: [] },
        tabs: [],
    };
    state.panels = [
        panel,
        {
            ...panel,
            id: "net",
            kind: "network",
            section: "networks",
            hostId: null,
        },
    ];
    const agent: AgentView = {
        agentId: "a",
        name: "External",
        role: null,
        description: null,
        executionOwnership: "external",
        status: "idle",
        networkId: "n",
        networkName: "Network",
        hostId: null,
        terminalId: null,
        status_reason: null,
        observation_error: null,
    };
    state.agents = [agent];
    state.networks = [
        { id: "n", scope: "persistent", name: "Network", routes: [] },
    ];
    const directory =
        "/tmp/$AIOX_REVIEW/$(printf injected)/`printf injected`/a'b c";
    const sourceFile = "/tmp/a'b/$AIOX_REVIEW.yaml";
    state.hosts = [
        {
            id: "h",
            name: "Host",
            directory,
            sourceFile,
            instruction: "",
            panelId: "p",
            networkId: "n",
            revision: 1,
            agents: [],
        },
    ];
    const cards = applicationPanels(state);
    const hostCard = cards[0]!;
    if (hostCard.kind !== "host") throw new Error("Expected host");
    const args = execFileSync(
        "/bin/sh",
        ["-c", `aiox() { printf '%s\\n' "$@"; }; ${hostCard.command}`],
        { encoding: "utf8", env: { AIOX_REVIEW: "expanded" } },
    );
    expect(args.split("\n")).toEqual([
        "host",
        "run",
        "--path",
        directory,
        "--file",
        sourceFile,
        "",
    ]);
    expect(cards[0]?.agents).toEqual([]);
    expect(cards[1]).toMatchObject({
        memberCount: 1,
        routeCount: 0,
        agents: [{ id: "a" }],
    });
});
