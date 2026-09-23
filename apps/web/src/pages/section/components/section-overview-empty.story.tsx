import type { Meta, StoryObj } from "@storybook/react-vite";

import { SectionOverviewEmpty } from "./section-overview-empty";

const meta = {
    title: "Components/SectionOverviewEmpty",
    component: SectionOverviewEmpty,
    parameters: { layout: "fullscreen" },
    args: {},
    render: (args) => (
        <div className="flex h-screen items-center justify-center">
            <SectionOverviewEmpty {...args} />
        </div>
    ),
} satisfies Meta<typeof SectionOverviewEmpty>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Worspaces: Story = {
    args: {
        section: "workspaces",
        onCreate: () => {},
    },
};

export const Networks: Story = {
    args: {
        section: "networks",
        onCreate: () => {},
    },
};

export const Hosts: Story = {
    args: {
        section: "hosts",
        onCreate: () => {},
    },
};
