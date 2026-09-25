import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { test } from "vitest";

import { createConfigDocument } from "./document";
import { configPath } from "./files";
test("config editing preserves stored omissions, rejects stale revisions and reports corrupt files", async (t) => {
    const home = await mkdtemp(join(tmpdir(), "aiox-config-document-"));
    t.onTestFinished(() => rm(home, { recursive: true, force: true }));
    const document = createConfigDocument({ home }, () => ({
        daemon: 4500,
        web: 4501,
    }));
    const initial = await document.read();
    assert.deepEqual(initial.stored, {});
    const concurrent = await Promise.allSettled([
        document.write({ revision: initial.revision, stored: {} }),
        document.write({
            revision: initial.revision,
            stored: { ports: { web: 5002 } },
        }),
    ]);
    assert.equal(
        concurrent.filter((result) => result.status === "fulfilled").length,
        1,
    );
    assert.equal(
        concurrent.filter((result) => result.status === "rejected").length,
        1,
    );
    const current = await document.read();
    const changed = await document.write({
        revision: current.revision,
        stored: { ports: { web: 5001 } },
    });
    assert.equal(changed.restartRequired, true);
    assert.equal(changed.effective.ports.web, 5001);
    assert.equal(changed.runningPorts.web, 4501);
    assert.deepEqual(JSON.parse(await readFile(configPath(home), "utf8")), {
        ports: { web: 5001 },
    });
    await assert.rejects(
        document.write({ revision: initial.revision, stored: {} }),
        /config_conflict/,
    );
    await writeFile(configPath(home), "{bad");
    await assert.rejects(document.read(), /JSON/);
});
