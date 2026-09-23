import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, test } from "vitest";

import { workspacePreview } from "@/entities/panel/workspace-fixtures";

import { WorkspaceView, type WorkspaceViewProps } from "./workspace-view";

afterEach(cleanup);

function panel(split = false, confirm = false): WorkspaceViewProps["panel"] {
    const template = workspacePreview.tabs.find((tab) => tab.id === "stopped")!;
    return {
        id: "test",
        name: "Test",
        kind: "workspace",
        activePaneId: "a",
        tabs: [
            {
                ...template,
                id: "one",
                label: "One",
                ...(confirm
                    ? {
                          presentation: "shell" as const,
                          terminalId: "terminal-one",
                          notice: null,
                      }
                    : {}),
            },
            { ...template, id: "two", label: "Two" },
        ],
        layout: split
            ? {
                  type: "split",
                  axis: "x",
                  weights: [0.5, 0.5],
                  children: [
                      {
                          type: "pane",
                          id: "a",
                          tabIds: ["one"],
                          selectedTabId: "one",
                      },
                      {
                          type: "pane",
                          id: "b",
                          tabIds: ["two"],
                          selectedTabId: "two",
                      },
                  ],
              }
            : {
                  type: "pane",
                  id: "a",
                  tabIds: ["one", "two"],
                  selectedTabId: "one",
              },
    };
}

test.each([false, true])(
    "immediate close selects the remaining tab (pane removed: %s), but never focuses the add button",
    (split) => {
        render(<WorkspaceView panel={panel(split)} terminals={{}} />, {
            wrapper: StrictMode,
        });
        const close = screen.getByRole("button", { name: "Close One" });
        close.focus();
        fireEvent.click(close);
        expect(
            screen
                .getByRole("tab", { name: /Two/ })
                .getAttribute("aria-selected"),
        ).toBe("true");
        fireEvent.click(screen.getByRole("button", { name: "Close Two" }));
        expect(screen.queryByRole("tab")).toBeNull();
        expect(document.activeElement?.hasAttribute("data-pane-add")).toBe(
            false,
        );
    },
);

test("dialog cancellation restores the opener, confirmation selects the surviving tab", async () => {
    render(<WorkspaceView panel={panel(false, true)} terminals={{}} />, {
        wrapper: StrictMode,
    });
    expect(screen.getByLabelText("One terminal output")).toBeTruthy();
    const close = screen.getByRole("button", { name: "Close One" });
    close.focus();
    fireEvent.click(close);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(document.activeElement).toBe(close));
    fireEvent.click(close);
    fireEvent.click(
        await screen.findByRole("button", { name: "Close and stop" }),
    );
    await waitFor(() =>
        expect(screen.queryByRole("tab", { name: /One/ })).toBeNull(),
    );
});

test.each([false, true])(
    "confirming a close in another pane stays there when it survives (removed: %s)",
    async (removed) => {
        const fixture = panel(true);
        const template = fixture.tabs[0]!;
        fixture.tabs.push({
            ...template,
            id: "three",
            label: "Three",
            presentation: "shell",
            terminalId: "terminal-three",
            notice: null,
        });
        if (fixture.layout.type !== "split") throw new Error("Expected split");
        fixture.layout.children[1] = {
            type: "pane",
            id: "b",
            tabIds: removed ? ["three"] : ["two", "three"],
            selectedTabId: "three",
        };
        render(<WorkspaceView panel={fixture} terminals={{}} />, {
            wrapper: StrictMode,
        });
        screen.getByRole("tab", { name: /One/ }).focus();
        const close = screen.getByRole("button", { name: "Close Three" });
        close.focus();
        fireEvent.click(close);
        expect(
            screen
                .getByRole("tab", { name: /Three/, hidden: true })
                .getAttribute("data-focused"),
        ).toBe("true");
        fireEvent.click(
            await screen.findByRole("button", { name: "Close and stop" }),
        );
        await waitFor(() =>
            expect(screen.queryByRole("tab", { name: /Three/ })).toBeNull(),
        );
        expect(
            screen
                .getByRole("tab", { name: removed ? /One/ : /Two/ })
                .getAttribute("data-focused"),
        ).toBe("true");
    },
);

test.each(["click", "focus"])(
    "entering an already selected tab by %s activates its pane",
    (event) => {
        render(<WorkspaceView panel={panel(true)} terminals={{}} />);
        const a = screen.getByRole("tab", { name: /One/ });
        const b = screen.getByRole("tab", { name: /Two/ });
        expect(a.getAttribute("data-focused")).toBe("true");
        expect(b.getAttribute("aria-selected")).toBe("true");
        if (event === "click") fireEvent.click(b);
        else fireEvent.focus(b);
        expect(b.getAttribute("data-focused")).toBe("true");
        expect(a.getAttribute("data-focused")).toBe("false");
        expect(a.getAttribute("aria-selected")).toBe("true");
    },
);

test.each([false, true])(
    "keyboard entry into a body activates its pane (portal: %s)",
    (portal) => {
        const fixture = panel(true, portal);
        fixture.activePaneId = "b";
        render(
            <WorkspaceView
                panel={fixture}
                terminals={
                    portal
                        ? {
                              "terminal-one": {
                                  cwd: "/tmp",
                                  output: "",
                                  connection: "disconnected",
                                  busy: "running",
                              },
                          }
                        : {}
                }
            />,
        );
        const target = portal
            ? screen.getByRole("button", { name: "Reconnect" })
            : screen.getByRole("tabpanel", { name: /One/ });
        fireEvent.focus(target);
        expect(
            screen
                .getByRole("tab", { name: /One/ })
                .getAttribute("data-focused"),
        ).toBe("true");
        expect(
            screen
                .getByRole("tab", { name: /Two/ })
                .getAttribute("data-focused"),
        ).toBe("false");
    },
);

test("tabbar empty space does not activate a pane, while a nested tab label does", () => {
    render(<WorkspaceView panel={panel(true)} terminals={{}} />);
    const a = screen.getByRole("tab", { name: /One/ });
    const b = screen.getByRole("tab", { name: /Two/ });
    fireEvent.click(screen.getByRole("tablist", { name: "Tabs in b" }));
    expect(a.getAttribute("data-focused")).toBe("true");
    fireEvent.click(b.querySelector("span")!);
    expect(b.getAttribute("data-focused")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Close Two" }));
    expect(
        screen.getByRole("tab", { name: /One/ }).getAttribute("data-focused"),
    ).toBe("true");
});
