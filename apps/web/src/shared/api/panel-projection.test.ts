import { expect, it } from "vitest";

import {
    projectPanel,
    createdIds,
    referencedIds,
    type PanelInput,
} from "./panel-projection";

it("rebases preparing placement, resize and dismissal without replacing terminal identity or server fields", () => {
    const input: PanelInput = {
        panelId: "p",
        changes: [
            { type: "panel.create", name: "Panel", paneId: "a", tabId: "one" },
            { type: "tab.create", tabId: "two", target: { toPaneId: "a" } },
            {
                type: "tab.move",
                tabId: "two",
                target: {
                    split: {
                        targetPaneId: "a",
                        side: "right",
                        paneId: "b",
                        splitId: "split",
                    },
                },
            },
        ],
    };
    const initial = projectPanel(undefined, input)!;
    expect(initial.tabs.map((tab) => tab.presentation)).toEqual([
        "preparing",
        "preparing",
    ]);
    const latest = {
        ...initial,
        revision: 7,
        name: "Other window",
        tabs: initial.tabs.map((tab) =>
            tab.id === "two"
                ? {
                      ...tab,
                      terminalId: "terminal",
                      runtimeId: "runtime",
                      presentation: "stopped" as const,
                      notice: {
                          message: "Stopped",
                          reason: null,
                          restartCommand: "command",
                      },
                  }
                : tab,
        ),
    };
    const rebased = projectPanel(latest, {
        panelId: "p",
        changes: [
            input.changes[2]!, // Broadcast arrived before the response; applying the same split intent is harmless.
            {
                type: "split.resize",
                splitId: "split",
                children: ["a", "b"],
                weights: [0.3, 0.7],
            },
            { type: "tab.dismiss", tabId: "two" },
        ],
    })!;
    expect(rebased).toMatchObject({
        name: "Other window",
        revision: 7,
        layout: { weights: [0.3, 0.7] },
    });
    expect(rebased.tabs[1]).toMatchObject({
        terminalId: "terminal",
        runtimeId: null,
        presentation: "shell",
        notice: null,
    });
    expect(latest.tabs[1]!.presentation).toBe("stopped");
    const closed = projectPanel(rebased, {
        panelId: "p",
        changes: [
            {
                type: "tab.close",
                tabId: "two",
                expectedRuntimeId: null,
                confirm: true,
            },
        ],
    })!;
    expect(closed.layout).toEqual({ type: "pane", id: "a", tabIds: ["one"] });
    expect(
        projectPanel(closed, {
            panelId: "p",
            changes: [{ type: "panel.delete", confirm: true }],
        }),
    ).toBeUndefined();
    expect(createdIds(input)).toEqual(["p", "a", "one", "two", "b", "split"]);
    expect(referencedIds(input)).toEqual(["p", "a", "two", "a"]);
});

it("ignores an absent panel for dependent intent instead of resurrecting it", () => {
    expect(
        projectPanel(undefined, {
            panelId: "deleted",
            changes: [{ type: "panel.rename", name: "Late" }],
        }),
    ).toBeUndefined();
});

it("keeps terminals mounted until an unconfirmed close or delete is accepted", () => {
    const panel = projectPanel(undefined, {
        panelId: "p",
        changes: [
            {
                type: "panel.create",
                name: "Panel",
                paneId: "pane",
                tabId: "tab",
            },
        ],
    })!;
    expect(
        projectPanel(panel, {
            panelId: "p",
            changes: [{ type: "panel.delete", confirm: false }],
        }),
    ).toBe(panel);
    expect(
        projectPanel(panel, {
            panelId: "p",
            changes: [
                {
                    type: "tab.close",
                    tabId: "tab",
                    expectedRuntimeId: null,
                    confirm: false,
                },
            ],
        }),
    ).toBe(panel);
});
