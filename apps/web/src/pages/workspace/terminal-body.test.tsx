import type { TabView } from "@aiox/protocol";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { TabNotice } from "./terminal-body";
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
const tab: TabView = {
    id: "t",
    label: "Agent",
    terminalId: "shell",
    runtimeId: null,
    agentKey: "agent",
    presentation: "stopped",
    notice: { message: "Stopped", reason: null, restartCommand: "aiox run" },
};
it("dismisses an existing-shell notice only after clipboard succeeds", async () => {
    const onDismiss = vi.fn();
    const write = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockRejectedValueOnce(new Error("denied"))
        .mockResolvedValue(undefined);
    render(<TabNotice tab={tab} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy aiox run" }));
    expect(
        await screen.findByText("Copy failed. Select the text manually."),
    ).toBeTruthy();
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Copy aiox run" }));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith(tab));
    expect(write).toHaveBeenCalledTimes(2);
});
it("does not dismiss shell spawn failure without a terminal", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    render(
        <TabNotice
            tab={{ ...tab, terminalId: null, presentation: "start-failed" }}
            onDismiss={onDismiss}
        />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy aiox run" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy();
    expect(onDismiss).not.toHaveBeenCalled();
});

it("offers the + affordance instead of an empty command", () => {
    render(
        <TabNotice
            tab={{
                ...tab,
                agentKey: null,
                presentation: "unavailable",
                notice: {
                    message: "Terminal is unavailable after daemon restart.",
                    reason: "daemon-ended",
                    restartCommand: "",
                },
            }}
            onDismiss={vi.fn()}
        />,
    );
    expect(
        screen.queryByText("Run in your terminal to start again"),
    ).toBeNull();
    expect(
        screen.getByText("Use + to open a shell or split this pane."),
    ).toBeTruthy();
});

it("keeps a restart command from dismissing an unavailable tab", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    render(
        <TabNotice
            tab={{ ...tab, presentation: "unavailable" }}
            onDismiss={onDismiss}
        />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy aiox run" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy();
    expect(onDismiss).not.toHaveBeenCalled();
});
