import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

export async function assertStaticDirectoryReady(
  staticDirectory: string,
): Promise<void> {
  await readFile(path.join(staticDirectory, "index.html"));
}

export async function serveStaticFile(
  staticDirectory: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(
      new URL(request.url ?? "/", "http://127.0.0.1").pathname,
    );
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    response.writeHead(404);
    response.end();
    return;
  }

  const root = path.resolve(staticDirectory);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(404);
    response.end();
    return;
  }

  let body: Buffer;
  try {
    body = await readFile(filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    response.writeHead(code === "ENOENT" || code === "EISDIR" ? 404 : 500);
    response.end();
    return;
  }

  response.writeHead(200, {
    "Content-Type":
      contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
    "Content-Length": body.byteLength,
    "X-Content-Type-Options": "nosniff",
  });
  response.end(request.method === "HEAD" ? undefined : body);
}
