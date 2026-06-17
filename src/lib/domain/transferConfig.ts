/** v6 §6.2 — admin-tunable thresholds; single object, no schema changes to recalibrate. */
export const TRANSFER_RISK_CONFIG = {
  nearOriginKm: 15,
  departureWindowHours: 2,
  repeatedTransferWindowDays: 30,
  repeatedTransferCountThreshold: 2,
} as const;

export type TransferRiskFlagName =
  | "original_near_origin_target_isnt"
  | "target_not_near_corridor"
  | "transfer_close_to_departure"
  | "repeated_transfers_by_conductor"
  | "target_weak_location_signal";
