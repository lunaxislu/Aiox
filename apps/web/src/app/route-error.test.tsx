import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { afterEach, expect, it, vi } from "vitest";

import { router } from "./router";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it.each(["render", "loader"])(
    "offers page recovery when a route fails during %s",
    async (failure) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const reload = vi
            .spyOn(window.location, "reload")
            .mockImplementation(() => {});
        const crash = () => {
            throw new Error("private diagnostic");
        };
        const BrokenPage = () => crash();
        const testRouter = createMemoryRouter([
            {
                ...router.routes[0],
                index: false,
                path: "/",
                element: <Outlet />,
                children: [
                    {
                        index: true,
                        element:
                            failure === "render" ? (
                                <BrokenPage />
                            ) : (
                                <div>Page</div>
                            ),
                        loader: failure === "loader" ? crash : () => null,
                    },
                ],
            },
        ]);
        try {
            render(<RouterProvider router={testRouter} />);
            expect(
                await screen.findByRole("heading", {
                    name: "Something went wrong",
                }),
            ).toBeTruthy();
            expect(screen.queryByText("private diagnostic")).toBeNull();
            expect(
                screen
                    .getByRole("link", { name: "Back to overview" })
                    .getAttribute("href"),
            ).toBe("/");
            fireEvent.click(
                screen.getByRole("button", { name: "Reload page" }),
            );
            expect(reload).toHaveBeenCalledOnce();
        } finally {
            testRouter.dispose();
        }
    },
);
