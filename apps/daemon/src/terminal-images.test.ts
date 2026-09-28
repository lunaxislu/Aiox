import * as fs from "node:fs/promises";
import { join } from "node:path";

import {
    apiPath,
    MAX_TERMINAL_IMAGE_BYTES,
    terminalImageResponseSchema,
} from "@aiox/protocol";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { startTestDaemon, type DaemonHarness } from "./testing";

let h: DaemonHarness;
let id: string;
const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=",
    "base64",
);
beforeEach(async () => {
    h = await startTestDaemon();
    id = h.daemon.createTerminal({
        file: process.execPath,
        args: ["-e", "setInterval(()=>{},1000)"],
        cols: 80,
        rows: 24,
    }).id;
});
afterEach(async () => {
    vi.restoreAllMocks();
    await h.close();
});
const upload = (body: unknown, terminalId = id) =>
    fetch(h.webUrl(apiPath.terminalImage(terminalId)), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
it("stores pasted images privately and retains them after terminal termination", async () => {
    for (const [mediaType, bytes, extension] of [
        ["image/png", png, "png"],
        ["image/jpeg", Buffer.from("ffd8ffe000104a464946", "hex"), "jpg"],
        ["image/gif", Buffer.from("GIF89a"), "gif"],
        ["image/webp", Buffer.from("RIFF0000WEBP"), "webp"],
    ] as const) {
        const response = await upload({
            mediaType,
            data: bytes.toString("base64"),
        });
        expect(response.status).toBe(201);
        const { path } = terminalImageResponseSchema.parse(
            await response.json(),
        );
        expect(path).toMatch(new RegExp(`\\.${extension}$`));
        expect(
            path.startsWith(join(h.home, ".aiox", "attachments") + "/"),
        ).toBe(true);
        expect(await fs.readFile(path)).toEqual(bytes);
        expect((await fs.stat(path)).mode & 0o777).toBe(0o600);
        expect(
            (await fs.stat(join(h.home, ".aiox", "attachments"))).mode & 0o777,
        ).toBe(0o700);
    }
    await h.daemon.services.lifecycle.stopTerminal(id);
    expect(await fs.readdir(join(h.home, ".aiox", "attachments"))).toHaveLength(
        4,
    );
    expect(
        (await upload({ mediaType: "image/png", data: png.toString("base64") }))
            .status,
    ).toBe(404);
});
it("rejects invalid types, base64, mismatched signatures and unknown terminals", async () => {
    for (const body of [
        { mediaType: "text/html", data: png.toString("base64") },
        { mediaType: "image/png", data: "invalid!" },
        { mediaType: "image/png", data: png.toString("base64") + "\n" },
        { mediaType: "image/jpeg", data: png.toString("base64") },
    ])
        expect((await upload(body)).status).toBe(400);
    expect(
        (
            await upload(
                { mediaType: "image/png", data: png.toString("base64") },
                "missing",
            )
        ).status,
    ).toBe(404);
    await expect(
        fs.readdir(join(h.home, ".aiox", "attachments")),
    ).rejects.toMatchObject({ code: "ENOENT" });
});
it("accepts image bodies above the default JSON limit but bounds decoded and request sizes", async () => {
    const bytes = Buffer.alloc(1_100_000);
    png.copy(bytes);
    expect(
        (
            await upload({
                mediaType: "image/png",
                data: bytes.toString("base64"),
            })
        ).status,
    ).toBe(201);
    expect(
        (
            await upload({
                mediaType: "image/png",
                data: Buffer.alloc(MAX_TERMINAL_IMAGE_BYTES + 1).toString(
                    "base64",
                ),
            })
        ).status,
    ).toBe(413);
    expect(
        (
            await upload({
                mediaType: "image/png",
                data: "A".repeat(
                    4 * Math.ceil(MAX_TERMINAL_IMAGE_BYTES / 3) + 1024,
                ),
            })
        ).status,
    ).toBe(413);
});
it("removes a written image if shutdown starts while it is saving", async () => {
    vi.spyOn(h.daemon.services.lifecycle, "acceptingInput")
        .mockReturnValueOnce(true)
        .mockReturnValue(false);
    expect(
        (await upload({ mediaType: "image/png", data: png.toString("base64") }))
            .status,
    ).toBe(409);
    expect(await fs.readdir(join(h.home, ".aiox", "attachments"))).toEqual([]);
});
