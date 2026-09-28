import { randomUUID } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import {
    MAX_TERMINAL_IMAGE_BYTES,
    type TerminalImageRequest,
} from "@aiox/protocol";

import { HttpError } from "./http-error";
import type { DaemonServices } from "./services";

export async function saveTerminalImage(
    services: DaemonServices,
    terminalId: string,
    input: TerminalImageRequest,
): Promise<string> {
    const terminal = services.terminals.get(terminalId);
    const checkActive = () => {
        if (!services.lifecycle.acceptingInput())
            throw new HttpError(
                409,
                "daemon_stopping",
                "The daemon is stopping.",
            );
        if (!terminal?.alive || services.terminals.get(terminalId) !== terminal)
            throw new HttpError(404, "unknown_terminal", "No active terminal.");
    };
    checkActive();
    if (input.data.length > 4 * Math.ceil(MAX_TERMINAL_IMAGE_BYTES / 3))
        throw new HttpError(413, "image_too_large", "Image exceeds 10 MiB.");
    // Round-trip validation rejects whitespace, invalid padding and noncanonical base64.
    const bytes = Buffer.from(input.data, "base64");
    if (bytes.length === 0 || bytes.toString("base64") !== input.data)
        throw new HttpError(400, "invalid_image", "Invalid image base64.");
    if (bytes.length > MAX_TERMINAL_IMAGE_BYTES)
        throw new HttpError(413, "image_too_large", "Image exceeds 10 MiB.");
    const extension =
        input.mediaType === "image/png" &&
        bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
            ? "png"
            : input.mediaType === "image/jpeg" &&
                bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))
              ? "jpg"
              : input.mediaType === "image/gif" &&
                  ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))
                ? "gif"
                : input.mediaType === "image/webp" &&
                    bytes.toString("ascii", 0, 4) === "RIFF" &&
                    bytes.toString("ascii", 8, 12) === "WEBP"
                  ? "webp"
                  : undefined;
    if (!extension)
        throw new HttpError(
            400,
            "invalid_image",
            "Image signature does not match its media type.",
        );
    // Keep attachments across terminal exits: resumed conversations can still refer to them.
    const directory = join(
        services.configLocation.home ?? homedir(),
        ".aiox",
        "attachments",
    );
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    const path = join(directory, `${randomUUID()}.${extension}`);
    try {
        await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
        checkActive();
        return path;
    } catch (error) {
        await rm(path, { force: true });
        throw error;
    }
}
