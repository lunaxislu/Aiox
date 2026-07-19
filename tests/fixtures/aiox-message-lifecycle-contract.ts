export const typedSendAcceptedFixture = {
  input: {
    type: "instruction",
    intent: "delegation",
    replyExpected: true,
    content: { text: "Review the authentication boundary." },
  },
  result: {
    status: "accepted",
    messageId: "message_example",
    deliveries: [
      {
        deliveryId: "delivery_example",
        target: { address: "agent://local/release/codex-review" },
      },
    ],
  },
} as const;

const typedReplyInput = {
  inReplyToDeliveryId: "delivery_example",
  intent: "result",
  replyExpected: false,
  content: { text: "The boundary is the API ingress." },
} as const;

export const typedReplyErrorFixtures = [
  "reply_not_expected",
  "correlation_mismatch",
  "duplicate_reply",
  "unknown_delivery",
].map((code) => ({
  input: typedReplyInput,
  result: {
    status: "rejected" as const,
    error: { code, message: `fixture ${code}` },
  },
}));

export const typedInvalidInputFixtures = [
  {
    kind: "send",
    input: {
      type: "question",
      intent: "status",
      replyExpected: true,
      content: { text: "Reserved intent" },
    },
  },
  {
    kind: "send",
    input: {
      type: "question",
      intent: "unknown",
      replyExpected: true,
      content: { text: "Unknown intent" },
    },
  },
  {
    kind: "reply",
    input: {
      ...typedReplyInput,
      type: "reply",
    },
  },
] as const;
