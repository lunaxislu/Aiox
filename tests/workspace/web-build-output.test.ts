import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Web-first production bundle", () => {
  it("keeps the SPA assets and independently importable public entry", async () => {
    const html = await readFile("apps/web/dist/index.html", "utf8");
    const script = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
    const stylesheet = html.match(/href="(\/assets\/[^"]+\.css)"/)?.[1];

    expect(script).toBeDefined();
    expect(stylesheet).toBeDefined();
    await expect(
      access(path.join("apps/web/dist", script!.slice(1))),
    ).resolves.toBeUndefined();
    await expect(
      access(path.join("apps/web/dist", stylesheet!.slice(1))),
    ).resolves.toBeUndefined();
    await expect(access("apps/web/dist/index.js")).resolves.toBeUndefined();
    await expect(access("apps/web/dist/index.d.ts")).resolves.toBeUndefined();
    expect(html).not.toMatch(/session=|session\.token|endpoint\.json/);
  });
});
