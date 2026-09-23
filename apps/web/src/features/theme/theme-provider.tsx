// Based on shadcn's Vite ThemeProvider. W3 keeps the selection in memory.
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

export type Theme = "dark" | "light" | "system";

const ThemeProviderContext = createContext<
    | {
          theme: Theme;
          setTheme: (theme: Theme) => void;
      }
    | undefined
>(undefined);

export function ThemeProvider({
    children,
    defaultTheme = "system",
}: {
    children: ReactNode;
    defaultTheme?: Theme;
}) {
    const [theme, setTheme] = useState<Theme>(defaultTheme);

    useEffect(() => {
        const root = document.documentElement;
        const previous = ["light", "dark"].filter((name) =>
            root.classList.contains(name),
        );
        const system = window.matchMedia("(prefers-color-scheme: dark)");
        const apply = () => {
            root.classList.remove("light", "dark");
            root.classList.add(
                theme === "system"
                    ? system.matches
                        ? "dark"
                        : "light"
                    : theme,
            );
        };
        apply();
        if (theme === "system") system.addEventListener("change", apply);
        return () => {
            system.removeEventListener("change", apply);
            root.classList.remove("light", "dark");
            root.classList.add(...previous);
        };
    }, [theme]);

    return (
        <ThemeProviderContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeProviderContext);
    if (!context)
        throw new Error("useTheme must be used within a ThemeProvider");
    return context;
}
