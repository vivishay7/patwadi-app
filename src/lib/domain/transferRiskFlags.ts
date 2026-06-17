import { haversineKm } from "../geo/haversineKm";
import {
  TRANSFER_RISK_CONFIG,
  TransferRiskFlagName,
} from "./transferConfig";
import type { CorridorEndpoint } from "./corridors";

export type TransferLocationRead = {
  lat: number;
  lng: number;
} | null;

export type TransferRiskInput = {
  corridorOrigin: CorridorEndpoint;
  scheduledDepartureAt: string;
  fromLocation: TransferLocationRead;
  toLocation: TransferLocationRead;
  toLocationReadFailed: boolean;
  priorTransferCount30d: number;
  now?: Date;
};

export type TransferRiskResult = {
  risk_reasons: TransferRiskFlagName[];
  admin_review_required: boolean;
  not_physically_traveling: null;
};

/** v6 §6.2 — flags 1,2,3,5,6; flag 4 deferred (always null). */
export function evaluateTransferRiskFlags(
  input: TransferRiskInput
): TransferRiskResult {
  const now = input.now ?? new Date();
  const reasons: TransferRiskFlagName[] = [];
  const { nearOriginKm, departureWindowHours, repeatedTransferCountThreshold } =
    TRANSFER_RISK_CONFIG;

  const origin = input.corridorOrigin;
  const from = input.fromLocation;
  const to = input.toLocation;

  if (from && to) {
    const fromDist = haversineKm(from.lat, from.lng, origin.lat, origin.lng);
    const toDist = haversineKm(to.lat, to.lng, origin.lat, origin.lng);
    if (fromDist < nearOriginKm && toDist >= nearOriginKm) {
      reasons.push("original_near_origin_target_isnt");
    }
  }

  if (to) {
    const toDist = haversineKm(to.lat, to.lng, origin.lat, origin.lng);
    if (toDist >= nearOriginKm) {
      reasons.push("target_not_near_corridor");
    }
  } else if (input.toLocationReadFailed) {
    reasons.push("target_weak_location_signal");
  }

  const departure = new Date(input.scheduledDepartureAt);
  const departureWindowMs = departureWindowHours * 60 * 60 * 1000;
  if (now.getTime() >= departure.getTime() - departureWindowMs) {
    reasons.push("transfer_close_to_departure");
  }

  if (input.priorTransferCount30d > repeatedTransferCountThreshold) {
    reasons.push("repeated_transfers_by_conductor");
  }

  if (input.toLocationReadFailed && !reasons.includes("target_weak_location_signal")) {
    reasons.push("target_weak_location_signal");
  }

  return {
    risk_reasons: reasons,
    admin_review_required: reasons.length > 0,
    not_physically_traveling: null,
  };
}
