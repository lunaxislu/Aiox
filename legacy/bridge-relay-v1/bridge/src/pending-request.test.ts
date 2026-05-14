import assert from "node:assert/strict";
import test from "node:test";

import { PendingRequest } from "./pending-request.js";

test("resolve removes the pending request from its collection", async () => {
  const collection = new Map<string, PendingRequest>();
  const pending = new PendingRequest(collection, "chat-1", 1_000);
  collection.set("chat-1", pending);

  assert.equal(pending.resolve("ok"), true);

  assert.equal(collection.has("chat-1"), false);
  assert.equal(await pending.promise, "ok");
});

test("cancel removes the pending request from its collection", () => {
  const collection = new Map<string, PendingRequest>();
  const pending = new PendingRequest(collection, "chat-1", 1_000);
  collection.set("chat-1", pending);

  assert.equal(pending.cancel(), true);

  assert.equal(collection.has("chat-1"), false);
});

test("timeout rejects and removes the pending request from its collection", async () => {
  const collection = new Map<string, PendingRequest>();
  const pending = new PendingRequest(collection, "chat-1", 5);
  collection.set("chat-1", pending);

  await assert.rejects(
    pending.promise,
    /Timed out waiting after 5ms \(chat_id=chat-1\)/,
  );
  assert.equal(collection.has("chat-1"), false);
});

test("double resolve is rejected after the request is settled", async () => {
  const collection = new Map<string, PendingRequest>();
  const pending = new PendingRequest(collection, "chat-1", 1_000);
  collection.set("chat-1", pending);

  assert.equal(pending.resolve("first"), true);
  assert.equal(pending.resolve("second"), false);

  assert.equal(await pending.promise, "first");
});
