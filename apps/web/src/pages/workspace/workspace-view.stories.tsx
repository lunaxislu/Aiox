import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import {
    emptyWorkspace,
    terminalPreviews,
    workspacePreview,
} from "@/entities/panel/workspace-fixtures";

import { WorkspaceView } from "./workspace-view";

const meta = {
    title: "Pages/Workspace",
    component: WorkspaceView,
    parameters: { layout: "fullscreen" },
    decorators: [
        (Story) => (
            <div className="h-screen">
                <Story />
            </div>
        ),
    ],
    args: {
        panel: {
            ...workspacePreview,
            id: "preview",
            name: "Workspace",
            kind: "workspace",
        },
        terminals: terminalPreviews,
    },
} satisfies Meta<typeof WorkspaceView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Presentations: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const panelIds = Array.from(
            canvasElement.querySelectorAll("[data-panel]"),
            (panel) => panel.id,
        );
        await expect(new Set(panelIds).size).toBe(panelIds.length);
        await userEvent.click(
            canvas.getByRole("tab", { name: "preparing · preparing" }),
        );
        let pane = within(canvas.getByRole("region", { name: "Pane left" }));
        const notice = pane.getByText("Starting reviewer…");
        const reveal = notice.closest('[role="status"]')!.getAnimations()[0]!;
        reveal.pause();
        reveal.currentTime = 299;
        await expect(notice).not.toBeVisible();
        reveal.currentTime = 300;
        await expect(notice).toBeVisible();
        await expect(
            pane.queryByRole("button", { name: /^Copy / }),
        ).not.toBeInTheDocument();
        await userEvent.click(
            canvas.getByRole("tab", {
                name: "preparing-shell · aiox-preparing",
            }),
        );
        await expect(
            pane.getByLabelText("preparing-shell terminal output"),
        ).toBeVisible();
        await userEvent.click(
            canvas.getByRole("tab", { name: "stopped · stopped" }),
        );
        pane = within(canvas.getByRole("region", { name: "Pane top" }));
        await expect(pane.getByRole("tabpanel")).toHaveAttribute(
            "data-active",
            "true",
        );
        await expect(
            within(canvas.getByRole("region", { name: "Pane left" })).getByRole(
                "tabpanel",
            ),
        ).toHaveAttribute("data-active", "false");
        await expect(
            pane.getByRole("button", { name: /^Copy / }),
        ).toBeVisible();
        await userEvent.click(pane.getByRole("button", { name: "Status bar" }));
        await expect(
            pane.queryByRole("group", { name: "Terminal status" }),
        ).not.toBeInTheDocument();
        await userEvent.click(
            canvas.getByLabelText("preparing-shell terminal output"),
        );
        await expect(
            canvas.getByRole("tab", {
                name: "preparing-shell · aiox-preparing",
            }),
        ).toHaveAttribute("data-focused", "true");
        await expect(pane.getByRole("tabpanel")).toHaveAttribute(
            "data-active",
            "false",
        );
        await expect(
            within(canvas.getByRole("region", { name: "Pane left" })).getByRole(
                "tabpanel",
            ),
        ).toHaveAttribute("data-active", "true");
    },
};

export const Empty: Story = {
    args: { panel: { ...meta.args.panel, ...emptyWorkspace } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole("button", { name: "New shell in root" }),
        );
        await expect(
            canvas.getByRole("tab", { name: "shell · shell" }),
        ).toBeVisible();
    },
};

export const EmptyHost: Story = {
    args: {
        panel: {
            ...meta.args.panel,
            ...emptyWorkspace,
            kind: "host",
            command: "aiox host run --path /work/project",
        },
    },
};

const shell = workspacePreview.tabs[0]!;
const singlePanel = {
    ...meta.args.panel,
    layout: {
        type: "pane" as const,
        id: "root",
        tabIds: [shell.id],
        selectedTabId: shell.id,
    },
    activePaneId: "root",
    tabs: [shell],
};

export const CloseAndSplit: Story = {
    args: { panel: singlePanel },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole("button", { name: "Split right in root" }),
        );
        await expect(canvas.getAllByRole("tab")).toHaveLength(2);
        await userEvent.click(
            canvas.getAllByRole("button", { name: "Close shell" })[1]!,
        );
        const dialog = within(await within(document.body).findByRole("dialog"));
        await expect(
            dialog.getByRole("button", { name: "Cancel" }),
        ).toHaveFocus();
        await userEvent.click(
            dialog.getByRole("button", { name: "Close and stop" }),
        );
        await expect(canvas.getAllByRole("tab")).toHaveLength(1);
        await expect(canvas.getByRole("tab")).toHaveAttribute(
            "data-focused",
            "true",
        );
        await expect(
            canvas.queryByRole("separator", { name: "Resize panes" }),
        ).not.toBeInTheDocument();
    },
};

export const Disconnected: Story = {
    args: {
        panel: singlePanel,
        terminals: {
            "terminal-shell": {
                ...terminalPreviews["terminal-shell"]!,
                connection: "disconnected",
                reason: "The connection was interrupted.",
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole("button", { name: "Force stop" }),
        );
        await userEvent.click(
            within(await within(document.body).findByRole("dialog")).getByRole(
                "button",
                { name: "Cancel" },
            ),
        );
        await userEvent.click(
            canvas.getByRole("button", { name: "Reconnect" }),
        );
        await expect(
            canvas.queryByText("Terminal disconnected"),
        ).not.toBeInTheDocument();
    },
};
export const Reconnecting: Story = {
    args: {
        panel: singlePanel,
        terminals: {
            "terminal-shell": {
                ...terminalPreviews["terminal-shell"]!,
                connection: "reconnecting",
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.queryByRole("button", { name: /^Reconnect/ }),
        ).not.toBeInTheDocument();
        await userEvent.click(
            canvas.getByRole("button", { name: "Force stop" }),
        );
        const dialog = within(await within(document.body).findByRole("dialog"));
        await expect(
            dialog.getByRole("button", { name: "Close and stop" }),
        ).toBeVisible();
        await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    },
};
export const ScreenLost: Story = {
    args: {
        panel: singlePanel,
        terminals: {
            "terminal-shell": {
                ...terminalPreviews["terminal-shell"]!,
                connection: "screen-lost",
                reason: "Terminal snapshot is unavailable.",
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.getByText("Terminal screen could not be restored"),
        ).toBeVisible();
        await expect(
            canvas.queryByLabelText("shell terminal output"),
        ).not.toBeInTheDocument();
        await userEvent.click(
            canvas.getByRole("button", { name: "Force stop" }),
        );
        await userEvent.click(
            within(await within(document.body).findByRole("dialog")).getByRole(
                "button",
                { name: "Cancel" },
            ),
        );
        await userEvent.click(
            canvas.getByRole("button", { name: "Reconnect screen" }),
        );
        await expect(
            canvas.getByLabelText("shell terminal output"),
        ).toBeVisible();
    },
};
export const Unrestorable: Story = {
    args: {
        panel: singlePanel,
        terminals: {
            "terminal-shell": {
                ...terminalPreviews["terminal-shell"]!,
                connection: "unrestorable",
                reason: "The server could not retain a restorable terminal snapshot.",
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.getByText("Terminal screen cannot be restored"),
        ).toBeVisible();
        await expect(
            canvas.getByText(
                "The server could not retain a restorable terminal snapshot.",
            ),
        ).toBeVisible();
        await expect(
            canvas.queryByLabelText("shell terminal output"),
        ).not.toBeInTheDocument();
        const reconnect = canvas.getByRole("button", {
            name: "Reconnect screen",
        });
        await expect(reconnect).toBeDisabled();
        await userEvent.click(
            canvas.getByRole("button", { name: "Force stop" }),
        );
        let dialog = within(await within(document.body).findByRole("dialog"));
        await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
        await expect(reconnect).toBeDisabled();
        await expect(canvas.getByRole("tab")).toBeVisible();
        await userEvent.click(
            canvas.getByRole("button", { name: "Force stop" }),
        );
        dialog = within(await within(document.body).findByRole("dialog"));
        await userEvent.click(
            dialog.getByRole("button", { name: "Close and stop" }),
        );
        await expect(canvas.queryByRole("tab")).not.toBeInTheDocument();
    },
};

export const ActivityStates: Story = {
    args: {
        panel: {
            ...meta.args.panel,
            layout: {
                type: "pane",
                id: "activity",
                tabIds: [
                    "idle",
                    "working",
                    "awaiting-user",
                    "failed",
                    "aiox-preparing",
                ],
                selectedTabId: "failed",
            },
            activePaneId: "activity",
            tabs: (
                [
                    "idle",
                    "working",
                    "awaiting-user",
                    "failed",
                    "aiox-preparing",
                ] as const
            ).map((status) => ({
                ...workspacePreview.tabs[3]!,
                id: status,
                label: status,
                terminalId: status,
            })),
        },
        terminals: Object.fromEntries(
            (
                [
                    "idle",
                    "working",
                    "awaiting-user",
                    "failed",
                    "aiox-preparing",
                ] as const
            ).map((status) => [
                status,
                {
                    ...terminalPreviews["terminal-reviewer"]!,
                    status,
                    statusReason:
                        status === "failed"
                            ? "The vendor reported a failure. Open the terminal output for the full diagnostic message before retrying."
                            : "",
                },
            ]),
        ),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole("button", { name: "Show full reason" }),
        );
        await expect(
            canvas.getByRole("button", { name: "Collapse reason" }),
        ).toHaveAttribute("aria-expanded", "true");
        const tab = canvas.getByRole("tab", { name: "idle · idle" });
        await userEvent.click(tab);
        await userEvent.keyboard("{ArrowRight}");
        await expect(
            canvas.getByRole("tab", { name: "working · working" }),
        ).toHaveAttribute("aria-selected", "true");
    },
};

export const OverflowTabs: Story = {
    args: {
        panel: {
            ...singlePanel,
            tabs: Array.from({ length: 12 }, (_, i) => ({
                ...shell,
                id: `shell-${i}`,
                label: `shell ${i + 1}`,
            })),
            layout: {
                type: "pane",
                id: "root",
                tabIds: Array.from({ length: 12 }, (_, i) => `shell-${i}`),
                selectedTabId: "shell-0",
            },
        },
    },
    render: (args) => (
        <div style={{ width: 420, maxWidth: "100%", height: 400 }}>
            <WorkspaceView {...args} />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole("button", { name: "New shell in root" }),
        );
        const selected = canvas.getByRole("tab", { name: "shell · shell" });
        await expect(selected).toHaveAttribute("aria-selected", "true");
        selected.focus();
        await userEvent.keyboard("{Home}");
        await expect(
            canvas.getByRole("tab", { name: "shell 1 · shell" }),
        ).toHaveAttribute("aria-selected", "true");
        await userEvent.keyboard("{End}");
        await expect(selected).toHaveAttribute("aria-selected", "true");
        await expect(
            canvas.getByRole("button", { name: "Status bar" }),
        ).toBeEnabled();
    },
};
