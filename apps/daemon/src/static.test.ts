import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openDatabase } from "@aiox/persistence";
import { expect, it } from "vitest";

import { startDaemon } from "./daemon";
it("serves real static files, SPA fallback and missing-build errors on the Web listener only", async () => {
    const home = await mkdtemp(join(tmpdir(), "aiox-http-static-"));
    const root = join(home, "web");
    await mkdir(root);
    await mkdir(join(root, "empty"));
    await writeFile(join(root, "index.html"), "<h1>AIOX</h1>");
    await writeFile(join(root, "app.js"), "console.log('aiox')");
    const db = await openDatabase(join(home, "aiox.db"));
    const daemon = await startDaemon({
        home,
        db,
        ports: { daemon: 0, web: 0 },
        webRoot: root,
        retentionDays: () => 30,
    });
    const web = `http://127.0.0.1:${daemon.ports.web}`;
    try {
        for (const path of ["/", "/unknown/path"]) {
            const response = await fetch(web + path);
            expect(response.status).toBe(200);
            expect(response.headers.get("content-type")).toBe(
                "text/html; charset=utf-8",
            );
            expect(await response.text()).toBe("<h1>AIOX</h1>");
        }
        const script = await fetch(web + "/app.js");
        expect(script.headers.get("content-type")).toBe(
            "text/javascript; charset=utf-8",
        );
        expect(script.headers.get("content-length")).toBe("19");
        expect(await script.text()).toBe("console.log('aiox')");
        const empty = await fetch(web + "/empty/");
        expect(empty.status).toBe(404);
        expect(await empty.text()).toBe("Not found.");
        const api = await fetch(web + "/api/no-such-api");
        expect(api.status).toBe(404);
        expect(await api.json()).toMatchObject({ code: "not_found" });
        const other = await fetch(
            `http://127.0.0.1:${daemon.ports.daemon}/app.js`,
        );
        expect(other.status).toBe(404);
        expect(await other.json()).toEqual({
            code: "not_found",
            message: "Not found.",
        });
        await rm(join(root, "index.html"));
        const missing = await fetch(web + "/unknown");
        expect(missing.status).toBe(404);
        expect(await missing.text()).toBe("Not found.");
    } finally {
        await daemon.stop(true);
        await rm(home, { recursive: true, force: true });
    }
});
