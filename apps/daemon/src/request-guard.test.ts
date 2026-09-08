import { describe, expect, it } from "vitest";

import { requestGuard } from "@/request-guard";

describe("requestGuard", () => {
    it("uses the actual ports and handles default HTTP ports and IPv6 authorities", () => {
        for (const host of ["localhost", "localhost:80"]) {
            expect(
                requestGuard(
                    {
                        method: "GET",
                        headers: { host, origin: "http://localhost" },
                    },
                    80,
                    80,
                ),
            ).toBeUndefined();
        }
        expect(
            requestGuard(
                {
                    method: "GET",
                    headers: {
                        host: "[::1]:8123",
                        origin: "http://[::1]:8124",
                    },
                },
                8123,
                8124,
                "::1",
            ),
        ).toBeUndefined();
        expect(
            requestGuard(
                {
                    method: "GET",
                    headers: {
                        host: "127.0.0.1:8123",
                        origin: "http://localhost:8124",
                    },
                },
                8123,
                8124,
                "0.0.0.0",
            ),
        ).toBeUndefined();
        expect(
            requestGuard(
                { method: "GET", headers: { host: "0.0.0.0:8123" } },
                8123,
                8124,
                "0.0.0.0",
            ),
        ).toMatchObject({ status: 403 });
    });
    it("requires JSON for framed bodies but allows empty CLI stop and MCP reads", () => {
        for (const method of ["POST", "PUT", "PATCH", "DELETE", "GET"]) {
            for (const framing of [
                { "content-length": "2" },
                { "transfer-encoding": "chunked" },
            ]) {
                for (const contentType of [
                    undefined,
                    "text/plain",
                    "application/x-www-form-urlencoded",
                    "application/jsonp",
                ]) {
                    expect(
                        requestGuard(
                            {
                                method,
                                headers: {
                                    host: "localhost:4500",
                                    ...framing,
                                    "content-type": contentType,
                                },
                            },
                            4500,
                            4501,
                        ),
                    ).toMatchObject({ status: 415 });
                }
                for (const contentType of [
                    "application/json",
                    "application/json; charset=utf-8",
                    "Application/JSON",
                ]) {
                    expect(
                        requestGuard(
                            {
                                method,
                                headers: {
                                    host: "localhost:4500",
                                    ...framing,
                                    "content-type": contentType,
                                },
                            },
                            4500,
                            4501,
                        ),
                    ).toBeUndefined();
                }
            }
            expect(
                requestGuard(
                    {
                        method,
                        headers: {
                            host: "localhost:4500",
                            "content-length": "0",
                        },
                    },
                    4500,
                    4501,
                ),
            ).toBeUndefined();
        }
    });
    it("keeps CLI and same-origin requests while rejecting originless cross-site browser requests", () => {
        for (const site of [undefined, "none", "same-origin", "same-site"]) {
            expect(
                requestGuard(
                    {
                        method: "POST",
                        headers: {
                            host: "localhost:4500",
                            "sec-fetch-site": site,
                        },
                    },
                    4500,
                    4501,
                ),
            ).toBeUndefined();
        }
        expect(
            requestGuard(
                {
                    method: "GET",
                    headers: {
                        host: "localhost:4500",
                        "sec-fetch-site": "cross-site",
                    },
                },
                4500,
                4501,
            ),
        ).toMatchObject({ status: 403 });
    });
    it("accepts Web origins on either port and rejects null, malformed and other origins", () => {
        for (const port of [4500, 4501]) {
            for (const origin of [
                "http://localhost:4501",
                "http://127.0.0.1:4501",
                "http://[::1]:4501",
            ]) {
                expect(
                    requestGuard(
                        {
                            method: "GET",
                            headers: { host: `localhost:${port}`, origin },
                        },
                        port,
                        4501,
                    ),
                ).toBeUndefined();
            }
            for (const origin of [
                "null",
                "http://localhost:4500",
                "https://localhost:4501",
                "http://evil.example:4501",
                "http://user@localhost:4501",
                "http://localhost:4501/",
                "http://localhost:4501 http://evil.example",
                "not a URL",
            ]) {
                expect(
                    requestGuard(
                        {
                            method: "GET",
                            headers: { host: `localhost:${port}`, origin },
                        },
                        port,
                        4501,
                    ),
                ).toMatchObject({ status: 403 });
            }
        }
    });
    it("checks the receiving port and exact local authorities on both listeners", () => {
        for (const port of [4500, 4501]) {
            for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
                expect(
                    requestGuard(
                        { method: "GET", headers: { host: `${host}:${port}` } },
                        port,
                        4501,
                    ),
                ).toBeUndefined();
            }
            for (const host of [
                undefined,
                "evil.example:4500",
                `localhost.evil:${port}`,
                `localhost:${port + 1}`,
                `user@localhost:${port}`,
                `localhost:${port}/`,
                `127.1:${port}`,
                `localhost:${port},localhost:${port}`,
            ]) {
                expect(
                    requestGuard(
                        { method: "GET", headers: { host } },
                        port,
                        4501,
                    ),
                ).toMatchObject({ status: 403 });
            }
        }
    });
    it("rejects foreign-origin JSON disguised as a browser simple request", () => {
        expect(
            requestGuard(
                {
                    method: "POST",
                    headers: {
                        host: "127.0.0.1:4501",
                        origin: "http://evil.example",
                        "content-type": "text/plain",
                        "content-length": "14",
                    },
                },
                4501,
                4501,
            ),
        ).toMatchObject({ status: 403 });
    });
});
