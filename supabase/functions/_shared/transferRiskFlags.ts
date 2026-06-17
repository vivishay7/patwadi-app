import { haversineKm } from "./haversine.ts";
import { TRANSFER_RISK_CONFIG, TransferRiskFlagName } from "./transferConfig.ts";

type CorridorOrigin = { city: string; lat: number; lng: number };
type Loc = { lat: number; lng: number } | null;

export function evaluateTransferRiskFlags(input: {
  corridorOrigin: CorridorOrigin;
  scheduledDepartureAt: string;
  fromLocation: Loc;
  toLocation: Loc;
  toLocationReadFailed: boolean;
  priorTransferCount30d: number;
  notPhysicallyTraveling?: boolean;
  now?: Date;
}) {
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

  if (input.notPhysicallyTraveling === true) {
    reasons.push("not_physically_traveling");
  }

  return {
    risk_reasons: reasons,
    admin_review_required: reasons.length > 0,
    not_physically_traveling: input.notPhysicallyTraveling ?? false,
  };
}
