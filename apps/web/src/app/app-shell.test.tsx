import type {
    ApplicationEvent,
    PanelView,
    WebCommandRequest,
} from "@aiox/protocol";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { Effect } from "effect";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/features/theme/theme-provider";
import { OverviewPage } from "@/pages/overview/overview-page";
import { WorkspacePage } from "@/pages/workspace/workspace-page";
import { ApplicationConnection } from "@/shared/api/application-connection";

import { AppShell } from "./app-shell";
import { ApplicationProvider } from "./application-provider";

vi.mock("@/attach", () => ({
    attachTerminal: vi.fn(() => ({
        close: vi.fn(),
        focus: vi.fn(),
        closed: false,
    })),
}));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
const snapshot = (): ApplicationEvent => ({
    type: "snapshot",
    version: 0,
    snapshot: {
        epoch: "e",
        panels: [],
        hosts: [],
        networks: [],
        terminals: [],
        agents: [],
        cleanups: [],
        notifications: [],
    },
});
function mount(path = "/") {
    const connection = new ApplicationConnection("ws://unused");
    let emit!: (event: ApplicationEvent) => void;
    const start = vi.spyOn(connection, "start").mockImplementation((sink) => {
        emit = sink;
        return async () => {};
    });
    const router = createMemoryRouter(
        [
            {
                path: "/",
                element: <AppShell />,
                children: [
                    { index: true, element: <OverviewPage /> },
                    { path: ":section", element: <OverviewPage /> },
                    { path: ":section/:panelId", element: <WorkspacePage /> },
                ],
            },
        ],
        { initialEntries: [path] },
    );
    render(
        <ThemeProvider>
            <ApplicationProvider connection={connection}>
                <RouterProvider router={router} />
            </ApplicationProvider>
        </ThemeProvider>,
    );
    return {
        connection,
        router,
        emit: (event: ApplicationEvent) => act(() => emit(event)),
        start,
    };
}
it("distinguishes first snapshot from empty state and never inserts fixtures", async () => {
    const app = mount();
    expect(screen.getByText("Loading application…")).toBeTruthy();
    app.emit(snapshot());
    expect(await screen.findByText("Start here")).toBeTruthy();
    expect(screen.queryByText("Loading application…")).toBeNull();
    expect(app.start).toHaveBeenCalledTimes(1);
});
it("waits for a snapshot before reporting an absent direct panel URL", async () => {
    const app = mount("/workspaces/missing");
    expect(screen.getByText("Loading application…")).toBeTruthy();
    app.emit(snapshot());
    expect(await screen.findByText("Page not found")).toBeTruthy();
});
const panel: PanelView = {
    id: "p",
    name: "Live",
    kind: "workspace",
    section: "workspaces",
    hostId: null,
    networkId: null,
    revision: 1,
    layout: { type: "pane", id: "pane", tabIds: ["a", "b"] },
    tabs: ["a", "b"].map((id) => ({
        id,
        label: id,
        presentation: "preparing",
        terminalId: null,
        runtimeId: null,
        agentKey: null,
        notice: null,
    })),
};
function withPanel() {
    const event = snapshot();
    if (event.type === "snapshot") event.snapshot.panels = [panel];
    return event;
}
it("uses current server state, selects without commands, and reflects remote deletion", async () => {
    const app = mount("/workspaces/p");
    const send = vi.spyOn(app.connection, "panelCommand");
    app.emit(withPanel());
    const b = await screen.findByRole("tab", { name: "b · preparing" });
    fireEvent.click(b);
    await waitFor(() => expect(b.getAttribute("aria-selected")).toBe("true"));
    app.emit(withPanel());
    expect(
        screen
            .getByRole("tab", { name: "b · preparing" })
            .getAttribute("aria-selected"),
    ).toBe("true");
    expect(send).not.toHaveBeenCalled();
    app.emit(snapshot());
    expect(await screen.findByText("Page not found")).toBeTruthy();
    expect(app.start).toHaveBeenCalledTimes(1);
});
it.each(["invalid_request", "result_expired", "sequence_gap"])(
    "reports %s without replaying on snapshot",
    async (code) => {
        const app = mount("/workspaces/p");
        let request!: WebCommandRequest;
        const send = vi
            .spyOn(app.connection, "panelCommand")
            .mockImplementation((input, onRequest) => {
                request = {
                    ...input,
                    clientSessionId: "session",
                    requestId: "request",
                    sequence: 1,
                };
                return {
                    request,
                    execute: Effect.sync(() => onRequest?.(request)).pipe(
                        Effect.flatMap(() =>
                            Effect.fail({ code, message: "test cause" }),
                        ),
                    ),
                } as ReturnType<ApplicationConnection["panelCommand"]>;
            });
        app.emit(withPanel());
        fireEvent.click(
            await screen.findByRole("button", { name: "New shell in pane" }),
        );
        const label =
            code === "result_expired"
                ? /Command result unknown/
                : code === "sequence_gap"
                  ? /Command not executed/
                  : /Command rejected/;
        expect(await screen.findByText(label)).toBeTruthy();
        app.emit(withPanel());
        expect(send).toHaveBeenCalledTimes(1);
        if (code === "result_expired") {
            app.emit({
                type: "sequence-failure",
                failure: {
                    code: "sequence_gap",
                    clientSessionId: "session",
                    missing: [],
                    unexecuted: [request],
                },
            });
            expect(
                await screen.findByText(/Command not executed: sequence gap/),
            ).toBeTruthy();
            app.emit(snapshot());
            expect(
                screen.getByText(/Command not executed: sequence gap/),
            ).toBeTruthy();
        }
    },
);
it("preparing close has no confirmation and keeps expected runtime; rejection restores the tab", async () => {
    const app = mount("/workspaces/p");
    const send = vi
        .spyOn(app.connection, "panelCommand")
        .mockImplementation((input, onRequest) => {
            const request = {
                ...input,
                clientSessionId: "session",
                requestId: "request",
                sequence: 1,
            };
            onRequest?.(request);
            return {
                request,
                execute: Effect.fail({ code: "host_busy", message: "Busy" }),
            } as ReturnType<ApplicationConnection["panelCommand"]>;
        });
    app.emit(withPanel());
    fireEvent.click(await screen.findByRole("button", { name: "Close a" }));
    expect(send.mock.calls[0]?.[0]).toEqual({
        panelId: "p",
        changes: [
            {
                type: "tab.close",
                tabId: "a",
                expectedRuntimeId: null,
                confirm: false,
            },
        ],
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText(/Command rejected/)).toBeTruthy();
    expect(screen.getByRole("tab", { name: "a · preparing" })).toBeTruthy();
});
it("notification read failures preserve unread data; Clear all sends all current IDs", async () => {
    const app = mount();
    const ids: string[][] = [];
    vi.spyOn(app.connection, "call").mockImplementation(
        (run) =>
            run(
                {
                    "notifications.read": (input: { ids: string[] }) => {
                        ids.push(input.ids);
                        return Effect.fail(new Error("offline"));
                    },
                } as never,
                { clientSessionId: "session" } as never,
            ) as never,
    );
    const event = snapshot();
    if (event.type === "snapshot")
        event.snapshot.notifications = ["n1", "n2"].map((id) => ({
            id,
            originRuntimeId: "gone",
            terminalId: null,
            body: id,
            createdAt: 1,
            readAt: null,
        }));
    app.emit(event);
    fireEvent.click(
        await screen.findByRole("button", { name: "Notifications: 2 unread" }),
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Clear all" }));
    expect(
        await screen.findByText(/Could not confirm notification read/),
    ).toBeTruthy();
    expect(ids).toEqual([["n1", "n2"]]);
    expect(
        screen.getByRole("button", { name: "Notifications: 2 unread" }),
    ).toBeTruthy();
    app.emit({
        type: "delta",
        epoch: "e",
        version: 1,
        changes: [{ resource: "notification", action: "remove", id: "n1" }],
    });
    expect(
        await screen.findByRole("button", { name: "Notifications: 1 unread" }),
    ).toBeTruthy();
});
it("shows shell preparation failure and process cleanup failure as separate server facts", async () => {
    const app = mount("/workspaces/p");
    const event = withPanel();
    if (event.type === "snapshot") {
        event.snapshot.panels[0] = {
            ...panel,
            tabs: panel.tabs.map((tab) =>
                tab.id === "a"
                    ? {
                          ...tab,
                          presentation: "start-failed",
                          notice: {
                              message: "Shell preparation failed",
                              reason: "Spawn denied",
                              restartCommand: "/bin/sh",
                          },
                      }
                    : tab,
            ),
        };
        event.snapshot.cleanups = [
            {
                id: "cleanup",
                terminalId: "old-terminal",
                panelId: "p",
                tabId: "removed",
                reason: "tab-closed",
                state: "failed",
                error: "Termination unconfirmed",
                attempts: 1,
                updatedAt: 1,
            },
        ];
    }
    app.emit(event);
    expect(await screen.findByText("Shell preparation failed")).toBeTruthy();
    expect(screen.getAllByText("Spawn denied").length).toBeGreaterThan(0);
    expect(
        screen.getByText(/Process cleanup failed.*old-terminal/),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close removed" })).toBeNull();
});
it("notification follows the latest runtime tab, selects locally, and reads only its ID", async () => {
    const app = mount();
    const reads: string[][] = [];
    vi.spyOn(app.connection, "call").mockImplementation(
        (run) =>
            run(
                {
                    "notifications.read": (input: { ids: string[] }) => {
                        reads.push(input.ids);
                        return Effect.succeed({ read: 1, state: null });
                    },
                } as never,
                { clientSessionId: "session" } as never,
            ) as never,
    );
    const commands = vi.spyOn(app.connection, "panelCommand");
    const event = withPanel();
    if (event.type === "snapshot") {
        event.snapshot.panels = [
            {
                ...panel,
                tabs: panel.tabs.map((tab) =>
                    tab.id === "b"
                        ? {
                              ...tab,
                              presentation: "tui",
                              runtimeId: "runtime",
                              terminalId: "terminal",
                          }
                        : tab,
                ),
            },
        ];
        event.snapshot.terminals = [
            { id: "terminal", cwd: "/tmp", kind: "agent", alive: true },
        ];
        event.snapshot.notifications = [
            {
                id: "notice",
                originRuntimeId: "runtime",
                terminalId: "terminal",
                body: "Ready to review",
                createdAt: 1,
                readAt: null,
            },
        ];
    }
    app.emit(event);
    fireEvent.click(
        await screen.findByRole("button", { name: "Notifications: 1 unread" }),
    );
    fireEvent.click(
        await screen.findByRole("menuitem", { name: /Ready to review/ }),
    );
    expect(await screen.findByRole("tab", { name: "b · tui" })).toBeTruthy();
    await waitFor(() =>
        expect(
            screen
                .getByRole("tab", { name: "b · tui" })
                .getAttribute("aria-selected"),
        ).toBe("true"),
    );
    expect(reads).toEqual([["notice"]]);
    expect(commands).not.toHaveBeenCalled();
    expect(
        screen.getByRole("button", { name: "Notifications: 1 unread" }),
    ).toBeTruthy();
});
it("confirmation preserves the runtime seen when the dialog opened", async () => {
    const app = mount("/workspaces/p");
    const event = withPanel();
    if (event.type === "snapshot")
        event.snapshot.panels = [
            {
                ...panel,
                tabs: panel.tabs.map((tab) =>
                    tab.id === "a"
                        ? {
                              ...tab,
                              presentation: "tui",
                              runtimeId: "old",
                              terminalId: "terminal",
                          }
                        : tab,
                ),
            },
        ];
    const send = vi
        .spyOn(app.connection, "panelCommand")
        .mockReturnValue({ execute: Effect.never, request: undefined });
    app.emit(event);
    fireEvent.click(await screen.findByRole("button", { name: "Close a" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
    const updated = structuredClone(event);
    if (updated.type === "snapshot")
        updated.snapshot.panels[0]!.tabs[0]!.runtimeId = "new";
    app.emit(updated);
    fireEvent.click(screen.getByRole("button", { name: "Close and stop" }));
    expect(send.mock.calls[0]?.[0]).toEqual({
        panelId: "p",
        changes: [
            {
                type: "tab.close",
                tabId: "a",
                expectedRuntimeId: "old",
                confirm: true,
            },
        ],
    });
});

it.each([false, true])(
    "delete completion respects current route (navigate away: %s)",
    async (leave) => {
        const app = mount("/workspaces/p");
        let complete!: () => void;
        vi.spyOn(app.connection, "panelCommand").mockImplementation(
            (input, onRequest) => {
                const request = {
                    ...input,
                    clientSessionId: "session",
                    requestId: "delete",
                    sequence: 1,
                };
                return {
                    request,
                    execute: Effect.callback((resume) => {
                        onRequest?.(request);
                        complete = () =>
                            resume(
                                Effect.succeed({
                                    result: {
                                        requestId: "delete",
                                        sequence: 1,
                                        panel: null,
                                    },
                                    state: null,
                                    checkpoint: 1,
                                }),
                            );
                    }),
                } as ReturnType<ApplicationConnection["panelCommand"]>;
            },
        );
        app.emit(withPanel());
        fireEvent.click(await screen.findByText("workspaces", { exact: true }));
        await act(() => app.router.navigate("/workspaces/p"));
        fireEvent.contextMenu(
            await screen.findByRole("link", { name: "Live" }),
        );
        fireEvent.click(
            await screen.findByRole("menuitem", { name: "Delete" }),
        );
        fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
        await waitFor(() => expect(complete).toBeTypeOf("function"));
        if (leave) await act(() => app.router.navigate("/workspaces/q"));
        await act(async () => {
            complete();
        });
        await waitFor(() =>
            expect(app.router.state.location.pathname).toBe(
                leave ? "/workspaces/q" : "/workspaces",
            ),
        );
    },
);
