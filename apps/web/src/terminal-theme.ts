import type { Terminal } from "@xterm/xterm";

type Color = { css: string; rgba: number };

/** xterm 6 has no public event for the effective (including OSC) background. */
export function followTerminalBackground(
    terminal: Terminal,
    configured: boolean,
    onBackground: (color: string) => void,
) {
    const theme = (
        terminal as unknown as {
            _core: {
                _themeService: {
                    colors: { background: Color };
                    onChangeColors(callback: () => void): { dispose(): void };
                    modifyColors(
                        callback: (colors: { background: Color }) => void,
                    ): void;
                };
            };
        }
    )._core._themeService;
    const preferred = theme.colors.background;
    const update = () => {
        if (configured && theme.colors.background.rgba !== preferred.rgba) {
            theme.modifyColors((colors) => {
                colors.background = preferred;
            });
            return;
        }
        onBackground(theme.colors.background.css);
    };
    const subscription = theme.onChangeColors(update);
    update();
    return subscription;
}
