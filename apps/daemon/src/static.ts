import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { Readable } from "node:stream";

import type { Context } from "./http-endpoint";
type MiddlewareHandler = (
    c: Context,
    next: () => Promise<Response>,
) => Promise<Response>;

const types: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
};

/**
 * Serves the built operational Web from the daemon's web listener, so the page
 * and the API share one origin. Missing build output says so instead of 404ing
 * silently.
 */
export function createStaticHandler(
    root: string | undefined,
): MiddlewareHandler {
    return async (c, next) => {
        if (root === undefined) return next();
        const pathname = c.req.path;
        const requested = pathname === "/" ? "/index.html" : pathname;
        // Keep traversal inside the build output.
        const target = resolve(join(root, normalize(requested)));
        if (target !== resolve(root) && !target.startsWith(resolve(root) + sep))
            return next();
        let file = target;
        try {
            if ((await stat(file)).isDirectory())
                file = join(file, "index.html");
        } catch {
            // Unknown paths fall back to the single page entry.
            file = join(root, "index.html");
        }
        try {
            const info = await stat(file);
            return c.body(
                Readable.toWeb(
                    createReadStream(file),
                ) as ReadableStream<Uint8Array>,
                200,
                {
                    "content-type":
                        types[extname(file)] ?? "application/octet-stream",
                    "content-length": String(info.size),
                },
            );
        } catch {
            return next();
        }
    };
}
