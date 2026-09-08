import type { IncomingMessage } from "node:http";

export function requestGuard(
    request: Pick<IncomingMessage, "headers" | "method">,
    listenerPort: number,
    webPort: number,
    boundHost = "127.0.0.1",
): { status: 403 | 415; message: string } | undefined {
    const hosts = ["localhost", "127.0.0.1", "[::1]"];
    if (!["0.0.0.0", "::"].includes(boundHost))
        hosts.push(
            boundHost.includes(":") && !boundHost.startsWith("[")
                ? `[${boundHost}]`
                : boundHost,
        );
    const authority = (host: string, port: number): string =>
        port === 80 ? host : `${host}:${port}`;
    if (
        !hosts.some(
            (host) =>
                request.headers.host === authority(host, listenerPort) ||
                request.headers.host === `${host}:${listenerPort}`,
        )
    )
        return { status: 403, message: "Untrusted request host." };
    const origin = request.headers.origin;
    if (
        origin !== undefined &&
        !hosts.some((host) => origin === `http://${authority(host, webPort)}`)
    )
        return { status: 403, message: "Untrusted request origin." };
    if (
        origin === undefined &&
        request.headers["sec-fetch-site"] === "cross-site"
    )
        return { status: 403, message: "Cross-site browser request." };
    const hasBody =
        request.headers["transfer-encoding"] !== undefined ||
        Number(request.headers["content-length"] ?? 0) > 0;
    const mediaType = request.headers["content-type"]
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase();
    if (hasBody && mediaType !== "application/json")
        return {
            status: 415,
            message: "Request body must use application/json.",
        };
    return undefined;
}
