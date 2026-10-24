import { expect, test } from "vitest";

import { hasShellOutputLine } from "./shell-output.testing";

test.each([
    "printf 'SHELL_RETURNED\\n'\r\nSHELL_RETURNED\r\nbash-3.2$ ",
    "printf 'SHELL_RETURNED\\n'\r\n\x1b[?2004l\rSHELL_RETURNED\r\n\x1b[?2004hbash-5.2$ ",
    "VENDOR_READY\r\r\n\x1b[?2004hbash-5.2$ printf 'SHELL_RETURNED\\n'\r\n\x1b[?2004l\rSHELL_RETURNED\r\n",
    "printf 'SHELL_RETURNED\\n'\nSHELL_RETURNED\nbash$ ",
])(
    "accepts a complete output line across PTY newline and readline controls: %j",
    (output) => {
        expect(hasShellOutputLine(output, "SHELL_RETURNED")).toBe(true);
    },
);

test.each([
    "bash$ echo SHELL_RETURNED\r\n\x1b[?2004l\r",
    "bash$ printf 'SHELL_RETURNED\\n'\r\n",
    "\r\nSHELL_RETURNED",
    "\r\nSHELL_RETURNED\r",
    "\r\nNOT_SHELL_RETURNED\r\n",
    "\r\nSHELL_RETURNED_extra\r\n",
    "\r\nbash$ SHELL_RETURNED\r\n",
])("rejects echo-only, incomplete and nonmatching lines: %j", (output) => {
    expect(hasShellOutputLine(output, "SHELL_RETURNED")).toBe(false);
});
