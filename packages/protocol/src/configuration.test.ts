import { expect, test } from "vitest";

import { parseConfig } from "./configuration";

test.each([
    { keybindings: { windows: { openPalette: "Ctrl+K" } } },
    { terminal: { keybindings: { windows: { "Ctrl+k": "custom" } } } },
])("rejects Windows keybinding configuration: %j", (settings) => {
    expect(() => parseConfig(settings)).toThrow(/Unknown .*setting: windows/);
});

test("preserves supported macOS and Linux keybinding maps", () => {
    const settings = {
        keybindings: {
            mac: { openPalette: "Cmd+K" },
            linux: { openPalette: "Ctrl+K" },
        },
        terminal: {
            keybindings: {
                mac: { "Alt+ArrowLeft": null },
                linux: { "Ctrl+k": "custom" },
            },
        },
    };
    expect(parseConfig(settings)).toMatchObject(settings);
});
