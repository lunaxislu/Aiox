import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { fn } from "storybook/test";

import type { AppOutletContext } from "@/app/app-shell";
import { previewPanels } from "@/entities/panel/fixtures";
import { WorkspacePage } from "@/pages/workspace/workspace-page";

import { OverviewPage } from "./overview-page";

const meta = {
    title: "Pages/Overview",
    component: OverviewPage,
    parameters: { layout: "fullscreen" },
    args: { panels: previewPanels, onCreate: fn() },
    render: (args) => (
        <MemoryRouter>
            <Routes>
                <Route
                    element={
                        <div className="h-screen overflow-auto">
                            <Outlet context={args} />
                        </div>
                    }
                >
                    <Route index element={<OverviewPage />} />
                    <Route
                        path=":section/:panelId"
                        element={<WorkspacePage />}
                    />
                </Route>
            </Routes>
        </MemoryRouter>
    ),
} satisfies Meta<AppOutletContext>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { panels: [] } };
