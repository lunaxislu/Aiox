export const deliveryOutcomeTypes = [
  "delivery_unconfirmed",
  "delivery_target_rejected",
] as const;

export type DeliveryOutcomeType = (typeof deliveryOutcomeTypes)[number];
