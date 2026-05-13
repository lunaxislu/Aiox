import assert from "node:assert/strict";
import test from "node:test";

import { parseRequestBody, wrapRelayPrompt } from "./protocol.js";

test("parseRequestBody accepts valid relay payloads", () => {
  assert.deepEqual(
    parseRequestBody({
      chat_id: "chat-123",
      direction: "reverse",
      origin: "claude",
      relay_depth: 1,
      text: "pong from claude",
    }),
    {
      chat_id: "chat-123",
      direction: "reverse",
      origin: "claude",
      relay_depth: 1,
      text: "pong from claude",
    },
  );
});

test("parseRequestBody rejects invalid relay depth", () => {
  assert.deepEqual(parseRequestBody({ chat_id: "c", text: "t", relay_depth: -1 }), {
    error: "relay_depth must be a non-negative integer when provided",
  });
});

test("wrapRelayPrompt embeds the relay marker, instructions, and source text", () => {
  const prompt = wrapRelayPrompt("pong from claude", "chat-123");

  assert.match(prompt, /^\[MCP RELAY — chat_id: chat-123\]/);
  assert.match(
    prompt,
    /reply_to_claude\(chat_id="chat-123", text="<your reply>"\)/,
  );
  assert.match(prompt, /The chat_id above is the ONLY valid chat_id/);
  assert.ok(prompt.endsWith("Message from Claude:\npong from claude"));
});
