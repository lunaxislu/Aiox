export type PendingRequestEvent = "cancel" | "reject" | "resolve" | "timeout";

export class PendingRequest<T = string> {
  private readonly chatId: string;
  private readonly collection: Map<string, PendingRequest<T>>;
  private readonly onEvent?: (event: PendingRequestEvent, value?: unknown) => void;
  private rejectFn: ((error: Error) => void) | null = null;
  private resolveFn: ((value: T) => void) | null = null;
  private settled = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly promise: Promise<T>;

  constructor(
    collection: Map<string, PendingRequest<T>>,
    chatId: string,
    timeoutMs: number,
    onTimeout?: (error: Error) => void,
    onEvent?: (event: PendingRequestEvent, value?: unknown) => void,
  ) {
    this.collection = collection;
    this.chatId = chatId;
    this.onEvent = onEvent;

    this.promise = new Promise((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });

    this.timer = setTimeout(() => {
      if (this.settled) {
        return;
      }

      this.settled = true;
      this.timer = null;
      this.collection.delete(this.chatId);
      const timeoutError = new Error(
        `Timed out waiting after ${timeoutMs}ms (chat_id=${chatId})`,
      );
      this.onEvent?.("timeout", timeoutError);
      this.rejectFn?.(timeoutError);
      onTimeout?.(timeoutError);
    }, timeoutMs);
  }

  resolve(value: T): boolean {
    if (this.settled) {
      return false;
    }

    this.settled = true;
    this.clearTimer();
    this.collection.delete(this.chatId);
    this.onEvent?.("resolve", value);
    this.resolveFn?.(value);
    return true;
  }

  reject(error: Error): boolean {
    if (this.settled) {
      return false;
    }

    this.settled = true;
    this.clearTimer();
    this.collection.delete(this.chatId);
    this.onEvent?.("reject", error);
    this.rejectFn?.(error);
    return true;
  }

  cancel(): boolean {
    if (this.settled) {
      return false;
    }

    this.settled = true;
    this.clearTimer();
    this.collection.delete(this.chatId);
    this.onEvent?.("cancel");
    return true;
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
