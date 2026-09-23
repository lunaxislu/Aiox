import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, userEvent, within } from "storybook/test";

import {
    disconnectedHeader,
    previewHeader,
    previewPanels,
} from "@/entities/panel/fixtures";
import { ThemeProvider } from "@/features/theme/theme-provider";

import { AppShell } from "./app-shell";

const meta = {
    title: "App/Header",
    component: AppShell,
    parameters: { layout: "fullscreen" },
    globals: { theme: "light" },
    args: previewHeader,
    render: (args, { parameters }) => (
        <ThemeProvider defaultTheme="light">
            <RouterProvider
                router={createMemoryRouter(
                    [
                        {
                            path: "/",
                            element: <AppShell {...args} />,
                            loader: () => ({ initialPanels: previewPanels }),
                            children: [
                                { path: ":section/:panelId" },
                                {
                                    path: "settings",
                                    element: <h1>Settings</h1>,
                                },
                            ],
                        },
                    ],
                    {
                        initialEntries: [
                            parameters.path ?? "/hosts/development",
                        ],
                    },
                )}
            />
        </ThemeProvider>
    ),
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Host: Story = {};
export const Network: Story = {
    parameters: { path: "/networks/dev" },
    play: async ({ canvasElement }) => {
        const header = within(canvasElement.querySelector("header")!);
        await expect(header.getByText("· 1 member")).toBeInTheDocument();
        await expect(header.queryByText(/No routes/)).not.toBeInTheDocument();
    },
};
export const Workspace: Story = { parameters: { path: "/workspaces/main" } };
export const Disconnected: Story = {
    args: disconnectedHeader,
    play: async ({ canvasElement }) => {
        const header = within(canvasElement.querySelector("header")!);
        await expect(header.getByRole("status")).toHaveTextContent(
            "Daemon disconnected",
        );
        await expect(
            header.getByRole("button", { name: "Notifications: 3 unread" }),
        ).toBeDisabled();
        const root = canvasElement.ownerDocument.documentElement;
        const initiallyDark = root.classList.contains("dark");
        const toggle = header.getByRole("button", { name: "Toggle theme" });
        await userEvent.click(toggle);
        await expect(root).toHaveClass(initiallyDark ? "light" : "dark");
        await expect(
            within(canvasElement.ownerDocument.body).queryByRole("menu"),
        ).not.toBeInTheDocument();
        await userEvent.click(toggle);
        await expect(root).toHaveClass(initiallyDark ? "dark" : "light");
    },
};
