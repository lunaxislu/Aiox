import { createBrowserRouter } from "react-router";

import { NotFoundPage } from "@/pages/not-found/not-found-page";
import { OverviewPage } from "@/pages/overview/overview-page";
import { SectionOverviewPage } from "@/pages/section/section-overview-page";
import { WorkspacePage } from "@/pages/workspace/workspace-page";

import { AppShell } from "./app-shell";
import { RouteError } from "./route-error";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <AppShell />,
        errorElement: <RouteError />,
        children: [
            { index: true, element: <OverviewPage /> },
            {
                path: ":section",
                element: <SectionOverviewPage />,
            },
            {
                path: ":section/:panelId",
                element: <WorkspacePage />,
            },
            {
                path: "settings",
                element: (
                    <div className="p-6">
                        <h1 className="text-lg font-semibold">Settings</h1>
                    </div>
                ),
            },
            {
                path: "*",
                element: <NotFoundPage />,
            },
        ],
    },
]);
