import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { fn } from "storybook/test";

import type { AppOutletContext } from "@/app/app-shell";
import { previewPanels } from "@/entities/panel/fixtures";
import { OverviewPage } from "@/pages/overview/overview-page";
import { WorkspacePage } from "@/pages/workspace/workspace-page";

import { SectionOverviewPage } from "./section-overview-page";

type Args = AppOutletContext & { section: string };
const meta = {
    title: "Pages/SectionOverview",
    component: SectionOverviewPage,
    parameters: { layout: "fullscreen" },
    args: { section: "workspaces", panels: previewPanels, onCreate: fn() },
    render: ({ section, ...context }) => (
        <MemoryRouter key={section} initialEntries={[`/${section}`]}>
            <Routes>
                <Route
                    element={
                        <div className="h-screen overflow-auto">
                            <Outlet context={context} />
                        </div>
                    }
                >
                    <Route index element={<OverviewPage />} />
                    <Route path=":section" element={<SectionOverviewPage />} />
                    <Route
                        path=":section/:panelId"
                        element={<WorkspacePage />}
                    />
                </Route>
            </Routes>
        </MemoryRouter>
    ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Workspaces: Story = {};
export const Networks: Story = { args: { section: "networks" } };
export const Hosts: Story = {
    args: {
        section: "hosts",
        panels: [
            {
                id: "development",
                kind: "host",
                workPath: "~/projects/app",
                section: "hosts",
                name: "development",
                terminalCount: 0,
                command: "aiox host run --path ./aiox.yaml",
                agents: [],
            },
        ],
    },
};
export const EmptyWorkspaces: Story = { args: { panels: [] } };
export const EmptyNetworks: Story = {
    args: { section: "networks", panels: [] },
};
export const EmptyHosts: Story = { args: { section: "hosts", panels: [] } };
export const InvalidSection: Story = { args: { section: "asdf" } };
