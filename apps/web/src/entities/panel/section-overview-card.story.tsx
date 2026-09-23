import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";

import { previewPanels } from "./fixtures";
import { SectionOverviewCard } from "./section-overview-card";

const meta = {
    title: "Entities/Panel/SectionOverviewCard",
    component: SectionOverviewCard,
    // 카드가 Link를 그리므로 router가 없으면 렌더가 던진다.
    decorators: [
        (Story) => (
            <MemoryRouter>
                <Story />
            </MemoryRouter>
        ),
    ],
    args: {
        panel: previewPanels[0]!,
    },
    parameters: {
        layout: "centered",
    },
} satisfies Meta<typeof SectionOverviewCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        panel: {
            id: "development",
            kind: "workspace",
            section: "workspaces",
            name: "development",
            terminalCount: 0,
            command: "aiox workspace run --path ./aiox.yaml",
            agents: [],
        },
    },
};
