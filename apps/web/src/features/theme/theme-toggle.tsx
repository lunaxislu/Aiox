import { SunMoonIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    function toggleTheme() {
        const dark =
            theme === "system"
                ? window.matchMedia("(prefers-color-scheme: dark)").matches
                : theme === "dark";
        setTheme(dark ? "light" : "dark");
    }
    return (
        <Button size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
            <SunMoonIcon aria-hidden="true" />
        </Button>
    );
}
