import { expect, it } from "vitest";

import { dropTarget, resizeChanges } from "./workspace-commands";
const layout = {
    type: "pane" as const,
    id: "p",
    tabIds: ["a", "b", "c"],
    selectedTabId: "a",
};
it("maps insertion slots to surviving beforeTabId, including self and append", () => {
    expect(
        dropTarget(layout, "a", { paneId: "p", zone: "tabbar", index: 2 }),
    ).toEqual({ toPaneId: "p", beforeTabId: "c" });
    expect(
        dropTarget(layout, "b", { paneId: "p", zone: "tabbar", index: 1 }),
    ).toEqual({ toPaneId: "p", beforeTabId: "c" });
    expect(dropTarget(layout, "a", { paneId: "p", zone: "center" })).toEqual({
        toPaneId: "p",
    });
});
it("does not split a pane with its only tab", () => {
    expect(
        dropTarget({ ...layout, tabIds: ["a"] }, "a", {
            paneId: "p",
            zone: "right",
        }),
    ).toBeNull();
});
it("resize sends the exact split child identity and nothing on identical layout", () => {
    const split = {
        type: "split" as const,
        id: "s",
        axis: "x" as const,
        weights: [0.5, 0.5],
        children: [layout, { ...layout, id: "q", tabIds: [] }],
    };
    expect(resizeChanges(split, split)).toEqual([]);
    expect(resizeChanges(split, { ...split, weights: [0.3, 0.7] })).toEqual([
        {
            type: "split.resize",
            splitId: "s",
            children: ["p", "q"],
            weights: [0.3, 0.7],
        },
    ]);
});
