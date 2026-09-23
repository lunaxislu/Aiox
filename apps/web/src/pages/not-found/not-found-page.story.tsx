import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";

import { NotFoundPage } from "./not-found-page";

const meta = {
    title: "Pages/NotFound",
    component: NotFoundPage,
    parameters: {
        layout: "fullscreen",
    },
    decorators: [
        (Story) => (
            <MemoryRouter initialEntries={["/not-found"]}>
                <div style={{ height: "100vh" }}>
                    <Story />
                </div>
            </MemoryRouter>
        ),
    ],
} satisfies Meta<typeof NotFoundPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
