import type { Meta, StoryObj } from "@storybook/react-vite";

import { ConnectionLost } from "./connection-lost";

const meta = {
    title: "App/ConnectionLost",
    component: ConnectionLost,
    parameters: { layout: "fullscreen" },
    decorators: [
        (Story) => (
            <div className="relative h-screen">
                <Story />
            </div>
        ),
    ],
    args: { stopped: false },
} satisfies Meta<typeof ConnectionLost>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Reconnecting: Story = {};
export const Stopped: Story = { args: { stopped: true } };
