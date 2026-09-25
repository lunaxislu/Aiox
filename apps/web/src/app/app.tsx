import { RouterProvider } from "react-router";

import { ThemeProvider } from "@/features/theme/theme-provider";

import { ApplicationProvider } from "./application-provider";
import { router } from "./router";

export default function App() {
    return (
        <ThemeProvider>
            <ApplicationProvider>
                <RouterProvider router={router} />
            </ApplicationProvider>
        </ThemeProvider>
    );
}
