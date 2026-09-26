import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { previewPanels } from "@/entities/panel/fixtures";

import { WorkspaceDialog } from "./workspace-dialog";

const meta = {
    title: "Features/Workspace/Delete confirmation",
    component: WorkspaceDialog,
    args: {
        action: {
            type: "delete",
            panel: previewPanels[0]!,
            terminals: [
                { tabId: "shell", label: "Shell", status: "idle" },
                { tabId: "agent", label: "Claude reviewer", status: "running" },
                { tabId: "unknown", label: "Build shell", status: "unknown" },
            ],
        },
        onSubmit: fn(),
        onClose: fn(),
    },
} satisfies Meta<typeof WorkspaceDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const MixedStates: Story = {
    play: async ({ canvasElement, args }) => {
        const page = within(canvasElement.ownerDocument.body);
        await expect(
            page.getByRole("list", { name: "Terminals" }),
        ).toBeVisible();
        await expect(page.getByText("status unknown")).toBeVisible();
        await userEvent.click(
            page.getByRole("button", { name: "Stop and delete" }),
        );
        await expect(args.onSubmit).toHaveBeenCalledWith("");
    },
};
export const UnknownState: Story = {
    args: {
        action: {
            ...meta.args.action,
            terminals: [
                {
                    tabId: "unknown",
                    label: "Disconnected shell",
                    status: "unknown",
                },
            ],
        },
    },
};
export const ManyTerminals: Story = {
    args: {
        action: {
            ...meta.args.action,
            terminals: Array.from({ length: 30 }, (_, index) => ({
                tabId: String(index),
                label: `Terminal ${index + 1}`,
                status: index % 2 ? "idle" : "running",
            })),
        },
    },
};
