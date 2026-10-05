import { parseConfig, type TabView } from "@aiox/protocol";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { useApplicationConfig } from "@/app/application-config";
import { attachTerminal, type AttachmentState } from "@/attach";
import type { WorkspaceLayout } from "@/entities/panel/workspace-fixtures";

import { WorkspaceContent } from "./workspace-view";

vi.mock("@/app/application-config", () => ({
    useApplicationConfig: vi.fn(() => ({ loaded: true })),
}));

vi.mock("@/attach", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/attach")>()),
    attachTerminal: vi.fn(() => ({
        close: vi.fn(),
        focus: vi.fn(),
        closed: false,
    })),
}));
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.mocked(useApplicationConfig).mockReturnValue({ loaded: true });
});
const tab = (id = "t", runtimeId: string | null = null): TabView => ({
    id,
    terminalId: `terminal-${id}`,
    runtimeId,
    label: id,
    presentation: "shell",
    agentKey: null,
    notice: null,
});
const layout = (tabs = [tab()], pane = "a"): WorkspaceLayout => ({
    tabs,
    activePaneId: pane,
    layout: {
        type: "pane",
        id: pane,
        tabIds: tabs.map((t) => t.id),
        selectedTabId: tabs[0]?.id ?? null,
    },
});
function setup(strict = false) {
    const close = vi.fn();
    const select = vi.fn();
    const view = (state: WorkspaceLayout) => (
        <WorkspaceContent
            live
            panel={{ id: "p", name: "Test", kind: "workspace", ...state }}
            state={state}
            terminals={{}}
            onSelect={select}
            onLayoutChange={vi.fn()}
            onDrop={vi.fn()}
            addShell={vi.fn()}
            onClose={close}
        />
    );
    const mounted = render(view(layout()), {
        wrapper: strict ? StrictMode : undefined,
    });
    return {
        ...mounted,
        update: (state: WorkspaceLayout) => mounted.rerender(view(state)),
        close,
        select,
    };
}
function report(state: AttachmentState, reason: string = state) {
    act(() => {
        vi.mocked(attachTerminal).mock.calls.at(-1)![2](reason, state);
    });
}
it("shows initial restoration as loading, without failure actions, until connected", () => {
    setup();
    expect(screen.getByText("Restoring terminal…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Force stop" })).toBeNull();
    expect(screen.queryByText("Terminal disconnected")).toBeNull();
    report("restoring");
    expect(screen.queryByRole("button", { name: "Force stop" })).toBeNull();
    report("connected");
    expect(screen.queryByText("Restoring terminal…")).toBeNull();
    expect(attachTerminal).toHaveBeenCalledOnce();
});
it("paints terminal padding with the attachment's effective background and ignores disposed callbacks", () => {
    const view = setup();
    const call = vi.mocked(attachTerminal).mock.calls.at(-1)!;
    const surface = call[0].parentElement!;
    act(() => call[5]!.onBackground("#123456"));
    expect(surface.style.backgroundColor).toBe("#123456");
    view.unmount();
    call[5]!.onBackground("#abcdef");
    expect(surface.style.backgroundColor).toBe("#123456");
});

it("provides refreshed config overrides to a surviving attachment", () => {
    const configure = (sequence: string | null) => {
        const stored = {
            terminal: { keybindings: { mac: { "Alt+ArrowLeft": sequence } } },
        };
        vi.mocked(useApplicationConfig).mockReturnValue({
            loaded: true,
            value: {
                revision: "r1",
                stored,
                effective: parseConfig(stored),
                runningPorts: { daemon: 4500, web: 4501 },
                restartRequired: false,
            },
        });
    };
    configure(null);
    const view = setup();
    const call = vi.mocked(attachTerminal).mock.calls.at(-1)!;
    expect(call[6]!()).toEqual({ mac: { "Alt+ArrowLeft": null } });
    configure("\x1b[1;5D");
    view.update(layout());
    expect(attachTerminal).toHaveBeenCalledOnce();
    expect(call[6]!()).toEqual({ mac: { "Alt+ArrowLeft": "\x1b[1;5D" } });
});
it.each([false, true])(
    "updates split membership without errors or replacing surviving attachments (StrictMode %s)",
    (strict) => {
        const view = setup(strict);
        const original = vi.mocked(attachTerminal).mock.calls.at(-1)!;
        const attachment = vi.mocked(attachTerminal).mock.results.at(-1)!.value;
        const pane = (
            id: string,
            tabId: string,
        ): WorkspaceLayout["layout"] => ({
            type: "pane",
            id,
            tabIds: [tabId],
            selectedTabId: tabId,
        });
        const split = (
            children: WorkspaceLayout["layout"][],
        ): WorkspaceLayout["layout"] => ({
            type: "split",
            id: "split",
            axis: "x",
            children,
            weights: children.map(() => 1 / children.length),
        });
        const layouts = [
            split([pane("a", "t"), pane("b", "u")]),
            split([pane("a", "t"), pane("b", "u"), pane("c", "v")]),
            split([pane("a", "t"), pane("c", "v")]),
            split([pane("d", "t"), pane("c", "v")]),
            split([
                { ...split([pane("d", "t"), pane("b", "u")]), id: "nested" },
                pane("c", "v"),
            ]),
            pane("a", "t"),
        ];
        for (const next of layouts) {
            view.update({
                ...layout([tab(), tab("u"), tab("v")]),
                layout: next,
            });
            expect(attachment.close).not.toHaveBeenCalled();
            expect(original[0].isConnected).toBe(true);
            const ownCalls = vi
                .mocked(attachTerminal)
                .mock.calls.filter((call) => call[1] === "terminal-t");
            expect(ownCalls.at(-1)).toBe(original);
        }
        view.unmount();
        expect(attachment.close).toHaveBeenCalledOnce();
    },
);
it.each([false, true])(
    "keeps attachment on pane move, disposes on hide and return/unmount (StrictMode %s)",
    (strict) => {
        const view = setup(strict);
        const attachment = vi.mocked(attachTerminal).mock.results.at(-1)!.value;
        const count = vi.mocked(attachTerminal).mock.calls.length;
        const host = vi.mocked(attachTerminal).mock.calls.at(-1)![0];
        report("connected");
        view.update(layout([tab()], "b"));
        expect(attachTerminal).toHaveBeenCalledTimes(count);
        expect(attachment.close).not.toHaveBeenCalled();
        expect(
            host
                .closest("[data-terminal-slot]")
                ?.getAttribute("data-terminal-slot"),
        ).toBe("b");
        view.update(layout([tab("other")]));
        expect(attachment.close).toHaveBeenCalledOnce();
        view.update(layout());
        expect(vi.mocked(attachTerminal).mock.calls.at(-1)![0]).not.toBe(host);
        view.unmount();
        for (const result of vi.mocked(attachTerminal).mock.results)
            expect(result.value.close).toHaveBeenCalledOnce();
        expect(view.close).not.toHaveBeenCalled();
    },
);
it("attaches only after preparing completes; moved or removed preparing tabs do not attach late", () => {
    const view = setup();
    const preparing = {
        ...tab(),
        terminalId: null,
        presentation: "preparing" as const,
    };
    view.update(layout([preparing], "b"));
    vi.mocked(attachTerminal).mockClear();
    view.update(layout([preparing], "c"));
    expect(attachTerminal).not.toHaveBeenCalled();
    view.update(layout([tab()], "c"));
    expect(attachTerminal).toHaveBeenCalledOnce();
    expect(
        vi
            .mocked(attachTerminal)
            .mock.calls[0]![0].closest("[data-terminal-slot]")
            ?.getAttribute("data-terminal-slot"),
    ).toBe("c");
    view.update(layout([]));
    vi.mocked(attachTerminal).mockClear();
    view.update({ ...layout([]), tabs: [tab()] });
    expect(attachTerminal).not.toHaveBeenCalled();
});
it("replaces execution, ignores old callbacks and uses current active pane for focus permission", () => {
    const view = setup();
    const old = vi.mocked(attachTerminal).mock.calls.at(-1)!;
    const attachment = vi.mocked(attachTerminal).mock.results.at(-1)!.value;
    report("unrestorable", "old mirror failure");
    view.update(layout([tab("t", "r2")]));
    expect(attachment.close).toHaveBeenCalledOnce();
    expect(vi.mocked(attachTerminal).mock.calls.at(-1)![3]).toBe("r2");
    act(() => old[2]("late failure", "unrestorable"));
    expect(screen.queryByText("late failure")).toBeNull();
    expect(screen.queryByText("old mirror failure")).toBeNull();
    report("connected");
    view.update({ ...layout([tab("t", "r2")]), activePaneId: "other" });
    expect(vi.mocked(attachTerminal).mock.calls.at(-1)![4]!()).toBe(false);
    view.update(layout([tab("t", "r2")]));
    expect(vi.mocked(attachTerminal).mock.calls.at(-1)![4]!()).toBe(true);
});
it("preserves failure during reconnect, distinguishes restore refusal/exit and confirms stop with captured runtime", () => {
    const view = setup();
    view.update(layout([tab("t", "r1")]));
    report("failed", "snapshot boundary exceeded");
    fireEvent.click(screen.getByRole("button", { name: "Reconnect screen" }));
    report("restoring");
    expect(screen.getByText("snapshot boundary exceeded")).toBeTruthy();
    expect(screen.getByText("Reconnecting…")).toBeTruthy();
    expect(vi.mocked(attachTerminal).mock.calls.at(-1)![1]).toBe("terminal-t");
    expect(vi.mocked(attachTerminal).mock.calls.at(-1)![3]).toBe("r1");
    report("unrestorable", "mirror failed");
    expect(
        screen.queryByRole("button", { name: "Reconnect screen" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Force stop" }));
    view.update(layout([tab("t", "r2")]));
    fireEvent.click(screen.getByRole("button", { name: "Close and stop" }));
    expect(view.close).toHaveBeenCalledWith(tab("t", "r1"), true);
    report("exited");
    expect(screen.getByText("Restoring terminal…")).toBeTruthy();
    expect(screen.queryByText("Terminal process exited")).toBeNull();
    expect(screen.queryByRole("button", { name: "Force stop" })).toBeNull();
    view.update(layout([tab("t")]));
    expect(vi.mocked(attachTerminal).mock.calls.at(-1)![3]).toBeUndefined();
    report("connected");
    expect(screen.queryByText("Restoring terminal…")).toBeNull();
    report("exited");
    expect(screen.getByText("Terminal process exited")).toBeTruthy();
});
