import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, userEvent, within } from "storybook/test";

import { previewNotifications } from "@/entities/notification/fixtures";
import {
    disconnectedHeader,
    previewHeader,
    previewPanels,
} from "@/entities/panel/fixtures";
import { ThemeProvider } from "@/features/theme/theme-provider";

import { AppShell } from "./app-shell-preview";

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
export const Notifications: Story = {
    args: { initialNotifications: previewNotifications.slice(0, 3) },
    play: async ({ canvasElement }) => {
        const header = within(canvasElement.querySelector("header")!);
        await userEvent.click(
            header.getByRole("button", { name: "Notifications: 3 unread" }),
        );
        const menu = within(canvasElement.ownerDocument.body);
        const items = await menu.findAllByRole("menuitem");
        // 서버는 오름차순으로 보내고 화면은 최신을 맨 위에 둔다.
        await expect(items[1]).toHaveTextContent("reviewer finished");
        await expect(items[1]).toHaveTextContent("2 minutes ago");
        // 사라진 실행은 이름 없이 본문과 시각만 남는다.
        await expect(items[3]).toHaveTextContent("builder stopped");
        await expect(items[3]).toHaveTextContent("3 hours ago");
        await expect(items[0]).toHaveTextContent("Clear all");
    },
};
export const NotificationsEmpty: Story = {
    args: { initialNotifications: [] },
    play: async ({ canvasElement }) => {
        const header = within(canvasElement.querySelector("header")!);
        await userEvent.click(
            header.getByRole("button", { name: "Notifications: 0 unread" }),
        );
        await expect(
            await within(canvasElement.ownerDocument.body).findByText(
                "No unread notifications",
            ),
        ).toBeInTheDocument();
    },
};
export const Disconnected: Story = {
    args: {
        ...disconnectedHeader,
        initialNotifications: previewNotifications.slice(0, 3),
    },
    play: async ({ canvasElement }) => {
        const header = within(canvasElement.querySelector("header")!);
        await expect(header.getByRole("status")).toHaveTextContent(
            "Daemon disconnected",
        );
        await expect(
            header.getByRole("button", { name: "Notifications: 3 unread" }),
        ).toBeEnabled();
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
