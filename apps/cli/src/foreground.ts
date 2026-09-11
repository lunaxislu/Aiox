import type { EventEmitter } from "node:events";

import type { RawData, WebSocket } from "ws";

type Input = Pick<EventEmitter, "on" | "off"> & {
    resume(): unknown;
    pause(): unknown;
    isTTY?: boolean;
    isRaw?: boolean;
    setRawMode?(mode: boolean): unknown;
};
type Output = Pick<EventEmitter, "on" | "off"> & {
    write(data: Uint8Array): unknown;
    columns?: number;
    rows?: number;
};
type Exit = { exitCode: number; signal: number | null };

/** An open, authenticated foreground connection; browser attachments are separate. */
export function runForeground(
    socket: WebSocket,
    input: Input = process.stdin,
    output: Output = process.stdout,
): Promise<Exit> {
    return new Promise((resolve, reject) => {
        const wasRaw = input.isRaw ?? false;
        let finished = false;
        const finish = (result: Exit | Error) => {
            if (finished) return;
            finished = true;
            input.off("data", send);
            input.off("end", ended);
            input.off("error", failed);
            output.off("resize", resize);
            output.off("error", failed);
            socket.off("message", receive);
            try {
                input.pause();
            } catch (error) {
                result =
                    error instanceof Error ? error : new Error(String(error));
            }
            try {
                if (input.isTTY) input.setRawMode?.(wasRaw);
            } catch (error) {
                result =
                    error instanceof Error ? error : new Error(String(error));
            }
            try {
                socket.close();
            } catch (error) {
                result =
                    error instanceof Error ? error : new Error(String(error));
            }
            if (result instanceof Error) reject(result);
            else resolve(result);
        };
        const failed = (error: Error) => finish(error);
        const closed = () => {
            finish(
                new Error(
                    "Foreground connection closed without a confirmed vendor exit.",
                ),
            );
            socket.off("close", closed);
            socket.off("error", failed);
        };
        const ended = () =>
            finish(new Error("Foreground input ended before vendor exit."));
        const send = (data: Buffer | string) => {
            try {
                socket.send(data, { binary: true });
            } catch (error) {
                finish(
                    error instanceof Error ? error : new Error(String(error)),
                );
            }
        };
        const resize = () => {
            const { columns: cols, rows } = output;
            if (!cols || !rows) return;
            try {
                socket.send(JSON.stringify({ type: "resize", cols, rows }));
            } catch (error) {
                finish(
                    error instanceof Error ? error : new Error(String(error)),
                );
            }
        };
        const receive = (data: RawData, binary: boolean) => {
            const bytes = Array.isArray(data)
                ? Buffer.concat(data)
                : Buffer.isBuffer(data)
                  ? data
                  : Buffer.from(data);
            try {
                if (binary) {
                    output.write(bytes);
                    return;
                }
                const event: unknown = JSON.parse(bytes.toString("utf8"));
                if (
                    typeof event === "object" &&
                    event !== null &&
                    "type" in event &&
                    event.type === "error" &&
                    "message" in event &&
                    typeof event.message === "string"
                ) {
                    throw new Error(event.message);
                }
                if (
                    typeof event !== "object" ||
                    event === null ||
                    !("type" in event) ||
                    event.type !== "exit" ||
                    !("exitCode" in event) ||
                    !Number.isInteger(event.exitCode) ||
                    !("signal" in event) ||
                    !(event.signal === null || Number.isInteger(event.signal))
                ) {
                    throw new Error("Invalid foreground exit frame.");
                }
                finish({
                    exitCode: event.exitCode as number,
                    signal: event.signal as number | null,
                });
            } catch (error) {
                finish(
                    error instanceof Error ? error : new Error(String(error)),
                );
            }
        };
        if (socket.readyState !== socket.OPEN) {
            reject(new Error("Foreground connection is not open."));
            return;
        }
        socket.on("message", receive);
        socket.on("close", closed);
        socket.on("error", failed);
        input.on("data", send);
        input.on("end", ended);
        input.on("error", failed);
        output.on("resize", resize);
        output.on("error", failed);
        try {
            if (input.isTTY) input.setRawMode?.(true);
            resize();
            if (!finished) input.resume();
        } catch (error) {
            finish(error instanceof Error ? error : new Error(String(error)));
        }
    });
}
